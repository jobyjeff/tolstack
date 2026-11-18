---
priority: med
depends_on: [the_filmstrip_boots_on_the_map_and_the_rails_residue_goes]
model: sonnet
hitl: false
---

# HANDOFF 2026-11-17 — a_joints_preview_says_what_the_joint_is: no handoff names, rename history or raw kind words on the Preview

Source: `docs/issues/ISSUE_20261117_design_a_joints_preview_prints_a_handoff_name_and_a_raw_kind_word.md`
(med; split out of the portrait-map walk's small findings because it breaks
two named rules). Staged by the 2026-11-17 triage sweep.

- **Baseline:** master after `the_filmstrip_boots_on_the_map_and_the_rails_residue_goes`
  lands. Both handoffs touch `apps/viewer/views/topology.js`, hence the
  `depends_on`.
- **Scope:**
  - the Preview's node detail in `apps/viewer/views/topology.js` (the
    `detail__note` sites at ~lines 2471, 2707 and 2794, and the kind chip);
  - the `note` text in `docs/topologies/topology_vpa_end_stop_v2.json` and
    `docs/topologies/topology_vpa_pitch_linkage.json`;
  - `scripts/build_topology_projection.py`, only if notes are copied there;
  - their tests.
- **Fold-in:** this also answers the older, deferred
  `docs/issues/ISSUE_20261110_topology_notes_still_say_what_would_close_it_and_open_with_history.md`
  (low, "New in v2 (<date>)" openings). Same surface, now worse.

## Why

Seen on integration `b9475a88` (shot
`docs/sessions/lessons/shots/the_walk_reads_the_portrait_map_and_the_joints_on_the_merged_page/k6_rotary_joint_selected_3840.png`).
Click the hub ↔ blade rotary joint on the map, and the Preview shows:

- a monospace chip reading `mating_surface`, which is the stored spelling of
  the kind;
- an always-visible note reading "Was named … until 2026-11-10 … Since
  2026-11-17 (handoff a_joint_says_what_kind_it_is) it states
  `interface: revolute`";
- v2's newer joints opening "New in v2 (2026-11-17, handoff …)".

Those break the canonical tactical prompt's prose budget (no history on a
reading surface) and its prohibition on internal names in user-facing copy
(`dispatch/dispatch/prompts/TACTICAL_AGENT.md`; cite the exact rule lines
in the lesson).

## Deliverables

1. **The kind chip reads an everyday word.** Render `kind` through a label
   vocabulary. Prefer an existing one (`VA.INTERFACE_KIND_WORDS` covers
   interface kinds; a node kind may need its own map). Pair the vocabulary
   against the schema's kind enum with a test, so a new kind cannot render
   raw.
2. **The notes say what the feature is, and the history goes to git.**
   - Rewrite every topology `note` that opens with or carries history: "Was
     named", "New in v2 (", "Since <date>", or a handoff slug.
   - Then add a guard. A Python test over `docs/topologies/*.json` refuses a
     note that contains a handoff slug, an ISO date, or "Was named"/"New in".
     Check first whether an existing banned-string guard should simply be
     extended.
   - **Alternatively** (the issue's other fix), fold the note behind one
     collapsed line. Choose one, and record why.
3. **Shot the same joint selected at 3840 and at 1920** after the change, and
   keep both in the lesson's `shots/`.

## Definition of done

- Default pytest tier, both node fast tiers, and the browser suites that read
  the Preview are green, per `CLAUDE.md`.
- Both issues get `status: resolved` with a one-line `resolution:`.
- Lesson (`docs/sessions/lessons/LESSONS_20261117_a_joints_preview_says_what_the_joint_is.md`)
  records:
  - the vocabulary and the guard;
  - which fix shape you chose for the notes, and why;
  - the shots.
