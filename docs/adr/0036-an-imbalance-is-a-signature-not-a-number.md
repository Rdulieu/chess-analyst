# Un déséquilibre est une signature, pas un nombre

Sans ce texte, un agent compétent chargé du volet matériel d'US-32 **promeut le `material` de
`signals.ts`** — US-44 dit en toutes lettres que le travail est « surtout une promotion, pas une
invention », l'identifiant s'appelle `material`, il est déjà calculé, et ni le compilateur, ni les
tests, ni une lecture du code ne s'y opposeraient. L'axe rendrait alors **+1 pion** sur
`RR vs Q` — c'est-à-dire l'équilibre — pour la configuration même qui a fait ouvrir la story : la
finale deux tours contre une dame où le joueur a laissé **81 % des dégâts comptés** de la partie
715, et qu'il avait nommée lui-même en aveugle (« il faut que je travaille 2 rooks VS Queen »).

**Décision : le déséquilibre est une `Material signature`** — les majeures et mineures restantes de
chaque camp, celles du joueur contre celles de l'adversaire — **portée par le demi-coup**, lue sur
les demi-coups de **finale** seulement pour l'instant, et suivie par **deux chiffres jamais
fondus**.

## Les trois mesures qui ont tranché

Toutes sur les 2 438 parties de la base, sans une seconde de moteur.

**1. Aucun scalaire ne peut nommer un déséquilibre de nature.** `RR vs Q` vaut 5 + 5 = 10 contre 9,
soit **+1 pion**, et à peu près zéro centipion dans une position saine. Les deux échelles disent
« égal » pendant que la partie change de nature. C'est ce qui élimine le solde en points **et** les
centipions, pas une préférence.

**2. La signature doit être portée par le demi-coup, pas par la partie.**

| `RR vs Q` | occurrences |
|---|---|
| instantané pris à la frontière de finale | **0 partie** |
| relevé à chaque demi-coup | **9 parties, 90 demi-coups** |

Un instantané manque le cas fondateur de la story, parce qu'un déséquilibre **naît en cours de
partie**. La question « propriété du coup ou de la partie », que le backlog laissait ouverte, est
tranchée par ses propres données.

**3. Les deux monnaies n'ont pas le même corps — d'où le refus de les fondre.**

| | valeur |
|---|---|
| parties atteignant la finale | **1 783 sur 2 438** (73 %) |
| signatures distinctes traversées | **808** — dont 234 vues dans une seule partie |
| signatures vues dans **≥ 30** parties | **56** |
| signatures vues dans ≥ 30 parties **et ≥ 10 analysées** | **0** |

Les `result`s existent sur tout le corpus (1 206 victoires, 1 170 défaites, 62 nulles) : un taux
par configuration est calculable **aujourd'hui** sur 56 configurations. Les `chances lost`, non :
les 78 parties analysées se dispersent sur 808 signatures, et la mieux dotée (`R vs R`) en porte
**huit**. Un chiffre unique de « performance dans cette configuration » mélangerait donc une mesure
solide et une mesure creuse sans que rien ne dise laquelle parle.

C'est la discipline des trois lectures de la `Confrontation`, pour la même raison : un composite
exigerait des poids, et il s'optimiserait.

**4. Et les deux monnaies ne sont pas côte à côte : elles répondent à deux échelles.** Mesuré sur
les parties analysées qui atteignent la finale, une partie traverse **4 signatures** (médiane ; Q3
5, max 8) et **une seule en porte ≥ 50 % des dégâts de finale dans 41 parties sur 47 — 87 %**,
médiane **74 %**. Les chances perdues sont donc une mesure **solide dans une partie** et creuse à
travers le corpus ; les `result`s l'inverse. D'où la règle :

| portée | monnaie |
|---|---|
| **une partie** | les chances perdues par signature |
| **le corpus** | le résultat des parties par signature |

C'est cette vue par partie qui aurait nommé seule la finale deux tours contre une dame de la 715,
que le rapport d'origine a dû lire dans le PGN à la main.

**Échantillon mince : on montre, et on montre le dénominateur.** Une signature entre à partir de
**3 parties** — le demandeur veut voir, et une table qui ne montre que le solide ne montre presque
rien (56 lignes à 30 parties, 461 à 3). Le garde-fou n'est pas le seuil, c'est l'affichage :
**les comptes et le taux, toujours ensemble** — « 1 V – 2 D – 33 % ». À n = 3 un taux vaut ±29
points ; affiché seul il ment, affiché avec son dénominateur il ne peut plus.

## Conséquences

- **Une seconde monnaie entre dans le produit, et ce n'est pas le pli d'ADR-0017.** L'agrégat y est
  défini comme la somme des récapitulatifs par partie, en chances perdues. Un taux de résultat par
  configuration n'est pas ce pli-là et ne doit jamais être présenté comme s'il l'était. US-15c
  héritera de deux objets, pas d'un.
- **L'axe est muet sur 655 parties (27 %)**, celles qui n'atteignent jamais la finale. Muet se dit,
  il ne s'affiche pas en zéro — même règle que le score des `Key moment`s quand le dénominateur est
  nul, et que le `Counted Move` qui porte sa raison.
- **La restriction à la finale est un choix de périmètre**, pris par le demandeur au grill. Hors
  finale la cardinalité monte au-delà des 808 mesurées ici, et il faudrait dire où l'on coupe.
  Le terme, lui, n'a rien qui l'y oblige.
