---
type: bug
priority: low
status: triaged
area: viewer/feature form
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261122_the_walk_binds_through_the_form_on_the_merged_page.md
handoff: docs/sessions/HANDOFF_20261125_a_write_from_the_form_or_the_menu_never_vanishes_without_a_word.md
---

# Next in a feature's form cycles between the part's features that offer nothing

**Repro** (walk 2026-11-24, scratch copy of Jeff's log, `vpa_end_stop_v2`):
open "NAS77A3-015A flanged bushing, tangential link" (0 of 4). Double-click
"outer cylinder", take its one suggestion, press **Next**. Repeat on each form.

| step | form | Suggested | Next wrote |
|---|---|---|---|
| 1 | outer cylinder | "round · r 3.9827 mm · 2 segments — fits the mating bore" (taken) | 1 event |
| 2 | bore | nothing | 0 |
| 3 | flange underside | "flat — coincident with the mating face" (taken) | 1 event |
| 4 | flange-side face | nothing | 0 |
| 5 | bore | nothing | 0 |
| 6 | flange-side face | nothing | 0 |
| 7 | bore | … | … |

After the part's last feature with a suggestion, **Next** alternates between
the two features that are still unbound and offer nothing. It never returns
to the tree, so the run ends only on ✕ or Esc. Each lap is one click and
writes nothing. The rule as written ("Next when another feature of the part
is unbound", `docs/ANNOTATION_SURFACE.md`, "Editing a feature") is followed.
The rule just has no end when the remaining features are ones the reader has
already passed with an empty set.

**A shape for the fix:** Next goes to the next unbound feature *after this one
in tree order* and shows nothing past the last one. Or it skips the features
already passed in this run.

Shots: `docs/sessions/lessons/shots/the_walk_binds_through_the_form_on_the_merged_page/n1a_open_1536.png`,
`n4a_open_1536.png`, `n9_after_esc_tree_back_1536.png`. Scratch events 0126 and 0127.
