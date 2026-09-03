# US-15a-bis — la revue : ce que les données disent

Tranche [`04`](issues/04-the-review.md), conduite le **2026-09-02** sur les deux corpus de la
tranche [`03`](issues/03-the-two-corpora.md) — vingt parties, **744 coups du Player**, toutes les
mesures issues du rapport de la tranche 02 sur des `Evaluation`s **figées** (aucune ré-analyse : la
double passe a montré qu'elle bruiterait les totaux de ±6 %).

**Aucun chiffre de ce dossier n'est une assertion de test** (SEAMS) : ce sont des mesures rendues au
demandeur, et les figer ferait échouer la suite au premier retunage.

## Résumé exécutif

1. **Le signal qui sépare est la chute en centipions** — 6× d'enrichissement — mais il tire aussi sur
   93 % des coups que l'app signale déjà : c'est largement *la sévérité dans une autre unité*.
2. **Et la question était mal posée.** L'écart avec lichess n'est pas, pour l'essentiel, l'angle mort
   de la zone morte : **12 des 15 coups manqués ont été joués dans des positions que nous
   comptons**, chacun coûtant 2,3 à 9,5 points — c'est-à-dire **juste sous le plancher publié de
   10 points**. Onze des quinze sont des *Inaccuracy* dans le vocabulaire de lichess.
3. **L'angle mort de la zone morte est réel mais petit** — 3 des 15 — et le signal **matériel** les
   atteint **tous les trois**, à une barre d'**une pièce**, pour 0,6 coup par partie. C'est exactement
   la forme du `Kc7` d'ADR-0023.
4. **Les deux mécanismes sont donc complémentaires, et les données disent lequel fait quoi** : un
   plancher plus bas rattrape les 12 premiers ; **aucun seuil ne rattrapera jamais les 3 autres**,
   qui coûtent 0 point par construction.
5. **Le débat sur la lecture du cap de `Phase` est vide** : 0,8 % des coups changent, dans les deux
   corpus. Il peut être clos.
6. **Notre frontière de finale est exacte** — identique à celle de lichess sur **9 parties sur 9**.
   Notre frontière de milieu de partie, elle, est un **artefact du cap** dans 16 parties sur 20.

## 1. Le test de discrimination

**La matière** : les trois parties Metalyst dont lichess conserve une analyse machine (715, 619,
587). Sur ces trois parties, la référence a été **entièrement posée** (12, 8 et 9 plies, tous
retrouvés sur un coup du Player — le rapport le dit lui-même).

**Le premier fait, avant tout test** : sur ces trois parties, **nos coups signalés sont un
sous-ensemble strict des leurs**. Lichess en signale 12, 8 et 9 ; nous 7, 3 et 4 ; **aucun** coup que
nous signalons n'est ignoré par eux. Nous ne sommes pas plus sévères ailleurs — nous sommes
uniformément plus muets.

| Signal | tire sur les 15 coups manqués | tire sur les 90 coups que personne ne signale | enrichissement | précision |
| --- | --- | --- | --- | --- |
| chute en **centipions** | **5 (33 %)** | 5 (6 %) | **× 6,0** | **50 %** |
| variation de **matériel** | 4 (27 %) | 15 (17 %) | × 1,6 | 21 % |
| distance au **mat** | 0 | 2 (2 %) | × 0 | — |
| séquence **forcée** | 0 | 3 (3 %) | × 0 | — |
| écart à la **2ᵉ ligne** | 0 | 8 (9 %) | × 0 | — |

**Trois des cinq signaux ne séparent rien** : ils ne tirent sur aucun des coups manqués. Le mat et la
séquence forcée sont écartés par les données, pas par une opinion. L'écart à la deuxième ligne — le
`cp2` payé 2,1× — tire sur **huit** coups anodins et sur aucun coup manqué : **l'acuité de la
position ne dit rien de la qualité du coup joué.**

**Le garde-fou de D11 fait son travail** : mesuré sur les coups que l'app signale déjà, `cpDrop` tire
sur **13 des 14**. Un signal qui coïncide à 93 % avec la sévérité n'est pas un second axe ; c'est le
même axe en centipions. Sa valeur est là où les chances **saturent** — et c'est précisément la zone
morte.

## 2. L'attribution : seuil ou moteur ? (et c'est elle qui renverse la question)

D6 impose d'attribuer chaque désaccord avant de l'expliquer. Le test est lisible sur des données déjà
stockées : **notre `Best line` recommande-t-elle déjà le coup que lichess appelle le meilleur ?**

| | coups manqués (15) | contrôle : coups que les deux signalent (14) |
| --- | --- | --- |
| **même coup recommandé → seuil** | **10** | 11 |
| coup différent → moteur | 5 | 3 |

Les deux groupes se répartissent de la même façon : l'attribution n'est donc pas un artefact du
groupe manqué. **Dix des quinze désaccords sont des désaccords de seuil** — notre moteur voit
exactement le même meilleur coup, il refuse simplement d'appeler faute ce qui a été joué.

**Et où ces coups ont-ils été joués ?**

| | nombre | ce que cela veut dire |
| --- | --- | --- |
| dans une position **comptée** | **12** | dans le dénominateur, coût 2,3 à 9,5 points — **sous le plancher de 10** |
| dans la **zone morte** (`decided`) | 3 | l'angle mort d'ADR-0023 |
| sur un coup **forcé** | 0 | |

**C'est le résultat central de la revue, et il n'est pas celui que la story attendait.** ADR-0023
posait que « notre analyse est fine tant que la partie est vivante, aveugle dès qu'elle est jouée ».
Sur cette matière, l'essentiel de l'écart avec lichess est ailleurs : il est **dans la partie
vivante**, et il est un écart de **barre**, pas d'aveuglement.

## 3. Ce qu'un plancher plus bas rattraperait — et ce qu'il coûterait

Les coûts des 15 coups manqués : 9,5 · 8,9 · 6,5 · 6,4 · 5,6 · 5,5 · 4,7 · 4,6 · 4,2 · 3,8 · 3,7 ·
2,3 — puis **0,0 · 0,0 · 0,0** pour les trois de la zone morte, qui ne contribuent rien *par
construction*.

| Plancher | coups manqués rattrapés | coups signalés par corpus (DudulSmash / Metalyst) | part des coups du Player |
| --- | --- | --- | --- |
| **10** (actuel) | 0 sur 15 | 31 / 54 | 8,7 % / 14 % |
| 5 | 6 sur 15 | 51 / 92 | 14 % / 24 % |
| 3 | 11 sur 15 | 88 / 124 | 25 % / 32 % |
| 2 | **12 sur 15** | 115 / 147 | **32 % / 38 %** |
| n'importe lequel | **jamais les 3 derniers** | | |

Et le prix que le backlog annonçait est chiffré : `INACCURACY_DROP` étant **aussi** le plancher du
`Counted Move`, le baisser à 2 ferait passer la zone morte de 33 à **11** coups (DudulSmash) et de 48
à **10** (Metalyst) — **le dénominateur grossirait de 22 et de 38 coups**, et tous les récapitulatifs
avec lui. Ce n'est pas un effet de bord, c'est le mécanisme. (Chiffres recomputés par la FP de la
tranche avec `winningChances` et `isForced`, les fonctions de l'app : les valeurs de chances qui
encadrent la barre sont 1,922 et 2,014, donc aucune lecture flottante ne les déplace.)

**La contre-hypothèse du backlog est, elle, écartée par la mesure** : « à profondeur 16, 10 points de
chances sont du bruit ». La double passe de la tranche 03 chiffre ce bruit à **0,3 à 1,2 point par
coup**. Un coup à 5 points est donc **au-dessus** du bruit d'un facteur 4 à 15. Baisser le plancher à
5 ne signalerait pas du bruit ; le baisser à 2 commencerait à y toucher.

## 4. La zone morte : ce qu'un prédicat coûterait vraiment

| | DudulSmash | Metalyst |
| --- | --- | --- |
| coups dans la zone morte | 33 sur 358 (**9 %**) | 48 sur 386 (**12 %**) |
| que le **matériel** désigne | 10 (30 %) | 13 (27 %) |
| que la **chute cp** désigne | 11 (33 %) | 12 (25 %) |
| que le **mat** désigne | 6 (18 %) | 4 (8 %) |
| que la **2ᵉ ligne** désigne | 5 (15 %) | 5 (10 %) |
| que **forcé** désigne | 0 | 0 |

**Et le matériel atteint 3 des 3 coups de la zone morte que lichess signale** : 715/106 `Rxc4`,
619/67 `Rxf7`, 587/59 `Re8` — tous trois `material` **et** `cpDrop`.

Mais la barre par défaut du rapport — **1 pion** — est trop basse, et c'est la mesure suivante qui le
dit. Trois barres, le même corpus :

| Barre | DudulSmash | Metalyst | par partie | vrais positifs connus |
| --- | --- | --- | --- | --- |
| `material ≥ 1` (un pion) | 10 | 13 | **1,2** | **3 / 3** |
| **`material ≥ 3`** (une pièce) | **5** | **7** | **0,6** | **3 / 3** |
| `material ≥ 5` (une tour) | 2 | 4 | 0,3 | 1 / 3 |

**La barre à une pièce est celle que les données soutiennent** : elle divise le volume par deux sans
perdre un seul cas connu, et à une tour on en perd deux sur trois. À un pion, ce qui entre en plus
est du bruit d'échange ordinaire — le signal compte le matériel sur la paire coup + réponse, donc
toute reprise qui finit un pion en retard le déclenche.

### Le contrôle humain, borné à la liste que le rapport produit

C'est la discipline de D6 : le jugement humain vaut son prix sur la liste que la mécanique désigne,
pas sur les 744 coups du corpus. À `material ≥ 3` dans la zone morte, cette liste fait **douze
coups**, et les voici en entier :

| Partie / ply | Coup | Matériel | Chute cp | |
| --- | --- | --- | --- | --- |
| 161 / 33 | `Kg3` | 3 | 7 | |
| 713 / 61 | `Bd5` | 3 | 73 | |
| 709 / 146 | `d2` | 8 | 75 | |
| 708 / 59 | `Be2` | 5 | 25 | |
| 708 / 69 | `Ke3` | 3 | — (mat) | |
| 715 / 106 | `Rxc4` | 4 | 786 | **lichess le signale** |
| 622 / 48 | `Reg8` | 5 | 27 | |
| 622 / 70 | `Ke6` | 3 | −4 | |
| 622 / 114 | `Kb5` | 8 | — (mat) | |
| 619 / 59 | `Rxc3` | 7 | 120 | |
| 619 / 67 | `Rxf7` | 4 | 246 | **lichess le signale** |
| 587 / 59 | `Re8` | 5 | 671 | **lichess le signale** |

Douze coups à lire pour vingt parties : c'est un contrôle humain **tenable**, et c'est le point de
D6. Trois portent une confirmation extérieure ; les neuf autres n'ont aucune référence — leur
justesse n'est pas mesurée, elle est **plausible**, et chacun reste vérifiable sur l'échiquier, ce
qui est le contrat exact d'ADR-0023.

### Et ce que la liste brute du rapport donne, à titre d'avertissement

Aux seuils par défaut et pour **n'importe lequel** des cinq signaux, la liste « un signal tire,
personne ne signale » fait **89 coups (DudulSmash) et 92 (Metalyst)** — environ **neuf par partie**.
Ce n'est pas un défaut du rapport : c'est le cadran laissé large, et c'était le but (mieux vaut voir
trop pour choisir la barre que voir trop peu). Mais cela dit deux choses au demandeur :

