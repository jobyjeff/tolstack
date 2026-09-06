"""Value-level tests for the feature-identity stream: event shapes, the fold,
and the staleness re-validation.

Fixture events live in ``tests/fixtures/feature_identity_events/`` and are
synthetic (each says so in its own ``note``) -- the committed
``data/inbox/feature-identity/`` stream is gitignored input from a real
annotate session, not a fixture, so schema/fold coverage has to come from
here, the same reason ``tests/fixtures/spec_events/`` exists for the spec
library.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack.feature_identity import (
    DIRECTIONS,
    GDT_MODIFIERS,
    PATH_KINDS,
    STACK_KEY_KINDS,
    VERDICTS,
    FeatureIdentityEvent,
    GeometryKey,
    OwnerPath,
    StackKey,
    build_projection,
    face_matches,
    load_events,
    main,
    revalidate,
    revalidate_projection,
)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "feature_identity_events"
MANIFESTS = Path(__file__).resolve().parent / "fixtures" / "feature_identity_manifests"


@pytest.fixture(scope="module")
def events():
    return load_events(FIXTURES)


@pytest.fixture(scope="module")
def projection(events):
    return build_projection(events)


# ---------------------------------------------------------------------------
# StackKey / GeometryKey / OwnerPath validation
# ---------------------------------------------------------------------------


def test_stack_key_kinds_are_exactly_topology_edge_and_stack_element():
    assert STACK_KEY_KINDS == ("topology_edge", "stack_element")


def test_stack_key_topology_edge_requires_topology_and_edge_id():
    with pytest.raises(ValueError):
        StackKey(kind="topology_edge", topology_id="pitch_system")
    with pytest.raises(ValueError):
        StackKey(kind="topology_edge", edge_id="end_stop_clearance")


def test_stack_key_topology_edge_rejects_stack_fields():
    with pytest.raises(ValueError):
        StackKey(
            kind="topology_edge", topology_id="pitch_system", edge_id="end_stop_clearance",
            stack_id="tan_link_to_pitch_plate",
        )


def test_stack_key_stack_element_requires_stack_and_element_id():
    with pytest.raises(ValueError):
        StackKey(kind="stack_element", stack_id="tan_link_to_pitch_plate")


def test_stack_key_rejects_unknown_kind():
    with pytest.raises(ValueError):
        StackKey(kind="drawing_zone", topology_id="x", edge_id="y")


def test_stack_key_as_key_distinguishes_the_two_kinds():
    a = StackKey(kind="topology_edge", topology_id="p", edge_id="e")
    b = StackKey(kind="stack_element", stack_id="p", element_id="e")
    assert a.as_key() != b.as_key()


def test_geometry_key_requires_a_64_char_sha256():
    with pytest.raises(ValueError):
        GeometryKey(source_step_sha256="deadbeef", face_id=0, area_native2=1.0, centroid_native=(0, 0, 0))


def test_owner_path_hypothesis_must_say_what_the_hop_was():
    with pytest.raises(ValueError):
        OwnerPath(kind="hypothesis")
    OwnerPath(kind="hypothesis", via="a sibling configuration")  # does not raise
    OwnerPath(kind="direct")  # does not raise, needs no via/note


def test_owner_path_rejects_unknown_kind():
    with pytest.raises(ValueError):
        OwnerPath(kind="guess")


# ---------------------------------------------------------------------------
# FeatureIdentityEvent validation
# ---------------------------------------------------------------------------


def _bound_kwargs(**overrides):
    base = dict(
        event_id="e1",
        seq=1,
        created_at="2026-09-06T00:00:00Z",
        recorded_by="test",
        stack_key=StackKey(kind="topology_edge", topology_id="p", edge_id="e"),
        verdict="bound",
        geometry_key=GeometryKey(
            source_step_sha256="a" * 64, face_id=0, area_native2=1.0, centroid_native=(0.0, 0.0, 0.0)
        ),
        direction="to",
    )
    base.update(overrides)
    return base


def test_bound_event_requires_a_geometry_key():
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**_bound_kwargs(), "geometry_key": None})


def test_bound_event_requires_a_direction_in_vocabulary():
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**_bound_kwargs(), "direction": None})
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**_bound_kwargs(), "direction": "sideways"})


def test_owner_not_in_set_event_must_carry_no_geometry_or_direction():
    kwargs = _bound_kwargs(verdict="owner_not_in_set", geometry_key=None, direction=None)
    FeatureIdentityEvent(**kwargs)  # does not raise
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**kwargs, "geometry_key": _bound_kwargs()["geometry_key"]})
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**kwargs, "direction": "to"})


def test_verdict_must_be_one_of_the_vocabulary():
    assert VERDICTS == ("bound", "owner_not_in_set")
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**_bound_kwargs(), "verdict": "maybe"})


def test_gdt_modifier_must_be_one_of_the_vocabulary_or_absent():
    assert GDT_MODIFIERS == ("M", "L")
    FeatureIdentityEvent(**{**_bound_kwargs(), "gdt_modifier": "M"})  # does not raise
    with pytest.raises(ValueError):
        FeatureIdentityEvent(**{**_bound_kwargs(), "gdt_modifier": "S"})


def test_direction_vocabulary_matches_topology_edge_ends():
    assert DIRECTIONS == ("from", "to")


def test_path_kind_vocabulary():
    assert PATH_KINDS == ("direct", "hypothesis")


def test_event_round_trips_through_as_dict_and_from_dict():
    event = FeatureIdentityEvent(**_bound_kwargs())
    again = FeatureIdentityEvent.from_dict(event.as_dict())
    assert again.as_dict() == event.as_dict()


# ---------------------------------------------------------------------------
# Loading the fixture log
# ---------------------------------------------------------------------------


def test_the_fixture_event_file_list_is_complete():
    on_disk = sorted(p.name for p in FIXTURES.glob("*.json"))
    assert on_disk == [
        "0001_bind_end_stop_clearance_face0.json",
        "0002_bind_end_stop_clearance_face1_composition.json",
        "0003_owner_not_in_set.json",
        "0004_bind_hypothesis_path_with_gdt.json",
    ]


def test_load_events_orders_by_seq_not_filename():
    loaded = load_events(FIXTURES)
    assert [e.seq for e in loaded] == [1, 2, 3, 4]


def test_load_events_rejects_duplicate_seq(tmp_path):
    (tmp_path / "a.json").write_text(
        json.dumps(FeatureIdentityEvent(**_bound_kwargs(event_id="a", seq=1)).as_dict()), encoding="utf-8"
    )
    (tmp_path / "b.json").write_text(
        json.dumps(FeatureIdentityEvent(**_bound_kwargs(event_id="b", seq=1)).as_dict()), encoding="utf-8"
    )
    with pytest.raises(ValueError):
        load_events(tmp_path)


# ---------------------------------------------------------------------------
# The fold
# ---------------------------------------------------------------------------


def test_the_many_to_many_edge_gets_two_bindings_from_two_events(projection):
    key = StackKey(kind="topology_edge", topology_id="pitch_system", edge_id="end_stop_clearance")
    record = projection.for_stack_key(key)
    assert record is not None
    assert record.state == "bound"
    assert [b.geometry_key.face_id for b in record.bindings] == [0, 1]
    assert len(record.history) == 2


def test_the_second_binding_carries_its_composition_note(projection):
    key = StackKey(kind="topology_edge", topology_id="pitch_system", edge_id="end_stop_clearance")
    record = projection.for_stack_key(key)
    notes = [b.composition_note for b in record.bindings if b.composition_note]
    assert notes and "sums with" in notes[0]


def test_an_owner_not_in_set_key_has_no_bindings_and_state_owner_not_in_set(projection):
    key = StackKey(kind="stack_element", stack_id="tan_link_to_pitch_plate", element_id="washer_thin")
    record = projection.for_stack_key(key)
    assert record is not None
    assert record.bindings == []
    assert len(record.owner_not_in_set) == 1
    assert record.state == "owner_not_in_set"


def test_a_key_with_no_events_at_all_is_absent_not_a_default_state(projection):
    """'unbound' is never a value the fold produces -- absence of an entry IS
    unbound, and a consumer that knows the full key set (a topology's edges)
    is the one that notices it, exactly like IntakeQueue.status's absence."""
    key = StackKey(kind="topology_edge", topology_id="pitch_system", edge_id="nothing_ever_binds_this")
    assert projection.for_stack_key(key) is None


def test_the_hypothesis_owner_path_and_gdt_fields_survive_the_fold(projection):
    key = StackKey(kind="topology_edge", topology_id="pitch_system", edge_id="pitch_arm_link_hole_to_clocking_hole")
    record = projection.for_stack_key(key)
    binding = record.bindings[0]
    assert binding.owner_path.kind == "hypothesis"
    assert binding.gdt_modifier == "L"
    assert binding.general_tol_regime == "ISO-2768-mK"


def test_build_projection_rejects_duplicate_event_id():
    e1 = FeatureIdentityEvent(**_bound_kwargs(event_id="dup", seq=1))
    e2 = FeatureIdentityEvent(**_bound_kwargs(event_id="dup", seq=2))
    with pytest.raises(ValueError):
        build_projection([e1, e2])


def test_projection_as_dict_is_json_serialisable(projection):
    json.dumps(projection.as_dict())  # does not raise


# ---------------------------------------------------------------------------
# Staleness re-validation
# ---------------------------------------------------------------------------


def test_face_matches_true_within_tolerance():
    key = GeometryKey(source_step_sha256="a" * 64, face_id=0, area_native2=7.586741,
                       centroid_native=(112.414272, -0.0, 134.944272))
    face = {"face_id": 0, "area_native2": 7.586741, "centroid_native": [112.414272, 0.0, 134.944272]}
    assert face_matches(key, face)


def test_face_matches_false_when_centroid_shifted_past_tolerance():
    key = GeometryKey(source_step_sha256="a" * 64, face_id=1, area_native2=3.673439,
                       centroid_native=(112.195321, 3.224143, 135.516032))
    face = {"face_id": 1, "area_native2": 3.673439, "centroid_native": [115.9, 3.224143, 135.516032]}
    assert not face_matches(key, face)


def test_revalidate_confirms_an_unperturbed_face(events):
    matching = json.loads((MANIFESTS / "replacement_matching.manifest.json").read_text(encoding="utf-8"))
    face0_event = next(e for e in events if e.event_id == "20260906-endstop-clearance-face0")
    assert revalidate(face0_event, matching) == "confirmed"


def test_revalidate_flags_a_perturbed_face_needs_re_confirmation(events):
    """The DoD's synthetic perturbed-manifest case: face_id 1 shifted well past
    tolerance must come back needs_re_confirmation, not silently re-bound and
    not dropped."""
    perturbed = json.loads((MANIFESTS / "replacement_perturbed.manifest.json").read_text(encoding="utf-8"))
    face1_event = next(e for e in events if e.event_id == "20260906-endstop-clearance-face1")
    assert revalidate(face1_event, perturbed) == "needs_re_confirmation"


def test_revalidate_flags_a_missing_face_id_needs_re_confirmation():
    only_face_zero = {"faces": [{"face_id": 0, "area_native2": 7.586741,
                                  "centroid_native": [112.414272, -0.0, 134.944272]}]}
    face1_event = FeatureIdentityEvent(**_bound_kwargs(
        geometry_key=GeometryKey(source_step_sha256="b" * 64, face_id=99, area_native2=1.0,
                                  centroid_native=(0.0, 0.0, 0.0))
    ))
    assert revalidate(face1_event, only_face_zero) == "needs_re_confirmation"


def test_revalidate_rejects_an_owner_not_in_set_event():
    event = FeatureIdentityEvent(**_bound_kwargs(verdict="owner_not_in_set", geometry_key=None, direction=None))
    with pytest.raises(ValueError):
        revalidate(event, {"faces": []})


def test_revalidate_projection_only_reports_events_with_a_known_replacement(projection):
    """An event naming a sha with no entry in ``replacements`` is left out
    entirely -- 'nothing known changed' is not the same claim as 'confirmed
    unchanged'."""
    perturbed = json.loads((MANIFESTS / "replacement_perturbed.manifest.json").read_text(encoding="utf-8"))
    sha = "6d5b1321446d54cd713da0739f7821c5266b3d6898ad047465e30003e7f549cf"
    results = revalidate_projection(projection, {sha: perturbed})
    assert results["20260906-endstop-clearance-face0"] == "confirmed"
    assert results["20260906-endstop-clearance-face1"] == "needs_re_confirmation"
    # the hypothesis-path event is bound to a DIFFERENT sha with no replacement
    # entry here, so it must not appear at all.
    assert "20260906-blade-root-hypothesis" not in results


# ---------------------------------------------------------------------------
# The CLI: --events-dir MUST follow --data-root, not this module's own tree
# ---------------------------------------------------------------------------
#
# ISSUE_20260906_feature_identity_events_dir_ignores_data_root.md (found in
# review): `--data-root <path>` alone is the documented, standard-shaped
# from-a-worktree recipe every other projection builder here supports, and it
# silently read THIS module's own REPO_ROOT-relative events dir instead --
# usually empty in a worktree -- while still writing the (wrong, empty)
# output wherever `--data-root` pointed. These tests seed a `--data-root`
# that is NOT this module's own tree, so a regression back to the
# REPO_ROOT-relative default shows up as "0 events" against a directory that
# very much has one.


def test_cli_with_only_data_root_reads_that_roots_own_events_dir(tmp_path):
    data_root = tmp_path / "data"
    events_dir = data_root / "inbox" / "feature-identity"
    events_dir.mkdir(parents=True)
    (events_dir / "0001_x.json").write_text(
        json.dumps(FeatureIdentityEvent(**_bound_kwargs()).as_dict()), encoding="utf-8"
    )

    rc = main(["--data-root", str(data_root)])
    assert rc == 0

    out_path = data_root / "projections" / "feature-identity" / "bindings.json"
    written = json.loads(out_path.read_text(encoding="utf-8"))
    assert written["built_from_events"] == ["e1"]
    assert len(written["stack_keys"]) == 1


def test_cli_with_only_data_root_does_not_read_this_modules_own_tree(tmp_path):
    """The regression this issue names exactly: an empty --data-root/inbox/
    feature-identity/ must produce ZERO events, not silently fall back to
    tolerance_stack/feature_identity.py's own REPO_ROOT-relative EVENTS_DIR
    (which, in this checkout, is not empty of its README but IS empty of
    *.json events -- so a fall-back would still show 0, the same wrong
    number for a different reason; the real guard is the first test above:
    a real event at --data-root's own path must be found)."""
    data_root = tmp_path / "data"
    (data_root / "inbox" / "feature-identity").mkdir(parents=True)
    # no event files at all

    rc = main(["--data-root", str(data_root)])
    assert rc == 0
    out_path = data_root / "projections" / "feature-identity" / "bindings.json"
    written = json.loads(out_path.read_text(encoding="utf-8"))
    assert written["built_from_events"] == []


def test_cli_explicit_events_dir_still_overrides_data_root(tmp_path):
    data_root = tmp_path / "data"
    other_events_dir = tmp_path / "elsewhere" / "events"
    other_events_dir.mkdir(parents=True)
    (other_events_dir / "0001_x.json").write_text(
        json.dumps(FeatureIdentityEvent(**_bound_kwargs()).as_dict()), encoding="utf-8"
    )

    rc = main(["--data-root", str(data_root), "--events-dir", str(other_events_dir)])
    assert rc == 0
    out_path = data_root / "projections" / "feature-identity" / "bindings.json"
    written = json.loads(out_path.read_text(encoding="utf-8"))
    assert written["built_from_events"] == ["e1"]
