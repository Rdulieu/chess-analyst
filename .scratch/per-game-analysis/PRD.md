# PRD — Comprendre l'analyse sur une partie (US-15a)

Status: ready-for-agent

Business story : **US-15a** (`BACKLOG.md`), sortie de l'EPIC **US-15**.
Branche d'intégration : `integration/US-15a-per-game-analysis` (PR vers `develop` **dès la fin de
15a** — l'EPIC ne la retient pas).
Décisions de grilling : modèle **D1→D14** (`.scratch/weakness-profile/GRILL-NOTES.md`), front
**F1→F12** (`.scratch/per-game-analysis/GRILL-FRONT.md`), coutures
(`.scratch/per-game-analysis/SEAMS.md`).
`CONTEXT.md` : **`Best line`**, **`Phase`**, **`Counted Move`**, **`Drift`**, **`Search regime`**,
**`Review mode`** ; `Analysis pass` amendée.
ADR : **0016** (ce que le pass stocke et sous quel régime) et **0017** (le verdict est un pliage de
relevés par partie) ; **note ajoutée à ADR-0015** (l'exception « on jette les analyses existantes »).

## Problem Statement

L'app dit au Player **qu'un** coup était mauvais, jamais **pourquoi**, ni **ce qu'il fallait jouer**.
Sur la page Analyse il lit aujourd'hui un glyphe (`?!`/`?`/`??`), une `Evaluation`, une barre et une
courbe : de quoi savoir **où** ça a dérapé, jamais de quoi **comprendre**. Le moteur a pourtant
calculé la réponse — sa variante — et on la **jette** au parsing.

Et l'EPIC US-15 va bientôt lui annoncer des **faiblesses** (« tu t'effondres en finale »). Un tel
verdict est un **conseil** : il ne vaut que ce vaut la capacité du Player à le vérifier. Or il n'a
aujourd'hui **aucun moyen** de savoir comment un chiffre global a été obtenu, quels coups y ont
contribué, ni lesquels ont été écartés et pourquoi. Sans ça, il lui reste à croire l'app sur parole —
exactement ce que cette EPIC ne peut pas se permettre.

## Solution

Rendre l'analyse d'**une** partie entièrement lisible, coup par coup, sur la page Analyse.

Le Player choisit ce qu'on lui montre (`Review mode`) : rien du moteur (**Unaided**, le défaut), les
annotations d'aujourd'hui (**Annotated**), ou le **relevé complet** (**Detailed**). En Detailed,
chaque coup qu'il a joué expose ce qu'il a coûté, **ce qu'il fallait jouer** et **comment son coup est
réfuté** — les deux variantes du moteur, avec une flèche sur le plateau et un aperçu position par
position — sa `Phase`, et **s'il compte dans l'analyse, sinon pourquoi pas**. Un récapitulatif en tête
du panneau dit ce que cette partie contribuera à l'agrégat : coups comptés, exclus par motif, erreurs
comptées, chances perdues, **dérive**. Un second graphique aligné sur la courbe montre le cumul des
chances perdues, où les erreurs signalées sont des **falaises** et la dérive la **pente entre elles**.

Aucun agrégat, aucune page de verdict : la valeur de cette story est « **je peux évaluer la
méthode** », pas « je sais sur quoi travailler ».

## User Stories

