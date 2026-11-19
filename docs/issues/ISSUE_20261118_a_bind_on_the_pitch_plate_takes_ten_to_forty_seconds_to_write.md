---
type: bug
priority: med
status: open
area: annotate / armed pick and Take write path
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_a_disagreement_is_settled_by_keep_or_let_go.md
---

# A bind on the pitch plate takes 10–40 seconds to write, and the tree reads it 5–13 seconds after that

Measured with `tests/debug_keep_or_let_go_20261118.mjs` (2026-11-18, the
served page on drawing-checker's mount shape, a scratch copy of the log), on
`pitch_plate_215177_001` (mesh `37e9f606…`):

| what | first click → event on disk | event → the shell's body reads it |
|---|---:|---:|
| armed click, this branch (`--only unbind`) | 7.7 s, 10.9 s | about 5 s |
| armed click, integration tip's pane (`--only dbl --direct`) | 12.6 s, 34.2 s, 40.6 s | not measured |

Nothing else on the page changes in that window except, since this handoff,
the armed line ("reading face 680…"). The long wait is what made Jeff press
again: a second press waited on the same reading, and both wrote (events 0093
and 0094). The handoff closed the double write (one identity write at a time,
seqs reserved); it did not touch the wait.

Where the time likely goes, unmeasured: `surfaceSiblingsOf` (the face classes
of the whole plate, read before a click is planned), then `nextEventSeq`'s
folder listing, then `publishIdentity`'s served-log rewrite through the folder
grant before the shell is told. A per-step timing of one click on this part is
the first thing to take; the plate is the largest mesh in the pitch linkage.
