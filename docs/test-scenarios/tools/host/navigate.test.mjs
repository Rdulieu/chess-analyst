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
