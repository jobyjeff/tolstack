"""The browser's feature-identity fold is Python's fold, record for record.

Since 2026-11-12 (handoff ``a_binding_shows_the_moment_it_is_made_and_is_
corrected_where_it_is_shown``) both pages read the LOG and fold it in
``apps/viewer/identity_fold.js`` -- the built projection is a snapshot, and a
page that read only it lost every binding made since the last rebuild. Two
folds of one log is the drift this repo's rules exist to stop, so this folds
one log both ways and compares every record list by event id, plus the
counts. The log exercises each thing the fold does: a correction, an unbind,
an accept, a reject, a repeated accept (``restated``), a correction naming the
repeat, an ``owner_not_in_set``, a seq two events claim, and the tracked
fixtures. It also folds, in Python, the events the annotator's own builders
write for an unbind and a flip -- an event the page writes that Python refuses
would stop the rebuild rail.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from tolerance_stack.feature_geometry import SURFACE_CLASSES
from tolerance_stack.feature_identity import (
    PROPOSAL_CONFIDENCES,
    VERDICTS,
    FeatureIdentityEvent,
    FeatureKey,
    GeometryKey,
    StackKey,
    build_projection,
    load_events,
)

REPO = Path(__file__).resolve().parent.parent
FIXTURES = REPO / "tests" / "fixtures" / "feature_identity_events"

_JS = r"""
const vm = require("vm"), fs = require("fs"), path = require("path");
const repo = process.argv[1];
const box = { console }; box.window = box; vm.createContext(box);
for (const f of ["apps/viewer/vocab.gen.js", "apps/viewer/identity_fold.js", "apps/annotate/config.js",
                 "apps/annotate/binding_state.js"]) {
  vm.runInContext(fs.readFileSync(path.join(repo, f), "utf8"), box, { filename: f });
}
const AA = box.AnnotateApp;
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const folded = AA.foldEvents(input.events);
const row = folded.stack_keys.find((r) => r.stack_key.edge_id === "flip_me");
const binding = row.bindings[0];
const fields = (id, seq) => ({ eventId: id, seq, createdAt: "2026-11-12T03:00:00Z",
                               recordedBy: AA.humanActor("tester") });
const flip = AA.buildCorrectionEvent(binding, Object.assign(fields("js-flip", 900),
  { direction: AA.otherDirection(binding.direction) }));
