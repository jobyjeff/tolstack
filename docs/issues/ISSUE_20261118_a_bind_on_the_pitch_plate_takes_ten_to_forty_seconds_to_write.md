---
type: bug
priority: med
status: triaged
area: annotate / armed pick and Take write path
reporter: agent
found_by: docs/sessions/active/HANDOFF_20261118_a_disagreement_is_settled_by_keep_or_let_go.md
handoff: docs/sessions/HANDOFF_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md
class: annotate_write_latency
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

## Addendum 2026-11-19 (walk `the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page`)

**Keep and Unbind have the same wait, and they show nothing while it runs.**
Measured on the merged page (`integration` `a7a05123`, scratch copy of the
log) at `pitch_plate_215177_001@pitch_plate_link_attach_bore`:

| what | press → event on disk | press → the body changes |
|---|---:|---:|
| Keep on "faces 1380, 1381" | 23 s | about 27 s |
| Unbind (after that Keep) | under 21 s | 21 s |

In that window the only change on the page is the pressed button's focus
ring (shots `02c_keep_just_pressed_crop`, `02e_unbind_1s_crop` in
`docs/sessions/lessons/shots/the_walk_reads_the_binding_flow_and_the_pitch_plate_on_the_merged_page/`).
The armed click got "reading face N…" from the keep-or-let-go handoff; Keep,
Unbind, Take and Take all did not. This wait is what Jeff's "clicking 'keep'
seemed to do nothing" describes: the five Keep events 0096–0100 in his log are
five presses. Smaller parts are faster: 7–14 s to disk and 12–15 s more to the
tree on the pitch arm, blade root and piston parts.

> **Correction, 2026-11-19 (review of the walk).** The sentence "This wait is
> what Jeff's 'clicking keep seemed to do nothing' describes" is the wrong
> cause. Jeff's Keeps 0096–0100 were written by the pre-fix `cmdKeep`, which
> wrote a plain `bound` with no `supersedes` and so could not settle the
> disagreement at any speed (traced in
> `docs/sessions/completed/HANDOFF_20261118_a_disagreement_is_settled_by_keep_or_let_go.md`,
> fixed by it). The latency measured above is still this issue's subject.
