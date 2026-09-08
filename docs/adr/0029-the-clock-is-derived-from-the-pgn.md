# The clock is derived from the PGN, never stored translated

Without this, a competent agent would add a translated `clocks` column filled by the platform
adapter — ADR-0018 recommends exactly that ("the adapter translates, nothing above it sees a
payload"), Lichess's JSON array rewards it with centisecond precision the PGN does not carry, and
neither the compiler, the tests, nor a reading of the code would object. **The decision is the
opposite**: a `Move`'s `Clock` is read from the PGN's `[%clk]` comment, and the `Time control` from
the PGN's `[TimeControl]` header. No column carries either.

**Why: the PGN is already stored raw and untranslated, and it already holds this fact for 1817 of
the 2417 Games in the corpus.** A column would be a *second* source of truth for something the
stored PGN carries anyway — the PGN keeps its comments whatever we decide — so the duplication the
column is meant to avoid exists on both paths, and only the derived path has one writer.

**The cost is a measured loss of precision, and it is accepted rather than overlooked.** Lichess's
`clocks` array is in centiseconds while its PGN rounds to the nearest second (180.03 → `0:03:00`,
179.71 → `0:03:00`, 66.75 → `0:01:07`); chess.com's PGN carries tenths (`0:01:00.8`). So a derived
`Time spent` — a difference of two readings — is accurate to ±0.2 s on chess.com and only ±1 s on
Lichess. That asymmetry between `Platform`s is real and is not a bug to be fixed later.

## Consequences

- **This is a deliberate tension with ADR-0018.** The translation of `[TimeControl]`'s four
  spellings — chess.com's `300`, `180+2`, `1/86400` and Lichess's `600+5`, `2 days per move` — lives
  in a derivation module rather than in the adapters. It is **one named function**, called from every
  entry point, never inlined twice.
- **One exception, and only one.** Lichess's array holds one reading more than there are `Move`s
  whenever a Game ended **without the side to move playing** (resignation, agreement, abandonment;
  never on mate — measured on eight Games, four terminations). That last reading belongs to no
  `Move` and is **absent from the PGN entirely**, so it is the single clock value that *is* stored.
  It is null for every chess.com Game — the platform exposes no equivalent — and null on every mate.
- **A comment can hold several tokens.** `cm-chess` returns `commentAfter` as one string, which is
  `"[%eval 0.18] [%clk 0:03:00]"` on a Lichess Game somebody analysed. Reading the clock is a token
  extraction, not "the comment is the clock".
