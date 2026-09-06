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

From a worktree (one line -- PowerShell, not cmd, runs here; ``^`` is cmd's
continuation and breaks on paste)::

    C:\\workspace\\tolstack\\venv-win\\Scripts\\python.exe scripts\\build_feature_identity_projection.py --data-root C:\\workspace\\tolstack\\data

``--data-root`` alone is sufficient: unlike every other projection builder
here, this one's *input* (``data/inbox/feature-identity/``) is also
gitignored, not tracked ``docs/``, so ``--events-dir`` follows ``--data-root``
by default rather than this module's own tree
(``ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md`` --
found in review; a bare ``REPO_ROOT``-relative default silently read the
wrong, usually-empty tree while still writing into whatever ``--data-root``
named).

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
