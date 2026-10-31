---
priority: med
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-10-30 — an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed: two follow-ups to a_face_is_picked_the_way_cad_picks_it

Source: dispatch triage sweep 2026-10-30, from two issues found by
`HANDOFF_20261029_a_face_is_picked_the_way_cad_picks_it` and its review:
- `docs/issues/ISSUE_20261029_an_armed_pick_assumes_the_face_is_on_the_nodes_first_named_part.md`
  (filed `audience: strategy` with three options; triage made the call, below)
- `docs/issues/ISSUE_20261029_design_an_armed_picks_failed_bind_prints_the_storage_errors_own_text.md`
Baseline: tolstack master `7ad0653e` (2026-10-30 batch merge). Scope:
`apps/annotate/sweep.js`, `apps/annotate/app.js`, the annotate storage adapter
only to classify its failures, `apps/annotate/` tests and browser checks. Do NOT
touch `docs/topologies/*.json` (no new topology field in this handoff — see the
decision), `apps/viewer/`, or the viewer fixtures (owned by the staged
`HANDOFF_20261030_display_name_reaches_the_viewer_fixtures_and_fixture_drift_is_caught_without_a_projection.md`).

## Deliverables

1. **An armed pick can reach the face on either of the end's parts —
   decided: let the armed row switch parts (the issue's option 2).**
   `AA.pickEndPartIds` arms a joint end's pick on the end node's **first**
   listed part with an installed mesh, and the selection filter makes every
   other part unpickable. Re-derived at review against
   `docs/topologies/topology_vpa_pitch_linkage.json`: 34 two-part nodes, only
   20 named "X against Y"; 14 never say which part carries the face (e.g.
   "gas-spring bushing in the pitch plate" `[pitch_plate_215177_001,
   gas_spring]`, "hydraulic brake attached to the pitch plate", "actuator body
   mounted to the hub" `[hub, vpa_208510_007]`). For an end whose face is on
   the second part, the right face cannot be hovered or clicked and nothing
   lets the reader switch.
   Build: when the end node has two parts with installed meshes, the armed
   row shows which part is armed and a one-click switch to the other; the
   selection filter follows the switch. Keep `parts[0]` as the default armed
   part.
   **Rejected, and why:** option 1 (a declared per-node `face_part` with a
   pairing test) is the cleaner end state but needs someone to establish the
   truth for the 14 ambiguous nodes, which is a CAD reading this session
   cannot do; option 2 works without that truth and does not foreclose
   option 1 later. Option 3 (keep the heuristic, add a test) needs the same
   truth. If review prefers option 1, say so in the review — it is a
   follow-up, not a blocker.
2. **A failed bind says why in plain words.** `armedClick`
   (`apps/annotate/app.js`) shows `"Bind failed: " + err.message`, straight
   from the storage adapter — e.g. "feature-identity event <filename> already
   exists -- append-only, refusing to overwrite", or a browser `AbortError`
   when the folder grant is declined. Map the adapter's failure classes to
   fixed reader-facing words: no grant / grant declined, read-only transport,
   name collision, and an "anything else" fallback. Keep the raw text in the
   console and behind the row's hover. Sites the fact reaches: the armed row's
   state line, and any other annotate surface that prints a storage error the
   same way (grep for `err.message` under `apps/annotate/`; name in the lesson
   any you leave).

## Definition of done

- A browser check on the served annotator: arm the end of "hub blade-1 root
  bearing bore" (`[hub, blade_root]`), switch to the second part, and confirm a
  face on it can be hovered and picked while the first part is unpickable.
- A unit or browser check per failure class asserting the exact reader-facing
  text, and that no internal filename appears in it.
- Default tier green per `CLAUDE.md`; the merge-only browser and
  mutation-witness tiers only for the specs this handoff adds or changes
  (`node scripts/run_mutation_witness_tests.mjs --changed-since master`).
- Lesson (`docs/sessions/lessons/LESSONS_20261030_an_armed_pick_can_reach_either_part_and_says_why_a_bind_failed.md`):
  which of the 14 ambiguous nodes you found armed on the wrong part while
  testing, if any — that is the start of option 1's truth table.
