# Backlog

## To do

- **US-8**: Être rassuré que le pass d'analyse s'est bien terminé, sans avoir à deviner.
  > Pas encore grillée. Un indicateur de progression et une coche "analysée" existent déjà
  > (`GamesPage`/`GameList`), mais à la fin d'un pass la progression disparaît sans aucun message de
  > confirmation — incertitude sur le fait que ça se soit bien passé. La coche "analysée" actuelle
  > est un texte gras (`✓ analysée`), pas nécessairement assez visible. Points à trancher au
  > grilling : forme du message de fin (toast ? texte permanent ?), et si la coche doit changer de
  > forme/visibilité.

- **US-10**: Voir clairement qui joue Blancs/Noirs sur un échiquier, et ne pas attendre dans le vide sur "Positions dangereuses".
  > Pas encore grillée, deux préoccupations distinctes réunies ici :
  > - Aucun échiquier affiché dans l'app (Analyse, Explorateur, Positions dangereuses) ne montre
  >   les noms des joueurs ni qui est Blancs/Noirs, alors que `Game.opponent`/`Game.playerColor`
  >   existent déjà et sont récupérés par la page Analyse sans être affichés.
  > - `GET /api/danger` est synchrone (pas de job en arrière-plan comme l'analyse), et la page ne
  >   montre aucun état de chargement — écran vide pendant le calcul. À trancher : job + polling
  >   (comme l'analyse) vs. simple indicateur de chargement si le calcul reste rapide en pratique.

- **US-11**: Choisir mon profil et retrouver les parties importées et analysées sous ce profil.
  > Pas encore grillée. Aujourd'hui l'app est **mono-joueur implicite** : `settings` mémorise un
  > seul username chess.com (clé/valeur), et `games` n'a **aucune notion de propriétaire** — même
  > chose pour les agrégats (`move_habits`, stats `/stats`, `/openings`, `/danger` et les
  > `evaluations`), calculés sur *toutes* les lignes. Importer un second compte mélangerait donc
  > silencieusement les historiques et fausserait tous les indicateurs. Le besoin : un **Profil**
  > sélectionnable, sous lequel on retrouve son propre historique importé **et son état d'analyse**
  > (parties déjà analysées conservées, pas à re-analyser en changeant de profil).
  > Points à trancher au grilling :
  > - Terminologie et périmètre : un `Profile` = un compte chess.com, ou un libellé libre pouvant
  >   regrouper plusieurs comptes ? Rapport avec le terme `Player` de `CONTEXT.md`.
  > - Une même `Game` peut-elle appartenir à deux profils (partie entre deux comptes suivis) — et
  >   `player_color`/`result` sont **relatifs au joueur**, donc dépendants du profil.
  > - Portée du scoping : import, liste des parties, `move_habits` (précalculés, cf. ADR-0005),
  >   stats/openings/danger. Les `evaluations` sont-elles partageables (propriété de la position,
  >   pas du joueur) ?
  > - Sélection et persistance du profil courant (remplace la mémorisation du username), création /
  >   suppression d'un profil, et ce qu'on fait des données existantes (règle de phase dev : le
  >   ré-import est bon marché, un profil par défaut migré ou une DB repartie de zéro sont
  >   acceptables).
  >
  > **À griller avant US-12** (import Lichess) : le `Profile` est le porteur naturel du couple
  > plateforme + compte, donc c'est ici que la question se tranche.

- **US-12**: Importer mes parties depuis un compte Lichess, pas seulement chess.com.
  > Pas encore grillée. Aujourd'hui la seule source est chess.com et elle n'est pas isolée derrière
  > une abstraction neutre : `ChessComClient` (`server/src/chesscom.ts`) est **injectable mais
  > modelé sur chess.com** — `fetchMonth(username, year, month)` (archives mensuelles),
  > `time_class`, `rules` pour écarter les variantes, codes de résultat maison, et l'`Opening` est
  > résolue depuis les en-têtes PGN `[ECO]`/`[ECOUrl]` **propres à chess.com** (ADR-0007). Le reste
  > du domaine est en revanche neutre (PGN, `Game`, dedup par URL de partie), donc le travail est
  > surtout de faire émerger un port « source de parties » et de brancher un second adaptateur.
  >
  > **À griller après US-11** — l'ordre n'est pas indifférent : c'est US-11 qui décide si un
  > `Profile` porte la plateforme, donc où vit le choix de la source. Griller US-12 d'abord
  > obligerait à trancher deux fois la même question.
  >
  > Ce que dit l'API Lichess (spec OpenAPI officielle
  > [`lichess-org/api`](https://github.com/lichess-org/api/blob/master/doc/specs/tags/games/api-games-user-username.yaml),
  > vérifiée le 2026-08-12) — elle est **plus proche de nos besoins que chess.com**, mais pas
  > alignée sur nos archives mensuelles :
  > - `GET /api/games/user/{username}` : **un seul appel par plage**, bornée par `since`/`until`
  >   (timestamps ms), tri `dateAsc`/`dateDesc`, `max` optionnel. Pas de pagination par mois — la
  >   réponse est un **flux** à consommer en streaming (NDJSON via `Accept: application/x-ndjson`,
  >   ou PGN via `application/x-chess-pgn`).
  > - **Débit annoncé** : 20 parties/s en anonyme, 30 authentifié, 60 pour ses propres parties.
  >   Jeton **non obligatoire** pour l'export public. Un `429` impose d'attendre une minute entière ;
  >   Lichess ne documente pas de limites de requêtes chiffrées au-delà.
  > - Existence d'un compte : `GET /api/user/{username}` (200 / 404) — équivalent direct de notre
  >   `playerExists`.
  > - Filtre variantes/cadences par `perfType` (`ultraBullet`, `bullet`, `blitz`, `rapid`,
  >   `classical`, `correspondence` + variantes `chess960`, `crazyhouse`, …), et champ `speed` sur
  >   chaque partie.
  > - En NDJSON, `opening` est un **objet `{ eco, name, ply }`** : il s'aligne directement sur nos
  >   colonnes `eco`/`opening_name`, sans passer par un en-tête PGN. Le PGN est disponible dans le
  >   même flux avec `pgnInJson=true`.
  > - Identité de la partie : `id` (URL `https://lichess.org/{id}`), donc notre dedup par URL tient.
  > - Résultat : pas de code par joueur comme chess.com, mais `winner` (`white`/`black`, absent si
  >   nulle) + `status` (`mate`, `resign`, `outoftime`, `draw`, …).
  >
  > Points à trancher au grilling :
  > - Forme du port : `since`/`until` en millisecondes couvre nativement la plage introduite par
  >   US-9, alors que chess.com impose le découpage mensuel. Le port expose-t-il une **plage de
  >   dates** (chess.com la découpe en mois en interne, Lichess la passe telle quelle), ou garde-t-on
  >   le mois comme unité commune ? La progression comptée en mois d'US-9 en dépend.
  > - Streaming : les 20-60 parties/s et un flux non paginé cadrent mal avec notre `fetchMonth`
  >   qui renvoie un tableau complet. Consommer en flux (et rendre la progression continue) ou
  >   accumuler par tranches ?
  > - Cadences : `ultraBullet`, `classical` et `correspondence` n'existent pas dans
  >   `TimeControlCategory` (`bullet`/`blitz`/`rapid`/`daily`). Étendre le vocabulaire ou replier
  >   (`correspondence` → `daily`, `ultraBullet` → `bullet`) ? Ça touche `CONTEXT.md`, `move_habits`
  >   et les ventilations de `/stats` et `/openings`.
  > - `Opening` : ADR-0007 fixe « la classification de chess.com, jamais recalculée ». Lichess
  >   fournit sa propre `{ eco, name }` — deux classifications pour le même concept, à assumer
  >   explicitement dans l'ADR plutôt qu'à mélanger en silence dans les agrégats par ECO.
  > - Où vit le choix de la source : porté par le **`Profile`** d'US-11 (un profil = une plateforme +
  >   un compte) ou choisi à chaque import ? Voir la dépendance ci-dessus.
  > - Une ADR est probable (port multi-plateforme, en regard d'ADR-0002 qui fait du relais local le
  >   seul interlocuteur des sources externes).

- **US-13**: Doter l'application d'une feuille de style, pour qu'elle soit présentable — sans maquette en entrée.
  > Pas encore grillée. État vérifié : **il n'existe aucun CSS dans le projet** — zéro fichier
  > `.css`, aucun `<link>` dans `client/index.html`, aucune bibliothèque de style. L'app s'affiche
  > donc avec les styles par défaut du navigateur. Cinq composants portent des `style={{…}}` inline
  > (`GameViewer`, `GameList`, `DangerPage`, `ExplorerPage`, `WinningChancesBar`), non par choix
  > esthétique mais **parce qu'il n'y avait pas de feuille de style où mettre un sélecteur** : ce
  > sont des surlignages **porteurs de sens** (teinte de win rate, sévérité d'un `Mistake`, barre de
  > winning chances), chacun doublé d'un **repère non chromatique** pour rester accessible.
  >
  > **Pas de maquette, et c'est la contrainte structurante** de cette US, pas un manque à combler en
  > douce : le grilling doit produire la référence visuelle avant tout code, sinon chaque écran sera
  > stylé au jugé et l'ensemble ne tiendra pas. Points à trancher :
  > - Ce qui fait office de référence : un jeu de **tokens** (palette, échelle typographique,
  >   espacements, rayons) écrit et validé au grilling ? Un écran pilote stylé d'abord, puis décliné ?
  >   Une capture avant/après par écran pour arbitrer ?
  > - Approche technique : CSS vanilla + variables custom, modules CSS, ou une bibliothèque
  >   (utilitaire ou composants) ? Dans un projet volontairement mince (Vite + React, pas de
  >   dépendance de style à ce jour), en ajouter une est une décision à motiver — ADR probable.
  > - **Ne pas régresser les surlignages sémantiques.** Migrer l'inline vers des classes est
  >   souhaitable, mais la teinte reste une info métier et le repère non chromatique doit survivre.
  >   Le finding a11y d'US-3 (surlignage invisible faute de CSS) est le précédent à ne pas rejouer à
  >   l'envers.
  > - Critère d'acceptation d'une US esthétique : sur quoi juge-t-on « présentable » ? Une Feature
  >   Path agentique constate qu'un style est **appliqué** et qu'un contraste est suffisant, elle ne
  >   juge pas le goût. À définir explicitement, sinon l'US n'a pas de fin.
  > - Périmètre : tous les écrans (`/`, `/stats`, `/openings`, `/danger`, explorateur, analyse) ou un
  >   sous-ensemble ? Le mode sombre et le responsive sont-ils dedans ou différés ?

## Doing

## In review

- **US-9**: Importer plusieurs mois de mon historique chess.com en une seule fois.
  > **En revue** — PR `integration/US-9-multi-month-import` → `develop`, suite HP jouée (3/3 vertes).
  > Grillée. Décision : une **plage contiguë** de mois (pas une sélection de mois arbitraires),
  > exécutée en **job de fond** avec progression comptée en mois, **séquentielle**, **tolérante à
  > l'échec d'un mois** (rejeu idempotent de la plage plutôt que retry), **sans plafond serveur**
  > (confirmation UI au-delà de 24 mois). Un seul contrat d'import : le mono-mois devient une plage
  > à bornes égales. `CONTEXT.md` : `Import` re-scopé, terme `Monthly import` ajouté.
  > Nouvelle **ADR-0010** (revient sur une remarque de portée d'ADR-0008, annotée en conséquence).
  > PRD : `.scratch/multi-month-import/PRD.md`. Découpée en 3 issues, implémentée sur
  > `integration/US-9-multi-month-import` :
  > - `01-range-import-background-job` ✅ — tracer bullet : plage + job + polling + progression en
  >   mois + résumé consolidé.
  > - `02-monthly-import-lines-and-fault-tolerance` ✅ — ligne par mois, un mois en échec n'interrompt
  >   pas l'Import (bloquée par 01).
  > - `03-range-input-guardrails` ✅ — plage inversée (400), bornage au mois courant, 404 synchrone
  >   sur username inconnu, confirmation au-delà de 24 mois.
  >
  > Les 3 issues validées par leur Feature Path (fixture d'archive via `CHESSCOM_BASE_URL`), puis la
  > **suite HP rejouée en entier contre la vraie API chess.com** : HP-01/02/03 vertes. HP-01 a été
  > réécrit pour couvrir la plage (`2026-05 → 2026-06`, 82 parties) au lieu d'un mois unique, et
  > asserte désormais des chiffres durs relevés sur le compte réel. Pas de 4e HP : la plage est
  > absorbée dans le scénario d'import existant.
  >
  > Reporté hors US-9 : le raccourci « tout mon historique » via `/pub/player/{u}/games/archives`.

## Done

- **US-7**: Voir mes erreurs pendant la revue d'une partie — annoter la qualité des coups (`?!`/`?`/`??`) et l'`Evaluation` sur la page **Analyse**, à partir des `Evaluation`s stockées par US-4.
  > **Différée depuis le grilling d'US-4** : surfaçage **par coup** du `Mistake` (distinct de l'agrégat `Danger position` de `/danger`). **Dépend d'US-4** (table `evaluations` ; aucun calcul moteur supplémentaire, réutilise les évals stockées). Inclut une **option d'activation/désactivation** de la visualisation, **activée par défaut**.
  > Grillée (pas de nouvelle ADR — conséquence directe d'ADR-0009 ; `CONTEXT.md` : terme `Evaluation`
  > précisé, repère Blancs à l'affichage vs. stocké relatif au trait), découpée en 3 issues,
  > implémentée sur `integration/US-7-mistake-annotations-on-analysis`. PRD :
  > `.scratch/move-annotations/PRD.md`.
  > - `01-move-quality-list` ✅ — dérivation partagée avec `/danger` (extraite sans régression),
  >   endpoint `GET /api/games/:id/annotations`, liste de coups annotée (`?!`/`?`/`??` + Evaluation
  >   au repère Blancs) + toggle par défaut activé. Bug trouvé et corrigé en Feature Path
  >   (`whiteEval` fuitait des colonnes SQLite brutes).
  > - `02-position-balance-and-highlight` ✅ — balance winning-chances + Evaluation à côté du
  >   plateau, surlignage de la case d'arrivée du coup fautif courant (teinte par sévérité,
  >   glyph de la liste des coups reste la source accessible).
  > - `03-analyze-from-analyse-page` ✅ — action "Analyser cette partie" scopée à une seule Game
  >   directement sur Analyse, boucle start+poll extraite (`runAnalysis`, réutilisée par "Mes
  >   parties"), rafraîchissement automatique de la Game + des annotations sans reload.
  >
  > Les 3 issues validées par leur Feature Path (agentique ; fixtures `seed:danger`/
  > `seed:move-habits`, jamais le vrai Stockfish). Pas d'extension Chrome disponible cette
  > session : FP vérifiées via le contrat API réel contre le serveur en direct + les tests
  > composant (jsdom), pas de confirmation visuelle navigateur (idem 01).
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #12, mergée le 2026-08-12 ;
  > conflit `BACKLOG.md` avec l'ajout d'US-8/9/10 résolu avant merge). Suite **HP jouée pour de vrai, UI-first** cette fois (Chrome système piloté
  > en CDP, vraie API chess.com, vrai Stockfish WASM, DB repartie de zéro, `DudulSmash` 2026/06) :
  > HP-02 et HP-03 vertes, **HP-01 rouge à l'étape 5** — une Game non analysée n'affichait plus
  > aucun plateau, régression d'`03-analyze-from-analyse-page` **corrigée sur la branche**
  > (`657b6ad`). Le test unitaire existant verrouillait le bug, d'où le silence des étages sous
  > l'apex : il a été inversé. 3 findings non bloquants laissés ouverts dans la PR (progression
  > d'analyse figée à `0/1`, bouton Import non désactivé pendant l'import, `/danger` sans garde
  > d'échantillon minimal). Cap de profondeur d'HP-02 non exerçable sur 54 parties réelles.
  >
  > HP budget à 3/3 : greffe d'US-7 sur l'étape 8 d'HP-01 proposée dans la PR plutôt qu'un 4e HP.
  > Reste `develop → main` (pré-prod, non décidé).

- **US-4**: Identifier mes positions dangereuses par analyse moteur (Stockfish — Mistake et Danger position).
  > Grillée (**ADR-0008** : moteur dans le Node local derrière une interface `Engine` — WASM
  > défaut, natif opt-in `STOCKFISH_PATH`, fake injecté ; supersède ADR-0001 — + **ADR-0009** :
  > `Evaluation`s brutes stockées par demi-coup, qualité + danger dérivés **à la volée**), découpée
  > en 2 issues, implémentée sur `integration/US-4-danger-positions`, **fusionnée dans `develop`**
  > (décision humaine `integration → develop`, PR #6). PRD : `.scratch/danger-positions/PRD.md`.
  > - `01-analysis-pass` ✅ — moteur derrière `Engine` (WASM `worker_thread` par défaut, natif
  >   `STOCKFISH_PATH` en option, fixture en tests), passe d'analyse incrémentale (sélection sur
  >   "Mes parties", flag `analyzed`, `POST /api/analyze` + `GET /api/analyze/status`)
  > - `02-danger-positions-view` ✅ — `Inaccuracy`/`Mistake`/`Blunder` façon Lichess (chute
  >   winning-chances 10/20/30 %, depth 16), `Danger position` = FEN-4 (transpositions fusionnées,
  >   ni cadence ni côté), fenêtre 10 demi-coups, page `/danger` (diagrammes, tri occurrences desc,
  >   surlignage ≥ 50 %)
  >
  > Chaque issue validée par sa Feature Path (agentic ; fixture `seed:danger` pour la 02, jamais le
  > vrai Stockfish en tests). Pas de HP dédié (plafond de 3 atteint) : greffé en drive-by sur
  > **HP-01** (étape 8 — analyse réelle WASM + `/danger`), vert contre le vrai chess.com. Backend
  > natif (`STOCKFISH_PATH`) câblé mais **jamais vérifié empiriquement** (pas de binaire UCI
  > disponible). Annotations par coup sur Analyse → différées en **US-7**. Reste `develop → main`.

- **US-3**: Identifier mes ouvertures faibles par statistiques de résultat (Weak opening — taux de victoire par ouverture, par côté et par cadence).
  > Grillée (**ADR-0007**), découpée en 1 issue, implémentée sur `integration/US-3-weak-openings`, **fusionnée dans `develop`** (décision humaine `integration → develop`, PR #4, 2026-07-24). PRD : `.scratch/weak-openings/PRD.md`. Page **`/openings`** : l'ouverture (ECO + nom) est stockée sur `games` **à l'import** depuis les en-têtes chess.com `[ECO]`/`[ECOUrl]` ; agrégation **à la volée** `GROUP BY (eco, côté, cadence)` ; surlignage < 50 %, tri parties décroissantes, bucket `Other`. Primitive `Win rate` extraite vers un module neutre partagé avec US-6. **HP-03 vert** (`docs/test-scenarios/HP-03-weak-openings.md`) contre le vrai chess.com (DudulSmash 2026/06 : 32 entrées, somme des parties = 54). Finding FP (surlignage invisible — l'app n'a pas de CSS) **corrigé** avant merge (teinte inline + marqueur accessible « à revoir ⚠ »). Reste `develop → main` (pré-prod, non décidé).

- **US-6**: Consulter mes statistiques globales sur l'historique importé, sur la page `/stats`.
  > Grillée, découpée en 1 issue, implémentée sur `integration/US-6-global-stats`, **fusionnée dans `develop`** (décision humaine `integration → develop`, PR #3). PRD : `.scratch/global-stats/PRD.md`. Page **`/stats`** (placeholder réservé par l'ADR-0006) : un **Total** + ventilation **par cadence** et **par côté**, chacune `parties · V/N/D · Win rate`. **Calcul à la volée** sur `games` (pas de précalcul), sans matrice croisée ni taille d'échantillon minimale ; état vide = message d'invitation. Pas de HP dédié (couvert en drive-by). Reste `develop → main`.

- **US-5**: Explorateur visuel de mes coups joués — parcourir l'arbre de mes coups, avec fréquence et taux de victoire par coup, pour comprendre mes habitudes.
  > PRD : `.scratch/move-habit-explorer/PRD.md`. Découpée en 3 issues techniques, implémentée sur `integration/US-5-move-explorer`, **fusionnée dans `develop`** (décision humaine `integration → develop`) :
  > - `01-single-level-move-habits` ✅ — candidats par Position (fréquence, `Win rate`, ventilation par cadence)
  > - `02-drill-down-navigation` ✅ — descente niveau par niveau + fil d'Ariane, bascule de côté
  > - `03-board-arrows` ✅ — coups candidats dessinés en arêtes sur le plateau (opacité = fréquence, teinte = win rate)
  >
  > Précalcul incrémental des compteurs `Move habit` à l'import (**ADR-0005**). **HP-02 vert** (`docs/test-scenarios/HP-02-explore-move-habits.md`) contre le vrai chess.com. Reste `develop → main`.

- **US-2**: Importer mes parties depuis chess.com (relais local + persistance incrémentale), pour remplacer la partie fixture par mon véritable historique.
  > Grillée, découpée, implémentée sur `integration/US-2-import-chess-com`, **fusionnée dans `develop`** (décision humaine `integration → develop` du 2026-07-21). PRD : `.scratch/import-chess-com/PRD.md`. **HP-01 vert 7/7** contre le vrai chess.com (compte DudulSmash, 2026/06 : 54 parties). **5 slices livrés + 1 US technique de découpage**, chacun validé par sa Feature Path (agentic, Chrome réel) et auto-mergé sur check local vert :
  > - `01-import-backend` ✅ — schéma (game_url/player_color/result), client chess.com injectable, service, `POST /api/import`
  > - `02-import-ui` ✅ — formulaire (mois/catégories) + parcours des parties sur le plateau
  > - `03-import-summary` ✅ — fenêtre de résumé (par cadence, nouvelles vs présentes, bilan V/N/D)
  > - `04-import-progress` ✅ — indicateur de progression (indéterminé ; SSE différé, cf. issue)
  > - `05-remember-username` ✅ — mémorisation du username (table `settings`)
  > - `code-decomposition` ✅ — découpage en modules par feature + error boundary (`.scratch/code-decomposition/`)
  >
  > Suite HP : `docs/test-scenarios/HP-01-import-and-explore.md`. Finding a11y **corrigé** (bilan V/N/D annoncé en toutes lettres pour les lecteurs d'écran, mergé dans `develop`). Reste `develop → main` (pré-prod, non décidé).

- **US-1**: Squelette de l'application — structure React + serveur Node local + persistance SQLite en place, avec un plateau interactif capable d'afficher et de naviguer dans une partie fixture (pas d'import chess.com, pas d'analyse).
  > PRD : `.scratch/app-skeleton/PRD.md`. Les 3 issues techniques implémentées et fusionnées dans `integration/US-1-chess-history-analysis` (01 boot+plateau, 02 navigation avant/arrière, 03 saut vers un coup), chacune validée par sa Feature Path (agentic, Chrome réel). Fusionnée dans `develop` (décision humaine `integration → develop` du 2026-07-21). Pas de suite Happy Path pour cette US infrastructurelle (à reconsidérer une fois US-2/3/4).
