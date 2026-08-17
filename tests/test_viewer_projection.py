"""Tests for the viewer's results projection (``scripts/build_viewer_projection.py``).

Two things are being defended:

1. **Verbatim.** The projection embeds each stack's authored JSON unchanged. If
   a future "helpful" normalisation ever rewrites a value on the way through,
   the viewer would be showing a number nobody authored, and the whole
   provenance story would be a lie. ``test_stack_block_is_byte_identical`` is
   the guard.
2. **One fold.** Every interval and verdict in the projection is the one
   :func:`tolerance_stack.fold` produces. The tests re-assert the ground-truth
   numbers already pinned in ``test_tolerance_stack.py`` *through the
   projection*, so a projection that quietly re-computed anything would show up
   here rather than in the browser.
3. **Generated checks arrive generated.** A stack whose ``archetype`` produces
   its own checks is loaded by that archetype's loader here, in Python, and its
   term lists reach the viewer with their **coefficients** -- because a ``2k``
   weighted term rendered as a bare ``+ element`` is worse than rendering
   nothing. Handoff ``viewer_generated_checks`` (2026-08-06).

Handoff: stack_viewer_v0 (2026-08-05).
"""

from __future__ import annotations

import functools
import json
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import build_viewer_projection as bvp  # noqa: E402
from tolerance_stack import thermal  # noqa: E402

STACKS_DIR = REPO_ROOT / "docs" / "tolerance_stacks"
TOL = 1e-6

THERMAL_STACKS = ("hub_bearing_thermal_fit_m1", "hub_bearing_thermal_fit_m2")

MINIMAL_STACK = {
    "schema": "joby.tolerance_stack/stack_definition/v0",
    "id": "fixture_stack",
    "title": "A one-element stack, for the projection's own edge cases",
    "units": "mm",
    "elements": [
        {"id": "only", "name": "only element", "role": "clamped_member",
         "nominal": 1.0, "min": 0.9, "max": 1.1},
    ],
    "paths": [],
    "checks": [],
}


def write_stack(directory: Path, **overrides) -> Path:
    """A minimal stack file in ``directory``, plus any overriding top-level keys."""
    data = dict(MINIMAL_STACK)
    data.update(overrides)
    path = directory / f"stack_{data['id']}.json"
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path


@functools.lru_cache(maxsize=1)
def full_projection():
    """The real projection, built once for the whole module."""
    return bvp.build(STACKS_DIR, STACKS_DIR / "hardware_entries.json")


def project_one(stack_id):
    return by_id(full_projection(), stack_id)


@pytest.fixture(scope="module")
def projection():
    return full_projection()


@pytest.fixture(scope="module")
def pitch_link(projection):
    return by_id(projection, "pitch_link_to_pitch_plate")


def by_id(projection, stack_id):
    for stack in projection["stacks"]:
        if stack["id"] == stack_id:
            return stack
    raise AssertionError(f"no stack {stack_id!r} in the projection")


def check_by_id(stack, check_id):
    for check in stack["checks"]:
        if check["check_id"] == check_id:
            return check
    raise AssertionError(f"no check {check_id!r}")


# --- shape ----------------------------------------------------------------


def test_every_stack_file_is_projected(projection):
    on_disk = sorted(p.name for p in STACKS_DIR.glob("stack_*.json"))
    assert len(projection["stacks"]) == len(on_disk)
    assert projection["schema"] == bvp.SCHEMA_PROJECTION


def test_stack_block_is_byte_identical(projection):
    """The embedded stack must round-trip the authored file exactly."""
    for stack in projection["stacks"]:
        authored = json.loads((REPO_ROOT / stack["source_file"]).read_text(encoding="utf-8"))
        assert stack["stack"] == authored, stack["id"]


def test_worksheet_is_matched_by_name_and_absence_is_reported(projection):
    pitch_link = by_id(projection, "pitch_link_to_pitch_plate")
    assert pitch_link["worksheet_file"] == (
        "docs/tolerance_stacks/WORKSHEET_pitch_link_to_pitch_plate.md"
    )
    assert pitch_link["worksheet_source"] == "by_name"
    # take-2 has no worksheet of its own; the projection says so rather than
    # pointing the viewer at the take-1 sheet.
    take2 = by_id(projection, "tan_link_to_pitch_plate_take2")
    assert take2["worksheet_file"] is None
    assert take2["worksheet_source"] is None


