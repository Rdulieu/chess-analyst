#!/usr/bin/env node
// Rebuilds `hp-pass-2026-08-25/` from a real session's subagent transcripts.
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
//   node docs/test-scenarios/tools/test-fixtures/rebuild-fixture.mjs <subagents-dir>
//
// Provenance of what is committed: session 87749a9e-b565-4c07-97f2-2aa5cb801bf0,
// the US-16b integration→develop gate of 2026-08-25 — path 0, the three Happy Paths,
// and one Feature Path run that the ledger must leave out.

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KEPT_AGENTS = new Set([
  "a17b6177591fe06e1", // Path 0 — prérequis suite HP
  "a74e54fc37d93067e", // HP-01 import and explore
  "ad88a682a263cac02", // HP-02 read my aggregates
  "af24cf19f20cb934d", // HP-03 read blind and confront
  "a32b549b063a8a770", // FP US-16b tranche 01 — kept precisely so it can be excluded
]);

const source = process.argv[2];
if (!source) {
  console.error("usage: rebuild-fixture.mjs <path to a session's subagents/ directory>");
  process.exit(2);
}
const target = join(dirname(fileURLToPath(import.meta.url)), "hp-pass-2026-08-25");
mkdirSync(target, { recursive: true });

const blockKind = (b) => (b && b.name ? { type: b.type, name: b.name } : { type: b?.type });

for (const file of readdirSync(source).sort()) {
  if (!file.endsWith(".jsonl")) continue;
  const agentId = file.slice("agent-".length, -".jsonl".length);
  if (!KEPT_AGENTS.has(agentId)) continue;

  const lines = readFileSync(join(source, file), "utf8").split("\n").filter(Boolean);
  const kept = lines.map((line) => {
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
  writeFileSync(join(target, file), kept.join("\n") + "\n");

  const meta = file.replace(".jsonl", ".meta.json");
  writeFileSync(join(target, meta), readFileSync(join(source, meta), "utf8"));
}
