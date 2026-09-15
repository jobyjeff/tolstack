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

**At compact density the same topology fits, in all three modes**, which is
worth knowing before anyone reads the comfortable-density overflow as a
failure: 45 rows × 16px = 720px against the same 782px budget, so uniform and
feature size come in at 720 and tolerance width lands **exactly on 782** with
13 of its 24 edges drawn in true proportion and 11 on the floor. The scaled
mode says something real there; at comfortable density it cannot. That is the
subject of `ISSUE_20260914_scaled_length_modes_collapse_on_a_tall_dag.md`.

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

## Round 2 — the review's two blockers, and why they were invisible

`REVIEW_20260914_viewer_dag_spine_layout.md` returned REQUEST CHANGES with the
behaviour verified correct and every published number re-derived. Both blockers
were the same shape: **a deliverable that survives a one-line revert with all
three tiers 100% green**, found by mutating the wiring in a scratch tree rather
than by reading the diff. Worth internalising, because I wrote nine tests for
deliverable 1 and none of them could see it.

- **B1 — the mirror's render wiring.** Every test called `VA.spineRight`
  itself, so deleting the one call in `renderTopoPane` changed nothing any of
  them looked at. The structural reason is worth remembering: **a column mirror
  moves only x, and essentially every check on this page measures y** —
  correspondence compares leader ends to dot centres (which move together),
  `BARS_MATCH_STORE_IN_PAGE` re-mirrors the layout before comparing, and the
  fast tier's render tests count classes. Fixed by reading the x's the page
  actually drew: mainline dots and bars at `railX(columns − 1)`, no rail to the
  right of them, at least one rail to the left (or it would pass forever on a
  one-column diagram), and every mainline leader starting clear of every rail.
  Verified failing under the revert (`base_datum: 15 !== 35`).
- **B2 — the centring rule.** `VA.centreOffsets` falls back to height-centring
  when a serialisation has no leaders, so `if (plan.leaders.length)` → `if
  (false)` silently ships the handoff's literal reading — the very thing the
  measurement rejected — and the browser tier's `gridOffset` checks still pass,
  because they compare the DOM against the store under *any* rule. Fixed by
  pinning the property that makes leader-span centring the right rule rather
  than the offset it produces: nudging the grid a row either way must make the
  worst jog worse (it is the min-max optimum), plus a lopsided fixture where
  the two rules differ by more than 2×. Verified failing under the revert.

**The transferable rule:** when a deliverable is a *call site* rather than a
computation, test the call site. "I tested the pure function and the pure
function is right" is exactly how a dead wiring line ships green.

The three should-fixes went the same round: the browser tier no longer restates
`pitch_system`'s floor minimum as `26 * 45` (it computes `floorMin` from the
layout, next to where `FIT_IN_PAGE` already did), the centring contracts gained
`gridOffset > 1` non-vacuity witnesses in both the `[mock]` and `[real]`
blocks, and **every live number in `apps/viewer/README.md` is now paired
against the live projection** by a `[real]` test that parses the prose and
re-derives it (the crossings totals 92 → 43 and 47 → 43, the max jog
507 → 208, and 45 rows × 26px = 1170px). That last one is the repo's own rule
about quantities in prose finally applied to the numbers this handoff
published; `docs/sessions/` stays exempt as dated history.

One thing the review flagged that has no fix here, only a fence:
**`VA.lastTopoRender` is render state a test can read *instead of* the DOM**,
and that is part of how B1 stayed invisible. It exists for two real reasons
(the browser tier needs the budget the render measured; the animation handoff
needs a store outliving one paint) — but anything that reads it is asking the
view-model, not the page, and needs a DOM-level check beside it.

## Verified

- `node apps/viewer/run_tests.cjs`: 241/241 (worktree).
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 291/295 —
  four reds, none this branch's, and by the end of round 2 the shared
  projection had been rebuilt by **three** other worktrees (`…mesh_gating`,
  `stack_title_style_pass`, `spec_crop_region_registry`). Extracting today's
  `integration` to a scratch tree (`git archive integration | tar -x`) and
  running the same command there gives 295/297: two of my four (the
  `description` fixture drift) are already fixed on `integration` by branches
  that have since landed, and the other two (`crops.json` gaining
  `region_label`/`region_match`, and `located_by = "declared_region"` having no
  viewer branch) are red on `integration` itself. Every test this handoff added
  is green in both tiers.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack`:
  16/16 suites, topology page 118/118 sub-checks over `file://` and http,
  height budget 18/18 (the fit and the centring re-measured at every length
  mode, mock and real, plus a window resize).
- `venv-win/Scripts/python.exe -m pytest -q`: 768 passed, 1 skipped.
