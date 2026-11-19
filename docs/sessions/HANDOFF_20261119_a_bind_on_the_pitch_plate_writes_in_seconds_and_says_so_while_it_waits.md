---
priority: med
depends_on: [the_map_pin_hover_lights_its_bound_face_in_the_scene]   # both may edit the pane's shell<->scene path (apps/annotate/app.js, apps/viewer/topology_app.js) and scripts/run_viewer_browser_tests.mjs; the map-pin fix is an open diagnosis, so land it first rather than merge two edits to the same path blind
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits: find where a bind, Keep or Unbind spends 10–40 s, cut it, and show that the press took

Source: triage sweep 2026-11-19, routing
`docs/issues/ISSUE_20261118_a_bind_on_the_pitch_plate_takes_ten_to_forty_seconds_to_write.md`
(med; measured twice, on a branch and on the merged page). Baseline: trunk
`a0c7cc58` plus the merged `the_map_pin_hover_lights_its_bound_face_in_the_scene`.
Scope: `apps/annotate/` (write path), the feature body in `apps/viewer/views/nav.js`
and the shell glue in `apps/viewer/topology_app.js`, their fast-tier tests, the
matching browser suite in `scripts/run_viewer_browser_tests.mjs`, and
`docs/ANNOTATION_SURFACE.md` if a behaviour sentence changes. Do NOT touch the
map (`apps/viewer/map.js`) or the scene's hover-wash path the map-pin handoff
owns, and do not touch `scripts/propose_bindings.py`.

**Jeff's real log is read-only.** `C:\workspace\tolstack\data\inbox\feature-identity\`
holds 101 files at 11-19 (events through `0100_…`). Every measurement runs on a
scratch copy of it (a `--data-root` scratch root built from the worktree's own
scripts; no `git init` inside it, so it stays deletable). Count the real
folder's files before and after and put both counts in the lesson.

## What is measured (from the issue)

On `pitch_plate_215177_001` (mesh `37e9f606…`, the largest mesh in the pitch
linkage), with `tests/debug_keep_or_let_go_20261118.mjs` and on the merged page
(`integration` `a7a05123`, scratch root):

| press | press → event on disk | event or press → the tree's body changes |
|---|---:|---:|
| armed click (branch) | 7.7 s, 10.9 s | about 5 s |
| armed click (integration's pane) | 12.6 s, 34.2 s, 40.6 s | not measured |
| Keep on "faces 1380, 1381" | 23 s | about 27 s |
| Unbind after that Keep | under 21 s | 21 s |

Smaller parts (pitch arm, blade root, piston parts): 7–14 s to disk, then
12–15 s more to the tree. During the wait the only visible change is the
pressed button's focus ring. The armed click shows "reading face N…"
(`apps/annotate/sweep.js`, the `reading` string); Keep, Unbind and Take show
nothing. The double-write that a second press caused is already closed (one
identity write at a time, seqs reserved, by
`a_disagreement_is_settled_by_keep_or_let_go`). Note the issue's own
correction: Jeff's "Keep seemed to do nothing" on 11-18 was the pre-fix
`cmdKeep`, not this wait, so this handoff is about the wait alone.

## Deliverables

1. **A per-step timing of one press, before any change.** Instrument one armed
   click and one Keep on `pitch_plate_215177_001@pitch_plate_link_attach_bore`
   (scratch log). Time each step the issue suspects, and anything else on the
   path: `surfaceSiblingsOf` (`apps/annotate/app.js` ~1242, the face classes of
   the whole plate, read before a click is planned), `nextEventSeq` (~6545, the
   folder listing), the event write itself, `publishIdentity` (~6733, the
   served-log rewrite through the folder grant), and the shell's re-read after
   the pane tells it. Put the table in the lesson. The suspects are
   unmeasured; trust the table, not the list.
2. **Cut the dominant step(s).** The direction is the table's. Suggestions to
   investigate, not requirements: cache a mesh's face classes once per loaded
   mesh rather than per click; keep the seq counter in memory after the first
   listing (reservation already exists); tell the shell the new event directly
   rather than having it re-read the whole served log. Whatever you change,
   the append-only, one-file-per-event and never-two-writes rules
   (`data/inbox/feature-identity/README.md`) hold unchanged. Target, stated as
   a target: press → event on disk under 3 s on the pitch plate, and the body
   changes within 1 s of the write. If a step cannot get there, say why in the
   lesson with its number.
3. **Every write press says it took, at once.** Take, Take all, Keep, Unbind
   and the armed click each show a pending state on the pressed control
   within one frame (the armed click's "reading face N…" is the existing
   pattern to extend; word it the same way and put the word in the same
   table), the control is disabled until the write lands or fails, and a
   failure names itself in the same place. Sites this fact reaches: the
   feature body's rows in the shell nav, the pane's own candidate rows, and
   the opposite-pattern / group offer bar. Say in the lesson which of these
   you deliberately leave alone, if any.
4. **Pin it.** A fast-tier check that a press puts the control into its
   pending state before the write resolves (stub writer that never resolves).
   A browser `[real]` timing line for the pitch-plate press, printed, never a
   wall-clock assertion (the tier runs under load). Any new guard gets its
   witness spec in the same change, per `CLAUDE.md`.

## Definition of done

- On the served page (drawing-checker's mount at 8000, or the 8843 fallback,
  scratch log), a Keep on the pitch plate link bore shows its pending word at
  once and the body changes within the measured new time; before/after table
  in the lesson, with shots of the pending state.
- `node apps/viewer/run_tests.cjs`, `node apps/annotate/run_tests.cjs`,
  `pytest -q` green; the touched browser suites green on `--only`, and the
  whole tier once with its ledger row cited.
- The issue gets a verified `resolution:` naming the before/after numbers.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits.md`):
  the per-step table, what was cut and why, the real log's file count before
  and after.
