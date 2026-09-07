# 03 — Les deux corpus blitz, et la double passe sur la 51

Status: `done`
Type: AFK
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`, PR **vers elle**.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décisions **D4**, **D5**, **D10**, **D18**, et ADR-0024.

## What to build

La matière première de la revue. **Deux corpus séparés, un par profil, tous en blitz**, ~20 parties
au total.

Deux corpus et non un, parce que mêler deux joueurs de niveaux différents rend ininterprétable tout
ce qui est un **taux** — la part de coups sous le plancher, la part de dérive — dont US-15c a besoin
pour son dénominateur. Le blitz partout, parce que chez Metalyst le vrai facteur confondant n'est pas
le profil mais la **cadence** (5 cadences, dont 23 défaites en correspondance et 5 en bullet : deux
jeux différents). Bénéfice : les deux corpus deviennent **directement comparables entre eux**, donc
un écart se lit comme un écart de joueur et non de cadence.

Stratification par corpus : 3 défaites où la partie bascule tôt (la zone morte que la story vise),
2 défaites serrées, 2 victoires, 1 nulle, 1 partie à dérive majoritaire.

**Deux parties sont obligatoires :**

- La **51** (DudulSmash, chess.com) — la pièce à conviction du dossier chess.com. Attention : elle
  porte `analyzed = 0` et **zéro `Evaluation`**. Les mesures du dossier ont été produites dans une
  base de worktree éphémère, disparue avec lui ; rien dans les cinq `.bak` ni les six worktrees. Il
  faut la ré-analyser.
- La **715** (Metalyst, lichess) — déjà analysée, 110 évaluations, et son bilan lichess est
  **natif** plutôt qu'obtenu en réimportant un PGN.

**Contrainte matérielle** : DudulSmash n'a que **2 nulles**, toutes deux en blitz. La strate
« 1 nulle » est réalisable mais sans marge.

**La double passe sur la 51.** Analyser la même partie **deux fois** sous le même régime et comparer
les récapitulatifs au chiffre près, pour savoir si l'écart 60,6 / 56,5 est réel ou une lecture
croisée de deux rapports produits sur deux bases différentes. Le résultat est **rapporté**, pas
asserté : ADR-0024 a déjà décidé que la reproductibilité exigée est celle du récapitulatif, pas du
moteur, et la décision ne dépend pas de la réponse.

**Une lecture personnelle scellée avant d'avoir vu le moteur.** Celle de la 715 porte
`engine_seen_before_seal = 1` : ses **sévérités déclarées** peuvent être ancrées sur ce que l'app
montrait, donc « l'humain a trouvé ce que l'app manquait » n'y est pas une inférence disponible. Il
faut au moins un jugement humain non contaminé dans le corpus.

Les **bilans lichess** des parties retenues sont saisis à la main : c'est la seule donnée que rien ne
dérive. Ils entrent en fixtures.

Coût : ~1 600 positions ≈ **33 minutes** (mesuré : ~1,25 s/position), dont 7 parties déjà analysées.

## Acceptance criteria

- [ ] Deux corpus constitués, un par profil, **tous en blitz**, ~10 parties chacun.
- [ ] Chaque corpus suit la stratification : 3 défaites basculant tôt, 2 défaites serrées,
      2 victoires, 1 nulle, 1 partie à dérive majoritaire.
- [ ] La **51** et la **715** sont dans le corpus.
- [ ] Toutes les parties des corpus sont analysées sous profondeur 16 / 2 lignes.
- [ ] La 51 est analysée **deux fois** et les deux récapitulatifs sont comparés au chiffre près ;
      l'écart (ou son absence) est **rapporté**, jamais asserté en test.
- [ ] Au moins une lecture personnelle est scellée avec `engine_seen_before_seal` à faux.
- [ ] Les bilans lichess des parties retenues sont saisis et versés en fixtures.
- [ ] La composition des corpus et son **biais** sont écrits noir sur blanc dans le dossier.
- [ ] Le temps moteur consommé est rapporté, jamais asserté.

### Feature Path (FP)

1. Constituer les deux strates blitz → ~20 parties, dont la **51** et la **715**, réparties selon la
   stratification annoncée.
2. Lancer l'analyse sur les parties non encore analysées → toutes ressortent analysées sous
   profondeur 16 / 2 lignes.
3. Analyser la **51** une seconde fois sous le même régime → les deux récapitulatifs sont comparés au
   chiffre près et l'écart est rapporté.
4. Sceller une lecture personnelle **sans avoir consulté le moteur** au préalable → la lecture est
   enregistrée comme non contaminée.
5. Lancer le rapport de la tranche 02 sur les deux corpus → il rend des lignes pour toutes les
   parties.

Verify: l'app d'abord (les parties apparaissent analysées, la lecture est scellée) ; sonder la base
pour confirmer le régime des passes et le drapeau de scellement.

## Blocked by

- [`02-the-replayable-report.md`](02-the-replayable-report.md)
