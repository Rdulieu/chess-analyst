# SPEC — US-15b : la pression du temps

Status: ready-for-agent
Business ref: US-15b (`BACKLOG.md`, sous l'EPIC US-15)
Integration branch: `integration/US-15b-time-pressure`
Grill: complet, 2026-09-08 — 24 décisions, frontière vide. `.scratch/time-pressure/GRILL-NOTES.md`
tient l'état et les faits mesurés ; `clock-probe.md` tient le relevé de sonde.
ADR : **0029** (l'horloge est dérivée du PGN), **0030** (le rafraîchissement remplace le PGN et
refuse un mouvement différent), **0031** (la division lichess est un oracle, jamais la `Phase`).

## Problem Statement

Le `Player` veut savoir si ses fautes viennent de la pression du temps. C'est l'axe que l'EPIC US-15
désigne comme le plus susceptible d'**expliquer** ce qu'on impute aujourd'hui à la phase de jeu — en
blitz, les coups de finale *sont* les coups à faible horloge. L'application ne peut rien en dire, et
pour deux raisons distinctes.

**La donnée n'est pas là où il joue.** Le `Player` joue en **blitz et en rapide**. Mesuré en base le
2026-09-08 :

| cadence | parties | portent l'horloge | analysées |
|---|---|---|---|
| bullet | 1825 | **1817** (99,6 %) | 5 |
| **blitz** | 249 | **161** (65 %) | 71 |
| **rapid** | 231 | **1** (0,4 %) | 0 |
| correspondance | 56 | 4 | 1 |
| classical | 56 | 0 | 0 |

La seule cadence couverte est celle dont il ne se sert pas. `rapid` est vide à une partie près,
parce que **230 de ses 231 parties viennent de lichess** et que l'export lichess ne rend l'horloge
que si on la demande — `clocks=true` n'a jamais été envoyé. Ce n'est donc pas « compléter un
corpus » : le rafraîchissement **fait exister l'axe rapid**.

**Et même là où la donnée est en base, l'app est muette.** Les 1983 PGN chess.com portent un
`[%clk]` à chaque demi-coup depuis le premier import, et rien ne le lit. La page Analyse ne dit ni
combien de temps un coup a pris, ni combien il restait au joueur, ni même **sous quelle cadence
exacte** la partie a été jouée — seulement sa catégorie, `blitz`, qui range dans le même seau un
3+2 et un 5+0.

## Solution

Du point de vue du `Player`, sur une partie :

- l'en-tête nomme le **`Time control` exact** — `3+2`, `5+0`, `2 jours par coup` — à côté de la
  catégorie ;
- le relevé par coup gagne, pour **chacun de ses coups**, **combien de temps il a mis**
  (`Time spent`) et **combien il lui restait** (`Clock`) ;
- le panneau du récapitulatif gagne une **lecture du temps sur la partie** — combien de ses coups
  ont été joués sous une horloge basse, combien de temps il a passé en tout, où sont ses coups les
  plus longs ;
- ce qui n'a pas d'horloge le **dit** : une partie en correspondance affiche « sans objet », jamais
  un blanc ni un zéro.

Et une fois, hors de l'app : un **CLI de réparation** rapatrie l'horloge et la division des **434**
parties lichess déjà importées, en refusant de toucher une partie dont le mouvement aurait changé.

**Aucun axe classé, aucun agrégat, aucun verdict.** La story met la donnée sous les yeux et s'arrête
là : « sur quoi travailler » est US-15d, et « taux marginaux ou conditionnels » est US-15c.

## User Stories

1. En tant que `Player`, je veux voir la **cadence exacte** d'une partie, pour distinguer un 3+2
   d'un 5+0 que la catégorie `blitz` confond.
2. En tant que `Player`, je veux voir **combien de temps j'ai mis** sur chacun de mes coups, pour
   repérer où j'ai foncé et où j'ai réfléchi.
3. En tant que `Player`, je veux voir **combien de temps il me restait** à chaque coup, pour juger
   sous quelle pression je jouais — ce qui n'est pas la même question que la précédente.
4. En tant que `Player`, je veux ces deux chiffres **dans le relevé que je lis déjà**, pour ne pas
   avoir à croiser deux écrans pour une seule partie.
5. En tant que `Player`, je veux que l'axe mis en avant soit le **temps passé**, parce que c'est ce
   que j'ai fait, et que l'horloge restante est le contexte dans lequel je l'ai fait.
6. En tant que `Player`, je veux une **lecture du temps sur la partie entière** dans le
   récapitulatif, pour avoir un verdict lisible sans compter trente lignes moi-même.
7. En tant que `Player`, je veux que cette lecture soit **le même calcul** que la colonne par coup,
   pour pouvoir la vérifier à l'œil et ne pas avoir à la croire.
8. En tant que `Player`, je veux que le temps de mon **premier coup** soit calculé, pour que la
   ligne 1 ne soit pas un trou.
9. En tant que `Player`, je veux que les coups de **mon adversaire** portent aussi leur temps, pour
   voir qui a subi la pression et qui l'a infligée.
10. En tant que `Player`, je veux que mes parties **lichess** portent enfin l'horloge, pour que la
    moitié de mon historique cesse d'être muette sur le temps.
11. En tant que `Player`, je veux que mes parties **rapides** portent l'horloge en particulier,
    parce que c'est là que je joue et que c'est la cadence aujourd'hui vide.
12. En tant que `Player`, je veux que ce rapatriement **ne détruise aucune analyse moteur**, parce
    que rien d'autre que du temps machine ne les reconstruit.
13. En tant que `Player`, je veux que le rapatriement **s'arrête bruyamment** s'il rencontre une
    partie dont les coups ne correspondent plus, plutôt que d'écraser en silence.
14. En tant que `Player`, je veux qu'il **sauvegarde la base** avant d'écrire, pour qu'une erreur
    reste réparable.
15. En tant que `Player`, je veux qu'il **montre son travail** — ce qu'il a lu, ce qu'il a
    sauvegardé, ce qu'il a changé — pour savoir ce qui s'est passé sans relire le code.
16. En tant que `Player`, je veux que mes **futurs** imports lichess portent l'horloge d'emblée,
    pour ne jamais repayer ce rapatriement.
17. En tant que `Player`, je veux qu'une partie en **correspondance** dise « sans objet » sur le
    temps, pour ne pas croire que la donnée manque alors qu'elle n'existe pas.
18. En tant que `Player`, je ne veux **jamais** voir un `0` là où l'app n'a pas la donnée, pour
    qu'un agrégat futur ne moyenne pas des faux zéros.
19. En tant que `Player`, je veux qu'un temps affiché **n'affirme pas une précision qu'il n'a pas**,
    pour pouvoir me fier à la décimale quand elle est là.
20. En tant que `Player`, je veux comparer mes temps **à l'intérieur d'une cadence**, parce qu'une
    seconde en bullet et une seconde en classique ne sont pas la même seconde.
21. En tant que `Player`, je veux savoir **combien de temps il restait à celui qui a abandonné**,
    parce que c'est une information sur la partie que le relevé par coup ne porte pas.
22. En tant que `Player`, je veux voir le temps sur une partie **non analysée**, parce que
    l'horloge ne coûte pas de moteur et que mes parties rapides ne sont pas analysées.
23. En tant que `Player`, je veux que l'app soit claire sur le fait que mes parties rapides ont du
    temps et **aucune évaluation** en face, pour ne pas croire l'axe prêt.
24. En tant que `Player`, je veux que rien de tout ceci ne change ce que l'analyse **compte**, pour
    que mes taux existants gardent le sens qu'ils avaient hier.
25. En tant que développeur, je veux **une** fonction qui traduise les quatre orthographes de
    cadence des deux plateformes, pour qu'aucun appelant n'en réinvente une cinquième.
26. En tant que développeur, je veux que la division lichess soit **impossible à confondre** avec la
    `Phase` que nous dérivons, pour ne pas fabriquer deux `Profile`s incomparables.
27. En tant que développeur, je veux que la perte de précision du PGN lichess soit **écrite**, pour
    ne pas la traiter comme un bug le jour où je la découvre.
28. En tant que développeur, je veux que les trois colonnes ajoutées soient **documentées comme
    définitivement nullables**, pour que personne ne tente de les resserrer en `NOT NULL`.

## Implementation Decisions

### La donnée : deux faits en périmètre, un dérivé, un dehors

- **`Time control`** (le réglage exact : budget initial + incrément, ou jours par coup) et
  **`Clock`** (le temps restant après un coup) sont en périmètre. **`Time spent`** en est **dérivé**
  (`Clock` précédent − `Clock` courant + incrément ; pour le premier coup, `initial + incrément −
  Clock₁`) et n'est jamais stocké — ADR-0009, on stocke le brut. La **durée totale** de la partie est
  **hors périmètre** : aucun consommateur ne la demande.
- **Les deux se lisent dans le PGN, aucune colonne** (ADR-0029). `Time control` vient de l'en-tête
  `[TimeControl]`, `Clock` du commentaire `[%clk]` de chaque demi-coup. `cm-chess` expose déjà
  `move.commentAfter` : aucune dépendance de parsing à ajouter. **Attention** : ce commentaire porte
  **plusieurs jetons** quand lichess a une analyse (`"[%eval 0.18] [%clk 0:03:00]"`) — lire l'horloge
  est une **extraction de jeton**, pas « le commentaire est l'horloge ».
- **La traduction des quatre orthographes est une fonction dédiée nommée**, appelée depuis chaque
  point d'entrée : chess.com dit `300`, `180+2`, `1/86400` ; lichess dit `300+0`, `600+5`,
  `1 day per move`, `2 days per move`. C'est une **tension assumée avec ADR-0018** (la traduction
  vit dans un module de dérivation, pas dans les adaptateurs) et ADR-0029 la porte.
