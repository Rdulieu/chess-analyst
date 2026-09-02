# US-15a-bis — les deux corpus blitz

Tranche [`03`](issues/03-the-two-corpora.md). Constitués le **2026-09-02**, dans la base **réelle**
du demandeur (`server/chess-analyst.db`) et non dans un worktree : le PRD note que *« une mesure
faite dans un worktree meurt avec lui »*, et c'est précisément ce qui a détruit les données du
dossier chess.com. Sauvegarde prise avant toute écriture :
`server/chess-analyst.db.pre-US15a-bis-03.20260902-193000.bak` (716 parties, 522 `Evaluation`s,
5 `Analysis pass`es).

## La règle de sélection, énoncée avant de sélectionner

Par corpus : **les parties blitz les plus récentes** de chaque classe de résultat — **6 défaites,
3 victoires, 1 nulle** — plus les parties **obligatoires** (la 51 et la 715) et les parties blitz du
profil **déjà analysées** (elles sont gratuites). Dix parties par corpus, la **même** répartition
6/3/1 des deux côtés, pour que les taux se comparent entre corpus.

La récence est une règle, pas un choix : elle est vérifiable et elle n'ouvre aucune porte au
cherry-picking. Ce qu'elle ne peut pas faire, c'est trier les défaites selon la **stratification**
demandée (« 3 défaites où la partie bascule tôt, 2 défaites serrées, 1 partie à dérive
majoritaire ») : « basculer tôt » et « dériver » ne se savent **qu'après** l'analyse. La
stratification est donc **constatée après coup** et rapportée telle quelle, avec ses trous s'il y en
a — un critère mesuré vaut mieux qu'un critère devinné à la longueur du PGN.

Les critères de classement, fixés d'avance :

- **Bascule tôt** : la part des coups du Player exclus comme `decided` (sous le plancher des 10 % de
  chances) — c'est la zone morte que la story vise, et elle se lit dans le récapitulatif.
- **Défaite serrée** : une défaite qui n'a **aucun** coup `decided`, ou presque.
- **Dérive majoritaire** : `drift > chancesLost / 2` — plus de la moitié des chances perdues
  qu'aucun coup signalé n'explique.

## Corpus 1 — DudulSmash (chess.com), blitz

Dix parties, **toutes de 2026** (16 juin → 29 août). Mesures issues du rapport de la tranche 02, sur
les `Evaluation`s de la passe **6** (profondeur 16, 2 lignes) : les dix **se réconcilient** avec le
récapitulatif que l'app affiche.

| Partie | Date | Rés. | Coups | Comptés | `decided` | `forced` | Signalés | Perdues | Dérive | `decided` % | Dérive % | Strate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **51** | 06-16 | D | 22 | 17 | 4 | 1 | **1** | 59,2 | 31,4 | 18 | 53 | bascule tôt · **obligatoire** · double passe |
| 161 | 08-12 | D | 22 | 14 | 5 | 3 | 6 | 132,1 | 13,3 | 23 | 10 | bascule tôt · déjà analysée |
| 713 | 08-29 | D | 42 | 29 | 13 | 0 | 4 | 127,5 | 72,9 | **31** | 57 | bascule tôt |
| 712 | 08-29 | D | 22 | 20 | 0 | 2 | 3 | 114,7 | 27,1 | **0** | 24 | défaite serrée |
| 709 | 08-18 | D | 77 | 71 | 5 | 1 | 5 | 275,9 | 86,7 | 6 | 31 | défaite serrée |
| 708 | 08-16 | D | 35 | 29 | 6 | 0 | 1 | 86,4 | 59,6 | 17 | **69** | dérive majoritaire |
| 710 | 08-25 | V | 29 | 29 | 0 | 0 | 4 | 161,6 | 38,5 | 0 | 24 | victoire |
| 706 | 08-15 | V | 47 | 47 | 0 | 0 | 2 | 76,7 | 42,2 | 0 | 55 | victoire |
| 163 | 08-12 | V | 43 | 43 | 0 | 0 | 3 | 166,2 | 38,6 | 0 | 23 | victoire |
| 703 | 08-14 | N | 19 | 19 | 0 | 0 | 2 | 72,5 | 21,7 | 0 | 30 | nulle |

**La stratification est intégralement remplie** : 3 défaites qui basculent tôt, 2 serrées, 1 à dérive
majoritaire, 3 victoires, 1 nulle. Elle a été **constatée** sur les mesures, pas décidée avant.

