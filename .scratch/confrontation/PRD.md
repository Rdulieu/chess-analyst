# US-16b — Confronter ma lecture à celle du moteur

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-16-my-own-analysis` (déjà ouverte, US-16a mergée par PR #70)
Grilling : 2026-08-24 (`CONTEXT.md` : `Confrontation`, `Key moment`, `Declared severity` ; ADR-0017, ADR-0019).
Voir `BACKLOG.md` — US-16b.

## Problem Statement

Le joueur a maintenant un endroit où déposer sa lecture (US-16a) et il la **scelle** : *voilà ce que
j'ai compris*. Mais le scellement ne débouche sur rien. Il ferme une lecture et n'ouvre aucune porte.

Ce qui manque est ce pour quoi la lecture a été écrite. Le joueur ne sait toujours pas **où il lit
bien et où il lit mal** : s'il juge trop sévèrement ou pas assez, s'il repère l'endroit où la partie
a basculé ou s'il regarde à côté, si sa lecture couvre la partie ou trois coups. Il a deux verdicts
sur la même partie — le sien et celui du moteur — dans deux écrans qui ne se parlent pas, et les
rapprocher à la main coup par coup est exactement le travail que l'app existe pour faire.

Et ce travail-là ne se fait pas en une partie. « Je sur-évalue le danger » est une affirmation sur
**des dizaines de lectures**, pas sur une. Il faut donc que la lecture d'une partie et le bilan sur
tout l'historique soient **la même méthode**, sinon le bilan n'est pas vérifiable — et un conseil
invérifiable ne vaut rien (ADR-0017).

## Solution

La **`Confrontation`** : une lecture scellée mise face à ce que le moteur a trouvé, sur la même
partie. Elle est atteinte depuis la partie, sur une route dédiée — la route de lecture reste
**aveugle par nature** et le restera, montrer le moteur dedans détruirait ce qu'elle garantit.

Elle rapporte **trois lectures côte à côte et jamais un score composite**. Un total exigerait des
poids arbitraires (combien vaut *bien juger* face à *regarder au bon endroit* ?), et surtout un
chiffre unique s'optimise — et la seule façon de l'optimiser est d'**imiter le moteur**, le seul
résultat contre lequel cette story existe.

1. **`Declared severity` contre sévérité mesurée**, en **deux figures jamais fondues** : la
   **couverture** (quelle part des `Counted Move`s le joueur a examinée — le silence n'est pas un
   verdict) et la **justesse** (sur celles-là, à quel point il a vu juste). Un joueur qui annote
   trois coups et les juge parfaitement a 100 % de justesse et 10 % de couverture, et **les deux
   sont vrais**. La **matrice de confusion** est montrée, et son asymétrie se lit en une phrase :
   « ce que vous appelez `Blunder`, le moteur l'appelle `Mistake`, sept fois sur dix » —
   **le sens du biais**, gratuit, qu'aucune des trois figures ne distingue seule.
2. **`Key moment`s contre la part des dégâts trouvée** : les chances de gain perdues par les coups
   flagués que les `Key moment`s désignent, sur celles perdues par **tous** les coups flagués du
   joueur. Une seule division, dans la monnaie déjà utilisée partout ici. Le `Drift` est **hors du
   dénominateur** (il n'a aucun coup à désigner) mais **rapporté à côté** : « vous cherchiez une
   faute, il n'y en avait pas — la partie s'est perdue en saignant ». Aucune fenêtre de tolérance :
   un marqueur à un coup de la perte n'est pas crédité, la **distance est affichée**.
3. **`Candidate line`s** — la troisième lecture, **absente en v1** : elle est US-16c. La
   `Confrontation` est construite pour l'accueillir, pas pour l'attendre.

Chaque `Confrontation` est **étiquetée par sa provenance** : lecture **à l'aveugle** ou lecture
**informée**. Une comparaison sans provenance n'est pas une comparaison.

Puis, en dernière tranche, le **bilan sur tout l'historique** : les trois figures repliées sur toutes
les lectures scellées du `Profile`, avec son entrée de `Nav`. Le bilan est la **somme** des
confrontations par partie (ADR-0017) : la réconciliation est la définition, pas un test qu'on espère
vert.

## User Stories

1. En tant que `Player`, je veux atteindre la `Confrontation` d'une partie depuis sa page Analyse, afin de voir ce que ma lecture valait.
2. En tant que `Player`, je veux que le scellement m'ouvre explicitement cette porte, afin que sceller serve à quelque chose.
3. En tant que `Player`, je veux qu'une lecture **non scellée** n'ait pas de `Confrontation`, afin que ce qui est confronté soit figé et non ce que je viens de corriger.
4. En tant que `Player`, je veux qu'une partie **non analysée** me dise qu'il n'y a rien à confronter et comment lancer l'analyse, afin de ne pas rester devant un écran vide.
5. En tant que `Player`, je veux que la route de lecture reste **aveugle** même après le scellement, afin que le moteur n'apparaisse que là où je l'ai demandé.
6. En tant que `Player`, je veux voir quelle **part des `Counted Move`s** j'ai examinée, afin de savoir si ma lecture est représentative de la partie.
7. En tant que `Player`, je veux que la couverture porte le **compte** à côté du taux, afin de juger moi-même si 100 % porte sur deux coups ou sur quarante.
8. En tant que `Player`, je veux voir, sur les coups que j'ai examinés, à quel point j'ai vu **juste**, afin de savoir si mon jugement est fiable.
9. En tant que `Player`, je veux que couverture et justesse ne soient **jamais fondues** en un chiffre, afin qu'annoter peu ne se déguise pas en mal juger.
10. En tant que `Player`, je veux qu'un coup sur lequel je n'ai rien dit ne compte **ni juste ni faux**, afin que ma lecture puisse être partielle sans devenir fausse.
11. En tant que `Player`, je veux que mon `Sound` soit **compté comme un verdict**, afin que « j'ai regardé et je ne trouve rien » soit crédité quand j'ai raison.
12. En tant que `Player`, je veux voir la **matrice** de mes verdicts contre ceux du moteur, afin de savoir *comment* je me trompe et pas seulement combien.
13. En tant que `Player`, je veux qu'on me dise le **sens de mon biais** en une phrase, afin de savoir si je sur-lis ou sous-lis le danger.
14. En tant que `Player`, je veux que mes verdicts sur les coups de l'**adversaire** soient montrés mais **non notés**, afin de ne pas être noté sur ce que cet outil ne juge pas.
15. En tant que `Player`, je veux que mes `Good` soient montrés mais **non notés**, afin de ne pas être pénalisé sur une valeur que le moteur n'a pas.
16. En tant que `Player`, je veux que les coups **non comptés** apparaissent avec **leur raison** (`forced` / `decided`), afin de comprendre l'écart entre ce que la partie montre et ce sur quoi je suis jugé.
17. En tant que `Player`, je veux qu'un coup **forcé** catastrophique que j'ai déclaré `Sound` ne me soit pas compté faux, afin que la matrice ne me reproche pas d'avoir eu raison.
18. En tant que `Player`, je veux voir quelle **part des dégâts** mes `Key moment`s ont trouvée, afin de savoir si je regarde au bon endroit.
19. En tant que `Player`, je veux poser **plusieurs** `Key moment`s sans que ça gonfle mon score, afin de ne pas être tenté de marquer partout.
20. En tant que `Player`, je veux que mes `Key moment`s soient confrontés à **mes propres coups fautifs**, afin de ne pas être fautif d'avoir manqué le cadeau de mon adversaire.
21. En tant que `Player`, je veux, quand un `Key moment` tombe sur un coup qui n'a rien coûté, qu'on me montre **la distance** au vrai coup fautif, afin d'apprendre où j'aurais dû regarder.
22. En tant que `Player`, je veux que le `Drift` soit rapporté **à côté** de cette part, afin de comprendre qu'une partie perdue en saignant n'avait pas de faute à trouver.
23. En tant que `Player`, je veux que le `Drift` **ne soit pas dans le dénominateur**, afin que 100 % reste atteignable par une lecture parfaite.
24. En tant que `Player`, je veux qu'une partie où je n'ai flagué aucune faute donne **pas de score** plutôt qu'un zéro, afin qu'une lecture saine ne ressemble pas à une lecture ratée.
25. En tant que `Player`, je veux que ce que j'ai écrit **après le scellement** soit visible mais **hors confrontation**, afin de pouvoir comprendre sans que ça compte.
26. En tant que `Player`, je veux que chaque `Confrontation` soit **étiquetée** à l'aveugle ou informée, afin de savoir ce que le chiffre vaut.
27. En tant que `Player`, je veux qu'un désaccord me soit présenté comme une **divergence** — où regarder — et jamais comme un verdict sur qui se trompe, afin de garder le droit d'avoir raison contre le moteur.
28. En tant que `Player`, je veux voir le `Search regime` derrière les chiffres du moteur, afin de savoir sous quelle profondeur je suis comparé.
29. En tant que `Player`, je veux un **bilan sur toutes mes lectures scellées**, afin de savoir où je lis bien et où je lis mal en général.
30. En tant que `Player`, je veux que ce bilan soit la **somme** des confrontations par partie, afin de pouvoir en vérifier la méthode sur une partie que je connais.
31. En tant que `Player`, je veux atteindre ce bilan depuis la `Nav`, afin que ce ne soit pas un écran caché.
32. En tant que `Player`, je veux que le bilan dise sur **combien de lectures** il repose, afin de ne pas prendre trois lectures pour une tendance.
33. En tant que `Player`, je veux que le bilan dise combien de ces lectures étaient à l'aveugle et combien informées, afin de savoir ce qu'il vaut.
34. En tant que `Player`, je veux que le bilan soit **cloisonné par `Profile`**, afin que mes lectures ne se mélangent pas à celles d'un autre compte.
35. En tant que `Player`, je veux que le bilan ne soit **découpé par aucun axe** en v1, afin qu'on ne me serve pas des tranches de trois lectures.
36. En tant que `Player`, je veux qu'aucun de ces écrans ne me serve un **score unique**, afin de ne pas apprendre à imiter le moteur.

## Implementation Decisions

### Ce qui existe déjà et n'est pas refait

La `Confrontation` est **une jointure, pas un calcul nouveau** (ADR-0019). Les deux côtés sont déjà
servis et déjà testés :

- côté moteur, `GET /api/games/:id/annotations` porte, par demi-coup, la sévérité mesurée, le
  `Counted Move` **avec sa raison d'exclusion**, et `chancesLost` — plus le `GameRecap` (dont
  `flaggedLoss` et `drift`). C'est exactement ce qu'ADR-0017 fait porter à une partie ;
- côté joueur, `GET /api/personal/:gameId` porte les marques avec leur `posterior`, le `sealedAt` et
  le `engineSeenBeforeSeal`.

**Aucune nouvelle colonne, aucune migration.** La `Confrontation` est **dérivée** (ADR-0009) :
retoucher un seuil la retouche, sans réanalyse. C'est aussi ce qui rend ADR-0015 non concerné ici.

### Le fold par partie — le seam principal

Un module pur `personal/confrontation.ts`, sur le modèle exact de `analysis/recap.ts` :
`gameConfrontation(marks, annotations, recap)` → un enregistrement par partie. Aucun accès base,
aucun appel moteur, aucun rendu — la méthode est testable seule, et c'est **la seule
implémentation** : la page et le bilan lisent la même (ADR-0017).

L'enregistrement porte, et c'est un contrat :

```ts
interface GameConfrontation {
  gameId: number;
  sealedAt: string;                     // une lecture non scellée n'en produit pas
  provenance: "unaided" | "informed";   // jamais optionnelle : sans elle, pas de confrontation
  regime: SearchRegime | null;