1. En tant que Player, je veux voir, pour un coup que j'ai joué, **ce que le moteur aurait joué**, afin de comprendre ce que j'ai manqué.
2. En tant que Player, je veux voir **la suite** de ce meilleur coup et pas seulement le coup, afin de comprendre *pourquoi* il est meilleur.
3. En tant que Player, je veux voir **comment mon coup est réfuté**, afin de comprendre ce que l'adversaire aurait pu me faire.
4. En tant que Player, je veux que le meilleur coup soit **dessiné sur le plateau**, afin de ne pas avoir à traduire une notation en position.
5. En tant que Player, je veux **parcourir une variante position par position** en pointant ses coups, afin de la lire sans avoir à la visualiser de tête.
6. En tant que Player naviguant au clavier, je veux atteindre chaque coup d'une variante **au focus**, afin d'avoir accès à la même lecture qu'à la souris.
7. En tant que Player, je veux que l'aperçu d'une variante **ne me fasse pas perdre ma place** dans la partie, afin de reprendre ma lecture là où j'étais.
8. En tant que Player, je veux savoir **combien de chances de gain** un coup m'a coûté, afin de mesurer sa gravité autrement que par un glyphe.
9. En tant que Player, je veux savoir dans quelle **`Phase`** un coup a été joué, afin de relier mes erreurs à un moment de la partie.
10. En tant que Player, je veux **voir où tombent les frontières de phase** dans une partie réelle, afin de pouvoir contester des seuils qui ne sont que des heuristiques.
11. En tant que Player, je veux savoir si un de mes coups **compte** dans l'analyse, afin de comprendre ce qui alimente les chiffres.
12. En tant que Player, je veux savoir **pourquoi** un coup ne compte pas — position déjà décidée ou coup forcé — afin de ne pas confondre deux situations qui ne disent pas la même chose.
13. En tant que Player, je veux repérer dans la liste des coups le cas troublant — **un coup signalé qui ne compte pas** — afin de ne pas le prendre pour un bug.
14. En tant que Player, je veux un **récapitulatif de la partie** (coups comptés, exclus, erreurs comptées, chances perdues, dérive), afin de savoir ce que cette partie apportera à l'analyse globale.
15. En tant que Player, je veux que ce récapitulatif **se somme** vers l'agrégat futur, afin que le global soit vérifiable depuis le particulier.
16. En tant que Player, je veux voir le **cumul des chances perdues** sur la partie, afin de distinguer « je me suis effondré une fois » de « j'ai saigné tout du long ».
17. En tant que Player, je veux que ce tracé soit **aligné** sur l'`Evaluation curve`, afin de comparer les deux d'un regard vertical.
18. En tant que Player, je veux que **chaque graphique porte une étiquette**, afin de ne pas confondre deux dessins qui ne disent pas la même chose.
19. En tant que Player, je veux lire la **dérive en chiffres** et pas seulement en pente, afin de la retrouver quand je n'ai que du texte.
20. En tant que Player, je veux choisir **ce que l'app me montre du moteur** (`Review mode`), afin de lire une partie sans me faire souffler la réponse.
21. En tant que Player, je veux que la page **ne montre rien du moteur par défaut**, afin d'exercer mon propre jugement avant de consulter le sien.
22. En tant que Player, je veux que **mon choix de mode soit mémorisé**, afin de ne pas le refaire à chaque partie.
23. En tant que Player, je veux qu'**une analyse qui se termine me montre son résultat**, afin de ne pas croire qu'elle n'a rien fait.
24. En tant que Player, je veux **lancer une analyse depuis la page Analyse**, afin de ne pas repasser par la liste des parties.
25. En tant que Player, je veux être **averti avant d'écraser une analyse existante**, avec le coût de sa reconstruction, afin de ne pas jeter des minutes de calcul par réflexe.
26. En tant que Player, je veux pouvoir **annuler** cet avertissement sans rien détruire, afin que le geste destructeur ne soit jamais le geste par défaut.
27. En tant que Player, je veux savoir **sous quel régime** (profondeur, nombre de lignes) une partie a été analysée, afin de juger la confiance à accorder à ses chiffres.
28. En tant que Player, je veux que le **plateau soit entièrement visible au chargement**, afin de lire la position sans défiler.
29. En tant que Player, je veux une **indication qu'une section existe plus bas**, afin de ne pas manquer le relevé.
30. En tant que Player utilisant un lecteur d'écran, je veux que tout chiffre dessiné existe **aussi en texte**, afin que rien ne me soit inaccessible.
31. En tant que Player, je veux que les marqueurs ne reposent **jamais sur la couleur seule**, afin de les lire quel que soit mon écran ou ma vision.
32. En tant que Player, je veux que la **liste des coups reste scannable**, afin de garder la vue d'ensemble que le relevé détaillé ne donne pas.
33. En tant que Player, je veux que le relevé porte sur **le coup que je regarde**, afin que la lecture suive ma navigation sans manipulation supplémentaire.
34. En tant que Player, je veux que rien **au-dessus du plateau ne bouge** quand j'avance dans la partie, afin de ne pas perdre la position des yeux.
35. En tant que Player possédant plusieurs `Profile`s, je veux que tout ceci reste **cloisonné par profil**, afin que les analyses d'un compte n'apparaissent jamais sous un autre.
36. En tant que Player, je veux pouvoir **relancer une analyse interrompue** sans perdre ce qui était déjà calculé, afin de ne pas repayer du temps moteur.
37. En tant que Player, je veux qu'une partie ne mélange **jamais deux régimes d'analyse**, afin que ses chiffres soient comparables entre eux.
38. En tant que développeur de l'EPIC, je veux que le relevé par partie soit **la même fonction** que celle que l'agrégat pliera, afin qu'aucune divergence ne soit possible entre les deux vues.

