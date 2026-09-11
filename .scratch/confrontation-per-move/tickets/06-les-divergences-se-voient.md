# 06 — Les divergences se voient sans parcourir soixante coups

**What to build:** deux dispositifs pour repérer les divergences d'un coup d'œil, sans avancer coup
après coup.

**La courbe d'évaluation porte les glyphes de désaccord — et rien d'autre.** Deux glyphes de
**forme** distincte, un par sens : `Sous-lecture` d'un côté, `Sur-lecture` de l'autre. C'est la
direction du biais rendue visible sur l'axe de la partie — sur-lire le danger et le sous-lire sont
deux fautes opposées qu'aucun taux ne sépare. Les glyphes de sévérité du moteur n'y sont pas : la
courbe porte déjà la lecture du moteur par sa forme, et les y remettre noierait les divergences.

**La liste des coups montre les deux auteurs, en deux colonnes titrées** — « Ma lecture » et « Le
moteur » — plus le glyphe de désaccord. C'est le seul endroit de l'écran où les deux auteurs
coexistent légitimement : une liste a des colonnes, une case n'en a pas (ADR-0022). Le glyphe seul
n'y suffirait pas — il est par construction identique des deux côtés —, d'où les titres.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 03 — Le terme du coup courant.

**Status:** ready-for-agent

- [ ] La courbe ne porte que les divergences, jamais les sévérités du moteur
- [ ] Les deux sens de divergence ont deux **formes** distinctes, lisibles sans la couleur
- [ ] La liste des coups porte deux colonnes **titrées**, une par auteur
- [ ] Le glyphe de désaccord figure aussi dans la liste
- [ ] La courbe **situe** les divergences et n'en juge aucune : rien n'y suggère qui a tort
- [ ] Les dispositifs déjà présents sur la courbe (ruban de `Phase`s, coup courant) sont conservés
- [ ] L'ensemble tient en thème clair et sombre, et la densité de l'écran reste dans les garde-fous
      déjà outillés

### Feature Path (FP)

1. Ouvrir la confrontation → la courbe montre une poignée de marques, pas une par coup
2. Repérer une marque et s'y rendre → c'est bien une divergence, et sa cartouche le confirme
3. Comparer deux divergences de sens opposés → leurs marques ont des formes différentes
4. Parcourir la liste des coups → deux colonnes titrées, mon verdict d'un côté, le moteur de l'autre
5. Trouver dans la liste un coup où les deux colonnes diffèrent → il porte le glyphe de désaccord

Verify: par l'interface.
