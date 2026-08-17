import { readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve, extname } from "node:path";
import { compile } from "sass";

/** The client's single stylesheet entry point. */
export const STYLESHEET = resolve(import.meta.dirname, "../../src/styles/main.scss");

/** The client's source tree, where tokens are consumed from TypeScript. */
export const SOURCE_ROOT = resolve(import.meta.dirname, "../../src");

/**
 * Compiles the stylesheet the way the build does. Working on the compiled CSS
 * rather than on the SCSS text is what makes the audit honest: a token emitted
 * by a loop or a mixin counts as declared, and a syntax error fails here.
 */
export function compileStylesheet(path: string = STYLESHEET): string {
  return compile(path).css;
}

/**
 * Splits the declared custom properties into the two themes. `light` is what a
 * default-preference browser resolves; `dark` is only what the
 * `prefers-color-scheme: dark` block *redefines* — a token absent from `dark`
 * is not undeclared at night, it is deliberately theme-independent (the
 * player/board family of ADR-0013).
 */
export function declaredTokens(css: string): {
  light: Map<string, string>;
  dark: Map<string, string>;
} {
  const darkPart = darkThemeBlock(css);
  return {
    light: customProperties(css.replace(darkPart, "")),
    dark: customProperties(darkPart),
  };
}

/**
 * The `prefers-color-scheme: dark` block, brace-matched rather than sliced to
 * the end of the file: the token partial is not the last thing in the sheet, and
 * everything after the block belongs to the light theme too.
 */
export function darkThemeBlock(css: string): string {
  const at = css.indexOf("prefers-color-scheme: dark");
  if (at === -1) return "";
  const open = css.indexOf("{", at);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open, i + 1);
  }
  throw new Error("unterminated dark-theme block");
}

function customProperties(css: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const [, name, value] of css.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)) {
    found.set(name, value.trim());
  }
  return found;
}

/** Every `var(--…)` read in a body of source. */
export function consumedTokens(sources: string[]): Set<string> {
  const found = new Set<string>();
  for (const source of sources) {
    for (const [, name] of source.matchAll(/var\(\s*(--[\w-]+)/g)) found.add(name);
  }
  return found;
}

/**
 * The audit ADR-0013 asks for as the mitigation for the compile error custom
 * properties cost us: every token consumed anywhere must resolve in *both*
 * themes. Returns the offending names, so the failure message says which.
 */
export function undeclaredTokens(
  consumed: Set<string>,
  declared: { light: Map<string, string>; dark: Map<string, string> },
): string[] {
  return [...consumed]
    .filter((t) => !declared.light.has(t) && !declared.dark.has(t))
    .sort();
}

/**
 * The client's TypeScript, each source paired with its path relative to the
 * source root — so a failure names the file that still holds a colour rather
 * than only reporting that one does.
 */
export function componentSources(
  root: string = SOURCE_ROOT,
): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
        out.push({ path: relative(root, path), source: readFileSync(path, "utf8") });
      }
    }
  };
  walk(root);
  return out;
}

/**
 * Strips comments, because a colour *discussed* in a docstring is not a colour
 * the app paints — and the reasons these tokens exist are written down in exactly
 * those docstrings, hexes and all.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Reads every file the client ships or styles, so nothing escapes the audit. */
export function clientSources(root: string = SOURCE_ROOT): string[] {
  const wanted = new Set([".ts", ".tsx", ".scss", ".css"]);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (wanted.has(extname(entry.name))) out.push(readFileSync(path, "utf8"));
    }
  };
  walk(root);
  return out;
}

/**
 * The declarations the compiled stylesheet attaches to a given selector, merged
 * across every rule that lists it. Compiled CSS is what the browser gets, so a
 * declaration written in a nested block or emitted by a mixin counts here — the
 * test asks what the sheet *says* about an element, not how the SCSS said it.
 *
 * Only top-level rules are read: the media block holds token redefinitions and
 * nothing else (`tokens.test.ts` pins that), so nothing is lost.
 */
export function declarationsFor(css: string, selector: string): Map<string, string> {
  const found = new Map<string, string>();
  // Sass drops the quotes from `[aria-label="games"]` on the way out, so both
  // sides are compared unquoted rather than making every test spell the
  // compiler's output instead of the selector it means.
  const unquoted = (s: string) => s.replace(/["']/g, "");
  for (const { selectors, body } of topLevelRules(css)) {
    if (!selectors.map(unquoted).includes(unquoted(selector))) continue;
    for (const [, prop, value] of body.matchAll(/([a-z-]+)\s*:\s*([^;}]+)/g)) {
      found.set(prop.trim(), value.trim());
    }
  }
  return found;
}

/** Every top-level rule of a compiled sheet, as its selector list and its body. */
export function topLevelRules(css: string): { selectors: string[]; body: string }[] {
  const rules: { selectors: string[]; body: string }[] = [];
  let depth = 0;
  let start = 0;
  let open = -1;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      if (depth === 0) open = i;
      depth++;
    } else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        const head = css.slice(start, open).trim();
        if (!head.startsWith("@")) {
          rules.push({
            selectors: head.split(",").map((s) => s.replace(/\s+/g, " ").trim()),
            body: css.slice(open + 1, i),
          });
        }
        start = i + 1;
      }
    }
  }
  return rules;
}
