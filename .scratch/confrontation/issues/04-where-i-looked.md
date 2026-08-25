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

## Comments

**FP du 2026-08-25** — 7/7 sur le fond, avec **un finding bloquant sur la forme**, corrigé dans la
tranche avant le merge.

**Le bloquant** : la distance affichait « votre marqueur est sur **23.**, la perte est sur **25.** »
— un numéro de coup sans notation, là où le critère exige de **nommer** les deux coups. Le texte se
lisait comme tronqué, et devenait franchement **ambigu quand les deux plies tombent dans le même
numéro de coup** : « 25… » contre « 25. », deux chaînes presque identiques pour deux coups
différents. Corrigé en faisant porter le **SAN** par la distance, côté serveur — l'enregistrement doit
être suffisant à lui seul (ADR-0017). Les notations sont lues sur le PGN de **cette** partie, jamais
sur le corpus : la leçon d'US-10b (3111 ms → 55 ms) portait sur le rejeu à l'échelle de l'historique,
et une confrontation est une partie. Le champ est **optionnel** : aucune figure n'en dépend, et un
numéro de coup reste une phrase vraie, seulement plus pauvre.

Deux autres fautes réelles corrigées au passage : « **Vos moment clé** sont confrontés » au singulier,
et des **backticks markdown qui fuyaient littéralement dans l'UI** (« le \`Drift\` »). Les trois sont
verrouillées par des tests.

**Mise en page** : « Où j'ai regardé » porte bien plus de prose que les deux taux (sa valeur, sa note,
le `Drift`, chaque distance) et se retrouvait seule sur une deuxième ligne avec une demi-colonne vide
à sa droite. Elle occupe désormais toute la largeur — la portée suit le poids du contenu, pas un point
de rupture dessiné.

**Ce que la FP a mesuré** : 78 % des dégâts trouvés (86 sur 110 points) en désignant la pire faute,
contre **22 %** en désignant la petite — le crédit partiel tient. Un `Key moment` sur une bévue de
l'adversaire rapporte 0 sans changer le dénominateur. Un marqueur à **un demi-coup** de la perte
rapporte **zéro** : aucune fenêtre de tolérance. Le dénominateur affiché est bien 110 (la perte
flaguée) et non 158 (la perte totale) — le `Drift` est dehors et à côté.

**Limite du jeu de données, à nouveau** : la partie 271 n'a qu'**un seul** coup flagué, donc le crédit
partiel n'est pas montrable dessus. Le testeur a fabriqué une seconde faute sur sa copie en ajustant
un `cp` (la sévérité et le coût sont **dérivés**, rien n'est persisté — ADR-0009), plus quatre clones
pour les cas restants. C'est **dit** plutôt que masqué.

**Une question laissée au demandeur** : le compteur de la route de lecture annonce « 4 moments clés
posés sur cette partie » là où la confrontation en compte **2** — le premier additionne la couche
scellée et la couche postérieure, la seconde ne confronte que la scellée. Les deux sont corrects dans
leur registre (l'un mesure l'avancement de la saisie, l'autre ce qui est confronté), mais l'écart peut
surprendre. Hérité d'US-16a, hors périmètre ici.

**Re-vérification sur l'app après correction** — les quatre points verts, le bloquant levé. Le cas qui
le motivait — deux plies dans le même numéro de coup — affiche désormais « **25…cxd6** » contre
« **25.exd6** », deux libellés distincts et retrouvables sur l'échiquier. Les chiffres n'ont pas bougé
(78 % — 86/110, 22 %, 0 %, « Pas de score », bloc absent) : la correction n'a touché que du texte et
de la mise en page.

**Une incohérence créée par la correction elle-même, corrigée dans la foulée** : nommer les coups dans
la distance a rendu criant que la couche postérieure et les coups non comptés, eux, ne les nommaient
toujours pas — « 11. » trois lignes sous « 23.d4 », sur le même écran. La cause était un `moveName`
**dupliqué dans deux composants** : l'un a appris les notations, l'autre non, et rien ne les tenait
ensemble. Extrait dans un module unique, et les deux autres listes portent maintenant leur notation.
Un test du fold asserte que l'enregistrement **nomme tout ce qu'il liste**, pas seulement la distance.

**Un repli non vérifiable par l'UI, dit comme tel** : `notation: null` n'a aucun chemin d'application
qui le produise (la route remplit toujours les notations depuis le PGN). Il est couvert par les tests
du fold et du composant, et le testeur l'a signalé comme lecture de code plutôt que comme observation
— c'est la bonne façon de le rapporter.
