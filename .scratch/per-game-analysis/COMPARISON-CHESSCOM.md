# Comparaison de méthodologies — notre analyse contre celle de chess.com

**Statut** : données d'entrée pour l'arbitrage d'**US-15a-bis**. Ce document ne décide rien ; il
rassemble ce qui a été **mesuré** sur une partie réelle, ce qui est **documenté** chez chess.com, et
ce qui reste une **inférence**. Établi le 2026-08-23 à partir de captures du bilan chess.com fournies
par le demandeur et des données de notre propre API.

Il est rangé sous `per-game-analysis/` parce que c'est le même sujet qu'US-15a ; US-15a-bis n'a pas
encore été grillée et n'a donc pas de dossier à elle.

## La partie

Partie **51** de la base locale — `DudulSmash` (noirs) contre `Sarvarcikk`, blitz, défaite.
45 demi-coups, dont **22 sont ceux du Player**. Les deux systèmes classent bien **22** coups : on
compare la même chose.

## Ce qui est documenté, et ce qui ne l'est pas

**chess.com — documenté** : la précision est produite par **CAPS2** (« Computer Aggregated Precision
Score »), décrit comme « une mesure de votre jeu comparé au meilleur coup possible selon les moteurs
les plus forts ». Les scores tombent désormais « entre 50 et 95 » là où CAPS v1 saturait.

**chess.com — explicitement non divulgué**, leur centre d'aide le dit : la formule, la profondeur et
la force du moteur, la pondération des « meilleurs coups », **et les seuils exacts des
classifications**. C'est un secret commercial.

**Seuils rapportés par des sources tierces** (donc **non officiels**, à ne pas citer comme des
faits) : ~7-10 % de chances perdues pour une imprécision, 10-20 % pour une erreur, 20 %+ pour une
gaffe, sur la probabilité de gain — avec, selon une de ces sources, **une escalade sur les
centipions** pour que les positions décidées ne cachent pas les vraies erreurs.

**Notre méthode — intégralement publiée**, et c'est le point : chances de gain par la formule de
lichess (`50 + 50·(2/(1+e^(−0,00368208·cp)) − 1)`), seuils **10 / 20 / 30** dans `CONTEXT.md`,
plancher `Counted Move` à 10 %, et une arithmétique qui somme au chiffre près
(`flaggedLoss + drift = chancesLost`, vérifié à la sixième décimale).

## Les deux rapports sur cette partie

| | chess.com | Notre app |
| --- | --- | --- |
| Coups du Player classés | 22 | 22 |
| **Coups signalés** | **6** (3 imprécisions, 2 erreurs, 1 gaffe) | **1** (une erreur) |
| Coups positifs | 12 (7 Meilleur, 2 Excellent, 3 Bon) | **aucun** — pas de vocabulaire positif |
| Coups « théoriques » non notés | 4 | 0 — nous n'avons pas de livre d'ouvertures |
| Coups exclus du dénominateur | aucun | 5 (1 forcé, 4 « position déjà décidée ») |
| Score global | **Précision 77,7** (CAPS2, opaque) | **57,2 % de chances perdues**, dont **29,7 de dérive** |
| L'adversaire | **96,1**, zéro faute, niveau estimé 1800 | **non analysé** (les sévérités sont Player-only) |
| Autres sorties | `Coup manqué`, découpage par phase, estimation de niveau (1450) | `Phase` affichée, dérive, motif d'exclusion |

Calcul de contrôle : avec la formule **lichess publiée** appliquée à nos données, cette partie vaut
**83,5** (moyenne harmonique des précisions par coup) ou 90,2 (arithmétique). chess.com annonce
**77,7** : ils sont **plus sévères** que la formule lichess sur cette partie, ce qui est cohérent
avec un moteur plus fort qui voit plus de fautes.

## L'alignement des quatre coups — la pièce à conviction

Les quatre coups que chess.com met en avant, avec nos propres chiffres :

| Coup | Éval avant → après (nous) | Chances du Player | Notre chute | Nous | chess.com |
| --- | --- | --- | --- | --- | --- |
| **12. Nd7** | +0,39 → **+3,96** | 46,4 → 18,9 % | **27,5** | erreur `?` | **gaffe `??`** |
| **13. Kc7** | +4,09 → +4,45 | 18,2 → 16,3 % | **1,9** | *rien* | signalé |
| **16. Ke6** | +4,26 → +5,84 | 17,2 → 10,4 % | **6,8** | *rien* | signalé |
| **20. Bxb2** | +7,17 → +10,01 | 6,7 → 2,4 % | 4,3 | **exclu** | signalé |

Les chiffres du demandeur lus sur chess.com (+4,12 → +4,60 pour `Kc7`, +4,09 → +6,08 pour `Ke6`,
+7,9 → mat en 7 pour `Bxb2`) concordent avec les nôtres à 0,1-0,5 pion près : écart normal entre deux
moteurs, pas un désaccord de méthode. `Bxb2` est identifié par son évaluation ; l'identification de
la case reste à confirmer.

