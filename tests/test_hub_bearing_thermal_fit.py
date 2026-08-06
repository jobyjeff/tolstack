"""Value-level tests for the thermal-fit archetype and the two hub-bearing stacks.

Companion to :mod:`tests.test_hub_bearing_rederivation`, which validates the
*workbook*. This file validates the *stack*: that the generated coefficients are
the ones the archetype claims, that the fold reproduces the workbook exactly
wherever the inputs are identical, and that every place it does not is a divergence
this repo has decided on and can name.

Every number carrying an external source has it in a comment -- a workbook cell
(``M2!H37``) or a drawing address (``214955-004 sh1 G8 "1.190 ±0.025"``). That
marker is what makes the suite a provenance check rather than a self-consistency
check.

Sign convention: **interference is positive here**, negative in the workbook. A
comparison against a workbook cell therefore negates it, and the negation is
written out at each site rather than hidden in a helper, because a silently
flipped sign is the error class this repo is built around.

Handoff: hub_bearing_thermal_stack (2026-08-05).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from tolerance_stack import Term, fold
from tolerance_stack.thermal import (
    SCHEMA_MATERIAL,
    STAGE_IDS,
    ThermalFitSpec,
    expanded_terms_table,
    load_materials,
    load_thermal_fit_stack,
    thermal_factor,
    workbook_corner,
)
from tests.test_hub_bearing_rederivation import CACHED

STACKS_DIR = Path(__file__).resolve().parent.parent / "docs" / "tolerance_stacks"
MATERIALS_FILE = STACKS_DIR / "materials.json"
TOL = 1e-9

#: (chain, stage) -> the workbook row holding that fit, on either shrink sheet.
WORKBOOK_ROW = {
    ("lower_seat", "hub_to_sleeve"): 19,
    ("lower_seat", "sleeve_to_bearing"): 25,
    ("upper_seat", "hub_to_sleeve"): 37,
    ("upper_seat", "sleeve_to_bearing"): 43,
}
#: (temperature group, fit corner) -> the workbook column letter.
WORKBOOK_COLUMN = {
    ("room", "nom"): "C", ("room", "lmc"): "D", ("room", "mmc"): "E",
    ("hot", "nom"): "G", ("hot", "lmc"): "H", ("hot", "mmc"): "I",
    ("cold", "nom"): "K", ("cold", "lmc"): "L", ("cold", "mmc"): "M",
}
CORNER_TO_INTERVAL = {"nom": "nominal", "lmc": "min", "mmc": "max"}


@pytest.fixture(scope="module")
def materials():
    return load_materials(MATERIALS_FILE)


@pytest.fixture(scope="module")
def m2(materials):
    return load_thermal_fit_stack(STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json", materials)


@pytest.fixture(scope="module")
def m1(materials):
    return load_thermal_fit_stack(STACKS_DIR / "stack_hub_bearing_thermal_fit_m1.json", materials)


# ---------------------------------------------------------------------------
# The materials table
# ---------------------------------------------------------------------------


def test_materials_table_holds_the_three_workbook_ctes(materials):
    """The CTEs, and the cells they came from. All three are the workbook's own."""
    assert set(materials) == {"AL_7050_T7451", "SS_AISI_420_AMS5621", "BEARING_STEEL_52100"}
    assert materials["AL_7050_T7451"].cte_1e6_per_c == 23.04          # M2!C5
    assert materials["SS_AISI_420_AMS5621"].cte_1e6_per_c == 10.3     # M2!C6
    assert materials["BEARING_STEEL_52100"].cte_1e6_per_c == 11.9     # M2!C9
    for material_id, cell in (("AL_7050_T7451", "C5"),
                              ("SS_AISI_420_AMS5621", "C6"),
                              ("BEARING_STEEL_52100", "C9")):
        entry = materials[material_id]
        assert entry.values_source.kind == "workbook"
        assert entry.values_source.cell == cell
        assert entry.values_source.document == "260209_Hub Bearing Fits.xlsx"


def test_not_one_cte_value_is_traced_and_every_one_names_its_cindas_request(materials):
    """The headline of the materials table, and it is a bad one on purpose.

    CINDAS is the source of record (Jeff, 2026-08-05) and no pull has happened, so
    every CTE is ``untraced`` with the lookup listed as a gap. Google-sourced and
    recalled values are prohibited, so the alternative to ``untraced`` here is not
    a better number -- it is an invented one.
    """
    for entry in materials.values():
        assert entry.values_source.confidence == "untraced", entry.id
        assert entry.cte_temperature_range_c is None, (
            f"{entry.id}: the workbook states no range; a range here would be invented")
        assert entry.cindas_request, entry.id
        assert entry.gaps, entry.id
        assert any("CINDAS" in gap for gap in entry.gaps), entry.id
    text = MATERIALS_FILE.read_text(encoding="utf-8")
    assert "PROHIBITED" in text and "Google" in text
    assert "scrape" in text