- **un prédicat ne peut pas être « n'importe quel signal »** : il faut un signal et une barre ;
- la distribution du matériel explique le volume : sur les coups du Player, **87 %** (DudulSmash) et
  **83 %** (Metalyst) ne perdent rien du tout, 6–8 % perdent un ou deux pions, et seuls **3–4 %**
  perdent cinq pions ou plus. La barre à un pion attrape la deuxième tranche, qui est du commerce
  ordinaire.

## 5. Les quatre autres mesures

### La `Phase`, sous les deux lectures du cap (D14)

| Corpus | coups qui changent de `Phase` | par partie |
| --- | --- | --- |
| DudulSmash | **3 sur 358 (0,8 %)** | 0,3 |
| Metalyst | **3 sur 386 (0,8 %)** | 0,3 |

La règle que D14 s'était fixée : « un coup par partie : le débat est vide, on le clôt ; quinze :
l'axe est fragile ». Nous sommes à **0,3 coup par partie**, dans les deux corpus. **Le débat est
vide.**

### Notre découpage contre celui de lichess (D14, seconde moitié)

| Frontière | parties comparables | écart médian | étendue |
| --- | --- | --- | --- |
| **finale** | 9 | **0 ply** | 0..0 — **identique à chaque fois** |
| milieu de partie | 10 | **+6,5 plies** | +2..+14 |

