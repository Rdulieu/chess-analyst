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

## F5 — La `Best line` : flèche sur le plateau + **aperçu au survol**, la navigation reste à US-16

Options : **(a) texte seul** (`Bxh7+ Kxh7 Ng5+ Kg8 Qh5`) — bon marché et quasi inutile pour son objet :
lire une ligne de cinq plys demande de visualiser cinq positions, c'est-à-dire exactement la
compétence que le joueur n'a pas encore — **c'est pour ça qu'il a besoin de l'outil**. **(c) jouable**,
en parcourant la ligne sur le plateau : le plus instructif, mais il faut une vraie **branche** dans
l'historique (`history.ts` aplatit le PGN ; `cm-chess` sait le faire, ADR-0004 l'a choisi pour ça).

**Retenu (b) + (d)**, et **(c) explicitement hors de cette story** (confirmé par le demandeur) :

- **(b)** le texte **plus une flèche sur le plateau** pour le premier coup de chaque ligne (le coup
  qu'il fallait jouer, et le premier coup de la réfutation). `arrows.ts` + la prop `arrows` de
  `react-chessboard` existent déjà et sont utilisées sur la page Explorer — donc précédent et bon
  marché.
- **(d) aperçu** : pointer un coup **à l'intérieur** de la ligne affiche cette Position sur le
  plateau, temporairement. Bien moins cher qu'il n'y paraît : prévisualiser le ply *k* ne demande que
  de rejouer les *k* premiers coups UCI depuis la Position affichée — **aucun arbre, aucune branche,
  aucune variante stockée**, juste un FEN calculé à la volée, exactement ce que fait déjà `arrows.ts`
  pour trouver ses cases. La ligne cesse d'être cinq positions à imaginer pour devenir cinq positions
  à regarder.

**Pourquoi (c) est refusée ici, et ce n'est pas une question d'effort mais de propriété** : explorer
des variations **est** la feature d'US-16. En construire une version jetable ici, c'est soit la jeter,
soit — pire — **contraindre la conception d'US-16 par une décision prise en passant** en faisant autre
chose. Le rôle de 15a est d'auditer la méthode ; « ce qu'il fallait jouer, sur le plateau, avec la
suite lisible » y suffit.

Deux garde-fous :

- **L'aperçu doit être indubitablement temporaire** : il se retire quand on cesse de pointer, et il ne
  touche **jamais** `index`. `Board.tsx` est catégorique — `index` est la source unique de « où est le
  joueur » ; un aperçu qui fuiterait dedans casserait d'un coup le readout, la barre, la teinte de
  case et le curseur de la courbe.
- **Plafonner la ligne AFFICHÉE, pas la ligne stockée.** Une PV à profondeur 16 peut faire 15+ plys, et
  la queue est plus du bruit moteur que de l'instruction. On en montre les premiers (≈6 plys), le reste
  atteignable — **plafond d'affichage, jamais de stockage** (D6, ADR-0016).

## F6 — Marquer « ne compte pas » : **seulement là où c'est surprenant**

**Contradiction trouvée en chemin, et corrigée dans `CONTEXT.md`.** L'exemple d'accroche de l'entrée
`Counted Move` — « une partie où le joueur a joué quatre `Blunder`s peut légitimement contribuer
**zéro** erreur comptée » — était vrai sous la bande **symétrique** 85/15 de Q3. **D11 l'a remplacée
par la règle asymétrique** (exclure seulement sous le plancher `Inaccuracy`, 10 %), et les deux seuils
s'imbriquent : signaler demande une chute de **≥10 %**, donc au moins 10 % à perdre. **Une position
déjà décidée ne peut donc produire aucun Move signalé** — les deux ensembles sont disjoints par
construction, et un `Blunder` (30 % de chute) ne peut venir que d'au moins 30 %, jamais exclu.

Conséquence : **l'exclusion « déjà décidée » ne cache jamais une erreur, elle ne rétrécit que le
dénominateur** (ce qui reste son but — le biais du problème 2). En revanche **un coup forcé peut être
signalé** : un unique coup légal qui se trouve être une reprise catastrophique fait chuter les chances
comme n'importe quelle gaffe, et n'est la faute de personne. « Signalé mais non compté » survit donc,
**par la forcedness seule** — rare, réel, et incompréhensible sans explication.

**Retenu (b)** : marquer dans la liste **uniquement** les Moves qui portent une sévérité **et** ne
comptent pas. Rejeté **(a)** (un marqueur sur chaque ligne exclue) : dans une partie perdue au coup 25,
**tous** les Moves suivants sont exclus — dix-huit lignes, aucune surprenante, aucune ne cachant quoi
que ce soit, et dix-huit marqueurs qui concurrencent les trois qui comptent. Rejeté **(c)** (rien dans
la liste) : il faudrait parcourir 60 Moves pour découvrir un motif. `Board.tsx` dit explicitement que
ce panneau existe pour que la liste ne soit pas sous la ligne de flottaison : **la liste est la surface
de scan**, et le scan survit à trois marqueurs, pas à vingt-et-un.

Les exclusions « déjà décidée » sont donc dites **en agrégat** dans le récapitulatif (« 40 de vos 60
Moves comptés ; 18 exclus car la partie était jouée, 2 forcés ») et **individuellement** dans le
panneau de détail quand on tombe dessus.

**Non chromatique** : marqueur **textuel avec son propre `aria-label`**, à côté du glyphe de sévérité,
exactement comme `data-severity` aujourd'hui — le glyphe porte, la teinte renforce.

**Choix de modèle caché dans cette question d'affichage, tranché oui** : les deux motifs sont **nommés
distinctement** partout (« position déjà décidée » / « coup forcé »), jamais fondus en « non compté ».
Ils disent deux choses différentes — l'un que la position n'avait plus rien à perdre, l'autre qu'il n'y
avait pas le choix — et un joueur qui ne peut pas les distinguer ne peut auditer ni l'un ni l'autre.

## F7 — Le récapitulatif **absorbe** `ErrorTallyReadout` en `Detailed`

Collision qui n'était pas une question de placement : `ErrorTallyReadout` dit « Vos erreurs : 2
imprécisions ?! · 1 erreur ? » et compte **tous** les Moves signalés ; le récapitulatif dit « 3 erreurs
comptées » et ne compte que les `Counted Move`s. Depuis F6, **ces deux nombres peuvent légitimement
différer** (un Move signalé mais forcé compte dans le premier, pas dans le second). Deux résumés côte
à côte en désaccord d'une unité, c'est exactement la « divergence entre les vues » qu'US-14 s'était
engagée à éviter — et ici la divergence serait **correcte**, ce qui est pire : ça se lit comme un bug
sans en être un.

**Retenu (b)** : en `Detailed`, le récapitulatif **absorbe** le tally — un seul résumé, qui énonce les
deux chiffres **et la raison de leur écart** quand il y en a un (« 3 erreurs, dont 1 non comptée : coup
forcé »). En `Annotated`, le tally reste **exactement** ce qu'US-14 a livré. Rejeté **(a)** (les deux
côte à côte sans explication) et **(c)** (garder le tally et mettre le récap ailleurs : ça sépare
physiquement sans résoudre la contradiction — qui défile voit les deux de toute façon).

