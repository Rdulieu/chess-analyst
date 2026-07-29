# Backlog

## To do

- **US-7**: Voir mes erreurs pendant la revue d'une partie — annoter la qualité des coups (`?!`/`?`/`??`) et l'`Evaluation` sur la page **Analyse**, à partir des `Evaluation`s stockées par US-4.
  > **Différée depuis le grilling d'US-4** : surfaçage **par coup** du `Mistake` (distinct de l'agrégat `Danger position` de `/danger`). **Dépend d'US-4** (table `evaluations` ; aucun calcul moteur supplémentaire, réutilise les évals stockées). Inclut une **option d'activation/désactivation** de la visualisation, **activée par défaut**.

- **US-9**: Importer plusieurs mois de mon historique chess.com en une seule fois.
  > Pas encore grillée. Aujourd'hui un import ne couvre qu'**un seul mois** (`ImportParams` côté
  > client et serveur, `POST /api/import` : un seul appel à `fetchMonth`) — pas qu'une limite
  > d'UI, la forme de la requête/réponse devrait changer (plage de mois ? sélection multiple ?
  > un résumé consolidé ou par mois ?). Ce sont des questions à trancher au grilling.

- **US-10**: Voir clairement qui joue Blancs/Noirs sur un échiquier, et ne pas attendre dans le vide sur "Positions dangereuses".
  > Pas encore grillée, deux préoccupations distinctes réunies ici :
  > - Aucun échiquier affiché dans l'app (Analyse, Explorateur, Positions dangereuses) ne montre
  >   les noms des joueurs ni qui est Blancs/Noirs, alors que `Game.opponent`/`Game.playerColor`
  >   existent déjà et sont récupérés par la page Analyse sans être affichés.
  > - `GET /api/danger` est synchrone (pas de job en arrière-plan comme l'analyse), et la page ne
  >   montre aucun état de chargement — écran vide pendant le calcul. À trancher : job + polling
  >   (comme l'analyse) vs. simple indicateur de chargement si le calcul reste rapide en pratique.

## Doing

- **US-8**: Être rassuré que le pass d'analyse s'est bien terminé, sans avoir à deviner.
  > Grillée (pas de nouvelle ADR — petit correctif additif ; `CONTEXT.md` : nouveau terme
  > `Analysis pass`, cycle de vie running/completed/interrupted), découpée en 1 issue,
  > implémentation à venir sur `integration/US-8-analysis-completion-feedback`. PRD :
  > `.scratch/analysis-completion-feedback/PRD.md`.
  > - `01-completion-message` — message permanent (completed/interrompu) dérivé de
  >   `{running, total, done}` existant, fetch du statut au chargement de la page, aucun
  >   changement d'API. Aucun bloqueur.

## In review

## Done

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
