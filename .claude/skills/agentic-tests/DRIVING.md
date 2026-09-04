# Driving the app — the library, and the traps it encodes

Annex to the `agentic-tests` skill. The skill says *what* to do; this file says *how the app is
driven here*, and carries the evidence behind every shape the driver library has. Split out on
2026-09-04 with `ORCHESTRATION.md`, for the same reason: none of it is needed to read the runner's
rules, and all of it was being loaded on every invocation.

Read it before you drive the app for the first time in a session, and whenever a reading looks like
a defect — the odds are it is in here.

| Section | What it covers |
|---|---|
| **D0** | Starting the app: ports, a second instance, the watcher that resurrects a server |
| **D1** | What a dispatch must pin, and the evidence the library encodes |
| **D2** | The driver library — call it, do not re-derive it |
| **D3** | Upstream's generic surface/driver table, kept for another repo |

## D0. Starting the app, and the two ways it lies to you

**`tsx watch` resurrects a server you killed, and a free port proves nothing.** The dev server runs
under a `tsx watch` wrapper: killing the listener leaves the wrapper alive, and the next edit to a
source file makes the watcher **start a new server on that port**. What is then serving is code you
never meant to test. Two consequences, and neither is optional:

- For a run that validates a commit, use **no watcher at all** — `launchApp` starts `tsx src/main.ts`,
  one pid, no resurrection.
- **Never conclude "the app is stopped" from a free port.** Kill the wrapper, or check `ss -lptn`
  and the process tree. `stopApp` walks the port's holders and throws if one is still listening,
  which is the only proof that counts.

The **client** is a deliberate exception: the suite drives the Vite dev server, which *is* a
watcher — but it hot-reloads rather than resurrecting, and building the client instead would change
what is under test (a production bundle, not the app the whole suite drives). Known constraint, not
a defect to rediscover.

**A second instance of the app, on its own ports and its own database.** Needed whenever another
session already holds `:3001`/`:5173` — without it a Feature Path validates the wrong database, which
looks like a passing test:

```bash
DB_FILE=/my/scratch/scenario.db PORT=3099 npm run start -w server
API_TARGET=http://localhost:3099 npx vite --port 5199        # the Vite proxy target is overridable
```

`launchApp` does this for you and **refuses to fall back on the project's defaults** — an agent that
forgets its ports gets an error rather than somebody else's app on `:3001`.

**One worktree per *state*, not merely per agent.** To compare two commits — the shape that turned
three "identity" Feature Paths into real evidence on 2026-09-04 — add a second worktree at the base
commit beside the feature one and run an instance from each, then diff what the screen says. It costs
a `git worktree add` and three `node_modules` symlinks (`git-flow/WORKTREES.md`).

**Launch in the background, and detach properly.** A foreground `node` boot killed at the shell's
timeout takes the *detached* app children with it, leaving free ports and a chrome-error page — a run
that dies there proves nothing rather than failing. And a `nohup … &` started from a Bash tool call
**dies with the shell** at the tool's 2-minute timeout (hit twice on 2026-09-04). Use `setsid`, or
split the drive across several calls.

**No `puppeteer-core` to install.** Node 22 ships a global `WebSocket`, so the library speaks CDP
directly. Earlier runs each installed a driver into a scratch directory of their own; that is
superseded — and installing anything into the repo for a test run never was acceptable.

## D1. Isolation kit — what every dispatch prompt must pin

**Rewritten 2026-08-27 (US-18 slice 03), in replacement.** What this section used to be was
a recipe: eleven mechanics an agent had to re-derive, each one written up with the run it cost.
Those mechanics now live in `docs/test-scenarios/tools/host/app-lifecycle.mjs` (§D2) and are
executed rather than read. Only two things belong here now — **what a dispatch must pin**, and
**the evidence** for why the library does what it does, so nobody "simplifies" it back.

An old, well-evidenced instruction that keeps sitting beside a new one always wins; that is why
this is a replacement and not an addition.

**What every dispatch prompt must still pin**, because no helper can choose these for an agent:

