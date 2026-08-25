Status: `ready-for-agent`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

La sortie de la story côté produit : **le bilan sur tout l'historique**, et son entrée de `Nav`.
C'est ce pour quoi US-16b existe — « où je lis bien et où je lis mal » est une affirmation sur des
**dizaines** de lectures, jamais sur une.

- **Le bilan est la somme des confrontations par partie** (ADR-0017). Pas une requête à lui,
  **jamais** : deux implémentations d'une méthode ne s'accordent que par chance, et le lecteur n'a
  aucun moyen de savoir laquelle a tort. C'est aussi ce qui rend l'avis **vérifiable** — le joueur
  peut ouvrir une partie qu'il connaît et voir comment le chiffre global est arrivé.
- **La réconciliation est la définition, pas un test qu'on espère vert** : elle est **assertée** sur
  un jeu de parties.
- **Somme des numérateurs sur somme des dénominateurs**, pas moyenne de taux — sinon une lecture de
  trois coups pèse autant qu'une de soixante.
- **Les trois figures restent trois.** Aucun composite, à aucun niveau. Leur désaccord reste le
  diagnostic.
- **Ne comptent que les lectures scellées de parties analysées.** Une lecture non scellée n'a rien à
  confronter, et le bilan doit dire **sur combien de lectures** il repose : trois lectures ne sont
  pas une tendance, et c'est au joueur d'en juger.
- **La provenance est comptée, pas utilisée pour découper** : combien de ces lectures étaient à
  l'aveugle, combien informées. Deux jeux de trois figures sur un échantillon de cette taille
  diraient moins que les comptes à côté d'un seul jeu.
- **Aucun axe en v1**, et c'est une **retenue délibérée**, pas un oubli. Une `Analyse personnelle`
  s'écrit à la main : l'échantillon est de quelques dizaines de parties là où les agrégats de jeu en
  ont des milliers. **`Phase` est l'axe qui méritera sa place le premier** — « je lis bien les
  milieux de partie et mal les finales » est actionnable — mais il est **exclu tant que la détection
  des phases n'est pas fiable** (terrain d'US-15a-bis), décision explicite du demandeur. `Opening`
  (échantillon nul) et `Time control category` (confond jouer et analyser : une partie est lue à
  froid, longtemps après l'horloge) ne sont **pas candidats**.
- **Entrée de `Nav`** : ce n'est pas un écran caché. Cloisonné par `Profile` (ADR-0014), et un
  `Profile` sans aucune lecture scellée a **son propre écran** — pas un bilan à zéro, qui mentirait.
- **La circularité de la méthode est dite dans le produit**, pas seulement dans les docs : juger
  *notre* analyse par l'accord joueur/moteur supposerait le joueur juste, ce qui est exactement ce
  qui n'est pas établi. Un désaccord dit **où regarder**, jamais **qui se trompe**.

## Acceptance criteria

- [ ] Le bilan est atteignable depuis la `Nav`
- [ ] Il affiche les **trois figures** — couverture, justesse, part des dégâts trouvée — séparées, chacune avec ses comptes
- [ ] Aucun score composite n'apparaît
- [ ] Il est calculé comme la **somme** des confrontations par partie, sans requête d'agrégat distincte
- [ ] Un test asserte que le bilan égale la somme des confrontations des parties qu'il couvre
- [ ] Les taux sont des sommes de numérateurs sur des sommes de dénominateurs, jamais des moyennes de taux
- [ ] Seules les lectures **scellées** de parties **analysées** entrent dans le bilan
- [ ] Le **nombre de lectures** sur lequel il repose est affiché
- [ ] Le compte de lectures **à l'aveugle** et **informées** est affiché
- [ ] Le bilan n'est découpé par **aucun axe**
- [ ] Le bilan est cloisonné par `Profile`
- [ ] Un `Profile` sans lecture scellée voit un écran qui le dit, pas un bilan à zéro
- [ ] Un dénominateur nul donne **pas de score**, jamais un zéro, à ce niveau comme au niveau d'une partie
- [ ] La limite de la méthode (divergence, pas verdict sur qui se trompe) est dite à l'écran
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique

### Feature Path (FP)

1. J'ouvre la `Nav` → l'entrée vers mon bilan de lecture est là.
2. J'ouvre le bilan avec **une seule** lecture scellée → les trois figures sont là, séparées, et l'écran dit qu'il repose sur une lecture.
3. Je note les trois figures, puis j'ouvre la confrontation de cette partie → elles y sont identiques.
4. Je scelle la lecture d'une **deuxième** partie, puis je reviens au bilan → il repose maintenant sur deux lectures, et ses figures sont bien la somme des deux confrontations.
5. Je regarde la provenance → l'écran dit combien de mes lectures étaient à l'aveugle et combien informées.
6. Je cherche un score global, ou un découpage par ouverture, par phase ou par cadence → il n'y en a aucun.
7. Je bascule sur un `Profile` sans aucune lecture scellée → un écran qui le dit, et non un bilan à zéro.

Verify: UI first ; la réconciliation par partie s'observe en comparant les deux écrans.

## Blocked by

- `.scratch/confrontation/issues/02-how-i-get-it-wrong.md`
- `.scratch/confrontation/issues/03-shown-without-being-scored.md`
- `.scratch/confrontation/issues/04-where-i-looked.md`
