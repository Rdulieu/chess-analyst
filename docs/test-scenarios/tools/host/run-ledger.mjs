/*
 * The ledger of a pass — what an agentic run cost, reconstructed afterwards and
 * without replaying it (US-18, ADR-0020).
 *
 * Host half of the driver library: it reads subagent transcripts off disk. It
 * measures and it does not judge — no threshold, no verdict, no "slow" and no
 * "fast". A number it returns is a number somebody else compares.
 *
 * Subagent transcripts carry one line per message, timestamped to the millisecond,
 * so the cost of a pass is already on disk days after the fact. The whole method is
 * to classify EVERY interval between two consecutive lines, so the buckets add up to
 * the wall. Deriving "the agent's time" by subtracting tool time from the wall is the
 * mistake that produced a confident wrong answer once: it attributed 78 % to the
 * agent on a run where 56 % of the wall was the agent waiting to be collected.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

/** The five buckets, in the order a reader wants them. */
export const BUCKETS = ["tools", "composing", "analysis", "reporting", "idleWait"];

/*
 * Two reservations that belong WITH the figures, never beside them. A reader who
 * gets the percentages without these will read them as facts.
 */
export const RESERVATIONS = [
  "composing includes API latency and any queueing: the transcript timestamps a message when it lands, so the model's own generation cannot be separated from the wait for it.",
  "The content of thinking blocks is not persisted. This measures how long analysis took, never what it was made of.",
  "The worst wait counts every idle minute, the ones the orchestrator spent legitimately elsewhere included. On a parallel fan-out it should read seconds; on a run resumed between rounds of work it will not, and that is not a defect.",
  "It also reads 0.0 for an agent nobody ever came back to, since the wait after a transcript's last line cannot be measured — 0.0 means either collected at once or abandoned, and only the lived wall tells you which.",
  "None of these figures can see the orchestrator's own session, so none of them is the requester's wait. They measure the subagents, and nothing else.",
];

/* ------------------------------------------------------------------ reading */

/**
 * Reduce one transcript line to what the ledger reads: when it happened and what
 * kind of turn it was. Returns `null` for lines that are not turns at all
 * (attachments the harness injects, blank lines, anything unparseable).
 */
function turnOf(line) {
  let d;
  try {
    d = JSON.parse(line);
  } catch {
    return null;
  }
  if (!d || !d.timestamp) return null;
  const at = Date.parse(d.timestamp);
  if (Number.isNaN(at)) return null;

  const content = d.message && d.message.content;
  if (typeof content === "string") return { at, kind: "prompt" };
  if (!Array.isArray(content)) return null;

  const kinds = new Set(content.map((b) => b && b.type));
  /* One message can in principle carry several block kinds; the outermost one
     decides, because it is what the turn *did*. */
  if (kinds.has("tool_use")) {
    const call = content.find((b) => b && b.type === "tool_use");
    return { at, kind: "tool_use", tool: call && call.name };
  }
  if (kinds.has("tool_result")) return { at, kind: "tool_result" };
  if (kinds.has("text")) return { at, kind: "text" };
  if (kinds.has("thinking")) return { at, kind: "thinking" };
  return null;
}

/** Read one `agent-*.jsonl` into the turns the ledger classifies. */
export function readTranscript(path) {
  const turns = readFileSync(path, "utf8")
    .split("\n")
    .map(turnOf)
    .filter(Boolean);
  return { agentId: basename(path).replace(/^agent-/, "").replace(/\.jsonl$/, ""), turns };
}

/* --------------------------------------------------------------- bucketing */

/**
 * Which bucket the interval between two consecutive turns belongs to.
 *
 * Order matters, and the first rule is the one that is easy to miss: once the agent
 * has produced text it has handed back, so whatever elapses next is not its work —
 * it is the orchestrator not having come to collect.
 */
export function bucketOf(before, after) {
  if (before.kind === "text") return "idleWait";
  if (before.kind === "tool_use" && after.kind === "tool_result") return "tools";
  if (after.kind === "tool_use") return "composing";
  if (after.kind === "thinking") return "analysis";
  if (after.kind === "text") return "reporting";
  if (after.kind === "tool_result") return "tools";
  return "idleWait";
}

