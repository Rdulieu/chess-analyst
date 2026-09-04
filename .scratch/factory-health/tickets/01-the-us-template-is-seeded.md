# 01 — Le gabarit d'User Story existe dans le dépôt

Status: ready-for-agent
Parent: aucun — ticket **isolé**, né d'un rouge du contrôle de santé de l'usine
Branche : depuis **`integration/US-21-US-25-factory-update`** → `feature/<ticket-ref>-<slug>`,
fusion vers cette branche d'intégration. C'est elle qui porte la méthode que ce ticket suppose
(`/verify-factory`, `docs/agents/vocabulary.md`, le gate énoncé une fois) ; `develop` ne l'a pas
encore.

## What to build

`/verify-factory` sort **rouge** sur son contrôle 10 : `docs/agents/us-format.md` n'existe pas.
C'est la copie projet du gabarit d'User Story, celle que `/to-us` lit pour écrire une US sur le
backlog métier. Sans elle, `/to-us` retombe sur le défaut du cœur (`skills/to-us/US-FORMAT.md`) et
n'a aucun moyen de savoir comment **ce** projet écrit ses User Stories — alors que 39 d'entre elles
sont déjà écrites dans `BACKLOG.md` et qu'elles suivent une forme très nette.

Le geste : **inférer la disposition réelle depuis les User Stories existantes** et l'écrire dans
`docs/agents/us-format.md`. Pas recopier le défaut du cœur — l'installer tel quel laisserait le
contrôle vert et le gabarit faux, ce qui est pire que rouge.

Ce que les US de `BACKLOG.md` font déjà, et qu'un gabarit doit capturer : le titre en une phrase
qui dit **pour qui** et **pourquoi** plutôt qu'une formule *En tant que…*, le bloc de citation daté
qui porte l'état du grill et les décisions du demandeur, la section des sections d'une story
grillée, et la façon dont une story passe de `## To do` à `## Doing`, `## In review`, `## Done`.

## Acceptance criteria

- [x] `docs/agents/us-format.md` existe et décrit la disposition **réellement** utilisée dans
      `BACKLOG.md`, pas le défaut du cœur.
- [x] Il est vérifiable sur les User Stories existantes : en prendre **trois** au hasard dans
      `## Done` et constater qu'elles suivent le gabarit ; si l'une s'en écarte, c'est le gabarit
      qui a tort.
- [x] Le contrôle 10 de `/verify-factory` ne sort plus « absent ». S'il sort « tailored », c'est le
      résultat attendu — ce projet a sa propre forme.
- [x] `BACKLOG.md` n'est **pas** modifié : on décrit ce qui existe, on ne le réécrit pas.
- [x] Le vocabulaire de la sonde `L2` reste vert (`docs/agents/vocabulary.md`).

### Feature Path (FP)

1. Lancer le contrôle de santé de l'usine et lire son contrôle 10 → il dit « absent », et pointe
   vers `/build-factory` (qui, ici, ne se rejoue pas).
2. Lire trois User Stories de `## Done` → en extraire la forme commune.
3. Écrire le gabarit, relancer le contrôle 10 → il ne dit plus « absent ».
4. Vérifier le gabarit contre une **quatrième** US non utilisée pour l'inférence → elle le suit.
5. Relancer la sonde de vocabulaire → verte.

> **Filet de code.** Rien sous `src/` ne bouge. Si `git diff --name-only` touche quoi que ce soit
> hors `.claude/`, `docs/` et `.scratch/`, le gate complet (build + tests + lint) tourne.

## Blocked by

None — can start immediately.

## Comments

**2026-09-04 — `docs/agents/us-format.md` écrit, inféré des 44 entrées de `BACKLOG.md`. Pas de
merge : la tranche s'arrête au commit, sur consigne du demandeur.**

Le gabarit n'est pas une copie du défaut du cœur, et la mesure le justifie : **aucun** des sept
blocs du défaut (`**INTENTION**`, `**CONTEXT**`, `**EXPECTED BEHAVIOR**`, `**BUSINESS RULES**`,
`**ACCEPTANCE CRITERIA**`, `**OUT OF SCOPE**`, `**DEPENDENCIES**`) n'apparaît dans `BACKLOG.md`, et
« En tant que… » non plus — **0 occurrence de chacun**. Installer le défaut aurait rendu le contrôle
vert avec un gabarit faux, ce que le ticket refuse explicitement.

Inférence conduite sur trois stories de `## Done` lues en entier — **US-37**, **US-16b**, **US-13** —
puis vérifiée sur une **quatrième non utilisée**, **US-22** : 24 assertions structurelles, 24 vertes.

