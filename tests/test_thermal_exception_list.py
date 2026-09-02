"""The declared exception list to *"nothing outside ``fold()`` combines element
values"*, and the walker that holds ``thermal.py`` to it.

Why this module exists
----------------------

``ARCHITECTURE.md``'s "Where computation may live" section stated an absolute --
*"``thermal.py`` ... never combines two element values"* -- that the same file's
module inventory contradicted in prose two sections earlier, and that
``workbook_corner`` had contradicted in code since 2026-08-05
(``ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values``,
then ``BRIEF_20260826_thermal_never_combines_invariant``). The decision
(2026-09-01) was that ``workbook_corner`` is right and the *rule* was wrong: a
coherent material corner is a single-valued evaluation of one point, not a fold
over a band, so routing it through :func:`~tolerance_stack.fold` would create the
second arithmetic path this repo exists to refuse.

An exception written only in prose is an exception that grows. So the rule is now
conditional -- *except the sites on the declared exception list* -- and the list
is :data:`DECLARED_COMBINING_EXCEPTIONS` below, with four things paired against
it: the sites the walker actually finds in ``thermal.py``, the wording of
``ARCHITECTURE.md``'s rule section, ``thermal.py``'s own module docstring, and
each exception's docstring. None of them can move alone.

How "combines two element values" is detected
---------------------------------------------

A taint walk, per function (nested and method bodies included), in three parts:

* **Seeds.** Any attribute read whose name is a value field of
  :class:`~tolerance_stack.StackElement` -- ``nominal``/``min``/``max``/
  ``lmc``/``mmc``/``plus_minus`` and the ``mid``/``half_range`` properties. That
  set is read out of ``stack.py``'s class definition, never listed here: a new
  value field is in scope the moment it exists.
* **Propagation.** A local bound to a tainted expression is tainted; a nested
  function that returns a tainted expression makes its own calls tainted (this
  is what reaches ``workbook_corner``'s inner ``at()`` helper, where the element
  read is one indirection away from the arithmetic); a call carrying a tainted
  argument is tainted, so wrapping a value in ``abs()`` or ``float()`` does not
  launder it. Run to a fixed point, so declaration order does not matter.
* **The finding.** Arithmetic where **both** sides are tainted. That is the
  whole distinction the rule turns on: ``element.nominal * f_sleeve`` is a
  *weight on one element value* and is what ``thermal.py`` is for;
  ``sleeve_bore + 2 * wall`` is two element values combined and needs to be on
  the list. ``AugAssign`` counts (``total += e.nominal`` is the loop spelling of
  the same thing), and so does an aggregating call -- every name in
  :data:`AGGREGATING_CALLS` -- over two tainted arguments or a tainted
  collection, which is how a fold could be spelled without a single ``BinOp``.

What it deliberately ignores
----------------------------

* **Arithmetic that never touches an element.** ``thermal_factor``'s
  ``1 + dt * alpha`` and ``stage_terms``'s ``2 * k * f_sleeve`` combine
  *material* and *stiffness* numbers into coefficients. That is the archetype's
  job and no amount of it is a second combiner -- the terms it weights are still
  folded by ``fold()``.
* **Element values read without arithmetic.** ``expanded_terms_table`` puts
  ``min``/``max``/``nominal`` in a dict for the worksheet. Reading is not
  combining.
* **A tainted value crossing a function boundary at module level.** Taint is
  per-top-level-function; a helper that took a ``StackElement`` argument and
  returned a combination would be caught inside itself, not at its call site.
  There is no such helper today, and that is the direction to extend this if one
  arrives.
* **Comparisons.** ``a.min > b.max`` is a decision, not a value, and the rule is
  about where element values get *combined*.
* **A combining call this module has never heard of.** The operator-free
  spellings are recognised by *name*, out of :data:`AGGREGATING_CALLS`, so a
  combination routed through something not on that list is a silent miss --
  ``functools.reduce(op, [a.min, b.min])`` is the one shape left after the
  review of 2026-09-02 widened the list. That direction is the dangerous one
  (quiet), so widen the list rather than reasoning about likelihood.

A note on the other direction, which is loud rather than quiet: the seeds are
attribute **names**, so ``interval.min + interval.max`` over two fold results is
reported as a site even though no ``StackElement`` is in sight. That is a false
positive by construction and it is the tolerable one -- it arrives as a red test
naming the line, not as silence.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import Path

import pytest

from tests.test_architecture_inventory import parse_rows

REPO_ROOT = Path(__file__).resolve().parent.parent
THERMAL = REPO_ROOT / "tolerance_stack" / "thermal.py"
STACK = REPO_ROOT / "tolerance_stack" / "stack.py"
ARCHITECTURE = REPO_ROOT / "ARCHITECTURE.md"
ARCHETYPE = REPO_ROOT / "docs" / "tolerance_stacks" / "ARCHETYPE_thermal_fit.md"

#: The rule's own section, and the phrase all four passages are anchored on. The
#: anchor is deliberately a phrase and not a heading: it has to appear in the
#: rule section, in every exception's docstring, and nowhere by accident.
SECTION_HEADING_PREFIX = "### Where computation may live"
EXCEPTION_ANCHOR = "declared exception list"

#: **The list.** Functions in ``thermal.py`` permitted to combine two element
#: values outside ``fold()``. Adding a name here is a design decision, not a
#: test fix: it says the site is a single-valued reading that a fold cannot
#: express, and it owes the reader the argument in its own docstring plus a
#: mention in ``ARCHITECTURE.md``'s rule section -- both of which the tests below
#: require. Removing the last name would make the rule absolute again, which is
#: the state the repo believed it was in for a month while it was not.
DECLARED_COMBINING_EXCEPTIONS = ("workbook_corner",)

#: Calls that combine several values into one without writing an operator. A
#: fold spelled ``sum(...)`` is still a fold, and so is one spelled
#: ``operator.sub(...)`` or ``math.prod(...)`` -- matched by the call's own name,
#: so both the bare and the ``module.name`` forms are seen. Widened during
#: ``review/thermal_exception_declared`` (2026-09-02), where the first three
#: shapes probed past the list's own edge (``operator.sub``, ``math.prod``) were
#: all silent misses.
AGGREGATING_CALLS = (
    "sum", "fsum", "min", "max", "prod",
    "add", "sub", "mul", "truediv", "floordiv", "pow",
)

#: Binary operators that produce a combined value. Comparisons and boolean
#: operators are excluded on purpose -- see the module docstring.
ARITHMETIC_OPS = (
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod, ast.Pow,
)

#: Nodes that hold several values at once, so a single tainted one of them
#: passed to an aggregating call is a combination.
COLLECTION_NODES = (
    ast.List, ast.Tuple, ast.Set, ast.ListComp, ast.SetComp, ast.GeneratorExp,
)


# --------------------------------------------------------------------------- #
# 1. what an element value is, read off StackElement                          #
# --------------------------------------------------------------------------- #

def element_value_fields() -> frozenset[str]:
    """The names by which a :class:`StackElement` hands out a number.

    Read from ``stack.py``: the dataclass fields annotated ``float`` (or
    ``Optional[float]``) plus the ``@property`` accessors returning one. Listing
    them here instead would be the drift this repo keeps paying for -- a value
    field added to the class would be invisible to the walker while the walker
    still read as complete.
    """
    tree = ast.parse(STACK.read_text(encoding="utf-8"), filename=str(STACK))
    classes = [node for node in ast.walk(tree)
               if isinstance(node, ast.ClassDef) and node.name == "StackElement"]
    if len(classes) != 1:
        raise LookupError(
            f"expected exactly one StackElement class in {STACK.name}, found "
            f"{len(classes)} -- the walker below has nothing to seed from"
        )
    names: set[str] = set()
    for node in classes[0].body:
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            if "float" in ast.unparse(node.annotation):
                names.add(node.target.id)
        elif isinstance(node, ast.FunctionDef):
            decorated = any(
                isinstance(d, ast.Name) and d.id == "property"
                for d in node.decorator_list
            )
            if decorated and node.returns and "float" in ast.unparse(node.returns):
                names.add(node.name)
    return frozenset(names)


# --------------------------------------------------------------------------- #
# 2. the walker                                                               #
# --------------------------------------------------------------------------- #

@dataclass(frozen=True)
class Site:
    """One place where two element-derived values are combined."""

    function: str   # the top-level function or Class.method that holds it
    line: int
    source: str     # the expression as written, for the failure message


def _returns(node: ast.AST) -> list[ast.expr]:
    """Every ``return <expr>`` in ``node``, excluding nested functions' own."""
    out: list[ast.expr] = []
    for child in ast.iter_child_nodes(node):
        if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            continue
        if isinstance(child, ast.Return) and child.value is not None:
            out.append(child.value)
        out.extend(_returns(child))
    return out


