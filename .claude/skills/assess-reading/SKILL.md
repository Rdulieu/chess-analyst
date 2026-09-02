---
name: assess-reading
description: Assesses how well the Player read one Game — their sealed Personal analysis set against the engine's Analysis pass, plus what their written notes reveal about how they think. Produces a reasoning walkthrough in the terminal and a published report. Use when asked to evaluate a reading, judge the Player's analytical ability on a Game, or turn a Confrontation into a verdict with strengths and weaknesses.
---

# /assess-reading — évaluer la lecture du joueur sur une partie

Le produit calcule une **`Confrontation`** : des taux, une matrice, des comptes. Ce skill fait le
travail que la `Confrontation` ne fait pas — **interpréter**. Il répond à « qu'est-ce que cette
lecture dit de ma façon d'analyser », pas à « quel est mon taux d'accord ».

Il est **hors application** et le reste : il ne touche à aucune table, n'écrit rien en base, ne
modifie pas la lecture. Il lit, il croise, il conclut.

> **Ce n'est pas `/agentic-tests`.** Celui-là valide l'app. Celui-ci lit les données de l'app pour
> juger le joueur. Aucun des deux ne remplace l'autre.

## Ce qu'il produit

1. **Dans le terminal** : la démarche, étape par étape, pour que le demandeur puisse contester
   chaque chiffre — puis le verdict en clair.
2. **Un rapport publié en Artifact** : la courbe, les tableaux coup par coup, la matrice, les
   points forts / points faibles, et les réserves. Charger `artifact-design` avant de l'écrire, et
   `dataviz` avant d'écrire la moindre ligne de graphique.

## Prérequis

- La partie porte une **lecture scellée** (`personal_analyses.sealed_at` non nul). Une lecture
  ouverte ne se juge pas : le joueur n'a pas fini de dire ce qu'il pense.
- La partie est **analysée** (`games.analyzed = 1`), sinon il n'y a rien en face.
- L'app tourne (`npm run dev` à la racine : serveur `:3001`, client `:5173`). À défaut, tout est
  lisible en base, mais la `Confrontation` devra être recalculée à la main — préférer l'API.

## Étape 1 — situer la partie

Le demandeur donne en général une URL (`/analyse/<gameId>/confrontation`) et un adversaire.

```bash
sqlite3 -line server/chess-analyst.db \
  "select id,profile_id,opponent,player_color,result,date,time_control_category,
          eco,opening_name,analyzed,game_url from games where id=<ID>;"
```

**`profile_id` et `player_color` sont les deux valeurs qui conditionnent tout le reste.** Le premier
parce que chaque route est cloisonnée par `Profile` (ADR-0014) et répondra une erreur sans lui ; le
second parce qu'il fixe la parité des demi-coups (étape 3).

## Étape 2 — rassembler les quatre sources

Quatre, et il faut les quatre : trois suffisent à produire un rapport faux.

| Source | Où | Ce qu'elle seule apporte |
| --- | --- | --- |
| La `Confrontation` | `GET /api/personal/<id>/confrontation?profileId=<p>` | la matrice, les moments clés, les exclusions, la provenance |
| Les annotations moteur | `GET /api/games/<id>/annotations?profileId=<p>` | les chances de gain **par demi-coup**, la sévérité, `chancesLost`, la `Best line`, le récapitulatif |
| Les marques du joueur | table `personal_marks` | **les notes écrites** — l'API de confrontation ne les rend pas |
| Le PGN | `games.pgn` | la notation SAN, pour parler de `37…e2` et non de « ply 74 » |

```bash
curl -s "http://localhost:3001/api/personal/<ID>/confrontation?profileId=<P>" | python3 -m json.tool
curl -s "http://localhost:3001/api/games/<ID>/annotations?profileId=<P>"      | python3 -m json.tool

sqlite3 -separator '|' server/chess-analyst.db \
  "select m.ply, coalesce(m.declared_severity,''), m.key_moment, m.posterior,
          replace(coalesce(m.note,''),char(10),' / ')
     from personal_marks m join personal_analyses a on a.id = m.analysis_id
    where a.game_id = <ID> order by m.ply;"
```

> **Les notes sont la moitié du sujet.** C'est le seul endroit où le joueur dit *comment* il
> raisonne, et non seulement *ce qu'il conclut*. Une évaluation qui n'exploite que la matrice passe
> à côté de l'essentiel — sur la partie 715, la meilleure observation du rapport venait d'une note,
> pas d'un chiffre.

