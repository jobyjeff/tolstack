---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_traced_ratio_guard_freshness.md
reviewer: agent (review/traced_ratio_guard_freshness)
date: 2026-08-17
verdict: APPROVE
blockers: 0
---

# Review 2026-08-17 — traced_ratio_guard_freshness

Branch reviewed: `handoff/traced_ratio_guard_freshness` (2 commits, `4a196f5`
`d68c72e`), merged into `review/traced_ratio_guard_freshness` off `master`
`aa40a44`. Five files: `tests/test_tolerance_stack.py`, `PROVENANCE.md`,
`docs/SOP_TOLERANCE_STACK.md`, the source issue, and a new lesson.

**The work under review is not a tolerance stack.** No stack file, no element, no
band, no check and no worksheet changed — `git diff --name-status` over the whole
branch touches no `docs/tolerance_stacks/*`. The seven mandatory checks are
answered below anyway, because "not mentioned" is not "checked", but most of them
exit on that fact rather than on inspection, and the review's weight is in the
universal check (*has this guard been observed failing?*) and the overlay's
doc-scan-guard entries.

## The seven mandatory checks

1. **Every tolerance traces to a specification or drawing callout** — **N/A, and
   verified N/A.** No `source_ref`, no `confidence`, no `export`, no element value
   is added, removed or altered anywhere on the branch. Nothing to audit, and no
   number in the diff is a tolerance.
2. **Signs on every path term** — **N/A.** No path, check or term changed.
3. **LMC/MMC direction** — **N/A.** No element carries a changed `lmc`/`mmc`, and
   `fold()` is untouched.
4. **RSS actually computed** — **N/A.** No check or worksheet result changed.
5. **Nominal inside its own min/max** — **N/A.** No transcribed value changed.
6. **Quantised constraints (cotter/castellation)** — **N/A.** No joint, no
   hardware, no worksheet conclusion changed.
7. **The traced / inferred / untraced ratio** — **re-derived, and this is the one
   mandatory check with real content here, because the ratio is the branch's
   subject.** Computed by me with
   `venv-win\Scripts\python.exe tests\debug_report_tolerance_stacks.py --ratio`:

   > **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across
   > the three seeded slice-1 stacks; **21 traced / 7 inferred / 20 untraced, out
   > of 48** across all six.

   Unchanged by this branch, as it must be — the work changes only what may be
   *written* about the figure, never the figure. Every `untraced` value's gap
   listing is inherited unchanged and was not re-opened.

## The universal check: has this guard been observed failing?

This is a guard-only handoff, so this check *is* the review. Ten probes, all run
by me on the merged tree, not read out of the lesson.

**Pre-work baseline first.** On `master` (before merging), a bare
`the seeded stacks trace 3 of 26 element instances` appended to `ARCHITECTURE.md`
left `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
**green** — the defect the handoff was filed against, reproduced.

| probe (appended to `ARCHITECTURE.md`, then reverted) | expected | got |
|---|---|---|
| bare `3 of 26` claim | red | **red**, `ARCHITECTURE.md:445: 3 of 26` |
| same sentence as a `>` blockquote | green | **green** |
| same sentence inside double quotes | green | **green** |
| `1 traced out of 17` (older figure, wordy form) | red | **red**, names the figure |
| `3 traced / 7 inferred / 16 untraced, out of 26` | red | **red** |
| `5 traced / 3 inferred / 18 untraced, out of 26` (**current**) | green | **red** → see F1 |

The `missing` half was probed separately (rewrite `5 of 26` in `ARCHITECTURE.md`)
and fails with the new message that tells the next ratio-moving handoff to append
the figure it retires — which is the genuinely good idea in this branch: the only
handoff that can be prompted at the right moment is the one that breaks that half,
and it now is.

**Mutation probes** (each reverted):

- Blanking the double-quote half of `_quoted_spans()` turns **three** tests red,
  including `test_the_traced_ratio_guard_can_fail` and the sibling hardware-count
  guard. The shared exemption is load-bearing in both directions.
- Removing either entry from `_RETIRED_TRACED_RATIOS` turns the can-fail test red.
- Restoring the old wildcard pattern turns my added assertion red (see F1).

And one unstaged demonstration worth more than the staged ones: writing this
review's new overlay entry into `docs/prompts/REVIEW_AGENT.md` **failed the suite**,
naming `docs/prompts/REVIEW_AGENT.md:1122`, because the entry stated the retired
figure bare. The guard caught its own reviewer on the first live sentence written
after the merge.

## Findings

### F1 — should-fix, **fixed inline**: the pattern flagged the *current* figure

`tests/test_tolerance_stack.py`, `_retired_ratio_pattern`.

`\b{traced}\b[^.\n]{0,40}?\bof\s+{instances}\b` anchors on the first number and
then wildcards up to 40 characters to the denominator. That span reaches straight
across the repo's own long form — *N traced / M inferred / K untraced, out of T
element instances*, the shape **this repo's review checklist asks every report to
state** — and matches on the **inferred** column:

```
retired_traced_ratio_claims("5 traced / 3 inferred / 18 untraced, out of 26 element instances")
  -> [('3 of 26', 11)]
