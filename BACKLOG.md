# Backlog

## To do

- **US-3**: Identifier mes ouvertures faibles par statistiques de résultat (Weak opening — taux de victoire par ouverture, par côté et par cadence).
- **US-4**: Identifier mes positions dangereuses par analyse moteur (Stockfish — Mistake et Danger position).
- **US-6**: Consulter mes statistiques globales sur l'historique importé (nombre de parties, bilan victoire/nulle/défaite), sur la page `/stats`.
  > Petite feature qui remplit le placeholder `/stats` réservé par l'ADR-0006 (routage). Agrégation sur **tout** l'historique importé (distincte du bilan V/N/D **par import** déjà affiché par `ImportSummary`). Dépend de l'US technique enabler de navigation.

## Doing

- **US-5**: Explorateur visuel de mes coups joués — parcourir l'arbre de mes coups, avec fréquence et taux de victoire par coup, pour comprendre mes habitudes.
  > PRD : `.scratch/move-habit-explorer/PRD.md`. Indépendante d'US-2 (jeu de fixtures propre). Découpée en 3 issues techniques (`ready-for-agent`) :
  > `.scratch/move-habit-explorer/issues/01-single-level-move-habits.md`,
  > `.scratch/move-habit-explorer/issues/02-drill-down-navigation.md`,
  > `.scratch/move-habit-explorer/issues/03-board-arrows.md`.
  > Sur la branche `integration/US-5-move-explorer`, créée à partir d'`integration/US-1-chess-history-analysis` (rebase à prévoir une fois US-1 avancée).

## In review

## Done

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
