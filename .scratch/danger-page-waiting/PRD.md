# PRD — Ne pas attendre dans le vide sur « Positions dangereuses » (US-10b)

Status: ready-for-agent

Business story: **US-10b** (`BACKLOG.md`), issue de la scission d'US-10.
Branche d'intégration : `integration/US-10b-danger-page-waiting`.
Décisions de grilling : `CONTEXT.md` (`Danger position`), **ADR-0012**, ADR-0009 (annotée).

## Problem Statement

Le Player ouvre « Positions dangereuses » et voit une **page blanche**. Rien ne lui dit que
quelque chose est en cours, combien de temps ça va durer, ni si ça a échoué. Il ne peut que
conclure que la page est cassée, ou attendre sans savoir quoi.

Trois causes indépendantes, établies par la mesure et non par lecture de code :

1. **Le serveur recalcule à chaque requête ce qu'il a déjà calculé une fois.** `GET /api/danger`
   prend **2,5 s sur 50 parties analysées**, dont **2419 ms de rejeu intégral du PGN de chaque
   partie** par cm-chess, uniquement pour retrouver les FEN que la passe d'analyse tenait déjà en
   main. Le N+1 sur `evaluations` que le backlog soupçonnait coûte 41 ms : ce n'était pas lui.
   Depuis US-9, importer une année tient en un clic — **~650 parties, soit ~31 s** de calcul
   synchrone qui bloque tout le serveur, à **chaque affichage de la page**.

2. **La page affiche 3736 diagrammes dont 66 ont un sens.** L'agrégat renvoie toute Position
   atteinte, alors que `CONTEXT.md` définit une `Danger position` comme une Position **récurrente**.
   3670 entrées ont été atteintes **une seule fois** : par la définition même du glossaire, ce ne
   sont pas des Danger positions. 400 Ko de JSON et autant de plateaux `react-chessboard` rendus
   d'un coup — une part du gel n'est donc pas serveur du tout, et aucun travail d'arrière-plan ne
   l'aurait corrigée.

3. **Le tri met le bruit en premier.** Le classement se fait par nombre d'atteintes, or la Position
   la plus atteinte est **toujours la position initiale** (atteinte dans 100 % des parties, par
   construction). Les positions réellement dangereuses sont donc reléguées vers le bas — l'inverse
   de ce que la page existe pour montrer.

Et quand le serveur échoue, la page affiche « Analysez vos parties pour découvrir vos positions
dangereuses » : elle demande au Player de faire ce qu'il vient de faire.

## Solution

`/danger` dit la vérité, vite, et ne laisse jamais le Player devant un écran muet.

