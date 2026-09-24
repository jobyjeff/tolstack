"""The claims registry: a document's checkable facts, **declared** rather than
written in English and matched by a regex.

Why this exists
---------------

Every guard that replaced a prose scan with this module used to work the same
way: search a corpus of live documents for a *claim shape* -- ``N of M``,
``byte-identical``, ``the other N do not``, ``combines element values`` -- and
recount whatever it matched against this repo's data. That design has one
failure the repo measured fifteen times across two months
(``REPORT_20260921_bug_pareto.md``, pattern **C2**): ordinary English matches a
claim shape, a guard reddens on a sentence that was never making a claim, and it
does so on the shared branch every worktree is cut from. Three of the fifteen
were ``master``/``integration`` red before any handoff touched them; ten were
the *same* failure re-filed by sessions that could not see each other's issues.

Four point-fixes narrowed the scanners' scope (a quotation exemption, a bullet
split, a free-form-block exemption, a triage-brief exclusion) and each left a new
blind spot, because a prose scanner's scope logic is itself text-shaped. The
decision on 2026-09-23 was to stop at the root instead: **free prose is never
scanned.** A live document that makes a checkable claim *declares* it, naming
the metric and stating the value, and the guards read only declarations.

What a declaration looks like
-----------------------------

In a text file -- markdown, Python, JavaScript, anything with lines -- a fenced
block whose info string is ``claim``:

.. code-block:: text

    ```claim
    metric: traced_ratio
    value: 5 of 26
    ```

In a JSON document -- where there is no fence, and where this repo's prose lives
in fields (``description``, ``library_ref_note``, ``note``) -- a ``claims`` array
beside the prose it backs, holding the same keys:

.. code-block:: json

    {"claims": [{"metric": "hardware_entry_count", "count": "workbook",
                 "value": "5"}]}

Both carriers parse to the same :class:`Claim`. The body is a strict
``key: value`` mapping -- not YAML, no dependency, no types beyond text -- and
**every** departure from it is a :class:`ClaimError` naming the file and line. A
declaration this module cannot parse is a bug in the document, never a reason to
fall back to reading the prose around it.

Why a fence and not frontmatter
-------------------------------

The rejected alternative was a ``claims:`` block in YAML frontmatter at the top
of each document. A fence won on three counts, all of which are about the defect
being prevented:

1. **Locality.** The failure is a number drifting from the data it describes. A
   declaration sitting beside the sentence it backs is in the diff hunk of the
   edit that would break it; one at the top of a 1 800-line ``ARCHITECTURE.md``
   is not.
2. **Many per document, each with a line number.** ``ARCHITECTURE.md`` carries
   claims about three unrelated metrics. Frontmatter gives one block keyed by
   nothing that says which passage it belongs to.
3. **No document here has frontmatter today**, and these are read by humans in
   a markdown renderer: a fence renders as a visible block a reader can see and
   check, while frontmatter renders as either nothing or a stray rule-plus-text.

The registry
------------

:data:`METRICS` maps a metric name to the **one** place its value is re-derived
from. That is the half that keeps a declaration from becoming decorative: a
declared value is compared against its source on every run, so a registry entry
is a claim that has been checked, not a claim that has been written down. A
source that cannot be reached from this checkout -- anything under ``data/``,
which is gitignored and lives only in the main checkout -- comes back
:data:`UNAVAILABLE` with its reason, and the guard reports it as a skip rather
than as agreement.
"""

from __future__ import annotations

import ast
import json
import os
import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

REPO_ROOT = Path(__file__).resolve().parent.parent

# --------------------------------------------------------------------------- #
# 1. the declaration format                                                    #
# --------------------------------------------------------------------------- #

#: The fence info string. One word, no attributes: a fence is either a
#: declaration or it is not, and there is no third state for a reader to guess.
FENCE_INFO = "claim"

#: The only key every claim carries. Everything else a claim holds is named by
#: its metric's :attr:`Metric.fields`, so an unknown key is a parse error rather
#: than a field silently dropped -- the lesson
#: ``tolerance_stack/spec_crop_regions.py`` already learned ("a field this
#: reader drops is a claim nobody checks").
METRIC_KEY = "metric"

#: A declaration's opening fence. Leading whitespace is allowed (a claim nested
#: in a list item) and a leading ``>`` is **not**: a fence inside a blockquote is
#: how a document -- this module's own prose, a lesson, an issue -- shows the
#: format without declaring anything. That is the one quotation rule left, and
#: unlike the four the prose scanners carried it is structural: a reader can see
#: it in the source and there is nothing to infer from the English around it.
_FENCE_OPEN = re.compile(rf"^(?P<indent>[ \t]*)(?P<ticks>`{{3,}})\s*{FENCE_INFO}\s*$")
_KEY_VALUE = re.compile(r"^(?P<key>[a-z][a-z0-9_]*)\s*:\s*(?P<value>.*?)\s*$")


