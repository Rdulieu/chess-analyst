# 06 — Les trois bloquants que la suite HP a trouvés

**What to build:** HP-03 a rendu **rouge** la porte `integration → develop` de l'US-30 avec trois
findings bloquants, tous dans la surface neuve de l'US. Cette tranche les ferme.

## 1. La `Confrontation` dit d'un même verdict qu'il est scoré **et** « jamais noté »

Sur une partie testée, le bloc `[data-unscored="opponent"]` annonce « Verdicts sur les coups de
l'adversaire : 2. Gardés et montrés, **jamais notés** », sous un chapeau disant qu'ils n'entrent
« dans aucun des chiffres ci-dessus » — alors que **l'un des deux** est tout le dénominateur du
« 0 % — 0 sur 1 `Opportunity` examinée » juste au-dessus. Sur l'autre partie c'est 1 pour 1 : un
verdict adverse, compté « 100 % — 1 sur 1 » et simultanément rangé dans « 1 … jamais notés ».

La cause est dans la charge utile : un pli porte `unscored: "opponent"` **et**
`opportunityTerm` à la fois, et le compteur des non-scorés adverses compte **tout** verdict adverse
sans regarder s'il a été scoré.

Deux conséquences, et la seconde est la plus grave : le compte est faux, **et** le joueur s'entend
redire que ses verdicts sur les coups adverses tombent dans un gris muet — la doctrine d'avant
l'US-30, celle que cette US existe précisément pour retirer.

Symptôme secondaire de la même racine : la colonne **Confrontation** de la liste des coups imprime
encore `data-tone="unscored"` / « Coup de l'adversaire » sur ce pli, alors que la cartouche sous
l'échiquier, elle, affiche bien « ?! Sur-lecture ».

**Ce qu'il faut** : un verdict adverse **scoré** n'est plus « non scoré ». `unscored` et le terme
restent mutuellement exclusifs, comme le contrat de `MoveReading` le dit déjà pour le couple
joueur — c'est la propriété à rétablir, à un seul endroit, pas à trois.

## 2. La cartouche de la page `Analyse` dit « Rien à signaler » sur un coup qu'elle flague

Au niveau `Détaillé`, la liste des coups montre « ?! Opportunity » sur quatre plis, pendant que le
relevé sous l'échiquier lit « Rien à signaler sur ce coup » sur **ces mêmes quatre plis**. Un écran
flague et dé-flague le même coup.

La spec nomme « la cartouche sous l'échiquier » parmi les trois sites, et la story 20 la demande
explicitement.

## 3. La cellule `Opportunity` déborde sa colonne à 380 px

Sur la `Confrontation`, l'audit rend `problems=10, pass=false` à 380 px dans **les deux thèmes** :
les `span[data-cell="engine"]` mesurent 144 px de contenu dans une piste de 96 px, et le
débordement se propage à la liste et à trois ancêtres (339 contre 333 px). Le corps de page, lui, ne
défile pas latéralement — c'est donc la seconde moitié de l'assertion qui tombe : aucune boîte ne
doit être plus large que son conteneur, sauf défileur horizontal déclaré.

Introduit par l'US-30 et **propre à la ligne à quatre colonnes** de la `Confrontation` : la page
`Analyse` à 380 px, avec les mêmes cellules, rend `problems=0`. C'est exactement la classe de défaut
pour laquelle la largeur de 380 px a été ajoutée à la passe de thème.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** None — 01 à 05 sont mergées.

**Status:** done
**Delivered:** 2026-09-15 · PR #129 · merge `2d25b5f` · gate: build ✅, tests ✅ (628 serveur + 1034 client), `npm run lint` sorti 0 ✅, Feature Path verte ✅ (les deux parties d'HP-03, 8/8 lectures de l'audit à 380 px à `problems=0`), aucun finding bloquant

- [x] Un verdict adverse scoré n'est plus compté parmi les « jamais notés » — les deux comptes sont
      justes sur les deux parties du rapport HP-03
- [x] `unscored` et le terme sont **mutuellement exclusifs** sur les plis adverses, comme sur ceux
      du joueur ; un test ancre l'exclusion, sur une lecture d'entrée
- [x] Le chapeau « n'entre dans aucun des chiffres ci-dessus » est vrai de ce qu'il couvre
- [x] La colonne Confrontation de la liste et la cartouche sous l'échiquier disent **la même chose**
      sur le même pli — un test ancre l'accord des deux
- [x] Le relevé de la page `Analyse` nomme l'`Opportunity` au lieu de « Rien à signaler »
- [x] À 380 px, la `Confrontation` rend `problems=0` dans les deux thèmes ; aucune boîte plus large
      que son conteneur hors défileur déclaré
- [x] La page `Analyse` à 380 px reste à `problems=0`
- [x] Aucune régression sur les figures du joueur, la matrice, le pli de « Mes lectures »

### Feature Path (FP)

1. Rejouer la sélection d'HP-03 (une défaite en Blancs et une en Noirs, ≥30 demi-coups, choisies
   **par caractéristiques**), analyser, lire en aveugle, sceller, confronter
2. Sur le pli adverse portant un verdict **et** une `Opportunity` : la colonne, la cartouche et le
   bloc des non-scorés disent trois choses **compatibles** — et le dénominateur de la figure
   « offert » recoupe ce que le bloc annonce
3. Page `Analyse` en `Détaillé` : le relevé sous l'échiquier nomme l'`Opportunity` sur les plis où
   la liste la flague
4. Audit de thème à **380 px** sur la `Confrontation`, dans les deux thèmes → `problems=0`
5. Même audit sur `Analyse` en `Détaillé` → toujours `problems=0`
6. En `unaided`, le balayage `/opportun/i` du `body` **cloné sans `style`/`script`/`link`** rend
   toujours 0 — la feuille de style du serveur de dev est un faux positif connu

Verify: par l'interface, **sur le rendu** (styles calculés et géométrie), jamais sur la réponse
réseau.
