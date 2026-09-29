# US-32 — Rendre exploitables les axes `Phase` et matériel

Grillée le 2026-09-24. Branche `integration/US-32-phase-and-material`.
Sortie de grill : **ADR-0035** (le découpage en phases est celui de lichess), **ADR-0036** (un
déséquilibre est une signature, pas un nombre), et `CONTEXT.md` — entrées `Phase` et
`Lichess division` amendées, terme **`Material signature`** ajouté. Onze décisions tranchées,
frontière vide.

## Problem Statement

**L'app a la donnée, ou de quoi la dériver, et n'en fait rien.** C'est le même constat sur les deux
axes, et c'est ce qui les réunit dans une seule story.

**Le matériel.** La partie 715 s'est perdue dans une finale **deux tours contre une dame** : **81 %
des dégâts comptés** (159 points de chances sur 197) y sont concentrés, et les quatre pires coups
de la partie y sont tous. Le joueur avait nommé le thème **lui-même, en aveugle**, dans une note
écrite au moment où il commençait à le subir — *« il faut que je travaille 2 rooks VS Queen »*.
L'application ne pouvait ni le confirmer ni le contredire : le déséquilibre a dû être lu dans le
PGN **à la main**, et c'est la conclusion la plus utile du rapport.

**La phase.** `phase` est calculée sur chaque demi-coup, et **agrégée nulle part** : le
récapitulatif ne rend que des totaux (`chancesLost`, `flaggedLoss`, `drift`, `countedErrors`,
`opportunities`). Localiser les dégâts de la 715 a demandé de sommer `chancesLost` par tranche à la
main — et c'est ce calcul, pas le total, qui a produit la conclusion.

**Et la frontière elle-même était fausse.** Mesuré au grill sur les **415 parties** de la base
portant une division lichess : notre découpage s'accordait au leur dans **2,2 %** des cas, avec
**+6 plies** d'écart médian, et notre frontière de début venait du **cap du 15ᵉ coup dans 74,1 %
des parties**. Le critère documenté — « développement achevé » — était la règle **minoritaire** :
« début de partie » voulait dire « les quinze premiers coups », trois fois sur quatre. Agréger par
phase là-dessus aurait donné une répartition **précise et fausse**, et ADR-0017 l'aurait propagée
dans tout l'agrégat d'US-15c.

## Solution

**Un : la frontière est réparée avant d'être exploitée.** Le découpage devient celui de
`Divider.scala` (`lichess-org/scalachess`), réimplémenté chez nous et appliqué à **toutes** les
plateformes (ADR-0035). Transcrit et vérifié : **415/415** d'accord exact avec leur division
stockée.

**Deux : trois relevés, deux échelles, deux monnaies jamais fondues** (ADR-0036).

| relevé | portée | monnaie |
|---|---|---|
| dégâts **par `Phase`** | une partie | chances perdues, scindées `flaggedLoss` / `drift` |
| dégâts **par `Material signature`** | une partie | chances perdues |
| **résultats** par `Material signature` | le corpus | victoires / nulles / défaites |

Le joueur ouvre une partie et voit **où** ses dégâts sont tombés — quelle phase, et dans quelle
configuration de finale. Il ouvre `/stats` et voit **dans quelles configurations il joue et
comment il s'en sort**, sur tout son historique.

**Coût moteur : aucun.** Les deux axes sont dérivés à la lecture (ADR-0009) de FEN déjà stockés.
Aucune colonne, aucune migration (ADR-0015).

## User Stories

1. En tant que joueur, je veux que le découpage en phases de mon app soit celui d'une
   implémentation éprouvée, pour que « en finale » veuille dire la même chose ici et ailleurs.
2. En tant que joueur, je veux que la frontière de début de partie cesse d'être le 15ᵉ coup déguisé
   en critère de développement, pour que ce que l'app m'annonce soit ce qu'elle fait.
