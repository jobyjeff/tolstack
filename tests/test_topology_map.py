"""The map's layout file beside a model, and how the builder ships it
(the_map_draws_the_end_stop_model, 2026-11-16).

The map (``apps/viewer/map.js``, ``apps/viewer/views/map.js``) is a second
drawing of the same model, never a second model: it reads the model view and
ONE authored layout file -- ``docs/topologies/map_<model id>.json``, a part's
place on a coarse grid -- and computes everything else. This file pins the
Python half of that:

* the layout file is read by :func:`build_topology_projection.load_topology_map`
  and carried on the topology's projection row as ``map``, verbatim; a model
  with no file (v1 today) gets its places computed -- each body a column, its
  top-level parts down it in tree order -- so every model draws a map
  (the_map_is_the_only_drawing_and_classic_retires, 2026-11-17);
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

from tolerance_stack.model_view import model_view
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


def test_v1_has_no_layout_file_and_its_places_are_computed_from_its_bodies():
    """Each body a column in declared order, its top-level parts down the
    column in tree order; every top-level part placed exactly once, and no
    two parts in one cell."""
    v1 = load_topology(MODEL_V1)
    assert not B.map_path(TOPOLOGIES_DIR, v1.id).is_file()
    doc = B.load_topology_map(TOPOLOGIES_DIR, v1)
    assert doc["computed"] is True and doc["schema"] == B.SCHEMA_MAP
    assert doc["topology"] == v1.id
    places = doc["places"]
    assert set(places) == {p.id for p in v1.parts if p.parent is None}
    assert len({tuple(v) for v in places.values()}) == len(places)
    for column, body in enumerate(v1.bodies):
        top = [p for p in v1.tree_order(body.parts) if v1.part(p).parent is None]
        assert [places[p] for p in top] == [[column, row] for row in range(len(top))]


def test_a_model_with_no_bodies_is_one_column(v2):
    """No body declared: every top-level part in column 0, in model order."""
    import dataclasses
    bare = dataclasses.replace(v2, bodies=[])
    places = B.computed_map_places(bare)
    # An outline is never placed: its parts are, in its place in the order
    # (since 2026-11-19 v2's two links and their bearings are outlines).
    outlined = set(B.outlined_assemblies(bare))
    top = [p for p in bare.tree_order([p.id for p in v2.parts])
           if B._needs_place(bare, p, outlined)]
    assert outlined and not outlined & set(places)
    assert list(places) == top
    assert [places[p] for p in top] == [[0, row] for row in range(len(top))]


def test_an_authored_file_overrides_only_the_places(v2):
    """v2's file is shipped verbatim; computed places would differ."""
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    assert "computed" not in doc
    assert doc["places"] != B.computed_map_places(v2)


#: Children v2's layout places in cells of their own: the plate assembly's
#: members in a row beside it (2026-11-18,
#: the_pitch_plate_is_an_assembly_with_its_bushings), and since 2026-11-19
#: (a_link_is_a_machined_part_and_two_bearings_each_two_races) every part of
#: the two link outlines -- each machined link and its four races, a bearing's
#: two races in two adjacent cells across its link's district border. Every
#: other child sits in its parent's cell.
V2_PLACED_CHILDREN = {
    "pitch_plate_215177_001": {"pitch_plate_215735_001", "flanged_bushing_nas77a3_015a_tan_link"},
    "pitch_link": {"pitch_link_213861_002",
                   "pitch_link_lower_outer_race", "pitch_link_lower_inner_race",
                   "pitch_link_upper_outer_race", "pitch_link_upper_inner_race"},
    "tan_link_212956_005": {"tan_link_213863_004",
                            "tan_link_lower_outer_race", "tan_link_lower_inner_race",
                            "tan_link_upper_outer_race", "tan_link_upper_inner_race"},
}


def test_v2s_layout_places_every_top_level_part_and_nothing_else(v2):
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    top_level = {p.id for p in v2.parts if p.parent is None}
    children = set().union(*V2_PLACED_CHILDREN.values())
    assert set(doc["places"]) == top_level | children
    assert "computed_places" not in doc
    for top, kids in V2_PLACED_CHILDREN.items():
        assert all(v2.within(c, top) and c != top for c in kids), top
    for place in doc["places"].values():
        assert isinstance(place, list) and len(place) == 2
        assert all(isinstance(v, int) and v >= 0 for v in place)


def test_v2s_layout_names_no_symbol_and_the_model_says_what_each_joint_is(v2):
    """Since 2026-11-17 (a_joint_says_what_kind_it_is) a joint's symbol is
    its interface word in the model: the clocking says it is a fastener
    pattern itself, so the layout's `symbols` override is gone."""
    doc = B.load_topology_map(TOPOLOGIES_DIR, v2)
    assert "symbols" not in doc
    kinds = {i["id"]: i["kind"] for i in model_view(v2)["interfaces"]}
    assert kinds["tan_link_mount_fastener_clocking"] == "fastener_pattern"


def test_the_projection_row_carries_the_map():
    projection = B.build(TOPOLOGIES_DIR)
    by_id = {row["id"]: row for row in projection["topologies"]}
    assert by_id["vpa_end_stop_v2"]["map"]["places"]
    assert by_id["vpa_pitch_linkage"]["map"]["computed"] is True
    assert all(row["map"]["places"] for row in projection["topologies"])


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


def test_a_layout_still_naming_symbols_is_refused(tmp_path, v2):
    """What a joint is drawn as is the model's word, never the layout's: a
    file still carrying the retired override is refused, not ignored."""
    doc = _good(v2)
    doc["symbols"] = {"tan_link_mount_fastener_clocking": "fastener_pattern"}
    with pytest.raises(ValueError, match="carries `symbols`"):
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