/**
 * The ledger of one agent: its wall, the five buckets, and how many tool calls it
 * made. `worked` is the wall less the inert wait — the two are reported together,
 * because reporting only the second flatters the suite and only the first accuses it
 * of a defect it does not have.
 */
export function ledgerOfAgent({ agentId, turns }) {
  const buckets = Object.fromEntries(BUCKETS.map((b) => [b, 0]));
  for (let i = 1; i < turns.length; i += 1) {
    buckets[bucketOf(turns[i - 1], turns[i])] += turns[i].at - turns[i - 1].at;
  }
  const first = turns.length ? turns[0].at : null;
  const last = turns.length ? turns[turns.length - 1].at : null;
  const wall = turns.length ? last - first : 0;

  /*
   * **The longest wait after a report** — the single worst stretch during which the
   * agent had handed back and nothing came for it.
   *
   * Not the wait after its *last* message, which is always zero: a transcript ends on
   * the last thing written. The silence that cost half an hour at the 2026-08-25 gate
   * sits in the middle — HP-03 rendered its report at 12:41:44 and heard nothing until
   * 13:15:28, then answered and ended. Measuring the tail would have found nothing.
   *
   * It is reported per agent rather than folded into the suite, because folding it in
   * is how it stayed invisible: averaged, that gate is a suite running a little long;
   * itemised, it is one scenario left standing in the corridor while its two siblings
   * were picked up in seconds.
   */
  let waitAfterReport = 0;
  let waitedFrom = null;
  for (let i = 1; i < turns.length; i += 1) {
    if (bucketOf(turns[i - 1], turns[i]) !== "idleWait") continue;
    const gap = turns[i].at - turns[i - 1].at;
    if (gap > waitAfterReport) {
      waitAfterReport = gap;
      waitedFrom = turns[i - 1].at;
    }
  }

  return {
    agentId,
    startedAt: first,
    endedAt: last,
    wall,
    worked: wall - buckets.idleWait,
    waitAfterReport,
    waitedFrom,
    buckets,
    toolCalls: turns.filter((t) => t.kind === "tool_use").length,
  };
}

/* ------------------------------------------------- which agents are the pass */

/*
 * Nothing in a transcript says "I am a Happy Path". The only handle is the
 * description the orchestrator gave the dispatch, and those are written by hand, so
 * the matching has to be tolerant of "Run HP-02", "HP-01 import and explore" and
 * "Path 0 — prérequis suite HP" alike.
 *
 * The exclusions come first, and that ordering is the whole subtlety: a session runs
 * Feature Paths and TDD helpers beside its suite, and one real dispatch was called
 * "Run US-17-05 Feature Path (path 0)" — a Feature Path that happens to run path 0
 * as one of its own steps. Asking "does it mention path 0" before "is it a Feature
 * Path" folds that run into the suite and inflates every figure.
 */
const NOT_A_PASS = /feature\s*path|\bFPs?\b|\bTDD\b/i;
const A_SCENARIO = /\bHP[-\s]?\d+/i;
const THE_PREREQUISITE = /\bpath[-\s]*0\b/i;

export function classifyDispatch(description) {
  const said = description || "";
  if (NOT_A_PASS.test(said)) return "other";
  if (A_SCENARIO.test(said)) return "scenario";
  if (THE_PREREQUISITE.test(said)) return "prerequisite";
  return "other";
}

/**
 * The pass a session contains, if it contains one: the prerequisite and the
 * scenarios, in the order they started, each with its own ledger. Everything else
 * the session dispatched is left out.
 */
