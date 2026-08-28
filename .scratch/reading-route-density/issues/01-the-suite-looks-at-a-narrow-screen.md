Status: `ready-for-agent`

## Parent

`.scratch/reading-route-density/PRD.md` (US-22 — `BACKLOG.md`, grillée le 2026-08-27).
ADR : `docs/adr/0021-what-the-player-acts-on-never-moves.md`.

Implemented on the business-story integration branch `integration/US-22-reading-route-density` —
branch sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local
check (build + tests + this issue's Feature Path) is green.

> **Portail** : si la tranche touche `docs/test-scenarios/tools/`, elle passe `npm test` **et**
> `npm run test:tools`. Un agent qui lit « build + tests » lance `npm test` seul, et la bibliothèque
> redevient du code non gardé.

## What to build

**Donner à la suite les yeux qui lui manquent**, et corriger le défaut qu'ils voient aussitôt.

La passe de thème n'audite qu'à **1280 px**. C'est l'angle mort : deux défauts réels vivent sous
cette largeur, et le portail du 2026-08-27 en a trouvé un à la main que la passe aurait dû voir. La
passe gagne donc une **seconde largeur, 380 px**, sur les neuf écrans et dans les deux thèmes.

Une seule largeur étroite suffit, et c'est mesuré : à 900 et à 380 px le volet latéral fait la même
largeur (332 / 333 px) et le panneau la même amplitude, la rangée s'étant repliée dans les deux cas.
Le coût est mesuré aussi : **+23,6 s de pilotage** (20,8 → 44,4 s) pour 18 relevés de plus, dont
**16 propres**.

Les deux autres nomment un seul défaut, qui entre donc dans cette tranche : **la liste des profils
fait défiler la page entière de côté sous ~700 px** — page 676 px contre 380, dans les deux thèmes,
propre à 720. La cause est connue et le correctif a son précédent dans le dépôt : la liste est une
grille à quatre pistes `auto` qui ne rétrécissent pas, et **aucun ancêtre n'est un scroller déclaré**,
là où les tables voisines vivent dans un conteneur qui défile et laissent la page immobile.

Les deux vont ensemble pour que **la suite soit verte le jour de l'adoption**, plutôt que d'adopter la
largeur avec une exception. `theme-pass.md` reste le seul endroit où l'inventaire et les assertions
sont édités.

## Acceptance criteria

- [ ] La passe de thème couvre les neuf écrans **aux deux largeurs et dans les deux thèmes** — 36 relevés
- [ ] `theme-pass.md` déclare la seconde largeur, et reste le seul endroit où l'inventaire s'édite
- [ ] La liste des profils **ne fait plus défiler la page** à 380 px, dans les deux thèmes
- [ ] Quand la liste ne tient plus, c'est **elle** qui défile, pas la page — comme les tables le font déjà
- [ ] `/profiles/:id` reste propre à 380 px, comme aujourd'hui
- [ ] Aucun autre écran ne régresse : les 36 relevés sortent sans débordement
- [ ] Aucune assertion de la passe n'est affaiblie ni retirée
- [ ] Le surcoût de pilotage est **rapporté**, pour qu'on sache ce qu'on a payé

### Feature Path (FP)

1. J'ouvre la liste des profils sur un écran étroit → elle tient dans la largeur, et la page ne défile pas latéralement.
2. Je rétrécis jusqu'à ce que la liste ne tienne plus → c'est la liste qui défile, la page reste immobile.
3. Je joue la passe de thème complète → elle rend deux fois plus de relevés, sur les neuf écrans, aux deux largeurs et dans les deux thèmes.
4. Je lis les relevés → aucun débordement nulle part, et rien d'autre n'a régressé.

Verify: UI d'abord — ce que l'écran fait quand on le rétrécit ; les relevés de la passe complètent.

## Blocked by

None - can start immediately
