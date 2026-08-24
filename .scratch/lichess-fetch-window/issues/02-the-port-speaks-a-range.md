# 02 — The port speaks a range; chess.com absorbs its month loop

Status: `done` — mergée dans l'intégration le 2026-08-24 (merge `d7b36d5`).

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

Reshape the `PlatformClient` port from a month to a **range**, and make it **stream**. A refactoring
slice with nothing visible to show — the precedent is ADR-0018's own first slice, whose value was
entirely in what the next one did not have to fight.

- `fetchMonth(username, year, month)` returning `{ totalFetched, games }` becomes a range-shaped
  method that **yields** neutral `ImportedGame`s as they arrive, in date order.
- **chess.com's adapter absorbs the month loop.** It keeps issuing exactly the same monthly-archive
  requests, in the same order and the same number — the loop simply moves inside the adapter, where
  it describes chess.com rather than constraining every Platform.
- **Lichess's adapter also still loops its months**, for now. Collapsing it to one request is slice
  03; this slice must not change request counts anywhere.
- The neutral `ImportedGame` shape is untouched. What changes is the **unit asked for**, never the
  vocabulary answered in (ADR-0018 decision 1, as amended).

`readNdjson` is already an `AsyncGenerator`; `fetchMonth` is what breaks the stream by materialising
it into an array. This slice stops breaking something that already flowed.

**`totalFetched` must survive.** It counts what the Platform **had**, out-of-scope games included, so
a month mostly full of variants never reads as empty. A generator that only yields in-scope Games
loses that count — carry it, either on a richer yielded item or as the generator's return value.

The service keeps inserting **game by game, deduped by URL**, which is what will later make a partial
import partial rather than lost.

## Acceptance criteria

- [x] The port exposes a range-shaped, streaming method; `fetchMonth` is gone from the port.
- [x] chess.com issues **exactly the same requests** as before — same URLs, same order, same count.
- [x] Lichess issues the same requests as before (one per month); no behaviour change yet.
- [x] `totalFetched` still reports what the Platform had, out-of-scope games included.
- [x] Per-month lines, totals, category tallies and result tallies are byte-identical to before on
      both Platforms.
- [x] The Player's chosen time control categories are still honoured, and filtering still happens
      where it did (the Player's choice, not the adapter's).
- [x] Games are still filed under the Profile the import was run from.
- [x] **The chess.com behaviour tests pass untouched** — that is the assertion, not a side effect.
- [x] Lower tier: the shared fake client becomes generator-producing, and gains the ability to yield
      N Games and then throw (needed by slices 03 and 04).

### Feature Path (FP)

1. Import a month range from a chess.com Profile → the summary, its per-month lines and its totals
   read **exactly as before**.
2. Import a month range from a Lichess Profile → same.
3. A range containing a month with no Games still shows that month at zero.
4. Re-importing the same range adds nothing and reports everything as already present.

Verify: UI first — the import summary as the Player reads it.

## Blocked by

- `.scratch/lichess-fetch-window/issues/01-a-truncated-stream-is-not-a-finished-one.md`

## Ce que la FP a mesuré (2026-08-24)

Un refactor qui promet « rien ne change » exige un **avant observé**, pas un avant supposé :
deux instances ont tourné en parallèle, une par commit (`f4ce647` contre `07bb7a3`), bases et
ports séparés, serveurs lancés sans `watch`.

Plage **2026-03 → 2026-06** sur `DudulSmash`, cinq cadences. Les archives chess.com sautent de
2025/07 à 2026/05, donc mars et avril sont vides et mai/juin portent 28 et 54 parties :
l'étape 3 se joue dans la plage de l'étape 1.

Récapitulatif **identique au caractère près** des deux côtés :

```
82 games fetched — 82 imported, 0 already present.
Bullet: 10 · Blitz: 72 · 45 W · 0 D · 37 L
2026-03 — 0 importées   2026-04 — 0 importées
2026-05 — 28 importées  2026-06 — 54 importées
```

Ré-import : `82 fetched — 0 imported, 82 already present`, également identique. Dans le
magasin, le `diff` des 82 `game_url` triées est **vide** — les mêmes parties, aux mêmes URL,
mêmes mois, mêmes cadences, mêmes résultats, toutes sous le profil de l'import.

Sur Lichess, l'export était refusé par IP pendant le run (429 sur tous les comptes). La
référence a été **rejouée sous la même condition** pour que la comparaison vaille : sortie
identique des deux côtés, mois en échec nommés, plage non avortée (ADR-0010), et la
progression « n/3 mois importés » émise au fil de l'eau — l'événement « fin d'un mois »
qu'exigeait `import-job.test.ts`, vérifié en conditions réelles. **L'étape 2 avec de vraies
parties a été validée par le demandeur.**

Finding relevé, **antérieur à la tranche** (vu identique sur la référence, donc hors de son
périmètre) : quand tous les mois échouent, le panneau affiche « No games found … in the
selected time control categories » au-dessus des lignes d'échec. Le bandeau affirme une
absence de parties là où la Plateforme n'a pas répondu — frère jumeau de la tranche 01.
