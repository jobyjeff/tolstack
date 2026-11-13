"""A part's drawing-checker runs, in the topology projection.

Handoff ``a_part_links_to_its_drawing_before_it_has_a_tolerance`` (2026-11-12):
every projected part carries the drawing-checker runs whose drawing number
**is** the part's (``drawing_runs``), newest first, and -- only when there is
none -- the runs of another dash number of the same base (``other_dash_runs``),
which the page offers marked as not the part's own. Pinned value by value
against a small fixture of run directories, because the case that matters is
the near miss: the end-stop model's hub is 214373-002, the newest hub run is
the 214373-003 assembly, and a prefix match would link the wrong drawing with
nothing on the page to say so.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as B  # noqa: E402

TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"


def _run(root: Path, name: str, page: dict | None) -> None:
    run = root / "data" / "runs" / name
    run.mkdir(parents=True)
    (run / "run_meta.json").write_text(json.dumps({"run_id": name}), encoding="utf-8")
    if page is not None:
        stem = name.split("_", 2)[2]
        (run / f"{stem}_p01.json").write_text(json.dumps(page), encoding="utf-8")


def _page(number: str | None, revision: str | None, source: str = "x.pdf") -> dict:
    return {"source_pdf": source,
            "title_block": {"drawing_no": number, "revision": revision},
            "drawing_no": number, "revision": revision}


def _fixture(tmp_path: Path) -> Path:
    root = tmp_path / "drawing-checker"
    # Two runs of one drawing, the older written first on disk.
    _run(root, "20261020_134240_214698-002-A", _page("214698-002", "A"))
    _run(root, "20261101_090000_214698-002_B.1_PISTON_HEAD", _page("214698-002", "B"))
    # The near miss: another dash number of the hub's base, plus a bare base.
    _run(root, "20261112_104250_214373-003_A.1_HUB_ASSEMBLY", _page("214373-003", "A"))
    _run(root, "20261001_100000_214373-A", _page("214373", "A"))
    # A title block that lost its number: filed under the number the PDF's
    # own name opens with, exactly as the part-names projection files it.
    _run(root, "20260819_150314_213668-002_A.1_MOUNT",
         _page(None, "A", "213668-002 A.1 MOUNT, GAS SPRING, PROPELLER.pdf"))
    # Not drawing runs: no page 1, and no timestamp.
    _run(root, "20260409_170546_215197_A.1", None)
    _run(root, "gdt_eval_20260707", _page("215197", "A"))
    return root


def test_the_runs_are_read_newest_first_each_with_its_number_revision_and_date(tmp_path):
    runs = B.drawing_checker_runs(_fixture(tmp_path))
    assert runs == [
        {"run_dir": "20261112_104250_214373-003_A.1_HUB_ASSEMBLY",
         "drawing": "214373-003", "revision": "A", "date": "2026-11-12"},
        {"run_dir": "20261101_090000_214698-002_B.1_PISTON_HEAD",
         "drawing": "214698-002", "revision": "B", "date": "2026-11-01"},
        {"run_dir": "20261020_134240_214698-002-A",
         "drawing": "214698-002", "revision": "A", "date": "2026-10-20"},
        {"run_dir": "20261001_100000_214373-A",
         "drawing": "214373", "revision": "A", "date": "2026-10-01"},
        {"run_dir": "20260819_150314_213668-002_A.1_MOUNT",
         "drawing": "213668-002", "revision": "A", "date": "2026-08-19"},
    ]
    for run in runs:
        assert tuple(run) == B.DRAWING_RUN_FIELDS


def test_an_exact_number_gets_its_own_runs_and_no_other_dash_offer(tmp_path):
    runs = B.drawing_checker_runs(_fixture(tmp_path))
    got = B.part_drawing_runs("214698-002", runs)
    assert [r["run_dir"] for r in got["drawing_runs"]] == [
        "20261101_090000_214698-002_B.1_PISTON_HEAD",
        "20261020_134240_214698-002-A",
    ]
    assert got["other_dash_runs"] == []


def test_a_near_miss_is_never_the_parts_own_and_is_offered_as_another_dash(tmp_path):
    runs = B.drawing_checker_runs(_fixture(tmp_path))
    got = B.part_drawing_runs("214373-002", runs)
    assert got["drawing_runs"] == []
    assert [(r["drawing"], r["date"]) for r in got["other_dash_runs"]] == [
        ("214373-003", "2026-11-12"),
        ("214373", "2026-10-01"),
    ]


def test_no_run_and_no_number_are_both_two_empty_lists(tmp_path):
    runs = B.drawing_checker_runs(_fixture(tmp_path))
    empty = {"drawing_runs": [], "other_dash_runs": []}
    assert B.part_drawing_runs("216332-001", runs) == empty
    assert B.part_drawing_runs(None, runs) == empty
    # A prefix of a longer number is not its base: 21469 is not 214698's.
    assert B.part_drawing_runs("21469", runs) == empty


def test_no_drawing_checker_is_no_runs(tmp_path):
    assert B.drawing_checker_runs(None) == []
    assert B.drawing_checker_runs(tmp_path / "absent") == []


def test_every_projected_part_carries_both_lists(tmp_path):
    projection = B.build(TOPOLOGIES_DIR, {"built_at": "test"},
                         drawing_checker_root=_fixture(tmp_path))
    parts = {(t["id"], p["id"]): p for t in projection["topologies"] for p in t["parts"]}
    assert parts, "no parts projected"
    for part in parts.values():
        assert isinstance(part["drawing_runs"], list), part["id"]
        assert isinstance(part["other_dash_runs"], list), part["id"]
    hub = parts[("vpa_end_stop_v2", "hub")]
    assert hub["drawing_runs"] == []
    assert hub["other_dash_runs"][0]["drawing"] == "214373-003"
    head = parts[("vpa_end_stop_v2", "piston_head_upper_214698_002")]
    assert head["drawing_runs"][0]["revision"] == "B"
    assert head["other_dash_runs"] == []
    blade = parts[("vpa_end_stop_v2", "blade_root")]
    assert blade["drawing_runs"] == [] and blade["other_dash_runs"] == []
