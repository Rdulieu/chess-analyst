# PRD — US-21 + US-25 : une seule étape de mise à jour de l'usine

Status: ready-for-agent
Business ref: US-21 et US-25 (`BACKLOG.md`) — deux références gardées, un seul PRD
Integration branch: `integration/US-21-US-25-factory-update`
Grill: complet, 2026-09-04 — ADR-0025, ADR-0026, ADR-0027, ADR-0028, note sur ADR-0020

## Problem Statement

Un agent obéit à ce qu'il lit, et ce qu'il lit décrit un projet qui n'est plus tout à fait
celui-ci. Rien n'est en panne ; c'est plus insidieux qu'une panne.

**La méthode se contredit elle-même.** `agentic-tests` rassure sur une limite de 20 sous-agents
que sa propre section 5.7 fixe à 2. Le gabarit `CLAUDE.md` de `build-factory` a divergé du vrai :
le rejouer **efface le mot `lint` du gate** et perd la section « Dev phase ». `<reviewer to define>`
n'a jamais été renseigné en 62 PR — une instruction que personne ne suit apprend à un agent que la
méthode est indicative.

**La file qui pilote l'autonomie ne pilote rien.** Comptée, elle contient **53 entrées et pas une
seule vraie** : 19 PRD qui n'ont jamais eu à porter un statut de triage, et 34 tickets de features
livrées restés en `ready-for-agent`. La machine à états n'a jamais eu d'état terminal, donc la
pratique en a inventé un hors vocabulaire — et la glose de merge s'est logée dans le champ de statut
faute d'un endroit pour elle.

**Le savoir qui compte n'est pas dans le dépôt.** Une quinzaine de recettes *load-bearing* vivent
dans la mémoire personnelle de l'agent : le worktree obligatoire, les trois symlinks `node_modules`,
la migration `NOT NULL` SQLite, le throttle Lichess par IP, `tsx watch` qui ressuscite un serveur
tué, le plafond de fan-out, la récupération des rapports perdus. La mémoire est indexée **par chemin
de travail**, donc un worktree a **zéro fiche** — et la fiche n°1 est *« worktree avant toute
modification »*. La règle qui envoie l'agent dans le worktree est rangée dans le seul endroit que le
worktree ne peut pas lire. Chaque agent frais repaie chaque piège ; les deux dossiers vides sont
datés d'US-9 et d'US-22.

**Et l'usine a huit mois de retard sur son amont.** Elle vient de
[`Loulen/prompt-driven-software-factory`](https://github.com/Loulen/prompt-driven-software-factory),
installée le 2026-07-20 à l'amont `ea7e4afe`. Depuis, l'amont a renommé tout son vocabulaire,
recomposé ses skills et en a ajouté six — dont deux qui répondent exactement aux manques ci-dessus.
Son installateur, lui, procède par `cp -R` : le rejouer écraserait `agentic-tests`, passée de 78 à
**833 lignes** de terrain payé cher.

## Solution

Une seule étape, sur une seule branche, qui remet l'usine d'accord **avec son amont** et **avec
elle-même** du même geste — parce que le renommage de l'amont *est* la passe de cohérence.

Du point de vue de celui qui travaille dans ce dépôt :

- **La méthode dit vrai.** Le vocabulaire est celui de l'amont (`ticket`, `spec`, `to-spec`,
  `to-tickets`, `surface-first`), appliqué partout, y compris à nos propres lignes.
- **Le développement gagne un rôle et perd du contexte.** `/implement` boucle `tdd`, une revue de
  code **indépendante** et `agentic-tests` jusqu'au gate vert ; `agentic-tests` passe de 833 lignes
  à ~150 plus des annexes chargées à la demande.
- **La file redevient une file**, et c'est vérifiable par une commande.
- **Un agent frais trouve ce qu'il lui faut dans le dépôt**, pas dans une mémoire qu'il n'a pas.
- **La prochaine reprise coûte deux `git diff`**, pas une demi-journée d'archéologie.

