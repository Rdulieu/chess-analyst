# 05 — Sur la page `Analyse`, aux niveaux moteur seulement

**What to build:** la même information sur `/analyse/:id`, pour que le joueur voie ce qui lui a été
offert **sans avoir à sceller une lecture** — 77 parties analysées contre 3 lectures scellées.

- Visible à partir du niveau **`annotated`**, et à `detailed`. **Jamais en `unaided`** : ce mode est
  aveugle par décision, et faire fuiter une mesure côté adverse le viderait de son sens.
- **Minimal** : l'information se pose là où la page dit déjà ce que le moteur pense, sans nouveau
  panneau, sans nouvelle colonne si une existante suffit.
- La **légende de la route de lecture** est neutralisée : elle ne doit rien laisser fuiter sur la
  partie en cours. La route est aveugle par nature ; sa légende ne peut pas être ce qui la trahit.
- Mêmes règles qu'à la tranche 04 : mots importés et non retapés, la couleur jamais seule, aucun
  glyphe ajouté à la courbe.

Implémenté sur la branche d'intégration `integration/US-30-judge-the-opponent`.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] En `unaided`, **rien** de la mesure adverse n'est rendu — ni texte, ni glyphe, ni attribut, ni
      classe, ni donnée dans le DOM. Test ancré : c'est la fuite qu'on empêche, pas l'affichage
- [ ] En `annotated` et `detailed`, l'`Opportunity` est visible sur les plis adverses
- [ ] L'ajout est minimal : aucun nouveau panneau, aucune nouvelle colonne si une suffit
- [ ] La légende de la route de lecture ne mentionne rien qui fuite, et un test le vérifie
- [ ] La couleur n'est jamais le seul indice ; mots et glyphes importés des modules qui les possèdent
- [ ] Aucune régression sur la page `Analyse` : sévérités du joueur, courbe, récap, ruban de `Phase`s

### Feature Path (FP)

1. Ouvrir `/analyse/:id` sur une partie analysée réelle en `unaided` → rien de la mesure adverse
   n'apparaît ; inspecter le DOM autour d'un pli adverse fautif : **rien** n'y est non plus
2. Passer en `annotated` → l'`Opportunity` apparaît sur ce pli, avec son mot
3. Passer en `detailed` → toujours présente, et le récap montre son bloc
4. Ouvrir la route de lecture sur une partie non lue → la légende ne dit rien de la partie en cours
5. Revenir en `unaided` → l'information disparaît à nouveau

Verify: l'étape 1 se vérifie **dans le DOM**, pas à l'œil — une information rendue invisible en CSS
reste une fuite.
