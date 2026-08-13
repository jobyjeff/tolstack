"""The viewer's status tables, paired with the Python enumerations they copy.

Four vocabularies are **defined in Python and hand-copied into JavaScript**:

===============================================  ==================================
 Python (the definition)                          JavaScript (the copy)
===============================================  ==================================
 ``EXPORT_STATUSES``, ``tolerance_stack/stack``   ``VA.EXPORT_STATUSES``
 the ``values_status`` membership test in         ``VA.VALUES_STATUSES``
 ``MaterialEntry.__post_init__``
 the ``resolved_by`` literals in                  ``VA.CROP_RULES``
 ``scripts/build_viewer_crops.py``
 ``VERDICT_SCOPES``, ``tolerance_stack/stack``    ``VA.VERDICT_SCOPES``
===============================================  ==================================

The JS tables are the right *shape* -- total functions with a loud fallback for a
value they have no branch for -- and ``apps/viewer/tests.js``'s ``VALUE_GUARDS``
asks the viewer's own table rather than re-listing the values, which is the strong
form of that guard. But it is driven by **live data**: it can only fire once a
value Python actually emits reaches ``data/projections/viewer/``. Two failures it
cannot see, and this module exists for both:

* **A value Python can emit that no stack has yet.** ``library``, ``unestablished``
  and ``joint_export_run`` have **zero** live instances today. Rename one, or add a
  fourth, and nothing is red until data moves -- the first symptom is the loud
  `unlabelled` block on a reader's screen.
* **A spelling drift in the JS copy.** ``not_transcribed`` vs ``not-transcribed``
  fails no test until an entry uses it.

Why its own module rather than ``test_sop_vocabulary.py``, which is the precedent
this follows: that module is about ``docs/SOP_TOLERANCE_STACK.md`` -- prose and
worked examples drifting from the code -- and every helper in it parses markdown.
The drift here is code-to-code across two languages and shares none of that
machinery. What *is* borrowed is its rule, and it is the whole design of this file:
**never pin a vocabulary in a third copy of it.** A test asserting
``{"inline", "library", "not_transcribed"}`` on the Python side is the same defect
it exists to catch, one layer up -- so every set below is read out of the
definition, by import or by AST.

Handoff: ``js_python_vocabulary_pairing`` (2026-08-12), from
``ISSUE_20260812_no_test_pairs_the_js_status_tables_with_the_python_vocabularies``.

What the JS extraction can and cannot see
-----------------------------------------

``js_object_keys`` is a small character scanner, not a JS parser: it anchors on the
``VA.<NAME> = {`` line, walks to the matching brace tracking string literals and
both comment forms, and takes the identifiers (or quoted keys) that are followed by
``:`` at **one** nesting level. That is enough for a `something:` inside a comment
or a string, which is what defeats a regex over these files -- every table here has
both. Three things it does **not** understand, all of them scoped to the span
between the anchor and its matching brace:

* **Regex literals.** ``/}/`` inside a table would end the scan early. The check is
  per-span, not per-file: ``viewer.js`` does carry four regex literals (lines 240,
  452, 462, 463 as of 2026-08-12), and all four are outside the three table bodies,
  which today span 202-216, 352-379 and 498-521.
* **Ternaries at depth 1.** ``a: cond ? yes : no`` yields a spurious key ``yes``,
  because ``yes`` is an identifier followed by ``:``. That direction is loud rather
  than silent -- the pairing below goes red reporting a key Python cannot emit --
  but the message misdescribes what happened, so write a depth-1 ternary out into
  the function body rather than debugging it here.
* **A key attached from somewhere else.** ``js_table_mutations`` separately refuses
  any ``VA.<NAME>.foo =`` or ``VA.<NAME>[x] =`` outside the definition. That covers
  assignment, which is how a key would realistically arrive; it does **not** match
  an ``Object.assign(VA.<NAME>, {...})``, and that one *is* silent -- a JS-only
  branch added that way reads as unpaired to nobody.

Every extraction is asserted before it is compared. An extractor that finds nothing
and compares ``set() == set()`` is a guard that cannot fail, which is precisely the
failure mode this module was written against.
"""