def test_a_declared_worksheet_overrides_the_name_and_may_serve_several_stacks(projection):
    """``provenance.worksheet`` beats ``stack_X.json`` -> ``WORKSHEET_X.md``.

    Both thermal-fit stacks are one analysis -- M1 exists to be read against M2 --
    and one sheet covers them. By name each would look for a
    ``WORKSHEET_hub_bearing_thermal_fit_m1.md`` that does not exist and report "no
    worksheet", which is what the viewer said before this handoff. The field is
    the authors' own, already in both files.
    """
    for stack_id in THERMAL_STACKS:
        stack = by_id(projection, stack_id)
        assert stack["worksheet_file"] == (
            "docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md"
        ), stack_id
        assert stack["worksheet_source"] == "declared", stack_id


def test_a_declared_worksheet_is_resolved_beside_the_stack_not_against_the_cwd(tmp_path):
    """A relative declared path goes to the stack's own dir, then the repo root.

    Never the process cwd: ``review/citation_export_provenance`` shipped a blocker
    for exactly that in ``build_viewer_crops.export_pdf_path`` -- a cwd-dependent
    resolution passes in a worktree and fails in the main checkout.
    """
    (tmp_path / "WORKSHEET_shared.md").write_text("# shared\n", encoding="utf-8")
    path = write_stack(tmp_path, provenance={"worksheet": "WORKSHEET_shared.md"})
    worksheet, how = bvp.worksheet_for(path, json.loads(path.read_text(encoding="utf-8")))
    assert worksheet == tmp_path / "WORKSHEET_shared.md"
    assert how == "declared"


def test_a_declared_worksheet_that_is_not_there_raises_rather_than_reading_as_absent(
    tmp_path,
):
    """The author asserted the file exists; a silent fall-through would render as
    "no worksheet" while the JSON says there is one."""
    path = write_stack(tmp_path, provenance={"worksheet": "WORKSHEET_typo.md"})
    with pytest.raises(FileNotFoundError, match="WORKSHEET_typo.md"):
        bvp.worksheet_for(path, json.loads(path.read_text(encoding="utf-8")))


def test_hardware_entries_are_carried_verbatim(projection):
    authored = json.loads((STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))
    assert projection["hardware_entries"] == authored


# --- the fold comes through unchanged -------------------------------------


def test_pitch_link_shank_out_matches_the_pinned_ground_truth(pitch_link):
    """Same numbers ``test_tolerance_stack.py`` pins, seen through the projection."""
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert check["verdict"] == "fail"
    assert check["worst_case_min"] == pytest.approx(-8.1939, abs=TOL)
    assert check["worst_case_max"] == pytest.approx(-7.4859, abs=TOL)
    assert check["nominal"] == pytest.approx(-7.8399, abs=TOL)


def test_pitch_link_cotter_hole_budget_passes(pitch_link):
    check = check_by_id(pitch_link, "cotter_hole_clear_of_sourced_stack")
    assert check["verdict"] == "pass"
    assert check["worst_case_min"] == pytest.approx(11.1435, abs=TOL)


def test_thread_region_T_path_reproduces_the_standards_own_T_ref(pitch_link):
    path = next(p for p in pitch_link["paths"] if p["id"] == "thread_region_T")
    assert path["interval"]["nominal"] == pytest.approx(8.2042, abs=TOL)


# --- provenance, the point of the viewer ----------------------------------


def test_pitch_link_provenance_counts_match_its_worksheet(pitch_link):
    """The worksheet claims 4 traced / 2 inferred / 0 untraced out of 6."""
    assert pitch_link["provenance_counts"] == {
        "traced": 4,
        "inferred": 2,
        "untraced": 0,
        "no_source_ref": 0,
    }


def test_zero_width_bands_are_flagged(pitch_link):
    flagged = {e["id"] for e in pitch_link["elements"] if e["zero_width"]}
    assert flagged == {"bushing_214820", "washer_nas1149v0332"}
    assert pitch_link["zero_width_count"] == 2


def test_both_pitch_link_checks_reach_the_viewer_as_budget_scope(pitch_link):
    """The live migration, at value level: the two checks that used to shout
    ``-- INCOMPLETE:`` in their labels now carry the schema fields, and the
    projection hands the viewer all three -- the authored flag, the terms it
    names, and the scope derived from it."""
    assert [c["verdict_scope"] for c in pitch_link["checks"]] == ["budget", "budget"]
    assert [c["complete"] for c in pitch_link["checks"]] == [False, False]
    for check in pitch_link["checks"]:
        assert check["excluded_terms"] == [
            "pitch-link eye / spherical bearing width -- no document"]
        assert "INCOMPLETE" not in check["label"]
    # verdict's domain is untouched -- the whole point of a second field.
    assert [c["verdict"] for c in pitch_link["checks"]] == ["fail", "pass"]


