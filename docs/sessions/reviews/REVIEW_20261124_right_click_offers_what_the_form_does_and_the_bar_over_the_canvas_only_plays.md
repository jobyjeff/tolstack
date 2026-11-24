---
type: review
handoff: docs/sessions/active/HANDOFF_20261122_right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays.md
reviewer: agent
date: 2026-11-24
verdict: APPROVE (round 2)
blockers: 0
---

# Review — right_click_offers_what_the_form_does_and_the_bar_over_the_canvas_only_plays

**Verdict: REQUEST CHANGES, one blocker.** The diff deletes the bar's
owner-not-in-set form, and the whole browser tier's `annotate hosted posture`
still presses that form's button: 15/15 on integration, 14/15 merged. The rest
of the work is sound: menus, bar, docs, lesson and suite record. The fix is
narrow, but it is a choice of what the check presses, which is the author's
call. `integration` was **not** moved.

## What was reviewed

- Branch `handoff/…` (7 commits, `be6c6692`..`57fcf2bd`), cut from integration
  `48042976`, which had not moved. The merge into `review/…` was a
  fast-forward, so the merged tree is the handoff's tree, `03799c96`.
  Containment check: not already merged.
- The handoff (active/), its lesson, and the code: `apps/viewer/views/nav.js`
  (`MENU_ACTS`, `MENU_WORDS`, `sceneMenuPlan`, `rowMenuPlan`,
  `featureAcceptable`, `placeMenu`, `renderContextMenu`),
  `apps/viewer/topology_app.js` (`openMenu`, `openRowMenu`, `openSceneMenu`,
  `runMenuItem`, `formThen`, `wireMenus`), `apps/annotate/scene.js` (the still
  right-click branch), `model_layer.js` (`AA.contextMessage`), the bar
  deletions in `app.js`/`commands.js`/`suggestions.js`/`sweep.js`, the new
  browser suite `testContextMenus`, the re-pointed and retired checks, the
  witness specs, the guard pins, `docs/ANNOTATION_SURFACE.md`, `CLAUDE.md` and
  `apps/annotate/README.md`.
- Shots looked at: `after_menu_scene_form_open`, `after_menu_tree_part`. The
  menu sits inside the pane and the column, the face it was opened on stays
  lit, and the bar reads ▾ Sweep ▶ Display.

### Against the handoff

| deliverable | status |
|---|---|
| 1. Right-click a face: Add/Take out (form open), Bind to (no form, a feature selected), Isolate/Hide, Show everything; a right-drag still orbits/pans | **met**: `press.button === 2` branch before any pick; the canvas's `contextmenu` is suppressed; browser check "a right-drag … opens no menu, and a still right-click … never a pick" |
| 2. Right-click a row: Edit faces, Bind the suggested faces (one suggestion only, the same event as the tick), Unbind; part/body Isolate/Hide/Show; joint Go to | **met**: the tree's accept runs the form's own `edit take` + `formOk`, and the suite compares it event-for-event with the form's tick on a reload (identical) |
| 3. A menu is a shortcut; the form's words | **met**: every act maps to an existing handler; `MENU_WORDS.unbind` *is* `FEATURE_FORM_WORDS.unbind` |
| 4. The bar holds play controls only; the table | **met**: the lesson's table is complete. The two things with no home (owner-not-in-set, the drawing-wins note) are filed `audience: strategy` |
| 5. Esc closes a menu before a form | **met**: the menu's keydown stops Esc; checked in the browser suite |
| DoD: Jeff's log unchanged | **verified by me**: 116 files, listing sha256 `efe47ec6…`, contents sha256 `39e9abba…`, the same as the lesson's |

## Findings

### Blocker

1. **`annotate hosted posture` goes red: its check presses a control this diff
   deleted.** `scripts/run_viewer_browser_tests.mjs:11781-11802`, the check
   "[real] pressing a bind control says, in one line, that binding is not
   available here", clicks `.owner-not-in-set-form button`. Nothing builds that
   form any more: `buildOwnerNotInSetForm` went with the bar, and
   `git grep owner-not-in-set-form -- apps` hits only `style.css`. So `pressed`
   is `null` and the check can never pass on this tree.
   - **Measured:** whole browser tier on the merge **45/46**, this suite
     **14/15**; the same suite `--only` on the integration export
     (`data/scratch/rc1124_base`, same scratch data root) **15/15**.
   - The tactical ran ten suites `--only` and not this one. No line of that
     suite changed, but the DOM it reads did. This is the second sighting of the
     overlay entry "A handoff that swaps the guards pinning a surface ran only
     the suites it edited", now refined with the deletion case.
   - Its witness spec
     (`browser__real-pressing-a-bind-control-says-in-one-line-that-bindi__986db3a0.json`)
     decays with it.
   - **Fix:** re-point the check at a write control the hosted pane still has
     (for instance, the form's tick from the shell, or an `edit ok` exec in the
     embedded pane), keeping the assertion on the read-only banner's fixed words.
     Re-run `--only "annotate hosted posture"` and that spec. Choosing the
     control is a judgement about what the hosted posture still offers, so it
     goes back to the author.

