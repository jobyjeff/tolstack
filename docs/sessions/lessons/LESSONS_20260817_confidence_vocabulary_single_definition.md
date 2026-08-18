# LESSONS — `confidence_vocabulary_single_definition` (worked 2026-08-18)

Handoff: `docs/sessions/active/HANDOFF_20260817_confidence_vocabulary_single_definition.md`,
from `ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against.md`.
Branch `handoff/confidence_vocabulary_single_definition`, one implementation commit
plus this one. `apps/viewer/viewer.js` was **not** edited — deliverable 3 did not
require it, which is worth stating explicitly because the handoff asked.

## Deliverable 3: where `no_source_ref` belongs, and why

**Decision: a named constant in `scripts/build_viewer_projection.py`
(`NO_SOURCE_REF`), beside `confidence_of_ref` which mints it — *not* membership in
`tolerance_stack.stack.CONFIDENCES`.** The issue offered this as a suggestion to
investigate; investigating it confirmed it, for a reason stronger than tidiness:

> A confidence answers *how well is this number supported*. `no_source_ref` answers
> *is there a citation at all*. Admitting it to the citation vocabulary would make
> `SourceRef(confidence="no_source_ref")` **constructible** — a citation asserting
> that it does not exist — and deliverable 1's whole point is that the constructor
> now refuses values that cannot be true. So the same edit that added the check
> settled where the fourth word lives: anywhere it can be validated against, it is
> wrong.

That decision creates the problem the handoff warned about — `VA.CONFIDENCES` is a
**four**-element array and the pairing must reach all four without pinning one in a
third copy. Solved by deriving, not by listing:

```
tolerance_stack/stack.py      CONFIDENCES = ("traced", "inferred", "untraced")   <- the definition
build_viewer_projection.py    CONFIDENCE_ORDER = [...]        rank only, checked to COVER CONFIDENCES
                              NO_SOURCE_REF = "no_source_ref" minted here, by the function that mints it
                              PROJECTION_CONFIDENCES = CONFIDENCE_ORDER + [NO_SOURCE_REF]
apps/viewer/viewer.js         VA.CONFIDENCES                  the hand-copy, paired against the line above
```

`PROJECTION_CONFIDENCES` is the projection's **rendered** vocabulary and the only
thing the pairing reads. It restates nothing.

Two follow-on simplifications fell out and are in the commit: `worst_confidence`
dropped its `if counts.get("no_source_ref")` special case (the value is simply last
in `PROJECTION_CONFIDENCES`, which is rank order weakest-last, so `reversed()`
reaches it first), and `count_confidence` keys off `PROJECTION_CONFIDENCES` instead
of `CONFIDENCE_ORDER` plus a hand-added key. Behaviour is identical — see the
projection diff below.

### On "one list", honestly

`CONFIDENCE_ORDER` still spells the three words. It has to: an *order* cannot be
expressed without naming what is ordered, and the handoff was explicit that order
is a separate concern and the list should stay. What changed is that it can no
longer **drift**: a module-level check raises at import if it does not cover
`CONFIDENCES` exactly, in either direction. Rename a word in `stack.py` and the
projection script refuses to import until a human re-ranks it — which is the
decision only a human can make. Read the grep below as "one *definition*, one
*ranking* of it, and the ranking is mechanically pinned to the definition", not as
"the string `untraced` appears once".

## The grep the definition of done asks for

```
$ grep -rn '"untraced"' tolerance_stack/ scripts/
tolerance_stack/stack.py:267:CONFIDENCES = ("traced", "inferred", "untraced")
tolerance_stack/stack.py:299:    confidence: str = "untraced"    # one of CONFIDENCES, above
scripts/build_viewer_projection.py:82:CONFIDENCE_ORDER = ["traced", "inferred", "untraced"]
```

Three hits, and each is a different kind of thing: the **definition**; the field
**default** (a single value, not a list — and the new test asserts it is a member,
so it cannot drift out of the vocabulary either); and the **rank**, guarded as
above. `spec_library.CONFIDENCES` is gone from this grep entirely — it is now
`CONFIDENCES = STACK_CONFIDENCES`.

`tests/` was out of the definition-of-done's scope but had two hand-copies of the
same tuple; both now read `CONFIDENCES` imported from the package. One of them is
**not** redundant with the dataclass check and should not be deleted by a later
tidy-up: `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status`
reads `hardware_entries.json` as raw JSON and never constructs a `SourceRef`.

## Is a fifth vocabulary still defined by a comment? Yes — three

