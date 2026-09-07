# 04 — La revue : quel signal sépare, et ce que les taux disent

Status: `done`
Type: AFK
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`, PR **vers elle**.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décisions **D6**, **D11**, **D12**, **D14**, **D18**, et ADR-0023.

## What to build

La mesure elle-même. Le rapport de la tranche 02 est lancé sur les deux corpus de la tranche 03, et
son résultat est instruit dans un dossier écrit.

**La question centrale : lequel des cinq signaux sépare ?** On regarde lequel distingue les coups que
lichess signale et que nous manquons, du reste. Un signal qui ne sépare pas est écarté **par les
données**, pas par une opinion.

**« Aucun des cinq ne sépare » est un résultat livrable.** C'est écrit ici pour qu'aucun agent ne se
croie obligé de trouver quelque chose : une conclusion négative renverrait à assumer l'angle mort sur
des données plutôt que par lassitude, et ADR-0023 l'admet explicitement.

**Attribuer chaque désaccord avant de l'expliquer.** Un écart avec lichess peut venir de leur seuil
ou de leur moteur, plus fort que le nôtre (profondeur 16, 2 lignes, WASM). La parade se lit sur des
données déjà stockées : notre `Best line` recommande-t-elle déjà leur coup ? Si oui c'est un
**seuil**, sinon c'est le **moteur**. Sans cette étape on cherchera un prédicat pour expliquer une
différence de force de moteur.

**Le contrôle humain est borné**, et c'est délibéré : il ne porte pas sur les ~800 coups du corpus
mais sur la liste que le rapport produit lui-même — les coups qu'un signal désigne et que personne ne
signale, et ceux que lichess signale qu'aucun signal ne rattrape. Le jugement humain vaut son prix
là, et pas sur les quatre-vingts coups évidents. Un jugement au coup par coup sur tout le corpus a
été rejeté : ce sont des jugements **rétrospectifs**, et on trouve toujours *une* explication à un
coup dont on sait déjà qu'il est mauvais.

**Quatre autres mesures**, toutes sur les mêmes lignes stockées :

- **La `Phase`** : combien de coups changent de `Phase` selon la lecture du cap, et quel est l'écart
  à notre découpage face au **découpage lichess** (disponible et ouvert). Un coup par partie : le
  débat est vide, on le clôt. Quinze : l'axe est fragile et 15c doit le savoir avant de bâtir dessus.
- **Le plancher à 10 %** : quelle part des coups d'une vraie partie tombe sous « position déjà
  décidée ». Si la part est grosse, le dénominateur de 15c l'est aussi.
- **Les coups forcés** : combien y en a-t-il, et sont-ils jamais signalés ? Le glossaire dit que
  `forced` **peut** exclure un coup signalé (un unique coup légal qui est une reprise catastrophique) ;
  « jamais vu » sur sept parties était un fait d'échantillon.
- **L'attribution** : quelle part des défaites s'explique par du bon jeu adverse **dans la partie
  encore disputée**, plutôt que par un effondrement.

**Deux notes de la lecture de la 715 sont de la matière**, à confronter aux mesures : le coup 33, où
le demandeur marque un coup **de l'adversaire** et demande l'attribution spontanément ; et le coup 74,
« j'ai pas vu que ma tour était en prise », où un humain confirme le signal **matériel** sans y avoir
été invité.

**Rien de tout cela ne devient une assertion de test.** Ce sont des mesures rendues au demandeur : les
figer ferait échouer la suite au premier retunage, l'exact contraire de la discipline d'ADR-0024.

## Acceptance criteria

- [ ] Le rapport tourne sur les deux corpus et rend des lignes pour toutes les parties.
- [ ] Pour chaque coup que lichess signale et que nous manquons, les cinq signaux sont relevés.
- [ ] Chaque désaccord avec lichess est attribué **seuil** ou **moteur** avant d'être expliqué.
- [ ] Le test de discrimination est conduit et son résultat écrit — **y compris s'il est négatif**.
- [ ] Les signaux sont relevés aussi sur les coups non problématiques, et le dossier le montre.
- [ ] Le contrôle humain porte uniquement sur la liste produite par le rapport, pas sur tout le corpus.
- [ ] La sensibilité de la `Phase` est chiffrée, et l'écart au découpage lichess est mesuré.
- [ ] La part de coups sous le plancher à 10 % est chiffrée, par corpus.
- [ ] Le nombre de coups forcés est chiffré, et l'on dit s'ils sont jamais signalés.
- [ ] L'attribution est mesurée sur la partie encore disputée, par corpus.
- [ ] Les deux corpus sont rendus **séparément** ; aucun taux n'est sommé à travers.
- [ ] Aucune de ces mesures n'est transformée en assertion de test.
- [ ] Le dossier nomme ses limites : la taille de l'échantillon, le biais de la stratification, et le
      fait que la lecture de la 715 n'est pas aveugle.

### Feature Path (FP)

1. Lancer le rapport sur les deux corpus → il rend une ligne par coup du Player pour ~20 parties.
2. Lire la liste que le rapport produit lui-même → elle nomme les coups où la mécanique se trompe,
   dans les deux sens.
3. Pour chaque coup manqué, lire les cinq signaux et l'attribution du désaccord → chacun est
   étiqueté **seuil** ou **moteur**.
4. Lire la conclusion du test de discrimination → un signal est désigné, ou il est écrit qu'aucun ne
   sépare.
5. Lire les quatre mesures — `Phase`, plancher, coups forcés, attribution → chacune est chiffrée et
   rendue **par corpus**, jamais sommée à travers.

Verify: la sortie du rapport et le dossier écrit. Aucun changement dans l'app à observer.

## Blocked by

- [`02-the-replayable-report.md`](02-the-replayable-report.md)
- [`03-the-two-corpora.md`](03-the-two-corpora.md)