### Ce que cet alignement établit

1. **Les trois coups qu'ils signalent et que nous manquons sont tous dans la zone où notre métrique
   s'est éteinte** — les chances du Player y valent entre 18 % et 6 %. Le seul que les deux systèmes
   signalent, `Nd7`, est le seul joué dans une position encore disputée (46 %). Ce n'est pas une
   coïncidence : c'est **la forme exacte de la différence**. Notre analyse est fine tant que la partie
   est vivante et aveugle dès qu'elle est jouée ; la leur note jusqu'au mat.

2. **`Kc7` falsifie l'hypothèse « il suffit d'abaisser un seuil ».** Ce coup coûte **0,36 pion**, soit
   1,9 point de chances. Aucune règle en chances de gain n'en fait une faute, et aucune règle en
   centipions non plus (36 centipions est sous le seuil d'imprécision de n'importe quel barème).
   Pourtant chess.com le signale — et la position dit pourquoi : après `13.Nxf7+ Kc7?`, les blancs
   jouent `14.Nxh8` et **emportent la tour**. L'évaluation ne bouge presque pas parce qu'ils gagnaient
   déjà de quatre pions, mais du matériel a changé de camp.
   **Inférence, pas fait établi** : leur classifieur conserve une notion **concrète** — matériel,
   séquence forcée — que notre métrique en chances de gain efface par construction. Ni les seuils ni
   la formule n'étant publiés, cela ne peut pas être vérifié ; ce qui est vérifiable, c'est que leur
   méthode y **réussit** et que la nôtre y **échoue**.

3. **Le désaccord sur `Nd7` est d'une autre nature : un simple calibrage.** Même coup, même meilleur
   coup recommandé (`Ke8`), même effondrement, 27,5 points perdus. Notre ligne « gaffe » est à **30**,
   la leur (rapportée) à **20**. Nos seuils sont plus stricts aux trois niveaux.

4. **Le test de transposition** : en appliquant **leurs** seuils rapportés à **nos** évaluations, sans
   plancher ni exclusion, on obtient `Nd7` en gaffe, `Ke6` tout juste en imprécision (6,8 contre une
   ligne à 7), et **rien** pour `Kc7` ni `Bxb2` — soit **deux** coups signalés, pas six. **Les seuils
   n'expliquent donc pas l'écart à eux seuls** : il faut aussi un moteur plus fort *et* une composante
   qui n'est pas la chance de gain.

5. **La fin de partie est un zéro absolu, pas un petit chiffre.** Les trois derniers coups du Player :

   ```
   20. Bxb2   +7,17 → +10,01    6,7 % → 2,4 %     exclu
   21. Kf8       M8 →      M8    0,0 % → 0,0 %     exclu
   22. Bd4       M7 →      M1    0,0 % → 0,0 %     exclu
   ```

   `Bd4` fait passer le mat de **sept coups à un coup** et notre métrique enregistre **exactement
   zéro**. Une fois le mat sur l'échiquier les chances sont plancherées, donc plus rien n'est
   mesurable — et le coup est de toute façon hors du dénominateur.

## Avantages et inconvénients

### chess.com

**Avantages** — moteur nettement plus fort, donc jugement plus fiable coup par coup. Vocabulaire
**complet** : les bons coups sont nommés, pas seulement les fautes. Les **deux** joueurs sont
analysés, donc le Player peut voir s'il a perdu contre du bon jeu. Un score unique comparable entre
parties. Un `Coup manqué` qui nomme une occasion ratée. Un découpage par phase et une estimation de
niveau par partie. Et — le point établi ci-dessus — **la notation continue jusqu'au mat**.

**Inconvénients** — **rien n'est vérifiable** : impossible de reconstituer 77,7 ni de savoir pourquoi
un coup est « Bon » plutôt qu'« Imprécision ». Les seuils changent sans annonce, donc deux parties
analysées à six mois d'écart ne sont pas nécessairement comparables. Le score unique **agrège des
grandeurs de nature différente et ne se décompose pas**. Une partie des sorties est payante.

### Notre app

**Avantages** — **auditable de bout en bout** : chaque chiffre se retrouve à la main, la somme des
parts *est* le total, le dénominateur est affiché, et l'app dit **pourquoi** un coup ne compte pas —
ce que chess.com ne fait jamais. Un concept que ni chess.com ni lichess n'ont : la **dérive**, qui
répond à « j'ai perdu et je ne vois qu'une erreur » (ici la moitié des pertes ne vient d'aucun coup
signalé). Tout est **dérivé**, donc retunable sans temps moteur ni migration.

