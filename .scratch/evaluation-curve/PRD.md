# PRD — La courbe d'évaluation à côté du plateau (US-14)

Status: ready-for-agent

Business story: **US-14** (`BACKLOG.md`).
Branche d'intégration : `integration/US-14-evaluation-graph`.
Décisions de grilling : `CONTEXT.md` (nouveau terme **`Evaluation curve`**, `Evaluation` complété).
**Pas d'ADR** — rien n'est coûteux à défaire (composant client isolé, aucun schéma, aucun endpoint,
aucune donnée persistée) et l'unique arbitrage découle d'**ADR-0009**.

## Problem Statement

Sur la page Analyse, le Player ne peut lire l'`Evaluation` de sa partie que **coup par coup** : le
readout du coup courant (`+0.3`), la barre d'avantage de l'instant, et la valeur en face de chaque
coup dans la liste. Trois vues du même demi-coup, aucune de la partie.

Il ne peut donc pas répondre aux questions qui l'intéressent en revue :

- **À quel moment la partie a-t-elle basculé ?** Le trouver aujourd'hui demande de parcourir la
  liste des coups en comparant des nombres de tête, sur 60 à 100 demi-coups.
- **Est-ce que ça s'est joué sur un coup, ou dégradé lentement ?** Une chute brutale et une érosion
  continue se lisent identiquement : une colonne de nombres.
- **Combien de fois me suis-je trompé dans cette partie, et à quel point ?** Les glyphes
  `?!`/`?`/`??` sont posés dans la liste des coups, dispersés ; rien ne les totalise. Le Player doit
  faire le décompte à l'œil.

Les données pour répondre sont **déjà chargées** par la page : `GET /api/games/:id/annotations`
renvoie, pour chaque demi-coup, l'`Evaluation` en repère Blancs, les winning chances et la sévérité.
Il manque uniquement une forme qui les montre **d'un coup**.

## Solution

À côté du plateau, sur la page Analyse, une **`Evaluation curve`** : le déroulé de la partie de
gauche (Position initiale) à droite (dernier coup), où la part de l'image occupée par chaque camp
est ses **winning chances**. L'avantage se lit comme une surface qui grandit et se rétracte ; une
chute brutale est un décrochement visible ; une partie égale est une bande médiane stable.

Les erreurs du Player y sont **posées là où elles ont eu lieu**, marquées de leur glyphe
(`?!`/`?`/`??`), et **totalisées en texte** à côté du graphique : le Player voit à la fois combien
il en a fait, de quelle nature, et à quel moment.

Le **coup en cours** est mis en avant par un curseur qui suit la navigation du plateau. Le Player
navigue comme avant (boutons, liste des coups) ; le graphique lui dit **où il en est dans la
partie**, et la vue d'ensemble lui dit **où il devrait aller regarder**.

C'est une US **d'affichage** : aucune valeur nouvelle n'est calculée, aucun appel réseau ajouté,
aucun changement serveur.

## User Stories

1. En tant que Player, je veux voir l'évaluation de toute ma partie d'un seul coup d'œil, pour
   repérer le moment où elle a basculé sans parcourir 80 nombres.
2. En tant que Player, je veux que le début de la partie soit à gauche et la fin à droite, pour lire
   la partie dans le sens où je l'ai jouée.
3. En tant que Player, je veux que la part de l'image occupée par un camp grandisse quand il prend
   l'avantage, pour lire un rapport de force sans lire de chiffre.
4. En tant que Player, je veux que la courbe parte d'une position d'égalité, pour que le début de
   partie ne suggère pas un avantage qui n'existe pas.
5. En tant que Player, je veux distinguer une chute brutale d'une dégradation lente, pour savoir si
   ma partie s'est jouée sur un coup ou sur une série.
6. En tant que Player, je veux que la courbe dise exactement la même chose que la barre d'avantage
   juste à côté d'elle, pour ne jamais avoir à me demander laquelle croire.
7. En tant que Player, je veux que le coup que je suis en train de regarder soit mis en avant sur la
   courbe, pour situer la position affichée dans l'ensemble de la partie.
8. En tant que Player, je veux que ce repère suive ma navigation (avant, arrière, saut direct à un
   coup), pour que le graphique reste synchronisé avec le plateau sans que j'aie à y penser.
