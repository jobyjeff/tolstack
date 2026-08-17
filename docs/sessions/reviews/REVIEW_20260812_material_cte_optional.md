---
type: review
handoff: docs/sessions/active/HANDOFF_20260812_material_cte_optional.md
reviewer: review agent (dispatch)
date: 2026-08-17
verdict: APPROVE
blockers: 0
---

# Review — `material_cte_optional`

Filename keeps the handoff's date (`20260812`) per the repo's naming convention;
the work and this review both ran **2026-08-17**. The author's lesson flags the
same skew deliberately, so it is not a finding.

Branch `handoff/material_cte_optional` (3 commits, `2dbb3a3..b578217`) merged into
`review/material_cte_optional` off `master` `fc7bc9b`. `git log --oneline
HEAD..master` was **empty** before the merge and again after — no sibling handoff
landed on trunk during this review (`traced_ratio_guard_freshness` is active in a
worktree but has not merged).

## What this work is

Not a tolerance stack. A **schema/typing change**: `MaterialEntry.cte_1e6_per_c`
becomes `Optional[float]`, required unless `values_status == "not_transcribed"`,
plus a refusal (`thermal.material_soak_factor`) when a chain is folded against a
material with no CTE. Option 1 of the issue, as the handoff recommended.

## The mandatory checks

The seven stack checks are written for a stack under review. No stack file, no
worksheet, no `materials.json`, no `hardware_entries.json` and no citation moved
in this diff (`git diff --stat master...HEAD` lists nine files, none of them
`docs/tolerance_stacks/*.json` other than the README). Each check is addressed
below rather than skipped.

1. **Every tolerance traces to a spec or drawing callout** — **N/A, verified
   vacuous.** No element value, `source_ref`, `confidence` or `export` is added or
   changed. The one number the diff introduces is `11.9` in a test fixture dict
   (`test_a_not_transcribed_material_may_state_no_cte`), which is a synthetic
   value in a synthetic entry whose whole point is that nothing sources it — it
   reaches no stack and no projection.
2. **Signs on every path term** — **N/A.** No term list changed.
   `material_soak_factor` is a lookup wrapper over the existing
   `thermal_factor`; it computes no sign and no coefficient. The two call sites it
   replaces (`stage_terms` lines 348-350, `workbook_corner` lines 582-584) are
   substituted one-for-one, argument for argument. I re-ran
   `tests\debug_report_thermal_fit.py --terms` indirectly via the suite's
   term-for-term pin (`test_the_projected_terms_are_the_report_that_reviews_them_
   term_for_term`), which is green.
   **2b. Coherent material corners** — `workbook_corner` is touched only at its
   three soak-factor lines; the corner logic is untouched.
3. **LMC/MMC direction** — **N/A.** `fold()` untouched; nothing new reads
   `lmc`/`mmc`.
4. **RSS actually computed** — **N/A.** No check, verdict or result changed. The
   rebuilt projection is byte-identical outside `built_at`/`provenance` (below).
5. **Nominal inside its own min/max** — **N/A.** No element transcribed.
6. **Quantised cotter/castellation constraints** — **N/A.** No joint in scope.
7. **Traced / inferred / untraced ratio** — **unmoved, re-derived by me** with
   `tests\debug_report_tolerance_stacks.py --ratio` on the merged tree:

   > **5 of 26** element instances across the three seeded slice-1 stacks are
   > `traced`; 3 are `inferred` and 18 are `untraced`. All stacks: 21 traced /
   > 7 inferred / 20 untraced of 48 instances.

   Identical to the figure trunk carries. The non-element ratio for the thermal
   stacks (0 of 7 — three CTEs, two temperatures, two stiffness ratios) is also
   unmoved: `materials.json` is not in the diff. Worth stating plainly, because
   this handoff is *about* CTE provenance and changes none of it — it makes an
   honest state **expressible**, it does not source anything.

## Verification performed

