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
