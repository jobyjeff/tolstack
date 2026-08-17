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

  // One expanded term of a check or path, as a reviewer reads it:
  //   "+ sleeve_bore"                unity weight — the coefficient is silent
  //   "+ 2.0010712 × sleeve_wall"    anything else — the weight is NEVER silent
  //
  // The coefficient is the whole reason this function exists. A `thermal_fit`
  // check weights a sleeve wall by `2k` times a soak factor, and rendering that
  // as a bare "+ sleeve_wall" is worse than rendering nothing: it looks readable
  // and it is wrong, on the surface whose job is letting a reviewer read every
  // sign. `sign` still carries direction on its own (Term.coefficient is a
  // positive magnitude), so this prints `sign` then `coefficient`, exactly the
  // two fields the projection carries — no multiplying, no re-deriving.
  VA.termLabel = function (term) {
    if (!term) return "—";
    var head = term.sign < 0 ? "− " : "+ ";
    var weighted = typeof term.coefficient === "number" && term.coefficient !== 1;
    return head + (weighted ? VA.fmt(term.coefficient) + " × " : "") + term.element_id;
  };

  // The hover "why" on a weighted term. Generic on purpose: the specific reason
  // a weight is 2.0010712 belongs to the archetype and is in the check's own
  // guidance and configuration, and restating it here would be a second,
  // unverified claim about a number this file did not compute.
  VA.TERM_WEIGHT_TITLE =
    "weight = sign × coefficient. A coefficient other than 1 scales this " +
    "element's entry — a diametral factor of 2, an isothermal soak factor " +
    "1 + ΔT·α, or a stiffness split k / 1−k. It was computed in Python by the " +
    "archetype's loader and folded at that value; see the check's guidance.";

  VA.termTitle = function (term) {
    return term && typeof term.coefficient === "number" && term.coefficient !== 1
      ? VA.TERM_WEIGHT_TITLE
      : null;
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

  // What a verdict is a verdict ABOUT. The projection derives it from the
  // check's `complete` field (tolerance_stack/stack.py: VERDICT_SCOPES), so the
  // viewer never reads prose to decide — a stack that writes "incomplete" in
  // lower case, or "PARTIAL", or "budget only", is flagged exactly the same,
  // which is the whole reason the field exists
  // (ISSUE_20260805_check_result_has_no_complete_flag).
  //
  // Paired against that tuple by tests/test_js_python_vocabulary.py: one
  // definition in Python, one rendering here.
  VA.VERDICT_SCOPES = {
    joint: {
      chip: null,
      title: "Every term this check needs is in the model.",
    },
    budget: {
      chip: "BUDGET",
      title: "A term is missing from the model, so this number is a BUDGET for " +
        "the missing term, not a verdict on the joint. A `fail` here is true of " +
        "the model and false of the hardware.",
    },
  };

  VA.isBudgetScope = function (check) {
    return !!check && check.verdict_scope === "budget";
  };

  // What a check whose `verdict_scope` this viewer has never heard of must say.
  // Names the value, because the reader's next step is to grep for it — and the
  // fallback has to be LOUD for the same reason VA.unlabelledRuleText does:
  // falling through to silence renders an incomplete check as an ordinary one,
  // which is the exact misreading the field replaced the prose search to
  // prevent. The reachable case is not a new vocabulary word but a **stale
  // projection** — nothing rebuilds `data/projections/viewer/`, and one built
  // before 2026-08-13 carries no `verdict_scope` at all.
  VA.unlabelledVerdictScopeText = function (scope) {
    return "verdict_scope " + JSON.stringify(scope === undefined ? null : scope) +
      ", which this viewer has no branch for — whether this number is a verdict " +
      "on the joint or a BUDGET for a missing term is NOT shown here; read the " +
      "check in results.json, and check the projection is not stale";
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
    var budget = (stackProj.checks || []).filter(VA.isBudgetScope);
    if (budget.length) {
      chips.push({
        kind: "budget",
        text: budget.length + " budget-scope check" + (budget.length === 1 ? "" : "s"),
        title: VA.VERDICT_SCOPES.budget.title,
      });
    }
    // Where the checks came from is a review fact, not a footnote: a generated
    // term list cannot be read in the stack JSON, so a reviewer needs to know
    // before reading the numbers that the signs live in Python.
    if (stackProj.checks_source === "generated") {
      chips.push({
        kind: "generated",
        text: "checks GENERATED",
        title: "These checks are not authored in the stack file — the " +
          (stackProj.archetype || "archetype") + " loader builds them, with their " +
          "coefficients, from the stack's own block. The projection ran it in " +
          "Python; the viewer re-derives nothing.",
      });
    }
    var probes = (stackProj.checks || []).filter(function (c) { return c.sensitivity; });
    if (probes.length) {
      chips.push({
        kind: "sensitivity",
        text: probes.length + " sensitivity probe" + (probes.length === 1 ? "" : "s"),
        title: "NOT results. Each re-runs a check with an undocumented input " +
          "moved, so a reader can see how much of the answer rests on it.",
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
          identity_rule: null,
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

  // --- source_ref.export: WHICH BYTES the value was read off ---------------
  //
  // A citation says where on a page a number is written. The export block says
  // which FILE that page was in, and the two are not the same claim: filenames
  // get re-exported over, so a drawing number and a revision do not identify
  // bytes. Every live citation has carried this block since 2026-08-06 and the
  // viewer rendered none of it until 2026-08-12
  // (ISSUE_20260811_viewer_shows_nothing_for_source_ref_export) — which made the
  // asymmetry the issue was filed for: the crop hover said "sha256 VERIFIED",
  // but only for a citation whose crop RESOLVED, so a fact about the citation was
  // reachable only through a crop.

  // Every `status` a SourceExport can carry (tolerance_stack/stack.py), with the
  // sentence each earns. A table, not an if/else chain, for the reason
  // VA.CROP_RULES is one: an enumerated field needs a total function, because a
  // silent default cannot be told apart from a handled case by reading the code.
  // `loud` is the difference that matters on screen — `unestablished` is the
  // stack stating outright that the bytes behind this number cannot be
  // identified, and it must not look like a citation whose export is nailed down.
  VA.EXPORT_STATUSES = {
    established: {
      loud: false,
      headline: function (x) {
        return "export established: " + (VA.baseName(x.pdf) || "(names no file)");
      },
    },
    unestablished: {
      loud: true,
      headline: function () {
        return "EXPORT UNESTABLISHED — which file this value was read off cannot " +
          "be identified";
      },
    },
  };

  // A citation with no `export` key at all. Distinct from `unestablished`: that
  // one is a recorded finding with a reason, this one is a citation nobody has
  // been through yet. 26 of 48 live citations are here, and four of them are
  // `traced` — so this state is not a synonym for "untraced value" either.
  VA.NO_EXPORT_TEXT =
    "no export block — this citation names no exported file, so nothing here " +
    "identifies the bytes the value was read off";

  // --- identity_rule: the citation that names no export AND IS RIGHT NOT TO ---
  //
  // Every value `scripts/build_viewer_projection.py` can write into an element's
  // derived `identity_rule`, with the sentence it earns. A table for the same
  // reason VA.EXPORT_STATUSES and VA.CROP_RULES are tables: the field is
  // enumerated, so it gets a total function and a loud fallback.
  //
  // `none` above is the honest reading for 22 of the 26 live no-export citations
  // — a workbook or an assumed value has no exported PDF to name. It is the wrong
  // reading for the other four. `data/inbox/specs/` is append-only, so for a
  // document in it the FILENAME identifies the bytes and there is no export to
  // name; those four are `traced` and correctly so. Until 2026-08-13 the only
  // place that rule was statable was the crop entry (`resolved_by: "spec_pile"`),
  // one hop away from the row — so the row said `traced` and "nothing here
  // identifies the bytes" side by side, and a reader had no way to learn that the
  // pair is legitimate here and alarming everywhere else
  // (ISSUE_20260812_four_traced_spec_citations_carry_no_export_block).
  //
  // Not loud, on purpose: this states that the bytes ARE identified, by a rule
  // this repo argued for on 2026-08-06. It reads like an established export,
  // because that is what it is a sibling of — not an alarm.
  VA.IDENTITY_RULES = {
    spec_pile_filename: {
      headline: "Spec-pile document: identity by filename (append-only pile)",
      detail: "no export block is missing here — data/inbox/specs/ is " +
        "append-only, so nothing is renamed or written over and the filename " +
        "above IS the identity of the bytes",
    },
  };

  // An identity rule the viewer has never heard of. Same treatment as an
  // unlabelled export status, and for the same reason: falling through to
  // "no export block" would state the exact opposite of what the projection just
  // said, which is worse than saying nothing.
  VA.unlabelledIdentityRuleText = function (rule) {
    return "identity rule " + JSON.stringify(rule) + ", which this viewer has no " +
      "branch for — the projection says something identifies the bytes behind " +
      "this value and this page cannot say what; read the citation in the stack file";
  };

  // A status the viewer has never heard of. Names the value rather than
  // describing it, because the reader's next step is to grep for it.
  VA.unlabelledExportStatusText = function (status) {
    return "export status " + JSON.stringify(status === undefined ? null : status) +
      ", which this viewer has no branch for — whether the bytes behind this " +
      "value are identified is NOT shown here; read the citation in the stack file";
  };

  // Last path segment of a Windows or POSIX path. The export's `pdf` is absolute
  // and long ("[PRELIM 2026-AUG-3] 217755 A.1 PROPULSION ASSEMBLY, PROPELLER"
  // lives under a drawing-checker inbox), and the full path is rendered beside
  // it — this is the part a reader recognises.
  VA.baseName = function (path) {
    if (!path) return null;
    var parts = String(path).replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || null;
  };

  // Whether a sha256 is RECORDED, and its first 12 — never "verified". The
  // viewer cannot hash a file, so the only honest claim it can make about an
  // export's sha is that the stack wrote one down. The VERIFIED/NOT-VERIFIED
  // language belongs to the crop hover, where a script really did compare bytes
  // (VA.cropShaText).
  VA.exportShaText = function (exportBlock) {
    var sha = exportBlock && exportBlock.sha256;
    return sha
      ? "sha256 recorded (" + String(sha).slice(0, 12) + "…)"
      : "NO sha256 recorded — the file is identified by name only";
  };

  // The run ids out of `export.runs`, whose entries are `{run_id, ts}`. Runs are
  // CORROBORATION, never identity: one export can feed several drawing-checker
  // runs or none at all (15 of the 22 live established CITATIONS have none —
  // 6 of the 9 distinct exports they name), so an empty list is a fact about the
  // file's history and not a gap in the record.
  VA.exportRunIds = function (exportBlock) {
    return ((exportBlock && exportBlock.runs) || []).map(function (run) {
      return (run && run.run_id) || "(a run entry with no id)";
    });
  };

  // Which of an export's run ids this page can actually LINK, and to where.
  //
  // The export carries run IDS (`20260803_145243`). drawing-checker addresses a
  // run by its DIRECTORY name (`20260803_145243_217755_A.1_PROPULSION_...`),
  // which is the id plus the drawing — a prefix relationship, not the same
  // string, and build_viewer_crops.py resolves it by scanning the runs dir. So
  // the viewer cannot build a run URL out of an id, and it does not try: it
  // reuses the crop popover's link (VA.runUrl) for the one id the element's own
  // crop entry resolved through, and prints every other id as plain text.
  // Inventing a URL from a prefix would be the same class of mistake as a crop
  // of a guessed export.
  VA.exportRunLinks = function (config, exportBlock, cropEntry) {
    var url = (cropEntry && cropEntry.status === "resolved")
      ? VA.runUrl(config, cropEntry) : null;
    return VA.exportRunIds(exportBlock).map(function (runId) {
      return {
        run_id: runId,
        url: (url && cropEntry.run_id === runId) ? url : null,
      };
    });
  };

  // The view-model of one citation's export block: everything a renderer needs
  // and no DOM, so the node tier reads exactly what a reader sees.
  //   state    "established" | "unestablished" | "none" | "unlabelled"
  //            | "identity_rule" | "identity_unlabelled"
  //   loud     true when the state must be impossible to miss
  //   headline the one sentence
  //   why      the recorded reason, on `unestablished` only
  //   detail   the second sentence, on `identity_rule` only
  // `identityRule` is the element's DERIVED `identity_rule` (the projection's
  // elements[] row, not the authored citation) and is optional: a caller that has
  // no derived row — or a citation that carries an export — gets exactly the four
  // states it always did. It is read only in the no-export branch, because an
  // export block is what identifies the bytes wherever there is one, which is the
  // same precedence build_viewer_crops.resolve_pdf applies.
  // Returns null when there is no citation at all — VA.citationWhere already
  // says "no source_ref", and saying it twice buys nothing.
  VA.exportProvenance = function (sourceRef, identityRule) {
    if (!sourceRef) return null;
    var x = sourceRef.export;
    if (!x) {
      var identity = identityRule ? VA.IDENTITY_RULES[identityRule] : null;
      if (identityRule && !identity) {
        return { state: "identity_unlabelled", loud: true,
                 headline: VA.unlabelledIdentityRuleText(identityRule),
                 why: null, detail: null, pdf: null, pdfName: null,
                 shaText: null, runIds: [], note: null };
      }
      if (identity) {
        return { state: "identity_rule", loud: false, headline: identity.headline,
                 why: null, detail: identity.detail, pdf: null, pdfName: null,
                 shaText: null, runIds: [], note: null };
      }
      return { state: "none", loud: false, headline: VA.NO_EXPORT_TEXT,
               why: null, detail: null, pdf: null, pdfName: null, shaText: null,
               runIds: [], note: null };
    }
    var rule = VA.EXPORT_STATUSES[x.status];
    var established = x.status === "established";
    return {
      state: rule ? x.status : "unlabelled",
      loud: rule ? rule.loud : true,
      headline: rule ? rule.headline(x) : VA.unlabelledExportStatusText(x.status),
      why: x.why || null,
      detail: null,
      pdf: x.pdf || null,
      pdfName: VA.baseName(x.pdf),
      // Only where a sha is part of the claim. An unestablished export names no
      // file and carries no sha by construction (SourceExport raises if it
      // does), so "NO sha256 recorded" there would read as a second, separate
      // failing when it is the same one.
      shaText: established ? VA.exportShaText(x) : null,
      runIds: VA.exportRunIds(x),
      note: x.note || null,
    };
  };

  // The one-line text form, for a hover and for a test that wants to read what
  // the panel says without walking the DOM.
  VA.exportProvenanceLine = function (sourceRef, identityRule) {
    var p = VA.exportProvenance(sourceRef, identityRule);
    if (!p) return "";
    var bits = [p.headline];
    if (p.why) bits.push("why: " + p.why);
    if (p.detail) bits.push(p.detail);
    if (p.shaText) bits.push(p.shaText);
    if (p.state === "established") {
      bits.push(p.runIds.length
        ? "drawing-checker runs: " + p.runIds.join(", ")
        : "no drawing-checker run has consumed this export");
    }
    return bits.join(" · ");
  };

  // --- material provenance: the sourcing OF A NUMBER -----------------------

  // Where a material entry's CTE actually comes from
  // (tolerance_stack/materials.py). Enumerated, so it gets a table for the same
  // reason `export.status` does — and this one had NO viewer branch at all until
  // 2026-08-12, which meant `library` rendered identically to `inline` even
  // though one says the number in front of you is a cross-check and the other
  // says it is the source.
  // `loud` is a function of the ENTRY, not a constant, for one state:
  // `library` with no `library_ref` is a self-contradiction — the entry says the
  // number resolves through a projection and then names none — and rendering a
  // contradiction quietly is the defect class this whole surface exists against.
  VA.VALUES_STATUSES = {
    inline: {
      loud: function () { return false; },
      text: function () {
        return "CTE transcribed INLINE in materials.json — the number above is " +
          "the record, and its citation is the one beside it";
      },
    },
    library: {
      loud: function (entry) { return !entry.library_ref; },
      text: function (entry) {
        return entry.library_ref
          ? "CTE resolved through the spec library: " + entry.library_ref +
            " — the number above is a CROSS-CHECK of what that projection says, " +
            "not the record"
          : "values_status says this CTE resolves through the spec library and " +
            "the entry names NO library_ref — there is nothing for it to resolve " +
            "through, so what the number above is a record of is unstated";
      },
    },
    not_transcribed: {
      loud: function () { return true; },
      text: function () {
        return "CTE NOT TRANSCRIBED — nobody has read this number off a source; " +
          "a number in the column above is a placeholder, and since 2026-08-12 " +
          "the schema lets such an entry state no CTE at all";
      },
    },
  };

  VA.unlabelledValuesStatusText = function (status) {
    return "values_status " + JSON.stringify(status === undefined ? null : status) +
      ", which this viewer has no branch for — whether this CTE is a " +
      "transcription, a library cross-check or nothing at all is NOT shown here";
  };

  // The view-model of a material entry's value provenance.
  //   state      a VA.VALUES_STATUSES key, or "unlabelled"
  //   libraryRef the projection this number resolves through, when there is one.
  //              Reported independently of `state`, because the schema lets an
  //              `inline` entry carry one too (thermal.py validates the pair no
  //              further) — and a field the viewer only reads under one status is
  //              a field that gets dropped under the others, which is the bug
  //              this function was written to end.
  VA.valuesProvenance = function (entry) {
    if (!entry) return null;
    var rule = VA.VALUES_STATUSES[entry.values_status];
    return {
      state: rule ? entry.values_status : "unlabelled",
      loud: rule ? rule.loud(entry) : true,
      text: rule ? rule.text(entry) : VA.unlabelledValuesStatusText(entry.values_status),
      libraryRef: entry.library_ref || null,
    };
  };

  // The soak ranges a scalar CTE is APPLIED over, printed beside the range the
  // source quoted it for. A mean CTE quoted over 20…100 and applied over 20…−20
  // is the quiet way a thermal answer goes wrong — so both are rendered and
  // NEITHER is compared: deciding whether one covers the other is arithmetic,
  // and arithmetic happens in Python (see the header of this file).
  VA.appliedOverText = function (ranges) {
    var list = ranges || [];
    if (!list.length) return null;
    return "applied over " + list.map(function (pair) {
      return (pair || []).map(VA.fmt).join(" … ");
    }).join(", ") + " °C";
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
  // the crop came from the spec pile, or from a `source_ref.export` that names
  // no run: there is no run to link to, and inventing a URL would be worse than
  // showing the file path.
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

  // Whether the bytes that were cropped are the bytes the citation names. Three
  // states, and collapsing any two of them is the bug this file had: a crop of a
  // *guessed* export looks perfectly correct on screen, so "verified" is the one
  // fact a hover cannot leave out. `false` and `null` are different answers —
  // `false` is a rule that had a sha to check and could not, `null` is a rule
  // with no sha available at all (the spec pile is append-only, so a filename is
  // its identity).
  VA.cropShaText = function (cropEntry) {
    if (cropEntry.sha256_verified === true) return "sha256 VERIFIED";
    if (cropEntry.sha256_verified === false) return "sha256 NOT verified";
    return "no sha256 to verify";
  };

  // Every value `scripts/build_viewer_crops.py` can write into `resolved_by`,
  // with the sentence each one earns. A rule missing from this table renders as
  // the loud unlabelled text below rather than falling through to silence —
  // silence is what let all 24 `source_ref_export` crops sit unexplained from
  // 2026-08-06 to 2026-08-10
  // (ISSUE_20260806_viewer_does_not_label_the_source_ref_export_rule).
  //
  // Two rules that USED to be here and their fate, so the next reader does not
  // reinstate them:
  //   * `provenance.sources_used` — deleted. The rule was removed from the crop
  //     script on 2026-08-06 (it regexed a PDF path out of a free-text
  //     sentence), so no entry can ever carry it again. A branch for an
  //     impossible value reads as "this case is handled".
  //   * `joint_export_run` — KEPT, marked legacy. Still reachable in principle:
  //     a citation with no `source_ref.export`, of kind drawing/parts_list,
  //     whose `document` equals the stack's `joint.assembly_drawing`, in a stack
  //     whose `joint.assembly_export` names a drawing-checker run id. No stack
  //     in the repo is shaped that way any more, but one written before
  //     2026-08-06 is, and the script still resolves it.
  VA.CROP_RULES = {
    source_ref_export: {
      legacy: false,
      text: function (e) {
        return "read from the export this citation names, " +
          (e.pdf_name || "(the entry names no file)") + " — " + VA.cropShaText(e);
      },
    },
    spec_pile: {
      legacy: false,
      text: function (e) {
        return "from data/inbox/specs/ by filename (" +
          (e.pdf_name || "(the entry names no file)") + ") — " + VA.cropShaText(e);
      },
    },
    joint_export_run: {
      legacy: true,
      text: function (e) {
        return "LEGACY RULE: export pinned by the joint block, not by this " +
          "citation (drawing-checker run " + (e.run_id || e.run_dir || "?") +
          ") — " + VA.cropShaText(e);
      },
    },
  };

  // What a crop resolved by a rule this viewer has never heard of must say. It
  // names the value rather than describing it, because the reader's next step is
  // to grep the crop script for it.
  VA.unlabelledRuleText = function (resolvedBy) {
    return "resolved by " + JSON.stringify(resolvedBy === undefined ? null : resolvedBy) +
      ", a rule this viewer has no label for — how much to trust this " +
      "placement is NOT shown here; read the entry in crops.json";
  };

  // The `resolved_by` values in a crops index that VA.CROP_RULES cannot explain.
  // Reads `summary.by_resolved_by` (the rollup the crop script computes) and
  // falls back to scanning the entries when an older crops.json has no rollup.
  VA.unlabelledCropRules = function (crops) {
    var seen = {};
    var byRule = (crops && crops.summary && crops.summary.by_resolved_by) || null;
    if (byRule) {
      Object.keys(byRule).forEach(function (rule) { seen[rule] = true; });
    } else {
      var byStack = (crops && crops.by_stack) || {};
      Object.keys(byStack).forEach(function (stackId) {
        Object.keys(byStack[stackId]).forEach(function (elementId) {
          var entry = byStack[stackId][elementId];
          if (entry && entry.status === "resolved") {
            seen[String(entry.resolved_by)] = true;
          }
        });
      });
    }
    return Object.keys(seen).filter(function (rule) {
      return !VA.CROP_RULES[rule];
    }).sort();
  };

  // One line saying how much to trust a crop's placement.
  VA.cropProvenanceLine = function (cropEntry) {
    if (!cropEntry || cropEntry.status !== "resolved") return "";
    var bits = [];
    var rule = VA.CROP_RULES[cropEntry.resolved_by];
    bits.push(rule
      ? rule.text(cropEntry)
      : VA.unlabelledRuleText(cropEntry.resolved_by));
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

  // The sha256 half of the crop scoreboard, from `summary.sha256_verified` —
  // the rollup the crop script computes. It sits immediately beside the resolved
  // count on purpose: "26 resolved" on its own is the number that got read as 26
  // trustworthy crops when only 22 of them had been checked against anything.
  // null when the rollup is absent (a crops.json built before 2026-08-06).
  VA.shaCountsText = function (summary) {
    var counts = (summary || {}).sha256_verified;
    if (!counts) return null;
    var bits = [(counts["true"] || 0) + " sha256-verified"];
    if (counts["false"]) bits.push(counts["false"] + " NOT VERIFIED");
    if (counts.unverified) bits.push(counts.unverified + " with no sha to check");
    return bits.join(", ");
  };

  // Which rule resolved them, from `summary.by_resolved_by`, so a rise in the
  // resolved count is answerable — a count that rose because a rule got looser
  // is a regression, and the rule names are what show it. Unlabelled rules are
  // called out here too: this page cannot explain their crops in a hover, and
  // that is a fact about the viewer the reader should not have to discover by
  // hovering.
  VA.cropRulesLine = function (crops) {
    var byRule = (crops && crops.summary && crops.summary.by_resolved_by) || null;
    if (!byRule) return null;
    var unlabelled = VA.unlabelledCropRules(crops);
    // `resolution_summary()` writes `by_resolved_by: {}` when nothing resolved,
    // and a bare "crops by rule:" with nothing after it reads as a rendering
    // fault. The banner's "0 resolved" already says it.
    if (!Object.keys(byRule).length) return null;
    var bits = Object.keys(byRule).sort().map(function (rule) {
      return rule + " " + byRule[rule] +
        (VA.CROP_RULES[rule]
          ? (VA.CROP_RULES[rule].legacy ? " (LEGACY rule)" : "")
          : " (NO LABEL)");
    });
    var line = "crops by rule: " + bits.join(" · ");
    if (unlabelled.length) {
      line += " — this viewer has no label for " + unlabelled.join(", ") +
        ", so those hovers cannot say how much to trust the crop. Teach " +
        "VA.CROP_RULES the rule.";
    }
    return line;
  };

  // The banner's freshness line. Purely descriptive — the viewer does not try
  // to decide whether a projection is stale, it shows when each was built and
  // lets the reader judge.
  VA.builtLine = function (results, crops) {
    var parts = [];
    parts.push(results && results.built_at
      ? "results built " + results.built_at
      : "results NOT BUILT");
    if (crops && crops.built_at) {
      var summary = crops.summary || {};
      var sha = VA.shaCountsText(summary);
      parts.push("crops built " + crops.built_at +
        " (" + (summary.resolved || 0) + " resolved" +
        (sha ? " — " + sha : "") + "; " +
        (summary.unresolvable || 0) + " unresolvable)");
    } else {
      parts.push("crops NOT BUILT");
    }
    return parts.join(" · ");
  };

  // --- provenance: WHICH TREE built what you are looking at ----------------
  //
  // `data/projections/viewer/` is one directory shared by every live worktree,
  // so a projection can perfectly well have been built from a branch that
  // predates the labels it shows — on 2026-08-07 one did, for six hours, while
  // this banner reported `built_at` and nothing else
  // (ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection,
  // occurrence 2). `scripts/projection_provenance.py` now stamps branch, HEAD
  // sha and the resolved stacks-dir into both files; these two functions are
  // what put that in front of a reader.

  VA.shortSha = function (sha) {
    return sha ? String(sha).slice(0, 12) : "?";
  };

  // One line per projection: which branch, which commit, which stacks-dir.
  VA.provenanceLine = function (label, projection) {
    var p = projection && projection.provenance;
    if (!projection) return null;
    if (!p) {
      return label + " built by a script that predates provenance stamping — " +
        "which tree it came from is unknowable; rebuild it";
    }
    var bits = [label + " ← " + (p.branch || "(detached)") + " @ " + VA.shortSha(p.head_sha)];
    if (p.dirty) bits.push("tree was DIRTY");
    if (p.behind_trunk) {
      bits.push(p.behind_trunk + " commit(s) behind " + (p.trunk || "trunk") +
        " when built");
    }
    if (p.stacks_dir) bits.push(p.stacks_dir);
    return bits.join(" · ");
  };

  // What the banner must not stay quiet about. The viewer computes nothing and
  // cannot run git, so it never guesses at staleness — it reports only what the
  // two stamps *prove*, and the strongest of those is the pair disagreeing:
  // results.json and crops.json are written by different scripts, each
  // preserving the other's file, so the pair genuinely can describe two
  // different trees. That is a fact about the data in front of it, not an
  // inference about the repo.
  VA.provenanceAlarms = function (results, crops) {
    var alarms = [];
    var rp = results && results.provenance;
    var cp = crops && crops.provenance;

    if (results && !rp) alarms.push("results.json carries no provenance stamp");
    if (crops && !cp) alarms.push("crops.json carries no provenance stamp");

    if (rp && cp && rp.head_sha && cp.head_sha && rp.head_sha !== cp.head_sha) {
      alarms.push(
        "results and crops were built from DIFFERENT trees — results from " +
        (rp.branch || "(detached)") + " @ " + VA.shortSha(rp.head_sha) +
        ", crops from " + (cp.branch || "(detached)") + " @ " + VA.shortSha(cp.head_sha) +
        ". They may not describe the same stacks. Two different commits is as far " +
        "as this page can get: it cannot run git, so it cannot tell the ordinary " +
        "case (crops built from an ancestor, still current) from two divergent " +
        "trees. Rebuild both from the newest tree to settle it.");
    }

    // Stamped at build time, so it is a statement about then, not now — which
    // is exactly the honest form: "this was already out of date when it was
    // built" is provable, "it is out of date now" is not, from a static page.
    [["results", rp], ["crops", cp]].forEach(function (pair) {
      var p = pair[1];
      if (p && p.behind_trunk) {
        alarms.push(pair[0] + " was built from a tree " + p.behind_trunk +
          " commit(s) behind " + (p.trunk || "trunk") + " — it may show labels " +
          (p.trunk || "trunk") + " has already moved past");
      }
      if (p && p.dirty) {
        alarms.push(pair[0] + " was built from a tree with uncommitted changes, " +
          "so " + VA.shortSha(p.head_sha) + " does not identify the code that ran");
      }
    });
    return alarms;
  };
})(window.ViewerApp = window.ViewerApp || {});
