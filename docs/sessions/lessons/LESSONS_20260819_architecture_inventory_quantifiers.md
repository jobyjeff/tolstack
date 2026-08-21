# LESSONS 2026-08-19 — architecture_inventory_quantifiers

Handoff: `HANDOFF_20260819_architecture_inventory_quantifiers.md`. Branch:
`handoff/architecture_inventory_quantifiers`. Worked 2026-08-21.

## Every quantifier the block contained, and its disposition

This is the list the handoff asked for, so the next reviewer does not audit the
block a third time. "The block" is the fenced listing under `## Package layout`
in `ARCHITECTURE.md` — eleven rows across `tolerance_stack/`, `scripts/` and
`apps/`.

| row | quantifier | disposition |
|---|---|---|
| `stack.py` | `~330 lines` | **deleted** (option 1). It was 728 and carried no decision |
| `stack.py` | `stdlib only` | **pinned** — `test_every_row_claiming_stdlib_only_imports_only_the_stdlib` |
| `spec_library.py` | `stdlib only` | **pinned**, same test |
| `thermal.py` | `stdlib only` | **pinned**, same test |
| `thermal.py` | `no arithmetic of its own beyond thermal_factor()` | **deleted — and it was false**, see below. Replaced by a pointer to "Where computation may live" |
| `thermal.py` | `Added 2026-08-05` | **kept as dated history** (option 2); dates are exempt from the scan by rule |
| `build_viewer_crops.py` | `needs PyMuPDF` | **pinned** — `test_the_block_names_a_dependency_for_exactly_the_modules_that_have_one`, both directions |
| `projection_provenance.py` | `stdlib only` | **pinned**, same test as the other three |
| `projection_provenance.py` | `all three projection writers` | **pinned** — `test_the_projection_provenance_row_counts_and_names_its_importers` |
| `projection_provenance.py` | `the two above` | **pinned**, same test, resolved **positionally** (the two rows above it) |
| `projection_provenance.py` | `Added 2026-08-10`, `2026-08-12` | **kept as dated history** |
| `snapshot_drawing_checker.py` | `"nothing was written there"` | **kept**: it is inside a `"…"` span, which is this repo's convention for a quoted claim, and the scan exempts quotations |
| the listing itself | *"these are the modules"* — the implicit count | **pinned** — `test_the_block_inventories_every_module_in_the_directories_it_lists` (decision not in the handoff, see below) |
| everything else | — | no quantifier. `__init__.py`, `__main__.py`, `build_viewer_projection.py`, `run_viewer_browser_tests.mjs` and `apps/viewer/` state their character without one, which is what made option 1 the consistent choice |

Rows are **not** column-aligned: `run_viewer_browser_tests.mjs` has a single
space before its sentence where every other row has several. The parser reads a
row by its two-space indent and a name-shaped first token, never by alignment.

## `thermal.py`'s arithmetic claim was false, not stale

The interesting find. The row said *"no arithmetic of its own beyond
`thermal_factor()`"*, and `workbook_corner()` combines two element values
(`sleeve_od - hub_bore`) — on purpose, with a docstring arguing why. So this was
not a number that drifted; it was a claim that was never true of the module as
shipped, sitting three sections above the table that documents its own exception.

The same claim appears in **"Where computation may live — and the coefficient"**
(*"It never combines two element values"*), which is the section where the
repo's central invariant is defined. That copy is out of this handoff's scope
(rewriting the one-combiner rule is a design call, and the handoff forbids
touching `stack.py`), so it is filed:
`docs/issues/ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`,
`audience: strategy`. **Do not "fix" the row I left pointing at that section
before that issue is decided** — the pointer is deliberate; the section is where
the argument belongs, and the issue is about making the argument correct.

## Decisions not in the handoff