- **Unité : entiers en centisecondes** partout où c'est stocké ou calculé. L'unité de lichess, la
  plus fine que la matière porte, et un entier ne dérive pas — des secondes en flottant feraient
  boiter les sommes d'un axe dont toute la valeur porte sur des écarts de quelques dixièmes.

### La correspondance n'a pas d'horloge, et c'est un fait, pas un manque

Mesuré : sur les parties `daily` chess.com, `[%clk]` est **non monotone** et hors de tout budget de
24 h (`0:00:00`, `0:03:46.9`, `0:02:02.9`, `0:29:04.9`) — ce n'est pas du temps restant, ce n'est
interprétable comme rien. Et lichess ne renvoie **ni `clock` ni `clocks`** pour une partie en
correspondance, seulement `daysPerTurn`. Donc :

- `Time control` **reste renseigné** pour elles (`2 jours par coup` est un fait exact) ;
- `Clock` et `Time spent` **n'existent pas**, et cette absence se lit **« sans objet »**, jamais
  « pas encore récupérée ». Aucun temps n'est inventé — **surtout pas un zéro**.
- Cette absence **ne passe pas par `UncountedReason`**, qui tient à deux valeurs par décision
  (ADR-0023, deux amendements) et sert le dénominateur du `Counted Move` pour la **sévérité**.
  L'horloge déclare ses trous chez elle.

