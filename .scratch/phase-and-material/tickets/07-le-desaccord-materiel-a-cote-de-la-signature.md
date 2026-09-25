# 07 — Le désaccord matériel à côté de la signature

> **Tranche d'US-32**, implémentée sur la branche d'intégration `integration/US-32-phase-and-material` :
> brancher **depuis elle** et merger **dans elle**, jamais dans `develop`. Auto-merge après contrôle
> local vert (build + `npm test` + `lint` sorti 0 + **FP verte** + aucun finding bloquant).
> Spec : [`../SPEC.md`](../SPEC.md). Sortie de grill : **ADR-0035**, **ADR-0036** (+ amendement du
> 2026-09-25), `CONTEXT.md`.

**What to build:** la table des `Material signature` de `/stats` devient lisible et exploitable.
Chaque configuration porte son **désaccord matériel** (`± points`), et une seconde lecture met ce
désaccord en regard du win rate. Demandé par le demandeur le 2026-09-25 : « comparer le déséquilibre
matériel et le win rate ».

**Blocked by:** 06 — même écran, même bloc, et 06 y ajoute déjà deux tableaux. À lancer **après**.

**Status:** done
**Delivered:** 2026-09-25 · merge `MERGESHA` sur `integration/US-32-phase-and-material` (PR #131,
merge humain en attente) · gate: build vert, **704 tests serveur / 51 fichiers**, **1 111 tests
client / 71 fichiers**, `npm run lint` **sorti 0**, **Feature Path verte** sur une copie de la base
réelle (profils `DudulSmash`, `Nonomoho`), aucun finding bloquant. La revue indépendante en a rendu
**dix non bloquants**, dont les trois qu'elle conseillait de payer avant le merge, corrigés.

> **Les oracles du ticket ont été revérifiés et ils ont bougé.** Les comptes de couples mesurés le
> 2026-09-25 après la tranche 06 ne sont pas ceux d'avant (`DudulSmash` : **638** couples, et
> `≤ −9` en porte **81** là où le ticket en annonçait 55) — la tranche 06 a adopté la règle de
> phase de `Divider.scala` en entier, donc la frontière de finale, donc les demi-coups lus. Ce qui
> tient sans une retouche : **la courbe est monotone sur les deux profils**, et l'étalement dans la
> bande d'égalité de `DudulSmash` est **exactement** celui annoncé — **0 % à 83 %** sur 26
> configurations. Ce sont les chiffres mesurés qui sont affichés, pas ceux du ticket.
>
> **Le cas fondateur est à l'écran, et il n'est visible que sur `Nonomoho`** : `RR vs Q` n'atteint
> les trois parties que là (7 parties, 3 V · 0 N · 4 D, 43 %), et y affiche bien **+1**. Sur
> `Metalyst` la configuration existe dans 2 parties — sous la barre — et sur `DudulSmash` dans
> aucune.

---

## Le piège de cette tranche, et il est nommé dans un ADR

ADR-0036 s'intitule **« Un déséquilibre est une signature, pas un nombre »**, et son premier
argument est que **`RR vs Q` vaut +1 pion** — c'est-à-dire l'équilibre — pour la configuration même
qui a fait ouvrir la story. Ce ticket ajoute précisément ce nombre-là. Ce n'est **pas** une
abrogation, à trois conditions :

- [x] Le nombre est une **colonne**, jamais la **clef** : la signature reste ce qui identifie une
      ligne, et `RR vs Q` ne se confond avec aucune autre configuration à +1.
- [x] Le nombre ne **trie jamais** la table. L'ordre reste la **fréquence** (tranche 06).
- [x] Le nombre ne **regroupe jamais** les lignes de la table principale : deux configurations au
      même delta restent deux lignes, parce qu'elles sont deux parties d'échecs différentes.

**Et l'écran doit démontrer la thèse de l'ADR plutôt que la contredire.** C'est mesurable et c'est
mesuré ci-dessous : à delta nul, le win rate s'étale de **0 % à 83 %**. Le nombre situe la bande, il
ne dit rien **dans** la bande. Si la tranche rend ça visible, elle renforce ADR-0036 ; si elle laisse
croire que +1 veut dire « égal », elle le casse.

---

## A — La colonne `± matériel` sur la table des configurations

- [x] Chaque ligne porte le **désaccord matériel** du joueur : ses majeures et mineures moins celles
      de l'adversaire, en points, **signé** (`+3`, `0`, `−9`). Barème `Q 9 · R 5 · B 3 · N 3`, rois
      et pions hors sujet par construction (ils ne sont pas dans la signature).
- [x] Le barème est **écrit à l'écran**, une fois, pas seulement dans le code : un `+1` ne se lit
      pas sans savoir qu'une dame vaut 9 et deux tours 10.
- [x] `0` s'affiche **`0`**, pas `+0` ni `—` : l'égalité matérielle est une valeur, pas une absence.
- [x] La colonne est **triable par le serveur ? Non** — voir les trois conditions ci-dessus. Elle
      s'affiche, elle ne réordonne rien.

