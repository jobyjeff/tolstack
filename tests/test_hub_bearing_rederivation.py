"""Re-derive every computed cell of ``260209_Hub Bearing Fits.xlsx``.

This is the slice-1 discipline applied to the second source workbook (SOP
Step 6 section 5, and the ``hub_bearing_thermal_stack`` handoff's deliverable 1):
before any of the workbook's *conclusions* are trusted, every one of its formula
cells is recomputed here from its inputs and compared against the value Excel
cached in the file.

**427 formula cells** -- 206 on the M2 sheet, 205 on M1, 16 on ``Decision
Matrix`` -- re-derive with a worst delta of **2.9e-14**, which is float
summation order. One of them is a genuine authoring error and is pinned as such
(:func:`test_m1_lower_lmc_sleeve_od_is_a_workbook_slip`).

Why the cached values are committed here rather than read from the workbook
--------------------------------------------------------------------------
``data/`` is gitignored, so from a worktree the workbook does not exist at all
(SOP trap 15), and unlike the 260729 workbook this one has **no immutable forge
upstream** to re-copy from -- see ``data/inbox/tolerance_stacks/PROVENANCE.md``.
So :data:`CACHED` holds every value this file checks, transcribed from the
workbook on 2026-08-05, and the suite runs anywhere. The address of each number
is its own dict key: ``CACHED["M2"][43]["H"]`` *is* cell ``H43`` of the M2 sheet,
which serves the same purpose as slice 1's ``# JEFF E18`` comments.
:func:`test_committed_cached_table_matches_the_live_workbook` re-reads the real
file when it can be found, and skips when it cannot, so the transcription is
still checked against the source wherever the source is present.

Reading the sheet layout
------------------------
Each of the two shrink sheets holds **two independent two-stage fits**: the
LOWER hub bore in rows 13-26 and the UPPER hub bore in rows 31-44. Nine columns
per row are three fit corners (``C``/``D``/``E`` = nominal / LMC / MMC) times
three temperatures (``C-E`` room, ``G-I`` hot, ``K-M`` cold).

LMC/MMC here are the **loose** and **tight** fit corners respectively, and that
is not a coincidence to be assumed -- it is checked in
:func:`test_lmc_is_the_loose_corner_and_mmc_the_tight_one_everywhere`. Every
feature's material direction happens to line up with the fit direction: a
least-material hub bore is *larger*, a least-material sleeve is *thinner with a
bigger bore*, a least-material bearing is a *smaller* OD, and all three loosen
the fit.
"""

from __future__ import annotations

import math
import zipfile
from pathlib import Path
from typing import Dict

import pytest

REPO = Path(__file__).resolve().parent.parent
WORKBOOK_NAME = "260209_Hub Bearing Fits.xlsx"

#: Where the workbook may be findable. ``data/`` is gitignored, so in a worktree
#: only the second of these exists.
WORKBOOK_CANDIDATES = (
    REPO / "data" / "inbox" / "tolerance_stacks" / WORKBOOK_NAME,
    Path(r"C:\workspace\tolstack\data\inbox\tolerance_stacks") / WORKBOOK_NAME,
)

SHEET_NAMES = {
    "M2": "260209_Hub wear ring shrink M2",
    "M1": "260209_Hub wear ring shrink M1",
    "DM": "Decision Matrix",
}

# ---------------------------------------------------------------------------
# The workbook's inputs, by cell. Identical on both shrink sheets.
# ---------------------------------------------------------------------------

T_ROOM = 20.0          # C4
T_HOT = 72.0           # C7  ("Max seen in whirly temp at spindle bearing temp
                       #       sensor was 72C" -- D7 on the M1 sheet)
T_COLD = -20.0         # C8
CTE_HUB = 23.04        # C5, "Hub CTE (aluminum)",        1e-6 / degC
CTE_SLEEVE = 10.3      # C6, "Wear ring CTE: (AISI420)",  1e-6 / degC
CTE_BEARING = 11.9     # C9, "bearing CTE (52100)",       1e-6 / degC

#: (temperature group, fit corner) -> column letter.
COLUMNS = {
    ("room", "nom"): "C", ("room", "lmc"): "D", ("room", "mmc"): "E",
    ("hot", "nom"): "G", ("hot", "lmc"): "H", ("hot", "mmc"): "I",
    ("cold", "nom"): "K", ("cold", "lmc"): "L", ("cold", "mmc"): "M",
}
GROUPS = ("room", "hot", "cold")
CORNERS = ("nom", "lmc", "mmc")
GROUP_TEMPERATURE = {"room": T_ROOM, "hot": T_HOT, "cold": T_COLD}

#: quantity -> row offset from the section's first row (13 lower, 31 upper).
ROW_OFFSETS = {
    "hub_bore": 0,      # "lower hub bore:" / "hub bore:"
    "wall": 2,          # "wear ring thickness"
    "sleeve_id": 4,     # "wear ring ID"
    "sleeve_od": 5,     # "wear ring OD"        = ID + 2 * wall
    "fit_1": 6,         # "wear ring fit, hub to wear ring (negative is inx)"
    "fraction_1": 7,    # "inx fraction"
    "stiffness": 8,     # "stiffness ratio"     (a pass-through of C21 / C39)
    "od_installed": 9,  # "hub id/wear ring od after install"
    "id_installed": 10, # "wear ring ID after install"
    "bearing_od": 11,   # "bearing od"
    "fit_2": 12,        # "bearing fit, bearing to wear ring (negative is inx)"
    "fraction_2": 13,   # "inx fraction"
}


