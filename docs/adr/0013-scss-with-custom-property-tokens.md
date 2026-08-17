# SCSS as the authoring language, custom properties as the tokens

Status: accepted

The app shipped ten user stories with **no stylesheet at all** — no `.css` file, no `<link>`, no
style dependency — so every visual decision taken so far lives in a `style={{…}}` attribute in JSX.
US-13 gives the app a stylesheet without a mockup to work from, which means the token set *is* the
visual reference: it has to be readable, versioned and diffable, because nothing else pins the
design down.

We write the styles in **SCSS** (one `sass` devDependency, compiled natively by Vite, nothing added
to the bundle) and express the **tokens as CSS custom properties on `:root`**, not as SCSS
`$variables`. `$variables` are kept for what is structurally compile-time: breakpoints inside
`@media`, maps we iterate to generate rules, mixin arguments.

## Considered options

- **Tailwind / a component library.** Both bring a ready-made design system, which is tempting
  precisely because we have no mockup. Rejected: Tailwind puts the visual decisions back into the
  JSX `className`, which is the thing this story exists to undo, and a component library would mean
  rewriting the markup of every screen — risking the behaviours and accessible names that the tests
  of US-1 through US-14 lock down. Neither leaves a reference we own.
- **CSS Modules.** Zero dependency too, but one file per component scatters the reference across
  fifteen files to solve a name-collision problem a fifteen-component app does not have.
- **SCSS `$variables` as the tokens.** Rejected for two reasons, both concrete here. First, dark
  mode is in scope: with `$variables` every consuming rule must be emitted twice, so the output CSS
  doubles, whereas custom properties make a theme a redefinition of a handful of tokens and leave
  the rules untouched. Second, and decisive — several colours are consumed from **TypeScript**, not
  from a selector: `SEVERITY_TINT` (`chess/severity.ts`) feeds `react-chessboard`'s `squareStyles`
  prop (`components/Board.tsx`), a third-party API that takes a style object and cannot be reached
  by a class; `EvaluationGraph` computes SVG attributes; `chess/arrows.ts` builds an `hsla` per data
  point. A `$variable` has vanished by the time that code runs, so the hex would have to be
  redeclared in TS — reintroducing the very duplication this story removes, and undoing the US-14
  extraction that made `SEVERITY_GLYPH`/`SEVERITY_TINT` a single source. `var(--tint-blunder)`
  crosses the boundary; `$blunder` does not.

## Consequences

