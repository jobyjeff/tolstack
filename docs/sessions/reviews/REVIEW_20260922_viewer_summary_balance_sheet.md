---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_viewer_summary_balance_sheet.md
reviewer: agent (review/viewer_summary_balance_sheet)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-22 — viewer_summary_balance_sheet

Work reviewed: `handoff/viewer_summary_balance_sheet` @ `93bb990`, two commits
(code, then lesson + four issues), 17 files (+1608 / −321). Baseline
`integration` @ `9ddb865`. The merge into
`review/viewer_summary_balance_sheet` was a clean **fast-forward** —
`integration` had not moved since the branch was cut, so the canonical
prompt's conflict carve-out does not apply and nothing in the merged tree is a
resolution choice of mine.

## Verdict

**APPROVE.** All five deliverables are met and the definition of done holds on
live data. The chip ribbon is gone, the rolled-up numbers are a real `<tfoot>`
of the contributions table under the columns they total, the findings are rows
with the author's rationale one fold deep, and both paragraphs Jeff quoted are
deleted with every fact they carried still on the page. Two should-fix
findings (both filed, neither a product defect), three nits, one fixed inline.
No blockers.

This is **not** a tolerance stack, so the overlay's seven mandatory
stack checks do not apply: no element, `source_ref`, `confidence`, sign, LMC/MMC
or traced-ratio changed, and no projection input moved. I confirmed that
directly — the diff touches `apps/viewer/`, `scripts/run_viewer_browser_tests.mjs`
and `docs/`, and nothing under `tolerance_stack/`, `docs/tolerance_stacks/`,
`docs/topologies/` or `data/`. The cite-or-gap discipline is nonetheless the
thing this handoff was most able to damage — "compress the wording, never the
facts" — and that is checked below under deliverable 4.

---

## The tactical agent's full-suite record

**The benefit of the doubt is void for `pytest`, and partly granted for the JS
tiers.** The lesson records how to run both viewer tiers from the worktree (and
the `node_modules` junction it needed, created and removed), but it records **no
run at all** — no command output, no counts, for either tier or for `pytest -q`.
Per the canonical cadence that is the first of the three void conditions, so I
ran the **full** `pytest` suite myself *and* both JS tiers pre-merge rather than
only a risky subset, and the full suite again after the merge. Nothing I ran
contradicted any claim in the lesson.

## What I ran

All from the review worktree. The venv is the main checkout's, per `CLAUDE.md`.

| tier | command | result |
|---|---|---|
| viewer fast + `[real]` | `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` | **496/496** |
| viewer browser | `node scripts/run_viewer_browser_tests.mjs --repo C:/workspace/tolstack` | **25/25 checks**, incl. `[topology] 213/213` both transports |
| risky subset, pre-merge | `pytest -q tests/test_viewer_js_suite.py tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py tests/test_tolerance_stack.py tests/test_provenance.py tests/test_thermal_exception_list.py` | **228 passed, 1 failed** |
| full suite, post-merge | `pytest -q` (review worktree, merged tree) | **1208 passed, 1 failed** |

