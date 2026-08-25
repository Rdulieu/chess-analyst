# Retours utilisateur — 2026-08-25, l'`Analyse personnelle` et la `Confrontation`

Première session de test **par le demandeur lui-même**, sur ses propres parties, après la livraison
d'US-16a et d'US-16b (PR #71 → #79, branche `integration/US-16-my-own-analysis`).

**Ce document n'est pas un backlog et ne tranche rien.** Il conserve les notes telles qu'elles ont été
écrites, parce que c'est leur mot à mot qui a de la valeur : une reformulation les alignerait sur ce
que le produit fait déjà, et c'est précisément l'écart qui est intéressant. Les annotations qui
suivent sont **de l'agent**, séparées et signalées comme telles — elles rattachent une note à une
décision existante, répondent à une question factuelle, ou signalent qu'une note **conteste** un choix
documenté. Aucune ne conclut : c'est au grilling de le faire.

## Ce qui était testable ce jour-là

- **Vraies parties du demandeur** (`DudulSmash`, chess.com), sur une copie de sa base locale.
- **Deux parties analysées** par le vrai moteur, profondeur 16, 2 lignes — plus deux autres pendant la
  session pour valider une règle de sélection (voir la note « 30/85 » plus bas).
- **Une lecture réellement écrite à l'aveugle, puis scellée** sur l'une d'elles — c'est elle qui a
  servi de matière à toutes les remarques sur le compte rendu. Elle est depuis conservée comme fixture
  (`server/test/fixtures/real-reading.ts`).
- L'écran de bilan (« Mes lectures ») ne reposait donc que sur **une** lecture.

---

## Les notes, telles qu'écrites

> # Retour test 25/08
>
> ## Profil
> 1) Quand je clique sur le nom d'un profil j'aimerais sélectionner ce profil et acceder à sa liste de parties.
>
> ## Mes parties
> 1) texte "30/85 positions évaluées" visible. A quoi cela correspond ?
> 2) Les dates sont elles véridiques ?
> 3) ajouter des possibilités de filtre/tri/recherche
>
> ## Analyse
> 1) certains boutons devraient etre des boutons alors que ce sont des liens
> 2) Je veux pouvoir avancer/reculer dans la partie avec les fleches du clavier
>
> ### Dans la liste des coups
> 3) Il manque un indicateur permettant de voir quel coup est actuellement visualisé
> 4) Il manque le numéro de chaque coup
>
> ## Analyse perso
> 1) Il manque un bouton pour confronter les analyses.
> 2) Le radio button pour sélectionner l'évaluation perso n'est pas ergonomique. Je voudrais des boutons un peu plus gros avec le logo du type d'erreur et des couleurs.
> 3) Les évaluations du joueurs doivent se retrouver dans l'historique des coups et le board sous forme d'annotations.
>
> ## COmpte rendu d'analyse
> 1) Il y a pleins d'infos mais ce n'est pas très visuel.
> 2) On aimerait pouvoir parcourir le board avec les flag visible et confronter les analyses.
> 3) Devoir cocher chaque coup analysé mais non important est fastidieux
> 4) Ce que j'ai vu juste n'ai pas clair
> 5) Il manque le verdict sur chacun des coups.
> 6) Je n'ai pas l'info de quand j'ai dit "ceci est une erreur" mais que ce n'en était pas une
> 7) L'évaluation du key moment n'est pas tres visible.
> 8) La liste des éva sur position déjà décidé prend beaucoup de place alor qu'elle n'apporte rien.
> 9) j'aimerais que le compt rendu mette en avant les divergences pour analyser en détail.

---

## Annotations de l'agent

### Le thème qui traverse la moitié des notes

Six remarques du compte rendu — **1, 2, 5, 6, 7 et 9** — plus « Analyse perso 3 » disent la même
chose sous six angles : **la `Confrontation` est agrégée, et le demandeur la veut coup par coup, sur
l'échiquier.** Elle donne aujourd'hui trois taux, une matrice et des comptes ; elle ne dit nulle part
*quel* coup a produit *quelle* case. Un joueur qui lit « 1 sur 4 » ne peut pas retrouver les trois
autres.

C'est cohérent avec le PRD, qui n'a jamais promis le détail par coup — mais c'est le premier usage
réel qui le réclame, et il le réclame six fois. À traiter comme **un sujet**, pas comme six tickets.

### Deux notes contestent une décision documentée

Elles ne sont pas des défauts. Elles sont un désaccord avec un choix qui a été pris exprès, et c'est
la chose la plus utile de ce retour.