### Should-fix (filed; no blocker)

2. **The row menu's Unbind fails without a word.** `runMenuItem`'s unbind sends
   a bare `postToPane`. The form's Unbind goes through `formPress` with an id,
   and its failure is shown. The pane replies with `id: null`, which nothing
   reads (confirmed at `apps/annotate/app.js:7323`). Filed:
   `docs/issues/ISSUE_20261124_unbind_from_a_rows_menu_fails_without_a_word.md`.
   New entry under the overlay's Architectural errors.
3. **The new menus suite is gated on Jeff's live log, on the very face its
   feature invites him to bind.** `testContextMenus` skips (literal-`true`
   push) once the upper piston head's step face has any raw `bound` event. That
   is one click on the tree's **Bind the suggested faces**, which this handoff
   built. It goes red if the pilot bore's binding is retracted, because it reads
   raw history and not the fold. This is the **third sighting** of the overlay's
   "A `[real]` suite gated on live log state…". Filed:
   `docs/issues/ISSUE_20261124_the_right_click_menus_browser_suite_skips_once_jeff_binds_the_step_face_the_menu_offers.md`.

### Nits

- `formThen`'s accept does nothing, silently, when the pane lists other than one
  proposal line. That can happen if two proposals name the same face set and
  the pane does not merge them, while `featureAcceptable` counts distinct sets.
  The form stays open, so the reader is not misled. Noted only.
- `apps/annotate/style.css` keeps the rules for `.owner-not-in-set-form` and
  `.bind-form`, which no code builds any more. Dead CSS. Left for the rework.
- **Fixed inline** (comment only): the three pins in
  `scripts/guard_enumeration.mjs` were changed with no dated note, unlike every
  other pin change there. I added one per pin (+1 fast, −10 annotate, +6
  browser), each marked as added by the review. The counts were re-derived
  from the diff: annotate 11 out and 1 in; browser 11 pushes in and 5 out.

## Lesson audit

The checked numbers hold: ten menu checks; 116 files and both hashes; the census
pins 618 / 329 / 773·746; pytest `1 failed, 2619 passed, 3 skipped` (mine is
identical).

One causal claim does not reproduce. The lesson and
`ISSUE_20261124_the_scene_pane_over_http_suite_is_red_on_integration.md` call
the HTTP suite red "identically on integration". In my whole tier it was
**10/10 green**. Before and after did abort at the same five sub-checks, so it
is not this diff's red, but it is not deterministic either. Addendum appended
to the issue.

## Tests run (and where)

- **Benefit of the doubt:** the tactical records default pytest (worktree, 480 s,
  `1 failed, 2619 passed` — the worktree-only viewer pairing), both fast tiers,
  ten browser suites `--only`, and 21 witnesses. That is consistent with the
  diff.
- **Fast tiers (review worktree):** `node apps/annotate/run_tests.cjs` 329/329.
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`: 517/518, with
  `[real]` refused because the main checkout's projection was built from master.
  With `--repo C:/workspace/tolstack/data/scratch/rc1124` (the tactical's
  scratch root, built from this branch): **618/618**, `[real]` armed and paired.
- **Default pytest (merged tree, review worktree, serial):**
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider`:
  `1 failed, 2619 passed, 3 skipped, 4 deselected in 496.39s`. The one red is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, which reads
  the main checkout's master-built projection; the same tier is green through
  the scratch root, above. This repo's conftest prints no contention header
  lines. Ledger: inside budget.
- **Whole browser tier (merged tree):**
  `node scripts/run_viewer_browser_tests.mjs --repo …/data/scratch/rc1124`:
  **45/46**, red on `annotate hosted posture` (blocker 1). 2206 s against the
  30-min budget, so over budget. The measurement is appended to the open
  (deferred) `ISSUE_20261106_the_viewer_browser_tier_ran_51_minutes_against_the_merge_budget.md`,
  with the top suites; the new menus suite is the second-largest at 211 s.
  The runner self-recorded the ledger row.
