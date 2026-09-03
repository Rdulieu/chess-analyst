# Sonde profondeur 20 — un run de test sur **une autre piste**

**Ce document n'est pas une tranche.** C'est un **run de test**, demandé le 2026-09-03, sur la piste
que la revue n'avait **pas** explorée : celle du **`Search regime`**, et non celle du plancher.

La contre-hypothèse à instruire était écrite au backlog par le demandeur le 2026-09-02 : *« à
profondeur 16 sur deux lignes, en blitz, un écart de 10 points de chances est du bruit autant qu'une
faute. Si le demandeur voit des coups faibles non signalés, la cause peut être le `Search regime` et
non le plancher. »* La sonde la teste. Elle **ne fait partie d'aucune AC**, elle n'a pas de FP, et
rien de l'app n'a changé.

## Ce qui a été fait, et ce qui n'a **pas** été touché

Trois parties : **715, 619, 587** — les seules du corpus qui portent un **bilan lichess**, donc les
seules où l'hypothèse est testable : c'est là que vivent les 15 coups que lichess signale et que nous
manquons. 241 positions.

**La base du demandeur n'a pas été touchée.** Changer de régime fait ré-évaluer la partie **entière**
(`analyzeGame` supprime puis réécrit), donc une passe à 20 sur le corpus l'aurait **détruit**. Tout a
tourné sur des **copies**, et les deux copies sont conservées pour que la mesure reste
re-vérifiable — la leçon de la double passe de la tranche 03, où la passe 6 a été écrasée avant
d'être notée :

| Fichier | Contenu |
| --- | --- |
| `server/chess-analyst.db.probe-depth16-repeat.20260903.bak` | les 3 parties **rejouées à 16** (passe 9) |
| `server/chess-analyst.db.probe-depth20.20260903.bak` | les 3 parties **à 20** (passe 10) |

**Trois bras, pas deux** — et c'est ce qui rend le résultat lisible. Sans le bras du milieu, tout
écart à 20 serait indistinguable du ±5,8 % qu'ADR-0024 a déjà mesuré à régime **inchangé** :

1. **profondeur 16, corpus** — la référence sur laquelle la revue est écrite (passes 5 et 7) ;
2. **profondeur 16, rejouée** — un processus neuf, mêmes parties : **le plancher de bruit** ;
3. **profondeur 20** — l'effet du régime.

La sonde appelle `analyzeGame`, la fonction de l'app : la profondeur atteint le moteur par
`pass.depth`, donc **aucune règle de la méthode n'a été réimplémentée** et le régime est enregistré
sur la ligne de passe. Le script est supprimé (jetable) ; il tenait en cinquante lignes.

## 1. Le temps — 8,2× pour rien, et le facteur croît avec la partie

| Partie | Positions | Profondeur 16 | Profondeur 20 | Facteur |
| --- | --- | --- | --- | --- |
| 587 | 61 | 78,7 s — **1,29 s/pos** | 499,7 s — **8,19 s/pos** | **6,3×** |
| 619 | 70 | 93,0 s — **1,33 s/pos** | 693,7 s — **9,91 s/pos** | **7,5×** |
| 715 | 110 | 215,5 s — **1,96 s/pos** | 1 995,9 s — **18,14 s/pos** | **9,3×** |
| **total** | **241** | **387 s — 1,61 s/pos** | **3 189 s — 13,23 s/pos** | **8,2×** |

Le facteur **augmente avec la complexité** : 715, déjà la plus chère à 16, est celle qui explose le
plus. Extrapolé au corpus entier (1 184 positions) : **4 h 21 contre 26 min**.

## 2. Les 15 coups manqués : profondeur 20 en rattrape **un**, un simple rejeu en rattrape **deux**

C'est le résultat central, et il se lit sur une seule ligne :

| Régime | Coups manqués devenus signalés |
| --- | --- |
| profondeur 16, corpus | **0 / 15** |
| profondeur 16, **rejouée** | **2 / 15** — 715/24 `Rd8` (10,8) et 587/29 `Bxe2` (11,4) |
| **profondeur 20** | **1 / 15** — 715/24 `Rd8` (11,8) |

**Le gain de la profondeur 20 est en-dessous du bruit du moteur**, mesuré sur la même expérience :
rejouer la *même* profondeur en signale **deux**, la profondeur 20 en signale **un**. Il n'y a rien à
expliquer là, sinon du hasard de table de transposition (ADR-0024).

