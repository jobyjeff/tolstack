---
type: review
handoff: docs/sessions/completed/HANDOFF_20260817_confidence_vocabulary_single_definition.md
reviewer: review agent (dispatch)
date: 2026-08-18
verdict: APPROVE
blockers: 0
---

# Review — `confidence_vocabulary_single_definition`

Work reviewed: `handoff/confidence_vocabulary_single_definition` (`17e757b`,
`bbdff54`), merged into `review/confidence_vocabulary_single_definition` on top of
`master` `7b646b4`. Nine files, `+618 / −54`; `git diff -w --stat` collapses it to
`+614 / −50`, so nothing is hiding inside a reformat.

`git log --oneline HEAD..master` was empty before the merge — the only commit
`master` carried past the branch's base was the board move that staged this handoff.
No sibling handoff landed while I reviewed.

## The seven mandatory stack checks do not apply

Same disposition as `REVIEW_20260812_js_python_vocabulary_pairing`, and confirmed
from the diff rather than assumed. This handoff adds no stack, element, path, check,
citation, material or hardware entry. Nothing under `docs/tolerance_stacks/`,
`data/` or `apps/` changed; `apps/viewer/viewer.js` was **not** edited, which the
handoff asked to be stated explicitly. So no tolerance, sign, LMC/MMC mapping, RSS
column, nominal, castellation caveat or provenance address moved, and there is no
new number to trace to a document.

Two of the seven still have something to say here, so they are answered rather than
waived:

- **Check 1 (provenance) / check 7 (the ratio).** The one behavioural risk in this
  diff is that `confidence_of_ref` dropped its `or "untraced"` fallback, which
  could in principle have re-labelled a citation. It did not: I rebuilt the
  projection from the merged tree into a scratch data-root and compared it to the
  live `data/projections/viewer/results.json` with `built_at` and `provenance`
  popped — **equal**, key for key. Re-derived with the one computing command
  (`tests/debug_report_tolerance_stacks.py --ratio`), the ratio is unmoved:
  **5 traced / 3 inferred / 18 untraced, out of 26 element instances** across the
  three seeded slice-1 stacks, and 21 / 7 / 20 out of 48 across all six.
- **`fold()` untouched.** Confirmed from the diff: `stack.py`'s change is one new
  module constant and one `__post_init__` on `SourceRef`. No second combiner, in
  Python or in JS.

## The universal check: the new guard has been observed failing

Four guards ship here. I broke each one rather than reading it, reverted every
poison, and `git status --porcelain` was clean after each.

| poison | result |
|---|---|
| `SourceRef(kind="drawing", document="x", confidence="banana")` on **`master`** | **constructs**, returning `banana` — the defect reproduced before the fix |
| the same on the merged tree | `ValueError`, naming the vocabulary and the value |
| `SourceRef(..., confidence="no_source_ref")` | refused, with the sentence explaining why a citation cannot assert its own absence |
| a fourth word in `stack.CONFIDENCES` | `build_viewer_projection` **refuses to import**: *"unranked here: ['assumed']"* |
| a word in `CONFIDENCE_ORDER` that is not a confidence | same guard, other direction: *"ranked here but not a confidence: ['bogus']"* |
| `NO_SOURCE_REF` → `"no_citation"` (the **Python**-side mutation the DoD asks for) | exactly one test red — `…spells_exactly_what_python_enumerates[CONFIDENCES]` — naming both directions and both files |
| `VA.CONFIDENCES` emptied to `[]` | 2 red, the anti-vacuity one first: *"extracted zero keys … would make this module's comparisons pass against anything"* |
| `VA.CONFIDENCES` renamed away | 4 red with `LookupError` — not a vacuous pass |
| `VA.CONFIDENCES = ["traced", INFERRED]` | `ValueError`, refusing the unresolvable element |

The DoD asked for one mutation and the lesson recorded the JS side (`no_source_ref`
→ `no_source_refs`); the Python side above is mine, so both directions of the
pairing are now demonstrated. The import-time coverage check is the strongest thing
in the diff: it makes deliverable 2's "assert it *covers* the vocabulary" fail at
import of the producer, not at test time.

## The deliverables

1. **One definition.** `CONFIDENCES` in `tolerance_stack/stack.py:267`; the
   end-of-line comment is gone, replaced by `# one of CONFIDENCES, above`.
   `__post_init__` validates. Pinned by
   `test_a_source_ref_refuses_a_confidence_outside_the_vocabulary`, which covers a
   misspelling, the empty string, a case variant, `no_source_ref`, the `from_dict`
   path and the field default. I confirmed the default is a member and that
   `from_dict` with no `confidence` still yields `untraced`.
