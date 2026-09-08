# US-15b — La pression du temps — notes de grilling

**Statut : grilling EN PAUSE** (2026-09-08), à reprendre **au round 2 ci-dessous**. Branche
`integration/US-15b-time-pressure`, depuis `develop` @ `cd9e392` (juste après le merge de la PR
#108).

Rien n'est encore écrit dans `CONTEXT.md` ni dans `docs/adr/`, et c'est **délibéré** : le
vocabulaire est la question **Q15**, encore ouverte. Écrire le glossaire avant de l'avoir tranché
serait écrire deux fois. Ce fichier est le seul état.

> **Périmètre arrêté (Q1)** : on grille **US-15b entière** — récupérer la donnée de temps **et**
> l'exploiter. L'option d'une story amont dédiée à la seule récupération a été proposée puis
> **écartée par le demandeur**. Il n'y a donc pas d'US-40 ; US-15b porte les deux moitiés.

---

## Faits mesurés — ne pas re-mesurer

Tout ce qui suit a été **mesuré** le 2026-09-08, pas déduit. Les commandes sont en fin de fichier.

### En base (`server/chess-analyst.db` — celle de la racine du dépôt est **vide**, 0 octet)

| Platform | parties | avec `[%clk]` | avec `[TimeControl]` | analysées |
|---|---|---|---|---|
| chess.com | 1983 | **1983** | 1983 | 67 |
| lichess | 434 | **0** | 434 | **10** |

Par cadence : chess.com bullet 1817 / blitz 161 / correspondance 4 / rapid 1 ;
lichess rapid 230 / blitz 88 (dont les 10 analysées) / classical 56 / correspondance 52 / bullet 8.

> **Les chiffres du `BACKLOG.md` avaient vieilli.** Il annonçait « 282 parties chess.com sur 282 »
> et « 1 sur 434 côté lichess ». C'est **1983 / 1983** et **0** — pas 1. L'entrée du backlog est
> corrigée dans le même commit que ce fichier.

### Ce que les APIs donnent

- **Lichess**, spec OpenAPI officielle (`apiGamesUser`) : `clocks` existe, **défaut `false`**, et
  rend l'horloge *« soit en commentaires PGN `[%clk]`, soit dans un champ JSON `clocks`, en entiers
  de centisecondes, selon le type de réponse »*. Vérifié en direct : avec `Accept: application/json`
  + `pgnInJson=true` + `clocks=true`, on reçoit **les deux à la fois** — les `[%clk]` dans le champ
  `pgn` **et** le tableau `clocks`.
- Sont aussi derrière des paramètres qu'on n'envoie pas : `clock`
  (`{initial, increment, totalTime}`, structuré) et `division` (`{middle, end}` — les plies de début
  de milieu de jeu et de finale, la matière de l'axe **Phase** d'US-32).
- **chess.com** : `[%clk]` sur **chaque** demi-coup, `[TimeControl]` en en-tête, champ JSON
  `time_control`. Rien à demander. En revanche **aucun tableau d'horloges** — le champ n'existe pas.
- **Les deux plateformes épellent la cadence de quatre façons différentes** — chess.com : `"300"`,
  `"180+2"`, `"1/86400"` ; lichess : `"300+0"`, `"600+5"`, `"1 day per move"`, `"2 days per move"`.

### Le PGN lichess est une version *dégradée* du tableau

Le tableau `clocks` est en centisecondes, le `[%clk]` du PGN **arrondit à la seconde** :

| tableau `clocks` | 18003 | 17971 | 6675 |
|---|---|---|---|
| = secondes | 180,03 | 179,71 | 66,75 |
| `[%clk]` du PGN | 0:03:00 | 0:03:0**0** | 0:01:0**7** |

Une lecture perd jusqu'à 0,5 s ; un **temps passé** (différence de deux lectures) jusqu'à 1 s. Côté
chess.com le PGN donne des **dixièmes** (`0:01:00.8`). Dériver du PGN partout donne donc ±0,2 s sur
chess.com et **±1 s sur lichess** — une asymétrie entre `Platform`s dans un chiffre qui sera comparé
entre `Profile`s. **Coût connu et assumé** par la réponse Q3.

### Le tableau a une entrée de plus qu'il n'y a de coups — sauf sur mat

Sept parties lichess, quatre terminaisons :

| id | cadence | fin | demi-coups | `[%clk]` dans le PGN | `clocks` | écart |
|---|---|---|---|---|---|---|
| 0dREou8n | rapid | **mat** | 34 | 34 | 34 | **0** |
| 022E2AE8 | blitz | nulle | 64 | 64 | 65 | +1 |
| 0NgTJrIv | blitz | départ au temps | 43 | 43 | 44 | +1 |
| 0UasbW1C | blitz | abandon | 64 | 64 | 65 | +1 |
| 0eVz9oed | rapid | abandon | 118 | 118 | 119 | +1 |
| 16lFtUFO | rapid | abandon | 55 | 55 | 56 | +1 |
| 4Dkw8g7t | blitz | abandon | 115 | 115 | 116 | +1 |

**La règle** : l'entrée surnuméraire existe exactement quand la partie s'est terminée **sans que le
camp au trait joue** — abandon, nulle acceptée, départ. Sur un **mat** la partie finit par le coup
lui-même, et il n'y a pas d'entrée en trop. L'alignement est bon **depuis le premier coup** (vérifié
sur `4Dkw8g7t` en recalant les huit premières valeurs contre les `[%clk]`), donc la surnuméraire est
bien **à la fin**, jamais au début.

