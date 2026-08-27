# US-18 — Accélérer la suite HP

Statut : `ready-for-agent`
Branche d'intégration : `integration/US-18-faster-hp-suite`
Grilling : 2026-08-26/27, conjointement avec US-20 (**abandonnée à l'issue du grill**).
ADR : [`0020-the-driver-library-drives-the-scenario-judges`](../../docs/adr/0020-the-driver-library-drives-the-scenario-judges.md).
Voir `BACKLOG.md` — US-18 (décisions D1→D8) et `## Abandonnées` — US-20.
`CONTEXT.md` : **inchangé**. Cette story n'ajoute aucun terme au domaine — `scope`, `grand livre`,
`helper` sont de la mécanique d'usine, et le glossaire ne porte que le domaine.

## Problem Statement

La suite Happy Path est le seul filet du projet, et elle est verte. Mais la faire tourner coûte assez
cher pour qu'on hésite : **une suite qu'on lance moins souvent est une suite qui protège moins**. Au
portail d'US-16b (2026-08-25), la suite a coûté **43 minutes** — 43,0 d'empan pour 42,6 de travail
réel, c'est-à-dire une passe tassée au maximum de ce que le plafond de concurrence permet.

> **Corrigé le 2026-08-27.** Cette phrase disait « le demandeur a attendu 74 minutes devant une suite
> qui n'a réellement travaillé que 43 ». Faux : les 74 min étaient le *premier tour → dernière ligne*
> du grand livre, dont le bord droit était un sous-agent réveillé pour rien 23 minutes après
> l'ouverture de la PR. Le demandeur a attendu **57,7 min** au total, dont 43 de suite ; le reste
> était la restructuration de la suite avant, et la PR après.

Le problème n'est pas là où on le cherchait. Trois croyances de l'entrée d'origine sont fausses,
maintenant qu'on a mesuré :

- Ce n'était pas « ~35-40 min » : c'était **28 min** au portail d'**US-16a** et **43 min** à celui
  d'US-16b. La suite a grossi de ×1,5, pas doublé. *(Étiquette corrigée le 2026-08-27 par le grand
  livre de la tranche 01 : deux portails ont tourné le 2026-08-24, et celui d'US-17 coûte 24,8/24,3
  — c'est celui d'US-16a qui fait les 28 min.)*
- Ce n'est plus **path 0** : il est passé de 15-20 min à **7,2 min**, US-17 ayant supprimé les
  71 requêtes d'export et les six pauses d'une minute. Il n'y a plus rien à y prendre.
- Ce n'est ni le moteur, ni le réseau, ni « un scénario aberrant » : les trois HP coûtent **15 à
  21 min** chacun, et le nouveau HP-03 fait **18,6 min** de parcours propre.

