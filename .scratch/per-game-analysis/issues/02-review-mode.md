Status: ready-for-agent

## Parent

`.scratch/per-game-analysis/PRD.md` (US-15a — `BACKLOG.md`).

Implemented on `integration/US-15a-per-game-analysis` — branch from it, merge back into it, **not**
`develop`. Auto-merges on a green local check (build + tests + this FP).

## What to build

Le **`Review mode`** (`CONTEXT.md`) : le Player choisit ce que l'app lui montre du moteur, en **trois
niveaux** — **Unaided** (rien), **Annotated** (ce qu'US-7 et US-14 livrent : glyphes, `Evaluation`s,
barre, `Evaluation curve`, décompte d'erreurs), **Detailed** (en plus, le relevé du Move lu).

- **Un seul contrôle à trois niveaux**, jamais deux cases indépendantes : cacher les annotations tout
  en affichant « −28 %, meilleur : Bxh7+ » serait une page qui **se contredit**. Le toggle binaire
  actuel est remplacé.
- **Le défaut devient Unaided** : une partie s'ouvre pour être lue, et le verdict du moteur est
  quelque chose que le Player **demande**, pas que l'app impose. **C'est un changement de comportement
  assumé** — les annotations étaient affichées par défaut depuis US-7.
- **Le choix est mémorisé** entre les parties et les sessions (précédent : le `Profile` courant), pour
  être fait une fois et non à chaque partie.
- **Une exception, parce qu'elle répond à une question réellement posée** : **terminer un
  `Analysis pass` sur la partie en cours de revue fait passer cette revue en Annotated**. Sans cela le
  pass tourne des minutes, se termine, et l'écran est identique — un pass réussi devient
  indistinguable d'un pass sans effet. Le défaut mémorisé des **autres** parties n'est pas touché.
- **Le panneau de la tranche 01 devient `Detailed` seulement**, avec son **titre**, et une **ancre**
  vers lui placée **dans le panneau latéral** à côté du plateau — jamais au-dessus de la rangée : tout
  ce qui est empilé au-dessus du diagramme est de la hauteur que le diagramme n'a pas, et **le plateau
  doit être entier au chargement**. Défiler pour atteindre le panneau est acceptable ; ne pas savoir
  qu'il existe ne l'est pas.
- **Annotated reste exactement ce qui a été livré** : cette tranche change le **défaut** et le
  **contrôle**, rien du contenu d'US-7/US-14.
- **À amender, pas à contourner** : `HP-01` (étapes 7 et 9) et les suites client qui affirment
  l'ancien défaut affirment maintenant le nouveau, et le passage en Annotated devient une **étape**
  du parcours.

## Acceptance criteria

- [ ] Trois niveaux exclusifs, un seul contrôle ; aucun état ne peut afficher un relevé sans les
      annotations.
- [ ] Une partie analysée s'ouvre en **Unaided** : ni glyphe, ni `Evaluation`, ni barre, ni courbe, ni
      relevé.
- [ ] Passer en Annotated rend exactement ce qu'US-7/US-14 affichaient ; passer en Detailed y ajoute le
      relevé.
- [ ] Le niveau choisi survit à un rechargement et au passage à une autre partie.
- [ ] Terminer un pass sur la partie regardée met **cette** revue en Annotated ; le niveau mémorisé
      pour les autres parties est inchangé.
- [ ] Sur une partie **non analysée**, le contrôle n'offre rien à révéler et l'action d'analyse reste
      accessible.
- [ ] Le panneau porte un titre, et une ancre y mène depuis le panneau latéral, uniquement en Detailed.
- [ ] Le plateau est **entièrement visible au chargement**, dans les trois niveaux.
- [ ] `HP-01` et les suites client affirment le nouveau défaut ; aucune n'est neutralisée pour
      contourner le changement.

### Feature Path (FP)

1. Le Player ouvre une partie analysée → **rien du moteur** n'est affiché, et il peut lire la partie.
2. Il demande le niveau intermédiaire → les erreurs annotées, l'`Evaluation`, la barre et la courbe
   apparaissent.
3. Il demande le niveau détaillé → le relevé du coup lu apparaît, et une indication permet d'y aller
   depuis le haut de l'écran.
4. Il recharge la page → le niveau qu'il avait choisi est toujours là.
5. Il ouvre une **autre** partie → elle s'ouvre au même niveau choisi, sans re-demander.
6. Il repasse en Unaided, ouvre une partie **non analysée**, lance son analyse → à la fin du pass, la
   revue de **cette** partie montre les annotations sans qu'il ait rien à régler.
7. Il ouvre encore une autre partie → elle est revenue au niveau qu'il avait mémorisé.

Verify: UI first.

## Blocked by

- `01-the-best-line-end-to-end.md`
