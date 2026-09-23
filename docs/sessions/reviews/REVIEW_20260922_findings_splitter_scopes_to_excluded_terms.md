---
type: review
handoff: docs/sessions/active/HANDOFF_20260922_findings_splitter_scopes_to_excluded_terms.md
reviewer: agent (review/findings_splitter_scopes_to_excluded_terms)
date: 2026-09-22
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-22 — findings_splitter_scopes_to_excluded_terms

Work reviewed: `handoff/findings_splitter_scopes_to_excluded_terms` @ `4fc97b6`,
two commits (code, then lesson), 5 files (+295 / −17). Branch cut from
`integration` @ `154d4c6`; `integration` had moved one commit (`a6a71fb`, a
board rename of another handoff's file) by the time I merged, so my review
branch was fast-forwarded to it first and the work then merged **cleanly, no
conflicts** — nothing in the merged tree is a resolution choice of mine.
One run of this handoff, one lesson, arriving as `A` rather than `M`.

## Verdict

**APPROVE.** All three deliverables are met and the definition of done is
satisfied by measurement rather than by reading. One should-fix (a count whose
scope got lost between the issue and the code comment) I fixed inline and say
so below; two findings outside this handoff's deliverables are filed as issues.

## What I verified, independently of the lesson

- **Deliverable 1 — the scoping is right, and it is the whole of it.**
  `VA.studyAttention` pushes `edge.name` and nothing else into `unverified` /
  `noTolerance` (`apps/viewer/topology.js:459-476`), so those two buckets
  cannot hold a what/why string; `excluded` holds only authored
  `check.excluded_terms`. A grep across `apps/`, `scripts/`, `tolerance_stack/`
  and `tests/` confirms one caller and one regex — no sibling site.
- **The DoD's before/after, re-measured from the live projection** (not read
  off the lesson): ran `VA.studyFindings` in a bare `vm` sandbox over
  `C:\workspace\tolstack\data\projections\viewer\topologies.json` with
  `integration:apps/viewer/topology.js` and then with the branch's. Exactly
  **five** rows change, on exactly the five `pitch_system*` studies the handoff
  names; `pitch_system_end_stop_minus7`'s `unverified_value` row goes from
  name `piston end to end-stop feature` / rationale `the end stop` to name
  `piston end to end-stop feature -- the end stop` / rationale `null`. The
  lesson's table is correct.
- **Deliverable 2 — the new fixture guard was observed failing, both ways.**
  Clean `497/497`. Setting `unverified_value` / `no_tolerance_recorded` back to
  `reasonSplit: true` → `496/497`, the new guard alone. Setting
  `excluded_from_model` to `reasonSplit: false` → `494/497`, the new guard plus
  `an incomplete check's bottom line is visibly qualified…` and `[real] an
  incomplete check states what is missing ABOVE its number…`. Both counts match
  the lesson's, planted against today's tree rather than transcribed.
- **Deliverable 3** — the comment sits at the `shownRows.indexOf(edge.name)`
  assertion (`apps/viewer/tests.js:12525`), and the claim it makes is true:
  that bucket is now `reasonSplit: false`, so an exact match against
  `edge.name` holds by construction.
- **The CSS answer is real** — no stylesheet line was touched and the clamp on
  `summary.tvfind__name` is unconditional, so an unsplit name takes the path a
  separator-less excluded term already took.
- **The out-of-scope vacuity issue was left alone**, as instructed
  (`ISSUE_20260922_the_findings_whole_text_assertion_is_satisfied_by_the_gap_panel_beside_it.md`),
  and the lesson records the observation the handoff asked for instead of
  quietly fixing it.
- **`data/` is as I found it** (269 files before and after the full suite; main
  checkout `git status` clean). No projection was rebuilt and none needed to
  be — this diff changes no projection input.

## Findings

### should-fix — fixed inline (comment only, no behaviour)

1. **A count copied out of the issue into two code comments, with its scope
   lost in transit.** `apps/viewer/topology.js` and `apps/viewer/tests.js` each
   said "58 strings in the live projection carry the separator". 58 is right
   for the three fields the findings table reads — 42 `excluded_terms` + 7
   `edge.name` + 9 `node.name`, which I reproduced exactly — but the live
   projection as a whole carries **381** separator-bearing string occurrences
   (222 distinct), in `note`, `text`, `description` and twenty-odd other keys.
   The digits were right and the noun was wrong by 6.5x. Fixed both comments to
   name the fields the number counts; the argument they support is *stronger*
   under the true whole-file number, so nothing else changed. The source issue
   and the overlay entry carried the same imprecision — the overlay now carries
   a dated correction, and the issue is left as filed history.

