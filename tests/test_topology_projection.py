"""``scripts/build_topology_projection.py``: the rail layout and the study folds.

Two things are pinned here and they are pinned for different reasons.

**The layout**, because it is the deliverable the screenshots cannot check. A
rail diagram either reads or it does not, and a reader looking at one cannot see
that a rail was drawn straight through a branch it does not belong to -- it just
looks like a line. The properties below are the ones a wrong serialisation
violates: every element gets exactly one row, a column never holds two rails at
once, a branch's rail starts at its fork, a loop closes upwards, and the chain
layout's rows are ``StudyResult.chain``'s own order.

**The folds**, because ``apps/viewer/topology.html`` renders them verbatim and
computes nothing. The claim the page makes on its own footer -- *"every number
above came out of summarize() -> fold()"* -- is only true if this projection's
numbers are that function's numbers, so every study's every field is compared
against a live call, value for value.

Handoff: ``dag_viewer_poc`` (2026-09-01), from the locked brief
``dispatch/docs/strategy/HANDOFF_20260831_tolstack_dag_strategy.md``.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_topology_projection as B  # noqa: E402
from tests.test_js_python_vocabulary import (  # noqa: E402
    js_array_strings,
    js_object_keys,
    js_table_mutations,
)
from tolerance_stack.topology import (  # noqa: E402
    EDGE_KINDS,
    NODE_KINDS,
    TRANSFORM_KINDS,
    Study,
    Topology,
    load_study,
    load_topology,
    summarize,
)

TOPOLOGIES_DIR = REPO_ROOT / "docs" / "topologies"
TOPOLOGY_JS = REPO_ROOT / "apps" / "viewer" / "topology.js"


@pytest.fixture(scope="module")
def projection() -> dict:
    """The whole projection, built from the committed documents.

    Built here rather than read from ``data/projections/viewer/``: that
    directory is gitignored, exists only in the main checkout and is shared by
    every worktree, so a test that read it would be testing whichever tree last
    ran the script.
    """
    return B.build(TOPOLOGIES_DIR, provenance=_FAKE_PROVENANCE)


#: A stamp, so `build()` does not shell out to git once per test session. Its
#: contents are irrelevant to everything asserted below.
_FAKE_PROVENANCE = {
    "schema": "joby.tolerance_stack/projection_provenance/v0",
    "built_at": "2026-09-01T00:00:00+00:00",
    "built_by": B.BUILT_BY,
    "branch": "test", "head_sha": "0" * 40, "dirty": False,
}


@pytest.fixture(scope="module")
def topologies() -> dict:
    return {path.stem.replace("topology_", ""): load_topology(path)
            for path in sorted(TOPOLOGIES_DIR.glob("topology_*.json"))}


def projected(projection: dict, topology_id: str) -> dict:
    matches = [t for t in projection["topologies"] if t["id"] == topology_id]
    assert len(matches) == 1, f"expected exactly one {topology_id!r} topology"
    return matches[0]


# --------------------------------------------------------------------------- #
# 1. the projection covers the documents                                       #
# --------------------------------------------------------------------------- #

def test_every_committed_topology_and_study_is_projected(projection):
    """Anti-vacuity, first: every property below is quantified over this set."""
    files = sorted(p.name for p in TOPOLOGIES_DIR.glob("topology_*.json"))
    assert files, "no topology documents found -- every test here would be empty"
    assert len(projection["topologies"]) == len(files)

    studies = sorted(p.name for p in TOPOLOGIES_DIR.glob("study_*.json"))
    projected_studies = sorted(
        Path(s["source_file"]).name
        for t in projection["topologies"] for s in t["studies"]
    ) + sorted(Path(o["source_file"]).name for o in projection["orphan_studies"])
    assert sorted(projected_studies) == studies, (
        "a study document reached neither a topology's `studies` nor "
        "`orphan_studies` -- the builder dropped it"
    )
    assert projection["orphan_studies"] == [], (
        "a committed study names a topology no document declares"
    )


def test_the_two_mvp_cases_are_both_there(projection):
    """The brief's L1 and L2, by id. Both must render, and the degenerate
    single-chain L1 is as much of the deliverable as the branching L2."""
    ids = {t["id"] for t in projection["topologies"]}
    assert {"vpa_output_to_pitch_plate", "pitch_system"} <= ids


def test_the_authored_document_rides_through_verbatim(projection):
    """The derived blocks sit BESIDE the document, never on top of it -- the same
    discipline ``results.json`` applies to a stack file."""
    for row in projection["topologies"]:
        authored = json.loads(
            (REPO_ROOT / row["source_file"]).read_text(encoding="utf-8"))
        assert row["topology"] == authored, (
            f"{row['source_file']}: the embedded copy is not the file"
        )


# --------------------------------------------------------------------------- #
# 2. the rail layout                                                           #
# --------------------------------------------------------------------------- #

def test_every_node_and_every_edge_gets_exactly_one_row(projection, topologies):
    """The grid is an index of the document, not a view of part of it.

    A serialisation that drops an element loses a dimension out of the page
    silently; one that emits it twice puts two rows at two different y's for one
    id, and a click on either would highlight both.
    """
    for row in projection["topologies"]:
        topology = topologies[row["id"]]
        rows = row["layout"]["rows"]
        assert [r["row"] for r in rows] == list(range(len(rows))), (
            f"{row['id']}: row indices must be 0..n-1 in order"
        )
        nodes = [r["id"] for r in rows if r["kind"] == "node"]
        edges = [r["id"] for r in rows if r["kind"] == "edge"]
        assert sorted(nodes) == sorted(n.id for n in topology.nodes)
        assert sorted(edges) == sorted(e.id for e in topology.edges)


def test_a_column_never_holds_two_rails_at_the_same_row(projection):
    """The invariant the up-front allocation exists for.

    A column IS reusable once a branch ends, so the check is that two rails in
    one column never overlap, not that a column holds one rail.

    Corrected in ``review/dag_viewer_poc``: this docstring, the README and the
    lesson all said reuse "keeps the pitch system nine rails wide instead of
    twelve", and it does not -- reuse never fires on either committed topology
    (nine allocations over nine columns, and disabling it leaves nine). The
    invariant is still the right one; the sentence was a claim about data that
    nothing measured. ``test_reuse_is_what_this_invariant_guards`` below builds a
    graph that does reuse, so the property is not vacuous.
    """
    for row in projection["topologies"]:
        rails = row["layout"]["rails"]
        by_column = {}
        for rail in rails:
            by_column.setdefault(rail["column"], []).append(rail)
        for column, spans in by_column.items():
            spans = sorted(spans, key=lambda s: s["start"])
            for earlier, later in zip(spans, spans[1:]):
                assert earlier["end"] < later["start"], (
                    f"{row['id']}: column {column} draws two rails over the same "
                    f"rows ({earlier} and {later}) -- they would be one line"
                )


def test_reuse_is_what_this_invariant_guards():
    """A graph that DOES reuse a column, because the committed two do not.

    Added in ``review/dag_viewer_poc``, with the corrected sentence above: the
    disjointness property is quantified over topologies where every column holds
    exactly one rail, so today it cannot tell a correct serialiser from one that
    never reuses at all. This is the smallest graph that frees a column and then
    takes it again -- a root with three edges, whose third branch forks after the
    second branch has ended and released its column -- and it is here so the
    invariant has one case with something to say.

    Built in memory rather than committed: it is a property of the serialiser,
    not a mechanism, and ``docs/topologies/`` is for real mechanisms.
    """
    from tolerance_stack.topology import Edge, Node, Part

    def node(node_id):
        return Node(id=node_id, name=node_id, parts=["p"], kind="datum_feature")

    def edge(edge_id, a, b):
        return Edge(id=edge_id, name=edge_id, from_node=a, to_node=b, part="p")

    layout = B.serialize_topology(Topology(
        id="reuse", title="reuse", units="mm",
        parts=[Part(id="p", name="p")],
        nodes=[node(f"n{i}") for i in range(6)],
        edges=[edge("e1", "n0", "n1"), edge("e2", "n0", "n2"),
               edge("e3", "n0", "n3"), edge("e4", "n3", "n4"),
               edge("e5", "n3", "n5")],
    ))
    rails = layout.as_dict()["rails"]
    assert len(rails) > layout.columns, (
        "this graph is supposed to reuse a column -- it allocated "
        f"{len(rails)} rail(s) over {layout.columns} column(s), so it does not "
        "and the invariant below is being asserted over nothing again")
    reused = [c for c in range(layout.columns)
              if len([r for r in rails if r["column"] == c]) > 1]
    assert reused, "no column holds two rails"
    for column in reused:
        spans = sorted((r["start"], r["end"])
                       for r in rails if r["column"] == column)
        for earlier, later in zip(spans, spans[1:]):
            assert earlier[1] < later[0], (
                f"column {column} draws {earlier} and {later} over the same rows")


def test_every_rail_covers_the_rows_that_sit_on_it(projection):
    """A row's own column must be alive at that row, or the mark floats free."""
    for row in projection["topologies"]:
        layout = row["layout"]
        for entry in layout["rows"]:
            covering = [
                rail for rail in layout["rails"]
                if rail["column"] == entry["column"]
                and rail["start"] <= entry["row"] <= rail["end"]
            ]
            assert len(covering) == 1, (
                f"{row['id']}: row {entry['row']} ({entry['id']}) sits in column "
                f"{entry['column']} with {len(covering)} rail(s) covering it"
            )


