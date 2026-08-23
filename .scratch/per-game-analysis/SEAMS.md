# US-15a — coutures de test (validées 2026-08-21)

Notées pendant un `/to-prd` **interrompu** : le PRD n'est pas écrit, l'US doit d'abord être grillée
côté **front** (cf. `BACKLOG.md` et `QUESTIONS-FRONT.md`). Ces coutures-là sont acquises et n'ont pas
besoin d'être re-discutées ; **seule la couture 6 (client) peut bouger** avec les décisions de
présentation.

Principe : **toutes les coutures sauf une sont existantes**, et chacune est prise au point le plus
haut possible.

| # | Couture | Art antérieur | Ce qu'elle couvre |
|---|---|---|---|
| 1 | **Fonctions pures de `derivation.ts`** sur des lignes `Evaluation` stockées | `server/test/derivation.test.ts` (son helper `stored(pgn, evals)` fabrique exactement ces lignes) | `Phase` + latching, `Counted Move` + **quel** motif l'exclut, `Drift` en résidu, le récapitulatif par partie. **L'essentiel de la logique, à la couture la moins chère.** |
| 2 | **Driver UCI avec un transport scripté** | `server/test/engine.test.ts` | Extraction de la PV des lignes `info` ; les deux lignes `multipv 1`/`multipv 2` ; absence du second score quand il n'y a qu'un coup légal. |
| 3 | **`analyzeGame` / le job, avec le fixture engine** | `server/test/analysis.test.ts` | `Search regime` enregistré sur le pass, lignes portant `pass_id`, reprise même-régime qui continue, reprise **régime différent** qui réévalue la partie entière. |
| 4 | **Migration, assertée sur un second `openDb`** | `server/test/profiles-migration.test.ts` — précédent quasi exact | Les 1199 `Evaluation`s héritées rattachées à un pass synthétique (profondeur 16 / une ligne), `pv` null, les 20 parties toujours `analyzed`. |
| 5 | **Contrat HTTP** | `server/test/api.test.ts`, `annotations.test.ts` | La forme de la réponse du relevé par partie, et le cas de la partie non analysée. |
| 6 | **Composants client + logique client pure** | `ProfilesPage.test.tsx`, `arrows.test.ts` | Le rendu du relevé par Move et le tracé cumulé de la dérive. **Dépend des décisions de présentation encore à griller.** |
| 7 | **FP agentique par tranche**, et la question HP | `docs/test-scenarios/`, HP-01 traverse déjà la page Analyse | L'app réelle, UI-first. |

**Une seule couture nouvelle**, inévitable : la dérivation n'a aujourd'hui aucune notion de
**récapitulatif par partie**. C'est une nouvelle fonction exportée à la couture 1 — proposée au point
le plus haut, pour que le récapitulatif que l'agrégat de 15c pliera plus tard soit **la même
fonction** que celle qu'affiche la page (ADR-0017).

**Deux points explicitement hors des tests :**

- **La mesure MultiPV n'est pas un test.** Les seuils 1,5× / 2× sont une **mesure rapportée**, comme
  US-10b avait mesuré `/danger`. En faire des assertions donnerait un test dépendant du temps, qui
  casse sur une machine chargée et n'apprend rien. La mesure est rendue au demandeur, la décision
  reste la sienne.
- **HP-01 couvre déjà la page Analyse**, donc 15a **se greffe sur son étape 9** plutôt que d'ajouter
  un 4e HP — même choix qu'US-14 (au plus 3 HP).
