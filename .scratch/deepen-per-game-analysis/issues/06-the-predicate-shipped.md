# 06 — Le prédicat livré : nommer sans compter

Status: `done`
Type: AFK
Branche : depuis `integration/US-15a-bis-deepen-per-game-analysis`, PR **vers elle**.

## Parent

[`PRD.md`](../PRD.md) — US-15a-bis. Décision **D15** et **ADR-0023**.

## What to build

Le contrat d'ADR-0023 rendu visible : *« je vous dis ce qui a coûté la partie, **et** je vous montre
ce que je ne compte pas »*.

Un coup de la zone morte que le prédicat retenu en tranche 05 désigne porte désormais **trois**
choses à l'écran : un **glyphe**, le **motif d'exclusion** inchangé (« ne compte pas : la position
était déjà décidée »), et le **signal** qui a fait qu'on le montre quand même (« du matériel a changé
de camp », « le mat est passé de 7 à 1 »).

Le mécanisme existe déjà : la tranche 04 d'US-15a a construit le cas « montré par la partie, non
retenu par l'analyse » pour les coups **forcés**, et personne ne l'avait jamais atteint. Il gagne ici
un second occupant, bien plus fréquent.

**Ce qui ne change pas, et c'est la promesse centrale** : `UncountedReason` garde ses **deux**
valeurs, `forced` et `decided`. Un coup de la zone morte reste exclu *comme décidé*, ce qui est vrai
de lui. Le signal est un **second axe**, pas un troisième motif — sinon le vocabulaire grossirait et
US-15c devrait décider quoi en faire.

**Le dénominateur ne bouge pas.** `countedMoves`, `excluded`, `chancesLost`, et la réconciliation
`flaggedLoss + drift === chancesLost` sont **identiques** avant et après cette tranche. C'est la
seule chose de la story qui n'a pas le droit de bouger, et c'est observable dans l'app : le
récapitulatif d'une partie affiche exactement les mêmes chiffres qu'avant.

**Le signal affiché est un fait mécanique, jamais notre adjectif.** Même discipline par laquelle le
glossaire refuse « erreur tactique » et montre **la ligne** : « du matériel a changé de camp » est
vérifiable par le Player sur l'échiquier.

**Cette tranche peut ne rien livrer.** Si la revue a conclu qu'aucun des cinq signaux ne sépare, elle
devient « documenter l'angle mort » : le dossier explique pourquoi l'app reste muette sur la fin des
parties perdues, l'app est inchangée, et ADR-0023 est amendé en conséquence. **Aucun agent ne doit se
croire obligé de trouver quelque chose.**

## Acceptance criteria

- [ ] Un coup de la zone morte désigné par le prédicat porte un glyphe.
- [ ] Il porte le motif d'exclusion inchangé, en mots.
- [ ] Il porte le **signal** qui l'a déclenché, en mots, comme un fait vérifiable et non un jugement.
- [ ] `UncountedReason` garde exactement **deux** valeurs.
- [ ] Le récapitulatif d'une partie affiche **exactement** les mêmes chiffres qu'avant la tranche :
      coups comptés, exclusions par motif, chances perdues, dérive.
- [ ] `flaggedLoss + drift === chancesLost` tient toujours.
- [ ] Un coup **forcé** signalé continue d'emprunter le même mécanisme, sans régression.
- [ ] Le glyphe ne repose pas sur la seule couleur pour être identifiable.
- [ ] Aucun changement de schéma, aucune migration, aucun temps moteur ajouté.
- [ ] **Si aucun signal ne sépare** : l'app est inchangée, le dossier documente l'angle mort, et
      ADR-0023 est amendé — et c'est un résultat accepté.

### Feature Path (FP)

1. Ouvrir une partie où un coup de la zone morte porte le prédicat retenu → le coup montre un
   **glyphe**.
2. Lire ce que l'app dit de ce coup → elle donne le motif « ne compte pas : la position était déjà
   décidée » **et** le signal qui l'a déclenché.
3. Vérifier le signal sur l'échiquier → il est constatable (du matériel a changé de camp, le mat s'est
   rapproché), ce n'est pas un jugement de l'app.
4. Lire le récapitulatif de cette partie → coups comptés, exclusions, chances perdues et dérive sont
   **identiques** à ce qu'ils étaient avant la tranche.
5. Ouvrir une partie contenant un coup **forcé** signalé → il porte toujours son glyphe et son motif,
   sans régression.

Si la tranche 05 a conclu qu'aucun signal ne sépare, la FP devient : ouvrir une partie de la zone
morte → l'app est **inchangée**, et le dossier explique pourquoi.

Verify: UI d'abord, sur la page Analyse.

## Blocked by

- [`05-the-arbitrations.md`](05-the-arbitrations.md)
