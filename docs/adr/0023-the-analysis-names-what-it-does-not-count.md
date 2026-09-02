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
