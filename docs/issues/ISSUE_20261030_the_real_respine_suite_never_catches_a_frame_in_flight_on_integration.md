---
type: bug
priority: med
status: open
area: viewer/topology respine (browser tier)
reporter: agent
class: browser_tier_red_on_integration
found_by: docs/sessions/HANDOFF_20261030_descending_leaders_take_a_path_that_cannot_cross.md
---

# The `[real]` respine checks fail on integration: no in-flight frame is ever observed

Found while running the browser suites this handoff's diff touches. The
suite `topology file:// respine` fails **five** `[real]` sub-checks with the
integration tip's own files (`2cd5a85d`, this branch's base, the three app/test
files swapped back to `integration:` for the run), so it is not the leader
change:

```
node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "topology file:// respine"
[topology file:// respine] 30/35 sub-checks passed: FAIL
  [real] a study click puts a real transition in flight — the app shell animates the respine rather than repainting it
  [real] deselecting a study animates too, rather than repainting the walk back in
  [real] and the incoming walk is drawn inside the pane in the grow direction too, which is the direction that used to clip
  [real] a respine carries the reader's sideways scroll onto the FIRST frame rather than rebuilding the pane back at the left edge (topology_grid_scroll_and_grips)
  [real] and so does DEselecting — the nav's topology row is the only other way to re-serialise this page now that the toolbar's layout toggle is gone
```

Reproduced twice on the branch and once on the base, 2026-10-30, from a
worktree with the main checkout's `node_modules` junctioned in and the
projections at `17e3caf48adb`. The first failure prints `no in-flight frame
was ever observed`; the other four depend on catching that frame. Either the
study click no longer animates the respine on the real product model (a
regression from one of the 2026-10-29/30 landings — the Preview pane and the
DAG zoom both touched the shell's render path), or `catchFrame` loses the race
on this box (the check's own comment says it is raced against a 260 ms
transition). The `[mock]` respine checks in the same suite pass.

Not this handoff's to fix: the leader geometry change does not touch the
respine path, and the failure is identical without it.

**Addendum, same day.** A fourth run on the branch passed the first check and
failed three (`41/44`: the two deselect checks and the grow-direction one), so
the count moves between runs — evidence for the race reading over a hard
regression, but the deselect half never passed in four runs.