class ClaimError(Exception):
    """A declaration that cannot be parsed, or names a metric/field that is not
    in the registry. Always raised with ``<path>:<line>`` in the message: the
    fix is an edit to the document, and the document is what has to be named."""


@dataclass(frozen=True)
class Claim:
    """One declared, checkable fact.

    ``fields`` holds every key except ``metric``, as written -- text, never
    coerced. Coercion is the metric's business, because "5" means an ``int`` for
    a hardware-entry count and a literal string for a traced ratio.
    """

    path: str
    line: int
    metric: str
    fields: dict[str, str] = field(default_factory=dict)

    @property
    def location(self) -> str:
        return f"{self.path}:{self.line}"

    def __str__(self) -> str:                       # what a failure message reads
        body = ", ".join(f"{k}={v!r}" for k, v in sorted(self.fields.items()))
        return f"{self.location} {self.metric}({body})"


def parse_declaration(body: str, *, path: str, line: int) -> Claim:
    """One declaration body -- the lines between the fences, or one JSON object
    flattened to the same shape -- as a :class:`Claim`.

    Loud on every malformed shape, because the alternative is the failure this
    whole module replaces: a declaration nobody could read, skipped quietly, and
    a document that looks guarded and is not.
    """
    pairs: dict[str, str] = {}
    for offset, raw in enumerate(body.splitlines()):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue
        match = _KEY_VALUE.match(text)
        if not match:
            raise ClaimError(
                f"{path}:{line + offset}: {raw.strip()!r} is not a `key: value` "
                f"line. A claim body is a strict lower_snake_case key, a colon, "
                f"and the value as text -- no lists, no nesting, no comments "
                f"except a whole line starting with #."
            )
        key, value = match.group("key"), match.group("value")
        if key in pairs:
            raise ClaimError(
                f"{path}:{line + offset}: {key!r} is declared twice in one "
                f"claim. Which value is meant is exactly what nobody can tell "
                f"later; split it into two claims or delete one."
            )
        if not value:
            raise ClaimError(
                f"{path}:{line + offset}: {key!r} is declared with an empty "
                f"value. An empty declaration agrees with nothing and disagrees "
                f"with nothing, which is the vacuous guard in a new costume."
            )
        pairs[key] = value

    if not pairs:
        raise ClaimError(
            f"{path}:{line}: empty claim declaration. A fence with no body is a "
            f"document that looks guarded and is not."
        )
    if METRIC_KEY not in pairs:
        raise ClaimError(
            f"{path}:{line}: claim declares no {METRIC_KEY!r}. Every claim names "
            f"the metric it is about; the registry has "
            f"{', '.join(sorted(METRICS))}."
        )
    metric = pairs.pop(METRIC_KEY)
    if metric not in METRICS:
        raise ClaimError(
            f"{path}:{line}: {metric!r} is not a metric this repo knows. The "
            f"registry holds {', '.join(sorted(METRICS))} -- add an entry to "
            f"METRICS in tests/claims_registry.py, with the source its value is "
            f"re-derived from, before declaring it."
        )
    spec = METRICS[metric]
    missing = [name for name in spec.fields if name not in pairs]
    if missing:
        raise ClaimError(
            f"{path}:{line}: claim {metric!r} is missing {missing}. "
            f"{metric!r} is declared as `{spec.shape()}`."
        )
    unknown = sorted(set(pairs) - set(spec.fields))
    if unknown:
        raise ClaimError(
            f"{path}:{line}: claim {metric!r} carries unknown field(s) {unknown}. "
            f"A field this reader drops is a claim nobody checks; "
            f"{metric!r} is declared as `{spec.shape()}`."
        )
    return Claim(path=path, line=line, metric=metric, fields=pairs)


