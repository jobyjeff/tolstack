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
    PROPOSAL_CONFIDENCES,
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
    resolution_notes,
    revalidate,
    revalidate_projection,
    seq_collisions,
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
    assert VERDICTS == ("bound", "owner_not_in_set", "proposed", "rejected")
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


def test_a_seq_two_events_claim_folds_in_the_order_they_were_written(tmp_path):
    """The 2026-11-06 shape: Jeff's accept took seq 56, which an agent's
    proposal written two days earlier already held. Neither file may be
    renamed, so the log orders the pair by ``created_at`` -- here against the
    filename order, which must not decide -- and says it did."""
    written_later = FeatureIdentityEvent(**_bound_kwargs(
        event_id="annotate-a", seq=56, created_at="2026-11-06T00:12:37Z"))
    written_first = FeatureIdentityEvent(**_bound_kwargs(
        event_id="proposal-z", seq=56, created_at="2026-11-04T03:49:08Z", direction="from"))
    (tmp_path / "0001_a.json").write_text(json.dumps(written_later.as_dict()), encoding="utf-8")
    (tmp_path / "0056_z.json").write_text(json.dumps(written_first.as_dict()), encoding="utf-8")
    loaded = load_events(tmp_path)
    assert [e.event_id for e in loaded] == ["proposal-z", "annotate-a"]
    assert seq_collisions(loaded) == [(56, ["proposal-z", "annotate-a"])]
    # An equal timestamp still has one order: the event id's.
    tie = [FeatureIdentityEvent(**_bound_kwargs(event_id=i, seq=3)) for i in ("b", "a")]
    assert build_projection(tie).events == ["a", "b"]


def test_a_proposal_accepted_twice_the_same_way_stands_once():
    """Jeff accepted four proposals twice (2026-11-06, again 2026-11-08, the
    first accepts having vanished on reload). The same answer folds as one:
    one binding, the proposal accepted once, both events in history, and the
    repeat named in ``restated``."""
    p = _proposed("p1", 1, 110, "to")
    first = _accept("a1", 56, p, created_at="2026-11-06T00:12:37Z")
    again = _accept("a2", 68, p, created_at="2026-11-08T05:58:17Z")
    projection = build_projection([p, again, first])
    record = _record(projection)
    assert [e.event_id for e in record.bindings] == ["a1"]
    assert [e.event_id for e in record.accepted_proposals] == ["p1"]
    assert [e.event_id for e in record.history] == ["p1", "a1", "a2"]
    assert projection.restated == {"a2": "a1"}
    assert projection.counts()["bound"] == 2  # events by verdict, both kept
    assert resolution_notes([p, first, again], projection) == [
        "a2 repeats the answer a1 already gave; folded as one"]


def test_superseding_a_repeated_answer_supersedes_the_answer():
    p = _proposed("p1", 1, 110, "to")
    fix = _bound("c1", 4, 111, "to", supersedes="a2")
    record = _record(build_projection([p, _accept("a1", 2, p), _accept("a2", 3, p), fix]))
    assert [e.event_id for e in record.bindings] == ["c1"]
    assert [e.event_id for e in record.superseded] == ["a1"]


def test_a_proposal_answered_twice_differently_is_still_refused():
    """Which of two different answers stands is the reviewer's call."""
    p = _proposed("p1", 1, 110, "to")
    with pytest.raises(ValueError, match=r"answered twice, differently.*'a1'.*'a2'"):
        build_projection([p, _accept("a1", 2, p), _accept("a2", 3, p, note="the bore, not the face")])


def test_the_cli_prints_every_collision_it_resolved(tmp_path, capsys):
    data_root = tmp_path / "data"
    events_dir = data_root / "inbox" / "feature-identity"
    events_dir.mkdir(parents=True)
    p = _proposed("p1", 1, 110, "to")
    log = [p, _bound("b9", 2, 5, "from"), _accept("a1", 2, p), _accept("a2", 3, p)]
    for i, event in enumerate(log):
        (events_dir / f"{i:04d}.json").write_text(json.dumps(event.as_dict()), encoding="utf-8")
    assert main(["--data-root", str(data_root)]) == 0
    err = capsys.readouterr().err
    assert "note: seq 2 is claimed by 2 events; folded in the order they were written: b9, a1" in err
    assert "note: a2 repeats the answer a1 already gave; folded as one" in err


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


