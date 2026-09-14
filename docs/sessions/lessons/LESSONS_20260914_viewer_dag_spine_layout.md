---
handoff: viewer_dag_spine_layout
date: 2026-09-14
---

# Lessons — viewer_dag_spine_layout

## The measured numbers the handoff asked for

All five committed topologies, comfortable density, budget 782px (a 1000px
window with this page's chrome above the pane). "Crossings" = leaders whose
horizontal run from dot to lane passes over a rail spanning that y.
"Max jog" = `max |node-side leader y − grid-side seam y|`, the thing Jeff
asked to be smaller.

| topology | mode | crossings before → after | max jog before → after |
|---|---|---|---|
| pitch_system | uniform | 47 → 43 | 507 → 208 |
| pitch_system | tolerance width | 47 → 43 | 2246 → 208 |
| pitch_system | feature size | 47 → 43 | 507 → 208 |
| pitch_link_to_pitch_plate | uniform | 8 → 0 | 117 → 52 |
| pitch_link_to_pitch_plate | tolerance width | 8 → 0 | 132 → 59 |
| pitch_link_to_pitch_plate | feature size | 8 → 0 | 120 → 53 |
| rotor_fastener_length | all three | 27 → 0 | 91 → 39 |
| tan_link_to_pitch_plate_take2 | uniform | 4 → 0 | 169 → 78 |
| tan_link_to_pitch_plate_take2 | tolerance width | 4 → 0 | 300 → 143 |
| tan_link_to_pitch_plate_take2 | feature size | 4 → 0 | 240 → 113 |
| vpa_output_to_pitch_plate | uniform | 6 → 0 | 169 → 78 |
| vpa_output_to_pitch_plate | tolerance width | 6 → 0 | 290 → 138 |
| vpa_output_to_pitch_plate | feature size | 6 → 0 | 224 → 105 |

DAG heights on `pitch_system`: tolerance width **3325px → 1170px** (its own
floor minimum, which is past the budget — honest overflow, the page scrolls);
uniform and feature size unchanged at 1170px, because both were already
sitting on the floor.

**Crossings on `pitch_system` barely move, and that is structural, not a
half-finished job.** A mirror is a bijection on column indices: per leader it
swaps "rails to my right" for "rails to my left", so the total cannot drop —
it picks the better half. The *spine's* eight leaders go 43 → 0 (the
deliverable's own words: "leaders from spine nodes run essentially straight
into the grid seams"), and the branch leaders pick up 4 → 43 in exchange.
Filed as `ISSUE_20260914_branch_leaders_still_cross_the_rails_right_of_them.md`
(`audience: strategy`) with the four ways out, because every one of them is a
layout-policy change the "no heuristic root" rule fences off.

## Two places I did not do what the handoff literally said, both measured

1. **The fit only scales DOWN.** The handoff says "Replace the absolute
   `EDGE_LENGTH_SCALE.maxRows` cap with a fit … so it targets the viewport
   height". Targeting it in both directions — inflating a short DAG to fill the
   window — was implemented first and measured: it makes the leaders **worse**,
   because a scaled DAG puts its length where the big dimensions are, not where
   the leaders are (`pitch_link_to_pitch_plate` under tolerance width: max jog
   132 → 274 inflated, against 132 → 59 as shipped). So `maxRows` survives as
   the upper bound and the fit is the lower one: `min(cap, fitted)`. The
   complaint being answered was a DAG taller than the page; nothing asked for a
   short one to be stretched.
2. **The two blocks are centred across the LEADERS' span, not across their
   heights.** Same measurement, same cause: `pitch_link_to_pitch_plate` under
   tolerance width has all five leaders in the top 236px of a 691px DAG, so
   centring the block heights drops the grid 241px and every leader that jogged
   ≤ 132px now jogs up to 228px the other way. Centring the leader span (the
   offset midway between the smallest and largest leader jog) provably
   minimises the largest jog — which is Jeff's stated reason for asking — and
   beats height-centring even on `pitch_system`, where it gets 208px against
   234px. `VA.centreOffsets` falls back to the two heights when a
   serialisation has no leaders at all, which is the only case where a taller
   *grid* moves the DAG.

## What the position store now keys (for the respine animation handoff)

`VA.rowPositions(layout, topoProj, mode, metrics, fit)` — the fifth argument is
new and it is `{ budget, plan }`: the measured viewport and `VA.gridPlan`'s
output. Omit it and you get *exactly* the pre-fit store, which is why every
pure caller and pre-existing test was untouched.

On top of the old `nodes` / `edges` / `byRow`, the store now carries:

- `dagHeight` — the DAG's own extent;
- `gridHeight` — the grid block's (`rows × rowHeight`, never scaled);
- `offset` / `gridOffset` — how far each block is pushed down to centre it,
  both ≥ 0, at most one of them non-zero;
- `height` — the taller of the two, which is what the SVG is drawn at.

Every slot's `top`/`y` already includes `offset`, so `railGeometry` needed no
change at all; `leaderGeometry` gained exactly one term (`gridOffset +
boundary × rowHeight`). **For the animator:** two stores interpolate the same
way they did — but `gridOffset` has to be interpolated with them, and the view
applies it as `marginTop` on `div.tv__rows`, so a tween that only redraws the
SVG will walk the seams off the rows. `VA.lastTopoRender` (set by
`renderTopoPane`: `{ topologyId, mode, fit, positions }`) is the
store-held-across-renders the previous lesson said did not exist yet — it is
one paint deep, which is enough to tween *from*, and the browser tier already
uses it to re-derive what the render measured.

## Gotchas that cost time or would have

- **A centred grid means a leader can point DOWNHILL**, and the browser tier
  read a leader's two ends off its bounding box (bottom = node end, top = grid
  end) precisely because "leaders always rise" was a structural guarantee. It
  is not one any more. `CORRESPONDENCE_IN_PAGE` measures with
  `getPointAtLength(0)` / `getPointAtLength(total)` now — still the path the
  browser rendered rather than the numbers that drew it, and direction-blind.
  The no-crossing proof is unaffected: adding a constant to every `y2` keeps
  both endpoint sequences monotone in walk order.