- **The new guard was observed failing** (universal check). Collection of the new
  tests dies on `ImportError: material_soak_factor` against trunk, which proves
  nothing, so I shimmed the pre-work behaviour into the new function's name
  (`return thermal_factor(materials[material_id].cte_1e6_per_c, delta_t_c)`) and
  re-ran. All four go red, each for its own reason:
  `test_a_not_transcribed_material_may_state_no_cte`,
  `test_an_inline_or_library_material_with_no_cte_is_still_refused` and
  `test_a_material_with_no_cte_has_no_soak_factor` on `KeyError:
  'cte_1e6_per_c'` at `thermal.py:151` (the issue's repro verbatim);
  `test_a_stack_is_refused_rather_than_computed_against_a_cte_less_material` on
  `TypeError: unsupported operand type(s) for *: 'float' and 'NoneType'` at
  `thermal.py:198`. Both directions of the optionality are demonstrated, as the
  DoD required.
  Worth recording, because it sharpens the lesson's `0.0` argument: the *old*
  code did not silently zero either — `None` propagated to a `TypeError` two
  frames down. The gain from `material_soak_factor` is therefore a **named,
  load-time** refusal, not the prevention of a silent wrong answer. That is still
  the right change; the docstring's framing is about the alternative the author
  declined, so it is not overclaiming.
- **The `depends_on` claim, replayed.** The lesson and the issue's RESOLVED note
  both assert that `js_python_vocabulary_pairing` bound — that spelling the rule
  as `values_status in ("inline", "library")` is *refused*. I re-spelled it that
  way and ran `tests/test_js_python_vocabulary.py`: red, with
  `LookupError: expected exactly one 'self.values_status not in (...)' membership
  test ... found 2`. The claim is true, and the shipped spelling
  (`!= "not_transcribed"`) both keeps the vocabulary in one place and fails safe
  for a status added later.
- **Python suite, both checkouts.** Merged review worktree: **437 passed, 1
  skipped**. Trunk in the **main checkout** before the merge: 434 passed, 0
  skipped — the same 434 tests, the skip being the node-fs tier that has no
  `data/` in a worktree. **After the merge landed on `master`, the main checkout
  reports 438 passed, 0 skipped**, which is the shipping figure; the four new
  tests are the whole delta and none of them is data-dependent.
- **JS suite with the `[real]` tier running**: `node apps/viewer/run_tests.cjs
  --repo C:/workspace/tolstack` from the review worktree → **131/131**, `[real]`
  tests present in the output (including `[real] the live material entries show
  the provenance of their CTE`), i.e. the tier ran rather than skipping. Re-run
  bare from the main checkout after the merge: **131/131**, tier also running.
- **Projection rebuilt and diffed.** `scripts/build_viewer_projection.py
  --data-root C:/workspace/tolstack/data` from this review worktree. The gate did
  not refuse — the previous stamp names `spec_citation_identity_rendering`, now an
  ancestor. Diff of old vs new: **nothing differs outside `built_at` and
  `provenance`.** `crops.json` and the spec-library projection were not rebuilt:
  neither `docs/spec_library/events/` nor any citation moved.
- **The lesson's cross-references, spot-checked.** `apps/viewer/tests.js:66-67`
  really are `eq(VA.fmt(null), "—")` / `eq(VA.fmt(undefined), "—")`;
  `keyUnion` really does compare the key union across instances, so the shape
  guard really would not have caught a dropped fixture key. `PROVENANCE.md` row 77
  is the right row.
- **Reachability of the new state, independently derived.** `stack_materials`
  (`scripts/build_viewer_projection.py:398`) builds material rows only from
  chain-named materials, and a chain naming a CTE-less material raises inside
  `load_thermal_fit_stack`. So the lesson's central consequence — no projection
  can carry a CTE-less material row — holds, and deliverable 3's decision to keep
  `DEMO_BEARING_STEEL`'s placeholder CTE is correct.
- **Housekeeping.** `git diff -w --stat` is identical to `git diff --stat`, so no
  reformat is hiding a change. No `</invoke>` / `</content>` / `<parameter`
  fragment anywhere in the diff; the lesson's last line is prose. No
  `{{REPO_NAME}}`. `data/inbox/specs/` untouched. Nothing written into
  drawing-checker — the diff contains no path outside this repo and this review
  read no drawing.

## Findings

### Should-fix — both fixed inline on the review branch

1. **`PROVENANCE.md` row 77 overstates its own size.** The new amendment opens
   *"four sentences inside the material entry paragraph"*. `git diff -w
   master...HEAD -- docs/tolerance_stacks/README.md` shows **two** sentences
   added and one line of surrounding text re-wrapped. `tests/test_provenance.py`
   asserts the cell *moved*, never that it describes what moved, so nothing
   catches this. Corrected to "two sentences". Nth sighting of the stale-count
   family; the variant — *the count is about the diff the amendment ships with* —
   is now appended to the overlay's PROVENANCE bullet, since it is the cheapest
   member of that family to check.

2. **`apps/viewer/README.md` promised a rendering no build can produce.** The
   `values_status` legend gained *"the schema lets the entry state none at all (a
   `—` in the CTE column)"*. A `—` there is unreachable: no projection can carry a
   CTE-less material row (see above), which the lesson works out itself and uses
   as its reason for *declining* an unreachable `cte === null` branch in the JS.
   The same commit then wrote the unreachable state into the reader-facing legend.
   Reworded to say the schema permits it and that the viewer will never show it,
   naming `thermal.material_soak_factor`. New overlay entry seeded for the class.

