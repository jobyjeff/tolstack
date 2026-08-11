---
type: review
handoff: docs/sessions/active/HANDOFF_20260810_viewer_source_ref_export_label.md
reviewer: review agent (dispatch)
date: 2026-08-11
verdict: APPROVE
blockers: 0
---

# Review — `viewer_source_ref_export_label`

Branch `handoff/viewer_source_ref_export_label` (2 commits, `56e1380` + `9f8851b`),
reviewed on `review/viewer_source_ref_export_label` after merging **both** the
handoff branch and `master` (the sibling `sop_library_ref_pairing` landed
mid-review — see "Concurrency" below).

**Verdict: APPROVE.** No blockers. One cosmetic edge case fixed inline, three
stale numbers corrected inline, two overlay entries added. This is careful work:
the author re-derived the handoff's own counts and found them stale, made and
justified the two decisions the handoff left open, and — the part that matters —
pinned the fix against the **live** `crops.json` rather than against the fixture
that caused the bug.

## The defect actually reproduces, and the fix actually fixes it

Not taken on trust. Loaded each checkout's `apps/viewer/viewer.js` into a `vm`
sandbox and asked it about a real entry from
`C:\workspace\tolstack\data\projections\viewer\crops.json`
(`hub_bearing_thermal_fit_m1:bearing_od_lower`, `pdf_name` `214589-002-A.pdf`,
`sha256_verified: true`):

| tree | `cropProvenanceLine` |
|---|---|
| `master` (pre-work) | `showing the cited zone F5 (callout text "-0.020" found there)` |
| handoff branch | `read from the export this citation names, 214589-002-A.pdf — sha256 VERIFIED · showing the cited zone F5 (callout text "-0.020" found there)` |

and `builtLine`:

| tree | banner |
|---|---|
| `master` | `crops built … (26 resolved, 22 unresolvable)` |
| handoff branch | `crops built … (26 resolved — 22 sha256-verified, 4 with no sha to check; 22 unresolvable)` |

`master` has no `VA.CROP_RULES` at all, and the sha verdict — the one fact the
hover exists for — was absent from every one of the 26 resolved crops. That is
the issue, confirmed on real data, and it is gone.

---

## The seven mandatory checks

**This work is not a tolerance stack.** `git diff master...handoff` touches
`apps/viewer/` (6 files) and `docs/` (4 files) and **nothing** under
`docs/tolerance_stacks/`, `tolerance_stack/`, `scripts/`, `tests/`, `data/`,
`docs/reference/` or `docs/PROVENANCE.md` — verified, not assumed. Checks 1–6 are
therefore addressed as "no new values, and here is what I confirmed instead";
check 7 is reported anyway because the checklist says to compute it.

1. **Every tolerance traces to a specification or drawing callout — N/A, no
   element changed.** No stack JSON, hardware entry or `materials.json` is in the
   diff. What *is* in scope and adjacent: the work changes how a citation's
   **export provenance** is displayed, and it does not invent any of it — every
   string it prints comes from a field `build_viewer_crops.py` wrote
   (`resolved_by`, `pdf_name`, `sha256_verified`, `run_id`, `summary.*`). No
   computed or inferred provenance anywhere in the diff. PASS.

2. **Signs on every path term — N/A**, no path or check touched. The related
   invariant that *is* in scope (no second combiner in JS) is checked below.

   2b. **Coherent material corners — N/A**, no fold, no transcription.

3. **LMC/MMC direction — N/A**, no element values.

4. **RSS actually computed — N/A**, no check results. The viewer's rendering of
   nominal/worst-case/RSS is untouched; the `[real]` tier still asserts the
   folded numbers reach the page verbatim, and it is green.

5. **Nominal inside its own min/max — N/A**, no nominals.

6. **Quantised constraints (cotter/castellation) — N/A**, no worksheet or stack
   in the diff. The generalised form of this check — *the archetype's own caveat
   must sit next to the numbers* — has a live analogue here and it **passes,
   checked by location, not by grep**: the "how much to trust this crop" sentence
   is emitted by `VA.cropProvenanceLine`, which `views/crop.js` renders inside
   the popover itself, beside the image and the sheet reference; and the
   verification counts are appended to `VA.builtLine`'s existing "26 resolved"
   phrase rather than parked on a separate line. Both facts land where the number
   they qualify is read. I confirmed this by rendering the popover and the banner
   under the node DOM shim and reading the resulting `textContent`, not by
   searching for the string.

7. **Traced / inferred / untraced ratio — recomputed, unchanged by this work.**
   `tests\debug_report_tolerance_stacks.py --ratio`, run by me on the merged
   tree:

   > **5 of 26 element instances across the three seeded slice-1 stacks are
   > `traced`; 3 are `inferred` and 18 are `untraced`.**
   > All stacks: **21 traced / 7 inferred / 20 untraced, out of 48 element
   > instances.**

   No `untraced` value's gap listing changed, because no element changed. Note
   for the next reviewer: the crop counts this handoff surfaces (26 resolved of
   48 citations) are a **different denominator** from the traced ratio — 48
   citations vs 48 element instances is a coincidence of the current tree, not a
   correspondence. The banner does not conflate them and neither should a report.