def _assigned_names(target: ast.expr) -> list[str]:
    return [node.id for node in ast.walk(target) if isinstance(node, ast.Name)]


class _Taint:
    """Which names and local callables in one function carry an element value."""

    def __init__(self, fields: frozenset[str]) -> None:
        self.fields = fields
        self.names: set[str] = set()
        self.callables: set[str] = set()

    def tainted(self, node: ast.AST | None) -> bool:
        if node is None:
            return False
        if isinstance(node, ast.Attribute) and node.attr in self.fields:
            return True
        if isinstance(node, ast.Name):
            return node.id in self.names
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Name) and func.id in self.callables:
                return True
            if isinstance(func, ast.Attribute) and func.attr in self.callables:
                return True
        return any(self.tainted(child) for child in ast.iter_child_nodes(node))

    def saturate(self, scope: ast.AST) -> None:
        """Propagate to a fixed point, so declaration order does not matter."""
        for _ in range(64):
            before = (len(self.names), len(self.callables))
            for node in ast.walk(scope):
                if isinstance(node, ast.Assign) and self.tainted(node.value):
                    for target in node.targets:
                        self.names.update(_assigned_names(target))
                elif isinstance(node, ast.AnnAssign) and self.tainted(node.value):
                    self.names.update(_assigned_names(node.target))
                elif isinstance(node, ast.AugAssign) and self.tainted(node.value):
                    self.names.update(_assigned_names(node.target))
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    if any(self.tainted(value) for value in _returns(node)):
                        self.callables.add(node.name)
            if (len(self.names), len(self.callables)) == before:
                return
        raise RuntimeError(
            "taint propagation did not settle in 64 passes -- the walker is "
            "looping and its findings cannot be trusted"
        )