- [ ] **Its own server port, its own client port, its own CDP port, and its own `DB_FILE`.**
      `launchApp` refuses to fall back on the project's defaults — an agent that forgets its
      ports gets an error rather than somebody else's app on `:3001`.
- [ ] **Ports it has *checked*, not merely been assigned.** On 2026-08-22 two orphans from the
      previous day still held an assigned pair. `launchApp` throws naming the port; the agent
      then **shifts to a free pair, says which, and reports the orphans for their owner** — it
      does not kill what it cannot prove is its own.
- [ ] **Its own private browser.** `launchBrowser` gives it one, with its own `--user-data-dir`
      and its own debugging port.
- [ ] **The state it is handed**, with figures, and which parts of that state are deliberate.
- [ ] **Teardown, and the proof of it.** `stopApp` frees the ports and verifies them; it throws
      if anything is still listening that it did not deliberately spare.

**The evidence the library encodes.** Each of these cost a run. They are recorded so that a
future reader knows the helper's shape is measured rather than defensive — and so that a bug in
a helper is recognised as *this* returning, not as a new mystery.

- **Restore before starting.** A server creates its database when it opens it, so a copy laid
  down afterwards is overwritten by a live process.
- **`PRAGMA wal_checkpoint(TRUNCATE)` → `.backup` → read the copy back — and the two halves
  catch different things.** Measured 2026-08-27 against a **2 MB `-wal` held open by a writer**:
  a `cp` without a checkpoint produced a copy that **read back clean** while having silently lost
  an entire table and its 400 rows. So the read-back is **not** what saves you from the WAL trap:
  it catches corruption (`database disk image is malformed`, a table that will not open, a file
  with no table in it) and it is blind to silent loss. **`.backup` is what protects; the
  read-back is what catches corruption.** Both are needed, and neither substitutes for the other.

  Two corollaries, both measured the same day. The checkpoint **can be refused in silence** — under
  a writer it returns `1|0|0` with exit status 0, the leading 1 meaning busy. Refused does not mean
  without effect: a busy checkpoint has been seen merging 49 frames of 49 and failing only to
  *truncate*, so read `framesMerged` rather than assuming either way — and never assume the WAL was
  emptied, which is why `.backup` is the half that must not be dropped.
  And `cp` is not *reliably* wrong: on a database whose `-wal` is empty it copies perfectly, which
  is exactly why "it worked when I tried it" is no argument. `restoreSnapshot` does the whole
  sequence and returns both the row counts and whether the checkpoint was refused.
- **But *seed* AFTER the server is up** (2026-08-23): restoring and seeding want opposite orders.
  An agent copied the database, wrote `analyzed = 1` into the copy, started the server and read
  the rows back as **0** — the copied sidecars and the open-time checkpoint discarded the write.
  Seeding is a fallback: prefer state the UI can produce, and say in the report what you seeded
  and why the UI could not.
- **The listener is usually a GRANDCHILD.** `npx` interposes a wrapper, so killing the pid you
  spawned leaves the real server serving. Re-confirmed on every run since 2026-08-23 and again
  2026-08-27, where `launchApp` spawned 636937/636938 while the listeners were 636997/636974.
  `stopApp` walks the port's holders for exactly this reason.
- **No watcher at all for a run that validates a commit** (2026-08-22). Killing the listener
  under a `tsx watch` wrapper leaves the wrapper alive, and *a free port is not proof of a
  stopped app*: the next edit to a source file makes the watcher **resurrect a server on that
  port**. Worse than the nuisance — what is then serving is code the agent never meant to test.
  `launchApp` starts `tsx src/main.ts`, one pid, no resurrection.
  **The client is a different case and is left alone deliberately**: the suite drives the Vite dev
  server, which *is* a watcher — but it hot-reloads rather than resurrecting anything, and building
  the client instead would change what is being tested (a production bundle rather than the app the
  whole suite drives). Known constraint, not a defect to rediscover.
