# 06 — Le savoir rentre dans le dépôt

Status: done
Delivered: 2026-09-04 · merge `b614aa8` · gate: FP 6/6 ✓, no blocking finding · runner at 237 l. against a ~150 l. target, deviation declared · code net (build+tests+lint) deferred whole to slice 08 by requester decision, 2026-09-04
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

La dette que l'usine ne peut pas découvrir seule. Une quinzaine de recettes *load-bearing* vivent
dans la mémoire personnelle de l'agent — donc ni versionnées, ni relues, ni partagées, ni révocables.
Et la mémoire est indexée **par chemin de travail** : un worktree a **zéro fiche**, alors que la
fiche n°1 est *« worktree avant toute modification »*. La règle qui envoie l'agent dans le worktree
est rangée dans le seul endroit que le worktree ne peut pas lire (ADR-0028).

Le rangement suit un seul critère — **un agent le lit sans le chercher** — donc par la skill qui en a
besoin, et **jamais** dans un fichier « astuces » central :

- **Le worktree**, à côté de `git-flow` : le worktree obligatoire, les trois symlinks `node_modules`
  d'un worktree frais, et le piège du slash de `.gitignore` qui a fait suivre ces symlinks à
  `develop` (PR #57).
- **Le pilotage de l'app**, à côté du runner : `tsx watch` qui ressuscite un serveur tué (un port
  libre ne prouve rien), CDP + puppeteer au scratchpad, `API_TARGET`/`PORT` pour une seconde
  instance, l'émulation de thème qui échoue **dans les deux sens**, et la copie WAL (`cp` corrompt là
  où `.backup` marche).
- **L'orchestration**, à côté du runner : le plafond de fan-out, les rapports perdus et leur
  récupération, le gel d'un sous-agent avec sa session, le coût d'une passe lu dans les transcripts.

Ce dernier point **est** la piste 2 d'US-21. Le runner fait 833 lignes dont **686 pour la seule
section d'orchestration** — 82 % du fichier, chargé à *chaque* invocation, FP comprise. Les règles
impératives restent dans la skill, le journal daté part à côté. Le fichier le demande lui-même : il
se décrit comme *« a dated audit log, kept as written »*.

**Le mécanisme d'auto-audit part intact.** C'est la réserve explicite d'US-21 : c'est la meilleure
invention de l'usine, ses défauts sont d'**application** et non de conception. L'alléger, oui ; le
casser, non.

`SCENARIO-FORMAT.md` (93 lignes) est **resynchronisé** avec les scénarios réels (166 à 349 lignes) :
c'est le document qu'un agent lit pour *écrire* un scénario, et périmé il en fabrique au mauvais
format (§1.8).

Enfin, **une recette rapatriée quitte la mémoire**, ou sa fiche devient un pointeur vers le fichier.
Sinon on obtient une troisième source de vérité — exactement le reproche fait aux seeds.

## Acceptance criteria

- [ ] Les trois annexes existent, chacune rangée sous la skill qui en a besoin.
- [ ] Le runner est ramené à l'ordre de 150 lignes, annexes exclues.
- [ ] Le mécanisme d'auto-audit est **présent et intact**.
- [ ] Un seul plafond de concurrence est énoncé dans tout le runner ; la caution périmée « limite de
      20 » a disparu (§1.3).
- [ ] `SCENARIO-FORMAT.md` décrit la structure réelle des scénarios existants.
- [ ] Chaque recette rapatriée est **retirée de la mémoire** ou réduite à un pointeur, et la liste de
      ce qui a bougé est dans la PR.
- [ ] Les recettes de plateforme et la migration SQLite ne sont **pas** rapatriées ici : elles
      relèvent d'ADR-0018 et ADR-0015.

### Feature Path (FP)

1. Ouvrir le runner agentique → de l'ordre de 150 lignes, lisible d'un trait.
2. Y chercher le plafond de concurrence → **une seule** valeur, aucune caution contradictoire.
3. Y chercher le mécanisme d'auto-audit → intact.
4. Demander « comment je démarre dans un worktree ? » en ne lisant que le dépôt → les trois symlinks
   et le piège du `.gitignore` sont trouvés sans les connaître d'avance.
5. Demander « comment je pilote l'app ? » de même → `tsx watch`, le navigateur privé et l'émulation
   de thème sont trouvés.
6. Écrire un nouveau scénario en suivant le format → il ressemble aux HP existants.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `04-the-vocabulary-pass`.
