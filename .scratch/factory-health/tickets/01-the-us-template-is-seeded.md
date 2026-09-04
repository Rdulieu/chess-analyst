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

- [ ] `docs/agents/us-format.md` existe et décrit la disposition **réellement** utilisée dans
      `BACKLOG.md`, pas le défaut du cœur.
- [ ] Il est vérifiable sur les User Stories existantes : en prendre **trois** au hasard dans
      `## Done` et constater qu'elles suivent le gabarit ; si l'une s'en écarte, c'est le gabarit
      qui a tort.
- [ ] Le contrôle 10 de `/verify-factory` ne sort plus « absent ». S'il sort « tailored », c'est le
      résultat attendu — ce projet a sa propre forme.
- [ ] `BACKLOG.md` n'est **pas** modifié : on décrit ce qui existe, on ne le réécrit pas.
- [ ] Le vocabulaire de la sonde `L2` reste vert (`docs/agents/vocabulary.md`).

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
