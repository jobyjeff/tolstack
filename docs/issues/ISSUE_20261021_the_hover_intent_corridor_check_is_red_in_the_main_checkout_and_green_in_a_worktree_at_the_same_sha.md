---
type: bug
priority: high
status: triaged
area: scripts/browser-tier
reporter: agent
class: guard_depends_on_checkout_state
found_by: dispatch/docs/sessions/lessons/LESSONS_20261021_triage_sweep.md
handoff: docs/sessions/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md
---

# The hover-intent corridor check is red in the main checkout and green in a worktree at the same sha

`node scripts/run_viewer_browser_tests.mjs` in `C:\workspace\tolstack`, on
master `9ce8262` (the 2026-10-21 batch merge, a fast-forward of
`integration`), fails one sub-check under both `topology file://` and
`topology http`:

```
[topology file://] 234/235 sub-checks passed: FAIL
    FAIL sub-check: a trigger crossed while the pointer is heading for the open card does not steal it
[topology http] 234/235 sub-checks passed: FAIL
26/28 browser checks passed
```

What is established (2026-10-21):

| where | sha | command | result |
|---|---|---|---|
| main checkout | `9ce8262` | full runner, machine loaded | FAIL (234/235 ×2) |
| main checkout | `9ce8262` | full runner, re-run after the mutation tier finished | FAIL (234/235 ×2) |
| main checkout | `9ce8262` | `--only "topology file://"` | FAIL (234/235) |
| clean worktree, `node_modules` junctioned, `--repo C:/workspace/tolstack` | `7b69d91` (pre-merge trunk) | `--only "topology file://"` | PASS 235/235 |
| same worktree | `9ce8262` | same | PASS 235/235 |
| same worktree, plus main's `data/meshes` junctioned | `9ce8262` and `7b69d91` | same | PASS 235/235 both |

So it is **not load-flaky** (it is red in isolation in main) and it is **not
shown to be a code regression** (the same code passes elsewhere). It depends
on something that only the main checkout has and that `--repo` does not
re-point. The check's approach geometry is `approachFrom` (around line 1840
of the runner), aimed at the citation card opened from
`tr.tvrow[data-id='base_thickness']`. The card's size depends on what it
renders, so the likely suspects are anything under `C:\workspace\tolstack\data\`
other than `data/projections/` and `data/meshes/`, or state a previous run
left behind. Not established. The mutation tier on the same tree was
258/258 WITNESSED, exit 0.

The merge's own suites were green (`pytest -q` 1514 passed on the bridged
candidate; node viewer 544/544, annotate 205/205; mutation 258/258). This is
the one red on trunk: until it is fixed, a sweep cannot tell "still this
one" from "this one plus something new". The failing check is named here
for exactly that reason.

Fix belongs in the staged
`docs/sessions/HANDOFF_20261021_browser_tiers_name_their_failure_instead_of_aborting.md`
(item 6, widened by this issue): find what main-only state the check
depends on, then make the check independent of it. Do not weaken the
assertion.

## Addendum 2026-10-21 (evening) — browser_tiers_name_their_failure_instead_of_aborting

No main-only state found. The citation card at `base_thickness` measures the
same in both trees under file:// (`[546,409,460,426]`, the mock fixture's
`blob:` crop, no repaint over 2.25 s), and master `ba066b0`'s unchanged code
passes `--only "topology file://"` 235/235 in the main checkout now. What can
read "stolen" without a defect: two locator round trips after the pointer came
to rest ON the trigger, which a slow box can push past `VA.HOVER_INTENT_MS`,
the by-design expiry. The check now reads both counts in one `evaluate`,
stamped with the time since the browser's own `mouseenter`. Only an in-window
reading is a verdict, and an out-of-window one is re-measured and never
passed. A recurrence prints `read <n>ms after the trigger's mouseenter`.
Three full runs, 28/28 each: the handoff's lesson.
