Status: done

## Parent

PRD: `.scratch/unaided-default-and-verdict-tint/PRD.md` — business story **US-29**.

**Branche.** Sous-issue implémentée sur `integration/US-28-29-reading-screen-fixes` : brancher depuis
elle, remerger dans elle, jamais dans `develop`. Auto-merge après contrôle local vert (build + tests
+ lint + FP verte, aucune observation bloquante). Le merge `integration -> develop` reste humain.

## What to build

Dans la liste des coups de la route de lecture, le glyphe du `Declared severity` devient une
**pastille teintée** aux couleurs de son auteur — les cinq mêmes que les boutons de sélection et que
la case de l'échiquier — pour qu'une lecture se reconnaisse d'un coup d'œil là où le joueur la
parcourt.

**La famille de couleurs est celle de l'échiquier**, avec l'encre constante de la notation : le fond
porte la couleur de la valeur, le glyphe est écrit dans l'encre sombre constante. C'est exactement le
couple que les boutons de sélection portent déjà, donc un contraste **déjà éprouvé sur les cinq
valeurs et dans les deux thèmes** — aucun jeton à créer, aucun contraste à valider. Les cinq valeurs
ont leur jeton, `Correct` et `Bon` compris.

**Ce n'est pas un franchissement de la frontière d'ADR-0013**, malgré les apparences : les boutons de
sélection sont du chrome et portent déjà cette famille. La frontière sépare des **auteurs**, pas des
surfaces — un élément de chrome qui parle pour l'échiquier porte les jetons de l'échiquier.

**Le piège, déjà payé une fois, à ne pas repayer.** L'attribut est `data-verdict`, **jamais**
`data-severity`. Le second est le crochet du glyphe du **moteur** et la feuille teinte *tout*
`[data-severity]` avec la paire de chrome : le poser ici ne colorerait que trois valeurs sur cinq et
ferait retomber `Bévue` à 2,75:1. Le contrôle de sélection a rencontré exactement ça et porte le
commentaire qui l'explique.

**Cinq règles écrites en toutes lettres**, jamais engendrées par une boucle : l'audit de cohérence lit
la feuille comme source et ne voit pas un nom de jeton assemblé par interpolation.

La forme suit celle du glyphe du moteur (mono, gras, rayon, retrait horizontal), pour que la liste
soit le même dispositif d'une route à l'autre. Le conteneur des marques pose aujourd'hui une encre
atténuée sur les trois marques, avec le commentaire « la teinte n'est jamais l'indice, donc aucune
n'est posée ici » : ce commentaire **devient faux** et doit être amendé en même temps. La note écrite
et le moment clé gardent l'encre atténuée ; seul le verdict prend la pastille.

**US-29 ne prend rien à US-26.** La règle du `Declared severity` exige déjà qu'une vue montrant les
deux auteurs les distingue « par autre chose que la couleur » : la couleur n'était pas disponible
pour porter cette distinction, donc la teinter ici ne consomme aucun canal. Ne pas essayer de
préparer l'écran d'US-26 ici.

## Acceptance criteria

- [ ] Les **cinq** valeurs du verdict sont teintées dans la liste des coups — `Bévue`, `Erreur`,
      `Imprécision`, `Correct`, `Bon`.
- [ ] La couleur de fond d'une valeur est **la même** que celle de son bouton de sélection et de la
      case sur l'échiquier ; l'encre est la notation constante.
- [ ] Le glyphe porte `data-verdict` à sa valeur et **ne porte pas** `data-severity`.
- [ ] Les cinq règles de la feuille nomment leurs jetons en toutes lettres, sans interpolation.
- [ ] Aucun jeton nouveau n'est déclaré ; l'audit de cohérence ne signale aucun jeton inconnu.
- [ ] Le nom accessible du verdict est **inchangé** : le glyphe et son nom parlé portent le sens
      seuls, la couleur s'y ajoute (ADR-0013).
- [ ] La note écrite (`✎`) et le moment clé (`◆`) gardent l'encre atténuée et ne prennent pas de
      pastille — les trois marques restent distinctes.
- [ ] Le commentaire du conteneur des marques, qui affirme qu'aucune teinte n'est posée, est amendé.
- [ ] La pastille reprend la forme du glyphe du moteur (mono, gras, rayon, retrait horizontal).
- [ ] La liste de la route d'`Analyse` — celle du moteur — est **inchangée**.
- [ ] Lisible dans les deux thèmes.

### Feature Path (FP)

Prérequis : une partie portant une lecture avec **au moins un verdict de chacune des cinq valeurs**
posé sur des coups différents. La base locale ne porte pas ce cas — la construire est une étape de la
FP, et il faut le dire plutôt que de la découvrir.

1. Ouvrir une partie et poser les cinq verdicts sur cinq coups distincts → chaque bouton choisi
   s'affiche dans la couleur de sa valeur.
2. Regarder la liste des coups → les cinq coups marqués portent chacun un glyphe **teinté**, et non
   plus un glyphe de la couleur du texte.
3. Comparer, pour une même valeur, la couleur dans la liste, celle du bouton et celle de la case
   d'arrivée sur l'échiquier → **la même**. C'est la demande.
4. Vérifier les cinq valeurs une à une, `Correct` et `Bon` compris → aucune n'est laissée sans
   couleur.
5. Poser une note écrite et un moment clé sur d'autres coups → leurs marques restent distinctes du
   verdict et ne prennent pas de pastille.
6. Sur un lecteur d'écran ou par le nom accessible, parcourir un coup marqué → le verdict est
   toujours nommé en mots ; la couleur n'a rien remplacé.
7. **Passe de thème** : basculer entre thème clair et thème sombre sur cet écran → les cinq
   pastilles restent lisibles dans les deux, glyphe compris. La famille retenue est constante entre
   thèmes, donc le risque exact est une pastille correcte en clair et fautive en sombre ; l'émulation
   de thème est un piège connu du projet et échoue **dans les deux sens** — la vérifier
   attentivement, et ne pas conclure sur une émulation qui se reverte.
8. Ouvrir la route d'`Analyse` sur une partie analysée → les glyphes du moteur y sont teintés comme
   avant, sans changement.

Vérifier par la UI, entièrement : c'est une story de rendu.

## Blocked by

None - can start immediately. Indépendante des tranches 01 et 02.
