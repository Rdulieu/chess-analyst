import { describe, it, expect } from "vitest";
import {
  clientSources,
  compileStylesheet,
  componentSources,
  consumedTokens,
  declarationsFor,
  declaredTokens,
  stripComments,
  undeclaredTokens,
} from "./support/tokenAudit";

/**
 * The mitigation ADR-0013 names for the compile error custom properties cost us:
 * a mistyped `var(--tnit-blunder)` falls back silently in the browser, so it has
 * to fail here instead. Repo-level on purpose — it audits the whole client tree,
 * stylesheet and TypeScript alike, since tokens are consumed from both.
 */
describe("the token-consistency audit", () => {
  it("names a token that no theme declares", () => {
    const declared = declaredTokens(":root{--ground:#fff}@media (prefers-color-scheme: dark){:root{--ground:#000}}");
    const consumed = consumedTokens(["a{color:var(--ground)}b{color:var( --tnit-blunder )}"]);
    expect(undeclaredTokens(consumed, declared)).toEqual(["--tnit-blunder"]);
  });

  it("accepts a token declared only outside the dark block", () => {
    // The player/board family is deliberately theme-independent: declared once,
    // resolving in both themes. The audit must not read that as a hole.
    const declared = declaredTokens(":root{--white-share:#ececec}@media (prefers-color-scheme: dark){:root{}}");
    expect(undeclaredTokens(consumedTokens(["i{background:var(--white-share)}"]), declared)).toEqual([]);
  });

  it("sees tokens consumed from TypeScript, not only from a selector", () => {
    expect([...consumedTokens(['const TINT = { blunder: "var(--tint-blunder)" };'])]).toEqual([
      "--tint-blunder",
    ]);
  });

  it("finds no colour left hard-coded in a component", () => {
    // The other half of the same guarantee: the audit above proves the tokens
    // that ARE consumed resolve, this proves none was left behind as a hex.
    // Only ONE component may still hold a colour, and only for the case the ADR
    // exempts: the arrows, one `hsla` per data point (hue is the win rate, alpha
    // the frequency), which no token can express. The curve's equality line and
    // cursor used to be exempt too and are tokens since US-13, so the exemption
    // shrank rather than being carried along.
    const EXEMPT = /^chess\/arrows\.ts$/;
    const offenders = componentSources()
      .filter(({ path }) => !EXEMPT.test(path))
      .filter(({ source }) => /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(/.test(stripComments(source)))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("finds no undeclared token anywhere in the client", () => {
    const declared = declaredTokens(compileStylesheet());
    expect(undeclaredTokens(consumedTokens(clientSources()), declared)).toEqual([]);
  });
});

/**
 * The banner is chrome, and the stylesheet has to say so — US-13's page skeleton
 * is what tells the app's frame from its content, and a banner that read as
 * content would be one more paragraph the eye skips.
 */
describe("the current-Profile banner is styled as chrome", () => {
  const css = compileStylesheet();

  it("takes its ground, its ink and its rule from the chrome's own tokens", () => {
    const declarations = declarationsFor(css, '[data-banner="profile"]');

    expect(declarations.size).toBeGreaterThan(0);
    // Every colour it paints is a token, resolving in both themes — the audit
    // above covers the resolution, this covers that it paints at all.
    for (const property of ["background", "color"]) {
      expect(declarations.get(property)).toMatch(/var\(--/);
    }
  });
});

describe("a failed load is painted like the failure it is", () => {
  const css = compileStylesheet();

  it("pairs the failure tint with its own ink, so it stays legible in both themes", () => {
    const declarations = declarationsFor(css, '[data-state="failed"]');

    expect(declarations.get("background")).toBe("var(--tint-fail)");
    expect(declarations.get("color")).toBe("var(--tint-fail-ink)");
  });
});
