Status: `done` — **HITL** : le merge `integration → develop` est une décision humaine.

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`. ADR : `docs/adr/0022-one-board-one-author.md`.

Dernière tranche, sur `integration/US-23-review-route-consistency`. Elle **n'implémente rien** : elle
vérifie et remet la main au demandeur.

## What to build

**Faire tourner la suite des Happy Paths sur les sept tranches réunies, et ouvrir la PR vers
`develop`.**

Cette story **ne crée aucun parcours** : elle rend praticables ceux qui existent. La suite est déjà à
**trois HP**, son plafond, donc **aucun HP nouveau n'est proposé par défaut** — la proposition de
co-création sera néanmoins posée au demandeur, comme le veut le flux, et le plafond rappelé (fusionner
deux parcours, en abandonner un non critique, ou greffer sur un existant).

Les trois HP en place sont le filet de régression, et **HP-03 traverse la route de lecture** : c'est lui
qui joue l'assertion de déplacement nul que la tranche 07 met sous tension.

La passe de thème est le second filet, avec les deux largeurs auditées et les deux thèmes — et c'est là
que le **relevé de hauteur** de la tranche 07 doit être repris pour la PR.

Attention de course connue et consignée : le fan-out des HP est plafonné à **deux sous-agents en
parallèle** sur cette machine ; l'orchestration paie en sérialisation plutôt qu'en isolation. Et la
collecte des rapports est la partie qui a réellement échoué par le passé — les demander par message, et
les récupérer dans les transcripts à défaut.

## Acceptance criteria

- [ ] `npm run build`, `npm test` et `npm run lint` sont verts sur la branche d'intégration, les sept
      tranches réunies.
- [ ] Le prérequis d'amorçage est joué seul et en premier, puis les trois HP.
- [ ] Les **trois** rapports HP sont effectivement **collectés** et cités — un rapport manquant n'est pas
      un HP vert.
- [ ] La passe de thème est jouée sur les écrans touchés, aux deux largeurs et dans les deux thèmes ;
      l'assertion de déplacement nul est verte.
- [ ] Le relevé de hauteur du panneau figure dans la PR, avec les chiffres avant/après.
- [ ] La PR vers `develop` **liste les sept tranches** incluses, pour une revue de lot lisible.
- [ ] La PR nomme les décisions du grill que le demandeur doit connaître : ADR-0022, la limite posée à
      « harmoniser partout », et les deux mots rendus au moteur dans `CONTEXT.md`.
- [ ] La PR nomme ce qui reste **hors périmètre** et pourquoi : les filtres de « Mes parties », la
      `Confrontation` coup par coup (six notes du 25/08, dont deux contestent une décision documentée), et
      l'écran de bilan jamais exercé sur des dizaines de lectures.
- [ ] La mergeabilité de la PR est **re-vérifiée** avant la remise au demandeur (`BACKLOG.md` collisionne
      structurellement).
- [ ] `BACKLOG.md` : US-23 passe en `In review` avec le lien de la PR.
- [ ] **L'agent n'a pas mergé** dans `develop`.

### Feature Path (FP)

Cette tranche n'a pas de FP propre : **son gate est la suite HP elle-même**, plus la passe de thème.

## Blocked by

- Les sept tranches : `01` à `07`.
