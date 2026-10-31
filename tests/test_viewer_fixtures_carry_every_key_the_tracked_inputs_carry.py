"""The viewer fixtures carry every key the tracked inputs carry -- no projection needed.

``fixture_drift`` has been sighted four times (2026-09-09, 09-24, 10-26,
10-29): a tracked input gains a key and the only guard that notices is the
viewer's ``[real]`` shape check, which reads the gitignored
``data/projections/`` and so is skipped in every worktree. The 2026-10-29
instance (``display_name`` / ``naming_note``) was merged to integration red.

This asks the same question of the **tracked** inputs alone. It covers only the
keys a builder copies through *verbatim*:

* ``stacks[].stack`` is the authored stack file, whole
  (``build_viewer_projection.py``, ``"stack": raw``) -- so every top-level key
  any ``docs/tolerance_stacks/stack_*.json`` carries must appear on some
  ``stack`` in ``apps/viewer/fixtures.js``;
* ``topologies[].parts[]`` is ``dataclasses.asdict(Part)`` plus ``mesh``
  (``build_topology_projection.project_part``) -- so every ``Part`` field, and
  every key a tracked topology's ``parts[]`` row carries, must appear on a part
  in ``apps/viewer/topology_fixtures.js``.

Builder-*computed* keys (provenance counts, ``checks``, ``mesh`` facts, crop
states, ...) stay ``[real]``-only: nothing tracked states them, so only the
projection can say what the builder wrote. An archetype's own input block
(``thermal_fit``) is read by Python only, so it is named by the data, as the
``[real]`` check does, and not asked of the fixture.
"""
from __future__ import annotations

import dataclasses
import json
import shutil
import subprocess
from pathlib import Path

import pytest

from tolerance_stack.topology import Part

REPO = Path(__file__).resolve().parent.parent
STACKS_DIR = REPO / "docs" / "tolerance_stacks"
TOPOLOGIES_DIR = REPO / "docs" / "topologies"

#: The one key the topology projection adds to each ``Part`` row.
PART_COMPUTED_KEYS = ("mesh",)

_DUMP = r"""
const vm = require("vm"), fs = require("fs"), path = require("path");
const dir = process.argv[1];
// Only the data is read; `STATE` is the one viewer constant a fixture
// function reads at call time, so a stub stands in for viewer.js.
const sandbox = { window: { ViewerApp: { STATE: { READY: "ready" } } }, console: console };
vm.createContext(sandbox);
["fixtures.js", "topology_fixtures.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), sandbox, { filename: f });
});
const VA = sandbox.window.ViewerApp;
const stacks = [VA.demoFixture().results, VA.generatedFixture().results]
  .flatMap(function (r) { return r.stacks.map(function (s) { return s.stack; }); });
const topo = VA.demoTopologyProjection();
const parts = (topo.topologies || []).flatMap(function (t) { return t.parts; });
process.stdout.write(JSON.stringify({ stacks: stacks, parts: parts }));
"""


def _fixtures() -> dict:
    node = shutil.which("node")
    assert node, "node is required to read the viewer fixtures (a skip would hide the guard)"
    out = subprocess.run([node, "-e", _DUMP, str(REPO / "apps" / "viewer")],
                         capture_output=True, encoding="utf-8")
    assert out.returncode == 0, out.stderr
    return json.loads(out.stdout)


def _keys(rows) -> set:
    return {k for row in rows for k in row}


def _tracked_stacks() -> list:
    return [json.loads(p.read_text(encoding="utf-8"))
            for p in sorted(STACKS_DIR.glob("stack_*.json"))]


def _tracked_topology_parts() -> list:
    rows = []
    for p in sorted(TOPOLOGIES_DIR.glob("topology_*.json")):
        rows.extend(json.loads(p.read_text(encoding="utf-8")).get("parts", []))
    return rows


def test_every_key_a_tracked_stack_file_carries_is_on_a_fixture_stack():
    tracked = _tracked_stacks()
    assert tracked, "no tracked stack files found -- the guard would be vacuous"
    archetypes = {s["archetype"] for s in tracked if s.get("archetype")}
    missing = sorted(_keys(tracked) - archetypes - _keys(_fixtures()["stacks"]))
    assert not missing, (
        f"docs/tolerance_stacks/stack_*.json carries {missing} and no stack in "
        "apps/viewer/fixtures.js does -- add them there, so a fixture-tier test "
        "can pin how the viewer renders them (the [real] tier would say the same "
        "only where a projection exists)")


def test_every_part_key_the_topology_builder_writes_is_on_a_fixture_part():
    tracked = _tracked_topology_parts()
    assert tracked, "no tracked topology parts found -- the guard would be vacuous"
    fields = {f.name for f in dataclasses.fields(Part)}
    unread = sorted(_keys(tracked) - fields)
    assert not unread, (
        f"a tracked topology part carries {unread} that tolerance_stack.topology."
        "Part does not read -- the projection would drop it")
    missing = sorted((fields | set(PART_COMPUTED_KEYS)) - _keys(_fixtures()["parts"]))
    assert not missing, (
        f"the topology projection writes {missing} on every part and no part in "
        "apps/viewer/topology_fixtures.js carries it -- REGENERATE it (its header says how)")
