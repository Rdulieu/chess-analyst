# Move annotations on Analyse — see my mistakes while reviewing a Game

Status: ready-for-agent
Business ref: BACKLOG.md — US-7
Integration branch: `integration/US-7-mistake-annotations-on-analysis` (cut from up-to-date `develop`).
Decisions: no new ADR (a direct, additive consequence of **ADR-0009** — reuses the stored
`evaluations` with zero engine re-run, exactly as anticipated by that ADR's Consequences section).
Glossary terms (CONTEXT.md): `Evaluation` (entry updated during grilling — see Further Notes),
`Inaccuracy`/`Mistake`/`Blunder`, `Danger position` (referenced for contrast). Dev-phase rules
apply, though no schema change is actually needed here (pure read-side derivation).

## Problem Statement

US-4 gave the Player an aggregate view of where they tend to go wrong (`/danger`), but while
reviewing one specific Game on the Analyse page, the board shows nothing about move quality: no
`Inaccuracy`/`Mistake`/`Blunder` flag, no `Evaluation`. The Player has to cross-reference `/danger`
or trust their own judgement to spot where a Game went off the rails, even though the engine has
already evaluated every Position of that Game (US-4's stored `evaluations`, never surfaced
per-Move).

## Solution

Surface the already-stored, per-ply `Evaluation`s directly on the Analyse page, reusing US-4's
`evaluations` table with **no new engine work**:

- Each of the Player's own Moves in the move list is tagged with its severity (`?!`/`?`/`??`)
  when flawed, per the existing `Inaccuracy`/`Mistake`/`Blunder` classification (CONTEXT.md,
  Player-only). The Move that led to the currently-viewed Position also gets its destination
  square highlighted on the board.
- Every half-move (Player's and opponent's) gets its `Evaluation` shown — in the move list and,
  for the Position currently on the board, next to it plus a White/Black winning-chances balance
  bar. Displayed `Evaluation`s are always **White-relative** (chess.com/Lichess convention),
  converted from the side-to-move-relative value that is actually stored.
- One on-by-default toggle shows/hides the whole package, so the Player can switch to a
  spoiler-free view to replay the Game on their own first.
- A Game that has not been analyzed yet shows an explicit message and an "Analyser" action,
  reusing the existing analysis-pass job and progress polling — the annotations appear
  automatically once the pass completes, no reload needed.

All derivation (perspective conversion, winning chances, severity classification) happens
**server-side**; the client only formats and renders what it receives.

## User Stories

1. As the Player, I want my own flawed Moves flagged `?!`/`?`/`??` in the move list, so that I can spot my mistakes without re-deriving them myself.
2. As the Player, I want the flag to use the exact same `Inaccuracy`/`Mistake`/`Blunder` thresholds as `/danger`, so that the two views never disagree about what counts as a mistake.
3. As the Player, I want only my own Moves flagged (never my opponent's), so that the feedback stays about my improvement, consistent with how `Mistake` is defined everywhere else in the app.
4. As the Player, I want my opponent's Moves to still show their `Evaluation` (without a quality flag), so that I can read the whole Game's trajectory, not just my own turns.
5. As the Player, I want the `Evaluation` shown for every Position, in pawns with one decimal (e.g. `+1.3` / `-0.7`), so that I read it the way I would on chess.com or Lichess.
6. As the Player, I want a forced mate shown as `M3` / `-M2` rather than an arbitrary pawn value, so that a mating sequence is unambiguous.
7. As the Player, I want the `Evaluation` always expressed relative to White, so that its sign doesn't flip confusingly every half-move regardless of who's to move.
8. As the Player, I want a visual White/Black winning-chances balance (a bar) for the Position I'm currently viewing, so that I can gauge the swing of the Game at a glance, not just read numbers.
9. As the Player, I want the balance bar driven by winning chances (not raw centipawns), so that it reads consistently with how severities are computed and saturates sensibly near decisive positions.
10. As the Player, I want the `Evaluation` and balance for my current Position to update as I step through the Game (Previous/Next or jumping via the move list), so that the readout always matches what's on the board.
11. As the Player, I want the destination square of a flawed Move highlighted on the board when I'm viewing the Position right after it, so that I see at a glance which square the mistake happened on.
12. As the Player, I want the board highlight to use a distinct tint per severity plus the `?!`/`?`/`??` text itself as the real indicator, so that the signal doesn't rely on color alone (no stylesheet in this app — CONTEXT.md/UI convention).
13. As the Player, I want one single toggle that shows or hides the whole package (flags, `Evaluation`s, balance bar) together, so that I can replay a Game spoiler-free with one click.
14. As the Player, I want that toggle on by default, so that the feedback is available without any extra step for the common case.
15. As the Player, I don't need the toggle state remembered across visits, so that it stays a simple, local, disposable preference rather than another persisted setting.
16. As the Player, when I open Analyse for a Game that hasn't been analyzed yet, I want an explicit message instead of silently missing annotations, so that I understand why nothing is flagged.
17. As the Player, I want an "Analyser" action right there on the Analyse page for that Game, so that I don't have to leave and go find it on "Mes parties".
18. As the Player, I want that action to run only for this one Game, not the whole library, so that I don't accidentally kick off a long batch.
19. As the Player, I want to see the analysis progress on the Analyse page after clicking "Analyser", so that I know it's working and roughly how long it'll take.
20. As the Player, I want the annotations to appear automatically as soon as that analysis finishes, so that I don't have to reload the page.
21. As the Player, I want this feature to change nothing about `/danger`, `/openings`, `/stats`, or the Move habit explorer, so that reviewing one Game stays additive, not a rework of the other views.
22. As a developer, I want the per-Move severity classification and the winning-chances derivation reused from the exact same code `/danger` already uses, so that there is a single source of truth and no risk of the two views drifting apart.
23. As a developer, I want all engine-derived math (perspective conversion, winning chances, severity) computed server-side, so that the client stays a thin renderer with no duplicated business logic in TypeScript on both ends.
24. As a developer, I want the new per-Game annotations to require no schema change, so that this story stays a pure read-side addition on top of ADR-0009's stored `evaluations`.
25. As a developer, I want the per-ply annotation payload index-aligned with the client's own move/position index (0 = starting Position), so that there is no off-by-one between the board's navigation state and the annotation shown.
26. As a developer, I want the "Analyser this Game" trigger to reuse the existing analysis-job endpoint and polling mechanism (just scoped to one `gameId`), so that there is no second analysis pipeline to maintain.

## Implementation Decisions

### Server: shared derivation, extended for display

- **Factor out** the per-Game derivation currently private to the `Danger position` repository
  (walking a Game's stored `evaluations` into per-ply Positions/winning-chances, then into
  per-Move severities) into a **neutral module** shared by `/danger` and this feature — mirroring
  how the `Win rate` primitive was already extracted for US-3/US-6. No behavioural change to
  `/danger`; it becomes a consumer of the shared module instead of owning the logic.
- **Extend** that shared derivation with a **White-relative conversion**: the stored `cp`/`mate` is
  side-to-move-relative (standard UCI convention — CONTEXT.md's `Evaluation` entry now documents
  this explicitly). Convert using the Position's side to move (even ply index = White to move,
  odd = Black), negating `cp`/`mate` when Black is to move. White-relative winning chances follow
  the same rule (`chances` as stored when White to move, `100 - chances` when Black to move).
- **New read path**: given an analyzed Game, produce one annotation entry per ply (index 0 =
  starting Position, matching the client's own navigation index), each carrying: the White-relative
  `Evaluation` (`cp`/`mate` pair, same nullable-pair shape as the stored `Evaluation`), the
  White-relative winning chances (0–100, for the balance bar), and the Move severity
  (`inaccuracy`/`mistake`/`blunder`/`null`) — `null` for ply 0, for the opponent's Moves, and for
  unflagged Player Moves, exactly as `Inaccuracy`/`Mistake`/`Blunder` is already scoped. Returns
  nothing (or an explicit not-yet-analyzed signal) for a Game whose `analyzed` flag is false.
- **New endpoint**: a per-Game annotations read, e.g. `GET /api/games/:id/annotations`, returning
  the array above. No request body; purely derived from already-stored data, no engine call.
- **Analysis trigger reuse**: no server change needed to analyze a single Game — the existing
  `POST /api/analyze` already accepts an arbitrary `gameIds` array; calling it with a single id is
  the "Analyser this Game" action.
- **Formatting boundary**: the server returns numeric values only (pawns as a float, mate as a
  signed move count, winning chances 0–100). The `+`/`-` sign display, the one-decimal rounding,
  and the `M3`/`-M2` string formatting are **client-side presentation**, not server derivation —
  consistent with how `/danger`'s `percent()` helper formats a server-computed rate today.

### Client: rendering, toggle, and the not-yet-analyzed path

- **New annotation type + fetch function**, mirroring the existing `Game`/`DangerEntry` pattern:
  a client type for one ply's annotation, and a fetch function calling the new endpoint, called
  once when the Analyse page loads an **already-analyzed** Game.
- **Move list**: each entry gains, when the toggle is on, the severity glyph (only for the
  Player's own flawed Moves) and the formatted `Evaluation` (for every Move, either side) sourced
  from the annotation at that ply's index.
- **Current-Position readout**: the existing "current move" status line gains the formatted
  `Evaluation` for the current index; a new small presentational **balance bar** component renders
  alongside the board, driven by the current index's White-relative winning chances. Both update
  on every navigation (Previous/Next/jump-to-move), following the existing index-driven
  re-render.
- **Board highlight**: the board's move-parsing (which today only carries `san`/`fen` per ply)
  gains the **destination square** of each Move (already available from the underlying chess
  library's move data, just not currently exposed). When the current index's Move has a severity,
  that destination square gets an inline per-severity tint via the board library's per-square
  style prop — the same "inline style, not a stylesheet" mechanism the app already uses elsewhere.
  The glyph in the move list remains the accessible, color-independent source of truth.
- **Toggle**: local component state on the Analyse page (or the Game viewer it renders), boolean,
  defaulting to `true`, not persisted anywhere. When off, the page renders exactly as it does
  today (no glyphs, no `Evaluation` text, no bar, no board highlight) — purely additive.
- **Not-yet-analyzed path**: when the loaded Game's `analyzed` flag is false, the Analyse page
  shows an explicit invitation message plus an "Analyser" action for that one Game, reusing the
  existing analysis-job start + status-polling logic (today only wired on "Mes parties") scoped to
  a single `gameId`. Once the poll reports completion, the page refreshes the Game and its
  annotations automatically, without a manual reload.

### API contract (shape, not fixed values)

```
GET /api/games/:id/annotations
  → 200, { plies: [ { ply, whiteEval: { cp: number|null, mate: number|null }, whiteWinChances: number, severity: "inaccuracy"|"mistake"|"blunder"|null } ] }
  → (not-analyzed Game: an explicit empty/absent result, not a silent empty 200 array conflated with "no mistakes")

POST /api/analyze  { gameIds: [id] }   → unchanged (existing endpoint, US-4), called for one Game
GET  /api/analyze/status                → unchanged (existing endpoint, US-4)
```

## Testing Decisions

Good tests assert observable behaviour — the endpoint's response shape and values, and what the
Analyse page renders — never the engine's internals or implementation details of the derivation.
Stockfish stays an external dependency, never under test (ADR-0002): everything here is exercised
against **pre-stored `evaluations` fixtures**, exactly like `/danger`'s tests.

- **Shared derivation module (pure)** — unit: the White-relative conversion (sign flip by side to
  move, both `cp` and `mate`), White-relative winning chances, and that severity classification is
  unchanged from `/danger`'s existing behaviour after the extraction (a regression guard on the
  refactor). Prior art: the existing `move-quality`/`winning-chances` unit tests, US-4.
- **`/danger` regression** — the existing danger-repository tests must keep passing unmodified
  after the shared-module extraction, proving the refactor is behaviour-preserving.
- **Annotations read path** — repository-level test against `:memory:` SQLite seeded with
  pre-stored `evaluations` for one Game: assert the per-ply array, index alignment (ply 0 = start),
  White-relative values, and severities matching a hand-checked fixture Game. Also assert the
  not-analyzed case. Prior art: `getDangerPositions`'s own tests.
- **API** — supertest: `GET /api/games/:id/annotations` for an analyzed vs. not-yet-analyzed Game;
  `POST /api/analyze` with a single `gameId` (already covered by US-4's tests, just exercised with
  a length-1 array here). Prior art: `api.test`.
- **Client** — mocked fetch: move list renders glyphs only for the Player's flawed Moves and
  `Evaluation` text for both sides; the current-Position readout and balance bar update on
  navigation; the toggle hides/shows the whole package; the not-yet-analyzed message + "Analyser"
  action + progress + auto-appearance-on-completion. Prior art: `GamesPage`'s existing
  analyze-and-poll test, `DangerPage`'s empty-state test.
- **Test pyramid apex — Feature Path (agentic, deterministic, no real Stockfish)**: the real app
  seeded with a small fixture Game's pre-stored `evaluations` (no engine involved) → open Analyse,
  confirm the expected `?!`/`?`/`??` glyphs and `Evaluation`s appear against known fixture values,
  toggle off/on, and confirm the board highlight tracks navigation. A second scenario (or the same
  one, depending on how `/to-issues` slices this) drives the not-yet-analyzed path with the
  fixture `Engine` injected: click "Analyser", watch progress, see annotations appear without a
  reload.
- **Happy Path**: not proposed by this PRD — the HP budget is already at 3/3 (US-4's notes); if
  warranted, graft a drive-by step onto an existing HP at the `integration → develop` MR, per the
  git-flow HP-budget rule, rather than adding a 4th HP.

## Out of Scope

- **Auto-triggering analysis on Import** — analysis stays manual and separate (unchanged from
  US-4).
- **Best-move suggestions or arrows** (showing what the engine would have played) — only the
  Player's actual Move is annotated; no "better move" display.
- **Game-level accuracy % or a centipawn graph across the whole Game** — only per-Position/per-Move
  data, no summary/aggregate chart.
- **Per-Move textual commentary** beyond the `?!`/`?`/`??` glyph and the numeric `Evaluation`.
- **Board orientation flip by the Player's side** — the board keeps its current fixed orientation;
  that gap is tracked separately (US-10). The balance bar simply follows whatever orientation the
  board renders in today.
- **Persisting the toggle preference** (server-side or otherwise) — always resets to on.
- **Any UI change to `/danger`, `/openings`, `/stats`, or the Move habit explorer** — the shared
  module extraction must be behaviour-preserving there, not a redesign.
- **Empirically validating the native `STOCKFISH_PATH` backend** — unrelated, still open from
  US-4.

## Further Notes

- During grilling, `CONTEXT.md`'s `Evaluation` entry was sharpened to state explicitly that the
  **stored** value is side-to-move-relative (standard UCI) while anything **shown to the Player**
  is White-relative — this distinction is the crux of this feature's server-side conversion step
  and didn't exist as documented language before this US.
- `Board.tsx` (the interactive board component) is only ever used by the Analyse page today, so
  extending it (destination-square exposure, optional annotation rendering) carries no blast
  radius on other screens.
- The "Analyser this Game" trigger and its progress polling intentionally reuse US-4's existing
  job/endpoint rather than introducing a second analysis pipeline — only the UI entry point (on
  Analyse instead of/in addition to "Mes parties") and the `gameIds` scope (one id) are new.
- Move `BACKLOG.md` US-7 to "Doing" with this PRD path + branch when `/to-issues` runs.
