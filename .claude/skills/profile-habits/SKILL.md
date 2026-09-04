---
name: profile-habits
description: Dresse le dossier de jeu d'un Profile sur une plage de mois — ses habitudes de répertoire, ses points forts et ses points faibles — à partir de ses résultats, de ses statistiques d'ouverture et de l'explorateur d'habitudes de coups. Produit la démarche dans le terminal et un rapport publié en Artifact. Utiliser quand on demande d'analyser la façon de jouer d'un joueur, de profiler un adversaire, ou de dire à quelqu'un ce qu'il devrait travailler.
---

# /profile-habits — le dossier de jeu d'un profil

Le produit répond à « quel est mon bilan », « quelle ouverture me fait perdre », « qu'ai-je joué
dans cette position ». Ce skill fait le travail que l'app ne fait pas : **croiser les trois** et en
tirer une façon de jouer. Il répond à « comment ce joueur joue-t-il, et qu'est-ce qui le bloque ».

Il est **hors application** et le reste : il lit, il croise, il conclut. La seule écriture qu'il
s'autorise est un **Import** — parce que sans parties dans la plage demandée il n'y a rien à lire —
et un Import ne détruit rien (ADR-0015).

> **Ce n'est pas `/assess-reading`.** Celui-là juge **une lecture** du joueur sur **une partie**,
> contre le moteur, et exige une lecture scellée. Celui-ci juge **une façon de jouer** sur **des
> centaines de parties**, sans moteur. `/assess-reading` dit comment il analyse ; `/profile-habits`
> dit comment il joue. Aucun ne remplace l'autre, et les deux se citent bien l'un l'autre.

## Arguments

`/profile-habits <profil> [<plage>]` — par exemple `Nonomoho 2026`, `Metalyst 2025-06..2025-12`,
`profil 2 de janvier à mars`.

Le profil se donne par nom ou par id. **La plage est une plage de mois**, jamais de jours : c'est la
granularité de l'Import comme de chess.com. À défaut de plage, prendre l'année en cours et le dire.

## Ce qu'il produit

1. **Dans le terminal** : la démarche, source par source, pour que le demandeur puisse contester
   chaque chiffre — puis les habitudes, les points forts, les points faibles, les priorités.
2. **Un rapport publié en Artifact** : le bandeau de chiffres, le graphique des ouvertures, la
   trajectoire de classement, les tableaux, et les réserves **en haut**. Charger `artifact-design`
   avant de l'écrire, et `dataviz` avant la moindre ligne de graphique.

## Prérequis

- **L'app tourne** : `npm run dev` à la racine (serveur `:3001`, client `:5173`).
- **Node 22.** Le module natif `better-sqlite3` est compilé pour `NODE_MODULE_VERSION 127` ; un Node
  plus récent échoue en `ERR_DLOPEN_FAILED` au démarrage du serveur **et** dans tout script qui
  ouvre la base par ce module. Lancer l'app sous `nvm use 22.15.0`, et lire la base en **CLI
  `sqlite3`**, qui ne dépend d'aucun binding Node.
- Le profil existe. **Ce skill ne crée pas de profil** : sans profil, l'Import est refusé par
  construction (ADR-0014) et c'est un geste que le demandeur doit faire lui-même.

## Étape 1 — situer le profil et mesurer le terrain

```bash
sqlite3 -line server/chess-analyst.db \
  "select id, username, platform from profiles where username like '%<NOM>%';"

sqlite3 -column -header server/chess-analyst.db \
  "select time_control_category, count(*) n, min(date) du, max(date) au
     from games where profile_id=<P> group by 1 order by n desc;" \
  "select analyzed, count(*) from games where profile_id=<P> group by 1;"
```

**Ces deux requêtes décident les réserves du rapport, alors les lire avant d'aller plus loin.**

- **Le mélange de cadences.** Un profil à 99 % de bullet ne donne pas « les habitudes d'échecs » de
  quelqu'un, il donne ses habitudes de bullet. C'est une réserve **majeure**, pas une note de bas de
  page : elle change ce que le rapport a le droit de conclure.
