# BRIEF 2026-09-11 — 3D/annotator reach and hover-card content: four design gaps left open by the study_3d_flyout / hover-cards track

Filed by triage 2026-09-11, consolidating four open `audience: strategy`
issues from the same feature track (the study-3D flyout and the hover-card
work, 2026-09-10). They share data-model decisions — what the schema
authors, what the projections carry — so one strategy pass should order
them; each issue holds the measured detail.

## The four issues

1. `docs/issues/ISSUE_20260910_classic_stacks_have_no_3d_launch.md`
   (feature, low) — the per-study 3D launch works for topology studies only;
   classic (loose) stacks have nothing to land on because the annotator
   navigates topology → study → edge. The schema half already exists
   (`stack_element` keys, `AA.stackElementKey`); the call is whether the
   annotator grows a stack-mode nav axis or classic stacks reach 3D only via
   topology re-expression (covered-stack nesting). Most real stacks are
   loose today, so this decides how much of the corpus the 3D surface can
   ever reach.
2. `docs/issues/ISSUE_20260910_component_mesh_thumbnails_need_a_snapshot_verb.md`
   (feature, low) — a mesh-rendered card thumbnail needs an annotator
   `snapshot` verb (command layer; `study_3d_flyout`'s lesson records the
   pieces), a generator obeying the everything-CLI rule + projection
   provenance gate, headless-Chrome-driven since the venv is stdlib-only.
   Payoff today is one part with an installed mesh — sequencing/priority is
   the real call.
3. `docs/issues/ISSUE_20260910_second_side_crops_not_in_the_index.md`
   (feature, med) — the edge card already renders a crops LIST, but
   `crops.json` holds one crop per citation and nothing authors the mating
   side's citation. Decide where the second side is authored (second slot on
   an edge/stack element, or crops of the two NODE citations an edge spans),
   then `build_viewer_crops.py` grows the entries.
4. `docs/issues/ISSUE_20260910_leader_grid_part_runs_repeat.md`
   (feature, low) — a part revisited by the walk renders one merged row per
   RUN (18 groups over 12 parts; hub ×2, pitch_plate_215177_001 ×3,
   gas_spring ×2, blade_root ×2) and nothing beyond the repeated label ties
   the runs together. Constraint: saturated colours are
   provenance-reserved (topology.css header), so no lane palette. Candidate
   directions in the issue (shared hover highlight, tint pair, "N of M"
   hover wording); may fold into the hover-card surface.

## What strategy should produce

An ordering decision (which of these are worth building now vs recorded as
accepted gaps), the schema/authoring decision for item 3 (it gates any
"both sides" work), and tactical handoffs for whatever is greenlit — items
3 and 2 both touch `build_viewer_crops.py`, so sequence or merge them if
both proceed.
