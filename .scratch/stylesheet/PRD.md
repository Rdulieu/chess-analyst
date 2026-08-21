# PRD — A stylesheet for chess-analyst (US-13)

Status: ready-for-agent

Business story: **US-13** — *Doter l'application d'une feuille de style, pour qu'elle soit
présentable — sans maquette en entrée.*
Integration branch: `integration/US-13-stylesheet`
Decision record: **ADR-0013** (SCSS as the authoring language, custom properties as the tokens)
Visual reference: `.scratch/stylesheet/pilot-reference.html` (validated pilot, both themes)
`CONTEXT.md`: **unchanged, deliberately** — a stylesheet introduces no domain term.

## Problem Statement

The app has shipped eleven user stories and still renders with the browser's default styles. There
is no `.css` file, no `<link>`, no style dependency. Every screen is a stack of bare lists and
headings on a white background: the Player cannot tell a heading from a row, a primary action from a
secondary one, or where one block ends and the next begins. Data that is tabular by nature (`/stats`)
reads as a bulleted list. The board sits in the top-left corner of an unbounded page.

Worse, the absence of a stylesheet has actively distorted the code. Nine components carry
`style={{…}}` attributes — not by aesthetic choice, but because **there was nowhere to put a
selector**. Some of those inline styles carry real meaning (a severity tint, a weak-opening row, an
import failure, the analysed badge) and were each doubled with a non-chromatic cue to stay
accessible; US-3 already produced an accessibility finding when a highlight turned out to be
invisible for want of any CSS. Others are pure layout (`maxWidth: 820`, `flex`, a fixed graph
height) that will fight any real layout the moment one exists.

And the Player who works at night gets a full-brightness white page, because a theme is impossible
without a stylesheet to hold it.

## Solution

The app gets a stylesheet, written in SCSS, whose tokens are CSS custom properties — a small,
readable, versioned set of names for colour, space, type and radius that every screen draws from.
Because there is **no mockup**, the reference that normally comes from a designer is produced up
front and in writing: the token set, a page skeleton every screen conforms to, and a validated
capture of two pilot screens.

The Player gets a page that reads: a bounded reading column, a header that looks like a header, a
navigation whose current tab is marked by weight and a border (not by colour alone), tabular data in
tables with right-aligned figures, lists that read as rows, cards for the danger diagrams, and a
board that sits in a deliberate layout beside its evaluation curve. Semantic highlights survive the
move from inline attributes to selectors — including their non-chromatic cue.

The Player who works at night gets a dark theme, following the operating-system preference, with no
control to find and nothing to configure. Colours that mean *White* or *Black* do not invert, because
they denote a player, not a background.

Nothing about the app's behaviour changes. No endpoint, no schema, no computed value.

## User Stories

1. As a Player, I want the app to have a visual identity rather than browser defaults, so that it
   looks like a tool I chose rather than an unfinished page.
2. As a Player, I want a bounded reading column, so that lines of text stay readable instead of
   stretching across a wide monitor.
3. As a Player, I want the two dense screens (`/danger`, `/analyse`) to be allowed more width than
   the reading column, so that diagrams and the evaluation curve are not needlessly cramped.
4. As a Player, I want a header that is visibly the app's header, so that I can tell chrome from
   content at a glance.
5. As a Player, I want the navigation to show which screen I am on, marked by weight and a border
   rather than by colour alone, so that I can orient myself even if I do not distinguish the accent
   hue.
6. As a Player, I want every screen to announce itself with a heading, so that I know where I landed
   — including "Mes parties", the only screen that has none today.
7. As a Player, I want my results in `/stats` laid out as a table with aligned figures, so that I can
   compare cadences and sides by scanning a column instead of parsing prose.
8. As a Player, I want the `Weak opening` table styled as a table, so that the count, the tally and
   the `Win rate` line up across rows.
9. As a Player, I want figures throughout the app to use tabular numerals, so that digits align in
   columns and rows are comparable.
