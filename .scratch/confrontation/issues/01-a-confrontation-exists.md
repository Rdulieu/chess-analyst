Status: `ready-for-agent`

## Parent

`.scratch/confrontation/PRD.md` (US-16b — `BACKLOG.md`, découpée d'US-16 au grilling du 2026-08-24
en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Le tracer bullet de la **`Confrontation`** (`CONTEXT.md`) : de la jointure à l'écran, sur la première
des trois lectures — les `Declared severity` du joueur contre les sévérités mesurées.

- **Une route de confrontation dédiée**, atteinte depuis la page Analyse. Pas depuis la route de
  lecture : celle-ci est **aveugle par nature** et le reste, y montrer le moteur détruirait ce
  qu'elle garantit. Le scellement ouvre cette porte — c'est ce qui fait que sceller sert à quelque
  chose.
- **Deux figures, jamais fondues** : la **couverture** (quelle part des `Counted Move`s du joueur
  porte un verdict) et la **justesse** (sur ceux-là, combien d'accords). Un joueur qui annote trois
  coups et les juge parfaitement a **100 % de justesse et 10 % de couverture**, et les deux sont
  vrais. Le **compte voyage avec le taux**, habitude constante du projet.
- **Aucune nouvelle colonne, aucune migration.** La confrontation est **une jointure** (ADR-0019)
  entre deux relevés déjà servis et déjà testés : le relevé par Move du moteur (sévérité mesurée,
  `Counted Move` avec sa raison, `chancesLost`, le recap) et les marques de l'`Analyse personnelle`.
  Elle est **dérivée** (ADR-0009) : retoucher un seuil la retouche, sans réanalyse.
- **Le fold est un module pur**, sur le modèle exact du recap par partie : ni base, ni moteur, ni
  rendu. C'est **la seule implémentation** de la méthode — la page et le bilan de la tranche 05
  liront celle-là (ADR-0017).
- **Les numérateurs et dénominateurs voyagent non divisés.** La division se fait à la lecture. C'est
  ce qui permettra au bilan d'être une **somme de numérateurs sur une somme de dénominateurs**, et
  non une moyenne de taux qui donnerait le même poids à une partie de trois coups et à une de
  soixante.
- **Deux règles de fold qui ne peuvent pas être différées**, même si leur affichage vient plus tard
  (tranche 03) : le dénominateur porte sur les **seuls `Counted Move`s du joueur**, et **seule la
  couche scellée est confrontée** (les marques postérieures sont exclues de tout calcul). Les
  différer rendrait cette tranche fausse dès sa livraison.
- **`Sound` est notable et c'est tout son intérêt** : la colonne « le moteur n'a rien flagué » est un
  fait, donc `Sound` face à elle est un **accord**. Sans ça, une confrontation ne pourrait exposer
  que les manques du joueur, jamais ses réussites.
- **Le silence reste le silence** : un coup sans verdict entre au dénominateur de la couverture, à
  aucun des deux de la justesse.
- **L'arbitrage laissé ouvert sur la PR #70 est tranché ici**, comme le `BACKLOG.md` le demandait.
  US-16a affiche déjà une « couverture » sur **tous les demi-coups** (ply 0 exclu) — donc les coups
  de l'adversaire compris. La justesse, elle, ne peut porter que sur les coups **du joueur**. Deux
  chiffres côte à côte sur **deux bases différentes**, sous des noms voisins, est exactement le piège
  que la note nommait. Tranché :
  - dans la **`Confrontation`**, la **couverture** est sur les **`Counted Move`s du joueur** — la
    même base que la justesse, sans quoi les deux figures ne se lisent pas ensemble ;
  - le chiffre de la **route de lecture** reste sur tous les demi-coups mais **cesse de s'appeler une
    couverture** : il répond *où j'en suis dans ma saisie*, pas *quelle part de ce sur quoi je suis
    jugé ai-je examinée*. Son cadre s'appelle déjà « Où j'en suis » — le libellé du chiffre suit.
  Un même mot pour deux dénominateurs serait une divergence fabriquée par le vocabulaire.
- **La `Confrontation` est sur une route à elle, pas dans le panneau latéral de la lecture.** Le
  `BACKLOG.md` signale que ce panneau est déjà dense et de format instable (**US-22**), et qu'un bloc
  **apparaissant selon le ply** y aggraverait le reflow. La confrontation n'y ajoute rien : elle est
  ailleurs, et elle ne dépend pas du ply courant.
- **Deux refus nommés**, pas un écran vide ni un 404 générique : lecture **non scellée**, et partie
  **non analysée**. Deux faits métier différents, avec deux suites différentes (sceller / lancer
  l'analyse), donc deux réponses distinctes portant chacune sa phrase.
- **La provenance est portée dès maintenant** — lecture **à l'aveugle** ou **informée**. Une
  comparaison sans provenance n'est pas une comparaison : aucune confrontation ne doit pouvoir
  s'afficher sans son étiquette.
- **Vocabulaire** : un désaccord est une **divergence** — *où regarder*, jamais *qui se trompe*. Le
  mot « erreur » n'est pas employé pour un désaccord joueur/moteur.
- **Aucun score unique**, sous aucun nom.
- Routes scopées au `Profile` par le mécanisme existant, et vérifiant que la partie est bien celle de
  ce `Profile` (ADR-0014). SCSS + tokens existants (ADR-0013), aucun indice purement chromatique.

## Acceptance criteria

- [ ] La confrontation d'une partie s'ouvre depuis sa page Analyse, sur une lecture **scellée** d'une partie **analysée**
- [ ] Une lecture **non scellée** produit un refus nommé, disant qu'il faut sceller
- [ ] Une partie **non analysée** produit un refus nommé, disant comment lancer l'analyse
- [ ] Les deux refus sont distincts l'un de l'autre et d'un 404
- [ ] La **couverture** est affichée avec son compte à côté du taux
- [ ] La **justesse** est affichée avec son compte à côté du taux
- [ ] Les deux ne sont **jamais fondues** en un chiffre, et aucun score unique n'apparaît nulle part
- [ ] Le dénominateur de la couverture est le nombre de **`Counted Move`s du joueur**, pas ses coups ni les demi-coups de la partie
- [ ] Couverture et justesse partagent **la même base** — les `Counted Move`s du joueur — sans partager leur **dénominateur** : la couverture se prend sur tous les coups comptés, la justesse sur les seuls verdicts confrontables. C'est ce que dit l'exemple travaillé du PRD (trois coups jugés parfaitement = 100 % de justesse et 10 % de couverture) ; une base commune est ce qui permet de les lire ensemble, un dénominateur commun les refondrait
- [ ] Le chiffre d'avancement de la route de lecture n'est plus nommé « couverture », et son sens est resté le sien
- [ ] Un coup **sans verdict** n'entre ni au numérateur ni au dénominateur de la justesse
- [ ] `Sound` posé sur un coup que le moteur n'a pas flagué compte comme un **accord**
- [ ] Les marques **postérieures au scellement** n'entrent dans aucun calcul
- [ ] L'étiquette de provenance (**à l'aveugle** / **informée**) est présente sur toute confrontation affichée
- [ ] Le `Search regime` derrière les chiffres du moteur est affiché
- [ ] Le fold est un module **pur**, testable sans base, sans moteur et sans rendu
- [ ] Numérateurs et dénominateurs sont portés **non divisés** par l'enregistrement
- [ ] La route de lecture reste **aveugle**, y compris après scellement — rien du moteur n'y apparaît
- [ ] Aucune migration, aucune colonne nouvelle
- [ ] Les routes sont scopées au `Profile`, et une partie d'un autre `Profile` est introuvable
- [ ] Le mot « erreur » n'est pas employé pour un désaccord joueur/moteur
- [ ] Lisible en thème clair et sombre, aucun indice purement chromatique

### Feature Path (FP)

1. J'ouvre une partie **analysée** dont la lecture n'est pas scellée, et je demande sa confrontation → on me dit que ma lecture n'est pas encore scellée, et ce qu'il faut faire.
2. Je vais sur la lecture, je déclare sur un de mes coups flagués **le verdict qui correspond à la bande que le moteur a mesurée** (`Mistake` s'il mesure une `Mistake`, `Blunder` s'il mesure une `Blunder`), et `Sound` sur un de mes coups qu'il n'a pas flagué. Puis je scelle.
   > La bande **doit être nommée d'après ce qui est mesuré**, sans quoi le pas promet un accord que la conception ne donne pas : la justesse exige l'égalité des bandes, et un `Mistake` déclaré face à une `Blunder` mesurée est une **divergence**. Sur une partie qui n'offre qu'un seul coup flagué, on décrit ce coup-là, on n'en invente pas un autre.
3. Je reviens sur la partie → la porte vers la confrontation est là.
4. J'ouvre la confrontation → je lis **deux figures distinctes**, couverture et justesse, chacune avec son compte ; mes deux verdicts comptent comme des accords.
5. Je cherche un score global → il n'y en a aucun.
6. Je regarde l'étiquette de la confrontation → elle dit si ma lecture était à l'aveugle ou informée.
7. Je retourne sur la route de lecture → **rien du moteur** n'y est apparu, alors même que la partie est analysée et ma lecture scellée.
8. J'ouvre la confrontation d'une partie **non analysée** dont la lecture est scellée → on me dit qu'il n'y a rien à confronter, et comment lancer l'analyse.
9. Je sélectionne un autre `Profile` → la confrontation de la première partie n'y est pas atteignable.

Verify: UI first ; sonder l'API seulement pour la forme des deux refus.

## Blocked by

None - can start immediately.

## Comments

**FP passée le 2026-08-25** — 9/9 étapes vertes, aucun finding bloquant. Sur la partie 271 (la seule
analysée de la base) : couverture 4/30 coups comptés, justesse 1/4 verdicts confrontables, provenance
« Lue informée », régime profondeur 16 / 2 lignes, exactement deux pourcentages sur l'écran. Route de
lecture vérifiée **toujours aveugle** avec un `Niveau de revue` mémorisé sur `Détaillé` — elle ne fait
même pas l'appel aux annotations. Marques postérieures au scellement vérifiées **hors calcul**.
Thèmes clair et sombre audités dans une seule session CDP avec assertion `matchMedia` interne
(contraste min. 6.27 / 7.49), aucun indice purement chromatique.

Deux défauts **de ces documents**, corrigés ci-dessus : l'étape 2 du FP ne nommait pas la bande
mesurée et promettait donc un accord que la conception ne donne pas ; et le critère « même
dénominateur » contredisait l'exemple travaillé du PRD — c'est la **base** qui est commune, pas le
dénominateur.

**Deux questions laissées au demandeur**, ni l'une ni l'autre bloquante :

1. **La porte vers la confrontation est offerte sur une partie scellée mais non analysée**, et mène
   au refus `not-analyzed`. Défendable — le refus explique et donne la suite, et c'est le seul chemin
   d'écran vers ce refus — mais on pourrait la conditionner à l'analyse, ou signaler dans son libellé
   qu'il manque quelque chose. Laissé tel quel : cacher la porte enverrait le joueur découvrir le
   refus par l'URL.
2. **Les refus métier passent par des statuts HTTP d'erreur** (409, 404), donc la console affiche des
   lignes rouges sur un parcours parfaitement nominal. C'est la convention déjà établie par
   `SealRefusal` en US-16a ; changer ici seul créerait une incohérence. À trancher pour les deux
   ensemble ou pas du tout.
