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

## What to build

**Naviguer** et **relire un champ** : les deux gestes que tout scénario refait, et les deux endroits
où le pilote a déjà produit de **faux findings**.

- **Navigation dans l'app plutôt que par le pilote.** La navigation au niveau du pilote est
  l'opération qui atterrit sur la mauvaise page ; une garde `location.port` sur tout script injecté
  reste obligatoire — elle est **porteuse**, pas ceinture-bretelles.
- **Les deux écrans hors navigation.** Une partie s'ouvre depuis la liste — et **la ligne est un
  `button`, pas un lien** : un pilote qui cherche un `href` ne trouve rien et déclare l'écran
  inatteignable. Un profil s'ouvre depuis la liste des profils.
- **Relire un champ avant de valider.** Les champs mois du formulaire d'import gardent leur valeur
  par défaut quand un helper de haut niveau les remplit : il faut le *native value setter* plus un
  événement, **et relire**. Un run a failli importer les mauvais mois pour une raison qui n'avait
  rien à voir avec l'app.

Le helper **rend ce qu'il lit** et **jette** quand la valeur n'a pas pris. Il ne dit jamais si la
valeur est la bonne : ça, c'est le scénario.

## Acceptance criteria

- [ ] Traverser la navigation atteint chaque écran, sans navigation au niveau du pilote
- [ ] Une partie et un profil sont atteignables depuis leurs listes — la ligne de partie est traitée comme un `button`
- [ ] Tout script injecté porte une garde `location.port`
- [ ] Poser une valeur dans un champ contrôlé la fait **prendre**, et le helper la **relit**
- [ ] Le helper **jette** quand la valeur relue diffère de la valeur posée, **avant** toute soumission
- [ ] Le helper rend des valeurs brutes ; aucune assertion sur ce que l'app affiche (ADR-0020)
- [ ] Tests unitaires sur les parties pures uniquement ; **pas de jsdom** pour la moitié page — l'argument est déjà écrit dans `theme-audit.js`
- [ ] Aucun scénario de `docs/test-scenarios/` n'est modifié

### Feature Path (FP)

1. Je traverse la navigation écran par écran → chaque écran est atteint et se nomme, sans passer par le pilote de page.
2. J'ouvre une partie depuis la liste, puis un profil depuis la liste des profils → les deux écrans hors navigation sont atteints.
3. Je pose une plage de mois dans le formulaire d'import, puis je la relis → elle porte la valeur posée, pas la valeur par défaut.
4. Je pose une valeur qui ne prend pas → **ça jette** avant que le formulaire soit soumis.

Verify: UI d'abord — ce que l'écran affiche et ce que le champ contient réellement.

## Blocked by

- `.scratch/hp-suite-speed/issues/01-the-ledger-of-a-run.md` — pour prouver le gain
- `.scratch/hp-suite-speed/issues/03-app-lifecycle-launch-restore-stop.md` — séquencement : sans elle, la FP démarre l'app à l'ancienne