10. As a Player, I want my Game list to read as rows with the checkbox, the description and the
    analysed badge in consistent columns, so that a list of eighty Games is scannable.
11. As a Player, I want the "analysée" badge to stay a bordered pill carrying both a checkmark and a
    word, so that I never depend on its tint to know a Game is analysed.
12. As a Player, I want the `Danger position` diagrams laid out as a grid of cards that reflows with
    the window, so that I can compare positions instead of scrolling one column.
13. As a Player, I want the import form's fields labelled above and consistently sized, with the
    primary action visibly primary, so that I can fill it without hunting.
14. As a Player, I want the Analyse screen to place the board beside the readout, the winning-chances
    bar, the evaluation curve and the move list, so that I read a Game in one view.
15. As a Player, I want hiding the annotations not to disturb the board I am reading, so that
    unchecking a box does not move the position under my eyes.
16. As a Player, I want the row on Analyse to fold into a single column when the window is narrow,
    so that nothing is clipped or hidden off-screen.
17. As a Player, I want the app never to scroll horizontally, so that I never lose content off the
    right edge.
18. As a Player working at night, I want the app to follow my system's dark preference, so that I do
    not get a full-brightness page in a dark room.
19. As a Player, I want no theme control to find or configure, so that the app simply matches my
    system and I have one less thing to manage.
20. As a Player, I want the dark theme to keep every semantic highlight readable, so that a
    `Blunder`, a weak opening or a failed import is as legible at night as by day.
21. As a Player, I want White's and Black's shares of the winning-chances bar and of the evaluation
    curve to keep their colours in both themes, so that the picture never lies about which side is
    which.
22. As a Player, I want the board's squares and pieces to look the same in both themes, so that a
    chessboard stays a chessboard.
23. As a Player, I want the mistake highlight on a board square to keep the piece on it legible in
    both themes, so that I can see what moved where.
24. As a Player, I want the severity glyphs (`?!`, `?`, `??`) to stay the primary signal, with tint
    only reinforcing them, so that severity is distinguished by shape and not by colour alone.
25. As a Player, I want the weak-opening and danger rows to keep their "à revoir ⚠" marker beside the
    tint, so that the warning survives regardless of how I perceive colour.
26. As a Player, I want focus to be clearly visible on every interactive element, so that I can use
    the app from the keyboard.
27. As a Player, I want text contrast to hold in both themes, so that nothing becomes unreadable
    when the theme changes.
28. As a Player using a screen reader, I want the restyling to leave every accessible name, role and
    reading order intact, so that a cosmetic change does not cost me a working app.
29. As a developer, I want the semantic tints to have exactly one definition shared by the move list,
    the board square and the curve markers, so that the three views cannot drift apart.
30. As a developer, I want the token set written down and versioned, so that the next screen is
    styled against a reference instead of by eye.
31. As a developer, I want a page skeleton every screen conforms to, so that consistency does not
    depend on me remembering what I did last time.
32. As a developer, I want the markup restructuring to happen in its own change with no styling in
    it, so that a failing test afterwards can only be the style.
33. As a developer, I want a check that every consumed token is declared in both themes, so that a
    mistyped custom property is caught without opening a browser.
34. As a developer, I want the layout inline styles gone from the components, so that the layout is
    changed in one place rather than in nine.
35. As a developer, I want the dark theme to be a redefinition of tokens and not a duplication of
    rules, so that adding a rule does not mean writing it twice.
36. As a developer, I want a `[data-theme]` toggle to remain graftable later without touching a
    single rule, so that a future preference control is a small change.

## Implementation Decisions

### The style stack (ADR-0013)

- **SCSS** as the authoring language: one `sass` (or `sass-embedded`) devDependency, compiled
  natively by Vite with no configuration, nothing added to the bundle. `$variables` are reserved for
  what is structurally compile-time — breakpoints inside `@media`, maps that generate rules, mixin
  arguments.
