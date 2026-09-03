# 07 — La suite HP et la PR vers `develop`

Status: `ready-for-human`
Type: **HITL**
Branche : `integration/US-15a-bis-deepen-per-game-analysis`.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis.

## What to build

La clôture de la story. La suite **HP** est lancée sur la branche d'intégration, son résultat est
collé dans la PR `integration → develop`, et la PR est ouverte pour décision humaine. **L'agent ne
merge jamais vers `develop`.**

Pas de quatrième HP : **HP-01 traverse déjà la page Analyse**, et la tranche 01 (le tracé) comme la
tranche 06 (le prédicat) s'y **greffent** — même choix qu'US-14 et US-15a, et la limite de trois HP
tient.

La branche d'intégration est longue-vie : la resynchroniser avec `develop` avant la PR, et
**re-vérifier la mergeabilité** juste avant de rendre la main. `BACKLOG.md` est le point de collision
habituel, et structurellement so : toute transition de story réécrit la même région.

La PR **liste les tranches incluses**, pour une revue en lot lisible, et rappelle ce que la story
laisse ouvert.

## Acceptance criteria

- [ ] La branche d'intégration est à jour avec `develop`.
- [ ] Build, tests et **lint** sont verts — un lint qui ne peut pas tourner n'est pas un lint vert.
- [ ] La suite HP est lancée et son résultat (pass/fail + findings) est collé dans la PR.
- [ ] Aucun quatrième HP n'est ajouté ; les greffes se font sur HP-01.
- [ ] La PR liste les tranches incluses et les points laissés ouverts.
- [ ] La mergeabilité est re-vérifiée juste avant la remise au demandeur.
- [ ] **L'agent n'a pas mergé** vers `develop`.

### Feature Path (FP)

Aucune — la suite **HP** tient lieu de gate pour cette tranche.

## Blocked by

- [`06-the-predicate-shipped.md`](06-the-predicate-shipped.md)