def test_material_designations_are_traced_except_the_bearing_steel(materials):
    """Designation and value have different provenance, hence two fields.

    Two of three designations are drawing notes; the bearing's is not, because both
    bearing drawings are source-control drawings that name no material. So '52100'
    rests on a spreadsheet cell label, and asking CINDAS about it before the NSK
    certificate arrives would produce a traced citation for a guessed alloy.
    """
    aluminium = materials["AL_7050_T7451"].designation_source
    assert aluminium.kind == "drawing" and aluminium.confidence == "traced"
    assert (aluminium.document, aluminium.sheet) == ("212966-006", 1)   # 212966-006 sh1 note 1
    assert "7050 - T7451 PER AMS4050" in aluminium.callout

    steel = materials["SS_AISI_420_AMS5621"].designation_source
    assert steel.kind == "drawing" and steel.confidence == "traced"
    assert steel.callout == "MATERIAL: AISI 420 PER AMS5621"           # 214955-004 sh1 note 1

    bearing = materials["BEARING_STEEL_52100"]
    assert bearing.designation_source is None, (
        "no drawing states the bearing material; a designation_source here would be invented")
    assert any("MATERIAL ITSELF IS UNTRACED" in gap for gap in bearing.gaps)


def test_material_entries_keep_library_ref_null_and_schema_v0(materials):
    data = json.loads(MATERIALS_FILE.read_text(encoding="utf-8"))
    assert len(data["materials"]) == 3
    for raw in data["materials"]:
        assert raw["schema"] == SCHEMA_MATERIAL
        assert raw["schema"].endswith("/v0")
    for entry in materials.values():
        assert entry.library_ref is None
        assert entry.values_status == "inline"


def test_material_entry_rejects_an_empty_gaps_list(materials):
    """Same rule as ``hardware_entry``: no gaps almost always means none looked for."""
    from tolerance_stack.thermal import MaterialEntry

    raw = json.loads(MATERIALS_FILE.read_text(encoding="utf-8"))["materials"][0]
    raw = dict(raw, gaps=[])
    with pytest.raises(ValueError, match="gaps must be non-empty"):
        MaterialEntry.from_dict(raw)


def test_every_material_used_by_reference_resolves_to_a_real_element(m2, m1):
    """``used_by`` is a back-reference and back-references rot. Check both ways."""
    stacks = {m2.id: m2, m1.id: m1}
    materials = m2.materials
    seen = set()
    for entry in materials.values():
        for reference in entry.used_by:
            stack_id, element_id = reference.split(":")
            assert stack_id in stacks, reference
            stacks[stack_id].element(element_id)     # raises if it does not exist
            seen.add(reference)
    expected = {f"{stack.id}:{element.id}"
                for stack in stacks.values() for element in stack.elements}
    assert seen == expected, "every element must appear in exactly one material's used_by"


# ---------------------------------------------------------------------------
# thermal_factor -- the archetype's one new arithmetic primitive
# ---------------------------------------------------------------------------


def test_thermal_factor_reproduces_the_workbooks_own_formula():
    """``G13 = C13*(1+($C$7-$C$4)*$C$5/1000000)``, checked against a cached cell."""
    assert thermal_factor(23.04, 0.0) == 1.0
    hot = thermal_factor(23.04, 72.0 - 20.0)              # hub, 20 -> 72 C
    assert hot == pytest.approx(1.00119808, abs=1e-12)
    assert 202.14 * hot == pytest.approx(202.3821798912, abs=1e-9)      # M2!G13
    cold = thermal_factor(23.04, -20.0 - 20.0)            # hub, 20 -> -20 C
    assert 202.14 * cold == pytest.approx(201.953707776, abs=1e-9)      # M2!K13
    sleeve_hot = thermal_factor(10.3, 52.0)
    assert 1.18 * sleeve_hot == pytest.approx(1.1806320080000001, abs=1e-12)   # M2!G15
    bearing_hot = thermal_factor(11.9, 52.0)
    assert 130.0 * bearing_hot == pytest.approx(130.080444, abs=1e-9)   # M2!G42


def test_a_cold_soak_shrinks_and_a_hot_soak_grows():
    assert thermal_factor(23.04, 52.0) > 1.0
    assert thermal_factor(23.04, -40.0) < 1.0
    # aluminium grows faster than AISI 420, which is the whole mechanism
    assert thermal_factor(23.04, 52.0) > thermal_factor(10.3, 52.0)


# ---------------------------------------------------------------------------
# The generated checks
# ---------------------------------------------------------------------------


def test_both_stacks_hand_write_no_checks_and_generate_sixteen(m2, m1):
    for stack, name in ((m2, "stack_hub_bearing_thermal_fit_m2.json"),
                        (m1, "stack_hub_bearing_thermal_fit_m1.json")):
        raw = json.loads((STACKS_DIR / name).read_text(encoding="utf-8"))
        assert raw["checks"] == [], "checks are generated; a hand-written one is a second source"
        assert raw["paths"] == []
        # 2 chains x 2 stages x 3 temperatures = 12, plus 2 sensitivity checks per chain
        assert len(stack.checks) == 16, stack.id
        ids = {c["check_id"] for c in stack.checks}
        assert len(ids) == 16
        for chain in ("lower_seat", "upper_seat"):
            for stage in STAGE_IDS:
                for group in ("cold", "room", "hot"):
                    assert f"{chain}__{stage}__{group}" in ids


def test_a_thermal_fit_stack_with_a_hand_written_check_is_refused(tmp_path):
    source = STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json"
    raw = json.loads(source.read_text(encoding="utf-8"))
    raw["checks"] = [{"check_id": "smuggled", "terms": []}]
    target = tmp_path / "smuggled.json"
    target.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(ValueError, match="must not hand-write checks"):
        load_thermal_fit_stack(target, MATERIALS_FILE)


