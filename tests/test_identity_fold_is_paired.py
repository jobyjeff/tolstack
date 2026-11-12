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