export function hpPassOfSession(subagentsDir, { every = false } = {}) {
  const entries = readdirSync(subagentsDir)
    .filter((f) => f.endsWith(".meta.json"))
    .map((f) => {
      const description = JSON.parse(readFileSync(join(subagentsDir, f), "utf8")).description || "";
      const transcript = join(subagentsDir, f.replace(".meta.json", ".jsonl"));
      /* `every` costs the whole session rather than the pass inside it. The suite is
         not the only fan-out worth measuring — a Feature Path dispatching two agents
         wants the same figures, and the wait after a report is the same wait. */
      const role = classifyDispatch(description);
      return { description, role: every && role === "other" ? "scenario" : role, transcript };
    })
    .filter((e) => e.role !== "other")
    .map((e) => {
      const read = readTranscript(e.transcript);
      /* The turns are carried along: the suite's worked wall is a union of the
         agents' working intervals, which cannot be recovered from their totals. */
      return { ...e, ...ledgerOfAgent(read), transcriptTurns: read };
    })
    .sort((a, b) => a.startedAt - b.startedAt);

  const scenarios = entries.filter((e) => e.role === "scenario");
  /* Every run of the prerequisite, not the first one. Path 0 has been dispatched
     twice in a session (2026-08-19, after it failed), and keeping one of the two
     drops its minutes out of the wall without a word — a quietly smaller number,
     which is the one failure mode the library is written against. */
  const prerequisites = entries.filter((e) => e.role === "prerequisite");

  if (scenarios.length === 0) {
    return {
      found: false,
      prerequisites,
      scenarios: [],
      reason: prerequisites.length
        ? "this session dispatched the prerequisite but no HP scenario — that is not a pass"
        : "this session dispatched no HP scenario: there is no pass here to cost",
    };
  }
  if (scenarios.every((s) => s.startedAt === null)) {
    return {
      found: false,
      prerequisites,
      scenarios,
      reason:
        "every HP scenario this session dispatched has an empty transcript: they never spoke, so there is nothing to cost",
    };
  }
  return { found: true, prerequisites, scenarios };
}

/* --------------------------------------------------------- the pass as a whole */

/**
 * Every interval an agent spent working, as `[from, to]` pairs. The inert wait is
 * left out on purpose: it is the one interval during which the agent is not the
 * reason the clock is running.
 */
function workingIntervals({ turns }) {
  const spans = [];
  for (let i = 1; i < turns.length; i += 1) {
    if (bucketOf(turns[i - 1], turns[i]) !== "idleWait") spans.push([turns[i - 1].at, turns[i].at]);
  }
  return spans;
}

/** Total length of a set of possibly overlapping intervals, counted once. */
function unionLength(spans) {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let from = null;
  let to = null;
  for (const [s, e] of sorted) {
    if (to === null || s > to) {
      if (to !== null) total += to - from;
      [from, to] = [s, e];
    } else if (e > to) {
      to = e;
    }
  }
  if (to !== null) total += to - from;
  return total;
}

/**
 * The suite's own line. Two walls, and they are different numbers:
 *
 * - `livedWall` — first agent's first turn to last agent's last turn. This is the
 *   time somebody actually spent waiting for the suite.
 * - `workedWall` — the same span, minus every minute during which **no** agent was
 *   working. Scenarios run two at a time, so this is a union and never a sum: adding
 *   the scenarios' walls counts the parallel minutes twice.
 *
 * On 2026-08-25 those were 74 and 43 minutes. The gap is not a rounding difference,
 * it is a scenario that had rendered its report and was left waiting to be collected.
 */
export function suiteOf(agents) {
  const withTurns = agents.filter((a) => a.startedAt !== null);
  if (withTurns.length === 0) return null;
  const startedAt = Math.min(...withTurns.map((a) => a.startedAt));
  const endedAt = Math.max(...withTurns.map((a) => a.endedAt));
  const livedWall = endedAt - startedAt;
  const workedWall = unionLength(withTurns.flatMap((a) => workingIntervals(a.transcriptTurns)));
  const buckets = Object.fromEntries(
    BUCKETS.map((b) => [b, withTurns.reduce((t, a) => t + a.buckets[b], 0)]),
  );
  return {
    startedAt,
    endedAt,
    livedWall,
    workedWall,
    buckets,
    toolCalls: withTurns.reduce((t, a) => t + a.toolCalls, 0),
    sumOfWalls: withTurns.reduce((t, a) => t + a.wall, 0),
  };
}

