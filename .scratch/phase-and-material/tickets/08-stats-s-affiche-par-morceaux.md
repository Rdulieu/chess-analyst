# 08 — `/stats` s'affiche par morceaux, le coûteux arrive derrière

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). ADR-0012, **ADR-0014**, ADR-0015, ADR-0017, **ADR-0036** (+ son
> amendement du 2026-09-25), ADR-0013.

**What to build:** `/stats` cesse d'attendre son calcul le plus lent pour montrer son calcul le plus
rapide. Les tableaux de résultats s'affichent **tout de suite** ; les blocs dérivés des signatures et
des dégâts **continuent de se charger derrière**, chacun avec son squelette, et apparaissent quand
ils sont prêts. Demandé par le demandeur le 2026-09-25.

**Blocked by:** 07 — la page porte désormais cinq tables, et c'est celle-là qu'on découpe.

**Status:** done
**Delivered:** 2026-09-25 · merge `6d934ad` sur `integration/US-32-phase-and-material` (PR #131,
merge humain en attente) · gate: build vert, **708 tests serveur / 51 fichiers**, **1 120 tests
client / 71 fichiers**, `npm run lint` **sorti 0**, **Feature Path verte** sur une copie de la base
réelle (les quatre `Profile`s), aucun finding bloquant ouvert. La revue indépendante en a rendu
**deux bloquants** — la porte du groupe relecture qui se refermait sur un « Réessayer » du bloc
dégâts, et la mesure de la tranche non produite — tous deux payés avant le merge.

## Ce que ça a donné — avant / après, les quatre `Profile`s

À froid, un processus serveur neuf par profil, chronométré dans le navigateur depuis la navigation
vers `/stats`.

| `Profile` | avant : la page entière | après : **premier contenu utile** | dégâts par phase | groupe relecture (3 tables) |
|---|---|---|---|---|
| `DudulSmash` (186 / 66 analysées) | 17,7 s | **0,56 s** | 9,6 s | 18,2 s |
| `Nonomoho` (1 806 / 1) | 53,3 s | **0,65 s** | 1,0 s | 57,5 s |
| `Metalyst` (366 / 11) | 13,6 s | **0,58 s** | 2,6 s | 15,4 s |
| `Monado_Boy` (80 / 0) | 3,1 s | **0,56 s** | *(phrase honnête, avec les résultats)* | 4,4 s |

Le chiffre de la tranche est la troisième colonne : **de 3,1–53,3 s à 0,56–0,65 s**, soit un
facteur **27 à 82**. Les blocs coûteux, eux, n'arrivent pas plus tôt — ils arrivent **derrière**,
chacun dans son squelette, et le groupe relecture arrive même une poignée de secondes plus tard
qu'avant (18,2 contre 17,7 sur `DudulSmash`) parce qu'il est séquencé après le fold des dégâts.
C'est le prix assumé du premier affichage.

**Séquencé, pas parallèle, et c'est une mesure.** Node est mono-thread et les deux folds ne cèdent
la main que toutes les 25 parties. Sur `DudulSmash`, lancés ensemble : dégâts **15,5 s**, relecture
**17,7 s**. Séquencés (dégâts d'abord, le plus court) : dégâts **8,5 s**, relecture **16,8 s**. Le
parallélisme ne fait gagner personne et fait perdre le bloc le moins cher ; la clause d'échappement
du ticket s'applique, et elle est dite dans le code comme ici.

**Tiède : ~50 ms sur les trois** — la mémoïsation par processus est conservée telle quelle.

## Le constat

`/stats` fait **une** requête et n'affiche **rien** tant que tout n'est pas calculé. Mesuré à froid
sur la base réelle : **~18 s** (DudulSmash, 186 parties), **~13 s** (Metalyst, 366), **~53 s**
(Nonomoho, 1 806). Pendant tout ce temps l'écran dit « Chargement de vos statistiques… » alors que
le total, les cadences et les côtés sont **déjà connus** — ce sont trois `bucket()` sur des lignes
SQL déjà en main, de l'ordre de la milliseconde.

`getStats` (`server/src/stats/repository.ts:177`) rend un seul objet dont les parties n'ont pas du
tout le même prix :

| groupe | ce qu'il coûte | ce qu'il alimente |
|---|---|---|
| agrégats SQL | **~0 ms** — `bucket()` sur `rows`, déjà chargées | `total`, `byCategory`, `bySide` |
| **relecture PGN** (`crossingsOf`) | **~14 s à froid** | `signatures`, `materialBands`, `phaseResults` |
| **`gameRecap`** (`damageOf`) | **~250 ms par partie analysée**, ~14 s sur 66 | `phaseDamage` |

## La contrainte à ne pas casser

- [x] **Une seule relecture PGN sert les trois folds qu'elle alimente.** `signatures`,
      `materialBands` et `phaseResults` partagent `crossings` — c'est une décision de la tranche 06,
      écrite dans le code (`repository.ts:42`). Les séparer en trois requêtes rejouerait les PGN
      trois fois et **triplerait** la note. Ils voyagent **ensemble**.
- [x] Les deux groupes coûteux sont en revanche **indépendants** l'un de l'autre — tenu côté
      serveur : deux routes, aucune ne lit le travail de l'autre. Côté client ils sont **séquencés**
      et non parallèles, voir plus bas : c'est la mesure qui l'a tranché, pas la dépendance.

## Le découpage

- [x] **Trois routes** plutôt qu'une, et le nom dit le coût, pas le contenu :
      `GET /api/stats` rend les agrégats **seuls** ; une route pour le groupe dérivé des signatures
      (signatures + bandes + tableau A) ; une route pour le tableau B. Le nommage exact est à
      l'agent, mais `/api/stats` **reste** la route des agrégats — c'est la moins chère et la plus
      demandée.
- [x] ~~Le client lance les trois **en parallèle**, jamais en cascade~~ — **dévié, par la clause
      d'échappement de ce ticket même** : la mesure a montré le parallélisme perdant (dégâts 15,5 s
      contre 8,5 s séquencés, pour une relecture qui ne finit pas plus tôt). Ce qui est tenu, et qui
      était l'intention, c'est qu'**aucun bloc n'attend ce dont il n'a pas besoin** : le tableau B
      part le premier, et non derrière la relecture PGN. La porte est **loquetée** — un
      « Réessayer » sur un bloc ne rouvre ni ne relance l'autre.