const unbind = AA.buildRetractEvent(flip, fields("js-unbind", 901));
process.stdout.write(JSON.stringify({ folded, written: [flip, unbind] }));
"""

_SHA = "cd" * 32
_HUMAN = "annotate-app:tester"


def _key(edge: str) -> StackKey:
    return StackKey(kind="topology_edge", topology_id="vpa_end_stop_v2", edge_id=edge)


def _face(face_id: int) -> GeometryKey:
    return GeometryKey(_SHA, face_id, 1.0, (0.0, 0.0, 0.0))


def _event(event_id, seq, edge, verdict, **extra) -> FeatureIdentityEvent:
    return FeatureIdentityEvent(event_id=event_id, seq=seq, created_at=extra.pop("at", "2026-11-12T00:00:00Z"),
                                recorded_by=extra.pop("by", _HUMAN), stack_key=_key(edge), verdict=verdict,
                                **extra)


def _log():
    proposal = dict(by="agent:tests", confidence=PROPOSAL_CONFIDENCES[0], basis="synthetic",
                    surface_class=SURFACE_CLASSES[0])
    return load_events(FIXTURES) + [
        _event("b1", 10, "corrected", "bound", geometry_key=_face(1), direction="from"),
        _event("b2", 11, "corrected", "bound", geometry_key=_face(2), direction="from", supersedes="b1"),
        _event("u1", 12, "unbound", "bound", geometry_key=_face(3), direction="to"),
        _event("u2", 13, "unbound", "retracted", retracts="u1"),
        _event("p1", 14, "accepted", "proposed", geometry_key=_face(4), direction="to", **proposal),
        _event("a1", 15, "accepted", "bound", geometry_key=_face(4), direction="to", ratifies="p1"),
        # the same accept again (restated), then a correction naming the repeat
        _event("a2", 16, "accepted", "bound", geometry_key=_face(4), direction="to", ratifies="p1"),
        _event("a3", 17, "accepted", "bound", geometry_key=_face(5), direction="to", supersedes="a2"),
        _event("p2", 18, "rejected", "proposed", geometry_key=_face(6), direction="from", **proposal),
        _event("r1", 19, "rejected", "rejected", rejects="p2"),
        _event("p3", 20, "open", "proposed", geometry_key=_face(7), direction="from", **proposal),
        _event("o1", 21, "owner", "owner_not_in_set"),
        # one seq two events claim: folded in the order they were written
        _event("c2", 22, "collide", "bound", geometry_key=_face(9), direction="to", at="2026-11-12T02:00:00Z"),
        _event("c1", 22, "collide", "bound", geometry_key=_face(8), direction="from", at="2026-11-12T01:00:00Z"),
        _event("f1", 23, "flip_me", "bound", geometry_key=_face(10), direction="from"),
    ]


def _ids(record_list):
    return [e if isinstance(e, str) else e["event_id"] for e in record_list]


def _run_js(events):
    node = shutil.which("node")
    assert node, "node is not on PATH, so the browser's fold was not run"
    proc = subprocess.run([node, "-e", _JS, str(REPO)], input=json.dumps({"events": events}),
                          capture_output=True, text=True, encoding="utf-8", timeout=60)
    assert proc.returncode == 0, proc.stderr
    return json.loads(proc.stdout)


def test_the_browser_fold_equals_pythons_record_for_record():
    events = _log()
    python = build_projection(events).as_dict()
    js = _run_js([e.as_dict() for e in events])["folded"]

    def by_key(doc):
        return {json.dumps(r["stack_key"], sort_keys=True): r for r in doc["stack_keys"]}

    py_rows, js_rows = by_key(python), by_key(js)
    assert sorted(py_rows) == sorted(js_rows)
    lists = ("bindings", "superseded", "retracted", "proposals", "rejected_proposals",
             "accepted_proposals", "owner_not_in_set", "history")
    for key, py in py_rows.items():
        for name in lists:
            assert _ids(js_rows[key][name]) == _ids(py[name]), f"{key}: {name}"
        assert js_rows[key]["state"] == py["state"], key
    assert js["built_from_events"] == python["built_from_events"]
    assert js["counts"] == python["counts"]
    assert set(python["counts"]) == set(VERDICTS) | {"open_proposals"}

    # the values the log was built to show, so a shared mistake is caught too
    rows = {r["stack_key"].get("edge_id"): r for r in python["stack_keys"]}
    assert _ids(rows["corrected"]["bindings"]) == ["b2"] and _ids(rows["corrected"]["superseded"]) == ["b1"]
    assert _ids(rows["unbound"]["bindings"]) == [] and _ids(rows["unbound"]["retracted"]) == ["u1"]
    assert rows["unbound"]["state"] == "unbound"
    assert _ids(rows["accepted"]["bindings"]) == ["a3"] and _ids(rows["accepted"]["superseded"]) == ["a1"]
    assert _ids(rows["collide"]["bindings"]) == ["c1", "c2"]
    assert python["counts"]["retracted"] == 1


def test_an_unbind_and_a_flip_the_annotator_writes_fold_in_python():
    events = _log()
    written = [FeatureIdentityEvent.from_dict(d) for d in _run_js([e.as_dict() for e in events])["written"]]
    assert [e.verdict for e in written] == ["bound", "retracted"]
    record = build_projection(events + written).for_stack_key(_key("flip_me"))
    assert [e.event_id for e in record.superseded] == ["f1"]
    assert [e.event_id for e in record.retracted] == ["js-flip"]
    assert record.retracted[0].direction == "to", "the flip moved the face to the other end"
    assert record.bindings == [] and record.state == "unbound"


def test_the_served_log_is_where_and_what_every_reader_says_it_is():
    """One path, one schema, one message name -- each written in Python and in
    both apps, so each pair is read here rather than trusted."""
    from tolerance_stack import feature_identity as fi

    viewer = (REPO / "apps" / "viewer" / "config.js").read_text(encoding="utf-8")
    annotate = (REPO / "apps" / "annotate" / "config.js").read_text(encoding="utf-8")
    binding_state = (REPO / "apps" / "annotate" / "binding_state.js").read_text(encoding="utf-8")
    topology = (REPO / "apps" / "viewer" / "topology.js").read_text(encoding="utf-8")
    sub = fi.SERVED_LOG_SUBDIR.parts
    assert sub[:2] == ("projections", "viewer"), "the log is under the one directory drawing-checker serves"
    under_viewer = list(sub[2:]) + [fi.SERVED_LOG_NAME]
    quoted = lambda parts: "[" + ", ".join(f'"{p}"' for p in parts) + "]"
    assert f"identityLog: {quoted(under_viewer)}" in viewer
    assert f"servedIdentityLog: {quoted(['data', *sub, fi.SERVED_LOG_NAME])}" in annotate
    assert f'AA.SERVED_LOG_SCHEMA = "{fi.SCHEMA_SERVED_LOG}"' in binding_state
    message = 'AA.IDENTITY_MESSAGE = "annotate:identity"'
    assert message in binding_state and 'VA.SCENE_IDENTITY_MESSAGE = "annotate:identity"' in topology


def test_the_builder_writes_the_served_log_beside_the_projection(tmp_path):
    from tolerance_stack.feature_identity import SCHEMA_SERVED_LOG, main

    data_root = tmp_path / "data"
    events_dir = data_root / "inbox" / "feature-identity"
    events_dir.mkdir(parents=True)
    for event in _log()[-4:]:
        (events_dir / f"{event.seq:04d}_{event.event_id}.json").write_text(
            json.dumps(event.as_dict()), encoding="utf-8")
    (data_root / "meshes" / ("ab" * 32)).mkdir(parents=True)
    (data_root / "meshes" / ("ab" * 32) / "provenance.json").write_text("{}", encoding="utf-8")
    (data_root / "meshes" / "no_provenance").mkdir()
    assert main(["--data-root", str(data_root)]) == 0
    log = json.loads((data_root / "projections" / "viewer" / "feature-identity" / "log.json")
                     .read_text(encoding="utf-8"))
    assert log["schema"] == SCHEMA_SERVED_LOG
    assert [e["event_id"] for e in log["events"]] == ["o1", "c1", "c2", "f1"], "in log order"
    assert log["installed_meshes"] == ["ab" * 32]


# ---------------------------------------------------------------------------
# the feature fold (handoff a_feature_is_bound_once_to_a_set_of_faces)
# ---------------------------------------------------------------------------

_FEATURE_JS = r"""
const vm = require("vm"), fs = require("fs"), path = require("path");
const repo = process.argv[1];
const box = { console }; box.window = box; vm.createContext(box);
for (const f of ["apps/viewer/vocab.gen.js", "apps/viewer/identity_fold.js"]) {
  vm.runInContext(fs.readFileSync(path.join(repo, f), "utf8"), box, { filename: f });
}
const VA = box.ViewerApp;
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const folded = VA.foldIdentityEvents(input.events, input.verdicts,
  { topologies: input.topologies, sameSurface: input.sameSurface });