- **An in-page drill-down has no navigation to wait on.** `waitForScreen` guards a route change; a
  control that only swaps a list in place does not change route, so reading the list straight away
  reads the *old* one — or an empty one mid-fetch. Measured 2026-08-31: the explorer's depth cap was
  reported three times at the wrong depth (31, then 35, then 38 plies) before a wait on
  `pendingRequests() === 0` plus the expected breadcrumb depth found the real one, 40. Wait for the
  network yourself.
- **A board square's tint is on a div INSIDE `[data-square]`**, where
  `react-chessboard` puts `squareStyles` — so a driver reading the square element itself
  reports an unmarked board while the tint is right there. Measured 2026-09-01 on the FP of
  US-23-06: a false red, lifted only by re-reading the DOM. `squareTints()` in the page half
  now reads the right node; use it rather than writing the lookup again.
- **The Analyse move list has MORE children than plies in `Détaillé`.** The phase ribbons are
  `<li>`s of the same `<ol>` — 47 children for 45 plies, measured 2026-09-04 — so a driver mapping
  `index + 1 → ply` reads the wrong Move, and HP-03 briefly recorded a flagged **opponent** Move that
  way. **Asymmetric**, which is what makes it bite: the reading route's list carries no ribbons and
  maps 1:1, so a helper verified there is wrong here. Key on the SAN text.
- **After `open()`, `location.port` can still be empty on the first evaluate** — and the port
  guard then fires against a blank document ("port guard: this is , not 5232"), which looks exactly
  like the theft it exists to catch. Measured 2026-09-01: `Page.loadEventFired` had evidently been
  consumed for `about:blank`. Poll `location.port` until it reads your own before the first guarded
  call. Related, same run: **launch the app in the background**. A foreground `node` boot killed at
  the shell's 100 s timeout takes the *detached* app children with it, leaving free ports and a
  chrome-error page — a run that dies there proves nothing rather than failing.
- **`launchBrowser` keeps the Node process alive** — an open socket and a piped stderr — so a boot
  script that launches the app and the browser never returns, and a foreground call dies at the
  two-minute timeout taking the browser with it. To drive in phases across several shell calls, end
  the boot script with an explicit `process.exit(0)` and re-attach to the CDP port afterwards.
- **On a shared worktree, "is this pid mine?" has a weaker answer than it looks.** `namesMe` proves
  ownership by the process's directory — and when three scenarios run from the **same** worktree that
  matches any of them (measured 2026-08-31). Nothing was at risk on that run, because `stopApp` only
  inspects the holders of *your own* ports; but the proof would say "mine" about a sibling's server
  if one ever held one of yours. The port assignment is what keeps this safe, which is why shifting
  ports on a collision — and **saying which** — matters more than it appears.
- **`blur()` on an element that was never focused fires nothing**, and the resulting reading looks
  exactly like a defect: on 2026-08-31 an emptied-Note probe showed an empty box beside "Note
  enregistrée.", which is precisely the contradiction the code exists to prevent. Same shape as the
  380 px click-into-the-void — **assert the focus landed before believing the measurement.**
- **Never `pkill` by pattern**: it kills every sibling's server mid-run. And read that as being
  about **matching by pattern**, not about the `pkill` binary: `pgrep -f <pattern> | kill` is the
  same trap wearing a different hat. Measured 2026-08-31 — an agent ran `pgrep -f "node bridge.mjs"`
  and matched the `bash -c` process whose *command line contained that string*, killing the shell it
  was running in before its own teardown could run and leaving the app up on two ports. A substring
  of somebody else's command line is not evidence.
- **Never kill what you cannot prove is yours, and the proof is the tree — not the port.**
  `/proc/<pid>/environ` has lied in **both** directions: uninformative on a vite and a Chrome pid
  (2026-08-23), and answering "not mine" about a process that was (2026-08-24). `cwd` and
  `cmdline` are the proofs that worked. What is *not* a proof is your port appearing in somebody's
  arguments — measured 2026-08-27, a `python3 -m http.server 3222` started from `/tmp` was
  declared mine and killed on that basis alone. `namesMe` now requires the process to run under
  your root, and returns the **reason** with the verdict, because the two error directions are not
  equal: wrongly "not mine" leaves your own orphan for the next run, wrongly "mine" takes down a
  sibling's run.
