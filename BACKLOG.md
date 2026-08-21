# Backlog

## To do

## Doing

- **US-12**: Importer mes parties depuis un compte Lichess, pas seulement chess.com.
  > **En cours d'implémentation** (tranche 01). Aujourd'hui la seule source est chess.com et elle n'est pas isolée derrière
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
  > **Grillée** (2026-08-21) — branche `integration/US-12-lichess-import`. Les onze points ci-dessous
  > sont tranchés ; doc : `CONTEXT.md` (`Platform`, `Time control category`, `Game`,
  > `Monthly import`, `Import`), **ADR-0016** (les adaptateurs traduisent vers notre vocabulaire),
  > amendement d'**ADR-0007** (l'autorité de classification est la plateforme d'origine).
  > Décisions : la plateforme est un attribut du `Profile`, jamais un paramètre d'import (mais l'écran
  > d'import la **nomme**) ; le **mois** reste l'unité du port, évolutif plus tard ; ndjson lu en flux
  > mais résolu par mois, filtrage des catégories en local ; **cinq** `Time control category` —
  > `ultraBullet`→`bullet`, `daily` **renommée** `correspondence`, `classical` ajoutée ; le port parle
  > le domaine (`PlatformClient` + `ImportedGame`) et chaque adaptateur possède sa traduction, câblage
  > par registre `Record<Platform, PlatformClient>` ; pas de token ; hors périmètre : variantes,
  > `fromPosition`, **parties contre l'ordinateur** ; parties abandonnées importées (symétrie) ;
  > `Game.date` = la date sous laquelle la plateforme classe la partie (`createdAt` chez Lichess).
  > **Vérifié contre l'API réelle** (compte de référence retenu : **`Metalyst`**, 403 parties, 20 mois
  > peuplés sur 71, dont 38 `classical` et 64 `correspondence` — les deux traductions neuves sont donc
  > exercées pour de vrai) : `since`/`until` filtrent sur `createdAt` ; le débit anonyme mesuré est de
  > ~24 parties/s ; et **l'endpoint d'export refuse l'IPv6** depuis cette machine (429 instantané,
  > insensible à l'attente) alors qu'il répond 200 en IPv4 — piège à neutraliser dans l'adaptateur,
  > sans quoi le message d'erreur invite précisément au mauvais correctif.
  > Validation : pas de 4ᵉ HP (le parcours ne change pas) — path 0 accueille le profil Lichess de
  > référence contre l'API réelle, HP-01 gagne une étape de bascule inter-plateformes, les FP portent
  > les cas précis sur fixture (`LICHESS_BASE_URL` en miroir de `CHESSCOM_BASE_URL`).
  > Dette signalée hors périmètre : la table `settings` (username chess.com mémorisé) est caduque
  > depuis US-11 et ne doit **pas** être étendue à Lichess.
  > PRD : `.scratch/lichess-import/PRD.md` (38 user stories). Découpée en 7 issues techniques,
  > `.scratch/lichess-import/issues/` :
  > - `01-platform-is-a-value.md` — le port parle le domaine, chess.com devient un adaptateur, la
  >   plateforme est nommée à l'écran (AFK)
  > - `02-five-time-control-categories.md` — `classical` ajoutée, `daily` → `correspondence`, les
  >   deux migrations dues (AFK, bloquée par 01 — **séquencement**, pas dépendance logique)
  > - `03-a-lichess-profile-exists.md` — choix de la plateforme, vérification du compte chez Lichess
  >   (AFK, bloquée par 01)
  > - `04-a-lichess-month-lands.md` — l'adaptateur Lichess sur le chemin nominal, IPv4 épinglé
  >   (AFK, bloquée par 01/02/03)
  > - `05-what-we-do-not-keep.md` — variantes, position arbitraire, parties contre l'ordinateur
  >   (AFK, bloquée par 04)
  > - `06-month-boundary-and-rate-limit.md` — datation par le début, partie à cheval, 429
  >   (AFK, bloquée par 04)
  > - `07-path-zero-and-the-cross-platform-switch.md` — path 0 contre l'API réelle + étape HP-01
  >   (**HITL**, bloquée par 02/05/06)
  > Reste à faire : implémenter, en commençant par la tranche 01.
  >
  > Points tranchés au grilling (énoncé d'origine) :
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


## In review

## Done

- **US-11**: Choisir mon profil et retrouver les parties importées et analysées sous ce profil.
  > **Grillée** (2026-08-17) — branche `integration/US-11-profiles`.
  > Un **`Profile`** = **un compte sur une plateforme** (plateforme + username), validé chez
  > chess.com à la création et stocké dans sa casse canonique. Il **partitionne** : chaque `Game` et
  > chaque agrégat appartient à un seul profil, **rien n'est partagé** — une partie jouée entre deux
  > profils suivis est stockée deux fois, chacune du point de vue de son `Player`. `Player` est
  > redéfini comme le **point de vue** (la personne derrière le profil courant, éventuellement un
  > ami), plus comme une identité. Sélection côté client passée explicitement à chaque appel API,
  > bandeau permanent qui nomme le profil courant, page dédiée `/profiles` + `/profiles/:id` qui
  > **accueille désormais l'import** (l'ancien `/import` disparaît).
  > **Conséquence hors story** : la base locale n'est plus jetable (20 parties analysées, 1199
  > `evaluations`). La règle « wiper et ré-importer » de `CLAUDE.md` est **retirée** — toute
  > évolution de schéma doit désormais venir avec sa migration.
  > **Débloquée** (2026-08-18) : US-13 est mergée dans `develop`, la branche est rebasée dessus. La
  > feuille de style, le squelette de page et l'audit des tokens deviennent des contraintes des
  > tranches côté écran ; le pass de thème passe de six à huit écrans (tranche 06) ; et le finding
  > `games-load-failure` d'US-13 est rapatrié dans la tranche 04.
  > - Doc : `CONTEXT.md` (`Profile`, `Player`), ADR-0014 (le profil partitionne), ADR-0015 (la base
  >   porte des données irremplaçables), `CLAUDE.md` (phase dev amendée)
  > - PRD : `.scratch/profiles/PRD.md`
  > - Issues techniques : `.scratch/profiles/issues/`
  >   - `01-profiles-exist.md` — créer / lister / sélectionner / supprimer un profil (AFK)
  >   - `02-existing-data-belongs-to-dudulsmash.md` — la migration, préserve les 1199 évaluations (AFK)
  >   - `03-import-from-the-profile-page.md` — l'import déménage sur la page du profil (AFK)
  >   - `04-every-view-speaks-of-the-current-profile.md` — scoping de toutes les vues + bandeau (AFK)
  >   - `05-the-analysis-pass-belongs-to-a-profile.md` — la passe d'analyse est scopée (AFK)
  >   - `06-path-zero-and-the-hp-rework.md` — path 0 + reprise des 3 HP et du pass de thème (**HITL**)
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #51, mergée le
  > 2026-08-21). Trace de la revue : les six tranches mergées sur `integration/US-11-profiles`,
  > **path 0 + HP-01 + HP-02 + HP-03 tous verts**, build et tests verts. Path 0 est un nouveau
  > **prérequis hors plafond des 3 HP** : il crée les profils de référence, importe la plage contre
  > l'API chess.com réelle et laisse deux snapshots que les trois journeys restaurent.
  >
  > **Trois retours d'usage traités après la livraison, avant le merge** (2026-08-21) : l'import
  > était livré mais **introuvable** (un seul bouton sur `/profiles` l'ouvre désormais, focus dans le
  > formulaire) ; la liste des profils **débordait de sa carte dès le second profil** (colonne large,
  > comme les autres écrans denses) ; et surtout la suite HP **ne tenait qu'un seul profil**, si bien
  > que huit écrans dans deux thèmes déclaraient propre un écran cassé — path 0 crée maintenant un
  > second profil vide et HP-03 bascule de l'un à l'autre, ce qui rend ADR-0014 observable au lieu
  > de supposée. Leçon transférable : *une fixture dont la cardinalité est toujours un ne prouve
  > rien sur la cardinalité.*
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-14**: Voir d'un coup d'œil l'évolution de l'évaluation Stockfish sur toute la partie, dans un graphique à côté du plateau.
  > **Grillée** (2026-08-14) — **pas d'ADR** : rien n'est coûteux à défaire (composant client isolé,
  > aucun schéma, aucun endpoint, aucune donnée persistée) et le seul vrai arbitrage découle
  > d'ADR-0009. `CONTEXT.md` : nouveau terme **`Evaluation curve`**. Branche :
  > `integration/US-14-evaluation-graph`.
  >
  > Le besoin : sur la page **Analyse**, un graphique **à côté** du plateau, début
  > de partie **à gauche**, où **la zone d'un joueur grandit à mesure qu'il prend l'avantage**, et où
  > le **coup en cours est mis en avant**. Une illustration de référence a été fournie (aire
  > blanc/noir sur un axe vertical borné, curseur vertical sur le coup courant, pastilles de qualité
  > de coup posées sur la courbe).
  >
  > Cadré par le demandeur, hors débat au grilling :
  > - Le graphique **n'est pas cliquable** (lecture seule ; la navigation reste la liste des coups).
  > - Il porte **exactement la même information** que la barre d'évaluation et que la valeur affichée
  >   à côté de chaque coup (`+0.3`) — même grandeur, même repère Blancs, aucune divergence possible
  >   entre les trois vues.
  > - Il inclut **le nombre et la nature des erreurs**, telles qu'elles sont déjà en base.
  > - **Aucune nouvelle valeur calculée** : cette US est de l'affichage, rien d'autre.
  >
  > État vérifié : **la donnée est déjà là, aucun changement serveur attendu**.
  > `GET /api/games/:id/annotations` renvoie déjà, pour **chaque demi-coup**, `whiteEval` **et**
  > `whiteWinChances` (0–100, repère Blancs) plus la `severity` du coup
  > (`server/src/analysis/derivation.ts:9`), dérivés à la volée des `evaluations` d'US-4 (ADR-0009).
  > `GameViewer.tsx:20` les charge déjà et `Board.tsx:91` en consomme **un seul point à la fois** via
  > `WinningChancesBar` : le graphique est cette même barre étendue au temps. C'est donc une US
  > **purement client**.
  >
  > **Le piège du cadrage, désamorcé** : « la même information que la barre **et** que la valeur à
  > côté des coups » désignait deux **rendus distincts de la même `Evaluation`** — la barre est pilotée
  > par `whiteWinChances` (0–100, saturé), la valeur `+0.3` par `whiteEval` (centipions, non borné,
  > mats compris). Une aire ne peut pas être géométriquement les deux.
  >
  > Décisions du grilling :
  > - **L'aire porte les winning chances**, pas les centipions. La proportion blanc/noir du graphique
  >   est donc exactement celle de la barre à l'instant courant : les deux vues sont la même chose,
  >   l'une dans le temps, l'autre à l'instant. Bornée par construction, mat = aire pleine, et c'est
  >   l'échelle sur laquelle les sévérités sont définies (`CONTEXT.md`) — une chute visible correspond
  >   donc à l'erreur marquée. Écrêter des centipions à ±N aurait été une règle de présentation
  >   **nouvelle** (et un graphique qui ne dit plus la même chose que la barre juste au-dessus).
  >   Le `+0.3` reste en libellé, inchangé.
  > - **Le graphique vit dans `Board`**, conditionné à la présence d'`annotations` — le précédent
  >   exact de `WinningChancesBar` (`Board.tsx:91`). Aucun état remonté : le demi-coup courant est
  >   `index` (`Board.tsx:56`) et, le graphique n'étant pas cliquable, le flux est **à sens unique**.
  >   Il reste **son propre composant** (`EvaluationGraph`), jamais inliné. Le jour où il deviendrait
  >   une commande, remonter `index` dans `GameViewer` sera un refactoring local.
  > - **Impact vérifié : `Board` n'a qu'un seul appelant**, `GameViewer.tsx:58`. L'Explorateur
  >   (`ExplorerPage.tsx:85`) et `/danger` (`DangerPage.tsx:118`) utilisent directement le
  >   `Chessboard` de `react-chessboard` — ils ne voient pas passer ce changement (la vigilance
  >   « `Board` est partagé » d'US-10a portait sur le *terme* `Board orientation`, pas sur le
  >   composant). Restent trois impacts locaux à la page Analyse : la mise en page de `Board` (une
  >   rangée plateau | graphique, sans feuille de style — US-13), `client/test/Board.test.tsx`, et la
  >   suite HP (HP-01 étape 8, HP-02 passent par Analyse).
  > - **Un seul décompte d'erreurs, celui du Player** (`3 ?!`, `1 ?`, `2 ??`), agrégé côté client
  >   depuis `annotations` — agrégat d'affichage, pas une valeur nouvelle, cohérent avec ADR-0009.
  >   Pas les deux colonnes W/B de l'illustration : `gameAnnotations`
  >   (`server/src/analysis/derivation.ts:99`) laisse `severity` à **`null` sur tous les coups de
  >   l'adversaire**, et `CONTEXT.md` le pose comme une décision de domaine, pas comme un manque.
  >   **Conséquence assumée** : la courbe montre les deux joueurs (l'évaluation est un fait de la
  >   position), les marqueurs seulement le Player — donc le libellé dit « **vos** erreurs », sinon
  >   une chute sans pastille sur un coup adverse se lira comme un bug.
  > - **Les erreurs sont à la fois marquées sur la courbe et décomptées** : le décompte dit
  >   « combien », la courbe dit « quand », et c'est le « quand » qui justifie un axe temporel. Le
  >   marqueur porte le **glyphe** (`?!`/`?`/`??`, `SEVERITY_GLYPH` `Board.tsx:8`), pas une pastille de
  >   couleur : vocabulaire déjà à l'écran, sévérité distinguée par la **forme**. La teinte
  >   (`SEVERITY_TINT` `Board.tsx:15`) peut renforcer, jamais porter seule.
  > - **Le graphique est `aria-hidden`, et c'est une description exacte, pas un renoncement** : toute
  >   donnée qu'il porte est déjà en texte dans le même composant — la liste des coups donne `san` +
  >   glyphe + `Evaluation` **par demi-coup** (`Board.tsx:102-121`), le readout donne le coup courant
  >   et son `+0.3` (`:87`), la barre donne la balance de l'instant (`:91`). Un `aria-label` résumant
  >   80 demi-coups serait du bruit, et l'*interpréter* serait de la valeur nouvelle. Le décompte
  >   d'erreurs, lui, est du **vrai texte**. Bénéfice de bord : pas de second `role="img"` chiffré, donc
  >   pas de collision avec `getByRole("img", { name: /55/ })` (`Board.test.tsx:142,146`) — et pas de
  >   troisième région annoncée sur une page qui en a déjà une de trop (celle de `react-chessboard`,
  >   tierce, finding ouvert depuis US-8). **Latitude accordée** : si des tests unitaires de `Board`
  >   entrent malgré tout en conflit, en profiter pour renommer / assainir le composant.
  > - **Repère du coup courant doublement porté** : curseur vertical sur le graphique (visuel) et
  >   l'`aria-current` déjà présent sur le coup dans la liste (`Board.tsx:109`) — le repère non
  >   chromatique existe donc déjà.
  > - **Géométrie** : un point par **`Move` (demi-coup)**, espacement uniforme (pas le temps de
  >   réflexion, qu'on n'a pas) ; bord gauche = **ply 0, la Position initiale** à 50/50, ce qui est
  >   déjà l'état d'ouverture du plateau (`Board.tsx:56`) — noter que `/danger` **exclut** la Position
  >   initiale, mais c'est une règle d'agrégat, une partie unique a un point de départ qui a un sens ;
  >   **un seul repère, la médiane 50 %**, sans graduation ni grille (la lecture précise se fait sur le
  >   `+0.3` et la liste des coups).
  > - **États sans rien à montrer, aucun nouveau message ni contrôle** : partie non analysée →
  >   `{ analyzed: false, plies: [] }` (`server/src/annotations/repository.ts:20`), le graphique
  >   n'apparaît pas et `GameViewer.tsx:47-52` parle déjà (« pas encore analysée » + bouton
  >   Analyser) ; case « Afficher les annotations » décochée → `annotations` à `undefined`
  >   (`GameViewer.tsx:61`), le graphique disparaît avec la barre, les glyphes et les valeurs. À
  >   surveiller à l'implémentation : décocher ne doit pas faire sauter la mise en page (plateau seul
  >   dans une rangée prévue pour deux).
  >
  > Le **critère d'acceptation** d'une Feature Path agentique sur un graphique est tranché dans le
  > PRD : présence, sens de l'axe, synchronisation du curseur, position des marqueurs, cohérence du
  > décompte — jamais l'esthétique.
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #35, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-14-evaluation-graph` → `develop`, **étape 9 d'HP-01 rejouée**
  > (greffe incluse) contre le vrai chess.com et le vrai Stockfish, base repartie de zéro.
  > PRD : `.scratch/evaluation-curve/PRD.md`. Découpée en **2 issues**, sur
  > `integration/US-14-evaluation-graph` :
  > - `01-evaluation-curve-beside-the-board` ✅ — tracer bullet, auto-mergée après FP verte (6/6)
  > - `02-your-errors-marked-and-counted` ✅ — marqueurs par glyphe posés au bon demi-coup + décompte
  >   en texte, libellé comme **vos** erreurs, Player uniquement ; auto-mergée après FP verte (5/5)
  >
  > **Livrée.** Trois défauts trouvés **à l'écran** et invisibles aux étages inférieurs : le
  > graphique n'avait que 110 px pour toute une partie (axe du temps écrasé, courbe lue de haut en
  > bas), les glyphes des marqueurs étaient **étirés** par l'échelle non uniforme du SVG (sortis du
  > repère déformé, posés au-dessus), et le décompte ne s'accordait pas en nombre. La collision de
  > tests annoncée au grilling a eu lieu (`AnalysePage` demandait `??` par son texte, que la courbe
  > rend ambigu) : le test interroge désormais la liste des coups par son nom accessible, sa source
  > accessible. `SEVERITY_GLYPH`/`TINT` extraits en module partagé (une seule source pour la liste
  > des coups, la teinte de case et les marqueurs).
  >
  > Seams : la logique dans une **fonction pure** (prior art `candidateArrows`), le test composant du
  > plateau gardé mince, **FP sur base seedée** (`seed:danger` insère des parties déjà analysées avec
  > leurs `evaluations` — ni réseau ni moteur). **Budget HP inchangé** : greffe gratuite sur l'étape 9
  > d'HP-01, qui analyse déjà deux parties pour de vrai. Le demandeur se contente de **cette seule
  > étape 9** pour la PR `integration → develop` (HP-02 et HP-03 ne passent pas par Analyse) — à
  > reconfirmer au moment de la PR.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-10b**: Ne pas attendre dans le vide sur "Positions dangereuses".
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #34, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-10b-danger-page-waiting` → `develop`, suite HP rejouée en
  > entier (3/3 vertes), les 3 issues livrées et auto-mergées (PR #31, #32, #33). Issue de la
  > scission d'US-10 (les deux préoccupations qui y étaient réunies n'ont rien en commun). `GET /api/danger` (`server/src/routes/danger.ts:13`) est synchrone — pas
  > de job de fond comme l'`Analysis pass` — et `DangerPage.tsx:21,33` rend `null` tant que la
  > réponse n'est pas là : **écran blanc** pendant le calcul. Le chemin d'erreur retombe sur la même
  > branche que « rien d'analysé » (`:26`), donc un échec est indiscernable d'un état vide.
  >
  > **Commencer par mesurer** : le choix job+polling vs. simple indicateur est arbitraire sans
  > chiffre. Coût relevé en lecture de code — un **N+1** (une requête `evaluations` par partie
  > analysée, `danger/repository.ts:35`) et surtout un **rejeu cm-chess complet du PGN par partie et
  > par requête** (`chess/positions.ts:9`), le tout sur le thread principal, sans cache ni
  > mémoïsation (choix assumé d'ADR-0009 : agrégat dérivé à la volée). Chronométrer
  > `getDangerPositions` contre une DB réellement importée + analysée avant de trancher.
  >
  > **Grillée** (2026-08-14). La mesure a déplacé le problème : le N+1 soupçonné coûte **41 ms**,
  > mais le **rejeu cm-chess du PGN** en coûte **2419** sur 2,5 s — et ce n'est pas tout côté
  > serveur, l'agrégat renvoyait **3736 entrées dont 66 récurrentes** (400 Ko, autant de plateaux).
  > Décisions : job + polling **rejeté** (masque un coût au lieu de le supprimer, aucune unité de
  > progression naturelle) au profit du stockage de la **FEN par demi-coup** — **ADR-0012**, qui
  > ramène `/danger` de ~2,5 s à ~0,1 s (et de ~31 s à ~1,3 s sur une année) ; `CONTEXT.md` :
  > `Danger position` = atteinte **au moins deux fois**, Position initiale **exclue**, classement
  > **par proportion d'erreur sérieuse**. HP-01 pas 9 réécrit (deux parties les plus courtes de
  > même premier coup — une entrée garantie par construction, ~3,5 min, moins qu'avant).
  > PRD : `.scratch/danger-page-waiting/PRD.md`. Découpée en 3 issues, sur
  > `integration/US-10b-danger-page-waiting` :
  > - `01-recurring-positions-most-dangerous-first` — plancher de récurrence, exclusion ply-0, tri
  >   par proportion, cap d'affichage à 30
  > - `02-four-states-never-a-mute-screen` — calcul annoncé, échec distinct de l'état vide, et
  >   l'état « rien de récurrent » (bloquée par 01)
  > - `03-store-the-per-ply-fen` — colonne `fen` requise, écrite par la passe, contrôle d'intégrité
  >   et réparation à l'ouverture (bloquée par 02, ADR-0012)
  >
  > **Livrée.** `/danger` mesuré sur l'historique réel (78 parties, 6278 positions) : **3111 ms →
  > 55 ms**, et l'agrégat passe de 3736 entrées à 109. La page ne rend plus jamais d'écran muet :
  > quatre états distincts, dont l'échec serveur qui ne renvoie plus le joueur analyser ce qu'il
  > vient d'analyser.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-10a**: Savoir dans quel sens lire un échiquier et qui joue quoi.
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #29, mergée le 2026-08-14).
  > Trace de la revue : PR `integration/US-10a-players-on-the-board` → `develop`, suite HP rejouée en
  > entier (3/3 vertes). Issue de la scission d'US-10 (voir US-10b pour l'autre moitié). **Grillée** — pas d'ADR : rien
  > n'est coûteux à défaire ici. `CONTEXT.md` : nouveau terme **`Board orientation`**.
  > Branche : `integration/US-10a-players-on-the-board`.
  >
  > Constat vérifié : les **trois** plateaux (`components/Board.tsx:77`, `pages/ExplorerPage.tsx:75`,
  > `pages/DangerPage.tsx:44`) sont **Blancs-en-bas en dur** — aucun ne passe `boardOrientation`.
  > `AnalysePage.tsx:32` charge la `Game` complète et `GameViewer.tsx:18` n'en retient que
  > `pgn`/`analyzed`/`id` : `opponent` et `playerColor` sont récupérés puis jetés. `playerColor`
  > n'est affiché **nulle part** dans l'app.
  >
  > Décisions :
  > - Le besoin commun aux trois écrans est **l'orientation et le trait**, pas les noms : sur
  >   l'Explorateur et sur Danger il n'y a pas d'adversaire nommable, l'agrégat porte sur N parties.
  >   Les noms ne concernent que la page Analyse.
  > - **Orientation imposée par le contexte, jamais pilotable** : Analyse = côté joué par le Player,
  >   Explorateur = côté sélectionné (le radio existant `ExplorerPage.tsx:21` en devient la commande,
  >   sans nouveau contrôle), maintenu constant dans la descente ; Danger = **trait de la FEN**.
  > - Sur `/danger`, orienter « du point de vue du Player » est **indéfini** : `danger/repository.ts:38`
  >   compte toutes les positions atteintes et la clé FEN-4 n'inclut pas le côté joué, donc une même
  >   entrée agrège des parties jouées Blancs *et* Noirs. Seul le trait y est affiché — jamais
  >   « votre côté ».
  > - **Source des noms sur Analyse : les en-têtes PGN `[White]`/`[Black]`.** Une seule source, déjà
  >   dans la `Game`, cohérente avec le plateau par construction ; aucune dépendance à `settings`
  >   (que US-11 remplacera) ni appel réseau ; Lichess sert les mêmes en-têtes, donc robuste à US-12.
  >   `parseGame` (`chess/history.ts:37`) jette les en-têtes aujourd'hui — cm-chess les expose.
  >   `game.playerColor` sert uniquement à marquer lequel des deux est le Player.
  > - **Bandeau de partie complet** sur Analyse : les deux joueurs (nom + couleur, avec un repère
  >   **non chromatique** marquant le Player), le résultat, la date, la cadence et l'**ouverture**
  >   (ECO + nom). `eco`/`openingName` sont déjà renvoyés par `GET /api/games/:id`
  >   (`routes/games.ts:14` renvoie la ligne brute) mais absents de l'interface client
  >   (`types/game.ts:54`) : à déclarer côté client seulement, pas de changement serveur. Une `Game`
  >   non classée relève du bucket **Other**.
  > - **Résultat affiché comme mention explicite côté Player** (« Victoire »/« Défaite »/« Nulle »
  >   sur la ligne du Player), pas comme score symétrique : `result` est relatif au Player
  >   (`import/mapping.ts:37`), et c'est déjà la convention de `GameList` et `/stats`.
  >
  > À surveiller à l'implémentation : `Board.tsx` est **partagé** avec l'Explorateur, qui n'a pas de
  > `Game` — il ne doit pas se mettre à en supposer une. Retourner les plateaux change un
  > comportement existant : **HP-01 et HP-02 s'appuient sur Blancs-en-bas**, à rejouer. Pas de
  > feuille de style dans le projet (US-13) : un bandeau chargé reste du texte brut, et tout repère
  > doit être doublé d'un marqueur non chromatique.
  >
  > Découpée en 3 issues, toutes implémentées et auto-mergées sur l'intégration après Feature Path
  > verte. PRD : `.scratch/players-on-the-board/PRD.md`. **Aucun changement serveur** sur toute l'US.
  > - `01-game-header-and-player-side-board` ✅ (PR #25) — tracer bullet : primitives `gameHeaders`
  >   (en-têtes PGN) et `sideToMove` (FEN 4 champs), orientation en propriété du plateau, bandeau de
  >   partie. Finding trouvé **à l'écran** en FP et corrigé : le bandeau rendu en `ul` sous celui de
  >   la navigation se lisait comme deux entrées de menu.
  > - `02-explorer-follows-the-side-explored` ✅ (PR #26) — orientation tenue au côté exploré, sans
  >   se retourner sur un `Opponent reply` ; trait affiché.
  > - `03-danger-diagrams-show-the-side-to-move` ✅ (PR #27) — chaque diagramme orienté au trait
  >   depuis sa propre FEN ; jamais formulé comme le côté du Player.
  >
  > **Suite HP adaptée** (PR #28) puis **rejouée en entier**, contre la vraie API chess.com et le
  > vrai Stockfish WASM, base repartie de zéro avant chacune : **HP-01 9/9** (chiffres durs exacts —
  > 82 parties, Bullet 10 / Blitz 72, 45·0·37, mois à 28 et 54 ; pass réel 78/78 ; 78 entrées sur
  > `/danger`, aucune orientation en désaccord avec son trait), **HP-02** (orientation constante sur
  > toute la descente, trait alternant, flèches mirroitées), **HP-03** (32 entrées, somme 54, seuil
  > 50 % strict exercé sur 3 lignes). Aucune erreur console sur les trois.
  >
  > Le budget HP restant à 3/3, US-10a s'est greffée : HP-01 gagne une **étape 6b** (ouvrir une
  > partie de l'autre couleur — sans elle le retournement n'est jamais exercé) et HP-02 une
  > **étape 9** (le plateau ne se retourne *pas* en descendant).
  >
  > Findings non bloquants ouverts : la barre de winning chances ne suit pas l'orientation ; sur
  > l'Explorateur le libellé du trait est loin de la liste des candidats ; `react-chessboard` injecte
  > ses instructions de glisser-déposer dans chacun des 119 diagrammes de `/danger` (tierce partie) ;
  > cette même page rend tous ses diagrammes d'un coup, ce qui **se combine avec US-10b**.
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-9**: Importer plusieurs mois de mon historique chess.com en une seule fois.
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #19, mergée le 2026-08-12).
  > Trace de la revue : PR `integration/US-9-multi-month-import` → `develop`, suite HP jouée (3/3 vertes).
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
  >
  > Reste `develop → main` (pré-prod, non décidé).

- **US-13**: Doter l'application d'une feuille de style, pour qu'elle soit présentable — sans maquette en entrée.
  > **Grillée** (2026-08-17) — **ADR-0013**. `CONTEXT.md` **inchangé, et c'est un constat** : une
  > feuille de style n'introduit aucun concept de domaine, et « token » / « rôle de thème » sont du
  > vocabulaire d'implémentation, dont la place est dans l'ADR. Branche :
  > `integration/US-13-stylesheet`.
  >
  > État vérifié : **aucun CSS dans le projet** — zéro `.css`, aucun `<link>` dans
  > `client/index.html`, aucune dépendance de style. Le backlog annonçait cinq composants stylés
  > inline ; il y en a **neuf**, et surtout les inline sont de **deux natures** que rien ne
  > distinguait : des **teintes porteuses de sens** (`SEVERITY_TINT` `chess/severity.ts:17`, la ligne
  > faible `#fbe0e0` sur `OpeningsPage.tsx:58` et `DangerPage.tsx:115`, la pastille « ✓ analysée »
  > `GameList.tsx:41`, l'échec d'import `ImportSummary.tsx:22`, le gras du Player
  > `GameHeader.tsx:36`, la palette d'`EvaluationGraph.tsx:7-11`, l'`hsla` d'`arrows.ts:25`) et de la
  > **mise en page pure** (`maxWidth: 480/240/820`, `flex`, `height: 220` dans `Board.tsx:87-104`).
  > Seule la première famille a un enjeu d'accessibilité.
  >
  > **Pas de maquette : la référence est produite ici, en trois pièces** — les tokens (écrits), le
  > squelette de page (écrit, ci-dessous), et la capture de l'écran pilote validée par le demandeur.
  >
  > Décisions du grilling :
  > - **SCSS comme langage d'écriture, custom properties comme forme des tokens** (ADR-0013). SCSS
  >   demandé par le demandeur et retenu : `sass` est une devDependency de build, elle n'importe
  >   aucun design system et ne laisse rien dans le bundle — contrairement à Tailwind (qui remettrait
  >   les décisions visuelles dans les `className`, soit ce que l'US défait) ou à une bibliothèque de
  >   composants (qui imposerait de réécrire le markup et de risquer les noms accessibles verrouillés
  >   par les tests d'US-1 à US-14). Les `$variables` sont réservées au compile-time (breakpoints dans
  >   `@media`, maps itérées, arguments de mixin).
  > - **Les tokens ne peuvent pas être des `$variables`, et l'argument est local** : plusieurs
  >   couleurs sont consommées **depuis TypeScript**, pas depuis un sélecteur — `SEVERITY_TINT`
  >   alimente la prop `squareStyles` de `react-chessboard` (`Board.tsx:56`), API tierce qui prend un
  >   objet de style et qu'aucune classe n'atteint. Une `$variable` a disparu à l'exécution : il
  >   faudrait redéclarer les hex en TS, donc rétablir la duplication que l'US supprime et défaire
  >   l'extraction d'US-14 qui avait fait de `SEVERITY_GLYPH`/`TINT` une source unique.
  >   `var(--tint-blunder)` traverse la frontière. Prix payé : plus d'erreur de compilation sur un nom
  >   de token.
  > - **Mode sombre dedans**, en **préférence système seule** (`@media (prefers-color-scheme: dark)`)
  >   — aucun contrôle, aucun état, aucune persistance, aucun changement serveur. Un `[data-theme]`
  >   se greffera plus tard sans toucher une règle.
  > - **Trois familles de couleur, et c'est une règle, pas une convention** : les *rôles de thème*
  >   s'inversent ; les *teintes sémantiques* gardent leur sens, reçoivent une valeur par thème **et
  >   emportent leur propre encre** (leur contraste ne dépend jamais de l'héritage) ; les *couleurs de
  >   joueur et de plateau* (parts Blancs/Noirs de `WinningChancesBar` et d'`EvaluationGraph`, cases
  >   du plateau) **ne réagissent jamais au thème** — la part des Blancs est claire parce que ce sont
  >   les Blancs. Elles gagnent une bordure pour rester détachables d'un fond sombre.
  >   `react-chessboard@5.10.0` expose `lightSquareStyle`/`darkSquareStyle`/`boardStyle` : on a la
  >   prise, aucun des trois plateaux ne s'en sert aujourd'hui.
  > - **Responsive : fluide, sans breakpoint conçu.** Largeurs en `ch`/`rem`, grilles qui se replient
  >   d'elles-mêmes. C'est une manière d'écrire, pas un travail de plus — et c'est le seul choix qui
  >   ne grave pas des px à défaire.
  > - **Markup libre** (choix du demandeur, contre ma recommandation d'un périmètre borné aux
  >   accroches). Coût assumé et énoncé : `StatsPage`, `DangerPage`, `ExplorerPage`, `GameList`,
  >   `Board`, `AnalysePage` sont directement exposés et cessent de servir de filet pendant le
  >   travail ; **la suite HP pilote la vraie UI** et devra être adaptée puis rejouée, exactement
  >   comme en US-10a (PR #28) — budget à prévoir, pas à découvrir à la PR.
  > - **Séquencement : markup d'abord, en tranche séparée**, sans une ligne de style. Les tests sont
  >   adaptés là et nulle part ailleurs, donc un test rouge dans les tranches suivantes désigne
  >   forcément le style. Contrepartie assumée : cette tranche n'est pas démontrable à l'œil, sa FP
  >   porte sur la structure.
  > - **Le squelette est fixé ici**, sinon la tranche markup restructure à l'aveugle au service d'une
  >   grille qui n'existe pas : châssis `header` (`h1` + `nav` en barre, onglet courant marqué sur
  >   `[aria-current="page"]` que `NavLink` pose déjà — repère non chromatique gratuit) ; colonne de
  >   lecture bornée à `72ch` avec une **variante large** pour `/danger` et `/analyse` ; **une page =
  >   une `section aria-labelledby` + un `h2`** ; données tabulaires en `<table>` (`th scope`, nombres
  >   à droite, `tabular-nums` en token global) ; ce qui est une liste reste une liste (`GameList` en
  >   `display: grid`, `/danger` en grille de cartes `auto-fit`) ; Analyse garde la rangée d'US-14
  >   avec des bases fluides ; séparation par l'espacement, jamais par des filets.
  > - **`/stats` devient un seul tableau** (amendement du demandeur) : Total, cadences et côtés en
  >   groupes de lignes. Conséquence à porter dans la tranche markup — les `h3` « Par cadence » /
  >   « Par côté » disparaissent comme titres et les `aria-label` des `ul` migrent vers des `th` de
  >   groupe, or `StatsPage.test.tsx` interroge exactement ces libellés.
  > - **Grille d'acceptation d'une US esthétique** : l'agent **mesure et bloque** sur ce qui est
  >   objectif — feuille effectivement appliquée (aucun token non résolu), contraste calculé sur les
  >   paires réellement rendues ≥ 4.5:1 **dans les deux thèmes**, aucun débordement horizontal en
  >   fenêtre étroite, repère non chromatique toujours présent, couleurs de joueur inchangées entre
  >   thèmes. Le **goût se juge une seule fois**, par le demandeur, sur l'écran pilote ; les écrans
  >   suivants ne sont plus jugés qu'à leur conformité au squelette et aux tokens. Le contraste est
  >   **bloquant** : le finding a11y d'US-3 (surlignage invisible) est le précédent à ne pas rejouer.
  > - **Budget HP** : pas de 4ᵉ HP, et la suite couvre déjà les invariants sensibles — HP-03 étape 4
  >   asserte le surlignage sémantique, HP-02 étape 4 l'opacité et la teinte des flèches, HP-01
  >   étape 9 la courbe et ses marqueurs. Le demandeur retient une **passe thème sur les trois HP**
  >   (plutôt que la greffe bornée sur HP-03 que je recommandais) : chaque HP gagne une **étape
  >   finale** qui repasse sous préférence sombre les écrans **déjà atteints**, sans réimporter ni
  >   réanalyser — le surcoût est du rendu, pas du parcours.
  > - **Exigence du demandeur : la suite HP doit être revue pour visiter tous les écrans.** Une passe
  >   thème qui ne voit pas un écran ne prouve rien sur cet écran, et aujourd'hui `/stats` n'est
  >   visité par aucun HP, `/danger` seulement en drive-by. Forme retenue : l'étape finale de passe
  >   thème **parcourt la navigation** et traverse les six écrans dans les deux thèmes, en réutilisant
  >   l'état déjà construit — les journeys elles-mêmes restent des parcours de valeur et ne se
  >   transforment pas en balayage de couverture. À confirmer au PRD.
  >
  > **Pilote validé avant toute tranche** (prototype jetable, `/` et `/analyse` dans les deux thèmes,
  > conservé comme référence visuelle dans `.scratch/stylesheet/pilot-reference.html`). Produit
  > **maintenant** plutôt qu'en tranche 2 sur remarque du demandeur : le goût est la seule décision
  > qu'on ne peut pas déléguer, et elle ne devait pas se retrouver derrière une tranche déjà mergée.
  > Deux pilotes plutôt qu'un, parce qu'une palette qui tient sur une liste peut s'effondrer sur la
  > page Analyse. Il a payé son coût — **trois enseignements que rien d'autre n'aurait donnés avant
  > la fin** :
  > - **La règle des trois familles avait une faille** : une sévérité posée **sur une case** relève de
  >   la famille constante, pas de la famille sémantique, parce que la pièce qu'elle porte garde son
  >   encre dans les deux thèmes. La case surlignée tombait à **1.49:1** en sombre. D'où
  >   `--square-inaccuracy/mistake/blunder`, constantes, distinctes des `--tint-*` du châssis. La
  >   frontière n'est pas le sens de la couleur mais **ce qui est peint par-dessus**.
  > - **Le plateau relève du 3:1 des graphiques non textuels**, pas du 4.5:1 du texte — en production
  >   ce sont les SVG de `react-chessboard`.
  > - **Et il se juge sur `max(remplissage, contour)` contre la case**, pas sur le remplissage seul :
  >   une pièce blanche sur case claire mesure 1.24:1 en remplissage et 14.65:1 en contour, et c'est
  >   le contour qui porte la lisibilité. Jugé au remplissage, le critère rejetterait un plateau
  >   parfaitement lisible. Pire cas mesuré sur le pilote validé, toutes combinaisons confondues :
  >   **4.81:1**. Texte : **0 faute** sur 63 nœuds par thème, aucun débordement horizontal.
  >
  > Tokens figés et référence visuelle : dans **ADR-0013**.
  >
  > PRD : `.scratch/stylesheet/PRD.md`. **Découpée en 6 issues**, toutes `ready-for-agent`, sur
  > `integration/US-13-stylesheet` :
  > - `01-restructure-markup-to-the-skeleton` — tous les écrans au squelette, **zéro style**, les
  >   tests adaptés ici et nulle part ailleurs ; FP structurelle, pas esthétique
  > - `02-tokens-and-the-app-chrome` — le pilote rendu réel : SCSS câblé, tokens, châssis, bloc
  >   `prefers-color-scheme: dark`, et le test de cohérence des tokens (bloquée par 01)
  > - `03-semantic-tints-move-to-tokens` — la tranche à risque : une source par teinte, famille
  >   constante du plateau, repères non chromatiques intacts (bloquée par 02)
  > - `04-lists-and-tables` — Mes parties, `/stats`, `/openings` : rangées constantes, chiffres
  >   alignés (bloquée par 02)
  > - `05-dense-screens` — `/danger` en grille de cartes, explorateur, rangée d'Analyse fluide ;
  >   après elle, **plus aucun style inline de mise en page** (bloquée par 02)
  > - `06-revise-the-hp-suite` — adapter les 3 HP au markup, puis l'étape finale qui parcourt les six
  >   écrans dans les deux thèmes ; ferme l'angle mort `/stats` (bloquée par 03, 04, 05)
  >
  > Seams confirmés : **agentique en apex** (styles calculés via CDP — le seul endroit où une feuille
  > de style est observable ; le script de mesure du pilote est réutilisable comme outillage de FP),
  > **composants en jsdom** pour la structure et le nom du token seulement (jsdom ne charge pas la
  > feuille), un **seam nouveau** de cohérence des tokens au niveau du repo, et le build. Aucun test
  > serveur : l'US ne touche pas le serveur. Régression visuelle par captures **rejetée** (dépendance,
  > binaires versionnés, flake notoire, aucune CI pour la porter).
  >
  > Vigilances relevées : **aucun HP ne visite `/stats`**, or c'est l'écran dont le markup change le
  > plus — sa vérification repose entièrement sur sa FP. Les tests composants tournent en **jsdom**,
  > qui ne charge pas la feuille : les assertions de couleur littérale devront porter sur le nom du
  > token (plus honnête, elles vérifient le câblage). Décocher les annotations ne doit pas faire
  > s'effondrer la rangée d'Analyse (vigilance déjà ouverte en US-14).
  >
  > Trouvailles hors périmètre strict, à traiter en drive-by ou à laisser : **`GamesPage` est la
  > seule page sans `<section>` ni `<h2>`** (le squelette la réaligne) et porte **la seule chaîne
  > restée en anglais** de l'app (« No games yet — import your chess.com history to get started. ») ;
  > `client/package.json` déclare `vite ^8.1.5` alors que le `node_modules` installé est en 5.4.21.
  >
  > **Livrée** (2026-08-17) — les **six slices** mergées dans `integration/US-13-stylesheet`
  > (PR #37 → #43). Suite **HP 3/3 verte** sur l'app réelle, avec la passe thème sur les six écrans
  > dans les deux thèmes (36 audits, aucun échec). PR `integration → develop` ouverte : le merge est
  > une décision humaine. Deux points laissés au relecteur, écrits sur les issues : la **largeur de
  > l'explorateur** (son diagramme tombe à 317 px sur écran large ; un attribut suffit, mais le goût
  > avait été figé sur un pilote qui ne montrait pas cet écran) et la cellule `Win rate` **vide**
  > plutôt qu'un tiret sur une cadence sans partie (du contenu, hors périmètre).

  >
  > **Terminée** (2026-08-18) — fusionnée dans `develop` (PR #44, 42 commits). Six slices plus
  > quatre rondes de corrections nées de la relecture à l'écran du demandeur. `develop` vérifié
  > après merge : build vert, 144 tests serveur + 370 client. Deux constats versés au backlog
  > technique en `needs-triage` (un échec de `/api/games` qui s'affiche comme un historique vide ;
  > la question produit du sélecteur de côté de l'explorateur), et un choix laissé ouvert : la
  > cellule `Win rate` vide plutôt qu'un tiret, du contenu hors périmètre.

- **US-8**: Être rassuré que le pass d'analyse s'est bien terminé, sans avoir à deviner.
  > Un indicateur de progression et une coche "analysée" existent déjà
  > (`GamesPage`/`GameList`), mais à la fin d'un pass la progression disparaît sans aucun message de
  > confirmation — incertitude sur le fait que ça se soit bien passé. La coche "analysée" actuelle
  > est un texte gras (`✓ analysée`), pas nécessairement assez visible. Points à trancher au
  > grilling : forme du message de fin (toast ? texte permanent ?), et si la coche doit changer de
  > forme/visibilité.
  > **Grillée** (**ADR-0011** : le pass est persisté, sa progression reste dérivée des
  > `Evaluation`s stockées ; `CONTEXT.md` : nouveau terme **`Analysis pass`** — le glossaire n'en
  > avait aucun pour le pass, introduit pourtant par US-4). Découpée en 4 issues, implémentée sur
  > `integration/US-8-analysis-pass-completion` (worktree dédié). PRD :
  > `.scratch/analysis-pass-completion/PRD.md`.
  > - `01-positions-progress-on-a-persisted-pass` ✅ — table `analysis_passes`, `done` dérivé du
  >   `COUNT` sur `evaluations`, progression en Positions, ligne de progression extraite en
  >   composant unique. Bug trouvé et corrigé en Feature Path (le compteur n'atteignait jamais son
  >   total : la remise à zéro fusionnait avec la dernière progression).
  > - `02-completion-summary-and-acknowledgement` ✅ — résumé de fin persistant (survit au
  >   rechargement **et** au redémarrage serveur, vérifié), acquitté par le Player
  >   (`POST /api/analyze/acknowledge`), « rien à analyser » explicite
  > - `03-interrupted-and-failed-outcomes` ✅ — les trois issues du pass, réconciliation au boot
  >   (jamais de reprise automatique), erreur moteur enfin visible, greffe sur HP-01 (budget à
  >   3/3). Mine du cadrage désamorcée (partie à moitié évaluée vs. clé primaire). Finding
  >   bloquant trouvé en FP : un moteur natif cassé tuait le serveur au démarrage, donc l'issue
  >   `failed` n'était atteignable par aucune configuration réelle — corrigé.
  > - `04-analysis-state-at-a-glance-in-the-game-list` ✅ — badge renforcé (pastille encadrée) +
  >   décompte global dérivé des Games déjà chargées, sans appel réseau supplémentaire
  >
  > Les 4 issues validées par leur Feature Path (agentique, UI-first contre l'app réelle : Chrome
  > en CDP, vrai Stockfish WASM, fixture `seed:move-habits`). **Trois bugs trouvés par l'étage
  > agentique et invisibles aux étages inférieurs** : le compteur n'atteignait jamais son total
  > (la remise à zéro fusionnait avec la dernière progression) ; un moteur natif cassé tuait le
  > serveur au démarrage, rendant l'issue `failed` inatteignable ; un moteur muet aurait laissé un
  > pass tourner sans fin. HP-01 étape 8 porte la confirmation de fin (budget HP à 3/3).
  >
  > - `05-readable-readouts-and-one-live-region` ✅ — tranche de finition : lever la confusion entre
  >   le décompte d'historique et le résumé de pass, et ne laisser qu'une région live à nous sur
  >   la page Analyse (celle de `react-chessboard` est tierce, non supprimable)
  >
  > Le finding « un résumé non acquitté est silencieusement remplacé par un pass plus récent » est
  > **assumé** : décision enregistrée dans les Conséquences d'**ADR-0011** (la promesse d'US-8 est
  > qu'on ne rate pas une confirmation *sans agir*, et relancer une analyse est un acte).
  >
  > **Fusionnée dans `develop`** (décision humaine `integration → develop`, PR #22, mergée le
  > 2026-08-12). `develop` (US-9) fusionnée dans la branche **avant** l'ouverture : quatre
  > conflits réels, pas seulement le backlog — US-9 avait remodelé l'API d'import et renuméroté le
  > parcours HP-01 ; le merge a cassé deux choses que les tests ont rattrapées. Mergeabilité
  > revérifiée après ouverture : `CLEAN`.
  >
  > **Suite HP rejouée en entier après ce merge** (la première exécution portait sur l'import
  > mono-mois, donc périmée) : HP-01 9/9, HP-02, HP-03 — vertes, contre la vraie API chess.com
  > (`DudulSmash`, 2026-05 → 2026-06, 82 parties) et le vrai Stockfish WASM, sans erreur console.
  > Le **plafond de profondeur d'HP-02**, noté « non exerçable » depuis US-7, l'est enfin : 40
  > demi-coups atteints.
  >
  > **Collision d'ADR corrigée** : US-9 et US-8 avaient toutes deux créé une `ADR-0010` en
  > parallèle, sans conflit git (noms de fichiers différents). Celle d'US-9 étant déjà sur
  > `develop`, celle d'US-8 est renumérotée en **ADR-0011**, avec ses 14 références.
  >
  > Findings non bloquants ouverts : la ligne de progression ne se nomme pas pendant l'exécution ;
  > la région live résiduelle de `react-chessboard` est `assertive` et sans libellé (tierce) ; le
  > backend moteur natif reste non vérifié sur son chemin nominal (seuls ses modes de panne le
  > sont). Un flake observé une fois sur `GameViewer` (annotations), non reproduit, non diagnostiqué.
  >
  > ⚠️ La PR #22 a été mergée sur `5953c78` alors que le dernier commit de la branche
  > (`5460b15`) n'y était pas encore : la renumérotation d'ADR et cette mise à jour du backlog
  > sont arrivées par une PR de rattrapage. Reste `develop → main` (pré-prod, non décidé).

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
