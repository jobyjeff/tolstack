"""The kinematic page's play pace is the 3D pane's.

``apps/viewer/views/kinematic.js``'s ``VA.KINEMATIC_POSE.pointsPerSecond`` is how
fast the page's Play moves the pose; ``apps/annotate/sweep.js``'s
``AA.SWEEP_POINTS_PER_SECOND`` is how fast the 3D pane's own transport moves its
scrubber. The page drives the pane with ``seek`` on every frame of its play
(the_grid_and_the_dag_move_with_the_mechanism), so the two are one fact written
in two apps that load no common file; this is the assertion that fails when
they part.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "apps" / "viewer" / "views" / "kinematic.js"
ANNOTATE = REPO_ROOT / "apps" / "annotate" / "sweep.js"


def _number(path: Path, pattern: str) -> float:
    hits = re.findall(pattern, path.read_text(encoding="utf-8"))
    assert len(hits) == 1, f"{path.name}: expected one match for {pattern!r}, found {len(hits)}"
    return float(hits[0])


def test_the_pages_play_pace_is_the_3d_panes():
    page = _number(VIEWER, r"\bpointsPerSecond:\s*([0-9.]+)")
    pane = _number(ANNOTATE, r"AA\.SWEEP_POINTS_PER_SECOND\s*=\s*([0-9.]+)")
    assert page == pane, (
        f"the kinematic page plays at {page} points/s and the 3D pane at {pane}: "
        "the page seeks the pane every frame, so they must agree"
    )
