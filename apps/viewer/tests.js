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
    // with non-unity coefficients, a sensitivity probe, and materials. The whole
    // projection is kept as well as the stack, because the [real] shape guards
    // read the fixture PAIR — several shapes (materials, the declared worksheet,
    // an element's material) exist only in this one.
    var GENFIX = VA.generatedFixture();
    var GEN = GENFIX.results.stacks[0];

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

    // The replacement for the prose search. `is_incomplete` used to look for the
    // literal "INCOMPLETE" in the label/guidance/check_id, so a stack that wrote
    // it in lower case — or "PARTIAL", or "budget only" — rendered as an
    // ordinary check with a fail verdict. Scope is a field now: the prose can
    // say anything at all and the flag is unmoved.
    await test("budget scope is read off the field, never off the prose", function () {
      ok(VA.isBudgetScope({ verdict_scope: "budget", label: "shank out" }));
      ok(!VA.isBudgetScope({ verdict_scope: "joint",
                             label: "x -- INCOMPLETE: y",
                             guidance: "This check is INCOMPLETE." }));
      ["x -- incomplete: y", "PARTIAL: eye unsourced", "budget only"].forEach(
        function (prose) {
          ok(VA.isBudgetScope({ verdict_scope: "budget", label: prose }), prose);
        });
      ok(!VA.isBudgetScope(null));
      ok(!VA.isBudgetScope({}));
    });

    await test("summaryChips scoreboards the stack and flags both soft spots", function () {
      var texts = VA.summaryChips(DEMO).map(function (c) { return c.text; });
      eq(texts, ["2 traced", "1 inferred", "1 UNTRACED",
                 "1 zero-width band", "1 budget-scope check"]);
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
      eq(rows.length, 4);
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
      eq(all(root, "tr.el-row").length, 4);
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

    await test("the budget-scope check is flagged and its verdict shown", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var budget = all(root, "article.check--budget");
      eq(budget.length, 1);
      has(budget[0].textContent, "BUDGET");
      has(budget[0].textContent, "fail");
      // A check is only as sourced as its weakest term.
      has(budget[0].textContent, "weakest input: UNTRACED");
    });

    // A budget rendered without the term it is a budget FOR is the misreading
    // the scope exists to prevent, one screen further down: the reader sees a
    // number and a `fail` and no statement of what is missing. The gap list
    // three sections below does not count — this is the card.
    await test("a budget-scope card names its excluded terms beside the number", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var excluded = all(all(root, "article.check--budget")[0], ".check__excluded");
      eq(excluded.length, 1);
      has(excluded[0].textContent, "link eye width");
      has(excluded[0].textContent, "budget for the missing");
    });

    await test("a joint-scope check gets no stripe, no chip and no excluded line", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var joint = all(root, "article.check").filter(function (c) {
        return c.className.indexOf("check--budget") === -1;
      });
      eq(joint.length, 1);
      eq(joint[0].textContent.indexOf("BUDGET"), -1);
      eq(all(joint[0], ".check__excluded").length, 0);
    });

    // Added in review/check_completeness_schema. A scope this viewer has no
    // branch for used to render as an ordinary joint-scope card — silence, in
    // the one place the repo has decided silence is the defect (see
    // VA.unlabelledRuleText and the four days VA.CROP_RULES sat unlabelled).
    // The reachable case is a STALE projection: one built before 2026-08-13
    // carries no `verdict_scope` at all, and nothing rebuilds the projection.
    await test("a scope the viewer has no branch for is named, not swallowed",
      function () {
        [undefined, "provisional"].forEach(function (scope) {
          var stack = JSON.parse(JSON.stringify(DEMO));
          stack.checks.forEach(function (c) {
            delete c.verdict_scope;
            if (scope !== undefined) c.verdict_scope = scope;
          });
          var root = render(function (r) { VA.renderStack(r, stack, CROPS, {}); });
          var cards = all(root, "article.check");
          eq(cards.length, 2, String(scope));
          cards.forEach(function (card) {
            has(card.textContent, "SCOPE UNKNOWN");
          });
          has(VA.unlabelledVerdictScopeText(scope),
              JSON.stringify(scope === undefined ? null : scope));
        });
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
      eq(triggers.length, 4);
      // The grip is a second `no-entry`: a citation the crop script has not been
      // run for is a different fact from one it could not resolve, and the
      // spec-pile row must not get a crop it has not earned just because its
      // export block is legitimately absent.
      eq(triggers.map(function (t) { return t.cropEntry.status; }),
         ["resolved", "unresolvable", "no-entry", "no-entry"]);
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
      eq(statuses, ["not-built", "not-built", "not-built", "not-built"]);
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

    // --- source_ref.export: WHICH BYTES the number was read off --------------
    //
    // Every live citation has carried this block since 2026-08-06 and the viewer
    // rendered none of it until 2026-08-12
    // (ISSUE_20260811_viewer_shows_nothing_for_source_ref_export). The asymmetry
    // is the reason it was a bug and not a missing nicety: the crop hover said
    // "sha256 VERIFIED", but only for a citation whose crop RESOLVED — so a fact
    // about the citation was reachable only through a crop, and the citations
    // whose crop cannot resolve are exactly the ones a reviewer needs it for.

    await test("exportProvenance keeps the four export states apart", function () {
      var refs = DEMO.stack.elements;
      eq(VA.exportProvenance(refs[0].source_ref).state, "established");
      eq(VA.exportProvenance(refs[1].source_ref).state, "unestablished");
      // No `export` key at all, and no identity rule either: 22 of the 48 live
      // citations (21 workbook, 1 assumed). A different fact from `unestablished`
      // — that one is a recorded finding with a reason, this is a citation nobody
      // has been through. The other 4 of the 26 with no `export` key are the
      // spec-pile ones, and since 2026-08-13 they are their own state below.
      eq(VA.exportProvenance(refs[2].source_ref).state, "none");
      // A status this viewer has never heard of must be LOUD, not silent — the
      // same lesson VA.CROP_RULES learned the hard way.
      var stranger = VA.exportProvenance({ export: { status: "provisional" } });
      eq(stranger.state, "unlabelled");
      eq(stranger.loud, true);
      has(stranger.headline, "\"provisional\"");
      has(stranger.headline, "no branch for");
      // And no citation at all says nothing here: citationWhere already says it.
      eq(VA.exportProvenance(null), null);
    });

    await test("only the unidentifiable states are loud", function () {
      var refs = DEMO.stack.elements;
      eq(VA.exportProvenance(refs[0].source_ref).loud, false);
      eq(VA.exportProvenance(refs[1].source_ref).loud, true);
      // `none` is stated plainly, not alarmed: for a workbook or assumed source
      // there is no exported PDF to name, and a red row on 26 of 48 citations is
      // an alarm a reader learns to ignore.
      eq(VA.exportProvenance(refs[2].source_ref).loud, false);
    });

    // The viewer cannot hash a file, so the only honest claim it can make about
    // an export's sha is that the stack wrote one down. VERIFIED belongs to the
    // crop hover, where build_viewer_crops.py really did compare bytes — and
    // "recorded" reading as "verified" is the same collapse VA.cropShaText exists
    // to prevent one layer up.
    await test("an export's sha is RECORDED, never described as verified", function () {
      var line = VA.exportProvenanceLine(DEMO.stack.elements[0].source_ref);
      has(line, "sha256 recorded (a1b2c3d4e5f6…)");
      ok(line.indexOf("VERIFIED") === -1, "the viewer verifies nothing: " + line);
      has(VA.exportShaText({ status: "established" }), "NO sha256 recorded");
    });

    await test("an established export names the file, the sha and the runs", function () {
      var line = VA.exportProvenanceLine(DEMO.stack.elements[0].source_ref);
      // The BASENAME, because the live paths are absolute and 90 characters long.
      has(line, "export established: 215197.pdf");
      has(line, "drawing-checker runs: 20260804_114000_x");
      // An export no run ever consumed says so — 15 of the 22 live established
      // CITATIONS are in that state (6 of the 9 distinct exports they name), and
      // a blank would read as a missing record rather than an empty one.
      has(VA.exportProvenanceLine({
        export: { status: "established", pdf: "C:/x/y.pdf", sha256: "ab", runs: [] },
      }), "no drawing-checker run has consumed this export");
    });

    await test("an unestablished export leads with the why, not with the file", function () {
      var line = VA.exportProvenanceLine(DEMO.stack.elements[1].source_ref);
      has(line, "EXPORT UNESTABLISHED");
      has(line, "none hashes to the one this .032\" was read off");
      // No sha clause at all: an unestablished export carries no sha by
      // construction (SourceExport raises if it does), so "NO sha256 recorded"
      // would read as a second, separate failing when it is the same one.
      ok(line.indexOf("sha256") === -1, "no sha clause on an unestablished export");
    });

    // The link treatment is REUSED from the crop popover rather than invented,
    // and it stops exactly where the data stops: an export carries a run ID, and
    // drawing-checker addresses a run by its DIRECTORY name — the id plus the
    // drawing. A URL built from the id alone would be a guess, which is the same
    // class of mistake as a crop of a guessed export.
    await test("a run id is linked only where the crop entry supplies the run dir", function () {
      var exportBlock = {
        status: "established",
        runs: [{ run_id: "20260409_170546" }, { run_id: "20260409_172341" }],
      };
      var resolved = { status: "resolved", run_id: "20260409_170546",
                       run_dir: "20260409_170546_215197_A.1" };
      var links = VA.exportRunLinks(VA.CONFIG, exportBlock, resolved);
      eq(links.length, 2);
      has(links[0].url, "/run/20260409_170546_215197_A.1");
      eq(links[1].url, null, "the second run's directory name is unknown here");
      // The fixture's own crop resolved through the export rather than a run, so
      // it carries no run_dir and nothing is linkable.
      eq(VA.exportRunLinks(VA.CONFIG, exportBlock, CROPS.by_stack.demo_joint.plate)
         .map(function (l) { return l.url; }), [null, null]);
      // An unresolvable crop supplies nothing either, and the ids still print.
      eq(VA.exportRunLinks(VA.CONFIG, exportBlock,
                           CROPS.by_stack.demo_joint.washer).length, 2);
      // A run entry with no id is named rather than rendered as an empty link.
      has(VA.exportRunIds({ runs: [{ ts: "2026-08-04T00:00:00+00:00" }] })[0],
          "no id");
    });

    await test("baseName survives both slash conventions", function () {
      eq(VA.baseName("C:\\workspace\\drawing-checker\\a b, c.pdf"), "a b, c.pdf");
      eq(VA.baseName("/tmp/x.pdf"), "x.pdf");
      eq(VA.baseName(null), null);
    });

    // --- source_ref.export, on the page --------------------------------------

    await test("an established export reaches the element row", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var box = all(root, "div.el-export--established");
      eq(box.length, 1);
      has(box[0].textContent, "export established: 215197.pdf");
      has(box[0].textContent, "sha256 recorded");
      has(box[0].textContent, "20260804_114000_x");
      // The absolute path beside the basename, for the same reason the crop
      // popover prints it: a file:// link only navigates from a file:// page, and
      // copy-paste is the fallback that always works.
      has(all(root, "div.el-export__path")[0].textContent, "C:/workspace/demo/215197.pdf");
      // The export's own note is clamped like the citation's, and does NOT reuse
      // its class — a selector for one must never pick up the other.
      var note = all(root, "div.el-export__note")[0];
      ok(note, "the export note is rendered");
      has(note.textContent, "hashes nothing");
      ok(note.className.indexOf("--open") === -1, "clamped by default");
      note.click();
      has(note.className, "el-export__note--open");
    });

    // THE DELIVERABLE. The stack states outright that the bytes behind this
    // number cannot be identified, with a recorded reason — and until this test
    // existed the row showed the same "inferred" chip as a citation whose export
    // is nailed down.
    await test("an unestablished export is loud on the row and shows its why", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var box = all(root, "div.el-export--unestablished");
      eq(box.length, 1);
      ok(box[0].className.indexOf("el-export--loud") !== -1, "must be loud");
      has(box[0].textContent, "EXPORT UNESTABLISHED");
      // The reason, unclamped and not behind a hover: it was reachable only
      // through a crop popover before, and hiding it behind a second click here
      // would reproduce that defect one notch down.
      var why = all(root, "div.el-export__why");
      eq(why.length, 1);
      has(why[0].textContent, "none hashes to the one this .032\" was read off");
      // Legible from the ROW, which is the question the handoff asks: a filled
      // chip beside the confidence chip, on the washer's row and no other.
      var chips = all(root, "span.chip--export-unestablished");
      eq(chips.length, 1);
      has(chips[0].textContent, "EXPORT UNESTABLISHED");
      var rows = all(root, "tr.el-row");
      has(rows[1].textContent, "EXPORT UNESTABLISHED");
      ok(rows[0].textContent.indexOf("EXPORT UNESTABLISHED") === -1,
         "the established row is not tarred with it");
    });

    // ...and it says so WITHOUT a crop, which is the whole asymmetry argument:
    // the washer's crop is unresolvable and its reason lives in a popover nobody
    // has opened.
    await test("the unestablished why needs no crop to be resolved", function () {
      eq(VA.cropFor(CROPS, "demo_joint", "washer").status, "unresolvable");
      var root = render(function (r) { VA.renderStack(r, DEMO, null, {}); });
      has(all(root, "div.el-export__why")[0].textContent, "none hashes to the one");
      has(root.textContent, "EXPORT UNESTABLISHED");
    });

    await test("a citation with no export block says so rather than nothing", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var box = all(root, "div.el-export--none");
      eq(box.length, 1);
      has(box[0].textContent, "names no exported file");
      // Not loud, and no chip: see the comment on the state in views/stack.js.
      ok(box[0].className.indexOf("--loud") === -1);
    });

    // --- identity_rule: the citation that names no export AND IS RIGHT NOT TO --
    //
    // `none` above is the honest reading for a workbook or an assumed value. It is
    // the WRONG reading for a spec-pile citation: the pile is append-only, so the
    // filename identifies the bytes and there is no export to name. Four live
    // citations are `traced` in that state, and until 2026-08-13 the rule that
    // makes the pair legitimate was statable only on the crop entry
    // (ISSUE_20260812_four_traced_spec_citations_carry_no_export_block).

    await test("the spec-pile identity rule replaces the no-export sentence", function () {
      var grip = DEMO.stack.elements[3].source_ref;
      var p = VA.exportProvenance(grip, "spec_pile_filename");
      eq(p.state, "identity_rule");
      eq(p.headline,
         "Spec-pile document: identity by filename (append-only pile)");
      // Not loud: this says the bytes ARE identified, by a rule this repo argued
      // for. It is a sibling of `established`, not of `unestablished`.
      eq(p.loud, false);
      // The MARKER does this, not the citation's `kind` — the projection derives
      // it (build_viewer_projection.identity_rule_of_ref) and the viewer computes
      // nothing. Hand the same citation no marker and it is the plain no-export
      // state again.
      eq(VA.exportProvenance(grip).state, "none");
    });

    await test("an export block still wins over an identity rule", function () {
      // The projection cannot produce this pair (the marker requires the absence
      // of an export), and the precedence is asserted anyway because it is the one
      // build_viewer_crops.resolve_pdf applies: an export block identifies the
      // bytes wherever there is one. A viewer that let a derived marker overrule
      // an authored export would be showing a weaker claim than the data makes.
      var p = VA.exportProvenance(DEMO.stack.elements[0].source_ref,
                                  "spec_pile_filename");
      eq(p.state, "established");
    });

    await test("an identity rule the viewer has no branch for is loud, not silent", function () {
      var p = VA.exportProvenance(DEMO.stack.elements[3].source_ref, "sha_of_pile");
      eq(p.state, "identity_unlabelled");
      eq(p.loud, true);
      has(p.headline, "\"sha_of_pile\"");
      has(p.headline, "no branch for");
      // The failure this prevents: falling through to "nothing here identifies the
      // bytes" would state the OPPOSITE of what the projection just said.
      ok(p.headline.indexOf("names no exported file") === -1);
    });

    await test("the spec-pile line carries the rule's argument, not only its name",
      function () {
        var line = VA.exportProvenanceLine(DEMO.stack.elements[3].source_ref,
                                           "spec_pile_filename");
        has(line, "identity by filename");
        has(line, "append-only");
        ok(line.indexOf("names no exported file") === -1,
           "the no-export sentence must be replaced, not appended to: " + line);
      });

    await test("the spec-pile row says what identifies its bytes, on the page", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var box = all(root, "div.el-export--identity_rule");
      eq(box.length, 1);
      has(box[0].textContent, "identity by filename (append-only pile)");
      // The argument for the state, unclamped and not behind a hover — same rule
      // as an unestablished export's `why`.
      has(all(root, "div.el-export__detail")[0].textContent, "append-only");
      ok(box[0].className.indexOf("--loud") === -1, "not an alarm");
      // No chip: a chip on a state that is fine is a chip nobody reads. And the
      // row is still `traced`, which is now readable rather than alarming.
      eq(all(root, "span.chip--export-identity_rule").length, 0);
      var rows = all(root, "tr.el-row");
      has(rows[3].textContent, "fastener grip (spec pile)");
      ok(rows[3].textContent.indexOf("names no exported file") === -1,
         "the four spec citations must stop reading as 'nothing identifies this'");
    });

    await test("an identity rule the viewer cannot explain is loud on the row", function () {
      var poisoned = JSON.parse(JSON.stringify(DEMO));
      poisoned.elements[3].identity_rule = "sha_of_pile";
      var root = render(function (r) { VA.renderStack(r, poisoned, CROPS, {}); });
      var box = all(root, "div.el-export--identity_unlabelled");
      eq(box.length, 1);
      ok(box[0].className.indexOf("el-export--loud") !== -1);
      has(all(root, "span.chip--export-identity_unlabelled")[0].textContent,
          "IDENTITY RULE UNKNOWN");
      // Its own chip class and its own wording: calling an unknown identity rule
      // "EXPORT STATUS UNKNOWN" would send a reader looking for a field this
      // citation does not have.
      eq(all(root, "span.chip--export-unlabelled").length, 0);
    });

    // DELIVERABLE 3: the rule is written where a reader of the row can find it,
    // on the surface itself rather than in a lesson.
    await test("the sourcing legend states the spec-pile exception", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      var legend = all(root, "details.sv__legend");
      eq(legend.length, 1);
      has(legend[0].textContent, "How to read the sourcing column");
      has(legend[0].textContent, "append-only");
      // The legend quotes the table rather than re-typing the sentence, so the two
      // cannot drift.
      has(legend[0].textContent,
          VA.IDENTITY_RULES.spec_pile_filename.headline);
      // And it says why the OTHER no-export rows are a different fact.
      has(legend[0].textContent, "must name the EXPORT");
    });

    await test("an export status the viewer cannot explain is loud on the row", function () {
      var poisoned = JSON.parse(JSON.stringify(DEMO));
      poisoned.stack.elements[0].source_ref.export = { status: "provisional" };
      var root = render(function (r) { VA.renderStack(r, poisoned, CROPS, {}); });
      var box = all(root, "div.el-export--unlabelled");
      eq(box.length, 1);
      ok(box[0].className.indexOf("el-export--loud") !== -1);
      has(box[0].textContent, "\"provisional\"");
      has(all(root, "span.chip--export-unlabelled")[0].textContent,
          "EXPORT STATUS UNKNOWN");
      // The unestablished chip's class is NOT reused for it: the two states are
      // different facts and a stylesheet must be able to tell them apart, even
      // though today they share one loud rule. The one on the page is the
      // washer's, which this poisoning did not touch.
      eq(all(root, "span.chip--export-unestablished").length, 1);
      eq(all(root, "div.el-export--unestablished").length, 1);
    });

    // --- material provenance: the sourcing OF A NUMBER -----------------------

    await test("valuesProvenance says what kind of record a CTE is", function () {
      var entries = GEN.materials.map(function (m) { return m.material; });
      eq(VA.valuesProvenance(entries[0]).state, "inline");
      eq(VA.valuesProvenance(entries[0]).loud, false);
      has(VA.valuesProvenance(entries[0]).text, "transcribed INLINE");
      // `not_transcribed` is loud: nobody read this number off anything.
      eq(VA.valuesProvenance(entries[2]).state, "not_transcribed");
      eq(VA.valuesProvenance(entries[2]).loud, true);
      has(VA.valuesProvenance(entries[2]).text, "NOT TRANSCRIBED");
      // `library` — no live entry and no fixture entry is in this state (no
      // materials library exists yet), so it is exercised inline. It is the state
      // the whole field is FOR: `spec_library:NAS6403U11D` is the provenance of a
      // number, and the CTE column would be a cross-check rather than the record.
      var library = VA.valuesProvenance({ values_status: "library",
                                          library_ref: "spec_library:AL_7050" });
      eq(library.state, "library");
      eq(library.loud, false);
      has(library.text, "spec_library:AL_7050");
      has(library.text, "CROSS-CHECK");
      // ...and `library` with NO library_ref is a self-contradiction, so it is
      // loud. The schema does not forbid it (thermal.py validates the pair no
      // further), which is exactly why the viewer has to.
      var broken = VA.valuesProvenance({ values_status: "library", library_ref: null });
      eq(broken.loud, true);
      has(broken.text, "names NO library_ref");
      // An unknown status gets the loud unlabelled treatment, same as an export's.
      var stranger = VA.valuesProvenance({ values_status: "estimated" });
      eq(stranger.state, "unlabelled");
      eq(stranger.loud, true);
      has(stranger.text, "\"estimated\"");
    });

    await test("appliedOverText prints every soak range and compares none", function () {
      eq(VA.appliedOverText([[20, 72], [20, -20]]), "applied over 20 … 72, 20 … -20 °C");
      // Empty and absent both mean "this stack does not say", and neither may be
      // rendered as a range.
      eq(VA.appliedOverText([]), null);
      eq(VA.appliedOverText(null), null);
    });

    await test("the materials table renders the provenance of the NUMBER", function () {
      var root = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      var rows = all(root, "tr.mat-row");
      // What kind of record each CTE is — three rows that looked identical here
      // until 2026-08-12.
      eq(all(root, "div.mat-row__values").length, 3);
      has(rows[0].textContent, "transcribed INLINE");
      has(rows[2].textContent, "CTE NOT TRANSCRIBED");
      // ...and the loudest one is legible from the row, not only from the prose.
      eq(all(root, "span.chip--values-not_transcribed").length, 1);
      has(all(root, "div.mat-row__values--loud")[0].textContent, "NOT TRANSCRIBED");
      // The ranges, paired: what the source quoted the mean over, and what this
      // stack applies it over. The aluminium quotes none and is applied over one.
      has(rows[0].textContent, "— not stated");
      has(all(root, "div.mat-row__applied")[0].textContent, "applied over 20 … 72 °C");
      has(rows[1].textContent, "20 … 100");
      // The DESIGNATION's own citation. Its confidence chip has been there since
      // the table shipped; where the name came from had not.
      var desig = all(root, "div.mat-row__desig");
      eq(desig.length, 3);
      has(desig[0].textContent, "designation from: DEMO-1 · rev A · sheet 1 · NOTES · zone D9");
      has(rows[0].textContent, "PRODUCE FROM DEMO ALUMINIUM T7451");
      // A material with no designation_source says so rather than showing a blank.
      has(desig[2].textContent, "no source_ref");
      // The outstanding ask for a real value, where one is recorded.
      var requests = all(root, "div.mat-row__request");
      eq(requests.length, 2, "the stainless records no CINDAS request");
      has(requests[0].textContent, "CINDAS request on record");
      has(requests[0].textContent, "would make the fit looser than analysed");
    });

    await test("library_ref renders whatever the status says", function () {
      // Reading it only under `values_status: "library"` would be the same silent
      // drop this handoff exists to end, one field along — and the schema permits
      // an `inline` entry to name one.
      var poisoned = JSON.parse(JSON.stringify(GEN));
      poisoned.materials[0].material.library_ref = "spec_library:AL_7050_T7451";
      eq(VA.valuesProvenance(poisoned.materials[0].material).state, "inline");
      var root = render(function (r) { VA.renderStack(r, poisoned, null, {}); });
      var refs = all(root, "div.mat-row__libref");
      eq(refs.length, 1);
      has(refs[0].textContent, "library_ref: spec_library:AL_7050_T7451");
      // Null on every live and fixture entry, and a null must render nothing at
      // all rather than an empty label.
      var plain = render(function (r) { VA.renderStack(r, GEN, null, {}); });
      eq(all(plain, "div.mat-row__libref").length, 0);
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
      // The washer's export is `unestablished`, which build_viewer_crops.py
      // short-circuits to unresolvable carrying the `why` through: a crop the
      // reviewer cannot get is a finding about the stack, and it is only
      // actionable if the popover says which finding.
      has(root.textContent, "is unestablished");
      has(root.textContent, "none hashes to the one");
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

      await test("[real] the pitch-link stack renders its two budget-scope checks", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        var budget = all(root, "article.check--budget");
        eq(budget.length, 2);
        // The live migration off the `-- INCOMPLETE:` label suffix: the schema
        // field is what raises the stripe now, so the shout is gone from the
        // label and the excluded term is on the card instead.
        has(budget[0].textContent, "spherical bearing");
        eq(root.textContent.indexOf("INCOMPLETE:"), -1);
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

      // --- [real] tier 1: the SHAPES ------------------------------------------
      //
      // The same guard as the crop one above, over every other shape the
      // projection writes. Key UNIONS, not per-object equality: both sides
      // legitimately vary — a citation with no zone carries no `zone` key — and
      // the drift being hunted is one-directional, the builder GROWS a field and
      // the hand-authored fixture never hears about it. The reverse direction is
      // checked too, against a per-shape allowlist, because a fixture field the
      // builder cannot produce is the other half of the same bug.
      //
      // WHAT THIS TIER CANNOT DO: the failure that started all of this was a
      // stale *value* in a field that was present and correctly named. No key-set
      // diff would have caught it. Tier 2 below is the one that does.

      function flat(lists) { return Array.prototype.concat.apply([], lists); }

      function keyUnion(objects) {
        var seen = {};
        objects.forEach(function (o) {
          if (o && typeof o === "object") {
            Object.keys(o).forEach(function (k) { seen[k] = true; });
          }
        });
        return Object.keys(seen).sort();
      }

      function minus(keys, drop) {
        return keys.filter(function (k) { return drop.indexOf(k) === -1; });
      }

      // Collectors. Each pulls every instance of one shape out of a whole
      // projection, so the fixture and the live data are read by the same code
      // and cannot be compared through two different readings.
      function stacksIn(r) { return (r && r.stacks) || []; }
      function rawIn(r) {
        return stacksIn(r).map(function (s) { return s.stack; }).filter(Boolean);
      }
      function rawElementsIn(r) {
        return flat(rawIn(r).map(function (s) { return s.elements || []; }));
      }
      function derivedIn(r) {
        return flat(stacksIn(r).map(function (s) { return s.elements || []; }));
      }
      function materialsIn(r) {
        return flat(stacksIn(r).map(function (s) { return s.materials || []; }));
      }
      function materialEntriesIn(r) {
        return materialsIn(r).map(function (m) { return m.material; }).filter(Boolean);
      }
      // Every source_ref-SHAPED object the builder writes: an element's citation,
      // and a material's two — where the CTE came from and, separately, where the
      // designation came from. One shape, three slots, so one guard.
      function refsIn(r) {
        return flat([
          rawElementsIn(r).map(function (e) { return e.source_ref; }),
          materialEntriesIn(r).map(function (m) { return m.values_source; }),
          materialEntriesIn(r).map(function (m) { return m.designation_source; }),
        ]).filter(Boolean);
      }
      function exportsIn(r) {
        return refsIn(r).map(function (x) { return x.export; }).filter(Boolean);
      }
      function checksIn(r) {
        return flat(stacksIn(r).map(function (s) { return s.checks || []; }));
      }
      function pathsIn(r) {
        return flat(stacksIn(r).map(function (s) { return s.paths || []; }));
      }
      function gapsIn(r) {
        return flat(stacksIn(r).map(function (s) { return s.gaps || []; }));
      }
      function cropEntriesIn(c) {
        var byStack = (c && c.by_stack) || {};
        return flat(Object.keys(byStack).map(function (stackId) {
          return Object.keys(byStack[stackId]).map(function (elementId) {
            return byStack[stackId][elementId];
          });
        }));
      }

      // An archetype's own INPUT block is keyed by the archetype's name
      // (`thermal_fit`), read by that archetype's loader in Python and by nothing
      // in the viewer. Skipped by a name COMPUTED FROM THE DATA rather than a
      // literal, so adding an archetype does not need this line edited — and the
      // fixture is not asked to invent a synthetic block for one.
      function archetypeNames(r) {
        return stacksIn(r).map(function (s) { return s.archetype; }).filter(Boolean);
      }

      var SIDES = {
        results: { fixture: [FIXTURE.results, GENFIX.results], live: [realResults] },
        crops: { fixture: [CROPS], live: [realCrops] },
      };

      var SHAPES = [
        { name: "results (top level)", of: "results",
          collect: function (r) { return [r]; } },
        { name: "stacks[] — the projected stack", of: "results", collect: stacksIn },
        { name: "stacks[].stack — the authored stack file, verbatim", of: "results",
          collect: rawIn, ignoreLive: archetypeNames(realResults) },
        { name: "stacks[].stack.elements[]", of: "results", collect: rawElementsIn },
        { name: "source_ref (element citation, material values_source and " +
                "designation_source)", of: "results", collect: refsIn },
        { name: "source_ref.export", of: "results", collect: exportsIn,
          // Required when the status is `unestablished`, forbidden when it is
          // `established` — and nothing in the repo is unestablished today, which
          // is precisely why the fixture holds the state.
          fixtureOnly: ["why"] },
        { name: "stacks[].elements[] — the derived flags", of: "results",
          collect: derivedIn },
        { name: "stacks[].materials[]", of: "results", collect: materialsIn },
        { name: "stacks[].materials[].material", of: "results",
          collect: materialEntriesIn },
        { name: "stacks[].checks[]", of: "results", collect: checksIn },
        { name: "stacks[].paths[]", of: "results", collect: pathsIn },
        { name: "stacks[].paths[].interval", of: "results",
          collect: function (r) { return pathsIn(r).map(function (p) { return p.interval; }); } },
        { name: "stacks[].gaps[]", of: "results", collect: gapsIn },
        { name: "hardware_entries", of: "results",
          collect: function (r) { return [r.hardware_entries]; } },
        { name: "crops (top level)", of: "crops",
          collect: function (c) { return [c]; } },
        { name: "crops.unresolved[]", of: "crops",
          collect: function (c) { return c.unresolved || []; } },
      ];

      await test("[real] every fixture shape still matches the builder's", function () {
        var drift = [];
        SHAPES.forEach(function (shape) {
          var side = SIDES[shape.of];
          var mine = keyUnion(flat(side.fixture.map(shape.collect)));
          var theirs = keyUnion(flat(side.live.map(shape.collect)));
          if (!theirs.length) {
            drift.push(shape.name + ": no live instance of this shape — either " +
              "the collector in tests.js is wrong or the builder stopped writing it");
            return;
          }
          var missing = minus(theirs, mine.concat(shape.ignoreLive || []));
          var extra = minus(mine, theirs.concat(shape.fixtureOnly || []));
          if (missing.length) {
            drift.push(shape.name + ": the projection writes [" + missing.join(", ") +
              "] and apps/viewer/fixtures.js does not — ADD THEM TO fixtures.js, " +
              "so a fixture-tier test can pin how the viewer renders them");
          }
          if (extra.length) {
            drift.push(shape.name + ": apps/viewer/fixtures.js writes [" +
              extra.join(", ") + "] and no live object does — REMOVE THEM FROM " +
              "fixtures.js, or list them in this shape's `fixtureOnly` with the " +
              "reason the fixture holds a state the repo does not");
          }
        });
        eq(drift, [], "fixtures.js has drifted from the live projection");
      });

      // --- [real] tier 2: the VALUES ------------------------------------------
      //
      // THE GUARD THAT CATCHES THE BUG THAT ACTUALLY HAPPENED. `resolved_by:
      // "provenance.sources_used"` was a stale VALUE in a field that was present
      // and correctly named, so every key-set test above passes straight through
      // it. This asks the other question, per enumerated field: does the live
      // data hold a value the viewer has no branch for?
      //
      // `known` asks the VIEWER wherever the viewer owns the table — CROP_RULES,
      // confidenceClass, verdictClass. That is the strong form: there is nothing
      // to keep in sync, and teaching the viewer a value teaches the guard. Where
      // the branch is a chain of `if`s or a set of CSS rules there is nothing to
      // ask, so the row carries the vocabulary as a list plus a pointer to the
      // line that owns it — a pinned live vocabulary, which still fails loudly on
      // a new value but has to be re-read by hand when the code changes.
      //
      // Rows whose branch is "NONE" are fields the viewer does not switch on at
      // all. Pinning their live vocabulary is the only guard available and is
      // worth having: it is how the next new value gets noticed instead of
      // silently rendering as the old one.

      var SENTINEL = "__no_viewer_branch_can_exist_for_this__";

      function inList(list) {
        return function (value) { return list.indexOf(value) !== -1; };
      }
      function distinct(values) {
        var seen = {}, out = [];
        values.forEach(function (v) {
          var key = v === undefined ? "\u0000undefined" : JSON.stringify(v);
          if (!seen[key]) { seen[key] = true; out.push(v); }
        });
        return out;
      }
      function resolvedCrops(c) {
        return cropEntriesIn(c).filter(function (e) { return e.status === "resolved"; });
      }

      var VALUE_GUARDS = [
        { field: "source_ref.confidence and elements[].confidence",
          branch: "VA.CONFIDENCES, through VA.confidenceClass",
          known: function (v) { return VA.confidenceClass(v) !== "conf--unknown"; },
          values: function (r) {
            return refsIn(r).map(function (x) { return x.confidence; })
              .concat(derivedIn(r).map(function (d) { return d.confidence; }));
          } },
        { field: "materials[].confidence and materials[].designation_confidence",
          branch: "VA.CONFIDENCES — the CTE's sourcing and the designation's are " +
            "separate values through the same table",
          known: function (v) { return VA.confidenceClass(v) !== "conf--unknown"; },
          values: function (r) {
            return flat(materialsIn(r).map(function (m) {
              return [m.confidence, m.designation_confidence];
            }));
          } },
        { field: "checks[].worst_confidence and paths[].worst_confidence",
          branch: "VA.CONFIDENCES — an unknown one renders as an em dash beside " +
            "'weakest input:', which reads as 'nothing to say' rather than as a gap",
          known: function (v) { return VA.confidenceClass(v) !== "conf--unknown"; },
          values: function (r) {
            return checksIn(r).map(function (c) { return c.worst_confidence; })
              .concat(pathsIn(r).map(function (p) { return p.worst_confidence; }));
          } },
        { field: "checks[].verdict_scope",
          branch: "VA.VERDICT_SCOPES — an unknown scope raises no stripe and no " +
            "chip, so an incomplete check would render as an ordinary one: the " +
            "exact misreading the field replaced the INCOMPLETE prose search to " +
            "prevent (ISSUE_20260805_check_result_has_no_complete_flag)",
          known: function (v) { return !!VA.VERDICT_SCOPES[v]; },
          values: function (r) {
            return checksIn(r).map(function (c) { return c.verdict_scope; });
          } },
        { field: "checks[].verdict",
          branch: "VA.verdictClass",
          known: function (v) { return VA.verdictClass(v) !== "verdict--unknown"; },
          values: function (r) {
            return checksIn(r).map(function (c) { return c.verdict; });
          } },
        { field: "crop entry resolved_by",
          branch: "VA.CROP_RULES — THE ONE THAT WOULD HAVE CAUGHT THE ORIGINAL BUG",
          known: function (v) { return !!VA.CROP_RULES[v]; },
          values: function (r, c) {
            return resolvedCrops(c).map(function (e) { return e.resolved_by; });
          } },
        { field: "crop entry located_by",
          branch: "the located_by chain in VA.cropProvenanceLine (viewer.js) — an " +
            "unknown one drops the whole 'where on the sheet' clause silently",
          known: inList(["zone_cell", "callout_text", "sheet_full"]),
          values: function (r, c) {
            return resolvedCrops(c).map(function (e) { return e.located_by; });
          } },
        { field: "crop entry status",
          branch: "VA.cropFor + unresolvedHeadline in views/crop.js + the " +
            ".croppop--* rules in index.html. `unresolvable` is the DEFAULT arm, " +
            "so a new status renders as 'Crop unresolvable' — a lie, not a gap",
          known: inList(["resolved", "unresolvable", "not-built", "no-entry"]),
          values: function (r, c) {
            return cropEntriesIn(c).map(function (e) { return e.status; });
          } },
        { field: "stacks[].worksheet_source",
          branch: "views/worksheet.js — only `declared` earns the 'one worksheet " +
            "may cover several stacks' note; `by_name` and null are the silent " +
            "default, correctly",
          known: inList(["declared", "by_name", null]),
          values: function (r) {
            return stacksIn(r).map(function (s) { return s.worksheet_source; });
          } },
        { field: "stacks[].checks_source",
          branch: "VA.summaryChips + views/stack.js — only `generated` raises the " +
            "chip and the 'not authored in this file' note",
          known: inList(["generated", "authored"]),
          values: function (r) {
            return stacksIn(r).map(function (s) { return s.checks_source; });
          } },
        { field: "gaps[].kind",
          branch: "the .gap--* and .chip--gap-* rules in index.html — a new kind " +
            "gets the class and no styling, so it reads as an ordinary gap",
          known: inList(["excluded_from_model", "hardware_entry"]),
          values: function (r) {
            return gapsIn(r).map(function (g) { return g.kind; });
          } },
        { field: "source_ref.kind and elements[].kind",
          branch: "NONE — every kind gets the same .chip--kind styling and is " +
            "printed verbatim. Pinned so that a new kind is a decision, not a " +
            "silent new chip",
          known: inList(["drawing", "parts_list", "spec", "workbook", "assumed"]),
          values: function (r) {
            return refsIn(r).map(function (x) { return x.kind; })
              .concat(derivedIn(r).map(function (d) { return d.kind; }));
          } },
        // These two rows were `known: NONE` — a pinned live vocabulary, because
        // the viewer had no branch for either field — until
        // viewer_export_and_material_provenance landed on 2026-08-12. They are
        // now the STRONG form: they ask the viewer's own table, so teaching the
        // viewer a value teaches the guard and there is nothing to keep in sync.
        { field: "materials[].material.values_status",
          branch: "VA.VALUES_STATUSES, through VA.valuesProvenance — `library` no " +
            "longer looks like `inline` on screen: one says the CTE column is a " +
            "cross-check of the projection named in `library_ref`, the other says " +
            "it is the record",
          known: function (v) { return !!VA.VALUES_STATUSES[v]; },
          values: function (r) {
            return materialEntriesIn(r).map(function (m) { return m.values_status; });
          } },
        // Added 2026-08-13 (spec_citation_identity_rendering). `null` is the
        // overwhelming majority and is a real answer — "no rule, because an export
        // block identifies the bytes, or because nothing does" — so it is known by
        // construction rather than by a table entry. A rule the viewer has no
        // branch for renders as the loud `identity_unlabelled` block; this row is
        // what makes that a test failure rather than a reader's discovery.
        { field: "stacks[].elements[].identity_rule",
          branch: "VA.IDENTITY_RULES, through VA.exportProvenance — the derived " +
            "marker that lets a spec-pile citation say what identifies its bytes " +
            "instead of saying that nothing does " +
            "(ISSUE_20260812_four_traced_spec_citations_carry_no_export_block)",
          known: function (v) {
            return v === null || v === undefined || !!VA.IDENTITY_RULES[v];
          },
          values: function (r) {
            return derivedIn(r).map(function (d) { return d.identity_rule; });
          } },
        { field: "source_ref.export.status",
          branch: "VA.EXPORT_STATUSES, through VA.exportProvenance — a status " +
            "outside the table renders as the loud unlabelled block rather than " +
            "falling through to silence, which is what the viewer did with the " +
            "WHOLE export block until 2026-08-12 " +
            "(ISSUE_20260811_viewer_shows_nothing_for_source_ref_export)",
          known: function (v) { return !!VA.EXPORT_STATUSES[v]; },
          values: function (r) {
            return exportsIn(r).map(function (e) { return e.status; });
          } },
      ];

      await test("[real] no live value is one the viewer has no branch for", function () {
        var unexplained = [];
        VALUE_GUARDS.forEach(function (guard) {
          var values = distinct(guard.values(realResults, realCrops));
          if (!values.length) {
            unexplained.push(guard.field + ": no live value found — either the " +
              "collector in tests.js is wrong or the builder stopped writing it");
            return;
          }
          values.forEach(function (value) {
            if (!guard.known(value)) {
              unexplained.push(guard.field + " = " + JSON.stringify(value) +
                " is in the live projection and the viewer has no branch for it. " +
                "Branch table: " + guard.branch);
            }
          });
        });
        eq(unexplained, [], "teach the viewer these values — or fix the builder " +
          "that emitted them");
      });

      // A guard that cannot fail is documentation. This is exactly the half the
      // original bug got past: VA.CROP_RULES was a real branch table and nothing
      // compared the live values against it, so a rule the script had deleted sat
      // in the fixture for four days looking handled.
      await test("[real] each value guard bites when fed a value nothing can explain",
        function () {
          var toothless = VALUE_GUARDS.filter(function (guard) {
            return guard.known(SENTINEL);
          }).map(function (guard) { return guard.field; });
          eq(toothless, [], "these guards accept any value at all, so they are " +
            "not guards");
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

      // --- [real] source_ref.export, against the live citations ---------------

      function liveCitations() {
        var out = [];
        realResults.stacks.forEach(function (stackProj) {
          ((stackProj.stack || {}).elements || []).forEach(function (element) {
            if (element.source_ref) out.push([stackProj, element]);
          });
        });
        return out;
      }

      await test("[real] every established export reaches its element row", function () {
        var established = liveCitations().filter(function (pair) {
          return VA.exportProvenance(pair[1].source_ref).state === "established";
        });
        // Derived from the data, not hard-coded: the count moves every time a
        // handoff establishes another export, and a passing suite must not turn
        // red for that (LESSONS_20260810_viewer_source_ref_export_label).
        ok(established.length > 0, "the live projection must have established exports");
        var byStack = {};
        established.forEach(function (pair) { byStack[pair[0].id] = pair[0]; });
        var rendered = {};
        Object.keys(byStack).forEach(function (stackId) {
          rendered[stackId] = render(function (r) {
            VA.renderStack(r, byStack[stackId], realCrops, {});
          }).textContent;
        });
        established.forEach(function (pair) {
          var where = pair[0].id + ":" + pair[1].id;
          var p = VA.exportProvenance(pair[1].source_ref);
          var text = rendered[pair[0].id];
          has(text, p.pdfName, where + " must name the export file");
          has(text, "sha256 recorded", where + " must say a sha is on record");
          // Under `established` a sha256 is mandatory (SourceExport raises
          // without one), so a live export with none is a finding, not a display
          // case.
          ok(pair[1].source_ref.export.sha256, where + " must carry a sha256");
          p.runIds.forEach(function (runId) {
            has(text, runId, where + " must name run " + runId);
          });
        });
      });

      // THE ASYMMETRY THE ISSUE WAS FILED FOR. 22 of the 48 live citations cannot
      // be pinned to a page, and for those the export block is the only place a
      // reader could learn anything about the bytes — the crop popover has nothing
      // to show. Every one of the 22 turns out to carry NO export block rather
      // than an `unestablished` one, so this asserts the state they are really in.
      await test("[real] every citation whose crop is unresolvable states its export",
        function () {
          var unresolved = realCrops.unresolved || [];
          ok(unresolved.length > 0, "the live projection must have unresolvable crops");
          unresolved.forEach(function (row) {
            var stackProj = VA.findStack(realResults, row.stack);
            var element = ((stackProj.stack || {}).elements || []).filter(function (e) {
              return e.id === row.element;
            })[0];
            var where = row.stack + ":" + row.element;
            var p = VA.exportProvenance(element.source_ref);
            ok(p, where + " must have a citation");
            // Whatever the state, the panel says something about it — the one
            // outcome this handoff exists to make impossible is silence.
            ok(p.headline && p.headline.length > 10, where + " renders no export headline");
            eq(VA.cropFor(realCrops, row.stack, row.element).status, "unresolvable",
               where + " should be the unresolvable case");
          });
        });

      // No live citation is `unestablished` — nothing in the repo is — so the
      // state this handoff most needed is demonstrated the only honest way
      // available: give a REAL unresolvable citation the export block the schema
      // would carry if someone had been through it, and read what the page then
      // says. The fixture tier covers the same path on the washer.
      await test("[real] an unestablished export on a real citation is loud, with its why",
        function () {
          var row = (realCrops.unresolved || [])[0];
          var stackProj = JSON.parse(JSON.stringify(VA.findStack(realResults, row.stack)));
          var element = stackProj.stack.elements.filter(function (e) {
            return e.id === row.element;
          })[0];
          element.source_ref.export = {
            status: "unestablished",
            why: "no PDF export of " + row.document + " exists, so the bytes this " +
              "value was read off cannot be identified",
          };
          var root = render(function (r) { VA.renderStack(r, stackProj, realCrops, {}); });
          var box = all(root, "div.el-export--unestablished");
          eq(box.length, 1, row.stack + ":" + row.element);
          ok(box[0].className.indexOf("el-export--loud") !== -1, "must be loud");
          has(all(root, "div.el-export__why")[0].textContent, "cannot be identified");
          // ...and from the row alone, beside the confidence chip.
          eq(all(root, "span.chip--export-unestablished").length, 1);
          // The crop for that element is still unresolvable, which is the point:
          // the reader learns this without a crop.
          eq(VA.cropFor(realCrops, row.stack, row.element).status, "unresolvable");
        });

      // --- [real] identity_rule, against the live citations --------------------
      //
      // The projection derives the marker from the citation; the crop script picks
      // its rule from the same condition, one file over. Nothing pairs the two, so
      // this does: the set of citations the viewer will show the spec-pile
      // sentence for must be exactly the set of crops that resolved by
      // `spec_pile`. Derived from the data on both sides — a fifth spec-pile
      // citation is not a failure, a fifth that only ONE side agrees with is.
      await test("[real] the marked citations are exactly the spec_pile-resolved ones",
        function () {
          var marked = [], plain = [];
          realResults.stacks.forEach(function (stackProj) {
            (stackProj.elements || []).forEach(function (derived) {
              (derived.identity_rule ? marked : plain)
                .push(stackProj.id + ":" + derived.id);
            });
          });
          var bySpecPile = [];
          Object.keys(realCrops.by_stack || {}).forEach(function (stackId) {
            Object.keys(realCrops.by_stack[stackId]).forEach(function (elementId) {
              if (realCrops.by_stack[stackId][elementId].resolved_by === "spec_pile") {
                bySpecPile.push(stackId + ":" + elementId);
              }
            });
          });
          ok(marked.length > 0, "the live projection must have spec-pile citations");
          eq(marked.slice().sort(), bySpecPile.slice().sort(),
             "the citation-level marker and the crop-level rule disagree");
          // The other half of deliverable 2: the 21 workbook + 1 assumed no-export
          // citations are untouched, and so is every drawing/parts_list one.
          ok(plain.length > marked.length, "most citations carry no identity rule");
        });

      await test("[real] a marked row states the rule instead of stating a gap",
        function () {
          var stacks = {};
          realResults.stacks.forEach(function (stackProj) {
            (stackProj.elements || []).forEach(function (derived) {
              if (derived.identity_rule) stacks[stackProj.id] = stackProj;
            });
          });
          var ids = Object.keys(stacks);
          ok(ids.length > 0, "no live stack carries a spec-pile citation");
          ids.forEach(function (stackId) {
            var root = render(function (r) {
              VA.renderStack(r, stacks[stackId], realCrops, {});
            });
            var boxes = all(root, "div.el-export--identity_rule");
            eq(boxes.length,
               (stacks[stackId].elements || []).filter(function (d) {
                 return d.identity_rule;
               }).length, stackId);
            has(boxes[0].textContent, "identity by filename (append-only pile)",
                stackId);
            // The row the issue was filed about: `traced` beside "nothing here
            // identifies the bytes". That pair must no longer be reachable here.
            ok(boxes[0].textContent.indexOf("names no exported file") === -1,
               stackId + " still reads as a gap");
          });
        });

      await test("[real] the live material entries show the provenance of their CTE",
        function () {
          var entries = 0;
          realResults.stacks.forEach(function (stackProj) {
            var materials = stackProj.materials || [];
            if (!materials.length) return;
            var root = render(function (r) { VA.renderStack(r, stackProj, realCrops, {}); });
            var text = root.textContent;
            eq(all(root, "div.mat-row__values").length, materials.length,
               stackProj.id + ": one values_status line per material row");
            eq(all(root, "div.mat-row__desig").length, materials.length,
               stackProj.id + ": one designation citation per material row");
            materials.forEach(function (m) {
              var authored = m.material || {};
              var where = stackProj.id + ":" + m.id;
              has(text, VA.valuesProvenance(authored).text, where);
              // Every live entry is applied over two soak ranges and quotes none,
              // which is exactly the pair a reader has to be able to compare.
              var applied = VA.appliedOverText(authored.applied_over_c);
              if (applied) has(text, applied, where);
              if (authored.cindas_request) has(text, "CINDAS request on record", where);
              entries++;
            });
          });
          ok(entries > 0, "the live projection must carry material entries");
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
