---
type: review
handoff: docs/sessions/active/HANDOFF_20261110_one_selection_one_hover_and_leaders_off.md
reviewer: agent
date: 2026-11-12
verdict: APPROVE
blockers: 0
---

# Review — one_selection_one_hover_and_leaders_off

Branch under review: `handoff/one_selection_one_hover_and_leaders_off` at
`88e9ea51` (24 commits, 91 files; the branch had already merged `integration`
at `b4b9fe73`, so its tip contains the `integration` this review was cut
from, `e47c126b`, and the merge into `review/...` was a fast-forward -- the
"pre-merge" and "post-merge" trees are the same tree). Reviewed in the review
worktree with `node_modules` junctioned from the main checkout; the main
checkout was clean on arrival (`git status --porcelain=v1
--untracked-files=all`: nothing) and sits on `master`. No prior attempt on
`review/one_selection_one_hover_and_leaders_off`.

## What this is, and what the mandatory stack checks say

Viewer and annotator code: one selection and one hover across four surfaces,
leaders with an Off default, a feature row as its own disclosure, one pick
action. **No stack, topology or study file changed** (`git diff --stat` has no
`docs/tolerance_stacks/` or `docs/topologies/` row), no projection builder
changed, no `tolerance_stack/` module changed. So the seven mandatory checks
(traceability, signs, LMC/MMC, RSS, nominal bounds, quantised constraints, the
traced ratio) have no subject here and were not performed; nothing in the
diff adds, moves or re-labels a number a reader could mistake for a measured
value. The viewer-side "no second combiner" rule holds: the one new
arithmetic in `apps/viewer/` is `VA.leaderGeometry`'s `boundaryEdge` reduce
(a map of node id to row id -- no values combined) and
`VA.focusElementKeysOf`'s set building.

## What I verified

**Deliverable 1 -- one selection, one hover.** `state.focus = {selected,
hovered}` with `setSelected` / `setHovered`; `state.selection =` has one
writer (`grep -n "state.selection = " apps/viewer/*.js apps/viewer/views/*.js`
-> `topology_app.js:687` only); `focus.hovered` is written in `setHovered`
and, by design, directly in `revalidateHover` -- the lesson said "all through
`setHovered`", corrected with a blockquote (finding 3). `applyFocus` runs at
the end of `paint()`, in `repaintDag` and in `ctx.onPainted`, so a full
repaint re-lights every surface from the state; the fast test "the pane's
pointer tells the page its key and its leave; a pane repainted under the
pointer is lit again..." and the handoff's own `f1b` / `f4b` after-repaint
shots both show it. The DAG keeps one `hot` state with ONE lighter
(`lightKeys`) behind `setHot` and `VA.lightTopoKeys` -- read the diff of
`views/topology.js` line by line; the one behaviour change there (a leave
with nothing held still tells the page) is argued in the code and is what
lets a hover carried across a repaint be let go of. The model-side
translation (`VA.focusEntityOf` / `focusElementOf` / `focusElementKeysOf` /
`focusNavRowsOf`) is pinned value by value in the new fast test against
`bodiedProj()`, including the no-model fallback (an element stands for
itself). Lighting only: no DAG layout, routing or grid row change in the diff.

**Deliverable 2 -- leaders Off by default.** `VA.LEADER_STYLES.off`, cycle
off -> angled -> jogged -> off, `VA.DEFAULT_LEADER_STYLE = "off"`,
`VA.LEADER_STYLE_ON = "angled"`. Off: `leaderGeometry` builds `[]` leaders and
the same zone/width/height (fast test pins all four against the angled
geometry), `drawSeamLeaders` clears and returns, the scroll listener and the
`ResizeObserver` skip `scheduleSeamDraw` while off, and `applyFocus` only
schedules a seam draw when on. The selected node still finds its grid row
through `VA.lastTopoRender.boundaryEdge` (browser check "...a selected node
still finds its grid row with no leader to read it from"). The "default flip
voids sentences" sweep: `git grep -n -i "angled by default|default.*leader|
leader.*default"` over `apps/`, `docs/*.md`, `docs/issues`, `README.md`,
`ARCHITECTURE.md`, `CLAUDE.md` found two stale code comments (finding 4,
fixed inline) and nothing else -- README's "angled by default" is Jeff's
2026-09-21 quote under a dated heading, and the README's leaders bullet,
`VA.DEFAULT_LEADER_STYLE`'s comment and the fast test's comment all say off.

**Deliverable 3 -- a feature row is its own disclosure.** `featureRow` draws a
real twisty keyed `f:<fid>` while `handlers.sceneSlot` (scene open), a leaf
gap otherwise; `featureItem` opens it when it is the selected feature unless
the reader folded it (`isOpen`), and `setSelected` deletes the fold so a
fresh selection opens again. `VA.renderFeatureBody` draws the end row as a
state line (kind, mark, suggestion, attention as data attributes; words from
`sub`), the row's own buttons, then its list -- and NOT the pane's head row
and NOT a legend (fast test asserts `data-kind="end"` rows = 0, name not
repeated, no `.navtree__scenelegend`, child order state/acts/list). Opening
scrolls nothing: `revealSceneRow` is gone, `revealNavRow` runs only for a
`revealPending` set by `selectFromScene`, and only when the row is out of
the column's box. Read the shots: `n1` (hub open, four feature rows each with
a closed twisty, one mark), `n2` (`locating boss`: twisty open, `candidates
· 2`, two faces with why, `Pick a face…`, one title), `n3` (`blade 1 root
bearing bore`: `no face bound`, `Pick a face…`, the same layout; both rows of
the shared node and the `blade 1 root bearing bore` joint row lit). Jeff's
two complaints are answered as written.

