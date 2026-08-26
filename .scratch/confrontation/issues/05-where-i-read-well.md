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

## Comments

**FP passée le 2026-08-25** — 7/7 vertes, aucun finding bloquant.

**La réconciliation a été vérifiée à la main, ce qui est le seul test qui compte ici.** À deux
lectures : 5/60, 2/5, 86/172. Poussé à quatre : 9/120, 3/9, 86/312 — somme exacte, **matrice de
confusion comprise, case à case**, et confirmée côté API bit pour bit sur les flottants. C'est la
définition d'ADR-0017 observée plutôt que supposée.

Trois défauts réels trouvés et **corrigés dans la tranche** :

1. **« Sur 1 lectures scellées »** — accord en nombre.
2. **Les arrondis empêchaient l'addition manuelle** que l'écran invite explicitement à faire : deux
   parties à 53 points affichent 107 au bilan (53,455 × 2 = 106,91). Le calcul est exact, c'est
   l'affichage par figure qui arrondit. Corrigé en **le disant** : « les points affichés sont
   arrondis, l'addition se fait sur les valeurs exactes ». Même discipline que les raisons
   d'exclusion — un écart correct doit être **lisible** au lieu de ressembler à un bug. C'est le
   finding le plus important des trois, parce qu'il touchait exactement ce qu'ADR-0017 protège.
3. **Un 500 non gardé sur une `declared_severity` hors domaine** : la colonne est typée, la base ne
   l'est pas. Une sixième valeur indexait une ligne de matrice inexistante, et la levée coûtait au
   joueur **tout son bilan** — une partie illisible emportant toutes les autres, ce que le filtre du
   fold existe précisément pour empêcher. Gardé à la lecture. Non atteignable par l'UI aujourd'hui,
   mais la base est éditable à la main en phase de dev.

**Ce qui a tourné sur quoi** : les étapes 1 à 3 sur la donnée réelle (partie 271), les étapes 4 à 7
sur des **clones fabriqués** sur la copie du testeur — un bilan à une seule lecture ne démontrerait
qu'une tautologie.

**Une observation reportée** : quand aucun `Key moment` n'est posé, la troisième figure **disparaît**
de la confrontation d'une partie. C'est voulu (pas de zéro menteur), mais « les trois figures restent
trois » n'est alors visuellement vrai qu'au niveau du bilan. Terrain d'US-16b-04, non touché ici.
