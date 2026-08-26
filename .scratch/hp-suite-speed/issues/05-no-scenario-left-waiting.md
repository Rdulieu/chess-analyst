Status: `ready-for-agent`

## Parent

`.scratch/hp-suite-speed/PRD.md` (US-18 — `BACKLOG.md`, grillée le 2026-08-26/27 conjointement avec
US-20, abandonnée à l'issue du grill). ADR : `docs/adr/0020-the-driver-library-drives-the-scenario-judges.md`.

Implemented on the business-story integration branch `integration/US-18-faster-hp-suite` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

> **Portail, pour toute tranche de cette story** : `npm test` **et** `npm run test:tools`. La
> commande dédiée est une décision du demandeur ; sans cette règle, la bibliothèque redevient du code
> non gardé — comme `theme-audit.js`, aujourd'hui testé nulle part.

## What to build

**Ne plus laisser un scénario fini attendre.** Au portail du 2026-08-25, HP-03 a rendu son rapport à
12:41:44 et n'a plus rien fait jusqu'à 13:15:13 — **33,5 minutes**, terminées par une notification de
tâche de fond. Sur les 74 minutes vécues ce jour-là, **~30 n'étaient pas du travail**.

C'est le gain le moins cher de la story : il ne touche **aucun scénario**, ne change rien à ce que la
suite affirme, et rend au demandeur la moitié de sa plainte d'origine.

C'est de l'orchestration, donc ça vit dans `SKILL.md` §5.1 — qui décrit déjà finement la livraison
des rapports (livraison qui **marche**, double livraison attendue, `idle_notification` qui ne signifie
rien). Ce qui manque n'est pas la livraison, c'est que **l'orchestrateur vienne chercher ce qui est
déjà arrivé** au lieu d'attendre un signal qui n'apportera rien.

**Ce que cette tranche ne fait pas** : elle ne relance rien, ne re-dépêche rien, et ne suppose pas
qu'un rapport est perdu. Le run du 2026-08-21 (quatre rapports invisibles) est de l'**histoire**, pas
un avertissement vivant — trois suites depuis le contredisent, et une relance coûte un doublon au
mieux, un re-run au pire.

## Acceptance criteria

- [ ] Deux tâches dépêchées en parallèle sont collectées **dès que leurs rapports sont rendus**
- [ ] L'écart « rapport rendu → rapport collecté » est de l'ordre de la seconde
- [ ] Un scénario qui a rendu son rapport n'est **jamais** laissé en attente d'un signal qui n'arrivera pas
- [ ] La double livraison n'est pas lue comme deux rapports
- [ ] Aucune relance n'est déclenchée sur un rapport **déjà reçu**
- [ ] Le rapport de suite consolide **la durée de chaque scénario** (grand livre de la tranche 01), le prérequis compris comme sa propre ligne
- [ ] §5.1 est corrigée en conséquence, et dit **ce que ce run a montré** plutôt qu'une règle générale
- [ ] Aucun scénario de `docs/test-scenarios/` n'est modifié

### Feature Path (FP)

1. Je dépêche deux tâches en parallèle qui rendent un rapport → les deux rapports sont collectés dès qu'ils sont rendus.
2. Je mesure l'écart entre « rapport rendu » et « rapport collecté » → il est de l'ordre de la seconde, pas de la demi-heure.
3. Une tâche rend son rapport et ne reçoit plus rien → elle n'est pas laissée en attente.

Verify: les horodatages des transcripts suffisent — c'est le grand livre de la tranche 01 qui le montre, sur le poste `attente inerte`.

## Blocked by

None - can start immediately
