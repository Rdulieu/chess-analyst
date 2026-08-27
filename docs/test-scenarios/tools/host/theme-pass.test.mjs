import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseScreenInventory, auditScript, plannedAudits } from "./theme-pass.mjs";

/*
 * The inventory is read from `theme-pass.md` rather than copied into this file.
 * That document is the one place the screens are edited, and a second copy is
 * exactly how the suite once spent a whole run auditing eight screens while the
 * navigation had grown to nine.
 */
const THEME_PASS_MD = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "theme-pass.md");

describe("the inventory of screens", () => {
  const screens = parseScreenInventory(readFileSync(THEME_PASS_MD, "utf8"));

  it("is read from theme-pass.md, and finds the nine screens it declares", () => {
    expect(screens).toHaveLength(9);
    expect(screens.map((s) => s.route)).toEqual([
      "/",
      "/explorer",
      "/openings",
      "/danger",
      "/stats",
      "/confrontation",
      "/analyse/:gameId",
      "/profiles",
      "/profiles/:id",
    ]);
  });

  it("names each screen as the document names it, for a report a human reads", () => {
    expect(screens[0].name).toBe("Mes parties");
    expect(screens[5].name).toBe("Mes lectures");
  });

  it("marks the two screens the navigation cannot reach on its own", () => {
    const outOfNav = screens.filter((s) => !s.inNav);
    expect(outOfNav.map((s) => s.route)).toEqual(["/analyse/:gameId", "/profiles/:id"]);
  });
});

describe("the size of a pass", () => {
  it("is eighteen audits — nine screens in two themes", () => {
    const screens = parseScreenInventory(readFileSync(THEME_PASS_MD, "utf8"));
    expect(plannedAudits(screens)).toBe(18);
  });
});

describe("the script that is actually evaluated on the page", () => {
  const script = auditScript({ port: "5199", theme: "dark", source: "function themeAudit(){return {}}" });

  it("carries a location.port guard — load-bearing, not belt and braces", () => {
    // A shared browser had its selected page stolen ~20 times in one parallel run.
    // The guard is what kept every action off the siblings' apps.
    expect(script).toContain("location.port");
    expect(script).toContain("5199");
  });

  it("asserts the theme it was asked for, inside the audited script", () => {
    // Colour-scheme emulation has failed in BOTH directions across four runs. This
    // assertion is the only thing that ever caught it; the helper must throw rather
    // than hand back a plausible reading of a theme that never rendered.
    expect(script).toContain("prefers-color-scheme: dark");
    expect(script).toMatch(/throw/);
  });

  it("refuses to be built for a theme that is not one of the two", () => {
    expect(() => auditScript({ port: "5199", theme: "sepia", source: "" })).toThrow(/sepia/);
  });
});

describe("reading the inventory out of a document written for humans", () => {
  /*
   * The document is prose with a table in it, and prose grows. Scanning the whole
   * file for rows whose first cell is a number means any future table with a numbered
   * first column silently joins the inventory — and an inventory that silently grows
   * or shrinks is the one thing this parse must never do.
   */
  const withASecondTable = `
## The nine screens

| # | Screen | Reached by |
| --- | --- | --- |
| 1 | Mes parties (\`/\`) | navigation |
| 2 | Analyse (\`/analyse/:gameId\`) | selecting a Game |

## Known-open findings

| # | Finding | Ratio |
| --- | --- | --- |
| 1 | A disabled control's label (\`2.63:1\`) | tolerated |
`;

  it("takes the screens table and leaves every other numbered table alone", () => {
    const screens = parseScreenInventory(withASecondTable);
    expect(screens.map((s) => s.route)).toEqual(["/", "/analyse/:gameId"]);
  });

  it("refuses a document with no screens table, rather than reporting an empty pass", () => {
    expect(() => parseScreenInventory("# A document with no inventory\n")).toThrow(/screens/i);
  });
});