def _aggregating(call: ast.Call) -> bool:
    func = call.func
    if isinstance(func, ast.Name):
        return func.id in AGGREGATING_CALLS
    if isinstance(func, ast.Attribute):
        return func.attr in AGGREGATING_CALLS
    return False


def _scopes(tree: ast.Module) -> list[tuple[str, ast.AST]]:
    """Every function whose body is walked, with the name a finding reports."""
    out: list[tuple[str, ast.AST]] = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out.append((node.name, node))
        elif isinstance(node, ast.ClassDef):
            for child in node.body:
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    out.append((f"{node.name}.{child.name}", child))
    return out


def combining_sites(source: str, fields: frozenset[str]) -> tuple[Site, ...]:
    """Every place in ``source`` where two element-derived values are combined.

    See the module docstring for the shapes this recognises and the ones it
    deliberately does not.
    """
    tree = ast.parse(source)
    found: list[Site] = []
    for name, scope in _scopes(tree):
        taint = _Taint(fields)
        taint.saturate(scope)

        def record(node: ast.AST) -> None:
            found.append(Site(name, node.lineno, ast.unparse(node)))

        for node in ast.walk(scope):
            if isinstance(node, ast.BinOp) and isinstance(node.op, ARITHMETIC_OPS):
                if taint.tainted(node.left) and taint.tainted(node.right):
                    record(node)
            elif isinstance(node, ast.AugAssign) and isinstance(node.op, ARITHMETIC_OPS):
                if taint.tainted(node.target) and taint.tainted(node.value):
                    record(node)
            elif isinstance(node, ast.Call) and _aggregating(node):
                tainted_args = [arg for arg in node.args if taint.tainted(arg)]
                if len(tainted_args) >= 2 or any(
                        isinstance(arg, COLLECTION_NODES) for arg in tainted_args):
                    record(node)
    return tuple(found)


