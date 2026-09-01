---
priority: med
depends_on: [dag_topology_format]
---

# HANDOFF 2026-08-31 — dag_viewer_poc: the three-pane topology page (rails left, grid center, preview right)

Source: locked brief
`C:\workspace\dispatch\docs\strategy\HANDOFF_20260831_tolstack_dag_strategy.md`.
Baseline: trunk with `dag_topology_format` merged (its topology/study
documents and traversal are this page's data). Scope: viewer only; do NOT
change the topology schema (file a lesson note if it forces a change —
schema edits go back through a topology-owned session).

## The page (Jeff's design, from the brief)

Three panes: **vertical DAG on the left** (git-graph rail style — colored
vertical rails, dots at nodes, rails spanning between them), **the stack grid
in the center with each row horizontally aligned to its DAG element**,
**preview pane on the right** (clicking a node or row shows the thumbnail /
source for that element — same interaction the existing stack viewer already
has; reuse its thumbnail plumbing).

Style anchors (Jeff's own reference images — read them):
`C:\workspace\forge\data\inbox\atomic-notes\attachments\20260831T161914_99kjht\paste-20260831T161145.png`
(dense git-log rail graph: the alignment model — every text row has its dot
on a rail) and `...\paste-20260831T161225.png` (git-flow swim lanes: rail-
per-branch coloring). Absolute main-checkout paths; they do not exist in
worktrees.

## Deliverables

1. **Rail layout**: serialize the DAG to vertical rows (suggestion from the
   brief, verify against the pitch-system case before committing: depth-first
   serialization with rail continuity — a branch keeps its rail color/column
   until it rejoins or ends). Static-first: plain HTML/JS/SVG in the existing
   viewer's idiom — no npm build, no framework, unless the existing viewer
   already has one (match what's there).
2. **Row alignment**: one grid row per chain element (edges carry values;
   nodes are the row boundaries — decide the exact row mapping and document
   it), horizontally aligned with its dot/rail segment. Scrolling keeps them
   locked together.
3. **Study interaction v0**: select a study (from the study documents) →
   its path highlights on the rails, the grid filters/marks to the selection,
   totals (worst-case + RSS from the topology module — never recomputed in
   JS with a second formula) render at the bottom. Lasso-authoring of NEW
   studies is OUT of scope for the POC — selection of existing ones is
   enough to prove the design.
4. **Both MVP cases render**: the L1 fastener stack (linear chain — the
   degenerate single-rail case must look sane, not like a bug) and the L2
   pitch-system DAG (branches, the ring-gear cyclic-only branch visibly a
   branch).
5. **Preview pane**: clicking a row/node with a citation shows the existing
   thumbnail/crop for it; elements with placeholders show their untraced
   status plainly (per repo convention) rather than an empty pane.

## Definition of done

- Screenshot-able: pitch-system topology on screen with rails, aligned grid,
  a study highlighted, totals shown; fastener stack likewise.
- Browser-tier test(s) in this repo's existing browser-test idiom (at least:
  page loads both topologies, study selection updates the grid, totals match
  the topology module's output value-for-value).
- Full suite green.
- Lesson (`docs/sessions/lessons/LESSONS_20260831_dag_viewer_poc.md`): the
  serialization rule chosen and why, what the git-graph style couldn't
  express, what lasso-authoring will need, Jeff-facing questions.