Et les coûts eux-mêmes n'ont aucune direction. Ils oscillent de ±1 à 3 points **dans les deux sens**,
à profondeur 20 comme au rejeu :

| Partie / ply | Coup | d16 corpus | d16 rejeu | **d20** | lichess |
| --- | --- | --- | --- | --- | --- |
| 715 / 12 | `f5` | 5,6 | 5,2 | **3,3** | Inaccuracy |
| 715 / 24 | `Rd8` | 8,9 | **10,8** ⚑ | **11,8** ⚑ | Blunder |
| 715 / 26 | `Ne5` | 4,7 | 4,9 | 5,2 | Inaccuracy |
| 715 / 44 | `Bxg4` | 9,5 | 9,2 | **6,8** | Mistake |
| 715 / 106 | `Rxc4` | 0,0 `decided` | 0,0 `decided` | 0,0 `decided` | Mistake |
| 619 / 11 | `Bb5` | 5,5 | 4,3 | 5,4 | Inaccuracy |
| 619 / 13 | `Bxc6` | 4,2 | 5,0 | 4,8 | Inaccuracy |
| 619 / 15 | `e5` | 4,6 | 4,7 | 6,2 | Inaccuracy |
| 619 / 19 | `O-O` | 6,5 | 5,7 | 5,1 | Inaccuracy |
| 619 / 67 | `Rxf7` | 0,0 `decided` | 0,0 `decided` | 0,0 `decided` | Inaccuracy |
| 587 / 5 | `Nc3` | 3,8 | 4,3 | 3,7 | Inaccuracy |
| 587 / 17 | `Bd3` | 2,3 | 2,4 | 3,4 | Inaccuracy |
| 587 / 29 | `Bxe2` | 6,4 | **11,4** ⚑ | 9,4 | Inaccuracy |
| 587 / 37 | `d6` | 3,7 | 3,8 | 4,9 | Inaccuracy |
| 587 / 59 | `Re8` | 0,0 `decided` | 0,0 `decided` | 0,0 `decided` | Mistake |

**`715/44 Bxg4` est le cas qui tue l'hypothèse** : profondeur 20 fait *baisser* son coût de 9,5 à
6,8, donc l'**éloigne** du plancher. Une recherche plus profonde ne rend pas ces coups plus fautifs ;
elle les réévalue, dans les deux sens.

**Et les trois coups de la zone morte restent à 0,0 à toutes les profondeurs** — comme la revue
l'avait prédit : aucun seuil, aucun régime ne les rattrapera, parce qu'ils ne contribuent rien **par
construction**.

## 3. Effet de bord, et il va dans le mauvais sens : la zone morte **grossit**

| Partie | `decided` à 16 | `decided` à 20 | comptés à 16 → 20 |
| --- | --- | --- | --- |
| 715 | 14 | **16** | 40 → 38 |
| 619 | 8 | **10** | 25 → 23 |
| 587 | 1 | **2** | 29 → 28 |

Une recherche plus profonde voit une position perdue comme **plus** perdue, donc davantage de coups
tombent sous le plancher des 10 %. **La profondeur 20 rétrécit le dénominateur** au lieu de
l'élargir — l'exact inverse de ce que l'hypothèse cherchait, et une mauvaise nouvelle pour l'agrégat
d'US-15c.

## 4. Les récapitulatifs bougent, mais dans la bande de bruit

| Partie | d16 corpus | d16 rejeu | d20 | écart d20 vs corpus | écart du **rejeu** |
| --- | --- | --- | --- | --- | --- |
| 715 | 254,3 | 249,1 | 265,3 | **+4,3 %** | −2,0 % |
| 619 | 146,4 | 148,7 | 146,1 | **−0,2 %** | +1,6 % |
| 587 | 162,1 | 160,2 | 174,1 | **+7,4 %** | −1,2 % |

Aucune direction systématique, et le seul écart notable (587, +7,4 %) est du même ordre que le
+5,8 % qu'ADR-0024 a mesuré **à régime inchangé**. Le nombre de coups signalés ne bouge pas : 7, 3,
4 à 16 comme à 20.

## 5. L'attribution refaite : aucune amélioration démontrable

Des **5** désaccords attribués au **moteur** à profondeur 16 (notre meilleur coup diffère du leur) :

