# 02 — Le récap de partie compte ce qui a été offert

**What to build:** `GameRecap` gagne un **bloc nommé** d'`Opportunity`s — un total et sa ventilation
par gravité — posé **à côté** des comptes du joueur et **jamais additionné dedans**.

Pourquoi au récap et pas seulement dans la `Confrontation` : une `Opportunity` existe que le joueur
ait relu la partie ou non, exactement comme `flaggedLoss`. Sur la base du demandeur, **77 parties
sont analysées et 3 lectures sont scellées** — mettre le compte dans la seule `Confrontation`
ferait voir 3 parties au futur agrégat au lieu de 77. C'est ce qu'ADR-0017 demande déjà :
l'agrégat est le pli des enregistrements **par partie**.

Un compte de fautes adverses ajouté à `countedErrors` serait **exactement** la contamination
qu'ADR-0034 existe pour empêcher.

La réconciliation de `review/report.ts`, qui recalcule déjà le récap et vérifie qu'il s'accorde,
doit couvrir le nouveau bloc — sinon il dérive en silence.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `GameRecap` porte un bloc d'`Opportunity`s : total + ventilation par gravité
- [ ] `playerMoves`, `countedMoves`, `flaggedMoves`, `countedErrors`, `excluded`,
      `flaggedUncounted`, `chancesLost`, `flaggedLoss`, `drift` sont **inchangés** sur la même
      entrée — test de non-régression ancré sur des `Evaluation`s fabriquées
- [ ] L'invariant `flaggedLoss + drift === chancesLost` tient toujours
- [ ] La somme de la ventilation par gravité égale le total — vérifié par le test, pas par l'œil
- [ ] Le rapport de revue réconcilie le nouveau bloc et **échoue** si les deux calculs divergent
- [ ] Le récap est cohérent avec ce que la tranche 01 met sur les annotations : même source, pas un
      second calcul
- [ ] Aucune persistance, aucune migration

### Feature Path (FP)

1. Ouvrir une partie analysée en mode `detailed` sur `/analyse/:id` → le récap s'affiche, ses
   chiffres joueur strictement identiques à avant
2. Sonder l'API de récap de cette partie → le bloc d'`Opportunity`s est présent, ventilé, et sa
   somme correspond au total
3. Recalculer soi-même le compte à la main depuis les annotations de la même partie (compter les
   plis adverses portant une `Opportunity`) → le chiffre du récap est le même

Verify: l'étape 3 est la vraie : **recalculer soi-même** plutôt que relire le chiffre de l'app.
