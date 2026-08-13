---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_js_python_vocabulary_pairing.md
reviewer: review agent (dispatch)
date: 2026-08-13
verdict: APPROVE
blockers: 0
---

# Review — `js_python_vocabulary_pairing`

Work reviewed: `handoff/js_python_vocabulary_pairing` (`0908c03`, `50271f3`),
merged into `review/js_python_vocabulary_pairing` on top of `master` `f5d188f`.

**The seven mandatory stack checks do not apply.** This handoff adds no tolerance
stack, no element, no citation and no material — it is one new test module
(`tests/test_js_python_vocabulary.py`), one issue closed, two filed, one lesson.
Nothing under `tolerance_stack/`, `scripts/` or `apps/` changed, so no tolerance,
sign, LMC/MMC mapping, RSS column, nominal or traced ratio moved. Confirmed by
`git diff --stat master...handoff/...`: five files, all under `tests/` and
`docs/`. The governing check here is the **universal** one — *a new guard has been
observed failing* — and it is the whole review.

## What I verified

### The guard has been observed failing — replayed independently, six ways

The lesson reports four poison runs. I did not take them on trust; I re-ran them
on the merged tree and added two the handoff did not do. Every one was reverted
and `git status --porcelain` confirmed clean after each.

| poison | result |
|---|---|
| fourth value `estimated` in `thermal.py`'s `values_status` tuple | red, naming the value, the file and `MaterialEntry.__post_init__` |
| `not_transcribed` → `"not-transcribed"` in `VA.VALUES_STATUSES` | red, naming **both** directions; exactly 1 failure (the loosened key regex holds) |
| `VA.EXPORT_STATUSES` renamed away | 4 failed with `LookupError` — **not** a vacuous pass |
| `VA.EXPORT_STATUSES.provisional = {...}` added elsewhere | red, naming the file line |
| **(mine)** `"resolved_by": "spec_pile"` → `"spec_file"` in `build_viewer_crops.py` | red, both directions — the third pairing bites too |
| **(mine)** `VA.EXPORT_STATUSES` emptied to `{ }`, table still present | red: *"extracted zero keys … would make this module's comparisons pass against anything"* |

The last one is the one that mattered to me. The handoff's DoD only asked for the
*missing-table* case; the *present-but-empty* case is the nearer miss and the
anti-vacuity assertion catches it with the right message. Both questions the
universal check asks are answered: an input makes this fail, and it observes the
vocabulary itself rather than a proxy.

### The deliverables

1. **A Python test reading `apps/viewer/viewer.js` and asserting set equality.**
   Present, and it needs no live data to move — which is the entire point, since
   `library`, `unestablished` and `joint_export_run` have zero live instances. I
   confirmed that from the main checkout's projections rather than from the prose:
   `crops.json` counts `source_ref_export: 22`, `spec_pile: 4`, no
   `joint_export_run`; `results.json`'s 48 elements are 21 `traced` / 7 `inferred`
   / 20 `untraced`, no `no_source_ref`. Both numbers as the lesson and the new
   issue state them.
2. **Python side taken from the definition, not a fourth copy.** `EXPORT_STATUSES`
   by import; `values_status` by AST off the membership check itself;
   `resolved_by` by AST off the script's dict literals. No vocabulary is restated
   in the test. The choice to read the **check** rather than a constant is
   better than the refactor the handoff offered, for the reason the lesson gives:
   what the viewer must render is what the validator accepts.
3. **How much JS parsing is enough, stated.** Yes, at length, and the extraction
   is asserted before anything is compared. See N2 for what the statement missed.

**A new module rather than `test_sop_vocabulary.py`** — asked for and answered
("say which you chose and why"). The argument holds: that module's helpers all
parse markdown, and this drift is code-to-code.

**`thermal.py` not refactored** — the handoff allowed it, the scope line forbade
modifying `tolerance_stack/`, and `material_cte_optional` owns the file. Correct
call, and the AST reader anticipates the refactor with
`test_the_values_status_reader_also_handles_the_constant_refactor` covering the
`ast.Name` branch no real file exercises. That is the right instinct — an
untested path that only wakes up during someone else's refactor is how this repo
gets bitten.

**`VA.CROP_RULES` asked and answered: yes.** Not left unasked, and it is genuinely
the strongest of the three — set equality mechanically pins *both* decisions in
that table's comment (`provenance.sources_used` may not return, `joint_export_run`
may not be deleted).

### Claims re-derived rather than read

Every line number and factual claim in the two new issues and the lesson, checked
against the file:

- `stack.py:69` `EXPORT_STATUSES`, `thermal.py:135` membership test,
  `spec_library.py:66` `CONFIDENCES`, `build_viewer_projection.py:74`
  `CONFIDENCE_ORDER`, `viewer.js:67` `VA.CONFIDENCES`, `:69`
  `VA.CONFIDENCE_LABEL`, `:84` `verdictClass`, `:343` the `materials.py` comment —
  **all exact**.
- `SourceRef(kind="drawing", document="x", confidence="banana")` **constructs**.
  Confirmed by running it. The `VA.CONFIDENCES` issue's load-bearing claim is
  true, and its ordering (validate first, pair second) is right.
- `tolerance_stack/materials.py` does not exist; the package is `__init__`,
  `__main__`, `spec_library`, `stack`, `thermal`. The low-priority issue is real.