- **Tokens are CSS custom properties on `:root`**, not `$variables`. The decisive reason is local:
  several colours are consumed from TypeScript, not from a selector. The shared severity module
  feeds `react-chessboard`'s square-styles prop, which takes a style object and cannot be reached by
  a class; the evaluation-graph component computes SVG attributes; the arrow module builds an
  `hsla` per data point. A `$variable` has vanished by the time that code runs.
- The severity module therefore stops holding hex values and holds **token names**
  (`var(--tint-blunder)`), keeping the single source that US-14 established.
- The arrow colours stay computed in TypeScript: hue encodes win rate and alpha encodes frequency,
  one value per data point, which no token can express.
- Styles live under a single styles directory in the client and are imported once from the app's
  entry point. Selectors lean on the already-semantic HTML first (`header`, `nav ul`, `main`,
  `button`, `table`); classes appear only where the element does not carry the intent.

### The three colour families, and the fourth rule the pilot forced

- *Theme roles* (`--ground`, `--ground-sunk`, `--ink`, `--ink-muted`, `--border`, `--accent`,
  `--accent-ink`) invert with the theme.
- *Semantic tints* (`--tint-review`, `--tint-ok`, `--tint-fail`, `--tint-inaccuracy`,
  `--tint-mistake`, `--tint-blunder`) keep their meaning, get a per-theme value **and carry their own
  ink token**, so contrast never depends on inherited `--ink`.
- *Player and board colours* (`--white-share`, `--black-share`, `--square-light`, `--square-dark`)
  **never react to the theme**. They gain a border to stay detachable from a dark ground.
- **A severity tint laid on a board square belongs to the constant family**
  (`--square-inaccuracy`, `--square-mistake`, `--square-blunder`), because the piece painted on top
  of it keeps its ink in both themes. Discovered by measuring the pilot, where the highlighted square
  rendered its piece at 1.49:1 in dark. The dividing line is not the meaning of the colour but what
  is painted over it.

The frozen values for all of the above are tabulated in ADR-0013.

### Dark mode

A `@media (prefers-color-scheme: dark)` block redefining tokens. **No control, no application state,
no persistence, no server change.** Rules are written once. A `[data-theme]` toggle can be grafted
later without touching a rule — which is why the pilot uses `[data-theme]` for side-by-side viewing
while production uses the media query, with identical token names.

### Responsive

Fluid, with **no designed breakpoint**: sizes in `ch`/`rem`, grids that reflow on their own
(`repeat(auto-fit, minmax(...))`), boards and images bounded in percentages. The page must not break
as the window narrows, but no alternative mobile layout is designed or tested. This is a way of
writing rather than extra work, and it is the only option that does not carve px into the code.

### Markup: free to change, but restructured in a silent slice first

Markup may be reorganised in service of the layout (the requester's call, against the narrower
"hooks only" scope initially recommended). The cost is explicit: the tests of the stats, danger,
explorer, game-list, board and analyse screens are directly exposed and stop acting as a safety net
during that work, and the HP suite drives the real UI and will need adapting then replaying — as in
US-10a.

The containment is the sequencing: **one slice restructures the markup of every screen with not a
single line of style**, and the tests are adapted there and nowhere else. Every later slice adds only
SCSS, so a red test from then on can only be the style.

### The page skeleton (the written target of the markup slice)

- **Chrome**: `header` with the app title and the navigation as a horizontal bar on `--ground-sunk`,
  aligned to the same column as the content. The current tab is styled on the `aria-current="page"`
  the router already sets — weight plus a bottom border, so the non-chromatic cue is free and no
  class is needed.
- **Reading column** bounded at `72ch`, centred, with a **wide variant** for `/danger` and
  `/analyse`.
- **One screen = one `section` with an accessible name and an `h2`.** Five screens already do this;
  the markup slice gives "Mes parties" the `section` and `h2` it lacks, aligning it rather than
  treating it as an exception.