3. En tant que joueur, je veux que mes parties chess.com et lichess soient découpées par la même
   règle, pour que deux de mes profils restent comparables.
4. En tant que joueur, je veux voir la répartition de mes chances perdues par `Phase` sur une
   partie, pour savoir où elle s'est jouée sans sommer à la main.
5. En tant que joueur, je veux que cette répartition distingue ce que j'ai **lâché d'un coup**
   (`flaggedLoss`) de ce que j'ai **saigné** (`drift`), parce que « j'ai sauté une pièce en finale »
   et « j'ai saigné en finale » sont deux leçons opposées.
6. En tant que joueur, je veux que le total par phase respecte l'identité
   `flaggedLoss + drift = chancesLost` que le récapitulatif garantit déjà, pour pouvoir vérifier le
   tableau contre le total.
7. En tant que joueur, je veux voir les occasions que l'adversaire m'a offertes réparties par phase
   **dans une colonne à part**, pour savoir s'il me fait des cadeaux en finale.
8. En tant que joueur, je veux que ces occasions ne soient **jamais additionnées** à mes propres
   dégâts, parce que ce sont ses fautes, pas les miennes (ADR-0034).
9. En tant que joueur, je veux qu'une phase que ma partie n'a jamais atteinte soit **nommée non
   atteinte**, pas affichée à zéro, pour qu'une partie sans finale ne me donne pas l'illusion d'y
   être bon.
10. En tant que joueur, je veux savoir quelles **configurations de pièces** ma partie a traversées
    en finale, pour reconnaître « deux tours contre une dame » sans lire le PGN.
11. En tant que joueur, je veux voir les chances que j'ai perdues **dans chacune** de ces
    configurations, pour que celle qui m'a coûté la partie se désigne elle-même.
12. En tant que joueur, je veux que cette configuration soit relevée **à chaque demi-coup**, parce
    qu'un déséquilibre naît en cours de partie et qu'un instantané le rate.
13. En tant que joueur, je veux que la configuration soit écrite comme une **signature** et non
    comme un solde, parce que « deux tours contre une dame » vaut +1 pion et n'est pas l'équilibre.
14. En tant que joueur, je veux retrouver sur `/stats` la liste des configurations de finale que je
    joue, pour savoir quel terrain je fréquente.
15. En tant que joueur, je veux voir mon **résultat** dans chacune — victoires, nulles, défaites —
    pour savoir lesquelles me réussissent.
16. En tant que joueur, je veux voir ce résultat **en comptes et en taux ensemble**
    (« 1 V – 2 D – 33 % »), pour qu'un pourcentage ne me cache jamais son dénominateur.
17. En tant que joueur, je veux qu'une configuration entre dans la table dès **3 parties**, parce
    que je préfère voir beaucoup et juger moi-même que ne voir que le très solide.
18. En tant que joueur, je veux que les configurations sous le seuil soient **comptées et nommées**
    en une ligne, pas effacées, pour savoir ce que la table ne me montre pas.
19. En tant que joueur, je veux que la table soit triée pour que ce qui me coûte remonte, plutôt
    que d'avoir à parcourir des centaines de lignes.
20. En tant que joueur, je veux que la table dise sur combien de parties elle porte et combien
    n'atteignent jamais la finale, pour ne pas croire qu'elle parle de tout mon historique.
21. En tant que joueur, je veux que le relevé par phase se range **sous** les contrôles dont je me
    sers, pour que rien de ce sur quoi j'agis ne bouge quand il apparaît (ADR-0021).
22. En tant que développeur, je veux que le découpage en phases soit couvert par des tests sur de
    vraies parties, pour qu'un changement de règle se voie.
23. En tant que développeur, je veux que la `Material signature` ait un nom distinct du `material`
    de la revue, pour que deux mesures différentes cessent de partager un mot.
24. En tant que développeur, je veux qu'aucune colonne ne soit ajoutée, pour qu'aucune migration ne
    soit due et qu'aucune `Evaluation` ne soit à recalculer (ADR-0015).
