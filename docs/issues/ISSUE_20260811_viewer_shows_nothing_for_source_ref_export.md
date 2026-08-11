---
type: bug
priority: med
status: open
area: apps/viewer / views/stack.js citation panel
reporter: agent
---

# The citation panel shows nothing for `source_ref.export`, so an unestablished export is invisible unless a crop happened to resolve

Found while fixing
`ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule` (handoff
`viewer_source_ref_export_label`, 2026-08-11). Not fixed inline: that handoff's
scope was the crop `resolved_by` labels, the hover and the banner rollups.

`grep -n "export" apps/viewer/views/stack.js` returns **nothing**. Every citation
in the live projection carries a structured `source_ref.export` block since
`citation_export_provenance` (2026-08-06) —

```json
"export": {"status": "established",
           "pdf": "C:/workspace/drawing-checker/data/inbox/drawings/[PRELIM …] 217755 A.1 ….pdf",
           "sha256": "c6381f20…", "runs": [{"run_id": "20260803_145243", …}],
           "note": "Established 2026-08-06 by handoff citation_export_provenance from …"}
```

— and the viewer renders **none of it**. `VA.citationWhere` prints
document/rev/sheet/view/zone/cell; the export block, its `status`, its `sha256`
and its `note` are dropped.

The consequence is asymmetric and that is what makes it a bug rather than a
missing nicety. As of 2026-08-11 the crop hover *does* now say "read from the
export this citation names, X.pdf — sha256 VERIFIED" — but **only for the 26
citations whose crop resolved**. For the 22 unresolvable ones the export block is
the only place the reader could learn *why*, and the strongest case is
`status: "unestablished"`: the stack is stating outright that the bytes behind
this value cannot be identified, with a recorded `why`, and the element row shows
the same "traced"/"inferred" chip as a citation whose export is nailed down. The
crop popover carries the reason today, which means a fact about the *citation* is
only reachable through a *crop*.

## What it should probably do

Show, per citation: the export's `status` (loudly when `unestablished`, with its
`why`), the `pdf` basename, that a `sha256` is recorded, and the run ids in
`runs` (which the crop hover already links when a crop resolved). Decide whether
the `note` — often a paragraph of how the export was established — belongs
inline, clamped like the existing source-note, or on hover.

Related and probably the same job: the material entry's `library_ref`,
`values_status`, `class`, `designation_source` and `applied_over_c` are in the
live `results.json` and are likewise rendered nowhere (same grep, `stack.js`).
`library_ref` is what `spec_library:NAS6403U11D` resolves through, so it is the
provenance of a *number*, not a label — see
`ISSUE_20260810_the_spec_library_projection_is_the_third_shared_writer.md`.

## Repro

```powershell
& C:\workspace\tolstack\venv-win\Scripts\python.exe -c "import json;d=json.load(open(r'C:\workspace\tolstack\data\projections\viewer\results.json'));s=[x for x in d['stacks'] if x['id']=='pitch_link_to_pitch_plate'][0];print(json.dumps(s['stack']['elements'][0]['source_ref']['export'],indent=1))"
```

Then open that element's row in the viewer: nothing on the page mentions the
export, its sha or its runs.
