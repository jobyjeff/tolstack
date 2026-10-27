# Lessons — bodies_and_studies_carry_forge_tags (2026-10-26)

## The axes found in forge's file

`C:\workspace\forge\identity.toml` declares three axes: `component` (single),
`purpose` (multi), `phase` (multi). **None carries "variant"** — `variant-of` is
a *relation*, not an axis. Per the handoff's fallback the ask is filed:
`docs/issues/ISSUE_20261026_forge_has_no_variant_axis.md` (`needs: jeff`).

## Decisions the handoff did not make

- **`variant` is accepted as one provisional axis** (`PROVISIONAL_AXES` in
  `tolerance_stack/topology.py`) so the model can carry the tags and the DoD (select
  `variant: hydraulic-brake`, see the gas-spring body dim) can be shown now.
  Everything else is checked against forge. If Jeff answers with a different
  axis, change `VARIANT_AXIS` and re-tag; the page reads the word from the
  projection's `variant_axis`, so no JS edit.
- **"The propeller subsystem on every body"** is `component: propeller-system`
  (forge's subsystem is a *group* via `member-of`, not an axis). `component` is
  single-valued, which is why variant could not share it.
- **Which bodies are the gas spring:** only body `gas_spring`. `pitch_plate` (plate +
  piston) and the piston heads/cover are shared or unplaced and carry no variant.
  Studies tagged gas-spring are the two whose selection reaches a `gas_spring`
  part edge. The brake body is `hydraulic_brake`; no study folds it.
- **A study with no variant tag stays when a variant is selected** (neutral);
  on any other axis an untagged study is hidden. Stated in DAG_TOPOLOGY.md.
- The viewer has no body container on the DAG, so "dims the body" = the rails,
  dots and grid rows of that body's parts (edge.part → body).

## Verified / not
See the report. Worktree `pytest -q` is red on `tests/test_viewer_js_suite.py`
(documented) and on 4 `test_mutation_witness_shadow_concurrency` tests (a stale
`tmp/mutation-witness-*` shadow dir refusing deletion, EPERM — worktree
environment, not this change).
