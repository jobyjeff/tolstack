---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_the_walk_reads_the_v2_study_and_the_map_on_the_merged_page.md
reviewer: agent
date: 2026-11-23
verdict: APPROVE
blockers: 0
---

# Review — the_walk_reads_the_v2_study_and_the_map_on_the_merged_page

The handoff asked for a walk and a review page for Jeff, with no code
changes. The branch is two commits (`fd3f9f92`, `d8efce0f`). Everything in it
is under `docs/issues/` and `docs/sessions/`: the page
(`docs/sessions/lessons/REVIEW_20261122_the_first_study_on_v2.md`), the
lesson, 24 shots, three new issues and one addendum. Every status letter is
`A` except the addendum (`M`, append-only, +14 lines). This is the
handoff's first run: no earlier review report or review-branch commits exist.

## What I verified

- **Jeff's log is untouched.** The main checkout's
  `data/inbox/feature-identity/` has 116 files. Using the lesson's recipe I
  get `efe47ec6…3145` for the sorted listing and `39e9abba…2e11` for the
  concatenated contents. Both match the page.
- **The replay re-walks.** Scratch event 0119 has the same nine faces as
  Jeff's 0103, in the same order (784, 773, 774, 782, 783, 786–789), and it
  supersedes 0118. Scratch 0118 has the same nine faces as Jeff's 0102. 0116
  and 0120 each hold 18 faces and carry the `-add` ids.
- **The "that is why" is dated against trunk at Jeff's time**, as the overlay
  asks. His 0102–0104 are 2026-11-23T04:29–04:30Z.
  `master@{2026-11-22 20:29 -0800}` is `e7df6649`. The `e7df6649..integration`
  diff of `apps/annotate/app.js` has hunks in `mateReferences`,
  `rankMatesAt`, `candidateRow` and `treeMates`. None is in `addArmedFace` or
  `cmdTake`. The lesson already says the mate list he saw may have differed.
- **The study numbers re-derive** from the scratch
  `projections/viewer/kinematic/kinematic_studies.json` (stamped
  `f267da494778`):
  - −7: −6.9917, ±2.355055 worst case, ±1.033947 RSS. +72: 72.0006,
    ±0.783695 / ±0.28294. Range ±1.730331 / ±0.976766.
  - Margins +1.216936 and −0.363364. v1 is identical in every field.
  - 33 contributors, 27 refused at each stop.
  - The grid shot (`11_study_minus7_grid`) shows "RSS +0.958" and "+1.718",
    as the page says.
- **The v2 counts re-derive** from `docs/topologies/topology_vpa_end_stop_v2.json`:
  105 edges, 24 valued (18 traced, 4 inferred, 2 untraced). The gap rows
  sum to 27 (4+3+5+4+3+8), and 6 + 27 = 33. The feature counts are
  consistent with each other: 50 Takes + 5 proposals + 10 with nothing =
  65 unbound.
- **The verdict count re-derives** from the table: 8 does it (J1, J6, J15–J18,
  J21, J23), 6 partly (J2, J3, J5, J19, J20, J22), 6 does not (J4, J7, J8,
  J10–J12), and 4 without a verdict.
- **The code-identity claim holds.** `git diff 3b7c68fe f267da49` outside
  `docs/sessions` and `docs/issues` is the one prompt file.
- **Shots match the rows I checked:** 11, 25, 43, 44.
- **Issues.** All three new issues have frontmatter in the contract
  (`type`/`priority`/`status: open`/`area`/`reporter`/`found_by`, no
  `handoff:`). Every issue cited by name exists: the pane-open, lug-rectangle,
  215071-C, Ⓜ-bonus and race-twice issues.
  - The addendum target is `deferred`. Its new text (the "DERIVED" chip
    beside "Open.") is a second sighting of the chip its 2026-10-26 addendum
    already records on `pitch_arm_radius`. It is not a new failure, so the
    "addendum to a deferred issue" entry does not fire.
- **The small-findings bundle against the named rules.** F1, F3, F4 and F5
  are judgement or functional items, not prose-budget or prohibition hits,
  so `low` stands.
