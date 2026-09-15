---
type: chore
priority: low
status: triaged
area: tests/topology
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_projection_field_guard_rows.md
handoff: docs/sessions/HANDOFF_20260915_viewer_value_guard_rows_and_replays.md
---

# `test_every_prose_field_the_count_pairing_claims_is_really_scanned`'s replay pins *which* fields the corpus states an inventory in

Found reviewing `projection_field_guard_rows` round 2 (2026-09-15), in the
per-member replay that round added — the arm that is otherwise the right answer
to the blocker it was written for.

`tests/test_topology.py`, last assertion of the test:

```python
    assert replayed == {"description", "notes"}, (
        f"dropping a key reddens for {sorted(replayed)}; the corpus states an "
        f"inventory in `description` and in `notes`, so those are the two that "
        f"must. …")
```

`replayed` is computed from the **committed topology corpus** — the set of
`PROSE_FIELDS` keys that, when dropped, give `unlisted_inventory_fields` something
to report. Pinning it with `==` makes an ordinary authoring act redden the
guard's own demonstration.

## Measured, 2026-09-15

Appending one **correct**, guarded sentence to
`docs/topologies/topology_rotor_fastener_length.json`'s
`provenance.structure` — `"The graph as modelled: 3 parts, 12 edges."`, both
figures right, in a field `PROSE_FIELDS` already lists and the guard proper
already checks:

```
AssertionError: dropping a key reddens for ['description', 'notes', 'provenance'];
the corpus states an inventory in `description` and in `notes`, so those are the
two that must. A field missing from this set is either a corpus change -- check
the counts moved somewhere still guarded -- or prose_candidates having gone blind
to that field's JSON shape again, which is what the reachability arm above is for.
```

Two things wrong with that red, neither of which is the author's mistake:

- **Nothing is broken.** The new sentence is paired, correct, and caught by the
  guard if it goes wrong. The only test that objects is the one that exists to
  prove the guard can fail.
- **The message diagnoses the opposite case.** It explains a field *missing*
  from the set; the reader is holding a field that was *added*. `docs/prompts/
  REVIEW_AGENT.md` logs this exact shape — *"a demonstration that fails for an
  unrelated reason is how a guard gets deleted"* — and its stale-count entry's
  fifth sighting is specifically about a cached count landing in an
  **anti-vacuity** assertion, "the last place you want a spurious red".

## Fix shape

One character, and the claim it makes is the one actually wanted:

```python
    assert replayed >= {"description", "notes"}, (…)
```

`>=` keeps the whole anti-vacuity guarantee — both fields known to carry a
hand-copied inventory must be attributable to themselves when dropped, so the
replay cannot go quiet — and stops asserting that no *other* field will ever
carry one. The per-field `assert all(n.endswith(f":{field}") …)` inside the loop
already covers attribution for whatever else joins, so a new field is fully
replayed the moment it appears, with nothing to update by hand.

Reword the message to match: *"these fields must be replayed and were not"*,
dropping the "so those are the two that must" clause, which is the part that
becomes false as soon as the corpus grows.

## Why this was not a blocker

The guard and all four arms are verified working (see the review report's
measurements, including the reachability arm reddening on the restored defect).
This is a future spurious red in a demonstration, not a present hole — and the
review approved round 2 on that basis rather than spending a third loopback on
one character. Filed so it has an owner after the merge.