def test_a_branch_link_starts_at_the_fork_and_opens_a_rail_there(projection):
    """A fan-out has to leave from the dot it forks at.

    Both halves matter: the curve is drawn at the fork's row, and the rail it
    fans into starts at that same row, so the branch is visible as a rail running
    down from the fork even while the other branch's subtree is on screen.
    """
    for row in projection["topologies"]:
        layout = row["layout"]
        rails = {(r["column"], r["start"]) for r in layout["rails"]}
        branches = [l for l in layout["links"] if l["kind"] == "branch"]
        for link in branches:
            fork = layout["rows"][link["row"]]
            assert fork["kind"] == "node", (
                f"{row['id']}: a branch fans out of an interface, not an edge"
            )
            assert fork["column"] == link["from_column"]
            assert (link["to_column"], link["row"]) in rails, (
                f"{row['id']}: the rail branch link {link} fans into does not "
                f"start at the fork's row"
            )


def test_a_closing_edge_lands_on_a_row_already_emitted(projection):
    """A loop closes UPWARDS, onto an interface the walk has already drawn.

    If a closing edge ever pointed downwards the curve would be drawn to a dot
    that is not there yet, and the depth-first walk would have a cycle in it.
    """
    for row in projection["topologies"]:
        layout = row["layout"]
        for entry in layout["rows"]:
            if entry.get("closes_row") is None:
                continue
            assert entry["closes_row"] < entry["row"]
            target = layout["rows"][entry["closes_row"]]
            assert target["kind"] == "node"
            assert target["column"] == entry["closes_column"]


