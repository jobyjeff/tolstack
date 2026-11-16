---
type: chore
priority: med
status: open
area: scripts/build_topology_projection
reporter: agent
class: two_vocabularies_for_one_fact
found_by: docs/sessions/reviews/REVIEW_20261116_the_map_draws_the_end_stop_model.md
---

# The builder and its test restate the model view's interface rule by hand

`tolerance_stack/model_view.py` owns what an interface is: a node two parts
share (`CONTACT_KIND`) or a gap edge, folded into the `interfaces` list the
page and the map read. Handoff `the_map_draws_the_end_stop_model` (2026-11-16)
added `scripts/build_topology_projection.py::load_topology_map`, which checks
that every `symbols` key of a map layout file names an interface -- and
re-derives the set in place:

```
interface_ids = {n.id for n in topology.nodes if len(n.parts) > 1} | {
    e.id for e in topology.edges if e.kind == "gap"}
```

`tests/test_topology_map.py::test_v2s_layout_names_symbols_only_for_its_interfaces`
writes the same two comprehensions a third time. Nothing pairs either copy
with `model_view`'s list: if the model view's rule moves (a shared node that
is not an interface, a gap kind that is), the builder keeps accepting or
refusing by the old rule, the map draws from the new one, and both tests
stay green. This is the class `docs/prompts/REVIEW_AGENT.md` tracks as
"A second copy of a producer's condition, with its divergences written out".

**Fix:** the builder already calls `model_view(...)` one line below for the
row's `model` block; compute it once and check the layout's symbol keys
against `{i["id"] for i in model["interfaces"]}`. The test then asserts
against the projected row's `model.interfaces` rather than its own
comprehensions.

Found in the review of the handoff above (REQUEST CHANGES, round 1); the
rework round may close this in passing, in which case mark it resolved there.
