---
type: bug
priority: high
status: resolved
area: stack definitions / provenance
reporter: agent
handoff: docs/sessions/HANDOFF_20260806_citation_export_provenance.md
---

# The three slice-1 stacks name no export, so not one of their citations can be re-found

`scripts/build_viewer_crops.py` resolves 6 of 32 element citations. All six are
in `stack_pitch_link_to_pitch_plate.json`. The other three stacks resolve
**zero**, and 7 of their failures are the same root cause:

```
tan_link_to_pitch_plate:straight_bushing        citation names no export, ...
tan_link_to_pitch_plate:pitch_plate_flange      citation names no export, ...
tan_link_to_pitch_plate:fastener_grip_13        citation names no export, ...
tan_link_to_pitch_plate:fastener_grip_14        citation names no export, ...
vpa_output_to_pitch_plate:pitch_flange_thickness    citation names no export, ...
vpa_output_to_pitch_plate:under_head_chamfer_washer citation names no export, ...
vpa_output_to_pitch_plate:fastener_grip         citation names no export, ...
```

(The remaining 19 are `kind: "workbook"` (18) or `"assumed"` (1) — those name no
drawing at all, which is a different and already-known problem. 7 + 19 = the 26
unresolvable of 32. The session lesson's table has the same split.)

## Why it matters

These citations look complete: `{"kind": "drawing", "document": "215197",
"sheet": 2, "zone": "B4", "view": "SECTION A-A", "confidence": "traced"}`. But
`217755` and `215197` each have **several exports on disk** (drawing-checker
holds 20+ runs of 217755 alone), and a printed zone is **not stable between
exports of the same revision** — the pitch-link lesson recorded DETAIL B moving
`I6 → H3` between two exports of 217755 rev A.1. So "sheet 2, zone B4" identifies
a location on *some* PDF, and nothing in the file says which. A tool cannot
re-find the value, and neither can a human without guessing.

`stack_pitch_link_to_pitch_plate.json` is the only stack that fixes this, with a
stack-level field:

```json
"joint": {
  "assembly_export": "[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf (drawing-checker run 20260804_114000 / 20260803_145243)"
}
```

That one line is why **2** of the six crops resolve, and those two are the only
ones sha256-verified against the run's `run_meta.json`. The other four come from
weaker rules and carry no sha check: 3 from the spec pile by filename, and 1
(`pitch_plate_flange`, the best demo crop) from the `provenance.sources_used`
prose scan — which here lands on a copy of 215197 under drawing-checker's
`tests/fixtures/drawings/`, not the inbox. It is a free-text field the crop
script has to regex run ids out of, which is itself worth tightening.

*(Counts corrected during `review/stack_viewer_v0`, 2026-08-06, by recomputing
`resolved_by` from `crops.json`: `joint_export_run` 2, `spec_pile` 3,
`provenance.sources_used` 1; `sha256_verified` true on 2 of 6. The original text
read "6 of their failures", "the remaining 20", and "why six crops resolve,
sha256-verified", which overstated both the reach of `assembly_export` and the
sha256 coverage.)*

## Suggested fix

1. Backfill `joint.assembly_export` on the three slice-1 stacks — **only if it
   can be established which export was actually read**. Slice 1 worked from
   `20260723_163810` per `hardware_entries.json`'s `provenance.parts_list_run`,
   which is evidence for `tan_link` but should be confirmed, not assumed. If it
   cannot be established, say so in the stack rather than naming a plausible run:
   an unresolvable citation is honest, a wrong one is not.
2. Make the field **structured** rather than a sentence — e.g.
   `"export": {"pdf": "...", "sha256": "...", "runs": ["20260804_114000"]}` —
   and per-`source_ref` rather than per-stack, since one stack legitimately cites
   several documents (the pitch-link stack cites 217755, 215197 and a spec, and
   only 217755 is covered by its `joint` block; 215197 resolves only via the
   looser `provenance.sources_used` fallback).
3. Longer term this is the `source_ref.element_id` / `run_id` slot that
   `stack.py` already holds open and nothing fills — see the session lesson.

Found by handoff `stack_viewer_v0`, 2026-08-05. Do not "fix" this by loosening
the crop script's resolution rules: guessing an export renders a crop of the
wrong revision's geometry and looks perfectly correct on screen.

## Update 2026-08-06 — it is not a slice-1 problem, it is the default

`hub_bearing_thermal_stack` landed on `master` during `review/stack_viewer_v0`,
adding two stacks written *fresh* — and rebuilding the crop projection on the
merged tree shows they inherit the same failure:

```
hub_bearing_thermal_fit_m2:hub_bore_upper     citation names no export, ... no PDF for '212966-006'
hub_bearing_thermal_fit_m1:sleeve_bore_upper  citation names no export, ... no PDF for '214959-002'
hub_bearing_thermal_fit_m1:bearing_od_lower   citation names no export, ... no PDF for '214589-002'
```

The drawings are real and present (they were dropped into drawing-checker's
`data/inbox/drawings/` on 2026-08-05), and the citations name sheet and drawing
number — but again nothing names *which export*. So this is not three legacy
imported stacks carrying a legacy defect: it is what the SOP currently produces
by default, and `stack_pitch_link_to_pitch_plate.json`'s `joint.assembly_export`
remains the only counter-example in the repo. Overall: **6 of 48** element
citations now resolve, all six still in that one stack. Raising the priority of
the SOP-side fix (suggestion 2 above: make the export a structured, per-`source_ref`
field) accordingly.

## Resolved 2026-08-06 — handoff `citation_export_provenance`

Suggestion 2 shipped as `SourceExport` (`tolerance_stack/stack.py`): a per-citation
`source_ref.export` whose identity is `sha256`, not the filename and not a run id.
All 25 `drawing`/`parts_list` citations across the five stacks were backfilled and
**every one was established from a record**, so nothing needed the
`status: "unestablished"` escape hatch the schema provides. Crop projection:
**6 of 48 → 24 of 48**, `sha256_verified` **2 → 24**, all 24 by the new rule.

Two things the suggestions above got wrong, worth recording:

- Suggestion 1 assumed `20260723_163810` was only *evidence* for `tan_link`.
  It is confirmable: that run's own `217755_A_balloons.json` records
  `source_pdf: "[2026-JUL-23 POST] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf"`,
  written by the run itself, and `drawing-checker/data/runs.jsonl` records the same
  file with a sha256 the file on disk still matches. `run_meta.json` for that run
  carries **no** `inputs` at all — only runs from `20260730_161157` onward do — so
  the run log, not the run dir, is where pre-August provenance lives. Nothing in
  either repo said so.
- Suggestion 3 ("longer term this is the `source_ref.element_id`/`run_id` slot")
  was declined, deliberately. Those mean "the run that produced the extracted
  element"; the export is "the bytes I read by eye" — a different claim — and one
  export legitimately maps to several runs or to none, so a scalar run id cannot
  be an export's identity. `export` is a sibling; the slot stays null and its test
  stays meaningful. Reasoning in the session lesson.

The prose `provenance.sources_used` fallback the last paragraph called "itself
worth tightening" is gone as a resolution path, with a test that fails if it comes
back. Follow-on filed:
`ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule.md`.
