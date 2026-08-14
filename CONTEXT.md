# chess-analyst

Solo tool that imports a player's chess.com game history and helps them find where to improve —
which openings, which recurring positions — by combining engine evaluation and personal
statistics, through an interactive board to navigate the history.

## Language

**Player**:
The single owner of the imported history — the person using this solo tool — identified by their
chess.com username, entered once and retained across sessions. Everything is relative to the
Player: a Game's `opponent` is whoever the Player faced, its result is scored from the Player's
side, and Mistakes, Weak openings, and Danger positions are only ever computed for the Player.
_Avoid_: User, Me, Account, Owner

**Game**:
A complete chess.com match imported for the Player, with its PGN, the opponent, the **side the
Player played** (White or Black), the **result from the Player's side** (win, loss, or draw),
the date, and the **time control category** (bullet, blitz, rapid, or daily — chess.com's own
classification). Identified across imports by its chess.com game URL, which is unique and
immutable.
_Avoid_: Match, Party

**Opening**:
The named sequence of initial moves a game follows, **identified by its ECO code** and carrying
a human-readable name (e.g. `B22` → "Sicilian Defense: Alapin Variation"). Both come from
**chess.com's own classification** of the Game (like the time control category — see `Game`), not
recomputed locally. A Game chess.com did not classify (aborted or too short) has no opening and
falls under a single catch-all **Other** opening rather than being dropped.
_Avoid_: Début, Line

**Position**:
A specific arrangement of pieces on the board at a given move of a game, identified by its FEN.
_Avoid_: Board state, State

**Move**:
A single half-move played by one side within a game.
_Avoid_: Ply, Turn

**Board orientation**:
Which side a Position is shown from — the side whose back rank is at the bottom of the board.
It is **never a preference the Player sets**: each view has exactly one orientation that makes
sense, and it follows from what that view is about.

