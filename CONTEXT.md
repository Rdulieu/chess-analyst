# chess-analyst

Solo tool that imports the chess.com game history of one or more `Profile`s — the user's own, and
those of friends whose play they want to study — and helps find where each can improve —
which openings, which recurring positions — by combining engine evaluation and personal
statistics, through an interactive board to navigate the history.

## Language

**Profile**:
**One account on one chess platform** — the pair (platform, username), e.g. `Rdulieu` on
chess.com. It is the **unit of partitioning**: every Game, and every aggregate derived from Games
(`Move habit`s, `Weak opening`s, `Danger position`s, `Evaluation`s, the stats view), belongs to
exactly one Profile, and **nothing is ever shared or merged across Profiles**. The tool holds
several — the person using it, and the friends whose play they want to study — and exactly one is
**selected** at a time; the selected Profile is what every view is about, and it is named on
screen wherever it matters.
The same account on two platforms is two Profiles, and a Profile never groups several accounts:
if consolidating a person's accounts becomes a need, it would be a grouping *above* Profiles, not
a change to what a Profile is.
_Avoid_: Account, User, Owner, Player (a Profile is an identity, not a point of view)

**Player**:
The person behind the **selected `Profile`** — the one who played the Games under it. Not
necessarily the person using the tool: a Profile may be a friend's. `Player` carries no identity
of its own (that is the `Profile`'s job); it is the **point of view** every figure is expressed
from. A Game's `opponent` is whoever the Player faced, its result is scored from the Player's
side, and Mistakes, Weak openings and Danger positions are only ever computed for the Player.
The same Game imported under two Profiles has two Players, so `player_color` and `result` are
opposite from one to the other.
_Avoid_: User, Me, Account, Owner

**Game**:
A complete chess.com match imported **under a `Profile`**, with its PGN, the opponent, the **side the
Player played** (White or Black), the **result from the Player's side** (win, loss, or draw),
the date, and the **time control category** (bullet, blitz, rapid, or daily — chess.com's own
classification). Identified across imports by its chess.com game URL, which is unique and
immutable **within its Profile** — the same match imported under two Profiles is two Games, each
recorded from its own Player's side.
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
already separates White-to-move from Black-to-move). It is however, like every aggregate,
**scoped to one `Profile`**: "a property of the Position" means of the Position *as this Player
keeps reaching it*, never of the Position across Profiles. Shown with two figures: how many times the
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
The act of running the chess engine over a chosen set of **one `Profile`'s** Games to produce and retain their
`Evaluation`s — one per `Position` of each Game. Triggered **manually** by the Player (from the
Game list, or for a single Game while reviewing it) and **never automatic**, like `Import`.
**Incremental**: a Game already analyzed is skipped, and its Evaluations are never recomputed — with
one deliberate exception: a Game whose stored Evaluations came from a different `Search regime` is
re-evaluated **whole** rather than resumed, since mixing regimes inside one Game would corrupt its
figures (see `Search regime`).
A pass advances in **Positions evaluated**, and always ends in one of three **outcomes**, which
the Player is told explicitly rather than left to infer: **completed** (every Position of every
Game in the pass was evaluated), **interrupted** (the pass stopped before the end without
failing — the app was shut down mid-pass), or **failed** (the engine errored). An interrupted or
failed pass keeps whatever Evaluations it had already retained; re-running a pass resumes from
the Games still unanalyzed.
_Avoid_: Analysis (too vague), Scan, Job, Batch

**Import**:
The act of fetching a `Profile`'s Games from its platform's public API. It is always **an
operation on one Profile** — the account to fetch is the Profile's own, never something chosen at
import time — and the Games it brings in belong to that Profile alone. Triggered
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