- **Le nombre de parties analysées.** Tant qu'il est proche de zéro, **aucune conclusion sur la
  qualité des coups n'est possible** — pas de « il rate les tactiques ». Le rapport parle d'écarts
  de résultat sur des positions répétées, ce qui est autre chose, et suffit à désigner où
  travailler. Le dire explicitement.

## Étape 2 — couvrir la plage demandée

Compter ce qui est déjà là avant d'importer :

```bash
sqlite3 server/chess-analyst.db \
  "select substr(date,1,7) mois, count(*) from games
    where profile_id=<P> and date between '<AAAA-MM-01>' and '<AAAA-MM-31>'
    group by 1 order by 1;"
```

S'il manque des mois, lancer l'Import — **avec `categories`** :

```bash
curl -s -X POST http://localhost:3001/api/import \
  -H 'content-type: application/json' \
  -d '{"profileId":<P>,"from":{"year":2026,"month":1},"to":{"year":2026,"month":12},
       "categories":["bullet","blitz","rapid","classical","correspondence"]}'

# puis, en boucle jusqu'à "running":false — un mois prend quelques secondes
curl -s http://localhost:3001/api/import/status | python3 -m json.tool
```

> **`categories` n'a pas de valeur par défaut, et son absence ne provoque pas d'erreur.** L'API
> répond 202, récupère les parties, puis en importe **zéro** avec le message « Aucune partie trouvée
> … dans les cadences sélectionnées » : le filtre est construit sur `new Set(undefined)`, donc vide,
> donc rien ne passe. Un `totalFetched` élevé avec `imported: 0` est **toujours** ce bug, jamais un
> compte réel. Passer les cinq cadences quand la demande dit « toutes les parties ».

Une plage qui dépasse le mois courant est écrêtée silencieusement, ce qui est normal : l'annoncer
dans le rapport (« janvier – septembre » et non « 2026 »). Et `alreadyPresent` n'est pas une erreur,
c'est la re-exécution qui fonctionne.

## Étape 3 — rassembler les quatre sources

Quatre, et il faut les quatre : les trois premières sont dans l'app, la quatrième n'y est pas.

| Source | Où | Ce qu'elle seule apporte |
| --- | --- | --- |
| Les résultats | `GET /api/stats?profileId=<P>` | le bilan total, **par cadence et par couleur** |
| Les ouvertures | `GET /api/openings?profileId=<P>` | une ligne par (ouverture, camp, cadence), triée par volume |
| L'explorateur | `GET /api/move-habits?profileId=<P>&side=&fen=` | **le coup joué dans une position précise**, avec son score |
| Les en-têtes PGN | `games.pgn` | fins de partie, **pendules**, classements, longueur — rien de tout cela n'est exposé par l'app |

```bash
curl -s "http://localhost:3001/api/stats?profileId=<P>"    | python3 -m json.tool
curl -s "http://localhost:3001/api/openings?profileId=<P>" | python3 -m json.tool
```

> **Attention à la portée.** `/api/stats` et `/api/openings` répondent sur **tout** le profil, pas
> sur la plage. Quand la plage est un sous-ensemble strict des parties en base, ces deux routes ne
> répondent pas à la question posée : recalculer les mêmes agrégats en SQL avec le filtre de dates,
> et dire dans le rapport que c'est ce qui a été fait. Quand la plage couvre tout le profil — le cas
> courant — les routes suffisent, et c'est mieux : ce sont les chiffres que le demandeur voit à
> l'écran.

Extraire les PGN une fois pour toutes, et travailler dessus en Python :

```bash
sqlite3 -json server/chess-analyst.db \
  "select id,player_color,result,date,time_control_category,eco,opening_name,pgn
     from games where profile_id=<P> and date between '<DEBUT>' and '<FIN>'" > "$SCRATCH/games.json"
```

Les en-têtes utiles : `Termination` (le mode de fin, en clair), `TimeControl`, `WhiteElo` /
`BlackElo`, et les `{[%clk h:mm:ss]}` de chaque demi-coup dans le corps.

## Étape 4 — descendre dans l'explorateur

L'explorateur est la seule source qui parle de **positions** et non de noms d'ouverture, et c'est
elle qui trouve les trous précis. Deux façons de l'interroger.

