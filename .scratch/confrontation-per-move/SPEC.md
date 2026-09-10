# US-26 — Voir la `Confrontation` coup par coup, sur l'échiquier

Grillée le 2026-09-10. Branche `integration/US-26-confrontation-per-move`.
Sortie de grill : `CONTEXT.md` (`Bonne lecture` / `Sous-lecture` / `Sur-lecture`), **ADR-0032**,
**ADR-0033**. Origine : `docs/feedback/2026-08-25-us16-confrontation.md`.

## Problem Statement

Le joueur a scellé sa lecture d'une partie, l'a confrontée au moteur, et l'écran lui répond par
trois taux, une matrice de confusion et des comptes. Il lit « 1 sur 4 » et **ne peut pas retrouver
les trois autres** : rien sur cet écran ne dit *quel* coup a produit *quelle* case.

Neuf remarques de la première session de test réelle disent la même chose sous neuf angles — *pas
très visuel*, *parcourir le board avec les flags*, *le verdict sur chacun des coups*, *quand j'ai dit
« erreur » à tort*, *l'évaluation du moment clé peu visible*, *mettre en avant les divergences*, *ce
que j'ai vu juste n'est pas clair*. Le défaut est **un seul** : la `Confrontation` est **agrégée**.

Trois conséquences concrètes :

- **Un taux est un verdict qu'on doit croire sur parole.** L'exigence d'auditabilité d'US-15 —
  le joueur doit pouvoir *comprendre et évaluer* la méthode — s'arrête à la porte de cet écran.
- **Deux cases de la matrice n'ont aucun mot.** « Ce que j'ai vu juste » et « quand j'ai crié à
  l'erreur pour rien » ne sont nommés nulle part dans l'app.
- **Les coups exclus occupent la place d'une liste** — seize rendus un à un sur la partie testée —
  alors qu'ADR-0017 exigeait leur **lisibilité**, pas leur énumération.

## Solution

La route `/analyse/:gameId/confrontation` gagne un **échiquier**, parcourable exactement comme celui
de la page `Analyse` : mêmes contrôles, mêmes raccourcis clavier, même liste des coups, même courbe,
même ruban de `Phase`s.

Sur chaque coup, le joueur lit **ce que sa lecture a valu là** :

- l'échiquier porte la teinte de **son** verdict — un échiquier, un auteur (ADR-0022) ;
- une **cartouche** nomme la comparaison : `Bonne lecture` en vert, `Sous-lecture` en rouge,
  `Sur-lecture` en jaune, ou un gris qui **nomme son cas** quand rien n'est scoré ;
- une **seconde cartouche**, préfixée `◆`, dit ce que ses `Key moment`s ont valu là ;
- un texte sous les cartouches explique, et la courbe porte les **glyphes de désaccord** pour que
  les divergences se voient sans parcourir soixante coups ;
- la matrice reste, en bas, et **chaque cellule déplie ses coups** : « 1 sur 4 » mène aux quatre.

Et parce que la vue par coup et l'agrégat doivent être **le même calcul** (ADR-0032), les chiffres
affichés en bas sont désormais littéralement la somme de ce que le joueur voit coup après coup.

## User Stories

