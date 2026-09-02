# US-15a-bis — notes de grill

Branche : `integration/US-15a-bis-deepen-per-game-analysis`, depuis `develop` à jour (`1fcf9f3`).
Matière première : l'entrée US-15a-bis de `BACKLOG.md` et
`.scratch/per-game-analysis/COMPARISON-CHESSCOM.md` (204 lignes, établi le 2026-08-23).

## D1 — La story mesure **puis** corrige, dans cet ordre (option B)

Trois temps imposés :

1. **Prérequis bloquants**, qui ne dépendent d'aucune mesure : la reproductibilité (D2) et
   l'échelle des y du tracé de dérive. Cette dernière est bloquante par nature — `ceiling = total`
   fait finir **tout** tracé en haut de sa boîte, donc une revue faite en l'état jugerait
   l'encodage et non le dessin.
2. **La revue des 10 parties** — le gros morceau, et de la mesure sur de vraies parties.
3. **Les arbitrages**, rendus décidables par 2.

Ce qui rend cet ordre peu risqué : tout est **dérivé** (ADR-0009), donc corriger ne coûte ici ni
migration ni temps moteur. L'argument habituel pour séparer mesure et correction ne mord presque
pas.

## D2 — La reproductibilité est exigée du **récapitulatif**, pas des `Evaluation`s

Trois faits établis dans le code pendant le grill :

- `gameRecap` (`server/src/analysis/recap.ts:57`) est une **fonction pure** des `Evaluation`s
  stockées. Mêmes lignes en base ⇒ même chiffre. La reproductibilité du calcul n'est pas en cause.
- L'écart 60,6 / 56,5 sur la partie 51 ne peut donc venir que **des `Evaluation`s**, c'est-à-dire
  de deux passes moteur différentes.
- Cause mécanique : `server/src/engine/uci-driver.ts:53` envoie `position fen` puis `go depth`
  **sans jamais `ucinewgame` ni `Clear Hash`**. La table de transposition persiste sur toute la vie
  du process moteur, donc l'évaluation d'une position dépend de ce qui a été cherché **avant** elle.
  (`Threads` n'est pas fixé non plus, donc 1 par défaut — le multi-thread aurait rendu la chose
  irrémédiable.)

**Décision** : on n'exige rien du moteur. L'invariant produit est que les chiffres affichés dérivent
des `Evaluation`s en base — déjà vrai, déjà testé. ADR-0017 exige que le Player puisse vérifier
**comment le chiffre est arrivé**, pas que deux passes coïncident : l'auditabilité est une
propriété du chemin, et ce chemin est déterministe. Elle ne tombe donc pas, contrairement à ce que
craignait le backlog.

Rejeté — `ucinewgame` avant chaque position : achète un déterminisme **partiel** (il ne survit ni à
un changement de version de Stockfish, ni de profondeur, ni de MultiPV) contre un ralentissement de
chaque recherche, alors qu'US-15a paie déjà 2,1× pour MultiPV 2.

**Discipline qui rend deux runs comparables** (c'est elle qui remplace le déterminisme moteur) :
pendant toute la revue, on retune **sur les lignes déjà stockées**, jamais en ré-analysant. La
différence entre deux réglages n'est alors jamais mêlée au bruit moteur. ADR-0009 le permet
exactement.

Reste à mesurer en tranche 1 : l'écart 60,6 / 56,5 est-il seulement réel, ou une lecture croisée de
deux rapports produits sur deux bases différentes ? Le backlog le donne comme **non vérifié**.

## D3 — Contrat de l'outil : « ce qui a coûté la partie, **et** ce que je ne compte pas »

Ce que le dossier chess.com a établi et qui a écarté les formulations plus étroites :

- **Test de transposition** : leurs seuils rapportés appliqués à **nos** évaluations donnent **2**
  coups signalés, pas 6. Les seuils **n'expliquent pas** l'écart ; il y faut aussi un moteur plus
  fort *et* une composante qui n'est pas une chance de gain.
- **`Kc7` falsifie « il suffit d'abaisser un seuil »** : 0,36 pion, 1,9 point de chances — sous le
  seuil d'imprécision de n'importe quel barème, en chances **comme** en centipions — et pourtant
  signalé chez eux, parce qu'après `13.Nxf7+ Kc7?` `14.Nxh8` **emporte la tour**. L'éval ne bouge
  pas parce qu'ils gagnaient déjà de quatre pions. *Inférence, pas fait* : leur classifieur garde
  une notion **concrète** que les chances de gain effacent.
- **L'angle mort est double et ses deux moitiés sont indépendantes** : la saturation (la fin de
  chaque partie perdue est invisible) et l'**attribution** (l'adversaire a joué à 96,1, zéro faute,
  et notre app ne peut jamais le dire). La seconde ne doit rien aux seuils : elle vient de ce que
  les sévérités sont Player-only par décision. C'est elle qui menace le plus le verdict de 15d.

**Décision** : le dénominateur ne bouge **pas** — ADR-0017 et l'agrégat de 15c restent intacts —
mais les coups de la zone morte sont **nommés**, via le cas « montré par la partie, non retenu par
l'analyse » construit par la tranche 04 d'US-15a et que personne n'a jamais atteint. C'est le seul
contrat qui **ajoute de la vérité sans toucher au dénominateur**.