- **Baseline:** the integration export `data/scratch/rc1124_base`,
  `--only "annotate hosted posture"`: 15/15.
- **Witness gate:**
  `node scripts/run_mutation_witness_tests.mjs --repo …/rc1124 --changed-since integration --budget-min 10`:
  `16/16 witnessed, 16/61 reached in 9m50s`, exit 0. Two of the menus suite's
  specs were left to the sweep by the budget. The tactical's `--only` runs
  covered all 21 of its specs.
- **After my edits** (overlay, pin comments, issues):
  `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_mutation_witnesses.py`:
  271 passed.
- Not run: `node apps/annotate/run_browser_check.mjs`. It is known to throw in
  `correctionPass`
  (`ISSUE_20261115_…`), and the scene change is checked end to end by the
  menus suite's real right-drag and still right-click.

## Checklist notes

- Stack mandatory checks 1–7: **not applicable** (no stack, topology or spec
  data in the diff).
- Data pollution: Jeff's feature-identity log is unchanged (above). My runs
  wrote only to `data/scratch/`.
- No new operator-facing refusal. No page self-description added: the bar loses
  six lines of how-to, and the head loses its mode word.
- The menu's ellipsized items carry a full-text `title`.

## For the rework

Fix blocker 1. Then run `--only "annotate hosted posture"` and its witness spec,
plus `--only "the right-click menus"`, which this review's gate left partly to
the sweep. Issues 2 and 3 are filed and may ride along or wait.

## Re-run 2026-11-24 — round 2

Round 1 was REQUEST CHANGES, with one blocker. **Round 2: APPROVE.**

The rework is `9315dac4`, one commit, merged into `review/…`. That merge was a
merge commit (the branch already carried my round-1 commit), with no
conflicts. Merged tree: `0d763413`.

- **Blocker 1 (closed).** The hosted-posture check now presses the form's tick.
  It sends `arm`, `edit click 0` and `edit ok` as `annotate:exec` messages with
  ids, the way the shell does. It also asserts `ok === false` as well as the
  banner's words. Clicking face 0 toggles it in or out of the set, so the tick
  always has something to write.
- **A second regression, found by the fix.** I had not caught this one in
  round 1. Deleting the Record form also deleted the only caller of
  `setWriteFailure`. A failed write in the hosted pane therefore showed the
  storage layer's raw sentence instead of the fixed class line (c21a06bb).
  `setWriteFailure` is restored and now used for every identity write verb in
  the exec listener, through `AA.WRITE_FAILURE_VERBS`, a module-level
  constant. The existing fast check pairs its keys with
  `AA.IDENTITY_WRITE_VERBS` and pins the "Bind failed · …" line. The `writes`
  flag it branches on is the listener's own, the same test that routes writes
  through `runAfterLoad`. Non-write commands keep their message, and the reply
  to the shell is unchanged.
- **Findings 2 and 3** stay filed (the tactical agent says so in its lesson).
  So does the dead CSS: `run_browser_check.mjs` still names `.bind-form__bind`,
  and the lesson gives that reason.
- **The rework section of the lesson** matches what I measured.

### Tests (merged tree `0d763413`, review worktree)

- **Fast tiers:** `node apps/annotate/run_tests.cjs` 329/329;
  `node apps/viewer/run_tests.cjs --repo …/data/scratch/rc1124` 618/618, with
  `[real]` armed.
- **Default pytest:** `1 failed, 2619 passed, 3 skipped, 4 deselected in 496.16s`.
  The one red is the same worktree-only viewer pairing as round 1, green through
  the scratch root. Ledger: inside budget.
- **Whole browser tier:** **46/46**. 2214 s, still over the 30-minute budget;
  the measurement is appended to the open issue. The runner recorded its own
  ledger row (tree `0d763413`).
- **Witness gate** (`--changed-since integration --budget-min 10`): `16/16
  witnessed, 16/67 reached`, exit 0, a capped pass. It left the blocker's spec
  to the sweep, so I ran it `--only`:
  `browser__real-pressing-a-bind-control-says-in-one-line-that-bindi__986db3a0`
  was **WITNESSED in 28 s**.
- **Jeff's log:** still 116 files, `efe47ec6…` / `39e9abba…`.
