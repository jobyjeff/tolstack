---
priority: high
depends_on: [the_blade_and_piston_joints_are_authored_as_what_the_parts_show]
model: opus
hitl: false
---

# HANDOFF 2026-11-17 — the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page: one page for Jeff — his 11-17 sentences and the 11-16 review's open rows against what the merged page does now, with a shot each

Source: the chain rule (Jeff, 2026-11-12: steps chain to a review point, and
the review is a page) and `dispatch/docs/strategy/HANDOFF_20261117_strategy.md`.
Baseline: `integration` (or `master`, whichever carries all four):
`the_map_is_portrait_as_jeff_drew_it`, `a_joint_says_what_kind_it_is`,
`the_base_stack_joints_are_seat_boss_and_pattern`,
`the_blade_and_piston_joints_are_authored_as_what_the_parts_show`. Fifth of a
chain of six; `the_map_is_the_only_drawing_and_classic_retires` follows and
adds a section to the page you write.

Scope: `docs/sessions/lessons/` (the review page, the lesson, shots) and
`docs/issues/`. No code, with one exception: a defect that is one line and
plainly wrong may be fixed in its own commit, named at the top of the review
page. Anything larger is an issue.

**Serve the merged tree, not `master`.** 8000 serves the main checkout on
`master`, which may be behind `integration`. Do what the 11-16 walk did: serve
the merged tree on drawing-checker's mount shape with
`tests/debug_walk_merged_page_20261114.mjs`, data rebuilt from that tree into
a scratch data root, and say at the top of the page which sha you walked and
how far `master` is behind it.

**Bind nothing in Jeff's real log**
(`C:\workspace\tolstack\data\inbox\feature-identity\`). Every bind, unbind,
take and add goes to the scratch root's copy. Record the real log's file count
before and after.

## Deliverables

1. **`docs/sessions/lessons/REVIEW_20261117_the_portrait_map_and_the_joints.md`**,
   in the form of `REVIEW_20261115_the_map_and_the_binding_flow.md`: one row
   per sentence — Jeff's words, what the page does now, a shot, does / partly /
   does not. Open with three short paragraphs: what he can do now that he
   could not on 11-17, what is still wrong, and what only he can decide.
   Tables, not paragraphs, for everything else. Rows:
   - **Jeff, 2026-11-17** (his message, tolstack part, in full below).
   - **Every joint in v2**, one row each: the two parts, the constraints the
     model has (seat / boss / pattern / rotary / ball / slide / clearance),
     the symbol or bundle the map draws, and how many of its feature ends are
     bound in Jeff's real log. Then the questions the joints handoffs filed
     for him (`needs: jeff` issues from the two joint handoffs), copied here
     with their shots so he answers them on this page.
   - **The solver against the model**: the solver's four joints and the
     model's word for each, from `a_joint_says_what_kind_it_is`'s lesson,
     re-read on the merged tree.
   - **The 11-16 review's rows marked partly or does not**, re-read: J3, J4,
     J9; 2, 3, 4, 5, 13, 15, 20, 21, 26, 34, 40, 41, 47, 48; M4; R1, R5, R6.
   - **The six regions**, Map selected: size, fitted zoom, smallest label,
     reads or not, beside the 11-16 numbers.
2. **The shots**, at 3840 × 2160 and 5120 × 2160 (and 1920 × 1080 for the
   region rows), in `docs/sessions/lessons/shots/<slug>/`, each read with
   vision against the claim it sits beside before the row is written.
3. **Issues** for what the walk finds, with frontmatter; small findings may
   share one issue.

Jeff's message of 2026-11-17, tolstack part, in full:

> tolstack is coming along nicely, I really like the new subway map style
> dag/graph, let's go ahead and make it permanent. One bit of feedback on the
> newe model, flip the map/dag to be portrait instead of landscape so it fits
> in the side-by-side view mode more nicely. What are next steps, ready to
> start building out the model in more detail? All the correct assembly
> structures, propagating the three parallel joint types (flange, boss, and
> hole pattern) to the gas spring mount etc? Noticed the joint between the hub
> body and the blade is a flange joint, a bit surprised because that one would
> need to be a rotary joint (isn't the 2d and 3d now unified?).

"Make it permanent" is the next handoff's and "the correct assembly
structures" is answered by a separate page
(`REVIEW_20261117_the_models_parts_against_the_product_structure.md`, if it
exists when you write — link it, do not repeat it); give each a row that says
so.

## Definition of done

- The review page exists, every row has a shot that was read with vision, and
  the page says which tree it walked.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page.md`):
  how the merged tree was served, the counts (does / partly / does not), the
  issues filed, the feature-identity file count before and after.
