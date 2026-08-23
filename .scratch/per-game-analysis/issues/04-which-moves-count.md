Status: `done` — merged into `integration/US-15a-per-game-analysis` on 2026-08-23 after the
auto-merge gate: build + 492 client / 258 server tests green, **FP 4/5 green, aucune constatation
bloquante**, la 5e étape **non exercée** (voir ci-dessous). La constatation de formulation de la FP
a été corrigée dans la tranche : le marqueur de la liste nomme son motif (« forcé ») au lieu de
« non compté », puisque les deux motifs sont nommés distinctement *partout*.

**À savoir pour la suite — l'étape 3 de la FP est structurellement inatteignable sur le corpus.**
Sept parties choisies exprès (41, 86, 51, 431, 258, 72, 136) ont été analysées : **tous** les coups
forcés ressortent non signalés, et les chutes mesurées disent pourquoi — 67,7→66,6 %, 36,6→36,2 %,
52,9→52,7 %. Quand il n'y a qu'un coup légal, l'`Evaluation` avant et après sont deux lectures de
la **même** recherche : l'écart est du bruit, jamais les 10 % qu'exige un signalement. Le critère
« un coup forcé et signalé est exclu, motif forcé » **repose donc sur les tests unitaires**, et
c'est assumé.

Vérifié en revanche dans l'app réelle : un coup joué à **85,3 %** de chances et signalé `?!`
**compte** (l'asymétrie tient), « forcé » l'emporte sur « déjà décidée » quand les deux
s'appliquent, aucun coup signalé n'est jamais exclu pour « déjà décidée » sur les sept parties, et
une partie perdue tôt avec quatre coups exclus n'affiche **aucun** marqueur.

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

Le **`Counted Move`** (`CONTEXT.md`) : lesquels des Moves du Player **comptent** dans l'analyse, et
quand ils ne comptent pas, **pourquoi**. C'est le dénominateur de tout ce que l'outil conclura, donc
la chose qu'il faut pouvoir vérifier.

Deux motifs d'exclusion, **nommés distinctement partout** — jamais fondus en « non compté » : ils
disent deux choses différentes, et un Player qui ne peut pas les distinguer ne peut auditer ni l'une ni
l'autre.

- **Coup forcé** : il n'y avait **qu'un seul coup légal**. Jouer le seul coup possible ne vaut ni
  mérite ni reproche, et ces coups ne font que **gonfler le dénominateur** — leur part varie selon le
  moment de la partie, donc les taux cessent d'être comparables si on les garde. Détecté **sans
  moteur**.
- **Position déjà décidée** : les chances de gain du Player **avant** le coup étaient **sous le
  plancher `Inaccuracy` (10 %)**. En dessous, la chute maximale possible est plus petite que la plus
  petite chose qu'on signale : la métrique **ne peut structurellement pas** y enregistrer une erreur.
  **Aucun seuil nouveau** — celui-ci est déjà publié dans `CONTEXT.md`.
- **La règle est asymétrique, et c'est le point** : on n'exclut pas une bande autour de l'équilibre. À
  88 % de chances il y a énormément à perdre, et une bande symétrique **supprimerait de l'outil**
  l'incapacité à convertir une position gagnante — une des faiblesses les plus réelles qui soient.
- **Conséquence à connaître, et à respecter dans les tests** : « déjà décidée » **ne peut jamais**
  cacher un Move signalé (signaler demande une chute de 10 %, donc au moins 10 % à perdre) ; les deux
  ensembles sont disjoints par construction. **Seul un coup forcé peut être à la fois signalé et non
  compté** — une unique reprise légale qui se trouve être catastrophique.

Affichage :

- **Dans le panneau**, pour le Move lu : compté, ou non compté **avec son motif en mots**.
- **Dans la liste des coups**, un marqueur **textuel** (avec son propre nom accessible, à côté du
  glyphe de sévérité — le glyphe porte, la teinte ne fait que renforcer) sur les **seuls** Moves qui
  portent une sévérité **et** ne comptent pas. Rien d'autre : dans une partie perdue au coup 25, tous
  les coups suivants sont exclus, et les marquer ferait **dix-huit marqueurs sans aucune surprise** sur
  la surface qui sert à scanner. Ces exclusions-là seront dites **en agrégat** par le récapitulatif
  (tranche 05).

## Acceptance criteria

- [ ] Un Move du Player dont c'était le seul coup légal est **non compté**, motif « forcé ».
- [ ] Un Move joué à moins de 10 % de chances est **non compté**, motif « déjà décidée ».
- [ ] Un Move joué à 88 % de chances **compte** — la règle n'exclut pas les positions gagnantes.
- [ ] Aucun Move signalé n'est jamais exclu pour « déjà décidée » (les ensembles sont disjoints).
- [ ] Un Move **forcé et signalé** est exclu, et son motif est « forcé ».
- [ ] Les Moves de l'adversaire ne sont ni comptés ni marqués : rien n'est dérivé pour eux.
- [ ] Le panneau dit, pour le Move lu, s'il compte et sinon lequel des deux motifs s'applique, **en
      mots**.
- [ ] La liste marque **uniquement** les Moves signalés non comptés, en texte, sans dépendre de la
      couleur.
- [ ] Une partie perdue tôt n'affiche pas une traînée de marqueurs dans sa liste.

### Feature Path (FP)

1. Le Player ouvre, au niveau détaillé, une partie perdue tôt → il sélectionne un de ses coups joués
   bien après l'effondrement → le relevé dit qu'il **ne compte pas**, parce que la partie était déjà
   jouée.
2. Il remonte à un coup joué alors que la partie était encore disputée → le relevé dit qu'il **compte**.
3. Il ouvre une partie où il a joué une reprise obligatoire désastreuse → ce coup est **marqué dans la
   liste** et le relevé explique qu'il ne compte pas **parce qu'il était forcé**.
4. Il parcourt la liste de la partie perdue tôt → elle n'est **pas** couverte de marqueurs : seuls les
   cas surprenants en portent un.
5. Il sélectionne un coup de l'adversaire → rien n'est affirmé sur le fait qu'il compte.

Verify: UI first.

## Blocked by

- `02-review-mode.md`
