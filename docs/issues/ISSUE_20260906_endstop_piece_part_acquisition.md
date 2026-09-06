---
type: chore
priority: med
status: open
area: data/inbox/drawings, data/inbox/specs
reporter: agent
---

# Acquire the remaining end-stop-location piece parts and bearing specs

Filed by handoff `endstop_location_stack` (2026-09-06), deliverable 4 ("a
separate acquisition todo is filed for Jeff; do not block on it"), carrying
forward the acquisition list `endstop_retrace_acquired_docs` (2026-09-04) left
for the next session (its lesson's §8d / "Left for the next session").

## What's still blocked

Four piece-part drawings, one BOM level deeper than the assembly sheets Jeff
already exported (`215175-A`, `212956-005-A`):

- `215198-001` / `215198-002` — MOUNT, TANGENTIAL LINK, CW/CCW (the actual
  toleranced housing; `215175-A` is a dimensionless assembly that only
  balloons these)
- `214723-002` — BUSHING, SEALED, TANGENTIAL LINK
- `213863-004` — the pitch/anti-rotation link's toleranced body (`212956-005-A`
  carries only a parenthesized reference length for it)

Plus two Military Standard spherical-bearing spec sheets, unrelated to the
drawing pipeline and not yet in `data/inbox/specs/`:

- `MS14101` and `MS14103` (dash `-3` of each, per `212956-005-A`'s own parts
  list) — size tolerances for rows the worksheet scores `still blocked`

**Ask for these by their own part/spec numbers.** Asking again for "the
tangential link mount" or "the anti-rotation link" will very likely return the
same two assembly sheets already in hand (`215175-A`, `212956-005-A`) — that
is exactly what happened on the 2026-09-04 pass.

## What this closes, once acquired

Six `still blocked` topology edges / worksheet rows:
`pitch_link_length` (31/52), `tan_link_mount_height` (42),
`hub_top_deck_to_tan_link_mount_seat` (45),
`pitch_plate_flange_to_gas_spring_bushing` (62) — owner refined, not
acquired — plus worksheet rows 34/36/50/54/56 (spherical-bearing size
tolerances, untouched by any session so far).

None of this blocks the `-7`/`+72` end-stop checks from being *authored* —
they are, and they honestly report `complete: false` — but it is the cheapest
remaining lever to move that flag toward `true`, since the end-stop chain's
other open gaps (the end-stop feature's own identity, the sensitivity-condition
mismatch) are not acquisition problems at all.
