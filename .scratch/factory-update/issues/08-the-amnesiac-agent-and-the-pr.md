# 08 — L'épreuve de l'agent frais, la suite HP, la PR

Status: done — **HITL** : la PR `integration → develop` est une décision humaine.
Delivered: 2026-09-04 · merge `57ce414` · gate: build ✓ tests ✓ (1415) test:tools ✓ lint ✓ (306 fichiers lintés, 0 problème) · HP 3/3 + prérequis ✓ · 4/4 sondes ✓ · no blocking finding · la PR integration→develop reste ouverte, décision humaine
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
> **HITL.** La PR `integration → develop` est une décision humaine, et l'agent ne merge jamais vers
> `develop`. C'est aussi ici que **le filet de code passe une fois, entier** (décision du demandeur,
> 2026-09-04) : les sept tranches précédentes ne touchent que `.claude/`, `docs/`, `.scratch/` et
> `BACKLOG.md`, et n'ont donc pas rejoué build + tests + lint.

## What to build

Prouver que la méthode se suffit, puis rendre la main.

**L'épreuve de l'agent frais.** Le critère d'US-21 — *« qu'un agent frais, en lisant la méthode et
rien d'autre, ne prenne aucune décision que le dépôt contredit »* — était invérifiable, jusqu'à ce
que cette story découvre qu'**un worktree neuf est exactement un agent frais** : la mémoire étant
indexée par chemin de travail, un worktree a **zéro fiche**, par construction (ADR-0028). Le défaut
qui a coûté quinze recettes repayées devient l'instrument qui prouve qu'elles ne le seront plus.

Un sous-agent est donc dépêché dans un **worktree neuf** et fait une **tranche réelle**. On observe
s'il trouve, **sans qu'on lui dise rien** : le worktree et ses symlinks, le driver, le plafond de
fan-out, le gate complet, et la forme d'un ticket livré. Toute recette qu'il repaie est **nommée** —
c'est le résultat utile même quand l'épreuve échoue : elle dit *laquelle* manque et *où* la ranger.

Ce n'est **pas un quatrième HP** : le plafond est à 3, et ce n'est pas un parcours utilisateur. C'est
un **prérequis de la PR**, à côté de la suite HP, comme le scénario d'amorçage.

**La suite HP** tourne ensuite, entière, avec son prérequis. Elle porte la valeur métier de l'app,
que cette story ne touche pas : elle est ici pour prouver que **la méthode a bougé sans que l'app
bouge**.

**La PR** `integration → develop` liste les tranches incluses pour une revue de lot lisible, colle
les deux rapports (épreuve + HP), et nomme ce que la story laisse ouvert. L'agent ouvre et donne le
lien ; **il ne merge pas**.

## Acceptance criteria

- [ ] Le filet complet — build + tests + lint — tourne **une fois** sur l'ensemble et **sort vert**,
      commandes et sorties consignées. Un lint qui ne parse pas le dépôt est **rouge**, pas vert.
- [ ] `/verify-factory` sort vert, ou chacun de ses rouges est **déclaré et daté**.
- [ ] Les quatre sondes passent : reprise terminée, vocabulaire, file exacte, avance de l'amont.
- [ ] L'épreuve de l'agent frais est **exécutée dans un worktree neuf** et son rapport est joint.
- [ ] Toute recette repayée pendant l'épreuve est **nommée**, et soit rangée dans la tranche, soit
      versée à US-39 avec sa raison.
- [ ] La suite HP est verte, prérequis compris, et son rapport est collé dans la PR.
- [ ] La PR liste les tranches, porte les deux rapports, et **n'est pas mergée** par l'agent.
- [ ] US-21 et US-25 passent en revue au backlog, avec le lien de la PR.
- [ ] Les décisions laissées ouvertes au demandeur sont listées explicitement.

### Feature Path (FP)

C'est le gate lui-même :

1. Créer un worktree neuf et y dépêcher un sous-agent sur une tranche réelle → il démarre, travaille
   et livre **en ne lisant que le dépôt** ; tout ce qu'il redécouvre est nommé.
2. Lancer le contrôle de santé de l'usine → vert, ou rouges déclarés et datés.
3. Lancer la suite HP avec son prérequis → 3/3, aucun finding bloquant.
4. Lancer le filet complet une fois → build, tests et lint **tournent** et sortent 0.
5. Ouvrir la PR `integration → develop` → elle liste les tranches, porte les deux rapports, et
   attend une décision humaine.

## Blocked by

- `05-claude-md-tells-the-truth`
- `06-the-knowledge-comes-home`
- `07-the-queue-becomes-a-queue-again`
