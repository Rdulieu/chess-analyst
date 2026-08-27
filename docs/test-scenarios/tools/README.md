# The driver library

Everything a scenario's agent would otherwise re-derive at every run: launching the app,
restoring a snapshot, navigating, running the theme pass, reading a field back, and costing a
pass after the fact. It exists because measurement said so — **composing driver scripts is a
third of what the Happy Path suite costs**, and the scripts that get reinvented every run are
also where the suite's false findings came from (ADR-0020).

**It drives; it never judges.** No `expect`, no threshold, no comparison with an expected value.
It returns raw values and it **throws** when the *mechanism* failed — the server did not answer,
the screen did not render, the field did not read back what was set, the measured theme is not
the requested one. What the application *says* is asserted by the scenario, read and judged by
the agent. A library that quietly asserts less every run would keep the suite green while it
stopped looking, and nothing else is watching.

**It is named only in `.claude/skills/agentic-tests/SKILL.md` — never in a scenario.** The four
journeys under `docs/test-scenarios/` carry no launch command at all, which is why they survived
a complete change of pilot without one line moving.

## Two halves, and they do not import each other

| | | |
|---|---|---|
| **host/** | runs on the machine | restore, launch, stop; a private browser; emulate a theme; read transcripts |
| **page/** | runs inside the page under test | audit a screen, navigate, read a field back |

Plain JavaScript, no build step: `.mjs` on the host side, injectable `.js` on the page side. The
library is not part of the application, is in neither workspace, and does not participate in
`npm run build`.

## Testing

Its own cycle, its own command:

```bash
npm run test:tools      # this directory
npm test                # the application — unchanged, and it does not run these
```

**A slice that touches this directory passes both.** The rule is written into the skill because
"build + tests" reads as `npm test` alone, and that is how `theme-audit.js` spent four months
shipped, relied upon by every theme pass, and tested by nobody.

Only the **pure** parts are unit-tested — bucketing a transcript, building a URL, parsing a
command's output. Unit-testing "launch the app" would manufacture exactly the false confidence
ADR-0020 is written against; the real check of each helper is a **Feature Path** run with it.

## What is here

- **`host/run-ledger.mjs`** — the ledger of a pass. Reconstructs what an agentic run cost from
  the subagent transcripts, afterwards and without replaying it: per scenario the wall and five
  buckets (tools, composing, analysis, reporting, inert wait), plus the suite's *lived* and
  *worked* walls, which are two different numbers.

  ```bash
  node docs/test-scenarios/tools/host/run-ledger.mjs            # sessions that hold a pass
  node docs/test-scenarios/tools/host/run-ledger.mjs <session>  # cost one of them
  node docs/test-scenarios/tools/host/run-ledger.mjs --every <s>  # every subagent, not only the pass
  ```

  Per agent it also prints the **worst wait**: the longest stretch during which that agent had
  handed back and nothing came for it. At the 2026-08-25 gate that column read **33.5 minutes**
  against 0.0 / 0.0 / 0.2 for the others — one scenario left standing while its siblings were
  collected in seconds, and 31 of the requester's 74 minutes.

- **`host/app-lifecycle.mjs`** — restore a snapshot, launch the app on ports and a database of
  your own, stop what you started. `restoreSnapshot` checkpoints the WAL, uses `.backup` rather
  than `cp`, and **reads the copy back** before handing it over — the read-back is what protects,
  because the `cp` failure of 2026-08-24 turned out not to be universal. `launchApp` refuses the
  project's defaults, throws naming a port that is taken, and starts **no file watcher**.
  `stopApp` walks the port's holders (the listener is usually an `npx` grandchild), spares and
  **reports** anything it cannot prove is its own, and throws unless the ports end up free.

- **`host/cdp.mjs`** — a private Chrome and one CDP session kept alive, spoken over node 22's
  global `WebSocket`. No `puppeteer-core`, no install: the library is usable by being checked out.

- **`host/theme-pass.mjs`** — the theme pass behind one call. Walks the nine screens
  `../theme-pass.md` declares, in both themes, and returns eighteen raw readings. It **throws**
  when the theme it measured is not the theme it asked for — emulation has failed in both
  directions across four runs, and an assertion inside the audited script is the only thing that
  ever caught it. Eighteen audits in ~15.6 seconds, measured 2026-08-27.

- **`host/navigate.mjs` + `page/app-driver.js`** — the gestures every scenario repeats. Navigation
  happens **in the page**, never at the driver level; every injected script carries a
  `location.port` guard, and building one without a port is an error. `setField` puts a value in
  through the native setter and **reads it back**, throwing if it did not take — before anything is
  submitted.

- **`page/theme-audit.js`** — the measurable half of the theme pass (see `../theme-pass.md`),
  unchanged: it is the page half, and `host/theme-pass.mjs` is what was missing around it.

- **`test-fixtures/`** — a real pass, truncated: the 2026-08-25 gate, with every field the ledger
  does not read stripped out. `rebuild-fixture.mjs` says what was kept and why.
