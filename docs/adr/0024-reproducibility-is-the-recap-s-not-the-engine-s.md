# Reproducibility is the recap's, not the engine's

The same Game read twice came back at **60.6%** and **56.5%** of chances lost under the same
announced regime, which threatened the premise of ADR-0017: a recap that is not reproducible is not
auditable, and the aggregate is that recap summed. The cause is not in the derivation — `gameRecap`
is a **pure function** of the stored `Evaluation`s, so identical rows give an identical figure to the
bit. It is in the engine: `uci-driver.ts` sends `position fen` then `go depth` and **never sends
`ucinewgame` or `Clear Hash`**, so the transposition table persists for the life of the engine
process and a Position's evaluation depends on what was searched **before** it.

We decided to require nothing of the engine. The invariant the product asserts is that the figures
shown derive from the `Evaluation`s **in the database** — already true, already tested. ADR-0017
requires the Player to be able to check **how a figure was arrived at**, not that two passes coincide:
auditability is a property of the path, and that path is deterministic. It does not fall.

What replaces engine determinism, and what makes two runs comparable, is a **discipline**: retuning
happens on the **rows already stored**, never by re-analysing. The difference between two settings is
then never mixed with engine noise. ADR-0009 permits exactly this — the thresholds, the `Phase`
boundaries and the competitive floor are derived, so retuning them costs no engine time and no
migration.

## Considered options

- **Send `ucinewgame` before each Position.** Rejected: it buys a **partial** determinism — one that
  survives neither a Stockfish version bump, nor a change of depth, nor a change of MultiPV — and
  pays for it with a cold table on every search, when US-15a already accepted 2.1x for MultiPV 2.
  This rejection is the reason the ADR exists: the missing `ucinewgame` reads as an oversight, and
  "fixing" it costs speed for a guarantee that breaks at the next dependency update.

## Consequences

- **Two analyses of one Game may legitimately produce two recaps, and that is said rather than
  denied.** US-15c is unaffected: the aggregate sums **stored rows**, not fresh searches, so it is
  reproducible whether or not the engine is.
- **`Threads` is left unset (so 1).** Multi-threaded search would make the figures irreducibly
  non-deterministic; single-threaded, the only carry-over is the hash table. Raising `Threads` for
  speed is therefore a decision this ADR asks to be taken knowingly.
- **The 60.6 / 56.5 gap is still unverified** and may be a cross-reading of two reports produced on
  two different databases. The review re-measures it — analysing the same Game twice under the same
  regime and comparing recaps figure by figure — but the decision above does not depend on the
  answer.