Rejeté — « assumer la métrique et documenter l'angle mort » : plus simple, mais l'app resterait
muette sur des coups qu'un humain voit d'un coup d'œil, ce qui est très concrètement ce qui fait
douter de la méthode. Rejeté — « analyser les deux camps » (le contrat de chess.com) : répond à
l'attribution, mais double le temps moteur et fait cesser l'app de ne parler que du Player ; débat
propre, pas celui-ci.

**Conséquence assumée** : cela exige un **prédicat**, donc un seuil de plus, alors qu'US-15a avait
tenu à n'en ajouter aucun. Et `Kc7` prouve qu'il ne peut **pas** être une chance de gain.

**Le prédicat n'est pas choisi ici** — c'est ce que la revue des 10 parties doit produire. Le
choisir maintenant, ce serait refaire sur le papier ce que la story dit d'aller mesurer. Ce que le
contrat détermine, en revanche, c'est **ce qu'on relève** sur ces parties : pour chaque coup que
l'app manque, ce qui aurait permis de le voir (matériel perdu ? séquence forcée ? autre chose ?).

## Hors de cet arbitrage, à décider séparément

- **Le vocabulaire positif** (« meilleur coup joué ») est quasi gratuit — la `Best line` est déjà
  stockée, c'est une égalité de chaînes — et compatible avec les trois contrats.
- **Un cas n'est pas un échantillon.** L'écart 1 contre 6 est mesuré sur **une** partie ; la revue
  doit le refaire. Et l'identification de `Bxb2` sur l'écran chess.com reste non confirmée.
- **Bug antérieur à ticketer** (hors tranche) : « Analyser cette partie » est silencieusement avalé
  tant qu'une bannière de pass non acquittée est affichée, et l'écran montre pendant ce temps la
  progression d'une **autre** partie.

## D4 — La matière première n'existe plus : il faut la ré-analyser

Vérifié pendant le grill, et ça corrige une prémisse du backlog :

- La partie **51** est bien en base (`id=51`, noirs, défaite, `Sarvarcikk` — l'identification de
  `COMPARISON-CHESSCOM.md` est exacte) mais porte **`analyzed = 0` et zéro `Evaluation`**. Idem
  pour 41, 72 et 86, les trois autres parties dont les parts de dérive ont été mesurées.
- Rien dans les **cinq `.bak`** (elles ne portent que 145-164, l'ancienne passe profondeur 0 /
  0 ligne, écartée par US-15a comme *legacy*), rien dans les **six worktrees**, rien dans les bases
  de test. Ces mesures ont été produites dans une base de worktree éphémère, disparue avec lui.

**Les chiffres de `COMPARISON-CHESSCOM.md` ne sont donc pas vérifiables en l'état**, et ADR-0015
dit que rien ne les reconstitue sinon du temps moteur.

Ce que la base porte aujourd'hui sous profondeur 16 / 2 lignes : **7 parties** — 161, 165, 166
(profil 1), 271 (profil 2), 714, 715, 716 (profil 3). Ce sont celles de la mesure sur les coups
forcés, pas celles de la comparaison.

**Le corollaire heureux du backlog — « rien de ce qui suit ne coûte de temps moteur » — est faux,
mais sans gravité** : mesuré sur les passes réelles, ~**1,25 s par position** (passe 5 : 280
positions en 5 min 50). Dix parties ≈ 800 positions ≈ **17 minutes**. C'est la matière première qui
coûte du moteur ; les arbitrages, eux, n'en coûtent toujours pas.

## D5 — L'échantillon : stratifié, profil unique, la 51 obligatoire

Rejeté — le **tirage aléatoire** : la question de la story n'est pas « à quelle fréquence l'angle
mort se produit-il » mais « **quel prédicat le referme** ». Il faut des cas, pas un taux ; un tirage
qui ne contient aucune fin de partie perdue est ici un tirage inutile. Rejeté — **les 7 déjà
analysées** : gratuites, mais choisies pour une autre mesure, donc d'un biais **silencieux**.

Retenu — un **échantillon stratifié**, dont le biais est avouable en une ligne, sur un **profil
unique** (ne pas mêler trois joueurs) :

- la **51** (pièce à conviction, seul bilan chess.com existant) ;
- 3 défaites où la partie bascule tôt — la zone morte, celle que la story vise ;
- 2 défaites serrées ;
- 2 victoires ;
- 1 nulle ;
- 1 partie dont le récapitulatif annonce une **dérive majoritaire**.

Ré-analyser la 51 teste au passage D2 : si le récapitulatif retombe sur 57,2 %, l'écart 60,6 / 56,5
était un artefact de rapport ; sinon, il est réel.

## D6 — Lichess est la référence de travail ; chess.com reste en réserve

Le demandeur ne peut fournir qu'**un** bilan chess.com de plus, mais **autant de bilans lichess que
nécessaire**. C'est mieux ainsi, et pas seulement par quantité : lichess est **ouvert** — sa
formule de précision est publiée (c'est déjà celle dont nous tirons la conversion en chances de
gain) et ses seuils vivent dans du code lisible. Un désaccord avec lichess est **diagnosticable** ;
un désaccord avec chess.com ne l'est jamais.

