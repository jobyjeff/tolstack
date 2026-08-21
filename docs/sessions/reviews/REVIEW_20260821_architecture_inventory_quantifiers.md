---
type: review
handoff: docs/sessions/active/HANDOFF_20260819_architecture_inventory_quantifiers.md
reviewer: review agent (dispatch)
date: 2026-08-21
verdict: APPROVE
blockers: 0
---

# Review — `architecture_inventory_quantifiers`

Work reviewed: `handoff/architecture_inventory_quantifiers` (`950ed28`), merged
into `review/architecture_inventory_quantifiers` on top of `master` `56e43b8`.
Four files, `+813 / −3`; `git diff -w 56e43b8...HEAD --stat` is identical, so
nothing is hiding inside a reformat, and no NUL bytes in any changed file
(harness-artifact / binary-blob checks, both clean).

`git log --oneline HEAD..master` was empty before I merged — `master` had not
moved past the review branch's base. `handoff/three_field_vocabularies` and
`handoff/enumerated_state_doc_guard` are the two named sibling handoffs the
handoff body warned about; neither has landed on `master` (both still separate
branches with their own open review worktrees), so there is no merged-tree
contradiction to re-test yet. Scope held: `tolerance_stack/stack.py` and
`docs/SOP_TOLERANCE_STACK.md`, the two files the handoff was told not to touch,
are untouched (confirmed from the diff, not assumed).

## The seven mandatory stack checks do not apply

Same disposition as `REVIEW_20260812_js_python_vocabulary_pairing` and
`REVIEW_20260818_confidence_vocabulary_single_definition`, confirmed from the
diff rather than assumed: nothing under `docs/tolerance_stacks/`, `data/` or
`apps/` changed, and no `StackElement`/path/check/citation moved. There is no
new tolerance, sign, LMC/MMC mapping, RSS column or provenance address to
audit. The traced ratio is untouched — `ARCHITECTURE.md`'s edit is confined to
the `## Package layout` block; the ratio paragraphs further down were not
touched, and `test_every_document_quoting_the_traced_ratio_quotes_the_current_number`
is green in the merged tree.

## The universal check: a new guard has been observed failing

Four claims survive as guarded quantifiers plus one implicit completeness
claim. I did not accept the lesson's own demonstration table as evidence —
I broke each guard myself, independently, in a clean tree, and reverted:

| poison (mine, not the author's) | result |
|---|---|
| reinserted `~330 lines` into the `stack.py` row | `test_no_unpinned_quantifier_survives_in_the_block` failed, naming `ARCHITECTURE.md:18` and the token `~330` |
| dropped an untracked `_scratch_probe.py` into `scripts/` | `test_the_block_inventories_every_module_in_the_directories_it_lists` failed, naming `scripts/` and the extra file |
| prepended `import yaml` to `tolerance_stack/stack.py` | `test_every_row_claiming_stdlib_only_imports_only_the_stdlib` failed, naming `ARCHITECTURE.md:18` and `['yaml']` |
| changed `all three` → `all two` on the `projection_provenance.py` row | three tests failed together: the pinned-claim check (phrase no longer present), the count/importer check (`says 2 writers and names 3`), and the residue scan (`['all', 'two']` now unpinned) — the "one edit, three tests" interlock the lesson claims, reproduced |

Each failure named the right file and line and reverted cleanly
(`git status --porcelain` empty after every probe, confirmed with `git diff -w`
too). Full suite after: **451 passed, 1 skipped** in the worktree, matching the
lesson's own count exactly, with the checkout stated.

## The deliverables

- **The stale figure is gone.** `stack.py`'s row no longer carries a line
  count (option 1, as the handoff recommended); it was 728, not ~330.
- **What survives is read from the tree, not written by hand.** `stdlib only`
  (4 rows), `needs PyMuPDF` (1 row, both directions), and the
  `projection_provenance.py` writer count + "the two above" (positional, so a
  reorder reddens it) are each asserted against `ast`-walked imports and
  `iterdir()`, never against a restated list — checked by reading the
  extraction code, not just its green result.
- **The inventory's own implicit quantifier is now guarded too.**
  `test_the_block_inventories_every_module_in_the_directories_it_lists` compares
  the block's row set against `iterdir()` on `tolerance_stack/`, `scripts/` and
  `apps/`, both directions. This is the exact by-eye check the checklist keeps
  asking a reviewer to do ("did this handoff owe the inventory a row?") turned
  into a test — not asked for by the handoff, and the right call.
- **The false claim, not just the stale one.** `thermal.py`'s row said "no
  arithmetic of its own beyond `thermal_factor()`", which was never true —
  `workbook_corner()` combines two element values on purpose, and the module's
  own contents table three sections earlier already says so. The row was
  reworded to point at "Where computation may live" instead of restating a
  false absolute. See finding below.

## Findings

No blockers.

### should-fix (fixed inline)

1. **`tests/test_architecture_inventory.py:28` cited a test that does not
   exist.** The module docstring's "Precedent and its rule" section named
   `test_hardware_entry_count_claims` in `tests/test_tolerance_stack.py` as
   "the count-claim scanner". `grep -rn test_hardware_entry_count_claims
   tests/` returns nothing — no such symbol exists anywhere in the repo. The
   actual scanner is `test_no_live_document_states_an_unguarded_hardware_entry_count`
   (`tests/test_tolerance_stack.py:1618`). This is a second sighting of
   `REVIEW_20260818_confidence_vocabulary_single_definition`'s "a doc citing a
   symbol by name" finding, one step worse: last time the name resolved to a
   real-but-wrong function; here it does not resolve at all, so a bare
   existence grep would have caught it in one command. **Fix:** corrected the
   docstring inline (`ddd6756`-equivalent commit on this branch); re-ran the
   full suite after, still 451 passed / 1 skipped.

### nits

- The filed issue (`ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`)
  is out of this handoff's stated scope (rewriting the one-combiner invariant
  in `stack.py`/`ARCHITECTURE.md`'s "Where computation may live" section is a
  design call, and `stack.py` was explicitly off-limits) and is filed
  correctly: `type: bug`, `priority: low`, `status: open`, `area: docs`,
  `reporter: agent`, `audience: strategy` — all recognized values, no aliases.
  I re-derived its central claim independently (`workbook_corner` does combine
  `sleeve_bore`, `wall` and `hub_bore`) and it is correct. Not a finding against
  this handoff; noted so triage doesn't have to re-derive it.
- `PROVENANCE.md` was correctly left untouched — `ARCHITECTURE.md` is not
  imported material and carries no row of its own; `test_provenance.py` is
  green in the merged tree.

## Also verified

- **Tests, re-run rather than trusted, in the worktree with the main
  checkout's interpreter**: baseline (pre-merge) 441 passed / 1 skipped;
  post-merge 451 passed / 1 skipped, both stated with the checkout that
  produced them. I did not additionally re-run in the main checkout before
  merging there — see "Integration", below, where that run is the one that
  counts.
- **Harness artifacts / template stamps.** `tail -c 200` on every file the
  handoff created or edited: no `</invoke>`, `</content>`, `<parameter` or
  `{{`. Clean.
- **No file added to `scripts/`/`tolerance_stack/`/`apps/`** other than the new
  test file itself, so this handoff owes the inventory nothing beyond what it
  already fixed.
- **The pinned regexes' two exemptions** (a `"…"` span, an ISO date) are each
  demonstrated in the module's own `test_the_quantifier_scan_can_fail`, and I
  did not find a real block sentence that slips through unflagged — the full
  suite runs the residue scan against the live block and it is green.
- **The known blind spot is disclosed, not hidden.** The lesson and the module
  docstring both state that a quantity spelled with no digit and no listed
  number-word (e.g. "a few hundred" without the word "hundred") passes. That is
  an honest limitation of a shape-matching scanner, not a defect.

## Integration

APPROVE, tests green — merged, cleaned up, and pushed. See commit history on
`master` for the merge commit and the inline fix.

## For the next reviewer

Two overlay entries updated in this branch's `docs/prompts/REVIEW_AGENT.md`:

- a **second sighting** appended to *"A doc citing a symbol by name"* — this
  time the name doesn't resolve to anything, which a bare `grep -rn <name>
  tests/` would have caught before checking whether it resolves to the *right*
  thing.
- the **`fold() is the only arithmetic`** architectural entry now names the
  `workbook_corner`/`thermal.py` contradiction and the issue tracking it, so
  the next reviewer to touch `ARCHITECTURE.md`'s "Where computation may live"
  section or `thermal.py` knows not to silently "fix" one of the two
  unreconciled sentences before the design call in
  `ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values.md`
  lands.
