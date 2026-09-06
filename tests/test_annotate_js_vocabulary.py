"""``apps/annotate/binding_state.js``'s vocabulary constants, paired with the
Python enumerations they hand-copy.

Same shape as ``tests/test_js_python_vocabulary.py`` (that module's own
docstring: *"never pin a vocabulary in a third copy of it"*), applied to a
second app. Written after review of handoff ``annotation_surface_mvp``
flagged the gap: ``binding_state.js`` carries ``STACK_KEY_KINDS``,
``VERDICTS``, ``DIRECTIONS`` and ``GDT_MODIFIERS`` as hand-copied JS arrays
with no structural pairing against ``tolerance_stack/feature_identity.py``'s
definitions -- exactly this repo's most-repeated defect class
(``ISSUE_20260906_annotate_js_vocab_has_no_pairing_test.md``). ``PATH_KINDS``
is paired here too, alongside the four the review named: it is the same
hand-copied-vocabulary shape (``AA.PATH_KINDS``, used by
``buildBoundEvent``'s ``owner_path`` validation) and leaving it out would
reopen the exact gap this module exists to close, one constant over.

Reuses ``js_array_strings`` from ``tests/test_js_python_vocabulary.py``
rather than forking a second scanner -- that function takes a ``prefix``
(``VA`` for the viewer's ``window.ViewerApp``, ``AA`` here for
``window.AnnotateApp``) precisely so a second app's namespace does not need
its own copy of the reader. All four of this app's vocabularies are arrays
(mirroring the Python side, which spells each one as a plain tuple), so
unlike the viewer's six-way pairing there is no object-literal table here and
no need for ``js_object_keys`` or the mutation-guard.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from tests.test_js_python_vocabulary import js_array_strings
from tolerance_stack.feature_identity import (
    DIRECTIONS,
    GDT_MODIFIERS,
    PATH_KINDS,
    STACK_KEY_KINDS,
    VERDICTS,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
BINDING_STATE_JS = REPO_ROOT / "apps" / "annotate" / "binding_state.js"

#: Each pairing: the JS array name (``AA.<name>``), and the Python tuple it
#: must spell exactly. All four are tuples of plain strings today; if one of
#: them ever needs a per-value sentence the way ``VA.CONFIDENCE_LABEL``
#: elaborates ``VA.CONFIDENCES``, it becomes an object-literal table instead
#: and moves to ``js_object_keys`` -- not invented here ahead of that need.
PAIRINGS = (
    ("STACK_KEY_KINDS", lambda: tuple(STACK_KEY_KINDS),
     "tolerance_stack/feature_identity.py: STACK_KEY_KINDS"),
    ("VERDICTS", lambda: tuple(VERDICTS),
     "tolerance_stack/feature_identity.py: VERDICTS"),
    ("DIRECTIONS", lambda: tuple(DIRECTIONS),
     "tolerance_stack/feature_identity.py: DIRECTIONS"),
    ("PATH_KINDS", lambda: tuple(PATH_KINDS),
     "tolerance_stack/feature_identity.py: PATH_KINDS"),
    ("GDT_MODIFIERS", lambda: tuple(GDT_MODIFIERS),
     "tolerance_stack/feature_identity.py: GDT_MODIFIERS"),
)


@pytest.fixture(scope="module")
def binding_state_js() -> str:
    return BINDING_STATE_JS.read_text(encoding="utf-8")


def test_the_extraction_found_every_table_and_none_of_them_is_empty(binding_state_js):
    """Anti-vacuity, first -- the same guard test_js_python_vocabulary.py
    opens with: a scan that silently finds nothing makes every comparison
    below pass against anything."""
    tables = {name: js_array_strings(binding_state_js, name, prefix="AA") for name, _, _ in PAIRINGS}
    assert len(tables) == len(PAIRINGS)
    for name, table in tables.items():
        assert table.keys, (
            f"AA.{name} extracted zero keys -- the scanner found the anchor at "
            f"line {table.line} and then nothing, which would make every "
            f"comparison below pass against anything"
        )


def test_the_extractor_fails_loudly_when_the_table_is_not_there(binding_state_js):
    """Point the extractor at a name that does not exist and it must raise,
    not return an empty set -- the same positive control
    test_js_python_vocabulary.py runs against VA's own tables."""
    with pytest.raises(LookupError, match="found 0"):
        js_array_strings(binding_state_js, "NO_SUCH_VOCABULARY", prefix="AA")


@pytest.mark.parametrize("name,python_side,where", PAIRINGS, ids=[p[0] for p in PAIRINGS])
def test_the_js_array_spells_exactly_what_python_enumerates(name, python_side, where, binding_state_js):
    """One vocabulary, two languages, one set -- both directions checked.

    Python emitting a value the JS has no branch for renders as an unhandled
    state in the app; the JS accepting a value Python cannot emit is a branch
    for an impossible state, which reads as "this case is handled" to the
    next author. Neither is visible until data carrying the drifted value
    actually reaches the app.
    """
    expected = set(python_side())
    assert expected, f"the Python side of {name} came back empty ({where})"
    actual = set(js_array_strings(binding_state_js, name, prefix="AA").keys)

    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    assert (missing, extra) == ([], []), (
        f"AA.{name} in apps/annotate/binding_state.js has drifted from {where}:\n"
        + (f"  Python emits, the JS has no branch for: {missing}\n" if missing else "")
        + (f"  the JS has a branch for, Python cannot emit: {extra}\n" if extra else "")
        + f"  Python: {sorted(expected)}\n"
        + f"  JS: {sorted(actual)}\n"
        "Teach binding_state.js the value, or delete the branch. Do not add "
        "the value to this test -- it reads both sides from their "
        "definitions on purpose."
    )