2. **The copies read it.** `spec_library.CONFIDENCES = STACK_CONFIDENCES`;
   `CONFIDENCE_ORDER` keeps the rank and is coverage-checked both ways. The DoD's
   grep reproduces **exactly** as the lesson prints it — three hits, at
   `stack.py:267`, `stack.py:299` and `build_viewer_projection.py:82`, each a
   different kind of thing. The lesson's "On 'one list', honestly" section is the
   right way to have written that up: the DoD's literal wording ("exactly one
   Python list") and deliverable 2's ("keep the order list") pull against each
   other, and the author resolved it in the direction the handoff body specified
   and said so.
3. **`no_source_ref` placed, with the reason written down.** `NO_SOURCE_REF` beside
   `confidence_of_ref` in the projection, with the argument that admitting it to
   the citation vocabulary would make `SourceRef(confidence="no_source_ref")`
   constructible. `PROJECTION_CONFIDENCES = CONFIDENCE_ORDER + [NO_SOURCE_REF]` is
   what the pairing reads, so the fourth word is reached by derivation and not
   pinned in a third copy. The two simplifications that fell out
   (`worst_confidence`, `count_confidence`) are behaviour-preserving — proven by
   the byte-equal projection rebuild above, not by reading.
4. **The pairing.** `js_array_strings` added, `PAIRINGS` gained an extractor column
   rather than the extractor guessing from the source, and `js_table_mutations`
   learned `push`/`unshift`/`splice`. `len(PAIRINGS)` is 6 and the module docstring
   says "Six vocabularies" — recounted. Anti-vacuity assertions apply to the new
   row unchanged (replayed above).

## Also verified

- **Tests, re-run rather than trusted, in BOTH checkouts.** Review worktree,
  main checkout's interpreter: **441 passed, 1 skipped** — matching the lesson,
  which correctly says which checkout produced it. After the merge landed,
  `C:\workspace\tolstack` on `master`: **442 passed, 0 skipped**, and the JS suite
  there is **131/131 with the node-fs tier running**. The one-test gap is the
  data-dependent skip this repo's checklist pins; `PROVENANCE.md` quoted only the
  worktree figure and now names both.
