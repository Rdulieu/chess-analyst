import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { guarded, setFieldScript, matcherFor } from "./navigate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/*
 * Pure parts only, and no jsdom. The argument is already written at the top of
 * `../page/theme-audit.js`: driving the page from a fake DOM would test a different
 * mechanism than the one that ships. The seam for the page half is the Feature Path.
 */

describe("every script that reaches the page", () => {
  it("carries a location.port guard", () => {
    // Load-bearing, not belt-and-braces: a shared browser had its selected page stolen
    // ~20 times in one parallel run, and this guard is what kept every action off the
    // siblings' apps.
    const script = guarded("5211", "return 1");
    expect(script).toContain("location.port");
    expect(script).toContain("5211");
    expect(script).toMatch(/throw/);
  });

  it("refuses to build one without a port, rather than shipping an unguarded script", () => {
    expect(() => guarded(undefined, "return 1")).toThrow(/port/i);
  });

  it("is true of every helper in this module, not only of the guard builder", () => {
    /* The rule is only worth anything if it holds everywhere. Any exported builder that
       returns a script must put the guard in it. */
    const port = "5309";
    const scripts = [
      guarded(port, "return 1"),
      setFieldScript({ port, selector: "#import-from", value: "2025-01" }),
    ];
    for (const script of scripts) expect(script).toContain(`!== "${port}"`);
  });
});

describe("putting a value into a field the framework controls", () => {
  const script = setFieldScript({ port: "5211", selector: "#import-from", value: "2025-01" });

  it("goes through the native value setter, because assigning value does nothing", () => {
    // The import form's month fields keep their default when a driver assigns `value`
    // or uses a high-level fill helper — measured 2026-08-19, where the range silently
    // stayed on the current month and the run nearly imported the wrong months.
    expect(script).toContain("HTMLInputElement.prototype");
    expect(script).toContain("value");
    expect(script).toMatch(/dispatchEvent/);
    expect(script).toContain("input");
    expect(script).toContain("change");
  });

  it("reads the field back and throws when it did not take", () => {
    expect(script).toMatch(/throw/);
    expect(script).toContain("2025-01");
  });

  it("never submits anything — the throw has to happen before that", () => {
    expect(script).not.toMatch(/\.submit\(|requestSubmit|form\.submit/);
  });

  it("says which field it could not find, rather than failing silently", () => {
    expect(script).toContain("#import-from");
  });
});

describe("knowing which screen one is on", () => {
  it("matches a plain route exactly, and not a route that merely starts with it", () => {
    const at = matcherFor("/profiles");
    expect(at("/profiles")).toBe(true);
    expect(at("/profiles/1")).toBe(false);
  });

  it("matches a parameterised route on any one segment", () => {
    const at = matcherFor("/analyse/:gameId");
    expect(at("/analyse/166")).toBe(true);
    expect(at("/analyse")).toBe(false);
    expect(at("/analyse/166/lecture")).toBe(false);
  });

  it("matches the root without swallowing every other screen", () => {
    const at = matcherFor("/");
    expect(at("/")).toBe(true);
    expect(at("/stats")).toBe(false);
  });
});

describe("the two halves stay apart", () => {
  it("the page half imports nothing from the host half, and the other way round", () => {
    const page = readdirSync(join(HERE, "..", "page")).filter((f) => f.endsWith(".js"));
    expect(page.length).toBeGreaterThan(0);
    for (const f of page) {
      const source = readFileSync(join(HERE, "..", "page", f), "utf8");
      // Browser-side, dependency-free, injectable as it stands: no imports at all.
      expect(source).not.toMatch(/^\s*(import|require)\b/m);
    }
    for (const f of readdirSync(HERE).filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"))) {
      const source = readFileSync(join(HERE, f), "utf8");
      expect(source).not.toMatch(/from\s+"\.\.\/page\//);
    }
  });
});

describe("which Game the walk opens", () => {
  /*
   * `openFirstGame()` takes the first row, and two scenarios found independently on
   * 2026-08-27 that the first row is an **unanalysed** Game — so the theme pass audited
   * the Analyse screen with no evaluation curve, no advantage bar and no severity
   * glyph, which is precisely what HP-01 says its pass is the strongest of the three at
   * seeing. It reported green, and it was green: on the wrong Game.
   *
   * The library must not choose. It must let the caller choose — and say so.
   */
  it("lets the caller supply the opener for a screen the navigation cannot reach", async () => {
    const { openerFor } = await import("./navigate.mjs");
    const mine = async () => "opened by the caller";
    const openers = { "/analyse/:gameId": mine };

    expect(openerFor(openers, { route: "/analyse/:gameId" })).toBe(mine);
    expect(openerFor(openers, { route: "/profiles/:id" })).toBe(undefined);
    expect(openerFor(undefined, { route: "/analyse/:gameId" })).toBe(undefined);
  });
});

describe("where selecting a Profile leaves the walk", () => {
  /*
   * Until US-23, "Sélectionner" only recorded the current Profile and the walk stayed
   * on `/profiles`. It is now a **composed act** — it records, then leads to "Mes
   * parties" — so a helper that waits for `/profiles` after the click waits for a
   * screen the app has deliberately left. Measured on the FP of US-23-01, 2026-09-01:
   * the scenario had to drive it by hand, and every HP going through this helper would
   * have failed on a false red.
   *
   * The asymmetry is the point: a Profile that is ALREADY current has no button to
   * click, so nothing navigates and the walk is still on `/profiles`. The wait must
   * follow what the click actually did, not what it usually does.
   */
  const sessionAnswering = (outcome) => {
    const seen = [];
    let path = "/profiles";
    return {
      seen,
      pendingRequests: () => 0,
      evaluate: async (script) => {
        seen.push(script);
        /* The script carries the whole page-driver source, so every method NAME
           appears in it. Only the trailing `agenticDriver.<call>` says what is
           being called. */
        if (script.includes("agenticDriver.followNav(")) return JSON.stringify(true);
        if (script.includes("agenticDriver.selectProfile(")) {
          // The app navigates only when there was something to click.
          if (outcome === "clicked") path = "/";
          return JSON.stringify(outcome);
        }
        if (script.includes("agenticDriver.where()")) return JSON.stringify({ path, text: 12 });
        return JSON.stringify(null);
      },
    };
  };

  /** Short waits: the point is which screen is waited for, not how patiently. */
  const FAST = { timeoutMs: 600, settleMs: 10 };

  it("waits for Mes parties when the click actually selected a Profile", async () => {
    const { selectProfile } = await import("./navigate.mjs");
    const session = sessionAnswering("clicked");

    const picked = await selectProfile(session, {
      port: "5231",
      username: "Nonomoho",
      waitOptions: FAST,
    });

    expect(picked).toBe("clicked");
    // It did not sit waiting for a screen the act has left behind.
    expect(session.seen.some((s) => s.includes("agenticDriver.selectProfile("))).toBe(true);
  });

  it("stays on the Profile list when there was nothing to click", async () => {
    const { selectProfile } = await import("./navigate.mjs");
    const session = sessionAnswering("already");

    expect(
      await selectProfile(session, { port: "5231", username: "Nonomoho", waitOptions: FAST }),
    ).toBe("already");
  });
});
