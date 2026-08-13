# PRD — Savoir dans quel sens lire un échiquier et qui joue quoi (US-10a)

Status: ready-for-agent

Business story: **US-10a** (`BACKLOG.md`, section Doing) — issue de la scission d'US-10.
Branche d'intégration : `integration/US-10a-players-on-the-board`.

## Problem Statement

Le Player ouvre un échiquier dans l'app et ne sait pas ce qu'il regarde.

Sur la page **Analyse**, il revoit une de ses propres parties sans qu'aucun élément ne lui dise
qui l'a jouée, contre qui, de quel côté, quand, dans quelle cadence, ni comment elle s'est finie.
S'il a joué les Noirs, il relit sa partie à l'envers — le plateau est toujours présenté Blancs en
bas. La `Game` porte pourtant toutes ces informations, elles sont chargées puis jetées.

Sur l'**Explorateur**, il choisit d'explorer ses parties en tant que Noir et le plateau continue
de lui montrer le point de vue adverse : les coups candidats qu'on lui propose sont les siens,
dessinés dans le mauvais sens.

Sur **Positions dangereuses**, il voit une grille de diagrammes sans savoir, pour aucun d'eux, à
qui c'est de jouer — alors que c'est exactement le fait qui rend la position lisible.

## Solution

Chaque échiquier s'oriente selon ce que sa vue raconte, et dit à qui c'est de jouer.

- **Analyse** : le plateau est présenté du côté que le Player a joué, et un **bandeau de partie**
  au-dessus nomme les deux joueurs avec leur couleur, marque lequel est le Player, et donne le
  résultat (du point de vue du Player), la date, la cadence et l'ouverture.
- **Explorateur** : le plateau est présenté du côté exploré, et le reste tout au long de la
  descente dans la ligne — il ne se retourne pas quand c'est à l'adversaire de jouer.
- **Positions dangereuses** : chaque diagramme est présenté du côté qui a le trait, et l'annonce
  en toutes lettres.

Aucune de ces orientations n'est un réglage : le Player ne les choisit pas, elles découlent de la
vue. C'est le terme **`Board orientation`** ajouté à `CONTEXT.md`.

## User Stories

1. En tant que Player, je veux voir le nom des deux joueurs au-dessus du plateau de la page
   Analyse, afin de savoir de quelle partie il s'agit sans revenir à la liste.
2. En tant que Player, je veux voir quelle couleur chacun des deux joueurs avait, afin de lire le
   plateau sans le déduire des coups.
3. En tant que Player, je veux repérer immédiatement lequel des deux joueurs est moi, afin de
   savoir de quel côté regarder mes erreurs.
4. En tant que Player daltonien ou utilisant un lecteur d'écran, je veux que ce repérage ne
   repose pas uniquement sur une couleur, afin de pouvoir l'utiliser aussi.
5. En tant que Player, je veux voir le résultat de la partie exprimé de mon point de vue
   (victoire, défaite, nulle), afin de ne pas avoir à interpréter une notation.
6. En tant que Player, je veux voir la date de la partie, afin de la situer dans mon historique.
7. En tant que Player, je veux voir la cadence de la partie, afin de relativiser la qualité des
   coups que je m'apprête à critiquer.
8. En tant que Player, je veux voir l'ouverture jouée (code ECO et nom), afin de relier cette
   partie à mes ouvertures faibles.
9. En tant que Player dont la partie n'a pas été classée par la plateforme, je veux que
   l'ouverture soit annoncée comme non classée plutôt qu'affichée vide, afin de ne pas croire à
   un bug.
10. En tant que Player arrivant sur `/analyse/:id` par un lien direct, je veux disposer de tout
    ce contexte sans passer par « Mes parties », afin que la page se suffise à elle-même.
11. En tant que Player ayant joué les Noirs, je veux que le plateau de la page Analyse me
    présente les Noirs en bas, afin de revoir la partie telle que je l'ai vécue.
12. En tant que Player ayant joué les Blancs, je veux que le plateau reste inchangé, afin que
    rien ne se dégrade dans le cas le plus courant.
13. En tant que Player, je veux que le bandeau soit présent même pour une partie pas encore
    analysée, afin que le contexte ne dépende pas de l'analyse moteur.
