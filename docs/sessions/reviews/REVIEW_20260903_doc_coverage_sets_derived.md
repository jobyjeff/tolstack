---
type: review
handoff: docs/sessions/completed/HANDOFF_20260902_doc_coverage_sets_derived.md
reviewer: review agent (claude-opus-5)
date: 2026-09-03
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-03 — doc_coverage_sets_derived

**APPROVE.** Both hand-kept coverage sets are gone, both replacements were
watched failing on the *real* defect and not only on a synthetic one, and the
one set that stayed curated carries an argument I could not break. Two
should-fixes, both filed as issues; two nits. Suite green at 576 passed /
1 skipped, up from the handoff's 570 baseline.

## What I verified, and how

**The pre-work state really was blind.** On `integration` (a63578a), before
merging: appended `3 of 26 element instances are traced.` to `CLAUDE.md` and
an absolute-form one-fold sentence to `docs/DAG_TOPOLOGY.md`, ran both guard
modules — **153 passed**, both defects invisible. That is the bug, reproduced.

**Post-merge the same two injections go red, naming file and line.**
`CLAUDE.md:140: 3 of 26` from
`test_every_document_quoting_the_traced_ratio_quotes_the_current_number`, and
`['docs/DAG_TOPOLOGY.md:333']` from
`test_every_live_passage_stating_the_rule_states_it_conditionally`. 2 failed /
157 passed. The `CLAUDE.md` case is the exact injection `review/claude_md_tracked`
made on 2026-09-01 and had to leave in a report.

**The derived sets are what the lesson says they are.** Ran `live_documents()`
against both the worktree and `C:\workspace\tolstack`: **44 in each**, so the
floor of 40 is stable across checkouts as claimed. `rule_statements()` returns
**15** unquoted passages, **3** carrying `EXCEPTION_ANCHOR` — matching
`RULE_STATEMENT_FLOOR` and `ANCHOR_PASSAGE_COUNT` exactly. Every entry of
`_DOCUMENTS_THE_DOC_SCANS_COVER` resolves; no dead entries.

**Deliverable 4, the wrong coverage claims.** `docs/prompts/REVIEW_AGENT.md`'s
two claims are corrected in place with the old wording quoted and dated, which
is the house convention. `CLAUDE.md`'s header claim ("the repo's doc-scan guards
read it as a live document") needed no edit and is now true of all three scans —
I confirmed it is in `live_documents()` and reached by the traced-ratio stale
half, the hardware-count scan and the rule scan.

**`stack.py` is docstrings only.** Three hunks, no executable line, `fold()`'s
body untouched and still reading no `lmc`/`mmc`. I agree with the scope call:
registering `fold()`'s own *"The only place element values are combined"* as a
deliberate exemption would have been the prose-only exception the guard exists
to end, and there is no exemption table today — which is the better place to be.

**Universal checks.** No `data/` pollution: `git status --short` clean in the
main checkout after the full suite. The new guards were observed failing (above,
and the branch's own `test_the_rule_scan_goes_red_on_a_corpus_pointed_nowhere`
runs the real derivation against an empty tree since cd5fba5 rather than
asserting on a hand-made empty list — that follow-up commit is the right fix).
The restatement check: `PROVENANCE.md` is amended append-only and its counts
(44, 145 tests in file, 576/1) match what I measured.

## Findings

### should-fix — filed as issues, not blockers

1. **`data/inbox/specs/README.md` is tracked, not gitignored, and it is the one
   curated publisher the guard cannot catch.**
   `tests/test_tolerance_stack.py`, `_RATIO_PUBLISHER_NAMES` /
   `traced_ratio_publishers()` / `test_the_coverage_sets_...`. Both the
   `missing` loop's `continue` and the new `gone` assertion's
   `not in ("data/inbox/specs/README.md",)` exempt it on the premise that it is
   absent in a worktree. `git check-ignore -v` returns nothing and
   `git ls-files data/` lists it. **Measured:** moving the file out of the
   worktree leaves both guard modules at 159 passed — a deleted curated
   publisher is silent, which is shape 1 of `ISSUE_20260812_...` and the very
   thing the curation argument cites. The `# gitignored` comments are inherited
   from the pre-work code; the named exclusion in `gone` is new.
   → `ISSUE_20260903_curated_ratio_publisher_exempted_as_gitignored_is_actually_tracked.md`.
   Not fixed inline: removing an exemption changes what a guard decides, and I
   would want a test proving the new red — both prongs fail.

2. **A qualifier anywhere in a blank-line block covers an absolute anywhere else
   in it, and this repo has a 14 976-character block.**
   `tests/test_thermal_exception_list.py`, `_flattened_units()` /
   `passages_in()`. The handoff found this masking for markdown tables and split
   them row by row; `- [ ]` runs were not split, and
   `docs/prompts/REVIEW_AGENT.md:1527-1747` is one unit. **Measured:** the
   absolute form inserted at line 1701 of that block leaves the module at 14
   passed; the same sentence in a paragraph-sized block reddens correctly. So
   the scan works where the rule's readers land and is silent across most of the
   overlay. → `ISSUE_20260903_a_qualifier_anywhere_in_a_15kb_block_covers_an_absolute_rule_statement.md`.

### nits

- `_DOCUMENTS_THE_DOC_SCANS_COVER` is commented as "the documents whose *prose
  claims* they are read by these scans". Only `CLAUDE.md` and
  `docs/prompts/REVIEW_AGENT.md` carry such a claim; `apps/viewer/README.md`
  carries none at all. The assertion is still worth having as a corpus pin — the
  comment overstates its basis, in a repo whose whole subject is prose claiming
  what the code does not do.
- The lesson says the only `data/` documents `live_documents()` sees are two
  `PROVENANCE.md`s. It also sees `data/inbox/specs/README.md`, which is tracked
  — see should-fix 1. The 44-in-both-checkouts conclusion is unaffected and
  I re-measured it.
- `_DOCUMENTS_THE_DOC_SCANS_COVER` is itself a hand-kept list, one ring out: a
  document that starts claiming coverage falsely is invisible to it. I do not
  think this is worth deriving — "does this prose claim coverage" is a natural
  language question — but it is the same shape and the next reviewer should know
  it is there rather than rediscover it.

## For the next reviewer

Two overlay entries added, both generalising a should-fix above: *a derived doc
scan whose unit is bigger than the claim it judges* (inject at the far end of
the biggest block, not next to the token), and *an exemption resting on "that
file is gitignored" — run `git check-ignore`, don't remember*.

The `- [ ]` masking in should-fix 2 means **this overlay is the file least
protected by the rule scan**. If you write an absolute statement of the one-fold
rule into a long checklist run here, nothing will tell you.
