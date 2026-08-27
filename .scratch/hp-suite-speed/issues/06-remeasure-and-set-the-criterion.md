Status: `ready-for-agent`

## Parent

`.scratch/hp-suite-speed/PRD.md` (US-18 — `BACKLOG.md`, grillée le 2026-08-26/27 conjointement avec
US-20, abandonnée à l'issue du grill). ADR : `docs/adr/0020-the-driver-library-drives-the-scenario-judges.md`.

Implemented on the business-story integration branch `integration/US-18-faster-hp-suite` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

> **Portail, pour toute tranche de cette story** : `npm test` **et** `npm run test:tools`. La
> commande dédiée est une décision du demandeur ; sans cette règle, la bibliothèque redevient du code
> non gardé — comme `theme-audit.js`, aujourd'hui testé nulle part.

> **Tranche HITL.** Le critère de succès appartient au demandeur (D2 : « moins de dix minutes » est un
> **repère, pas un but »**). L'agent produit la mesure et le constat ; il ne fixe pas le seuil.

## What to build

> **Deux corrections d'étiquette, faites le 2026-08-27, à prendre avant de comparer quoi que ce soit.**
> Les « 28 min » sont le portail d'**US-16a** (`b59434a5`), pas celui d'US-17 (`3e763365`, qui coûte
> 24,8/24,3) — deux portails ont tourné le 24/08. Et le « 74 min vécues » du 25/08 est **rétracté** :
> c'était le *premier tour → dernière ligne* du grand livre, dont le bord droit était un sous-agent
> **fini** réveillé pour rien 23 minutes après l'ouverture de la PR. Le demandeur a attendu
> **57,7 min**, dont 43,0 de suite. L'« avant » sur lequel cette tranche compare est donc **42,6 min
> de travail réel**, jamais 74 de vécu.

**Re-mesurer, et fixer le critère de succès sur la mesure.** La suite HP est jouée avec la
bibliothèque, le grand livre en rend le relevé, et ce relevé est comparé aux deux portails d'avant :
**28 min de travail réel au 2026-08-24 (portail d'US-16a), et 42,6 min au 2026-08-25** pour 43,0
d'empan, avec la répartition
outils 39-48 % / composition 32-39 % / analyse 17-19 % / rapport 2-3 %.

C'est aussi la tranche qui **vérifie que rien n'a disparu**, et c'est sa part la plus importante. Une
suite plus rapide qui affirme moins est une régression déguisée en progrès, et **c'est la suite qui
sert de filet** — personne d'autre ne le verrait.

La sortie de la story : la PR `integration → develop`, avec **le grand livre collé dedans** (le
demandeur y lit l'avant/après par poste), la liste des tranches incluses, et les arbitrages restés
ouverts nommés comme tels.

## Acceptance criteria

- [ ] La suite HP est jouée **entière** avec la bibliothèque : path 0 puis les trois scénarios, plafond de concurrence `min(3, floor(nproc / 4))` **inchangé**
- [ ] Le grand livre rend le relevé complet, et l'écart par poste avec les deux portails d'avant est **chiffré**
- [ ] Ce qui **n'a pas** bougé est nommé, pas passé sous silence
- [ ] **L'analyse n'a pas été comprimée** — sa part est rapportée explicitement (elle doit rester du même ordre : c'est le poste qui produit les findings)
- [ ] Les trois scénarios affirment **ce qu'ils affirmaient** : aucune assertion perdue, la passe de thème couvre ses neuf écrans dans les deux thèmes
- [ ] `README.md` §« What not to trim » porte le nouvel item : **l'analyse de l'agent**
- [ ] Le **mur vécu et le mur travaillé** sont tous les deux rapportés
- [ ] **Le demandeur fixe le critère de succès** sur ce relevé, et il est écrit dans `BACKLOG.md`
- [ ] La PR `integration → develop` est ouverte, liste les tranches incluses, colle le grand livre, et nomme les arbitrages restés ouverts (cache de snapshot, réglage de la dépêche)
- [ ] La PR n'est **pas** mergée par l'agent — décision humaine

### Feature Path (FP)

1. La suite HP est jouée avec la bibliothèque → le grand livre en rend le relevé complet.
2. Je le compare aux deux portails d'avant → l'écart est chiffré par poste, et ce qui n'a pas bougé est nommé.
3. Je vérifie que rien n'a disparu : les trois scénarios affirment ce qu'ils affirmaient, la passe de thème couvre ses neuf écrans, l'analyse n'a pas été comprimée.
4. Le demandeur fixe le critère de succès sur ce relevé.

Verify: UI d'abord pour les trois scénarios (c'est la suite HP elle-même) ; le grand livre pour le coût.

## Blocked by

- `.scratch/hp-suite-speed/issues/01-the-ledger-of-a-run.md`
- `.scratch/hp-suite-speed/issues/02-the-theme-pass-in-one-call.md`
- `.scratch/hp-suite-speed/issues/03-app-lifecycle-launch-restore-stop.md`
- `.scratch/hp-suite-speed/issues/04-navigate-and-read-back.md`
- `.scratch/hp-suite-speed/issues/05-no-scenario-left-waiting.md`