## Implementation Decisions

### Stockage et moteur

- `evaluations` gagne **`pv`** (la variante **entière**, en **UCI**, telle que le moteur la sort),
  **`cp2`/`mate2`** (le score de la deuxième ligne seulement, pas sa variante) et **`pass_id`**.
- **Une seule colonne pour la ligne** : le meilleur coup est la **tête** de la `pv` ; pas de colonne
  `bestmove` qui pourrait diverger de la variante. La tête de PV fait foi.
- La variante est stockée **entière** ; le plafonnement est un **choix d'affichage** (≈6 plys montrés,
  le reste atteignable), jamais un plafond de stockage.
- `analysis_passes` porte le **`Search regime`** : la **profondeur** et le **nombre de lignes**. La
  provenance vit sur le **pass**, pas répétée sur chaque ligne ; `pass_id` est la relation qui
  **manquait** (`game_ids` est un tableau JSON, aucune jointure n'existait).
- Le driver UCI passe en **MultiPV=2** et cesse de jeter les lignes `info` : la `pv` et le second
  score y sont déjà. **Stocker la variante ne coûte aucun temps moteur** ; MultiPV=2, si.
- **Mesure due dans cette story** : le rapport de coût MultiPV=2 / MultiPV=1 sur ~50 parties.
  **< 1,5× → gardé ; 1,5×–2× → la décision revient au demandeur ; > 2× → la méthode est revue.**
  Rapportée, **jamais assertée dans un test**. La **profondeur reste 16** (ADR-0009,
  reproductibilité) : ce n'est pas la variable d'ajustement.
- **Les `Evaluation`s existantes sont jetées** et `pv` est **requis** (exception nommée à ADR-0015).
  Périmètre : les lignes `evaluations`, **pas la base** — profils, parties, PGN, ouvertures et
  `move_habits` intacts.
- **La reprise doit vérifier le régime** : reprendre une partie dont les lignes viennent d'un autre
  régime la **réévalue entière**, parce que la dérive est une somme sur tous les plys et mélangerait
  deux profondeurs dans un seul nombre. La reprise **au même régime** continue comme aujourd'hui.
- **Le court-circuit `analyzed` doit être réordonné** : `analyzeGame` sort immédiatement sur le
  drapeau, et le job filtre sur `!analyzed`, **avant** que quoi que ce soit ne regarde le régime — la
  règle ci-dessus ne pourrait jamais s'appliquer. Une ré-analyse explicite, déclenchée par le Player,
  doit exister.

### Dérivation (rien de tout ceci n'est stocké)

- **`Phase`** : *Early game* jusqu'au plus tôt de « développement terminé » (les quatre mineures ont
  quitté leur case d'origine et le roi a castlé ou perdu le droit) ou du **coup 15** ; *Endgame* dès
  que majeures + mineures des deux camps tombent à **six ou moins** ; *Middlegame* par exclusion.
  **Latching** : une partie entrée en Endgame y reste (une promotion est la seule chose qui *ajoute*
  du matériel et ferait osciller la phase). Dérivée du FEN déjà stocké — donc **retunable sans
  relancer le moteur**, ce qu'on va vouloir faire dès les premières parties regardées.
- **`Counted Move`** : un Move du Player est exclu s'il est **forcé** (un seul coup légal — compté
  sans moteur) ou si sa position était **déjà décidée** (chances du Player avant le coup **sous le
  plancher `Inaccuracy`, 10 %**). Asymétrique **exprès** : une bande symétrique exclurait aussi les
  positions gagnantes et **supprimerait de l'outil le défaut de conversion**. Aucun seuil nouveau —
  celui-ci est déjà publié.