def declarations_in_text(rel: str, text: str) -> list[Claim]:
    """Every fenced ``claim`` declaration in one file's text.

    Pure, and takes the path only to name it in errors, so a parser failure can
    be replayed against a string in a test rather than against a file on disk.

    The opening fence's own indentation (and any blockquote ``>`` markers in
    front of it) is remembered and stripped from the body, so a declaration
    nested in a list item or quoted into a blockquote parses as the same claim.
    """
    out: list[Claim] = []
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        opener = _FENCE_OPEN.match(lines[index])
        if not opener:
            index += 1
            continue
        indent, ticks = opener.group("indent"), opener.group("ticks")
        closer = re.compile(rf"^[ \t]*{ticks}`*\s*$")
        body: list[str] = []
        cursor = index + 1
        while cursor < len(lines) and not closer.match(lines[cursor]):
            line = lines[cursor]
            if indent and line.startswith(indent):
                line = line[len(indent):]
            body.append(line)
            cursor += 1
        if cursor >= len(lines):
            raise ClaimError(
                f"{rel}:{index + 1}: ```{FENCE_INFO} block is never closed. An "
                f"unterminated fence swallows the rest of the document, and the "
                f"claims below it stop being read."
            )
        out.append(parse_declaration("\n".join(body), path=rel, line=index + 2))
        index = cursor + 1
    return out


#: The key a JSON document carries its declarations under. A list, always, so a
#: single claim and five claims are the same shape to read.
JSON_CLAIMS_KEY = "claims"


def declarations_in_json(rel: str, text: str) -> list[Claim]:
    """Every ``claims`` array in one JSON document, wherever it is nested.

    Nested rather than top-level-only for the same locality reason the fence
    beat frontmatter: ``hardware_entries.json``'s counts belong beside its
    ``description``, and an individual entry's claim belongs on that entry.

    A JSON file this module cannot parse is *not* an error here -- a malformed
    stack file is somebody else's guard, and reporting it twice helps nobody.
    """
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return []

    out: list[Claim] = []

    def walk(node, trail: str) -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                here = f"{trail}.{key}" if trail else key
                if key != JSON_CLAIMS_KEY:
                    walk(value, here)
                    continue
                if not isinstance(value, list):
                    raise ClaimError(
                        f"{rel} [{here}]: {JSON_CLAIMS_KEY!r} must be a list of "
                        f"claim objects, not {type(value).__name__}."
                    )
                for index, entry in enumerate(value):
                    at = f"{here}[{index}]"
                    if not isinstance(entry, dict):
                        raise ClaimError(
                            f"{rel} [{at}]: a claim is an object of "
                            f"`key: value` strings, not {type(entry).__name__}."
                        )
                    bad = sorted(k for k, v in entry.items()
                                 if not isinstance(k, str) or not isinstance(v, str))
                    if bad:
                        raise ClaimError(
                            f"{rel} [{at}]: {bad} are not strings. A declared "
                            f"value is carried as text in both carriers, so a "
                            f"count reads the same here and in a fence -- "
                            f'write "5", not 5.'
                        )
                    body = "\n".join(f"{k}: {v}" for k, v in entry.items())
                    out.append(parse_declaration(body, path=f"{rel} [{at}]",
                                                 line=1))
        elif isinstance(node, list):
            for index, value in enumerate(node):
                walk(value, f"{trail}[{index}]")

    walk(data, "")
    return out


def declarations_in_file(path: Path, rel: str) -> list[Claim]:
    """Every declaration in one file, by whichever carrier its suffix uses."""
    text = path.read_text(encoding="utf-8", errors="replace")
    if path.suffix.lower() == ".json":
        return declarations_in_json(rel, text)
    return declarations_in_text(rel, text)


# --------------------------------------------------------------------------- #
# 2. the corpus -- which files are read for declarations                       #
# --------------------------------------------------------------------------- #

#: Suffixes a declaration may live in: the union of what the two scans this
#: replaced read, so nothing that used to be covered stops being reachable.
CORPUS_SUFFIXES = frozenset({".md", ".json", ".py", ".js", ".cjs", ".toml",
                             ".txt", ".ps1"})

#: Dated records and imported text -- what someone believed on a date, and text
#: this repo does not rewrite. They are out of the corpus for the same reason
#: they always were, and one new one: a lesson or an issue explaining this
#: format will quote a declaration as an *example*, and an example is not a
#: claim. ``apps/viewer/vendor/`` is third-party code.
HISTORICAL_PREFIXES = ("docs/sessions/", "docs/issues/", "docs/reference/",
                       "apps/viewer/vendor/")
HISTORICAL_NAMES = frozenset({"PROVENANCE.md"})

#: ``tests/`` is out of the corpus, and this is the one exemption that is about
#: *this* module rather than inherited. A test for the registry necessarily
#: writes declarations as fixtures -- the negative controls in
#: ``tests/test_claims_registry.py`` are declarations that are deliberately
#: wrong -- so a corpus that read ``tests/`` would flag its own witnesses. The
#: one-fold rule scan made the same call for the same shape of reason before
#: this module existed ("its prose is *about* the detector").
CORPUS_EXEMPT_PREFIXES = HISTORICAL_PREFIXES + ("tests/",)

