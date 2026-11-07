---
priority: high
depends_on: []
model: sonnet
hitl: false
---

# HANDOFF 2026-11-06 — annotator_event_files_number_from_the_folder: a new annotator session never reuses an event filename

Source: `docs/issues/ISSUE_20261105_every_annotator_session_numbers_its_event_files_from_0001.md`
(high), routed by the 2026-11-06 triage sweep. Baseline: tolstack master `15dae286`. Scope:
`apps/annotate/binding_state.js` (`AA.nextEventFilename`), `apps/annotate/app.js`
(`existingEventFilenames`), and their tests. Do NOT touch the event files already in
`C:\workspace\tolstack\data\inbox\feature-identity\`. They are append-only, their `seq` is
right, and only their prefix is wrong. Do NOT touch `apps/annotate/run_browser_check.mjs`.
`the_annotate_pacing_checks_step_a_virtual_clock` owns it.

## Why

`AA.nextEventFilename` takes the highest `^\d{4}_` prefix among the names it is given. Those
names are the projection's `built_from_events`, which are **event ids**
(`proposal-0001-pitch_link_length-from`, …) and not filenames, plus this session's ids. Nothing
matches, so every session starts at `0001_`. Measured 2026-11-05: Jeff's four bindings that
afternoon were written as `0001_…_accepted.json` to `0004_…`, with `seq` 56 and up, into an
inbox that already held `0001_…_proposed.json` to `0062_…`. A later session that answers the
same end writes the same full filename again, which either overwrites an append-only event or
fails the write.

## Deliverables

1. **Number from what is really there.** Decision (triage's): number from `max(seq) + 1`
   across the projection's events and this session's, padded as today, because `seq` is the
   value the four mis-prefixed files got right. The rejected alternative is to number from the
   folder's real filenames. A served page cannot list that folder, and the four bad prefixes
   would poison it. If `seq` is not reachable from the page, say so in the lesson and use the
   filenames.
2. **A write never overwrites.** If the server-side writer can see that the target filename
   exists, it bumps the number rather than overwriting. Check how the write happens first
   (the served pane's bind-folder path). If the page cannot see the folder, add the bump where
   the write is done.
3. **Tests:** a projection whose `built_from_events` are ids still yields the next number;
   two sessions answering the same end produce two distinct filenames.

## Definition of done

- Default, viewer and annotate tiers green per CLAUDE.md, plus the witness tier
  `--changed-since master` for any spec you add.
- One real bind in the served annotator (port 8000) writes a file numbered after the inbox's
  highest. Quote the filename in the lesson. Write to a scratch copy of the inbox if the page
  allows a folder choice; otherwise write the one real event and name it.
- Lesson (`docs/sessions/lessons/LESSONS_20261106_annotator_event_files_number_from_the_folder.md`).