The one failure in both `pytest` runs is
`tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, red because the
worktree has no `data/projections/`. That is the deliberate 2026-09-18 design
("a skipped tier is not a passed one") and it is the exact count the 2026-09-21
batch-merge agent measured on a green tree (`1 failed, 1208 passed`). The tier
it stands in for is the `--repo` run in row 1, which is green at 496/496.

**What the worktree run left unexercised, by name:** nothing beyond that one
test. Every `[real]` viewer assertion ran through the `--repo` seam; the
browser tier ran against the main checkout's projection and crops via a
`node_modules` junction, which I created for this review and **removed**
afterwards. `tests/debug_*.py` are hand-run by design and were not run.

The **mutation-witness tier** (`node scripts/run_mutation_witness_tests.mjs
--repo C:/workspace/tolstack`) is owed by this diff's shape. I ran it; its
result is recorded at the end of this report. `scripts/mutation_witnesses.json`
itself names none of the selectors or symbols this diff deleted, so the merge
could not have stranded an entry — and the author has already filed
`ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`
for the four new guards that carry no entry yet.

## Guards observed failing — three of the four new ones, by mutation

Per the universal check, a new guard is not accepted on the strength of green.

| mutation (scratch, reverted) | expected to redden | result |
|---|---|---|
| `findingRow`'s rationale `<p>` → the literal `"MUTANT"` | the findings-row guards | **2 red** (`an incomplete check's bottom line …`, `[real] an incomplete check states what is missing …`), 494/496 |
| a `<p>` appended to the summary outside any `<details>` | `[real] no study summary explains itself in a paragraph` | **red**, 495/496 |
| `totalRow` drops its `tvcell--ord` cell (one column's shift) | the browser tier's column alignment | **red**, drift **80px** vs the `< 0.5px` bar; `23/25` |

The fourth — `[real] every finding a study raises is one row, and the count is
the row count` — is where finding 1 below came from: its row-count half is
sound, its "nothing is lost" half is not.

---

## The handoff, deliverable by deliverable

1. **The chip ribbon dies.** ✅ `.tvtotals__strip`, `.chip--total`,
   `.tvtotals__flags`, `VA.studyTotals` and the whole `verdictBlock` /
   `.tvverdict-card*` / `.tvwarn*` family are deleted, code and CSS together,
   with no dangling reference anywhere in `apps/` or `scripts/` (I grepped).
   `[real] no study summary explains itself in a paragraph` asserts
   `.chip--total` and `.tvtotals__strip` are zero on **every** live study, and
   the browser tier asserts `strips === 0` at the real page.

2. **Rolled-up values are footer rows of the contributions grid.** ✅ A real
   `<tfoot>` of the same body table — verified in the browser, not just by
   class name: `sameTable` compares `closest("table")` on a member row and a
   totals row, and the `min` cell's right edge agrees to **< 0.5px**
   (measured 80px off under mutation, so the check bites). Nominal, worst-case
   min/max/half, `rss_center`, RSS min/max/half, the margin and the criterion
   are all present; `[real] every study's totals reach the page value for
   value` now pins `rss_center` too, which the strip never showed.

   Two decisions I checked rather than took on trust:
   - **the margin, not the criterion, spans the value columns.** The stated
     reason (which bound a criterion bites on depends on its own direction) is
     right, and every live criterion is `>= 0` — precisely the condition under
     which a wrong guess would ship invisibly. Correct call.
   - **the verdict chip is in the name cell, not the merged section cell.**
     Verified against live data: `pitch_system_end_stop_minus7` really does
     carry two checks that disagree (`s461_607_margin_at_minus7` → `marginal`,
     `s461_617_margin_at_minus7` → `pass`), so a chip merged over the block
     would print one row's answer over the other's.

   Rails: unmoved, and for the reason given (`VA.rowPositions` is a row
   **count**). `testHeightBudget` is green at 21/21 with a `minExpected` floor
   that a taller table cannot trip.

3. **Cards of parameter/value pairs.** ✅ Two `<dl class="kv">` cards, through
   `VA.kvList` — views/stack.js's existing renderer, newly exported rather than
   copied, so "humanise the key / say *not recorded* / never print a JSON blob"
   stays decided in one place. `views/stack.js` loads first (`topology.html`
   script order), and the export sits beside a hoisted declaration, so the
   ordering is real. The one pair that states a confidence renders a `.chip`
   rather than a coloured string — the right call, since the colour rules are
   written against `.chip`.

4. **Findings become structured rows — and no fact left.** ✅ This is the
   deliverable with the repo's spine in it, and it holds. `[real] an incomplete
   check states what is missing` now asserts the row's own line is **< 90
   chars** *and* that `MS9363 Rev C`, `.178/.198 in`, `castellation PHASE` and
   `JPS00094 5.9.7` are all still in the row's subtree, *and* that the
   `<summary>`'s `title` is byte-identical to `check.excluded_terms[0]`. The
   second quoted text is now three rows with the count as the row count, and
   the zero-width guard was strengthened from "one sentence names them all" to
   `eq(warn.length, zeroWidth.length)` — one row per zero-width dimension,
   which the old semicolon-list check could pass with a name buried in it.

   The generated-vs-authored split the handoff asked to be recorded is in the
   lesson as a four-row table, and it reproduces: the two deleted strings are
   literals in the old `verdictBlock`, the two surviving ones are
   `check.excluded_terms[0]` and the edges' own `name`s in the projection.

5. **UI-copy rules.** ✅ Two id leaks removed (the `<code>` study id → the
   heading's hover title; `from → to` printed as raw node ids → the interfaces'
   names), and — the better half — the *surfaces* were enrolled in the fixture
   id/banned-string walk, with the study id added to the id list, so the walk
   would have caught both. Declining to add a literal to
   `reader_facing_bans.js` is reasoned and I agree with it: "a paragraph where
   a table belongs" is structural, and the structural guard was written instead.
   The `[real]` walk's inability to reach this surface is measured and filed
   (`ISSUE_20260922_the_study_summary_renders_record_prose_…`), with a comment
   at the site so the gap does not read as an oversight.

## Definition of done

- **Cotter hole clearance** renders as grid + totals + findings + cards, no
  ribbon, no unfolded paragraph — confirmed in the lesson's screenshots and by
  the `[real]` structural guard over all 21 live studies.
- **The other live stacks through the same layout, no special cases** — the
  `[real]` tier renders every study of every live topology (21 of 21, all
  `status: ok`), and the thermal-fit spot-check is recorded. The claim that the
  stack page is *unchanged* is structural rather than pixel-compared, and the
  author says so: the only edit to its renderer is `VA.kvList = kvList;`, and
  every selector this pass touched is `tv*`-prefixed. I accept that reasoning —
  the `[real]` stack-page tests are green either way.
- **Viewer suite + reader-facing bans green** — 496/496 and 25/25.
- **Lesson with before/after screenshots** — present, four images.

## The lesson's own arithmetic and attributions — audited

Per the universal check, re-derived rather than read:

| claim | checked against | ✓ |
|---|---|---|
| `pitch_system_end_stop_minus7` carries two checks, `marginal` and `pass` | `topologies.json` | ✓ |
| nineteen findings on that study | 7 + 4 excluded terms + 8 unverified edges = 19; the screenshot shows 19 rows | ✓ |
| `gas-spring bushing tipping backlash` appears twice, from two different rationales | two distinct `excluded_terms` strings sharing everything before ` -- ` | ✓ |
| "every one of the 21 is `status: ok`" (tests.js comment) | 5 topologies, 21 studies, 21 ok | ✓ |
| the ` -- ` convention is how authored excluded terms split what from why | true of excluded terms — **but not only of them**, see finding 2 | ⚠ |
| the fast tier's DOM shim has no descendant selectors | `run_tests.cjs`'s `matcher()` is `tag` / `.class` / `tag.class` | ✓ |

The one ⚠ is finding 2 below; it is an incomplete claim rather than a wrong
number, and it is the claim the code rests on.

---

## Findings

### should-fix (both filed; neither blocks)

1. **`[real] every finding a study raises is one row` proves its "nothing is
   lost" half against the gap panel, not the row.**
   `apps/viewer/tests.js` — the trailing
   `ok(root.textContent.indexOf(finding.whole) !== -1)` under the comment "the
   whole authored text is on the row". `root` is the whole summary pane, which
   also holds `gapsPanel(topoProj)`, and that panel prints every excluded term
   **whole**. A findings row can never contain `finding.whole` as one text run
   once the author wrote a ` -- `: the name is a `<summary>` and the rationale a
   sibling `<p>`, so `textContent` joins them with the separator gone.
   **Measured:** blanking the rationale left this test green (two others went
   red); blanking the rationale *and* removing `gapsPanel` reddened it. The
   row-count half of the same test is sound.
   *Fix:* scope the assertion to the row plus its `summary`'s `title`.
   `ISSUE_20260922_the_findings_whole_text_assertion_is_satisfied_by_the_gap_panel_beside_it.md`.

2. **`VA.splitAuthoredFinding` also cuts EDGE NAMES, where ` -- ` means
   something else.** The lesson justifies the splitter as an *excluded-term*
   convention (what -- why), which is true. But `VA.studyFindings` runs it over
   `attention.unverified` and `attention.noTolerance` as well, and those hold
   **edge names**, where ` -- ` is `name -- clarifier`. 58 strings in the live
   projection carry ` -- ` and `edge.name` / `node.name` are among them. One is
   live today: `piston end to end-stop feature -- the end stop` is `untraced`
   and in the chain of **five** studies, each of which renders it truncated to
   `piston end to end-stop feature` with `the end stop` in the fold as though
   it were the author's argument. No fact is lost (whole string on the hover),
   but the row names the edge differently from the grid one block above, and
   `[real] a study fed by a zero-width row …` asserts
   `shownRows.indexOf(edge.name)` — which holds only while no zero-width edge
   name carries the separator.
   `ISSUE_20260922_the_authored_finding_splitter_also_cuts_edge_names_where_the_same_separator_means_something_else.md`.

### nits

3. **Fixed inline** (three prongs clear: no behaviour, no test, four words):
   `apps/viewer/README.md`'s file inventory still listed "the slim totals
   strip" among what `topology.css` styles. Now "the grid and its totals
   footer, the study summary pane". Nothing else in that README was stale —
   the new "The study summary reads like a balance sheet" section is thorough
   and the two other `totals strip` hits are dated narrative about
   `HANDOFF_20260909_*`, which is history and correct as history.

4. **Two comments still cite the `.tvwarn` classes this pass deleted** —
   `apps/annotate/style.css:298` (*"Same shape the viewer gives its own
   chain-level warnings (`.tvwarn--unverified`)"*, a design rationale that now
   points at nothing) and `tests/debug_typography_pass.mjs:357` (describes the
   pane as stacking "a strip, cards, warnings and a 38-row gap list"). Neither
   is a behaviour defect; the annotate one needs a decision rather than a
   rename, which is why I filed it instead of editing it.
   `ISSUE_20260922_two_comments_still_cite_the_tvwarn_classes_this_pass_deleted.md`.

5. **`AUTHORED_REASON_SPLIT`'s ` — ` (em dash) alternative is unwitnessed and
   unmotivated.** Zero live strings match it (I scanned every `name` and
   `excluded_terms` in the projection) and no test exercises it. Em dash is
   ordinary punctuation in this repo's prose, so the alternative widens the
   splitter over exactly the shape it should not cut. Not filed separately —
   it is the same mechanism as finding 2 and the fix there should settle it.

### noted, not filed

6. The criterion cell prints `must be >= 0`. `>= ` is an operator glyph on a
   reader-facing surface, which brushes the UI-copy rules — but the author's
   reasoning (re-spelling an operator invents a second vocabulary for the
   record) is sound and written down, and the handoff asked for the criterion.
   Leaving it as the author decided.

7. Four design issues were filed by the author, two of them about surfaces this
   pass did not take (the stack page's check cards; the grid's clipped zone).
   Both are correctly scoped as design questions rather than as defects of this
   work, and I agree with the stack-page reasoning: a stack's elements table is
   not any one check's term list, so a copy-paste of this layout would be wrong.

---

## Mutation-witness tier

Run post-merge on the merged tree: `node scripts/run_mutation_witness_tests.mjs
--repo C:/workspace/tolstack` → **93/96 declared mutations witnessed**.

The three NOT WITNESSED are the same three that have been unwitnessed since the
2026-09-21 batch merge, verbatim and for the same stated reasons:

```
leader-style-survives-a-topology-switch — another check reddened, but not the declared one
worst-verdict-ranks-worst-last — the tier never reached the witness
arriving-at-an-element-shows-its-part-in-3d — the witness cannot see the difference
```

They are already open as
`ISSUE_20260921_three_declared_mutations_are_unwitnessed_on_trunk_after_the_batch_merge.md`
and were reported identically by both 2026-09-22 reviews that preceded this one
(`policy_free_brief_residues` measured 70/73 with the same three; the
denominator moved to 96 when `mutation_witness_enrollment_backlog` landed).
**None of them is this diff's doing** — this work touches no leader style, no
verdict ranking and no 3D affordance, and `scripts/mutation_witnesses.json`
names none of the selectors or symbols it deleted, so no witness was stranded
by the change. The four guards this pass *adds* carry no entry yet, which the
author filed as
`ISSUE_20260922_the_balance_sheet_guards_have_no_mutation_witness_entry.md`;
three of them I witnessed by hand above instead.

## For the next reviewer

Both new overlay entries under **Recurring bugs to check** came out of this
review and are worth carrying forward as a pair, because they are the same
question asked of two different artifacts: *which node does this actually
read?* (finding 1, a guard) and *where did every member of this collection come
from?* (finding 2, a parser). The viewer's summary pane is now the surface most
likely to produce more of both — it renders three vocabularies (the page's own
words, `VA.GAP_KINDS`, and authored record prose) into one table.
