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

## 2026-09-16 triage sweep — item 1's two stated grounds no longer hold

Source issue:
`docs/issues/ISSUE_20260915_the_3d_reach_brief_still_argues_from_covered_stack_nesting_and_a_loose_majority.md`
(chore, med, `audience: strategy`), filed off
`docs/sessions/HANDOFF_20260915_viewer_nav_wedge_and_classic_retirement.md`.
Item 1 above states its grounds as *"whether the annotator grows a stack-mode
nav axis or classic stacks reach 3D only via topology re-expression
**(covered-stack nesting)**"*, and *"**most real stacks are loose today**"*.
Both changed on 2026-09-15. Nothing here decides item 1 — it corrects what item
1 is a decision about, and both options stay on the table.

**"Covered-stack nesting" no longer exists.** The nested per-topology stack row
— the mechanism item 1 names as the whole content of option 2 — was removed by
`viewer_nav_wedge_and_classic_retirement`. Verified in code 2026-09-16:
`VA.navTree` (`apps/viewer/topology.js`) builds one tree of topologies plus the
stacks no topology re-expresses, and its comment states the new rule outright
("a topology carries no stack child rows"); the render test at
`apps/viewer/tests.js:6544` asserts `coveredStacks` comes back `undefined` and
that the nav offers no row at all for a re-expressed stack. A covered stack is
still in the projection and still renders — it is reachable only through a
`?stack=<id>` deep link that resolves against the projection rather than the nav
(`apps/viewer/topology_app.js:1232`).

**Loose stacks are not "most"; they are 2 of 7.** Measured 2026-09-16 over
`docs/tolerance_stacks/stack_*.json` and `docs/topologies/topology_*.json` on
the merged tree:

| stack | state on the rail |
|---|---|
| `pitch_link_to_pitch_plate` | re-expressed as a topology |
| `rotor_fastener_length` | re-expressed as a topology |
| `tan_link_to_pitch_plate_take2` | re-expressed as a topology |
| `vpa_output_to_pitch_plate` | re-expressed as a topology |
| `tan_link_to_pitch_plate` (take 1) | superseded, dropped from the nav by `VA.SUPERSEDED_STACKS` (`apps/viewer/topology.js:2240`) |
| `hub_bearing_thermal_fit_m1` | loose |
| `hub_bearing_thermal_fit_m2` | loose |

(The fifth topology, `pitch_system`, re-expresses no stack at all.)

**What that does to item 1's sizing.** The argument the brief hands the decider
inverts: option 2 ("classic stacks reach 3D only via topology re-expression")
now covers 5 of the 7 committed stacks rather than a minority, and option 1 (a
stack-mode nav axis in the annotator) buys 3D for the two thermal fits and
nothing else — and those two are the thermal-fit archetype, which has no
topology *by design* rather than for want of authoring. Option 2 also needs
re-reading with the nesting gone: whatever "reach 3D via re-expression" means
now, it cannot mean the nested row, because there is no nested row to launch
from. The source issue asks only that the call be made on the current corpus.
