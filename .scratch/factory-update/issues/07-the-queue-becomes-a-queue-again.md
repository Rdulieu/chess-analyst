# 07 — La file redevient une file

Status: done
Delivered: 2026-09-04 · merge `5578909` · gate: FP 6/6 ✓, no blocking finding · code net (build+tests+lint) deferred whole to slice 08 by requester decision, 2026-09-04
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

La file `ready-for-agent` est censée piloter l'autonomie. Comptée, elle contient **53 entrées et pas
une seule vraie**. Cette tranche la rend exacte, et **vérifiable par une commande**.

Deux causes, deux traitements — ADR-0026 :

- **19 PRD portent un statut de triage qu'ils n'auraient jamais dû porter.** Une spec n'est pas un
  élément de travail : elle n'entre dans aucune file et n'atteindra jamais l'état de livraison,
  puisque ce n'est pas elle qu'on livre. **Réglé par définition, sans toucher un fichier.**
- **34 tickets de features livrées portent encore `ready-for-agent`.** Aucune définition ne rattrape
  ça : le fichier dit une chose fausse. Ils sont corrigés **une fois**.

La correction est **un mot dans un champ de statut**, sur des fichiers dont la livraison est prouvée
par le backlog. Rien n'est reconstitué, rien n'est deviné, **aucun contenu n'est réécrit**, et
surtout **aucune coordonnée de livraison n'est fabriquée** : 23 anciens tickets ne les portent nulle
part, et les inventer écrirait des dates devinées dans des archives. Le rétroactif reste **nommé, pas
repayé**.

Ce que la tranche **écrit** :

- **L'état de livraison est un axe distinct des cinq rôles de triage.** Les cinq rôles disent *ce
  qu'il faut faire ensuite* ; celui-ci dit *ce qui est arrivé*. Ils partagent un champ sans se
  contredire parce qu'ils s'excluent dans le temps. **La table des rôles canoniques reste intacte** —
  c'est le point de contact avec l'amont, il reste propre, et la divergence est petite et additive.
- **La définition mécanique de la file** : tickets portant `ready-for-agent` **et pas** l'état de
  livraison, PRD exclus.
- **La forme prospective** : un ticket livré porte désormais date, PR ou commit de merge, **et
  résultat du gate**. C'est ce qui rend le portail d'auto-fusion auditable après coup (§2.3) — le mot
  seul ne prouve rien, il dit qu'un agent l'a tapé.
- **Une feature est close** quand tous ses tickets portent l'état de livraison (§2.6).
- Une **sonde** de `verify-factory` publie le compte de la file.

## Acceptance criteria

- [ ] L'état de livraison est documenté dans `docs/agents/` comme **distinct** des cinq rôles.
- [ ] La table des rôles canoniques est **inchangée**.
- [ ] Les 34 tickets périmés portent l'état de livraison ; **leur contenu est inchangé** et **aucune
      coordonnée n'a été ajoutée**.
- [ ] Les PRD sont exclus de la file **par définition**, et aucun PRD n'a été modifié.
- [ ] La forme prospective (date, PR/commit, résultat du gate) est écrite et exigible.
- [ ] La sonde publie un compte qui **égale** les tickets réellement ouverts.
- [ ] Le rétroactif — les anciens livrés sans coordonnées — est **nommé** dans la documentation, pas
      silencieux.

### Feature Path (FP)

1. Demander ce qui est prêt pour un agent → le compte égale les tickets réellement ouverts, et
   aucune feature livrée n'y figure.
2. Ouvrir un ticket d'une feature livrée → il porte l'état de livraison, son texte est intact, et
   aucune date n'a été inventée.
3. Ouvrir une spec livrée → hors file, et non modifiée.
4. Lire la table des rôles de triage → cinq rôles, inchangée.
5. Demander « ce ticket a-t-il été livré correctement ? » sur une livraison **récente** → date, PR et
   résultat du gate sont lisibles ; sur une **ancienne** → l'absence est dite, pas devinée.
6. Marquer un ticket neuf comme livré sans ses coordonnées → la règle l'interdit et dit pourquoi.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `04-the-vocabulary-pass`.