# ---------------------------------------------------------------------------
# supersedes: a later event names the earlier one it corrects
# ---------------------------------------------------------------------------

_SHA = "ab" * 32


def _bound(event_id, seq, face_id, direction, *, edge="piston_head_upper_thickness", supersedes=None):
    return FeatureIdentityEvent(
        event_id=event_id, seq=seq, created_at="2026-10-26T00:00:00Z", recorded_by="tests",
        stack_key=StackKey(kind="topology_edge", topology_id="vpa_pitch_linkage", edge_id=edge),
        verdict="bound",
        geometry_key=GeometryKey(_SHA, face_id, 1.0, (0.0, 0.0, 0.0)),
        direction=direction, supersedes=supersedes,
    )


def _record(projection, edge="piston_head_upper_thickness"):
    return projection.for_stack_key(
        StackKey(kind="topology_edge", topology_id="vpa_pitch_linkage", edge_id=edge))


def test_a_superseding_event_hides_the_one_it_corrects_and_keeps_it():
    a = _bound("a", 1, 110, "from")
    b = _bound("b", 2, 110, "to", supersedes="a")
    record = _record(build_projection([a, b]))
    assert [e.event_id for e in record.bindings] == ["b"]
    assert [e.event_id for e in record.superseded] == ["a"]
    assert [e.event_id for e in record.history] == ["a", "b"]
    assert record.bindings[0].direction == "to"
    assert [e["event_id"] for e in record.as_dict()["superseded"]] == ["a"]


def test_two_independent_bindings_on_one_key_both_stand():
    record = _record(build_projection([_bound("a", 1, 110, "from"), _bound("b", 2, 111, "to")]))
    assert [e.event_id for e in record.bindings] == ["a", "b"]
    assert record.superseded == []


def test_a_dangling_supersedes_fails_naming_both_ids():
    with pytest.raises(ValueError, match=r"'b'.*'ghost'"):
        build_projection([_bound("b", 2, 110, "to", supersedes="ghost")])


def test_a_supersedes_across_keys_fails_naming_both_ids():
    a = _bound("a", 1, 110, "from", edge="other_edge")
    b = _bound("b", 2, 110, "to", supersedes="a")
    with pytest.raises(ValueError, match=r"'b'.*'a'.*different stack key"):
        build_projection([a, b])


def test_supersedes_round_trips_and_is_absent_when_unset():
    b = _bound("b", 2, 110, "to", supersedes="a")
    assert FeatureIdentityEvent.from_dict(b.as_dict()).supersedes == "a"
    assert "supersedes" not in _bound("a", 1, 110, "from").as_dict()


def test_only_a_bound_event_may_supersede():
    with pytest.raises(ValueError):
        FeatureIdentityEvent(
            event_id="n", seq=3, created_at="x", recorded_by="t",
            stack_key=StackKey(kind="topology_edge", topology_id="t", edge_id="e"),
            verdict="owner_not_in_set", supersedes="a")


# ---------------------------------------------------------------------------
# proposals: an agent proposes, a human accepts or rejects (2026-10-28)
# ---------------------------------------------------------------------------

_AGENT = "agent:an_agent_proposes_a_face_binding_and_a_human_ratifies_it"
_HUMAN = "annotate-app:jeff"


def _proposed(event_id, seq, face_id, direction, *, edge="piston_head_upper_thickness", **extra):
    fields = dict(
        event_id=event_id, seq=seq, created_at="2026-10-28T00:00:00Z", recorded_by=_AGENT,
        stack_key=StackKey(kind="topology_edge", topology_id="vpa_pitch_linkage", edge_id=edge),
        verdict="proposed",
        geometry_key=GeometryKey(_SHA, face_id, 1.0, (0.0, 0.0, 0.0)),
        direction=direction, confidence="high", basis="flat face, the one clear contact pair",
        surface_class="planar",
    )
    fields.update(extra)
    return FeatureIdentityEvent(**fields)


