---
priority: high
depends_on: []
---

# HANDOFF 2026-08-06 — citation_export_provenance: make a citation name *which export* it was read from

Source: `docs/issues/ISSUE_20260805_slice1_stacks_name_no_export_so_no_citation_resolves.md`
(filed by `stack_viewer_v0` 2026-08-05, updated 2026-08-06 when the newly written
thermal stacks turned out to inherit the same defect), routed by the 2026-08-06
triage sweep. Baseline: `master` @ `de7f7f1`. Scope: `SourceRef` /
`tolerance_stack/stack.py`'s citation shape, `docs/tolerance_stacks/*.json`,
`scripts/build_viewer_crops.py`, the SOP, and tests. Do NOT touch
`scripts/build_viewer_projection.py` or `apps/viewer/` (owned by the parallel
staged handoff `viewer_generated_checks`), and do NOT change any element's
`confidence` label (owned by `traced_labels_and_ratio`).

## The defect

`scripts/build_viewer_crops.py` resolves **6 of 48** element citations. All six
are in `stack_pitch_link_to_pitch_plate.json`. Everything else fails, and the
dominant root cause is a single missing fact: *which export of the drawing was
actually read*.

```
tan_link_to_pitch_plate:straight_bushing        citation names no export, ...
tan_link_to_pitch_plate:pitch_plate_flange      citation names no export, ...
tan_link_to_pitch_plate:fastener_grip_13        citation names no export, ...
tan_link_to_pitch_plate:fastener_grip_14        citation names no export, ...
vpa_output_to_pitch_plate:pitch_flange_thickness    citation names no export, ...
vpa_output_to_pitch_plate:under_head_chamfer_washer citation names no export, ...
vpa_output_to_pitch_plate:fastener_grip         citation names no export, ...
hub_bearing_thermal_fit_m2:hub_bore_upper       citation names no export, ... no PDF for '212966-006'
hub_bearing_thermal_fit_m1:sleeve_bore_upper    citation names no export, ... no PDF for '214959-002'
hub_bearing_thermal_fit_m1:bearing_od_lower     citation names no export, ... no PDF for '214589-002'
```

(The rest are `kind: "workbook"` (18) or `"assumed"` (1) — those name no drawing
at all, a different and already-known problem. Recount these figures yourself
from `crops.json` rather than quoting them; "recompute any count a doc asserts"
is this repo's third-sighting checklist item and this very issue was corrected
once for exactly that.)

## Why it matters

These citations look complete: `{"kind": "drawing", "document": "215197",
"sheet": 2, "zone": "B4", "view": "SECTION A-A", "confidence": "traced"}`. But
`217755` and `215197` each have **several exports on disk** (drawing-checker
holds 20+ runs of 217755 alone), and a printed zone is **not stable between
exports of the same revision** — the pitch-link lesson recorded DETAIL B moving
`I6 → H3` between two exports of 217755 rev A.1. So "sheet 2, zone B4" identifies
a location on *some* PDF, and nothing says which. A tool cannot re-find the
value, and neither can a human without guessing.

**It is not a legacy slice-1 defect — it is what the SOP produces by default.**
`hub_bearing_thermal_stack` wrote two stacks *fresh* on 2026-08-05, against
drawings that are real and present in drawing-checker's `data/inbox/drawings/`,
and they inherit it. `stack_pitch_link_to_pitch_plate.json`'s stack-level
`joint.assembly_export` remains the only counter-example in the repo, and it is a
free-text sentence:

```json
"joint": {
  "assembly_export": "[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER.pdf (drawing-checker run 20260804_114000 / 20260803_145243)"
}
```

That one line is why **2** of the six crops resolve, and those two are the only
ones sha256-verified against the run's `run_meta.json`. The other four come from
weaker rules with no sha check: 3 from the spec pile by filename, 1
(`pitch_plate_flange`) from a regex scan of the free-text
`provenance.sources_used` prose — which lands on a copy of 215197 under
drawing-checker's `tests/fixtures/drawings/`, not the inbox.

## Deliverables

1. **Make the export a structured, per-`source_ref` field** — this is the SOP-side
   fix and the issue's raised-priority recommendation. Suggested shape, to
   evaluate:

   ```json
   "export": {"pdf": "...", "sha256": "...", "runs": ["20260804_114000"]}
   ```

   Per-`source_ref`, not per-stack: one stack legitimately cites several
   documents (the pitch-link stack cites 217755, 215197 and a spec, and only
   217755 is covered by its `joint` block). Longer term this is the
   `source_ref.element_id` / `run_id` slot that `stack.py` already holds open and
   nothing fills — see the session lesson; decide whether to fill that slot or
   add a sibling, and record the reasoning.

   Remember the repo's own checklist: a vocabulary or schema shape lives in
   **three** places — the SOP prose, the dataclass comment, and the enforcing
   test. Change all three.

2. **Tighten the crop script's resolution rules — do not loosen them.** The
   `provenance.sources_used` prose regex should stop being a resolution path once
   the structured field exists, or at minimum must report *which* rule resolved a
   crop and whether it was sha256-verified (`crops.json` already carries
   `resolved_by` and `sha256_verified`; make them impossible to ignore).
   **Guessing an export renders a crop of the wrong revision's geometry and looks
   perfectly correct on screen** — that is the failure this handoff exists to
   prevent, so a rise in the resolved count achieved by relaxing a rule is a
   regression, not progress.

3. **Backfill the field — only where the export can be established.** Slice 1
   worked from `20260723_163810` per `hardware_entries.json`'s
   `provenance.parts_list_run`, which is evidence for `tan_link` but must be
   **confirmed, not assumed**. For the thermal stacks the drawings were dropped
   into drawing-checker's `data/inbox/drawings/` on 2026-08-05; establish which
   export each citation was read from, or say you cannot.

   **If it cannot be established, say so in the stack rather than naming a
   plausible run.** An unresolvable citation is honest; a wrong one is not. A
   backfill that quietly invents provenance is the worst possible outcome of this
   handoff, worse than doing nothing.

4. **Read drawing-checker read-only.** Everything you need there is under
   `C:\workspace\drawing-checker\data\` (absolute path — gitignored, main
   checkout only). Do not run its pipeline, do not write anything into it, and
   record the run ids and `run_meta.json` timestamps you relied on; the parallel
   staged handoff `readonly_invariant_evidence` is making that invariant
   verifiable and your record is exactly the evidence it wants.

## Definition of done

- Rebuild the crop projection against the main checkout
  (`build_viewer_crops.py` from drawing-checker's venv — PyMuPDF is deliberately
  absent from this repo's) and report resolved / total, broken down by
  `resolved_by` and `sha256_verified`, before and after. Every increase must be
  attributable to a **newly named export**, not a relaxed rule; state that
  attribution row by row.
- Any citation whose export could not be established is explicitly marked as
  such in the stack file and is still reported unresolved — with a test that
  fails if an unestablished export is ever written as a concrete one.
- Schema change reflected in the SOP prose, the dataclass comment, and the
  enforcing test.
- Full suite green (`venv-win\Scripts\python.exe -m pytest -q`) with `master`
  merged in first (`git log --oneline HEAD..master`).
- Lesson (`docs/sessions/lessons/LESSONS_20260806_citation_export_provenance.md`):
  which exports were established and how, which were not and why, and the rule
  the SOP now states so the next stack written from scratch does not reproduce
  this.
