# `done` is a delivery state, not a sixth triage role

The triage state machine has five canonical roles — `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix` — and no terminal state. Practice invented one anyway: about forty
tickets under `.scratch/` read `Status: done`, a word that exists in no role list. The
`ready-for-agent` queue, which is what drives autonomy, is therefore majority noise — the delivered
tickets never left it.

Upstream does not fix this. Its `triage` skill moved on (it now covers external PRs, points at
`docs/agents/issue-tracker.md` for the backend, gained `AGENT-BRIEF.md` and `OUT-OF-SCOPE.md`) but
still has **five roles and no terminal state**, and its `triage-labels.md` seed confirms it.

We decided to **keep `done` and requalify it**: it is not a sixth triage role, it is a **delivery
state**, on a different axis. No file changes.

The five roles all answer *what should happen to this next* — sort it, question it, give it to an
agent, give it to a human, bury it. `done` answers *what happened*. They share one field without
contradicting each other because they exclude each other in time: a delivered ticket has left the
triage machine. `triage-labels.md` — the point of contact with upstream — stays untouched, and the
queue becomes **mechanically definable**: a ticket is in the queue if it carries `ready-for-agent`
**and not** `done`. That is checkable, so `verify-factory` can hold it.

The word proves nothing by itself; what proves a ticket is properly finished is the **gate** — build,
tests, lint, a green Feature Path with no blocking finding, and a merge commit. Today that proof is
written in free prose when it is written at all. So the rule tightens **forward only**: a new `done`
owes its coordinates in a fixed shape (date, PR or merge commit, gate result).

## Considered options

- **Add a sixth canonical role.** Rejected: it reopens, on the very file that is the contact point
  with upstream, the divergence this reprise exists to close (ADR-0025) — and it models a journal
  entry as a state in a machine whose every other state is actionable.
- **Convert the existing `done` tickets mechanically to `ready-for-agent` + a delivery line.**
  Rejected on inspection. Seventeen of them do carry the gloss in the status line (branch, date, gate
  result); **twenty-three read exactly `Status: done` and nothing else**. Building a delivery line for
  those means reconstructing dates and merge commits from git, ticket by ticket — an investigation,
  not a mechanical pass, and one that would write guessed dates into archives.

## Consequences

- **A deliberate divergence from upstream, the first one taken on the day we chose to follow it.**
  It is small and additive: upstream can add a terminal state tomorrow without breaking us.
- **The retroactive gap is named, not repaid.** The oldest `done` tickets do not carry their delivery
  coordinates, and will not. That is a fact of the history, not a debt.
- **A feature is closed when all its tickets carry `done`** — which gives `.scratch/` the closure it
  never had (audit §2.6), one level up, for free.
- **The factory has no glossary of its own**, and that is why `done` could drift unopposed:
  `CONTEXT.md` is the chess domain's glossary and this vocabulary does not belong in it. The factory's
  words live in `docs/agents/`, which is where this definition lands.
