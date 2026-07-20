# Business backlog

The **business** backlog carries the project's **user stories**. It is managed by humans
(PO / team); agents **read** it to start a design session and **post back** a traceability link
once the technical issues are created. It is the upstream source of the pipeline ("Understand
the need").

> Distinct from the **technical backlog** (`docs/agents/issue-tracker.md`), which is by and for
> agents. N business issues ≠ N technical issues: one story can yield several technical issues,
> or several stories can collapse into one.

## Tool

Tool: **Markdown local** — `BACKLOG.md` at the repo root.

- **Access / tool**: direct file edit (no CLI/MCP)
- **Location**: `BACKLOG.md` (repo root)
- **Auth**: n/a — plain file

## Agent queue (story selection)

The agent does **not** pick at random: a human **selects** the stories to work on upstream, by
moving their entry under a dedicated heading. The agent only picks from there.

- **Where the agent picks**: stories listed under the `## To do` heading
- **Transition at start**: `## To do` → `## Doing` when grilling is done + story selected +
  technical counterpart created
- **Transition to review**: `## Doing` → `## In review` when the PR opens

## Commands / gestures

```
# READ a story:        read BACKLOG.md, find the story by id/title
# COMMENT on a story:   append a line under the story's entry (e.g. "> linked: <PRD/issue link>")
# MOVE / change state:  cut the story's list item and paste it under the target heading
```

## Link to the technical backlog

Keep the **business reference** (story id or heading anchor) in the PRD / technical issues, for
two-way traceability.

    business backlog (story selected by a human)
      └─ /grill-with-docs   → CONTEXT.md + ADRs   (on integration/<business-ref>-<slug>)
          └─ /to-prd        → PRD on the technical backlog
              └─ /to-issues → technical issues + back-comment on the business story
                  └─ implementation (see git-flow)