def thermal_factor(cte_1e6_per_c: float, group: str) -> float:
    """The workbook's isothermal soak factor, ``1 + dT * alpha / 1e6``.

    Cell ``G13`` is the canonical instance:
    ``=C13*(1+($C$7-$C$4)*$C$5/1000000)``.
    """
    return 1.0 + (GROUP_TEMPERATURE[group] - T_ROOM) * cte_1e6_per_c / 1_000_000.0


def rederive_section(
    *,
    hub_bore: float,
    hub_bore_tol: float,
    wall: float,
    wall_tol: float,
    sleeve_id: float,
    sleeve_id_tol: float,
    bearing_od: Dict[str, float],
    stiffness: float,
    lmc_sleeve_od_uses_mmc: bool = False,
) -> Dict[tuple, Dict[str, float]]:
    """Recompute one hub-bore section's 9 corners x 12 quantities.

    Written from the workbook's formulas, **not** by replaying its formula
    strings: rows 17, 18, 21, 35, 36 and 39 use Excel *shared* formulas in the
    hot and cold column groups, which carry no formula text of their own (SOP
    trap 13), so those cells can only be checked by inferring the pattern and
    testing it -- which is what this function is.

    ``lmc_sleeve_od_uses_mmc`` reproduces the M1 lower section's authoring
    error; see :func:`test_m1_lower_lmc_sleeve_od_is_a_workbook_slip`.
    """
    # Row 13/31: an internal feature, so LMC is the LARGER bore.
    bore = {"nom": hub_bore, "lmc": hub_bore + hub_bore_tol, "mmc": hub_bore - hub_bore_tol}
    # Row 15/33: wall thickness. D14 = -tol, E14 = +tol, so LMC is THINNER.
    thickness = {"nom": wall, "lmc": wall - wall_tol, "mmc": wall + wall_tol}
    # Row 17/35: the sleeve bore. D17 = C17 + tol, E17 = C17 - tol -- internal
    # again, so LMC is the larger bore.
    bore_sleeve = {"nom": sleeve_id, "lmc": sleeve_id + sleeve_id_tol,
                   "mmc": sleeve_id - sleeve_id_tol}

    out: Dict[tuple, Dict[str, float]] = {}
    for group in GROUPS:
        f_hub = thermal_factor(CTE_HUB, group)
        f_sleeve = thermal_factor(CTE_SLEEVE, group)
        f_bearing = thermal_factor(CTE_BEARING, group)
        for corner in CORNERS:
            hb = bore[corner] * f_hub
            wl = thickness[corner] * f_sleeve
            sid = bore_sleeve[corner] * f_sleeve
            od_corner = "mmc" if (lmc_sleeve_od_uses_mmc and corner == "lmc") else corner
            sod = (bore_sleeve[od_corner] * f_sleeve) + 2 * (thickness[od_corner] * f_sleeve)
            bod = bearing_od[corner] * f_bearing

            fit_1 = hb - sod
            od_installed = sod - stiffness * (sod - hb)
            id_installed = od_installed - 2 * wl
            fit_2 = id_installed - bod
            out[(group, corner)] = {
                "hub_bore": hb,
                "wall": wl,
                "sleeve_id": sid,
                "sleeve_od": sod,
                "fit_1": fit_1,
                "fraction_1": fit_1 / hb,
                "stiffness": stiffness,
                "od_installed": od_installed,
                "id_installed": id_installed,
                "bearing_od": bod,
                "fit_2": fit_2,
                "fraction_2": fit_2 / bod,
            }
    return out


#: sheet tag -> section name -> (first row, inputs for :func:`rederive_section`).
#:
#: Every number here is transcribed from an input cell of the workbook. The hub
#: bore, sleeve bore and wall values are cross-checked against the part drawings
#: in ``docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md``; one of them
#: has drifted (M2 lower wall 1.18 vs 214955-004's 1.190).
SECTIONS = {
    ("M2", "lower"): (13, dict(
        hub_bore=202.14, hub_bore_tol=0.015,        # C13, D13/E13
        wall=1.18, wall_tol=0.025,                  # C15, D14/E14
        sleeve_id=200.0, sleeve_id_tol=0.025,       # C17, D16/E16
        bearing_od={"nom": 199.98, "lmc": 199.98, "mmc": 200.0},   # C24/D24/E24
        stiffness=0.8,                              # C21
    )),
    ("M2", "upper"): (31, dict(
        hub_bore=132.073, hub_bore_tol=0.017,       # C31, D31/E31
        wall=1.11, wall_tol=0.025,                  # C33, D32/E32
        sleeve_id=129.968, sleeve_id_tol=0.025,     # C35, D34/E34
        bearing_od={"nom": 130.0, "lmc": 129.991, "mmc": 130.0},   # C42/D42/E42
        stiffness=0.9,                              # C39
    )),
    ("M1", "lower"): (13, dict(
        hub_bore=202.14, hub_bore_tol=0.015,
        wall=1.125, wall_tol=0.025,                 # C15 -- M1's thinner sleeve
        sleeve_id=200.035, sleeve_id_tol=0.025,     # C17 -- and its larger bore
        bearing_od={"nom": 199.98, "lmc": 199.98, "mmc": 200.0},
        stiffness=0.8,
        lmc_sleeve_od_uses_mmc=True,                # D18 = E17 + 2*E15, the slip
    )),
    ("M1", "upper"): (31, dict(
        hub_bore=132.073, hub_bore_tol=0.017,
        wall=1.11, wall_tol=0.025,
        sleeve_id=129.968, sleeve_id_tol=0.025,
        bearing_od={"nom": 130.0, "lmc": 129.991, "mmc": 130.0},
        stiffness=0.9,
    )),
}

