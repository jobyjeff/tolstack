---
type: review
handoff: endstop_location_stack
reviewer: agent
date: 2026-09-06
verdict: APPROVE
blockers: 0
---

# Review — endstop_location_stack

Branch reviewed: `handoff/endstop_location_stack` (commits `b2399ad`,
`2504b70`), cut from and merged into `integration` (fast-forward, no
conflicts — `integration` had not moved since the review worktree was cut,
so there was no sibling-race to check). `master`'s only intervening commits
are dispatch board bookkeeping; no code/doc content on `master` diverges from
what this review tested.

Scope: extend `docs/topologies/topology_pitch_system.json` with the
end-stop chain, add two requirement-cited studies, add `Study.checks` /
`check_study()`, add `SourceRef.kind: "requirement"`. No `stack_*.json`,
`fold()`, spec-library event, or `apps/` touched, matching the handoff's own
fence.

## The seven mandatory checks

**1. Every tolerance traces to a specification/drawing/requirement callout —
PASS, verified independently, not taken on the author's word.**

- Re-hashed all six re-cited exports myself against the actual PDFs in
  `C:\workspace\drawing-checker\data\inbox\drawings\`
  (`212966-006-A.pdf`, `214700-002-A.pdf`, `215735-A.pdf`, `213668-002 A.1
  MOUNT, GAS SPRING, PROPELLER.pdf`) — every `sha256` in the topology JSON
  reproduces exactly.
- Extracted and read every one of the six citations directly off each PDF's
  text layer with drawing-checker's `debug_trace_stack_values.py`, not by
  trusting the worksheet's transcription:
  - `hub_blade_root_seat_position`: `212966-006-A` sh4 zone B11 —
    `106.310 0.000` / `-0.025`, `⌖⌀0.10ⓁA B C`, `5X INDIVIDUALLY`,
    `CRITICAL PART` all present verbatim, including the **Ⓛ (LMC)** glyph the
    F1 finding turns on.
  - `piston_length` / `end_stop_clearance`: `214700-002-A` sh1 general-tol
    block `X.XX = ±0.10` and sh2 zone D5 `5.00 ±0.05`, zone F6 `113.67` — all
    verbatim.
  - `pitch_plate_flange_to_link_hole`: `215735-A` sh2 zone B9 —
    `5X ⌀ 7.950 +0.015 0.000` and `⌖⌀0.2 A B C` verbatim.
  - `gas_spring_body_height`: `213668-002` sh1 zone B12 — `76.86 ±0.10`.
    This is the exact zone the overlay's third digit-per-span sighting
    warns about (each digit its own text span); confirmed the extraction
    still reads correctly once you know to expect that.
  - `gas_spring_mount_position`: `213668-002` sh2 zone G6 —
    `220.37 0.00` / `-0.08` and, separately, `0.2 A B` (the position frame) —
    matches the callout exactly; the citation's own `zone: null` is honest
    (not over-claimed) since it wasn't pinned to a specific zone label.
- Requirement citations checked byte-for-byte against the live pull
  (`C:\workspace\tolstack\data\inbox\requirements\S461_equipmentrequirements_20260906.json`,
  present in the main checkout): both studies' `limit`/`context_ref` quote
  S461-607/S461-241 exactly, including the source's "º" (masculine ordinal
  indicator, U+00BA, not the real degree sign) — the handoff's own lesson
  flags this as a latent downstream trap and copies it faithfully rather
  than "fixing" it.
- Confidence honesty: `hub_blade_root_seat_position`,
  `pitch_plate_flange_to_link_hole`, `gas_spring_body_height` →
  `traced`; `piston_length` → `inferred` (a documented derivation off the
  owner's own general-tolerance block, correctly not `traced`);
  `end_stop_clearance`, `gas_spring_mount_position` → correctly **stay**
  `untraced` even though a real citation now exists, because feature
  identity is not established (worksheet `candidate`) — exactly the
  distinction check 1 exists to enforce, and the one this repo is most
  often tempted to blur.
- No `kind: "parts_list"` claims `traced` here; no `workbook`-only citation
  claims better than `untraced`.

**2. Signs on every path term — PASS.**
`check_study` folds exactly two synthetic terms — `Term(limit_dim, sign=+1)`,
`Term(total_dim, sign=-1)` — through the one `fold()`, reproducing the L1
grip-check pattern (`grip − clamped_stack`) with the study's own
`StudyResult` standing in for the clamped stack. Recomputed both margins
independently from `summarize()` + `check_study()` directly (not by reading
the test's self-consistency): margin = `0.5 − total`, and both
`(min, max)` pairs match `(0.5 − total.max, 0.5 − total.min)` exactly. No
double-counting: `total_dim`'s band is copied from an already-folded
`Interval`, not re-derived from element values, so this is not a second
combiner (the topology-level `check_study` composes one fold's *output* as
input to a second fold, same as any stack check reading a `path` term).
`Term.coefficient` unused (defaults to 1, positive); direction lives only
in `sign`.

**3. LMC/MMC direction — PASS, and the one live case is handled by disclosure,
not by folding.** `hub_blade_root_seat_position` carries no `lmc`/`mmc`
fields at all (verified: only `id/name/nominal/min/max/plus_minus/source_ref`
keys) — the F1 finding (drawing says LMC, workbook comment said "diameter
MMC") is recorded in the citation's `note` and left unresolved, per design
decision 2's own governing rule (transcribed as found, `fold()` never reads
`lmc`/`mmc`). No bonus-tolerance arithmetic was invented to "close" F2.

**4. RSS actually computed — PASS.** `check_study`'s margin is a real
`Interval` from the shared `fold()`, so `rss_center`/`rss_half`/`rss_min`/
`rss_max` are populated automatically (verified via `.as_dict()`
directly — not merely present in a schema). `rss_half` happens to equal
`worst_case_half` for both new checks; that is expected and correct, not a
bug — the `limit` term has zero half-range by construction (a stated
constant), so quadrature over one zero-width term and one real one
collapses to the real one's own half-range. No verdict reads RSS (unchanged
code path).

**5. Nominal inside its own min/max — PASS** for all six retraced edges
(all `nominal: 0.0` inside their symmetric bands, per this topology's
variation-only convention, unchanged by this handoff).

**6. Quantised constraints (cotter/castellation) — N/A.** No slotted nut or
cotter pin in this handoff's scope.

**7. Traced/inferred/untraced ratio — computed independently, not copied.**

- Topology-internal (`topology_pitch_system.json`'s 23 dimensioned, non-derived
  edges): **3 traced / 1 inferred / 19 untraced**, recomputed with a direct
  `Counter` over `load_topology(...).edges` — matches the lesson's claim
  exactly.
- SOP headline ratio (`debug_report_tolerance_stacks.py --ratio`, run
  myself): **5 traced / 3 inferred / 18 untraced of 26** (seeded),
  **30/9/20 of 59** (all stacks) — unchanged, correctly so, since this
  handoff touched no `stack_*.json`.
- Non-element values: exactly one distinct numeric limit (S461-607's ±0.5°,
  used by both checks) and one non-numeric context citation (S461-241),
  both asserted `traced`/shape-checked by
  `test_an_end_stop_checks_requirement_citations_are_shaped_correctly` and
  value-paired against the live pull by
  `test_the_end_stop_checks_quote_the_pulled_requirements_artifact_verbatim`.
  The lesson doesn't phrase this as a formal "N of M" the way check 7 asks
  for non-element values generally — noted as a nit below, not a blocker,
  given how small and fully-tested this set is.
- Every `untraced` value in the six retraced edges is accounted for: either
  a `kind: "assumed"` `PLACEHOLDER` edge (test-enforced), or a `drawing`
  citation explicitly held at `untraced` with the identity gap named
  (`end_stop_clearance`, `gas_spring_mount_position`), or a `workbook`
  edge whose still-blocked acquisition is named in
  `ISSUE_20260906_endstop_piece_part_acquisition.md`.

## Additional items

- **Tests**: `venv-win/Scripts/python.exe -m pytest -q` → **614 passed, 1
  skipped** in this worktree (skip is the pre-existing node-fs viewer tier,
  unrelated). The new value-level pairing test against the live requirement
  pull (`test_the_end_stop_checks_quote_the_pulled_requirements_artifact_verbatim`)
  is included in that count and passes for real here, not skipped — this
  absolute-path test reads `C:\workspace\tolstack\data\...` regardless of
  which checkout runs pytest. The lesson's own quoted count (612 passed) is
  stale by exactly 2 — a follow-up commit (`2504b70`, after the lesson was
  written) added the two byte-identity tests below. Not flagged as a
  finding: it's the kind of drift this repo's own "recompute, don't quote"
  discipline exists for, and I recomputed it above rather than repeating it.
- **Byte-identity claim, backed by a real, non-vacuous test.** Both new
  study files' `notes` claim "byte-for-byte identical…to
  `study_pitch_system_blade_angle_worst/average.json`'s" selection/transforms.
  `test_provenance.py`'s byte-identity-claim scanner requires a pointer in
  the same prose block; the pointer here
  (`tests/test_topology.py::test_an_end_stop_study_s_selection_and_transforms_equal_its_source_study`)
  is inside a JSON `notes` array, not inside the test file itself, so it
  can't fall into the sighting-3 self-reference trap (a claim citing the very
  test whose comparison is in question). Read the test itself: it compares
  exactly `selection` and `transforms`, the two fields the claim is actually
  about. Genuinely non-vacuous.
- **`check_study` error handling.** Raises `StudyError` (the module's own
  base) for an unknown `check_id`, not a bare `KeyError` — consistent with
  the `dag_topology_format` review's fix for exactly this class of miss, and
  covered by `test_check_study_refuses_an_unknown_check_id`.
- **`excluded_terms` factual claims, spot-checked against source, not taken
  as prose:**
  - "-5 deg... 2 deg off the -7 deg this check is about" — arithmetic checks
    out (−7 − (−5) = −2).
  - "doubts the number by roughly 6x (row 22, 'Probably closer to .03deg')" —
    0.181° / 0.03° ≈ 6.0, matches `WORKSHEET_endstop_vision_baseline.md`
    §3 row 22's GT value.
  - "gas-spring bushing tipping backlash... 0.72 deg, its row 68" — this
    number is **not** the value shown in `WORKSHEET_endstop_vision_baseline.md`
    §3's own row-68 entry (0.431066, a different column). Chased to
    `WORKSHEET_end_stop_graft.md` line 208/407: row 68 has three columns
    (B/D/F); 0.431066 is B, and the D-column (worst-case sensitivity, the
    column this handoff's studies actually use) is **0.719881 ≈ 0.72**,
    matching the excluded-terms claim exactly. Correct, but only after
    cross-checking against the right worksheet and the right column — worth
    a beat of caution for the next reviewer who greps the nearer-looking
    table first.
- **Drawing-checker read-only invariant**: the lesson candidly reports it
  took no snapshot at its own start (best available baseline: the prior
  session's 2026-09-05 closing snapshot, 5767 entries) and an after-count of
  5767 at this session's own close. I took a fresh snapshot myself at the
  end of this review: **5767 entries**, matching exactly — holds through
  this handoff's work and through my own review reads (all read-only:
  `sha256sum`-equivalent hashing plus `debug_trace_stack_values.py` text
  extraction).
- **Topology viewer projection**: `data/projections/viewer/topologies.json`
  was stale (built 2026-09-01 from an unrelated review branch). Rebuilt it
  against the main checkout as routine diligence
  (`scripts/build_topology_projection.py --data-root C:/workspace/tolstack/data`);
  the two new studies project with worst-case/RSS totals identical to what
  I computed independently via `check_study`/`summarize()` (±1.091241 /
  ±0.816797 deg). Not a blocker either way: `build_topology_projection.py`
  never reads `Study.checks` at all, so the new requirement-cited margin is
  invisible to the viewer today — but nothing in this handoff's scope or
  DoD asked for viewer rendering (`apps/` is explicitly fenced off), and
  `Study.checks` is hand-authored spec data (the L1 grip-check pattern), not
  a generated-archetype output, so the "a generated check must be readable
  in the viewer" architectural rule doesn't apply to it. A future viewer
  handoff has a real gap to close; not this one's problem.
- **`docs/reference/`, `data/inbox/specs/`, `data/inbox/requirements/`**:
  untouched by this diff — confirmed by the diff itself, not just the
  lesson's say-so.
- **ARCHITECTURE.md**: no new file (only new functions/fields on the
  existing `topology.py`), so correctly needs no inventory row.
- **Vocabulary drift**: `SourceRef.kind`'s new `"requirement"` word is
  everywhere it needs to be — `SOURCE_REF_KINDS` (the one definition), the
  SOP's pipe-list (paired by the existing
  `test_the_sop_spells_the_same_vocabularies_the_code_enforces`), and no
  hand-copied kind tuple anywhere else needed the word (the two other
  hardcoded `("drawing", "parts_list")` tuples in the tree are a genuinely
  different subset — export-bearing kinds — and correctly exclude
  `requirement`).
- **Issue filed**: `ISSUE_20260906_endstop_piece_part_acquisition.md` has
  valid frontmatter (`type: chore`, `priority: med`, `status: open`,
  `reporter: agent`) and is not a duplicate of any existing open issue.

## Findings

**Two should-fix findings, both fixed inline (few lines, no behavior change,
no new test needed — clears the inline-fix boundary):**

1. `docs/DAG_TOPOLOGY.md`, `### L2 — topology_pitch_system.json + four
   studies` heading — stale by exactly the two studies this handoff added
   (six exist now, all listed in the bullets directly below the heading).
   Invisible to `test_the_doc_states_this_graphs_whole_shape_and_states_it_right`
   by design: that test's own docstring says a single-label sentence is
   treated as a subset claim and explicitly hands this class to the
   reviewer. **This is a second sighting of an already-documented overlay
   entry** ("A structural count restated in prose... the scanner's blind
   spot is a one-label sentence"), not a new failure class — no overlay
   edit needed, just recorded here as recurring. Fixed: heading now says
   "six studies".
2. Same file, the paragraph right below: "**Two thirds of the bands are
   cells of a workbook that traces nothing... the rest are `kind:
   "assumed"`**" — a binary split that stopped being true the moment six
   edges became `kind: "drawing"` in this handoff's own retrace (three
   `traced`, one `inferred`, two still `untraced`). Recomputed the real
   split myself (`Counter` over the loaded topology): **9 workbook / 6
   drawing / 8 assumed**, and rewrote the paragraph to state it, dated to
   this handoff. Same recurring class as #1.

**Nit**: the lesson's non-element-value accounting (S461-607/S461-241) is
present and fully tested but not phrased as the explicit "N of M" ratio
check 7 asks for — low stakes here since the set is exactly two citations,
both shape- and value-pair-tested, but worth keeping in mind for the stroke
stack, which the lesson says will reuse this same `Study.checks` pattern
and may accumulate more non-element citations.

## Verdict: APPROVE

Zero blockers. Provenance is unusually well-disciplined for this handoff:
every re-traced value was independently re-verifiable against a real PDF
(all six checked against the text layer myself, not sampled), both new
studies' numbers reproduce from a from-scratch recomputation (not merely
self-consistent with their own test), and the two `complete: false` checks
correctly render as `verdict_scope: "budget"` — never a hardware verdict —
despite one of them (`s461_607_margin_at_minus7`) failing its own margin at
worst case (`-0.591`), which the handoff reports plainly rather than
smoothing over. The two doc-staleness findings are both instances of an
already-known, already-checklisted class and were fixed inline within the
review boundary.

Merged `handoff/endstop_location_stack` into `integration` (fast-forward),
then committed this review's two inline doc fixes on `review/endstop_location_stack`
directly (not on the handoff branch, since they landed after the merge).
Full suite re-verified green post-merge: 614 passed, 1 skipped.

## Note for the next reviewer (the stroke stack)

Per this handoff's own lesson, the mechanical-stroke stack is staged next
against the same `topology_pitch_system.json` / `Study.checks` /
`SourceRef.kind: "requirement"` surfaces. Inherit its five stated decisions
(new study = new document, never an edit of an existing study's numbers;
`Study.checks` is now real reusable schema; `requirement` is general
vocabulary, not end-stop-scoped; the sensitivity-condition mismatch is
named, not resolved; the six now-`traced`/`inferred` edges must not be
reverted to make a future diff smaller — `_RETRACED_CONFIDENCES` in
`test_topology.py` will correctly refuse a silent regression there).
