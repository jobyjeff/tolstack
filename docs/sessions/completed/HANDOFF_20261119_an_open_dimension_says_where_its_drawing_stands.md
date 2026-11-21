---
priority: high
depends_on: [the_viewer_says_nothing_about_itself]   # chain order: every link ahead edits the viewer's views, the projection builder and the suites
model: opus
hitl: false
---

# HANDOFF 2026-11-19 — an_open_dimension_says_where_its_drawing_stands: every dimension with no value says whether its drawing is already read, read under another dash, or nowhere

Source: burndown #5 (2026-11-19), promoting
`docs/strategy/BRIEF_20260916_drawing_arrival_gap_join.md` ("nothing notices
when a drawing an open gap is waiting on lands in drawing-checker"). The
count that made it urgent: the 11-18 review page
(`docs/sessions/lessons/REVIEW_20261118_the_binding_flow_and_the_pitch_plate.md`,
"So the next step towards the study is acquisition") listed six drawings to
get. Measured 2026-11-19 against drawing-checker's runs
(`C:\workspace\drawing-checker\data\runs\*\*_p01.json` title blocks, 161 run
folders), for v2's 49 dimensions:

| Where the part's drawing stands | Dimensions | Drawings |
|---|---|---|
| Its own drawing has a drawing-checker run | 24 | 213668-002, 214700-002, 214698-002, 214699-002, 214958-002, 213862-002, 212956-005 |
| Only another dash or the base number has a run | 18 | 214373-002, 215175-002, 215177-001, 215071-001, 215735-001 |
| No run anywhere | 5 | 214820-002, 216332-001 |
| No drawing at all (NAS77 bushings: a spec sheet) | 2 | — |

So most of what the page called acquisition is transcription: the drawing is
read, and nothing here says so. tolstack's own copy inbox
(`C:\workspace\tolstack\data\inbox\drawings`) holds 6 PDFs, which is all the
review looked at.

Second-to-last link of the chain; the walk after it reads the result and
brings its "what the end-stop study still needs" table up to date from it.
The model handoffs ahead (links 4 and 5) change v2's parts and dimensions, so
re-count: the table above is the shape, not the numbers to pin.

Baseline: tolstack `master` at `ff72d6a7` plus the handoffs ahead in the
chain. Scope: `scripts/build_topology_projection.py` (beside
`part_drawing_runs`, :1405–1463, which already joins a part to its runs by
strict part number and knows `other_dash_runs`), the projection's schema
docs, the grid row and the Preview pane where a dimension is shown
(`apps/viewer/element_record.js` :107–115 already links a part to its
drawing), tests. Do NOT touch drawing-checker or forge, the copy inbox's
contents, the spec library, any value or citation in the topology JSON (no
dimension is filled by this handoff), or the map's layout.

## Deliverables

1. **One status per open dimension**, in the projection, for every
   structural edge with no `dimension` in every model: `cited` is not open
   and is not listed; the open ones are one of
   - **read**: the part's own drawing number has a drawing-checker run
     (carry the newest run's id and export date);
   - **read under another dash**: only another dash number or the base
     number has a run (carry which);
   - **not read**: the part names a drawing and nothing has a run;
   - **no drawing**: the part has no drawing number (hardware on a spec
     sheet), with the spec the note names if it names one.
   The join is `part_drawing_runs`'s, not a second matcher. A drawing-checker
   data root that is absent or empty reads as unknown, never as "not read"
   (the same three-state rule the repo's spec library keeps).
2. **The rebuild says it.** `scripts/rebuild_projections.ps1`'s summary
   prints one line per model: how many open dimensions are read, read under
   another dash, not read, no drawing.
3. **The page shows it where the dimension is.** A dimension with no value
   wears one short everyday-word chip in the grid row and the Preview
   ("drawing read", "other dash read", "no drawing yet"), and the chip's
   hover or the Preview links straight to that run's page on drawing-checker
   (the link `element_record.js` already builds for a part). No sentence
   explains the chip. A model's header or the Bodies/Parts tree gets nothing
   new.
4. **A list to work from.** The projection carries, per model, the drawings
   that are read and still uncited, each with its count of waiting
   dimensions, sorted by count. The walk prints it; a later authoring
   session transcribes from it.

## Definition of done

- Value-level tests on a fixture with one edge of each status, and one with
  the drawing-checker root absent (every status unknown, nothing claimed).
- `[real]`: v2's counts by status, derived by the test from the same inputs
  (never pinned as literals in prose), and each "read" chip's link resolves
  to an existing run folder.
- Shots of the grid and the Preview with one chip of each kind, read before
  the lesson is written.
- Tiers as `CLAUDE.md`'s table.
- No guard, gate or refusal is added.
- Lesson (`docs/sessions/lessons/LESSONS_20261119_an_open_dimension_says_where_its_drawing_stands.md`):
  the counts per model after the chain's model changes; for the "other dash"
  group, whether the run's sheets visibly dimension this dash (look at one
  per drawing; a question for Jeff where it is unclear); what a transcription
  session should take first.
