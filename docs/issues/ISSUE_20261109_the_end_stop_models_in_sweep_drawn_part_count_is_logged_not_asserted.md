---
type: bug
priority: med
status: triaged
area: tests/browser-tier
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261108_the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader.md
handoff: docs/sessions/HANDOFF_20261109_a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list.md
---

# The end-stop model's drawn-part count in sweep mode is logged, not asserted

Handoff `the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader`
has the model drawn alone "in and out of sweep mode". Its browser suite, "the
model drawn alone and led", in `scripts/run_viewer_browser_tests.mjs`
(`testModelDrawnAloneAndLed`), asserts the count **at rest**:
`rest.length === model.parts.length`. With P2 loaded it also computes
`sweepDrawn = await drawnSettled()`, but only puts that count in the log line
(`…; 15 meshes drawn`). No `push` reads it.

The one witness for the drawn-alone wiring
(`browser__real-the-end-stop-model-at-rest-draws-as-many-parts-as-i__2d0a465e.json`)
cuts `aloneShas()` to `null`. That breaks rest and sweep together, so the rest
check catches it. These sweep-only sites are covered by nothing, judging by
reading the checks:

- `hideOutsideModel()` in `cmdSweep` and at the end of `anchorSweepBodies`
  (`apps/annotate/app.js`);
- the `if (alone && alone.indexOf(row.sha256) === -1) continue;` skip that
  keeps a carried bolt from being opened;
- the `outside` term in `applySweepFrame`;
- the `if (state.sweep && alone) return alone;` arm of `contextBaseShas`.

Some of these back each other up, so deleting one may change nothing. Deleting
all of them would put back exactly the scene Jeff reported on 2026-11-08: "20
of 20 parts placed", with the context still drawn. No assertion would see
that.

Suggested fix: add `push("[real] … with P2 loaded the end-stop model still
draws as many parts as it has, and no context", sweepDrawn.length ===
model.parts.length)`. Enroll it with a spec that mutates one of the sweep-only
sites, for example the `anchorSweepBodies` skip together with its trailing
`hideOutsideModel()`.
