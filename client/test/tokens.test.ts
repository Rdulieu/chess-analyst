import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { compileStylesheet, darkThemeBlock, declaredTokens } from "./support/tokenAudit";

/**
 * The token set is frozen in ADR-0013. This test is the only place that pins it:
 * it asserts the names exist and that the theme families behave as the ADR says
 * (roles and tints redefined in dark, player/board colours identical), never a
 * particular hue — the hues are judged on the pilot, not here.
 */
const THEME_ROLES = [
  "--ground",
  "--ground-sunk",
  "--ink",
  "--ink-muted",
  "--border",
  "--accent",
  "--accent-ink",
];

const TINTS = ["review", "ok", "fail", "inaccuracy", "mistake", "blunder"].flatMap((t) => [
  `--tint-${t}`,
  `--tint-${t}-ink`,
]);

const CONSTANT_FAMILY = [
  "--white-share",
  "--black-share",
  "--square-light",
  "--square-dark",
  "--square-inaccuracy",
  "--square-mistake",
  "--square-blunder",
];

const SCALES = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-5",
  "--text-s",
  "--text-m",
  "--text-l",
  "--text-xl",
  "--radius",
  "--radius-pill",
  "--measure",
  "--measure-wide",
  "--font",
  "--mono",
];

describe("the stylesheet's wiring", () => {
  it("is imported once, from the entry point", () => {
    const entry = readFileSync(resolve(import.meta.dirname, "../src/main.tsx"), "utf8");
    const imports = entry.match(/import\s+["'][^"']*styles\/main\.scss["']/g) ?? [];
    expect(imports).toHaveLength(1);
  });
});

describe("the token set (ADR-0013)", () => {
  const css = compileStylesheet();
  const { light, dark } = declaredTokens(css);

  it.each([...THEME_ROLES, ...TINTS, ...CONSTANT_FAMILY, ...SCALES])(
    "declares %s in the light theme",
    (token) => {
      expect(light.has(token)).toBe(true);
    },
  );

  it.each([...THEME_ROLES, ...TINTS])("redefines %s in the dark theme", (token) => {
    expect(dark.get(token)).toBeDefined();
    expect(dark.get(token)).not.toBe(light.get(token));
  });

  it.each(CONSTANT_FAMILY)("never lets the theme touch %s", (token) => {
    expect(dark.has(token)).toBe(false);
  });

  it("expresses the dark theme as a redefinition of tokens, not of rules", () => {
    // Everything the dark block contains is a custom property: no selector, no
    // duplicated rule. That is what keeps a [data-theme] toggle graftable.
    const declarations = darkThemeBlock(css).match(/^\s*[a-z-]+\s*:/gim) ?? [];
    expect(declarations.every((d) => d.trim().startsWith("--"))).toBe(true);
  });
});
