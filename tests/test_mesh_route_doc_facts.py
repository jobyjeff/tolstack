"""``ARCHITECTURE.md`` and ``docs/ANNOTATION_SURFACE.md``, paired against
``data/meshes/`` on the mesh-route fact both used to get wrong.

Both documents described ``data/meshes/<sha>/`` as if every installed mesh
comes from tessellating a single per-part STEP file, and as if this repo
always copies the mesh output in. Measured 2026-09-16 from every installed
``provenance.json``'s ``produced_by``: **24 meshes, 22 from
``scripts/extract_assembly_parts.py`` (an assembly-STEP extraction, no
per-part STEP upstream and no copy step) and 2 from
``scripts/tessellate_parts.py`` (the single-part route, which does copy)** --
so the old wording was two of twenty-four, not the whole store. Neither the
documents nor this module re-transcribe that **count**: the declared value
is the set of route *commands*, re-read from the store, and
``data/meshes/README.md``'s own "What's here today" is the cautionary
instance of writing a count from this store into prose.

What this does not do any more
------------------------------

Until 2026-09-23 the pairing here was a **prose scan**: a named-phrase
allowlist ("STEP file"/"STEP export"/"STEP path", or this repo "copying"
the mesh output) crossed with a route-qualifier allowlist
(``single-part``, ``two routes``, ``one of two``, ...), failing any passage
that used the first with none of the second. Two allowlists over English,
which is the pattern ``REPORT_20260921_bug_pareto.md`` measured as C/C2 and
the 2026-09-23 refactor decision retired: it could only ever ask whether a
sentence was *shaped* like a whole-store claim, and both lists were open
ended -- a new phrasing on either side is a silent miss on one and a false
positive on the other.

Both documents **declare** the route set now, and the declaration is
compared against the store itself (``tests/claims_registry.py``, metric
``mesh_routes``: every ``produced_by.command`` across every installed
``provenance.json``). That is strictly stronger than the scan on the thing
that matters -- a third route appearing upstream reddens both declarations,
where the old scan would have gone on approving the word "two" forever --
and strictly weaker on prose, which is no longer read at all.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

#: Where installed meshes may live, in resolution order -- the repo-relative
#: path (real in the main checkout), then the main checkout absolute (a
#: worktree's own data/ is empty by design, repo CLAUDE.md: "data/ is
#: gitignored by design and shared by every worktree"). Mirrors
#: tests/test_part_mesh_aliases.py's MESHES_DIR_CANDIDATES.
MESHES_DIR_CANDIDATES = (
    REPO_ROOT / "data" / "meshes",
    Path("C:/workspace/tolstack/data/meshes"),
)
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")

# --------------------------------------------------------------------------- #
# 1. the declarations -- present, and in the passage that makes the claim     #
# --------------------------------------------------------------------------- #

#: The two documents that describe where a mesh comes from, and therefore the
#: two that must declare the route set rather than describe it. Curated for the
#: reason every presence check in this repo is: the evidence for "this document
#: stopped saying it" is absent from exactly the file you need to catch.
ROUTE_CLAIM_SOURCES = ("ARCHITECTURE.md", "docs/ANNOTATION_SURFACE.md")


def test_both_documents_declare_the_route_set():
    """Presence. Agreement is the ``mesh_routes`` deriver, asserted for every
    declaration in the tree by ``tests/test_claims_registry.py`` and skipped
    honestly in a worktree, where ``data/meshes/`` is gitignored away."""
    from tests.claims_registry import declarations_in_file

    silent = [rel for rel in ROUTE_CLAIM_SOURCES
              if not any(c.metric == "mesh_routes" for c in
                         declarations_in_file(REPO_ROOT / rel, rel))]
    assert silent == [], (
        f"{silent} describe where an installed mesh comes from and declare no "
        f"`mesh_routes` claim. 22 of 24 installed meshes have no per-part STEP "
        f"upstream at all (data/meshes/README.md, \"Two ways a mesh gets "
        f"here\"), which is the fact both documents once had wrong; a document "
        f"that stops declaring it is back to describing it."
    )


# --------------------------------------------------------------------------- #
# 3. the live route set -- [real] tier, skips honestly when data/ is absent   #
# --------------------------------------------------------------------------- #

def installed_meshes_dir() -> Path | None:
    for candidate in MESHES_DIR_CANDIDATES:
        if not candidate.is_dir():
            continue
        if any(SHA256_RE.match(child.name) for child in candidate.iterdir()):
            return candidate
    return None


def live_route_commands(meshes_dir: Path) -> set[str]:
    """The distinct ``produced_by.command`` values across every installed
    mesh's ``provenance.json`` -- the route discriminator
    ``data/meshes/README.md`` documents, read from the tree rather than
    counted here."""
    commands: set[str] = set()
    for child in sorted(meshes_dir.iterdir()):
        if not SHA256_RE.match(child.name):
            continue
        provenance_file = child / "provenance.json"
        if not provenance_file.is_file():
            continue
        provenance = json.loads(provenance_file.read_text(encoding="utf-8"))
        command = provenance.get("produced_by", {}).get("command")
        if command:
            commands.add(command)
    return commands


@pytest.mark.skipif(
    installed_meshes_dir() is None,
    reason="no data/meshes/ with an installed mesh (gitignored, main checkout "
           "only -- see data/meshes/README.md); this pairing needs real data",
)
def test_the_live_mesh_store_actually_has_two_routes():
    """[real]: the declared route set, grounded against the tree.

    The set is **read off the declaration** rather than written here: it is
    already stated in ``ARCHITECTURE.md`` and ``docs/ANNOTATION_SURFACE.md``,
    and a literal copy in this file would be a third place for it to be wrong
    -- the defect the whole registry exists against, committed by the guard
    that enforces it.

    If a third route script ever installs a mesh this goes red, naming both
    sides, which is the prompt to revisit those documents' framing.
    """
    from tests.claims_registry import declarations_in_file

    declared = {c.fields["value"] for rel in ROUTE_CLAIM_SOURCES
                for c in declarations_in_file(REPO_ROOT / rel, rel)
                if c.metric == "mesh_routes"}
    assert len(declared) == 1, (
        f"the two documents declare different route sets: {sorted(declared)}. "
        f"One of them is stale -- the registry checks each against the store, "
        f"so whichever disagrees is already named there."
    )
    expected = {part.strip() for part in declared.pop().split(",") if part.strip()}

    meshes_dir = installed_meshes_dir()
    commands = live_route_commands(meshes_dir)
    assert commands, (
        f"{meshes_dir} has mesh directories but no readable provenance.json "
        "produced_by.command -- the pairing below would pass vacuously"
    )
    assert commands == expected, (
        f"the live mesh store's routes are {sorted(commands)}; the documents "
        f"declare {sorted(expected)} -- a route was added, removed, or renamed "
        f"upstream in rotorkit"
    )
