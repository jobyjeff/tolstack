---
type: bug
priority: high
status: triaged
area: annotate/write-path
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261105_the_rail_holds_still_and_takes_the_face_jeff_picked.md
handoff: docs/sessions/HANDOFF_20261106_annotator_event_files_number_from_the_folder.md
resolution: triaged 2026-11-06 (triage) -- staged annotator_event_files_number_from_the_folder
---

# Every annotator session numbers its feature-identity event files from 0001

`AA.nextEventFilename` (`apps/annotate/binding_state.js`) takes the highest
`^\d{4}_` prefix among the names `existingEventFilenames` (`apps/annotate/app.js`)
hands it. Those names are the projection's `built_from_events` plus this
session's event ids. `built_from_events` holds **event ids**
(`proposal-0001-pitch_link_length-from`, …), not filenames, so nothing
matches and every session starts at `0001_`.

Measured 2026-11-05 in `data/inbox/feature-identity/` (main checkout): Jeff's
four bindings from that afternoon are `0001_pitch_link_length_accepted.json`,
`0002_tan_link_length_accepted.json`, `0003_tan_link_length_accepted.json`
and `0004_pitch_link_length_accepted.json`. Their `seq` fields read 56 and up,
and the inbox already had `0001_pitch_link_length_proposed.json` … `0062_…`.

What goes wrong: a later session that answers the same end writes the same
full filename again (`0001_pitch_link_length_accepted.json`). Depending on the
writer, that either overwrites an append-only event or fails the write. Any
reader that orders events by filename also gets them out of order.

Fix shape: number from the folder's real filenames, or from `max(seq)`, and add
a test that a projection whose `built_from_events` are ids still yields the
next number. Leave the four files already written alone (append-only). Their
`seq` is right; only the prefix is wrong.
