---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste.md
reviewer: agent
date: 2026-11-05
verdict: APPROVE
blockers: 0
round: 2
---

# Review — the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste

Branch `handoff/the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste`
(tip `2a232a2a`, 7 commits). It was not already in `integration` (containment
checked). I merged it into `review/…` (`cdc9b9f7`, clean), then merged the
moved `integration` (`7405e9a2`, one board-only commit, clean). **Nothing has
landed on `integration`.** The verdict is REQUEST CHANGES, so the review
branch holds the merge and waits for round 2.

## Summary

The work is good. It covers all four deliverables, the DoD shots are there
and match their captions, and the lesson's width table re-derives exactly
from `measurements.json` (gutters 20/30/42 × 13 column steps → 420/550/706).
The scheme table works as specified: a seventh scheme is one entry plus its
tokens. The four follow-up issues all carry correct frontmatter.

One finding blocks, and it is this repo's recorded house rule, not a matter
of taste: three of the deliverables are each one line in `topology_app.js`
from being silently reverted.

## Not applicable: the seven stack checks

These are checks 1–7: trace, signs, 2b, LMC/MMC, RSS, nominal-in-band,
quantised hardware and the traced ratio. **This is a viewer/annotator
display change.** It adds, moves and re-labels no stack, topology or
element value. Projections rebuilt from the merged tree give the same study
results as before (blade pitch: worst case ±2.355 / RSS ±1.034 at −7,
±0.784 / ±0.283 at +72). There is one arithmetic-adjacent new surface,
`contribution`, and it only bins the projection's own `magnitude` per edge
into five colour steps. It prints the bin bounds through `VA.fmt` in the
legend and adds nothing up (`VA.kinematicContributions` takes the max of
|magnitude| per edge). It is not a second combiner.

## Verification

| what | where | result |
| --- | --- | --- |
| Risky pytest subset, pre-landing: `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`, `test_viewer_deep_link_contract`, `test_js_vocabulary_is_generated`, `test_feature_identity`, `test_part_mesh_aliases`, `test_app_type_scale`, `test_mutation_witnesses`, `test_claims_registry`, `test_tolerance_stack`, `test_provenance`, `test_thermal_exception_list`, `test_architecture_inventory` | review worktree, merged tree | **422 passed** in 110 s |
| `node apps/viewer/run_tests.cjs` | review worktree. Inputs bridged (`dispatch bridge-test-inputs`), projections rebuilt from `7405e9a2` with `rebuild_projections.ps1 -RepoRoot <worktree>`; all four stamps `sha12=7405e9a2d7d4 dirty=False` | **645/645**, no SKIP |
| `node apps/annotate/run_tests.cjs` | same | **286/286**, no SKIP |
| `node scripts/run_viewer_browser_tests.mjs --repo <worktree>` | same, `node_modules` junctioned, run beside the full pytest on a box with ~10 queued browser jobs from other sessions | **39/41** in 1702 s. Every functional suite passed, including topology 205/205 ×2, DAG zoom 41/41, all annotate suites, and "annotate model in the scene" 21/21, which is the suite the new `model tint` post could have reddened. The two reds are `[suite file://]` and `[suite http]`: `page.goto` on `apps/viewer/test.html` timed out at 30 s at the **load** event, before any check ran. That page runs the same `tests.js` that the node tier passed 645/645, and the tactical run had 41/41, so I read this as load. A `--only "suite "` re-run sat in the slot queue for 15+ min behind two other handoffs' tiers and I stopped it, so **it is owed in round 2** |
| Full `pytest -q -p no:cacheprovider --ignore tests/test_browser_runner.py` (single-process: `pytest-xdist` is not installed in `venv-win`, so `-n 16` exits 4) | same | **1710 passed, 1 skipped, 2 deselected in 538 s**. Recorded as default tier, inside budget. The first full run sat 34 min at test 24 (`test_browser_runner.py`, which takes the browser slot) behind the same queue. I stopped it and re-ran without that one file, so **`tests/test_browser_runner.py` did not run here**. The diff does not touch the runner, the slot or `chromium.launch`. The suite prints no contention header lines; its conftest has none. The run left `git status` clean in the worktree and in the main checkout |
| Mutation-witness `--changed-since` | — | **not run by me**: the verdict is REQUEST CHANGES, and round 2 adds specs, so it runs then. The tactical record has 40/41 witnessed, and the one miss is a pre-existing decay it filed |