**Placement : en haut du nouveau panneau.** C'est le chiffre de réconciliation, donc la première chose
qu'on lit pour vérifier la méthode, et tout ce qui est en dessous en est la preuve coup par coup.

Contenu, en mots et en chiffres : Moves comptés sur le total du joueur, exclus par motif, erreurs
comptées, total des chances perdues, et la **dérive** — cette dernière servant aussi d'**équivalent
textuel** dû par le tracé (F4).

Coût assumé : en `Detailed` le tally apparaît une fois (dans le récap) et en `Annotated` à sa place
actuelle, donc la même information **change de place selon le mode**. Légèrement déroutant.
L'alternative — laisser le tally en place et faire que le récap y renvoie — échangerait ça contre deux
composants devant s'accorder sans source commune, ce qui est le pire mode de défaillance.

## F8 — La `Phase` s'affiche à **quatre distances de lecture**

Demandé par le demandeur : les trois options, plus les deux formes de la troisième.

1. **Étiquette dans le panneau de détail**, par Move — la réponse précise quand on étudie **un** coup.
2. **Marqueur de transition dans la liste des coups** — un séparateur **textuel** à la ligne où la
   phase change (« Milieu de partie », « Finale »). C'est **celui qui répond vraiment à D4** : la
   frontière devient une chose qu'on **voit en scannant**, c'est du texte (donc lu à voix haute, sans
   couleur), et ça atterrit dans la liste, déjà la surface de scan. Grâce au **latching**, la frontière
   de finale n'est franchie **qu'une fois** : **deux marqueurs au maximum** par partie, et zéro sur une
   miniature de 20 coups — l'objection de bruit qui a tué le marquage systématique en F6 ne s'applique
   donc pas ici.
3. **Sur les graphiques**, et il a fallu corriger la forme : des « bandes » de fond sont **impossibles**
   telles quelles. `EvaluationGraph` dessine **deux aires opaques** pleine hauteur — celle des Noirs est
   le fond de la boîte (feuille de style), celle des Blancs un `<polygon>` rempli par-dessus : ce qui est
   peint **derrière** est invisible. Et peindre **par-dessus** en semi-transparent teinterait les deux
   aires, ce qui déplacerait la seule cible mesurée avec soin par US-13 — les marqueurs de sévérité et le
   curseur ont des valeurs qui passent 3:1 **contre les deux aires à la fois** (ADR-0013 note
   explicitement que les 2,92:1 et 2,93:1 eyeballés d'US-14 ne suffisaient pas). Formes retenues :
   - **(i) des règles de frontière** — une ligne verticale à chaque transition, tracée par-dessus les
     aires. C'est **l'idiome existant** : `data-mark="equality"` est déjà une ligne par-dessus, avec une
     valeur choisie pour passer contre les deux. Deux lignes au plus, aucun teintage, aucun risque de
     contraste.
   - **(ii) un mince ruban étiqueté** aligné sur le même axe des x, **hors du tracé**, portant « Début /
     Milieu / Finale » en **vrai texte** — les phases sont **nommées**, pas seulement délimitées.

**Le ruban se place entre les deux graphiques** : le tracé de dérive partage le même axe des x (F4),
donc **un seul ruban étiquette les deux**. Meilleur résultat que des bandes : les phases sont nommées,
rien n'est teinté, et ça coûte un élément au lieu d'un par graphique.

**Note de méthode** : l'objection initiale contre le dessin (« mettre un fait uniquement dans une image
`aria-hidden` ») **ne survit pas** à l'option 2. L'invariant exige que chaque figure du dessin existe en
texte ailleurs ; dès que les frontières sont dans la liste en texte, les marques sur les graphiques sont
du **renforcement redondant** — ce que l'invariant autorise précisément.