25. En tant que développeur, je veux que la répartition soit un **pli** du récapitulatif existant,
    pour qu'US-15c hérite d'un axe et non d'un second système.
26. En tant que joueur, je veux être prévenu que les chiffres de mes lectures déjà scellées
    **changent** avec le nouveau découpage, plutôt que de le découvrir.

## Implementation Decisions

### 1. La `Phase` (ADR-0035)

- **`phases()` adopte la règle de `Divider.scala` en entier.** Milieu de partie à la première
  Position où `majorsAndMinors ≤ 10` **ou** la rangée de fond d'un camp porte **moins de 4** pièces
  **ou** `mixedness > 150`. Finale à la première Position où `majorsAndMinors ≤ 6`.
- **`mixedness` est transcrite fidèlement** : 49 fenêtres 2×2 chevauchantes, un score par couple
  (blanches, noires) pondéré par la bande de rangées, sommé. Position initiale = **0**. La
  transcription est validée par les **415/415**, qui sont le test.
- **Le critère de développement et le cap du 15ᵉ coup sont retirés**, ainsi que `CapReading` — la
  mesure D14 qui justifiait son existence est close (0,3 coup par partie), et le paramètre n'a
  jamais eu de passeur dans l'app.
- **Le latching est conservé** : une partie qui a atteint la finale y reste (une promotion rajoute
  du matériel et la ferait sinon ressortir).
- **La règle vaut pour toutes les plateformes.** La colonne `Lichess division` reste stockée mais
  **ne discrimine plus** : elle s'accorde désormais par construction. Un test qui la lit teste une
  copie, et le dire vaut mieux que de le croire.
- **Une partie peut n'avoir aucun milieu de partie** — 98 sur 2 438, médiane 17 demi-coups — et
  c'est la réponse de lichess (`middle: None`), pas un trou.

### 2. La `Material signature` (ADR-0036)

- **Les majeures et mineures restantes de chaque camp**, celles du joueur puis celles de
  l'adversaire : `RRB vs RRN`, `RR vs Q`, `R vs —`. Pions et rois exclus.
- **Ordre canonique `Q R B N`** dans chaque camp, pour qu'une configuration ait une écriture et une
  seule. Camp vide écrit `—`.
- **Portée par le demi-coup**, jamais par la partie. Mesure qui l'impose : `RR vs Q` apparaît dans
  **0** partie en instantané à la frontière de finale, et dans **9** au demi-coup.
- **Lue sur les demi-coups de finale seulement**, par décision de périmètre. Hors finale la
  cardinalité dépasse les 808 mesurées ici.
