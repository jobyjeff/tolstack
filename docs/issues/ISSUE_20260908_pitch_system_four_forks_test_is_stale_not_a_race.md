---
type: bug
priority: med
status: resolved
area: apps/viewer/tests.js
reporter: agent
handoff: docs/sessions/HANDOFF_20260909_tolstack_viewer_js_suite_drift.md
resolution: handoff completed 2026-09-09 -- closed automatically by dispatch when handoff `tolstack_viewer_js_suite_drift` moved to completed/; not independently verified.
---

# `[real] the pitch system's four forks are marked` asserts a stale count (4), and every recent review has re-labelled the mismatch a "race" without re-deriving it

`apps/viewer/tests.js` (~line 3085) asserts:

```js
ok(livePitch.branch_nodes.length === 4,
   "expected 4 branch points, got " + livePitch.branch_nodes.length);
```

Rebuilding `data/projections/viewer/topologies.json` from a tree that fully
contains `integration` (this review's merge of `annotate_deep_link_and_part_filter`)
still produces **5** branch nodes for `pitch_system`
(`hub_lower_bearing_flange`, `hub_top_deck`, `piston_rod_end_bore`,
`pitch_arm_blade_root_clocking`, `gas_spring_mount_flange`), and the test
fails the same way every time: `210/211` (or `204/205`, `167/168`, etc. —
the numerator/denominator shift, this one test does not).

**This is not a rebuild race.** Two independent sources already agree 5 is
correct and have since 2026-09-06:

- `docs/DAG_TOPOLOGY.md`'s L2 section states *"12 parts, 21 interfaces,
  24 edges, **5 branch points**, 4 grounded loops"*.
- `REVIEW_20260906_mechanical_stroke_stack.md` independently re-derived the
  same structural counts **in Python**, directly from the loaded topology
  (`len(t.branch_nodes())`, not read from prose), and recorded "all match
  `docs/DAG_TOPOLOGY.md`'s updated L2 section exactly."

So the JS test's `=== 4` has been wrong since at least whatever commit
brought the graph to 5 branch points (on or before 2026-09-06), and every
review since (`viewer_v2_single_nav`'s loopback review, and this handoff's
own lesson) has repeated the "pre-existing branch-count race" characterization
from `LESSONS_20260908_viewer_v2_single_nav.md` §7 without re-running the
independent Python derivation `mechanical_stroke_stack`'s review already did.
That lesson's own theory (concurrent rebuild from a stale tree) does not
survive a rebuild from a tree that contains everything: the count is stable
at 5, not flapping between 4 and 5.

**Consequence:** the viewer's `[real]` suite has carried one permanently-red
test for at least three handoffs, and each review's "N/N+1 passed, one
pre-existing unrelated failure" framing has made it easy to keep not looking
at it closely.

**Fix**: update the test's expected count to 5 (and its two DOM assertions,
`circle.rail__dot--branch` / `tr.tvrow--branch`, from 4 to 5 — check which
node is the newly-missing one in the rendered rail first, don't just bump
the number), or, if 5 is itself wrong, correct `docs/DAG_TOPOLOGY.md` and the
`mechanical_stroke_stack` review's counts instead. Given two independent
by-hand derivations already agree on 5, the test is almost certainly the
stale side.
