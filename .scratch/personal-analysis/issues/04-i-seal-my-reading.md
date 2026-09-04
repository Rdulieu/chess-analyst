Status: `done`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Le **scellement** et sa **provenance** (`CONTEXT.md`, entrée `Personal analysis`) — la tranche qui rend
la future `Confrontation` honnête.

- **Un acte explicite** : *voilà ma lecture, montre-moi le moteur*. Il fait deux choses et deux
  seulement : il **fige** ce qui sera confronté (US-16b), et il **date** la lecture.
- **Irréversible** : pas de descellement. Sinon ce qui est confronté n'est plus ce qui avait été écrit.
- **Confirmé en nommant ce qu'il engage**, pour qu'on ne scelle pas par réflexe.
- **Refusé sur une lecture vide** (au moins une marque) et **refusé deux fois** — erreurs métier
  explicites, pas des échecs silencieux.
- **La provenance** : la lecture porte si le moteur **avait déjà été montré pour cette partie** avant le
  scellement. La règle vit dans un **petit module client pur**, sur le modèle exact de `reviewMode.ts` :
  dès qu'un rendu de la page Analyse d'une partie montre effectivement de l'information moteur
  (`Review mode` à `Annoté` ou `Détaillé` sur une partie analysée), la partie est marquée « moteur vu »
  **localement**. Au scellement, le client le transmet, le serveur le **stocke**.
- **C'est le seul endroit où ce qui a été affiché devient persistant** — décision assumée, alors que le
  `Review mode` reste un choix local dont le serveur n'a pas d'opinion. Une confrontation sans
  provenance n'est pas une confrontation.
- **Best-effort, et dit comme tel.** Un stockage local effacé retombe sur « non vu » ; le Player peut
  ouvrir un autre onglet. L'app **étiquette** une lecture (« lue à l'aveugle » / « lue informée »), elle
  n'affirme **jamais** avoir empêché de voir — c'est exactement ce que le glossaire refuse de promettre
  en écartant le nom *Blind mode*.
- **La couche postérieure** : après scellement, l'écriture reste ouverte (découvrir le moteur et
  comprendre est le moment le plus fertile de l'exercice), mais toute marque créée ou modifiée est
  portée à une **couche postérieure à la révélation**, visible comme telle et **hors confrontation**.
  La lecture initiale reste lisible telle qu'elle était.

> Tranche gardée **entière** sur décision du demandeur : sceller sans décider du sort des écritures
> postérieures laisserait un état incohérent — soit bloqué, soit silencieusement mélangé.

## Acceptance criteria

- [ ] Sceller est un acte explicite, confirmé en nommant ce qu'il engage
- [ ] Sceller une lecture **vide** est refusé, avec sa raison
- [ ] Sceller une lecture **déjà scellée** est refusé, avec sa raison
- [ ] Une lecture scellée ne peut pas être descellée — aucun chemin ne le permet
- [ ] La lecture scellée porte l'instant du scellement
- [ ] La lecture scellée est **étiquetée** « lue à l'aveugle » ou « lue informée »
- [ ] L'étiquette « informée » apparaît quand le moteur avait été montré pour **cette** partie avant le scellement, et pas pour une autre partie
- [ ] La règle de provenance est un module client pur, testé sans rendu
- [ ] Nulle part l'app n'affirme avoir **empêché** de voir le moteur
- [ ] Après scellement, poser ou modifier une marque reste possible
- [ ] Toute marque créée ou modifiée après le scellement est **marquée comme postérieure**
- [ ] La lecture initiale reste lisible telle qu'elle était avant le scellement
- [ ] Les marques postérieures sont visuellement distinctes des initiales, en mots et non par la seule couleur
- [ ] L'état survit au rechargement

### Feature Path (FP)

1. Sur une lecture vide, je tente de sceller → refusé, avec sa raison.
2. Je pose un verdict, puis je scelle → l'app nomme ce que ça engage avant de le faire, puis la lecture est scellée et étiquetée **« lue à l'aveugle »**.
3. Je modifie ce verdict après scellement → accepté, et **marqué comme postérieur** ; ma lecture initiale reste lisible telle qu'elle était.
4. Je tente de sceller à nouveau, puis de desceller → les deux sont impossibles, la seconde n'étant offerte nulle part.
5. Sur une **autre** partie, **analysée**, je consulte d'abord le moteur en `Détaillé` sur sa page Analyse, puis j'ouvre sa lecture, je pose un verdict et je scelle → la lecture est étiquetée **« lue informée »**.
6. Je vérifie que la première lecture est toujours étiquetée « à l'aveugle » → la provenance est par partie, pas globale.

Verify: UI first ; sonder la base seulement pour l'instant de scellement et le drapeau de couche.

## Blocked by

- `.scratch/personal-analysis/issues/01-a-reading-exists-and-judges-a-move.md`
