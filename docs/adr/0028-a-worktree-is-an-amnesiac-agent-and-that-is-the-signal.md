# A worktree is an amnesiac agent, and that is the signal

The agent's memory is indexed **by working path**. A worktree is another path, so another project,
so an empty memory — and the proof is on disk:

```
projects/-home-…-chess-analyst                                  -> 56 memories
projects/-home-…-chess-analyst--claude-worktrees-US-22          ->  0 memories
projects/-home-…-chess-analyst--claude-worktrees-US-9-…-import  ->  0 memories
```

The first memory in that store reads *"worktree before any file change"*. **The rule that sends the
agent into the worktree is filed in the one place the worktree cannot read.** Every agent that obeys
it cuts itself off, at the first gesture, from about fifteen load-bearing recipes — the three
`node_modules` symlinks, the SQLite `NOT NULL` migration, Lichess's per-IP throttle, `tsx watch`
resurrecting a killed server, the fan-out ceiling, the lost-report recovery — and pays each trap
again. The two empty directories are dated from US-9 and US-22.

We decided **not to repair it**, and to write that down as intended rather than tolerated.

The real defect is not that the worktree is amnesiac — it is that fifteen critical recipes were filed
somewhere that is **not versioned, not reviewed, not shared, not revocable**, and that a contributor,
another machine or a CI will never have. The worktree breaks nothing; it **reveals**. So the
knowledge moves into the repo, next to the skill that needs it (`git-flow/WORKTREES.md`,
`agentic-tests/DRIVING.md`, `agentic-tests/ORCHESTRATION.md`), and a repatriated recipe leaves the
memory rather than doubling it.

And the flaw becomes the instrument. US-21's success criterion — *"a fresh agent, reading the method
and nothing else, takes no decision the repo contradicts"* — was unverifiable until this session
noticed that **a fresh worktree is exactly a fresh agent**, amnesiac by construction. A subagent
dispatched into a new worktree, asked to run a real slice, either finds the worktree, the symlinks,
the driver, the ceiling and the gate on its own, or names the recipe that is still missing. That is
the story's proof, and it costs one pass.

## Addendum, 2026-09-04 — a *subagent* in a worktree is not an amnesiac agent

The trial this ADR designed was run, and it **falsified its own instrument**. Memory is indexed by
working path, as stated — but the path that indexes it is the **session's**, not the agent's. A
subagent dispatched into a fresh worktree still belongs to the parent session, so it reads that
session's memory in full. Measured the same day: the worktree at `.claude/worktrees/factory-health-01`
produced **no memory directory at all**, while the subagent working there had the main checkout's
**58** entries.

The proof is in its own report. Asked which recipes it had to rediscover, it answered that the
fan-out ceiling `min(3, floor(nproc / 4))` "lives in my memory, **not in the repo**". That is false —
it is in `agentic-tests/SKILL.md` §5.1 and `ORCHESTRATION.md` §O4, put there hours earlier. It was
wrong *because* it had the memory and therefore never looked. A better demonstration of the defect
this ADR describes would be hard to design, and it arrived by accident.

So: **only a new session opened in the worktree is a fresh agent.** The instrument survives, the
dispatch does not — and the difference is a human gesture (starting a session there), not something
an orchestrator can arrange for itself.

**What the trial proved anyway, and it is not nothing.** Given only a ticket and the repo, the agent
found in writing: the gate and its `lint` clause, `/implement` and the independent review role, the
`L*` probes verbatim and runnable, that `/build-factory` is not replayed here, that a bare `done` is
forbidden, the ticket conventions, and the vocabulary constraints on its own output. What it had to
work out — the language and wrap of `docs/agents/`, "finished but deliberately unmerged", that a
dispatched subagent cannot invoke a skill — is now written down. **The repo answered every question
it was actually asked**; the open question is what a genuinely memoryless agent would have asked
instead.

## Considered options

- **Symlink the worktree's memory directory onto the main one.** Rejected. It is an environment
  change, outside the repo, **unversioned** — it follows neither another machine, nor a contributor,
  nor a CI. It relieves us here and leaves the problem whole for everyone else. It also destroys the
  test: manufacturing amnesia on purpose would be the only way back.
- **Both, in order — repatriate now, link at the end.** Kept as a *possible* sequel, not a
  commitment. It is only defensible once the trial has shown the repo suffices, and that is not known
  until delivery. What would be linked then is comfort (the SSH key, the vocabulary, the story log),
  no longer load-bearing knowledge.

## Consequences

- **Inside a worktree you also lose the legitimately personal notes**, and the agent restarts without
  the story history. A real inconvenience, named rather than hidden — not a technical trap.
- **Memory keeps only what is personal or session-scoped.** Anything a fresh agent must know belongs
  in the repo; that is now the classification rule, and it is what made the drift possible in its
  absence.
- **The worktree mechanism itself was never verified**, and repatriating a recipe documents a
  mechanism nobody has exercised — the declared location (`.claude/worktrees/`, per `.gitignore`) is
  the one no live worktree uses. **US-39** is opened for that; this ADR only rules the memory out of
  its scope.