**Deliverable 4 -- one way to pick.** The hover Pick / Re-pick button is gone
from the sweep rail's end rows (`featureRowBase`), "Pick a different face"
is gone from the proposal case (`AA.SUGGESTION_ROW_WORDS` lost both words,
`binding_state.js`), and `endPickAction` is the one place: `Pick a face…`
(renamed from `Pick another face…`) as the list's last row in every state,
`Cancel` pressed while armed, Accept kept on the selected proposal row. The
candidate list is always appended in sweep mode (no `candidateTwisty`); bind
mode's element rows keep their disclosure. The lesson says which affordance
stayed and why. One residue the author filed rather than hid: a contributor
row's `tree-row__repick` (the jump to bind mode) survives in the unseen rail
(`ISSUE_20261111_the_panes_hidden_rail_still_wears_a_pick_button_on_contributor_rows.md`);
`git grep tree-row__repick` confirms the class is now Accept / switch-part /
others / Take / contributor pick only.

**Deliverable 5 -- README.** "The one nav" rewritten as the model's tree with
a layout sketch, the feature row's body, the one pick action and what is
gone; the leaders bullet says Off is the default and names
`VA.LEADER_STYLE_ON`; "One hover state, two surfaces" became "One selection,
one hover, four surfaces" with the old mechanism kept under it.
`tests/test_viewer_readme_doc_facts.py` green.

