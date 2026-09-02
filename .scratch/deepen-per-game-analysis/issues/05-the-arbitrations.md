# 05 — Les arbitrages du demandeur

Status: `ready-for-human`
Type: **HITL** — aucun code
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décisions **D3**, **D13**, **D18**, et ADR-0023.

## What to build

Rien. C'est un **point d'arrêt** : l'agent s'arrête, le demandeur décide. Gardé explicite parce que
les stories précédentes ont montré qu'une décision implicite se fait prendre par l'agent.

Le dossier de la tranche 04 est présenté, et le demandeur tranche :

1. **Le prédicat.** Lequel des cinq signaux remplit le cas « montré par la partie, non retenu par
   l'analyse » — ou aucun. Si la revue conclut qu'aucun ne sépare, la décision est de **documenter
   l'angle mort** et la tranche 06 change de nature.
2. **Son seuil.** À quelle valeur le signal retenu déclenche.
3. **Où dépenser le second bilan chess.com.** Un seul est disponible ; la décision a été
   explicitement reportée jusqu'ici, pour être prise sur un cas que la revue fait émerger.
4. **Ce que les mesures impliquent pour US-15c** : la `Phase` est-elle un axe assez solide pour porter
   un verdict ? Le dénominateur, après mesure du plancher, est-il celui sur lequel 15c doit conclure ?
5. **Le sort des demandes produit issues de la lecture de la 715** — la notion de `Coup manqué`
   (« gain manqué », coup 67), une valeur « je ne sais pas » dans la `Declared severity` (coups 43 et
   50), un mode « apprendre de mes erreurs » (coup 60). Chacune part en issue séparée ou est écartée.

L'agent **présente et ne tranche pas**. Il est en revanche tenu de dire ce qu'il recommanderait et
pourquoi, et de nommer ce qui rendrait un autre choix meilleur.

## Acceptance criteria

- [ ] Le dossier de la tranche 04 est présenté au demandeur, mesures et limites comprises.
- [ ] Une recommandation est formulée pour chacun des cinq points, avec sa raison.
- [ ] Le cas « aucun signal ne sépare » est présenté comme une issue légitime, pas comme un échec.
- [ ] Les décisions du demandeur sont consignées, avec leur date, dans le dossier de la story.
- [ ] Les demandes produit écartées ou reportées partent en issues séparées.
- [ ] **Aucun code n'est écrit dans cette tranche.**

### Feature Path (FP)

Aucune — tranche sans code. La revue humaine du dossier tient lieu de gate, et le merge de cette
tranche est une décision du demandeur.

## Blocked by

- [`04-the-review.md`](04-the-review.md)