from __future__ import annotations

import ast
import re
import string
from dataclasses import dataclass
from pathlib import Path

import pytest

from tolerance_stack.stack import EXPORT_STATUSES, VERDICT_SCOPES

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_JS = REPO_ROOT / "apps" / "viewer" / "viewer.js"
THERMAL_PY = REPO_ROOT / "tolerance_stack" / "thermal.py"
CROPS_SCRIPT = REPO_ROOT / "scripts" / "build_viewer_crops.py"


# --------------------------------------------------------------------------- #
# 1. the JavaScript side: keys of a `VA.<NAME> = { ... }` object literal       #
# --------------------------------------------------------------------------- #

_IDENT_START = frozenset(string.ascii_letters + "_$")
_IDENT_CHARS = _IDENT_START | frozenset(string.digits)


@dataclass(frozen=True)
class JsTable:
    name: str
    line: int                  # 1-based line of the `VA.<name> = {` anchor
    keys: frozenset[str]


def _read_js_string(text: str, i: int) -> tuple[str, int]:
    """The contents of the string literal starting at ``i``, and the index after it."""
    quote = text[i]
    j = i + 1
    while j < len(text):
        c = text[j]
        if c == "\\":
            j += 2
            continue
        if c == quote:
            return text[i + 1:j], j + 1
        j += 1
    raise ValueError(f"unterminated {quote} string at offset {i}")


def _skip_ws(text: str, i: int) -> int:
    while i < len(text) and text[i] in " \t\r\n":
        i += 1
    return i


def js_object_keys(text: str, name: str) -> JsTable:
    """Keys of the ``VA.<name> = {`` object literal in ``text``.

    Raises ``LookupError`` when the table is not there exactly once -- a missing
    or renamed table must be a red test, never an empty set that agrees with
    everything.
    """
    anchors = list(re.finditer(
        rf"^([ \t]*)VA\.{re.escape(name)}\s*=\s*\{{[ \t]*$", text, re.M))
    if len(anchors) != 1:
        raise LookupError(
            f"expected exactly one `VA.{name} = {{` line in the JS source, found "
            f"{len(anchors)}. If the table moved or was renamed, this test's "
            f"comparison is meaningless until the name here is updated."
        )
    anchor = anchors[0]
    indent = anchor.group(1)
    line_no = text.count("\n", 0, anchor.start()) + 1

    i = text.index("{", anchor.start()) + 1
    n = len(text)
    depth = 1
    keys: list[str] = []
    while i < n and depth > 0:
        c = text[i]
        if c == "/" and text[i + 1:i + 2] == "/":            # line comment
            nl = text.find("\n", i)
            i = n if nl < 0 else nl
        elif c == "/" and text[i + 1:i + 2] == "*":          # block comment
            end = text.find("*/", i + 2)
            i = n if end < 0 else end + 2
        elif c in "\"'`":                                    # string literal
            value, i = _read_js_string(text, i)
            after = _skip_ws(text, i)
            if depth == 1 and text[after:after + 1] == ":":
                keys.append(value)                           # a quoted key
        elif c in "{[(":
            depth += 1
            i += 1
        elif c in "}])":
            depth -= 1
            i += 1
        elif c in _IDENT_START:
            j = i
            while j < n and text[j] in _IDENT_CHARS:
                j += 1
            after = _skip_ws(text, j)
            if depth == 1 and text[after:after + 1] == ":" and text[after + 1:after + 2] != ":":
                keys.append(text[i:j])
            i = j
        else:
            i += 1

    if depth != 0:
        raise ValueError(
            f"VA.{name}: the object literal opened at line {line_no} never closes -- "
            f"the scan ran off the end of the file"
        )
    # Structural cross-check on the brace match: the closing brace of a table
    # written in this file's style sits at the anchor's own indent. If it does
    # not, the scan drifted (an unhandled regex literal would do it) and the key
    # set is not to be trusted.
    close = i - 1
    line_start = text.rfind("\n", 0, close) + 1
    if text[line_start:close] != indent:
        raise ValueError(
            f"VA.{name}: the brace the scan matched (offset {close}) is not at the "
            f"same indent as the `VA.{name} = {{` line -- the extraction drifted"
        )
    if len(keys) != len(set(keys)):
        raise ValueError(f"VA.{name} declares a key twice: {sorted(keys)}")
    return JsTable(name=name, line=line_no, keys=frozenset(keys))


