# The theme pass — the last step of every Happy Path

Since US-13 the app has a stylesheet and a dark theme that follows the operating-system
preference. A style is only observable on a **rendered** screen, so it is validated where the app
actually runs: each of the three Happy Paths ends with **this** step, walking the navigation across
**all six screens**, first in the light theme and then with the dark preference emulated.

It is written once, here, and referenced by each scenario's final step rather than copied three
times — three copies of an assertion list drift, and the whole point of the pass is that the three
scenarios apply the *same* rules to the state each of them built.

## Why it is a step of every HP and not a fourth scenario

The cap of **at most 3 HP** holds. The theme is not a journey of its own: it has no control, no
state and no server side — it is how the screens the Player already reached are painted. So it costs
one step per scenario, and that step **rides on the state the journey has already built**.

It is also what closes the suite's coverage gap: before US-13, `/stats` was visited by no HP and
`/danger` only as a drive-by, and a theme pass that never sees a screen proves nothing about it.
Walking the navigation is the cheapest way to see every screen without turning a journey of value
into a coverage sweep.

## The rule that keeps it cheap

**No further Import and no further analysis.** The pass triggers neither. It navigates, and it
reads. If a scenario's state does not reach a screen with content (a scenario that never analysed a
Game finds `/danger` empty; one that never imported finds every screen inviting an import), the
screen is still visited and audited **in the state that scenario leaves it** — the empty state is a
rendered screen too, and it has a ground, an ink and a contrast. What must never happen is a scenario
importing or analysing *for the sake of the theme pass*.

The extra cost is rendering, not journey: on a warm app it is twelve navigations.

## The six screens

| # | Screen | Reached by |
|---|---|---|
| 1 | Mes parties (`/`) | navigation |
| 2 | Explorateur (`/explorer`) | navigation |
| 3 | Ouvertures (`/openings`) | navigation |
| 4 | Positions dangereuses (`/danger`) | navigation |
| 5 | Stats (`/stats`) | navigation |
| 6 | Analyse (`/analyse/:gameId`) | selecting a Game in "Mes parties" — it is Game-scoped and deliberately absent from the navigation |

All six, in both themes. The sixth is the one the navigation cannot reach: open any Game from the
list. If the scenario's state holds no Game at all, record that screen as *not reachable in this
scenario's state* rather than importing one.

## What is asserted, on every screen, in both themes

1. **Every colour resolves.** No computed colour is empty or still a literal `var(--…)`, and every
   theme-invariant token is declared.
2. **Text contrast** is at least **4.5:1**, or **3:1** for large text (≥ 24px, or ≥ 18.66px bold),
   measured against the background **actually painted** behind the text, composited through
   transparency.
3. **No horizontal overflow**: the page does not scroll sideways, and no box is wider than its own
   container unless it is a declared horizontal scroller.
4. **Non-chromatic cues are present wherever a tint carries meaning** — the weak-opening ⚠, the
   danger card's ⚠, the severity glyphs `?!` `?` `??`, the failed month's word "échec", the
   "analysée" badge's word and checkmark, and the current tab's weight/border beside its
   `aria-current`.
5. **Player and board colours are identical between the two themes**, byte for byte:
   `--white-share`, `--black-share`, `--square-light`, `--square-dark` and the three
   `--square-<severity>` tints. White's share must not darken at night, because it denotes a player
   and not a background.
6. **No console error** across the walk.

Assertions 1 to 5 are measured, not eyeballed: `tools/theme-audit.js` implements them as one
browser-side function returning a report per screen. Inject it and call `themeAudit()` on each
screen in each theme; compare the `constants` block between the two themes for assertion 5. The
theme itself is switched by the **driver** emulating `prefers-color-scheme: dark` (CDP
`Emulation.setEmulatedMedia`), never from inside the page — the app ships a media query, so the media
query is what must be exercised.

Contrast is **blocking**, not a report: US-3 shipped a highlight that was invisible for want of any
CSS, and the point of a stylesheet is not to replay that finding in reverse.

## Known-open findings the audit reports but does not fail on

Recorded here so that a replay does not present the same known facts as new breakage, and so that
the list stays short and visible rather than becoming an ignore-file:

- **`react-chessboard`'s rank/file coordinate labels**, ~2.3:1 in both themes — a third-party
  default, open since US-13's slice 02; the board's own `--square-*` tokens are declared and not yet
  consumed.
- **A disabled control's label**, composited to ~3.5:1. WCAG exempts inactive controls and the
  `not-allowed` cursor carries the state.
- **The evaluation curve's equality line and cursor**, 2.92:1 and 2.93:1 against the shares they are
  drawn on. Non-text graphics, held to 3:1, missing it by a hair; unchanged US-14 values.
- **The board's pieces are third-party SVG** and are non-text content: they are held to the 3:1
  graphics rule on **`max(fill, stroke)`** against their square, never on fill alone — a white piece
  on a light square measures 1.24:1 on fill and 14.65:1 on stroke, and the stroke is what carries
  legibility. The audit's text sweep does not cover them; measure them only when the board changes.

Anything the audit reports outside this list is a **finding**, and a contrast failure outside it is
**blocking**.