**a. Par la table, pour balayer.** Une requête donne les pires habitudes fréquentes du joueur, tous
répertoires confondus — c'est la requête la plus rentable de tout le skill :

```bash
sqlite3 -column -header server/chess-analyst.db "
select side, san, count, round((win+0.5*draw)*100.0/count,1) pct, fen
  from move_habits
 where profile_id=<P> and count >= 40
   and ((side='white' and substr(fen, instr(fen,' ')+1, 1)='w')
     or (side='black' and substr(fen, instr(fen,' ')+1, 1)='b'))
 order by pct asc limit 20;"
```

La clause sur le camp au trait est **indispensable** : sans elle, la table renvoie aussi les
`Opponent reply`, et on attribue au joueur les coups de l'adversaire.

**b. Par l'API, pour suivre une ligne.** La clé est un **FEN à 4 champs** obtenu en **rejouant les
coups depuis la position initiale** avec `cm-chess` — pas en chargeant un FEN intermédiaire, sinon
la clé ne correspond pas à celle que la précomputation a écrite. Script à déposer **dans
`server/`** (la résolution de `cm-chess` part du dossier du script), à lancer sous Node 22, et à
supprimer après :

```js
// server/.explore.tmp.mjs — supprimer après usage
import { Chess } from "cm-chess";
const P = Number(process.argv[2]);
const pos = (sans) => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen().split(" ").slice(0, 4).join(" "); };
const cand = async (sans, side) => {
  const r = await fetch(`http://localhost:3001/api/move-habits?profileId=${P}&side=${side}&fen=${encodeURIComponent(pos(sans))}`);
  return (await r.json()).candidates ?? [];
};
async function walk(side, sans, depth, min) {
  if (!depth) return;
  const top = (await cand(sans, side)).filter((c) => c.count >= min).slice(0, 3);
  for (const [i, c] of top.entries()) {
    const mover = sans.length % 2 === 0 ? "white" : "black";
    const n = Math.floor(sans.length / 2) + 1;
    console.log("  ".repeat(sans.length) +
      `${mover === "white" ? n + "." : n + "..."}${c.san} [${mover === side ? "joueur" : "adv"}] ` +
      `${c.count} p, ${(c.winRate * 100).toFixed(1)}%`);
    if (i === 0) await walk(side, [...sans, c.san], depth - 1, min);
  }
}
for (const side of ["white", "black"]) {
  console.log(`\n===== ${side} =====`);
  await walk(side, [], 12, 40);
}
```

**c. Par les PGN, pour interroger « son N-ième coup ».** La table est indexée par position, donc
elle **fusionne les transpositions** — ce qui est ce qu'on veut pour balayer, et ce qu'on ne veut
pas pour dire « au quatrième coup il joue X dans n parties ». Pour cette question-là, construire
l'arbre en **préfixes de coups** depuis les PGN (`g['_mine'][3]`, etc.) : chaque partie compte une
fois et une seule, et les effectifs s'additionnent. Les deux lectures sont justes ; elles ne
répondent pas à la même question.

> **Un compte enfant peut dépasser son parent.** Les habitudes sont indexées par **position**, donc
> les transpositions fusionnent : `4…Nd7` peut afficher 81 parties sous un `4.Nc3` qui n'en compte
> que 59, parce que la même position est atteinte par d'autres ordres de coups. Ce n'est pas une
> incohérence, et surtout ce n'est pas une raison de sommer les branches.

## Étape 5 — les lectures qui produisent quelque chose

Un bilan à 50 % ne dit rien. Huit croisements qui, eux, disent quelque chose — et qui ont tous
donné un résultat exploitable sur le dossier Nonomoho.

**a. L'asymétrie de couleur.** `bySide` dans `/api/stats`. Un écart de plus de trois points sur
plusieurs centaines de parties de chaque côté est un fait, pas du bruit — et mieux marcher avec les
noirs est suffisamment anormal pour ouvrir le rapport.

**b. L'étroitesse du répertoire.** Compter les **séquences des N premiers coups du joueur** et
regarder combien de parties tombent dans la plus fréquente. C'est ce qui distingue un répertoire
d'un réflexe :

```python
mine = moves[0::2] if g["player_color"] == "white" else moves[1::2]
seq[(g["player_color"], tuple(mine[:6]))] += 1   # puis trier par volume
```

Quand une seule séquence de quatre coups couvre 80 % des parties d'un camp, **c'est le titre du
rapport**, pas une ligne de tableau.

**c. Le système contre le premier coup adverse.** Le même système ne vaut pas la même chose contre
`1.e4` et contre `1.d4`. Croiser le score du joueur avec le premier coup de l'adversaire trouve les
écarts les plus gros du dossier (12,5 points chez Nonomoho) — et ils sont **actionnables**, parce
que le joueur n'a pas à changer de style, juste à cesser de jouer en pilote automatique.

**d. Les pires habitudes fréquentes.** La requête de l'étape 4a. Recouper chaque ligne trouvée avec
`/api/openings` : quand une position et un nom d'ouverture disent la même chose, c'est solide.

**e. Le roque.** Fréquence, côté, et **score avec contre sans**. Dix points d'écart en faveur du
roque est un conseil concret, immédiatement applicable, et le joueur peut le vérifier lui-même.

**f. Les modes de fin de partie.** Normaliser `Termination` en motifs (`won on time`,
`by checkmate`, `by resignation`, `game abandoned`, nuls) — **ne pas grouper la chaîne brute**, elle
contient le pseudo du gagnant et produit trois cents lignes à un exemplaire. La comparaison
gains-au-temps / défaites-au-temps dit si le joueur gagne à la pendule ou la subit.

**g. Le temps restant en fin de partie.** Dernier `{[%clk]}` du camp du joueur, médiane par
résultat. Un écart franc (7,8 s dans les victoires contre 1,2 s dans les défaites) dit que le joueur
**perd d'abord la pendule et la partie ensuite** — et aucune donnée d'ouverture ne peut le dire.

**h. La trajectoire de classement.** Elo moyen par mois. Un solde nul sur mille parties est un
résultat en soi : le volume entretient le niveau, il ne le déplace pas.

**i. La trajectoire des chances aux demi-coups fixes** — la lecture qui répond à « *où* se
trompe-t-il », et la seule. Quand les parties sont analysées, relever `whiteWinChances` (côté
joueur : `100 −` s'il a les noirs) aux **mêmes plies** (10, 20, 30, 40) et comparer **deux
sous-ensembles du même joueur** : le répertoire suspect contre un témoin. Sur DudulSmash, ses
parties `1.b3` donnaient 54,0 → 45,7 → 38,9 → 29,5 quand ses parties noires donnaient
46,6 → 44,7 → **53,3** → 43,5. Conclusion que rien d'autre ne pouvait produire : l'ouverture ne le
met pas en retard, elle le met dans une position qu'il ne sait pas jouer — et sa courbe ne remonte
jamais là où l'autre se redresse. **Sans le témoin, la courbe descendante ne prouve rien** : toutes
les courbes de parties perdues descendent.

**j. Le point de bifurcation, pas la moyenne de la ligne.** « Cette ouverture rend 44 % » ne se
travaille pas. Descendre l'arbre coup par coup et chercher un **écart de 15 points ou plus entre
deux choix également fréquents** : sur DudulSmash, `4.Bb5` (19 parties, 57,9 %) contre `4.Nf3`
(17 parties, 35,3 %). C'est actionnable pour deux raisons — le joueur a **déjà** la bonne réponse
dans ses propres parties, et il n'y a rien à apprendre, juste un choix à faire. Vérifier que le
partage n'est pas un effet de calendrier (les deux bras doivent couvrir les mêmes mois).

**k. Les six demi-coups autour de chaque bévue.** Le motif ne se lit pas dans les agrégats. Pour
chaque coup flagué le plus cher, imprimer les trois coups avant et après en SAN : trois bévues de
DudulSmash ont ainsi révélé **le même mécanisme** — la diagonale de son fou b2, ouverte contre
lui-même (`8.cxd5?? Bxb2 9.dxe6 Bxa1`), puis l'autre diagonale (`6.h3 Bh5 7.Ne5?? Bxd1`), puis le
roi resté au centre (`19.Kd1 … 22.Rxe1#`). Un motif nommé par des coups concrets vaut dix
catégories.

