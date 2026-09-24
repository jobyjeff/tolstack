"""The JavaScript-side scanners, and the one drift generation cannot reach.

``apps/viewer/vocab.gen.js`` is generated from the Python definitions and
compared by ``tests/test_js_vocabulary_is_generated.py``; both apps read every
Python-owned vocabulary out of it and hold no copy of one. That is where the
twenty-six hand copies this module used to pair went, on 2026-09-23.

What did **not** go with them is the failure a generated file cannot touch: a
vocabulary the viewer already has, spelled again as a comparison chain in a
function body. ``confidence === "untraced" || confidence === "no_source_ref"``
reads the words out of nothing at all -- it is not a copy of the table, it is a
*second* table with no name, and generation has no purchase on it because there
is nothing there to generate. That scan is this module, and it is the guard
``VA.needsAnnotation`` was written against.

The character scanners it uses -- ``js_object_keys`` and ``js_array_strings`` --
stay here because two things still need them, and neither is a Python pairing:

* the chain scan itself, which anchors a finding on the ``VA.<NAME>`` table the
  chain should have read (including the generated vocabularies, which it takes
  from ``scripts/js_vocabulary.py`` rather than by parsing the generated file);
* ``tests/test_viewer_deep_link_contract.py``, which reads
  ``VA.DEEP_LINK_PARAMS`` -- a vocabulary **JavaScript owns**, paired against the
  contract section of ``apps/viewer/README.md`` that a sibling repo reads.

What the scanners can and cannot see
------------------------------------

``js_object_keys`` is a small character scanner, not a JS parser: it anchors on
the ``VA.<NAME> = {`` line, walks to the matching brace tracking string literals
and both comment forms, and takes the identifiers (or quoted keys) that are
followed by ``:`` at **one** nesting level. That is enough for a `something:`
inside a comment or a string, which is what defeats a regex over these files.
Three things it does not understand, all scoped to the span between the anchor
and its matching brace: a **regex literal** (``/}/`` would end the scan early and
the table would come back SHORT rather than empty), a **depth-1 ternary**
(``a: cond ? yes : no`` yields a spurious key ``yes``), and a **key attached from
somewhere else** (``Object.assign(VA.NAME, {...})``).

Those three used to be this module's declared blind spots, and they were the
argument for generating: a short table read as a passing extraction. They are
much smaller now. No table it reads is compared against Python any more -- the
chain scan only asks *which table does this chain restate*, where a short answer
costs a less precise finding rather than a missed drift, and the deep-link
contract's array is read by the sibling scanner, which refuses anything at depth
1 it cannot resolve. The last of the three is closed outright: ``VOCAB.table()``
freezes every table it returns, so a key attached from outside the literal throws
in strict mode, which every app file is.

``js_array_strings`` is the same scanner with the depth-1 rule changed from
"identifiers followed by ``:``" to "string literals" -- and with anything else at
depth 1 raising rather than being skipped, since an array element this reader
cannot resolve is a vocabulary word silently dropped.

Handoff: ``js_python_vocabulary_pairing`` (2026-08-12), reduced to this by
``js_vocabulary_generated_from_python`` (2026-09-23).
"""

from __future__ import annotations

import re
import string
import sys
from dataclasses import dataclass
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER_JS = REPO_ROOT / "apps" / "viewer" / "viewer.js"

sys.path.insert(0, str(REPO_ROOT / "scripts"))

import js_vocabulary as V  # noqa: E402 -- resolved from scripts/


# --------------------------------------------------------------------------- #
# 1. the JavaScript side: keys of a `VA.<NAME> = { ... }` object literal       #
# --------------------------------------------------------------------------- #

_IDENT_START = frozenset(string.ascii_letters + "_$")
_IDENT_CHARS = _IDENT_START | frozenset(string.digits)


@dataclass(frozen=True)
class JsTable:
    name: str
    line: int                  # 1-based line of the `VA.<name> = {` (or `= [`) anchor
    #: The words the table spells: an object literal's keys, or an array
    #: literal's string elements. One name because what a caller wants is the
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

    ``js_object_keys``'s sibling, for a vocabulary the viewer spells as a list
    rather than a lookup: ``VA.DEEP_LINK_PARAMS`` needs no per-value sentence, so
    it is an array, and an array has no ``key:`` for the object scanner to anchor
    on.

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
    ``apps/viewer``'s ``window.ViewerApp``. It took ``AA`` too while
    ``apps/annotate/binding_state.js`` held five hand-copied vocabularies; that
    file reads them out of the generated module now, so the parameter has one
    caller. It stays: it costs a default argument, and the alternative the next
    time a second namespace needs reading is a forked scanner.
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