1. En tant que joueur, je veux un échiquier sur l'écran de confrontation, afin de voir les coups dont on me parle au lieu de les imaginer.
2. En tant que joueur, je veux parcourir la partie coup après coup sur cet écran, afin de suivre ma lecture dans l'ordre où je l'ai écrite.
3. En tant que joueur, je veux les mêmes raccourcis clavier que sur la page `Analyse`, afin de ne pas réapprendre un écran que je connais déjà.
4. En tant que joueur, je veux la liste des coups à côté de l'échiquier, afin de sauter directement à un coup qui m'intéresse.
5. En tant que joueur, je veux voir la teinte de **mon** verdict sur la case d'arrivée, afin de retrouver mon propre travail sur le plateau.
6. En tant que joueur, je veux une cartouche verte « Bonne lecture » quand j'ai lu juste, afin que mes réussites soient dites et pas seulement mes manques.
7. En tant que joueur, je veux savoir quand j'ai raté une faute que le moteur signale, afin d'apprendre où mon œil ne se pose pas.
8. En tant que joueur, je veux que cette cartouche nomme la gravité ratée — « Bévue ratée », « Erreur ratée », « Imprécision ratée » — afin de mesurer l'ampleur de ce que j'ai manqué.
9. En tant que joueur, je veux distinguer « je n'ai rien vu » de « j'ai vu, mais moins grave » — « Bévue sous-estimée » — afin que l'écran ne me dise pas aveugle quand j'étais seulement imprécis.
10. En tant que joueur, je veux savoir quand j'ai crié à l'erreur alors qu'il n'y en avait pas, afin d'apprendre que je sur-lis le danger.
11. En tant que joueur, je veux que ce cas s'appelle « Fausse alerte » et non « Coup OK », afin de comprendre qu'on parle de **ma lecture** et pas de la qualité du coup.
12. En tant que joueur, je veux la même distinction dans l'autre sens — « Bévue surestimée » — afin de voir que j'ai dramatisé plutôt que halluciné.
13. En tant que joueur, je veux que la couleur ne soit jamais le seul indice, afin de lire cet écran quel que soit ma perception des couleurs.
14. En tant que joueur, je veux qu'un coup **forcé** le dise, afin de comprendre pourquoi il ne compte pas alors que le moteur le signale.
15. En tant que joueur, je veux qu'un coup joué dans une **position déjà décidée** le dise à son coup, afin de ne plus voir une liste de seize exclus occuper l'écran.
16. En tant que joueur, je veux qu'un coup de **l'adversaire** le dise, afin de savoir pourquoi mon verdict n'y est pas scoré.
17. En tant que joueur, je veux qu'un verdict `Good` affiche « Correct — rien à comparer », afin de savoir que le moteur n'a pas de bande pour le mérite plutôt que de croire à un bug.
18. En tant que joueur, je veux qu'un coup où je n'ai rien dit affiche « Rien dit », afin de distinguer mon silence de mon accord.
19. En tant que joueur, je veux qu'un coup forcé où j'avais dit `Sound` me donne raison, afin que l'écran n'efface pas la lecture la plus fine que j'aie faite.
20. En tant que joueur, je veux voir ce que mes `Key moment`s ont valu coup par coup, afin que « vos marqueurs ont trouvé 30 % des dégâts » cesse d'être un chiffre sans coups.
21. En tant que joueur, je veux une cartouche `◆` verte quand mon marqueur est tombé sur une vraie perte, afin de créditer mon flair.
22. En tant que joueur, je veux une cartouche `◆` jaune quand mon marqueur est à côté, afin de savoir de combien je me suis trompé.
23. En tant que joueur, je veux lire la phrase de la distance — « votre marqueur est sur 21.Td1, qui n'a rien coûté ; la perte est sur 22.Cxe5 » — afin d'apprendre où j'aurais dû regarder.
24. En tant que joueur, je veux une cartouche `◆` rouge sur une perte que je n'ai **pas** marquée, afin de voir enfin les 70 % de dégâts que mes marqueurs n'ont pas trouvés.
25. En tant que joueur, je veux qu'un marqueur posé sur un coup de l'adversaire ou sur un coup non compté le dise en gris, afin de comprendre pourquoi il ne me rapporte rien.
26. En tant que joueur, je veux qu'aucune cartouche `◆` n'apparaisse là où il n'y a ni marqueur ni perte, afin de ne pas lire soixante cartouches qui disent « rien ».
27. En tant que joueur, je veux distinguer les deux familles de cartouches d'un coup d'œil, afin de ne pas confondre « j'ai bien jugé » et « j'ai bien regardé ».
28. En tant que joueur, je veux un texte sous les cartouches qui explique le coup courant, afin d'avoir la phrase entière quand l'étiquette ne suffit pas.
29. En tant que joueur, je veux y retrouver la note que j'avais écrite sur ce coup, afin de relire mon raisonnement en face du verdict du moteur.
30. En tant que joueur, je veux voir la courbe d'évaluation du moteur sur cet écran, afin de situer mes divergences dans le déroulé de la partie.
31. En tant que joueur, je veux que la courbe porte **seulement** les glyphes de désaccord, afin que les divergences ne se noient pas dans soixante marques.
32. En tant que joueur, je veux deux glyphes distincts pour la sur-lecture et la sous-lecture, afin de voir si mon biais penche d'un côté.
33. En tant que joueur, je veux que ces glyphes se distinguent par leur **forme**, afin de les lire sans dépendre de la couleur.
34. En tant que joueur, je veux le ruban des `Phase`s sous la courbe, afin de voir si mes divergences se concentrent en finale.
35. En tant que joueur, je veux la barre de chances de gain, afin de savoir dans quel état était la partie au coup que je regarde.
36. En tant que joueur, je veux que la liste des coups montre **les deux auteurs en deux colonnes titrées**, afin de comparer ma lecture et le moteur d'un seul bloc.
37. En tant que joueur, je veux que la liste porte aussi le glyphe de désaccord, afin de repérer mes divergences en la parcourant.
38. En tant que joueur, je veux garder la matrice de confusion, afin de conserver la vue d'ensemble que j'avais déjà.
39. En tant que joueur, je veux **cliquer une cellule** de la matrice, afin de retrouver les coups qui l'ont remplie.
40. En tant que joueur, je veux que la liste dépliée soit repliée par défaut, afin que l'écran ne s'allonge que si je le demande.
41. En tant que joueur, je veux qu'un clic sur un coup de cette liste **focalise l'échiquier** sur lui, afin que la liste soit un raccourci vers le plateau et non une seconde lecture.
42. En tant que joueur, je veux que les contrôles de pas ne bougent jamais quand j'avance dans la partie, afin de ne pas rater le bouton que je visais.
43. En tant que joueur, je veux que les chiffres du bas soient exactement la somme de ce que je vois coup par coup, afin de pouvoir vérifier la méthode plutôt que de la croire.
44. En tant que joueur, je veux que l'écran refuse proprement quand ma lecture n'est pas scellée ou que la partie n'est pas analysée, afin de savoir lequel des deux gestes il me manque.
45. En tant que joueur, je veux que cet écran reste cloisonné par `Profile`, afin que la lecture d'un compte ne s'affiche jamais sous un autre.
46. En tant que joueur, je veux que l'écran reste lisible en thème clair comme en thème sombre, afin de travailler quand je veux.
47. En tant que développeur, je veux que le par-coup et l'agrégat soient une seule dérivation, afin qu'ils ne puissent pas diverger en silence.
48. En tant que développeur, je veux que rien de tout cela n'ajoute de colonne ni de table, afin qu'aucune migration ne soit due.

