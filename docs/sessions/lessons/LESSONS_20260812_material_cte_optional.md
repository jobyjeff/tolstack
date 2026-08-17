# LESSONS 2026-08-12 — material_cte_optional

Handoff: `HANDOFF_20260812_material_cte_optional.md` (run 2026-08-17).
Issue: `ISSUE_20260812_not_transcribed_material_must_still_carry_a_cte.md` (now
`resolved`).
Baseline: trunk `b07a7ec`, i.e. after `js_python_vocabulary_pairing` and
`spec_citation_identity_rendering` merged.

Suites, run **in this worktree**
(`C:\workspace\tolstack-worktrees\material_cte_optional`) with the main
checkout's interpreter (`C:\workspace\tolstack\venv-win\Scripts\python.exe`):
**Python 437 passed / 1 skipped** (trunk is 433/1 — the four new tests are mine;
the skip is `test_viewer_js_suite`'s node-fs tier, which has no projection in a
worktree). **JS 131/131**, run as
`node apps/viewer/run_tests.cjs --repo C:/workspace/tolstack`.

## Option 1, as recommended — and the `depends_on` DID bind

`cte_1e6_per_c` is `Optional[float]`, required unless `values_status` is
`not_transcribed`. Nothing in option 2 got more attractive on contact: the two
schemas' vocabularies stay identical, `VA.VALUES_STATUSES` needed no key change,
and the JS table was untouched.

The handoff says the dependency is "a no-op if you take option 1". **It was
not.** My first spelling of the new rule was the obvious mirror of the
`values_source` one:

```python
if self.values_status in ("inline", "library") and self.cte_1e6_per_c is None:
```

That turned `tests/test_js_python_vocabulary.py` red — not on the pairing, on the
*extraction*: `_values_statuses_from_source` walks for a `self.values_status`
membership test, accepts `In` as well as `NotIn`, and **requires exactly one**,
raising `LookupError` rather than guessing which one is the vocabulary. Two
membership tests is ambiguity, and it refuses ambiguity. The guard was right and
my line was wrong twice over: a tuple listing two of the three values is a copy
that can drift, and it fails *open* (a status added later would need no CTE by
omission). The shipped spelling is

```python
if self.cte_1e6_per_c is None and self.values_status != "not_transcribed":
```

one status named, the vocabulary still defined in exactly one place, and it fails
**safe** — a new status requires a CTE until someone decides otherwise. So the
dependency's real payoff was not "don't forget the JS side"; it was **"don't
introduce a second enumeration of a vocabulary you are conditioning on"**, which
is a stronger property than the handoff anticipated. Anyone taking option 2 will
meet the same extractor and should expect to teach it about a two-site
vocabulary, not just to update `VA.VALUES_STATUSES`.

## A stack computed against a CTE-less material: it **raises**, at load time

Triage's suggestion, taken. Both soak-factor sites (`stage_terms` and
`workbook_corner`) now call `material_soak_factor(materials, material_id, dt)`,
which raises `ValueError` naming the material and its `values_status`.
`build_checks` runs inside `load_thermal_fit_stack`, so the failure lands at
**load**, not at fold, and not on a card.

Why not `0.0`, written out because it is the tempting answer and the argument is
short: a zero CTE is not "no information about growth", it is the physical claim
that this member does not grow, which no real material makes. It reads as a
*number that was computed* while being an assumption nobody made — this repo's
worst defect class. And it is not even conservative: the same substitution makes
the fit read tighter or looser depending on which of the three members it lands
on, so there is no "safe direction" to hide behind. A stack is a refusable thing;
a wrong interference is not.

One consequence I did not expect, and it decided deliverable 3:

> **No projection can carry a CTE-less material row.** `stack_materials` only
> emits rows for materials a chain names, and a chain naming a CTE-less material
> stops the stack loading. So the honest state is expressible in `materials.json`
> (for a material no chain uses) but is structurally unreachable in the viewer.

## Deliverable 3: `DEMO_BEARING_STEEL` **keeps** its CTE

Given the above, dropping it would have made the fixture describe a shape the
builder cannot emit — the exact defect `viewer_fixture_shape_guards` filed. So
the row keeps the placeholder number and the comment now says *why it stays*
(load-time refusal) instead of the old, now-false reason (*the schema forces
it*). The `no_source_ref` + `CTE NOT TRANSCRIBED` state it exists to render is
still reachable: `not_transcribed` **plus** a stated CTE is still legal, and that
is what a real author would write today.

Note that the shape guard would **not** have caught the mistake either way: it
compares the *key union* across fixture instances against the live union, and the
other two fixture materials carry `cte_1e6_per_c`. Dropping the key from one
entry is invisible to it. That is not a hole to plug (a per-instance guard would
fire on every legitimately-optional field), but it does mean *"the guard is
green"* was not the argument here — the builder's reachability was.

## The viewer needed nothing, and one sentence of prose needed correcting

`VA.fmt(null)` and `VA.fmt(undefined)` already return `—`, asserted at
`apps/viewer/tests.js:66-67`. `views/stack.js` and
`scripts/build_viewer_projection.py` are both indifferent to a missing CTE — the
projection carries the authored entry verbatim and computes nothing from it.
Verified rather than assumed, as the handoff asked; no code changed on either
side.

What did need changing is out of the handoff's named scope and I changed it
anyway, in two lines of prose: `VA.VALUES_STATUSES.not_transcribed.text` (and the
matching legend bullet in `apps/viewer/README.md`) told the reader the number
above is *"a placeholder the schema requires"*. My change is what made that
sentence false, and shipping a viewer that explains the schema wrongly is worse
than the scope violation. No key, no branch, no rendering changed. I deliberately
did **not** add a `cte === null` branch to that text: since no projection can
carry one, it would have been an unreachable branch, and one sentence that is
true either way beats a branch nothing can exercise.

## Things the next agent would otherwise rediscover

* **`git checkout -- <file>` reverts to HEAD, not to your last save.** Poisoning
  a production file to demo a guard red is the local convention (three lessons in
  a row), but the convention's "revert with `git checkout --`" step assumes the
  change is already committed. Mine was not, and it wiped the whole edit. Keep a
  copy in the scratchpad, or commit first and poison after. Cheap either way; not
  free if you don't notice.
* **`tests/test_provenance.py` will bounce you for editing
  `docs/tolerance_stacks/README.md`** without appending an `Amended again
  <today>` clause to that file's `PROVENANCE.md` row (row 77). The failure
  message dictates the exact prescription. It fires on *any* edit, including a
  purely additive one — budget for it whenever you touch an imported doc.
* **Date skew.** The handoff, the issue and this lesson's filename are
  `20260812`; the work ran on **2026-08-17**. The provenance amendment and the
  issue's RESOLVED stamp use the real date, the filename keeps the handoff's, per
  the naming convention.

## Left for the next agent

* **Nothing in this handoff's scope.** The four tests cover both directions of
  the optionality and both soak-factor sites.
* `test_material_entry_rejects_an_empty_gaps_list` still does a function-local
  `from tolerance_stack.thermal import MaterialEntry`, which the module now
  imports at the top. Harmless shadowing; left alone because deleting it is an
  unrelated edit to a test I was told not to disturb beyond making it pass.
* Still open from the dependency's lesson and untouched here: `VA.CONFIDENCES`
  has no single definition to pair against
  (`ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_...`), and
  `SourceRef.confidence` is still unvalidated —
  `SourceRef(kind='drawing', document='x', confidence='banana')` constructs. That
  is the same class of hole this handoff just closed one field along.
