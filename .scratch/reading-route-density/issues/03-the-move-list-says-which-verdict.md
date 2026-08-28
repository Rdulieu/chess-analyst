Status: `ready-for-agent`

## Parent

`.scratch/reading-route-density/PRD.md` (US-22 — `BACKLOG.md`, grillée le 2026-08-27).
ADR : `docs/adr/0021-what-the-player-acts-on-never-moves.md`. Vocabulaire :
`CONTEXT.md` → `Declared severity`.

Implemented on the business-story integration branch `integration/US-22-reading-route-density` —
branch sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local
check (build + tests + this issue's Feature Path) is green.

## What to build

**La liste des coups dit *quel* verdict, pas seulement qu'un verdict existe.**

Aujourd'hui `⚖` signale qu'un verdict a été posé, et il faut ouvrir le coup pour savoir lequel. Les
cinq valeurs prennent donc leur glyphe, comme `CONTEXT.md` les écrit désormais sous
`Declared severity` : `??` `?` `?!` partagés avec le moteur, **`!` pour `Bon`** et **`✓` pour
`Correct`**. `✎` garde la `Note`, `◆` garde le `Key moment`.

**Ceci renverse une décision d'US-16a**, écrite dans le composant des marques, dont le commentaire est
à retirer avec elle : *« deliberately not the engine's severity glyph vocabulary — borrowing its marks
would suggest a measured verdict where there is only a declared one »*. La raison du renversement,
vérifiée : la confusion qu'elle craignait n'a **aucun écran** où se produire. La route de lecture rend
le diagramme sans aucune prop moteur, et la page `Analyse` ne rend pas les marques du joueur — les
deux vocabulaires ne coexistent nulle part.

Les deux valeurs que le moteur n'a pas **étendent** la notation plutôt que de l'emprunter : `!` est le
signe standard du bon coup, et `✓` vient volontairement d'une autre famille parce que `Correct` n'est
pas un jugement de qualité mais un constat d'examen — *j'ai regardé, je ne trouve rien à reprocher*.
Sans glyphe, un coup jugé `Correct` redeviendrait indiscernable d'un coup jamais regardé, ce que le
glossaire interdit mot pour mot : **le silence n'est pas une valeur**.

**Du même geste, la liste devient la vue d'ensemble** que la story cherchait — sans ajouter de bloc au
panneau qu'elle allège. Les notes n'y montrent toujours que `✎` : il faut ouvrir le coup pour les
lire, et c'est assez pour un premier temps.

> **Le piège à ne pas retomber dedans.** La FP d'US-16a a montré que « rien en indice purement
> chromatique » peut être tenu à la lettre et manqué en pratique : deux crayons que les noms
> accessibles distinguaient parfaitement et l'œil pas du tout à 16 px. Deux glyphes sont ajoutés ici —
> qu'ils se distinguent **à l'œil**, à la taille réelle, et pas seulement au lecteur d'écran.

## Acceptance criteria

- [ ] Les cinq verdicts portent chacun leur glyphe dans la liste des coups
- [ ] Chaque glyphe garde son **nom accessible**, et aucune teinte n'est le seul indice (ADR-0013)
- [ ] Un coup jugé `Correct` porte une marque ; un coup jamais regardé n'en porte aucune
- [ ] Verdict, `Note` et `Key moment` se distinguent **à l'œil** à la taille réelle, pas seulement au nom
- [ ] Les trois familles peuvent cohabiter sur un même coup sans se confondre
- [ ] Le commentaire d'US-16a qui interdisait ce vocabulaire est **retiré**, pas laissé à contredire le code
- [ ] La couche postérieure au scellement reste distinguable de la couche scellée dans la liste
- [ ] L'assertion 7 reste verte : la liste ne fait bouger aucun contrôle

### Feature Path (FP)

1. Je pose les cinq verdicts sur cinq coups différents → chacun se lit dans la liste avec sa propre marque.
2. Je juge un coup `Correct` et j'en laisse un autre intact → les deux se distinguent d'un coup d'œil.
3. Je parcours ma lecture sans rouvrir un seul coup → je vois tout ce que j'ai jugé, et où.
4. Je pose un verdict, une note et un moment clé sur le même coup → les trois marques se lisent séparément, à taille réelle.

Verify: UI d'abord — ce que la liste montre, lu à la taille où elle est rendue.

## Blocked by

- `.scratch/reading-route-density/issues/02-what-the-player-clicks-stops-moving.md` — la garde doit exister avant qu'on ajoute au panneau