def test_an_element_no_chain_folds_in_is_refused(tmp_path):
    """The seeded take-2 deliberately carries nut geometry nothing references, and
    a test asserts it. A *generated* stack cannot afford the same freedom: an
    element outside every chain is silently absent from every result, and there is
    no term list in the file for a reader to notice it in."""
    source = STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json"
    raw = json.loads(source.read_text(encoding="utf-8"))
    stray = dict(raw["elements"][0], id="stowaway")
    raw["elements"] = raw["elements"] + [stray]
    target = tmp_path / "stray.json"
    target.write_text(json.dumps(raw), encoding="utf-8")
    with pytest.raises(ValueError, match="referenced by no thermal_fit chain"):
        load_thermal_fit_stack(target, MATERIALS_FILE)


def test_stage_one_terms_are_the_sleeve_od_minus_the_hub_bore(m2):
    """Three terms, and the wall's coefficient is exactly twice the sleeve bore's.

    ``I1 = f_s * bore + 2 * f_s * wall - f_h * hub_bore``. At room temperature every
    factor is 1, so the coefficients read straight off.
    """
    terms = {(t.element.id, t.sign): t.coefficient
             for t in m2.terms(next(c for c in m2.checks
                                    if c["check_id"] == "lower_seat__hub_to_sleeve__room")["terms"])}
    assert terms == {
        ("sleeve_bore_lower", 1): 1.0,
        ("sleeve_wall_lower", 1): 2.0,
        ("hub_bore_lower", -1): 1.0,
    }
    hot = {(t.element.id, t.sign): t.coefficient
           for t in m2.terms(next(c for c in m2.checks
                                  if c["check_id"] == "lower_seat__hub_to_sleeve__hot")["terms"])}
    f_sleeve = thermal_factor(10.3, 52.0)
    f_hub = thermal_factor(23.04, 52.0)
    assert hot[("sleeve_bore_lower", 1)] == pytest.approx(f_sleeve, abs=1e-15)
    assert hot[("sleeve_wall_lower", 1)] == pytest.approx(2 * f_sleeve, abs=1e-15)
    assert hot[("hub_bore_lower", -1)] == pytest.approx(f_hub, abs=1e-15)


def test_stage_two_terms_carry_the_stiffness_split_and_chain_back_to_the_hub(m2):
    """``I2 = f_b*bearing + 2k*f_s*wall - k*f_h*hub - (1-k)*f_s*bore``.

    The hub bore appearing here **is** the two-stage chaining: how much of stage 1's
    interference closes the sleeve bore is what ``k`` decides. With k = 0.9 (upper
    seat) the sleeve bore survives at only 0.1 of its own size.
    """
    check = next(c for c in m2.checks if c["check_id"] == "upper_seat__sleeve_to_bearing__room")
    terms = {(t.element.id, t.sign): t.coefficient for t in m2.terms(check["terms"])}
    assert terms == {
        ("bearing_od_upper", 1): 1.0,
        ("sleeve_wall_upper", 1): pytest.approx(1.8),      # 2 * 0.9
        ("hub_bore_upper", -1): pytest.approx(0.9),
        ("sleeve_bore_upper", -1): pytest.approx(0.1),     # 1 - 0.9
    }
    lower = next(c for c in m2.checks if c["check_id"] == "lower_seat__sleeve_to_bearing__room")
    lower_terms = {(t.element.id, t.sign): t.coefficient for t in m2.terms(lower["terms"])}
    assert lower_terms[("sleeve_wall_lower", 1)] == pytest.approx(1.6)     # 2 * 0.8
    assert lower_terms[("hub_bore_lower", -1)] == pytest.approx(0.8)
    assert lower_terms[("sleeve_bore_lower", -1)] == pytest.approx(0.2)


def test_the_sensitivity_extremes_drop_the_terms_they_zero(m2):
    """``k = 0`` and ``k = 1`` are degenerate and the term lists say so.

    A ``Term`` coefficient must be > 0, so a zero-weight term is omitted rather
    than carried at zero -- the same arithmetic, and only one of the two is
    expressible. At k = 0 the sleeve bore is untouched by the install, so stage 2
    is just bearing OD minus sleeve bore; at k = 1 the sleeve's bore closes by the
    full stage-1 interference and its own free size drops out.
    """
    k0 = next(c for c in m2.checks if c["check_id"].endswith("__hot__k0"))
    ids0 = {t.element.id for t in m2.terms(k0["terms"])}
    assert ids0 == {"bearing_od_lower", "sleeve_bore_lower"} or ids0 == {
        "bearing_od_upper", "sleeve_bore_upper"}
    assert len(ids0) == 2, "k=0 drops the wall and the hub bore"

    k1 = next(c for c in m2.checks
              if c["check_id"] == "lower_seat__sleeve_to_bearing__hot__k1")
    terms1 = {(t.element.id, t.sign): t.coefficient for t in m2.terms(k1["terms"])}
    assert "sleeve_bore_lower" not in {e for e, _s in terms1}, "k=1 drops the sleeve bore"
    f_sleeve = thermal_factor(10.3, 52.0)
    assert terms1[("sleeve_wall_lower", 1)] == pytest.approx(2 * f_sleeve, abs=1e-15)


def test_sensitivity_checks_are_labelled_so_they_cannot_be_read_as_results(m2, m1):
    for stack in (m2, m1):
        sensitivity = [c for c in stack.checks
                       if c["configuration"].get("sensitivity") == "true"]
        assert len(sensitivity) == 4, stack.id      # 2 chains x {k=0, k=1}
        for check in sensitivity:
            assert check["label"].startswith("[SENSITIVITY]")
            assert "NOT A RESULT" in check["guidance"]
            assert check["workbook_cells"] is None