# ---------------------------------------------------------------------------
# Every value this file checks, transcribed from the workbook 2026-08-05.
# CACHED[<sheet tag>][<row>][<column letter>] is that cell, verbatim.
# ---------------------------------------------------------------------------

CACHED: Dict[str, Dict[int, Dict[str, float]]] = {
    "M2": {
        4: {"C": 20.0},
        5: {"C": 23.04},
        6: {"C": 10.3},
        7: {"C": 72.0},
        8: {"C": -20.0},
        9: {"C": 11.9},
        13: {"C": 202.14, "D": 202.15499999999997, "E": 202.125, "G": 202.3821798912, "H": 202.39719786239996, "I": 202.36716192, "K": 201.953707776, "L": 201.96869395199997, "M": 201.9387216},
        14: {"D": -0.025, "E": 0.025},
        15: {"C": 1.18, "D": 1.155, "E": 1.2049999999999998, "G": 1.1806320080000001, "H": 1.155618618, "I": 1.205645398, "K": 1.17951384, "L": 1.1545241400000001, "M": 1.20450354},
        16: {"D": 0.025, "E": 0.025},
        17: {"C": 200.0, "D": 200.025, "E": 199.975, "G": 200.10712, "H": 200.13213339000004, "I": 200.08210661, "K": 199.9176, "L": 199.9425897, "M": 199.8926103},
        18: {"C": 202.36, "D": 202.335, "E": 202.385, "G": 202.46838401600002, "H": 202.44337062600002, "I": 202.493397406, "K": 202.27662768000002, "L": 202.25163798000003, "M": 202.30161738},
        19: {"C": -0.22000000000002728, "D": -0.18000000000003524, "E": -0.2599999999999909, "G": -0.0862041248000196, "H": -0.04617276360005462, "I": -0.126235486000013, "K": -0.322919904000031, "L": -0.2829440280000597, "M": -0.36289578000000233},
        20: {"C": -0.001088354605718944, "D": -0.0008904058766789606, "E": -0.0012863327149040984, "G": -0.00042594720961283575, "H": -0.0002281294607223033, "I": -0.0006237943192083533, "K": -0.0015989798234266762, "L": -0.0014009301266626221, "M": -0.0017970589153219751},
        21: {"C": 0.8, "D": 0.8, "E": 0.8, "G": 0.8, "H": 0.8, "I": 0.8, "K": 0.8, "L": 0.8, "M": 0.8},
        22: {"C": 202.184, "D": 202.19099999999997, "E": 202.177, "G": 202.39942071616, "H": 202.40643241511998, "I": 202.3924090172, "K": 202.01829175679998, "L": 202.02528275759997, "M": 202.011300756},
        23: {"C": 199.82399999999998, "D": 199.88099999999997, "E": 199.767, "G": 200.03815670016, "H": 200.09519517911997, "I": 199.9811182212, "K": 199.65926407679999, "L": 199.71623447759995, "M": 199.602293676},
        24: {"C": 199.98, "D": 199.98, "E": 200.0, "G": 200.103747624, "H": 200.103747624, "I": 200.12376, "K": 199.88480951999998, "L": 199.88480951999998, "M": 199.9048},
        25: {"C": -0.1560000000000059, "D": -0.09900000000001796, "E": -0.2330000000000041, "G": -0.06559092384000564, "H": -0.008552444880024268, "I": -0.14264177879999806, "K": -0.2255454431999908, "L": -0.16857504240002186, "M": -0.30250632400000654},
        26: {"C": -0.0007800780078008097, "D": -0.0004950495049505849, "E": -0.0011650000000000204, "G": -0.00032778458484072296, "H": -4.27400535051174e-05, "I": -0.0007127678332647661, "K": -0.0011283771075031256, "L": -0.0008433609477620392, "M": -0.0015132519279177216},
        27: {"I": -0.017838079999989986},
        31: {"C": 132.073, "D": 132.09, "E": 132.056, "G": 132.23123401984, "H": 132.2482543872, "I": 132.21421365248, "K": 131.9512815232, "L": 131.96826585600002, "M": 131.9342971904},
        32: {"D": -0.025, "E": 0.025},
        33: {"C": 1.11, "D": 1.0850000000000002, "E": 1.135, "G": 1.1105945160000001, "H": 1.0855811260000003, "I": 1.1356079060000002, "K": 1.1095426800000001, "L": 1.0845529800000002, "M": 1.13453238},
        34: {"D": 0.025, "E": 0.025},
        35: {"C": 129.968, "D": 129.993, "E": 129.94299999999998, "G": 130.0376108608, "H": 130.0626242508, "I": 130.0125974708, "K": 129.914453184, "L": 129.939442884, "M": 129.88946348399998},
        36: {"C": 132.188, "D": 132.16299999999998, "E": 132.213, "G": 132.2587998928, "H": 132.2337865028, "I": 132.2838132828, "K": 132.133538544, "L": 132.10854884399998, "M": 132.158528244},
        37: {"C": -0.11499999999998067, "D": -0.07299999999997908, "E": -0.15699999999998226, "G": -0.027565872959996796, "H": 0.01446788440000546, "I": -0.06959963031999905, "K": -0.1822570207999945, "L": -0.1402829879999672, "M": -0.2242310535999934},
        38: {"C": -0.0008707305808150088, "D": -0.000552653493829806, "E": -0.0011888895620038639, "G": -0.00020846718375070754, "H": 0.00010939943568287864, "I": -0.0005264156431995959, "K": -0.001381244795018907, "L": -0.001063005466428118, "M": -0.0016995660595849162},
        39: {"C": 0.9, "D": 0.9, "E": 0.9, "G": 0.9, "H": 0.9, "I": 0.9, "K": 0.9, "L": 0.9, "M": 0.9},
        40: {"C": 132.0845, "D": 132.0973, "E": 132.07170000000002, "G": 132.233990607136, "H": 132.24680759876, "I": 132.221173615512, "K": 131.96950722528, "L": 131.9822941548, "M": 131.95672029576},
        41: {"C": 129.8645, "D": 129.9273, "E": 129.8017, "G": 130.012801575136, "H": 130.07564534676, "I": 129.94995780351198, "K": 129.75042186528, "L": 129.8131881948, "M": 129.68765553576},
        42: {"C": 130.0, "D": 129.991, "E": 130.0, "G": 130.080444, "H": 130.07143843080001, "I": 130.080444, "K": 129.93812, "L": 129.929124284, "M": 129.93812},
        43: {"C": -0.1355000000000075, "D": -0.06370000000001141, "E": -0.19829999999998904, "G": -0.06764242486400462, "H": 0.004206915959997559, "I": -0.13048619648802173, "K": -0.18769813471999441, "L": -0.1159360892000052, "M": -0.2504644642399967},
        44: {"C": -0.00104230769230775, "D": -0.0004900339254256942, "E": -0.0015253846153845312, "G": -0.0005200045662821125, "H": 3.234311860274923e-05, "I": -0.0010031192427973395, "K": -0.0014445193967712816, "L": -0.0008923025521713766, "M": -0.0019275672469325914},
    },
    "M1": {
        4: {"C": 20.0},
        5: {"C": 23.04},
        6: {"C": 10.3},
        7: {"C": 72.0},
        8: {"C": -20.0},
        9: {"C": 11.9},
        13: {"C": 202.14, "D": 202.15499999999997, "E": 202.125, "G": 202.3821798912, "H": 202.39719786239996, "I": 202.36716192, "K": 201.953707776, "L": 201.96869395199997, "M": 201.9387216},
        14: {"D": -0.025, "E": 0.025},
        15: {"C": 1.125, "D": 1.1, "E": 1.15, "G": 1.12560255, "H": 1.1005891600000002, "I": 1.15061594, "K": 1.1245365, "L": 1.0995468000000002, "M": 1.1495262},
        16: {"D": 0.025, "E": 0.025},
        17: {"C": 200.035, "D": 200.06, "E": 200.01, "G": 200.142138746, "H": 200.16715213600003, "I": 200.117125356, "K": 199.95258558, "L": 199.97757528, "M": 199.92759587999998},
        18: {"C": 202.285, "D": 202.31, "E": 202.31, "G": 202.39334384600002, "H": 202.41835723600002, "I": 202.41835723600002, "K": 202.20165858000001, "L": 202.22664828, "M": 202.22664828},
        19: {"C": -0.14500000000001023, "D": -0.15500000000002956, "E": -0.18500000000000227, "G": -0.011163954800025522, "H": -0.021159373600056597, "I": -0.05119531600001892, "K": -0.2479508040000269, "L": -0.25795432800003937, "M": -0.2879266799999982},
        20: {"C": -0.0007173246264965382, "D": -0.0007667383938068788, "E": -0.000915275200989498, "G": -5.5162736195584154e-05, "H": -0.0001045438070463892, "I": -0.0002529823293181208, "K": -0.0012277605929129328, "L": -0.0012771995647075135, "M": -0.0014258121360712734},
        21: {"C": 0.8, "D": 0.8, "E": 0.8, "G": 0.8, "H": 0.8, "I": 0.8, "K": 0.8, "L": 0.8, "M": 0.8},
        22: {"C": 202.16899999999998, "D": 202.18599999999998, "E": 202.162, "G": 202.38441268216, "H": 202.40142973711997, "I": 202.3774009832, "K": 202.00329793679998, "L": 202.0202848176, "M": 201.996306936},
        23: {"C": 199.91899999999998, "D": 199.986, "E": 199.862, "G": 200.13320758216, "H": 200.20025141711997, "I": 200.07616910320002, "K": 199.75422493679997, "L": 199.8211912176, "M": 199.697254536},
        24: {"C": 199.98, "D": 199.98, "E": 200.0, "G": 200.103747624, "H": 200.103747624, "I": 200.12376, "K": 199.88480951999998, "L": 199.88480951999998, "M": 199.9048},
        25: {"C": -0.06100000000000705, "D": 0.006000000000000227, "E": -0.13800000000000523, "G": 0.029459958160003907, "H": 0.09650379311997881, "I": -0.047590896799988514, "K": -0.13058458320000454, "L": -0.06361830239998767, "M": -0.20754546399999185},
        26: {"C": -0.0003050305030503403, "D": 3.0003000300031142e-05, "E": -0.0006900000000000261, "G": 0.00014722342039970144, "H": 0.0004822687943921564, "I": -0.00023780732882486573, "K": -0.0006532991852336761, "L": -0.00031827482314819014, "M": -0.0010382215134403568},
        31: {"C": 132.073, "D": 132.09, "E": 132.056, "G": 132.23123401984, "H": 132.2482543872, "I": 132.21421365248, "K": 131.9512815232, "L": 131.96826585600002, "M": 131.9342971904},
        32: {"D": -0.025, "E": 0.025},
        33: {"C": 1.11, "D": 1.0850000000000002, "E": 1.135, "G": 1.1105945160000001, "H": 1.0855811260000003, "I": 1.1356079060000002, "K": 1.1095426800000001, "L": 1.0845529800000002, "M": 1.13453238},
        34: {"D": 0.025, "E": 0.025},
        35: {"C": 129.968, "D": 129.993, "E": 129.94299999999998, "G": 130.0376108608, "H": 130.0626242508, "I": 130.0125974708, "K": 129.914453184, "L": 129.939442884, "M": 129.88946348399998},
        36: {"C": 132.188, "D": 132.16299999999998, "E": 132.213, "G": 132.2587998928, "H": 132.2337865028, "I": 132.2838132828, "K": 132.133538544, "L": 132.10854884399998, "M": 132.158528244},
        37: {"C": -0.11499999999998067, "D": -0.07299999999997908, "E": -0.15699999999998226, "G": -0.027565872959996796, "H": 0.01446788440000546, "I": -0.06959963031999905, "K": -0.1822570207999945, "L": -0.1402829879999672, "M": -0.2242310535999934},
        38: {"C": -0.0008707305808150088, "D": -0.000552653493829806, "E": -0.0011888895620038639, "G": -0.00020846718375070754, "H": 0.00010939943568287864, "I": -0.0005264156431995959, "K": -0.001381244795018907, "L": -0.001063005466428118, "M": -0.0016995660595849162},
        39: {"C": 0.9, "D": 0.9, "E": 0.9, "G": 0.9, "H": 0.9, "I": 0.9, "K": 0.9, "L": 0.9, "M": 0.9},
        40: {"C": 132.0845, "D": 132.0973, "E": 132.07170000000002, "G": 132.233990607136, "H": 132.24680759876, "I": 132.221173615512, "K": 131.96950722528, "L": 131.9822941548, "M": 131.95672029576},
        41: {"C": 129.8645, "D": 129.9273, "E": 129.8017, "G": 130.012801575136, "H": 130.07564534676, "I": 129.94995780351198, "K": 129.75042186528, "L": 129.8131881948, "M": 129.68765553576},
        42: {"C": 130.0, "D": 129.991, "E": 130.0, "G": 130.080444, "H": 130.07143843080001, "I": 130.080444, "K": 129.93812, "L": 129.929124284, "M": 129.93812},
        43: {"C": -0.1355000000000075, "D": -0.06370000000001141, "E": -0.19829999999998904, "G": -0.06764242486400462, "H": 0.004206915959997559, "I": -0.13048619648802173, "K": -0.18769813471999441, "L": -0.1159360892000052, "M": -0.2504644642399967},
        44: {"C": -0.00104230769230775, "D": -0.0004900339254256942, "E": -0.0015253846153845312, "G": -0.0005200045662821125, "H": 3.234311860274923e-05, "I": -0.0010031192427973395, "K": -0.0014445193967712816, "L": -0.0008923025521713766, "M": -0.0019275672469325914},
    },
    # 'Decision Matrix': schedule-impact arithmetic in weeks. No dimensions, so
    # it contributes nothing to the stack -- re-derived only so that "every
    # computed cell in the workbook" is literally true.
    "DM": {
        8: {"C": 8.0},      # whirly lead time per iteration, weeks
        9: {"C": 12.0},     # fatigue test lead time, weeks
        10: {"C": 1.0},     # include initial whirly (sunk cost): 0 or 1
        15: {"E": 8.0, "F": 16.0, "G": 20.0, "H": 20.0},
        17: {"E": 8.0, "F": 8.0, "G": 20.0, "H": 20.0},
        19: {"E": 12.0, "F": 16.0, "G": 12.0, "H": 16.0},
        21: {"E": 16.0, "F": 12.0, "G": 12.0, "H": 12.0},
    },
}

