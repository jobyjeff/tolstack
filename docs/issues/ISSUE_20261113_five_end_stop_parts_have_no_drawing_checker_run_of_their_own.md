---
type: chore
priority: low
status: open
area: viewer/drawing-links
reporter: agent
needs: jeff
ask: Export the drawings for 214373-002, 215175-002, 215071-001, 215177-001 and 216332-001 to drawing-checker
found_by: docs/sessions/HANDOFF_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md
todo: 20261115T182758_2ay4en
---

# Five end-stop parts have no drawing-checker run of their own

Since handoff `a_part_links_to_its_drawing_before_it_has_a_tolerance`, a part's
number in the viewer's Preview links to the newest drawing-checker run whose
drawing number is exactly the part's. On the end-stop model (v2), measured
2026-11-13 against drawing-checker's `data/runs/` (151 directories):

| part | number | what the Preview offers today |
|---|---|---|
| propeller hub | 214373-002 | 214373-003 (different dash number) |
| tangential link mount | 215175-002 | 215175 (different dash number) |
| pitch arm | 215071-001 | 215071 rev C (different dash number) |
| pitch plate | 215177-001 | 215177 (different dash number) |
| blade bonded assembly | 216332-001 | nothing |

Exporting each part's own drawing PDF into drawing-checker (its inbox; the eager
lane runs it) and rebuilding the projections turns each row into a link to the
part's own drawing, with no code change. Where the bare-base drawing (215175,
215071, 215177) *is* the part's drawing, the honest fix is the topology's
`drawing` field instead — that is a correction to the model, not an export.

## Addendum 2026-11-20 (handoff `an_open_dimension_says_where_its_drawing_stands`)

The projection now says, per open dimension, where its drawing stands
(`edges[].drawing_status`), so this list can be read off the rebuild's summary
line instead of re-measured. After the chain's model changes, v2's open
dimensions whose drawing is **not read anywhere** are on 216332-001 (blade
bonded assembly, 3), 214820-002 (straight bushings, 4) and 213861-002 (machined
pitch link, 1) -- the last two are new to v2 since this issue was filed and are
not in its ask. The pitch plate is 215735-001 in v2 now (215177-001 stays v1's).
Reading one run per "other dash" drawing's text: 215071 (pitch arm) and 215735
(pitch plate) state that the sheet is used with model -001 (and its mirror), so
they likely do dimension the model's dash; 214373-003 is the hub *assembly* and
215175 is the tangential-link-mount *assembly* (its finds are 215198-001/-002,
the machined mounts), so neither visibly dimensions the part the model names.
