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
    // The generated-check surface: checks that are not in the stack file, terms
    // with non-unity coefficients, a sensitivity probe, and materials.
    var GEN = VA.generatedFixture().results.stacks[0];

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

    // A `thermal_fit` term weights a sleeve wall by 2k times a soak factor.
    // Printing that as a bare "+ sleeve_wall" is WORSE than printing nothing:
    // it looks readable and is wrong by a factor of two.
    await test("termLabel never swallows a coefficient other than 1", function () {
      eq(VA.termLabel({ element_id: "sleeve_wall", sign: 1, coefficient: 2.0010712 }),
         "+ 2.0010712 × sleeve_wall");
      eq(VA.termLabel({ element_id: "hub_bore", sign: -1, coefficient: 0.8 }),
         "− 0.8 × hub_bore");
      ok(VA.termTitle({ element_id: "x", sign: 1, coefficient: 2 }), "weighted terms explain");
    });

    await test("termLabel stays silent at unity, so an authored stack reads as before", function () {
      eq(VA.termLabel({ element_id: "plate", sign: 1, coefficient: 1 }), "+ plate");
      eq(VA.termLabel({ element_id: "eye", sign: -1, coefficient: 1 }), "− eye");
      // A projection built before coefficients existed carries no field at all.
      eq(VA.termLabel({ element_id: "plate", sign: 1 }), "+ plate");
      eq(VA.termTitle({ element_id: "plate", sign: 1, coefficient: 1 }), null);
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

    await test("summaryChips says the checks are generated and counts the probes", function () {
      var texts = VA.summaryChips(GEN).map(function (c) { return c.text; });
      eq(texts, ["3 traced", "1 inferred", "checks GENERATED", "1 sensitivity probe"]);
      var generated = VA.summaryChips(GEN).filter(function (c) {
        return c.kind === "generated";
      })[0];
      has(generated.title, "demo_thermal_fit");
      has(generated.title, "re-derives nothing");
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

    // The rule EVERY export-resolved crop in the real projection carries. Its
    // three facts — which rule, whether the sha256 was verified, which file —
    // were invisible until 2026-08-10: a crop of a *guessed* export looks
    // perfectly correct on screen, so a hover that cannot distinguish verified
    // from guessed is worse than no hover
    // (ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule).
    await test("cropProvenanceLine names the rule, the export and the sha verdict", function () {
      var line = VA.cropProvenanceLine(CROPS.by_stack.demo_joint.plate);
      has(line, "read from the export this citation names");
      has(line, "215197 A.1.pdf");
      has(line, "sha256 VERIFIED");
      has(line, "cited zone D10");
      // The matched needle is named, not just "found": "4.06" corroborates far
      // less than the whole callout would, and the line must let a reader see
      // which it was. (review/stack_viewer_v0, 2026-08-06)
      has(line, "callout text \"4.06\" found there");
    });

    // `false` and `null` are different answers and must not read the same: one
    // is a rule that had a sha and could not check it, the other a rule with no
    // sha to check (the append-only spec pile).
    await test("cropProvenanceLine keeps the three sha states distinct", function () {
      var base = { status: "resolved", resolved_by: "source_ref_export",
                   pdf_name: "x.pdf", located_by: "sheet_full", note: "whole sheet" };
      has(VA.cropProvenanceLine(base), "no sha256 to verify");
      base.sha256_verified = false;
      has(VA.cropProvenanceLine(base), "sha256 NOT verified");
      base.sha256_verified = true;
      has(VA.cropProvenanceLine(base), "sha256 VERIFIED");
      has(VA.cropProvenanceLine({
        status: "resolved", resolved_by: "spec_pile",
        pdf_name: "NAS6403-NAS6420 Rev 4.pdf", sha256_verified: null,
        located_by: "sheet_full", note: "whole sheet -- no text layer",
      }), "from data/inbox/specs/ by filename");
    });

    // THE GUARD AGAINST THIS BUG RECURRING. The old code switched on three
    // literals and fell through to silence for anything else, which is how 24
    // crops went unexplained for four days. An unknown rule is now loud.
    await test("a resolved_by the viewer has no label for is loud, not silent", function () {
      var line = VA.cropProvenanceLine({
        status: "resolved", resolved_by: "some_new_rule", sha256_verified: true,
        located_by: "sheet_full", note: "whole sheet",
      });
      has(line, "\"some_new_rule\"");
      has(line, "no label for");
      // Including the case that made the old fall-through invisible: no
      // resolved_by at all.
      has(VA.cropProvenanceLine({ status: "resolved", located_by: "sheet_full" }),
          "no label for");
      // And the rule this file used to pretend it handled is gone: nothing can
      // carry it, so it gets the unlabelled treatment like any other stranger.
      ok(!VA.CROP_RULES["provenance.sources_used"],
         "the removed rule must not have a branch");
    });

    await test("unlabelledCropRules reads the rollup, and finds a stranger in it", function () {
      eq(VA.unlabelledCropRules(CROPS), []);
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.summary.by_resolved_by = { source_ref_export: 1, some_new_rule: 3 };
      eq(VA.unlabelledCropRules(crops), ["some_new_rule"]);
      // A crops.json from before the rollup existed: fall back to the entries.
      delete crops.summary.by_resolved_by;
      crops.by_stack.demo_joint.plate.resolved_by = "some_new_rule";
      eq(VA.unlabelledCropRules(crops), ["some_new_rule"]);
    });

    await test("cropProvenanceLine warns when the callout was NOT found in the zone", function () {
      has(VA.cropProvenanceLine({
        status: "resolved", resolved_by: "joint_export_run", sha256_verified: true,
        located_by: "zone_cell", cited_zone: "H3", callout_text_in_zone: false,
      }), "callout text NOT found there");
    });

    // Kept, not deleted: the rule is still in the crop script for a stack
    // written before 2026-08-06, so it is reachable in principle — but it pins
    // the export from the JOINT block rather than from the citation, and the
    // label has to say which.
    await test("joint_export_run is labelled as the legacy path", function () {
      var line = VA.cropProvenanceLine({
        status: "resolved", resolved_by: "joint_export_run", run_id: "20260804_114000",
        sha256_verified: true, located_by: "sheet_full", note: "whole sheet",
      });
      has(line, "LEGACY RULE");
      has(line, "not by this citation");
      has(line, "20260804_114000");
      ok(VA.CROP_RULES.joint_export_run.legacy === true, "flagged legacy in the table");
    });

    await test("builtLine names each projection that is missing", function () {
      has(VA.builtLine(null, null), "results NOT BUILT");
      has(VA.builtLine(null, null), "crops NOT BUILT");
      has(VA.builtLine(FIXTURE.results, CROPS), "1 unresolvable");
    });

    // A resolved count says nothing about whether anything was CHECKED, and
    // that gap is what let "6 of 48 resolve" read as six trustworthy crops when
    // only two were sha-verified. The verification counts now sit beside the
    // resolved count they qualify.
    await test("builtLine puts the sha256 counts beside the resolved count", function () {
      has(VA.builtLine(FIXTURE.results, CROPS), "1 resolved — 1 sha256-verified");
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.summary.resolved = 26;
      crops.summary.sha256_verified = { "true": 20, "false": 2, unverified: 4 };
      var line = VA.builtLine(FIXTURE.results, crops);
      has(line, "20 sha256-verified");
      has(line, "2 NOT VERIFIED");
      has(line, "4 with no sha to check");
      // A crops.json built before the rollups existed still renders — it just
      // cannot say more than it knows.
      delete crops.summary.sha256_verified;
      has(VA.builtLine(FIXTURE.results, crops), "26 resolved; 1 unresolvable");
    });

    await test("cropRulesLine names each rule, its count and its status", function () {
      has(VA.cropRulesLine(CROPS), "source_ref_export 1");
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.summary.by_resolved_by = {
        source_ref_export: 22, spec_pile: 4, joint_export_run: 1, some_new_rule: 2,
      };
      var line = VA.cropRulesLine(crops);
      has(line, "spec_pile 4");
      has(line, "joint_export_run 1 (LEGACY rule)");
      has(line, "some_new_rule 2 (NO LABEL)");
      has(line, "no label for some_new_rule");
      eq(VA.cropRulesLine({ summary: {} }), null);
      eq(VA.cropRulesLine(null), null);
      // A projection where nothing resolved: the builder still writes the key,
      // as {}. No line at all beats a dangling "crops by rule:".
      eq(VA.cropRulesLine({ summary: { by_resolved_by: {} } }), null);
    });

    // --- provenance: which tree built what you are looking at ---------------
    //
    // On 2026-08-07 the shared projection showed three confidence labels that no
    // longer existed on master, and this banner reported `built_at` — a
    // timestamp answers "when", and the question was "which tree".

    await test("provenanceLine names the branch, the sha and the stacks-dir", function () {
      var line = VA.provenanceLine("results", FIXTURE.results);
      has(line, "master @ 012345678");
      has(line, "C:/workspace/tolstack/docs/tolerance_stacks");
    });

    await test("provenanceLine says so when a projection carries no stamp", function () {
      has(VA.provenanceLine("results", { built_at: "2026-08-06T00:00:00+00:00" }),
          "predates provenance stamping");
      // Nothing to say about a projection that was never built — the builtLine
      // already says NOT BUILT, and two lines saying it is one too many.
      eq(VA.provenanceLine("results", null), null);
    });

    await test("a matching pair of stamps raises no alarm", function () {
      eq(VA.provenanceAlarms(FIXTURE.results, CROPS), []);
    });

    // The failure mode that is provable from the data alone: the two files are
    // written by DIFFERENT scripts, each preserving the other's file, so the
    // pair genuinely can describe two different trees.
    await test("results and crops from different trees is an alarm, not a footnote", function () {
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.provenance.head_sha = "fedcba9876543210fedcba9876543210fedcba98";
      crops.provenance.branch = "handoff/somebody_else";
      var alarms = VA.provenanceAlarms(FIXTURE.results, crops);
      eq(alarms.length, 1);
      has(alarms[0], "DIFFERENT trees");
      has(alarms[0], "handoff/somebody_else @ fedcba987654");
    });

    await test("a projection built behind trunk says which labels it may predate", function () {
      var results = JSON.parse(JSON.stringify(FIXTURE.results));
      results.provenance.behind_trunk = 4;
      has(VA.provenanceAlarms(results, CROPS)[0], "4 commit(s) behind master");
      has(VA.provenanceLine("results", results), "4 commit(s) behind master");
    });

    await test("a dirty build tree is an alarm — the sha does not identify the code", function () {
      var results = JSON.parse(JSON.stringify(FIXTURE.results));
      results.provenance.dirty = true;
      has(VA.provenanceAlarms(results, CROPS)[0], "uncommitted changes");
    });

    await test("an unstamped projection is called out rather than assumed fine", function () {
      var results = { built_at: "2026-08-06T00:00:00+00:00", stacks: [] };
      has(VA.provenanceAlarms(results, CROPS)[0], "no provenance stamp");
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

    // --- generated checks: the whole point of the surface --------------------

    // THE deliverable. A weighted term must arrive on the page carrying its
    // weight; the alternative is a term list that looks readable and is wrong.
    await test("a non-unity coefficient reaches the DOM on the weighted term", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var weighted = all(root, "span.chip--weighted");
      var chips = weighted.map(function (c) { return c.textContent; });
      // 2 × the stainless soak factor on the wall, and the hub's own factor.
      has(chips.join(" | "), "+ 2.001 × sleeve_wall");
      has(chips.join(" | "), "− 1.0012 × hub_bore");
      ok(chips.length >= 4, "both cards weight every term: " + chips.join(" | "));
      // ...and the weight is explained on hover rather than left as a bare number.
      has(weighted[0].getAttribute("title"), "sign × coefficient");
    });

    await test("the checks section says the checks are not in the stack file", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var note = all(root, ".check__note")[0];
      ok(note, "a generated-check stack must say so");
      has(note.textContent, "GENERATED CHECKS");
      has(note.textContent, "demo_thermal_fit");
      has(note.textContent, "stack_demo_fit.json");
      // The escape hatch out of the browser: the command that prints the same
      // term table, so the surface is checkable and not just believable.
      has(note.textContent, "debug_report_thermal_fit.py");
      // An authored stack gets no such note.
      var plain = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(plain, ".check__note").length, 0);
    });

    await test("a sensitivity probe is marked NOT A RESULT, not shown as a verdict", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var probes = all(root, "article.check--sensitivity");
      eq(probes.length, 1);
      has(probes[0].textContent, "NOT A RESULT");
      has(probes[0].textContent, "[SENSITIVITY]");
      // The result card beside it is not tarred with it.
      eq(all(root, "article.check").length, 2);
    });

    await test("a generated card names the corner of (fit × temperature) it describes", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var corner = all(root, "div.check__corner")[0].textContent;
      has(corner, "chain seat");
      has(corner, "stage hub_to_sleeve");
      has(corner, "temperature hot (72 °C)");
      has(corner, "k 0.8");
      // An authored check has none of that vocabulary and gets no corner row.
      var plain = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(plain, "div.check__corner").length, 0);
    });

    await test("the materials table shows each CTE and how untraced it is", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var rows = all(root, "tr.mat-row");
      eq(rows.length, 3);
      has(rows[0].textContent, "23");                    // the CTE, printed verbatim
      has(rows[0].textContent, "UNTRACED");              // ...and how sourced it is
      has(rows[0].textContent, "designation: traced");   // name and number differ
      has(rows[1].textContent, "20 … 100");              // the range, when stated
      has(rows[2].textContent, "NO CITATION");
      // The gaps ride along, folded — three material rows, three gap rows, and
      // no element in this fixture has a hardware gap.
      var folds = all(root, "details.el-gaps");
      eq(folds.length, 3);
      has(folds[0].textContent, "traced to nothing");
      // Each element says which material it is cut in.
      has(all(root, "tr.el-row")[0].textContent, "DEMO_ALUMINIUM");
    });

    await test("a stack with no materials draws no Materials section", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(root, "table.mattable").length, 0);
      ok(root.textContent.indexOf("Materials") === -1, "no empty heading");
    });

    await test("a declared worksheet says it was declared, not matched by name", function () {
      var root = render(function (r) { VA.renderWorksheet(r, GEN, "# demo\n"); });
      has(all(root, ".worksheet__note")[0].textContent, "provenance.worksheet");
      has(root.textContent, "several stacks");
      // A by-name worksheet says nothing extra.
      var plain = render(function (r) { VA.renderWorksheet(r, DEMO, "# demo\n"); });
      eq(all(plain, ".worksheet__note").length, 0);
    });

    // The honesty guard that stood in for this feature, narrowed to the case the
    // projection's ARCHETYPE_LOADERS cannot close: an archetype with no loader.
    // "no checks" would be false and reassuring; say what is actually true.
    // (originally review/stack_viewer_v0, 2026-08-06)
    await test("an archetype with no loader says so instead of 'no checks'", function () {
      var base = FIXTURE.results.stacks[0];
      var generated = JSON.parse(JSON.stringify(base));
      generated.checks = [];
      generated.archetype = "some_future_archetype";
      generated.checks_generated_not_rendered = true;
      var root = render(function (r) { VA.renderStack(r, generated, CROPS, {}); });
      has(root.textContent, "GENERATED");
      has(root.textContent, "some_future_archetype");
      has(root.textContent, "NOT a stack without checks");
      has(root.textContent, "ARCHETYPE_LOADERS");

      var plain = JSON.parse(JSON.stringify(base));
      plain.checks = [];
      var plainRoot = render(function (r) { VA.renderStack(r, plain, CROPS, {}); });
      has(plainRoot.textContent, "no checks");
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
      has(root.textContent, "sha256 VERIFIED");
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

    await test("the banner surfaces the crop rollups, not just the resolved count", function () {
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: CROPS,
        }, {});
      });
      has(root.textContent, "1 sha256-verified");
      has(all(root, ".banner__crop-rules")[0].textContent, "source_ref_export 1");
    });

    await test("the banner shows which tree built each projection", function () {
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: CROPS,
        }, {});
      });
      has(root.textContent, "results ← master @ 012345678");
      has(root.textContent, "crops ← master @ 012345678");
      // Nothing is wrong with this pair, so no alarm box.
      eq(all(root, ".banner__stale").length, 0);
    });

    await test("the banner refuses to present a mismatched pair as current", function () {
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.provenance.head_sha = "fedcba9876543210fedcba9876543210fedcba98";
      crops.provenance.branch = "handoff/somebody_else";
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: crops,
        }, {});
      });
      eq(all(root, ".banner__stale").length, 1);
      has(root.textContent, "may not be what you think it is");
      has(root.textContent, "DIFFERENT trees");
      // An alarm a reader cannot act on is an alarm they learn to ignore.
      has(root.textContent, "build_viewer_projection.py");
      has(root.textContent, "build_viewer_crops.py");
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

      // --- [real] the labels, against the live crops.json ---------------------
      //
      // This block is the reason this handoff exists. The fixture tier was green
      // for four days while the live data carried a `resolved_by` value the
      // viewer had never seen, because the fixture was hand-written from an
      // older shape and no test compared the two.

      await test("[real] every rule in the live crops.json has a label", function () {
        // The guard: a new resolution rule in build_viewer_crops.py fails HERE,
        // in the tier that reads real data, rather than shipping as a silent
        // hover.
        eq(VA.unlabelledCropRules(realCrops), [],
           "teach VA.CROP_RULES every rule the crop script can emit");
        ok(Object.keys(realCrops.summary.by_resolved_by).length > 0,
           "the summary must carry the by_resolved_by rollup");
      });

      await test("[real] a source_ref_export hover names the rule, the file and the sha",
        function () {
          var entries = [];
          var byStack = realCrops.by_stack || {};
          Object.keys(byStack).forEach(function (stackId) {
            Object.keys(byStack[stackId]).forEach(function (elementId) {
              var entry = byStack[stackId][elementId];
              if (entry.status === "resolved" &&
                  entry.resolved_by === "source_ref_export") {
                entries.push([stackId, elementId, entry]);
              }
            });
          });
          ok(entries.length > 0, "the live projection must have export-resolved crops");
          entries.forEach(function (row) {
            var where = row[0] + ":" + row[1], entry = row[2];
            var line = VA.cropProvenanceLine(entry);
            has(line, "read from the export this citation names", where);
            has(line, entry.pdf_name, where);
            // Under this rule the sha is mandatory and always checked, so a live
            // entry that is not verified is a finding, not a display case.
            eq(entry.sha256_verified, true, where + " must be sha-verified");
            has(line, "sha256 VERIFIED", where);
          });
          // And it reaches the popover, not just the string function.
          var root = render(function (r) {
            VA.renderCrop(r, entries[0][2], { url: "blob:x" }, VA.CONFIG);
          });
          has(root.textContent, "sha256 VERIFIED");
          has(root.textContent, entries[0][2].pdf_name);
        });

      await test("[real] the banner reports the live verification counts", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: realResults, crops: realCrops,
          }, {});
        });
        var sha = realCrops.summary.sha256_verified;
        has(root.textContent, realCrops.summary.resolved + " resolved");
        has(root.textContent, sha["true"] + " sha256-verified");
        if (sha.unverified) {
          has(root.textContent, sha.unverified + " with no sha to check");
        }
        Object.keys(realCrops.summary.by_resolved_by).forEach(function (rule) {
          has(all(root, ".banner__crop-rules")[0].textContent,
              rule + " " + realCrops.summary.by_resolved_by[rule]);
        });
      });

      // THE ROOT CAUSE, pinned. `fixtures.js` is hand-authored, so nothing
      // stopped it describing a shape the builder had stopped emitting. This
      // compares the two key sets: a field added to (or dropped from) a real
      // entry fails here, naming the fixture as the thing to update.
      await test("[real] the fixture's crop shapes still match the builder's", function () {
        function keys(o) { return Object.keys(o).sort(); }
        var realResolved = null, realUnresolvable = null;
        var byStack = realCrops.by_stack || {};
        Object.keys(byStack).forEach(function (stackId) {
          Object.keys(byStack[stackId]).forEach(function (elementId) {
            var entry = byStack[stackId][elementId];
            if (entry.status === "resolved" && !realResolved) realResolved = entry;
            if (entry.status === "unresolvable" && !realUnresolvable) realUnresolvable = entry;
          });
        });
        ok(realResolved && realUnresolvable, "need one live entry of each status");
        eq(keys(CROPS.by_stack.demo_joint.plate), keys(realResolved),
           "fixtures.js's resolved crop entry has drifted from crops.json");
        eq(keys(CROPS.by_stack.demo_joint.washer), keys(realUnresolvable),
           "fixtures.js's unresolvable crop entry has drifted from crops.json");
        eq(keys(CROPS.summary), keys(realCrops.summary),
           "fixtures.js's crop summary has drifted from crops.json");
        eq(keys(CROPS.summary.sha256_verified), keys(realCrops.summary.sha256_verified),
           "fixtures.js's sha256_verified rollup has drifted from crops.json");
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

      // --- [real] the generated-check stacks, which is why this handoff exists --

      var thermal = VA.findStack(realResults, "hub_bearing_thermal_fit_m1");

      await test("[real] a thermal_fit stack renders its generated checks", function () {
        ok(thermal, "hub_bearing_thermal_fit_m1 must be in the projection");
        var root = render(function (r) { VA.renderStack(r, thermal, realCrops, {}); });
        eq(thermal.checks_source, "generated");
        eq(thermal.checks_generated_not_rendered, false);
        eq(all(root, "article.check").length, 16, "2 chains × 2 stages × 3 temps + 4 probes");
        has(all(root, ".check__note")[0].textContent, "thermal_fit");
      });

      await test("[real] the hot stage-1 wall term carries its 2 × soak weight", function () {
        var root = render(function (r) { VA.renderStack(r, thermal, realCrops, {}); });
        var chips = all(root, "span.chip--weighted")
          .map(function (c) { return c.textContent; });
        // 2 (diametral) × (1 + 52 × 10.3e-6) for AISI 420 at the hot corner.
        has(chips.join(" | "), "+ 2.0010712 × sleeve_wall_lower");
        has(chips.join(" | "), "− 1.00119808 × hub_bore_lower");   // AL 7050 at hot
        has(chips.join(" | "), "− 0.8 × hub_bore_lower");          // the stiffness split
        // Every non-unity coefficient in the projection got a chip, and the six
        // that did not are the ROOM-temperature terms whose soak factor is
        // exactly 1 and whose k-weight is 1 — where a silent chip is correct.
        var unity = 0, weightedTerms = 0;
        thermal.checks.forEach(function (check) {
          check.element_terms.forEach(function (term) {
            if (term.coefficient === 1) unity++; else weightedTerms++;
          });
        });
        eq([unity, weightedTerms], [6, 46], "term census");
        eq(chips.length, weightedTerms, "one chip per weighted term");
      });

      await test("[real] the four sensitivity probes are not shown as results", function () {
        var root = render(function (r) { VA.renderStack(r, thermal, realCrops, {}); });
        eq(all(root, "article.check--sensitivity").length, 4);
        has(all(root, "article.check--sensitivity")[0].textContent, "NOT A RESULT");
      });

      await test("[real] the thermal stack's CTEs and materials reach the page", function () {
        var root = render(function (r) { VA.renderStack(r, thermal, realCrops, {}); });
        eq(all(root, "tr.mat-row").length, 3);
        has(root.textContent, "23.04");     // AL 7050-T7451, the fast-growing member
        has(root.textContent, "10.3");      // AISI 420 sleeve
        // Not one CTE in the repo is traced, and the table has to say so.
        eq(all(root, "tr.mat-row").filter(function (row) {
          return row.className.indexOf("conf--untraced") !== -1;
        }).length, 3);
      });

      await test("[real] both thermal stacks resolve the one worksheet that covers them",
        async function () {
          for (var i = 0; i < 2; i++) {
            var stack = VA.findStack(realResults,
              "hub_bearing_thermal_fit_m" + (i + 1));
            eq(stack.worksheet_source, "declared");
            eq(stack.worksheet_file,
               "docs/tolerance_stacks/WORKSHEET_hub_bearing_thermal_fit.md");
            var md = await real.readText(VA.worksheetSegments(stack));
            ok(md, stack.id + "'s worksheet must be readable");
            var root = render(function (r) { VA.renderWorksheet(r, stack, md); });
            has(root.querySelector("div.worksheet__body").innerHTML, "<table>");
          }
        });

      await test("[real] no authored stack grew a coefficient on any term", function () {
        realResults.stacks.forEach(function (stackProj) {
          if (stackProj.checks_source === "generated") return;
          var root = render(function (r) { VA.renderStack(r, stackProj, realCrops, {}); });
          eq(all(root, "span.chip--weighted").length, 0, stackProj.id);
          eq(all(root, "table.mattable").length, 0, stackProj.id);
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