## Étape 6 — les réserves, qui ne sont pas facultatives

**L'écart de classement est un piège, et il est mortel.** Les `WhiteElo` / `BlackElo` des en-têtes
PGN de chess.com sont **postérieurs à la partie** : le gagnant y est mécaniquement mieux classé. Un
croisement « score par écart de classement » donne alors ~99 % contre les adversaires « plus
faibles » et ~0 % contre les « plus forts ». C'est circulaire, ça ressemble à un résultat
spectaculaire, et **il faut le jeter**. Ne le publier sous aucune forme ; le mentionner comme
réserve de méthode.

> **Un usage reste légitime, et il est précieux : la moyenne par groupe, comme contrôle.** Comparer
> l'Elo moyen du joueur *et* celui de ses adversaires entre deux sous-ensembles répond à « l'écart
> que je viens de trouver ne serait-il qu'un écart de niveau d'opposition ». Sur DudulSmash, les
> parties `1.d4` (76,9 %) ont été jouées à 1 041 contre des adversaires à 1 016, les parties `1.b3`
> (44,3 %) à 1 021 contre 1 005 : l'opposition était **plus forte** du côté qui marche, ce qui
> renforce le constat au lieu de l'expliquer. Le contrôle n'est valide qu'**agrégé sur des dizaines
> de parties** et il faut redire qu'il porte sur des Elo post-partie.