---

## Also verify

- **Tests, re-run by me, not trusted.** All green.
  - Python, merged tree: **344 passed / 0 skipped in the main checkout**,
    **343 passed / 1 skipped in a worktree** (the one data-dependent test skips
    where `data/` is empty — the documented checkout difference).
  - JS: **95/95** with `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`,
    i.e. with the real-data tier actually running. Baseline on `master` was
    **84/84**. Both re-measured.
- **Tests don't pollute production data.** `crops.json`'s `built_at` is
  `2026-08-11T05:05:18+00:00` before and after every run I made — the JS
  `[real]` tier reads the projection and writes nothing. The main checkout's
  `git status --porcelain` is `?? .dispatch.toml` and nothing else. PASS.
- **Nothing was written into drawing-checker.** Snapshot taken at review start
  (`18:41:04Z`, 1628 entries) and again at the end (`18:46:56Z`, 1628 entries);
  `snapshot_drawing_checker.py diff` reports **EMPTY — no entry added, removed or
  modified**. The handoff cites no runs, so there is no run-timestamp arithmetic
  to do. PASS.
- **No second combiner in JavaScript.** Read every added line. The only operators
  on projection data are string `+` (label assembly) and `Object.keys(...).length`
  / truthiness tests on counts. No `toFixed`, no comparison of tolerances, no
  verdict logic. The counts printed by `VA.shaCountsText` and `VA.cropRulesLine`
  are read straight out of `summary`, which `resolution_summary()` computed in
  Python — the viewer does not sum the entries itself, which it easily could have
  and which would have been a second counter. PASS.
- **`data/inbox/specs/` untouched**, `docs/reference/` untouched,
  `PROVENANCE.md` untouched — none appear in the diff, and the provenance test is
  green.
- **New warning evaluated on a clean tree, in both checkouts.** The diff adds two
  alarms: `(NO LABEL)` in the banner and the loud unlabelled-rule hover. Both are
  **quiet on the live data** — `summary.by_resolved_by` is
  `{source_ref_export: 22, spec_pile: 4}`, both labelled — and I confirmed the
  banner renders no warning text in the main checkout and no crop-rules line at
  all from a worktree with no projection. Also confirmed the alarm cannot be
  permanently on by construction: `resolution_summary()` builds
  `by_resolved_by` from **resolved rows only**, so an unresolvable citation
  cannot contribute an `"unknown"` bucket that would light it on every build.
  This is the failure mode `viewer_projection_provenance` shipped (`dirty: true`
  on every main-checkout build); it is not repeated here. PASS.
- **Documented vocabulary in all three places.** `resolved_by` now lives in
  `build_viewer_crops.py` (three rules: `source_ref_export`, `spec_pile`,
  `joint_export_run`), `VA.CROP_RULES` (the same three), and
  `apps/viewer/README.md`'s new table (the same three plus the fallback row). I
  enumerated the script's emit sites myself (lines 300, 333, 353) rather than
  reading the author's list. All three agree, and the fourth place — the live
  data — is now asserted against by `[real] every rule in the live crops.json has
  a label`. PASS.
- **Inventory blocks.** No file added under `scripts/` or `tolerance_stack/`, and
  no file added under `apps/viewer/`, so `ARCHITECTURE.md`'s tree block and
  `apps/viewer/README.md`'s Layout block are both still accurate. Checked, not
  assumed.
- **`{{` placeholders**: none in the diff.
- **Both new issue files carry the frontmatter block** (`type`, `priority` spelled
  `med`, `status: open`, `area`, `reporter: agent`). The closed issue moved to
  `status: resolved` with a dated resolution blockquote. PASS.
- **Claims re-derived rather than read.** `grep -n export apps/viewer/views/stack.js`
  → **0 hits**, so `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export` is
  true as filed. The `joint_export_run` reachability argument in the code comment
  and the lesson is correct: I read `resolve_pdf()` and the path is reached only
  when `source_ref.export` is absent/empty, `kind != "spec"`,
  `document == joint.assembly_drawing` and `joint.assembly_export` contains a run
  id. `provenance.sources_used` really is gone from the script, with
  `test_the_provenance_sources_used_prose_scan_is_gone` asserting it — so
  deleting that branch (rather than keeping it "just in case") is right.

## Concurrency

