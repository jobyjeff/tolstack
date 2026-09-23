---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_stack_page_check_card_balance_sheet.md
reviewer: agent (review/stack_page_check_card_balance_sheet)
date: 2026-09-23
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-23 — stack_page_check_card_balance_sheet

The loose-stack page's thirteen-to-sixteen check `<article>` cards are one
`<table>` now: a row per check, a row per path, the record folded under each.
`hub_bearing_thermal_fit_m1` goes from **10,633 px** to **4,825 px**, and the
two questions the issue said do not transfer from the study page are answered
in the build and argued in the lesson. The work is good, the tests are
substantially better than this repo's average for a rendering pass, and the
author filed three issues of their own — including one admitting their guards
carry no mutation witness.

Nothing here blocks. What I found is one class of defect repeated: **the
geometry the whole layout rests on is argued in four files and observed by
nothing**, and the browser sub-check named for that claim cannot fail on it.
Three issues filed, seven inline fixes made, all disclosed below.

---

## Which run this is, and what it was measured against

* Branch under review: `handoff/stack_page_check_card_balance_sheet`, four
  commits (`1172676`, `c3c2e2b`, `7cca5fc`, `9a032a4`).
* `integration` was at the branch point (`9f19647`) when I started, and
  `git log HEAD..master` was empty. I merged with `--no-ff` (`5b0dabe`), then
  committed my inline fixes on top.
* **A sibling landed mid-review and I merged it in too.**
  `mutation_witness_repair_and_enrollment` took `integration` to `8959a2a`
  while I was measuring, and it touches **two of the same files** this handoff
  does — `scripts/run_viewer_browser_tests.mjs` and
  `docs/prompts/REVIEW_AGENT.md`. Both auto-merged with **no conflict**
  (different regions in each), and the union risky subset was re-run on the
  merged tree; the numbers in the table below are that tree's. This matters
  more than usual here: the sibling **is** the mutation-witness enrollment
  pass, its own review measured the registry at **108/108** on an
  `integration` that did not yet carry this handoff, and this handoff deletes
  `article.check` / `.check__head` / `.check__numbers` / `.check__corner` /
  `.check__id` / `.check__label` and rewords three check names. That is
  exactly the shape that takes a witness down at merge time and at no other
  moment.
* Containment checked before merging: `git merge-base --is-ancestor
  handoff/… integration` → **NOT MERGED**, so nothing bypassed me.
* `git diff --name-status` shows every new file as `A`. Nothing overwrote an
  earlier run's lesson or report; this handoff has run once.
* All twelve committed screenshots are `A` and their pixel heights reproduce
  the lesson's table to ±1 px (m1 10634/4826, m2 10805/4997, tan_link
  5729/4274 against the lesson's 10,633/4,825, 10,805/4,997, 5,728/4,273;
  the m1 "one card" clip is 393 px, as stated; the m1 results table is 923 px,
  as stated).

## Test cadence

**The benefit of the doubt was void, so I ran the full suite on both sides of
the merge.** The tactical report (the lesson) records the three commands under
"Running the tiers and the probe from this worktree" and **no result counts
for any of them**, and it never mentions the `venv-win` pytest run the
definition of done names. Per the canonical cadence that is the "records no
full-suite run at all" case.

All three runs in this review worktree, `--repo` pointed at the main
checkout's `data/`, `node_modules` junctioned in.

