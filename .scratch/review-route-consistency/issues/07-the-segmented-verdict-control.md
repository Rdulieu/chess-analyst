Status: `ready-for-human` — **HITL**. Implémentée sur `feature/US-23-07-the-segmented-verdict-control` (`ebad5ba`), check local vert : build, 411 tests serveur + 828 tests client, 105 tests d'outillage, lint à 0, FP verte 6/6 dans les deux thèmes. **Non mergée** : la hauteur relevée revient au demandeur pour arbitrage.

> **Relevé (chiffres, pas jugement)** — viewport 900 px, `rows` = 5 partout, identique dans les deux thèmes et indépendant du verdict choisi :
> fieldset verdict **416,5 px** à 1280 et **435,5 px** à 380 ; panneau **816 / 946 px** (lecture non scellée), **836,5 / 957,5 px** (scellée).
> L'écart 1280→380 est de +19 px, entièrement dû au retour à la ligne de la phrase de `Correct`.
> Contraste de l'encre choisie sur sa teinte : 6,32 · 8,97 · 12,54 · 10,57 · 9,35 — tous au-dessus de 4,5:1, dans les deux thèmes.

## Parent

`.scratch/review-route-consistency/PRD.md` (US-23 — `BACKLOG.md`, grillée le 2026-09-01).
Relevé du grill : `.scratch/review-route-consistency/GRILL-NOTES.md`.

Implémentée sur la branche d'intégration `integration/US-23-review-route-consistency` — brancher **depuis
elle** et remerger **dans elle** par PR, **pas** `develop`. `npm run build`, `npm test`, `npm run lint` et
la Feature Path doivent être verts — **mais cette tranche ne s'auto-merge pas** : elle rapporte une mesure
dont l'interprétation est une décision humaine (voir plus bas).

> **Aucun travail serveur** dans toute cette story, donc **aucune migration**.

## What to build

**Le verdict devient un contrôle segmenté : cinq rangées, le glyphe, le mot, et ce que la valeur
affirme** (D8).

Deux constats fondent la décision :

- **La table de glyphes existe déjà** (livrée par US-22) et sert la liste des coups. Le « logo du type
  d'erreur » demandé est une **réutilisation** — et le contrôle et la liste diront le verdict avec **la
  même marque**, donc poser puis relire ne demande aucune traduction.
- **La gêne est de la mise en page.** Le `fieldset` est un flex qui passe à la ligne, donc les cinq
  valeurs refluent en petits couples `radio + mot` dans une colonne de 14rem : deux ou trois rangées de
  cibles minuscules.

**Cinq rangées pleine largeur**, chacune portant le **glyphe**, le **mot**, et **la phrase de ce que la
valeur affirme, rendue visible** — elle n'était qu'une infobulle de survol, donc invisible au clavier et
au tactile, alors qu'elle porte la phrase la plus chargée du modèle (« j'ai regardé, je ne trouve rien à
reprocher »).

Les entrées de formulaire restent **sous** l'apparence et l'étiquette devient la cible : on garde la
sémantique de groupe, l'annonce « 3 sur 5 », les flèches natives et l'exemption déjà écrite dans le module
clavier. La teinte vient en **renfort** du glyphe et du mot, jamais seule (ADR-0013) — elle réutilise les
tokens de la tranche 06.

**Les cinq phrases sont visibles en permanence, pas seulement sur la valeur choisie** : les afficher au
choix ferait bouger les quatre autres rangées **sous le doigt du joueur**, ce qu'ADR-0021 interdit
précisément. La hauteur du contrôle devient ainsi **constante**, là où le reflux la faisait dépendre de la
largeur.

Écarté au grill : cinq tuiles glyphe seul — les trois marques de faute deviendraient la seule distinction
visible entre trois valeurs voisines, ce qui exigerait de connaître la notation pour poser son propre
verdict. Écarté : de vrais boutons à état, ce que la note dit littéralement — on perdrait le groupe, donc
les flèches natives, l'annonce « 3 sur 5 » et l'exemption du module clavier : les flèches se remettraient
à changer de coup pendant qu'on choisit un verdict.

### Pourquoi cette tranche est HITL

Elle **fait grossir le contrôle dans la colonne qu'US-22 a passé une story entière à alléger**. Ce n'est
pas contradictoire — grossit ce sur quoi on agit, maigrit ce qui explique — mais « l'échiquier en
souffre-t-il » est un **jugement, pas une mesure**, et un seuil inventé par l'agent serait arbitraire.

La tranche ajoute donc à la passe de thème un **relevé** de la hauteur du panneau aux largeurs auditées,
et le **rapporte dans la PR**. C'est un relevé, **pas une assertion**. L'assertion qui compte existe
déjà et n'a pas à être écrite : la passe exige, en parcourant les plys, **zéro pixel** de déplacement des
contrôles de pas et du fieldset de verdict — c'est exactement le cas que ce contrôle met sous tension.

## Acceptance criteria

- [x] Les cinq valeurs sont cinq rangées pleine largeur, dans l'ordre affiché aujourd'hui (pire →
      meilleur), chacune portant glyphe, mot et phrase.
- [x] Le glyphe est **celui de la table partagée**, identique à celui de la liste des coups ; aucun glyphe
      n'est retapé en littéral.
- [x] Les phrases sont visibles sans survol, pour les cinq valeurs, **en permanence**.
- [x] Le contrôle reste un groupe à choix exclusif : flèches natives quand il a le focus, annonce du rang
      sur le total, et rien n'est présélectionné quand le joueur n'a rien dit — **silence n'est pas une
      valeur**.
- [x] Les raccourcis `1`–`5` posent toujours le verdict **dans l'ordre affiché** et **sans déplacer le
      focus**, et l'ordre affiché reste dérivé de la même source que les touches.
- [x] Retirer son verdict reste possible et distinct de « ne rien avoir dit ».
- [x] La légende continue de dire la couche postérieure et le coup de l'adversaire, sur une seule ligne
      aux largeurs auditées.
- [x] La hauteur du contrôle ne dépend plus du reflux : choisir une valeur ne déplace aucune rangée.
- [x] La teinte n'est jamais l'unique indice, et l'audit des tokens reste vert.
- [x] La passe de thème **relève et rapporte** la hauteur du panneau aux largeurs auditées ; son assertion
      de déplacement nul reste verte.

### Feature Path (FP)

1. Sur une lecture, les cinq verdicts sont cinq rangées portant chacune son glyphe, son mot et ce qu'il
   affirme — **sans survoler quoi que ce soit**.
2. Le glyphe de la rangée choisie est le même que celui qui apparaît sur ce coup dans la liste des coups.
3. Poser un verdict au clavier, puis un autre → la valeur change, **aucune rangée n'a bougé**, et le focus
   n'a pas quitté la page.
4. Entrer dans le groupe au clavier, parcourir les cinq valeurs aux flèches → elles marchent, et le rang
   sur le total est annoncé.
5. Parcourir dix plys → ni les contrôles de pas ni le contrôle de verdict ne se sont déplacés d'un pixel.
6. La hauteur du panneau est relevée aux largeurs auditées et **figure dans la PR**.

Verify: UI d'abord, au clavier et à la souris, dans les deux thèmes.

## Blocked by

- `06-the-verdict-on-the-board` — elle apporte les deux tokens de couleur de `Sound` et `Good`, que ce
  contrôle réutilise.
