# LESSONS 2026-09-01 — thermal_exception_declared

Handoff: `docs/sessions/HANDOFF_20260901_thermal_exception_declared.md` (from
`BRIEF_20260826_thermal_never_combines_invariant`, option 1). Delivered: the rule
in `ARCHITECTURE.md` now states its exception, `tests/test_thermal_exception_list.py`
walks `thermal.py` and pairs the list against every passage, and
`ISSUE_20260821_...never_combines_two_element_values` is `status: resolved`.

## The AST shape: taint, not pattern-matching

"Combines two element values" cannot be recognised from the operator. The two
shapes are one character apart in structure and opposite in meaning:

```python
at(chain.bearing_od_element) * f_bearing   # a WEIGHT on one element value  -> fine
sleeve_bore + 2 * wall                     # two element values             -> a site
```

So the walker is a three-part taint pass per function (module docstring of the
test carries the full write-up):

1. **Seed** on any attribute read whose name is a `StackElement` value field.
   Those field names are read out of `stack.py`'s class body — the dataclass
   fields annotated `float`/`Optional[float]` plus the `@property` accessors
   returning `float` — so a new value field is in scope the moment it exists.
   That gives eight seeds today, including `mid`/`half_range`, which a hand-written
   list of "nominal/min/max/lmc/mmc" would have missed.
2. **Propagate** to a fixed point: a local bound to a tainted expression, a
   nested function that *returns* one (this is the only way to reach
   `workbook_corner`, whose element reads all happen inside its `at()` helper —
   a walker that only looked at attribute access in the arithmetic expression
   itself finds **zero** sites there), and a call carrying a tainted argument, so
   `abs(a.min) - float(b.max)` cannot launder it.
