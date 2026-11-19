---
priority: high
depends_on: [a_disagreement_is_settled_by_keep_or_let_go]
model: opus
hitl: false
---

# HANDOFF 2026-11-18 — a_bound_pattern_offers_the_whole_pattern_on_the_other_part: once one side of a hole pattern is bound, the other side is offered whole

Source: Jeff's note `20261117T224550_onme22` (2026-11-17): "Hole patterns: once
a hole pattern on one side of an interface is found, it should be trivial to
suggest the entire pattern on the other side (all the concentric cylinders on
the opposite part)"; strategy session 2026-11-18
(`dispatch/docs/strategy/HANDOFF_20261117_strategy.md`). Baseline: master
after `a_disagreement_is_settled_by_keep_or_let_go`. Scope:
`apps/annotate/suggestions.js`, the suggestion rows and Take path in
`apps/annotate/app.js`, `scripts/propose_bindings.py` if you extend it, and
their tests. Do NOT touch the fold (`apps/viewer/identity_fold.js`), the map,
the joint Preview's words (staged: `a_joints_preview_says_what_the_joint_is`)
or the `[real]` suggestion checks' wait logic (staged:
`the_suggestion_and_take_real_checks_wait_on_a_settled_tree`).

**Jeff's real binding log is read-only here:**
`C:\workspace\tolstack\data\inbox\feature-identity\`. Count its files before
and after; anything you bind goes to a scratch data root holding a copy.

## What exists, read on master 2026-11-18

- Picking one hole offers the candidate part's own like holes: "N like holes on
  one plane · Take all N holes" (same radius within 1e-3, whole holes, on one
  circle), from `a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added`
  (2026-11-15).
- `AA.rankMatingFaces` (`apps/annotate/suggestions.js:709`) lists, one face per
  row, the faces coaxial with or against the bound side; Take on a row that is
  a pattern hole shows the same like-holes offer (`apps/annotate/app.js:4963`).
- Nothing builds the opposite pattern from the bound side's hole axes. The
  like-holes rule fails exactly where the two sides differ: other diameters,
  counterbores, or holes that are bushings on other solids of the mesh. Jeff
  bound both sides of a pattern by hand on 2026-11-17 (events 0086, 0088, 0092).
- `scripts/propose_bindings.py` proposes no pattern.

## Deliverables

1. **One suggestion, the whole opposite pattern.** When one side of a
   `fastener_pattern` joint is bound (or the feature on one part of a shared
   pattern node), the other side's suggestions lead with one row: the set of
   cylinders on the opposite part that are coaxial, in the assembled pose, with
   the bound holes' axes — one per bound hole, whatever their diameters. Take
   binds the set as one event.
2. **It says what it found.** The row names the count on each side and the
   fit in the words the pattern offer already uses ("10 of 10 holes, coaxial
   within 0.02"). Where the opposite part has more than one coaxial cylinder
   per axis (a counterbore over a through hole, a bushing in a bore), the row
   says which it took and the others stay reachable as their own rows; state
   the rule you chose in the lesson. Where fewer holes answer than were bound,
   it says "7 of 10" and offers those; it never fills a missing hole.
3. **Across solids.** A coaxial cylinder on another solid of the same mesh is a
   candidate like any other and its row names the solid, so a bushed bore is
   offered rather than skipped.
4. **Hover lights the set** in the 3D pane before Take, as a single-face row
   already does.
5. **Every site the offer reaches:** the feature body's suggestion list, the
   pane's head offer, and `propose_bindings.py`'s proposals. Either all three
   carry it or the lesson says which does not and why.

Suggestion, not binding: derive the axes from the bound side's standing
geometry keys and reuse the coaxiality test `rankMatingFaces` already has,
rather than a second geometric rule.

## Definition of done

- Tests, value-level, on the committed v2 fixtures: a bound base-stack pattern
  yields one opposite-pattern row with the right count; a counterbored side
  yields the documented choice; a seven-of-ten case reads "7 of 10"; Take
  writes one event.
- On a copy of Jeff's log, with one side of `gas_spring_piston_fastener_clocking`
  (pitch plate ↔ piston body) unbound in the copy, the opposite side is offered
  whole and Take binds it. Report the faces it took.
- Default and browser tiers green per `CLAUDE.md`.
- **Look at the merged page with vision**: shots of the row at rest, hovered
  (set lit in the pane) and after Take, each read before the lesson is written.
- The real log's file count is unchanged.
- Lesson (`docs/sessions/lessons/LESSONS_20261118_a_bound_pattern_offers_the_whole_pattern_on_the_other_part.md`):
  the rule for several coaxial cylinders on one axis, each v2 pattern joint
  with the count it offers today, the shots, and the file counts.