**Le taux de coups flagués n'est PAS une mesure de dégâts, et le confondre produit un rapport
faux.** Sur DudulSmash, le taux par phase (21,1 % en ouverture, 16,3 % en milieu, 10,5 % en finale)
a été lu comme « il part mal et redresse, il tient les fins de partie » — publié, puis démenti. Les
**chances perdues par coup joué** sont plates : 3,85 / 4,19 / 3,72. Aucune phase n'était son point
fort. Ce que le taux mesure, c'est la **fréquence des petits écarts**, et elle est mécaniquement
plus haute en ouverture (beaucoup de coups, peu d'enjeu) et plus basse en finale (les coups
`decided` sont exclus, il reste peu de matière). **Toujours sortir les deux colonnes côte à côte**,
et conclure sur la seconde. Vérifier aussi le **coût moyen d'un coup flagué par tranche de coups**,
qui lui monte : 13,0 sur les coups 1-10, 20,3 sur 11-20, 21,3 au-delà.

**Le barème à 5 flague des premiers coups parfaitement jouables.** Depuis US-37, `INACCURACY_DROP`
vaut 5 : un premier coup d'ouverture rare franchit le seuil sans être une faute. `1.b3` est flagué
imprécision dans **5 des 6 parties** analysées de DudulSmash, à −5,3 à −6,2 — soit l'écart normal
avec `1.e4` à profondeur 16. **Retirer ces coups du décompte avant de raisonner** (36 flagués
devenaient 31) et le dire dans le rapport, sinon le premier coup du joueur apparaît comme sa faute
la plus répétée.

**Un plancher d'échantillon, annoncé.** Une ligne à 28 % sur 12 parties n'est pas un point faible.
Fixer un seuil (35–40 parties a bien marché), le dire dans le rapport, et ne pas le franchir pour
rendre une conclusion plus jolie.

**La cadence et l'absence de moteur** — étape 1. Elles bornent ce que le rapport peut affirmer.

**Le score est relatif au joueur** partout : `(gains + 0,5 × nuls) / parties`. Ne jamais mélanger
avec un taux de victoires brut dans le même tableau.

## Étape 6 bis — creuser un écart, et tuer les hypothèses

Quand un écart franc est trouvé (un répertoire, une ligne, un choix), le demandeur voudra savoir
*pourquoi*. La méthode qui a marché : formuler quatre ou cinq hypothèses **falsifiables**, les
tester toutes, et **publier celles qui meurent**.

Sur le `1.b3` de DudulSmash, quatre hypothèses sur cinq sont mortes :

