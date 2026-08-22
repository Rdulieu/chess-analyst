Status: ready-for-agent

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

Le **récapitulatif de la partie** : ce que cette partie **apportera** à l'analyse globale. C'est le
point de réconciliation exigé par **ADR-0017** — l'agrégat de 15c sera **ce récapitulatif sommé**, donc
la réconciliation est la **définition** et non un test qu'on espère vert.

- **Une fonction de dérivation exportée au plus haut point possible**, parce que 15c pliera
  **exactement celle-là**. Deux implémentations d'une même méthode ne s'accordent que par chance, et
  divergent en silence.
- Elle énonce : les **Moves comptés** sur le total des Moves du Player, les **exclus par motif**, les
  **erreurs comptées**, le **total des chances perdues**, la **`Drift`**, et le **`Search regime`** de
  la partie (uniforme par partie, par construction — une partie ne mélange jamais deux régimes).
- **`Drift`** (`CONTEXT.md`) est un **résidu, par construction** : tout ce que le Player a perdu, moins
  ce que les Moves signalés ont perdu. Les deux parts **font le total par définition** — donc aucun
  double comptage, aucune segmentation, aucun réglage nouveau. Ce que la lecture par seuils est
  structurellement incapable de voir : saigner 5 % par coup pendant quinze coups ne franchit jamais le
  plancher, et perd la partie aussi sûrement qu'une grosse erreur.
- **Placé en tête du panneau** : c'est ce qu'on lit d'abord pour vérifier la méthode, et tout ce qui est
  en dessous en est la preuve coup par coup.
- **Il absorbe le décompte d'erreurs existant en Detailed.** Les deux chiffres **peuvent légitimement
  différer d'une unité** (un Move signalé mais forcé compte dans l'un, pas dans l'autre), et deux
  résumés en désaccord **correct** côte à côte se lisent comme un bug sans en être un. Le récapitulatif
  énonce donc les deux **et la raison de l'écart**. En **Annotated**, le décompte reste **exactement**
  où et comme il est aujourd'hui.
- La `Drift` en **chiffres** ici est aussi l'**équivalent textuel** que le tracé de la tranche 06 doit :
  c'est ce qui autorisera ce dessin à être `aria-hidden`, comme la courbe l'est déjà.

## Acceptance criteria

- [ ] Une fonction unique produit le récapitulatif, et c'est celle que l'agrégat futur pourra plier.
- [ ] Le récapitulatif énonce Moves comptés / total, exclus par motif, erreurs comptées, chances
      perdues, dérive, et le régime d'analyse.
- [ ] `Drift` = total des chances perdues − ce que les Moves signalés ont perdu ; la somme des deux
      parts **est** le total, sur toute partie.
- [ ] Une partie sans aucun Move signalé a une dérive égale à la totalité de ses chances perdues.
- [ ] Une partie sans perte du tout affiche des zéros, sans cas particulier ni division douteuse.
- [ ] Le récapitulatif est en **tête du panneau**, en Detailed.
- [ ] En Detailed, le décompte d'erreurs n'apparaît **qu'une fois**, dans le récapitulatif ; en
      Annotated, il est inchangé à sa place actuelle.
- [ ] Quand erreurs signalées et erreurs comptées diffèrent, le récapitulatif **dit pourquoi**.
- [ ] Le régime est affiché **une seule fois** pour la partie, pas par Move.

### Feature Path (FP)

1. Le Player ouvre une partie analysée au niveau détaillé → en haut du panneau, il lit **combien de ses
   coups comptent** sur son total, **combien sont exclus et pour quel motif**, **combien d'erreurs sont
   comptées**, ce qu'il a **perdu** au total, et sa **dérive**.
2. Il additionne ce que le récapitulatif attribue aux erreurs signalées et à la dérive → il retrouve le
   total des chances perdues annoncé.
3. Il ouvre une partie où il a joué proprement mais s'est fait grignoter → les erreurs comptées sont
   nulles ou presque, et la **dérive porte l'essentiel** de ce qu'il a perdu.
4. Il ouvre la partie contenant une reprise forcée désastreuse → le récapitulatif annonce **plus
   d'erreurs signalées que d'erreurs comptées**, et **explique l'écart**.
5. Il lit le régime d'analyse de la partie → une seule mention, pas une par coup.
6. Il repasse au niveau intermédiaire → le décompte d'erreurs est de retour à sa place habituelle, et le
   récapitulatif a disparu avec le panneau.

Verify: UI first.

## Blocked by

- `03-the-phase-of-a-move.md`
- `04-which-moves-count.md`