Deux implémentations indépendantes tombent sur **exactement** le même ply de début de finale, neuf
fois sur neuf. Cet axe est solide.

Le milieu de partie, non — et la mesure dit pourquoi : notre frontière tombe au ply **28 ou 29** dans
**16 parties sur 20**, c'est-à-dire sur le **cap** du 15ᵉ coup. Notre critère de développement ne
tire presque jamais avant lui. En pratique, notre « début de partie » signifie **« les quinze
premiers coups »**, ce qui est défendable mais n'est pas ce que « développement achevé » annonce.
**US-15c doit le savoir avant d'agréger par phase.**

### Le plancher, par corpus

| Corpus | coups du Player | comptés | `decided` | `forced` | chances perdues | dérive |
| --- | --- | --- | --- | --- | --- | --- |
| DudulSmash | 358 | 318 (**89 %**) | 33 (9 %) | 7 (2 %) | 1 273 | 432 (**34 %**) |
| Metalyst | 386 | 335 (**87 %**) | 48 (12 %) | 3 (1 %) | 1 830 | 505 (**28 %**) |

Le dénominateur d'US-15c retient donc **~88 %** des coups du Player, et les deux corpus tombent à
deux points l'un de l'autre — ce qui rend leurs taux comparables. **Un tiers environ des chances
perdues est de la dérive** : ce qu'aucun coup signalé n'explique.

