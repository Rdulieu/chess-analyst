# 05 — Les moments clés coup par coup

**What to build:** la seconde lecture d'une `Confrontation` — *ai-je regardé au bon endroit* — cesse
d'être un taux sans coups. Une **seconde cartouche**, préfixée du glyphe `◆` (celui que la liste des
coups emploie déjà), dit au coup courant ce que les `Key moment`s du joueur ont valu là :

| Situation | Couleur | Libellé |
|---|---|---|
| Marqué, et le coup a coûté des chances | vert | ◆ Moment clé trouvé |
| Marqué, rien coûté, une faute existe ailleurs | jaune | ◆ Marqueur à côté |
| Marqué, rien coûté, aucune faute dans la partie | gris | ◆ Marqueur sans cible |
| Marqué, mais coup de l'adversaire | gris | ◆ Marqueur sur l'adversaire |
| Marqué, mais coup non compté | gris | ◆ Marqueur sur un coup non compté |
| Non marqué, et le coup a coûté des chances | rouge | ◆ Moment clé manqué |
| Ni marqueur ni perte | — | *(pas de cartouche)* |

**Le cas rouge est neuf.** « Vos marqueurs ont trouvé 30 % des dégâts » n'avait aucun coup à montrer
pour les 70 % restants : la dérivation ne portait que les marqueurs qui n'ont rien trouvé, jamais
les pertes qu'aucun marqueur ne désigne. Elles se dérivent des **mêmes données** — les fautes
comptées et coûteuses, moins celles qui portent un marqueur — et entrent dans le pli d'ADR-0032
comme le reste.

Le glyphe `◆` est ce qui distingue les **deux familles** de cartouches, qui réutilisent les mêmes
couleurs : la couleur dit la qualité, le glyphe dit de quoi on parle, le libellé dit le cas
(ADR-0033). Trois indices, aucun seul.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 03 — Le terme du coup courant.

**Status:** ready-for-agent

- [ ] Les sept situations sont rendues, chacune avec sa couleur et son libellé
- [ ] **Aucune cartouche `◆`** là où il n'y a ni marqueur ni perte
- [ ] Sur un marqueur à côté, le texte nomme le coup coûteux **et** la distance, comme la phrase
      déjà composée aujourd'hui
- [ ] Le cas « Moment clé manqué » entre dans le pli : la somme des dégâts trouvés et manqués
      retombe sur le total déjà servi
- [ ] Les deux familles de cartouches se distinguent **sans la couleur**
- [ ] Le taux de couverture des dégâts est inchangé
- [ ] La `Drift` reste hors du par-coup : elle n'a **aucun coup à montrer**, et le dire reste le
      travail du bloc agrégé

### Feature Path (FP)

1. Aller sur un moment clé qui a trouvé une vraie perte → cartouche `◆` verte
2. Aller sur un marqueur posé à côté → `◆` jaune, et une phrase nommant le coup coûteux et sa
   distance
3. Aller sur une perte que je n'avais pas marquée → `◆` rouge « Moment clé manqué »
4. Aller sur un marqueur posé sur un coup de l'adversaire → `◆` gris
5. Parcourir un coup ordinaire → aucune cartouche `◆`
6. Lire le bloc des moments clés en bas → son taux est inchangé

Verify: par l'interface.
