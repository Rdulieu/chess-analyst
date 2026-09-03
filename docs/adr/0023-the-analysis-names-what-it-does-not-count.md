# The analysis names what it does not count

Aligned against chess.com's report on the **same** Game (Game 51, 22 Player Moves), our analysis
flags **1 Move where they flag 6** — and the three we miss are all played where the Player's winning
chances sit between 18% and 6%. The one Move both systems flag is the only one played in a Position
still contested. That is not a coincidence, it is **the shape of the difference**: our analysis is
fine while the Game is alive and blind once it is decided. So the decision is that a Move in that
zone is **named without being counted** — the `Counted Move` denominator does not move, `Drift` and
the recap are untouched, and ADR-0017's fold still sums exactly what it summed before, but the Player
sees a glyph and a reason on a Move the analysis holds them to for nothing.

The mechanism already exists and had never fired. US-15a's slice 04 built the case "**shown by the
Game, not held by the analysis**" — glyph displayed, Move outside the denominator, reason in words —
for the *forced* exclusion, and no Game had reached it (a forced Move is never flagged on our
corpus). It now has a second, far more common occupant.

**The cost is explicit and it goes against a position US-15a held**: this needs a predicate, so it
adds a threshold, where 15a had insisted on adding none. That cost is accepted because the
alternative is worse than it looks — a Move a human spots at a glance and the app does not mention is
very concretely what makes the method doubtable, and "I collapse when I am behind" is a real,
repeatable, workable weakness the tool would never be able to say.

## Considered options

- **Assume the metric and document the blind spot.** Cheapest and defensible: the metric measures
  what was at stake, and flagging on centipawns would produce eighteen reproaches on a Game already
  decided at Move 25. Rejected because the silence falls precisely where the Player can see the
  mistake unaided, which is where trust is lost.
- **Analyse both sides**, chess.com's contract. It answers the *attribution* blind spot — their
  opponent played at 96.1 with zero mistakes, and our app can never say so — which is the one that
  most threatens US-15d's verdict. Rejected **here**, not on cost: deriving the opponent's severities
  turns out to be free (`evaluations` holds one row per ply, both colours, so the engine has already
  searched those Positions). It is rejected because it changes what the tool is about, and that
  deserves its own decision. US-15a-bis measures it without displaying it, so US-15d inherits a
  figure instead of a worry.
- **Just lower the threshold.** Falsified by measurement, and this is the finding worth not
  re-discovering: `13...Kc7` costs **0.36 pawn** — 1.9 points of winning chances, below the
  inaccuracy floor of any scale, in chances **and** in centipawns — and chess.com flags it anyway,
  because after `13.Nxf7+ Kc7?` `14.Nxh8` takes the rook. The evaluation barely moves because they
  were already four pawns up, but **material changed hands**. Applying their reported thresholds to
  **our** evaluations, with no floor and no exclusions, yields **2** flagged Moves, not 6. So the
  predicate cannot be a winning-chances figure.

## Consequences

