---
type: chore
priority: low
status: open
area: viewer/drawing-links
reporter: agent
needs: jeff
ask: Export the drawings for 214373-002, 215175-002, 215071-001, 215177-001 and 216332-001 to drawing-checker
found_by: docs/sessions/HANDOFF_20261112_a_part_links_to_its_drawing_before_it_has_a_tolerance.md
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