**L'expérience la plus tranchante de la revue, et donc la première à faire** — lichess classe,
comme nous, sur les chances de gain. Sur la partie 51 :

- **s'il manque `Kc7` et `Ke6` comme nous** → l'inférence du dossier est confirmée, chess.com a bien
  une composante **non probabiliste**, et notre angle mort est celui de *toute* méthode en chances
  de gain — la story cherche alors un prédicat concret ;
- **s'il les signale** → le problème n'est pas la métrique mais **notre calibrage** (seuils 10/20/30,
  plancher à 10 %, ou les deux), et la réponse est un retunage, sans seuil d'une nature nouvelle.

Deux issues, deux stories différentes, pour le prix d'une importation de PGN.

**Réserve à ne pas escamoter** : le rapport lichess dépend de **leur** régime moteur, pas du nôtre
(profondeur 16, 2 lignes, WASM). Un désaccord pourra donc être « moteur plus fort » plutôt que
« méthode différente » — l'ambiguïté qui a déjà brouillé la lecture de chess.com. **Parade** : sur
chaque désaccord, regarder si notre propre `Best line` recommande déjà le coup de lichess. Si oui,
le désaccord est un **seuil** ; sinon, c'est le **moteur**. Cela se lit sur des données déjà
stockées.

**Le second bilan chess.com n'est pas dépensé maintenant** — décision du demandeur : lancer la revue
d'abord, et le garder pour un cas qu'elle fera émerger.

## D7 — Le rapport de la revue : re-jouable **et** raisonné

La discipline de D2 (retuner sur les lignes stockées) veut qu'on refasse la comparaison à **chaque**
essai de seuil ou de prédicat : dix parties × N réglages. Un dossier écrit à la main borne le nombre
d'essais à deux ou trois, donc borne la qualité de l'arbitrage.

- **Un outil re-jouable**, sous `server/` **avec ses tests** (pas dans `.scratch/`) : il lit les
  `Evaluation`s, applique les seuils **courants**, et sort l'alignement par partie — nos coups
  signalés, ceux de lichess, les écarts, les motifs d'exclusion, le récapitulatif. Le coût d'un
  essai devient quasi nul.
- **Contrainte dure** : l'outil appelle `gameRecap`, `moveSeverities`, `countedMoves` — **jamais une
  copie**. Une seconde implémentation de la méthode n'agréerait que par chance et divergerait en
  silence, ce qu'ADR-0017 refuse explicitement. Le script ne calcule rien, il met en forme.
  `GET /api/games/:id/annotations` (`server/src/routes/games.ts:41`) rend déjà le relevé par coup.
- Les **bilans lichess** sont la seule donnée non dérivable : saisis une fois à la main.
- Le **dossier markdown** porte le raisonnement et les arbitrages, l'outil porte les chiffres.

Effet de bord à noter : rejouer ce rapport **est** l'expérience d'auditabilité qu'ADR-0017 promet au
Player. L'outil a une chance de survivre à la story — raison de le construire là où il peut rester.

## D8 — Le tracé de dérive : plafond par partie **conservé**, plus une ligne rouge et une échelle

Défaut confirmé dans le code : `client/src/components/DriftGraph.tsx:41` fait
`ceiling = Math.max(total, 1)`, donc **tout** tracé finit en haut de sa boîte, qu'il vaille 5 % ou
191 %.

Rejeté — l'**échelle fixe partagée** que proposait l'agent (plafond à 100 pour tous). Rejeté aussi —
un plafond **calculé sur le corpus** (95e centile) : l'échelle changerait à chaque import, donc le
dessin d'une partie changerait sans que la partie change, ce qu'ADR-0017 déteste. Rejeté — une
**échelle non linéaire** : on échangerait un mensonge contre un autre, moins visible.

**Retenu, décision du demandeur** : garder le plafond par partie, et rendre le mensonge impossible
plutôt que le corriger — une **ligne horizontale rouge à 100 %** et une **échelle chiffrée à
gauche**. L'œil ne lit plus « hauteur = gravité » puisqu'il a les graduations.

**Conséquence assumée** : deux parties ne se comparent plus d'un coup d'œil mais en lisant les
graduations. Acceptable ici, parce que la revue compare sur les **chiffres** du rapport (D7), pas
sur les dessins ; le graphique redevient la forme d'**une** partie, honnêtement graduée.

**7b — `ceiling = max(total, 100)`.** Sinon la ligne rouge tombe hors cadre sur toute partie perdant
moins de 100 %, c'est-à-dire le cas le plus fréquent (la 51 est à 57,2 %). Avec ce plafond :

| Total | Le tracé finit… | La ligne rouge |
| --- | --- | --- |
| 5 % | tout en bas, quasi plat | tout en haut |
| 57 % (la 51) | à 57 % de la hauteur | tout en haut |
| 191 % | en haut | à mi-hauteur (100/191) |
| 300 % | en haut | au tiers |

Le défaut disparaît donc **sous** 100 % et est **désamorcé** au-dessus : la ligne rouge devient
elle-même la règle graduée — deux tracés se comparent par la **position du trait**, repère de taille
constante dans une boîte de taille constante. C'est ce qu'une échelle partagée apportait, sans
plafond arbitraire et sans écrêtage (qui aurait menti précisément sur les parties que la story veut
regarder).

