---
type: review
handoff: docs/sessions/active/HANDOFF_20261111_the_pane_follows_the_one_selection_both_ways.md
reviewer: agent
date: 2026-11-12
verdict: APPROVE
blockers: 0
---

# Review: the_pane_follows_the_one_selection_both_ways

The branch `handoff/the_pane_follows_the_one_selection_both_ways` (6 commits, to
`3a90d2be`) is a fast-forward of `integration` `9a17df0f`. Containment did not hold
before the merge, so this review is the gate. This is the first review of this slug:
there is no prior report and no prior commit on `review/…`. The lesson and issue arrive
as `A`, so they overwrite nothing.

## What I verified

- **Items 1–2 (one post; a pane-side let-go lets go).** `syncSceneInspect` no longer
  posts anything. It reads each tree through `VA.sceneInspectStep(tree, node, held)`
  and calls `unfreeze()` only when a tree shows the node's end rows, none selected,
  after the pane had been seen holding one. The page's selection now goes out once,
  as `model select node <id>`, deduped by `sceneSelectPosted`. `followScenePick` runs
  before `syncSceneInspect` on each tree, and its new guard keeps the pane's answer
  from turning an interface into a feature. Measured in my whole-tier run, on the
  end-stop v2 with P2: `told the pane ["model select node hub_spindle_bore_axis"]`
  after 12 DAG marks and two repaints. After the pane let go: `rows 0, dots 0,
  preview empty`, and nothing was re-posted.
- **Item 3 (an edge is a highlight while a run is loaded).**
  `VA.annotateEdgeIsHighlight` returns true on a kinematic page, or when
  `paneRunTopology === topologyId`. `annotateParamsFor` drops the edge in that case.
  On a run change, `paneFollowed` is re-keyed so that the next paint does not `goto`
  away from the run the pane just loaded. `annotate:state` does carry `topology`
  (`postEmbedState` → `AA.embedState`). Measured: the only post was `highlight
  vpa_end_stop_v2 tan_link_mount_height`, the sweep stayed, and 6 leaders stayed drawn.
- **Item 4 (Esc asks the pane).** `embedTree` now carries `armed`. Both Escape
  handlers test `VA.scenePickArmed`, and `VA.sceneRowsPressed` is gone. No live caller
  remains: `git grep` finds the name only in a pin comment. Measured: Esc while armed
  left the pane unarmed and the page holding `rows 1, dots 1, frozen`.
- **Item 5 (one pane selection).** It landed. `selectInSweep` routes `model select
  node` to the node's first joint-row end (`AA.sweepNodeEnd`), `modelSelection()`
  derives the dot from `sweep.inspect`, and `cmdInspect` clears `model.selected`.
  There is no protocol change. It is pinned in annotate fast (`AA.sweepNodeEnd` /
  `sweepEndNode`), in viewer fast (`sceneInspectStep`), and in the browser (`dot:
  null` while the rail holds the end).
- **Item 6 (contributor Pick retired).** The button, `CONTRIBUTOR_ALERT_WORDS.pick`
  and `SWEEP_RAIL_WORDS.pick/repick` are gone. The re-pick browser check is
  re-anchored onto `cmdGoto` (`[real] a goto from sweep mode…`), and the
  every-contributor-row check is retired with its spec. The `tree-row__repick` class
  that remains is the shared button style of the accept/switch/take controls. That
  is not residue.
- **Shots.** I looked at b2 and c2 at 3840. b2 shows nothing lit and the Preview at
  rest. c2 shows the grid row selected, its two end features lit, the sweep bar up
  and leaders on. Both match the lesson's table. The narrow 3D pane is real, and it
  is filed (`ISSUE_20261112_at_3840_the_3d_pane_is_a_narrow_strip_under_the_sweep_bar.md`,
  `audience: strategy`), which is right, since layout is F1c's.
- **Witness specs.** I checked the added, renamed and retired lists against `git diff
  --name-status`. They agree except for one count (fixed inline, below). The
  `DECLARED_GUARDS` pins are fast 681→683, annotate 307→308 and browser 873→877, and
  `tests/test_mutation_witnesses.py` is green on them.
- **Tactical suite record.** It is present and consistent: default pytest `1 failed`
  (the deliberate worktree red), `1927 passed`, 419 s; viewer 683/683; annotate
  308/308; 12 browser suites `--only`; one `--only` witness run per spec. The benefit
  of the doubt holds, so I ran no full suite before the merge.