## F9 — Le `Search regime`, et **on jette les analyses existantes**

**Le régime est un fait PAR PARTIE, pas par Move** : les lignes d'une partie peuvent venir de deux
passes (reprise en milieu de partie), mais la règle de D9 interdit de reprendre à travers un changement
de régime — donc **une partie a toujours un régime unique, par construction**. Il va donc dans le
récapitulatif, **une ligne** (« Analyse : profondeur 16, 2 lignes »). Le répéter par Move afficherait
90 fois la même valeur et suggérerait qu'elle peut varier.

**Décision du demandeur : on jette les analyses existantes** plutôt que de développer un correctif
temporaire. Donc **pas de gestion d'héritage, pas d'état `pv` null, `pv` requis**.

**Cela renverse ADR-0015**, prise trois jours plus tôt, qui dit noir sur blanc que « wipe and
re-import » n'est plus un plan, que **c'est une perte de données**, et qui prend précisément les
`Evaluation`s pour motif (« nothing rebuilds Evaluations but engine time »). **Et le demandeur a
raison : ADR-0015 n'avait pas anticipé ce cas.** Son argument pesait un coût de migration **borné**
contre un coût moteur **récurrent et non borné**. Ici le rapport est inversé : le script de migration
est trivial, mais **garder** ces lignes impose une branche dégradée **permanente** dans le code — un
état `pv` null dans le panneau, un message d'explication, une ligne de pass synthétique, et les tests
de tout ça — vivant pour toujours au service de 20 parties valant ~11 minutes de moteur. Le
« correctif temporaire », ce n'est pas la migration : **c'est le chemin `pv` null, qui ne disparaît
jamais**. ADR-0015 ne répond pas à cet argument.

**Périmètre à énoncer précisément** : on jette les lignes `evaluations` de **20 parties**, **pas la
base**. Profils, parties, PGN, ouvertures et `move_habits` restent ; la ré-analyse est une action du
joueur sur des parties déjà importées.

**Travail documentaire dû** : **amender ADR-0016** (elle spécifie aujourd'hui le pass synthétique
d'héritage) et **noter dans ADR-0015** que cette exception a été prise, et pourquoi.

## F10 — Lancer l'analyse depuis la page Analyse, avec avertissement d'écrasement

Aujourd'hui la page n'offre « Analyser cette partie » **que** si la partie n'est pas analysée (le
toggle prend la place sinon). Le demandeur veut pouvoir **relancer** l'analyse depuis cet écran, avec
une **confirmation** prévenant qu'on va écraser une analyse existante.

**Précédent exact à suivre** : `ProfilesPage.tsx:151` confirme la suppression d'un profil par une carte
`role="alertdialog"` **en page**, qui **nomme la chose détruite** (« Supprimer le profil **X** ? Cette
action est définitive »), avec **Annuler en action primaire**. Même classe d'acte, donc même motif :
nommer la partie, dire ce qui est perdu **et ce que coûte sa reconstruction** (« son analyse actuelle
sera écrasée — environ N minutes de calcul »), Annuler primaire.

Écarté : le `confirm()` natif d'`ImportForm.tsx:69`. Ce cas-là avertit d'une **durée**, celui-ci d'une
**destruction**, et la carte stylée peut nommer le coût là où une boîte de dialogue navigateur ne peut
pas être supposée lue.

**Conséquence serveur, trouvée en posant la question du front** (dans le périmètre de 15a) : **rien ne
permet aujourd'hui de ré-analyser une partie analysée.** `analyzeGame` lit le drapeau `analyzed`
d'abord et sort immédiatement ; le job filtre sur `!game.analyzed` avant même d'ouvrir un pass. Le
mécanisme existe déjà dans ADR-0016 (un régime différent réévalue la partie entière) mais **le
court-circuit `analyzed` est placé avant que quoi que ce soit ne regarde le régime** : ce réordonnancement
est un item réel de la story, pas un détail. Avec F9 (on jette l'existant), il faut de toute façon un
chemin explicite « réanalyser cette partie », déclenché par le joueur et confirmé.