@pytest.fixture(scope="module")
def fields() -> frozenset[str]:
    return element_value_fields()


@pytest.fixture(scope="module")
def sites(fields: frozenset[str]) -> tuple[Site, ...]:
    return combining_sites(THERMAL.read_text(encoding="utf-8"), fields)


# --------------------------------------------------------------------------- #
# 3. the extraction, asserted before anything is compared                     #
# --------------------------------------------------------------------------- #

def test_the_element_value_fields_are_read_off_the_class_and_are_real(fields):
    """Anti-vacuity, both ways: the seeds exist, and they are really fields.

    A reader that extracted nothing would make the walker below find nothing and
    the exception list pass against anything.
    """
    from tolerance_stack.stack import StackElement

    assert len(fields) >= 5, (
        f"only {sorted(fields)} extracted from StackElement; the class has "
        f"carried at least the three lengths plus lmc/mmc since founding, so the "
        f"reader has drifted from the class's shape"
    )
    # Every extracted field that IS a constructor field is filled from the
    # extracted set rather than a hand-written kwargs list: an optional value
    # field added to the class tomorrow would otherwise default to None here and
    # redden this test with a message blaming the reader, which is how a guard
    # gets deleted for a defect it does not have.
    filled = {name: 1.0 for name in fields
              if name in StackElement.__dataclass_fields__}
    element = StackElement(id="e", name="an element", role="washer",
                           **{"nominal": 1.0, "min": 1.0, "max": 1.0, **filled})
    for field in sorted(fields):
        assert isinstance(getattr(element, field), float), (
            f"StackElement.{field} was extracted as a value field and does not "
            f"read as a number"
        )


def test_the_walker_finds_arithmetic_in_thermal_at_all(sites):
    """Anti-vacuity for the pairing below: a walker finding zero sites would
    make every exception list correct, including an empty one."""
    assert sites, (
        f"the walker found no site in {THERMAL.name} combining two element "
        f"values. Either the module genuinely stopped doing it -- then empty "
        f"DECLARED_COMBINING_EXCEPTIONS and delete this test -- or the walker no "
        f"longer recognises the shape it is written for"
    )


# --------------------------------------------------------------------------- #
# 4. the pairings: code, rule, docstring                                      #
# --------------------------------------------------------------------------- #

def test_every_combining_site_in_thermal_is_on_the_declared_exception_list(sites):
    """The invariant, stated the way it is actually true.

    ``fold()`` is the only place element values are combined, **except** the
    sites named in ``DECLARED_COMBINING_EXCEPTIONS``. A new site in
    ``thermal.py`` reddens this, which is the point: the second arithmetic path
    this repo refuses cannot arrive quietly, and adding the name here is a
    decision someone has to write down.
    """
    strangers = [site for site in sites
                 if site.function not in DECLARED_COMBINING_EXCEPTIONS]
    assert strangers == [], (
        "these sites in tolerance_stack/thermal.py combine two element values "
        "outside fold() and are not on DECLARED_COMBINING_EXCEPTIONS:\n"
        + "\n".join(f"  thermal.py:{s.line} in {s.function}(): {s.source}"
                    for s in strangers)
        + "\nEither weight ONE element value per term and let fold() combine them "
          "(the whole reason `Term.coefficient` exists), or -- if this really is a "
          "single-valued reading a fold cannot express -- add the function to "
          "DECLARED_COMBINING_EXCEPTIONS, argue it in its docstring, and name it "
          "in ARCHITECTURE.md's rule section. All three are required."
    )


def test_every_declared_exception_still_combines_something(sites):
    """The other direction: a name on the list that no longer earns its place.

    An exception outliving the code it excused is how the rule gets weaker than
    it reads -- the same defect as the absolute the rule used to state, pointing
    the other way.
    """
    owners = {site.function for site in sites}
    stale = [name for name in DECLARED_COMBINING_EXCEPTIONS if name not in owners]
    assert stale == [], (
        f"{stale} are declared exceptions and combine no element values in "
        f"thermal.py any more. Drop them from DECLARED_COMBINING_EXCEPTIONS and "
        f"from ARCHITECTURE.md's rule section -- the rule is stronger without them."
    )


