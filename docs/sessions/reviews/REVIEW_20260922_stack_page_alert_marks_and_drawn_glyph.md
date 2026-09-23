---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_stack_page_alert_marks_and_drawn_glyph.md
reviewer: agent (review/stack_page_alert_marks_and_drawn_glyph)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-22 — stack_page_alert_marks_and_drawn_glyph

Work reviewed: `handoff/stack_page_alert_marks_and_drawn_glyph` @ `1c33359`,
**one** commit, 36 files (+1321 / −173, of which 10 are PNG screenshots).
Branch cut from `integration` @ `a6a71fb`; `integration` had moved two commits
(`a183de6`, the sibling review merge of `findings_splitter_scopes_to_excluded_terms`)
by the time I merged, so my review branch was fast-forwarded to it first and
the work then merged **cleanly, no conflicts** — nothing in the merged tree is a
conflict-resolution choice of mine, despite the two files that overlap
(`apps/viewer/tests.js`, `apps/viewer/README.md`).

One run of this handoff, one lesson, arriving as `A` rather than `M`; the two
issues it closes arrive as `M` with appended dated sections, and the three it
files as `A`. `docs/sessions/active/` holds this handoff, so the DoD lines I
quote are the run's own.

## Verdict

**APPROVE, 0 blockers.** All three deliverables are met; the fourth site the
author found by the DoD's own grep (`views/banner.js`) is a correct extension of
the same defect, not scope creep. The lesson's three named decisions are all
recorded with their reasons, and — the most valuable thing in this session — the
author caught and **recorded** a wrong argument of their own rather than
shipping it as a comment nobody would re-measure.

Two things a later reader needs from this review specifically:

1. **The handoff handed back a deliberately red `tests/test_mutation_witnesses.py`
   (3 failures), and I repaired it** in the merge under this overlay's standing
   "the anchor check fires at merge time and you are the one holding it" rule.
   Details in *Findings → Should-fix*, below. Without that repair this merge
   would have put those three reds on `integration` with nobody scheduled to
   reach them.
2. **The first DoD bullet is satisfied vacuously and the author says so.** No
   live material entry has ever been in the state this fold retires. That is
   the session's real finding, it is filed as a strategy issue, and I re-derived
   it independently (below) — it is true.

## What I verified, independently of the lesson

- **Deliverable 1 — the words live in exactly one place, and the row is quiet.**
  `VA.materialRowAlerts` (`apps/viewer/viewer.js:1047`) reads
  `VA.VALUES_CHIP_TEXT` / `VA.VALUES_CHIP_FALLBACK` and restates nothing;
  `views/detail.js:138` reads the same table for the pane's chip, so the row,
  the tooltip, the alerts card and the pane cannot disagree. The chosen shape is
  the claimed fourth per-surface alert-list function, counted in the tree:
  `VA.rowAlerts` (`viewer.js:678`), `VA.studyNavAlerts` (`topology.js:749`),
  `VA.stackNavAlerts` (`topology.js:818`), `VA.materialRowAlerts`. The
  handoff's own suggestion (a `values` branch on `VA.rowAlerts`) was declined
  for a stated reason I agree with — that function's parameters are an element
  and its derived row, and a material entry is neither.
- **Deliverable 2 / 3 — the character is gone, and the mark is one definition.**
  `grep -rn '⚠' apps/` returns 20 hits, **all** of them comments, README prose
  or an escape-spelled test constant; no rendered mark. `VA.ALERT_ICON` and
  `AA.ALERT_ICON` are both deleted. `apps/viewer/warning_icon.js` is the one
  home; `apps/annotate` reaches it through `AA.warningIcon` (a delegating
  wrapper that turns a missing sibling into a sentence naming the file), and
  `AA` defines no geometry of its own — asserted, not asserted-by-eye.
- **The load order is right on every page that needs it.** `warning_icon.js` is
  added to `test.html`, `topology.html`, `apps/annotate/index.html` and
  `apps/viewer/run_tests.cjs`'s file list. `apps/viewer/index.html` needs no
  script tag — it is the retired redirect to `topology.html` (verified, not
  assumed), and the browser tier's `[index redirect]` suite still passes.
  Nothing pairs those four script lists against the directory, but each omission
  fails **closed and loudly** in the browser tier (a page that renders a badge
  without the file throws), so this is covered rather than merely lucky.
