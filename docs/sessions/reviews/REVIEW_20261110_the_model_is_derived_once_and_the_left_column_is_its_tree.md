---
type: review
handoff: docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md
reviewer: agent
date: 2026-11-10
verdict: APPROVE
blockers: 0
---

# Review — the_model_is_derived_once_and_the_left_column_is_its_tree

Branch under review: `handoff/the_model_is_derived_once_and_the_left_column_is_its_tree`
at `11ba4bd3` (15 commits over `integration` `8b036264`, which is also the
merge base, so the review merge is a fast-forward and the merged tree IS the
branch tip). Review branch `review/…` was cut from that same `integration`;
no prior attempt on it (`git log integration..HEAD` empty on arrival; no
report, no issues). `docs/sessions/active/` holds this handoff alone. Main
checkout clean on `master` on arrival (`git status --porcelain` empty). The
shared projections in `C:\workspace\tolstack\data\projections\` are all
stamped from this branch at `670aba5d`, `dirty: false` (topologies, results,
crops, feature-identity); no kinematic projection exists (the ordinary state).

## What this handoff is

Not a stack: a model view (`tolerance_stack/model_view.py`) derived once from
`Topology`'s membership methods and carried by the topology projection; one
browser model object (`apps/viewer/model.js`); the left column rebuilt as that
model's tree under a model picker; the pane's bind-mode bar keeps its play
control and gains a binding strip with an exit; v2's names re-cut under one
rule; the grid brackets a part once per run. The seven mandatory stack checks
(provenance, signs, LMC/MMC, RSS, nominal bounds, cotter quantisation, traced
ratio) **do not apply** — no element, band, `source_ref` or check changed;
`docs/topologies/topology_vpa_end_stop_v2.json`'s diff is names, notes and
the title only (verified line by line: no `nominal`, `plus_minus`, `kind`,
`parts`, `from`/`to` or id moved), and v1's diff is its title alone. Stated so
a reader can tell "not applicable" from "not done".

## What I verified

**The model view, value by value.** Re-derived every count in the lesson from
the two topologies with the merged module:

| model | bodies | parts | features (nodes / shared) | dims | interfaces (contacts + gaps) | between / within | joints (compound) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v2 | 5 | 15 | 34 (25 / 9) | 22 | 17 (9 + 8) | 8 / 9 (ground 5, plate 3, blade 1) | 15 (1) |
| v1 | 13 | 35 | 113 (79 / 34) | 82 | 51 (34 + 17) | 29 / 22 | 47 (4) |

Every number the handoff, the lesson and `tests/test_model_view.py` state
agrees with this. The test also re-derives every `body` / `bodies` / `within`
the view emits from `Topology.body_of` / `node_bodies` / `edge_body` on both
models, so there is no second membership rule to review by eye. The module
docstring's "neither committed model has a gap edge ending on a node two parts
share" re-derives true (0 of 8 on v2, 0 of 17 on v1) — but see finding 2.

**The naming rule on v2.** All 22 structural edges are named exactly
`<from node name> to <to node name>`; no v2 node or edge name contains "axis",
"tan-link", "locating-boss" or "end-stop"; no part carries two features with
one name. Ids: none moved (the diff touches `name`, `note`, `title`,
`description`, `display_name` only). v1's 82 dimension names do not follow the
rule — out of scope, as the handoff and `docs/DAG_TOPOLOGY.md` both say.

**One path for both models.** `grep -n "ids_from\|walk_order\|studies.length\|occurrence\|vpa_end_stop\|vpa_pitch_linkage\|legacy"` over `model.js`, `views/nav.js`, `model_view.py` and the new lines of `topology_app.js`: only `identity_ids` built from `ids_from` in Python (a list a reader iterates) and `occurrence` copied as a fact. No branch on a model's id or shape.

**The one-fold rule.** `model_view.py` sums counts only; combines no element
values; `fold()` untouched. `model.js` folds a status word, no arithmetic on a
projection number. `topology.js`'s change to `VA.gridPlan` removes a break
condition (a boolean), `VA.partContainerLabel` / `VA.componentLabel` /
`VA.partColumns` are label strings.

**Guards and enrolment.** `DECLARED_GUARDS` fast 674 → 676, browser 866 → 865;
`tests/test_mutation_witnesses.py` green in the subset and the full run;
`node scripts/run_mutation_witness_tests.mjs --unenrolled` names three
browser guards, all pre-existing on `integration` (`an anchor the page's
topology does not carry…` is at `integration:scripts/run_viewer_browser_tests.mjs:14544`;
the other two are the skip-text variants of `[real]` suites a worktree cannot
run). Every retired spec is deleted (11 browser files), every renamed guard
carries its spec (6), every new guard has one (8 browser, 9 fast files).

**The lesson's arithmetic.** Witness table: one cell wrong (browser "renamed
with their guard" 5 → 6, the enumeration comment's own number); corrected by
blockquote inline. Model counts, the 57/74 grid groups (pinned in
`tests.js`'s `[real]` block and green through `--repo`), the 15/47 joints, the
1/4 compound joints all re-derive. The shots: read all six I opened
(`t2`, `t4`, `s3`, `m1`, `g1`, plus the re-shoot below) — the tree, the
compound joint open to seat / pilot / clocking, the faces layer under a
selected feature, the binding strip with its ✕, v1 through the same tree, the
12 part brackets in 5 body brackets. One disagreement between a shot and the
lesson, finding 4.

**Docs.** `ARCHITECTURE.md` has the `model_view.py` row (inventory test
green). `docs/DAG_TOPOLOGY.md` gained "The model view" and "Naming a feature"
and corrected the plate's datum name in the v2 section; it carries no new
claim fence (the counts are pinned in the test, not declared in prose — the
right choice for numbers a test already owns). `apps/viewer/README.md`: the
`## Layout` tree lacked `model.js` (added inline, one row) and four prose
sections still describe the retired nav (finding 3).

