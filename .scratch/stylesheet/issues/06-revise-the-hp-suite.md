# 06 — Revise the HP suite: a theme pass, and every screen visited

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

The Happy Path suite is brought back in line with the restyled app, and gains the coverage the theme
needs. Two distinct jobs, in this order.

**Adapt, because the markup moved.** Slice 01 restructured every screen; the three HP scenarios drive
the real UI and locate what they assert by role and name. Their steps are updated to the new
structure — same journeys, same assertions, same hard figures where they assert them. US-10a set the
precedent: the suite was adapted, then replayed in full.

**Add the theme pass, and close the coverage gap.** Each HP gains a **final step** that walks the
navigation across **all six screens**, first in the light theme and then with the dark system
preference emulated, reusing the state the journey has already built — no re-import, no re-analysis.
The extra cost is rendering, not journey. This is the requester's requirement: today the Stats screen
is visited by no HP and Danger positions only as a drive-by, and a theme pass that never sees a screen
proves nothing about it. The journeys themselves stay journeys of value and do not become coverage
sweeps.

The cap of **at most 3 HP** holds. No fourth scenario. The suite already carries the style-sensitive
assertions that must not regress — the weak-opening highlight, the arrows' opacity and hue, the
evaluation curve and its markers — and those stay where they are.

Then the suite is **replayed in full** against the real chess.com API and the real engine, from an
empty database, and the result is recorded for the `integration → develop` PR.

## Acceptance criteria

- [x] The three HP scenario documents are updated to the restructured markup, with their journeys,
      their assertions and their hard figures unchanged in substance.
- [x] Each HP ends with a step walking all six screens in the light theme and then under an emulated
      dark preference.
- [x] That final step reuses the state the journey built: it triggers no further import and no further
      analysis.
- [x] The theme step asserts, on each screen: no unresolved token, text contrast at least 4.5:1 (3:1
      for large text), no horizontal overflow, non-chromatic cues present where a tint carries meaning,
      and player colours identical between the two themes.
- [x] Every screen is visited by at least one HP, the Stats screen included.
- [x] The suite still contains exactly three Happy Paths.
- [x] The existing style-sensitive assertions (weak-opening highlight, arrow opacity and hue, the
      curve and its markers) are preserved.
- [x] The suite is replayed in full against the real chess.com API and the real engine from an empty
      database, and passes 3/3 with no console error.
- [x] The run's result — pass/fail per scenario, plus any finding — is written up ready to paste into
      the `integration → develop` PR.
- [x] Build and the full test suite are green.

### Feature Path (FP)

For this slice the Feature Path is the suite's own execution.

1. Run the three Happy Paths in full against the real chess.com API and the real engine, from an empty
   database → all three pass, with the figures they assert matching.
2. Observe each scenario's final step → it walks all six screens in the light theme, then again with
   the dark preference emulated, without importing or analysing anything more.
3. On each screen, in each theme → text stays legible, no colour fails to resolve, nothing overflows
   horizontally, every meaning-bearing tint still has its non-chromatic cue, and White's and Black's
   colours are unchanged between themes.
4. Confirm coverage → the Stats screen and the Danger positions screen are both visited, in both
   themes, by at least one scenario.
5. Confirm the budget → the suite still holds three Happy Paths, not four.
6. Across the whole run → no console error.

Verify: UI first, against the running app; this is the apex tier, so there is no lower seam to fall
back on.

## The run — 2026-08-17, HP 3/3 green, no blocking finding

Two subagents in parallel, each on its own ports and its own `DB_FILE`: HP-01 (real chess.com import
from an empty database, real WASM Stockfish at depth 16), HP-02 + HP-03 (one real import, snapshotted
and restored by file copy so the second scenario still started on untouched data). Build green,
144 server + 362 client tests green.

**HP-01 ✅ 10/10.** Every hard figure exactly as the scenario asserts, no drift: 82 fetched / 82
imported / 0 present, Blitz 72 · Bullet 10, 45 W · 0 D · 37 L, month lines 28 + 54. Determinate
readout `0/2 → 1/2 → 2/2`; White-side and Black-side Games both opened, board turned and not
rearranged; replay 0 imported / 82 present with no duplicate; username remembered. Analysis pass on
the two shortest Games sharing a first Move (ids 56 and 44, both 1.e4 — the pair the docs predict),
29 Positions, counter advancing, confirmation exact, dismissal persistent across a reload; `/danger`
announced its computation then rendered one recurring `Danger position` ("2 fois atteinte"), initial
Position excluded; `Evaluation curve` with its `??` marker and "1 grosse erreur".

