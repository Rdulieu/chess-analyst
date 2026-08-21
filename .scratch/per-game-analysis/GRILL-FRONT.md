# US-15a — grilling du front (2026-08-21)

Suite au `/to-prd` interrompu : le modèle était grillé, la **présentation** ne l'était pas (D6 /
ADR-0017 les avaient explicitement séparées). Répond aux questions de `QUESTIONS-FRONT.md`.

## Ce que le code impose (vérifié, pas supposé)

- **Le panneau latéral est déjà plein** : `controls`, stepper, readout du coup courant, la courbe,
  `ErrorTallyReadout`, et la liste des coups — dont chaque ligne porte déjà trois choses (SAN, glyphe
  de sévérité, `Evaluation`).
- **Un modèle de sélection existe déjà** : `index` est la source unique de « où est le joueur » ; la
  liste le marque en `aria-current`, et le readout, la barre et la teinte de case le suivent. Rien à
  inventer pour savoir quel Move est regardé.
- **`EvaluationGraph` est `aria-hidden`, et pour une raison énoncée** : chaque chiffre du dessin est
  **déjà du texte** ailleurs. `ErrorTallyReadout` existe précisément parce que les compteurs
  d'erreurs étaient la seule chose que la courbe ajoutait et qui n'était pas du texte. **Invariant
  permanent : tout nouveau dessin doit son équivalent textuel, sinon il ne sort pas.**
- Rien au-dessus du plateau ne doit bouger (contrainte US-14 tenue par l'ordre du document).

## F1 — Le relevé vit dans un **panneau de détail du Move sélectionné**

Options : **(a) en ligne dans la liste des coups** — chaque ligne passe à trois ou quatre lignes, soit
~300 lignes sur une partie de 90 plys : la vue d'ensemble est détruite, et ce qu'on vient scanner
(« où ça a dérapé ? ») devient impossible à scanner. **Rejeté.** **(c) une route séparée** — de la
place, et ADR-0006 le tolérerait, mais revoir une partie **est** un seul parcours, et séparer le
plateau du raisonnement sur le plateau empêche de voir la position pendant qu'on lit pourquoi le coup
était mauvais. **Rejeté sur le fond, pas sur la mise en page.**

**Retenu (b), avec un partage du travail délibéré** — la liste est la **vue d'ensemble**, le panneau
est le **relevé** :

- **la ligne de liste garde** : SAN, glyphe, `Evaluation` — **plus un seul** marqueur compact « ne
  compte pas ». Rien d'autre. Le scan est préservé, et la **répartition** des Moves comptés/exclus
  reste visible d'un coup d'œil : l'histoire de réconciliation (« 4 grosses erreurs, 0 comptée ») est
  un motif sur la partie, pas un fait sur un coup.
- **le panneau reçoit** : `Best line`, réfutation, delta, `Phase`, et le motif d'exclusion **en
  mots**.

Cadré par le demandeur : **un seul coup à la fois suffit** ; le panneau va **en dessous de ce qui est
déjà affiché**, dans un **panneau séparé**. La comparaison entre plusieurs Moves est le rôle de
l'agrégat (15c), pas de cette vue. Le panneau étant en dessous, sa hauteur variable ne déplace rien
au-dessus du plateau — la contrainte US-14 tient sans hauteur réservée.

## F2 — Trois niveaux, pas deux cases, et l'état **persiste**

Le relevé contient sévérité, delta et lignes dérivées de l'`Evaluation` : **c'est du contenu
d'annotation**. Avec deux cases indépendantes, il existe un état où la page cache glyphes, barre et
courbe **et** affiche dessous « **17. Nf3?** −28 %, meilleur : Bxh7+ » — la page se contredirait.
**Deux cases indépendantes : rejeté.**

**Retenu : un contrôle à trois niveaux** (choix du demandeur — « je veux définir des modes »), et
**l'état persiste** (précédent `localStorage` du `Profile` courant ; le toggle d'annotations actuel
est un `useState` non persisté qui se réinitialise à chaque partie). Persister sert l'usager réel du
panneau : celui qui audite la méthode sur une dizaine de parties et n'a pas à re-cocher à chaque fois.

## F3 — `Review mode` : **Unaided / Annotated / Detailed**, défaut **Unaided**

Terme écrit dans `CONTEXT.md`. **US-16 en hérite** : son analyse en aveugle est le niveau Unaided
**plus une règle d'ordre**, pas un quatrième mode. « Blind » est écarté comme *nom de niveau* : ça
décrit une restriction que ce niveau **n'applique pas** (un joueur qui a lu les annotations puis
repasse en Unaided les a vues) — nommer ainsi reviendrait à promettre une garantie qu'on ne tient pas.

**Changement de comportement assumé : les annotations sont désormais CACHÉES par défaut** (décision du
demandeur). C'était l'inverse depuis US-7. Coût vérifié et borné :

- **HP-01 casse** : l'étape 7 affirme que « le second panneau à côté du plateau est le panneau
  d'annotations, et il n'existe qu'une fois la partie analysée », l'étape 9 affirme la présence de
  l'`Evaluation curve`. Ni l'un ni l'autre ne tient avant un changement de mode → **HP-01 à amender**
  (c'est le greffage déjà prévu sur l'étape 9).
