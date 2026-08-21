---
type: review
handoff: docs/sessions/active/HANDOFF_20260819_three_field_vocabularies.md
reviewer: review agent (Claude Sonnet 5)
date: 2026-08-21
verdict: APPROVE
blockers: 0
---

# Review — `three_field_vocabularies`

Work reviewed: `handoff/three_field_vocabularies` (`57b6be3` implementation,
`14d23a5` lesson/issues, `c93a94c` a same-day self-correction to a `PROVENANCE.md`
row), merged into `review/three_field_vocabularies` on top of `master` `249625f`.
Three-dot diff against the merge-base: 11 files, `+645 / −47` — matches the merge
exactly (`git diff --stat master...handoff/three_field_vocabularies`), so nothing
outside the handoff's own commits landed silently.

`git log --oneline HEAD..master` was empty before the merge (only board-move
commits for two sibling handoffs, staging them, not landing code). No sibling
handoff merged into `master` while this was in review.

## Pre-merge control: wrote the failing case first

Before merging, on `master` (via the main checkout's interpreter, since the venv
only exists there):

```
SourceRef(kind='banana')          -> constructs, .kind == 'banana'
StackElement(role='banana', ...)  -> constructs, .role == 'banana'
SpecEntry(subject_kind='banana')  -> constructs, .subject_kind == 'banana'
```

All three gaps confirmed present on the pre-work baseline. After merging, all
three raise `ValueError` naming the vocabulary and the bad value — confirmed by
re-running the identical calls against the merged tree.

## The seven mandatory stack checks

Do not apply. This handoff adds no stack, element, path, check, citation,
material or hardware entry, and touches no file under `docs/tolerance_stacks/`,
`data/` or `apps/`. Confirmed from the diff, not assumed: the only executable
changes are to `tolerance_stack/stack.py`, `tolerance_stack/spec_library.py`,
`tolerance_stack/__init__.py`, and three test files. `apps/viewer/viewer.js` was
not touched — the JS suite was still run (below) because the lesson says the
pairing module reads Python vocabularies and a reviewer shouldn't have to take
that on faith.

Two of the seven still have something to check:

- **Check 1 / check 7 (provenance, the ratio).** Nothing on disk moved — I
  re-derived the ratio myself (`tests/debug_report_tolerance_stacks.py --ratio`):
  **5 traced / 3 inferred / 18 untraced, out of 26** seeded element instances;
  **21 / 7 / 20 of 48** across all six stacks. Matches the handoff and the
  lesson exactly.
- **`fold()` untouched, no second combiner.** Confirmed from the diff: the only
  change to `stack.py` besides the two new constants and their `__post_init__`
  checks is a comment edit (`SourceExport.status`). No arithmetic touched, in
  Python or JS.

## The universal check: a new guard has been observed failing

Broke one of the three new checks myself rather than trusting the lesson's
mutation table, reverted with `git checkout --` after confirming `git diff
--stat` showed only that one file dirty:

| poison | result |
|---|---|
| `SOURCE_REF_KINDS += ("invented_kind",)` | `test_the_sop_spells_the_same_vocabularies_the_code_enforces[SourceRef.kind]` and `test_the_vocabulary_pairing_can_fail` both red — **2 failed**, matching the lesson's mutation table row for row |

Also independently reproduced the two directional gap-checks by calling the
constructors directly (see "Pre-merge control" above and its mirror on the
merged tree) — this is the specific case the lesson's mutation-table row 2 says
*no pre-existing test could catch* (`pipeline_element` has zero live instances),
and the new `test_a_source_ref_refuses_a_kind_outside_the_vocabulary` is exactly
what closes that hole.

## The deliverables, checked against the handoff's own list

1. **A module constant beside each dataclass, comment deleted.**
   `SOURCE_REF_KINDS` / `ELEMENT_ROLES` in `tolerance_stack/stack.py`,
   `SUBJECT_KINDS` in `tolerance_stack/spec_library.py`. Read the diff directly:
   all three end-of-line pipe-list comments are gone, replaced by
   `# one of X, above`. No comment sits beside any of the three constants either
   (checked — the docstring blocks above each explain history/caveats, not the
   word list itself, exactly as the lesson says it deliberately avoided).
2. **`__post_init__` validates.** `SourceRef.kind`, `StackElement.role`,
   `SpecEntry.subject_kind` each raise `ValueError` naming the vocabulary and the
   bad value — verified live, both directly and through `from_dict` (the path
   every real loader takes).
3. **Test tuples read the constant.** Checked `tests/test_tolerance_stack.py`
   and `tests/test_spec_library.py`: every place that used to hand-copy the six
   kinds / eight roles now reads `SOURCE_REF_KINDS` / `ELEMENT_ROLES` /
   `SUBJECT_KINDS` imported from the package. Two test fixtures
   (`_el()`, `test_element_rejects_inverted_limits`) that built elements with
   `role="test"` were changed to `clamped_member` — correctly, since that role is
   not in the vocabulary and would now raise; neither test's assertions depend on
   the role.