Ce qui coûte, c'est que **chaque agent réécrit son pilotage à chaque run**. 59 à 100 appels `Bash` par
scénario, à ~10 s l'appel, dérivés à la main d'une skill de 491 lignes. Mesuré sur deux portails :
**aller-retours d'outils 39-48 %, composition des scripts 32-39 %, analyse de l'agent 17-19 %,
rédaction du rapport 2-3 %.** Et le travail réinventé se paie deux fois : il est aussi la source des
**faux findings** (deux « défauts » du run du 2026-08-13 étaient des bugs du pilote, pas de l'app).

~~Enfin, une part du temps vécu n'est pas du travail du tout : au dernier portail, ~30 minutes sur 74
étaient de l'attente de collecte.~~ **Rétracté le 2026-08-27** : chaque rapport a été collecté en
quelques secondes, et le battement de collecte de toute la passe est d'environ **24 secondes**. Ce
que la relecture a trouvé à la place : **un sous-agent qui a fini reste vivant** et peut être réveillé
pour rien — HP-03 l'a été 23 minutes après la livraison du portail, par un guetteur résiduel de son
propre run précédent.

## Solution

Une **bibliothèque de pilotage** dans le dépôt : lancer l'app, restaurer un snapshot, sélectionner un
`Profile`, naviguer, jouer la passe de thème, relire un champ. Elle attaque les **deux** premiers
postes à la fois — moins d'appels et plus gros, plus rien à inventer, soit **~72-78 % du temps** — et
laisse le troisième intact.

Trois règles la définissent, et la troisième est celle qui la rend acceptable :

1. **Elle pilote, elle ne juge jamais** (ADR-0020). Elle lance, navigue, restaure, mesure, relit, et
   rend des **valeurs brutes** : aucun `expect`, aucun seuil, aucune comparaison avec un attendu.
2. **Elle n'est nommée que dans la skill `agentic-tests`, jamais dans un scénario.** Les quatre
   scénarios ne portent aujourd'hui **aucune** commande de lancement, et c'est ce qui leur a permis de
   survivre à un changement complet de pilote sans qu'une ligne bouge.
3. **Elle affirme ses postconditions sur le mécanisme, et jette.** « le serveur répond », « l'écran a
   rendu », « le champ relit la valeur posée », « le thème mesuré est celui demandé ». Pas « le total
   est 82 » : ça, c'est le scénario, et c'est l'agent qui le juge.

Et **l'analyse de l'agent est protégée** : 17-19 % du temps, le plus petit des trois postes, et le
seul qui **produit** des findings. Aucun levier de cette story ne doit la réduire. Elle rejoint la
liste de ce qui n'est pas à brader.

Le tout est encadré par un **grand livre** : un outil qui reconstruit le coût d'une passe **après
coup, sans la rejouer**, en lisant les transcripts de sous-agents. Il vient en premier, il coûte zéro
run, il vaut rétroactivement — donc les portails du 24 et du 25/08 sont déjà son « avant ».

## User Stories

1. En tant que demandeur, je veux savoir **combien la suite a réellement coûté** après un portail, pour ne plus arbitrer sur des chiffres déduits.
2. En tant que demandeur, je veux que ce coût soit **décomposé** (outils, composition, analyse, rapport, attente), pour savoir quoi attaquer.
3. En tant que demandeur, je veux que cette mesure soit **rétroactive**, pour ne pas payer une passe de 43 minutes rien que pour mesurer.
4. En tant que demandeur, je veux que la mesure distingue **le travail de l'attente**, pour ne pas optimiser un temps que personne ne passe à travailler.
5. En tant que demandeur, je veux lancer la suite **plus souvent**, pour que le filet protège au lieu de dissuader.
6. En tant que demandeur, je veux que rien de ce que la suite affirme ne disparaisse en chemin, pour que le vert garde sa valeur.
7. En tant que demandeur, je veux que **l'analyse de l'agent ne soit pas raccourcie**, parce que c'est elle qui trouve les défauts.
8. En tant qu'agent jouant un scénario, je veux **appeler** un helper pour lancer l'app sur mes propres ports et ma propre base, au lieu de re-dériver la recette.
9. En tant qu'agent jouant un scénario, je veux **restaurer un snapshot** sans redécouvrir le WAL, le `.backup` et la relecture de la copie.
10. En tant qu'agent jouant un scénario, je veux **arrêter** ce que j'ai lancé sans redécouvrir le grand-enfant d'`npx` ni le wrapper `tsx watch`.
11. En tant qu'agent jouant un scénario, je veux **jouer la passe de thème** en un appel par écran plutôt qu'en réinventant l'injection et l'émulation.
12. En tant qu'agent jouant un scénario, je veux que l'émulation de thème **échoue bruyamment** quand elle n'a pas pris, plutôt que de me rendre un vert plausible.
13. En tant qu'agent jouant un scénario, je veux **relire un champ** avant de valider un formulaire, sans redécouvrir le *native value setter* des champs mois de React.
14. En tant qu'agent jouant un scénario, je veux **naviguer** dans l'app sans redécouvrir que la ligne d'une partie est un `button` et non un lien.
15. En tant qu'agent jouant un scénario, je veux que les helpers **jettent** quand le mécanisme a échoué, pour ne jamais rapporter un vert appauvri.
16. En tant qu'agent jouant un scénario, je veux garder **entièrement** la charge de juger ce que l'app affiche, parce que c'est mon travail.
17. En tant qu'agent jouant un scénario, je veux que le scénario reste écrit en **termes de domaine**, pour continuer à le lire comme un parcours et non comme un script.
18. En tant qu'orchestrateur, je veux **ne pas laisser un sous-agent qui a fini attendre**, pour ne pas ajouter trente minutes de rien au mur.
19. En tant qu'orchestrateur, je veux consolider les durées de chaque scénario dans le rapport de suite, pour que le portail porte sa propre mesure.
20. En tant que relecteur de PR, je veux lire dans la PR **ce que la suite a coûté**, pour voir une tendance et non une anecdote.
21. En tant que futur mainteneur, je veux comprendre **pourquoi** la bibliothèque ne contient aucune assertion, sans avoir à le déduire.
22. En tant que futur mainteneur, je veux que les tests de l'outillage tournent dans **leur propre cycle**, pour que la suite de l'app reste rapide et lisible.
23. En tant que futur mainteneur, je veux qu'un helper cassé **rougisse un portail**, pour que la bibliothèque ne devienne pas du code non gardé.
24. En tant que futur mainteneur, je veux que la recette de restauration de snapshot soit **testée sur du vrai SQLite**, parce que c'est là qu'un `cp` a déjà produit une base corrompue.
25. En tant que futur mainteneur, je veux que le grand livre soit testé sur un **vrai transcript tronqué**, pour qu'il ne mesure pas une trace inventée.
26. En tant que demandeur, je veux savoir ce qui reste **irréductible**, pour accepter que la suite coûte ce qu'elle teste au lieu d'exiger un chiffre rond.

## Implementation Decisions

- **La bibliothèque vit dans `docs/test-scenarios/tools/`**, à côté des scénarios et de
  `theme-audit.js`, qui en est le précédent exact : browser-side, sans dépendance, driver-agnostic,
  rend un objet brut, et refuse explicitement de faire le travail du pilote. La co-localisation est
  voulue : scénarios, passe de thème et outillage se lisent ensemble.
- **JavaScript pur (`.mjs` côté hôte, `.js` injectable côté page), aucune étape de build.** Elle
  n'est pas livrée dans l'app, ne participe pas à `npm run build`, et doit rester injectable telle
  quelle. C'est aussi pourquoi elle n'est dans aucun des deux workspaces.
- **Deux moitiés, séparées et nommées comme telles** : la moitié **hôte** (lancer, restaurer, arrêter,
  vérifier un port, lire les transcripts) et la moitié **page** (naviguer, auditer, relire un champ).
  Elles ne s'importent pas l'une l'autre.
- **Aucune assertion sur l'app dans la bibliothèque** (ADR-0020). Elle porte des **postconditions de
  mécanisme** et **jette** : serveur qui répond, écran rendu, champ relu, thème mesuré conforme au
  thème demandé. Le mode d'échec acceptable est le **rouge bruyant**, jamais le vert appauvri.
- **La bibliothèque n'est référencée que par `.claude/skills/agentic-tests/SKILL.md`.** Les scénarios
  restent tech-agnostiques. Corollaire : la §5.4 est réécrite **en remplacement**, pas en ajout — une
  consigne ancienne et étayée qui cohabite avec une neuve gagne toujours.
- **Le grand livre lit les transcripts de sous-agents** (`agent-*.jsonl`, une ligne par message,
  horodatée à la milliseconde) et attribue chaque intervalle à un poste selon l'enchaînement des
  messages : `outils` = appel → résultat ; `composition` = génération d'un message portant un appel ;
  `analyse` = génération d'un message de réflexion suivant un résultat ; `rapport` = génération d'un
  message de texte ; **`attente inerte`** = intervalle suivant un message de texte, l'agent ayant
  rendu la main. Il rend par scénario et pour la suite : mur, les cinq postes, et le mur de la suite
  (premier début → dernière fin).
- **Le plafond de concurrence reste `min(3, floor(nproc / 4))`**, soit **2** sur ce poste. US-20 est
  abandonnée, donc rien ne sécurise une remontée : le gain vient du contenu, jamais du parallélisme.
- **Ordre des tranches**, et il n'est pas neutre :
  1. **Le grand livre** — zéro run, rétroactif, et **rien d'autre ne peut prouver qu'une tranche
     suivante fait gagner du temps**.
  2. **La passe de thème** — le plus gros bloc répété (**18 audits par scénario, 54 pour la suite**),
     mécaniques identiques, déjà à moitié outillé, et **aucun jugement dedans**. Gros gain, risque
     minimal. C'est aussi l'endroit où « affirmer moins » passerait le plus facilement inaperçu :
     l'assertion `matchMedia` **dans** le script audité est la seule chose qui ait jamais attrapé
     l'émulation qui se reverte, elle est donc obligatoire.
  3. **Le cycle de vie de l'app** — lancer, restaurer, arrêter. Les mécaniques les plus re-dérivées et
     les plus coûteuses en erreurs : `wal_checkpoint(TRUNCATE)` puis `.backup` (jamais `cp`) puis
     **relire la copie**, restaurer **avant** de démarrer, vérifier le port, ne jamais tuer ce qu'on
     ne peut pas prouver être à soi.
  4. **Navigation et relecture de champ** — navigation SPA plutôt que pilote, garde `location.port`,
     *native value setter* pour les champs contrôlés par React.
  5. **L'attente de collecte** — orchestration (§5.1), pas contenu de scénario. Le gain le moins cher.
  6. **Re-mesurer et fixer le critère de succès**, sur le grand livre, avec un avant/après réel.
- **Les tranches 1, 5 et 6 ne touchent à aucun scénario** : les trois quarts du risque sont
  concentrés sur 2, 3 et 4.
- **Le critère de succès n'est pas fixé maintenant.** « Moins de dix minutes » est un **repère, pas un
  but** (décision du demandeur). Il se fixe en tranche 6, sur la mesure, jamais sur un chiffre rond.

## Testing Decisions

Un bon test ici affirme un **comportement externe** : ce qu'un helper rend, ou ce qu'il refuse de
laisser passer. Jamais comment il s'y prend. Et il faut se souvenir de ce qui est testé : on insère du
code **sous le seul filet du projet**, donc une bibliothèque silencieusement fausse est plus dangereuse
que 95 scripts jetables faux — elle est réutilisée et elle inspire confiance.

- **Cycle isolé, commande dédiée : `npm run test:tools`** (décision du demandeur). Une cible vitest à
  la racine couvrant `docs/test-scenarios/tools/`, **hors** de `npm test`, pour que la suite de l'app
  reste rapide et que l'outillage ne rougisse pas les tests de l'app.
- **Règle de portail, à écrire dans la skill et à ne pas laisser implicite** : le portail dit « build +
  tests + FP verts », et un agent qui lit ça lance `npm test`. **Une tranche qui touche l'outillage
  passe `npm test` ET `npm run test:tools`.** Sans cette règle, la bibliothèque redevient
  `theme-audit.js` — aujourd'hui testé nulle part et importé par personne.
- **Parties pures uniquement, côté unitaire** : découpage du grand livre, construction d'URL, parsing
  de sortie de commande. Prétendre tester unitairement « lancer l'app » fabriquerait exactement la
  fausse confiance contre laquelle l'ADR est écrit.
- **Grand livre : un vrai transcript tronqué en fixture.** Prior art : `server/test/fixtures/
  real-reading.ts` (US-16b, « une vraie lecture d'une vraie partie comme fixture »). Un transcript
  inventé validerait le découpage contre l'idée qu'on s'en fait.
- **Snapshot : test sur du vrai SQLite, fichiers temporaires.** WAL → `wal_checkpoint(TRUNCATE)` →
  `.backup` → relecture. C'est l'incident du 2026-08-24 (`cp` rendant *database disk image is
  malformed* après un checkpoint tronquant) transformé en test. `sqlite3` est sur le PATH,
  `better-sqlite3` est déjà une dépendance du serveur.
- **Pas de jsdom pour la moitié page, délibérément.** L'argument est déjà écrit dans
  `theme-audit.js` : le faire depuis la page « testerait un mécanisme différent de celui qui est
  livré ». Sa couture est la FP, et rien d'autre.
- **Apex — la FP réelle, par tranche.** Chaque tranche se valide par une **Feature Path jouée avec la
  bibliothèque** sur l'app réellement lancée (~12-15 min, contre 43 pour la suite) : c'est le seul
  filet disponible sous la bibliothèque, et il est abordable.
- **HP — pas de nouveau scénario.** Le plafond de **3 HP** tient et n'est pas en cause : cette story
  ne change pas ce que la suite affirme, elle change ce qu'elle coûte. La suite HP se joue au portail
  `integration → develop`, et **son grand livre est collé dans la PR** — c'est l'avant/après de la
  tranche 6.

## Out of Scope

- **US-20 et tout ce qu'elle portait.** Abandonnée le 2026-08-26 : elle traite les processus **morts**,
  le problème est la durée. Donc **pas** de scope systemd, pas d'échéance de run, pas de script de
  récupération d'orphelins, pas de ménage disque. Ce que le grill a établi est conservé sous
  `BACKLOG.md` — `## Abandonnées`, pour ne pas le repayer.
- **Remonter le plafond de concurrence**, et **corriger le gel du poste**. Le diagnostic est une famine
  CPU des processus vivants, le déclencheur n'est pas établi, et un des trois plantages du 23-24/08 ne
  coïncide avec aucun run — une cause seconde indépendante reste plausible.
- **Le span Lichess.** La version précédente de l'entrée proposait de le raccourcir ; US-17 a supprimé
  son coût sans toucher à l'assertion et `README.md` a tranché (« US-17 does not reopen this rule »).
- **Réutiliser le snapshot entre deux courses** : arbitrage du demandeur **non pris**. Le snapshot ne
  périme pas, mais le mettre en cache, c'est cesser d'exercer l'adaptateur Lichess en direct une fois
  par course.
- **Régler la dépêche** (effort/modèle par scénario) : gardé **en réserve**, à n'arbitrer qu'après une
  mesure — ça touche la capacité de l'agent à *voir* un défaut, et la protection de l'analyse s'y
  oppose par défaut.
- **Tout ce que `README.md` §« What not to trim » protège** : profondeur moteur, contrat chess.com
  réel, second `Profile`, état propre par scénario, passe de thème complète — **et désormais l'analyse
  de l'agent**.
- **Faire appeler les helpers par les scénarios** : rejeté en ADR-0020.

## Further Notes

- **Réserves de méthode, à garder collées aux chiffres** : les postes sont déduits de l'enchaînement
  des messages, donc la « composition » inclut la latence et d'éventuelles files d'attente d'API,
  qu'on ne sait pas séparer. Et **le contenu des blocs de réflexion n'est pas persisté** : on mesure
  la *durée* de l'analyse, jamais sa matière. Le grand livre doit dire ces deux réserves dans sa
  propre sortie, sinon quelqu'un lira ses pourcentages comme des faits.
- **Incohérence de doc rencontrée en chemin** : `theme-pass.md` fait foi avec **neuf** écrans (donc
  18 audits par scénario), et `README.md` dit encore « eight » à deux endroits. `theme-pass.md`
  consigne d'ailleurs qu'un écran est resté **un run entier non audité** pour cette raison. À corriger
  en passant dans la tranche 2, ou à verser à US-21 — décision à prendre, pas à laisser traîner.
- **Le mur vécu et le mur travaillé sont deux chiffres différents**, et il faut les rapporter tous les
  deux — mais **le grand livre ne peut pas mesurer le vécu**, parce qu'il lit les transcripts de
  sous-agents et jamais celui de l'orchestrateur. Son *premier tour → dernière ligne* n'est pas
  l'attente de quelqu'un : le 2026-08-25 il valait 74 min pour une suite de 43, la différence étant
  un sous-agent réveillé après la livraison. Le vécu se lit dans la session de l'orchestrateur
  (demande → réponse finale), et il valait **57,7 min** ce jour-là.
- **Ce qui restera irréductible** : l'analyse (17-19 %) et une part des aller-retours d'outils. Il est
  possible que cette story se conclue sur « la suite coûte ce qu'elle teste » plutôt que sur un gain
  spectaculaire — c'est un résultat acceptable, à condition qu'il soit **mesuré** et non supposé.
