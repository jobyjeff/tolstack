---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_viewer_export_and_material_provenance.md
reviewer: review agent (claude-opus-5[1m])
date: 2026-08-12
verdict: APPROVE
blockers: 0
---

# Review — `viewer_export_and_material_provenance`

**APPROVE.** All four deliverables landed, every new guard was **observed
failing** (three separate breakages, including the CSS claim in a real browser),
and the handoff's own false premise was caught by the author and corrected in the
issue, the lesson and the code — which is the best outcome available on a handoff
whose premise was wrong.

One class of finding, fixed inline and committed on this review branch
(`358569f`): **nine count claims across five files, one digit borrowed from its
sibling fact.** No blockers.

---

## The seven mandatory checks

The work under review is **not a tolerance stack**. The diff is
`apps/viewer/viewer.js`, `apps/viewer/views/stack.js`, `apps/viewer/index.html`,
`apps/viewer/tests.js`, `scripts/run_viewer_browser_tests.mjs` and three docs.
No `docs/tolerance_stacks/*.json`, no `tolerance_stack/*.py`, no worksheet, no
`data/`. Checks 1–7 are written for an author transcribing numbers out of
documents, so they mostly exit — each is addressed rather than skipped.

**1. Every tolerance traces to a specification or drawing callout — N/A, and the
work strengthens it.** No element value changed anywhere. The handoff's whole
subject is *rendering* provenance that already exists, and it renders it without
overstating it: the block says a sha256 is **recorded**, never *verified*, with a
test asserting the string `VERIFIED` never appears in an export line
(`an export's sha is RECORDED, never described as verified`). That is the right
call — the viewer cannot hash a file, and `VA.cropShaText`'s VERIFIED is earned by
`build_viewer_crops.py` actually re-hashing. The one number the new code prints
that is not copied from the projection is `sha.slice(0, 12)`, a truncation.

**2. Signs on every path term — N/A.** No term list, no `fold()`, no check
authored or altered. Confirmed no Python file is in the diff.

**2b. Coherent material corners — N/A.** No transcription, no re-derivation.

**3. LMC/MMC direction — N/A.** No element carries `lmc`/`mmc` in this diff;
`fold()` untouched.

**4. RSS actually computed — N/A.** No check authored. The projection's checks are
unchanged (verified: a full rebuild moved nothing but `built_at`/`provenance`).

**5. Nominal inside its own min/max — N/A.** No transcribed nominal in the diff.

**6. Quantised constraints where cotter/castellation hardware appears — N/A.** No
joint is analysed here. The generalised form of the check *does* apply and passes:
the archetype's own caveat sits next to the numbers. `VA.appliedOverText` prints
the range the source quoted a mean CTE over **beside** the ranges this stack
applies it over, in the same table cell, and deliberately compares neither —
"deciding whether one covers the other is arithmetic, and arithmetic happens in
Python". Every live entry quotes **no** range and is applied over **two**
(`[[20, 72], [20, −20]]`), so the cell now reads `— not stated` above
`applied over 20 … 72, 20 … -20 °C`. That pairing is the caveat, and it is on the
row.

**7. The traced / inferred / untraced ratio — unchanged, re-derived rather than
copied.** `tests\debug_report_tolerance_stacks.py --ratio`, run by me in this
review worktree after the merge:

> **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across the
> three seeded slice-1 stacks. All stacks: **21 / 7 / 20 out of 48**.

Identical to the pre-merge figure; nothing in this diff can move it. **Non-element
values: 0 of 7 traced**, unchanged (three CTEs, two operating temperatures, two
stiffness ratios) — and this handoff is the first thing that puts that fact on the
screen, via `values_status` and `cindas_request`.

Cross-tab I computed while auditing the new rendering, because it is the first
time the two axes are visible together and it is worth recording:

| confidence | kind | export |  n |
|---|---|---|---|
| traced | drawing | established | 14 |
| traced | spec | established | 3 |
| **traced** | **spec** | **none** | **4** |
| inferred | drawing | established | 1 |
| inferred | parts_list | established | 4 |
| inferred | workbook | none | 2 |
| untraced | workbook | none | 19 |
| untraced | assumed | none | 1 |