# --------------------------------------------------------------------------- #
# 2. the inline-literal scan, on the JavaScript side                          #
# --------------------------------------------------------------------------- #
#
# ``tests/test_tolerance_stack.py``'s
# ``test_no_persisted_field_vocabulary_is_an_inline_literal`` asks one question of
# ``tolerance_stack/``: does any membership check spell its vocabulary as a bare
# tuple of strings instead of reading a module-level constant? It reads
# ``tolerance_stack/`` **only**, and that is precisely why two of the defects
# ``reader_facing_copy_and_vocabulary`` fixed lived in ``apps/viewer/`` unnoticed
# -- ``VA.needsAnnotation``'s ``confidence === "untraced" || confidence ===
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
# at all; nothing static can, and generation is what keeps a table that exists
# honest.
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
#:
#: ``vocab.gen.js`` is excluded for the reason ``tests.js`` is, one step further
#: along: it is nothing BUT vocabularies written out, and it is generated, so a
#: finding in it would be a finding against a file nobody edits.
def viewer_sources() -> list[Path]:
    viewer = REPO_ROOT / "apps" / "viewer"
    paths = (sorted(viewer.glob("*.js")) + sorted((viewer / "views").glob("*.js"))
             + sorted((viewer / "storage").glob("*.js")))
    return [p for p in paths
            if p.name not in {"tests.js", "fixtures.js", "topology_fixtures.js",
                              "vocab.gen.js"}]


def viewer_tables() -> dict[str, frozenset[str]]:
    """Every ``VA.<NAME>`` table the viewer defines, by name, with its members.

    Two sources, because since 2026-09-23 a viewer vocabulary lives in one of two
    shapes and the chain scan must be able to name either:

    * **hand-authored in the app** -- ``VA.CONFIDENCE_LABEL``, ``VA.ATTENTION``,
      ``VA.MONTH_NAMES``: read with the two character scanners above. An anchor
      either extractor refuses is skipped rather than raising, because a mid-scan
      raise would drop every table after the first awkward one.
    * **generated** -- the twenty-one the viewer reads out of
      ``apps/viewer/vocab.gen.js``. Those are taken from
      ``scripts/js_vocabulary.py``, the registry the file itself is rendered from,
      rather than by parsing the generated JS: one reader, the same words, and no
      second parser to keep honest. ``VA.VERDICTS = VOCAB.table("VERDICTS", {``
      does not match the ``VA.<NAME> = {`` anchor at all, so without this half
      every generated vocabulary would silently leave the scan's comparison set --
      and those are precisely the ones a chain is most likely to restate.
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
    for vocabulary in V.for_app("viewer"):
        tables[vocabulary.name] = frozenset(vocabulary.read())
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


def test_the_extractor_fails_loudly_when_the_table_is_not_there(viewer_js):
    """The empty-extraction guard, shown biting.

    Point the extractor at a name that does not exist and it must raise, not
    return an empty set. This is what keeps the chain scan honest: if
    ``js_object_keys`` ever answers "no keys" instead of "no table", a table drops
    out of ``viewer_tables`` and a chain that restates it is named against the
    wrong table, or against nothing.

    ``VA.CONFIDENCE_LABEL`` rather than one of the generated vocabularies,
    because a generated one has no ``VA.<NAME> = {`` line to find: what this
    scanner still reads is the hand-authored per-value copy beside them.
    """
    with pytest.raises(LookupError) as err:
        js_object_keys(viewer_js, "NO_SUCH_STATUSES")
    assert "found 0" in str(err.value)

    # Two definitions of the same table is the other way the anchor stops being
    # meaningful -- the scan would take the first and miss the keys of the second.
    doubled = viewer_js + "\n  VA.CONFIDENCE_LABEL = {\n    sneaky: 1,\n  };\n"
    with pytest.raises(LookupError) as err:
        js_object_keys(doubled, "CONFIDENCE_LABEL")
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

    doubled = viewer_js + '\n  VA.DEEP_LINK_PARAMS = ["sneaky"];\n'
    with pytest.raises(LookupError) as err:
        js_array_strings(doubled, "DEEP_LINK_PARAMS")
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
