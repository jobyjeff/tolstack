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
is :data:`DECLARED_COMBINING_EXCEPTIONS` below, with three things paired against
it: the sites the walker actually finds in ``thermal.py``, each exception's own
docstring, and every passage in the repo that **states** the rule. None of them
can move alone.

That third pairing walked a hand-kept dict of three passages until 2026-09-03
(``doc_coverage_sets_derived``), which is the same defect one ring out: four more
live passages asserted the rule's *absolute* form and were invisible rather than
unpaired. It is a search now -- see section 6.

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


def thermal_function_names() -> frozenset[str]:
    """Every top-level function ``thermal.py`` defines, read off the tree."""
    tree = ast.parse(THERMAL.read_text(encoding="utf-8"), filename=str(THERMAL))
    return frozenset(node.name for node in tree.body
                     if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)))


# --------------------------------------------------------------------------- #
# 6. the passages that state the rule -- FOUND, not listed                     #
# --------------------------------------------------------------------------- #
#
# ``RULE_PASSAGES`` used to be a hand-kept dict of three entries here, and it had
# the defect the whole module exists against, one ring out: a passage that was
# not in it was not merely unpaired, it was **invisible**. Four more live
# passages stated the rule's *absolute* form with nothing red -- one of them
# inside the very section the pairing test reads, four paragraphs above the
# anchor it selects on
# (``ISSUE_20260902_the_one_fold_rules_absolute_form_survives_outside_rule_passages``).
# The absolute is exactly what a reader writes when they have not read the
# exception, so an unlisted passage was the highest-value thing to catch and the
# thing a list cannot catch.
#
# So the passages are now **derived**: search the corpus for the rule's own
# words. Three things that search has to get right, each of which cost a
# previous session:
#
# * **Two phrasing families, no single phrase.** The registered passages said
#   *"combines two element values"*; the four unregistered ones said *"the only
#   place element values are combined"*. A pattern keyed on either alone finds
#   only its own family, so :data:`RULE_STATEMENT` matches ``combin*`` on either
#   side of ``element values``.
# * **Line wrapping.** One of the four was split between ``place`` and ``where``
#   and invisible to ``grep``. Every unit below is whitespace-flattened first --
#   the same lesson the anchor pairing already encoded.
# * **The negative direction is what needs guarding.** The pairing test asks
#   "does this passage name the right exceptions?"; the defect is "this passage
#   never mentions exceptions at all", which reads as a *stronger* claim.
#
# False positives are cheap here and silence is not -- the same trade the
# hardware-count and traced-ratio scanners in ``tests/test_tolerance_stack.py``
# make -- so the pattern is deliberately wider than the rule.

#: The rule's own words, both phrasing families, over whitespace-flattened text.
RULE_STATEMENT = re.compile(
    r"combin\w*[^.\n]{0,40}?element[- ]values"
    r"|element[- ]values[^.\n]{0,40}?combin\w*", re.I)

#: What makes a statement of the rule *conditional* rather than absolute. Either
#: the passage acknowledges that exceptions exist -- any inflection of the word,
#: which covers "except the sites on the declared exception list", "plus a short
#: list of exceptions", "it declares no exception of its own" and
#: ``DECLARED_COMBINING_EXCEPTIONS`` itself -- or it defers by name to the
#: section that states them. Deferring is as good as stating: the module
#: inventory row has never restated the invariant and that is *why* it has never
#: been wrong.
RULE_QUALIFIERS = ("exception", SECTION_HEADING_PREFIX.lstrip("# "))

#: The documents and modules whose prose is believed to state the rule, paired
#: against what the scan actually finds. A passage deleted rather than corrected
#: would otherwise take its coverage with it and leave the scan green.
RULE_PASSAGE_SOURCES = (
    "ARCHITECTURE.md",
    "docs/DAG_TOPOLOGY.md",
    "docs/tolerance_stacks/ARCHETYPE_thermal_fit.md",
    "tolerance_stack/stack.py",
    "tolerance_stack/thermal.py",
    "tolerance_stack/topology.py",
)

#: Floor for the scan: 15 unquoted passages on 2026-09-03, which is also today's
#: count. A floor rather than an exact count for the reason
#: ``assert_coverage_set`` gives -- the corpus is meant to grow without an edit
#: here -- and set *at* the count deliberately, so the asymmetry is the useful
#: one: a new passage stating the rule costs nobody a test fix, and a passage
#: deleted rather than corrected reddens.
RULE_STATEMENT_FLOOR = 15

