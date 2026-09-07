# 02 — The tokens and the app chrome, light and dark

Status: done

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

The app gets its stylesheet. This is the validated pilot made real: SCSS wired into the client, the
token set declared, the chrome styled, and the dark theme following the system preference.

Scope of the chrome: the header and its title, the navigation bar and its current-tab marker, the
bounded reading column and its wide variant, the base typography and vertical rhythm, buttons
(primary versus secondary, and the disabled state), form fields and fieldsets, the focus indicator,
and the card surface later slices reuse. Screen-specific layout is **not** in this slice.

The token set is frozen in ADR-0013 — take the values from there rather than re-deriving them. Three
families, and the rule that separates them is not negotiable:

- **theme roles** invert with the theme;
- **semantic tints** get a per-theme value *and their own ink token*, so their contrast never depends
  on inherited ink (they are declared here, consumed in slice 03);
- **player and board colours** never react to the theme at all, and gain a border to stay detachable
  from a dark ground.

`$` variables are only for what is structurally compile-time: values inside `@media`, maps that
generate rules, mixin arguments. Everything a theme or the TypeScript must reach is a custom property.

The current navigation tab is styled on the `aria-current="page"` the router already sets — weight
plus a bottom border — so the non-chromatic cue comes free and no class is needed.

Dark mode is a `@media (prefers-color-scheme: dark)` block that redefines tokens and nothing else. No
control, no state, no persistence. Rules are written once; a `[data-theme]` toggle must remain
graftable later without touching a single rule.

This slice also adds the **token-consistency test**: a repo-level check asserting that every custom
property consumed anywhere in the client is declared, in both themes. It is the mitigation ADR-0013
names for the compile error custom properties cost us.

The pilot at `.scratch/stylesheet/pilot-reference.html` is the visual reference. It is a mockup, not
code to port: its board is CSS and its curve a frozen SVG. It uses `[data-theme]` to show both themes
side by side; production uses the media query, with the same token names.

## Acceptance criteria

- [x] SCSS compiles through the existing build with no configuration beyond the one devDependency;
      the stylesheet is imported once from the client's entry point.
- [x] The token set of ADR-0013 is declared: theme roles, semantic tints with their ink, and the
      constant player/board family, plus the space, type, radius and reading-column scales.
- [x] No colour, spacing or type value is hard-coded outside the token declarations.
- [x] The header reads as the app's chrome, distinct from the content beneath it.
- [x] The navigation marks the current screen by weight **and** a border, not by colour alone.
- [x] Content sits in a bounded reading column, with a wide variant available for the dense screens.
- [x] Buttons distinguish primary from secondary and show a disabled state; every interactive element
      has a clearly visible focus indicator.
- [x] Form fields and fieldsets are consistently sized with their labels above them.
- [x] Figures use tabular numerals app-wide.
- [x] With the system preference set to dark, the whole app follows: no unresolved custom property,
      no element left with a light-theme background.
- [x] Text contrast is at least 4.5:1 (3:1 for large text) against the background actually rendered
      behind it, **in both themes**.
- [x] Player and board colours are byte-for-byte identical between the two themes.
- [x] The dark theme is expressed as a redefinition of tokens; no rule is duplicated per theme.
- [x] The token-consistency test exists, fails when a consumed custom property is undeclared in
      either theme, and passes on the delivered code.
- [x] Sizes are expressed in relative units; no designed breakpoint is introduced.
- [ ] Component tests that previously asserted a literal colour now assert the token name instead.
- [x] No markup restructuring: this slice adds style and classes only.
- [x] Build and the full test suite are green.

### Feature Path (FP)

1. Open the app → it is visibly styled rather than showing browser defaults: the header reads as
   chrome, content sits in a bounded column, and headings, body text and controls are clearly
   differentiated.
2. Look at the navigation → the screen the Player is on is marked by its weight and a border, so it
   remains identifiable without relying on the accent hue; move between screens → the marker follows.
3. Work the import form → labels sit above their fields, fields are consistently sized, and the
   primary action is visibly the primary one; a disabled control reads as disabled.
4. Navigate the app with the keyboard only → every element that takes focus shows it clearly.
5. Read any screen carrying figures → digits align in columns.
6. Switch the system preference to dark → the whole app follows immediately, every screen included; no
   element stays on a light background and no colour fails to resolve.
7. In the dark theme, re-read the same screens → all text remains comfortably legible, and the
   winning-chances bar's White and Black shares look exactly as they did in the light theme.
8. Narrow the window → the layout reflows and nothing overflows horizontally.

Verify: UI first, reading computed styles to confirm token resolution and contrast in both themes.
No backing-store probe — this slice touches no data.

## Blocked by

- `01-restructure-markup-to-the-skeleton`

## Findings from the Feature Path run (delivered)

FP 8/8 pass, no blocking finding. Every criterion above holds, with one carried and one deferred:

- **The criterion "component tests that asserted a literal colour now assert the token name" belongs
  to slice 03**, not here: this slice declares the tints and consumes none of them, and no component
  test changed. Recorded rather than silently ticked.
- **Blocking for `integration → develop`, to close in slice 03: 1.02:1 in dark on the tint-carrying
  rows.** The weak-opening `<tr>` (`/openings`) and the danger cards still carry the inline
  `background-color: #fbe0e0` — the *light* `--tint-review` — while their text now inherits `--ink`,
  which flips at night. Measured 1.02:1 (14.43:1 in light). The dark theme cannot ship while inline
  light tints remain.
- The constant family is declared but not yet consumed from TypeScript: the winning-chances bar
  paints `#eee`/`#333`, the board keeps react-chessboard's own square colours, and
  `EvaluationGraph`'s area is a hardcoded `#f5f5f5` (a near-white fill on a dark ground). Slice 03.
- `/analyse` overflows horizontally at 380px (`scrollWidth 608` vs `clientWidth 365`), from the
  analyse row's own pre-existing inline `flex` inside a `max-width: 820px` wrapper. Every other
  screen is clean at that width. The analyse row is styled in slice 05.
- The board's rank/file coordinate labels measure 2.29:1 in **both** themes — react-chessboard's
  defaults, pre-existing, and moving only once the board consumes the square tokens (slice 03).
- The disabled button's label composites to ~3.5:1 (`--ink-muted` at `opacity: .6`). WCAG exempts
  inactive controls, and the `not-allowed` cursor carries the state; dimming the background rather
  than the whole element would keep the label readable if we want it.
- Remaining non-token literals, all deliberate and none of them a colour: the 2px tab-marker border,
  the 2px focus offset, and the 2.25rem control height. ADR-0013 tokenises neither hairlines nor
  control height. The wide column was the fourth and *was* tokenised (`--measure-wide`).
- `.card` is declared and applied nowhere yet, per this slice's scope; slices 04/05 apply it.