const v2 = input.topologies.find((t) => t.id === "vpa_end_stop_v2");
const ends = VA.endView(folded, v2).stack_keys.map((r) => ({ edge: r.stack_key.edge_id,
  bindings: r.bindings.map((b) => [b.direction, b.geometry_key.face_id]) }));
process.stdout.write(JSON.stringify({ folded, ends }));
"""

_V1, _V2 = "vpa_pitch_linkage", "vpa_end_stop_v2"
# Faces 1 and 2 are one surface; 3, 4, 5 are each their own.
_SURFACES = {
    1: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 0], "radius": 20.0, "extent": 9},
    2: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 9], "radius": 20.0, "extent": 9},
    3: {"surface": "cylindrical", "axis": [0, 0, 1], "axis_point": [0, 0, 0], "radius": 9.0, "extent": 9},
}


def _old(event_id, seq, topology, edge, verdict, direction=None, face=None, **extra):
    if verdict == "proposed":
        extra = dict(dict(confidence=PROPOSAL_CONFIDENCES[0], basis="synthetic",
                          surface_class=SURFACE_CLASSES[1], by="agent:tests"), **extra)
    return FeatureIdentityEvent(
        event_id=event_id, seq=seq, created_at="2026-11-12T00:00:00Z", recorded_by=extra.pop("by", _HUMAN),
        stack_key=StackKey(kind="topology_edge", topology_id=topology, edge_id=edge), verdict=verdict,
        geometry_key=_face(face) if face is not None else None, direction=direction, **extra)


def _new(event_id, seq, part, node, verdict, faces=(), topology=_V1, **extra):
    if verdict == "proposed":
        extra = dict(dict(confidence=PROPOSAL_CONFIDENCES[1], basis="synthetic",
                          surface_class=SURFACE_CLASSES[1], by="agent:tests"), **extra)
    return FeatureIdentityEvent(
        event_id=event_id, seq=seq, created_at="2026-11-12T00:00:00Z", recorded_by=extra.pop("by", _HUMAN),
        stack_key=None, feature_key=FeatureKey(topology, part, node), verdict=verdict,
        geometry_keys=tuple(_face(f) for f in faces) if faces else None, **extra)


def _feature_log():
    return [
        # one face from two ends of two models: the hub's locating boss
        _old("h1", 1, _V1, "hub_to_pitch_plate_spindle_coaxiality", "bound", "from", 1),
        _old("h2", 2, _V2, "hub_boss_in_tan_link_mount_pilot", "bound", "from", 1),
        # two faces on one surface: the plate's spindle bore, from two dimensions
        _old("s1", 3, _V1, "hub_to_pitch_plate_spindle_coaxiality", "bound", "to", 1),
        _old("s2", 4, _V1, "pitch_plate_attach_radius", "bound", "from", 2),
        # two faces that are not one surface: the pitch link's lower centre
        _old("d1", 5, _V1, "pitch_link_length", "bound", "from", 1),
        _old("d2", 6, _V1, "pitch_link_lower_centre_is_this_bearing", "bound", "to", 3),
        # ...and the upper centre's disagreement, settled with Keep
        _old("k1", 7, _V1, "pitch_link_length", "bound", "to", 4),
        _old("k2", 8, _V1, "pitch_link_upper_centre_is_this_bearing", "bound", "to", 5),
        _new("keep", 9, "pitch_link", "pitch_link_upper_sphere_centre", "bound", (5,)),
        # an edge-end proposal accepted by the feature, with a face beside it
        _old("p1", 10, _V1, "tan_link_length", "proposed", "from", 4),
        _new("a1", 11, "tan_link_212956_005", "tan_link_lower_sphere_centre", "bound", (4, 5), ratifies="p1"),
        # ...and one rejected by the feature
        _old("p2", 12, _V1, "tan_link_length", "proposed", "to", 3),
        _new("r1", 13, "tan_link_212956_005", "tan_link_upper_sphere_centre", "rejected", rejects="p2"),
        # a feature's own proposal, still open
        _new("p3", 14, "tan_link_212956_005", "tan_link_upper_sphere_centre", "proposed", (2,)),
        # the hub boss unbound by the feature (a v1 retraction of an old binding)
        _new("u1", 15, "hub", "hub_spindle_bore_axis", "retracted", retracts="h1"),
        # a feature-keyed correction chain: bind a set, drop a face
        _new("c1", 16, "pitch_plate_215177_001", "pitch_plate_spindle_bore_axis", "bound", (1, 2, 3)),
        _new("c2", 17, "pitch_plate_215177_001", "pitch_plate_spindle_bore_axis", "bound", (1, 2), supersedes="c1"),
        # an old event whose edge is gone
        _old("gone", 18, _V1, "no_such_edge", "bound", "from", 1),
    ]


def _topology_projection():
    import importlib
    import sys
    sys.path.insert(0, str(REPO / "scripts"))
    builder = importlib.import_module("build_topology_projection")
    return builder.build(REPO / "docs" / "topologies", provenance={
        "schema": "joby.tolerance_stack/projection_provenance/v0", "built_at": "2026-11-12T00:00:00+00:00",
        "built_by": builder.BUILT_BY, "branch": "test", "head_sha": "0" * 40, "dirty": False})["topologies"]


def test_the_browser_feature_fold_equals_pythons_feature_for_feature():
    from tolerance_stack.feature_identity import FEATURE_OUTCOMES, load_models

    events = _feature_log()
    projection = build_projection(events, load_models(REPO / "docs" / "topologies"),
                                  lambda key: _SURFACES.get(key.face_id))
    python = projection.as_dict()
    node = shutil.which("node")
    assert node, "node is not on PATH, so the browser's fold was not run"
    proc = subprocess.run([node, "-e", _FEATURE_JS, str(REPO)], capture_output=True, text=True,
                          encoding="utf-8", timeout=120,
                          input=json.dumps({"events": [e.as_dict() for e in events], "verdicts": list(VERDICTS),
                                            "topologies": _topology_projection(),
                                            "sameSurface": [list(p) for p in projection.same_surface]}))
    assert proc.returncode == 0, proc.stderr
    out = json.loads(proc.stdout)
    js = out["folded"]

    def token(k):
        return f"{k['topology_id']}:{k['part']}@{k['node']}"

    def faces(fs):
        return [f"{f['source_step_sha256'][:4]}:{f['face_id']}" for f in fs]

    py_rows = {token(r["feature_key"]): r for r in python["features"]}
    js_rows = {token(r["feature_key"]): r for r in js["features"]}
    assert list(py_rows) == list(js_rows), "the same features, in the same order"
    for key, py in py_rows.items():
        mine = js_rows[key]
        for name in ("state", "outcome", "read_through", "history", "accepted_proposals"):
            assert mine[name] == py[name], f"{key}: {name}"
        assert faces(mine["faces"]) == faces(py["faces"]), f"{key}: faces"
        for name in ("bindings", "proposals", "rejected_proposals", "superseded", "retracted", "replaced",
                     "owner_not_in_set"):
            assert _ids(mine[name]) == _ids(py[name]), f"{key}: {name}"
        assert [(faces(g["faces"]), g["events"]) for g in mine["disagreement"]] == \
            [(faces(g["faces"]), g["events"]) for g in py["disagreement"]], f"{key}: disagreement"
    assert js["orphans"] == python["orphans"]
    for name, value in python["summary"].items():
        assert js["summary"][name] == value, name

    # the values the log was built to show, so a shared mistake is caught too
    one, a_set, disagree = FEATURE_OUTCOMES
    rows = {key.split("@")[1]: r for key, r in py_rows.items()}
    assert rows["hub_spindle_bore_axis"]["state"] == "unbound", "the feature's unbind took the old binding back"
    assert _ids(rows["hub_spindle_bore_axis"]["replaced"]) == ["h2"]
    assert (rows["pitch_plate_spindle_bore_axis"]["outcome"], faces(rows["pitch_plate_spindle_bore_axis"]["faces"])) \
        == (a_set, ["cdcd:1", "cdcd:2"])
    assert _ids(rows["pitch_plate_spindle_bore_axis"]["replaced"]) == ["s1", "s2"]
    assert rows["pitch_link_lower_sphere_centre"]["state"] == "disagreement"
    assert (rows["pitch_link_upper_sphere_centre"]["outcome"], _ids(rows["pitch_link_upper_sphere_centre"]["bindings"])) \
        == (one, ["keep"])
    assert rows["tan_link_lower_sphere_centre"]["accepted_proposals"] == ["p1"]
    assert _ids(rows["tan_link_upper_sphere_centre"]["rejected_proposals"]) == ["p2"]
    assert _ids(rows["tan_link_upper_sphere_centre"]["proposals"]) == ["p3"]
    assert python["orphans"] == [{"event_id": "gone", "reason": "no_edge"}]

    # an end asks its feature: on v2, the pilot's hub end is the hub boss,
    # and nothing is bound there any more; the plate's bore reads both faces
    # at every end that is it
    ends = {e["edge"]: e["bindings"] for e in out["ends"]}
    assert "hub_boss_in_tan_link_mount_pilot" not in ends or \
        all(d != "from" for d, _ in ends["hub_boss_in_tan_link_mount_pilot"])


def test_the_annotators_feature_writes_fold_in_python():
    """The v1 events the annotator's builders write -- a pick's set, a Keep, a
    correction, an unbind, an accept and a reject on a feature -- load and
    fold in Python."""
    js = r"""
