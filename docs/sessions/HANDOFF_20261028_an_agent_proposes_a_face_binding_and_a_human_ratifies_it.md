---
priority: med
depends_on: [an_interface_suggests_the_faces_that_touch]
model: opus
hitl: false
---

# HANDOFF 2026-10-28 — an_agent_proposes_a_face_binding_and_a_human_ratifies_it: zero faces are bound after seven weeks of surface; agents propose, the annotator shows proposals apart, Jeff accepts or rejects

**Decided by Jeff, 2026-10-28 ("Yes, propose"): agents propose face
bindings and he ratifies them in the annotator.** Fully autopilot.
**Sequenced after `an_interface_suggests_the_faces_that_touch` (Jeff, same
day): the contact-suggestion engine is built first, and the first proposal
pass is its trial — the agent proposes from the engine's ranked candidates
and reports where the engine was wrong or undecided.**

Source: Jeff's 2026-10-28 review ("The 3d dag node placement needs some work
… Part of this may be because the 3d surfaces haven't been bound yet.
Wondering if it makes sense for agents to take a pass at binding these 3d
surfaces (they'd have to use vision to interpret the 2d drawings as well as
select faces on the 3d models), or we could get the human/app facing binding
controls debugged"). Measured the same day. Baseline: `master` with
`the_scene_pane_is_one_flyout_that_reads_over_http` merged (HTTP reads; the
grant is asked on write). Scope: `apps/annotate/binding_state.js`,
`apps/annotate/app.js` (the bind/supersede writers ~:3730, 3833, 3964; the
rail rows that show a binding), `apps/annotate/model_layer.js` (anchor
source order ~:18–33, `AA.modelAnchors` ~:356–402), `tolerance_stack/feature_identity.py`,
`scripts/fit_bound_features.py`, a new CLI entry (`scripts/propose_bindings.py`
or a `tolstack bind propose` verb — follow the repo's CLI shape),
`docs/ANNOTATION_SURFACE.md`, tests. Do NOT touch `apps/viewer/` or the
pick/goto flow (landed by the pick handoff).

## Measured

- **Bindings today: zero.** `C:\workspace\tolstack\data\inbox\feature-identity\`
  holds only its tracked README; there is no `data/projections/feature-identity/`.
  The only `feature-identity/v0` files anywhere are four test fixtures
  (`recorded_by: "test-fixture"`) and their copies under `data/scratch/`.
  The one real binding ever written was Jeff's on 2026-10-21 (face 110 of
  the upper piston head → `piston_head_upper_thickness`, wrong direction),
  deleted by hand (`HANDOFF_20261026_a_binding_may_be_superseded.md:56–61`).
- **The event cannot say who wrote it**: `recorded_by` is hard-coded
  `"annotate-app"` (`binding_state.js:199, 326`; app.js ~:3730/3833/3964).
- **Consequence on the scene**: with no bound anchors, every DAG node in 3D
  falls to the **section** fallback (`model_layer.js`: joint → bound →
  section → origin) — the centroid of the +X-most region of the part cut at
  its box mid-plane, with several nodes on one part "laddered" up the stack
  axis by stack order, not by where the feature is — or to **origin**. On P2
  the 10-26 lesson counted 36 section / 4 joint / 0 bound / 7 origin anchors
  (`LESSONS_20261026_the_model_is_drawn_in_the_scene.md`). That is the
  "floating in strange locations" Jeff sees; it will not self-resolve
  without bindings.
- **No rule forbids an agent binding; the docs assume a human ratifies.**
  `docs/ANNOTATION_SURFACE.md:18` "a human does the selecting"; :321–324 "the
  engine colours; the human selects … a binding is still a human-ratified
  `feature-identity/v0` event"; :206 names "a vision-agent driver operating
  the surface" as the intended follow-on. The suggestion engine (2026-09-21)
  already classifies faces by shape (round for a diameter, flat for a
  thickness, ball for a joint centre) and never writes.
- `fit_bound_features.py` needs from a binding: a standing `verdict: "bound"`
  event, `stack_key` + `direction` (`from`/`to`), `geometry_key`
  `{source_step_sha256, face_id, area_native2, centroid_native[3]}`, a mesh
  manifest for that sha and occurrences from `provenance.json`.

## The lane (the repo's own patterns: event-sourced, propose-then-ratify, effector CLI)

1. **A proposal is an event, apart from a binding.** Add
   `verdict: "proposed"` to `feature-identity/v0` (or a sibling schema if the
   fold prefers — the fold must treat a proposal as **never standing**: the
   fitter ignores it, the anchors ignore it, `built_from_events` counts it
   separately). `recorded_by` becomes a real actor string on every write
   (`annotate-app:<user>` for the UI, `agent:<handoff-slug>` for the CLI);
   the fold keeps both. A proposal carries `confidence` (`high | medium |
   low`), a one-line `basis` (which shape class, which drawing crop, which
   occurrence) and the `suggestion engine`'s class for the face.
2. **The effector CLI.** `propose` takes a topology id, an edge/element key,
   a direction, a mesh sha + face id, confidence and basis, validates
   against the mesh manifest and the suggestion engine's shape class (a
   diameter on a flat face is refused), and writes the proposal file into
   `C:\workspace\tolstack\data\inbox\feature-identity\` (absolute main-checkout
   path — a worktree's `data/` is empty). `propose --from-report <json>`
   writes many. No other write path for agents.
3. **The annotator shows proposals apart and ratifies in one click.** A
   proposed face draws dashed in the suggestion colour with the actor and
   basis on hover; the rail row for the feature shows "proposed by agent ·
   high" with **Accept** (writes the standing `bound` event with
   `recorded_by` the human actor and `ratifies: <proposal id>`) and
   **Reject** (writes a `rejected` event naming the proposal; the fold hides
   it; the CLI refuses to re-propose the same face for the same key). Accept
   needs the folder grant (asked at that moment, per the HTTP handoff).
   Proposals never move an anchor: the scene stays on the fallback until
   ratified, so the human sees what accepting would change (draw the
   proposed anchor as a hollow marker beside the current one).
4. **The first pass, by this agent — the contact engine's trial.** Read
   `data/projections/feature-identity/contact_suggestions.json` (the
   previous handoff's output). For every gap edge with one clear top pair,
   propose both faces (`from` and `to`) at `high` with the engine's evidence
   as the basis. For an edge where the engine lists several close
   candidates, decide with the drawing crops under
   `data/projections/viewer/` for the edge's cited callout and the stack
   axis; propose at `medium` with the discriminating fact in the basis, or
   propose nothing and write the edge to the gap list with the candidates.
   For structural (same-part) features with no gap edge — the section-
   anchored nodes — use the shape-class suggestion plus the drawing crop,
   as before. **Debug the engine while you use it:** every edge where the
   engine's top pair is visibly wrong (the crop or the geometry says another
   face), or where contact exists but the engine found none, is filed as an
   issue against the engine's constants or pairing rule, with the two face
   ids and the numbers — that list is the deliverable Jeff asked for. Report
   per node: key, face, confidence, basis, engine rank. **Nothing is bound by
   this handoff** — Jeff ratifies in the annotator afterwards.
5. **Docs.** `docs/ANNOTATION_SURFACE.md` gains the proposal state and the
   actor field; `CLAUDE.md`'s annotator bullet gains one sentence; the
   feature-identity README in the inbox lists the new file kind.

## Definition of done

- `pytest -q`: fold tests for proposed / accepted / rejected sequences
  (value-level: a proposal never produces a fitted nominal; an accept does;
  a reject hides and blocks re-proposal); CLI refusal tests (wrong shape
  class, unknown sha, no such key).
- `node apps/annotate/run_tests.cjs` + the annotate browser check: a
  proposed face renders dashed with hover text; Accept/Reject write the
  right events (fixture folder).
- The first pass written: N proposals in the main checkout's inbox (name N
  and the gap list in the lesson); after a projection rebuild the annotator
  shows them on the kinematic page; anchors unchanged until ratified.
- All four main-checkout tiers green after a projection rebuild.
- Lesson (`docs/sessions/lessons/LESSONS_20261028_an_agent_proposes_a_face_binding_and_a_human_ratifies_it.md`):
  the per-node proposal table; the gap list with candidates; how long the
  pass took and what the vision leg (drawing crops) actually decided versus
  the shape class alone; the anchor census (section/joint/bound/origin)
  before, and what it would be if every `high` proposal were accepted.
