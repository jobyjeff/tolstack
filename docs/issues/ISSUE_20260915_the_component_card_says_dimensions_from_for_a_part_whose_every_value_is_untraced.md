---
type: bug
priority: med
status: resolved
area: apps/viewer
reporter: agent
found_by: docs/sessions/HANDOFF_20260915_viewer_component_names_and_reference_copy.md
handoff: docs/sessions/HANDOFF_20260916_reader_facing_copy_and_vocabulary.md
resolution: handoff completed 2026-09-16 -- closed automatically by dispatch when handoff `reader_facing_copy_and_vocabulary` moved to completed/; not independently verified.
---

# "dimensions from <workbook>" reads as sourcing on parts whose every value is `untraced` and on the gap list

`viewer_component_names_and_reference_copy` (2026-09-15) replaced the component
card's *"no drawing recorded for this part"* with a line derived from what the
part's own rows cite (`VA.partReferences` / `VA.componentCard`,
`apps/viewer/topology.js`):

* `standardPart` — every citing document is `kind: "spec"` — renders
  **"standard part — dimensions from …"**. That is Jeff's own example and it is
  right.
* everything else renders **"dimensions from …"**, with no qualifier.

The second branch is doing more work than it looks. Dumped over the live
projection (`data/projections/viewer/topologies.json`, 2026-09-15):

```
pitch_link | washer_nas1149v0332h | dimensions from 260729_sample_tol_stack.xlsx · sheet grip length tols old
pitch_system | hub           | dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack; 212966-006-A · sheet 4
pitch_system | pitch_link    | dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack
pitch_system | blade_root    | dimensions from 260825_End_Stop_JC.xlsx · sheet End Stop Tol Stack
tan_link_take2 | spherical_bearing_tan_link  | dimensions from 260729_sample_tol_stack.xlsx · sheet grip length tols old
tan_link_take2 | flanged_bushing_tan_link    | dimensions from 260729_sample_tol_stack.xlsx · sheet grip length tols old
vpa_output | flanged_bushing_unidentified    | dimensions from 260729_sample_tol_stack.xlsx · sheet grip length tols old
```

**Every dimension behind every one of those lines is `confidence: "untraced"`
and on the gap list.** `spherical_bearing_tan_link`'s own `note`, three lines
below on the same card, says *"Its width is untraced."*
`flanged_bushing_unidentified`'s card is titled *"part not identified"* and then
says where its dimensions come from.

Nothing on the line is false — the value really was transcribed out of that
workbook — but the card now makes a **sourcing statement in the same words** for
a traced drawing citation and for a workbook transcription this repo explicitly
refuses to call traced. The card carries no confidence chip, so the line is the
only provenance a reader of it sees. This is the repo's standing
surfaces-that-state-something-stronger-than-the-record shape, and the string it
replaced ("no drawing recorded for this part") at least claimed nothing.

## Options

1. **Qualify by the citations' own confidence**, which the card already has in
   hand: *"dimensions transcribed from 260729_sample_tol_stack.xlsx · sheet
   grip length tols old — untraced"*, or a chip beside the line. The rule is
   already computed per document (`VA.partReferences` collects `kinds`; it can
   collect confidences the same way).
2. **Restrict the line to the case it was asked for** — `kind: "spec"` /
   `kind: "drawing"` — and render nothing for a part whose only citations are
   `workbook`. "Render nothing where neither exists" is already the rule the
   handoff's own overlay entry (c) states.

(1) is more informative; (2) is closer to what Jeff asked for and cannot be
wrong. Either is a few lines. The `[real]` guard that exists —
*"every live part with no drawing names the document its own dimensions come
off, or says nothing at all"* — passes under both.
