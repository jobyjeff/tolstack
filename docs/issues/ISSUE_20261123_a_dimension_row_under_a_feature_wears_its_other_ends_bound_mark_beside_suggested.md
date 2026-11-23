---
type: bug
priority: med
status: open
area: viewer/nav
reporter: agent
found_by: docs/sessions/HANDOFF_20261122_the_walk_reads_the_v2_study_and_the_map_on_the_merged_page.md
---

# A dimension row under a feature wears its other end's bound mark beside "suggested"

Jeff, 11-22: "'piston cover flange to feather stop face' has a green circle,
but it hasn't been bound yet, it only has suggestions."

On the merged page the same thing still happens. Under
`214698-002 upper piston head › step face` (blue open circle: suggested),
three child dimension rows wear the same blue circle, and the fourth,
**"travel between end stops", wears a solid green dot while its line reads
"suggested · high"**. That dimension's other end (the cover's end-stop
shoulder) is bound (Jeff's event 0110). This end is not. Shot:
`docs/sessions/lessons/shots/the_walk_reads_the_v2_study_and_the_map_on_the_merged_page/44_green_mark_on_a_suggestion.png`.

So the row's mark reads the edge's state and its text reads this end's. Two
more facts make that hard to see:

- **No mark has a hover text.** All 223 `.navtree__mark` elements on v2 carry
  no `title` or `aria-label`, so a reader cannot ask what a dot or circle
  means.
- **Inside a dimension row, an agent's suggestion is a blue diamond and a
  contact row a purple one** (`43_suggested_child_expanded.png`). That is a
  third and fourth mark, telling the reader whose suggestion it is.

What did improve since 11-22: a **bound** feature's body now reads only
"bound · face 3 of 213668-002" plus Correct, Add a face and Unbind, with no
"agent suggested" (`41_status_marks_piston_cover_flange.png`), which is the
progressive disclosure he asked for.

Fix shape: a row under a feature takes its mark from the end the line
describes. Give each mark a one-word hover. The staged binding-pane chain may
redraw these marks; if it does, this is the rule it must keep.