Ce que la solution **refuse** explicitement, chaque refus étant écrit et argumenté : rejouer
`install.sh`, réparer `skills-lock.json`, suivre la recommandation de driver de l'amont, rejouer
`/build-factory`, et réparer la mémoire vide d'un worktree.

## User Stories

1. En tant qu'agent frais, je veux que la méthode que je lis décrive le dépôt tel qu'il est, pour
   ne prendre aucune décision que le dépôt contredit.
2. En tant qu'agent, je veux un seul plafond de concurrence dans `agentic-tests`, pour ne pas
   refiger le poste en croyant obéir.
3. En tant qu'agent, je veux que le gate soit énoncé une fois et partout de la même façon — build,
   tests, **lint**, FP verte, aucun finding bloquant — pour ne pas en oublier un quart.
4. En tant qu'agent, je veux trouver la recette du worktree dans le dépôt, pour ne pas devoir la
   connaître avant d'y entrer.
5. En tant qu'agent frais dans un worktree, je veux que les trois symlinks `node_modules` soient
   documentés, pour ne pas rester bloqué sur un `npm install` impossible.
6. En tant qu'agent, je veux les pièges de pilotage de l'app écrits à côté du runner, pour ne pas
   redécouvrir que `tsx watch` ressuscite un serveur tué ou que l'émulation de thème échoue dans
   les deux sens.
7. En tant qu'agent, je veux les règles d'orchestration séparées du journal daté qui les a
   produites, pour lire une règle sans lire son histoire.
8. En tant qu'agent, je veux que le mécanisme d'auto-audit de l'orchestration survive intact, parce
   que ses défauts sont d'application et non de conception.
9. En tant que demandeur, je veux que la file `ready-for-agent` ne contienne que des tickets
   réellement ouverts, pour qu'elle puisse à nouveau piloter l'autonomie.
10. En tant que demandeur, je veux qu'un ticket livré dise **quand**, **par quelle PR** et **avec
    quel résultat de gate**, pour pouvoir auditer une auto-fusion après coup.
11. En tant que demandeur, je veux que `done` reste le mot que je lis, parce qu'il me convient — et
    qu'il cesse d'être un rôle de triage clandestin.
12. En tant que demandeur, je veux qu'un PRD cesse de porter un statut de triage, parce qu'une spec
    n'est pas un élément de travail.
13. En tant que demandeur, je veux savoir en une commande si l'amont a bougé, pour décider d'une
    reprise au lieu de l'improviser.
14. En tant que demandeur, je veux savoir en une commande ce que **nous** avons changé par rapport à
    l'amont, pour ne jamais reperdre nos personnalisations.
15. En tant que demandeur, je veux que rien de local ne soit écrasé par la reprise, et je veux
    pouvoir le **vérifier** plutôt que me le faire promettre.
16. En tant que développeur, je veux `/implement` comme entrée unique d'une tranche, pour que la
    boucle des trois rôles cesse d'être un paragraphe de prose que chaque agent interprète.
17. En tant que développeur, je veux une revue de code indépendante sur l'axe **Spec**, pour qu'un
    écart au ticket soit vu avant qu'une passe agentique complète ne le découvre.
18. En tant que développeur, je veux `/verify-factory` rejouable, pour contrôler le câblage de
    l'usine sans relire la méthode.
19. En tant que développeur, je veux que `/verify-factory` dise « non vérifié » hors ligne plutôt
    que rouge, pour qu'un contrôle qui ne peut pas tourner ne mente pas.
20. En tant que développeur, je veux que `/build-factory` ne se rejoue pas ici, pour qu'aucun geste
    ne puisse régresser la méthode.
21. En tant que développeur, je veux savoir dans quel sens coulent les seeds et `docs/agents/`, pour
    qu'une duplication cesse d'être une ambiguïté.
22. En tant que développeur, je veux que les branches d'intégration mergées disparaissent, pour ne
    pas repiquer du travail sur une branche déjà fermée.
23. En tant que développeur, je veux que le vocabulaire retiré soit absent hors archives, et qu'une
    commande me le dise.
24. En tant que développeur, je veux que les PRD livrés et les `.scratch/` clos gardent leurs mots
    d'époque, pour qu'une archive ne devienne pas un faux.
