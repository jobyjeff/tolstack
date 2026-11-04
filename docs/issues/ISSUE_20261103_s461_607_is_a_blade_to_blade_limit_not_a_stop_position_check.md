---
type: bug
priority: med
status: open
area: kinematic study / requirements
reporter: agent
audience: strategy
found_by: docs/sessions/HANDOFF_20261103_each_stop_is_its_own_stack.md
---

# S461-607 was checked against the stop positions; it bounds the spread between one propeller's blades

S461-607 reads *"The pitch angle of each blade in a propeller assembly shall not
exceed +/-0.5 degrees of the mean pitch of the blades"*
(`data/inbox/requirements/S461_equipmentrequirements_20260906.json`). That is a
**blade-to-blade** limit: how far one blade may sit from the mean of the blades
of the same propeller, at the same actuator position. It says nothing about
where a stop is.

From handoff `the_travel_between_the_end_stops_is_a_study` (2026-10-16) to
2026-11-03, `kinematic_study_vpa_pitch_linkage_blade_pitch_at_the_stops.json`
checked each stop's accumulated pitch band against it (±0.5 deg), with a note
saying it was borrowed as "the closest available numeric acceptance criterion".
The verdicts that check produced (−7 deg: margin −1.207, `marginal`; +72 deg:
+0.185, `pass`, on 2026-10-29) were answers to a question the requirement does
not ask.

**Fixed here for the stops:** handoff `each_stop_is_its_own_stack` removed both
S461-607 checks and replaced them with one-sided reach checks against S461-261
(Blade Pitch Control Range, −5 to +70 deg).

**What is still missing — the right home for S461-607:** a blade-to-blade
variation study. Its terms are the per-blade link tolerances — what differs
between blade 1's pitch link, pitch arm and root bore and blade 2's or 3's —
folded at a pose, against ±0.5 deg about the blades' mean. Terms common to every
blade (the plate, the actuator, the gas spring, the stop stacks) cancel in it and
do not belong. No such study exists; the topology models blade 1 only.

Options for the strategy session:

1. **A blade-to-blade study over the blade-1 chain, as a proxy** — the per-blade
   terms of the kinematic study (pitch link length, pitch arm radius, the
   plate's link-hole position) at each pose, read as "how far one blade can sit
   from another", with the mean-of-N reading stated. Cheapest; needs no new
   topology.
2. **Model blades 2 and 3** — the honest version, but each needs its own arm,
   link and root bore in the topology and a sweep that carries them.

Recommendation: 1, with the N-blade reading written down, until a three-blade
sweep exists.