def js_table_mutations(text: str, table: JsTable) -> list[str]:
    """Assignments that add to ``VA.<name>`` from outside its literal.

    The hole the key scan cannot cover by construction: ``VA.CROP_RULES.foo = {}``
    ten screens away is a fourth vocabulary entry the extractor never sees, and the
    comparison would then be red for a value that is in fact handled. Refuse the
    pattern instead of trying to follow it.
    """
    pattern = re.compile(
        rf"VA\.{re.escape(table.name)}\s*(?:\.\s*[A-Za-z_$][\w$]*|\[[^\]\n]*\])?\s*=(?!=)")
    out = []
    for m in pattern.finditer(text):
        line = text.count("\n", 0, m.start()) + 1
        if line == table.line:
            continue                                          # the definition itself
        out.append(f"{line}: {m.group(0).strip()}")
    return out


# --------------------------------------------------------------------------- #
# 2. the Python side, read out of the definitions                             #
# --------------------------------------------------------------------------- #

def _values_statuses_from_source(source: str, resolve) -> tuple[str, ...]:
    """The vocabulary the ``values_status`` membership test enforces.

    Read from the **check**, not from a copy of the list: whatever
    ``MaterialEntry.__post_init__`` will accept is by definition what the viewer
    may have to render. ``thermal.py`` spells it as a tuple literal today; if it is
    ever promoted to a module-level constant (``self.values_status not in
    VALUES_STATUSES``) the name is resolved through ``resolve`` instead, so that
    refactor does not turn this into a red test for no reason.
    """
    found: list[tuple[str, ...]] = []
    for node in ast.walk(ast.parse(source)):
        if not isinstance(node, ast.Compare) or len(node.ops) != 1:
            continue
        if not isinstance(node.ops[0], (ast.NotIn, ast.In)):
            continue
        left = node.left
        if not (isinstance(left, ast.Attribute) and left.attr == "values_status"
                and isinstance(left.value, ast.Name) and left.value.id == "self"):
            continue
        comparator = node.comparators[0]
        if isinstance(comparator, (ast.Tuple, ast.List, ast.Set)):
            if all(isinstance(e, ast.Constant) and isinstance(e.value, str)
                   for e in comparator.elts):
                found.append(tuple(e.value for e in comparator.elts))
        elif isinstance(comparator, ast.Name):
            found.append(tuple(resolve(comparator.id)))
    if len(found) != 1:
        raise LookupError(
            "expected exactly one `self.values_status not in (...)` membership test "
            f"in tolerance_stack/thermal.py, found {len(found)}. If the vocabulary "
            "moved, read it where it now lives -- do NOT hard-code the values here, "
            "which is the drift this module exists to catch."
        )
    return found[0]


def python_values_statuses() -> tuple[str, ...]:
    def resolve(name: str):
        from tolerance_stack import thermal
        return getattr(thermal, name)
    return _values_statuses_from_source(
        THERMAL_PY.read_text(encoding="utf-8"), resolve)


def python_crop_rules() -> tuple[str, ...]:
    """Every ``resolved_by`` value ``build_viewer_crops.py`` can write.

    The script has no enumeration to import: the three rules are string literals in
    the three ``resolve_pdf`` branches that succeed. So take them from the dict
    literals themselves -- ``{"pdf": ..., "resolved_by": "spec_pile", ...}`` -- which
    is still the definition and not a copy. The one non-constant site
    (``"resolved_by": resolved["resolved_by"]``, where the entry is assembled) is
    skipped by the ``isinstance`` test: it forwards a value, it does not mint one.
    """
    out: list[str] = []
    for node in ast.walk(ast.parse(CROPS_SCRIPT.read_text(encoding="utf-8"))):
        if not isinstance(node, ast.Dict):
            continue
        for key, value in zip(node.keys, node.values):
            if (isinstance(key, ast.Constant) and key.value == "resolved_by"
                    and isinstance(value, ast.Constant) and isinstance(value.value, str)):
                out.append(value.value)
    return tuple(sorted(set(out)))