def test_the_number_of_closing_edges_is_the_graphs_cycle_count(projection, topologies):
    """|E| - |V| + components -- the cyclomatic number, read off the layout.

    This is the property that says the walk is a **spanning** one: every edge
    that is not in the spanning forest closes exactly one independent loop. It is
    also the one number that would move if the walk ever revisited a node, which
    a per-row check cannot see.
    """
    for row in projection["topologies"]:
        topology = topologies[row["id"]]
        layout = row["layout"]
        closing = [r for r in layout["rows"] if r.get("closes_row") is not None]
        components = len([
            rail for rail in layout["rails"]
            if layout["rows"][rail["start"]]["column"] == rail["column"]
            and layout["rows"][rail["start"]]["kind"] == "node"
            and rail["start"] == 0
        ])
        # Both committed documents are connected; assert that rather than
        # deriving it, so a future disconnected topology reddens here with a
        # readable message instead of quietly changing the arithmetic.
        assert components == 1, f"{row['id']}: expected one connected component"
        expected = len(topology.edges) - len(topology.nodes) + 1
        assert len(closing) == expected, (
            f"{row['id']}: {len(closing)} closing edge(s), but the graph has "
            f"{expected} independent loop(s)"
        )


def test_the_l1_topology_is_a_ring_and_draws_as_two_rails(projection):
    """The brief's degenerate case, and it is a ring rather than a chain.

    Every interface in the grip stack has exactly two edges: the five clamped
    members in series, the bolt's grip running parallel to them, and the derived
    ``shank_out`` gap closing the loop. So the honest picture is two rails that
    rejoin, not one -- and the *study* over it is the single-rail case (see
    ``test_a_study_chain_serialises_to_one_rail``).
    """
    row = projected(projection, "vpa_output_to_pitch_plate")
    assert row["layout"]["columns"] == 2
    assert row["branch_nodes"] == []
    closing = [r for r in row["layout"]["rows"] if r.get("closes_row") is not None]
    assert [r["id"] for r in closing] == ["fastener_grip"]


