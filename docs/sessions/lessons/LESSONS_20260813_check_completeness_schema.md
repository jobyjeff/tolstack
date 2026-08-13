# LESSONS 2026-08-13 — check_completeness_schema

Handoff: `HANDOFF_20260813_check_completeness_schema.md`.
Brief: `docs/strategy/BRIEF_20260806_check_completeness_schema.md`.
Issue closed: `ISSUE_20260805_check_result_has_no_complete_flag.md` (`resolved`).
Baseline: trunk `e22d5df` (master has since moved to `48f66e0`, a board move —
nothing in it touches this work).

Suites, run **in this worktree**
(`C:\workspace\tolstack-worktrees\check_completeness_schema`) with the main
checkout's interpreter (`C:\workspace\tolstack\venv-win\Scripts\python.exe`):
**Python 374 passed / 1 skipped** (the baseline was 357/1 measured the same way —
358/0 in the main checkout, where the one data-dependent test runs instead of
skipping; the skip is `test_viewer_js_suite`'s node-fs tier, which reports that a
worktree has no `data/`). The 17 new tests: 8 in `test_tolerance_stack.py`, 9 in
`test_viewer_projection.py` (4 of them one parametrized case each).
**JS 121/121**, run as `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`
(was 118/121 until the live projection was rebuilt — see below).

## The consumer count the handoff asked for: **one**

The brief's question 1 was whether `verdict_scope` should be a second field or a
new value in `verdict`'s domain, and it said *count the consumers first*. Counted:

| what | where | would a fourth verdict value break it? |
|---|---|---|
| `VA.verdictClass` | `apps/viewer/viewer.js:84` | **yes** — the only place in the repo that *enumerates* `["pass", "marginal", "fail"]` |
| `.verdict--pass/marginal/fail/unknown` | `apps/viewer/index.html:134-137` | yes, 4 CSS rules keyed on what that function returns |
| 15 assertions pinning a specific verdict | `tests/` | yes, wherever the new value applied |
| 2 report printers | `tests/debug_report_tolerance_stacks.py:79`, `debug_report_thermal_fit.py:67` | no — they print the string |
| `checks[].verdict` shape guard | `apps/viewer/tests.js` `VALUE_GUARDS` | no — it *asks* `verdictClass` rather than re-listing the values |

So the disruption of changing the domain was small in absolute terms — **exactly
one branching site**. The decision still went the settled way, and the count is
the reason to record *why*: it was never a cost argument. `fail` on an incomplete
check is a **correct** verdict about the model and a wrong one about the
hardware, so a fourth value would have replaced a true statement with a vaguer
one. Scope is a second axis because it *is* a second question. Had the count come
back at 40, the answer would have been the same.

The one branching site is now paired with Python by
`tests/test_js_python_vocabulary.py` (a fourth pairing, `VA.VERDICT_SCOPES`
against `stack.VERDICT_SCOPES`) — worth doing here specifically because `budget`
had **zero live instances** until the same commit migrated the pitch-link stack,
which is the live-data blind spot that module exists for.

## The SOP wording change

`docs/SOP_TOLERANCE_STACK.md` Step 5c, the "when an element cannot be sourced at
all" recipe. Before, first bullet:

> put `INCOMPLETE — <what is missing>` in the check `label`;

After: set `"complete": false` and name the terms in `"excluded_terms"`, with the
bidirectional invariant stated and **an explicit instruction not to re-shout
`INCOMPLETE` in the label**. The third bullet kept the sentence the whole design
turns on and made it the definition of the new field:

> expect a verdict that is `fail` or `pass` **by construction**. That verdict is
> not a design conclusion — **it is true of the model and false of the hardware**
> — and that is what `complete: false` states: the check's derived
> `verdict_scope` becomes `budget` instead of `joint` […] `verdict` itself still
> reads `pass | marginal | fail` and means what it always did.

