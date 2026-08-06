// A miniature projection for `index.html?mock=1` and the logic tests.
//
// NOT a copy of a real stack — a deliberately small one that exercises every
// state the viewer has to render honestly: a traced element, an inferred one, an
// untraced one with a zero-width band, an INCOMPLETE check, a resolved crop, an
// unresolvable crop, and an element crops.json has never heard of (a stale
// index). The real stacks are covered by the node-fs tier, which reads the
// actual projection.
//
// The numbers are arbitrary and internally consistent with a fold; nothing here
// is a claim about any Joby part.
(function (VA) {
  "use strict";

  VA.demoFixture = function () {
    return {
      startState: VA.STATE.READY,
      results: {
        schema: "joby.tolerance_stack/viewer_projection/v0",
        built_at: "2026-08-05T00:00:00+00:00",
        stacks: [{
          id: "demo_joint",
          title: "Demo joint — every provenance state in one stack",
          units: "mm",
          source_file: "docs/tolerance_stacks/stack_demo_joint.json",
          worksheet_file: "docs/tolerance_stacks/WORKSHEET_demo_joint.md",
          stack: {
            joint: {
              assembly_drawing: "217755",
              sheet: 4,
              view: "DETAIL B",
              question: "Does the fastener grip work in this joint?",
            },
            elements: [
              {
                id: "plate", name: "plate thickness", role: "clamped_member",
                nominal: 4.06, min: 3.96, max: 4.16, lmc: 3.96, mmc: 4.16,
                plus_minus: 0.1, hardware_ref: null,
                note: "Traced to a part drawing — the only fully sourced band here.",
                source_ref: {
                  kind: "drawing", document: "215197", revision: "A.1", sheet: 2,
                  zone: "D10", view: "SECTION A-A", callout: "5X 4.06 ±0.10",
                  confidence: "traced",
                  note: "A long-ish source note, so the clamp-and-click-to-expand " +
                    "behaviour has something to clamp. Real ones carry the written " +
                    "argument behind a citation — which count tied the callout to " +
                    "this joint, which neighbouring group it must not be confused " +
                    "with, and what a second reader should re-check.",
                },
              },
              {
                id: "washer", name: "washer thickness", role: "washer",
                nominal: 0.8128, min: 0.8128, max: 0.8128, lmc: null, mmc: null,
                plus_minus: null, hardware_ref: "NAS1149V0332",
                note: "ZERO-WIDTH BAND: no document gives a tolerance.",
                source_ref: {
                  kind: "parts_list", document: "217755", sheet: 4, zone: "H3",
                  view: "DETAIL B", callout: "WASHER, FLAT ... .032\"",
                  confidence: "inferred",
                },
              },
              {
                id: "eye", name: "link eye width (recalled)", role: "bearing",
                nominal: 8.0, min: 7.9, max: 8.1, lmc: null, mmc: null,
                plus_minus: 0.1, hardware_ref: null,
                note: "UNTRACED — shown so the colour system has something to shout at.",
                source_ref: { kind: "assumed", document: null, confidence: "untraced" },
              },
            ],
            notes: [
              "A demo stack. Nothing here is a claim about a real part.",
              "The INCOMPLETE check below is a budget, not a verdict.",
            ],
          },
          elements: [
            { id: "plate", confidence: "traced", kind: "drawing", has_source_ref: true,
              zero_width: false, hardware_gaps: [] },
            { id: "washer", confidence: "inferred", kind: "parts_list", has_source_ref: true,
              zero_width: true,
              hardware_gaps: ["NAS1149 is not in the spec pile, so the band is unknown."] },
            { id: "eye", confidence: "untraced", kind: "assumed", has_source_ref: true,
              zero_width: false, hardware_gaps: [] },
          ],
          paths: [{
            id: "clamped", label: "clamped column",
            terms: [{ element: "plate" }, { element: "washer" }],
            element_terms: [{ element_id: "plate", sign: 1 }, { element_id: "washer", sign: 1 }],
            interval: {
              nominal: 4.8728, worst_case_min: 4.7728, worst_case_max: 4.9728,
              worst_case_half: 0.1, rss_center: 4.8728, rss_half: 0.1,
              rss_min: 4.7728, rss_max: 4.9728,
            },
            input_confidence: { traced: 1, inferred: 1, untraced: 0, no_source_ref: 0 },
            worst_confidence: "inferred",
            zero_width_inputs: ["washer"],
          }],
          checks: [
            {
              schema: "joby.tolerance_stack/check_result/v0",
              check_id: "clearance", label: "clearance over the clamped column",
              configuration: { fastener: "demo bolt" }, criterion: ">= 0", units: "mm",
              verdict: "pass", guidance: "A complete check, for contrast.",
              nominal: 1.1272, worst_case_min: 0.9272, worst_case_max: 1.3272,
              worst_case_half: 0.2, rss_center: 1.1272, rss_half: 0.141421,
              rss_min: 0.985779, rss_max: 1.268621,
              terms: [{ path: "clamped" }],
              element_terms: [{ element_id: "plate", sign: 1 }, { element_id: "washer", sign: 1 }],
              incomplete: false,
              input_confidence: { traced: 1, inferred: 1, untraced: 0, no_source_ref: 0 },
              worst_confidence: "inferred", zero_width_inputs: ["washer"],
              workbook_cells: null,
            },
            {
              schema: "joby.tolerance_stack/check_result/v0",
              check_id: "shank_out", label: "shank out — INCOMPLETE: eye width unsourced",
              configuration: { excluded: "link eye width — no document" },
              criterion: ">= 0", units: "mm", verdict: "fail",
              guidance: "Read the magnitude as the eye width the joint requires.",
              nominal: -3.1272, worst_case_min: -3.3272, worst_case_max: -2.9272,
              worst_case_half: 0.2, rss_center: -3.1272, rss_half: 0.141421,
              rss_min: -3.268621, rss_max: -2.985779,
              terms: [{ path: "clamped" }, { element: "eye", sign: -1 }],
              element_terms: [
                { element_id: "plate", sign: 1 },
                { element_id: "washer", sign: 1 },
                { element_id: "eye", sign: -1 },
              ],
              incomplete: true,
              input_confidence: { traced: 1, inferred: 1, untraced: 1, no_source_ref: 0 },
              worst_confidence: "untraced", zero_width_inputs: ["washer"],
              workbook_cells: null,
            },
          ],
          provenance_counts: { traced: 1, inferred: 1, untraced: 1, no_source_ref: 0 },
          zero_width_count: 1,
          gaps: [
            { kind: "excluded_from_model", label: "term excluded from the model",
              text: "link eye width — no document", hardware_id: null },
            { kind: "hardware_entry", label: "hardware entry NAS1149V0332",
              text: "NAS1149 is not in the spec pile, so the band is unknown.",
              hardware_id: "NAS1149V0332" },
          ],
        }],
        hardware_entries: { entries: [] },
      },
      crops: {
        schema: "joby.tolerance_stack/viewer_crops/v0",
        built_at: "2026-08-05T00:00:00+00:00",
        summary: { resolved: 1, unresolvable: 1 },
        by_stack: {
          demo_joint: {
            plate: {
              status: "resolved", reason: null, png: "crops/demo_joint__plate.png",
              width: 800, height: 600, pdf: "C:/workspace/demo/215197.pdf",
              pdf_name: "215197 A.1.pdf", page: 2,
              resolved_by: "provenance.sources_used", run_dir: null, run_id: null,
              sha256_verified: null, located_by: "zone_cell", needle: "4.06",
              cited_zone: "D10", zone_grid: "read", callout_text_in_zone: true,
              note: "printed zone D10 padded by 1 cell(s)",
              rect_pt: [0, 0, 100, 100],
            },
            washer: {
              status: "unresolvable", png: null,
              reason: "citation names no export, and provenance.sources_used names " +
                "no PDF for '217755'",
            },
            // `eye` deliberately absent: a crops.json older than the stack.
          },
        },
        unresolved: [{ stack: "demo_joint", element: "washer", kind: "parts_list",
                       document: "217755", reason: "citation names no export" }],
      },
      texts: {
        "docs/tolerance_stacks/WORKSHEET_demo_joint.md":
          "# Demo worksheet\n\nRendered by the vendored markdown renderer.\n\n" +
          "| # | source needed | priority |\n|---|---|---|\n" +
          "| 1 | the link's part drawing | **1 — blocks the stack** |\n",
      },
      images: { "crops/demo_joint__plate.png": true },
    };
  };

  // A second miniature projection: the GENERATED-check surface, which the demo
  // stack above cannot exercise because its checks are authored and every one of
  // its weights is 1.
  //
  // The states this one exists to render honestly: a stack whose checks are not
  // in its own JSON, terms with NON-UNITY coefficients (a diametral 2 and two
  // soak factors), a sensitivity probe that is not a result, a worksheet declared
  // rather than matched by name, and materials whose CTE values are untraced.
  //
  // The elements and the two soak factors are arbitrary; the folded numbers are
  // NOT — they are what tolerance_stack.fold() returns for these terms, rounded
  // in Python to 6 dp exactly as the real projection does, so the fixture cannot
  // teach a reading the real surface would contradict. Nothing here is a claim
  // about a real part or a real material.
  VA.generatedFixture = function () {
    var F_SLEEVE = 1.0005;      // stainless at the demo hot soak
    var F_HUB = 1.0012;         // aluminium, growing faster — this is the mechanism
    var F_BEARING = 1.0011;
    return {
      startState: VA.STATE.READY,
      results: {
        schema: "joby.tolerance_stack/viewer_projection/v0",
        built_at: "2026-08-06T00:00:00+00:00",
        stacks: [{
          id: "demo_fit",
          title: "Demo shrink fit — generated checks, weighted terms",
          units: "mm",
          archetype: "demo_thermal_fit",
          checks_source: "generated",
          checks_generated_not_rendered: false,
          source_file: "docs/tolerance_stacks/stack_demo_fit.json",
          worksheet_file: "docs/tolerance_stacks/WORKSHEET_demo_fits.md",
          worksheet_source: "declared",
          stack: {
            joint: { assembly: "none — a demo", question: "Does the fit stay interfering?" },
            elements: [
              { id: "hub_bore", name: "hub bore", role: "clamped_member",
                nominal: 20.0, min: 19.98, max: 20.02, lmc: 20.02, mmc: 19.98,
                plus_minus: 0.02, hardware_ref: null,
                source_ref: { kind: "drawing", document: "DEMO-1", sheet: 1,
                              confidence: "traced" } },
              { id: "sleeve_bore", name: "sleeve bore", role: "clamped_member",
                nominal: 19.9, min: 19.89, max: 19.91, lmc: 19.91, mmc: 19.89,
                plus_minus: 0.01, hardware_ref: null,
                source_ref: { kind: "drawing", document: "DEMO-2", sheet: 1,
                              confidence: "traced" } },
              { id: "sleeve_wall", name: "sleeve radial wall", role: "bushing",
                nominal: 0.06, min: 0.055, max: 0.065, lmc: 0.055, mmc: 0.065,
                plus_minus: 0.005, hardware_ref: null,
                note: "Enters DIAMETRALLY: the OD is bore + 2 × wall, and the two " +
                  "walls are one turned dimension.",
                source_ref: { kind: "drawing", document: "DEMO-2", sheet: 1,
                              confidence: "traced" } },
              { id: "bearing_od", name: "bearing OD", role: "bearing",
                nominal: 19.91, min: 19.905, max: 19.915, lmc: 19.905, mmc: 19.915,
                plus_minus: 0.005, hardware_ref: null,
                source_ref: { kind: "parts_list", document: "DEMO-1", sheet: 2,
                              confidence: "inferred" } },
            ],
            notes: ["CHECKS ARE GENERATED. `checks` is empty in the file on purpose."],
          },
          elements: [
            { id: "hub_bore", confidence: "traced", kind: "drawing", has_source_ref: true,
              zero_width: false, hardware_gaps: [], material: "DEMO_ALUMINIUM" },
            { id: "sleeve_bore", confidence: "traced", kind: "drawing", has_source_ref: true,
              zero_width: false, hardware_gaps: [], material: "DEMO_STAINLESS" },
            { id: "sleeve_wall", confidence: "traced", kind: "drawing", has_source_ref: true,
              zero_width: false, hardware_gaps: [], material: "DEMO_STAINLESS" },
            { id: "bearing_od", confidence: "inferred", kind: "parts_list",
              has_source_ref: true, zero_width: false, hardware_gaps: [],
              material: "DEMO_BEARING_STEEL" },
          ],
          materials: [
            { id: "DEMO_ALUMINIUM", confidence: "untraced", kind: "workbook",
              designation_confidence: "traced", used_by_elements: ["hub_bore"],
              material: {
                schema: "joby.tolerance_stack/material_entry/v0", id: "DEMO_ALUMINIUM",
                designation: "a demo aluminium", specification: "DEMO-SPEC",
                condition: "T7451", cte_1e6_per_c: 23.0,
                cte_temperature_range_c: null,
                gaps: ["The CTE is a demo number and is traced to nothing."],
                values_source: { kind: "workbook", document: "demo.xlsx", cell: "C5",
                                 confidence: "untraced" },
                note: "Grows roughly twice as fast as the sleeve — that difference " +
                  "IS the mechanism this archetype is about.",
              } },
            { id: "DEMO_STAINLESS", confidence: "untraced", kind: "workbook",
              designation_confidence: "traced",
              used_by_elements: ["sleeve_bore", "sleeve_wall"],
              material: {
                schema: "joby.tolerance_stack/material_entry/v0", id: "DEMO_STAINLESS",
                designation: "a demo stainless", cte_1e6_per_c: 10.3,
                cte_temperature_range_c: [20.0, 100.0],
                gaps: ["The CTE is a demo number and is traced to nothing."],
                values_source: { kind: "workbook", document: "demo.xlsx", cell: "C6",
                                 confidence: "untraced" },
              } },
            { id: "DEMO_BEARING_STEEL", confidence: "no_source_ref", kind: null,
              designation_confidence: "no_source_ref",
              used_by_elements: ["bearing_od"],
              material: {
                schema: "joby.tolerance_stack/material_entry/v0",
                id: "DEMO_BEARING_STEEL", designation: "a demo bearing steel",
                cte_1e6_per_c: 11.9, cte_temperature_range_c: null,
                gaps: ["No citation at all for this CTE — the loudest state."],
                values_source: null,
              } },
          ],
          paths: [],
          checks: [
            {
              schema: "joby.tolerance_stack/check_result/v0",
              check_id: "seat__hub_to_sleeve__hot",
              label: "demo seat: hub bore to sleeve OD (stage 1) @ hot (72 C)",
              configuration: { chain: "seat", stage: "hub_to_sleeve", temperature: "hot",
                               temperature_c: "72", stiffness_ratio: "0.8" },
              criterion: ">= 0", units: "mm", verdict: "marginal",
              guidance: "Interference, positive = interfering. The worst-case " +
                "minimum is the loosest corner and is the binding one.",
              nominal: 0.00601, worst_case_min: -0.034024, worst_case_max: 0.046044,
              worst_case_half: 0.040034, rss_center: 0.00601, rss_half: 0.024519,
              rss_min: -0.018509, rss_max: 0.030529,
              terms: [
                { element: "sleeve_bore", sign: 1, coefficient: F_SLEEVE },
                { element: "sleeve_wall", sign: 1, coefficient: 2 * F_SLEEVE },
                { element: "hub_bore", sign: -1, coefficient: F_HUB },
              ],
              element_terms: [
                { element_id: "sleeve_bore", sign: 1, coefficient: F_SLEEVE },
                { element_id: "sleeve_wall", sign: 1, coefficient: 2 * F_SLEEVE },
                { element_id: "hub_bore", sign: -1, coefficient: F_HUB },
              ],
              incomplete: false, sensitivity: false, generated: true,
              input_confidence: { traced: 3, inferred: 0, untraced: 0, no_source_ref: 0 },
              worst_confidence: "traced", zero_width_inputs: [], workbook_cells: null,
            },
            {
              schema: "joby.tolerance_stack/check_result/v0",
              check_id: "seat__sleeve_to_bearing__hot__k1",
              label: "[SENSITIVITY] demo seat: installed sleeve bore to bearing OD " +
                "(stage 2) @ hot with stiffness ratio 1 instead of 0.8",
              configuration: { chain: "seat", stage: "sleeve_to_bearing",
                               temperature: "hot", temperature_c: "72",
                               stiffness_ratio: "1", sensitivity: "true" },
              criterion: ">= 0", units: "mm", verdict: "marginal",
              guidance: "NOT A RESULT. k = 1 means the sleeve absorbs all of stage " +
                "1's interference, so its own free size drops out of the term list.",
              nominal: 0.027961, worst_case_min: -0.007073, worst_case_max: 0.062996,
              worst_case_half: 0.035034, rss_center: 0.027961, rss_half: 0.022937,
              rss_min: 0.005024, rss_max: 0.050898,
              terms: [
                { element: "bearing_od", sign: 1, coefficient: F_BEARING },
                { element: "sleeve_wall", sign: 1, coefficient: 2 * F_SLEEVE },
                { element: "hub_bore", sign: -1, coefficient: F_HUB },
              ],
              element_terms: [
                { element_id: "bearing_od", sign: 1, coefficient: F_BEARING },
                { element_id: "sleeve_wall", sign: 1, coefficient: 2 * F_SLEEVE },
                { element_id: "hub_bore", sign: -1, coefficient: F_HUB },
              ],
              incomplete: false, sensitivity: true, generated: true,
              input_confidence: { traced: 2, inferred: 1, untraced: 0, no_source_ref: 0 },
              worst_confidence: "inferred", zero_width_inputs: [], workbook_cells: null,
            },
          ],
          provenance_counts: { traced: 3, inferred: 1, untraced: 0, no_source_ref: 0 },
          zero_width_count: 0,
          gaps: [],
        }],
        hardware_entries: { entries: [] },
      },
      crops: null,
      texts: {},
      images: {},
    };
  };
})(window.ViewerApp = window.ViewerApp || {});