**Found on arrival.** Nothing: the main checkout's status was empty.

## Test record

Tactical report records a full-suite run (default 1 failed / 1925 passed /
1 skipped in 431 s, the one red the deliberate worktree `[real]` skip; viewer
676/676 through `--repo`; annotate 307/307; browser 42/44 with the two reds
timing checks that passed alone, under a slot overlap the author owns up to;
witnesses 42/42 witnessed of 42/94 reached in 28 m). Consistent with the diff
(the counts include `tests/test_model_view.py`'s 12 tests and the fixture
tier ran against a projection built from this tree), so the benefit of the
doubt holds and no pre-merge full suite was owed.

**Pre-merge risky subset** (rows: Python under `tolerance_stack/`, topology
data, `apps/viewer/`, `apps/annotate/`, a CSS rule, a guard/witness, prose in
tracked docs, `ARCHITECTURE.md`, a projection builder — their union):

| what | command (review worktree, merged tree) | result |
| --- | --- | --- |
| pytest subset (23 files) | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider tests/test_model_view.py tests/test_architecture_inventory.py tests/test_tolerance_stack.py tests/test_topology.py tests/test_topology_projection.py tests/test_viewer_projection.py tests/test_viewer_js_suite.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_mutation_witnesses.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_ops_toml_serve_verb.py tests/test_projection_provenance.py tests/test_rebuild_projections_script.py tests/test_rebuild_terminal_state_pairing.py tests/test_app_type_scale.py tests/test_contact_suggestions.py` | **784 passed, 1 failed** in 163 s — the one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red (no projection under the worktree's `data/`) |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **676/676**, `[real]` lines present, no `TIER SKIPPED` |
| annotate fast | `node apps/annotate/run_tests.cjs` | **307/307**, no SKIP line |

**Post-merge** (integration had not moved — `8b036264` on arrival and at
merge time — so "post-merge" and "pre-merge" are the same tree; run once,
after the subset, each tier alone on the slot in sequence):

| tier | command | result | wall |
| --- | --- | --- | ---: |
| default (full `pytest -q`) | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | **1 failed, 1925 passed, 1 skipped, 2 deselected** — the one red is `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the deliberate worktree red; same counts as the author's run | 418 s (inside the default budget) |
| browser TRUTH | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` (through a `node_modules` junction onto the main checkout's, removed at the end) | **44/44**, exit 0, no `SKIPPED` block; alone on the slot, so the author's two slot-overlap reds did not recur | 1873 s (31m13s), **over the 30-minute merge budget by 1m13s**; appended to `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md` |
| mutation witnesses | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | **47/64 witnessed, 64/94 reached**, 30 left to the sweep (budget); **exit 1** on 17 NOT WITNESSED, every one an entry of `3D pane follows the selection (sweep, bind, reload, hover)`, whose clean baseline was red 31/32 on "[real] resting on a body row in the nav lights that body in the scene" -- the suite the full tier had passed 32/32 thirty minutes earlier in the same chain. Two isolated re-runs afterwards, `--only browser__real-resting-on-a-body-row-in-the-nav-lights-that-body-i__94144d6f` (3m40s) and `--only browser__real-with-the-pane-open-the-left-column-is-the-model-s-t__835a52f7` (6m11s), were clean green and **WITNESSED**. So the red is the flake `ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md` records (recurrence appended), not a decay; the other 15 entries of that suite are unproven on this tree and are the sweep's. The 37 fast / python / annotate entries the diff reached are all WITNESSED, the same set the author's lone run reached, so there is no drop within the selection (finding 5 on what the lesson says about its own run) | 1869 s (31m09s) end to end -- the runner's own cap landed at 30m34s; the overrun is its shadow-tree build and teardown. Recorded `merge`, over by 1m09s |

Where it ran and what that leaves out: the review worktree with the real
`data/` reached through `--repo` / the junction, so the viewer and annotate
`[real]` tiers were armed; `tests/test_viewer_js_suite.py` is red by design
here and is the only pytest the worktree cannot exercise (its subject ran
green through `--repo` above). No run in the main checkout: it sits on
`master`, whose `apps/` is not this tree, and the diff adds no new reader of
a `data/` path (the one new read, `bindings.json`, goes through the adapters
and is exercised by the `--repo` run). Projections were not rebuilt by this
review: every stamp already names this branch at `670aba5d`, no projection
input (`docs/topologies/`, `tolerance_stack/`, `scripts/build_*`) changed
after it, and the fixture tier's freshness gate passed.

## Findings

### Should-fix (filed; none blocks)

1. **Three Python vocabularies hand-copied into the new JS** —
   `apps/viewer/model.js:47` (`"topology_edge"` for `STACK_KEY_KINDS`),
   `model.js` `VA.EDGE_ENDS` (for `DIRECTIONS`, already in `vocab.gen.js`),
   `views/nav.js` `interfaceRow.source === "node"` (for the new
   `INTERFACE_SOURCES`, which has no registry row; `CONTACT_KIND` likewise).
   The repo's one-vocabulary rule, and its inline-literal scan did not fire.
   Fix: registry rows + regenerate + `VOCAB.list` reads. Beyond inline (a
   generated file and a registry row).
   `ISSUE_20261110_the_model_object_hand_copies_three_python_vocabularies_instead_of_reading_vocab_gen.md`.
2. **`_end_part` answers the open case silently with `parts[0]`** —
   `tolerance_stack/model_view.py`. The docstring says the shared-node gap
   end is "left open"; the code picks the first part with no refusal and no
   test pinning the measurement that makes it moot today. Fix: refuse, or pin
   "no committed gap edge ends on a shared node". Needs a test, so filed.
   `ISSUE_20261110_a_gap_edge_ending_on_a_shared_node_would_take_parts_0_silently_in_the_model_view.md`.
3. **`apps/viewer/README.md` describes the retired nav** in "The one nav",
   "Kinematic studies — a section of their own", "The Kinematic model row"
   and "What a nav row wears" (a loose stack has no row now). Nothing pairs
   those sentences. A rewrite, not a line.
   `ISSUE_20261110_the_viewer_readme_still_describes_the_nav_as_one_tree_with_a_kinematic_model_row.md`.
4. **The `component · propeller-system` chip is in the shot the lesson says
   it left.** `t2_v2_body_open_parts_and_interfaces_*.png` shows the chip
   strip under Studies; the one-value filter (`studiesList`, `length > 1`)
   and the shots landed in one commit (`a14bc991`), shots first. Re-shot in
   review on the merged tree (`tests/debug_model_tree_20261110.mjs --phase
   tree --widths 3840`): **the chip is gone** — Studies carries only "Play
   the newest sweep", and the probe's JSON has no `propeller-system` string
   anywhere. So the lesson's sentence is right and its shot is stale: the
   page in the lesson's folder is the page before the filter. No fast or
   browser test pins the one-value rule (the fixtures carry no tag axes) —
   folded into the overlay entry and noted here rather than filed
   separately, since the rule itself is right on HEAD. Not re-shot into the
   lesson's folder: a review does not edit the author's shots, and the
   correction stands here.
5. **The lesson's witness row says a thing its own numbers refute.** It
   reports 42/42 witnessed of 42/94 reached and adds that an earlier,
   overlapped run reported 17 browser entries "red before the mutation" --
   "the same overlap, and every one of them witnessed in the lone run". The
   lone run reached 42 entries; the diff's fast / python / annotate entries
   alone number 37 and run first, so the lone run reached at most
   5 browser entries and cannot have witnessed 17. And the cause is
   not the overlap: this review's witness run, alone on the slot, saw the
   same 17 red before the mutation on the same sub-check (table above). The
   sub-check is the handoff's own rewrite (`bodyLit`, a 20 s leave-and-
   re-enter poll) of a check the lesson's own gotcha says the pane clears
   under; it was red in the author's full run too. Red in 2 of 6 runs across
   both sessions, green alone in 4 -- the shape
   `ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md`
   already carries (status deferred), so a dated recurrence is appended
   there, with the one new fact: the window is not always inside the poll.
   Correction blockquote added under the lesson's suite table. Not a
   blocker: the tier is green in full, the two entries re-proven alone are
   the handoff's headline guard and the flaky check's own, and the
   remaining 15 are the sweep's by the capped-run rule.

### Fixed inline (all three prongs)

- `apps/viewer/README.md` `## Layout`: the `model.js` row (one entry; the
  overlay's "new top-level file under `apps/viewer/`" item).
