"""``ops.toml``'s ``serve`` verb -- annotate's one-click entry point.

Parsed with stdlib ``tomllib`` and asserted directly against the manifest, per
the handoff's own instruction: a test can toml-parse and assert here without
importing dispatch's or forge's ``ops.py`` -- this repo depends on neither, and
the STANDARD_VERBS constraint (`install | serve | deploy | smoke`, no fifth
verb) is enforced by that code, not this one. This test only pins that the verb
this repo *declares* has the argv apps/annotate/README.md documents (port 8843,
`http.server`, `--directory apps\annotate`), not that the console will accept it.

Handoff: projections_rebuild_script (2026-09-08).
"""

from __future__ import annotations

import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OPS_TOML = REPO_ROOT / "ops.toml"


def load_ops() -> dict:
    return tomllib.loads(OPS_TOML.read_text(encoding="utf-8"))


def test_ops_toml_parses():
    ops = load_ops()
    assert ops["repo"]["name"] == "tolstack"


def test_serve_verb_is_the_annotate_entry_point():
    ops = load_ops()
    serve = ops["verbs"]["serve"]
    assert serve["cmd"] == [
        "venv-win\\Scripts\\python.exe",
        "-m",
        "http.server",
        "8843",
        "--directory",
        "apps\\annotate",
    ]
    assert serve["long_running"] is True


def test_only_the_standard_verbs_are_declared():
    """The verb set is closed: install | serve | deploy | smoke, nothing else.

    Guards against a future edit accidentally adding a fifth verb (a `rebuild`
    verb, say) for the projection rebuild script -- the handoff this test comes
    from is explicit that the rebuild stays a script for exactly this reason.
    """
    standard = {"install", "serve", "deploy", "smoke"}
    ops = load_ops()
    declared = set(ops.get("verbs", {}).keys())
    assert declared <= standard, f"non-standard verb(s) declared: {declared - standard}"
    assert "serve" in declared
