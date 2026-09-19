---
type: bug
priority: low
status: resolved
area: viewer/copy
reporter: agent
handoff: docs/sessions/HANDOFF_20260918_reader_facing_surfaces_second_pass.md
audience: strategy
found_by: docs/sessions/HANDOFF_20260918_real_tier_red_and_the_skipping_tier.md
resolution: handoff completed 2026-09-18 -- closed automatically by dispatch when handoff `reader_facing_surfaces_second_pass` moved to completed/; not independently verified.
---

# The two thermal stacks' joint blocks now shout FILE NOT IDENTIFIED, in a sentence written for a citation

Since `real_tier_red_and_the_skipping_tier` (2026-09-18) a joint's
`assembly_export_ref` renders through `VA.exportBlockNode`, which is right —
it is the one builder, and the key-by-key fallback was leaking a checksum, a
workstation path and two run ids. Two consequences on the `unestablished`
state, which is live on `hub_bearing_thermal_fit_m1` and `_m2`:

1. **The headline is a citation's sentence.** `VA.EXPORT_STATUSES.unestablished`
   says *"FILE NOT IDENTIFIED — which file this value was read from cannot be
   established"*. There is no "this value" in a joint block; the joint is
   context, not a number.

2. **`loud: true` may be the wrong register here.** The recorded `why` on both
   stacks says the 217755 assembly drawing *was never opened for this stack* —
   "there is no export to establish rather than one somebody tried and failed to
   establish". That is the same distinction `VA.NO_EXPORT_TEXT` and
   `VA.IDENTITY_RULES` were introduced to make at element level, and the loud
   tint is the register this repo reserves for a value whose bytes nobody can
   pin. Against the workspace design rule "emphasis is a budget — one accent per
   view", a red block on a joint that is correctly unsourced spends it on the
   wrong thing.

Not fixed in that session: the export-status vocabulary is shared by three
surfaces and adding a joint-shaped variant of it is a copy decision, not a bug
fix, and the session's handoff scoped it to the two red assertions and the
skipping tier. Deliberately filed rather than left in a lesson.

Repro: open `hub_bearing_thermal_fit_m1` in the viewer and expand **The joint**.
