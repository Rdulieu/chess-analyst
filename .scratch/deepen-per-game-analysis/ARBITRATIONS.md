# US-15a-bis — les arbitrages du demandeur

Tranche [`05`](issues/05-the-arbitrations.md) — **HITL, aucun code**. L'agent présente et ne tranche
pas ; il est en revanche tenu de dire ce qu'il recommanderait, pourquoi, et **ce qui rendrait un
autre choix meilleur**. C'est ce que fait ce document.

Le dossier de mesure est [`REVIEW.md`](REVIEW.md) ; les corpus et leurs biais sont dans
[`CORPORA.md`](CORPORA.md). **Aucune décision n'est prise ici.** Les décisions du demandeur seront
consignées en bas de ce fichier, avec leur date.

> **Le résultat central, avant les arbitrages.** La revue ne dit pas ce que la story attendait.
> L'écart avec lichess est **d'abord un écart de seuil, pas un angle mort** : sur les 15 coups qu'ils
> signalent et que nous manquons, **12 ont été joués dans des positions que nous comptons**, chacun
> coûtant 2,3 à 9,5 points — juste sous le plancher de 10. L'angle mort de la zone morte existe, il
> est **petit** (3 sur 15), et le signal matériel l'atteint entièrement. Les deux mécanismes sont
> complémentaires, et chacun des arbitrages ci-dessous porte sur l'un ou l'autre.

## 1. Le prédicat : lequel des cinq signaux remplit le cas « montré, non compté » ?

**Recommandation : la variation de matériel.** C'est le seul des cinq que les données soutiennent
pour *ce* cas, et il est soutenu par trois choses indépendantes :

- il atteint **3 des 3** coups de la zone morte que lichess signale (715/106, 619/67, 587/59) ;
- il est **verifiable sur l'échiquier** — « du matériel a changé de camp » — ce qui est le contrat
  d'ADR-0023, là où une chute de centipions demande de croire le moteur ;
- il a été **confirmé sans être sollicité** par le demandeur lui-même, au coup 74 de la 715 : « j'ai
  pas vu que ma tour était en prise ». Le signal vaut 5 pions sur ce coup.

**Trois signaux sont écartés par les données** : la distance au mat, la séquence forcée et l'écart à
la deuxième ligne ne tirent sur **aucun** des quinze coups manqués. Ce n'est pas une opinion, c'est
un compte.

**Le quatrième, la chute en centipions, sépare mieux** (× 6 contre × 1,6) **et je ne le recommande
pas** : il tire sur **13 des 14** coups que l'app signale déjà. C'est la sévérité dans une autre
unité, donc un mauvais candidat pour un *second axe* — et un glyphe qui dirait « chute de
centipions » sur un coup exclu inviterait exactement la question à laquelle nous n'avons pas de
réponse : pourquoi celui-là et pas les autres.

**Ce qui rendrait un autre choix meilleur** : trois cas connus, c'est de quoi **falsifier**, pas de
quoi valider. Si le demandeur obtient une référence extérieure sur cinq ou six parties de plus (voir
point 3) et que le matériel n'y atteint qu'un cas sur trois, il faudra le lâcher. Et « aucun signal
ne sépare, on documente l'angle mort » **reste une issue légitime** : ADR-0023 l'admet, la tranche 06
change alors de nature, et rien dans les mesures n'oblige à livrer un prédicat.

## 2. Son seuil

**Recommandation : une pièce, soit `material ≥ 3` pions.** Mesuré sur les vingt parties :

| Barre | Coups désignés dans la zone morte | Par partie | Cas connus attrapés |
| --- | --- | --- | --- |
| ≥ 1 pion | 10 (DudulSmash) + 13 (Metalyst) | 1,2 | 3 / 3 |
| **≥ 3 (une pièce)** | **5 + 7** | **0,6** | **3 / 3** |
| ≥ 5 (une tour) | 2 + 4 | 0,3 | 1 / 3 |

À une pièce, le volume est **divisé par deux** sans qu'un seul cas connu soit perdu ; à une tour, on
en perd deux sur trois. En dessous, ce qui entre est du **bruit d'échange** : le signal compte le
matériel sur la paire coup + réponse, donc toute reprise qui finit un pion en retard le déclenche.