## Implementation Decisions

### Serveur — la lecture par coup (ADR-0032)

- **`confrontGame()` cesse de jeter ce qu'il calcule.** La boucle produit une entrée par ply du
  joueur ; `matrix`, `examined`, `scorable` et `agreed` deviennent la **somme** de cette liste.
  Ce n'est pas un second parcours ni un second système : c'est le même, qui conserve son résultat.
- **`GameConfrontation` porte cette liste.** Le corpus (`foldConfrontations`) la construit en mémoire
  comme aujourd'hui et n'en sert que le résumé : la route corpus ne change pas de contrat.
- **Chaque entrée porte** : le ply, la notation, le `Declared severity` (ou son absence), le label
  mesuré, le **terme** (`bonne-lecture` / `sous-lecture` / `sur-lecture`) ou la **raison** de non-
  score (`good`, `opponent`, `forced`, `decided`, `silence`), et la lecture `◆` du coup.
- **Le terme suit `agrees()` sans le modifier** : égalité stricte sur la bande, `Sound` face à « rien
  signalé » étant un accord. L'écart de bande est une `Sous-lecture` ou une `Sur-lecture` selon son
  sens. **Aucune fenêtre de tolérance** — le taux d'exactitude déjà livré ne change pas d'un pouce.
- **Le cas `Moment clé manqué` est neuf** et se dérive des données déjà présentes : une faute
  comptée et coûteuse (`faults`) qu'aucun marqueur ne désigne (`marked`). Les six autres cas `◆`
  se lisent dans ce que `GameConfrontation` porte déjà.
- **`uncounted`, `misses` et `posterior` restent** tels quels : la liste par coup ne les remplace
  pas, elle les recoupe. Aucun contrat existant n'est retiré.
- **Aucun changement de schéma, aucune migration** : le par-coup est dérivé.

### Client — l'écran (ADR-0033)