À regarder pendant la revue, pas tranché : faut-il distinguer par une teinte l'**aire au-delà du
trait rouge** ? Ça nommerait « la part au-delà d'une partie entière », mais ajoute un encodage à un
graphique qui en porte déjà deux. Se voit mieux sur de vraies parties que sur le papier.

## D9 — Le tracé garde le **cumul total**

Rejeté — **le résidu seul**. Et rejeté pour la bonne raison : le backlog craignait qu'un tracé du
résidu heurte la décision grillée d'US-15a, mais **ADR-0017 ne l'interdit pas**. L'ADR proscrit la
dérive en **épisodes bornés** (un épisode contenant un coup signalé compterait sa perte deux fois) ;
un **cumul** du résidu reste purement additif et ne double-compte rien.

La vraie raison de garder le cumul est la **réconciliation visuelle** : le tracé finit exactement sur
le total que le récapitulatif affiche à côté, vérifiable d'un coup d'œil — la promesse d'ADR-0017.
Un tracé du résidu finirait sur un nombre qui ne figure nulle part comme total, et il faudrait
expliquer l'écart. D8 renforce ce choix : avec la ligne des 100 % et l'échelle, le cumul devient
lisible, ce qui était son seul vrai défaut.

**Réserve du demandeur, à consigner telle quelle** : « je ne sais toujours pas vraiment si c'est
utile, mais c'est trop tôt pour supprimer ». Le graphique reste donc **écrit pour être supprimable**
(dérivé client, aucun schéma, aucun temps moteur), comme la tranche 06 d'US-15a l'avait prévu.

À regarder pendant la revue, avec la question de la teinte : tracer le cumul **en distinguant la part
du résidu** (deux aires empilées dont la somme est le total) garderait la réconciliation intacte tout
en rendant visible, comme surface, la part que rien d'autre ne montre. Un encodage de plus sur un
graphique qui en porte déjà trois — se juge après avoir vu dix parties.

## D10 — Deux corpus séparés, un par profil, **tous en blitz**

Le demandeur impose la partie **715** au corpus (Metalyst contre M10102010, « super intéressante »,
lecture personnelle en cours). Elle est déjà analysée sous profondeur 16 / 2 lignes — 110
évaluations, gratuite. Mais elle casse la contrainte « profil unique » de D5 : la 51 est
**DudulSmash / chess.com**, la 715 est **Metalyst / lichess**.

Elle apporte en échange deux choses non prévues :

- **Metalyst est un compte lichess**, donc le bilan lichess de cette partie est **natif** et non une
  approximation obtenue en réimportant un PGN. La réserve de D6 (« moteur ou méthode ? ») s'y
  applique moins qu'ailleurs : c'est le meilleur point de comparaison du corpus.
- **La lecture personnelle en cours est une donnée de la revue.** La `Confrontation` (US-16b) oppose
  la sévérité **déclarée** par le demandeur à celle **dérivée** par l'app. Sur cette partie on aura
  donc trois voix — l'app, lichess, et l'humain — et la troisième est la seule qui juge « valeur pour
  la progression » plutôt que « valeur pour le résultat », c'est-à-dire exactement la tension de D3.
  Des coups déclarés graves que l'app ne signale pas, ce serait un relevé du **prédicat manquant**
  fait par un humain sur une vraie partie.