### filed as issues (outside this handoff's deliverables)

2. **The new guard has no mutation-witness entry.**
   `ISSUE_20260922_the_findings_splitter_scoping_guard_has_no_mutation_witness_entry.md`
   (chore/low). The handoff was explicitly forbidden to touch
   `scripts/mutation_witnesses.json`, which `mutation_witness_repair_and_enrollment`
   owns, so this is correctly *not* a defect of the work — but the row still
   needs writing, and it needs **two** mutations because the guard asserts both
   halves of one rule. Both are in the issue with the counts I measured, so the
   enrollment rail can declare them without re-deriving.
3. **`AUTHORED_REASON_SPLIT`'s em-dash alternative is still unwitnessed.**
   `ISSUE_20260922_the_authored_split_regex_still_cuts_at_an_em_dash_which_nothing_witnesses.md`
   (bug/low). `REVIEW_20260922_viewer_summary_balance_sheet` finding 5 raised it
   and deliberately did not file it, reasoning that this handoff "should settle
   it". It could not: this handoff scoped *which buckets* reach the splitter and
   was told to leave the split behaviour unchanged, so the alternative is still
   live on the one bucket still split. Zero live strings anywhere in the
   projection carry ` — ` and no test exercises it, so it is latent rather than
   broken — but an em dash is ordinary prose punctuation, an excluded term is
   prose, and `String.match` would take it ahead of the ` -- ` an author
   actually meant.

### nits

4. `apps/viewer/topology.css:1138-1143` still explains the clamp as being for
   "a term whose author wrote no ` -- ` split". True, but no longer the main
   case: since this change, every chain-row name reaches the clamp unsplit.
   One clause, whenever that file is next open.
5. A name-bucket row's `<details>` now folds to `closes` alone, and its `title`
   hover repeats the summary verbatim. Harmless, and the alternative
   (suppressing the disclosure when there is no rationale) would cost the
   `closes` line, so I would leave it.

## Tests

Cadence per the canonical prompt: the lesson **records** its full-suite run
(command, checkout, counts) and is consistent with the diff, so the benefit of
the doubt applies and I did not repeat it pre-merge.

- **Risky subset, pre-merge** (`apps/viewer/` row, plus the guard row because
  the diff adds one): `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
  → **497/497, no tier skipped**; `pytest -q tests/test_js_python_vocabulary.py
  tests/test_viewer_readme_doc_facts.py tests/test_viewer_deep_link_contract.py
  tests/test_mutation_witnesses.py` → **49 passed**.
- **Full suite, post-merge, in this review worktree**:
  `venv-win/Scripts/python.exe -m pytest -q` → **1208 passed, 1 failed in
  46.6 s**. The failure is
  `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`, the documented
  worktree-only red (gitignored `data/`; the tier refuses to count itself
  skipped). It is covered by the `--repo` run above, which is that same tier
  against a checkout that has a projection.
- **Mutation tier, post-merge** (the overlay's standing instruction — my merge
  is the one point in the lifecycle where nothing else re-runs it):
  `node scripts/run_mutation_witness_tests.mjs --repo C:/workspace/tolstack` →
  **93/96 witnessed**. The three `NOT WITNESSED` are
  `leader-style-survives-a-topology-switch`, `worst-verdict-ranks-worst-last`
  and `arriving-at-an-element-shows-its-part-in-3d` — exactly the three Part 1
  entries `HANDOFF_20260922_mutation_witness_repair_and_enrollment.md` already
  owns, at the same count the enrollment review measured post-merge. **The
  merge cost no coverage.** (`node_modules` was junctioned in from the main
  checkout first, then removed — without it every browser entry reports
  `NOT WITNESSED` and reads like a wall of broken guards.)
- **Browser tier not re-run.** The diff touches no CSS, no positional code and
  no geometry; the author records `25/25`, and the mutation tier above drove
  every browser-tier entry in the registry. Said here rather than left implicit.
- Re-ran after my inline comment fix: viewer tier **497/497**, and **225
  passed** across `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
  `test_mutation_witnesses`, `test_tolerance_stack`, `test_provenance` and
  `test_thermal_exception_list` (the doc-scan row, because the fix edits prose
  a scanner can read).

## For the next reviewer

Two entries added to the overlay's **Recurring bugs** list: a count copied out
of an issue into a code comment with its scope lost, and a prior review's
finding waved through as "the next handoff will settle it" — check whether it
did, because finding 3 above is one that did not. The existing "parser applied
to a list whose members come from TWO vocabularies" entry now carries a dated
correction to its own `58`.