- **Fenced successor.** The page and the issues hand the tree jump and the
  pattern bar to the staged binding-pane chain. Those handoffs exist, and
  F4 carries the numbers for them, so this work has an owner.

## Findings

### Should-fix — fixed inline (docs only, a correction blockquote)

1. **F2 is a false finding.**
   - **Where:** `ISSUE_20261123_small_findings_of_the_v2_study_walk.md` F2,
     and the page's "Smaller items" line.
   - **Claim:** both ends of "feather stop face to lower head seat face"
     are offered face 7, and "two features of one part cannot be one face".
   - **Why it is wrong:** the edge is `piston_head_lower_face_flatness`,
     214699-002's ⏥0.05 flatness of the lower head's **one** lower face.
     The node `endstop_feather_contact` is that lower face, and the two ends
     are two regions of it. Face 7 at both ends is the right binding.
   - **Why it mattered:** left in place, the finding would send a fix
     session after correct behaviour, and it puts doubt on two offers Jeff
     was told he can rubber-stamp.
   - **What I did:** added a dated correction blockquote under F2 in the
     issue and under the page's line. The original text is intact. Overlay
     entry added.

### Nits (each already has an owner, so no issue is filed)

- Three verdict rows have no shot, although the DoD asks for one per row.
  - J7 has none. Its "does not" comes from the alias table, and F5 owns
    the re-shoot.
  - J10 and J11 are numbers, not a filmstrip. CLAUDE.md asks for a
    filmstrip on a transition. F4 carries the numbers for the staged
    `the_tree_sits_beside_the_3d_canvas_and_holds_still`, whose own
    exploratory pass films it.
- The layout rows J19–J22 have 3840 shots only. 1536 appears once, as the
  whole page (`04_…`), with its labels unreadable at fit.
- `42_suggested_feature_marks.png` is committed and cited nowhere. The
  lesson says unread or uncited shots were deleted.
- The replay table chains its rows with "…then" in an order that is not
  the event order: 0116, then 0119, then 0120. Each row's claim holds on
  its own.

## Tests

The diff is docs only: `git diff --name-only integration...HEAD` touches
only `docs/issues/` and `docs/sessions/`. My inline edits add
`docs/prompts/REVIEW_AGENT.md`, which is in the claims corpus. Per the
repo's table, a docs-only diff runs the two fast tiers. The whole browser
tier and the witness gate do not apply.

- **The tactical record** has a default tier on the base tree: 1 failed
  (the documented worktree red), 2619 passed. It also has both fast tiers,
  and the viewer tier armed with `--repo`. I gave it the benefit of the doubt.
- **The merge** was a fast-forward of `f267da49` to `d8efce0f`.
- **Post-merge, in this worktree:**
  - `node apps/annotate/run_tests.cjs`: 335/335.
  - `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack/data/scratch/walk1123`:
    630/630, `[real]` armed. The projection is paired at `f267da494778`,
    whose code tree is identical to the merge.
  - **Default tier**, single process (this venv has no xdist):
    `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider -rfs`
    gave **1 failed, 2619 passed, 3 skipped, 4 deselected in 486.88 s**.
    - The failure is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`,
      the documented worktree red. Its tier ran armed above, 630/630.
    - The skips match the tactical record: `test_contact_suggestions.py:649`
      and `:668`, and `test_fit_bound_features.py:433`.
    - The time is recorded on the ledger, inside budget.
    - I kept only the output's tail, so the contention header lines were
      not captured and I cannot quote them.
    - Not exercised: the data-gated checks that need a real `data/` in the
      worktree. The `--repo` run covers the viewer's.
  - **The overlay edit's corpus subset**:
    `tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py`
    gave 222 passed.
  - **No pollution:** a manifest of the main checkout's `data/` outside
    `scratch/` (560 files, size and mtime) was identical before and after
    the suite.

## Found on arrival

Nothing. The review worktree was clean.

## For the next reviewer

The walk's scratch root `C:/workspace/tolstack/data/scratch/walk1123*` is
still on disk, along with its `_tools`, build and driver logs. The lesson
says it is safe to delete. I left it, because the next walk may want the
built projections.