# --------------------------------------------------------------------------- #
# 3. the extraction itself, asserted before anything is compared              #
# --------------------------------------------------------------------------- #

#: Each pairing: the JS table name, the Python side, and where the Python side is
#: defined (for the failure message -- the reader's next step is to open it).
PAIRINGS = (
    ("EXPORT_STATUSES", lambda: tuple(EXPORT_STATUSES),
     "tolerance_stack/stack.py: EXPORT_STATUSES"),
    ("VALUES_STATUSES", python_values_statuses,
     "tolerance_stack/thermal.py: the values_status check in MaterialEntry.__post_init__"),
    ("CROP_RULES", python_crop_rules,
     "scripts/build_viewer_crops.py: the `resolved_by` literals in resolve_pdf"),
    # Added 2026-08-13 (check_completeness_schema). This one is a live-data blind
    # spot of the same family and worse: `budget` had zero live instances until
    # that handoff migrated the pitch-link stack in the same commit, and the
    # failure mode if the JS copy drifts is silence -- an incomplete check
    # rendering as an ordinary one, which is the misreading the whole field
    # exists to prevent.
    ("VERDICT_SCOPES", lambda: tuple(VERDICT_SCOPES),
     "tolerance_stack/stack.py: VERDICT_SCOPES"),
)


@pytest.fixture(scope="module")
def viewer_js() -> str:
    return VIEWER_JS.read_text(encoding="utf-8")


def test_the_extraction_found_every_table_and_none_of_them_is_empty(viewer_js):
    """Anti-vacuity, first, because everything below compares sets.

    A scan that silently returns nothing makes every comparison in this module
    pass. So the tables are counted and each key set is required to be non-empty
    and to be plausible identifiers, before a single set equality is asserted.
    """
    tables = {name: js_object_keys(viewer_js, name) for name, _, _ in PAIRINGS}
    # Against `len(PAIRINGS)`, not a digit: a fourth pairing (`VA.CONFIDENCES`, once
    # it has a definition to pair against) must not fail this assertion for an
    # unrelated reason. What it still catches is two PAIRINGS rows naming one table,
    # which the dict comprehension would silently collapse.
    assert len(tables) == len(PAIRINGS)
    for name, table in tables.items():
        assert table.keys, (
            f"VA.{name} extracted zero keys -- the scanner found the anchor at line "
            f"{table.line} and then nothing, which would make this module's "
            f"comparisons pass against anything"
        )
        for key in table.keys:
            # Loose on purpose: a quoted key may carry `.` or `-`
            # (`"provenance.sources_used"` was one), and a *misspelling* is the
            # pairing test's finding to report, not this one's. What is refused
            # here is a token no object literal can produce, which is what a
            # drifted scan yields.
            assert re.fullmatch(r"[A-Za-z_$][\w$.\-]*", key), (
                f"VA.{name} yielded {key!r}, which is not a key -- the scan is "
                f"picking up something else"
            )


def test_the_extractor_fails_loudly_when_the_table_is_not_there(viewer_js):
    """The empty-extraction guard, shown biting.

    Point the extractor at a name that does not exist and it must raise, not
    return an empty set. This is the test that keeps the three above honest: if
    ``js_object_keys`` ever answers "no keys" instead of "no table", every
    vocabulary comparison in this file silently stops checking anything.
    """
    with pytest.raises(LookupError) as err:
        js_object_keys(viewer_js, "NO_SUCH_STATUSES")
    assert "found 0" in str(err.value)

    # Two definitions of the same table is the other way the anchor stops being
    # meaningful -- the scan would take the first and miss the keys of the second.
    doubled = viewer_js + "\n  VA.EXPORT_STATUSES = {\n    sneaky: {},\n  };\n"
    with pytest.raises(LookupError) as err:
        js_object_keys(doubled, "EXPORT_STATUSES")
    assert "found 2" in str(err.value)


