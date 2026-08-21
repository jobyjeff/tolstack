# LESSONS — `three_field_vocabularies` (worked 2026-08-21)

Handoff: `docs/sessions/active/HANDOFF_20260819_three_field_vocabularies.md`, from
`ISSUE_20260818_three_more_field_vocabularies_are_defined_by_a_comment.md`.
Branch `handoff/three_field_vocabularies`, one implementation commit plus this one.
`apps/viewer/viewer.js` was **not** edited and no `data/` file was rebuilt — see
"Verification" for the evidence that neither needed to be.

## The answer to *"is there a fifth?"* — and why the grep the handoff specified is the wrong instrument

The definition of done asked for `grep -rn '# .* \| .* \|' tolerance_stack/` with a
verdict per hit. Run after the fix, it returns **one** line:

```
tolerance_stack/spec_library.py:510:  kind: str   # NAS/MS standard | MIL standard | Joby part drawing | ...
```

— `IntakeRow.kind`, which the handoff already ruled out: it ends in `| ...`, so it
is free text with examples. Verdict: **not a vocabulary, leave it.** By that grep,
the repo is clean.

**The repo is not clean, and the grep is why.** It requires two pipes and a `#`.
Two closed vocabularies sit outside both requirements:

| | where | why the grep misses it | verdict |
|---|---|---|---|
| `SourceExport.status` | `stack.py:190`, `# established \| unestablished` | **one** pipe — a two-word vocabulary never has two | already had `EXPORT_STATUSES` and validation since 2026-08-06; the comment was a redundant *second* copy sitting beside the definition. **Fixed here** (one line, `# one of EXPORT_STATUSES, above`) — deliverable 1's rule is explicit that a comment next to the constant is the next reader's second source of truth |
| `MaterialEntry.values_status` | `thermal.py:146`, `if self.values_status not in ("inline", "library", "not_transcribed")` | no comment at all — the words are an **inline tuple literal inside the `if`** | a genuine fifth, and the *same three words* are `hardware_entry.values_status`, spelled again in the SOP, in `REVIEW_AGENT.md` and in `hardware_entry_problems()`. **Filed, not fixed** (`thermal.py` is outside this handoff's scope): `ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md` |

The wider sweeps that found them, for whoever asks a fourth time:

```
grep -rn '#.*[a-z_)] | [a-z_]' tolerance_stack/     # one-pipe comments
grep -rn '^\s*[a-z_]*: str' tolerance_stack/        # every str field, then read each
```

Ruled out by the second one, so nobody re-derives them: `ParseEvent.mode`
(`EVENT_MODES`, validated), `SpecValue.confidence` (`CONFIDENCES`, validated),
`LibrarySubject.subject_kind` (only ever built from a validated `SpecEntry`),
`CheckResult.verdict` (a computed **property**, `pass|marginal|fail` — not
settable, so nothing can construct a bad one), `CheckResult.criterion` (single
supported value, guarded by `NotImplementedError`), and `thermal.py`'s
`stage`/`group`/`corner` (function parameters that produce labels, not persisted
field domains).

### So: make it a test, not a fourth grep

The handoff said this question has been asked and answered twice and the third time
should be a test. Having now answered it a third time, the sharper claim is that
**a grep over comments cannot be that test**, because the defect's best disguise is
the *absence* of a comment. What a test has to look for is an **enumerated `str`
domain with no importable name**: a membership check (`not in (...)`, `not in [...]`)
whose right-hand side is a literal rather than a module-level constant. That
catches `MaterialEntry.values_status`, and it would have caught nothing that this
session's four fields had — which is the point: the comment-shaped instances are
now gone and the literal-shaped ones are what is left. See
`forge/docs/sessions/HANDOFF_20260819_no_second_source_of_truth_convention.md` for
the general convention, and `HANDOFF_20260819_enumerated_state_doc_guard.md`
(staged in this repo) for the doc-side sibling of the same problem.

## Decisions the handoff left open

**The doc-comment above each constant does not re-list the words.** `CONFIDENCES`'s
`#:` block elaborates all three of its values, which is fine at three words with
one meaning each. Six kinds and eight roles would make that block a de-facto
whitelist — a comment next to the constant, which is exactly what deliverable 1
forbids. So each new block explains only what is *not* self-evident (`spec`'s
history, `nut_geometry`'s caveat) and points at the SOP for the rest, with the
pairing test named so a reader knows the prose is checked.

**The SOP-side pairing compares order as well as membership.** Nothing depends on
order and I nearly compared sets only. Both lists agree today, so pinning it is
free, and the assertion is split in two so a re-order is never reported as a
missing word. If a future author needs to re-order one list, deleting the second
assertion is the correct response — not weakening the first.

**`SpecEntry.subject_kind` has no SOP half to pair.** The SOP is the *stack*
author's document and never mentions the spec-library entry shape. So
`SUBJECT_KINDS` is pinned only by its constructor test — which is the whole
mechanism it needs, because unlike `kind` and `role` there was never a second copy
to reconcile. The pairing table in `test_sop_vocabulary.py` says so in a comment,
so the next reader does not "fix" the omission.

## Two test fixtures were building elements with a role that is not one

`_el()` (`tests/test_tolerance_stack.py:80`) and
`test_element_rejects_inverted_limits` both passed `role="test"`. Harmless while
nothing checked; **20 tests** went red the moment `StackElement.__post_init__` did.
Both now use `clamped_member` and no assertion in either depends on the role. Worth
saying because the instinct in that moment is to exempt the fixture — a test helper
is not a reason to punch a hole in a constructor check, and the red was the check
working on its first run.

## Mutation demonstrations, exactly as run

Each constant individually, both directions. Reverted after each.

| mutation | what reddened |
|---|---|
| `SOURCE_REF_KINDS` += `"invented_kind"` | `test_the_sop_spells_the_same_vocabularies_the_code_enforces[SourceRef.kind]` + the can-fail replay. **2 failed** |
| `SourceRef.__post_init__` reads a hand-written tuple missing `pipeline_element` | `test_a_source_ref_refuses_a_kind_outside_the_vocabulary`, **and nothing else** — `pipeline_element` has zero live instances, so the on-disk tests cannot see it. **1 failed** |
| SOP's `kind` list loses `pipeline_element` | the same two SOP tests. **2 failed** |
| `ELEMENT_ROLES` += `"spacer"` | the SOP pairing + the new role test's anti-vacuity line. **3 failed** |
| `StackElement.__post_init__` reads a tuple missing `allowance` | the new role test, plus 24 others — every role *is* live, so this one is loud. **25 failed, 40 errors** |
| `SUBJECT_KINDS` += `"partnumber"` | `test_an_entry_refuses_a_subject_kind_outside_the_vocabulary`. **1 failed** |
| `SpecEntry.__post_init__` reads a tuple missing `family` | the same test, plus the whole spec-library suite (`family` is live). **8 failed, 59 errors** |

Row 2 is the one that justifies the new tests existing at all: it is the only
mutation in the table that **no pre-existing test** catches. A vocabulary word with
no instance on disk is invisible to every test that walks `docs/tolerance_stacks/`,
and `pipeline_element` — the slot slice 1 deliberately leaves open — is exactly
such a word.

## Verification, exactly as run

- **Python suite, in the worktree**, main checkout's interpreter
  (`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`):
  **447 passed, 1 skipped** (baseline 441/1; +6 = 2 constructor tests, 1 spec-library
  test, the SOP pairing parametrized ×2, and its can-fail replay).
  126 tests collected from `tests/test_tolerance_stack.py` (was 124).
  **Not run in the main checkout** — it is on `master` and does not have this
  branch's code. Say which checkout produced a count; this one is the worktree's.
- **Viewer JS suite, both tiers**, from the worktree:
  `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` → **131/131**;
  without `--repo` → **102/102** (node-fs tier skipped). Nothing under
  `apps/viewer/` was edited; run because the pairing module reads Python
  vocabularies and a reviewer should not have to wonder.
- **The traced ratio is unchanged**, which is what "this handoff moves no value"
  has to mean: `tests/debug_report_tolerance_stacks.py --ratio` gives
  **5 traced / 3 inferred / 18 untraced, out of 26** seeded instances and 21/7/20
  of 48 across all six stacks — the same figures `PROVENANCE.md` and the SOP quote.
- **The projection is byte-unchanged.** Rebuilt from the worktree into a scratch
  data-root (`build_viewer_projection.py --data-root <scratch>`) and compared to the
  live `data/projections/viewer/results.json` with `built_at`/`provenance` popped:
  **equal**. So `data/` needs no rebuild and the live file is not stale against this
  branch.
- **Nothing on disk moved, counted rather than assumed:** 48 element instances, all
  citing one of the six kinds (`workbook` 21, `drawing` 15, `spec` 7, `parts_list` 4,
  `assumed` 1 — `pipeline_element` unused) and all carrying one of the eight roles
  (`bushing` 17, `clamped_member` 7, `bearing` 7, `fastener` 7, `washer` 4,
  `nut_geometry` 3, `relief` 2, `allowance` 1); 11 filled `values_source` blocks, all
  six-kind-legal; and the live `subject_kind` values are exactly `part_number`,
  `criterion`, `family`.
- **`git log --oneline HEAD..master`**: three commits, all board moves
  (`staged -> active` renames of this and two sibling handoffs), **zero code**. No
  sibling handoff has landed anything to reconcile.

## Gotchas for the next agent here

- **`git checkout -- <file>` after an in-place mutation test reverts the whole
  file, including the edits you meant to keep.** I mutated the SOP's `kind` list to
  demonstrate the pairing reddens, then reverted with `git checkout --` — and lost
  both of that session's real SOP edits, which were uncommitted at the time.
  `git status` caught it before the commit. Either commit before mutating, or
  mutate an in-memory copy: `sop_pipe_list()` takes a `text` argument for exactly
  this reason, and `test_the_vocabulary_pairing_can_fail` uses it, so the durable
  demonstration never touches the file.
- **`test_this_branch_amended_the_row_of_every_imported_file_it_changed` asks for
  three rows here**: `tolerance_stack/stack.py` (PROVENANCE.md:84),
  `tolerance_stack/__init__.py` (:83) and `tests/test_tolerance_stack.py` (:96). It
  does **not** ask for `tolerance_stack/spec_library.py`, `tests/test_spec_library.py`,
  `tests/test_sop_vocabulary.py` or `docs/SOP_TOLERANCE_STACK.md` — those rows say
  *not imported*, or there is no row. Note `__init__.py`'s row carries a standing
  instruction that a new module **constant** means that file changes; three
  consecutive handoffs have now added one.
- **A repo-wide "is the vocabulary really singular now?" grep still shows the
  words more than once, and should.** `SOURCE_REF_KINDS`'s six words appear in
  `stack.py` (the definition) and in `docs/SOP_TOLERANCE_STACK.md` (the author-facing
  list, mechanically paired). Same shape as `CONFIDENCE_ORDER` after the previous
  handoff: read it as "one definition, one paired restatement", not as "the string
  appears once".
- **`docs/prompts/REVIEW_AGENT.md` is now stale about this and I did not fix it** —
  its "Documented vocabularies" item still says a vocabulary lives in three places
  including a dataclass comment, and tells a reviewer to check all three by hand.
  That file's own header assigns it to the review agent. Filed as
  `ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`;
  a reviewer picking this branch up should fix it inline instead.
- **`ARCHITECTURE.md` was checked and needs nothing.** The handoff forbade touching
  it (the staged `architecture_inventory_quantifiers` owns it); grepping it for
  `three places` / `SourceRef.kind` / `StackElement.role` / `subject_kind` returns
  no hits, so there is no conflict waiting at that merge.

## Follow-ups (filed, not fixed)

- `ISSUE_20260821_material_values_status_vocabulary_is_an_inline_literal.md` — the
  fifth instance, and the one that motivates turning this question into a test.
- `ISSUE_20260821_review_checklist_still_says_a_vocabulary_lives_in_three_places.md`
  — the review overlay's own copy of the claim this handoff falsified.
