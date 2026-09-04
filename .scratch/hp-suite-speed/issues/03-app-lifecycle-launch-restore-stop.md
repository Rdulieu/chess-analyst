Status: `done`

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

Le **cycle de vie de l'app** derrière trois helpers : **restaurer** un instantané, **lancer** sur ses
propres ports et sa propre base, **arrêter** ce qu'on a lancé. Ce sont les mécaniques les plus
re-dérivées de la suite et les plus coûteuses en erreurs — chacune des règles ci-dessous a coûté un
run à quelqu'un :

- **Restaurer avant de démarrer.** Un serveur crée sa base à l'ouverture ; une copie posée après est
  écrasée par un processus vivant.
- **`PRAGMA wal_checkpoint(TRUNCATE)` puis `.backup`, jamais `cp`, puis relire la copie.** La base
  tourne en WAL : un `.db` copié seul a déjà rendu une base **sans table** (4 Ko de `.db` à côté de
  95 Ko de `-wal`), et un `cp` **après** un checkpoint tronquant a rendu *database disk image is
  malformed* là où `.backup` marchait.
- **Arrêter l'arbre, pas le pid rendu.** Le processus qui écoute est souvent un **grand-enfant** du
  lanceur, et tuer le wrapper d'un observateur laisse un serveur qui **ressuscite** au prochain
  fichier touché. Un port libre n'est pas une preuve d'app arrêtée.
- **Ne jamais tuer ce qu'on ne peut pas prouver être à soi.** `/proc/<pid>/environ` a menti **dans
  les deux sens** ; `cwd` et `cmdline` sont les preuves qui ont marché.

Les helpers **jettent** quand le mécanisme a échoué. Une copie illisible doit rougir, jamais démarrer
sur une base vide qui ressemblerait à un état propre.

## Acceptance criteria

- [ ] Restaurer rend une base qui contient **ce qu'elle prétend** — la copie est relue avant d'être déclarée bonne
- [ ] Restaurer **jette** sur une copie corrompue ou vide de tables, au lieu de laisser démarrer
- [ ] Lancer prend ports et base en paramètres ; aucune valeur par défaut du projet n'est utilisée
- [ ] Lancer **jette** si le port n'est pas libre, et le dit avec le port
- [ ] Lancer ne démarre pas d'observateur de fichiers pour un run qui valide un commit donné
- [ ] Arrêter libère **effectivement** le port, grand-enfant compris, vérifié après coup
- [ ] Arrêter refuse de tuer un processus dont l'appartenance n'est pas prouvée, et le **rapporte**
- [ ] Aucun `expect` ni jugement sur l'app dans les helpers (ADR-0020)
- [ ] Tests sur **vrai SQLite, fichiers temporaires** : WAL → checkpoint → `.backup` → relecture, et le cas corrompu
- [ ] `SKILL.md` nomme les helpers et la §5.4 est réécrite **en remplacement**, pas en ajout
- [ ] Aucun scénario de `docs/test-scenarios/` n'est modifié

### Feature Path (FP)

1. Je restaure un instantané **avant** de démarrer → l'app démarre et sert exactement les données annoncées (nombre de parties, de profils).
2. Je démarre sur mes propres ports et ma propre base → rien de ce que je pilote ne touche l'app d'un autre.
3. J'arrête ce que j'ai lancé → le port est **effectivement** libre, y compris le processus qui écoute sous un lanceur.
4. Je restaure un instantané dont la copie est corrompue → **ça jette**, au lieu de démarrer sur une base vide.

Verify: UI d'abord — les figures servies par l'app après restauration ; la vérification de port complète ce que l'UI ne montre pas.

## Blocked by

- `.scratch/hp-suite-speed/issues/01-the-ledger-of-a-run.md` — sans le grand livre, cette tranche ne peut pas prouver son gain
