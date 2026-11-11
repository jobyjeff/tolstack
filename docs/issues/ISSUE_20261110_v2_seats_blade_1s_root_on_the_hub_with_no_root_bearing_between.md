---
type: bug
priority: low
status: open
area: topology/v2
reporter: agent
found_by: docs/sessions/HANDOFF_20261110_the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model.md
audience: strategy
resolution: 2026-11-10 triage -- needs: jeff demoted (a question whose answer an agent then acts on fails the todo test); a domain call for the tolstack strategy thread to ask in-session
---

# v2 seats blade 1's root on the hub with no root bearing between

The handoff asked for any other place v2 seats a part on the wrong
neighbour. I read every contact and gap in
`docs/topologies/topology_vpa_end_stop_v2.json` against the parts it
names. This one is the only candidate.

- Node `hub_blade1_root_bearing_bore` ("blade 1 root bearing bore") is one
  contact on `[hub, blade_root]`, so the blade's root touches the hub
  directly. Its own name says the bore holds a bearing, and no bearing part
  is in v2. v2's notes list what it leaves out on purpose (the gas spring,
  the VPA, fasteners, washers, bushings, blades 2 to 5), and root bearings
  are not on that list. The hub's main bearings are named as left out
  (`hub_spindle_bore_axis`'s note). The blade-root bearings are not.

Every other contact checks out against the worksheet or Jeff's sketch:
hub/tangential link mount (seat, fasteners, pilot), gas-spring mount on
the tangential link mount (this handoff), cover on the gas-spring mount,
the lower head on the piston body's shoulder and on the mount's stop face,
the two heads on each other, and the pitch arm on the blade root.

If a root bearing sits between, the fix is either to add it as a part or to
add it to v2's "left out, on purpose" note, which is one line. Not changed
here: the handoff limits itself to the gas-spring mount's seat.