**Ce qui rendrait un autre choix meilleur** : si le demandeur veut *tout* voir de sa zone morte,
1 pion double le volume à 1,2 coup par partie, ce qui reste tenable — la question est s'il préfère
un glyphe qu'il croit toujours, ou un glyphe qu'il vérifie souvent. Les douze coups de la barre à
une pièce sont listés en entier dans [`REVIEW.md`](REVIEW.md) : ils se relisent en cinq minutes.

## 3. Où dépenser le second bilan chess.com

**Recommandation : sur la partie 708 (DudulSmash, défaite du 16 août).** Elle achète trois réponses
d'un coup :

- **Elle est du côté sans référence.** Toute notre référence extérieure est lichess, donc Metalyst :
  le corpus chess.com n'a **aucun** point de comparaison. Un bilan y vaut plus qu'un huitième bilan
  du même côté.
- **Elle teste le prédicat là où il n'est pas vérifié.** 708 porte **deux** désignations matérielles
  dans la zone morte (ply 59 `Be2`, 5 pions ; ply 69 `Ke3`, 3 pions), et aucune référence ne dit si
  elles sont justes. Deux des neuf cas non vérifiés du prédicat retenu.
- **Elle teste aussi l'attribution.** C'est la partie où notre mesure dit « il a été trop fort » —
  **zéro faute adverse en 34 coups disputés** — et où la dérive fait **69 %** des pertes, le plus
  fort du corpus. Si chess.com donne l'adversaire à 90+ et nous silencieux, les deux lectures se
  confirment ; s'il le donne médiocre, notre restriction à la partie disputée est à revoir.

**Ce qui rendrait un autre choix meilleur** : si le demandeur veut trancher le **plancher** plutôt
que le prédicat, il faut la dépenser sur une partie **serrée** — 712 (aucun coup exclu, 3 signalés
sur 22) — car c'est là que les coups à 2–9 points vivent, et c'est le point 6.

## 4. Ce que les mesures impliquent pour US-15c

**Le dénominateur : recommandation — c'est le bon, et il est solide.** Le plancher retient **89 %**
(DudulSmash) et **87 %** (Metalyst) des coups du Player, à deux points l'un de l'autre malgré cinq
ans et deux joueurs d'écart. Un dénominateur qui varie si peu entre deux corpus est un dénominateur
sur lequel des taux se comparent. Et **un tiers des chances perdues est de la dérive** (34 % et
28 %) : c'est la part qu'un agrégat par seuil seul ne verrait jamais, et elle justifie à elle seule
qu'ADR-0017 somme des récapitulatifs plutôt que des compteurs de fautes.

**La `Phase` : recommandation — un axe et demi, pas deux.**

- La frontière de **finale** est validée par une implémentation indépendante : identique à celle de
  lichess sur **9 parties sur 9**, au ply près. On peut bâtir dessus.
- La frontière **début / milieu** n'est pas un critère de développement, c'est le **cap** : elle tombe
  au ply 28-29 dans **16 parties sur 20**. Notre « début de partie » signifie en pratique « les
  quinze premiers coups ». C'est défendable, mais ce n'est pas ce que le glossaire annonce, et un
  verdict du type « tu perds tes parties dans l'ouverture » reposerait sur un compteur de coups.
- **Recommandation concrète** : que 15c agrège sur **finale / reste**, et que si le triptyque est
  gardé, l'écran dise « les quinze premiers coups » plutôt que « début de partie ».

**La lecture du cap peut être close** : 0,8 % des coups changent, dans les deux corpus — contre le
seuil d'« un coup par partie » que D14 s'était fixé pour déclarer le débat vide. Il est vide.

## 5. Le sort des demandes produit issues de la lecture de la 715

Toutes viennent des notes du demandeur, et la lecture les a produites sans qu'on les demande. Aucune
n'est dans le périmètre de cette story.

