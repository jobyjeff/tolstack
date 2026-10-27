---
type: feature
priority: med
status: open
area: topology/tags
reporter: agent
audience: strategy
needs: jeff
ask: Tell forge which identity axis a gas-spring vs hydraulic-brake variant belongs on
found_by: docs/sessions/HANDOFF_20261026_bodies_and_studies_carry_forge_tags.md
---

# forge's identity.toml has no axis for "variant"

forge declares `component` (single), `purpose` (multi) and `phase` (multi). None
fits "gas-spring vs hydraulic-brake": `component` is single-valued and already
carries the propeller subsystem on every body; `variant-of` exists only as a
*relation*, not an axis.

Until it is answered, `tolerance_stack/topology.py` accepts `variant` as the one
provisional axis (`PROVISIONAL_AXES`) and the model tags `gas_spring` / `hydraulic_brake`
bodies and the two gas-spring studies with it. Options: add a `variant` axis in
forge (recommended: single-valued), or express it as `variant-of` edges and
derive the tag. Once decided, empty or rename `PROVISIONAL_AXES`/`VARIANT_AXIS`
and re-tag the model.
