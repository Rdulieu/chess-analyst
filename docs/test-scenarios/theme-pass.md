# The theme pass — the last step of every Happy Path

Since US-13 the app has a stylesheet and a dark theme that follows the operating-system
preference. A style is only observable on a **rendered** screen, so it is validated where the app
actually runs: each of the three Happy Paths ends with **this** step, walking the navigation across
**all nine screens**, first in the light theme and then with the dark preference emulated, and at
**two widths** — the comfortable one and a narrow one.

It is written once, here, and referenced by each scenario's final step rather than copied three
times — three copies of an assertion list drift, and the whole point of the pass is that the three
scenarios apply the *same* rules to the state each of them built.

## Why it is a step of every HP and not a fourth scenario

The cap of **at most 3 HP** holds. The theme is not a journey of its own: it has no control, no
state and no server side — it is how the screens the Player already reached are painted. So it costs
one step per scenario, and that step **rides on the state the journey has already built**.

It is also what closes the suite's coverage gap: before US-13, `/stats` was visited by no HP and
`/danger` only as a drive-by, and a theme pass that never sees a screen proves nothing about it.
Walking the navigation is the cheapest way to see every screen without turning a journey of value
into a coverage sweep.

## The rule that keeps it cheap

**No further Import and no further analysis.** The pass triggers neither. It navigates, and it
reads. If a scenario's state does not reach a screen with content (a scenario that never analysed a
Game finds `/danger` empty; one that never imported finds every screen inviting an import), the
screen is still visited and audited **in the state that scenario leaves it** — the empty state is a
rendered screen too, and it has a ground, an ink and a contrast. That holds for the profiles screens
as much as for the rest: they are audited **as the scenario left them**, counters and all, and a
Profile page whose history is still empty is a rendered screen like any other. What must never
happen is a scenario creating a Profile, importing or analysing *for the sake of the theme pass*.

The extra cost is rendering, not journey: on a warm app it is thirty-six audits — nine screens, in
two themes, at **two widths** (see below). Measured 2026-08-27 over three runs: **~15.6 seconds**
for the eighteen of the single-width era, and **~44 s** for the thirty-six — against the several
minutes the same walk cost when each agent re-derived it.

## The nine screens

| # | Screen | Reached by |
|---|---|---|
| 1 | Mes parties (`/`) | navigation |
| 2 | Explorateur (`/explorer`) | navigation |
| 3 | Ouvertures (`/openings`) | navigation |
| 4 | Positions dangereuses (`/danger`) | navigation |
| 5 | Stats (`/stats`) | navigation |
| 6 | Mes lectures (`/confrontation`) | navigation — the `Confrontation` summary (US-16b). **Added 2026-08-25**, and it went one run un-audited: the passes said "eight screens" while the navigation had grown to nine, so a screen reachable from the nav belonged to no scenario. A count in prose does not follow a `Nav` on its own — when a route joins the navigation, this table is what has to change. |
| 7 | Analyse (`/analyse/:gameId`) | selecting a Game in "Mes parties" — it is Game-scoped and deliberately absent from the navigation. **The Game row is a `button`, not a link**: a driver hunting for an `href` matching `/analyse/` finds nothing and wrongly records the screen as unreachable (measured on the 2026-08-19 run). Click the row's button, or navigate to the URL directly. |
| 8 | Profils (`/profiles`) | navigation — where the current `Profile` is chosen |
| 9 | Profil (`/profiles/:id`) | selecting a Profile in the list — it is Profile-scoped, like Analyse is Game-scoped |

All nine, in both themes. Two of them the navigation cannot reach on its own: open any Game from
the list for Analyse, and any Profile from the list for the Profile page. If the scenario's state holds
no Game at all, record the **seventh** as *not reachable in this scenario's state* rather than
importing one. **And say which Game it must open when that matters**: on 2026-08-27 two scenarios
audited Analyse on whichever Game came first in the list — an unanalysed one, so the pass saw no
evaluation curve, no advantage bar and no severity glyph, which is exactly what HP-01's pass is the
strongest of the three at seeing. It reported green, on the wrong Game. The pilot takes the choice
from the scenario now (`agentic-tests` skill §5.8), but the *decision* is the scenario's; the Profile page is always reachable, since every scenario has selected a Profile before reading
anything.

Since US-11 the two profiles screens joined the inventory and **none was removed** — "Mes parties"
stays, it merely lost the import form, which now lives on screen 8. The two additions cost **four
more audits per scenario**, two screens in two themes.

