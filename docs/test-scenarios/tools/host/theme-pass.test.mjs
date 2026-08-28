import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { parseScreenInventory, parseWidths, passPlan, auditScript, plannedAudits } from "./theme-pass.mjs";

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
  it("is thirty-six audits — nine screens, two themes, two widths", () => {
    // It was eighteen until US-22. The pass looked at 1280 px only, and two real
    // defects lived under that width while it reported green.
    const screens = parseScreenInventory(readFileSync(THEME_PASS_MD, "utf8"));
    expect(plannedAudits(screens)).toBe(36);
  });

  it("counts the widths it is given rather than a number of its own", () => {
    const screens = parseScreenInventory(readFileSync(THEME_PASS_MD, "utf8"));
    expect(plannedAudits(screens, [1280])).toBe(18);
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

  it("asserts the WIDTH it was asked for, for the same reason it asserts the theme", () => {
    // A viewport override is emulation too. A pass that believes it measured 380 px
    // while the page rendered at 1280 reports a green narrow screen that never
    // rendered — the exact shape of the failure the theme guard exists against.
    const narrow = auditScript({
      port: "5199",
      theme: "light",
      width: 380,
      source: "function themeAudit(){return {}}",
    });
    expect(narrow).toContain("innerWidth");
    expect(narrow).toContain("380");
    expect(narrow).toMatch(/throw/);
  });

  it("still builds without a width, so a caller reaching one screen owes nothing", () => {
    const script = auditScript({ port: "5199", theme: "light", source: "" });
    expect(script).not.toContain("innerWidth");
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

describe("the widths the pass looks at", () => {
  const widths = parseWidths(readFileSync(THEME_PASS_MD, "utf8"));

  it("is read from theme-pass.md, like the screens — one place, no second copy", () => {
    // The document is the only place the pass is edited (D4). A width hard-coded
    // in the library and a width named in the prose drift the same way an
    // inventory copied twice drifted: silently, and in the direction of less.
    expect(widths).toEqual([1280, 380]);
  });

  it("keeps the narrow one, because it is the only width that ever saw the defect", () => {
    // Two real defects lived under 1280 px and the pass reported green over both.
    expect(widths).toContain(380);
  });

  it("refuses a document that declares none, rather than falling back to one width", () => {
    // Silently reverting to 1280 is exactly the state this slice is leaving.
    expect(() => parseWidths("# A document with no widths\n")).toThrow(/widths/i);
  });

  it("takes its own table and leaves the screens table alone", () => {
    const doc = `
## The nine screens

| # | Screen | Reached by |
| --- | --- | --- |
| 1 | Mes parties (\`/\`) | navigation |

## The two widths

| width | why this one |
| --- | --- |
| \`1280 px\` | the comfortable desk |
| \`380 px\` | the narrow window |
`;
    expect(parseWidths(doc)).toEqual([1280, 380]);
    expect(parseScreenInventory(doc).map((s) => s.route)).toEqual(["/"]);
  });
});

describe("the order the pass walks in", () => {
  const screens = [
    { number: 1, name: "Mes parties", route: "/", inNav: true },
    { number: 2, name: "Profils", route: "/profiles", inNav: true },
  ];
  const plan = passPlan({ screens, widths: [1280, 380] });

  it("audits every screen once per theme and per width — nothing silently dropped", () => {
    expect(plan).toHaveLength(8);
    const seen = new Set(plan.map((s) => `${s.theme}|${s.width}|${s.screen.route}`));
    expect(seen.size).toBe(8);
    expect(seen.has("dark|380|/profiles")).toBe(true);
  });

  it("changes theme least often, because that is the emulation that has misbehaved", () => {
    // Four observations disagree about how colour-scheme emulation fails; none
    // disagrees that setting it less often and asserting it every time is the remedy.
    expect(plan.map((s) => s.theme)).toEqual([
      "light", "light", "light", "light", "dark", "dark", "dark", "dark",
    ]);
  });

  it("finishes a width before touching the next, so a walk is one layout throughout", () => {
    expect(plan.slice(0, 4).map((s) => s.width)).toEqual([1280, 1280, 380, 380]);
  });
});