#: float-summation-order tolerance. The worst observed delta over all 427
#: formula cells is 2.842e-14 (on ``M1!H18``, the longest chain in the file);
#: this leaves ~35x headroom without admitting a real disagreement.
TOL = 1e-12


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def find_workbook() -> Path | None:
    for candidate in WORKBOOK_CANDIDATES:
        if candidate.exists():
            return candidate
    return None


def rederived() -> Dict[tuple, Dict[tuple, Dict[str, float]]]:
    """(sheet tag, section) -> corner -> quantity -> value."""
    return {key: rederive_section(**spec) for key, (_row, spec) in SECTIONS.items()}


def all_checked_cells():
    """Yield (sheet tag, cell, model value) for every shrink-sheet grid cell."""
    models = rederived()
    for (tag, section), (first_row, _spec) in SECTIONS.items():
        model = models[(tag, section)]
        for group in GROUPS:
            for corner in CORNERS:
                letter = COLUMNS[(group, corner)]
                for quantity, offset in ROW_OFFSETS.items():
                    row = first_row + offset
                    yield tag, f"{letter}{row}", row, letter, model[(group, corner)][quantity]


# ---------------------------------------------------------------------------
# the re-derivation
# ---------------------------------------------------------------------------


def test_every_shrink_sheet_cell_rederives_from_the_workbooks_own_inputs():
    """432 grid cells, both sheets, both bores, all 9 corners, zero mismatches."""
    checked = 0
    worst = 0.0
    for tag, address, row, letter, expected in all_checked_cells():
        cached = CACHED[tag][row][letter]
        delta = abs(cached - expected)
        worst = max(worst, delta)
        assert delta <= TOL, f"{tag}!{address}: cached {cached!r}, re-derived {expected!r}"
        checked += 1
    assert checked == 432
    assert worst < 1e-13, f"worst delta {worst:.3e} is larger than float noise"