def test_the_pitch_system_marks_its_four_branch_points(projection, topologies):
    """``Topology.branch_nodes()`` is the fork marker, and it reaches the rows.

    Read off the graph on both sides -- the list is not restated here, because a
    test that spelled the four ids would be a third copy of a thing the module
    already derives.
    """
    row = projected(projection, "pitch_system")
    expected = topologies["pitch_system"].branch_nodes()
    assert expected, "the pitch system must have forks or this asserts nothing"
    assert row["branch_nodes"] == expected
    marked = {r["id"] for r in row["layout"]["rows"] if r.get("branch")}
    assert marked == set(expected)


def test_every_fork_mark_is_one_of_the_topologys_own_branch_nodes(
        projection, topologies):
    """The generalisation of the test above, over every topology in the tree.

    The page states "this is a fork" twice from two projection fields -- the
    grid row's marker reads ``layout.rows[].branch``, the preview pane's BRANCH
    POINT chip reads ``nodes[].branch`` -- and the second is
    ``Topology.branch_nodes()`` while the first was its own inline ``> 2`` until
    ``review/dag_viewer_poc`` routed it through the same call. Asserted here for
    both, and for the L1 topology, whose correct answer is the empty set: a
    degree-2 ring gets a ``branch`` LINK at its root, because the walk fans out
    there, and that is not the same claim as a branch NODE.
    """
    for topology_id, topology in topologies.items():
        row = projected(projection, topology.id)
        expected = set(topology.branch_nodes())
        assert set(row["branch_nodes"]) == expected, topology_id
        marked = {r["id"] for r in row["layout"]["rows"]
                  if r["kind"] == "node" and r["branch"]}
        assert marked == expected, (
            f"{topology_id}: the layout marks {sorted(marked)} as forks and "
            f"Topology.branch_nodes() says {sorted(expected)}")
        chips = {n["id"] for n in row["nodes"] if n["branch"]}
        assert chips == expected, topology_id


def test_a_study_chain_serialises_to_one_rail_in_the_sums_own_order(projection):
    """The chain layout is ``StudyResult.chain``, interleaved with its interfaces.

    This is the alignment claim the grid's "#" column depends on: row 2i+1 is
    contribution i, and the interfaces either side of it are the nodes that
    contribution entered and left.
    """
    seen = 0
    for row in projection["topologies"]:
        for study in row["studies"]:
            if study["status"] != "ok":
                continue
            seen += 1
            chain = study["result"]["chain"]
            rows = study["layout"]["rows"]
            assert study["layout"]["columns"] == 1, (
                f"{study['id']}: a chain is linear, so it is one rail"
            )
            assert len(rows) == 2 * len(chain) + 1
            assert rows[0]["id"] == study["from"]
            assert rows[-1]["id"] == study["to"]
            for i, contribution in enumerate(chain):
                assert rows[2 * i + 1] == {
                    "row": 2 * i + 1, "kind": "edge", "id": contribution["edge"],
                    "column": 0, "entered_at": contribution["from"],
                    "left_at": contribution["to"],
                    "closes_row": None, "closes_column": None,
                }
                assert rows[2 * i]["id"] == contribution["from"]
                assert rows[2 * i + 2]["id"] == contribution["to"]
    assert seen >= 5, f"expected the five committed studies to fold, got {seen}"


# --------------------------------------------------------------------------- #
# 3. the numbers                                                               #
# --------------------------------------------------------------------------- #

def test_every_projected_total_is_summarizes_own_number(projection, topologies):
    """Value for value, against a live call. The page's footer claims exactly
    this, and it is the claim the whole "the viewer computes nothing" rule rests
    on: if the projection's numbers are not ``fold()``'s numbers, the rule is
    being kept in the browser and broken in the builder."""
    checked = 0
    for row in projection["topologies"]:
        topology = topologies[row["id"]]
        for projected_study in row["studies"]:
            if projected_study["status"] != "ok":
                continue
            study = load_study(REPO_ROOT / projected_study["source_file"])
            result = summarize(topology, study)
            expected = B.rounded(result.interval.as_dict())
            for field, value in expected.items():
                assert projected_study["result"][field] == value, (
                    f"{study.id}: {field} projected as "
                    f"{projected_study['result'][field]}, summarize() says {value}"
                )
            assert projected_study["result"]["units"] == result.units
            checked += 1
    assert checked >= 5, "expected the five committed studies"


