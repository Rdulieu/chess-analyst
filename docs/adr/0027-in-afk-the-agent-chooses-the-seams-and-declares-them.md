# In AFK, the agent chooses the seams and declares them

Two rules of the factory contradicted each other, and each agent settled it alone and differently.
`ready-for-agent` means "an agent can pick this up with no human context"; `tdd` says **"Test only at
pre-agreed seams. Before writing any test, write down the seams under test and confirm them with the
user. No test is written at an unconfirmed seam."** Nothing said which one yields.

The upstream reprise (ADR-0025) narrowed the contradiction without resolving it. The old `tdd`
demanded approval of *the plan*; the new one demands it only of the **seams** — but `implement`, the
three-role loop we adopt, drives `tdd` and asks for nothing. So the contradiction is now internal to
upstream, and it arrives here as-is.

We decided: **in AFK, the agent chooses the seams itself and declares them.** No approval is waited
for; the seams chosen are written down and carried into the PR, where they are visible to the human
who reviews the batch. "Pre-agreed" becomes "declared before the first test, and reviewable after".

## Considered options

- **The ticket declares its seams.** Rejected by the requester. It would have kept both rules intact
  by making the ticket the "user" — seams agreed at writing time rather than at test time, the way
  our tickets already carry an executable Feature Path — but it raises the bar on every
  `ready-for-agent` ticket and adds a section to the ticket template. The requester preferred the
  lighter path.
- **Every ticket goes back to HITL.** Rejected: it honours `tdd` by killing the queue, which is the
  thing autonomy is for.

## Consequences

- **The guard-rail is weakened, and that is the trade accepted.** The rule exists so testing effort
  lands on critical paths and complex logic instead of every edge case; an agent choosing alone
  chooses wide. What replaces the human "no" is the declaration plus the independent `code-review`
  role's **Spec** axis, which can check the tests sit where the ticket asked — after the fact rather
  than before it.
- **The declaration is not optional.** Seams chosen and not written down leave the decision
  unauditable, which is the state this ADR exists to end. An undeclared seam is a review finding.
- **Unproven, and to be measured.** Like the cost of the review role itself, this is a method decision
  taken without exercise. Both land on the same next few tickets, which makes them cheap to observe
  together: do the seams an agent picks alone drift wide, and does the review catch it?
