---
priority: med
depends_on: []
model: opus
---

# HANDOFF 2026-09-16 — python_value_and_schema_pins: four values the Python tier publishes and does not pin — a verdict domain, a margin, a register schema, and a run id living in prose

Source: the 2026-09-16 dispatch triage sweep, dispositioning four open issues in
`docs/issues/`, all filed by 2026-09-15 sessions:

- `docs/issues/ISSUE_20260915_the_verdict_domain_is_unpinned_and_restated_by_hand_in_two_tests.md`
  (bug, low; filed out of `viewer_study_verdicts_and_gaps`)
- `docs/issues/ISSUE_20260915_check_result_margin_has_no_value_test_in_python.md`
  (chore, med; filed out of `viewer_study_verdicts_and_gaps`)
- `docs/issues/ISSUE_20260915_topology_builder_drops_the_hardware_register_schema_check.md`
  (bug, low; filed out of `viewer_study_verdicts_and_gaps`)
- `docs/issues/ISSUE_20260915_the_joint_assembly_export_is_prose_so_its_runs_have_no_ts.md`
  (chore, low; filed out of `pitch_link_known_bands`)

Baseline: `master` after the 2026-09-16 batch merge, which measured **1155
passed** on `venv-win/Scripts/python.exe -m pytest -q`. You are not fixing a red
tree; that number is your starting line.

Scope: `tolerance_stack/stack.py`, `tests/test_tolerance_stack.py`,
`scripts/build_topology_projection.py` (the `load_hardware` function only), and
`docs/tolerance_stacks/*.json` for the deliverable-4 migration.

Do NOT touch, each with a named owner in this same sweep:

- `apps/viewer/tests.js`, `apps/viewer/views/`, `apps/viewer/style.css`,
  `tests/test_viewer_crops.py`, `scripts/build_viewer_crops.py`, and the
  `SUITES` loop in `scripts/run_viewer_browser_tests.mjs` — owned by
  `HANDOFF_20260916_viewer_unwitnessed_surface_guards.md`. This is why
  deliverable 4 is explicitly **additive** and does not retire
  `build_viewer_crops.py`'s regex (see that deliverable).
- `tests/test_js_python_vocabulary.py`, `tests/test_topology_projection.py`'s
  `JS_PAIRINGS`, `apps/viewer/viewer.js`, `apps/viewer/topology.js`, and the
  `UNVERIFIED_CONFIDENCES` constant in `scripts/build_topology_projection.py` —
  owned by `HANDOFF_20260916_reader_facing_copy_and_vocabulary.md`.
- `apps/annotate/`, `scripts/run_mutation_witness_tests.mjs`,
  `scripts/mutation_witnesses.json`, `docs/reference/`, `data/inbox/specs/`.
- The `source_ref` blocks of any element in `docs/tolerance_stacks/*.json` —
  `HANDOFF_20260916_citation_identity_correctness.md` is re-citing three of them.
  Deliverable 4 touches the `joint` block only.

## Why these four are one handoff

Not by theme — by file. Three of the four land in `tolerance_stack/stack.py`
(deliverables 1, 2 and 4) and two of those three land in the same test module,
`tests/test_tolerance_stack.py`, within a few lines of each other: the verdict
assertions at lines 243 and 311, the margin tests that go "beside the existing
verdict tests", and the read-only invariant
`test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit` at
line 1320. Deliverable 3 is `scripts/build_topology_projection.py` importing
`SCHEMA_HARDWARE` from that same `stack.py`. Two parallel branches here would
collide in one module and one test file.

The shared theme is real too, and it is worth stating because it is what the
lesson has to answer at the end: **every one of the four is a value this repo
publishes to a reader with nothing standing on it in Python** — a verdict word
restated by hand instead of imported, a margin whose sign nothing checks, a
register whose schema one builder enforces and its sibling does not, and a run
id that exists only inside an English sentence.

## THE BINDING REQUIREMENT, and it applies to every deliverable below

