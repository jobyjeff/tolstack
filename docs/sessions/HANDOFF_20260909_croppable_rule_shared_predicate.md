---
priority: low
depends_on: []
---

# HANDOFF 2026-09-09 — croppable_rule_shared_predicate: derive `_croppable()` from `resolve_pdf`'s rule 1/2 instead of restating them

Source: `docs/issues/ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`.
Baseline: trunk (master). Scope: this session owns
`scripts/build_topology_projection.py`'s `_croppable()` function and
`scripts/build_viewer_crops.py`'s `resolve_pdf` rule 1/2 logic (or a new small
shared module either can import). Do NOT touch either script's file-resolution
code (crop rendering, sha256 verification) — only the "would either rule
apply" predicate.

## The gap

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
`source_ref.export` truthy → rule 1). Today the two independently-written
copies agree — verified in review both by the parametrized
`test_croppable_is_exactly_rule_1_or_rule_2` and by a real rebuild against
`docs/topologies/topology_pitch_system.json` (pitch_system's 6 resolving
edges match `_croppable`'s 6-edge prediction exactly, all sha256-verified) —
but nothing asserts the two stay equal. If `resolve_pdf` ever grows a new
sub-condition on rule 1 (e.g. a fallback for a differently-shaped `export`)
or narrows it, `_croppable` will not follow, and the two will silently
disagree — either minting a crop_key for an edge that can never resolve, or
withholding one from an edge that now could.

## Why this is fixable, not an inherent two-venv split

It might look unavoidable — `build_viewer_crops.py` needs PyMuPDF (`fitz`)
and `build_topology_projection.py` runs in tolstack's own stdlib-only venv —
but `fitz` is imported *lazily*, inside `_crop_from_citation` specifically
(per that module's own docstring) "so the resolution rules above stay
unit-testable under this repo's own stdlib-only venv." That property is
exactly what would let `build_topology_projection.py` import a shared
rule-predicate from `build_viewer_crops.py` (or a small shared module)
without needing PyMuPDF at all. Neither script currently imports from the
other.

## Fix

Extract the rule-1/rule-2 test (just "would either rule apply," not the file
resolution itself) into one function either script can reach — e.g. a
`croppable(source_ref)` in `build_viewer_crops.py` that `resolve_pdf` calls at
its own rule 1/2 branches, and that `build_topology_projection.py` imports in
place of its own `_croppable`. Confirm the cross-import doesn't drag in
`fitz` at module load (it shouldn't, given the lazy import inside
`_crop_from_citation` — verify with `python -c "import build_topology_projection"`
under tolstack's own venv, no drawing-checker venv on the path, and confirm no
`ModuleNotFoundError` for `fitz`).

## Definition of done

- `_croppable` (or its replacement call site) and `resolve_pdf`'s rule 1/2
  both call the one shared predicate — no second hand-copy of the two
  conditions anywhere.
- `test_croppable_is_exactly_rule_1_or_rule_2` still passes, now against the
  shared function.
- `.\scripts\rebuild_projections.ps1` from the main checkout still reproduces
  pitch_system's 6 resolving edges (or whatever the current count is —
  reconfirm against trunk).
- `venv-win\Scripts\python.exe -m pytest -q` green, including confirming
  `build_topology_projection.py` still imports cleanly without PyMuPDF
  installed in tolstack's own venv.
- Lesson (`docs/sessions/lessons/LESSONS_20260909_croppable_rule_shared_predicate.md`):
  record where the shared predicate ended up living and why (which script
  owns it), and confirm the lazy-`fitz`-import property still holds after the
  change.
