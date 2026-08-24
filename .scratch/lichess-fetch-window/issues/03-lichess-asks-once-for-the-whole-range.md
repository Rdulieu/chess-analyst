# 03 — Lichess asks once for the whole range

Status: done

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

The payoff. The Lichess adapter makes **one request** for the entire range instead of one per month,
and month coverage is **derived from the Games** rather than from the requests.

- The export is asked for the whole span in a single `since`/`until` request, still `sort=dateAsc`,
  still ndjson relayed as it arrives.
- **Coverage is read off the Games in date order**: every month before the last Game received is
  covered. The per-month lines the Player sees are unchanged in form — the month remains the unit of
  **reporting**, and stops being the unit of **fetching** (`CONTEXT.md`, `Monthly import`).
- A month the Player was inactive in still reads as a plain zero. **This is the assertion the whole
  story must not break**: a gap in the history stays distinguishable from a gap in the fetching.
- **No bound on the range.** Slicing into yearly requests would rebuild the burst this slice removes
  — and with it the per-IP throttle and the one-minute pauses — to buy a sign of life that streaming
  already gives.
- The `429` **pre-first-byte** retry stays (ADR-0018 decision 5), but its message must name the
  **range**: it says "reprise du mois" today, which would misname what resumes.

**Also in this slice, because it is the same subject matter and the same file.** Three places still
claim Lichess refuses IPv6 on the export endpoint. That conclusion was drawn from measurements taken
in one direction only, and **the exact opposite reproduced on 2026-08-22** (IPv4 → `429`,
IPv6 → `200`, two accounts seconds apart) after the reference import had burned the pinned IPv4. The
explanation covering both is a **per-IP throttle on the export endpoint**, keyed to a recent burst.

- The pin is **kept and demoted**: no longer a "correctness requirement" — it never was — but a
  determinism choice, one variable fewer when diagnosing a `429`.
- Correct the client's own comment, `path-0-bootstrap.md`'s precondition, and PR #52's body.
- One request is not a burst, so this slice largely dissolves the question.

chess.com is untouched: it keeps its month loop inside its adapter.

## Acceptance criteria

- [x] Importing a Lichess range issues **one** export request, whatever the number of months.
- [x] Per-month lines are still produced, one per month of the range, in order.
- [x] Months with no Games read as **zero**; months with Games carry their real counts.
- [x] Totals, category tallies and result tallies match what the month-by-month import produced for
      the same range.
- [x] No one-minute pause occurs on a nominal import.
- [x] The `429` retry still fires when the **response** is a 429, and its message names the range.
- [x] Re-importing the same range adds nothing (dedup by URL).
- [x] chess.com's requests and behaviour are unchanged.
- [x] The IPv4 pin is kept, and its comment states what is actually known.
- [x] `path-0-bootstrap.md`'s precondition and PR #52's body no longer claim an IPv6 refusal.

### Feature Path (FP)

1. Import a Lichess history covering **both empty and populated months** → one line per month, the
   empty ones at zero, the populated ones at their real counts.
2. The import completes **without any minute-long pause**.
3. The imported Games are findable under that Profile, and under no other.
4. Importing the same range a second time adds nothing and reports them all as already present.
5. A chess.com import run afterwards behaves exactly as before.

Verify: UI first — the import summary and the Games list. Probe the store only to confirm scoping.

## Blocked by

- `.scratch/lichess-fetch-window/issues/02-the-port-speaks-a-range.md`

## Comments

**2026-08-24 — implémentée et fusionnée dans `integration/US-17-lichess-fetch-window`.**

Quatre cycles TDD. 286 tests serveur, 547 client, build, lint et typecheck propres.

Décisions :
- `sort=dateAsc` cesse d'être une préférence pour devenir **le mécanisme** : une partie datée de
  mars est la preuve que janvier et février sont derrière nous, et c'est ce qui les clôt — à zéro si
  rien n'est venu pour eux. La couverture ne se lit plus sur les requêtes mais sur les parties.
- Une coupure échoue **tous les mois encore ouverts** et garde aboutis ceux qu'une partie
  ultérieure avait prouvés passés. Il n'y a pas de « on continue » : avec une requête unique il n'y
  a pas de requête suivante. C'est déjà la règle « on sur-déclare l'incomplétude » de la tranche 04.
- Deux tests ne pilotent rien et **verrouillent** (la ligne par mois avec ses zéros, l'étiquetage
  des parties) : ils passent aussi sur l'implémentation d'avant, et c'est le but — ils interdisent
  qu'un remaniement reprenne le gain en perdant la distinction trou-d'historique / trou-de-
  récupération.
- `monthOfCreatedAt` lit l'instant de la plateforme **en UTC**, le même repère que la fenêtre
  `since`/`until` : sinon une partie pourrait être comptée sur un mois que la requête n'a pas
  demandé, selon le fuseau de la machine.

**Un critère d'acceptation reposait sur une prémisse fausse.** Le corps de la PR #52 **ne porte
pas** l'affirmation « Lichess refuse l'IPv6 » — vérifié sur les PR 51 à 54, corps et commentaires :
aucune mention d'IPv4/IPv6. Les deux autres emplacements étaient réels et sont corrigés
(`request.ts`, `path-0-bootstrap.md`), le pin IPv4 conservé et rétrogradé en choix de déterminisme.
Rien à corriger sur la PR : constaté, pas supposé.

Corrigé au passage dans `path-0-bootstrap.md`, devenu faux avec cette tranche : « 71 mois récupérés
un mois à la fois ». Les chiffres de durée restent à la tranche 05, dont c'est le travail de les
mesurer.

**Feature Path : verte, 5/5.** Fixtures Lichess et chess.com maison, base jetable, ports dédiés,
aucune API réelle touchée.
- Plage 2025-01 → 2025-06 : **une seule** requête (`since`/`until` sur les deux bornes,
  `sort=dateAsc`), 6 lignes de mois, les 4 mois vides à zéro, `2025-01 — 3 importées` et
  `2025-06 — 2 importées`. **Plage de 72 mois : toujours une seule requête**, 72 lignes.
- Import complet en **~155 ms**, `waiting` nul sur tous les échantillons.
- Égalité des totaux avec l'import mois-par-mois **mesurée, pas déduite** : un second serveur au
  commit de base `259ce4b` (6 requêtes) sur la même fixture rend des chiffres identiques au bit
  près.
- Le 429 rejoue la **même** URL unique et dit « reprise de **la plage** dans 5 s ».
- Ré-import : `0 imported, 5 already present` ; chess.com ensuite : **6 requêtes, une par mois**,
  inchangé.

Non exercé en vrai : le chemin de la coupure de flux — ni dans les critères ni dans le parcours,
couvert par les tests unitaires. Dit plutôt que sous-entendu.

Findings, **aucun bloquant** :
- **Antérieur, vérifié** sur `259ce4b` avec la même fixture : un mois dont toutes les parties sont
  hors périmètre est indiscernable d'un mois vide sur sa ligne (les parties n'apparaissent que dans
  le `totalFetched` global). chess.com fait de même. L'assertion que la tranche devait préserver
  (mois vide = zéro franc, échec = des mots) tient.
- Antérieur : les cinq cases de catégorie d'`ImportForm.tsx` n'ont ni `id` ni `name`.
- Pilote, pas l'app : `fill` sur `<input type="month">` pose la valeur DOM **sans notifier React** —
  le piège déjà connu, et un faux vert s'il n'est pas anticipé.
