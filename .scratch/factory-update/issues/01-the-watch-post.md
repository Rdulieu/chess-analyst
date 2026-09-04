# 01 — La veille : le remote `upstream`, le ref de reprise, et la mort du lock

Status: ready-for-agent
Parent: [`.scratch/factory-update/PRD.md`](../PRD.md) — US-21 + US-25
Branche : implémentée sur **`integration/US-21-US-25-factory-update`** — brancher depuis elle,
fusionner vers elle, **jamais vers `develop`**.
## What to build

Rendre la reprise **mesurable avant de la faire**. Aujourd'hui, répondre à « qu'est-ce que l'amont a
changé ? » coûte une demi-douzaine d'appels d'API pour reconstituer une base que git avait sous la
main. Après cette tranche, c'est deux commandes.

Trois gestes, et rien d'autre :

- Le dépôt amont entre comme **remote `upstream`**, restreint à sa branche par défaut et sans tags —
  il pèse 1,1 Mo contre nos 59 Mo de `.git`, et `git branch -r` fait déjà 55 lignes, on ne l'alourdit
  pas. Aucun fetch automatique : c'est un geste explicite.
- Le **ref de reprise est écrit en clair et versionné** : le dépôt amont, le ref (`ea7e4afe`, prouvé
  — six de nos huit skills en sont l'octet exact), la date d'installation, et **ce qui est refusé**
  (l'installateur, le lock, la recommandation de driver).
- **`skills-lock.json` est supprimé.** Il n'est ni écrit ni lu par l'installateur amont, et ses
  hachages ne sont pas reproductibles : `tdd` n'a jamais été touché ici et vaut exactement l'amont à
  `ea7e4afe`, quand le lock annonce autre chose. Un lock qui ment est pire qu'un lock absent — il
  invite à lui faire confiance. Voir ADR-0025.

C'est la seule tranche destructive de la story, et sa suppression est argumentée.

## Acceptance criteria

- [ ] Le remote `upstream` existe, suit **une seule branche**, ne rapporte **aucun tag**.
- [ ] Un fichier versionné porte : le dépôt amont, le ref de reprise, la date, les refus.
- [ ] `skills-lock.json` est supprimé et **plus rien dans le dépôt ne le référence**.
- [ ] La commande « ce que l'amont a changé depuis le ref » répond une liste de fichiers.
- [ ] La commande « ce que nous avons changé depuis le ref » ne désigne que `agentic-tests` et
      `git-flow`.
- [ ] Aucun fichier hors `.claude/` n'est modifié (hors le fichier de veille et le lock supprimé).

### Feature Path (FP)

1. Demander à git ce que l'amont a changé depuis le ref de reprise → une liste de fichiers de skills,
   pas une erreur, pas un dépôt introuvable.
2. Demander ce que **nous** avons changé depuis ce même ref → `agentic-tests` et `git-flow`, et elles
   seules ; les six autres skills ne ressortent pas.
3. Chercher `skills-lock.json` → absent ; chercher son nom dans le dépôt → aucune référence
   orpheline.
4. Lire le fichier de veille → on y trouve le ref, la date, et les trois refus, sans avoir à les
   déduire.

> **Filet de code.** Fin de tranche : si `git diff --name-only` touche quoi que ce soit **hors**
> `.claude/`, `docs/`, `.scratch/` et `BACKLOG.md`, le gate complet (build + tests + lint) tourne.
> Sinon, rien — le filet passe une fois, entier, à la tranche 08 (décision du demandeur, 2026-09-04).

## Blocked by

None — can start immediately.