/** The whole reading of one session: its pass, if it held one, and the suite's line. */
export function ledgerOfSession(subagentsDir, options = {}) {
  const pass = hpPassOfSession(subagentsDir, options);
  const agents = [...pass.prerequisites, ...pass.scenarios];
  return { ...pass, every: Boolean(options.every), suite: pass.found ? suiteOf(agents) : null };
}

/* ------------------------------------------------------------------ rendering */

const BUCKET_LABELS = {
  tools: "tools",
  composing: "composing",
  analysis: "analysis",
  reporting: "reporting",
  idleWait: "idle wait",
};
const TRAILING = "worst wait";
const SINCE = "since";

const min = (ms) => (ms / 60000).toFixed(1);
const pct = (part, whole) => (whole ? `${((100 * part) / whole).toFixed(0)} %` : "—");

function row(label, agent) {
  const b = agent.buckets;
  const cells = BUCKETS.map((k) => `${min(b[k])} (${pct(b[k], agent.wall)})`);
  const since = agent.waitedFrom ? new Date(agent.waitedFrom).toISOString().slice(11, 19) : "—";
  return [
    label,
    min(agent.wall),
    min(agent.worked),
    ...cells,
    min(agent.waitAfterReport),
    /* When the worst wait started, because 33.5 minutes means two opposite things
       depending on whether the gate had already shipped. */
    since,
    String(agent.toolCalls),
  ];
}

function table(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  return rows
    .map((r) => r.map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join("  "))
    .join("\n");
}

/**
 * The ledger as a reader gets it. It states figures and stops there: no threshold,
 * no verdict, no "this is slow" (ADR-0020). The two reservations travel WITH the
 * table rather than in a document beside it, because a percentage read without them
 * looks like a fact.
 */
