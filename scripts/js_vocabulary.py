"""Every vocabulary the JavaScript apps render that **Python defines**.

This module is the one place that says *where each of those vocabularies lives
on the Python side*. Two things read it and nothing else does:

* ``scripts/generate_js_vocabulary.py`` writes ``apps/viewer/vocab.gen.js`` from
  it -- the single generated JS module both apps read their words out of;
* ``tests/test_js_vocabulary_is_generated.py`` regenerates and compares, which
  is the whole pairing now.

Why generation replaced pairing
-------------------------------

Until 2026-09-23 there were twenty-six hand copies -- eleven in
``apps/viewer/viewer.js``, ten in ``apps/viewer/topology.js``, five in
``apps/annotate/binding_state.js`` -- and three pytest modules comparing each
copy against its definition with a pair of character scanners over the JS. That
worked, and the scanners' own docstrings enumerated what they could not see: a
regex literal inside a table body (which silently SHORTENS a table rather than
emptying it), a depth-1 ternary, and an ``Object.assign(VA.TABLE, {...})``
adding a key from outside the literal, which was silent to everything.

A generated file has none of those blind spots, because nothing parses JS any
more: the words are rendered from Python and the test compares text. The copies
are gone rather than checked, which is the rung above checking -- the bug
pareto's R2 (``dispatch/docs/reports/REPORT_20260921_bug_pareto.md`` section 5),
adopted 2026-09-23. A hand edit to the generated file is red; a Python edit with
no regeneration is red; a word in a JS table the generated module does not carry
throws **when the app loads**, because ``VOCAB.table()`` compares the key set at
construction.

The rule the old modules were built on survives unchanged and is why every entry
below is a *reader*, never a list: **never restate a vocabulary in a third
place.** A tuple of words written here would be exactly the defect this file
exists to end, one layer up.

What is NOT here
----------------

* Vocabularies JavaScript itself owns -- ``VA.DEEP_LINK_PARAMS`` (paired against
  ``apps/viewer/README.md``'s contract section by
  ``tests/test_viewer_deep_link_contract.py``), ``VA.MONTH_NAMES``,
  ``AA.DESELECT_TARGETS``, ``AA.ON_OFF``. Python defines none of them.
* ``AA.BINDING_STATES``, which is a JS *composition*: two Python vocabularies
  plus ``unbound``, the value the fold deliberately never writes
  (``tolerance_stack.feature_identity.StackKeyBindings.state``'s docstring). It
  has no single Python owner to be generated from.
* The per-value copy each rendered table carries -- the sentence
  ``VA.VERDICTS.marginal`` shows a reader, the ``closes`` line on a gap kind.
  That is authored in JS, stays in JS, and is exactly what ``VOCAB.table()``
  takes as its second argument.
"""

from __future__ import annotations

import ast
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Tuple

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / "scripts"

THERMAL_PY = REPO_ROOT / "tolerance_stack" / "thermal.py"
CROPS_SCRIPT = SCRIPTS_DIR / "build_viewer_crops.py"
PROJECTION_SCRIPT = SCRIPTS_DIR / "build_viewer_projection.py"
TOPOLOGY_PROJECTION_SCRIPT = SCRIPTS_DIR / "build_topology_projection.py"

#: The JSON spelling of a Python ``None``, which is what an absent value literally
#: is by the time the viewer reads it out of a projection file -- and what a JS
#: property key coerces to, which is why ``VA.WORKSHEET_SOURCES`` spells its third
#: key ``"null"``. Named rather than written twice: it is the one place either
#: side of this generation is allowed to be re-spelled, and it should be arguable
#: in one place rather than looking like a typo in two.
JS_NULL_KEY = "null"


# --------------------------------------------------------------------------- #
# importing the builders -- `scripts/` is not a package                        #
# --------------------------------------------------------------------------- #

def _projection_module():
    """``scripts/build_viewer_projection.py``, imported by path."""
    sys.path.insert(0, str(SCRIPTS_DIR))
    import build_viewer_projection  # noqa: PLC0415 -- resolved from scripts/

    return build_viewer_projection


