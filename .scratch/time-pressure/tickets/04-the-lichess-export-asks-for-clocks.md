# 04 — L'export lichess demande l'horloge

**Implémenté sur la branche d'intégration** `integration/US-15b-time-pressure` : brancher depuis
elle et fusionner dans elle, **pas** dans `develop`. Spec : `.scratch/time-pressure/SPEC.md`.
ADR-0031, et `CLAUDE.md` sur la migration due.

**What to build:** une partie lichess **nouvellement importée** arrive avec son horloge, et affiche
ses temps comme une partie chess.com. `clocks=true` et `division=true` rejoignent la requête
d'export, à côté de `since`, `until`, `pgnInJson`, `opening` et `sort` — le PGN embarque alors ses
`[%clk]`, et la réponse porte la division de lichess.

**La migration de cette tranche ajoute trois colonnes nullables sur `games`** : la **dernière
horloge** (celle du camp au trait qui n'a pas joué) et les **deux plies** de la `Lichess division`.
Elle est due dans la même tranche (`CLAUDE.md`) — non destructive, re-jouable, échouant bruyamment.
**Mais la discipline « nullable → backfill → `NOT NULL` » ne s'applique pas** : la nullité de ces
trois colonnes est **légitime et permanente**, et personne ne doit tenter de les resserrer.

**La `Lichess division` est stockée sans lecteur, exprès** (ADR-0031) : c'est un oracle pour vérifier
la future dérivation de `Phase` d'US-32, **jamais la `Phase`**. chess.com n'a aucun équivalent, donc
la lire là où elle existe et dériver ailleurs rendrait deux `Profile`s silencieusement incomparables.
Voir l'entrée `Lichess division` de `CONTEXT.md`, dont le nom dit la source.

`evals` et `accuracy` restent **exclus** : ils n'existent que là où quelqu'un a cliqué « analyser »
sur lichess, donc leur présence est une loterie, et c'est un oracle extérieur.

**Blocked by:** 02 — le temps par coup (sans elle, une horloge rapatriée ne s'affiche nulle part).

**Status:** ready-for-agent

- [ ] La requête d'export lichess envoie `clocks=true` **et** `division=true`.
- [ ] Elle n'envoie **ni** `evals` **ni** `accuracy`.
- [ ] La migration ajoute les trois colonnes nullables et **échoue bruyamment** plutôt que de
      laisser des lignes à moitié affectées ; elle est **re-jouable**.
- [ ] Un commentaire au bon endroit dit que ces trois colonnes sont **définitivement nullables** et
      pourquoi (chess.com n'a ni l'une ni les autres ; un **mat** n'a pas de dernière horloge).
- [ ] La **dernière horloge** est écrite quand la partie s'est terminée **sans que le camp au trait
      joue** (abandon, nulle acceptée, départ) et laissée **nulle sur un mat** — le tableau `clocks`
      porte alors autant d'entrées que de demi-coups.
- [ ] Rien ne **zippe** naïvement le tableau `clocks` contre les coups : il en porte **une de plus**
      hors mat, et le contrat de longueur est énoncé là où un lecteur le verra.
- [ ] Une partie lichess **en correspondance** n'a ni `clock` ni `clocks` chez lichess : son absence
      d'horloge se lit **« sans objet »**.
- [ ] Une partie lichess nouvellement importée affiche ses temps **comme** une partie chess.com,
      mais **en secondes entières** (son PGN arrondit).
- [ ] L'import ordinaire ne se met **pas** à écrire des PGN existants : « déjà présente » reste une
      non-écriture. Le rattrapage de l'existant est la tranche 05.
- [ ] Le gate : build + `npm test` verts, `npm run lint` a **tourné et rendu 0**, FP verte, aucun
      finding bloquant.

### Feature Path (FP)

**Contre la fixture** (`LICHESS_BASE_URL`), pas le vrai Lichess : il n'existe aucun second compte
lichess libre dans la suite, et ré-importer `Metalyst` supposerait de supprimer son profil, donc de
détruire 10 analyses. La fixture doit servir un PGN portant `[%clk]` **et** un tableau `clocks`.

1. Créer un `Profile` lichess neuf et importer une plage → l'import rapporte ses parties.
2. Ouvrir une des parties importées → ses temps par coup s'affichent, en **secondes entières**.
3. Ouvrir le récapitulatif → la lecture du temps est là.
4. Importer **la même plage** une seconde fois → tout est rapporté « déjà présente » et **aucun** PGN
   n'a changé.

Verify: par l'écran d'import puis la page Analyse. Sonder la base **uniquement** pour la dernière
horloge et les deux plies de division, qui n'ont volontairement aucun affichage.
