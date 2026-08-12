# 03 — Garde-fous de saisie de la plage

Status: ready-for-agent

## Parent

`.scratch/multi-month-import/PRD.md` (US-9). Décisions : `docs/adr/0010-range-import-as-fault-tolerant-background-job.md`.

**Branche** : sous-issue implémentée sur `integration/US-9-multi-month-import` — brancher depuis
elle et y remerger, **pas** depuis `develop`. Auto-merge après check local vert (build + tests + FP
verte, aucun finding bloquant).

## What to build

Protéger le Player des plages incohérentes ou saisies par erreur, **sans jamais lui interdire la
plage longue légitime**.

Quatre garde-fous, délibérément répartis entre serveur et UI :

- **Plage inversée** (premier mois postérieur au dernier) : saisie incohérente, refusée
  franchement par le serveur en **400**, aucun job démarré, et le Player est averti.
- **Dernier mois dans le futur** : **borné silencieusement au mois courant**. Un mois futur listé
  à zéro partie se lit comme un trou dans l'historique — c'est un faux négatif visuel, pas une
  information.
- **Nom d'utilisateur inconnu** : vérifié **une seule fois, avant de démarrer le job** → **404
  synchrone**, aucun job lancé, le Player averti **immédiatement** sans attente. Revérifier par
  mois serait du bruit : la réponse ne peut pas différer d'un mois à l'autre.
- **Plage très longue** : **aucun plafond serveur**. Reconstruire tout un historique en un Import
  est un usage explicitement supporté — c'est précisément ce qui motive US-9, et un plafond
  arbitraire le bloquerait. Le risque réel est la faute de frappe sur l'année (`2004` pour `2024`),
  et il est attrapé là où il se produit : **l'UI demande confirmation au-delà de 24 mois** de
  plage, et le serveur reste permissif.

## Acceptance criteria

- [ ] Une plage inversée est refusée en **400**, aucun job n'est démarré, et le Player est averti
- [ ] Un dernier mois postérieur au mois courant est borné au mois courant, silencieusement, sans erreur
- [ ] Une plage entièrement dans le futur se réduit donc à un périmètre vide et le Player en est informé, sans mois fantômes à zéro
- [ ] Le nom d'utilisateur est vérifié **une seule fois**, avant tout démarrage de job
- [ ] Un nom d'utilisateur inconnu rend **404** de façon synchrone, sans qu'aucun mois ne soit parcouru, et le Player est averti immédiatement
- [ ] Le serveur n'impose **aucun plafond** sur la longueur de la plage
- [ ] Au-delà de 24 mois de plage, l'UI demande confirmation avant de soumettre
- [ ] Confirmer lance l'Import normalement ; refuser ne lance rien et laisse la saisie intacte
- [ ] Une plage de 24 mois ou moins ne déclenche aucune confirmation
- [ ] Un mois sans archive chez chess.com reste traité comme un mois à zéro partie, sans erreur
- [ ] Build + suite de tests verts

### Feature Path (FP)

1. Le Player saisit une plage dont le premier mois est postérieur au dernier et lance l'Import → il est averti de l'incohérence et rien ne démarre
2. Le Player corrige la plage mais saisit un nom d'utilisateur chess.com inexistant → il est averti immédiatement, sans progression ni attente
3. Le Player corrige le nom d'utilisateur et saisit une plage de plusieurs années → une confirmation lui est demandée avant tout démarrage
4. Le Player refuse → rien ne démarre et sa saisie est intacte
5. Le Player relance et confirme → l'Import démarre et progresse normalement

Vérifier par l'UI d'abord. Archive de fixture via `CHESSCOM_BASE_URL` — jamais l'API chess.com réelle.

## Blocked by

- `.scratch/multi-month-import/issues/01-range-import-background-job.md`