- `docs/sessions/lessons/LESSONS_20261110_…md`: correction blockquote under
  the witness table (browser renamed 5 → 6).

### Nits (not filed)

- `model_view.py` writes `kind: ""` for a gap edge with no `interface` word
  (the demo fixture's `tip_to_strut_end`); `None` would say "none" rather
  than an empty word. The viewer renders it as an empty chip, harmlessly.
- `topology.js:4740`'s comment still cites `Pitch plate 215735-001/-002` as
  the plate's title-block name; true of v1 only now (v1's display names are
  the filed `…v1_part_display_names…` chore).
- The lesson's shot table says the tree is read "with your own eyes before
  the lesson is written"; one of the twenty-two contradicts the text (finding
  4). The DoD's spirit — look, then write — was met; the shot predates the
  last code change in the same commit.

## Checklist items that applied, and what they found

- *A new file in `tolerance_stack/` and an unchanged inventory* — row present.
- *A new top-level file under `apps/viewer/` and an unchanged `## Layout`* —
  missing; fixed inline.
- *A STACK-DATA change is a viewer-test change* — names only; greps of
  `tests.js` for the old names find synthetic inputs to the label rule
  (`"Pitch anti-rotation link 212956-005"` etc.), not pins on live data. The
  `[real]` tier ran green through `--repo` against a projection from this
  tree.
