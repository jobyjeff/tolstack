---
type: bug
priority: low
status: resolved
area: apps/viewer
reporter: agent
found_by: docs/sessions/reviews/REVIEW_20260915_viewer_reference_crops_in_context.md
handoff: docs/sessions/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `reader_facing_copy_and_vocabulary` moved to completed/; not independently verified.
---

# The crop link stopped saying "open run"; the same pane still prints three bare run ids as link text

`viewer_reference_crops_in_context` renamed the crop's click-through from *"open
run in drawing-checker"* to the drawing's own number and revision, with the
reason written into `views/crop.js`: *"a run is an internal artifact, and its id
told a reader nothing about which drawing they were about to open."*

Two inches above that link, in the same pane, `VA.exportRunsLine`
(`apps/viewer/views/detail.js:134`) still renders

> drawing-checker runs: **20260723_163810**, 20260727_153847, 20260730_131903,
> 20260730_132230

with the first as an `<a>` whose text is the raw run id. Measured in a real
browser on 2026-09-16, served mode, `tan_link_to_pitch_plate:straight_bushing`.

This is **pre-existing and outside the handoff's scope** (it scoped itself to
`scripts/build_viewer_crops.py` and the crop-rendering paths), which is why it is
filed rather than fixed. It is worth filing because the handoff's own argument
now applies to a surface it did not touch, and because the guard that would be
expected to catch it cannot: `tests.js`'s `BANNED_IN_RENDERED_TEXT` lists
`sha256`, `source_ref`, `crop_key`, `crops.json`, `C:/`, `C:\`,
`build_viewer_crops.py`, `venv-win` — no run-id shape, and the `[real]` internal-id
walk checks each topology's own ids, not drawing-checker's.

Two honest readings, and the choice is a design call rather than an obvious fix:
a run id genuinely **is** the address of the thing the link opens (the code
comment says so, and says why the unlinked ones are unlinked), so this may be the
one place an internal id earns its place. If it stays, the guard's list should
say so out loud; if it goes, the line wants the same treatment the crop link got
— name the drawing and the date, keep the id on the `title`.
