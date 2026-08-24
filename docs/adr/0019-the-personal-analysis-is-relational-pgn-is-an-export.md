# The Personal analysis is stored relationally; annotated PGN is an export

A `Personal analysis` (CONTEXT.md) — the Player's own `Declared severity` per Move, their `Note`s,
`Candidate line`s and `Key moment`s — is stored **relationally, keyed by `(game, ply)`: the same key
the engine's per-Move record already uses**. Annotated PGN is a **rendering** of it, written on
demand, never the stored form.

This is surprising on its face, because ADR-0004 chose `cm-chess` over `chess.js` *precisely* for its
tree history and native PGN annotations — "branching analysis lines are of real interest for this
project" — and PGN would carry almost all of this for free: NAGs `??` `?` `?!` `!` are four of our
five declared severities, comments and variations are native, and the file would be **exportable to
Lichess or ChessBase**, which is real worth for a datum nothing can rebuild (ADR-0015).

## Considered Options

**Annotated PGN as the stored form** — rejected on a cost this project has already measured. US-10b
took `/danger` from **3111 ms to 55 ms** by ceasing to replay PGNs on read. A PGN blob puts that cost
back, and not on one Game: the second half of this story aggregates the Player's readings across the
whole history to say where they read well and badly, which is the same shape of query `/danger` paid
for and then dropped. Worse, the confrontation itself wants to be a **join** against the engine's
per-Move record, which is relational and keyed by `(game, ply)`; against a blob it becomes a parse
plus a reconciliation.

**Relational, with PGN as an export** — chosen. The join is a join. ADR-0004's payoff is not lost, it
moves: `cm-chess` is what *writes* the export, and what holds the tree **in memory** while the Player
edits a `Candidate line` — which is the first thing in this codebase to actually use the capability
US-1 paid for. `history.ts` flattening the PGN into a linear ply list stays correct for replay; the
tree lives in the editor, not in the store.

## Consequences

- A `Candidate line` is stored **flat** — a line from a Position, mirroring `Best line`. Nested
  variations are not modelled: a variation inside a variation has nothing on the engine's side to
  face, and the symmetry with `Best line` is what makes the confrontation need no further apparatus.
- The export is **lossy in one direction and must say so**: `Key moment`, the seal and its provenance
  have no standard PGN encoding. They are ours, they go in headers or a comment convention, and no
  other tool will understand them.
- The migration is due in the same slice (ADR-0015), and every table is scoped by `Profile`
  (ADR-0014).
