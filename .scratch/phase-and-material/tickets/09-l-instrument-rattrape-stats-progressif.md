# 09 — L'instrument et les scénarios rattrapent `/stats` progressif

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert. **La tranche touche `docs/test-scenarios/tools/` : « tests » est donc DEUX commandes,
> `npm test` ET `npm run test:tools`** (CLAUDE.md).

**What to build:** la tranche 08 a rendu `/stats` progressif. L'instrument qui surveille cet écran
ne le sait pas, et trois scénarios décrivent des écrans qui ont changé. On remet l'outil au niveau
de ce qu'il mesure — c'est la règle « une vérification qui ne peut pas tourner n'a pas réussi ».

**Blocked by:** 08.

**Status:** ready-for-agent

## A — Le trou de l'instrument, et c'est le vrai sujet

`docs/test-scenarios/tools/host/cdp.mjs:364` :

```js
const pendingRequests = (staleMs = 5000) => {
  return [...inflight.values()].filter((started) => now - started < staleMs).length;
};
```

Une requête en vol depuis **plus de 5 s cesse d'être comptée comme en vol**. Or `/api/stats/replay`
mesure **4,87 s** (DudulSmash), **5,58 s** (une autre mesure du même profil), **11,6 s** (Metalyst),
et jusqu'à **57,5 s** (Nonomoho, tranche 08). Le commentaire au-dessus explique le garde-fou — un
flux ou un long poll ne doit pas retenir la marche — et il a raison ; le problème est qu'un calcul
légitime de 12 s est désormais indiscernable d'un flux.

**Conséquence, mesurée par HP-02 :** `waitForScreen` considère `/stats` posé alors que le groupe
relecture charge encore. La passe thème a audité l'écran stabilisé **par chance de corpus**. Sur un
`Profile` plus gros elle auditerait un squelette en croyant lire la page — et rendrait vert.

- [ ] Attendre **le sujet**, pas le silence réseau : `/stats` est posé quand il ne reste plus de
      `section[aria-busy="true"]`. Le mécanisme doit être général (un écran déclare ce qu'il attend)
      plutôt qu'un cas particulier `/stats` câblé dans la bibliothèque.
- [ ] `pendingRequests` garde son garde-fou, mais **une attente qui expire doit se dire** : un
      `waitForScreen` qui rend la main sur un délai plutôt que sur une condition remplie ne doit pas
      être indistinguable d'un succès. C'est le « zéro silencieux » de CLAUDE.md, une couche plus
      haut.
- [ ] Tests dans `npm run test:tools` : une page qui met 12 s à se poser **n'est pas** déclarée
      posée à 5 s.

## B — `theme-pass.md` ne connaît pas l'écran en trois vagues

- [ ] La passe doit **dire dans quel état elle audite `/stats`** — et attendre l'état posé sur le
      sujet (`section[aria-busy]` disparu), pas sur le silence réseau.
- [ ] Et **le trou déjà connu, payé à la main trois passes de suite** : la passe audite `/analyse`
      *tel qu'il arrive*, donc en `Sans aide` depuis US-28, où les glyphes de gravité n'ont aucun
      sujet. HP-01 et HP-03 ont ajouté des lectures en `Annoté` à la main à chaque run. Ça appartient
      aux `openers` de `runThemePass` en argument de niveau de revue, pas à une consigne de dispatch.
      **C'est la troisième fois** — la quatrième serait une décision de ne jamais le faire.

## C — Les textes de scénario périmés, relevés et non corrigés par les runs

Chaque run a **refusé** de les éditer, comme il le devait. Ils sont dus ici.

- [ ] **HP-03 dit « trois figures »** (Goal, étapes 8, 12, 13). L'écran en rend **cinq** depuis
      US-26 — les trois du joueur plus « Ce que j'ai regardé chez l'adversaire » et « Ce que j'ai lu
      juste chez l'adversaire ». Rien n'est cassé ; un pilote qui compte exactement trois rendrait un
      **faux rouge**. Sur `/confrontation` le pli en montre toujours trois : les deux chiffres ne se
      contredisent pas, il faut le dire.
- [ ] **HP-03 étape 5** demande que l'app dise qu'un verdict sur un coup adverse ne sera pas noté.
      Depuis US-26 il **est** noté quand il tombe sur une `Opportunity`, donc l'ancienne phrase serait
      fausse. Le contrôle est à réécrire, pas l'app.
- [ ] **HP-01, HP-02, path 0** : le bouton dit « **Sélectionner et voir mes parties** » depuis US-23,
      les contrôles disent « Sélectionner ».
- [ ] **path 0** : les libellés de cadence à l'écran sont `Bullet, Blitz, Rapid, Classical,
      Correspondance` — trois anglais, un français. Ça a coûté **un import entier** à un run qui
      cherchait des noms français. Une ligne suffit.
- [ ] **path 0**, §Internals : la copie de snapshot n'est plus `wal_checkpoint(TRUNCATE)` → `.backup`
      depuis le 2026-08-31 ; « le checkpoint a-t-il été refusé » n'est plus une question qui a un sens.
- [ ] **HP-02 étape 15** décrit `/stats` par ses seuls groupes de lignes. L'écran porte aussi les
      trois tables du groupe relecture et le bloc dégâts — et la phrase d'état vide du bloc dégâts,
      qui est l'assertion à laquelle le demandeur tient le plus, **n'appartient à aucune étape**.

## D — Une régression de la tranche 08, petite et à nous

- [ ] Le bloc dégâts en échec affiche « Erreur : impossible de charger vos dégâts par phase
      (**Failed to fetch**). » — la chaîne brute du navigateur. C'est exactement le reproche que
      l'issue `profile-deletion/01` fait à un autre écran : le message du pilote au lieu du nôtre.
      Le contexte est à nous, la cause technique peut rester dans la console.

## La porte

- [ ] Build + **`npm test` ET `npm run test:tools`** + `lint` sorti 0 + FP verte + aucun finding
      bloquant.
- [ ] La FP de cette tranche doit **prouver le trou refermé** : un écran dont un bloc met plus de
      5 s n'est pas déclaré posé. Le faire sur `Nonomoho` (relecture ~57 s), le seul profil où la
      marge est confortable.
- [ ] Aucun scénario n'est modifié pour le faire passer : on corrige le **texte qui décrit mal
      l'écran**, jamais l'assertion qui gêne.