**HP-02 ✅ 10/10.** 54 imported (6 bullet + 48 blitz); candidates' cadence parts sum in every
candidate at every level; White 27 + Black 27 = the import total; 3 candidates ↔ 3 arrows with
endpoints on the named squares, alpha 1.0 / 0.89 / 0.46 and hue 46 vs 87 across the 50 % threshold;
board and list descents identical, breadcrumb correct, orientation held down and back up while the
side-to-move readout alternated; depth cap at exactly 40 half-moves.

**HP-03 ✅ 6/6.** 32 rows, zero violations on all four shape rules, counts non-increasing, entries
summing to 54; 14 highlighted rows = exactly those under 50 %, and the three rows at exactly 50 % are
not highlighted (strict threshold), each carrying ⚠.

**The theme pass: 36 audits (3 scenarios × 6 screens × 2 themes), all green.** No unresolved colour,
no undeclared constant token, no page or box horizontal overflow at 1019 px or at 400/420 px, no
console message of any kind across the three runs. The seven theme-invariant tokens plus
`--square-notation` byte-identical between themes on every screen (`--white-share #ececec`,
`--black-share #2f2f2f`, squares `#e9e2cf` / `#9a8467`); the explorer's arrow `hsla` strings identical
too. HP-03's weak rows measure **9.5:1 light and 9.58:1 dark** — the 1.02:1 defect slice 02 found does
not recur. Worst contrast anywhere: 2.63:1, on a *disabled* control (known-open, WCAG-exempt).

### Findings, none blocking

- **[non-blocking] A failed `/api/games` fetch renders the empty-state invitation**, indistinguishable
  from "no games": the screen said "No games yet — import your chess.com history to get started."
  while the database held 82 Games. Found incidentally when the relay returned 502. A Player hitting a
  hiccup is told their history is empty. Not a US-13 concern, and the sharpest finding of the three
  runs, so it is **filed on the technical backlog** rather than left here to die with this story:
  `.scratch/games-load-failure/issues/01-a-failed-load-looks-like-an-empty-history.md`
  (`needs-triage`).
- **[non-blocking] The side selector does not reset the explorer path.** Switching Blancs → Noirs two
  moves deep keeps the line, whose other-side habits are typically empty. HP-02 step 8 now says to
  return to `Départ` first. **This is a product question and no agent should settle it**: recorded as
  one, with the three candidate answers, in
  `.scratch/move-habit-explorer/issues/04-does-switching-side-keep-the-path.md` (`needs-triage`).
- **[non-blocking] Two known-open findings are in fact fixed**, and were struck from
  `theme-pass.md` rather than carried: the board's coordinate labels (~2.3:1 → **12.89:1** light
  square / **4.66:1** dark, because the board *does* consume `--square-notation` and the square
  tokens, contrary to slice 03's note) and the curve's equality line and cursor (2.92 / 2.93 → **3.30
  to 3.44**, above the 3:1 graphics threshold). A regression on either must now go red.
- **[non-blocking] The disabled-control figure was wrong in the light theme**: recorded "~3.5:1",
  measured 3.51:1 dark but **2.63:1 light**. Corrected in `theme-pass.md`. Still WCAG-exempt.
- **[non-blocking] Four of the six cue rules are vacuous in HP-02's and HP-03's states** (danger
  cards, severity glyphs, failed month, "analysée" badge have no subject there). A green pass on those
  two is not "all cues verified" — HP-01 carries the rest. Now stated in `theme-pass.md`, and the
  audit reports `subjects` alongside `failures` so the distinction is visible.
- **[non-blocking] The import-failure tint still has no reachable instance** (slice 03's finding,
  unchanged): no month failed in three real imports, so `[data-failed]` was never rendered.
- **[non-blocking, driver] The shared browser is a hazard when scenarios run in parallel.** A selected
  page was stolen mid-run twice and two actions landed on the *other* agent's app; one subagent also
  `pkill`ed every chess-analyst backend on the machine, not just its own. Both are now rules in
  `README.md` (own ports, own `DB_FILE`, guard scripts on `location.port`, kill by pid).
- **[non-blocking, driver] MCP `fill` silently no-ops on `<input type=month>`** (reports success, value
  unchanged) — keyboard entry works. And `/analyse` is reached by a click handler with no `href`, so a
  driver scanning for links finds nothing.

### What the run sent back into the documents