- **Tabular data becomes a `table`**: `/openings` already is one and only needs styling.
  **`/stats` becomes a single table** whose Total, cadences and sides are row groups (the requester's
  amendment over three separate tables). Consequence to carry: the "Par cadence" / "Par côté"
  sub-headings stop being headings and the lists' accessible names migrate to group headers — and the
  stats page test queries exactly those labels.
- Figures right-aligned, `tabular-nums` app-wide.
- **What is a list stays a list**: the Game list remains a list, laid out as grid rows (checkbox,
  description, badge in consistent columns) rather than becoming a table; `/danger` becomes a card
  grid; the explorer's breadcrumb and candidate lists are untouched.
- **Analyse** keeps the row US-14 established — board on the left, readout, winning-chances bar,
  evaluation curve, error tally and move list on the right — with fluid bases replacing the fixed
  360/260/220 px. Unchecking the annotations must not collapse the row.
- **Cards** (`--ground`, `--border`, `--radius`) for the danger diagrams and the import summary.
- **Forms**: labels above their field, consistent field heights, the primary action visually
  distinguished from secondary ones.
- Blocks separated by **spacing, never by rules**.

### Board pieces

The pilot exposed a trap worth recording: mixing Unicode's filled and outlined chess glyphs produces
two drawing styles on one board. The real board is drawn by `react-chessboard`'s standard SVG pieces
and stays that way — this PRD does not introduce a piece set. Where the pilot needed pieces, it uses
one filled glyph set distinguished by ink and stroke.

### What does not change

No server change of any kind. No endpoint, no schema, no derived value, no new control, no new
message. Accessible names, roles and reading order are preserved except where the skeleton
deliberately adds a heading or converts a list of tabular data into a table — both of which are
carried by the markup slice and reflected in its tests.

## Testing Decisions

A good test here states what the Player can observe and nothing about how it is achieved. It asserts
that a token resolves, that contrast holds, that a role and an accessible name are still there, that
nothing overflows — never that a particular selector or a particular hex was used. A test that pins a
literal colour is a test that will be rewritten by the next palette tweak for no benefit.

Four seams, highest first. Confirmed with the requester.

### 1. Agentic (apex) — where nearly all the value lands

A subagent drives the running app through CDP and reads **computed styles**, which is the only place
a stylesheet is observable. Per slice, its Feature Path asserts:

- every consumed token **resolves** (no `var(--…)` left unresolved, no empty computed value);
- **text contrast** ≥ 4.5:1 (3:1 for large text) against the background actually rendered behind it,
  **in both themes**, with the dark preference emulated;
- the **board** — non-text content, since the pieces are third-party SVG — held to the 3:1 graphics
  rule and measured on **`max(fill, stroke)`** against its square, not on fill alone: on the
  validated pilot a white piece on a light square measures 1.24:1 on fill and 14.65:1 on stroke, and
  the stroke is what carries legibility. Worst case across every combination there: 4.81:1;
