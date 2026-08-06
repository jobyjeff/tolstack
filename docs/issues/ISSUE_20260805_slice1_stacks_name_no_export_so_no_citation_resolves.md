---
type: bug
priority: high
status: open
area: stack definitions / provenance
reporter: agent
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