- Both new issues open with a complete `---` frontmatter block, `priority` spelled
  from the legal set (`med`, `low`). The closed issue moved `triaged → resolved`
  with a dated resolution note.

### Suites — and which checkout produced each number

- **Python, review worktree** (`C:\workspace\tolstack-worktrees\js_python_vocabulary_pairing-review`,
  main checkout's interpreter): **357 passed, 1 skipped**. The skip is
  `test_viewer_js_suite` (no `data/` in a worktree).
- **The baseline the lesson quotes**, re-derived rather than accepted: the same
  tree with `--ignore=tests/test_js_python_vocabulary.py` is **350 passed, 1
  skipped**. So 350 + 7 = 357 reproduces exactly, both halves.
- **JS: 118/118**, `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`,
  **node-fs tier confirmed to have run** (the runner printed its repo root; no
  `SKIP node-fs tier` line).
- **Main checkout (`C:\workspace\tolstack`) after the merge landed**: **358
  passed, 0 skipped** — the same 358 tests, with `test_viewer_js_suite` *running*
  instead of skipping because `data/` exists there. The worktree/main-checkout gap
  the overlay warns about is exactly one test, as it has been since
  `gitignore_data_precedence`. `data/projections/viewer/results.json` carried the
  same mtime before and after the run: the suite left production data alone.
- `git log --oneline HEAD..master` empty — no sibling handoff landed during the
  review.
- The suite touches no production data: the new module only reads tracked source
  files, and the projections under `data/projections/viewer/` still carry their
  `2026-08-12T23:41` build stamps.

### Not applicable, stated so a reader can tell

`data/inbox/specs/` untouched (no `data/` paths in the diff); nothing written to
drawing-checker (the diff touches `tests/` and `docs/` only, and no run was
executed); no `PROVENANCE.md` row implicated; no projection rebuilt, because
nothing feeding one changed; no document count claims added — the lesson's
numbers are suite counts and live-instance counts, and both re-derive.

## Findings

### Should-fix — fixed inline on the review branch

**S1 — `assert len(tables) == 3` is a cached count in the anti-vacuity assertion.**
`tests/test_js_python_vocabulary.py`, `test_the_extraction_found_every_table_and_none_of_them_is_empty`.
`tables` is built from the `PAIRINGS` constant two screens up, so the digit is
`len(PAIRINGS)` written out by hand. The change that breaks it is the one **this
handoff itself filed**: `ISSUE_..._the_confidence_vocabulary_has_no_single_definition_...`
step 4 adds the fourth pairing, and the assertion then fails with a bare
`4 == 3` and no hint of why — in the one assertion whose job is to prove the
module is not vacuous. This is the overlay's *"audit the guard's own demonstration
for a cached live count"* entry, fifth sighting; the previous four were live-data
counts, so I appended the variant rather than only counting it.
**Fixed:** `assert len(tables) == len(PAIRINGS)`, with a comment saying what it
still catches (two rows naming one table, which the dict comprehension collapses).

### Nits — fixed inline on the review branch

**N1 — the docstring's regex-literal claim is false as written, and true only
per-span.** The module says a `/}/` inside a table would end the scan early "and
`viewer.js` contains none"; the lesson repeats it. `viewer.js` carries **four**
regex literals — lines 240, 452, 462, 463, all `String(x).replace(/\\/g, "/")`
shaped. The extraction is unaffected: the three table bodies span 202–216,
352–379 and 498–521 and every literal is outside them, so the scanner never
reaches one. But the sentence a future reader would lean on is wrong, and the
per-span version is both true and a better instruction. Corrected in the docstring
and the lesson, with the spans and line numbers written down.

**N2 — two constructs missing from the "what it cannot see" list.** That list is
the honest half of a hand-rolled scanner and is read as checked, so it should be
complete. (a) A depth-1 ternary — `a: cond ? yes : no` yields a spurious key
`yes`; verified against the scanner directly. Fails **loud** (the pairing goes red
naming a key Python cannot emit) but misdescribes the cause. (b)
`js_table_mutations` matches `VA.<NAME>.x =` and `VA.<NAME>[x] =` but not
`Object.assign(VA.<NAME>, {...})`, so "the only other way a key can arrive" and
the lesson's "the two together are total" overclaim by one form — and *that* one
is silent, which makes it the only real hole. Both added to the docstring and the
lesson, sorted by direction (loud vs silent), neither patched: hardening the
scanner is more risk than a safe-direction failure is worth, and the silent case
has no instance today.

None of the three changes the guard's behaviour; the full suite is green after
them and I re-replayed a poison to confirm the module still bites.

## Note for the next reviewer

The two filed issues are both real and both verified here — in particular
`SourceRef.confidence` accepting `"banana"` is an unvalidated enumerated field in
the repo whose founding rule is that no number arrives unsourced. Step 1 of that
issue (validate it) is worth doing on its own merits before the pairing work.

When `VA.CONFIDENCES` is eventually paired, it is an **array**, not an object
literal, so it needs a sibling to `js_object_keys` — and the same two anti-vacuity
assertions (raise on a missing name, refuse an empty result) must be written for
it. The value of this module is entirely in those assertions; a sibling extractor
without them would re-open the hole this handoff closed.

## Verdict

**APPROVE** — 0 blockers. One should-fix and two nits, all fixed inline on the
review branch and all documentation or a one-line expression change; none of them
alters what the guard checks.
