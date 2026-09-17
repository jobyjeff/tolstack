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

  // The confidences that mean *nothing readable stands behind this number*: it
  // traces to no drawing or datasheet, or carries no citation at all. The loud
  // pair, on purpose -- Jeff reviews sourcing as much as arithmetic, and an
  // untraced value must be impossible to miss.
  //
  // This pair decides TWO things that have to agree, and until 2026-09-16 each
  // side spelled it itself (ISSUE_20260915_the_loud_gap_confidence_pair_has_
  // three_homes_and_no_pairing): which edges become `unverified_value` rows in
  // a topology's "what is missing" panel, chosen in Python, and which grid rows
  // and studies wear the `unverified` badge and offer the annotate link, chosen
  // here. Drift between them means the panel lists rows the grid does not badge
  // -- on the one page whose whole job is to say what cannot be trusted. It is
  // a TABLE now rather than two literals inside `needsAnnotation` for exactly
  // that reason: a vocabulary spelled in a function body cannot be paired, and
  // `tests/test_js_python_vocabulary.py` now pairs this one word for word
  // against `scripts/build_topology_projection.py`'s UNVERIFIED_CONFIDENCES.
  // `no_source_ref` has ZERO live instances, so the pairing is the only thing
  // that could ever catch a drift in that half.
  VA.UNVERIFIED_CONFIDENCES = ["untraced", "no_source_ref"];

  // Class suffix for the colour system.
  VA.confidenceClass = function (confidence) {
    return "conf--" + (VA.CONFIDENCES.indexOf(confidence) === -1 ? "unknown" : confidence);
  };

  // Deep link OUT to apps/annotate/ (handoff annotate_deep_link_and_part_filter,
  // deliverable 4): exactly the rows this repo's "record a gap" rule is about,
  // and exactly the ones a click into the 3D tool can help close by resolving
  // WHICH feature the row means.
  VA.needsAnnotation = function (confidence) {
    return VA.UNVERIFIED_CONFIDENCES.indexOf(confidence) !== -1;
  };

  // --- which worksheet a stack or a topology is showing, and HOW it was found
  //
  // `worksheet_source`, written by both viewer builders (`worksheet_for` in
  // scripts/build_viewer_projection.py and in scripts/build_topology_projection.py
  // -- the same two rules, deliberately not shared because each builder is
  // stdlib-only). Three values, and the third is `null`: a stack with no
  // worksheet at all has no source for one either.
  //
  // A vocabulary this page branches on is a module-level constant, never an
  // inline literal (CLAUDE.md) -- and until 2026-09-16 this one's only named
  // copy lived inside apps/viewer/tests.js, read by two guard rows and
  // invisible to the branch itself (ISSUE_20260915_worksheet_source_vocabulary_
  // has_no_va_constant).
  //
  // A TABLE carrying each value's on-screen note, not a list plus an if: the
  // reason VA.CROP_RULES is one. An enumerated field needs a total function,
  // because a silent default cannot be told apart from a handled case by
  // reading the code -- and here only ONE of the three values has anything to
  // say, which is exactly the shape that reads as an oversight when it is
  // spelled as an `if`. `"null"` is quoted because JS coerces a property
  // lookup's key to a string, so `VA.WORKSHEET_SOURCES[null]` finds it and the
  // renderer needs no null check; `null` is also literally what the projection
  // JSON carries in that field.
  VA.WORKSHEET_SOURCES = {
    declared: {
      // The only value a reader can be surprised by: the sheet's name will not
      // match the document they opened, and this says why rather than leaving
      // them to suspect the wrong sheet.
      note: "declared by this file itself (provenance.worksheet), not matched " +
        "by name — one worksheet may cover several stacks or topologies",
    },
    // Matched by the X -> WORKSHEET_X naming convention. Silent, correctly: a
    // sheet whose name matches the document needs no explanation.
    by_name: { note: null },
    // No worksheet at all, so no source for one either. The pane says that much
    // above this line and has nothing to add here.
    "null": { note: null },
  };

  // Pure string-building (no URL API -- this file is also loaded into the
  // node-vm fast tier, which has no browser URL global). Relative, not an
  // absolute config.js URL: the toolbar's own "Annotate -> " link
  // (annotation_surface_mvp, 2026-09-06, VA.renderTopoToolbar) already
  // pointed at `../annotate/index.html` on the assumption both apps are
  // served as siblings under one static root (apps/viewer is launched by
  // file:// double-click, per its README, so there is no "the viewer's own
  // origin" to build an absolute link from anyway) -- this generalises that
  // one link-building rule to carry edge/isolate too, rather than forking a
  // second one. `topologyId` is the only always-required param; a toolbar
  // link (whole study, no edge) and a detail-pane link (one edge, maybe an
  // owner part) are both this same function.
  VA.annotateLink = function (params) {
    var query = ["topology=" + encodeURIComponent(params.topologyId)];
    if (params.edgeId) query.push("edge=" + encodeURIComponent(params.edgeId));
    if (params.studyId) query.push("study=" + encodeURIComponent(params.studyId));
    if (params.part) query.push("isolate=" + encodeURIComponent(params.part));
    // The per-study 3D trace (handoff study_3d_flyout): trace=1 makes the
    // annotator boot its `trace` verb over topology+study instead of the
    // goto/isolate pair.
    if (params.trace) query.push("trace=1");
    return "../annotate/index.html?" + query.join("&");
  };

  // The same launch, as command-layer calls (handoff study_3d_flyout): once
  // the flyout iframe is already booted, a later launch posts these to
  // AA.exec over postMessage instead of reloading -- the identical vocabulary
  // the URL params boot with, never a parallel path. Mirrors annotateLink
  // param for param -- a HAND-mirror: tests.js pins each side over the same
  // param shapes, but nothing derives one from the other, so a param added to
  // annotateLink alone fails no test. Extend both, and both tests, together.
  VA.annotateExecCommands = function (params) {
    if (params.trace) {
      return [["trace", params.topologyId, params.studyId]];
    }
    var commands = [["goto", params.topologyId, params.edgeId || "", params.studyId || ""]];
    if (params.part) commands.push(["isolate", params.part]);
    return commands;
  };

  // Probe whether ../annotate/ is served beside this page (handoff
  // study_3d_flyout, feature 3): the flyout is same-origin iframe + postMessage
  // and only works where the two apps are siblings under one served root --
  // drawing-checker's mounts, or any repo-root static server. file:// has no
  // origin to share (and fetch() cannot probe it), so it degrades immediately;
  // anything else is measured, never assumed, the same posture storage/http.js
  // takes toward its data mounts. The content-type check is the catch-all trap
  // that adapter's own probe survives: a server answering 200 to every path
  // must still say text/html here or the iframe would boot into nonsense.
  //
  // `fetchImpl` is injected (bound! -- native fetch brand-checks its receiver,
  // the viewer_http_transport lesson) so the fast tier can exercise every
  // branch; a null fetchImpl reads as "cannot probe", not an error.
  VA.probeAnnotateMount = function (fetchImpl, protocol) {
    if (protocol === "file:" || typeof fetchImpl !== "function") {
      return Promise.resolve(false);
    }
    return fetchImpl("../annotate/index.html", { method: "HEAD" }).then(function (res) {
      if (!res || !res.ok) return false;
      var type = (res.headers && res.headers.get && res.headers.get("content-type")) || "";
      return type.indexOf("text/html") !== -1;
    }).catch(function () { return false; });
  };

  // What a verdict MEANS, in the words a reader who has never opened this repo
  // would use. The verdict word alone answers "did it pass"; `says` answers the
  // question underneath it, which is the one a reviewer actually has ("can I
  // build this?"). One table rather than three sentences scattered through the
  // views, and a total function with a loud fallback for the same reason
  // VA.VERDICT_SCOPES is one: a fourth verdict must gain a branch on screen, not
  // arrive silently.
  //
  // Paired against tolerance_stack/stack.py's VERDICTS by
  // tests/test_js_python_vocabulary.py: one definition in Python, one rendering
  // here.
  VA.VERDICTS = {
    pass: {
      says: "every build clears it",
      title: "The worst case still satisfies the criterion, so no build of " +
        "this joint violates it.",
    },
    marginal: {
      says: "clears on average, not in the worst case",
      title: "Nominal satisfies the criterion and the worst case does not. No " +
        "single build is guaranteed — this joint needs selection at assembly, " +
        "not a clean analytical answer.",
    },
    fail: {
      says: "does not clear, even on average",
      title: "Neither the worst case nor nominal satisfies the criterion.",
    },
  };

  VA.verdictClass = function (verdict) {
    return "verdict--" + (VA.VERDICTS[verdict] ? verdict : "unknown");
  };

  // What a verdict this viewer has never heard of must say. Names the value, and
  // is LOUD, for the reason VA.unlabelledVerdictScopeText is: falling through to
  // silence would render an unknown verdict as though the page had considered it.
  VA.unlabelledVerdictText = function (verdict) {
    return "verdict " + JSON.stringify(verdict === undefined ? null : verdict) +
      ", which this viewer has no branch for — what it means is NOT shown here";
  };

  // The worst verdict among a study's checks, weakest wins — the same rule
  // VA.studyWorstConfidence applies to citations, and for the same reason: a
  // study with one failing check has a failing answer, whatever the other one
  // says. A lookup over an enumerated field in the order Python ranked it
  // (VERDICTS, worst last); nothing is compared, added or re-derived.
  VA.worstVerdict = function (checks) {
    var words = Object.keys(VA.VERDICTS);
    var worst = null;
    (checks || []).forEach(function (check) {
      var rank = words.indexOf(check && check.verdict);
      if (rank === -1) return;
      if (worst === null || rank > words.indexOf(worst)) worst = check.verdict;
    });
    return worst;
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
    // One fact, one vocabulary. This chip said "1 zero-width band" while the DAG
    // page two clicks away said "no tolerance recorded" about the same element
    // (ISSUE_20260915_the_stack_view_still_says_zero_width_band_...), so the
    // words are read out of VA.ATTENTION here and on all four of the other
    // surfaces that state it. `zero_width_count` keeps its name: it is a
    // projection field, not something a reader sees.
    if (stackProj.zero_width_count) {
      chips.push({
        kind: "zero-width",
        text: stackProj.zero_width_count +
          (stackProj.zero_width_count === 1 ? " element with " : " elements with ") +
          VA.ATTENTION.no_tolerance.text,
        title: VA.ATTENTION.no_tolerance.title,
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

  // The label this line puts in front of a revision, and the test for when the
  // value has already said it. A revision is TRANSCRIBED from a title block, and
  // a title block that reads "Rev 4" gets transcribed as "Rev 4" — so the label
  // and the value collide, and the line prints `rev Rev 4`
  // (ISSUE_20260915_the_citation_where_line_prints_rev_rev_4_...). The rule is
  // general and it is not about this one document: never prefix a label a value
  // already carries. Case-insensitive, and anchored at the START of the value,
  // because "sheet 2 rev 2" further in is a clause of the note, not the label.
  VA.REVISION_LABEL = "rev ";
  VA.revisionText = function (revision) {
    var text = String(revision);
    return /^rev\b/i.test(text) ? text : VA.REVISION_LABEL + text;
  };

  // The first sentence of a record's own prose, for a surface that shows a
  // short description in the open and the whole note behind a fold
  // (views/cards.js, viewer_hover_deslop_and_banner_purge 2026-09-16).
  //
  // A PREFIX of the input or the whole of the input, never anything else:
  // nothing is reworded, recased, reordered or summarised, the same discipline
  // VA.fieldLabel and VA.elementDisplayLabel keep, and the full text is always
  // one click away in the same card. This is a placement decision, not the
  // viewer editing the record.
  //
  // A sentence ends at `.`/`!`/`?` followed by whitespace and a capital. Both
  // halves of that are load-bearing on the live notes, which are full of
  // leading-decimal dimensions: ".1900 in ID X .1875 in long" has two periods
  // in it and neither is followed by a space, so a split on `.` alone would
  // return "Plain bushing, aluminium bronze, " and call it a description. A
  // note with no such break is returned whole — better a long lead than a
  // guess at where a thought ended.
  VA.LEAD_SENTENCE_RE = /^[\s\S]*?[.!?](?=\s+["'(\[]?[A-Z])/;
  VA.leadSentence = function (text) {
    if (text === null || text === undefined) return "";
    var whole = String(text).trim();
    var match = whole.match(VA.LEAD_SENTENCE_RE);
    return match ? match[0] : whole;
  };

  // A schema key, as a label a reader can read: `assembly_drawing` -> "assembly
  // drawing". The free-form blocks on this page (a stack's or a topology's
  // `joint`) are authored as JSON and rendered key by key, because nothing
  // knows in advance what they contain -- so the key IS the label, and until
  // 2026-09-16 it was printed raw, which put schema jargon in a definition list
  // a reader is meant to skim.
  //
  // Separator only. Nothing is reworded, recased or reordered: every character
  // of the output is a character of the input in the input's order, minus the
  // underscores, which is the same discipline VA.elementDisplayLabel keeps. A
  // transform that guessed at expansions ("rev" -> "revision") would be the
  // viewer editing the record.
  VA.fieldLabel = function (key) {
    return String(key).split("_").join(" ");
  };

  // "sheet 4 · DETAIL B · zone H3" — the same shape drawing-checker's own
  // "Where" column uses, so a citation reads the same in both tools.
  //
  // With no citation at all it says so in a reader's words, not the schema's:
  // this string is rendered on the element pane and the citation card, and
  // `source_ref` is a field name a reader cannot act on (the same ban
  // `apps/viewer/tests.js`'s BANNED_IN_RENDERED_TEXT keeps). "no citation" is
  // the wording VA.CONFIDENCE_LABEL.no_source_ref already uses on the chip
  // beside it.
  // `alreadySaid` is the hover cards' (viewer_hover_deslop_and_banner_purge,
  // 2026-09-16): text the surface has ALREADY printed on the line above this
  // one. Where it carries the document's own name, the document is dropped
  // from here and the line says only what is new -- the revision, the sheet,
  // the view, the zone.
  //
  // This is Jeff's "a part number is never printed on two consecutive lines",
  // and four live edge cards needed it: `pitch_link_to_pitch_plate |
  // bushing_214820` reads "a dimension of 214820-002 plain bushing" and then
  // "cited at: 214820-002 · sheet 4" directly beneath. Most parts in this repo
  // are NAMED after the drawing they are cited from, so the collision is the
  // rule and not the exception. The same rule VA.componentDrawingText applies
  // to a part's own drawing line, and it is a rule about LABELS, not about any
  // one document: never prefix or repeat something the value already carries.
  //
  // A citation with nothing else to say still says the document -- dropping it
  // would leave the line empty, and "no location" is a different claim.
  VA.citationWhere = function (sourceRef, alreadySaid) {
    if (!sourceRef) return "no citation";
    var parts = [];
    var document = sourceRef.document ? String(sourceRef.document) : null;
    var repeated = !!document && !!alreadySaid &&
      String(alreadySaid).indexOf(document) !== -1;
    if (document && !repeated) parts.push(document);
    if (sourceRef.revision) parts.push(VA.revisionText(sourceRef.revision));
    if (sourceRef.sheet !== null && sourceRef.sheet !== undefined) {
      parts.push("sheet " + sourceRef.sheet);
    }
    if (sourceRef.view) parts.push(String(sourceRef.view));
    if (sourceRef.zone) parts.push("zone " + sourceRef.zone);
    if (sourceRef.cell) parts.push("cell " + sourceRef.cell);
    return parts.join(" · ") || document || "no location";
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
        return "Read from " + (VA.baseName(x.pdf) || "(the citation names no file)");
      },
    },
    unestablished: {
      loud: true,
      headline: function () {
        return "FILE NOT IDENTIFIED — which file this value was read from " +
          "cannot be established";
      },
    },
  };

  // A citation with no `export` key at all. Distinct from `unestablished`: that
  // one is a recorded finding with a reason, this one is a citation nobody has
  // been through yet. 26 of 48 live citations are here, and four of them are
  // `traced` — so this state is not a synonym for "untraced value" either.
  VA.NO_EXPORT_TEXT =
    "This citation names no file, so nothing here says which copy of the " +
    "document the value was read from.";

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
      headline: "A standard-spec document, identified by its filename",
      detail: "nothing is missing here: the standard-spec library is only " +
        "ever added to — never renamed, never written over — so the filename " +
        "above IS which file this was read from",
    },
  };

  // The row chip's wording, per loud export/identity state. A table because
  // there are three loud states and the third is not about export status at
  // all — calling an unknown IDENTITY RULE "EXPORT STATUS UNKNOWN" would send a
  // reader looking for a field the citation does not have. Shared by
  // views/stack.js (the compact row's chip, the only export fact still legible
  // there) and views/detail.js (the full block, moved out of the row).
  VA.EXPORT_CHIP_TEXT = {
    unestablished: "FILE NOT IDENTIFIED",
    unlabelled: "FILE STATUS UNKNOWN",
    identity_unlabelled: "SOURCE RULE UNKNOWN",
  };

  // A status the chip table has no wording for. Its own constant rather than an
  // `||` literal at the one call site, the same posture every other total
  // lookup on this surface takes.
  VA.EXPORT_CHIP_FALLBACK = "EXPORT STATUS UNKNOWN";

  // --- one alert badge per row (flyout_resize_annotator_filter_and_deselect,
  // deliverable 5) -----------------------------------------------------------
  //
  // Jeff, 2026-09-16: "Left side menu is now impressively 'loud'… roll all the
  // alert badges into one single alert badge (something like a triangle ! icon).
  // Mouse over the icon has a popup that lists out the actual alerts. Styling
  // for the alert text themselves can then be a bit less obnoxious/
  // overwhelming, especially the ones in the source column that are always
  // visible."
  //
  // The words do not change -- they are still VA.ATTENTION's and
  // VA.EXPORT_CHIP_TEXT's, read here, never restated -- and nothing is deleted:
  // this decides WHICH of a row's chips are alerts, so the row can carry one
  // icon and the popup can carry the argument. What stays on the row beside it
  // is the confidence chip, the kind chip and the material chip, which are not
  // alerts: they are the row's primary provenance signal, and one of them is
  // already the citation card's own hover trigger.
  VA.ALERT_ICON = "⚠";

  // What ONE elements-table row has to admit about itself, in severity order:
  // a value whose band nobody wrote down, then bytes this viewer cannot
  // identify. A list because the badge showing it is one badge however many
  // there are -- a row with none renders nothing at all.
  VA.rowAlerts = function (element, derived) {
    var alerts = [];
    if (derived && derived.zero_width) {
      alerts.push({
        kind: "zero-width",
        text: VA.ATTENTION.no_tolerance.text,
        why: VA.ATTENTION.no_tolerance.title,
      });
    }
    var exportView = VA.exportProvenance(element && element.source_ref,
      derived && derived.identity_rule);
    if (exportView && exportView.loud) {
      alerts.push({
        kind: "export-" + exportView.state,
        text: VA.EXPORT_CHIP_TEXT[exportView.state] || VA.EXPORT_CHIP_FALLBACK,
        why: exportView.headline + (exportView.why ? " — " + exportView.why : ""),
      });
    }
    return alerts;
  };

  // The hover card behind that badge. A card model like every other one on this
  // page (VA.citationCard, VA.edgeCard, VA.componentCard), so the badge reuses
  // the whole popover apparatus the page already has -- one node, one
  // placement, one close story, the hover-intent corridor included -- instead
  // of growing a second kind of popup beside it.
  VA.alertsCard = function (title, alerts) {
    return { kind: "alerts", title: title, alerts: alerts || [] };
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

  // Whether a checksum is RECORDED — never "verified". The viewer cannot hash
  // a file, so the only honest claim it can make is that the stack wrote one
  // down. The VERIFIED/NOT-VERIFIED language belongs to the crop provenance,
  // where a script really did compare bytes (VA.cropShaText).
  //
  // It said "sha256 recorded (a1b2c3d4e5f6…)" until 2026-09-15, twelve hex
  // digits included. Jeff's standing web-copy rule retired both halves: the
  // algorithm's name is an internal detail, and a truncated hash is not
  // something a reader can do anything with. What a reader needs is the one
  // fact — this file is pinned to its exact bytes, or it is identified by name
  // only — and the digest itself is in the citation in the stack file for
  // anyone checking it.
  VA.exportShaText = function (exportBlock) {
    var sha = exportBlock && exportBlock.sha256;
    return sha
      ? "pinned to this exact file, by checksum"
      : "NO checksum recorded — the file is identified by name only";
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

  // Month names, for the one date this page formats itself. A table rather than
  // toLocaleDateString: the node fast tier and a browser must agree character
  // for character, and a locale-dependent string cannot be pinned by a test.
  VA.MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // "2026-07-30" -> "30 Jul 2026". Read off the front of the string rather than
  // through Date: a recorded timestamp is a fact about a day, and parsing it
  // into a Date moves that day across a timezone boundary for half the world.
  // Anything that is not a leading ISO date comes back null, never a guess.
  VA.isoDateText = function (value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    if (!match) return null;
    var month = VA.MONTH_NAMES[Number(match[2]) - 1];
    return month ? Number(match[3]) + " " + month + " " + match[1] : null;
  };

  // What a reader can act on about an export's drawing-checker history: HOW
  // MANY times the file has been read, and WHEN the last one was. Not the run
  // ids -- those are an internal artifact's address, the same thing the crop
  // popover's link stopped printing on 2026-09-15, and no reader can do
  // anything with one (ISSUE_20260916_the_element_pane_still_prints_bare_
  // drawing_checker_run_ids_as_link_text). They are kept, on the line's hover,
  // because an id IS what a person with a drawing-checker shell would use.
  //
  // A run entry carries `{run_id, ts}`; `ts` is the recorded fact and the id's
  // own date prefix is the fallback for an entry that somehow has no `ts`.
  VA.exportRunsSummary = function (exportBlock) {
    var runs = (exportBlock && exportBlock.runs) || [];
    var runDate = function (run) {
      return VA.isoDateText(run && run.ts) ||
        VA.isoDateText(String((run && run.run_id) || "")
          .replace(/^(\d{4})(\d{2})(\d{2})/, "$1-$2-$3"));
    };
    return {
      count: runs.length,
      // The LAST recorded run's OWN day, by the order the export lists them --
      // which is the order build_viewer_crops.py found them in, oldest first.
      //
      // Not "the last day this reader could parse". Filtering first and then
      // taking the last is a one-character-looking difference that makes an
      // export whose final run has no `ts` and no date-shaped id report the
      // PREVIOUS run's day as "most recently" -- a wrong date, stated
      // confidently, which is worse than the clause being absent. If the last
      // run cannot say when it ran, the sentence says how many times and stops.
      lastDate: runs.length ? runDate(runs[runs.length - 1]) : null,
      ids: VA.exportRunIds(exportBlock),
    };
  };

  // The sentence that summary becomes, on every surface that states it.
  VA.EXPORT_NO_RUNS_TEXT = "no drawing-checker run has used this file — the " +
    "value was read straight off it, so its checksum is the whole of its identity";
  VA.exportRunsText = function (exportBlock) {
    var summary = VA.exportRunsSummary(exportBlock);
    if (!summary.count) return VA.EXPORT_NO_RUNS_TEXT;
    return "read by drawing-checker " +
      (summary.count === 1 ? "once" : summary.count + " times") +
      (summary.lastDate
        ? (summary.count === 1 ? ", on " : ", most recently ") + summary.lastDate
        : "");
  };

  // Why the ids sit on a hover and not in the line, and why at most one run is
  // ever a link -- both facts a reader who goes looking for them deserves.
  VA.exportRunsTitle = function (exportBlock) {
    var ids = VA.exportRunsSummary(exportBlock).ids;
    return (ids.length ? "recorded on this export as " + ids.join(", ") + ". " : "") +
      "drawing-checker addresses a run by a longer name than the id recorded " +
      "here, so this page links only the run its own crop resolved through.";
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
  // says "no citation", and saying it twice buys nothing.
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
      // The same sentence the rendered line says, out of the same builder:
      // this view-model and VA.exportRunsLine must not describe one export in
      // two vocabularies.
      bits.push(VA.exportRunsText((sourceRef || {}).export));
    }
    return bits.join(" · ");
  };

  // --- material provenance: the sourcing OF A NUMBER -----------------------

  // Where a material entry's CTE actually comes from
  // (tolerance_stack/thermal.py, MaterialEntry.__post_init__). Enumerated, so it
  // gets a table for the same reason `export.status` does — and this one had NO
  // viewer branch at all until 2026-08-12, which meant `library` rendered
  // identically to `inline` even though one says the number in front of you is
  // a cross-check and the other says it is the source.
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
  //                   (it predates the element — i.e. it is out of date)
  //
  // The `reason` of each is RENDERED, on four surfaces, so it is written for a
  // reader and not for whoever maintains the index: no artifact filename, no
  // field name, and above all no command to type (2026-09-15, the standing
  // web-copy rules). What the reader needs from these four is which of them
  // applies; what to DO about it is the banner's, once, for the whole page.
  VA.cropFor = function (cropsIndex, stackId, elementId) {
    if (!cropsIndex) {
      return {
        status: "not-built",
        reason: "no drawing crops have been prepared yet.",
      };
    }
    var byStack = cropsIndex.by_stack || {};
    var entry = (byStack[stackId] || {})[elementId];
    if (!entry) {
      return {
        status: "no-entry",
        reason: "the prepared crops are older than this stack and do not " +
          "cover this element yet.",
      };
    }
    return entry;
  };

  // The crop-lookup dispatcher over crops.json's TWO key spaces
  // (scripts/build_topology_projection.py's crop_key): a dimension_ref edge
  // re-expresses a committed stack element and addresses `by_stack` as
  // {stack, element} — the space VA.cropFor has always read — while an INLINE
  // edge with a croppable citation addresses `by_topology` as {topology,
  // edge}, because an inline edge is in no stack and a topology's id can
  // equal a stack's (vpa_output_to_pitch_plate names both today), so landing
  // edge ids in the element-keyed bucket would silently collide. Until this
  // function existed the viewer read only by_stack, so every {topology, edge}
  // key rendered as "no-entry — the index is stale", which is the exact
  // misreading the four distinct crop states exist to prevent.
  //
  // Total over both shapes plus the unknown one, the same posture as every
  // enumerated field here: a key shape this viewer has no branch for is said
  // out loud, never quietly rendered as a stale index.
  VA.cropForKey = function (cropsIndex, cropKey) {
    if (!cropKey) {
      return {
        status: "no-entry",
        reason: "nothing addresses a drawing crop for this row.",
      };
    }
    if (cropKey.stack) {
      return VA.cropFor(cropsIndex, cropKey.stack, cropKey.element);
    }
    if (!cropKey.topology) {
      return {
        status: "unresolvable",
        reason: "this row addresses a drawing crop in a way this page has no " +
          "branch for: " + JSON.stringify(cropKey),
      };
    }
    if (!cropsIndex) {
      return {
        status: "not-built",
        reason: "no drawing crops have been prepared yet.",
      };
    }
    var byTopology = cropsIndex.by_topology || {};
    var entry = (byTopology[cropKey.topology] || {})[cropKey.edge];
    if (!entry) {
      return {
        status: "no-entry",
        reason: "the prepared crops are older than this topology and do not " +
          "cover this row yet.",
      };
    }
    return entry;
  };

  // Which crop-index entry an edge's key addresses, as one line. The two
  // spaces are different CLAIMS and must read differently: a {stack, element}
  // key says "this edge IS that stack element — same id, same citation, same
  // crop"; a {topology, edge} key says "this edge is authored in the topology
  // itself, and the crop is of its own citation".
  VA.cropKeyText = function (cropKey) {
    if (!cropKey) return "";
    if (cropKey.stack) {
      return "from stack `" + cropKey.stack + "`, element `" +
        cropKey.element + "`";
    }
    return "authored in topology `" + cropKey.topology +
      "` — the crop is of this edge's own citation";
  };

  // --- the viewer's own INBOUND deep-link contract ---------------------------
  //
  // (viewer_hover_cards_and_deep_links, deliverable 3.) The URL params
  // topology.html answers to, over and above `?mock=1` (which picks the
  // DATASET, not a selection, and is deliberately not in this list). This is
  // a CONTRACT a sibling repo consumes — drawing-checker's analyses panel
  // links here (`analyses_viewer_deep_link`, staged there) — documented in
  // apps/viewer/README.md; change the two together and treat a rename as
  // breaking. Query params only, never a path segment, so the same link
  // works under the drawing-checker mount (/tolstack/viewer/topology.html),
  // any static server, and file:// alike.
  VA.DEEP_LINK_PARAMS = ["topology", "study", "edge", "node", "stack", "element"];

  // location.search -> { topology, study, edge, node, stack, element }, only
  // the keys the query actually carries — or null when it carries none of
  // them, so a paramless boot costs nothing. First occurrence wins; an empty
  // value reads as absent. Pure string work, no URL API: this file also runs
  // under the node-vm fast tier, which has no browser URL global (the
  // annotateLink precedent).
  VA.parseDeepLink = function (search) {
    var out = {};
    var found = false;
    String(search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
      if (!pair) return;
      var cut = pair.indexOf("=");
      var key = cut === -1 ? pair : pair.slice(0, cut);
      if (VA.DEEP_LINK_PARAMS.indexOf(key) === -1) return;
      if (Object.prototype.hasOwnProperty.call(out, key)) return;
      var raw = cut === -1 ? "" : pair.slice(cut + 1);
      var value;
      try { value = decodeURIComponent(raw); } catch (err) { value = raw; }
      if (!value) return;
      out[key] = value;
      found = true;
    });
    return found ? out : null;
  };

  // The outbound twin: the same params, built rather than parsed, so a test
  // can round-trip the contract and a sibling surface has one shape to copy.
  // Relative on purpose — it never names an origin or a mount, which is what
  // keeps it stable under the drawing-checker mount and static serving alike.
  VA.viewerLink = function (params) {
    var query = [];
    VA.DEEP_LINK_PARAMS.forEach(function (key) {
      if (params && params[key]) {
        query.push(key + "=" + encodeURIComponent(params[key]));
      }
    });
    if (params && params.mock) query.push("mock=1");
    return "topology.html" + (query.length ? "?" + query.join("&") : "");
  };

  // --- the citation card: the spec-sheet reference, hover-sized --------------
  //
  // (viewer_hover_cards_and_deep_links, deliverable 1.) What the stack view
  // already renders for a citation — the where-ref, the callout as printed,
  // the note in full, and the export/identity block that says which BYTES
  // back the value — reassembled as one hover card, so a reader gets the full
  // reference without selecting the row. Citation identity is the citation's
  // own: for a spec citation that is the spec-pile FILENAME (the append-only
  // pile is the identity rule, and the spec library projection is keyed by
  // exactly those filenames); an export block still wins wherever one exists,
  // the same precedence VA.exportProvenance already applies.
  VA.citationCard = function (sourceRef, identityRule, cropEntry) {
    if (!sourceRef) return null;
    return {
      kind: "citation",
      title: VA.citationWhere(sourceRef),
      citationKind: sourceRef.kind || null,
      confidence: sourceRef.confidence || null,
      callout: sourceRef.callout || null,
      note: sourceRef.note || null,
      provenance: VA.exportProvenance(sourceRef, identityRule || null),
      exportBlock: sourceRef.export || null,
      entry: cropEntry || null,
    };
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

  // A file:// URL for the source PDF. Pure string work — it says nothing about
  // whether the link can be FOLLOWED; VA.localFileUrl below is the one callers
  // want.
  VA.fileUrl = function (absPath) {
    if (!absPath) return null;
    var normalised = String(absPath).replace(/\\/g, "/");
    return "file:///" + normalised.replace(/^\/+/, "");
  };

  // The link a view should render for a source PDF, or **null where this
  // origin cannot follow one** — see VA.originOpensLocalFiles
  // (storage/adapter.js) for the measurement and for why the answer turns on
  // the origin rather than on the path. A view renders nothing at all in the
  // null case: a dead control that looks live is worse than an absent one, and
  // it is what Jeff hit on 2026-09-15.
  //
  // The protocol is read from the page when the caller does not name one, so a
  // view keeps its one-argument call. A page with no `location` at all (the
  // node fast tier's DOM shim) reads as "cannot follow", the same
  // strictest-answer default VA.isLocalPage takes.
  //
  // It goes through this one function rather than reading `window.location`
  // inline, and that indirection is the test seam: assigning to
  // `location.protocol` in a real browser NAVIGATES the page, so a test
  // driving the served case has to replace this instead. (tests.js runs in
  // Chrome too, through test.html — the fast tier is not the only reader.)
  VA.pageProtocol = function () {
    return (typeof window !== "undefined" && window.location &&
      window.location.protocol) || "";
  };

  VA.localFileUrl = function (absPath, protocol) {
    var origin = protocol === undefined ? VA.pageProtocol() : protocol;
    if (!VA.originOpensLocalFiles(origin)) return null;
    return VA.fileUrl(absPath);
  };

  // Whether the bytes that were cropped are the bytes the citation names. Three
  // states, and collapsing any two of them is the bug this file had: a crop of a
  // *guessed* export looks perfectly correct on screen, so "verified" is the one
  // fact this line cannot leave out. `false` and `null` are different answers —
  // `false` is a rule that had a checksum to check and could not, `null` is a
  // rule with no checksum available at all (the spec pile is append-only, so a
  // filename is its identity).
  //
  // "sha256" left the wording on 2026-09-15 (handoff viewer_component_names_
  // and_reference_copy): the algorithm's name is an internal detail no reader
  // of this page can act on, and the three claims read the same without it.
  VA.cropShaText = function (cropEntry) {
    if (cropEntry.sha256_verified === true) return "checked against the citation, byte for byte";
    if (cropEntry.sha256_verified === false) return "NOT checked against the citation";
    return "no checksum on record to check against";
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

  // WHERE on the sheet a crop was taken — one entry per `located_by` value
  // `locate()` in scripts/build_viewer_crops.py can write. A table for exactly
  // the reason VA.CROP_RULES is one: this was a chain of three `if`s with no
  // else, so the fourth value (`declared_region`, added 2026-09-14 by the
  // crop-region registry) would have dropped the whole "where on the sheet"
  // clause without a mark — the same silence that let a stale `resolved_by` go
  // unexplained for four days. Paired against the crop script's literals by
  // tests/test_js_python_vocabulary.py.
  VA.CROP_PLACEMENTS = {
    zone_cell: {
      text: function (e) {
        // Name the string that corroborated, never just "found". The needle is
        // whichever candidate matched FIRST, and the candidates include bare
        // tokens: the pitch-plate flange's zone D10 corroborates on "±0.10",
        // which occurs five times on that sheet, while the discriminating
        // "4.06 ±0.10" occurs once and is never tried (callout_needles splits on
        // whitespace). An unqualified "callout text found there" reads as much
        // stronger evidence than a generic token is, which is the one thing a
        // provenance surface must not do.
        return "showing the cited zone " + e.cited_zone +
          (e.callout_text_in_zone === true
            ? " (callout text " + JSON.stringify(e.needle || "") + " found there)"
            : e.callout_text_in_zone === false
              ? " (callout text NOT found there — the crop is the citation, not a match)"
              : "");
      },
    },
    declared_region: {
      text: function (e) {
        // A declared region is somebody's recorded reading of the page, not a
        // search hit, so the line says who it answers to: the region's own name
        // and, when it matched rather than being the sheet's only region, the
        // citation text that picked it.
        return "showing the declared region " +
          JSON.stringify(e.region_label || "(unnamed)") +
          (e.region_match
            ? ", matched on " + JSON.stringify(e.region_match)
            : ", the only region declared for this sheet");
      },
    },
    callout_text: {
      text: function (e) {
        return "located by the unique match for " + JSON.stringify(e.needle);
      },
    },
    balloon_view: {
      text: function (e) {
        // The strongest placement this index has: the item's own balloon,
        // found on the page by the drawing's native geometry. Say which
        // balloon, because "the right view" and "the right item in it" are two
        // claims and the second is the one a reader is checking.
        return "showing the view around balloon " + e.find_no +
          (e.cited_zone ? ", with the cited zone " + e.cited_zone : "");
      },
    },
    page_context: {
      text: function (e) {
        // The sheet's declared context with nothing highlighted: honest, and
        // deliberately not dressed up as a match.
        return "showing the declared page context " +
          JSON.stringify(e.context_label || "(unnamed)") +
          " — no declared region matched this citation";
      },
    },
    sheet_full: {
      text: function (e) { return e.note || "whole sheet"; },
    },
  };

  // What a box drawn over a crop CLAIMS. Paired against
  // scripts/build_viewer_crops.py's HIGHLIGHT_KINDS by
  // tests/test_js_python_vocabulary.py — a third kind arriving with no branch
  // here would draw nothing at all, which reads as "nothing on this sheet was
  // marked" rather than as a viewer that cannot tell.
  //
  // `solid` is the whole visual distinction and it is the point of there being
  // two kinds: a solid box says the citation's own text or balloon was FOUND
  // here; a dashed one says a human declared the rect, or the citation named
  // this printed zone, and nothing on the page corroborated it. The same fact
  // the provenance line has always spelled out in words ("the crop is the
  // citation, not a match") — now carried by the picture, which is what a
  // reader actually looks at.
  VA.CROP_HIGHLIGHT_KINDS = {
    verified_match: {
      solid: true,
      text: function (label) {
        return label ? "found on the page: " + label : "found on the page";
      },
    },
    declared_region: {
      solid: false,
      text: function (label) {
        return (label ? label + " — " : "") +
          "a declared region, not a match on the page";
      },
    },
  };

  // The boxes to draw over a crop (or over its companion image), always an
  // array. An entry written before highlights existed carries none, which is
  // the same rendering as a crop with nothing to mark — correctly: neither
  // makes a claim about the page.
  VA.cropHighlights = function (carrier) {
    var boxes = carrier && carrier.highlights;
    if (!boxes || !boxes.length) return [];
    return boxes.filter(function (box) {
      return box && box.frac && box.frac.length === 4;
    });
  };

  // What the link into drawing-checker should SAY: the drawing's own number and
  // revision, as the citation states them — "215197 rev A.1". Never "open run"
  // and never a URL (Jeff's standing web-copy rule: no internal names in
  // user-facing copy, and a run id is the most internal name in this repo).
  // null when the entry does not carry both, so the caller keeps its old text
  // rather than printing "undefined rev undefined".
  VA.drawingLinkText = function (cropEntry) {
    if (!cropEntry || !cropEntry.drawing_no || !cropEntry.drawing_revision) {
      return null;
    }
    return cropEntry.drawing_no + " rev " + cropEntry.drawing_revision;
  };

  // What a crop resolved by a rule this viewer has never heard of must say. It
  // names the value rather than describing it, because the reader's next step is
  // to grep the crop script for it.
  VA.unlabelledRuleText = function (resolvedBy) {
    return "resolved by " + JSON.stringify(resolvedBy === undefined ? null : resolvedBy) +
      ", a rule this viewer has no label for — how much to trust this " +
      "placement is NOT shown here; read the entry in crops.json";
  };

  // The same, for a crop placed by a rule this viewer has no branch for. Loud
  // for the same reason: a hover that quietly says nothing about where on the
  // sheet a crop was taken reads as "the whole sheet", which is a different
  // claim from "this viewer cannot tell you".
  // The same, for a box drawn over a crop whose kind this viewer has no branch
  // for. It still gets drawn -- a highlight the builder emitted is a rect
  // somebody meant, and hiding it would hide the claim -- but it says out loud
  // that whether the rect was FOUND or merely declared is not shown here,
  // because those are the two very different things a box on a drawing can mean.
  VA.unlabelledHighlightText = function (kind) {
    return "highlighted as " + JSON.stringify(kind === undefined ? null : kind) +
      ", a kind this viewer has no label for — whether this rect was found on " +
      "the page or only declared is NOT shown here";
  };

  VA.unlabelledPlacementText = function (locatedBy) {
    return "placed by " + JSON.stringify(locatedBy === undefined ? null : locatedBy) +
      ", a rule this viewer has no label for — WHERE on the sheet this crop " +
      "was taken is NOT shown here; read the entry in crops.json";
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
    var placement = VA.CROP_PLACEMENTS[cropEntry.located_by];
    bits.push(placement
      ? placement.text(cropEntry)
      : VA.unlabelledPlacementText(cropEntry.located_by));
    return bits.join(" · ");
  };

  // --- reaching an open popover with the mouse ------------------------------
  //
  // Jeff, 2026-09-16: "sometimes the preview pop-up disappears when you try to
  // move the mouse over it, you have to do it just right."
  //
  // Measured the same day, and the diagnosis is not what the complaint sounds
  // like: there is no mouseleave and no hide timer anywhere in this app -- a
  // hover popover closes only on its own X, on Escape, on an outside click, or
  // by being REPLACED. The card was never disappearing; it was being
  // re-targeted. Every trigger the pointer crosses on the way to the open card
  // fires `mouseenter` and re-points the one shared #croppop node at itself,
  // and on the DAG the corridor is crowded: a rail bar's hit area is a
  // 14-px-wide stroke (.rail__barhit, topology.css), so a diagonal approach
  // can cross two of them.
  //
  // The fix is intent, not a timer: while a popover is open, a competing
  // trigger is DEFERRED -- not dropped -- for as long as the pointer is
  // travelling toward the open box. This is the classic aim/corridor test
  // (does the movement vector, extended, enter the card?) rather than a plain
  // "ignore everything for N ms", because a plain grace period swallows a
  // deliberate hover onto the neighbouring row: `mouseenter` fires once, so a
  // suppressed one never arrives again while the pointer sits still.
  //
  // Two numbers, and both are bounded on purpose:
  //
  //   * HOVER_INTENT_MS is how long a deferred trigger waits before it opens
  //     anyway. So the worst case of a WRONG guess is a card that arrives a
  //     quarter-second late, never one that never arrives.
  //   * HOVER_INTENT_REACH caps how far along the movement vector the box is
  //     allowed to be. Without it a pointer crossing the grid in a straight
  //     line counts as "approaching" a card 900px away, because an infinite
  //     ray eventually hits almost anything -- and every trigger on that line
  //     would go quiet. An open card sits 8px from the trigger it was opened
  //     from, so anything the reader is plausibly reaching for is close.
  VA.HOVER_INTENT_MS = 260;
  VA.HOVER_INTENT_REACH = 240;

  // Is this point in this box? Boxes here are always getBoundingClientRect()
  // results (or anything with the same four fields), in VIEWPORT coordinates --
  // the frame `position: fixed` places the popover in.
  VA.pointerInside = function (point, box) {
    if (!point || !box) return false;
    return point.x >= box.left && point.x <= box.right &&
           point.y >= box.top && point.y <= box.bottom;
  };

  // Is the pointer travelling from `from` to `to` on a course that reaches
  // `box`? A ray/rectangle intersection by the slab method, with the entry
  // distance measured in pixels and capped at HOVER_INTENT_REACH.
  //
  // A pointer already INSIDE the box counts, with no direction needed: it has
  // arrived, which is the strongest possible evidence of intent. A pointer
  // that has not moved does not -- a zero vector aims at nothing, and guessing
  // a direction for it would be the thing this function exists to avoid.
  VA.pointerHeadsFor = function (from, to, box) {
    if (!to || !box) return false;
    if (VA.pointerInside(to, box)) return true;
    if (!from) return false;
    var dx = to.x - from.x, dy = to.y - from.y;
    if (!dx && !dy) return false;
    var span = slab(to.x, dx, box.left, box.right, [0, Infinity]);
    if (span) span = slab(to.y, dy, box.top, box.bottom, span);
    if (!span) return false;
    return span[0] * Math.sqrt(dx * dx + dy * dy) <= VA.HOVER_INTENT_REACH;
  };

  // Should an OPEN popover be re-placed now that one of its images has
  // settled? Pure, so the fast tier can pin both halves without a browser;
  // topology_app.js's `replace()` is the wiring and does nothing else.
  //
  // Two guards, and the first is the one that matters. A card under the
  // reader's pointer is a card IN USE: `position()` flips a card above its
  // trigger when it no longer fits below, and a flip under the pointer is the
  // other half of what Jeff reported as the popup disappearing. The second
  // skips the gesture entirely when the box is exactly the height it was last
  // measured at, which is the normal case -- VA.cropFigure reserves each
  // image's height from the crop index's own pixel size before the decode, so
  // a settled PNG usually changes nothing at all.
  VA.popoverShouldMove = function (pointer, box, height, placed) {
    if (VA.pointerInside(pointer, box)) return false;
    return Math.abs((height || 0) - (placed || 0)) > 1;
  };

  // One axis of the slab test: narrow `[tmin, tmax]` (in units of the movement
  // vector) to the stretch of the ray inside this axis's pair of edges, or
  // null where the two do not overlap at all. A zero component means the ray
  // is parallel to this axis, which is a hit only if it starts between the
  // edges -- the division would be an infinity that reads as a hit otherwise.
  function slab(origin, delta, low, high, span) {
    if (!delta) return (origin >= low && origin <= high) ? span : null;
    var near = (low - origin) / delta, far = (high - origin) / delta;
    if (near > far) { var swap = near; near = far; far = swap; }
    var lo = Math.max(span[0], near), hi = Math.min(span[1], far);
    return lo <= hi ? [lo, hi] : null;
  }

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

  // Which projection the banner is describing. Two pages share views/banner.js
  // and they read DIFFERENT files: index.html renders `results.json`,
  // topology.html renders `topologies.json`. The banner's job is identical for
  // both — when was it built, which tree built it, and what to run when it is
  // missing — so the wording is a parameter rather than a second banner. The
  // default is `results`, which is why every existing call site is unchanged.
  VA.PROJECTION_LABELS = {
    results: {
      name: "results",
      file: "results.json",
      rebuildKey: "results",
      missing: "No results projection. The viewer renders it dumbly and computes " +
        "nothing, so without it there is nothing to show. Build it:",
    },
    topologies: {
      name: "topologies",
      file: "topologies.json",
      rebuildKey: "topologies",
      missing: "No topology projection — the rails, every study chain and every " +
        "total come out of it, so without it there is nothing to draw. Build it:",
    },
  };

  VA.projectionLabels = function (which) {
    return VA.PROJECTION_LABELS[which] || VA.PROJECTION_LABELS.results;
  };

  // The banner's freshness line. Purely descriptive — the viewer does not try
  // to decide whether a projection is stale, it shows when each was built and
  // lets the reader judge.
  VA.builtLine = function (results, crops, which) {
    var labels = VA.projectionLabels(which);
    var parts = [];
    parts.push(results && results.built_at
      ? labels.name + " built " + results.built_at
      : labels.name + " NOT BUILT");
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
  VA.provenanceAlarms = function (results, crops, which) {
    var labels = VA.projectionLabels(which);
    var alarms = [];
    var rp = results && results.provenance;
    var cp = crops && crops.provenance;

    if (results && !rp) alarms.push(labels.file + " carries no provenance stamp");
    if (crops && !cp) alarms.push("crops.json carries no provenance stamp");

    if (rp && cp && rp.head_sha && cp.head_sha && rp.head_sha !== cp.head_sha) {
      alarms.push(
        labels.name + " and crops were built from DIFFERENT trees — " +
        labels.name + " from " +
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
    [[labels.name, rp], ["crops", cp]].forEach(function (pair) {
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