#: Directories the walk never descends. ``tmp`` is the mutation-witness shadow
#: tree, which holds a patched copy of much of this repo; ``data/runs`` and
#: ``data/projections`` are run output. The rest are build and tooling dirs.
_SKIP_DIR_NAMES = frozenset({".git", ".dispatch", ".pytest_cache", "__pycache__",
                             "tmp", "node_modules", "venv", "venv-win", ".venv",
                             "storage", "vendor"})
_SKIP_REL_DIRS = frozenset({"data/runs", "data/projections"})

#: The two ways :func:`claim_corpus` can decide what is in the tree.
GIT_TRACKED = "git-tracked"
WALKED = "walked"


def _git_tracked(repo_root: Path) -> list[str] | None:
    """``git ls-files`` for ``repo_root``, or ``None`` if it is not the ROOT of
    a work tree.

    ``None`` is a real answer and not a failure: a tree that is not a checkout
    is still a tree full of documents, and two of them matter here -- a
    ``tmp_path`` in a test, and the mutation-witness shadow, which the runner
    builds by copying part of this repo into ``tmp/mutation-witness/``.

    **The toplevel check is what makes the shadow work**, and it is not
    defensive programming: the shadow sits *inside* this worktree, so
    ``git -C <shadow> ls-files`` succeeds, reports on the enclosing repo, and
    returns **nothing** -- ``tmp/`` is gitignored. Taken at face value that is a
    corpus of zero files with the mode still reading :data:`GIT_TRACKED`: every
    declaration guard green with nothing read, which is precisely the
    empty-coverage-set failure this repo converts into red everywhere else.
    Measured 2026-09-23, when the first run of the new guard's own mutation
    witness came back ``TIER_ALREADY_RED`` on it.

    The caller reports which mode it got (:func:`claim_corpus` returns it, and
    ``tests/test_tolerance_stack.py`` asserts this repo resolves to
    :data:`GIT_TRACKED`), so the fallback can never be a silent one.
    """
    try:
        top = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "--show-toplevel"],
            capture_output=True, check=False,
        )
    except OSError:                                 # no git on this machine
        return None
    if top.returncode != 0:
        return None
    toplevel = Path(top.stdout.decode("utf-8", "replace").strip())
    if not toplevel.name or toplevel.resolve() != repo_root.resolve():
        return None

    proc = subprocess.run(
        ["git", "-C", str(repo_root), "ls-files", "-z"],
        capture_output=True, check=False,
    )
    if proc.returncode != 0:
        return None
    return [rel for rel in proc.stdout.decode("utf-8", "replace").split("\0")
            if rel]


def is_claim_corpus(rel: str) -> bool:
    """Is the repo-relative path ``rel`` read for declarations?

    A predicate rather than a filtered list, so the two producers -- git and the
    walk -- make the same scope call rather than two.
    """
    if Path(rel).suffix.lower() not in CORPUS_SUFFIXES:
        return False
    if rel.startswith(CORPUS_EXEMPT_PREFIXES):
        return False
    return Path(rel).name not in HISTORICAL_NAMES


def claim_corpus(repo_root: Path = REPO_ROOT) -> tuple[str, list[Path]]:
    """``(mode, paths)`` -- every file in ``repo_root`` read for declarations.

    **Git-aware, which the walk it replaces was not.** ``live_documents()`` was
    a bare ``os.walk``, so untracked scratch in the main checkout joined the
    corpus of every claim scan -- two ``tmp/mutation-witness/**/README.md``
    copies did exactly that and made the measured corpus size wrong in a way a
    fresh clone could not reproduce
    (``ISSUE_20260917_live_documents_walks_gitignored_scratch_in_the_main_checkout``).
    Asking git is the fix, and it is the whole fix: a file git does not track is
    not a document this repo publishes.

    The walk survives as the fallback for a tree that is not a work tree at all
    -- the mutation-witness shadow, a ``tmp_path`` in a test -- and the mode is
    returned rather than swallowed so a caller that requires git can say so.
    """
    tracked = _git_tracked(repo_root)
    if tracked is not None:
        paths = [repo_root / rel for rel in sorted(tracked)
                 if is_claim_corpus(rel)]
        return GIT_TRACKED, [p for p in paths if p.is_file()]

    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(repo_root):
        here = Path(dirpath)
        rel_dir = here.relative_to(repo_root).as_posix().lstrip(".").lstrip("/")
        dirnames[:] = sorted(
            d for d in dirnames
            if d not in _SKIP_DIR_NAMES
            and f"{rel_dir}/{d}".lstrip("/") not in _SKIP_REL_DIRS)
        for name in sorted(filenames):
            rel = f"{rel_dir}/{name}".lstrip("/")
            if is_claim_corpus(rel):
                found.append(here / name)
    return WALKED, found


