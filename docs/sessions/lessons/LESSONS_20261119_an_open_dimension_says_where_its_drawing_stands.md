# LESSONS 2026-11-19 — an_open_dimension_says_where_its_drawing_stands

## What shipped

- `scripts/build_topology_projection.py`: every edge carries `drawing_status`
  (`DRAWING_STATUS_FIELDS`: `status, drawing, run, spec`), `null` unless it is a
  structural edge with no `dimension`. The word is one of `DRAWING_STATUSES`
  (`read`, `other_dash_read`, `not_read`, `no_drawing`, `unknown`), read off the
  part's own `drawing_runs` / `other_dash_runs` -- `part_drawing_runs` is the
  only matcher. Each model also carries `drawing_status_counts` (every word
  present) and `drawings_read_uncited` (one row per drawing whose open
  dimensions are `read`: newest run, parts, edges, `waiting`, most first).
- `unknown` is what an empty run listing gives (no drawing-checker root, a
  root with no runs dir, or no run with a page 1): never `not_read`, and it
  applies to `no_drawing` parts too, as the handoff's "every status unknown"
  asked.
- `scripts/rebuild_projections.ps1` prints `==> open dimensions, by where their
  drawing stands`, one line per model, iterating the counts object's own keys
  (no word list restated in PowerShell).