**The inventory's completeness is now guarded too.** The handoff asked about
quantifiers; the block's largest unchecked quantifier turned out to be the
implicit *"this is the list"*. `test_the_block_inventories_every_module_in_the_directories_it_lists`
compares each directory header's rows against `iterdir()`. That is exactly the
by-eye check the review checklist keeps asking for (*"did this handoff owe the
inventory a row?"* — the question that found this issue in the first place), and
it was cheap. Consequence to know: **add a file to `tolerance_stack/`, `scripts/`
or `apps/` and the suite goes red until the block has a row for it.** That
includes a `README.md` dropped into `scripts/`. That is intended.

**The pinned phrases are themselves pinned.** `PINNED_CLAIMS` maps a regex to the
test that reads it out of the tree, and `test_every_pinned_claim_is_still_in_the_block`
fails when a registered phrase matches **zero** times. Without it, rewording
`stdlib only` to `no third-party imports` leaves a green test guarding a sentence
the document no longer contains — the failure `hardware_counts_doc_guard`
(2026-08-12) named: *"a test asserts this" is not a guard unless the test asserts
**this***.

**The residue scan is the actual deliverable.** Deleting `~330` fixes one value;
`test_no_unpinned_quantifier_survives_in_the_block` is what stops `~730` being
written next year. It flags digits and number words in row prose after removing
`"…"` spans, ISO dates and every registered claim. Two known holes, both in the
module docstring: a quantity spelled with no digit and no listed word passes
("a few hundred" is caught only because *hundred* is on the list), and the
quotation exemption pairs quotes within a line.

## Gotchas

- **`git checkout -- ARCHITECTURE.md` to undo a demonstration reverts your real
  edits with it.** I lost the three intended edits that way mid-session and
  reapplied them. Perturb with the `Edit` tool and undo with the inverse `Edit`,
  or commit the real change *before* demonstrating the guard.
- **`venv-win` is gitignored, so it does not exist in a worktree.** Run
  `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q` from inside
  the worktree (Python 3.14 here, so `sys.stdlib_module_names` is available —
  the stdlib-only guard is built on it).
- **The suite *did* already touch `ARCHITECTURE.md`** — the handoff wondered.
  `test_every_document_quoting_the_traced_ratio_quotes_the_current_number` reads
  it as a live doc, and `test_provenance.py` mentions it only in a docstring.
  `ARCHITECTURE.md` has **no `PROVENANCE.md` row of its own** (it is not imported
  material), so no Amended clause was owed for this change — the one row that
  names it is `tolerance_stack/stack.py`'s, which points at it for rationale.
  What had no guard was the module inventory block, specifically.
- **`ast.walk`, not the module body, for the import reader.** Three of the
  imports that decide these claims are inside functions: `fitz` in
  `build_viewer_crops`, and `projection_provenance` in both `spec_library.rebuild`
  and the two viewer builders' `sys.path` dance. A lazy import is exactly as much
  of a dependency as an eager one.
- **`scripts/` is not a package**, so a sibling's bare stem (`projection_provenance`)
  is first-party even though it looks like a top-level distribution.
  `first_party_names()` globs `scripts/*.py` for that reason rather than listing
  names.

## Demonstrations run (definition of done)

Each guard observed failing against the real tree, then reverted:

1. Re-inserted `~330 lines` into the `stack.py` row → `test_no_unpinned_quantifier_survives_in_the_block`
   failed with `ARCHITECTURE.md:18 tolerance_stack/stack.py: ['~330']`.
2. Changed `all three projection writers` → `all two` → the count test failed
   (*"the row says 2 writers and names 3"*), `test_every_pinned_claim_is_still_in_the_block`
   failed on the reworded phrase, and the residue scan flagged `['all', 'two']`
   because the phrase was no longer registered. Three tests, one edit — the
   intended interlock.
3. Deleted the `snapshot_drawing_checker.py` row → `test_the_block_inventories_every_module_in_the_directories_it_lists`
   failed naming `scripts/`.
4. Appended `import fitz` to `scripts/projection_provenance.py` → the stdlib-only
   test failed naming the row and the import, and the dependency test failed with
   *"imports name ['PyMuPDF'], row names []"*.

`test_the_parser_refuses_a_shape_it_would_otherwise_misread`,
`test_the_quantifier_scan_can_fail` and `test_the_stdlib_only_reader_can_fail`
keep those paths exercised in-suite, including the misparse that would swallow a
row into its predecessor's prose — the one failure that would weaken every check
here while the block still read complete.

Full suite: **451 passed, 1 skipped** in the worktree
(`handoff/architecture_inventory_quantifiers`) with the main checkout's
interpreter. The skip is the data-dependent test, which runs where `data/` is
populated.