def _accept(event_id, seq, proposal, **extra):
    fields = dict(
        event_id=event_id, seq=seq, created_at="2026-10-28T01:00:00Z", recorded_by=_HUMAN,
        stack_key=proposal.stack_key, verdict="bound", geometry_key=proposal.geometry_key,
        direction=proposal.direction, ratifies=proposal.event_id,
    )
    fields.update(extra)
    return FeatureIdentityEvent(**fields)


def _reject(event_id, seq, proposal, **extra):
    fields = dict(
        event_id=event_id, seq=seq, created_at="2026-10-28T01:00:00Z", recorded_by=_HUMAN,
        stack_key=proposal.stack_key, verdict="rejected", rejects=proposal.event_id,
    )
    fields.update(extra)
    return FeatureIdentityEvent(**fields)


def test_the_proposal_confidences_are_three_words():
    assert PROPOSAL_CONFIDENCES == ("high", "medium", "low")


def test_a_proposal_never_stands_as_a_binding():
    """Value-level: no binding, one open proposal, and the state says `proposed`."""
    record = _record(build_projection([_proposed("p1", 1, 110, "from")]))
    assert record.bindings == []
    assert [e.event_id for e in record.proposals] == ["p1"]
    assert record.state == "proposed"
    as_dict = record.as_dict()
    assert as_dict["bindings"] == [] and as_dict["state"] == "proposed"
    assert [e["event_id"] for e in as_dict["proposals"]] == ["p1"]


def test_an_accept_makes_the_proposed_face_a_binding_and_closes_the_proposal():
    p = _proposed("p1", 1, 110, "from")
    record = _record(build_projection([p, _accept("a1", 2, p)]))
    assert [e.event_id for e in record.bindings] == ["a1"]
    assert record.bindings[0].geometry_key.face_id == 110
    assert record.bindings[0].recorded_by == _HUMAN
    assert record.proposals == []
    assert [e.event_id for e in record.accepted_proposals] == ["p1"]
    assert record.state == "bound"


def test_a_reject_hides_the_proposal_and_remembers_the_face():
    p = _proposed("p1", 1, 110, "from")
    projection = build_projection([p, _reject("r1", 2, p)])
    record = _record(projection)
    assert record.bindings == [] and record.proposals == []
    assert [e.event_id for e in record.rejected_proposals] == ["p1"]
    assert record.rejected_faces() == {(_SHA, 110)}
    assert record.state == "unbound"
    assert [e.event_id for e in record.history] == ["p1", "r1"]
    counts = projection.counts()
    assert (counts["proposed"], counts["rejected"], counts["bound"], counts["open_proposals"]) == (1, 1, 0, 0)


def test_the_projection_counts_proposals_apart_from_bindings():
    p1 = _proposed("p1", 1, 110, "from")
    p2 = _proposed("p2", 2, 111, "to")
    data = build_projection([p1, p2, _accept("a1", 3, p1)]).as_dict()
    assert data["counts"]["bound"] == 1
    assert data["counts"]["proposed"] == 2
    assert data["counts"]["open_proposals"] == 1
    assert data["built_from_events"] == ["p1", "p2", "a1"]


def test_a_proposal_requires_confidence_basis_and_surface_class():
    with pytest.raises(ValueError, match="confidence"):
        _proposed("p", 1, 1, "from", confidence="certain")
    with pytest.raises(ValueError, match="basis"):
        _proposed("p", 1, 1, "from", basis="  ")
    with pytest.raises(ValueError, match="one line"):
        _proposed("p", 1, 1, "from", basis="two\nlines")
    with pytest.raises(ValueError, match="surface_class"):
        _proposed("p", 1, 1, "from", surface_class="conical")


def test_proposal_fields_are_refused_on_any_other_verdict():
    with pytest.raises(ValueError, match="only a proposed event may carry confidence"):
        FeatureIdentityEvent(**{**_bound("b", 1, 1, "from").__dict__, "confidence": "high"})


def test_an_agent_may_not_bind_or_reject():
    p = _proposed("p1", 1, 110, "from")
    with pytest.raises(ValueError, match="agent only proposes"):
        _accept("a1", 2, p, recorded_by=_AGENT)
    with pytest.raises(ValueError, match="agent only proposes"):
        _reject("r1", 2, p, recorded_by=_AGENT)