def test_a_complete_check_is_joint_scoped_and_names_nothing_excluded(projection):
    tan_link = by_id(projection, "tan_link_to_pitch_plate")
    assert all(c["verdict_scope"] == "joint" for c in tan_link["checks"])
    assert all(c["complete"] for c in tan_link["checks"])
    assert all(c["excluded_terms"] == [] for c in tan_link["checks"])


# --- identity_rule: what identifies the bytes when no export does ----------
#
# Four live citations are ``confidence: "traced"`` and carry no ``export`` block,
# and both halves are true: ``data/inbox/specs/`` is append-only, so the filename
# identifies the bytes and there is nothing to export. The rule that makes the
# pair legitimate lived on the CROP entry (``resolved_by: "spec_pile"``), one hop
# from the row a reader reads, so the viewer showed `traced` beside "nothing here
# identifies the bytes" and the reader had no way to tell that apart from a gap.
# ``ISSUE_20260812_four_traced_spec_citations_carry_no_export_block``.

#: The four, by ``stack:element``. Named rather than derived on purpose: this is
#: the set the issue is about, and a test that recomputed the condition would
#: pass against the condition being wrong.
SPEC_PILE_CITATIONS = {
    "tan_link_to_pitch_plate:fastener_grip_13",
    "tan_link_to_pitch_plate:fastener_grip_14",
    "tan_link_to_pitch_plate_take2:fastener_grip_13",
    "vpa_output_to_pitch_plate:fastener_grip",
}


def marked_citations(projection):
    return {
        f"{stack['id']}:{element['id']}"
        for stack in projection["stacks"]
        for element in stack["elements"]
        if element["identity_rule"] == bvp.IDENTITY_RULE_SPEC_PILE
    }


def test_the_four_spec_pile_citations_carry_the_derived_marker(projection):
    assert marked_citations(projection) == SPEC_PILE_CITATIONS


def test_no_workbook_assumed_or_drawing_citation_carries_a_marker(projection):
    """Deliverable 2, at value level: **only** the spec-pile citations.

    The other 22 no-export citations (21 ``workbook``, 1 ``assumed``) are
    uncontroversial -- a spreadsheet has no exported PDF to name -- and the rule
    the marker states is not true of them. Nor is it true of a citation that names
    its export, including the three live ``spec`` ones that do.
    """
    seen = {}
    for stack in projection["stacks"]:
        raw = {e["id"]: e for e in stack["stack"]["elements"]}
        for element in stack["elements"]:
            rule = element["identity_rule"]
            if rule is None:
                continue
            source_ref = raw[element["id"]]["source_ref"]
            seen[f"{stack['id']}:{element['id']}"] = (
                source_ref.get("kind"), bool(source_ref.get("export")))
    assert set(seen) == SPEC_PILE_CITATIONS
    assert all(pair == ("spec", False) for pair in seen.values()), seen


def test_a_spec_citation_that_names_its_export_gets_no_marker(projection):
    """The precedence, which is ``build_viewer_crops.resolve_pdf``'s own order.

    Three live ``spec`` citations DO carry an export block and resolve by
    ``source_ref_export``. The pile's filename rule is what identifies the bytes
    only where nothing stronger does -- and the marker is silent there rather than
    making a second, weaker claim beside the export's sha256.
    """
    with_export = [
        f"{stack['id']}:{element['id']}"
        for stack in projection["stacks"]
        for element in stack["stack"]["elements"]
        if (element.get("source_ref") or {}).get("kind") == "spec"
        and (element.get("source_ref") or {}).get("export")
    ]
    assert with_export, "no live spec citation names an export -- has the data moved?"
    assert not set(with_export) & marked_citations(projection)


def test_the_marker_is_derived_and_never_authored(projection):
    """It is a *derived* flag, so no stack file may carry one.

    The embedded ``stack`` block is byte-identical to the file
    (``test_stack_block_is_byte_identical``), which is where it would show up if
    somebody started authoring it -- and an authored identity rule is a claim
    about bytes that nothing checked.
    """
    for stack in projection["stacks"]:
        for element in stack["stack"]["elements"]:
            assert "identity_rule" not in element
            assert "identity_rule" not in (element.get("source_ref") or {})