### Les coups forcés

**10 coups forcés sur 744**, et **aucun n'est signalé** — dans aucun des deux corpus (0 sur 7 chez
DudulSmash, 0 sur 3 chez Metalyst).

> C'est le **seul pourcentage de ce dossier qui somme les deux corpus** — les 1,3 % ci-dessous. Il est
> gardé parce que le compte par corpus est dans le tableau du plancher juste au-dessus (7 coups soit
> 2 %, et 3 coups soit 1 %) et que la conclusion « jamais signalé » tient séparément des deux côtés.
> Signalé plutôt que passé sous silence.

Le glossaire dit qu'un coup `forced` *peut* être signalé (un unique coup légal qui est une reprise
catastrophique). « Jamais vu » était un fait d'échantillon sur sept parties ; c'en est maintenant un
sur **vingt parties et 744 coups**. Le motif `forced` exclut 1,3 % des coups et n'a encore jamais
retiré un coup signalé du dénominateur. Faut-il continuer à le distinguer ? **C'est un arbitrage**,
et il est chiffré.

### L'attribution (D12) : « je me suis effondré » ou « il a été trop fort » ?

| Corpus | fautes de l'adversaire dans la partie **encore disputée** | nos propres fautes |
| --- | --- | --- |
| DudulSmash | 29 sur 313 (**9 %**) | 31 sur 358 (**9 %**) |
| Metalyst | 49 sur 360 (**14 %**) | 54 sur 386 (**14 %**) |