**Every guard or pin this session adds must be demonstrated reddening on a
planted mutation, and the plant must then be reverted.** Plant the exact edit
the deliverable names, run `venv-win/Scripts/python.exe -m pytest -q`, copy the
failing test's name and assertion line **verbatim** into the lesson, revert the
plant, re-run, confirm green at the baseline count. A guard nobody has watched
fail does not count as done and must not be reported as done.

This is not ceremony. tolstack has a measured, repeatedly-filed class of
**guards that survive their own mutation**: five issues from five different
review sessions inside one window (2026-09-11 to 2026-09-15), three of them
found only because a reviewer mutated the code by hand and noticed the suite
stayed green. Deliverable 2 exists because exactly that happened to `margin`.
Adding another written-but-unwitnessed guard is the failure mode here, not the
fix.

## Deliverables

1. **Import `VERDICTS` at the two sites that restate it, and add the
   enumeration test its docstring already claims.**
   `viewer_study_verdicts_and_gaps` minted
   `VERDICTS = ("pass", "marginal", "fail")` at `tolerance_stack/stack.py:96`
   for the reason `CONFIDENCES`, `SOURCE_REF_KINDS` and `ELEMENT_ROLES` were
   each minted before it (`CLAUDE.md`: a field vocabulary is a module-level
   constant, never a literal). Two literals survive, both in
   `tests/test_tolerance_stack.py`: line 243,
   `assert got.verdict in ("pass", "marginal", "fail")` — sitting one line above
   `assert got.verdict_scope in VERDICT_SCOPES`, which *does* import its tuple —
   and line 311, the same literal on `as_dict()`'s row. Replace both with
   `VERDICTS`. Then add the test the constant's docstring wanted: construct
   checks that land on **each of the three words** and assert `verdict` is
   always a member of `VERDICTS`. All three are live in the repo (the topology
   projection carries 4 `pass`, 3 `marginal`, 11 `fail`), and
   `CheckResult.verdict` (`stack.py:662`) reaches them by `interval.min >= 0`
   → `pass`, `interval.nominal >= 0` → `marginal`, else `fail`, so three
   constructed intervals are enough — no data needed.
   *Mutation to plant:* add a fourth return value to `verdict` (e.g. return
   `"borderline"` where it returns `"marginal"`). The new enumeration test must
   redden. Note that the old two-literal assertions would have caught this one
   too — so **also** plant the reordering/renaming mutation that they could not
   see: change `VERDICTS` itself to `("pass", "marginal", "failed")` and confirm
   the imported-constant sites now move with it rather than silently disagreeing.
   Report both results.

2. **Pin `CheckResult.margin`'s value, and pin the criterion gate.**
   `CheckResult.margin` (`tolerance_stack/stack.py:679`) is the signed
   worst-case distance to the criterion, it is in `as_dict()`, both projections
   carry it and the DAG page prints it beside every verdict — and **no test in
   `tests/` asserts a `margin` value.** Measured in
   `review/viewer_study_verdicts_and_gaps`: changing the body from
   `return self.interval.min - 0.0` to `return self.interval.max - 0.0` — the
   *most permissive* corner of the interval rather than the binding one — left
   the suite at **886 passed / 1 failed** on that day's tree, the single failure
   being the unrelated, pre-existing
   `test_every_byte_identity_claim_in_a_live_file_names_its_verification`.
   Two reasons the existing net misses it, both worth knowing before you write
   the test: `test_the_l1_studys_projected_check_matches_check_study_field_for_field`
   (`tests/test_topology_projection.py`) builds its expectation with the
   builder's own `B.rounded_check(...)`, so it compares the projection against
   the code that produced it — right for the rounding rule, blind to a wrong
   margin rule; and the only pin on a margin *value* anywhere is a
   rendered-string assertion in the JS `[real]` tier
   (`has(out, "margin -8.1939 mm at worst case")`) which reads the *built
   projection file*, so it fires only after somebody manually re-runs
   `scripts/build_topology_projection.py` — one artifact and one language away
   from the rule.
   *Suggested shape, from the issue:* two assertions in
   `tests/test_tolerance_stack.py` beside the existing verdict tests —
   `margin == interval.min` for the pitch-link budget check at its published
   **-8.1939**, with the source cell reference in a comment, and
   `pytest.raises(NotImplementedError)` for a criterion other than `">= 0"`
   (both `verdict` and `margin` carry that gate at `stack.py:671` and
   `stack.py:698`; **neither** has ever had a test).
   *Mutation to plant:* the exact `interval.max` edit above. The new value test
   must redden with the wrong number printed.
   Why this one matters more than a typical missing test: which end of a budget
   check's interval is the requirement is a question this repo has **already got
   wrong once in prose, by 0.708 mm, with every folded value correct and every
   test green** (`docs/prompts/REVIEW_AGENT.md`, mandatory check 2, and the
   `grip_budget__*` entry).

