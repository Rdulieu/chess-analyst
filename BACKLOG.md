# Backlog

## To do

- **US-2**: Importer mes parties depuis chess.com (relais local + persistance incrémentale), pour remplacer la partie fixture par mon véritable historique.
- **US-3**: Identifier mes ouvertures faibles par statistiques de résultat (Weak opening — taux de victoire par ouverture, par côté et par cadence).
- **US-4**: Identifier mes positions dangereuses par analyse moteur (Stockfish — Mistake et Danger position).

## Doing

## In review

## Done

- **US-1**: Squelette de l'application — structure React + serveur Node local + persistance SQLite en place, avec un plateau interactif capable d'afficher et de naviguer dans une partie fixture (pas d'import chess.com, pas d'analyse).
  > PRD : `.scratch/app-skeleton/PRD.md`. Les 3 issues techniques implémentées et fusionnées dans `integration/US-1-chess-history-analysis` (01 boot+plateau, 02 navigation avant/arrière, 03 saut vers un coup), chacune validée par sa Feature Path (agentic, Chrome réel). Fusionnée dans `develop` (décision humaine `integration → develop` du 2026-07-21). Pas de suite Happy Path pour cette US infrastructurelle (à reconsidérer une fois US-2/3/4).
