---
type: chore
priority: low
status: resolved
area: scripts/build_topology_projection.py
reporter: agent
handoff: docs/sessions/HANDOFF_20260909_croppable_rule_shared_predicate.md
resolution: handoff completed 2026-09-09 -- closed automatically by dispatch when handoff `croppable_rule_shared_predicate` moved to completed/; not independently verified.
---

# `_croppable()`'s two rules are a hand-restatement of `resolve_pdf`'s rule 1/2, with nothing pairing them

Handoff `inline_edge_crops` (2026-09-08) added
`scripts/build_topology_projection.py::_croppable(source_ref)`:

```python
return source_ref is not None and (
    source_ref.export is not None or source_ref.kind == "spec"
)
```

Its own docstring says this is deliberately "the same two rules
`build_viewer_crops.resolve_pdf` implements as rule 1 (`source_ref_export`)
and rule 2 (`spec_pile`)" — and `resolve_pdf` in `scripts/build_viewer_crops.py`
does implement exactly those two conditions (`kind == "spec"` → rule 2;
`source_ref.export` truthy → rule 1, via the `SourceExport` it names). Today
the two independently-written copies agree: verified in review both by the
parametrized `test_croppable_is_exactly_rule_1_or_rule_2` and by a real
rebuild against the current `docs/topologies/topology_pitch_system.json`
(pitch_system's 6 resolving edges match `_croppable`'s 6-edge prediction
exactly, all sha256-verified).

Nothing asserts the two stay equal. If `resolve_pdf` ever grows a new
sub-condition on rule 1 (e.g. a fallback for a differently-shaped `export`) or
narrows it, `_croppable` will not follow, and the two will silently disagree —
either minting a crop_key for an edge that can never resolve, or withholding
one from an edge that now could. This is exactly the "restated by hand instead
of derived, with nothing pairing the copy to its source" class this repo's
review checklist already tracks for counts/vocabularies, one level down at a
predicate instead of a number.

**Why this is fixable, not just an inherent two-venv split**: it might look
unavoidable — `build_viewer_crops.py` needs PyMuPDF (`fitz`) and
`build_topology_projection.py` runs in tolstack's own stdlib-only venv — but
`fitz` is imported *lazily*, inside `_crop_from_citation`, specifically (per
that module's own docstring) "so the resolution rules above stay unit-testable
under this repo's own stdlib-only venv." That property is exactly what would
let `build_topology_projection.py` import a shared rule-predicate from
`build_viewer_crops.py` (or a small shared module) without needing PyMuPDF at
all. Neither script currently imports from the other.

**What a fix would need**: extract the rule-1/rule-2 test (not the file
resolution itself, just "would either rule apply") into one function either
script can reach — e.g. a `croppable(source_ref)` in `build_viewer_crops.py`
that `resolve_pdf` calls at its own rule 1/2 branches and
`build_topology_projection.py` imports — plus confirming the cross-import
doesn't drag in `fitz` at module load (it shouldn't, given the lazy import).
Not fixed inline in review: it is a cross-module refactor, not a few lines,
and review's inline-fix boundary excludes that.