3. **Make `load_hardware` refuse a present-but-wrong-schema register, exactly
   as its sibling builder already does.**
   `scripts/build_viewer_projection.py`'s `build()` raises when the register's
   `schema` is not `SCHEMA_HARDWARE`
   (`= "joby.tolerance_stack/hardware_entry/v0"`, `tolerance_stack/stack.py:59`).
   `scripts/build_topology_projection.py`'s `load_hardware`
   (line 629, added 2026-09-15) reads `entries` off whatever JSON is at the path
   and returns `{"entries": []}` when the file is absent, with **no schema check
   at all**. So a register that has been renamed, re-schema'd or replaced makes
   the DAG page's "What's missing" panel report **no hardware questions** — 43
   of the 98 live gap rows are `hardware_entry` — while the classic view's
   builder refuses the same file loudly.
   Keep the absent-file tolerance: it is deliberate and argued in the
   docstring (a fixture tree carries its own register, and a tree without one
   honestly has no hardware-entry gaps). What has no argument behind it is
   tolerating a *present but unreadable* one, because on that page an empty gap
   list is a positive claim that nothing is missing. Import `SCHEMA_HARDWARE`
   (already exported from `tolerance_stack.stack`) and raise on a mismatch;
   absence stays silent.
   *Mutation to plant:* with the live register in place at
   `C:\workspace\tolstack\data\hardware_entries.json`, temporarily rewrite its
   `schema` value to something else and show the builder raising rather than
   projecting an empty hardware-gap list — then restore the file byte-for-byte
   (`git status` cannot help you here; `data/` is gitignored, so copy it aside
   first). Also add the test that pins the raise so the guard is standing and
   not just observed once. Do the mutation against a **copy** of the register in
   the scratch tree if you can arrange it — an accidental loss of that file is
   not recoverable from git.