### L'unique valeur d'horloge stockée

Le tableau `clocks` de lichess porte **une entrée de plus** qu'il n'y a de demi-coups — **sauf sur
mat**. Mesuré sur huit parties, quatre terminaisons : `+1` sur abandon, nulle acceptée et départ ;
`0` sur mat, où le dernier coup termine la partie et où il n'y a personne à relever. C'est
**l'horloge du camp au trait qui n'a pas joué**, et elle est **absente du PGN** dans les huit cas.

Elle est donc la **seule** valeur d'horloge stockée (une colonne nullable sur `games`), sur demande
explicite du demandeur : il en a besoin pour des calculs agentiques. **Elle est nulle pour les 1983
parties chess.com** — la plateforme n'expose aucun équivalent — **et nulle sur tout mat**. Un calcul
qui s'y appuie travaille sur les parties lichess non matées.

### Le rafraîchissement : un CLI à usage unique

- **`clocks=true` et `division=true` rejoignent la requête d'export lichess**, à côté de `since`,
  `until`, `pgnInJson`, `opening` et `sort`. Les futurs imports portent donc l'horloge d'emblée.
  `evals` et `accuracy` sont **exclus** : ils n'existent que là où quelqu'un a cliqué « analyser »
  sur lichess, donc leur présence est une loterie, et c'est un oracle extérieur.
