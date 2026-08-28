# The declared verdict wears the severity glyph, extended to five

The move list shows the `Player`'s own verdict with the **severity glyph vocabulary** — `?!`, `?`,
`??` for the three values the engine also measures, extended with **`!` for `Good`** (chess
notation's own sign for a good move) and **`✓` for `Sound`**, deliberately from another family
because `Sound` is not a judgement of quality but a statement of examination: *I looked, I find
nothing to fault*. `✎` and `◆` keep their meaning for the `Note` and the `Key moment`.

**This reverses a decision of US-16a**, which is written in `MoveMarks.tsx` and said the opposite:
*"deliberately not the engine's severity glyph vocabulary — borrowing its marks would suggest a
measured verdict where there is only a declared one."* The reason it is reversed is that the
confusion it feared has no screen to happen on. The reading route renders `Board` without any
engine prop, and the Analyse page does not render the Player's marks at all: **no screen today
shows both vocabularies**, so the ambiguity was in the reasoning rather than in the interface.
Against that, the gain is concrete — `⚖` said only *a verdict exists here*, and the Player had to
open the Move to learn which; the glyph says **which**. That also turns the move list into the
overview of a reading that US-22 was opened for, without adding a block to a panel the same story
is trying to lighten.

The shared vocabulary is not a coincidence to be tolerated: `DECLARED_SEVERITY_LABEL` already
reuses the engine's words on purpose, *"because setting a declared verdict beside a measured one
is only meaningful on identical labels"* (CONTEXT.md). Sharing the glyphs finishes that thought.

## Consequences

- **Where both layers appear on one screen, identical glyphs are not enough.** That screen does
  not exist yet and it is the natural next step of `Confrontation` (US-16b), which exists precisely
  to hold three readings side by side **and never fold them**. So the rule travels with the
  decision: a view showing declared and measured together must tell them apart by something other
  than colour — a column, a heading, a bracket — and the FP that builds it owes that check. The
  cheap version of this mistake is a tint; the lesson is US-16a's own, where two pencils that
  accessible names told apart perfectly were indistinguishable to the eye at 16 px.
- **`Sound` keeps a glyph, and that is the point of extending rather than borrowing.** Reusing the
  engine's three alone would leave `Sound` and `Good` unmarked, and a Move judged `Sound` would
  again look exactly like a Move never examined — which CONTEXT.md forbids in as many words:
  *silence is not a value*, `null` means *not examined*, and nothing stands in for it.
- **Two glyphs are new and have to be learnt.** They are text, so ADR-0013 is satisfied the way it
  already is for the engine's; each keeps its own accessible name, as the three kinds do today.