- **The viewer's JS suite, both tiers, and I say which.** `node
  apps/viewer/run_tests.cjs` → **102/102, node-fs tier SKIPPED**;
  `node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack` → **131/131, tier
  ran**. Both match the lesson.
- **`no_source_ref` really has zero live instances.** Counted off the main
  checkout's `results.json`, not off the prose: 48 elements, 21 `traced` /
  7 `inferred` / 20 `untraced`, no `no_source_ref`. That is what makes this pairing
  worth having — `apps/viewer/tests.js`'s `VALUE_GUARDS` row runs on live data and
  cannot see a rename of a value nothing emits.
- **`VA.CONFIDENCE_LABEL` is a second JS copy of the same vocabulary and nothing
  pairs it** — so I checked whether it is unguarded. It is not: deleting its
  `no_source_ref` row takes the JS suite to **130/131**. No finding.
- **Projections.** Rebuilt from the merged tree (see above); byte-equal, so `data/`
  needed no rebuild and no committed claim was made against a different tree. The
  spec-library projection is untouched — `docs/spec_library/events/` did not move.
- **`data/` untouched, `data/inbox/specs/` not reorganised.** No `data/` path
  appears in the diff.
- **Nothing written into drawing-checker**, checked by content and not by
  `git status` over there: newest run directory is `20260817_173142_…`
  (mtime 2026-08-17 17:34), newest `data/inbox/drawings/` file 2026-08-13 — both
  predate this handoff's session and this review. 62 runs, 30 drawings.
- **`ARCHITECTURE.md` inventory.** No file was added to `scripts/` or
  `tolerance_stack/`, so no new row is owed. The `stack.py` contents table lists
  dataclasses and functions, not module constants, so `CONFIDENCES` correctly does
  not appear. `spec_library.py`'s row still reads "stdlib only", which stays true —
  its new import is intra-package, not a dependency. (One pre-existing staleness in
  that block is filed below.)
- **`PROVENANCE.md`.** `test_this_branch_amended_the_row_of_every_imported_file_it_changed`
  is green, and I checked the harder half the test cannot: are the amendments
  *true*, and the right *size*? Three rows amended, three imported files changed,
  and `git diff -w master...HEAD -- tests/test_tolerance_stack.py` confirms "one
  test added, none removed, no count and no value changed". Two claims inside those
  rows were wrong; both fixed inline, below.
- **Harness artifacts and template stamps.** `tail` of both created files is prose;
  the diff contains no `</invoke>`, `</content>`, `<parameter` or `{{`.
- **File, don't fix.** The handoff's own out-of-scope finding
  (`ISSUE_20260818_three_more_field_vocabularies_are_defined_by_a_comment.md`) is
  filed correctly, with frontmatter, a priority, and a fix shape. Its central claim
  is right and I re-derived it: on `master`, `SourceRef(kind="banana")` constructs.
  Correcting the issue and the handoff's shared premise — that `kind` *was*
  validated — in the lesson rather than silently building on it is the best thing
  in this handoff.

## Findings

No blockers. Three should-fix items, all in prose, all **fixed inline on the review
branch** (`ddd6756`); nits after.

### should-fix (fixed inline)

1. **`tests/test_js_python_vocabulary.py:229` — the new extractor's own exemption
   clause was the silent-drop hole it forbids.** `js_array_strings` announced
   *"anything at depth 1 that is not a string, a separator **or a nested bracket**
   raises"*, and an opening bracket incremented `depth` while elements are collected
   at depth 1 only. `js_array_strings('VA.THINGS = ["a", ["b"]];', "THINGS")`
   returned `{"a"}` — a vocabulary word dropped in silence, in the one function
   written to make that impossible. (A nested *object* happened to raise, on its
   key identifier, which is why a five-second probe reads as "validated".) **Fix:**
   the opening bracket now falls through to the refusal, with both nested shapes
   added to `test_the_array_extractor_fails_loudly_rather_than_dropping_a_value`.
2. **`tests/test_js_python_vocabulary.py:66` — the regex-literal caveat still
   described three tables at 2026-08-12 line numbers.** The handoff bumped "Five
   vocabularies" to "Six" in the header table twenty lines above and left *"all four
   are outside the three table bodies, which today span 202-216, 352-379 and
   498-521"* below it. Both halves are stale (tables four and five arrived
   2026-08-13). The *substance* survives — re-derived: four regex literals at 321,
   556, 566, 567; six table bodies at 67, 97-108, 243-257, 288-295, 455-483,
   602-625; no overlap. **Fix:** re-derived, re-dated, and marked as digits to
   recompute rather than trust.
3. **`PROVENANCE.md:96` and the lesson both name the wrong test, and the row's
   `values_source` count is stale.** The second assertion the handoff rewrote is in
   `test_every_inline_hardware_entry_cites_where_its_values_came_from`
   (`tests/test_tolerance_stack.py:1780`), not
   `test_every_hardware_entry_has_a_gap_list_and_a_resolvable_values_status`
   (`:1909`) — a different test, never touched. Both exist and both read the raw
   JSON, so the argument holds and a `grep -c` for the name returns 1; but the
   sentence is the one telling a future agent *not to delete that line*, so the
   pointer aims them at the wrong function. Separately the same row says *"all 9
   filled `values_source` blocks"*; `hardware_entries.json` has 15 entries, **11**
   with a filled `values_source` and 4 `not_transcribed` without. All spell a valid
   word, so the claim's substance is right and only the digit is wrong. **Fix:**
   both corrected in `PROVENANCE.md` and the lesson, with the correction shown
   rather than overwritten.

### nits (not fixed)

- `scripts/build_viewer_projection.py:84-85` — `_unranked` and `_unknown` are
  module-level and outlive the check, so `build_viewer_projection._unranked` is a
  public-ish `[]`. A trailing `del` would tidy it; nothing reads them.
- The lesson calls `concat` a remaining hole in `js_table_mutations` alongside
  `Object.assign`. `Object.assign` is one; `concat` returns a new array and mutates
  nothing, and the `VA.X = VA.X.concat(...)` form is caught by the assignment
  pattern. Overclaimed in the safe direction, inherited from the pre-existing
  docstring.
- `ARCHITECTURE.md:18` says `stack.py` is *"~330 lines"*; it is **728** (686 before
  this handoff, so the error long predates it). Out of scope, filed as
  `ISSUE_20260818_architecture_module_inventory_line_count_is_stale.md`.

## For the next reviewer

Two overlay entries were touched, on this branch, in
`docs/prompts/REVIEW_AGENT.md`:

- a **second sighting** appended to *"A hand-rolled parser's 'what it cannot see'
  list is an argument"* — the new twist being that the hole lived in the rule's
  **exemption clause**, so the sentence stayed literally true while the behaviour
  was the forbidden one. Read a "this raises" rule for what it exempts, and feed
  the extractor each exempted construct.
- a **new entry**: *"A doc citing a symbol by name — resolve the name to the thing
  that actually changed."* This is the stale-count family's non-numeric member and
  it defeats every existence check the repo has, because the name is real. One
  command settles it: `git diff master...HEAD -- <file>` and check the hunk falls
  inside the named symbol.

The thing worth copying from this handoff into the next one: the coverage check
that **refuses to import** rather than failing a test. It puts the failure in front
of whoever edits the vocabulary, in the producer, before any suite runs.
