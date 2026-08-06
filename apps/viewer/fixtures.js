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
})(window.ViewerApp = window.ViewerApp || {});