- **A private browser is the default, not the fallback.** On the parallel fan-out of
  2026-08-23 the shared devtools browser stole the selected page from **all three** scenarios —
  one early `take_snapshot` returned a sibling's entire accessibility tree. 2026-08-24, with a
  private Chrome each: **zero thefts across four agents**. Also: do not expect to re-attach to an
  MCP page from a script.
- **A `location.port` guard on every injected script.** Load-bearing, not belt-and-braces: it is
  what kept every action off the siblings' apps during those ~20 thefts. `theme-pass.mjs` puts
  one on everything it evaluates.
- **Never trust a theme you merely requested.** Colour-scheme emulation has failed in **both**
  directions across four runs — set over a CDP session then detached, it silently reverted (two
  agents, 2026-08-24, each auditing the dark palette twice); on another run the same emulation
  **survived** a detach, which is the opposite failure. Four observations disagree about the
  mechanism; none disagrees about the remedy: **keep one session alive for the whole pass, and
  assert the theme inside the audited script.** That assertion caught every one of these cases;
  nothing else did.


## D2. The driver library — call it, do not re-derive it

**Added 2026-08-27 (US-18, ADR-0020).** The mechanics below used to be re-written by every agent on
every run, and measurement said that composing those scripts is **a third of what the suite costs** —
and the source of the suite's false findings besides. They now live in the repository, under
`docs/test-scenarios/tools/`, split into a **host** half (`host/`, runs on the machine) and a **page**
half (runs inside the page under test). The two halves never import each other.

**Name it here and nowhere else.** The scenarios under `docs/test-scenarios/` carry no launch command
and must keep carrying none — that property is why they survived a complete change of pilot without a
line moving. A scenario that calls a helper is a script coupled to a pilot.

**It drives; it never judges** (ADR-0020). It returns raw values and it throws when the *mechanism*
failed. What the app says is still yours to read and judge — that is the part no helper touches, and
the only part that produces findings.

| What | Where | What it gives you |
|---|---|---|
| Restore, launch, stop the app | `host/app-lifecycle.mjs` | `restoreSnapshot`, `readBack`, `launchApp`, `stopApp`, `holdersOf`, `namesMe`, `describeProcess` |
| A private Chrome, and one CDP session kept alive | `host/cdp.mjs` | `launchBrowser`, `attach`, `open`, `setViewport`, `emulateTheme`, `session.evaluate`, `session.stop` |
| The theme pass, one call per screen | `host/theme-pass.mjs` | `runThemePass` — the nine screens of `theme-pass.md`, in both themes and at both **widths**, thirty-six raw readings |
| Navigate, and read a field back | `host/navigate.mjs` + `page/app-driver.js` | `followNav`, `reachScreen`, `selectProfile`, `setField`, `waitForScreen`, `guarded` |
| Assertion 7 — what the Player acts on never moves | `host/stability.mjs` | `walkPlyStability` — steps the plies and hands back the **displacements** of the stepper and the verdict fieldset, in viewport pixels. It measures; the scenario passes the sentence (zero) |
| What a pass cost, after the fact | `host/run-ledger.mjs` | per scenario the wall, five buckets and the **worst wait**; the suite's lived and worked walls. `--every` costs every subagent of a session rather than the pass inside it |

```js
import { restoreSnapshot, launchApp, stopApp } from "<repo>/docs/test-scenarios/tools/host/app-lifecycle.mjs";
import { launchBrowser, setViewport } from "<repo>/docs/test-scenarios/tools/host/cdp.mjs";
import { runThemePass } from "<repo>/docs/test-scenarios/tools/host/theme-pass.mjs";

// Restore BEFORE starting, and read the copy back before trusting it.
const { tables } = restoreSnapshot({ from: snapshot, to: "/my/scratch/scenario.db" });
const app = await launchApp({
  repoRoot, serverPort: 3211, clientPort: 5211, dbFile: "/my/scratch/scenario.db",
});                                                          // throws if a port is taken, naming it

const session = await launchBrowser({ cdpPort: 9299 });      // your own browser, your own port
const readings = await runThemePass({                        // it sets the viewport itself, per width
  session,
  baseUrl: app.baseUrl,
  port: "5211",                                              // guards every injected script
  profile: "DudulSmash",                                     // a fresh browser has none current
});
await session.stop();
await stopApp(app);   // frees the ports, grandchildren included, and throws if one is still held
```

