---
type: review
handoff: mechanical_stroke_stack
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review — mechanical_stroke_stack

Branch reviewed: `handoff/mechanical_stroke_stack` (commits `ad4e601`,
`e1ca348`), cut from `integration` at `f21c53c` (`endstop_location_stack`
merged, its own stated baseline). **`integration` had since advanced past that
point** (the `annotation_surface_mvp` merge, `30fa741`) while this handoff was
worked, so `git diff integration handoff/mechanical_stroke_stack` shows a
misleading ~5700-line deletion of `apps/annotate/` and friends — that is
`integration` having gained content the handoff's branch point never had, not
this handoff removing anything. The real diff is
`git diff f21c53c handoff/mechanical_stroke_stack`: 8 files, +739/-9, all
inside the handoff's own fence (topologies + studies + checks + tests +
worksheet prose; no `fold()`, no spec-event, no `apps/`, no drawing-checker
interaction). Merged cleanly (no conflicts) into this review branch, which was
cut from current `integration`.

Scope: extend the shared `topology_pitch_system.json` with the gas-spring's
own internal mechanical stroke/stop (new node + edge), add one new study with
one derived-margin check, append a second `checks` entry to each of the two
existing end-stop studies, and account for the S461 gas-spring stroke
requirement family. No `stack_*.json`, no `tolerance_stack/*.py` (the existing
`Study.checks`/`check_study()` from `endstop_location_stack` needed no code
change), no `apps/`.

## The seven mandatory checks

**1. Every tolerance traces to a specification/drawing/requirement callout —
PASS, verified independently.**

- Re-derived the one new numeric limit from scratch against the live pull
  (`C:\workspace\tolstack\data\inbox\requirements\S461_equipmentrequirements_20260906.json`,
  present in the main checkout): S461-241 gives a 79° total stop span
  (-7° to +72°), S461-516/637 gives a 75° operating range and a stated
  61.67mm/75° equivalence. `79 - 75 = 4°`; `4 × (61.67/75) = 3.289066…` →
  `3.289067mm`. Both figures match exactly.
- Confirmed all four near-duplicate id pairs (610/636, 516/637, 616/638,
  617/639) are byte-identical (`c_title` and `c_description` equal, only
  `c_id`/`c_created` differ) by loading the pull directly and comparing —
  matches the handoff's own claim and its pinned test.
- Confirmed `c_status`: S461-241 `draft`; S461-516/637/616/638/617/639/613/663/
  618/656/620/640 all `validated`; S461-735/744/745/748/749/795 (out-of-scope
  brake family) all `draft` — matches every status claim in the lesson and
  worksheet §10.
- Confidence is honest: the new edge's dimension is `kind: "assumed"` /
  `confidence: "untraced"` (no source states a stroke-length *band* anywhere —
  checked S461-516/637 (nominal only), S461-613/663 (a force tolerance, wrong
  quantity), and worksheet row 63 (a radial bushing clearance, wrong axis) and
  confirmed all three are correctly ruled out, not merely unconsidered). The
  two derived limits are `confidence: "inferred"`, never `"traced"` — correct,
  since neither cited requirement states the margin as its own number, and the
  worksheet says so explicitly (SOP Step 5b).
- No `kind: "parts_list"` claims `traced` here; no `workbook`-only citation
  claims better than `untraced`. `end_stop_clearance`/`gas_spring_mount_position`
  (from the prior handoff) are untouched.
- **One stale count found and fixed inline** (see Findings) — a prose-only
  miscount, not a provenance defect: the topology's own
  `provenance.mechanical_stroke_extension_20260906` note said "those six
  requirement ids" over a list that actually names eight
  (610/636/516/637/616/617/638/639). Recounted by hand against the note's own
  enumeration.

**2. Signs on every path term — PASS.** All three new/appended checks reuse
`check_study()` unchanged from `endstop_location_stack` (no `tolerance_stack/`
edit): `Term(limit, sign=+1)`, `Term(total, sign=-1)` through the one `fold()`.
Recomputed all three margins independently (not from the test's own numbers):
for the two appended end-stop checks, margin = `4.0 − total`, where `total` is
each study's own pre-existing accumulated interval (half-widths `±1.091240625`
at -7°, `±0.816796875` at +72°, matching the endstop review's independently-
computed totals exactly, since the appended checks fold the *same* study
totals, unchanged); for the new gas-spring-stroke study, margin =
`3.289067 − (±0.10)`. All three reproduce the pinned test values
(`(2.908759375, 5.091240625)`, `(3.183203125, 4.816796875)`,
`(3.189067, 3.389067)`) exactly. `Term.coefficient` unused; direction lives
only in `sign`.