def test_every_generated_check_marks_itself_as_not_in_the_workbook(m2, m1):
    """SOP Step 5: a check the source does not contain carries ``workbook_cells:
    null``. Here that is *every* check -- the workbook computes fits, not checks,
    and its sign convention is the opposite one."""
    for stack in (m2, m1):
        for check in stack.checks:
            assert check["workbook_cells"] is None, check["check_id"]
            assert check["criterion"] == ">= 0"


# ---------------------------------------------------------------------------
# Against the workbook: exact where the inputs are, explained where they are not
# ---------------------------------------------------------------------------


def test_the_upper_seat_lands_on_the_workbooks_cells_wherever_the_method_agrees(m2, m1):
    """The strongest provenance check in this file.

    The upper seat's elements are the workbook's values *and* the drawings' values
    -- they agree -- so no value divergence can hide here, and the only thing left
    to differ is the method. Which means this test partitions the workbook's 18
    upper-seat fit cells per sheet cleanly:

    * **12 exact** -- every nominal column, and every corner of stage 2, whose
      worst-case fold coincides with a coherent material corner;
    * **6 explained** -- stage 1's LMC and MMC corners, each off by exactly the
      sleeve bore's tolerance width times the soak factor, in the direction that
      makes the fold the more conservative of the two.

    Both sheets, since rows 31-44 are numerically identical between them. An earlier draft of
    this test claimed all 18 were exact, which was wrong in the interesting
    direction -- it would have made the stage-1 divergence look like a bug rather
    than the finding it is.
    """
    exact = 0
    explained = 0
    for stack, tag in ((m2, "M2"), (m1, "M1")):
        for stage in STAGE_IDS:
            row = WORKBOOK_ROW[("upper_seat", stage)]
            for group, delta_t in (("cold", -40.0), ("room", 0.0), ("hot", 52.0)):
                result = stack.check(f"upper_seat__{stage}__{group}")
                widening = 0.05 * thermal_factor(10.3, delta_t)   # 214959-002 bore +-0.025
                for corner, attribute in CORNER_TO_INTERVAL.items():
                    cell = WORKBOOK_COLUMN[(group, corner)]
                    workbook = -CACHED[tag][row][cell]   # the workbook signs fits the other way
                    mine = getattr(result.interval, attribute)
                    if stage == "sleeve_to_bearing" or corner == "nom":
                        assert mine == pytest.approx(workbook, abs=TOL), (
                            f"{tag}!{cell}{row} ({stage}/{group}/{corner}) should be exact")
                        exact += 1
                    else:
                        offset = -widening if corner == "lmc" else +widening
                        assert mine == pytest.approx(workbook + offset, abs=TOL), (
                            f"{tag}!{cell}{row} ({stage}/{group}/{corner})")
                        explained += 1
    assert (exact, explained) == (24, 12)


def test_stage_two_worst_case_equals_the_workbooks_coherent_corners_exactly(m2, m1):
    """Not a coincidence, and worth knowing *why* it holds.

    Stage 2's weights are ``+f_b`` on the bearing OD, ``-(1-k)f_s`` on the sleeve
    bore, ``+2k f_s`` on the wall and ``-k f_h`` on the hub bore. The loose
    direction wants the bearing OD small, the sleeve bore large, the wall thin and
    the hub bore large -- and LMC delivers all four at once. So an independent
    worst-case fold and a coherent least-material corner coincide.
    """
    for stack in (m2, m1):
        for chain in ("lower_seat", "upper_seat"):
            for group in ("cold", "room", "hot"):
                result = stack.check(f"{chain}__sleeve_to_bearing__{group}")
                lmc = workbook_corner(stack, chain, "sleeve_to_bearing", group, "lmc")
                mmc = workbook_corner(stack, chain, "sleeve_to_bearing", group, "mmc")
                assert result.interval.min == pytest.approx(lmc, abs=TOL)
                assert result.interval.max == pytest.approx(mmc, abs=TOL)


def test_stage_one_worst_case_is_wider_than_the_coherent_corners_by_the_sleeve_bore_band(m2, m1):
    """0.05003 mm at hot, every chain, every sheet -- and the number is derivable.

    Stage 1 puts the sleeve bore and the wall on the SAME sign, while a
    least-material sleeve has a *larger* bore and a *thinner* wall. So the loosest
    real sleeve OD is smallest-bore-with-thinnest-wall, which no single material
    column contains. The gap is the full width of the sleeve bore's tolerance
    (2 x 0.025) scaled by the soak factor, and nothing else -- the wall's own limit
    is the same in both methods.
    """
    for stack in (m2, m1):
        for chain in ("lower_seat", "upper_seat"):
            bore = stack.element(f"sleeve_bore_{chain.split('_')[0]}")
            band = bore.max - bore.min
            assert band == pytest.approx(0.05, abs=1e-12)   # +/-0.025 on both sleeve drawings
            for group, delta_t in (("cold", -40.0), ("room", 0.0), ("hot", 52.0)):
                expected = band * thermal_factor(10.3, delta_t)
                result = stack.check(f"{chain}__hub_to_sleeve__{group}")
                lmc = workbook_corner(stack, chain, "hub_to_sleeve", group, "lmc")
                mmc = workbook_corner(stack, chain, "hub_to_sleeve", group, "mmc")
                assert lmc - result.interval.min == pytest.approx(expected, abs=TOL)
                assert result.interval.max - mmc == pytest.approx(expected, abs=TOL)
    # the headline value, spelled out
    assert 0.05 * thermal_factor(10.3, 52.0) == pytest.approx(0.0500268, abs=1e-7)


