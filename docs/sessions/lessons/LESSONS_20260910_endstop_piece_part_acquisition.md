# Lesson — endstop_piece_part_acquisition (worked 2026-09-10)

Handoff `HANDOFF_20260910_endstop_piece_part_acquisition.md`, branch
`handoff/endstop_piece_part_acquisition`, cut from `integration`. HITL
exception: asked Jeff for the four remaining piece-part drawings and two
bearing spec sheets by their own part/spec numbers. Jeff dropped the files in
immediately (before this session read anything) and added two notes that
shaped the whole session:

- **`215198` is one multi-detail drawing covering both `-001` and `-002`** as
  a mirrored pair, not two separate files. Confirmed on the drawing's own
  sheet 1 note 5.
- **MS14101/MS14103 are catalog sections inside an RBC aerospace plain-bearing
  catalog, not standalone MS spec sheets.** The catalog
  (`RBC_Aerospace_Plain_Bearings_Web.pdf`) was already in the pile; nothing
  new arrived in `data/inbox/specs/` this session.

## Per-row disposition (§11's own table, full reasoning there)

| rows | disposition |
|---|---|
| 42 (tan_link_mount_height) | **traced** — `215198-A.pdf` sh1, `79.00 ±0.10` = exact band match, exact nominal match to the assembly's own reference |
| 34, 36, 50, 54, 56 (spherical bearing size) | **traced** — MS14101-3/MS14103-3 bore, `4.826 mm +0.000/-0.013` = exact band match |
| 31, 52 (pitch/tan link length) | **mismatch** — `213863-004`'s `⌀0.1` true-position callout converts to a 0.10 mm worst-case band vs the workbook's 0.06 mm; identity solid via an exact shared reference dimension, but see F12 below |
| 59 (tan link mount size, mount feature) | **candidate** — a real, named, matching detail (`DETAIL B: TANGENTIAL LINK MOUNT FEATURES`) with several plausible SIZE dimensions and no way to pick one from the sheet |
| 45 (hub top deck to tan link mount) | **still blocked, reasoning refined** — the topology's own edge is entirely hub-side; acquiring the mount never actually closed this row |
| 62 (gas spring bushing position) | **still blocked** — the 2026-09-04 hypothesis (`214723-002`) now has counter-evidence (its bore size matches the tangential-link attachment lug on `215198`, not a gas-spring interface) |

