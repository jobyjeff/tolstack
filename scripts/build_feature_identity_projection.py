"""Rebuild ``data/projections/feature-identity/bindings.json``.

Thin CLI over :mod:`tolerance_stack.feature_identity` -- the fold and the
projection-provenance-gated ``rebuild()``/``main()`` live in the package
(mirroring ``tolerance_stack.spec_library``, the closer analogue: both are an
append-only event stream plus one fold, not a walk of an authored graph the
way the topology/viewer projections are). This script exists on its own
rather than only as ``python -m tolerance_stack`` because the handoff that
built this stream (``annotation_surface_mvp``, 2026-09-06) names it as a
script, and because its input directory is ``data/inbox/feature-identity/``,
gitignored like every other inbox stream -- not ``docs/spec_library/events/``,
which is committed. See ``tolerance_stack/feature_identity.py``'s module
docstring for that call.

Usage (from the repo's MAIN checkout -- ``data/`` exists only there)::

    venv-win\\Scripts\\python.exe scripts\\build_feature_identity_projection.py

From a worktree::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe ^
        scripts\\build_feature_identity_projection.py --data-root C:\\workspace\\tolstack\\data

Stdlib only.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from tolerance_stack.feature_identity import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