25. En tant que développeur, je veux que `agentic-tests` ne charge pas 833 lignes à chaque FP, pour
    que chaque passe coûte moins de contexte.
26. En tant que développeur, je veux que `SCENARIO-FORMAT.md` décrive les scénarios réels, pour ne
    pas écrire le prochain au mauvais format.
27. En tant que développeur, je veux que `agentic-tests` parle de **surface primaire** plutôt que
    d'UI, et qu'il dise ensuite que la nôtre est l'UI pilotée par notre bibliothèque CDP.
28. En tant que développeur, je veux qu'`ADR-0020` porte la trace que la recommandation de driver de
    l'amont a été **lue** et refusée, pas ignorée.
29. En tant que développeur, je veux que `skills-lock.json` disparaisse, parce qu'un lock qui ment
    est pire qu'un lock absent.
30. En tant que développeur, je veux que le ref de reprise soit écrit en clair et versionné, pour
    que la base de la prochaine fusion soit un fait et non une reconstitution.
31. En tant que contributeur extérieur, je veux que le savoir critique soit versionné et relu, pour
    ne pas dépendre de la mémoire personnelle d'un agent sur une machine.
32. En tant qu'agent en AFK, je veux savoir que je choisis mes seams et que je dois les déclarer,
    pour ne pas attendre une confirmation qui ne viendra pas.
33. En tant que relecteur, je veux lire les seams choisis dans la PR, pour juger si les tests sont
    là où le ticket les demandait.
34. En tant que demandeur, je veux qu'une recette rapatriée quitte la mémoire, pour ne pas créer une
    troisième source de vérité.
35. En tant que demandeur, je veux que la story se prouve par un agent réellement amnésique, pour
    que « la méthode se suffit » soit un constat et non une intention.

## Implementation Decisions

### La reprise — ADR-0025

- **Fusion à trois points, base prouvée.** L'install du 2026-07-20 correspond à l'amont `ea7e4afe`.
  **Six des huit skills sont octet pour octet cette base** ; seules `agentic-tests` (78 → 833) et
  `git-flow` (43 → 82) portent du travail local. La fusion à la main ne concerne donc que deux
  fichiers, et la preuve « rien de local n'a été perdu » se fait ligne à ligne.
- **Deux passes, jamais mélangées.** *Structure* : git fusionne les hunks. *Vocabulaire* : table de
  correspondance appliquée à tout le dépôt. La seconde n'est pas du rangement — git fusionne des
  **hunks**, et le renommage de l'amont porte sur des lignes qui chez nous ont été remplacées ou
  n'existent pas. Structure seule = fichier **à moitié renommé**.
- **`install.sh` n'est jamais rejoué** (`cp -R`, aucune comparaison, aucune fusion).
- **`skills-lock.json` est supprimé.** Ses hachages ne sont pas reproductibles : `tdd` n'a jamais
  été touché ici et son sha256 (`85ac12…`) est exactement l'amont à `ea7e4afe`, quand le lock
  annonce `8986a0…`.
- **Six skills neuves adoptées** — `implement`, `verify-factory`, `code-review`, `codebase-design`,
  `clean-context`, `to-us` — parce que la nouvelle usine est *composée* : le nouveau
  `grill-with-docs` est une coquille de 20 lignes appelant `grilling` + `domain-modeling`, le
  nouveau `tdd` appelle `codebase-design` et `code-review`, `implement` orchestre les trois.
- **`code-review` de l'amont ombrage l'intégrée de Claude Code**, sciemment, documenté.
- **Table de correspondance du vocabulaire** (au minimum) : `issue`→`ticket`,
  `sub-issue`→`sub-ticket`, `PRD`→`spec`, `/to-prd`→`/to-spec`, `/to-issues`→`/to-tickets`,
  `UI-first`→`surface-first`, `issue-ref`→`ticket-ref`.

### La veille — comment on saura la prochaine fois