## B — La lecture qui répond à la demande : win rate par bande de matériel

C'est ici que la comparaison demandée devient lisible. Une **seconde table**, courte, sous la table
des configurations.

- [x] Une ligne par **bande de désaccord matériel** : `≤ −9`, `−8..−6`, `−5..−3`, `−2..+2`,
      `+3..+5`, `+6..+8`, `≥ +9`. Les bandes sont un choix à assumer à l'écran, pas à cacher.
- [x] Colonnes : la bande, le nombre de **couples (partie, configuration)**, les résultats V/N/D, le
      win rate. Comptes et taux ensemble, comme partout.
- [x] **Le dénominateur n'est PAS un nombre de parties, et ça se dit.** Une partie traverse
      plusieurs configurations, donc elle compte dans plusieurs bandes. C'est la même règle que la
      table du dessus dont la colonne ne s'additionne pas — à écrire, pas à sous-entendre.
- [x] **Mitigation écrite, et c'est le cœur du ticket** : à matériel égal (`−2..+2`), le win rate
      des configurations individuelles va de **0 % à 83 %**. La bande situe, elle ne prédit pas. La
      phrase doit être à l'écran, sinon le tableau se lit comme une loi.

### Oracles mesurés le 2026-09-25 (à revérifier, pas à recopier)

**Win rate par bande** — couples (partie, configuration) :

| bande | DudulSmash | Metalyst |
|---|---|---|
| `≤ −9` | 55 · 9 V 0 N 46 D · **16 %** | 68 · 2 V 3 N 63 D · **3 %** |
| `−8..−6` | 51 · 15 V 1 N 35 D · **29 %** | 91 · 16 V 3 N 72 D · **18 %** |
| `−5..−3` | 54 · 21 V 0 N 33 D · **39 %** | 104 · 21 V 7 N 76 D · **20 %** |
| `−2..+2` | 130 · 62 V 4 N 64 D · **48 %** | 215 · 72 V 26 N 117 D · **33 %** |
| `+3..+5` | 70 · 46 V 1 N 23 D · **66 %** | 119 · 62 V 20 N 37 D · **52 %** |
| `+6..+8` | 4 · 3 V 0 N 1 D · **75 %** | 41 · 28 V 3 N 10 D · **68 %** |
| `≥ +9` | 7 · 7 V 0 N 0 D · **100 %** | 49 · 37 V 7 N 5 D · **76 %** |

La courbe est **monotone sur les deux profils** : le matériel prédit bien, en gros.

**L'étalement dans une bande**, qui est la mitigation :

- `DudulSmash`, delta **0** : 17 configurations, win rate de **0 % à 83 %** (`B vs N` 3 parties
  83 %, `RBN vs RBN` 5 parties 80 %, et d'autres à 0 %).
- `Metalyst`, delta **0** : 22 configurations, de **8 % à 64 %**.
- `DudulSmash`, delta **+5** : de **33 % à 100 %** sur 7 configurations.
- `Metalyst`, delta **−6** : de **0 % à 75 %** sur 5 configurations.

**Et le cas fondateur**, à vérifier à l'écran : `RR vs Q` affiche **+1**. Une finale qui a coûté
149,6 des 175,3 points de la partie 715 se présente comme un avantage d'un pion. C'est l'illustration
d'ADR-0036, et elle mérite d'être visible plutôt que corrigée.

## C — Ce que la tranche ne fait pas

- [x] **Aucun score composite.** Pas de « performance ajustée au matériel », pas de résidu par
      ligne (« tu fais 12 points de moins qu'attendu à ce matériel »). À n = 3 un tel résidu est du
      bruit, et un chiffre unique s'optimiserait — c'est la discipline des trois lectures de la
      `Confrontation`, pour la même raison.
- [x] **Aucun changement d'ordre** de la table des configurations.
- [x] **Aucun temps moteur, aucune colonne en base, aucune migration** (ADR-0015) : le désaccord se
      dérive de la signature, qui est déjà là.

## Le reste de la porte

- [x] ADR-0013 : rien porté par la couleur seule — un signe `+`/`−` est du texte, pas une teinte.
- [x] Les deux tables tiennent dans **380 px**, `[data-scroll="x"]` autour de chaque table, la prose
      **dehors**. US-32 a déjà payé ce défaut une fois (925 px dans une fenêtre de 365).
- [x] **Coût nul sur `/stats`** : le désaccord est une fonction pure de la chaîne de signature, pas
      une relecture de PGN. `/stats` est déjà à 9,5 s à froid sur 186 parties et ~49 s sur 1 806 —
      cette tranche ne doit pas y ajouter une milliseconde de relecture. Mesurer avant / après.
- [x] Le barème vit **à un seul endroit** et est testé pour lui-même (`Q vs RR` = −1, `— vs —` = 0,
      `RR vs Q` = +1, une promotion déplace le delta).