def declared_claims(repo_root: Path = REPO_ROOT) -> list[Claim]:
    """Every declaration in the corpus, parsed. Raises on the first malformed
    one -- see :class:`ClaimError`."""
    mode, paths = claim_corpus(repo_root)
    out: list[Claim] = []
    for path in paths:
        out += declarations_in_file(path, path.relative_to(repo_root).as_posix())
    return out


# --------------------------------------------------------------------------- #
# 3. the registry -- one source per metric, and the check against it           #
# --------------------------------------------------------------------------- #

#: A source this checkout cannot reach. Returned with a reason, never treated as
#: agreement: ``data/`` is gitignored and lives only in the main checkout, so a
#: worktree genuinely cannot re-derive a mesh route or a chain length, and
#: saying "checked" there would be the skip-inside-a-green this repo keeps
#: legislating against.
UNAVAILABLE = "unavailable"
AGREES = "agrees"
DISAGREES = "disagrees"


@dataclass(frozen=True)
class Outcome:
    status: str                 # AGREES | DISAGREES | UNAVAILABLE
    detail: str = ""

    @property
    def ok(self) -> bool:
        return self.status == AGREES


@dataclass(frozen=True)
class Metric:
    """One checkable metric: what a claim about it must say, and where its value
    is re-derived from.

    ``source`` is prose *for a reader*, and it is not what the check uses -- the
    check is :attr:`derive`, which reads the tree. The two are paired by
    ``tests/test_claims_registry.py::test_every_metric_names_a_source_that_exists``
    so a source that is renamed away cannot leave the sentence behind.
    """

    name: str
    fields: tuple[str, ...]
    source: str
    source_paths: tuple[str, ...]
    derive: Callable[[Claim, Path], Outcome]
    #: Must the declared ``value`` also appear, literally, in the document's own
    #: prose outside the declaration? Set only where the value is a distinctive
    #: string (``5 of 26``) rather than a bare digit -- it is the third link in
    #: source -> declaration -> sentence, and it is what stops a document
    #: declaring the right figure while its paragraph still reads the retired
    #: one. Structural: a literal the document itself declared, searched for
    #: with no pattern and no English, so it cannot false-positive the way
    #: ``_retired_ratio_pattern`` did on a *correct* long-form figure.
    rendered: bool = False

    def shape(self) -> str:
        return f"metric: {self.name}" + "".join(
            f"; {name}: <...>" for name in self.fields)


def _repo_text(repo_root: Path, rel: str) -> str | None:
    path = repo_root / rel
    return path.read_text(encoding="utf-8") if path.is_file() else None


# --- traced ratio ----------------------------------------------------------- #

def _derive_traced_ratio(claim: Claim, repo_root: Path) -> Outcome:
    """``N of M``, recomputed from the seeded stacks -- never a literal.

    The figure this repo publishes most widely and the one it has had wrong
    most often (``1 of 17`` reached eleven files and survived three reviews).
    The rule for what counts as traced lives in one place, the SOP's "The
    traced ratio"; the arithmetic lives in one place,
    ``tests/debug_report_tolerance_stacks.py``; this reads the second.
    """
    from tests.debug_report_tolerance_stacks import SEEDED_STACK_FILES, _counts

    stacks = repo_root / "docs" / "tolerance_stacks"
    missing = [n for n in SEEDED_STACK_FILES if not (stacks / n).is_file()]
    if missing:
        return Outcome(UNAVAILABLE,
                       f"{len(missing)} seeded stack file(s) are not in this "
                       f"tree: {missing[:3]}")
    counts = _counts(stacks / n for n in SEEDED_STACK_FILES)
    actual = f"{counts['traced']} of {counts['instances']}"
    stated = claim.fields["value"]
    if stated == actual:
        return Outcome(AGREES, actual)
    return Outcome(DISAGREES,
                   f"declares {stated!r}; the seeded stacks give {actual!r}")


# --- hardware-entry counts -------------------------------------------------- #

#: The count keys ``hardware_entries.json`` can be asked for. A module-level
#: vocabulary, not an inline literal: this repo's most-repeated defect is a
#: vocabulary written down twice (repo ``CLAUDE.md``), and the guard that
#: pairs this against the deriver is
#: ``test_every_hardware_count_key_is_derivable``.
HARDWARE_COUNT_KEYS = ("total", "sourced", "workbook", "spec", "drawing",
                       "traced", "nas_bolts", "inline", "library",
                       "not_transcribed", "safe", "not_library")


