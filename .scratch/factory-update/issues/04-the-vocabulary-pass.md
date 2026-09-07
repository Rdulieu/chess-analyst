# 04 — La passe vocabulaire, et le grep qui la tient

Status: done
Delivered: 2026-09-04 · merge `07979c3` · gate: FP 5/5 ✓, no blocking finding · code net (build+tests+lint) deferred whole to slice 08 by requester decision, 2026-09-04
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

La passe que **git ne peut pas faire**. Git fusionne des *hunks* ; le renommage de l'amont porte sur
des lignes qui, chez nous, ont été remplacées ou n'ont jamais existé. Nos 833 lignes de runner et nos
ajouts à `git-flow` disent encore « sub-issue », « PRD », « UI-first », et aucune fusion ne les
touchera. Sans cette tranche, le dépôt reste **à moitié renommé** — le pire des deux mondes, et
exactement l'incohérence que la story existe pour supprimer (ADR-0025).

Une **table de correspondance explicite** est écrite, puis appliquée à tout le dépôt : au minimum
`issue`→`ticket`, `sub-issue`→`sub-ticket`, `issue-ref`→`ticket-ref`, `PRD`→`spec`,
`/to-prd`→`/to-spec`, `/to-issues`→`/to-tickets`, `UI-first`→`surface-first`. La table est
**publiée**, pas implicite : c'est elle qui rendra la sonde lisible.

**Les archives sont exclues, et c'est une décision** : les PRD livrés et les `.scratch/` clos gardent
leurs mots d'époque. Ce sont des documents datés ; les traduire dans un vocabulaire qui n'existait
pas quand ils ont été écrits fabrique un faux. L'audit de cohérence du 2026-08-24 est exclu au même
titre — c'est un relevé daté, et le réécrire effacerait ce qu'il constatait.

Et la passe **devient un test** : une sonde de `verify-factory` vérifie qu'aucun terme retiré ne
subsiste hors archives. C'est la piste 1 d'US-21 — faire de l'hygiène ce qu'on peut mécaniser — et
elle survit à la story au lieu de mourir avec elle.

## Acceptance criteria

- [ ] La table de correspondance est écrite et versionnée, à un endroit qu'un agent trouve.
- [ ] Aucun terme retiré ne subsiste hors archives — y compris **dans nos propres lignes**.
- [ ] Les archives (`.scratch/`, l'audit du 2026-08-24) sont **inchangées**, et leur exclusion est
      écrite dans la sonde plutôt que sous-entendue.
- [ ] La sonde de vocabulaire existe dans `verify-factory`, et **échoue** si on réintroduit un terme.
- [ ] La double langue introduite par la tranche 02 est refermée.
- [ ] Le sens des textes n'a pas changé : un renommage n'est pas une réécriture.

### Feature Path (FP)

1. Lancer le contrôle de santé de l'usine → la sonde de vocabulaire passe.
2. Réintroduire volontairement un terme retiré dans une skill, relancer → la sonde **échoue** et
   **nomme le fichier**. Annuler.
3. Ouvrir le runner agentique → plus une seule « sub-issue » dans nos lignes locales.
4. Ouvrir un ticket livré d'une feature close → ses mots d'époque intacts.
5. Lancer une session de grill → elle nomme `/to-spec`, et le reste du dépôt parle la même langue
   qu'elle.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `02-the-front-of-the-pipeline` et `03-the-two-hand-merged-skills` — on ne renomme qu'une fois tout
  le texte amont arrivé, sinon on renomme deux fois.