def test_decision_matrix_week_counts_rederive():
    """The third sheet's 16 formula cells. Schedule arithmetic, no dimensions."""
    whirly = CACHED["DM"][8]["C"]        # C8
    fatigue = CACHED["DM"][9]["C"]       # C9
    sunk = CACHED["DM"][10]["C"]         # C10
    expected = {
        # row 15: no change beyond the axial-gap check
        (15, "E"): sunk * whirly,
        (15, "F"): (sunk + 1) * whirly,
        (15, "G"): sunk * whirly + fatigue,
        (15, "H"): sunk * whirly + fatigue,
        # row 17: thicker sleeve
        (17, "E"): sunk * whirly,
        (17, "F"): sunk * whirly,
        (17, "G"): fatigue + sunk * whirly,
        (17, "H"): whirly * sunk + fatigue,
        # row 19: thicker hub seat
        (19, "E"): fatigue,
        (19, "F"): (sunk + 1) * whirly,
        (19, "G"): max(sunk * whirly, fatigue),
        (19, "H"): max(whirly * (sunk + 1), fatigue),
        # row 21: both
        (21, "E"): max(fatigue, (sunk + 1) * whirly),
        (21, "F"): max(fatigue, sunk * whirly),
        (21, "G"): max(sunk * whirly, fatigue),
        (21, "H"): max(sunk * whirly, fatigue),
    }
    assert len(expected) == 16
    for (row, letter), value in expected.items():
        assert CACHED["DM"][row][letter] == pytest.approx(value, abs=TOL), f"DM!{letter}{row}"