The bolded row is the only place the repo says `traced` while saying nothing
identifies the bytes. It is defensible (spec-pile identity is the filename) and it
is out of scope here, so it is filed:
`ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md`.

---

## The universal checks

**Tests don't pollute production data — PASS.** The Python suite leaves
`C:\workspace\tolstack\data\` untouched; the JS `[real]` tier opens the projection
read-only and the two poisoned-data tests (`an export status the viewer cannot
explain`, `[real] an unestablished export on a real citation is loud`) both work
on `JSON.parse(JSON.stringify(...))` deep copies, never the file. Verified by
rebuilding both viewer projections after the full run and diffing key by key
against a pre-run copy: **only `built_at` and the `provenance` block moved.**

**A new guard has been observed failing — PASS, three ways.** Green was not
accepted on any of them:

| breakage | result |
|---|---|
| `if (exportBlock) cell.appendChild(exportBlock)` → never appends | **7 tests red**, 111/118, naming the established row, the unestablished row, the no-crop path, the no-export state, the unlabelled state and two `[real]` ones |
| `VA.EXPORT_STATUSES.unestablished` renamed | **6 tests red**, 112/118, including `[real] an unestablished export on a real citation is loud, with its why` |
| `.chip--export-unestablished` CSS selector typo'd | browser: **2/4 checks, 19/20 sub-checks**, `FAIL sub-check: the unestablished-export chip is filled, not transparent` |

The third is the one that matters: "impossible to miss" is a CSS claim, and the
author asserted it on `getComputedStyle`, not on a class name. A class-name check
would have passed straight through that typo. That is the right instinct and it is
now demonstrated rather than argued.

The companion meta-guard from the dependency — `[real] each value guard bites when
fed a value nothing can explain` — covers the two upgraded rows generically via
`SENTINEL`, so the `known: function (v) { return !!VA.EXPORT_STATUSES[v]; }` form
cannot silently become a guard that accepts anything.

---

## Deliverables, one at a time

1. **Render the export block per citation — done.** `status` (loud on
   `unestablished`, with `why` unclamped and unhidden), the `pdf` basename plus the
   full path, `sha256 recorded (first 12…)`, and the run ids. The `runs` link
   treatment is reused from the crop popover (`VA.runUrl`) exactly as asked, and it
   stops honestly where the data stops: an export carries a run **id**,
   drawing-checker addresses a run by its **directory** name, so only the id the
   element's own crop resolved through becomes a link and every other id prints as
   dotted-underlined text with a hover saying why. Refusing to build a URL from a
   prefix is the correct answer, and it is documented in three places.

2. **Decide where `note` goes and say why — done, and the reasoning is sound.**
   Inline, clamped to ~4.6em, click to expand, full text as tooltip — the same
   treatment `source_ref.note` already had, under its own class
   (`el-export__note`) so no selector crosses over. The argument against hover-only
   (up to 684 characters live; a hover cannot be printed, `Ctrl-F`'d, or touched)
   holds. The distinction drawn between the clamped `note` and the **unclamped**
   `why` is the best judgement in the handoff: the `why` is the entire content of
   the unestablished state, and putting it behind a second click would reproduce
   the original defect one notch down.

3. **Material provenance — done, one field wider than asked.** `values_status`,
   `library_ref`, `applied_over_c`, `designation_source` (with its callout and
   note) all render; `class` was **already** rendered in the
   `specification · condition · class` detail line, which the lesson says plainly
   rather than claiming credit. `cindas_request` was added beyond the ask, with a
   reason. Two judgements worth endorsing:
   * `library_ref` renders **whatever `values_status` says**. Reading it only under
     `library` would be the same silent drop one field along, and the schema does
     permit an `inline` entry to carry one. Pinned by
     `library_ref renders whatever the status says`.
   * `values_status: "library"` with **no** `library_ref` is loud, because
     `thermal.py` validates the pair no further. `loud` is a function of the entry
     rather than a constant, which is the only way to express that.

4. **Fixture-tier tests for each new rendering, including `unestablished` —
   done, and the two `known: NONE` guards were upgraded to the strong asked-table
   form.** Confirmed rather than assumed, per the deliverable's own wording.

**Definition of done — met, with the handoff's premise corrected.** No live
citation is `unestablished`; nothing in the repo is. The demonstration is
therefore a poisoned copy of a **real** unresolvable citation
(`hub_bearing_thermal_fit_m1:hub_bore_lower`), which asserts the loud block, the
unclamped `why`, the row chip **and** that the element's crop is still
`unresolvable` — the last being the whole asymmetry argument. That is the honest
way to demonstrate a state the data does not contain, and it is the same technique
the dependency used.

**The DoD's question — "can a reader tell an `unestablished` citation from an
established one from the element row alone?" — is answered `yes`, correctly.** A
filled magenta `EXPORT UNESTABLISHED` chip sits beside the confidence chip inside
the sourcing cell, which is part of the row; verified in a real browser on the
computed background colour. The lesson's two stated limits are both honest: only
the two *unidentifiable* states get a chip, and the chip is a **separate axis from
confidence** (4 live `inferred` `parts_list` citations have a nailed-down export;
4 `traced` `spec` ones have none — I re-derived both figures, they hold).

---

## Findings

### Should-fix — fixed inline and committed (`358569f`)

**F1 — `22 of the 48 live citations` describes the wrong set, in five places.**
`apps/viewer/viewer.js:220`, `apps/viewer/views/stack.js:235`,
`apps/viewer/tests.js:605` and `:625`, `apps/viewer/README.md:141`, plus
`LESSONS_…:31`.

Recomputed from `data/projections/viewer/results.json`: 48 citations split
**22 `established` / 26 with no `export` key / 0 `unestablished`**. **22 is the
established count.** The no-export state — the one all six sentences are about —
is **26** (21 `workbook`, 1 `assumed`, 4 `spec`). The handoff's own lesson carries
the correct table eight lines above its own wrong copy, so this was internally
checkable without touching the data.

The `README.md` copy had a second error on top: it called the 26 "workbook or
assumed sources with no PDF to name" and then, in the next sentence, said four of
them are `spec`. Rewritten to give the breakdown.

**F2 — `15 of the 22 live established exports have none` counts citations, not
exports.** `apps/viewer/viewer.js:258`, `apps/viewer/views/stack.js:267`,
`apps/viewer/tests.js:647`, `apps/viewer/README.md:139`.

22 established **citations** name **9 distinct exports** (by sha256). 15 citations
have an empty `runs`; **6 of the 9 distinct exports** do. The ratio is true of
citations and the noun says exports — the traced ratio's instances-vs-distinct-ids
trap, in a new place. Both figures now given.

**F3 — two arithmetic claims in the lesson do not reproduce.**
* *"an export note is up to 684 characters live (the longest is
  `bearing_od_lower`'s…)"* — 684 is real, but it belongs to
  `vpa_output_to_pitch_plate:pitch_flange_thickness`. `bearing_od_lower`'s is
  **481**, and it is the note whose *content* the parenthetical describes. Two
  facts merged into one sentence; both now stated.
* *"of the five run ids across the two multi-run live exports, two are linked"* —
  **3** of the 9 distinct exports carry more than one run id (2, 3 and 4 of them);
  the 7 citations naming them render **21** run ids between them, of which **7**
  are links. Corrected. The conclusion it supports ("one link per citation at
  most, because the crop script only ever tries `runs[0]`") is right, and I
  verified `runs[0]` is the linked id in all 7 cases.

This is the overlay's *"stale inventory numbers"* entry in a variant sharp enough
to warrant its own line, which I have added: **one number, two nouns, both in the
same commit**. Nothing here was stale — the digits were borrowed sideways from a
sibling fact within one session.

### Nits (no action taken)

* **`[real] every citation whose crop is unresolvable states its export` asks the
  view-model, not the page.** It asserts `VA.exportProvenance(...).headline` is
  non-empty, so it stays green with the `cell.appendChild(exportBlock)` line
  deleted — i.e. it is silent in exactly the case the handoff exists for. Its DOM
  siblings caught that breakage, so nothing shipped unguarded, and I have added the
  general question to the overlay ("which line of production code, deleted, turns
  this red?").
* `runsLine(p, cropsIndex, stackProj, element)` takes `p` and never reads it — it
  re-derives the export block from `element.source_ref` instead. Harmless; one
  fewer parameter would be clearer.
* `exportProvenanceBlock`'s `facts` array can only ever hold `shaText`. Written for
  a second fact that did not arrive.
* `apps/viewer/README.md`'s new `## Materials — the provenance of a *number*`
  heading was inserted **above** the existing paragraph that introduces the
  Materials table, so that paragraph now reads as the section's opening rather than
  as the end of the chip table's discussion. It reads fine; noting it in case it
  was not deliberate.