def test_every_declared_exception_argues_its_case_in_its_own_docstring():
    """A reader who lands on the function must not have to find the rule first."""
    tree = ast.parse(THERMAL.read_text(encoding="utf-8"), filename=str(THERMAL))
    functions = {node.name: node for node in ast.walk(tree)
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
    for name in DECLARED_COMBINING_EXCEPTIONS:
        assert name in functions, (
            f"DECLARED_COMBINING_EXCEPTIONS names {name!r}, which thermal.py does "
            f"not define"
        )
        doc = re.sub(r"\s+", " ", ast.get_docstring(functions[name]) or "")
        assert EXCEPTION_ANCHOR in doc, (
            f"thermal.py:{functions[name].lineno} {name}() is a declared exception "
            f"to the one-fold rule and its docstring never says so. It must "
            f"contain {EXCEPTION_ANCHOR!r} and the argument for why a fold cannot "
            f"express what it computes."
        )


# --------------------------------------------------------------------------- #
# 5. the pairings: the rule section, and the inventory row that defers to it   #
# --------------------------------------------------------------------------- #

def rule_section() -> str:
    """``ARCHITECTURE.md``'s "Where computation may live" section, verbatim.

    Raises rather than returning nothing: an empty section would make the
    pairings below pass against a document that no longer states the rule.
    """
    text = ARCHITECTURE.read_text(encoding="utf-8")
    lines = text.splitlines()
    anchors = [i for i, line in enumerate(lines)
               if line.startswith(SECTION_HEADING_PREFIX)]
    if len(anchors) != 1:
        raise LookupError(
            f"expected exactly one {SECTION_HEADING_PREFIX!r} heading in "
            f"ARCHITECTURE.md, found {len(anchors)}. If the section was renamed, "
            f"point this module at it -- the rule is unguarded until it reads the "
            f"real section."
        )
    start = anchors[0] + 1
    end = start
    while end < len(lines) and not lines[end].startswith("### "):
        end += 1
    body = "\n".join(lines[start:end]).strip()
    if not body:
        raise LookupError(f"{SECTION_HEADING_PREFIX!r} has no body")
    return body


def anchor_paragraph(section: str) -> str:
    """The paragraph stating the rule and its exceptions, whitespace flattened.

    Flattened because the anchor phrase is prose and prose gets rewrapped: an
    invariant that goes unguarded the moment someone reflows a paragraph is
    worse than no invariant, because it reads as guarded.
    """
    paragraphs = [re.sub(r"\s+", " ", p).strip()
                  for p in re.split(r"\n\s*\n", section)]
    paragraphs = [p for p in paragraphs if EXCEPTION_ANCHOR in p]
    if len(paragraphs) != 1:
        raise LookupError(
            f"expected exactly one paragraph containing {EXCEPTION_ANCHOR!r} in "
            f"the rule section, found {len(paragraphs)}. The rule's exceptions "
            f"must be stated in one place, or a reader gets whichever one they "
            f"land on."
        )
    return paragraphs[0]


def thermal_function_names() -> frozenset[str]:
    """Every top-level function ``thermal.py`` defines, read off the tree."""
    tree = ast.parse(THERMAL.read_text(encoding="utf-8"), filename=str(THERMAL))
    return frozenset(node.name for node in tree.body
                     if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)))


def thermal_module_docstring() -> str:
    """``thermal.py``'s module docstring -- the first passage a reader of the
    module meets, and the one that stated the same absolute unnoticed."""
    doc = ast.get_docstring(ast.parse(THERMAL.read_text(encoding="utf-8")))
    if not doc:
        raise LookupError(f"{THERMAL.name} has no module docstring")
    return doc