| Hypothèse | Test | Verdict |
| --- | --- | --- |
| C'est une réponse noire précise qui le réfute | score par réponse au 1er coup | **morte** — `1…e5` 42,3 %, `1…d5` 44,4 %, le schéma rend 44 % quoi qu'il arrive |
| Il joue trop de coups d'aile plutôt que le centre | classer les 10 premiers coups | **morte** — aile > centre 50,0 %, centre > aile 51,6 %, aucun signal |
| Il roque trop tard | score avec / sans roque | **morte** — 43,9 % en roquant contre 45,0 % sans |
| L'opposition était plus faible en `1.d4` | Elo moyen par groupe | **morte** — l'opposition était plus forte |
| Le partage est au 4<sup>e</sup> coup | score par 4<sup>e</sup> coup | **tenue** — 57,9 % contre 35,3 % |

**Les morts ne sont pas des déchets, ce sont le rapport.** Elles rendent la survivante crédible,
elles empêchent le demandeur de refaire le test, et elles disent ce qu'il ne sert à rien de
travailler. Les écrire dans le terminal **et** dans le rapport, avec leur chiffre.

Attention à la tentation inverse : une hypothèse qui « marche » sur 4 parties contre 2 n'est pas
tenue. Sur le même dossier, « `4.Nf3` invite `…Bg4` » allait dans le bon sens (24 % contre 11 %)
mais reposait sur six parties — publié **comme piste**, pas comme explication, tandis que les
22 points d'écart entre les deux bras, eux, portent sur 19 et 17 parties.

## Étape 6 ter — chiffrer le coût moteur avant de proposer une passe

Le manque d'analyses est la limite la plus fréquente de ce skill, et « fais analyser plus de
parties » n'est une recommandation utile que **chiffrée**. Le débit se mesure sur les passes déjà
faites — et il ne se devine pas :

```bash
sqlite3 -column -header server/chess-analyst.db "
select id, total, depth, lines,
       round((julianday(ended_at)-julianday(started_at))*86400,1) sec,
       round(((julianday(ended_at)-julianday(started_at))*86400)/total,2) sec_par_ply
  from analysis_passes where ended_at is not null and depth > 0 order by id;"
```

- **`total` est un nombre de demi-coups**, pas de parties : une passe coûte proportionnellement à la
  **longueur** des parties, et le blitz est long (72 demi-coups en médiane chez DudulSmash contre 61
  en bullet chez Nonomoho). Estimer sur les plies, jamais sur le nombre de parties.
- Le débit observé à **profondeur 16 / 2 lignes** sur cette machine : **1,24 s par demi-coup** en
  moyenne pondérée, dans une fourchette de 0,70 à 1,52 selon la passe. Ignorer les passes de moins
  de 100 demi-coups pour calibrer (une petite passe concurrencée a mesuré 4,35 s/ply) et **exclure
  les passes `depth = 0`**, qui sont les analyses héritées d'avant le régime.
