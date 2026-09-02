---
type: review
handoff: docs/sessions/completed/HANDOFF_20260901_thermal_exception_declared.md
reviewer: review agent (review/thermal_exception_declared)
date: 2026-09-02
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-02 — thermal_exception_declared

**APPROVE.** The handoff delivered the decision it was given, the new guard was
watched failing four separate ways, and the suite is green in both checkouts.
Five findings — one should-fix and four nits — all fixed inline; one issue filed
for the ring beyond this handoff's scope.

The work: `ARCHITECTURE.md`'s "Where computation may live" now states the
one-fold rule conditionally, `DECLARED_COMBINING_EXCEPTIONS` in the new
`tests/test_thermal_exception_list.py` is the list, an AST taint walk holds
`thermal.py` to it, and `ISSUE_20260821_..._never_combines_two_element_values` is
`status: resolved`.

## Branch note

The work was already an ancestor of `integration` when this review branch was
cut (`handoff/thermal_exception_declared` fast-forwarded in), so the
write-failing-tests-first flow was not available. The failing-first evidence
below is therefore replay-based: mutate the live tree, watch the named test go
red, restore. `git status` clean after each.

## The seven mandatory checks

Checks 1–7 of this repo's overlay are the provenance audit of a **tolerance
stack**. This handoff changes no stack, no element, no citation, no material
entry and no hardware entry — `git diff --stat` over the work is
`ARCHITECTURE.md`, `docs/DAG_TOPOLOGY.md`, `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`,
`docs/prompts/REVIEW_AGENT.md`, one issue, one lesson, one new test file, and
`tolerance_stack/thermal.py` **docstring lines only** (verified: the diff
contains no executable line, so no `PROVENANCE.md` amendment is owed and
`thermal.py` has no imported row anyway — it is `— (new)`, written 2026-08-05).
So checks 1–7 are **not applicable, by inspection of the diff rather than by
assumption**, and the traced ratio is unmoved. What was checked instead:

| overlay item | verdict | evidence |
|---|---|---|
| **A new guard has been observed failing** (universal) | **PASS** | four replays, below — the author's three reproduced plus one the author did not do |
| **A count/enum/registry restated by hand with nothing pairing it** (universal) | **PASS**, with one should-fix on the *other* side | the list is a constant and the passages are paired; the *enumeration of passages* was the gap (finding 1) |
| **Tests don't pollute production data** (universal) | **PASS** | `data/` unchanged across four full-suite runs; drawing-checker snapshot diff EMPTY (below) |
| **`fold()` is the only arithmetic** (architectural) | **PASS** | the walker reports 6 sites, all `workbook_corner`; `Term.coefficient > 0` untouched; no second combiner added |
| **`workbook_corner` really is a single-valued reading** (the part no test can judge) | **PASS** | it evaluates one coherent corner — every feature simultaneously at nominal/LMC/MMC — which is a point, not a band. A fold cannot express it, and the docstring makes that argument in full including why it reads `lmc`/`mmc`. The decision option 1 is right. |
| **drawing-checker is read-only** | **PASS** | not by `git status` over there: `snapshot_drawing_checker.py diff` from `dag_viewer_poc`'s review `dc_after.json` (2026-09-01T19:05:09Z) to a fresh take (2026-09-02T18:01:29Z) is **EMPTY**, 5380 entries — that window brackets the whole tactical session *and* this review's start |
| **`data/inbox/specs/` append-only, `docs/reference/` insert-only** | **PASS** | neither appears in the diff |
| **A sibling handoff landed on `master` while reviewing** | **PASS** | `HEAD..master` was two board-move commits; merged into this branch and the suite re-run there (below) |
| **Whole-file diff hiding a reformat** | **PASS** | `git diff -w --stat` is identical to `git diff --stat` — nothing collapses |
| **Harness artifact / template residue in a created file** | **PASS** | no `{{`, `</invoke>`, `</content>`, `<parameter` in the diff; `tail` of both created files is real content |
| **Suite** | **PASS** | 570 passed, 1 skipped in this worktree; 571 passed, 0 skipped in the main checkout after merge (the data-dependent test skips where `data/` is empty — the checkout-specific count this overlay warns about) |

## The guard, observed failing

The author recorded three replays; all three reproduce here, and the fourth is
the one the overlay actually asks for (replay the historical blob, not a
synthetic case):

1. **A second combining site appended to `thermal.py`** →
   `test_every_combining_site_in_thermal_is_on_the_declared_exception_list` red,
   naming `thermal.py:682 in sneaky_second_combiner(): a.nominal + b.nominal`
   and telling the reader the three things a real exception owes.
2. **`DECLARED_COMBINING_EXCEPTIONS = ()`** → 4 red: the six real
   `workbook_corner` sites, plus all three registered passages, each printing
   both directions of the set difference.
3. **`("workbook_corner", "thermal_factor")`** → 5 red: the stale-entry test
   names `thermal_factor`, the docstring test says it never argues its case, and
   the three passages disagree with the list.
4. **`git show 11367fc^:docs/tolerance_stacks/ARCHETYPE_thermal_fit.md` written
   over the live file** — i.e. the real pre-decision prose — → that passage's
   parametrization red by `LookupError`, with a message that tells the reader
   whether to correct the passage or drop it from `RULE_PASSAGES`. This is the
   important one: it shows the **deleted-passage** blind spot (a doc that states
   nothing states nothing false) is closed *by construction* here, because every
   extractor raises rather than returning empty.

