# What the Player acts on never moves; what explains it may

The reading route's side panel is rebuilt at every ply, and **every one of the 45 ply
transitions measured on 2026-08-27 displaced the step controls** — by 24 to 114 px, 194 px of
total swing at 1400 and 312 px below 900. So the rule is now explicit and it is about *order*,
not about height: **the controls the Player acts on come first in the panel and never move;
variable-height content — notices, readouts, tallies — lives below them.** Reserving a fixed
height was the obvious alternative and was rejected: it would have cost 194 to 312 px of empty
column exactly where the column is scarcest, and the one block whose height depends on its own
content (the sealed readout) has no knowable maximum to reserve.

This generalises US-14's principle rather than inventing one. US-14 already held that hiding
annotations must not move the Position the Player is reading — but it was held **above the
diagram, by document order**, and never applied from one ply to the next. One changes Move far
more often than one changes `Review mode`.

## Consequences

- **A notice that must warn *before* a click cannot sit above the control and vary.** The
  "opponent's Move" warning moves into the fieldset's `legend`, which is the pattern the code
  already used for the posterior layer, and for the same stated reason — a Player who has
  scrolled past a paragraph sees a control identical to the other case. Measured: all three
  legends render on one line at 1400, 900 and 380, so the fieldset's height never changes.
  Guard-rail: the warning is said **less often, never less clearly** — hiding it behind an icon
  or a tooltip is not an option this ADR permits.
- **After the seal, no verdict is counted at all** (`personal/confrontation.ts` filters
  `posterior` marks out), so the legend there needs no opponent clause. That is what keeps the
  combined wording — which *does* wrap to two lines below 900 px — from ever being needed.
- **Anything a future story adds to this panel inherits the rule.** A block that appears
  according to the ply goes below the controls, or it re-creates the defect. That was already
  written as a guard-rail for US-16b; it is now a decision rather than a note.
- **The rule is guarded, not merely stated.** `theme-pass.md` gains an assertion: walk the plies
  and require **zero pixels** of movement of the step controls and the verdict fieldset. US-14's
  principle was stated and never guarded, which is precisely how eighteen months later every
  transition moved something.