**3. LMC/MMC direction — N/A, correctly.** The new edge carries no `lmc`/`mmc`
fields (a plain `nominal`/`min`/`max`/`plus_minus` variation-only dimension,
consistent with this topology's stated convention). No bonus-tolerance
arithmetic invented anywhere.

**4. RSS actually computed — PASS.** Same `check_study()` code path as
`endstop_location_stack`, unmodified; RSS fields populate automatically from
the shared `fold()`. No verdict reads RSS.

**5. Nominal inside its own min/max — PASS.** New edge: `nominal: 0.0`,
`min: -0.10`, `max: 0.10`. Holds.

**6. Quantised constraints (cotter/castellation) — N/A.** No such hardware in
this handoff's scope.

**7. Traced/inferred/untraced ratio — computed independently, not copied.**

- Topology-internal (re-derived directly with `load_topology(...)` +
  `Counter`, not read off the prose): **3 traced / 1 inferred / 20 untraced**,
  of **24** dimensioned edges — up from 23 (the ratio itself is unchanged; the
  new edge is `untraced`). Kind split: **9 workbook / 6 drawing / 9 assumed**,
  matching `docs/DAG_TOPOLOGY.md`'s updated sentence exactly.
- SOP headline ratio (`tests\debug_report_tolerance_stacks.py --ratio`, run
  myself): **5 traced / 3 inferred / 18 untraced of 26** (seeded), **30/9/20
  of 59** (all stacks) — unchanged, correctly so, since this handoff touched
  no `stack_*.json`.
- Non-element values: one new derived numeric limit (3.289067mm / 4°, one
  value used three ways) plus the requirement citations backing it
  (S461-241, S461-516/637, S461-617/639, S461-616/638 as context) — all shape-
  and value-pair-tested against the live pull
  (`test_mechanical_stroke_checks_requirement_citations_quote_the_pulled_artifact_verbatim`,
  `test_the_near_duplicate_requirement_pairs_are_byte_identical_not_variants`),
  both of which I re-ran and independently re-verified the underlying string
  comparisons for.
- Every `untraced` value is accounted for: the new edge is a `kind: "assumed"`
  `PLACEHOLDER` (test-enforced), and it correctly does **not** appear in the
  worksheet's §9 unresolved-identity list — that list is for the `candidate`
  outcome (a real callout in reach, identity not established), and this edge
  has no callout in reach at all, which is the different, explicitly-excluded
  shape. Checked, not assumed: verified the three specific candidates the
  worksheet says it ruled out (S461-516/637, S461-613/663, row 63) really are
  the wrong quantity/axis, not just asserted to be.

## Additional items

- **Tests.** `venv-win/Scripts/python.exe -m pytest -q` → **667 passed, 1
  skipped** in this worktree, re-run myself after merging and again after my
  own inline fix. The one skip is the pre-existing `test_viewer_js_suite.py`
  node-fs-tier skip (unrelated to this handoff; `apps/` untouched). All
  data-dependent new tests (the two live-pull-pairing tests above) **ran**,
  not skipped, confirming the gitignored pull artifact resolves correctly via
  its absolute main-checkout path regardless of cwd.
- **The sibling-handoff race, checked and explained above.** `integration`
  advanced past this handoff's branch point (`annotation_surface_mvp` merged
  in the interim); merging `handoff/mechanical_stroke_stack` into a review
  branch cut from current `integration` produced no conflicts, and the full
  suite is green on the merged tree, not just on the handoff's own
  merge-base.
- **The "appended, not edited" claim on the two existing end-stop studies** —
  checked structurally, not just read: `git diff f21c53c..handoff -- study_pitch_system_end_stop_minus7.json`
  shows a pure addition (`checks[1]` appended, nothing else touched), and
  `test_the_end_stop_studies_first_check_is_unchanged_by_the_appended_second`
  re-derives `checks[0]`'s own margin from scratch and pins it against the
  same expected half-widths the prior review recorded independently
  (`±1.091241`/`±0.816797`) — a real re-derivation, not a diff-absence check
  alone.
