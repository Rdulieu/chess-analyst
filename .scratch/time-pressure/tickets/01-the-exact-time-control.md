# 01 — La cadence exacte, de bout en bout

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure` : brancher depuis
elle et fusionner dans elle, **pas** dans `develop`. Spec : `.scratch/time-pressure/SPEC.md`.
Décisions et faits mesurés : `.scratch/time-pressure/GRILL-NOTES.md`. ADR-0029.

**What to build:** la page Analyse nomme la **cadence exacte** d'une partie à côté de sa catégorie —
`3+2` plutôt que seulement `blitz`, `2 jours par coup` pour une correspondance. Le `Player` peut
enfin distinguer deux parties que la catégorie confond.

La cadence se lit dans l'en-tête `[TimeControl]` du PGN déjà stocké (ADR-0029 : **aucune colonne**),
et les **quatre orthographes** des deux plateformes passent par **une seule fonction nommée**,
appelée depuis chaque point d'entrée : chess.com dit `300`, `180+2`, `1/86400` ; lichess dit
`300+0`, `600+5`, `1 day per move`, `2 days per move`.

La dérivation est **côté serveur**, pas client, bien que le client ait déjà le PGN : US-15c pliera
ces chiffres sur tout le corpus côté serveur, et ADR-0017 interdit deux implémentations d'une même
méthode.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Les **quatre** orthographes se traduisent vers une seule forme : temps réel (budget initial +
      incrément) ou jours par coup.
- [ ] `300` (sans `+`) donne un incrément de **zéro**, pas une absence d'incrément.
- [ ] `1/86400` (chess.com) et `1 day per move` (lichess) donnent **le même** résultat : ce sont deux
      orthographes d'un fait identique.
- [ ] `1/259200` donne **3 jours par coup** ; `2 days per move` en donne 2.
- [ ] Une partie dont le PGN n'a **pas** d'en-tête `[TimeControl]` ne fait échouer ni la page ni
      l'API : la cadence est absente et se lit comme absente, jamais comme un zéro.
- [ ] La traduction vit dans **une** fonction dédiée nommée, appelée depuis chaque point d'entrée —
      aucune deuxième implémentation, même partielle, ailleurs.
- [ ] La page Analyse affiche la cadence exacte **à côté** de la `Time control category`, sans la
      remplacer : les deux disent des choses différentes.
- [ ] Aucun indice **uniquement chromatique** (garde-fou du projet).
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, FP verte, aucun
      finding bloquant.

### Feature Path (FP)

1. Ouvrir une partie **chess.com de blitz** sur la page Analyse → l'en-tête donne la cadence exacte
   (par exemple `3+2`) **à côté** de `blitz`.
2. Ouvrir une partie **en correspondance** → l'en-tête donne les **jours par coup**, et ne prétend à
   aucune horloge.
3. Ouvrir une partie **lichess** → l'en-tête donne sa cadence exacte, dans la même forme que celle
   d'une partie chess.com, malgré l'orthographe différente de la plateforme.

Verify: par la page Analyse dans le navigateur. Ne sonder la base que si l'écran ne suffit pas à
départager deux orthographes.
