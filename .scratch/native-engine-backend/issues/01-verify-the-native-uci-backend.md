Status: ready-for-human — the **first step needs a human**: no UCI engine binary is available in
this environment (`which stockfish` → nothing), and installing one is an environment change an
AFK agent should not make on its own. Everything after "a binary exists on this machine" is
agent-ready and is spelled out below. Re-triage to `ready-for-agent` once a binary is provisioned,
or once it is agreed that an agent may install one.

## Parent

Standalone technical issue — no PRD. It comes out of **ADR-0008** (engine behind an `Engine`
interface: WASM by default, native opt-in via `STOCKFISH_PATH`, fake in tests) and from a finding
left open since **US-4** and re-raised at every HP run since.

Branch from up-to-date `develop`.

## The problem

The native backend has been **wired since US-4 and never verified on its nominal path**. What has
been verified is only how it *fails*: US-8 issue 03 proved that a broken binary no longer takes the
server down at startup and surfaces as a `failed` `Analysis pass` instead. Nobody has ever observed
it **evaluate a Position correctly**.

That leaves two distinct problems, and the second is the one that keeps costing time:

1. **A backend nobody has run is not a backend.** `createEngine` will select it for any Player who
   sets `STOCKFISH_PATH`, and we have no evidence beyond the code that the UCI dialogue, the depth
   handling, the mate scores or the side-relative sign convention behave as the WASM backend does.
2. **The HP suite is slow largely because of the engine.** The 2026-08-13 run spent ~10 of its
   25 minutes on one WASM pass (78 Positions at depth 16). A native binary is substantially faster
   at the same depth, but the suite cannot lean on it while it is unverified — that would validate
   the app with an unvalidated component. Verifying it is therefore the only lever that genuinely
   shrinks the dominant cost, and it closes the finding at the same time.

## What to do

1. **Provision a UCI engine binary** (human step). Any UCI-speaking engine works in principle;
   Stockfish is the reference. Record how it was obtained and its version.
2. **Run the nominal path**: start the server with `STOCKFISH_PATH` pointing at it and run a real
   `Analysis pass` over at least one imported Game.
3. **Compare the two backends on the same Games.** This is the substance of the issue — the point
   is not "it produced numbers" but "it produces the *same* numbers". Analyze the same Games with
   the WASM backend and with the native one and compare the stored `Evaluation`s. Expect exact
   agreement at a fixed depth from the same engine family; **any systematic divergence is the
   finding**, especially a sign flip (Evaluations are stored side-to-move-relative — CONTEXT.md)
   or a difference in how mate scores are represented.
4. **Check the derived layers, not just the raw values**: the `Inaccuracy`/`Mistake`/`Blunder`
   severities and the `Danger position` proportions must come out the same, since they are derived
   from the Evaluations (ADR-0009).
5. **Measure both**, on the same Game, and record the numbers — that measurement is the input to
   deciding whether the HP suite may use the native backend.
6. **Automate what can be**: today the native path has no test that exercises success, only its
   failure modes. At minimum, a test that skips cleanly when no binary is present and runs the
   nominal dialogue when one is.
7. **Document it**: how to obtain a binary and set `STOCKFISH_PATH`, so the next person does not
   rediscover this.

## Acceptance criteria

- [ ] A real UCI binary has driven a complete `Analysis pass` through `STOCKFISH_PATH`.
- [ ] The Evaluations it stores are compared against the WASM backend's on the same Games, and the
      comparison is recorded — agreement, or a described divergence.
- [ ] The derived severities and `Danger position` proportions match across backends.
- [ ] Both backends' durations on the same Game are recorded.
- [ ] The nominal path has automated coverage that skips cleanly when no binary is available.
- [ ] The existing failure-mode behaviour (US-8 issue 03) still holds: a bad path or a dying binary
      surfaces as a `failed` pass and never takes the server down.
- [ ] Obtaining a binary and pointing the app at it is documented.
- [ ] A recommendation is written down on whether the HP suite may use the native backend, with the
      measured figures behind it.

## Notes

Do **not** make the HP suite depend on the native backend as part of this issue. Verification comes
first; changing the gate is a separate, deliberate decision informed by the measurements above.