**Inconvénients** — moteur plus faible (profondeur 16, deux lignes, WASM). **Aucun vocabulaire
positif** : on ne dit jamais au Player qu'il a bien joué. Pas de livre d'ouvertures, donc les coups
théoriques sont jugés comme des choix personnels. Pas de score unique, donc pas de comparaison entre
parties. Et reproductibilité de nos propres chiffres **encore à établir** (57,2 / 56,5 / 60,6 sur
trois lectures de cette même partie).

## Les angles morts, de chaque côté

**Chez chess.com**

- **La dérive n'existe pas.** Leur rapport ne dit nulle part que la moitié des pertes ne vient
  d'aucun coup signalé. Le Player lit « 77,7 et trois imprécisions » sur une partie où il a lâché
  57 points de chances : une note, pas une décomposition. Un joueur qui saigne sans gaffer voit une
  précision honorable et n'apprend rien.
- **Le dénominateur est invisible** : impossible de savoir combien de coups ont réellement compté, ni
  comment un coup forcé est traité.
- **La non-reproductibilité** : un secret commercial qui évolue est, par construction, une méthode
  que le joueur ne peut pas juger. C'est exactement ce qu'ADR-0017 refuse pour nous.

**Chez nous**

- **La saturation des chances de gain.** Sous 10 %, rien n'est signalé **et** le coup sort du
  dénominateur : **toute la fin de chaque partie perdue est invisible**. Or « je m'effondre quand je
  suis derrière » est une faiblesse réelle, répétable et travaillable. L'angle mort le plus sérieux.
- **Aucune attribution.** Cette partie l'illustre parfaitement : l'adversaire a joué à **96,1**,
  niveau 1800, zéro faute. Notre rapport dit « vous avez perdu 57 % » sans jamais pouvoir dire « en
  face c'était très bien joué ». Le Player ne peut pas distinguer *je me suis effondré* de *il a été
  trop fort* — et ce sont deux conclusions opposées sur ce qu'il faut travailler. C'est **structurel**
  (les sévérités ne sont dérivées que pour le Player), et c'est ce qui menace le plus le verdict de
  15d.
- **Pas de notion d'occasion manquée** : leur `Coup manqué` couvre un cas que nous ne voyons pas.
- **Pas de livre d'ouvertures.**

## Options pour l'arbitrage

Aucune n'est décidée ; toutes sont des décisions du demandeur.

1. **Un second critère de sévérité qui ne soit pas une chance de gain** — chute en centipions, ou
   perte de matériel — actif là où le premier sature. `Kc7` montre qu'abaisser un seuil ne suffit
   pas : à 0,36 pion, aucun seuil raisonnable ne l'attrape.
2. **Le rendre « signalé mais non compté »** : le mécanisme **existe déjà** depuis la tranche 04 et
   n'a jamais été atteint. Le Player verrait `Kc7`, `Ke6`, `Bxb2`, `Bd4` marqués avec « ne compte pas :
   la position était déjà décidée », le dénominateur ne bougerait pas, et l'écart serait expliqué par
   la phrase que le récapitulatif sait déjà écrire. **Coût : un seuil de plus, alors qu'US-15a avait
   tenu à n'en ajouter aucun.**
3. **Analyser aussi l'adversaire**, pour rendre l'attribution possible. Coûte du temps moteur (le
   double par partie) et sort du cadre « cet outil parle de vous ».
4. **Un vocabulaire positif**, ne serait-ce que « meilleur coup joué ». Gratuit : la `Best line` est
   déjà stockée, la comparaison est une égalité de chaînes.
5. **Ne rien changer** et documenter l'angle mort. Défendable : la métrique mesure ce qui était en
   jeu, et signaler sur les centipions produirait dix-huit reproches sur une partie jouée au coup 25.

## Sources

- [How is accuracy in Analysis determined? — centre d'aide chess.com](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined)
- [Better Than Ratings? Chess.com's New 'CAPS' System](https://www.chess.com/article/view/better-than-ratings-chess-com-s-new-caps-system)
- [What Chess Players Need to Know About Chess.com's Accuracy Score](https://saychess.substack.com/p/what-chess-players-need-to-know-about)
- [Chess.com Move Classifications Explained](https://chesssolve.com/blog/chess-com-move-classifications-explained) — **tierce partie, seuils non officiels**
- [Lichess Accuracy metric](https://lichess.org/page/accuracy) — formule publiée, celle dont nous
  utilisons la conversion en chances de gain

## Ce que ce document ne sait pas

- **La formule de CAPS2**, la profondeur de leur moteur, et leurs seuils réels. Secret commercial.
- **Pourquoi `Kc7` est signalé chez eux.** L'explication par le matériel est une inférence tirée de la
  position, pas une règle constatée.
- **L'identification exacte de `Bxb2`** comme le coup « +7,9 → mat en 7 » du bilan chess.com : cohérente
  avec les évaluations, non confirmée sur leur écran coup par coup.
- **Si l'écart 1 contre 6 se retrouve sur d'autres parties.** Un cas n'est pas un échantillon — c'est
  la première chose à refaire, sur les dix parties de la revue déjà prévue.