- Conséquence à connaître : « déjà décidée » **ne peut jamais** cacher un Move signalé (signaler
  demande 10 % de chute, donc 10 % à perdre) ; seul **forcé** peut exclure un Move signalé.
- **`Drift`** : **résidu**, par construction — total des chances perdues par le Player moins ce que
  les Moves signalés ont perdu. Pas d'épisode, pas de segmentation, aucun réglage nouveau, aucun
  double comptage.
- **Récapitulatif par partie** : nouvelle fonction exportée au **plus haut point** de la dérivation,
  parce que l'agrégat de 15c pliera **cette même fonction** (ADR-0017) : Moves comptés sur le total,
  exclus par motif, erreurs comptées, chances perdues, dérive, et le `Search regime` (uniforme par
  partie, par construction).

### API

- Le relevé d'une partie étend le contrat des annotations existant : par ply, la sévérité et
  l'`Evaluation` (comme aujourd'hui) **plus** la `Best line`, le delta, la `Phase`, et le statut
  compté / motif d'exclusion ; **plus** le récapitulatif de la partie et son `Search regime`. Le cas
  « partie non analysée » reste distinct d'un résultat vide.

### Front

- **`Review mode`** : **Unaided / Annotated / Detailed**, un contrôle à **trois niveaux** (jamais deux
  cases indépendantes : cacher les annotations tout en affichant « −28 %, meilleur : Bxh7+ » serait
  une page qui se contredit). **Défaut Unaided**, **persisté** (précédent `localStorage` du `Profile`
  courant). **Annotated reste exactement ce qu'US-7/US-14 ont livré.**
- **Terminer un `Analysis pass` sur la partie en cours de revue promeut cette revue en `Annotated`** —
  le Player a demandé l'analyse ; la finir en silence lui rendrait un pass réussi indistinguable d'un
  pass sans effet.
- **Liste des coups = vue d'ensemble** : SAN, glyphe, `Evaluation`, **plus un marqueur textuel sur les
  seuls Moves signalés qui ne comptent pas**. Les exclusions « déjà décidée » sont dites **en
  agrégat** dans le récapitulatif (dans une partie perdue au coup 25, les marquer toutes ferait
  dix-huit marqueurs sans surprise).
- **Panneau de détail = le relevé du Move sélectionné**, **sous** la rangée du plateau, dans son
  propre panneau, avec un **titre** ; sa hauteur variable ne déplace donc rien au-dessus du plateau.
  Un seul Move à la fois — la comparaison entre Moves est le rôle de l'agrégat.
- La navigation reste pilotée par l'`index` existant du plateau : **source unique** de « où est le
  Player ».
