---
type: bug
priority: med
status: resolved
area: browser TRUTH tier / a suggestion names its face
reporter: agent
class: timing_assertion_under_load
found_by: docs/sessions/active/HANDOFF_20261117_a_joint_says_what_kind_it_is.md
handoff: docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md
resolution: the suite clicked twisties and hovered a nav that was still repainting while the sweep opened its parts, and read back nothing; it now waits out the sweep, clicks each twisty until the page reports it expanded, re-hovers until the pane washes, and throws naming what is missing (measured red 4 of 5 baseline runs in three places, green 3 of 3 after)
---

# The "a suggestion names its face" suite flakes: the mount's suggestion line never appears

`scripts/run_viewer_browser_tests.mjs`, `testSuggestionNamesItsFace`, step 1.
On the kinematic page the suite opens the body of
`tan_link_mount_215175_002@tan_link_mount_hub_face` and waits 60 s for its
`.navtree__featurestate[data-look]` line. Sometimes the line never appears.
The log then reads `the mount's suggestion line names face NaN; surest
proposal undefined`, and two sub-checks go red:

- `[real] hovering a suggestion line in the tree lights its face in the pane`
- `[real] Take on a suggestion line writes one accept event, for the surest proposal and its face`

A red run also costs about 250 s of extra wall time (the 60 s line wait plus
a 180 s wait for a sha that is `undefined`). The suite took 372 s in the
whole-tier run where it went red, which is most of that run's overrun of the
merge budget (`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`).

Measured 2026-11-17 in the review of `a_joint_says_what_kind_it_is`, against
one scratch root (`data/scratch/jk_review`, every projection built from the
merged tree), `--only "a suggestion names its face"`:

| tree | runs | red |
| --- | --- | --- |
| `integration` `e464809e` (git archive export) | 2 | 1 |
| merged `df13a375` | 2 | 1 |
| merged, whole tier | 1 | 1 |

A green run names face 134 and `proposal-0048-tan_link_mount_height-from`.
So the data is there, and the line is only sometimes rendered in time. The
cause is not settled. Candidates are the `openBody` twisty clicks, which
swallow their errors with `.catch(() => {})` and can miss on a tree still
rebuilding, and a wait that should key on a settled tree rather than on a
fixed timeout. Fix shape: wait for the part's row and the feature's twisty to
be present and expanded before waiting for the line, and fail fast naming
which of the two was missing.

## 2026-11-17 triage sweep

Staged as `docs/sessions/HANDOFF_20261117_the_suggestion_and_take_real_checks_wait_on_a_settled_tree.md` together with the annotate-rail Take flake (same file; both read the tree after an action). Source: dispatch/docs/sessions/lessons/LESSONS_20261117_triage_sweep.md.