#: Passages carrying :data:`EXCEPTION_ANCHOR` and therefore claiming to state the
#: list itself. Exactly these get paired against
#: :data:`DECLARED_COMBINING_EXCEPTIONS`, so the count is asserted exactly: a
#: passage deleted is a pairing silently lost.
ANCHOR_PASSAGE_COUNT = 3


@dataclass(frozen=True)
class Passage:
    """One flattened block of prose that states the rule, and where it lives."""

    location: str
    text: str
    quoted: bool

    @property
    def conditional(self) -> bool:
        return any(q.lower() in self.text.lower() for q in RULE_QUALIFIERS)


def _flattened_units(path: Path) -> list[tuple[int, str, bool]]:
    """``(first line, flattened text, is a blockquote)`` for each block in a file.

    Blank-line separated, which is a paragraph in markdown and in a docstring
    alike. A markdown **table** is split row by row instead: a table is many
    independent claims sharing one block, and ``ARCHITECTURE.md``'s ``fold(terms)``
    row is one of the four passages this scan exists to see -- reading the table
    whole would let a qualified row two lines away cover an absolute one.
    """
    blocks: list[tuple[int, list[str]]] = []
    current: list[str] = []
    start = 1
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            if current:
                blocks.append((start, current))
                current = []
            continue
        if not current:
            start = number
        current.append(line)
    if current:
        blocks.append((start, current))

    units = []
    for start, block in blocks:
        if all(line.lstrip().startswith("|") for line in block):
            units += [(start + offset, re.sub(r"\s+", " ", line).strip(), False)
                      for offset, line in enumerate(block)]
        else:
            units.append((start,
                          re.sub(r"\s+", " ", " ".join(block)).strip(),
                          all(line.lstrip().startswith(">") for line in block)))
    return units


def rule_scan_sources() -> list[Path]:
    """The corpus: every live document, plus the package's own modules.

    ``live_documents()`` is the walk the traced-ratio and hardware-count guards
    share, so this scan inherits its scope decisions rather than making a second
    set of them -- including the one this issue insisted be **deliberate**:
    ``PROVENANCE.md`` states the absolute form in three of its dated amendments
    and is exempt because it is dated history, not because a glob happened to
    miss it (``_HISTORICAL_NAMES``, and
    ``test_the_rule_scan_exempts_dated_history_on_purpose`` below).

    ``tests/`` is deliberately **not** in the corpus. Its prose is *about* the
    detector -- "``sleeve_bore + 2 * wall`` is two element values combined" --
    and including it means registering five exemptions that describe how the scan
    works. The rule's readers land on documents and on the package's docstrings.
    """
    from tests.test_tolerance_stack import live_documents

    return ([p for p in live_documents(REPO_ROOT) if p.suffix == ".md"]
            + sorted((REPO_ROOT / "tolerance_stack").glob("*.py")))


def passages_in(path: Path, rel: str,
                skip: set[tuple[str, int]] = frozenset()) -> list[Passage]:
    """Every unit of ``path`` that states the rule, at most one finding each.

    A quotation is a report of what a document used to say, not a claim about
    now -- a blockquote line or a double-quoted phrase, the two forms this repo
    corrects a superseded sentence in, and the same exemption
    ``tests/test_tolerance_stack.py``'s ``_quoted_spans`` applies to a superseded
    number. Recomputed here rather than imported because a flattened unit has no
    line starts left for the blockquote half to match on.
    """
    found = []
    for line, text, blockquote in _flattened_units(path):
        if (rel, line) in skip:
            continue
        spans = [(m.start(), m.end())
                 for m in re.finditer(r'"[^"\n]{0,300}"', text)]
        for match in RULE_STATEMENT.finditer(text):
            quoted = blockquote or any(a <= match.start() < b for a, b in spans)
            found.append(Passage(f"{rel}:{line}", text, quoted))
            break                   # one finding per passage, not per sentence
    return found


def rule_statements() -> list[Passage]:
    """Every passage in the corpus that states the one-fold rule."""
    skip = _exception_docstring_lines()
    return [passage
            for path in rule_scan_sources()
            for passage in passages_in(
                path, path.relative_to(REPO_ROOT).as_posix(), skip)]


