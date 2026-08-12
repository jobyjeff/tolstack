---
type: review
handoff: HANDOFF_20260812_hardware_counts_doc_guard.md
reviewer: review agent (dispatch)
date: 2026-08-12
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-08-12 — hardware_counts_doc_guard

Branch `handoff/hardware_counts_doc_guard` (2 commits) merged into
`review/hardware_counts_doc_guard` off `master` `6739b33`. `git log --oneline
HEAD..master` was **empty** at merge time — no sibling landed during the review
(the three parallel handoffs named in the handoff own `apps/viewer/` and
`tolerance_stack/spec_library.py`; neither is touched here).

Diff: 5 files — `PROVENANCE.md`, `docs/tolerance_stacks/README.md`,
`tests/test_tolerance_stack.py` (+246), one lesson, one filed issue. No stack
JSON, no `data/`, no `tolerance_stack/` package file, no `apps/`, no
`docs/reference/`.

## What I verified

- **The guard is not vacuous.** Dumped every claim it actually recounts on the
  clean merged tree: **8 live claims** across two documents
  (`hardware_entries.json` `[description]` ×5, `[entries[4].library_ref_note]`
  ×3). A shape-matching scan that matches nothing is the failure mode here, and
  this one matches.
- **It fails, and names the document.** Two demonstrations of my own, beyond the
  author's:
  1. flipped one `values_source.kind` from `workbook` to `spec` → failed naming
     `hardware_entries.json [description]: says 5 … has 4`, `says 6 entries with
     a traced values_source … has 7`, `says 4 entries traced to the NAS standard
     … has 5`;
  2. **planted the 2026-08-10 stale sentence into `ARCHITECTURE.md`** — a live
     document nobody had enumerated — → failed naming `ARCHITECTURE.md:411: says
     8 … has 5`, `:412: says 3 … has 6`, `:412: says 1 … has 4`. That is
     deliverable 2's actual claim ("wherever it lives"), and it holds.
  Both reverted; `git status` clean.
- **Recounted the counts myself** from `docs/tolerance_stacks/hardware_entries.json`,
  not from the handoff table or the lesson: **15** entries; **11** carry a
  `values_source`; `workbook` **5**, `spec` **4** (3 `inline` + 1 `library`),
  `drawing` **2**; `confidence: traced` **6**; `values_status` `inline` **10**,
  `library` **1**, `not_transcribed` **4**. Derived: safe (sourced − workbook)
  **6**, not-library **14**. Every one agrees with the handoff's triage table and
  with what `hardware_entry_counts()` computes.
- **Deliverable 3's sweep, re-run independently** with a deliberately broader
  pattern (any number within 80 characters of `entries` / `values_source` /
  `values_status` / `not_transcribed` / `workbook` / `library_ref`, over the same
  27 live documents). Every hit outside the two known JSON copies is a different
  subject — per-stack element ratios (`README.md:35` "four of six element values",
  true: `pitch_link_to_pitch_plate` is 4 traced of 6), re-derivation cell counts,
  SOP example prose. **The lesson's "three live copies, not two" is correct and
  its "everything else holds no copy" list checks out.**
- **The lesson's claim that `"the four NAS bolts"` was previously unguarded** —
  confirmed: `test_hardware_entry_values_source_counts_match_the_description`
  pins exactly three phrases (`"five of the fifteen"`, `"SIX entries are
  traced"`, `` "Four entries are `not_transcribed`" ``) and that is not one of
  them. The new scan recounts it (`spec` = 4). True claim.
- **Same live-document set in both checkouts.** `live_documents()` returns the
  same 27 paths under `C:\workspace\tolstack` and under the worktree, so this
  filesystem-walking test cannot be checkout-sensitive the way `data/`-reading
  tests are. Verified rather than assumed, because the walk does descend into
  `data/inbox/`.
