Status: `done`

## Parent

`.scratch/personal-analysis/PRD.md` (US-16a — `BACKLOG.md`, découpée d'US-16 au grilling du
2026-08-24 en 16a / 16b / 16c).

Implemented on the business-story integration branch `integration/US-16-my-own-analysis` — branch
sub-work from it and merge back into it via PR, **not** `develop`. Auto-merges once the local check
(build + tests + this issue's Feature Path) is green.

## What to build

Ce qui rend une lecture **repérable** — dans la partie, et dans l'historique.

- **Sur la liste des coups de la lecture** : quel coup porte un verdict, une `Note`, un `Key moment`.
  D'un coup d'œil, sans ouvrir chaque coup.
- **La couverture** : quelle part des coups j'ai déjà examinés. C'est le chiffre qui dit si ma lecture
  est assez avancée pour être scellée — et c'est **le même fait** qu'US-16b rapportera à côté de la
  justesse, jamais fondu dedans. Ici, aucune justesse n'est calculée : rien ne compare encore.
- **Sur la page Analyse** : le **point d'entrée** vers la lecture, et l'état — *aucune / en cours /
  scellée*.
- **Sur la liste des parties** : la même marque, en colonne, comme l'état analysé l'est déjà — pour
  choisir la prochaine partie à travailler.
- **En mots, pas par la seule couleur** (règle non chromatique du projet).

## Acceptance criteria

- [ ] Sur la liste des coups, un coup portant un verdict, une `Note` ou un `Key moment` est repérable sans l'ouvrir
- [ ] Les trois sortes de marques se distinguent entre elles
- [ ] La **couverture** est affichée : la part des coups examinés
- [ ] Aucune justesse, aucun score, aucune comparaison n'apparaît (c'est US-16b)
- [ ] La page Analyse offre le point d'entrée vers la lecture de la partie
- [ ] La page Analyse dit l'état : aucune lecture / lecture en cours / lecture scellée
- [ ] La liste des parties porte la même marque, en colonne
- [ ] Une partie sans lecture invite à en commencer une
- [ ] Tous ces états sont dits **en mots**, pas par la seule couleur
- [ ] Rien ne déborde ni ne provoque de défilement horizontal, en thème clair comme sombre

### Feature Path (FP)

1. Depuis la liste de mes parties, je vois laquelle porte une lecture et laquelle n'en porte pas → l'état est lisible en mots.
2. J'ouvre la page Analyse d'une partie sans lecture → elle m'invite à en commencer une, et le point d'entrée y mène.
3. Sur la lecture, je pose un verdict, une note et un moment clé sur trois coups différents → chaque coup est repérable depuis la liste des coups, et les trois marques se distinguent.
4. Je lis la couverture → elle dit la part des coups examinés, et aucun score ni comparaison n'apparaît.
5. Je scelle → la page Analyse et la liste des parties passent à « scellée ».

Verify: UI first.

## Blocked by

- `.scratch/personal-analysis/issues/04-i-seal-my-reading.md`