def test_every_contribution_is_the_traversals_own(projection, topologies):
    """The per-row numbers too, not only the totals -- the grid prints a signed,
    scaled contribution per edge and a reviewer adds them up by eye."""
    for row in projection["topologies"]:
        topology = topologies[row["id"]]
        for projected_study in row["studies"]:
            if projected_study["status"] != "ok":
                continue
            study = load_study(REPO_ROOT / projected_study["source_file"])
            expected = [B.project_contribution(c)
                        for c in summarize(topology, study).chain]
            assert projected_study["result"]["chain"] == expected


def test_a_transcribed_value_is_never_rounded(projection):
    """``value_nominal``/``value_min``/``value_max`` are the document's own
    numbers and ride through as written; only the derived ones are rounded."""
    for row in projection["topologies"]:
        edges = {e["id"]: e for e in row["edges"]}
        for study in row["studies"]:
            for contribution in (study["result"] or {}).get("chain", []):
                dimension = edges[contribution["edge"]]["dimension"]
                assert contribution["value_nominal"] == dimension["nominal"]
                assert contribution["value_min"] == dimension["min"]
                assert contribution["value_max"] == dimension["max"]


def test_the_l1_study_totals_the_stacks_published_check(projection):
    """The proof, once more through the projection.

    ``tests/test_topology.py`` already pins the study against the stack's own
    ``worst_case_shank_out`` check. This asserts the number survives the trip
    into the file the page reads, which is the half that test cannot see.
    """
    from tolerance_stack.stack import load_stack

    stack = load_stack(
        REPO_ROOT / "docs" / "tolerance_stacks"
        / "stack_vpa_output_to_pitch_plate.json")
    published = stack.check("worst_case_shank_out").interval.as_dict()
    row = projected(projection, "vpa_output_to_pitch_plate")
    study = [s for s in row["studies"] if s["id"] == "vpa_output_shank_out"][0]
    for field, value in B.rounded(published).items():
        assert study["result"][field] == value, (
            f"{field}: the topology projection says {study['result'][field]}, "
            f"the stack's own check publishes {value}"
        )


# --------------------------------------------------------------------------- #
# 4. the states the page has to render                                         #
# --------------------------------------------------------------------------- #

def test_a_study_that_refuses_to_sum_is_carried_as_a_result(topologies):
    """``BranchAmbiguity`` is the archetype's most useful output, not a crash.

    The message is the exception's own -- written for a human author, naming the
    node and both candidate edges -- so the projection carries it whole. An
    author lassoing interactively hits this constantly; a builder that raised
    here would take the page down instead of answering the question.
    """
    topology = topologies["pitch_system"]
    ambiguous = Study(
        id="deliberately_ambiguous", title="two paths at once",
        topology="pitch_system", from_node="hub_lower_bearing_flange",
        to_node="blade_root_oml",
        selection=["hub_lower_to_top_bearing_flange", "hub_top_flange_to_top_deck",
                   "hub_top_deck_to_vpa_mount", "hub_top_deck_to_brake_mount"],
    )
    row = B.project_study(topology, ambiguous, Path("study_x.json"), {})
    assert row["status"] == "error"
    assert row["status"] in B.STUDY_STATUSES
    assert row["error"]["type"] == "BranchAmbiguity"
    assert "hub_top_deck" in row["error"]["message"]
    assert row["result"] is None and row["layout"] is None


def test_a_derived_gap_is_a_state_of_its_own(projection):
    """Three value sources, and the third is not "a dimension nobody filled in".

    A derived gap is the quantity a study computes. The projection words it as
    its own state so the page can too -- rendering it like a missing value would
    invert what it means.
    """
    row = projected(projection, "vpa_output_to_pitch_plate")
    by_id = {e["id"]: e for e in row["edges"]}
    assert by_id["shank_out"]["value_source"] == "derived"
    assert by_id["shank_out"]["dimension"] is None
    assert by_id["shank_out"]["confidence"] is None
    assert by_id["shank_out"]["crop_key"] is None
    assert {e["value_source"] for e in row["edges"]} <= set(B.VALUE_SOURCES)


