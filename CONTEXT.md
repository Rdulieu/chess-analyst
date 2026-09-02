# chess-analyst

Solo tool that imports the game history of one or more `Profile`s from their chess `Platform` — the user's own, and
those of friends whose play they want to study — and helps find where each can improve —
which openings, which recurring positions — by combining engine evaluation and personal
statistics, through an interactive board to navigate the history.

## Language

**Platform**:
The chess site a `Profile`'s account lives on and whose public API an `Import` fetches from —
**chess.com** or **lichess.org**. It is an **attribute of the Profile**, fixed when the Profile is
created, and never a parameter of an Import: there is no screen on which the Player chooses a
source. A Platform is what makes two accounts of the same name two different Profiles, and it is
**named on screen wherever an account is** — in the current-Profile banner, in the Profile list,
and on the import screen, so the Player always knows which site they are about to fetch from.
Platforms are **not interchangeable in what they answer**: the same domain concepts (`Game`,
`Opening`, time control category) come back in each Platform's own shape and own vocabulary, and
reconciling them is the translation `Import` owns.
_Avoid_: Source, Provider, Site, Server (Lichess's own word for its backend)

**Profile**:
**One account on one chess `Platform`** — the pair (platform, username), e.g. `Rdulieu` on
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
A match of **standard chess from the initial position**, played on a `Platform` and imported
**under a `Profile`**, with its PGN, the
opponent, the **side the Player played** (White or Black), the **result from the Player's side**
(win, loss, or draw), the **date the `Platform` files it under**, and the
**`Time control category`**. That date is deliberately not "the end" nor "the start" in the
abstract: it is whichever instant the Platform itself buckets the match by — its end on chess.com,
its start on Lichess. What matters is that each Platform stays **consistent with itself**, so a
Game's date always falls inside the `Monthly import` that brought it in, and "I imported months X
to Y" means "I have every Game dated X to Y". Only a correspondence game can straddle a month
boundary at all, so this is the difference between a rare mismatch and a silently missing Game. Identified across imports by
its **URL on its Platform** — one canonical URL per match, whichever way the Platform happens to
spell it — which is unique and immutable **within its Profile** — the same match imported under two Profiles is two Games, each
recorded from its own Player's side.
_Avoid_: Match, Party

**Time control category**:
The pace a `Game` was played at, in **our own** five-value vocabulary — `bullet`, `blitz`,
`rapid`, `classical`, `correspondence` — not a `Platform`'s. Each Platform's own classification is
**translated into it at import**, and the translation is deliberately not one-to-one:
- Lichess's `ultraBullet` becomes `bullet`: sub-30-second chess is the same thing we study under
  bullet — reflexes — and no Platform-neutral question distinguishes them.
- chess.com's `daily` and Lichess's `correspondence` are **the same concept under two words**, and
  `correspondence` is the one the game itself uses, so it is the canonical name.
- Lichess's `classical` gets its **own** value, because it has no honest home: folded into `rapid`
  it would average a 10-minute game with a 60-minute one, folded into `correspondence` it would mix
  real-time play with move-a-day play. A category exists to make an aggregate comparable; one that
  merges incomparable paces defeats its own purpose.
Games a Platform classifies outside these are not translated, they are **out of an Import's scope**
and never become Games at all: a variant such as chess960, and equally a normal-rules game started
from an arbitrary position (Lichess's `fromPosition`), which our FEN- and ECO-keyed aggregates all
assume away. **Games against the computer are out of scope too**, for a different reason: the
opponent is not an account, and every aggregate here asks a question about play against people.
chess.com never exposes them at all, so importing Lichess's would make two Profiles silently
incomparable. That is the line: a pace we lack a word for is worth a new word; a game that is not
the game is worth nothing. A game that *was* the game but ended before it began — aborted, no
moves — **is** imported, from either Platform alike, and lands in the `Other` opening bucket;
dropping it on one Platform only would make two Profiles silently incomparable.
_Avoid_: Time class (chess.com's field name), Perf / perfType (Lichess's), Cadence, Speed, Daily

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
The three names are a **scale with two authors**. The bands above define the **measured** value —
the engine's, computed from the `Evaluation`s. The `Player` may also **declare** one of the same
three, by hand, in their `Personal analysis` (see `Declared severity`), and the shared vocabulary is
deliberate: setting the two side by side is only meaningful on identical labels. The bands define
how the measured value is obtained, never what the word means.

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
each `Time control category` — the `Win rate` itself is computed
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
The act of fetching a `Profile`'s Games from its `Platform`'s public API. It is always **an
operation on one Profile** — the account *and* the Platform to fetch from are the Profile's own,
neither ever chosen at import time, though the import screen **names** the Platform it will use —
and the Games it brings in belong to that Profile alone. Triggered
**manually** by the Player and **scoped** to a **contiguous range of months** (a first and a last
month — a single month is simply a range of one) and
a chosen set of **`Time control category`s** (any subset of the five) — never
automatic, never implicitly all-history. The range is not capped: rebuilding a whole history in
one Import is a legitimate use.
**Incremental**: within the chosen scope, only Games not already retained are fetched and
analyzed; re-importing an overlapping scope adds nothing already present. Once a Game has been
analyzed, its Moves' Evaluations are retained and never recomputed. This is what makes an Import
**safe to re-run**: recovering from a partial Import means replaying the same range, not resuming
it.
_Avoid_: Sync, Fetch, Backfill

**Monthly import**:
One month's slice of an Import — the unit the Player is shown progress and outcome by, and **our**
unit rather than a `Platform`'s: the calendar month, in UTC (the reference `Game.date` already
uses). The month is the unit of **reporting**, not of fetching: it is what the Player is
shown, and each Platform is asked for a range in whatever shape that Platform actually serves.
chess.com serves monthly archives and is asked month by month; Lichess serves a date range and is
asked once for the whole of it. An Import covers its months **in order** and reports each as its own
line: how many Games it brought in, how many were already retained, and whether the `Platform` could
be reached for that month at all. A month that fails does **not** abort the Import: the months
already covered stay covered, and the failure is carried on the affected months' lines rather than as
a global verdict — an Import whose months mostly succeeded is not a failed Import. Where a Platform
answers a whole range at once, "which months were covered" is read off the Games as they arrive,
in date order: every month up to the last Game received is covered, and the months after the
interruption are the ones reported as not fetched. A month the Player was simply inactive in is
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

The two reasons behave differently, and the difference matters. **Already decided** can never hide a
flawed Move: flagging one requires a 10% drop, so it requires 10% left to lose, and a Position under
that floor cannot produce an `Inaccuracy` at all. That exclusion only ever shrinks the **denominator**
— which is its purpose. **Forced**, on the other hand, can exclude a Move that *is* flagged: a sole
legal move that happens to be a catastrophic recapture drops the chances like any `Blunder`, and is
still nobody's mistake. That is the case where what a Game shows and what it contributes visibly
disagree, so a reviewed Game states, for each of the Player's Moves, whether it is counted and —
when it is not — which of the two reasons applies.
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

**Personal analysis** (fr. « Analyse personnelle »):
What the `Player` themself reads in a `Game`, written down — as opposed to what the engine found.
One `Game` carries **at most one** Personal analysis, **scoped to its `Profile`** (ADR-0014): the
reading of a friend's Game belongs to that friend's Profile, and readings are never merged across
Profiles.
It is deliberately **not** a kind of `Analysis pass`, and the two share nothing but the word: a pass
is the engine's, is mechanical, is re-runnable, and its output can always be rebuilt by spending
engine time again. A Personal analysis is the Player's, is written by hand, and has **no upstream at
all** — nothing can rebuild it (ADR-0015 applies in full).
Its purpose is to make the Player **work**: the reading is done first and unaided, and only then set
against the engine's. Which is why it states a reading, never a truth — where it disagrees with the
engine, what stands is a **divergence**, never a ruling on who is wrong.
A Personal analysis is **sealed**, by an explicit act of the Player: *this is my reading, now show me
the engine's*. Sealing does two things and only two — it opens the confrontation, and it **fixes what
is confronted**. What the Player writes afterwards is kept as a layer **posterior to the reveal**,
shown as such, and never part of the comparison: seeing the engine and understanding why is the most
fertile moment of the exercise, so forbidding it would be absurd — and counting it would be
dishonest.
Beside the seal, a Personal analysis carries whether the engine's findings **had already been shown
for that Game** before it was sealed, so a comparison is always labelled — read **unaided**, or read
**informed**. That is a **provenance, not a lock**: the app cannot make anyone blind (the Player can
open another tab), and claiming otherwise would sell a guarantee it cannot keep — the very mistake
`Review mode` refused when it rejected the name *Blind mode*. The consequence is deliberate and worth
naming: on this one fact, and only this one, what was displayed is **persisted**, where `Review mode`
itself stays a local display choice the server has no opinion on. A comparison with no provenance is
not a comparison.

_Avoid_: Analysis (bare — it is the `Analysis pass`'s forbidden shortening), Annotation (the
engine's per-Move record), Review (that is the `Review mode`'s display level), Study (Lichess's own
word for a shared, multi-game object)

**Note**:
Free text the `Player` attaches to a `Move` (or to a Game's starting Position) inside their
`Personal analysis` — where they say *why*. It is the part of a Personal analysis that is
**deliberately not comparable** to anything the engine produces, and that is its worth: it is where
the Player thinks, not where they are scored. Nothing ever grades a Note.
_Avoid_: Comment (PGN's own word for the container we may store it in), Remark, Annotation (the
engine's per-Move record)

**Candidate line**:
A continuation the `Player` proposes from a Position inside their `Personal analysis` — what they
believe should have been played instead of a Move of theirs, or how they would have met a Move of
the opponent's. It is the deliberate counterpart of `Best line`: **same shape** (a line from a
Position), **different author**. That symmetry is the whole point — it makes the confrontation a
comparison of two lines from the same Position, needing no further apparatus.
A Candidate line is confronted **by what it costs, never by whether it matches**. Textual
coincidence with the `Best line` — same first Move? — would be free, and would declare an idea wrong
for losing 2% of the winning chances while declaring a copied Move right. It would teach imitation.
So the Position a Candidate line reaches is evaluated and set against the one the Best line reaches,
on the same winning-chances scale everything else here uses (see `Line check`). A Move that is not
the best but drops less than 10% is not a fault — the glossary already says so of Moves *played*, and
an idea merely *proposed* cannot be judged more harshly than one played for real.
_Avoid_: Variation (PGN's structural word for the same thing — kept for the storage format, not for
the concept), My line, Alternative

**Key moment**:
A `Move` the `Player` declares, in their `Personal analysis`, to be **where the Game turned**. Not
"a good Move" and not "a flawed Move": a pivot. It is attached to a Move rather than floating
between them, so that two readings of the same Game can be set side by side at all.
It is the one part of a Personal analysis that confronts the engine on a **place** rather than on a
judgement: what the engine's figures situate (the cliffs of the `Evaluation curve`, where the
`Drift` accumulated) can be set against where the Player situates it, and a disagreement is a
disagreement about **where to look** — which is teachable — rather than a verdict on who is right.
It collides with nothing already defined: a `Danger position` is a **recurrence** across Games, a
`Move habit` a **frequency**, a `Counted Move` a **mechanical eligibility**. A Key moment is a
**claim by the Player about one Game**.
A Personal analysis may hold **several** Key moments, and they are not ranked: the Player is not
asked to pick one.

Key moments are confronted against **the Player's own flawed Moves**, ranked by the winning chances
they lost — never against the Game's biggest swing, which may well be the *opponent*'s blunder and
would fault the Player for missing a gift. The measure is **what share of the damage they found**:
the chances lost by the flawed Moves the Key moments point at, over the chances lost by **all** the
Player's flawed Moves in that Game. One division, in the currency everything else here already uses,
and no new scale.
That quotient carries partial credit by construction — pointing at the worst fault scores much, at a
small one little, at a Move that cost nothing zero — which is why several Key moments need no special
rule: a Move counts **once**, so adding markers cannot inflate the score beyond what they genuinely
name.
Its denominator excludes `Drift`, deliberately: Drift **has no Move to point at**, so counting it
would put 100% out of reach of a perfect reading. Drift is reported **beside** the score instead,
which is where it teaches the most — a Game lost by bleeding had no fault to find, and saying so is
the lesson. Where the Player flagged nothing at all, there is **no score**, not a zero: a zero would
make a sound reading look like a failed one.
There is **no tolerance window**. A Key moment one Move away from the loss earns no approximate
credit; the **distance is shown** instead ("your marker is on 21.Rd1, which cost nothing — the loss is
on 22.Nxe5, one Move later"). That says more than silent partial credit, and it keeps the score
additive and free of any magic constant — the clarity of the calculation to the Player being a
requirement of its own here.
_Avoid_: Important move, Critical position, Turning point (rejected in grilling), Highlight

**Declared severity**:
The `Player`'s own verdict on a `Move`, by hand, inside their `Personal analysis` — on the same
scale as the measured severities plus two values the engine has no band for:
`Blunder` (`??`) / `Mistake` (`?`) / `Inaccuracy` (`?!`) / **`Sound`** (`✓`, "I looked, and I find
nothing to fault") / **`Good`** (`!`, "better than it looks").

The three shared values are **written the same way as the measured ones** — the shared vocabulary
is deliberate all the way down to the glyph, for the same reason the labels are shared: setting a
declared verdict beside a measured one is only meaningful on identical marks. The two the engine
has no band for extend the notation rather than borrow it: `!` is chess notation's own sign for a
good Move, and `✓` is deliberately from another family because `Sound` is not a judgement of
quality but a statement of examination. A view that shows **both** authors at once tells them
apart by something other than colour — a column, a heading — never by the glyph alone, which is
by construction identical.

- **`Sound` is what makes the confrontation possible at all.** Without it, "I said nothing here" and
  "I say this Move is fine" would be the same absence, and a comparison could only ever expose the
  Player's misses, never their hits. Same discipline as `Counted Move`: not-faulted **with its
  reason** is a fact; no data is not.
- **Silence stays silence.** A Move with no Declared severity means *not examined*, and that is
  itself worth knowing — a Personal analysis may be partial, and how much of a Game it covers is a
  fact about the reading.
- **`Good` is kept but never scored**: the engine flags flawed Moves only and has no band for merit,
  so there is nothing to set it against. It exists because the Player needs it to read their Game.
- **The Player may declare a severity on an opponent's Move too**, and it is kept and shown like any
  other. It is **never scored** — not for want of the means (the `Evaluation`s are there) but **by
  decision**: severities are computed for the Player's own Moves only, because this tool is about the
  Player's own improvement. Only the Player's own Moves ever meet a measured severity.
_Avoid_: Player severity (reads as a severity belonging to the Player rather than one they assert),
Self-assessment, Guess, Rating, Evaluation (the engine's score on a Position), Annotation (the
engine's per-Move record) — the last two because the slip is recurrent and it inverts the meaning:
asking for "the Player's evaluations, as annotations" reads, taken literally, as a request to put the
engine's record on the Player's own board (ADR-0022)

**Line check**:
Running the engine on the Position a `Candidate line` reaches, so the Player's idea can be priced
rather than matched. **Triggered by the Player, never implicit** — like `Import` and `Analysis pass`
before it.
It is emphatically **not an `Analysis pass`**, and the distinction is load-bearing: a pass produces one
`Evaluation` per Position **of a Game**, and the Position a Candidate line reaches belongs to **no
Game** — no Game ever reached it. Folding line checks into passes would corrupt what "this Game is
analyzed" means and what a pass counts its progress in.
It carries its `Search regime` all the same. Without that, a deep `Best line` would be set against a
shallow reading of the Player's line and the verdict would be an artefact of depth: the comparison is
only honest at equal regime.
_Avoid_: Analysis pass (it is not one), Evaluating (too vague), Verification

**Confrontation**:
Setting a sealed `Personal analysis` against what the engine found, on the same Game. It reports
**three readings side by side and never a single score**: the Player's `Declared severity`s against
the measured ones, their `Key moment`s against the share of the damage they name, their
`Candidate line`s against what those lines cost (`Line check`). A composite would need weights — how
much is *judging well* worth against *looking in the right place*? — and any answer is an arbitrary
constant. Worse, one number can be optimised, and the only way to optimise it is to **imitate the
engine**, which is the one outcome this whole story exists against. The three are tracked over time as
three figures.
The three readings are also not substitutable, and **their disagreement is the diagnosis**: high on
Key moments and low on Declared severities means the Player sees *where* a Game turns but cannot yet
name *what* happens there. A single 60% would have erased that — and "my strengths and weaknesses **in
analysis**" is plural on purpose.
The Declared-severity reading is taken over the Player's **`Counted Move`s**, which is not a new
choice but a consequence of an old one: a Counted Move is already "the denominator of everything this
tool concludes about where the Player goes wrong", and how justly the Player judges is such a
conclusion. It also settles a case that would otherwise be scored backwards — a **forced** Move that
is a catastrophic recapture measures as a `Blunder` yet is "nobody's mistake", so a Player calling it
`Sound` is **right**, and a naive matrix would count them wrong. Moves that are not counted are shown
all the same, with their reason: recognising that a Position is already decided, or that a Move had no
alternative, is itself a thing to learn in analysis.
Two figures, never merged: **coverage** (what share of the Counted Moves the Player examined at all —
silence is not a verdict) and **accuracy** (over those, how justly). A Player who annotates three
Moves and judges them perfectly has 100% accuracy and 10% coverage, and both are true.
Every Confrontation is labelled by the provenance its Personal analysis carries — read **unaided** or
read **informed**.
Across Games, Confrontations **fold** (ADR-0017): a Game's Confrontation carries everything the
aggregate consumes, and the aggregate is a sum — which is what keeps the method auditable one Game at
a time. Two deliberate restraints there. **No axis**: the three figures are folded whole and cut by
nothing. A Personal analysis is written by hand, so the sample is tens of Games where the play
aggregates have thousands, and slicing a handful of readings would say nothing. `Phase` is the axis
that will earn its place first — "I read middlegames well and endgames badly" is actionable, and Phase
is already computed — but only once Phase detection is trusted, which it is not yet. `Opening` and
`Time control category` are not candidates at all: the second confuses playing with analysing, since a
Game is read cold, long after the clock stopped.
The one further fact worth folding costs nothing, because the matrix already holds it: **the direction
of the bias**. The confusion matrix is not symmetric, and its asymmetry reads in a sentence — "what you
call a Blunder, the engine calls a Mistake, seven times in ten". Over-reading danger and under-reading
it are opposite faults of analysis, and none of the three figures separates them alone.
A Confrontation is also, as a **side benefit**, a way to look at *our own* analysis — and the limit of
that has to be stated rather than discovered later. Using Player/engine agreement to judge the engine
assumes the Player is right, which is exactly what is not established. So a disagreement is a
**divergence**: it says *where to look*, never *who is wrong*. It is a signal for us — a Move where a
careful human reader and our figures part ways is worth opening — and never a validation of anything.
Any stronger claim would be one this method cannot keep.
_Avoid_: Comparison (too vague), Correction, Grade, Score (there is no single one)