def archetype_document() -> str:
    """The archetype's own document, which states the rule for its readers."""
    text = ARCHETYPE.read_text(encoding="utf-8")
    if EXCEPTION_ANCHOR not in re.sub(r"\s+", " ", text):
        raise LookupError(
            f"{ARCHETYPE.name} does not mention the {EXCEPTION_ANCHOR!r} at all. "
            f"It carried the absolute form of this rule (*\"computes weights and "
            f"never combines element values\"*) until 2026-09-01; if the passage "
            f"was deleted rather than corrected, drop it from RULE_PASSAGES."
        )
    return text


#: **Every live passage that states the rule**, and how to read it. Each must
#: carry :data:`EXCEPTION_ANCHOR` in exactly one paragraph and name exactly the
#: declared exceptions there. The rule lived in four passages and contradicted
#: itself in three of them for a month
#: (``ISSUE_20260821_architecture_says_thermal_py_never_combines_two_element_values``
#: found one); the whole point of a list is that there is one list, so a new
#: passage stating the rule belongs here rather than in prose on its own.
RULE_PASSAGES = {
    'ARCHITECTURE.md "Where computation may live"': rule_section,
    "tolerance_stack/thermal.py module docstring": thermal_module_docstring,
    "docs/tolerance_stacks/ARCHETYPE_thermal_fit.md": archetype_document,
}


@pytest.mark.parametrize("label", sorted(RULE_PASSAGES))
def test_every_passage_stating_the_rule_names_exactly_the_declared_exceptions(label):
    """Each passage a reader can land on, paired with the list a test reads.

    This is the defect the issue filed, generalised. A passage stated an absolute
    its own code contradicted and nothing was red; now each one must state the
    rule *conditionally* -- carrying the anchor phrase -- and the ``thermal.py``
    functions it names in that paragraph must be exactly the declared exceptions.
    An exception added to the list without being written into a passage reddens
    this, and so does prose naming a site the list does not know.
    """
    paragraph = anchor_paragraph(RULE_PASSAGES[label]())
    quoted = {token.strip("()") for token in re.findall(r"`([^`]+)`", paragraph)}
    named = quoted & thermal_function_names()
    assert named == set(DECLARED_COMBINING_EXCEPTIONS), (
        f"{label} names {sorted(named)} as the exceptions to the one-fold rule "
        f"and DECLARED_COMBINING_EXCEPTIONS holds "
        f"{sorted(DECLARED_COMBINING_EXCEPTIONS)}:\n"
        f"  on the list, not in the passage: "
        f"{sorted(set(DECLARED_COMBINING_EXCEPTIONS) - named)}\n"
        f"  in the passage, not on the list: "
        f"{sorted(named - set(DECLARED_COMBINING_EXCEPTIONS))}"
    )


def test_the_rule_section_points_at_the_list_that_enforces_it():
    """The pointer, so the reader can get from the prose to the guard.

    Both halves are read rather than written: the file name off ``__file__`` and
    the constant's name out of this module's own source, so renaming either one
    reddens this instead of leaving ARCHITECTURE.md pointing at nothing.
    """
    section = re.sub(r"\s+", " ", rule_section())
    assert Path(__file__).name in section, (
        f"ARCHITECTURE.md's rule section does not name {Path(__file__).name}, the "
        f"module that enforces it. A rule whose reader cannot find its guard is "
        f"the prose-only exception this whole change exists to end."
    )
    assert exception_list_constant_name() in section, (
        f"ARCHITECTURE.md's rule section does not name "
        f"{exception_list_constant_name()!r} -- the list it defers to was renamed "
        f"and the pointer was left behind."
    )


def exception_list_constant_name() -> str:
    """The name :data:`DECLARED_COMBINING_EXCEPTIONS` is bound to, read out of
    this module's source so a rename cannot outlive ARCHITECTURE.md's pointer."""
    tree = ast.parse(Path(__file__).read_text(encoding="utf-8"))
    matches = []
    for node in tree.body:
        if not (isinstance(node, ast.Assign) and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)):
            continue
        try:
            value = ast.literal_eval(node.value)
        except (ValueError, TypeError, SyntaxError):
            continue
        if value == DECLARED_COMBINING_EXCEPTIONS:
            matches.append(node.targets[0].id)
    if len(matches) != 1:
        raise LookupError(
            f"expected exactly one module-level constant holding the exception "
            f"list, found {matches}"
        )
    return matches[0]