- **`ConfrontationPage` compose `Board` directement**, via les seams qu'il expose déjà :
  `squareTint` (la table du joueur — c'est l'écran qui décide quelle table s'applique),
  `moveMarks`, `controls`, plus `annotations` qui amène la courbe, la barre de chances et le ruban
  de `Phase`s. **Pas** `GameViewer` : il porte le `Review mode` et le Sans aide d'US-28, qui n'ont
  aucun sens après le sceau.
- **Pas de `Review mode`** sur cet écran : le sceau est tombé, tout est révélé par définition.
- **Ordre du panneau** : contrôles de pas et coup courant (ils ne bougent **jamais**, ADR-0021),
  puis la courbe, puis les cartouches et le texte du coup, puis l'agrégat et la matrice. L'ordre
  interne actuel de `Board` est **accepté à titre provisoire** ; sa refonte est **US-33** et rien
  ici ne doit se lire comme une décision d'organisation durable. Si un ajustement de `Board`
  s'impose, il vaut **pour les deux écrans**, jamais pour celui-ci seul.
- **Deux familles de cartouches**, distinguées par un **glyphe** et non par une teinte : la lecture
  (sans préfixe) et le `Key moment` (préfixe `◆`, celui de `MoveMarks`).
- **Pas de légende** : les libellés se suffisent, c'est pourquoi ils sont paramétrés par le cas.

**Table des libellés de lecture :**

| Cas | Couleur | Libellé |
|---|---|---|
| Accord, `Sound` contre « rien signalé » compris | vert | Bonne lecture |
| Rien dit / `Sound`, le moteur signale | rouge | Bévue ratée · Erreur ratée · Imprécision ratée |
| Bande déclarée plus douce que mesurée | rouge | Bévue sous-estimée · Erreur sous-estimée |
| Bande déclarée, le moteur ne signale rien | jaune | Fausse alerte |
| Bande déclarée plus dure que mesurée | jaune | Bévue surestimée · Erreur surestimée |
| Coup forcé | gris | Coup forcé — non compté |
| Position déjà décidée | gris | Position déjà décidée — non comptée |
| Coup de l'adversaire | gris | Coup de l'adversaire |
| Verdict `Good` | gris | Correct — rien à comparer |
| Aucun verdict | gris | Rien dit |

**Table des cartouches `◆` :**

| Situation | Couleur | Libellé |
|---|---|---|
| Marqué, et le coup a coûté des chances | vert | ◆ Moment clé trouvé |
| Marqué, rien coûté, une faute existe ailleurs | jaune | ◆ Marqueur à côté |
| Marqué, rien coûté, aucune faute dans la partie | gris | ◆ Marqueur sans cible |
| Marqué, mais coup de l'adversaire | gris | ◆ Marqueur sur l'adversaire |
| Marqué, mais coup non compté | gris | ◆ Marqueur sur un coup non compté |
| Non marqué, et le coup a coûté des chances | rouge | ◆ Moment clé manqué |
| Ni marqueur ni perte | — | *(pas de cartouche)* |

- **Courbe** : deux glyphes de **forme** distincte, un par sens de divergence. Les glyphes de
  sévérité moteur n'y sont pas — la courbe porte déjà la lecture du moteur par sa forme.
- **Liste des coups** : deux colonnes titrées (« Ma lecture » / « Le moteur ») plus le glyphe de
  désaccord. C'est le seul endroit de l'écran où les deux auteurs coexistent légitimement : une
  liste a des colonnes, une case n'en a pas.
- **Matrice** : chaque cellule déplie ses coups, repliée par défaut ; un clic **focalise
  l'échiquier**. La matrice étant le dernier bloc, le dépliage ne déplace rien au-dessus.
- **La couche postérieure n'apparaît pas** sur cet écran (décision explicite du grill).
- **`ScopedPage` et les deux refus nommés** (`not-sealed`, `not-analyzed`) restent inchangés.

## Testing Decisions

Un bon test ici décrit ce que le joueur lit, jamais comment on le calcule : le nom d'un libellé, la
présence d'une cartouche, le fait qu'une somme retombe sur un chiffre affiché. Aucun test ne doit
connaître la structure interne de `Board` ni l'ordre des `div`.

**Trois seams, deux existants, aucun d'un genre nouveau :**

1. **`confrontGame()`** — fonction pure, serveur. Le par-coup, les sept cas `◆`, et **l'assertion
   d'ADR-0032** : additionner la liste par coup et retomber exactement sur `matrix`, `examined`,
   `scorable`, `agreed`. Prior art : `server/test/confrontation.test.ts`,
   `confrontation-fold.test.ts`, `confrontation-real-reading.test.ts` — ce dernier rejoue une
   **vraie** lecture scellée et couvre déjà accord, divergence à la baisse, deux à la hausse, un
   verdict sur l'adversaire, seize exclus et trois `Key moment`s dont un raté. Il est le témoin de
   non-régression du chiffre : **ses totaux ne doivent pas bouger d'une unité.**
2. **`ConfrontationPage`** — rendu complet, API stubbée. L'écran de bout en bout : teinte du joueur,
   les deux cartouches, la liste à deux colonnes, les glyphes de la courbe, le dépliage d'une
   cellule et le focus sur le coup, l'invariance des contrôles au fil des plies. Prior art :
   `client/test/ConfrontationPage.test.tsx`, `ReadingPage.test.tsx`, `Board.test.tsx`.
3. **La table des libellés** — module pur, client, à côté de `bias.ts` qui a déjà exactement cette
   forme. Les quinze cas y sont couverts un par un ; les faire passer par le rendu de la page
   coûterait quinze montages pour vérifier une chaîne. Prior art : `bias.test.ts`, `severity.test.ts`.

**Garde-fous transverses déjà outillés**, à étendre à cet écran plutôt qu'à réinventer :
`denseScreens.test.ts` et `listsAndTables.test.ts` pour la densité et les tableaux,
`boardTheme.test.ts` pour les deux thèmes, et l'assertion `theme-pass` d'ADR-0021 — **zéro pixel**
de déplacement des contrôles en parcourant les plies.

**Sommet de la pyramide.** Chaque ticket porte sa **Feature Path** exécutable, gate d'auto-merge.
Elles tournent sur une **fixture semée** (`server/test/fixtures/`, sur le modèle de
`real-reading.ts`) avec des `evaluations` **fabriquées**, taillées pour produire les cas que le
moteur ne rend pas sur commande : un coup forcé mesuré `Bévue` et déclaré `Sound`, les deux écarts
de degré, un `Good`, un marqueur sur l'adversaire, une perte non marquée. **À dire dans chaque
scénario** : la fixture prouve que l'écran rend ces cas, pas que le moteur les produit.

La **partie 715** de la base réelle (63 marques, 42 `Sound`, 9 notes, 3 `Key moment`s) est le témoin
réel, ouvert à la main dans la passe **HP** au moment du MR `integration → develop`. Pas de nouvelle
HP proposée d'emblée : la suite en compte déjà 3, le maximum.

## Out of Scope

- **L'écran corpus « Mes lectures »** (`/confrontation`, le bilan sur tout l'historique). Il n'a
  jamais été exercé à l'échelle — 3 lectures scellées en base — mais c'est un sujet à part, et cette
  story ne touche pas son contrat.