4. **Give `joint` a real, structured export so its runs carry a `ts` — and
   extend the read-only invariant to read it.**
   `stack.py` has a first-class `SourceExport` (line 176: `status`, `pdf`,
   `sha256`, `runs` as `ExportRun(run_id, ts)`, `why`, `note`, with
   `EXPORT_STATUSES = ("established", "unestablished")` and validation in
   `__post_init__`) and every element-level `source_ref` uses it. A stack's
   `joint` does not — `joint` is a plain dict (`stack.py:848`,
   `joint=data.get("joint", {})`, no dataclass, no validation) and
   `joint.assembly_export` is a free string, e.g. in
   `docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json:10`:
   `"[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf (drawing-checker run 20260804_114000 / 20260803_145243)"`.
   That was harmless while the same runs were also cited at element level. It
   stopped being harmless on 2026-09-15 (`pitch_link_known_bands`): the
   pitch-link bushing and washer were re-cited to the 214820-002 part drawing
   and the 260729 workbook when their bands were applied, and they were the
   **only** carriers of the 217755 export block. Those two runs are now named
   only in prose, which has no `ts`, so
   `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`
   (`tests/test_tolerance_stack.py:1320`) can no longer check them — and that
   test is this repo's one place where *"nothing was written into
   drawing-checker"* is **verified rather than asserted**. It still bites on the
   three 215197 runs and its docstring records honestly what it lost.
   **The issue's "migration across all seven stack files" is wrong, and the real
   shape is easier — verify this yourself before planning:** only four of the
   seven stacks have an `assembly_export` key at all. Two carry real runs
   (`stack_pitch_link_to_pitch_plate.json`,
   `stack_rotor_fastener_length.json`), two carry a sentinel sentence
   (`stack_hub_bearing_thermal_fit_m1.json`: `"not read for this stack"`; `_m2`:
   `"not read for this stack -- see identification_note"`), and three have no
   such key (`stack_tan_link_to_pitch_plate.json`, `_take2`,
   `stack_vpa_output_to_pitch_plate.json` — their `joint` keys are
   `assembly_drawing`, `assembly_revision`, `description`, `scope`, `sheet`,
   `view`, `zone`, `zone_note`). So the schema must keep three states, not two:
   a structured export, an explicit "not read for this stack", and absent.
   *Suggested shape, labeled as a suggestion — prototype it and report
   feasibility in the lesson:* keep `joint.assembly_export`'s human sentence
   exactly as it is and add a **sibling** structured field on `joint` parsed
   through the existing `SourceExport`/`ExportRun` (so `unestablished` + `why`
   is how "not read for this stack" becomes machine-readable), then extend the
   predate invariant to walk joint-level exports through the same path as
   element-level ones. Additive is deliberate: `scripts/build_viewer_crops.py`
   reaches the run ids with `_RUN_ID_RE` (line 182, used at line 492) and both
   that file and `tests/test_viewer_crops.py` are owned by
   `viewer_unwitnessed_surface_guards` this sweep, so **retiring the regex is
   explicitly out of scope** — leave it working against the surviving prose
   field and file a follow-up issue for the retirement.
   *Mutation to plant:* once the invariant reads joint level, edit the
   pitch-link joint export's `ts` for `20260804_114000` to a value **after**
   `pitch_link_stack`'s first commit `d6829f2` (2026-08-04T22:42:57Z) and show
   the predate test reddening on that run specifically — i.e. show that the half
   of the invariant the 2026-09-15 re-citation lost has actually come back.
   Revert. The constants in that test are git history and do not move; if it
   fails for any other reason, say so rather than adjusting it.

## Definition of done

- `venv-win/Scripts/python.exe -m pytest -q` green, at **1155 passed plus the
  tests this session adds** — state the new number and the delta explicitly. A
  test count that did not go up means deliverables 1, 2 and 4 did not land.
- `venv-win/Scripts/python.exe scripts/build_topology_projection.py` runs clean
  against the real tree with `--data-root C:\workspace\tolstack\data` (from a
  worktree the venv and `data/` exist only in the main checkout — use
  `C:\workspace\tolstack\venv-win\Scripts\python.exe` and that absolute
  data root, or your output is deleted with your worktree), and the projection
  it writes still carries the 98 gap rows including the 43 `hardware_entry`
  ones. Deliverable 3 must not change what a correct register projects.
- Every mutation named above: planted, output captured verbatim, reverted,
  re-run green. **Four plants minimum, five counting deliverable 1's second
  one.** Any deliverable whose plant did not redden is reported as NOT done,
  with the reason, rather than shipped with a written guard.
- Lesson (`docs/sessions/lessons/LESSONS_20260916_python_value_and_schema_pins.md`):
  the verbatim failing line for each plant; whether the additive joint-export
  shape in deliverable 4 held up under prototyping or whether `joint` needs a
  real dataclass (and what that would cost the three stacks with no
  `assembly_export` key); what the `NotImplementedError` gate tests in
  deliverable 2 revealed about the criterion vocabulary — is `">= 0"` the only
  criterion any live stack uses, and where is that written down; and one
  sentence on whether the four holes here share a cause you can name, given
  that all four were published to a reader before anything in Python stood on
  them.