def _topology_projection_module():
    """``scripts/build_topology_projection.py``, imported by path.

    Its sibling ``_projection_module`` reaches the *stack* builder; this one is
    needed because the two viewer builders are deliberately not shared (each is a
    self-contained stdlib-only script), so a vocabulary can be defined in either.
    """
    sys.path.insert(0, str(SCRIPTS_DIR))
    import build_topology_projection  # noqa: PLC0415 -- resolved from scripts/

    return build_topology_projection


def _crops_module():
    """``scripts/build_viewer_crops.py``, imported by path.

    ``HIGHLIGHT_KINDS`` is a module-level constant, so it is read by import
    rather than by AST -- the way ``EXPORT_STATUSES`` and ``VERDICTS`` are.
    """
    sys.path.insert(0, str(SCRIPTS_DIR))
    import build_viewer_crops  # noqa: PLC0415 -- resolved from scripts/

    return build_viewer_crops


def _stack_module():
    from tolerance_stack import stack  # noqa: PLC0415

    return stack


def _topology_module():
    from tolerance_stack import topology  # noqa: PLC0415

    return topology


def _feature_identity_module():
    from tolerance_stack import feature_identity  # noqa: PLC0415

    return feature_identity


# --------------------------------------------------------------------------- #
# readers: each one reads a vocabulary out of its definition                   #
# --------------------------------------------------------------------------- #

def _values_statuses_from_source(source: str, resolve) -> Tuple[str, ...]:
    """The vocabulary the ``values_status`` membership test enforces.

    Read from the **check**, not from a copy of the list: whatever
    ``MaterialEntry.__post_init__`` will accept is by definition what the viewer
    may have to render. ``thermal.py`` spells it as a module-level constant today
    (``MATERIAL_VALUES_STATUSES``) and the name is resolved through ``resolve``; a
    tuple literal written straight into the comparison is read as written, so
    neither spelling turns this into a red test for no reason.
    """
    found: list[Tuple[str, ...]] = []
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
            "which is the drift this module exists to end."
        )
    return found[0]


def values_statuses() -> Tuple[str, ...]:
    def resolve(name: str):
        from tolerance_stack import thermal  # noqa: PLC0415

        return getattr(thermal, name)

    return _values_statuses_from_source(
        THERMAL_PY.read_text(encoding="utf-8"), resolve)


def crop_rules() -> Tuple[str, ...]:
    """Every ``resolved_by`` value ``build_viewer_crops.py`` can write.

    The script has no enumeration to import: the rules are string literals in the
    ``resolve_pdf`` branches that succeed. So take them from the dict literals
    themselves -- ``{"pdf": ..., "resolved_by": "spec_pile", ...}`` -- which is
    still the definition and not a copy. The one non-constant site
    (``"resolved_by": resolved["resolved_by"]``, where the entry is assembled) is
    skipped by the ``isinstance`` test: it forwards a value, it does not mint one.
    """
    out: list[str] = []
    for node in ast.walk(ast.parse(CROPS_SCRIPT.read_text(encoding="utf-8"))):
        if not isinstance(node, ast.Dict):
            continue
        for key, value in zip(node.keys, node.values):
            if (isinstance(key, ast.Constant) and key.value == "resolved_by"
                    and isinstance(value, ast.Constant)
                    and isinstance(value.value, str)):
                out.append(value.value)
    return tuple(sorted(set(out)))


