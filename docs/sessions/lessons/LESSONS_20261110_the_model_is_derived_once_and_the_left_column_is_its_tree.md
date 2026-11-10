# LESSONS 2026-11-10 — the_model_is_derived_once_and_the_left_column_is_its_tree

Handoff: `docs/sessions/active/HANDOFF_20261110_the_model_is_derived_once_and_the_left_column_is_its_tree.md`.
Written as the work landed; the sections below are filled in order and the
suite record is last.

## The model block, as shipped

`topologies[].model` (built by `tolerance_stack/model_view.py`, carried by
`scripts/build_topology_projection.py`), beside `bodies`:

- `id`, `title`, `identity_ids` — the topology's id and, after it, the model
  whose ids it reuses (`ids_from`), so a reader iterates and never asks.
- `bodies[]` — `{id, name, kind, parts[]}` in authored order.
- `parts[]` — `{id, label, number, name, body, features[], dimensions[],
  occurrence, mesh}`; `label` is the one rule (`part_label`: number, then
  everyday name), also written on `parts[].label` of the projection.
- `features[]` — `{id: "<part>@<node>", part, node, name, kind, shared, body}`;
  a node on two parts is two features.
- `dimensions[]` — `{id, part, name, from, to, body}`, from/to as feature ids.
- `interfaces[]` — `{id, name, kind, source: node|edge, ends[2], parts[2],
  bodies[], within, joint}`; `within` is the one body it sits inside or null.
- `joints[]` — `{id: "<a>+<b>", parts[2], bodies[], within, constraints[]}`,
  interfaces grouped by part pair in first-seen order.
- `counts` — the ten numbers `tests/test_model_view.py` pins for v2.

v2's counts match the strategy session's derivation exactly: 5 bodies, 15
parts, 34 features, 22 dimensions, 17 interfaces (9 contacts + 8 gaps), 8
between bodies, 9 inside one (ground 5, pitch plate 3, blade 1), 15 joints of
which one is compound (hub + tangential link mount: seat, pilot, clocking).