- **The exclusion reasons stay two.** `UncountedReason` keeps `forced` and `decided`; a Move in the
  dead zone is still excluded *as decided*, which is true of it. What is added is a **second axis**:
  why it is nonetheless shown — the **signal** that fired ("material changed hands", "mate went from
  7 to 1"). Naming a third reason instead would have grown a vocabulary ADR-0017 deliberately keeps
  short and forced US-15c to decide what to do with it. This also stays open: two discriminating
  signals fit this model without a new reason.
- **The signal shown is a mechanical fact, never our adjective.** Same discipline by which the
  glossary refuses "tactical error" and shows **the line** instead: "material changed hands" is
  checkable by the Player on the board.
- **The predicate is not chosen by this ADR.** It is what the review of the two corpora must produce,
  from signals computed on **every** Player Move — material swing, mate distance, raw centipawn drop,
  forced sequence, and the gap to the second line (`cp2`, a use of the MultiPV 2 that US-15a paid
  2.1x for). Choosing it on paper is exactly what this story exists not to do, and "none of the five
  separates" is a legitimate outcome that would send us back to assuming the blind spot — on data
  rather than on fatigue.

## Amendment, 2026-09-03 — the review is in, and no predicate is added

The review this ADR asked for ran on twenty Games and 744 Player Moves, against lichess's own reports
on ten of them (`.scratch/deepen-per-game-analysis/REVIEW.md`). **The decision above stands — a Move
in the dead zone is named without being counted — but the trigger is not a new predicate.** The
requester decided on 2026-09-03: **no predicate for now**, and the `Inaccuracy` band drops from 10
points to **5** (US-37, outside US-15a-bis).

**Why: the question this ADR asked turned out to be the smaller half of the problem.** Of the 43
Moves lichess flags and we miss, **39 were played in Positions we COUNT** — each costing 1,3 to 9,5
points, just under the published 10-point floor — and 35 of the 43 are `Inaccuracy` in lichess's own
vocabulary. The best-line test attributes **32 of the 43** to a **threshold**, not to engine strength:
our engine already recommends exactly the Move they call best, it simply refuses to call the played
Move a fault. So *"our analysis is fine while the Game is alive and blind once it is decided"* is
true but marginal on this material: the dead-zone blind spot is **4 Moves of 43**.

**And the band at 5 fires this ADR's own mechanism without a predicate.** At 10 the tie was
structural — a Position with under 10 % chances cannot drop 10 points, so **0 of the 81** dead-zone
Moves in the corpus could ever be flagged. At 5 that ceases to hold, and **two of the four** dead-zone
Moves lichess flags become flagged on their own (`587/59`, dropping 9,0 at **9,96 %** of chances;
`715/106`, dropping 5,5 at 5,8 %). They will therefore carry a glyph **and** their unchanged reason
through the case US-15a's slice 04 built and nobody had ever reached — which is exactly what this ADR
wanted, reached by a threshold rather than by a second axis.

What a predicate would still add is **three Moves across twenty Games** (`619/67`, `622/102`,
`709/150`), two of them confirmed by lichess and the third almost certainly the saturation noise
described below. That is a poor trade for a second axis in a vocabulary ADR-0017 keeps deliberately
short — hence the decision.

**What the review established about the five signals**, and this part is not reversible by taste:

- **Two of the five separate nothing at all**: mate distance and forced sequence fire on **none** of
  the 43 missed Moves. The gap to the second line fires on exactly **one** of them — which is *less*
  often than on the ordinary Moves nobody flags, hence the × 0,25 below. Saying "none" of all three
  would contradict that ratio, which needs a non-zero numerator.
- The **gap to the second line is anti-correlated** (× 0,25 — it fires *less* on missed Moves than on
  ordinary ones), and the mechanism is understood: a large gap marks a **forcing** Position, which is
  precisely where a human finds the move (27 % → 66 % of Moves played as the engine would, as the gap
  grows, with the median cost falling from 1,0 to 0,3). It measures **where an error would hurt**, not
  where one happened. In the dead zone it degenerates outright — mean 258 cp, max 5813 — because both
  scores are saturated evaluations of a decided Position. **The `cp2` bought at 2,1x in US-15a buys
  nothing for this question**; the `Best line` from the same MultiPV 2 remains essential, as it is
  what makes the threshold/engine attribution possible.
- The **raw centipawn drop** separates best (× 3,6, precision 35 %) but fires on **91 %** of the Moves
  the app already flags: it is largely severity in another unit, hence a poor second axis.
- **Material swing** is the only signal whose claim is a fact the Player can check. Restricted to
  the dead zone at a bar of one piece it reaches **3 of the 4** known cases, and it designates
  **7** Moves to do it — a precision of **43 %**. The reversal three reports had hidden is that
  same bar's score going from **3 of 3 to 3 of 7**: what changed is its *precision*, not its reach,
  and the two must not be read as one figure.

**Consequences of this amendment:**

- **`UncountedReason` still keeps its two values**, and no third was ever needed.
- **The second axis is not built.** If it ever is, the review's own conclusion is that it should be
  the **conjunction** `material ≥ 1` and `cpDrop ≥ 200` — which, **on the Metalyst corpus**,
  designated exactly the four known cases and nothing else, while designating one further Move on
  DudulSmash that no outside reference can judge — and that the *displayed* signal must stay the material fact, the centipawn
  half being only a filter.
- **The blind spot is documented rather than assumed**, which is the distinction this ADR insisted on:
  see `.scratch/deepen-per-game-analysis/BLIND-SPOT.md`. It is assumed **on data**, not on fatigue.
- **This amendment is falsifiable.** The four dead-zone cases rest on ten lichess reports, and lichess
  flags only 4 of 48 dead-zone Moves — the oracle is blind where it was asked. A chess.com report on
  Game 708, held in reserve, would test the predicate on the corpus that has no outside reference at
  all; if it flagged the two Moves material designates there and the conjunction misses, this decision
  should be revisited.
