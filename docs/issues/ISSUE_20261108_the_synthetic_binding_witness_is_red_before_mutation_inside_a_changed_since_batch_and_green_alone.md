---
type: bug
priority: low
status: open
area: tests/mutation-witness
reporter: agent
class: flaky_witness
found_by: docs/sessions/HANDOFF_20261108_model_v2_is_the_end_stop_linkage_in_five_bodies_and_the_nav_switches_models.md
---

# The synthetic-binding witness is red before mutation inside a `--changed-since` batch, and green alone

`browser__real-a-synthetic-binding-moves-exactly-one-node-to-its-b__389dc6f7`
came back **NOT WITNESSED — "the tier was red before the mutation"** in two
separate `node scripts/run_mutation_witness_tests.mjs --changed-since …`
batches on 2026-11-08, both on this handoff's tree:

- the tactical run (`--changed-since integration`, lesson
  `LESSONS_20261108_model_v2_…`, "Verification record");
- the review's post-merge run (`--changed-since integration`, 35/37
  witnessed, 3m15s on this entry), which ran beside a full `pytest -q`.

Each time, `--only "browser__real-a-synthetic-binding-moves-exactly-one-node-to-its-b__389dc6f7"`
re-run alone **witnessed** it (review: 1/1 in 3m13s). The same review batch
also missed `browser__real-the-spindle-coaxiality-pair-is-one-dot-in-the-scene__2a3ef74c`
the same way, and that one witnessed alone too (4m15s).

So the unmutated browser check fails in a batch and passes alone: an order
or timing dependency in the check (or in what an earlier entry leaves
behind), not a decay. The gate exits 0 on it, but every batch it misses in
costs a reviewer two `--only` re-runs (about 7 minutes) to tell the
difference. Start from what the check waits on before it asserts the node
moved.
