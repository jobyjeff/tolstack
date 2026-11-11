---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-10 — the_end_stop_models_notes_say_where_the_value_comes_from: rewrite the 22 "M2 adds the term" notes, and rebuild the projection

Source: `docs/issues/ISSUE_20261109_the_end_stop_models_notes_say_m2_adds_the_term_on_the_demo_path.md`
(bug, med). Baseline: tolstack master at `0b50d833` or later, which includes the
gas-spring mount seat. Scope: `docs/topologies/topology_vpa_end_stop_v2.json`
(note strings only) and any test that pins one of those strings. Do NOT change any
node, edge, value, contact or part in that document. Do NOT touch `apps/viewer/`
code, which the strategy thread's F1b/F1c work owns.

## The defect

Selecting the tan-link length row on `vpa_end_stop_v2` (the demo's fifth click) shows
this note in the Preview:

> No value recorded; M2 adds the term. What would close it: 212956-005 and
> 213863-004's drawings.

"M2" is an internal milestone, and "adds the term" is the archetype's own vocabulary.
22 notes carry the phrase (`git grep -c "M2 adds the term" -- docs/topologies/`), and
one also opens with history ("New in v2 (2026-11-08): ...").

## Deliverables

1. **One shape for all 22:** `Value to come from <drawing>'s drawing.` For example,
   `Value to come from 212956-005 and 213863-004's drawings.` Drop the
   "New in v2 (<date>)" lead. Keep each note's drawing numbers exactly as they are.
   If a note names no drawing, write `Value to come.` and list it in the lesson.
2. **Rebuild the projection as part of this session's DoD.** These notes are a
   projection input, and the `[real]` tiers refuse a projection built from a
   different tree. Run `powershell -NoProfile -File scripts\rebuild_projections.ps1`
   from your worktree, writing into your worktree's own `data/` as the script's
   `-RepoRoot` default does. Do NOT rebuild the main checkout's projection, which
   port 8000 serves for every other session. The next batch merge rebuilds trunk's.

## Definition of done

- `git grep -c "M2 adds the term" -- docs/topologies/` returns nothing.
- The rebuilt projection's provenance stamp names your branch, and the Preview for
  the tan-link length row reads the new note. Show it in the viewer's unit tier or
  in a screenshot from a worktree-served page.
- The default tier and `node apps/viewer/run_tests.cjs` both pass.
- Lesson (`docs/sessions/lessons/LESSONS_20261110_the_end_stop_models_notes_say_where_the_value_comes_from.md`).