**Globalement, les adversaires fautent exactement autant que le Player.** L'axe ne dit donc pas
mécaniquement « ils jouent bien » — ce qui était la crainte de D12 — mais il ne dit pas non plus
« tu t'effondres ». Il discrimine **partie par partie**, et c'est là qu'il vaut quelque chose :

- **51 : l'adversaire ne commet aucune faute en 22 coups disputés** (contre une pour le Player). Le
  dossier chess.com disait « 96,1, zéro faute, niveau estimé 1800 » : **notre propre moteur le
  confirme**, sur des données que nous possédons.
- **708 : 0 faute adverse** également.
- **710 : 8 fautes adverses (29 %) contre 4 pour le Player** — l'inverse : la partie a été gagnée par
  l'adversaire malgré lui, ou perdue par nous dans une partie qu'il offrait.

**Et la réserve de D12 est validée par les chiffres**, ce qui est le point le plus fin de cette
section. Sur les trois parties où lichess publie une précision, il donne l'adversaire **meilleur à
chaque fois** (66 contre 56, 68 contre 57, 73 contre 64). Notre mesure, restreinte à la partie encore
disputée, dit « les deux ont joué pareil » sur ces mêmes trois parties. La différence n'est pas une
erreur : lichess mesure **toute** la partie, et le Player continue de fauter après que la partie est
décidée alors que l'adversaire n'a plus besoin de rien. **Mesurer sur toute la partie flatte
mécaniquement l'adversaire** — exactement ce que la réserve du demandeur voulait éviter.

## 6. Les deux notes de la 715, confrontées aux mesures (D18)

**Coup 74 — « J'ai pas vu que ma tour était en prise… », déclaré `blunder`.** Notre signal
**matériel vaut 5** sur ce coup (une tour), notre sévérité est `blunder`, et **lichess le signale
aussi**. L'humain, la mécanique et la référence extérieure nomment le même coup pour la même raison.
C'est la confirmation la plus directe du signal matériel de tout le dossier — et elle est venue
**non sollicitée**, D18 le souligne.

**Coup 33 — le demandeur marque un coup de l'adversaire et demande l'attribution.** Elle est
maintenant mesurée (section 5) : sur la 715 précisément, l'adversaire faute à 14 % dans la partie
disputée contre 13 % pour le Player — « il a joué comme moi ». Lichess, sur toute la partie, le donne
meilleur (66 contre 56). Les deux lectures sont vraies et disent deux choses différentes ; c'est
l'arbitrage d'affichage que 15d héritera.

## 7. Ce que le corpus contenait déjà : une lecture **aveugle**

Le PRD notait que la lecture de la 715 porte `engine_seen_before_seal = 1` et que « l'humain a trouvé
ce que l'app manquait » n'y est donc **pas** une inférence disponible. Mais la base contient une
autre lecture scellée : celle de la **161**, `engine_seen_before_seal = 0`, 26 coups marqués — et la
161 **est** dans le corpus. La comparaison manquante est donc possible.

| ply | coup | l'humain (aveugle) | l'app | coût | signal |
| --- | --- | --- | --- | --- | --- |
| 5 | `f4` | `sound` | **inaccuracy** | 10,6 | cpDrop |
| 9 | `e4` | `sound` | **blunder** | 31,3 | cpDrop |
| 11 | `Bb5` | `sound` | **inaccuracy** | 13,6 | cpDrop |
| 19 | `d3` | **inaccuracy** | — | 0,8 | aucun |
| 23 | `hxg4` | **blunder** | inaccuracy | 17,1 | cpDrop |
| 25 | `Nfd2` | **blunder** | mistake | 23,5 | cpDrop |