Filed as `docs/issues/ISSUE_20260818_three_more_field_vocabularies_are_defined_by_a_comment.md`
rather than fixed here (file, don't fix). Summarised because the handoff asked for
the **shape**, and the shape is: *a `str` field whose domain is an end-of-line
comment, with the real whitelist living in whichever tests happened to need one.*

- **`SourceRef.kind`** (`stack.py:286`) — six words in a comment, no constant, no
  validation, two identical tuples in `tests/test_tolerance_stack.py` (`:692`,
  `:1807`). Exactly the defect this handoff just fixed one field over, and the one
  to do next: `SourceRef.__post_init__` now exists, so it is one `if`.
- **`StackElement.role`** (`stack.py:338`) — eight words, one test copy (`:947`).
- **`SpecEntry.subject_kind`** (`spec_library.py:217`) — three words, and **nothing
  else anywhere**: no constant, no test whitelist, no enumerating consumer. An
  event file can spell `partnumber` today and nothing fails.

`SpecEntry.kind` (`spec_library.py:487`) looks like a fourth and is not — it ends
in `| ...`, so it is free text with examples. The tell for a real one is a
**closed** pipe list.

## Correct the record: `SourceRef` did not validate `kind`

Both the issue and the handoff derived from it state that *"`SourceRef` validates
`kind` against a whitelist and does not validate `confidence` at all"*. The second
half was true. **The first half was not** — before this handoff `SourceRef` had no
`__post_init__` at all, and neither field was checked. `docs/SOP_TOLERANCE_STACK.md:352`
carries the same mistaken belief in prose (*"A new kind must be added to all three,
or the SOP is describing something the code will not accept"* — the code accepts it
silently). Nothing was built on the wrong half, since the deliverable was
`confidence` either way, but if you are here to do `kind` next: you are adding the
first check, not copying an existing one.

## Verification, exactly as run

- **Python suite, in the worktree** with the main checkout's interpreter
  (`C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`):
  **441 passed, 1 skipped**. 124 tests collected from `tests/test_tolerance_stack.py`,
  11 from `tests/test_js_python_vocabulary.py`.
- **The one skip is `test_viewer_js_suite`'s node-fs tier**, and that test's own
  message tells you how to cover it. Run from the worktree:
  `node apps/viewer/run_tests.cjs --repo C:\workspace\tolstack` → **131/131**,
  every `[real]` test green against the live projection. Without `--repo`:
  **102/102**, node-fs tier skipped. **This is what "green in both checkouts" can
  mean before a merge** — the main checkout is on `master` and does not have the
  branch's code, so the honest procedure is: worktree suite for Python, `--repo`
  for the tier that needs real data. Say which you ran; do not claim the other.
- **The projection is unchanged.** Rebuilt from the worktree into a scratch
  data-root (`build_viewer_projection.py --data-root <scratch>`) and compared to
  the live `data/projections/viewer/results.json` with the `built_at`/provenance
  stamp popped: **equal**. So `data/` needed no rebuild and the live file is not
  stale against this branch.
- **The mutation demonstration** (definition of done asks for one; this is the
  **JS** side): `no_source_ref` → `no_source_refs` in `apps/viewer/viewer.js:67`
  reddens exactly `test_the_js_status_table_spells_exactly_what_python_enumerates[CONFIDENCES]`,
  naming both directions — *Python emits, the viewer has no branch for:
  `['no_source_ref']`* / *the viewer has a branch for, Python cannot emit:
  `['no_source_refs']`*. Reverted with `git checkout --`.

## Gotchas for the next agent here

- **`js_array_strings` is not a second scanner, but PAIRINGS rows now carry which
  extractor to use.** `VA.CONFIDENCES` is an array, the other five tables are
  object literals, and `PAIRINGS` gained a column rather than the extractor
  guessing from the source. If you add a seventh vocabulary, pick the column value;
  don't teach `js_object_keys` to also read arrays.
- **The array reader raises on a non-string element, on purpose.** An identifier
  element (`VA.CONFIDENCES = [TRACED, ...]`) is a vocabulary word only the JS
  runtime can resolve, and *skipping* it would shrink the compared set silently —
  this module's own failure mode, one layer down. `js_object_keys` needs no
  analogue because an object key is always written out.
- **`js_table_mutations` now also refuses `push`/`unshift`/`splice`.** For an object
  table the realistic way a key arrives from outside is an assignment; for an array
  it is a `push`, and the assignment regex cannot see one. `Object.assign` and
  `concat` are still holes, as the module docstring already said.
- **`test_this_branch_amended_the_row_of_every_imported_file_it_changed` will fail
  you** for `tolerance_stack/__init__.py` (PROVENANCE.md:83),
  `tolerance_stack/stack.py` (:84) and `tests/test_tolerance_stack.py` (:96). It
  does **not** ask for `scripts/build_viewer_projection.py`,
  `tolerance_stack/spec_library.py` or `tests/test_js_python_vocabulary.py` — those
  were written here, not imported from drawing-checker, and their rows say **not
  imported**. Only the imported files have amendable rows.
- **`spec_library.py` can safely import from `stack.py`.** No cycle:
  `stack.py` imports nothing from the package, and the CLI is `python -m
  tolerance_stack` (via `__main__.py`), never `python tolerance_stack/spec_library.py`,
  so the package-absolute import resolves.
- **Writing PowerShell here-strings with Python in them mangles the source.** Two
  attempts at `python.exe -c @'...'@` came back as `SyntaxError: '(' was never
  closed`. Write the script to the scratchpad and pass the path.

## Follow-ups (filed, not fixed)

- `ISSUE_20260818_three_more_field_vocabularies_are_defined_by_a_comment.md` — the
  three above, with the fix shape that worked here.
- Not filed, because it is one line inside that issue: `docs/SOP_TOLERANCE_STACK.md:352`
  describes a `kind` check that does not exist. It becomes true the moment `kind`
  is validated, so it belongs to that work rather than to its own handoff.
