# chess-analyst

Solo tool that imports a player's chess.com game history and helps them find where to improve —
which openings, which recurring positions — by combining engine evaluation and personal
statistics, through an interactive board to navigate the history.

## Language

**Game**:
A complete chess.com match imported for the player, with its PGN, opponent, result, and date.
_Avoid_: Match, Party

**Opening**:
The named sequence of initial moves a game follows, identified by its ECO code.
_Avoid_: Début, Line

**Position**:
A specific arrangement of pieces on the board at a given ply of a game, identified by its FEN.
_Avoid_: Board state, State

**Ply**:
A single half-move played by one side within a game.
_Avoid_: Turn, Move (when the side isn't specified)

**Evaluation**:
The chess engine's numeric assessment of a position (centipawns, or mate-in-N).
_Avoid_: Score (ambiguous with the game's result)

**Mistake**:
A ply whose evaluation drop against the engine's best move exceeds a threshold, flagged for
review.
_Avoid_: Blunder (reserve for the most severe mistakes only, if the distinction matters later), Error

**Weak spot**:
An opening or a recurring position where the player's win rate and/or engine evaluation signal
room for improvement — the combination of statistics and evaluation is what qualifies it.
_Avoid_: Weakness, Problem area

**Import**:
The act of fetching a player's game history from the chess.com public API by username.
_Avoid_: Sync, Fetch