- **`Best line`** : le texte, **une flèche sur le plateau** pour le premier coup de chaque ligne
  (meilleur coup, et premier coup de la réfutation), et un **aperçu au focus** — pointer ou focaliser
  un ply de la ligne affiche cette Position, temporairement, **sans jamais toucher l'`index`**.
  Chaque ply est un bouton focusable (le survol n'est que son affordance pointeur), calculé en
  rejouant les *k* premiers coups UCI depuis la Position affichée : **aucun arbre, aucune branche,
  aucune variante stockée**.
- **Récapitulatif en tête du panneau**, et il **absorbe `ErrorTallyReadout` en Detailed** : les deux
  peuvent légitimement différer d'une unité (un Move signalé mais forcé), et deux résumés en
  désaccord **correct** côte à côte se lisent comme un bug. Le récap énonce les deux chiffres **et la
  raison de l'écart**.
- **Second graphique** pour le **cumul des chances perdues**, son propre dessin, **partageant l'axe des
  x** et aligné avec la courbe ; **une seule grandeur** (la dérive s'y *lit* : falaises = Moves
  signalés, pente = dérive). **Chaque graphique porte une étiquette visible** — la courbe en gagne une,
  elle n'en avait pas.
- **`Phase` à quatre distances** : étiquette dans le panneau, **marqueur textuel de transition dans la
  liste** (deux au maximum, grâce au latching), **règles de frontière** sur les graphiques (l'idiome de
  la ligne d'égalité existante), et un **ruban étiqueté entre les deux graphiques** — un seul ruban
  pour les deux, puisqu'ils partagent l'axe. Pas de **bandes de fond** : les deux aires de la courbe
  sont **opaques** et pleine hauteur, donc ce qui est derrière est invisible, et teinter par-dessus
  déplacerait le contraste mesuré des marqueurs (ADR-0013).
- **Lancer / relancer l'analyse depuis la page Analyse**, avec une **confirmation** quand une analyse
  existe : carte `role="alertdialog"` **en page**, sur le modèle exact de la suppression de profil —
  elle **nomme la partie**, dit ce qui est perdu **et ce que coûte sa reconstruction**, avec
  **Annuler en action primaire**. Pas de `confirm()` natif : ce cas avertit d'une **destruction**, pas
  d'une durée.
- **Ancre vers le panneau placée dans le panneau latéral**, à côté du plateau et non au-dessus de la
  rangée : tout ce qui est empilé au-dessus du diagramme est de la hauteur que le diagramme n'a pas —
  et **le plateau doit être entier au chargement**. Le défilement, lui, est acceptable.
- Le `Search regime` est affiché **une fois**, dans le récapitulatif (uniforme par partie).

## Testing Decisions

Un bon test ici décrit un **comportement observable** — ce qu'un relevé dit d'une partie, ce que la
page montre dans un mode — et jamais la forme interne d'un module. Les coutures sont détaillées dans
`.scratch/per-game-analysis/SEAMS.md` ; **toutes sauf une sont existantes**, et chacune est prise au
point le plus haut possible.

- **Fonctions pures de la dérivation** (art antérieur : `derivation.test.ts` et son helper qui
  fabrique des lignes stockées) : `Phase` et son latching, `Counted Move` et **quel** motif l'exclut,
  `Drift` en résidu, le récapitulatif. **L'essentiel de la logique, à la couture la moins chère.**
  Cas à couvrir explicitement : une position sous 10 % ne peut produire aucun Move signalé ; un coup
  **forcé** signalé est exclu ; le récap se somme au total.
- **Driver UCI avec un transport scripté** (art antérieur : `engine.test.ts`) : la `pv` extraite des
  lignes `info`, les deux lignes `multipv`, l'absence de second score quand il n'y a qu'un coup légal.
- **`analyzeGame` / le job avec le fixture engine** (art antérieur : `analysis.test.ts`) : le régime
  écrit sur le pass, `pass_id` sur les lignes, reprise **même régime** qui continue, reprise **régime
  différent** qui réévalue entier, et la ré-analyse explicite d'une partie déjà analysée.
- **Migration sur un second `openDb`** (art antérieur : `profiles-migration.test.ts`) : le schéma
  monte, `pv` est requis, et les anciennes lignes ne sont plus là.
- **Contrat HTTP** (art antérieur : `api.test.ts`, `annotations.test.ts`) : la forme du relevé, le
  récapitulatif, et le cas « partie non analysée » distinct d'un vide.
- **Composants client** (art antérieur : `ProfilesPage.test.tsx`, `Board.test.tsx`, `arrows.test.ts`) :
  les trois modes et le défaut Unaided, la promotion en Annotated à la fin d'un pass, la persistance
  du mode, le marqueur sur un Move signalé non compté, l'aperçu **au focus** qui ne déplace pas
  l'`index`, le récap absorbant le tally, la confirmation d'écrasement et son annulation.
- **Nouvelle couture, une seule** : la fonction de **récapitulatif par partie**, exportée au plus haut
  point de la dérivation, pour que l'agrégat de 15c plie **la même**.
- **À amender, pas à contourner** : le défaut passant à Unaided, **HP-01 (étapes 7 et 9)** et
  **`GameViewer.test.tsx`, `Board.test.tsx`, `AnalysePage.test.tsx`, `denseScreens.test.ts`** affirment
  l'ancien défaut.
- **Apex agentique** : chaque tranche porte son **FP** exécutable comme gate d'auto-merge. Pour les
  tranches serveur (schéma, moteur, dérivation) le FP s'exerce sur l'app qui tourne au niveau API,
  faute d'UI à piloter ; dès la première tranche front il redevient **UI-first**. **Pas de 4e HP** :
  US-15a **se greffe sur l'étape 9 de HP-01**, qui traverse déjà la page Analyse — même choix qu'US-14
  (au plus 3 HP).
- **Hors des tests, exprès** : la **mesure MultiPV** (une mesure rapportée, pas une assertion : un
  seuil temporel casserait sur une machine chargée) ; la **valeur du tracé de dérive** (dix parties
  réelles, puis on garde ou on supprime) ; la **lisibilité de l'empilement** du panneau latéral (à
  regarder dans le FP, pas à affirmer).

## Out of Scope

- **Tout agrégat** : aucun taux par bucket, aucun classement, aucune page de verdict. C'est 15c/15d,
  et c'est là que se tranchera « taux marginaux ou conditionnels ».
- **La navigation dans les variations** (jouer une ligne sur le plateau, créer une branche) :
  c'est la mécanique centrale d'**US-16**, et en construire une version jetable ici contraindrait sa
  conception.
- **La pression du temps** (`[%clk]`) : c'est **US-15b**, sans coût moteur.
- **Toute étiquette de nature d'erreur** (« tactique » / « positionnelle ») : on **montre la
  variante** plutôt que d'affirmer une catégorie qu'on classerait mal. Les motifs viennent en 15e+,
  un prédicat nommé à la fois.
- **Le suivi dans le temps** d'une faiblesse (est-ce que ça s'améliore ?).
- **Toute modification du mode Annotated** au-delà de son défaut : ce qu'US-7 et US-14 ont livré ne
  change pas.