The scenarios were adapted *before* the run, from the merged diffs; the run then corrected four
things the diffs could not show, all folded in:

1. **HP-01 step 6 asserted a layout that cannot exist there.** The annotations pane beside the board
   only appears once a Game is analysed, and step 6 opens an unanalysed one. The row is asserted at
   step 9 instead.
2. **HP-01 step 9's curve assertion was not guaranteed by its own selection rule.** The two *shortest*
   Games often hold no Player mistake — game 56 reads "aucune sur cette partie". The step now says to
   reopen whichever of the two carries a flawed Move, and to record the marking as *not exercised* if
   neither does.
3. **The progress readout must be observed from before the click.** The real two-month import now
   completes in under two seconds, so a poller started after submit sees only the summary. Recorded,
   along with the fact that there is no analysis status endpoint to poll — watch the readout.
4. **Stale economy figure**: the analysis pass is 29 Positions in ~25 s, not "~3.5 min".

`theme-audit.js` needed no correctness fix — it ran on all 36 audits first time. Three additions came
out of the run: `--square-notation` (constant-family per `boardTheme.ts`, in no list, so its
invariance was asserted by nobody), a `worst` ratio and `textsMeasured` (so "nothing failed" and
"nothing was measured" stop looking identical — the sweeps measured 25 to 306 texts per screen), and
`failing` naming the offending elements per cue rule.

### The re-run: HP-01's twelve audits on a dedicated browser

The first run's HP-01 audits were taken on the shared MCP browser, guarded (a `location.port` throw
plus re-asserted `innerWidth` / `matchMedia`, with the three tripped measurements re-taken). The
guards held, but "measured on a browser another agent could steal, with guards" is a footnote a human
reviewer has to evaluate at the `integration → develop` gate, so the twelve audits were **re-run on a
dedicated Chrome** (own `--user-data-dir`, own debugging port, raw CDP over Node's built-in
`WebSocket`, no shared driver). No import and no engine: the run restored HP-01's end state by copying
its SQLite file (82 Games, 2 analysed, `/danger` holding its one recurring Position) and walked the
navigation.

**12/12 pass, and every figure matches the guarded run.** No unresolved colour, no undeclared constant
token, no page or box overflow at 1280 px or at 400 px, cue rules green wherever they had a subject.

| Screen | worst light | worst dark | texts measured | cue rules exercised |
|---|---|---|---|---|
| Mes parties | 2.63 (disabled "Analyser la sélection") | 3.51 (same) | 102 | badge 2/0, tab 1/0 |
| Explorateur | 4.66 (board coordinate) | 4.66 | 36 | tab 1/0 |
| Ouvertures | 5.75 | 6.81 | 306 | weak-opening ⚠ 17/0, tab 1/0 |
| Positions dangereuses | 4.66 (board coordinate) | 4.66 | 25 | tab 1/0 |
| Stats | 5.75 | 6.81 | 39 | tab 1/0 |
| Analyse (an **analysed** Game) | 2.63 (disabled "Previous") | 3.51 (same) | 75 | severity glyph 1/0 |

The only contrast failures anywhere are the disabled controls, matched by the audit's known-open list.
The eight theme-invariant tokens are byte-identical between themes on every screen, with no per-screen
drift (`--white-share #ececec`, `--black-share #2f2f2f`, `--square-light #e9e2cf`,
`--square-dark #9a8467`, `--square-notation #241d13`, the three `--square-<severity>`); grounds and inks
swap as they should (`#ffffff`/`#14171a` → `#16181a`/`#e6e8ea`). Console across the whole walk: three
Vite dev messages and React's DevTools suggestion — **no error, no warning**.

**Nothing differs from the guarded run**, which is the answer to the question that prompted the
re-run. Two notes on the re-run's own method, both mine and not the app's:

- The first attempt opened the **first** Game rather than an analysed one, so its Analyse audit saw no
  annotations pane and exercised no severity cue. Corrected by selecting **by characteristic** — the
  row carrying the "analysée" badge — which is the suite's own rule and the reason the figures above
  are comparable to the guarded run's.
- A comma selector (`'… button, … a, … [data-part="description"]'`) returns the **first match in
  document order**, which is the wrapping span, and clicking a span does nothing. Worth knowing for
  any driver aimed at the Game list: click the row's `button`.

### Deviations

None. No line of `client/src` or `server/src` was touched: this slice is scenario documents plus one
piece of test tooling.

## Blocked by

- `03-semantic-tints-move-to-tokens`
- `04-lists-and-tables`
- `05-dense-screens`