  severity: {
    countedMoves: number;               // dénominateur de la couverture : les Counted Moves du joueur
    examined: number;                   // ceux portant une Declared severity scellée
    scorable: number;                   // parmi examined, ceux dont le verdict est notable
    agreed: number;                     // parmi scorable, ceux où déclaré === mesuré
    unscored: { good: number; opponent: number };  // montrés, jamais notés
    matrix: Record<DeclaredSeverity, Record<MeasuredLabel, number>>;  // lignes déclarées, colonnes mesurées
  };

  keyMoments: {
    marked: number;
    damageFound: number;                // chances perdues par les coups flagués désignés
    damageTotal: number;                // = recap.flaggedLoss, hors Drift
    drift: number;                      // rapporté à côté, jamais dans la division
    misses: { ply: number; lostThere: number; nearest: { ply: number; lost: number } | null }[];
  };

  uncounted: { ply: number; reason: UncountedReason }[];
}
```

`damageFound / damageTotal` **n'est pas pré-divisé** : le numérateur et le dénominateur voyagent, et
c'est ce qui permet au bilan d'être une **somme de numérateurs sur une somme de dénominateurs** — et
non une moyenne de taux, qui donnerait le même poids à une partie de trois coups et à une partie de
soixante. Même règle pour couverture et justesse. **`damageTotal === 0` → pas de score, pas un
zéro** : la division est faite à la lecture, jamais stockée, et l'absence de score est un état
affiché comme tel.

### Ce que la matrice compte, et ce qu'elle ne compte pas

- **Sur les `Counted Move`s du joueur uniquement.** Ce n'est pas un choix neuf mais la conséquence
  d'un ancien : un `Counted Move` est déjà « le dénominateur de tout ce que cet outil conclut sur les
  fautes du joueur », et *à quel point le joueur juge juste* en est une conclusion. Le cas qui
  l'impose : un coup **forcé** catastrophique mesure une `Blunder` sans être la faute de personne,
  donc un joueur qui le déclare `Sound` **a raison** — une matrice naïve le compterait faux. Point
  explicitement **à revérifier à l'usage** (le demandeur l'a accepté en le jugeant « un peu
  compliqué ») : si la complexité ne paye pas, c'est ici qu'on rouvre.
- Les coups **non comptés** sont montrés quand même, **avec leur raison** : reconnaître qu'une
  position est déjà décidée ou qu'un coup n'avait pas d'alternative est en soi une chose à apprendre
  en analyse.
- **Colonnes de la matrice** : `blunder` / `mistake` / `inaccuracy` / `none`. `none` est un fait —
  le moteur n'a rien flagué — et c'est la colonne qui rend `Sound` notable : `sound` × `none` est un
  **accord**, ce qui est précisément la raison d'être de `Sound`.
- **`Good` n'est pas notable** : le moteur ne flague que les coups fautifs et n'a **aucune bande pour
  le mérite**, donc il n'y a rien à opposer. Conséquence à écrire explicitement, parce que le
  grilling ne l'a pas tranchée mot pour mot : un `Good` **compte dans la couverture** (le joueur a
  bien regardé) et **sort du dénominateur de la justesse** (il n'y a pas de juste ni de faux). Il est
  reporté à part, en compte. Le fondre dans l'un ou l'autre serait faux dans les deux sens.
- Les verdicts sur les coups de l'**adversaire** sont conservés, montrés, et **jamais notés** — non
  par manque de moyens (les `Evaluation`s sont là) mais **par décision** : cet outil est sur le
  progrès du joueur.
- **Le silence reste le silence** : un coup sans verdict n'entre ni au numérateur ni au dénominateur
  de la justesse ; il entre au dénominateur de la **couverture** et pas à son numérateur.
- **Seule la couche scellée est confrontée.** Les marques `posterior` sont exclues de tout calcul et
  affichées comme postérieures.

### Les `Key moment`s

- Dénominateur : les chances perdues par **tous** les coups **flagués et comptés** du joueur — donc
  exactement `recap.flaggedLoss`, déjà calculé, déjà testé. Pas de seconde implémentation.
- Numérateur : la somme des `chancesLost` des coups flagués comptés que les `Key moment`s désignent,
  **un coup comptant une fois** (l'ensemble des plies désignés, dédupliqué). Additif et non
  trichable par construction : marquer partout ne peut pas dépasser ce qu'on nomme réellement.
- Un `Key moment` sur un coup qui n'a rien coûté rapporte **zéro**, et produit une entrée dans
  `misses` avec la **distance** au coup fautif le plus proche : « votre marqueur est sur 21.Rd1, qui
  n'a rien coûté — la perte est sur 22.Nxe5, un coup plus loin ». **Aucune fenêtre de tolérance** :
  l'écart est affiché au lieu d'être crédité, ce qui garde le calcul additif et sans constante
  magique — la clarté du calcul pour le joueur étant ici une exigence en soi.
- `damageTotal === 0` → **pas de score**, et la phrase qui l'explique, avec le `Drift` à côté.

### Les routes

- `GET /api/personal/:gameId/confrontation` — la confrontation d'une partie. Scopée `Profile` par le
  mécanisme partagé et vérifiant que la partie est bien celle de ce `Profile` (ADR-0014), comme les
  autres routes `personal`. Deux refus **nommés** plutôt qu'un écran vide : lecture **non scellée**
  et partie **non analysée**. Ce sont deux faits métier différents, avec deux suites différentes
  (sceller / lancer l'analyse), donc deux réponses distinctes et jamais un 404 générique.
- `GET /api/personal/confrontation?profileId=` — le bilan. Déclarée **avant** `/:gameId` dans le
  routeur, avec le commentaire qui dit pourquoi : sinon `confrontation` serait avalé comme un
  `gameId`, et la panne serait silencieuse.

### Le bilan (dernière tranche)

`foldConfrontations(records)` — une somme, dans le même module que le fold par partie. Il additionne
les numérateurs et les dénominateurs des trois figures, et ne recalcule rien. Il porte le **nombre de
lectures** sur lequel il repose, et le **compte de lectures à l'aveugle contre informées**.

**Aucun axe en v1**, et c'est une retenue délibérée : une `Personal analysis` s'écrit à la main, donc
l'échantillon est de quelques dizaines de parties là où les agrégats de jeu en ont des milliers.
`Phase` est l'axe qui méritera sa place le premier — « je lis bien les milieux de partie et mal les
finales » est actionnable — mais il est **exclu tant que la détection des phases n'est pas fiable**
(terrain d'US-15a-bis). `Opening` (échantillon nul) et `Time control category` (confond jouer et
analyser : une partie est lue à froid, longtemps après l'horloge) ne sont pas candidats.

La provenance est **comptée** au bilan, pas utilisée pour le **découper** : deux jeux de trois
figures sur des échantillons de cette taille diraient moins que les comptes à côté d'un seul jeu.

### Vocabulaire de l'interface

Un désaccord est présenté comme une **divergence** — *où regarder*, jamais *qui se trompe*. Le mot
« erreur » n'est pas employé pour un désaccord joueur/moteur : juger *notre* moteur par l'accord
joueur/moteur supposerait le joueur juste, ce qui n'est pas établi. La circularité est assumée et
**dite**, pas cachée.

## Testing Decisions

Un bon test décrit un **comportement observable** : la valeur d'un fold à partir de marques et
d'annotations données, la forme d'une réponse HTTP, ce que le joueur lit à l'écran. Aucun test ne
nomme une structure interne, un sélecteur d'implémentation ou l'ordre d'un calcul.

**Base de la pyramide — le fold, en unitaire.** `server/test/confrontation.test.ts`, sur le modèle
de `server/test/recap.test.ts` et `counted.test.ts` : marques + plies en fixture, l'enregistrement
attendu en sortie. C'est là que vivent les cas qui tiennent la story et qu'aucun test d'écran ne
peut tenir honnêtement — le coup forcé déclaré `Sound`, le `Good` qui compte en couverture et pas en
justesse, le verdict sur l'adversaire non noté, la couche `posterior` exclue, les `Key moment`s
multiples sur le même coup, le dénominateur nul qui ne donne pas zéro, la distance affichée.
**Réconciliation** testée explicitement : la somme des confrontations par partie égale le bilan, sur
un jeu de parties — c'est la définition d'ADR-0017, donc elle est assertée.

**Étage API.** `server/test/personal-api.test.ts` (déjà là) étendu : la route par partie, ses deux
refus nommés, le scope `Profile`, et la route de bilan — y compris qu'elle n'est pas avalée par
`/:gameId`.

**Étage composant.** `client/test/` sur le modèle de `PersonalReading.test.tsx` : ce que la page
affiche à partir d'une confrontation donnée — les deux figures jamais fondues, la matrice, la phrase
de biais, l'absence de score, l'étiquette de provenance, la couche postérieure marquée comme telle.
Plus les tests transverses que le projet tient déjà (`tokens`, `denseScreens`, `listsAndTables`) qui
s'appliqueront d'office aux nouveaux écrans.

**Apex — tests agentiques.** Chaque tranche porte son **Feature Path (FP)** exécutable dans le corps
de son issue : c'est la barrière d'auto-merge vers l'intégration, avec le build et les tests. La
tranche finale **greffe sur HP-01** (le parcours qui va déjà de l'import à la lecture) l'étape qui
manque : sceller, ouvrir la confrontation, y lire les trois figures — puis fait tourner la suite HP
entière. Rappel de contrainte projet : **au plus 3 HP**, donc on greffe, on n'en ajoute pas un
quatrième.

## Out of Scope

- **`Candidate line` et `Line check`** — la troisième lecture de la `Confrontation`. C'est US-16c,
  la partie la plus chère (éditer un arbre sur l'échiquier) et la seule qui coûte du temps moteur.
  La `Confrontation` est construite pour l'accueillir : son enregistrement grossit d'un bloc, aucune
  des deux autres lectures ne bouge.
- **L'axe `Phase`** et tout découpage du bilan — exclu tant que la détection des phases n'est pas
  fiable (US-15a-bis).
- **L'export PGN annoté** de la `Personal analysis` (ADR-0019 en fait un rendu à la demande, pas la
  forme stockée) — rien ici ne l'exige.
- **Descellement**, sous toutes ses formes. Une lecture scellée le reste ; c'est ce qui donne un sens
  au scellement.
- **Toute évolution de la route de lecture** au-delà de ce que la porte vers la confrontation exige.
  Elle reste aveugle.
- **Un score unique**, sous quelque nom que ce soit.

## Further Notes

La limite de la méthode est **dite dans le produit**, pas seulement ici : utiliser l'accord
joueur/moteur pour juger *notre* analyse suppose le joueur juste, ce qui est exactement ce qui n'est
pas établi. Un désaccord est donc un signal **pour nous** — un coup où un lecteur humain attentif et
nos chiffres se séparent mérite d'être ouvert — et **jamais une validation** de quoi que ce soit.

Le point le plus fragile de cette story n'est pas un calcul, c'est une tentation : à chaque écran,
quelqu'un voudra un seul chiffre. Les trois figures ne sont pas substituables, et **leur désaccord
est le diagnostic** : fort sur les `Key moment`s et faible sur les `Declared severity`s veut dire que
le joueur voit *où* une partie tourne mais ne sait pas encore nommer *ce qui* s'y passe. Un 60 %
unique aurait effacé ça — et « mes forces et mes faiblesses **en analyse** » est au pluriel exprès.