14. En tant que Player, je veux que le bandeau reste stable quand je navigue dans les coups,
    afin de ne pas perdre mes repères.
15. En tant que Player explorant mes habitudes en tant que Noir, je veux que le plateau de
    l'Explorateur me présente les Noirs en bas, afin que les flèches de coups candidats pointent
    dans le sens où je joue.
16. En tant que Player, je veux que changer de côté exploré retourne le plateau, afin que le
    radio existant suffise et qu'aucun contrôle de plus n'apparaisse.
17. En tant que Player descendant dans une ligne, je veux que le plateau garde la même
    orientation quand c'est à l'adversaire de jouer, afin de ne pas être désorienté à chaque
    niveau.
18. En tant que Player, je veux savoir à qui c'est de jouer dans la position affichée par
    l'Explorateur, afin de comprendre si les coups listés sont les miens ou ceux de l'adversaire.
19. En tant que Player, je veux que chaque diagramme de Positions dangereuses soit présenté du
    côté qui a le trait, afin de lire la position comme le joueur au trait la voyait.
20. En tant que Player, je veux que chaque diagramme annonce explicitement le trait, afin de ne
    pas avoir à décoder l'orientation.
21. En tant que Player utilisant un lecteur d'écran, je veux que le trait soit annoncé en
    toutes lettres et non porté par la seule orientation visuelle, afin d'y avoir accès.
22. En tant que Player, je ne veux pas qu'on me dise « votre côté » sur une position dangereuse,
    afin de ne pas être induit en erreur : une même position y agrège des parties jouées des
    deux couleurs.
23. En tant que Player, je ne veux régler l'orientation nulle part, afin que l'app choisisse
    pour moi le seul sens qui ait du sens sur chaque écran.

## Implementation Decisions

**Aucun changement serveur.** Toute la matière est déjà renvoyée par les endpoints existants.
`GET /api/games/:id` renvoie la ligne brute et porte donc déjà `eco` et `openingName` ; ils sont
simplement absents de l'interface `Game` côté client, à y déclarer. Pas de migration, pas de
nouvelle route, pas de nouveau contrat.

**Source de l'identité des joueurs : les en-têtes PGN `[White]` / `[Black]`.** Une seule source,
déjà portée par la `Game`, donc cohérente avec le plateau par construction. Elle ne dépend pas de
`settings` (que US-11 remplacera) et ne coûte aucun appel réseau ; Lichess sert les mêmes
en-têtes, donc elle survit à US-12. La fonction de parsing PGN existante ne retient aujourd'hui
que le coup à coup et jette les en-têtes ; le moteur d'échecs client les expose. Le côté joué
stocké sur la `Game` ne sert **qu'à** désigner lequel des deux en-têtes est le Player — les deux
dérivent du même payload d'import, il n'y a pas de risque d'incohérence entre eux.

**Chaque brique est une fonction indépendante**, appelée depuis chaque point d'entrée, jamais
dupliquée en ligne :

- extraction des en-têtes de partie depuis un PGN ;
- lecture du **trait** depuis une FEN (champ de couleur active), utilisable aussi bien sur une
  FEN complète que sur une FEN à 4 champs ;
- formulation du résultat du point de vue du Player.

**Le composant plateau reste ignorant de la `Game`.** Il est partagé avec l'Explorateur, qui
n'a pas de partie du tout : il reçoit une orientation en propriété optionnelle, par défaut Blancs
en bas, et rien d'autre. Le bandeau de partie vit dans le composant de visualisation de partie,
seul détenteur de la `Game`.

**Règle d'orientation, une par vue, jamais réglable** :

| Vue | Orientation | Origine |
| --- | --- | --- |
| Analyse | côté joué par le Player | `Game` |
| Explorateur | côté exploré | l'état de sélection existant |
| Positions dangereuses | côté au trait | champ de couleur active de la FEN |

Sur Positions dangereuses, l'orientation « du point de vue du Player » est **indéfinie** et non
pas simplement non implémentée : la clé d'identité d'une `Danger position` (FEN à 4 champs)
n'inclut pas le côté joué, donc une même entrée agrège des parties jouées Blancs et Noirs. Seul
le trait y est défini, et c'est le seul fait qu'on y écrit.