Et dans les sept cas : **`[%clk]` dans le PGN == nombre de coups**. La valeur surnuméraire n'est
**jamais** dans le PGN. C'est ce fait qui a mis Q3 et Q9 en contradiction (voir plus bas).

> `status=timeout` chez lichess n'est **pas** la chute du drapeau (c'est `outoftime`) : c'est le
> camp qui a quitté la partie. Sur `0NgTJrIv` la surnuméraire vaut 46,53 s — cohérent avec un départ,
> pas avec un drapeau tombé. Ne pas lire « timeout » comme « au temps ».

### `[%clk]` en correspondance n'est pas une horloge

Sur les parties `daily` chess.com : `0:00:00`, puis `0:03:46.9`, puis `0:02:02.9`, puis `0:29:04.9`
— **non monotone**, hors de tout budget de 24 h. Ce n'est pas du temps restant et ce n'est
interprétable comme rien. Confirmation par l'autre bout : sur une partie lichess en correspondance,
l'API ne renvoie **ni `clock` ni `clocks`**, seulement `daysPerTurn: 1`. **La plateforme dit
elle-même « sans objet ».**

### L'import ne met jamais un PGN à jour — il saute la partie

`server/src/import/range.ts` :

```js
function insert(db, profileId, game) {
  if (gameExistsByUrl(db, profileId, game.gameUrl)) return false;   // ← et c'est tout
```

Donc « ré-importer les parties lichess avec `clocks=true` » rapporterait **434 déjà présentes, 0
importée** et ne changerait **rien**. Il n'existe aucun chemin de rafraîchissement, et il faut en
construire un. Supprimer/réinsérer serait deux fautes : les `evaluations` des **10 parties lichess
analysées** pendent au `game_id` (ADR-0015), et `recordMoveHabits` recompterait les `Move habit`s.

### Parsing — deux pièges, aucune dépendance à ajouter

- `cm-chess` expose déjà `move.commentAfter`, et il rend **une chaîne à plusieurs jetons** :
  `"[%eval 0.18] [%clk 0:03:00]"`. Extraire l'horloge est une **extraction de jeton**, pas
  « le commentaire *est* l'horloge ». Vérifié sur un vrai PGN lichess de 115 demi-coups.
- Sur `/game/export/{id}`, **`evals` vaut `true` par défaut** — contrairement à `/api/games/user`.
  Les deux endpoints n'ont pas les mêmes défauts ; ne pas raisonner de l'un vers l'autre.

### Lichess refuse l'export depuis cette IP

`/api/games/user` a répondu **`429 "Please only run 1 request(s) at a time"` dix fois d'affilée**
sur ~3 min. C'est le throttle par IP déjà documenté (mémoire : « Lichess refuse l'IPv6 » est FAUX),
pas une panne. **`/game/export/{id}` répondait `200` pendant le même créneau** — c'est par lui que
toutes les mesures par partie ci-dessus ont été prises. À retenir pour la FP (Q7) : l'endpoint que
l'import utilise est précisément celui qui peut se fermer.

---

## Décisions prises

### Q1 — On grille **US-15b entière**
Récupération **et** exploitation dans la même story. L'option « une story amont pour la seule
récupération, US-15b garde l'axe » a été proposée (motif : la plomberie et le jugement n'ont pas le
même risque ni le même calendrier) et **écartée par le demandeur**.