Décisions :
- **Prose en anglais, littéraux en français.** Les cinq fichiers voisins de `docs/agents/` sont en
  anglais ; le contenu de `BACKLOG.md` est en français. Le gabarit décrit en anglais et **cite les
  marqueurs tels qu'ils sont écrits** (`**Pas encore grillée.**`, `**Fusionnée dans `develop`**`…),
  parce qu'un marqueur traduit ne se grep pas.
- **Le gabarit décrit, il ne prescrit pas.** La règle d'arbitrage du ticket est inscrite en tête du
  fichier : si une story existante le contredit, **c'est le gabarit qui a tort**.
- **Aucune story n'a été réécrite**, et `BACKLOG.md` n'est pas modifié (0 ligne).

**Ce que la vérification a corrigé dans le gabarit, et qui est le vrai résultat de la tranche.**
Trois affirmations du premier jet étaient fausses, toutes dans le même sens — un universel inventé
là où la réalité est majoritaire :
1. **« Le corps se lit dans l'ordre chronologique »** — faux, et c'est **US-22** qui l'a attrapé :
   elle ouvre sur `**Livrée le 2026-08-31**` et donne son grill **en dessous**. Deux dispositions
   coexistent (**28 ancien-d'abord / 11 résultat-d'abord**) ; le gabarit déclare désormais les deux
   valides, et note que `US-37`, la livraison la plus récente, est ancien-d'abord — donc « la
   convention bascule » aurait été faux aussi.
2. **« Tout titre est une phrase à l'infinitif à la voix du joueur »** — faux : **35 sur 41**. Six
   sont des déclaratifs (`US-37`) ou des groupes nominaux (`US-1`, `US-5`).
3. **« Les titres sans clause `pour…` sont les plus anciens »** — faux : les 18 sans clause
   incluent `US-17`, `US-27`, `US-33`, `US-34`, `US-15a-bis`. La clause est **dominante (23/41) et
   recommandée**, pas un test de validité.

Neuf comptages du premier jet étaient également faux (43 → **44** entrées, 17 → **18**
`Pas encore grillée`, 21 → **15** « décision humaine », 6 → **5** stories sans marqueur, etc.).
Tous recomptés à la machine et corrigés. Un seul universel a survécu à la mesure : **41 titres sur
41 finissent par un point**.

**Relecture indépendante (`/code-review`), et ce qu'elle a rapporté.** Un sous-agent a relu le
diff contre le ticket sans connaître mon raisonnement, avec pour consigne de **recompter lui-même**
les chiffres du gabarit contre `BACKLOG.md`. Il a rendu **5 findings bloquants et 6 non bloquants**,
tous sur le même axe : l'exactitude. Deux tiers des mesures se reproduisaient à l'identique
(114 / 78 / 15 / 7 / 27, tous les marqueurs littéraux, toutes les citations) ; le reste non.

Trois de ses bloquants portaient sur une version déjà corrigée entre-temps (il l'a dit lui-même, le
fichier a bougé pendant sa lecture) et **deux étaient neufs et justes** :
- **`Pas encore grillée` : 18 était le compte du fichier entier, pas celui de `## To do`.** Dans
  `## To do` c'est **14 sur 16 entrées** ; les quatre autres sont des paragraphes historiques de
  stories livrées. Corrigé, avec les deux chiffres distingués.
- **La clause `pour…` : 24 sur 43** (et non 23 sur 41), et surtout `US-2` et `US-5` — deux des plus
  vieilles — **l'ont**, donc mon explication historique (« les plus anciennes s'en passent ») était
  fausse. Corrigé : il n'y a **aucune coupure chronologique**, la clause est simplement dominante.

Ses non-bloquants ont tous été appliqués : le compte des blocs « hors périmètre » (**5 blocs sur 4
entrées**, les deux `### Frontière` n'en étant pas), le nom donné à 266 puces (**premier niveau**,
seules **12** sont réellement imbriquées), l'ordre de `## Done` (**globalement** du plus récent, pas
strictement — `US-13` est sous `US-9`), et la règle « un seul blockquote » qui est démentie par
**quatre** entrées (`US-37`, `US-33`, `US-13` en ont deux, `US-20` a une ligne orpheline).

