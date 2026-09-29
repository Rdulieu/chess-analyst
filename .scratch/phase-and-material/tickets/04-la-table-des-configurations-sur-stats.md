# 04 — La table des configurations sur `/stats`

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** le joueur ouvre `/stats` et voit **dans quelles configurations de finale il joue
et comment il s'en sort**, sur tout son historique. C'est la seconde échelle d'ADR-0036 : les chances
perdues sont solides **dans** une partie et creuses à travers le corpus, les résultats l'inverse.

**Blocked by:** 03 — la table replie la `Material signature` que 03 fait naître.

**Status:** done
**Delivered:** 2026-09-25 · merge `95dd707` · gate: build vert, 665 tests serveur / 48 fichiers,
1069 tests client / 69 fichiers, `npm run lint` sorti 0, FP 4/4 verte à `0fe45d9` (Profiles 1, 2, 3
et 4, chiffres conformes à l'oracle), aucun finding bloquant — le finding bloquant de la revue
indépendante corrigé avant le merge : `GET /api/stats` bloquait la boucle d'événements pendant les
48,9 s du rejeu, le serveur entier ne répondait plus ; `getStats` rend désormais la main toutes les
25 parties, et la mesure de contrôle (72 sondes sur une route tierce pendant la requête lente) ne
trouve plus aucun blocage.

- [x] `/stats` porte la table des `Material signature` du `Profile` courant (ADR-0014), sur ses
      parties qui atteignent la finale.
- [x] La monnaie est le **résultat de la partie** — victoires / nulles / défaites. Une partie compte
      **une fois par configuration traversée**.
- [x] Une configuration entre dans la table à partir de **3 parties**.
- [x] Chaque ligne porte **les comptes et le taux ensemble** — « 1 V – 2 D – 33 % ». Jamais un taux
      seul : à n = 3 il vaut ±29 points, et le dénominateur affiché est le garde-fou (ADR-0036).
- [x] Ce qui tombe sous le seuil est **compté et nommé en une ligne**, pas effacé.
- [x] La table **annonce sa portée** : sur combien de parties elle porte, et combien n'atteignent
      jamais la finale (654 sur 2 438 dans la base actuelle, soit 27 %).
- [x] Le tri fait remonter ce qui coûte plutôt que d'imposer un parcours de centaines de lignes.
- [x] Aucun indice uniquement chromatique (ADR-0013). Aucun changement de schéma.
- [x] La table est un **second objet**, pas le pli d'ADR-0017 : un taux de résultat n'est pas la
      somme des récapitulatifs par partie et ne doit jamais être présenté comme tel.

### Feature Path (FP)

1. Aller sur `/stats` → la table des configurations de finale apparaît.
2. Lire une ligne → elle porte ses comptes **et** son taux, ensemble.
3. Chercher une configuration vue 3 fois → elle est là ; une vue 2 fois → elle n'y est pas, mais le
   nombre de configurations reléguées est affiché.
4. Lire l'en-tête de la table → elle dit sur combien de parties elle porte et combien n'atteignent
   jamais la finale.

Verify: par la page `/stats`.