- **The four new guards were each observed failing** (planted on the merged
  tree, then reverted):
  * `views/dom.js`'s default back to `"chip chip--alert"` + the `⚠` character
    → **491/501**, ten checks red including both new table ones;
  * `VA.materialRowAlerts` made to drop `not_transcribed` → **497/501**, the
    four materials/mark checks and no others;
  * `AA.warningIcon` made to draw its own path and set `AA.WARNING_ICON_PATH`
    → annotate **153/154**, the rewritten guard alone. So the guard the source
    issue asked to have *replaced rather than dropped* really does bite on the
    thing it was re-phrased to protect;
  * the browser tier's centring sub-check, with `align-self: center` commented
    out of `.rowalert` → `FAIL sub-check: the mark is centred against the chips
    beside it, not hung at the top of the line (602 vs 604)`, **and it is the
    only sub-check that moves**. The lesson's non-vacuity measurement reproduces
    to the pixel.
- **The lesson's arithmetic and its causal claims.** Re-derived, not read:
  * *"all six live material entries carry `values_status: "inline"`"* — true.
    `data/projections/viewer/results.json` has exactly two stacks with
    materials, three entries each, every one `inline` with `library_ref: null`.
    So `VA.materialRowAlerts` returns `[]` for all six and the folded chip
    never rendered on a live page. The strategy issue built on this is
    correctly premised.
  * *"500/500 (was 496, +4)"* — consistent with the sibling review's measured
    `497/497` on `integration` (496 + that handoff's 1). The merged tree here
    measures **501/501**, i.e. 497 + 4, and the four new `await test(` blocks
    are the four the lesson names.
  * *"a `.chip` is 21px and the mark is 16"* — corroborated independently by
    the centring numbers: a 2.5px centre offset (602 vs 604 rounded) is exactly
    (21 − 16)/2, which is the arithmetic that makes the retracted argument
    wrong. The retraction is correct and is recorded in all four places the
    wrong version had been written.
  * the *"pixel-identical"* claim for screenshot pair 2 is literally true —
    both files hash to `9338f350f687b3ef…`. Claimed identical **and** identical,
    with the reason stated, which is the right way to ship a null before/after.
  * the visual claim in pair 3 is visible in the image: the `before` shot shows
    the `⚠` rendering as a **colour emoji** inside the amber chip, which is the
    U+26A0 argument the code comments make, photographed rather than asserted.
- **Every fence in the handoff was respected.** `apps/viewer/topology.js`,
  `apps/viewer/views/topology.js` and `scripts/mutation_witnesses.json` are
  untouched by `1c33359`; `views/stack.js`'s diff is four hunks, none within
  200 lines of `checkCard` (line 735).
- **No production data was written.** `C:\workspace\tolstack` is clean after
  every run; the mutation runner's shadow tree lands in the worktree's
  gitignored `tmp/` and was removed.
- **Doc facts hold.** `apps/viewer/README.md`'s colour table, "Selecting an
  element" and "What a nav row wears" all describe the shipped surface;
  `docs/DESIGN_TYPE_AND_COLOUR.md` names the five surfaces the mark now
  appears on and they are the five in the code. `test_viewer_readme_doc_facts`,
  `test_js_python_vocabulary` and `test_app_type_scale` are green.
- **The 2026-09-16 "loud" thread really is empty.** Diffed the closing note
  against that issue's own *"Where the pieces are"* inventory, name by name
  (`views/nav.js`'s `studyBadges` **and** `stackItem`, `topology.js`'s
  `VA.ATTENTION`/`studyVerdict`/`edgeAttention`, `viewer.js`'s
  `summaryChips`/`ALERT_ICON`/`rowAlerts`/`alertsCard`,
  `style.css`'s `.chip--alert`/`.hovercard__alert*`): every one is accounted
  for by a shipped half. The remainder it names is a *new* question (the two
  filled provenance chips), filed separately with `audience: strategy`, not an
  understated leftover.

### Checks that do not apply, and why

`The mandatory checks` in this overlay are additional **when the work under
review is a tolerance stack**. This diff contains no stack, topology, spec-parse
or `materials.json` data — nothing under `docs/tolerance_stacks/`,
`docs/topologies/`, `data/inbox/specs/` or `docs/spec_library/` is touched, and
no projection input changed, so the projections were not rebuilt and did not
need to be. So checks 1–7 (source_ref/`confidence`, signs on path terms,
coherent material corners, LMC/MMC direction, RSS, nominal-inside-min/max,
quantised cotter constraints, and the traced/inferred/untraced ratio) have no
subject here and are not restated. `data/inbox/specs/` and `docs/reference/`
are untouched; nothing was written into drawing-checker (no path under it
appears in the diff, and no run was invoked).

## Tests

**Benefit of the doubt: partly void, and I say which.** The handoff's DoD asks
for "the `venv-win` pytest run all green", and the lesson records the three JS
tiers with counts (`500/500`, `154/154`, `25/25`) plus an honest account of the
three `test_mutation_witnesses.py` reds — but it records **no pytest total for
the full suite**. Under the canonical cadence that is the second bullet of "when
the benefit of the doubt is void" (a record inconsistent with the diff — here,
absent for the tier the DoD names), so I ran the **full suite pre-merge** rather
than only a risky subset, and the subset rows below were exercised by that run.

Pre-merge, merged tree in this review worktree
(`C:\workspace\tolstack-worktrees\stack_page_alert_marks_and_drawn_glyph-review`,
`node_modules` armed by a junction to the main checkout, removed afterwards):

- `venv-win/Scripts/python.exe -m pytest -q` → **1205 passed, 4 failed**
  (`tests/test_mutation_witnesses.py` ×3 — the anchor rot, since repaired; and
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the
  documented worktree red: `data/projections/viewer/` is gitignored, so the
  node-fs tier skips and that test fails deliberately rather than passing
  vacuously). The sibling review measured `1208 passed, 1 failed` on
  `integration` for the same 1209 tests, which is how I know all three
  witness reds are this work's and not inherited.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **501/501**,
  no SKIP lines. This is the run that covers what the worktree pytest could
  not: every `[real]` check, including the new
  `[real] the live materials column carries at most ONE quiet mark per row`.
- `node apps/annotate/run_tests.cjs` → **154/154**, `0` SKIP lines (that runner
  takes no `--repo`; its `[real]` checks resolved through the hardcoded
  main-checkout fallback and really ran).
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
  **25/25 browser checks**, `[app] 41/41` and `[annotate rail filter + face
  deselect] 32/32` (the suites the two new/rewritten sub-check sets live in).
- `pytest -q tests/test_app_type_scale.py tests/test_viewer_readme_doc_facts.py
  tests/test_js_python_vocabulary.py` → **34 passed**, re-run after my own doc
  edits.
- `pytest -q tests/test_tolerance_stack.py tests/test_provenance.py
  tests/test_thermal_exception_list.py` → **185 passed**, re-run after my
  overlay edit (this overlay is inside `claim_scanned_documents()`'s corpus;
  `docs/issues/` and `docs/sessions/` are not).

The risky-subset rows this diff matches, all covered above: `apps/viewer/`,
`apps/annotate/`, "a CSS rule in either app" (so the browser tier was
mandatory, not optional — the fast tier's DOM shim cannot see `align-self`),
"a guard, a witness, or `scripts/mutation_witnesses.json`", and "prose in a
tracked document".

**Post-merge / witness tier and the repair:**

- `pytest -q tests/test_mutation_witnesses.py` → **14 passed** after the
  re-point (was 3 failed, 11 passed).
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack
  --only alert-badge-is-not-filled` → **WITNESSED**, `1/1`. Clean run green,
  mutated run red on the declared sub-check and no earlier one — which is the
  specific thing the filed repair predicted and had not measured.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
  (whole tier) → see *Full witness tier*, below.

**What the worktree run left unexercised, named rather than folded into a
total:** `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green` is the
only data-gated pytest test, and it is the one red; the `[real]` tier it stands
for was run directly through `--repo` and is green. I did **not** re-run the
suite in the main checkout: it sits on trunk (`a6a71fb`) and a `pytest` typed
there measures trunk, not this merge, and this diff touches no path resolution
and reads no `data/` — the one shape that overlay row exists for. Said plainly:
merged code and real data met here only through the `--repo` seam, which this
repo documents as working for exactly these tiers.

### Full witness tier

**This session is a resumption: the machine running the review crashed after
the inline fixes were committed (`d93da14`, 2026-09-22 23:52) and before any of
the finishing work; everything below this heading was run 2026-09-23.** What the crash interrupted is exactly this section — the sentence above
forward-references it and there was nothing here — plus the `integration`
merge-in, the post-merge suite and the merge out. All of it is below, run fresh
rather than reconstructed, and nothing above this line was re-measured: it was
recorded by the run that did the measuring.

`integration` had moved four commits past this branch's base by the time I
picked it up (`a183de6` → `42a38c0`: the sibling handoff's board move, its issue
disposition and two `master` syncs). Merged in — `b85c03e`, **by the 'ort'
strategy, no conflicts**, and the incoming diff is two doc files and one rename
(`docs/sessions/{active => completed}/HANDOFF_20260922_findings_splitter_...`).
No app code, no test, no registry entry arrived with it, which is the fact the
tier count below has to be read against.

All four tiers re-run **after** that merge, in this worktree, `node_modules`
junctioned in from the main checkout:

- `venv-win/Scripts/python.exe -m pytest -q` → **1208 passed, 1 failed in
  42.5 s**. The one red is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented
  worktree-only red (gitignored `data/`, so the node-fs tier has no projection
  and the test refuses to count a skip as a pass). Its tier is green through
  `--repo`, below. **The three `test_mutation_witnesses.py` reds the handoff
  handed back are gone** — 1208/1209 here against the 1205/1209 measured
  pre-repair, and the same 1208 passed the sibling review measured on
  `integration`.
- `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **501/501**,
  no SKIP lines.
- `node apps/annotate/run_tests.cjs` → **154/154**, no SKIP lines.
- `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` →
  **25/25 browser checks**.
- `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`
  (the whole tier, the overlay's standing instruction) → **93/96 witnessed**.

**The merge cost no coverage, and that is the claim this tier exists to
support.** The three `NOT WITNESSED` are
`leader-style-survives-a-topology-switch` ("another check reddened, but not the
declared one"), `worst-verdict-ranks-worst-last` ("the tier never reached the
witness") and `arriving-at-an-element-shows-its-part-in-3d` ("the witness cannot
see the difference") — name for name and reason for reason the three the
sibling review measured on `integration` at the same 93/96, and the three Part 1
of `HANDOFF_20260922_mutation_witness_repair_and_enrollment` already owns. The
count did not move in either direction: **93 before the merge, 93 after it**, so
there is no merge-only regression here of the `card-layout-out-of-flow` kind the
overlay row was written for.

`alert-badge-is-not-filled` — the entry I re-pointed — is **not** in that miss
list, which is the whole-tier confirmation of the `--only` run recorded above:
the narrowed colour-only mutation reddens its declared sub-check and no earlier
one, in a run that also drives every other browser entry.

## Findings

### Should-fix — fixed inline, and not silently

1. **`scripts/mutation_witnesses.json`: `alert-badge-is-not-filled` re-pointed
   (blocker-shaped if left).** Three `tests/test_mutation_witnesses.py` guards
   were red on the handoff branch because the entry anchors at the `.chip--alert`
   declaration this pass deletes and at the browser sub-check name it reworded.
   The author filed it rather than fixing it, correctly: the handoff's scope says
   *"Do NOT touch `scripts/mutation_witnesses.json`"*.
   **I fixed it** under this overlay's *"The anchor check fires at MERGE time,
   and you are the one holding it"* rule, applying the issue's own verified
   paste plus the `note` that rule requires (the re-point, the old anchor text
   and `1c33359`, the commit that moved the code). I checked the
   "someone else will" story first rather than assuming it:
   `handoff/mutation_witness_repair_and_enrollment` is active, but it is cut
   from an older `integration`, does **not** contain this work
   (`git merge-base --is-ancestor` → false), and its own diff of that file does
   not mention this entry — so nobody would have reached it before the work
   landed, and the alternative was three reds on `integration`. Verified both
   halves (pytest **14 passed**; `--only` → **WITNESSED**).
   `ISSUE_20260922_the_alert_badge_mutation_witness_anchors_at_the_retired_chip_rule.md`
   is set `status: resolved` with that record appended.
2. **`apps/viewer/README.md`'s `## Layout` tree had no row for the new
   top-level file.** `warning_icon.js` is documented in three prose sections of
   that README and in `apps/annotate/README.md`'s own tree, and missing from the
   one list that claims to enumerate `apps/viewer/`. Added (4 lines). The
   *guard* is the durable half and is filed, not fixed:
   `ISSUE_20260922_the_viewer_readmes_layout_tree_is_a_hand_list_nothing_pairs_against_the_directory.md`
   — `reader_facing_bans.js` has been missing from that same tree since it was
   created, which is how you can tell nothing enforces it. I left that second
   row for the issue rather than fixing it here: it predates this handoff.

### Nits — fixed inline

3. Two paragraphs the edits left mid-wrapped: `apps/viewer/README.md`'s
   "The icon is drawn, not typed" bullet (one 110-char line in a 78-col file)
   and `docs/DESIGN_TYPE_AND_COLOUR.md`'s "An icon is a picture" paragraph (a
   three-word orphan line). Re-wrapped, no wording changed. Doc-fact and
   claim-shape guards re-run green after.

### Filed, not fixed

4. `ISSUE_20260922_the_truncated_check_name_guard_crashes_instead_of_reporting_when_the_name_is_absent.md`
   — carried out of the anchor-rot issue's second finding so it keeps an owner
   now that that issue is `resolved`. `test_no_expect_red_is_a_truncated_check_name`
   `.index()`es a name the test above it has already reported as absent, so a
   rotted `expect_red` produces two useful failures and one bare
   `ValueError: substring not found` with no entry id in it. Reproduced on this
   branch before the repair. Low.
5. The two issues the author filed are both correct as filed and I did not
   duplicate them: `…no_browser_surface_can_render_a_materials_table_at_all`
   (chore — the fold's only visual witness had to be hand-rendered from
   `VA.generatedFixture()`, because `?mock=1`'s two stacks have no materials)
   and `…the_loud_chips_in_the_live_materials_source_column_are_the_two_provenance_chips`
   (feature, `audience: strategy` — the right routing: whether a *second*
   confidence axis belongs on an always-visible row is a design call).

### Noted, deliberately not filed

6. **The row's alert words now live only in `title` / `aria-label` on a
   role-less `<span>`.** For the materials table this fold moved
   `CTE NOT TRANSCRIBED` from *visible text* into attributes on a generic
   element, and `aria-label` on a `generic` role is not reliably exposed. This
   is not new and not this handoff's to answer: it is the same treatment the
   elements table shipped on 2026-09-16, the badge is one builder
   (`VA.alertBadge`), and the app's accessibility convention is already an open
   strategy thread —
   `ISSUE_20260914_absorbing_the_native_title_leaves_a_focusable_mark_with_no_accessible_name.md`
   (`status: triaged`, `audience: strategy`,
   `docs/strategy/BRIEF_20260914_hover_card_occlusion_and_a11y.md`), whose own
   "cheap interim option" is precisely the `aria-label` this badge already
   carries. Filing again would be the duplicate-filing shape this prompt names;
   the right move is that the brief's owner knows the pattern now covers four
   surfaces and the annotator, which this sentence records.
7. **`eq(stacks, 2)` in the new `[real]` block is a live-data count pinned as a
   literal.** It matches the existing convention in the same file
   (`[real] both thermal stacks resolve the one worksheet that covers them`
   loops `i < 2`), and its sibling `eq(marked, 0)` carries an explicit note
   telling the next reader what to do when it changes. Acceptable as written.

## Notes for the next reviewer

- **This is the second face of the anchor-rot entry**, and I appended it to the
  overlay: rot caused by `integration` moving under the handoff (2026-09-15)
  versus rot caused by the handoff's own diff while its scope fences the
  registry file (here). Both land on you at merge time; the second one arrives
  looking like a red handoff, and it is not one.
- **A new top-level `apps/viewer/*.js` file is now a checklist item** — the
  `views/` and `storage/` rows in that README's tree are directory-level, so
  only a top-level file trips it.
- The mark now has five rendering sites (elements table, materials table, nav
  rail, stale-data banner, annotator's element rail) and one definition. Any
  future change to `VA.WARNING_ICON_PATH` / `_PX` touches all five; the pinning
  is `apps/viewer/tests.js` (attributes), `apps/annotate/run_tests.cjs`
  (delegation + path-data shape) and the browser tier (the rendered box).
- `.rowalert__mark`, `.navstatus__mark` and `.alertbadge__mark` are class names
  with no CSS rule behind them in either app. That predates this handoff
  (`navstatus__mark`, 2026-09-22 morning) and is harmless, but it means the
  *inner* `<svg>`'s class is a hook nothing uses — do not read one of them as
  evidence that a stylesheet is styling the mark.
