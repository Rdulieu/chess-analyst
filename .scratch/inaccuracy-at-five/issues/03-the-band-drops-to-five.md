# 03 — Le barème passe à 5

Status: ready-for-agent

## Parent

`.scratch/inaccuracy-at-five/PRD.md` — US-37 (`BACKLOG.md`).

**Branche.** Sous-issue implémentée sur `integration/US-37-inaccuracy-at-five`.

## What to build

La bande `Inaccuracy` descend de **10–20 %** à **5–20 %** de chances de victoire perdues. Le
plancher du dénominateur **reste à 10 %**, par décision explicite du demandeur : le comportement
de fin de partie plaît tel qu'il est.

Grâce aux tranches 01 et 02, le changement de production se réduit à **un littéral** — la valeur
du seuil de signalement. Si cette tranche doit toucher autre chose que ce littéral, ses tests et
la documentation dérivée, c'est qu'une tranche amont a été mal faite : s'arrêter et le dire.

Ce que le barème produit, et qui doit être vérifié plutôt que supposé :

- **Ce qui bouge** : coups signalés (×1,7 environ, **tous des `?!`**), erreurs comptées, part
  signalée des pertes, et la **dérive**, qui fond de moitié.
- **Ce qui ne bouge pas d'un pouce** : coups du joueur, `Counted Move`s, taille de la zone morte,
  coups forcés, **chances perdues totales**, bornes de `Mistake` et `Blunder`, seuil de 20 % de
  la `Danger position`.
- **Le cas nouveau** : un coup de la zone morte peut désormais être **signalé tout en restant
  exclu** — la garantie arithmétique d'avant devient une quasi-garantie chiffrée. Le mécanisme
  d'affichage existe déjà (US-15a tranche 04) et n'a jamais tiré ; il tire maintenant.

La documentation dérivée (glossaire, ADR-0017 amendé, note ADR-0023) a été écrite pendant le
grill et est déjà sur la branche : cette tranche la **vérifie**, elle ne la réécrit pas. Elle
corrige en revanche les **commentaires de code** qui affirment encore l'inatteignabilité du
motif « déjà décidée », lesquels deviennent faux.

## Acceptance criteria

- [ ] Un coup coûtant 5,0 points est signalé `?!` ; un coup coûtant 4,9 ne l'est pas.
- [ ] Les bornes 20 et 30 sont inchangées, vérifiées à 19,9 / 20,0 / 29,9 / 30,0.
- [ ] Sur une partie réelle déjà analysée : coups comptés, coups forcés exclus, coups exclus
      comme décidés et **chances perdues totales** sont identiques à avant, au dixième près.
- [ ] Sur la même partie : coups signalés et erreurs comptées augmentent, dérive diminue, et
      `chances signalées + dérive = chances perdues` reste vrai.
- [ ] Aucune sévérité nouvelle n'apparaît en `?` ou `??` du seul fait de cette tranche.
- [ ] Le seuil de 20 % de la `Danger position` est couvert par un test de non-régression
      explicite.
- [ ] Les commentaires de code affirmant que le motif « déjà décidée » est inatteignable sont
      réécrits ; le libellé correspondant reste défini.
- [ ] Le glossaire et ADR-0017 en vigueur sur la branche décrivent bien 5–20 et le plancher
      empirique à 10.
- [ ] **Aucune migration, aucun appel moteur, aucune réanalyse.**
- [ ] build + tests + lint verts.

### Feature Path (FP)

Cette FP est une tranche de mesure : elle **recalcule elle-même** les chiffres attendus à partir
des évaluations, plutôt que de relire ce que l'app affiche. Comparer deux instances de l'app,
l'une avant la tranche, l'autre après, sur **la même** base.

1. Choisir une partie analysée dont la dérive est notable. Avant la tranche, relever la ligne
   complète du récapitulatif → relevée.
2. Recalculer à la main, depuis les évaluations de cette partie, la liste des coups du joueur
   dont la chute est comprise entre 5 et 10 points → une liste attendue de coups nouvellement
   signalés.
3. Après la tranche, rouvrir la même partie → **exactement** ces coups portent un `?!` de plus,
   ni plus ni moins.
4. Comparer les chances perdues totales avant/après → identiques au dixième.
5. Comparer coups comptés, coups forcés exclus, coups exclus comme décidés → identiques.
6. Vérifier que la dérive a baissé du montant exact des chances portées par les coups
   nouvellement signalés → l'addition tombe juste.
7. Ouvrir la page des positions dangereuses → le classement et les proportions d'erreur grave
   sont inchangés.

Verify: UI d'abord pour 1, 3, 7 ; le recalcul de 2 et 6 se fait hors app, sur les évaluations
stockées, et c'est le cœur du test — un chiffre relu dans l'app ne prouve rien de l'app.

## Blocked by

- `02-the-recap-splits-the-gap.md`
