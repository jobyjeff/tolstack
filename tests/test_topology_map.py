"""The map's layout file beside a model, and how the builder ships it
(the_map_draws_the_end_stop_model, 2026-11-16).

The map (``apps/viewer/map.js``, ``apps/viewer/views/map.js``) is a second
drawing of the same model, never a second model: it reads the model view and
ONE authored layout file -- ``docs/topologies/map_<model id>.json``, a part's
place on a coarse grid -- and computes everything else. This file pins the
Python half of that:

* the layout file is read by :func:`build_topology_projection.load_topology_map`
  and carried on the topology's projection row as ``map``, verbatim, ``None``
  for a model with no file (v1 today);
* a layout that places a part the model has not, or leaves a top-level part
  unplaced, is refused -- the map's claim is that nothing in the model is
  left undrawn, so a stale layout must not build;
* the committed v2 layout places every top-level part of v2 and every symbol
  it names is an interface of v2.

The layout's geometry -- box sizes, pin sides, districts, routes -- is the
browser's (``VA.mapLayout``) and is pinned by the viewer's fast tier
(``apps/viewer/tests.js``) and the browser tier.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

from tolerance_stack.topology import load_topology

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
MODEL_V2 = TOPOLOGIES_DIR / "topology_vpa_end_stop_v2.json"
MODEL_V1 = TOPOLOGIES_DIR / "topology_vpa_pitch_linkage.json"

sys.path.insert(0, str(REPO_ROOT / "scripts"))
import build_topology_projection as B  # noqa: E402


@pytest.fixture(scope="module")
def v2():
    return load_topology(MODEL_V2)


def test_the_layout_file_is_not_named_like_a_model():
    """Every reader of the directory globs ``topology_*.json`` for the models,
    so the layout file must not match it (the handoff's suggested
    ``topology_<id>.map.json`` would have been read as a model)."""
    name = B.MAP_NAME.format(topology_id="x")
    assert not name.startswith("topology_") and not name.startswith("study_")


def test_v2_ships_its_layout_verbatim(v2):
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    assert doc is not None
    assert doc == json.loads(B.map_path(TOPOLOGIES_DIR, v2.id).read_text(encoding="utf-8"))
    assert doc["schema"] == B.SCHEMA_MAP
    assert doc["topology"] == v2.id


def test_v1_has_no_layout_and_projects_none():
    v1 = load_topology(MODEL_V1)
    assert B.load_topology_map(TOPOLOGIES_DIR, v1) is None


def test_v2s_layout_places_every_top_level_part_and_nothing_else(v2):
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    top_level = {p.id for p in v2.parts if p.parent is None}
    assert set(doc["places"]) == top_level
    for place in doc["places"].values():
        assert isinstance(place, list) and len(place) == 2
        assert all(isinstance(v, int) and v >= 0 for v in place)


def test_v2s_layout_names_symbols_only_for_its_interfaces(v2):
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    interfaces = {n.id for n in v2.nodes if len(n.parts) > 1} | {
        e.id for e in v2.edges if e.kind == "gap"}
    assert set(doc.get("symbols", {})) <= interfaces
    # The one word the layout adds today: the clocking constraint is a
    # fastener pattern, which the model has no interface word for yet.
    assert doc["symbols"] == {"tan_link_mount_fastener_clocking": "pattern"}


def test_the_projection_row_carries_the_map():
    projection = B.build(TOPOLOGIES_DIR)
    by_id = {row["id"]: row for row in projection["topologies"]}
    assert by_id["vpa_end_stop_v2"]["map"]["places"]
    assert by_id["vpa_pitch_linkage"]["map"] is None


def _write(tmp_path: Path, v2, doc: dict) -> Path:
    for src in (MODEL_V2,):
        (tmp_path / src.name).write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
    B.map_path(tmp_path, v2.id).write_text(json.dumps(doc), encoding="utf-8")
    return tmp_path


def _good(v2) -> dict:
    return json.loads(B.map_path(TOPOLOGIES_DIR, v2.id).read_text(encoding="utf-8"))


def test_a_layout_placing_an_unknown_part_is_refused(tmp_path, v2):
    doc = _good(v2)
    doc["places"]["not_a_part"] = [9, 9]
    with pytest.raises(ValueError, match="not_a_part"):
        B.load_topology_map(_write(tmp_path, v2, doc), v2)


def test_a_layout_leaving_a_top_level_part_unplaced_is_refused(tmp_path, v2):
    doc = _good(v2)
    del doc["places"]["hub"]
    with pytest.raises(ValueError, match="hub"):
        B.load_topology_map(_write(tmp_path, v2, doc), v2)


def test_a_layout_may_leave_a_child_part_unplaced(tmp_path, v2):
    """A bearing with no place sits in its link's cell (the map's rule)."""
    doc = _good(v2)
    assert "spherical_bearing_tan_link" not in doc["places"]
    assert B.load_topology_map(_write(tmp_path, v2, doc), v2) is not None


def test_a_layout_naming_a_symbol_for_no_interface_is_refused(tmp_path, v2):
    doc = _good(v2)
    doc["symbols"]["hub_blade_axis_offset"] = "pattern"  # a dimension, not an interface
    with pytest.raises(ValueError, match="hub_blade_axis_offset"):
        B.load_topology_map(_write(tmp_path, v2, doc), v2)


def test_a_layout_for_another_model_or_schema_is_refused(tmp_path, v2):
    doc = _good(v2)
    doc["topology"] = "vpa_pitch_linkage"
    with pytest.raises(ValueError, match="names topology"):
        B.load_topology_map(_write(tmp_path, v2, doc), v2)
    doc = _good(v2)
    doc["schema"] = "something/else"
    with pytest.raises(ValueError, match="schema"):
        B.load_topology_map(_write(tmp_path, v2, doc), v2)