9. En tant que Player, je veux voir mes erreurs marquées à l'endroit de la partie où je les ai
   commises, pour relier une chute d'évaluation à sa cause.
10. En tant que Player, je veux distinguer une imprécision d'une grosse erreur sur le graphique,
    pour prioriser ce que je vais revoir.
11. En tant que Player, je veux que cette distinction ne repose pas seulement sur une couleur, pour
    la lire quel que soit mon rapport aux couleurs.
12. En tant que Player, je veux le nombre de mes erreurs par nature, pour juger la partie dans son
    ensemble et pas coup par coup.
13. En tant que Player, je veux que ce décompte soit annoncé comme **le mien**, pour ne pas croire
    qu'il porte aussi sur mon adversaire.
14. En tant que Player, je veux que la courbe montre les deux camps même si seules **mes** erreurs
    sont marquées, parce que l'évaluation est un fait de la position, pas de moi.
15. En tant que Player, je veux que le graphique soit à côté du plateau, pour le consulter sans
    perdre la position des yeux.
16. En tant que Player, je veux que la valeur précise (`+0.3`) reste lisible là où elle est
    aujourd'hui, parce que la courbe donne une forme, pas un chiffre.
17. En tant que Player, je veux que la lecture précise reste possible coup par coup dans la liste
    des coups, pour vérifier ce que la forme me suggère.
18. En tant que Player, je veux qu'une position de mat se lise comme un avantage total, pour que la
   fin d'une partie décisive ne s'affiche pas comme un avantage ordinaire.
19. En tant que Player qui utilise un lecteur d'écran, je veux que le graphique ne me lise pas 80
    valeurs à la suite, parce que cette information m'est déjà donnée coup par coup ailleurs.
20. En tant que Player qui utilise un lecteur d'écran, je veux que le décompte de mes erreurs soit du
    vrai texte, parce que c'est la seule information que le graphique ajoute.
21. En tant que Player, je veux que la page Analyse ne se mette pas à m'annoncer une chose de plus à
    voix haute, parce qu'elle en annonce déjà trop.
22. En tant que Player, je veux que le graphique disparaisse quand je décoche « Afficher les
    annotations », pour que cette case veuille toujours dire la même chose.
23. En tant que Player, je veux que la mise en page ne saute pas quand je décoche cette case, pour
    ne pas perdre le plateau des yeux.
24. En tant que Player ouvrant une partie non analysée, je veux comprendre pourquoi il n'y a pas de
    courbe, sans qu'on me le répète trois fois — le message et le bouton « Analyser » sont déjà là.
25. En tant que Player, je veux que la courbe apparaisse dès que l'analyse de la partie se termine,
    sans recharger la page.
26. En tant que Player, je veux que le reste de la page Analyse continue de fonctionner exactement
    comme avant (navigation, sauts, en-tête de partie, surlignage de la case fautive).
27. En tant que Player, je veux que l'Explorateur et « Positions dangereuses » ne changent pas,
    parce que cette US ne les concerne pas.
28. En tant que Player, je veux que la courbe s'affiche instantanément, parce qu'elle ne demande
    aucune donnée que la page n'ait déjà.

## Implementation Decisions

### La grandeur dessinée : les winning chances, pas les centipions

La hauteur de chaque camp dans la courbe est ses **winning chances** (0–100, repère Blancs), la même
grandeur que la barre d'avantage. Motifs :

- C'est la seule des deux grandeurs qui est **bornée**, donc la seule qu'on puisse dessiner sans
  inventer un écrêtage.
- Elle **sature** aux extrêmes, ce qui aligne la courbe sur la définition des sévérités
  (`CONTEXT.md`) : une chute visible correspond à l'erreur marquée juste dessus.
