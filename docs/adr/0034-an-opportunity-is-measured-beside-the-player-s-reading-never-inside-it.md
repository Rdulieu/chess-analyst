# An `Opportunity` is measured beside the Player's reading, never inside it

Without this, a competent agent asked to "judge the opponent's Moves too" would fill the existing
`severity` field for the opponent's plies — by far the cheapest change, three lines in
`moveSeverities` — and neither the compiler, the tests, nor a reading of the code would stop them.
Every consumer of that field would then silently change subject: `Danger position` is defined as a
property of a Position *as this Player meets it* and counts `Mistake`-or-worse, so the opponent's
gifts would start filling the Player's dangerous positions; the error tally beside the board would
count the opponent's faults among "vos erreurs"; the weak-opening rate and the Game recap would
follow.

**The measurement is the same; the subject is not.** An opponent's flaw is computed with the very
same band (`classifyMove`, 5 / 20 / 30 — one threshold, always) and in the same pass, but it lands
in a **field of its own**, and every existing figure keeps reading the Player's. Adding the
opponent reading is **opt-in** for each screen, by construction rather than by discipline.

The same rule holds one altitude up: the Player's verdicts on the opponent's Moves get **their own
figure** in the `Confrontation`, and are never folded into "Ce que j'ai vu juste". Judging one's own
play and spotting what the opponent offers are **two different abilities**, and their disagreement
is the diagnosis worth having — strong on oneself and weak on the opponent describes a player
absorbed in their own plan. Fused into one rate, that reading disappears; it is the same argument
that keeps coverage and accuracy apart, and that gave the `Key moment` a figure of its own.

**And the same rule again, one layer down, where it costs the most to get wrong.** The count of
`Opportunity`s lives in the Game's **recap** — the engine-side record — and not only in the
`Confrontation`: an `Opportunity` exists whether or not the Player ever read the Game, exactly like
`flaggedLoss`. The difference is not academic on the requester's base: **77 Games are analysed and
3 readings are sealed**, so putting it in the `Confrontation` alone would let the future aggregate
see opportunities on three Games instead of seventy-seven. It is also what ADR-0017 already asks
for — the aggregate is the fold of the **per-Game** records — and ADR-0019 keeps the `Confrontation`
a **join** that reads those records rather than re-deriving them.

The recap says what a Game contributes about **the Player**, so this is a **named block beside the
Player's counts and never mixed into them** — the same "beside, never inside" the field-level
decision above makes. A count of opponent flaws added to `countedErrors` would be the exact
contamination this ADR exists to prevent.

Measured on the requester's base at the grill of 2026-09-14, on the three sealed readings: **19
opponent faults exist** under the current band, **8 of them (42%) were never looked at**, and **40%
of all sealed marks already sit on opponent plies** — 38 of 95. The Player is already doing this
work by hand; what the app does with it is what this decision settles.
