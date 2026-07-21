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

**Weak opening**:
An Opening the player has played **as a given side, within a given time control category**
(White Sicilian in blitz and White Sicilian in rapid are two separate entries), shown with its
win rate and the number of games it's based on. Win rate uses standard chess scoring:
`(wins + 0.5 × draws) / games`. Openings with a win rate under 50% are highlighted for review.
No minimum sample size is enforced — the game count is always shown alongside the rate so the
player can judge its significance themselves.
_Avoid_: Weak spot, Weakness, Problem area

**Danger position**:
A recurring Position, scoped to a single time control category, shown with two figures: how many
times the player has reached it, and in what proportion of those times a Mistake occurred within
the following 10 moves. No minimum sample size is enforced — the occurrence count is always
shown alongside the proportion so the player can judge its significance themselves.
_Avoid_: Dangerous position, Trap

**Import**:
The act of fetching the Player's Games from the chess.com public API by username. Triggered
**manually** by the Player and **scoped** to a chosen **single month** (month/year, matching one
chess.com monthly archive) and a chosen set of **time control categories** (any subset of bullet,
blitz, rapid, daily) — never automatic, never implicitly all-history.
**Incremental**: within the chosen scope, only Games not already retained are fetched and
analyzed; re-importing an overlapping scope adds nothing already present. Once a Game has been
analyzed, its Moves' Evaluations are retained and never recomputed.
_Avoid_: Sync, Fetch