Rejeté — **abandonner la contrainte** (dix parties tous profils) : on perdrait la lecture des
**taux**, dont 15c a besoin pour son dénominateur ; mêler deux joueurs de niveaux différents rend
ininterprétable la part de coups sous le plancher ou la part de dérive. Rejeté — **l'ossature plus
des cas nommés** (recommandation de l'agent) : moins cher, mais le demandeur accepte la longueur.

**Retenu** : **deux corpus séparés**, un par profil, chacun stratifié selon D5 — soit une vingtaine
de parties. Le demandeur : « ce n'est pas grave si c'est long, cela permet de commencer à travailler
sur de la revue **en batch** ». Conséquence à exploiter : le rapport de D7 cesse d'être un outil à
une partie, et c'est déjà la forme du *fold* dont 15c aura besoin.

**Cadence fixée au blitz dans les deux corpus.** Le relevé montre que chez Metalyst le vrai facteur
confondant n'est pas le profil mais la **cadence** — 5 cadences, dont 23 défaites en correspondance
et 5 en bullet : deux jeux différents, où le taux de coups sous le plancher et la dérive n'ont rien
de comparable. DudulSmash est blitz à 96 % ; Metalyst a 45 défaites, 36 victoires et 4 nulles en
blitz, largement de quoi bâtir la strate. Bénéfice supplémentaire : **les deux corpus deviennent
directement comparables entre eux**, donc un écart se lit comme un écart de joueur et non de cadence.

Raison de fond : un **prédicat** se trouve sur des cas homogènes ; introduire la cadence maintenant,
c'est se donner une explication de rechange pour chaque désaccord — « c'est peut-être la cadence » —
l'ambiguïté même qu'on a neutralisée en D6. Le demandeur ajoute que le blitz est **sa cadence la plus
jouée et celle où il veut progresser en ce moment**.

Gardé en réserve, et il redeviendra net **après** la revue : quelques parties de correspondance en
cas nommés, pour demander « est-ce que le prédicat tient aussi en correspondance ? ».

Contrainte matérielle à connaître : **DudulSmash n'a que 2 nulles**, toutes deux en blitz. La strate
« 1 nulle » est réalisable mais sans marge — ce sera l'une des deux, sans choix.

Coût : ~20 parties ≈ 1 600 positions ≈ **33 minutes** de moteur, dont 7 parties déjà analysées.

## D11 — Le relevé : cinq signaux mécaniques, plus un contrôle humain **borné**

**Tout est déjà en base.** La table `evaluations` porte par demi-coup `fen`, `cp`, `mate`, `pv`,
`cp2`, `mate2`. Les signaux candidats coûtent donc **zéro temps moteur** — l'option n'est pas
« construire un appareil de mesure » mais « lire cinq colonnes qu'on stocke déjà » :

| Signal | D'où il sort | Le coup qu'il vise |
| --- | --- | --- |
| Variation de **matériel** | comptage sur les `fen` de deux demi-coups consécutifs | `Kc7` (la tour perdue) |
| **Distance au mat** | la colonne `mate` | `Bd4` (M7 → M1) |
| Chute en **centipions** | la colonne `cp` | le calibrage brut |
| Séquence **forcée** | `pv`, et « un seul coup légal » depuis la `fen` | le motif d'exclusion existant |
| **Écart à la deuxième ligne** | `cp2` / `mate2` | « il n'y avait qu'un coup » — l'acuité de la position |

Le cinquième n'avait pas été listé : c'est un usage du **MultiPV 2** qu'US-15a a payé 2,1× et dont on
ne tirait jusqu'ici que la `Best line`. Un coup joué là où trois coups se valent n'a pas le même
statut qu'un coup joué là où un seul tenait.

Rejeté — le **jugement au coup par coup sur tout le corpus** : une centaine de jugements
**rétrospectifs**, et on trouve toujours *une* explication à un coup dont on sait déjà qu'il est
mauvais. Le risque n'est pas la lenteur, c'est de **fabriquer un prédicat qui n'existe que parce
qu'on l'a cherché**.

**Retenu** : les cinq signaux calculés sur **tous** les coups du Player — signalés ou non, comptés ou
non — puis un test de **discrimination** : lequel sépare les coups que lichess signale et que nous
manquons, du reste. Un signal qui ne sépare pas est écarté **par les données**, pas par une opinion.
Ce qui décide : cela transforme une tâche de jugement en tâche de **lecture**, c'est **re-jouable**
(donc compatible avec D2 — essayer un signal, rejouer le rapport, regarder), et c'est la seule
approche capable d'un **résultat négatif exploitable**. « Aucun des cinq signaux ne sépare » serait
une vraie conclusion, et pousserait vers « assumer l'angle mort » sur des **données** plutôt que par
lassitude.

**Le contrôle humain est gardé mais borné** — décision du demandeur : « on garde A en contrôle mais
pas sur tous les coups, trop cher ». Il ne s'applique **pas** au corpus entier mais aux seuls
endroits où la mécanique se trompe : les coups qu'un signal désigne et que **personne** ne signale,
et les coups que lichess signale et qu'**aucun** signal ne rattrape. C'est là que le jugement humain
vaut son prix, pas sur les quatre-vingts coups évidents. Le rapport de D7 doit donc **produire cette
liste lui-même** — le contrôle se lit, il ne se cherche pas.

**Deux garde-fous, coût nul :**

1. **Relever les signaux sur les coups *non* problématiques aussi.** Un signal vrai sur les six coups
   manqués mais aussi sur cent coups corrects ne sert à rien — sans le dénominateur complet, on ne
   peut pas le voir.
2. **Attribuer le désaccord avec lichess avant de l'expliquer** (parade de D6) : notre `Best line`
   recommande-t-elle déjà leur coup ? Si oui le désaccord est un **seuil**, sinon c'est le **moteur**.

**Implication pour l'outil de D7** : il sort une ligne **par coup du Player**, pas par partie — le
récapitulatif par partie en est l'agrégat. La forme du *fold* de 15c.

## D12 — L'attribution entre dans la story, comme **mesure** seulement

**Le dossier se trompe sur le prix, et ça décide la question.** `evaluations` porte **une ligne par
demi-coup, les deux couleurs confondues** — partie 715 : plies 0 à 109, 110 lignes pour 110
demi-coups. Le moteur évalue donc **déjà toutes les positions**, y compris celles qui suivent un
coup de l'adversaire ; une évaluation de position ne connaît pas la couleur de qui vient de jouer.

Donc l'option 3 de `COMPARISON-CHESSCOM.md` — « analyser aussi l'adversaire coûte du temps moteur,
**le double par partie** » — est **fausse**. Les sévérités de l'adversaire se **dérivent** des mêmes
lignes (ADR-0009) : la même fonction appliquée à l'autre couleur. Coût moteur **zéro**, migration
zéro. L'objection n'est donc pas le prix mais le **périmètre**.

Le problème qu'elle traite : l'adversaire de la 51 a joué à 96,1, zéro faute, niveau estimé 1800, et
notre app ne peut **jamais** le dire — les sévérités sont Player-only par décision. Le Player ne
distingue pas *je me suis effondré* de *il a été trop fort*, deux conclusions opposées sur ce qu'il
faut travailler. C'est ce qui menace le plus le verdict de 15d.

Rejeté — **renvoyer à 15d** : la revue va de toute façon lire chaque coup de vingt parties ; dériver
l'autre couleur au passage ne coûte qu'une colonne de plus, alors que le refaire plus tard voudrait
dire re-monter tout l'appareil. Rejeté — **mesure et affichage** : le plus utile au Player, mais le
plus loin du périmètre annoncé, et la décision d'affichage mérite d'être prise sur un chiffre.

**Retenu** : on dérive les sévérités de l'adversaire pour les vingt parties, elles entrent dans le
rapport de D7, et **rien n'est affiché dans l'app**. Aucun schéma, aucun seuil, aucun dénominateur —
ni ADR-0017 ni le contrat D3 ne bougent. C'est la définition d'une mesure. Effet recherché : si le
jeu adverse n'explique presque rien sur vingt parties, **15d n'a pas de problème d'attribution** et
on aura économisé une feature ; sinon, 15d saura combien elle doit payer.

**Réserve du demandeur, retenue explicitement** : « zéro faute en face » n'est pas « il a bien joué ».
Un adversaire qui ne fait aucune faute dans une position gagnée depuis le coup 12 n'a rien prouvé. La
mesure porte donc sur ses coups **dans la partie encore disputée** — sinon elle dirait mécaniquement
que tous les adversaires jouent bien, le symétrique exact de notre propre angle mort.

## D13 — Vocabulaire positif : le **principe** est tranché, la feature est reportée

**Le glossaire avait déjà tranché, et le dossier l'ignorait.** `CONTEXT.md`, à propos de la
`Candidate line` : « la coïncidence textuelle avec la `Best line` — même premier coup ? — serait
**gratuite**, et déclarerait une idée fausse pour avoir perdu 2 % des chances tout en déclarant juste
un coup **copié**. Cela enseignerait l'imitation. » Or « meilleur coup joué »
(`bestLine[0] === coup joué`), la formulation de `COMPARISON-CHESSCOM.md`, **est** cette
comparaison-là. Elle est bon marché pour la raison même qui la rend fausse.

**Principe retenu** : si un vocabulaire positif arrive un jour, il sera fondé sur le **coût**, comme
tout le reste ici — un coup qui n'a rien coûté est bien joué, qu'il soit ou non celui du moteur —
et **jamais** sur la coïncidence avec la `Best line`. C'est plus intéressant que le vocabulaire de
chess.com : eux nomment le coup du moteur, nous nommerions le coup qui n'a rien coûté. Sur `Kc7`, ça
change tout.

**Réserve du demandeur, décisive pour la story qui livrera la feature** : le seuil devra être **très
bas**, bien en-deçà de 10 %. Le glossaire dit qu'« un coup qui n'est pas le meilleur mais perd moins
de 10 % **n'est pas une faute** » — mais **« n'est pas une faute » et « est bien joué » sont deux
barres différentes**, et prendre la première pour la seconde serait précisément l'erreur. Le seuil
haut borne la sévérité ; le vocabulaire positif en demande un autre, beaucoup plus exigeant.

**Feature reportée hors de cette story** : c'est de l'affichage, la story est de mesure et
d'arbitrage. Elle ne débloque pas 15c, ne referme pas l'angle mort, ne sert aucune des vingt parties
de la revue. L'y glisser parce que « c'est pas cher » est la façon dont une story de mesure devient
une story de construction.

Où le principe est consigné : **ici et dans le PRD**, pas dans `CONTEXT.md` — le glossaire ne décrit
pas un concept qui n'existe pas encore. Il y entrera avec la feature.

## D14 — `Phase` : mesurer la **sensibilité**, et confronter au découpage lichess

Ce que le code dit, et qui corrige le backlog — `server/src/analysis/phase.ts` :

- **Le cap n'est pas un bug.** `capReached` teste `fullmove === 15 && toMove === "b"`, soit « la
  position après le 15e coup des **Blancs** », et le commentaire nomme explicitement le piège que
  `fullmove >= 15` seul déclencherait (un demi-coup trop tôt, au 14e des Noirs). C'est une **lecture**
  appliquée correctement ; l'autre lecture décale d'un coup entier.
- **« Développement achevé » est bien exigé des deux camps**, avec sa raison écrite : la `Phase` est
  celle de la **partie**, pas d'un joueur — une partie où les Blancs ont roqué et les Noirs n'ont pas
  bougé une pièce n'a pas fini de commencer.
- **La `Phase` n'entre dans aucun calcul.** `recap.ts` ne la lit pas : elle est affichée sur chaque
  coup, rien de plus. Elle ne devient une variable qu'en 15c/15d, comme axe d'agrégation — le grill
  d'US-16 avait déjà noté que « l'axe Phase attend une détection fiable ».

Rejeté — **regarder vingt parties et juger à l'œil si « ça semble juste »** : de l'esthétique
déguisée en mesure, dont le résultat serait le sentiment de celui qui regarde. Rejeté — **sortir la
`Phase` du périmètre** : défendable puisqu'elle n'alimente rien, mais elle coûte ici une colonne dans
un rapport qu'on écrit de toute façon, et l'écarter ferait redécouvrir le problème à 15c **après**
avoir bâti dessus.

**Retenu** : mesurer la **sensibilité** plutôt que la justesse. Question posée autrement — *est-ce que
le choix change quelque chose ?* On calcule les deux lectures du cap (et l'exigence à un camp plutôt
qu'aux deux) sur les vingt parties, et on compte combien de coups changent de `Phase`. Un coup par
partie : le débat est vide et on le **clôt**. Quinze : l'axe est fragile et **15c doit le savoir avant
de bâtir dessus**. C'est un fait, pas une opinion — et les deux lectures se calculent sur les mêmes
`fen` déjà stockées.

**Correction apportée par le demandeur, et elle change la portée** : l'agent avait posé qu'aucune
référence externe n'existait pour la `Phase`. **Faux — les analyses lichess donnent les segments de
phase.** Il y a donc un comparateur, et comme pour D6 il est **ouvert** : on peut non seulement
confronter nos frontières aux leurs, mais **lire leur règle**. Le relevé porte donc deux choses : la
sensibilité de notre règle à ses deux lectures, et son écart au découpage lichess.

## D15 — Les motifs d'exclusion restent **deux** ; le signal est nommé à côté

D'abord, la question « faut-il retirer la distinction des coups forcés à l'écran ? » se referme
d'elle-même. Le glossaire dit que **`forced` peut exclure un coup qui *est* signalé** — un unique coup
légal qui se trouve être une reprise catastrophique fait chuter les chances comme un `Blunder` et
n'est la faute de personne. « Aucun coup forcé n'est jamais signalé » sur sept parties est donc un
**fait d'échantillon**, pas une propriété. C'est même exactement le cas que le mécanisme « montré par
la partie, non retenu par l'analyse » avait été bâti pour porter — et **D3 vient de lui donner un
second occupant**. Le mécanisme n'était pas mort, il n'avait jamais tiré. On s'apprête à s'en servir.

Reste le vrai choix de modèle. Les coups de la zone morte que D3 va marquer (`Ke6`, `Bxb2`, `Bd4`)
sont **déjà** exclus, sous le motif `decided`.

Rejeté — **les laisser `decided` sans plus** : deux coups exclus pour la même raison s'afficheraient
différemment, l'un avec un glyphe, l'autre sans, et **rien dans le modèle n'expliquerait pourquoi**.
Rejeté — **un troisième motif** (« décidée, mais la faute est visible ») : le modèle dirait ce que
l'écran montre, mais au prix d'un motif de plus dans un vocabulaire qu'ADR-0017 tient volontairement
court, et 15c devrait décider quoi en faire.

**Retenu** : le motif reste `decided` — `UncountedReason` garde ses **deux** valeurs — et c'est le
**signal** qui est nommé à côté. Deux axes distincts : *pourquoi ce n'est pas compté* (le motif,
inchangé) et *pourquoi c'est quand même montré* (le signal qui l'a déclenché : « du matériel a changé
de camp », « le mat est passé de 7 à 1 »).