### Filed as issues (out of scope for this handoff)

Both were recorded only in the lesson, where a triage sweep cannot see them:

* `ISSUE_20260812_four_traced_spec_citations_carry_no_export_block.md`
  (`med`, `audience: strategy`) — the four `traced` `spec` citations where the row
  says `traced` and the export line says nothing identifies the bytes. Both
  statements accurate; the pair reads as a gap, and the spec pile's
  filename-identity rule is currently statable only inside a crop entry.
* `ISSUE_20260812_no_test_pairs_the_js_status_tables_with_the_python_vocabularies.md`
  (`med`) — `VA.EXPORT_STATUSES` and `VA.VALUES_STATUSES` are hand-copies of
  vocabularies `stack.py` and `thermal.py` own, and `VALUE_GUARDS` only fires once
  live data carries the value. `library` and `unestablished` have **zero** live
  instances, so a rename or a fourth value is invisible until data moves.

---

## The rest of the overlay

* **Whole-file diff check — PASS.** `git diff --stat` and `git diff -w --stat`
  agree to within 2 lines on every file (`views/stack.js` 178 vs 176; the rest
  identical). No re-emitted file, no NUL byte, no CRLF flip — the trap from
  `viewer_fixture_shape_guards` did not recur.
* **A sibling handoff landing on `master` mid-review — none.**
  `git log --oneline HEAD..master` was empty before the merge and after. The board
  ran nothing in parallel.