- **Distincte du `material` de `signals.ts`**, qui garde son sens (le retard en pions sur un empan
  d'échange) et n'est pas touché.

### 3. Le récapitulatif par partie

- **`gameRecap` gagne deux répartitions**, et reste le seul producteur : ADR-0017 fait de l'agrégat
  la somme des récapitulatifs, donc l'axe doit naître là ou il naîtra deux fois.
- **Par `Phase`** : `chancesLost` scindé en `flaggedLoss` et `drift`, plus `countedErrors`, plus une
  colonne **`Opportunity` à part** — jamais additionnée (ADR-0034).
- **L'identité est préservée par phase** : `flaggedLoss + drift = chancesLost`, et la somme des
  trois phases redonne le total du récapitulatif. C'est l'assertion la moins chère du lot.
- **Par `Material signature`** : les chances perdues dans chaque configuration traversée en finale.
  Une partie en traverse **4** (médiane ; Q3 5, max 8 sur les parties analysées), et **une seule en
  porte ≥ 50 % des dégâts de finale dans 41 parties sur 47 (87 %)**, médiane 74 % — la vue désigne
  donc une configuration, elle ne disperse pas.
- **Une phase non atteinte est nommée non atteinte**, jamais rendue `0`. **19 des 78 parties
  analysées n'ont pas de finale** : un zéro y afficherait « 0 % de tes dégâts en finale », soit une
  **fausse force**. Même discipline que « pas de score, pas un zéro » des `Key moment`s et que le
  `Counted Move` qui porte sa raison.

### 4. La table corpus sur `/stats`

- **`getStats` gagne la table des `Material signature`**, agrégée sur les parties du `Profile`
  (ADR-0014) qui atteignent la finale.
- **Monnaie : le résultat de la partie.** Une partie compte une fois par configuration traversée.
- **Seuil : 3 parties.** 461 lignes plutôt que 56 à 30 — le demandeur veut voir.
- **Comptes et taux toujours affichés ensemble** : « 1 V – 2 D – 33 % ». Le garde-fou n'est pas le
  seuil, c'est le dénominateur visible — à n = 3 un taux vaut ±29 points, et seul il mentirait.
- **Ce qui tombe sous le seuil est compté en une ligne**, pas effacé.
- **La table annonce sa portée** : combien de parties elle couvre, et combien n'atteignent jamais
  la finale (654 sur 2 438 dans la base actuelle, soit 27 %).

### 5. Les écrans

- **La répartition par phase et la répartition par signature** vivent dans le même bloc, **sous le
  récapitulatif** de la route de revue, et **sous les contrôles** (ADR-0021).
- **La table des configurations** vit sur `/stats`, qui est déjà la page corpus.
- **Aucun indice uniquement chromatique** (ADR-0013).

### 6. Ce qui ne change pas

Aucun changement de schéma, **aucune migration due** (ADR-0015). Aucune `Analysis pass`, aucune
seconde de moteur. `signals.ts` intact. `Review mode` intact.

## Testing Decisions

Un bon test ici porte sur le **comportement externe** : une entrée de FEN ou d'`Evaluation`s
stockées, une sortie de `Phase`, de répartition ou de table. Aucun test ne doit connaître la forme
interne d'une boucle, d'un accumulateur ou d'un composant.

**Quatre coutures, trois existantes** (confirmées avec le demandeur, ADR-0027) :

| couture | ce qu'elle tient | prior art |
|---|---|---|
| `phases(fens)` | la règle d'ADR-0035 | `server/test/phase.test.ts` (131 l.) — déjà une dérivation pure testée directement |
| `gameRecap(game, evals, regime)` | les deux répartitions par partie | `server/test/recap.test.ts` (276 l.) |
| `getStats(db, profileId)` | la table corpus | `server/test/api.test.ts`, `stats/repository` |
| **`signature(fen, playerColor)`** *(nouvelle)* | ordre canonique, camp vide, promotion, lecture par demi-coup | calquée sur `phase.test.ts` : même forme, même hauteur |

**La nouvelle couture est déclarée, pas subie** : tout pourrait s'épingler depuis `gameRecap`, mais
l'ordre `QRB`/`BRQ`, le `—` et la promotion qui **rajoute** une majeure sont pénibles à fixer depuis
un récapitulatif. C'est le seul ajout.

**Épreuve privilégiée du nouveau découpage** : les 415 parties à division lichess de la base sont
un oracle **gratuit et déjà présent**. Un test qui rejoue la dérivation contre la colonne stockée
vaut mieux qu'une poignée de positions écrites à la main — en sachant, et en écrivant, qu'il teste
désormais une copie de lui-même (ADR-0035) et qu'il prouve la **fidélité de la transcription**, pas
la justesse du seuil.

**Pyramide.** Unitaire sur les quatre coutures ; intégration sur les routes (`/api/stats`, la route
des annotations qui sert le récapitulatif) ; **apex agentique** : chaque ticket porte sa **Feature
Path** exécutable, portail d'auto-merge. La promotion d'une **HP** ne sera tranchée qu'à la PR
`integration → develop` — les trois HP existantes sont pleines et le plafond est à trois
(CLAUDE.md), donc greffer sur une HP existante est plus probable qu'en ouvrir une.

**Réserve d'honnêteté à porter dans les tickets** : la base ne porte que **78 parties analysées**,
dont **59** atteignent la finale. Les fixtures fabriquées sont légitimes pour les cas rares
(promotion, camp vide, phase non atteinte) — à condition d'être **nommées comme telles** à chaque
fois, comme US-16b l'a fait.

## Out of Scope

- **Le classement et le verdict** — dire « travaille tes finales de tours » est **US-15d**. Cette
  story **arme** les axes ; l'EPIC prévient déjà que les axes sont **corrélés** (en blitz, les coups
  de finale *sont* les coups à faible horloge), et trancher là-dessus appartient à US-15c avec les
  données sous les yeux.
