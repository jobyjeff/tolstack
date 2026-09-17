---
type: chore
priority: med
status: open
area: docs/SOP
reporter: agent
found_by: docs/sessions/HANDOFF_20260916_python_value_and_schema_pins.md
---

# The SOP documents no `joint` block at all, so an author following it cannot know to write `joint.assembly_export_ref`

`docs/SOP_TOLERANCE_STACK.md` is the procedure for building a stack by hand, and
it contains **no occurrence of the string `assembly_export`** — nor, as far as
the scan for this issue went, any prescription of the `joint` block's keys.
Every stack in `docs/tolerance_stacks/` has one, they carry between four and
twelve keys each, and three different vocabularies of key are in use
(`assembly` vs `assembly_drawing`; `question`/`why_this_stack_exists` on the
thermal pair; `scope`/`zone_note` on the grip stacks).

That was a documentation gap before 2026-09-16. It became an *authoring* gap
that day, when `python_value_and_schema_pins` added
`joint.assembly_export_ref` — a `SourceExport` beside the prose
`joint.assembly_export`, so the assembly export's drawing-checker runs carry
their `ts` and the read-only invariant can reach them.

The new key is enforced, but only from the test side:

* `StackDefinition.__post_init__` raises on a malformed block;
* `test_a_joint_that_names_an_export_in_prose_also_names_it_structurally`
  fails a stack that writes the prose sentence without the block.

So an author who writes a new stack the SOP's way gets a red suite with a
message telling them what to add. That is a working backstop and a poor
teaching surface: the requirement is discoverable only by tripping it.

## What would close it

A short `joint` subsection in the SOP naming the keys a joint may carry, with
the three states of `assembly_export_ref` spelled out (`established`,
`unestablished` + `why`, and **absent** — absent meaning the joint makes no
export claim, which is *not* the same as one somebody tried and failed to
establish). The constants `JOINT_EXPORT_KEY` / `JOINT_EXPORT_PROSE_KEY` in
`tolerance_stack/stack.py` are the definition, so the SOP text should be paired
against them the way `tests/test_sop_vocabulary.py` already pairs the SOP's
other vocabularies — otherwise this becomes the repo's most-repeated defect
(`docs/prompts/REVIEW_AGENT.md`, "Documented vocabularies drifting from the
seeded data") in a new place.

Left out of `python_value_and_schema_pins` deliberately: that handoff's scope
was `tolerance_stack/stack.py`, `tests/test_tolerance_stack.py`,
`scripts/build_topology_projection.py` and `docs/tolerance_stacks/*.json`, and
the SOP has its own guards that a drive-by edit would have to answer to.