**Screens 7 and 8 are audited with TWO Profiles, one of them current.** Not decoration: the row's
constant tracks have to fit "Profil actuel" on one row and "Sélectionner" on another at the same
time, and that pairing is what overflowed the list by 10 to 24px until 2026-08-21 — on a screen this
very pass had been reporting clean, because every scenario had held exactly one Profile. Two rows
with none selected fits (625 into 625); two rows with one current does not (635 into 625). Path 0
builds that state for the whole suite, so **do not reduce a scenario to a single Profile** to
simplify it: the assertion lives in the pairing.

Since US-12 the standing state is **three** Profiles, the third on **lichess.org** — so these two
screens are also the ones where two different `Platform` labels are painted side by side, and the
list is one row taller than the measurement above. The pairing rule is unchanged and the taller
list only makes it stricter; what is added is that a site name is now **rendered text on these
screens**, and must stay legible in both themes like any other ink.

The **banner naming the current `Profile`** rides in the chrome of screens **1 to 7** and is
deliberately absent from **8 and 9** — there the Profile is what the page is *about*. (Corrected
2026-08-27: this said "1 to 6" and "7 and 8". Measured on the run: `[data-banner="profile"]` is
present on Analyse too, and absent from Profils and Profil — which is also the more coherent rule.) It is audited as chrome
wherever it appears: its label is words, never a tint (assertion 4), and its link must hold contrast
in both themes like any other.

## The two widths

The pass audited **one** width, 1280 px, for its whole life — and that is the width at which the
app is at its most comfortable. Two real defects lived below it while the pass reported green: the
reading route's panel moved the stepper under every click, worse the narrower the window (194 px of
amplitude at 1400, **312 px** at 900 and at 380), and the profiles list scrolled the whole page
sideways (page 676 px against a 380 px viewport, in both themes). Neither was hidden; nothing was
looking.

So the pass looks at **two** widths, and the narrow one is not a courtesy:

| width | why this one |
| --- | --- |
| `1280 px` | the comfortable desk — the width the app was designed against, and where a regression of ink or contrast shows first |
| `380 px` | the narrow window — where the board row folds, the side panel reaches its own minimum and every reserved space is contested. **The only width that has ever seen these two defects.** |

**One narrow width is enough, and it is measured**: at 900 and at 380 px the side panel is the same
width (332 / 333 px) and the reading panel has the same amplitude — the row has folded in both
cases. A third width would cost another nine screens per theme and see nothing the second does not.

The price is measured too, on the run of 2026-08-27: **+23,6 s of driving** (20,8 → 44,4 s, ×2,14)
for eighteen more readings, sixteen of them clean — and re-measured on the run that adopted the
width (2026-08-28): **16,3 → 35,3 s, ×2,17**, the same ratio on a faster machine, with all eighteen
clean once `/profiles` was sized like a table. The number that will matter the day this becomes
expensive is not the seconds — it is the **readings a human has to read**.

**Below 380 px the page does scroll sideways again** — measured at 280 px on 2026-08-28: 282 px of
document against a 280 px viewport, two pixels, seven boxes flagged, in both themes. That is outside
the two declared widths and contradicts nothing above; it is written down so that a third width, if
one is ever proposed, starts from what is known rather than from a surprise.

> **This is not a mobile target.** It is one narrow window on the same desktop browser: no touch
> gesture, no orientation, no device. What is asserted at 380 px is what is asserted at 1280.

## What is asserted, on every screen, in both themes, at both widths

1. **Every colour resolves.** No computed colour is empty or still a literal `var(--…)`, and every
   theme-invariant token is declared.
2. **Text contrast** is at least **4.5:1**, or **3:1** for large text (≥ 24px, or ≥ 18.66px bold),
   measured against the background **actually painted** behind the text, composited through
   transparency.
3. **No horizontal overflow**: the page does not scroll sideways, and no box is wider than its own
   container unless it is a declared horizontal scroller. This is the assertion the second width
   exists for: it was **true at 1280 px and false at 380** on `/profiles` for months, and a pass that
   only ever looked at the comfortable width could not have said so.
4. **Non-chromatic cues are present wherever a tint carries meaning** — the weak-opening ⚠, the
   danger card's ⚠, the severity glyphs `?!` `?` `??`, the failed month's word ("échec" when nothing arrived, "incomplet" when
   some Games did and the month stopped short), the
   "analysée" badge's word and checkmark, the current tab's weight/border beside its
   `aria-current`, and — since US-11 — the banner's spelled-out "Profil courant :" and the profiles
   list's "Profil actuel" on the current row, which carries the state in words beside the
   `data-current` tint rather than by tint alone.
5. **Player and board colours are identical between the two themes**, byte for byte:
   `--white-share`, `--black-share`, `--square-light`, `--square-dark` and the three
   `--square-<severity>` tints. White's share must not darken at night, because it denotes a player
   and not a background.
6. **No console error** across the walk.

