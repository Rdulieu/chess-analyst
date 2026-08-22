# An `Analysis pass` records what it searched under

US-15a needs the engine's **`Best line`** — every claim of the form "you missed something" is a claim
about the gap between the Move played and the best Move, so without the line there is nothing to
say. It is already computed and thrown away: `uci-driver.ts` collects every `info` line of the search
and `parseEvaluation` keeps the score and `bestmove`, discarding the ` pv …` sitting in the same
lines. Storing it therefore costs **no engine time at all**.

We store, per analyzed Position: the **whole PV in UCI** (one column — the best Move is its head, so
a second column could only disagree with it), and the **second line's score** (`cp2`/`mate2`, no
second PV: the gap `eval(best) − eval(2nd)` is all it is wanted for). And we record, on the **pass**,
the **`Search regime`** it ran under — its depth and how many lines it searched — which requires
giving `evaluations` a **`pass_id`**, the relationship that does not exist today
(`analysis_passes.game_ids` is a JSON array, so no row can currently be joined to the pass that
wrote it).

**Why provenance at all**, since it is the surprising part. Two reasons are durable. First, it is
what makes the methodology **self-describing**, which is US-15's own requirement (ADR-0017): "best
was Bxh7+, +1.9" is a claim, and "at depth 16, two lines" is its warrant — depth 16 in a sharp
middlegame and depth 16 in a rook endgame do not deserve equal confidence. Today the depth lives in a
code constant and appears nowhere in the data, so nothing displayed can state it without asserting it
out of band. Second, ADR-0009's central promise — retune the thresholds with no engine re-run — is
only true if a row can say what produced it; the day the depth constant changes, the table becomes
silently heterogeneous with no way to detect it afterwards. That matters most for `Drift`, a **sum of
many small `Evaluation` differences** and so the most depth-sensitive figure we compute: mix depth 14
and depth 16 rows and "my drift improved" becomes an artefact of *when* each Game was analyzed.

There is also an immediate trap it defuses. During US-15a's MultiPV measurement two regimes exist on
purpose (some Games with a second line, most without), and "no second line" is precisely how a
**forced position** is recognised — the exclusion that keeps `Counted Move`'s denominator honest.
Without provenance those two are indistinguishable, so Moves would be dropped from the denominator
by the hundred for having been analyzed early. Wrong numbers, no exception raised, invisible to the
eye.

## Considered options

- **Provenance on every `evaluations` row** (denormalised). Simple, needs no new relationship, and is
  indifferent to which pass wrote which ply. Rejected: it repeats the same two values tens of
  thousands of times, and the natural home for "what settings did this run use" is the run.
- **No provenance; keep the table homogeneous by wiping and re-analyzing at each change.** Rejected
  twice over: ADR-0015 has since retired wiping outright, and homogeneity is a property someone must
  *remember* to maintain, where provenance is one anybody can *read*.
- **Provenance on the pass, with `evaluations.pass_id` (chosen).** Normalised, and it repairs
  something already missing: ADR-0011's interrupted/failed semantics cannot today tell a partial
  pass's rows from a complete one's, and progress counts rows written by *earlier* passes as the
  current one's work.

## Consequences

- **A Game's rows may legitimately carry two different `pass_id`s.** `analyzeGame` deliberately
  resumes mid-Game — it counts stored rows and restarts at the first missing ply, so no engine time
  is ever spent twice. Provenance is therefore well-defined **per row**, never per Game; the join is
  `row → pass`.
- **`CONTEXT.md`'s "Evaluations are never recomputed" gains an exception**, and it is amended rather
  than left in contradiction: a pass resuming a Game whose stored Evaluations came from a *different*
  regime re-evaluates that Game **whole**, because mixing regimes inside one Game would corrupt
  exactly the figure — `Drift` — that summing plies produces.
- **That exception overwrites computed Evaluations, which ADR-0015 requires us to name rather than
  slip in.** It is real data loss, accepted only because a Game whose figures silently mix two
  regimes is worse than a Game re-analyzed: the first is wrong without saying so. It stays bounded by
  being **Player-triggered** like every engine run in this app (`CONTEXT.md`, `Analysis pass`), never
  a silent background repair.
- **The existing 1199 Evaluations are discarded, and `pv` is required.** This is a deliberate
  exception to ADR-0015 (see the note added there). Keeping them was the first plan — a synthetic pass
  row carrying their real regime, depth 16 and one line, with a null `pv` since **no replay can
  recover a line** (unlike ADR-0012's FENs, recoverable from the PGN, which is why that repair could
  be automatic and this one cannot). It was dropped because the cost is not the migration script: it
  is a **permanent** null-`pv` branch — a degraded state in the record panel, a message explaining it,
  and tests for both — living forever to serve **20 Games worth ~11 minutes of engine time**. ADR-0015
  weighed a bounded migration against an unbounded recurring engine cost; here the ratio is inverted,
  and it is the *code* that would carry the recurring cost. The scope is narrow and stays narrow: the
  `evaluations` rows of those Games, **not the database** — Profiles, Games, PGNs, openings and
  `move_habits` are untouched, and rebuilding is a Player-triggered pass over Games already imported.
- Storage: the whole PV is ~120 bytes per row, ~5 MB for a year of play — the same order as the 3 MB
  ADR-0012 accepted. The line is stored **entire and in UCI**: truncating it "to what we display"
  would bake a presentation decision into the data, which is what ADR-0009 exists to prevent, and
  SAN is a rendering of it (one Game's replay, on demand — not ADR-0012's every-Game-every-request
  problem).
- **MultiPV=2 costs real engine time** (expected 1.3–1.8× on a pass already taking ~2 h 30 for 271
  Games) and is kept deliberately: re-analysis is the once-per-Game expense, so buying it during a
  re-analysis we are doing anyway is far cheaper than a third pass later. US-15a owes the **measured**
  ratio — under 1.5× it stands, between 1.5× and 2× the decision comes back to the Player, past 2× the
  method is reconsidered. Depth is **not** the adjustment knob: ADR-0009 fixed depth 16 for
  reproducibility, and lowering it would worsen the noise on precisely the `Drift` figure US-15 exists
  to make trustworthy.