```

The *current, correct* seeded figure written long is reported as the retired
`"3 of 26"`. Nothing live trips it today, which is why the suite was green — but
the shape is prescribed, so the next author who writes the current ratio out long
in a worksheet, `ARCHITECTURE.md` or the SOP gets a red suite blaming a retired
figure that is not there, and the obvious repair is to delete a correct number.
A guard that fires on the value it protects is worse than one that misses.

**Fixed inline** (`2d6fae2`): the wildcard is reachable only behind the literal
word `traced`, so the numerator must be the traced column —

```python
rf"\b{traced}\s+of\s+{instances}\b"
rf"|\b{traced}\s+traced\b[^.\n]{{0,40}}?\bof\s+{instances}\b"
```

Every positive case still fires, including the retired figure in that same long
form (verified: probe table above, rows 1, 4 and 5). Two assertions added to
`test_the_traced_ratio_guard_can_fail`, the negative one built by iterating
`_RETIRED_TRACED_RATIOS` and planting each retired numerator in the *inferred*
slot, so it can neither go vacuous nor go stale as that list grows. Confirmed to
bite: restoring the old pattern fails it with `AssertionError: 1 of 17`.

### F2 — should-fix, **fixed inline**: the lesson's window argument is wrong in both halves

`LESSONS_20260817_traced_ratio_guard_freshness.md`, *"Decisions not in the
handoff"*, claimed the long form `3 traced / 7 inferred / 16 untraced out of 26`
*"(35+ chars … appears only in `docs/issues/` and `docs/reference/`, both out of
scope) does not reach"*. The gap is **39** characters, so it reached; and the
shape also appears in `docs/sessions/reviews/` and `PROVENANCE.md`. Neither error
is harmful on its own — but the sentence is the argument a future author will use
to widen or narrow the window, and it never considered the direction that
actually mattered (F1). Replaced with a dated correction block stating what the
pattern now does, plus the durable line: reason about a scanner's false positives
by **feeding it the strings the repo actually writes** — the long form was three
lines above in this very lesson — not by counting characters.

### F3 — should-fix, **fixed inline**: `PROVENANCE.md` says two tests were added; one was

The 2026-08-17 amendment on the `tests/test_tolerance_stack.py` row opened
*"**two tests added, none removed**"*. Collected item counts: `d0af0a6` (the
branch's merge-base) **122**, `aa40a44` (`master`) **122**, merged **123** — and a
name-level diff of the collected node ids returns exactly one addition,
`test_the_traced_ratio_guard_can_fail`, and no removals. The row's own prose then
enumerates *"Added `test_the_traced_ratio_guard_can_fail` … and
`_current_traced_ratio()`"* — the second is a helper, counted as a test in the
summary clause. Corrected to "one test added". This is the repo's oldest recurring
class landing in a provenance row, where a false claim is the worst kind here.

### F4 — nit, **fixed inline**: two counts of `3 of 26` that count different nouns

Re-derived over the eight documents in the scan's `live_docs` list, at the
pre-work commit: **8 occurrences across 7 documents**, exactly **1** of them bare
(`docs/SOP_TOLERANCE_STACK.md:96`, which the handoff correctly found and quoted).

- the lesson said *"Every other live occurrence … (six of them, in
  `ARCHITECTURE.md`, the four worksheets and `data/inbox/specs/README.md`)"* —
  seven other occurrences, in six documents;
  `WORKSHEET_pitch_link_to_pitch_plate.md` states it twice.
- `PROVENANCE.md` said *"still written in six live documents"* — seven.

Both corrected, the lesson's with a dated block. The digit was right for one noun
and used for the other, which is this overlay's *"one number, two nouns"* entry.

### F5 — nit, no change: the retired list is hand-kept

`_RETIRED_TRACED_RATIOS` is a manual list, and the branch is honest about it: the
lesson argues (correctly, I think) that deriving it would mean reading git history
to decide what prose may say, and the omission risk is answered by the `missing`
half's new failure message plus the `current not in retired` inverse check. I
looked for a cheaper derivation and did not find one either. Recorded so the next
reviewer does not re-litigate it.

## Also verified

- **Tests, both checkouts.** `C:\workspace\tolstack\venv-win\Scripts\python.exe -m
  pytest -q`: **438 passed, 1 skipped** in this review worktree (merged tree +
  the inline fixes); the one skip is `test_viewer_js_suite`'s node-fs tier, which
  needs a populated `data/`. The main-checkout count is recorded in the merge
  commit that follows this report. The handoff branch alone reproduces the
  lesson's **434 passed, 1 skipped** exactly, and `tests/test_tolerance_stack.py`
  collects **123**, also as the lesson states — both numbers re-derived, both
  correct *for the branch*, and the shipping tree is four higher because
  `material_cte_optional` landed on `master` in the meantime. The lesson says
  which checkout and which branch produced its number, which is what the
  `hardware_counts_doc_guard` review asked for.
- **A sibling handoff landed while this one waited.** `git log --oneline
  HEAD..master` is empty at merge time; `master` had moved from `d0af0a6` to
  `aa40a44` (`material_cte_optional`) since the branch was cut. No conflict, no
  test interaction, and the only visible effect is the suite delta above.
- **The DoD grep.** Over the eight live documents, `3 of 26|1 of 17|out of 17|out
  of 26` returns **17 lines**; every one is a blockquote line, a double-quoted
  phrase, or the current figure written long
  (`WORKSHEET_pitch_link_to_pitch_plate.md:464`, *5 traced out of 26*). Matches
  the lesson's claim exactly.
- **The SOP edit.** `docs/SOP_TOLERANCE_STACK.md` gains two sentences saying a
  retired figure may appear as a quotation, immediately above the sentence that
  needs the exemption — *next to the numbers*, not in a gaps section — and the
  live sentence's own figure is now `` `"3 of 26"` ``. Ugly, and correctly so; the
  added prose explains why, which is what stops the next editor "tidying" the
  quotes and reddening the suite for a reason the file does not state.
- **Doc-scan blind spot, deliberately left.** The `asserted_stale` half still
  walks the curated `live_docs` list rather than `live_documents()`, so a retired
  ratio in a document nobody enumerated is still invisible — the exact way
  `1 of 17` reached eleven files. The lesson names this, argues it needs its own
  handoff (the `missing` half genuinely needs a curated list; the stale half does
  not), and does not do it. I agree with the split and with not doing it here.
  Not filed as an issue because the lesson's follow-up section already carries it.
- **`_quoted_spans()` was moved, not copied.** Verified by diff: the function body
  is byte-identical, relocated above the first of its two callers; the deleted
  copy at the old site is the same text. No second notion of "quoted" survives in
  the file.
- **Schema / stack hygiene, `data/inbox/specs/`, `docs/reference/`,
  drawing-checker.** Untouched by the branch — `git diff --name-status` lists five
  files, none under `data/`, `docs/reference/`, `docs/tolerance_stacks/` or the
  package. Nothing was written into drawing-checker: no run was executed by this
  session, and a before/after listing of its `data/runs/` and `data/inbox/` over
  the review is identical.
- **Test I/O does not pollute `data/`.** A file+size listing of the main
  checkout's `data/` (115 entries) is identical before and after the post-merge
  suite run.
- **`forge` conventions check**: clean in **both** checkouts — no problems in the
  worktree, no problems in `C:\workspace\tolstack` (the worktree run carries only
  the standard "linked worktree, data/ rule passes vacuously" warning).
- **Diff hygiene.** No `{{REPO_NAME}}`, no `</invoke>` / `</content>` /
  `<parameter` leakage; `git diff -w --stat` matches the un-`-w` stat, so no file
  was silently re-emitted; the created lesson's last lines are prose.
- **Harness note, no finding.** The main checkout carries two *unrelated*
  uncommitted edits (`apps/viewer/viewer.js` and one `docs/issues/` file) plus the
  standard untracked `.dispatch.toml`. Neither blocks the merge and neither was
  touched, stashed or committed. No `.backup`/`.orig` sibling exists beside them,
  so the stale-editor signature is absent.

## Notes for the next reviewer

- The overlay gained one entry under **Recurring bugs**: *a doc-scan guard's false
  positive — feed it the shapes this repo actually writes*. It is the mirror of
  every other entry in that section, which all ask what a scanner cannot see. F1
  is its first sighting. Nothing was pruned; nothing in the list cried wolf here.
- **`docs/prompts/REVIEW_AGENT.md` is one of the eight documents this guard
  reads.** Writing an overlay entry that states a retired ratio will redden your
  own suite. Quote the figure. This paragraph is not hypothetical.
- The board: this handoff's file moves `active/` → `completed/` with the merge.
  `HANDOFF_20260812_material_cte_optional.md` is still in `active/` although its
  work is on `master` (`e27f540`) — flagged, not touched, in case that review is
  still open.

**Verdict: APPROVE.** No blockers. Five findings, four fixed inline on the review
branch (F1–F4) and one recorded (F5). The deliverable does what the handoff asked,
the guard has been watched failing on six shapes and on one real unstaged sentence,
and the one defect it shipped with — firing on the current figure — is the class
this repo cares most about, caught by probing rather than by reading.