def test_no_key_is_attached_to_a_status_table_from_outside_its_literal(viewer_js):
    """The hole the key scan has by construction, closed by refusing the pattern.

    ``VA.EXPORT_STATUSES.provisional = {...}`` elsewhere in the file is a fourth
    status the extractor cannot see. Nothing in the viewer does this today and
    nothing should: the table is the enumeration, and a reader who greps for it
    must find all of it in one place.
    """
    problems = []
    for name, _, _ in PAIRINGS:
        table = js_object_keys(viewer_js, name)
        problems += [f"VA.{name} mutated at {m}" for m in js_table_mutations(viewer_js, table)]
    assert problems == [], (
        "these assignments add to a status table from outside its object literal, "
        "which puts part of an enumerated vocabulary somewhere no reader (and no "
        "test) will look for it:\n" + "\n".join(f"  {p}" for p in problems)
    )


# --------------------------------------------------------------------------- #
# 4. the pairings                                                             #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("name,python_side,where", PAIRINGS,
                         ids=[p[0] for p in PAIRINGS])
def test_the_js_status_table_spells_exactly_what_python_enumerates(
        name, python_side, where, viewer_js):
    """One vocabulary, two languages, one set.

    Both directions are failures and they are different bugs:

    * **Python has a value the JS table lacks** -- the viewer renders the loud
      `unlabelled` block for a value the stack considers perfectly ordinary. The
      reader is told a fact about their data is not shown, and nothing is wrong
      with their data.
    * **The JS table has a value Python cannot emit** -- a branch for an
      impossible state, which reads as "this case is handled" to the next author.
      ``VA.CROP_RULES``'s deleted ``provenance.sources_used`` is the precedent,
      and its comment in ``viewer.js`` says exactly this.

    Neither is visible to ``apps/viewer/tests.js``'s value guards until data
    carrying the value exists: ``library``, ``unestablished`` and
    ``joint_export_run`` have no live instance at all.
    """
    expected = set(python_side())
    assert expected, f"the Python side of {name} came back empty ({where})"
    actual = set(js_object_keys(viewer_js, name).keys)

    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    assert (missing, extra) == ([], []), (
        f"VA.{name} in apps/viewer/viewer.js has drifted from {where}:\n"
        + (f"  Python emits, the viewer has no branch for: {missing}\n" if missing else "")
        + (f"  the viewer has a branch for, Python cannot emit: {extra}\n" if extra else "")
        + f"  Python: {sorted(expected)}\n"
        + f"  viewer: {sorted(actual)}\n"
        "Teach the viewer's table the value (with the sentence it earns), or delete "
        "the branch. Do not add the value to this test -- it reads both sides from "
        "their definitions on purpose."
    )


def test_the_values_status_reader_also_handles_the_constant_refactor():
    """The one Python-side branch no real file exercises today.

    ``thermal.py`` spells its vocabulary as a tuple literal inside the check, so
    the ``ast.Name`` branch of ``_values_statuses_from_source`` -- the shape it
    takes if someone promotes the tuple to a module constant -- is never run by the
    test above. Run it here rather than shipping an untested path that only wakes
    up during someone else's refactor.
    """
    source = (
        "VALUES_STATUSES = ('inline', 'library')\n"
        "class MaterialEntry:\n"
        "    def __post_init__(self):\n"
        "        if self.values_status not in VALUES_STATUSES:\n"
        "            raise ValueError('no')\n"
    )
    resolved = _values_statuses_from_source(
        source, resolve=lambda n: {"VALUES_STATUSES": ("inline", "library")}[n])
    assert resolved == ("inline", "library")

    with pytest.raises(LookupError):
        _values_statuses_from_source("x = 1\n", resolve=lambda n: ())