Three things it is worth knowing it does for you, each of which cost somebody a run:

- **No `puppeteer-core` to install.** Node 22 ships a global `WebSocket`, so the library speaks CDP
  directly. Previous runs each installed a driver into a scratch directory of their own.
- **The inventory of screens is read from `theme-pass.md`**, never copied — and since US-22 the
  **widths** are read from it too. That document stays the one place either is edited.
- **The pass owns the viewport.** It walks each width in turn and sets it itself, so do not pin one
  before calling it — `setViewport` is for a scenario measuring one screen at one size. Each injected
  script asserts the width it measures, exactly as it asserts the theme, and for the same reason: an
  override that did not take would report a green narrow screen that never rendered.
- **It does not choose which Game or which Profile the pass opens — you do.** Left to itself it takes
  the first row, and on 2026-08-27 that was an *unanalysed* Game for two scenarios running, so the
  pass audited `Analyse` with no evaluation curve, no advantage bar and no severity glyph. Green, on
  the wrong Game. Pass `openers` when your assertions depend on it:
  ```js
  import { gameRows, openGameRow } from "<repo>/docs/test-scenarios/tools/host/navigate.mjs";
  const rows = await gameRows(session, { port });            // raw; you decide which
  await runThemePass({ …, openers: {
    "/analyse/:gameId": (s, { port, waitOptions }) =>
      openGameRow(s, { port, index: rows.findIndex((r) => r.text.includes("analysée")), waitOptions }),
  } });
  ```
- **Assertion 7 is one call, and it counts steps rather than clicking in a loop.** `walkPlyStability`
  sends **one** `step('Next')` per evaluation: a loop of clicks inside a single `evaluate` re-clicks a
  handler the framework has already replaced, which on 2026-08-24 advanced one ply while reporting
  eight. A target absent at a ply (the verdict fieldset does not exist at the starting Position) is
  reported **absent**, never folded into a zero — otherwise ply 0 reads as the most stable transition
  there is.
- **The source of a restore is never written to.** `restoreSnapshot` opens it `-readonly` and lets
  `.backup` read through an unmerged WAL on its own (measured against 4152 bytes of frames with the
  writer still connected). It used to checkpoint the source first, which was a write path onto the
  one file ADR-0015 exists to protect, on every Feature Path that copies the requester's base. What
  the checkpoint reported is kept as `source.walBytes`, observed rather than merged.
- **Every CDP call is bounded, and so is the close.** A wedged socket is not a slow page: on
  2026-08-31 one died with Chrome and the app both alive and answering HTTP, every later
  `Runtime.evaluate` hung for ever, and the teardown hung with them — so the run was SIGKILLed with
  its ports still held. `send` now rejects on a deadline and `close` gives up rather than waiting for
  an event that is not coming. If you see "the socket is wedged, not slow", the app is probably fine
  and the browser is not.
- **`launchBrowser` returns the session itself**, carrying `.stop` — not a `{ session }` wrapper.
  Destructuring it as one throws *before* whatever `try` was meant to guard the teardown, and leaves
  a Chrome holding the CDP port (2026-08-28; recovered by proving the pid's own `--user-data-dir` in
  `/proc/<pid>/cmdline`).
- **`currentMove()` is a caption, not a movement detector.** Two consecutive plies can carry the
  same SAN, so a walk loop that breaks when the caption "did not change" stops after one transition
  and reports a two-reading walk as a fourteen-transition one (measured 2026-08-31). `walkPlyStability`
  counts steps and does not have this bug; anything hand-rolled should key on something exact, such as
  the verdict group's `declared-severity-<ply>` name.
