# US-15a-bis — Approfondir l'analyse par partie avant de l'étendre

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-15a-bis-deepen-per-game-analysis`
Grilling : 2026-09-02 — [`GRILL-NOTES.md`](GRILL-NOTES.md), décisions **D1→D18**.
Coutures : [`SEAMS.md`](SEAMS.md).
ADR : [`0023-the-analysis-names-what-it-does-not-count`](../../docs/adr/0023-the-analysis-names-what-it-does-not-count.md),
[`0024-reproducibility-is-the-recap-s-not-the-engine-s`](../../docs/adr/0024-reproducibility-is-the-recap-s-not-the-engine-s.md).
`CONTEXT.md` : **non modifié** — aucun terme nouveau n'est livré par cette story.
Socle : US-15a livrée, US-23 mergée. Matière première :
[`COMPARISON-CHESSCOM.md`](../per-game-analysis/COMPARISON-CHESSCOM.md).

## Problem Statement

US-15a a livré une vue par partie que le demandeur juge « pas mal pour un premier jet ». Le problème
est que **US-15c est prête à bâtir dessus**, et qu'ADR-0017 fait de l'agrégat la **somme des
récapitulatifs par partie** : tout ce qui est approximatif ici devient approximatif à l'échelle du
corpus, en pire, et corrigé après coup il faudrait réécrire les deux côtés.

Une confrontation au bilan chess.com de la **même partie** a nommé le défaut, et il n'est pas
cosmétique. **Sur les mêmes 22 coups, ils en signalent 6 et nous 1** — et les trois que nous manquons
sont tous joués là où les chances de gain du Player valent entre 18 % et 6 %. Le seul que les deux
systèmes signalent est le seul joué dans une position encore disputée. Ce n'est pas un hasard, c'est
**la forme de la différence** : notre analyse est fine tant que la partie est vivante, **aveugle dès
qu'elle est jouée**.

L'angle mort est double, et ses deux moitiés sont indépendantes :

| | Ce que le Player ne peut pas savoir |
| --- | --- |
| **Saturation** | Sous 10 % de chances, rien n'est signalé **et** le coup sort du dénominateur. Toute la fin de chaque partie perdue est invisible — or « je m'effondre quand je suis derrière » est une faiblesse réelle, répétable et travaillable. |
| **Attribution** | L'adversaire de la partie 51 a joué à **96,1**, zéro faute, niveau estimé 1800. Notre app ne l'analyse pas et ne peut donc **jamais** dire « en face c'était très bien joué ». Le Player ne distingue pas *je me suis effondré* de *il a été trop fort* — deux conclusions opposées sur ce qu'il faut travailler. |

**La valeur pour le résultat et la valeur pour la progression ne sont pas la même chose, et l'outil
ne mesure que la première.** Un coup qu'un humain repère d'un coup d'œil et que l'app ne mentionne
pas est très concrètement ce qui fait douter de la méthode.

Et la solution évidente ne marche pas. **`Kc7` falsifie « il suffit d'abaisser un seuil »** : le coup
coûte 0,36 pion — 1,9 point de chances, sous le seuil d'imprécision de n'importe quel barème, en
chances **comme** en centipions — et chess.com le signale, parce qu'après `13.Nxf7+ Kc7?` `14.Nxh8`
emporte la tour. L'évaluation ne bouge pas parce qu'ils gagnaient déjà de quatre pions, mais **du
matériel a changé de camp**. Appliquer leurs seuils rapportés à **nos** évaluations, sans plancher ni
exclusion, donne **2** coups signalés, pas 6 : les seuils n'expliquent pas l'écart.

Trois défauts secondaires, tous relevés et jamais instruits sur des données : l'**échelle du tracé de
dérive** est par partie (`ceiling = total`), donc tout tracé finit en haut de sa boîte et l'œil lit
« hauteur = gravité » à tort ; les **seuils de `Phase`** sont des heuristiques jamais validées ; le
**plancher `Counted Move` à 10 %** n'a jamais été regardé sur de vraies parties, alors qu'il est le
dénominateur de 15c.

Enfin, la matière première du dossier **n'existe plus** : les parties 41, 51, 72, 86 portent
`analyzed = 0` et zéro `Evaluation`, et rien ne les reconstitue sinon du temps moteur (ADR-0015).

## Solution

Une story de **mesure et d'arbitrage**, pas de construction — mais dans cet ordre : deux prérequis,
puis une revue sur de vraies parties, puis les arbitrages qu'elle rend décidables.

**Le contrat de l'outil devient** (ADR-0023) : *« je vous dis ce qui a coûté la partie, **et** je vous
montre ce que je ne compte pas »*. Le dénominateur ne bouge pas d'un pouce — ADR-0017 et l'agrégat de
15c restent intacts — mais les coups de la zone morte sont **nommés**, via le cas « montré par la
partie, non retenu par l'analyse » que la tranche 04 d'US-15a a construit pour les coups forcés et
que personne n'a jamais atteint. Le mécanisme n'était pas mort ; il n'avait jamais tiré.

**Le prédicat qui remplit ce cas n'est pas choisi sur le papier.** Il est ce que la revue doit
produire, en calculant **cinq signaux** sur *tous* les coups du Player — signalés ou non, comptés ou
non — puis en regardant lequel **sépare** les coups que lichess signale et que nous manquons du
reste. Un signal qui ne sépare pas est écarté par les données, pas par une opinion. Et « aucun des
cinq ne sépare » est un **résultat légitime**, qui renverrait à assumer l'angle mort sur des données
plutôt que par lassitude.

Tout cela est **gratuit en temps moteur** : les cinq signaux se lisent dans des colonnes déjà
stockées (`fen`, `cp`, `mate`, `pv`, `cp2`), et les sévérités de l'adversaire se dérivent des mêmes
lignes — `evaluations` porte **une ligne par demi-coup, les deux couleurs confondues**, donc le
moteur a déjà cherché ces positions. Seule la constitution des corpus coûte du moteur : ~1 600
positions, ~33 minutes.

**Lichess est la référence de travail**, parce qu'il est **ouvert** : sa formule de précision est
publiée, ses seuils et son découpage de phases se lisent dans du code source. Un désaccord avec
lichess est diagnosticable ; un désaccord avec chess.com ne l'est jamais. Le second bilan chess.com
disponible reste **en réserve**, dépensé sur un cas que la revue fera émerger.

## User Stories

1. En tant que Player, je veux que l'app signale un coup où j'ai perdu une tour, même dans une
   position déjà perdue, afin de ne pas douter d'une méthode qui reste muette sur ce que je vois d'un
   coup d'œil.
2. En tant que Player, je veux que ces coups signalés hors dénominateur portent un **motif en mots**,
   afin de comprendre pourquoi l'app me les montre sans me les compter.
3. En tant que Player, je veux que le **motif d'exclusion** reste « la position était déjà décidée »,
   afin que le vocabulaire ne grossisse pas à chaque nuance ajoutée.
4. En tant que Player, je veux que le **signal** qui a déclenché l'affichage soit nommé — « du
   matériel a changé de camp », « le mat est passé de 7 à 1 » — afin de pouvoir le vérifier moi-même
   sur l'échiquier.
5. En tant que Player, je veux que le nombre de coups comptés, la dérive et le total de chances
   perdues soient **exactement les mêmes qu'avant** cette story, afin que ma confiance dans les
   chiffres ne soit pas remise à zéro.
6. En tant que Player, je veux lire l'échelle du tracé de dérive, afin de ne plus croire qu'une
   partie où j'ai peu perdu est aussi grave qu'une partie catastrophique.
7. En tant que Player, je veux une ligne repère à 100 % sur ce tracé, afin de savoir quand une partie
   m'a coûté plus que l'équivalent d'une partie entière.
8. En tant que Player, je veux que cette ligne soit **toujours visible**, afin qu'elle serve de
   repère sur toutes mes parties et pas seulement sur les catastrophes.
9. En tant que Player, je veux que le tracé finisse exactement sur le total affiché par le
   récapitulatif, afin de vérifier d'un coup d'œil que les deux disent la même chose.
10. En tant que Player, je veux savoir si mon adversaire a bien joué, afin de distinguer « je me suis
    effondré » de « il a été trop fort » — deux conclusions opposées sur ce que je dois travailler.
11. En tant que demandeur, je veux que cette mesure d'attribution porte sur la **partie encore
    disputée**, afin qu'elle ne me dise pas mécaniquement que tous mes adversaires jouent bien.
12. En tant que demandeur, je veux savoir quelle part de mes coups tombe sous le plancher « position
    déjà décidée », afin de savoir sur quel dénominateur US-15c va conclure.
13. En tant que demandeur, je veux savoir si le choix entre les deux lectures du cap de `Phase`
    change quelque chose, afin de clore le débat s'il est vide.
14. En tant que demandeur, je veux comparer notre découpage de `Phase` à celui de lichess, afin de
    disposer d'une référence externe plutôt que d'un avis.
15. En tant que demandeur, je veux qu'analyser deux fois la même partie sous le même régime produise
    des récapitulatifs comparés au chiffre près, afin de savoir si l'écart 60,6 / 56,5 est réel ou un
    artefact de rapport.
16. En tant que demandeur, je veux pouvoir changer un seuil et **rejouer** la comparaison sans
    ré-analyser, afin d'essayer quinze réglages plutôt que trois.
17. En tant que demandeur, je veux que le rapport lise **les mêmes fonctions** que l'app, afin de ne
    jamais comparer la méthode à une copie d'elle-même.
18. En tant que demandeur, je veux une ligne **par coup du Player** dans ce rapport, afin que le
    récapitulatif par partie en soit visiblement l'agrégat — la forme même du *fold* de 15c.
19. En tant que demandeur, je veux que les signaux soient relevés aussi sur les coups **non
    problématiques**, afin de voir qu'un signal vrai sur six coups manqués est peut-être vrai sur
    cent coups corrects.
20. En tant que demandeur, je veux que chaque désaccord avec lichess soit d'abord attribué — seuil ou
    moteur — afin de ne pas chercher un prédicat pour expliquer une différence de force de moteur.
21. En tant que demandeur, je veux deux corpus séparés, un par profil, afin que les taux restent
    interprétables au lieu de mêler deux joueurs de niveaux différents.
22. En tant que demandeur, je veux que les deux corpus soient en **blitz**, afin qu'un écart se lise
    comme un écart de joueur et non de cadence — et parce que c'est la cadence où je veux progresser.
23. En tant que demandeur, je veux que la partie 51 soit dans le corpus, afin de rétablir la pièce à
    conviction du dossier chess.com, qui n'existe plus en base.
24. En tant que demandeur, je veux que la partie 715 soit dans le corpus, parce que je l'ai lue
    moi-même et qu'elle m'a paru remarquable.
25. En tant que demandeur, je veux qu'au moins une lecture personnelle soit scellée **avant** d'avoir
    vu le moteur, afin de disposer d'un jugement humain non contaminé.
26. En tant que demandeur, je veux que le rapport me désigne lui-même les coups où la mécanique se
    trompe, afin de dépenser mon attention là où elle vaut quelque chose et pas sur quatre-vingts
    coups évidents.
27. En tant que demandeur, je veux qu'« aucun signal ne sépare » soit un résultat acceptable, afin de
    ne pas voir un agent inventer un prédicat pour éviter de rendre une conclusion négative.
28. En tant que demandeur, je veux décider moi-même du prédicat et de son seuil, afin que l'agent ne
    tranche pas un arbitrage produit à ma place.
29. En tant que demandeur, je veux que rien de tout cela ne coûte de migration ni de ré-analyse, afin
    de pouvoir retuner autant de fois qu'il le faut.
30. En tant que futur lecteur du dépôt, je veux comprendre pourquoi un glyphe s'affiche sur un coup
    exclu du dénominateur, afin de ne pas le prendre pour une incohérence.
31. En tant que futur agent, je veux comprendre pourquoi le driver moteur n'envoie jamais
    `ucinewgame`, afin de ne pas « réparer » un choix délibéré.
32. En tant que demandeur, je veux savoir combien de coups de mon corpus sont **forcés**, afin de
    vérifier que ce motif d'exclusion vaut encore la peine d'être distingué.
33. En tant que Player, je veux que l'app ne me félicite jamais pour avoir **copié** le coup du
    moteur, afin qu'elle ne m'enseigne pas l'imitation.
34. En tant que demandeur, je veux que la story s'arrête aux mesures et aux arbitrages, afin qu'elle
    ne devienne pas une story de construction sous prétexte que certaines features sont bon marché.

## Implementation Decisions

### L'ordre est imposé (D1)

Trois temps : **prérequis** (le tracé, le rapport), puis **la revue**, puis **les arbitrages**.
L'échelle du tracé est un prérequis parce qu'une revue faite en l'état jugerait l'encodage et non le
dessin. Ce qui rend cet ordre peu risqué : tout est **dérivé** (ADR-0009), donc corriger ne coûte ici
ni migration ni temps moteur.

### Le dénominateur ne bouge pas (ADR-0023)

`UncountedReason` garde ses **deux** valeurs, `forced` et `decided`. Un coup de la zone morte reste
exclu *comme décidé*, ce qui est vrai de lui. Ce qui est ajouté est un **second axe** : le **signal**
qui a fait qu'on le montre quand même. Deux questions distinctes — *pourquoi ce n'est pas compté* (le
motif, inchangé) et *pourquoi c'est montré* (le signal). Un troisième motif a été rejeté : il aurait
grossi un vocabulaire qu'ADR-0017 tient volontairement court et forcé 15c à décider quoi en faire.

Conséquence directe : **`gameRecap` ne change pas**. `countedMoves`, `excluded`, `chancesLost`,
`flaggedLoss + drift === chancesLost` sont identiques avant et après la story.

### Les cinq signaux, tous dérivés de colonnes existantes (D11)

| Signal | D'où il sort | Le coup qu'il vise |
| --- | --- | --- |
| Variation de **matériel** | comptage sur les `fen` de deux demi-coups consécutifs | `Kc7` (la tour perdue) |
| **Distance au mat** | la colonne `mate` | `Bd4` (M7 → M1) |
| Chute en **centipions** | la colonne `cp` | le calibrage brut |
| Séquence **forcée** | `pv`, et « un seul coup légal » depuis la `fen` | le motif d'exclusion existant |
| **Écart à la deuxième ligne** | `cp2` / `mate2` | « il n'y avait qu'un coup » — l'acuité de la position |

Le cinquième est un usage du **MultiPV 2** qu'US-15a a payé 2,1× et dont on ne tirait que la
`Best line`. Les cinq sont calculés sur **tous** les coups du Player, y compris non problématiques :
un signal vrai sur les six coups manqués mais aussi sur cent coups corrects ne sert à rien, et sans
le dénominateur complet on ne peut pas le voir.

**Le prédicat n'est pas choisi par ce PRD.** Il sort du test de discrimination. « Aucun des cinq ne
sépare » est un résultat livrable.

### Le rapport re-jouable (D7)

Un outil sous `server/`, **avec ses tests**, pas dans `.scratch/`. Il rend une **ligne par coup du
Player** — sévérité, motif d'exclusion, les cinq signaux, la `Phase` sous ses deux lectures, la
sévérité de l'adversaire — et le récapitulatif par partie en est l'agrégat. C'est déjà la forme du
*fold* de 15c.

**Contrainte dure** : il appelle `gameRecap`, `moveSeverities`, `countedMoves` — **jamais une copie**.
Une seconde implémentation de la méthode n'agréerait que par chance et divergerait en silence, ce
qu'ADR-0017 refuse explicitement. Le script ne calcule rien de la méthode, il met en forme.
`GET /api/games/:id/annotations` rend déjà le relevé par coup.

Le rapport **produit lui-même** la liste des coups où la mécanique se trompe — ceux qu'un signal
désigne et que personne ne signale, et ceux que lichess signale qu'aucun signal ne rattrape. Le
contrôle humain se **lit**, il ne se cherche pas.

### La reproductibilité (ADR-0024)

On n'exige rien du moteur. L'invariant est que les chiffres dérivent des `Evaluation`s **en base** —
déjà vrai, déjà testé. La discipline qui rend deux runs comparables : **retuner sur les lignes déjà
stockées, jamais en ré-analysant**. La différence entre deux réglages n'est alors jamais mêlée au
bruit moteur.

À mesurer quand même : analyser **deux fois** la partie 51 sous le même régime et comparer les
récapitulatifs au chiffre près, pour savoir si l'écart 60,6 / 56,5 est réel.

### L'attribution, mesurée sans être affichée (D12)

Les sévérités de l'adversaire se dérivent des mêmes lignes — coût moteur **zéro**, migration zéro.
Elles entrent dans le rapport et **rien n'est affiché dans l'app**. Aucun schéma, aucun seuil, aucun
dénominateur ne bouge.

**Réserve** : « zéro faute en face » n'est pas « il a bien joué ». Un adversaire qui ne fait aucune
faute dans une position gagnée depuis le coup 12 n'a rien prouvé. La mesure porte donc sur ses coups
**dans la partie encore disputée** — sinon elle dirait mécaniquement que tous les adversaires jouent
bien, le symétrique exact de notre propre angle mort.

### Le tracé de dérive (D8, D9)

Le **cumul total** est conservé : le tracé finit exactement sur le total que le récapitulatif affiche
à côté, vérifiable d'un coup d'œil — la promesse d'ADR-0017. Un tracé du résidu finirait sur un
nombre qui ne figure nulle part.

Trois changements : `ceiling = max(total, 100)`, une **ligne horizontale rouge à 100 %**, une
**échelle chiffrée à gauche**.

| Total | Le tracé finit… | La ligne rouge |
| --- | --- | --- |
| 5 % | tout en bas, quasi plat | tout en haut |
| 57 % | à 57 % de la hauteur | tout en haut |
| 191 % | en haut | à mi-hauteur (100/191) |

Le défaut disparaît **sous** 100 % et est **désamorcé** au-dessus : la ligne rouge devient elle-même
la règle graduée — deux tracés se comparent par la position du trait, repère de taille constante dans
une boîte de taille constante. Sans plafond arbitraire et sans écrêtage, qui aurait menti précisément
sur les parties que la story veut regarder.

Le graphique reste **écrit pour être supprimable** (dérivé client, aucun schéma, aucun temps moteur) :
le demandeur ne sait pas encore s'il est utile, et c'est trop tôt pour trancher.

### Les corpus (D5, D10)

**Deux corpus séparés, un par profil, tous en blitz**, ~20 parties. Stratification par corpus :
3 défaites où la partie bascule tôt, 2 défaites serrées, 2 victoires, 1 nulle, 1 partie à dérive
majoritaire, plus les obligatoires.

- **Obligatoires** : la **51** (DudulSmash, chess.com — la pièce à conviction, à ré-analyser) et la
  **715** (Metalyst, lichess — déjà analysée, 110 évaluations).
- Le blitz élimine le vrai facteur confondant : chez Metalyst, 5 cadences dont 23 défaites en
  correspondance et 5 en bullet — deux jeux différents. Bénéfice : les deux corpus deviennent
  **directement comparables entre eux**.
- **Contrainte matérielle** : DudulSmash n'a que **2 nulles**, toutes deux en blitz. La strate
  « 1 nulle » est réalisable mais sans marge.
- Coût : ~1 600 positions ≈ **33 minutes** (mesuré : ~1,25 s/position), dont 7 parties déjà analysées.

### La `Phase` : sensibilité, pas justesse (D14)

Le code est correct pour la lecture retenue — `capReached` teste `fullmove === 15 && toMove === "b"`,
soit « après le 15e coup des **Blancs** », et « développement achevé » est exigé des deux camps parce
que la `Phase` est celle de la partie. La `Phase` **n'entre dans aucun calcul** aujourd'hui.

On mesure donc : combien de coups changent de `Phase` selon la lecture du cap, et quel est l'écart au
**découpage lichess** (disponible et ouvert). Un coup par partie : le débat est vide, on le clôt.
Quinze : l'axe est fragile et 15c doit le savoir **avant** de bâtir dessus.

### Ce que la lecture de la 715 apporte (D18)

Scellée le 2026-09-02, 68 coups marqués, 9 notes. **`engine_seen_before_seal = 1`** : la lecture
n'est pas aveugle, donc les **sévérités déclarées** peuvent être ancrées sur ce que l'app montrait —
« l'humain a trouvé ce que l'app manquait » n'est **pas** une inférence disponible ici. Les **notes**,
elles, sont pleinement exploitables :

- **Coup 33** : le demandeur marque un coup **de l'adversaire** et demande l'attribution,
  spontanément et indépendamment de D12.
- **Coup 74** : « j'ai pas vu que ma tour était en prise » — un humain confirme le signal **matériel**
  sur une vraie partie, sans y avoir été invité.
- **Coup 67** : « gain manqué » — le concept de `Coup manqué` que le dossier listait comme un angle
  mort de notre côté.
- **Coup 56** : « il faut que je travaille 2 rooks VS Queen » — le demandeur produit lui-même le
  verdict que 15d vise.
- **Coups 43 et 50** : une note sans sévérité, et « on pourrait ajouter un indicateur : *je ne sais
  pas* ». Le vocabulaire de la `Declared severity` manque une valeur ; absence de marque et
  incertitude déclarée sont aujourd'hui indistinguables.

Les deux premiers points sont de la **matière de revue**. Les autres sont des **demandes produit**,
qui vont aux arbitrages ou en issues séparées.

### Vocabulaire positif : le principe seulement (D13)

Le glossaire a déjà tranché, à propos de la `Candidate line` : la coïncidence textuelle avec la
`Best line` « déclarerait une idée fausse pour avoir perdu 2 % des chances tout en déclarant juste un
coup **copié**. Cela enseignerait l'imitation. » Or « meilleur coup joué » **est** cette comparaison.

**Principe retenu** : un vocabulaire positif, s'il arrive, sera fondé sur le **coût** et jamais sur la
coïncidence. Et son seuil devra être **très bas**, bien en-deçà de 10 % — « n'est pas une faute » et
« est bien joué » sont deux barres différentes. **La feature est hors périmètre** ; le principe est
consigné pour qu'un agent futur ne réinvente pas l'interdit.

## Testing Decisions

Un bon test ici n'affirme que du **comportement externe** : ce qu'une fonction rend pour des lignes
`Evaluation` données, ce qu'un composant affiche, ce que l'API répond. Détail complet dans
[`SEAMS.md`](SEAMS.md).

| # | Couture | Art antérieur |
|---|---|---|
| 1 | Fonctions pures de **signal** sur des `Evaluation` stockées | `derivation.test.ts`, `counted.test.ts`, `winning-chances.test.ts` |
| 2 | **`gameRecap` inchangé** — non-régression | `recap.test.ts` |
| 3 | Sévérités de l'**adversaire**, l'autre couleur | `derivation.test.ts` |
| 4 | **Sensibilité de la `Phase`**, les deux lectures | `phase.test.ts` |
| 5 | Le **rapport**, sa fonction et non son enrobage | `stats.test.ts`, `confrontation-fold.test.ts` |
| 6 | Le **tracé** : logique pure et rendu | `driftTrace.test.ts`, `Board.test.tsx` |
| 7 | **FP agentique par tranche** | `docs/test-scenarios/` |

**La couture 2 porte l'assertion la plus importante de la story** : le dénominateur, la dérive et la
réconciliation sont **identiques** avant et après. Tout le reste peut bouger ; ça, non.

**Une seule couture nouvelle**, au point le plus haut : le rapport est une **fonction exportée** qui
rend des lignes ; toute CLI ou sortie fichier n'en est qu'une enveloppe mince, non testée séparément.
Ça permet de la tester sans base et sans moteur, sur les fixtures existantes.

**Explicitement hors des tests :**

- **Les conclusions de la revue ne sont pas des assertions.** Quel signal discrimine, quelle part de
  coups sous le plancher, quelle part de dérive : ce sont des **mesures rendues au demandeur**. Les
  figer ferait échouer la suite au premier retunage — l'exact contraire de la discipline d'ADR-0024.
  Même règle qu'US-15a avait appliquée à la mesure MultiPV.
- **Les bilans lichess** sont des données saisies à la main : ils entrent en fixtures, ils ne
  s'assertent pas.
- **Le temps moteur** est une mesure rapportée, jamais un test.

**Pyramide agentique** : chaque tranche porte sa **FP** exécutable comme gate d'auto-merge. Côté
**HP**, la tranche 01 se **greffe sur HP-01**, qui traverse déjà la page Analyse — pas de quatrième
HP, la limite de trois tient (même choix qu'US-14 et US-15a). Les tranches 02 à 05 ne livrent rien à
l'écran et n'ont pas de HP à porter ; la 06, si elle livre un prédicat, se greffe au même endroit.

## Out of Scope

- **US-15c** — l'agrégat sur tout l'historique. C'est ce que cette story débloque, pas ce qu'elle
  livre.
- **L'affichage de l'attribution.** Mesurée (D12), jamais montrée. La décision d'affichage se prendra
  sur le chiffre, en 15d.
- **Le vocabulaire positif.** Le principe est tranché (D13), la feature est reportée. C'est de
  l'affichage, et l'y glisser parce que « c'est pas cher » est la façon dont une story de mesure
  devient une story de construction.
- **La notion de `Coup manqué`** (le « gain manqué » du coup 67). Un concept nouveau, qui mérite son
  propre grill.
- **Une valeur « je ne sais pas » dans la `Declared severity`.** Demande réelle, issue séparée.
- **Un mode « apprendre de mes erreurs ».** Demande réelle, issue séparée.
- **Les autres cadences.** Le blitz est fixé (D10) ; la correspondance et le classique reviendront
  **après** la revue, quand « est-ce que le prédicat tient aussi en correspondance ? » sera une
  question nette.
- **Le bug « Analyser cette partie »** silencieusement avalé sous une bannière de pass non acquittée,
  l'écran montrant pendant ce temps la progression d'une **autre** partie. Antérieur à cette story,
  issue séparée. Le chemin de réanalyse de la tranche 07 d'US-15a n'est **pas** touché (re-testé).
- **Toute modification de `CONTEXT.md`.** Aucun terme nouveau n'est livré ; le glossaire bougera avec
  les features que cette story rend décidables.

## Further Notes

**La tranche des arbitrages est sans code, et c'est délibéré.** Comme la 06 d'US-11 et la 07 d'US-12,
c'est un point d'arrêt où l'agent s'arrête et le demandeur décide. Gardée explicite parce que les
stories précédentes ont montré qu'une décision implicite se fait prendre par l'agent.

**La tranche du prédicat peut ne rien livrer.** Si aucun des cinq signaux ne sépare, elle devient
« documenter l'angle mort ». C'est écrit ici pour qu'un agent ne se croie pas obligé de trouver
quelque chose.

**Trois prix corrigés au grill, à ne pas repayer :**

1. « Rien ici ne coûte de temps moteur » est **faux** — la matière première en coûte (~33 min), les
   arbitrages non.
2. « Analyser l'adversaire coûte le double par partie » est **faux** — `evaluations` porte une ligne
   par demi-coup, les deux couleurs.
3. « Le vocabulaire positif est quasi gratuit » est **faux** au sens où il était formulé — la version
   bon marché est celle que le glossaire interdit.

**Les données du dossier chess.com n'existent plus.** Parties 41, 51, 72, 86 : `analyzed = 0`, zéro
`Evaluation`, rien dans les cinq `.bak` ni les six worktrees. Elles ont été produites dans une base de
worktree éphémère, disparue avec lui. C'est le coût caché de la règle du worktree, et il mérite d'être
connu : **une mesure faite dans un worktree meurt avec lui**.

**Il faut au moins une lecture personnelle scellée avant d'avoir vu le moteur.** Celle de la 715 ne
l'est pas (`engine_seen_before_seal = 1`), et le drapeau d'US-16a fait exactement son travail en le
disant.