Il a aussi trouvé le seul vrai **manque de périmètre** : le ticket demande un titre qui dise **pour
qui**, et le gabarit ne traitait que le **pourquoi**. La mesure a livré la réponse — le « pour qui »
passe par **deux** procédés, le possessif à la première personne (**17 sur 44**, groupés sur
`US-2`..`US-16c`) et **l'acteur en sujet de la clause `pour que`** (**18 sur 44**, groupés à partir
d'`US-18`) — et le second permet un acteur qui n'est pas le joueur (*l'app*, *un agent*). Section
ajoutée.

**Deux points de standards** relevés et corrigés : la colonne « Entered when » du tableau de cycle
de vie **redisait** `business-backlog.md` au lieu de le citer (or ce dépôt énonce ses règles une
fois — `CLAUDE.md`), et le fichier ne disait nulle part **ce que `/to-us` écrit réellement** : le
premier paragraphe, et lui seul.

**Second tour de relecture, et le finding qui valait le détour.** Le relecteur a été relancé sur la
version corrigée. Il a levé **deux bloquants de plus**, dont un que je n'aurais pas trouvé seul :
**le dénominateur du corpus était faux**. Je comptais « 41 » puis « 42 » entrées numérotées, en
excluant tantôt `US-20` (dont le titre porte un `*(abandonnée…)*` avant les deux-points) tantôt
`US-15 (EPIC)` (dont la référence contient une parenthèse). Le compte juste est **43** entrées
`US-*` sur **44** items de liste. Une règle de comptage bancale **fausse quatre chiffres d'un coup**
— clause `pour…`, forme du titre, point final, complément — tout en restant *cohérente avec
elle-même* (23 + 18 = 41), donc parfaitement crédible à la lecture.

Corrigé, et le fichier **énonce désormais sa règle de comptage en tête** avec les deux commandes qui
la reproduisent (`grep -c '^- \*\*US-'` = 43, `grep -c '^- \*\*'` = 44), pour que le prochain
recompte ne reparte pas d'une définition différente.

Deuxième bloquant : le compte des titres à l'infinitif ne se reproduisait pas non plus — deux passes
indépendantes ont donné **35** et **37** sur 43, l'écart portant sur des cas limites (*Ne plus
laisser…* est-il un infinitif ou une négation ? *Être rassuré…* une capacité ou un état ?). Plutôt
que de publier un chiffre qui ne survit pas à un recompte, **le chiffre a été retiré** et remplacé
par la description des trois formes avec leurs exemples nommés, et par l'aveu que la frontière est
un jugement. Un gabarit a le droit de dire « majoritairement » ; il n'a pas le droit de dire « 35 ».

Une contradiction interne a aussi été corrigée : la section *Titre* disait qu'une clause `pour…`
absente n'est « pas malformée, juste plus mince », et la grille de qualité disait qu'une story sans
elle « est née fausse ». Les deux ne pouvaient pas tenir. La grille distingue maintenant la clause
**creuse** (faute) de la clause **absente** (minceur).

**Vérification finale : les 17 chiffres du gabarit ont été remesurés un par un, et les 17 se
reproduisent** (44, 43, 24/43, 43/43, 17/44, 18/44, 39 = 28+11, 14/16, 18, 15, 114, 78, 15, 266, 12,
27/5, 7, 5).

**Ce que cet aller-retour démontre, et qui dépasse la tranche.** Le premier jet a inventé **cinq
universels** là où la réalité était majoritaire (l'ordre du corps, la forme du titre, la clause
`pour…`, le blockquote unique, l'ordre de `## Done`), et j'en ai encore inventé **deux de plus** en
appliquant les corrections — « sans exception » sur les deux procédés du « pour qui », démenti par
`US-27`, `US-32`, `US-13`. Un gabarit inféré se trompe **toujours dans le même sens** : il durcit
une tendance en règle. La contre-mesure qui a marché n'est pas la relecture attentive, c'est le
**recomptage à la machine, entrée par entrée**, systématiquement, avant d'écrire le chiffre.

**Feature Path : verte, 5/5.**
1. Contrôle 10 avant la tranche → `absent`, renvoie vers `/build-factory` (qui ne se rejoue pas ici).
2. Trois US de `## Done` lues → forme commune extraite.
3. Contrôle 10 après → **`tailored`**, plus jamais `absent`. Sonde B (dérive de disposition) : sans
   objet, le gabarit est inféré *depuis* le backlog.
4. Quatrième US (**US-22**, non utilisée pour l'inférence) → **24/24**.
5. Sonde `L2` → **verte**.

**Gate.** `npm run build` **0** · `npm test` **0** (97 fichiers, **1310** tests) · `npm run lint`
**0** — et **306 fichiers réellement lintés, 0 message** : la commande a tourné, elle n'a pas linté
zéro fichier. `npm run test:tools` **non dû** : la tranche ne touche pas `docs/test-scenarios/tools/`.
Le filet de code du ticket n'était pas déclenché (diff limité à `docs/` et `.scratch/`) ; le gate
complet a tourné quand même.

**Statut laissé à `ready-for-agent`, volontairement.** `delivery-state.md` interdit un `done` sans
ses coordonnées, et la consigne de ce run interdit le merge : il n'y a donc ni sha ni PR à écrire.
Un `done` ici serait une affirmation, pas un enregistrement. `L3` compte **2** tickets ouverts,
celui-ci compris.
