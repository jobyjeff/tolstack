"""``VA.REBUILD_DONE`` (``apps/viewer/topology_app.js``), paired with drawing-
checker's own terminal-state vocabulary.

``viewer_popover_clamp_and_rebuild_terminal_state`` (2026-09-14) read the value
from the server rather than guessing it: drawing-checker's
``webui/tolstack_rebuild.py`` declares ``STATES = (IDLE, QUEUED, RUNNING, DONE,
FAILED)`` -- ``idle | queued | running | done | failed`` -- and ``DONE`` is the
only state a finished rebuild answers with. ``topology_app.js`` copies that one
value into ``var REBUILD_DONE = "done";`` because that copy, not the full
five-word vocabulary, is the branch the client actually takes (see the comment
immediately above it there). The value was right at the time and read from the
right place; nothing kept it right. This module is that missing pin.

``webui/tolstack_rebuild.py`` says so itself, one line above ``STATES``: "the
viewer's copy table is pinned against it" -- a forward reference to exactly this
test, written on the drawing-checker side before tolstack had one.

Cross-repo, same shape as ``forge/docs/sessions/HANDOFF_20260914_markdown_
vendor_self_contained.md``'s copied-value problem: a value correct at copy time
with nothing pairing it going forward. **Not** solved the way
``tests/test_js_python_vocabulary.py`` solves the in-repo version (``import`` the
Python side) -- importing drawing-checker code from tolstack is out of bounds by
this repo's own convention (``tests/test_provenance.py`` reads drawing-checker by
``git cat-file``, never by import). A grep-based read of both files' source text
is the shape that stays inside that line, at the cost of not knowing about a
rename made through some indirection neither regex follows -- the same
trade-off ``tests/test_js_python_vocabulary.py``'s docstring names for its own
regex-based extractors.

Skipped, not failed, when drawing-checker is not present on the machine
(``tests/test_provenance.py``'s ``source_repo`` fixture is the precedent): an
absent sibling repo must not read as a passing pairing claim.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
TOPOLOGY_APP_JS = REPO_ROOT / "apps" / "viewer" / "topology_app.js"

#: Always an absolute, main-checkout path: drawing-checker is a sibling repo, not
#: this one, so there is no repo-relative spelling that could ever be correct.
DRAWING_CHECKER_ROOT = Path(r"C:\workspace\drawing-checker")
REBUILD_PY = DRAWING_CHECKER_ROOT / "webui" / "tolstack_rebuild.py"

_JS_DONE = re.compile(r'^[ \t]*var REBUILD_DONE\s*=\s*"([^"]*)"\s*;[ \t]*$', re.M)
_PY_DONE = re.compile(r'^DONE\s*=\s*"([^"]*)"[ \t]*$', re.M)


def js_rebuild_done(text: str) -> str:
    """The value of ``var REBUILD_DONE = "...";`` in ``topology_app.js``.

    Raises rather than returning a default when the line is not there exactly
    once -- a renamed or duplicated constant must be a red test, never a
    comparison against nothing.
    """
    matches = _JS_DONE.findall(text)
    if len(matches) != 1:
        raise LookupError(
            "expected exactly one `var REBUILD_DONE = \"...\";` line in "
            f"apps/viewer/topology_app.js, found {len(matches)}. If it moved or "
            "was renamed, point _JS_DONE at where it lives now -- this pairing "
            "is meaningless until it does."
        )
    return matches[0]


def drawing_checker_done(text: str) -> str:
    """The value of the module-level ``DONE = "..."`` in drawing-checker's
    ``webui/tolstack_rebuild.py`` -- the vocabulary's own source of truth."""
    matches = _PY_DONE.findall(text)
    if len(matches) != 1:
        raise LookupError(
            "expected exactly one module-level `DONE = \"...\"` line in "
            f"drawing-checker's webui/tolstack_rebuild.py, found {len(matches)}. "
            "If it moved or was renamed, point _PY_DONE at where it lives now."
        )
    return matches[0]


@pytest.fixture(scope="module")
def topology_app_js() -> str:
    return TOPOLOGY_APP_JS.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def drawing_checker_rebuild_py() -> str:
    if not REBUILD_PY.exists():
        pytest.skip(f"drawing-checker not present on this machine at {REBUILD_PY}")
    return REBUILD_PY.read_text(encoding="utf-8")


def test_rebuild_done_matches_drawing_checkers_terminal_state(
    topology_app_js, drawing_checker_rebuild_py
):
    js_value = js_rebuild_done(topology_app_js)
    py_value = drawing_checker_done(drawing_checker_rebuild_py)
    assert js_value == py_value, (
        f"apps/viewer/topology_app.js's REBUILD_DONE ({js_value!r}) has drifted "
        f"from drawing-checker's webui/tolstack_rebuild.py DONE ({py_value!r}). "
        "Update the copy in topology_app.js -- the Python side is the "
        "definition."
    )


def test_the_pairing_goes_red_when_drawing_checkers_value_changes(
    topology_app_js, drawing_checker_rebuild_py
):
    """The replay that proves this scan can fail, not just pass by construction."""
    mutated = _PY_DONE.sub('DONE = "complete"', drawing_checker_rebuild_py, count=1)
    assert mutated != drawing_checker_rebuild_py
    assert js_rebuild_done(topology_app_js) != drawing_checker_done(mutated)


def test_the_extractors_raise_rather_than_pass_on_a_missing_definition():
    """Anti-vacuity: a scan that finds nothing must not compare `"" == ""`."""
    with pytest.raises(LookupError):
        js_rebuild_done('var REBUILD_SOMETHING_ELSE = "done";\n')
    with pytest.raises(LookupError):
        drawing_checker_done('SOMETHING_ELSE = "done"\n')


def test_the_extractors_raise_on_a_doubled_definition():
    with pytest.raises(LookupError):
        js_rebuild_done(
            'var REBUILD_DONE = "done";\nvar REBUILD_DONE = "done";\n')
    with pytest.raises(LookupError):
        drawing_checker_done('DONE = "done"\nDONE = "done"\n')
