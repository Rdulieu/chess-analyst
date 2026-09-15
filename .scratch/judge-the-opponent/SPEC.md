# US-30 — Juger aussi les coups de l'adversaire : l'`Opportunity`

Grillée le 2026-09-14. Branche `integration/US-30-judge-the-opponent`.
Sortie de grill : `CONTEXT.md` (`Opportunity`, et l'entrée `Inaccuracy/Mistake/Blunder` amendée),
**ADR-0034**. Seize décisions tranchées, frontière vide.

## Problem Statement

L'analyse ne regarde qu'une moitié de l'échiquier. `moveSeverities` rend `null` sur tout coup qui
n'est pas celui du joueur, et cette décision se propage partout : la courbe ne porte aucun glyphe
côté adverse, le récap ne compte rien, et l'écran de `Confrontation` range **tout** verdict scellé
posé sur un coup adverse dans un gris qui dit « ce n'est pas votre coup ».

Or le joueur, lui, regarde déjà. Mesuré le 2026-09-14 sur sa base, sur les trois lectures scellées :

- **38 des 95 marques scellées (40 %) sont posées sur des plis adverses.** Ce n'est pas un
  égarement marginal : c'est deux marques sur cinq.
- **19 fautes adverses existent** sous la bande actuelle sur ces mêmes parties.
- **8 d'entre elles (42 %) n'ont jamais été regardées** — aucune marque, aucun verdict, rien.
- Et sur les plis adverses, seules **6** marques crient à la faute contre **31** `Sound`/`Good` :
  le joueur y lit surtout « rien à signaler », et l'app ne lui dit jamais s'il a raison.

Le joueur fait donc à la main un travail que l'outil ne mesure pas, sur une surface où l'outil ne
lui rend aucun retour. Quatre parties sur dix de son attention tombent dans un trou.

## Solution

L'outil mesure ce que l'adversaire a **offert**, et le nomme `Opportunity` — un fait sur ce qui
était à prendre, jamais un jugement sur l'adversaire (le sujet de cet outil reste le joueur).

- **La mesure est la même, le sujet ne l'est pas.** Même bande (`classifyMove`, 5 / 20 / 30), même
  passe, mais **un champ à part** : aucune figure existante ne change de sujet (ADR-0034). La
  sévérité est une *propriété* de l'`Opportunity` — *une `Opportunity` de la taille d'une `Blunder`*
  — et non un vocabulaire concurrent.
- **Les deux exclusions du `Counted Move` ne sont mirées qu'à moitié, et c'est le point** : une
  position **déjà décidée** n'offre rien, mais un coup **forcé reste une `Opportunity`** — `forced`
  existe pour ne blâmer personne, et ici personne n'est blâmé.
- **Le récap de partie porte le compte**, à côté des comptes du joueur et jamais mélangé : une
  `Opportunity` existe que le joueur ait lu la partie ou non — 77 parties analysées contre 3
  lectures scellées.
- **La `Confrontation` gagne sa propre figure.** Les verdicts du joueur sur les coups adverses se
  lisent avec **les trois mêmes termes** (`Bonne lecture` / `Sous-lecture` / `Sur-lecture`) mais
  dans **deux chiffres à part**, jamais fondus dans « Ce que j'ai vu juste ». Se juger soi-même et
  repérer ce que l'adversaire offre sont **deux aptitudes différentes**, et leur désaccord est le
  diagnostic qui vaut le déplacement.
- **À l'écran, au minimum** : la colonne « Le moteur » et la cartouche disent l'`Opportunity` sur le
  coup adverse. **Pas de nouveau glyphe sur la courbe**, case de l'échiquier inchangée.
- Et sur la page `Analyse`, la même information, **aux niveaux moteur seulement** (`annotated`,
  `detailed`) : la route de lecture reste aveugle par nature, sa légende est neutralisée sans rien
  laisser fuir.

## User Stories

1. En tant que joueur, je veux que l'outil mesure les fautes de mon adversaire, afin de savoir ce qui m'a été offert pendant la partie.
2. En tant que joueur, je veux que ces fautes portent un nom à elles — `Opportunity` — afin de ne jamais confondre ce qu'on m'a donné avec ce que j'ai raté.
3. En tant que joueur, je veux que la mesure utilise exactement la même bande que pour mes propres coups, afin de n'avoir qu'un seuil à comprendre.
4. En tant que joueur, je veux qu'une `Opportunity` porte une gravité — imprécision, erreur, bévue — afin de distinguer un cadeau minuscule d'une pièce donnée.
5. En tant que joueur, je veux que mes propres compteurs d'erreurs ne bougent pas d'un point, afin que « vos erreurs » continue de parler de moi.
6. En tant que joueur, je veux que mes `Danger position`s restent définies sur mes propres coups, afin que les cadeaux de l'adversaire n'entrent pas dans mes positions dangereuses.
7. En tant que joueur, je veux qu'un coup adverse **forcé** compte quand même comme `Opportunity`, afin de ne pas perdre les cadeaux les plus clairs qui soient.
8. En tant que joueur, je veux qu'une position **déjà décidée** n'offre aucune `Opportunity`, afin que l'outil ne me reproche pas de ne pas avoir pris ce qui n'était plus à prendre.
9. En tant que joueur, je veux que le récap de chaque partie compte ses `Opportunity`s, afin que le compte existe même sur les parties que je n'ai jamais relues.
10. En tant que joueur, je veux ce compte dans un bloc nommé, à côté de mes chiffres et jamais dedans, afin de lire d'un coup d'œil qui parle de qui.
11. En tant que joueur, je veux que le compte soit ventilé par gravité, afin de savoir si on m'a offert trois imprécisions ou trois bévues.
12. En tant que joueur, je veux que la `Confrontation` score enfin mes verdicts posés sur les coups adverses, afin que 40 % de mes marques cessent de tomber dans un gris muet.
13. En tant que joueur, je veux les **trois mêmes termes** pour ces verdicts, afin de ne pas réapprendre un vocabulaire pour l'autre moitié de l'échiquier.
14. En tant que joueur, je veux que ces verdicts aient leur **propre figure**, afin de voir séparément si je me juge bien et si je vois ce qu'on m'offre.
15. En tant que joueur, je veux que cette figure ne soit jamais fondue dans « Ce que j'ai vu juste », afin qu'un désaccord entre les deux aptitudes reste visible.
16. En tant que joueur, je veux deux chiffres pour cette lecture — sa couverture et sa justesse — afin d'y retrouver la grammaire que je connais déjà.
17. En tant que joueur, je veux voir combien d'`Opportunity`s je n'ai **jamais regardées**, afin de distinguer « vu et mal jugé » de « pas vu du tout ».
18. En tant que joueur, je veux lire le chiffre brut avec son dénominateur, afin de juger moi-même de la taille de l'échantillon plutôt qu'un taux qui la cache.
19. En tant que joueur, je veux que la colonne « Le moteur » affiche l'`Opportunity` du coup adverse, afin de la voir dans la liste où je parcours la partie.
20. En tant que joueur, je veux que la cartouche sous l'échiquier la nomme aussi, afin de la lire là où mon œil est déjà posé.
21. En tant que joueur, je veux qu'aucun nouveau glyphe n'encombre la courbe, afin que le dessin continue de parler de ma partie à moi.
22. En tant que joueur, je veux que la teinte de la case de l'échiquier ne change pas, afin qu'un échiquier continue de porter un seul auteur.
23. En tant que joueur, je veux que la couleur ne soit jamais le seul indice de l'`Opportunity`, afin de lire l'écran quelle que soit ma perception des couleurs.
24. En tant que joueur, je veux retrouver l'information sur la page `Analyse`, afin de ne pas devoir sceller une lecture pour voir ce qu'on m'a offert.
25. En tant que joueur, je veux qu'elle n'y apparaisse qu'aux niveaux moteur, afin que le mode `unaided` reste réellement aveugle.
26. En tant que joueur, je veux que la légende de la route de lecture ne mentionne rien qui fuite, afin que l'exercice de lecture reste honnête.
27. En tant que joueur, je veux que l'affichage reste minimal, afin que la densité de l'écran ne se dégrade pas encore.
28. En tant que joueur, je veux que le compte de la `Confrontation` et celui du récap viennent du même calcul, afin de ne jamais lire deux chiffres qui se contredisent.
29. En tant que joueur, je veux que l'outil ne prétende pas dire si j'ai **converti** l'opportunité, afin qu'il ne m'invente pas un seuil de plus.
30. En tant que joueur, je veux que mes propres coups faibles continuent de porter ce que j'ai rendu, afin que la conversion se lise là où elle est déjà mesurée.
31. En tant que joueur, je veux que le vocabulaire de l'app ne parle jamais d'« erreur de l'adversaire », afin que les trois mots restent réservés à mon sujet.
32. En tant que développeur, je veux que l'ajout de la lecture adverse soit **opt-in par écran**, afin qu'aucune figure ne change de sujet par accident.
33. En tant que joueur, je veux que le récap reste réconciliable avec l'agrégat à venir, afin que la future statistique voie 77 parties et non 3.

## Implementation Decisions

- **Un champ à part, jamais `severity`.** La dérivation des annotations gagne une mesure côté
  adverse, rendue dans un **champ propre** de l'annotation de coup. `severity` garde son contrat —
  `null` hors des coups du joueur — et tous ses consommateurs (`Danger position`, le compte
  d'erreurs, les ouvertures faibles, le récap) restent inchangés **par construction** et non par
  discipline (ADR-0034).
- **Même fonction de classement, même passe.** La bande est `classifyMove` avec ses seuils uniques
  (5 / 20 / 30) ; aucun second seuil n'est introduit. La mesure se fait dans la traversée déjà
  existante des plis, avec le même retournement de perspective (`100 -`) que côté joueur, appliqué
  à la couleur adverse.
- **Une seule exclusion mirée.** Une position **déjà décidée** ne produit pas d'`Opportunity` ; un
  coup **forcé en produit une**. L'asymétrie est explicitement documentée au site du code, parce que
  c'est exactement ce qu'un relecteur « corrigerait » en croyant bien faire.
- **Le récap porte un bloc nommé.** `GameRecap` gagne un bloc d'`Opportunity`s — un total et sa
  ventilation par gravité — **à côté** de `countedErrors`/`flaggedMoves` et jamais additionné dedans.
  L'invariant existant `flaggedLoss + drift === chancesLost` n'est pas touché. Le rapport de revue
  (`review/report.ts`), qui recalcule et réconcilie déjà le récap, réconcilie aussi ce bloc.
- **Pas de persistance, pas de migration.** Tout se dérive des `Evaluation`s stockées (ADR-0009) :
  retoucher la bande retouche ce chiffre sans réanalyse. Aucun changement de schéma SQLite, donc
  aucune migration due.
- **La `Confrontation` score les plis adverses.** Le cas `unscored: "opponent"` cesse d'absorber
  tout verdict posé côté adverse : quand le pli adverse porte une mesure, le verdict déclaré est
  confronté avec **la même fonction** que côté joueur, et produit un des trois `ReadingTerm`s. Le
  résultat est rangé dans la `MoveReading` **dans son propre couple de champs**, jamais dans `term`.
  Là où il n'y a ni verdict ni `Opportunity`, le pli reste non scoré.
- **Deux figures, à part.** La `Confrontation` gagne une lecture adverse à elle : une **couverture**
  (combien d'`Opportunity`s ont été regardées) et une **justesse** (parmi celles-là, combien lues
  juste), sur le modèle exact du couple couverture/justesse existant, et **jamais fondues** avec
  lui. Le chiffre est rendu **brut avec son dénominateur** — jamais normalisé pour pouvoir se
  comparer.
- **L'agrégat est le pli de la liste.** Comme ADR-0032 l'exige déjà pour la lecture du joueur, les
  figures adverses sont la somme des `MoveReading`s et non un second calcul.
- **À l'écran, trois sites et pas un de plus** : la colonne « Le moteur » de la liste des coups, la
  cartouche sous l'échiquier, et le bloc de figures. **Aucun glyphe de courbe ajouté** ; la teinte de
  la case de l'échiquier reste celle du verdict du joueur (ADR-0022). Le mot et le glyphe viennent
  des modules qui les possèdent (le tableau de libellés, la table des glyphes), jamais retapés.
- **La couleur n'est jamais seule** (ADR-0013) : l'`Opportunity` porte un mot, et son nom accessible
  la distingue d'une faute du joueur.
- **Page `Analyse` : niveaux moteur seulement.** L'information n'apparaît qu'à partir du niveau
  `annotated` ; `unaided` ne la voit pas. La légende de la route de lecture est neutralisée de façon
  à ne rien faire fuiter sur la partie en cours.
- **Ce que le modèle ne dit pas** : la **conversion**. Aucune mesure de « ce que le joueur en a
  fait » — elle demanderait un seuil inventé, et un gain rendu se lit déjà dans les coups faibles du
  joueur. Décision du demandeur : « on a déjà le vocabulaire qui concerne le joueur ».

## Testing Decisions

**Ce qu'est un bon test ici** : il passe par le **comportement externe** du module — un récap
calculé depuis des `Evaluation`s, une `Confrontation` construite depuis une lecture scellée, un
écran rendu depuis une réponse d'API — et jamais par la forme interne du calcul. Les onze findings
bloquants d'US-26, dont aucun n'a été vu par un test, ont une cause commune : des assertions qui ne
pouvaient pas échouer (le test se fournissait lui-même la valeur qu'il vérifiait). **Chaque
assertion de cette US doit être ancrée sur une donnée d'entrée, pas sur une valeur recopiée.**

- **Seam principal, et si possible unique : la dérivation.** `gameAnnotations`/`gameRecap` côté
  serveur, déjà couverts, déjà le point de passage de tous les consommateurs. Tout ce qui concerne
  la mesure s'y teste, au plus haut point possible. **Aucun nouveau seam n'est introduit côté
  mesure.**
- **Second seam, existant** : la construction de la `Confrontation` (`buildGameConfrontation`), déjà
  le seam d'US-26, pour les termes et les deux figures.
- **Troisième seam, existant** : le rendu des composants de `features/confrontation` sur une réponse
  d'API fabriquée, comme les tests d'US-26. **Le test ne se fournit pas le terme** : il part d'un
  `MoveReading` d'entrée et vérifie le mot rendu.
- **Fixture partagée, étendue.** La fixture scellée (`server/src/personal/fixture.ts`) gagne les cas
  qui manquent : un coup adverse fautif **vu et bien lu**, un **vu et sous-lu**, un **jamais
  regardé**, un **forcé et fautif** (qui doit compter), un **en position déjà décidée** (qui ne doit
  pas). Les deux côtés de chaque frontière, ancrés.
- **Prior art** : les tests de récap (`analysis/recap`), ceux de la réconciliation
  (`review/report`), et la suite `confrontation-per-move` d'US-26, qui fixe déjà la forme des tests
  par coup.
- **Pyramide** : l'essentiel est unitaire sur la dérivation et la `Confrontation` ; une poignée de
  tests de rendu ; et l'apex agentique — chaque ticket porte sa **Feature Path (FP)** exécutable
  comme porte d'auto-merge, la suite **HP** étant rejouée au moment de la PR
  `integration -> develop`. Aucun nouvel HP n'est proposé : le parcours ajouté est une lecture de
  plus sur des écrans déjà couverts par HP-02/HP-03.
- **Un piège nommé d'avance** : un correctif qui n'atteint jamais l'écran (règle CSS absente,
  propriété en trop silencieusement perdue, règle qui perd la cascade) a produit trois des onze
  findings d'US-26. Toute FP touchant au rendu **vérifie le pixel rendu**, pas seulement la présence
  du champ dans la réponse.

## Out of Scope

- **La conversion** de l'`Opportunity` (Q15, tranchée « non »).
- **L'agrégat multi-parties** de ces chiffres : US-15c/US-33 territoire. Cette US pose le
  per-Game record dont cet agrégat sera le pli (ADR-0017), rien de plus.
- **Un nouveau glyphe sur la courbe** d'évaluation, et toute modification de la teinte des cases.
- **Un jugement sur l'adversaire** en tant que joueur : profil adverse, statistiques par adversaire,
  classement.
- **La densité de la page `Confrontation`** : le coût de densité des deux figures est constaté et
  renvoyé à US-33 (infobulles / densité), pas traité ici.
- **Toute migration de schéma** : rien n'est persisté.

## Further Notes

- Le backlog portait une mesure **périmée** sur cette US (une bande à 10 alors que le code est à 5 ;
  « 7 fautes » sur la partie 715 qui en compte 11). Elle a été **datée plutôt que remplacée** (Q4) :
  la garder datée dit quelque chose que la remplacer effacerait.
- Sur la base réelle, la répartition des marques adverses est **6 fautes déclarées contre 31
  `Sound`/`Good`** : le joueur y lit surtout « rien à signaler ». La lecture adverse mesurera donc
  d'abord sa capacité à *ne pas* voir de danger là où il n'y en a pas — et c'est précisément
  pourquoi le chiffre brut avec son dénominateur vaut mieux qu'un taux.