def hardware_entry_counts(repo_root: Path = REPO_ROOT) -> dict[str, int] | None:
    """Every count ``hardware_entries.json`` can be asked for, recounted.

    Lifted here from ``tests/test_tolerance_stack.py`` so the deriver and the
    documents' declarations read one definition. ``None`` when the file is not
    in this tree.
    """
    path = repo_root / "docs" / "tolerance_stacks" / "hardware_entries.json"
    if not path.is_file():
        return None
    entries = json.loads(path.read_text(encoding="utf-8"))["entries"]

    def source(entry: dict) -> dict:
        return entry.get("values_source") or {}

    def n(predicate) -> int:
        return sum(1 for entry in entries if predicate(entry))

    counts = {
        "total": len(entries),
        "sourced": n(lambda e: bool(source(e))),
        "workbook": n(lambda e: source(e).get("kind") == "workbook"),
        "spec": n(lambda e: source(e).get("kind") == "spec"),
        "drawing": n(lambda e: source(e).get("kind") == "drawing"),
        "traced": n(lambda e: source(e).get("confidence") == "traced"),
        "nas_bolts": n(lambda e: (e.get("standard") or "").startswith("NAS64")),
        "inline": n(lambda e: e["values_status"] == "inline"),
        "library": n(lambda e: e["values_status"] == "library"),
        "not_transcribed": n(lambda e: e["values_status"] == "not_transcribed"),
    }
    counts["safe"] = counts["sourced"] - counts["workbook"]
    counts["not_library"] = counts["total"] - counts["library"]
    return counts


def _derive_hardware_entry_count(claim: Claim, repo_root: Path) -> Outcome:
    counts = hardware_entry_counts(repo_root)
    if counts is None:
        return Outcome(UNAVAILABLE,
                       "docs/tolerance_stacks/hardware_entries.json is not in "
                       "this tree")
    key = claim.fields["count"]
    if key not in counts:
        return Outcome(DISAGREES,
                       f"{key!r} is not a count this file can be asked for; "
                       f"the keys are {', '.join(HARDWARE_COUNT_KEYS)}")
    try:
        stated = int(claim.fields["value"])
    except ValueError:
        return Outcome(DISAGREES,
                       f"value {claim.fields['value']!r} is not a whole number")
    if stated == counts[key]:
        return Outcome(AGREES, f"{key}={counts[key]}")
    return Outcome(DISAGREES,
                   f"declares {key}={stated}; hardware_entries.json has "
                   f"{counts[key]}")


# --- the one-fold rule ------------------------------------------------------ #

def _derive_one_fold_rule(claim: Claim, repo_root: Path) -> Outcome:
    """The rule's *conditional* form, as structure.

    The prose scan this replaces searched for the rule's own words and demanded
    a qualifier somewhere in the same passage -- which is how "a qualifier
    anywhere in a 15 kB block covers an absolute rule statement" became a bug,
    twice. A declaration cannot state the absolute form: naming the exceptions
    is the only way to write it down, so the defect is inexpressible rather
    than detected.

    The exception list is ``DECLARED_COMBINING_EXCEPTIONS``, which is itself
    paired against ``thermal.py``'s AST by the walker in
    ``tests/test_thermal_exception_list.py``.
    """
    from tests.test_thermal_exception_list import DECLARED_COMBINING_EXCEPTIONS

    thermal = repo_root / "tolerance_stack" / "thermal.py"
    if not thermal.is_file():
        return Outcome(UNAVAILABLE, "tolerance_stack/thermal.py is not in this tree")
    tree = ast.parse(thermal.read_text(encoding="utf-8"), filename=str(thermal))
    defined = {node.name for node in tree.body
               if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}

    stated = tuple(part.strip() for part in claim.fields["exceptions"].split(",")
                   if part.strip())
    declared = tuple(DECLARED_COMBINING_EXCEPTIONS)
    unknown = [name for name in stated if name not in defined]
    if unknown:
        return Outcome(DISAGREES,
                       f"names {unknown}, which thermal.py does not define")
    if sorted(stated) == sorted(declared):
        return Outcome(AGREES, ", ".join(declared))
    return Outcome(
        DISAGREES,
        f"names {sorted(stated)} as the exceptions to the one-fold rule; the "
        f"declared list is {sorted(declared)}")


# --- byte identity ---------------------------------------------------------- #

_POINTER = "#/"