export function formatLedger(ledger) {
  if (!ledger.found || !ledger.suite) {
    return [
      "No Happy Path pass in this session.",
      "",
      ledger.reason ||
        "the pass holds no agent that ever spoke: there are no turns to cost, so nothing is reported",
      ledger.prerequisites && ledger.prerequisites.length
        ? `(the prerequisite ran ${ledger.prerequisites.length} time(s): ${ledger.prerequisites
            .map((p) => p.description)
            .join(", ")})`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const agents = [...ledger.prerequisites, ...ledger.scenarios];
  const header = ["", "wall", "worked", ...BUCKETS.map((k) => BUCKET_LABELS[k]), TRAILING, SINCE, "calls"];
  const s = ledger.suite;
  const rows = [
    header,
    ...agents.map((a) => row(a.description, a)),
    /* The suite's own split, and it is the figure everything else quotes: "tool
       round-trips 39-48 %, composing 32-39 %, analysis 17-19 %" is a statement about
       the pass, never about one scenario. Its shares are taken over the summed walls,
       because that is the denominator those percentages were computed against — the
       lived wall would divide parallel work by a smaller number and flatter nothing
       consistently. */
    [
      "Suite",
      min(s.sumOfWalls),
      min(s.workedWall),
      ...BUCKETS.map((k) => `${min(s.buckets[k])} (${pct(s.buckets[k], s.sumOfWalls)})`),
      min(Math.max(...agents.map((a) => a.waitAfterReport))),
      "—",
      String(s.toolCalls),
    ],
  ];
  return [
    ledger.every
      ? "Ledger of every subagent this session dispatched — minutes, and the share of each agent's own wall. This is not a Happy Path pass; the totals below are a sum over unrelated agents."
      : "Ledger of the pass — minutes, and the share of each agent's own wall.",
    "",
    table(rows),
    "",
    `Suite worked wall  ${min(s.workedWall)} min   (every minute at least one agent was working, counted once)`,
    `First turn → last  ${min(s.livedWall)} min   (NOT the requester's wait: this ledger cannot see the orchestrator's session. Its right edge is the last LINE of any transcript, and an agent stays resident after its report — on 2026-08-25 one was woken 34 min later by a stray watcher and stretched this figure from 43 to 74)`,
    `Sum of the walls   ${min(s.sumOfWalls)} min   (not the suite's span: scenarios overlap, so this counts parallel minutes twice)`,
    `Tool calls         ${s.toolCalls}`,
    "",
    "Reservations of method — read the shares with these or not at all:",
    ...RESERVATIONS.map((r) => `  - ${r.replace(/`/g, "")}`),
  ].join("\n");
}

/* ------------------------------------------------------------------------ CLI */

/**
 * Where this machine keeps the transcripts of a repo's sessions. Claude Code slugs
 * the launch directory, and a session launched from the main checkout keeps that
 * slug even when its subagents work in worktrees — so a worktree's own slug is a
 * *second* place to look, never a replacement for the first.
 */
export function projectTranscriptRoots(repoPath, home) {
  const root = join(home, ".claude", "projects");
  const slug = repoPath.replace(/[^a-zA-Z0-9]/g, "-");
  let all;
  try {
    all = readdirSync(root);
  } catch {
    return [];
  }
  return all.filter((d) => d === slug || d.startsWith(`${slug}-`)).map((d) => join(root, d));
}

/**
 * The story a session belongs to, read off the branches its dispatches worked on.
 * Nothing records it; the branch name is the only trace, and it is enough to tell two
 * gates of the same day apart.
 */
function storyOf(subagentsDir) {
  const stories = new Set();
  for (const f of readdirSync(subagentsDir)) {
    if (!f.endsWith(".meta.json")) continue;
    const said = JSON.parse(readFileSync(join(subagentsDir, f), "utf8")).description || "";
    const m = said.match(/\bUS-\d+[a-z]?\b/i);
    if (m) stories.add(m[0].toUpperCase());
  }
  return [...stories].sort().join(", ");
}

function sessionsUnder(projectDir) {
  return readdirSync(projectDir)
    .map((s) => join(projectDir, s, "subagents"))
    .filter((d) => {
      try {
        return readdirSync(d).some((f) => f.endsWith(".meta.json"));
      } catch {
        return false;
      }
    });
}

/**
 * The main checkout, even when this runs from a worktree: sessions are slugged by
 * the directory Claude Code was launched in, which is the main checkout far more
 * often than the worktree its subagents happen to work in.
 */
function mainWorktree() {
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
      encoding: "utf8",
    }).trim();
    return dirname(common);
  } catch {
    return resolve(".");
  }
}

function main(argv) {
  const every = argv.includes("--every");
  const [arg] = argv.filter((a) => a !== "--every");
  const repo = mainWorktree();
  if (arg && arg !== "--list") {
    let dir = arg;
    try {
      readdirSync(dir);
    } catch {
      const found = projectTranscriptRoots(repo, process.env.HOME)
        .flatMap(sessionsUnder)
        .find((d) => d.includes(arg));
      if (!found) {
        console.error(`No session directory and no session id matching ${arg}.`);
        process.exit(2);
      }
      dir = found;
    }
    console.log(formatLedger(ledgerOfSession(dir, { every })));
    return;
  }

  const roots = projectTranscriptRoots(repo, process.env.HOME);
  if (roots.length === 0) {
    console.error("No transcripts on this machine for this repository.");
    process.exit(2);
  }
  console.log("Sessions holding a Happy Path pass (most recent last):\n");
  const found = roots
    .flatMap(sessionsUnder)
    .map((dir) => ({ dir, pass: ledgerOfSession(dir) }))
    .filter(({ pass }) => pass.found)
    .sort((a, b) => a.pass.suite.startedAt - b.pass.suite.startedAt);
  for (const { dir, pass } of found) {
    const day = new Date(pass.suite.startedAt).toISOString().slice(0, 10);
    /* Two gates ran on 2026-08-24, and a date alone cannot tell them apart. What can
       is what ELSE the session dispatched: a gate is named by the story whose Feature
       Paths sit beside it. */
    console.log(
      `  ${day}  ${pass.scenarios.length} scenario(s)  ` +
        `lived ${min(pass.suite.livedWall)} / worked ${min(pass.suite.workedWall)} min  ` +
        `${storyOf(dir) || "—"}  ${basename(dirname(dir))}`,
    );
  }
  if (found.length === 0) console.log("  (none)");
}

if (process.argv[1] && process.argv[1].endsWith("run-ledger.mjs")) main(process.argv.slice(2));
