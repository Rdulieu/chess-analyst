# 04 — La table des configurations sur `/stats`

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** le joueur ouvre `/stats` et voit **dans quelles configurations de finale il joue
et comment il s'en sort**, sur tout son historique. C'est la seconde échelle d'ADR-0036 : les chances
perdues sont solides **dans** une partie et creuses à travers le corpus, les résultats l'inverse.

**Blocked by:** 03 — la table replie la `Material signature` que 03 fait naître.

**Status:** ready-for-agent

- [ ] `/stats` porte la table des `Material signature` du `Profile` courant (ADR-0014), sur ses
      parties qui atteignent la finale.
- [ ] La monnaie est le **résultat de la partie** — victoires / nulles / défaites. Une partie compte
      **une fois par configuration traversée**.
- [ ] Une configuration entre dans la table à partir de **3 parties**.
- [ ] Chaque ligne porte **les comptes et le taux ensemble** — « 1 V – 2 D – 33 % ». Jamais un taux
      seul : à n = 3 il vaut ±29 points, et le dénominateur affiché est le garde-fou (ADR-0036).
- [ ] Ce qui tombe sous le seuil est **compté et nommé en une ligne**, pas effacé.
- [ ] La table **annonce sa portée** : sur combien de parties elle porte, et combien n'atteignent
      jamais la finale (654 sur 2 438 dans la base actuelle, soit 27 %).
- [ ] Le tri fait remonter ce qui coûte plutôt que d'imposer un parcours de centaines de lignes.
- [ ] Aucun indice uniquement chromatique (ADR-0013). Aucun changement de schéma.
- [ ] La table est un **second objet**, pas le pli d'ADR-0017 : un taux de résultat n'est pas la
      somme des récapitulatifs par partie et ne doit jamais être présenté comme tel.

### Feature Path (FP)

1. Aller sur `/stats` → la table des configurations de finale apparaît.
2. Lire une ligne → elle porte ses comptes **et** son taux, ensemble.
3. Chercher une configuration vue 3 fois → elle est là ; une vue 2 fois → elle n'y est pas, mais le
   nombre de configurations reléguées est affiché.
4. Lire l'en-tête de la table → elle dit sur combien de parties elle porte et combien n'atteignent
   jamais la finale.

Verify: par la page `/stats`.
