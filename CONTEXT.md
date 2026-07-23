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
The named sequence of initial moves a game follows, identified by its ECO code.
_Avoid_: Début, Line

**Position**:
A specific arrangement of pieces on the board at a given move of a game, identified by its FEN.
_Avoid_: Board state, State

**Move**:
A single half-move played by one side within a game.
_Avoid_: Ply, Turn

**Evaluation**:
The chess engine's numeric assessment of a position (centipawns, or mate-in-N).
_Avoid_: Score (ambiguous with the game's result)

**Mistake**:
One of **the player's own** moves whose evaluation drop against the engine's best move exceeds a
threshold, flagged for review. Never computed for the opponent's moves — this tool is about the
player's own improvement.
_Avoid_: Blunder (reserve for the most severe mistakes only, if the distinction matters later), Error

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
A recurring Position, scoped to a single time control category, shown with two figures: how many
times the player has reached it, and in what proportion of those times a Mistake occurred within
the following 10 moves. No minimum sample size is enforced — the occurrence count is always
shown alongside the proportion so the player can judge its significance themselves.
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

**Import**:
The act of fetching the Player's Games from the chess.com public API by username. Triggered
**manually** by the Player and **scoped** to a chosen **single month** (month/year, matching one
chess.com monthly archive) and a chosen set of **time control categories** (any subset of bullet,
blitz, rapid, daily) — never automatic, never implicitly all-history.
**Incremental**: within the chosen scope, only Games not already retained are fetched and
analyzed; re-importing an overlapping scope adds nothing already present. Once a Game has been
analyzed, its Moves' Evaluations are retained and never recomputed.
_Avoid_: Sync, Fetch
