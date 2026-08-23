# The verdict is a fold over per-Game records

US-15 exists to tell the Player what to work on. Its product is therefore **advice**, and advice is
worth exactly what the Player's ability to check it is worth. The requirement that shapes the whole
epic is that the methodology be **evaluable**: the Player must be able to look at one of their own
Games and see how the global figures were arrived at.

So the global verdict is **not** computed by its own query over the corpus. A **Game carries
everything the aggregate consumes** — for each of the Player's Moves: the winning-chances delta, the
severity, the `Best line` and the refutation, the `Phase`, and whether it is a `Counted Move`
together with **which reason excluded it** when it is not — plus a per-Game recap (Moves counted,
errors counted, chances lost, `Drift`). The aggregate is **that recap summed**. Reconciliation is not
a test we hope passes; it is the definition.

Without this, the failure is specific and fatal to the product. A Game where the Player played four
`Blunder`s can legitimately contribute **zero** counted errors — all four came after the Game was
already lost, where `winningChances` had nothing left to lose. A page showing "4 blunders" beside an
aggregate that counted none of them destroys the Player's trust precisely at the point where the
discrepancy is the thing needing explanation. The exclusion reasons exist so that gap is *readable*
instead of looking like a bug.

This is the same discipline US-14 was accepted under one level up: the `Evaluation curve` was allowed
only on condition that it carry exactly the same information as the advantage bar and the per-Move
figures, with **no possible divergence between the three views**. Here the two views are the Game and
the corpus.

Two corollaries follow, and both are decisions rather than consequences:

- **The data and its presentation are two distinct constraints.** What a Game carries is settled
  without regard to layout. The Analyse page is already the densest screen in the app (board, move
  list, advantage bar, `Evaluation curve`), and splitting the record across panels or routes is a
  legitimate answer — but the UI **never** amputates the model to fit itself.
- **Therefore the per-Game view is built first**, before the aggregate that motivates it. A future
  reader will find this backwards: US-15a ships an auditable per-Game view and tells the Player
  *nothing* about their weaknesses. That cost is deliberate. The point of 15a is not "I know what to
  work on", it is "I can now judge whether to believe what comes next".

## Considered options

- **A purpose-built aggregate query, plus an explanatory per-Game view.** Simpler and faster, and the
  usual shape. Rejected: two implementations of one method agree only by luck, and they diverge
  silently — the reader has no way to tell which is wrong. It also gives the Player an *illustration*
  of the method rather than the method itself.
- **Aggregate first, auditability later.** Rejected as the more expensive order: retrofitting
  reconciliation means rewriting both sides, and the exclusion reasons — the part that is hardest to
  reconstruct after the fact — would have to be invented backwards from an aggregate that never
  needed them.
- **Persist the per-Move records.** Rejected: they are derived from stored `Evaluation`s and staying
  derived is what keeps the thresholds, the `Phase` boundaries and the competitive floor **retunable
  with no engine re-run** (ADR-0009). We fully expect to retune the `Phase` boundaries after looking
  at real Games; that must not cost a migration.

## Consequences

- **`Drift` must be a residual, not an object.** Defined as "everything lost that no flagged Move
  accounts for", the two parts add to the total by construction, so a Game's figures sum without
  double-counting. The rejected alternative — drift as *spans* over several Moves — would have
  counted a flagged Move's loss twice (once as an error, once inside its span), breaking the
  reconciliation this ADR is about, and its boundaries would have needed thresholds the Player cannot
  see — auditability defeated by the very object meant to serve it.
- **Exclusion thresholds must be anchored to already-published numbers, not invented.** A Move is
  excluded as *decided* when the Player's winning chances before it are under the `Inaccuracy` floor
  (10%, `CONTEXT.md`), because the largest possible drop is then smaller than the smallest thing we
  flag. Deliberately **asymmetric**: a symmetric band around equality would also exclude Moves played
  while winning, deleting *failure to convert a won position* — a real and common weakness — from the
  tool's vocabulary. *Forced* means **one legal move**, which needs no engine.
- **No error-nature label ships before it can be validated.** "Tactical error" / "positional error"
  is an inference of ours, not engine output, and the cheap criteria for it are wrong often enough to
  matter — which is the same objection that ruled out having a language model name motifs. Until a
  motif is a named predicate checkable against real Games, the explanation shown is **the line**, not
  our adjective. The cost is accepted and explicit: the tool cannot say "38% of your errors are
  tactical", because nothing countable underlies that sentence yet.
- Aggregation over a corpus of summed recaps is more work than a single SQL pass, and at ~650 Games
  it will need the same measurement ADR-0012 applied to `/danger`. Being a fold, it is at least
  incremental by nature.
