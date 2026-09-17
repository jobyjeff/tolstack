"""The viewer's status tables, paired with the Python enumerations they copy.

Eleven vocabularies are **defined in Python and hand-copied into JavaScript**:

===============================================  ==================================
 Python (the definition)                          JavaScript (the copy)
===============================================  ==================================
 ``EXPORT_STATUSES``, ``tolerance_stack/stack``   ``VA.EXPORT_STATUSES``
 the ``values_status`` membership test in         ``VA.VALUES_STATUSES``
 ``MaterialEntry.__post_init__``
 the ``resolved_by`` literals in                  ``VA.CROP_RULES``
 ``scripts/build_viewer_crops.py``
 the ``located_by`` literals in ``locate()``,     ``VA.CROP_PLACEMENTS``
 same file
 ``HIGHLIGHT_KINDS``, same file                   ``VA.CROP_HIGHLIGHT_KINDS``
 ``VERDICT_SCOPES``, ``tolerance_stack/stack``    ``VA.VERDICT_SCOPES``
 ``VERDICTS``, same file                          ``VA.VERDICTS``
 what ``identity_rule_of_ref`` returns in         ``VA.IDENTITY_RULES``
 ``scripts/build_viewer_projection.py``
 ``PROJECTION_CONFIDENCES``, same file --          ``VA.CONFIDENCES``
 ``stack.CONFIDENCES`` ranked, plus the
 synthesised ``NO_SOURCE_REF``
 ``UNVERIFIED_CONFIDENCES``,                      ``VA.UNVERIFIED_CONFIDENCES``
 ``scripts/build_topology_projection.py``
 the ``how`` each ``worksheet_for`` returns,      ``VA.WORKSHEET_SOURCES``
 in **both** viewer builders
===============================================  ==================================

The last two arrived together on 2026-09-16 (``reader_facing_copy_and_vocabulary``)
and are the first rows whose JS side had to be *built* before it could be paired:
one was two literals inside ``VA.needsAnnotation``'s body, the other a bare
``=== "declared"`` whose only named copy was a local inside ``apps/viewer/tests.js``.
Neither extractor can anchor on a vocabulary spelled in a function body, so "make it
a table" is not a style preference here -- it is the precondition for this module
being able to see the vocabulary at all.

The JS tables are the right *shape* -- total functions with a loud fallback for a
value they have no branch for -- and ``apps/viewer/tests.js``'s ``VALUE_GUARDS``
asks the viewer's own table rather than re-listing the values, which is the strong
form of that guard. But it is driven by **live data**: it can only fire once a
value Python actually emits reaches ``data/projections/viewer/``. Two failures it
cannot see, and this module exists for both:

* **A value Python can emit that no stack has yet.** ``library``, ``unestablished``,
  ``joint_export_run`` and ``no_source_ref`` have **zero** live instances today.
  Rename one, or add another, and nothing is red until data moves -- the first
  symptom is the loud `unlabelled` block on a reader's screen.
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

Most of the tables are object literals, read by ``js_object_keys``;
``VA.CONFIDENCES`` and ``VA.UNVERIFIED_CONFIDENCES`` are **arrays** and are read by
its sibling ``js_array_strings``,
which is the same scanner with the depth-1 rule changed from "identifiers followed
by ``:``" to "string literals" -- and with anything else at depth 1 raising rather
than being skipped, since an array element this reader cannot resolve is a
vocabulary word silently dropped out of the comparison. Which extractor a
vocabulary uses is a column in ``PAIRINGS``, not a guess made from the source.

``js_object_keys`` is a small character scanner, not a JS parser: it anchors on the
``VA.<NAME> = {`` line, walks to the matching brace tracking string literals and
both comment forms, and takes the identifiers (or quoted keys) that are followed by
``:`` at **one** nesting level. That is enough for a `something:` inside a comment
or a string, which is what defeats a regex over these files -- every table here has
both. Three things it does **not** understand, all of them scoped to the span
between the anchor and its matching brace:

* **Regex literals.** ``/}/`` inside a table would end the scan early, and the
  table would come back SHORT rather than empty -- which the anti-vacuity test
  below cannot catch, because a short table is a passing extraction. The check is
  per-span, not per-file: ``viewer.js`` carries several regex literals and every one
  of them is outside every table body.

  This paragraph used to name both lists by line number. It was recounted in
  ``review/confidence_vocabulary_single_definition`` (2026-08-18), where both halves
  had gone stale while staying true, and it had gone stale again by 2026-09-16, when
  ``revisionText`` and the run-date reader added three more regex literals and two
  tables arrived. The digits are gone; **recompute both lists against the file** if
  you need them. What has not changed is the rule: no regex literal inside a table
  body. ``js_array_strings`` needs no such caveat, because a ``/`` that opens
  neither comment form is one of the things it refuses outright.
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
import sys
from dataclasses import dataclass
from pathlib import Path

import pytest

from tolerance_stack.stack import EXPORT_STATUSES, VERDICTS, VERDICT_SCOPES

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_JS = REPO_ROOT / "apps" / "viewer" / "viewer.js"
THERMAL_PY = REPO_ROOT / "tolerance_stack" / "thermal.py"
CROPS_SCRIPT = REPO_ROOT / "scripts" / "build_viewer_crops.py"

# HIGHLIGHT_KINDS is importable -- it is a module-level constant, not a set of
# literals in a branch -- so it is read by import rather than by AST, the way
# EXPORT_STATUSES and VERDICTS are. `scripts/` is not a package, hence the path
# insert, which is what build_viewer_crops does for its own siblings.
sys.path.insert(0, str(REPO_ROOT / "scripts"))
from build_viewer_crops import HIGHLIGHT_KINDS  # noqa: E402
PROJECTION_SCRIPT = REPO_ROOT / "scripts" / "build_viewer_projection.py"
TOPOLOGY_PROJECTION_SCRIPT = REPO_ROOT / "scripts" / "build_topology_projection.py"


# --------------------------------------------------------------------------- #
# 1. the JavaScript side: keys of a `VA.<NAME> = { ... }` object literal       #
# --------------------------------------------------------------------------- #

_IDENT_START = frozenset(string.ascii_letters + "_$")
_IDENT_CHARS = _IDENT_START | frozenset(string.digits)


@dataclass(frozen=True)
class JsTable:
    name: str
    line: int                  # 1-based line of the `VA.<name> = {` (or `= [`) anchor
    #: The vocabulary words the table spells: an object literal's keys, or an array
    #: literal's string elements. One name because what the pairing compares is the
    #: same thing either way -- the set of values the viewer has a branch for.
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


def js_array_strings(text: str, name: str, prefix: str = "VA") -> JsTable:
    """Elements of the ``VA.<name> = [`` array literal in ``text``.

    ``js_object_keys``'s sibling, for the one vocabulary the viewer spells as a
    list rather than a lookup: ``VA.CONFIDENCES`` needs no per-value sentence
    (``VA.CONFIDENCE_LABEL`` and the CSS carry those), so it is an array, and an
    array has no ``key:`` for the object scanner to anchor on.

    The scan is the same shape -- comments and string literals tracked, brackets
    counted -- with one deliberate difference: **anything at depth 1 that is not a
    string or a separator raises.** An identifier element
    (``VA.CONFIDENCES = [TRACED, ...]``) is a vocabulary word this reader cannot
    resolve, and dropping it silently would shrink the set the pairing compares,
    which is this module's own failure mode one layer down.

    That includes a **nested** literal. Written 2026-08-17 the rule read "not a
    string, a separator or a nested bracket", and an opening bracket at depth 1 was
    let through -- so ``["a", ["b"]]`` came back as ``{"a"}``, the exact silent drop
    the sentence above forbids, because the nested string is at depth 2 and only
    depth 1 is collected (found in ``review/confidence_vocabulary_single_definition``
    by feeding it the case). A vocabulary array does not nest; if one ever needs to,
    teach this reader the shape rather than letting it shrink the compared set.

    ``prefix`` is the namespace object the array hangs off -- ``VA`` for
    ``apps/viewer``'s ``window.ViewerApp``, ``AA`` for ``apps/annotate``'s
    ``window.AnnotateApp`` (``tests/test_annotate_js_vocabulary.py``). Adding a
    second app's namespace here, rather than forking this scanner, is what
    keeps a third vocabulary pairable without a third copy of the reader.
    """
    anchors = list(re.finditer(
        rf"^[ \t]*{re.escape(prefix)}\.{re.escape(name)}\s*=\s*\[", text, re.M))
    if len(anchors) != 1:
        raise LookupError(
            f"expected exactly one `{prefix}.{name} = [` line in the JS source, found "
            f"{len(anchors)}. If the array moved or was renamed, this test's "
            f"comparison is meaningless until the name here is updated."
        )
    anchor = anchors[0]
    line_no = text.count("\n", 0, anchor.start()) + 1

    i = text.index("[", anchor.start()) + 1
    n = len(text)
    depth = 1
    values: list[str] = []
    while i < n and depth > 0:
        c = text[i]
        if c == "/" and text[i + 1:i + 2] == "/":            # line comment
            nl = text.find("\n", i)
            i = n if nl < 0 else nl
        elif c == "/" and text[i + 1:i + 2] == "*":          # block comment
            end = text.find("*/", i + 2)
            i = n if end < 0 else end + 2
        elif c in "\"'`":                                    # an element
            value, i = _read_js_string(text, i)
            if depth == 1:
                values.append(value)
        elif c in "}])":
            depth -= 1
            i += 1
        elif c in " \t\r\n,":
            i += 1
        else:
            # `{[(` lands here too, on purpose: a nested literal's strings would sit
            # at depth 2 and never be collected, which is a dropped vocabulary word
            # wearing the shape of a handled case.
            raise ValueError(
                f"{prefix}.{name} (line {line_no}) contains {text[i:i + 24]!r}, which is "
                f"not a string literal. This reader takes a FLAT array of plain "
                f"strings; teach it the shape rather than letting a vocabulary word "
                f"drop out of the pairing."
            )

    if depth != 0:
        raise ValueError(
            f"{prefix}.{name}: the array literal opened at line {line_no} never closes -- "
            f"the scan ran off the end of the file"
        )
    if len(values) != len(set(values)):
        raise ValueError(f"{prefix}.{name} lists a value twice: {sorted(values)}")
    return JsTable(name=name, line=line_no, keys=frozenset(values))


#: Array methods that add an element. The assignment pattern below is how a *key*
#: realistically arrives on an object table; for an array it is a ``push``, and an
#: array vocabulary extended that way is invisible to ``js_array_strings`` in
#: exactly the way ``VA.CROP_RULES.foo = {}`` is invisible to ``js_object_keys``.
_JS_ARRAY_MUTATORS = ("push", "unshift", "splice")


def js_table_mutations(text: str, table: JsTable) -> list[str]:
    """Statements that add to ``VA.<name>`` from outside its literal.

    The hole the key scan cannot cover by construction: ``VA.CROP_RULES.foo = {}``
    ten screens away is a fourth vocabulary entry the extractor never sees, and the
    comparison would then be red for a value that is in fact handled. Refuse the
    pattern instead of trying to follow it.
    """
    patterns = (
        re.compile(
            rf"VA\.{re.escape(table.name)}"
            rf"\s*(?:\.\s*[A-Za-z_$][\w$]*|\[[^\]\n]*\])?\s*=(?!=)"),
        re.compile(
            rf"VA\.{re.escape(table.name)}"
            rf"\s*\.\s*(?:{'|'.join(_JS_ARRAY_MUTATORS)})\s*\("),
    )
    found: list[tuple[int, str]] = []
    for pattern in patterns:
        for m in pattern.finditer(text):
            line = text.count("\n", 0, m.start()) + 1
            if line == table.line:
                continue                                      # the definition itself
            found.append((line, m.group(0).strip()))
    return [f"{line}: {snippet}" for line, snippet in sorted(found)]


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


def python_crop_placements() -> tuple[str, ...]:
    """Every ``located_by`` value ``build_viewer_crops.py`` can write.

    Same shape of problem, and same answer, as :func:`python_crop_rules`: there is
    no enumeration to import, the values are string literals in the branches of
    ``locate()`` that return. Read from the dict literals themselves, which is
    still the definition and not a copy.

    Scoped to ``locate()`` rather than to the whole module on purpose -- ``locate``
    is where a placement is *minted*, and a future forwarding site
    (``"located_by": placement["located_by"]``) would otherwise have to be
    excluded by hand the way ``python_crop_rules`` excludes its one.
    """
    functions = [
        node for node in ast.walk(ast.parse(CROPS_SCRIPT.read_text(encoding="utf-8")))
        if isinstance(node, ast.FunctionDef) and node.name == "locate"
    ]
    if len(functions) != 1:
        raise LookupError(
            "expected exactly one `locate` in scripts/build_viewer_crops.py, "
            f"found {len(functions)}. If the locator moved, read it where it now "
            "lives -- do NOT hard-code the values here."
        )
    out: list[str] = []
    for node in ast.walk(functions[0]):
        if not isinstance(node, ast.Dict):
            continue
        for key, value in zip(node.keys, node.values):
            if (isinstance(key, ast.Constant) and key.value == "located_by"
                    and isinstance(value, ast.Constant) and isinstance(value.value, str)):
                out.append(value.value)
    return tuple(sorted(set(out)))


def _projection_module():
    """``scripts/build_viewer_projection.py``, imported by path.

    ``scripts/`` is not a package, so the directory goes on ``sys.path`` first --
    the same thing ``build_viewer_projection`` does to reach its own siblings.
    """
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import build_viewer_projection  # noqa: PLC0415 -- resolved from scripts/

    return build_viewer_projection


def python_projection_confidences() -> tuple[str, ...]:
    """Every confidence value the viewer projection can write.

    Read from ``PROJECTION_CONFIDENCES``, which is itself derived -- the citation
    vocabulary (``tolerance_stack.stack.CONFIDENCES``, ranked by
    ``CONFIDENCE_ORDER``) plus ``NO_SOURCE_REF``, the one value the projection
    *synthesises* for an element carrying no citation at all. So this pairing reads
    one list and that list restates nothing, which is what made the vocabulary
    pairable at last: until 2026-08-17 the three citation words lived in an
    end-of-line comment plus two independent copies, and ``no_source_ref`` was a
    bare literal in three branches
    (``ISSUE_20260812_the_confidence_vocabulary_has_no_single_definition_to_pair_va_confidences_against``).

    The order is the projection's rank (weakest last) and the comparison is by set,
    so re-ranking is not a red test here -- ``worst_confidence`` owns that, and
    ``tests/test_viewer_projection.py`` pins it.
    """
    return tuple(_projection_module().PROJECTION_CONFIDENCES)


def python_identity_rules() -> tuple[str, ...]:
    """Every value ``identity_rule_of_ref`` can return, ``None`` aside.

    Same shape of problem as ``python_crop_rules``: there is no enumeration to
    import, there is a helper that *mints* the value -- so read the helper's own
    ``return`` statements. A returned name is resolved through the module (the
    values are module constants today, ``IDENTITY_RULE_SPEC_PILE``); a returned
    literal is taken as written; ``None`` is skipped, because "no rule identifies
    these bytes" is the majority answer and not a value the viewer needs a branch
    for -- ``VA.exportProvenance`` reads a falsy marker as the plain no-export
    state on purpose.

    A return this reader cannot follow **raises** rather than being skipped: a
    silently-dropped return is a vocabulary entry the pairing stops checking.
    """
    build_viewer_projection = _projection_module()

    functions = [
        node for node in ast.walk(ast.parse(
            PROJECTION_SCRIPT.read_text(encoding="utf-8")))
        if isinstance(node, ast.FunctionDef) and node.name == "identity_rule_of_ref"
    ]
    if len(functions) != 1:
        raise LookupError(
            "expected exactly one `identity_rule_of_ref` in "
            f"scripts/build_viewer_projection.py, found {len(functions)}. If the "
            "helper moved, read it where it now lives -- do NOT hard-code the "
            "values here."
        )
    out: list[str] = []
    for node in ast.walk(functions[0]):
        if not isinstance(node, ast.Return) or node.value is None:
            continue
        value = node.value
        if isinstance(value, ast.Constant) and value.value is None:
            continue
        if isinstance(value, ast.Constant) and isinstance(value.value, str):
            out.append(value.value)
        elif isinstance(value, ast.Name):
            out.append(getattr(build_viewer_projection, value.id))
        else:
            raise LookupError(
                f"identity_rule_of_ref returns {ast.dump(value)}, which this "
                "reader cannot follow -- teach it the shape rather than letting "
                "the value drop out of the pairing"
            )
    return tuple(sorted(set(out)))


#: The JSON spelling of a Python ``None``, which is what an absent value literally
#: is by the time the viewer reads it out of a projection file -- and what a JS
#: property key coerces to, which is why ``VA.WORKSHEET_SOURCES`` spells its third
#: key ``"null"``. Named rather than written twice: it is the one place either
#: side of a pairing is allowed to be re-spelled, and it should be arguable in one
#: place rather than looking like a typo in two.
JS_NULL_KEY = "null"


def _topology_projection_module():
    """``scripts/build_topology_projection.py``, imported by path.

    Its sibling ``_projection_module`` reaches the *stack* builder; this one is
    needed because the two viewer builders are deliberately not shared (each is a
    self-contained stdlib-only script), so a vocabulary can be defined in either.
    """
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import build_topology_projection  # noqa: PLC0415 -- resolved from scripts/

    return build_topology_projection


def python_unverified_confidences() -> tuple[str, ...]:
    """The confidences that mean *nothing readable stands behind this number*.

    Read from ``UNVERIFIED_CONFIDENCES`` in ``scripts/build_topology_projection.py``,
    which is where the set is *used to decide something*: it chooses which edges
    become ``unverified_value`` rows in a topology's "what is missing" panel. The JS
    copy, ``VA.needsAnnotation``, chooses which grid rows and which studies wear the
    ``unverified`` badge and which edges offer the annotate link -- and those two
    answers have to agree, or the panel lists rows the grid does not badge, on the
    one page whose whole job is to say what cannot be trusted.

    It was unpairable until 2026-09-16 for a structural reason worth keeping: the
    JS side was a **function body** (``confidence === "untraced" || confidence ===
    "no_source_ref"``), and both extractors in this module need a ``VA.<NAME> = {``
    or ``= [`` to anchor on. Promoting it to ``VA.UNVERIFIED_CONFIDENCES`` is what
    made this row possible; a third copy of the pair, in ``confidenceClass``'s own
    comment, was retired in the same diff
    (``ISSUE_20260915_the_loud_gap_confidence_pair_has_three_homes_and_no_pairing``).

    ``no_source_ref`` has **zero live instances**, so ``apps/viewer/tests.js``'s
    live-data guards can never see a drift in that half. This row is the only thing
    that can.
    """
    return tuple(_topology_projection_module().UNVERIFIED_CONFIDENCES)


def python_worksheet_sources() -> tuple[str, ...]:
    """Every ``worksheet_source`` value a viewer builder can write.

    Same shape of problem as :func:`python_crop_rules` -- there is no enumeration to
    import, the values are literals in the branches of ``worksheet_for`` that return
    -- and the same answer: read the returns themselves. Scoped to that one function
    for the reason :func:`python_crop_placements` is scoped to ``locate()``: it is
    where the value is *minted*.

    Read from **both** builders, not one. ``scripts/build_viewer_projection.py`` and
    ``scripts/build_topology_projection.py`` each carry a ``worksheet_for`` spelling
    the identical two rules, deliberately not shared because each builder is
    stdlib-only and self-contained -- so reading only one would leave the other free
    to grow a fourth value that the viewer has no branch for and this pairing never
    sees. Their union is the domain, and
    ``test_both_viewer_builders_mint_the_same_worksheet_source_vocabulary`` below
    asserts the union is not hiding a disagreement.

    ``worksheet_for`` returns a *pair* -- ``(worksheet path | None, how)`` -- so the
    second element of each returned tuple is what this reads. ``None`` is a real
    value of the field and not an absence to be skipped (a document with no
    worksheet has no source for one either), and it comes back as
    :data:`JS_NULL_KEY`, which is both what the projection JSON carries and what a
    JS property lookup coerces it to.
    """
    out: list[str] = []
    for script in (PROJECTION_SCRIPT, TOPOLOGY_PROJECTION_SCRIPT):
        out += _worksheet_sources_of(script)
    return tuple(sorted(set(out)))


def _worksheet_sources_of(script: Path) -> tuple[str, ...]:
    """One builder's half of :func:`python_worksheet_sources`."""
    return _worksheet_sources_from_source(
        script.read_text(encoding="utf-8"), script.name)


def _worksheet_sources_from_source(source: str, where: str) -> tuple[str, ...]:
    """Every ``how`` one ``worksheet_for`` can return, read out of its source.

    Takes text rather than a path for the reason ``_values_statuses_from_source``
    does: the shapes it refuses are the interesting part, and they must be
    testable without a file on disk that has them.

    A return this reader cannot follow **raises** rather than being skipped, and so
    does finding none at all: a silently-dropped value is a vocabulary word the
    pairing stops checking, which is the failure mode this whole module exists
    against.
    """
    functions = [
        node for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.FunctionDef) and node.name == "worksheet_for"
    ]
    if len(functions) != 1:
        raise LookupError(
            f"expected exactly one `worksheet_for` in {where}, found "
            f"{len(functions)}. If the rule moved, read it where it now lives -- "
            "do NOT hard-code the values here."
        )

    def returned_tuples(value: ast.expr) -> list[ast.Tuple]:
        """The tuple(s) one ``return`` statement can evaluate to.

        Both builders spell their second rule as a conditional expression --
        ``return (by_name, "by_name") if by_name.exists() else (None, None)`` -- so
        a reader that accepted only a bare ``ast.Tuple`` saw ``declared`` and
        nothing else: two thirds of the vocabulary dropped in silence, and a
        pairing that passes while checking one word. Recursive rather than one
        level deep, because a third rule would nest.
        """
        if isinstance(value, ast.IfExp):
            return returned_tuples(value.body) + returned_tuples(value.orelse)
        return [value] if isinstance(value, ast.Tuple) else []

    found: list[str] = []
    for statement in ast.walk(functions[0]):
        if not isinstance(statement, ast.Return) or statement.value is None:
            continue
        for tup in returned_tuples(statement.value):
            if len(tup.elts) != 2:
                raise LookupError(
                    f"{where}: worksheet_for returns a {len(tup.elts)}-tuple, not "
                    "the documented (worksheet, how) pair -- teach this reader the "
                    "new shape rather than letting a value drop out of the pairing"
                )
            how = tup.elts[1]
            if isinstance(how, ast.Constant) and how.value is None:
                found.append(JS_NULL_KEY)
            elif isinstance(how, ast.Constant) and isinstance(how.value, str):
                found.append(how.value)
            else:
                raise LookupError(
                    f"{where}: worksheet_for returns a `how` of {ast.dump(how)}, "
                    "which this reader cannot follow"
                )
    if not found:
        raise LookupError(
            f"{where}: worksheet_for mints no `how` this reader can see -- an "
            "empty Python side would make the pairing vacuous"
        )
    return tuple(found)


def test_the_worksheet_source_reader_follows_a_conditional_return():
    """The arm that made this reader more than four lines, watched working.

    Both live builders spell their by-name rule as a conditional expression, and a
    reader blind to ``ast.IfExp`` comes back with ``("declared",)`` -- which does
    not redden, it *shrinks the compared set*, the one direction this module's
    extractors refuse everywhere else. So exercise the shape here, and the shapes
    it must refuse beside it.
    """
    both_rules = (
        "def worksheet_for(path, raw):\n"
        "    if declared:\n"
        "        return resolved, 'declared'\n"
        "    return (by_name, 'by_name') if by_name.exists() else (None, None)\n"
    )
    assert set(_worksheet_sources_from_source(both_rules, "<test>")) == {
        "declared", "by_name", JS_NULL_KEY}

    # A `how` that is not a literal at all: a forwarded value is a vocabulary word
    # this reader cannot resolve, and dropping it quietly is the whole failure mode.
    with pytest.raises(LookupError):
        _worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None, how\n", "<test>")
    # The pair growing a third element -- the shape a refactor would take.
    with pytest.raises(LookupError):
        _worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None, 'by_name', 1\n", "<test>")
    # No `worksheet_for` at all, and two of them: both are "the rule moved", and
    # both must raise rather than compare an empty set against Python's.
    with pytest.raises(LookupError):
        _worksheet_sources_from_source("x = 1\n", "<test>")
    with pytest.raises(LookupError):
        _worksheet_sources_from_source(both_rules + both_rules, "<test>")
    # A `worksheet_for` that returns nothing this reader recognises.
    with pytest.raises(LookupError):
        _worksheet_sources_from_source(
            "def worksheet_for(path, raw):\n    return None\n", "<test>")


def test_both_viewer_builders_mint_the_same_worksheet_source_vocabulary():
    """The half :func:`python_worksheet_sources` cannot assert by taking a union.

    Two stdlib-only builders writing one field is a deliberate duplication
    (CLAUDE.md: each viewer builder is self-contained), and the cost of that choice
    is exactly this: the two ``worksheet_for`` rules can drift from each other
    without the viewer noticing, because a topology's projection and a stack's are
    read by the same renderer. A union would absorb the drift silently -- the
    pairing above would still pass, with the viewer holding a branch for a value
    only one of the two builders can write.
    """
    stack_side = set(_worksheet_sources_of(PROJECTION_SCRIPT))
    topology_side = set(_worksheet_sources_of(TOPOLOGY_PROJECTION_SCRIPT))
    assert stack_side == topology_side, (
        "scripts/build_viewer_projection.py and scripts/build_topology_projection.py "
        "mint different worksheet_source vocabularies:\n"
        f"  only the stack builder: {sorted(stack_side - topology_side)}\n"
        f"  only the topology builder: {sorted(topology_side - stack_side)}\n"
        "They are two copies of one rule on purpose; keep them one rule."
    )


# --------------------------------------------------------------------------- #
# 3. the extraction itself, asserted before anything is compared              #
# --------------------------------------------------------------------------- #

#: Each pairing: the JS table name, the extractor that reads it out of
#: ``viewer.js``, the Python side, and where the Python side is defined (for the
#: failure message -- the reader's next step is to open it).
PAIRINGS = (
    ("EXPORT_STATUSES", js_object_keys, lambda: tuple(EXPORT_STATUSES),
     "tolerance_stack/stack.py: EXPORT_STATUSES"),
    ("VALUES_STATUSES", js_object_keys, python_values_statuses,
     "tolerance_stack/thermal.py: the values_status check in MaterialEntry.__post_init__"),
    ("CROP_RULES", js_object_keys, python_crop_rules,
     "scripts/build_viewer_crops.py: the `resolved_by` literals in resolve_pdf"),
    # Added 2026-09-14 (spec_crop_region_registry). `located_by` was an if/else
    # chain in VA.cropProvenanceLine and a pinned list in tests.js's VALUE_GUARDS
    # until the registry needed a fourth value; it is a table now, so it pairs
    # here like its three siblings.
    ("CROP_PLACEMENTS", js_object_keys, python_crop_placements,
     "scripts/build_viewer_crops.py: the `located_by` literals in locate()"),
    # Added 2026-09-15 (viewer_reference_crops_in_context). Unlike its two
    # siblings above there IS an enumeration to import: the crop builder's
    # `highlight()` refuses a kind outside HIGHLIGHT_KINDS, so a new word cannot
    # reach crops.json without passing through the constant. What that does NOT
    # stop is the JS copy drifting, and the drift is silent in the worst way: a
    # kind with no branch in VA.CROP_HIGHLIGHT_KINDS renders as the
    # `unlabelled` treatment, which is the visual language for "whether this
    # rect was FOUND on the page or only declared is unknown" -- on a surface
    # whose entire job is to tell those two apart.
    ("CROP_HIGHLIGHT_KINDS", js_object_keys, lambda: tuple(HIGHLIGHT_KINDS),
     "scripts/build_viewer_crops.py: HIGHLIGHT_KINDS"),
    # Added 2026-08-13 (check_completeness_schema). This one is a live-data blind
    # spot of the same family and worse: `budget` had zero live instances until
    # that handoff migrated the pitch-link stack in the same commit, and the
    # failure mode if the JS copy drifts is silence -- an incomplete check
    # rendering as an ordinary one, which is the misreading the whole field
    # exists to prevent.
    ("VERDICT_SCOPES", js_object_keys, lambda: tuple(VERDICT_SCOPES),
     "tolerance_stack/stack.py: VERDICT_SCOPES"),
    # Added 2026-09-15 (viewer_study_verdicts_and_gaps), and the older sibling of
    # the row above: `verdict`'s own three words were three literals inside
    # `CheckResult.verdict` for as long as this repo has existed, because until
    # that handoff no surface branched on them -- the classic view printed the
    # word through and coloured it by a CSS class. The DAG page now says what
    # each verdict MEANS in plain words, which is a branch per value, so the
    # words became a constant and the table became pairable. The drift it
    # catches is the quiet one: a fourth verdict would render as
    # `verdict--unknown` with no sentence, on the one badge a reader acts on.
    ("VERDICTS", js_object_keys, lambda: tuple(VERDICTS),
     "tolerance_stack/stack.py: VERDICTS"),
    # Added 2026-08-13 (spec_citation_identity_rendering). Not a stack-model
    # vocabulary -- `identity_rule` is derived by the projection and authored
    # nowhere -- but it is enumerated, it is minted in Python, and the viewer holds
    # a hand-copy of it, which is the whole of what this module is about. The
    # drift it catches: rename the marker in the builder, and the four spec-pile
    # rows go from stating their identity rule to shouting that the viewer has no
    # branch for it -- the exact symptom the JS-side guards only see after the
    # data has already moved.
    ("IDENTITY_RULES", js_object_keys, python_identity_rules,
     "scripts/build_viewer_projection.py: what identity_rule_of_ref returns"),
    # Added 2026-08-17 (confidence_vocabulary_single_definition), and the reason
    # this table's rows gained an extractor column: `VA.CONFIDENCES` is an ARRAY,
    # so it is read by `js_array_strings`. It was named in this module from the
    # day it was written and left out of it, because on the Python side there was
    # nothing to read -- three copies of the three citation words and a fourth
    # value, `no_source_ref`, that none of them contained. Now there is one:
    # `PROJECTION_CONFIDENCES`. The drift it catches is the loudest one on the
    # surface -- `no_source_ref` renders as `NO CITATION`, has ZERO live instances,
    # and every element in the repo carries a source_ref, so `apps/viewer/tests.js`
    # cannot see a rename of it until data this repo does not have arrives.
    ("CONFIDENCES", js_array_strings, python_projection_confidences,
     "scripts/build_viewer_projection.py: PROJECTION_CONFIDENCES "
     "(tolerance_stack/stack.py: CONFIDENCES, plus the synthesised NO_SOURCE_REF)"),
    # Added 2026-09-16 (reader_facing_copy_and_vocabulary), and the first row here
    # whose JS side had to be BUILT before it could be paired: the pair lived in
    # `VA.needsAnnotation`'s function body, and a vocabulary spelled in a function
    # body has no anchor for either extractor. See python_unverified_confidences
    # for what drift between the two halves does to the "what is missing" panel,
    # and why no live-data guard can ever see it.
    ("UNVERIFIED_CONFIDENCES", js_array_strings, python_unverified_confidences,
     "scripts/build_topology_projection.py: UNVERIFIED_CONFIDENCES"),
    # Added 2026-09-16, same handoff, same defect one layer over: the viewer
    # branched on a bare "declared" literal and the vocabulary's only NAMED copy
    # was a local inside apps/viewer/tests.js, read by the guard rows and
    # invisible to the branch itself. An object literal rather than an array
    # because the field is nullable and each value earns its own on-screen note.
    ("WORKSHEET_SOURCES", js_object_keys, python_worksheet_sources,
     "scripts/build_viewer_projection.py and scripts/build_topology_projection.py: "
     "the `how` returned by each one's worksheet_for"),
)


# --------------------------------------------------------------------------- #
# 2b. the inline-literal scan, on the JavaScript side                         #
# --------------------------------------------------------------------------- #
#
# ``tests/test_tolerance_stack.py``'s
# ``test_no_persisted_field_vocabulary_is_an_inline_literal`` asks one question of
# ``tolerance_stack/``: does any membership check spell its vocabulary as a bare
# tuple of strings instead of reading a module-level constant? It reads
# ``tolerance_stack/`` **only**, and that is precisely why two of the defects this
# handoff fixed lived in ``apps/viewer/`` unnoticed --
# ``VA.needsAnnotation``'s ``confidence === "untraced" || confidence ===
# "no_source_ref"`` and ``views/worksheet.js``'s ``=== "declared"``.
#
# This is that question, asked of the viewer. Mirrored rather than shared: the
# Python one walks an AST, and there is no JS parser here (deliberately -- see the
# scanner note at the top of this module), so the two have no machinery in common
# beyond their argument.
#
# **The rule, and why it is not "any two literals".** A comparison chain is flagged
# when its literal set is a subset of some ``VA.<NAME>`` table's members. Not every
# ``a === "x" || a === "y"``: ``key !== "ArrowLeft" && key !== "ArrowRight"`` and
# ``part === "" || part === "."`` are both live, both correct, and neither is a
# *vocabulary* -- there is no table anywhere that says what the domain is, so
# there is nothing to read instead. Anchoring on the tables makes the finding
# exact: the table IS the thing the chain should have read, and the failure
# message can say so by name. What it cannot catch is a vocabulary with no table
# at all, which is the ``worksheet_source`` shape; nothing static can, and the
# pairing rows above are what keep a table honest once it exists.

#: A single ``<expression> === "literal"`` term. ``expr`` is taken as written so
#: that two terms count as one chain only when they test the *same* thing.
_JS_TERM = re.compile(
    r'([A-Za-z_$][A-Za-z0-9_$.]*)\s*(===|!==)\s*"([^"\\]*)"')

#: What may sit between two terms of one chain: the joining operator and nothing
#: else but whitespace and the parentheses a condition is often wrapped in.
_JS_JOIN = re.compile(r"^[\s()]*(\|\||&&)[\s()]*$")


def js_without_comments(text: str) -> str:
    """``text`` with both comment forms blanked, string literals kept.

    Blanked, not deleted, so every offset is still the offset in the original and
    a finding can name its line. A comment is where a vocabulary is most likely to
    be *quoted* rather than spelled -- ``VA.needsAnnotation``'s own comment quoted
    the pair it checked -- so scanning them would report the documentation as the
    defect.
    """
    out = list(text)
    i, n = 0, len(text)
    while i < n:
        char = text[i]
        if char in "\"'":
            quote, i = char, i + 1
            while i < n and text[i] != quote:
                i += 2 if text[i] == "\\" else 1
            i += 1
        elif char == "/" and i + 1 < n and text[i + 1] == "/":
            while i < n and text[i] != "\n":
                out[i], i = " ", i + 1
        elif char == "/" and i + 1 < n and text[i + 1] == "*":
            while i + 1 < n and not (text[i] == "*" and text[i + 1] == "/"):
                out[i] = " " if text[i] != "\n" else "\n"
                i += 1
            out[i] = out[i + 1] = " "
            i += 2
        else:
            i += 1
    return "".join(out)


def js_literal_chains(text: str) -> list[tuple[int, str, tuple[str, ...]]]:
    """``(line, expression, literals)`` for every same-expression comparison chain.

    Two or more terms only: one ``=== "resolved"`` is a branch, not a vocabulary,
    and this repo's pages are full of correct ones.
    """
    source = js_without_comments(text)
    terms = [
        (m.start(), m.end(), m.group(1), m.group(2), m.group(3))
        for m in _JS_TERM.finditer(source)
    ]
    chains: list[tuple[int, str, tuple[str, ...]]] = []
    run: list[tuple[int, int, str, str, str]] = []

    def flush() -> None:
        if len(run) >= 2:
            chains.append((
                source[:run[0][0]].count("\n") + 1,
                run[0][2],
                tuple(term[4] for term in run),
            ))
        run.clear()

    for term in terms:
        if run:
            joined = _JS_JOIN.match(source[run[-1][1]:term[0]])
            same = run[-1][2] == term[2] and run[-1][3] == term[3]
            if joined and same:
                run.append(term)
                continue
            flush()
        run.append(term)
    flush()
    return chains


#: Every file the viewer serves, minus the three that exist to spell things out.
#: ``tests.js`` is excluded because a test legitimately writes a vocabulary out --
#: that is what pinning a value at the value level IS -- and because the guards in
#: it read the ``VA`` tables directly anyway; the two fixture files are data, and a
#: fixture's job is to carry literal values.
#:
#: ``storage/`` IS included even though no vocabulary lives there today: an adapter
#: that grew a branch on ``worksheet_source`` or ``confidence`` is exactly the kind
#: of copy this scan exists to find, and leaving a directory out is how a guard
#: stops covering the file someone puts the next one in. It costs one live finding
#: that is correctly ignored (``part === "" || part === "."``, which matches no
#: table).
def viewer_sources() -> list[Path]:
    viewer = REPO_ROOT / "apps" / "viewer"
    paths = (sorted(viewer.glob("*.js")) + sorted((viewer / "views").glob("*.js"))
             + sorted((viewer / "storage").glob("*.js")))
    return [p for p in paths
            if p.name not in {"tests.js", "fixtures.js", "topology_fixtures.js"}]


def viewer_tables() -> dict[str, frozenset[str]]:
    """Every ``VA.<NAME>`` table the viewer defines, by name, with its members.

    Read with the same two extractors the pairings above use, so a table this
    cannot see is a table nothing in this module can see. An anchor either
    extractor refuses is skipped rather than raising: ``VA.CONFIDENCE_LABEL`` is a
    perfectly good object literal and ``VA.MONTH_NAMES`` a perfectly good array,
    and both belong in the comparison set; a mid-scan raise would drop every table
    after the first awkward one.
    """
    tables: dict[str, frozenset[str]] = {}
    for path in viewer_sources():
        text = path.read_text(encoding="utf-8")
        for name in re.findall(r"VA\.([A-Z][A-Z0-9_]*)\s*=\s*[\[{]", text):
            for extract in (js_object_keys, js_array_strings):
                try:
                    tables[name] = extract(text, name).keys
                    break
                except (LookupError, ValueError):
                    continue
    return tables


def test_no_viewer_vocabulary_is_spelled_as_a_comparison_chain():
    """No ``VA`` table's words are re-spelled as ``x === "a" || x === "b"``.

    The two halves of the defect this catches are worth keeping apart:

    * **The branch drifts from the table.** A word is added to the table and the
      chain keeps the old set, so the page has a branch for a state it no longer
      recognises, or stops recognising one it should.
    * **The vocabulary stops being pairable.** Neither extractor in this module
      can anchor on a chain in a function body, so a vocabulary spelled that way
      is invisible to every pairing row -- which is exactly the state
      ``VA.needsAnnotation`` was in from the day it was written until 2026-09-16,
      with the Python side it had to agree with sitting in
      ``build_topology_projection.py`` and nothing able to compare them.

    Revert ``VA.needsAnnotation`` to ``confidence === "untraced" || confidence ===
    "no_source_ref"`` and this names ``VA.UNVERIFIED_CONFIDENCES`` on that line.
    """
    tables = viewer_tables()
    assert len(tables) > 15, f"the table scan came back thin: {sorted(tables)}"

    problems = []
    for path in viewer_sources():
        for line, expression, literals in js_literal_chains(
                path.read_text(encoding="utf-8")):
            words = set(literals)
            # An EXACT match first, a superset only if there is none. The chain
            # `c === "untraced" || c === "no_source_ref"` is a subset of
            # VA.CONFIDENCES (four words) and exactly VA.UNVERIFIED_CONFIDENCES
            # (two), and naming the wrong one sends the reader to rewrite the
            # wrong table.
            candidates = sorted(
                (name for name, keys in tables.items() if words <= set(keys)),
                key=lambda name: (len(tables[name]) != len(words), name),
            )
            if candidates:
                name = candidates[0]
                exactly = "is exactly" if len(tables[name]) == len(words) \
                    else "is part of"
                problems.append(
                    f"{path.relative_to(REPO_ROOT).as_posix()}:{line}: "
                    f"`{expression}` is compared against {sorted(words)}, "
                    f"which {exactly} what VA.{name} spells"
                )
    assert problems == [], (
        "a vocabulary the viewer already has a table for, spelled again as a "
        "comparison chain. Read the table (VA.needsAnnotation and "
        "views/worksheet.js are the fix shape), or give the fact its own field "
        "on the table's rows:\n  " + "\n  ".join(problems)
    )


def test_the_chain_scanner_finds_what_it_is_for_and_ignores_what_it_is_not():
    """The scanner, watched on each shape -- including the ones it must let past.

    A guard that flagged every two-literal comparison would be deleted within a
    month: ``key !== "ArrowLeft" && key !== "ArrowRight"`` is live in two files
    and correct, and there is no table for it to read.
    """
    found = js_literal_chains(
        'if (c === "untraced" || c === "no_source_ref") { return 1; }\n')
    assert found == [(1, "c", ("untraced", "no_source_ref"))]

    # Negated, joined the other way -- the same vocabulary, spelled inside out.
    assert js_literal_chains('x !== "a" && x !== "b";\n') == [(1, "x", ("a", "b"))]
    # Wrapped in the parentheses a real condition carries.
    assert js_literal_chains('if ((x === "a") || (x === "b")) y();\n')[0][2] == ("a", "b")
    # A property path is one expression, and stays one.
    assert js_literal_chains('e.kind === "a" || e.kind === "b";\n')[0][1] == "e.kind"

    # DIFFERENT expressions are not a chain: this is one condition about two
    # things, which is the shape `protocol === "file:" || typeof f !== "function"`
    # takes in viewer.js and must not be reported.
    assert js_literal_chains('a === "x" || b === "y";\n') == []
    # Different operators, likewise -- `a === "x" || a !== "y"` is not a domain.
    assert js_literal_chains('a === "x" || a !== "y";\n') == []
    # One literal is a branch, not a vocabulary.
    assert js_literal_chains('a === "x";\n') == []
    # Joined by something that is not a boolean operator at all.
    assert js_literal_chains('f(a === "x", a === "y");\n') == []

    # A comment quoting the pair it documents is documentation, not a defect --
    # and `VA.needsAnnotation`'s own comment did exactly that.
    assert js_literal_chains(
        '// c === "untraced" || c === "no_source_ref"\nvar q = 1;\n') == []
    assert js_literal_chains(
        '/* c === "a" || c === "b" */\nvar q = 1;\n') == []
    # ...and so is a string that happens to contain the shape.
    assert js_literal_chains('var s = "c === \\"a\\" || c === \\"b\\"";\n') == []


@pytest.fixture(scope="module")
def viewer_js() -> str:
    return VIEWER_JS.read_text(encoding="utf-8")


def test_the_extraction_found_every_table_and_none_of_them_is_empty(viewer_js):
    """Anti-vacuity, first, because everything below compares sets.

    A scan that silently returns nothing makes every comparison in this module
    pass. So the tables are counted and each key set is required to be non-empty
    and to be plausible identifiers, before a single set equality is asserted.
    """
    tables = {name: extract(viewer_js, name) for name, extract, _, _ in PAIRINGS}
    # Against `len(PAIRINGS)`, not a digit: the next pairing must not fail this
    # assertion for an unrelated reason. What it still catches is two PAIRINGS rows
    # naming one table, which the dict comprehension would silently collapse.
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


def test_the_array_extractor_fails_loudly_rather_than_dropping_a_value(viewer_js):
    """``js_array_strings``'s half of the same contract.

    Three ways an array pairing could quietly stop checking anything, all of them
    made loud:

    * **no such array** -- ``LookupError``, not an empty set that agrees with every
      Python vocabulary;
    * **two of them** -- the anchor no longer identifies the definition;
    * **an element this reader cannot resolve** -- a bare identifier is a
      vocabulary word with a value only the JS runtime knows, and skipping it
      shrinks the compared set silently. That is the one direction ``js_object_keys``
      has no analogue for, because an object key is always written out.
    * **a nested literal** -- added in review, because the first version let an
      opening bracket through and ``["a", ["b"]]`` came back as ``{"a"}``: the
      nested string sits at depth 2 and only depth 1 is collected, so the one
      construct the rule exempted was also the one that dropped a word in silence.
    """
    with pytest.raises(LookupError) as err:
        js_array_strings(viewer_js, "NO_SUCH_LIST")
    assert "found 0" in str(err.value)

    doubled = viewer_js + '\n  VA.CONFIDENCES = ["sneaky"];\n'
    with pytest.raises(LookupError) as err:
        js_array_strings(doubled, "CONFIDENCES")
    assert "found 2" in str(err.value)

    with pytest.raises(ValueError) as err:
        js_array_strings('  VA.THINGS = ["traced", INFERRED];\n', "THINGS")
    assert "not a string literal" in str(err.value)

    with pytest.raises(ValueError) as err:
        js_array_strings('  VA.THINGS = ["a", "a"];\n', "THINGS")
    assert "lists a value twice" in str(err.value)

    for nested in ('  VA.THINGS = ["a", ["b"]];\n',
                   '  VA.THINGS = ["a", {"b": 1}];\n'):
        with pytest.raises(ValueError) as err:
            js_array_strings(nested, "THINGS")
        assert "not a string literal" in str(err.value), nested

    # And the positive control, so the three refusals above are not the only thing
    # this reader is known to do: comments and a trailing comma are ordinary.
    got = js_array_strings(
        '  VA.THINGS = [\n    "a",  // first\n    /* and */ "b",\n  ];\n', "THINGS")
    assert got.keys == frozenset({"a", "b"})


def test_no_key_is_attached_to_a_status_table_from_outside_its_literal(viewer_js):
    """The hole the key scan has by construction, closed by refusing the pattern.

    ``VA.EXPORT_STATUSES.provisional = {...}`` elsewhere in the file is a fourth
    status the extractor cannot see. Nothing in the viewer does this today and
    nothing should: the table is the enumeration, and a reader who greps for it
    must find all of it in one place.
    """
    problems = []
    for name, extract, _, _ in PAIRINGS:
        table = extract(viewer_js, name)
        problems += [f"VA.{name} mutated at {m}" for m in js_table_mutations(viewer_js, table)]
    assert problems == [], (
        "these assignments add to a status table from outside its object literal, "
        "which puts part of an enumerated vocabulary somewhere no reader (and no "
        "test) will look for it:\n" + "\n".join(f"  {p}" for p in problems)
    )


# --------------------------------------------------------------------------- #
# 4. the pairings                                                             #
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("name,extract,python_side,where", PAIRINGS,
                         ids=[p[0] for p in PAIRINGS])
def test_the_js_status_table_spells_exactly_what_python_enumerates(
        name, extract, python_side, where, viewer_js):
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
    actual = set(extract(viewer_js, name).keys)

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