## Étape 3 — construire la table jointe

Une ligne par demi-coup : `ply · numéro de coup · camp · SAN · verdict déclaré · sévérité moteur ·
chancesLost · counted/raison · moment clé · note`.

Trois règles pour ne pas produire une table fausse :

- **Parité.** `ply n` = la position **après** le n-ième demi-coup, et le demi-coup 1 est aux blancs.
  Donc les coups du joueur sont les **plies pairs s'il a les noirs**, impairs s'il a les blancs. Se
  tromper ici attribue au joueur les coups de l'adversaire, et le rapport entier est faux sans
  jamais paraître incohérent.
- **Le joueur peut marquer n'importe quel demi-coup**, y compris ceux de l'adversaire. Ces marques
  existent en base et **ne sont pas notées** par la `Confrontation` (`unscored.opponent`). Ne pas
  les jeter : l'étape 6 les exploite.
- **Le SAN vient du PGN**, pas de l'API. Nettoyer les commentaires `{…}` et les numéros de coup
  avant d'indexer.

## Étape 4 — lire les chiffres, en sachant ce qu'ils excluent

Le taux d'accord se lit sur un dénominateur qu'il faut savoir reconstituer :

```
scorable = examined − (verdicts « Bon »)
agreed   = la diagonale de la matrice
```

**Trois exclusions, et la deuxième est un piège.**

1. **`decided`** — les coups joués dans une position déjà décidée ne comptent pas (ADR-0017). Sur
   une partie perdue, c'est souvent une quinzaine de coups en fin de partie.
2. **Les verdicts « Bon » sont retirés du taux d'accord**, parce que le moteur n'a pas de bande pour
   le mérite : il ne rapporte que des fautes. **Conséquence à vérifier systématiquement** : la case
   *« Bon » × « Erreur »* (ou × « Bévue ») est le pire jugement possible — le joueur a félicité une
   faute — et elle est **hors du taux**. Sur la partie 715, le taux de 84 % ne contenait pas la plus
   mauvaise lecture de la partie. Toujours l'annoncer.
3. **Les coups de l'adversaire** — traités à l'étape 6.

## Étape 5 — chercher le motif, pas le score

Un taux ne dit rien. Cinq lectures qui, elles, disent quelque chose :

**a. Où sont tombés les dégâts.** Sommer `chancesLost` des coups flagués par tranche de partie.
Chercher une phase qui concentre l'essentiel. Sur 715 : **81 % après le coup 28**, et cette phase
avait un nom — deux tours contre une dame.

**b. La taille des fautes manquées contre celle des fautes vues.** Si les manquées sont
systématiquement les plus petites, le joueur détecte la douleur et pas la dégradation. C'est un
motif, pas une statistique.

**c. Où tombent les fausses alertes.** Regarder le coup **précédent**. Une fausse alerte qui suit
une vraie faute signifie que le joueur punit le coup qui suit la chute, pas celui qui l'a causée.

**d. Les moments clés.** `keyMoments.damageFound / damageTotal` dit s'ils visent juste. `misses[]`
donne pour chacun la faute réelle la plus proche. Attention : un moment clé posé sur un **coup
adverse** compte comme manqué, ce qui peut être une intention et non une erreur — lire la note.

**e. Les notes contre la chronologie.** C'est la lecture la plus productive et personne d'autre ne
la fait. Relire les notes dans l'ordre des coups en cherchant :
- une note qui **décrit** une faute que le verdict déclaré ne nomme pas (le joueur avait vu, il n'a
  pas osé noter — la métrique est alors plus sévère que la réalité) ;
- un regret écrit au coup *n* que le joueur n'est jamais revenu appliquer après avoir compris le
  coup *n+1* (l'analyse ne se relit pas) ;
- l'endroit où les notes **s'arrêtent** — souvent avant la fin comptée par le moteur.

## Étape 6 — mesurer les coups de l'adversaire

L'app ne classe que les coups du joueur. Si le joueur a marqué des coups adverses (il le fait, et il
a demandé que ça compte), les mesurer soi-même : pour un coup du camp *S* au demi-coup *p*,
la chute vaut `chances_S(p−1) − chances_S(p)`, avec `chances_noir = 100 − whiteWinChances`.

