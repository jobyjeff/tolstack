---
type: review
handoff: docs/sessions/active/HANDOFF_20261029_a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark.md
reviewer: agent
date: 2026-10-30
verdict: APPROVE
blockers: 0
---

# Review — a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark

**Verdict: APPROVE.** No blockers. Five inline fixes, all to prose or to
counts. Two new issues filed, and one measurement appended to an existing
issue.

## What was reviewed

- The branch `handoff/…` is 7 commits, `4a9e7982..fb3eace0`, touching 68 files.
- The handoff worked the `active/` copy. Every lesson and screenshot arrives as
  `A`, so no earlier record was overwritten.
- `integration` had not moved since the branch was cut, so the merge was a
  **fast-forward**. This means the merged tree is the handoff tip, and one set
  of runs covers both sides of the merge.

### Deliverables against the handoff

1. **The element record.** It lives in `apps/viewer/element_record.js`
   (`VA.elementRecords` / `VA.elementRecord`) and is keyed by the pane's own
   `node|<id>` / `edge|<id>`.
   - It is built at page time and memoised on input identity. The lesson
     argues for page time over projection time: the contribution depends on
     which study is open, and a projection-time record would carry a second
     copy of the crop index. That argument holds.
   - Nothing in it is arithmetic. Every number is a projected value, so the
     one-`fold()` rule is untouched.
   - Every lit mark has a value-level `[real]` check (`every mark of every
     live topology … resolves`).
   - "The binding state" is only half there: no viewer projection holds the
     bound face. That gap is honestly filed as
     `ISSUE_20261030_the_element_record_carries_no_bound_face.md`.
   - Memo nit: the memo key leaves out `decimals`. It is harmless today,
     because `decimals` is a function of the same `kinematicStudy`.
2. **The Preview.**
   - `topology_app.js` shows one key: `paneHot || resultsHot || sceneHot ||
     selection`. The selection is the freeze.
   - When the pointer leaves, the Preview returns to the frozen element after
     `PREVIEW_RETURN_MS`.
   - Esc unfreezes, unless a dialog is open or a scene pick is armed.
   - A click on empty canvas also unfreezes, but a drag past the slop does not,
     and neither does a click on any mark or control.
   - Keyboard parity: focus previews the way hover does, and Enter or Space
     selects.
   - The code reads correctly.
3. **The cards are gone.** The lesson names every check and witness that was
   retired or re-anchored. I recounted the specs (see Fixed inline).
4. **Browser checks.** The handoff asked for: hover A, click A, hover B, leave
   back to A, Esc. Each has a check for the DAG mark, the grid row and the 3D
   anchor. "No element in the DAG canvas larger than the label is created on
   hover" also has a check. All are green, and the key ones carry witnessed
   specs.
5. **Screenshots.** There are three, at 1600×1000 on the kinematic study. I
   read the third one (frozen + hover): the head still names the frozen bar,
   and the body shows the hovered dot's record with its drawing crop at full
   pane width.

### Tolstack mandatory checks 1–7

None apply. The diff changes no stack, topology, spec event, value, band or
`confidence`. It renders projected values as-is. `fold()` is unmodified, and
no `lmc`/`mmc` is read. There is no traced ratio to recompute, because no
element changed.

### Universal checks

- **Data pollution:** none. The main checkout's `git status` is clean, and no
  file under `data/inbox` or `data/projections` is newer than this session's
  scratch root.
- **Guards observed failing:** yes.
  - Every browser and annotate entry the witness gate reached was witnessed.
  - The fast entries cannot be proved through the runner while the tier is red
    at baseline. I proved three by hand: `02cfb6c6`, `80cf4594` and `4106788a`.
    In each case I applied the mutation, saw the named check FAIL, and
    restored the file.
- **The lesson's arithmetic:** two miscounts, corrected (see Fixed inline).
- **Retired surface, stale promises:** four README sentences, six debug probes
  and two CSS rules (see Findings).
- **CSS class collisions:** all ten new classes have zero hits on
  `integration`.
- **The new cross-frame messages:** `annotate:hover` and `annotate:pick` are
  each pinned in both tiers. A real-iframe check exists per verb:
  `[the Preview from the scene]` 8/8 and `[real] the scene's pointer on an
  anchor`. Every annotate suite stayed green, including model-in-scene 18/18.

## Tests

The tactical report records a full run: 1684 passed, 1 skipped, 1 failed, in
the worktree. Its counts are consistent with the diff, so it gets the benefit
of the doubt. Because the merge was a fast-forward, my runs below are both the
pre-merge risky subset and the post-merge gate.

