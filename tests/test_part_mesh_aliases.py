"""``docs/topologies/part_mesh_aliases.json``, paired against both of the
vocabularies it bridges.

The alias table (handoff ``mesh_part_alias_table``, consuming strategy brief
``BRIEF_20260909_topology_part_vocabulary_mesh_mapping`` option b) maps a
topology edge's ``part`` id to an installed mesh's ``provenance.json``
``part_id`` -- two namespaces with zero exact matches at lock time. A mapping
table is a third copy of words from two other vocabularies, which is exactly
this repo's most-repeated defect class (``docs/prompts/REVIEW_AGENT.md``,
"Documented vocabularies drifting from the seeded data"), so both sides are
paired here structurally:

* **topology side** -- every ``topology_part`` key must appear in a live
  topology's ``parts`` vocabulary (``docs/topologies/topology_*.json``,
  tracked, so this half runs everywhere);
* **mesh side** -- every ``mesh_part_id`` value must match an installed
  mesh's ``provenance.json`` ``part_id``. ``data/`` is gitignored and lives
  only in the main checkout (repo ``CLAUDE.md``), so this half resolves the
  repo-relative path first (main-checkout runs) and falls back to
  ``C:/workspace/tolstack/data/meshes`` (worktree runs), and **skips
  honestly** when neither holds an installed mesh -- the existing ``[real]``
  tier's posture: absent data is not a failure of this table.

``apps/annotate/run_tests.cjs`` covers the consumer side (resolution
precedence on fixtures, and a ``[real]`` check that each alias resolves
through ``resolveMeshIdentifier`` itself); this module owns the table's own
shape and its two pairings.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
ALIAS_FILE = TOPOLOGIES_DIR / "part_mesh_aliases.json"

ALIAS_SCHEMA = "joby.tolerance_stack/part_mesh_aliases/v0"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

#: Where installed meshes may live, in resolution order: the repo-relative
#: path (real when this suite runs in the main checkout), then the main
#: checkout absolute (a worktree's own data/ is empty by design -- repo
#: CLAUDE.md, "data/ is gitignored by design and shared by every worktree").
MESHES_DIR_CANDIDATES = (
    REPO_ROOT / "data" / "meshes",
    Path("C:/workspace/tolstack/data/meshes"),
)


def installed_meshes_dir() -> Path | None:
    for candidate in MESHES_DIR_CANDIDATES:
        if not candidate.is_dir():
            continue
        if any(SHA256_RE.match(child.name) for child in candidate.iterdir()):
            return candidate
    return None


@pytest.fixture(scope="module")
def table() -> dict:
    return json.loads(ALIAS_FILE.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def aliases(table) -> list[dict]:
    return table["aliases"]


def test_the_table_declares_its_schema_and_shape(table):
    assert table["schema"] == ALIAS_SCHEMA
    assert isinstance(table["aliases"], list)


def test_every_entry_is_complete_and_the_topology_keys_are_unique(aliases):
    """Each entry asserts an identity, so each entry carries its evidence --
    this repo's one rule applied to identity, not just to values. Values map
    to a mesh's ``part_id``, never its sha256 (the handoff's own requirement:
    a re-tessellated mesh under the same part identity keeps its aliases)."""
    seen: set[str] = set()
    for entry in aliases:
        for field in ("topology_part", "mesh_part_id", "evidence"):
            value = entry.get(field)
            assert isinstance(value, str) and value.strip(), (
                f"alias entry {entry!r} is missing a non-empty {field!r} -- "
                "an alias with no evidence is an invented identity"
            )
        assert not SHA256_RE.match(entry["mesh_part_id"]), (
            f"alias {entry['topology_part']!r} maps to a sha256 -- map to the "
            "mesh's provenance part_id so a re-tessellation keeps the alias"
        )
        assert entry["topology_part"] not in seen, (
            f"duplicate topology_part {entry['topology_part']!r} -- the first "
            "entry would silently win in resolveMeshIdentifier"
        )
        seen.add(entry["topology_part"])


def live_topology_part_ids() -> set[str]:
    ids: set[str] = set()
    for topology_file in sorted(TOPOLOGIES_DIR.glob("topology_*.json")):
        doc = json.loads(topology_file.read_text(encoding="utf-8"))
        ids.update(part["id"] for part in doc.get("parts", []))
    return ids


def test_the_topology_part_vocabulary_extraction_is_not_vacuous():
    """A scan that silently finds nothing makes the pairing below pass against
    anything -- the same anti-vacuity guard every pairing suite here opens
    with."""
    assert live_topology_part_ids(), (
        "found zero part ids across docs/topologies/topology_*.json -- the "
        "topology files moved or their parts vocabulary changed shape"
    )


def test_every_topology_side_key_is_a_live_topology_part(aliases):
    live = live_topology_part_ids()
    unknown = sorted(
        entry["topology_part"] for entry in aliases
        if entry["topology_part"] not in live
    )
    assert unknown == [], (
        f"alias table names topology parts no live topology declares: {unknown} -- "
        "the part was renamed or removed in docs/topologies/; update or drop the alias"
    )


@pytest.mark.skipif(
    installed_meshes_dir() is None,
    reason="no data/meshes/ with an installed mesh (gitignored, main checkout "
           "only -- see data/meshes/README.md); the mesh-side pairing needs real data",
)
def test_every_mesh_side_value_matches_an_installed_meshes_part_id(aliases):
    """[real] tier: runs against the main checkout's data/meshes/. A mesh
    removed or re-installed under a different part_id turns this red rather
    than silently orphaning an alias."""
    meshes_dir = installed_meshes_dir()
    installed: set[str] = set()
    for child in meshes_dir.iterdir():
        if not SHA256_RE.match(child.name):
            continue
        provenance_file = child / "provenance.json"
        if not provenance_file.is_file():
            continue
        provenance = json.loads(provenance_file.read_text(encoding="utf-8"))
        installed.add(provenance["part_id"])
    assert installed, (
        f"{meshes_dir} has mesh directories but no readable provenance.json "
        "part_ids -- the pairing below would pass vacuously against an empty set"
    )
    orphaned = sorted(
        f"{entry['topology_part']} -> {entry['mesh_part_id']}"
        for entry in aliases
        if entry["mesh_part_id"] not in installed
    )
    assert orphaned == [], (
        f"alias table names mesh part_ids with no installed mesh: {orphaned} -- "
        f"installed part_ids: {sorted(installed)}; update or remove the alias "
        "(docs/topologies/part_mesh_aliases.json)"
    )