| Partie / ply | d16 corpus | d16 rejeu | d20 | lecture |
| --- | --- | --- | --- | --- |
| 715 / 26 `Ne5` | ≠ | **=** | **=** | résolu — mais **par le rejeu aussi**, donc du bruit |
| 587 / 37 `d6` | ≠ | **=** | **=** | idem |
| 619 / 11 `Bb5` | ≠ | ≠ | ≠ | **persiste** |
| 619 / 15 `e5` | ≠ | ≠ | ≠ | **persiste** |
| 587 / 59 `Re8` | ≠ | ≠ | ≠ | **persiste** |
| 619 / 67 `Rxf7` | = | = | **≠** | **la profondeur 20 en crée un nouveau** |

Les deux qui « se résolvent » à 20 se résolvent tout autant en rejouant 16 ; trois persistent ; et la
profondeur 20 **introduit un désaccord qui n'existait pas**. Net : **zéro gain démontrable** en
accord avec lichess.

## Conclusion

**La contre-hypothèse du `Search regime` est falsifiée sur cette matière.** La profondeur 20 coûte
**8,2× le temps**, ne rattrape qu'**un** des quinze coups manqués là où un simple rejeu à profondeur
16 en rattrape **deux**, ne change aucun compte de coups signalés, **rétrécit** le dénominateur, et
n'améliore pas l'accord avec lichess.

**Ce que cela règle pour l'arbitrage n° 6** (le plancher, dans
[`ARBITRATIONS.md`](ARBITRATIONS.md)) : l'alternative « creuser plutôt que baisser la barre » était la
seule raison documentée de ne pas toucher au plancher. **Elle est écartée par la mesure.** Les 12
coups manqués de la partie vivante sont un fait de **seuil**, et seule une décision sur le plancher
les fera apparaître.

**Ce que cela ne dit pas :** trois parties, un seul saut de régime (16 → 20), un seul backend (WASM
Lite, un thread). Une profondeur intermédiaire (18) n'a pas été essayée, ni un moteur natif — qui
serait plus rapide, mais mélangerait deux forces de moteur dans un corpus dont le but est justement
de comparer (et rien ne l'enregistrerait, cf. **US-38**).

## Décision du demandeur — 2026-09-03 : la piste est évacuée

> « Évacue la piste de l'analyse en depth 20, elle rallonge énormément l'analyse et les effets de
> bord sont négatifs. Ils s'éloignent de ce qu'un humain peut comprendre de la partie. »

Trois motifs, dont le troisième n'était pas dans la mesure et **la dépasse** :

1. **Le coût** — 8,2× le temps, mesuré.
2. **Les effets de bord sont négatifs** — la zone morte grossit, le dénominateur rétrécit.
3. **Et surtout : la profondeur éloigne l'analyse de ce qu'un humain peut comprendre de sa partie.**
   C'est un argument de **produit**, pas de budget, et il est cohérent avec la discipline que le dépôt
   s'est donnée : le glossaire refuse « erreur tactique » et montre **la ligne** ; ADR-0023 exige un
   signal **vérifiable sur l'échiquier** (« du matériel a changé de camp ») plutôt qu'un adjectif ;
   `Candidate line` refuse de créditer un coup **copié**. Un moteur qui creuse plus profond ne rend
   pas la partie plus lisible — il voit une position perdue comme plus perdue et **retire** des coups
   du dénominateur, c'est-à-dire qu'il en dit **moins** au Player, plus tard et plus cher.

**Conséquences, immédiates :**

- `ANALYSIS_DEPTH` **reste à 16** — la sonde n'a jamais touché au code, donc il n'y a rien à revenir.
- **La piste du régime est close** : elle n'est plus une alternative à l'arbitrage n° 6, ni une raison
  d'attendre pour décider du plancher. Le seul levier restant sur les 12 coups manqués de la partie
  vivante est **le plancher**.
- Une profondeur intermédiaire (18) **n'est pas à essayer** : la décision porte sur la direction, pas
  sur la valeur. Si la question revenait, ce serait sur un argument neuf — pas sur celui-ci.
- Les deux copies restent à côté de la base (`…probe-depth16-repeat…` et `…probe-depth20…`) : elles
  sont la seule preuve re-vérifiable d'une décision désormais consignée. Supprimables sur un mot.