def _resolve_target(spec: str, repo_root: Path) -> tuple[bytes | None, str]:
    """``(bytes, detail)`` for one side of a byte-identity claim.

    Three address forms, each of which this repo already writes somewhere:

    * ``path/to/file`` -- the working tree's bytes;
    * ``<rev>:path/to/file`` -- a git blob, so a claim can be made against a
      commit rather than against whatever the file says today;
    * ``path/to/file#/json/pointer`` -- one region of a JSON document, compared
      as its canonical serialisation. "Byte" is honest for the first two and a
      normalisation for the third, which is why the pointer form is spelled
      differently rather than hidden: the studies that claim identity claim it
      over ``selection`` and ``transforms``, not over whole files.
    """
    if _POINTER in spec:
        rel, pointer = spec.split(_POINTER, 1)
        path = repo_root / rel
        if not path.is_file():
            return None, f"{rel} is not in this tree"
        try:
            node = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            return None, f"{rel} is not readable JSON ({exc})"
        for step in pointer.split("/"):
            if isinstance(node, list):
                try:
                    node = node[int(step)]
                except (ValueError, IndexError):
                    return None, f"{spec}: no element {step!r}"
            elif isinstance(node, dict) and step in node:
                node = node[step]
            else:
                return None, f"{spec}: no key {step!r}"
        canonical = json.dumps(node, sort_keys=True, ensure_ascii=False, indent=2)
        return canonical.encode("utf-8"), spec

    path = repo_root / spec
    if path.is_file():
        return path.read_bytes(), spec

    if ":" in spec:
        rev, _, rel = spec.partition(":")
        proc = subprocess.run(["git", "-C", str(repo_root), "show", f"{rev}:{rel}"],
                              capture_output=True, check=False)
        if proc.returncode != 0:
            return None, f"{spec} is not in this repo's history"
        return proc.stdout, spec

    return None, f"{spec} is not in this tree"


def _derive_byte_identity(claim: Claim, repo_root: Path) -> Outcome:
    """Compare the bytes, rather than asking the prose to name a verification.

    The scan this replaces demanded that an asserted "byte-identical" name a
    ``sha256``, a ``git diff`` or a test in the same paragraph -- a *pointer*,
    which is one step short of the comparison and which the enclosing ``def``
    line could satisfy all by itself. A declaration names both sides, so the
    guard does the comparison instead of trusting that something else did.
    """
    left, left_detail = _resolve_target(claim.fields["subject"], repo_root)
    right, right_detail = _resolve_target(claim.fields["against"], repo_root)
    if left is None or right is None:
        return Outcome(UNAVAILABLE, left_detail if left is None else right_detail)
    if left == right:
        return Outcome(AGREES, f"{len(left)} bytes")
    return Outcome(
        DISAGREES,
        f"{claim.fields['subject']} ({len(left)} bytes) and "
        f"{claim.fields['against']} ({len(right)} bytes) are not identical")


# --- mesh routes ------------------------------------------------------------ #

_SHA256 = re.compile(r"^[0-9a-f]{64}$")


def _installed_mesh_routes(repo_root: Path) -> set[str] | None:
    """Every distinct ``produced_by.command`` across the installed meshes.

    ``data/`` is gitignored and shared by every worktree, so the main checkout's
    copy is the fallback -- the same two-candidate resolution
    ``tests/test_part_mesh_aliases.py`` uses.
    """
    for candidate in (repo_root / "data" / "meshes",
                      Path("C:/workspace/tolstack/data/meshes")):
        if not candidate.is_dir():
            continue
        commands = set()
        for child in sorted(candidate.iterdir()):
            sidecar = child / "provenance.json"
            if not _SHA256.match(child.name) or not sidecar.is_file():
                continue
            produced = json.loads(sidecar.read_text(encoding="utf-8"))
            command = (produced.get("produced_by") or {}).get("command")
            if command:
                commands.add(command)
        if commands:
            return commands
    return None


def _derive_mesh_routes(claim: Claim, repo_root: Path) -> Outcome:
    live = _installed_mesh_routes(repo_root)
    if live is None:
        return Outcome(UNAVAILABLE,
                       "no data/meshes/ with an installed mesh (gitignored, "
                       "main checkout only)")
    stated = {part.strip() for part in claim.fields["value"].split(",")
              if part.strip()}
    if stated == live:
        return Outcome(AGREES, ", ".join(sorted(live)))
    return Outcome(DISAGREES,
                   f"declares {sorted(stated)}; the installed meshes were "
                   f"produced by {sorted(live)}")


# --- the smallest chain in a topology --------------------------------------- #