# --- an assembly drawn as an outline (2026-11-19) -----------------------------
#
# An assembly with no feature of its own has no box: the map draws its outline
# round its parts, which need places of their own. The fixture's link
# assembly holds two bearings whose races sit in two bodies each.

TWO_BODIES = REPO_ROOT / "tests" / "fixtures" / "topology_assembly_in_two_bodies.json"


@pytest.fixture(scope="module")
def two_bodies():
    return load_topology(TWO_BODIES, identity_path=None)


def test_an_assembly_with_no_feature_is_an_outline_and_v2s_links_and_bearings_are(two_bodies, v2):
    assert B.outlined_assemblies(two_bodies) == ["base_asm", "link_asm", "bearing_a", "bearing_b"]
    # v2's 215177 still owns nodes; since 2026-11-19 its two links and their
    # four bearings own none (every feature is on a member), so each is an
    # outline.
    assert B.outlined_assemblies(v2) == [
        "pitch_link", "spherical_bearing_pitch_link", "spherical_bearing_pitch_link_upper",
        "tan_link_212956_005", "spherical_bearing_tan_link", "spherical_bearing_tan_link_ms14103_3"]
    assert B.outlined_assemblies(load_topology(MODEL_V1)) == []


def test_computed_places_put_an_outlines_parts_down_their_own_bodies_columns(two_bodies):
    """The outline is never placed; its parts are, each in its body's column."""
    assert B.computed_map_places(two_bodies) == {
        "base": [0, 0], "spacer": [0, 1], "inner_a": [0, 2],
        "link_body": [1, 0], "outer_a": [1, 1], "outer_b": [1, 2],
        "arm": [2, 0], "inner_b": [2, 1]}


def _write_two_bodies(tmp_path: Path, places: dict) -> Path:
    (tmp_path / TWO_BODIES.name).write_text(TWO_BODIES.read_text(encoding="utf-8"), encoding="utf-8")
    B.map_path(tmp_path, "assembly_in_two_bodies").write_text(json.dumps(
        {"schema": B.SCHEMA_MAP, "topology": "assembly_in_two_bodies", "places": places}), encoding="utf-8")
    return tmp_path


def test_an_outlines_unplaced_parts_start_at_its_place_and_run_down_its_column(tmp_path, two_bodies):
    """A layout may place any part. The link assembly's own place is where its
    unplaced parts start: the link body there, then -- through the nested
    bearing outlines, in tree order -- each race under it, passing over a cell
    another part takes. Named in ``computed_places``; the file verbatim
    otherwise."""
    places = {"base_asm": [0, 0], "inner_a": [1, 0], "link_asm": [2, 0], "outer_b": [2, 2],
              "inner_b": [5, 0], "arm": [6, 0]}
    doc = B.load_topology_map(_write_two_bodies(tmp_path, places), two_bodies)
    assert doc["places"] == dict(places, base=[0, 0], spacer=[0, 1], link_body=[2, 0],
                                 outer_a=[2, 1])
    assert doc["computed_places"] == ["base", "link_body", "outer_a", "spacer"]
    # A part placed in the column is passed over: outer_b at [2, 1] sends
    # outer_a to the cell under it.
    places["outer_b"] = [2, 1]
    doc = B.load_topology_map(_write_two_bodies(tmp_path, places), two_bodies)
    assert doc["places"]["outer_a"] == [2, 2]


def test_an_outlines_parts_with_no_place_to_start_from_are_refused(tmp_path, two_bodies):
    places = {"base_asm": [0, 0], "inner_a": [1, 0], "inner_b": [5, 0], "arm": [6, 0]}
    with pytest.raises(ValueError, match=r"unplaced: \['link_body', 'outer_a', 'outer_b'\]"):
        B.load_topology_map(_write_two_bodies(tmp_path, places), two_bodies)
    places["no_such_part"] = [9, 9]
    with pytest.raises(ValueError, match="no_such_part"):
        B.load_topology_map(_write_two_bodies(tmp_path, places), two_bodies)


def test_the_fast_tiers_two_body_model_is_the_model_views_own():
    """``apps/viewer/tests.js`` carries the fixture's model view between two
    markers for the map's fast checks; it is the builder's output, so a change
    to the view's shape reddens here rather than leaving the fast tier testing
    a model no projection would carry."""
    source = (REPO_ROOT / "apps" / "viewer" / "tests.js").read_text(encoding="utf-8")
    start = source.index("// BEGIN twoBodyModel")
    end = source.index("// END twoBodyModel")
    literal = source[start:end].split("var TWO_BODY_MODEL = ", 1)[1].rsplit(";", 1)[0]
    assert json.loads(literal) == model_view(load_topology(TWO_BODIES, identity_path=None))


def test_the_fast_tiers_two_body_projection_is_the_builders_own():
    """Its sibling with a dimension on each race
    (``topology_assembly_in_two_bodies_rows.json``) rides as a whole
    projection between its own markers for the grid's checks -- the walk an
    assembly in three bodies is bracketed over -- held to the builder's
    output the same way."""
    source = (REPO_ROOT / "apps" / "viewer" / "tests.js").read_text(encoding="utf-8")
    start = source.index("// BEGIN raceRowsProjection")
    end = source.index("// END raceRowsProjection")
    literal = source[start:end].split("var RACE_ROWS_PROJECTION = ", 1)[1].rsplit(";", 1)[0]
    rows = TWO_BODIES.with_name("topology_assembly_in_two_bodies_rows.json")
    raw = json.loads(rows.read_text(encoding="utf-8"))
    topology = load_topology(rows, identity_path=None)
    assert json.loads(literal) == B.project_topology(rows, raw, topology, [])