The tactical record was consistent with the diff. It names the full suite
(1 failure, an anchor it then fixed and re-tested alone), the browser tier
41/41, both fast tiers and the witness run. So the benefit of the doubt
held.

## Findings

### Blocker 1: the page wiring for the 3D tint, the remembered view and the live width is pinned by no tier

This is the overlay's "The whole deliverable is one line from being silently
reverted — mutate the wiring, not just the pure function" entry, the same
shape as the two 2026-09-14 blockers. Every new guard tests a pure helper:
`VA.sceneTintCommand`, `VA.readDagView`/`writeDagView`, `VA.applyGraphWidth`,
`AA.parseModelVerb`. Nothing tests that the page calls them.

I mutated a scratch copy of the merged tree and ran the fast tier against
this worktree's projection:

| mutation (one edit each) | fast tier | browser tier |
| --- | --- | --- |
| drop `VA.sceneTintCommand(currentTopology(), bodyInk)` from `syncSceneModel`'s `model` list (`topology_app.js`) | green | no check reads a `tint` word: `__shellModelWords` is asserted only for `lit` |
| drop `state.dagView = VA.readDagView(widthStore());` at boot | green | no check opens `#dag-view` or reloads |
| drop `VA.writeDagView(widthStore(), state.dagView);` in `onDagView` | green | same |
| drop `if (setting === "graphWidth") VA.applyGraphWidth(value);` | green | same |
| `ctx.overlay = VA.dagOverlay("none", …)` (control) | **red** (the overlay's-ink test) | — |

(Each run also showed the expected scratch-only freshness FAIL and a node-fs
SKIP. The scratch root is not a git tree and carries no projection.)

So deliverable 2's third surface (the 3D pane in the DAG tint, a DoD item),
deliverable 1's "persisted like the other view state", and deliverable 3
itself (the width setting changing the live page) can each be deleted in one
line with every tier green. The annotator side is open as well: no tier calls
`cmdModel`'s `tint` branch (`apps/annotate/app.js:4297`) or
`Scene.setPartTints`. `scene.js`'s `partBaseColor` is commented "read by a
test", but nothing in the tree calls it (`git grep partBaseColor` hits only
its definition). It looks like the check that was meant to read it never got
written. The shot script's `measurements.json` records
`"scene": {"messages": []}`, so even the probe captured no tint message.

**Fix (tactical):** add browser-tier checks on the real kinematic page, each
with a mutation spec:

- (a) the shell posts `model tint` with each part's body ink, and an embedded
  part's `partBaseColor` is the mix of its body's ink (or simply differs from
  its palette colour and equals a sibling in the same body);
- (b) picking a width in `#dag-view` widens `svg.tv__rails`, and the choice
  survives a `page.reload()`;
- (c) a chosen "Colour by" survives a reload and puts `.ovl` on the bars.

The overlay's "TWO mutations" entry applies to (b) and (c): the store latch is
visible only to the browser tier.

### Should-fix (round 2, same branch)

- **`gridLegendTints` is spliced into `gridRowMarks`'s doc comment**
  (`apps/viewer/topology.js`, about `:3945`). The new function and its comment
  sit between `VA.gridRowMarks`'s twenty-line comment and `VA.gridRowMarks`
  itself, so that comment now heads the wrong function. Move the new block
  above the old comment. Its bullet "the same index the DAG's container for
  that body is filled with" is also stale now: a container has no fill by
  default.
- **Dead claim in `scene.js`:** `partBaseColor`'s "read by a test" (see
  blocker 1). Resolved by writing check (a).

### Nits