- Annoncer une **fourchette**, jamais un chiffre unique, et proposer un **découpage en paliers**
  (25 / 50 / 75 / 100 % d'un corpus ordonné par priorité) plutôt qu'une passe unique de trois
  heures : le demandeur décide où il s'arrête, et les premiers paliers répondent souvent déjà.
- **Ordonner le corpus, et mettre un témoin dedans.** Analyser 60 parties du répertoire suspect sans
  analyser une seule partie de comparaison ne permet pas la lecture **i** de l'étape 5.

## Étape 7 — rendre

**Dans le terminal** : les limites d'abord, la démarche ensuite, le verdict en dernier. Le demandeur
doit pouvoir attaquer n'importe quel chiffre, et savoir lesquels ont été écartés.

**Dans le rapport** : charger `artifact-design`, puis `dataviz` avant tout graphique. Ce qui a
fonctionné sur le dossier Nonomoho :

- **les réserves en haut, pas en pied de page.** Le rapport est souvent lu par le joueur lui-même :
  il doit voir « 99 % de bullet, aucune analyse moteur » **avant** de voir « 43 % contre `1.d4` »,
  sinon un écart de résultat se lit comme un verdict sur son jeu en général ;
- **un bandeau de chiffres** : parties, bilan, score, la statistique la plus caractéristique du
  profil, la trajectoire de classement ;
- **le graphique des ouvertures en écart à la parité** — barres partant d'une ligne à 50 %, au-dessus
  d'un côté, en dessous de l'autre. C'est la forme honnête : elle montre le signe et l'amplitude,
  là où un classement par score cache le volume ;
- **un échiquier**, quand une structure revient : c'est le seul objet du rapport que seul ce sujet
  peut avoir, et il fait comprendre en une image ce que trois paragraphes expliquent mal ;
- **points forts / points faibles en deux colonnes**, chaque point **adossé à un chiffre et à un
  coup nommé** en notation algébrique ;
- **des priorités numérotées** — la numérotation n'est légitime que là, parce que c'est un vrai
  classement par gain attendu.

**Quand un chiffre publié se révèle faux, corriger la page, pas seulement le terminal.** Republier
le **même chemin de fichier** garde l'URL, ce qui compte quand le lien a déjà été transmis ; poser
un `label` sur la version (« Fond sur le `1.b3` ») et **dire dans le terminal ce qui a changé et
pourquoi**. Une affirmation retirée d'un rapport doit être remplacée par ce que les données
soutiennent, pas simplement effacée.

Publier en Artifact et **dire que la page est privée** : la partager est un geste du demandeur, pas
de l'agent — surtout quand le rapport juge quelqu'un d'autre.

## Ton

Le dossier sert à travailler, pas à flatter. Un point faible se nomme, se chiffre et se localise
(« `4.a3`, 178 parties, 42,4 % »). Un point fort aussi. Et quand le chiffre est trompeur — un
échantillon trop mince, une ligne qui doit son score à un seul adversaire — le dire à l'endroit où
il est écrit, pas dans une note.

Quand le rapport juge un tiers, rester factuel : décrire ce que les parties montrent, jamais le
joueur. « Le réflexe est calibré contre le pion e4 » se lit ; « il joue mal » ne s'écrit pas.

## Pièges déjà payés

- **`categories` omis dans l'Import** → 1 807 parties récupérées, 0 importée, et un message qui
  ressemble à un compte réel. Étape 2.
- **Node par défaut trop récent** → `ERR_DLOPEN_FAILED` sur `better-sqlite3`, au démarrage du
  serveur comme dans un script. Node 22 pour l'app, CLI `sqlite3` pour lire.
- **L'écart de classement calculé sur des Elo post-partie** → un résultat circulaire à 99 % / 0 %.
  Étape 6.
- **`Termination` groupé brut** → une ligne par pseudo d'adversaire, trois cents lignes illisibles
  au lieu de six motifs. Étape 5f.
- **`move_habits` lu sans filtrer le camp au trait** → les réponses de l'adversaire comptées comme
  des habitudes du joueur. Étape 4a.
- **`/api/stats` et `/api/openings` pris pour des chiffres de la plage** → ils portent sur tout le
  profil. Étape 3.
- **Sommer les branches de l'explorateur** → les transpositions sont comptées plusieurs fois.
  Étape 4b.
- **Le taux de coups flagués pris pour une mesure de dégâts** → « il tient les fins de partie »
  publié puis démenti ; les chances perdues par coup sont plates. Étape 6.
- **Le premier coup du joueur compté comme sa faute la plus répétée** → c'est le barème à 5. Étape 6.
- **Une courbe de chances descendante lue sans témoin** → toutes les courbes de parties perdues
  descendent. Étape 5i.
- **Un « pourquoi » retenu sans avoir tué les autres hypothèses** → quatre sur cinq sont mortes sur
  le dossier DudulSmash, et c'est ce qui rend la cinquième crédible. Étape 6 bis.
- **Une passe moteur estimée en parties et non en demi-coups** → l'erreur va du simple au double
  entre bullet et blitz. Étape 6 ter.
- **Le script de descente lancé hors du dépôt** → `ERR_MODULE_NOT_FOUND` sur `cm-chess`. Le déposer
  dans `server/`.
