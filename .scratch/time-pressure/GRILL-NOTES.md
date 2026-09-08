# US-15b — La pression du temps — notes de grilling

**Statut : grilling EN COURS**, round 2 tranché le 2026-09-08 ; reste **Q8-bis** et **Q16** sur la
frontière. Branche `integration/US-15b-time-pressure`, depuis `develop` @ `cd9e392` (juste après le
merge de la PR #108).

**`CONTEXT.md` porte désormais les trois termes** (`Time control`, `Clock`, `Time spent`) tranchés en
Q15, et `Time control category` la clause qui les discrimine. **Rien dans `docs/adr/` encore** : deux
ADR sont dues et leurs contrefactuels sont nommés en fin de fichier, en attente d'accord.

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
## Décisions prises — round 2 (2026-09-08)

### Q10 — **(α) hybride** : dériver les horloges par coup, stocker la surnuméraire à part
Les `Clock`s par `Move` sont dérivés du PGN comme Q3 l'a décidé ; la **dernière lecture, celle qui
n'appartient à aucun `Move`**, est stockée à part sur `games` — une colonne nullable, remplie par le
même rafraîchissement. C'est la seule sortie qui honore Q3 et Q9 ensemble.

**Deux coûts actés, parce qu'ils portent sur l'usage annoncé en Q9** : la colonne est **nulle pour
les 1983 parties chess.com** (la plateforme n'expose rien d'équivalent) et **nulle sur tout mat**
(la partie finit par le coup, il n'y a personne à relever). Un calcul agentique appuyé dessus
travaille donc sur les parties lichess non matées, ~400 lignes et non 2400.

### Q12 — Les deux informations, et l'axe principal porte le **temps passé**
Le relevé montre **combien de temps le joueur a mis** (`Time spent`) *et* **combien il lui restait**
(`Clock`) : le premier est le comportement, le second est ce qui permet d'évaluer la pression.
**L'axe principal montre le temps passé** — décision du demandeur, qui **renverse ma
recommandation** (je proposais que l'axe soit porté par l'horloge restante, au motif de la
comparabilité entre cadences).

**Conséquence non refermée** : le `Time spent` n'est **pas comparable d'une cadence à l'autre**
(0,8 s est normal en bullet, alarmant en classique) et notre corpus est à 75 % du bullet. Mettre cet
axe en principal sans traiter ça produirait une moyenne qui mélange 1817 parties de bullet et 56 de
classique. C'est **Q16**, ouverte ci-dessous.

### Q13 — Le relevé **plus** la lecture par partie, et **aucun seuil**
Ce que 15b doit à 15c est un nombre par `Move` et sa règle de dénominateur, pas un bucket choisi sur
le papier — l'EPIC réserve « taux marginaux ou conditionnels » à 15c, et ADR-0023 raconte ce que
coûte de choisir un seuil sans données.

### Q14 — Absence nommée, **hors** de `UncountedReason`
Un `Move` sans `Clock` affiche « — » et sa raison en mots ; **aucun temps n'est jamais inventé**, en
particulier pas de zéro par défaut. Et cette absence **ne passe pas** par `UncountedReason`, qui
tient à deux valeurs par décision (ADR-0023, deux amendements) et sert le dénominateur du
`Counted Move` pour la **sévérité** : l'horloge est un autre axe.

> Le demandeur a validé en signalant **ne pas avoir compris la question**. Elle a été reformulée à
> la reprise et la décision tient ; si un doute revient, le point à re-vérifier est celui-ci : c'est
> une décision sur **où** l'absence est déclarée, pas sur le fait de la déclarer.

### Q15 — Trois termes, écrits dans `CONTEXT.md`
`Time control` (le réglage exact), `Clock` (le temps restant après un `Move`), `Time spent` (la
dérivée). L'entrée `Time control category` gagne la clause qui les discrimine — « `180+2` est le
réglage, `blitz` la classe » — et chacun porte l'autre dans ses `_Avoid_`. **Écrit** : c'est la
seule partie du glossaire que cette story a produite jusqu'ici.

### Q8 — `evals` et `accuracy` sont **exclus**, `division` reste ouverte
Accord sur l'exclusion, mais **pas pour le motif avancé** — voir la correction de prémisse en
Q8-bis ci-dessous. Le sort de `division` n'est pas tranché.

---

## Frontière ouverte — reprendre ici

### Q8-bis — `division` monte-t-il dans le train, oui ou non ?
**Correction de prémisse, due au demandeur** : « `evals` et `accuracy` n'ont pas de raison d'avoir
bougé » suppose que le rafraîchissement rattrape une donnée qui a changé. **Rien n'a changé** — les
parties lichess sont immuables. Le rafraîchissement existe parce que **nous n'avons jamais demandé
l'horloge** : `clocks` n'a pas « bougé » non plus. Tout paramètre supplémentaire est donc dans la
même position que `clocks` — une donnée qu'on n'a jamais demandée, obtenable dans la **même unique
requête**.

Le vrai motif d'exclure `evals`/`accuracy` est autre, et il tient : ils n'existent **que là où un
humain a cliqué « analyser »** sur lichess, donc leur présence est une loterie ; et c'est un
**oracle extérieur**, que la revue d'US-15a-bis a utilisé comme référence ponctuelle dans
`.scratch/` — pas comme donnée stockée.

`division`, lui, arrive sur **toutes** les parties et c'est la matière de l'axe **Phase** d'US-32,
que la roadmap place **avant US-15c**. La question est donc : le prendre maintenant, ou laisser
US-32 repayer le rafraîchissement ?

➡️ **Le prendre maintenant.** Le rafraîchissement est le geste coûteux **et risqué** de la story —
il remplace le PGN de 10 parties analysées ; le refaire une seconde fois pour US-32 double ce risque
pour rien. Le coût est un **élargissement du périmètre vers US-32**, à écrire dans la story et non à
y glisser. Si le demandeur préfère un périmètre strict (« on ne rafraîchit que le temps »), c'est
tenable — mais alors US-32 hérite explicitement d'un second rafraîchissement, et cela doit être noté
dans son entrée de backlog.

### Q16 — Comment le `Time spent` devient-il comparable, l'axe principal étant sur lui ?
Créée par Q12. Le corpus est à **75 % du bullet** (1817 parties sur 2417), et une seconde ne veut
pas dire la même chose en bullet et en classique. Trois sorties : **(a)** l'axe se lit **toujours à
l'intérieur d'une `Time control category`**, jamais toutes cadences confondues ; **(b)** le
`Time spent` est **normalisé** par le `Time control` (part du budget initial, ou multiple du temps
moyen par coup de la cadence) ; **(c)** on l'assume brut et on documente le biais.

➡️ **(a).** C'est la même règle qui gouverne déjà `Weak opening` (`CONTEXT.md` : porté par
`Opening` × côté × catégorie) et c'est la raison pour laquelle la catégorie existe — elle est là
pour rendre un agrégat comparable. **(b)** invente une unité que le joueur ne reconnaît pas (« tu as
joué à 0,4 budget » ne veut rien dire à l'écran) alors que Q6 exige quelque chose de lisible. **(c)**
est le bug qu'on ne verrait qu'en 15c, noyé dans une moyenne — exactement la faute que Q14 refuse
par ailleurs.

### Downstream, pas encore sur la frontière
- **L'interaction avec le coup forcé** : un coup joué en 0,3 s parce qu'il était forcé n'est pas de
  la pression du temps. C'est une question de **prédicat**, et Q13 dit que 15b n'en a pas — donc
  elle attend. (Mémoire : « un coup forcé n'est jamais signalé » sur notre corpus.)
- **La corrélation que l'EPIC a nommée** : « en blitz les coups de finale *sont* les coups à faible
  horloge ». 15b ne doit pas prétendre la résoudre (c'est 15c) mais doit produire une donnée sur
  laquelle 15c puisse conditionner.

---

## Deux ADR dues — contrefactuels nommés, en attente d'accord

Rien n'est écrit dans `docs/adr/`. Les deux décisions ci-dessous en méritent une parce qu'on peut
nommer, pour chacune, ce qu'un agent compétent ferait **sans** le texte — et que ni le compilateur,
ni les tests, ni une lecture du code ne l'arrêteraient.

### ADR A — L'horloge est **dérivée du PGN**, jamais stockée traduite
**Sans ce texte** : un agent ajoute une colonne `clocks` remplie par l'adaptateur. C'est ce
qu'ADR-0018 recommande mot pour mot (« l'adaptateur traduit, personne au-dessus ne voit le
payload »), c'est ce que la précision du tableau JSON récompense, et c'est ce que j'ai moi-même
recommandé avant que la décision tranche l'inverse. Rien dans le dépôt ne l'arrête.

Le texte doit porter la **tension avec ADR-0018** (la traduction des quatre orthographes de
`TimeControl` vit dans un module de dérivation, pas dans l'adaptateur), la **perte de précision
acceptée** (±1 s sur lichess contre ±0,2 s sur chess.com — sans quoi le prochain qui la découvre la
traitera comme un bug), et l'**exception de Q10** : la dernière lecture, qui n'appartient à aucun
`Move`, est la seule valeur d'horloge stockée.

### ADR B — Le rafraîchissement **remplace** le PGN et **refuse** si le mouvement diffère
**Sans ce texte** : un agent supprime puis réinsère la partie — le chemin le plus court, et celui
que la forme actuelle d'`insert()` suggère — ce qui casse la clé étrangère des `evaluations` et
recompte les `Move habit`s ; ou il fait un `UPDATE` du PGN sans comparer le mouvement, ce qui
invaliderait en silence les FEN des `Evaluation`s des **10 parties lichess analysées**. ADR-0015 ne
l'attrape pas : il parle des changements de **schéma**, et ceci est un changement de **donnée**.

Le texte doit dire que l'assertion « même mouvement » **est** la protection — et que c'est pour ça
qu'elle échoue bruyamment plutôt que de sauter la partie.

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