> **Ne jamais inventer de seuil.** Le projet en publie **un**, et `move-quality.ts` dit explicitement
> pourquoi il ne doit pas y en avoir un second : `INACCURACY_DROP = 10`, puis **≥ 20 erreur**,
> **≥ 30 bévue**. Une première version de ce rapport a classé les coups adverses avec un seuil ad
> hoc à −4 et a compté « 9 justes, 1 fausse alerte » là où la bande publiée donne **8 justes, 3
> fausses alertes**. Le motif s'en trouvait affaibli, pas renforcé. Lire `classifyMove` et
> l'appliquer.

Lister aussi les fautes adverses **réelles et non marquées** : elles disent ce que le joueur ne
regarde pas du tout.

## Étape 7 — les réserves, qui ne sont pas facultatives

Trois, à écrire dans le rapport même quand elles arrangent personne.

**La provenance.** Lire `personal_analyses.engine_seen_before_seal`. À `1`, l'app tient la lecture
pour **informée**, et tout le rapport perd son sens — sauf que ce drapeau est **connu pour être
faussement positif** (US-28 : un `Review mode` « Détaillé » mémorisé le pose au montage de l'écran,
avant toute lecture, et rien ne l'efface). Ne pas trancher à la légère : chercher des **indices
internes** d'une lecture réellement aveugle — un coup flagué déclaré « Bon », une faute laissée sans
marque, des fausses alertes. Personne qui lit les annotations du moteur ne fait cela. Conclure, et
**dire que c'est un jugement et non une preuve**.

**Le régime.** `regime` donne la profondeur et le nombre de lignes. À profondeur 16 en blitz entre
joueurs de club, un écart de 10 points de chances est du bruit autant qu'une faute. Les bévues sont
solides, les imprécisions le sont beaucoup moins — le dire avant de bâtir un motif dessus.

**Une partie n'est pas un profil.** Un motif cohérent d'un bout à l'autre d'une partie est crédible,
pas établi. Il faut trois ou quatre lectures scellées pour distinguer une façon de lire de l'humeur
d'un dimanche.

## Étape 8 — rendre

**Dans le terminal** : la démarche d'abord (les sources, ce qui a été exclu et pourquoi, les motifs
trouvés), le verdict ensuite. Le demandeur doit pouvoir attaquer n'importe quel chiffre.

**Dans le rapport** : charger `artifact-design`, puis `dataviz` avant tout graphique. Ce qui a
fonctionné :
- la **courbe des chances du joueur** sur toute la partie, marqueurs sur les coups flagués et les
  fausses alertes — chaque état avec **sa forme autant que sa couleur** (rond / triangle / losange),
  parce que les statuts rouge-vert échouent en deutan ; valider la palette avec
  `scripts/validate_palette.js`, en clair **et** en sombre ;
- un tableau des seuls coups qui décident du verdict — les flagués plus les fausses alertes. Les
  vingt coups sains déclarés sains sont un accord silencieux, sans intérêt pour le diagnostic ;
- la matrice, **accompagnée de ce qu'elle cache** ;
- points forts / points faibles en deux colonnes, chaque point **adossé à un coup nommé**.

## Ton

Le demandeur veut être évalué, pas ménagé. Un point faible se nomme et se chiffre. Un point fort
aussi : « tu vois les catastrophes » ne vaut que suivi de « les deux bévues à −40,6 et −80,2 sont
déclarées bévues ». Et quand la métrique est **injuste envers le joueur** — le cas de la note qui
décrit une faute déclarée correcte — le dire : c'est l'outil qui a tort.

## Pièges déjà payés

- **Trois sources au lieu de quatre.** Sans `personal_marks`, pas de notes, et le rapport devient un
  commentaire de matrice.
- **Un second seuil de sévérité.** Voir l'étape 6. Le code prévient, en toutes lettres, à l'endroit
  exact où le seuil est défini.
- **Croire le drapeau de provenance.** Voir l'étape 7.
- **Lire l'écran plutôt que les données.** La `Confrontation` est agrégée par construction
  (US-26) : le détail par coup n'y est pas, il se reconstruit depuis les annotations.
- **Se réjouir du taux d'accord.** Il exclut les verdicts « Bon », donc potentiellement la pire
  lecture de la partie.