- **Clicking a jogged path by its bounding-box centre is luck**, and the mirror
  used it up. The `base_post_seat` leader click had passed for weeks because
  the node end sat 20px further left, putting the box centre 1.5px from the
  lane and inside the 10px hit stroke; right-justified, the same centre landed
  in open SVG and Playwright reported `<svg> intercepts pointer events` for 30
  seconds. Click at `getPointAtLength(total/2)` instead — on the path by
  construction — and compute the offset against **`locator.boundingBox()`**,
  not `getBoundingClientRect()`: Playwright's `position` is relative to its own
  box, and for an SVG child the two do not agree (the stroke outset).
- **A collapsed scale has to mark every bar, including the ones that landed on
  the floor by arithmetic.** When the fit pushes `maxLen` down to the floor,
  the widest edges are drawn at their true proportion (trivially) and are not
  *clamped* — so the honest-looking rule ("floored = clamped") left
  `pitch_system` showing 24 identical bars of which 13 wore no break mark and
  therefore claimed to be a measured proportion. `collapsed` in `rowPositions`
  marks all of them. The browser tier caught this, not the fast tier.
- **The fast tier runs in a real browser too** (`test.html`), where an inline
  length is re-serialised: `style.marginTop = "226.19999999999982px"` reads
  back `"226.2px"` in Chrome and unchanged in the DOM shim. Compare inline
  lengths as parsed numbers with a tolerance, never as strings.
- **`/\.tv__head\s*\{[^}]*\bheight:/` matches `line-height:`** — `\b` sits
  happily between `-` and `h`. The pairing test that ties `VA.DAG_FIT.headHeight`
  to the stylesheet's own `.tv__head { height: 26px }` needs
  `[;{\s]height:` and failed with `25 !== 26` until it got it.
- **`data/` is shared, and two other worktrees rebuilt the projection
  mid-session — twice in five minutes.** The fixture-drift guards went red 40
  seconds after being green: first
  `annotate_affordances_flyout_and_mesh_gating` rebuilt
  `data/projections/viewer/topologies.json` with a builder that writes
  `parts[].mesh`, then `stack_title_style_pass` rebuilt both projections with
  one that writes `description`, neither of which this branch's committed
  `fixtures.js` / `topology_fixtures.js` has heard of. Nothing to do with this
  handoff and nothing to fix here (those branches own regenerating the
  fixtures), but **check `built_at` and `provenance.branch` in the projection
  before believing a fixture-drift red is yours** — and re-check any number you
  measured off it. Both rebuilds left the layouts identical, so every number
  above still holds; a rebuild that had changed a walk would have silently
  invalidated the table.
- The CRLF trap the `viewer_browser_tier_wait_predicates` lesson documents is
  real and I walked into it: Python universal-newline read + `newline=""` write
  silently converts a CRLF file to LF. With `core.autocrlf=true` the committed
  blob is identical either way so `git diff` stays clean and it is invisible —
  convert back anyway, or `git status` shows five modified files that have no
  diff.

## Verified

- `node apps/viewer/run_tests.cjs`: 241/241 (worktree).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 290/292 —
  the two reds are the concurrent-rebuild fixture drift above (`fixtures.js`
  and `topology_fixtures.js` against a projection two other branches rebuilt
  while this one ran), not this branch. Every test this handoff added is green
  in both tiers.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  16/16 suites, topology page 118/118 sub-checks over `file://` and http,
  height budget 18/18 (the fit and the centring re-measured at every length
  mode, mock and real, plus a window resize).
- `venv-win/Scripts/python.exe -m pytest -q`: 768 passed, 1 skipped.