def test_a_stack_ref_edge_carries_the_crop_key_the_index_is_keyed_by(projection):
    """The preview pane reuses the stack viewer's crop plumbing untouched, and
    this is the whole of what makes that possible: ``crops.json``'s ``by_stack``
    is keyed by the stack's own ``id``, and the key is derived from the file
    rather than from its filename."""
    row = projected(projection, "vpa_output_to_pitch_plate")
    keyed = [e for e in row["edges"] if e["crop_key"]]
    assert len(keyed) == 6, "every L1 edge but the derived gap re-expresses a stack"
    for edge in keyed:
        assert edge["value_source"] == "stack_ref"
        assert edge["crop_key"]["stack"] == "vpa_output_to_pitch_plate"
        assert edge["crop_key"]["element"] == edge["dimension_ref"]["element"]
        assert edge["crop_key"]["element"] == edge["dimension"]["id"]


def test_an_inline_dimension_has_no_crop_key(projection):
    """...and that is the documents' state, not a stale index. The pitch system
    is authored topology-first, so no crop covers any of it.

    Its one ``gap`` edge is *toleranced* rather than derived (the end-stop
    clearance is an ordinary term, not an answer), which is why every edge here
    is ``inline`` -- the derived state lives in L1 and is asserted there.
    """
    row = projected(projection, "pitch_system")
    assert all(e["crop_key"] is None for e in row["edges"])
    assert {e["value_source"] for e in row["edges"]} == {"inline"}
    gaps = [e for e in row["edges"] if e["kind"] == "gap"]
    assert [e["id"] for e in gaps] == ["end_stop_clearance"]
    assert gaps[0]["dimension"] is not None


def test_every_confidence_the_projection_writes_is_a_word_the_viewer_knows(projection):
    """``no_source_ref`` is minted by ``build_viewer_projection`` for an element
    with no citation, and this builder mints it for a dimension with none -- the
    same word for the same fact, so the same chip renders it."""
    from build_viewer_projection import PROJECTION_CONFIDENCES

    seen = {e["confidence"] for row in projection["topologies"]
            for e in row["edges"]}
    assert seen - {None} <= set(PROJECTION_CONFIDENCES), (
        f"the projection writes {sorted(seen - set(PROJECTION_CONFIDENCES))}, "
        f"which apps/viewer has no chip for"
    )


# --------------------------------------------------------------------------- #
# 5. the JS hand-copies                                                        #
# --------------------------------------------------------------------------- #

#: Each pairing: the JS name, the extractor that reads it out of
#: ``apps/viewer/topology.js``, and the Python tuple that defines it. Same rule
#: as ``tests/test_js_python_vocabulary.py``, which owns the extractors: **never
#: restate a vocabulary in a third place** -- both sides are read, neither is
#: written out here.
#:
#: The last three are the **documents'** vocabularies rather than the
#: projection's: they are validated by ``Node``/``Edge``/``Transform``'s own
#: ``__post_init__`` and ride through :func:`project_node` / :func:`project_edge`
#: untouched, and the page branches on each with a silent default arm. Added in
#: ``review/dag_viewer_poc``: they shipped written out a third time inside
#: ``apps/viewer/tests.js``'s ``TOPO_VALUE_GUARDS``, where an ``inList`` copy
#: fails loudly on a new **live** value but nothing tells it that Python's
#: vocabulary grew -- which for a documents' vocabulary is the earlier signal.
JS_PAIRINGS = (
    ("TOPO_ROW_KINDS", js_array_strings, B.ROW_KINDS),
    ("TOPO_LINK_KINDS", js_array_strings, B.LINK_KINDS),
    ("STUDY_STATUSES", js_array_strings, B.STUDY_STATUSES),
    ("VALUE_SOURCES", js_object_keys, B.VALUE_SOURCES),
    ("NODE_KINDS", js_array_strings, NODE_KINDS),
    ("EDGE_KINDS", js_array_strings, EDGE_KINDS),
    ("TRANSFORM_KINDS", js_array_strings, TRANSFORM_KINDS),
)


@pytest.fixture(scope="module")
def topology_js() -> str:
    return TOPOLOGY_JS.read_text(encoding="utf-8")


@pytest.mark.parametrize("name,extractor,python", JS_PAIRINGS,
                         ids=[p[0] for p in JS_PAIRINGS])