- **L'agrégat correspond à sa définition** : seules les Positions **atteintes au moins deux fois**
  y figurent, la **position initiale est exclue** (on ne l'« atteint » pas, on en part), et le
  classement se fait **par proportion d'erreur sérieuse** — le nombre d'atteintes ne servant qu'à
  départager. La page affiche **au plus 30** diagrammes et annonce le total.
- **La page a quatre états distincts** au lieu de deux : calcul en cours (texte annoncé), échec
  serveur (message d'échec + reprise), aucune partie analysée (invitation), parties analysées mais
  rien de récurrent (explication). Aucun ne renvoie vers un autre.
- **Le coût est supprimé à la source** : la FEN de chaque demi-coup est **stockée à côté de son
  `Evaluation`**, écrite par la passe d'analyse qui la calcule déjà. La dérivation la lit au lieu
  de rejouer le PGN. `/danger` passe de ~2,5 s à ~0,1 s sur 50 parties, et de ~31 s à ~1,3 s sur
  une année — ce qui rend un simple indicateur suffisant et **un job d'arrière-plan inutile**.

Le Player n'attend plus dans le vide, et le plus souvent il n'attend plus du tout.

## User Stories

1. En tant que Player, je veux que « Positions dangereuses » me dise qu'un calcul est en cours, afin de ne pas croire que la page est cassée.
2. En tant que Player, je veux que ce message soit annoncé par mon lecteur d'écran, afin d'être informé sans voir l'écran.
3. En tant que Player, je veux que le calcul soit assez rapide pour que l'attente reste anecdotique, afin de consulter mes positions dangereuses sans y penser.
4. En tant que Player ayant importé une année entière, je veux que la page reste utilisable, afin que l'import multi-mois d'US-9 ne rende pas cette page inaccessible.
5. En tant que Player, je veux qu'un échec du serveur me soit annoncé comme un échec, afin de ne pas croire que je n'ai rien analysé.
6. En tant que Player confronté à un échec, je veux pouvoir relancer le calcul, afin de ne pas avoir à recharger l'application.
7. En tant que Player n'ayant analysé aucune partie, je veux être invité à en analyser, afin de savoir quoi faire pour remplir la page.
8. En tant que Player ayant analysé des parties sans position récurrente, je veux qu'on me l'explique, afin de ne pas croire que l'analyse a échoué.
9. En tant que Player, je veux que cette explication me dise quoi faire (analyser davantage de parties), afin d'avoir une suite d'action.
10. En tant que Player, je veux ne voir que des Positions que j'ai atteintes au moins deux fois, afin que la page parle d'habitudes et non d'accidents isolés.
11. En tant que Player, je veux que la position de départ ne figure pas dans la liste, afin de ne pas voir en tête une Position que toutes mes parties partagent.
12. En tant que Player, je veux que les Positions soient classées par proportion d'erreur sérieuse, afin de voir en premier là où je me trompe le plus souvent.
13. En tant que Player, je veux que le nombre d'atteintes départage les égalités, afin qu'entre deux Positions aussi dangereuses la plus fréquente passe devant.
14. En tant que Player, je veux voir le nombre d'atteintes à côté de la proportion, afin de juger moi-même si l'échantillon est significatif.
15. En tant que Player, je veux que la page se limite à une trentaine de diagrammes, afin qu'elle s'affiche sans figer mon navigateur.
16. En tant que Player, je veux savoir combien de Positions existent au-delà de celles affichées, afin de ne pas croire que la liste est exhaustive.
17. En tant que Player, je veux que chaque diagramme continue d'indiquer le trait et d'être orienté du bon côté, afin de ne pas perdre l'acquis d'US-10a.
18. En tant que Player, je veux que les Positions dangereuses restent surlignées, afin de repérer d'un coup d'œil celles à revoir.
19. En tant que Player, je veux que la revue d'une partie unique reste sur la page Analyse, afin que « Positions dangereuses » reste un agrégat.
20. En tant que Player, je veux que la passe d'analyse conserve la FEN de chaque Position, afin que l'application n'ait pas à la recalculer à chaque consultation.
21. En tant que Player, je veux que mes analyses déjà faites ne soient pas à refaire, afin de ne pas repayer des minutes de moteur pour un changement technique.
22. En tant que Player, je veux que l'application répare seule une base antérieure au changement, afin de n'avoir aucune étape manuelle à connaître.
23. En tant que Player, je veux que cette réparation n'ait lieu qu'une fois, afin que les démarrages suivants restent immédiats.
24. En tant que Player, je veux qu'une partie irréparable redevienne « non analysée » plutôt que d'afficher des données fausses, afin de pouvoir la ré-analyser en connaissance de cause.
25. En tant que Player, je veux que les annotations de la page Analyse profitent de la même accélération, afin que la revue d'une partie soit elle aussi plus rapide.
26. En tant que développeur, je veux que la suite Happy Path couvre une page `/danger` réellement peuplée, afin que le cas nominal ne soit pas seulement testé sur fixture.
27. En tant que développeur, je veux que cette couverture ne rallonge pas la suite, afin que le gate `integration → develop` reste tenable.

## Implementation Decisions

### Domaine — ce qu'est une `Danger position`

- **Plancher de récurrence** : `reached >= 2`. Une Position vue une seule fois est un moment d'une
  partie, et relève de la revue de cette partie (page Analyse), pas de cet agrégat.
- **Exclusion de la Position initiale** : atteinte dans 100 % des parties par construction, elle
  n'est pas quelque chose que le Player *atteint*. Exclue par sa nature (ply 0), pas par une
  comparaison de FEN.
- **Classement** : par `proportion` décroissante, `reached` décroissant en cas d'égalité.
- Ces trois points sont **du glossaire**, déjà écrits dans `CONTEXT.md` sur la branche. Aucun autre
  filtre : pas de taille d'échantillon minimale au-delà du plancher de deux.

### Persistance — la FEN par demi-coup (ADR-0012)

- `evaluations` porte une colonne **`fen`**, **requise dans `schema.ts`** : aucun chemin d'insertion
  ne peut l'omettre, et la dérivation n'a jamais de `null` à traiter.
- La **passe d'analyse l'écrit** : elle la calcule déjà pour interroger le moteur. C'est le writer,
  pas la reprise, qui tient l'invariant à long terme.
- `gamePlies()` lit la FEN stockée au lieu d'appeler `gamePositions()`. C'est le point de partage
  avec les annotations d'US-7, qui héritent de l'accélération sans modification.
- **Contrôle d'intégrité à l'ouverture**, juste après `migrate()` dans `openDb()` — ADR-0003 fait
  déjà du lancement l'endroit où le schéma est mis à jour sans étape manuelle. Il détecte les lignes
  `evaluations` sans FEN et les répare en rejouant le PGN de leur partie. Idempotent : la seconde
  ouverture ne fait rien.
- **Réparation plutôt que ré-analyse** : les FEN se retrouvent dans le PGN (~2,4 s une fois pour
  toute la base actuelle), alors qu'une passe Stockfish coûte des minutes. La règle de phase dev
  « le ré-import est bon marché » ne se transporte pas à cette table.
- **Partie dont le PGN ne se rejoue pas** : ses `Evaluation`s sont supprimées et la partie repasse
  `analyzed = false`. Perdre du travail moteur est acceptable en phase dev ; servir des FEN fausses
  ne l'est pas.
- La FEN est **dénormalisée** vis-à-vis du PGN. Accepté : le dédoublonnage se fait par URL de partie
  et les PGN sont immuables à la source.

### Contrat d'API

- `GET /api/danger` renvoie la **liste complète classée**, sans plafond. ~850 entrées à l'échelle
  d'une année ≈ 90 Ko : assez peu pour que le cap reste une décision d'affichage, retunable sans
  toucher au contrat ni redéfinir le terme.
- La forme de `DangerEntry` (`fen`, `reached`, `seriousErrors`, `proportion`) est inchangée.
- **Pas de nouvelle route, pas de job, pas de polling.** Le rejet du job d'arrière-plan est motivé
  dans ADR-0012 : il masque un coût au lieu de le supprimer, et n'a aucune unité de progression
  naturelle.

### Client — les quatre états

`DangerPage` distingue quatre états là où le code en collapse deux (`dangers === null` et
`dangers.length === 0`, le `.catch` renvoyant sur le second) :

| état | rendu |
|---|---|
| calcul en cours | texte simple dans une région live (`role="status"`), sans spinner ni durée minimale d'affichage |
| échec serveur | message nommant l'échec + action de reprise ; **jamais** l'invitation |
| aucune partie analysée | l'invitation actuelle, inchangée |
| analysé, rien de récurrent | explication : les parties analysées ne repassent pas encore par les mêmes Positions |

- **Texte, pas de spinner** : à ~0,1 s un spinner clignote et se lit comme un défaut d'affichage ;
  la région live donne en outre à la Feature Path un point d'ancrage à observer.
- **Cap à 30 côté client**, avec le total annoncé en toutes lettres.
- Le surlignage sémantique et le repère non chromatique existants sont conservés (le client n'a pas
  de feuille de style — cf. US-13).

## Testing Decisions

Un bon test ici décrit ce que le Player obtient, pas comment on le calcule : le classement, ce qui
est absent de la liste, ce que la page dit dans chaque état, et le fait qu'une base d'avant le
changement redevienne utilisable. Aucun test ne doit connaître la forme d'un rejeu de PGN ni
l'existence d'un cache.

Tous les seams sont **existants** ; aucun nouveau point d'entrée n'est introduit pour la testabilité.

| ce qui est testé | seam | prior art |
|---|---|---|
| plancher de récurrence, exclusion ply-0, classement | `getDangerPositions(db)`, DB `:memory:` | `server/test/danger.test.ts` |
| contrat HTTP (liste complète, pas de cap serveur) | supertest sur `createApp` | `server/test/api.test.ts` |
| la FEN est lue et non rejouée | `gamePlies()` | `server/test/derivation.test.ts` |
| contrôle d'intégrité et réparation | **`openDb()`** sur un fichier temporaire | `server/test/repository.test.ts` |
| les quatre états, le cap à 30, le total annoncé | `<DangerPage />`, `fetch` stubbé | `client/test/DangerPage.test.tsx` |

**Le seam d'intégrité passe par `openDb()`**, pas par une fonction de réparation exposée : c'est le
point le plus haut, et c'est exactement ce que fait un vrai démarrage. La propriété qui compte
— « la seconde ouverture ne retravaille pas » — exige une base **fichier** ; `:memory:` ne se
rouvre pas. Coût mesuré : ~30 ms au total (ouverture initiale 15,9 ms, réouverture 2,2 ms, rejeu
d'une à deux parties courtes 2 à 8 ms), soit l'ordre de grandeur d'un seul test `:memory:` actuel.
**Semer des parties courtes** : la plus longue de l'historique réel coûte 105 ms à elle seule.

### Étage agentique

- **Une Feature Path par tranche**, gate d'auto-merge vers l'intégration (build + tests + FP verte,
  sans finding bloquant). Les FP pilotent l'app réelle, UI-first, sur fixture `seed:danger` — c'est
  là que le classement, le cap et le plancher se vérifient finement sur données déterministes.
- **HP-01 pas 9** au gate `integration → develop`, déjà réécrit sur la branche : la passe porte
  désormais sur **les deux parties les plus courtes ayant le même premier coup** — la Position qui
  suit ce coup leur est commune **par construction**, donc au moins une entrée est garantie quel que
  soit le compte ou la plage. **27 Positions, ~3,5 min**, soit *moins* que la partie unique analysée
  auparavant (~40). Vérifié sur la plage réelle de 82 parties : aucun des 6 groupes de premier coup
  ne fait défaut. L'assertion devient : le calcul est **annoncé**, puis au moins une `Danger
  position` **atteinte au moins deux fois**, la Position initiale **absente**.
- **Pas de 4e HP** : le plafond de 3 est atteint, et la greffe sur HP-01 suffit.

## Out of Scope

- **Job d'arrière-plan et polling pour `/danger`** — explicitement rejetés (ADR-0012), pas différés.
- **Mémoïsation ou cache de l'agrégat** — rejetée : chemin froid inchangé, risque d'invalidation.
- **Pagination de la liste** au-delà du cap : personne ne parcourt la page 12 d'une liste de
  dangers ; le cap rend le coût de rendu constant, ce qu'une pagination ne fait pas.
- **Rendre le cap ou le plancher configurables** par le Player.
- **Retoucher la définition d'une erreur sérieuse**, la fenêtre de 10 demi-coups ou la courbe
  cp → winning chances (ADR-0009).
- **Les findings ouverts d'US-10a** : la barre de winning chances qui ne suit pas l'orientation, le
  libellé `candidates` de l'Explorateur, les instructions de glisser-déposer injectées par
  `react-chessboard` dans chaque diagramme, la longueur des noms d'ouverture.
- **Le style** de la page (US-13). Les surlignages restent inline avec leur repère non chromatique.
- **Le scoping par profil** (US-11) : `/danger` reste calculé sur toutes les parties.

## Further Notes

- Ordre des tranches délibéré : **agrégat vrai → quatre états → FEN stockée**. La valeur visible
  arrive en premier (le gel du navigateur disparaît avec la première tranche, qu'aucun travail
  serveur n'aurait corrigé), et l'état « calcul en cours » se teste pendant que l'attente dure
  encore des secondes — donc **avant** la tranche qui la réduit à 0,1 s.
- **Effet de bord assumé** : un Player n'ayant analysé qu'une ou deux parties verra désormais le
  quatrième état là où il voyait 119 diagrammes. C'est la correction visée, pas une régression —
  la revue d'une partie unique appartient à la page Analyse. HP-01 le vérifie sur le chemin réel.
- Les chiffres cités (2419 ms de rejeu, 41 ms de N+1, 3736 entrées dont 66 récurrentes, 400 Ko,
  ~850 entrées et ~90 Ko à l'échelle d'une année, 0/6 groupes en défaut) ont été **mesurés le
  2026-08-14** contre l'historique réel importé, dont une importation fraîche des 82 parties de la
  plage 2026-05 → 2026-06. Ils sont coûteux à reproduire : ne pas les ré-estimer à vue.
- Le backlog soupçonnait le N+1 ; la mesure l'a innocenté (41 ms). C'est le rappel utile de la
  consigne « commencer par mesurer » qui figurait dans l'entrée US-10b.