Ce qui décide :

1. La propriété qu'ADR-0017 protège reste **intacte** — les motifs partitionnent le dénominateur et
   leur nombre ne bouge pas. **15c continue de sommer deux motifs, pas trois.**
2. C'est cohérent avec la façon dont l'app parle déjà : le glossaire refuse les adjectifs inventés
   (« erreur tactique ») et montre **la ligne** ; ici on montre **le signal** — un fait mécanique,
   pas notre jugement, et vérifiable par le Player sur l'échiquier.
3. Ça reste ouvert : si la revue trouve **deux** signaux discriminants au lieu d'un, ce modèle les
   accueille sans motif nouveau, là où un troisième motif en demanderait un quatrième.

**Prix assumé** : un champ de plus dans le relevé par coup, donc dans ce qu'une partie « porte » au
sens d'ADR-0017. Peu, mais pas rien — et tranché maintenant parce que le rapport de D7 doit le
produire **dès la revue**.

---

# ⏸ Grill en pause — reprendre ici

~~Mis en pause après D10, à la question 11.~~ **Grill repris le 2026-09-02** ; la question 11 est
tranchée en D11 ci-dessus. Ce qui suit reste la liste des sujets ouverts.

## La question 11, telle qu'elle était posée

**Comment relève-t-on « ce qui aurait permis de voir le coup » ?** C'est l'opération centrale que le
contrat D3 impose, et la plus coûteuse si elle est mal conçue : vingt parties × ~40 coups du Player
≈ 800 coups.