def crop_placements() -> Tuple[str, ...]:
    """Every ``located_by`` value ``build_viewer_crops.py`` can write.

    Same shape of problem, and same answer, as :func:`crop_rules`. Scoped to
    ``locate()`` rather than to the whole module on purpose -- ``locate`` is where
    a placement is *minted*, and a future forwarding site
    (``"located_by": placement["located_by"]``) would otherwise have to be
    excluded by hand the way :func:`crop_rules` excludes its one.
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
                    and isinstance(value, ast.Constant)
                    and isinstance(value.value, str)):
                out.append(value.value)
    return tuple(sorted(set(out)))


def identity_rules() -> Tuple[str, ...]:
    """Every value ``identity_rule_of_ref`` can return, ``None`` aside.

    Same shape of problem as :func:`crop_rules`: there is no enumeration to
    import, there is a helper that *mints* the value -- so read the helper's own
    ``return`` statements. A returned name is resolved through the module (the
    values are module constants today, ``IDENTITY_RULE_SPEC_PILE``); a returned
    literal is taken as written; ``None`` is skipped, because "no rule identifies
    these bytes" is the majority answer and not a value the viewer needs a branch
    for -- ``VA.exportProvenance`` reads a falsy marker as the plain no-export
    state on purpose.

    A return this reader cannot follow **raises** rather than being skipped: a
    silently-dropped return is a vocabulary entry the generation stops carrying.
    """
    build_viewer_projection = _projection_module()

    functions = [
        node for node in ast.walk(ast.parse(
            PROJECTION_SCRIPT.read_text(encoding="utf-8")))
        if isinstance(node, ast.FunctionDef)
        and node.name == "identity_rule_of_ref"
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
                "the value drop out of the generation"
            )
    return tuple(sorted(set(out)))


def worksheet_sources() -> Tuple[str, ...]:
    """Every ``worksheet_source`` value a viewer builder can write.

    Same shape of problem as :func:`crop_rules` -- the values are literals in the
    branches of ``worksheet_for`` that return -- and the same answer: read the
    returns themselves, scoped to that one function because it is where the value
    is *minted*.

    Read from **both** builders, not one. ``scripts/build_viewer_projection.py``
    and ``scripts/build_topology_projection.py`` each carry a ``worksheet_for``
    spelling the identical two rules, deliberately not shared because each builder
    is stdlib-only and self-contained -- so reading only one would leave the other
    free to grow a third value the viewer has no branch for.
    :func:`worksheet_sources_of` is how
    ``tests/test_js_vocabulary_is_generated.py`` asserts the union is not hiding a
    disagreement.

    ``worksheet_for`` returns a *pair* -- ``(worksheet path | None, how)`` -- so
    the second element of each returned tuple is what this reads. ``None`` is a
    real value of the field and not an absence to be skipped (a document with no
    worksheet has no source for one either), and it comes back as
    :data:`JS_NULL_KEY`.
    """
    out: list[str] = []
    for script in (PROJECTION_SCRIPT, TOPOLOGY_PROJECTION_SCRIPT):
        out += worksheet_sources_of(script)
    return tuple(sorted(set(out)))


def worksheet_sources_of(script: Path) -> Tuple[str, ...]:
    """One builder's half of :func:`worksheet_sources`."""
    return worksheet_sources_from_source(
        script.read_text(encoding="utf-8"), script.name)


