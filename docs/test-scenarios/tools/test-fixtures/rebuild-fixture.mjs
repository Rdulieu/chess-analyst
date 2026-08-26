#!/usr/bin/env node
// Rebuilds a fixture directory from a real session's subagent transcripts.
//
// The fixture is a REAL run, truncated — never an invented one. What is kept from
// every line is exactly what the ledger reads and nothing else: the line's `type`,
// its millisecond `timestamp`, its `agentId`, and the *kinds* of the blocks its
// message carries (`thinking` / `text` / `tool_use` / `tool_result`, plus the tool's
// name). Everything else — payloads, token usage, uuids, the working directory — is
// dropped, because a fixture that carried it would weigh three quarters of a megabyte
// and would still measure the same thing.
//
// The `.meta.json` files are copied verbatim: their `description` is what tells a
// scenario of an HP pass apart from a Feature Path run, so it must not be touched.
//
//   node .../rebuild-fixture.mjs <subagents-dir> <fixture-name> [agent-id ...]
//
// Provenance of what is committed:
//
// - `hp-pass-2026-08-25` — session 87749a9e-b565-4c07-97f2-2aa5cb801bf0, the US-16b
//   integration→develop gate: path 0, the three Happy Paths, and one Feature Path
//   run that the ledger must leave out.
// - `no-pass-2026-08-25` — that same session's Feature Path run, alone.
// - `retried-prerequisite-2026-08-19` — session 11ecb92e-815d-4887-a9ed-c8fc1d868701,
//   the US-11 gate, where path 0 was dispatched twice: it is the only pass on this
//   machine that ran its prerequisite a second time, and a ledger that keeps one of
//   the two loses 3.8 minutes without saying so.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const [source, name, ...agents] = process.argv.slice(2);
if (!source || !name) {
  console.error("usage: rebuild-fixture.mjs <subagents-dir> <fixture-name> [agent-id ...]");
  process.exit(2);
}
const kept = new Set(agents);
const target = join(dirname(fileURLToPath(import.meta.url)), name);
mkdirSync(target, { recursive: true });

const blockKind = (b) => (b && b.name ? { type: b.type, name: b.name } : { type: b?.type });

for (const file of readdirSync(source).sort()) {
  if (!file.endsWith(".jsonl")) continue;
  const agentId = file.slice("agent-".length, -".jsonl".length);
  if (kept.size && !kept.has(agentId)) continue;

  const lines = readFileSync(join(source, file), "utf8").split("\n").filter(Boolean);
  const reduced = lines.map((line) => {
    const d = JSON.parse(line);
    const out = { type: d.type, timestamp: d.timestamp, agentId: d.agentId };
    const m = d.message;
    if (m && typeof m === "object") {
      out.message = { role: m.role };
      if (Array.isArray(m.content)) out.message.content = m.content.map(blockKind);
      else if (typeof m.content === "string") out.message.content = "…";
    }
    return JSON.stringify(out);
  });
  writeFileSync(join(target, file), reduced.join("\n") + "\n");

  const meta = file.replace(".jsonl", ".meta.json");
  writeFileSync(join(target, meta), readFileSync(join(source, meta), "utf8"));
}
