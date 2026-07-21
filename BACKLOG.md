# Backlog

## To do

- **US-3**: Identifier mes ouvertures faibles par statistiques de résultat (Weak opening — taux de victoire par ouverture, par côté et par cadence).
- **US-4**: Identifier mes positions dangereuses par analyse moteur (Stockfish — Mistake et Danger position).

## Doing

## In review

- **US-2**: Importer mes parties depuis chess.com (relais local + persistance incrémentale), pour remplacer la partie fixture par mon véritable historique.
  > Grillée, découpée, implémentée sur `integration/US-2-import-chess-com`. PRD : `.scratch/import-chess-com/PRD.md`. **5 slices livrés + 1 US technique de découpage**, chacun validé par sa Feature Path (agentic, Chrome réel) et auto-mergé sur check local vert :
  > - `01-import-backend` ✅ — schéma (game_url/player_color/result), client chess.com injectable, service, `POST /api/import`
  > - `02-import-ui` ✅ — formulaire (mois/catégories) + parcours des parties sur le plateau
  > - `03-import-summary` ✅ — fenêtre de résumé (par cadence, nouvelles vs présentes, bilan V/N/D)
  > - `04-import-progress` ✅ — indicateur de progression (indéterminé ; SSE différé, cf. issue)
  > - `05-remember-username` ✅ — mémorisation du username (table `settings`)
  > - `code-decomposition` ✅ — découpage en modules par feature + error boundary (`.scratch/code-decomposition/`)
  >
  > **En attente de la décision humaine `integration → develop`** : avant le PR, jouer le **HP « vrai compte chess.com »** (une fois, `/agentic-tests HP`).

## Done

- **US-1**: Squelette de l'application — structure React + serveur Node local + persistance SQLite en place, avec un plateau interactif capable d'afficher et de naviguer dans une partie fixture (pas d'import chess.com, pas d'analyse).
  > PRD : `.scratch/app-skeleton/PRD.md`. Les 3 issues techniques implémentées et fusionnées dans `integration/US-1-chess-history-analysis` (01 boot+plateau, 02 navigation avant/arrière, 03 saut vers un coup), chacune validée par sa Feature Path (agentic, Chrome réel). Fusionnée dans `develop` (décision humaine `integration → develop` du 2026-07-21). Pas de suite Happy Path pour cette US infrastructurelle (à reconsidérer une fois US-2/3/4).