- **At 380 px, everything below the board is off the screen** — the reading route's Note panel sits
  at y≈1115 in a 900 px viewport. A real mouse click at those coordinates lands in the void, types
  nothing, and hands back three *identical* measurements that read as "nothing changed: green" over a
  step that never happened (measured 2026-08-28). Scroll the target into view, and **assert the focus
  actually landed** before typing.
- **`runThemePass` leaves the browser on the last screen of the inventory** (`/profiles/:id`). A
  follow-up script that assumes it is still where it was reads a missing panel and reports a defect.
  Navigate explicitly after the pass.
- **A screenshot can be a measurement that measured nothing.** `Page.captureScreenshot`'s `clip` is
  in **page** coordinates and needs `captureBeyondViewport: true` for anything below the fold —
  without it the PNG comes back the right size and entirely blank (2026-08-28). Worth knowing here
  because judging a glyph at its real size is the one check no assertion can replace: the FP of
  US-16a passed "nothing by tint alone" to the letter while shipping two pencils the eye could not
  tell apart.
- **A field is read back before anything is submitted.** `setField` puts the value in through the
  native setter, reads it out again, and **throws** if it did not take. The import form's month
  fields keep their default when a driver assigns `value` — measured 2026-08-19, where a run nearly
  imported the wrong months for a reason that had nothing to do with the app.
- **Navigation happens in the page, not at the driver.** Driver-level navigation is the operation
  that lands on the wrong page. And the Game row opens **through the opponent's name** — a
  `button` navigating by program until US-23 (2026-09-01, which made it an anchor), so what is worth
  knowing is not the element type but that the door is in that one cell: a driver clicking the row,
  or hunting for a button in it, records `Analyse` as unreachable. The fact that this line had to be
  rewritten rather than merely re-read is the point of ORCHESTRATION.md §O5.
- **It throws rather than hand back a thinner green.** The port guard and the in-script theme
  assertion are both live: falsify the emulation and the call fails with the theme it actually
  measured. Measured 2026-08-27, over three runs: eighteen audits over nine screens in **15.6 seconds**, and a whole scenario shape — restore, launch, the pass, teardown with the ports proved free — in **20.3 seconds**. Since US-22 the pass is **thirty-six** audits — the second width costs **+23,6 s of driving** (20,8 → 44,4 s) and eighteen more readings to read.
- **"The screen has rendered" is two conditions, not one** — and getting that wrong is the defect
  this slice's own Feature Path caught. Text stability alone is satisfied *instantly* by a loading
  placeholder: "Chargement du bilan…" holds perfectly steady, so `/confrontation` was audited at
  ~300 ms while its content arrived at ~600, reporting thirteen text nodes out of seventy with
  `problems: 0`. The helper now waits for the app to have **stopped fetching** as well. If you ever
  write your own wait, wait for both.

A screen the scenario's state cannot reach comes back as `unreachable` **with its reason**, not
missing — read those before reading the readings.


## D3. The generic surface/driver table, kept as upstream ships it

This is upstream's table, not a menu for this repo — here the answer is fixed (§D0, and the
runner's *Primary surface & driver*). It is kept because the skill is shared with repos where the
question is still open, and because deleting a table you disagree with is how a factory quietly
forks.

| System type | Primary surface | Recommended driver |
|---|---|---|
| Web app | the UI in a browser | **Playwright CLI** — browser automation for agents (the CLI, **not** the MCP) |
| Cloud / infra / devops | the provider CLI | **AWS CLI** (or the provider's own CLI) |
| Data pipeline / transforms | the warehouse | **dbt** — build the models, then query the tables |
| Interactive CLI / TUI | the command line | **tmux** — drive the live session |

Assume no framework, no ports, no seeding tool: discover how to reach the surface at runtime.

**The Web-app row is not followed here.** We keep our own CDP library instead: it carries the
teardown-by-pid, the `location.port` guard and the snapshot restore that three days of wedged runs
paid for (§D1). ADR-0020, note of 2026-09-04, and **US-38** — open to *measure* the trade rather
than argue it. Reading this table as an instruction to migrate would undo US-38 before it runs.