- **no horizontal overflow** at a narrow viewport;
- **non-chromatic cues still present** wherever a tint carries meaning;
- **player colours identical between themes** (White's share does not darken at night).

Prior art: the Feature Paths of US-10a and US-14, and the measurement script written against the
pilot during the grilling — reusable as FP tooling rather than rewritten per slice.

Contrast is a **blocking** criterion, not a report. The US-3 finding (a highlight invisible for want
of CSS) is the precedent not to replay in reverse.

**Taste is judged once, by the requester, on the pilot** — already done, before any slice. Later
slices are judged only on conformance to the skeleton and the tokens, which is what keeps this story
finishable and keeps sub-issue auto-merge possible.

### 2. Component tests (jsdom) — wiring and structure only

jsdom never loads the stylesheet, so these tests can assert **structure** (roles, accessible names,
reading order) and **the token name** placed on an element, never a rendered colour. Assertions that
today pin a literal colour must move to the token name — the more honest assertion anyway, since it
verifies the wiring rather than a hue.

This is where the silent markup slice does its work: it adapts these tests, and no later slice
touches them for structural reasons. Prior art: the existing board, stats, danger, explorer,
game-list and analyse component tests.

### 3. Token-consistency test (new seam, at repo level)

A test that reads the token file and asserts **every `var(--…)` consumed anywhere in the client is
declared, in both themes**. This is the mitigation ADR-0013 names for the compile error that custom
properties cost us, and the only place a token regression is caught without a browser. No prior art
in this repo; proposed at the highest available level (a repo consistency check, not a per-component
test).

### 4. Build

`tsc --noEmit` plus the Vite build compiles the SCSS and catches syntax errors. Existing seam, free.

### Happy Path suite

The cap of 3 HP holds — **no fourth HP**. The suite already carries the style-sensitive assertions
that must not regress: the weak-opening highlight, the arrows' opacity and hue, the evaluation curve
and its markers.

Two changes, both requested:

- **A theme pass on all three HP**: each gains a **final step** replaying, under an emulated dark
  preference, the screens it has already reached — no re-import, no re-analysis. The extra cost is
  rendering, not journey.
- **The suite must be revised so every screen is visited.** Today `/stats` is visited by no HP and
  `/danger` only as a drive-by, and a theme pass that never sees a screen proves nothing about it.
  Retained form: that final theme step **walks the navigation** across all six screens in both
  themes, reusing the state the journey already built, so the journeys themselves stay journeys of
  value rather than becoming coverage sweeps.

Because markup is free to change, the HP suite will also need **adapting before replaying** — budgeted
here rather than discovered at the `integration → develop` PR.

## Out of Scope

- **A theme toggle**, and any persistence of a theme choice. The system preference is the only input.
  A control is its own story (and would touch the settings that US-11 is about to reshape).
- **Designed breakpoints and a mobile layout.** Fluid behaviour is in; an alternative narrow layout
  is not designed or tested.
- **Any style dependency beyond `sass`** — no Tailwind, no component library, no icon set, no web
  font. The app keeps the system font stack.
- **A piece set for the board.** `react-chessboard`'s standard SVG pieces stay.
- **Visual-regression testing** (reference captures compared pixel by pixel): considered and
  rejected — a dependency, versioned binaries and notorious flake, with no CI to carry it.
- **Any server change**, schema change, endpoint or derived value.
- **New screens, controls, messages or behaviours.** Restyling only, plus the markup restructuring
  the layout requires.
- **Animation and transitions.**
- The third-party live region `react-chessboard` injects, and its drag-and-drop instructions
  repeated across the danger diagrams — findings open since US-8 and US-10a, untouched here.

## Further Notes

- **The pilot was produced during the grilling, not in a slice**, on the requester's remark. Taste is
  the one decision that cannot be delegated, and it must not sit behind an already-merged
  restructuring. Two pilots rather than one, because a palette that holds on a list can collapse on
  the Analyse screen. It paid for itself three times over: the hole in the three-families rule, the
  board's non-text contrast rule, and the `max(fill, stroke)` measurement — all three would otherwise
  have surfaced late.
- **`CONTEXT.md` gains nothing, and that is the correct outcome.** It is the domain glossary, devoid
  of implementation; "token" and "theme role" belong in the ADR, where they are. The one rule that
  touches domain terms — *a colour that says "White" does not say "background"* — is a styling rule,
  not a definition.
- **Drive-by findings, to take or to leave, not to smuggle**: "Mes parties" is the only screen
  without a `section` or `h2` (the skeleton fixes this) and carries the app's only remaining English
  string, joined by the import form's category legend and the board's previous/next buttons. Also
  noted: the client declares Vite `^8.1.5` while the installed tree is 5.4.21.
- **`/stats` is visited by no HP**, and it is the screen whose markup changes most. Its verification
  rests entirely on its Feature Path until the HP revision lands.