@pytest.mark.parametrize(
    "source_ref,expected",
    [
        ({"kind": "spec", "document": "NAS6403-NAS6420 Rev 4.pdf"},
         bvp.IDENTITY_RULE_SPEC_PILE),
        # A spec citation whose export IS established: the export identifies the
        # bytes and the marker stays out of it.
        ({"kind": "spec", "document": "x.pdf",
          "export": {"status": "established", "pdf": "C:/x.pdf", "sha256": "ab" * 32}},
         None),
        # No document, so there is no filename to be the identity. `resolve_pdf`
        # refuses this citation before any kind branch; the marker has to agree,
        # or the row states "the filename above IS the identity" above a blank.
        # `SourceRef.document` defaults to None and nothing requires it for
        # `spec`, so this is an authoring slip away (added in review 2026-08-13).
        ({"kind": "spec", "document": None}, None),
        ({"kind": "spec", "document": ""}, None),
        ({"kind": "workbook", "document": "260729_sample_tol_stack.xlsx"}, None),
        ({"kind": "assumed", "document": None}, None),
        ({"kind": "drawing", "document": "215197"}, None),
    ],
    ids=["spec", "spec-with-export", "spec-no-document", "spec-blank-document",
         "workbook", "assumed", "drawing"],
)
def test_identity_rule_of_ref_reads_the_kind_and_the_absence_of_an_export(
        source_ref, expected):
    from tolerance_stack.stack import SourceRef
    assert bvp.identity_rule_of_ref(SourceRef.from_dict(source_ref)) == expected


def test_an_element_with_no_citation_carries_no_marker():
    assert bvp.identity_rule_of_ref(None) is None


def test_no_projected_check_still_carries_the_deleted_prose_flag(projection):
    """``incomplete`` was a derived key built by searching the prose. It is gone,
    not shipped beside its replacement: two detectors are worse than one bad
    detector, and a stale key is how a consumer keeps reading the old one."""
    for stack in projection["stacks"]:
        for check in stack["checks"]:
            assert "incomplete" not in check


# --- generated checks: the archetype's own loader, run here ----------------


def test_project_stack_dispatches_on_archetype_to_the_generating_loader():
    """The dispatch, at value level -- not "a flag is set" but "these numbers".

    Every projected check of a ``thermal_fit`` stack must equal the one
    ``thermal.load_thermal_fit_stack`` produces, check id for check id and
    interval for interval. That is what "generated once, in Python, by the same
    code the tests pin" means: if the projection ever grew its own generation --
    or the viewer re-derived in JS -- these two would drift and this test is
    where it shows.

    Replaces ``test_a_generated_check_archetype_says_so_rather_than_showing_no_checks``
    (review/stack_viewer_v0), whose subject was the honesty notice that stood in
    for this feature. The notice itself is still pinned, narrowed to the case it
    still covers, by
    ``test_an_archetype_with_no_loader_still_says_generated_not_no_checks``.
    """
    assert bvp.ARCHETYPE_LOADERS["thermal_fit"] is thermal.load_thermal_fit_stack

    materials = thermal.load_materials(STACKS_DIR / "materials.json")
    for stack_id in THERMAL_STACKS:
        projected = project_one(stack_id)
        ground_truth = thermal.load_thermal_fit_stack(
            STACKS_DIR / f"stack_{stack_id}.json", materials
        )
        outcomes = {r.check_id: r for r in ground_truth.all_checks()}
        assert projected["archetype"] == "thermal_fit"
        assert projected["checks_source"] == "generated"
        assert projected["checks_generated_not_rendered"] is False
        assert [c["check_id"] for c in projected["checks"]] == list(outcomes), stack_id
        assert len(projected["checks"]) == 16, stack_id
        for check in projected["checks"]:
            outcome = outcomes[check["check_id"]]
            assert check["verdict"] == outcome.verdict, check["check_id"]
            assert check["generated"] is True
            for key, value in (
                ("nominal", outcome.interval.nominal),
                ("worst_case_min", outcome.interval.min),
                ("worst_case_max", outcome.interval.max),
                ("rss_center", outcome.interval.rss_center),
                ("rss_half", outcome.interval.rss_half),
            ):
                assert check[key] == pytest.approx(value, abs=TOL), (
                    f"{check['check_id']}.{key}")