def test_the_m2_orphan_cell_i27_rederives():
    """``I27 = I13 - E18``: hot-MMC hub bore minus **room**-temperature MMC
    sleeve OD.

    An unlabelled cell with no row heading, sitting below the lower section on
    the M2 sheet only. Mixing a hot bore with a room-temperature sleeve is what
    an interference-fit *assembly* check looks like (heat the hub, drop in a
    cold-ish sleeve), so this is most likely a scratch calculation of assembly
    clearance rather than part of the operational analysis. It is re-derived
    because it is a computed cell, and reported as a finding because an
    unlabelled cell in a hand-built sheet is exactly the kind of thing a later
    reader mistakes for a result.
    """
    model = rederived()[("M2", "lower")]
    hot_mmc_bore = model[("hot", "mmc")]["hub_bore"]
    room_mmc_sleeve_od = model[("room", "mmc")]["sleeve_od"]
    assert CACHED["M2"][27]["I"] == pytest.approx(hot_mmc_bore - room_mmc_sleeve_od, abs=TOL)
    # and it is NOT the same-temperature comparison, which is I19
    assert CACHED["M2"][27]["I"] != pytest.approx(CACHED["M2"][19]["I"], abs=1e-6)


def test_m1_lower_lmc_sleeve_od_is_a_workbook_slip():
    """``[slip]`` M1 lower row 18: the LMC sleeve OD is built from the MMC column.

    ``D18`` reads ``=E17+2*E15`` where every other cell in the row uses its own
    column, and the hot and cold LMC cells (``H18``, ``L18``) were filled from
    the same wrong pattern -- so ``D18 == E18``, ``H18 == I18`` and
    ``L18 == M18`` exactly. The M2 sheet has it right (``D18 = D17 + 2*D15``).

    One authoring error, 21 affected cells. Two things about it matter:

    * it makes the LMC column read as **more** interference than nominal
      (``D19`` -0.155 against ``C19`` -0.145), which is backwards for a
      least-material corner and is the tell a reader can catch without
      recomputing anything;
    * it does **not** change M1's conclusion. Correcting it moves room-temp
      ``D25`` from +0.006 (clearance) to -0.004 (interference), but the hot LMC
      corner ``H25`` is +0.0965 either way -- an order of magnitude larger and
      still a clearance. M1's as-built slip risk survives the correction.
    """
    slipped = CACHED["M1"]
    assert slipped[18]["D"] == slipped[18]["E"] == 202.31
    assert slipped[18]["H"] == slipped[18]["I"] == 202.41835723600002
    assert slipped[18]["L"] == slipped[18]["M"] == 202.22664828
    # M2 does it right: its LMC OD differs from its MMC OD.
    assert CACHED["M2"][18]["D"] != CACHED["M2"][18]["E"]

    correct = rederive_section(**dict(SECTIONS[("M1", "lower")][1], lmc_sleeve_od_uses_mmc=False))
    assert correct[("room", "lmc")]["sleeve_od"] == pytest.approx(202.26, abs=TOL)
    assert slipped[18]["D"] - 202.26 == pytest.approx(0.05, abs=1e-9)

    # the tell: LMC should be the loosest column, and in the slipped sheet it is not
    assert slipped[19]["D"] < slipped[19]["C"]
    # the conclusion is unchanged: still a clearance at hot LMC, by ~0.1 mm
    assert correct[("hot", "lmc")]["fit_2"] == pytest.approx(0.08649843711998528, abs=TOL)
    assert slipped[25]["H"] > 0 and correct[("hot", "lmc")]["fit_2"] > 0


