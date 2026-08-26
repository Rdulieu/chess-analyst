# The driver library drives; the scenario judges

The agentic suite gets a **driver library** in the repo — launch the app, restore a snapshot, select
a `Profile`, navigate, run the theme pass, read a field back — because measurement showed that
**writing those scripts, run after run, is a third of what the suite costs**. The library contains
**no assertion about the application**: it drives, measures and returns raw values, and it is named
only in `.claude/skills/agentic-tests/SKILL.md` — **never in a scenario**, which stays
tech-agnostic and keeps judging.

The measurement is the reason this ADR exists rather than a README paragraph. Subagent transcripts
are timestamped per message, so a Happy Path run can be costed after the fact without replaying it.
Over the runs of **2026-08-24** (28 min of real work) and **2026-08-25** (43 min), the split is
stable: **tool round-trips 39-48 %, composing driver scripts 32-39 %, the agent's own analysis
17-19 %, writing the report 2-3 %**. A library attacks the first two at once — fewer and larger
calls, nothing left to invent — and leaves the third untouched. That ordering matters: **analysis is
the smallest of the three and the only one that produces findings**. A suite whose analysis is
compressed stays green and stops looking.

## Considered Options

**Scenarios call the helpers directly** — rejected. It is faster to write, more deterministic, and it
would shorten the runs further. It also destroys the property that has kept this suite alive: the
four journey scenarios carry **no launch command at all**, and that is why they survived a complete
change of pilot — the shared devtools browser was abandoned for a private Chrome driven by
`puppeteer-core` through shell calls after the page theft of 2026-08-23, and **not one scenario line
changed**. A scenario that calls helpers is a script coupled to a pilot; it removes the agent, and
with the agent goes the analysis, and with the analysis go the findings. The apex of the pyramid is
an agent reading a journey written in domain terms, not a test runner with extra steps.

**Assertions inside the library** — rejected, and this is the failure mode to fear rather than the
slow suite. The library sits **under** the only safety net the project has. An assertion moved into
it can weaken silently: the suite still reports green, asserting less every run, and nothing else is
watching. So the line is drawn at what is being asserted, not at where the code lives: **the library
asserts postconditions about the mechanism** — the server answered, the screen rendered, the field
read back the value that was set, the measured theme is the requested one — and **throws** when they
fail. What the application *says* is asserted by the scenario, read and judged by the agent.

That frontier is not arbitrary: it absorbs precisely the class of defect that has already produced
**false findings**. Two "defects" in the 2026-08-13 run were the driver's fault — a control counter
that also counted candidate buttons, a row parser fooled by `textContent` concatenating columns with
no separator — and React-controlled month fields silently keep their default value when filled by a
high-level helper, which once nearly imported the wrong months. Each agent rediscovers these, every
run. Fixed once, in the mechanics, they stop being findings.

## Consequences

- **Failing loudly is the only acceptable failure mode.** A silently wrong library is more dangerous
  than 95 throwaway scripts that are wrong, because it is reused and it inspires confidence. Helpers
  throw; they never degrade into a thinner green.
- **Only the pure parts are unit-tested** — URL building, parsing, the run-ledger's bucketing.
  Pretending to unit-test "launch the app" would manufacture the false confidence this ADR is written
  against. The real validation of each slice is a **real Feature Path** run with the library, which
  costs ~12-15 min rather than a full suite.
- **The concurrency cap stays at `min(3, floor(nproc / 4))`** (2 on this host). US-20, which might
  have made raising it safe, was abandoned: it treated dead processes while the freeze comes from the
  load of live ones. So this story's gains must come from the suite's content, never from parallelism.
- **The suite's inventory of what not to trim gains an entry: the agent's analysis.** Depth, the real
  chess.com contract, the Lichess span, the second `Profile`, a clean start per scenario and the full
  theme pass were already on it (`docs/test-scenarios/README.md`).