def test_the_nominal_column_never_diverges_by_method(m2, m1):
    """Only the corners differ. At nominal there is one point and both agree."""
    for stack in (m2, m1):
        for chain in ("lower_seat", "upper_seat"):
            for stage in STAGE_IDS:
                for group in ("cold", "room", "hot"):
                    result = stack.check(f"{chain}__{stage}__{group}")
                    nominal = workbook_corner(stack, chain, stage, group, "nom")
                    assert result.interval.nominal == pytest.approx(nominal, abs=TOL)


def test_every_lower_seat_divergence_from_the_workbook_is_one_of_three_named_causes(m2, m1):
    """No unexplained deltas. Each of the three causes is a recorded finding.

    1. **wall drift** -- 214955-004 prints 1.190 ±0.025 where the workbook's C15 is
       1.18 (M2 only; the M1 sleeve has no drawing so no drift is possible).
       Enters stage 1 at 2x and stage 2 at 2k.
    2. **bearing nominal** -- the drawing's basic size is ⌀200.000 (0/-0.020) and the
       workbook transcribes 199.980, its own LMC. Affects the nominal column only.
    3. **method** -- the stage-1 corner widening above, +-band*f_s.
    4. **the M1 row-18 slip** -- M1 only, LMC column only: the workbook builds the
       LMC sleeve OD from the MMC column, so its cell is 0.05 too tight at stage 1
       and (1-k)*0.05 too tight at stage 2.
    """
    f_sleeve = {"cold": thermal_factor(10.3, -40.0), "room": 1.0,
                "hot": thermal_factor(10.3, 52.0)}
    f_bearing = {"cold": thermal_factor(11.9, -40.0), "room": 1.0,
                 "hot": thermal_factor(11.9, 52.0)}
    wall_drift = 0.010                  # 1.190 (214955-004 sh1 G8) - 1.18 (M2!C15)
    bearing_nominal_drift = 0.020       # 200.000 (214589-002 sh1 F5) - 199.98 (M2!C24)
    band = 0.05                         # the sleeve bore's full tolerance width
    slip = 0.05                         # M1!D18 built from E17 + 2*E15

    for stack, tag in ((m2, "M2"), (m1, "M1")):
        k = 0.8                          # lower seat, M2!C21 / M1!C21
        drift = wall_drift if tag == "M2" else 0.0
        for stage in STAGE_IDS:
            row = WORKBOOK_ROW[("lower_seat", stage)]
            for group in ("cold", "room", "hot"):
                result = stack.check(f"lower_seat__{stage}__{group}")
                for corner, attribute in CORNER_TO_INTERVAL.items():
                    cell = WORKBOOK_COLUMN[(group, corner)]
                    mine = getattr(result.interval, attribute)
                    delta = mine - (-CACHED[tag][row][cell])

                    if stage == "hub_to_sleeve":
                        expected = 2 * drift * f_sleeve[group]
                        if corner == "lmc":
                            expected -= band * f_sleeve[group]
                            if tag == "M1":
                                # the slip is 0.05 of room-temperature sleeve, and the
                                # workbook's hot/cold cells soak it like everything else
                                expected -= slip * f_sleeve[group]
                        elif corner == "mmc":
                            expected += band * f_sleeve[group]
                    else:
                        expected = 2 * k * drift * f_sleeve[group]
                        if corner == "nom":
                            expected += bearing_nominal_drift * f_bearing[group]
                        if corner == "lmc" and tag == "M1":
                            expected += (1 - k) * slip * f_sleeve[group]
                    assert delta == pytest.approx(expected, abs=1e-7), (
                        f"{tag}!{cell}{row} ({stage}/{group}/{corner}): "
                        f"delta {delta:+.7f}, accounted {expected:+.7f}")


def test_the_lower_sleeve_wall_takes_the_drawing_not_the_workbook(m2):
    """``[drift]``, and the stack takes the drawing. 0.010 mm, and it decides a verdict.

    A mismatch against the drawings is a finding, never a transcription to
    reconcile away (SOP Step 6). Here the direction matters more than usual: the
    extra 0.010 mm of wall is worth 0.020 mm of diametral interference, and it is
    the entire reason the M2 lower seat's hot loose corner reads +0.0162
    (interference) instead of -0.0039 (a clearance).
    """
    wall = m2.element("sleeve_wall_lower")
    assert wall.nominal == 1.19                                  # 214955-004 sh1 G8
    assert (wall.min, wall.max) == (1.165, 1.215)
    assert wall.source_ref.kind == "drawing"
    assert wall.source_ref.document == "214955-004"
    assert wall.source_ref.confidence == "traced"
    assert "1.18" in wall.source_ref.note and "DRIFT" in wall.source_ref.note

    hot = m2.check("lower_seat__hub_to_sleeve__hot")
    assert hot.interval.min == pytest.approx(0.0161567, abs=1e-7)
    assert hot.verdict == "pass"
    # and what it would read on the workbook's 1.18 -- computed, not asserted from
    # the stack, so this stays a statement about the counterfactual
    counterfactual = hot.interval.min - 2 * 0.010 * thermal_factor(10.3, 52.0)
    assert counterfactual == pytest.approx(-0.0038540, abs=1e-7)
    assert counterfactual < 0 < hot.interval.min, (
        "the drawing's extra wall is what keeps this corner in interference")