const vm = require("vm"), fs = require("fs"), path = require("path");
const repo = process.argv[1];
const box = { console }; box.window = box; vm.createContext(box);
for (const f of ["apps/viewer/vocab.gen.js", "apps/viewer/identity_fold.js", "apps/annotate/config.js",
                 "apps/annotate/binding_state.js"]) {
  vm.runInContext(fs.readFileSync(path.join(repo, f), "utf8"), box, { filename: f });
}
const AA = box.AnnotateApp;
const key = { topology_id: "vpa_pitch_linkage", part: "hub", node: "hub_spindle_bore_axis" };
const face = (id) => ({ sourceStepSha256: "cd".repeat(32), faceId: id, areaNative2: 1, centroidNative: [0, 0, 0] });
const f = (id, seq) => ({ eventId: id, seq, createdAt: "2026-11-12T03:00:00Z", recordedBy: AA.humanActor("tester") });
const bound = AA.buildBoundEvent(Object.assign(f("w1", 1), { featureKey: key, geometryKeys: [face(1), face(2)] }));
const fix = AA.buildCorrectionEvent(Object.assign({}, bound), Object.assign(f("w2", 2), { geometryKeys: [face(1)] }));
const unbind = AA.buildRetractEvent(fix, f("w3", 3));
const proposal = { verdict: "proposed", event_id: "p", feature_key: key, geometry_keys: [
  { source_step_sha256: "cd".repeat(32), face_id: 7, area_native2: 1, centroid_native: [0, 0, 0] }] };
