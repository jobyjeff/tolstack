"""Tags on bodies and studies (handoff ``bodies_and_studies_carry_forge_tags``).

A tag is ``{axis: value}`` on one of forge's identity axes. The axes are read
from forge's ``identity.toml`` when it is on disk: a known axis loads, an unknown
one is a load error naming the axis and the file, and with the file absent
nothing is checked. ``docs/DAG_TOPOLOGY.md``, "Tags".
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack.topology import (
    PROVISIONAL_AXES,
    VARIANT_AXIS,
    StudyError,
    TopologyError,
    forge_axes,
    load_study,
    load_topology,
)

REPO = Path(__file__).resolve().parent.parent
TOPOLOGIES = REPO / "docs" / "topologies"
TOPOLOGY = TOPOLOGIES / "topology_vpa_pitch_linkage.json"
STUDY = TOPOLOGIES / "study_pitch_system_gas_spring_branch.json"

IDENTITY = """registry_version = 0
[[axis]]
name = "component"
[[axis]]
name = "purpose"
"""


@pytest.fixture
def identity(tmp_path):
    path = tmp_path / "identity.toml"
    path.write_text(IDENTITY, encoding="utf-8")
    return path


def _topology_with(tmp_path, tags):
    data = json.loads(TOPOLOGY.read_text(encoding="utf-8"))
    data["bodies"][0]["tags"] = tags
    path = tmp_path / "topology_t.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def _study_with(tmp_path, tags):
    data = json.loads(STUDY.read_text(encoding="utf-8"))
    data["tags"] = tags
    path = tmp_path / "study_t.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def test_the_axes_are_read_from_forges_file(identity):
    assert forge_axes(identity) == ("component", "purpose")


def test_a_known_axis_loads_on_a_body_and_on_a_study(identity, tmp_path):
    topology = load_topology(_topology_with(tmp_path, {"component": "x"}),
                             identity_path=identity)
    assert topology.bodies[0].tags == {"component": "x"}
    study = load_study(_study_with(tmp_path, {"purpose": "y"}),
                       identity_path=identity)
    assert study.tags == {"purpose": "y"}


def test_an_unknown_axis_is_a_load_error_naming_the_axis_and_the_file(
        identity, tmp_path):
    path = _topology_with(tmp_path, {"colour": "red"})
    with pytest.raises(TopologyError, match=r"'colour'.*identity\.toml"):
        load_topology(path, identity_path=identity)
    with pytest.raises(TopologyError, match="topology_t.json"):
        load_topology(path, identity_path=identity)
    spath = _study_with(tmp_path, {"colour": "red"})
    with pytest.raises(StudyError, match=r"study_t.json.*'colour'"):
        load_study(spath, identity_path=identity)


def test_with_forge_absent_nothing_is_checked(tmp_path):
    absent = tmp_path / "nope.toml"
    assert forge_axes(absent) is None
    topology = load_topology(_topology_with(tmp_path, {"colour": "red"}),
                             identity_path=absent)
    assert topology.bodies[0].tags == {"colour": "red"}
    assert load_study(_study_with(tmp_path, {"colour": "red"}),
                      identity_path=absent).tags == {"colour": "red"}


def test_a_tag_is_one_non_empty_string_per_axis(tmp_path):
    for bad in ({"component": ""}, {"component": 3}, ["component"]):
        with pytest.raises(TopologyError):
            load_topology(_topology_with(tmp_path, bad), identity_path=None)


def test_only_the_variant_axis_is_provisional():
    assert PROVISIONAL_AXES == (VARIANT_AXIS,)


def test_the_committed_model_tags_every_body_and_the_variants_land_where_said():
    topology = load_topology(TOPOLOGY)
    assert all(b.tags.get("component") for b in topology.bodies)
    by_variant = {}
    for body in topology.bodies:
        if VARIANT_AXIS in body.tags:
            by_variant.setdefault(body.tags[VARIANT_AXIS], []).append(body.id)
    assert by_variant == {"gas-spring": ["gas_spring"],
                          "hydraulic-brake": ["hydraulic_brake"]}
    tagged = {p.name for p in TOPOLOGIES.glob("study_*.json")
              if VARIANT_AXIS in load_study(p).tags}
    assert tagged == {"study_pitch_system_gas_spring_branch.json",
                      "study_pitch_system_gas_spring_mechanical_stroke.json"}