- **L'agrégat des chances perdues par phase sur tout l'historique** — c'est **US-15c**. Ici, une
  partie à la fois.
- **La `Material signature` hors finale.** Décision de périmètre du demandeur. La cardinalité y
  dépasse les 808 mesurées, et il faudrait dire où l'on coupe.
- **Le `material` de `signals.ts`**, son ACPL et la zone gagnée — c'est **US-44**, qui veut
  précisément promouvoir ce scalaire. Cette story ne le touche pas et lui laisse son nom.
- **Le recalage des bandes hautes du barème** — **US-45**. Il déplacerait ce que cette story
  répartit, mais il ne change ni la frontière ni la signature.
- **Le désempilement de la route de revue** — **US-33**. Cette story **ajoute** un bloc à l'écran
  qu'US-33 doit désempiler ; voir *Further Notes*.
- **Toute retouche du seuil de finale.** Les 290/290 prouvent que notre implémentation est juste,
  **pas** que 6 soit le bon nombre. Personne n'a mesuré le second point et cette story ne le fera
  pas.

## Further Notes

- **Rétroactivité, sans migration.** La `Phase` est dérivée à la lecture : rien à reconstruire, mais
  les chiffres changent sous des lectures déjà scellées. Sur les 78 parties analysées (10 998 points
  de chances perdues), la répartition passe de **34,8 / 37,8 / 27,4 %** à **24,2 / 48,4 / 27,4 %** :
  **10,9 % des dégâts changent de phase**, et **12 parties sur 78** changent de phase *dominante*.
  **La part de la finale ne bouge pas d'un dixième** — cette frontière était déjà la leur. C'est la
  même famille de rétroactivité que celle tranchée « sans action » en US-37 et qui revient en
  US-45 ; à trancher, mais pas ici.
- **On perd l'explicabilité d'une frontière, et c'est assumé.** « Développement achevé » se disait
  au joueur ; « la somme de 49 fenêtres 2×2 dépasse 150 » ne se dit pas. L'entrée `Phase` du
  glossaire a été amendée pour cesser de promettre au joueur qu'il peut « regarder une vraie partie
  et être en désaccord » sur cette frontière-là. La frontière de finale, elle, reste un compte de
  pièces vérifiable à l'œil.
- **Cette story aggrave d'un cran ce qu'US-33 doit traiter.** Elle ajoute un bloc à hauteur variable
  sous le plateau de la route de revue — exactement le défaut pour lequel US-33 a été ouverte
  (« tout ce qui a été ajouté s'est empilé sous le plateau »). Écrit ici plutôt que découvert
  là-bas.
- **Une bizarrerie de `CONTEXT.md` laissée en place** : l'entrée `Lichess division` est insérée **au
  milieu** de l'entrée `Phase` — le paragraphe de clôture et le `_Avoid_` de `Phase` viennent après
  elle. Ça se lit mal ; ranger le glossaire dépasse cette story, et c'est une tranche d'une ligne si
  on la veut.
- **Pas de `Status:` sur ce fichier, volontairement.** Une spec n'est pas un élément de queue
  (`docs/agents/delivery-state.md`, ADR-0026) — 19 specs portant `ready-for-agent` ont été nettoyées
  le 2026-09-04. Les tickets, eux, le porteront.
