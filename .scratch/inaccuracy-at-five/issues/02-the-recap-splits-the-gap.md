# 02 — Le récapitulatif ventile l'écart par motif

Status: ready-for-agent

## Parent

`.scratch/inaccuracy-at-five/PRD.md` — US-37 (`BACKLOG.md`).

**Branche.** Sous-issue implémentée sur `integration/US-37-inaccuracy-at-five` ; PR vers elle,
jamais vers `develop`.

## What to build

Le récapitulatif d'une partie affiche l'écart entre les coups **que la partie montre** et les
erreurs **que l'analyse compte**, et l'explique par une phrase **écrite en dur** : « le coup
était forcé ». C'était vrai tant que l'exclusion « position déjà décidée » ne pouvait pas
coexister avec un coup signalé. La tranche 03 rend cette coexistence possible, et la phrase
deviendrait **fausse à l'écran**.

Cette tranche répare la phrase **avant** que le barème ne la casse. À barème inchangé, elle ne
change donc rien de visible sur les parties réelles — l'écart y est encore intégralement dû aux
coups forcés — mais le chemin existe et est testé.

- Le récapitulatif d'une partie porte l'écart **ventilé par motif d'exclusion**, un
  enregistrement par motif, sur le modèle exact de la ligne « Exclus : » qui le précède et qui
  le fait déjà bien. **Jamais un scalaire** : c'est ce qu'ADR-0017 exige déjà d'un `Game`
  (« *together with which reason excluded it* »), et le récapitulatif était la dernière surface
  à fondre les deux motifs.
- L'écran énonce chaque motif présent avec ses propres mots, et n'énonce pas ceux qui sont à
  zéro. Le vocabulaire est celui déjà publié pour les deux motifs — on ne réinvente pas de
  formulation.
- Le fold du rapport rejouable porte une assertion de réconciliation entre ses totaux et le
  récapitulatif : elle est **étendue au nouveau champ**. C'est le garde-fou de la tranche.

## Acceptance criteria

- [ ] Le récapitulatif expose l'écart par motif, pas un total unique.
- [ ] Sur une partie où l'écart vient d'un coup forcé, l'écran dit « forcé » — texte inchangé
      pour le joueur.
- [ ] Sur une partie fabriquée où l'écart vient d'une position déjà décidée, l'écran dit « déjà
      décidée » et **jamais** « forcé ».
- [ ] Sur une partie où les deux coexistent, l'écran énonce les deux, chacun avec son compte.
- [ ] L'assertion de réconciliation du rapport rejouable couvre le nouveau champ et échoue si
      les deux sources divergent.
- [ ] Aucun chiffre existant ne change sur les parties réelles de la base.
- [ ] Aucune migration. build + tests + lint verts.

### Feature Path (FP)

1. Ouvrir une partie analysée comportant un coup signalé mais forcé → le récapitulatif indique
   l'écart et l'attribue au coup **forcé**, comme avant la tranche.
2. Sur la même partie, vérifier que la liste des coups marque ce coup de son propre motif →
   cohérent avec le récapitulatif, aucun « non compté » générique.
3. Ouvrir une partie dont le récapitulatif ne présente **aucun** écart → aucune phrase
   d'explication n'apparaît (on n'explique pas un écart nul).
4. Relever les autres chiffres du récapitulatif (coups comptés, chances perdues, dérive) →
   identiques à avant la tranche.

Verify: UI d'abord. Le cas « déjà décidée » n'est pas atteignable sur la base locale à barème
10 — il est couvert par les tests de la tranche, et la FP ne le simule pas. **Le dire dans le
rapport** plutôt que fabriquer un faux vert.

## Blocked by

- `01-the-two-constants-part.md`