- Remote `upstream` ajouté avec `-t main --no-tags` (le dépôt amont pèse 1,1 Mo contre nos 59 Mo de
  `.git`, et `git branch -r` fait déjà 55 lignes — on ne l'alourdit pas).
- **`.claude/UPSTREAM.md`**, versionné, en clair : le dépôt, le ref de reprise, la date, et **ce qui
  a été refusé** (l'installateur, le driver Playwright, le lock).
- Les deux questions deviennent deux commandes :
  `git diff <ref> upstream/main -- skills/` et `git diff <ref>:skills .claude/skills`.
- **Aucun `git subtree`** : `skills/` est un sous-répertoire chez l'amont et `.claude/skills/` chez
  nous, donc il faudrait une branche filtrée — de la machinerie pour remplacer deux `git diff`. Et
  subtree *fusionne*, or la fusion mécanique ne suffit jamais ici.

### `CLAUDE.md`, `build-factory` et les seeds

- **`/build-factory` ne se rejoue pas dans ce dépôt.** C'est un outil d'amorçage, ce dépôt est
  amorcé, et le rejouer est le geste qui détruit du travail. `/verify-factory` prend le rôle
  rejouable — partage que **l'amont lui-même vient d'opérer**.
- **`docs/agents/*.md` est la source de vérité de ce dépôt** ; les seeds `build-factory/*.md` sont
  des gabarits pour un dépôt neuf, **jamais lus ici**. Le sens d'écoulement est déclaré une fois :
  seed → dépôt, à l'amorçage, jamais après.
- **Garde-fou non négociable** : `CLAUDE.md` garde **`lint`** dans le gate (le gabarit amont l'a
  perdu) et garde sa section **« Dev phase »** (absente du gabarit). Le texte amont enrichit le
  nôtre, jamais ne l'ampute.
- `CLAUDE.md` adopte `/implement` comme entrée d'une tranche, et `surface-first`.
- **`<reviewer to define>` est supprimé**, pas rempli : un dépôt à un seul humain n'a personne à
  assigner, et la règle vraie (« l'agent ouvre la PR et donne le lien ») est déjà écrite.
- La section **`Cleanup`** de l'amont est prise : `git branch --merged develop` renvoie déjà **9**
  branches mergées et vivantes.

### La file et le vocabulaire de livraison — ADR-0026

- **`done` est un état de livraison**, pas un sixième rôle de triage. Les cinq rôles canoniques et
  `triage-labels.md` restent **intacts** : c'est le point de contact avec l'amont.
- **La file = tickets portant `ready-for-agent` et pas `done`.** Les PRD en sont exclus **par
  définition** (une spec n'est pas un élément de travail) : −19 sans toucher un fichier.
- **Les 34 tickets périmés sont corrigés une fois** : un mot dans un champ de statut, sur des
  fichiers dont la livraison est prouvée par le backlog. **Aucune coordonnée de livraison n'est
  fabriquée** — le rétroactif reste nommé, pas repayé.
- **Prospectif** : un `done` neuf porte date, PR ou commit de merge, **et résultat du gate**. C'est
  ce qui rend le portail d'auto-fusion auditable après coup (§2.3 de l'audit).
- Une **feature est close** quand tous ses tickets portent `done` (§2.6).

### Le savoir rapatrié — ADR-0028

- Rangé **par la skill qui en a besoin**, jamais dans un fichier « astuces » central : le critère est
  *« un agent le lit sans le chercher »*.
  - `git-flow/WORKTREES.md` — worktree obligatoire, les trois symlinks, le piège du slash de
    `.gitignore` (PR #57).
  - `agentic-tests/DRIVING.md` — `tsx watch`, CDP + puppeteer, `API_TARGET`/`PORT`, l'émulation de
    thème qui échoue **dans les deux sens**, la copie WAL (`cp` corrompt là où `.backup` marche).
  - `agentic-tests/ORCHESTRATION.md` — plafond de fan-out, rapports perdus et leur récupération,
    gel des sous-agents, coût lu dans les transcripts. **Ce rangement est la piste 2 d'US-21** : §5
    fait 686 des 833 lignes, et le fichier se décrit lui-même comme *« a dated audit log »*.
  - Les recettes de plateforme (throttle Lichess par IP, `/game/export/{id}`) relèvent d'ADR-0018 ;
    la migration `NOT NULL` SQLite relève d'ADR-0015.
- **Le mécanisme d'auto-audit (§5.6) part intact** : ses défauts sont d'application, pas de
  conception.
- **Une recette rapatriée quitte la mémoire**, ou sa fiche devient un pointeur — sinon, troisième
  source de vérité.
- **La mémoire vide d'un worktree n'est pas réparée** : c'est le signal, et il devient l'épreuve. Le
  *mécanisme* de worktree, lui, part en **US-39**.

### Le driver — note sur ADR-0020

L'amont recommande le **Playwright CLI**. On prend le concept `surface-first` et la phrase qui situe
l'apex (« au-dessus des tests end-to-end : la passe de QA, faite par un agent »), on **garde notre
bibliothèque CDP**, et la table des drivers est conservée comme table générique puis **instanciée**
pour ce dépôt. **US-38** est ouverte pour mesurer l'échange au lieu d'en débattre.

### Les seams en AFK — ADR-0027

En AFK, l'agent **choisit ses seams et les déclare** ; la déclaration remonte dans la PR. Un seam
choisi et non déclaré est un finding de revue.

## Testing Decisions

**Cette story n'a aucun seam de code.** Rien sous `src/` ne bouge : les tiers unitaire, composant et
intégration ne voient rien passer, et le build, les tests et le lint du projet doivent rester verts
**sans avoir été retouchés** — c'est leur rôle ici : détecter qu'on a cassé l'app en croyant ne
toucher que la méthode.

Un bon test, ici comme ailleurs, observe un **comportement externe** : ce qu'une commande répond, pas
comment un fichier est rédigé. « Le paragraphe est bien écrit » n'est pas testable ; « le grep
renvoie zéro » l'est.

**Le seam le plus haut est `/verify-factory`, et c'est une décision.** Les contrôles de la story n'y
sont pas écrits en jetable dans chaque FP : ils deviennent des **sondes permanentes**, et la FP d'une
tranche se contente d'appeler la sonde. Les critères de succès cessent d'être une liste dans un PRD
et deviennent un outil qui survit à la story — ce qui *est* la piste 1 d'US-21 (« faire de l'hygiène
ce qu'on peut mécaniser »).

Les quatre sondes :

1. **Reprise terminée** — `git diff <ref-de-reprise> upstream/main -- skills/` est vide. Hors ligne :
   « non vérifié », jamais rouge.
2. **Vocabulaire** — `grep -E 'to-prd|to-issues|sub-issue|PRD|UI-first'` hors `.scratch/` et hors
   `docs/factory-coherence-audit-2026-08-24.md` renvoie zéro.
3. **File exacte** — tickets `ready-for-agent` sans `done`, PRD exclus, égale les tickets réellement
   ouverts.
4. **Avance de l'amont** — « l'amont a N commits d'avance sur le ref enregistré ».

**Prior art** : `docs/test-scenarios/tools` et la bibliothèque de driver d'ADR-0020 pour les
helpers qui pilotent et ne jugent jamais ; `path-0-bootstrap.md` pour un scénario qui n'est pas un
parcours utilisateur mais un prérequis.

**Place dans la pyramide.** Apex uniquement.

- **FP par tranche** — critères d'acceptation exécutables, gate d'auto-fusion. Pour les tranches de
  cette story, une FP consiste le plus souvent à **rejouer la sonde** et à vérifier qu'une tranche du
  dépôt se comporte comme la méthode le dit désormais.
- **Suite HP inchangée** — les trois HP portent la valeur métier de l'app, que cette story ne touche
  pas. Elle tourne au prérequis de la PR `integration → develop`, comme d'habitude, pour prouver que
  la méthode a bougé sans que l'app bouge.
- **L'épreuve de l'agent frais** — un sous-agent dans un **worktree neuf**, donc sans mémoire par
  construction, fait une tranche réelle. S'il trouve le worktree, les symlinks, le driver, le plafond
  et le gate sans qu'on lui dise rien, la méthode se suffit ; sinon, il **nomme** la recette qui
  manque. **Prérequis de la PR `integration → develop`**, à côté de la suite HP — pas un quatrième HP
  (le plafond est à 3, et ce n'est pas un parcours utilisateur).

## Out of Scope

- **Réparer la mémoire vide d'un worktree** — ADR-0028. Elle est le signal et l'épreuve.
- **Le mécanisme de worktree lui-même** (emplacement déclaré vs réel, dépendances, destruction) —
  **US-39**.
- **Migrer vers le Playwright CLI**, et même le comparer — **US-38** produit la mesure ; migrer, s'il
  faut migrer, sera encore une autre story.
- **Réécrire les PRD livrés et les `.scratch/` clos.** Ce sont des documents datés ; les traduire
  dans un vocabulaire qui n'existait pas quand ils ont été écrits fabrique un faux. Seul le **champ
  de statut** des 34 tickets périmés bouge.
- **Fabriquer les coordonnées de livraison des `done` anciens** : 23 tickets ne les portent nulle
  part, les reconstituer est une enquête qui écrirait des dates devinées dans des archives.
- **Décider de la valeur du plafond de concurrence.** Corriger la contradiction documentaire est de
  l'hygiène et revient ici ; la valeur appartient à US-18/US-20.
- **Le disclaimer IA de `triage`** — laissé intact : diverger sur trois lignes coûte plus que
  l'inconvénient.
- **La colonne `Covers` du README HP** — l'audit a vieilli : le README déclare désormais le
  frontmatter `covers:` comme source de vérité. Une duplication déclarée dérivée n'est pas une
  incohérence.
- **Réparer le gabarit `CLAUDE.md` de `build-factory`.** §1.4 ne se répare pas, il se dissout : le
  gabarit n'est plus pour nous. Conséquence acceptée : régénérer l'usine de zéro ici demanderait un
  geste manuel.

## Further Notes

**Le coût, nommé d'avance.** `/implement` insère un **rôle de revue indépendant** dans chaque boucle :
on paie **au ticket**, là où le reste de la reprise se paie une fois. En face, `agentic-tests` passe
de 833 lignes à ~150 plus des annexes — du contexte économisé à **chaque** invocation, FP comprise —,
`verify-factory` remplace des vérifications faites à la main une fois sur trois, et `Cleanup` fait
disparaître 9 branches mortes. **La reprise allège le contexte et alourdit la boucle.** L'échange se
mesure sur les prochaines tranches, en même temps qu'ADR-0027 : les seams qu'un agent choisit seul
dérivent-ils large, et la revue le voit-elle ?

**L'audit du 2026-08-24 a lui-même vieilli**, et il faut le lire en le sachant : la contradiction
« 20 vs 2 » a rétréci en simple caution périmée, la colonne `Covers` s'est réparée seule, et une
bonne partie de §1.6 (l'outillage qui vise GitHub) tombe gratuitement parce que l'amont est devenu
backend-agnostique. En sens inverse, la dette de savoir a **quadruplé** — quatre recettes hors du
dépôt à l'époque, une quinzaine aujourd'hui. Le relevé reste la meilleure porte d'entrée, à condition
de re-mesurer avant d'agir.

**Ordre des tranches.** US-25 posait qu'US-21 devait passer d'abord, à cause du gabarit `CLAUDE.md`
qui régresse la méthode. La contrainte tombe : le gabarit est retiré du dépôt (décision ci-dessus),
donc le risque disparaît par décision plutôt que par séquencement. L'ordre qui reste est celui du
sens : **la veille d'abord** (elle rend la fusion mesurable), la structure, le vocabulaire, puis le
rangement du savoir, puis la file, puis l'épreuve.

**Une réserve consignée.** Une partie du chantier est de la **suppression** — `skills-lock.json`,
`<reviewer to define>`, le gabarit rejouable, 686 lignes déplacées. Le risque est de jeter un
garde-fou qu'on croyait mort. L'audit liste explicitement ce qui tient bien (§4) : à lire avant de
couper.
