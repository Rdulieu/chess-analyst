Status: `done`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Le tracer bullet de l'**`Analyse personnelle`** (`CONTEXT.md`) : de la table à l'écran, sur la plus
petite marque utile — une **`Declared severity`** posée sur un coup.

- **Une route de lecture dédiée**, `/analyse/:gameId/lecture`, hors `Nav` comme la page Analyse (elle
  est *Game-scoped*, on l'atteint depuis une partie). Elle est **aveugle par nature** : elle ne montre
  rien du moteur, et elle **n'utilise ni n'écrase le `Review mode`** — c'est tout l'intérêt d'une route
  séparée, ne pas avoir à trahir « the choice is remembered ».
- **Le stockage est relationnel, clé `(partie, ply)`** — la même clé que le relevé du moteur, pour
  qu'US-16b soit une jointure (**ADR-0019**). Une lecture par `Game`, rattachée au `Profile`
  (**ADR-0014**) ; des marques par ply portant le verdict.
- **Les cinq valeurs** : `Blunder` / `Mistake` / `Inaccuracy` / `Sound` / `Good`. `Sound` est une
  valeur qu'on **pose**, pas une absence.
- **Le silence n'est pas une valeur** : un coup non examiné n'a pas de verdict — jamais de sentinelle.
  C'est ce qui permettra à US-16b de séparer **couverture** et **justesse**.
- **Les verdicts existent sur tous les plys, coups adverses compris.** Le modèle ne distingue pas le
  camp ; c'est la confrontation (US-16b) qui ne scorera que les coups du joueur. L'écran le **dit** au
  moment où le joueur juge un coup adverse, pour qu'il ne croie pas être noté dessus.
- **Migration due** (**ADR-0015**) : tables additives, **re-jouable**, échouant fort plutôt qu'à
  moitié, cascades depuis `Profile` et `Game`. Rien à *backfiller* — une Analyse personnelle n'a
  **aucun amont**, ce qui est précisément pourquoi ADR-0015 s'y applique en plein.
- `Board` est réutilisé **sans ses props moteur** (`annotations`, `detailed`, `recap` absentes), la
  saisie passant par son `controls`. Il gagne un **second appelant** — ses props moteur étaient déjà
  optionnelles.
- SCSS + tokens existants (**ADR-0013**), **aucun indice purement chromatique**.

## Acceptance criteria

- [ ] La route de lecture d'une partie s'ouvre depuis sa page Analyse, et fonctionne sur une partie **non analysée** (aucun temps moteur requis)
- [ ] L'échiquier y est orienté du côté que le Player a joué (`Board orientation`)
- [ ] La partie s'y parcourt coup par coup, avec la notation
- [ ] **Aucune** information moteur n'y est rendue — ni `Evaluation`, ni barre d'avantage, ni courbe, ni glyphe de sévérité, ni `Best line` — **y compris quand le `Review mode` mémorisé est `Détaillé` et que la partie est analysée**
- [ ] Le `Review mode` n'est ni lu, ni écrit, ni modifié par cette route
- [ ] Les cinq `Declared severity` sont posables sur n'importe quel coup, et modifiables
- [ ] Un verdict est posable sur un coup **adverse**, et l'écran dit qu'il ne sera pas noté
- [ ] Un coup sans verdict reste **silencieux** en base (aucune ligne / colonnes nulles), jamais une valeur sentinelle
- [ ] Une lecture est **unique par `Game`** et appartient au `Profile` du `Game`
- [ ] Une partie sans lecture répond **une lecture vide**, pas une erreur
- [ ] Les routes API sont scopées au `Profile` courant, via le mécanisme de scope existant
- [ ] La migration crée les tables, est **re-jouable** sans effet, et laisse les données existantes intactes (asserté sur un second `openDb`)
- [ ] Supprimer un `Profile` ou un `Game` emporte ses lectures (cascade)
- [ ] La saisie est rapide : poser un verdict coup après coup ne demande pas de navigation intermédiaire
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique
- [ ] Aucun token SCSS nouveau sans nécessité démontrée

### Feature Path (FP)

1. J'ouvre une partie **non analysée** et je vais sur sa lecture → l'échiquier est de mon côté, la partie se parcourt, **rien du moteur n'est visible**.
2. Je déclare `Mistake` sur un de mes coups → le verdict est porté par ce coup.
3. Je déclare `Sound` sur un autre de mes coups, et `Blunder` sur un coup **adverse** → les trois tiennent, et l'app dit que le coup adverse ne sera pas noté.
4. Je change un des trois verdicts → le nouveau remplace l'ancien.
5. Je recharge l'app → mes verdicts sont là, à l'identique.
6. J'ouvre la lecture d'une partie **analysée** alors que mon `Review mode` est `Détaillé` → toujours **rien du moteur** sur cette route.
7. Je sélectionne un autre `Profile`, puis reviens au premier → ma lecture appartient bien au premier et n'apparaît pas sous l'autre.

Verify: UI first ; sonder la base seulement pour le silence (absence de sentinelle) et les cascades.

## Blocked by

None - can start immediately.
