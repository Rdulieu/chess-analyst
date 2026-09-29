# 06 — Les deux tableaux par phase sur `/stats`, et le tri par fréquence

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036** (+ son
> **amendement du 2026-09-25**), `CONTEXT.md`.

**What to build:** deux retours du demandeur à la revue de la PR #131, tranchés le 2026-09-25.

1. La table des `Material signature` de `/stats` se trie par **fréquence** — les configurations les
   plus courantes en premier — et non plus par défaites. *(Déjà fait, hors TDD, au moment de la
   demande : `mostPlayedFirst` dans `server/src/stats/signatures.ts`, test d'ordre réécrit. À
   reprendre dans la tranche pour la porte et la revue, pas à refaire.)*
2. `/stats` porte **deux** tableaux par `Phase` — l'un en résultats, l'autre en dégâts — chacun
   annonçant sa volumétrie et les limites de ce qu'il autorise à conclure.

**Blocked by:** 04 — les deux tableaux se posent sur le même écran et sous le même bloc.

**Status:** done
**Delivered:** 2026-09-25 · merge `b0b9c10` sur `integration/US-32-phase-and-material` (PR #131,
merge humain en attente) · gate: build vert, **683 tests serveur / 49 fichiers**, **1 095 tests
client / 70 fichiers**, `npm run lint` **sorti 0**, **Feature Path verte** sur la base réelle
(trois `Profile`s), aucun finding bloquant. La revue indépendante en a rendu **dix non
bloquants** : sept corrigés dans `bd85789`, trois remontés au demandeur ci-dessous.

> **L'amendement d'ADR-0036 est écrit et fait foi.** Le corpus pouvait déjà porter une lecture en
> résultats ; il porte désormais aussi une lecture en dégâts, **parce que l'axe `Phase` a une
> cardinalité de 3** là où les signatures en ont 808. Les trois conditions de l'amendement ne sont
> pas des recommandations : ce sont les critères ci-dessous.

## Tableau A — « Où tes parties se décident » (résultats)

- [x] Une ligne par `Phase` : la phase dans laquelle la partie **s'est terminée** (la `Phase` du
      dernier demi-coup).
- [x] Colonnes : **Parties** (compte *et* part), **Résultats** (V / N / D), **Win rate**.
- [x] Porte sur **toutes** les parties du `Profile` courant — aucun temps moteur requis, la
      frontière est dérivée du PGN. Une partie illisible est **comptée à part**, jamais rangée sous
      une phase (même règle que la table des configurations).
- [x] Jamais un taux seul : les comptes et le taux ensemble, comme partout ailleurs.
- [x] La table dit que ses parts **font 100 %** — une partie finit dans une phase et une seule.
      C'est le contraire de la table des configurations juste au-dessus, dont la colonne ne
      s'additionne pas, et les deux se touchent à l'écran.
- [x] **Mitigation écrite** : une partie qui se termine en finale n'a pas été *perdue par* la
      finale — elle n'a pas été décidée avant. Le tableau montre une corrélation et doit dire
      qu'il ne montre pas une cause.

Oracle mesuré le 2026-09-25 (à revérifier, pas à recopier) : `DudulSmash` 6 / 36 / 144 parties
(3 / 19 / 77 %), win rate **67 / 64 / 48 %**, 0 illisible. `Metalyst` 27 / 103 / 236
(7 / 28 / 64 %), win rate **67 / 62 / 40 %**, 0 illisible.

> **Revérifié.** Les comptes sont exacts. Les parts affichées sont réparties au plus fort reste pour
> faire 100 (`DudulSmash` 3 / 19 / **78**, `Metalyst` 7 / 28 / **65**), et les win rates sont ceux de
> `bucket()` — voir le constat 2 en bas de ticket.

## Tableau B — « Où tombent tes dégâts » (parties analysées)

- [x] Une ligne par `Phase`. Colonnes : **phase dominante dans N parties** (compte *et* part), et
      la **part moyenne des dégâts** *accompagnée de sa médiane*.
