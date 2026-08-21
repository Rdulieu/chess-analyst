# The Profile partitions the data, it does not relate it

The app was **implicitly single-player**: `settings` held one chess.com username, `games` had no
owner, and every aggregate — `move_habits`, `/stats`, `/openings`, `/danger`, `evaluations` — was
computed over *all* rows. Studying a second player (a friend's account, or the same person on
Lichess once US-12 lands) would silently blend two histories and falsify every figure.

We introduce the **`Profile`** — one account on one platform, the pair (platform, username) — as a
**partition key**, not as a relation. Every `Game` carries a `profile_id`, and so does every
aggregate derived from Games. **Nothing is shared across Profiles.** A match played between two
followed accounts is stored **twice**, once under each Profile, each row recorded from its own
Player's side (`player_color`, `result` and `opponent` are opposite from one to the other). Game
identity becomes unique on `(profile_id, game_url)` rather than on `game_url` alone.

The alternative — one `Game` row plus a `game_profiles` link table carrying what is
player-relative — is the normalised model, and we rejected it deliberately. It buys the removal of
a duplication that is close to theoretical: two accounts on different platforms cannot have faced
each other at all, and two chess.com accounts of the same person playing each other is marginal.
It charges for that a join on `move_habits`, `/stats`, `/openings` and `/danger`, the loss of three
columns every read path uses today, and a rewrite of all of it. Partitioning instead makes every
scoped query a `WHERE profile_id = ?` and leaves the existing model intact.

The partition is also **what the feature is for**: a Profile exists to isolate one player's
habits. A model that relates rather than partitions would make leakage a bug waiting to happen;
this one makes it structurally impossible.

## Duplicated engine work, accepted and tracked

Partitioning means the same Position can be evaluated more than once, and we accept it **with our
eyes open**, because engine time is the one expensive asset here. Two distinct duplications, only
one of which this decision creates:

- **Pre-existing**, unchanged by this ADR: `evaluations` are keyed on `(game_id, ply)`, so a
  Position recurring across a Profile's own Games — every opening position, by construction — is
  re-evaluated in each Game. Already true before Profiles existed.
- **Added** by this ADR: a Game shared by two followed Profiles is two rows, so it is analyzed
  twice, end to end.

The way out, if the cost ever becomes real, is a **FEN-keyed evaluation cache** consulted before
calling the engine — ADR-0012 already stores the FEN beside each Evaluation, so the input is
there. We are not building it now: it introduces a second source of truth for Evaluations and a
coherence question (search depth, engine version) that does not exist today, to save work in a
case that is rare. It is an optimisation, not a structural change, and it can be added later
without touching this partitioning.

## Considered options

- **`game_profiles` link table, one `Game` row shared.** Rejected: normalisation cost paid across
  every read path for a duplication that is marginal in practice. See above.
- **A `Profile` as a free label grouping several accounts** (one "me" spanning chess.com and
  Lichess). Rejected: a Profile would then carry no username, so Import would need to pick an
  account, and consolidated stats would double-count a game played between two of the grouped
  accounts. If consolidating ever becomes a need, it is a grouping *above* Profiles — additive,
  and not a change to what a Profile is.
- **Sharing `Evaluation`s across Profiles from the start** (a global FEN-keyed table). Rejected as
  premature, and against the partitioning rule that makes the feature trustworthy. Kept as the
  documented escape hatch above.

## Consequences

- `games`, `move_habits` and `analysis_passes` gain a `profile_id`; `move_habits`' primary key
  gains it too. `evaluations` does not need one — it hangs off `games` through `game_id`.
- Existing data is **migrated, not wiped** (see ADR-0015): the 166 imported Games all belong to
  `DudulSmash` and are assigned to that Profile.
- The same match appearing twice in the database is **expected behaviour**, not a dedup bug.
