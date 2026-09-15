---
priority: high
depends_on: [viewer_study_verdicts_and_gaps]
model: opus
---

# HANDOFF 2026-09-15 — viewer_nav_wedge_and_classic_retirement: no more "classic view" chips, and no click may wedge the page

Source: Jeff's 2026-09-15 review (forge note `20260915T145908_fwc7qp`):
"Classic view: Why is this still here? I had you completely delete that page,
and now it's sneaking back into this page. Even worse, when you click on a
classic view, the page gets wedged on that item and can't unstick unless you
do a page refresh. Just get rid of it (verify all the tolerance stacks have
been migrated to dag style)." Baseline: `master` @ `3141e51` +
`viewer_study_verdicts_and_gaps` merged (it moves the verdict/gap content the
classic view was kept alive to show onto the DAG page). Scope: this session
owns `apps/viewer/views/nav.js`, `apps/viewer/topology_app.js` (nav handlers
only — NOT the respine/tween code owned by `respine_tween_fidelity_round2`),
`apps/viewer/views/stack.js`, `apps/viewer/topology.js` nav-tree helpers, and
their tests. Do NOT touch `apps/annotate/`.

## Context — what "classic" is today, and why clicking one wedges

- The classic *page* was retired 2026-09-04 (`index.html` → redirect), but
  the classic *renderer* (`views/stack.js`, 724 lines) was kept and mounted
  inside the DAG page: `views/nav.js:86-100` nests every topology-covered
  stack as a child row with a **"classic view" chip** (`nav.js:91`), because
  authored per-stack checks/verdicts only rendered there. After
  `viewer_study_verdicts_and_gaps`, that reason is gone.
- **The wedge**: `onNavStack` (`topology_app.js:452`), `onNavTopology`
  (`:422`) and `onNavStudy` (`:438`) all call `loadWorksheet().then(render)`
  with **no `.catch`** — and `selectStack()` flips `state.mode` to `"stack"`
  *before* the promise, so a rejection strands the page in stack mode with no
  repaint. This is the same bug shape as the 2026-09-09 silently-empty-DAG
  incident (the comment at `topology_app.js:869-874` names it), which was
  fixed for `onReload` (`:906-910`) but not for the nav handlers. Related:
  `docs/issues/ISSUE_20260909_served_via_drawing_checker_cannot_reach_worksheets.md`
  (triaged, not resolved) — worksheet fetches DO fail on the served origin,
  so this path is hit in real use, not just on stale FSA handles.
- Migration status (measured 2026-09-15): 4 of 7 stacks have topologies
  (`pitch_link_to_pitch_plate`, `rotor_fastener_length`,
  `tan_link_to_pitch_plate_take2`, `vpa_output_to_pitch_plate`); 3 are
  classic-only: `tan_link_to_pitch_plate` (take 1 — deliberately fenced,
  `tests/test_topology_conversions.py:188-203` pins that no topology exists
  for it) and `hub_bearing_thermal_fit_m1`/`_m2` (thermal archetype locked
  classic by `HANDOFF_20260908_linear_stack_conversions.md:47`; its graph
  future is a separate strategy draft).

## Deliverables

1. **Error containment on every nav handler.** `onNavStack`, `onNavTopology`,
   `onNavStudy` get the same `.catch` treatment `onReload` got: on failure,
   restore a renderable state and show the error banner. No click may leave
   the page wedged. Test the served-origin worksheet-miss path specifically.
2. **The "classic view" chip disappears.** Topology-covered stacks lose their
   nested classic child rows — the DAG entry is the only entry. Verify first
   (and pin with a test) that nothing the classic view rendered for a covered
   stack is now absent from the DAG page (verdicts, gaps, excluded terms,
   zero-width warnings — all landed by the dependency); if something still
   is, render it there rather than keeping the chip.
3. **The three classic-only stacks.** `tan_link_to_pitch_plate` (take 1) is a
   superseded first pass kept for history — drop it from the nav (the JSON
   stays; record the decision in the lesson). The two thermal-fit stacks stay
   reachable — they are real deliverables with no topology by design — but
   rendered as plain stack pages with no "classic" labeling anywhere; from
   the user's seat there is one viewer, and some entries simply have no DAG.
4. **Copy check.** Any surviving user-visible string that says "classic" goes.

## Definition of done

- Manual + test evidence: clicking every row in the nav tree (all topologies,
  all studies, both thermal stacks) on both transports (FSA and the served
  origin with worksheets unreachable) never wedges — every failure shows the
  banner and the page stays navigable.
- No "classic view" chip or "classic" copy anywhere; take-1 absent from the
  nav; thermal stacks reachable and rendering.
- Full suite green (the nav-tree tests that pinned classic children will need
  deliberate updates — cite this handoff in them).
- Lesson: record the take-1 removal decision and anything the classic
  renderer still uniquely owns after this (should be: nothing but the two
  thermal pages).
