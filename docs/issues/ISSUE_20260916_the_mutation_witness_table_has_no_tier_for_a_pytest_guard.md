---
type: feature
priority: med
status: resolved
area: tests/mutation-witness
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_mutation_witness_enrollment_gaps.md
found_by: docs/sessions/HANDOFF_20260916_viewer_unwitnessed_surface_guards.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `mutation_witness_enrollment_gaps` moved to completed/; not independently verified.
---

# A Python guard cannot own a mutation witness: `tier` has no word for pytest

`scripts/mutation_witnesses.json`'s `tier` vocabulary is `fast` | `annotate` |
`browser` — three node harnesses, written in exactly two places
(`TIER_HARNESS` in `scripts/run_mutation_witness_tests.mjs`, `TIERS`/`CHECK_SOURCE`
in `tests/test_mutation_witnesses.py`) and paired against each other on every
pytest run. There is no word for `venv-win/Scripts/python.exe -m pytest`.

So a guard whose only tier is pytest can be **demonstrated** reddening by hand
and cannot be **declared**, which is precisely the gap the whole table exists to
close: the hand check survives only as long as somebody remembers it.

## How it came up

`HANDOFF_20260916_viewer_unwitnessed_surface_guards.md` deliverable 1 asked for
four wires to be witnessed "and declare all four". Two of them are Python:

| guard | file | mutation | reddens |
| --- | --- | --- | --- |
| the builder emits the parts-list companion | `scripts/build_viewer_crops.py` | the `parts_list_companion(...)` call → `companion = None` | `tests/test_viewer_crops.py::test_the_builder_emits_the_parts_list_companion_beside_a_balloon_crop` |
| the builder names the drawing the link is called after | `scripts/build_viewer_crops.py` | `"drawing_no": (…)` → `"drawing_no": None,` | `tests/test_viewer_crops.py::test_the_builder_carries_the_drawings_own_number_and_revision` |

Both were planted, observed reddening and reverted on 2026-09-16. Neither could
be written down.

This is the same shape as
`ISSUE_20260915_the_annotate_fast_tier_cannot_own_a_mutation_witness.md`, which
was closed by adding a fourth word (`annotate`) on 2026-09-16 — so the
precedent for the fix exists and is recent.

## What it would take

Three things, and the third is the one worth thinking about:

1. A `python` tier in `TIER_HARNESS`. Unlike the three node tiers its command
   is not `node <script>`: it is the venv interpreter plus `-m pytest`. The
   runner's `tierCommand` builds `[script, "--repo", DATA_REPO, …]` and spawns
   node; a Python tier needs a different argv shape and a different
   interpreter, and on Windows the interpreter lives in the MAIN checkout even
   when the shadow does not.
2. A failure regex. pytest's own is `FAILED tests/x.py::test_name`, so
   `expect_red` would be a **node id**, not a prose sub-check name — a
   different kind of string from every entry in the table today, and arguably a
   better one, since a node id is exact and a prose name is not.
3. `SHADOWED` would have to grow `tests/` (and whatever fixture trees those
   tests read), which is a real cost: the shadow is copied per mutation.

A cheaper middle option, if the above is too much: let an entry declare
`tier: "python"` with `suite` naming the test file, and run
`<venv>/Scripts/python.exe -m pytest -q <file>` from the **repo**, not the
shadow, with the mutation applied to the repo and reverted in a `finally`. That
gives up the shadow's safety, which is most of why the tier is trusted — so it
should probably be refused rather than built. Recording it here so the next
person does not rediscover the temptation.