def test_lmc_is_the_loose_corner_and_mmc_the_tight_one_everywhere():
    """The workbook's material columns *are* its fit corners. Not assumed -- checked.

    For both interfaces, at every temperature, on both sheets and both bores:
    ``fit(LMC) >= fit(nominal) >= fit(MMC)`` with ``fit`` signed
    negative-is-interference. The one exception is M1 lower's LMC column, which
    is the slip above -- so it is excluded here and pinned there instead.
    """
    for (tag, section), model in rederived().items():
        for group in GROUPS:
            loose = model[(group, "lmc")]
            tight = model[(group, "mmc")]
            for quantity in ("fit_1", "fit_2"):
                assert tight[quantity] < loose[quantity], f"{tag} {section} {group} {quantity}"
            if (tag, section) == ("M1", "lower"):
                continue  # the slip inverts LMC vs nominal; see the slip test
            nominal = model[(group, "nom")]
            for quantity in ("fit_1", "fit_2"):
                assert tight[quantity] <= nominal[quantity] <= loose[quantity], (
                    f"{tag} {section} {group} {quantity}")


def test_hot_is_the_governing_temperature_for_both_interfaces():
    """Aluminium (23.04) grows faster than AISI 420 (10.3), so heat loosens.

    This is why the analysis exists. Two things are pinned:

    * fit is monotonic in temperature -- ``cold < room < hot`` at every corner of
      every section, on both interfaces;
    * **every clearance in the file is at hot**, and every one of them is in the
      LMC or nominal column. The single exception is the M1 lower room-LMC cell
      ``D25`` (+0.006), which is an artefact of the row-18 slip: re-derived
      correctly it is -0.004, an interference. So the "clearance only when hot"
      reading is a property of the design, not of the spreadsheet's error.
    """
    models = rederived()
    for (tag, section), model in models.items():
        for corner in CORNERS:
            if (tag, section) == ("M1", "lower") and corner == "lmc":
                continue  # the slipped column; see test_m1_lower_lmc_sleeve_od_is_a_workbook_slip
            hot = model[("hot", corner)]
            room = model[("room", corner)]
            cold = model[("cold", corner)]
            assert cold["fit_1"] < room["fit_1"] < hot["fit_1"], f"{tag} {section} {corner}"
            assert cold["fit_2"] < room["fit_2"] < hot["fit_2"], f"{tag} {section} {corner}"

    def clearances(source):
        return {
            (tag, section, group, corner, quantity)
            for (tag, section), model in source.items()
            for group in GROUPS
            for corner in CORNERS
            for quantity in ("fit_1", "fit_2")
            if model[(group, corner)][quantity] > 0
        }

    as_cached = clearances(models)
    assert as_cached == {
        ("M2", "upper", "hot", "lmc", "fit_1"),   # H37 +0.014468
        ("M2", "upper", "hot", "lmc", "fit_2"),   # H43 +0.004207
        ("M1", "upper", "hot", "lmc", "fit_1"),   # identical sheet region
        ("M1", "upper", "hot", "lmc", "fit_2"),
        ("M1", "lower", "hot", "nom", "fit_2"),   # G25 +0.029460
        ("M1", "lower", "hot", "lmc", "fit_2"),   # H25 +0.096504
        ("M1", "lower", "room", "lmc", "fit_2"),  # D25 +0.006000 -- slip artefact
    }, as_cached

    # with the slip corrected, the only room-temperature clearance disappears and
    # every remaining clearance is hot.
    corrected = dict(models)
    corrected[("M1", "lower")] = rederive_section(
        **dict(SECTIONS[("M1", "lower")][1], lmc_sleeve_od_uses_mmc=False))
    assert {group for _t, _s, group, _c, _q in clearances(corrected)} == {"hot"}


