# 03 — La `Material signature` et les dégâts par configuration, sur une partie

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** le joueur ouvre une partie allée en finale et voit **quelles configurations de
pièces** elle a traversées, et ce que chacune lui a coûté. C'est la vue qui nomme toute seule « deux
tours contre une dame » — ce que le rapport sur la 715 a dû lire dans le PGN à la main, et que le
joueur avait deviné en aveugle.

**Blocked by:** 02 — elles étendent le même récapitulatif et le même bloc d'écran. La dépendance est
de **collision**, pas de logique : la signature ne lit que les demi-coups de finale, et 01 ne touche
pas la frontière de finale.

**Status:** ready-for-agent

- [ ] Une `Material signature` est les **majeures et mineures restantes de chaque camp**, celles du
      joueur puis celles de l'adversaire : `RRB vs RRN`, `RR vs Q`, `R vs —`. Pions et rois exclus.
- [ ] **Ordre canonique `Q R B N`** dans chaque camp — une configuration a une écriture et une
      seule. Un camp vide s'écrit `—`.
- [ ] Elle est relevée **à chaque demi-coup**, jamais une fois par partie : `RR vs Q` apparaît dans
      **0** partie en instantané à la frontière et dans **9** au demi-coup (ADR-0036).
- [ ] Une **promotion** rajoute une majeure et la signature suit.
- [ ] Elle n'est lue que sur les demi-coups de **finale** — décision de périmètre, pas propriété du
      terme.
- [ ] Le récapitulatif porte les chances perdues **dans chaque configuration traversée**.
- [ ] Le terme reste **distinct** du `material` de la revue, qui n'est pas touché (ADR-0036).
- [ ] Une partie sans finale n'a **aucune** configuration, et l'écran le dit.
- [ ] Aucun changement de schéma, aucune migration.

### Feature Path (FP)

1. Ouvrir la partie **715** → la suite des configurations de finale traversées, chacune avec les
   chances qu'elle a coûtées.
2. Lire cette suite → **`RR vs Q`** y figure nommément, et porte la plus grosse part des dégâts de
   finale.
3. Ouvrir la partie **2429** → aucune configuration n'est listée, et l'écran le dit plutôt que de
   laisser un bloc vide.

Verify: par le bloc sous le récapitulatif de la route de revue.