* **The projections are stale unless you rebuild them — rebuilt.** Both viewer
  builders re-run from this review worktree (the newest tree; the recorded
  `head_sha` `1997195` is an ancestor of my HEAD, so the exit-3 gate did not fire),
  against `--data-root C:\workspace\tolstack\data`. Diffed old vs new key by key:
  **only `built_at` and `provenance` moved**, on both files. The `[real]` tier
  re-run against the fresh projection: still 118/118. The third projection
  (`data/projections/spec_library/library.json`) was not rebuilt — nothing in this
  diff touches `docs/spec_library/events/`.
* **A new warning that is always on — PASS.** The one always-on element added is
  the plain `.el-export--none` line, which appears on 26 rows and is deliberately
  **not** loud — the author argued exactly the false-positive case this entry
  exists for. The loud states (`unestablished`, `unlabelled`) have zero live
  instances, so nothing new fires on a clean tree in either checkout. Verified in
  both.
* **A branch over a value the data owns must be a total function — PASS, and this
  is the entry the handoff advances.** Two more `else if` chains that never existed
  are tables (`VA.EXPORT_STATUSES`, `VA.VALUES_STATUSES`) with loud, value-naming
  fallbacks, and the two corresponding `VALUE_GUARDS` rows moved from
  `known: inList([...])` (a copy) to `known: function (v) { return !!VA.…[v] }`
  (asks the viewer). That is the form the overlay says to prefer, and it removes
  two hand-maintained vocabularies rather than adding any.
* **No second combiner in JavaScript — PASS.** Grepped every added line for
  arithmetic on a projection field. The new code contains `String(sha).slice(0,12)`
  (truncation), `parts[parts.length - 1]` (array index), and `.map(VA.fmt).join()`.
  No `+`, `-`, comparison of tolerances, `toFixed`, or verdict logic.
  `VA.appliedOverText` explicitly refuses to compare the two ranges it prints.