def test_a_generated_term_reaches_the_projection_with_its_coefficient():
    """The deliverable the rest of the feature waited on.

    ``2.0010712`` on the sleeve wall is ``2`` (the wall is diametral -- a sleeve
    OD is bore + 2 x wall, and the two walls are ONE turned dimension) times the
    stainless soak factor at +52 C. Rendered as a bare ``+ sleeve_wall`` it would
    look readable and be wrong by a factor of two, on the surface whose whole job
    is letting a reviewer read every sign.
    """
    m1 = project_one("hub_bearing_thermal_fit_m1")
    check = check_by_id(m1, "lower_seat__hub_to_sleeve__hot")
    f_sleeve = thermal.thermal_factor(10.3, 52.0)      # SS_AISI_420_AMS5621
    f_hub = thermal.thermal_factor(23.04, 52.0)        # AL_7050_T7451
    assert check["element_terms"] == [
        {"element_id": "sleeve_bore_lower", "sign": 1,
         "coefficient": pytest.approx(f_sleeve, abs=1e-9)},
        {"element_id": "sleeve_wall_lower", "sign": 1,
         "coefficient": pytest.approx(2 * f_sleeve, abs=1e-9)},
        {"element_id": "hub_bore_lower", "sign": -1,
         "coefficient": pytest.approx(f_hub, abs=1e-9)},
    ]
    # Non-unity, and by more than a rounding: the wall's weight is ~2.
    weights = {t["element_id"]: t["coefficient"] for t in check["element_terms"]}
    assert weights["sleeve_wall_lower"] > 1.9

    # The stiffness split reaches the DOM too, and its k / 1-k pair is the one a
    # reader is most likely to mis-assume symmetric.
    stage2 = check_by_id(m1, "lower_seat__sleeve_to_bearing__room")
    room = {(t["element_id"], t["sign"]): t["coefficient"] for t in stage2["element_terms"]}
    assert room[("sleeve_wall_lower", 1)] == pytest.approx(1.6)      # 2k, k = 0.8
    assert room[("hub_bore_lower", -1)] == pytest.approx(0.8)        # k
    assert room[("sleeve_bore_lower", -1)] == pytest.approx(0.2)     # 1 - k


def test_the_projected_terms_are_the_report_that_reviews_them_term_for_term():
    """The viewer's term list must equal ``debug_report_thermal_fit.py --terms``.

    That report is how the generated coefficients were made reviewable before
    this surface existed -- the worksheet pastes its output -- so it is the right
    thing to be identical to. Same order, same element, same sign, same
    coefficient at the projection's display precision, for every term of every
    check of both stacks. If the projection ever grows its own generation, or the
    display rounding starts losing a digit the report shows, this is where it
    surfaces.
    """
    materials = thermal.load_materials(STACKS_DIR / "materials.json")
    compared = 0
    for stack_id in THERMAL_STACKS:
        report = thermal.expanded_terms_table(
            thermal.load_thermal_fit_stack(
                STACKS_DIR / f"stack_{stack_id}.json", materials)
        )
        projected = [
            dict(check_id=check["check_id"], **term)
            for check in project_one(stack_id)["checks"]
            for term in check["element_terms"]
        ]
        assert len(projected) == len(report), stack_id
        for row, term in zip(report, projected):
            assert (row["check_id"], row["element"], row["sign"]) == (
                term["check_id"], term["element_id"], term["sign"])
            assert round(row["coefficient"], bvp.COEFFICIENT_DECIMALS) == (
                term["coefficient"]), f"{row['check_id']} / {row['element']}"
            compared += 1
    assert compared == 104, "52 terms per stack, both stacks"


def test_every_coefficient_is_rounded_for_display_and_carries_no_float_noise():
    """Display rounding, in Python, like every other number in the projection.

    ``1 - 0.8`` is ``0.19999999999999996`` in binary floating point, and the
    viewer prints numbers with ``String(n)`` and no rounding of its own -- by
    design, so that no arithmetic decision is taken in JS. So the rounding
    happens here.
    """
    for stack_id in THERMAL_STACKS:
        for check in project_one(stack_id)["checks"]:
            for term in check["element_terms"]:
                coefficient = term["coefficient"]
                assert coefficient > 0, "direction belongs in `sign`"
                assert coefficient == round(coefficient, bvp.COEFFICIENT_DECIMALS)


def test_an_authored_stacks_terms_are_unweighted_and_unchanged(projection):
    """The four non-thermal stacks fold exactly as before: coefficient 1.0."""
    for stack in projection["stacks"]:
        if stack["checks_source"] == "generated":
            continue
        assert stack["archetype"] is None
        assert stack["checks_generated_not_rendered"] is False
        assert stack["materials"] == []
        for check in stack["checks"]:
            assert check["generated"] is False
            assert not check["sensitivity"]
            for term in check["element_terms"]:
                assert term["coefficient"] == 1.0, check["check_id"]