def _exception_docstring_lines() -> set[tuple[str, int]]:
    """Blocks inside a declared exception's own docstring, keyed as the scan keys.

    ``workbook_corner``'s docstring carries the anchor and says *"this function"*
    rather than naming itself in backticks, so the pairing below would read it as
    a passage naming **no** exception. It is not unguarded: it is paired by
    ``test_every_declared_exception_argues_its_case_in_its_own_docstring``, from
    the other end, and that test is where a second exception's docstring would be
    required to argue its case. Derived from the list, so an exception added or
    removed moves this with it.
    """
    tree = ast.parse(THERMAL.read_text(encoding="utf-8"), filename=str(THERMAL))
    functions = {node.name: node for node in ast.walk(tree)
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
    rel = THERMAL.relative_to(REPO_ROOT).as_posix()
    spans = []
    for name in DECLARED_COMBINING_EXCEPTIONS:
        node = functions.get(name)
        body = node.body[0] if node and node.body else None
        if isinstance(body, ast.Expr) and isinstance(body.value, ast.Constant):
            spans.append((body.lineno, body.end_lineno))
    return {(rel, line)
            for first, last in spans
            for line, _, _ in _flattened_units(THERMAL)
            if first <= line <= last}


def test_the_rule_statement_scan_is_non_empty_and_reads_every_passage():
    """The derived set, guarded -- because an empty scan reports green.

    This is the assertion the hand-kept dict never needed and every derivation
    does: a scan whose corpus glob points somewhere wrong finds no absolute
    anywhere and passes. Floor plus per-source presence, so a passage deleted
    rather than corrected reddens here instead of quietly reducing coverage.
    """
    from tests.test_tolerance_stack import assert_coverage_set

    statements = [p for p in rule_statements() if not p.quoted]
    assert_coverage_set("one-fold rule statements", statements,
                        RULE_STATEMENT_FLOOR)

    seen = {p.location.rsplit(":", 1)[0] for p in statements}
    unread = [name for name in RULE_PASSAGE_SOURCES if name not in seen]
    assert unread == [], (
        f"{unread} are believed to state the one-fold rule and the scan finds no "
        f"passage in them. Either the passage was deleted rather than corrected "
        f"-- in which case drop the file from RULE_PASSAGE_SOURCES and say why -- "
        f"or the corpus stopped reaching it."
    )


def test_every_live_passage_stating_the_rule_states_it_conditionally():
    """The defect, generalised past the list that could not see it.

    A passage stating the rule must either carry its exceptions or defer by name
    to the section that does. The absolute form is the failure: it is what a
    reader writes when they have not read the exception, it reads as a *stronger*
    claim than the truth, and until 2026-09-03 four live passages carried it with
    nothing red -- including ``stack.py``'s ``fold()`` docstring, the single
    most-read statement of this rule in the repo.
    """
    absolute = [p.location for p in rule_statements()
                if not p.quoted and not p.conditional]
    assert absolute == [], (
        f"these passages state the one-fold rule in its ABSOLUTE form: "
        f"{absolute}.\nThe rule has been conditional since 2026-09-01: nothing "
        f"outside fold() combines element values, EXCEPT the sites on the "
        f"declared exception list. Say so, or defer to ARCHITECTURE.md's "
        f"{SECTION_HEADING_PREFIX.lstrip('# ')!r} -- a passage that mentions no "
        f"exception is claiming more than is true. Quoting a superseded sentence "
        f"is fine: put it in a blockquote or double quotes, the house convention "
        f"the doc scanners already read."
    )


def test_every_passage_stating_the_rule_names_exactly_the_declared_exceptions():
    """Each passage that claims to state the list, paired with the list itself.

    Narrower than the test above and older: a passage carrying
    :data:`EXCEPTION_ANCHOR` is not merely acknowledging exceptions, it is stating
    *which*, so the ``thermal.py`` functions it names in backticks must be exactly
    :data:`DECLARED_COMBINING_EXCEPTIONS`. An exception added to the list without
    being written into a passage reddens this, and so does prose naming a site
    the list does not know.
    """
    anchored = [p for p in rule_statements()
                if not p.quoted and EXCEPTION_ANCHOR in p.text]
    assert len(anchored) == ANCHOR_PASSAGE_COUNT, (
        f"{len(anchored)} passages state the declared exception list, expected "
        f"{ANCHOR_PASSAGE_COUNT}: {[p.location for p in anchored]}. A passage "
        f"gained or lost the anchor phrase -- if the rule is now stated in one "
        f"more place, that place is paired from here on."
    )
    thermal_names = thermal_function_names()
    for passage in anchored:
        quoted = {token.strip("()")
                  for token in re.findall(r"`([^`]+)`", passage.text)}
        named = quoted & thermal_names
        assert named == set(DECLARED_COMBINING_EXCEPTIONS), (
            f"{passage.location} names {sorted(named)} as the exceptions to the "
            f"one-fold rule and DECLARED_COMBINING_EXCEPTIONS holds "
            f"{sorted(DECLARED_COMBINING_EXCEPTIONS)}:\n"
            f"  on the list, not in the passage: "
            f"{sorted(set(DECLARED_COMBINING_EXCEPTIONS) - named)}\n"
            f"  in the passage, not on the list: "
            f"{sorted(named - set(DECLARED_COMBINING_EXCEPTIONS))}"
        )


def test_the_rule_scan_exempts_dated_history_on_purpose():
    """``PROVENANCE.md`` is out of scope by decision, and the decision is checked.

    Three of its dated ``stack.py`` amendments repeat *"`fold()` is still the only
    place element values are combined"* -- one of them the 2026-08-05 amendment
    that shipped ``workbook_corner``, so it was false as written. Rewriting a
    dated amendment is not a thing this repo does, and the issue that filed this
    scan asked that the exemption be explicit rather than accidental. Both halves
    are asserted: the file is outside the corpus, **and** it would be caught if it
    were not -- an exemption nobody can see failing is indistinguishable from a
    glob that never reached the file.
    """
    provenance = REPO_ROOT / "PROVENANCE.md"
    assert provenance not in rule_scan_sources()

    stated = [text for _, text, blockquote in _flattened_units(provenance)
              if not blockquote and RULE_STATEMENT.search(text)]
    assert any("still the only place element values are combined" in text
               for text in stated), (
        "PROVENANCE.md no longer carries the 2026-08-05 amendment's "
        "*'`fold()` is still the only place element values are combined'*, which "
        "is what the exemption is for -- an amendment that shipped "
        "`workbook_corner` and was false as written, in a file this repo does not "
        "rewrite. An exemption nobody can see failing is indistinguishable from a "
        "glob that never reached the file, so if the sentence really is gone, "
        "re-argue the exemption rather than deleting this assertion."
    )


def test_the_rule_statement_scan_can_fail(tmp_path):
    """The scan, watched failing on each shape it exists to catch.

    Both phrasing families, the line wrap that hid one of the four from ``grep``,
    the table row that a whole-block read would have covered, and the two ways a
    passage is allowed to state the absolute -- a qualifier, or a quotation.
    """
    def scan(text: str) -> list[Passage]:
        path = tmp_path / "d.md"
        path.write_text(text, encoding="utf-8")
        return [p for p in passages_in(path, "d.md")
                if not p.quoted and not p.conditional]

    # Family one, and family two -- neither pattern alone sees both.
    assert len(scan("`fold()` never combines two element values.")) == 1
    assert len(scan("It is the only place element values are combined.")) == 1

    # Wrapped between `place` and `where`, which is how the sharpest of the four
    # survived a plain grep for a month.
    assert len(scan("It is one place\nwhere element values get combined.")) == 1

    # A table row is its own unit: the qualified row must not cover the bare one
    # sitting beside it.
    rows = scan("| `fold()` | the only place element values are combined |\n"
                "| `x()` | combines element values, outside the exceptions |\n")
    assert len(rows) == 1 and rows[0].location == "d.md:1", rows

    # Silent: conditional in either accepted form, and quoted in either of the
    # two the house convention allows.
    assert scan("Nothing outside `fold()` combines two element values, "
                "except the sites on the declared exception list.") == []
    assert scan('No element values are combined here. See ARCHITECTURE.md, '
                '"Where computation may live".') == []
    assert scan("> It is the only place element values are combined.") == []
    assert scan('It read "the only place element values are combined" '
                'until 2026-09-01.') == []


def test_the_rule_scan_goes_red_on_a_corpus_pointed_nowhere(tmp_path):
    """The derivation pointed at an empty tree, and watched failing.

    The failure a derived coverage set has and a hand-kept one does not: the scan
    runs over nothing, finds no absolute, and reports green.
    """
    from tests.test_tolerance_stack import assert_coverage_set, live_documents

    assert live_documents(tmp_path) == []
    with pytest.raises(AssertionError, match="coverage set is EMPTY"):
        assert_coverage_set("one-fold rule statements", [], RULE_STATEMENT_FLOOR)


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
# 7. the walker, shown failing                                                #
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