* **A term rendered without its coefficient — N/A.** Term rendering untouched;
  `[real] the hot stage-1 wall term carries its 2 × soak weight` still passes.
* **`ARCHITECTURE.md` / `apps/viewer/README.md` inventories — PASS.** No file was
  added to `scripts/` or `tolerance_stack/`, and no file was added under
  `apps/viewer/`, so no tree block went stale. I also grepped for the *claim* form
  of this entry: nothing in a live doc asserted "the viewer renders no part of
  `source_ref.export`" outside the issue and the `VALUE_GUARDS` `branch:` strings,
  and both were updated.
* **A documented command that does not run in this repo's shell — PASS.** The docs
  add no new command. The two the lesson names (`npm install`,
  `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`) I paste-ran in
  PowerShell; both work, and the forward-slash `--repo` trap is correctly flagged.
* **drawing-checker is read-only and one-way — PASS, with evidence.**
  `scripts/snapshot_drawing_checker.py` taken at the start of this review and again
  after the full test + rebuild cycle (which includes `build_viewer_crops.py`,
  the one thing here that reads that repo): **1628 entries → 1628 entries, diff
  EMPTY.** The author took no snapshot; the handoff touches no drawing-checker path
  and the SOP's Step 0/8 requirement is written for stack sessions, so this is
  consistent with the two prior viewer reviews rather than a new lapse.
* **`data/inbox/specs/` append-only — PASS.** Not in the diff; filesystem
  unchanged (covered by the snapshot above for the drawing-checker side and by an
  empty `git status` in the main checkout for the tracked side).
* **`docs/reference/`, `PROVENANCE.md`, `materials.json`, hardware entries, schema
  hygiene — N/A.** None in the diff; `tests/test_provenance.py` and
  `test_no_live_document_states_an_unguarded_hardware_entry_count` green.

---

## Suites, and which checkout produced each

| command | where | result |
|---|---|---|
| `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack` | review worktree → main-checkout data | **118/118, `[real]` tier RAN** |
| `node apps\viewer\run_tests.cjs` (no `--repo`) | review worktree | **91/91, tier SKIPPED** — the 27-test gap is the point |
| `node scripts\run_viewer_browser_tests.mjs` | review worktree, Chrome 151 | **4/4 checks; 91/91 suite ×2, 20/20 app sub-checks ×2** |
| `python -m pytest -q` | review worktree | **350 passed, 1 skipped** |
| `python -m pytest -q` | main checkout, post-merge | see below |

The lesson's figures (JS 118/118, Python 350/1, browser 4/4 with 20/20 sub-checks)
all reproduce, and it correctly states the checkout and the `--repo` flag. `npm
install` is needed in a fresh worktree (`node_modules` is gitignored); I copied the
tactical worktree's instead, one package, no browser download.

---

## Integration

Merged to `master` and pushed. Worktree and branch cleanup per the canonical
process. Post-merge state and the main checkout's condition are recorded in the
section below.

## Note for the next reviewer

* The `[real]` tier is now **27 tests** (91/91 skipped vs 118/118 ran). Recount;
  do not quote.
* The overlay gained two entries: *a `[real]` test that asks the view-model instead
  of the page*, and *one number, two nouns, both in the same commit*. The second is
  the third consecutive review to fix a count claim inline — if a fourth follows,
  it is worth asking whether the repo wants a doc-level test that recomputes
  citation-level counts the way
  `test_no_live_document_states_an_unguarded_hardware_entry_count` recomputes
  hardware-entry counts. The numbers all come from one projection and one loop.
* The main checkout carried a **pre-existing** uncommitted revert of
  `apps/viewer/README.md` plus an untracked `apps/viewer/README.md.backup`,
  inherited from the `viewer_fixture_shape_guards` review (which recorded, in
  `REVIEW_20260812_viewer_fixture_shape_guards.md`, that a live process kept
  re-reverting the file). Neither is mine. See the post-merge section for what I
  did with it.