def test_the_inventory_row_for_thermal_still_defers_to_the_rule_section():
    """The third passage: the module inventory row.

    It has said *"What arithmetic it may hold is bounded by 'Where computation
    may live'"* since ``architecture_inventory_quantifiers`` (2026-08-21), and
    deferring is what keeps it true -- the row is the one passage that has never
    restated the invariant, and restating it is how the contradiction happened.
    """
    rows = [row for row in parse_rows(ARCHITECTURE.read_text(encoding="utf-8"))
            if row.name == THERMAL.name]
    assert len(rows) == 1, f"expected exactly one {THERMAL.name} inventory row"
    heading = SECTION_HEADING_PREFIX.lstrip("# ")
    assert heading in rows[0].text, (
        f"ARCHITECTURE.md:{rows[0].line}: the {THERMAL.name} row no longer defers "
        f"to {heading!r}. Point at the rule; a row that states the invariant in "
        f"its own words is a third place for it to be wrong."
    )


# --------------------------------------------------------------------------- #
# 6. the walker, shown failing                                                #
# --------------------------------------------------------------------------- #

FIELDS_FOR_SYNTHETIC = frozenset({"nominal", "min", "max", "lmc", "mmc"})


def _owners(source: str) -> list[str]:
    return [site.function
            for site in combining_sites(source, FIELDS_FOR_SYNTHETIC)]


def test_the_walker_can_fail():
    """A guard nobody has watched fail is not a guard.

    Every shape the walker claims to catch, and the two it must not, on
    synthetic source -- so the pairing above is known to be doing something even
    while ``thermal.py`` holds exactly one exception.
    """
    # The shape workbook_corner is: an element read behind a local helper, then
    # two of them added. This is the one that must be caught through the
    # indirection.
    assert _owners(
        "def sneaky(stack):\n"
        "    def at(i):\n"
        "        return stack.element(i).nominal\n"
        "    a = at('a')\n"
        "    b = at('b')\n"
        "    return a - b\n"
    ) == ["sneaky"]

    # Two element values, directly.
    assert _owners("def f(x, y):\n    return x.max + y.min\n") == ["f"]

    # A weight on ONE element value -- what thermal.py is for, and not a site.
    assert _owners("def f(x, factor):\n    return x.nominal * factor\n") == []
    assert _owners(
        "def f(dt, alpha):\n    return 1.0 + dt * alpha * 1e-6\n") == []

    # The loop spelling, and the fold-without-an-operator spellings.
    assert _owners(
        "def f(elements):\n"
        "    total = 0.0\n"
        "    for e in elements:\n"
        "        total += e.nominal\n"
        "    return total\n"
    ) == ["f"]
    assert _owners(
        "def f(a, b):\n    return sum([a.min, b.min])\n") == ["f"]
    assert _owners("def f(a, b):\n    return min(a.max, b.max)\n") == ["f"]

    # ...including the ones that spell the operator as a function. Added in
    # review 2026-09-02: both of these were silent misses.
    assert _owners(
        "import operator\ndef f(a, b):\n    return operator.sub(a.min, b.min)\n"
    ) == ["f"]
    assert _owners(
        "import math\ndef f(a, b):\n    return math.prod([a.min, b.min])\n"
    ) == ["f"]

    # Laundering through a wrapper does not help.
    assert _owners("def f(a, b):\n    return abs(a.min) - float(b.max)\n") == ["f"]

    # A method reports as Class.method, so a site cannot hide in a dataclass.
    assert _owners(
        "class C:\n    def m(self, a, b):\n        return a.mmc - b.lmc\n"
    ) == ["C.m"]

    # Reading element values without combining them is not a site.
    assert _owners(
        "def f(terms):\n"
        "    return [{'min': t.element.min, 'max': t.element.max} for t in terms]\n"
    ) == []

    # A comparison is a decision, not a value.
    assert _owners("def f(a, b):\n    return a.min > b.max\n") == []
