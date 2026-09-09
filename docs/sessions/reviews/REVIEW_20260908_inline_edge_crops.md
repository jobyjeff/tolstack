---
type: review
handoff: inline_edge_crops
reviewer: agent (review/inline_edge_crops)
date: 2026-09-08
verdict: APPROVE
blockers: 0
---

# Review — `inline_edge_crops`

Handoff: `docs/sessions/active/HANDOFF_20260908_inline_edge_crops.md`. Branch
`handoff/inline_edge_crops` (1 commit, `3945c23`), cut from `integration` after
`topology_schema_v1`. Reviewed on `review/inline_edge_crops`, merged
fast-forward (no conflict; `integration` had not moved).

**Scope note up front**: this is not a tolerance-stack-authoring handoff — it
adds no `StackElement`, no `SourceRef`, no dimension, and touches no
`docs/tolerance_stacks/*.json` or `docs/topologies/*.json`. It changes only
`scripts/build_topology_projection.py` (crop-key emission) and
`scripts/build_viewer_crops.py` (crop resolution), plus tests. The seven
mandatory stack checks (provenance, signs, LMC/MMC, RSS, nominal bounds,
cotter/castellation, traced ratio) are therefore **not applicable** — no new
citation, tolerance, or ratio is introduced or changed by this diff. What
follows instead is the topology/projection-specific checklist and a
provenance audit of the *existing* citations this handoff newly makes
croppable, since that is where an invented or misattributed crop could hide.

## What I verified

- **Read the handoff and the lesson** (`docs/sessions/lessons/LESSONS_20260908_inline_edge_crops.md`)
  before touching code, per the SOP-equivalent for this kind of work.
- **Diffed the handoff branch against `integration`** file by file
  (`build_topology_projection.py`, `build_viewer_crops.py`, both test files) —
  see findings below for the one thing that didn't sit right.
- **Merged fast-forward**, no conflict, `integration` unmoved underneath —
  the merge-conflict carve-out does not apply this time.
- **Full suite, this worktree, merged tree: 692 passed, 1 skipped** — matches
  the lesson's own count exactly (the skip is the pre-existing
  `REQUIREMENTS_PULL`-gated one, unrelated).
