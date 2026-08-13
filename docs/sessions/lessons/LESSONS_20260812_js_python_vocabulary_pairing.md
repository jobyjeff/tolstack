# LESSONS 2026-08-12 — js_python_vocabulary_pairing

Handoff: `HANDOFF_20260812_js_python_vocabulary_pairing.md`.
Issue: `ISSUE_20260812_no_test_pairs_the_js_status_tables_with_the_python_vocabularies.md`.
Baseline: trunk after `restore_viewer_readme` merged (`d617c8e`).

Suites, **run in this worktree** (`C:\workspace\tolstack-worktrees\js_python_vocabulary_pairing`)
with the main checkout's interpreter (`C:\workspace\tolstack\venv-win\Scripts\python.exe`):
**Python 357 passed / 1 skipped** (was 350/1 — the seven new tests are mine; the
skip is `test_viewer_js_suite`, which reports the node-fs tier had no projection
because a worktree has no `data/`). **JS 118/118**, run as
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`. Nothing under
`apps/` or `tolerance_stack/` changed, so the JS number is trunk's.

New file: `tests/test_js_python_vocabulary.py`. It is a **new module, not an
addition to `test_sop_vocabulary.py`** — that module is about markdown drifting
from code and every helper in it parses the SOP; this is code-to-code across two
languages and shares none of that machinery. What it does borrow is that module's
rule, and it is the whole design: never pin a vocabulary in a third copy of it.

## Three pairings, not two — `VA.CROP_RULES` is in, and the answer is **yes**

The handoff asks whether `VA.CROP_RULES` is a third hand-copied vocabulary this
test should cover. **Yes, and it is covered.** It has exactly the same blind spot
for exactly the same reason:

* `apps/viewer/tests.js`'s `[real] every rule in the live crops.json has a label`
  reads `summary.by_resolved_by` — **live data**.
* `joint_export_run` has **zero live instances**. The comment above `VA.CROP_RULES`
  says so itself: it is kept because a stack written before 2026-08-06 would still
  resolve through it, and no stack in the repo is shaped that way any more. So the
  one rule most likely to be quietly renamed is the one the live guard cannot see.

The Python side is `scripts/build_viewer_crops.py`, which has **no enumeration to
import** — the three rules are string literals in the three `resolve_pdf` branches
that succeed. So the test AST-walks the script for dict literals carrying a
constant `"resolved_by"`, which is still the definition rather than a copy. The
fourth site (`"resolved_by": resolved["resolved_by"]`, where the crop entry is
assembled) forwards a value rather than minting one, and the `isinstance` test
drops it.

A bonus the set-equality direction buys: the pairing now mechanically enforces
**both** decisions recorded in that table's comment — `provenance.sources_used` may
not come back (the script cannot emit it), and `joint_export_run` may not be
deleted (the script still can).

There is a **fourth**, and it could not be added — see below.

## The JS extraction: a character scanner, and what it cannot see

Not a regex, because both tables it had to read contain the thing that defeats one:
`VA.EXPORT_STATUSES`'s comment block contains `sha256 VERIFIED`-style prose and
every table contains string literals with colons in them. Not a real parser either.
What `js_object_keys` does:

1. Anchor on `^([ \t]*)VA\.<NAME>\s*=\s*\{[ \t]*$` — and require **exactly one**
   match. Zero raises; two raises (a second definition would silently shadow the
   first for the scan).
2. Walk forward from the `{` counting `{[(` / `}])`, skipping `//` comments,
   `/* */` comments, and string literals with backslash escapes.
3. Take identifiers **and quoted keys** followed by `:` at depth 1. Quoted keys
   matter: the misspelling demo below turns `not_transcribed` into
   `"not-transcribed"`, which is legal JS and must be reported as a *drift*, not
   as an extraction failure.
4. Cross-check the brace match structurally: the closing brace must sit at the
   anchor line's own indent. If it does not, the scan drifted and the key set is
   refused rather than compared.

**What it cannot see**, stated because the next person will hit one of these:

* **Regex literals.** `/}/` inside a table would end the scan early. `viewer.js`
  contains no regex literal anywhere today (the only `/` runs are comments and
  division-free), and the indent cross-check in step 4 turns most such drifts into
  a raise rather than a wrong answer — but it is not a parser and will not become
  one for free.
* **A key attached from outside the literal** — `VA.CROP_RULES.foo = {...}` ten
  screens away. The scanner cannot follow it, so the module **refuses the pattern**
  instead: `test_no_key_is_attached_to_a_status_table_from_outside_its_literal`
  fails on any `VA.<NAME>.x =` or `VA.<NAME>[x] =` outside the definition line.
  That is the only other way a key can arrive, so the two together are total.
* **Values reached at runtime.** Nothing here executes JS. A table built by a loop
  would defeat it entirely; none is.

## Every extraction is asserted before anything is compared

This is the point of the handoff and it is worth restating: the guard being
replaced could not fail, so a replacement that also cannot fail is worse than
nothing — it reads as coverage. Three assertions carry it:

* all three tables found, each with a **non-empty** key set, each key a plausible
  key token;
* `js_object_keys` **raises `LookupError`** for a name that is not there (and for a
  name that is there twice) — asserted directly, so "no keys" can never quietly
  substitute for "no table";
* each Python side is asserted non-empty before the set comparison.

Demonstrated red, four ways, each reverted immediately (`git checkout --`):

| poison | result |
|---|---|
| a fourth value `estimated` in `thermal.py`'s tuple | 1 failed: *Python emits, the viewer has no branch for: `['estimated']`* |
| `not_transcribed` → `"not-transcribed"` in `VA.VALUES_STATUSES` | 1 failed, naming **both** directions of the drift |
| `VA.EXPORT_STATUSES` renamed away | 4 failed with `LookupError`, including the pairing test — **not** a vacuous pass |
| `VA.EXPORT_STATUSES.provisional = {...}` added elsewhere | 1 failed, naming the file line |

The hyphen demo caught a defect in my own first draft: the "is this a plausible
key" assertion used an identifier regex, so a legal quoted key with a hyphen
tripped *it* as well as the pairing test, and its message ("the scan is picking up
something else") was wrong about what had happened. Loosened to allow `.` and `-`,
which is what a quoted key can carry. **A poisoned run that produces two failures
is worth reading, not just counting** — the second one was mine.

## I did **not** move the `thermal.py` tuple to a named constant

Deliverable 2 offers the refactor and calls it arguably the better answer. I read
the scope line as overriding it: *"You may read `apps/viewer/viewer.js` and the
`tolerance_stack/` modules; do not modify either"*, plus **`thermal.py` is owned by
the dependent `material_cte_optional` handoff**. Editing the same three lines that
handoff exists to change buys a merge conflict for a stylistic gain.

Instead the test **AST-reads the membership check itself** —
`self.values_status not in (...)` inside `MaterialEntry.__post_init__`. That is
strictly better than reading a constant would have been, for a reason worth
keeping: what the viewer may have to render is whatever the **validator accepts**,
and a constant is only the same thing as long as it is the one the validator uses.

The refactor is anticipated rather than blocked: if the comparator becomes a
`Name`, the test resolves it through `getattr(tolerance_stack.thermal, ...)`. That
branch is exercised by `test_the_values_status_reader_also_handles_the_constant_refactor`
against a synthetic source, so `material_cte_optional` can promote the tuple
without touching this file **and** without an untested path waking up mid-refactor.
If it moves somewhere the extractor cannot follow, the `LookupError` message says
where to look and says explicitly not to hard-code the values here.

## The fourth vocabulary: `VA.CONFIDENCES`, and why it is an issue instead

`apps/viewer/viewer.js:67` — `["traced", "inferred", "untraced", "no_source_ref"]`
— is the same kind of hand-copy with the same live-data blind spot
(`no_source_ref` has **zero** live instances: the 48 elements are 21/7/20). It is
not in the test because **there is nothing to pair it against**:

* `stack.py:263` holds the vocabulary in an end-of-line *comment*, and `SourceRef`
  does not validate `confidence` at all — I checked by construction:
  `SourceRef(kind='drawing', document='x', confidence='banana')` **succeeds**.
  (`kind` *is* whitelisted, so this is an omission, not a policy.)
* `spec_library.py:66` and `build_viewer_projection.py:74` each hold their own
  three-value copy.
* `no_source_ref` is **synthesised** by `confidence_of_ref` and appears in none of
  the three lists.

A pairing test would have to name two sites and special-case a literal — the exact
defect these tests exist to prevent, one layer up. Filed as
`ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against.md`
(chore, med) with the fix ordered: give it one definition and validate against it
*first*, then the pairing is four lines (the only new machinery is an
array-literal sibling to `js_object_keys`, since `VA.CONFIDENCES` is an array).

Also filed, unrelated and trivial:
`ISSUE_20260812_viewer_js_cites_a_tolerance_stack_materials_py_that_does_not_exist.md`
— the comment above `VA.VALUES_STATUSES` points at `tolerance_stack/materials.py`;
the module is `thermal.py`. Not fixed inline because `viewer.js` is read-only for
this handoff.

## Things the next agent would otherwise rediscover

* **A worktree has no `venv-win`** (gitignored). Run the suite with the main
  checkout's interpreter from inside the worktree —
  `C:/workspace/tolstack/venv-win/Scripts/python.exe -m pytest -q` with the
  worktree as cwd. `rootdir` follows cwd, so it is this branch's tests that run;
  confirm with `-rs` that the only skip is the node-fs one.
* **The `--repo` forward-slash trap is still live** and still costs nothing only
  because two lessons in a row have warned about it:
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`. Backslashes make
  the node-fs tier *skip* while the headline still reads a green number and the
  exit code stays 0.
* **Poisoning production files to demonstrate a guard is the local convention**
  (`viewer_fixture_shape_guards`, `viewer_export_and_material_provenance` both did
  it). Revert with `git checkout -- <path>` and check `git status` after **each**
  one — a demo left in place is a production edit this handoff was not allowed to
  make.

## Left for the next agent

* **The `VA.CONFIDENCES` issue above is the real remaining work**, and its first
  step (validate `SourceRef.confidence`) is worth doing on its own merits — an
  unvalidated enumerated field is how a typo reaches the viewer as `conf--unknown`
  instead of failing at construction.
* **`VA.CONFIDENCE_LABEL`** (`viewer.js:69`) is a fifth table over the same
  vocabulary as `VA.CONFIDENCES`, and nothing asserts the two agree with each
  other, let alone with Python. One JS-side line in `apps/viewer/tests.js` would
  close the JS half of that (`Object.keys(VA.CONFIDENCE_LABEL)` vs
  `VA.CONFIDENCES`) and needs no Python at all. Left undone because this handoff's
  scope is `tests/`.
* **Nothing pairs the JS `verdictClass` list** (`["pass", "marginal", "fail"]`,
  `viewer.js:84`) with `CheckResult`'s verdict vocabulary in `stack.py`. All three
  have live instances, so the live guard covers it today; it is the same shape as
  the others and would fit the same test if a definition-side constant existed.