- **Tolerance-stack mandatory checks 1–7.** Not applicable. The diff contains no
  stack, topology, spec-library or projection input, so there are no element values
  to trace, no signs, no LMC/MMC, no RSS and no traced ratio.

## Tests

| when | tier | command (review worktree unless noted) | result | wall |
| --- | --- | --- | --- | ---: |
| pre-merge subset | viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 683/683 | — |
| pre-merge subset | annotate fast | `node apps/annotate/run_tests.cjs` | 308/308, no `SKIP [real]` lines | — |
| pre-merge subset | pytest | `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`, `test_js_vocabulary_is_generated`, `test_feature_identity`, `test_part_mesh_aliases`, `test_mutation_witnesses`, `test_architecture_inventory`, `test_claims_registry` | 239 passed | 106 s |
| post-merge | default pytest | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | **1 failed, 1927 passed, 1 skipped, 2 deselected**. The failure is `test_viewer_js_suite_is_green`, the deliberate worktree red, armed instead through `--repo` above. This conftest prints no contention header lines. | 426 s, recorded, inside budget |
| post-merge | whole browser tier | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (node_modules junctioned) | **44/44, 1134 checks**. The runner's own ledger row reads OVER BUDGET (1885 s vs 1800 s). I appended the measurement to the open `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`. | 1885 s |
| post-merge | witness gate | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since master` | **30/37 witnessed, 37/59 reached, 22 left to the sweep (budget)**, exit 1. All 7 not witnessed are entries in one suite whose clean run was red, see below. | 1783 s, recorded |
| post-merge, after my edits | prose corpus | `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`, `test_claims_registry` | 222 passed | 14 s |

**The 7 not witnessed are not this merge's.** They are all in `annotate model in the
scene`, whose no-mutation run was red 0/9 (`#annotate-flyout iframe` null). That suite
went 22/22 inside my whole-tier run on this same tree. Run alone with `--only` it is
0/9 on this tree **and on pristine `integration` `9a17df0f`** (`git archive` under
`data/scratch/`, same `--repo`). Nothing in the shared `data/` changed between those
runs. So it is an order-dependent suite, not a decay this diff caused, and it is
filed `high` as
`ISSUE_20261112_the_annotate_model_in_the_scene_suite_is_red_run_alone_and_green_in_the_full_tier.md`.
Every entry the gate reached outside that suite was witnessed. The branch's own new
browser specs fell in the 22 the budget left to the sweep. The tactical lesson records
each one WITNESSED with `--only`.

## Findings

**Blockers:** none.

**Should-fix:** none.

**Nits**

1. *(fixed inline: a correction blockquote in the lesson)* The lesson's "Added (fast 2,
   …)" is fast **3**: three spec files, which is also what the +2 net pin says. The
   renamed contributor-alert guard is an **annotate** guard, not a fast one.
2. *(not fixed; code-read, not reachable in what I measured)* `selectInSweep`
   (`apps/annotate/app.js`) keeps the pane's inspect only if it is the node's FIRST
   joint-row end. A different end of the same node held in the pane would be replaced
   on the page's next `model select node` re-post, and the page re-posts after every
   `annotate:state`. The deleted `syncSceneInspect` explicitly kept "any end row of
   the node, if one is already the pane's". I probed v2/P2: the selected feature's
   body offers a single end row (`hub_boss_in_tan_link_mount_pilot`), so no gesture I
   could find reaches a second end. It is a nit with no issue. It is recorded as a new
   overlay entry so a later diff that exposes two end rows gets asked about it.

**Filed:** `ISSUE_20261112_the_annotate_model_in_the_scene_suite_is_red_run_alone_and_green_in_the_full_tier.md`
(high, pre-existing, outside the handoff). Measurement appended to
`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`.

**Design (non-blocking):** nothing new beyond the narrow 3D pane the author already filed.

## Overlay

Added a Recurring-bugs entry: a coarse selection posted into a finer one picks a
representative, and a re-post overwrites the finer choice (nit 2).

## Note for the next reviewer

A red witness baseline in `annotate model in the scene` is the issue above, not your
diff. Baseline it with `--only` on `git archive integration` before you charge it to
anyone.