- Reviewing a **Game**: the side the Player played (`Game`'s player side), so the Player reads
  their own games the way they played them.
- Exploring **Move habit**s: the side the explorer was opened for, held constant down the whole
  line — it does not flip when an `Opponent reply` has the move.
- A **Danger position**: **undefined**, and deliberately so. A Danger position is not scoped by
  the side the Player played, so the same Position merges reaches from Games played as White and
  as Black; there is no "the Player's side" to orient to. Only the **side to move** is defined
  there, and it is what is shown.

Orientation is distinct from the **side to move**, which is a property of the Position itself and
is always the same fact regardless of how the board is turned.
_Avoid_: Flip, Point of view, Perspective

**Evaluation**:
The chess engine's numeric assessment of a position (centipawns, or mate-in-N). **Stored**
relative to the side to move (standard UCI convention — positive favours whoever has the
move), which is what `winningChances`/`Mistake` severity are derived from. Anywhere an
Evaluation is **shown to the Player** (a numeric value, an advantage bar, the shape of an
`Evaluation curve`), it is converted to **White-relative** (chess.com/Lichess convention —
positive always favours White) so the sign doesn't flip with every half-move.
_Avoid_: Score (ambiguous with the game's result)

**Evaluation curve**:
How a single Game's `Evaluation`s read **as a whole**, across the Game's Moves in order (the
starting Position leftmost). Each side's share of the picture is its **winning chances** — the
same bounded quantity the advantage bar shows, and the one `Inaccuracy`/`Mistake`/`Blunder` are
defined on — never raw centipawns, which have no bound to draw against and would say something
other than the bar beside them. Carries the Player's own flawed Moves where they happened, and
nothing of the opponent's (see `Inaccuracy`/`Mistake`/`Blunder`). It states no fact that a Game's
`Evaluation`s and Moves don't already state — it adds a shape — so the figures themselves stay
readable Move by Move elsewhere. Only a Game that has been through an `Analysis pass` has one.
_Avoid_: Advantage graph, Accuracy curve (accuracy is not something we compute)

**Inaccuracy** / **Mistake** / **Blunder**:
The three severities of a flawed Move, defined **as Lichess defines them** — by how much the Move
drops the player's **winning chances** (a probability of winning derived from the engine's
`Evaluation`, so a given centipawn swing weighs more near equality than when already winning or
lost), **not** by a raw centipawn threshold. Computed only for **the player's own** Moves (never
the opponent's — this tool is about the player's own improvement), by comparing the position
*before* the Move (engine's best play) with the position *after* the Move actually played:

- **Inaccuracy** (`?!`): winning-chances drop of **10–20%**.
- **Mistake** (`?`): drop of **20–30%**.
- **Blunder** (`??`): drop of **30% or more**.

A Move dropping the chances by less than 10% is not flagged. Because winning chances saturate near
the extremes, a weak Move played while **already completely winning (or already lost)** is not
flagged either — it barely moves the chances (this is why the winning-chances method is used rather
than raw centipawns). `Mistake` is also used as the **umbrella** for "a flaw worth counting" where a
coarser notion is needed (e.g. `Danger position`); which severities that umbrella spans is stated
where it is used.
_Avoid_: Error, Bévue (use Blunder), Score (ambiguous with the game's result)

**Win rate**:
The Player's result over a set of Games, using standard chess scoring:
`(wins + 0.5 × draws) / games`, always **from the Player's side**. No minimum sample size is ever
enforced — the game count is always shown alongside the rate, so the Player judges its
significance. The canonical metric reused wherever results are scored: `Weak opening`,
`Move habit`/`Opponent reply`, and the global stats view. Whether a rate below 50% is highlighted
is a per-view presentation choice, not part of the definition.
_Avoid_: Score (ambiguous with a Game's result), Success rate

**Weak opening**:
An Opening the player has played **as a given side, within a given time control category**
(White Sicilian in blitz and White Sicilian in rapid are two separate entries), shown with its
`Win rate` and the number of games it's based on. Openings with a `Win rate` under 50% are
highlighted for review.
_Avoid_: Weak spot, Weakness, Problem area

**Danger position**:
A recurring Position — **reached at least twice**, recurrence being what makes it worth reviewing:
a Position seen once is a moment of a single Game, and belongs to that Game's review, not to this
aggregate. The **initial Position is excluded**: it is reached in every Game by construction, so it
is not something the player *arrives at*. Identified by its **4-field FEN** (piece placement, active colour, castling,
en passant; the halfmove/fullmove counters dropped so **transpositions merge**, exactly the Position
identity `Move habit` uses). **Not scoped by time control category, nor by the side the player
played** — a Danger position is a property of the Position itself (the FEN's active-colour field
already separates White-to-move from Black-to-move). Shown with two figures: how many times the
player has **reached** it, and in what proportion of those reaches a **serious error** — a `Mistake`
**or** `Blunder` (a winning-chances drop of 20%+); `Inaccuracy`s do not count — occurred within the
following **10 Moves** (10 half-moves — about five of the player's own moves; `Move` is a half-move
here). Beyond the two-reach floor above, **no further minimum sample size is enforced** — the reach
count is always shown alongside the proportion so the player can judge its significance themselves.
Danger positions are ranked **by serious-error proportion**, reach count breaking ties: the page
exists to show where the player goes wrong, not where they have been most often.
_Avoid_: Dangerous position, Trap

**Move habit**:
A Move the **player themselves** has played from a recurring Position, within the first 20 full
moves (40 Moves) of a Game — the core of the explorer. Positions are merged across Games by
transposition — reaching the same position via a different move order still counts as the same
Position. Shown with its frequency, its `Win rate`, and a breakdown of how many of those games fall into
each time control category (bullet, blitz, rapid, daily) — the `Win rate` itself is computed
across all time controls combined, not split by category. **Scoped by the side the player
played** (White/Black): the explorer is opened for one side and aggregates only the player's
Games on that side. The frequency (count) is always shown alongside the rate.
_Avoid_: Opening explorer, Repertoire

**Opponent reply**:
Within the explorer, a Move an **opponent** played from a recurring Position in the player's
Games (of the selected side). It is not a habit of the player's, but is surfaced at the
opponent's turn: the drill-down walks the **whole line**, so player Moves (`Move habit`s) and
Opponent replies alternate level by level. An Opponent reply is shown with the same frequency
and `Win rate` (player-relative — how the player fared when facing it), so the player can see
which replies give them trouble. Whether a level shows the player's own Moves or Opponent
replies follows from the Position's side to move versus the selected side.
_Avoid_: Opponent move (too vague), Threat

**Analysis pass**:
The act of running the chess engine over a chosen set of Games to produce and retain their
`Evaluation`s — one per `Position` of each Game. Triggered **manually** by the Player (from the
Game list, or for a single Game while reviewing it) and **never automatic**, like `Import`.
**Incremental**: a Game already analyzed is skipped, and its Evaluations are never recomputed.
A pass advances in **Positions evaluated**, and always ends in one of three **outcomes**, which
the Player is told explicitly rather than left to infer: **completed** (every Position of every
Game in the pass was evaluated), **interrupted** (the pass stopped before the end without
failing — the app was shut down mid-pass), or **failed** (the engine errored). An interrupted or
failed pass keeps whatever Evaluations it had already retained; re-running a pass resumes from
the Games still unanalyzed.
_Avoid_: Analysis (too vague), Scan, Job, Batch

**Import**:
The act of fetching the Player's Games from the chess.com public API by username. Triggered
**manually** by the Player and **scoped** to a **contiguous range of months** (a first and a last
month, each matching one chess.com monthly archive — a single month is simply a range of one) and
a chosen set of **time control categories** (any subset of bullet, blitz, rapid, daily) — never
automatic, never implicitly all-history. The range is not capped: rebuilding a whole history in
one Import is a legitimate use.
**Incremental**: within the chosen scope, only Games not already retained are fetched and
analyzed; re-importing an overlapping scope adds nothing already present. Once a Game has been
analyzed, its Moves' Evaluations are retained and never recomputed. This is what makes an Import
**safe to re-run**: recovering from a partial Import means replaying the same range, not resuming
it.
_Avoid_: Sync, Fetch, Backfill

**Monthly import**:
One month's slice of an Import — the unit the Player is shown progress and outcome by. An Import
covers its months **one at a time, in order**, and reports each as its own line: how many Games it
brought in, how many were already retained, and whether chess.com could be reached for that month
at all. A month that fails does **not** abort the Import: the remaining months are still covered,
and the failure is carried on that month's line rather than as a global verdict — an Import whose
months mostly succeeded is not a failed Import. A month the Player was simply inactive in is
reported the same way as any other, at zero, which is why the per-month lines exist at all: a gap
in the history must be distinguishable from a gap in the fetching.
_Avoid_: Import batch, Chunk, Archive (chess.com's own word for the underlying endpoint)