- **`npm run repair:clocks -w server -- <db-file>`**, forme calquée sur `repair:provenance`. Correction
  **unique** de 434 lignes : une fois passée elle ne retourne jamais. Un bouton dans l'app serait une
  surface **permanente** pour un besoin **temporaire**, et replier le rafraîchissement dans l'import
  ordinaire est **rejeté** — il ferait de « déjà présente » une écriture, et l'assertion d'ADR-0030
  se mettrait à échouer pendant un import de routine.
- **Il couvre les 434 parties lichess**, pas seulement les 318 de blitz + rapid. Un rafraîchissement
  partiel ferait dire **deux choses** à « pas d'horloge » — *sans objet* pour une correspondance,
  *pas demandé* pour une classical — soit la confusion exacte que le point précédent interdit.
- **Il remplace `games.pgn` et refuse quand le mouvement diffère** (ADR-0030). Mêmes coups ⇒ mêmes
  FEN ⇒ les `Evaluation`s des **10 parties lichess analysées** survivent, et **la comparaison est ce
  qui le prouve**. Jamais de suppression/réinsertion : cela casserait la clé étrangère des
  `evaluations` et recompterait les `Move habit`s.
- **Il prend une `.backup` avant d'écrire, jamais un `cp`** — mesuré sur ce projet le 2026-08-27, un
  `cp` d'une base avec un `-wal` vivant a produit une copie qui **se relisait propre en ayant perdu
  une table entière**. Et il **montre son travail** : lectures avant, sauvegarde, lignes changées,
  lectures après.

### Schéma : trois colonnes nullables, et aucune ne se resserre

Sur `games` : la dernière horloge, et les **deux plies** de la division lichess. La migration est
due dans la même tranche (`CLAUDE.md`) — non destructive, re-jouable, échouant bruyamment. **Mais la
discipline « nullable → backfill → `NOT NULL` » ne s'applique pas ici** : la nullité de ces trois
colonnes est **légitime et permanente** (chess.com n'a ni l'une ni les autres, un mat n'a pas de
dernière horloge). C'est écrit pour que personne ne tente de les resserrer.

### La division lichess est stockée sans lecteur, exprès

ADR-0031. Les deux plies sont écrits par le rafraîchissement et **consommés par personne** jusqu'à
ce qu'US-32 s'en serve pour **vérifier sa propre dérivation** de `Phase`. Ils ne sont **jamais**
l'axe : chess.com n'expose aucun équivalent, donc lire la division là où elle existe et dériver
ailleurs rendrait deux `Profile`s silencieusement incomparables — la faute que `CONTEXT.md` refuse
déjà trois fois. Le garde-fou est le **nom** : `CONTEXT.md` porte `Lichess division`, un terme qui
nomme sa source pour ne pas pouvoir passer pour la nôtre.

Ils sont capturés **maintenant** parce que l'occasion est maintenant : la plage répond pour les 434
parties en **une** requête, là où partie par partie il en faudrait 434 — et `/api/games/user` a
répondu **dix `429` consécutifs** depuis cette adresse.

### Le contrat de lecture, et pourquoi il ne passe pas par le récapitulatif

`GET /api/games/:id/annotations` sert déjà `{ analyzed, plies, regime, recap }`, et rend
`plies: []`, `recap: null` quand la partie n'est pas analysée. **`rapid` a zéro partie analysée** —
la cadence même pour laquelle la story existe. Donc :

- le temps voyage dans un **bloc à part** du même payload, **rempli depuis le PGN quelle que soit la
  valeur d'`analyzed`** ;
- `GameRecap` garde exactement le sens qu'ADR-0017 lui donne — « ce que cette partie apporte à
  l'**analyse** » — et `analyzed` continue de ne parler que de ce qui vient du moteur ;
