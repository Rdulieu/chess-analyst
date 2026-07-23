## Status
ready-for-agent

## Parent

`.scratch/global-stats/PRD.md`

## Integration branch

This sub-issue is implemented on the business-story integration branch
`integration/US-6-global-stats` — branch from it and merge back into it, NOT `develop`. It
auto-merges into `integration/US-6-global-stats` after a green local check (build + tests + green
FP, no blocking finding); the `integration/US-6-global-stats -> develop` merge stays a human
decision.

## What to build

Fill the `/stats` page (route + nav already delivered by the navigation enabler, ADR-0006) with a
history-wide results summary, computed **on the fly** over every retained Game — no new table, no
precomputation. Three parts:

- **Total**: games played, the win/draw/loss tally, and the `Win rate`.
- **Per cadence**: one line per time control category (bullet, blitz, rapid, daily), each with
  games, win/draw/loss and `Win rate`.
- **Per side**: Blancs / Noirs, each with games, win/draw/loss and `Win rate`.

Backing this: a read endpoint `GET /api/stats` returning the whole summary, and a repository
aggregation over the `games` table (overall + `GROUP BY` time control category + `GROUP BY`
player colour). `Win rate` is standard scoring `(win + 0.5·draw)/games`, computed server-side, and
is **null when a bucket has no Games**. All four cadences and both sides are always present in the
response (an unplayed bucket is `{ games: 0, …, winRate: null }`). `win/draw/loss` are
Player-relative (the `games.result` column already is).

On the page: when there are no Games at all, show an **invitation message only** (no table); a
cadence/side with 0 Games renders its count as 0 and **omits the rate**. The win/draw/loss tally is
spelled out for assistive technology, mirroring `ImportSummary`. Server otherwise untouched (no
schema change, no Import change).

API contract (shape, not fixed values):

```
GET /api/stats →
{
  total:      { games, win, draw, loss, winRate },     // winRate: number | null
  byCategory: { bullet: Bucket, blitz: Bucket, rapid: Bucket, daily: Bucket },
  bySide:     { white: Bucket, black: Bucket }
}
// Bucket = { games, win, draw, loss, winRate }  (winRate null when games === 0)
```

## Acceptance criteria

- [ ] `GET /api/stats` returns the overall total, a per-time-control-category breakdown, and a per-side breakdown, each as `{ games, win, draw, loss, winRate }`
- [ ] `Win rate` is `(win + 0.5·draw)/games` (Player-relative) and is `null` when a bucket has `games === 0`
- [ ] All four cadences and both sides are always present in the response; an unplayed bucket is zero with `winRate: null`
- [ ] Per-cadence games sum to the total; per-side games sum to the total; each bucket's win+draw+loss equals its games
- [ ] The `/stats` page renders the Total line, the per-cadence lines and the per-side lines, each showing games, the win/draw/loss tally and (when games > 0) the `Win rate`
- [ ] With no imported Games, `/stats` shows an invitation message only — no table, no rate
- [ ] A cadence or side with 0 Games renders at 0 without a `Win rate`
- [ ] The win/draw/loss tally is spelled out for assistive technology (as in the import summary)
- [ ] The stats are computed on the fly from `games`; no new table or precomputation is added, and the server schema/Import are unchanged
- [ ] The app-level routing test's `/stats` assertion is updated from the placeholder to the stats content
- [ ] No opening-level section is added (US-3), no per-position/move content (US-5), no crossed cadence×side matrix

### Feature Path (FP)

1. Launch the app seeded with the `Move habit` fixture dataset (offline, `npm run seed:move-habits`) → navigate to `/stats` from the navigation.
2. Read the summary → the **Total** is 6 games · 2 W / 1 D / 3 L with its `Win rate`; the **per-cadence** breakdown shows blitz 4, bullet 1, rapid 1, daily 0 (each with its rate; daily at 0 without a rate); the **per-side** breakdown shows Blancs 3 (1 W / 1 D / 1 L) and Noirs 3 (1 W / 0 D / 2 L), each with its rate.
3. Confirm internal consistency → per-cadence games and per-side games each sum to the total (6); every bucket's win/draw/loss sums to its games; every shown `Win rate` equals `(win + 0.5·draw)/games` and lies in 0–100%.

Verify: UI first — navigate to `/stats` and read the figures. Probe the API/DB only if the UI cannot establish the figures. (The empty-history message and the 0-game-bucket-without-rate case are nominal-adjacent edges covered by lower-tier tests, not this FP.)

## Blocked by

None - can start immediately (the navigation enabler with the `/stats` route + nav entry is already on `develop`; `integration/US-6-global-stats` is cut from up-to-date `develop`).