- **Quatre suites client** affirment le défaut actuel : `GameViewer.test.tsx` (« fetches and shows
  annotations for an analyzed Game », plus un clic qui les **désactive**), `Board.test.tsx`,
  `AnalysePage.test.tsx`, `denseScreens.test.ts`.

**Et une conséquence qui n'est pas de la comptabilité de tests** : après « Analyser cette partie », le
joueur ne verrait **plus rien changer** — le pass tourne des minutes, finit, et le plateau est
identique. Aujourd'hui c'est le moment de la récompense ; avec le nouveau défaut ça se lit « l'analyse
n'a rien fait ». **Le sélecteur de mode n'est pas la mitigation** : un contrôle qu'il faut remarquer
est exactement ce qui échoue ici. Retenu : **terminer un `Analysis pass` sur la partie en cours de
revue promeut cette revue en `Annotated`** — le joueur a demandé l'analyse, lui montrer ce qu'elle a
produit est une réponse, pas un passage en force. Le défaut persistant des autres parties reste
`Unaided`.

## F4 — La dérive : **un second graphique aligné**, étiqueté, et **à évaluer sur pièces**

Options : **(a) superposer** sur la courbe existante — deux grandeurs différentes sur un même axe
0–100 : exactement ce que la condition d'acceptation d'US-14 interdisait (« aucune divergence entre
les vues »), un lecteur prendrait la nouvelle ligne pour commensurable avec les aires. **Rejeté.**
**(c) texte seul dans le récapitulatif** — le moins cher, mais D5 exigeait que la dérive soit
**visible comme une pente**, justement parce que c'est le chiffre qu'il faut pouvoir regarder avant de
croire un agrégat bâti dessus. **(d) des bandes sur la courbe** marquant les épisodes de dérive :
**impossible par construction**, D8 a supprimé les spans — il n'y a pas d'épisodes. (Noté parce que
c'est l'option la plus séduisante et qu'elle est déjà écartée par une décision prise.)

**Retenu (b) : son propre petit graphique, partageant l'axe des x** et aligné verticalement avec la
courbe, pour que le même ply soit à la même abscisse dans les deux — on compare **en regardant vers
le bas**, pas en démêlant deux séries. **Chaque graphique porte une étiquette visible** pour les
distinguer (exigence du demandeur) — ce qui touche légèrement US-14 : la courbe n'a **aucun titre
visible** aujourd'hui, elle en gagne un. Petit, et une amélioration.

**Précision qui dissout l'inquiétude « deux grandeurs »** : le tracé porte **une seule** grandeur, le
**cumul des winning chances perdues par le joueur**. La dérive n'est pas une seconde série dessus,
elle s'y **lit** : les Moves signalés sont les **falaises**, la dérive est la **pente entre elles**.
C'est mot pour mot la formulation de D5, et le dessin reste univoque.

**Question posée par le demandeur — est-ce vraiment utile, les deux graphiques ne disent-ils pas la
même chose ?** Réponse honnête :

- **La courbe oublie, le tracé se souvient.** La courbe est un **niveau**, donc elle se rétablit : on
  gaffe 40 points, l'adversaire les rend, la courbe revient à l'équilibre et la partie a l'air
  propre. Le tracé est monotone : ces 40 points y restent pour toujours. Un joueur qui se trompe sans
  cesse et s'en sort sans cesse se lit **correct** sur la courbe et **mauvais** sur le tracé. C'est
  précisément la question « est-ce que je joue bien, ou est-ce que je m'en sors ? », à laquelle la
  courbe est structurellement incapable de répondre.
- **La courbe mêle les deux joueurs, le tracé n'est que le vôtre.** Une baisse de la courbe peut être
  votre erreur **ou** un bon coup adverse ; la forme ne le dit pas. La pente du tracé parle toujours
  de vous.
- **La dérive est invisible sur la courbe à la résolution de lecture** : quinze Moves à −5 % font une
  pente douce indiscernable du frémissement ordinaire. Sur un cumul, c'est une montée régulière et
  chiffrable. C'est le cas que l'EPIC doit le plus voir, et celui que la courbe cache le mieux.
- **Redondance réelle, assumée** : sur une partie à une seule grosse gaffe sans rétablissement, la
  falaise de la courbe et celle du tracé sont **le même événement dessiné deux fois**. Le second
  graphique ne gagne sa place que dans les parties compliquées (rétablissement, erreurs mutuelles,
  saignement lent).

**Point de contrôle nommé, et non une intention vague** (« I want to build it to see it by myself ») :
après la sortie de 15a, le demandeur regarde **dix parties réelles** et décide si le tracé survit.
C'est la chose la moins chère à supprimer de tout le projet — dérivée côté client depuis des données
déjà chargées, ni schéma, ni migration, ni temps moteur — donc **pas d'ADR** : une décision qui ne
coûte rien à défaire échoue au premier test.
