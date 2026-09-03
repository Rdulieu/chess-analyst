# US-15a-bis — les arbitrages du demandeur

Tranche [`05`](issues/05-the-arbitrations.md) — **HITL, aucun code**. L'agent présente et ne tranche
pas ; il est en revanche tenu de dire ce qu'il recommanderait, pourquoi, et **ce qui rendrait un
autre choix meilleur**. C'est ce que fait ce document.

Le dossier de mesure est [`REVIEW.md`](REVIEW.md) ; les corpus et leurs biais sont dans
[`CORPORA.md`](CORPORA.md). **Aucune décision n'est prise ici.** Les décisions du demandeur seront
consignées en bas de ce fichier, avec leur date.

> **⚠️ Deux révisions datées sont en fin de document et font foi** : la piste profondeur 20 est
> **évacuée** (2026-09-03), et les recommandations **1, 2 et 3 sont révisées** après l'obtention de
> **dix** bilans lichess au lieu de trois (2026-09-03). Les sections 1 à 3 ci-dessous portent chacune
> un avertissement à cet endroit.
>
> **Le résultat central, avant les arbitrages.** La revue ne dit pas ce que la story attendait.
> L'écart avec lichess est **d'abord un écart de seuil, pas un angle mort** : sur les **43** coups
> qu'ils signalent et que nous manquons, **39 ont été joués dans des positions que nous comptons**
> (91 %), chacun coûtant 1,3 à 9,5 points — sous le plancher de 10. L'angle mort de la zone morte
> existe, il est **petit** (4 sur 43), et il faut **deux signaux conjoints** pour l'atteindre sans
> bruit. Les deux mécanismes sont complémentaires, et chacun des arbitrages ci-dessous porte sur l'un
> ou l'autre.
>
> *(Chiffres du rejeu sur dix bilans. Sur les trois premiers bilans ils étaient 12 sur 15, et le
> matériel seul suffisait — voir la révision.)*

## 1. Le prédicat : lequel des cinq signaux remplit le cas « montré, non compté » ?

