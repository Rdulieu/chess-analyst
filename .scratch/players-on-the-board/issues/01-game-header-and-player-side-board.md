Status: ready-for-agent

## Parent

`.scratch/players-on-the-board/PRD.md` (US-10a — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-10a-players-on-the-board` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

**Tracer bullet.** It introduces the two shared primitives the other slices reuse (PGN headers,
side to move) and the board's orientation property. Issues 02 and 03 are blocked by it.

## What to build

The page Analyse currently shows a board and nothing else: the `Game` is fetched with its
opponent, the side played, the result, the date, the cadence and the opening, and every one of
them is discarded before rendering. A Player who played Black also reads the whole game upside
down.

- A **game header** above the board, naming **both players with their colour**, taken from the
  PGN's `[White]` / `[Black]` headers — one source, already carried by the `Game`, consistent
  with the board by construction, and independent of `settings` (which US-11 replaces).
- **Which of the two is the Player** is marked, from the side stored on the `Game`. The app ships
  **no stylesheet**, so the mark is an inline style and must **never rely on colour alone**.
- The header also carries the **result stated from the Player's side** ("Victoire" / "Défaite" /
  "Nulle" — not `1-0`; the stored result is Player-relative, as in the game list and the stats),
  the **date**, the **time control category**, and the **Opening** (ECO code + name). A Game the
  platform did not classify is announced as unclassified, not left blank.
- The **board is oriented to the side the Player played**. Nothing lets the Player change it.
- Extract the two primitives as **standalone functions**, called from every entry point and never
  inlined: reading a PGN's game headers, and reading the **side to move** from a FEN (must work
  on a 4-field FEN too — issue 03 needs that).
- `eco` / `openingName` already come back from `GET /api/games/:id` (the route returns the raw
  row); they are only missing from the client-side `Game` type. **No server change at all.**

The board component is **shared with the Explorer**, which has no `Game`: it must stay ignorant
of games. It takes an optional orientation, defaulting to White at the bottom; the header lives
in the game viewer, which is the only holder of the `Game`.

## Acceptance criteria

- [ ] The header names both players and states each one's colour.
- [ ] The Player is distinguishable from the opponent without perceiving colour.
- [ ] The result is stated from the Player's side, for each of win / loss / draw.
- [ ] The date, the time control category and the Opening (ECO + name) are shown.
- [ ] A Game with no opening classification is announced as unclassified, not blank.
- [ ] A Game played as Black renders the board with Black at the bottom.
- [ ] A Game played as White renders unchanged (White at the bottom).
- [ ] The header is present for a Game that has not been analyzed yet.
- [ ] The header does not change while stepping through the moves.
- [ ] The board component renders White at the bottom when given no orientation (the Explorer's
      current behaviour is untouched by this slice).
- [ ] Reading the game headers and reading the side to move are each one standalone function,
      unit-tested with their degraded cases (missing/partial PGN headers, 4-field FEN).
- [ ] No server-side change.

### Feature Path (FP)

1. Import a history containing at least one Game played as White and one played as Black.
2. Open a Game played as **White** from "Mes parties" → the header names both players with their
   colours, marks which one is the Player, and states the result, date, cadence and opening;
   the board shows White at the bottom.
3. Open a Game played as **Black** → the board now shows **Black at the bottom**, and the header
   marks the Player on the Black side.
4. Step forward a few moves → the board follows, the header does not move.
5. Open a Game that has not been analyzed → the header is there all the same.

Verify: UI first.

## Blocked by

None — start here.
