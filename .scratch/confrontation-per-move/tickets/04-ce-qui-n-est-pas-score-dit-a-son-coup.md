# 04 — Ce qui n'est pas scoré, dit à son coup

**What to build:** les coups qu'une `Confrontation` ne score pas cessent d'être une liste au bas de
l'écran et sont **dits à leur coup**, dans une cartouche grise qui **nomme son cas**. Cinq
situations, une seule couleur, cinq libellés :

| Situation | Libellé |
|---|---|
| Coup forcé | Coup forcé — non compté |
| Position déjà décidée | Position déjà décidée — non comptée |
| Coup de l'adversaire | Coup de l'adversaire |
| Verdict `Good` | Correct — rien à comparer |
| Aucun verdict posé | Rien dit |

C'est ce qui règle le volume signalé au retour du 25/08 (« la liste des éva sur position déjà
décidée prend beaucoup de place ») **sans toucher à ADR-0017** : la règle exigeait la lisibilité,
pas une énumération. Dit à son coup, chaque exclu n'occupe plus de place nulle part.

Un gris muet type « NA » est **interdit** : il effacerait le cas qui règle tout le dénominateur — un
coup forcé mesuré `Bévue` où le joueur a dit `Sound` et où il a **raison**.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 03 — Le terme du coup courant.

**Status:** ready-for-agent

- [ ] Chacun des cinq cas affiche sa cartouche grise avec **son** libellé
- [ ] Aucun de ces coups ne porte de terme de lecture : ils ne sont ni `Bonne lecture`, ni
      `Sous-lecture`, ni `Sur-lecture`
- [ ] Sur un coup forcé où le joueur avait dit `Sound`, **rien ne suggère qu'il a eu tort**
- [ ] Le silence (« Rien dit ») et le verdict `Good` restent **distincts** — la teinte de la case
      et le libellé les séparent, la teinte jamais seule
- [ ] La liste des coups exclus disparaît de l'écran
- [ ] Les chiffres et la matrice sont inchangés : cette tranche déplace un rendu, pas une règle
- [ ] Le raisonnement d'ADR-0017 reste servi — l'écart entre coups joués et coups comptés reste
      lisible, coup par coup plutôt qu'en bloc

### Feature Path (FP)

1. Aller sur le coup forcé où j'avais dit `Sound` → cartouche grise « Coup forcé — non compté », et
   rien ne me dit que j'ai eu tort
2. Aller sur un coup joué en position déjà décidée → gris « Position déjà décidée — non comptée »
3. Aller sur un coup de l'adversaire que j'avais jugé → gris « Coup de l'adversaire »
4. Aller sur un coup où j'avais dit `Good` → gris « Correct — rien à comparer »
5. Aller sur un coup où je n'ai rien dit → gris « Rien dit »
6. Parcourir l'écran entier → plus aucune liste de coups exclus
7. Lire les taux → inchangés

Verify: par l'interface.