The `gaps` bullet also changed from an instruction to a consequence ("this
happens by writing the field"), because the viewer's gap list is now built from
`excluded_terms`. And the closing line lost a word that had quietly become
wrong: *"A check with a hole in it, ~~labelled~~ **declared in the schema**,
beats a check with a guess in it."*

## Decisions I made that the handoff did not settle

* **`configuration.excluded` is gone, not kept in parallel.** The handoff says to
  migrate the checks to the schema fields; it does not say what happens to the
  free-text dict key the gap list used to read. Keeping both would have recreated
  the defect one level down — a check could carry `excluded` without
  `excluded_terms`, and the gap list and the striped card could disagree. So
  `stack_gaps` reads `excluded_terms` and the two pitch-link checks dropped the
  `configuration.excluded` key. `gaps[].kind` is unchanged
  (`excluded_from_model`), so nothing downstream of the gap list moved.
* **The `incomplete` key was removed from the projection**, not left beside
  `verdict_scope`. Same reason the string search had to die rather than coexist;
  `test_no_projected_check_still_carries_the_deleted_prose_flag` pins it.
* **The viewer's class and chip were renamed** `check--incomplete` →
  `check--budget`, `chip--incomplete` → `chip--budget`, and the chip now reads
  `BUDGET` rather than `INCOMPLETE`. Leaving the word in the JS would have left
  the magic string alive in the one place a reader most needs it to be a field.
* **`docs/prompts/REVIEW_AGENT.md` was updated**, which is outside the handoff's
  listed scope. Its checklist had an item instructing reviewers to check that
  `configuration.excluded` and the INCOMPLETE label agree "because nothing
  validates the pairing" — a live instruction to inspect a deleted function.
  Rewritten to say what still needs a human (do the `excluded_terms` *strings*
  say what is missing and why) and what is now a test.

## Things the next agent would otherwise rediscover

* **The two `[real]` JS failures after this change are not bugs — the shared
  projection is stale.** `apps/viewer/tests.js`'s `[real]` tier reads
  `C:\workspace\tolstack\data\projections\viewer\results.json`, which is built
  from *some* tree and shared by every worktree. Until it is rebuilt, the fixture
  shape guard reports `fixtures.js` writing `[complete, excluded_terms,
  verdict_scope]` that "no live object does", and the value guard reports
  `verdict_scope = undefined` live. Rebuild from the worktree, into the main
  checkout's `data/`:

      C:/workspace/tolstack/venv-win/Scripts/python.exe \
          scripts/build_viewer_projection.py --data-root C:/workspace/tolstack/data

  The provenance gate allows it because this tree contains the tree that built
  the previous one. It warns about the dirty tree and about being a commit behind
  master; both are true and neither blocks.
* **The DOM shim has no descendant combinator.** `run_tests.cjs`'s `matcher()`
  splits a selector at the *first* `.`, so `all(root, "article.check--budget
  .check__excluded")` silently matches **zero** nodes rather than raising — a
  test written that way passes its `eq(x.length, 0)` and proves nothing. Nest the
  calls instead: `all(all(root, "article.check--budget")[0], ".check__excluded")`.
* **`PROVENANCE.md` catches more rows than you expect.** Three, here:
  `tolerance_stack/stack.py` (obvious), `tests/test_tolerance_stack.py`
  (obvious), and `tolerance_stack/__init__.py` — because exporting the new
  **module constant** `VERDICT_SCOPES` edits it. That row already warned "a new
  public dataclass means this file changes"; it now says the same about a
  constant. Run `pytest tests/test_provenance.py -k amended` early rather than at
  the end.
* **A `@dataclass` that validates in `__post_init__` and normalises a field must
  not be `frozen`.** `CheckResult` coerces `excluded_terms` to a tuple there, so
  it stays a plain dataclass (it always was). If someone freezes it later, that
  assignment needs `object.__setattr__` — the same shape `SourceExport` avoids by
  validating without normalising.

## Left for the next agent

* **No stack in the repo other than the pitch-link one is incomplete**, so
  `budget` has exactly two live instances and both are in one stack. The
  `VA.VERDICT_SCOPES` pairing is what covers the case where that number goes back
  to zero.
* **`excluded_terms` free strings are unvalidated beyond non-emptiness.** That is
  deliberate (the brief's crux — an unsourced term has no element to reference),
  but it means the *quality* of the string is a review question, and the review
  checklist now says so. If a future stack writes `"excluded_terms": ["TBD"]`,
  nothing here catches it.
* **`docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md` was not
  touched.** Its prose about the stack being incomplete is authored English
  *about the analysis*, which is still exactly right, and it never quoted the
  check labels. Worth a read by whoever next edits it, in case they want the
  worksheet to name the schema fields.
</content>
</invoke>