- Un mat se lit comme une surface pleine, sans cas particulier.
- Barre et courbe deviennent **la même chose** (l'une à l'instant, l'autre dans le temps), ce qui
  rend l'exigence « aucune divergence entre les vues » vraie par construction et non par vigilance.

Écrêter des centipions à ±N aurait introduit une **règle de présentation nouvelle** (le choix de N,
le sort des mats) dans une US d'affichage, et donné un graphique qui ne dit plus la même chose que
la barre placée à côté de lui. L'`Evaluation` chiffrée (`+0.3`, `#3`) reste affichée là où elle
l'est déjà : readout du coup courant et liste des coups, inchangés.

### Le graphique vit dans le composant du plateau

Il est rendu par le composant plateau, **conditionné à la présence des annotations** — le précédent
exact de la barre d'avantage, qui vit là et disparaît sans annotations. Conséquences :

- **Aucun état remonté.** Le demi-coup courant est l'index de navigation interne du plateau ; le
  graphique le **lit**. Le graphique n'étant pas cliquable, le flux est à sens unique et il n'y a
  rien à partager dans les deux sens.
- La courbe est portée par un **composant dédié** (`EvaluationGraph`), appelé par le plateau, jamais
  inliné.
- Le jour où la courbe deviendrait une commande (cliquer pour sauter à un coup), remonter l'index
  dans `GameViewer` sera un refactoring local. Ce n'est pas dans cette US.

### Périmètre d'impact : le plateau n'a qu'un seul appelant

Vérifié au grilling : le composant plateau est utilisé **uniquement** par `GameViewer` (page
Analyse). L'Explorateur et « Positions dangereuses » instancient directement le `Chessboard` de
`react-chessboard` et ne voient pas passer ce changement. La vigilance « le plateau est partagé »
héritée d'US-10a portait sur le **terme** `Board orientation`, pas sur le composant.

Impacts réels, tous sur la page Analyse : la mise en page du composant plateau (une rangée
plateau | graphique, sans feuille de style — US-13), ses tests unitaires, et le parcours HP qui
passe par Analyse.

### Un seul décompte d'erreurs : celui du Player

`3 ?!`, `1 ?`, `2 ??` — les trois sévérités de `CONTEXT.md`, comptées sur les **seuls coups du
Player**, agrégées **côté client** depuis les annotations déjà chargées (agrégat d'affichage, aucun
appel supplémentaire, conforme à ADR-0009 qui dérive tout à la lecture).

Les deux colonnes W/B de l'illustration de référence sont **hors d'atteinte sans valeur nouvelle** :
la dérivation serveur laisse la sévérité **nulle sur tous les coups de l'adversaire**, parce que
`CONTEXT.md` en fait une décision de domaine (« this tool is about the player's own improvement »),
pas un oubli.

**Conséquence assumée** : la courbe montre les deux camps (l'`Evaluation` est un fait de la
Position), les marqueurs seulement le Player. Le libellé du décompte doit donc dire « **vos**
erreurs » — sans quoi une chute sans marqueur, sur un coup adverse, se lira comme un bug.

### Les erreurs : marquées **et** décomptées

Le décompte répond « combien », la courbe répond « quand », et c'est le « quand » qui justifie un axe
temporel. Les deux, donc.

Le marqueur porte le **glyphe** (`?!`/`?`/`??`), pas une pastille de couleur : c'est le vocabulaire
déjà à l'écran dans la liste des coups, et la sévérité est distinguée par la **forme**, pas par la
teinte — la règle que le projet s'impose depuis US-3, tenable ici sans inventer de palette dans un
projet sans feuille de style. La teinte par sévérité (déjà définie pour le surlignage de case) peut
renforcer, jamais porter seule.

### Géométrie

- **Abscisse** : un point par `Move` (demi-coup), **espacement uniforme**. Pas le temps de
  réflexion, qu'on n'a pas ; pas les coups complets, les annotations étant par demi-coup et
  index-alignées sur la navigation.
- **Bord gauche** : le demi-coup 0, la **Position initiale**, à égalité. C'est déjà l'état
  d'ouverture du plateau, donc le curseur est au bord gauche à l'ouverture, sans cas particulier.
  Noter que `/danger` **exclut** la Position initiale : c'est une règle d'agrégat (elle est atteinte
  dans toutes les parties), sans portée ici — une partie unique a un point de départ qui a un sens.
- **Un seul repère** : la médiane (égalité). Pas de graduation chiffrée, pas de grille : la lecture
  précise se fait sur le readout et la liste des coups.

### Accessibilité : le graphique est explicitement redondant

Le graphique est **`aria-hidden`**, et c'est une description exacte de ce qu'il est, pas un
renoncement : chaque donnée qu'il porte est déjà du texte **dans le même composant** — la liste des
coups donne SAN + glyphe + `Evaluation` pour chaque demi-coup, le readout donne le coup courant et sa
valeur, la barre donne la balance de l'instant. Un libellé résumant 80 demi-coups serait du bruit ;
en produire une interprétation (« l'avantage bascule au 23ᵉ ») serait de la **valeur nouvelle**, hors
périmètre.

Le **décompte d'erreurs, lui, est du vrai texte**, dans le flux : c'est la seule information que
cette US ajoute.

Deux bénéfices de bord, tous deux voulus : aucun second `role="img"` chiffré dans le composant (donc
pas de collision avec les requêtes accessibles existantes de la barre), et **aucune région annoncée
de plus** sur une page qui en compte déjà une de trop (celle de `react-chessboard`, tierce, finding
ouvert depuis US-8).

Le repère du coup courant reste **doublement porté** : le curseur sur la courbe (visuel) et
l'`aria-current` déjà posé sur le coup dans la liste (le repère non chromatique existe donc déjà,
rien à ajouter).

### États où il n'y a rien à montrer : aucun message ni contrôle nouveau

- **Partie non analysée** : le contrat d'annotations renvoie explicitement `analyzed: false` avec
  aucun demi-coup. Le graphique n'apparaît pas et **n'ajoute aucun message** — `GameViewer` affiche
  déjà « Cette partie n'a pas encore été analysée » et le bouton « Analyser cette partie », juste
  au-dessus. La leçon d'US-10b (« jamais d'écran muet ») vise une page qui ne dit rien ; ici la page
  parle déjà.
- **Case « Afficher les annotations » décochée** : les annotations passent à l'état absent, ce qui
  fait déjà disparaître barre, glyphes et valeurs. Le graphique disparaît **avec eux**, sans bascule
  propre : le graphique *est* un afficheur d'annotations.
- **Après l'analyse d'une partie depuis la page Analyse** (US-7 slice 03) : la `Game` et ses
  annotations sont déjà rafraîchies sans rechargement, donc la courbe apparaît d'elle-même. Rien à
  câbler, à vérifier.

### Contrats

Aucun changement de contrat. `GET /api/games/:id/annotations` sert déjà, par demi-coup,
l'`Evaluation` en repère Blancs, les winning chances et la sévérité, index-alignées sur la
navigation. **Aucun changement serveur, aucun changement de schéma, aucune ADR.**

### Latitude accordée par le demandeur

Si les tests unitaires existants du composant plateau entrent en conflit avec l'ajout, **en profiter
pour renommer / assainir le composant** plutôt que de contourner.

## Testing Decisions

Un bon test ici décrit ce que le Player observe — « une courbe est présente à côté du plateau », « le
repère suit la navigation », « le décompte ne compte pas les coups de l'adversaire » — et **jamais**
la structure interne du SVG (nombre de nœuds, attributs de tracé, unités de coordonnées). Un test qui
casse au moindre ajustement visuel d'une US d'affichage est un test qui empêche l'US suivante.

### Tranche basse : une fonction pure pour toute la logique (nouveau seam, au plus haut point)

Un module de dérivation côté client, voisin de celui des flèches de l'Explorateur : entrée les
annotations d'une partie, sortie la **forme dessinable** — les points de l'aire, la position et le
glyphe de chaque marqueur, le décompte par sévérité. Tout ce qui peut être **faux** y est vérifiable
sans DOM : winning chances mappées à la mauvaise hauteur, marqueur au mauvais demi-coup, décompte
incluant l'adversaire, mat qui ne sature pas, partie sans erreur, partie vide.

Prior art direct : `candidateArrows` et son test (`client/test/arrows.test.ts`) — même nature
(géométrie pure dérivée de données déjà chargées), même style.

### Tranche composant : le seam existant du plateau, gardé mince

`client/test/Board.test.tsx` (jsdom + Testing Library), trois comportements seulement :

1. le graphique est présent avec des annotations, absent sans ;
2. le repère du coup courant suit la navigation (précédent/suivant et saut direct à un coup) ;
3. le **décompte d'erreurs** est interrogeable comme du texte normal — c'est du vrai texte, donc les
   requêtes accessibles standard suffisent.

Le SVG étant `aria-hidden`, on l'atteint par requête sur le conteneur rendu, **exactement** comme le
font déjà les tests de surlignage de case du même fichier. **Aucun `role` ni `aria-label` ne sera
ajouté pour la testabilité** : ce serait contredire la décision d'accessibilité prise au grilling.

### Aucun test serveur

Rien ne change côté serveur. Les tests existants de la dérivation d'annotations couvrent déjà la
donnée consommée.

### Apex : Feature Path par tranche, sur base seedée

La FP est ici **rapide par construction** : la fixture `seed:danger` insère des `Game`s déjà marquées
analysées **avec leurs `evaluations`**, donc la page Analyse a ses annotations **sans import réseau
et sans faire tourner Stockfish**. Précédent : les FP d'US-7. La FP observe, sur l'app réelle et
UI-first : la courbe est visible à côté du plateau, le curseur bouge quand on navigue, un marqueur
`??` se trouve au même demi-coup que le glyphe correspondant dans la liste des coups, le décompte
correspond aux glyphes visibles, et la courbe disparaît quand on décoche les annotations.

### Happy Path : greffe minimale sur HP-01, budget inchangé

**Pas de 4ᵉ HP** — le budget est à 3/3, et découper HP-01 nous ferait entretenir deux scénarios longs
pour une fonctionnalité d'affichage.

**Greffe sur l'étape 9 existante d'HP-01**, sans nouvelle étape et sans temps machine
supplémentaire : ouvrir l'une des deux `Game`s que l'étape vient d'analyser pour de vrai → la courbe
est là, à côté du plateau, ses marqueurs aux mêmes demi-coups que les glyphes de la liste des coups.
Le coût d'HP-01 est l'import de 82 parties réelles, pas le moteur (la passe de l'étape 9 est mesurée
à ~14 s) : la greffe est gratuite.

**Position du demandeur pour la PR `integration → develop`** : se contenter de **l'étape 9 d'HP-01**,
sans rejouer la suite complète — HP-02 et HP-03 ne passent pas par la page Analyse, et cette US ne
touche que le composant du plateau, dont Analyse est le seul appelant. À reconfirmer au moment de la
PR (c'est une décision humaine), et à réviser si le découpage venait à toucher autre chose que la
page Analyse.

## Out of Scope

- **Rendre la courbe cliquable** pour sauter à un coup. Explicitement écarté par le demandeur ; c'est
  ce qui permet de ne pas remonter l'état de navigation.
- **Toute valeur nouvelle** : précision (« accuracy ») par joueur, ELO estimé, ventilation par
  catégorie de coup façon illustration de référence, meilleur coup suggéré, phases de la partie.
  L'illustration en montre ; cette US n'en fait aucune.
- **Les erreurs de l'adversaire** : la dérivation serveur ne les produit pas, par décision de
  domaine. Les faire calculer serait une autre US, et un changement serveur.
- **Écrêtage de centipions**, axe chiffré, graduation, grille.
- **Zoom, survol, infobulle, animation** au fil de la navigation.
- **Le style de la page** : cette US pose un graphique dans une app sans feuille de style. La
  présentabilité générale est US-13.
- **La barre d'avantage qui ne suit pas l'orientation du plateau** (finding ouvert d'US-10a) : voisin,
  mais distinct — à traiter là où il a été relevé.
- **Le rendu simultané des diagrammes de `/danger`** et les autres findings ouverts : hors sujet.

## Further Notes

- **L'ordre des tranches est contraint par une seule chose** : la forme dessinable doit exister avant
  qu'on la dessine. Le décompte d'erreurs, lui, est indépendant de la courbe et peut être livré dans
  l'un ou l'autre sens.
- **Le vrai risque de cette US est la mise en page, pas la logique.** « À côté du plateau » sans
  feuille de style, dans un composant qui empile aujourd'hui tout verticalement, est ce qui a le plus
  de chances de mal se passer — et c'est précisément ce que les tests unitaires ne voient pas. C'est
  la FP, à l'écran, qui le rattrapera : trois des bugs les plus coûteux du projet (US-7, US-8) ont été
  trouvés là et nulle part ailleurs.
- **Point de vigilance** : décocher « Afficher les annotations » ne doit pas faire sauter la mise en
  page (le plateau resterait seul dans une rangée prévue pour deux).
- Le seul point non cadré au grilling — le critère d'acceptation d'une FP sur un graphique — est
  tranché ici : ce qu'on constate, c'est la **présence**, le **sens de l'axe**, la **synchronisation
  du curseur**, la **position des marqueurs** et la **cohérence du décompte** ; jamais l'esthétique.
