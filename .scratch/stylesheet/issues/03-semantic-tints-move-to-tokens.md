# 03 — The semantic tints move to tokens, non-chromatic cues intact

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

Every colour that carries meaning stops being a hard-coded value in a component and becomes a token.
This is the slice with the real risk: these tints are the app's only accessibility-bearing colours,
and US-3 already produced a finding when a highlight turned out invisible for want of CSS. The
precedent must not be replayed in reverse.

The tints to migrate: the three severities (shown on the move list, on the board square of the
faulty move, and on the evaluation curve's markers), the weak-opening and danger row highlight, the
import-failure emphasis, the analysed badge, and the Player's emphasis in the Game header.

Two rules govern the migration.

**One source per tint.** The severity module keeps being the single source US-14 established, but it
now holds **token names** rather than hex values, so the move list, the board square and the curve
markers cannot drift apart. This is precisely why the tokens are custom properties: the severity
tint reaches the board through the third-party board component's square-styles prop, which takes a
style object and cannot be reached by a class, so a compile-time variable would force the hex to be
redeclared in TypeScript.

**A severity tint laid on a board square belongs to the constant family.** This was found by
measuring the pilot: with the tint following the theme, the highlighted square rendered its piece at
1.49:1 in dark, because the piece painted on top of it keeps its ink in both themes. The board
therefore consumes a dedicated constant variant of the severities, distinct from the chrome's tints.
The dividing line is not the meaning of the colour but **what is painted over it**.

The arrow colours on the explorer stay computed in TypeScript: hue encodes win rate and alpha encodes
frequency, one value per data point, which no token can express. They are not part of this migration.

Every non-chromatic cue survives unchanged and remains the primary signal: the severity glyphs
(`?!` / `?` / `??`), the "à revoir ⚠" marker, the analysed badge's checkmark and word, the import
failure stated in words, and the Player marked in words in the Game header.

## Acceptance criteria

- [ ] No component holds a hard-coded colour for a meaning-bearing highlight; each reads a token.
- [ ] The three severities have exactly one source of truth for the chrome, consumed identically by
      the move list and the curve markers.
- [ ] The board consumes the constant severity variant, not the theme-varying one.
- [ ] Each semantic tint pairs with its own ink token; no tint's contrast depends on inherited ink.
- [ ] In both themes, every semantic tint reaches at least 4.5:1 against the text it carries.
- [ ] In both themes, the piece standing on a highlighted board square stays legible: measured on
      `max(fill, stroke)` against the square, at least 3:1 — the board is non-text content.
- [ ] Severity is distinguished by its glyph; tint only ever reinforces it.
- [ ] The weak-opening and danger rows keep their "à revoir ⚠" marker beside the tint.
- [ ] The analysed badge keeps its checkmark, its word and its border.
- [ ] The import failure remains stated in words, not by colour alone.
- [ ] The Player is still marked in words in the Game header.
- [ ] Player and board colours remain identical between themes.
- [ ] The token-consistency test still passes, now covering the tints consumed from TypeScript.
- [ ] Component tests assert token names rather than literal colours.
- [ ] Build and the full test suite are green.

### Feature Path (FP)

1. Open an analysed Game → each faulty move in the move list carries its glyph (`?!`, `?`, `??`), and
   the glyph is what tells the severity apart; the tint only reinforces it.
2. Step to a faulty move → the destination square is highlighted, and **the piece standing on it stays
   clearly legible**.
3. Look at the evaluation curve → each marker sits on the curve carrying its glyph, matching the
   severity the move list gives for the same move; the error tally beside it agrees with the markers.
4. Open the Weak opening screen → a row under 50% is highlighted **and** carries its "à revoir ⚠"
   marker; a row at or above 50% has neither.
5. Open the Danger positions screen → a seriously dangerous entry is highlighted with its marker
   alongside.
6. On the Games screen → an analysed Game's badge still shows its checkmark and its word inside its
   border.
7. Switch the system preference to dark and walk steps 1 to 6 again → every tint remains legible
   against the text it carries, every glyph and marker is still there, the highlighted square's piece
   is still legible, and **White's and Black's shares of the winning-chances bar and of the curve look
   exactly as they did in the light theme**.

Verify: UI first, reading computed styles to measure contrast in both themes. The severity values
come from stored `Evaluation`s; a seeded database is enough — no engine run is needed.

## Blocked by

- `02-tokens-and-the-app-chrome`