const accept = AA.buildAcceptEvent(proposal, Object.assign(f("w4", 5), { geometryKeys: [face(8)] }));
const reject = AA.buildRejectEvent(Object.assign({}, proposal, { event_id: "q" }), f("w5", 7));
process.stdout.write(JSON.stringify([bound, fix, unbind, accept, reject]));
"""
    node = shutil.which("node")
    assert node
    proc = subprocess.run([node, "-e", js, str(REPO)], capture_output=True, text=True, encoding="utf-8", timeout=60)
    assert proc.returncode == 0, proc.stderr
    written = [FeatureIdentityEvent.from_dict(d) for d in json.loads(proc.stdout)]
    assert all(e.feature_key is not None for e in written)
    proposals = [_new("p", 4, "hub", "hub_spindle_bore_axis", "proposed", (7,)),
                 _new("q", 6, "hub", "hub_spindle_bore_axis", "proposed", (9,))]
    projection = build_projection(written + proposals)
    (record,) = projection.by_feature_subject.values()
    assert [e.event_id for e in record.superseded] == ["w1"]
    assert [e.event_id for e in record.retracted] == ["w2"]
    assert [e.event_id for e in record.bindings] == ["w4"]
    assert [f.face_id for f in record.bindings[0].faces] == [7, 8], "the proposed face first, the pick's beside it"
    assert [e.event_id for e in record.rejected_proposals] == ["q"]
