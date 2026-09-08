# Lichess's division is stored as an oracle, never read as the Phase

Without this, a competent agent building US-32 would read `division` as the `Phase` wherever it is
present and derive it only where it is absent. That is the cheapest path, the column's very presence
invites it, and nothing in the repo would stop it — the types fit, the tests pass, and the code reads
as sensible. **The decision**: the two ply numbers Lichess answers are stored, and the `Phase` is
**always** derived by our own rules, for both `Platform`s alike. The stored values are an outside
oracle to test that derivation against, never an input to it.

**Why: chess.com exposes no equivalent, so the alternative is a `Phase` that answers differently
depending on where the Game was played** — the failure `CONTEXT.md` already refuses three times over
(games against the computer, aborted games, the `classical` category): two `Profile`s that stop being
comparable, silently. And it would be silent: nothing on screen distinguishes a Phase we derived from
one Lichess handed us.

They are captured now because the opportunity is now: the range export answers all **434** Lichess
Games in **one** request, while per-Game it would take 434 — and `/api/games/user` has answered ten
consecutive `429`s from this address, so a plan that needs hundreds of requests is a plan that does
not run.

## Consequences

- **Nothing reads these columns yet, by design.** They are written by the refresh and consumed by
  nobody until US-32 uses them to check its own derivation. A column with no reader is normally a
  smell; this one is a deliberate reservation, which is why it is written down rather than left to
  look like an oversight.
- **The glossary carries the warning where the confusion would happen** — see `Lichess division`,
  whose name states its source precisely so it cannot pass for ours.
