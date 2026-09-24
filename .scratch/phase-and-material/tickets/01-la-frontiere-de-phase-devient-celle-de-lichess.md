# 01 — La frontière de phase devient celle de lichess

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036**, `CONTEXT.md`.

**What to build:** le découpage en phases de l'app cesse d'être le nôtre et devient celui de
`Divider.scala` (`lichess-org/scalachess`), appliqué à **toutes** les plateformes. Le joueur qui
ouvre une partie voit le ruban de phase tomber là où une implémentation éprouvée le met — et non
plus, trois fois sur quatre, sur le 15ᵉ coup.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

Cette tranche ne livre **aucune fonctionnalité neuve** : elle répare la règle que les tranches
suivantes vont exploiter. Sans elle, la répartition par phase naîtrait sur une frontière dont on a
mesuré qu'elle vient du cap du 15ᵉ coup dans **74,1 %** des parties (ADR-0035).

- [ ] Le milieu de partie commence à la première Position où `majorsAndMinors ≤ 10` **ou** la rangée
      de fond d'un camp porte **moins de 4** pièces **ou** `mixedness > 150` — n'importe lequel des
      trois suffit.
- [ ] La finale commence à la première Position où `majorsAndMinors ≤ 6`, inchangée.
- [ ] `mixedness` est transcrite fidèlement : 49 fenêtres 2×2 chevauchantes, un score par couple
      (blanches, noires) pondéré par la bande de rangées, sommé. **La position initiale vaut 0.**
- [ ] Le critère « développement achevé », le cap du 15ᵉ coup et `CapReading` sont **retirés** —
      la mesure D14 qui justifiait le paramètre est close et rien dans l'app ne le passait.
- [ ] Le latching est conservé : une partie qui a atteint la finale y reste.
- [ ] La règle est **la même pour lichess et chess.com** — aucune lecture de la colonne
      `division_*`, qui reste stockée et n'entre dans aucun calcul (ADR-0031).
- [ ] Une partie peut n'avoir **aucun milieu de partie** (98 sur 2 438, médiane 17 demi-coups) :
      c'est le `middle: None` de lichess reproduit, pas un trou à combler.
- [ ] La dérivation rejouée contre la division stockée s'accorde sur **toutes** les parties qui en
      portent une. Le test **écrit en toutes lettres** qu'il teste désormais une copie de lui-même
      et qu'il prouve la fidélité de la transcription, pas la justesse du seuil (ADR-0035).
- [ ] Aucun changement de schéma, **aucune migration** (ADR-0015) : la `Phase` est dérivée à la
      lecture, sur des FEN déjà stockés.
- [ ] La PR nomme la **rétroactivité** : sur les 78 parties analysées, la répartition passe de
      34,8 / 37,8 / 27,4 % à 24,2 / 48,4 / 27,4 % — 10,9 % des dégâts changent de phase et 12
      parties sur 78 changent de phase dominante. Aucune lecture scellée n'est modifiée en base ;
      ce sont les chiffres dérivés qui bougent.

### Feature Path (FP)

1. Ouvrir une partie analysée dont le milieu de partie tombait sur le 15ᵉ coup → le ruban de phase
   montre le milieu de partie commencer **plus tôt**, et la finale au même endroit qu'avant.
2. Ouvrir la partie **2429** → l'écran n'annonce **aucune finale**, et le dit plutôt que de laisser
   une zone vide.
3. Ouvrir une partie dont lichess publie la division → les deux frontières coïncident.

Verify: par le ruban de phase sur la route de revue. Sonder la base seulement si le ruban ne suffit
pas à distinguer les deux frontières.
