### Ce qui a quitté la mémoire personnelle pour le dépôt (tranche 06)

La mémoire est indexée **par chemin de travail** : un worktree n'a aucune fiche, et la fiche n°1
était « worktree avant toute modification ». Onze fiches *load-bearing* étaient donc rangées dans le
seul endroit qu'un agent frais ne peut pas lire — ni un contributeur, ni une autre machine, ni une
CI (ADR-0028).

Chaque recette rapatriée est **réduite à un pointeur** vers le fichier du dépôt, pas laissée en
double : une deuxième source de vérité est exactement le reproche fait aux seeds de `build-factory`.

| Fiche mémoire | Rapatriée dans | Sort de la fiche |
| --- | --- | --- |
| `worktree-before-any-file-change` | `git-flow/WORKTREES.md` | pointeur |
| `worktree-node-modules-symlink` | `git-flow/WORKTREES.md` (les trois symlinks) | pointeur |
| `develop-tracks-node-modules-symlinks` | `git-flow/WORKTREES.md` (le slash de `.gitignore`, PR #57) | pointeur |
| `tsx-watch-resurrects-a-server` | `agentic-tests/DRIVING.md` §D0 | pointeur |
| `agentic-emulation-and-wal-copy-traps` | `agentic-tests/DRIVING.md` §D1 | pointeur |
| `hp-fanout-capped-at-two` | `agentic-tests/SKILL.md` §5.1 + `ORCHESTRATION.md` §O4 | pointeur |
| `agentic-subagents-lost-reports` | `agentic-tests/SKILL.md` §5.2 + `ORCHESTRATION.md` §O1–O2 | pointeur |
| `subagent-frozen-with-session` | `agentic-tests/ORCHESTRATION.md` §O3 | pointeur |
| `agentic-run-cost-from-transcripts` | `agentic-tests/ORCHESTRATION.md` §O6 | pointeur |
| `us7-hp-gate-pending` (la recette CDP) | `agentic-tests/DRIVING.md` §D0/§D1 | paragraphe remplacé ; le reste de la fiche (findings différés) est conservé |
| `us14-awaiting-human-merge` (`API_TARGET`/`PORT`) | `agentic-tests/DRIVING.md` §D0 | paragraphe remplacé ; le reste conservé |

`MEMORY.md` — l'index chargé à chaque session — porte le mot **POINTEUR** sur les neuf premières,
pour qu'aucune ne soit relue comme la source.

**Une recette rapatriée s'est révélée périmée en la relisant**, et c'est un bénéfice du geste plutôt
qu'un accident : la fiche US-7 prescrivait d'installer `puppeteer-core` dans le scratchpad. Node 22
fournit un `WebSocket` global, donc la bibliothèque parle CDP directement et il n'y a plus rien à
installer. Une recette dans le dépôt est relue ; une recette dans une mémoire personnelle ne l'est
jamais.

#### Ce qui **n'est pas** rapatrié ici, et pourquoi

- **Le throttle Lichess par IP et `/game/export/{id}`** — recettes de plateforme, elles relèvent
  d'**ADR-0018** (« les adaptateurs traduisent dans notre vocabulaire »).
- **La migration `NOT NULL` SQLite** (drizzle écrit à la main, `foreign_keys OFF`, `defer_foreign_keys`
  qui ne marche pas) — elle relève d'**ADR-0015**, qui est la raison pour laquelle une migration est
  due.
- **La mémoire vide d'un worktree n'est pas réparée.** C'est le signal, et il devient l'épreuve de
  la tranche 08 (ADR-0028). La symboliser serait un changement d'environnement non versionné, qui
  nous soulagerait ici en laissant le problème entier pour tout le monde — et qui détruirait
  l'épreuve.
- **Les fiches légitimement personnelles** (identité de commit, préférences de vocabulaire, journal
  des stories) restent en mémoire : c'est la règle de classement que l'absence de règle avait
  laissée dériver.