- **(A) Jugement au coup par coup.** Pour chaque coup que lichess signale et pas nous, regarder la
  position et écrire ce qui l'explique. Fidèle à « avec de vraies parties sous les yeux ». Mais une
  centaine de jugements, et surtout **rétrospectifs** : on trouve toujours *une* explication à un
  coup dont on sait déjà qu'il est mauvais. Le risque n'est pas la lenteur, c'est de fabriquer un
  prédicat qui n'existe que parce qu'on l'a cherché.
- **(B) Signaux candidats calculés sur *tous* les coups, puis test de discrimination.** L'outil
  calcule mécaniquement, pour chaque coup du Player — signalé ou non, compté ou non — des signaux qui
  ne sont **pas** des chances de gain : variation de **matériel** (le signal de `Kc7`), **distance au
  mat** quand il y en a un (celui de `Bd4`), **chute en centipions** brute, présence d'une **séquence
  forcée**. Puis on regarde lequel **sépare** les coups que lichess signale et que nous manquons, du
  reste. Un signal qui ne sépare pas est écarté par les données, pas par une opinion.
- **(C) Les deux** : (B) produit la séparation, (A) contrôle sur un petit nombre de coups qu'on n'a
  pas trouvé une corrélation absurde.

**Recommandation de l'agent au moment de la pause : (C), avec (B) comme moteur.** Ce qui décide :
(B) transforme une tâche de **jugement** en tâche de **lecture**, et elle est re-jouable — donc
compatible avec la discipline de D2 (essayer un signal, rejouer le rapport, regarder). C'est aussi
la seule approche capable d'un **résultat négatif exploitable** : « aucun de ces quatre signaux ne
sépare » serait une vraie conclusion, et pousserait vers le contrat « assumer l'angle mort » sur des
**données** plutôt que par lassitude. Le rôle de (A) devient alors borné : une dizaine de coups
regardés à la main, choisis **là où (B) se trompe** — les coups qu'un signal désigne et que personne
ne signale, et l'inverse.