Also re-derived rather than read: 8 seed fields extracted off `StackElement`
(including the `mid`/`half_range` properties), 6 combining sites, all in
`workbook_corner` — matching the lesson exactly.

## Findings

### should-fix (fixed inline)

**1. "Every live passage that states the rule" was an enumeration by
pointer-following, and four more live passages still asserted the retired
absolute.** The claim appears four times — the test module docstring, the
`RULE_PASSAGES` comment, ARCHITECTURE.md's new paragraph, and the checklist entry
the handoff rewrote — and the lesson counts *"there were five"*. Searching the
rule's **own words** instead of the passages the handoff named
(`(only|one) place (where )?element values`, whitespace-flattened, over every
tracked `.md`/`.py`) finds four more, none in `RULE_PASSAGES`:

- `ARCHITECTURE.md:64` — `fold(terms)` \| *"the only place element values are combined"*
- `ARCHITECTURE.md:143` — the topology-archetype section: *"So `fold()` remains the only place element values are combined"*
- `ARCHITECTURE.md:202` — **the rule section's own opening sentence**, four paragraphs above the exception the same section now states. `anchor_paragraph()` selects only the paragraph carrying the anchor phrase, so this one is unguarded *inside the section the test reads* — and it is line-wrapped between `place` and `where`, so a plain `grep` misses it too.
- `docs/DAG_TOPOLOGY.md:91` — *"the same and only place element values are combined **anywhere in this repo**"* (2026-08-31): the strongest and most clearly false form.

This is the resolved issue's own shape one ring out — a document asserting both
the absolute and the exception, with nothing red. All four corrected inline.
A fifth, `fold()`'s own docstring in `stack.py:498`, is the same false absolute
and was **left alone**: the handoff's scope says do not touch `stack.py`/`fold()`
and neither should a reviewer. `PROVENANCE.md`'s `stack.py` row repeats it three
times in dated amendments and is exempt as history by convention.

Because nothing pairs any of them, the corrections are not the fix:
**`ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`**
(`type: bug`, `priority: med`) carries the design question — two phrasing
families, no single phrase; whitespace-flattening required; the negative
direction ("this passage never mentions exceptions at all") is what needs
guarding.

### nits (all fixed inline)

**2. The walker's operator-free spellings are recognised by call name, and the
honest-blind-spot list did not say so.** `AGGREGATING_CALLS` was
`("sum", "fsum", "min", "max")`, documented as "how a fold could be spelled
without a single `BinOp`". The first two shapes probed past that edge were both
**silent** misses: `operator.sub(a.min, b.min)` and `math.prod([a.min, b.min])`
returned no site. Widened the constant (both bare and `module.name` forms are
matched by name), added both as cases in `test_the_walker_can_fail`, and wrote
`functools.reduce` into the ignore-list as the shape that remains rather than
leaving a reader to infer it. Re-verified: still exactly 6 sites, all
`workbook_corner` — no false positive introduced. The docstring now also states
the *loud* direction it had left implicit: seeds are attribute **names**, so
`interval.min + interval.max` over two fold results is reported as a site with no
`StackElement` in sight, which is the tolerable failure because it arrives as a
red test rather than as silence.

**3. The anti-vacuity test's `StackElement(...)` was a hand-written kwargs
list.** `element_value_fields()` deliberately picks up a new value field "the
moment it exists" — and the next `Optional[float]` field would then default to
`None` in that constructor and redden
`test_the_element_value_fields_are_read_off_the_class_and_are_real` with a
message blaming the *reader*. Now filled from the extracted set. Same class as
the guard-demonstrations narrowed in the 2026-08-12 reviews.

**4. Lesson and commit quoted `570 passed, 1 skipped` without saying which
checkout.** Checkout-specific here by a known one test. Lesson now says
worktree and points at this report for the main-checkout figure.

**5. Residues.** ARCHITECTURE.md carried an awkward mid-sentence line wrap left
by the edit (*"That is the line,\nand it is..."*), and `resolved_by:` in the
closed issue plus the lesson's `Handoff:` line pointed at the handoff's staged
path, which this review's board move invalidates. Both corrected; the lesson's
own `RULE_PASSAGES` claims were corrected in place with the search that found
the four.

## Checklist maintenance

- The `fold()` architectural entry the handoff rewrote said the walker pairs the
  list against *"every passage that states the rule"* — corrected to the three
  **registered** passages, plus a replay recipe, plus both of the walker's blind
  spots (per-function taint, and recognition-by-call-name) with the one-call
  probe that finds a third.
- Second sighting appended to **"A document set that was *chased into* rather
  than *enumerated*"** — the corpus this time is the repo's own prose, which has
  no `ls`, so the entry now says how to run the search: the words the passages
  share (expect more than one phrasing family), whitespace-flattened over
  `git ls-files`, including the file the handoff was told not to touch.

## For the next reviewer

- The **rule section's opening sentence is now the one to watch**: it is inside
  the section the pairing test reads but outside the paragraph the pairing test
  selects, so it can drift back to an absolute silently. Until
  `ISSUE_20260902_...` is settled, re-run the phrase search rather than trusting
  a green suite.
- The dc_snapshot mtime flake the author flagged
  (`test_a_removed_entry_is_reported_as_removed`) did **not** appear in any of
  the four full-suite runs here. Two issues are already open on it.
- Board: `docs/sessions/completed/HANDOFF_20260901_thermal_exception_declared.md`.
  The `master` merge rename-detected the move for me; it was resolved
  deliberately at `completed/`, blob-identical to `master`'s `active/` copy.