def test_a_rejected_event_needs_its_proposal_and_carries_no_face():
    key = StackKey(kind="topology_edge", topology_id="t", edge_id="e")
    with pytest.raises(ValueError, match="requires rejects"):
        FeatureIdentityEvent(event_id="r", seq=2, created_at="x", recorded_by=_HUMAN,
                             stack_key=key, verdict="rejected")
    with pytest.raises(ValueError, match="no geometry_key"):
        FeatureIdentityEvent(event_id="r", seq=2, created_at="x", recorded_by=_HUMAN,
                             stack_key=key, verdict="rejected", rejects="p",
                             geometry_key=GeometryKey(_SHA, 1, 1.0, (0.0, 0.0, 0.0)))


def test_an_accept_must_bind_the_face_and_end_that_were_proposed():
    p = _proposed("p1", 1, 110, "from")
    other_face = GeometryKey(_SHA, 111, 1.0, (0.0, 0.0, 0.0))
    with pytest.raises(ValueError, match="different face or end"):
        build_projection([p, _accept("a1", 2, p, geometry_key=other_face)])
    with pytest.raises(ValueError, match="different face or end"):
        build_projection([p, _accept("a1", 2, p, direction="to")])


def test_an_answer_naming_no_proposal_or_a_binding_fails_naming_both_ids():
    p = _proposed("p1", 1, 110, "from")
    with pytest.raises(ValueError, match=r"'r1'.*'ghost'"):
        build_projection([_reject("r1", 2, p, rejects="ghost")])
    with pytest.raises(ValueError, match=r"'r1'.*'b1'.*not a proposal"):
        build_projection([_bound("b1", 1, 110, "from"), _reject("r1", 2, p, rejects="b1")])


def test_a_proposal_answered_twice_is_a_load_error():
    p = _proposed("p1", 1, 110, "from")
    with pytest.raises(ValueError, match="answered twice"):
        build_projection([p, _accept("a1", 2, p), _reject("r1", 3, p)])


def test_proposal_and_answer_fields_round_trip():
    p = _proposed("p1", 1, 110, "from", contact_rank=2)
    back = FeatureIdentityEvent.from_dict(p.as_dict())
    assert (back.confidence, back.basis, back.surface_class, back.contact_rank) == (
        "high", p.basis, "planar", 2)
    assert FeatureIdentityEvent.from_dict(_accept("a1", 2, p).as_dict()).ratifies == "p1"
    assert FeatureIdentityEvent.from_dict(_reject("r1", 2, p).as_dict()).rejects == "p1"
    assert "confidence" not in _bound("b", 1, 1, "from").as_dict()


# ---------------------------------------------------------------------------
# A model that reuses another's ids writes on the source model's key
# ---------------------------------------------------------------------------

# The annotator's own modules, loaded as apps/annotate/run_tests.cjs loads
# them, then every answer path run against a read-through record: v2 open,
# v1's record read as v2's (AA.identityReadThrough), the key each event is
# written under from AA.identityKey -- exactly what app.js does on each path.
_ANSWER_PATHS_JS = r"""
const vm = require("vm"), fs = require("fs"), path = require("path");
const here = path.join(process.argv[1], "apps", "annotate");
const box = { console }; box.window = box; vm.createContext(box);
for (const f of ["../viewer/storage/adapter.js", "../viewer/vocab.gen.js", "config.js",
                 "binding_state.js", "commands.js", "face_geometry.js", "suggestions.js", "sweep.js"]) {
  vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), box, { filename: f });
}
const AA = box.AnnotateApp;
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const v1 = { id: "v1", ids_from: null, edges: [{ id: "shared" }] };
const v2 = { id: "v2", ids_from: "v1", edges: [{ id: "shared" }, { id: "new_edge" }] };
const read = AA.identityReadThrough(input.projection, v2);
const record = AA.findBindingRecord(read, AA.topologyEdgeKey("v2", "shared"));
const stackKey = AA.identityKey(v2, "shared", [v2, v1]);
const face = (id) => ({ sourceStepSha256: "f".repeat(64), faceId: id, areaNative2: 1.0,
                        centroidNative: [0, 0, 0] });
let seq = input.next_seq;
const write = (name, plan) => {
  const events = AA.buildAnswerEvents(plan, { eventId: "v2-" + name, seq,
    createdAt: "2026-11-08T00:00:00Z", recordedBy: AA.humanActor("tester") });
  return [name, events];
};
const open = AA.endProposals(record, "to");
const out = [
  write("accept", AA.planAnswer("accept", { proposal: open[0], standing: AA.endBindings(record, "to") })),
  write("reject", AA.planAnswer("reject", { proposal: open[0] })),
  write("take_a_different_face", AA.planAnswer("pick", { pick: { geometryKey: face(7), direction: "from",
    stackKey }, open: AA.endProposals(record, "from"), standing: AA.endBindings(record, "from") })),
  write("take_with_open_proposals", AA.planAnswer("pick", { pick: { geometryKey: face(8), direction: "to",
    stackKey }, open, standing: AA.endBindings(record, "to") })),
];
process.stdout.write(JSON.stringify({ new_edge_key: AA.identityKey(v2, "new_edge", [v2, v1]),
                                      paths: Object.fromEntries(out) }));
"""


