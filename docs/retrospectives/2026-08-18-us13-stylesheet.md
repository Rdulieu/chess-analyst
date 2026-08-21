# Rétrospective — US-13, la feuille de style

Session du 2026-08-17/18. Six slices implémentées en sessions dédiées et auto-mergées, puis quatre
rondes de corrections nées de la relecture à l'écran par le demandeur, puis merge dans `develop`
(PR #44, 42 commits).

**Ce document ne juge pas le résultat, qui est livré et vérifié.** Il rend compte des problèmes
rencontrés et de ce qui les aurait évités. Les options vont de la plus douce à la plus radicale, sans
en écarter aucune : c'est au demandeur d'arbitrer, pas à ce document.

## Chiffres de la story

| | |
|---|---|
| Slices planifiées | 6 (`.scratch/stylesheet/issues/01`→`06`) |
| PR fusionnées dans l'intégration | 10 (#37→#43, #45, #46, #47, #48) |
| Dont **rondes de correction non planifiées** | **4** (#46, #47, #48, plus #45 la re-vérification) |
| Tests client | 185 → 370 |
| Tests serveur | 144, inchangés (aucun changement serveur, conforme au périmètre) |
| Constats versés au backlog technique | 2, en `needs-triage` |

Les quatre rondes de correction représentent environ un tiers du travail total de la story. Elles sont
le sujet de cette rétrospective.

---

## 1. Le goût n'a été confronté à l'écran qu'après six slices mergées

**C'est le problème dominant : les cinq suivants en sont des déclinaisons.**

Les six slices sont passées par build + tests + Feature Path agentique, chacune verte, chacune
auto-mergée selon le flow. La première ouverture de l'application par le demandeur a produit quatre
remarques, dont **deux défauts francs** :

- `/openings` avait perdu ses cinq colonnes de chiffres. Six colonnes en `nowrap`, dont un nom
  d'ouverture de 82 caractères, rendaient le tableau bien plus large que la colonne de lecture : le
  conteneur défilait et `Parties`, `Résultats`, `Win rate` sortaient du cadre. Le joueur voyait une
  colonne de noms et une teinte rouge sans rien pour l'expliquer.
- La liste des coups était inatteignable, empilée sous toute la hauteur du plateau, démarrant sous la
  ligne de flottaison.

Puis trois rondes supplémentaires sur les proportions : plateau à 24 % contre 76 % au graphique, puis
plateau trop grand pour être vu entier, puis en-tête trop haute et espaces doublés.

**Cause.** Le pilote validé avant les slices couvrait **deux écrans** et jugeait **la palette**. Il ne
jugeait ni la densité, ni les proportions, ni la hauteur utile, ni le comportement du contenu réel.
Le grilling avait pourtant identifié la bonne idée — « le goût ne doit pas se juger derrière un
merge » — et l'avait appliquée trop étroitement.

### Options

- **Une capture par écran, jointe au rapport de chaque slice.** Coût quasi nul : l'agent en produit
  déjà pour lui-même. Aurait attrapé `/openings` immédiatement, au moment où c'était une ligne de CSS.
- **Faire du pilote une maquette des six écrans, avec les données réelles.** Le contenu réel était le
  révélateur : c'est un nom d'ouverture de 82 caractères qui a cassé le tableau, jamais un nom de
  fixture. Un pilote sur données réelles voit ce qu'un pilote de démonstration ne peut pas voir.
- **Une porte de goût par slice** : pas de merge sans un « oui » humain sur capture. Ralentit la
  chaîne d'un aller-retour par slice, supprime la classe entière de reprises.
- **Radical — inverser l'ordre.** Aucune SCSS écrite avant validation des six écrans en HTML statique
  sur données réelles. Le pilote *devient* la spécification ; l'implémentation ne fait que la
  rejoindre. Coût élevé en amont, reprise proche de zéro en aval.

---

## 2. Des critères d'acceptation vérifiables sans être suffisants

Trois occurrences du même moule, toutes passées vertes en cachant un défaut :

| Critère écrit | Ce qui a été vérifié | Ce qui était vrai |
|---|---|---|
| « Le plateau ne se déplace ni ne se redimensionne » | la **position** (Δx, Δy = 0) | le plateau **grandissait de 9 px** quand la barre de défilement disparaissait |
| « Aucun débordement horizontal de page » | la page ne défilait pas | le **conteneur** défilait à sa place, chiffres hors cadre |
| « La courbe reste en paysage » | plus large que haute | 1,29:1 — un axe de temps devenu illisible |

Dans les trois cas le critère était mesurable, mesuré, et vrai. Et dans les trois cas l'écran mentait.

### Options

- Formuler les critères en **ce que le joueur obtient**, pas en propriété mesurable : « les six
  colonnes sont lisibles sans faire défiler quoi que ce soit » plutôt que « la page ne défile pas ».
- **Un critère négatif systématique** : pour chaque assertion, écrire l'échec qui la satisferait quand
  même. Trois lignes de réflexion auraient attrapé les trois cas.
- **Radical — aucun critère de mise en page rédigé par l'agent qui l'implémente.** Un agent
  adversarial écrit les critères depuis le PRD seul, avant l'implémentation.

---

## 3. Un test vert qui ne prouvait pas ce qu'il prétendait

Le rythme vertical de base (`main > [data-column] > section > * + *`) battait en **spécificité** la
règle censée l'éteindre sur l'explorateur (`section[attr] > * + *`). La règle n'avait aucun effet, et
**le test passait** : il lisait la déclaration dans la feuille compilée, pas la cascade. Le défaut a
été vu au navigateur, jamais au test.

Aggravant : ce test n'est jamais passé par le rouge. Écrit après coup sur une règle déjà en place, il
documentait une intention au lieu de vérifier un comportement.

### Options

- Assertion sur la **valeur calculée** et non sur la déclaration — impossible en jsdom, ce qui remonte
  mécaniquement l'assertion à l'étage agentique. Un test qui lit une feuille compilée ne peut pas, par
  construction, juger une cascade.
- **Règle de discipline** : un test de style qui ne passe pas par le rouge n'est pas un test, c'est un
  commentaire. Le voir vert dès l'écriture doit alerter.
- **Radical — interdire les sélecteurs concurrents sur un même axe.** Un seul endroit décide du rythme
  vertical ; un écran qui gère le sien le déclare et n'est pas couvert par la règle générale. Pas de
  contre-règle, donc pas de bataille de spécificité possible.

---

## 4. Un budget en unités de fenêtre ne pouvait pas tenir sa promesse

`100vh` / `100dvh` mesurent la **fenêtre**, pas ce que l'œil reçoit. Sur l'écran du demandeur —
fenêtre maximisée derrière la barre des tâches — la fenêtre est plus haute que l'aire visible, et le
plateau « entièrement visible » finissait hors écran. **Trois itérations** (21rem → 17rem → 18rem →
15rem + plafond) avant de comprendre que le problème n'était pas la valeur mais **l'unité**.

### Options

- Doubler toute contrainte en `vh` d'un **plafond absolu** — la solution finalement retenue
  (`min(calc(100dvh - 15rem), 34rem)`), mais après trois tours.
- **Demander la géométrie au lieu de la deviner.** Une ligne collée par le demandeur
  (`innerHeight`, hauteur visible, DPR) économisait les trois tours. Elle n'a pas été demandée par
  excès d'autonomie : l'agent a préféré itérer en aveugle plutôt que poser une question de dix
  secondes.
- **Radical — ne jamais promettre « entièrement visible ».** Une contrainte de taille lisible
  (`min(60%, 34rem)`) et le défilement assumé. La promesse était la source du problème, pas son
  implémentation.

---

## 5. Trois subagents sur une machine, sans convention préalable

- Un `pkill -f "tsx watch src/main.ts"` a tué **tous** les backends de tous les worktrees : ils ne
  diffèrent que par le chemin, jamais par la ligne de commande.
- Le navigateur MCP partagé **volait la page sélectionnée** entre agents ; deux actions ont atterri
  sur l'application d'un autre agent. C'est le mode de défaillance qui produit un run vert mesuré
  contre la mauvaise application.
- Un subagent a **refusé de certifier** l'écran d'Analyse parce que la feuille de style changeait sous
  lui trois fois pendant son run. Refus fondé ; un run perdu quand même.

### Options

- Les conventions sont désormais écrites dans `docs/test-scenarios/README.md` (ports et `DB_FILE`
  propres par scénario, garde sur `location.port`, navigateur dédié, tuer par PID). **Elles n'existaient
  pas avant l'incident** — c'est l'incident qui les a écrites.
- **Un gel explicite avant tout run de vérification** : l'orchestrateur donne un SHA, l'agent le
  checkout en détaché, et personne ne touche à l'arbre. Une phrase de protocole a transformé trois runs
  bancals en une passe propre.
- **Radical — un worktree jetable et détaché par run de vérification**, systématiquement. L'agent ne
  *peut alors pas* mesurer un arbre mouvant, même si l'orchestrateur se trompe.

---

## 6. Les subagents rendaient leur travail sans le rapporter

Systématique sur la session : chaque agent passait en « idle » sans message, et il fallait le relancer
pour obtenir son rapport. **Cinq allers-retours** perdus.

### Options

- L'exiger en première ligne du prompt de lancement, comme condition de fin de tâche.
- Considérer qu'un passage en idle sans rapport **est** un échec de la tâche, et le dire dans le prompt.

---

## Ce qui a bien marché, et qu'il faut garder

- **L'audit de cohérence des tokens, testé par mutation.** Un `var(--tnit-blunder)` planté
  volontairement : l'audit l'a nommé. C'est le seul garde-fou contre l'absence d'erreur de compilation
  que coûtent les custom properties, et il a été vérifié plutôt que supposé.
- **Les tests lus sur la feuille compilée** (`declarationsFor`) : le seul étage sous l'agentique où une
  règle de mise en page soit observable, puisque jsdom ne charge jamais la feuille.
- **La certification par le mécanisme et non par le symptôme.** Prouver que `clientWidth` ne bouge plus
  (760 → 760, contre 753 → 768 avant) vaut mieux que constater que les 9 px ont disparu.
- **Les refus d'arbitrer seul** : ne pas inventer deux tokens hors ADR-0013, ne pas élargir un
  troisième écran après que le goût a été figé, ne pas décider si le sélecteur de côté doit réinitialiser
  le chemin. Chaque fois, remonter la question était le bon choix.
- **Le séquencement de la slice 01** — markup restructuré sans une ligne de style, seule slice à
  adapter les tests. La propriété a tenu : aucun test rouge des slices 02→06 n'a été ambigu.
- **La distinction « mesuré une fois » / « confirmé deux fois »**, tenue jusque dans le corps de la PR
  contre l'intérêt du rapporteur. C'est ce qui sépare un rapport d'une plaquette.

---

## La leçon, en une phrase

Toute la pile de vérification était solide sur ce qui est **mesurable** et aveugle sur ce qui se
**regarde**. Le seul remède qui adresse la cause plutôt que les symptômes est de mettre les yeux du
demandeur devant l'écran plus tôt et plus souvent — une capture par slice, sur les données réelles.
Les cinq autres problèmes sont des variantes du même angle mort.