def test_an_archetype_with_no_loader_still_says_generated_not_no_checks(tmp_path):
    """The honesty guard, narrowed to the case ``ARCHETYPE_LOADERS`` cannot close.

    A stack declaring an archetype this script has no loader for projects zero
    checks -- true -- and "this stack has no checks" is false. The viewer must
    still be able to tell them apart, so the flag stays.
    """
    write_stack(tmp_path, id="mystery_archetype", archetype="no_such_archetype")
    projection = bvp.build(tmp_path, tmp_path / "hardware_entries.json")
    stack = by_id(projection, "mystery_archetype")
    assert stack["archetype"] == "no_such_archetype"
    assert stack["checks"] == []
    assert stack["checks_source"] == "authored"
    assert stack["checks_generated_not_rendered"] is True

    # ...and a stack with no archetype and no checks is just that.
    write_stack(tmp_path, id="plain")
    projection = bvp.build(tmp_path, tmp_path / "hardware_entries.json")
    plain = by_id(projection, "plain")
    assert plain["checks_generated_not_rendered"] is False


def test_sensitivity_probes_are_flagged_from_the_structured_field():
    """A probe rendered as an ordinary pass/fail card would read as a second
    opinion about the joint, which is the opposite of what it is."""
    for stack_id in THERMAL_STACKS:
        stack = project_one(stack_id)
        probes = [c for c in stack["checks"] if c["sensitivity"]]
        assert len(probes) == 4, stack_id           # 2 chains x {k = 0, k = 1}
        for probe in probes:
            assert probe["label"].startswith("[SENSITIVITY]")
            assert "NOT A RESULT" in probe["guidance"]
        results = [c for c in stack["checks"] if not c["sensitivity"]]
        assert len(results) == 12                   # 2 chains x 2 stages x 3 temps


def test_is_sensitivity_reads_a_field_rather_than_the_prose():
    """Unlike INCOMPLETE, this flag is structured -- the archetype writes it."""
    assert bvp.is_sensitivity({"configuration": {"sensitivity": "true"}})
    assert not bvp.is_sensitivity({"configuration": {}})
    assert not bvp.is_sensitivity({"label": "[SENSITIVITY] but no field"})
    assert not bvp.is_sensitivity({"configuration": {"sensitivity": "false"}})


def test_a_generated_check_names_the_corner_of_fit_and_temperature_it_describes():
    """Legibility is the deliverable: a card that omits which corner it is is not
    a result anyone can review. The vocabulary is the archetype's own
    (``ARCHETYPE_thermal_fit.md``) and rides through in ``configuration``."""
    check = check_by_id(project_one("hub_bearing_thermal_fit_m2"),
                        "lower_seat__sleeve_to_bearing__hot")
    assert check["configuration"] == {
        "chain": "lower_seat",
        "stage": "sleeve_to_bearing",
        "temperature": "hot",
        "temperature_c": "72",
        "stiffness_ratio": "0.8",
    }
    assert "@ hot (72 C)" in check["label"]


# --- materials: the CTEs the answer is a function of -----------------------


def test_a_thermal_stacks_materials_reach_the_viewer_verbatim_with_their_sourcing():
    """Until this handoff, not one CTE reached this surface -- and a thermal fit's
    answer is a CTE *difference*. Each row is the authored ``materials.json``
    entry, unchanged, beside its derived sourcing flags."""
    authored = {
        m["id"]: m
        for m in json.loads((STACKS_DIR / "materials.json").read_text(encoding="utf-8"))[
            "materials"
        ]
    }
    m2 = project_one("hub_bearing_thermal_fit_m2")
    rows = {row["id"]: row for row in m2["materials"]}
    assert set(rows) == {"AL_7050_T7451", "SS_AISI_420_AMS5621", "BEARING_STEEL_52100"}
    for material_id, row in rows.items():
        assert row["material"] == authored[material_id], material_id
        # Not one CTE value in this repo is traced to anything, and the viewer
        # must say so as loudly as it does for an untraced length.
        assert row["confidence"] == "untraced", material_id
        assert row["kind"] == "workbook"
    # The designation and the value have different provenance, and the projection
    # keeps them apart because materials.json does.
    assert rows["AL_7050_T7451"]["designation_confidence"] == "traced"
    assert rows["BEARING_STEEL_52100"]["designation_confidence"] == "no_source_ref"
    assert rows["SS_AISI_420_AMS5621"]["used_by_elements"] == [
        "sleeve_bore_lower", "sleeve_wall_lower", "sleeve_bore_upper", "sleeve_wall_upper",
    ]