- **à l'écran**, la lecture du temps **rejoint le panneau du récapitulatif** : c'est une décision de
  mise en page, et c'est là qu'US-15c viendra la chercher. Un bloc visuellement séparé dirait que le
  temps est d'une autre nature, alors que l'EPIC veut qu'il soit **un axe parmi les autres**.
- La lecture par partie est **la somme de ce que les coups portent**, pas un calcul parallèle — même
  discipline qu'ADR-0017 : deux implémentations d'une méthode ne s'accordent que par chance.

### L'affichage

- **Secondes, une décimale là où la source en a, seconde entière sur lichess.** Le PGN lichess
  arrondit à la seconde (18003 cs → `0:03:00`, 17971 → `0:03:00`, 6675 → `0:01:07`), donc un
  `Time spent` lichess est une différence de deux entiers de secondes : une décimale y serait
  **toujours** `,0` pour une valeur juste à **±1 s**, pendant que la même colonne afficherait `1,8 s`
  sur chess.com, où le chiffre est réel. La colonne dit la vérité sur sa propre précision.
- **L'axe se lit à l'intérieur d'une `Time control category`**, jamais toutes cadences confondues —
  la règle qui gouverne déjà `Weak opening`, et la raison d'être de la catégorie.
- **Aucun indice uniquement chromatique** (garde-fou du projet).

## Testing Decisions

Un bon test ici décrit **ce que le `Player` obtient**, pas comment on l'obtient : « un coup joué en
0,8 s sur un 3+2 rapporte 0,8 s », « une partie en correspondance ne rapporte aucun temps », « un
mouvement différent fait échouer le rafraîchissement ». Aucun test ne doit connaître la forme d'un
`[%clk]`, sauf celui qui teste précisément l'extraction.

### Deux seams neufs, et c'est le plancher

Le sens d'écriture et le sens de lecture ne peuvent pas partager un seam.

1. **`getGameAnnotations`** — seam **existant** (`server/test/annotations.test.ts`), déjà celui que
   la page Analyse lit. Il **compose** tout le côté lecture : `Time control`, `Clock` et `Time spent`
   par coup, et la lecture par partie. C'est le point le plus haut disponible, et un seul seam couvre
   les quatre dérivations. Prior art direct : `recap.test.ts`, `derivation.test.ts`, `counted.test.ts`.
2. **`refreshClocks`** — module **neuf**, enveloppé par un CLI, sur la forme exacte de
   `resetProvenance` + `reset-provenance-cli.ts`, testé comme lui (`reset-provenance.test.ts`). Il
   porte l'assertion d'ADR-0030, seule chose entre nous et l'invalidation silencieuse de 10 parties
   analysées — donc les cas qui comptent sont : mouvement identique ⇒ PGN remplacé et `Evaluation`s
   intactes ; mouvement différent ⇒ **échec**, rien écrit ; partie déjà pourvue ⇒ pas touchée.

**Le reste roule sur des seams déjà là** : `lichess-client.test.ts` pour les paramètres de requête,
`lichess-mapping.test.ts` pour la division, le patron `*-migration.test.ts` (trois précédents) pour
les trois colonnes, `gameHeader.test.ts` pour le formatage client, `GameRecap.test.tsx` pour le
panneau.

### Place dans la pyramide

- **Unitaire**, le gros du travail : les dérivations sont pures et les cas durs sont des cas de
  données (incrément, premier coup, correspondance, commentaire à plusieurs jetons, mouvement
  divergent). Fixtures réelles : `server/test/fixtures/real-reading.ts` porte déjà un PGN chess.com
  60+1 complet avec ses `[%clk]` ; un PGN lichess 3+2 avec `[%eval]` **et** `[%clk]` est à ajouter,
  et le relevé de `clock-probe.md` dit où le reprendre.
- **API** : le payload d'annotations sur une partie **non analysée** doit porter le temps — c'est
  l'assertion qui empêche la régression « rapid n'affiche rien ».