- **L'app a trouvé 3 fautes que l'humain aveugle a déclarées `sound`**, dont un `blunder` à 31 points.
- **L'humain a trouvé 1 faute que l'app ignore** : `d3`, qui coûte 0,8 point — sous n'importe quel
  plancher, et qu'aucun des cinq signaux ne désigne.
- Là où les deux voient une faute, **l'humain est plus sévère** (`blunder` contre `inaccuracy`).

À prendre pour ce que c'est, **au même barème que les trois bilans lichess** : une partie, treize
coups du Player jugés à l'aveugle, six coups où l'un ou l'autre voit une faute. **De quoi falsifier,
pas de quoi conclure.** La lecture s'arrête au ply 28 d'une partie qui en compte 44 — mais la
troncature tombe sur ce que la revue écarte : les 8 coups exclus de la 161 sont tous au ply ≥ 27, et
**12 des 14 coups comptés** portent un verdict aveugle.

Ce qu'elle falsifie, précisément : la crainte qui a ouvert la story — « je vois souvent des trucs qui
ne sont pas mis en valeur par le moteur » — **ne se vérifie pas sur cette partie**. À l'aveugle, sur
la seule comparaison non contaminée que la base contienne, c'est l'humain qui a manqué le plus : trois
fautes déclarées `sound`, dont un `blunder` à 31 points. Une partie ne réfute pas une expérience de
joueur ; elle empêche de la tenir pour acquise.

## 8. Les limites, nommées

1. **La référence extérieure est de trois parties**, toutes du même profil et du même site. C'est
   assez pour **falsifier** un prédicat — et trois signaux le sont, sans appel. Ce n'est **pas** assez
   pour en **valider** un : la précision de 50 % de `cpDrop` repose sur dix coups.
2. **Les deux corpus ne sont pas contemporains** (biais n° 1 de [`CORPORA.md`](CORPORA.md)), et il
   faut le dire exactement : **trois** des dix parties Metalyst sont d'août-septembre 2026, donc
   contemporaines de la fenêtre DudulSmash ; les **sept** autres sont de 2021–2023. Les taux se
   comparent entre corpus avec cette réserve.
3. **La lecture de la 715 n'est pas aveugle** ; celle de la 161 l'est et couvre 12 de ses 14 coups
   comptés, mais c'est **une** partie.
4. **Les taux valent pour ces vingt parties**, choisies par récence — pas pour « ses parties » en
   général.
5. **Aucune de ces mesures n'est un test.** Elles se rejouent en une commande sur les mêmes lignes
   stockées, et elles changeront au premier seuil déplacé — c'est le but.

## 9. Ce que la revue rend décidable (tranche 05)

Les données ne tranchent pas à la place du demandeur ; elles réduisent chaque arbitrage à un choix
chiffré.

1. **Le plancher.** Le baisser rattrape 6 coups manqués à 5, 11 à 3, 12 à 2 — et fait passer la part
   des coups signalés de ~9-14 % à ~14-24 % (à 5) ou ~32-38 % (à 2), en élargissant du même geste le
   dénominateur de 23 et 38 coups. À 5, on reste 4 à 15 fois au-dessus du bruit moteur mesuré.
2. **Le prédicat de la zone morte.** `material` est le seul candidat que les données soutiennent, et
   la barre que les données indiquent est **une pièce (≥ 3 pions)** : 3/3 des cas connus, **0,6 coup
   par partie**, douze coups à lire pour vingt parties, chacun vérifiable sur l'échiquier — et le
   signal a été confirmé spontanément par le demandeur au coup 74 de la 715. À un pion le volume
   double sans rien gagner ; à une tour on perd deux cas sur trois.
