---
type: bug
priority: med
status: open
area: docs/tolerance_stacks / citation provenance
reporter: agent
audience: strategy
---

# Four `traced` `spec` citations carry no `export` block, so the row says `traced` and nothing identifies the bytes

Surfaced by `viewer_export_and_material_provenance` (2026-08-12) once the viewer
started rendering `source_ref.export`, and recorded only in that handoff's lesson
— filed here so a triage sweep can see it.

## What

Recomputed from `data/projections/viewer/results.json`, 2026-08-12:

| citations | 48 |
|---|---|
| `export.status: "established"` | 22 |
| no `export` key at all | 26 — 21 `workbook`, 1 `assumed`, **4 `spec`** |
| `export.status: "unestablished"` | 0 |

The 4 `spec` ones are:

* `tan_link_to_pitch_plate:fastener_grip_13`
* `tan_link_to_pitch_plate:fastener_grip_14`
* `tan_link_to_pitch_plate_take2:fastener_grip_13`
* `vpa_output_to_pitch_plate:fastener_grip`

All four are `confidence: "traced"`, and all four resolve a crop by `spec_pile` —
so nothing is *wrong*: the spec pile is append-only and identity there is the
filename. The other 22 no-export citations are `workbook`/`assumed`, where there
is no exported PDF to name at all.

## Why it matters

These are the only citations in the repo where the element row says **`traced`**
and the export line says **"this citation names no exported file, so nothing here
identifies the bytes the value was read off"**. Both statements are accurate; read
together they look like a gap. Every other `traced` citation names a sha256.

Since `citation_export_provenance` (2026-08-06) the repo's position is that a
drawing number plus a revision does **not** identify bytes. The spec pile's
filename-identity rule is the exception that makes these four fine — and that rule
is currently statable only inside a *crop entry* (`resolved_by: "spec_pile"`),
never on the citation itself. That is the same "a fact about the citation is
reachable only through a crop" shape the viewer issue was filed for.

## Two candidate resolutions (design call, hence `audience: strategy`)

1. Give these citations an `export` block naming the spec-pile PDF and its sha256,
   the way a `drawing` citation does. Cheap, but it asserts an exported-file
   identity for a document whose identity rule is deliberately different.
2. Let `SourceExport` (or the citation) carry the spec-pile identity rule
   explicitly — a third `status`, or a `kind`-aware sentence — so `traced` +
   "no bytes identified" stops being a reachable pair.

Doing neither is also defensible; if so, say so somewhere a reader of the row can
find, because the viewer now shows both halves side by side.

## Where it is written down

`docs/sessions/lessons/LESSONS_20260812_viewer_export_and_material_provenance.md`,
"Left for the next agent".
