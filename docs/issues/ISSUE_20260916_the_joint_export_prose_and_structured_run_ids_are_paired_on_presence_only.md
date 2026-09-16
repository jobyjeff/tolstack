---
type: bug
priority: med
status: open
area: tolerance_stack/stack
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260916_python_value_and_schema_pins.md
---

# A joint's prose and structured assembly exports can name different runs, and nothing fails

`python_value_and_schema_pins` (2026-09-16) gave a stack's `joint` a structured
`assembly_export_ref` beside the prose `assembly_export` it already had, on
purpose: `scripts/build_viewer_crops.py`'s `_RUN_ID_RE` still parses the
sentence, so the sentence stays and **neither field is derived from the other**.
The migration's own guard,
`test_a_joint_that_names_an_export_in_prose_also_names_it_structurally`
(`tests/test_tolerance_stack.py`), pairs them **on presence only** — it asserts
that a joint carrying one key carries the other, in both directions, and says
nothing about whether the two name the same export or the same runs.

So the repo now has two hand-maintained carriers of one fact — which run ids
this joint's assembly drawing was read from — with nothing pairing their
contents. That is the shape `CLAUDE.md` names as this repo's most-repeated
defect, pointed at data rather than at a vocabulary.

## Measured

On `review/python_value_and_schema_pins`, at the post-merge tree
(1 failed, 1172 passed, 1 skipped — the one failure being the pre-existing,
twice-filed `test_no_live_document_states_an_unguarded_hardware_entry_count`):

edit `docs/tolerance_stacks/stack_rotor_fastener_length.json` so the structured
block's first run id reads `20260819_999999` while the prose sentence three
lines above still reads `20260819_110144`, and the suite is unchanged:

```
1 failed, 1172 passed, 1 skipped
```

The plant was reverted.

## Why the existing pins do not cover it

* `test_the_pitch_link_stacks_cited_runs_predate_that_sessions_first_commit`
  does assert both carriers, but by one hand-written id on one stack:
  `assert "20260804_114000" in raw["joint"][JOINT_EXPORT_PROSE_KEY]` and
  `assert "20260804_114000" in stack.assembly_export_ref.run_ids`. It is a pin
  on the pitch link, not a rule about joints, and `stack_rotor_fastener_length`
  — the other `established` joint, with two runs of its own — has nothing.
* `test_every_cited_run_carries_the_ts_from_its_own_run_meta` checks that each
  cited run has a parseable tz-aware `ts`, not that the id is real. Nothing in
  `tests/` reads drawing-checker's `run_meta.json`, deliberately (it is
  gitignored in the other repo), so a fabricated or drifted id is invisible.

Which matters because the structured block is what the read-only invariant now
reasons over: a run id that drifts from the sentence still gets its arithmetic
done against `PITCH_LINK_FIRST_COMMIT`, and passes, for a run nobody ran.

## Suggested fix

Replace the presence-pairing with a content-pairing: for every stack whose
`joint` has both keys, assert
`set(_RUN_ID_RE.findall(joint[JOINT_EXPORT_PROSE_KEY])) ==
set(stack.assembly_export_ref.run_ids)`. The regex is already importable from
`scripts/build_viewer_crops.py` (`tests/test_topology_projection.py` imports
from `scripts/` this way today), and reusing *the crop builder's own* regex is
the point: it pairs the two fields through the exact reader whose survival is
the reason the prose field was kept.

This overlaps
`ISSUE_20260916_the_joint_export_run_id_regex_can_retire_now_that_the_runs_are_structured.md`
but does not depend on it — if the regex retires and the prose field goes with
it, this issue closes with it; while both carriers exist, this is the guard that
keeps them honest. Whichever lands first should say so in the other.
