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

    // Class membership that reads the same in the DOM shim and in a real
    // browser -- this suite runs in both (test.html). An HTML node's classes
    // come back through `className` (the shim never syncs that to the
    // attribute); an SVG node's only through getAttribute("class"), because
    // `className` there is a read-only SVGAnimatedString.
    function hasClass(node, cls) {
      var raw = node.getAttribute("class");
      if (raw === null || raw === undefined) raw = node.className;
      if (raw && typeof raw === "object") raw = raw.baseVal;
      return (" " + String(raw || "") + " ").indexOf(" " + cls + " ") !== -1;
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

    // --- the deep link out to apps/annotate/ (annotate_deep_link_and_part_filter) ---

    await test("needsAnnotation is true only for the two loud gap confidences",
      function () {
        ok(VA.needsAnnotation("untraced"));
        ok(VA.needsAnnotation("no_source_ref"));
        eq(VA.needsAnnotation("traced"), false);
        eq(VA.needsAnnotation("inferred"), false);
        eq(VA.needsAnnotation(null), false);
      });

    await test("annotateLink is relative (../annotate/index.html), edge/study/isolate " +
      "only appended when given", function () {
        eq(VA.annotateLink({ topologyId: "pitch_system" }),
          "../annotate/index.html?topology=pitch_system");
        eq(VA.annotateLink({ topologyId: "pitch_system", edgeId: "end_stop_clearance" }),
          "../annotate/index.html?topology=pitch_system&edge=end_stop_clearance");
        eq(VA.annotateLink({
          topologyId: "pitch_system", edgeId: "end_stop_clearance",
          studyId: "pitch_system_end_stop_plus72", part: "vpa_208510_007",
        }), "../annotate/index.html?topology=pitch_system&edge=end_stop_clearance" +
          "&study=pitch_system_end_stop_plus72&isolate=vpa_208510_007");
      });

    await test("annotateLink percent-encodes ids that need it", function () {
      eq(VA.annotateLink({ topologyId: "a b", edgeId: "c&d" }),
        "../annotate/index.html?topology=a%20b&edge=c%26d");
    });

    // --- the flyout launch (study_3d_flyout): one param shape, two carriers --

    await test("annotateLink appends trace=1 for a study-trace launch", function () {
      eq(VA.annotateLink({ topologyId: "pitch_system",
        studyId: "pitch_system_gas_spring_branch", trace: true }),
        "../annotate/index.html?topology=pitch_system" +
        "&study=pitch_system_gas_spring_branch&trace=1");
    });

    await test("annotateExecCommands mirrors annotateLink param for param -- " +
      "the already-open flyout runs the same vocabulary the boot URL does",
      function () {
        eq(VA.annotateExecCommands({ topologyId: "pitch_system",
          studyId: "s1", trace: true }),
          [["trace", "pitch_system", "s1"]]);
        eq(VA.annotateExecCommands({ topologyId: "pitch_system",
          edgeId: "e1", studyId: "s1", part: "p1" }),
          [["goto", "pitch_system", "e1", "s1"], ["isolate", "p1"]]);
        // No part: goto alone, no isolate of nothing. Missing edge/study ride
        // as "" -- cmdGoto's own deep-link shape.
        eq(VA.annotateExecCommands({ topologyId: "pitch_system", edgeId: "e1" }),
          [["goto", "pitch_system", "e1", ""]]);
        eq(VA.annotateExecCommands({ topologyId: "pitch_system" }),
          [["goto", "pitch_system", "", ""]]);
      });

    await test("probeAnnotateMount degrades immediately under file:// and with " +
      "no fetch at all -- never a probe it cannot make", async function () {
        var called = 0;
        var spy = function () { called++; return Promise.resolve({ ok: true }); };
        eq(await VA.probeAnnotateMount(spy, "file:"), false);
        eq(called, 0);
        eq(await VA.probeAnnotateMount(null, "https:"), false);
      });

    await test("probeAnnotateMount accepts only an ok text/html answer",
      async function () {
        function answer(ok, type) {
          return function () {
            return Promise.resolve({ ok: ok,
              headers: { get: function () { return type; } } });
          };
        }
        eq(await VA.probeAnnotateMount(answer(true, "text/html"), "http:"), true);
        eq(await VA.probeAnnotateMount(answer(true, "text/html; charset=utf-8"), "http:"), true);
        // The catch-all trap (storage/http.js's own): 200 with the wrong type
        // would iframe nonsense; a 404 is the plain absent mount.
        eq(await VA.probeAnnotateMount(answer(true, "application/json"), "http:"), false);
        eq(await VA.probeAnnotateMount(answer(false, "text/html"), "http:"), false);
        // A network failure reads as "not served here", never an error.
        eq(await VA.probeAnnotateMount(function () {
          return Promise.reject(new Error("refused"));
        }, "http:"), false);
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

    // --- the inbound deep-link contract (viewer_hover_cards_and_deep_links) --
    //
    // These params are a CONTRACT a sibling repo consumes (drawing-checker's
    // analyses panel, `analyses_viewer_deep_link`), documented in
    // apps/viewer/README.md. A rename here is a breaking change over there.

    await test("DEEP_LINK_PARAMS is the documented six, and parseDeepLink reads " +
      "exactly them", function () {
        eq(VA.DEEP_LINK_PARAMS,
           ["topology", "study", "edge", "node", "stack", "element"]);
        eq(VA.parseDeepLink("?topology=pitch_system&study=s1"),
           { topology: "pitch_system", study: "s1" });
        eq(VA.parseDeepLink("?stack=demo_joint&element=plate"),
           { stack: "demo_joint", element: "plate" });
        // mock picks the DATASET, not a selection — not part of this contract.
        eq(VA.parseDeepLink("?mock=1"), null);
        eq(VA.parseDeepLink("?mock=1&topology=t"), { topology: "t" });
        eq(VA.parseDeepLink(""), null);
        eq(VA.parseDeepLink("?unrelated=x"), null);
      });

    await test("parseDeepLink decodes, takes the first occurrence, and reads an " +
      "empty value as absent", function () {
        eq(VA.parseDeepLink("?topology=a%20b"), { topology: "a b" });
        eq(VA.parseDeepLink("?topology=a&topology=b"), { topology: "a" });
        eq(VA.parseDeepLink("?topology=&study=s"), { study: "s" });
      });

    await test("viewerLink round-trips through parseDeepLink, and is relative",
      function () {
        var params = { topology: "pitch_system", study: "s 1" };
        var link = VA.viewerLink(params);
        eq(link.indexOf("topology.html?"), 0);
        eq(VA.parseDeepLink(link.slice(link.indexOf("?"))), params);
        eq(VA.viewerLink({ stack: "demo_joint", mock: true }),
           "topology.html?stack=demo_joint&mock=1");
        eq(VA.viewerLink({}), "topology.html");
      });

    await test("resolveDeepLink selects a topology, its study and an edge when " +
      "every id resolves", function () {
        var topologies = VA.demoTopologyProjection();
        var out = VA.resolveDeepLink(
          { topology: "demo_mechanism", study: "demo_base_to_tip",
            edge: "base_thickness" },
          topologies, FIXTURE.results);
        eq(out.mode, "topology");
        eq(out.topologyId, "demo_mechanism");
        eq(out.studyId, "demo_base_to_tip");
        eq(out.selection, { kind: "edge", id: "base_thickness" });
        eq(out.notices, []);
      });

    await test("resolveDeepLink selects a stack and its element", function () {
      var out = VA.resolveDeepLink({ stack: "demo_joint", element: "plate" },
        VA.demoTopologyProjection(), FIXTURE.results);
      eq(out.mode, "stack");
      eq(out.stackId, "demo_joint");
      eq(out.elementId, "plate");
      eq(out.notices, []);
    });

    await test("resolveDeepLink turns every unresolvable id into a plain-words " +
      "notice and falls back rather than guessing", function () {
        var topologies = VA.demoTopologyProjection();
        var noTopo = VA.resolveDeepLink({ topology: "nope" }, topologies,
          FIXTURE.results);
        eq(noTopo.mode, null);
        eq(noTopo.notices.length, 1);
        has(noTopo.notices[0], "topology `nope`");
        has(noTopo.notices[0], "does not contain");

        var badStudy = VA.resolveDeepLink(
          { topology: "demo_mechanism", study: "nope" }, topologies, FIXTURE.results);
        eq(badStudy.mode, "topology");
        eq(badStudy.studyId, null);
        has(badStudy.notices[0], "study `nope`");

        var badEdge = VA.resolveDeepLink(
          { topology: "demo_mechanism", edge: "nope" }, topologies, FIXTURE.results);
        eq(badEdge.selection, null);
        has(badEdge.notices[0], "edge `nope`");

        var badElement = VA.resolveDeepLink(
          { stack: "demo_joint", element: "nope" }, topologies, FIXTURE.results);
        eq(badElement.mode, "stack");
        eq(badElement.elementId, null);
        has(badElement.notices[0], "element `nope`");
      });

    await test("resolveDeepLink: the topology wins over a stack, an edge over a " +
      "node, and a dangling child param is said, not guessed at", function () {
        var topologies = VA.demoTopologyProjection();
        var both = VA.resolveDeepLink(
          { topology: "demo_mechanism", stack: "demo_joint" }, topologies,
          FIXTURE.results);
        eq(both.mode, "topology");
        eq(both.stackId, null);
        has(both.notices[0], "the topology won");

        var edgeAndNode = VA.resolveDeepLink(
          { topology: "demo_mechanism", edge: "base_thickness", node: "base_datum" },
          topologies, FIXTURE.results);
        eq(edgeAndNode.selection, { kind: "edge", id: "base_thickness" });
        has(edgeAndNode.notices[0], "the edge won");

        var node = VA.resolveDeepLink(
          { topology: "demo_mechanism", node: "base_datum" }, topologies,
          FIXTURE.results);
        eq(node.selection, { kind: "node", id: "base_datum" });

        var dangling = VA.resolveDeepLink({ study: "s" }, topologies, FIXTURE.results);
        eq(dangling.mode, null);
        has(dangling.notices[0], "without a `topology`");
        var danglingElement = VA.resolveDeepLink({ element: "plate" }, topologies,
          FIXTURE.results);
        has(danglingElement.notices[0], "without a `stack`");
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

    // --- cropForKey: crops.json's TWO key spaces (viewer_hover_cards_and_deep_links) --
    //
    // A dimension_ref edge's {stack, element} key reads by_stack exactly as
    // VA.cropFor always has; an inline edge's {topology, edge} key reads
    // by_topology — the space build_viewer_crops.py started writing on
    // 2026-09-08 and the viewer read NOT AT ALL until this handoff, so every
    // real pitch_system crop rendered as "no-entry — the index is stale".

    await test("cropForKey dispatches a {stack, element} key to by_stack, unchanged",
      function () {
        eq(VA.cropForKey(CROPS, { stack: "demo_joint", element: "plate" }).status,
           "resolved");
        eq(VA.cropForKey(CROPS, { stack: "demo_joint", element: "eye" }).status,
           "no-entry");
      });

    await test("cropForKey reads a {topology, edge} key out of by_topology",
      function () {
        var entry = VA.cropForKey(CROPS,
          { topology: "demo_mechanism", edge: "arm_pin_to_tip" });
        eq(entry.status, "resolved");
        eq(entry.resolved_by, "source_ref_export");
        var missing = VA.cropForKey(CROPS,
          { topology: "demo_mechanism", edge: "post_bushing_offset" });
        eq(missing.status, "unresolvable");
      });

    await test("cropForKey keeps the topology space's four answers distinct too",
      function () {
        eq(VA.cropForKey(null, { topology: "t", edge: "e" }).status, "not-built");
        var stale = VA.cropForKey(CROPS, { topology: "demo_mechanism", edge: "new_edge" });
        eq(stale.status, "no-entry");
        has(stale.reason, "older than the topology");
        var noTopo = VA.cropForKey(CROPS, { topology: "never_built", edge: "e" });
        eq(noTopo.status, "no-entry");
      });

    await test("cropForKey says a key shape it has no branch for out loud",
      function () {
        var odd = VA.cropForKey(CROPS, { banana: "x" });
        eq(odd.status, "unresolvable");
        has(odd.reason, "no branch for");
        // No key at all: callers guard on it, but the function stays total.
        eq(VA.cropForKey(CROPS, null).status, "no-entry");
      });

    await test("cropKeyText states which CLAIM each key shape makes", function () {
      eq(VA.cropKeyText({ stack: "s1", element: "e1" }),
         "from stack `s1`, element `e1`");
      has(VA.cropKeyText({ topology: "t1", edge: "e1" }),
          "authored in topology `t1`");
      has(VA.cropKeyText({ topology: "t1", edge: "e1" }),
          "this edge's own citation");
      eq(VA.cropKeyText(null), "");
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

    // The crop-region registry (docs/spec_library/crop_regions.json, handoff
    // spec_crop_region_registry 2026-09-14). A spec-pile citation names a
    // document and a sheet and nothing finer, so its crop was the whole
    // photocopied sheet; a declared region says which rect the cited row is.
    // The hover has to say that the placement is DECLARED rather than searched
    // for — a reader who cannot tell the two apart cannot judge either.
    await test("a declared_region crop names the region and what matched it",
      function () {
        var line = VA.cropProvenanceLine({
          status: "resolved", resolved_by: "spec_pile",
          pdf_name: "NAS6403-NAS6420 Rev 4.pdf", sha256_verified: null,
          located_by: "declared_region", region_label: "Grip Dash No. 13 row",
          region_match: "Grip Dash No. 13",
          note: "declared crop region 'Grip Dash No. 13 row' -- ...",
        });
        has(line, "declared region");
        has(line, "\"Grip Dash No. 13 row\"");
        has(line, "matched on \"Grip Dash No. 13\"");
        // The sole-region fallback is a WEAKER claim than a match and must not
        // read like one: nothing in this citation named the region, the sheet
        // simply has only one.
        var sole = VA.cropProvenanceLine({
          status: "resolved", resolved_by: "spec_pile",
          pdf_name: "NAS6403-NAS6420 Rev 4.pdf", sha256_verified: null,
          located_by: "declared_region",
          region_label: "NAS6403 row of the sheet-1 dimension table",
          region_match: null,
        });
        has(sole, "the only region declared for this sheet");
        ok(sole.indexOf("matched on") === -1, "no match may be claimed");
      });

    // Same guard as the resolved_by one above, one field over: the located_by
    // chain used to fall through to silence, and silence reads as "the whole
    // sheet" rather than as "this viewer cannot tell you".
    await test("a located_by the viewer has no label for is loud, not silent",
      function () {
        var line = VA.cropProvenanceLine({
          status: "resolved", resolved_by: "spec_pile", pdf_name: "x.pdf",
          sha256_verified: null, located_by: "some_new_placement",
        });
        has(line, "\"some_new_placement\"");
        has(line, "no label for");
        has(VA.cropProvenanceLine({ status: "resolved", resolved_by: "spec_pile",
                                    pdf_name: "x.pdf" }), "no label for");
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

    // --- the http adapter: probing a real local server (viewer_http_transport) --
    //
    // Runs only under the node runner (run_tests.cjs starts two real local
    // servers and injects HTTP_FIXTURE + fetch); the browser tier (test.html)
    // has neither and skips gracefully, same pattern as the node-fs tier below.
    var httpFixture = typeof HTTP_FIXTURE !== "undefined" ? HTTP_FIXTURE : null;
    if (!httpFixture) {
      skip("http adapter tier", "no HTTP_FIXTURE injected (browser tier, or no runner shim)");
    } else {
      var httpAdapter = function (pathname, origin) {
        return new VA.HttpAdapter({
          pathname: pathname,
          fetchImpl: function (url, init) { return fetch(origin + url, init); },
        });
      };

      await test("sibling-data-mount: probes ../data, reaches the projections " +
        "and a crop, but NOT a worksheet -- drawing-checker's own mount does " +
        "not expose docs/ at all", async function () {
        var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.dataOrigin);
        eq(await adapter.init(), VA.STATE.READY);
        eq(adapter.capabilities().worksheets, false);
        ok((await adapter.readTopologies()).topologies, "topologies.json must parse");
        eq((await adapter.readResults()).stacks.length, 0);
        ok(await adapter.readCropImage("crops/sample.png"), "the PNG must resolve");
        eq(await adapter.readCropImage("crops/missing.png"), null);
        eq(await adapter.readText(["docs", "tolerance_stacks", "WORKSHEET_demo.md"]), null);
      });

      await test("repo-root-static: probes ../../data/projections/viewer and " +
        "reaches a worksheet too", async function () {
        var adapter = httpAdapter("/apps/viewer/topology.html", httpFixture.dataOrigin);
        eq(await adapter.init(), VA.STATE.READY);
        eq(adapter.capabilities().worksheets, true);
        ok((await adapter.readTopologies()).topologies, "topologies.json must parse");
        has(await adapter.readText(["docs", "tolerance_stacks", "WORKSHEET_demo.md"]),
          "HTTP tier fixture");
      });

      await test("neither candidate resolving is DISCONNECTED, not an error", async function () {
        var adapter = httpAdapter("/nowhere/page.html", httpFixture.emptyOrigin);
        eq(await adapter.init(), VA.STATE.DISCONNECTED);
      });

      await test("a 200 + HTML catch-all does not win the probe -- status alone " +
        "is never enough (drawing-checker's own nginx lesson)", async function () {
        var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.htmlOrigin);
        eq(await adapter.init(), VA.STATE.DISCONNECTED);
      });

      // --- the rebuild capability (viewer_rebuild_affordance) ----------------
      //
      // Runs BEFORE the mid-session-stop test below: that test permanently
      // closes httpFixture's dataOrigin server, and these two still need it
      // alive to prove the "mount matches, but the capability is absent"
      // case (as opposed to "the whole origin is gone").

      await test("the rebuild capability is PROBED, not assumed from the " +
        "candidate matching -- a sibling-data-mount with no rebuild route " +
        "mounted yet reports the capability absent", async function () {
          var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.dataOrigin);
          eq(await adapter.init(), VA.STATE.READY);
          eq(adapter.capabilities().rebuild, false);
        });

      await test("repo-root-static never reports a rebuild capability -- " +
        "nothing serves it there, by construction", async function () {
          var adapter = httpAdapter("/apps/viewer/topology.html", httpFixture.dataOrigin);
          eq(await adapter.init(), VA.STATE.READY);
          eq(adapter.capabilities().rebuild, false);
        });

      await test("a live rebuild endpoint under the sibling-data-mount is " +
        "found by the probe", async function () {
          var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.rebuildOrigin);
          eq(await adapter.init(), VA.STATE.READY);
          eq(adapter.capabilities().rebuild, true);
        });

      await test("requestRebuild/readRebuildStatus round-trip the endpoint's " +
        "own busy/state shape", async function () {
          var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.rebuildOrigin);
          await adapter.init();
          var started = await adapter.requestRebuild();
          ok(started.busy, "the immediate POST response should say busy");
          var status = await adapter.readRebuildStatus();
          ok("busy" in status, "the status payload must carry busy");
        });

      await test("a rebuild request that fails to even start rejects, not " +
        "resolves null -- the same contract as every other real transport " +
        "failure in this adapter", async function () {
          var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.rebuildFailOrigin);
          eq(await adapter.init(), VA.STATE.READY);
          eq(adapter.capabilities().rebuild, true);
          var threw = false;
          try { await adapter.requestRebuild(); } catch (err) { threw = true; }
          ok(threw, "a non-ok POST must reject");
        });

      // --- the transport DECISION (viewer_transport_honest_hosted) ---------
      //
      // VA.chooseTransport is the whole of it, so these drive it directly
      // against the same real local servers the probe tests above use. The
      // FSA side is a spy rather than the real adapter: there is no File
      // System Access API in node, and what is being proved is that it is
      // never REACHED, which a spy proves better than a stub that works.
      //
      // Runs BEFORE the mid-session-stop test below for the same reason the
      // rebuild tests do -- that test permanently closes dataOrigin.
      var fsaSpy = function () {
        var spy = {
          booted: false,
          init: function () { spy.booted = true; return Promise.resolve(VA.STATE.DISCONNECTED); },
        };
        return spy;
      };

      await test("an http page whose served probes both fail never boots FSA " +
        "-- a hosted visitor has no repo to grant, so Connect folder is not " +
        "offered at all", async function () {
          // Both failure shapes a real hosted origin produces: nothing
          // answering (404 everywhere), and the catch-all that answers 200 +
          // HTML for every path -- the one measured on the real host.
          var origins = [httpFixture.emptyOrigin, httpFixture.htmlOrigin];
          for (var i = 0; i < origins.length; i++) {
            var spy = fsaSpy();
            var picked = await VA.chooseTransport({
              protocol: "https:",
              http: httpAdapter("/tolstack/viewer/topology.html", origins[i]),
              fsa: spy,
            });
            eq(picked.kind, VA.TRANSPORT.UNPUBLISHED, "origin " + i);
            eq(picked.adapter, null, "origin " + i);
            eq(spy.booted, false, "the FSA adapter must never be initialised");
          }
        });

      await test("file:// is the ONE page FSA is still offered on -- nothing " +
        "else can read the repo there and the grant is legitimate",
        async function () {
          var spy = fsaSpy();
          // HttpAdapter.isSupported() is false on file://, which is why the
          // page hands chooseTransport a null http candidate there.
          var picked = await VA.chooseTransport({
            protocol: "file:", http: null, fsa: spy,
          });
          eq(picked.kind, VA.TRANSPORT.FSA);
          eq(picked.state, VA.STATE.DISCONNECTED);
          ok(spy.booted, "the FSA adapter must be initialised on file://");
        });

      await test("file:// in a browser with no File System Access API is a " +
        "real dead end, not an unpublished page", async function () {
          var picked = await VA.chooseTransport({
            protocol: "file:", http: null, fsa: null,
          });
          eq(picked.kind, null);
          eq(picked.adapter, null);
        });

      await test("an unpublished origin latches NOTHING: publish the data and " +
        "the next load -- a plain reload, no user action -- is served mode",
        async function () {
          var page = "/tolstack/viewer/topology.html";
          var before = await VA.chooseTransport({
            protocol: "https:",
            http: httpAdapter(page, httpFixture.publishableOrigin),
            fsa: fsaSpy(),
          });
          eq(before.kind, VA.TRANSPORT.UNPUBLISHED);

          httpFixture.publishData();

          // A reload is exactly this: a fresh probe over the same URL, with
          // nothing carried across from the load before it.
          var after = await VA.chooseTransport({
            protocol: "https:",
            http: httpAdapter(page, httpFixture.publishableOrigin),
            fsa: fsaSpy(),
          });
          eq(after.kind, VA.TRANSPORT.HTTP);
          eq(after.state, VA.STATE.READY);
          ok((await after.adapter.readTopologies()).topologies,
            "served mode must actually read the projection");
        });

      await test("a mid-session server stop rejects instead of reading as " +
        "'not built yet' -- a real transport failure must reach the caller",
        async function () {
          var adapter = httpAdapter("/tolstack/viewer/topology.html", httpFixture.dataOrigin);
          eq(await adapter.init(), VA.STATE.READY);
          await httpFixture.stopDataServer();
          var threw = false;
          try { await adapter.readTopologies(); } catch (err) { threw = true; }
          ok(threw, "a network failure must reject, not resolve null");
        });
    }

    await test("isLocalPage: a folder grant is legitimate on file:// and on a " +
      "loopback origin, and on nothing else", function () {
        // (surfaces_that_state_something_false.) The shared half of the rule
        // apps/annotate/ boots on: what makes **Connect folder** legitimate is
        // not the protocol, it is whether the reader plausibly holds the repo
        // the picker would open. A server on their own machine does --
        // drawing-checker serves /tolstack/annotate/ and /tolstack/viewer/
        // from 127.0.0.1:8000 in dev.
        eq(VA.isLocalPage("file:", ""), true);
        eq(VA.isLocalPage("file:", undefined), true);
        VA.LOCAL_HOSTNAMES.forEach(function (host) {
          eq(VA.isLocalPage("http:", host), true, host);
          eq(VA.isLocalPage("https:", host.toUpperCase()), true, host);
        });
        // A hosted visitor, in the shapes a real origin produces -- including
        // a hostname that merely CONTAINS a local one, which a lax match
        // would wave through.
        ["tolstack.joby.aero", "kibot", "localhost.attacker.example",
         "notlocalhost", ""].forEach(function (host) {
          eq(VA.isLocalPage("https:", host), false, host);
        });
        // A caller that names no hostname gets the strictest answer, which is
        // why apps/viewer's own boot is unchanged by this: topology_app.js
        // passes the protocol only, on purpose.
        eq(VA.isLocalPage("https:"), false);
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

    // The citation's own note used to live on the row, clamped and click to
    // expand. It moved to the right pane with deliverable 2's compaction, and
    // deliverable 3 says it renders there UNCLAMPED — see the detail-pane tests
    // below ("the citation note reaches the panel, in full, unclamped").
    await test("the compact row carries no note, callout or export block", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(root, "div.el-row__srcnote").length, 0);
      eq(all(root, "div.el-row__callout").length, 0);
      eq(all(root, "div.el-export").length, 0,
         "the export block must be in the right pane only, not on the row");
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

    // --- selection: clicking a row is how the right pane gets populated -----

    await test("clicking anywhere on a row hands its element id to the app", function () {
      var seen = null;
      var root = render(function (r) {
        VA.renderStack(r, DEMO, CROPS, { onElementSelect: function (id) { seen = id; } });
      });
      all(root, "tr.el-row")[0].click();
      eq(seen, "plate");
      all(root, "tr.el-row")[2].click();
      eq(seen, "eye");
    });

    await test("the selected row is visibly marked, and only that one", function () {
      var root = render(function (r) {
        VA.renderStack(r, DEMO, CROPS, { selectedElementId: "washer" });
      });
      var selected = all(root, "tr.el-row--selected");
      eq(selected.length, 1);
      has(selected[0].textContent, "washer thickness");
    });

    await test("no row is marked selected when nothing is", function () {
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(root, "tr.el-row--selected").length, 0);
    });

    await test("a row is clickable even with no onElementSelect handler wired", function () {
      // renderStack is called with {} (no handlers) elsewhere in this file and
      // must not throw just because nothing is listening for a click.
      var root = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      all(root, "tr.el-row")[0].click();
    });

    await test("the stack table's confidence chip is the citation-card trigger, " +
      "carrying the element's identity rule and crop entry", function () {
        var shown = [];
        var root = render(function (r) {
          VA.renderStack(r, DEMO, CROPS, {
            onCardShow: function (card, trigger) { shown.push([card, trigger]); },
          });
        });
        // All four demo elements carry a source_ref (even the assumed one — an
        // `assumed` citation is still a citation to card), so all four
        // confidence chips are triggers.
        var chips = all(root, "span.cardtrig");
        eq(chips.length, 4);
        chips[0].onmouseenter();
        eq(shown.length, 1);
        eq(shown[0][0].kind, "citation");
        eq(shown[0][0].provenance.state, "established");
        eq(shown[0][0].entry.status, "resolved");
        // Without the handler (every other call site in this file), the chip
        // is a plain chip and nothing throws.
        var bare = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
        eq(all(bare, "span.cardtrig").length, 0);
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

    // --- the right pane: full sourcing detail on selection (deliverable 3) ---

    await test("the callout and the citation note reach the panel, in full", function () {
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "plate", CROPS, null, VA.CONFIG);
      });
      has(all(root, "div.detail__callout")[0].textContent, "5X 4.06 ±0.10");
      // Unclamped: no click-to-expand class exists on this element at all — the
      // whole point of moving it here is that it no longer needs one.
      var note = all(root, "div.detail__note")[0];
      ok(note, "expected the citation note");
      has(note.textContent, "clamp-and-click-to-expand behaviour has something " +
        "to clamp");
      eq(note.className.indexOf("--open"), -1);
      ok(!note.onclick, "the panel's note is not clamped, so it needs no toggle");
    });

    await test("the panel header names the element and its confidence", function () {
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "washer", CROPS, null, VA.CONFIG);
      });
      has(root.textContent, "washer thickness");
      has(all(root, "code")[0].textContent, "washer");
      has(all(root, "span.conf--inferred")[0].textContent, "inferred");
    });

    await test("the crop renders inline in the panel when it has resolved", function () {
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "plate", CROPS, { url: "blob:x" }, VA.CONFIG);
      });
      var img = all(root, "img.detail__crop-img");
      eq(img.length, 1);
      eq(img[0].getAttribute("src"), "blob:x");
      // The height reserved from crops.json's own pixel size, same reason the
      // hover popover does it.
      eq(img[0].style.aspectRatio, "800 / 600");
      has(root.textContent, "sheet 2");
      has(root.textContent, "read from the export this citation names");
    });

    await test("the panel names which of the four crop states applies when there is no image",
      function () {
        // resolved, but the image has not arrived (or failed) yet.
        var loading = render(function (r) {
          VA.renderDetail(r, DEMO, "plate", CROPS, null, VA.CONFIG);
        });
        eq(all(loading, "img").length, 0);
        has(loading.textContent, "sheet 2");

        // unresolvable, with the recorded reason.
        var unresolvable = render(function (r) {
          VA.renderDetail(r, DEMO, "washer", CROPS, null, VA.CONFIG);
        });
        has(all(unresolvable, "div.detail__crop-reason")[0].textContent,
            "unestablished");

        // no-entry: crops.json has never heard of this element.
        var noEntry = render(function (r) {
          VA.renderDetail(r, DEMO, "eye", CROPS, null, VA.CONFIG);
        });
        has(all(noEntry, "div.detail__crop-reason")[0].textContent, "older than");

        // not-built: no crops.json at all.
        var notBuilt = render(function (r) {
          VA.renderDetail(r, DEMO, "plate", null, null, VA.CONFIG);
        });
        has(all(notBuilt, "div.detail__crop-reason")[0].textContent,
            "has not been built");
      });

    // --- source_ref.export, in the right pane ---------------------------------
    //
    // The export block moved off the row with deliverable 2's compaction — the
    // row keeps only the loud chip (still asserted below, via renderStack); the
    // block itself, in full, is views/detail.js's, reached by selecting the row.

    await test("an established export reaches the detail pane", function () {
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "plate", CROPS, null, VA.CONFIG);
      });
      var box = all(root, "div.el-export--established");
      eq(box.length, 1);
      has(box[0].textContent, "export established: 215197.pdf");
      has(box[0].textContent, "sha256 recorded");
      has(box[0].textContent, "20260804_114000_x");
      // The absolute path beside the basename, for the same reason the crop
      // popover prints it: a file:// link only navigates from a file:// page, and
      // copy-paste is the fallback that always works.
      has(all(root, "div.el-export__path")[0].textContent, "C:/workspace/demo/215197.pdf");
      // The export's own note is clamped like the citation's used to be, and does
      // NOT reuse its class — a selector for one must never pick up the other.
      var note = all(root, "div.el-export__note")[0];
      ok(note, "the export note is rendered");
      has(note.textContent, "hashes nothing");
      ok(note.className.indexOf("--open") === -1, "clamped by default");
      note.click();
      has(note.className, "el-export__note--open");
    });

    // THE DELIVERABLE. The stack states outright that the bytes behind this
    // number cannot be identified, with a recorded reason — and until this
    // existed the row showed the same "inferred" chip as a citation whose export
    // is nailed down. The chip stays legible from the ROW (compact grid); the
    // full block is the panel's.
    await test("an unestablished export is loud on the row, and its why is in the panel",
      function () {
        var rowsRoot = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
        // Legible from the ROW, which is the question the handoff asks: a filled
        // chip beside the confidence chip, on the washer's row and no other.
        var chips = all(rowsRoot, "span.chip--export-unestablished");
        eq(chips.length, 1);
        has(chips[0].textContent, "EXPORT UNESTABLISHED");
        var rows = all(rowsRoot, "tr.el-row");
        has(rows[1].textContent, "EXPORT UNESTABLISHED");
        ok(rows[0].textContent.indexOf("EXPORT UNESTABLISHED") === -1,
           "the established row is not tarred with it");

        var detailRoot = render(function (r) {
          VA.renderDetail(r, DEMO, "washer", CROPS, null, VA.CONFIG);
        });
        var box = all(detailRoot, "div.el-export--unestablished");
        eq(box.length, 1);
        ok(box[0].className.indexOf("el-export--loud") !== -1, "must be loud");
        has(box[0].textContent, "EXPORT UNESTABLISHED");
        // The reason, unclamped and not behind a hover: it was reachable only
        // through a crop popover before, and hiding it behind a second click here
        // would reproduce that defect one notch down.
        var why = all(detailRoot, "div.el-export__why");
        eq(why.length, 1);
        has(why[0].textContent, "none hashes to the one this .032\" was read off");
      });

    // ...and it says so WITHOUT a crop, which is the whole asymmetry argument:
    // the washer's crop is unresolvable and its reason lives in a popover nobody
    // has opened.
    await test("the unestablished why needs no crop to be resolved", function () {
      eq(VA.cropFor(CROPS, "demo_joint", "washer").status, "unresolvable");
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "washer", null, null, VA.CONFIG);
      });
      has(all(root, "div.el-export__why")[0].textContent, "none hashes to the one");
      has(root.textContent, "EXPORT UNESTABLISHED");
    });

    await test("a citation with no export block says so rather than nothing", function () {
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "eye", CROPS, null, VA.CONFIG);
      });
      var box = all(root, "div.el-export--none");
      eq(box.length, 1);
      has(box[0].textContent, "names no exported file");
      // Not loud, and no chip: see the comment on the state in views/stack.js.
      ok(box[0].className.indexOf("--loud") === -1);
    });

    await test("the panel says which element to select when nothing is selected",
      function () {
        var root = render(function (r) {
          VA.renderDetail(r, DEMO, null, CROPS, null, VA.CONFIG);
        });
        has(root.textContent, "Select an element");
        eq(all(root, "div.el-export").length, 0);
      });

    await test("the panel asks for a stack when there is none", function () {
      var root = render(function (r) {
        VA.renderDetail(r, null, "plate", CROPS, null, VA.CONFIG);
      });
      has(root.textContent, "Pick a stack");
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

    await test("the spec-pile row says what identifies its bytes, in the panel", function () {
      // Legible from the row: no chip, and the row text no longer reads as
      // "nothing identifies this" — that's the row-level half of the deliverable.
      var rowsRoot = render(function (r) { VA.renderStack(r, DEMO, CROPS, {}); });
      eq(all(rowsRoot, "span.chip--export-identity_rule").length, 0);
      var rows = all(rowsRoot, "tr.el-row");
      has(rows[3].textContent, "fastener grip (spec pile)");
      ok(rows[3].textContent.indexOf("names no exported file") === -1,
         "the four spec citations must stop reading as 'nothing identifies this'");

      // The argument for the state, in full, in the panel — unclamped and not
      // behind a hover, same rule as an unestablished export's `why`.
      var root = render(function (r) {
        VA.renderDetail(r, DEMO, "grip", CROPS, null, VA.CONFIG);
      });
      var box = all(root, "div.el-export--identity_rule");
      eq(box.length, 1);
      has(box[0].textContent, "identity by filename (append-only pile)");
      has(all(root, "div.el-export__detail")[0].textContent, "append-only");
      ok(box[0].className.indexOf("--loud") === -1, "not an alarm");
    });

    await test("an identity rule the viewer cannot explain is loud on the row and in the panel",
      function () {
        var poisoned = JSON.parse(JSON.stringify(DEMO));
        poisoned.elements[3].identity_rule = "sha_of_pile";
        var rowsRoot = render(function (r) { VA.renderStack(r, poisoned, CROPS, {}); });
        has(all(rowsRoot, "span.chip--export-identity_unlabelled")[0].textContent,
            "IDENTITY RULE UNKNOWN");
        // Its own chip class and its own wording: calling an unknown identity rule
        // "EXPORT STATUS UNKNOWN" would send a reader looking for a field this
        // citation does not have.
        eq(all(rowsRoot, "span.chip--export-unlabelled").length, 0);

        var root = render(function (r) {
          VA.renderDetail(r, poisoned, "grip", CROPS, null, VA.CONFIG);
        });
        var box = all(root, "div.el-export--identity_unlabelled");
        eq(box.length, 1);
        ok(box[0].className.indexOf("el-export--loud") !== -1);
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

    await test("an export status the viewer cannot explain is loud on the row and in the panel",
      function () {
        var poisoned = JSON.parse(JSON.stringify(DEMO));
        poisoned.stack.elements[0].source_ref.export = { status: "provisional" };
        var rowsRoot = render(function (r) { VA.renderStack(r, poisoned, CROPS, {}); });
        has(all(rowsRoot, "span.chip--export-unlabelled")[0].textContent,
            "EXPORT STATUS UNKNOWN");
        // The unestablished chip's class is NOT reused for it: the two states are
        // different facts and a stylesheet must be able to tell them apart, even
        // though today they share one loud rule. The washer's is untouched by
        // this poisoning and still reads unestablished.
        eq(all(rowsRoot, "span.chip--export-unestablished").length, 1);

        var root = render(function (r) {
          VA.renderDetail(r, poisoned, "plate", CROPS, null, VA.CONFIG);
        });
        var box = all(root, "div.el-export--unlabelled");
        eq(box.length, 1);
        ok(box[0].className.indexOf("el-export--loud") !== -1);
        has(box[0].textContent, "\"provisional\"");
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

    // Placement is topology_app.js/topology.html wiring, which this file's
    // other tests never touch (it boots on DOMContentLoaded and is not among
    // the files loaded into the sandbox). Read the shipped source instead of
    // skipping the deliverable entirely — via VIEWER_SRC, never NODE_FS/
    // `--repo`, so a worktree run checks THIS branch's HTML, not the main
    // checkout's. Moved here 2026-09-04 (handoff viewer_consolidation) when
    // the stack viewer (index.html/app.js) retired into this page — the
    // classic elements table is `#stackview` now, not `#stackview` in a
    // DIFFERENT file, and index.html is a redirect stub with none of this.
    var viewerSrc = typeof VIEWER_SRC !== "undefined" ? VIEWER_SRC : null;
    if (!viewerSrc) {
      skip("worksheet sits below the table; the right pane is its own element",
           "no VIEWER_SRC injected (browser tier has no filesystem)");
    } else {
      await test("the worksheet and the legend are <dialog>s, not inline " +
        "layout, and the worksheet defaults to closed", function () {
          var html = viewerSrc.readText("topology.html");
          var appJs = viewerSrc.readText("topology_app.js");
          ok(html && appJs, "topology.html and topology_app.js must be readable");
          var stackviewAt = html.indexOf('id="stackview"');
          var worksheetDialogAt = html.indexOf('id="worksheet-dialog"');
          var legendDialogAt = html.indexOf('id="legend-dialog"');
          var detailAt = html.indexOf('id="detail"');
          ok(stackviewAt !== -1 && worksheetDialogAt !== -1 &&
             legendDialogAt !== -1 && detailAt !== -1,
             "expected #stackview, #worksheet-dialog, #legend-dialog and " +
             "#detail in topology.html");
          has(html.slice(Math.max(0, worksheetDialogAt - 60), worksheetDialogAt), "<dialog",
              "the worksheet must be a native <dialog> — opening it must never " +
              "be able to shrink the DAG pane, which a <dialog> guarantees by " +
              "sitting outside the page's flex column entirely");
          has(html.slice(Math.max(0, legendDialogAt - 60), legendDialogAt), "<dialog",
              "the legend must be a native <dialog> too — a help affordance, " +
              "not layout that reserves a line of height even collapsed");
          has(appJs, "showWorksheet: false",
              "the worksheet must default to closed — moved out of the way, not gone");
        });

      await test("index.html is a redirect stub, not a second copy of the app",
        function () {
          var html = viewerSrc.readText("index.html");
          ok(html, "index.html must be readable");
          has(html, "topology.html",
            "the retired page must point at the one that absorbed it");
          ok(!/app\.js|views\/stack\.js/.test(html),
            "index.html must load none of the app's own scripts — there is one " +
            "app now, served from topology.html");
        });
    }

    // --- banner -------------------------------------------------------------

    await test("the banner offers Connect when disconnected", function () {
      var root = render(function (r) {
        VA.renderBanner(r, { connection: VA.STATE.DISCONNECTED }, {});
      });
      has(root.textContent, "Connect folder");
      has(root.className, "banner--disconnected");
    });

    // The hosted-page posture (viewer_transport_honest_hosted): the banner's
    // FIRST branch, above every connection state, because it is not about a
    // connection at all.
    await test("a served page with nothing published states it in plain words " +
      "and offers NO control -- never Connect folder, which a hosted visitor " +
      "could not satisfy", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.DISCONNECTED,
            transport: VA.TRANSPORT.UNPUBLISHED,
          }, {});
        });
        has(root.textContent, "not published on this site yet");
        has(root.className, "banner--unpublished");
        ok(root.textContent.indexOf("Connect folder") === -1,
          "a control the reader cannot satisfy must not be offered at all");
        eq(all(root, "button").length, 0, "one sentence, and nothing else");
        // The standing UI-copy rules: no paths, no scripts, no commands.
        noCommandsOrPaths(root.textContent);
        ok(root.textContent.indexOf("/") === -1,
          "must not carry a URL or a path: " + root.textContent);
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

    await test("a deep-link notice renders as its own plain line, never inside " +
      "the stale-pair rebuild alarm", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: FIXTURE.results, crops: CROPS,
            notices: ["This link asks for topology `nope`, which this data " +
              "does not contain — showing the default instead."],
          }, {});
        });
        var notices = all(root, ".banner__notice");
        eq(notices.length, 1);
        has(notices[0].textContent, "topology `nope`");
        // A mistyped link is a fact about the LINK: it must not raise the
        // "needs a rebuild" box, whose advice would be wrong.
        eq(all(root, ".banner__stale").length, 0);
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

    // No path in this file ever names a script or a shell command in banner
    // copy again (viewer_rebuild_affordance, 2026-09-10) — asserted directly,
    // rather than by absence of a particular string, so a NEW way of leaking
    // one in later still fails this.
    function noCommandsOrPaths(text) {
      ok(text.indexOf(".py") === -1, "must not name a script: " + text);
      ok(text.indexOf("venv-win") === -1, "must not name an interpreter: " + text);
      ok(text.indexOf("\\") === -1, "must not carry a filesystem path: " + text);
    }

    function mismatchedCrops() {
      var crops = JSON.parse(JSON.stringify(CROPS));
      crops.provenance.head_sha = "fedcba9876543210fedcba9876543210fedcba98";
      crops.provenance.branch = "handoff/somebody_else";
      return crops;
    }

    await test("the banner refuses to present a mismatched pair as current, " +
      "and states it in plain words with no capability", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
          }, {});
        });
        eq(all(root, ".banner__stale").length, 1);
        has(root.textContent, "needs a rebuild");
        has(root.textContent, "DIFFERENT trees");
        has(root.textContent, "The data is older than the code and needs a rebuild.");
        eq(all(root, ".banner__rebuild button").length, 0,
          "no capability means no button, just the sentence");
        noCommandsOrPaths(root.textContent);
      });

    await test("the alarm badge is one plain-words line, collapsed by " +
      "default, with only the branch/sha detail behind an expand", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
          }, {});
        });
        var badge = all(root, "details.banner__stale")[0];
        ok(badge, "expected the alarm as a <details>, collapsed by default");
        ok(badge.getAttribute("open") === null, "must be collapsed by default");
        var summary = badge.querySelector("summary");
        // House UI-copy rules on the ALWAYS-VISIBLE line: no shell command, no
        // internal file/module name, no multi-sentence paragraph.
        has(summary.textContent, "needs a rebuild");
        noCommandsOrPaths(summary.textContent);
        // And the detail, once expanded, carries none either — unlike before
        // this handoff, there is no rebuild command left anywhere to expand to.
        noCommandsOrPaths(root.textContent);
      });

    await test("a rebuild capability renders a button instead of the sentence", function () {
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
          capabilities: { rebuild: true }, rebuild: { busy: false, error: null },
        }, {});
      });
      var btn = all(root, ".banner__rebuild")[0].querySelector("button");
      ok(btn, "expected a Rebuild button");
      eq(btn.textContent, "Rebuild");
      ok(!btn.disabled, "must not start disabled");
      ok(root.textContent.indexOf(
        "The data is older than the code and needs a rebuild.") === -1,
        "the button replaces the sentence, not both");
      noCommandsOrPaths(root.textContent);
    });

    await test("clicking Rebuild calls the handler", function () {
      var called = 0;
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
          capabilities: { rebuild: true }, rebuild: { busy: false, error: null },
        }, { onRebuild: function () { called++; } });
      });
      all(root, ".banner__rebuild")[0].querySelector("button").onclick();
      eq(called, 1);
    });

    await test("a busy rebuild disables the button and says so, in plain words", function () {
      var root = render(function (r) {
        VA.renderBanner(r, {
          connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
          capabilities: { rebuild: true }, rebuild: { busy: true, error: null },
        }, {});
      });
      var btn = all(root, ".banner__rebuild")[0].querySelector("button");
      ok(btn.disabled, "must be disabled while a rebuild is in flight");
      has(btn.textContent, "Rebuilding");
    });

    await test("a failed rebuild shows a fixed plain-words error, never the " +
      "server's own text", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: FIXTURE.results, crops: mismatchedCrops(),
            capabilities: { rebuild: true },
            rebuild: { busy: false, error: "The rebuild failed. Try again, or " +
              "ask whoever runs the server to check its logs." },
          }, {});
        });
        has(all(root, ".banner__rebuild")[0].querySelector(".banner__error").textContent,
          "rebuild failed");
        noCommandsOrPaths(root.textContent);
      });

    await test("a capability with nothing stale renders neither the button " +
      "nor the sentence", function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, results: FIXTURE.results, crops: CROPS,
            capabilities: { rebuild: true },
          }, {});
        });
        eq(all(root, ".banner__stale").length, 0);
        eq(all(root, ".banner__rebuild").length, 0);
        ok(root.textContent.indexOf("needs a rebuild") === -1);
      });

    // --- the topology page ---------------------------------------------------
    //
    // apps/viewer/topology.html: rails left, grid centre, preview right. The one
    // claim every test below exists to protect is ALIGNMENT — a grid row and its
    // rail mark are the same row index, at the same y, or the page is lying
    // about which dimension sits between which two interfaces. The fixture tier
    // can assert the numbers that produce it; only the browser tier can assert
    // the pixels, and it does.

    var TOPOFIX = VA.demoTopologyProjection();
    var TOPO = TOPOFIX.topologies[0];
    var TOPOCROPS = VA.demoFixture().crops;

    function topoCtx(over) {
      var ctx = {
        topoProj: TOPO, study: null, crops: TOPOCROPS, layoutMode: "topology",
        selection: null, detailImage: null, onSelect: function () {},
      };
      Object.keys(over || {}).forEach(function (k) { ctx[k] = over[k]; });
      return ctx;
    }

    function topoStudy(id) { return VA.findStudy(TOPO, id); }

    await test("railGeometry puts a row's mark at the row's own y", function () {
      var geometry = VA.railGeometry(TOPO.layout, VA.RAIL_METRICS);
      eq(geometry.marks.length, TOPO.layout.rows.length);
      geometry.marks.forEach(function (mark, i) {
        eq(mark.y, VA.railY(i, VA.RAIL_METRICS), "mark " + i);
        eq(mark.x, VA.railX(TOPO.layout.rows[i].column, VA.RAIL_METRICS));
      });
      eq(geometry.height, TOPO.layout.rows.length * VA.RAIL_METRICS.rowHeight);
    });

    await test("a rail allocated at a fork is drawn from below the fork's dot",
      function () {
        // The half-row the `branch` curve covers. A rail drawn from the dot
        // itself would cross the mark it fans out of.
        var geometry = VA.railGeometry(TOPO.layout, VA.RAIL_METRICS);
        var forked = geometry.rails.filter(function (r) { return r.forked; });
        ok(forked.length >= 1, "the demo mechanism has a fork");
        forked.forEach(function (rail) {
          var start = TOPO.layout.rails.filter(function (r) {
            return r.column === rail.column;
          })[0];
          eq(rail.y1, VA.railY(start.start, VA.RAIL_METRICS) +
             VA.RAIL_METRICS.rowHeight * 0.5);
        });
        geometry.rails.filter(function (r) { return !r.forked; })
          .forEach(function (rail) {
            ok(rail.y1 % (VA.RAIL_METRICS.rowHeight / 2) === 0,
               "an unforked rail starts on a row centre");
          });
      });

    // The demo mechanism's own grid plan, spelled out once so every test below
    // reads against the same expectations (viewer_leader_line_grid): the walk's
    // edge order is base_thickness(base), post_height(post), arm_pin_to_tip(arm),
    // tip_to_strut_end(gap), strut_length(strut), post_bushing_offset(post) —
    // six single-edge groups, because every consecutive pair changes part. The
    // one internal node is base_datum (its only edge is base's), so five of the
    // six nodes get leaders.
    var TOPO_EDGE_ORDER = ["base_thickness", "post_height", "arm_pin_to_tip",
      "tip_to_strut_end", "strut_length", "post_bushing_offset"];

    await test("internal means every adjacent edge carries one part — and a " +
      "gap counts as a part boundary", function () {
        var internal = VA.internalNodes(TOPO);
        eq(internal.base_datum, true);       // one edge, one part
        eq(internal.base_post_seat, false);  // base vs post
        eq(internal.post_arm_pin, false);    // post vs arm
        eq(internal.arm_tip, false);         // arm vs a gap (null IS a value)
        eq(internal.strut_end, false);       // strut vs a gap
        eq(internal.post_strut_bushing, false);
        var parts = VA.nodeAdjacentParts(TOPO);
        eq(parts.arm_tip, ["arm", null]);
      });

    await test("gridPlan holds one row per edge in walk order, groups them by " +
      "component, and gives every non-internal node a boundary", function () {
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        eq(plan.rows.map(function (r) { return r.id; }), TOPO_EDGE_ORDER);
        plan.rows.forEach(function (r, i) { eq(r.gridRow, i); });
        eq(plan.groups.length, 6);
        eq(plan.groups.map(function (g) { return g.label; }),
          ["base", "post", "arm", VA.GAP_COMPONENT_LABEL, "strut", "post"]);
        plan.groups.forEach(function (g) { eq(g.count, 1); });
        // A leader's boundary is the count of edge rows the walk emitted
        // before its node — the seam between the row above and the row below.
        eq(plan.leaders.map(function (l) { return l.id + ":" + l.boundary; }),
          ["base_post_seat:1", "post_arm_pin:2", "arm_tip:3", "strut_end:4",
           "post_strut_bushing:5"]);
        eq(plan.leaders.map(function (l) { return l.beforeEdge; }),
          ["post_height", "arm_pin_to_tip", "tip_to_strut_end", "strut_length",
           "post_bushing_offset"]);
        // base_datum is internal, so it is not in the leader list at all.
        eq(plan.leaders.filter(function (l) { return l.id === "base_datum"; }), []);
      });

    // A shape the small demo cannot exercise: consecutive same-part edges. Two
    // tolerances on one feature merge into one component group across their
    // internal node; a NON-internal node between two same-part edges (possible
    // at a fork) still breaks the group, so a leader can never point inside one.
    function miniTopo(midNodeExtraEdge) {
      var edges = [
        { id: "e1", name: "size", kind: "structural", part: "p", from: "n0",
          to: "n1", dimension: null, confidence: null, value_source: "inline",
          zero_width: false, crop_key: null,
          transform: { id: "identity", kind: "identity", ratio: 1 } },
        { id: "e2", name: "flatness", kind: "structural", part: "p", from: "n1",
          to: "n2", dimension: null, confidence: null, value_source: "inline",
          zero_width: false, crop_key: null,
          transform: { id: "identity", kind: "identity", ratio: 1 } },
      ];
      if (midNodeExtraEdge) {
        edges.push({ id: "e3", name: "other part's", kind: "structural",
          part: "q", from: "n1", to: "n3", dimension: null, confidence: null,
          value_source: "inline", zero_width: false, crop_key: null,
          transform: { id: "identity", kind: "identity", ratio: 1 } });
      }
      return {
        id: "mini", parts: [{ id: "p", name: "one part" }, { id: "q", name: "another" }],
        nodes: [
          { id: "n0", name: "start", kind: "datum_feature", parts: ["p"], branch: false, degree: 1 },
          { id: "n1", name: "mid", kind: "mating_surface", parts: ["p"], branch: false, degree: 2 },
          { id: "n2", name: "end", kind: "datum_feature", parts: ["p"], branch: false, degree: 1 },
          { id: "n3", name: "aside", kind: "datum_feature", parts: ["q"], branch: false, degree: 1 },
        ],
        edges: edges,
        layout: {
          columns: 1,
          rows: [
            { row: 0, kind: "node", id: "n0", column: 0, branch: false },
            { row: 1, kind: "edge", id: "e1", column: 0, closes_row: null },
            { row: 2, kind: "node", id: "n1", column: 0, branch: false },
            { row: 3, kind: "edge", id: "e2", column: 0, closes_row: null },
            { row: 4, kind: "node", id: "n2", column: 0, branch: false },
          ],
          rails: [{ column: 0, start: 0, end: 4 }],
          links: [],
        },
      };
    }

    // A shape the demo does not have and the real documents do: every leader
    // in the top of the diagram, and all the drawn LENGTH below them. Under a
    // scaled mode edge `e3` is the yardstick and dwarfs the two above it, so
    // the DAG's midpoint sits far below the leaders' own midpoint — which is
    // the whole difference between the two centring rules.
    function lopsidedTopo() {
      var edge = function (id, part, from, to, band) {
        return { id: id, name: id, kind: "structural", part: part, from: from,
          to: to, confidence: "traced", value_source: "inline",
          zero_width: false, crop_key: null,
          dimension: { nominal: 1, min: -band, max: band, plus_minus: band },
          transform: { id: "identity", kind: "identity", ratio: 1 } };
      };
      var node = function (id) {
        return { id: id, name: id, kind: "mating_surface", parts: [], branch: false,
                 degree: 2 };
      };
      return {
        id: "lopsided", parts: [{ id: "a" }, { id: "b" }, { id: "c" }],
        nodes: [node("n0"), node("n1"), node("n2"), node("n3")],
        edges: [edge("e1", "a", "n0", "n1", 0.01),
                edge("e2", "b", "n1", "n2", 0.01),
                edge("e3", "c", "n2", "n3", 1.0)],
        layout: {
          columns: 1,
          rows: [
            { row: 0, kind: "node", id: "n0", column: 0, branch: false },
            { row: 1, kind: "edge", id: "e1", column: 0, closes_row: null },
            { row: 2, kind: "node", id: "n1", column: 0, branch: false },
            { row: 3, kind: "edge", id: "e2", column: 0, closes_row: null },
            { row: 4, kind: "node", id: "n2", column: 0, branch: false },
            { row: 5, kind: "edge", id: "e3", column: 0, closes_row: null },
            { row: 6, kind: "node", id: "n3", column: 0, branch: false },
          ],
          rails: [{ column: 0, start: 0, end: 6 }],
          links: [],
        },
      };
    }

    // The same max-jog measurement over an arbitrary plan (the one inside the
    // centring test closes over the demo's).
    function maxJogAt2(positions, plan, gridOffset, metrics) {
      var worst = 0;
      plan.leaders.forEach(function (leader) {
        var y2 = gridOffset + leader.boundary * metrics.rowHeight;
        worst = Math.max(worst, Math.abs(positions.nodes[leader.id] - y2));
      });
      return worst;
    }

    await test("two tolerances on one feature merge into one component group, " +
      "and their internal node gets no leader — that omission IS the grouping",
      function () {
        var mini = miniTopo(false);
        var plan = VA.gridPlan(mini.layout, mini);
        eq(plan.groups.length, 1);
        eq(plan.groups[0].label, "p");
        eq(plan.groups[0].count, 2);
        eq(plan.leaders, []);   // n0/n1/n2 all sit inside part p

        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ topoProj: mini }));
        });
        var cells = all(root, "td.tvcell--component");
        eq(cells.length, 1);
        eq(cells[0].getAttribute("rowspan"), "2");
        eq(cells[0].textContent, "p");
        eq(all(root, "path.rail__leader").length, 0);
      });

    await test("a non-internal node between two same-part edges still breaks " +
      "the group, so a leader never points inside one", function () {
        var mini = miniTopo(true);   // n1 now also touches part q's edge (the
                                     // edge itself is off-layout on purpose:
                                     // adjacency reads the DOCUMENT, not the
                                     // serialisation)
        var plan = VA.gridPlan(mini.layout, mini);
        eq(plan.groups.map(function (g) { return g.label + ":" + g.count; }),
          ["p:1", "p:1"]);
        eq(plan.leaders.map(function (l) { return l.id + ":" + l.boundary; }),
          ["n1:1"]);
      });

    await test("leaderGeometry jogs each leader from its node's dot to its " +
      "grid seam, on monotone lanes that cannot cross", function () {
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var geo = VA.leaderGeometry(TOPO.layout, plan, VA.RAIL_METRICS);
        eq(geo.leaders.length, 5);
        var rowsByLayoutRow = {};
        TOPO.layout.rows.forEach(function (r) { rowsByLayoutRow[r.row] = r; });
        geo.leaders.forEach(function (leader, i) {
          var planLeader = plan.leaders[i];
          eq(leader.id, planLeader.id);
          // Start y: the node's own dot centre — the same VA.railY the SVG
          // mark was drawn from.
          eq(leader.y1, VA.railY(planLeader.layoutRow, VA.RAIL_METRICS), leader.id);
          // End y: the grid seam — boundary × the same rowHeight the grid's
          // inline row heights sum to.
          eq(leader.y2, planLeader.boundary * VA.RAIL_METRICS.rowHeight, leader.id);
          // The path is exactly the jog: H to the lane, V to the seam, H out.
          eq(leader.d, "M " + leader.x1 + " " + leader.y1 + " H " + leader.laneX +
            " V " + leader.y2 + " H " + geo.width);
          if (i > 0) ok(leader.laneX > geo.leaders[i - 1].laneX,
            "lanes must be strictly monotone (" + leader.id + ")");
        });
        // The zone starts where the rails end, and the SVG's width is the
        // grid's left edge, so the last H segment hands off with no seam.
        var railWidth = VA.railGeometry(TOPO.layout, VA.RAIL_METRICS).width;
        eq(geo.zoneLeft, railWidth);
        ok(geo.width > railWidth, "the jog zone has real width");
      });

    // --- leader legibility (viewer_leader_grid_legibility, 2026-09-14) -----
    //
    // Three display preferences and one label rule, all of which have to leave
    // the page's landed correspondence contract exactly where it was: a
    // leader's node-side end on its own dot, its grid-side end on its boundary
    // row's seam. Every test below that touches geometry re-checks both ends.

    // A tiny evaluator for a band boundary (a polyline, non-decreasing in x,
    // vertical jumps allowed) so the tiling claim can be sampled rather than
    // asserted at the breakpoints the code chose.
    function profileY(profile, x) {
      var y = profile[0][1];
      for (var i = 1; i < profile.length; i++) {
        var a = profile[i - 1], b = profile[i];
        if (b[0] < x) { y = b[1]; continue; }
        if (a[0] > x) break;
        y = b[0] === a[0] ? b[1]
          : a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        break;
      }
      return y;
    }

    await test("leaderBands cuts the grid into one band per leader plus one, " +
      "alternating, covering every row exactly once", function () {
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var bands = VA.leaderBands(plan);
        eq(bands.length, plan.leaders.length + 1);
        var at = 0;
        bands.forEach(function (band, i) {
          eq(band.index, i);
          eq(band.parity, i % 2, "bands alternate");
          eq(band.startRow, at, "band " + i + " starts where the last ended");
          ok(band.endRow >= band.startRow, "a band never runs backwards");
          at = band.endRow;
        });
        eq(at, plan.rows.length, "the last band reaches the bottom of the grid");
        // A band's lower edge IS the leader that bounds it, named by id, and
        // its rows are the ones that leader points above.
        bands.forEach(function (band, i) {
          eq(band.below, i === plan.leaders.length ? null : plan.leaders[i].id);
          eq(band.above, i === 0 ? null : plan.leaders[i - 1].id);
          if (band.below !== null) {
            eq(band.endRow, plan.leaders[i].boundary,
               "band " + i + " ends at its own leader's seam");
          }
        });

        // Every row gets exactly one parity, and it is its band's.
        var parity = VA.rowBandParity(plan);
        eq(Object.keys(parity).length, plan.rows.length);
        bands.forEach(function (band) {
          for (var r = band.startRow; r < band.endRow; r++) {
            eq(parity[plan.rows[r].id], band.parity, plan.rows[r].id);
          }
        });
      });

    await test("the bands TILE the pane even where the leaders cross: " +
      "adjacent bands share one edge and no band folds over itself",
      function () {
        // The property the running-max clamp exists for, and the ONE
        // configuration that can see it. Leaders cross each other whenever a
        // leader's grid-side seam sits at or below the NEXT interface's dot,
        // which became possible when viewer_dag_spine_layout centred the grid
        // against the DAG and leaders stopped always rising. Drawn literally,
        // "the region between two leaders" then folds over itself and doubles
        // its own tint -- a checkerboard exactly where the page is meant to be
        // getting more legible. (The crossings themselves are a layout
        // question, not this one: ISSUE_20260914_leaders_cross_each_other_
        // since_the_grid_was_centred.md.)
        //
        // The demo mechanism only crosses once the grid is centred against it,
        // so the centred store is the fixture and the crossing is asserted
        // first: without that witness this test passes forever on a straight
        // ladder of leaders and says nothing.
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var centred = VA.rowPositions(TOPO.layout, TOPO, "uniform", M,
          { budget: 200, plan: plan });
        ok(centred.gridOffset > 1, "the grid really is pushed down");
        // The demo mechanism's own centring only makes the first two leaders
        // TOUCH, so the store is pushed one step further to model the real
        // pitch_system, whose grid sits ~300px down a 1170px DAG and whose
        // leaders cross 16 times. Only `gridOffset` moves -- the same knob
        // VA.centreOffsets turns -- and leaderGeometry reads nothing else off
        // a store but that, the node y's and the total height. The [real]
        // tier below checks the shipped projection rather than this model.
        var crossed = { nodes: centred.nodes, height: centred.height,
                        gridOffset: centred.gridOffset + 60 };

        [null, crossed].forEach(function (positions) {
          ["jogged", "angled"].forEach(function (style) {
            var label = (positions ? "centred " : "top-aligned ") + style;
            var geo = VA.leaderGeometry(TOPO.layout, plan, M, positions,
              { style: style });
            eq(geo.bands.length, plan.leaders.length + 1, label);
            geo.bands.forEach(function (band, i) {
              // One shared edge, not two that happen to agree.
              if (i + 1 < geo.bands.length) {
                ok(band.bottom === geo.bands[i + 1].top,
                   label + ": bands " + i + " and " + (i + 1) + " share an edge");
              }
              for (var x = 0; x <= geo.width; x += 2) {
                var top = profileY(band.top, x);
                var bottom = profileY(band.bottom, x);
                ok(bottom >= top - 1e-9,
                   label + ": band " + i + " is inside out at x=" + x +
                   " (" + top + " > " + bottom + ")");
              }
            });
            // And the stack covers the whole SVG, top to bottom.
            eq(geo.bands[0].top[0][1], 0, label);
            eq(profileY(geo.bands[geo.bands.length - 1].bottom, geo.width),
               (positions || VA.rowPositions(TOPO.layout, null, "uniform", M)).height,
               label);
          });

          // The witness: with the grid centred, at least one leader's own
          // vertical really does run through a later leader's horizontal.
          var jog = VA.leaderGeometry(TOPO.layout, plan, M, positions);
          var crossings = 0;
          jog.leaders.forEach(function (a, i) {
            jog.leaders.slice(i + 1).forEach(function (b) {
              var lo = Math.min(a.y1, a.y2), hi = Math.max(a.y1, a.y2);
              if (a.laneX >= b.x1 && a.laneX <= b.laneX &&
                  b.y1 >= lo && b.y1 <= hi) crossings++;
            });
          });
          if (positions) {
            ok(crossings > 0,
               "the centred fixture must actually contain a crossing, or the " +
               "clamp above is never exercised");
          } else {
            eq(crossings, 0, "top-aligned, the leaders still cannot cross");
          }
        });
      });

    await test("angled leaders are one straight segment between the SAME two " +
      "ends the jogged ones have", function () {
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var jogged = VA.leaderGeometry(TOPO.layout, plan, M);
        var angled = VA.leaderGeometry(TOPO.layout, plan, M, null, { style: "angled" });
        eq(jogged.style, "jogged");
        eq(angled.style, "angled");
        eq(angled.width, jogged.width, "the zone is the same width in both");
        angled.leaders.forEach(function (leader, i) {
          var twin = jogged.leaders[i];
          eq(leader.id, twin.id);
          // The contract: both ends, unmoved. This is what lets the browser
          // tier's CORRESPONDENCE_IN_PAGE pass in either style without being
          // taught that styles exist.
          eq(leader.x1, twin.x1, leader.id);
          eq(leader.y1, twin.y1, leader.id);
          eq(leader.y2, twin.y2, leader.id);
          eq(leader.boundary, twin.boundary, leader.id);
          eq(leader.beforeEdge, twin.beforeEdge, leader.id);
          eq(leader.d, "M " + leader.x1 + " " + leader.y1 +
             " L " + angled.width + " " + leader.y2);
          eq(leader.points.length, 2, "one segment, not three");
          ok(twin.points.length === 4, "the jogged one still jogs");
        });
      });

    await test("dragging the jog zone spreads the lanes across the new width " +
      "and moves neither end of any leader", function () {
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var one = VA.leaderGeometry(TOPO.layout, plan, M);
        var three = VA.leaderGeometry(TOPO.layout, plan, M, null, { zoneScale: 3 });
        eq(one.zoneScale, 1);
        eq(three.zoneScale, 3);
        eq(three.naturalZone, one.naturalZone);
        eq(one.width - one.zoneLeft, one.naturalZone);
        eq(three.width - three.zoneLeft, one.naturalZone * 3,
           "the zone is three times as wide, the rails beside it unmoved");
        eq(three.zoneLeft, one.zoneLeft);
        // Evenly spread: the gap between consecutive lanes is the lane pitch
        // times the scale, everywhere.
        three.leaders.forEach(function (leader, i) {
          eq(leader.y1, one.leaders[i].y1, leader.id);
          eq(leader.y2, one.leaders[i].y2, leader.id);
          eq(leader.x1, one.leaders[i].x1, leader.id);
          if (i > 0) {
            eq(leader.laneX - three.leaders[i - 1].laneX, M.leaderLane * 3,
               "lanes stay evenly spread (" + leader.id + ")");
          }
        });
      });

    await test("the jog-zone scale is a multiple of the zone's natural width, " +
      "clamped, and a drag never compounds", function () {
        // A multiple rather than a pixel width because the preference
        // outlives the topology it was set on.
        eq(VA.jogZoneScaleAfterDrag(1, 40, 40), 2);
        eq(VA.jogZoneScaleAfterDrag(2, 40, 40), 3);
        eq(VA.jogZoneScaleAfterDrag(2, -40, 40), 1);
        // Dragging LEFT past the natural width is refused, not inverted: the
        // lanes have to stay far enough apart to be separate lines.
        eq(VA.jogZoneScaleAfterDrag(1, -400, 40), VA.JOG_ZONE_SCALE.min);
        eq(VA.jogZoneScaleAfterDrag(1, 40000, 40), VA.JOG_ZONE_SCALE.max);
        eq(VA.clampJogZoneScale(0), VA.JOG_ZONE_SCALE.min);
        eq(VA.clampJogZoneScale("x"), VA.JOG_ZONE_SCALE.min);
        eq(VA.clampJogZoneScale(1e9), VA.JOG_ZONE_SCALE.max);
        // A zone with no leaders in it has no natural width to scale.
        eq(VA.jogZoneScaleAfterDrag(1, 40, 0), 1);
        // And the clamp is what the geometry applies, not the caller.
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        eq(VA.leaderGeometry(TOPO.layout, plan, VA.RAIL_METRICS, null,
           { zoneScale: 99 }).zoneScale, VA.JOG_ZONE_SCALE.max);
      });

    await test("elementDisplayLabel drops only a leading repeat of the " +
      "component's own name, and never blanks a cell", function () {
        // Jeff's case, verbatim: under component `blade_root`, three rows all
        // opened with "blade-root".
        eq(VA.elementDisplayLabel("blade-root clocking holes to the hub", "blade_root"),
           "clocking holes to the hub");
        // Case- and separator-insensitive on BOTH sides.
        eq(VA.elementDisplayLabel("Blade Root seat", "blade_root"), "seat");
        eq(VA.elementDisplayLabel("blade_root_seat", "blade-root"), "seat");
        // A word that merely starts the same way is not the component's name.
        eq(VA.elementDisplayLabel("blade_rooting torque", "blade_root"),
           "blade_rooting torque");
        // No repeat at all: unchanged, character for character.
        eq(VA.elementDisplayLabel("hub bore to the pin", "blade_root"),
           "hub bore to the pin");
        // A label that is ONLY its component's name keeps it -- an empty
        // element cell would be a worse lie than a repetitive one.
        eq(VA.elementDisplayLabel("blade-root", "blade_root"), "blade-root");
        // A gap group has no part, so there is nothing to match against.
        eq(VA.elementDisplayLabel("shank out", null), "shank out");
        eq(VA.elementDisplayLabel("shank out", ""), "shank out");
        eq(VA.elementDisplayLabel(null, "hub"), "");
      });

    // --- edge-length scaling (viewer_edge_length_scaling, 2026-09-10) -------
    //
    // The demo mechanism exercises every scaling case on purpose: a real
    // spread of tolerance widths (0.04 … 0.2) and nominals (2 … 10), one
    // zero-width band (arm_pin_to_tip, min == max), and one derived gap
    // (tip_to_strut_end, no dimension at all).

    await test("edgeLengthValue reads max − min for tolerance mode, falls " +
      "back to 2 × plus_minus, and is null with nothing to scale by", function () {
        var index = VA.topologyIndex(TOPO);
        eq(VA.edgeLengthValue(index.edges.post_height, "tolerance"),
           Math.abs(10.1 - 9.9));
        // min/max absent, plus_minus present: the handoff's fallback.
        eq(VA.edgeLengthValue({ dimension: { nominal: 5, min: null, max: null,
          plus_minus: 0.3 } }, "tolerance"), 0.6);
        // A zero-width band is a real (zero) width, not an absence.
        eq(VA.edgeLengthValue(index.edges.arm_pin_to_tip, "tolerance"), 0);
        // A derived gap has no dimension: nothing to scale by.
        eq(VA.edgeLengthValue(index.edges.tip_to_strut_end, "tolerance"), null);
        eq(VA.edgeLengthValue(index.edges.tip_to_strut_end, "absolute"), null);
        eq(VA.edgeLengthValue(index.edges.base_thickness, "absolute"), 4);
        // An unstated nominal is null, never treated as a stated zero — the
        // zero itself IS a value (the variation-only case) and scales to the
        // floor via proportional length 0, not via this null.
        eq(VA.edgeLengthValue({ dimension: { nominal: null, min: -0.1,
          max: 0.1, plus_minus: 0.1 } }, "absolute"), null);
        eq(VA.edgeLengthValue(index.edges.base_thickness, "uniform"), null);
      });

    await test("rowPositions in uniform mode reproduces the classic row pitch " +
      "exactly — it is today's rendering, not a near miss", function () {
        var pos = VA.rowPositions(TOPO.layout, TOPO, "uniform", VA.RAIL_METRICS);
        eq(pos.mode, "uniform");
        eq(pos.height, TOPO.layout.rows.length * VA.RAIL_METRICS.rowHeight);
        TOPO.layout.rows.forEach(function (row) {
          eq(pos.byRow[row.row].y, VA.railY(row.row, VA.RAIL_METRICS), row.id);
          eq(pos.byRow[row.row].floored, false, row.id);
        });
        // The keyed stores address every node and every edge by id.
        TOPO.nodes.forEach(function (n) {
          ok(pos.nodes[n.id] !== undefined, "node " + n.id + " keyed");
        });
        TOPO.edges.forEach(function (e) {
          ok(pos.edges[e.id], "edge " + e.id + " keyed");
        });
      });

    await test("rowPositions under a scaled mode stretches edges in " +
      "proportion, keeps node slots at one row, and floors the rest", function () {
        var M = VA.RAIL_METRICS;
        var maxLen = M.rowHeight * VA.EDGE_LENGTH_SCALE.maxRows;
        var floor = M.rowHeight * VA.EDGE_LENGTH_SCALE.floorRows;
        var index = VA.topologyIndex(TOPO);

        ["tolerance", "absolute"].forEach(function (mode) {
          var pos = VA.rowPositions(TOPO.layout, TOPO, mode, M);
          eq(pos.mode, mode);
          // Node slots never scale: an interface is a point.
          TOPO.layout.rows.forEach(function (row) {
            if (row.kind !== "node") return;
            eq(pos.byRow[row.row].height, M.rowHeight, mode + " " + row.id);
          });
          // The largest value in the serialisation renders at exactly maxLen
          // (v/v is exactly 1); everything else is its own proportion of it,
          // floored — the same expression the implementation uses, so float
          // identity holds.
          var vmax = 0;
          TOPO.layout.rows.forEach(function (row) {
            if (row.kind !== "edge") return;
            var v = VA.edgeLengthValue(index.edges[row.id], mode);
            if (v !== null && v > vmax) vmax = v;
          });
          ok(vmax > 0, mode + " has a yardstick");
          TOPO.layout.rows.forEach(function (row) {
            if (row.kind !== "edge") return;
            var v = VA.edgeLengthValue(index.edges[row.id], mode);
            var proportional = v !== null ? (v / vmax) * maxLen : 0;
            var slot = pos.edges[row.id];
            if (proportional < floor) {
              eq(slot.length, floor, mode + " " + row.id + " floored length");
              eq(slot.floored, true, mode + " " + row.id + " floored flag");
            } else {
              eq(slot.length, proportional, mode + " " + row.id);
              eq(slot.floored, false, mode + " " + row.id);
            }
          });
          // The slots tile: total height is the sum of every slot, no gaps.
          var sum = 0;
          TOPO.layout.rows.forEach(function (row) {
            eq(pos.byRow[row.row].top, sum, mode + " row " + row.row + " top");
            sum += pos.byRow[row.row].height;
          });
          eq(pos.height, sum, mode + " height");
        });

        // The named cases, pinned: the zero-width band and the derived gap
        // are floored under tolerance; the derived gap again under absolute;
        // the widest band (post_height, 0.2) is the tolerance yardstick and
        // the largest nominal (post_height, 10) the absolute one.
        var tol = VA.rowPositions(TOPO.layout, TOPO, "tolerance", M);
        eq(tol.edges.arm_pin_to_tip.floored, true);
        eq(tol.edges.tip_to_strut_end.floored, true);
        eq(tol.edges.post_height.floored, false);
        eq(tol.edges.post_height.length, maxLen);
        var abs = VA.rowPositions(TOPO.layout, TOPO, "absolute", M);
        eq(abs.edges.tip_to_strut_end.floored, true);
        eq(abs.edges.post_height.length, maxLen);
        eq(abs.edges.arm_pin_to_tip.floored, false,
           "a real nominal above the floor is a measured proportion");
      });

    await test("a serialisation with no usable values at all — the " +
      "variation-only case — floors every edge rather than inventing a scale",
      function () {
        // pitch_system's real shape: every nominal 0.0, provenance says the
        // nominal is unstated. Miniature here; pinned against the live
        // projection in the [real] tier.
        var mini = miniTopo(false);
        mini.edges[0].dimension = { nominal: 0.0, min: -0.1, max: 0.1, plus_minus: 0.1 };
        mini.edges[1].dimension = { nominal: 0.0, min: -0.05, max: 0.05, plus_minus: 0.05 };
        var pos = VA.rowPositions(mini.layout, mini, "absolute", VA.RAIL_METRICS);
        eq(pos.edges.e1.floored, true);
        eq(pos.edges.e2.floored, true);
        eq(pos.height, mini.layout.rows.length * VA.RAIL_METRICS.rowHeight,
           "all-floored absolute mode is uniform-height, honestly marked");
      });

    await test("railGeometry and leaderGeometry read the keyed position " +
      "store: bars get their slot's extent, dots and leader starts get the " +
      "keyed node y, and the grid-side seam does NOT move", function () {
        var M = VA.RAIL_METRICS;
        var pos = VA.rowPositions(TOPO.layout, TOPO, "tolerance", M);
        var geometry = VA.railGeometry(TOPO.layout, M, pos);
        eq(geometry.height, pos.height);
        geometry.marks.forEach(function (mark) {
          var slot = pos.byRow[mark.row];
          eq(mark.y, slot.y, "mark " + mark.id);
          if (mark.kind === "edge") {
            eq(mark.y1, slot.top + 1, mark.id);
            eq(mark.y2, slot.top + slot.height - 1, mark.id);
            eq(mark.floored, slot.floored, mark.id);
          }
        });
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var geo = VA.leaderGeometry(TOPO.layout, plan, M, pos);
        geo.leaders.forEach(function (leader, i) {
          var planLeader = plan.leaders[i];
          // Node side: the keyed store, which under scaling sits at-or-below
          // the uniform y (edges only ever stretch), so leaders still rise.
          eq(leader.y1, pos.nodes[leader.id], leader.id);
          ok(leader.y1 >= VA.railY(planLeader.layoutRow, M) - 1e-9,
             leader.id + " never rises above its uniform position");
          // Grid side: boundary × rowHeight, exactly as under uniform — the
          // grid's rows stay evenly spaced whatever the DAG did.
          eq(leader.y2, planLeader.boundary * M.rowHeight, leader.id);
          ok(leader.y2 <= leader.y1, leader.id + " still rises left-to-right");
        });
      });

    // --- right-justified spine, the viewport fit, and centring -----------
    //     (viewer_dag_spine_layout, 2026-09-14)

    await test("spineRight mirrors every column claim in a layout and leaves " +
      "the walk itself alone", function () {
        var mirrored = VA.spineRight(TOPO.layout);
        eq(mirrored.columns, TOPO.layout.columns);
        var last = TOPO.layout.columns - 1;
        // Rows: same rows, same order, same ids, mirrored columns. The walk is
        // the author's steering wheel and this must not touch it.
        eq(mirrored.rows.map(function (r) { return r.id; }),
           TOPO.layout.rows.map(function (r) { return r.id; }));
        mirrored.rows.forEach(function (row, i) {
          eq(row.column, last - TOPO.layout.rows[i].column, row.id);
          eq(row.kind, TOPO.layout.rows[i].kind, row.id);
        });
        // The walk's own mainline is column 0 in the projection, so it is the
        // RIGHTMOST column after the mirror — which is the whole deliverable.
        var mainline = mirrored.rows.filter(function (row, i) {
          return TOPO.layout.rows[i].column === 0;
        });
        ok(mainline.length > 1, "the demo mechanism has a mainline");
        mainline.forEach(function (row) { eq(row.column, last, row.id); });
        // Rails and links carry column claims too, and a rail drawn at the old
        // x beside a dot drawn at the new one is the whole failure mode.
        mirrored.rails.forEach(function (rail, i) {
          eq(rail.column, last - TOPO.layout.rails[i].column);
          eq(rail.start, TOPO.layout.rails[i].start);
          eq(rail.end, TOPO.layout.rails[i].end);
        });
        mirrored.links.forEach(function (link, i) {
          eq(link.from_column, last - TOPO.layout.links[i].from_column);
          eq(link.to_column, last - TOPO.layout.links[i].to_column);
          eq(link.row, TOPO.layout.links[i].row);
        });
        // Pure: the projection object the app holds across every render is
        // never written to.
        eq(TOPO.layout.rows[0].column, 0, "the projection's own layout is untouched");
        // A single-column layout mirrors onto itself.
        var mini = miniTopo(false);
        eq(VA.spineRight(mini.layout).rows.map(function (r) { return r.column; }),
           [0, 0, 0, 0, 0]);
      });

    await test("a leader leaves a right-justified spine with no rail standing " +
      "between it and the grid", function () {
        // The observable the mirror exists for: a leader's horizontal run from
        // its dot to its lane crosses every rail standing in the gap, and the
        // spine's leaders used to cross all of them.
        var M = VA.RAIL_METRICS;
        var crossings = function (layout) {
          var plan = VA.gridPlan(layout, TOPO);
          var geo = VA.railGeometry(layout, M);
          var leaderGeo = VA.leaderGeometry(layout, plan, M);
          var n = 0;
          leaderGeo.leaders.forEach(function (leader) {
            geo.rails.forEach(function (rail) {
              if (rail.x > leader.x1 && rail.x < leader.laneX &&
                  rail.y1 <= leader.y1 && leader.y1 <= rail.y2) n++;
            });
          });
          return n;
        };
        var before = crossings(TOPO.layout);
        var after = crossings(VA.spineRight(TOPO.layout));
        ok(before > 0, "the demo mechanism's leaders cross its branch rail");
        eq(after, 0, "right-justified, nothing stands between them and the grid");
      });

    await test("the RENDER draws the spine on the rightmost rail — the page " +
      "mirrors, not just the layout helper", function () {
        // The wiring, not the pure function: VA.spineRight is pinned above,
        // and renderTopoPane calling it is a separate claim that nothing else
        // in this tree can see. A column mirror moves only x, and every other
        // check here measures y or compares the store against itself, so
        // dropping the call renders a left-justified DAG with all three tiers
        // green. Read the x's the page actually drew.
        var M = VA.RAIL_METRICS;
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var spineX = VA.railX(TOPO.layout.columns - 1, M);
        var onMainline = {};
        TOPO.layout.rows.forEach(function (row) {
          if (row.column === 0) onMainline[row.id] = true;
        });
        var x = function (node, attr) { return Number(node.getAttribute(attr)); };

        // Every dot and bar the projection put on the WALK'S OWN MAINLINE is
        // drawn in the rightmost column, hard against the jog zone.
        var mainlineDots = all(root, "circle.rail__dot").filter(function (dot) {
          return onMainline[dot.getAttribute("data-id")];
        });
        ok(mainlineDots.length > 1, "the demo mechanism has a mainline");
        mainlineDots.forEach(function (dot) {
          eq(x(dot, "cx"), spineX, dot.getAttribute("data-id"));
        });
        all(root, "line.rail__bar").forEach(function (bar) {
          if (!onMainline[bar.getAttribute("data-id")]) return;
          eq(x(bar, "x1"), spineX, bar.getAttribute("data-id"));
        });

        // Nothing is drawn to the right of it, and something is drawn to its
        // left — otherwise this passes on a one-column diagram forever.
        var railXs = all(root, "line.rail").map(function (rail) {
          return x(rail, "x1");
        });
        ok(railXs.length > 1, "the demo mechanism has a branch rail");
        railXs.forEach(function (railX) {
          ok(railX <= spineX, "a rail at " + railX + " is right of the spine");
        });
        ok(railXs.some(function (railX) { return railX < spineX; }),
           "the branches extend LEFT of the spine");

        // And the observable that buys: a leader off a mainline dot starts
        // clear of every rail, so it runs straight into its seam.
        var leaders = all(root, "path.rail__leaderhit").filter(function (hit) {
          return onMainline[hit.getAttribute("data-leader-id")];
        });
        ok(leaders.length > 0, "a mainline interface is a part boundary");
        leaders.forEach(function (hit) {
          var startX = Number(/^M ([\d.]+) /.exec(hit.getAttribute("d"))[1]);
          railXs.forEach(function (railX) {
            ok(railX < startX,
               hit.getAttribute("data-leader-id") + " leaves past a rail at " + railX);
          });
        });
      });

    // --- the leader-legibility WIRING (viewer_leader_grid_legibility) -----
    //
    // Every test in this block measures the PAGE, not the pure function beside
    // it. The lesson from viewer_dag_spine_layout's review is the reason:
    // a deliverable that is a call site rather than a computation ships green
    // when the call site is deleted, because nine tests of the pure function
    // cannot see it. Each of these dies under a one-line revert of its own
    // wiring.

    await test("the RENDER tints the bands and the grid rows from ONE parity",
      function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var plan = VA.gridPlan(VA.spineRight(TOPO.layout), TOPO);
        var bands = VA.leaderBands(plan);

        // The SVG's own band polygons, in order, wearing the parity class.
        var drawn = all(root, "path.rail__band");
        eq(drawn.length, bands.length, "one polygon per band");
        drawn.forEach(function (path, i) {
          eq(path.getAttribute("data-band"), String(i));
          ok(path.getAttribute("d"), "a band with no geometry is not a band");
          eq(hasClass(path, "rail__band--b"), bands[i].parity === 1,
             "band " + i + " wears its own parity");
          eq(hasClass(path, "rail__band--a"), bands[i].parity === 0,
             "band " + i + " wears its own parity");
        });

        // And the grid rows carry the SAME parity, which is the whole claim:
        // the band between two leaders and the rows it feeds are one tint.
        var parity = VA.rowBandParity(plan);
        var rows = all(root, "tr.tvrow");
        eq(rows.length, plan.rows.length);
        rows.forEach(function (row) {
          var id = row.getAttribute("data-id");
          var wantsB = parity[id] === 1;
          eq(hasClass(row, "tvrow--band-b"), wantsB, id);
          eq(hasClass(row, "tvrow--band-a"), !wantsB, id);
        });

        // Non-vacuity: both tints are actually on screen, in both places.
        ok(all(root, "path.rail__band--a").length > 0 &&
           all(root, "path.rail__band--b").length > 0, "both band tints drawn");
        ok(all(root, "tr.tvrow--band-a").length > 0 &&
           all(root, "tr.tvrow--band-b").length > 0, "both row tints drawn");
      });

    await test("the RENDER draws the leaders in the style the state asks for, " +
      "with both ends where they always were", function () {
        var ends = function (root) {
          return all(root, "path.rail__leaderhit").map(function (hit) {
            var d = hit.getAttribute("d");
            var head = /^M ([-\d.]+) ([-\d.]+)/.exec(d);
            var tail = /([-\d.]+) ([-\d.]+)$/.exec(d.replace(/ H ([-\d.]+)$/, function (_, x) {
              return " " + x + " " + /V ([-\d.]+)/.exec(d)[1];
            }));
            return { id: hit.getAttribute("data-leader-id"), d: d,
                     x1: Number(head[1]), y1: Number(head[2]),
                     x2: Number(tail[1]), y2: Number(tail[2]) };
          });
        };
        var jogged = ends(render(function (r) { VA.renderTopoPane(r, topoCtx()); }));
        var angled = ends(render(function (r) {
          VA.renderTopoPane(r, topoCtx({ leaderStyle: "angled" }));
        }));
        ok(jogged.length > 0, "the demo mechanism has leaders");
        eq(angled.length, jogged.length);
        angled.forEach(function (leader, i) {
          eq(leader.id, jogged[i].id);
          // The style really changed in the DOM: three orthogonal segments
          // against one straight one.
          ok(/ H .* V .* H /.test(jogged[i].d), "jogged still jogs: " + jogged[i].d);
          ok(/^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/.test(leader.d),
             "angled is one segment: " + leader.d);
          // ...and BOTH ends are untouched, which is what keeps the browser
          // tier's endpoint correspondence true in either style.
          eq(leader.x1, jogged[i].x1, leader.id);
          eq(leader.y1, jogged[i].y1, leader.id);
          eq(leader.x2, jogged[i].x2, leader.id);
          eq(leader.y2, jogged[i].y2, leader.id);
        });
        // The visible twin is drawn from the same path as the hit path.
        var visible = all(render(function (r) {
          VA.renderTopoPane(r, topoCtx({ leaderStyle: "angled" }));
        }), "path.rail__leader");
        eq(visible.length, angled.length);
        visible.forEach(function (path, i) { eq(path.getAttribute("d"), angled[i].d); });
      });

    await test("the RENDER widens the jog zone when the preference says so, " +
      "and the SVG, the header offset and the leaders all move together",
      function () {
        var M = VA.RAIL_METRICS;
        var layout = VA.spineRight(TOPO.layout);
        var plan = VA.gridPlan(layout, TOPO);
        var want = VA.leaderGeometry(layout, plan, M, null, { zoneScale: 3 }).width;
        var narrow = VA.leaderGeometry(layout, plan, M).width;
        ok(want > narrow, "scale 3 is wider than scale 1");

        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ jogZoneScale: 3 }));
        });
        var svg = root.querySelector("svg.tv__rails");
        eq(Number(svg.getAttribute("width")), want, "the SVG spans the wider zone");
        // The header is padded by exactly the SVG's width, or every column
        // label stops sitting over its own column.
        eq(root.querySelector("div.tv__head").style.paddingLeft, want + "px");
        // Every leader hands off at the new right edge -- the grid's left one.
        all(root, "path.rail__leaderhit").forEach(function (hit) {
          var d = hit.getAttribute("d");
          eq(Number(/ H ([-\d.]+)$/.exec(d)[1]), want,
             hit.getAttribute("data-leader-id"));
        });
        // And the bands widen with it rather than staying at the old width.
        ok(all(root, "path.rail__band").length > 0);
        all(root, "path.rail__band").forEach(function (band) {
          ok(band.getAttribute("d").indexOf(String(want)) !== -1,
             "band " + band.getAttribute("data-band") + " reaches the new edge");
        });
      });

    await test("the header carries a grip for the jog zone and one for the " +
      "ELEMENT column, and both drive the app's own handlers", function () {
        var started = [], nudged = [];
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            onResizeStart: function (spec) { started.push(spec); },
            onResizeNudge: function (spec, dx) { nudged.push([spec, dx]); },
          }));
        });
        var grips = all(root, "div.tvgrip");
        eq(grips.length, 2, "one grip per resizable boundary");
        var byKey = {};
        grips.forEach(function (g) { byKey[g.getAttribute("data-resize")] = g; });
        ok(byKey["jog"], "the jog zone's grip");
        ok(byKey["column:name"], "the ELEMENT column's grip");
        // Reachable without a pointer: focusable, and named for a reader.
        grips.forEach(function (g) {
          eq(g.getAttribute("tabindex"), "0");
          ok(g.getAttribute("title"), "a grip says what dragging it does");
          eq(g.getAttribute("role"), "separator");
        });

        // The jog grip hands the app the zone's NATURAL width, which is what
        // turns a pixel drag into a scale -- without it the drag has nothing
        // to divide by.
        byKey.jog.onpointerdown({ preventDefault: function () {}, clientX: 10 });
        eq(started.length, 1);
        eq(started[0].kind, "jog");
        eq(started[0].naturalZone,
           VA.leaderGeometry(VA.spineRight(TOPO.layout),
             VA.gridPlan(VA.spineRight(TOPO.layout), TOPO), VA.RAIL_METRICS).naturalZone);

        byKey["column:name"].onpointerdown({ preventDefault: function () {}, clientX: 10 });
        eq(started.length, 2);
        eq(started[1].kind, "column");
        eq(started[1].cls, "name");

        // Arrow keys nudge; anything else is not ours to swallow.
        var key = function (grip, k, shift) {
          grip.onkeydown({ key: k, shiftKey: !!shift, preventDefault: function () {} });
        };
        key(byKey.jog, "ArrowRight");
        key(byKey.jog, "ArrowLeft");
        key(byKey["column:name"], "ArrowRight", true);
        key(byKey.jog, "Enter");
        eq(nudged.length, 3);
        eq(nudged[0][1], 8);
        eq(nudged[1][1], -8);
        eq(nudged[2][1], 40, "shift is the coarse step");
        eq(nudged[2][0].cls, "name");
      });

    await test("column widths come off the ONE array -- both tables' <col>s " +
      "and their inline totals move together, and the stylesheet declares none",
      function () {
        var was = VA.topoColumn("name").width;
        try {
          var widths = function (root, sel) {
            return all(root, sel).map(function (table) {
              return all(table, "col").map(function (col) { return col.style.width; });
            });
          };
          var check = function (expected) {
            var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
            var tables = all(root, "table");
            eq(tables.length, 2, "a head table and a body table");
            var cols = widths(root, "table");
            eq(cols[0], cols[1], "the two tables' <col> widths cannot disagree");
            eq(cols[0], VA.TOPO_COLUMNS.map(function (c) { return c.width + "px"; }));
            eq(cols[0][2], expected + "px", "the ELEMENT column");
            var total = VA.TOPO_COLUMNS.reduce(function (s, c) { return s + c.width; }, 0);
            tables.forEach(function (t) { eq(t.style.width, total + "px"); });
          };
          check(was);
          eq(VA.setTopoColumnWidth("name", 420), 420);
          check(420);
          // Clamped at both ends: a column dragged to nothing cannot be
          // dragged back, and one dragged past the page is a scrollbar with
          // no content.
          eq(VA.setTopoColumnWidth("name", 1), VA.TOPO_COLUMN_WIDTH.min);
          eq(VA.setTopoColumnWidth("name", 99999), VA.TOPO_COLUMN_WIDTH.max);
          eq(VA.setTopoColumnWidth("nope", 200), null);
          check(VA.TOPO_COLUMN_WIDTH.max);
        } finally {
          VA.setTopoColumnWidth("name", was);
        }

        // The second width source this removed. A `.tvcol--X { width }` rule
        // reappearing in the stylesheet is the drift the shared colgroup
        // exists to prevent, and it would silently win or lose against a
        // dragged width depending on the browser.
        var src = typeof VIEWER_SRC !== "undefined" ? VIEWER_SRC : null;
        if (!src) return;
        var css = src.readText("topology.css");
        ok(css, "topology.css must be readable");
        ok(!/\.tvcol--[a-z]+[^{]*\{[^}]*\bwidth\s*:/.test(css),
           "topology.css must declare no column width -- COLUMNS is the source");
      });

    await test("the element cell drops its own component's name and keeps the " +
      "full label one hover away", function () {
        // A group whose rows all open with the component's name, which is
        // Jeff's blade_root case in miniature.
        var mini = miniTopo(false);
        mini.edges.forEach(function (edge) { edge.part = "blade_root"; });
        mini.parts = [{ id: "blade_root", name: "blade root" }];
        mini.edges[0].name = "blade-root clocking holes to the hub";
        var ctx = { topoProj: mini, study: null, crops: null,
                    layoutMode: "topology", selection: null, detailImage: null,
                    onSelect: function () {} };
        var root = render(function (r) { VA.renderTopoPane(r, ctx); });
        var cells = all(root, "td.tvcell--name");
        ok(cells.length > 0, "the mini topology has rows");
        var first = cells[0];
        eq(first.textContent, "clocking holes to the hub");
        eq(first.getAttribute("title"), "blade-root clocking holes to the hub",
           "the words are one hover away, never dropped");
        // A label that does not repeat its component renders unchanged AND
        // carries no title -- a tooltip repeating the cell is noise.
        var plain = cells.filter(function (c) {
          return c.textContent.indexOf("clocking") === -1;
        })[0];
        ok(plain, "a row whose label does not open with its component");
        eq(plain.getAttribute("title"), null);
      });

    await test("fitEdgeLength lands the DAG on its budget, and gives up the " +
      "proportion before it gives up the floor", function () {
        var floor = 26;
        // Three edges and 104px of node rows: 182px is the shortest this DAG
        // can be drawn. A budget at or under that cannot be met — the floor
        // wins, the page scrolls, and no bar is ever unclickable.
        eq(VA.fitEdgeLength([1, 0.5, 0.25], 104, floor, 182), floor);
        eq(VA.fitEdgeLength([1, 0.5, 0.25], 104, floor, 100), floor);
        // Room for everything: the three lengths are L, L/2 and L/4, and they
        // add up with the nodes to exactly the budget.
        var big = VA.fitEdgeLength([1, 0.5, 0.25], 104, floor, 504);
        eq(104 + big + big / 2 + big / 4, 504);
        ok(big / 4 >= floor, "nothing needed the floor at this budget");
        // The mixed case the solver exists for: the narrow edge cannot have
        // its proportion without going under the floor, so it sits ON the
        // floor and the other two share what is left — still exactly the
        // budget, which a single global scale factor would not manage.
        var mid = VA.fitEdgeLength([1, 0.5, 0.05], 104, floor, 400);
        ok(mid * 0.05 < floor, "the narrow edge is floored");
        eq(104 + mid + mid / 2 + floor, 400);
        // Nothing to scale by at all (every ratio 0) is not a scale of zero:
        // it is the floor.
        eq(VA.fitEdgeLength([0, 0, 0], 104, floor, 900), floor);
        eq(VA.fitEdgeLength([], 104, floor, 900), floor);
      });

    await test("with a viewport the DAG is fitted into it, and a DAG whose " +
      "own floor overruns the budget overruns it honestly", function () {
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var floor = M.rowHeight * VA.EDGE_LENGTH_SCALE.floorRows;
        var rows = TOPO.layout.rows;
        var edges = rows.filter(function (r) { return r.kind === "edge"; }).length;
        var floorMin = rows.length * M.rowHeight;   // nodes + edges, one row each

        // Roomy: the DAG fits, and the cap still applies — the fit only ever
        // scales DOWN. A short topology is not inflated to fill a window;
        // measured on the real documents, inflating one makes the leaders' jog
        // worse rather than better.
        var roomy = VA.rowPositions(TOPO.layout, TOPO, "tolerance", M,
          { budget: 5000, plan: plan });
        eq(roomy.edges.post_height.length,
           M.rowHeight * VA.EDGE_LENGTH_SCALE.maxRows);

        // Tight: the DAG lands on the budget rather than over it.
        var tight = VA.rowPositions(TOPO.layout, TOPO, "tolerance", M,
          { budget: 400, plan: plan });
        ok(tight.dagHeight <= 400 + 1e-9,
           "fitted to " + tight.dagHeight + ", budget 400");
        ok(tight.dagHeight > floorMin, "and it used the room it had");

        // Impossible: floor times edges alone is past the budget. Every bar
        // sits on the floor, every bar says so, and the DAG is exactly as tall
        // as its own row count demands — the page scrolls.
        var over = VA.rowPositions(TOPO.layout, TOPO, "tolerance", M,
          { budget: 100, plan: plan });
        eq(over.dagHeight, floorMin);
        var flooredCount = 0;
        rows.forEach(function (row) {
          if (row.kind !== "edge") return;
          eq(over.edges[row.id].length, floor, row.id);
          eq(over.edges[row.id].floored, true,
             row.id + " must say it is not to scale");
          flooredCount++;
        });
        eq(flooredCount, edges);

        // Uniform mode is the floor everywhere by construction, so a budget
        // changes nothing about it — there is no proportion to give up, and it
        // claims none.
        var uniform = VA.rowPositions(TOPO.layout, TOPO, "uniform", M,
          { budget: 100, plan: plan });
        eq(uniform.dagHeight, floorMin);
        rows.forEach(function (row) {
          eq(uniform.byRow[row.row].floored, false, row.id);
        });
      });

    await test("the grid is centred against the DAG across the leaders' own " +
      "span, which is what makes the largest jog smaller", function () {
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var maxJog = function (positions) {
          var geo = VA.leaderGeometry(TOPO.layout, plan, M, positions);
          var worst = 0;
          geo.leaders.forEach(function (leader) {
            worst = Math.max(worst, Math.abs(leader.y1 - leader.y2));
          });
          return worst;
        };
        ["uniform", "tolerance", "absolute"].forEach(function (mode) {
          var flat = VA.rowPositions(TOPO.layout, TOPO, mode, M);
          var centred = VA.rowPositions(TOPO.layout, TOPO, mode, M,
            { budget: 0, plan: plan });
          eq(flat.gridOffset, 0, mode + ": no grid to centre against, no offset");
          ok(centred.gridOffset > 0, mode + ": the grid moved down");
          ok(maxJog(centred) < maxJog(flat),
             mode + ": max jog " + maxJog(centred) + " vs " + maxJog(flat));
          // The grid's own pitch never changes — it is offset as a BLOCK, so
          // every seam stays exactly one row from the one above it.
          var geo = VA.leaderGeometry(TOPO.layout, plan, M, centred);
          geo.leaders.forEach(function (leader, i) {
            eq(leader.y2,
               centred.gridOffset + plan.leaders[i].boundary * M.rowHeight,
               leader.id);
          });
          // Whichever block sits higher stays put: only one side ever moves.
          ok(centred.offset === 0 || centred.gridOffset === 0,
             mode + ": both blocks cannot move");
        });
        // With no leaders there is nothing to centre across, so the two
        // blocks' own heights are it — and that is the only case where a
        // taller GRID moves the DAG.
        var mini = miniTopo(false);
        var miniPlan = VA.gridPlan(mini.layout, mini);
        eq(miniPlan.leaders, []);
        var pos = VA.rowPositions(mini.layout, mini, "uniform", M,
          { budget: 0, plan: miniPlan });
        eq(pos.dagHeight, 5 * M.rowHeight);
        eq(pos.gridHeight, 2 * M.rowHeight);
        eq(pos.gridOffset, (5 - 2) * M.rowHeight / 2);
        eq(pos.offset, 0);
      });

    await test("centring across the leaders beats centring the two blocks' " +
      "heights — the measured reason this is not the obvious rule", function () {
        // The deliverable said "centre the shorter block against the taller".
        // Shipped instead: centre the LEADERS' own span, because a scaled DAG
        // puts its length where the big dimensions are and not where the
        // leaders are, so height-centring can push every leader further than
        // it started. Without this test the obvious rule passes in place of
        // the measured one — VA.centreOffsets' fallback IS height-centring,
        // so forcing it is a one-line edit.
        var M = VA.RAIL_METRICS;
        var plan = VA.gridPlan(TOPO.layout, TOPO);
        var maxJogAt = function (positions, gridOffset) {
          var worst = 0;
          plan.leaders.forEach(function (leader) {
            var y1 = positions.nodes[leader.id];
            var y2 = gridOffset + leader.boundary * M.rowHeight;
            worst = Math.max(worst, Math.abs(y1 - y2));
          });
          return worst;
        };
        ["uniform", "tolerance", "absolute"].forEach(function (mode) {
          var pos = VA.rowPositions(TOPO.layout, TOPO, mode, M,
            { budget: 0, plan: plan });
          // The rule that shipped, and the one the handoff's words describe.
          var shipped = maxJogAt(pos, pos.gridOffset);
          var byHeight = maxJogAt(pos, (pos.dagHeight - pos.gridHeight) / 2);
          ok(shipped <= byHeight,
             mode + ": leader-span " + shipped + " vs height-centred " + byHeight);
          // And it is the best any single block offset can do: shifting the
          // grid either way from where it sits makes the worst leader worse.
          ok(maxJogAt(pos, pos.gridOffset + M.rowHeight) > shipped,
             mode + ": nudging the grid down makes the worst jog worse");
          ok(maxJogAt(pos, pos.gridOffset - M.rowHeight) > shipped,
             mode + ": nudging the grid up makes the worst jog worse");
        });
        // The case that makes the two rules actually disagree, which is the
        // real documents' shape: the leaders sit in the top third of a DAG
        // whose length is all below them (pitch_link_to_pitch_plate under
        // tolerance width is exactly this — 132px → 228px WORSE if the
        // heights are centred). A mini fixture reproduces it: one long edge
        // at the bottom, past every leader.
        var lopsided = lopsidedTopo();
        var lopsidedPlan = VA.gridPlan(lopsided.layout, lopsided);
        var pos = VA.rowPositions(lopsided.layout, lopsided, "tolerance", M,
          { budget: 0, plan: lopsidedPlan });
        var shipped = maxJogAt2(pos, lopsidedPlan, pos.gridOffset, M);
        var byHeight = maxJogAt2(pos, lopsidedPlan,
          (pos.dagHeight - pos.gridHeight) / 2, M);
        ok(byHeight > shipped * 2,
           "height-centring is far worse here: " + byHeight + " vs " + shipped);
      });

    await test("the render offsets the grid TABLE by the store's own " +
      "gridOffset — the centring is one number, not two", function () {
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ edgeLengthMode: "tolerance" }));
        });
        var positions = VA.lastTopoRender.positions;
        ok(positions.gridOffset > 0, "the demo grid is the shorter block");
        // Read back as a NUMBER: a real browser re-serialises an inline
        // length ("226.19999999999982px" comes back "226.2px") while the fast
        // tier's DOM shim hands back the string it was given, and this suite
        // runs in both.
        var px = function (value) { return parseFloat(value); };
        ok(Math.abs(px(root.querySelector("div.tv__rows").style.marginTop) -
                    positions.gridOffset) < 0.05,
           "the grid table carries the store's own gridOffset");
        // And the SVG is drawn tall enough to hold whichever block is longer,
        // so a leader's seam end is never outside the viewBox.
        ok(Math.abs(px(root.querySelector("svg.tv__rails").style.height) -
                    positions.height) < 0.05,
           "the SVG is the taller of the two blocks");
        ok(positions.height >= positions.gridOffset + positions.gridHeight);
        ok(positions.height >= positions.offset + positions.dagHeight);
      });

    await test("the DAG's height budget is the window less the chrome above " +
      "it, and the header it hands back is the stylesheet's own", function () {
        var M = VA.RAIL_METRICS;
        eq(VA.dagHeightBudget(200, 1000, M),
           1000 - 200 - VA.DAG_FIT.headHeight - VA.DAG_FIT.slack);
        // A page whose chrome has eaten the whole window still gets a usable
        // DAG (and scrolls) rather than a budget of zero.
        eq(VA.dagHeightBudget(980, 1000, M), M.rowHeight * VA.DAG_FIT.minRows);
        var src = typeof VIEWER_SRC !== "undefined" ? VIEWER_SRC : null;
        if (!src) return;
        // `.tv__head` sits INSIDE the pane and is not DAG, so the budget has
        // to hand its height back — and that height lives in the stylesheet.
        // One number in two files is this repo's most-repeated defect: pair
        // them rather than hope.
        var css = src.readText("topology.css");
        ok(css, "topology.css must be readable");
        var head = /\.tv__head\s*\{[^}]*[;{\s]height:\s*(\d+)px/.exec(css);
        ok(head, "expected an explicit height on .tv__head in topology.css");
        eq(Number(head[1]), VA.DAG_FIT.headHeight,
           "VA.DAG_FIT.headHeight must be .tv__head's own CSS height");
      });

    // --- the respine animation (viewer_study_respine_animation) -------------
    //
    // Selecting a study re-serialises the page (the walk's spine gives way to
    // the study's chain) and the change is a MOVEMENT, not a repaint. Every
    // test below is about the same contract from a different side: the
    // animation is presentation, so the settled frame has to be the render
    // the page would have produced without one.
    //
    // demo_strut_branch is the fixture the pairing tests need, and not by
    // luck: its chain visits `post_bushing_offset` at chain row 3, where the
    // WALK has `post_height` -- so a tween that paired the two stores by row
    // index instead of by element would fly the bushing offset in from the
    // post height's slot and still look plausible.

    function respineStores(mode) {
      var M = VA.RAIL_METRICS;
      var walk = VA.spineRight(TOPO.layout);
      var chainLayout = VA.spineRight(topoStudy("demo_strut_branch").layout);
      var walkPlan = VA.gridPlan(walk, TOPO);
      var chainPlan = VA.gridPlan(chainLayout, TOPO);
      return {
        M: M, walk: walk, chainLayout: chainLayout,
        walkPlan: walkPlan, chainPlan: chainPlan,
        // budget 0 is what the fast tier's DOM shim measures (no viewport),
        // so these are the same two stores renderTopoPane builds below.
        from: VA.rowPositions(walk, TOPO, mode || "uniform", M,
          { budget: 0, plan: walkPlan }),
        to: VA.rowPositions(chainLayout, TOPO, mode || "uniform", M,
          { budget: 0, plan: chainPlan }),
      };
    }

    await test("respineEase pins both ends, clamps outside them, and rises",
      function () {
        eq(VA.respineEase(0), 0);
        eq(VA.respineEase(1), 1);
        eq(VA.respineEase(-5), 0);
        eq(VA.respineEase(9), 1);
        var last = -1;
        [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].forEach(function (t) {
          var e = VA.respineEase(t);
          ok(e > last, "ease must rise at " + t + ": " + e + " after " + last);
          last = e;
        });
      });

    await test("the respine tween pairs the two stores by ELEMENT, not by row " +
      "index — which is the whole reason the store is keyed", function () {
        var s = respineStores();
        // The trap: chain row 3 and walk row 3 are different edges.
        eq(s.chainLayout.rows[3].id, "post_bushing_offset");
        eq(s.walk.rows[3].id, "post_height");
        var fromY = s.from.edges.post_bushing_offset.y;
        var toY = s.to.edges.post_bushing_offset.y;
        ok(Math.abs(fromY - toY) > 100,
           "the fixture must actually move this edge: " + fromY + " -> " + toY);

        var half = VA.tweenPositions(s.from, s.to, 0.5);
        ok(Math.abs(half.edges.post_bushing_offset.y - (fromY + toY) / 2) < 1e-9,
           "midway between its OWN two y's");
        // Same claim through byRow, which is what railGeometry reads.
        var slot = half.byRow[3];
        eq(slot.id, "post_bushing_offset");
        eq(slot.kind, "edge");
        ok(Math.abs(slot.y - (fromY + toY) / 2) < 1e-9);
        // Paired by index it would have come from the post height's slot.
        ok(Math.abs(slot.y - (s.from.byRow[3].y + s.to.byRow[3].y) / 2) > 50,
           "an index pairing would put it somewhere else entirely");
      });

    await test("a respine at e = 1 is the target store exactly — the " +
      "animation adds no geometry drift", function () {
        ["uniform", "tolerance", "absolute"].forEach(function (mode) {
          var s = respineStores(mode);
          var settled = VA.tweenPositions(s.from, s.to, 1);
          eq(Object.keys(settled.byRow).sort(), Object.keys(s.to.byRow).sort(),
             mode + ": byRow is the target's rows and only those");
          // "exactly" is a claim about the KEY SETS as much as the values, and
          // it used to be checked on one side of each of the two below --
          // which reads as equality and tests containment
          // (ISSUE_20260915_a_settled_tween_store_is_not_the_target_store_it_
          // keeps_the_outgoing_sides_keys). The carried-over keys were inert,
          // because both geometry passes iterate the layout rather than the
          // store, and they compounded across an interrupted respine.
          eq(Object.keys(settled.nodes).sort(), Object.keys(s.to.nodes).sort(),
             mode + ": nodes is the target's interfaces and only those");
          eq(Object.keys(settled.edges).sort(), Object.keys(s.to.edges).sort(),
             mode + ": edges is the target's dimensions and only those");
          Object.keys(s.to.byRow).forEach(function (key) {
            var a = settled.byRow[key], b = s.to.byRow[key];
            eq([a.id, a.kind], [b.id, b.kind], mode + " row " + key);
            ["top", "height", "y"].forEach(function (f) {
              ok(Math.abs(a[f] - b[f]) < 1e-9,
                 mode + " row " + key + "." + f + ": " + a[f] + " !== " + b[f]);
            });
          });
          Object.keys(s.to.edges).forEach(function (id) {
            ["y1", "y2", "y", "length"].forEach(function (f) {
              ok(Math.abs(settled.edges[id][f] - s.to.edges[id][f]) < 1e-9,
                 mode + " " + id + "." + f);
            });
          });
          Object.keys(s.to.nodes).forEach(function (id) {
            ok(Math.abs(settled.nodes[id] - s.to.nodes[id]) < 1e-9, mode + " " + id);
          });
          ["height", "dagHeight", "gridHeight", "offset", "gridOffset"].forEach(
            function (f) {
              ok(Math.abs(settled[f] - s.to[f]) < 1e-9, mode + " " + f);
            });
          eq(settled.mode, s.to.mode, mode + ": the length mode is the target's");
        });
      });

    await test("a settled respine store's KEY SET is the target's, in both " +
      "directions — nothing of the outgoing serialisation survives settling",
      function () {
        // The guard the test above is named for, stated once on its own so it
        // cannot be lost inside a value-drift loop again, and run BOTH ways:
        // the walk is a superset of any chain, so the select direction is the
        // only one with keys to leak and the deselect direction would pass on
        // a broken function. Both are asserted, and so is which of them is
        // the witness.
        var s = respineStores();
        [[s.from, s.to, "select (walk -> chain)"],
         [s.to, s.from, "deselect (chain -> walk)"]].forEach(function (pair) {
          var settled = VA.tweenPositions(pair[0], pair[1], 1);
          ["byRow", "nodes", "edges"].forEach(function (field) {
            eq(Object.keys(settled[field]).sort(),
               Object.keys(pair[1][field]).sort(),
               pair[2] + ": " + field);
          });
        });
        // Non-vacuity: the select direction really does drop keys, so the
        // assertion above has something to bite on. These are the two
        // interfaces and three dimensions the chain leaves behind.
        var dropped = Object.keys(s.from.nodes).filter(function (id) {
          return s.to.nodes[id] === undefined;
        }).concat(Object.keys(s.from.edges).filter(function (id) {
          return s.to.edges[id] === undefined;
        }));
        eq(dropped.sort(), ["arm_pin_to_tip", "arm_tip", "post_arm_pin",
                            "post_height", "tip_to_strut_end"],
           "the chain drops these, and settling must not keep them");
        // And the mid-flight store is the target's key set too: a stale key
        // is not a settling artifact, it is a carry-over that was never
        // wanted at any e. The rows a transition drops are drawn by the
        // GHOST, from the DOM the outgoing paint already produced.
        var mid = VA.tweenPositions(s.from, s.to, 0.4);
        eq(Object.keys(mid.nodes).sort(), Object.keys(s.to.nodes).sort());
        eq(Object.keys(mid.edges).sort(), Object.keys(s.to.edges).sort());
      });

    await test("an element on one side only fades at its own settled " +
      "position, and everything shared stays opaque", function () {
        var s = respineStores();
        var mid = VA.tweenPositions(s.from, s.to, 0.25);
        // The three edges the chain drops. They are not in the target layout
        // at all, so the ghost is what draws them -- the alpha is the number
        // it fades on.
        ["post_height", "arm_pin_to_tip", "tip_to_strut_end"].forEach(
          function (id) {
            ok(Math.abs(VA.tweenAlpha(mid, "edge", id) - 0.75) < 1e-9,
               id + " must be leaving: " + VA.tweenAlpha(mid, "edge", id));
          });
        // Shared rows are drawn at full strength and MOVE, which is the read
        // the whole animation exists for.
        eq(VA.tweenAlpha(mid, "edge", "post_bushing_offset"), 1);
        eq(VA.tweenAlpha(mid, "node", "base_datum"), 1);
        // Run the other way and the same three ARRIVE -- at their own target
        // position, not slid in from a slot they never occupied.
        var back = VA.tweenPositions(s.to, s.from, 0.25);
        ok(Math.abs(VA.tweenAlpha(back, "edge", "post_height") - 0.25) < 1e-9);
        var row = s.walk.rows.filter(function (r) { return r.id === "post_height"; })[0];
        eq(back.byRow[row.row].y, s.from.byRow[row.row].y);
        // A store with no animation behind it answers 1 for everything.
        eq(VA.tweenAlpha(s.to, "edge", "post_height"), 1);
        eq(VA.tweenAlpha(null, "edge", "post_height"), 1);
      });

    await test("a bar floored on EITHER side wears the not-to-scale mark for " +
      "the whole transition, and the target's own flag once it settles",
      function () {
        // Hand-built stores, because no shared edge of the fixture floors on
        // one side only: the two that floor (arm_pin_to_tip, tip_to_strut_end)
        // are exactly the two the chain drops. The rule still has to hold, so
        // it is tested where it can be seen.
        var store = function (y, floored) {
          var slot = { top: y, height: 26, y: y + 13, floored: floored,
                       id: "e1", kind: "edge" };
          return {
            mode: "tolerance", height: 52, dagHeight: 52, gridHeight: 26,
            offset: 0, gridOffset: 0, byRow: { 0: slot }, nodes: {},
            edges: { e1: { y1: y, y2: y + 26, y: y + 13, length: 26,
                           floored: floored } },
          };
        };
        var wasFloored = VA.tweenPositions(store(0, true), store(100, false), 0.5);
        ok(wasFloored.byRow[0].floored, "still marked while it is moving");
        ok(wasFloored.edges.e1.floored);
        var becomesFloored = VA.tweenPositions(store(0, false), store(100, true), 0.5);
        ok(becomesFloored.byRow[0].floored, "marked on the way in too");
        // Settled, the target's flag is the only one left -- which is what
        // keeps a tween at e = 1 identical to a fresh store, break marks
        // included (BARS_MATCH_STORE_IN_PAGE counts them against it).
        var settled = VA.tweenPositions(store(0, true), store(100, false), 1);
        eq(settled.byRow[0].floored, false);
        eq(settled.edges.e1.floored, false);
        // And on the fixture: the walk's two floored edges are the chain's
        // two dropped ones, so the chain claims no floor of its own.
        var s = respineStores("tolerance");
        ok(s.from.edges.arm_pin_to_tip.floored, "floored in the walk");
        eq(Object.keys(s.to.edges).filter(function (id) {
          return s.to.edges[id].floored;
        }), [], "nothing floors in this chain");
      });

    await test("an element the transition ADDS fades in at its own settled " +
      "position, and the rows around it do not", function () {
        // The deselect direction: the chain gives the spine back to the walk,
        // so three edge rows and two interfaces ARRIVE.
        var chainCtx = topoCtx({ study: topoStudy("demo_strut_branch"),
                                 layoutMode: "chain" });
        var root = render(function (r) { VA.renderTopoPane(r, chainCtx); });
        var from = VA.lastTopoRender;
        var ghost = VA.el("div", "tv__ghost");
        ghost.appendChild(root.querySelector(".tv__hscroll"));
        VA.renderTopoPane(root, topoCtx({
          study: topoStudy("demo_strut_branch"), layoutMode: "topology",
          tween: { positions: from.positions, columns: from.columns, e: 0.25,
                   ghost: ghost },
        }));
        var opacityOf = function (selector, id) {
          var hit = all(root, selector).filter(function (n) {
            return n.getAttribute("data-id") === id;
          })[0];
          ok(hit, "expected " + selector + " for " + id);
          return hit.style.opacity;
        };
        ["post_height", "arm_pin_to_tip", "tip_to_strut_end"].forEach(
          function (id) {
            ok(Math.abs(parseFloat(opacityOf("tr.tvrow", id)) - 0.25) < 0.05,
               id + "'s row arrives faded: " + opacityOf("tr.tvrow", id));
            // The hit twin, because that is the one carrying `data-id` --
            // the visible bar beside it is faded by the same call.
            ok(Math.abs(parseFloat(opacityOf("line.rail__barhit", id)) - 0.25) < 0.05,
               id + "'s bar arrives faded");
          });
        ["post_arm_pin", "arm_tip"].forEach(function (id) {
          ok(Math.abs(parseFloat(opacityOf("circle.rail__dot", id)) - 0.25) < 0.05,
             id + "'s dot arrives faded");
        });
        // Everything the two serialisations share is drawn at full strength
        // and MOVES -- which is the read the animation exists for, and the
        // thing a blanket fade would have thrown away.
        ["base_thickness", "post_bushing_offset", "strut_length"].forEach(
          function (id) {
            eq(opacityOf("tr.tvrow", id) || "", "", id + " is not faded");
            eq(opacityOf("line.rail__barhit", id) || "", "", id + "'s bar is not faded");
          });
        eq(opacityOf("circle.rail__dot", "base_datum") || "", "");
      });

    await test("respineX interpolates the DRAWN COLUMN COUNT and the pane " +
      "width, and both land on the target's own at e = 1", function () {
        var s = respineStores();
        var from = { columns: s.walk.columns,
                     width: VA.leaderGeometry(s.walk, s.walkPlan, s.M, s.from).width };
        var toWidth = VA.leaderGeometry(s.chainLayout, s.chainPlan, s.M, s.to).width;
        var at = function (e) {
          return VA.respineX(s.chainLayout, s.chainPlan, s.M, from, e,
                             undefined);
        };
        // The spine's own drawn index, which is the number the drawn column
        // COUNT is: VA.drawnColumn of the last column, plus one.
        var count = function (e) {
          return VA.drawnColumn(s.chainLayout.columns - 1, at(e)) + 1;
        };
        // e = 0 is the outgoing frame's own two numbers, which is the whole
        // continuity claim: the first frame of a transition draws the picture
        // the reader is already looking at.
        var spread = s.chainLayout.columns - s.walk.columns;
        eq(at(0).columnShift, spread);
        eq(at(0).width, from.width);
        eq(count(0), s.walk.columns,
           "drawn with the OUTGOING serialisation's column count");
        // e = 1 is the target's, exactly -- so a settled frame is a plain
        // render and no geometry drifts through the animation.
        eq(count(1), s.chainLayout.columns);
        eq(at(1).width, toWidth);
        // And it is a straight interpolation in between. `columnShift` is the
        // outgoing frame's whole shortfall at every e -- it does not decay,
        // because the decay lives in VA.drawnColumn, which interpolates each
        // column between the two frames' own indices for its depth.
        eq(at(0.25).columnShift, spread);
        eq(count(0.25), s.walk.columns + 0.25 * (s.chainLayout.columns - s.walk.columns));
        ok(Math.abs(at(0.25).width - (toWidth + 0.75 * (from.width - toWidth)))
           < 1e-9);
        // Out-of-range e is clamped, the same way VA.respineEase clamps it.
        eq(count(-3), count(0));
        eq(count(7), count(1));
        // Nothing to interpolate from (a pane that never rendered) is no
        // tween at all, which is what makes a first paint a plain render.
        eq(VA.respineX(s.chainLayout, s.chainPlan, s.M, null, 0), null);
        eq(VA.respineX(s.chainLayout, s.chainPlan, s.M,
                       { columns: 0, width: 82 }, 0), null);
        eq(VA.respineX(s.chainLayout, s.chainPlan, s.M,
                       { columns: 2, width: 0 }, 0), null);
      });

    await test("a column a respine ADDS unfolds out of the outgoing frame's " +
      "leftmost rail — it is never drawn left of it, because it has no " +
      "outgoing x to come from", function () {
        var s = respineStores();
        var from = { columns: s.chainLayout.columns,
                     width: VA.leaderGeometry(s.chainLayout, s.chainPlan, s.M,
                                              s.to).width };
        var railsAt = function (e) {
          var x = VA.respineX(s.walk, s.walkPlan, s.M, from, e);
          return VA.railGeometry(s.walk, s.M,
            VA.tweenPositions(s.to, s.from, e), { x: x })
            .rails.map(function (rail) { return rail.x; });
        };
        // The deselect direction from a SETTLED chain: its one column gives
        // way to the walk's, so every column but the spine is one the respine
        // adds. At e = 0 they are all collapsed onto drawn column 0 -- which
        // is where a settled frame's leftmost rail always is, and where this
        // one's only rail was. The interrupted case, where the outgoing frame
        // is mid-unfold and has no rail there at all, is the check below.
        var first = railsAt(0);
        eq(first.filter(function (x) { return x === VA.railX(0, s.M); }).length,
           first.length, "every rail starts on the leftmost one: " + first);
        var settled = railsAt(1);
        eq(settled, VA.railGeometry(s.walk, s.M, s.from).rails.map(
             function (rail) { return rail.x; }),
           "and lands on the plain render's own rails");
        ok(settled.length > 1 && Math.max.apply(null, settled) >
           Math.min.apply(null, settled),
           "this fixture really does have columns to unfold: " + settled);
        // Monotone in between: a rail only ever moves away from the leftmost
        // one, never back, so the unfold cannot read as a wobble.
        var previous = railsAt(0);
        [0.25, 0.5, 0.75, 1].forEach(function (e) {
          var now = railsAt(e);
          now.forEach(function (x, i) {
            ok(x >= previous[i] - 1e-9,
               "rail " + i + " went backwards at e = " + e);
          });
          previous = now;
        });
      });

    // A synthetic 10-column walk and a 1-column chain -- the real
    // pitch_system's own column gap, at VA.RAIL_METRICS. The demo fixture is
    // 2 columns wide, which is enough to show a rail unfolding and not enough
    // to show WHERE it unfolds from: the two candidate floors are one gutter
    // apart there and nine apart here.
    function tenColumnWalk() {
      var walk = { columns: 10, rows: [], rails: [], links: [] };
      for (var c = 0; c < 10; c++) {
        walk.rows.push({ row: c, kind: "node", id: "n" + c, column: c });
        walk.rails.push({ column: c, start: c, end: 9 });
      }
      return walk;
    }

    function oneColumnChain() {
      return { columns: 1,
               rows: [{ row: 0, kind: "node", id: "n0", column: 0 }],
               rails: [{ column: 0, start: 0, end: 0 }], links: [] };
    }

    // What a frame DREW, in the three numbers VA.lastTopoRender records and
    // the next transition continues from.
    function drewX(layout, x, width) {
      return { columns: VA.drawnColumn(layout.columns - 1, x) + 1,
               floor: VA.drawnColumn(0, x),
               width: x ? x.width : width };
    }

    await test("a respine interrupting a respine unfolds out of a rail the " +
      "frame it interrupted really drew — not out of drawn column 0, which " +
      "a frame caught mid-unfold has nothing on", function () {
        // ISSUE_20260915_an_interrupted_respine_pops_nine_rails_in_from_
        // nowhere, at its own numbers. The claim rails and links are drawn
        // with no opacity of their own on the strength of -- "a column the
        // transition is adding is drawn collapsed onto a rail the outgoing
        // frame drew, so there is nothing to appear from nowhere" -- used to
        // clamp at drawn column 0. A SETTLED frame always has a rail there;
        // a frame caught at e = 0.5 of a select does not, and nine rails
        // arrived at full opacity where it had drawn nothing at all.
        var M = VA.RAIL_METRICS;
        var plan = { leaders: [], rows: [] };
        var walk = tenColumnWalk();
        var chain = oneColumnChain();
        var railsAt = function (layout, x) {
          return VA.railGeometry(layout, M, undefined, { x: x })
            .rails.map(function (rail) { return rail.x; });
        };
        // Frame A: half way through a select, out of the settled walk.
        var walkWidth = VA.leaderGeometry(walk, plan, M).width;
        var xA = VA.respineX(chain, plan, M,
          { columns: walk.columns, width: walkWidth }, 0.5);
        var frameA = railsAt(chain, xA);
        eq(frameA, [VA.railX(4.5, M)],
           "the chain's one rail, half way out of the walk's spine");
        // Non-vacuity, and the whole defect in one line: frame A has no rail
        // at drawn column 0, so clamping there collapses onto nothing.
        ok(frameA.indexOf(VA.railX(0, M)) === -1,
           "frame A must have nothing at drawn column 0: " + frameA);

        // Frame B: the reader clicks again mid-flight. The interrupting
        // transition's first frame continues from frame A's own record, and
        // every rail it draws has to land on a rail frame A drew.
        var xB = VA.respineX(walk, plan, M, drewX(chain, xA), 0);
        var frameB = railsAt(walk, xB);
        frameB.forEach(function (x, i) {
          ok(frameA.indexOf(x) !== -1, "rail " + i + " of the interrupting " +
             "frame is at " + x + ", where the frame it interrupted drew " +
             "nothing: " + frameB + " vs " + frameA);
        });
        eq(xB.width, xA.width, "and the pane width is continuous too");

        // It still unfolds: the floor relaxes to 0 as the transition settles,
        // so e = 1 is the plain render's own rails and nothing has drifted.
        eq(railsAt(walk, VA.respineX(walk, plan, M, drewX(chain, xA), 1)),
           railsAt(walk, null), "and lands on the plain render's own rails");
        // And no rail wobbles on the way. The settled case's stronger claim
        // -- every rail only ever moves AWAY from the leftmost one -- is not
        // this one's: the fold point here is drawn column 4.5 and has to
        // travel back to 0, so the rails left of the spine move LEFT for the
        // whole flight while the spine moves right. What must hold is that
        // each rail picks one direction and keeps it.
        var track = [0, 0.25, 0.5, 0.75, 1].map(function (e) {
          return railsAt(walk, VA.respineX(walk, plan, M, drewX(chain, xA), e));
        });
        track[0].forEach(function (unused, i) {
          var sign = 0;
          for (var k = 1; k < track.length; k++) {
            var step = track[k][i] - track[k - 1][i];
            if (Math.abs(step) < 1e-9) continue;
            var now = step > 0 ? 1 : -1;
            ok(sign === 0 || sign === now, "rail " + i + " reversed: " +
               track.map(function (frame) { return frame[i]; }));
            sign = now;
          }
        });
        var settled = track[track.length - 1];
        ok(Math.max.apply(null, settled) > Math.min.apply(null, settled),
           "the walk really does unfold: " + settled);

        // A settled `from` carries no floor at all, and reads as 0 -- which
        // is what a settled frame's leftmost drawn column index is.
        eq(VA.respineX(chain, plan, M,
             { columns: walk.columns, width: walkWidth }, 0.5).floor, 0);
        eq(VA.drawnColumn(3, null), 3, "no transition, no clamp");
      });

    await test("a link a respine ADDS between two columns BOTH serialisations " +
      "have fades in — the column unfold cannot cover it, because neither " +
      "column is one the transition adds", function () {
        // ISSUE_20260915_a_rail_or_link_a_respine_adds_on_a_surviving_column_
        // has_no_fade. Synthetic on purpose, and the reason is worth keeping:
        // all 21 study chains across the five committed topologies have
        // `columns: 1` and `links: []` while their walks run 2-10 columns and
        // 2-18 links, so every link a respine adds TODAY arrives on a column
        // the respine also adds and the unfold covers it. The pair below is
        // the case BRIEF_20260915_respine_scope_and_grid_motion item 1 makes
        // reachable: two serialisations differing by a loop closure and by
        // nothing else.
        var M = VA.RAIL_METRICS;
        var plan = { leaders: [], rows: [] };
        var rows = [
          { row: 0, kind: "node", id: "a", column: 0, branch: true },
          { row: 1, kind: "edge", id: "ab", column: 1 },
          { row: 2, kind: "node", id: "b", column: 1 },
          { row: 3, kind: "edge", id: "bc", column: 0 },
          { row: 4, kind: "node", id: "c", column: 0 },
        ];
        var rails = [{ column: 0, start: 0, end: 4 },
                     { column: 1, start: 0, end: 2 }];
        var branch = { kind: "branch", row: 0, from_column: 0, to_row: 0,
                       to_column: 1 };
        var closure = { kind: "close", row: 3, from_column: 0, to_row: 2,
                        to_column: 1 };
        var open = { columns: 2, rows: rows, rails: rails, links: [branch] };
        var closed = { columns: 2, rows: rows, rails: rails,
                       links: [branch, closure] };
        var linksOf = function (layout) {
          return VA.railGeometry(layout, M).links;
        };
        var keyOf = function (layout, link) { return VA.linkKey(layout, link); };
        var kept = keyOf(open, branch);
        var added = keyOf(closed, closure);
        ok(kept !== added, "the two links are not the same link");
        eq(linksOf(open).map(function (l) { return l.key; }), [kept]);
        eq(linksOf(closed).map(function (l) { return l.key; }), [kept, added]);

        // The two sides share their columns, so respineX has nothing to
        // unfold: every rail is at rest from the first frame, and so are both
        // ends of the closure. Its own opacity is the only thing that can
        // carry it in.
        var settledLinks = VA.linkOpacity(linksOf(open), null, 1);
        var from = { columns: open.columns, floor: 0,
                     width: VA.leaderGeometry(open, plan, M).width,
                     links: settledLinks };
        var x = VA.respineX(closed, plan, M, from, 0);
        eq(x.columnShift, 0, "nothing to unfold: the columns are the same");
        eq(VA.railGeometry(closed, M, undefined, { x: x }).rails.map(
             function (r) { return r.x; }),
           VA.railGeometry(open, M).rails.map(function (r) { return r.x; }),
           "and every rail is exactly where the outgoing frame drew it");

        var alphaAt = function (e, prev) {
          return VA.linkOpacity(linksOf(closed),
                                prev === undefined ? from.links : prev, e);
        };
        eq(alphaAt(0)[added], 0,
           "the loop closure would otherwise appear from nowhere at e = 0");
        eq(alphaAt(0.25)[added], 0.25);
        eq(alphaAt(1)[added], 1, "and is whole once the transition settles");
        [0, 0.5, 1].forEach(function (e) {
          eq(alphaAt(e)[kept], 1, "a link both sides draw never fades");
        });
        // Interrupted, a part-done fade continues from what was drawn --
        // the same continuity the column floor gives the rails.
        var caught = alphaAt(0.4);
        eq(alphaAt(0, caught)[added], 0.4);
        ok(alphaAt(0.5, caught)[added] > 0.4 &&
           alphaAt(0.5, caught)[added] < 1);
        // No transition behind it: everything is opaque, which is what makes
        // a plain render carry nothing of the animation.
        eq(VA.linkOpacity(linksOf(closed), null, 0)[added], 1);
      });

    await test("the rendered frame carries a link's fade on the drawn path, " +
      "and a settled frame carries none", function () {
        // The other half of the check above: the geometry knows each link's
        // opacity, and this is the view actually putting it on the path. The
        // deselect direction on the fixture, where both of the walk's links
        // are ones the transition adds -- a chain is linear and has none at
        // all, which is why the shared-column case above has to be synthetic.
        var chainCtx = topoCtx({ study: topoStudy("demo_strut_branch"),
                                 layoutMode: "chain" });
        var root = render(function (r) { VA.renderTopoPane(r, chainCtx); });
        var from = VA.lastTopoRender;
        eq(Object.keys(from.links), [], "a chain is linear: no links to draw");
        eq(all(root, "path.rail__link").length, 0);

        VA.renderTopoPane(root, topoCtx({
          tween: { positions: from.positions, columns: from.columns,
                   floor: from.floor, width: from.width, links: from.links,
                   e: 0.25 },
        }));
        var drawn = all(root, "path.rail__link");
        eq(drawn.length, TOPO.layout.links.length,
           "the walk's own links are drawn");
        drawn.forEach(function (node) {
          ok(Math.abs(parseFloat(node.style.opacity) - 0.25) < 1e-9,
             "a link the respine adds arrives faded: " + node.style.opacity);
        });
        // A plain render fades nothing -- the settled page is the page a
        // render that never animated produces.
        var fresh = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var settled = all(fresh, "path.rail__link");
        eq(settled.length, TOPO.layout.links.length);
        settled.forEach(function (node) {
          eq(node.style.opacity || "", "", "a plain render fades no link");
        });
      });

    await test("a branch link is keyed by where it LANDS, so one fork's two " +
      "fan-outs are two different links", function () {
        // A close link's two ends are two different rows and name it
        // outright; a branch link's `row` and `to_row` are the SAME fork row,
        // so two branches off one fork differ only in `to_column` -- which is
        // the one thing that is not comparable between two serialisations.
        var layout = {
          columns: 3,
          rows: [
            { row: 0, kind: "node", id: "fork", column: 0, branch: true },
            { row: 1, kind: "edge", id: "left", column: 1 },
            { row: 2, kind: "edge", id: "right", column: 2 },
          ],
          rails: [{ column: 0, start: 0, end: 0 }, { column: 1, start: 0, end: 1 },
                  { column: 2, start: 0, end: 2 }],
          links: [
            { kind: "branch", row: 0, from_column: 0, to_row: 0, to_column: 1 },
            { kind: "branch", row: 0, from_column: 0, to_row: 0, to_column: 2 },
          ],
        };
        var keys = VA.railGeometry(layout, VA.RAIL_METRICS).links.map(
          function (l) { return l.key; });
        eq(keys, ["link|branch|node|fork|edge|left",
                  "link|branch|node|fork|edge|right"]);
        // And on the fixture, every drawn link of the walk is distinct --
        // a collision would fade two links as one.
        var walk = VA.spineRight(TOPO.layout);
        var fixture = VA.railGeometry(walk, VA.RAIL_METRICS).links.map(
          function (l) { return l.key; });
        ok(fixture.length === TOPO.layout.links.length && fixture.length > 1,
           "the fixture really has links to key: " + fixture);
        eq(fixture.filter(function (k, i) { return fixture.indexOf(k) !== i; }),
           [], "duplicate link keys: " + fixture);
      });

    await test("every frame of a respine draws every rail, mark, link and " +
      "leader end inside the pane — the DAG no longer unfolds from behind " +
      "its left edge", function () {
        // The defect this pins: the horizontal change used to be one
        // whole-block CSS translate, right-anchored on the outgoing frame's
        // grid seam. The pane's left edge is fixed and the incoming block is
        // the wider one in the grow direction, so anchoring its right edge on
        // the narrow frame's put its left part outside the pane, where
        // .tv__hscroll's overflow-x clipped it
        // (ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_
        // slides). Measured over every drawn x there is, both directions.
        var s = respineStores();
        var drawn = function (fromLayout, fromPlan, fromPos,
                              toLayout, toPlan, toPos, e) {
          var from = { columns: fromLayout.columns,
                       width: VA.leaderGeometry(fromLayout, fromPlan, s.M,
                                                fromPos).width };
          var x = VA.respineX(toLayout, toPlan, s.M, from, e);
          var tweened = VA.tweenPositions(fromPos, toPos, e);
          var geo = VA.railGeometry(toLayout, s.M, tweened, { x: x });
          var leaders = VA.leaderGeometry(toLayout, toPlan, s.M, tweened,
            { x: x });
          var xs = geo.rails.map(function (r) { return r.x; })
            .concat(geo.marks.map(function (m) { return m.x; }))
            .concat(leaders.leaders.map(function (l) { return l.x1; }))
            .concat(leaders.leaders.map(function (l) { return l.laneX; }));
          geo.links.forEach(function (link) {
            (link.d.match(/-?[\d.]+ -?[\d.]+/g) || []).forEach(function (pt) {
              xs.push(parseFloat(pt.split(" ")[0]));
            });
          });
          return { left: Math.min.apply(null, xs),
                   right: Math.max.apply(null, xs),
                   width: leaders.width };
        };
        [0, 0.25, 0.5, 0.75, 1].forEach(function (e) {
          [["deselect", s.chainLayout, s.chainPlan, s.to, s.walk, s.walkPlan,
            s.from],
           ["select", s.walk, s.walkPlan, s.from, s.chainLayout, s.chainPlan,
            s.to]].forEach(function (run) {
            var box = drawn(run[1], run[2], run[3], run[4], run[5], run[6], e);
            ok(box.left >= 0, run[0] + " at e = " + e +
               " draws something at x = " + box.left);
            // The other edge of the same claim: the SVG's own width is the
            // grid's left edge, so anything drawn past it would be under the
            // table (and clipped by the SVG's own viewport).
            ok(box.right <= box.width + 1e-9, run[0] + " at e = " + e +
               " draws past the grid seam: " + box.right + " > " + box.width);
          });
        });
        // Non-vacuity: the width-anchored, whole-block slide this replaced
        // really did put the incoming walk off the pane, so the loop above is
        // not passing on a transition that never moved.
        var wideShift =
          VA.leaderGeometry(s.chainLayout, s.chainPlan, s.M, s.to).width -
          VA.leaderGeometry(s.walk, s.walkPlan, s.M, s.from).width;
        ok(wideShift < 0, "the walk really is the wider serialisation");
        var slid = VA.railGeometry(s.walk, s.M, VA.tweenPositions(s.to, s.from, 0))
          .marks.map(function (m) { return m.x + wideShift; });
        ok(Math.min.apply(null, slid) < 0,
           "the old anchor drew marks at x = " + Math.min.apply(null, slid));
      });

    await test("a tweened render draws the DAG from the interpolated store " +
      "and the interpolated layout, cross-fades the grid and keeps the " +
      "outgoing frame as an inert ghost", function () {
        var s = respineStores();
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var from = VA.lastTopoRender;
        eq(from.tweening, false, "a plain render is not a transition");
        ok(from.width > 0, "the render records the SVG width it drew");
        eq(from.columns, s.walk.columns,
           "and the column count -- the horizontal pair a respine tweens");

        var ghost = VA.el("div", "tv__ghost");
        ghost.appendChild(root.querySelector(".tv__hscroll"));
        VA.renderTopoPane(root, topoCtx({
          study: topoStudy("demo_strut_branch"), layoutMode: "chain",
          tween: { positions: from.positions, columns: from.columns,
                   width: from.width, e: 0.5, ghost: ghost },
        }));
        eq(VA.lastTopoRender.tweening, true);

        // The bar is at the midpoint of its own two slots -- read off the
        // attribute the browser drew from, not off the store.
        var bar = all(root, "line.rail__barhit").filter(function (n) {
          return n.getAttribute("data-id") === "post_bushing_offset";
        })[0];
        ok(bar, "the moving edge must be drawn");
        var want = (s.from.edges.post_bushing_offset.y1 +
                    s.to.edges.post_bushing_offset.y1) / 2 + 1;
        ok(Math.abs(parseFloat(bar.getAttribute("y1")) - want) < 0.05,
           "drawn y1 " + bar.getAttribute("y1") + " should be " + want);

        // The horizontal half, and it is in the GEOMETRY rather than in a
        // transform: the SVG is drawn at the interpolated pane width, so the
        // grid beside it and the header padded to sit over it follow without
        // either of them learning that a transition exists. Nothing carries a
        // translate any more -- a block slide is what drew the incoming
        // serialisation off the pane.
        var x = VA.respineX(s.chainLayout, s.chainPlan, s.M, from, 0.5);
        var svg = root.querySelector("svg.tv__rails");
        ok(Math.abs(parseFloat(svg.getAttribute("width")) - x.width) < 0.05,
           "the SVG is drawn at " + svg.getAttribute("width") +
           ", should be " + x.width);
        ok(Math.abs(parseFloat(root.querySelector(".tv__head").style.paddingLeft)
                    - x.width) < 0.05, "and the header sits over it");
        ok(x.width !== from.width, "this fixture's two widths really differ");
        [".tv__head", ".tv__body"].forEach(function (sel) {
          eq(root.querySelector(sel).style.transform || "", "",
             sel + " must carry no translate");
        });
        // The DAG's own x is the interpolated column spread, and a dot's is
        // the same number its rail is drawn at.
        var dot = all(root, "circle.rail__dot").filter(function (n) {
          return n.getAttribute("data-id") === "base_datum";
        })[0];
        ok(dot, "the spine's first interface must be drawn");
        var mark = VA.railGeometry(s.chainLayout, s.M,
          VA.tweenPositions(s.from, s.to, 0.5), { x: x })
          .marks.filter(function (m) { return m.id === "base_datum"; })[0];
        ok(Math.abs(parseFloat(dot.getAttribute("cx")) - mark.x) < 0.05,
           "drawn cx " + dot.getAttribute("cx") + " should be " + mark.x);

        // The grid cross-fades; the ghost is the other half of it.
        ok(Math.abs(parseFloat(root.querySelector("div.tv__rows").style.opacity)
                    - 0.5) < 0.05, "the incoming grid is at its share");
        var inPane = root.querySelector("div.tv__ghost");
        ok(inPane, "the outgoing frame is re-appended to the pane every frame");
        ok(Math.abs(parseFloat(inPane.style.opacity) - 0.5) < 0.05);
        ok(inPane.querySelector(".tv__hscroll"), "it holds the real outgoing DOM");
      });

    await test("a respine interrupting a respine continues from the picture " +
      "on screen, not from the serialisation behind it", function () {
        // VA.lastTopoRender records what a frame DREW, which mid-transition
        // is an interpolated column count and an interpolated pane width --
        // fractional, and deliberately so. The animator reads that record
        // back as its own `from`, so recording the target serialisation's
        // own numbers instead would make a reader who clicks twice see the
        // DAG jump sideways at the second click.
        var chainCtx = function (over) {
          var ctx = { study: topoStudy("demo_strut_branch"),
                      layoutMode: "chain" };
          Object.keys(over || {}).forEach(function (k) { ctx[k] = over[k]; });
          return topoCtx(ctx);
        };
        var railSet = function (root) {
          return all(root, "line.rail").map(function (n) {
            return parseFloat(n.getAttribute("x1"));
          });
        };
        var spineAndWidth = function (root) {
          var rails = railSet(root);
          return [Math.max.apply(null, rails),
                  parseFloat(root.querySelector("svg.tv__rails")
                    .getAttribute("width"))];
        };

        // A plain walk, then one frame of a respine toward the chain.
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var walk = VA.lastTopoRender;
        VA.renderTopoPane(root, chainCtx({
          tween: { positions: walk.positions, columns: walk.columns,
                   width: walk.width, e: 0.5 },
        }));
        var caught = VA.lastTopoRender;
        var midway = spineAndWidth(root);
        var midwayRails = railSet(root);
        ok(caught.columns > Math.min(walk.columns, 1) &&
           caught.columns < walk.columns,
           "the frame records the count it drew with: " + caught.columns);

        // The interrupt: a new transition, back the other way, off that
        // record. Its FIRST frame has to draw the same picture.
        VA.renderTopoPane(root, topoCtx({
          tween: { positions: caught.positions, columns: caught.columns,
                   floor: caught.floor, width: caught.width,
                   links: caught.links, e: 0 },
        }));
        eq(spineAndWidth(root), midway,
           "the interrupting frame must continue from the drawn picture");
        // And over the whole DRAWN SET, not just its two summary numbers.
        // `spineAndWidth` reduces a frame of N rails to the max rail x and
        // the SVG width -- which are precisely the two numbers VA.respineX
        // returns, so it agreed with itself while the interrupting frame
        // drew rails at x's the caught frame had nothing at
        // (ISSUE_20260915_an_interrupted_respine_pops_nine_rails_in_from_
        // nowhere). Not an equal SET: the walk has more columns than the
        // frame it interrupts, and the extra ones are collapsed on top of
        // one another. Every rail must land on a rail that was there.
        railSet(root).forEach(function (x, i) {
          ok(midwayRails.indexOf(x) !== -1, "rail " + i + " of the " +
             "interrupting frame is at " + x + ", where the frame it " +
             "interrupted drew nothing: " + railSet(root) + " vs " +
             midwayRails);
        });

        // Non-vacuity: the two serialisations' own spines are far apart, so
        // continuing from either of them instead would be visible.
        var freshWalk = spineAndWidth(render(function (r) {
          VA.renderTopoPane(r, topoCtx());
        }));
        var freshChain = spineAndWidth(render(function (r) {
          VA.renderTopoPane(r, chainCtx());
        }));
        ok(midway[0] !== freshWalk[0] && midway[0] !== freshChain[0],
           "midway is its own picture: " + midway + " between " +
           freshChain + " and " + freshWalk);
      });

    await test("the settled frame carries none of the animation: no ghost, " +
      "no slide, no inline opacity, and the numbers a fresh render draws",
      function () {
        var chainCtx = function () {
          return topoCtx({ study: topoStudy("demo_strut_branch"),
                           layoutMode: "chain" });
        };
        var fresh = render(function (r) { VA.renderTopoPane(r, chainCtx()); });
        var freshBars = all(fresh, "line.rail__barhit").map(function (n) {
          return [n.getAttribute("data-id"), n.getAttribute("y1"), n.getAttribute("y2")];
        });

        // The same selection, reached through a whole transition.
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var from = VA.lastTopoRender;
        var clock = 0;
        var queue = [];
        VA.animateTopoPane(root, chainCtx(), from, {
          now: function () { return clock; },
          raf: function (fn) { queue.push(fn); },
          duration: 100, reduced: false,
        });
        while (queue.length) {
          clock += 50;
          queue.shift()();
        }
        eq(VA.lastTopoRender.tweening, false, "it lands on a plain render");
        eq(all(root, "div.tv__ghost").length, 0, "the ghost is gone");
        eq(root.querySelector(".tv__head").style.transform || "", "");
        eq(root.querySelector(".tv__body").style.transform || "", "");
        eq(root.querySelector("div.tv__rows").style.opacity || "", "");
        all(root, "line.rail__bar").forEach(function (n) {
          eq(n.style.opacity || "", "", "no faded bar survives the transition");
        });
        all(root, "circle.rail__dot").forEach(function (n) {
          eq(n.style.opacity || "", "", "no faded dot survives the transition");
        });
        all(root, "tr.tvrow").forEach(function (n) {
          eq(n.style.opacity || "", "", "no faded row survives the transition");
        });
        eq(all(root, "line.rail__barhit").map(function (n) {
          return [n.getAttribute("data-id"), n.getAttribute("y1"), n.getAttribute("y2")];
        }), freshBars, "the settled geometry is the fresh render's, bar for bar");
      });

    await test("VA.animateTopoPane runs a whole transition off an injected " +
      "clock: the outgoing pane becomes the ghost, every frame is a render, " +
      "and a cancel stops it dead", function () {
        var chainCtx = topoCtx({ study: topoStudy("demo_strut_branch"),
                                 layoutMode: "chain" });
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var outgoing = root.querySelector(".tv__hscroll");
        var from = VA.lastTopoRender;
        var clock = 0;
        var queue = [];
        var opts = { now: function () { return clock; },
                     raf: function (fn) { queue.push(fn); },
                     duration: 100, reduced: false };
        var handle = VA.animateTopoPane(root, chainCtx, from, opts);
        ok(handle, "an animated transition hands back a handle");
        // The first frame is drawn synchronously, at e = 0, and it is the
        // outgoing picture: the ghost is opaque and the incoming grid is not
        // yet there. So a click never flashes an intermediate state.
        eq(VA.lastTopoRender.tweening, true);
        eq(VA.lastTopoRender.positions.t, 0);
        var ghost = root.querySelector("div.tv__ghost");
        ok(ghost && ghost.querySelector(".tv__hscroll") === outgoing,
           "the ghost holds the very nodes the previous paint rendered");
        eq(ghost.getAttribute("aria-hidden"), "true",
           "it is a picture of a state the reader has left, not content");
        eq(ghost.querySelector(".tv__head").style.display, "none",
           "the column header is the same header in both — no double image");
        eq(parseFloat(ghost.style.opacity), 1);
        eq(parseFloat(root.querySelector("div.tv__rows").style.opacity), 0);
        eq(queue.length, 1, "and it asks for the next frame");

        clock = 50;
        queue.shift()();
        ok(VA.lastTopoRender.positions.t > 0.3 &&
           VA.lastTopoRender.positions.t < 0.7,
           "halfway through, halfway eased: " + VA.lastTopoRender.positions.t);
        eq(queue.length, 1);

        // Cancelled mid-flight, nothing more is drawn -- which is what lets a
        // resize or a second selection land on top of a running transition.
        handle.cancel();
        var before = VA.lastTopoRender;
        clock = 90;
        queue.shift()();
        ok(VA.lastTopoRender === before, "a cancelled frame renders nothing");
        eq(queue.length, 0);

        // With no previous store there is nothing to animate between, and the
        // pane just renders -- the boot path, and a topology switch.
        var boot = render(function (r) {
          eq(VA.animateTopoPane(r, topoCtx(), null, opts), null);
        });
        ok(boot.querySelector("svg.tv__rails"), "it still painted");
        eq(all(boot, "div.tv__ghost").length, 0);
      });

    await test("a frame that throws stops the transition and lands on the " +
      "page's one crash seam, not on an unhandled error", function () {
        var chainCtx = topoCtx({ study: topoStudy("demo_strut_branch"),
                                 layoutMode: "chain" });
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var from = VA.lastTopoRender;
        var real = VA.renderTopoPane;
        var caught = [];
        var clock = 0;
        var queue = [];
        var frames = 0;
        try {
          VA.renderTopoPane = function (r, c) {
            frames++;
            // The first frame paints; the second one — running off the
            // animation callback, outside every try/catch this page has —
            // blows up.
            if (frames > 1) throw new Error("seeded frame failure");
            return real(r, c);
          };
          VA.animateTopoPane(root, chainCtx, from, {
            now: function () { return clock; },
            raf: function (fn) { queue.push(fn); },
            duration: 100, reduced: false,
            onError: function (err) { caught.push(String(err.message)); },
          });
          eq(queue.length, 1);
          clock = 50;
          queue.shift()();
        } finally {
          VA.renderTopoPane = real;
        }
        eq(caught, ["seeded frame failure"]);
        eq(queue.length, 0, "and it stops asking for frames");
      });

    await test("prefers-reduced-motion jumps to the end state: one render, " +
      "no ghost, no tween", function () {
        var chainCtx = topoCtx({ study: topoStudy("demo_strut_branch"),
                                 layoutMode: "chain" });
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var from = VA.lastTopoRender;
        var asked = 0;
        var handle = VA.animateTopoPane(root, chainCtx, from, {
          reduced: true,
          raf: function () { asked++; },
          now: function () { return 0; },
        });
        eq(handle, null, "nothing is animating, so there is nothing to cancel");
        eq(asked, 0, "and no frame was ever asked for");
        eq(VA.lastTopoRender.tweening, false);
        eq(all(root, "div.tv__ghost").length, 0);
        eq(root.querySelector("div.tv__rows").style.opacity || "", "");
        var fresh = render(function (r) { VA.renderTopoPane(r, chainCtx); });
        eq(all(root, "line.rail__barhit").map(function (n) {
          return n.getAttribute("y1");
        }), all(fresh, "line.rail__barhit").map(function (n) {
          return n.getAttribute("y1");
        }), "the reduced-motion page is the settled page, immediately");
      });

    await test("VA.prefersReducedMotion asks the media query, and no query " +
      "reads as no preference", function () {
        var had = Object.prototype.hasOwnProperty.call(window, "matchMedia");
        var saved = window.matchMedia;
        try {
          var asked = [];
          window.matchMedia = function (q) { asked.push(q); return { matches: true }; };
          eq(VA.prefersReducedMotion(), true);
          eq(asked, ["(prefers-reduced-motion: reduce)"]);
          window.matchMedia = function () { return { matches: false }; };
          eq(VA.prefersReducedMotion(), false);
          // A query that throws (an old engine) is not a crash and not a
          // preference either.
          window.matchMedia = function () { throw new Error("nope"); };
          eq(VA.prefersReducedMotion(), false);
          window.matchMedia = undefined;
          eq(VA.prefersReducedMotion(), false);
        } finally {
          if (had) window.matchMedia = saved; else delete window.matchMedia;
        }
      });

    await test("a floored bar is rendered marked: the --floored class, the " +
      "break glyph, and a hover title that says not-to-scale", function () {
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ edgeLengthMode: "tolerance" }));
        });
        // arm_pin_to_tip (zero-width) and tip_to_strut_end (derived) floor.
        var floored = all(root, "line.rail__bar--floored");
        eq(floored.length, 2);
        eq(all(root, "path.rail__break").length, 2);
        var hits = all(root, "line.rail__barhit").filter(function (h) {
          return h.getAttribute("data-id") === "arm_pin_to_tip";
        });
        has(hits[0].textContent, "not to scale");
        // A bar at its measured proportion is NOT marked, and its hover title
        // is the plain edge title.
        var plain = all(root, "line.rail__barhit").filter(function (h) {
          return h.getAttribute("data-id") === "post_height";
        });
        eq(plain[0].textContent.indexOf("not to scale"), -1);
        // The grid's rows do not move with the mode: still rowHeight, evenly
        // spaced — the leaders absorb the whole difference.
        all(root, "tr.tvrow").forEach(function (row) {
          eq(row.style.height, VA.RAIL_METRICS.rowHeight + "px");
        });
        // Uniform mode marks nothing: it claims no proportion.
        var uniformRoot = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ edgeLengthMode: "uniform" }));
        });
        eq(all(uniformRoot, "line.rail__bar--floored").length, 0);
        eq(all(uniformRoot, "path.rail__break").length, 0);
      });

    await test("the grid renders one row per EDGE in walk order, at the rail " +
      "pitch, with the leaders drawn and internal nodes omitted", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var rows = all(root, "tr.tvrow");
        eq(rows.length, TOPO.edges.length);
        rows.forEach(function (row, i) {
          eq(row.getAttribute("data-id"), TOPO_EDGE_ORDER[i]);
          eq(row.getAttribute("data-row-kind"), "edge");
          // Set inline from VA.RAIL_METRICS, not from the stylesheet: this is
          // the number the leader geometry's seams came from, so it cannot
          // drift from them.
          eq(row.style.height, VA.RAIL_METRICS.rowHeight + "px");
        });
        // No node rows at all: an interface is its dot and its leader now.
        eq(all(root, "tr.tvrow--node").length, 0);
        var leaders = all(root, "path.rail__leader");
        var hits = all(root, "path.rail__leaderhit");
        eq(leaders.length, 5);
        eq(hits.length, 5);
        eq(hits.map(function (h) { return h.getAttribute("data-leader-id"); }),
          ["base_post_seat", "post_arm_pin", "arm_tip", "strut_end",
           "post_strut_bushing"]);
        eq(hits[0].getAttribute("data-boundary-edge"), "post_height");
      });

    await test("the grid is a real <table>, so a rectangular selection can " +
      "paste into Excel as columns", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        eq(all(root, "table.tvtable").length, 1);
        eq(all(root, "tr.tvrow").length, TOPO.edges.length);
        // Real headers (deliverable 2): <th>, not a styled div — and the
        // merged component column is the leftmost of them.
        eq(all(root, "th.tvcell--component").length, 1);
        has(all(root, "th.tvcell--component")[0].textContent, "component");
        eq(all(root, "th.tvcell--nominal").length, 1);
        has(all(root, "th.tvcell--nominal")[0].textContent, "nominal");
        eq(all(root, "th.tvcell--min").length, 1);
        eq(all(root, "th.tvcell--max").length, 1);
        // One merged cell per group, each spanning its own count.
        var cells = all(root, "td.tvcell--component");
        eq(cells.length, 6);
        eq(cells.map(function (c) { return c.textContent; }),
          ["base", "post", "arm", VA.GAP_COMPONENT_LABEL, "strut", "post"]);
      });

    await test("the value cell is decomposed into nominal / min / max columns, " +
      "each printed as transcribed", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var row = all(root, "tr.tvrow").filter(function (n) {
          return n.getAttribute("data-id") === "base_thickness";
        })[0];
        ok(row, "base_thickness must have a row");
        eq(row.querySelector("td.tvcell--nominal").textContent, "4");
        eq(row.querySelector("td.tvcell--min").textContent, "3.98");
        eq(row.querySelector("td.tvcell--max").textContent, "4.02");
        // A derived gap (no dimension) prints none of the three, not zeros.
        var derived = all(root, "tr.tvrow--derived")[0];
        eq(derived.querySelector("td.tvcell--nominal").textContent, "");
      });

    await test("a thumbnail trigger sits on the row for every crop-key'd edge, " +
      "and on no others", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        function rowFor(id) {
          return all(root, "tr.tvrow").filter(function (n) {
            return n.getAttribute("data-id") === id;
          })[0];
        }
        // demo_joint/plate resolves, /washer is unresolvable, /eye predates the
        // crops fixture (no-entry) — all three still earn a trigger, because a
        // crop_key is what decides whether one is offered, not its status.
        has(rowFor("base_thickness").querySelector("button.crop-trigger--resolved")
          .textContent, "drawing crop");
        has(rowFor("post_height").querySelector("button.crop-trigger--unresolvable")
          .textContent, "no crop");
        ok(rowFor("strut_length").querySelector("button.crop-trigger--no-entry"),
          "a crops.json older than the stack still gets a trigger, saying so");
        // No crop_key at all (authored inline, or a derived gap): no trigger —
        // showing one would read as a stale index rather than what it is.
        eq(rowFor("arm_pin_to_tip").querySelector("button.crop-trigger"), null);
        eq(rowFor("post_bushing_offset").querySelector("button.crop-trigger"), null);
        eq(rowFor("tip_to_strut_end").querySelector("button.crop-trigger"), null);
      });

    await test("a fetched crop upgrades its trigger to the actual thumbnail " +
      "image; an unfetched or unresolved one never shows a placeholder",
      function () {
        // The resolved demo crop's PNG, pre-fetched the way topology_app.js's
        // ensureThumbImages caches it (png path -> { url }).
        var entry = VA.cropFor(TOPOCROPS, "demo_joint", "plate");
        eq(entry.status, "resolved");
        var images = {};
        images[entry.png] = { url: "blob:demo" };
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ cropImages: images }));
        });
        function rowFor(id) {
          return all(root, "tr.tvrow").filter(function (n) {
            return n.getAttribute("data-id") === id;
          })[0];
        }
        var thumb = rowFor("base_thickness")
          .querySelector("button.crop-trigger--thumb");
        ok(thumb, "the resolved+fetched crop renders as a thumbnail trigger");
        var img = thumb.querySelector("img.tvthumb");
        ok(img, "and the thumbnail is the actual image");
        eq(img.getAttribute("src"), "blob:demo");
        // Unresolvable stays the stateful text button — a thumbnail-shaped
        // placeholder would read as "not built yet", which is a different fact.
        var washer = rowFor("post_height").querySelector("button.crop-trigger");
        eq(washer.querySelector("img"), null);
        has(washer.textContent, "no crop");
        // Resolved but NOT fetched (no cache entry): still the text button,
        // never a broken <img>.
        var cold = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ cropImages: {} }));
        });
        var coldTrigger = all(cold, "tr.tvrow").filter(function (n) {
          return n.getAttribute("data-id") === "base_thickness";
        })[0].querySelector("button.crop-trigger--resolved");
        eq(coldTrigger.querySelector("img"), null);
        has(coldTrigger.textContent, "drawing crop");
      });

    // --- is there a 3D model of this part? (annotate_affordances_flyout_and_
    // mesh_gating) -----------------------------------------------------------
    //
    // The fact is the BUILDER's (scripts/build_topology_projection.py resolves
    // the part through the alias table against the installed meshes, because
    // the page can reach neither docs/ nor data/meshes/); these pin how the
    // viewer reads it. The fixture's four parts hold the four cases: `base`
    // resolved directly, `arm` through an alias, `post`/`strut` not at all.

    await test("partMeshFact reads the projection's per-part block, direct and " +
      "alias-resolved alike, and an unknown part is simply meshless", function () {
        eq(VA.partMeshFact(TOPO, "base"), { installed: true, part_id: "base" });
        // An alias: the mesh is installed under a DIFFERENT part_id, which is
        // the whole reason the builder has to resolve this and not the page.
        eq(VA.partMeshFact(TOPO, "arm"),
          { installed: true, part_id: "demo_arm_machined" });
        eq(VA.partMeshFact(TOPO, "post"), { installed: false, part_id: null });
        eq(VA.partHasMesh(TOPO, "base"), true);
        eq(VA.partHasMesh(TOPO, "arm"), true);
        eq(VA.partHasMesh(TOPO, "post"), false);
        eq(VA.partHasMesh(TOPO, "strut"), false);
        // A clearance edge names no part at all, and a part the topology does
        // not declare is not a crash: both read as "no mesh", which is the
        // safe direction — the affordance disappears rather than dead-ending.
        eq(VA.partHasMesh(TOPO, null), false);
        eq(VA.partHasMesh(TOPO, "not_a_part"), false);
      });

    await test("a part carrying no mesh block at all (a projection built before " +
      "the field existed) reads as meshless, never as unknown", function () {
        var stale = Object.assign({}, TOPO, {
          parts: TOPO.parts.map(function (p) {
            var copy = Object.assign({}, p);
            delete copy.mesh;
            return copy;
          }),
        });
        eq(VA.partMeshFact(stale, "base"), VA.MESH_FACT_ABSENT);
        eq(VA.partHasMesh(stale, "base"), false);
      });

    await test("studyHasMesh asks whether the CHAIN has anything to show in 3D",
      function () {
        // demo_base_to_tip lassoes arm_pin_to_tip (part arm, meshed).
        eq(VA.studyHasMesh(TOPO, topoStudy("demo_base_to_tip")), true);
        eq(VA.studyHasMesh(TOPO, null), false);
        // The same study over a projection where nothing resolved: one flag
        // flipped in the data turns the whole affordance off, no code change.
        var meshless = Object.assign({}, TOPO, {
          parts: TOPO.parts.map(function (p) {
            return Object.assign({}, p, { mesh: { installed: false, part_id: null } });
          }),
        });
        eq(VA.studyHasMesh(meshless, VA.findStudy(meshless, "demo_base_to_tip")), false);
      });

    // --- hover reference cards (viewer_hover_cards_and_deep_links) -----------
    //
    // The models are pure (VA.edgeCard / VA.componentCard / VA.citationCard);
    // views/cards.js renders one into the same positioned popover node the
    // crop popover uses, so a card is hover-only chrome by construction.

    await test("edgeCard: a keyed edge carries its crop entries as a LIST, its " +
      "citation, and the annotate link only under the gap rule", function () {
        var edge = VA.topologyIndex(TOPO).edges.base_thickness;
        var card = VA.edgeCard(TOPO, edge, TOPOCROPS);
        eq(card.kind, "edge");
        eq(card.title, edge.name);
        // A list on purpose: the second half-side's crop is a stated gap, not
        // an invented image — the card grows to two entries when the index
        // ever holds both sides, with no shape change.
        eq(card.crops.length, 1);
        eq(card.crops[0].entry.status, "resolved");
        eq(card.noCropReason, null);
        ok(card.citation, "the citation rides on the card");
        // base_thickness is traced through its stack element — no annotate
        // link: a binding is identity, never a value source, so the link only
        // offers something where there is a gap to close (VA.needsAnnotation).
        eq(card.annotateParams, null);
      });

    await test("edgeCard: an untraced edge gets the annotate params, and a " +
      "keyless edge states which no-crop fact applies", function () {
        var index = VA.topologyIndex(TOPO);
        var card = VA.edgeCard(TOPO, index.edges.arm_pin_to_tip, TOPOCROPS);
        eq(card.crops, []);
        has(card.noCropReason, "No crop index covers it");
        eq(card.annotateParams.topologyId, "demo_mechanism");
        eq(card.annotateParams.edgeId, "arm_pin_to_tip");
        var derived = VA.edgeCard(TOPO, index.edges.tip_to_strut_end, TOPOCROPS);
        has(derived.noCropReason, "derived gap");
      });

    await test("edgeCard reads a {topology, edge} key out of by_topology — the " +
      "space the real pitch_system's six croppable edges live in", function () {
        var edge = Object.assign({}, VA.topologyIndex(TOPO).edges.arm_pin_to_tip, {
          crop_key: { topology: "demo_mechanism", edge: "arm_pin_to_tip" },
        });
        var card = VA.edgeCard(TOPO, edge, TOPOCROPS);
        eq(card.crops.length, 1);
        eq(card.crops[0].entry.status, "resolved");
        eq(card.crops[0].entry.png, "crops/demo_mechanism__arm_pin_to_tip.png");
      });

    await test("componentCard derives its thumbnail from the part's OWN rows' " +
      "resolved crops, and a clearance gets no card at all", function () {
        var card = VA.componentCard(TOPO, "base", TOPOCROPS);
        eq(card.kind, "component");
        eq(card.id, "base");
        eq(card.thumbs.length, 1);
        eq(card.thumbs[0].edgeId, "base_thickness");
        eq(card.thumbs[0].entry.status, "resolved");
        // post's one keyed edge (post_height) is unresolvable: no thumb, and
        // nothing invented in its place.
        eq(VA.componentCard(TOPO, "post", TOPOCROPS).thumbs, []);
        // arm's edge has no crop key at all: same answer.
        eq(VA.componentCard(TOPO, "arm", TOPOCROPS).thumbs, []);
        eq(VA.componentCard(TOPO, null, TOPOCROPS), null);
        eq(card.annotateParams, { topologyId: "demo_mechanism", part: "base" });
      });

    await test("a card offers 3D only where the part has a mesh — the untraced " +
      "edge and the component cell both", function () {
        var index = VA.topologyIndex(TOPO);
        // post_bushing_offset is a NO CITATION row (the loud gap state that
        // used to always get the link) on a part with no installed mesh: an
        // annotator with no geometry for `post` cannot bind a face, so there
        // is no gap-closing gesture behind the click. The row stays on the gap
        // list; what goes away is the dead link.
        var meshless = VA.edgeCard(TOPO, index.edges.post_bushing_offset, TOPOCROPS);
        eq(meshless.confidence, "no_source_ref");
        eq(meshless.annotateParams, null);
        // Everything else the card says is unchanged.
        has(meshless.noCropReason, "No crop index covers it");
        // Same rule on the component cell, both ways round.
        eq(VA.componentCard(TOPO, "post", TOPOCROPS).annotateParams, null);
        eq(VA.componentCard(TOPO, "strut", TOPOCROPS).annotateParams, null);
        ok(VA.componentCard(TOPO, "arm", TOPOCROPS).annotateParams,
          "arm resolves through the alias table, so its card keeps the affordance");
      });

    await test("renderHoverCard: a card with no 3D affordance renders NOTHING " +
      "about 3D — no disabled control, no explanation", function () {
        var root = render(function (r) {
          VA.renderHoverCard(r, VA.componentCard(TOPO, "post", TOPOCROPS), {},
            VA.CONFIG, null);
        });
        eq(all(root, ".hovercard__links").length, 0);
        eq(/3D/.test(root.textContent), false);
      });

    await test("renderHoverCard: with the annotate mount probed, a card's 3D " +
      "affordance drives the ONE flyout instead of opening a second tab",
      function () {
        var launched = [];
        var card = VA.componentCard(TOPO, "base", TOPOCROPS);
        var root = render(function (r) {
          VA.renderHoverCard(r, card, {}, VA.CONFIG, null, {
            mount: true, onAnnotate: function (params) { launched.push(params); },
          });
        });
        eq(all(root, "a.hovercard__3d").length, 0);
        var btn = root.querySelector("button.hovercard__3d");
        ok(btn, "expected the flyout button with the mount probed");
        btn.onclick();
        eq(launched, [{ topologyId: "demo_mechanism", part: "base" }]);
        // An edge card routes the same way, carrying its own params.
        var edge = VA.edgeCard(TOPO, VA.topologyIndex(TOPO).edges.arm_pin_to_tip,
          TOPOCROPS);
        var edgeRoot = render(function (r) {
          VA.renderHoverCard(r, edge, {}, VA.CONFIG, null, {
            mount: true, onAnnotate: function (params) { launched.push(params); },
          });
        });
        edgeRoot.querySelector("button.hovercard__3d").onclick();
        eq(launched[1], { topologyId: "demo_mechanism", edgeId: "arm_pin_to_tip",
          part: "arm" });
      });

    await test("without the mount, or without a launcher, a card's 3D " +
      "affordance stays the plain new-tab link it has always been", function () {
        var card = VA.componentCard(TOPO, "base", TOPOCROPS);
        [undefined, { mount: false, onAnnotate: function () {} }, { mount: true }]
          .forEach(function (annotate, i) {
            var root = render(function (r) {
              VA.renderHoverCard(r, card, {}, VA.CONFIG, null, annotate);
            });
            var a = root.querySelector("a.hovercard__3d");
            ok(a, "expected the plain link, case " + i);
            has(a.getAttribute("href"), "isolate=base");
            eq(a.getAttribute("target"), "_blank");
            eq(all(root, "button.hovercard__3d").length, 0);
          });
      });

    await test("citationCard reassembles what the stack view already renders — " +
      "where-ref, callout, note, export provenance", function () {
        var ref = DEMO.stack.elements[0].source_ref;
        var entry = VA.cropFor(CROPS, "demo_joint", "plate");
        var card = VA.citationCard(ref, null, entry);
        eq(card.kind, "citation");
        eq(card.title, VA.citationWhere(ref));
        eq(card.callout, ref.callout);
        eq(card.provenance.state, "established");
        eq(card.entry, entry);
        eq(VA.citationCard(null, null, null), null);
        // The spec-pile identity rule reaches the card the same way it
        // reaches the right pane: through VA.exportProvenance.
        var spec = VA.citationCard({ kind: "spec", document: "NAS6403" },
          "spec_pile_filename", null);
        eq(spec.provenance.state, "identity_rule");
      });

    await test("renderHoverCard: an edge card shows the crop block, the " +
      "citation line and the crop-key claim", function () {
        var edge = VA.topologyIndex(TOPO).edges.base_thickness;
        var card = VA.edgeCard(TOPO, edge, TOPOCROPS);
        var images = {};
        images[card.crops[0].entry.png] = { url: "blob:demo" };
        var root = render(function (r) {
          VA.renderHoverCard(r, card, images, VA.CONFIG, function () {});
        });
        has(root.className, "hovercard--edge");
        eq(all(root, "img").length, 1);
        has(root.textContent, "cited at:");
        has(root.textContent, "from stack `demo_joint`, element `plate`");
        has(root.textContent, "215197 A.1.pdf");
        // The close button is the popover's own.
        eq(all(root, "button.croppop__close").length, 1);
        // Traced edge: no annotate link.
        eq(all(root, "a").filter(function (a) {
          return /annotate/.test(a.getAttribute("href") || "");
        }).length, 0);
      });

    await test("renderHoverCard: an untraced keyless edge card states the " +
      "no-crop fact and deep-links to the annotator", function () {
        var card = VA.edgeCard(TOPO, VA.topologyIndex(TOPO).edges.arm_pin_to_tip,
          TOPOCROPS);
        var root = render(function (r) {
          VA.renderHoverCard(r, card, {}, VA.CONFIG, null);
        });
        eq(all(root, "img").length, 0);
        has(root.textContent, "No crop index covers it");
        var annotate = all(root, "a").filter(function (a) {
          return /annotate/.test(a.getAttribute("href") || "");
        });
        eq(annotate.length, 1);
        has(annotate[0].getAttribute("href"),
          "../annotate/index.html?topology=demo_mechanism&edge=arm_pin_to_tip");
      });

    await test("renderHoverCard: a component card shows identity, the derived " +
      "thumbnail, and the isolate link — and nothing for a part with no image",
      function () {
        var card = VA.componentCard(TOPO, "base", TOPOCROPS);
        var images = {};
        images[card.thumbs[0].entry.png] = { url: "blob:demo" };
        var root = render(function (r) {
          VA.renderHoverCard(r, card, images, VA.CONFIG, null);
        });
        has(root.className, "hovercard--component");
        has(root.textContent, "drawing 215197");
        eq(all(root, "img").length, 1);
        has(root.textContent, "crop of its `base plate thickness` annotation");
        var isolate = all(root, "a")[all(root, "a").length - 1];
        has(isolate.getAttribute("href"), "isolate=base");

        var bare = render(function (r) {
          VA.renderHoverCard(r, VA.componentCard(TOPO, "arm", TOPOCROPS), {},
            VA.CONFIG, null);
        });
        // Absent is absent: no image, no placeholder, no crop wording at all.
        eq(all(bare, "img").length, 0);
        eq(bare.textContent.indexOf("crop"), -1);
      });

    await test("renderHoverCard: a citation card renders the export block and " +
      "the cited sheet's crop where one resolved", function () {
        var ref = DEMO.stack.elements[0].source_ref;
        var entry = VA.cropFor(CROPS, "demo_joint", "plate");
        var images = {};
        images[entry.png] = { url: "blob:demo" };
        var root = render(function (r) {
          VA.renderHoverCard(r, VA.citationCard(ref, null, entry), images,
            VA.CONFIG, null);
        });
        has(root.className, "hovercard--citation");
        has(root.textContent, "215197 · rev A.1 · sheet 2");
        has(root.textContent, "export established");
        eq(all(root, ".el-export").length, 1);
        eq(all(root, "img").length, 1);
        // The run ids print through the same one runs-line builder the right
        // pane uses (VA.exportRunsLine) — linked only where the crop resolved
        // through that run, plain text otherwise.
        has(root.textContent, "drawing-checker runs:");
      });

    await test("renderHoverCard says a card kind it has no branch for out loud",
      function () {
        var root = render(function (r) {
          VA.renderHoverCard(r, { kind: "banana" }, {}, VA.CONFIG, null);
        });
        has(root.textContent, "no branch for");
      });

    await test("the grid's triggers: the confidence chip and a part's merged " +
      "cell open cards; the clearance cell keeps its plain title", function () {
        var shown = [];
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            onCardShow: function (card, trigger) { shown.push([card, trigger]); },
          }));
        });
        // Every edge with a citation gets a card-trigger confidence chip —
        // four of the six demo edges have one (post_bushing_offset carries no
        // source_ref, and the derived gap carries no dimension at all); those
        // two keep plain chips.
        var chips = all(root, "span.cardtrig");
        eq(chips.length, 4);
        chips[0].onmouseenter();
        eq(shown.length, 1);
        eq(shown[0][0].kind, "citation");
        // A part's merged component cell is a trigger; the gap group's is not.
        var cells = all(root, "td.tvcell--component");
        ok(String(cells[0].className).indexOf("cardtrig") !== -1,
           "a part's cell is a card trigger");
        cells[0].onmouseenter();
        eq(shown[1][0].kind, "component");
        eq(shown[1][0].id, "base");
        var gapCell = cells.filter(function (c) {
          return c.textContent === VA.GAP_COMPONENT_LABEL;
        })[0];
        eq(String(gapCell.className).indexOf("cardtrig"), -1);
        ok(gapCell.getAttribute("title"), "the clearance keeps its title");
        // The crop trigger now opens the EDGE card through the same handler.
        var trigger = all(root, "button.crop-trigger--resolved")[0];
        trigger.onmouseenter();
        eq(shown[2][0].kind, "edge");
        eq(shown[2][0].id, "base_thickness");
      });

    // --- the DAG's own hover cards (viewer_dag_hover_cards) ------------------
    //
    // The same cards, on the graph's own hover surfaces: the rail bar opens
    // the edge card the grid's crop trigger opens, and a dot opens the node
    // card (a node is an interface, so what it shows is which parts meet
    // there). One hover surface, not two -- a card ABSORBS the native title
    // the mark used to carry rather than stacking under it.

    await test("nodeCard: a boundary dot names both parts, and thumbnails only " +
      "the side whose own rows cropped", function () {
        var card = VA.nodeCard(TOPO, "base_post_seat", TOPOCROPS);
        eq(card.kind, "node");
        eq(card.title, "base / post seat");
        eq(card.nodeKind, "mating_surface");
        eq(card.degree, 3);
        eq(card.branch, true);
        eq(card.internal, false);
        // Two facts, not one: what the author DECLARED meets here, and what
        // the incident edges actually say -- the second is what the picture
        // (and the leader rule) is drawn from, so it is what the card shows.
        eq(card.declaredParts, ["base", "post"]);
        eq(card.sides.map(function (s) { return s.part; }), ["base", "post"]);
        eq(card.sides[0].label, "base plate");
        eq(card.sides[0].drawing, "215197");
        // Each side's thumbnail IS that part's component-card thumbnail, so
        // the dot and the merged cell cannot disagree about a part's picture.
        eq(card.sides[0].thumb.edgeName,
          VA.componentCard(TOPO, "base", TOPOCROPS).thumbs[0].edgeName);
        eq(card.sides[0].thumb.entry.status, "resolved");
        // post's one keyed edge is unresolvable: named side, no thumbnail,
        // nothing invented in its place.
        eq(card.sides[1].thumb, null);
        eq(VA.nodeCard(TOPO, "not_a_node", TOPOCROPS), null);
      });

    await test("nodeCard: an internal dot says internal, and a clearance side " +
      "is named rather than skipped", function () {
        var internal = VA.nodeCard(TOPO, "base_datum", TOPOCROPS);
        eq(internal.internal, true);
        eq(internal.sides.length, 1);
        eq(internal.sides[0].part, "base");
        // arm_tip's two edges are the arm's own dimension and the derived gap,
        // which carries no part at all -- a clearance is a real side of the
        // interface, so it is named in the grid's own words.
        var clearance = VA.nodeCard(TOPO, "arm_tip", TOPOCROPS);
        eq(clearance.internal, false);
        eq(clearance.sides.length, 2);
        eq(clearance.sides[1].part, null);
        eq(clearance.sides[1].label, VA.CLEARANCE_SIDE_LABEL);
        eq(clearance.sides[1].thumb, null);
      });

    await test("renderHoverCard: a node card names its sides and renders an " +
      "image only where a side's crop resolves", function () {
        var images = {};
        images[TOPOCROPS.by_stack.demo_joint.plate.png] =
          { url: "blob:plate", width: 400, height: 300 };
        var root = render(function (r) {
          VA.renderHoverCard(r, VA.nodeCard(TOPO, "base_post_seat", TOPOCROPS),
            images, VA.CONFIG, null);
        });
        eq(root.className, "croppop hovercard hovercard--node");
        has(root.textContent, "base / post seat");
        has(root.textContent, "mating_surface");
        has(root.textContent, "3 edge(s)");
        has(root.textContent, "BRANCH POINT");
        // Both sides are said; only one carries an image.
        has(root.textContent, "base plate ⇔ post");
        has(root.textContent, "crop of its `base plate thickness` annotation");
        eq(all(root, ".cropblock").length, 1);
        eq(all(root, ".hovercard__noresolve").length, 0);
        has(root.textContent, "An interface is a location, not a value");

        // A dot neither of whose sides cropped gets NO image slot at all --
        // absent is absent, the same rule the component card follows.
        var bare = render(function (r) {
          VA.renderHoverCard(r, VA.nodeCard(TOPO, "arm_tip", TOPOCROPS), {},
            VA.CONFIG, null);
        });
        eq(all(bare, ".cropblock").length, 0);
        eq(all(bare, "img").length, 0);
        has(bare.textContent, VA.CLEARANCE_SIDE_LABEL);

        // An internal dot says which part it is internal to, and why there is
        // no boundary there.
        var inside = render(function (r) {
          VA.renderHoverCard(r, VA.nodeCard(TOPO, "base_datum", TOPOCROPS), {},
            VA.CONFIG, null);
        });
        has(inside.textContent, "internal to base plate");
        has(inside.textContent, "belongs to one part");
      });

    await test("the DAG's bars and dots open the SAME cards the grid opens, " +
      "and the native titles they used to carry are absorbed", function () {
        var shown = [];
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            onCardShow: function (card, trigger) { shown.push([card, trigger]); },
          }));
        });
        // Not one native tooltip left on a mark that now cards: two hover
        // surfaces saying less than one is the defect this replaces.
        all(root, "line.rail__barhit").forEach(function (hit) {
          eq(hit.textContent, "", hit.getAttribute("data-id") + " keeps a title");
        });
        all(root, "circle.rail__dot").forEach(function (dot) {
          eq(dot.textContent, "", dot.getAttribute("data-id") + " keeps a title");
        });
        var bar = all(root, "line.rail__barhit").filter(function (h) {
          return h.getAttribute("data-id") === "base_thickness";
        })[0];
        bar.onmouseenter();
        eq(shown[0][0].kind, "edge");
        eq(shown[0][0].id, "base_thickness");
        ok(shown[0][1] === bar,
          "the bar itself is the trigger the popover places against");
        // The value-level pin: the bar's card and the grid trigger's card for
        // the same edge are the same card, field for field. Two triggers, one
        // model -- if they ever diverge, a reader gets two answers about one
        // dimension.
        all(root, "button.crop-trigger")[0].onmouseenter();
        eq(shown[1][0], shown[0][0]);
        // A dot opens the node card for its own interface.
        var dot = all(root, "circle.rail__dot")[0];
        dot.onmouseenter();
        eq(shown[2][0].kind, "node");
        eq(shown[2][0].id, dot.getAttribute("data-id"));
        // Focus opens them too -- the marks are tabbable, and a keyboard
        // reader gets the same card.
        dot.onfocus();
        eq(shown[3][0].kind, "node");
        // Click is still SELECTION and ONLY selection, which is a rail mark's
        // primary job: the card is the hover's, and the preview pane the
        // click fills is the surface that persists.
        var selected = [];
        var clickRoot = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            onCardShow: function () { throw new Error("click must not card"); },
            onSelect: function (kind, id) { selected.push([kind, id]); },
          }));
        });
        all(clickRoot, "circle.rail__dot")[0].onclick();
        eq(selected[0][0], "node");
        all(clickRoot, "line.rail__barhit")[0].onclick();
        eq(selected[1][0], "edge");
      });

    await test("a caller with no card handler keeps the plain hover titles — " +
      "and a floored bar's not-to-scale fact moves into the card", function () {
        // The fallback wiring, the same shape the crop trigger's onCropShow
        // fallback has: no handler, no card, so the native title stays.
        var bare = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var titled = all(bare, "line.rail__barhit").filter(function (h) {
          return h.getAttribute("data-id") === "base_thickness";
        })[0];
        has(titled.textContent, "base plate thickness");
        ok(all(bare, "circle.rail__dot")[0].textContent, "a dot keeps its title");

        // Under a scaled mode a floored bar used to say "not to scale" in that
        // title. The card absorbed the title, so it says it here or nowhere --
        // one set of words, in VA.FLOORED_RENDER_NOTE.
        has(VA.flooredEdgeTitle(VA.topologyIndex(TOPO).edges.arm_pin_to_tip,
          "arm_pin_to_tip"), VA.FLOORED_RENDER_NOTE);
        var shown = [];
        var scaled = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            edgeLengthMode: "tolerance",
            onCardShow: function (card) { shown.push(card); },
          }));
        });
        var byId = function (id) {
          return all(scaled, "line.rail__barhit").filter(function (h) {
            return h.getAttribute("data-id") === id;
          })[0];
        };
        byId("arm_pin_to_tip").onmouseenter();
        eq(shown[0].renderNote, VA.FLOORED_RENDER_NOTE);
        var card = render(function (r) {
          VA.renderHoverCard(r, shown[0], {}, VA.CONFIG, null);
        });
        has(card.textContent, "not to scale");
        // A bar drawn at its measured proportion claims nothing about the
        // render, so its card says nothing about it either.
        byId("post_height").onmouseenter();
        eq(shown[1].renderNote, null);
        eq(VA.edgeCard(TOPO, VA.topologyIndex(TOPO).edges.post_height,
          TOPOCROPS).renderNote, null);
      });

    await test("selecting a node marks its dot and its leader — the grid has " +
      "no node row to outline", function () {
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            selection: { kind: "node", id: "base_post_seat" } }));
        });
        eq(all(root, "circle.rail__dot--selected").length, 1);
        eq(all(root, "path.rail__leader--selected").length, 1);
        eq(all(root, "tr.tvrow--selected").length, 0);
        // An internal node still selects (its dot is clickable), it just has
        // no leader to mark.
        var internalRoot = render(function (r) {
          VA.renderTopoPane(r, topoCtx({
            selection: { kind: "node", id: "base_datum" } }));
        });
        eq(all(internalRoot, "circle.rail__dot--selected").length, 1);
        eq(all(internalRoot, "path.rail__leader--selected").length, 0);
      });

    await test("the preview pane says which side of the leader rule an " +
      "interface is on", function () {
        var boundary = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "node", id: "base_post_seat" } }));
        });
        has(boundary.textContent, "A component boundary");
        has(boundary.textContent, "base / post");
        var internal = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "node", id: "base_datum" } }));
        });
        has(internal.textContent, "An internal interface");
        has(internal.textContent, "no leader line is drawn");
        // A gap boundary names the clearance in plain words, not `null`.
        var gapSide = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "node", id: "arm_tip" } }));
        });
        has(gapSide.textContent, "a clearance");
        eq(gapSide.textContent.indexOf("null"), -1);
      });

    await test("the preview pane names the DERIVED sides its dot's hover card " +
      "names, not the node's authored `parts` list", function () {
        // (surfaces_that_state_something_false.) arm_tip DECLARES one part and
        // is incident on the derived gap, which carries none -- an authored
        // parts list cannot name a clearance, so hovered and clicked this same
        // dot used to answer differently. Both surfaces now read one
        // adjacency: VA.nodeAdjacentParts.
        eq(VA.topologyIndex(TOPO).nodes.arm_tip.parts, ["arm"]);
        var pane = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "node", id: "arm_tip" } }));
        });
        var where = pane.querySelector("div.detail__where").textContent;
        eq(where, "on arm ⇔ " + VA.CLEARANCE_SIDE_LABEL);
        // Side for side, in order, against the card the hover opens.
        var card = VA.nodeCard(TOPO, "arm_tip", TOPOCROPS);
        eq(where, "on " + card.sides.map(function (side) {
          return side.part === null ? VA.CLEARANCE_SIDE_LABEL : side.part;
        }).join(" ⇔ "));
        // And the leader sentence states the RULE only: it used to re-list the
        // same sides two lines below them, with a different separator.
        var rule = all(pane, "p.detail__crop-reason")[0].textContent;
        has(rule, "A component boundary");
        eq(rule.indexOf(VA.CLEARANCE_SIDE_LABEL), -1);
        eq(rule.indexOf("arm"), -1);
      });

    await test("every node row gets a dot and every edge row gets a bar",
      function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var nodes = TOPO.layout.rows.filter(function (r) { return r.kind === "node"; });
        var edges = TOPO.layout.rows.filter(function (r) { return r.kind === "edge"; });
        eq(all(root, "circle.rail__dot").length, nodes.length);
        eq(all(root, "line.rail__bar").length, edges.length);
        // Every fan-out and every loop closure is a curve, and both are in the
        // projection — the view invents neither.
        eq(all(root, "path.rail__link").length, TOPO.layout.links.length);
      });

    await test("a bar wears its citation's confidence, so the rails ARE a " +
      "provenance map", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        // The demo mechanism holds one of each on purpose.
        eq(all(root, "line.conf--untraced").length, 1);
        eq(all(root, "line.conf--no_source_ref").length, 1);
        eq(all(root, "line.conf--inferred").length, 1);
        eq(all(root, "line.conf--traced").length, 2);
      });

    await test("a derived gap says it carries no value, rather than showing an " +
      "empty one", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        var derived = all(root, "tr.tvrow--derived");
        eq(derived.length, 1);
        has(derived[0].textContent, "DERIVED");
        has(derived[0].textContent, "no value");
        has(derived[0].textContent, "across a clearance");
        eq(all(root, "line.rail__bar--derived").length, 1);
      });

    await test("a branch point is marked on the dot — the grid has no node " +
      "rows to mark any more", function () {
        var root = render(function (r) { VA.renderTopoPane(r, topoCtx()); });
        eq(all(root, "circle.rail__dot--branch").length, TOPO.branch_nodes.length);
      });

    await test("selecting a study numbers its chain and dims everything else",
      function () {
        var study = topoStudy("demo_strut_branch");
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ study: study }));
        });
        var chain = study.result.chain;
        var on = all(root, "tr.tvrow--on");
        var off = all(root, "tr.tvrow--off");
        eq(on.length, chain.length, "every chain edge's row is marked");
        ok(off.length > 0, "the rest of the topology is dimmed, not hidden");
        eq(on.length + off.length, TOPO.edges.length);
        // The leaders dim with their nodes, so the off-chain part boundaries
        // recede along with the off-chain rows.
        ok(all(root, "path.rail__leader--on").length > 0, "on-chain leaders");
        ok(all(root, "path.rail__leader--off").length > 0, "off-chain leaders");
        // The ordinal is the order the SUM runs in, which is NOT the row order:
        // the rows are a depth-first walk of the whole graph.
        chain.forEach(function (contribution, i) {
          var row = all(root, "tr.tvrow").filter(function (n) {
            return n.getAttribute("data-id") === contribution.edge &&
              n.getAttribute("data-row-kind") === "edge";
          })[0];
          ok(row, "chain edge " + contribution.edge + " must have a row");
          has(row.querySelector("td.tvcell--ord").textContent, String(i + 1));
        });
      });

    await test("a chain row prints the weight and the contribution the " +
      "projection computed, and derives neither", function () {
        var study = topoStudy("demo_base_to_tip");
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ study: study }));
        });
        var contribution = study.result.chain[0];
        var row = all(root, "tr.tvrow").filter(function (n) {
          return n.getAttribute("data-id") === contribution.edge &&
            n.getAttribute("data-row-kind") === "edge";
        })[0];
        var cell = row.querySelector("td.tvcell--contribution").textContent;
        // The ratio is 2.5, so the weight is NEVER silent — same rule the stack
        // viewer's weighted-term chip follows.
        has(cell, "2.5 ×");
        has(cell, VA.fmt(contribution.min));
        has(cell, VA.fmt(contribution.max));
        has(cell, contribution.units);
      });

    await test("the study-chain layout is the sum's own order, one rail",
      function () {
        var study = topoStudy("demo_base_to_tip");
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ study: study, layoutMode: "chain" }));
        });
        // One row per chain EDGE, in the order the sum runs; the endpoints are
        // the first and last dots on the one rail, not rows.
        var rows = all(root, "tr.tvrow");
        eq(rows.length, study.result.chain.length);
        study.result.chain.forEach(function (contribution, i) {
          eq(rows[i].getAttribute("data-id"), contribution.edge);
        });
        eq(all(root, "circle.rail__dot").length, study.result.chain.length + 1);
        // The internal-node rule reads the WHOLE graph's adjacency, not the
        // chain's: base_datum stays leaderless here too, so the chain layout
        // shows the same three part boundaries the walk layout does.
        eq(all(root, "path.rail__leader").length, 3);
      });

    // --- the joint + the worksheet (deliverable 4, viewer_v2_single_nav) -----
    //
    // A topology's `joint` and `worksheet_file` are the same shape a stack's
    // own are (build_topology_projection.py's project_topology,
    // topology_schema_v1) — the demo mechanism's own joint is `{}` (it spans
    // four parts, not one physical joint), so a populated case is a variant
    // of TOPO, not a second fixture file.

    await test("a topology's joint block renders the same fields a stack's " +
      "does, through the one shared renderer", function () {
        var joint = {
          assembly_drawing: "217755", sheet: 4, view: "DETAIL B",
          zone: "H3", description: "a demo joint block for a topology",
        };
        var withJoint = Object.assign({}, TOPO, { joint: joint });
        var root = render(function (r) { VA.renderTopoJoint(r, withJoint); });
        eq(all(root, "details.sv__joint").length, 1);
        Object.keys(joint).forEach(function (key) {
          has(root.textContent, key);
          has(root.textContent, String(joint[key]));
        });
      });

    await test("a topology with no joint (it spans more than one physical " +
      "joint) says so rather than fabricating one", function () {
        eq(TOPO.joint && Object.keys(TOPO.joint).length, 0,
          "fixture precondition: the demo mechanism's own joint is {}");
        var root = render(function (r) { VA.renderTopoJoint(r, TOPO); });
        has(root.textContent, "no joint block");
      });

    await test("renderTopoJoint is a no-op instead of throwing when there is " +
      "no topology", function () {
        var root = render(function (r) { VA.renderTopoJoint(r, null); });
        eq(all(root, "*").length, 0);
      });

    await test("the worksheet renderer needs only worksheet_file/" +
      "worksheet_source, not a stack shape — so a topology can reuse it " +
      "unmodified", function () {
        var topoLike = { worksheet_file: "docs/topologies/WORKSHEET_x.md",
          worksheet_source: "declared" };
        var root = render(function (r) {
          VA.renderWorksheet(r, topoLike, "# a topology's own worksheet");
        });
        has(root.textContent, "docs/topologies/WORKSHEET_x.md");
        has(root.textContent, "declared by this file itself");
        has(root.textContent, "several stacks or topologies");
        has(root.querySelector("div.worksheet__body").innerHTML, "<h1>");
      });

    await test("the totals are the projection's numbers, printed verbatim",
      function () {
        var study = topoStudy("demo_strut_branch");
        var root = render(function (r) {
          VA.renderTopoTotals(r, TOPO, study, VA.topologyIndex(TOPO));
        });
        var text = root.textContent;
        ["nominal", "worst_case_min", "worst_case_max", "worst_case_half",
         "rss_min", "rss_max", "rss_half"].forEach(function (field) {
          has(text, VA.fmt(study.result[field]), field);
        });
        has(text, study.result.units);
        has(text, "This page adds nothing up");
      });

    await test("the weakest input of a study is the weakest of its chain",
      function () {
        // Weakest wins, exactly as a check's does. The degrees study crosses the
        // untraced arm edge, so it is an untraced result however many traced
        // ones it also sums.
        var root = render(function (r) {
          VA.renderTopoTotals(r, TOPO, topoStudy("demo_base_to_tip"),
                              VA.topologyIndex(TOPO));
        });
        has(root.textContent, "weakest input: UNTRACED");
      });

    await test("a study that refuses to sum renders the refusal, not a total",
      function () {
        var study = topoStudy("demo_ambiguous");
        eq(study.status, "error");
        var root = render(function (r) {
          VA.renderTopoTotals(r, TOPO, study, VA.topologyIndex(TOPO));
        });
        eq(all(root, "div.tverror").length, 1);
        has(root.textContent, "The selection reaches a fork");
        // The exception's own message, whole: it names the node and both
        // candidate edges, and that IS the feature.
        has(root.textContent, study.error.message);
        has(root.textContent, "which parallel path binds");
        eq(all(root, "div.tvtotal").length, 0);
      });

    await test("an exception the page has no label for is loud, not silent",
      function () {
        var invented = {
          id: "x", title: "x", from: "a", to: "b", status: "error",
          error: { type: "SomethingNew", message: "a message" },
          selection: [], transforms: {}, notes: [],
        };
        var root = render(function (r) {
          VA.renderTopoTotals(r, TOPO, invented, VA.topologyIndex(TOPO));
        });
        has(root.textContent, "an error this viewer has no label for");
      });

    await test("the preview pane says what an interface is, and that it has no " +
      "value", function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "node", id: "base_post_seat" } }));
        });
        has(root.textContent, "base / post seat");
        has(root.textContent, "mating_surface");
        has(root.textContent, "base ⇔ post");
        has(root.textContent, "An interface is a location, not a value");
      });

    await test("the preview pane shows a dimension as transcribed, with its " +
      "citation and its export block", function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "base_thickness" } }));
        });
        has(root.textContent, "4.00 +/-.02");     // the callout, as printed
        has(root.textContent, "215197");
        has(root.textContent, "3.98");
        eq(all(root, "div.el-export--established").length, 1);
        has(root.textContent, "sha256 recorded");
      });

    await test("an untraced dimension says so in the pane, not only on the row",
      function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "arm_pin_to_tip" } }));
        });
        has(root.textContent, "No document backs this number");
        has(root.textContent, "zero-width band");
        has(root.textContent, "linear_to_rotary");
      });

    await test("an untraced edge's pane offers an annotate-this link, carrying " +
      "its topology/edge/study/owner part", function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            study: topoStudy("demo_base_to_tip"),
            selection: { kind: "edge", id: "arm_pin_to_tip" } }));
        });
        var link = root.querySelector("a.detail__annotate-link");
        if (!link) throw new Error("expected an annotate-this link for an untraced edge");
        var href = link.getAttribute("href");
        has(href, "topology=" + TOPO.id);
        has(href, "edge=arm_pin_to_tip");
        has(href, "study=demo_base_to_tip");
        has(href, "isolate=arm");
      });

    await test("a traced edge's pane offers no annotate-this link -- it already " +
      "has a citation", function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "base_thickness" } }));
        });
        eq(all(root, "a.detail__annotate-link").length, 0);
      });

    await test("with the annotate mount probed, an untraced edge's pane offers " +
      "the attach-to-3D flyout button instead of the link, carrying the same " +
      "params", function () {
        var launched = [];
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            study: topoStudy("demo_base_to_tip"),
            selection: { kind: "edge", id: "arm_pin_to_tip" },
            annotateMount: true,
            onAttach3d: function (params) { launched.push(params); } }));
        });
        eq(all(root, "a.detail__annotate-link").length, 0);
        var btn = root.querySelector("button.detail__annotate-btn");
        ok(btn, "expected the attach-to-3D button with the mount probed");
        btn.onclick();
        eq(launched, [{ topologyId: TOPO.id, edgeId: "arm_pin_to_tip",
          studyId: "demo_base_to_tip", part: "arm" }]);
      });

    await test("the attach-to-3D button degrades to the link without the mount " +
      "or without a launcher, and a traced edge gets neither", function () {
        var noMount = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "arm_pin_to_tip" },
            onAttach3d: function () {} }));
        });
        eq(all(noMount, "button.detail__annotate-btn").length, 0);
        ok(noMount.querySelector("a.detail__annotate-link"),
          "expected the plain link with no probed mount");
        var noHandler = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "arm_pin_to_tip" },
            annotateMount: true }));
        });
        ok(noHandler.querySelector("a.detail__annotate-link"),
          "expected the plain link with no onAttach3d");
        var traced = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "base_thickness" },
            annotateMount: true, onAttach3d: function () {} }));
        });
        eq(all(traced, "button.detail__annotate-btn").length, 0);
        eq(all(traced, "a.detail__annotate-link").length, 0);
      });

    await test("an untraced edge whose part has NO mesh gets no 3D affordance " +
      "at all -- neither the link nor the flyout button", function () {
        // post_bushing_offset is NO CITATION on `post`, which no installed
        // mesh resolves to (annotate_affordances_flyout_and_mesh_gating): the
        // annotator would open on an empty state, so nothing is offered. The
        // standing rule is that an absent feature shows NOTHING -- no greyed
        // control, no sentence about a 3D model the reader cannot open.
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "post_bushing_offset" },
            annotateMount: true, onAttach3d: function () {} }));
        });
        eq(all(root, "a.detail__annotate-link").length, 0);
        eq(all(root, "button.detail__annotate-btn").length, 0);
        eq(all(root, "div.detail__annotate").length, 0);
        eq(/3D/.test(root.textContent), false);
        // The gap itself is still stated -- only the dead link went away.
        has(root.textContent, "This dimension carries no source_ref at all");
      });

    await test("the pane explains a missing crop rather than reporting a stale " +
      "index", function () {
        // Three different facts, and the page must not collapse them: an edge
        // authored in the topology has no crop BECAUSE it is in no stack, which
        // is not the same as "crops.json is old".
        var inline = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "post_bushing_offset" } }));
        });
        eq(all(inline, "div.detail__crop--no-key").length, 1);
        has(inline.textContent, "No crop index covers it");
        has(inline.textContent, "no source_ref at all");

        var derived = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "tip_to_strut_end" } }));
        });
        has(derived.textContent, "the quantity a study computes");
      });

    await test("an edge that re-expresses a stack element reaches the same crop",
      function () {
        // The whole of "reuse the stack viewer's thumbnail plumbing": crop_key
        // is the (stack, element) pair crops.json is keyed by, so the three crop
        // states come out of VA.cropFor unchanged.
        var resolved = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "base_thickness" },
            detailImage: { url: "blob:x", name: "x.png" } }));
        });
        eq(all(resolved, "div.detail__crop--resolved").length, 1);
        eq(all(resolved, "img.detail__crop-img").length, 1);
        has(resolved.textContent, "215197 A.1.pdf · sheet 2");

        var unresolvable = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "post_height" } }));
        });
        eq(all(unresolvable, "div.detail__crop--unresolvable").length, 1);
        has(unresolvable.textContent, "none hashes to the one");

        var stale = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            selection: { kind: "edge", id: "strut_length" } }));
        });
        eq(all(stale, "div.detail__crop--no-entry").length, 1);
        has(stale.textContent, "it is older than");
      });

    await test("the pane shows a selected edge's place in the study's sum",
      function () {
        var root = render(function (r) {
          VA.renderTopoDetail(r, topoCtx({
            study: topoStudy("demo_base_to_tip"),
            selection: { kind: "edge", id: "arm_pin_to_tip" } }));
        });
        has(root.textContent, "In this study — contribution #");
        has(root.textContent, "with the edge's orientation");
        has(root.textContent, "No sign is authored anywhere");
        // This edge's transform is its OWN default, not a study override, and
        // the pane distinguishes the two.
        has(root.textContent, "The edge's own default transform applied.");
      });

    await test("a study override says it is one", function () {
      var root = render(function (r) {
        VA.renderTopoDetail(r, topoCtx({
          study: topoStudy("demo_base_to_tip"),
          selection: { kind: "edge", id: "base_thickness" } }));
      });
      has(root.textContent, "OVERRIDES the edge's default transform");
    });

    await test("nothing selected tells you what clicking does", function () {
      var root = render(function (r) { VA.renderTopoDetail(r, topoCtx()); });
      has(root.textContent, "Click a dot or a row");
    });

    // --- loose stacks: what "the topology page absorbs the stack viewer" ---
    //
    // The demo mechanism's edges name `demo_joint` via crop_key (plate, washer,
    // eye) — no schema field says "this stack has a topology"; the linkage IS
    // the crop_key. FIXTURE (fixtures.js's own demo) has no stack called
    // `demo_joint`, so this is a synthetic results object naming both a stack
    // the mechanism covers and one it does not, on purpose.
    var LOOSE_RESULTS = {
      stacks: [
        { id: "demo_joint", title: "covered by the demo mechanism" },
        { id: "stack_rotor_fastener_length", title: "no topology re-expresses this" },
      ],
    };

    await test("stacksCoveredByTopology reads the linkage off edges' own " +
      "crop_key, not a new field", function () {
        var covered = VA.stacksCoveredByTopology(TOPOFIX);
        eq(covered.demo_joint, true);
        ok(!covered.stack_rotor_fastener_length,
          "a stack no edge's crop_key names must not read as covered");
      });

    await test("looseStacks is every stack no topology re-expresses", function () {
      var loose = VA.looseStacks(TOPOFIX, LOOSE_RESULTS);
      eq(loose.length, 1);
      eq(loose[0].id, "stack_rotor_fastener_length");
    });

    await test("looseStacks is every stack when nothing is built yet", function () {
      eq(VA.looseStacks(null, LOOSE_RESULTS).length, 2);
      eq(VA.looseStacks(TOPOFIX, null).length, 0);
    });

    // --- the single nav tree (viewer_v2_single_nav, 2026-09-08) -------------

    await test("VA.navTree nests a topology's studies and any stack it also " +
      "covers, and lists every classic-only stack as a leaf", function () {
        var tree = VA.navTree(TOPOFIX, LOOSE_RESULTS);
        eq(tree.topologies.length, TOPOFIX.topologies.length);
        var demoMechanism = tree.topologies[0];
        eq(demoMechanism.id, TOPO.id);
        eq(demoMechanism.studies.length, TOPO.studies.length);
        eq(demoMechanism.coveredStacks.length, 1);
        eq(demoMechanism.coveredStacks[0].id, "demo_joint");
        eq(tree.looseStacks.length, 1);
        eq(tree.looseStacks[0].id, "stack_rotor_fastener_length");
      });

    await test("VA.navTree tolerates missing projections", function () {
      eq(VA.navTree(null, null).topologies.length, 0);
      eq(VA.navTree(null, null).looseStacks.length, 0);
      eq(VA.navTree(TOPOFIX, null).topologies[0].studies.length, TOPO.studies.length);
    });

    await test("the nav tree renders every topology, its studies, its " +
      "covered stack and every loose stack, and marks the active node",
      function () {
        var tree = VA.navTree(TOPOFIX, LOOSE_RESULTS);
        var root = render(function (r) {
          VA.renderNavTree(r, tree, { mode: "topology", topologyId: TOPO.id,
            studyId: "demo_ambiguous", selectedStackId: null }, {});
        });
        has(root.textContent, "⚠ ");
        has(root.textContent, "no topology re-expresses this");
        has(root.textContent, "classic view");
        var active = all(root, ".navtree__row--on");
        eq(active.length, 1);
        has(active[0].textContent, "⚠");
      });

    await test("the topology row is marked active with no study selected, " +
      "not the whole-topology view AND a study at once", function () {
        var tree = VA.navTree(TOPOFIX, LOOSE_RESULTS);
        var root = render(function (r) {
          VA.renderNavTree(r, tree, { mode: "topology", topologyId: TOPO.id,
            studyId: null, selectedStackId: null }, {});
        });
        eq(all(root, ".navtree__row--on").length, 1);
        has(all(root, ".navtree__row--topology")[0].className, "navtree__row--on");
      });

    await test("clicking a topology row, a study row and a stack row each " +
      "call their own handler with the right ids", function () {
        var tree = VA.navTree(TOPOFIX, LOOSE_RESULTS);
        var seen = [];
        var root = render(function (r) {
          VA.renderNavTree(r, tree,
            { mode: "topology", topologyId: null, studyId: null, selectedStackId: null },
            {
              onTopology: function (id) { seen.push(["topology", id]); },
              onStudy: function (topologyId, studyId) { seen.push(["study", topologyId, studyId]); },
              onStack: function (id) { seen.push(["stack", id]); },
            });
        });
        all(root, ".navtree__row--topology")[0].click();
        all(root, ".navtree__row--study")[0].click();
        all(root, ".navtree__row--stack")[0].click();
        eq(seen[0], ["topology", TOPO.id]);
        eq(seen[1][0], "study");
        eq(seen[1][1], TOPO.id);
        eq(seen[2][0], "stack");
      });

    await test("an empty projection says so rather than rendering nothing",
      function () {
        var root = render(function (r) { VA.renderNavTree(r, VA.navTree(null, null), {}, {}); });
        has(root.textContent, "No topologies or stacks");
      });

    // --- descriptions as hover tooltips (stack_title_style_pass, 2026-09-14) -
    //
    // Titles are short noun phrases now; the qualification they shed lives in
    // the artifact's authored `description` and surfaces here and nowhere
    // else. These pin the three cases that matter: shown when authored, absent
    // when not, and never at the cost of the topology row's own click hint.

    var DESCRIBED_TREE = {
      topologies: [{
        id: "t1", title: "Short topology name",
        description: "The long qualification the title shed.",
        studies: [
          { id: "s1", title: "Described study", status: "ok",
            description: "Hub A datum to blade OML, in degrees." },
          { id: "s2", title: "Bare study", status: "ok", description: null },
        ],
        coveredStacks: [
          { id: "k1", title: "Described stack", description: "Built with no source workbook." },
        ],
      }],
      looseStacks: [
        { id: "k2", title: "Described loose stack", description: "A loose stack's own one-liner." },
        { id: "k3", title: "Bare loose stack" },
      ],
    };

    await test("a description authored on a topology, a study or a stack is " +
      "the row's hover tooltip, and a row without one has none", function () {
        var root = render(function (r) {
          VA.renderNavTree(r, DESCRIBED_TREE, { mode: "topology" }, {});
        });
        var byId = {};
        all(root, ".navtree__row").forEach(function (row) {
          byId[row.getAttribute("data-nav-id")] = row.getAttribute("title");
        });
        has(byId.t1, "The long qualification the title shed.");
        eq(byId.s1, "Hub A datum to blade OML, in degrees.");
        eq(byId.s2, null);
        eq(byId.k1, "Built with no source workbook.");
        eq(byId.k2, "A loose stack's own one-liner.");
        eq(byId.k3, null);
      });

    await test("the topology row's description does not displace the click " +
      "hint — that hint is the only statement of what clicking it does",
      function () {
        var root = render(function (r) {
          VA.renderNavTree(r, DESCRIBED_TREE, { mode: "topology" }, {});
        });
        var tip = all(root, ".navtree__row--topology")[0].getAttribute("title");
        has(tip, "The long qualification the title shed.");
        has(tip, "the whole topology, depth-first, with nothing highlighted");
      });

    await test("navTree carries each artifact's description through to the " +
      "renderer, and normalises a missing one to null", function () {
        var tree = VA.navTree(
          { topologies: [{ id: "t", title: "T", description: "topo one-liner",
                           edges: [],
                           studies: [{ id: "s", title: "S", status: "ok" }] }] },
          { stacks: [] });
        eq(tree.topologies[0].description, "topo one-liner");
        eq(tree.topologies[0].studies[0].description, null);
      });

    // --- the toolbar: display preferences, not selection --------------------

    await test("the toolbar's layout-mode toggle is disabled with no study " +
      "selected", function () {
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable" }, TOPO, {});
        });
        has(root.textContent, "Showing: whole topology");
        eq(root.querySelector("button.tvpick__mode").disabled, true);
        // No study selected: the annotate link has nothing to point at.
        eq(all(root, "a").length, 0);
      });

    await test("chain mode stays disabled for a study that raised", function () {
      var root = render(function (r) {
        VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: "demo_ambiguous",
          layoutMode: "topology", rowDensity: "comfortable" }, TOPO, {});
      });
      eq(root.querySelector("button.tvpick__mode").disabled, true);
    });

    await test("chain mode is offered, and the annotate link appears, once a " +
      "study actually sums", function () {
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: "demo_base_to_tip",
            layoutMode: "topology", rowDensity: "comfortable" }, TOPO, {});
        });
        eq(root.querySelector("button.tvpick__mode").disabled, false);
        var link = root.querySelector("a");
        ok(link, "expected an annotate link once a study sums");
        has(link.href, "topology=" + TOPO.id);
        has(link.href, "study=demo_base_to_tip");
      });

    await test("with the annotate mount probed, the toolbar's study affordance " +
      "is the View-in-3D flyout button, not the link", function () {
        var launched = [];
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: "demo_base_to_tip",
            layoutMode: "topology", rowDensity: "comfortable", annotateMount: true },
            TOPO, { onStudy3d: function (params) { launched.push(params); } });
        });
        eq(all(root, "a").length, 0);
        var btn = all(root, "button.tvpick__mode").filter(function (n) {
          return n.getAttribute("id") === "study-3d";
        })[0];
        ok(btn, "expected #study-3d with the mount probed");
        btn.onclick();
        eq(launched, [{ topologyId: TOPO.id, studyId: "demo_base_to_tip", trace: true }]);
      });

    await test("a study none of whose parts has a mesh offers no 3D affordance " +
      "-- it would fly out an empty scene", function () {
        // One flag flipped in the projection, no code change: the same study
        // that offers the button above offers nothing here.
        var meshless = Object.assign({}, TOPO, {
          parts: TOPO.parts.map(function (p) {
            return Object.assign({}, p, { mesh: { installed: false, part_id: null } });
          }),
        });
        [{ annotateMount: true, handlers: { onStudy3d: function () {} } },
         { annotateMount: false, handlers: {} }].forEach(function (mode, i) {
          var root = render(function (r) {
            VA.renderTopoToolbar(r, { topologyId: meshless.id,
              studyId: "demo_base_to_tip", layoutMode: "topology",
              rowDensity: "comfortable", annotateMount: mode.annotateMount },
              meshless, mode.handlers);
          });
          eq(all(root, "a").length, 0, "case " + i);
          eq(all(root, "button").filter(function (n) {
            return n.getAttribute("id") === "study-3d";
          }).length, 0, "case " + i);
          eq(/3D/.test(root.textContent), false, "case " + i);
          // The display toggles are untouched -- this gates one affordance,
          // not the toolbar.
          ok(root.querySelector("button.tvpick__mode"), "case " + i);
        });
      });

    await test("the mount without a launcher, or a launcher without the mount, " +
      "still renders the plain link -- degradation is the default", function () {
        var mountNoHandler = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: "demo_base_to_tip",
            layoutMode: "topology", rowDensity: "comfortable", annotateMount: true },
            TOPO, {});
        });
        ok(mountNoHandler.querySelector("a"), "expected the link with no onStudy3d");
        var handlerNoMount = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: "demo_base_to_tip",
            layoutMode: "topology", rowDensity: "comfortable" },
            TOPO, { onStudy3d: function () {} });
        });
        ok(handlerNoMount.querySelector("a"), "expected the link with no probed mount");
      });

    await test("VA.applyRowDensity moves the one shared row-height metric, " +
      "and only it", function () {
        var original = VA.RAIL_METRICS.rowHeight;
        try {
          var compact = VA.applyRowDensity("compact");
          eq(compact.rowHeight, 16);
          eq(VA.RAIL_METRICS.rowHeight, 16);
          // Everything else in the metrics object -- gutter, dot radii -- is
          // untouched: density is a row-height control, not a column one.
          eq(VA.RAIL_METRICS.gutter, 20);

          var comfortable = VA.applyRowDensity("comfortable");
          eq(comfortable.rowHeight, 26);
          eq(VA.RAIL_METRICS.rowHeight, 26);

          // An unrecognised key is not a silent no-op on the metric: it falls
          // back to the documented default.
          var fallback = VA.applyRowDensity("cozy");
          eq(fallback.rowHeight, 26);
        } finally {
          VA.RAIL_METRICS.rowHeight = original;
        }
      });

    await test("the density toggle is on the toolbar and names the current " +
      "density", function () {
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "compact" }, TOPO, {});
        });
        // layout-toggle, density-toggle, edge-value-toggle, edge-length-toggle
        // (viewer_edge_length_scaling), leader-style-toggle
        // (viewer_leader_grid_legibility) -- five now, not four.
        var buttons = all(root, "button.tvpick__mode");
        eq(buttons.length, 5);
        has(buttons[1].textContent, "Rows: Compact");
      });

    function edgeValueToggle(root) {
      return all(root, "button.tvpick__mode").filter(function (n) {
        return n.getAttribute("id") === "edge-value-toggle";
      })[0];
    }

    await test("the edge-value-only toggle is on the toolbar, named for the " +
      "current mode, and defaults to labelled rows", function () {
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable",
            edgeValueOnly: false }, TOPO, {});
        });
        var toggle = edgeValueToggle(root);
        ok(toggle, "expected #edge-value-toggle on the toolbar");
        has(toggle.textContent, "Rows: labelled");

        var onRoot = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable",
            edgeValueOnly: true }, TOPO, {});
        });
        has(edgeValueToggle(onRoot).textContent, "Rows: values only");
      });

    await test("clicking the edge-value-only toggle calls its own handler",
      function () {
        var called = 0;
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable" }, TOPO,
            { onEdgeValueOnly: function () { called++; } });
        });
        edgeValueToggle(root).onclick();
        eq(called, 1);
      });

    function edgeLengthToggle(root) {
      return all(root, "button.tvpick__mode").filter(function (n) {
        return n.getAttribute("id") === "edge-length-toggle";
      })[0];
    }

    await test("the edge-length toggle is on the toolbar, names the current " +
      "mode from VA.EDGE_LENGTH_MODES, and defaults to uniform", function () {
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable",
            edgeLengthMode: "uniform" }, TOPO, {});
        });
        var toggle = edgeLengthToggle(root);
        ok(toggle, "expected #edge-length-toggle on the toolbar");
        has(toggle.textContent, "Lengths: uniform");
        // Each mode's label comes off the one table, never re-spelled here.
        ["tolerance", "absolute"].forEach(function (mode) {
          var r2 = render(function (r) {
            VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
              layoutMode: "topology", rowDensity: "comfortable",
              edgeLengthMode: mode }, TOPO, {});
          });
          has(edgeLengthToggle(r2).textContent,
              "Lengths: " + VA.EDGE_LENGTH_MODES[mode].label);
        });
        // An unrecognised mode falls back to uniform's label rather than
        // rendering "Lengths: undefined".
        var r3 = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable",
            edgeLengthMode: "cozy" }, TOPO, {});
        });
        has(edgeLengthToggle(r3).textContent, "Lengths: uniform");
      });

    await test("clicking the edge-length toggle calls its own handler, and " +
      "the mode table's next-pointers cycle through all three and home",
      function () {
        var called = 0;
        var root = render(function (r) {
          VA.renderTopoToolbar(r, { topologyId: TOPO.id, studyId: null,
            layoutMode: "topology", rowDensity: "comfortable" }, TOPO,
            { onEdgeLength: function () { called++; } });
        });
        edgeLengthToggle(root).onclick();
        eq(called, 1);
        // The cycle order is a fact of the table (topology_app.js follows the
        // `next` pointers): uniform → tolerance → absolute → uniform.
        eq(VA.EDGE_LENGTH_MODES.uniform.next, "tolerance");
        eq(VA.EDGE_LENGTH_MODES.tolerance.next, "absolute");
        eq(VA.EDGE_LENGTH_MODES.absolute.next, "uniform");
      });

    await test("edge-value-only mode hides an edge row's own label and moves " +
      "it to the row's title, leaving the component column untouched", function () {
        var index = VA.topologyIndex(TOPO);
        var edge = index.edges.base_thickness;
        ok(edge, "fixture must declare base_thickness");

        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ edgeValueOnly: true }));
        });
        var edgeRow = all(root, "tr.tvrow").filter(function (n) {
          return n.getAttribute("data-id") === "base_thickness";
        })[0];
        ok(edgeRow, "base_thickness must have a row");
        eq(edgeRow.querySelector("td.tvcell--name").textContent, "");
        eq(edgeRow.getAttribute("title"), VA.edgeHoverTitle(edge, "base_thickness"));
        eq(edgeRow.getAttribute("title"), edge.name);
        // The merged component cell is grouping, not an edge label — the
        // toggle never touches it.
        eq(edgeRow.querySelector("td.tvcell--component").textContent, "base");

        // A row the projection cannot resolve still states its own diagnostic
        // regardless of mode -- that text is never redundant and must not be
        // hidden by the toggle.
        var broken = JSON.parse(JSON.stringify(TOPO));
        broken.layout.rows[1].id = "not_an_edge";
        var brokenRoot = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ topoProj: broken, edgeValueOnly: true }));
        });
        has(brokenRoot.textContent, "the topology does not declare");
      });

    await test("the banner names the TOPOLOGY projection, not the results one",
      function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, projection: "topologies",
            results: TOPOFIX, crops: TOPOCROPS,
          }, {});
        });
        has(root.textContent, "topologies built ");
        eq(root.textContent.indexOf("results built "), -1);
      });

    await test("a missing topology projection prints ITS build command",
      function () {
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, projection: "topologies",
            results: null, crops: TOPOCROPS,
          }, {});
        });
        has(root.textContent, "build_topology_projection.py");
        eq(root.textContent.indexOf("build_viewer_projection.py"), -1);
      });

    await test("a study pointing at a topology nobody declares is an alarm",
      function () {
        // Built inline rather than put in the fixture: an alarm in ?mock=1,
        // where nothing is wrong, is how a reader learns to ignore alarms.
        var alarms = VA.orphanStudyAlarms({
          orphan_studies: [{ study: "s", topology: "gone",
                             source_file: "docs/topologies/study_s.json" }],
        });
        eq(alarms.length, 1);
        has(alarms[0], "no document in docs/topologies/ declares");
        var root = render(function (r) {
          VA.renderBanner(r, {
            connection: VA.STATE.READY, projection: "topologies",
            results: TOPOFIX, crops: TOPOCROPS, extraAlarms: alarms,
          }, {});
        });
        has(root.textContent, "needs a rebuild");
        has(root.textContent, "gone");
      });

    await test("a row whose id the topology does not declare is reported",
      function () {
        // Unreachable from a clean build, and that is exactly why it is worth a
        // branch: a layout referring to an id the derived blocks do not have is
        // a builder bug, and a blank row would hide it.
        var broken = JSON.parse(JSON.stringify(TOPO));
        broken.layout.rows[1].id = "not_an_edge";
        var root = render(function (r) {
          VA.renderTopoPane(r, topoCtx({ topoProj: broken }));
        });
        has(root.textContent, "the topology does not declare");
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

      await test("[real] the zero-width flag reaches the page", function () {
        // Repointed 2026-09-15 (`pitch_link_known_bands`). This read
        // `pitch_link_to_pitch_plate` and asserted 2 until that handoff gave its
        // bushing and washer real bands; asserting 0 there would have kept the
        // name and lost the subject. `rotor_fastener_length` is the live example
        // now -- two washers, neither of which has a band in any document
        // (MS21299 and NAS1149 are both absent from the pile).
        var rotor = VA.findStack(realResults, "rotor_fastener_length");
        ok(rotor, "rotor_fastener_length must be in the projection");
        var root = render(function (r) { VA.renderStack(r, rotor, realCrops, {}); });
        eq(all(root, "tr.el-row--zero-width").length, 2);
      });

      await test("[real] the pitch-link stack's two unverified bands render untraced, not zero-width", function () {
        // The other half of the same change, and the half Jeff's 2026-09-15
        // ruling is actually about: a band nobody in this repo can re-check has
        // to LOOK different from one they can. `zero_width` used to carry that
        // signal on this stack and now carries nothing here, so the confidence
        // class carries it alone -- and a badge keyed on `zero_width` would show
        // the reader nothing at all.
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        eq(all(root, "tr.el-row--zero-width").length, 0);
        // One class per selector: the DOM shim's matcher handles "tag", ".class"
        // and "tag.class" and nothing compound, so "tr.el-row.conf--untraced"
        // silently matches nothing rather than erroring. Filter with hasClass.
        var untraced = all(root, "tr.conf--untraced").filter(function (tr) {
          return hasClass(tr, "el-row");
        });
        eq(untraced.length, 2);
        has(untraced[0].textContent, "bushing_214820");     // 214820-002 drawing, read by an operator
        has(untraced[1].textContent, "washer_nas1149v0332"); // 260729 workbook E11/F11
      });

      await test("[real] the folded numbers reach the page verbatim", function () {
        var root = render(function (r) { VA.renderStack(r, pitch, realCrops, {}); });
        // `-8.428`, not `-8.4280`: VA.fmt is String(n) and prints the projection
        // number verbatim, so a trailing zero a document writes for alignment is
        // not on the page. Was `-8.1939` until 2026-09-15.
        has(root.textContent, "-8.428");    // shank_out worst-case min
        has(root.textContent, "17.4752");   // the traced NAS6403 grip nominal, unmoved
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
        // Was a pinned live vocabulary until 2026-09-14
        // (spec_crop_region_registry), because the branch was a chain of `if`s
        // in VA.cropProvenanceLine with nothing to ask. It is now the STRONG
        // form: the chain became VA.CROP_PLACEMENTS, so teaching the viewer a
        // placement teaches this guard, and an unknown one is loud on screen
        // rather than dropping the whole "where on the sheet" clause.
        { field: "crop entry located_by",
          branch: "VA.CROP_PLACEMENTS, through VA.cropProvenanceLine",
          known: function (v) { return !!VA.CROP_PLACEMENTS[v]; },
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

      await test("[real] every established export reaches its element's panel", function () {
        var established = liveCitations().filter(function (pair) {
          return VA.exportProvenance(pair[1].source_ref).state === "established";
        });
        // Derived from the data, not hard-coded: the count moves every time a
        // handoff establishes another export, and a passing suite must not turn
        // red for that (LESSONS_20260810_viewer_source_ref_export_label).
        ok(established.length > 0, "the live projection must have established exports");
        established.forEach(function (pair) {
          var where = pair[0].id + ":" + pair[1].id;
          var p = VA.exportProvenance(pair[1].source_ref);
          var text = render(function (r) {
            VA.renderDetail(r, pair[0], pair[1].id, realCrops, null, VA.CONFIG);
          }).textContent;
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
          // ...and from the row alone, beside the confidence chip.
          var rowsRoot = render(function (r) { VA.renderStack(r, stackProj, realCrops, {}); });
          eq(all(rowsRoot, "span.chip--export-unestablished").length, 1);

          var root = render(function (r) {
            VA.renderDetail(r, stackProj, row.element, realCrops, null, VA.CONFIG);
          });
          var box = all(root, "div.el-export--unestablished");
          eq(box.length, 1, row.stack + ":" + row.element);
          ok(box[0].className.indexOf("el-export--loud") !== -1, "must be loud");
          has(all(root, "div.el-export__why")[0].textContent, "cannot be identified");
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

      await test("[real] a marked element's panel states the rule instead of a gap",
        function () {
          var marked = [];
          realResults.stacks.forEach(function (stackProj) {
            (stackProj.elements || []).forEach(function (derived) {
              if (derived.identity_rule) {
                marked.push({ stackProj: stackProj, elementId: derived.id });
              }
            });
          });
          ok(marked.length > 0, "no live stack carries a spec-pile citation");
          marked.forEach(function (m) {
            var where = m.stackProj.id + ":" + m.elementId;
            var root = render(function (r) {
              VA.renderDetail(r, m.stackProj, m.elementId, realCrops, null, VA.CONFIG);
            });
            var box = all(root, "div.el-export--identity_rule");
            eq(box.length, 1, where);
            has(box[0].textContent, "identity by filename (append-only pile)", where);
            // The row the issue was filed about: `traced` beside "nothing here
            // identifies the bytes". That pair must no longer be reachable here.
            ok(box[0].textContent.indexOf("names no exported file") === -1,
               where + " still reads as a gap");
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

      // --- [real] the topology projection ------------------------------------
      //
      // The fixture above is a demo mechanism; this is Jeff's two. It is the
      // tier that proves the page renders the pitch system's 43 rows and the
      // grip stack's ring, and — the claim the whole page rests on — that every
      // total on screen is the number topologies.json carries.

      var realTopologies = await real.readTopologies();
      if (!realTopologies) {
        skip("[real] topology projection",
             "no topologies.json at " + nodeFs.root +
             "/data/projections/viewer/ — run scripts/build_topology_projection.py");
      } else {
        var liveTopos = realTopologies.topologies || [];
        var livePitch = VA.findTopology(realTopologies, "pitch_system");
        var liveL1 = VA.findTopology(realTopologies, "vpa_output_to_pitch_plate");

        await test("[real] both MVP topologies are in the projection", function () {
          ok(liveL1, "the L1 grip stack must be there");
          ok(livePitch, "the L2 pitch system must be there");
          eq(realTopologies.orphan_studies, []);
        });

        await test("[real] a topology's own joint block renders its assembly " +
          "drawing, and pitch_system's empty one stays silent " +
          "(deliverable 4)", function () {
            var l1Root = render(function (r) { VA.renderTopoJoint(r, liveL1); });
            ok(liveL1.joint && liveL1.joint.assembly_drawing,
              "fixture precondition: vpa_output_to_pitch_plate has a real joint");
            has(l1Root.textContent, String(liveL1.joint.assembly_drawing));
            var pitchRoot = render(function (r) { VA.renderTopoJoint(r, livePitch); });
            eq(livePitch.joint, {},
              "fixture precondition: pitch_system spans more than one joint");
            has(pitchRoot.textContent, "no joint block");
          });

        await test("[real] pitch_system's own worksheet loads and renders " +
          "through the shared renderer (deliverable 4)", async function () {
            ok(livePitch.worksheet_file, "pitch_system must declare one");
            var md = await real.readText(VA.worksheetSegments(livePitch));
            ok(md, "worksheet must be readable");
            var root = render(function (r) { VA.renderWorksheet(r, livePitch, md); });
            var html = root.querySelector("div.worksheet__body").innerHTML;
            has(html, "<h1>");
            has(html, "end-stop graft workorder");
            has(root.textContent, "declared by this file itself");
          });

        await test("[real] a respine of every summing study of every topology " +
          "settles on the fresh render's own geometry, bar for bar, in every " +
          "length mode — the animation is presentation and nothing else",
          function () {
            // The zero-drift claim, on the documents rather than on the
            // fixture: run a whole select/deselect cycle through the animator
            // off an injected clock and pair the settled DOM against a render
            // of the same selection that never animated. Anything an
            // interpolated store rounded, clamped or re-derived shows up here
            // as a bar in the wrong place.
            var geometryOf = function (root) {
              return all(root, "line.rail__barhit").map(function (n) {
                return [n.getAttribute("data-id"), n.getAttribute("y1"),
                        n.getAttribute("y2")];
              }).concat(all(root, "circle.rail__dot").map(function (n) {
                return [n.getAttribute("data-id"), n.getAttribute("cy")];
              })).concat(all(root, "path.rail__leaderhit").map(function (n) {
                return [n.getAttribute("data-leader-id"), n.getAttribute("d")];
              }));
            };
            var ctxFor = function (topoProj, study, layoutMode, mode) {
              return { topoProj: topoProj, study: study, crops: realCrops,
                       layoutMode: layoutMode, selection: null,
                       edgeLengthMode: mode, onSelect: function () {} };
            };
            var runTo = function (root, ctx) {
              var from = VA.lastTopoRender;
              var clock = 0;
              var queue = [];
              VA.animateTopoPane(root, ctx, from, {
                now: function () { return clock; },
                raf: function (fn) { queue.push(fn); },
                duration: 100, reduced: false,
              });
              var guard = 0;
              while (queue.length) {
                ok(guard++ < 50, "the transition must terminate");
                clock += 17;
                queue.shift()();
              }
              eq(VA.lastTopoRender.tweening, false);
              eq(all(root, "div.tv__ghost").length, 0);
            };
            var cycles = 0;
            liveTopos.forEach(function (topoProj) {
              var study = (topoProj.studies || []).filter(function (s) {
                return s.status === "ok" && s.layout;
              })[0];
              if (!study) return;
              ["uniform", "tolerance", "absolute"].forEach(function (mode) {
                var walkCtx = ctxFor(topoProj, null, "topology", mode);
                var chainCtx = ctxFor(topoProj, study, "chain", mode);
                var freshChain = geometryOf(render(function (r) {
                  VA.renderTopoPane(r, chainCtx);
                }));
                var freshWalk = geometryOf(render(function (r) {
                  VA.renderTopoPane(r, walkCtx);
                }));

                var root = render(function (r) { VA.renderTopoPane(r, walkCtx); });
                runTo(root, chainCtx);
                eq(geometryOf(root), freshChain,
                   topoProj.id + "/" + study.id + "/" + mode + ": selecting");
                runTo(root, walkCtx);
                eq(geometryOf(root), freshWalk,
                   topoProj.id + "/" + study.id + "/" + mode + ": deselecting");
                cycles++;
              });
            });
            ok(cycles >= 12,
               "every committed topology with a summing study, in three " +
               "modes, must actually have been cycled: " + cycles);
          });

        await test("[real] pitch_system's respine really does move the whole " +
          "page — the contract above would pass on a diagram that never " +
          "changed", function () {
            // A non-vacuity witness, because "settled == fresh" is trivially
            // true if the two serialisations happen to draw the same picture.
            var M = VA.RAIL_METRICS;
            var study = livePitch.studies.filter(function (s) {
              return s.status === "ok" && s.layout;
            })[0];
            var walk = VA.spineRight(livePitch.layout);
            var chain = VA.spineRight(study.layout);
            var walkPlan = VA.gridPlan(walk, livePitch);
            var chainPlan = VA.gridPlan(chain, livePitch);
            var from = VA.rowPositions(walk, livePitch, "uniform", M,
              { budget: 782, plan: walkPlan });
            var to = VA.rowPositions(chain, livePitch, "uniform", M,
              { budget: 782, plan: chainPlan });
            ok(from.dagHeight - to.dagHeight > 300,
               "the chain is far shorter than the walk: " +
               from.dagHeight + " -> " + to.dagHeight);
            ok(walk.columns - chain.columns >= 5,
               "and far wider: " + walk.columns + " -> " + chain.columns);

            // Every interface the chain keeps MOVES, and by a lot -- so the
            // interpolation is doing real work on the document Jeff asked
            // about, not tweening a diagram between two identical states.
            var shared = Object.keys(to.nodes).filter(function (id) {
              return from.nodes[id] !== undefined;
            });
            ok(shared.length >= 8, "the chain shares most of its interfaces " +
               "with the walk: " + shared.length);
            var travel = shared.map(function (id) {
              return Math.abs(from.nodes[id] - to.nodes[id]);
            });
            var moved = travel.filter(function (d) { return d > 20; });
            ok(moved.length * 2 > shared.length,
               "most shared interfaces move a visible distance: " +
               moved.length + " of " + shared.length);
            ok(Math.max.apply(null, travel) > 200,
               "and the furthest travels " + Math.max.apply(null, travel) + "px");
            // A settled store is the target's key set, on the real
            // document and in both directions -- 10 interfaces and 14
            // dimensions of this walk are not in the chain, and every one of
            // them used to survive settling at its outgoing y.
            [[from, to, "select"], [to, from, "deselect"]].forEach(
              function (pair) {
                var store = VA.tweenPositions(pair[0], pair[1], 1);
                ["byRow", "nodes", "edges"].forEach(function (field) {
                  eq(Object.keys(store[field]).sort(),
                     Object.keys(pair[1][field]).sort(),
                     "pitch_system " + pair[2] + ": " + field);
                });
              });
            ok(Object.keys(from.edges).filter(function (id) {
              return to.edges[id] === undefined;
            }).length >= 10, "the chain really does drop most of the walk");

            // And the horizontal tween is worth doing: the two frames'
            // widths are hundreds of pixels apart, so a respine that only
            // moved y would leave the whole DAG snapping sideways.
            var fromWidth = VA.leaderGeometry(walk, walkPlan, M, from).width;
            var toWidth = VA.leaderGeometry(chain, chainPlan, M, to).width;
            ok(fromWidth - toWidth > 100,
               "the two pane widths are " + fromWidth + " and " + toWidth);

            // Every frame of both directions, on the real document, drawn:
            // every rail, mark, link point and leader end has to land inside
            // the pane and left of the grid. This is the document the defect
            // was reported on -- the walk's nine branch rails laid out left
            // of x = 0, where .tv__hscroll's overflow-x clipped them
            // (ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_
            // block_slides).
            var drawn = function (fromLayout, fromPlan, fromPos,
                                  toLayout, toPlan, toPos, e) {
              var prev = { columns: fromLayout.columns,
                           width: VA.leaderGeometry(fromLayout, fromPlan, M,
                                                    fromPos).width };
              var x = VA.respineX(toLayout, toPlan, M, prev, e);
              var tweened = VA.tweenPositions(fromPos, toPos, e);
              var geo = VA.railGeometry(toLayout, M, tweened, { x: x });
              var leaders = VA.leaderGeometry(toLayout, toPlan, M, tweened,
                { x: x });
              var xs = geo.rails.map(function (r) { return r.x; })
                .concat(geo.marks.map(function (m) { return m.x; }))
                .concat(leaders.leaders.map(function (l) { return l.x1; }))
                .concat(leaders.leaders.map(function (l) { return l.laneX; }));
              geo.links.forEach(function (link) {
                (link.d.match(/-?[\d.]+ -?[\d.]+/g) || []).forEach(function (pt) {
                  xs.push(parseFloat(pt.split(" ")[0]));
                });
              });
              return { left: Math.min.apply(null, xs),
                       right: Math.max.apply(null, xs),
                       width: leaders.width };
            };
            [0, 0.25, 0.5, 0.75, 1].forEach(function (e) {
              [["deselect", chain, chainPlan, to, walk, walkPlan, from],
               ["select", walk, walkPlan, from, chain, chainPlan, to]].forEach(
                function (run) {
                  var box = drawn(run[1], run[2], run[3], run[4], run[5],
                                  run[6], e);
                  ok(box.left >= 0, "pitch_system " + run[0] + " at e = " + e +
                     " draws something at x = " + box.left);
                  ok(box.right <= box.width + 1e-9, "pitch_system " + run[0] +
                     " at e = " + e + " draws past the grid seam: " +
                     box.right + " > " + box.width);
                });
            });
            // What it used to do, on the same 45 marks: anchored on the two
            // SVG widths and slid as one block, the first frame of a deselect
            // drew every one of them left of the pane.
            var slid = VA.railGeometry(walk, M, VA.tweenPositions(to, from, 0))
              .marks.map(function (m) { return m.x + (toWidth - fromWidth); });
            ok(Math.min.apply(null, slid) < -100,
               "the old anchor drew pitch_system's marks from x = " +
               Math.min.apply(null, slid));
            eq(slid.filter(function (x) { return x < 0; }).length, slid.length,
               "and every one of its " + slid.length + " marks was off-pane");
          });

        await test("[real] every edge of every topology renders as a row in " +
          "walk order, with its leaders and merged groups", function () {
            liveTopos.forEach(function (topoProj) {
              var plan = VA.gridPlan(topoProj.layout, topoProj);
              var root = render(function (r) {
                VA.renderTopoPane(r, {
                  topoProj: topoProj, study: null, crops: realCrops,
                  layoutMode: "topology", selection: null,
                  onSelect: function () {},
                });
              });
              var rows = all(root, "tr.tvrow");
              eq(rows.length, topoProj.edges.length, topoProj.id);
              var edgeOrder = topoProj.layout.rows.filter(function (r) {
                return r.kind === "edge";
              }).map(function (r) { return r.id; });
              rows.forEach(function (row, i) {
                eq(row.getAttribute("data-id"), edgeOrder[i]);
              });
              // Every non-internal node has its leader on screen; every group
              // has its merged cell, spanning exactly its own rows.
              eq(all(root, "path.rail__leader").length, plan.leaders.length,
                 topoProj.id);
              var cells = all(root, "td.tvcell--component");
              eq(cells.length, plan.groups.length, topoProj.id);
              var spanned = 0;
              cells.forEach(function (cell, i) {
                var span = cell.getAttribute("rowspan");
                eq(span === null ? 1 : Number(span), plan.groups[i].count);
                spanned += plan.groups[i].count;
              });
              eq(spanned, topoProj.edges.length, topoProj.id);
              // Nothing rendered as "the topology does not declare this id".
              eq(root.textContent.indexOf("does not declare"), -1, topoProj.id);
            });
          });

        await test("[real] the pitch system's grouping is the leader rule at " +
          "work: internal interfaces are omitted, boundaries are drawn, and a " +
          "part revisited on a later branch gets a merged row per visit",
          function () {
            var internal = VA.internalNodes(livePitch);
            // A branch point whose four edges are ALL hub dimensions is inside
            // the hub, however many edges meet there — no leader.
            eq(internal.hub_top_deck, true);
            eq(internal.hub_top_bearing_flange, true);
            // A mate between two parts is a boundary; so is a part against a
            // clearance (the end-stop gap's two sides).
            eq(internal.hub_tan_link_mount_seat, false);
            eq(internal.piston_end_stop_face, false);
            eq(internal.vpa_end_stop_feature, false);

            var plan = VA.gridPlan(livePitch.layout, livePitch);
            eq(plan.leaders.length, 16);
            eq(plan.groups.length, 18);
            // The walk's first run: three hub dimensions merged across their
            // two internal interfaces.
            eq(plan.groups[0].label, "hub");
            eq(plan.groups[0].count, 3);
            // The loop-closing hub edges at the walk's tail merge too — four
            // consecutive hub rows with no boundary node between them.
            var last = plan.groups[plan.groups.length - 1];
            eq(last.label, "hub");
            eq(last.count, 4);
            // The DEPTH-FIRST walk revisits parts on later branches, so "one
            // merged row per part" is per contiguous RUN: hub appears as 2
            // groups, pitch_plate as 3 — reordering the grid to force one row
            // per part would cross the leaders and break walk correspondence.
            var runsPerPart = {};
            plan.groups.forEach(function (g) {
              if (g.part) runsPerPart[g.part] = (runsPerPart[g.part] || 0) + 1;
            });
            eq(runsPerPart.hub, 2);
            eq(runsPerPart.pitch_plate_215177_001, 3);
            // The other two splits (README quotes all four): gas_spring is
            // revisited on a later branch; blade_root's two runs are
            // CONSECUTIVE — a boundary node between two same-part edges, the
            // mini fixture's fork case occurring live.
            eq(runsPerPart.gas_spring, 2);
            eq(runsPerPart.blade_root, 2);
            // The end-stop clearance is its own group, in gap words.
            var gapGroups = plan.groups.filter(function (g) { return g.part === null; });
            eq(gapGroups.length, 1);
            eq(gapGroups[0].label, VA.GAP_COMPONENT_LABEL);
          });

        await test("[real] on pitch_system, a rendered row's band tint is its " +
          "own leader band's, value for value", function () {
            // The deliverable's own claim, on the document it was asked for:
            // "the band BETWEEN two adjacent leaders and the grid rows that
            // band feeds share one alternating tint". Measured as the two
            // things a reader actually sees -- the parity class on each <tr>
            // and the parity class on each band polygon -- against the bands
            // computed from the plan, row by row and band by band.
            var layout = VA.spineRight(livePitch.layout);
            var plan = VA.gridPlan(layout, livePitch);
            var bands = VA.leaderBands(plan);
            eq(bands.length, 17, "16 leaders cut the grid into 17 bands");
            // The real pitch_system's own band boundaries, as grid row
            // indices. 24 edge rows, and two bands carry more than one row
            // (the walk's opening three hub dimensions and its closing four).
            eq(bands.map(function (b) { return b.startRow + "-" + b.endRow; }).join(" "),
               "0-3 3-4 4-5 5-6 6-7 7-8 8-9 9-10 10-11 11-12 12-13 13-15 " +
               "15-16 16-17 17-18 18-19 19-24");
            eq(bands[0].endRow, plan.groups[0].count,
               "the first band is the first merged component group");

            var root = render(function (r) {
              VA.renderTopoPane(r, {
                topoProj: livePitch, study: null, crops: realCrops,
                layoutMode: "topology", selection: null,
                onSelect: function () {},
              });
            });
            var drawn = all(root, "path.rail__band");
            eq(drawn.length, bands.length);
            var rows = all(root, "tr.tvrow");
            eq(rows.length, plan.rows.length);

            // Row i's tint IS the tint of the band whose row range contains
            // it -- read off the DOM on both sides, so a renderer that tinted
            // the rows from anything else (row index parity, group index)
            // fails here.
            var bandClass = function (node) {
              return hasClass(node, "rail__band--b") ||
                     hasClass(node, "tvrow--band-b") ? 1 : 0;
            };
            bands.forEach(function (band, i) {
              eq(bandClass(drawn[i]), band.parity, "band " + i);
              for (var r = band.startRow; r < band.endRow; r++) {
                eq(bandClass(rows[r]), band.parity,
                   "row " + r + " (" + rows[r].getAttribute("data-id") + ")");
              }
            });
            // Non-vacuous: a run of rows in one band, and neighbours that
            // differ -- a page that tinted every row the same would pass a
            // parity check written any less carefully.
            eq(bandClass(rows[0]), bandClass(rows[1]));
            eq(bandClass(rows[0]), bandClass(rows[2]));
            ok(bandClass(rows[2]) !== bandClass(rows[3]),
               "the band changes where the first leader points");
          });

        await test("[real] pitch_system's leaders really do cross, and the " +
          "bands still tile the pane in both styles", function () {
            // The configuration the band clamp exists for, on the real
            // document rather than on the mock's stand-in: the shipped
            // pitch_system, fitted and centred the way the page fits and
            // centres it. Filed as a defect in its own right
            // (ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_
            // centred.md) -- it is a layout-policy question, not a band one.
            var M = VA.RAIL_METRICS;
            var layout = VA.spineRight(livePitch.layout);
            var plan = VA.gridPlan(layout, livePitch);
            var positions = VA.rowPositions(layout, livePitch, "uniform", M,
              { budget: 782, plan: plan });
            ok(positions.gridOffset > 100, "the grid sits well down the DAG");

            var jog = VA.leaderGeometry(layout, plan, M, positions);
            var crossings = 0;
            jog.leaders.forEach(function (a, i) {
              jog.leaders.slice(i + 1).forEach(function (b) {
                var lo = Math.min(a.y1, a.y2), hi = Math.max(a.y1, a.y2);
                if (a.laneX >= b.x1 && a.laneX <= b.laneX &&
                    b.y1 >= lo && b.y1 <= hi) crossings++;
              });
            });
            ok(crossings > 0,
               "pitch_system's leaders cross; if this ever reaches 0 the " +
               "issue above was fixed and this test should say so");

            ["jogged", "angled"].forEach(function (style) {
              var geo = VA.leaderGeometry(layout, plan, M, positions,
                { style: style });
              geo.bands.forEach(function (band, i) {
                if (i + 1 < geo.bands.length) {
                  ok(band.bottom === geo.bands[i + 1].top, style + " band " + i);
                }
                for (var x = 0; x <= geo.width; x += 2) {
                  var top = profileY(band.top, x);
                  var bottom = profileY(band.bottom, x);
                  ok(bottom >= top - 1e-9,
                     style + ": band " + i + " is inside out at x=" + x);
                }
              });
            });
          });

        await test("[real] the blade_root rows no longer open with " +
          "'blade-root', and their full labels are one hover away", function () {
            // Jeff's own example, on the document he was reading: "under
            // component `blade_root`, three rows all render 'blade-root
            // clocking holes to th...'".
            var root = render(function (r) {
              VA.renderTopoPane(r, {
                topoProj: livePitch, study: null, crops: realCrops,
                layoutMode: "topology", selection: null,
                onSelect: function () {},
              });
            });
            var plan = VA.gridPlan(VA.spineRight(livePitch.layout), livePitch);
            var index = VA.topologyIndex(livePitch);
            var cells = all(root, "td.tvcell--name");
            eq(cells.length, plan.rows.length);

            var bladeRoot = [];
            plan.groups.forEach(function (group) {
              if (group.part !== "blade_root") return;
              for (var i = 0; i < group.count; i++) {
                bladeRoot.push(cells[group.start + i]);
              }
            });
            eq(bladeRoot.length, 3, "blade_root carries three rows");
            bladeRoot.forEach(function (cell, i) {
              ok(cell.textContent.toLowerCase().indexOf("blade") !== 0,
                 "blade_root row " + i + " still opens with its component: " +
                 cell.textContent);
              ok(cell.textContent.length > 0, "and it is not blank");
              // Nothing is lost: the title is the edge's own name, whole.
              var id = plan.rows[0] && cell.getAttribute("title");
              ok(id === null || id.toLowerCase().indexOf("blade") === 0,
                 "the full label is the hover text");
            });
            // The cells opening with "clocking holes" are the ones Jeff saw
            // truncated, now saying the thing that distinguishes them.
            eq(bladeRoot.filter(function (c) {
              return c.textContent.indexOf("clocking holes") === 0;
            }).length, 3);
            // And a row whose label does NOT repeat its component is
            // untouched, so this is a trim and not a rewrite.
            var pistonLength = cells.filter(function (c) {
              return c.textContent === "piston length";
            });
            eq(pistonLength.length, 1);
            eq(pistonLength[0].getAttribute("title"), null);
            ok(index.edges, "the index is built");
          });

        await test("[real] pitch_system is variation-only, so 'feature size' " +
          "floors every edge and 'tolerance width' scales the real bands",
          function () {
            var M = VA.RAIL_METRICS;
            var maxLen = M.rowHeight * VA.EDGE_LENGTH_SCALE.maxRows;
            var floor = M.rowHeight * VA.EDGE_LENGTH_SCALE.floorRows;

            // The projection's real shape, asserted rather than assumed:
            // every pitch_system edge that carries a dimension carries
            // nominal 0.0 with a real ± band (the workbook states variation
            // only; the provenance notes say the nominal is unstated).
            livePitch.edges.forEach(function (e) {
              if (!e.dimension) return;
              eq(e.dimension.nominal, 0.0, e.id);
              ok(e.dimension.max > e.dimension.min, e.id + " has a real band");
            });

            // Feature size: nothing to scale by anywhere, so every edge sits
            // at the floor, floored — the page is uniform-height and every
            // bar wears the break mark, never a fake proportion.
            var abs = VA.rowPositions(livePitch.layout, livePitch, "absolute", M);
            livePitch.layout.rows.forEach(function (row) {
              if (row.kind !== "edge") return;
              eq(abs.edges[row.id].floored, true, "absolute " + row.id);
              eq(abs.edges[row.id].length, floor, "absolute " + row.id);
            });
            eq(abs.height, livePitch.layout.rows.length * M.rowHeight);

            // Tolerance width: the bands are real and spread (0.03 … 0.2 at
            // lock time), so the widest edge renders at maxLen, at least one
            // narrow edge floors, and at least one scales un-floored between.
            var tol = VA.rowPositions(livePitch.layout, livePitch, "tolerance", M);
            var lengths = [];
            livePitch.layout.rows.forEach(function (row) {
              if (row.kind !== "edge") return;
              var slot = tol.edges[row.id];
              lengths.push({ id: row.id, len: slot.length, floored: slot.floored });
            });
            ok(lengths.some(function (l) { return l.len === maxLen && !l.floored; }),
               "the widest band renders at maxLen");
            ok(lengths.some(function (l) { return l.floored; }),
               "a narrow band floors — the DoD's nominal-0 edge under BOTH modes");
            ok(lengths.some(function (l) { return !l.floored && l.len < maxLen; }),
               "a middle band scales in true proportion");

            // And the render agrees with the store: floored bars marked, the
            // grid untouched at one row pitch.
            var root = render(function (r) {
              VA.renderTopoPane(r, {
                topoProj: livePitch, study: null, crops: realCrops,
                layoutMode: "topology", selection: null,
                edgeLengthMode: "tolerance", onSelect: function () {},
              });
            });
            eq(all(root, "line.rail__bar--floored").length,
               lengths.filter(function (l) { return l.floored; }).length);
            all(root, "tr.tvrow").forEach(function (row) {
              eq(row.style.height, M.rowHeight + "px");
            });
          });

        await test("[real] every committed topology draws its spine on the " +
          "rightmost rail, with its branches extending left", function () {
            liveTopos.forEach(function (topoProj) {
              var layout = topoProj.layout;
              var mirrored = VA.spineRight(layout);
              var last = layout.columns - 1;
              // Value level: every column claim in the layout, mirrored.
              eq(mirrored.rows.map(function (r) { return r.column; }),
                 layout.rows.map(function (r) { return last - r.column; }),
                 topoProj.id + " rows");
              eq(mirrored.rails.map(function (r) { return r.column; }),
                 layout.rails.map(function (r) { return last - r.column; }),
                 topoProj.id + " rails");
              eq(mirrored.links.map(function (l) { return l.from_column + ">" + l.to_column; }),
                 layout.links.map(function (l) {
                   return (last - l.from_column) + ">" + (last - l.to_column);
                 }), topoProj.id + " links");
              // A loop-closing edge carries a column claim of its own, and a
              // dashed curve drawn to an un-mirrored one lands on empty space.
              layout.rows.forEach(function (row, i) {
                if (row.closes_column === null || row.closes_column === undefined) {
                  eq(mirrored.rows[i].closes_column, row.closes_column, row.id);
                } else {
                  eq(mirrored.rows[i].closes_column, last - row.closes_column, row.id);
                }
              });
              // The walk's own mainline — everything the projection put in
              // column 0 — ends up hard against the jog zone.
              var mainline = layout.rows.filter(function (r) { return r.column === 0; });
              ok(mainline.length > 0, topoProj.id + " has a mainline");
              mainline.forEach(function (row, i) {
                eq(mirrored.rows[layout.rows.indexOf(row)].column, last,
                   topoProj.id + " " + row.id);
              });
            });
          });

        await test("[real] every number apps/viewer/README.md states about the " +
          "spine, the fit and the centring is re-derivable from the live " +
          "projection", function () {
            // The README is a live document, and these are quantities in
            // prose — this repo's standing rule is that one no test reads
            // from the tree is a defect whether or not it happens to be right
            // today. The crossings test above deliberately pins only the
            // SPINE half so a future layout policy is free to move the rest;
            // this pairs the published totals instead, so moving them means
            // editing both.
            var src = typeof VIEWER_SRC !== "undefined" ? VIEWER_SRC : null;
            ok(src, "VIEWER_SRC must be injected for the doc pairing");
            var readme = src.readText("README.md");
            ok(readme, "apps/viewer/README.md must be readable");
            var M = VA.RAIL_METRICS;

            // How many rails stand between a leader's dot and its lane,
            // summed over one serialisation.
            var crossings = function (topoProj, layout) {
              var plan = VA.gridPlan(layout, topoProj);
              var geo = VA.railGeometry(layout, M);
              var leaderGeo = VA.leaderGeometry(layout, plan, M);
              var n = 0;
              leaderGeo.leaders.forEach(function (leader) {
                geo.rails.forEach(function (rail) {
                  if (rail.x > leader.x1 && rail.x < leader.laneX &&
                      rail.y1 <= leader.y1 && leader.y1 <= rail.y2) n++;
                });
              });
              return n;
            };

            var before = 0, after = 0, zeroed = 0;
            liveTopos.forEach(function (topoProj) {
              before += crossings(topoProj, topoProj.layout);
              var mirrored = crossings(topoProj, VA.spineRight(topoProj.layout));
              after += mirrored;
              if (mirrored === 0) zeroed++;
            });

            // "leader-vs-rail crossings went **92 → 43**, four of the five to
            // zero"
            var totals = /crossings went \*\*(\d+) → (\d+)\*\*, (\w+) of the\s+five to zero/
              .exec(readme);
            ok(totals, "expected the README's crossings sentence");
            eq(Number(totals[1]), before, "README's before-total");
            eq(Number(totals[2]), after, "README's after-total");
            eq(totals[3], ["zero", "one", "two", "three", "four", "five"][zeroed],
               "README's count of topologies taken to zero");

            // "that one topology's total only moves 47 → 43"
            var pitchTotals = /topology's total only moves (\d+) → (\d+)/.exec(readme);
            ok(pitchTotals, "expected the README's pitch_system crossings sentence");
            eq(Number(pitchTotals[1]), crossings(livePitch, livePitch.layout));
            eq(Number(pitchTotals[2]),
               crossings(livePitch, VA.spineRight(livePitch.layout)));

            // "`pitch_system`'s max jog 507px → 208px". Uniform mode: no
            // length scaling, so this number is a property of the layout and
            // the centring alone, exactly as the sentence around it claims.
            var mirrored = VA.spineRight(livePitch.layout);
            var plan = VA.gridPlan(mirrored, livePitch);
            var maxJog = function (positions) {
              var worst = 0;
              VA.leaderGeometry(mirrored, plan, M, positions).leaders
                .forEach(function (leader) {
                  worst = Math.max(worst, Math.abs(leader.y1 - leader.y2));
                });
              return worst;
            };
            var jogs = /max jog (\d+)px → (\d+)px/.exec(readme);
            ok(jogs, "expected the README's max-jog sentence");
            eq(Number(jogs[1]),
               maxJog(VA.rowPositions(mirrored, livePitch, "uniform", M)),
               "README's top-aligned max jog");
            eq(Number(jogs[2]),
               maxJog(VA.rowPositions(mirrored, livePitch, "uniform", M,
                 { budget: 0, plan: plan })),
               "README's centred max jog");

            // "45 rows × 26px = 1170px" — the floor minimum that makes the
            // honest overflow honest.
            var floor = /(\d+)\s+rows × (\d+)px = (\d+)px/.exec(readme);
            ok(floor, "expected the README's floor-minimum sentence");
            eq(Number(floor[1]), livePitch.layout.rows.length, "README's row count");
            eq(Number(floor[2]), M.rowHeight, "README's row height");
            eq(Number(floor[3]), livePitch.layout.rows.length * M.rowHeight,
               "README's floor minimum");

            // "`pitch_system`'s walk needs **10 columns**, while every one of
            // its study chains is linear and needs **1**" — the respine
            // section's reason for sliding the block instead of interpolating
            // x (viewer_study_respine_animation).
            var columns = /walk needs \*\*(\d+) columns\*\*,\s+while\s+every\s+one\s+of\s+its\s+study\s+chains\s+is\s+linear\s+and\s+needs\s+\*\*(\d+)\*\*/
              .exec(readme);
            ok(columns, "expected the README's column-count sentence");
            eq(Number(columns[1]), livePitch.layout.columns,
               "README's walk column count");
            var chainColumns = (livePitch.studies || []).filter(function (s) {
              return s.status === "ok" && s.layout;
            }).map(function (s) { return s.layout.columns; });
            ok(chainColumns.length, "pitch_system must have summing studies");
            chainColumns.forEach(function (c) {
              eq(c, Number(columns[2]), "README's chain column count");
            });

            // "3 over 3 for `pitch_link_to_pitch_plate`, 10 over 10 for
            // `pitch_system`, ..." -- the column-reuse bullet's own claim that
            // reuse fires nowhere, re-derived per topology so a sixth
            // committed topology, or a reuse case finally showing up, is a
            // stale-prose defect the fast tier catches rather than one that
            // waits for a human re-measurement (viewer_hygiene_pass, 2026-09-15).
            var reuseClaims = {};
            var reuseRe = /(\d+)\s+over\s+(\d+)\s+for\s+`([A-Za-z0-9_]+)`/g;
            var reuseMatch;
            while ((reuseMatch = reuseRe.exec(readme))) {
              reuseClaims[reuseMatch[3]] =
                { allocations: Number(reuseMatch[1]), columns: Number(reuseMatch[2]) };
            }
            ok(Object.keys(reuseClaims).length,
              "expected the README's column-reuse sentence to name at least one topology");
            var liveIds = liveTopos.map(function (t) { return t.id; });
            liveIds.forEach(function (id) {
              ok(reuseClaims[id], "README's column-reuse bullet does not name " +
                id + " -- a committed topology the prose has not caught up to");
            });
            Object.keys(reuseClaims).forEach(function (id) {
              ok(liveIds.indexOf(id) !== -1, "README's column-reuse bullet names " +
                id + ", which is not a live committed topology");
            });
            liveTopos.forEach(function (topoProj) {
              var claim = reuseClaims[topoProj.id];
              if (!claim) return;                          // reported above
              eq(claim.columns, topoProj.layout.columns,
                topoProj.id + "'s README column count");
              eq(claim.allocations, topoProj.layout.rails.length,
                topoProj.id + "'s README rail-allocation count");
            });
          });

        await test("[real] right-justifying pitch_system takes its spine " +
          "leaders off every branch rail they used to cross", function () {
            // The measured observable the mirror exists for, on the DoD's own
            // document. A leader's horizontal run from its dot to its lane
            // crosses every rail standing in that gap; pitch_system's spine
            // carries eight of its sixteen leaders, and they used to cross
            // four to seven rails each on the way out.
            var M = VA.RAIL_METRICS;
            var crossings = function (layout) {
              var plan = VA.gridPlan(layout, livePitch);
              var geo = VA.railGeometry(layout, M);
              var leaderGeo = VA.leaderGeometry(layout, plan, M);
              var rowsBy = {};
              layout.rows.forEach(function (r) { rowsBy[r.row] = r; });
              var total = 0;
              var spine = 0;
              leaderGeo.leaders.forEach(function (leader, i) {
                var row = rowsBy[plan.leaders[i].layoutRow];
                var n = 0;
                geo.rails.forEach(function (rail) {
                  if (rail.x > leader.x1 && rail.x < leader.laneX &&
                      rail.y1 <= leader.y1 && leader.y1 <= rail.y2) n++;
                });
                total += n;
                // The spine is the mainline's column: 0 as projected, the
                // last column once mirrored.
                if (row.column === (layout === livePitch.layout ? 0 : layout.columns - 1)) {
                  spine += n;
                }
              });
              return { total: total, spine: spine };
            };
            var before = crossings(livePitch.layout);
            var after = crossings(VA.spineRight(livePitch.layout));
            eq(before.spine, 43, "spine leaders crossed 43 rails as projected");
            eq(after.spine, 0, "right-justified, they cross none");
            ok(after.total < before.total,
               "total crossings " + after.total + " vs " + before.total);
          });

        await test("[real] the L1 grip stack draws as a ring: two rails, one " +
          "closing edge, no forks", function () {
            eq(liveL1.layout.columns, 2);
            eq(liveL1.branch_nodes, []);
            var closing = liveL1.layout.rows.filter(function (r) {
              return r.closes_row !== null && r.closes_row !== undefined;
            });
            eq(closing.map(function (r) { return r.id; }), ["fastener_grip"]);
          });

        await test("[real] the pitch system's five forks are marked", function () {
          ok(livePitch.branch_nodes.length === 5,
             "expected 5 branch points, got " + livePitch.branch_nodes.length);
          var root = render(function (r) {
            VA.renderTopoPane(r, {
              topoProj: livePitch, study: null, crops: realCrops,
              layoutMode: "topology", selection: null, onSelect: function () {},
            });
          });
          eq(all(root, "circle.rail__dot--branch").length, 5);
        });

        await test("[real] the ring gear's cyclic-only branch is visibly a branch",
          function () {
            // The brief names this case by hand: the ring gear participates
            // cyclically and follows along for pure collective, and its edges
            // hang off the blade-root clocking fork. It must read as a branch
            // rather than as part of the spine.
            var clocking = livePitch.layout.rows.filter(function (r) {
              return r.id === "pitch_arm_blade_root_clocking";
            })[0];
            ok(clocking && clocking.branch, "the clocking interface is a fork");
            var ring = livePitch.layout.rows.filter(function (r) {
              return r.id === "blade_root_clocking_to_ring_gear_mesh";
            })[0];
            ok(ring.column !== clocking.column,
               "the ring-gear branch must leave the fork's rail");
            var fanout = livePitch.layout.links.filter(function (l) {
              return l.kind === "branch" && l.row === clocking.row &&
                l.to_column === ring.column;
            });
            eq(fanout.length, 1, "a fan-out curve leaves the fork for that rail");
          });

        await test("[real] every study's totals reach the page value for value",
          function () {
            var seen = 0;
            liveTopos.forEach(function (topoProj) {
              topoProj.studies.forEach(function (study) {
                if (study.status !== "ok") return;
                seen++;
                var root = render(function (r) {
                  VA.renderTopoTotals(r, topoProj, study,
                                      VA.topologyIndex(topoProj));
                });
                var text = root.textContent;
                ["nominal", "worst_case_min", "worst_case_max",
                 "worst_case_half", "rss_min", "rss_max", "rss_half"]
                  .forEach(function (field) {
                    has(text, VA.fmt(study.result[field]),
                        study.id + " " + field);
                  });
                has(text, study.result.units, study.id);
              });
            });
            ok(seen >= 5, "expected the five committed studies, got " + seen);
          });

        await test("[real] the shank-out study's published numbers are on screen",
          function () {
            // The one study whose answer is checkable against something outside
            // this archetype: it is the grip stack's own worst_case_shank_out
            // check, re-expressed as a loop closure.
            var study = VA.findStudy(liveL1, "vpa_output_shank_out");
            var root = render(function (r) {
              VA.renderTopoTotals(r, liveL1, study, VA.topologyIndex(liveL1));
            });
            has(root.textContent, "-0.0824");    // nominal
            has(root.textContent, "0.6449");     // worst-case half
            has(root.textContent, "shank_out");  // the derived gap it closes
          });

        // --- the verdict, the margin and what is missing ----------------------
        //
        // viewer_study_verdicts_and_gaps (2026-09-15), from Jeff's review of
        // this page: "None of the tolerance stacks in the entire page appear to
        // have any kind of roll up that shows whether the stack passes or fails,
        // or by how much margin." The data had been in the projection since
        // 2026-09-09 and nothing read it, so these are value-level: they pin the
        // rendered STRINGS against the live projection's own numbers, not the
        // presence of an element.

        await test("[real] the pitch-link studies render their verdicts and " +
          "their margins, including the study that has no criterion at all",
          function () {
            var topo = VA.findTopology(realTopologies, "pitch_link_to_pitch_plate");
            ok(topo, "the pitch-link topology must be in the projection");
            var index = VA.topologyIndex(topo);
            var shown = function (studyId) {
              return render(function (r) {
                VA.renderTopoTotals(r, topo, VA.findStudy(topo, studyId), index);
              }).textContent;
            };

            // FAIL, with the margin, and the word "margin" beside it: the two
            // halves of Jeff's sentence.
            var out = shown("pitch_link_shank_out");
            has(out, "fail");
            // -8.428 / +11.0444, not -8.1939 / +11.1435: those were this
            // stack's numbers until `pitch_link_known_bands` gave its bushing
            // and washer real bands, and the two branches met for the first
            // time in the integration merge (resolved during
            // `review/pitch_link_known_bands`). `VA.fmt` is `String(n)`, so the
            // page prints -8.428, never the worksheet's aligned -8.4280.
            has(out, "margin -8.428 mm at worst case");
            has(out, VA.VERDICTS.fail.says);

            // PASS, same shape, on the same page -- so a reader can tell the two
            // studies apart without opening either.
            var clear = shown("pitch_link_cotter_hole_clearance");
            has(clear, "pass");
            has(clear, "margin +11.0444 mm at worst case");
            has(clear, VA.VERDICTS.pass.says);

            // And the third: a study that sums and has no criterion recorded.
            // Rendering this one blank is what made the whole page look as
            // though it held no verdicts.
            var none = shown("pitch_link_thread_region_t");
            has(none, "No pass/fail criterion has been recorded for this study yet");
            eq(none.indexOf("margin "), -1,
               "a study with no criterion must not print a margin");
          });

        await test("[real] an incomplete check states what is missing ABOVE its " +
          "number, and its verdict is visibly qualified", function () {
            var topo = VA.findTopology(realTopologies, "pitch_link_to_pitch_plate");
            var study = VA.findStudy(topo, "pitch_link_shank_out");
            var root = render(function (r) {
              VA.renderTopoTotals(r, topo, study, VA.topologyIndex(topo));
            });
            eq(study.checks[0].complete, false,
               "this claim rests on the live check really being incomplete");
            has(root.textContent, "budget for what is missing");
            // The term itself, in the words the check wrote -- not a field name
            // and not a count.
            has(root.textContent, "spherical bearing width");
            eq(all(root, ".tvverdict-card--qualified").length, 1);
            ok(all(root, ".tvverdict--qualified").length >= 1,
               "the rollup badge wears the qualification too");
          });

        // Repointed at `rotor_fastener_length` during
        // `review/pitch_link_known_bands`, resolving the integration merge of
        // this handoff with `pitch_link_known_bands`. This read
        // `pitch_link_to_pitch_plate` / `pitch_link_shank_out`, whose bushing
        // and washer were the repo's zero-width example when it was written;
        // that handoff gave both a real band, so the warning correctly stops
        // rendering there and the assertion had no subject left. Repointed
        // rather than deleted, and rather than flipped to `eq(warn.length, 0)`
        // under a name that promises the warning appears: a field nothing tests
        // is a field that quietly stops being emitted. `rotor_fastener_grip_u2h`
        // is the live example now -- its `selection` names both washers, and
        // MS21299 and NAS1149 are both absent from the pile, so neither has a
        // band in any document. (The stack-view twin,
        // `[real] the zero-width flag reaches the page`, moved to the same
        // stack for the same reason.)
        await test("[real] a study fed by a zero-width row warns that its " +
          "spread is a lower bound, and names the rows that make it one",
          function () {
            var topo = VA.findTopology(realTopologies, "rotor_fastener_length");
            ok(topo, "the rotor-fastener topology must be in the projection");
            var study = VA.findStudy(topo, "rotor_fastener_grip_u2h");
            var root = render(function (r) {
              VA.renderTopoTotals(r, topo, study, VA.topologyIndex(topo));
            });
            var warn = all(root, ".tvwarn--lower-bound");
            eq(warn.length, 1);
            has(warn[0].textContent, "no tolerance recorded");
            has(warn[0].textContent, "LOWER bound");
            has(warn[0].textContent, "MS21299C3");
            has(warn[0].textContent, "NAS1149V0332H");
          });

        // And the other half of the same move: the stack that USED to raise the
        // warning must now not raise it, for the recorded reason. Without this,
        // a regression that put the two pitch-link rows back to zero-width
        // would be invisible to the line above.
        await test("[real] the pitch-link shank-out study no longer claims a " +
          "lower bound, because nothing in its chain is zero-width now",
          function () {
            var topo = VA.findTopology(realTopologies, "pitch_link_to_pitch_plate");
            var study = VA.findStudy(topo, "pitch_link_shank_out");
            var root = render(function (r) {
              VA.renderTopoTotals(r, topo, study, VA.topologyIndex(topo));
            });
            eq(all(root, ".tvwarn--lower-bound").length, 0);
            // It is still qualified, just for a different reason -- the two
            // bands are UNVERIFIED rather than missing, which is the whole
            // point of the 2026-09-15 ruling. A page that dropped both signals
            // would pass the line above.
            has(root.textContent, "unverified");
          });

        await test("[real] the missing spherical bearing is visible on the page " +
          "without opening any JSON", function () {
            var topo = VA.findTopology(realTopologies, "pitch_link_to_pitch_plate");
            // With NO study selected -- the state a reader arrives in.
            var root = render(function (r) {
              VA.renderTopoTotals(r, topo, null, VA.topologyIndex(topo));
            });
            has(root.textContent, "What's missing");
            has(root.textContent, "spherical bearing width");
            has(root.textContent, VA.GAP_KINDS.excluded_from_model.heading);
          });

        await test("[real] every live gap row is one this page has words for, " +
          "and every kind the builder writes is used somewhere", function () {
            var kinds = {};
            liveTopos.forEach(function (topoProj) {
              (topoProj.gaps || []).forEach(function (gap) {
                kinds[gap.kind] = (kinds[gap.kind] || 0) + 1;
                ok(VA.GAP_KINDS[gap.kind],
                   topoProj.id + " writes gap kind " + JSON.stringify(gap.kind) +
                   " and this page has no words for it");
                ok(gap.text, topoProj.id + ": a gap row with no words in it");
              });
            });
            // Anti-vacuity: the loop above passes trivially over an empty
            // projection, and all four kinds have live rows today.
            eq(Object.keys(VA.GAP_KINDS).filter(function (k) { return !kinds[k]; }),
               [], "a kind with no live row -- the loop above stops checking it");
          });

        await test("[real] every study wears a verdict badge on the nav rail, " +
          "and not one of them is blank", function () {
            var tree = VA.navTree(realTopologies, null);
            var root = render(function (r) {
              VA.renderNavTree(r, tree, { mode: "topology" }, {
                onTopology: function () {}, onStudy: function () {},
                onStack: function () {},
              });
            });
            var rows = all(root, ".navtree__row--study");
            var studies = liveTopos.reduce(function (n, t) {
              return n + (t.studies || []).length;
            }, 0);
            eq(rows.length, studies);
            ok(studies >= 20, "expected the live study count, got " + studies);
            var blank = rows.filter(function (row) {
              return all(row, ".tvverdict").length !== 1;
            });
            eq(blank.length, 0,
               "a study row with no verdict badge reads as a study that passed");
            // And the three states are all really on screen, so the assertion
            // above is not satisfied by one word repeated 21 times.
            ok(all(root, ".tvverdict--fail").length >= 1, "a failing study");
            ok(all(root, ".tvverdict--pass").length >= 1, "a passing study");
            ok(all(root, ".tvverdict--none").length >= 1,
               "a study with no criterion recorded");
          });

        await test("[real] a row whose number has nothing behind it says so in " +
          "the grid, in the words a reader brought with them", function () {
            var root = render(function (r) {
              VA.renderTopoPane(r, {
                topoProj: livePitch, study: null, crops: realCrops,
                layoutMode: "topology", selection: null, onSelect: function () {},
              });
            });
            var flagged = all(root, ".tvflag--unverified");
            var unverified = livePitch.edges.filter(function (e) {
              return VA.needsAnnotation(e.confidence);
            });
            ok(unverified.length >= 1, "pitch_system has unverified edges");
            eq(flagged.length, unverified.length,
               "one badge per unverified row, no more and no fewer");
            has(root.textContent, VA.ATTENTION.unverified.text);
          });

        await test("[real] selecting a study marks its chain on the real rails",
          function () {
            var study = VA.findStudy(livePitch, "pitch_system_blade_angle_worst");
            var root = render(function (r) {
              VA.renderTopoPane(r, {
                topoProj: livePitch, study: study, crops: realCrops,
                layoutMode: "topology", selection: null, onSelect: function () {},
              });
            });
            var on = all(root, "tr.tvrow--on");
            var off = all(root, "tr.tvrow--off");
            ok(off.length > 0, "a 24-edge topology has rows off a 10-edge chain");
            eq(on.length, study.result.chain.length);
            eq(on.length + off.length, livePitch.edges.length);
            eq(all(root, "line.rail__bar--on").length, study.result.chain.length);
          });

        await test("[real] an L1 edge reaches the stack element's own crop",
          function () {
            // "Reuse the existing thumbnail plumbing" — asserted against the
            // real crops.json rather than assumed: the grip edge's crop_key must
            // address an entry that is actually in it.
            var edge = VA.topologyIndex(liveL1).edges.fastener_grip;
            ok(edge.crop_key, "a dimension_ref edge carries a crop key");
            var entry = VA.cropFor(realCrops, edge.crop_key.stack,
                                   edge.crop_key.element);
            eq(entry.status, "resolved");
            eq(entry.pdf_name, "NAS6403-NAS6420 Rev 4.pdf");
          });

        await test("[real] pitch_system's inline croppable edges resolve through " +
          "the {topology, edge} space (viewer_hover_cards_and_deep_links)",
          function () {
            // The wiring this handoff exists to add: every pitch_system crop
            // lives in by_topology, and before VA.cropForKey the viewer read
            // only by_stack, so all of them rendered as "no-entry — the index
            // is stale". At least one must resolve for the DoD's edge-hover
            // demonstration to mean anything.
            var keyed = livePitch.edges.filter(function (e) {
              return e.crop_key && e.crop_key.topology;
            });
            ok(keyed.length > 0, "pitch_system has topology-keyed edges");
            var resolved = keyed.filter(function (e) {
              return VA.cropForKey(realCrops, e.crop_key).status === "resolved";
            });
            ok(resolved.length > 0,
               "at least one topology-keyed crop resolves out of by_topology");
            // The edge card carries the same entry the trigger shows.
            var card = VA.edgeCard(livePitch, resolved[0], realCrops);
            eq(card.crops.length, 1);
            eq(card.crops[0].entry.status, "resolved");
          });

        await test("[real] a pitch_system component card derives a thumbnail " +
          "from its own rows' crops", function () {
            // hub's blade-root-seat position callout is cropped (by_topology),
            // so hub's card carries a real derived thumbnail.
            var card = VA.componentCard(livePitch, "hub", realCrops);
            ok(card.thumbs.length > 0, "hub has at least one resolved crop");
            eq(card.thumbs[0].entry.status, "resolved");
          });

        await test("[real] a citation card renders from a real spec citation, " +
          "spec-pile identity and all", function () {
            var edge = VA.topologyIndex(liveL1).edges.fastener_grip;
            var ref = edge.dimension.source_ref;
            eq(ref.kind, "spec");
            var entry = VA.cropForKey(realCrops, edge.crop_key);
            var card = VA.citationCard(ref, null, entry);
            var root = render(function (r) {
              VA.renderHoverCard(r, card, {}, VA.CONFIG, null);
            });
            has(root.textContent, "NAS6403");
            // Live spec citations exist in both states — resolved through the
            // spec pile with no export block, and carrying an established
            // export. (Counts age; the "three spec citations do" this comment
            // first shipped with was 12 instances when recounted in review.)
            // Whichever state this one is in, the export/identity block must
            // be present and honest — never silent.
            eq(all(root, ".el-export").length, 1);
          });

        // --- 3D affordances against the REAL mesh set --------------------
        //
        // (handoff annotate_affordances_flyout_and_mesh_gating.) The viewer
        // offered "open this part in 3D" on every untraced edge, and for all
        // but a handful of parts that link dead-ended in the annotator's empty
        // state: far fewer meshes are installed than there are topology parts,
        // and the alias table resolves some of the ones that are. No count
        // lives in this comment on purpose -- the numbers move, and
        // tests/test_part_mesh_aliases.py owns the shipped alias table.
        //
        // ALL THREE are written COUNT-FREE and NAME-FREE, and that is the whole
        // discipline of this block: a sibling repo is actively growing the mesh
        // set, so the rule ("offer it exactly where a mesh resolves") has to
        // hold at any mesh count without a test edit. The two edge-specific
        // ones named `gas_spring_mount_213668_002` / the alias target
        // `machined_213668` and asserted `hub` has no mesh, so installing a hub
        // mesh reddened one of them for a correct reason -- the shape
        // docs/prompts/REVIEW_AGENT.md logs as "a demonstration that fails for
        // an unrelated reason is how a guard gets deleted" (measured in review;
        // ISSUE_20260914_real_mesh_edge_tests_break_when_the_mesh_set_grows,
        // fixed by projection_field_guard_rows 2026-09-15). They now pick their
        // edges BY BEHAVIOUR -- every live edge with a gap to close, split on
        // whether its part's mesh resolves -- with a non-vacuity witness on
        // each side, so neither can pass on an empty set.

        function detailFor(topoProj, edgeId, studyId) {
          return render(function (r) {
            VA.renderTopoDetail(r, {
              topoProj: topoProj, study: VA.findStudy(topoProj, studyId),
              crops: realCrops, layoutMode: "topology",
              selection: { kind: "edge", id: edgeId },
              detailImage: null, onSelect: function () {},
            });
          });
        }

        // Every live edge that has a gap to close (VA.needsAnnotation), split on
        // whether its own part's mesh resolves -- which is the ONLY thing the
        // affordance is allowed to depend on. Each entry carries a study that
        // selects the edge where one does, because that is the context the pane
        // is really rendered in; an edge no study reaches renders without one.
        function annotatableEdges(meshed) {
          var out = [];
          realTopologies.topologies.forEach(function (topoProj) {
            (topoProj.edges || []).forEach(function (edge) {
              if (!VA.needsAnnotation(edge.confidence)) return;
              if (VA.partHasMesh(topoProj, edge.part) !== meshed) return;
              out.push({
                topoProj: topoProj, edge: edge,
                study: (topoProj.studies || []).filter(function (s) {
                  return (s.selection || []).indexOf(edge.id) !== -1;
                })[0] || null,
              });
            });
          });
          return out;
        }

        await test("[real] every untraced edge whose part HAS a mesh offers a " +
          "working annotate-this link, wherever the mesh set has reached",
          function () {
            var candidates = annotatableEdges(true);
            ok(candidates.length > 0, "no live edge with a gap to close has a " +
              "meshed part, so the OFFERING half of this rule went unexercised " +
              "-- rebuild the topology projection against the main checkout's " +
              "data/meshes");
            candidates.forEach(function (c) {
              var where = c.topoProj.id + "/" + c.edge.id;
              var root = detailFor(c.topoProj, c.edge.id, c.study && c.study.id);
              var link = root.querySelector("a.detail__annotate-link");
              if (!link) throw new Error(where + ": expected an annotate-this " +
                "link for an edge with a gap to close whose part has a mesh");
              // Every param is read off the edge itself -- nothing is typed
              // here, so the assertion survives any mesh set.
              var href = link.getAttribute("href");
              has(href, "topology=" + c.topoProj.id, where);
              has(href, "edge=" + c.edge.id, where);
              has(href, "isolate=" + c.edge.part, where);
              if (c.study) has(href, "study=" + c.study.id, where);
            });
            // The alias table is why a mesh resolves for a part whose id is not
            // the mesh's: SOME live part's mesh_part_id differs from its own id.
            // That is the fact the table exists for and the one that survives
            // any mesh count (the shipped table itself is pinned by
            // tests/test_part_mesh_aliases.py and apps/annotate/'s [real] tier).
            var aliased = topoParts(realTopologies).filter(function (part) {
              // Guarded: on a projection older than the `mesh` field this
              // witness REPORTS rather than throwing, and the value-guard row
              // for parts[].mesh.installed prints the rebuild diagnosis in the
              // same run.
              var mesh = part.mesh || {};
              return mesh.installed && mesh.part_id !== part.id;
            });
            ok(aliased.length > 0, "no live part's mesh is installed under an " +
              "id other than its own, so nothing here exercises the alias " +
              "table docs/topologies/part_mesh_aliases.json exists for");
          });

        await test("[real] every untraced edge whose part has NO mesh offers " +
          "nothing at all -- not a disabled control, not an explanation",
          function () {
            var candidates = annotatableEdges(false);
            ok(candidates.length > 0, "every live edge with a gap to close has " +
              "a meshed part, so the WITHHOLDING half of this rule went " +
              "unexercised");
            candidates.forEach(function (c) {
              var where = c.topoProj.id + "/" + c.edge.id;
              var root = detailFor(c.topoProj, c.edge.id, c.study && c.study.id);
              eq(all(root, "a.detail__annotate-link").length, 0, where);
              eq(all(root, "button.detail__annotate-btn").length, 0, where);
              // The row is still on the gap list, and the pane still says so --
              // what went away is the dead link, not the honesty about the gap.
              has(root.textContent, "No document backs this number", where);
              // And nothing on the pane mentions a 3D model the reader cannot open.
              eq(/3D/.test(root.textContent), false, where);
            });
          });

        await test("[real] across every live topology, a part's 3D affordance " +
          "is offered exactly where a mesh resolves", function () {
            var offered = [], withheld = [];
            realTopologies.topologies.forEach(function (topoProj) {
              (topoProj.parts || []).forEach(function (part) {
                var card = VA.componentCard(topoProj, part.id, realCrops);
                var has3d = !!card.annotateParams;
                eq(has3d, part.mesh.installed,
                  topoProj.id + "/" + part.id + ": mesh.installed=" +
                  part.mesh.installed + " but the component card " +
                  (has3d ? "offers" : "withholds") + " a 3D affordance");
                (has3d ? offered : withheld).push(part.id);
              });
            });
            // Both states have to be exercised for the pairing above to mean
            // anything -- a projection where every part resolved (or none did)
            // would pass it vacuously.
            ok(offered.length > 0, "no live part has an installed mesh -- rebuild " +
              "the topology projection against the main checkout's data/meshes");
            ok(withheld.length > 0, "every live part has a mesh, so the " +
              "withholding half of this pairing went unexercised");
          });

        // --- [real] the DAG's hover cards, on the real graphs ----------------

        await test("[real] every dot of every live topology cards, and says " +
          "boundary-or-internal from the projection alone", function () {
            var boundary = 0, internal = 0, thumbed = 0, clearances = 0;
            realTopologies.topologies.forEach(function (topoProj) {
              (topoProj.nodes || []).forEach(function (node) {
                var card = VA.nodeCard(topoProj, node.id, realCrops);
                ok(card, topoProj.id + "/" + node.id + ": no card");
                ok(card.sides.length >= 1,
                  topoProj.id + "/" + node.id + ": a node with no side at all — " +
                  "every node is incident on at least one edge");
                // Internal is exactly one side, by the same predicate the
                // leaders use. The card cannot claim a boundary it has no
                // second side for, nor hide one it does.
                eq(card.internal, card.sides.length <= 1,
                  topoProj.id + "/" + node.id);
                card.sides.forEach(function (side) {
                  if (side.part === null) {
                    eq(side.label, VA.CLEARANCE_SIDE_LABEL);
                    clearances += 1;
                  } else {
                    ok(side.label, topoProj.id + "/" + side.part + ": unlabelled side");
                    // A thumbnail is never invented: where one exists it IS
                    // that part's own component-card thumbnail.
                    var own = VA.componentCard(topoProj, side.part, realCrops);
                    eq(side.thumb, own.thumbs.length ? own.thumbs[0] : null,
                      topoProj.id + "/" + side.part + ": the dot and the merged " +
                      "cell disagree about this part's picture");
                    if (side.thumb) thumbed += 1;
                  }
                });
                if (card.internal) internal += 1; else boundary += 1;
              });
            });
            // All three states have to be live for the walk above to mean
            // anything — an all-boundary or all-thumbless projection would
            // pass it vacuously.
            ok(boundary > 0, "no live node is a part boundary");
            ok(internal > 0, "no live node is internal to one part");
            ok(thumbed > 0, "no live node side resolves a thumbnail — rebuild " +
              "crops.json against the main checkout's data/");
            ok(clearances > 0, "no live node sits against a clearance, so the " +
              "clearance-side wording went unexercised");
          });

        await test("[real] every live dot answers the SAME on hover and on " +
          "click, and no live node declares a part it is not incident on",
          function () {
            var divergedFromDeclared = 0, nodes = 0;
            realTopologies.topologies.forEach(function (topoProj) {
              (topoProj.nodes || []).forEach(function (node) {
                nodes += 1;
                var card = VA.nodeCard(topoProj, node.id, realCrops);
                var sideIds = card.sides.map(function (side) {
                  return side.part === null ? VA.CLEARANCE_SIDE_LABEL : side.part;
                });
                var pane = render(function (r) {
                  VA.renderTopoDetail(r, {
                    topoProj: topoProj, study: null, crops: realCrops,
                    layoutMode: "topology", detailImage: null,
                    selection: { kind: "node", id: node.id },
                    onSelect: function () {},
                  });
                });
                eq(pane.querySelector("div.detail__where").textContent,
                  "on " + sideIds.join(" ⇔ "),
                  topoProj.id + "/" + node.id + ": the hover card and the " +
                  "preview pane disagree about this node's sides");

                // WHY they used to disagree, pinned as data rather than as
                // prose in a lesson. A declared list cannot name a CLEARANCE
                // (not a part), which is an honest derivation difference and
                // is every divergence in today's data. A declared part that no
                // incident edge carries would be a different thing entirely --
                // an authoring error in the topology document, which printing
                // the derived sides would HIDE -- so it is asserted away here
                // rather than assumed.
                (node.parts || []).forEach(function (part) {
                  ok(sideIds.indexOf(part) !== -1,
                    topoProj.id + "/" + node.id + " declares part `" + part +
                    "`, which no edge incident on it carries: an authoring " +
                    "error in the topology document, not a display bug");
                });
                if ((node.parts || []).join("|") !== sideIds.join("|")) {
                  divergedFromDeclared += 1;
                }
              });
            });
            // Vacuity guard, and the number the handoff was filed over: with
            // declared == derived everywhere, the pane could still be printing
            // `node.parts` and this test would pass.
            ok(divergedFromDeclared > 0, "no live node's declared parts differ " +
              "from its derived sides, so the divergence this test exists for " +
              "went unexercised");
            ok(nodes > 0, "no live nodes at all — rebuild topologies.json");
          });

        await test("[real] a live bar's card is the same card its grid trigger " +
          "opens, and a croppable edge's card carries the crop", function () {
            var croppable = 0;
            realTopologies.topologies.forEach(function (topoProj) {
              (topoProj.edges || []).forEach(function (edge) {
                // One model, two triggers: the DAG bar passes a render note
                // only where the bar is FLOORED, and nothing else may differ.
                var plain = VA.edgeCard(topoProj, edge, realCrops);
                eq(VA.edgeCard(topoProj, edge, realCrops, null), plain,
                  topoProj.id + "/" + edge.id);
                eq(VA.edgeCard(topoProj, edge, realCrops,
                  { renderNote: VA.FLOORED_RENDER_NOTE }).renderNote,
                  VA.FLOORED_RENDER_NOTE, topoProj.id + "/" + edge.id);
                if (!edge.crop_key) {
                  ok(plain.noCropReason, topoProj.id + "/" + edge.id +
                    ": a keyless edge says nothing about why");
                  return;
                }
                eq(plain.crops.length, 1, topoProj.id + "/" + edge.id);
                if (plain.crops[0].entry.status === "resolved") croppable += 1;
              });
            });
            ok(croppable > 0, "no live edge resolves a crop, so the thumbnail " +
              "half of the bar card went unexercised");
          });

        // --- [real] the topology fixture, against the real shapes -------------
        //
        // The same two guards the stack projection has, for the same two
        // reasons: a key the builder writes and the fixture does not is a state
        // no fixture-tier test can pin, and a VALUE the viewer has no branch for
        // is the bug a key-set diff cannot see.

        var TOPO_SIDES = { fixture: [TOPOFIX], live: [realTopologies] };

        function topoRows(p) { return p.topologies || []; }
        function topoEdges(p) {
          return flat(topoRows(p).map(function (t) { return t.edges; }));
        }
        function topoNodes(p) {
          return flat(topoRows(p).map(function (t) { return t.nodes; }));
        }
        function topoStudies(p) {
          return flat(topoRows(p).map(function (t) { return t.studies; }));
        }
        function topoParts(p) {
          return flat(topoRows(p).map(function (t) { return t.parts; }));
        }
        function topoLayouts(p) {
          return topoRows(p).map(function (t) { return t.layout; }).concat(
            topoStudies(p).map(function (s) { return s.layout; }).filter(Boolean));
        }
        function topoLayoutRows(p) {
          return flat(topoLayouts(p).map(function (l) { return l.rows; }));
        }
        function topoLinks(p) {
          return flat(topoLayouts(p).map(function (l) { return l.links; }));
        }
        function topoChain(p) {
          return flat(topoStudies(p).map(function (s) {
            return (s.result && s.result.chain) || [];
          }));
        }
        function topoDimensions(p) {
          return topoEdges(p).map(function (e) { return e.dimension; })
            .filter(Boolean);
        }

        var TOPO_SHAPES = [
          { name: "topologies (top level)", collect: function (p) { return [p]; } },
          { name: "topologies[]", collect: topoRows },
          { name: "topologies[].nodes[]", collect: topoNodes },
          { name: "topologies[].edges[]", collect: topoEdges },
          { name: "topologies[].edges[].dimension", collect: topoDimensions },
          { name: "topologies[].parts[]", collect: topoParts },
          { name: "layout (topology and study)", collect: topoLayouts },
          { name: "layout.rows[]", collect: topoLayoutRows },
          { name: "layout.links[]", collect: topoLinks },
          { name: "layout.rails[]", collect: function (p) {
            return flat(topoLayouts(p).map(function (l) { return l.rails; })); } },
          { name: "topologies[].studies[]", collect: topoStudies },
          { name: "studies[].result.chain[]", collect: topoChain },
        ];

        await test("[real] the topology fixture's shapes still match the builder's",
          function () {
            var drift = [];
            TOPO_SHAPES.forEach(function (shape) {
              var mine = keyUnion(flat(TOPO_SIDES.fixture.map(shape.collect)));
              var theirs = keyUnion(flat(TOPO_SIDES.live.map(shape.collect)));
              if (!theirs.length) {
                drift.push(shape.name + ": no live instance — either the " +
                  "collector in tests.js is wrong or the builder stopped " +
                  "writing it");
                return;
              }
              var missing = minus(theirs, mine.concat(shape.ignoreLive || []));
              var extra = minus(mine, theirs.concat(shape.fixtureOnly || []));
              if (missing.length) {
                drift.push(shape.name + ": the projection writes [" +
                  missing.join(", ") + "] and apps/viewer/topology_fixtures.js " +
                  "does not — REGENERATE it (its header says how)");
              }
              if (extra.length) {
                drift.push(shape.name + ": topology_fixtures.js writes [" +
                  extra.join(", ") + "] and no live object does");
              }
            });
            eq(drift, [], "topology_fixtures.js has drifted from the builder");
          });

        var TOPO_VALUE_GUARDS = [
          { field: "layout.rows[].kind",
            branch: "VA.TOPO_ROW_KINDS — the grid dispatches nodeRow/edgeRow on " +
              "it, and `node` is the DEFAULT arm, so a new kind renders as an " +
              "interface with no value: a lie, not a gap",
            known: inList(VA.TOPO_ROW_KINDS),
            values: function (p) {
              return topoLayoutRows(p).map(function (r) { return r.kind; });
            } },
          { field: "layout.links[].kind",
            branch: "VA.TOPO_LINK_KINDS — railGeometry picks the path shape on " +
              "it, and `close` is the default arm, so a new link kind would be " +
              "drawn as a loop closure",
            known: inList(VA.TOPO_LINK_KINDS),
            values: function (p) {
              return topoLinks(p).map(function (l) { return l.kind; });
            } },
          { field: "edges[].value_source",
            branch: "VA.VALUE_SOURCES — an unlabelled one renders as the loud " +
              "magenta chip rather than as one of the three explained states",
            known: function (v) { return !!VA.VALUE_SOURCES[v]; },
            values: function (p) {
              return topoEdges(p).map(function (e) { return e.value_source; });
            } },
          { field: "studies[].status",
            branch: "VA.STUDY_STATUSES — anything but `ok` renders the error " +
              "block, so a third status would show a study's totals as a refusal",
            known: inList(VA.STUDY_STATUSES),
            values: function (p) {
              return topoStudies(p).map(function (s) { return s.status; });
            } },
          { field: "edges[].confidence",
            branch: "VA.CONFIDENCES, through VA.confidenceClass. `null` is the " +
              "derived gap, which has no citation because it has no value",
            known: function (v) {
              return v === null || VA.confidenceClass(v) !== "conf--unknown";
            },
            values: function (p) {
              return topoEdges(p).map(function (e) { return e.confidence; });
            } },
          { field: "nodes[].kind",
            branch: "VA.NODE_KINDS — the two node kinds render as a plain chip " +
              "and a filled dot (.rail__dot--datum), and `mating_surface` is the " +
              "DEFAULT arm of the chip's explanation, so a third would read as a " +
              "mating surface",
            known: inList(VA.NODE_KINDS),
            values: function (p) {
              return topoNodes(p).map(function (n) { return n.kind; });
            } },
          { field: "edges[].kind",
            branch: "VA.EDGE_KINDS — `gap` dashes the bar and drops the part " +
              "name; `structural` is the default arm",
            known: inList(VA.EDGE_KINDS),
            values: function (p) {
              return topoEdges(p).map(function (e) { return e.kind; });
            } },
          { field: "edges[].transform.kind",
            branch: "anything but `identity` raises the transform chip and " +
              "prints the sensitivity; a new kind still renders, by name",
            known: inList(VA.TRANSFORM_KINDS),
            values: function (p) {
              return topoEdges(p).map(function (e) { return e.transform.kind; });
            } },
          { field: "parts[].mesh.installed",
            branch: "VA.partHasMesh tests `=== true`, and EVERY 3D affordance " +
              "hangs off it — the component card's view-in-3D link and an " +
              "untraced edge's annotate-this link. Its false arm shows NOTHING " +
              "by design, so any value that is not a boolean lands in that arm " +
              "silently: an ABSENT mesh block (a projection built before the " +
              "field existed) reads exactly like a part with no model, and only " +
              "a rebuild tells the two apart. Read RAW here rather than through " +
              "VA.partMeshFact, which maps absent to false and is the thing " +
              "that makes the state silent on the page",
            known: function (v) { return v === true || v === false; },
            values: function (p) {
              return topoParts(p).map(function (part) {
                return part.mesh ? part.mesh.installed : undefined;
              });
            } },
        ];

        // The reporting loop, lifted out of the test below so the bite test
        // can replay it. It has TWO arms and they catch different things: an
        // unknown value, and a collector that finds NOTHING. The second arm is
        // the one `parts[].mesh.installed` was enrolled for -- a boolean's own
        // two-value set cannot notice an absent block -- and until it was
        // replayed here it was the one arm nothing exercised.
        function unexplainedValues(guards, projection) {
          var unexplained = [];
          guards.forEach(function (guard) {
            var values = distinct(guard.values(projection));
            if (!values.length) {
              unexplained.push(guard.field + ": no live value found — either " +
                "the collector is wrong or the builder stopped writing it");
              return;
            }
            values.forEach(function (value) {
              if (!guard.known(value)) {
                unexplained.push(guard.field + " = " + JSON.stringify(value) +
                  " is in the live projection and the page has no branch for " +
                  "it. Branch table: " + guard.branch);
              }
            });
          });
          return unexplained;
        }

        await test("[real] no live topology value is one the page cannot render",
          function () {
            eq(unexplainedValues(TOPO_VALUE_GUARDS, realTopologies), [],
              "teach the page these values — or fix the builder");
          });

        await test("[real] each topology value guard bites on a value nothing " +
          "explains, and on finding no value at all", function () {
            var toothless = TOPO_VALUE_GUARDS.filter(function (guard) {
              return guard.known(SENTINEL);
            }).map(function (guard) { return guard.field; });
            eq(toothless, [], "these guards accept any value at all");

            // The second arm, replayed per row: a collector that comes back
            // empty is REPORTED, not passed over. Replayed against each real
            // row (its own `field`/`branch`/`known`, collector blinded) rather
            // than against one synthetic guard, so the claim is about the rows
            // this file actually ships.
            TOPO_VALUE_GUARDS.forEach(function (guard) {
              var report = unexplainedValues([{
                field: guard.field, branch: guard.branch, known: guard.known,
                values: function () { return []; },
              }], realTopologies);
              eq(report.length, 1, guard.field + ": a blind collector went " +
                "unreported, so this row cannot notice the builder dropping " +
                "the field");
              has(report[0], "no live value found", guard.field);
            });
          });
      }

    }

    return results;
  };
})(window.ViewerApp = window.ViewerApp || {});
