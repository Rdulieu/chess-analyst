# 05 — `CLAUDE.md` dit vrai, et `build-factory` ne se rejoue plus

Status: done
Delivered: 2026-09-04 · merge `f6d1c0b` · gate: FP 7/7 ✓, no blocking finding · code net (build+tests+lint) deferred whole to slice 08 by requester decision, 2026-09-04
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

Remettre d'accord la **méthode toujours en contexte** avec ce que le dépôt fait, et **retirer le
geste qui pouvait la détruire**.

- **`CLAUDE.md` adopte `/implement`** comme entrée d'une tranche : la boucle des trois rôles cesse
  d'être un paragraphe de prose que chaque agent interprète. Il adopte aussi **surface-first**.
- **Garde-fou non négociable** : `CLAUDE.md` **garde `lint` dans le gate** et **garde sa section
  « Dev phase »**. Le gabarit amont énonce le gate « build + tests » — le `lint` y a disparu, et
  c'est la leçon la plus chère de notre `git-flow` (1 349 erreurs de parsing qui n'ont jamais fait
  rougir personne parce que rien ne lançait la commande). L'amont enrichit, il n'ampute pas.
- **`/build-factory` ne se rejoue plus dans ce dépôt.** C'est un outil d'**amorçage**, ce dépôt est
  amorcé, et le rejouer est le seul geste connu qui *détruit* du travail. Le constat §1.4 de l'audit
  ne se répare donc pas : il **se dissout**, parce que le gabarit n'est plus pour nous. Le retrait
  est explicite et argumenté à l'endroit où un agent lirait la skill.
- **`/verify-factory` prend le rôle rejouable** — partage que l'amont a lui-même opéré en sortant
  cette skill à côté de `build-factory`.
- **Le sens d'écoulement des seeds est déclaré, une fois** : `docs/agents/*.md` est la source de
  vérité de **ce** dépôt ; les seeds `build-factory/*.md` sont des gabarits pour un dépôt **neuf**,
  jamais lus ici. La duplication cesse d'être une ambiguïté au moment où elle a une direction
  (§1.5).
- **`<reviewer to define>` est supprimé, pas rempli** : un dépôt à un seul humain n'a personne à
  assigner, l'étape a été sautée 62 fois parce qu'elle n'a pas d'objet, et la règle vraie est déjà
  écrite deux lignes plus bas. Une instruction que personne ne suit apprend à un agent que la méthode
  est indicative (§1.7).
- **La section `Cleanup` est appliquée** : `git branch --merged develop` renvoie **9** branches
  mergées et vivantes. Une branche d'intégration mergée invite du travail neuf sur une branche déjà
  fermée.
- Deux **sondes** entrent dans `verify-factory` : « la reprise est terminée » (l'écart avec l'amont
  au ref enregistré est vide) et « l'amont a N commits d'avance ». Hors ligne, elles rapportent
  **« non vérifié », jamais rouge** — un contrôle qui ne peut pas tourner n'a pas échoué, mais il n'a
  pas passé non plus.

## Acceptance criteria

- [ ] `CLAUDE.md` énonce le gate avec **`lint`**, et conserve « Dev phase » mot pour mot.
- [ ] `CLAUDE.md` nomme `/implement` comme entrée d'une tranche et parle de surface primaire.
- [ ] Le retrait de `/build-factory` est écrit là où un agent le rencontrerait, avec sa raison.
- [ ] `docs/agents/` est déclaré source de vérité, et les seeds gabarits d'amorçage.
- [ ] `<reviewer to define>` n'apparaît plus nulle part.
- [ ] Aucune branche `integration/*` déjà mergée dans `develop` ne subsiste, en local comme en
      distant, **après approbation** de la suppression.
- [ ] Les deux sondes amont existent et **dégradent proprement** sans réseau.

### Feature Path (FP)

1. Lire le gate dans la méthode toujours en contexte → build, tests, **lint**, FP verte, aucun
   finding bloquant.
2. Y chercher « Dev phase » → présente, inchangée.
3. Demander comment on démarre une tranche → `/implement`, pas un paragraphe à interpréter.
4. Chercher `<reviewer to define>` dans le dépôt → absent.
5. Lister les branches déjà mergées dans `develop` → aucune `integration/*`.
6. Couper le réseau, lancer le contrôle de santé → les sondes amont disent « non vérifié », le
   rapport n'est pas rouge pour autant.
7. Demander à rejouer l'amorçage de l'usine → le dépôt explique pourquoi il ne le fait plus et
   renvoie au contrôle de santé.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

- `04-the-vocabulary-pass`.