def test_the_js_copy_spells_exactly_what_python_enumerates(
        name, extractor, python, topology_js):
    table = extractor(topology_js, name)
    assert table.keys, f"VA.{name} extracted empty -- the reader has drifted"
    assert set(table.keys) == set(python), (
        f"apps/viewer/topology.js:{table.line} VA.{name} and "
        f"scripts/build_topology_projection.py disagree:\n"
        f"  Python writes, JS has no branch for: {sorted(set(python) - table.keys)}\n"
        f"  JS branches on, Python cannot write: {sorted(table.keys - set(python))}"
    )


def test_no_key_is_attached_to_a_topology_table_from_outside_its_literal(
        topology_js):
    """The hole the pairing above has by construction.

    ``VA.VALUE_SOURCES.provisional = {...}`` ten screens down is a fourth branch
    the extractor cannot see, so the pairing would read as equal while the page
    branched on a word Python cannot write. ``viewer.js``'s six tables have been
    refused this pattern since ``js_python_vocabulary_pairing`` (2026-08-12);
    ``topology.js``'s shipped without it and it is the same file's rule, so it is
    the same test. Added in ``review/dag_viewer_poc``.
    """
    problems = []
    for name, extractor, _ in JS_PAIRINGS:
        table = extractor(topology_js, name)
        problems += [f"VA.{name} mutated at {m}"
                     for m in js_table_mutations(topology_js, table)]
    # STUDY_ERRORS is paired by its own test below, not through JS_PAIRINGS, and
    # is exactly as reachable from outside its literal.
    errors = js_object_keys(topology_js, "STUDY_ERRORS")
    problems += [f"VA.STUDY_ERRORS mutated at {m}"
                 for m in js_table_mutations(topology_js, errors)]
    assert problems == [], (
        "these assignments add to an enumerated table from outside its literal, "
        "which puts part of a vocabulary somewhere no reader and no pairing test "
        "will look for it:\n" + "\n".join(f"  {p}" for p in problems)
    )


def test_the_mutation_scan_can_fail(topology_js):
    """...and the scan itself, watched failing, on each shape it refuses."""
    table = js_array_strings(topology_js, "TOPO_ROW_KINDS")
    assert js_table_mutations(topology_js, table) == [], "the live file is clean"
    assert js_table_mutations(
        topology_js + '\n  VA.TOPO_ROW_KINDS.push("sneaky");\n', table)
    assert js_table_mutations(
        topology_js + '\n  VA.TOPO_ROW_KINDS[2] = "sneaky";\n', table)
    obj = js_object_keys(topology_js, "VALUE_SOURCES")
    assert js_table_mutations(
        topology_js + "\n  VA.VALUE_SOURCES.sneaky = {};\n", obj)


def test_the_projection_publishes_its_own_vocabularies(projection):
    """The four tuples ride in the file's top level too.

    Not for the viewer -- it holds its own copies, paired above -- but so that
    anything else reading ``topologies.json`` can see what an enumerated field's
    domain was **when the file was built**, rather than having to find the script
    that wrote it.
    """
    assert projection["row_kinds"] == list(B.ROW_KINDS)
    assert projection["link_kinds"] == list(B.LINK_KINDS)
    assert projection["value_sources"] == list(B.VALUE_SOURCES)
    assert projection["study_statuses"] == list(B.STUDY_STATUSES)


def test_the_study_error_table_covers_every_exception_the_module_raises():
    """Every ``StudyError`` subclass gets a headline and a next step in the JS.

    The exceptions carry messages written for a human; ``VA.STUDY_ERRORS`` adds
    what the exception cannot know, which is what to DO. A subclass missing from
    it renders as the loud unlabelled fallback -- correct, but a state nobody
    should be able to reach by adding an exception and forgetting the page.
    """
    from tolerance_stack import topology as T

    raised = {cls.__name__ for cls in vars(T).values()
              if isinstance(cls, type) and issubclass(cls, T.StudyError)
              and cls is not T.StudyError}
    assert raised, "no StudyError subclasses found -- the scan drifted"
    source = TOPOLOGY_JS.read_text(encoding="utf-8")
    table = js_object_keys(source, "STUDY_ERRORS")
    assert set(table.keys) == raised, (
        f"apps/viewer/topology.js:{table.line} VA.STUDY_ERRORS and "
        f"tolerance_stack/topology.py's StudyError subclasses disagree:\n"
        f"  raised, no branch here: {sorted(raised - table.keys)}\n"
        f"  branched on, never raised: {sorted(table.keys - raised)}"
    )
