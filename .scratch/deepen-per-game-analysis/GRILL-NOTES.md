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