3. **Trois signaux à abandonner** : mat, séquence forcée, écart à la deuxième ligne. Aucun ne touche
   un coup manqué. Le troisième est la seule justification qui restait au MultiPV 2 hors `Best
   line` : **son coût de 2,1× n'achète rien pour cette question.**
4. **La `Phase`** : la lecture du cap peut être close (0,8 %). La frontière de finale est validée par
   une implémentation indépendante ; celle de milieu de partie est un artefact du cap, et
   c'est US-15c qui en héritera.
5. **Le motif `forced`** : 10 coups sur 744, jamais signalé, jamais vu retirer un coup signalé du
   dénominateur en vingt parties.
6. **L'attribution** : elle discrimine partie par partie et pas globalement. Restreinte à la partie
   disputée, elle ne flatte pas l'adversaire — ce que la comparaison avec la précision « toute
   partie » de lichess démontre.

## 10. Rejeu du 2026-09-03 — la référence passe de **trois** à **dix** parties

Le demandeur a lancé l'analyse lichess sur les sept parties Metalyst qui n'en avaient pas. **Les dix
en ont désormais une**, soit **96 coups signalés** par lichess pour le Player au lieu de 24. Tout ce
qui suit est le **même rapport rejoué** sur les mêmes `Evaluation`s — zéro seconde de moteur — avec la
référence élargie. Les sections 1 à 4 gardent leurs chiffres de trois parties ; **là où le rejeu les
contredit, c'est le rejeu qui vaut.**

### Ce qui se durcit

| | 3 bilans | **10 bilans** |
| --- | --- | --- |
| Coups signalés par lichess / par nous | 24 / 14 | **96 / 54** |
| Coups manqués (eux seuls) | 15 | **43** |
| Signalés par **nous seuls** | 0 | **1** (716/67 `Rxe8`) |
| Manqués joués dans une position **comptée** | 12 sur 15 (80 %) | **39 sur 43 (91 %)** |
| Manqués dans la **zone morte** | 3 | **4** |
| Attribués au **seuil** | 10 sur 15 (67 %) | **32 sur 43 (74 %)** |
| Idem, groupe de contrôle | 11 sur 14 (79 %) | **48 sur 53 (91 %)** |
| `Inaccuracy` dans leur vocabulaire | 11 sur 15 | **35 sur 43** |

**Le résultat central est confirmé et renforcé** : **91 %** de l'écart avec lichess est *dans* notre
dénominateur, et les trois quarts des désaccords sont des désaccords de **seuil**. Le containment
tient à une exception près sur 54 coups.

**Ce qu'un plancher rattraperait, sur 43 coups manqués** : **24 à 5 points**, 33 à 3, 36 à 2 — et
**jamais les 4 de la zone morte**. La recommandation du plancher (arbitrage n° 6) ne bouge pas.

### Ce qui s'affaiblit : le test de discrimination

| Signal | manqués (43) | ni-ni (289) | enrichissement | 3 bilans |
| --- | --- | --- | --- | --- |
| chute en **centipions** | 8 (19 %) | 15 (5 %) | **× 3,6** | × 6,0 |
| variation de **matériel** | 11 (26 %) | 39 (13 %) | × 1,9 | × 1,6 |
| distance au **mat** | 0 | 4 (1 %) | × 0 | × 0 |
| séquence **forcée** | 0 | 8 (3 %) | × 0 | × 0 |
| écart à la **2ᵉ ligne** | 1 (2 %) | 27 (9 %) | **× 0,25** | × 0 |

L'enrichissement de `cpDrop` a **fondu de moitié** avec dix fois la matière — ce qui est le sort
ordinaire d'un effet mesuré sur peu de cas. Il reste le meilleur séparateur et reste **coïncident à
91 %** avec notre propre sévérité.

Et l'écart à la deuxième ligne devient **anti-corrélé** (× 0,25) : il tire *moins* sur les coups
manqués que sur les coups ordinaires. Le `cp2` payé 2,1× n'est pas seulement inutile pour cette
question — il pointe dans le mauvais sens.

