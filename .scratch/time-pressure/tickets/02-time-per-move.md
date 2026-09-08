# 02 — Le temps par coup dans le relevé

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure` : brancher depuis
elle et fusionner dans elle, **pas** dans `develop`. Spec : `.scratch/time-pressure/SPEC.md`.
ADR-0029.

**What to build:** pour **chaque demi-coup**, le relevé de la page Analyse donne deux chiffres :
**combien de temps le camp a mis** (`Time spent`) et **combien il lui restait** (`Clock`). Le
premier est ce que le joueur a fait, le second est la pression sous laquelle il l'a fait — et
l'axe **mis en avant est le temps passé**.

C'est la tranche qui livre de la valeur **sans aucun rafraîchissement** : les **1983** parties
chess.com portent déjà un `[%clk]` à chaque demi-coup, et rien ne le lit aujourd'hui.

Le temps voyage dans un **bloc à part** du payload de `/api/games/:id/annotations`, rempli depuis le
PGN **quelle que soit la valeur d'`analyzed`**. C'est structurant : `rapid` n'a **aucune** partie
analysée, et ce payload rend aujourd'hui `plies: []` et `recap: null` dans ce cas. `GameRecap` garde
donc exactement le sens qu'ADR-0017 lui donne, et `analyzed` continue de ne parler que du moteur.

**Blocked by:** 01 — la cadence exacte (l'incrément en vient, et sans lui le temps passé est faux).

**Status:** ready-for-agent

- [ ] Le `Clock` de chaque demi-coup est lu depuis le commentaire `[%clk]` du PGN.
- [ ] L'extraction est une **extraction de jeton** : un commentaire lichess porte plusieurs jetons
      (`"[%eval 0.18] [%clk 0:03:00]"`) et l'horloge en est tirée sans casser sur les autres.
- [ ] Le `Time spent` est **dérivé**, jamais stocké : `Clock` précédent − `Clock` courant +
      incrément.
- [ ] Le `Time spent` du **premier coup** de chaque camp est calculé depuis la cadence
      (`initial + incrément − Clock₁`) : la première ligne n'est pas un trou.
- [ ] Les coups de **l'adversaire** portent aussi leurs deux chiffres.
- [ ] Tout est calculé en **entiers de centisecondes** ; aucun flottant de secondes ne circule.
- [ ] Une partie **en correspondance** ne rapporte **aucun** `Clock` ni `Time spent`, et l'écran le
      dit **« sans objet »** — jamais un blanc, **jamais un zéro**.
- [ ] Cette absence **ne passe pas** par `UncountedReason`, qui garde ses deux valeurs.
- [ ] Une partie **non analysée** porte quand même ses temps dans le payload et à l'écran.
- [ ] Affichage : **une décimale** là où la source porte des dixièmes (chess.com), **seconde
      entière** sur lichess, dont le PGN arrondit à la seconde — une décimale y affirmerait une
      précision qui n'existe pas (±1 s sur une différence).
- [ ] Rien ne change dans ce que l'analyse **compte** : `Counted Move`, bandes de sévérité et
      plancher du dénominateur sont identiques au point près.
- [ ] Aucun indice **uniquement chromatique**.
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, FP verte, aucun
      finding bloquant.

### Feature Path (FP)

1. Ouvrir une partie **chess.com de blitz analysée** → chaque coup du relevé porte le temps mis
   **et** le temps restant, le temps mis étant celui mis en avant.
2. Vérifier un coup à la main : temps restant du coup précédent moins temps restant de celui-ci,
   plus l'incrément → le temps mis affiché.
3. Ouvrir une partie **chess.com non analysée** → les temps sont là **quand même**, alors que le
   relevé du moteur est vide.
4. Ouvrir une partie **en correspondance** → le temps se lit **« sans objet »**, et aucun `0` ne
   s'affiche.
5. Revenir sur une partie analysée → les verdicts de coups et le récapitulatif existant sont
   **inchangés**.

Verify: par la page Analyse dans le navigateur.