- **The connectivity design decision** (new node/edge reusing an existing
  node rather than floating a disconnected pair) is real and load-bearing —
  see the new "Architectural errors to check" overlay entry below. Confirmed
  `gas_spring_mechanical_stroke.to_node == "gas_spring_mount_flange"` directly
  and that the whole topology is one connected component (union-find over all
  edges, by hand, not just trusting the new test that pins the same thing).
- **Derived-margin honesty.** The 4° figure is explicitly disclosed as a total
  margin with no stated per-stop split, in every affected check's
  `excluded_terms` — not glossed over by a passing-looking number. All three
  new/appended checks are `complete: false`, `verdict_scope: "budget"`, never
  a hardware verdict, despite all three numerically passing at worst case.
- **`docs/reference/`, `data/inbox/specs/`, `data/inbox/requirements/`,
  drawing-checker's tree**: untouched, confirmed by the diff itself and (for
  drawing-checker) by `git status` over there showing nothing attributable to
  this session.
- **ARCHITECTURE.md**: correctly needs no new inventory row — no new Python
  module or function, only new JSON documents and a `checks` list entry the
  existing `check_study()` already reads.
- **Structural counts** (12 parts, 21 interfaces, 24 edges, 5 branch points)
  re-derived directly from the loaded topology (`len(t.parts)`,
  `len(t.nodes)`, `len(t.edges)`, `len(t.branch_nodes())`), not read from
  prose — all match `docs/DAG_TOPOLOGY.md`'s updated L2 section exactly.

## Findings

**One should-fix, fixed inline (few lines, no behavior change, no test
needed — clears the inline-fix boundary):**

1. `docs/topologies/topology_pitch_system.json`,
   `provenance.mechanical_stroke_extension_20260906` — "Every one of those
   **six** requirement ids is `c_status: validated`" over a list that
   enumerates **eight** (S461-610/636/516/637/616/617/638/639). Recounted by
   hand against the note's own text. This is a second sighting of the
   overlay's already-documented "stale count restated in prose" class — no
   new checklist entry needed for this half of the finding; a new one is
   added below for the connectivity design decision instead, which is
   genuinely new.

No blockers. No other should-fix or nit findings survived a from-scratch
recomputation of every claim above.

## Verdict: APPROVE

Zero blockers. This handoff needed no new Python at all — the prior
handoff's `Study.checks`/`check_study()` schema absorbed a second check per
study and a brand-new study with zero code changes, exactly as that
handoff's own lesson predicted it would. Every numeric claim reproduces from
scratch (not merely self-consistent with its own tests): the derived margin's
arithmetic, both requirement near-duplicate-pair comparisons, the topology's
structural counts, and the confidence/kind splits. The one stale count found
is prose-only, fixed inline. The connectivity redesign (reusing
`gas_spring_mount_flange` instead of floating a disconnected pair of nodes)
is real engineering judgment, explicitly disclosed as an approximation, and
now pinned by a test — a good precedent for the brake-family stack, which the
lesson correctly predicts will hit the identical choice.

Merged `handoff/mechanical_stroke_stack` into `review/mechanical_stroke_stack`
(no conflicts), committed one inline doc fix on the review branch, then
merged this review branch into `integration` (see below). Full suite
re-verified green post-merge: 667 passed, 1 skipped.

## Note for the next reviewer (the brake-family stack)

Per this handoff's own lesson: expect the identical isolated-subgraph vs.
reuse-an-existing-node choice for the brake's own internal stroke/stop
representation (today only `kind: "assumed"` external edges, same shape the
gas spring had before this session) — check `test_topology_projection.py`'s
`components == 1` assumption early, and run the *full* suite, not just
`test_topology.py`, after any topology structural edit. Also inherit: the
brake's stroke-definition polarity is inverted relative to the gas spring's
(0mm = retract/feathered for the brake vs. 0mm = full extension for the gas
spring per S461-610/636) — do not assume the two components' zero points
correspond to the same blade-pitch extreme.