### Ce qui se renverse : le prédicat de la zone morte

C'était la raison de demander ces sept bilans, et **le falsificateur que la tranche 05 avait nommé
s'est déclenché**. Zone morte du corpus Metalyst : **48 coups, dont 4 que lichess signale**.

| Prédicat candidat | désignés | rappel | précision | par partie |
| --- | --- | --- | --- | --- |
| `material ≥ 3` *(recommandé sur 3 bilans)* | 7 | 3/4 | **43 %** | 0,7 |
| `material ≥ 4` | 6 | 3/4 | 50 % | 0,6 |
| `cpDrop ≥ 200` | 7 | **4/4** | 57 % | 0,7 |
| `cpDrop ≥ 240` | 6 | **4/4** | 67 % | 0,6 |
| `material ≥ 3` **ou** `cpDrop ≥ 200` | 11 | 4/4 | 36 % | 1,1 |
| **`material ≥ 1` et `cpDrop ≥ 200`** | **4** | **4/4** | **100 %** | **0,4** |

`material ≥ 3` n'est plus « 3 sur 3 » : c'est **3 sur 7**. Le matériel seul attrape les échanges
ordinaires d'une partie déjà finie — 622/48 `Reg8` (5 pions), 622/70 `Ke6` (3), 622/114 `Kb5` (8) :
du matériel change de camp, et l'évaluation ne bouge pas parce qu'il n'y avait plus rien à perdre.

Et la chute en centipions **seule** attrape l'inverse : des coups de roi dans une finale sans espoir
où l'évaluation s'emballe sans que rien de tangible se passe — 622/94 `Kxf4`, 622/98 `Ke5`
(**cp 6865**), 622/106 `Ka7`.

**La conjonction élimine les deux familles d'erreur** et désigne exactement les quatre coups que
lichess signale, et rien d'autre. Elle se dit d'ailleurs en une phrase que le Player peut vérifier :
**du matériel a changé de camp *et* l'évaluation s'est effondrée**. Le signal affiché reste le
matériel — vérifiable sur l'échiquier, ce qu'ADR-0023 exige ; la chute en centipions n'est pas une
phrase montrée, c'est un **filtre**.

### Trois réserves, et elles pèsent

1. **Quatre vrais positifs.** Une précision de 100 % sur quatre coups ne distingue pas « le bon
   prédicat » de « un ajustement heureux ». Aucune des lignes du tableau ci-dessus n'est établie.
2. **Le prédicat s'évapore sur l'autre corpus.** Le même prédicat désigne **4 coups chez Metalyst**
   (0,4/partie) et **un seul chez DudulSmash** (709/150 `Kc6`, 0,1/partie). Soit la zone morte de
   DudulSmash ne contient presque rien à montrer, soit le prédicat est ajusté aux quatre cas
   Metalyst — et **rien dans nos données ne permet de trancher**, puisque le corpus chess.com n'a
   aucune référence extérieure.
3. **L'oracle est aveugle là où nous l'interrogeons.** Lichess ne signale que **4 des 48** coups de
   la zone morte (8 %) : leurs seuils saturent comme les nôtres. « Non confirmé par lichess » n'est
   donc pas « faux » — pour les sept désignations du matériel, le fait mécanique est vrai dans les
   sept cas. La précision mesurée ici est un accord avec un juge qui voit mal à cet endroit précis.

---

**Suite donnée.** Les décisions du demandeur sont dans [`ARBITRATIONS.md`](ARBITRATIONS.md)
(2026-09-03) : barème à **5 points**, plancher du dénominateur maintenu à 10 %, **aucun prédicat**
pour le moment, aucun impact sur US-15c, et les demandes produit regroupées hors périmètre. L'angle
mort est **documenté** plutôt qu'assumé — [`BLIND-SPOT.md`](BLIND-SPOT.md) — et ADR-0023 est amendé
en conséquence.