- Every render of the toolbar adds a `document` click listener for the view
  popover (`dagViewMenu`'s `away`). It removes itself on the next click after
  its menu is detached. That copies the Groups popover's pattern and does no
  harm. Noted only because `onDagView` re-renders on every change.
- `toolbarHandlers.dagView.legend` calls `VA.dagOverlay` a second time per
  paint, beside `ctx.overlay`. It is cheap, but the two could share one
  result.

### Design (filed, non-blocking)

- `docs/issues/ISSUE_20261105_design_overlay_inks_include_state_greens_and_reds.md`
  (low). The `--ovl-if-*` comment says green and red were skipped, but
  `--ovl-if-2` is a green. The body inks at stroke strength include the
  greens and reds the grid uses for state.

## Universal checks

- **Test pollution:** the suite ran in the review worktree against its own
  bridged inputs and its own `data/projections/`. Nothing was written to the
  main checkout's `data/`.
- **Hoops for Jeff:** none. A malformed `model tint` throws at the agent's
  parse step.
- **New guards observed failing:** the 10 fast and 1 annotate specs are
  witnessed per the tactical run. The gap is blocker 1: guards that do not
  exist.
- **Restated counts:** `VA.CONTRIBUTION_STEPS`/`--ovl-seq-0..4` and
  `VA.PART_SHADES`/`.ovl-s1..2` pair a JS count with CSS rules by comment
  only. It is benign: the scheme falls back to the neutral ink when a token
  has no rule. Left as a note, not a finding.
- **Lesson arithmetic:** the widths, crossings and zoom figures match
  `measurements.json`. "10 new checks" matches the `fast` pin (+10,
  635 → 645), and the annotate pin is +1. The lesson honestly says the full
  suite was not re-run after `15f826df`. My post-merge run covers it.
- **Status letters:** the lesson and issues arrive as `A`. No earlier record
  is overwritten, and no prior review exists on this branch.

## Overlay updated

`docs/prompts/REVIEW_AGENT.md` now records this review as the second
sighting of "one line from being silently reverted", with the two tells it
showed and the MAX_PATH note for the scratch mutation root.

## Round 2 (2026-11-06)

The handoff branch gained `708645f4` (the fix) and `0ceb77c4` (the lesson's
round-1 record). I merged it into the review branch. `integration` moved three
times during the round: the stack-wording and everything-in-3d landings, then
the rail landing, then board and issue moves. I merged each one (`62720506`,
`5ec4c176`, `372353a0`). Two of those merges conflicted, both only on the
guard pins in `scripts/guard_enumeration.mjs`. I resolved them by
re-measuring the merged tree (`enumerateGuards` + `guardNameDigest`), and the
counts add exactly: fast 632 + 10 = **642**, annotate 290 + 1 = **291**,
browser 833 + 3 = **836** declared / 803 enrollable.

### The blocker is resolved

There are three browser checks on the real kinematic page, and all three
passed on the final merged tree:

| check | spec | measured |
| --- | --- | --- |
| the shell posts `model tint` and the scene paints one colour per body, never the part's own | 2 mutations: the page's post, the annotator's `setPartTints` call | 23 tinted parts, 8 bodies |
| a graph width picked in View widens the live DAG and survives a reload | 3 mutations: `applyGraphWidth` on change, the store write, the store read | 420 → 706 → 706 after a reload |
| colour-by `body` puts `.ovl` on the bars and the key, and survives a reload | 3 mutations: the render handed `none`, the store write, the store read | PASS |

They read `partBaseColor`, so its "read by a test" comment is now true. Each
mutation edits the wiring line that round 1 deleted by hand. Both halves of
the store latch are mutated, as the overlay's "TWO mutations" entry asks. The
should-fix is also done: `gridLegendTints` now sits above `gridRowMarks`'s
comment, and the comment's stale "is filled with" bullet now names the two
places the index is used.

### Verification on the final merged tree (`372353a0`)

Inputs were bridged, `node_modules` junctioned, and projections rebuilt from
`372353a0` with `behind_trunk=0`.

| what | result |
| --- | --- |
| `node apps/viewer/run_tests.cjs` | **642/642**, no SKIP |
| `node apps/annotate/run_tests.cjs` | **291/291**, no SKIP |
| full `pytest -q -p no:cacheprovider`, **including `tests/test_browser_runner.py`** (owed from round 1) | **1730 passed, 1 skipped, 2 deselected** in 1372 s |
| browser tier, full | **40/42**. `[suite file://]` and `[suite http]` passed 511/511 each, which pays round 1's debt. DAG zoom 41/41. The reds are below |
| browser `--only "leaders across the seam"`, alone | **26/26** |
| doc/claims/witness pytest subset after the report and overlay edits (29 files) | **1227 passed, 1 failed**. The failure is `test_mutation_witness_shadow_concurrency.py::test_two_different_repo_roots_both_still_succeed`. Its `copytree` writes `LESSONS_20261103_every_study_opens_in_3d_…_pane_already_open.png` (`4c0b7c62`) to a 263-char destination under `pytest-12900\…`, and that path does not depend on this tree. This is the filed, deferred `ISSUE_20261104_a_lesson_screenshot_name_overflows_max_path_in_the_shadow_concurrency_test.md`. The same test passed in the full run above |
| mutation witness `--only "embedded on the kinematic page, the shell posts each"` (the scene-tint spec) | **2/2 witnessed**: the page's post (2m29s) and the annotator's `setPartTints` call (1m26s) |
| mutation witness `--changed-since integration --repo <worktree>` | **40/41 witnessed**, 41 of 71 selected entries reached inside the 30-min cap, 30 left to the sweep (budget). The one miss is `fast__the-mount-without-a-launcher…__df8f9095`, the pre-existing decay the tactical agent filed (`ISSUE_20261105_the_mount_without_a_launcher_witness_stays_green.md`, `class: decayed_witness`). It shows the same verdict with `apps/viewer` taken from `integration`. The cap reached the new tint verb's annotate spec (witnessed). The 8 new browser mutations fell to the sweep. The tactical run witnessed each of them with `--only`, and my own `--only` on the scene-tint spec is below |

**The two red kinematic-page checks are integration's, not this branch's.**
`[real] hovering a sensitivity…` and `[real] clicking a term row selects
pitch_plate_attach_height…` match `/tangential link mount/` and
`/pitch-link attachment bore, height/`. `2e97a77a` (stack wording) renamed
both edges. I reproduced both reds on a detached worktree at integration
`5f9a95bf`, with its own projections and bridged inputs (22/24, these two),
then deleted it. Filed as
`ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
(high). Landing this branch neither adds nor removes those reds.

**Leaders across the seam** went red on one sub-check in each loaded full
run, a different one each time: the 1920×1080 resize, then the scene-pick
selection. It was 26/26 both times it ran alone. I read it as load.

**One false lead, recorded so the next reviewer skips it.** The first round-2
browser run also had a reproducible red, `[real] at scroll 0 the DAG's first
row is whole…`: the wheel never zoomed (0.55 → 0.55). It was **not** the
branch. Master had moved one commit past the tree, so every projection was
stamped `behind_trunk=1`. The viewer then drew its "Data is older than the
latest code" banner and pushed the DAG down 81 px (it started at y=269
instead of 188). The check's wheel aim is at y=200, which then landed above
the drawing. Merging the integration sync that carried that master commit
cleared it (41/41, drawing back at 188). A temporary console probe in the
runner located the banner. It was reverted before any commit.

### Verdict, round 2: APPROVE

The blocker is fixed, and its fix is witnessed. The should-fix is done, and
the nits stand as noted. Every remaining red is accounted for. Two are
integration's, filed with a reproduction on integration's own tip. One was
load, and it passed alone. The witness gate's one miss is a decay filed before
this review. Landed on `integration` as a fast-forward of the review branch.

Filed this round:
`ISSUE_20261106_two_kinematic_page_browser_checks_still_match_the_old_edge_names.md`
(high). Overlay: the stale-banner layout trap, under "A new warning that is
always on".

## Note for the round-2 reviewer (written in round 1)

The review branch already holds both merges. Re-merge the handoff branch,
re-run the browser tier (and confirm the new checks are in its 41+ count),
then run `run_mutation_witness_tests.mjs --changed-since integration --repo
<worktree>` with `node_modules` junctioned and the projections rebuilt from
the merged tree. Two runs this round could not finish because of the slot
queue, and they are owed: the browser tier's `[suite file://]` and
`[suite http]` (`--only "suite "`), and `pytest tests/test_browser_runner.py`.
