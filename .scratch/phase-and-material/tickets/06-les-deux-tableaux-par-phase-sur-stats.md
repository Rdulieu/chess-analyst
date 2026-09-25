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

**Status:** ready-for-agent

> **L'amendement d'ADR-0036 est écrit et fait foi.** Le corpus pouvait déjà porter une lecture en
> résultats ; il porte désormais aussi une lecture en dégâts, **parce que l'axe `Phase` a une
> cardinalité de 3** là où les signatures en ont 808. Les trois conditions de l'amendement ne sont
> pas des recommandations : ce sont les critères ci-dessous.

## Tableau A — « Où tes parties se décident » (résultats)

- [ ] Une ligne par `Phase` : la phase dans laquelle la partie **s'est terminée** (la `Phase` du
      dernier demi-coup).
- [ ] Colonnes : **Parties** (compte *et* part), **Résultats** (V / N / D), **Win rate**.
- [ ] Porte sur **toutes** les parties du `Profile` courant — aucun temps moteur requis, la
      frontière est dérivée du PGN. Une partie illisible est **comptée à part**, jamais rangée sous
      une phase (même règle que la table des configurations).
- [ ] Jamais un taux seul : les comptes et le taux ensemble, comme partout ailleurs.
- [ ] La table dit que ses parts **font 100 %** — une partie finit dans une phase et une seule.
      C'est le contraire de la table des configurations juste au-dessus, dont la colonne ne
      s'additionne pas, et les deux se touchent à l'écran.
- [ ] **Mitigation écrite** : une partie qui se termine en finale n'a pas été *perdue par* la
      finale — elle n'a pas été décidée avant. Le tableau montre une corrélation et doit dire
      qu'il ne montre pas une cause.

Oracle mesuré le 2026-09-25 (à revérifier, pas à recopier) : `DudulSmash` 6 / 36 / 144 parties
(3 / 19 / 77 %), win rate **67 / 64 / 48 %**, 0 illisible. `Metalyst` 27 / 103 / 236
(7 / 28 / 64 %), win rate **67 / 62 / 40 %**, 0 illisible.

## Tableau B — « Où tombent tes dégâts » (parties analysées)

- [ ] Une ligne par `Phase`. Colonnes : **phase dominante dans N parties** (compte *et* part), et
      la **part moyenne des dégâts** *accompagnée de sa médiane*.
- [ ] **Jamais une somme mise en commun** (condition 3 de l'amendement) : additionner les chances
      perdues de tout le corpus laisse les parties catastrophe décider. Le compte de parties
      dominantes est la mesure robuste, la moyenne ne va **jamais** sans la médiane.
- [ ] Porte sur les **parties analysées seulement**. La volumétrie est annoncée en toutes lettres
      et **mise en regard** de celle du tableau A : « 66 de tes 186 parties ont été analysées ».
- [ ] Une partie qui n'atteint pas une phase **ne compte pas** dans le dénominateur de cette
      phase, et ça se dit — c'est la même règle que « non atteinte » par partie, une échelle plus
      haut.
- [ ] **Mitigation écrite**, et elle est double : (a) l'échantillon est celui des parties
      analysées, pas de la pratique — sur `Metalyst` c'est **11 sur 366** et le tableau ne conclut
      à peu près rien ; (b) le dénominateur **bouge à chaque passe moteur**, donc le tableau
      annonce un compte, jamais « tes parties ».
- [ ] Quand aucune partie n'est analysée (`Monado_Boy`, 0 sur 80), une **phrase**, jamais un
      tableau de zéros.

Oracle mesuré le 2026-09-25 sur `DudulSmash` (66 parties analysées) : phase dominante début **21**
/ milieu **33** / finale **12** ; part moyenne **34,8 / 48,3 / 16,9 %** ; médiane
**25,1 / 46,5 / 4,2 %**.

## Ce que les deux tableaux disent ensemble

- [ ] Les deux lectures **se contredisent sur cette base**, et l'écran ne le lisse pas : les dégâts
      désignent le milieu de partie, les résultats désignent la finale (48 % de win rate contre
      64 et 67 %). **Aucun composite, aucune colonne partagée, aucun classement commun**
      (condition 1 de l'amendement).
- [ ] La contradiction est **nommée à l'écran**, en une ligne, comme une observation et non comme
      une conclusion : la finale porte peu de dégâts en médiane et coûte seize points de win rate.
      Ni l'un ni l'autre tableau ne tranche pourquoi.

## Le reste de la porte

- [ ] ADR-0013 : rien porté par la couleur seule.
- [ ] Les deux tableaux tiennent dans une fenêtre de **380 px** — `[data-scroll="x"]` autour de
      chaque table, **la prose en dehors**. C'est le défaut qu'US-32 a déjà payé une fois : dix
      suites HP vertes sur un débordement de 925 px, parce que `theme-pass.md` n'audite `/analyse`
      qu'en `Sans aide`. Ne pas le repayer sur `/stats`.
- [ ] `/stats` est **déjà lent à froid** (9,5 s sur 186 parties, ~49 s sur 1 806). Le tableau A
      **rejoue les mêmes PGN** que la table des configurations : les replayer une seconde fois
      doublerait la note. Une seule relecture sert les deux — c'est la contrainte de conception
      principale de la tranche. Mesurer avant / après et le dire.
- [ ] Le tableau B lit des `Evaluation`s déjà stockées : **aucun temps moteur**, aucune colonne,
      **aucune migration** (ADR-0015).