> La 51 a été analysée **deux fois** (voir la section suivante) : la ligne ci-dessus porte les
> chiffres de la **seconde** passe, qui est celle que la base contient désormais. La première donnait
> 56,0 et 29,2.

**La pièce à conviction du dossier chess.com est rétablie, et elle se reproduit.** La 51 — dont le
PRD constate que les données « n'existent plus » — rend exactement **22 coups du Player et 1 seul
coup signalé**, les deux chiffres sur lesquels repose ADR-0023 (« sur les mêmes 22 coups, ils en
signalent 6 et nous 1 »). Ses **4** coups exclus comme `decided` sont les coups de la zone morte que
le dossier situait entre 18 % et 6 % de chances.


## Corpus 2 — Metalyst (lichess), blitz

Dix parties, dont **trois de 2026** et sept de 2021–2023 : voir le biais n° 1, qui est la
conséquence directe de la disponibilité (Metalyst n'a que trois parties blitz en 2026). Mesures
issues de la passe **7** (profondeur 16, 2 lignes) ; les dix **se réconcilient**.

| Partie | Date | Rés. | Coups | Comptés | `decided` | `forced` | Signalés | Perdues | Dérive | `decided` % | Dérive % | Strate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **715** | 2026-09-01 | D | 54 | 40 | 14 | 0 | 7 | 254,3 | 57,6 | 26 | 23 | bascule tôt · **obligatoire** · bilan lichess |
| 622 | 2023-08-04 | D | 57 | 32 | 25 | 0 | 6 | 181,3 | 41,4 | **44** | 23 | bascule tôt |
| 619 | 2021-02-10 | D | 35 | 25 | 8 | 2 | 3 | 146,4 | 42,1 | 23 | 29 | bascule tôt · bilan lichess |
| 592 | 2021-01-07 | D | 22 | 21 | 0 | 1 | 9 | 281,9 | 17,7 | **0** | 6 | défaite serrée |
| 591 | 2021-01-07 | D | 30 | 30 | 0 | 0 | 3 | 191,8 | 74,1 | **0** | 39 | défaite serrée |
| 587 | 2021-01-06 | D | 30 | 29 | 1 | 0 | 4 | 162,1 | 122,7 | 3 | 24 | défaite serrée · bilan lichess |
| 716 | 2026-09-02 | V | 48 | 48 | 0 | 0 | 7 | 145,0 | 63,9 | 0 | 44 | victoire |
| 714 | 2026-08-25 | V | 37 | 37 | 0 | 0 | 1 | 111,6 | 73,6 | 0 | **66** | victoire · dérive majoritaire |
| 621 | 2023-08-04 | V | 38 | 38 | 0 | 0 | 10 | 230,0 | 24,6 | 0 | 11 | victoire |
| 582 | 2021-01-04 | N | 35 | 35 | 0 | 0 | 4 | 125,6 | 70,5 | 0 | 56 | nulle |

**La stratification est intégralement remplie** ici aussi, et avec la **même** répartition 6/3/1 que
l'autre corpus — ce qui est ce qui rend deux taux comparables entre eux.

## Le temps moteur, mesuré

| Passe | Profil | Parties | Positions | Durée | Par position |
| --- | --- | --- | --- | --- | --- |
| 6 | DudulSmash | 9 | 683 | 17 min 18 s | **1,52 s** |
| 7 | Metalyst | 7 | 501 | 8 min 41 s | **1,04 s** |
| **total** | | **16** | **1 184** | **26 min** | **1,32 s** |

Le budget du PRD — ~1 600 positions à ~1,25 s, soit ~33 min — **tient** : moins de positions que
prévu parce que quatre parties blitz étaient déjà analysées, et le même prix par position. Le chiffre
est **rapporté, jamais asserté** (SEAMS).

Backend : **WASM Stockfish 18 Lite**, un seul thread — le défaut de l'app, donc le même moteur que
les quatre parties déjà en base. Aucun `STOCKFISH_PATH` : un moteur natif serait plus rapide et
mélangerait deux forces de moteur dans un corpus dont le but est justement de comparer.

## La double passe sur la 51 — l'écart 60,6 / 56,5 est réel, et il ne déplace aucun verdict

La 51 a été analysée deux fois sous le **même** régime (profondeur 16, 2 lignes) : passe **6** puis
passe **8**, la seconde en `overwrite`. Ce que le PRD demandait de savoir, comparé au chiffre près.

| | Passe 6 | Passe 8 | |
| --- | --- | --- | --- |
| Coups du Player | 22 | 22 | identique |
| Comptés | 17 | 17 | identique |
| Exclus | 1 forcé, 4 décidés | 1 forcé, 4 décidés | identique |
| Coups signalés | 1 | 1 | identique — **et le même coup**, `12...Nd7` (mistake) |
| Erreurs comptées | 1 | 1 | identique |
| **Chances perdues** | **55,96** | **59,21** | **+3,25 points (+5,8 %)** |
| dont signalées | 26,76 | 27,82 | +1,06 |
| **Dérive** | **29,20** | **31,39** | **+2,19** |

**16 des 22 coups changent de coût**, de 0,3 à 1,2 point chacun ; **aucun** ne change de sévérité ni
de statut dans le dénominateur.

**Réponse, donc : l'écart est réel.** Il n'était pas un artefact de lecture croisée entre deux
rapports. Sa **forme** est celle qu'ADR-0024 décrivait : le moteur ne remet jamais sa table de
transposition à zéro, donc l'évaluation d'une position dépend de ce qui a été cherché avant elle —
et deux passes sur la même partie ne voient pas les positions dans le même contexte. L'ordre de
grandeur ici (+5,8 % sur le total) est du même ordre que le 60,6 / 56,5 du dossier (+7,3 %).

**Et la décision d'ADR-0024 tient sans être amendée** : ce qui bouge est la **magnitude**, jamais le
verdict. Le dénominateur, les exclusions par motif, le nombre de coups signalés et *lequel* sont
identiques. La discipline qu'elle impose — **retuner sur les lignes déjà stockées, jamais en
ré-analysant** — est exactement ce qui protège la revue : deux réglages comparés sur les mêmes lignes
ne mêlent jamais leur écart à ces 3,25 points de bruit moteur.

**Conséquence pratique pour la tranche 04** : un seuil se compare sur un corpus **figé**. Toute
mesure qui exigerait de ré-analyser serait bruitée à ±6 % sur les totaux.

Note au passage : `13...Kc7`, le coup sur lequel ADR-0023 fonde sa falsification, coûte **1,12** en
passe 6 et **2,27** en passe 8 — deux fois très loin sous le plancher de n'importe quel barème, dans
les deux passes. La falsification tient.

## Le biais, noir sur blanc

L'AC de la tranche demande que le biais soit écrit. En voici cinq, dont un que le grill n'avait pas.

### 1. Les deux corpus ne sont pas contemporains — et c'est structurel

C'est le biais le plus lourd, et il n'était **pas connu au grill**. Chez Metalyst, le blitz est un
jeu du passé :

| Année | Parties blitz de Metalyst |
| --- | --- |
| 2018 | 1 |
| 2019 | 17 |
| 2020 | 45 |
| 2021 | 17 |
| 2023 | 2 |
| **2026** | **3** |

Les **trois** parties blitz de 2026 sont précisément les trois déjà analysées (714, 715, 716). Tout
corpus blitz de dix parties chez Metalyst **remonte donc à 2021 ou 2020**. En face, DudulSmash a
**161** parties blitz, **toutes en 2026** (depuis le 11 mai).

D10 avait choisi le blitz des deux côtés pour éliminer le facteur confondant de la **cadence**, avec
ce bénéfice annoncé : « les deux corpus deviennent directement comparables entre eux, donc un écart
se lit comme un écart de joueur et non de cadence ». Ce bénéfice est **affaibli** : un écart entre
les deux corpus se lit désormais comme un écart de joueur **ou de cinq années**, et l'on ne peut pas
les séparer. Le même joueur en 2021 et en 2026 n'est pas le même joueur.

Les trois options, et pourquoi celle-ci :

- **Garder le blitz sur dix parties** (ce qui est fait) : la stratification est réalisable, le
  paramètre décidé au grill n'est pas modifié en silence, et les analyses produites ne sont jamais
  perdues (ce sont de vraies parties du Player). Le prix est ce biais temporel.
- **Metalyst réduit à ses 3 parties blitz de 2026** : contemporain, gratuit (déjà analysées), mais
  aucune nulle, aucune strate, et un corpus de 3 ne porte aucun taux.
- **Metalyst en rapide** (181 parties, contemporaines) : contemporain et fourni, mais c'est
  **changer la cadence**, donc défaire D10 — un arbitrage du demandeur, pas d'un agent.

**À arbitrer par le demandeur** (tranche 05). Rien n'est perdu dans l'attente : le rapport se rejoue
à coût nul sur n'importe quel sous-ensemble.

### 2. La récence sélectionne un état de forme, pas un échantillon aléatoire

Les six défaites les plus récentes d'un joueur ne sont pas six défaites tirées au sort. Chez
DudulSmash elles tiennent en **quinze jours** (16→29 août 2026) : une même période, un même niveau
d'adversité, peut-être une même mauvaise passe. Le choix est assumé — c'est l'échantillon dont le
demandeur se souvient et sur lequel il peut juger — mais aucun taux ici ne vaut pour « ses parties »
en général.

### 3. La strate « nulle » n'a aucune marge chez DudulSmash

Deux nulles en tout, toutes deux en blitz (le grill l'avait relevé). La nulle du corpus est donc la
seule récente, sans alternative : si elle est atypique, rien ne le dira.

### 4. La référence extérieure est bien plus mince que la story ne le supposait

C'est le second constat imprévu.

| | DudulSmash (chess.com) | Metalyst (lichess) |
| --- | --- | --- |
| Bilans du site disponibles | **0** | **3 sur 10** (715, 619, 587) |
| Découpage de phases du site | 0 | **10 sur 10** |

Lichess ne conserve d'analyse machine que pour les parties dont **quelqu'un l'a demandée** : trois
du corpus en ont une (fetchées le 2026-09-02, versées dans
[`lichess-reports.json`](lichess-reports.json)). Les sept autres n'en ont pas, et en obtenir une
demanderait de lancer une analyse **sur le compte du demandeur**, chez lichess — une action sur un
service extérieur qu'aucun agent ne prend de sa propre initiative.

Côté chess.com, il n'existe **rien** : le PRD garde un second bilan « en réserve », dépensé sur un
cas que la revue fera émerger.

Conséquence directe pour la tranche 04 : **le test de discrimination porte sur trois parties, toutes
du même profil et du même site.** C'est peu, il faut le dire, et cela ne suffit pas à conclure
positivement sur un prédicat — alors que cela suffit très bien à en **falsifier** un.

En revanche le **découpage de phases** de lichess est disponible pour les dix parties Metalyst, sans
analyse machine : la mesure D14 est donc, elle, complète de ce côté.

### 5. La lecture personnelle non contaminée n'est pas livrable par un agent

L'AC « au moins une lecture personnelle est scellée avec `engine_seen_before_seal` à faux » est la
seule de la tranche qu'un agent ne peut pas honorer : une `Personal analysis` est le **jugement du
demandeur**, et des marques posées par un agent ne seraient pas une lecture humaine — elles seraient
une lecture de machine déguisée en humain, exactement ce que le drapeau existe pour empêcher. La
lecture de la 715 porte `engine_seen_before_seal = 1` et reste donc contaminée (D18).

**Reste au demandeur** : ouvrir une partie du corpus en `Sans aide`, la lire, la sceller. Le corpus
est prêt pour ça.

## Ce que la tranche livre, et ce qu'elle laisse

**Livré** : vingt parties analysées sous profondeur 16 / 2 lignes dans la base **réelle**, les deux
corpus stratifiés et documentés, la 51 rétablie et analysée deux fois avec l'écart chiffré, les
bilans lichess disponibles versés en fixtures
([`lichess-reports.json`](lichess-reports.json), et [`lichess-reference.json`](lichess-reference.json)
au format que `--reference` attend), le temps moteur rapporté.

**Laissé au demandeur** :

1. **Sceller une lecture personnelle non contaminée** — un agent ne peut pas produire un jugement
   humain (biais n° 5).
2. **Arbitrer le corpus Metalyst** : blitz sur cinq ans, blitz sur trois parties, ou rapide
   contemporain (biais n° 1).
3. **Décider comment obtenir davantage de référence extérieure** : demander l'analyse lichess sur
   les sept parties qui n'en ont pas, ou dépenser le second bilan chess.com tenu en réserve
   (biais n° 4).

## Comment rejouer tout ceci

Aucun de ces chiffres n'exige de ré-analyser quoi que ce soit :

```
cd server
DB_FILE=<la base> npx tsx src/review/report-cli.ts 51 161 713 712 709 708 710 706 163 703 --json
DB_FILE=<la base> npx tsx src/review/report-cli.ts 715 622 619 592 591 587 716 714 621 582 --json \
  --reference ../.scratch/deepen-per-game-analysis/lichess-reference.json
```

Ajouter `--set material=2` (ou `mateCloser`, `cpDrop`, `secondLineGap`) pour déplacer une barre : le
rapport se relit sur les **mêmes** lignes stockées, sans une seconde de moteur.
