---
priority: med
depends_on: [a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits]   # both edit the shell's feature body (apps/viewer/views/nav.js featureRow, the pane's featureRow in apps/annotate/app.js) and its browser suite; the latency handoff adds a pending state to the same rows this one adds candidates to
model: sonnet
hitl: false
---

# HANDOFF 2026-11-19 — the_first_end_of_a_joint_offers_the_contact_faces_the_pane_already_holds: an unbound joint end's feature body lists the contact engine's candidates, not just "Pick a face"

Source: triage sweep 2026-11-19, routing
`docs/issues/ISSUE_20261119_a_joint_ends_feature_body_shows_none_of_the_contact_faces_the_pane_holds.md`
(med; found on the merged-page walk
`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`).
Baseline: trunk `a0c7cc58` plus the two handoffs ahead of it in `depends_on`'s
chain. Scope: the feature body in `apps/viewer/views/nav.js` and
`apps/viewer/topology_app.js`, the pane side in `apps/annotate/app.js`
(`featureRow` ~4171, the embed tree it publishes), their fast-tier tests, the
matching browser suite in `scripts/run_viewer_browser_tests.mjs`, and
`docs/ANNOTATION_SURFACE.md` / `CLAUDE.md`'s one sentence on it if the
behaviour changes. Do NOT touch `apps/annotate/suggestions.js`' ranking or the
contact engine (`scripts/` builders); the data is already right.

**Jeff's real log is read-only.** Work on a scratch copy of
`C:\workspace\tolstack\data\inbox\feature-identity\` (a `--data-root` scratch
root built from the worktree's own scripts, no `git init`). Count the real
folder's files before and after; both counts go in the lesson.

## What the walk saw

When neither end of a gap edge is bound, the end's feature body in the left
tree reads `not bound` and `Pick a face`, nothing else, and arming the pick
adds nothing. Measured on six ends (model v2, scratch root
`data/scratch/walk1118`, `integration` `a7a05123`):

- `blade_root@blade_root_pitch_arm_locating_boss` and
  `pitch_arm@pitch_arm_blade_root_bore` (edge `blade_root_boss_in_pitch_arm_bore`)
- `piston_head_lower_214699_002@piston_head_lower_pilot_bore` and
  `gas_spring_piston_214700_002@piston_body_head_locating_boss`
  (edge `piston_body_boss_in_lower_head_pilot`)
- `flanged_bushing_nas77a3_015a@pitch_link_flanged_bushing_od` and
  `pitch_plate_215735_001@pitch_plate_link_flanged_bushing_bore`
  (edge `pitch_link_flanged_bushing_press_fit`)

The data is there: the rebuilt `contact_suggestions.json` is `ok` with at least
one candidate for 20 of v2's 21 gap edges; for
`blade_root_boss_in_pitch_arm_bore` it is exactly the right pair (blade root
faces 1060, 1061, 6439, 6440, 6666, 6667; pitch arm 253, 254; axis offset
0.0001 mm, clearance 0.015 mm). The pane's published `__embedTree` row for
`piston_body_boss_in_lower_head_pilot` carries `twisty: "show the suggested
faces"`, so `AA.endCandidates` (`apps/annotate/sweep.js`) reaches the pane's
element list; the shell's feature body never shows it. Once one side is bound,
ranked mates DO reach the body ("coaxial with pitch arm", eight rows). So the
first end of every joint is a raw pick today. `CLAUDE.md` says since 2026-11-03
"every end with a proposal or contact faces opens to that list"; for the
shell's feature body that is not true.

## Deliverables

1. **The cause, in the lesson.** Leads, from the issue: the pane's
   `featureRow` builds a feature's rows from ONE edge end
   (`li.dataset.edge`); in the walk two of the binds were named for
   structural-dimension edges (`pitch_arm_bore_to_clamp_face`,
   `blade_root_bearing_to_pitch_arm_boss`), which carry no contact candidates —
   but the arm bore's was named for the gap edge itself and its body still
   showed nothing, so the edge choice is one lead, not the whole cause. Also
   check that `state.contactSuggestions` is loaded in embed mode.
2. **The fix.** An unbound end's feature body lists the contact candidates of
   every gap edge the feature is an end of, the same rows (same words, same
   Take, same hover-to-wash) as the ranked-mates list it already shows once
   the other side is bound; the decision is to reuse that row, not to design a
   new one. Sites this reaches: the feature body at rest, the armed pick's
   body, and the pane's own element list (which already shows them; keep it
   agreeing). A feature with neither proposals nor candidates keeps today's
   "Pick a face".
3. **Pin it.** A fast-tier check against a fixture with both ends unbound and
   a contact candidate, asserting the body lists it; a browser `[real]` check
   on `blade_root_boss_in_pitch_arm_bore` that picks its feature from the live
   data and announces honestly when that edge has no candidate (never a
   literal `true` skip). Witness specs in the same change, per `CLAUDE.md`.

## Definition of done

- On the served page (scratch log), `blade_root@blade_root_pitch_arm_locating_boss`
  with both ends unbound lists the six blade-root faces as one candidate row,
  and Take binds them; shot of the body before and after in
  `docs/sessions/lessons/shots/<slug>/`.
- `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `pytest -q` green; touched browser suites green on `--only`, whole tier once
  with its ledger row cited.
- The issue gets a verified `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_the_first_end_of_a_joint_offers_the_contact_faces_the_pane_already_holds.md`):
  the cause, which ends now offer what (count over v2's 21 gap edges), the
  real log's file count before and after.
