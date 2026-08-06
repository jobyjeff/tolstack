// Pure view-model logic for the stack viewer. No DOM, no IO — everything here
// is a function of the two projections, so the node tier can test all of it.
//
// THE ONE RULE THIS FILE EXISTS TO KEEP: the viewer computes nothing. There is
// no addition, subtraction, comparison-of-tolerances or verdict logic below.
// Every interval and every verdict comes out of `results.json`, which
// scripts/build_viewer_projection.py produced with tolerance_stack.fold() —
// the repo's single arithmetic path (ARCHITECTURE.md: "there is exactly one
// line where a sign can be wrong"). A second fold in JS would be a second such
// line, so `fmt` below does not even round: the projection already rounded, in
// Python, where the arithmetic lives.
(function (VA) {
  "use strict";

  // --- formatting ---------------------------------------------------------

  // Print a projection number verbatim. `String(n)` and nothing else: no
  // toFixed, no scaling, no unit conversion.
  VA.fmt = function (n) {
    if (n === null || n === undefined || n === "") return "—";
    if (typeof n !== "number") return String(n);
    if (!isFinite(n)) return String(n);
    return String(n);
  };

  // A ± band as authored, or an em dash. Never derived from min/max.
  VA.fmtPlusMinus = function (value) {
    return value === null || value === undefined ? "—" : "±" + VA.fmt(value);
  };

  // --- provenance ---------------------------------------------------------

  VA.CONFIDENCES = ["traced", "inferred", "untraced", "no_source_ref"];

  VA.CONFIDENCE_LABEL = {
    traced: "traced",
    inferred: "inferred",
    untraced: "UNTRACED",
    no_source_ref: "NO CITATION",
  };

  // Class suffix for the colour system. `untraced` and `no_source_ref` are the
  // loud ones on purpose: Jeff reviews sourcing as much as arithmetic, and an
  // untraced value must be impossible to miss.
  VA.confidenceClass = function (confidence) {
    return "conf--" + (VA.CONFIDENCES.indexOf(confidence) === -1 ? "unknown" : confidence);
  };

  VA.verdictClass = function (verdict) {
    return "verdict--" + (["pass", "marginal", "fail"].indexOf(verdict) === -1
      ? "unknown" : verdict);
  };

  // Headline chips for a stack: the sourcing scoreboard, then the two things
  // that make a number less trustworthy than its digits suggest.
  VA.summaryChips = function (stackProj) {
    var counts = stackProj.provenance_counts || {};
    var chips = [];
    VA.CONFIDENCES.forEach(function (name) {
      if (counts[name]) {
        chips.push({
          kind: "confidence",
          confidence: name,
          text: counts[name] + " " + VA.CONFIDENCE_LABEL[name],
        });
      }
    });
    if (stackProj.zero_width_count) {
      chips.push({
        kind: "zero-width",
        text: stackProj.zero_width_count + " zero-width band" +
          (stackProj.zero_width_count === 1 ? "" : "s"),
        title: "min == max: no document gives this element a tolerance, so every " +
          "interval it feeds is a LOWER bound on the real spread.",
      });
    }
    var incomplete = (stackProj.checks || []).filter(function (c) { return c.incomplete; });
    if (incomplete.length) {
      chips.push({
        kind: "incomplete",
        text: incomplete.length + " INCOMPLETE check" + (incomplete.length === 1 ? "" : "s"),
        title: "A term is missing from the model, so the verdict is a budget, " +
          "not a conclusion about the joint.",
      });
    }
    return chips;
  };

  // --- element rows -------------------------------------------------------

  // Merge the authored element (verbatim) with its derived flags. The authored
  // object is never mutated and never has a value replaced — the derived block
  // rides beside it.
  VA.elementRows = function (stackProj) {
    var derivedById = {};
    (stackProj.elements || []).forEach(function (d) { derivedById[d.id] = d; });
    return ((stackProj.stack || {}).elements || []).map(function (element) {
      return {
        element: element,
        derived: derivedById[element.id] || {
          id: element.id,
          confidence: "no_source_ref",
          kind: null,
          zero_width: false,
          hardware_gaps: [],
        },
      };
    });
  };

  // "sheet 4 · DETAIL B · zone H3" — the same shape drawing-checker's own
  // "Where" column uses, so a citation reads the same in both tools.
  VA.citationWhere = function (sourceRef) {
    if (!sourceRef) return "no source_ref";
    var parts = [];
    if (sourceRef.document) parts.push(String(sourceRef.document));
    if (sourceRef.revision) parts.push("rev " + sourceRef.revision);
    if (sourceRef.sheet !== null && sourceRef.sheet !== undefined) {
      parts.push("sheet " + sourceRef.sheet);
    }
    if (sourceRef.view) parts.push(String(sourceRef.view));
    if (sourceRef.zone) parts.push("zone " + sourceRef.zone);
    if (sourceRef.cell) parts.push("cell " + sourceRef.cell);
    return parts.join(" · ") || "no location";
  };

  // --- crops --------------------------------------------------------------

  // Four distinct answers, and the difference between them matters:
  //   resolved      — a crop exists
  //   unresolvable  — the citation could not be pinned to a page, with a reason
  //   not-built     — crops.json is absent; nobody has run the crop script
  //   no-entry      — crops.json exists but says nothing about this element
  //                   (it predates the element — i.e. it is stale)
  VA.cropFor = function (cropsIndex, stackId, elementId) {
    if (!cropsIndex) {
      return {
        status: "not-built",
        reason: "the crop projection has not been built",
      };
    }
    var byStack = cropsIndex.by_stack || {};
    var entry = (byStack[stackId] || {})[elementId];
    if (!entry) {
      return {
        status: "no-entry",
        reason: "crops.json has no entry for this element — it is older than " +
          "the stack; re-run the crop script",
      };
    }
    return entry;
  };

  // The drawing-checker run page for a crop resolved through a run. null when
  // the crop came from the spec pile or a sources_used path: there is no run to
  // link to, and inventing a URL would be worse than showing the file path.
  VA.runUrl = function (config, cropEntry) {
    if (!cropEntry || !cropEntry.run_dir) return null;
    var base = String((config && config.drawingCheckerWebui) || "").replace(/\/+$/, "");
    if (!base) return null;
    return base + "/run/" + encodeURIComponent(cropEntry.run_dir);
  };

  // A file:// URL for the source PDF. Works because the app itself is served
  // from file://; from an http origin Chrome refuses the navigation, which is
  // why the plain path is always rendered beside the link.
  VA.fileUrl = function (absPath) {
    if (!absPath) return null;
    var normalised = String(absPath).replace(/\\/g, "/");
    return "file:///" + normalised.replace(/^\/+/, "");
  };

  // One line saying how much to trust a crop's placement.
  VA.cropProvenanceLine = function (cropEntry) {
    if (!cropEntry || cropEntry.status !== "resolved") return "";
    var bits = [];
    if (cropEntry.resolved_by === "joint_export_run") {
      bits.push("export pinned by the joint block" +
        (cropEntry.sha256_verified ? ", sha256 verified" : ""));
    } else if (cropEntry.resolved_by === "provenance.sources_used") {
      bits.push("export taken from provenance.sources_used (the joint block " +
        "names none)");
    } else if (cropEntry.resolved_by === "spec_pile") {
      bits.push("from data/inbox/specs/");
    }
    if (cropEntry.located_by === "zone_cell") {
      // Name the string that corroborated, never just "found". The needle is
      // whichever candidate matched FIRST, and the candidates include bare
      // tokens: the pitch-plate flange's zone D10 corroborates on "±0.10",
      // which occurs five times on that sheet, while the discriminating
      // "4.06 ±0.10" occurs once and is never tried (callout_needles splits on
      // whitespace). An unqualified "callout text found there" reads as much
      // stronger evidence than a generic token is, which is the one thing a
      // provenance surface must not do.
      bits.push("showing the cited zone " + cropEntry.cited_zone +
        (cropEntry.callout_text_in_zone === true
          ? " (callout text " + JSON.stringify(cropEntry.needle || "") + " found there)"
          : cropEntry.callout_text_in_zone === false
            ? " (callout text NOT found there — the crop is the citation, not a match)"
            : ""));
    } else if (cropEntry.located_by === "callout_text") {
      bits.push("located by the unique match for " + JSON.stringify(cropEntry.needle));
    } else if (cropEntry.located_by === "sheet_full") {
      bits.push(cropEntry.note || "whole sheet");
    }
    return bits.join(" · ");
  };

  // --- worksheets ---------------------------------------------------------

  VA.worksheetSegments = function (stackProj) {
    return stackProj && stackProj.worksheet_file
      ? String(stackProj.worksheet_file).split("/")
      : null;
  };

  // --- projections --------------------------------------------------------

  VA.findStack = function (results, stackId) {
    var stacks = (results && results.stacks) || [];
    for (var i = 0; i < stacks.length; i++) {
      if (stacks[i].id === stackId) return stacks[i];
    }
    return null;
  };

  // The banner's freshness line. Purely descriptive — the viewer does not try
  // to decide whether a projection is stale, it shows when each was built and
  // lets the reader judge.
  VA.builtLine = function (results, crops) {
    var parts = [];
    parts.push(results && results.built_at
      ? "results built " + results.built_at
      : "results NOT BUILT");
    parts.push(crops && crops.built_at
      ? "crops built " + crops.built_at +
        " (" + ((crops.summary || {}).resolved || 0) + " resolved, " +
        ((crops.summary || {}).unresolvable || 0) + " unresolvable)"
      : "crops NOT BUILT");
    return parts.join(" · ");
  };
})(window.ViewerApp = window.ViewerApp || {});
