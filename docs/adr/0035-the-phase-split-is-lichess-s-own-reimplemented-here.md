# Le découpage en phases est celui de lichess, réimplémenté chez nous

Sans ce texte, un agent compétent **restaure notre propre règle** — et il aurait trois bonnes
raisons de le faire, toutes écrites dans le dépôt. `phase.ts` plaide sur dix lignes pour elle
(« deux frontières, deux règles différentes, et c'est la partie qu'un critère unique rate ») ;
ADR-0031 dit que « la `Phase` est **toujours** dérivée par nos propres règles », ce qui se lit
comme une interdiction de prendre celle de lichess ; et notre critère « développement achevé »
est la seule des quatre règles en jeu qu'on sache **dire au joueur**. Ni le compilateur, ni les
tests, ni une lecture du code ne s'y opposeraient.

**Décision : les deux frontières de la `Phase` sont celles de `Divider.scala`
(`lichess-org/scalachess`), réimplémentées ici et appliquées à toutes les `Platform`s.** Le milieu
de partie commence à la première Position où `majorsAndMinors ≤ 10` **ou** la rangée de fond d'un
camp porte moins de 4 pièces **ou** `mixedness > 150` ; la finale à la première Position où
`majorsAndMinors ≤ 6`. Notre critère de développement et le cap du 15ᵉ coup sont **retirés**.

**ADR-0031 n'est pas renversée, elle est précisée** : nous ne lisons toujours **jamais** la
colonne `division_*` comme une `Phase`. Ce qu'on adopte est leur **règle**, calculée par nous sur
chaque Position, identique pour lichess et chess.com — ce qu'ADR-0031 exigeait vraiment, à savoir
qu'aucun `Profile` ne soit découpé autrement qu'un autre selon son site.

## Ce que la mesure a dit — 415 parties, aucune seconde de moteur

Notre règle et la leur comparées ply à ply sur les 415 parties de la base portant une division
lichess (la mesure D14 d'US-15a-bis en avait **10**) :

| règle | accord exact | ±2 plies | écart médian | frontière max |
|---|---|---|---|---|
| la nôtre (développement ou cap 15) | **2,2 %** | 21,2 % | **+6 plies** | 29 |
| + rangée de fond creuse | 31,9 % | 54,5 % | +1 | 29 |
| + `majorsAndMinors ≤ 10` | 29,4 % | 49,4 % | +2 | 29 |
| + les deux | 56,7 % | 72,6 % | 0 | 29 |
| les deux, sans notre cap | 63,8 % | 73,3 % | 0 | **41**, et 3 parties sans milieu de partie |
| **leur règle entière** | **100,0 %** | 100 % | **0** | 36 |

**415 sur 415**, ce qui vaut aussi comme preuve que la transcription est fidèle.

Trois faits ont tranché :

1. **Notre critère documenté était la règle minoritaire.** La frontière venait du **cap du 15ᵉ
   coup dans 74,1 %** des parties, du développement dans 25,9 %. « Début de partie » voulait dire
   « les quinze premiers coups », trois fois sur quatre.
2. **`mixedness` *est* le garde-fou**, et c'est ce qui a éliminé la demi-adoption : elle est le
   **seul** critère qui tire à leur frontière dans **152 parties sur 415 (36,6 %)**. Sans elle, la
   règle sans cap laisse la frontière filer au ply 41 et 3 parties sans milieu de partie ; avec
   elle, le pire cas retombe à 36.
3. **Les parties qui ne quittent jamais le début ne sont pas un défaut.** Elles sont 97 sur 2 436
   (médiane **17 demi-coups**), et sur les 30 parties lichess concernées, **lichess lui-même n'en
   donne aucune de milieu de partie** : c'est son `middle: None`, reproduit à l'identique.

## Le garde-fou reproposé, et pourquoi il est refusé

« Une règle sans plafond sur le numéro de coup » est la première chose qu'un lecteur voudra
corriger, et la question a été posée dès le grill. Elle est **mesurée**, pas argumentée :

| | accord exact | ±2 plies | médiane | le cap tranche |
|---|---|---|---|---|
| V5 pur | **100 %** | 100 % | 0 | — |
| V5 + cap au ply 20 | 44,8 % | 59,3 % | **−1** | **55,2 %** |
| V5 + cap au ply 24 | 71,8 % | 84,1 % | 0 | 28,2 % |
| V5 + cap au ply 29 (l'ancien nôtre) | 92,0 % | 97,3 % | 0 | 8,0 % |

**La frontière médiane de V5 est au ply 21.** Un plafond posé *sous* la médiane cesse d'être un
garde-fou et redevient le critère principal — c'est très exactement le défaut qu'on retire ici,
reposé à un autre nombre. Et les parties sans milieu de partie ne sont pas un argument pour lui :
un cap à 20 en « rattraperait » 28 sur 97, c'est-à-dire qu'il **inventerait** un milieu de partie
sur des parties de 25 demi-coups finies dans l'ouverture, là où la référence répond `None`.

## Conséquences

- **ADR-0031 perd son oracle, et il faut le dire.** La division lichess était gardée « pour tester
  notre dérivation » ; notre dérivation étant désormais la leur, elle s'accorde **par construction**
  sur les deux frontières. C'était déjà vrai de la finale sans que personne le note — notre seuil à
  6 majeures et mineures *était* déjà le leur, d'où les 290/290 que D14 avait lus comme une
  corroboration. La colonne reste stockée (elle ne coûte rien et nous avons perdu une fois des
  données d'oracle) mais elle **ne discrimine plus rien** : le test qui la lit teste une copie.
- **On perd l'explicabilité d'une frontière.** « Développement achevé » se disait au joueur ;
  « la somme de 49 fenêtres 2×2 dépasse 150 » ne se dit pas. C'est l'arbitrage assumé par le
  demandeur — la fidélité à une implémentation éprouvée sur des millions de parties contre une
  règle maison qu'on savait énoncer et qui se trompait de 6 plies. `phase.ts` devra donc cesser
  de promettre au joueur qu'il peut « regarder une vraie partie et être en désaccord » sur cette
  frontière-là ; la finale, elle, reste un compte de pièces qui se vérifie à l'œil.
- **Rétroactivité, sans migration.** La `Phase` est dérivée à la lecture (ADR-0009) : aucune
  colonne, aucun temps moteur, rien à reconstruire. Mais les chiffres changent sous des lectures
  déjà scellées. Sur les 78 parties analysées de la base (10 998 points de chances perdues), la
  répartition passe de **34,8 / 37,8 / 27,4 %** à **24,2 / 48,4 / 27,4 %** : **10,9 % des dégâts
  changent de phase**, et **12 parties sur 78** changent de phase *dominante*. **La part de la
  finale ne bouge pas d'un dixième** — la frontière de finale était déjà la leur.