**Deux garde-fous proposés, coût nul :**

1. **Relever les signaux sur les coups *non* problématiques aussi.** Un signal vrai sur les six coups
   manqués mais aussi sur cent coups corrects ne sert à rien — sans le dénominateur complet, on ne
   peut pas le voir.
2. **Attribuer le désaccord avec lichess avant de l'expliquer** — seuil ou moteur — par la parade de
   D6 : notre `Best line` recommande-t-elle déjà le coup de lichess ? Sinon on cherchera un prédicat
   pour expliquer un écart qui n'est qu'une différence de force de moteur.

**Implication pour l'outil de D7** : il sort une ligne **par coup du Player**, pas par partie — le
récapitulatif par partie en est l'agrégat. Encore une fois, la forme du *fold* de 15c.

## Ce qui reste ouvert après la question 11

Rien de tout cela n'a été abordé ; à traiter à la reprise, dans cet ordre suggéré :

- **Les seuils de `Phase`.** Le cap « coup 15 » est implémenté comme *le 15e coup des Blancs est le
  premier hors début de partie* ; l'autre lecture décale d'un coup entier. Et « développement
  achevé » est exigé **des deux camps** — lecture retenue, jamais validée sur des parties. Annoncés
  « heuristiques, pas des faits » et affichés exprès pour être contestés.
- **Le plancher `Counted Move` à 10 %**, jamais regardé sur des données : combien de coups une vraie
  partie perd-elle par « position déjà décidée » ? Si la part est grosse, le dénominateur de 15c
  l'est aussi. Seule mesure connue, et **perdue avec sa base** : 4 coups sur 22 sur la partie 51.
- **Les coups forcés.** Mesuré sur sept parties : **aucun coup forcé n'est jamais signalé** (avant et
  après sont deux lectures de la **même** recherche). Le motif d'exclusion « forcé » n'existe donc
  que pour le dénominateur — vérifier qu'il vaut encore la peine d'être **distingué à l'écran**.
- **Le vocabulaire positif** (« meilleur coup joué »). Quasi gratuit — la `Best line` est déjà
  stockée, c'est une égalité de chaînes — et compatible avec les trois contrats de D3. Peut se
  décider seul, à tout moment.
- **L'attribution** — l'app ne peut jamais dire « en face c'était très bien joué » (l'adversaire de
  la 51 a joué à 96,1, zéro faute, niveau estimé 1800). Le Player ne peut pas distinguer *je me suis
  effondré* de *il a été trop fort*, deux conclusions opposées sur ce qu'il faut travailler.
  **Structurel** (les sévérités sont Player-only par décision) et c'est ce qui menace le plus le
  verdict de 15d. À décider : dans cette story, ou renvoyé à 15d ?
- **Où dépenser le second bilan chess.com** — décision explicitement reportée après la revue.
- **Le découpage en tranches**, puis `/to-prd` et `/to-issues`.
- **Bug antérieur à ticketer**, hors périmètre : « Analyser cette partie » est silencieusement avalé
  tant qu'une bannière de pass non acquittée est affichée — rien ne se passe, aucun message — et
  l'écran montre pendant ce temps la progression d'une **autre** partie. Le chemin de réanalyse de
  la tranche 07 n'est **pas** touché (re-testé) ; le chemin ordinaire l'est.

## État matériel du dépôt à la pause

- Branche `integration/US-15a-bis-deepen-per-game-analysis`, depuis `develop` à jour (`1fcf9f3`).
  Aucun code touché ; seul ce fichier a été écrit.
- **Analysées** sous profondeur 16 / 2 lignes : **161, 165, 166** (profil 1), **271** (profil 2),
  **714, 715, 716** (profil 3). Sept parties.
- **Non analysées, et il le faut** : la **51** et les autres parties des deux strates.
- Profils : 1 `DudulSmash` (chesscom), 2 `Nonomoho` (chesscom), 3 `Metalyst` (lichess),
  4 `Monado_Boy` (lichess).
