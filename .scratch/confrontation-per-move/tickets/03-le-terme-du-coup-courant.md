# 03 — Le terme du coup courant

**What to build:** sur chaque coup, le joueur lit **ce que sa lecture a valu là**, dans une
cartouche titrée à côté de l'échiquier — `Bonne lecture`, `Sous-lecture`, `Sur-lecture` — avec un
texte explicatif dessous et la note qu'il avait écrite sur ce coup.

Et, dessous, la décision qui rend cet écran honnête : **la confrontation d'une partie produit la
lecture de chaque coup, et ses chiffres sont la somme de cette liste** (ADR-0032). La dérivation
cessait de conserver ce qu'elle calculait — elle incrémentait des compteurs et jetait la paire. Elle
ne la jette plus, et l'agrégat devient un pli sur ce qu'elle garde. Rien de neuf n'est parcouru,
aucune table n'est ajoutée : le par-coup est **dérivé**, jamais stocké.

**Libellés, paramétrés par le cas** (sans légende : le libellé est la seule explication) —

| Cas | Couleur | Libellé |
|---|---|---|
| Accord, `Sound` contre « rien signalé » compris | vert | Bonne lecture |
| Rien dit / `Sound`, le moteur signale | rouge | Bévue ratée · Erreur ratée · Imprécision ratée |
| Bande déclarée plus douce que mesurée | rouge | Bévue sous-estimée · Erreur sous-estimée |
| Bande déclarée, le moteur ne signale rien | jaune | Fausse alerte |
| Bande déclarée plus dure que mesurée | jaune | Bévue surestimée · Erreur surestimée |

Les cas non scorés (gris) sont la tranche **04**.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 02 — L'échiquier sur la route de confrontation.

**Status:** ready-for-agent

- [ ] La confrontation d'une partie porte la lecture de **chaque** coup du joueur : son ply, sa
      notation, son verdict déclaré, le label mesuré, et son terme
- [ ] **La matrice, `examined`, `scorable` et `agreed` sont la somme de cette liste** — un test
      additionne la liste et retombe exactement sur les chiffres servis
- [ ] **Aucun chiffre ne bouge** : le test qui rejoue la vraie lecture scellée rend les mêmes
      totaux à l'unité près. Une divergence d'une unité est un **bug**, pas une amélioration
- [ ] L'écart de bande est une `Sous-lecture` ou une `Sur-lecture` selon son sens : **aucune fenêtre
      de tolérance**, l'égalité stricte de la comparaison n'est pas touchée
- [ ] La cartouche du coup courant affiche la bonne couleur **et** le libellé exact du cas
- [ ] Le libellé nomme la gravité concernée, et distingue « ratée » de « sous-estimée »
- [ ] La couleur n'est jamais le seul indice (ADR-0013) : le libellé se lit seul
- [ ] Le texte sous la cartouche explique le coup, et rend la note écrite quand il y en a une
- [ ] La cartouche et le texte sont **sous** les contrôles de pas, qui ne bougent pas (ADR-0021)
- [ ] Aucun changement de schéma, aucune migration
- [ ] La route corpus (« Mes lectures ») ne change pas de contrat

### Feature Path (FP)

1. Aller sur un coup où j'avais vu juste → cartouche verte « Bonne lecture »
2. Aller sur une faute que je n'avais pas vue → cartouche rouge nommant la gravité ratée
3. Aller sur un coup où j'avais crié à l'erreur pour rien → cartouche jaune « Fausse alerte »
4. Aller sur un coup jugé plus doux que mesuré → cartouche rouge « … sous-estimée », **pas**
   « … ratée »
5. Aller sur un coup jugé plus dur que mesuré → cartouche jaune « … surestimée »
6. Lire un coup portant une note → la note écrite s'affiche sous la cartouche
7. Lire les taux et la matrice en bas → inchangés par rapport à avant la tranche

Verify: par l'interface. La non-régression des chiffres se lit à l'écran ; les tests unitaires
tiennent l'égalité somme/agrégat.
