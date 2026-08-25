# US-16a — Écrire ma lecture d'une partie, et la sceller

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-16-my-own-analysis`
Grilling : 2026-08-24 (`CONTEXT.md` amendé, ADR-0019). Voir `BACKLOG.md` — US-16a / 16b / 16c.

## Problem Statement

Le joueur ne progresse pas en **analyse** en lisant l'analyse du moteur. Aujourd'hui l'app lui sert
un verdict tout fait : il ouvre une partie, demande le `Niveau de revue` qu'il veut, et lit ce que
Stockfish a trouvé. Il apprend peut-être où il joue mal ; il n'apprend rien sur sa propre capacité à
regarder une position et à comprendre ce qui s'y passe.

Ce qui manque n'est pas une information de plus, c'est un **ordre** : d'abord travailler seul, ensuite
seulement comparer. Et cet ordre est aujourd'hui impossible à tenir sérieusement, pour deux raisons.
Le joueur n'a aucun endroit où **déposer** ce qu'il a compris — pas de commentaire, pas de jugement,
pas de repère — donc sa lecture reste dans sa tête, où rien ne peut la confronter plus tard. Et rien
ne distingue une lecture faite à l'aveugle d'une lecture faite le moteur sous les yeux : *une fois vu,
on ne peut pas ne pas avoir vu*.

US-16a ne construit pas la confrontation (c'est US-16b). Elle construit **ce qu'il y aura à
confronter**, et la garantie que ça vaut quelque chose.

## Solution

Une route de lecture dédiée à une partie, **aveugle par nature** : `/analyse/:gameId/lecture`. Le
joueur y voit l'échiquier, les coups et leur notation — **rien du moteur**, jamais, quel que soit son
`Niveau de revue` mémorisé. Il y écrit son **`Analyse personnelle`** :

- une **`Note`** en texte libre sur n'importe quel coup (et sur la position de départ) ;
- une **`Declared severity`** sur n'importe quel coup — `Blunder` / `Mistake` / `Inaccuracy` /
  `Sound` / `Good` — y compris sur les coups de l'adversaire ;
- un ou plusieurs **`Key moment`s** : « c'est ici que la partie a tourné ».

Quand il a fini, il **scelle** sa lecture : un acte explicite qui dit *voilà ma lecture*. Le
scellement fige ce qui sera confronté en US-16b, et enregistre sa **provenance** — le moteur avait-il
déjà été montré pour cette partie ? Après le scellement, le joueur peut continuer à écrire : ce qu'il
ajoute est conservé comme une **couche postérieure**, visible comme telle, et hors confrontation.

La page Analyse, elle, ne change presque pas : un point d'entrée vers la lecture, et un marqueur
disant qu'une `Analyse personnelle` existe (scellée ou non).

## User Stories

1. En tant que `Player`, je veux ouvrir une route de lecture depuis la page Analyse d'une partie, afin d'analyser cette partie moi-même.
2. En tant que `Player`, je veux que cette route ne montre **rien** du moteur — ni évaluation, ni barre d'avantage, ni courbe, ni glyphe de sévérité, ni `Best line` — afin que ma lecture soit la mienne.
3. En tant que `Player`, je veux que cette route reste aveugle **même si mon `Niveau de revue` mémorisé est `Détaillé`**, afin de ne pas avoir à me discipliner moi-même avant chaque exercice.
4. En tant que `Player`, je veux naviguer dans la partie coup par coup sur cette route comme sur la page Analyse, afin de lire la partie normalement.
5. En tant que `Player`, je veux que l'échiquier soit orienté du côté que j'ai joué, afin de relire la partie comme je l'ai jouée (`Board orientation`).
6. En tant que `Player`, je veux écrire une `Note` en texte libre sur un coup, afin de dire *pourquoi* je pense ce que je pense.
7. En tant que `Player`, je veux écrire une `Note` sur la position de départ, afin de commenter la partie dans son ensemble ou son ouverture.
8. En tant que `Player`, je veux relire et modifier une `Note` que j'ai écrite, afin de corriger ou compléter ma pensée.
9. En tant que `Player`, je veux supprimer une `Note`, afin de retirer ce que je ne pense plus.
10. En tant que `Player`, je veux déclarer la qualité d'un de mes coups sur cinq valeurs (`Blunder`, `Mistake`, `Inaccuracy`, `Sound`, `Good`), afin de m'engager sur un jugement.
11. En tant que `Player`, je veux que `Sound` soit une valeur que je pose explicitement, afin que « j'ai regardé et je ne trouve rien » ne se confonde pas avec « je n'ai pas regardé ».
12. En tant que `Player`, je veux pouvoir déclarer une sévérité sur un coup de mon **adversaire**, afin de dire qu'il s'est trompé — même si l'app m'annonce que ça ne sera pas noté.
13. En tant que `Player`, je veux qu'un coup sur lequel je n'ai rien dit reste **silencieux**, afin que ma lecture puisse être partielle sans devenir fausse.
14. En tant que `Player`, je veux changer un verdict que j'ai posé, afin de me corriger en cours de lecture.
15. En tant que `Player`, je veux désigner un coup comme `Key moment`, afin de dire où la partie a tourné.
16. En tant que `Player`, je veux poser **plusieurs** `Key moment`s sur une partie, afin de ne pas être forcé de choisir quand la partie a basculé deux fois.
17. En tant que `Player`, je veux retirer un `Key moment`, afin de revenir sur un repère mal placé.
18. En tant que `Player`, je veux voir d'un coup d'œil, sur la liste des coups, lesquels portent une `Note`, un verdict, un `Key moment`, afin de savoir où j'en suis dans ma lecture.
19. En tant que `Player`, je veux savoir quelle part des coups j'ai déjà examinés, afin de juger si ma lecture est assez avancée pour être scellée.
20. En tant que `Player`, je veux que ma lecture soit **enregistrée au fil de l'eau**, afin de ne rien perdre si je ferme l'app au milieu.
21. En tant que `Player`, je veux reprendre une lecture non scellée là où je l'avais laissée, afin d'analyser une partie en plusieurs fois.
22. En tant que `Player`, je veux **sceller** ma lecture par un acte explicite, afin de déclarer qu'elle est finie.
23. En tant que `Player`, je veux que l'app me dise clairement ce que le scellement engage (ce qui sera confronté est figé) avant que je le fasse, afin de ne pas sceller par réflexe.
24. En tant que `Player`, je veux qu'une lecture scellée le reste — pas de descellement — afin que ce qui sera confronté en US-16b soit ce que j'avais réellement écrit.
25. En tant que `Player`, je veux pouvoir continuer à écrire **après** le scellement, afin de noter ce que je comprends en découvrant le moteur.
26. En tant que `Player`, je veux que ce que j'écris après le scellement soit **marqué comme postérieur**, afin que ma lecture initiale reste lisible telle qu'elle était.
27. En tant que `Player`, je veux que l'app enregistre si le moteur m'avait déjà été montré sur cette partie avant le scellement, afin que ma future confrontation soit honnête.
28. En tant que `Player`, je veux voir cette **provenance** sur ma lecture scellée — lue à l'aveugle, ou lue informée — afin de savoir moi-même ce que vaut ma lecture.
29. En tant que `Player`, je veux que l'app n'affirme jamais m'avoir *empêché* de voir le moteur, afin qu'elle ne me vende pas une garantie qu'elle ne peut pas tenir.
30. En tant que `Player`, je veux voir sur la page Analyse qu'une partie porte déjà une `Analyse personnelle`, afin de savoir laquelle j'ai déjà travaillée.
31. En tant que `Player`, je veux distinguer sur la page Analyse une lecture **en cours** d'une lecture **scellée**, afin de savoir où reprendre.
32. En tant que `Player`, je veux voir depuis la liste de mes parties lesquelles portent une lecture, afin de choisir la prochaine à analyser.
33. En tant que `Player`, je veux qu'une partie **non analysée par le moteur** soit lisible et annotable, afin de pouvoir m'exercer avant de dépenser du temps moteur.
34. En tant que `Player`, je veux que ma lecture appartienne au `Profile` courant, afin que ma lecture d'une partie d'un ami ne se mélange pas aux miennes.
35. En tant que `Player`, je veux qu'une seule `Analyse personnelle` existe par partie, afin de ne pas avoir à choisir entre plusieurs de mes propres lectures.
36. En tant que `Player`, je veux que ma lecture survive à un redémarrage de l'app et à une migration de schéma, afin de ne jamais perdre un travail que rien ne peut reconstruire.
37. En tant que `Player`, je veux que la suppression du `Profile` emporte ses lectures, afin qu'il ne reste pas de données orphelines.
38. En tant que `Player`, je veux que la route de lecture soit lisible en thème clair et sombre comme le reste de l'app, afin de travailler dans mes conditions habituelles.
39. En tant que `Player`, je veux que rien de ma lecture ne dépende d'un indice purement chromatique, afin de la lire quel que soit mon rapport aux couleurs.
40. En tant que `Player`, je veux que la saisie d'un verdict soit rapide (peu de clics, coup après coup), afin qu'annoter trente coups ne soit pas un calvaire.

## Implementation Decisions

### Modèle et stockage (ADR-0019)

- Stockage **relationnel**, clé `(partie, ply)` — **la même clé que le relevé du moteur**, pour que la
  confrontation d'US-16b soit une **jointure** et non un rapprochement. Le PGN annoté n'est pas la
  forme stockée ; il sera un **export** (hors périmètre 16a, cf. *Out of Scope*).
- Deux tables :
  - une **lecture par partie** : rattachée au `Game` (unicité) et au `Profile` (ADR-0014), portant
    l'instant de **scellement** (nul tant que non scellée) et le drapeau de **provenance** ;
  - des **marques par ply** : rattachées à la lecture, portant `declared_severity` (nullable),
    `note` (nullable), `key_moment` (booléen), et un drapeau **postérieur au scellement**.
- **Le silence n'est pas une valeur** : un coup non examiné n'a pas de ligne (ou n'a que des colonnes
  nulles) — jamais une valeur sentinelle. C'est ce qui permet à US-16b de séparer **couverture** et
  **justesse**.
- `ply = 0` désigne la **position de départ**, pour la `Note` d'ensemble. Cohérent avec la
  numérotation déjà utilisée côté `Evaluation` (une évaluation par Position, la position initiale
  incluse).
- Les marques existent sur **tous** les plys, coups adverses compris. Rien dans le modèle ne
  distingue le camp : c'est la **lecture** (US-16b) qui ne score que les coups du joueur.
- **`Search regime` n'a rien à faire ici** : aucune ligne de cette story ne vient du moteur.

### Migration (ADR-0015)

- Tables **additives**, migration **re-jouable**, échouant fort plutôt qu'à moitié. Rien à
  *backfiller* : une `Analyse personnelle` n'a **aucun amont** — c'est précisément pourquoi ADR-0015
  s'y applique en plein.
- Contraintes de clé étrangère avec **cascade** depuis le `Profile` et depuis le `Game`, suivant la
  recette du projet pour SQLite (cf. la migration des profils).

### Provenance du scellement

- La règle est **côté client** et volontairement simple : dès qu'un rendu de la page Analyse d'une
  partie montre effectivement de l'information moteur (`Niveau de revue` à `Annoté` ou `Détaillé` sur
  une partie analysée), cette partie est marquée « moteur vu » **localement**, comme le
  `Review mode` et le `Profile` courant le sont déjà.
- Au scellement, le client **transmet** ce fait et le serveur le **stocke** sur la lecture. C'est le
  seul endroit où ce qui a été affiché devient persistant — décision assumée au glossaire, alors que
  `Review mode` reste un choix local dont le serveur n'a pas d'opinion.
- **Best-effort, et dit comme tel.** Un stockage local effacé fait retomber sur « non vu » ; le joueur
  peut ouvrir un autre onglet. L'app n'affirme donc **jamais** avoir empêché de voir : elle **étiquette**
  une lecture, elle ne la certifie pas.

### Scellement

- Acte **explicite**, **irréversible** (pas de descellement), **confirmé** en nommant ce qu'il engage.
- Après scellement, l'écriture reste ouverte, et toute marque créée ou modifiée est portée à la
  **couche postérieure**. La lecture initiale reste lisible telle qu'elle était.
- Sceller une lecture **vide** n'a pas de sens et est refusé : il faut au moins une marque.

### Client

- Route **`/analyse/:gameId/lecture`**, hors `Nav` — comme `/analyse/:gameId`, elle est *Game-scoped*
  et s'atteint en partant d'une partie. Le `Nav` n'est pas touché.
- **Elle n'utilise pas le `Review mode` et ne l'écrase pas** : elle est aveugle parce que c'est ce
  qu'elle est. C'est ce qui évite d'avoir à trahir « the choice is remembered ».
- `Board` est **réutilisé sans ses props moteur** (`annotations`, `detailed`, `recap` absents) et
  l'outillage de saisie passe par son `controls`. `Board` gagne donc un **second appelant** — c'était
  jusqu'ici un composant à appelant unique, et c'est la raison pour laquelle ses props moteur sont
  déjà optionnelles.
- La règle de provenance vit dans un **petit module client pur**, sur le modèle exact de
  `reviewMode.ts` : une règle, deux fonctions, testée sans rendu.
- Page Analyse : un **point d'entrée** vers la lecture et un **marqueur** (aucune / en cours /
  scellée). Liste des parties : la même marque, en colonne, comme l'état analysé l'est déjà.
- Écrit en SCSS avec les tokens existants (ADR-0013), **aucun token nouveau** sauf nécessité
  démontrée, et **aucun indice purement chromatique**.

### API

- Routes **scopées au `Profile`** courant, via le mécanisme de scope existant : lire la lecture d'une
  partie, écrire/effacer une marque, sceller.
- La réponse d'une lecture porte ses marques **et** son état (scellée ou non, provenance, couche).
- Une partie sans lecture répond **une lecture vide**, pas une erreur : c'est l'état normal de départ.
- Le refus de sceller deux fois, et le refus de sceller à vide, sont des **erreurs métier explicites**.

## Testing Decisions

Un bon test ici asserte le **comportement observable** — ce qui est stocké, ce que l'API répond, ce
que l'écran montre — jamais la forme interne d'un module. Les coutures ont été validées avec le
demandeur le 2026-08-24 ; **aucune n'est nouvelle**.

| # | Couture | Art antérieur | Ce qu'elle couvre |
|---|---|---|---|
| 1 | Dépôt de l'`Analyse personnelle` sur `openDb(":memory:")` | `server/test/annotations.test.ts` (même clé `(game, ply)`, mêmes helpers `seedProfile`/`seedGame`) | Écrire/relire notes, verdicts (coups adverses inclus), `Key moment`s ; unicité par partie ; scellement + provenance ; couche postérieure ; cloisonnement `Profile` |
| 2 | Contrat HTTP | `server/test/api.test.ts` | Formes de requête/réponse ; lecture vide sur partie sans lecture ; refus de sceller deux fois ; refus de sceller à vide ; scope du `Profile` |
| 3 | Migration, assertée sur un **second** `openDb` | `best-line-migration.test.ts`, `profiles-migration.test.ts` | Tables créées, migration **re-jouable**, données existantes intactes, cascades |
| 4 | Logique client pure (provenance) | `client/test/reviewMode.test.ts` — précédent exact | « Le moteur avait-il été montré avant le scellement », isolé du rendu |
| 5 | Composants client | `GameViewer.test.tsx`, `ProfilesPage.test.tsx` | La route de lecture ; saisie note/verdict/`Key moment` ; état scellé et couche postérieure ; **l'absence de toute information moteur** ; les marqueurs sur la page Analyse et la liste |
| 6 | **FP agentique par tranche** | `docs/test-scenarios/` | L'app réelle, UI-first — la porte d'auto-merge |

**Pyramide.** L'essentiel de la logique tombe aux coutures 1 et 4, les moins chères. Le rendu est à la
couture 5. L'apex est la FP par tranche, puis la greffe HP.

**Un point explicitement hors des tests.** L'aveuglement **ne se teste pas comme une garantie**. On
asserte qu'aucune information moteur n'est rendue sur la route de lecture (couture 5) et que la
provenance est correctement enregistrée (coutures 1 et 4). On **ne peut pas** asserter que le joueur
n'a pas vu — c'est exactement ce que le glossaire refuse de promettre en écartant le nom *Blind mode*.
La FP le vérifie comme un affichage, pas comme un verrou.

**Suite HP.** Pas de 4ᵉ HP pour 16a : **greffe sur HP-01, après son étape 9**, qui asserte déjà « the
app does not start volunteering the engine's verdict » et a déjà ouvert `/analyse/:gameId` sur une
partie **non analysée** — le contexte exact dont 16a a besoin, sans préambule à écrire. Décision prise
avec le demandeur, contre un accueil sur HP-02 (qui n'ouvre une partie que dans sa passe de thème et
aurait dû porter sa propre navigation). **Décidé pour la suite** : à US-16b, HP-02 et HP-03 sont
**fusionnées** en un parcours « lire mes agrégats » (elles ouvrent sur la même phrase, tournent sur le
même snapshot de path 0, assertent toutes deux « shape and internal consistency, not fixed numbers »),
et le créneau libéré accueille une **HP dédiée** « lire une partie à l'aveugle, sceller, confronter ».
Le plafond de 3 HP n'est pas relevé.

## Out of Scope

- **La `Confrontation`** — la matrice `Declared severity` vs mesurée, le score de part des dégâts des
  `Key moment`s, le sens du biais, le repliement sur l'historique et son entrée de `Nav`. C'est
  **US-16b**, et c'est la raison pour laquelle 16a ne dépend d'aucun temps moteur.
- **Les `Candidate line`s et le `Line check`** — l'éditeur de variantes et l'évaluation de la Position
  atteinte. C'est **US-16c**, sortie en dernier parce qu'elle est la plus chère et la seule
  abandonnable. **Conséquence de livraison assumée** : le titre d'origine d'US-16 promettait
  « explorer des variations » ; 16a n'en a pas.
- **L'export PGN annoté** — décidé sur le principe (ADR-0019 : PGN = export), mais rien ne le réclame
  avant qu'il y ait des `Candidate line`s à exporter.
- **L'axe `Phase`** dans tout agrégat — exclu par décision du demandeur tant que la détection des
  phases n'est pas fiable (terrain d'US-15a-bis).
- **Toute modification de `Review mode`** — il n'est ni étendu, ni écrasé, ni déplacé côté serveur. La
  route dédiée existe précisément pour ne pas y toucher.
- **La fusion HP-02 + HP-03** — décidée, mais exécutée à US-16b.

## Further Notes

- **Une prémisse du backlog était périmée** et a été corrigée au grilling : la page Analyse ne montre
  plus le moteur en permanence (« toggle à `true` par défaut »). US-15a a livré `Review mode`, **Unaided
  par défaut**. C'est ce qui rend 16a une extension et non un renversement.
- **ADR-0004 commence enfin à être exploité, mais pas ici.** `cm-chess` avait été choisi contre
  `chess.js` pour son historique en arbre ; c'est **US-16c** qui l'utilisera (l'arbre en mémoire
  pendant l'édition d'une `Candidate line`). 16a reste sur l'historique linéaire de `history.ts`.
- **Un point provisoire, à rouvrir à l'usage** : en US-16b, la matrice se lira sur les `Counted Move`s
  seulement. Le demandeur l'a jugée « un peu compliquée » et acceptée pour vérifier à l'usage. Ça ne
  touche pas 16a — mais 16a doit stocker les verdicts sur **tous** les plys pour que ce point reste
  rouvrable sans migration.
- **Le fan-out agentique est plafonné à 2 sous-agents** sur cette machine (gels récurrents) : une
  suite HP se paie en sérialisation. C'est un argument de plus pour la greffe plutôt que le 4ᵉ
  scénario.