**Best line**:
The engine's best continuation from a Position — the **whole line**, not just its first move. It is
what turns an `Evaluation` from a number into something a Player can check: the line says what the
engine thinks should happen, move by move. It does double duty and needs no companion term: the
**refutation** of a Move the Player played is simply the Best line of the Position **after** that
Move (it starts with the opponent's best reply, and shows how the Move is punished), while the Best
line of the Position **before** it is what the Player should have played instead. Both come out of
the same search the `Analysis pass` already runs.
_Avoid_: PV, Principal variation (implementation vocabulary), Solution, Best move (it is a line, not
a move)

**Phase**:
How far a Game has got: **Early game**, **Middlegame**, or **Endgame**. Deliberately *not* called
"opening" — `Opening` already names the ECO-classified line the Game followed, which is a different
claim: a Game can leave its `Opening` at move 6 and still be in the Early game at move 12.

- **Early game** ends at the earlier of **development complete** (all four minors off their home
  squares and the king castled or having lost the right) or a hard cap at **move 15**, so a passive
  Game cannot claim to still be starting after forty moves.
- **Endgame** begins when the majors and minors on the board — both sides combined — drop to **six
  or fewer**.
- **Middlegame** is everything in between, defined by exclusion on purpose (same discipline as
  `Drift`).

A Phase is a property of a Position **in its Game's sequence**, not of the Position alone: it
**latches**, so a Game that has reached the Endgame stays there. Without latching a promotion —
the one thing that *adds* material — would flip a Game out of the Endgame and back in. These
boundaries are heuristics, not facts, which is why the Phase is shown on every Move of a reviewed
Game: the Player can see where the boundaries fell in a real Game of theirs and disagree.
_Avoid_: Opening (taken, and means something else), Stage, Game stage

**Counted Move**:
One of the Player's Moves that the analysis actually **counts** — the denominator of everything this
tool concludes about where the Player goes wrong. A Move is **not** counted when it could say
nothing about the Player's play:

- its Position was **already decided** — one side's winning chances were past the competitive band,
  so `winningChances` had nothing left to lose and a weak Move there costs nothing measurable;
- it was **forced** — there was no real alternative, so playing it earns neither credit nor blame.

The distinction exists because a Game where the Player played four `Blunder`s can legitimately
contribute **zero** counted errors (all four came after the Game was lost). That gap between what a
Game shows and what it contributes is exactly what a Player must be able to see, so a reviewed Game
states, for each of the Player's Moves, whether it is counted and — when it is not — which of the
two reasons applies.
_Avoid_: Valid move, Eligible move, Scored move

**Drift**:
The share of the winning chances a Player lost across a Game that **no flagged Move accounts for**:
everything lost, minus what the `Inaccuracy`/`Mistake`/`Blunder` Moves lost. A **residual**, not an
object — there is no "drift Move" and no drift episode with a start and an end. The two parts add up
to the total by construction, which is what lets a Game's figures be summed without counting the
same lost chances twice.
Drift is what a threshold-based reading of a Game is structurally blind to: bleeding 5% a Move for
fifteen Moves never trips the `Inaccuracy` floor, yet loses the Game as surely as one `Blunder`. On
a Game's `Evaluation curve` the flagged Moves are the cliffs and the Drift is the slope between
them.
_Avoid_: Slow loss, Positional error, Accumulation

**Search regime**:
What an `Analysis pass` ran the engine under — its **depth** and how many **lines** it searched.
Carried by the pass, so every `Evaluation` can be read back to the conditions that produced it. It
is what makes an `Evaluation` a claim rather than a bare number: depth 16 in a sharp middlegame and
depth 16 in a rook endgame do not deserve equal confidence, and a `Drift` figure — a sum of many
small `Evaluation` differences — is only comparable across Games analyzed under the **same** regime.
Because of that, a pass resuming a Game whose stored `Evaluation`s came from a different regime
**re-evaluates the Game whole** rather than continuing it, so that no single Game's figures ever mix
regimes.
_Avoid_: Settings, Config, Engine params

**Review mode**:
How much of what the engine found is shown while the Player reviews a Game — the Player's own
choice, in three levels:

- **Unaided**: nothing from the engine. The board, the Moves and their notation, and nothing else.
  The Player reads the Game on their own.
- **Annotated**: the flawed Moves' severities, the `Evaluation`s, the advantage bar and the
  `Evaluation curve` — what the Game's `Evaluation`s say, Move by Move and as a whole.
- **Detailed**: also the reviewed Move's own record — its `Best line`, the refutation, what the Move
  cost, its `Phase`, and whether it is a `Counted Move`.

The default is **Unaided**: a Game is opened to be read, and the engine's verdict is something the
Player asks for rather than something the app volunteers. The choice is remembered, so it is made
once and not on every Game. One exception, because it answers a question the Player actually asked:
completing an `Analysis pass` on the Game being reviewed moves that review to **Annotated** — the
pass was requested to produce something to look at, and finishing it silently would leave the Player
unable to tell a completed pass from one that did nothing.

A Review mode governs **display only**. It changes nothing about what was computed or stored, and it
is not a guarantee about what the Player has already seen — a Player who read the annotations and
then switched to Unaided has still seen them.
_Avoid_: Blind mode (describes a restriction this does not enforce), View, Display level, Verbosity
