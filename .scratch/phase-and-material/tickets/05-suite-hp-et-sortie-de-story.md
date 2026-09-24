# 05 — Suite HP et sortie de story (HITL)

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** la story sort. Suite HP complète sur le système réel, arbitrage sur la promotion
d'une HP, et PR `integration → develop` ouverte pour décision humaine.

**Blocked by:** 04 — la suite HP se joue sur la story entière.

**Status:** ready-for-agent

> **HITL.** Deux points de cette tranche appartiennent au demandeur et ne se tranchent pas seuls :
> la promotion éventuelle d'une HP, et le merge vers `develop`.

- [ ] La **suite HP complète** est rejouée (prérequis compris) et rendue verte, sur des passes
      moteur réelles.
- [ ] L'arbitrage **greffe vs nouvelle HP** est posé au demandeur : le plafond est à **trois HP**
      (CLAUDE.md) et les trois existantes sont pleines — greffer sur une HP existante est donc plus
      probable qu'en ouvrir une, mais c'est sa décision.
- [ ] Le portail complet est vert sur la branche d'intégration : build, `npm test`, `lint` **sorti
      0**, FP 01→04 vertes, aucun finding bloquant ouvert.
- [ ] La PR `integration → develop` **liste les tickets inclus** et **colle le résultat de la suite
      HP** (pass/fail + findings).
- [ ] La PR nomme les deux constats que la story laisse ouverts : la **rétroactivité** des chiffres
      sous des lectures déjà scellées (même famille qu'US-37 et US-45), et le fait que la story
      **ajoute** un bloc à l'écran qu'**US-33** doit désempiler.
- [ ] La PR est créée avec `--repo Rdulieu/chess-analyst` — le remote `upstream` fait sinon
      échouer `gh` sur un « No commits between » trompeur (git-flow).
- [ ] **L'agent ne merge pas.** Il ouvre, il donne le lien, et il **revérifie la mergeabilité**
      avant de rendre la main (`BACKLOG.md` est le point de collision habituel).
- [ ] Les cinq tickets portent leur ligne de livraison — date, référence de merge, résultat de gate
      (ADR-0026).

### Feature Path (FP)

La FP de cette tranche **est** la suite HP : les trois parcours existants, rejoués en entier sur le
système réel, plus leur prérequis.

Verify: par l'UI dans un navigateur, via la bibliothèque de pilotage sous `docs/test-scenarios/tools/`
(ADR-0020).
