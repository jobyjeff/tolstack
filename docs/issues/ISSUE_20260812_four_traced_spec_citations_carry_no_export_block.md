---
type: bug
priority: med
status: resolved
area: docs/tolerance_stacks / citation provenance
reporter: agent
audience: strategy
strategy: docs/strategy/BRIEF_20260812_spec_pile_citation_identity.md
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

## Resolution (2026-08-13, `spec_citation_identity_rendering`)

**Option 2 in its narrow reading**: a kind-aware *rendering* derived from data
that already exists. No third `export.status`, no `export` block on the four, no
enumerated vocabulary widened anywhere — so the 2026-08-06 exception (for the spec
pile, the filename identifies the bytes) is left standing rather than quietly
erased, which option 1 would have done.

`scripts/build_viewer_projection.py` derives `identity_rule: "spec_pile_filename"`
onto the `elements[]` row of a citation that is `kind: "spec"` and names no export
— the same condition, in the same precedence order, that
`build_viewer_crops.resolve_pdf` uses to pick the `spec_pile` rule. The viewer
renders *"Spec-pile document: identity by filename (append-only pile)"* in place
of the no-export sentence, and a collapsed **"How to read the sourcing column"**
legend states the rule on the page rather than in a lesson.

Only these four (and any future spec-pile citation) change; the 21 `workbook` + 1
`assumed` no-export citations render exactly as before, and the three `spec`
citations that *do* name an export are untouched — an export block still wins.

Pinned by `tests/test_viewer_projection.py` (the four by name, nothing else
marked, the marker derived and never authored), by a `[real]` test in
`apps/viewer/tests.js` that the marked set equals the `spec_pile`-resolved crop
set, and by a `VA.IDENTITY_RULES` ↔ Python pairing in
`tests/test_js_python_vocabulary.py`.