- **Suites, re-run by me, with the checkout named** (per this overlay's rule):
  - worktree `review/hardware_counts_doc_guard`: **345 passed, 1 skipped**;
  - main checkout `C:\workspace\tolstack` after the merge: **346 passed, 0
    skipped** — the usual data-dependent test running rather than skipping;
  - `node apps\viewer\run_tests.cjs --repo C:/workspace/tolstack`: **95/95, the
    `[real]` tier ran** (not 75/75).
- **`PROVENANCE.md` rows are true, not just moved.** `README.md`'s row claims
  "one paragraph, prose only — no file listed, no count, no schema fact and no
  other cell changed": the diff is exactly lines 128–140 and the replacement
  states no count. `test_tolerance_stack.py`'s row claims "two tests added, none
  removed, no existing assertion or number changed": the diff adds `import os`,
  `import re` and one block at the end of the hardware-entry section; no existing
  test body is touched. Both accurate.

## The seven mandatory checks

The work under review is a **doc-and-test guard**, not a tolerance stack. No
element, path, check, `source_ref`, `confidence`, hardware value or material
property changed — `git diff` touches no `stack_*.json`, no `materials.json`, no
`hardware_entries.json`. Checks 1–6 therefore have no new subject, and I record
them as such rather than as passes:

1. **Every tolerance traces to a specification or drawing callout** — no new or
   changed element value; **N/A**. The one thing this handoff *could* have got
   wrong in this direction is the reuse rule the README paragraph states, and it
   states it correctly: `kind: "workbook"` is forbidden as a source in a
   from-scratch stack (SOP Step 5b), `spec` and `drawing` are safe. No citation
   was created, moved or relabelled.
2. **Signs on every path term** — no term list changed; **N/A**.
3. **LMC/MMC direction** — no element carries a changed `lmc`/`mmc`; `fold()`
   untouched (not in the diff); **N/A**.
4. **RSS actually computed** — no check or result changed; **N/A**.
5. **Nominal inside its own min/max** — no `nominal` transcribed or edited;
   **N/A**.
6. **Quantised cotter/castellation constraints** — no worksheet in the diff, so
   no caveat could have moved. I did open
   `WORKSHEET_tan_link_to_pitch_plate.md` at the Checks table to confirm the
   blockquote added during `review/fastener_citations_and_confidence` is still
   sitting there (this overlay's "a prior review's PASS is a claim" entry), and it
   is. **N/A for this handoff, spot-confirmed not regressed.**
7. **Traced / inferred / untraced ratio — computed by me**, with
   `tests\debug_report_tolerance_stacks.py --ratio` (the one computing place):

   > **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across
   > the three seeded slice-1 stacks; **21 / 7 / 20 out of 48** across all six.

   Unchanged by this handoff, as it must be — nothing it touches feeds the ratio.
   The non-element ratio (`hub_bearing_thermal_stack`: 0 of 7 — three CTEs, two
   operating temperatures, two stiffness ratios) is likewise unmoved; I did not
   re-audit those values, since no file carrying them is in the diff.

## Also verified

- **Tests re-run in both checkouts** (above), with the source-cell-comment
  convention irrelevant here — no source-derived number was added.
- **Re-derivation tables**: untouched, no worksheet in the diff.
- **`data/inbox/specs/` not reorganised**: no `data/` path in the diff at all;
  filesystem in the main checkout unchanged by this review (I read no spec).
- **Nothing written into drawing-checker**: this session never opened that repo,
  and the branch touches no stack file, so no `export.runs` citation could gain
  or move a run. The run-`ts` invariants
  (`test_every_cited_run_carries_the_ts_from_its_own_run_meta`,
  `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`) are
  green in both checkouts.
- **Projections not rebuilt, deliberately**: nothing this branch changes is an
  input to `build_viewer_projection.py` or `build_viewer_crops.py`, and I judged
  nothing from the viewer's output. The `[real]` JS tier reading the existing
  build is green.
- **No new file in `scripts/` or `tolerance_stack/`**, so `ARCHITECTURE.md`'s tree
  block needs no row.
- **`docs/reference/` untouched**; **`{{` placeholders**: none in the diff.
- **Schema hygiene / `library_ref` pairing / `values_source` on inline entries**:
  no entry changed; the pairing and count tests are green.
- **`INCOMPLETE`, generated checks, `fold()`-is-the-only-arithmetic, no second
  combiner in JS**: no code in those paths is in the diff.
- **The overlay's own count sentence** (`docs/prompts/REVIEW_AGENT.md:348`) — the
  handoff forbade the author from touching it and was right to; it states no
  share and points at the test. I extended it, as overlay owner, to name the new
  doc-level guard and its blind spots.

## Findings

### should-fix — fixed inline

**F1. The guard's own demonstration pinned a live count, so ordinary future work
breaks it.** `tests/test_tolerance_stack.py:1380`,
`test_the_hardware_entry_count_guard_can_fail`. Its second assertion was
`… == [8, 3, 1]` — the digits of the replayed 2026-08-10 sentence that currently
disagree with the file. Those digits are a function of
`hardware_entries.json`'s size, and `PROVENANCE.md` states that file changes with
every new stack. I appended one plausible future entry (a vendor part traced to
its source-control drawing) and the test failed with:

```
E   assert [8, 11, 3, 1, 2] == [8, 3, 1]
E     At index 1 diff: 11 != 3
```

— a bare list-of-ints diff, in the one test whose docstring says it exists so a
guard is not shipped unwatched, and with nothing actually wrong. Note the
denominator went stale too (`sourced` 11 → 12), which is a legitimate change, so
the failure is not even a signal.

This is the repo's named recurring class landing inside the fix for it, and it is
the same coupling `test_the_export_is_a_sibling_of_the_feature_identity_slot_not_a_filling_in`
had to abandon when its hard-coded total of 23 churned.

*Fix applied:* assert the count **keys** the sentence got wrong
(`{"workbook", "safe", "spec"} <= flagged`) with a message naming what it flags
instead, and comment why the denominator is excluded. The claim-extraction
assertion above it is a pure function of the replayed string and is left alone.
Verified: passes on the real tree, and still passes with a simulated 16th entry.

### nits — fixed inline

- **N1. The lesson's suite line did not say which checkout produced it.**
  `LESSONS_20260812…:109` read "Full suite green against the real tree: **345
  passed, 1 skipped**". The `1 skipped` is the tell that it was a worktree, and
  this overlay's "run the suite in BOTH checkouts" entry exists because a pasted
  suite line here is checkout-specific. Now says worktree, explains the skip, and
  points at this report for the main-checkout figure (346 / 0).
- **N2. `PROVENANCE.md`: two 2026-08-12 amendment clauses ran into the preceding
  sentence with no separator** ("…no other cell changed** **Amended again
  2026-08-12**", "…landed on 2026-08-05 **Amended again 2026-08-12**"). Every
  other row in the file uses `. **Amended again`. Periods added.
- **N3.** `test_tolerance_stack.py`'s `PROVENANCE.md` row now records F1's
  one-assertion change, per the file's own convention.

### nits — not fixed, recorded

- **N4. `inline` is not an accepted denominator, and it is a correct one.** The
  workbook shape accepts `total` (15) or `sourced` (11). A future author writing
  the *true* sentence "5 of the 10 **inline** entries say `kind: "workbook"`"
  gets flagged as wrong, and the tempting repair is to write 11 — which would be
  wrong. One-token fix when someone hits it: add `"inline"` to that shape's
  denominator tuple. Left alone rather than widened speculatively, since
  widening a guard on a hypothetical is how guards lose teeth.
- **N5. A live, unguarded, dated transition sentence survives inside
  `hardware_entries.json`'s `description`**: *"That the workbook-transcribed
  count fell from eight to five in one sitting is the finding worth carrying."*
  No shape fires on it (correctly — it is history, and it is the same kind of
  statement `PROVENANCE.md` is excluded for), and it stays true as counts move.
  Recorded so the next sweeper knows it was seen, not missed, and does not
  "correct" the 8.
- **N6.** The `description`'s drawing count is phrased with part numbers
  (*"214589-002 / 214588-002, traced to their own source-control drawings"*), so
  the source-control-drawings shape does not fire there. Correct behaviour — a
  sentence with no numeral states no count — but worth knowing that of the
  scan's nine shapes, the drawing one currently has no live subject.

## Agreements with the author's judgement calls

- **`docs/prompts/REVIEW_AGENT.md:349`** (*"this line said "eight of the nine"
  until 2026-08-11 and it was five of eleven by then"*) left unflagged and
  unedited: agreed. It is past-tense against a date, its subject is "go read the
  test", and `five of eleven` is true today and stays true as a dated statement.
- **`PROVENANCE.md` excluded from the scan**: agreed, and it is the exclusion
  most likely to be second-guessed. Its rows record transitions as running prose
  ("eight → **five**"); scanning it would force falsifying the ledger to get the
  suite green.
- **Quotation-not-blockquote exemption**: agreed, and the reason is concrete —
  two of the three live copies are in JSON, where the correction convention has
  no blockquote available and `library_ref_note` already preserves its superseded
  number in inline double quotes.
- **JSON walked field-by-field rather than as text**: agreed, and the author's
  stated reason is the sharp one — reading the raw file would make the outermost
  `"` of every string a quotation span and exempt the entire file, i.e. the guard
  would pass against the two documents it most needed to read.

## Note for the next reviewer

The scan's honest claim is *"the ways this repo has gone stale before are now
mechanical"*. Its green does **not** mean the prose was checked: it matches nine
literal shapes, exempts blockquotes and `"…"` spans, and skips
`docs/sessions/`, `docs/issues/`, `docs/reference/`, `PROVENANCE.md` and
`CLAUDE.md`. That is now written into this repo's overlay next to the
`values_source` bullet, along with a fourth sighting of the stale-count class —
this one *inside a guard's own demonstration*, which is the new failure class this
review surfaced: **when work under review adds a guard, audit the guard's
demonstration for a cached live count and ask what ordinary next-handoff change
breaks it.**

One out-of-scope item was filed by the author rather than fixed, correctly:
`ISSUE_20260812_the_traced_ratio_guard_carries_a_stale_ratio_in_its_own_comment.md`
(`# "3 of 26"` beside a line that computes `5 of 26`). Priority `low` and
`type: chore` are right — the value is computed, so nothing is broken — but the
issue's own second option (delete the comment rather than correct it) is the one
to take, for the reason it gives.

**Verdict: APPROVE.** 0 blockers. One should-fix and three nits fixed inline on
`review/hardware_counts_doc_guard`; merged to `master` with the suite green in
both checkouts.
