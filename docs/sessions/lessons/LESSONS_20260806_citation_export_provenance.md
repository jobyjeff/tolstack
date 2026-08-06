# LESSONS 2026-08-06 — citation_export_provenance

Handoff: `docs/sessions/active/HANDOFF_20260806_citation_export_provenance.md`.
Baseline `master` @ `0a08496` (the handoff's `de7f7f1` plus the board move).

## The one-line rule the SOP now states

> **Every `drawing`/`parts_list` citation carries `source_ref.export`, and the
> export's identity is its `sha256` — not its filename, not a run id. If you
> cannot establish which export you read, write `status: "unestablished"` with a
> `why`, never a plausible run.**

Enforced in three places (SOP Step 2 prose, `SourceExport`'s docstring +
`__post_init__`, `tests/test_tolerance_stack.py`), and the crop script re-checks
independently because it reads raw JSON and never the dataclass.

## Result

| | before | after |
|---|---|---|
| resolved / citations | 6 / 48 | **24 / 48** |
| `source_ref_export` | — | 24 |
| `joint_export_run` | 2 | 0 |
| `spec_pile` | 3 | 0 |
| `provenance.sources_used` | 1 | rule removed |
| `sha256_verified` true | **2** | **24** |
| unverified | 4 | 0 |

Recomputed from `data/projections/viewer/crops.json` both times, not quoted from
the issue. Attribution, row by row — **no rule was relaxed; the prose rule was
deleted**, so every increase is a newly named export:

| stack:element | before | after | why it changed |
|---|---|---|---|
| `pitch_link:bushing_214820` | `joint_export_run`, sha ✓ | `source_ref_export`, sha ✓ | same export, now structured per-citation |
| `pitch_link:washer_nas1149v0332` | `joint_export_run`, sha ✓ | `source_ref_export`, sha ✓ | same export, now structured |
| `pitch_link:pitch_plate_flange` | `provenance.sources_used`, **unverified** | `source_ref_export`, sha ✓ | same file, now sha-checked instead of regexed out of prose |
| `pitch_link:bolt_grip_11` | `spec_pile`, unverified | `source_ref_export`, sha ✓ | same file, gained a sha |
| `pitch_link:bolt_length_11` | `spec_pile`, unverified | `source_ref_export`, sha ✓ | same file, gained a sha |
| `pitch_link:cotter_hole_from_point` | `spec_pile`, unverified | `source_ref_export`, sha ✓ | same file, gained a sha |
| `tan_link:straight_bushing` | unresolvable | resolved, sha ✓ | **newly named export** (JUL-23 POST) |
| `tan_link:pitch_plate_flange` | unresolvable | resolved, sha ✓ | **newly named export** (215197 fixture) |
| `tan_link:fastener_grip_14` | unresolvable | resolved, sha ✓ | **newly named export** (JUL-23 POST) |
| `vpa:pitch_flange_thickness` | unresolvable | resolved, sha ✓ | **newly named export** (215197 fixture) |
| `vpa:under_head_chamfer_washer` | unresolvable | resolved, sha ✓ | **newly named export** (JUL-23 POST) |
| `vpa:fastener_grip` | unresolvable | resolved, sha ✓ | **newly named export** (JUL-23 POST) |
| `thermal_m1` × 4, `thermal_m2` × 8 | unresolvable | resolved, sha ✓ | **newly named exports** (the five part drawings) |

Still unresolvable, 24: 22 `kind: "workbook"`, 1 `"assumed"`, and
`tan_link:fastener_grip_13` — whose export **is** established but whose citation
names no sheet, so there is no page to crop. Its reason changed from "citation
names no export" to "source_ref names no sheet", which is the honest one.

25 citations were backfilled and 24 resolved: that gap is `fastener_grip_13`, not
a failure.

## Which exports were established, and how

Nothing needed the `unestablished` escape hatch. That surprised me — I built the
status expecting a third of the backfill to land there — and the reason is the
next section. All four chains, with the evidence, are in each export's `note`
field in the stack JSON; the run ids and timestamps I relied on:

| export | sha256 (12) | established by |
|---|---|---|
| `[PRELIM 2026-AUG-3] 217755 A.1 …pdf` | `c6381f204582` | `run_meta.json` **and** `runs.jsonl` for runs `20260803_145243` (ts `2026-08-03T21:53:01Z`) and `20260804_114000` (ts `2026-08-04T18:40:27Z`); already named in prose by `joint.assembly_export` |
| `[2026-JUL-23 POST] 217755 A.1 …pdf` | `d0f1b50fa069` | run `20260723_163810` (ts `2026-07-23T16:38:10Z`), named by `hardware_entries.json`'s `provenance.parts_list_run`; that run's own `217755_A_balloons.json` records `source_pdf` = this filename; `runs.jsonl` records the sha. Corroborated independently by both slice-1 stacks' `joint.zone_note`, which say the cited zones are the ones printed on the 2026-JUL-23 POST export |
| `[PRELIM 2025-MAY-22] 215197 A.1.pdf` | `3716251bab26` | the **only** 215197 export in the workspace's recorded history: runs `20260409_170546`, `20260409_172341`, `20260730_133912` (ts `2026-07-30T20:39:33Z`) all record this same sha; `215197_A_p01.json` records the filename |
| the five hub-bearing part drawings | see `PROVENANCE.md` | `data/inbox/drawings/PROVENANCE.md` recorded each sha256 when `hub_bearing_thermal_stack` copied the file in on 2026-08-05, and each file still hashes to it. `runs: []` — **no drawing-checker run has ever consumed any of them** |
| `data/inbox/specs/NAS6403-NAS6420 Rev 4.pdf` | `24276f73d4e4` | append-only pile, so the filename was already the bytes; sha computed 2026-08-06 and recorded so a re-drop under the same name cannot be substituted |

drawing-checker was read strictly read-only: `data/runs.jsonl`, `data/runs/*/run_meta.json`,
`data/runs/*/\*.json` (for `source_pdf`), `data/inbox/drawings/`,
`tests/fixtures/drawings/`, and `scripts/reconcile_run_log.py` (to learn what
`backfilled: true` means). Nothing written, no pipeline run.

## What the next agent could not derive from the code

**1. `data/runs.jsonl` is where pre-`20260730_161157` run provenance lives, not
`run_meta.json`.** This is the single fact that unblocked the whole backfill, and
nothing in either repo says it. `pdf_from_run()` reads `run_meta.json`'s `inputs`
— and only the last **five** run dirs have that key. Every earlier run, including
slice 1's `20260723_163810`, has a four-key `run_meta.json` with no inputs at all,
while `runs.jsonl` carries path + sha256 for them. I nearly concluded slice 1's
export was unestablishable on the strength of the run dir alone. **If you are
asking "what did this run consume", read the log, not the dir.**

`build_viewer_crops.py` was deliberately *not* extended to consult `runs.jsonl`:
after the backfill no citation reaches the `joint.assembly_export` rule, so it
would be unexercised code. If a future stack needs the legacy rule against an
old run, that is the change to make.

**2. A `backfilled: true` run-log row is stronger than it sounds.** It means
`scripts/reconcile_run_log.py` reconstructed the row later — but its
`find_source_pdf()` prefers the `source_pdf` field recorded *inside* the run's own
artifacts, which the run wrote at the time. So the filename is contemporaneous;
only the sha was computed at reconcile time. I checked the artifacts directly
rather than trusting the row, and the file's mtime (unchanged since the run)
closes the chain. Worth doing again rather than assuming either way.

**3. Every drawing citation in the repo turned out to be establishable, because
the authors already wrote the export down — in prose, in a field nothing reads.**
The thermal-stack element notes each say "Read on `data/inbox/drawings/<file>.pdf`";
`tan_link:pitch_plate_flange`'s note names "the [PRELIM 2025-MAY-22] fixture"; the
`zone_note`s name the export the zone was printed on. The information was never
missing — it was *unstructured*, so no tool could use it and no test could demand
it. That reframes the defect: this was not a tracing failure, it was a schema
failure. Which is why the fix that mattered was the mandatory field plus its test,
not the backfill.

**4. tolstack has its own `data/inbox/drawings/`, created 2026-08-05, and it is
where a part drawing a stack cites should live.** I initially read the thermal
stacks' `data/inbox/drawings/212966-006-A.pdf` as an ambiguous reference to
drawing-checker's identically-named directory. It is not: `hub_bearing_thermal_stack`
copied the PDFs in and recorded the shas in a tracked `PROVENANCE.md`. That file
is why the thermal backfill took minutes. Step 3 of the SOP now states the copy
rule, since it was only recorded in the data dir's own README.

## Decisions I made that the handoff left open

- **`export` is a sibling of `element_id`/`run_id`, not a filling-in of them.**
  The handoff asked me to decide and record. `run_id` in that slot means "the run
  that produced the extracted element" — paired with `element_id`, part of the
  feature-identity story. An export is "the bytes a human read", a different
  claim; it maps to several runs (`[PRELIM 2026-AUG-3]` feeds two) or to none (all
  five part drawings), so a scalar run id cannot be its identity; and filling
  `run_id` would destroy the "not yet wired" vs "wired to nothing" signal
  `test_source_ref_leaves_the_feature_identity_slot_open_and_empty` exists to
  give. There is now a test asserting exactly this non-decision, so the next agent
  reading "the slot nothing fills" does not fill it with an export.
- **`sha256` is mandatory on an established export**, and a filename alone is
  refused with a specific reason. Jeff re-exports over the same name, so a
  filename-only export is the guess this handoff exists to prevent, one step
  removed.
- **The `provenance.sources_used` prose scan was deleted, not kept as a
  last-resort rule.** It resolved one crop, could not sha-verify it, and landed on
  a fixture copy of 215197 rather than the export the stack meant. A test asserts
  the two functions are gone, so it cannot quietly return.
- **`joint.assembly_export` (free text) is kept** as a legacy fallback, though no
  citation reaches it now. Removing it would be a second change with no benefit;
  the docstring says it is superseded.
- **The `spec` kind is exempt** from the mandatory-export test — the pile is
  append-only, so a filename is bytes. `pitch_link`'s three spec citations got
  exports anyway, purely to bring `sha256_verified` to 24 of 24.
- I did **not** touch any `confidence` label (`traced_labels_and_ratio` owns
  those), `scripts/build_viewer_projection.py`, or `apps/viewer/`.

## Left to do

- **`apps/viewer/` labels the wrong rules.** Filed as
  `docs/issues/ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule.md`.
  `viewer.js` has a branch for `provenance.sources_used` (now impossible) and none
  for `source_ref_export`, so the one fact worth showing — sha256-verified against
  the named export — is not shown. `fixtures.js`/`tests.js` also pin the dead
  rule's string, so the JS suite passes while asserting stale behaviour.
- **The four slice-1 217755 crops land on `sheet_full`**, because a parts-list
  citation carries no zone and the callout needle matched zero or many places.
  They resolve honestly now; making them *useful* means locating a balloon, which
  is a different job.
- **22 `kind: "workbook"` citations still name no document at all** — the known,
  separate problem this handoff did not touch. It is now the entire remaining
  unresolvable population bar two, so it is the next thing worth attacking if crop
  coverage is the goal.
- `tan_link:fastener_grip_13` needs a sheet, not an export. It is a parts-list
  row present at qty 3 with no balloon on any sheet, so there may be no honest
  sheet to give it.
