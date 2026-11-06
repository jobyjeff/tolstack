"""The scene tree's row looks are keyed on the annotator's words, and its marks
wear the scene's own face colours.

The annotator sends each mirrored rail row a ``kind`` (``AA.RAIL_ROW_KINDS``)
and, on a face-bearing row, a ``mark`` (``AA.RAIL_MARKS``), both in
``apps/annotate/commands.js``; the viewer's nav draws them from
``[data-kind=...]`` / ``[data-mark=...]`` rules in ``apps/viewer/topology.css``.
Neither side can read the other, so this pairs them: a kind or mark styled
there and not named here (or named here and never styled) reddens.

Four marks are the 3D scene's own face marks (``MARK_COLORS`` in
``apps/annotate/scene.js``), so a row and the face it is about wear one hue;
this holds the stylesheet's ``--mark-*`` tokens equal to them.

Handoff: ``the_rail_reads_as_a_tree_of_bodies_joints_and_faces``.
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
COMMANDS = REPO_ROOT / "apps" / "annotate" / "commands.js"
SWEEP = REPO_ROOT / "apps" / "annotate" / "sweep.js"
SCENE = REPO_ROOT / "apps" / "annotate" / "scene.js"
TOPOLOGY_CSS = REPO_ROOT / "apps" / "viewer" / "topology.css"
STYLE_CSS = REPO_ROOT / "apps" / "viewer" / "style.css"

# The scene's mark for each mark that is one of the scene's face marks.
SCENE_MARKS = {"bound": "bound", "picked": "picked", "proposed": "suggested", "contact": "contact"}


def _frozen(path: Path, name: str) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    block = re.search(rf"{re.escape(name)}\s*=\s*Object\.freeze\(\{{(.*?)\n\s*\}}\);", text, re.S)
    assert block, f"{name} is not a frozen object literal in {path.name}"
    body = re.sub(r"//[^\n]*", "", block.group(1))
    return dict(re.findall(r'^\s*(\w+)\s*:\s*"([^"]*)"', body, re.M))


def _css_values(attr: str) -> set[str]:
    return set(re.findall(rf'\[{attr}="([^"]+)"\]', TOPOLOGY_CSS.read_text(encoding="utf-8")))


def _token(path: Path, name: str) -> str:
    hit = re.search(rf"{re.escape(name)}\s*:\s*([^;]+);", path.read_text(encoding="utf-8"))
    assert hit, f"{name} is not declared in {path.name}"
    return hit.group(1).strip()


def _resolved(name: str) -> str:
    value = _token(TOPOLOGY_CSS, name)
    ref = re.fullmatch(r"var\((--[\w-]+)\)", value)
    return _token(STYLE_CSS, ref.group(1)) if ref else value


def test_every_kind_the_nav_styles_is_one_the_annotator_sends_and_back():
    kinds = _frozen(COMMANDS, "AA.RAIL_ROW_KINDS")
    assert kinds and all(k == v for k, v in kinds.items())
    assert _css_values("data-kind") == set(kinds.values())


def test_every_mark_the_nav_styles_is_one_the_annotator_sends_and_back():
    marks = _frozen(COMMANDS, "AA.RAIL_MARKS")
    assert marks and all(k == v for k, v in marks.items())
    assert _css_values("data-mark") == set(marks.values())
    for mark in marks.values():
        _token(TOPOLOGY_CSS, f"--mark-{mark}")


def test_the_legend_words_name_every_mark():
    text = SWEEP.read_text(encoding="utf-8")
    block = re.search(r"AA\.RAIL_MARK_WORDS\s*=\s*Object\.freeze\(\{(.*?)\n\s*\}\);", text, re.S)
    assert block
    words = re.findall(r"^\s*(\w+)\s*:\s*Object\.freeze", block.group(1), re.M)
    assert set(words) == set(_frozen(COMMANDS, "AA.RAIL_MARKS").values())


def test_a_mark_that_is_a_scene_face_mark_wears_the_scenes_colour():
    scene = SCENE.read_text(encoding="utf-8")
    table = re.search(r"const MARK_COLORS = \{([^}]*)\}", scene)
    assert table
    colours = {k: v.lower() for k, v in re.findall(r"(\w+)\s*:\s*0x([0-9a-fA-F]{6})", table.group(1))}
    for mark, scene_mark in SCENE_MARKS.items():
        assert _resolved(f"--mark-{mark}").lower() == "#" + colours[scene_mark], mark