def test_the_lower_bearing_nominal_takes_the_drawings_basic_size(m2):
    """``nominal`` is transcribed, and two documents transcribe it differently.

    The drawing prints ⌀200.000 0/-0.020, so the basic size is 200.000. The workbook
    puts 199.980 in its nominal column -- the band's own minimum. Both sit inside
    the band and ``min <= nominal <= max`` holds for both; the stack cites the
    drawing, so it takes 200.000, and the 0.020 shows up in every nominal-column
    comparison. Recorded, not reconciled.
    """
    bearing = m2.element("bearing_od_lower")
    assert bearing.nominal == 200.0                              # 214589-002 sh1 F5
    assert (bearing.min, bearing.max) == (199.98, 200.0)
    assert bearing.min <= bearing.nominal <= bearing.max
    assert CACHED["M2"][24]["C"] == 199.98                       # the workbook's choice
    assert bearing.nominal - CACHED["M2"][24]["C"] == pytest.approx(0.020, abs=1e-12)
    # the upper bearing has no such divergence: drawing basic size and workbook agree
    assert m2.element("bearing_od_upper").nominal == CACHED["M2"][42]["C"] == 130.0


# ---------------------------------------------------------------------------
# Results and verdicts
# ---------------------------------------------------------------------------


def test_the_governing_corner_is_hot_and_loose_for_every_chain(m2, m1):
    """Every non-passing verdict in both stacks is at hot. Not one is at cold."""
    for stack in (m2, m1):
        results = {r.check_id: r for r in stack.all_checks()}
        for check_id, result in results.items():
            if result.verdict != "pass":
                assert result.configuration["temperature"] == "hot", check_id
        for chain in ("lower_seat", "upper_seat"):
            for stage in STAGE_IDS:
                cold = results[f"{chain}__{stage}__cold"].interval
                room = results[f"{chain}__{stage}__room"].interval
                hot = results[f"{chain}__{stage}__hot"].interval
                assert hot.min < room.min < cold.min, f"{stack.id} {chain} {stage}"


def test_m2_verdicts(m2):
    """The M2/TC intent design. The lower seat passes; the UPPER seat does not.

    ``marginal`` is the informative answer here and it is the right one: nominal
    interference exists, the loosest corner's does not, so no single build is
    guaranteed to hold. The upper seat is also the seat the M2 change did **not**
    touch.
    """
    verdicts = {r.check_id: r.verdict for r in m2.all_checks()
                if r.configuration.get("sensitivity") != "true"}
    assert verdicts == {
        "lower_seat__hub_to_sleeve__cold": "pass",
        "lower_seat__hub_to_sleeve__room": "pass",
        "lower_seat__hub_to_sleeve__hot": "pass",
        "lower_seat__sleeve_to_bearing__cold": "pass",
        "lower_seat__sleeve_to_bearing__room": "pass",
        "lower_seat__sleeve_to_bearing__hot": "pass",
        "upper_seat__hub_to_sleeve__cold": "pass",
        "upper_seat__hub_to_sleeve__room": "pass",
        "upper_seat__hub_to_sleeve__hot": "marginal",
        "upper_seat__sleeve_to_bearing__cold": "pass",
        "upper_seat__sleeve_to_bearing__room": "pass",
        "upper_seat__sleeve_to_bearing__hot": "marginal",
    }
    # the two binding numbers, at full precision
    assert m2.check("upper_seat__hub_to_sleeve__hot").interval.min == pytest.approx(
        -0.0644947, abs=1e-7)
    assert m2.check("upper_seat__sleeve_to_bearing__hot").interval.min == pytest.approx(
        -0.0042069, abs=1e-7)
    # and the second of those IS the workbook's own H43, negated -- the workbook
    # already reported this clearance and the method difference does not touch it
    assert m2.check("upper_seat__sleeve_to_bearing__hot").interval.min == pytest.approx(
        -CACHED["M2"][43]["H"], abs=TOL)


def test_m1_verdicts_are_worse_than_m2s_which_is_the_point_of_the_control(m1, m2):
    """M1 fails where M2 passes, on the seat the M2 change addressed.

    ``fail`` on the M1 lower seat's stage 2 means even the NOMINAL build has a
    clearance -- not a tolerance-stackup edge case, a clearance at the middle of
    every band. That is the configuration that slipped.
    """
    verdicts = {r.check_id: r.verdict for r in m1.all_checks()
                if r.configuration.get("sensitivity") != "true"}
    assert verdicts["lower_seat__sleeve_to_bearing__hot"] == "fail"
    assert verdicts["lower_seat__hub_to_sleeve__hot"] == "marginal"
    assert m1.check("lower_seat__sleeve_to_bearing__hot").interval.nominal < 0

    # M2 improved the lower seat at every corner and left the upper seat untouched
    for stage in STAGE_IDS:
        for group in ("cold", "room", "hot"):
            lower_m1 = m1.check(f"lower_seat__{stage}__{group}").interval
            lower_m2 = m2.check(f"lower_seat__{stage}__{group}").interval
            assert lower_m2.min > lower_m1.min, f"lower {stage} {group}"
            upper_m1 = m1.check(f"upper_seat__{stage}__{group}").interval
            upper_m2 = m2.check(f"upper_seat__{stage}__{group}").interval
            assert upper_m2.min == pytest.approx(upper_m1.min, abs=1e-15)
            assert upper_m2.max == pytest.approx(upper_m1.max, abs=1e-15)