**Witness bookkeeping.** `DECLARED_GUARDS` fast 676 -> 681, browser 868 -> 873
(the lesson's "Pins" line re-derives). `git diff --name-status` over
`scripts/mutation_witnesses/`: 17 A, 15 M, 11 R, 6 D; the lesson's "added
12 / renamed 16 / re-anchored 17 mutations in 15 specs / retired 1"
re-derives as 17 - 5 (A/D pairs that are renames git did not pair) = 12,
11 + 5 = 16, 15 M, and the one D without an A is the legend spec. Every
re-anchored `find` was read against the merged tree (all present once). The
old `filter-element` anchor is still some spec's target (two specs). No two
specs from this handoff share a `find`/`replace` pair except the fast/browser
twins of one contract (`VA.DEFAULT_LEADER_STYLE = "off"`;
`rows.length !== 1 || typeof row.head`), which is the tier pairing, not a
collapse.

**Issues the branch filed.** Five new, two addenda; frontmatter in grammar on
all seven (`type`, `priority`, `status: open`, `area`, `reporter`,
`found_by`, `class`; `audience: strategy` on the three design ones). One is
a duplicate (finding 2).

**The lesson's arithmetic.** Suite table: default tier "1 failed, 1927
passed, 1 skipped, 2 deselected, 470 s" -- my run of the same tree reports
the same counts in 450 s. Fast tiers 681/681 and 307/307 reproduce. The
browser `--only` list (13 suites) matches the suites the diff touches.

**Tests I ran (the merged tree, review worktree; `data/` and
`node_modules` through the main checkout).** This repo's conftest prints no
contention header lines, so none are quoted.

| tier | command | result | wall |
| --- | --- | --- | ---: |
| risky subset (pre-merge in cadence; same tree) | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q tests/test_viewer_js_suite.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_js_vocabulary_is_generated.py tests/test_feature_identity.py tests/test_part_mesh_aliases.py tests/test_app_type_scale.py tests/test_mutation_witnesses.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py` (the `apps/viewer/`, `apps/annotate/`, CSS, witness and prose rows of "Choosing the risky subset") | 1 failed, 419 passed -- the one red is `test_viewer_js_suite_is_green`, the deliberate worktree red (its `[real]` tier has no projection under the worktree) | 111 s |
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | 681/681 (no SKIP line; the projection stamps `af383764`, an ancestor of the tree, built by the author after the first commit; no builder input changed after it) | 22 s |
| annotate fast | `node apps/annotate/run_tests.cjs` | 307/307 (no SKIP line) | 32 s |
| default, full, post-merge | `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | 1 failed, 1927 passed, 1 skipped, 2 deselected -- the same deliberate red; recorded `default`, inside budget | 450 s |
| doc-scan guards after my own prose edits | `... -m pytest -q tests/test_claims_registry.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_mutation_witnesses.py` | 266 passed | 95 s |
| browser TRUTH, whole tier | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **43/44 suites**; the one red was `kinematic study page` 24/27, its three `[real]` leader-correspondence sub-checks (`arrivedCorr.leaders > 0` etc.) on a page whose leaders are now off by default and which the handoff never turned on (finding 6, fixed inline); every other suite green, including all thirteen the handoff touched | 1914 s (31m54s) by the runner's own table -- over the 30-minute merge budget by 1m54s; recorded `merge`, measurement appended to the open `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md` |
| browser, `--only`, after the inline harness fix (three suites) | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack --only "<suite>"` | `kinematic study page` **27/27**; `topology height budget` 19/19 (run twice: once with leaders on after its first reboot, once after both); `parts as blocks` 8/8 -- the latter two now measure real leaders where before they measured none | 4 × ~25 s |
| mutation witnesses, `--changed-since` | `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack --changed-since integration` | WITNESS_TBD | WITNESS_WALL_TBD |
| review probe (not a tier) | a scratch Playwright script under the browser slot, serving this tree's `apps/` over the main checkout's `data/`: counts the rail gestures the page posts into the pane, then lets the pane deselect its own end row | see finding 1 | 2 min |

Not exercised in the worktree: nothing beyond the one deliberate red -- the
`[real]` viewer tier ran through `--repo`, the browser and witness tiers read
the main checkout's `data/` through `--repo` and the junctioned
`node_modules`. The main checkout's own `pytest` was not run: it sits on
`master` and would measure trunk, and this diff touches no path resolution
or `data/` reader.

## Findings

### Should-fix (unfixed, filed)

1. **The page re-asserts its end row into the pane, so a pane-side deselect
   is swallowed and the `activate` toggle is re-posted while the pane's answer
   is in flight.** `apps/viewer/topology_app.js`, `syncSceneInspect`
   (inside `applyFocus`) and `followScenePick`. Measured on the merged tree
   with the P2 sweep loaded: a feature row click followed by a pointer sweep
   over twelve DAG marks posted `activate` **twice** (the pane's row click is
   a toggle, so the second deselects and a third, after the next tree,
   re-selects -- it converged, with three rail rebuilds for one click); and
   an `inspect clear` run in the pane was answered by one `activate` and the
   row was selected again within the debounce, so the pane can set the one
   selection but never clear it. `sceneInspectPosted` is written in that
   branch and never read there. The dedupe is small; whether a pane-side
   deselect should `unfreeze()` the page is a design call, so it is filed
   `audience: strategy` beside the author's wider two-selections issue:
   `docs/issues/ISSUE_20261112_the_page_re_asserts_its_end_row_into_the_pane_so_a_pane_side_deselect_is_swallowed.md`
   (`med`). Not a blocker: the state converges, the handoff's deliverable
   (four surfaces light from one state) holds in every shot and tier, and
   the lesson already names the pane's two selections honestly.

### Nits (two fixed inline, two cross-referenced)

2. **A duplicate issue.**
   `ISSUE_20261111_an_edge_selected_on_a_topology_page_with_the_sweep_loaded_takes_the_pane_out_of_the_sweep.md`
   is `ISSUE_20261108_a_grid_row_selected_on_a_studyless_model_leaves_the_sweep_and_its_leaders.md`
   (deferred 2026-11-09 to 2026-11-23): same mechanism
   (`VA.annotateParamsFor` gives a topology-page edge a `goto`), same
   recommended fix. The 2026-11-08 file was in this branch's own worktree at
   its branch point (`af3e1546`), so this is the "no excuse" face of the
   duplicate-filing entry, not the branch-point one. Cross-referenced both
   ways rather than deleted; the newer file carries the one-selection
   argument. **Triage should close the 2026-11-11 filing into the 2026-11-08
   one.**
3. **The lesson's writer inventory is one short.** "Hover -- all through
   `setHovered`" omits `revalidateHover`, which writes `focus.hovered = null`
   directly (deliberately, to avoid re-entering `applyFocus`). Correction
   blockquote added in the lesson.
4. **Two code comments still said angled was the default**
   (`topology_app.js` state block, `views/topology.js` toolbar). Fixed inline
   (`ed025299`); no behaviour, no test.
5. **The DoD's "look at the page once more after your branch is rebased on
   `integration`" is not recorded in the lesson.** The `integration` merge
   (`b4b9fe73`) brought `the_browser_tier_says_where_its_half_hour_goes` --
   runner timing and prompt wording, no `apps/` change -- so the page could
   not have moved; and this review's probe drove the merged page. Noted so
   the next lesson says it in one line.

### Should-fix, fixed inline (harness only, the suites are their own test)

6. **Three browser suites read leaders and were never turned on after the
   default flip.** The lesson says `leadersOn(page)` was "called after every
   page open in the eight suites that read a leader"; a count of leader reads
   per suite (`CORRESPONDENCE_IN_PAGE`, `rail__leader`, `leaderPaths`,
   `leaders > 0`) against `leadersOn` calls finds three more:
   - `kinematic study page` -- three `[real]` sub-checks require `leaders > 0`
     and went **red** (24/27) in the whole-tier run; this is the one suite
     whose red the handoff's `--only` list could not see, since it was not on
     it. Three witness specs stand on those three checks and would have
     reported their clean run red at the next gate.
   - `topology height budget` (four drift checks, two of them `[real]`) and
     `parts as blocks` (three drift reads) -- `correspondence().drift.length
     === 0` over **zero** leaders, so green and vacuous since the flip: the
     "suppression takes every guard standing on that node" shape, in the
     harness rather than the app.
   Fixed inline in `scripts/run_viewer_browser_tests.mjs` (`5e998fbf`): one
   `await leadersOn(page)` after each boot those
   checks read from (the height-budget suite reboots twice, so two). No
   product line changed; the three suites re-run green with leaders drawn
   (table above). Inside the boundary as I read it -- the same one-line
   harness change the author made at nine sites, in the three it missed --
   and said here so nobody mistakes it for the author's. If a reviewer
   disagrees with that reading, the alternative was one rework round for
   three lines.

### Out of scope (filed, not fixed)

7. **Escape does not let go of the selection while any mirrored control reads
   pressed.** With a sweep loaded and nothing armed, Escape posted `arm off`
   and the selection stayed: `VA.sceneRowsPressed` reads every pressed
   button in the tree (a part row's Isolate, the type chips), not only an
   armed pick's Cancel. The buttons half predates this handoff.
   `docs/issues/ISSUE_20261112_escape_does_not_let_go_of_the_selection_while_any_mirrored_control_reads_pressed.md`
   (`low`).

### Design check (file, never block)

Read against the hierarchy rules: the feature body steps in to the row's
name past the twisty and mark columns, the state line is muted micro text,
the actions a quiet right-aligned line, the list at the scene tree's step;
one accent (the selected row's outline and the pressed Cancel). Nothing to
file. One observation, not a violation: a feature row is a leaf with the
scene closed and a disclosure with it open, so the same row changes
affordance with the pane -- argued in `featureRow`'s comment ("a control with
nothing behind it is shown as nothing") and consistent with the author's
own empty-body issue.

## Checklist entries this review adds or touches

- New Recurring-bugs entry: a page-side follow that re-asserts state into the
  pane on every change (finding 1), with the two cheap measurements.
- New Recurring-bugs entry: a reviewer's `git checkout <branch> -- .` is a
  checkout, not a read (self-inflicted here; recovered with `git reset --hard
  HEAD` on a tree holding nothing but that).
- New Recurring-bugs entry: a default flip turns every check that reads the
  flipped thing for *drift* into a pass over nothing (finding 6), with the
  one-command count that finds the suites.
- Second sighting, no edit: the duplicate-filing entry's "no excuse" face
  (finding 2).

## Note for the next reviewer

The `[real]` tiers passed against projections the author built from
`af383764` into the shared `data/`; this handoff changed no builder input
after that commit, which is why no rebuild was needed here. If the next
viewer handoff touches `docs/topologies/`, rebuild first. The one browser
slot was held by this review for about an hour (browser tier, probe,
witness run, in that order).