def test_every_answer_on_a_shared_id_writes_events_the_fold_accepts():
    """Under ``ids_from`` (docs/DAG_TOPOLOGY.md, "Models") a v2 edge that
    reuses a v1 id reads v1's record. Every event an answer there writes
    -- accept, reject, take a different face, take with proposals open --
    names events on that record (``supersedes``, ``ratifies``, ``rejects``),
    and the fold refuses a pointer across keys. So each is written on v1's
    key, and folding the log plus that answer must succeed and leave v2 no
    record of its own on the shared id. The review of 2026-11-08 found Take
    and the armed click writing v2's key: one click and the log could not be
    rebuilt."""
    import shutil
    import subprocess

    node = shutil.which("node")
    assert node, "node is not on PATH, so the annotator's answer paths were not run"

    def key(topology_id: str) -> StackKey:
        return StackKey(kind="topology_edge", topology_id=topology_id, edge_id="shared")

    def face(face_id: int) -> GeometryKey:
        return GeometryKey(source_step_sha256="f" * 64, face_id=face_id, area_native2=1.0,
                           centroid_native=(0.0, 0.0, 0.0))

    from tolerance_stack.feature_geometry import SURFACE_CLASSES

    base = [
        FeatureIdentityEvent(event_id="v1-bound-from", seq=1, created_at="2026-11-01T00:00:00Z",
                             recorded_by="human:tester", stack_key=key("v1"), verdict="bound",
                             geometry_key=face(1), direction="from", note="synthetic"),
        FeatureIdentityEvent(event_id="v1-proposed-to", seq=2, created_at="2026-11-01T00:00:00Z",
                             recorded_by="agent:test", stack_key=key("v1"), verdict="proposed",
                             geometry_key=face(2), direction="to", confidence=PROPOSAL_CONFIDENCES[0],
                             basis="synthetic", surface_class=SURFACE_CLASSES[0], note="synthetic"),
    ]
    stdin = json.dumps({"projection": build_projection(base).as_dict(), "next_seq": 3})
    proc = subprocess.run([node, "-e", _ANSWER_PATHS_JS, str(Path(__file__).resolve().parent.parent)],
                          input=stdin, capture_output=True, text=True, encoding="utf-8", timeout=60)
    assert proc.returncode == 0, proc.stderr
    written = json.loads(proc.stdout)

    assert written["new_edge_key"]["topology_id"] == "v2", "an edge only v2 has keeps v2's key"
    assert set(written["paths"]) == {"accept", "reject", "take_a_different_face",
                                     "take_with_open_proposals"}
    for name, dicts in written["paths"].items():
        events = [FeatureIdentityEvent.from_dict(d) for d in dicts]
        assert events, f"{name} wrote nothing"
        assert {e.stack_key.topology_id for e in events} == {"v1"}, (
            f"{name} wrote on {[e.stack_key.topology_id for e in events]}, not the source model's key")
        projection = build_projection(base + events)  # raises on a pointer across keys
        assert projection.for_stack_key(key("v2")) is None, f"{name} gave v2 a record of its own"
    taken = build_projection(base + [FeatureIdentityEvent.from_dict(d)
                                     for d in written["paths"]["take_a_different_face"]])
    assert [b.geometry_key.face_id for b in taken.for_stack_key(key("v1")).bindings
            if b.direction == "from"] == [7], "the re-pick replaced v1's binding at that end"