- **Le mode aveugle d'US-16** : `Unaided` est un niveau d'affichage, **pas** une garantie sur ce que
  le Player a déjà vu.
- **La ré-analyse automatique** ou en arrière-plan : tout run moteur reste déclenché par le Player.

## Further Notes

- **Cette story ne prouve rien de la thèse de l'EPIC**, et c'est un coût délibéré : à sa sortie, on
  aura une vue par partie auditable et **toujours aucune idée** de ses faiblesses. Sa valeur se juge à
  « je peux évaluer la méthode ». Le gain est qu'à l'arrivée de 15c, on pourra la **croire**.
- **La story est grosse** : schéma + moteur + une mesure + une ré-analyse + une dérivation neuve +
  une visualisation neuve. Balle traçante : schéma/régime/PV stockée → le relevé par Move à l'écran →
  le tracé de dérive → le récapitulatif.
- **Deux corrections faites en cours de grilling**, à ne pas réintroduire : la variante n'est **pas**
  une ré-analyse coûteuse (elle est déjà calculée et jetée) ; et l'exemple « quatre gaffes, zéro
  comptée » est **faux** depuis la règle asymétrique — seul un coup **forcé** peut être signalé et non
  compté.
- Dépendance **levée** : US-11 est mergée, donc tout ce que cette story dérive naît **cloisonné par
  `Profile`**.