**Scratch root.** `C:\workspace\tolstack\data\scratch\review_preview\`.
- `data/inbox`, `data/meshes`, `data/runs` and the non-viewer projections were
  **copied** in, along with `docs/`.
- `venv-win` and `node_modules` were junctioned.
- Every viewer projection, plus part names, contact suggestions and the
  kinematic study (1 of 1 built), was built by the merged tree's own builders
  with `--data-root`.
- The root was removed at the end.

| Tier | Command | Result |
|---|---|---|
| default (full) | `PYTHONIOENCODING=utf-8 C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q -p no:cacheprovider`, review worktree | **1 failed, 1685 passed, 1 skipped, 2 deselected, 337.9 s**. The one failure is `test_viewer_js_suite_is_green`, the worktree red `CLAUDE.md` predicts. No contention header lines are printed; this repo's conftest emits none. |
| docs subset (after my prose edits) | `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py tests/test_claims_registry.py tests/test_viewer_readme_doc_facts.py tests/test_architecture_inventory.py` | 233 passed |
| viewer fast | `node apps/viewer/run_tests.cjs --repo <scratch>` | **620/623**. All three failures are integration's `display_name` fixture drift (`ISSUE_20261029_display_name_reached_the_projections_but_not_the_viewer_fixtures_…`, open). I read each FAIL message to confirm. |
| annotate | `node apps/annotate/run_tests.cjs` | 266/266 |
| browser | `node scripts/run_viewer_browser_tests.mjs --repo <scratch>` | **38/39, 392 s**. `crop lightbox` aborted on "the launcher takes keyboard focus" while the full pytest ran beside it. Then `--only "crop lightbox"` passed 20/20 **three runs in a row**. Filed (see Findings). |
| witnesses | `node scripts/run_mutation_witness_tests.mjs --repo <scratch> --changed-since integration` | **75/83 reached, 45/75 witnessed, 8 left to the sweep (budget). Runner clock 30m55s, wall 1881 s.** All 30 NOT WITNESSED are fast entries reporting "tier red before the mutation", which is the drift above. Every reached browser and annotate entry was witnessed. Because the merge was a fast-forward, `--changed-since integration` selects exactly the diff under review, and the merge itself could reach nothing more. |

Wall times recorded with `dispatch suite-time`:
- default 338 s, inside budget;
- browser 392 s, inside budget;
- witnesses 1881 s, **over budget by 1m21s**. That measurement is appended to
  the open twin `ISSUE_20261029_a_witness_gate_recorded_over_budget_counts_its_browser_slot_queue.md`
  rather than filed again.

**Not exercised:** the three `display_name` `[real]` fast checks, which are red
at baseline. For the same reason, the runner could not prove the 30 fast
witness entries; I proved 3 of them by hand.

## Findings

### Blockers

None.

### Should-fix, filed (not blocking)

1. **The retired cards still have hand-run code driving them.**
   - `tests/debug_hover_deslop.mjs` and `tests/debug_crop_lightbox.mjs` wait
     for topology hover cards that no longer open, and four other probes read
     `.hovercard*`.
   - `style.css:912-913` sizes `.hovercard--component` and `.hovercard--node`,
     which nothing emits now.
   - No tier runs the probes, so they break without going red.
   - Filed: `ISSUE_20261030_six_debug_probes_and_two_css_rules_still_drive_the_retired_topology_hover_cards.md`.
2. **The crop-lightbox launcher-focus check still fails under load.** The
   earlier issue is marked resolved. Now the launcher sits in a Preview that
   rebuilds its body on every hover change and on every image arrival. I
   suspect that throws away the focused button, but I did not prove it.
   - Filed: `ISSUE_20261030_crop_lightbox_launcher_focus_still_fails_under_load_after_the_settled_state_fix.md`.

### Nits

- `VA.elementRecords`' memo key leaves out `decimals` (see above).
- `unmountPreview` clears `paneHotKey` but not `resultsHotKey`, `sceneHotKey`
  or the return timer. This is harmless, because `paintPreview` returns early
  with no Preview.

### Design check

I read the frozen + hover screenshot against the visual-hierarchy rules. The
Preview is one large crop under a muted small-caps head, with the pin and the
name on one line. The DAG label is one line with a background halo.

The Preview shows the node's `datum_feature` chip and the `4 edge(s)` chip in
monospace. Both pre-date this diff: the old preview pane printed them too.
Nothing new to file.

## Fixed inline

These are prose and counts only. No behavior changed, and none needs a new
test.

1. `apps/viewer/README.md`: four sentences still described the retired
   surface. They now say what replaced it, with the date.
   - "Hover, focus or click opens the **edge hover card**"
   - "both hover cards'" 3D affordances
   - "a hover card's `annotate this in 3D →` … drives the same panel"
   - "clicking a grid thumbnail already opens the edge card"
2. `apps/viewer/README.md` `## Layout`: added `element_record.js`. It is a new
   top-level file and was missing from the one hand list of the directory.
3. The lesson: a correction blockquote. "32 … plus 7 … 40 in all" is 39. The
   diff agrees: 28 added, 1 renamed and 10 modified specs survive.
4. `scripts/guard_enumeration.mjs` comment: "thirteen new names carry a spec"
   is twelve. There are 16 added or renamed browser specs, less the 4
   re-anchors in the lesson's table. The pin numbers and the digest are
   unchanged.
5. The overlay (`docs/prompts/REVIEW_AGENT.md`): the "retired guard leaves
   live documents promising it" entry now also covers a retired **surface**
   (README prose by its everyday name, debug probes, stylesheets).

## Note for the next reviewer

- While integration's `display_name` drift stays open, every fast witness
  entry reads NOT WITNESSED through the runner. Hand-proving takes about a
  minute per spec: apply the `find` → `replace`, run `node
  apps/viewer/run_tests.cjs` with no `--repo` so the `[real]` half skips, look
  for the `expect_red` FAIL, then restore the file.
- Mind CRLF when you apply a multi-line `find`. The working copy is CRLF.
