---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-17 — the_filmstrip_boots_on_the_map_and_the_rails_residue_goes: `scripts/filmstrip.mjs` films the map again, and what the rails left behind is removed or decided

Source: `docs/issues/ISSUE_20261118_the_rails_left_residue_in_live_code_and_filmstrips_built_ins_wait_for_them.md`
(med, found in review of `the_map_is_the_only_drawing_and_classic_retires`),
folding in `docs/issues/ISSUE_20261117_tolerance_stack_topology_comments_name_the_retired_joint_glyph_file.md`
(low, comment-only, same cause). Staged by the 2026-11-17 triage sweep.
Baseline: master `2e239d04` or later. Scope: `scripts/filmstrip.mjs`,
`apps/viewer/topology.css`, the dead helpers and stale comments the issue
lists in `apps/viewer/topology.js`, `apps/viewer/views/topology.js`,
`apps/viewer/views/kinematic.js`, `apps/viewer/map.js`, the two comment lines
in `tolerance_stack/topology.py` (`:229`, `:254`), and `tests/debug_*.mjs`.
Do NOT change what the page draws or how the Preview renders a node's note —
the sibling handoff `a_joints_preview_says_what_the_joint_is` owns the Preview
and depends on this one, because both touch `apps/viewer/views/topology.js`.

## Why

`CLAUDE.md` (line ~271) tells every viewer handoff to film a transition with
`node scripts/filmstrip.mjs`. Its `bootKinematic` waits for
`#topopane svg.tv__rails` (`scripts/filmstrip.mjs:131`), which nothing draws
since 2026-11-17, so all five built-in scenarios throw after 15 s; `bandProbe`
(`:148`) reads `line.rail__bar--on` and `.tv__zoomsizer`, and `click` (`:211`)
targets a rails dot. Until this lands, the instruction every viewer handoff
follows fails on its first step. The rest is dead code and comments that
describe the rails as live, which mislead the next reader.

## Deliverables

1. **The filmstrip boots on the map.** `bootKinematic` waits for
   `#topopane svg.tv__map`. Delete the `respine` and `respine-back` scenarios
   (respine is retired). Re-point `pane-open`, `row-click` and `click` and
   their probe at the map (e.g. its `data-zoom` and view transform). Run each
   surviving scenario once and keep one composite per scenario in the lesson's
   `shots/` as evidence it films.
2. **Dead code and stale comments go** — the full list is the issue's §2:
   the two `.tv__rails` rules in `topology.css` and the comment at ~line 35;
   the helpers with no caller (`VA.blockColumns`, `VA.kinematicPoseLengths`,
   and the four that were already uncalled — re-verify each has no caller,
   including in `apps/viewer/tests.js`, before deleting, and delete the unit
   tests that only exercised them); the comments that describe rails,
   leaders, respine or `interface_glyphs.js` as live; and the two
   `tolerance_stack/topology.py` comments (the low issue's table says what
   each should read).
3. **The `tests/debug_*.mjs` probes are decided once.** 28 of them wait on
   `svg.tv__rails` or seed `tolstack.viewer.dagDrawing` and no tier runs them.
   Delete the ones nothing cites (grep `docs/` and the lessons for each file
   name), leave the cited ones as history, and say in the lesson which rule
   you applied. Use `git rm` for tracked files; this is not dirt clean-up.
4. `git grep -n "tv__rails\|dagDrawing\|leaderGeometry\|respineX\|rowPositions" -- apps scripts tests`
   afterwards: account for every remaining hit in the lesson (a guard that
   asserts the absence, a witness entry, a cited debug probe).

## Definition of done

- Default pytest tier and both node fast tiers green per `CLAUDE.md`; the
  browser tier for any suite whose file you touched. `scripts/guard_enumeration.mjs`
  and the mutation-witness registry still agree (a witness entry that names a
  deleted check must be retired, not left decayed).
- Both issues get `status: resolved` with a one-line `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_filmstrip_boots_on_the_map_and_the_rails_residue_goes.md`):
  the scenarios kept and what each now probes, the debug-probe rule and the
  count deleted/kept, and the remaining grep hits.
