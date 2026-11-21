"""A press that writes says so at once, in one wording on both sides of the
seam (handoff a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits,
2026-11-19).

The shell's feature body (``VA.FEATURE_BODY_WORDS``, apps/viewer/views/nav.js)
and the pane's own write controls (``AA.ARMED_PICK_WORDS``,
apps/annotate/sweep.js) each show a pressed control pending, then -- if the
write did not land -- failed, and the two must read the same. Neither app can
read the other's table (two documents, two globals), so they are paired here,
as tests/test_hole_pattern.py pairs ``VA.ARM_ADD``.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
NAV = REPO / "apps" / "viewer" / "views" / "nav.js"
SWEEP = REPO / "apps" / "annotate" / "sweep.js"
APP = REPO / "apps" / "annotate" / "app.js"
COMMANDS = REPO / "apps" / "annotate" / "commands.js"

PRESS_WORDS = ("writing", "failed", "busy")


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _table(source: str, name: str) -> str:
    match = re.search(re.escape(name) + r" = Object\.freeze\(\{(.*?)\n\s*\}\);", source, re.S)
    assert match, f"{name} is not declared as a frozen table"
    return match.group(1)


def _word(table: str, key: str) -> str:
    match = re.search(r"^\s*" + key + r': "([^"]*)",?\s*$', table, re.M)
    assert match, f"no {key!r} word in the table"
    return match.group(1)


def _list(source: str, name: str) -> list[str]:
    match = re.search(re.escape(name) + r" = Object\.freeze\(\[([^\]]*)\]\);", source, re.S)
    assert match, f"{name} is not declared as a frozen list"
    return [w.strip() for w in match.group(1).split(",") if w.strip()]


def test_a_pending_press_reads_the_same_in_the_shell_and_the_pane():
    shell = _table(_read(NAV), "VA.FEATURE_BODY_WORDS")
    pane = _table(_read(SWEEP), "AA.ARMED_PICK_WORDS")
    for key in PRESS_WORDS:
        assert _word(shell, key) == _word(pane, key), key
    # Worded the way the armed click's own line is: lower case, the ellipsis.
    assert _word(pane, "reading").endswith("…") and _word(pane, "writing").endswith("…")


def test_a_writing_controls_states_are_one_list_on_both_sides():
    shell = [w.strip('"') for w in _list(_read(NAV), "VA.WRITE_PRESS_STATES")]
    pane = [w.strip('"') for w in _list(_read(APP), "const WRITE_PRESS_STATES")]
    assert shell == pane == ["writing", "failed"]


def test_every_body_write_is_a_pane_write_and_every_pane_write_is_held_one_at_a_time():
    nav = _read(NAV)
    verbs = dict(re.findall(r'(\w+): "([a-z-]+)"', _table_from_verbs(nav)))
    body = [verbs[w.split(".")[-1]] for w in _list(nav, "VA.FEATURE_BODY_WRITE_VERBS")]
    pane = [w.strip('"') for w in _list(_read(COMMANDS), "AA.IDENTITY_WRITE_VERBS")]
    assert body and set(body) <= set(pane), sorted(set(body) - set(pane))
    app = _read(APP)
    for verb in pane:
        assert re.search(r'commands\.register\("' + re.escape(verb) + r'", oneWriteAtATime\(', app), verb


def _table_from_verbs(nav: str) -> str:
    match = re.search(r"VA\.FEATURE_BODY_VERBS = Object\.freeze\(\{(.*?)\}\);", nav, re.S)
    assert match
    return match.group(1)
