---
type: review
handoff: docs/sessions/active/HANDOFF_20260916_python_value_and_schema_pins.md
reviewer: review agent (opus)
date: 2026-09-16
verdict: APPROVE
blockers: 0
---

# REVIEW 2026-09-16 — `python_value_and_schema_pins`

All four deliverables landed. Every guard the session added was **re-planted
independently in this review** rather than read out of the lesson, and every one
of them reddened. One inline fix (a stale unguarded count in a docstring the
session wrote), one correction blockquote on the lesson (two miscounts), one
issue filed for a should-fix left unfixed, one overlay entry added and one
corrected.

## What I verified, and how

**Baseline, measured here, not taken from the handoff.** On `integration`
(`82d3a95`) before merging: `1 failed, 1162 passed, 1 skipped`. The handoff's
stated `1155 passed, green` is stale and the single failure
(`test_no_live_document_states_an_unguarded_hardware_entry_count`, which matches
*"the other three do not have"* in an unrelated strategy brief) is pre-existing
and already filed twice. The author measured the same and filed nothing new —
correct.

**Post-merge:** `1 failed, 1172 passed, 1 skipped`. **+10 tests**, the same one
pre-existing failure. The merge was a clean fast-forward, no conflicts.

### The mutation plants, re-run in this review

Each was planted by me against the merged tree and reverted; the tree is back at
`1 failed, 1172 passed, 1 skipped`.

| plant | what I changed | result |
|---|---|---|
| A | `verdict` returns `"borderline"` where it returned `"marginal"` | RED — `test_every_verdict_a_check_can_reach_is_a_member_of_the_vocabulary`, plus `test_a_marginal_checks_margin_is_negative_even_though_nominal_passes` |
| B | `VERDICTS` → `("pass", "marginal", "failed")` | RED — the enumeration test only |
| C | `margin` returns `interval.max - 0.0` | RED — the two new margin tests **and** `test_pitch_link_shank_out_is_complete_and_passes_thinly` |
| E | delete the new `SCHEMA_HARDWARE` raise in `load_hardware` | RED — `test_a_hardware_register_with_the_wrong_schema_is_refused_not_read_as_empty` (`DID NOT RAISE ValueError`) |
| F | postdate `20260804_114000`'s joint-level `ts` to 23:40:27Z | RED — `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`, naming that run |
| G (mine) | delete the whole `assembly_export_ref` block from `stack_rotor_fastener_length.json` | RED — the pairing test **and** the three-states test |
| H (mine) | drift one run id **inside** the rotor block so it disagrees with the prose sentence | **GREEN — see finding 1** |

Plant B reproduces the author's honest note exactly: the two literal→`VERDICTS`
conversions at lines 245/313 do **not** bite on it, because both construct a
check that lands on `pass`. The bite is entirely in the new enumeration test.
That is worth keeping in the report, because "we converted two literals to the
constant" reads like the fix and is not.

### Provenance — nothing was invented

Deliverable 4 wrote a `sha256` and four `ts` values into two stack files. I
re-derived every one of them from primary sources rather than from the lesson:

* `c6381f20…4294d8` and `789efa19…b2c939` — re-hashed both PDFs in
  `C:/workspace/drawing-checker/data/inbox/drawings/`. Both match.
* All four `ts` values — read out of each run's own `run_meta.json` under
  drawing-checker's `data/runs/<id>_217755_…/`. All four match to the
  microsecond, and `20260804_114000`'s `run_meta.json` names the AUG-3 PDF and
  the same `sha256` as its input.
* The recovered AUG-3 block is byte-faithful to
  `git show 02e5077^:docs/tolerance_stacks/stack_pitch_link_to_pitch_plate.json`
  (`bushing_214820`), including the absolute `pdf` path, which is the
  established spelling for a cross-repo drawing-checker inbox file and not a new
  convention.

### The other definition-of-done items

* `scripts/build_topology_projection.py --data-root C:/workspace/tolstack/data`
  runs clean from this worktree with the main checkout's venv; the written
  projection carries **104 gap rows, 53 of them `hardware_entry`** — the
  corrected figures, not the handoff's stale 98/43. I recounted them off the
  written file.
* **The register is `docs/tolerance_stacks/hardware_entries.json`, tracked** —
  there is no register at the gitignored `data/` path the handoff told the
  author to mutate and to fear losing. The author said so and that is right.
* **37 authored criteria, 19 + 18, all `">= 0"`** — recounted independently.
  Declining to mint a one-member `CRITERIA` constant was the right call, and
  `test_every_authored_criterion_is_one_the_check_result_implements` is the pin
  that makes the `NotImplementedError` gate non-vacuous.
* **The new joint key does not reach any projection.** `assembly_export_ref` is
  absent from `data/projections/viewer/results.json` (which carries no `joint`
  at all), so no shipped artifact went stale behind this change.
