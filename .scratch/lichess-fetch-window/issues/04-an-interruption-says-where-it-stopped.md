# 04 — An interruption says where it stopped, and what to re-run

Status: done

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

When the stream breaks mid-flight, the Player must end up with **everything they need to finish the
job themselves** — and nothing they have to work out.

- **No retry after the first byte.** This applies ADR-0010's standing no-retry rule rather than
  excepting it. Recovery is the Player re-running, which dedup by URL makes safe and cheap.
- **The Import does not throw.** It returns its summary — a failed month has never aborted an Import.
  The Player sees what got in and what did not, on one screen.
- **The last month received is declared NOT covered** and is included in the range to re-run. A
  stream dying mid-March leaves March partial; re-fetching a half-imported month is free, while
  announcing it covered is a silent, permanent hole. We over-declare incompleteness, never
  completeness.
- Months after the stop carry their existing per-month failure line, in words and with a
  non-chromatic cue.
- A **global statement** in the summary's existing message field, **in the import form's own
  `YYYY-MM` vocabulary so the range can be retyped as-is**:

  > « Le flux s'est interrompu après **2020-03**. Les parties récupérées sont **conservées**. Pour
  > couvrir le reste, relancez un import de **2020-04** à **2023-08**. »

  Three facts, none decorative: where it stopped, that nothing is lost, and the exact range. Without
  the second, the Player assumes the whole import must be redone.

Resuming the stream at the last Game's date was **rejected**: it looks like recovery, reopens the
door to bursts, and implies a completeness that cannot be guaranteed.

## Acceptance criteria

- [x] A stream breaking mid-flight produces a summary, not an error page.
- [x] Games received before the break are persisted and findable.
- [x] The global message names the last **fully covered** month, states the Games are kept, and gives
      the remaining range.
- [x] That range is expressed in the same `YYYY-MM` form the import field accepts, and starts at the
      month the stream broke in — never after it.
- [x] Every month from the break onwards carries a failure line, distinguishable from a zero month
      without relying on colour.
- [x] Re-running the stated range completes the history and duplicates nothing.
- [x] Nothing is retried automatically after the first byte.
- [x] A nominal, unbroken import shows no such message.

### Feature Path (FP)

1. Start an import whose stream breaks partway → the screen shows the **summary**, not an error.
2. It states **after which month** the stream stopped, and that the Games already fetched are kept.
3. It gives the remaining range in a form that can be **typed straight back into the import field**.
4. The month the break happened in is reported as **not covered**.
5. Re-run exactly the stated range → the history is complete and nothing is duplicated.
6. Run a nominal import → no interruption message appears.

Verify: UI first — the summary and the import form. Probe the store only to confirm no duplicates.

## Blocked by

- `.scratch/lichess-fetch-window/issues/03-lichess-asks-once-for-the-whole-range.md`

## Comments

**2026-08-24 — implémentée et fusionnée dans `integration/US-17-lichess-fetch-window`.**

Trois cycles TDD. 292 tests serveur, 549 client, build, lint et typecheck propres.

Décisions :
- **`stream-cut` traverse le port comme un événement à part** (quatrième `RangeEvent`), yieldé une
  seule fois, nommant le mois où la réponse est morte, juste avant les `month-failed` qui closent le
  reste. « Ce mois a échoué » et « la réponse a cessé d'arriver » sont deux faits différents, et seul
  le second dit **où reprendre**. Sans lui, l'Import devrait reconnaître la panne au libellé de son
  `reason` — un texte écrit pour être lu par un humain, pas pour être testé.
- **Seule une troncature le déclenche.** Première implémentation : tout échec de plage l'émettait, et
  trois tests existants l'ont attrapée. Un `429` ou un `500` est refusé **avant le premier octet** :
  rien n'a été interrompu, il n'y a pas de mois « où ça s'est arrêté », et annoncer une reprise
  nommerait un arrêt qui n'a pas eu lieu.
- **L'interruption prime sur « No games found »** : ce dernier affirme quelque chose sur ce que la
  plage *contenait*, et une plage dont la réponse a été coupée n'a jamais été lue en entier. Ça
  ferme au passage le finding de la tranche 02 (« No games found » au-dessus des lignes d'échec).
- Un mois dont une partie n'a pas pu être stockée n'est **pas** couvert et ne peut donc pas devenir
  le point de reprise.

**La règle « on sur-déclare l'incomplétude » était déjà satisfaite par la tranche 03** : un mois ne
se clôt que quand une partie ultérieure le prouve passé, donc un flux mort en mars laisse mars *et*
février ouverts si aucune partie de mars n'est arrivée. Plus conservateur que ce que l'issue
demandait, et juste — février pouvait contenir des parties qui ne sont jamais venues. Le travail
neuf était donc l'énoncé global, pas la logique de couverture.

**Feature Path : verte, 6/6.** Fixture ndjson maison, coupure réelle (corps chunké, lignes entières,
puis `socket.destroy()`), base jetable, ports dédiés.
- Le résumé s'affiche, pas une page d'erreur.
- Énoncé rendu : « Le flux s'est interrompu après **2024-02**. Les parties récupérées sont
  **conservées**. Pour couvrir le reste, relancez un import de **2024-03** à **2024-05**. »
- `2024-03` / `2024-05` **retapés tels quels** dans les deux champs : acceptés, import relancé.
- Le mois de la coupure est rapporté en échec, jamais couvert, et c'est le début de la plage.
- Relance de la plage énoncée : `3 imported, 1 already present`, puis **8 parties, 8 URL
  distinctes** — l'historique est complet et rien n'est dupliqué.
- Import nominal : aucun énoncé d'interruption (`role="status"` absent).
- Hors parcours, exercé aussi : un `500` ne produit **aucun** énoncé d'interruption ; une coupure
  avant qu'aucun mois ne soit couvert dit « avant qu'aucun mois ne soit couvert » et repart du
  premier mois.
- Distinction sans couleur vérifiée **dans un même résumé** : mois à zéro sans `data-failed` à côté
  de mois en `échec : …`, le mot portant l'information et la teinte ne faisant que la renforcer.

Findings, **aucun bloquant**, tous deux **antérieurs et déposés** sous
`.scratch/import-summary-unfounded-claims/` :
1. Un mois coupé est compté dans `imported` sans l'être dans `totalFetched` — le résumé peut annoncer
   « 4 récupérées, 5 importées ». Attribution **vérifiée par git**, pas déduite : ligne identique au
   bit près sur `eb270f6`, remonte à US-9.
2. Une plage refusée en `500` affiche encore « No games found » — exactement l'affirmation sans
   fondement que cette tranche récuse pour la troncature. La tranche a réduit le cas, pas créé.
