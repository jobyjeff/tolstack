# LESSONS 2026-09-09 — croppable_rule_shared_predicate

Handoff: `docs/sessions/active/HANDOFF_20260909_croppable_rule_shared_predicate.md`.
Source issue: `docs/issues/ISSUE_20260908_croppable_rule_restated_across_two_scripts.md`.

## Where the shared predicate ended up living, and why

`scripts/build_viewer_crops.py` owns it -- `croppable(source_ref)`, right above
`resolve_pdf`, plus a small `_is_named_export(export)` helper factored out of
it. `resolve_pdf`'s own rule 1 branch now calls `_is_named_export` instead of
re-testing `isinstance(export, dict) and export` inline, so rule 1's
applicability test truly has one home, not two hand-synced copies. Picked
`build_viewer_crops.py` over a new third module because the handoff's own
"Fix" section suggested it and because it is the module the two rules are
*named after* (`source_ref_export`, `spec_pile`) -- putting the predicate
anywhere else would still leave a reader hunting for which file is
authoritative.

`scripts/build_topology_projection.py` no longer defines `_croppable` at all;
it imports the shared function under that same local name
(`from build_viewer_crops import croppable as _croppable`), so `crop_key`'s
call site (`not _croppable(dimension.source_ref)`) did not need to change.

## The two callers pass genuinely different shapes, and that's fine

`resolve_pdf` reads raw parsed JSON (`source_ref.get("export")`,
`source_ref.get("kind")`) -- deliberately, per that module's own docstrings,
since it re-validates rather than trusting the dataclass. `_croppable`'s
caller (`build_topology_projection.py::crop_key`) passes a
`tolerance_stack.stack.SourceRef` *dataclass* instance
(`dimension.source_ref`), already validated by its own `__post_init__`. So
`croppable()` and `_is_named_export()` both duck-type on `isinstance(...,
dict)` to handle either shape rather than forcing one caller to convert. This
is the one place that duck-typing lives -- neither caller needed to change how
it holds a citation.

## Confirmed after the change

- `test_croppable_is_exactly_rule_1_or_rule_2` (`tests/test_topology_projection.py`)
  passes unchanged, now exercising the imported function through the
  `B._croppable` alias.
- `python -c "import build_topology_projection"` under
  `venv-win/Scripts/python.exe` (tolstack's own stdlib-only venv, no
  drawing-checker venv on the path) succeeds and `'fitz' not in sys.modules`
  afterward -- the cross-import does not drag in PyMuPDF, because `fitz` stays
  imported lazily inside `build_viewer_crops.py`'s `render`/`main`/
  `_crop_from_citation`, never at module scope.
- Ran `build_topology_projection.py` directly (not the full
  `rebuild_projections.ps1`, which needs drawing-checker's venv and would
  write to the MAIN checkout's shared `data/` -- pointed `--data-root` at a
  scratch directory instead) against the real `docs/topologies/` tree:
  `pitch_system` still gets exactly 6 `crop_key`-bearing edges, same six edge
  ids as before this change.
- Full suite: `venv-win/Scripts/python.exe -m pytest -q` -- 750 passed, 1
  skipped (the skip predates this session).

## Left undone

Nothing deferred. This was scoped tightly to the predicate; the actual
resolution logic (`pdf_from_export`, sha256 verification, zone/callout
location) was not touched.