- The page: `VA.DRAWING_STATUSES` (generated vocabulary + JS words) and
  `VA.drawingStatusChip`. The grid row puts the chip in the nominal cell (the
  cell drops `num`, so the words are body type, not monospace; the derived
  row's italics are switched off; it overflows the empty min/max). The
  Preview puts it last among the chips. `read` / `other_dash_read` chips are
  `<a>` to the run (`VA.runUrl`, new tab, the same hover line as the part
  link); the others are spans whose hover is the spec, else the drawing number.
  `unknown` draws nothing. Nothing new on a model header or the tree.

## Decisions not in the handoff

- **"The spec the note names" is read off a citation, not the note.** The
  part notes are prose ("Value to come from MS14101-3's datasheet..."), and
  this repo does not scrape prose. `part_spec` takes the first `spec`-kind
  `source_ref.document` among the part's own valued edges -- the same rows
  `VA.partReferences` reads. Consequence: on v2 no `no_drawing` part has one
  yet (none of the races, bushings or bolts has a cited row there), so every v2
  "spec sheet" chip has no hover; on v1 the bearings and the bolt do
  (`RBC_Aerospace_Plain_Bearings_Web.pdf`, `NAS6403-NAS6420 Rev 4.pdf`).
- **Chip words**: `drawing read`, `other dash read`, `no drawing yet` (the
  handoff's three) and `spec sheet` for `no_drawing` -- "no drawing" beside
  "no drawing yet" read as the same thing twice.
- **Only `read` drawings go on the to-transcribe list.** An other-dash run
  needs the judgement below before anyone transcribes from it.
- The Preview still says `DERIVED — the quantity a study computes` and "A
  study computes it..." on every open structural dimension. Already filed and
  deferred: `ISSUE_20260930_a_valueless_structural_edge_is_invisible_to_the_gap_list.md`
  (its line 90 names that chip). Not refiled; the new chip now sits beside it
  and says what is actually true.

## Counts per model, after the chain's model changes (2026-11-20)

Read off the rebuild, drawing-checker at `C:\workspace\drawing-checker`:

| model | read | other dash read | not read | no drawing | unknown |
|---|---:|---:|---:|---:|---:|
| `vpa_end_stop_v2` | 25 | 20 | 8 | 22 | 0 |
| `vpa_pitch_linkage` | 3 | 8 | 1 | 6 | 0 |

(Not pinned anywhere as literals; the `[real]` test re-derives v2's from the
same inputs.) v2 grew from the handoff's 49 to 75 open dimensions: the bearing
races, the plate's bushings and bolts arrived with the links ahead.

## What a transcription session should take first

v2's `drawings_read_uncited`, most waiting first: **213668-002** gas-spring
mount (7), **214700-002** piston body (6), then 214698-002, 214699-002,
214958-002 (3 each), then 212956-005, 213862-002, 213863-004 (1 each). 213668
and 214700 together close 13 of the 25.

## The "other dash" group -- does the run's sheet dimension this dash?

One run per drawing, read off its extracted text (title block, notes, parts
list), not its images:

| part (model's number) | run read | what the sheet is | verdict |
|---|---|---|---|
| pitch arm 215071-001 | 215071 rev C, 3 pages | the part drawing; note: "used with model 215071-001 and mirror component 215071-002" | dimensions this dash -- transcribable |
| pitch plate 215735-001 | 215735 rev A, 2 pages | the part drawing; note: "controlled by associated 3D definition 215735-001 and (mirror...)" | dimensions this dash -- transcribable |
| hub 214373-002 | 214373-003 rev A, 2 pages | the hub **assembly** | unclear: whether the assembly sheets carry the -002 hub's own dimensions is a question for Jeff |
| tangential link mount 215175-002 | 215175 rev A, 1 page | the mount **assembly**; its finds are 215198-001 / -002, the machined mounts (CW / CCW) | unclear, and likely not: the machined geometry is probably on 215198, which the model does not name |

The two unclear rows and the not-read drawings went on the existing
`ISSUE_20261113_five_end_stop_parts_have_no_drawing_checker_run_of_their_own.md`
as a dated addendum (that issue already carries Jeff's export ask). Whether
the tangential link mount part should be 215198-00x rather than 215175-002 is
a model question for the walk.

## Shots (read before writing this)

`shots/an_open_dimension_says_where_its_drawing_stands/`, from
`node tests/debug_open_dimension_drawing_status_20261120.mjs --repo <scratch root>`
(2560x1440): `0N_<status>_grid.png` and `0N_<status>_preview.png` for read,
other dash read, not read and spec sheet, plus `00_page.png`. The probe also
prints that the grid draws 75 chips for v2's 75 open dimensions, each link's
href, and that the page logged no errors. First pass showed the grid chip in
monospace italics (the `num` cell and the derived row); fixed before the
second pass.

## Environment notes

- `tests/debug_part_drawing_links_20261113.mjs` waits for `svg.tv__rails`,
  which no longer exists (rails retired 2026-11-17), and the grid is not
  inside `#topopane`; the new probe waits for `tr.tvrow`.
- A `cat > file` with no heredoc as the first command of a Bash call blocks on
  stdin until the 2-minute timeout -- that cost one background task.
- The witness spec I patched by string replace got a raw newline inside a JSON
  string; regenerating it through `json.dumps` fixed it.

## The test record

Scratch root `C:/workspace/tolstack/data/scratch/odd_1120`: copies of the main
checkout's `data/inbox`, `data/meshes`, `data/projections`, every viewer
projection then rebuilt from this branch's clean tree (topology, results, part
names, crops, feature identity, fits, contact suggestions, kinematic), `docs`
junctioned to this worktree for the worksheet checks. Removed at the end.

| command | where | result |
|---|---|---|
| `node apps/viewer/run_tests.cjs` | worktree | 523/523, node-fs tier skipped (no projection in a worktree) |
| `node apps/viewer/run_tests.cjs --repo <scratch root>` | worktree | **623/623**, `[real]` armed and paired with this tree |
| `node apps/annotate/run_tests.cjs` | worktree | 333/333 |
| witness `--only` the three new fast specs | worktree | 7/7 mutations WITNESSED |
| `C:/workspace/tolstack/venv-win/Scripts/python.exe -X utf8 -m pytest -q -p no:cacheprovider` | worktree | **2 failed, 2585 passed, 1 skipped, 4 deselected in 530s** (ledger: inside budget) |

The two failures: `tests/test_viewer_js_suite.py::test_viewer_js_suite_is_green`
(the deliberate worktree red; the same tier is 623/623 against the scratch
root), and `tests/test_export_runs_match_the_run_log.py` -- drawing-checker
gained a sixth run of the gas-spring mount export on 2026-11-19 that v1's
citations do not list. Live data, not this branch, and already filed on
integration as `ISSUE_20261119_the_gas_spring_mount_export_has_a_sixth_run_the_pitch_linkage_topology_does_not_list.md`.

An earlier full run also caught two of mine, fixed here: an unpinned
"every"/"two" in the ARCHITECTURE inventory row, and the two-body rows
projection literal in `tests.js` (`RACE_ROWS_PROJECTION`, held to the
builder's output by `tests/test_topology_map.py`), regenerated from
`project_topology`.

No browser suite was added or changed, so no browser `--only` run; the whole
browser tier and the witness `--changed-since` gate are the review's.
