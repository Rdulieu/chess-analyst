# 02 — Les dégâts par phase, sur une partie

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** le joueur ouvre une partie analysée et voit **où** elle s'est jouée — ses chances
perdues réparties entre début, milieu et finale, sans avoir à sommer à la main. C'est le calcul qui
a produit la conclusion utile du rapport sur la 715, et que l'app ne faisait pas.

**Blocked by:** 01 — sinon la répartition naît sur la frontière cassée et change ensuite.

**Status:** ready-for-agent

- [ ] Le récapitulatif par partie porte la répartition des chances perdues par `Phase`.
- [ ] Chaque phase distingue `flaggedLoss` (lâché d'un coup) de `drift` (saigné) — deux leçons
      opposées qu'un total refondrait.
- [ ] L'identité `flaggedLoss + drift = chancesLost` tient **par phase**, et la somme des phases
      redonne le total déjà affiché par le récapitulatif.
- [ ] Le nombre de `Counted Move`s fautifs est réparti de la même façon.
- [ ] Les `Opportunity` sont réparties **dans leur propre colonne** et **jamais additionnées** aux
      dégâts du joueur (ADR-0034).
- [ ] Une phase que la partie n'a **jamais atteinte** est **nommée non atteinte**, jamais rendue
      `0` — 19 des 78 parties analysées n'ont pas de finale, et un zéro y afficherait une **fausse
      force**. Même discipline que « pas de score, pas un zéro » des `Key moment`s.
- [ ] Le bloc se range **sous les contrôles** de la route de revue : rien de ce sur quoi le joueur
      agit ne se déplace quand il apparaît (ADR-0021).
- [ ] Aucun indice uniquement chromatique (ADR-0013).
- [ ] Aucun changement de schéma, aucune migration.

### Feature Path (FP)

1. Ouvrir la partie **715** → sous le récapitulatif, la répartition des chances perdues par phase.
2. Additionner les trois phases → on retrouve le total que le récapitulatif affichait déjà.
3. Lire une phase → elle distingue ce qui a été lâché d'un coup de ce qui a été saigné.
4. Lire la colonne des occasions adverses → elle est à part, et n'entre pas dans le total du joueur.
5. Ouvrir la partie **2429** → la finale est annoncée **non atteinte**, et non pas à zéro.

Verify: par le bloc sous le récapitulatif de la route de revue.
