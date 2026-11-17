---
type: bug
priority: high
status: resolved
area: viewer/browser-tier
reporter: agent
found_by: dispatch/docs/sessions/lessons/LESSONS_20261116_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261116_the_window_resize_reclamp_holds_on_a_cold_run.md
resolution: handoff completed 2026-11-17 -- closed automatically by dispatch when handoff `the_window_resize_reclamp_holds_on_a_cold_run` moved to completed/; not independently verified.
---

# The window-resize check is red when its suite runs alone and green in the whole browser tier

Found at the second 2026-11-16 triage batch merge. Main checkout, master
`5584fbfe` (fast-forwarded from `68290d5a`), projections rebuilt at `5584fbfe`
(provenance clean, `behind_trunk=0`). Every declared input was present, so
this is not a provisioning gap.

| Run | Result |
| --- | --- |
| `node scripts/run_viewer_browser_tests.mjs` (whole tier, 48 suites) | `a window resize re-clamps the pane and the map (5120 to 1920, no reload)` **3/3 PASS** |
| `node scripts/run_viewer_browser_tests.mjs --only "a window resize re-clamps"`, twice, straight after | **2/3 FAIL**, both times |
| `node scripts/run_mutation_witness_tests.mjs --changed-since 68290d5a --budget-min 30`, entry `browser__real-shrinking-the-window-to-1920-re-clamps-the-pane-the__fa30ff82` | clean run **RED**, so the entry is `NOT WITNESSED` and the gate exits 1 (7/8 witnessed) |

The failing sub-check is
`[real] shrinking the window to 1920 re-clamps the pane: the region equals a fresh load's (+-2px) and the map is drawn`.
Every red run printed the same line:

    region 1841 (3D 1829) at 5120 -> 0 (3D 1829) after the shrink; a fresh load at 1920 gives 485 (3D 473)

Those are **exactly the pre-fix numbers** in
`docs/sessions/lessons/LESSONS_20261116_a_window_resize_reclamps_the_pane_and_the_map.md`
("before: region 0, 3D 1829"). On these runs the fix (`refitPane()` in the
debounced `resize` listener in `apps/viewer/topology_app.js`, commit
`20602fc4`) has no effect, so the 3D view keeps its 5120-wide pixel width.
The reverse of a load flake: green under load, red cold.

Not established: whether the listener runs at all on a cold single-suite page
(for example, `nodes.flyout.open` is false when the timer fires, or the timer
is pre-empted), or whether the whole tier passes only because an earlier
suite leaves state the resize suite inherits. The product bug may still be
live on a cold page, so this is not only a test defect.

Merged anyway (trunk before the merge had no resize fix at all, and the change
only adds a clamp); see the 2026-11-16 triage lesson.
