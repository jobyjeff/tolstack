---
type: review
handoff: docs/sessions/active/HANDOFF_20261105_a_part_with_many_interfaces_is_drawn_as_a_component_with_pins.md
reviewer: agent
date: 2026-11-06
verdict: REQUEST CHANGES
blockers: 1
---

# Review — a_part_with_many_interfaces_is_drawn_as_a_component_with_pins

Branch reviewed: `handoff/a_part_with_many_interfaces_is_drawn_as_a_component_with_pins`
(tip `bc4d1fd0`, 11 commits over merge-base `0b80bca5`). Containment check: not
already in `integration`. First review of this slug (no prior report on this
branch or in `docs/sessions/reviews/`). The lesson arrived as `A`, not `M`.

## Merge into the review branch — one conflict, resolved

`scripts/guard_enumeration.mjs`, the fast pin. `integration` had moved
642 → 644 (`a_tween_is_seen_and_zooms_out_before_it_zooms_in`, `b41106f9`);
the handoff moved 642 → 651 (+9). Kept the handoff's comment, re-measured the
merged tree: **653, names `53645de7f814`** (`test_the_enrollment_census_holds`
printed it; `tests/test_mutation_witnesses.py` then 44/44). Merge commit
`6b007cdc`. No conflict markers left.

## What I verified

- **Tests (risky subset, merged tree, review worktree, inputs bridged with
  `dispatch bridge-test-inputs`, projections rebuilt here by
  `scripts/rebuild_projections.ps1` from `6b007cdc`, clean):**
  - `pytest -q` over `test_js_python_vocabulary`, `test_viewer_readme_doc_facts`,
    `test_viewer_deep_link_contract`, `test_app_type_scale`,
    `test_projection_freshness`, `test_architecture_inventory`,
    `test_tolerance_stack`, `test_provenance`, `test_claims_registry`,
    `test_js_vocabulary_is_generated`: **321 passed**.
  - `tests/test_mutation_witnesses.py`: **44 passed**.
  - `node apps/viewer/run_tests.cjs`: **653/653**, `[real]` armed (against the
    main checkout's trunk-built projection it was 535/536 with the tier
    refused as stale — as designed).
  - `node apps/annotate/run_tests.cjs`: **291/291**.
  - Browser tier: see "Browser tier" below.
- **The tactical record.** Full suite recorded (1 failed / 1729 passed, the one
  failure an anchor rot fixed in `15dfc458` and not re-run in full; my 44/44
  covers it). Browser tier 41/43 with two reds attributed to existing issues;
  witness gate 43/46 witnessed, all 15 new specs witnessed. Benefit of the
  doubt given; no full pre-merge run.
- **Lesson arithmetic, re-derived** (one script over the rebuilt projection):
  whole walk 16/70/50 = 136 → 17/29/74 = 120 on 14 → 14 columns; 16 blocks,
  pin counts 2×7, 3×1, 4×3, 5×3, 11×2; 16 distinct parts. All match the lesson.
- **Screenshots read**: `pitch_plate_block.png`, `walk_blocks_dag.png`. That
  reading found the blocker below.
- Mandatory stack checks 1–7: not applicable — no stack, element, band or
  `source_ref` changed; display-only viewer work. Traced ratio unchanged
  (no element touched).

## Findings

### Blocker

1. **A block's body is its first row's body, not its part's — the pitch plate
   block is not wrapped by its own body.** `apps/viewer/topology.js`,
   `VA.blockLayout`: `body: rows[run.start].body`. A contact-face node's row
   body is its `parts[0]`'s body (`topology.js` ~3424), but `VA.partPins` gives
   that face to the part with *more* faces. So when a block's first pin is a
   contact face whose `parts[0]` is the other part, the block wears the other
   part's body. Measured on the live whole walk: **2 of 16 blocks mismatch** —
   `pitch_plate_215177_001` (body `pitch_plate`, block says `hydraulic_brake`)
   and `gas_spring_piston_214700_002` (body `pitch_plate`, block says
   `piston_head_lower_214699_002`). Visible in `walk_blocks_dag.png`: the
   hydraulic-brake body field is widened right over the pitch-plate block's
   top, and the "pitch plate and gas-spring piston" field stops at ~x 490 while
   its block sits at 590–935. That is deliverable 1's "Bodies remain groups
   around their blocks" failing on the very part Jeff named. The same wrong
   body feeds the block's flat state (`VA.bodyIsLit(…, block.body, …)`) and
   its fill tint (`VA.bodyTint(…, block.body)`).
   **Fix:** take the body from the block's part (`VA.bodyOfPart(topoProj)[run.part]`),
   and add a `[real]` fast check that every block's body equals its part's
   body and that the body field's x-extent contains the block (both on the
   walk and on a band). Not inline: it is designed behaviour and wants a test.

### Should-fix (for the rework)

2. **The legacy browser suites no longer see the default drawing.** The runner
   seeds `partDrawing: "rails"` on every page, so every lit-set / leader /
   landing / rest-state / 1600 px room check holds on a drawing Jeff does not
   see by default; the blocks suite re-asserts six contracts. The lesson says
   so honestly. The gap the blocks suite leaves is exactly finding 1's class
   (nothing asserts body ⊇ block) and the 1600 px room check the lesson itself
   names. Add at least those two to the blocks suite.
3. **The hover shot does not show a hover** (the lesson says so). CLAUDE.md's
   click-around rule wants the shot that shows the change; re-take
   `pitch_plate_block_hover_pin.png` hovering a lit pin and its stub.
4. **Leader × chord crossings are new and unfiled** (11 on the walk, per the
   lesson's own table): a rail-side pin's leader runs flat through its own
   block across its chords. File it (design, low) or route the leader out the
   block's top/bottom margin.

### Nits

- `rail__dot--pin` is added to the DOM with no CSS rule; it is a test hook
  only, which is fine — say so in a comment.
- `pinHit` in the blocks suite tests only the first visible pin.

## Browser tier

(Filled in below once the run finishes.)

## Note for the rework

Re-merge `integration` before handing back: the fast pin will conflict again
if anything else lands; re-measure from the merged tree, never take a side.