**Résultat exprimé côté Player**, pas en score symétrique : le résultat stocké est relatif au
Player, et c'est déjà la convention de la liste des parties et des statistiques globales.
Le mettre en « 1-0 » demanderait de le rendre symétrique pour le re-particulariser à l'affichage.

**Pas de feuille de style dans le projet** (US-13) : le bandeau est du texte brut structuré, et
tout repère visuel est doublé d'un marqueur non chromatique.

**Pas d'ADR.** Aucune de ces décisions n'est coûteuse à défaire : l'orientation est une propriété
par plateau, la source des noms un accès aux en-têtes déjà présents.

## Testing Decisions

Un bon test ici décrit ce que le Player constate — « le plateau présente les Noirs en bas »,
« le bandeau nomme les deux joueurs » — et jamais comment on y parvient. En particulier, aucun
test ne doit s'écrire contre la forme interne des propriétés passées à la bibliothèque
d'échiquier : ce qui compte est l'orientation rendue, observable.

**Seams retenus, du plus haut au plus bas** — on privilégie les seams existants, il n'en est
créé aucun de nouveau :

1. **Agentique (apex)** — un sous-agent pilote l'app réelle, UI-first. Chaque tranche porte sa
   **Feature Path** exécutable comme porte d'auto-merge. C'est le seul étage qui peut réellement
   constater qu'un plateau est retourné à l'écran : les étages inférieurs vérifient l'intention,
   pas le rendu. Le budget **HP est déjà à 3/3** — pas de 4e parcours ; l'orientation et le
   bandeau se greffent en drive-by sur HP-01 (Analyse) et HP-02 (Explorateur).
2. **Composant (jsdom, Vitest + Testing Library)** — seam le plus haut du code, largement
   pratiqué : `client/test/` compte déjà un fichier par page et par composant. On étend
   `GameViewer.test.tsx` (bandeau), `Board.test.tsx` (orientation transmise),
   `ExplorerPage.test.tsx` (orientation suit le côté, reste constante en descendant) et
   `DangerPage.test.tsx` (orientation au trait, trait annoncé). `AnalysePage.test.tsx` couvre
   déjà le chargement de la `Game`.
3. **Fonction pure (Vitest)** — prior art direct : `history.test.ts`, `positions.test.ts`,
   `formatEvaluation.test.ts`. Trois fonctions à couvrir isolément, chacune avec ses cas
   dégradés : en-têtes PGN absents ou partiels, FEN à 4 champs, résultat pour chacun des trois
   états et pour chacun des deux côtés.

**Aucun test serveur** — il n'y a aucun changement serveur. C'est le signe que le seam est au bon
endroit : le contrat d'API existant suffisait déjà.

**Régression attendue à couvrir explicitement** : les trois plateaux sont aujourd'hui Blancs en
bas en dur, et **HP-01 et HP-02 s'appuient sur cette hypothèse**. Les deux parcours sont à
rejouer, pas seulement à relire.

## Out of Scope

- **US-10b** (l'attente sur `/api/danger`) — l'autre moitié de l'US-10 d'origine, remise au
  backlog avec sa consigne de mesure préalable.
- Toute possibilité pour le Player de **retourner** un plateau : décidé au grilling, l'orientation
  découle de la vue.
- La **notion de Profil** (US-11) : le Player reste implicitement unique, et c'est précisément
  pourquoi les en-têtes PGN ont été préférés à `settings`.
- La **mise en forme** du bandeau (US-13) : il n'existe pas de feuille de style, on livre du texte
  brut structuré et accessible.
- Tout **affichage d'identité** sur l'Explorateur et sur Positions dangereuses : ces vues agrègent
  N parties, il n'y a pas d'adversaire nommable.
- Le surlignage sémantique existant (sévérité, taux de victoire, barre de chances), qui n'est pas
  touché.

## Further Notes

Le point le moins évident de cette US est qu'elle **contredit partiellement son propre énoncé**.
US-10 disait « aucun échiquier ne montre les noms des joueurs » ; le grilling a établi que la
question n'a de sens que sur un écran sur trois, les deux autres agrégeant des centaines de
parties. Le besoin commun aux trois n'est pas l'identité, c'est l'orientation et le trait. Le
défaut réel est aussi plus large que l'énoncé : ce ne sont pas les noms qui manquent, c'est
qu'aucun des trois plateaux n'a jamais reçu d'orientation.
