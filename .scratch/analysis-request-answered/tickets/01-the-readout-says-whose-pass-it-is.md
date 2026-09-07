# 01 — Le relevé de passe dit de quelle partie il parle, et la demande reçoit une réponse

Status: ready-for-agent
Parent: `.scratch/analysis-request-answered/SPEC.md` (business story **US-35**)
Branche : depuis **`integration/US-35-analysis-request-answered`** → `feature/<ticket-ref>-<slug>`,
fusion **vers cette branche d'intégration**, jamais vers `develop`. C'est elle qui porte la sortie
de grill que ce ticket suppose (ADR-0011 réécrit, l'entrée `Analysis pass` de `CONTEXT.md`).

**Blocked by:** rien — démarrable immédiatement.

## What to build

Le `Player` demande l'analyse d'une partie et **reçoit une réponse**, et tout relevé de passe **dit
de quelle partie il parle**.

Aujourd'hui, ouvrir la page `Analyse` d'une partie affiche le relevé de la dernière passe du
`Profile` — même quand cette passe porte sur une autre partie — sans aucun libellé qui le dise, et
le bouton de lancement est désactivé dès qu'une passe tourne, n'importe laquelle. La demande n'est
donc jamais émise, et le message de refus que l'app sait déjà écrire n'est jamais atteint. Le
`Player` attend devant le travail d'une autre partie en croyant que c'est le sien.

Après ce ticket : le bouton reste cliquable, le refus arrive et **nomme la passe qui bloque**, et le
relevé — en cours **comme** terminé — répond d'abord à l'appartenance (« cette passe est-elle la
mienne ? »), en nommant la partie quand la passe n'en couvre qu'une.

## Acceptance criteria

**Le contrat de lecture**

- [ ] Le relevé de passe garde son scope `Profile` (ADR-0011 : c'est la dernière passe du profil qui
      est reportée, en cours ou non) et accepte en plus une partie **optionnelle** en paramètre.
- [ ] La réponse dit si la passe reportée **couvre** la partie demandée ; cette réponse est *absente*
      (et non `false`) quand aucune partie n'est passée — c'est le cas de « Mes parties ».
- [ ] La réponse porte l'**identité** de la partie couverte — les deux camps et la date —
      **seulement** quand la passe ne couvre qu'une partie ; absente sinon.
- [ ] L'identité transportée est de la **donnée**, jamais un libellé composé : le serveur ne
      fabrique aucune phrase.
- [ ] **Aucune migration** n'est écrite : la table des passes enregistre déjà les parties qu'une
      passe couvre.

**La garde de démarrage ne bouge pas**

- [ ] Un moteur, une passe à la fois : la garde reste « une passe tourne déjà », et elle continue de
      ne lire **ni** l'acquittement **ni** les parties visées. Le refus est un fait sur le moteur.
- [ ] Une demande refusée n'est **pas** mise en file d'attente, ni rejouée plus tard.

**Le bouton**

- [ ] Le contrôle « Analyser cette partie » / « Réanalyser cette partie » reste **cliquable** pendant
      qu'une passe tourne, quelle que soit la partie qu'elle couvre.
- [ ] Le drapeau « une passe tourne » disparaît de l'interface de ce contrôle : il n'y servait qu'à
      le désactiver, et devient mort.
- [ ] Le clic part, atteint la garde, et le refus s'affiche.

**Le libellé, cinq cas**

- [ ] Passe en cours **sur la partie regardée** → l'avancement, **sans** mention d'appartenance.
- [ ] Passe en cours **sur une autre partie, une seule** → l'avancement, la partie **nommée**.
- [ ] Passe en cours **sur un lot couvrant** la partie regardée → l'avancement, « dont cette partie ».
- [ ] Passe en cours **sur un lot ne couvrant pas** la partie regardée → l'avancement, « sur d'autres
      parties ».
- [ ] Passe **terminée** (résumé non acquitté) → les mêmes règles s'appliquent au résumé.
- [ ] Le refus « une analyse est déjà en cours » **nomme** la passe qui bloque.
- [ ] L'appartenance est **dans** la région live annoncée, pas à côté : elle s'entend avec la
      progression.

**Une seule façon de nommer une partie**

- [ ] La fonction qui nomme une partie pour la confirmation de réanalyse (les deux camps et la date)
      est **promue** au niveau de la feature d'analyse et **partagée** avec le relevé — une fonction,
      deux appelants, jamais dupliquée.
- [ ] La bannière et la confirmation nomment la même partie **avec les mêmes mots**.

**Deux phrases périmées du dépôt**

- [ ] Le commentaire du relevé affirmant qu'un résumé « stays until dismissed, so a Player cannot
      miss it » est retiré : ADR-0011 assume qu'une nouvelle passe supersède un résumé non acquitté.
- [ ] Le titre du test qui annonce scoper « to only this Game » est réécrit pour dire ce qu'il fait —
      il scope la **demande**, jamais le **relevé**.

**Ce qui ne régresse pas**

- [ ] Changer de `Profile` fait disparaître le relevé du précédent.
- [ ] Un rechargement rend le relevé non acquitté, **avec** son attribution.
- [ ] « Rien à analyser » reste distinct de « déjà en cours » : un `Player` qui vient d'autoriser un
      écrasement n'est pas contredit sur l'acte qu'il a autorisé.

## Seams (déclarés — ADR-0027)

Trois seams, **tous existants**, aucun nouveau ; et sur consigne du demandeur, **un seul test
nouveau**, le reste en amendements de tests qui doivent changer de toute façon.

1. **Le job d'analyse** (suite serveur existante `analysis job`) — le relevé répond de
   l'appartenance et de l'identité. Seam le plus haut côté serveur : il pilote la payload, la route
   par transitivité.
2. **Le composant de relevé** (sa suite existante) — les variantes de libellé, en props pures.
3. **La page d'analyse d'une partie** (la suite existante du visualiseur) — le câblage.

**Amendements (5)** : le test serveur qui compare la payload **au champ près** (il doit changer) ; le
test serveur *« single-flighted »*, qui sème **déjà deux parties** et lance une passe sur chacune —
le scénario croisé y est déjà, et son titre perd « ignored » puisque le refus est **répondu** ; les
deux tests de libellé du relevé (résumé complété, refus « déjà en cours ») ; et le test du
visualiseur au titre trompeur, retitré, où l'on assère que le bouton **n'est pas** désactivé — ce
qu'aucun test ne couvre aujourd'hui, et qui est aussi pourquoi la désactivation a pu être écrite.

**Le seul test nouveau** : une passe tourne sur la partie X, on rend la page d'analyse de la partie
Y du même `Profile`. Il ne peut pas être un amendement — aucun test existant ne rend deux parties
d'un même profil — et ce n'est pas un test de libellé : c'est le test de non-régression du défaut.

### Feature Path (FP)

1. Lancer l'analyse d'une partie **A** non analysée → le relevé montre l'avancement, **attribué à A**.
2. Aller sur une partie **B** du même `Profile`, jamais analysée → le relevé **nomme A** et dit que
   la passe porte sur une autre partie ; le contrôle « Analyser cette partie » est **disponible**,
   pas grisé.
3. Demander l'analyse de **B** → l'app répond qu'une analyse est déjà en cours **et nomme A**. B ne
   devient pas analysée.
4. Attendre la fin de la passe de A → sur la page de **B**, le résumé terminé est attribué à **A**,
   pas à B.
5. Redemander l'analyse de **B** → la passe démarre, et le relevé est attribué à **B**, sans mention
   d'une autre partie.
6. Recharger la page de **B** pendant sa passe → l'attribution survit.

Verify: par l'écran. L'état « analysée » de B est lisible à la surface, donc pas besoin de sonder la
base. Si l'observation de l'état « en cours » demande une passe assez longue, la fabriquer sur une
partie non analysée plutôt que d'attendre une passe réelle.

## Le gate

`CLAUDE.md`, énoncé une fois : le projet **build**, la **suite de tests** est verte, **`lint` a
tourné et rendu 0**, la **FP** ci-dessus est verte, et **aucun finding bloquant** n'est ouvert. Ce
ticket ne touche pas `docs/test-scenarios/tools/`, donc « tests » est **une** commande.