> ⚠️ **PÉRIMÉ le 2026-09-03 — lire la [révision](#révision-du-2026-09-03--dix-bilans-lichess-au-lieu-de-trois) en fin de document.**
> Cette section a été écrite quand la référence lichess comptait **trois** parties. Elle en compte
> **dix** depuis, et le chiffre qui la portait a changé de sens : `material ≥ 3` fait **3 sur 7**, pas
> 3 sur 3. La recommandation en vigueur est **`material ≥ 1` et `cpDrop ≥ 200`**. Le texte ci-dessous
> est conservé **comme trace** — il montre que son falsificateur était écrit d'avance et qu'il a
> tiré — et non comme une recommandation.

**Recommandation : la variation de matériel.** C'est le seul des cinq que les données soutiennent
pour *ce* cas, et il est soutenu par trois choses indépendantes :

- il atteint **3 des 3** coups de la zone morte que lichess signale (715/106, 619/67, 587/59) —
  ⚠️ **chiffre périmé** : sur dix bilans il en atteint **3 sur 4**, et il désigne **7** coups pour ces
  trois-là, soit une précision de **43 %** ;
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

> ⚠️ **PÉRIMÉ le 2026-09-03 — lire la [révision](#révision-du-2026-09-03--dix-bilans-lichess-au-lieu-de-trois) en fin de document.**
> Cette section a été écrite quand la référence lichess comptait **trois** parties. Elle en compte
> **dix** depuis, et le chiffre qui la portait a changé de sens : `material ≥ 3` fait **3 sur 7**, pas
> 3 sur 3. La recommandation en vigueur est **`material ≥ 1` et `cpDrop ≥ 200`**. Le texte ci-dessous
> est conservé **comme trace** — il montre que son falsificateur était écrit d'avance et qu'il a
> tiré — et non comme une recommandation.

**Recommandation : une pièce, soit `material ≥ 3` pions.** Mesuré sur les vingt parties :

| Barre | Coups désignés dans la zone morte | Par partie | Cas connus attrapés |
| --- | --- | --- | --- |
| ≥ 1 pion | 10 (DudulSmash) + 13 (Metalyst) | 1,2 | ~~3 / 3~~ → **4 / 4**, précision **31 %** |
| ~~**≥ 3 (une pièce)**~~ | **5 + 7** | **0,6** | ~~3 / 3~~ → **3 / 4**, précision **43 %** |
| ≥ 5 (une tour) | 2 + 4 | 0,3 | ~~1 / 3~~ → **1 / 4**, précision **25 %** |

À une pièce, le volume est **divisé par deux** sans qu'un seul cas connu soit perdu ; à une tour, on
en perd deux sur trois. ⚠️ **Ce raisonnement ne tient plus** : avec dix bilans, la barre à une pièce
**manque** un des quatre cas connus et se trompe sur quatre des sept coups qu'elle désigne. En dessous, ce qui entre est du **bruit d'échange** : le signal compte le
matériel sur la paire coup + réponse, donc toute reprise qui finit un pion en retard le déclenche.

**Ce qui rendrait un autre choix meilleur** : si le demandeur veut *tout* voir de sa zone morte,
1 pion double le volume à 1,2 coup par partie, ce qui reste tenable — la question est s'il préfère
un glyphe qu'il croit toujours, ou un glyphe qu'il vérifie souvent. Les douze coups de la barre à
une pièce sont listés en entier dans [`REVIEW.md`](REVIEW.md) : ils se relisent en cinq minutes.

## 3. Où dépenser le second bilan chess.com

> ⚠️ **PÉRIMÉ le 2026-09-03 — lire la [révision](#révision-du-2026-09-03--dix-bilans-lichess-au-lieu-de-trois) en fin de document.**
> Cette section a été écrite quand la référence lichess comptait **trois** parties. Elle en compte
> **dix** depuis, et le chiffre qui la portait a changé de sens : `material ≥ 3` fait **3 sur 7**, pas
> 3 sur 3. La recommandation en vigueur est **`material ≥ 1` et `cpDrop ≥ 200`**. Le texte ci-dessous
> est conservé **comme trace** — il montre que son falsificateur était écrit d'avance et qu'il a
> tiré — et non comme une recommandation.

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

| Plancher | Coups manqués rattrapés | Coups signalés — DudulSmash / Metalyst | Part des coups du Player |
| --- | --- | --- | --- |
| **10** (actuel) | 0 sur 43 | 31 / 54 | 8,7 % / 14 % |
| **5** | **24 sur 43** | 51 / 92 | 14 % / 24 % |
| 3 | 33 sur 43 | 88 / 124 | 25 % / 32 % |
| 2 | 36 sur 43 | 115 / 147 | 32 % / 38 % |

> Colonne de gauche **mise à jour au rejeu du 2026-09-03** (dix bilans) : elle disait 0 / 6 / 11 / 12
> sur les quinze coups manqués que trois bilans montraient. Les deux autres colonnes sont mesurées
> sur les vingt parties et n'ont pas bougé — elles ne dépendent pas de la référence.

**Recommandation : 5 points, et pas plus bas.** Trois raisons mesurées :

- à 5, on rattrape **24 des 39** coups que lichess signale dans la partie vivante, et la part des
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

> **La piste moteur, elle, est maintenant mesurée — et écartée.** C'était la seule autre raison
> documentée de ne pas toucher au plancher. Sonde du 2026-09-03 sur les trois parties à bilan
> lichess, trois bras (16 du corpus / 16 rejouée / 20) :
> [`DEPTH-20-PROBE.md`](DEPTH-20-PROBE.md). La profondeur 20 coûte **8,2× le temps**, rattrape **un**
> des quinze coups manqués là où un simple **rejeu à 16 en rattrape deux** — donc le gain est **sous
> le bruit du moteur** — ne change aucun compte de coups signalés, **rétrécit** le dénominateur (une
> position perdue est vue plus perdue, donc la zone morte grossit) et n'améliore pas l'accord avec
> lichess. Les 12 coups manqués de la partie vivante sont donc un fait de **seuil**, et seule une
> décision sur le plancher les fera apparaître.

## Décisions du demandeur

*(à consigner ici, avec leur date)*

| Point | Décision | Date |
| --- | --- | --- |
| 1. Le prédicat | **aucun prédicat pour le moment.** La tranche 06 devient « documenter l'angle mort » et ADR-0023 est amendé — ce que l'ADR prévoyait explicitement | 2026-09-03 |
| 2. Son seuil | **sans objet** (pas de prédicat) | 2026-09-03 |
| 3. Le second bilan chess.com | *non tranché* — et sans prédicat à départager, la raison de le dépenser disparaît : **il reste en réserve** (lecture de l'agent, pas décision du demandeur) | — |
| 4. Implications pour US-15c | **aucun impact.** « Les impacts sur US-15c sont calculables pour moi, il n'y en a pas » | 2026-09-03 |
| 5. Les demandes produit | **regroupées dans une nouvelle US, hors de ce périmètre** → **US-34** | 2026-09-03 |
| 6. Le barème | **fixé à 5 %**, le plancher du dénominateur **maintenu à 10 %**. Livré hors de cette story → **US-37** (voir la note de périmètre ci-dessous) | 2026-09-03 |
| 6 bis. La piste du régime | **évacuée** (profondeur 20) | 2026-09-03 |
| *(hors table)* | **dix bilans lichess demandés et obtenus** → recommandations 1, 2 et 3 **révisées** en fin de document | 2026-09-03 |
| *(préférence)* | **garder le plancher du dénominateur à 10 %** — « j'aime bien son comportement aujourd'hui ». Impact mesuré : dissocier les deux usages de la constante laisse le dénominateur, les exclusions et les chances perdues **strictement inchangés** | 2026-09-03 |
| *(ordre)* | recommandation révisée : **barème d'abord, prédicat ensuite** — le barème change l'ensemble-cible du prédicat (section D) | 2026-09-03 |

### 2026-09-03 — la piste « creuser plutôt que baisser la barre » est close

> « Évacue la piste de l'analyse en depth 20, elle rallonge énormément l'analyse et les effets de
> bord sont négatifs. Ils s'éloignent de ce qu'un humain peut comprendre de la partie. »

Le coût (8,2×) et les effets de bord (la zone morte grossit, le dénominateur rétrécit) étaient
mesurés ; le troisième motif ne l'était pas et **il dépasse la mesure** : une recherche plus profonde
n'aide pas le Player à **comprendre** sa partie. C'est la même discipline que celle qui fait refuser
« erreur tactique » au profit de la ligne, et exiger d'ADR-0023 un signal vérifiable sur l'échiquier.

**Ce que cela change pour l'arbitrage n° 6** : il n'a plus d'alternative. Le seul levier sur les 12
coups manqués de la partie vivante est le **plancher**, et la recommandation reste **5 points** —
avec son prix, qui est d'élargir aussi le dénominateur. Détail dans
[`DEPTH-20-PROBE.md`](DEPTH-20-PROBE.md).

**Ce que cela ne tranche pas** : la valeur du plancher, ni les cinq autres points.

---

## Révision du 2026-09-03 — dix bilans lichess au lieu de trois

Le demandeur a lancé l'analyse lichess sur les sept parties Metalyst qui n'en avaient pas. La revue a
été **rejouée** sur les mêmes `Evaluation`s (aucun temps moteur) : section 10 de
[`REVIEW.md`](REVIEW.md). Ce qui suit **remplace** les recommandations 1, 2 et 3 ci-dessus.

### Ce qui n'a pas bougé, et se durcit

Les points **4** (US-15c), **5** (les demandes produit) et **6** (le plancher) tiennent tels quels, et
le résultat qui les fonde est renforcé : **91 %** de l'écart avec lichess (39 coups sur 43) est *dans*
notre dénominateur, contre 80 % sur trois bilans, et **74 %** des désaccords sont des désaccords de
seuil. Un plancher à 5 rattraperait **24** des 43 coups manqués.

### 1 et 2 révisés — le falsificateur que j'avais nommé s'est déclenché

J'avais recommandé `material ≥ 3` en écrivant que « une référence sur cinq ou six parties de plus où
le matériel n'atteindrait qu'un cas sur trois » devrait le faire lâcher. La référence est arrivée :
**`material ≥ 3` fait 3 sur 7**, pas 3 sur 3.

**Nouvelle recommandation : `material ≥ 1` ET `cpDrop ≥ 200`.** Sur la zone morte du corpus Metalyst
(48 coups, 4 signalés par lichess) elle désigne **exactement ces 4 coups et rien d'autre** — rappel
4/4, précision 100 %, **0,4 coup par partie**.

Pourquoi la conjonction et non l'un des deux :

- le **matériel seul** attrape les échanges ordinaires d'une partie déjà finie (du matériel change de
  camp, l'évaluation ne bouge pas : il n'y avait plus rien à perdre) ;
- la **chute en centipions seule** attrape des coups de roi dans une finale sans espoir où
  l'évaluation s'emballe sans que rien de tangible arrive (jusqu'à `cp 6865`) ;
- **ensemble**, les deux familles d'erreur s'annulent.

Et cela **préserve le contrat d'ADR-0023** : le signal *montré* reste « du matériel a changé de
camp », vérifiable sur l'échiquier. La chute en centipions n'est pas une phrase affichée, c'est un
**filtre**. C'est aussi ce qui la rend compatible avec le critère que le demandeur a posé hier en
évacuant la profondeur 20 — ne pas s'éloigner de ce qu'un humain peut comprendre de sa partie.

**Ce qui rendrait un autre choix meilleur — et c'est sérieux :** la précision de 100 % repose sur
**quatre** coups. Et le même prédicat désigne 4 coups chez Metalyst mais **un seul chez DudulSmash**
(0,1 par partie) : soit la zone morte de DudulSmash ne contient presque rien à montrer, soit le
prédicat est **ajusté aux quatre cas Metalyst**. Rien dans nos données ne tranche, faute de référence
côté chess.com. Enfin, lichess ne signale que 4 des 48 coups de la zone morte : **l'oracle voit mal
là où nous l'interrogeons**, donc « non confirmé » n'est pas « faux ».

**Option prudente, si le demandeur préfère ne pas livrer un prédicat sur quatre cas** : documenter
l'angle mort (ADR-0023 l'admet, la tranche 06 change de nature) et re-décider après le bilan
chess.com du point 3. C'est un choix défendable, pas un renoncement.

### 3 révisé — le second bilan chess.com

**Toujours la 708, et pour une raison désormais plus nette qu'hier.** Les dix parties Metalyst ont
une référence ; le corpus chess.com n'en a **aucune**, et c'est exactement là que le prédicat est
suspect de sur-ajustement. La 708 est le meilleur discriminant disponible :

- `material ≥ 3` y désigne **deux** coups de la zone morte (ply 59 `Be2`, 5 pions, cp 25 ; ply 69
  `Ke3`, 3 pions, évaluation de mat) ;
- la **conjonction recommandée n'en désigne aucun** (les deux échouent le filtre `cpDrop ≥ 200`).

Un seul bilan sur cette partie **sépare donc les deux candidats** : si chess.com signale ces deux
coups, la conjonction est trop stricte ; s'il les ignore, elle est confirmée là où le matériel seul se
trompait. C'est le meilleur rapport information/coût des vingt parties.

### Un fait à consigner au passage

**L'écart à la deuxième ligne est devenu anti-corrélé** (× 0,25 : il tire *moins* sur les coups
manqués que sur les coups ordinaires). Le `cp2` payé **2,1×** en 15a n'est donc pas seulement inutile
pour cette question — il pointe dans le mauvais sens. La `Best line` reste, elle, indispensable
(c'est elle qui rend l'attribution seuil/moteur possible).

---

## Impacts mesurés du 2026-09-03 — la deuxième ligne, et le coût des deux recommandations

Demandé par le demandeur après la révision. **Rien n'est décidé ici** : ce sont les impacts chiffrés
de deux hypothèses qu'il a posées — *« on baisse le seuil à 5 points mais on garde 10 % pour le
dénominateur de fin de partie ignoré. J'aime bien son comportement aujourd'hui »* et le prédicat
`material ≥ 1` et `cpDrop ≥ 200`. Une **préférence** y est en revanche exprimée et consignée dans la
table : garder le plancher du dénominateur à 10 %.

### A. Pourquoi l'écart à la deuxième ligne ne sert pas, et comment il induit en erreur

Il mesure `cp − cp2` **à la position d'où le coup est joué** : de combien la meilleure ligne vaut
mieux que la deuxième. C'est donc une propriété **de la position**, prise **avant** le coup —
l'*occasion* de se tromper, jamais l'erreur.

Ce qu'il prédit réellement, mesuré sur les 744 coups du Player des deux corpus :

| Écart (cp) | Coups | A joué **le** coup du moteur | Coût médian | Coût moyen | Signalés par lichess |
| --- | --- | --- | --- | --- | --- |
| 0–25 | 420 | 27 % | 1,0 | 2,8 | 9 % |
| 25–75 | 152 | 39 % | 2,0 | 5,7 | 18 % |
| 75–150 | 64 | 52 % | 1,0 | 8,7 | 30 % |
| 150–400 | 41 | **66 %** | **0,6** | 6,4 | 12 % |
| 400 et + | 24 | 58 % | **0,3** | 7,3 | 12 % |

**1. Un grand écart prédit que le Player a trouvé le coup** — de 27 % à 66 %. La raison est
échiquéenne : un grand écart signifie une position **forçante** (une reprise, un échec, l'unique coup
qui sauve une pièce), et ce sont les coups qu'un humain trouve. Un petit écart signifie que dix coups
se valent : une position calme, où dériver coûte peu et passe inaperçu. Le coût **médian** le
confirme : il baisse quand l'écart monte (1,0 → 0,3). Un grand écart est donc surtout le marqueur
d'une position **bien jouée** — y poser un glyphe décorerait les bons coups les trois quarts du temps.
C'est l'anti-corrélation × 0,25, expliquée par sa mécanique et non seulement constatée.

**2. Le piège dans le piège** : le coût **moyen** ne baisse pas comme le médian (2,8 · 5,7 · 8,7 ·
6,4 · 7,3). Dans les positions aiguës, les erreurs sont **rares mais chères** — ce qui donne
l'impression trompeuse qu'il y a du signal. En réalité l'écart désigne **où une erreur ferait mal**,
pas **où une erreur a eu lieu**. Confondre les deux, c'est tirer sur 65 coups pour en attraper 12 %
de fautifs, dans un lot dont le coup médian perd 0,3 point.

**3. Dans la zone morte, il devient du bruit** — et c'est le plus grave, puisque c'est là qu'ADR-0023
veut un prédicat :

| | n | médiane | moyenne | max |
| --- | --- | --- | --- | --- |
| partie vivante (comptés) | 628 | 16 | 57 | 925 |
| **zone morte** (`decided`) | 73 | 13 | **258** | **5813** |

Les **trois** écarts supérieurs à 1000 cp du corpus sont tous dans la zone morte : `cp` et `cp2` y
sont deux évaluations saturées d'une position décidée, et leur différence part en vrille.

**4. Quand il n'y a pas de deuxième ligne** (10 coups du corpus), c'est qu'il n'y avait qu'un coup
légal — ce qui est **déjà** le motif `forced`. Il duplique alors un motif existant.

En un mot : les deux lectures naturelles de l'écart sont fausses pour notre question. « La position
était aiguë » ≠ « il s'est trompé » ; « la position était molle » ≠ « il a bien joué ».

> **Ce que cela ne condamne pas** : la `Best line`, elle, est indispensable — c'est elle qui rend
> possible l'attribution **seuil ou moteur**, l'outil le plus décisif de la revue. C'est le **second
> score** en particulier qui n'achète rien pour cette question.

### B. Impact d'un barème à 5 avec le plancher du dénominateur **maintenu à 10 %**

**Un fait de structure d'abord** : `INACCURACY_DROP = 10` est **une** constante lue à deux endroits,
où elle mesure deux choses différentes — une **chute** (la sévérité) et un **niveau** (le plancher du
`Counted Move`). L'hypothèse les **dissocie**. C'est un petit changement de code (deux constantes
nommées au lieu d'une) mais il défait un lien voulu, et le commentaire du code dit pourquoi : *« une
position avec moins que ça à perdre ne peut structurellement pas produire un coup signalé »*. C'est
vrai et mesuré — au barème 10, **0 des 81** coups de la zone morte est signalé, dans les deux corpus.
À 5, cette justification tombe : un coup joué à 5,8 % de chances peut chuter de 5,5. **Le commentaire
et `CONTEXT.md` devront donc être amendés, pas seulement la constante.**

**Ce qui ne bouge pas d'un pouce** — c'est exactement ce que la préférence du demandeur voulait
préserver : coups du Player, coups comptés, taille de la zone morte, coups forcés, et **chances
perdues** (1272,9 et 1829,9 au dixième près, identiques aux deux barèmes). Le comportement de fin de
partie est **intact**.

**Ce qui bouge :**

| | DudulSmash 10 → 5 | Metalyst 10 → 5 |
| --- | --- | --- |
| Coups signalés | 31 → **51** | 54 → **92** |
| Erreurs comptées | 31 → 51 | 54 → 90 |
| Chances perdues | 1273 → **1273** | 1830 → **1830** |
| dont signalées | 841 → 981 | 1325 → 1576 |
| **Dérive** | 432 → **292** (−32 %) | 505 → **254** (−50 %) |
| Part signalée | 66 % → 77 % | 72 % → 86 % |
| Accord avec lichess (les deux corpus) | 53 sur 96 | → **79 sur 96** (55 % → 82 %) |

Deux conséquences à peser :

- **La dérive fond de moitié.** C'est mécaniquement l'effet voulu — le barème convertit de la dérive
  en erreurs nommées. Mais c'est la dérive qui portait l'argument selon lequel un agrégat doit
  **sommer des récapitulatifs** plutôt que compter des fautes (ADR-0017). À 5 points, la dérive de
  Metalyst tombe à 14 % des pertes : elle existe encore, elle cesse d'être le titre.
- **`CONTEXT.md` publie la bande « 10–20 % »** : elle devient 5–20. Amendement de glossaire.

Travaux : **aucune migration** (tout est dérivé — l'argument porteur de la story), deux constantes
publiées, le commentaire du lien réécrit, `CONTEXT.md` amendé, et les tests de `recap`, `counted`,
`move-quality` et de l'affichage des sévérités reprises. Environ **1,7× plus de glyphes** à l'écran (mesuré par la FP de la tranche 06 : **85 → 143** coups signalés sur les vingt parties, soit 1,68×).

### C. Impact du prédicat — et il **interfère** avec le barème

Constat qui n'apparaît qu'en mesurant les deux ensemble : **le barème à 5 fait une partie du travail
du prédicat, gratuitement.** Des 4 coups de la zone morte que lichess signale, **deux deviennent
signalés par le seul barème** — `587/59` (chute 9,0 à **9,96 %** de chances) et `715/106` (chute 5,5 à
5,8 %). Ces deux-là porteront déjà un glyphe **et** leur motif, par le mécanisme que la tranche 04
d'US-15a avait construit et que personne n'avait jamais atteint.

Ce que le prédicat ajoute alors réellement, sur vingt parties : **trois coups.**

| Coup | Chute | Chances avant | Matériel | cp | Lichess |
| --- | --- | --- | --- | --- | --- |
| 619/67 `Rxf7` | 3,9 | 6,8 % | 4p | 246 | **signalé** ✓ |
| 622/102 `Kc7` | 0,3 | 0,4 % | 1p | 268 | **signalé** ✓ |
| 709/150 `Kc6` | 0,3 | 0,3 % | 1p | **5836** | aucune référence |

Deux des trois sont confirmés par lichess, et ce sont exactement les cas de forme `Kc7` pour lesquels
ADR-0023 a été écrit : **aucun seuil ne les atteindra jamais**, ils chutent de 3,9 et 0,3 point. Le
troisième, avec son `cp 5836`, est précisément le bruit de saturation décrit en **A.3**.

### D. Recommandation révisée — l'**ordre**, pas le fond

**Décider le barème d'abord, le livrer, puis re-mesurer le prédicat.** Trois raisons :

1. le barème **modifie l'ensemble-cible** du prédicat, donc livrer les deux dans la même tranche
   confondrait leurs effets et rendrait impossible de dire lequel a produit quoi ;
2. le volume honnête du prédicat tombe à **0,15 glyphe par partie** (3 coups sur 20 parties) ;
3. le bilan chess.com de la **708** a été choisi pour **séparer** les deux candidats de prédicat : il
   vaut mieux le dépenser avant de trancher, pas après.

Après le barème, la question du prédicat cesse d'être « quel signal sépare » — la revue l'a répondu —
pour devenir : **ces trois coups valent-ils un second axe dans le vocabulaire ?** C'est une question
de produit, et elle se posera sur un écran qu'il sera possible de regarder.

### 2026-09-03 — les quatre décisions, et une note de périmètre

> « Je fixe le barème à 5 %. On n'ajoute pas de nouveau prédicat pour le moment. Les impacts sur
> US-15c sont calculables pour moi, il n'y en a pas. Ajoute les demandes produits à une nouvelle US
> hors de ce scope. »

**Le barème est fixé à 5 %, le plancher du dénominateur reste à 10 %.** C'est l'arbitrage n° 6, et ses
impacts sont chiffrés en section B ci-dessus : le dénominateur, les exclusions et les chances perdues
ne bougent **pas d'un dixième** ; les coups signalés passent de 31 à 51 (DudulSmash) et de 54 à 92
(Metalyst) ; l'accord avec lichess monte de **53 à 79** coups sur 96 ; et la dérive fond de moitié.

> **⚠️ Note de périmètre — le barème ne peut pas être livré dans US-15a-bis.** La **User Story 5** du
> [`PRD`](PRD.md) de cette story promet que *« le nombre de coups comptés, **la dérive** et le total
> de chances perdues soient exactement les mêmes qu'avant cette story »*. Le barème à 5 fait fondre
> la dérive de **32 %** (DudulSmash) et **50 %** (Metalyst) : le livrer ici casserait la promesse
> centrale de la story qui l'a rendu décidable. Il part donc en story propre, **US-37**, avec toutes
> ses mesures déjà faites — il ne lui reste que le code, le glossaire et les tests.

**Aucun prédicat pour le moment.** ADR-0023 prévoyait ce résultat en toutes lettres : *« "aucun des
cinq ne sépare" est une issue légitime qui renverrait à assumer l'angle mort sur des données plutôt
que par lassitude »*. Ce n'est pas exactement ce qui s'est passé — un signal **sépare** (la chute en
centipions), et la conjonction `material ≥ 1` et `cpDrop ≥ 200` attrape les quatre cas connus. Ce que
les données ont montré, c'est que **l'angle mort est petit** (4 coups sur 43 manqués), que **le barème
à 5 en couvre déjà la moitié gratuitement**, et qu'un prédicat n'ajouterait plus que **trois coups sur
vingt parties** pour le prix d'un second axe dans le vocabulaire. La décision se prend donc sur un
rapport valeur/complexité mesuré, pas sur un échec de la mesure.

**La tranche 06 change de nature**, comme son issue le prévoyait : l'app reste **inchangée**, le
dossier documente l'angle mort avec ses chiffres, et **ADR-0023 est amendé** pour dire ce que la revue
a établi et ce qui a été décidé.

**Aucun impact sur US-15c.** Le dénominateur retient ~88 % des coups des deux côtés, à deux points
l'un de l'autre ; la frontière de finale est validée par une implémentation indépendante. Le seul
point que 15c héritera est consigné en section 4 : la frontière début/milieu est un **compteur de
coups** (le cap du 15ᵉ coup dans 16 parties sur 20), pas un critère de développement.

**Les demandes produit partent en une seule US hors périmètre.** Regroupées dans **US-34** — les trois
demandes issues de la lecture de la 715. Les deux autres entrées ne sont pas des demandes produit et
gardent la leur : le **bug** « Analyser cette partie » (US-35) et la **provenance du moteur** dans
`analysis_passes` (US-36).