- **Le coût de pose de `Sound`** (note 3 du retour) → **US-40**, ouverte. Elle porte sur la route de
  **lecture**, avant le sceau.
- **La refonte de la disposition du panneau** → **US-33**. Cette story accepte l'ordre actuel.
- **La couche postérieure** sur cet écran : décidée absente.
- **`Candidate line` / `Line check`** (la troisième lecture d'une `Confrontation`) → **US-16c**.
- **Toute modification du calcul des taux.** Aucun chiffre déjà affiché ne change. Une divergence
  d'une unité sur `confrontation-real-reading.test.ts` est un **bug**, pas une amélioration.

## Further Notes

- **La mesure préalable a été écartée à raison** : les chiffres dont le grill avait besoin étaient
  dans la base (4 `personal_analyses`, 3 scellées ; 11 passes ; 5577 `evaluations`), pas dans une
  session de test. La note du backlog qui réclamait cette session est **périmée** sur ce point.
- **`better-sqlite3` ne charge pas** sous le node courant (`NODE_MODULE_VERSION` 127 vs 147) :
  inspecter la base avec le `sqlite3` du système.
- **Vocabulaire** : le découpage début / milieu / finale s'appelle **`Phase`** ; « division » est le
  mot de Lichess et ADR-0031 tient que c'est un oracle, jamais la `Phase`.
- **ADR-0022 nommait cette dette** — *« un futur écran de `Confrontation` coup par coup […] devra
  apporter sa colonne ou son titre »*. ADR-0033 la paie. Un futur écran qui retenterait la double
  teinte sur une case contredit les deux.
