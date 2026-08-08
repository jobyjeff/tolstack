"""Tolerance-stack data shapes + worst-case/RSS folding.

Seeded by handoff ``tolerance_stack_slice1`` (2026-07-29) from Jeff's hand-built
grip-length workbook. This is deliberately *small*: the slice's product is the
validated data shapes in ``docs/tolerance_stacks/``, and this module exists so
those shapes are executable (and the ground-truth numbers are pinned by tests),
not because the pipeline is being built yet.

Where stacks ultimately live -- this repo, forge, or a new repo -- is **not**
decided by this slice. See ``docs/tolerance_stacks/README.md``.
"""

from tolerance_stack.spec_library import (  # noqa: F401
    Absence,
    IntakeQueue,
    IntakeRow,
    ParseEvent,
    SpecEntry,
    SpecLibrary,
    SpecValue,
    Unreadable,
    ValueLocation,
    build_library,
    load_event,
    load_events,
    rebuild,
)
from tolerance_stack.stack import (  # noqa: F401
    CheckResult,
    ExportRun,
    Interval,
    SourceExport,
    SourceRef,
    StackDefinition,
    StackElement,
    Term,
    fold,
    load_stack,
)

__all__ = [
    "Absence",
    "CheckResult",
    "ExportRun",
    "IntakeQueue",
    "IntakeRow",
    "Interval",
    "ParseEvent",
    "SourceExport",
    "SourceRef",
    "SpecEntry",
    "SpecLibrary",
    "SpecValue",
    "StackDefinition",
    "StackElement",
    "Term",
    "Unreadable",
    "ValueLocation",
    "build_library",
    "fold",
    "load_event",
    "load_events",
    "load_stack",
    "rebuild",
]