- *A contact face's part taken from `parts[0]`* — finding 2.
- *A message between the viewer and the embedded annotator whose verb set is
  exercised only in part* — the handoff's new outbound verbs (`hover part`,
  `hover body`, `hide`/`show <part>`, `filter-element [node]`) each have a
  browser check (body hover + leave, body checkbox hide/show, bind-mode
  nest), and `filter-element` with no argument lifts the filter
  (`app.js:905`). `hover part` is not reached by a real-iframe check (a part
  row hover) — minor, and the issue the author filed on hover-in-sweep-only
  covers the surface.
- *A second state fact beside an old one* — `state.hiddenParts` is the page's
  copy of what it posted; re-posted from nothing on scene reload
  (`sceneVisibilityPosted = null`). The pane's own `userData.shown` is still
  the truth the scene reads; the tree's box reads the page's copy. Acceptable
  for a surface that only ever writes through `show`/`hide`.
- *A diff that MERGES or DROPS scene elements re-maps some channels, not
  all* — a joint-end row now resolves to its node (`VA.sceneRowElement`);
  the follow (`followFeatureOfNode`) and the bind-mode `filter-element` both
  read the same selection. Checked the fall-back: a `feature=` the topology
  lacks still returns the edge (pinned in `tests.js`).
- *Retiring a page / filter: an old capability unreachable* — the loose
  stacks' status marks (filed by the author), a contributor's Pick (filed by
  the author). Both correctly routed to strategy.
- *The handoff's own lesson audited* — above.
- *Design* — the tree reads as designed against the hierarchy rules: one
  weighted row (the body), muted micro group labels, one mark per feature,
  counts muted right. No new always-visible prose over a line. The faces
  layer's repeated legend is the author's own filed design issue.

## For the next reviewer

The witness run's selection and left-to-sweep count are in the table above;
the browser tier's wall time is appended to the open over-budget issue
(`ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`)
rather than filed twice, and the witness baseline's red to the 2026-11-05
flake issue. If you run the witness gate on this tree and the
`3D pane follows the selection` suite blinds its entries again, re-run one
`--only` and read the sub-check; do not charge it to the diff until the same
sub-check is red twice alone (it was 0 of 2 here). The `node_modules`
junction in the review worktree was removed before this report was committed
-- from PowerShell: under Git Bash `cmd /c rmdir` opens an interactive `cmd`
and hangs, which cost this review one stuck command.

Suite times recorded with `dispatch suite-time record`: default 418 s (inside
budget); merge 1873 s (browser) and 1869 s (witnesses), each over the 30-minute
merge budget by about a minute.