Traced ratio: the SOP's own headline (`debug_report_tolerance_stacks.py
--ratio`) is **unchanged** — 5/26 seeded, 30/59 all stacks, before and after,
because no `stack_*.json` was touched (same as 2026-09-04; this worksheet is
still not a stack, §0's banner). This worksheet's own internal count moves
from 26/43 (60%) `located` to **35/43 (81%)**; `traced` alone from 5/43 (12%)
to **11/43 (26%)**.

## Surprises / decisions not in the handoff

- **A true-position tolerance's worst-case linear equivalent is its own
  diameter, not its radius.** `213863-004`'s `⌀0.1` cylindrical position
  zone bounds the maximum deviation from the basic 61.40 mm distance, in any
  *one* direction, to the zone's radius (0.05 mm) — giving a worst-case
  **total band of 0.10 mm**, numerically equal to the printed diametral value.
  Easy to get backwards (reading `⌀0.1` as itself the total band, or halving
  it twice) — worth stating the reasoning explicitly rather than asserting
  the number, which §11a does.
- **A basic (boxed) dimension with a single-datum position callout is a
  completely legitimate "link length" control** — no printed ± means no
  tolerance was omitted, it means the tolerance lives entirely in the
  position frame on one of the two features. Confirmed by rendering the FCF
  stack at Matrix(14): the position frame's third compartment (the
  referenced datum letter) and the datum-feature flag beneath it are two
  different boxes, not a self-reference — worth a close render before
  concluding a feature references itself.
- **Catalog per-column tolerances can be printed once, in the table header,
  and apply to every dash row below it — never repeated per row.** Both RBC
  DIMENSIONS — TOLERANCES tables (pp.21-22) do this for every column. A
  text-only `--pattern` sweep sees the header tolerance and the dash-row
  values as separate, unlabelled hits; this was only caught by rendering both
  tables as images and reading the header row directly above the `-03` row.
  Recorded in the spec-parse event's own recipe field so a future re-read of
  this catalog doesn't re-discover it the hard way.
- **A bushing's own size didn't confirm the hypothesis that named it — it
  argued against it.** `214723-002`'s bore (`⌀12.320 ±0.015`) sits close to
  `215198`'s DETAIL B housing bore (`⌀12.290 ±0.010`), suggesting a press fit
  at the tangential-link attachment lug, not the gas-spring interface the
  2026-09-04 session hypothesized. Recorded as counter-evidence, not a
  refutation — the proximity is circumstantial, unlike §8a's exact
  `.1900 BORE ID` cross-reference.
- **A topology edge's own node names (`from`/`to`) are the ground truth for
  what a worksheet row actually needs — not the worksheet's own prose
  framing of "spans two owners."** Row 45's topology edge
  (`hub_top_deck_to_tan_link_mount_seat`) runs hub→hub; acquiring the mount's
  drawing this session did not touch its actual blocker (a hub-side identity
  question already listed in §9). Checked the topology JSON directly rather
  than trusting the worksheet's own restated framing, which was written
  before the topology existed in its current shape.
- **Did not update `docs/topologies/topology_pitch_system.json`.** This
  handoff's scope named the worksheet and the spec library, not
  `docs/topologies/`, and one of this session's own findings (F12, the
  109.4 mm vs 61.40 mm nominal disagreement) is a Jeff question that
  shouldn't be silently resolved by editing the topology's stored nominal.
  Filed as `ISSUE_20260910_endstop_topology_retrace_and_link_length_
  discrepancy.md` rather than done inline, unlike the 2026-09-06 precedent
  which did retrace the topology in the same session — that session's own
  findings didn't carry an open Jeff question the way this one's does.
- **Did not add rows to `docs/spec_library/intake_queue.json`.** Same
  reasoning as the 2026-09-04 lesson: MS14101/MS14103 close worksheet rows,
  not a gap in any of the three actual SOP stacks (`pitch_link`, `tan_link`,
  `vpa`) — the queue's `stacks` field and its hardcoded `range(1, 13)` test
  are for that different, narrower set of documents.
- **A duplicate copy of the RBC catalog sits in the pile**
  (`RBC - Plain bearings (NAS77 p92).pdf`) with an apparently-identical MS1410x
  index hit on page 9. Not checked page-for-page against the cited
  `...Web.pdf` copy beyond that — a prior `PROVENANCE.md` entry already notes
  the two editions' page numbers for a *different* table (NAS77/NAS76) diverge
  by five pages, so page numbers should not be assumed to carry across editions
  without checking.

## Drawing-checker read-only invariant

`scripts/snapshot_drawing_checker.py`:

- before (taken at this session's own start, after Jeff had already dropped
  the four drawings in): **5910** entries, `2026-09-10T22:23:10Z`
- after: **5910** entries, `2026-09-10T22:39:07Z`
- **diff: EMPTY** — no entry added, removed or modified. This session's own
  reading activity wrote nothing into drawing-checker's tree; the four
  drawings' own arrival predates this session's snapshot, per Jeff's HITL
  response landing before this session took its first snapshot.

## Verification

- `C:\workspace\tolstack\venv-win\Scripts\python.exe -m pytest -q`:
  **754 passed, 1 skipped** (the pre-existing node-fs viewer skip) — after
  the new spec-parse event, the projection rebuild, the worksheet/README/
  PROVENANCE edits and the two hardcoded-list test files' updates
  (`test_spec_library.py`'s `ALL_EVENT_FILES`/subjects/documents sets plus
  three new value-level tests, `test_spec_library_review.py`'s document-set
  assertion).
- `python -m tolerance_stack --data-root C:\workspace\tolstack\data`: rebuilt
  cleanly, 18 subjects from 6 events (up from 14/5).
- No `ARCHITECTURE.md` module-inventory row needed — no new module, only one
  data file and worksheet/doc prose.

## Left for the next session

- `ISSUE_20260910_endstop_topology_retrace_and_link_length_discrepancy.md`:
  retrace `topology_pitch_system.json`'s `tan_link_mount_height` and
  `pitch_link_length` edges against this session's findings, and resolve
  (with Jeff) whether `pitch_link_length`'s 109.4 mm nominal or
  `213863-004`'s 61.40 mm basic dimension is the one describing the real
  part.
- Row 45 needs the hub-side identity question (§9's `hub_lower_to_top_
  bearing_flange`/`hub_top_flange_to_top_deck` candidates) resolved before it
  can close — unrelated to any further acquisition.
- Row 59 needs either the workbook's own row-59 comment (if one exists and
  names the feature more specifically) or a second look at which of DETAIL
  B's several size dimensions is meant.
- Row 62's owner is now weaker, not stronger, than the 2026-09-04 hypothesis
  — worth a fresh look at what actually is at the gas-spring/pitch-plate
  interface rather than continuing to test `214723-002` against it.
