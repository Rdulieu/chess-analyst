Status: `done` — mergée sur `integration/US-22-reading-route-density` le 2026-08-28 (FP verte, 240 transitions à 0 px)

## Parent

`.scratch/reading-route-density/PRD.md` (US-22 — `BACKLOG.md`, grillée le 2026-08-27).
ADR : `docs/adr/0021-what-the-player-acts-on-never-moves.md`.

Implemented on the business-story integration branch `integration/US-22-reading-route-density` —
branch sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local
check (build + tests + this issue's Feature Path) is green.

> **Portail** : si la tranche touche `docs/test-scenarios/tools/`, elle passe `npm test` **et**
> `npm run test:tools`.

## What to build

**Le cœur de la story.** Ce que le joueur clique cesse de bouger.

Mesuré le 2026-08-27, partie 166, 46 plys : **45 transitions de coup sur 45 déplacent le stepper** —
33 × 28 px, 6 × 48 px, 3 × 24 px, 2 × 80 px, 1 × 114 px. Le panneau est rendu **au-dessus du stepper
dans le même volet**, donc ce ne sont pas seulement des blocs qui bougent, ce sont les boutons qu'on
est en train de cliquer. Amplitude : 194 px à 1400, **312 px** sous 900.

Trois gestes, indissociables parce que l'assertion ne peut être verte qu'avec les trois :

**Le panneau se réordonne** (ADR-0021) : d'abord ce sur quoi le joueur agit — le pas, le verdict, le
moment clé, l'éditeur de note — **ensuite** ce qui explique et ce qui varie : les notices, le relevé
de la couche scellée, « Où j'en suis ». La règle porte sur l'**ordre**, pas sur la hauteur : réserver
une hauteur fixe coûterait 194 à 312 px de colonne vide là où la place manque le plus, et le relevé
scellé n'a pas de maximum connaissable puisque sa hauteur dépend de son contenu.

**La notice de coup adverse passe dans la légende du fieldset**, raccourcie — c'est elle qui cause
33 des 45 sauts. Trois légendes, jamais combinées :

| état | légende |
| --- | --- |
| avant scellement, coup du joueur | `Mon verdict` |
| avant scellement, coup adverse | `Mon verdict — coups adverses non notés` |
| après scellement | `Mon verdict, après le scellement` |

Mesuré : les trois tiennent sur **une ligne** aux deux largeurs. La combinaison des deux clauses se
replierait (+19 px sous 900 px) et **n'a pas lieu d'exister** : après scellement rien n'est compté,
les marques postérieures étant écartées de la `Confrontation`, donc la clause adverse y serait
redondante. C'est le patron que le code emploie déjà pour l'état postérieur, et pour la raison exacte
dont on a besoin — un joueur qui a dépassé une notice voit un contrôle identique et se croit ailleurs.

**L'assertion 7 arrive avec le correctif**, dans `theme-pass.md` : parcourir les plys d'une lecture et
exiger **0 px** de déplacement du stepper et du fieldset de verdict, aux deux largeurs et dans les
deux thèmes. Une garde énoncée et jamais tenue est ce qui a laissé naître ce défaut : US-14 tenait
déjà le principe **au-dessus du diagramme**, et personne ne l'a gardé d'un ply au suivant.

Garde-fou : la notice est dite **moins souvent, jamais moins clairement**. La cacher derrière une
icône ou une infobulle n'est pas une option.

## Acceptance criteria

- [x] Sur une lecture non scellée, **aucun** déplacement du stepper ni du fieldset de verdict d'un ply au suivant
- [x] Idem sur une lecture **scellée**, couche postérieure comprise — l'état le plus riche
- [x] Idem à la largeur étroite, où l'amplitude était la pire
- [x] Le panneau rend les contrôles **avant** la prose, et l'ordre du DOM le dit — vérifiable en composant
- [x] Les trois légendes sont exactes, et une seule paraît à la fois
- [x] La légende tient sur **une ligne** aux deux largeurs, dans les deux thèmes
- [x] L'avertissement de coup adverse est lisible **avant** que le verdict puisse être posé
- [x] Après scellement, l'écran ne répète pas une règle sans objet
- [x] Le relevé de la couche scellée reste **lisible tel qu'il était** — aucune économie de hauteur ne le replie
- [x] `theme-pass.md` porte l'assertion 7, et elle est **verte** à la livraison
- [x] Aucune assertion existante n'est affaiblie ni retirée

### Feature Path (FP)

1. Je parcours une lecture coup après coup → les boutons de pas et les cinq verdicts ne se déplacent pas d'un pixel.
2. Je passe d'un coup à moi à un coup adverse → l'avertissement est là avant que je puisse poser un verdict, et rien n'a bougé.
3. Je scelle ma lecture, puis je reparcours → toujours aucun déplacement, ma lecture scellée reste lisible telle qu'elle était, et l'écran ne me répète plus une règle devenue sans objet.
4. Je refais tout sur un écran étroit → même résultat.

Verify: UI d'abord — ce que l'écran fait quand on change de coup, mesuré et pas jugé à l'œil.

## Blocked by

- `.scratch/reading-route-density/issues/01-the-suite-looks-at-a-narrow-screen.md` — sans la seconde largeur, l'assertion ne garderait qu'à 1280 px, là où l'amplitude est la plus **faible**
