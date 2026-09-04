Status: done — **repassée HITL -> AFK le 2026-09-04, sur décision explicite du
demandeur** (run autonome de nuit). La raison du HITL tenait toujours : la tranche écrit dans une
base qu'ADR-0015 déclare irremplaçable. Ce qui remplace la présence humaine est donc la sauvegarde
`.backup` **avant** écriture, la portée bornée à un identifiant, et la re-jouabilité observée — ces
trois critères ne sont plus des precautions, ils sont le gate.

## Parent

PRD: `.scratch/unaided-default-and-verdict-tint/PRD.md` — business story **US-28**.

**Branche.** Sous-issue implémentée sur `integration/US-28-29-reading-screen-fixes` : brancher depuis
elle, remerger dans elle, jamais dans `develop`. Le merge `integration -> develop` reste humain.

## What to build

Remettre à « non vu » la provenance des lectures estampillées à tort par le défaut qu'US-28 corrige.

**Ce qui autorise cette correction, et qui doit être écrit dans le script.** `CONTEXT.md` interdit de
**deviner** une provenance : tout repli vaut « non vu », et l'app ne conclut jamais d'elle-même. Cette
règle interdit à l'**application** d'inférer ; elle n'interdit pas au **joueur d'énoncer un fait sur
ses propres lectures**. Le demandeur a énoncé ce fait le 2026-09-03 : **toutes ses lectures ont été
faites à l'aveugle jusqu'ici**. C'est cette phrase, et rien d'autre, qui autorise l'écriture.

**Le sens de l'erreur, à nommer aussi.** Remettre un drapeau à « non vu » est l'erreur *inverse* de
celle d'US-28 : elle flatte le joueur et surévalue la `Confrontation`, là où le défaut d'origine le
desservait. Elle est ici couverte par le constat du demandeur, et par lui seul — jamais par une
règle générale.

**La portée en base : une ligne, désignée par son identifiant.** Un seul enregistrement porte une
provenance à « vu » (`personal_analyses` id 4, partie 715, profil 3, scellée le 2026-09-02, le jour
même du constat). Le script cible **cet identifiant**. Ni `UPDATE` global, ni prédicat de date : un
rejeu après le correctif effacerait des provenances légitimes posées entre-temps. Le script est
re-jouable et sans effet au second passage.

**Le stockage du navigateur est un geste manuel**, hors de portée de tout script serveur : vider
`chess-analyst.engine-seen`. À documenter dans la tranche, pas à coder. Une seule lecture est encore
ouverte (partie 271) ; le joueur décide pour elle en connaissance de cause avant de sceller.

## Acceptance criteria

- [ ] L'état **avant** est relevé et montré au demandeur : la liste des lectures scellées avec leur
      provenance, telle qu'elle est en base.
- [ ] Le script cible la ligne **par identifiant**, jamais par un `UPDATE` global ni par une
      condition de date.
- [ ] Le script porte en commentaire ce qui l'autorise (le fait énoncé par le joueur) et le sens de
      l'erreur qu'il introduit s'il était appliqué à tort.
- [ ] Le script est **re-jouable** : une seconde exécution ne modifie aucune ligne, et c'est
      observé, pas supposé.
- [ ] Une sauvegarde de la base est prise avant écriture, selon la recette du projet (`.backup`, pas
      une copie de fichier — une copie peut corrompre là où `.backup` réussit).
- [ ] Après exécution, aucune lecture scellée ne porte une provenance « vu ».
- [ ] Le geste manuel sur le stockage du navigateur est **documenté** dans la tranche et exécuté par
      l'humain ; aucun code d'effacement n'est ajouté au client.
- [ ] Rien d'autre n'est modifié : aucun schéma, aucune `Evaluation`, aucune autre colonne.

### Feature Path (FP)

1. Avant toute écriture, consulter les lectures scellées et leur provenance → **une** lecture est
   marquée comme lue en connaissant le moteur (partie 715). C'est l'état de départ, montré au
   demandeur.
2. Prendre la sauvegarde, exécuter la correction → la lecture de la partie 715 est désormais marquée
   comme lue à l'aveugle ; les deux autres lectures scellées sont **inchangées**.
3. Réexécuter la correction → **zéro ligne modifiée**. La re-jouabilité est observée, pas supposée.
4. Vider le stockage de provenance du navigateur (geste manuel), puis ouvrir la `Confrontation` de la
   partie 715 → elle se présente comme une lecture **faite à l'aveugle**, ce qui est ce que le joueur
   affirme avoir fait.
5. Ouvrir une partie analysée, choisir un niveau montrant le moteur, ressortir → la provenance se
   repose normalement. La correction n'a pas cassé le mécanisme, elle a corrigé son passé.

Vérifier par la UI d'abord (l'étiquette de provenance sur la `Confrontation`) ; sonder la base pour
les étapes 1 à 3, où c'est la donnée elle-même qui est l'objet.

## Blocked by

- `01-every-opening-starts-unaided.md` — corriger le passé avant d'avoir arrêté la cause laisserait
  le défaut reposer de nouveaux drapeaux à tort dès la première ouverture suivante.