### Nits (no action taken)

- `viewer.js`'s chip text now explains a schema rule (*"since 2026-08-12 the
  schema lets such an entry state no CTE at all"*) on a surface that cannot
  display that state. Unlike the README bullet it asserts nothing about
  rendering, so it is defensible as written — but it is prose about the schema in
  a place that describes the screen, and the next edit to that string should
  probably drop it.
- The lesson quotes **JS 131/131** and names the `--repo` invocation but never
  says in words that the `[real]` tier *ran*. The command is the tell and the
  digits are unambiguous (108 without it), so this is a wording preference, not a
  defect — recorded only because the overlay asks reports to say so explicitly.
- `MaterialEntry.from_dict` does `float(cte) if cte is not None else None`. A
  non-numeric string still dies with a bare `ValueError` from `float()` that does
  not name the material, unlike every other failure in `__post_init__`.
  Pre-existing for every other field; out of scope.

### Not findings, checked and cleared

- **`ARCHITECTURE.md` line 77** describes `MaterialEntry` as *"one material +
  condition, its CTE, a `values_source`-shaped citation…"*. That is a shape
  summary, not a requiredness claim, and it stays true. Line 79's *"the
  archetype's **one** new arithmetic primitive"* for `thermal_factor` also stays
  true — `material_soak_factor` is a lookup and a refusal, it combines nothing,
  so the `fold()`-is-the-only-arithmetic invariant is intact and
  `Term.coefficient > 0` is untouched.
- **The date skew** (`20260812` filenames, 2026-08-17 in `PROVENANCE.md` and the
  issue's RESOLVED stamp). Consistent with `spec_citation_identity_rendering`,
  which shipped on 2026-08-17 under `20260813` names, and the lesson states the
  convention explicitly rather than leaving it to be inferred.
- **The out-of-scope prose edit** (`viewer.js` + `apps/viewer/README.md`). The
  handoff scoped the viewer to "only as far as tolerating a null CTE requires",
  which is nothing. The author changed two sentences anyway because the change
  made them false, declared it in the lesson, and changed no key, branch or
  rendering. That is the right call and the right disclosure.
- **The issue file** carries its frontmatter and moves `status: triaged` →
  `resolved` with a dated RESOLVED blockquote naming the option taken.

## Verdict

**APPROVE** — 0 blockers.

A tight, honest piece of work. The lesson is the strongest part: it reports that
the `depends_on` bound in a way the handoff did not anticipate, records the
argument against `0.0` rather than asserting it, derives a consequence
(unreachability in the projection) that then *decides* deliverable 3, and says
which checkout produced its counts. Both of my findings are one-clause prose
corrections in the half of the diff no test can read.

## For the next reviewer

- The overlay gained two things from this review: a size clause on the
  PROVENANCE-amendment bullet, and a new recurring entry — *a doc promising a
  rendering the producer cannot emit*. Both are prose-only failure classes; the
  code half of this handoff was clean on first read.
- `SourceRef.confidence` is still unvalidated (`confidence='banana'` constructs)
  and `VA.CONFIDENCES` still has no single definition to pair against — carried
  forward from `js_python_vocabulary_pairing`'s lesson and named again in this
  one. Neither is filed against this handoff; both remain open issues.