### Q2 — Quatre candidats, deux en périmètre
En périmètre : **(a)** la cadence exacte (initial + incrément, ou jours par coup) — aujourd'hui
**non stockée**, on ne garde que la catégorie ; **(b)** l'horloge restante à chaque demi-coup.
**(c)** le temps *passé* par coup est **dérivé** de (a)+(b), pas stocké — ADR-0009 dit de stocker le
brut, et la formule dépend de l'incrément donc on voudra la corriger. **(d)** la durée totale de la
partie est **dehors** : aucun consommateur ne la demande, ni US-15b ni US-32.

### Q3 — L'horloge est **dérivée du PGN**, pas stockée traduite
**Décision du demandeur, contre ma recommandation révisée.** J'avais d'abord recommandé la
dérivation, puis basculé vers « stocker le tableau traduit par l'adaptateur (ADR-0018) » en
découvrant que le PGN lichess est arrondi à la seconde. Le demandeur a maintenu la dérivation.

**Ce que cela engage, à porter dans la story plutôt qu'à découvrir plus tard :**
- La perte de précision lichess (±1 s sur un temps passé, contre ±0,2 s sur chess.com) est un
  **coût accepté**, pas un oubli.
- La traduction des **quatre orthographes** de `TimeControl` vit dans un module de dérivation, pas
  dans l'adaptateur — c'est une **tension avec ADR-0018** et elle doit être nommée. Le précédent
  existe : le PGN est déjà stocké brut et non traduit.
- Ce doit être une **fonction dédiée nommée**, appelée depuis chaque point d'entrée, jamais recopiée.
- Mon argument ADR-0016 (« deux endroits pour le même fait ») **ne discriminait pas** les deux
  options et je l'avais présenté comme s'il le faisait : le PGN chess.com est stocké brut avec ses
  `[%clk]` quoi qu'on décide, donc le doublon existe des deux côtés.

### Q4 — Un chemin de **rafraîchissement** qui remplace `games.pgn`
Combiné à Q3, c'est la seule option cohérente : les 115 `[%clk]` n'entrent qu'en remplaçant le PGN
stocké. Donc :
- Le rafraîchissement lit le mouvement du PGN entrant, le **compare** au mouvement stocké, et
  **refuse bruyamment** s'ils diffèrent. Mêmes coups ⇒ mêmes FEN ⇒ les `Evaluation`s des 10 parties
  analysées survivent, et **c'est ce contrôle qui le prouve** au lieu de l'espérer (ADR-0015).
- **Jamais** de suppression/réinsertion (clé étrangère + double comptage des `Move habit`s).
- Écarté : « seules les futures parties lichess ont l'horloge » — c'est exactement le silence à un
  compte sur deux que la correction du 2026-09-02 dénonçait.

> **Zone d'ombre assumée** : le « ok » du demandeur portait sur une recommandation que j'avais
> révisée vers « une table à part », laquelle présuppose Q3=stocké. Avec Q3=dérivée cette lecture
> est **impossible**, donc j'ai résolu vers le remplacement du PGN. **À reconfirmer à la reprise si
> autre chose était visé.**

### Q5 — La correspondance est **exclue** de la donnée d'horloge
56 parties lichess + 4 chess.com. La donnée chess.com est du bruit (mesure ci-dessus) et lichess
n'en renvoie aucune. La **cadence** (a) reste renseignée pour elles — `2 days per move` est un fait
exact ; c'est l'horloge par coup (b) qui n'existe pas, et son absence doit se lire **« sans objet »**,
jamais **« pas encore récupérée »**.

### Q6 — La story se termine **à l'écran**
Minimum visible : la **cadence exacte** dans l'en-tête de la partie, et le **temps passé par coup**
dans le relevé de la page Analyse. Aucun axe, aucun agrégat, aucun verdict à ce stade. Deux motifs :
une story purement en base n'est pas jugeable par un humain à la revue `integration → develop`, et
US-15b a besoin qu'on ait **regardé de vrais chiffres** avant de décider ce qu'ils veulent dire —
la leçon d'US-15a-bis, où l'agrégat bâti sur du non-regardé était faux d'un seuil.