4. **SOP recounted.** `docs/SOP_TOLERANCE_STACK.md`'s "lives in three places"
   sentence for `kind`/`role` is now "lives in two places", with the superseded
   wording kept as a blockquote per this repo's correction convention.
   `tests/test_sop_vocabulary.py` gained a third check
   (`test_the_sop_spells_the_same_vocabularies_the_code_enforces`, plus a
   can-fail replay) that pairs the SOP's pipe-lists against the two constants
   word-for-word, in both directions, with anti-vacuity built in
   (`sop_pipe_list` asserts the anchor text exists exactly once). Correctly
   excludes `SpecEntry.subject_kind` — the SOP is the stack author's document and
   never mentions it — and says so in a comment rather than silently omitting it.

## Also verified

- **Tests, re-run rather than trusted.** Worktree, main checkout's interpreter:
  **447 passed, 1 skipped** — matches the lesson. `git log --oneline HEAD..master`
  was empty at merge time, so no reconciliation was needed against a sibling.
  (Main-checkout run against the merged tree happens as part of integration,
  below.)
- **Viewer JS suite, both tiers, from the worktree.**
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **131/131**;
  without `--repo` → **102/102** (node-fs tier skipped, no local projection).
  Matches the lesson exactly. Nothing under `apps/viewer/` was touched.
- **`PROVENANCE.md`.** `test_this_branch_amended_the_row_of_every_imported_file_it_changed`
  is green; I read the amendments against `git diff -w` for the three rows
  claimed changed (`__init__.py`, `stack.py`, `test_tolerance_stack.py`) and they
  match what the diff actually contains. One correction already happened inside
  this branch itself: `c93a94c` fixed the `stack.py` row to also name the
  `EXPORT_STATUSES` comment-only line, which the row had omitted — the author
  caught their own gap between "the row moved" (what the test asserts) and "the
  row is true" (what only a human reads), which is exactly the discipline this
  repo's checklist asks a reviewer to apply. Nothing left to add.
- **`ARCHITECTURE.md`.** Correctly untouched (the handoff's scope forbids it;
  `architecture_inventory_quantifiers` owns it). Grepped it for `three places`,
  `SourceRef.kind`, `StackElement.role`, `subject_kind` — no hits, so there is no
  conflict waiting at that merge, matching the lesson's own check.
- **Scope.** `git diff --stat master...handoff/three_field_vocabularies` touches
  only `tolerance_stack/`, `tests/`, `docs/SOP_TOLERANCE_STACK.md`,
  `PROVENANCE.md`, and the new lesson/issue files — exactly the handoff's stated
  scope plus the required process artifacts.
- **File, don't fix.** Two out-of-scope findings filed correctly, both with
  compliant frontmatter (`type: chore`, `priority: low`, `status: open`,
  `reporter: agent`):
  `ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md` (a
  genuine fifth comment-free vocabulary, `thermal.py`, correctly left as a
  decision rather than a rename) and
  `ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`
  (this repo's own review overlay, correctly left for the reviewer to fix rather
  than fixed by the author). Both re-derived and confirmed accurate.
- **The lesson's definition-of-done answer ("is there a fifth?").** Re-read the
  grep the handoff specified (`# .* \| .* \|`) and the two wider sweeps the
  lesson ran instead; the argument that the specified grep is the wrong
  instrument (it requires two pipes and a comment, which is exactly the shape a
  well-hidden case won't have) is sound and is itself the most durable output of
  this handoff.

## Findings

No blockers, no should-fix. One nit, not fixed (informational only):

- The new `sop_pipe_list` helper in `tests/test_sop_vocabulary.py` uses a
  `str | None` parameter annotation, matching the file's existing style
  elsewhere in the module — consistent with the codebase, not a defect; noting
  only because it pins a Python ≥ 3.10 floor if that were ever in question. It
  is not: the suite runs green under this repo's own `venv-win`.

## Overlay maintenance

`docs/prompts/REVIEW_AGENT.md`'s "Documented vocabularies drifting from the
seeded data" item still told a reviewer that a vocabulary lives in **three**
places (SOP prose, a dataclass comment, an enforcing test) and to check all
three — stale as of this handoff, and the exact gap
`ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`
asked the next reviewer to close. Fixed on this branch:

- The "three places" claim is now scoped as history ("at the time"), since it
  was true through the third sighting and is not true now.
- A **fourth sighting** is appended: the vocabulary now lives in two places, and
  neither is a comment (`SOURCE_REF_KINDS`/`ELEMENT_ROLES` plus the SOP's
  pipe-list, paired by `test_the_sop_spells_the_same_vocabularies_the_code_enforces`);
  `SpecEntry.subject_kind` has no SOP prose to pair and is pinned by its
  constructor test alone; and the one thing a reviewer still has to do by hand is
  read for a *drifted sentence about a rule*, which no vocabulary-vs-constant
  pairing can see (the same shape as the third sighting).

No new "Recurring bugs" or "Architectural errors" entry: this handoff surfaced
no new failure class beyond what it already filed as issues, and those are
scoped to `thermal.py` (a different handoff's territory) and to the overlay
itself (fixed here).

## Verdict

**APPROVE.** Proceeding to merge into `master`, main-checkout suite re-run, push,
and worktree/branch cleanup per this repo's review contract.
