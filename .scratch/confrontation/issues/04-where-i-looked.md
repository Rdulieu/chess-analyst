Status: `ready-for-agent`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

La deuxième lecture de la `Confrontation` : **où le joueur a regardé**. Ses `Key moment`s contre la
**part des dégâts** qu'ils trouvent.

- **Une seule division, dans la monnaie déjà utilisée partout ici** : les chances de gain perdues par
  les coups flagués que les `Key moment`s désignent, sur celles perdues par **tous** les coups
  flagués et comptés du joueur. Pas de nouvelle échelle, pas de nouveau seuil.
- **Le dénominateur existe déjà** — c'est la part flaguée du recap par partie, déjà calculée et déjà
  testée. **Pas de seconde implémentation** : deux implémentations d'une méthode ne s'accordent que
  par chance, et divergent en silence.
- **Contre les coups fautifs du joueur, jamais contre le plus gros écart de la partie** — celui-ci
  peut très bien être la bévue de l'**adversaire**, et le joueur serait fautif d'avoir manqué un
  cadeau.
- **Crédit partiel par construction** : désigner la pire faute rapporte beaucoup, une petite peu, un
  coup qui n'a rien coûté zéro. C'est ce qui rend les `Key moment`s **multiples** sans règle
  spéciale : un coup compte **une fois**, donc multiplier les marqueurs ne peut pas gonfler le score
  au-delà de ce qu'ils nomment réellement.
- **Le `Drift` est hors du dénominateur, et rapporté à côté.** Hors, parce qu'il **n'a aucun coup à
  désigner** : l'y mettre placerait 100 % hors d'atteinte d'une lecture parfaite. À côté, parce que
  c'est là qu'il enseigne le plus — « vous cherchiez une faute, il n'y en avait pas : cette partie
  s'est perdue en saignant ».
- **Aucune fenêtre de tolérance.** Un marqueur à un coup de la perte n'est **pas** crédité
  approximativement : la **distance est affichée** — « votre marqueur est sur 21.Rd1, qui n'a rien
  coûté ; la perte est sur 22.Nxe5, un coup plus loin ». Ça dit plus qu'un crédit partiel silencieux,
  et ça garde le calcul **additif et sans constante magique**.
- **Dénominateur nul → pas de score, pas un zéro.** Là où le joueur n'a flagué aucune faute, un zéro
  ferait passer une lecture saine pour une lecture ratée. L'absence de score est un **état affiché**,
  avec sa phrase, et le `Drift` à côté.
- Cette figure ne se fond **jamais** avec celles de la tranche 01. **Leur désaccord est le
  diagnostic** : fort ici et faible là veut dire que le joueur voit *où* une partie tourne mais ne
  sait pas encore nommer *ce qui* s'y passe — et « mes forces et mes faiblesses **en analyse** » est
  au pluriel exprès.

## Acceptance criteria

- [ ] La part des dégâts trouvée est affichée avec son numérateur et son dénominateur, pas seulement en taux
- [ ] Le dénominateur est la perte des coups **flagués et comptés du joueur**, et provient du calcul par partie existant — pas d'une seconde implémentation
- [ ] Un `Key moment` sur une bévue de l'**adversaire** n'entre pas au dénominateur
- [ ] Plusieurs `Key moment`s sur le même coup ne comptent qu'**une fois**
- [ ] Désigner la pire faute rapporte plus que désigner une petite
- [ ] Un `Key moment` sur un coup qui n'a rien coûté rapporte **zéro** et déclenche l'affichage de la **distance** au coup fautif
- [ ] La distance affichée nomme les deux coups et l'écart entre eux
- [ ] Aucun crédit n'est accordé par proximité ; aucune constante de tolérance n'existe dans le code
- [ ] Le `Drift` est affiché **à côté** de la figure et **absent** du dénominateur
- [ ] Une partie sans aucun coup flagué du joueur affiche **pas de score** — jamais `0 %` — avec sa phrase et le `Drift`
- [ ] Cette figure n'est jamais fondue avec la couverture ni la justesse
- [ ] Aucun score composite n'apparaît
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique

### Feature Path (FP)

1. Sur une partie analysée où j'ai plusieurs coups fautifs, je pose un `Key moment` sur ma pire faute et un autre sur un coup qui n'a rien coûté. Je scelle.
2. J'ouvre la confrontation → je lis la part des dégâts trouvée, avec son numérateur et son dénominateur.
3. Je vérifie le marqueur mal placé → il rapporte zéro, et l'app me montre **la distance** au vrai coup fautif, en nommant les deux coups.
4. Je regarde le `Drift` → il est affiché à côté, et il n'est pas dans le dénominateur.
5. Je pose un second `Key moment` sur le **même** coup que le premier → la part trouvée ne bouge pas.
6. J'ouvre la confrontation d'une partie que j'ai lue sans flaguer aucune faute → **pas de score**, une phrase qui l'explique, et le `Drift` à côté.
7. Je regarde l'écran entier → la part des dégâts et la justesse sont deux figures séparées, jamais additionnées.

Verify: UI first.

## Blocked by

- `.scratch/confrontation/issues/01-a-confrontation-exists.md`
