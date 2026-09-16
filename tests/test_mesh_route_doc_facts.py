"""``ARCHITECTURE.md`` and ``docs/ANNOTATION_SURFACE.md``, paired against
``data/meshes/`` on the mesh-route fact both used to get wrong.

Both documents described ``data/meshes/<sha>/`` as if every installed mesh
comes from tessellating a single per-part STEP file, and as if this repo
always copies the mesh output in. Measured 2026-09-16 from every installed
``provenance.json``'s ``produced_by``: **24 meshes, 22 from
``scripts/extract_assembly_parts.py`` (an assembly-STEP extraction, no
per-part STEP upstream and no copy step) and 2 from
``scripts/tessellate_parts.py`` (the single-part route, which does copy)** --
so the old wording was two of twenty-four, not the whole store, and this
module is a scan against the CLAIM SHAPE, not a re-transcription of that
count (``data/meshes/README.md``'s own "What's here today" is exactly the
cautionary instance of writing a count from this store into prose).

Precedent and its rule
-----------------------

``tests/test_architecture_inventory.py`` is the shape this module copies:
every extraction is asserted non-empty before anything is compared (a scan
that silently finds nothing is a guard that passes against anything), and
``test_the_quantifier_scan_can_fail`` there is the reason this module also
carries a negative control -- a guard nobody has watched fail is not a
guard.

What this does not do
----------------------

The scan matches a **named phrase plus a route-name allowlist**, not
English: a mention of "STEP file"/"STEP export"/"STEP path", or of this repo
"copying" the mesh output, is fine when the passage also says which single
route it is talking about (``single-part``, ``two routes``, ``two ways``,
``one of two``, or an explicit denial that a per-part STEP exists). A
passage that uses the phrase with no such qualifier is indistinguishable
from the old, wrong, whole-store claim, so it fails.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCHITECTURE = REPO_ROOT / "ARCHITECTURE.md"
ANNOTATION_SURFACE = REPO_ROOT / "docs" / "ANNOTATION_SURFACE.md"

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

#: A mesh-source claim that is true of only ONE of the two routes. Matched
#: as a bare phrase; whether its use is legitimate is decided by whether a
#: qualifier from ROUTE_QUALIFIER also appears in the same passage.
STEP_SOURCE_CLAIM = re.compile(r"\bSTEP (?:file|export|path)\b", re.IGNORECASE)
COPY_CLAIM = re.compile(r"\bcopies? (?:the )?(?:binary )?mesh output\b", re.IGNORECASE)

#: Present in a passage that is honestly scoped to one route (or that says
#: outright there are two). A passage using STEP_SOURCE_CLAIM or COPY_CLAIM
#: with none of these present is making the claim about the whole store.
ROUTE_QUALIFIER = re.compile(
    r"single-part|two routes|two ways|one of two|either route|"
    r"no per-part STEP|not a per-part STEP|which route",
    re.IGNORECASE,
)


def unqualified_route_claims(text: str) -> list[str]:
    """Every STEP-source / copy claim in ``text`` with no route qualifier.

    Returns the matched phrases (not just a bool) so a failing assertion
    names what it found, the same reporting style every guard in this repo
    uses.
    """
    matches = [m.group(0) for m in STEP_SOURCE_CLAIM.finditer(text)]
    matches += [m.group(0) for m in COPY_CLAIM.finditer(text)]
    if matches and not ROUTE_QUALIFIER.search(text):
        return matches
    return []


# --------------------------------------------------------------------------- #
# 1. extraction -- the document side, asserted found before anything else     #
# --------------------------------------------------------------------------- #

def _section(markdown: str, heading: str, path_for_errors: Path) -> str:
    """The prose under ``heading``, up to the next heading of equal or
    shallower depth. Raises rather than returning empty -- an empty
    extraction would make every scan below pass vacuously."""
    lines = markdown.splitlines()
    level = len(heading) - len(heading.lstrip("#"))
    start = None
    for i, line in enumerate(lines):
        if line.strip() == heading:
            start = i + 1
            break
    if start is None:
        raise LookupError(f"{path_for_errors}: no {heading!r} heading found")
    end = start
    while end < len(lines):
        stripped = lines[end].strip()
        if stripped.startswith("#"):
            this_level = len(stripped) - len(stripped.lstrip("#"))
            if this_level <= level:
                break
        end += 1
    section = "\n".join(lines[start:end]).strip()
    if not section:
        raise ValueError(f"{path_for_errors}: {heading!r} section is empty")
    return section


def _rotorkit_bullet(markdown: str) -> str:
    match = re.search(
        r"- \*\*rotorkit\*\*.*?(?=\n- \*\*|\n#{1,6} )", markdown, re.DOTALL
    )
    if not match:
        raise LookupError("ARCHITECTURE.md: no '- **rotorkit**' bullet found")
    return match.group(0)


@pytest.fixture(scope="module")
def architecture_rotorkit_bullet() -> str:
    return _rotorkit_bullet(ARCHITECTURE.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def annotation_surface_mesh_format() -> str:
    return _section(
        ANNOTATION_SURFACE.read_text(encoding="utf-8"),
        "### The mesh format",
        ANNOTATION_SURFACE,
    )


def test_the_extractions_are_not_vacuous(
    architecture_rotorkit_bullet, annotation_surface_mesh_format
):
    assert "rotorkit" in architecture_rotorkit_bullet
    assert "data/meshes" in architecture_rotorkit_bullet
    assert "data/meshes" in annotation_surface_mesh_format


# --------------------------------------------------------------------------- #
# 2. the pairings                                                             #
# --------------------------------------------------------------------------- #

def test_architecture_rotorkit_bullet_makes_no_unqualified_route_claim(
    architecture_rotorkit_bullet,
):
    problems = unqualified_route_claims(architecture_rotorkit_bullet)
    assert problems == [], (
        "ARCHITECTURE.md's rotorkit bullet asserts, with no route qualifier "
        f"nearby, {problems} -- there are two routes into data/meshes/ "
        "(a single-part STEP export and an assembly extraction with no "
        "per-part STEP upstream), and this repo copies the mesh output on "
        "only one of them. Scope the claim to the route it is actually "
        "about, or point at data/meshes/README.md instead of restating it."
    )


def test_annotation_surface_mesh_format_makes_no_unqualified_route_claim(
    annotation_surface_mesh_format,
):
    problems = unqualified_route_claims(annotation_surface_mesh_format)
    assert problems == [], (
        "docs/ANNOTATION_SURFACE.md's mesh format passage asserts, with no "
        f"route qualifier nearby, {problems} -- 22 of 24 installed meshes "
        "have no per-part STEP upstream at all (data/meshes/README.md, "
        "\"Two ways a mesh gets here\"). Let the pointer to that README "
        "carry the route detail instead of restating it here."
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
    """[real]: grounds "two routes" (not a count) against the tree. If a
    third route script ever installs a mesh, this does not fail -- there is
    no claimed total here for it to violate -- but it would be a prompt to
    revisit ARCHITECTURE.md and ANNOTATION_SURFACE.md's "two routes" framing.
    """
    meshes_dir = installed_meshes_dir()
    commands = live_route_commands(meshes_dir)
    assert commands, (
        f"{meshes_dir} has mesh directories but no readable provenance.json "
        "produced_by.command -- the pairing below would pass vacuously"
    )
    assert commands == {
        "scripts/extract_assembly_parts.py",
        "scripts/tessellate_parts.py",
    }, (
        f"the live mesh store's routes are {sorted(commands)}, which is not "
        "the two routes data/meshes/README.md documents -- a route was added, "
        "removed, or renamed upstream in rotorkit"
    )


# --------------------------------------------------------------------------- #
# 4. negative control -- the scan, shown catching what it exists to catch     #
# --------------------------------------------------------------------------- #

def test_the_route_claim_scan_can_fail():
    """Replays both documents' pre-fix wording verbatim (reconstructed, not
    read from git history), plus the qualified phrasing each was rewritten
    to use, so this test is known to be checking something."""
    stale_architecture = (
        "- **rotorkit** -- `data/meshes/<sha>/` is tessellated from a STEP "
        "file by rotorkit's `stepgeom.tessellate` "
        "(`scripts/tessellate_parts.py`, run from rotorkit's own checkout "
        "and venv). This repo never patches rotorkit or imports its code; "
        "it copies the binary mesh output, unmodified, plus a provenance "
        "sidecar."
    )
    assert unqualified_route_claims(stale_architecture) != []

    stale_annotation_surface = (
        "a `provenance.json` sidecar (source STEP path, sha256, "
        "tessellation tier, the rotorkit command that produced it)."
    )
    assert unqualified_route_claims(stale_annotation_surface) != []

    # The qualified shape each document was rewritten to use: the same
    # phrase, but naming that it is scoped to one of two routes.
    qualified = (
        "a single-part STEP export (`scripts/tessellate_parts.py`), one of "
        "two routes into data/meshes/; the other has no per-part STEP "
        "upstream at all."
    )
    assert unqualified_route_claims(qualified) == []

    # And a passage that names neither phrase at all is untouched by the
    # scan -- it is not a blanket ban on the word "STEP".
    assert unqualified_route_claims(
        "see data/meshes/README.md for what the sidecar carries."
    ) == []
