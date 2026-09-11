# 07 — De la matrice au coup

**What to build:** la matrice de confusion cesse d'être un cul-de-sac. **Chaque cellule déplie ses
coups** — repliée par défaut — et cliquer l'un d'eux **focalise l'échiquier** dessus.

C'est le manque exact du retour du 25/08 : un joueur qui lit « 1 sur 4 » ne peut pas retrouver les
trois autres. Ce n'est pas une commodité de navigation, c'est **la preuve** que la vue par coup et
l'agrégat sont le même calcul (ADR-0032) : les coups dépliés *sont* ce qui a rempli la cellule.

La liste dépliée est un **raccourci vers le plateau**, jamais une seconde lecture : elle ne
réintroduit pas la liste que la tranche 04 a retirée, parce qu'elle est repliée par défaut et
ouverte à la demande. La matrice étant le dernier bloc du panneau, le dépliage ne déplace rien
au-dessus (ADR-0021 tenu par la position).

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 03 — Le terme du coup courant.

**Status:** ready-for-agent

- [ ] Toute cellule non vide est dépliable, et **repliée par défaut**
- [ ] Le nombre de coups dépliés est **exactement** celui que la cellule annonce
- [ ] Chaque coup déplié est nommé par sa notation, pas seulement par son numéro
- [ ] Cliquer un coup déplié amène l'échiquier sur ce coup
- [ ] La cartouche affichée après le saut correspond bien à la cellule d'où l'on vient
- [ ] Le dépliage ne déplace **rien** au-dessus de la matrice
- [ ] Une cellule vide ne se déplie pas et ne prétend pas le contraire
- [ ] Le dispositif est actionnable au clavier et annonce son état ouvert/fermé

### Feature Path (FP)

1. Lire une cellule qui annonce plusieurs coups → elle se signale comme dépliable
2. La déplier → les coups annoncés sont listés, en nombre exact
3. Cliquer l'un d'eux → l'échiquier saute à ce coup
4. Lire la cartouche du coup atteint → elle correspond à la cellule d'où l'on vient
5. Revenir à la matrice et déplier une autre cellule → rien n'a bougé au-dessus d'elle
6. Recommencer au clavier seul → le dépliage et le saut fonctionnent

Verify: par l'interface.
