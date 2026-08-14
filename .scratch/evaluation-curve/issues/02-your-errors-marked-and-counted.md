Status: ready-for-agent

## Parent

`.scratch/evaluation-curve/PRD.md` (US-14 — `BACKLOG.md`).

Implemented on the business-story integration branch `integration/US-14-evaluation-graph` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

The Player's own flawed `Move`s, **placed where they happened** on the `Evaluation curve` and
**totalled in text** beside it. The count answers "how many, and how bad"; the markers answer
"when" — and it is the "when" that justifies a time axis at all.

- **Markers on the curve**, one per flawed `Move`, at that `Move`'s point. Each carries its
  **glyph** — `?!` (`Inaccuracy`), `?` (`Mistake`), `??` (`Blunder`) — **not** a coloured dot: the
  glyphs are already the vocabulary on screen in the move list, and severity is then told apart by
  **shape**, not hue, which is the rule this project has held since US-3 and the only one that
  survives having no stylesheet. The existing per-severity tint may reinforce, never carry alone.
- **A count in text** beside the curve, broken down by severity, derived client-side from the
  annotations already loaded — a display aggregate, no extra call, in line with ADR-0009 (everything
  derived at read time). Being real text, it is the one thing this slice adds that a screen reader
  can read; the curve itself stays `aria-hidden` (slice 01).
- **The Player's own `Move`s only.** The server-side derivation leaves severity **unset on every
  opponent `Move`**, because `CONTEXT.md` makes that a domain decision ("this tool is about the
  player's own improvement"), not an omission. The reference illustration's two W/B columns are
  therefore out of reach without new server-side value, which this US does not produce.
- **Consequence to carry in the wording, not to hide**: the curve shows both sides (an `Evaluation`
  is a fact about the Position), while markers show only the Player. So the count must be labelled
  as **the Player's own** errors — otherwise a visible drop with no marker on it, caused by an
  opponent `Move`, reads as a bug.

No server change, no schema change, no new endpoint, no new computed value.

## Acceptance criteria

- [ ] Every flawed `Move` of the Player carries a marker at its own point on the curve
- [ ] The marker carries the severity glyph (`?!` / `?` / `??`), the same glyphs the move list uses
- [ ] Severity is distinguishable without relying on colour (shape/glyph carries it; tint may only reinforce)
- [ ] A marker's half-move position matches the `Move` the move list shows that glyph against
- [ ] No marker is ever placed on an opponent `Move`, including one that dropped the winning chances sharply
- [ ] No marker on ply 0 (the starting Position follows no `Move`)
- [ ] A count by severity is shown beside the curve as real text (not inside the `aria-hidden` graph)
- [ ] The count is explicitly labelled as the Player's **own** errors
- [ ] The count matches the number of glyphs of each severity in the move list, for the same Game
- [ ] A Game where the Player made no flawed `Move` shows a count of zero rather than an absent or broken readout
- [ ] The count is derived client-side from the annotations already loaded — no additional network call
- [ ] The derivation of markers and counts is covered by unit tests without a DOM, including: opponent `Move`s excluded, ply 0 excluded, each severity counted under its own name, a Game with no flaw
- [ ] Markers and count disappear with the curve when annotations are absent (toggle off, or Game not analyzed)
- [ ] No new live region and no new announcement on the Analyse page
- [ ] The move list glyphs, the flawed-square tint and the current-move readout are unchanged
- [ ] No server change, no schema change

### Feature Path (FP)

1. The Player opens an analysed Game containing at least one flawed `Move` → a marker bearing its glyph (`?!` / `?` / `??`) sits on the curve.
2. The Player compares that marker with the move list → it sits at the same half-move as the matching glyph, and the severities agree.
3. The Player reads the count beside the curve → it reports their errors by severity, labelled as their own, and the totals agree with the glyphs visible in the move list.
4. The Player finds a drop in the curve caused by an **opponent** `Move` → no marker sits there, and nothing in the count's wording ever claimed to cover the opponent.
5. The Player unchecks "Afficher les annotations" → markers and count disappear along with the curve.

Verify: UI first, comparing the curve against the move list of the same Game (the move list is the reference — it already carries the per-`Move` severity). Use the seeded fixture that inserts Games already marked analysed **with** their `evaluations` — no import, no engine run.

## Blocked by

- `.scratch/evaluation-curve/issues/01-evaluation-curve-beside-the-board.md` — there is no curve to place markers on until it exists.
