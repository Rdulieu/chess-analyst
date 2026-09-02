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