def worksheet_sources_from_source(source: str, where: str) -> Tuple[str, ...]:
    """Every ``how`` one ``worksheet_for`` can return, read out of its source.

    Takes text rather than a path for the reason ``_values_statuses_from_source``
    does: the shapes it refuses are the interesting part, and they must be
    testable without a file on disk that has them.

    A return this reader cannot follow **raises** rather than being skipped, and
    so does finding none at all: a silently-dropped value is a vocabulary word the
    generation stops carrying, which is the failure mode this whole module exists
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
        ``return (by_name, "by_name") if by_name.exists() else (None, None)`` --
        so a reader that accepted only a bare ``ast.Tuple`` saw ``declared`` and
        nothing else: two thirds of the vocabulary dropped in silence. Recursive
        rather than one level deep, because a third rule would nest.
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
                    "new shape rather than letting a value drop out"
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
            "empty vocabulary would make the generated module vacuous"
        )
    return tuple(found)


def study_error_names() -> Tuple[str, ...]:
    """Every ``StudyError`` subclass ``tolerance_stack.topology`` raises.

    Not a vocabulary constant but the same shape of fact: an enumerated domain
    minted in Python that the DAG page renders one branch per value of
    (``VA.STUDY_ERRORS`` adds the *next step*, which the exception itself cannot
    know). Read by introspection, so a subclass added without a branch on the page
    stops the app loading rather than rendering as the loud unlabelled fallback.
    """
    topology = _topology_module()

    names = tuple(sorted(
        cls.__name__ for cls in vars(topology).values()
        if isinstance(cls, type) and issubclass(cls, topology.StudyError)
        and cls is not topology.StudyError
    ))
    if not names:
        raise LookupError(
            "no StudyError subclasses found in tolerance_stack/topology.py -- the "
            "introspection drifted, and an empty domain would make VA.STUDY_ERRORS "
            "accept anything"
        )
    return names


def _const(module_getter: Callable[[], object],
           attribute: str) -> Callable[[], Tuple[str, ...]]:
    """A reader for a plain module-level tuple, resolved lazily.

    Lazily because importing either builder costs a ``sys.path`` insert, and a
    consumer that only wants the registry's shape should not pay for it.
    """
    return lambda: tuple(getattr(module_getter(), attribute))


# --------------------------------------------------------------------------- #
# the registry                                                                 #
# --------------------------------------------------------------------------- #

#: The two JS namespaces. A word that means two different things in the two apps
#: is why the registry is keyed by app at all: ``VERDICTS`` is
#: ``pass``/``marginal``/``fail`` in the viewer and ``bound``/``owner_not_in_set``
#: in the annotator, and one flat table would have to rename one of them -- which
#: is a third spelling of a vocabulary, the thing this file exists to stop.
APPS = ("viewer", "annotate")


@dataclass(frozen=True)
class Vocabulary:
    """One name-set: which JS namespace reads it, and how to read its words."""

    app: str
    #: The name the JS side asks for -- ``VOCAB.list("CONFIDENCES")``.
    name: str
    #: The Python definition, repo-relative, written into the generated file so a
    #: reader of the JS can find the owner without grepping.
    where: str
    #: Reads the words out of that definition. Never a list.
    read: Callable[[], Tuple[str, ...]]


VOCABULARIES: Tuple[Vocabulary, ...] = (
    # --- apps/viewer/viewer.js --------------------------------------------- #
    Vocabulary("viewer", "CONFIDENCES",
               "scripts/build_viewer_projection.py: PROJECTION_CONFIDENCES "
               "(tolerance_stack/stack.py: CONFIDENCES, ranked, plus the "
               "synthesised NO_SOURCE_REF)",
               _const(_projection_module, "PROJECTION_CONFIDENCES")),
    Vocabulary("viewer", "UNVERIFIED_CONFIDENCES",
               "scripts/build_topology_projection.py: UNVERIFIED_CONFIDENCES",
               _const(_topology_projection_module, "UNVERIFIED_CONFIDENCES")),
    Vocabulary("viewer", "WORKSHEET_SOURCES",
               "scripts/build_viewer_projection.py and "
               "scripts/build_topology_projection.py: the `how` each "
               "worksheet_for returns (None spelled `null`, which is what the "
               "projection JSON carries and what a JS property key coerces to)",
               worksheet_sources),
    Vocabulary("viewer", "VERDICTS",
               "tolerance_stack/stack.py: VERDICTS",
               _const(_stack_module, "VERDICTS")),
    Vocabulary("viewer", "VERDICT_SCOPES",
               "tolerance_stack/stack.py: VERDICT_SCOPES",
               _const(_stack_module, "VERDICT_SCOPES")),
    Vocabulary("viewer", "EXPORT_STATUSES",
               "tolerance_stack/stack.py: EXPORT_STATUSES",
               _const(_stack_module, "EXPORT_STATUSES")),
    Vocabulary("viewer", "IDENTITY_RULES",
               "scripts/build_viewer_projection.py: what identity_rule_of_ref "
               "returns",
               identity_rules),
    Vocabulary("viewer", "VALUES_STATUSES",
               "tolerance_stack/thermal.py: the values_status check in "
               "MaterialEntry.__post_init__",
               values_statuses),
    Vocabulary("viewer", "CROP_RULES",
               "scripts/build_viewer_crops.py: the `resolved_by` literals in "
               "resolve_pdf",
               crop_rules),
    Vocabulary("viewer", "CROP_PLACEMENTS",
               "scripts/build_viewer_crops.py: the `located_by` literals in "
               "locate()",
               crop_placements),
    Vocabulary("viewer", "CROP_HIGHLIGHT_KINDS",
               "scripts/build_viewer_crops.py: HIGHLIGHT_KINDS",
               _const(_crops_module, "HIGHLIGHT_KINDS")),
    # --- apps/viewer/topology.js ------------------------------------------- #
    Vocabulary("viewer", "TOPO_ROW_KINDS",
               "scripts/build_topology_projection.py: ROW_KINDS",
               _const(_topology_projection_module, "ROW_KINDS")),
    Vocabulary("viewer", "TOPO_LINK_KINDS",
               "scripts/build_topology_projection.py: LINK_KINDS",
               _const(_topology_projection_module, "LINK_KINDS")),
    Vocabulary("viewer", "STUDY_STATUSES",
               "scripts/build_topology_projection.py: STUDY_STATUSES",
               _const(_topology_projection_module, "STUDY_STATUSES")),
    Vocabulary("viewer", "MESH_FACT_FIELDS",
               "scripts/build_topology_projection.py: MESH_FACT_FIELDS",
               _const(_topology_projection_module, "MESH_FACT_FIELDS")),
    Vocabulary("viewer", "VALUE_SOURCES",
               "scripts/build_topology_projection.py: VALUE_SOURCES",
               _const(_topology_projection_module, "VALUE_SOURCES")),
    Vocabulary("viewer", "GAP_KINDS",
               "scripts/build_topology_projection.py: TOPOLOGY_GAP_KINDS",
               _const(_topology_projection_module, "TOPOLOGY_GAP_KINDS")),
    Vocabulary("viewer", "NODE_KINDS",
               "tolerance_stack/topology.py: NODE_KINDS",
               _const(_topology_module, "NODE_KINDS")),
    Vocabulary("viewer", "EDGE_KINDS",
               "tolerance_stack/topology.py: EDGE_KINDS",
               _const(_topology_module, "EDGE_KINDS")),
    Vocabulary("viewer", "TRANSFORM_KINDS",
               "tolerance_stack/topology.py: TRANSFORM_KINDS",
               _const(_topology_module, "TRANSFORM_KINDS")),
    Vocabulary("viewer", "STUDY_ERRORS",
               "tolerance_stack/topology.py: the StudyError subclasses",
               study_error_names),
    # --- apps/annotate/binding_state.js ------------------------------------ #
    Vocabulary("annotate", "STACK_KEY_KINDS",
               "tolerance_stack/feature_identity.py: STACK_KEY_KINDS",
               _const(_feature_identity_module, "STACK_KEY_KINDS")),
    Vocabulary("annotate", "VERDICTS",
               "tolerance_stack/feature_identity.py: VERDICTS",
               _const(_feature_identity_module, "VERDICTS")),
    Vocabulary("annotate", "DIRECTIONS",
               "tolerance_stack/feature_identity.py: DIRECTIONS",
               _const(_feature_identity_module, "DIRECTIONS")),
    Vocabulary("annotate", "PATH_KINDS",
               "tolerance_stack/feature_identity.py: PATH_KINDS",
               _const(_feature_identity_module, "PATH_KINDS")),
    Vocabulary("annotate", "GDT_MODIFIERS",
               "tolerance_stack/feature_identity.py: GDT_MODIFIERS",
               _const(_feature_identity_module, "GDT_MODIFIERS")),
)


def for_app(app: str) -> Tuple[Vocabulary, ...]:
    """Every vocabulary one JS namespace reads, in registry order."""
    return tuple(v for v in VOCABULARIES if v.app == app)


def words_for(app: str, name: str) -> Tuple[str, ...]:
    """One vocabulary's words, read out of its Python definition."""
    for vocabulary in VOCABULARIES:
        if vocabulary.app == app and vocabulary.name == name:
            return tuple(vocabulary.read())
    raise LookupError(f"no vocabulary {name!r} for app {app!r}")