def test_every_element_of_a_thermal_stack_names_its_material():
    """The material is a property of the CHAIN, so only the loader knows it -- and
    a bore's growth is the mechanism, not its diameter."""
    m1 = project_one("hub_bearing_thermal_fit_m1")
    materials = {e["id"]: e["material"] for e in m1["elements"]}
    assert all(materials.values()), materials
    assert materials["hub_bore_lower"] == "AL_7050_T7451"
    assert materials["sleeve_wall_upper"] == "SS_AISI_420_AMS5621"
    assert materials["bearing_od_lower"] == "BEARING_STEEL_52100"
    # An authored stack has no material on any element.
    pitch_link = project_one("pitch_link_to_pitch_plate")
    assert {e["material"] for e in pitch_link["elements"]} == {None}


def test_worst_confidence_takes_the_weakest_input(projection):
    """A check is only as sourced as its weakest term."""
    tan_link = by_id(projection, "tan_link_to_pitch_plate")
    check = check_by_id(tan_link, "shank_out__14_thick")
    assert check["worst_confidence"] == "untraced"
    assert check["input_confidence"]["untraced"] >= 1
    # pitch_link has no untraced element at all, so its weakest is `inferred`.
    assert check_by_id(
        by_id(projection, "pitch_link_to_pitch_plate"),
        "shank_out__11_sourced_only",
    )["worst_confidence"] == "inferred"


def test_worst_confidence_ranks_a_missing_citation_below_untraced():
    assert bvp.worst_confidence({"traced": 3, "no_source_ref": 1}) == "no_source_ref"
    assert bvp.worst_confidence({"traced": 3, "untraced": 1}) == "untraced"
    assert bvp.worst_confidence({"traced": 3}) == "traced"
    assert bvp.worst_confidence({}) is None


def test_checks_carry_their_zero_width_inputs(pitch_link):
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert set(check["zero_width_inputs"]) == {"bushing_214820", "washer_nas1149v0332"}


def test_element_terms_expand_nested_paths(pitch_link):
    """A check citing a path must list that path's own elements, signs and weights.

    ``coefficient`` is ``1.0`` throughout here -- a grip stack has no weighted
    term -- and that is the point: nesting multiplies coefficients through
    (``StackDefinition._expand``), so an authored stack that never had one still
    reads as it always did.
    """
    check = check_by_id(pitch_link, "shank_out__11_sourced_only")
    assert check["element_terms"] == [
        {"element_id": "bushing_214820", "sign": 1, "coefficient": 1.0},
        {"element_id": "pitch_plate_flange", "sign": 1, "coefficient": 1.0},
        {"element_id": "washer_nas1149v0332", "sign": 1, "coefficient": 1.0},
        {"element_id": "bolt_grip_11", "sign": -1, "coefficient": 1.0},
    ]


# --- gaps -----------------------------------------------------------------


def test_the_excluded_link_eye_is_the_first_gap(pitch_link):
    """Gap 1 of the worksheet -- the term that was refused rather than invented."""
    first = pitch_link["gaps"][0]
    assert first["kind"] == "excluded_from_model"
    assert "spherical bearing" in first["text"]


def test_excluded_terms_are_deduped_across_checks(pitch_link):
    excluded = [g for g in pitch_link["gaps"] if g["kind"] == "excluded_from_model"]
    assert len(excluded) == 1  # both checks exclude the same thing


def test_hardware_gaps_reach_the_stack_that_uses_the_entry(pitch_link):
    ids = {g["hardware_id"] for g in pitch_link["gaps"] if g["kind"] == "hardware_entry"}
    assert {"NAS6403U11D", "214820-002", "NAS1149V0332"} <= ids
    # ...and not entries used only by other stacks.
    assert "NAS6404U13D" not in ids


def test_element_carries_the_gaps_of_its_own_hardware_entry(pitch_link):
    element = next(e for e in pitch_link["elements"] if e["id"] == "bolt_grip_11")
    assert any("MIL-S-8879" in g for g in element["hardware_gaps"])


# --- completeness: the schema field that replaced the prose search ---------
#
# Replaces `test_incomplete_is_detected_from_authored_prose_not_a_schema_field`,
# which pinned the lower-case miss ON PURPOSE so it could not be forgotten
# (ISSUE_20260805_check_result_has_no_complete_flag, brief 2026-08-06). Same
# misreading scenarios, opposite expectation: they all render correctly now,
# because detection no longer reads prose at all.


def test_the_prose_search_is_gone_not_merely_bypassed():
    """``is_incomplete`` is DELETED. Two detectors would be worse than one bad
    detector -- a stack could satisfy the schema and still be classified by its
    label. The script must have no way to read the prose for this."""
    assert not hasattr(bvp, "is_incomplete")
    source = (REPO_ROOT / "scripts" / "build_viewer_projection.py").read_text(
        encoding="utf-8")
    assert "INCOMPLETE" not in source


