import { describe, it, expect } from "vitest";
import {
  clientSources,
  compileStylesheet,
  componentSources,
  consumedTokens,
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
    // Only the components may hold a colour, and only for the two cases the ADR
    // exempts — the arrows, one hsla per data point, and the curve's equality
    // line and cursor, drawn over the two constant player grounds.
    const EXEMPT = /^(chess\/arrows|components\/EvaluationGraph)\.tsx?$/;
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
