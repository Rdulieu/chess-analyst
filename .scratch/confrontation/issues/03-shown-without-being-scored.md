Status: `done`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Tout ce que la confrontation **montre sans le noter** — et qui, non montré, ferait passer un écart
correct pour un bug.

- **Les coups non comptés, avec leur raison** (`forced` / `decided`), jamais fondues en un « non
  compté » unique. C'est l'exigence d'ADR-0017 portée jusqu'à l'écran : une partie où le joueur a
  joué quatre `Blunder`s peut légitimement contribuer **zéro** erreur comptée, et un écran qui ne
  rend pas cet écart **lisible** détruit la confiance exactement là où la divergence est la chose à
  expliquer.
- **Le cas qui tient la story** : un coup **forcé** catastrophique mesure une `Blunder` sans être la
  faute de personne. Un joueur qui le déclare `Sound` **a raison**, et une matrice naïve le
  compterait faux. C'est la raison pour laquelle le dénominateur est sur les `Counted Move`s (déjà
  posé en tranche 01) — cette tranche le rend **visible** : le coup est montré, sa raison
  d'exclusion aussi, et le verdict du joueur dessus n'est pas noté.
  > **À revérifier à l'usage** : le demandeur a accepté ce point en le jugeant « un peu compliqué ».
  > Si la complexité ne paye pas, c'est ici qu'on rouvre — pas ailleurs.
- **Les `Good`** : montrés, comptés, **jamais notés**. Le moteur ne flague que les coups fautifs et
  n'a **aucune bande pour le mérite**, donc il n'y a rien à opposer. Conséquence à respecter à la
  lettre, dans les deux sens : un `Good` **compte dans la couverture** (le joueur a bien regardé) et
  **sort du dénominateur de la justesse** (il n'y a ni juste ni faux). Le fondre dans l'un ou
  l'autre serait faux.
- **Les verdicts sur les coups adverses** : conservés, montrés, **jamais notés** — non par manque de
  moyens (les `Evaluation`s sont là) mais **par décision**, parce que cet outil est sur le progrès
  du joueur.
- **La couche postérieure au scellement** : visible, **marquée comme telle**, et hors confrontation.
  Voir le moteur et comprendre pourquoi est le moment le plus fertile de l'exercice — l'interdire
  serait absurde, le compter serait malhonnête. L'exclusion du calcul est déjà faite en tranche 01 ;
  cette tranche l'**affiche** et la nomme.
- Chacune de ces catégories porte **son compte et sa raison en clair**. Un chiffre montré sans dire
  pourquoi il ne compte pas est pire que pas de chiffre.
- Toujours **aucun score** ajouté, et le vocabulaire de **divergence** tenu.

## Acceptance criteria

- [ ] Les coups **non comptés** du joueur sont affichés avec leur raison, `forced` et `decided` **distinguées**
- [ ] Un coup forcé mesuré `Blunder` et déclaré `Sound` par le joueur n'est **pas compté faux**, et l'écran dit pourquoi il n'est pas noté
- [ ] Les `Good` sont affichés et comptés à part, avec la raison de leur non-notation
- [ ] Un `Good` **compte** dans la couverture
- [ ] Un `Good` **ne compte pas** dans le dénominateur de la justesse
- [ ] Les verdicts sur les coups **adverses** sont affichés, comptés à part, et l'écran dit qu'ils ne sont pas notés — et pourquoi
- [ ] Les marques **postérieures** au scellement sont affichées et **visiblement distinguées** de la couche scellée
- [ ] Aucune marque postérieure n'entre dans une figure de la confrontation
- [ ] L'écart entre ce que la partie montre et ce sur quoi le joueur est jugé est lisible sans calcul mental
- [ ] Aucun score nouveau n'apparaît
- [ ] Aucune de ces catégories n'est nommée « erreur »
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique

### Feature Path (FP)

1. Sur une partie analysée, je pose `Sound` sur un de mes coups **forcé** que le moteur mesure `Blunder`, un `Good` sur un autre de mes coups, et un `Mistake` sur un coup **adverse**. Je scelle.
2. J'écris ensuite une note et un verdict de plus, **après le scellement**.
3. J'ouvre la confrontation → mon `Sound` sur le coup forcé n'est **pas** compté faux, et l'écran dit que ce coup n'est pas compté parce qu'il était forcé.
4. Je regarde les coups non comptés → « forcé » et « déjà décidée » sont deux catégories distinctes, chacune avec son compte.
5. Je regarde mon `Good` → il est là, compté à part, et l'écran dit pourquoi il n'est pas noté ; il apparaît bien dans ma couverture et pas dans ma justesse.
6. Je regarde mon verdict sur le coup adverse → il est là, non noté, avec sa raison.
7. Je cherche ce que j'ai écrit après le scellement → c'est visible, marqué comme postérieur, et aucune figure n'a bougé à cause de lui.

Verify: UI first.

## Blocked by

- `.scratch/confrontation/issues/01-a-confrontation-exists.md`

## Comments

**FP passée le 2026-08-25** — 7/7 vertes, aucun finding bloquant. Quatre rubriques distinctes, chacune
avec son compte dans son titre et sa raison en clair ; le `Correct` posé sur un coup **forcé et mesuré
`Blunder`** n'apparaît nulle part dans la matrice ; les figures relevées avant et après l'écriture
postérieure sont **identiques au caractère près**. Le bloc disparaît entièrement quand il n'y a rien à
montrer.

**Un défaut réel trouvé et corrigé dans la tranche** : la matrice était rendue **à l'intérieur de la
grille à deux colonnes des figures**, donc dimensionnée comme une troisième colonne — deux de ses
quatre colonnes passaient derrière une barre de défilement sur une fenêtre de 1400 px, dont celle qui
portait la seule cellule non nulle du scénario. Le commentaire du code disait déjà « sous les figures »
pendant que le code la mettait dedans. Sortie de la grille, et verrouillée par un test structurel.

**Une limite du jeu de données, à ne pas oublier** : la partie 271 — la seule analysée de la base — n'a
**aucun coup exclu** (`forced: 0, decided: 0`). Les étapes 3 et 4 ont donc tourné sur une **fixture
fabriquée** sur la copie du testeur (une FEN à un seul coup légal, un `cp` sous le plancher). Aucune
tranche future ne doit supposer qu'un coup forcé ou déjà décidé existe naturellement dans cette base.

**Une question laissée au demandeur** : les entrées de « Montré, jamais noté » ne sont reliées à leur
coup que par un **numéro en texte** — ni notation SAN, ni lien vers la position. Depuis la
confrontation, retrouver le coup demande d'aller le compter dans la liste. Hors périmètre de cette
tranche ; c'est le même terrain qu'US-22.
