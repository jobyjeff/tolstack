// Logic + rendering tests for the stack viewer. Classic script (no
// import/export) so it runs by double-clicking test.html from file:// AND under
// the node vm sandbox (run_tests.cjs). Exposes VA.runTests().
//
// Two tiers in one file:
//   * fixture tier — the miniature projection in fixtures.js, which exercises
//     every provenance state on purpose.
//   * node-fs tier — the REAL data/projections/viewer/ of a checkout, through
//     the same adapter contract. Runs only when the runner injects NODE_FS
//     (i.e. under node, against a repo whose projection has been built). It is
//     the tier that proves Jeff's actual stacks render, so it is not optional
//     when the projection is there; it reports itself skipped when it isn't.
(function (VA) {
  "use strict";

  VA.runTests = async function () {
    var results = [];
    async function test(name, fn) {
      try { await fn(); results.push({ name: name, ok: true }); }
      catch (err) { results.push({ name: name, ok: false, error: (err && err.message) || String(err) }); }
    }
    function skip(name, why) { results.push({ name: name, ok: true, skipped: why }); }
    function eq(a, b, msg) {
      var A = JSON.stringify(a), B = JSON.stringify(b);
      if (A !== B) throw new Error((msg || "not equal") + ": " + A + " !== " + B);
    }
    function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }
    function has(text, needle, msg) {
      if (String(text).indexOf(needle) === -1) {
        throw new Error((msg || "missing") + ": " + JSON.stringify(needle) +
          " not in " + JSON.stringify(String(text).slice(0, 400)));
      }
    }

    var FIXTURE = VA.demoFixture();
    var DEMO = FIXTURE.results.stacks[0];
    var CROPS = FIXTURE.crops;

    function render(fn) {
      var root = document.createElement("div");
      fn(root);
      return root;
    }
    // A real browser's querySelectorAll returns a NodeList, which has no map();
    // the node shim returns an array, which does. Every query goes through this
    // so the two tiers cannot drift (they did, once — the browser tier caught it).
    function all(root, selector) {
      return Array.prototype.slice.call(root.querySelectorAll(selector));
    }

    // --- formatting: the no-second-arithmetic rule -------------------------

    await test("fmt prints a projection number verbatim, with no rounding", function () {
      eq(VA.fmt(-8.1939), "-8.1939");
      eq(VA.fmt(0), "0");
      // If the projection ever ships float noise, the viewer shows the noise
      // rather than deciding how to round it. Rounding happens in Python.
      eq(VA.fmt(0.1 + 0.2), "0.30000000000000004");
      eq(VA.fmt(null), "—");
      eq(VA.fmt(undefined), "—");
    });

    await test("fmtPlusMinus never derives a band from min/max", function () {
      eq(VA.fmtPlusMinus(0.1), "±0.1");
      eq(VA.fmtPlusMinus(null), "—");
    });

    // --- provenance --------------------------------------------------------

    await test("confidenceClass maps the four states and degrades safely", function () {
      eq(VA.confidenceClass("traced"), "conf--traced");
      eq(VA.confidenceClass("untraced"), "conf--untraced");
      eq(VA.confidenceClass("no_source_ref"), "conf--no_source_ref");
      eq(VA.confidenceClass("banana"), "conf--unknown");
    });

    await test("summaryChips scoreboards the stack and flags both soft spots", function () {
      var texts = VA.summaryChips(DEMO).map(function (c) { return c.text; });
      eq(texts, ["1 traced", "1 inferred", "1 UNTRACED",
                 "1 zero-width band", "1 INCOMPLETE check"]);
    });

    await test("summaryChips omits a confidence nobody scored", function () {
      var chips = VA.summaryChips({ provenance_counts: { traced: 2 }, checks: [] });
      eq(chips.map(function (c) { return c.text; }), ["2 traced"]);
    });

    await test("elementRows pairs authored elements with derived flags, unmutated", function () {
      var rows = VA.elementRows(DEMO);
      eq(rows.length, 3);
      eq(rows[0].element.nominal, 4.06, "authored value untouched");
      eq(rows[1].derived.zero_width, true);
      // The authored element must not have acquired derived keys.
      ok(rows[0].element.zero_width === undefined, "derived flags stay beside, not on");
    });

    await test("elementRows survives a projection missing a derived row", function () {
      var rows = VA.elementRows({
        stack: { elements: [{ id: "ghost", name: "g" }] }, elements: [],
      });
      eq(rows[0].derived.confidence, "no_source_ref");
    });

    await test("citationWhere reads like drawing-checker's Where column", function () {
      eq(VA.citationWhere(DEMO.stack.elements[0].source_ref),
         "215197 · rev A.1 · sheet 2 · SECTION A-A · zone D10");
      eq(VA.citationWhere(null), "no source_ref");
    });

    // --- crops: four distinct answers --------------------------------------

    await test("cropFor returns the resolved entry", function () {
      eq(VA.cropFor(CROPS, "demo_joint", "plate").status, "resolved");
    });

    await test("cropFor keeps unresolvable distinct from not-built", function () {
      eq(VA.cropFor(CROPS, "demo_joint", "washer").status, "unresolvable");
      eq(VA.cropFor(null, "demo_joint", "washer").status, "not-built");
    });

    await test("cropFor reports a stale index as no-entry, not unresolvable", function () {
      var entry = VA.cropFor(CROPS, "demo_joint", "eye");
      eq(entry.status, "no-entry");
      has(entry.reason, "older than");
    });

    await test("runUrl only exists for a crop resolved through a run", function () {
      eq(VA.runUrl({ drawingCheckerWebui: "http://127.0.0.1:8000" },
                   { run_dir: "20260804_114000_x" }),
         "http://127.0.0.1:8000/run/20260804_114000_x");
      eq(VA.runUrl({ drawingCheckerWebui: "http://x/" }, { run_dir: null }), null);
      eq(VA.runUrl({ drawingCheckerWebui: "" }, { run_dir: "a" }), null);
    });

    await test("fileUrl normalises a Windows path", function () {
      eq(VA.fileUrl("C:\\workspace\\a b.pdf"), "file:///C:/workspace/a b.pdf");
      eq(VA.fileUrl(null), null);
    });

    await test("cropProvenanceLine says how much to trust the placement", function () {
      var line = VA.cropProvenanceLine(CROPS.by_stack.demo_joint.plate);
      has(line, "provenance.sources_used");
      has(line, "cited zone D10");
      // The matched needle is named, not just "found": "4.06" corroborates far
      // less than the whole callout would, and the line must let a reader see
      // which it was. (review/stack_viewer_v0, 2026-08-06)
      has(line, "callout text \"4.06\" found there");
    });

    await test("cropProvenanceLine warns when the callout was NOT found in the zone", function () {
      has(VA.cropProvenanceLine({
        status: "resolved", resolved_by: "joint_export_run", sha256_verified: true,
        located_by: "zone_cell", cited_zone: "H3", callout_text_in_zone: false,
      }), "callout text NOT found there");
    });

    await test("builtLine names each projection that is missing", function () {
      has(VA.builtLine(null, null), "results NOT BUILT");
      has(VA.builtLine(null, null), "crops NOT BUILT");
      has(VA.builtLine(FIXTURE.results, CROPS), "1 resolved, 1 unresolvable");
    });

    await test("findStack returns null for an unknown id", function () {
      ok(VA.findStack(FIXTURE.results, "demo_joint"));
      eq(VA.findStack(FIXTURE.results, "nope"), null);
      eq(VA.findStack(null, "demo_joint"), null);
    });

    await test("worksheetSegments reports absence rather than guessing a name", function () {
      eq(VA.worksheetSegments(DEMO),
         ["docs", "tolerance_stacks", "WORKSHEET_demo_joint.md"]);
      eq(VA.worksheetSegments({ worksheet_file: null }), null);
    });

    // --- the adapter contract ----------------------------------------------

    await test("a disconnected adapter refuses reads", async function () {
      var adapter = new VA.MemoryAdapter({ startState: VA.STATE.DISCONNECTED });
      var threw = false;
      try { await adapter.readResults(); } catch (err) { threw = err.name === "NotReadyError"; }
      ok(threw, "expected NotReadyError");
    });

    await test("the memory adapter serves both projections and a worksheet", async function () {
      var adapter = new VA.MemoryAdapter(FIXTURE);
      await adapter.connect();
      eq((await adapter.readResults()).stacks.length, 1);
      eq((await adapter.readCrops()).summary.resolved, 1);
      has(await adapter.readText(VA.worksheetSegments(DEMO)), "# Demo worksheet");
      eq(await adapter.readText(["nope.md"]), null);
    });

    await test("parseJson treats a half-written projection as absent", function () {
      eq(VA.parseJson('{"a":1}'), { a: 1 });
      eq(VA.parseJson('{"a":'), null);
      eq(VA.parseJson(""), null);
    });

    // --- rendering ----------------------------------------------------------

    await test("the elements table renders one row per authored element", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(root, "tr.el-row").length, 3);
    });

    await test("an untraced row is filled, not merely outlined", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var untraced = all(root, "tr.conf--untraced");
      eq(untraced.length, 1);
      has(untraced[0].textContent, "link eye width");
      has(untraced[0].textContent, "UNTRACED");
    });

    await test("a zero-width band is marked on the row and on min/max", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(root, "tr.el-row--zero-width").length, 1);
      eq(all(root, "td.num--zero-width").length, 2);
      ok(all(root, ".chip--zero-width").length >= 1);
    });

    await test("element values are printed exactly as authored", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var row = all(root, "tr.el-row")[0];
      has(row.textContent, "4.06");
      has(row.textContent, "3.96");
      has(row.textContent, "4.16");
      has(row.textContent, "±0.1");
    });

    await test("the INCOMPLETE check is flagged and its verdict shown", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var incomplete = all(root, "article.check--incomplete");
      eq(incomplete.length, 1);
      has(incomplete[0].textContent, "INCOMPLETE");
      has(incomplete[0].textContent, "fail");
      // A check is only as sourced as its weakest term.
      has(incomplete[0].textContent, "weakest input: UNTRACED");
    });

    await test("a check lists its expanded inputs with signs", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var text = all(root, "article.check")[1].textContent;
      has(text, "+ plate");
      has(text, "− eye");
    });

    await test("a check fed by a zero-width band says it is a lower bound", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      has(all(root, ".check__warn")[0].textContent, "Lower bound only");
    });

    await test("the excluded term leads the gap list", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var gaps = all(root, "li.gap");
      eq(gaps.length, 2);
      has(gaps[0].className, "gap--excluded_from_model");
      has(gaps[0].textContent, "link eye width");
    });

    await test("stack notes are rendered verbatim", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      has(root.textContent, "budget, not a verdict");
    });

    await test("a source_ref note is clamped until clicked", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var note = all(root, "div.el-row__srcnote")[0];
      ok(note, "expected a source note");
      ok(note.className.indexOf("--open") === -1, "clamped by default");
      note.click();
      has(note.className, "el-row__srcnote--open");
      note.click();
      ok(note.className.indexOf("--open") === -1, "click again re-clamps");
    });

    await test("hardware gaps fold into one row per element, nothing dropped", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var folds = all(root, "details.el-gaps");
      eq(folds.length, 1, "one folded row for the one element that has gaps");
      has(folds[0].textContent, "1 hardware gap — NAS1149V0332");
      has(folds[0].textContent, "not in the spec pile");
    });

    await test("every element gets a crop trigger carrying its own status", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var triggers = all(root, "button.crop-trigger");
      eq(triggers.length, 3);
      eq(triggers.map(function (t) { return t.cropEntry.status; }),
         ["resolved", "unresolvable", "no-entry"]);
    });

    await test("clicking a crop trigger hands the entry to the app", function () {
      var seen = null;
      var root = render(function (r) {
        VA.renderStack(r, DEMO, CROPS, { onCropShow: function (entry) { seen = entry; } });
      });
      all(root, "button.crop-trigger")[0].click();
      eq(seen.status, "resolved");
      eq(seen.png, "crops/demo_joint__plate.png");
    });

    await test("with no crops.json every trigger says not-built", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, null, {}); });
      var statuses = all(root, "button.crop-trigger")
        .map(function (t) { return t.cropEntry.status; });
      eq(statuses, ["not-built", "not-built", "not-built"]);
    });

    await test("renderStack with no stack asks for one instead of throwing", function () {
      var root = render(function (r) { VA.renderStack(r, null, CROPS, {}); });
      has(root.textContent, "Pick a stack");
    });

    // --- crop popover -------------------------------------------------------

    await test("a resolved popover shows the image, the sheet and both links", function () {
      var entry = CROPS.by_stack.demo_joint.plate;
      var root = render(function (r) {
        VA.renderCrop(r, entry, { url: "blob:x" }, VA.CONFIG);
      });
      eq(all(root, "img").length, 1);
      // The height is reserved from crops.json's pixel size, so the popover is
      // measured at its final size before the PNG decodes.
      eq(all(root, "img")[0].style.aspectRatio, "800 / 600");
      has(root.textContent, "sheet 2");
      has(root.textContent, "C:/workspace/demo/215197.pdf");
      // No run behind this one, so no run link — only the PDF.
      eq(all(root, "a").length, 1);
    });

    await test("a run-resolved popover links to the drawing-checker run page", function () {
      var root = render(function (r) {
        VA.renderCrop(r, {
          status: "resolved", png: "crops/x.png", pdf: "C:/x.pdf", pdf_name: "x.pdf",
          page: 4, resolved_by: "joint_export_run", run_dir: "20260804_114000_x",
          sha256_verified: true, located_by: "zone_cell", cited_zone: "H3",
          callout_text_in_zone: true,
        }, { url: "blob:x" }, VA.CONFIG);
      });
      var hrefs = all(root, "a").map(function (a) { return a.getAttribute("href"); });
      eq(hrefs.length, 2);
      has(hrefs[0], "/run/20260804_114000_x");
      has(hrefs[1], "file:///C:/x.pdf");
      has(root.textContent, "sha256 verified");
    });

    await test("an unresolvable popover shows the reason and offers no image", function () {
      var root = render(function (r) {
        VA.renderCrop(r, CROPS.by_stack.demo_joint.washer, null, VA.CONFIG);
      });
      eq(all(root, "img").length, 0);
      has(root.textContent, "citation names no export");
      has(root.className, "croppop--unresolvable");
    });

    await test("a not-built popover offers the command instead of a reason", function () {
      var root = render(function (r) {
        VA.renderCrop(r, VA.cropFor(null, "s", "e"), null, VA.CONFIG);
      });
      has(root.textContent, "has not been built");
      has(root.textContent, "build_viewer_crops.py");
    });

    await test("a resolved entry whose PNG vanished says the index is stale", function () {
      var root = render(function (r) {
        VA.renderCrop(r, CROPS.by_stack.demo_joint.plate, null, VA.CONFIG);
      });
      has(root.textContent, "is not on disk");
    });

    // --- worksheet ----------------------------------------------------------

    await test("the worksheet renders markdown, tables included", function () {
      var md = FIXTURE.texts["docs/tolerance_stacks/WORKSHEET_demo_joint.md"];
      var root = render(function (r) { VA.renderWorksheet(r, DEMO, md); });
      // innerHTML is read off the body node, not the wrapper: the node shim's
      // innerHTML is a property of the node it was set on, not a serialisation
      // of the subtree.
      var html = root.querySelector("div.worksheet__body").innerHTML;
      has(html, "<h1>");
      has(html, "<table>");
      has(root.textContent, "WORKSHEET_demo_joint.md");
    });

    await test("a stack with no worksheet says so rather than borrowing one", function () {
      var root = render(function (r) {
        VA.renderWorksheet(r, { worksheet_file: null }, null);
      });
      has(root.textContent, "No worksheet");
    });

    await test("a named worksheet that will not read is reported, not silent", function () {
      var root = render(function (r) { VA.renderWorksheet(r, DEMO, null); });
      has(root.textContent, "could not be read");
    });

    // --- banner -------------------------------------------------------------

    await test("the banner offers Connect when disconnected", function () {
      var root = render(function (r) {
        VA.renderBanner(r, { connection: VA.STATE.DISCONNECTED }, {});
      });
      has(root.textContent, "Connect folder");
      has(root.className, "banner--disconnected");
    });

    await test("a ready banner with no results explains how to build it", function () {
      var root = render(function (r) {
        VA.renderBanner(r, { connection: VA.STATE.READY, results: null, crops: null }, {});
      });
      has(root.textContent, "No results projection");
      has(root.textContent, "build_viewer_projection.py");
    });

    await test("results without crops nudges for the crop script only", function () {
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: null,
        }, {});
      });
      has(root.textContent, "build_viewer_crops.py");
      ok(root.textContent.indexOf("No results projection") === -1);
    });

    // --- node-fs tier: the REAL projection ----------------------------------

    var nodeFs = typeof NODE_FS !== "undefined" ? NODE_FS : null;
    if (!nodeFs) {
      skip("node-fs tier", "no NODE_FS injected (browser tier, or no runner shim)");
    } else if (!nodeFs.io.exists("data/projections/viewer/results.json")) {
      skip("node-fs tier",
           "no projection at " + nodeFs.root + "/data/projections/viewer/results.json " +
           "— run scripts/build_viewer_projection.py");
    } else {
      var real = new VA.NodeFsAdapter(nodeFs.root, nodeFs.io);
      var realResults = await real.readResults();
      var realCrops = await real.readCrops();
      var pitch = VA.findStack(realResults, "pitch_link_to_pitch_plate");

      await test("[real] the projection carries every stack in the repo", function () {
        ok(realResults.stacks.length >= 3, "expected 3+ stacks, got " + realResults.stacks.length);
        ok(pitch, "pitch_link_to_pitch_plate must be there");
      });

      await test("[real] the pitch-link stack renders its two INCOMPLETE checks", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        eq(all(root, "article.check--incomplete").length, 2);
      });

      await test("[real] gap 1 — the unsourced bearing width — is visible", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        has(all(root, "li.gap")[0].textContent, "spherical bearing");
      });

      await test("[real] the two zero-width bands are flagged", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        eq(all(root, "tr.el-row--zero-width").length, 2);
      });

      await test("[real] the folded numbers reach the page verbatim", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        has(root.textContent, "-8.1939");   // shank_out worst-case min
        has(root.textContent, "17.4752");   // the traced NAS6403 grip nominal
      });

      await test("[real] the NAS6403 grip crop resolves and its PNG is on disk", async function () {
        var entry = VA.cropFor(realCrops, "pitch_link_to_pitch_plate", "bolt_grip_11");
        eq(entry.status, "resolved");
        eq(entry.pdf_name, "NAS6403-NAS6420 Rev 4.pdf");
        eq(entry.page, 3);
        ok(await real.readCropImage(entry.png), "the PNG crops.json names must exist");
      });

      await test("[real] every resolved crop's PNG is actually on disk", async function () {
        var missing = [];
        var byStack = realCrops.by_stack || {};
        for (var stackId in byStack) {
          for (var elementId in byStack[stackId]) {
            var entry = byStack[stackId][elementId];
            if (entry.status === "resolved" && !(await real.readCropImage(entry.png))) {
              missing.push(stackId + ":" + elementId);
            }
          }
        }
        eq(missing, [], "crops.json is stale");
      });

      await test("[real] an unresolvable citation carries a reason, never a blank", function () {
        (realCrops.unresolved || []).forEach(function (row) {
          ok(row.reason && row.reason.length > 10,
             row.stack + ":" + row.element + " has no reason");
        });
      });

      await test("[real] the pitch-link worksheet loads and renders", async function () {
        var md = await real.readText(VA.worksheetSegments(pitch));
        ok(md, "worksheet must be readable");
        var root = render(function (r) { VA.renderWorksheet(r, pitch, md); });
        var html = root.querySelector("div.worksheet__body").innerHTML;
        has(html, "<h1>");
        has(html, "Worksheet — pitch link");
      });

      await test("[real] every stack in the projection renders without throwing", function () {
        realResults.stacks.forEach(function (stackProj) {
          var root = render(function (r) { VA.renderStack(r, stackProj, realCrops, {}); });
          ok(all(root, "tr.el-row").length > 0, stackProj.id + " rendered no rows");
        });
      });

      await test("[real] the slice-1 stacks show their untraced elements loudly", function () {
        var tan = VA.findStack(realResults, "tan_link_to_pitch_plate");
        var root = render(function (r) { VA.renderStack(r, tan, realCrops, {}); });
        ok(all(root, "tr.conf--untraced").length >= 6,
           "expected the workbook-sourced elements to be flagged untraced");
      });
    }

    return results;
  };
})(window.ViewerApp = window.ViewerApp || {});
