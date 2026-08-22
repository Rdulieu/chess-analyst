Status: ready-for-agent

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`, sortie de l'EPIC US-15).

Implemented on the business-story integration branch `integration/US-15a-per-game-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

**HITL** : cette tranche contient une **mesure dont la décision peut revenir au demandeur**, et un
**acte destructeur**. Voir « Points d'arrêt humains » plus bas.

## What to build

La **`Best line`** (`CONTEXT.md`) de bout en bout : le moteur la calcule déjà et on la **jette** au
parsing — la garder, la stocker, et la montrer sur la page Analyse pour le Move que le Player regarde.

- **Le driver UCI cesse de jeter les lignes `info`** : la variante y est déjà. Il passe en
  **MultiPV=2**, et rend aussi le **score de la deuxième ligne**.
- **Le stockage** : une `Evaluation` porte désormais la variante **entière**, en **UCI**, telle que le
  moteur la sort — **une seule colonne**, le meilleur coup étant sa **tête** (pas de champ
  `bestmove` séparé qui pourrait divergerde la variante) — plus le **score de la 2e ligne seulement**
  (jamais sa variante), et le **pass qui l'a écrite**.
- **Le `Search regime`** (profondeur, nombre de lignes) est porté par le **pass**, pas répété sur
  chaque ligne. Cela demande la relation qui **manque aujourd'hui** : rien ne relie une `Evaluation`
  au pass qui l'a produite (les identifiants de parties d'un pass sont un tableau JSON).
- **Les `Evaluation`s existantes sont jetées** et la variante devient **requise** — exception nommée à
  ADR-0015, voir la note qui y est ajoutée. Périmètre strict : les `Evaluation`s, **pas la base**
  (profils, parties, PGN, ouvertures, `move_habits` intacts).
- **La reprise vérifie le régime** : une partie dont les `Evaluation`s viennent d'un autre régime est
  **réévaluée entière** plutôt que reprise en cours (une partie ne doit jamais mélanger deux régimes —
  cf. `Search regime` et l'amendement d'`Analysis pass` dans `CONTEXT.md`). Au **même** régime, la
  reprise continue comme aujourd'hui, sans repayer de temps moteur.
- **Le court-circuit `analyzed` est réordonné** : aujourd'hui l'analyse d'une partie sort
  **immédiatement** sur le drapeau, et le job filtre les parties déjà analysées **avant** que quoi que
  ce soit ne regarde le régime — la règle ci-dessus ne pourrait jamais s'appliquer.
- **L'API** expose, par ply, la `Best line` en plus de ce qu'elle rend déjà, ainsi que le
  `Search regime` de la partie.
- **La page Analyse** gagne un **panneau de détail sous la rangée du plateau** (titré), qui montre le
  relevé du **Move sélectionné** : ce qu'il fallait jouer et sa suite, et **comment le coup joué est
  réfuté** — la variante de la Position *après* le coup, qui commence par la meilleure réponse
  adverse. Le **premier coup de chaque ligne est dessiné sur le plateau** (flèche). **Un seul Move à
  la fois.** Pour cette tranche, le panneau est gouverné par le **toggle d'annotations existant** ; le
  `Review mode` arrive en tranche 02.
- **Aperçu au focus** : chaque ply d'une ligne est **focusable**, et le focus (ou le survol, qui n'en
  est que l'affordance pointeur) affiche cette Position sur le plateau, **temporairement**. Calculé en
  rejouant les *k* premiers coups de la ligne depuis la Position affichée : **aucun arbre, aucune
  branche, aucune variante stockée**. La ligne **affichée** est plafonnée (~6 plys, le reste
  atteignable) ; **le stockage ne l'est jamais**.

**Ne pas construire ici** : la navigation dans les variations (jouer la ligne, créer une branche) —
c'est la mécanique centrale d'**US-16**. La `Phase`, `Counted Move`, la dérive et le récapitulatif
arrivent en tranches 03 à 06.

## Acceptance criteria

- [ ] Le driver rend la variante et le score de la deuxième ligne ; l'absence de deuxième ligne quand
      il n'y a **qu'un coup légal** est distinguable d'une absence de donnée.
- [ ] Une `Evaluation` stockée porte la variante entière en UCI, le score de la 2e ligne, et le pass
      qui l'a écrite ; la variante est **requise** par le schéma.
- [ ] Le `Search regime` est écrit sur le pass, et une `Evaluation` peut être ramenée au régime qui l'a
      produite.
- [ ] La migration monte le schéma, retire les anciennes `Evaluation`s, et **laisse intacts** profils,
      parties, PGN, ouvertures et `move_habits`.
- [ ] Une partie dont les `Evaluation`s viennent d'un **autre** régime est réévaluée **entière** ; au
      **même** régime, un pass interrompu **reprend** sans réévaluer ce qui existe.
- [ ] Une partie déjà analysée peut être réanalysée : le drapeau ne court-circuite plus la comparaison
      de régime.
- [ ] L'API rend la `Best line` par ply et le `Search regime` de la partie ; « partie non analysée »
      reste distinct d'un résultat vide.
- [ ] Le panneau montre la ligne du meilleur coup **et** la réfutation du coup joué, pour le Move
      sélectionné, et rien pour un Move sans faute à signaler.
- [ ] Le premier coup de chaque ligne apparaît en **flèche sur le plateau**.
- [ ] Chaque ply d'une ligne est atteignable **au clavier** ; le focus prévisualise, le blur revient.
- [ ] L'aperçu **ne modifie jamais** la position de navigation du Player : readout, barre, teinte de
      case et curseur de la courbe restent sur le Move réellement sélectionné.
- [ ] Le panneau est **sous** la rangée du plateau : rien au-dessus du plateau ne bouge quand on
      change de Move.
- [ ] La ligne affichée est plafonnée, la ligne stockée ne l'est pas.
- [ ] **Mesure rapportée** (et non assertée) : le rapport de coût MultiPV=2 / MultiPV=1 sur ~50
      parties, avec le protocole utilisé.

### Points d'arrêt humains (HITL)

- **La mesure MultiPV** : **< 1,5×** → on garde, la tranche continue seule. **1,5×–2×** → **s'arrêter
  et rendre la mesure au demandeur** ; ce n'est pas un arbitrage d'agent. **> 2×** → la méthode est à
  revoir, remonter avant d'aller plus loin.
- **La suppression des `Evaluation`s existantes** est irréversible et sans sauvegarde : la faire sur
  une **copie** d'abord, et l'annoncer explicitement dans le compte rendu.

### Feature Path (FP)

1. Depuis une partie non encore analysée, le Player demande son analyse → le pass va au bout et le dit.
2. Le Player parcourt la partie jusqu'à un coup signalé comme fautif → le relevé nomme **ce qu'il
   fallait jouer**, et sa suite est lisible.
3. Le même relevé montre **comment le coup joué est puni** → la réponse adverse et sa suite.
4. Le meilleur coup est **visible sur le plateau**, pas seulement en notation.
5. Le Player pointe (ou atteint au clavier) un coup à l'intérieur d'une ligne → le plateau montre
   **cette** position ; il s'en éloigne → le plateau revient à la position du coup qu'il lisait.
6. Le Player avance d'un coup → le relevé suit le nouveau coup, et **rien au-dessus du plateau n'a
   bougé**.
7. Le Player demande l'analyse d'une partie **déjà analysée** → elle est bien réanalysée (le régime
   ayant changé), et non ignorée en silence.

Verify: UI first. Sonder le stockage uniquement pour ce que l'écran ne peut pas montrer (la variante
réellement persistée, le régime porté par le pass).

## Blocked by

None - can start immediately.