- **Agentique — Feature Path**, porte d'auto-merge de chaque ticket. **Partage assumé** : l'étape de
  rafraîchissement s'exerce au niveau **CLI contre une fixture** (`LICHESS_BASE_URL` est déjà
  configurable, conçu pour ça) et **doit être verte à chaque passage** — un `429` de Lichess ne doit
  jamais peindre en rouge une assertion sur notre code. Une étape **en direct, non bloquante**
  constate que `clocks=true` rapporte bien l'horloge du vrai Lichess. La partie **visible** (colonne
  temps, lecture par partie) s'exerce dans l'**UI**, surface-first. Même partage qu'aux tranches
  serveur d'US-15a.
- **Agentique — Happy Path** : **greffe sur l'étape 9 de HP-01**, qui traverse déjà la page Analyse.
  **Pas de 4ᵉ HP** — au plus 3, même arbitrage qu'US-14 et US-15a.

## Out of Scope

- **Tout agrégat, tout classement, toute page de verdict.** C'est US-15c et US-15d, et c'est là que
  se tranche « taux marginaux ou conditionnels ».
- **Tout seuil.** 15b produit un nombre par `Move` et sa règle de dénominateur, pas un bucket choisi
  sur le papier. US-15a s'était interdit d'ajouter un seuil et ADR-0023 raconte ce que coûte d'en
  choisir un sans données.
- **L'appariement « temps × erreur ».** Il appartient à 15c/15d. Conséquence à écrire dans la
  livraison : **l'axe rapid sort avec de la donnée de temps et zéro `Evaluation` en face**, et une
  passe sur les 231 parties de rapid coûterait ~2 h au tarif mesuré (0,56 s/position). Sans cette
  phrase, quelqu'un ouvrira 15c en croyant rapid prêt.
- **L'interaction avec le coup forcé** — un coup joué en 0,3 s parce qu'il était forcé n'est pas de
  la pression du temps. C'est une question de **prédicat**, et 15b n'en a pas.
- **La durée totale d'une partie** (`StartTime`/`EndTime`, `createdAt`/`lastMoveAt`) : aucun
  consommateur.
- **`evals` et `accuracy` de lichess** : oracle extérieur, présent au hasard des clics d'autrui.
- **Toute lecture de la division lichess comme la `Phase`** : ADR-0031, et c'est US-32 qui s'en
  servira — comme oracle.
- **Tout changement à ce que l'analyse compte** : `Counted Move`, `UncountedReason`, les bandes de
  sévérité et le plancher du dénominateur ne bougent pas d'un point.

## Further Notes

- **Trois recommandations de l'agent ont été renversées par le demandeur**, et les notes de grill le
  disent : la dérivation depuis le PGN (l'agent recommandait de stocker traduit), la conservation de
  la dernière horloge (l'agent recommandait de la jeter), la division en base (l'agent recommandait
  un fichier de référence). Les ADR portent les décisions **prises**, pas les recommandations.
- **Deux fautes de raisonnement de l'agent ont été corrigées en séance** : l'argument ADR-0016
  (« deux endroits pour le même fait ») ne discriminait pas les deux options de Q3, puisque le PGN
  chess.com est stocké brut avec ses `[%clk]` quoi qu'on décide ; et `evals` avait été exclu comme
  oracle extérieur tandis que `division` était retenu sur un critère — la disponibilité — qui ne dit
  rien de la même chose.
- **Lichess refuse l'export depuis cette adresse par rafales.** `/api/games/user` a répondu dix
  `429` d'affilée le 2026-09-08 (`"Please only run 1 request(s) at a time"`) pendant que
  `/game/export/{id}` répondait `200`. C'est un throttle par IP, pas une panne — ne pas le
  diagnostiquer comme un problème d'IPv6. C'est aussi pourquoi la FP ne fait porter aucune assertion
  dure au réseau.
- **`status=timeout` chez lichess n'est pas la chute du drapeau** (ce serait `outoftime`) : c'est le
  camp qui a quitté la partie. Sur `0NgTJrIv` la dernière horloge vaut 46,53 s, cohérent avec un
  départ et non avec un drapeau tombé.
- **La base de développement est sous `server/`**, pas à la racine : le `chess-analyst.db` de la
  racine fait **0 octet** et une mesure prise dessus ne dit rien.