**Compte rendu 3 — « Devoir cocher chaque coup analysé mais non important est fastidieux ».**
`CONTEXT.md` dit l'inverse, et le dit fort : *« `Sound` est ce qui rend la confrontation possible.
Sans lui, "je n'ai rien dit ici" et "je dis que ce coup est correct" seraient le même silence, et une
comparaison ne pourrait exposer que les manques du joueur, jamais ses réussites. »* Le coût que le
demandeur signale est **le prix exact** de cette garantie, et il vient de le payer sur 22 coups
comptés pour n'en examiner que 4. La question à ouvrir n'est donc pas « faut-il garder `Sound` » mais
**« comment le poser coûte-t-il moins cher »** — le backlog porte déjà une piste (verdict au clavier,
1–5 sur les cinq valeurs) qui répond à ça sans toucher au modèle.

**Compte rendu 8 — « La liste des éva sur position déjà décidé prend beaucoup de place alors qu'elle
n'apporte rien ».** ADR-0017 exige l'inverse : une partie où le joueur a joué quatre bévues peut
contribuer **zéro** erreur comptée, et *« un écran qui laisse cet écart illisible détruit la confiance
exactement là où la divergence est la chose à expliquer »*. Mais il faut distinguer **la décision** (le
rendre lisible) de **son rendu** (une liste, un item par coup). Sur la partie testée il y avait **16**
coups exclus, tous listés un à un — le volume vient du rendu, pas de la règle. Un compte et une phrase
tiendraient la décision d'ADR-0017 en occupant trois lignes.

### Notes auxquelles une décision ouverte répond déjà

**Analyse perso 1 — « Il manque un bouton pour confronter les analyses ».** La porte vers la
`Confrontation` n'apparaît **qu'une fois la lecture scellée** : avant le sceau il n'y a rien de figé à
confronter. C'est délibéré, et c'est déjà l'une des **questions laissées au demandeur** dans la PR
#77 et dans `.scratch/confrontation/issues/01-a-confrontation-exists.md`. Le retour la tranche de
fait : le premier utilisateur réel a lu l'absence comme un manque, pas comme une étape.

**Analyse 2 — flèches du clavier.** Déjà au backlog, sous une forme plus large : *« un verdict au
clavier (1–5 sur les cinq valeurs, flèches pour naviguer) »*. Voir aussi le constat « aucun raccourci
clavier » déjà consigné à propos du critère 40 d'US-16a. Le retour confirme la priorité ; il n'ouvre
pas un sujet neuf.

### Réponses factuelles à deux questions

**« 30/85 positions évaluées » — à quoi cela correspond ?** À une passe d'analyse **en cours**, avec
son avancement. Le compteur était juste, mais les 85 positions n'étaient pas les vôtres : c'était une
passe que **l'agent** avait lancée sur l'instance de test pour valider une règle de sélection de
scénario, sans l'annoncer. La note reste entièrement valable — *le libellé ne dit pas ce qu'il compte
ni qui l'a lancé* — mais le chiffre précis avait cette cause-là, et une US ne devrait pas partir en
chasse d'un fantôme.

**« Les dates sont-elles véridiques ? »** Oui. Elles sont lues à l'import depuis l'en-tête `[Date]` du
PGN chess.com et jamais recalculées : la partie testée porte `[Date "2026.08.13"]` et la ligne affiche
2026-08-13. Aucune conversion de fuseau n'est appliquée. *(Ce que la date ne dit pas, en revanche,
c'est l'heure : deux parties du même jour sont indiscernables dans la liste — ce qui rejoint « Mes
parties 3 », tri et filtre.)*

### Ce qui existe déjà et qu'une US ne devrait pas reconstruire

**Analyse perso 3 — annotations dans l'historique des coups.** La liste des coups **porte déjà** trois
marqueurs distincts, chacun avec son nom accessible : `⚖` verdict posé, `✎` note écrite, `◆` moment
clé. Ce qui manque est ce que la note vise vraiment : la **valeur** du verdict (bévue ? imprécision ?)
et sa présence **sur l'échiquier**. Le socle est là ; c'est un enrichissement, pas une création.

**Analyse 3 — indicateur du coup visualisé.** À vérifier avant d'ouvrir un sujet : la liste des coups
porte une mention du ply courant. Si elle existe mais ne se voit pas, c'est une correction de rendu,
pas une fonctionnalité.

### Une remarque sur la forme, qui vaut pour la suite

**Analyse 1 — « certains boutons devraient être des boutons alors que ce sont des liens ».** La
distinction est portée par le projet dans les deux sens : un lien navigue, un bouton agit. Une passe
agentique a par ailleurs relevé l'inverse ailleurs — la ligne de partie est un `button` alors qu'elle
navigue. Il y a donc probablement **une incohérence des deux côtés** à traiter d'un bloc, plutôt que
deux corrections isolées.

---

## Ce que ce retour ne couvre pas

L'écran **« Mes lectures »** (le bilan sur tout l'historique) ne reposait que sur **une** lecture
scellée au moment du test. Aucune note ne le concerne, et il serait imprudent d'en conclure qu'il va
bien : il n'a pas été exercé dans les conditions pour lesquelles il existe — des **dizaines** de
lectures. À reprendre dans une session ultérieure.
