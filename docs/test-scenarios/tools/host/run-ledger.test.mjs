import { describe, it, expect } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  RESERVATIONS,
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
    expect(pass.prerequisites.map((p) => p.description)).toEqual(["Path 0 — prérequis suite HP"]);
    expect(pass.scenarios.map((s) => s.description)).toEqual([
      "HP-01 import and explore",
      "HP-03 read blind and confront",
      "HP-02 read my aggregates",
    ]);
  });
});

describe("the ledger of the whole pass", () => {
  const minutes = (ms) => ms / 60000;

  it("measures 42.6 minutes of work, and a 31-minute tail nobody waited through", () => {
    const { suite } = ledgerOfSession(FIXTURES);

    // Exact properties of the fixture. What they are NOT is the pair of numbers this
    // story was opened on: "the requester waited 74 minutes for 43 of work" was this
    // figure read as somebody's wait, and it was wrong. He waited 57.7; the suite
    // spanned 43.0 for 42.6 of work, about 21 seconds of slack. The 31.29 below is the
    // tail — a finished subagent woken by a stray watcher 23 minutes after the gate
    // shipped — and this test exists to keep that reading attached to the number.
    expect(minutes(suite.workedWall)).toBeCloseTo(42.59, 2);
    expect(minutes(suite.livedWall)).toBeCloseTo(73.88, 2);
    expect(minutes(suite.livedWall - suite.workedWall)).toBeCloseTo(31.29, 2);
  });

  it("keeps the suite's wall apart from the sum of its scenarios, which overlap", () => {
    const { suite, prerequisites, scenarios } = ledgerOfSession(FIXTURES);
    const summed = [...prerequisites, ...scenarios].reduce((t, a) => t + a.wall, 0);

    // Two scenarios run at a time, so adding their walls counts the same minutes twice.
    expect(minutes(summed)).toBeCloseTo(108.43, 2);
    expect(suite.livedWall).toBeLessThan(summed);
  });

  it("counts the tool calls of the pass, prerequisite included", () => {
    const { suite, prerequisites, scenarios } = ledgerOfSession(FIXTURES);
    expect(suite.toolCalls).toBe([...prerequisites, ...scenarios].reduce((t, a) => t + a.toolCalls, 0));
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
    expect(text).toMatch(/worked/i);
    /* Not "lived": that word was removed on 2026-08-27 with the claim it carried. The
       span is printed under a name that describes it — first turn to last line — with
       what it is not, right there beside it. */
    expect(text).not.toMatch(/lived wall/i);
    expect(text).toMatch(/First turn → last/);
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

describe("a pass whose prerequisite had to be run twice", () => {
  /*
   * The 2026-08-19 gate dispatched path 0, it failed, and it was dispatched again.
   * Keeping one of the two loses 3.8 minutes and says nothing about it — which is the
   * one failure mode ADR-0020 refuses: not a wrong number, a quietly smaller one.
   */
  const RETRIED = join(FIXTURES, "..", "retried-prerequisite-2026-08-19");

  it("keeps both runs of the prerequisite, each as its own line", () => {
    const { prerequisites } = ledgerOfSession(RETRIED);

    expect(prerequisites.map((p) => p.description)).toEqual([
      "Run path 0 bootstrap",
      "Run path 0 bootstrap (retry)",
    ]);
  });

  it("counts the retry into the suite, rather than dropping it out of the wall", () => {
    const { suite, prerequisites } = ledgerOfSession(RETRIED);
    const retry = prerequisites[1];

    expect(retry.wall).toBeGreaterThan(3 * 60 * 1000);
    expect(formatLedger(ledgerOfSession(RETRIED))).toContain("(retry)");
    expect(suite.toolCalls).toBeGreaterThanOrEqual(retry.toolCalls);
  });
});

describe("what the suite line owes a reader", () => {
  it("prints the suite's own split, which is the figure the PRD and the ADR quote", () => {
    const text = formatLedger(ledgerOfSession(FIXTURES));

    // "tool round-trips 39-48 %, composing 32-39 %, analysis 17-19 %" is a statement
    // about the SUITE, not about any one scenario. Leaving it computed but unprinted
    // means importing the module to read the only number anybody cites.
    expect(text).toMatch(/^Suite\b.*%/m);
  });
});

describe("an HP scenario that was dispatched and never spoke", () => {
  it("refuses the pass loudly instead of throwing a bare TypeError on a null suite", () => {
    const empty = { found: true, prerequisites: [], scenarios: [], suite: null };
    expect(() => formatLedger(empty)).not.toThrow();
    expect(formatLedger(empty)).toMatch(/no.*turn|never spoke|nothing to cost/i);
  });
});

describe("the longest wait after a scenario has rendered its report", () => {
  const minutes = (ms) => ms / 60000;

  it("names the scenario that was left standing, instead of averaging it away", () => {
    const { scenarios } = ledgerOfSession(FIXTURES);
    const byName = Object.fromEntries(scenarios.map((s) => [s.description.slice(0, 5), s]));

    // HP-03 rendered its report at 12:41:44Z and heard nothing until 13:15:28. Its two
    // siblings were picked up in seconds. That is not a suite running long: it is one
    // scenario waiting in the corridor, and only a per-scenario figure says so.
    expect(minutes(byName["HP-03"].waitAfterReport)).toBeGreaterThan(33);
    expect(minutes(byName["HP-01"].waitAfterReport)).toBeLessThan(0.2);
    expect(minutes(byName["HP-02"].waitAfterReport)).toBeLessThan(1);
    expect(new Date(byName["HP-03"].waitedFrom).toISOString()).toMatch(/T12:41:44/);
  });

  it("is the worst single stretch, never the tail — a transcript ends on what was written", () => {
    const { scenarios } = ledgerOfSession(FIXTURES);
    for (const s of scenarios) {
      expect(s.waitAfterReport).toBeLessThanOrEqual(s.buckets.idleWait);
      expect(s.waitAfterReport).toBeGreaterThanOrEqual(0);
    }
  });

  it("is printed, because a figure nobody reads changes nothing", () => {
    expect(formatLedger(ledgerOfSession(FIXTURES))).toMatch(/worst wait/i);
  });
});

describe("costing a session that is not a Happy Path pass", () => {
  it("costs every subagent when asked, so a Feature Path fan-out can be measured too", () => {
    // The suite is not the only thing worth costing: slice 05's own Feature Path
    // dispatches two ordinary subagents and needs the same figures about them.
    const all = ledgerOfSession(FIXTURES, { every: true });

    expect(all.found).toBe(true);
    expect(all.scenarios.length + all.prerequisites.length).toBe(5);
    expect(all.scenarios.map((s) => s.description)).toContain("FP US-16b tranche 01");
  });
});

describe("what the first-turn-to-last figure is, and what it is not", () => {
  /*
   * It is NOT the requester's wait, and saying so cost two days of a wrong headline.
   *
   * On 2026-08-25 this ledger read 73.9 minutes, and "the requester waited 74 minutes
   * for 43 minutes of work" went into the PRD, the BACKLOG, the ADR and a slice of its
   * own. The parent session says otherwise: he asked at 11:54:47, the last report was
   * consolidated at 12:44:32 and the gate was delivered at 12:52:30 — 57.7 minutes,
   * and every report was collected within seconds of arriving. The extra 31 minutes are
   * HP-03's transcript gaining one more line at 13:15, when a stray background watcher
   * from its own earlier run woke it for nothing, twenty-three minutes after the gate
   * had shipped.
   *
   * No rule inside the transcripts separates that from real work — the zombie made real
   * tool calls. The only witness is the orchestrator's own session, which this ledger
   * does not read. So the figure is reported with what it is, and the output says so.
   */
  it("says plainly that it is not the requester's wait", () => {
    const text = formatLedger(ledgerOfSession(FIXTURES));
    expect(text).toMatch(/NOT the requester's wait/);
    expect(text).toMatch(/cannot see the orchestrator/i);
  });

  it("carries the reservation that it cannot see the orchestrator at all", () => {
    expect(RESERVATIONS.join(" ")).toMatch(/none of them is the requester's wait/i);
  });
});