- [x] **Chaque bloc a son propre état** — chargement, chargé, échoué — et un échec sur l'un
      **n'efface pas** les autres. Le `LoadFailure` + retry existant s'applique par bloc, pas à la
      page.
- [x] La mémoïsation par processus est conservée telle quelle : visite tiède ≈ 50 ms sur les trois.

> **Mesurer l'effet du parallélisme, et le dire.** Node est mono-thread et les deux folds coûteux
> cèdent la main toutes les 25 parties : lancés ensemble ils **s'entre-ralentissent**, et le constat
> n° 2 de la tranche 04 (latence concurrente ×20 pendant le fold) s'applique. Si la mesure montre
> que le parallélisme rend les deux nettement pires que le séquentiel, **séquencer et le dire** —
> l'objectif est le premier affichage rapide, pas le parallélisme pour lui-même.

## Les squelettes

- [x] Chaque bloc en attente montre un **squelette à la forme de sa table** — pas un spinner
      générique, pas un texte seul : le lecteur doit voir **où** le contenu va arriver et que la
      page n'a pas fini.
- [x] **Accessible, pas seulement visuel** : chaque squelette porte un `role="status"` qui **nomme
      ce qu'on attend** (« Configurations de finale — calcul en cours… »), et `aria-busy` sur la
      région. Un lecteur d'écran doit apprendre qu'il manque quelque chose et quoi.
- [x] **ADR-0013** : rien porté par la couleur ou l'animation seules. Un squelette qui ne serait
      qu'un dégradé animé est muet pour qui ne le voit pas, et invisible en `prefers-reduced-motion`.
- [x] `prefers-reduced-motion` est **respecté** : pas d'animation imposée.
- [x] Le squelette **ne ment pas sur la volumétrie** : il ne montre pas vingt lignes fantômes là où
      il y en aura trois. Une forme, pas une prédiction.
- [x] À **380 px**, squelettes compris, **aucun défilement horizontal de page** — chaque table et
      son squelette dans leur `[data-scroll="x"]`, la prose dehors. US-32 a payé ce défaut une fois
      (925 px dans une fenêtre de 365) ; la tranche 06 l'a évité ; ne pas le réintroduire par un
      squelette de largeur fixe.

## Ce qui ne doit pas régresser

- [x] **L'historique vide** (`total.games === 0`) montre toujours l'invitation, et **pas** trois
      squelettes qui n'aboutiront jamais. L'agrégat arrive le premier et sait déjà qu'il n'y a rien :
      les blocs coûteux ne doivent pas même être demandés.
- [x] Le tableau B sur un `Profile` **sans partie analysée** (`Monado_Boy`, 0 sur 80) garde sa
      phrase honnête, et ne passe pas par un squelette éternel.
- [x] Toutes les phrases de portée, de dénominateur et de mitigation des tranches 04, 06 et 07
      restent **telles quelles** — c'est le contrat d'ADR-0036 et de son amendement, pas de la
      décoration.
- [x] `ADR-0014` : tout reste porté par le `Profile` courant. Changer de profil relance les trois.

## La porte

- [x] **Mesurer et rapporter**, avant / après, sur les quatre `Profile`s réels : le temps jusqu'au
      **premier contenu utile** (les tableaux de résultats) et le temps jusqu'à **chaque** bloc. Le
      premier chiffre est l'objet de la tranche ; c'est celui qui doit s'effondrer.
- [x] Aucun temps moteur, aucune colonne, **aucune migration** (ADR-0015).
- [x] La FP se joue sur le système réel et **doit voir les squelettes** — donc sur un `Profile`
      assez gros pour que l'attente existe (`Nonomoho`, 1 806 parties, ~53 s), pas seulement sur un
      petit où tout arrive trop vite pour être observé.
