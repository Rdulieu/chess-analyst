# 02 — L'échiquier sur la route de confrontation

**What to build:** la route de confrontation d'une partie gagne un **échiquier parcourable**, tenu
exactement comme celui de la page `Analyse` : contrôles de pas, raccourcis clavier, liste des coups,
courbe d'évaluation, barre de chances de gain, ruban de `Phase`s. La case d'arrivée du coup courant
porte la teinte du verdict **du joueur** — un échiquier, un auteur (ADR-0022, ADR-0033).

Aucune donnée par coup n'est encore produite : cette tranche pose le plateau et sa navigation.

L'écran compose le composant d'échiquier **directement**, via les seams qu'il expose déjà (table de
teintes, marques de la liste des coups, slot de contrôles). Il ne passe **pas** par la composition
de la route de revue, qui porte le `Review mode` et le « Sans aide » d'US-28 — sans objet une fois
le sceau tombé.

Implémenté sur la branche d'intégration `integration/US-26-confrontation-per-move`.

**Blocked by:** 01 — La fixture semée.

**Status:** ready-for-agent

- [ ] L'échiquier est présent sur la route de confrontation d'une partie lue et analysée
- [ ] On avance et recule coup par coup, au clavier comme à la souris, avec les mêmes touches que
      la page `Analyse`
- [ ] La liste des coups est là, numérotée, et le coup courant y est repérable
- [ ] La case d'arrivée porte la teinte du `Declared severity` du **joueur**, jamais celle du moteur
- [ ] La courbe, la barre de chances et le ruban de `Phase`s sont rendus
- [ ] **Les contrôles de pas ne bougent d'aucun pixel** en parcourant les plies (ADR-0021), vérifié
      par l'assertion existante du `theme-pass`
- [ ] Aucun `Review mode` sur cet écran : tout est révélé, le sceau est tombé
- [ ] Les deux refus nommés (`not-sealed`, `not-analyzed`) et le cloisonnement par `Profile`
      restent inchangés
- [ ] L'écran tient en thème clair et en thème sombre
- [ ] Aucun chiffre affiché ne change

### Feature Path (FP)

1. Ouvrir la confrontation de la partie semée → un échiquier est là, à la position de départ
2. Avancer de plusieurs coups au clavier → la position suit et le coup courant est nommé
3. Atteindre un coup que j'avais jugé → la case d'arrivée porte la teinte de **mon** verdict
4. Cliquer un coup dans la liste → l'échiquier s'y rend
5. Parcourir dix coups d'affilée → les contrôles n'ont pas bougé
6. Lire les taux → ils sont identiques à avant la tranche

Verify: par l'interface. Pas de sondage de la base.