| | pre-merge (`integration` @ `9f19647`) | + the handoff | + `integration` @ `8959a2a` (the tree that ships) |
|---|---|---|---|
| `venv-win … -m pytest -q` | **1 failed, 1208 passed** | **1 failed, 1208 passed** | **1 failed, 1209 passed** |
| `node apps/viewer/run_tests.cjs --repo …` | **501/501** | **513/513** | **513/513** |
| `node scripts/run_viewer_browser_tests.mjs --repo …` | **25/25**, typography 9/9 | **23/25** (two flakes, both green on isolated re-run), typography **11/11** | **25/25**, typography **11/11** |
| `node scripts/run_mutation_witness_tests.mjs --repo …` | 108/108 (the sibling review's, not mine) | — | see below |
| `pytest -q` risky subset | — | **57 passed** | — |
| doc/prose guards after my own edits | — | **209 passed** | — |

The one pytest failure is the same in every column and is the by-design
worktree one: `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
fails because `data/projections/viewer/` is gitignored and absent here; the
tier it stands in for is the 513/513 row, run through `--repo`. 1208 → 1208
across the handoff is right — it adds no Python tests — and 1208 → 1209 is
the sibling's new pairing test.

**Risky subset, pre-merge**, from the overlay's mapping (`apps/viewer/` ∪ a CSS
rule ∪ `scripts/run_viewer_browser_tests.mjs` ∪ a guard's anchors):
`pytest -q tests/test_js_python_vocabulary.py tests/test_viewer_readme_doc_facts.py
tests/test_viewer_deep_link_contract.py tests/test_app_type_scale.py
tests/test_mutation_witnesses.py` → **57 passed**, plus the fast tier through
`--repo` and the full browser tier. `tests/test_viewer_js_suite.py` is in that
row too and is the known red above.

**The two browser-tier reds in the middle column were flakes**, and the
machine says why: five concurrent sessions were driving Chrome at the time
(two drawing-checker worktrees, the sibling tolstack review, a dispatch
worktree, and this one), and that run took ~35 minutes against a ~12-minute
baseline. Re-run alone, `--only "suite "` was **406/406 + 406/406** and
`--only "crop lightbox"` **20/20**; the crop-lightbox red was
`the launcher takes keyboard focus and becomes visible when it does`, a
pre-existing suite this diff does not touch. The right-hand column is the
clean full run on the tree that ships, and it supersedes both.

`node_modules` was junctioned in from the main checkout for the browser and
mutation tiers and **is removed** (see the end of this report).

## Mutation-witness tier

Recorded at the end of this report rather than here, because it is the last
thing this session ran and the number in this file has to be the one that was
actually measured on the tree that ships.

## The mandatory checks (1–7)

This is a **rendering** change. It touches `apps/viewer/views/stack.js`,
`apps/viewer/style.css`, `apps/viewer/tests.js`,
`scripts/run_viewer_browser_tests.mjs`, `apps/viewer/README.md` and one new
hand-run probe. It changes **no** stack file, no `hardware_entries.json`, no
`materials.json`, no projection input and no number. Each mandatory check,
explicitly:

1. **Every tolerance traces to a spec or drawing callout** — N/A, no element
   value was added, moved or re-cited. `git diff --stat integration...HEAD`
   touches nothing under `docs/tolerance_stacks/`, `docs/topologies/` or
   `data/`. No invented number is possible here because no number is authored;
   every figure the page prints comes out of `results.json` through `VA.fmt`,
   which is `String(n)`.
2. **Signs on every path term** — N/A for authoring, and **verified for
   rendering**: `termsLine()` is the old `checkCard`'s term loop moved verbatim
   into the fold, still through `VA.termLabel` / `VA.termTitle`, still
   colouring by `findDerived(...).confidence` and still marking a non-unity
   `coefficient` with `chip--weighted`. Paths now render their term list too,
   which they did **not** before — strictly more of the repo's central safety
   property, not less.
3. **LMC/MMC direction** — N/A; `fold()` untouched, and nothing new reads
   `lmc`/`mmc`.
4. **RSS actually computed** — PASS, and improved. All five numbers
   (`nominal`, `worst_case_min`, `worst_case_max`, `rss_center`, `rss_half`)
   are now columns on every row, for paths as well as checks; the old card
   printed `worst case` and `RSS` as two composite strings. No verdict reads
   RSS (`checkRow` prints `check.verdict` and computes nothing). The "RSS is a
   relative softening indicator, not a probability statement" caveat survived
   the deletion of `pathsSection` and now sits **under the one table it is
   about** rather than under the Paths table only — which is the first time it
   has been beside the checks' RSS columns at all.
5. **Nominal inside min/max** — N/A, no transcription.
6. **Quantised cotter/castellation constraint stated next to the numbers** —
   PASS and unmoved: that caveat lives in the worksheet and in the budget
   scope's `excluded_terms`, and the **excluded terms did not fold**. This was
   the one thing I most expected a "fold the prose" pass to get wrong, and the
   author got it right on purpose and said why in three places: the term names
   stay on the row (`excludedLine`, never in the record), split only at the
   author's own ` -- `, with the whole string on the row's `title` and again in
   the fold. `[real] the pitch-link stack renders one budget and one
   joint-scope check` still reads `MS9363-09` off the closed row.
7. **Traced / inferred / untraced ratio** — re-derived by me with
   `venv-win/Scripts/python.exe tests/debug_report_tolerance_stacks.py --ratio`
   on the merged tree, not copied:

   > **5 traced / 12 inferred / 9 untraced, out of 26 element instances** across
   > the three seeded slice-1 stacks; **30 traced / 16 inferred / 15 untraced,
   > out of 61 element instances** across all seven.

   Unchanged by this diff, as it must be.

## Also verified

* **No second combiner in JS.** `grep` over the whole new region for
  `toFixed`, `parseFloat`, `Number(`, and arithmetic on a projection field:
  nothing. The only arithmetic added is `resultTableWidth()`, a sum of CSS
  pixel column widths — the popover-clamp class, never printed, never compared
  to a tolerance, never rounded into a display string.
* **Field vocabularies are module-level constants**, not inline literals:
  `RESULT_COLUMNS`, `INTERVAL_KEYS`, `LOWER_BOUND_KEYS`, `RESULT_GROUPS`,
  `SENSITIVITY_TITLE`, `SHUT_MARK`/`OPEN_MARK`. `INTERVAL_KEYS` is the same
  hand-copy of `Interval.to_dict()`'s keys the old `pathsSection` carried
  inline, now named — an improvement, not new drift.
* **Deliverable 2 (the record's own words) is guarded at the value level and
  over live data.** `[real] no live check's authored prose is edited by the
  page` walks all seven live stacks, asserts every `guidance` string present in
  full behind its fold and absent from the row, asserts every `excluded_terms`
  string present whole, and carries a non-vacuity bound (`folded > 40`; it is
  51 today). Printing the guidance on the row as well takes the fast tier to
  511/513 with that check and the `[real]` walk both red — measured.
* **`VA.splitAuthoredFinding` is applied to the bucket it was scoped to.** All
  **19** live `excluded_terms` split on ` -- ` and none on an em dash, so
  `ISSUE_20260922_the_authored_split_regex_still_cuts_at_an_em_dash_…` gains a
  second consumer and no live defect. Worth knowing for whoever closes it: the
  splitter's blast radius is now two pages, not one.
* **`data/inbox/specs/` untouched, `docs/reference/` untouched, nothing
  written into drawing-checker** — the diff contains no path under any of them.
* **The previous two reviews' deferred findings**, re-checked against this
  diff: `REVIEW_20260922_viewer_summary_balance_sheet`'s item 6 (the `>= `
  operator glyph in a criterion cell) is reproduced here deliberately and for
  the same stated reason, which is the settled answer, not a drift;
  `REVIEW_20260922_stack_page_alert_marks_and_drawn_glyph`'s item 6 (alert
  words living in `title`/`aria-label` on a role-less element) is the standing
  a11y thread and this diff adds one more instance of the pattern (see nits).
* **The design read.** Hierarchy comes from size, weight and spacing; the
  corner belt is `--t-meta` under a body-size name; numbers are right-aligned
  tabular mono; the criterion is deliberately muted and **not** right-aligned
  beside them, with the reason written down; group rows separate with
  whitespace and no rule; `.rs-toggle` is muted until hover or open; a row with
  no corner chips renders no meta line at all, and a stack with one kind of row
  renders no group rows at all. Emphasis is a budget — a verdict chip and a
  confidence chip, and the budget/sensitivity marks are a 3 px spine rather
  than a fourth coloured thing. I have no design issue to file.

---

# Findings

## Should-fix (3, all filed, none blocking)

### 1. The geometry the layout rests on is unwitnessed, and the browser check named for it cannot fail on it

`ISSUE_20260923_the_results_tables_column_geometry_is_unwitnessed_and_its_alignment_check_cannot_fail_on_it.md`

The lesson, `views/stack.js`, `style.css` and `apps/viewer/README.md` all argue
for four geometry mechanisms, and step 3b of the browser tier is named for the
claim. I reverted each one in a `git archive` scratch tree and ran both tiers.
**Baseline 513/513 fast, 11/11 browser.**

| revert | fast | browser |
|---|---|---|
| `.restable` loses `table-layout: fixed` | 513/513 | **11/11** |
| `table.style.minWidth = resultTableWidth()` dropped | 513/513 | **11/11** |
| `.restable thead th:first-child`'s transparent 3 px spine dropped | 513/513 | **11/11** |
| `display: flex` put back on the name `<td>` | 513/513 | **11/11** |
| `.rs-row td:first-child` given a **20 px** left border against the header's 3 px | 513/513 | **11/11** |
| `table.appendChild(resultColgroup())` dropped | 513/513 | **10/11** — reddens *"no result row is taller than a name and its corner chips"* |
| `resultName` loses its `title` | 513/513 | **11/11** |

The reason is structural. The sub-check compares
`td.getBoundingClientRect().x` against `th.getBoundingClientRect().x` **inside
one `<table>`** — and a data cell and its header share a column grid by
construction, in fixed layout and in auto layout alike; `border-collapse:
collapse` draws a border straddling the cell edge without moving the box. The
two operands are one number read twice. All it can still catch is a row with
the wrong *number* of cells, which the fast tier already asserts.

The **value** half of the same sub-check — each printed number compared against
`results.json` — is real, is the shape to copy, and is why this is a should-fix
and not a blocker.

Two consequences, both handled:

* the lesson's *"the new browser check measured it — 128 of 144 cells off
  their header's left edge"* was true of a tree that had no `<colgroup>` yet
  and is false of the one that shipped. Corrected in the lesson (inline);
* the author's own witness issue proposes **exactly these two green reverts**
  as its top two candidate rows. Declaring them would have produced two
  guaranteed `NOT WITNESSED` entries, which the overlay says is worse than no
  row. The measured replay of all six candidates is appended to that issue
  (four reproduce, two do not).

### 2. `unitsNote` renders `.chip--alert`, a rule the previous day's handoff retired

`ISSUE_20260923_the_units_mismatch_chip_on_a_result_row_asks_for_a_css_rule_that_was_retired.md`

`views/stack.js`'s `unitsNote()` is the guard that stops a number appearing
under a column header that is wrong for it — the one trade deliverable 4 rules
out. It renders `VA.chip("chip--alert", "units: " + check.units, …)`, and
**there is no `.chip--alert` declaration in either stylesheet**:
`stack_page_alert_marks_and_drawn_glyph` (this handoff's own `depends_on`)
retired it on 2026-09-22. `grep -rn chip--alert apps/viewer/` returns nine
hits — eight comments in the past tense plus this one call — and not one of
them is a declaration, which is exactly what makes the name look alive. So the
one mark that would say "this column is mislabelled
for this row" renders as a neutral chip beside the `chain` / `stage` /
`temperature` chips on the same line.

Unreachable today (every live check and stack is `mm`), which is why it is
`low` and why the fast tier's synthetic case asserts the text and not the
treatment. Filed rather than fixed because the right mark is a design call —
the 2026-09-22 pass decided an alert is a drawn `VA.alertBadge`, not a
re-added chip rule, and putting a drawn badge on a row that already carries
four chips is a layout question.

### 3. Step 3b aborts its suite instead of naming the defect it exists for

`ISSUE_20260923_the_results_table_browser_check_aborts_its_suite_instead_of_naming_the_defect_it_exists_for.md`

Inside `page.evaluate`, `readAt(rows[i], …)` indexes DOM rows by the
projection's check index. Planting `checks.slice(0, -1)` in `resultsSection` —
the regression the surrounding `columns.rows === 16` assertion exists for:

```
[typography pass's visual rules (live stack view)] ABORTED after 5 sub-checks, 0 of them already FAILED
[typography pass's visual rules (live stack view)] ERROR: page.evaluate: TypeError:
    Cannot read properties of undefined (reading 'querySelectorAll')
```

The declared check never prints and the **six** sub-checks after it never run.
Two siblings of the same shape in the same block: `column(label)` returns `-1`
on a renamed header, and `proj.stacks.filter(…)[0]` is `undefined` if the stack
leaves the projection.

Not a coverage hole — the fast tier catches the same mutation loudly and by
name (496/513, with `[real] a stack's checks are bounded by their row count…`
among the reds) — which is why it is `low`. It is a reporting defect, and this
repo has measured what those cost.

## Fixed inline (7, none of them behaviour)

Committed as `3fb39e4`. Every one is a sentence the diff's own rename or its
own arithmetic falsified.

1. **`views/stack.js` rendered `"(ΔT is on each check card)"` to a reader**, in
   `materialsSection`'s intro paragraph, on a page whose check cards this same
   commit deleted. The author found and fixed the README's twin of that
   sentence (`with the ΔT on the check's own row`) and missed the one the app
   prints. Its comment twin twenty lines up, likewise. → `check's own row`.
2. **Two comments claimed a result's full label is "whole again in the fold".**
   It is not: `checkRecord` carries the id, the excluded terms, the zero-width
   sentence, the term list, the configuration block and the guidance, and does
   **not** repeat the label. The `title` hover is the only reading of the
   clamped ~130-character tail the page offers. Comments corrected to say so;
   the README's own list of the fold's contents was already right.
3. **Three counts, re-derived against
   `data/projections/viewer/results.json`** and corrected in `views/stack.js`
   and `apps/viewer/README.md`, with a dated correction blockquote in the
   lesson:
   * *"sixteen checks of three terms each"* → **2, 3 or 4** (8 fold 3, 6 fold
     4, the two `k 0` probes fold 2);
   * *"the same guidance paragraph six, six and four times"* → **four** distinct
     paragraphs, **6 / 6 / 2 / 2** (the four probes carry two different
     paragraphs, one per stiffness ratio);
   * *"every one of M1's sixteen reads `LOWER bearing seat, M1 (hub bore
     202.140 …` for its first forty characters"* → **four** distinct
     forty-character openings (6 `LOWER … 202.140`, 6 `UPPER … 132.073`, and the
     four probes behind a `[SENSITIVITY] ` prefix; the common prefix across all
     sixteen is the empty string). The argument survives in each case, which is
     what makes this class survive review.
4. **"the only live stack with both [checks and paths]"** — **five** of the
   seven live stacks have both and therefore render group rows:
   `pitch_link_to_pitch_plate` 2/3, `rotor_fastener_length` 9/1,
   `tan_link_to_pitch_plate` 6/3, `tan_link_to_pitch_plate_take2` 1/1,
   `vpa_output_to_pitch_plate` 1/1. Only the two thermal fits have checks and
   no paths. This one mattered enough to correct in the **issue** as well as the
   lesson: it is the sentence telling Jeff which page to read question 1 on, and
   his answer settles the shape of five pages rather than one.
5. **`apps/viewer/README.md`'s "Reading the colours" legend** still described a
   *striped card* for a budget scope ("the missing terms are printed on the
   card, directly under the numbers") and a *dashed card* for a sensitivity
   probe. Both are a 3 px spine on a row now, and the terms are in the name
   cell. Rewritten with the 2026-09-22 change dated in each row.
6. **`apps/viewer/style.css`'s `.fold-row__label code` and `.fold-note td`**
   lost their only producer when `pathsSection`/`foldNote` went. Replaced with
   a note saying where they went and that `tests/debug_stack_check_table.mjs`'s
   remaining references are to the *old* tree, deliberately.
7. **`views/stack.js`'s own file header** still opened "elements, paths,
   checks, gaps, notes" and still said "a budget-scope check gets a **striped
   header**". Both are the retired card. The section list is
   elements / materials / results / gaps / notes, and the budget mark is an
   amber spine on the row; the sentence now dates the change.

I re-ran the doc guards (209 passed) and the fast tier (513/513) after these
edits, and re-grepped the branch for each superseded literal — the only
survivors are inside the correction blockquotes.

## Nits

* **The results screenshots do not show the column headers.** Both
  `*_results_after.png` clips start at the CHECKS group row, because an element
  screenshot of `table.restable` is overlapped by the sticky topbar. The
  pictures are the deliverable's evidence that "the numbers are in columns" and
  the column names are the half you cannot see. Not worth a re-take on its own;
  worth knowing before quoting them.
* **`tests/debug_stack_check_table.mjs` prints `pathRows` from
  `tr.fold-row`**, which is the *old* Paths table's class, so the after-phase
  line always reads `0 fold rows` while the new fold rows are `tr.rs-fold`. It
  is a two-phase probe and the field is the before-phase's, but the label reads
  as a fact about the phase that printed it. The same file's comment beside
  `elementShot` says the before phase "shoots the **first two** of them";
  `elementShot` calls `.first()` and the committed `*_results_before.png` is
  one card (393 px), which the lesson itself describes correctly.
* **The disclosure `<button>`'s accessible name is the glyph `▸` plus a
  `title`.** It carries `aria-expanded` correctly and the comment explains why
  it is text rather than a CSS marker. This is the same
  attribute-carries-the-words pattern
  `ISSUE_20260914_absorbing_the_native_title_leaves_a_focusable_mark_with_no_accessible_name.md`
  (`status: triaged`, `audience: strategy`) already owns for four surfaces;
  this is a fifth. Recorded rather than re-filed — re-filing is the
  duplicate-filing shape.
* **Nothing pairs the new README section's measurements to anything.** 10,633 /
  4,825 / 1,850 / 1,240 / 1,060 / 702 / "47-word" are all prose in a document
  `tests/test_viewer_readme_doc_facts.py` scans with two regexes that do not
  reach them. I re-derived every one of them (the probe measures the table at
  **1242 px** in a **702 px** scrollport, and `RESULT_COLUMNS` sums to exactly
  1240) and they are all right today. The class is already filed
  (`ISSUE_20260922_the_viewer_readme_states_a_live_nav_tally_that_only_a_label_prints`).
* **Fourteen open "no mutation-witness entry" issues.** The author's new one is
  the fifteenth filing of the shape; the two immediately before it are already
  `status: triaged` onto
  `docs/sessions/HANDOFF_20260922_mutation_witness_repair_and_enrollment.md`,
  which has a live review worktree right now. I cross-referenced the new one
  into that stream rather than letting triage treat it as independent, and I
  did **not** touch `scripts/mutation_witnesses.json` myself, because that
  sibling session owns the file at this moment.

## What I checked and did not find

Written down because "not mentioned" is not "checked", and three of these are
where I expected the finding to be:

* **The chips overflowing the verdict column.** The CSS comment says `nowrap`
  put `NOT A RESULT` on top of the criterion column on all four of M1's
  sensitivity probes and that `flex-wrap: wrap` fixed it. I read the committed
  screenshot as showing the overlap still happening and was wrong: measured at
  1600 px and at 2200 px, **no descendant of any cell paints past its own cell
  box**, and the two chips are on two lines (`fail` at y2449, `NOT A RESULT` at
  y2474, both inside a verdict cell spanning 802..926). The fix works.
* **A deep link to a check id.** None exists — nothing sets an `id` or
  `data-*` on a check row and `tests/test_viewer_deep_link_contract.py` names
  no check param — so moving `check_id` into the fold breaks no anchor. The
  `scroll-margin-top` rule was correctly re-pointed from `.check` to `.rs-row`.
* **Group rows on a paths-only stack.** `grouped` requires both kinds, so a
  stack with paths and no checks would render ungrouped `—` rows under a
  "no checks" paragraph with nothing explaining the dashes. No live stack is in
  that state (all seven have checks), so it is unreachable; noting it because
  the code comment explains only the checks-and-no-paths half.
* **`rs-fold` indexing.** Every test that indexes `all(root, "tr.rs-fold")[i]`
  by check index is correct, because `resultsSection` emits all check rows
  before any path row and each result emits exactly one fold — and the `[real]`
  walk asserts `rows.length === checks.length` before it indexes.
* **The four behavioural mutations the author's issue proposes** all reproduce
  cleanly and should be declared: guidance on the row → 511/513; `excludedLine`
  printing `.whole` → 512/513; a path's verdict/criterion blank → 512/513; a
  fold starting open → 511/513. Each reddens the check named for it.

---

## Verdict: APPROVE

Merged into `integration`. No blocker; three should-fixes filed so they outlive
the handoff; six inline fixes committed and disclosed above; the repo's review
overlay gained two new entries (the same-table geometry check, and a handoff
reaching for the class the previous day's handoff retired) plus a second
sighting of the README-describes-the-old-string entry pointed the other way.

## Mutation-witness tier result

`node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack`, on
the tree that ships (this handoff **plus** `integration` @ `8959a2a`),
`node_modules` junctioned in:

> **108/108 declared mutations witnessed**, `EXIT=0`.

**No drop.** That is the number that mattered in this review rather than a
ritual: `mutation_witness_repair_and_enrollment`'s own review measured
108/108 on an `integration` that did **not** carry this handoff, and this
handoff deletes `article.check`, `.check__head`, `.check__numbers`,
`.check__corner`, `.check__id` and `.check__label` and rewords three check
names — the shape that takes a witness down at the review merge and at no
other point in the lifecycle, because neither branch can see it alone. Both
halves were run, as the overlay requires: `pytest -q
tests/test_mutation_witnesses.py` (inside the 1209) for the anchors, and the
tier itself for the mutations.

The one entry that could plausibly have rotted is
`prose-is-capped-at-the-measure`, whose `find` is the tail of the very
`max-width: var(--measure)` selector list this handoff edited (it inserted
`.check__excludedterm` into it). The `find` is still a contiguous substring,
the `replace` still empties the whole rule's declaration block, and the
guidance it measures is now behind a fold the browser check opens first —
witnessed.

I did **not** edit `scripts/mutation_witnesses.json` myself. The sibling
session owned that file for most of this review, and the four candidate rows
that do reproduce belong with the enrollment stream (see the replay appended
to the author's issue), not to a reviewer reaching into a file another
session was holding.

## The merge

`integration` `8959a2a` → **`0ccd1ab`**, a fast-forward of
`review/stack_page_check_card_balance_sheet` (which already contained
`integration`, checked with `git merge-base --is-ancestor` rather than sha
equality). Containment of the handoff in `integration` re-checked after the
merge: contained. Pushed to `origin/integration`. **Trunk not touched** —
`master` is still `35991da` and moves only on the operator's batch merge.

Both `handoff/…` and `review/…` refused deletion because their worktrees still
hold them, which is expected; dispatch removes the worktrees at Complete.

## Housekeeping

The `node_modules` directory junction created in this worktree for the browser
and mutation tiers has been removed, and so have the three throwaway probes
under the gitignored `tmp/`.