def test_the_upper_seat_is_the_same_joint_in_both_configurations(m2, m1):
    """Element for element, so 'M2 fixed it' is true only of the lower seat."""
    for suffix in ("hub_bore_upper", "sleeve_bore_upper",
                   "sleeve_wall_upper", "bearing_od_upper"):
        a, b = m2.element(suffix), m1.element(suffix)
        assert (a.nominal, a.min, a.max, a.lmc, a.mmc) == (b.nominal, b.min, b.max, b.lmc, b.mmc)
    # and the workbook agrees: rows 31-44 are numerically identical between the
    # sheets (CACHED is the numeric cells; the comment column O does differ)
    for row in range(31, 45):
        assert CACHED["M2"][row] == CACHED["M1"][row]


def test_the_stiffness_ratio_moves_stage_two_but_never_stage_one(m2):
    """``k`` is the biggest unsourced number in the model, so its reach is pinned.

    Stage 1 has no ``k`` term at all -- the hub-to-sleeve interference is settled
    before anything is redistributed -- so the sensitivity is confined to stage 2.
    Within stage 2 it is worth ~0.03 mm across the full k = 0 to 1 range on the
    lower seat, which is larger than the margin at the hot corner. So a reader
    cannot treat the stage-2 hot numbers as settled while k is an estimate.
    """
    for chain in ("lower_seat", "upper_seat"):
        for group in ("cold", "room", "hot"):
            terms = m2.terms(next(c for c in m2.checks
                                  if c["check_id"] == f"{chain}__hub_to_sleeve__{group}")["terms"])
            assert len(terms) == 3, "stage 1 has no stiffness term"

    baseline = m2.check("lower_seat__sleeve_to_bearing__hot").interval.min
    at_zero = m2.check("lower_seat__sleeve_to_bearing__hot__k0").interval.min
    at_one = m2.check("lower_seat__sleeve_to_bearing__hot__k1").interval.min
    assert at_zero == pytest.approx(-0.0283858, abs=1e-7)
    assert at_one == pytest.approx(0.0377977, abs=1e-7)
    assert at_zero < baseline < at_one
    assert at_one - at_zero == pytest.approx(0.0661835, abs=1e-7)
    # k = 0 flips the lower seat's stage-2 verdict, so the estimate is load-bearing
    assert m2.check("lower_seat__sleeve_to_bearing__hot").verdict == "pass"
    assert m2.check("lower_seat__sleeve_to_bearing__hot__k0").verdict == "marginal"


# ---------------------------------------------------------------------------
# Structure and provenance hygiene
# ---------------------------------------------------------------------------


def test_the_diametral_wall_term_is_one_element_at_coefficient_two_not_two_terms(m2):
    """The RSS consequence, on the real stack rather than a synthetic element.

    Listing the wall twice gives the *same worst case* and a smaller RSS
    half-range: the wall's own contribution drops from ``2h`` to ``sqrt(2) h``,
    which pulls this check's total from 0.0584 to 0.0465 mm -- 20% understated.
    The two walls across a diameter are one turned dimension, so the correlated
    treatment is the correct one, and it is also the conservative one, which is the
    direction to be wrong in.
    """
    check = next(c for c in m2.checks if c["check_id"] == "upper_seat__hub_to_sleeve__room")
    terms = m2.terms(check["terms"])
    wall_terms = [t for t in terms if t.element.id == "sleeve_wall_upper"]
    assert len(wall_terms) == 1 and wall_terms[0].coefficient == 2.0

    as_two = [t for t in terms if t.element.id != "sleeve_wall_upper"]
    as_two += [Term(m2.element("sleeve_wall_upper")), Term(m2.element("sleeve_wall_upper"))]
    correlated = fold(terms)
    independent = fold(as_two)
    assert independent.min == pytest.approx(correlated.min, abs=1e-12)
    assert independent.max == pytest.approx(correlated.max, abs=1e-12)
    assert independent.rss_half < correlated.rss_half
    # room temperature, so every coefficient is exactly 1 or 2 and these are closed
    # form: sqrt(.025^2 + .050^2 + .017^2) against sqrt(.025^2 + .025^2 + .025^2 + .017^2)
    assert correlated.rss_half == pytest.approx(0.0584294, abs=1e-7)
    assert independent.rss_half == pytest.approx(0.0465188, abs=1e-7)
    assert (0.025 ** 2 + 0.050 ** 2 + 0.017 ** 2) ** 0.5 == pytest.approx(
        correlated.rss_half, abs=1e-12)


def test_max_equals_mmc_only_where_the_feature_direction_says_so(m2, m1):
    """The review checklist's smell test, and this stack legitimately fails it.

    ``max == mmc`` on every element is a smell. Here four of eight elements have
    ``max == lmc`` instead, because a bore's least-material condition is its
    *larger* size -- so the pattern is mixed, and it is mixed the right way round.
    """
    for stack in (m2, m1):
        internal = {e.id for e in stack.elements if e.max == e.lmc}
        external = {e.id for e in stack.elements if e.max == e.mmc}
        assert internal == {"hub_bore_lower", "hub_bore_upper",
                            "sleeve_bore_lower", "sleeve_bore_upper"}, stack.id
        assert external == {"sleeve_wall_lower", "sleeve_wall_upper",
                            "bearing_od_lower", "bearing_od_upper"}, stack.id
        assert internal | external == {e.id for e in stack.elements}
        for element in stack.elements:
            assert element.min <= element.nominal <= element.max, element.id