def _derive_smallest_chain(claim: Claim, repo_root: Path) -> Outcome:
    """Which study of a topology lassoes the fewest edges.

    ``apps/viewer/README.md`` reconstructed this backwards once -- it read
    ``pitch_link_thread_region_t`` as the study whose chain "covered nearly
    everything" when it is the smallest of the three
    (``ISSUE_20260915_the_readmes_inconsistency_premise_...``). Declared, it is
    re-derived from the projection instead of argued from memory.
    """
    for candidate in (repo_root / "data" / "projections" / "viewer" / "topologies.json",
                      Path("C:/workspace/tolstack/data/projections/viewer/topologies.json")):
        if candidate.is_file():
            projection = json.loads(candidate.read_text(encoding="utf-8"))
            break
    else:
        return Outcome(UNAVAILABLE,
                       "no data/projections/viewer/topologies.json (gitignored, "
                       "main checkout only)")

    wanted = claim.fields["topology"]
    topology = next((t for t in projection["topologies"] if t["id"] == wanted), None)
    if topology is None:
        return Outcome(DISAGREES, f"the projection holds no topology {wanted!r}")
    lengths = {study["id"]: len(study["selection"]) for study in topology["studies"]}
    if not lengths:
        return Outcome(DISAGREES, f"{wanted} has no studies -- it changed shape")
    smallest = min(lengths, key=lengths.get)
    if smallest == claim.fields["value"]:
        return Outcome(AGREES, f"{smallest} ({lengths[smallest]} edges)")
    return Outcome(DISAGREES,
                   f"declares {claim.fields['value']!r}; the chain lengths are "
                   f"{lengths}, so the smallest is {smallest!r}")


#: Metric name -> what a claim about it says, and where its value comes from.
#: **The registry is the whole point of the change**: a declaration naming a
#: source but never compared to it is exactly as unverified as the prose it
#: replaced, so every entry here carries a ``derive`` that reads the tree.
METRICS: dict[str, Metric] = {
    m.name: m for m in (
        Metric(
            name="traced_ratio",
            fields=("value",),
            source="the seeded stacks under docs/tolerance_stacks/, counted by "
                   "tests/debug_report_tolerance_stacks.py",
            source_paths=("docs/tolerance_stacks",
                          "tests/debug_report_tolerance_stacks.py"),
            derive=_derive_traced_ratio,
            rendered=True,
        ),
        Metric(
            name="hardware_entry_count",
            fields=("count", "value"),
            source="docs/tolerance_stacks/hardware_entries.json",
            source_paths=("docs/tolerance_stacks/hardware_entries.json",),
            derive=_derive_hardware_entry_count,
        ),
        Metric(
            name="one_fold_rule",
            fields=("exceptions",),
            source="DECLARED_COMBINING_EXCEPTIONS in "
                   "tests/test_thermal_exception_list.py, paired against "
                   "tolerance_stack/thermal.py's own definitions",
            source_paths=("tolerance_stack/thermal.py",
                          "tests/test_thermal_exception_list.py"),
            derive=_derive_one_fold_rule,
        ),
        Metric(
            name="byte_identity",
            fields=("subject", "against"),
            source="the two named targets themselves -- a tracked path, a "
                   "<rev>:<path> git blob, or a <path>#/<json pointer> region",
            source_paths=(),
            derive=_derive_byte_identity,
        ),
        Metric(
            name="mesh_routes",
            fields=("value",),
            source="produced_by.command across every installed "
                   "data/meshes/<sha>/provenance.json",
            source_paths=(),
            derive=_derive_mesh_routes,
        ),
        Metric(
            name="smallest_chain",
            fields=("topology", "value"),
            source="data/projections/viewer/topologies.json",
            source_paths=(),
            derive=_derive_smallest_chain,
        ),
    )
}


def check(claim: Claim, repo_root: Path = REPO_ROOT) -> Outcome:
    """The declared value, against the source its metric names."""
    return METRICS[claim.metric].derive(claim, repo_root)


def text_outside_declarations(text: str) -> str:
    """``text`` with every ``claim`` fence and its body removed.

    What a reader of the rendered document is left with. Used by the
    ``rendered`` half of the registry: searching the whole file for the declared
    value would find the declaration itself and pass against anything.
    """
    kept: list[str] = []
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        opener = _FENCE_OPEN.match(lines[index])
        if not opener:
            kept.append(lines[index])
            index += 1
            continue
        closer = re.compile(rf"^[ \t]*{opener.group('ticks')}`*\s*$")
        index += 1
        while index < len(lines) and not closer.match(lines[index]):
            index += 1
        index += 1
    return "\n".join(kept)


if __name__ == "__main__":                      # the registry, as a report
    for declared in declared_claims():
        result = check(declared)
        print(f"{result.status:12} {declared}  -- {result.detail}")