3. **Find**: arithmetic where *both* operands are tainted. Plus `AugAssign`
   (`total += e.nominal` is the loop spelling of a fold) and any name in
   `AGGREGATING_CALLS` over two tainted arguments or a tainted collection
   (a fold spelled without an operator). Nothing else needed a special case.
   *(Widened in review, 2026-09-02: the list held `sum`/`fsum`/`min`/`max`, and
   the first two shapes probed past its edge — `operator.sub(a.min, b.min)` and
   `math.prod([a.min, b.min])` — were silent misses. Recognition is by call
   name, so `functools.reduce` is the shape still not seen, and it is now
   written into the module docstring's ignore-list rather than left to a
   reader's inference.)*

On today's tree that reports **six sites, all in `workbook_corner`**, which is
the honest count: `sleeve_od - k * (sleeve_od - hub_bore)` is two nested sites,
not one, and the message lists each with its line and unparsed source.

### Deliberately ignored — and one real blind spot

- Comparisons (`a.min > b.max`) — a decision, not a combined value.
- Element values read without arithmetic (`expanded_terms_table`'s dict).
- Float arithmetic that never touches an element (`1 + dt * alpha`,
  `2 * k * f_sleeve`) — that is the archetype's whole job.
- **Blind spot to know about:** taint is per-function. A module-level helper
  taking a `StackElement` and returning a combination is caught *inside itself*,
  not at its call site — fine today (no such helper), and the direction to
  extend if one arrives. It is written into `REVIEW_AGENT.md` so a reviewer
  knows what the guard does not cover.

## Prose invariants must be read whitespace-flattened

Two of this session's three red runs were the same thing: the anchor phrase
`declared exception list` did not match because it had been **line-wrapped** in
the passage. An invariant that goes unguarded the moment someone reflows a
paragraph is worse than no invariant, because it still reads as guarded. Every
extraction here normalises `\s+` to a single space before searching. If you write
another prose-pairing test in this repo, do that from the start.

## The scope grew by two passages, and it had to

The handoff named three passages (rule section, inventory row, `workbook_corner`'s
docstring). There were **five**, and two of the extra ones still asserted the
false absolute:

- `thermal.py`'s **module docstring**: *"This module computes weights; it never
  combines two element values"* — the first thing a reader of the module sees,
  and nobody had noticed it.
- `docs/tolerance_stacks/ARCHETYPE_thermal_fit.md`: *"computes weights and never
  combines element values. That is the line to hold for archetype three"* —
  also stale on the archetype count (topology arrived 2026-08-31; both that
  sentence and ARCHITECTURE.md's now say "the next / a fourth archetype").

Rather than a third copy of the pairing test, the passages became a dict
(`RULE_PASSAGES`, label → loader) driving one parametrized test: each must carry
the anchor phrase in exactly one paragraph and name exactly the declared
exceptions there. **A new document that states the rule belongs in that dict** —
that is the whole point of the exception being a list.

> **Corrected in review (2026-09-02): five was still an undercount, and the
> search is the lesson.** These five were found by following the passages the
> handoff named. Searching instead for the rule's *own words*, over every
> tracked `.md` and `.py` with whitespace flattened —
> `(only|one) place (where )?element values` — finds **four more live passages
> stating the absolute**, none of them in `RULE_PASSAGES`:
> `ARCHITECTURE.md`'s `fold(terms)` inventory row; its topology-archetype
> section (*"`fold()` remains the only place element values are combined"*); the
> rule section's **own opening sentence**, four paragraphs above the exception it
> now states; and `docs/DAG_TOPOLOGY.md`'s *"the same and only place element
> values are combined **anywhere in this repo**"* (2026-08-31, the most clearly
> false form). A fifth, `fold()`'s own docstring in `stack.py`, is out of this
> handoff's scope and was left as filed. The first four were corrected in
> review; nothing pairs any of them, which is
> `ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages.md`.
> Two durable parts. **The enumeration is only as good as the search that
> produced it** — the cheap search is the words the passages share, not the
> passages the handoff happened to name. And **flatten whitespace to search,
> for the same reason this session already learned to flatten it to match**: the
> rule section's own opening is line-wrapped between `place` and `where`, so a
> plain `grep` for the phrase misses the one copy sitting inside the section the
> new test reads.

The **inventory row was left untouched** and is guarded differently: it has
pointed at "Where computation may live" since `architecture_inventory_quantifiers`
rather than restating the rule, so the test asserts it still *defers*. Adding
"one declared exception" to it would also have tripped
`test_no_unpinned_quantifier_survives_in_the_block` — the row cannot carry a
count nothing reads from the tree.

`docs/prompts/REVIEW_AGENT.md` had a live instruction — *"until that issue is
decided, do not 'fix' either sentence unilaterally"* — which would have made a
future reviewer bounce a correct change. It now records the decision and,
importantly, says what is **left for a human**: whether a newly listed exception
really is a single-valued reading, since the test can only check that it is
declared, argued and consistent, never that it is right.

## Observed failing (review-checklist item), on the final code

- Second combining site appended to `thermal.py` →
  `thermal.py:684 in _scratch_demo_gap(): a.max - b.min`, one test red.
- `DECLARED_COMBINING_EXCEPTIONS = ()` → four red: the six real
  `workbook_corner` sites, plus all three passages, each naming what disagrees.
- `("workbook_corner", "thermal_factor")` (a name that combines nothing) → five
  red: the stale-entry test names `thermal_factor`, the docstring test says it
  never argues its case, and all three passages disagree with the list.

Scratch edits were made in the worktree and reverted. **Careful:**
`git checkout -- tolerance_stack/thermal.py` reverted the session's own docstring
edit along with the scratch site and cost a re-apply — copy the file aside first,
or demo on a copy.

## Still to do / for the next agent

- The board: the handoff sits at `docs/sessions/` root on this branch (dispatch
  moved it to `active/` in the main checkout, which is not on this branch). Left
  as-is deliberately — the board move belongs to whoever merges/reviews.
- Nothing else outstanding; suite green at 570 passed, 1 skipped **in a
  worktree** (the count is checkout-specific here — one test skips where `data/`
  is empty; the review re-ran it in the main checkout, see
  `docs/sessions/reviews/REVIEW_20260902_thermal_exception_declared.md`).
- One unrelated flake seen once in ~5 full runs:
  `test_dc_snapshot.py::test_a_removed_entry_is_reported_as_removed`, which
  needs a directory mtime to advance between two snapshots taken in the same
  test. Passed 8/8 in isolation and on both re-runs of the full suite. Already
  filed twice today (`ISSUE_20260901_dc_snapshot_removed_entry_test_is_mtime_flaky`
  and `..._is_flaky_on_directory_mtime`) so nothing new was filed -- but if you
  see it, it is that, not your change.
