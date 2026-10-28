"""The nav's gesture words are one list on each side, and the two lists agree.

The viewer's nav hands a gesture on a mirrored row back to the annotator as
``{type: "annotate:rail", key, act, index?}``. ``act`` is one of six words,
named once in ``VA.SCENE_ACTS`` (``apps/viewer/views/nav.js``, the sender) and
once in ``AA.RAIL_ACTS`` (``apps/annotate/commands.js``, the receiver). The
viewer cannot import ``AA``, so neither side can read the other; this pairs
them, and a rename on one side reddens it.

Handoff: ``the_nav_scene_trees_six_gestures_are_named_once_and_each_witnessed``.
"""

from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SENDER = REPO_ROOT / "apps" / "viewer" / "views" / "nav.js"
RECEIVER = REPO_ROOT / "apps" / "annotate" / "commands.js"


def _acts(path: Path, name: str) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    block = re.search(rf"{re.escape(name)}\s*=\s*Object\.freeze\(\{{(.*?)\}}\)", text, re.S)
    assert block, f"{name} is not a frozen object literal in {path.name}"
    body = re.sub(r"//[^\n]*", "", block.group(1))
    return dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', body))


def test_the_sender_and_the_receiver_name_the_same_gestures():
    sent = _acts(SENDER, "VA.SCENE_ACTS")
    answered = _acts(RECEIVER, "AA.RAIL_ACTS")
    assert sent and sent == answered


def test_each_act_is_its_own_word_on_the_wire():
    for path, name in ((SENDER, "VA.SCENE_ACTS"), (RECEIVER, "AA.RAIL_ACTS")):
        acts = _acts(path, name)
        assert all(key == word for key, word in acts.items()), (name, acts)


def test_no_gesture_word_is_spelled_inline_beside_the_table():
    sender = SENDER.read_text(encoding="utf-8")
    sends = re.findall(r"\bsend\([^;\n]*", sender)
    assert sends and not [s for s in sends if re.search(r'"(%s)"' % "|".join(
        _acts(SENDER, "VA.SCENE_ACTS")), s)]
    app = (REPO_ROOT / "apps" / "annotate" / "app.js").read_text(encoding="utf-8")
    start = app.index("function railGesture(")
    gesture = app[start:app.index("\n}\n", start)]
    assert not re.search(r"msg\.act\s*===\s*\"", gesture)