def test_workbook_inputs_are_transcribed_consistently_on_both_sheets():
    """The thermal parameters are duplicated between the sheets; they agree."""
    for row, value in ((4, T_ROOM), (5, CTE_HUB), (6, CTE_SLEEVE),
                       (7, T_HOT), (8, T_COLD), (9, CTE_BEARING)):
        assert CACHED["M2"][row]["C"] == value
        assert CACHED["M1"][row]["C"] == value
    # the upper bore is NUMERICALLY identical between M1 and M2 -- CACHED holds the
    # numeric cells, and every one of them agrees -- because the M2 change was to
    # the LOWER sleeve only (214955-002 -> -003) and the upper was left alone. The
    # sheets are NOT byte-identical over these rows: the comment column differs
    # (O31 names 212966-005 on M2 and -004 on M1, O32 by a trailing space, and O34
    # carries a tolerance-change note on M1 only). Those are prose, not values.
    for row in range(31, 45):
        assert CACHED["M2"][row] == CACHED["M1"][row], f"row {row} differs between sheets"
    # the lower bore is not
    assert CACHED["M2"][15]["C"] != CACHED["M1"][15]["C"]
    assert CACHED["M2"][17]["C"] != CACHED["M1"][17]["C"]


@pytest.mark.parametrize("tag,section", list(SECTIONS))
def test_the_bearing_od_nominal_sits_at_one_end_of_its_own_band(tag, section):
    """``nominal`` is transcribed, not a midpoint -- and here it is a *limit*.

    Both bearing ODs are drawn as basic-size-minus (``⌀200.000 0/-0.020``,
    ``⌀130.000 0/-0.009``), and the workbook transcribes the nominal column as
    the **LMC** value for the lower bearing (199.98, its minimum) and as the
    **MMC** value for the upper (130.0, its maximum). Both are legitimate
    transcriptions of a one-sided band and neither is a midpoint; F1's
    ``min <= nominal <= max`` holds in both cases, at the boundary.
    """
    spec = SECTIONS[(tag, section)][1]
    band = spec["bearing_od"]
    assert min(band["lmc"], band["mmc"]) <= band["nom"] <= max(band["lmc"], band["mmc"])
    assert band["nom"] in (band["lmc"], band["mmc"]), "expected nominal to sit on a limit"


@pytest.mark.skipif(find_workbook() is None,
                    reason="260209_Hub Bearing Fits.xlsx is gitignored data; "
                           "absent from a worktree (SOP trap 15)")
def test_committed_cached_table_matches_the_live_workbook():
    """CACHED is a transcription. When the workbook is present, check it.

    Reads the raw sheet XML with the imported stdlib dumper rather than openpyxl,
    for the same reason that tool exists: shared formulas and cached values both
    live in the XML.
    """
    from tests.debug_dump_tol_stack_xlsx import (  # noqa: PLC0415 -- optional dep-free import
        col_index, load_shared_strings, read_cells, sheet_paths,
    )

    path = find_workbook()
    with zipfile.ZipFile(path) as zf:
        strings = load_shared_strings(zf)
        by_name = {name: read_cells(zf, target, strings) for name, target in sheet_paths(zf)}

    compared = 0
    for tag, rows in CACHED.items():
        cells = by_name[SHEET_NAMES[tag]]
        for row, columns in rows.items():
            for letter, value in columns.items():
                cell = cells.get((row, col_index(letter)))
                assert cell is not None, f"{tag}!{letter}{row} missing from the workbook"
                live = float(cell["value"])
                assert live == value or math.isclose(live, value, rel_tol=0, abs_tol=0), (
                    f"{tag}!{letter}{row}: workbook {live!r}, committed {value!r}")
                compared += 1
    # CACHED covers *every numeric cell* on all three sheets: 231 on M2 (216
    # grid + 8 tolerance inputs + the I27 orphan + 6 thermal parameters), 230 on
    # M1 (the same, minus the orphan), 19 on Decision Matrix.
    assert compared == 480, compared