def test_the_traced_inferred_untraced_ratio(m2, m1):
    """The headline of the stack, as a count. Not a footnote.

    M2: 8 of 8 traced -- every element to a released part drawing in
    ``data/inbox/drawings/``. M1: 4 traced (the unchanged upper sleeve and both
    bearings), 2 inferred (the hub bores, on a later revision of the same drawing),
    2 untraced (the M1 lower sleeve, whose drawing this repo does not hold).

    A high traced count is a reason to audit harder, not to relax -- so note what
    is NOT in that count: not one CTE, not one temperature, and neither stiffness
    ratio. Those are the numbers a reviewer should spend their time on.
    """
    m2_counts = {}
    for element in m2.elements:
        m2_counts[element.source_ref.confidence] = m2_counts.get(
            element.source_ref.confidence, 0) + 1
    assert m2_counts == {"traced": 8}

    m1_counts = {}
    for element in m1.elements:
        m1_counts[element.source_ref.confidence] = m1_counts.get(
            element.source_ref.confidence, 0) + 1
    assert m1_counts == {"traced": 4, "inferred": 2, "untraced": 2}

    untraced = {e.id for e in m1.elements if e.source_ref.confidence == "untraced"}
    assert untraced == {"sleeve_bore_lower", "sleeve_wall_lower"}
    for element_id in untraced:
        note = m1.element(element_id).source_ref.note
        assert "UNTRACED AND LISTED AS A GAP" in note, element_id

    # every value NOT counted above, and where it actually lives
    for stack in (m2, m1):
        for material in stack.materials.values():
            assert material.values_source.confidence == "untraced"
        raw = json.loads(
            (STACKS_DIR / f"stack_{stack.id}.json").read_text(encoding="utf-8"))
        assert raw["thermal_fit"]["temperature_source"]["confidence"] == "untraced"
        for chain in raw["thermal_fit"]["chains"]:
            assert chain["stiffness_ratio"]["source_ref"]["confidence"] == "untraced"


def test_every_hardware_ref_in_the_thermal_stacks_resolves(m2, m1):
    entries = json.loads(
        (STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))["entries"]
    known = {e["id"] for e in entries}
    for stack in (m2, m1):
        referenced = {e.hardware_ref for e in stack.elements if e.hardware_ref}
        assert referenced == {"214589-002", "214588-002"}
        assert referenced <= known
        for entry_id in referenced:
            entry = next(e for e in entries if e["id"] == entry_id)
            assert f"{stack.id}:" in " ".join(entry["used_by"])
            assert entry["values_source"]["confidence"] == "traced"
            assert entry["values_source"]["kind"] == "drawing"


def test_the_scope_boundary_is_recorded_as_a_decision_not_a_gap(m2, m1):
    """The bearing bore to spindle fit is EXCLUDED, and both bores are in hand.

    Jeff, 2026-08-05: a separate team owns that joint. So the drawings' bore limits
    are transcribed into the hardware entries (traced, for whoever sweeps that joint
    in later) and deliberately not modelled. A reader must be able to tell that
    omission from an oversight, which is what this asserts.
    """
    for stack in (m2, m1):
        scope = " ".join(stack.joint["out_of_scope"])
        assert "scope boundary" in scope.lower()
        assert "separate team" in scope
        for phrase in ("axial", "roughness", "hoop stress" if stack is m2 else "axial"):
            assert phrase in scope.lower(), (stack.id, phrase)
    entries = json.loads(
        (STACKS_DIR / "hardware_entries.json").read_text(encoding="utf-8"))["entries"]
    for entry_id, bore in (("214589-002", 160.0), ("214588-002", 95.0)):
        entry = next(e for e in entries if e["id"] == entry_id)
        assert entry["dimensions_mm"]["bore"] == bore
        assert any("DELIBERATELY UNUSED" in gap for gap in entry["gaps"])
        assert any("scope" in gap.lower() for gap in entry["gaps"])


def test_the_expanded_terms_table_covers_every_generated_term(m2, m1):
    """The generated term lists are not readable in the JSON; this is the payback.

    ``tests/debug_report_thermal_fit.py --terms --markdown`` pastes into the
    worksheet, so every sign and every weight stays on a page a reviewer reads.
    """
    for stack in (m2, m1):
        rows = expanded_terms_table(stack)
        assert len(rows) == sum(len(c["terms"]) for c in stack.checks)
        # 12 primary checks: 6 stage-1 (3 terms) + 6 stage-2 (4 terms) = 42;
        # plus per chain a k=0 check (2 terms) and a k=1 check (3 terms) = 10.
        assert len(rows) == 52, stack.id
        for row in rows:
            assert row["sign"] in (1, -1)
            assert row["coefficient"] > 0
            assert row["weight"] == row["sign"] * row["coefficient"]


def test_thermal_fit_spec_rejects_a_reference_temperature_it_does_not_list():
    raw = json.loads(
        (STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json").read_text(encoding="utf-8"))
    spec = dict(raw["thermal_fit"], reference_temperature_c=25.0)
    with pytest.raises(ValueError, match="must appear in temperatures_c"):
        ThermalFitSpec.from_dict(spec)


def test_thermal_fit_spec_rejects_a_stiffness_ratio_outside_zero_to_one():
    raw = json.loads(
        (STACKS_DIR / "stack_hub_bearing_thermal_fit_m2.json").read_text(encoding="utf-8"))
    spec = json.loads(json.dumps(raw["thermal_fit"]))
    spec["chains"][0]["stiffness_ratio"]["value"] = 1.5
    with pytest.raises(ValueError, match="not a fraction"):
        ThermalFitSpec.from_dict(spec)