**A cue rule with no subject on the screen proves nothing.** The audit drops rules that find nothing,
so its `cues` block reads as "what this state exercised", never as "all cues verified": in HP-02's
state only the weak-opening ⚠, the current tab and the two `Profile` cues have subjects at
all, and HP-01 is the scenario that carries the danger cards, the severity glyphs and the "analysée"
badge. Read the three passes together, and read `subjects` before reading `failures`.

Assertions 1 to 5 are **measured, not eyeballed**: one browser-side function returns a report per
screen, and the two themes are compared on the `constants` block for assertion 5. The theme itself is
switched by **emulating** `prefers-color-scheme: dark` and never from inside the page — the app ships
a media query, so the media query is what must be exercised.

> How the pass is driven is not named here. It is one call of the driver library, described in the
> `agentic-tests` skill (§5.8), and this document deliberately does not know which file that is: a
> scenario that names its pilot is coupled to it, and this suite has already survived one complete
> change of pilot without a line moving (ADR-0020). What belongs here is **what is asserted**, and
> the nine screens it is asserted on.

**Emulate the light half explicitly too, and assert the theme you think you are in.** A browser is
not neutral: a headless Chrome launched with its own profile defaulted to `prefers-color-scheme:
dark` on the 2026-08-19 run, so the walk labelled "light" rendered the dark palette and the pass
would have reported a green light theme it never saw. Emulate `light` for the first half rather than
trusting the default, and check the audit's own `dark:` readout — and the ground it measured —
against the half you believe you are running. A pass over one theme twice is a pass over nothing.

**And the emulation can revert under you, which is a second way into the same trap.** Measured
2026-08-24, independently by **two** agents of the same run: `Emulation.setEmulatedMedia` sent over a
**freshly created CDP session that is then detached** silently loses its effect. Both agents' first
full pass reported `dark: true` on all sixteen audits — the dark palette audited twice, a green light
theme that never ran. Both were caught by the in-script assertion above, and both fixed it the same
way: set the preference on the page object that stays alive (`page.emulateMediaFeatures(...)` under
puppeteer) rather than on a session you close. So the rule is not merely "do not trust the browser
default" — it is **do not trust the emulation you set either; assert it inside the audited script,
every screen, every half.** That assertion is the only thing that has ever caught this.

**And it fails in the other direction too, so do not read the above as "detaching clears it".** On a
third run the same day (2026-08-24, US-16a slice 02), an emulated scheme **survived** past its
session's detach into a later screenshot, which is the opposite behaviour. Four observations now
disagree about the mechanism; none of them disagrees about the remedy. Keep one session alive, and
assert the theme inside the script — that is what holds whichever way the emulation misbehaves.

**`Mes parties` carries a `Lecture` column since US-16a**, stating each Game's `Personal analysis`
state in words. It is audited by whichever screen list each scenario walks, like every other cell —
no rule of its own. It is named here because it is the newest thing on the widest table in the app,
and the table's guarantee is that the **container** scrolls and never the page (`_tables.scss`): a
column added without re-checking that at a narrow width is how this app would acquire a sideways
scroll. All three scenarios re-checked it at 900 px and 380 px in both themes on the 2026-08-24 run.

Contrast is **blocking**, not a report: US-3 shipped a highlight that was invisible for want of any
CSS, and the point of a stylesheet is not to replay that finding in reverse.

## Known-open findings the audit reports but does not fail on

Recorded here so that a replay does not present the same known facts as new breakage, and so that
the list stays short and visible rather than becoming an ignore-file:

- **A disabled control's label**, composited to **2.63:1 in light and 3.51:1 in dark**. WCAG exempts
  inactive controls and the `not-allowed` cursor carries the state. (Recorded as "~3.5:1" before the
  2026-08-17 run measured both themes; the light figure is the worse of the two.)

Two entries were **struck** by that run, having been fixed rather than tolerated — recorded here so
nobody re-adds them as exceptions:

- The board's rank/file **coordinate labels**, listed at ~2.3:1 since slice 02, now measure
  **12.89:1** on the light square and **4.66:1** on the dark one: the board consumes
  `--square-notation` and `--square-light` / `--square-dark`, which slice 03 reported as declared and
  unconsumed. A regression there must now go red.
- The **evaluation curve's equality line and cursor**, listed at 2.92:1 / 2.93:1, now measure 3.30 to
  3.44 against the shares they are drawn on — **above** the 3:1 graphics threshold.
- **The board's pieces are third-party SVG** and are non-text content: they are held to the 3:1
  graphics rule on **`max(fill, stroke)`** against their square, never on fill alone — a white piece
  on a light square measures 1.24:1 on fill and 14.65:1 on stroke, and the stroke is what carries
  legibility. The audit's text sweep does not cover them; measure them only when the board changes.

Anything the audit reports outside this list is a **finding**, and a contrast failure outside it is
**blocking**.