### Q7 — La FP s'appuie sur une **fixture** pour ses assertions
L'affirmation qui doit tenir — « le PGN est remplacé, le mouvement est identique, les 10
`Evaluation`s sont intactes » — se vérifie contre une fixture via `LICHESS_BASE_URL` (déjà
configurable, conçu pour ça) et **doit être verte à chaque passage** : un `429` de Lichess ne doit
jamais pouvoir peindre en rouge une assertion sur notre code. Une étape **en direct, non bloquante**
reste, pour constater que `clocks=true` rapporte bien l'horloge du vrai Lichess. Le côté chess.com
reste en direct sans réserve — son horloge est déjà en base.

### Q9 — On **garde** la 116ᵉ horloge
**Décision du demandeur**, motif donné : « j'en aurai besoin pour les calculs agentiques et
peut-être certaines US ». Ma recommandation était de la jeter en énonçant le contrat de longueur ;
elle est écartée.

**C'est cette réponse qui a révélé la contradiction avec Q3** : la 116ᵉ n'est dans le PGN d'aucune
des sept parties mesurées. Un chemin dérivé du PGN est **structurellement aveugle** à la valeur à
garder. La sortie est **Q10**, ci-dessous, non tranchée.

---

## Frontière ouverte — reprendre ici

`Q10` d'abord : c'est la couche de données, et `Q12`→`Q15` s'écrivent par-dessus.

### Q10 — Comment tenir Q3 (dérivée) **et** Q9 (garder la 116ᵉ) ?
- **(α) hybride** — les horloges par coup dérivées du PGN comme demandé, **plus une** valeur stockée
  à part sur `games` (l'horloge du camp qui n'a pas joué), remplie par le même rafraîchissement.
- **(β) revenir à « stocker le tableau traduit »** — Q9 devient gratuit, Q3 est renversé.
- **(γ)** ne pas la stocker, la redemander à Lichess quand une passe agentique en a besoin.

**Recommandation : (α)**, la seule qui honore les deux réponses telles qu'elles ont été données, et
bon marché (une colonne nullable). **Deux coûts à nommer**, parce qu'ils portent sur l'usage annoncé
en Q9 : la colonne est **nulle pour les 1983 parties chess.com** (la plateforme n'expose rien
d'équivalent) et **nulle sur tout mat** — un calcul agentique qui s'appuie dessus travaille sur les
parties lichess non matées, ~400 lignes et non 2400. **(γ)** est écartée sur mesure : dix `429`
d'affilée aujourd'hui ; une donnée qu'il faut aller redemander à chaque calcul est indisponible un
jour sur deux.

### Q8 — Qu'est-ce qui monte dans le train du re-fetch lichess ?
`division` (`{middle, end}`) arrive sur **toutes** les parties, correspondance incluse, et c'est la
matière de l'axe **Phase** d'US-32 — que la roadmap place **avant US-15c**. `evals`/`accuracy`
n'existent que là où un humain a cliqué « analyser » sur lichess.

**Recommandation : `clocks` et `division`, stockés tous les deux ; ni `evals` ni `accuracy`.** Le
rafraîchissement est le geste **coûteux et risqué** de la story — il touche le PGN de 10 parties
analysées ; le payer deux fois double le risque pour rien, et US-32 devrait le repayer. Le coût est
un **élargissement du périmètre vers US-32**, à écrire dans la story et non à y glisser. `evals`
non : oracle extérieur, présent au hasard des clics d'autrui, déjà utilisé comme référence ponctuelle
dans `.scratch/` par la revue d'US-15a-bis — pas comme donnée stockée.

### Q12 — L'axe parle-t-il du temps *passé* ou de l'horloge *restante* ?
Deux affirmations différentes, toutes deux dérivables : « il a joué ce coup en 0,8 s » et « il lui
restait 12 s ».

**Recommandation : les deux au relevé, l'axe porté par l'horloge restante.** Le temps passé est un
**comportement**, l'horloge restante est la **pression** — et « je m'effondre sous pression » est une
affirmation sur la seconde. Décisif : le temps passé n'est pas comparable d'une cadence à l'autre
(0,8 s est normal en bullet, alarmant en classique) alors qu'une horloge restante rapportée au budget
initial l'est. Sans ça, un futur agrégat mélangerait 1817 parties de bullet et 56 de classique dans
la même moyenne.

### Q13 — Où s'arrête 15b, maintenant qu'on la grille entière ?
La note de grill d'origine disait « parser `[%clk]`, ajouter le temps par `Move` au relevé » — pas
d'agrégat. Bornes possibles : le relevé seul ; le relevé **plus une lecture par partie** (« 12 de
tes 30 coups joués sous 10 s ») ; ou un premier bucket exploitable par 15c.

