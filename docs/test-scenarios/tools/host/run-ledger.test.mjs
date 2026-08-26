import { describe, it, expect } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  readTranscript,
  ledgerOfAgent,
  classifyDispatch,
  hpPassOfSession,
  ledgerOfSession,
  formatLedger,
} from "./run-ledger.mjs";

/*
 * Measured against a REAL pass, truncated: the US-16b integration→develop gate of
 * 2026-08-25 (session 87749a9e), whose transcripts are committed under
 * `../test-fixtures/hp-pass-2026-08-25/` with every field the ledger does not read
 * stripped out. See `../test-fixtures/rebuild-fixture.mjs` for what was kept and why.
 *
 * A transcript nobody actually produced would validate the bucketing against the idea
 * we have of it. This one costs nothing and cannot flatter.
 */
const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "test-fixtures", "hp-pass-2026-08-25");
const HP_02 = join(FIXTURES, "agent-ad88a682a263cac02.jsonl");

describe("the ledger of one agent", () => {
  it("splits the whole wall and nothing but the wall — the five buckets add up", () => {
    const ledger = ledgerOfAgent(readTranscript(HP_02));

    const parts =
      ledger.buckets.tools +
      ledger.buckets.composing +
      ledger.buckets.analysis +
      ledger.buckets.reporting +
      ledger.buckets.idleWait;

    // HP-02 ran 12:29:39.035Z → 12:44:40.293Z: fifteen minutes and a second.
    expect(ledger.wall).toBe(901258);
    expect(parts).toBe(ledger.wall);
  });
});

describe("an agent that finished and was not collected", () => {
  it("books the wait as wait, so the worked wall is not the lived one", () => {
    const HP_03 = join(FIXTURES, "agent-af24cf19f20cb934d.jsonl");
    const ledger = ledgerOfAgent(readTranscript(HP_03));

    // HP-03 rendered its report at 12:41:44Z and did nothing until 13:15:28Z.
    // That is over half its wall, and none of it is work.
    expect(ledger.wall).toBeGreaterThan(60 * 60 * 1000);
    expect(ledger.buckets.idleWait).toBeGreaterThan(33 * 60 * 1000);
    expect(ledger.worked).toBe(ledger.wall - ledger.buckets.idleWait);
    expect(ledger.worked).toBeLessThan(ledger.wall / 2);
  });
});

describe("telling a pass apart from everything else the session dispatched", () => {
  /*
   * Real dispatch descriptions, copied from the sessions on disk. They are the only
   * handle there is: nothing marks a subagent as belonging to an HP suite. The
   * awkward one is last — a Feature Path that happened to run path 0 as one of its
   * steps, which a naive "does it say path 0" would have swallowed.
   */
  it.each([
    ["Path 0 — prérequis suite HP", "prerequisite"],
    ["Run path 0 bootstrap", "prerequisite"],
    ["HP prerequisite: run path 0", "prerequisite"],
    ["Run HP path 0 bootstrap", "prerequisite"],
    ["HP-01 import and explore", "scenario"],
    ["Run HP-02", "scenario"],
    ["Run HP-01 with the US-16a graft", "scenario"],
    ["Run HP-02 and HP-03 with theme pass", "scenario"],
    ["FP US-16b tranche 01", "other"],
    ["Run US-17-03 Feature Path", "other"],
    ["TDD slice 02 US-13", "other"],
    ["Run US-17-05 Feature Path (path 0)", "other"],
  ])("reads %j as %s", (description, expected) => {
    expect(classifyDispatch(description)).toBe(expected);
  });

  it("keeps the pass and leaves the session's Feature Path runs out", () => {
    const pass = hpPassOfSession(FIXTURES);

    expect(pass.found).toBe(true);
    expect(pass.prerequisite.description).toBe("Path 0 — prérequis suite HP");
    expect(pass.scenarios.map((s) => s.description)).toEqual([
      "HP-01 import and explore",
      "HP-03 read blind and confront",
      "HP-02 read my aggregates",
    ]);
  });
});

describe("the ledger of the whole pass", () => {
  const minutes = (ms) => ms / 60000;

  it("reproduces the two figures the requester actually lived on 2026-08-25", () => {
    const { suite } = ledgerOfSession(FIXTURES);

    // He waited 74 minutes in front of a suite that worked 43 — the pair of numbers
    // this whole story was opened on, and they come out of the transcripts unaided.
    // Reporting only the second flatters the suite; reporting only the first blames
    // it for an orchestration defect it does not have.
    expect(minutes(suite.livedWall)).toBeCloseTo(73.88, 2);
    expect(minutes(suite.workedWall)).toBeCloseTo(42.59, 2);
    expect(minutes(suite.livedWall - suite.workedWall)).toBeCloseTo(31.29, 2);
  });

  it("keeps the suite's wall apart from the sum of its scenarios, which overlap", () => {
    const { suite, prerequisite, scenarios } = ledgerOfSession(FIXTURES);
    const summed = [prerequisite, ...scenarios].reduce((t, a) => t + a.wall, 0);

    // Two scenarios run at a time, so adding their walls counts the same minutes twice.
    expect(minutes(summed)).toBeCloseTo(108.43, 2);
    expect(suite.livedWall).toBeLessThan(summed);
  });

  it("counts the tool calls of the pass, prerequisite included", () => {
    const { suite, prerequisite, scenarios } = ledgerOfSession(FIXTURES);
    expect(suite.toolCalls).toBe([prerequisite, ...scenarios].reduce((t, a) => t + a.toolCalls, 0));
    expect(suite.toolCalls).toBeGreaterThan(150);
  });
});

describe("a session that never ran a pass", () => {
  it("says so, instead of handing back an empty table that would look like a measurement", () => {
    const ledger = ledgerOfSession(join(FIXTURES, "..", "no-pass-2026-08-25"));

    expect(ledger.found).toBe(false);
    expect(ledger.reason).toMatch(/no HP scenario/i);
    expect(ledger.suite).toBeNull();
  });
});

describe("what the ledger hands to a reader", () => {
  it("carries its own two reservations, so nobody reads the percentages as facts", () => {
    const text = formatLedger(ledgerOfSession(FIXTURES));

    expect(text).toMatch(/API latency/i);
    expect(text).toMatch(/content of thinking blocks is not persisted/i);
  });

  it("names every scenario, both walls, and the five buckets", () => {
    const text = formatLedger(ledgerOfSession(FIXTURES));

    for (const name of ["Path 0", "HP-01", "HP-02", "HP-03"]) expect(text).toContain(name);
    for (const bucket of ["tools", "composing", "analysis", "reporting", "idle"]) {
      expect(text.toLowerCase()).toContain(bucket);
    }
    expect(text).toMatch(/lived/i);
    expect(text).toMatch(/worked/i);
  });

  it("passes no judgement — it holds no verdict on how long any of it took", () => {
    const text = formatLedger(ledgerOfSession(FIXTURES)).toLowerCase();

    // ADR-0020: the library measures, the reader compares. A threshold here would be
    // the library deciding what "good" is, one release before anyone agreed a target.
    for (const verdict of ["too slow", "too long", "acceptable", "target", "threshold", "budget"]) {
      expect(text).not.toContain(verdict);
    }
  });

  it("says a session held no pass rather than printing an empty table", () => {
    const text = formatLedger(ledgerOfSession(join(FIXTURES, "..", "no-pass-2026-08-25")));

    expect(text).toMatch(/no HP scenario/i);
    expect(text).not.toMatch(/lived wall/i);
  });
});
