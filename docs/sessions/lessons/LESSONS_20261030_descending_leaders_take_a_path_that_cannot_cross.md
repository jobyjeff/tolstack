# LESSONS 2026-10-30 — descending_leaders_take_a_path_that_cannot_cross

## What won, and the measurement that decided it

The handoff picked candidate 4 (route the descending leaders differently) and
asked for a comparison against candidate 1 (order the lanes by seam). **Neither
was taken as written.** What shipped is a lane-order rule (closest to candidate
1) for jogged, plus a fix to **angled**, which the handoff assumed did not need
one.

Strict crossing pairs (one segment passes through the inside of another).
Measured on `vpa_pitch_linkage`, the only committed topology since
`pitch_system` was folded into it on 2026-10-26. Uniform length mode, budget
782 px. The "views" are the whole walk plus each of the 22 chain studies that
light something:

| variant | jogged, whole walk | jogged, sum of 23 views | angled, whole walk |
| --- | ---: | ---: | ---: |
| before (lanes in walk order, angled straight from the dot) | **207** (29 of 61 leaders) | 235 | **14** (18 leaders) |
| candidate 1 as written (lanes sorted by seam y) | 207 | 235 | — |
| candidate 4 as written (descending leaders drawn straight) | 5 | 5 | — |
| **shipped**: descending leaders' lane slots handed out in reverse | **0** | **0** | — |
| **shipped**: angled runs flat to the zone's left edge, then straight | — | — | **0** |

Comfortable and compact density gave the same counts.

- **Candidate 1 as written changes nothing.** The seams are already in walk
  order, so sorting lanes by seam is the same as sorting them by walk.
- **Candidate 4 as written leaves 5 pairs.** A straight line from a branch
  node's dot can still cross a straight line from a spine node's dot. That is
  also why the handoff's premise was wrong: the issue had measured "angled has
  zero crossings" on the old `pitch_system`, but on the merged product model
  angled crosses in **14** pairs. Angled is the default style, so this was the
  crossing most readers actually saw.
- **The shipped rule is provably crossing-free**, not just zero on this data,
  and it keeps the jogged shape, so it changes the picture least.

The issue's repro no longer runs as printed. `topology.js` now needs
`apps/viewer/vocab.gen.js` loaded first, and `pitch_system` is gone. Loading
both and running it on `vpa_pitch_linkage` gives 0 strict crossings.

## The premise the rule rests on — check this first after any layout change

> In walk order, the leaders' node ends (`y1`) **strictly increase** and their
> grid seams (`y2`) **never decrease**.

Every step of the argument (written out in `VA.leaderGeometry`'s comment)
needs only this. It does not assume leaders rise or descend; the old proof
assumed every leader rises, and it lasted four days. The `[real]` test checks
the premise on its own, so if a layout change breaks it, the test reports
"dot is not below" or "seam is above" rather than only a crossing count.
Things that would break it: reordering the grid away from walk order, giving
two nodes the same `y`, or a length mode that lets a row's height go to zero
or below.

Two consequences worth knowing:

- **Jogged lane slots can permute mid-animation.** Whether a leader descends
  is read from the ends as drawn, so during a zoom or a respine frame a leader
  can switch between rising and descending, and the descending set's slots
  re-shuffle by one lane. It is invisible at rest. Jogged is deprioritized (see
  the README), so I left it.
- **The band clamp (a running maximum in `bandGeometry`) now does nothing on
  drawn geometry.** I kept it on purpose: if the premise is ever broken, a
  crossing pinches a band shut instead of folding it over itself.

## Tests and enrollment

- `[real] pitch_system's leaders really do cross…` was turned into
  `[real] no two leaders cross on any committed topology…`. It covers every
  topology × (the whole walk, each chain study, each kinematic study, each
  with the unlit part dimmed and hidden) × density × length mode × style.
  That is 540 configurations, and the test asserts the count itself
  (`configurations === expected`), that every topology was visited, and that
  kinematic studies were included.
- The mock band-tiling test now also asserts zero crossings in both styles. Its
  check that the fixture really exercises something changed from "crossings > 0"
  to "some descending seam sits below a later dot".
- Two new mutation specs (three mutations): lanes back in walk order, and
  angled turning at the dot again. All three were caught (`--changed-since
  integration`, 3/3, 1m24s). The guard name-set pins in
  `scripts/guard_enumeration.mjs` were updated for three renamed fast-tier
  guards and two renamed browser guards; counts are unchanged.
- **Three copies of the angled path regex were in the browser runner, and my
  first grep found only two.** The third, the widened-zone check, failed in the
  browser run. To find all copies of a path regex, grep for `+ L [`.

## Screenshots (served viewer, 1600×1000, comfortable, product model)

`docs/sessions/shots_20261030_descending_leaders/`:

- `1_angled_default.png` and `2_jogged.png`: the full page in each style. At
  1600 px the Preview pane leaves the grid scrolled off to the right.
- `3_jogged_descending_half.png`: the top 1100 px of the leader SVG, jogged.
  The descending leaders nest: the first takes the outermost lane and each
  later one sits inside it, with no lane crossing another leader's run.
- `4_angled_descending_half.png`: the same area, angled. Each leader runs flat
  to the zone edge, then slants to its seam.

## Sites

The fix reaches the topology page and the kinematic page; both draw through
`renderTopoPane` → `VA.leaderGeometry`. It does not touch the leaders that
cross the seam into the 3D scene (`VA.seamDots` / `drawSeamLeaders`). That is
a different surface whose leaders each turn once, level with their dot. It
was not in scope and was not measured. `apps/annotate/` was not touched.

## Found during the run

- **The `[real]` respine checks in `topology file:// respine` are red on the
  integration base too** (3–5 of 35–44 sub-checks, varying between runs).
  Filed:
  `docs/issues/ISSUE_20261030_the_real_respine_suite_never_catches_a_frame_in_flight_on_integration.md`.
- To run the browser tier from a worktree, I linked the main checkout's
  `node_modules` into the worktree with a junction (it is gitignored, so it
  stays out of git).