* **The JS `[real]` tier was run after the merge**, per the overlay's
  stack-data-is-a-viewer-change entry: `node apps/viewer/run_tests.cjs --repo
  C:\workspace\tolstack` → **406/407**. The one red,
  `[real] a study fed by a zero-width row … names the rows that make it one`,
  is **not this branch's**: it is caused by `5ce16f3` (*the NAS1149V0332H washer
  folds the band its two siblings already fold*), which is already on
  `integration`, and `handoff/viewer_unwitnessed_surface_guards` — the owner of
  `apps/viewer/tests.js` this sweep — already carries the fix (`1874696`, *derive
  the lower-bound warning's named rows from the chain*). Left alone; not mine.
* `PROVENANCE.md`'s `tolerance_stack/stack.py` row is amended, correctly and in
  the house style. `scripts/build_topology_projection.py` has no row (not an
  imported file), so my inline fix needed none.

## Findings

### 1. should-fix — the two joint export carriers are paired on presence, not content

`tests/test_tolerance_stack.py`,
`test_a_joint_that_names_an_export_in_prose_also_names_it_structurally`.

The migration is deliberately additive: the prose `joint.assembly_export` stays
for `build_viewer_crops._RUN_ID_RE`, the structured `joint.assembly_export_ref`
carries the `ts`, and **neither is derived from the other**. The new guard
asserts only that a joint carrying one key carries the other. Nothing asserts
they name the same runs.

Measured (plant H above): change the structured block's first run id in
`stack_rotor_fastener_length.json` to `20260819_999999` while the sentence three
lines above still says `20260819_110144`, and the suite is unchanged at
`1 failed, 1172 passed, 1 skipped`. The one place both carriers *are* asserted
is a hand-written id on the other stack
(`assert "20260804_114000" in …` twice, in the predate test) — a pin on the
pitch link, not a rule about joints.

This matters more than a normal duplication because the structured block is what
the read-only invariant now reasons over: a drifted id still gets its arithmetic
done against `PITCH_LINK_FIRST_COMMIT` and still passes, for a run nobody ran.

Not fixed inline — the fix wants a new test, which fails prong 2 of the
inline-fix boundary. Filed as
`ISSUE_20260916_the_joint_export_prose_and_structured_run_ids_are_paired_on_presence_only.md`
(suggested shape: pair the sets through the crop builder's *own* `_RUN_ID_RE`).

### 2. fixed inline — a stale, unguarded count in a docstring this session wrote

`scripts/build_topology_projection.py`, `load_hardware`'s docstring: *"over the
43 of 98 live gap rows that are `hardware_entry`"*. Those are the handoff's
stale figures — the live projection has **104 / 53**, and this session's own
lesson corrects them in a table. So the session copied a number it had already
disproved into new prose that no test reads, which is the defect `CLAUDE.md`
names outright ("a quantity written in prose that no test reads from the tree is
a defect, regardless of whether it happens to be right today").

Fixed by **removing the count rather than updating it** — the docstring now says
"the `hardware_entry` rows — the largest single kind in that list", matching the
phrasing the session's own new test docstring already uses. Updating the digits
would have re-armed the same trap for the next audit. Docstring only; no
behavior, no test. Suite re-run green after the edit.

### 3. fixed inline — two miscounts in the lesson

Per the canonical checklist item on auditing the handoff's lesson, with a dated
correction blockquote (the established fix):

* *"Six mutations planted"* / *"The six mutation plants"* introduce a section
  documenting **seven** (A–G, with D in two rounds). Every one of them was real
  and reddened; only the tally is wrong — and the real number clears the
  handoff's "four minimum, five counting deliverable 1's second one" by more
  than the stated one did.
* *"Three of this handoff's four quoted figures were stale"* contradicts the
  table immediately below it, which lists four rows under *"Four figures …
  none correct now."* Four is right; three is true only of the narrower clause
  that follows (figures quoted forward out of an issue — the baseline went stale
  because `integration` moved).

Everything else in the lesson was re-derived here and holds; the blockquote says
so explicitly, so the corrections are not read as doubt about the rest.

### Nits

* `tolerance_stack/__init__.py` re-exports neither `JOINT_EXPORT_KEY` nor
  `JOINT_EXPORT_PROSE_KEY`, while `PROVENANCE.md`'s `__init__.py` row states
  flatly that **"a new module constant means this file changes"**. The same
  thing happened to `VERDICTS` on 2026-09-15. Not raised as a finding, because
  the rule as written may simply be wrong now: `tolerance_stack.feature_identity`
  has its *own* `VERDICTS`, so a blanket re-export policy collides, and these two
  are internal key names rather than a field vocabulary a consumer needs. But the
  rule and the practice now disagree with nothing catching either — worth
  settling one way in whichever session next touches that row.
* `test_a_hardware_register_with_the_wrong_schema_is_refused_not_read_as_empty`
  names its fixtures `register_{abs(hash(wrong))}.json`. Harmless (each
  iteration writes then asserts), but `hash()` on a `str` is seed-randomised, so
  the filenames differ run to run — a plain index reads better.

## For the next reviewer

* The `[real]` JS tier is at **406/407** on `integration` and the one red is
  owned by `viewer_unwitnessed_surface_guards`. If that handoff lands before you
  read this and the red is still there, it is a new one.
* `test_no_live_document_states_an_unguarded_hardware_entry_count` has now been
  red across at least three consecutive reviews on a false positive against a
  strategy brief, with two duplicate issues open. It is starting to function as
  background noise, which is exactly how a real red gets missed — worth a
  triage decision rather than another "pre-existing, ignored".
* Overlay updated: the *"Two readers of one input file"* architectural entry is
  marked closed-by-this-handoff (and its own stale 43/98 removed), and a new
  entry covers finding 1's shape — a structured sibling paired on presence, not
  content.

## Verdict

**APPROVE**, 0 blockers. Merging to `integration`.
