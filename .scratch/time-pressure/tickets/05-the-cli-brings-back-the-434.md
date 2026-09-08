# 05 — Le CLI rapatrie les 434 parties lichess

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure` : brancher depuis
elle et fusionner dans elle, **pas** dans `develop`. Spec : `.scratch/time-pressure/SPEC.md`.
**ADR-0030** et ADR-0015.

**What to build:** un CLI à **usage unique** rapatrie l'horloge et la division des **434** parties
lichess déjà importées, dont **`rapid` n'en a qu'une sur 231** qui porte l'horloge. C'est cette
tranche qui **fait exister l'axe rapid** : sans elle, la cadence pour laquelle la story existe reste
muette. Et le temps restant de **celui qui a abandonné** rejoint la lecture par partie.

`npm run repair:clocks -w server -- <db-file>`, sur la forme exacte de `repair:provenance`. **Un
geste unique** : les imports suivants portent l'horloge d'emblée (tranche 04). C'est pourquoi ce
n'est **pas** un bouton dans l'app — une surface permanente pour un besoin temporaire — et **pas**
un repli dans l'import ordinaire, qui ferait de « déjà présente » une écriture et ferait échouer
l'assertion ci-dessous **pendant un import de routine**.

**L'assertion EST la protection** (ADR-0030). Le CLI compare le mouvement entrant au mouvement
stocké et **échoue bruyamment** s'ils diffèrent. Mêmes coups ⇒ mêmes FEN ⇒ les `Evaluation`s des
**10 parties lichess analysées** survivent au remplacement du PGN. ADR-0015 ne couvre pas ce cas :
il parle de **schéma**, ceci est de la **donnée**.

**Il couvre les 434, pas les 318 de blitz + rapid** : un rafraîchissement partiel ferait dire deux
choses à « pas d'horloge » — *sans objet* pour une correspondance, *pas demandé* pour une
`classical`.

**Blocked by:** 03 — la lecture par partie (le temps du camp qui abandonne s'y ajoute) ; 04 —
l'export lichess (le CLI émet la même requête).

**Status:** ready-for-agent

- [ ] Le CLI prend une **`.backup`** avant d'écrire, **jamais un `cp`** : mesuré le 2026-08-27, un
      `cp` d'une base avec un `-wal` vivant a produit une copie qui **se relisait propre en ayant
      perdu une table entière**.
- [ ] Il **montre son travail** : les lectures avant, la sauvegarde prise, les lignes changées, les
      lectures après — comme `repair:provenance`.
- [ ] Mouvement **identique** ⇒ le PGN est remplacé, et les `Evaluation`s de la partie sont
      **intactes** (mêmes FEN, mêmes scores, mêmes `Best line`).
- [ ] Mouvement **différent** ⇒ **échec bruyant**, et **rien** n'est écrit — ni pour cette partie,
      ni pour les autres si l'implémentation est transactionnelle.
- [ ] Jamais de **suppression/réinsertion** : cela casserait la clé étrangère des `evaluations` et
      recompterait les `Move habit`s.
- [ ] Les `Move habit`s ne sont **pas** recomptés : les compteurs pré-agrégés sont identiques avant
      et après.
- [ ] Il couvre **toutes** les parties lichess, correspondance et `classical` comprises.
- [ ] Une partie qui **porte déjà** son horloge n'est pas touchée ; **relancer** le CLI ne change
      rien (idempotent).
- [ ] La **dernière horloge** et les **deux plies** de division sont écrits au passage.
- [ ] Le temps restant de celui qui a abandonné rejoint la **lecture par partie**, et se lit
      **« sans objet »** sur un mat et sur toute partie chess.com.
- [ ] Aucune assertion du gate ne dépend du **réseau réel** : Lichess a répondu dix `429`
      consécutifs le 2026-09-08 sur `/api/games/user`.
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, FP verte, aucun
      finding bloquant.

### Feature Path (FP)

Les assertions dures tournent **contre la fixture** (`LICHESS_BASE_URL`) et **doivent être vertes à
chaque passage** — un `429` de Lichess ne doit jamais peindre en rouge une assertion sur notre code.
Travailler sur une **copie** de la base, prise avec `.backup`.

1. Relever, avant, les évaluations et les verdicts d'une des **parties lichess analysées** →
   les noter.
2. Lancer le CLI sur la copie → il annonce sa sauvegarde et le nombre de lignes changées.
3. Ouvrir une partie **rapide** → ses temps par coup et sa lecture apparaissent, en secondes
   entières.
4. Ouvrir la partie analysée relevée à l'étape 1 → ses évaluations, ses verdicts et son
   récapitulatif sont **identiques**.
5. Ouvrir une partie **en correspondance** → elle reste **« sans objet »** sur le temps.
6. **Relancer** le CLI → il ne trouve rien à faire et ne change rien.
7. Servir, via la fixture, un PGN dont le **mouvement diffère** → le CLI **échoue bruyamment** et
   la base est inchangée.

Verify: par la page Analyse pour ce que le `Player` voit ; par la sortie du CLI et par la base pour
l'intégrité des `Evaluation`s et l'idempotence, que l'écran ne peut pas montrer.