**Recommandation : le relevé, plus la lecture par partie, et aucun seuil.** L'EPIC réserve
explicitement « taux marginaux ou conditionnels » à 15c, et US-15a s'était interdit d'ajouter un
seuil — ADR-0023 raconte ce que coûte d'en choisir un sur le papier. Ce que 15b doit à 15c est **un
nombre par `Move` et sa règle de dénominateur**, pas un bucket choisi à l'aveugle. La lecture par
partie est ce qui rend la story jugeable par un humain, même choix qu'en Q6.

### Q14 — Un `Move` sans horloge : absence nommée, ou partie hors sujet ?
Le cas existe pour de bon : les 56 + 4 parties en correspondance (Q5), le **premier coup** dont le
temps passé exige le budget initial, et le mat qui n'a pas de 116ᵉ.

**Recommandation : absence nommée — mais surtout, ne pas la faire passer par `UncountedReason`.** Ce
vocabulaire tient à **deux** valeurs par décision (ADR-0023, confirmé par deux amendements) et il
sert le dénominateur du `Counted Move` pour la **sévérité** ; l'absence d'horloge est un autre axe, et
l'y greffer rouvrirait une porte que ces amendements ont fermée. Le relevé affiche « — » avec la
raison en mots, et **aucun temps n'est jamais inventé** — pas de zéro par défaut, qui est le bug
qu'on ne verrait qu'en 15c, noyé dans une moyenne.

### Q15 — Vocabulaire, et une collision à éviter
`CONTEXT.md` doit trois entrées, et l'une frôle un terme existant : la **cadence exacte** (`180+2`)
n'est pas la **`Time control category`** (`blitz`).

**Recommandation : trois termes — `Time control`, `Clock`, `Time spent` — et le piège porté par les
`_Avoid_`.** `Time control` pour la cadence exacte (initial + incrément, ou jours par coup), parce
que c'est le mot du jeu et celui de l'en-tête PGN des deux plateformes ; `Clock` pour le temps
restant après un `Move` ; `Time spent` pour la dérivée. L'entrée `Time control category` gagne un
renvoi explicite (« ne pas confondre avec `Time control` : l'une est la classe, l'autre est le
réglage »), et `Time control` porte `_Avoid_: Cadence, Time class, Time control category`.
Alternative si l'on préfère écarter la collision plutôt que la baliser : `Clock setting` — moins
juste, plus sûr.

### Downstream, pas encore sur la frontière
- **L'interaction avec le coup forcé** : un coup joué en 0,3 s parce qu'il était forcé n'est pas de
  la pression du temps. C'est une question de **prédicat**, et Q13 dit que 15b n'en a pas — donc
  elle attend. (Mémoire : « un coup forcé n'est jamais signalé » sur notre corpus.)
- **La corrélation que l'EPIC a nommée** : « en blitz les coups de finale *sont* les coups à faible
  horloge ». 15b ne doit pas prétendre la résoudre (c'est 15c) mais doit produire une donnée sur
  laquelle 15c puisse conditionner.

---

## Reproduire les mesures

```bash
# En base — attention : le .db de la racine du dépôt est vide, le vrai est sous server/
sqlite3 -header -column server/chess-analyst.db "select p.platform, g.time_control_category,
  count(*) n, sum(case when instr(g.pgn,'%clk')>0 then 1 else 0 end) clk, sum(g.analyzed) analyzed
  from games g join profiles p on p.id=g.profile_id group by 1,2 order by 1,2;"

# Les quatre orthographes de TimeControl
sqlite3 server/chess-analyst.db "select distinct substr(pgn, instr(pgn,'[TimeControl'), 32)
  from games g join profiles p on p.id=g.profile_id where p.platform='lichess';"

# Une partie lichess, horloges comprises — l'endpoint PAR PARTIE, qui répondait quand
# /api/games/user donnait 429. `evals=false` parce qu'ici il vaut true par défaut.
curl -4 -s -H "Accept: application/json" \
  "https://lichess.org/game/export/4Dkw8g7t?clocks=true&pgnInJson=true&evals=false"

# La spec, source de vérité sur les défauts des paramètres
curl -s https://raw.githubusercontent.com/lichess-org/api/master/doc/specs/tags/games/api-games-user-username.yaml
```

Le relevé des sept parties sondées est dans [`clock-probe.md`](./clock-probe.md).