| Demande | Origine | Recommandation |
| --- | --- | --- |
| **`Coup manqué`** (« gain manqué ») | coup 67 | **Story à part, à griller.** C'est un concept **nouveau** — un coup qui ne perd rien mais laisse passer un gain — et il touche le glossaire, le barème et peut-être le dénominateur. Ne pas le glisser dans une tranche. |
| **« Je ne sais pas »** dans la `Declared severity` | coups 43 et 50 | **Story courte, valeur claire, à prendre tôt.** Aujourd'hui *absence de marque* et *incertitude déclarée* sont indistinguables, et la lecture de la 715 le montre noir sur blanc : une note sans sévérité au coup 43. Le vocabulaire manque une valeur, pas une feature. |
| **Mode « apprendre de mes erreurs »** | coup 60 | **Story à part, plus grosse.** C'est une route de révision, pas un réglage. À garder au backlog jusqu'à ce que la revue par partie soit stabilisée. |
| **Le bug « Analyser cette partie » avalé** sous une bannière de passe non acquittée | relevé au grill | **Ticket de bug, séparé et prioritaire sur les trois ci-dessus** : il fait perdre du temps moteur en silence et montre la progression d'une **autre** partie. |
| **Provenance du moteur dans `analysis_passes`** | trouvé par la FP de la tranche 03 | **Petite story, avec sa migration.** La table enregistre la profondeur et le nombre de lignes et **rien** sur le moteur : un corpus qui mélangerait deux forces de moteur serait indétectable, alors que comparer à un moteur extérieur est le but même de ces corpus. |

## 6. Un sixième arbitrage, que l'issue n'avait pas prévu : le plancher

**Ajouté parce que les données l'imposent, et parce que le demandeur l'a demandé le 2026-09-02** dans
l'entrée backlog de cette story : *« je vois souvent des trucs qui ne sont pas mis en valeur par le
moteur »*. La revue chiffre exactement ce que ça coûte.

| Plancher | Coups manqués rattrapés (sur 15) | Coups signalés — DudulSmash / Metalyst | Part des coups du Player |
| --- | --- | --- | --- |
| **10** (actuel) | 0 | 31 / 54 | 8,7 % / 14 % |
| **5** | 6 | 51 / 92 | 14 % / 24 % |
| 3 | 11 | 88 / 124 | 25 % / 32 % |
| 2 | 12 | 115 / 147 | 32 % / 38 % |

**Recommandation : 5 points, et pas plus bas.** Trois raisons mesurées :

- à 5, on rattrape **6 des 12** coups que lichess signale dans la partie vivante, et la part des
  coups signalés passe à 14–24 % — l'ordre de grandeur de lichess lui-même sur ces parties (10 à 12
  coups par partie) ;
- à 5, on reste **4 à 15 fois au-dessus du bruit moteur mesuré** : la double passe sur la 51 déplace
  le coût d'un coup de 0,3 à 1,2 point. À 2, on commence à signaler du bruit — ce que le plancher
  existe pour éviter, et c'est la contre-hypothèse du backlog qui se vérifie **partiellement** ;
- le prix est réel et il faut le dire : `INACCURACY_DROP` est **aussi** le plancher du `Counted
  Move`, donc le baisser **élargit le dénominateur** (de 22 et de 38 coups à une barre de 2), déplace
  de la masse de la dérive vers le signalé, **change tous les récapitulatifs** et l'agrégat de 15c
  avec eux. À 5, ce déplacement est modéré ; à 2, il est massif.

**Ce qui rendrait un autre choix meilleur** : `CONTEXT.md` publie la bande « 10–20 % » — la changer
est un **amendement de glossaire**, pas un réglage, et c'est une raison légitime de ne rien toucher.
Et si le demandeur préfère d'abord tester la **piste moteur** (un régime plus profond plutôt qu'un
plancher plus bas), la revue ne l'a pas explorée : elle mesure le bruit **à** profondeur 16, pas ce
qu'une profondeur 20 donnerait.

## Décisions du demandeur

*(à consigner ici, avec leur date)*

| Point | Décision | Date |
| --- | --- | --- |
| 1. Le prédicat | | |
| 2. Son seuil | | |
| 3. Le second bilan chess.com | | |
| 4. Implications pour US-15c | | |
| 5. Les demandes produit | | |
| 6. Le plancher | | |