- [x] **Jamais une somme mise en commun** (condition 3 de l'amendement) : additionner les chances
      perdues de tout le corpus laisse les parties catastrophe décider. Le compte de parties
      dominantes est la mesure robuste, la moyenne ne va **jamais** sans la médiane.
- [x] Porte sur les **parties analysées seulement**. La volumétrie est annoncée en toutes lettres
      et **mise en regard** de celle du tableau A : « 66 de tes 186 parties ont été analysées ».
- [x] Une partie qui n'atteint pas une phase **ne compte pas** dans le dénominateur de cette
      phase, et ça se dit — c'est la même règle que « non atteinte » par partie, une échelle plus
      haut.
- [x] **Mitigation écrite**, et elle est double : (a) l'échantillon est celui des parties
      analysées, pas de la pratique — sur `Metalyst` c'est **11 sur 366** et le tableau ne conclut
      à peu près rien ; (b) le dénominateur **bouge à chaque passe moteur**, donc le tableau
      annonce un compte, jamais « tes parties ».
- [x] Quand aucune partie n'est analysée (`Monado_Boy`, 0 sur 80), une **phrase**, jamais un
      tableau de zéros.

Oracle mesuré le 2026-09-25 sur `DudulSmash` (66 parties analysées) : phase dominante début **21**
/ milieu **33** / finale **12** ; part moyenne **34,8 / 48,3 / 16,9 %** ; médiane
**25,1 / 46,5 / 4,2 %**.

> **Revérifié, et il diffère.** Ces chiffres prennent toutes les parties analysées au dénominateur,
> une phase non atteinte comptant 0 %. Le critère d'acceptation deux lignes plus haut demande
> l'inverse, et c'est lui qui a été implémenté — voir le constat 1 en bas de ticket. Les comptes de
> phase dominante, eux, sont confirmés exactement : **21 / 33 / 12**.

## Ce que les deux tableaux disent ensemble

- [x] Les deux lectures **se contredisent sur cette base**, et l'écran ne le lisse pas : les dégâts
      désignent le milieu de partie, les résultats désignent la finale (48 % de win rate contre
      64 et 67 %). **Aucun composite, aucune colonne partagée, aucun classement commun**
      (condition 1 de l'amendement).
- [x] La contradiction est **nommée à l'écran**, en une ligne, comme une observation et non comme
      une conclusion : la finale porte peu de dégâts en médiane et coûte seize points de win rate.
      Ni l'un ni l'autre tableau ne tranche pourquoi.

## Le reste de la porte

- [x] ADR-0013 : rien porté par la couleur seule.
- [x] Les deux tableaux tiennent dans une fenêtre de **380 px** — `[data-scroll="x"]` autour de
      chaque table, **la prose en dehors**. C'est le défaut qu'US-32 a déjà payé une fois : dix
      suites HP vertes sur un débordement de 925 px, parce que `theme-pass.md` n'audite `/analyse`
      qu'en `Sans aide`. Ne pas le repayer sur `/stats`.
- [x] `/stats` est **déjà lent à froid** (9,5 s sur 186 parties, ~49 s sur 1 806). Le tableau A
      **rejoue les mêmes PGN** que la table des configurations : les replayer une seconde fois
      doublerait la note. Une seule relecture sert les deux — c'est la contrainte de conception
      principale de la tranche. Mesurer avant / après et le dire.
- [x] Le tableau B lit des `Evaluation`s déjà stockées : **aucun temps moteur**, aucune colonne,
      **aucune migration** (ADR-0015).


---

## Coutures déclarées (ADR-0027)

En AFK l'agent choisit ses coutures et les déclare. Celles de cette tranche :

1. **`phaseResultTable` / `phaseDamageTable`** (`server/src/stats/phase-tables.ts`) — deux plis
   **purs**, hors base de données : ils prennent ce qu'une partie dit et rendent une table. C'est
   là que vit l'arithmétique qui doit tenir (les parts à 100 %, la médiane, le dénominateur par
   ligne), et c'est là qu'elle est testée — douze tests, sans serveur.
2. **`phaseOf` en paramètre par défaut de `crossedSignatures` / `signatureByPly`**
   (`server/src/analysis/crossed.ts`) — une optimisation avec une valeur par défaut, pas une
   seconde façon de demander. C'est la couture qui fait que le tableau A coûte **0 ms** : une
   relecture de PGN, une lecture de `phases()`, deux tables.
3. **`GameDamage`** (`server/src/stats/phase-tables.ts`) — l'interface étroite entre le dépôt et le
   pli. Le dépôt sait lire un `gameRecap` ; le pli ne sait que « ce que cette partie a lâché, par
   phase ». Aucune des deux moitiés n'a besoin de l'autre pour être lue.
4. **`phaseReading.ts`** (client) — la seule chose dite des **deux** tableaux ensemble, isolée dans
   une fonction pure qui rend deux phases et **rien de dérivé des deux**. La condition 1 de
   l'amendement est tenue par la forme du type de retour, pas par la discipline du rédacteur.
5. **`counts.ts`** (client) — les accords, à côté du nombre.

## Trois constats remontés au demandeur (aucun n'est bloquant)

1. **L'oracle du tableau B et son critère d'acceptation ne disaient pas la même chose.** Les
   chiffres mesurés du ticket (moyennes **34,8 / 48,3 / 16,9 %**, médianes **25,1 / 46,5 / 4,2 %**)
   ont été calculés avec **toutes** les parties analysées au dénominateur, une phase non atteinte
   comptant comme **0 %**. Le critère d'acceptation juste au-dessus demande l'inverse — « une
   partie qui n'atteint pas une phase ne compte pas dans le dénominateur de cette phase ». Le
   critère l'a emporté : c'est la discipline « non atteinte n'est pas zéro » de tout le reste du
   produit, et une finale jamais jouée tirait la moyenne de la finale vers le bas. Mesuré sur
   `DudulSmash` avec la règle implémentée : moyennes **34,8 / 50,6 / 22,8 %**, médianes
   **25,1 / 47,8 / 11,9 %**, sur **66 / 63 / 49** parties. La contradiction entre les deux tableaux
   tient toujours, et l'écart moyenne/médiane de la finale reste du simple au double.
2. **Les win rates du tableau A sont ceux de `bucket()`**, le `Win rate` canonique
   `(V + 0,5·N) / parties`, pas `V / parties`. L'oracle du ticket utilisait le second : le milieu de
   partie de `DudulSmash` lit **65 %** et non 64, et la finale de `Metalyst` **43 %** et non 40.
3. **Le tableau B n'est pas gratuit, et il ne pouvait pas l'être.** Passer par `gameRecap` — la
   **seule** implémentation de la méthode (ADR-0017) — coûte ~250 ms par partie analysée, soit
   **+16 s à froid** sur les 66 parties analysées de `DudulSmash`. La contrainte du ticket portait
   sur la relecture PGN et elle est **tenue** : le tableau A coûte 0 ms, vérifié en isolant les deux
   moitiés. Mesures (même machine, même charge) : la relecture PGN seule fait **14,1 s** sur
   `DudulSmash`, **19,8 s** sur `Metalyst`, **90,4 s** sur `Nonomoho` ; avec le tableau B, **28,2 /
   21,6 / 85,4 s**. Le fold est mémoïsé par partie et estampillé sur les lignes lues, donc les
   visites suivantes sont à **50 ms**. Rendre la première visite rapide demande de stocker les
   Positions d'une partie non analysée — un changement de schéma et une migration, donc un ticket
   à part.

## Un constat de conception, laissé tel quel et signalé

Une partie analysée qui n'a **rien lâché** est comptée à part (`undamaged`) et ne désigne aucune
phase dominante ; mais elle verse tout de même une part de **0 %** dans chaque phase qu'elle a
atteinte. `dominant` et `meanShare` se lisent donc sur deux populations légèrement différentes. Sur
la base réelle le cas n'existe pas — **0 partie sans dégât** sur les trois profils analysés — donc
rien n'est visible à l'écran aujourd'hui. Le choix inverse (0/0 est indéfini, pas zéro) se défend
aussi ; il est épinglé par un test, à confirmer plutôt qu'à corriger.

## Ce que la Feature Path a trouvé

Deux défauts, tous deux invisibles aux tests unitaires parce qu'ils sont dans le rendu :

- « vos dégâts désignent **milieu de partie** » — un libellé de colonne posé dans une phrase. Le
  français veut son article ; `PHASE_PHRASE` a été ajouté à côté de `PHASE_LABEL`.
- trois accords faux au singulier et au pluriel, dont « 2 parties n'**a** pas pu être relue ».

Et une confirmation, celle qui comptait : à **380 px**, dans les **deux thèmes**, la page ne défile
**pas** latéralement (`scrollWidth` 365 pour un `clientWidth` de 365). Les quatre tables de `/stats`
défilent chacune dans son propre `[data-scroll="x"]`, et aucun de ces conteneurs ne contient un seul
paragraphe. Le défaut de 925 px de la tranche 05 n'a pas été repayé.