@pytest.mark.parametrize("prose", [
    "x -- incomplete: y",          # lower case: the miss the old test pinned
    "x -- PARTIAL: y",             # another word for it
    "budget only",                 # and another
    "x",                           # no announcement in the prose at all
])
def test_a_check_renders_as_a_budget_whatever_its_prose_says(tmp_path, prose):
    write_stack(
        tmp_path, id="fixture_stack",
        checks=[{"check_id": "c", "label": prose,
                 "terms": [{"element": "only"}],
                 "complete": False, "excluded_terms": ["the eye -- no document"]}],
    )
    stack = by_id(bvp.build(tmp_path, tmp_path / "hardware_entries.json"),
                  "fixture_stack")
    assert stack["checks"][0]["verdict_scope"] == "budget"
    assert stack["checks"][0]["excluded_terms"] == ["the eye -- no document"]


def test_shouting_incomplete_in_the_prose_no_longer_flags_anything(tmp_path):
    """The other direction, which the string search could not get right either:
    a check whose guidance QUOTES the word is not thereby a budget. JPS00094's
    "shall not engage any incomplete threads" is a live example, and it is in
    the pitch-link guidance."""
    write_stack(
        tmp_path, id="fixture_stack",
        checks=[{"check_id": "c", "label": "x -- INCOMPLETE: y",
                 "guidance": "This check is INCOMPLETE.",
                 "terms": [{"element": "only"}]}],
    )
    stack = by_id(bvp.build(tmp_path, tmp_path / "hardware_entries.json"),
                  "fixture_stack")
    assert stack["checks"][0]["verdict_scope"] == "joint"
    assert stack["checks"][0]["complete"] is True


def test_the_gap_list_is_built_from_the_schema_field(tmp_path):
    """``configuration.excluded`` was a free-text value in a free-text dict, and
    a check could carry it without saying INCOMPLETE. The gap list reads
    ``excluded_terms`` now, so it cannot disagree with the striped card: the one
    CheckResult invariant refuses a check that names a term and claims to be
    whole. Deduplicated across checks, in first-seen order, as before."""
    write_stack(
        tmp_path, id="fixture_stack",
        checks=[{"check_id": "c", "label": "c", "terms": [{"element": "only"}],
                 "complete": False,
                 "excluded_terms": ["the eye -- no document", "the nut height"]},
                {"check_id": "d", "label": "d", "terms": [{"element": "only"}],
                 "complete": False,
                 "excluded_terms": ["the eye -- no document"]}],
    )
    stack = by_id(bvp.build(tmp_path, tmp_path / "hardware_entries.json"),
                  "fixture_stack")
    assert [(g["kind"], g["text"]) for g in stack["gaps"]] == [
        ("excluded_from_model", "the eye -- no document"),
        ("excluded_from_model", "the nut height"),
    ]


def test_the_projection_refuses_a_check_that_breaks_the_invariant(tmp_path):
    """Validation is not a viewer-side nicety: the build itself fails."""
    write_stack(
        tmp_path, id="fixture_stack",
        checks=[{"check_id": "c", "label": "c", "terms": [{"element": "only"}],
                 "complete": False}],
    )
    with pytest.raises(ValueError, match="names no excluded_terms"):
        bvp.build(tmp_path, tmp_path / "hardware_entries.json")


def test_a_generated_thermal_check_can_declare_incompleteness():
    """Brief question 5: a GENERATED check must be able to say it too.

    ``thermal_fit`` builds its check specs in Python
    (``thermal.build_checks``), and they are plain dicts consumed by the same
    ``StackDefinition.check`` every authored stack uses -- so the archetype
    declares completeness through the identical two keys, with no second code
    path and nothing for the projection to special-case. Asserted on a real
    generated stack rather than a hand-built dict, because "the same code path"
    is the claim.
    """
    stack_path = STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json"
    raw = json.loads(stack_path.read_text(encoding="utf-8"))
    loaded = bvp.load_for_projection(stack_path, raw)
    assert loaded.checks, "the archetype must have generated its checks"
    target = loaded.checks[0]["check_id"]
    assert loaded.check(target).verdict_scope == "joint"

    loaded.checks[0]["complete"] = False
    loaded.checks[0]["excluded_terms"] = [
        "the bearing bore to spindle fit -- owned by another team"]
    got = loaded.check(target)
    assert got.verdict_scope == "budget"
    assert got.as_dict()["complete"] is False
    assert got.as_dict()["excluded_terms"] == [
        "the bearing bore to spindle fit -- owned by another team"]