- **Colour tokens come in three families, and the difference is a rule, not a convention.**
  *Theme roles* (`--ground`, `--ink`, `--border`, `--accent`) invert with the theme. *Semantic
  tints* (severities, the weak-opening / danger row, an import failure, the analysed pill) keep
  their meaning and get a per-theme value **plus their own ink token**, so their contrast never
  depends on inherited `--ink`. *Player and board colours* (White's share vs Black's in
  `WinningChancesBar` and `EvaluationGraph`, and the board's light/dark squares) **never react to
  the theme at all**: White's share is light because it is White, not because the theme is light.
  They gain a border instead, to stay detachable from a dark ground. A colour that says "White"
  does not say "background".
- **A severity tint laid on a board square belongs to the constant family, not to the semantic
  one.** Found by measuring the pilot: the highlighted square rendered its piece at 1.49:1 in the
  dark theme, because a theme-varying tint had been put under a piece whose ink is constant by
  nature. Severities therefore need a dedicated constant variant for the board
  (`--square-inaccuracy` / `--square-mistake` / `--square-blunder`), distinct from the chrome's
  `--tint-*`, which do follow the theme. The dividing line is not the meaning of the colour but
  **what is painted on top of it**.
- **Dark mode follows the system preference only** — a `@media (prefers-color-scheme: dark)` block
  redefining tokens. No control, no application state, no persistence, no server change. A
  `[data-theme]` toggle can be grafted later without touching a single rule.
- **We lose the compile error on token names.** A mistyped `$blunder` fails the build; a mistyped
  `var(--tnit-blunder)` falls back silently. Mitigations: token names typed in TS where TS consumes
  them, and/or a test asserting every consumed token is declared on `:root`.
- **Component tests run in jsdom, which never loads the stylesheet.** Assertions that today check a
  literal colour will see the unresolved `var(--tint-blunder)`. They must assert the token name —
  which is the more honest assertion anyway: it verifies the wiring, not a hue.
- Semantic highlights must survive the migration from inline to selectors, including their
  **non-chromatic cue** (the US-3 accessibility finding). Layout inline styles (`maxWidth`, `flex`,
  fixed heights in `Board.tsx`) are a separate family with no accessibility stake.
- **Contrast is a blocking, measured criterion, and it is measured differently on the board.** Text
  is held to 4.5:1 (3:1 when large) against the background actually rendered behind it, in **both**
  themes. The board is **non-text content** — `react-chessboard` draws SVG pieces — so it is held to
  the 3:1 graphics rule, and against **`max(fill, stroke)`** of the piece, not its fill alone: a
  white piece on a light square measures 1.24:1 on fill and 14.65:1 on stroke, and it is the stroke
  that carries legibility. Judged on fill alone the criterion would reject a perfectly legible
  board. Measured on the validated pilot, the worst case across every piece/square combination is
  4.81:1.

## The frozen token set

Validated on a throwaway pilot (`/` and `/analyse`, both themes) before any slice, precisely so the
one decision nobody can delegate — taste — was not sitting behind a merged slice. The pilot is kept
as the visual reference at `.scratch/stylesheet/pilot-reference.html`; it is a mockup, not code to
port (its board is CSS, its curve a frozen SVG).

| | light | dark |
|---|---|---|
| `--ground` | `#ffffff` | `#16181a` |
| `--ground-sunk` | `#f4f5f7` | `#1e2124` |
| `--ink` | `#14171a` | `#e6e8ea` |
| `--ink-muted` | `#5a6169` | `#a2a9b0` |
| `--border` | `#d7dbe0` | `#343b41` |
| `--accent` / `--accent-ink` | `#1f5c8c` / `#ffffff` | `#8cbde8` / `#10222f` |
| `--tint-review` + `-ink` | `#fbe0e0` / `#6e1414` | `#4a2020` / `#ffcaca` |
| `--tint-ok` + `-ink` | `#e8f5e9` / `#17501c` | `#1c3a20` / `#b7e7bd` |
| `--tint-fail` + `-ink` | `#fde8e6` / `#8a1b12` | `#4d1d18` / `#ffc3ba` |
| `--tint-inaccuracy` + `-ink` | `#fff3b0` / `#4a3c00` | `#4a4218` / `#ffec9e` |
| `--tint-mistake` + `-ink` | `#ffcc80` / `#4d2f00` | `#543417` / `#ffd7a8` |
| `--tint-blunder` + `-ink` | `#ff8a80` / `#5c0f08` | `#5a201c` / `#ffbcb5` |

Constant in both themes: `--white-share` `#ececec`, `--black-share` `#2f2f2f`, `--square-light`
`#e9e2cf`, `--square-dark` `#9a8467`, `--square-inaccuracy` `#f2e08a`, `--square-mistake` `#edb463`,
`--square-blunder` `#e8837a`, `--square-notation` `#241d13`, `--curve-equality` `#7e7e7e`,
`--curve-cursor` `#d45a25`.

The last three joined the family in the dense-screens slice, and none of them is a new idea — each
is the *same* rule applied where it had been skipped:

- `--square-light` / `--square-dark` were declared here from the start and consumed by nobody: the
  three boards still rendered `react-chessboard`'s own `#F0D9B5` / `#B58863`. They are consumed now
  (`chess/boardTheme.ts` → the `lightSquareStyle` / `darkSquareStyle` props), because a declared
  token nobody reads is a lie about the palette.
- `--square-notation` is **one** ink for both squares, where `react-chessboard` labels each square
  in the other square's colour — 2.29:1 with its defaults, 2.77:1 with ours, and a coordinate is
  *text* drawn on a board. One constant dark ink measures 12.89:1 on the light square and 4.66:1 on
  the dark one, so the labels clear the text threshold on either.
- `--curve-equality` / `--curve-cursor` are the `Evaluation curve`'s two marks, held to the **3:1
  non-text** rule against *both* player grounds at once — which is a luminance window of about
  0.19–0.23 and no eyeballed value lands in it: US-14's `#8a8a8a` and `#c05621` measured 2.92:1 and
  2.93:1 against the ground each happened to sit over. They are constant for the same reason the
  board's severity tints are: the dividing line is what is painted over them, and a ground that is
  light at one end of the picture and dark at the other admits no theme role.

None of the three reaches its mark as an SVG or HTML **attribute**: a custom property resolves in a
declaration and nowhere else, so `stroke="var(--curve-cursor)"` paints nothing. The curve's marks are
named in the markup (`data-mark`) and coloured in the sheet.

Scales: space `.25 / .5 / 1 / 1.5 / 2.5rem`; text `.8125 / 1 / 1.125 / 1.5rem`; radius `6px` and a
pill; reading column `72ch`, with a wide variant for `/danger` and `/analyse`; `system-ui` for prose
and a mono stack for evaluations, glyphs and SAN; `tabular-nums` app-wide.