- **Real rebuild, independent of the lesson's own**, against an isolated
  scratch `--data-root` copied from the main checkout (never the shared
  `C:\workspace\tolstack\data\`, which this tree is 7 commits behind — same
  reasoning the lesson gives, and I hit the same provenance-gate refusal on
  the shared path before switching to scratch, confirming the gate is live):
  - `build_topology_projection.py`: pitch_system 24 edges, unchanged
    layout/fold numbers.
  - `build_viewer_crops.py` (drawing-checker's venv): **6 of 24** pitch_system
    inline citations resolved, **all 6 sha256-verified, 0 mismatched**, exact
    edge-id set matching the lesson's claim
    (`hub_blade_root_seat_position`, `end_stop_clearance`, `piston_length`,
    `pitch_plate_flange_to_link_hole`, `gas_spring_body_height`,
    `gas_spring_mount_position`); the 18 unresolved split exactly **9
    workbook / 9 assumed**, each with an honest reason, never an error.
  - **Byte-stability, proven directly, not inferred**: ran the *pre-handoff*
    `build_viewer_crops.py` (extracted via `git show` from the pre-merge
    commit) against the identical scratch tree, and diffed the resulting
    `crops.json` against the post-handoff run's. `by_stack`, `unresolved`
    and `summary` are **byte-identical** between the two; the post-handoff
    run adds only the three new top-level keys (`by_topology`,
    `unresolved_topology`, `summary_topology`). This directly confirms the
    lesson's "existing crops output for the 7 stacks byte-stable" claim
    rather than trusting the prose.
  - Note: my scratch run resolved 25/59 *stack* citations where the lesson
    recorded 21/59 for the same branch-behind-master comparison — not a
    regression: the pre- and post-handoff runs against my identical scratch
    data agree with each other exactly (see above), so the difference from
    the lesson's own number is just `data/inbox/specs/` having grown between
    when the lesson was written and when I copied it, hours later, on a
    day with several concurrent sessions. Recomputed, not copied.
- **Viewer-compatibility claim (deliverable 3), re-derived by reading the
  actual viewer source, not trusted from the lesson**: `VA.cropFor`
  (`apps/viewer/viewer.js:543`) reads `by_stack[stackId][elementId]` only;
  for a `{topology, edge}` key both arguments arrive `undefined`, and
  `({}[undefined])` falls into the `no-entry` branch with the "crops.json has
  no entry for this element — it is older than the stack" message — wrong for
  these 6 edges (crops.json is current; the key just isn't where the viewer
  looks). Confirmed the three call sites the lesson names read
  `.crop_key.stack`/`.element` unconditionally
  (`topology_app.js:269-270`, `views/topology.js:463-464`, `views/topology.js:746-764`),
  and that `topology.js:391`'s "which stacks does this topology cover" scan
  guards specifically on `.stack`, so it silently and correctly skips the new
  key shape. Matches the lesson's account exactly; no `apps/viewer/` edit
  was made, correctly (out of scope, owned by `viewer_v2_single_nav`).
- **Key-space collision argument, checked against the actual files**:
  `docs/topologies/topology_vpa_output_to_pitch_plate.json`'s `id` is indeed
  `vpa_output_to_pitch_plate`, identical to the stack file's own `id` — the
  collision risk the lesson gives for rejecting a `by_stack`-reuse design is
  real, not hypothetical.
- **`_croppable`'s two conditions checked against `resolve_pdf`'s actual rule
  1/2 code** (`kind == "spec"` → rule 2; `source_ref.export` → rule 1) — they
  agree today. See finding below for why nothing pins that agreement going
  forward.
- **No new `SourceRef`, dimension, or stack/topology JSON was touched** —
  confirmed by the diff stat (5 files: 2 scripts, 2 test files, 1 lesson).
  No provenance audit of new citations is needed because none were added;
  the 6 newly-croppable edges' citations were authored by an earlier
  handoff and already existed as `traced`/whatever confidence they carried
  before — this handoff only changed whether a crop *key* is minted for
  them, never the citation itself.
- **Schema/doc hygiene**: `ARCHITECTURE.md`'s one-line descriptions for both
  scripts (lines 34-35) are still accurate; no new file was added to
  `scripts/`, so no inventory-row gap. No live doc (`README.md`,
  `apps/viewer/README.md`, `docs/DAG_TOPOLOGY.md`) currently documents the
  `by_stack`/`unresolved`/`summary` shape in a way this handoff would make
  stale — `docs/DAG_TOPOLOGY.md` doesn't mention `crop_key` at all, so there
  is nothing to update there either. `data/inbox/specs/` untouched (diff
  stat confirms no `data/` changes at all — expected, this is a worktree).
  `CLAUDE.md` unaffected by this diff.
- **`build_index`'s new optional args are genuinely additive**: confirmed via
  the diff and via `test_the_topology_scan_does_not_touch_the_stack_summary`,
  and the existing 6-positional-arg call in
  `tests/test_projection_provenance.py` still passes (part of the green
  suite).

## Findings

### Should-fix

- **`_croppable()` (`scripts/build_topology_projection.py`) hand-restates
  `resolve_pdf`'s rule 1/2 conditions, with nothing pairing the two copies.**
  Both are correct today (verified above, two ways), but the module's own
  docstring notes `fitz` is imported lazily "so the resolution rules above
  stay unit-testable under this repo's own stdlib-only venv" — exactly the
  property that would let `build_topology_projection.py` import a shared
  predicate from `build_viewer_crops.py` instead of restating it by hand.
  Neither script currently imports the other. Not fixed inline: extracting a
  shared predicate across two scripts is a cross-module refactor, not a few
  lines, and isn't needed to trust today's behavior (both are independently
  verified against real data above). Filed as
  `ISSUE_20260908_croppable_rule_restated_across_two_scripts.md` (priority
  low — nothing is wrong today, this is a drift-risk for the *next* change to
  either rule).

### Nits

- None beyond the above.

## What I did on this branch

- Filed `docs/issues/ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`
  (should-fix, unfixed — see above).
- Appended one entry to this repo's review overlay
  (`docs/prompts/REVIEW_AGENT.md`, "Architectural errors to check") for the
  restated-rule-across-two-scripts shape, so the next review checks for it
  by pattern rather than rediscovering it.
- No inline code fixes were needed — the diff is clean.

## Verdict

**APPROVE.** No blockers. Merged into `integration` (fast-forward,
`3945c23`), full suite re-verified green post-merge, `origin/integration`
pushed. The one should-fix is filed as an issue rather than blocking, per this
handoff's low severity and the fact that both current implementations
independently verify as correct.