`git log --oneline HEAD..master` was **not** empty: `sop_library_ref_pairing`
merged while this handoff was in flight (6 commits, incl. `tests/test_sop_vocabulary.py`
with 3 new tests, and 43 lines added to this repo's review overlay). Merged
`master` into the review branch — **clean, no conflict**, including in
`docs/prompts/REVIEW_AGENT.md` which both reviews edit — and re-ran both suites
on the result. The two handoffs share no file. The suite counts moved, which is
the only trace it left; see finding N1.

The other fence held too: `viewer_projection_provenance` had already merged, so
its banner work is in this branch's baseline. `VA.provenanceLine` /
`VA.provenanceAlarms` and their tests are untouched and green, and the new
`.banner__crop-rules` element is appended *before* `provenance(root, state)`, so
the provenance block still renders last.

## Findings

### Fixed inline (no rework needed)

- **N1 · should-fix · `docs/sessions/lessons/LESSONS_20260810_…md:12`,
  `docs/issues/ISSUE_20260806_…md`.** Both quoted *"Python 340 passed / 1
  skipped"*, measured on the branch before `sop_library_ref_pairing` landed, and
  neither said which checkout produced it. The shipping tree reports **344 / 0 in
  the main checkout, 343 / 1 in a worktree**. This is the **fifth** sighting of
  "a sibling landed on master and the lesson's suite count is now false" and the
  overlay already carries the entry, so no new entry — but it is worth noting the
  pattern is now perfectly predictable: *if the board ran anything in parallel,
  the count is stale.* Corrected in both files, with the checkout named.
- **N2 · should-fix · `LESSONS_…md`, the `--repo` note.** The lesson's warning
  about the Bash-mangled path quoted *"68/68 green while the whole real-data tier
  never ran"*. On the shipping tree that number is **75/75** — I reproduced the
  mangling (`node apps/viewer/run_tests.cjs --repo C:\\workspace\\tolstack` under
  Bash → looks for `<cwd>/workspacetolstack/data/...`, skips, exits 0, prints
  "75/75 passed"). Corrected, and generalised: passing no `--repo` at all from a
  worktree does the same thing. This trap is now an overlay entry, because it
  makes a *reviewer's* JS run vacuous, not just an author's.
- **N3 · nit · `apps/viewer/viewer.js`, `VA.cropRulesLine`.** With zero resolved
  crops the builder still writes `by_resolved_by: {}`, which is truthy, so the
  banner rendered a dangling **`"crops by rule: "`** with nothing after it —
  reads as a rendering fault rather than as "nothing resolved" (which the
  adjacent "0 resolved" already says). One-line guard added
  (`if (!Object.keys(byRule).length) return null;`) plus an assertion in the
  existing `cropRulesLine` test. JS still 95/95.

### Nits, not fixed

- **N4 · `apps/viewer/fixtures.js`, the `washer` entry's `reason`.** Reworded to
  mirror the builder's real message, but with an em dash where
  `build_viewer_crops.py:362` writes `--`. Harmless (nothing compares the string,
  and the `[real]` test compares key sets), but the fixture is a little less of a
  mirror than it reads as.
- **N5 · the live-data guard only runs when you point the runner at real data.**
  `[real] every rule in the live crops.json has a label` is the right guard and it
  is the one the DoD asked for — but it lives in a tier that skips by default from
  a worktree, and the Python suite (which always runs) has no equivalent. A
  cheap complement, if a future handoff wants it: a `tests/test_viewer_crops.py`
  case asserting the `resolved_by` literals the script can emit are exactly the
  keys of `VA.CROP_RULES` in `viewer.js`. Deliberately **not** done here — it is a
  new grep-based check, and this overlay's own entry warns that a check whose
  pattern can match the thing under test is worse than none. Recorded so the next
  agent has the option, not filed as an issue: the option is already the third
  bullet of `ISSUE_20260811_viewer_fixtures_lag_the_live_projection_shape.md`.

### Things I looked for and did not find

- No arithmetic on a projection field in JS.
- No fixture or test asserting the deleted `provenance.sources_used` behaviour
  survives — both were replaced, which was the deliverable most likely to be
  skipped and was not.
- No key-set drift between the fixture's crop entries and the live ones: all 26
  live resolved entries share one key set (all three `locate()` branches return
  the same placement keys, so the new `[real]` key-set test is **not** sensitive
  to which entry happens to come first — I checked, because it would have been).
- No hard-coded expected counts in the new tests: every `[real]` assertion derives
  its number from `realCrops.summary`, so the next fastener citation will not turn
  the suite red for no reason. This is the right call and it is worth copying.

## Overlay updated

Two entries added to `docs/prompts/REVIEW_AGENT.md` and committed on this branch:

- **Recurring bug** — *the viewer's JS suite is green without having read any real
  data, and that is its default*: 75/75 (tier skipped) vs 95/95 (tier ran), exit
  0 either way, one `SKIP` line the only tell, plus the forward-slash trap. A
  report quoting a JS count must say whether the tier ran.
- **Architectural error** — *a branch over a value the data owns must be a total
  function, not an `else if` chain*: the `VA.CROP_RULES` shape (table + loud
  fallback + banner rollup + `[real]` live-value guard), the list of enumerated
  fields that still lack it, and the reason a key-set diff would not have caught
  this bug (the stale thing was a **value** in a correctly-named field).

## For the next reviewer

The remaining exposure is the one the author filed rather than fixed:
`source_ref.export` is rendered **nowhere** in the citation panel, so for the 22
citations whose crop does *not* resolve, an `unestablished` export — the stack
saying outright that the bytes behind a value cannot be identified — is invisible,
and the element row shows the same confidence chip as a citation whose export is
nailed down. That is `ISSUE_20260811_viewer_shows_nothing_for_source_ref_export`
(`bug`/med), and it is the higher-value half of this area now that the crop hover
is honest.
