---
type: bug
priority: high
status: open
area: annotate/browser-tier
reporter: agent
class: browser_red_on_trunk
found_by: dispatch/docs/sessions/lessons/LESSONS_20261108_triage_sweep.md
handoff: the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show
---

# The rail-suggestion `[real]` check finds 15 suggested rows for 34 open-proposal edges on trunk

**Measured** 2026-11-08 in the main checkout after the triage batch merge
(`783515c1 -> 7d9772e6`, fast-forward; trunk now `6682b972`), with projections
rebuilt by `scripts/rebuild_projections.ps1` first (stamps `sha12=6682b9720d97 dirty=False`):

- `node scripts/run_viewer_browser_tests.mjs`: 41/43. One of the two failures is suite
  `annotate rail suggestion (the row says so, select lights it, Accept, pick a different face)`,
  18/19, sub-check
  **`[real] the topology-level rail shows a suggestion on every edge with an open proposal`**.
- `node scripts/run_viewer_browser_tests.mjs --only "annotate rail suggestion"`: the same,
  deterministic: `topology-level rail: 15 rows read suggested; the projection has 34 edges with
  62 open ends`. (The other failure in the full run, `3D pane follows the selection`, passed
  32/32 alone. It is the known flake,
  `ISSUE_20261105_3d_pane_follows_selection_suite_flakes_under_the_witness_runner.md`.)

**What is ruled out.**

- *Not stale-versus-fresh inputs.* The page (`binding: "real"`, `readFeatureIdentityProjection`)
  and the check both read the same `data/projections/feature-identity/bindings.json`.
- *Not dangling edge ids.* All 34 open-proposal edge ids are edges of `vpa_pitch_linkage` in the
  rebuilt `topologies.json`. Checked in a scratch fold: 99 edges, 34 open, 34 in the topology.

**Why no gate saw it.**

- The 2026-11-06 sweep's full browser tier was 42/43 with this suite green, against the same
  `bindings.json`. That file is dated 2026-11-05 and cannot currently be rebuilt; see
  `ISSUE_20261108_four_feature_identity_events_share_a_seq_so_the_bindings_projection_cannot_be_rebuilt.md`.
  So the change is in code that arrived in this merge.
- The model_v2 review ran its browser tier on a worktree data root with no `bindings.json`, so
  this `[real]` sub-check reported itself skipped there.
- The batch merge cannot run the browser tier on the candidate either (no `node_modules`; see
  tolstack `CLAUDE.md`). Trunk is the first place it ran for real.

**Suspects, unconfirmed.**

- `5694df28` / `d0863681` (model v2; "a shared id under ids_from has one identity key, the
  source model's"). v2 is now the default model. The page is opened at
  `?embedded=1&topology=vpa_pitch_linkage`, so either the boot lands on a different model's
  rail, or the identity-key change makes v1 rows miss proposals keyed on `vpa_pitch_linkage`.
- `36bc255c` (event files numbered from max(seq)+1).

The routed fix is
`docs/sessions/HANDOFF_20261108_the_rail_suggestion_check_counts_what_the_rail_is_meant_to_show.md`.
