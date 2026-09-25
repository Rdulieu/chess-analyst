# 05 — Suite HP et sortie de story (HITL)

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** la story sort. Suite HP complète sur le système réel, arbitrage sur la promotion
d'une HP, et PR `integration → develop` ouverte pour décision humaine.

**Blocked by:** 04 — la suite HP se joue sur la story entière.

**Status:** done
**Delivered:** 2026-09-25 · merge PR #131 (`integration/US-32-phase-and-material` → `develop`,
ouverte, **merge humain en attente**) · gate: build vert, **665 tests serveur / 48 fichiers**,
**1 072 tests client / 69 fichiers**, `npm run lint` **sorti 0**, **suite HP 3/3 verte** (+ path 0)
après correctif, aucun finding bloquant ouvert. La suite HP a rendu **rouge au premier passage** —
un bloquant, `/analyse` en « Détaillé » faisant défiler la page de côté à 380 px — corrigé par
`97a0cce` et HP-03 rejouée en entier, verte.

> **HITL.** Deux points de cette tranche appartiennent au demandeur et ne se tranchent pas seuls :
> la promotion éventuelle d'une HP, et le merge vers `develop`.

- [x] La **suite HP complète** est rejouée (prérequis compris) et rendue verte, sur des passes
      moteur réelles.
- [x] L'arbitrage **greffe vs nouvelle HP** est posé au demandeur : le plafond est à **trois HP**
      (CLAUDE.md) et les trois existantes sont pleines — greffer sur une HP existante est donc plus
      probable qu'en ouvrir une, mais c'est sa décision.
- [x] Le portail complet est vert sur la branche d'intégration : build, `npm test`, `lint` **sorti
      0**, FP 01→04 vertes, aucun finding bloquant ouvert.
- [x] La PR `integration → develop` **liste les tickets inclus** et **colle le résultat de la suite
      HP** (pass/fail + findings).
- [x] La PR nomme les deux constats que la story laisse ouverts : la **rétroactivité** des chiffres
      sous des lectures déjà scellées (même famille qu'US-37 et US-45), et le fait que la story
      **ajoute** un bloc à l'écran qu'**US-33** doit désempiler.
- [x] La PR est créée avec `--repo Rdulieu/chess-analyst` — le remote `upstream` fait sinon
      échouer `gh` sur un « No commits between » trompeur (git-flow).
- [x] **L'agent ne merge pas.** Il ouvre, il donne le lien, et il **revérifie la mergeabilité**
      avant de rendre la main (`BACKLOG.md` est le point de collision habituel).
- [x] Les cinq tickets portent leur ligne de livraison — date, référence de merge, résultat de gate
      (ADR-0026).

### Feature Path (FP)

La FP de cette tranche **est** la suite HP : les trois parcours existants, rejoués en entier sur le
système réel, plus leur prérequis.

Verify: par l'UI dans un navigateur, via la bibliothèque de pilotage sous `docs/test-scenarios/tools/`
(ADR-0020).

---

## Ce que la tranche a réellement coûté, et ce qu'elle a trouvé

**La suite HP a fait son travail : elle a trouvé un défaut de l'application, pas du pilote.**
HP-03, passe de thème, `/analyse` en « Détaillé » à 380 px : `scrollWidth` **925** pour un
`clientWidth` de **365**, dans les deux thèmes. Les deux tables d'US-32 étaient les **seules** de
l'app à ne pas porter `<div data-scroll="x">`, et leurs cellules tiennent leur largeur (908 px) pour
rester comparables en colonne — la page payait. `_tables.scss` énonçait déjà la garantie enfreinte.
Correctif `97a0cce`, trois tests unitaires sur le **markup** (rouges avant), HP-03 rejouée entière :
**365/365 aux trois niveaux de revue, dans les deux thèmes**, colonne la plus à droite atteignable,
phrase « pas atteint la finale » non enveloppée.

**Pourquoi dix suites précédentes ne l'avaient pas vu**, et ce n'est pas un hasard : `theme-pass.md`
auditait `/analyse` **tel qu'il arrive**, c'est-à-dire « Sans aide » depuis US-28, où la table n'est
pas rendue. HP-03 a passé un `openers` demandant « Détaillé » ; HP-01 ne l'a pas fait et sa passe
était **verte sur le même défaut**. Le trou documenté n'est pas cosmétique — il a caché un bloquant
visible par l'utilisateur pendant toute une story. Le refermer appartient à `theme-pass.md`, pas à
une consigne de dispatch qui pense à demander.

**Un finding de HP-03 était un mauvais diagnostic, et il a été réfuté par la mesure** plutôt que
recopié : « la table de `Material signature` est inatteignable pour tout Profile chess.com, parce
que `platform/chesscom/mapping.ts` écrit `divisionEndPly: null` ». Faux. `divisionEndPly` n'est lu
**nulle part** dans `analysis/` ni `stats/` — c'est un **oracle** pour la fixture des 415 parties,
pas une entrée (ADR-0035). La frontière vient de notre `phases(fens)`. Mesuré sur la base réelle,
en rejouant `crossedSignatures(gamePositions(pgn))` : **1 493 des 1 992 parties chess.com (74,9 %)
atteignent la finale et produisent des signatures**, contre 290 des 446 lichess (65,0 %), 0
illisible. Les deux parties de HP-03 étaient des mats au 31ᵉ et au 38ᵉ demi-coup — réellement sans
finale, ce qui est tout ce que son observation soutenait. L'AC centrale de la tranche 01 tient.
