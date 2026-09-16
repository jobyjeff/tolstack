// Pure view-model logic for the topology page — no DOM, no IO, and (like
// viewer.js) NO ARITHMETIC. Every number this file hands a view came out of
// data/projections/viewer/topologies.json, which scripts/build_topology_projection.py
// produced by calling tolerance_stack.topology.summarize() -> fold(). The rail
// LAYOUT came out of the same file for the same reason: which column an edge
// lands on is a claim about the graph, and the repo keeps claims about the graph
// in Python where a pytest can pin them.
//
// What this file does compute is pixels — row index times row height. That is
// the one thing the projection deliberately does not carry (a column index is
// not a colour and a row index is not a y), and it is arithmetic about the
// screen, not about a tolerance.
(function (VA) {
  "use strict";

  // --- the vocabularies the projection can write ---------------------------
  //
  // Hand-copies of scripts/build_topology_projection.py's module-level tuples,
  // paired word for word by tests/test_topology_projection.py — the same
  // discipline tests/test_js_python_vocabulary.py applies to the stack viewer's
  // six tables, and for the same reason: a rename in Python is silent here until
  // data moves, and the first symptom is a loud "no branch for this" on a
  // reader's screen.

  VA.TOPO_ROW_KINDS = ["node", "edge"];
  VA.TOPO_LINK_KINDS = ["branch", "close"];
  VA.STUDY_STATUSES = ["ok", "error"];
  // What a projected part's `mesh` block says (handoff
  // annotate_affordances_flyout_and_mesh_gating). Every part carries the block,
  // so a missing one means the projection predates the field rather than that
  // no mesh is installed — but VA.partMeshFact below deliberately reads BOTH as
  // "no mesh" and surfaces nothing about the difference. Rebuilding the
  // projection is the only thing that tells the two apart.
  VA.MESH_FACT_FIELDS = ["installed", "part_id"];

  // These three are the DOCUMENTS' vocabularies rather than the projection's --
  // tolerance_stack.topology's NODE_KINDS, EDGE_KINDS and TRANSFORM_KINDS, which
  // each dataclass validates its own field against -- and they are here for the
  // same reason the three above are: the page branches on all three (a
  // `datum_feature` gets a filled dot, a `gap` gets a dashed bar and its own
  // chip, a non-`identity` transform raises the sensitivity chip) and each
  // branch has a silent default arm. They were written out a second time inside
  // tests.js's TOPO_VALUE_GUARDS until this review; nothing paired those copies
  // to Python, which is the one thing an `inList` guard cannot do for itself.
  // Paired by tests/test_topology_projection.py alongside the others.
  VA.NODE_KINDS = ["mating_surface", "datum_feature"];
  VA.EDGE_KINDS = ["structural", "gap"];
  VA.TRANSFORM_KINDS = ["identity", "ratio", "linear_to_rotary"];

  // Where an edge's value comes from. A total function with a loud fallback: the
  // three states read differently and collapsing any two is a lie. In
  // particular a `derived` gap has NO value on purpose — it is the quantity a
  // study computes — and rendering it like a dimension nobody filled in would
  // invert the meaning.
  VA.VALUE_SOURCES = {
    inline: {
      label: "authored in the topology",
      title: "This edge's dimension is written in the topology document itself " +
        "(topology-first authoring, for a system with no stack behind it). It is " +
        "in no stack file, so no crop index covers it.",
    },
    stack_ref: {
      label: "from a committed stack",
      title: "This edge carries no number of its own: it names an element of a " +
        "committed stack (dimension_ref) and the loader resolved the value, its " +
        "citation and its role out of that file. The topology cannot drift away " +
        "from the stack it re-expresses.",
    },
    derived: {
      label: "DERIVED — the quantity a study computes",
      title: "A derived gap: two real interfaces with no dimension between them. " +
        "This is the answer, not a term — a study is refused if it puts this edge " +
        "in its selection, and names it in `closes` instead.",
    },
  };

  VA.valueSourceText = function (source) {
    return "value source `" + String(source) + "`, which this viewer has no " +
      "branch for — scripts/build_topology_projection.py's VALUE_SOURCES and " +
      "VA.VALUE_SOURCES have drifted";
  };

  // The four ways a study refuses to sum, each with what the reader should DO.
  // These are not build failures: docs/DAG_TOPOLOGY.md's "Not a solver" is the
  // locked decision that makes them the archetype's most useful output, and the
  // messages carried in `error.message` are written for a human author. This
  // table adds the *next step*, which the exception cannot know.
  VA.STUDY_ERRORS = {
    BranchAmbiguity: {
      headline: "The selection reaches a fork",
      advice: "Two selected edges are unconsumed at one node, so the chain has a " +
        "choice to make. This tool never makes it — which parallel path binds is " +
        "a stiffness question. Drop one of the named edges from the selection.",
    },
    BrokenChain: {
      headline: "The selection is not one chain",
      advice: "The selected edges do not run continuously between the study's two " +
        "endpoints. Nothing is path-found into the gap; add the missing edges, or " +
        "move an endpoint.",
    },
    CycleDetected: {
      headline: "The selection closes a ring",
      advice: "The named edge is the one whose addition closed the loop — remove " +
        "it to make the selection a chain. It is not the only edge on the ring and " +
        "does not claim to be.",
    },
    UnitMismatch: {
      headline: "The selection would add unlike things",
      advice: "Some contributions land in millimetres and some in degrees. " +
        "Converting every contributor into one output quantity is the author's " +
        "job; declare the transforms, or stop the study before the coupling.",
    },
  };

  VA.unlabelledStudyErrorText = function (type) {
    return "the study raised `" + String(type) + "`, an error this viewer has no " +
      "label for. The message below is the whole of what is known about it.";
  };

  // --- lookups -------------------------------------------------------------

  VA.findTopology = function (projection, topologyId) {
    var all = (projection && projection.topologies) || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === topologyId) return all[i];
    }
    return null;
  };

  VA.findStudy = function (topoProj, studyId) {
    var all = (topoProj && topoProj.studies) || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === studyId) return all[i];
    }
    return null;
  };

  // { nodes: {id: node}, edges: {id: edge}, parts: {id: part} } — built once per
  // render rather than scanned per row, because the pitch system is 43 rows over
  // 43 elements and a linear scan per row is quadratic for no reason.
  VA.topologyIndex = function (topoProj) {
    var index = { nodes: {}, edges: {}, parts: {} };
    if (!topoProj) return index;
    (topoProj.nodes || []).forEach(function (n) { index.nodes[n.id] = n; });
    (topoProj.edges || []).forEach(function (e) { index.edges[e.id] = e; });
    (topoProj.parts || []).forEach(function (p) { index.parts[p.id] = p; });
    return index;
  };

  // --- is there a 3D model of this part? ------------------------------------
  //
  // (handoff annotate_affordances_flyout_and_mesh_gating.) The page CANNOT work
  // this out for itself: the alias table lives under docs/, which the served
  // data mount does not carry, and data/meshes/ is in no projection the viewer
  // reads. So the builder resolves it (the annotator's own resolution order,
  // aliases included) and stamps `mesh: {installed, part_id}` on every part;
  // this is the only place the page reads it.
  //
  // The whole point is NEGATIVE: an "open this part in 3D" affordance that
  // lands on the annotator's empty state is a dead link, and the standing UI
  // rule is that a feature the user cannot have shows NOTHING — no greyed
  // button, no explanation of a 3D model that does not exist.
  VA.MESH_FACT_ABSENT = { installed: false, part_id: null };

  VA.partMeshFact = function (topoProj, partId) {
    if (!partId) return VA.MESH_FACT_ABSENT;
    var part = VA.topologyIndex(topoProj).parts[partId];
    // A part with no block at all is a projection built before the field
    // existed. Read as "no mesh": the affordance disappears until a rebuild,
    // which is the safe direction — a dead link is the failure being fixed.
    return (part && part.mesh) || VA.MESH_FACT_ABSENT;
  };

  VA.partHasMesh = function (topoProj, partId) {
    return VA.partMeshFact(topoProj, partId).installed === true;
  };

  // Does this study's chain touch any part with an installed mesh? The study's
  // 3D affordance traces its selection, so a study whose every part is
  // meshless flies out an empty scene — the same dead end as a part link, one
  // level up. One part is enough: the annotator's trace is honest about the
  // rest (it names the missing parts in its own banner).
  VA.studyHasMesh = function (topoProj, study) {
    if (!study) return false;
    var index = VA.topologyIndex(topoProj);
    return (study.selection || []).some(function (edgeId) {
      var edge = index.edges[edgeId];
      return !!(edge && VA.partHasMesh(topoProj, edge.part));
    });
  };

  // The element a serialised row points at — a node or an edge, per row.kind.
  // null when the projection names an id the topology does not declare, which
  // cannot happen from a clean build and is reported rather than skipped.
  VA.rowElement = function (index, row) {
    if (!row) return null;
    if (row.kind === "node") return index.nodes[row.id] || null;
    if (row.kind === "edge") return index.edges[row.id] || null;
    return null;
  };

  // { edgeId: { ordinal, contribution } } for the selected study — what turns a
  // topology row into a chain row. The ordinal is 1-based and is the order the
  // SUM runs in, which is generally NOT the order the rows are in: a study
  // lassoes its way through the graph and the page's rows are a depth-first walk
  // of the whole of it.
  VA.chainIndex = function (study) {
    var index = {};
    var chain = (study && study.result && study.result.chain) || [];
    chain.forEach(function (contribution, i) {
      index[contribution.edge] = { ordinal: i + 1, contribution: contribution };
    });
    return index;
  };

  // Every node the selected study's chain stands on, so a node row can be
  // highlighted with its edges. Read off the chain's own entered/left pair —
  // Contribution carries both precisely so a row can be tied to the two nodes it
  // spans (the topology handoff's lesson, section 6).
  VA.chainNodes = function (study) {
    var seen = {};
    var chain = (study && study.result && study.result.chain) || [];
    chain.forEach(function (contribution) {
      seen[contribution.from] = true;
      seen[contribution.to] = true;
    });
    return seen;
  };

  // --- what a row says -----------------------------------------------------

  // The one description an edge shows on hover, wherever it is hidden as a
  // label: the rail bar's own hit path (views/topology.js's railsSvg) and a
  // value-only grid row (deliverable 4) both read this, rather than each
  // inventing its own text -- "one hover surface, not two".
  VA.edgeHoverTitle = function (edge, id) {
    return edge ? edge.name : String(id);
  };

  // An edge's stored value, printed AS TRANSCRIBED — String(n), no toFixed, no
  // band derived from the limits. Same rule as the stack viewer's element table.
  VA.dimensionText = function (edge) {
    var d = edge && edge.dimension;
    if (!d) return "—";
    return VA.fmt(d.nominal) + "  [" + VA.fmt(d.min) + " … " + VA.fmt(d.max) + "]";
  };

  // What a study's chain row multiplied this edge by, as the projection's own
  // `sign` and `ratio` -- the two factors `Contribution.weight` is the product
  // of. Nothing is derived here: the product itself also rides in the row, and
  // the preview pane prints it.
  // Unity weights stay silent, a non-unity weight NEVER does — the stack
  // viewer's rule (VA.termLabel), for the same reason.
  VA.contributionWeightText = function (contribution) {
    if (!contribution) return "—";
    var head = contribution.sign < 0 ? "− " : "+ ";
    var ratio = contribution.ratio;
    return head + (ratio === 1 ? "" : VA.fmt(ratio) + " × ");
  };

  // A transform, as the sensitivity it is. `identity` is the default and says so
  // rather than printing "× 1", which would read as a declared conversion.
  VA.transformText = function (transform) {
    if (!transform) return "—";
    if (transform.kind === "identity") return "identity";
    return VA.fmt(transform.ratio) + " " +
      (transform.units_out || "?") + " per " + (transform.units_in || "?") +
      " (" + transform.kind + ")";
  };

  // The totals footer, straight off StudyResult.as_dict(). Label/value pairs so
  // the view has nothing to decide and no number to combine.
  VA.studyTotals = function (study) {
    var r = study && study.result;
    if (!r) return [];
    var units = r.units;
    return [
      { key: "nominal", label: "nominal", value: VA.fmt(r.nominal), units: units },
      { key: "worst_case", label: "worst case",
        value: VA.fmt(r.worst_case_min) + " … " + VA.fmt(r.worst_case_max),
        units: units },
      { key: "worst_case_half", label: "worst-case half",
        value: "±" + VA.fmt(r.worst_case_half), units: units },
      { key: "rss", label: "RSS",
        value: VA.fmt(r.rss_min) + " … " + VA.fmt(r.rss_max), units: units },
      { key: "rss_half", label: "RSS half",
        value: "±" + VA.fmt(r.rss_half), units: units },
    ];
  };

  // The weakest confidence among the edges a study actually summed. Weakest
  // wins, exactly as a check's does — this is a lookup over the projection's own
  // per-edge confidences, not a re-derivation of them.
  VA.studyWorstConfidence = function (study, index) {
    var chain = (study && study.result && study.result.chain) || [];
    for (var i = VA.CONFIDENCES.length - 1; i >= 0; i--) {
      var word = VA.CONFIDENCES[i];
      for (var j = 0; j < chain.length; j++) {
        var edge = index.edges[chain[j].edge];
        if (edge && edge.confidence === word) return word;
      }
    }
    return null;
  };

  // --- does it pass, by how much, and what is missing -----------------------
  //
  // Everything below is a LOOKUP over fields the projection already carries.
  // Nothing here compares a tolerance or computes a margin: the verdict came
  // out of CheckResult.verdict and the margin out of CheckResult.margin, both
  // in Python, both against the check's own criterion. This file decides which
  // words go beside them.
  //
  // Until 2026-09-15 the DAG page rendered none of it — a study's verdict was
  // reachable only through the nested "classic view" of the one stack a
  // topology also covers, and a study with no covered stack had nowhere at all
  // to state whether it passed. Jeff's review put it plainly: "None of the
  // tolerance stacks in the entire page appear to have any kind of roll up that
  // shows whether the stack passes or fails, or by how much margin."

  // The three things that make a study's answer less than it looks, in the
  // everyday words Jeff asked for (2026-09-15): no schema field names, no file
  // paths, nothing a reader has to have read this repo to parse. `loud` is the
  // whole point — the failure mode being fixed is a page that "omits them
  // entirely and then fails silently, which is worst of both worlds", so these
  // are badges, not footnotes.
  VA.ATTENTION = {
    unverified: {
      text: "unverified",
      title: "Nothing readable stands behind this number — it traces to no " +
        "drawing or datasheet, or carries no citation at all.",
    },
    no_tolerance: {
      text: "no tolerance recorded",
      title: "A value with no plus/minus behind it. The spread it feeds is a " +
        "LOWER bound on the real one, never the real one.",
    },
    incomplete: {
      text: "incomplete",
      title: "A dimension the joint needs is missing from this chain, so the " +
        "verdict is about the model, not about the hardware.",
    },
  };

  function badge(key) {
    return { key: key, text: VA.ATTENTION[key].text, title: VA.ATTENTION[key].title };
  }

  // What ONE row of the grid has to admit about itself. At most two, in
  // severity order: a number nothing stands behind first, then a number whose
  // band nobody wrote down. Both are facts the projection already carries per
  // edge (`confidence`, `zero_width`).
  VA.edgeAttention = function (edge) {
    var badges = [];
    if (!edge) return badges;
    if (VA.needsAnnotation(edge.confidence)) badges.push(badge("unverified"));
    if (edge.zero_width) badges.push(badge("no_tolerance"));
    return badges;
  };

  // The same question asked of a whole study, plus WHICH rows earned each
  // answer — a badge that cannot name its rows sends the reader hunting, which
  // is the subtler half of the same failure.
  //
  // The chain is walked through the topology's own edge index rather than read
  // off the contributions, because confidence and zero-width are properties of
  // the EDGE and a contribution carries neither.
  VA.studyAttention = function (study, index) {
    var chain = (study && study.result && study.result.chain) || [];
    var out = { unverified: [], noTolerance: [], excluded: [], badges: [] };
    chain.forEach(function (row) {
      var edge = index && index.edges ? index.edges[row.edge] : null;
      if (!edge) return;
      if (VA.needsAnnotation(edge.confidence)) out.unverified.push(edge.name);
      if (edge.zero_width) out.noTolerance.push(edge.name);
    });
    ((study && study.checks) || []).forEach(function (check) {
      (check.excluded_terms || []).forEach(function (term) {
        if (out.excluded.indexOf(term) === -1) out.excluded.push(term);
      });
    });
    if (out.unverified.length) out.badges.push(badge("unverified"));
    if (out.noTolerance.length) out.badges.push(badge("no_tolerance"));
    if (out.excluded.length) out.badges.push(badge("incomplete"));
    return out;
  };

  // The lower-bound sentence, or null where no row in the chain earned it
  // (deliverable 3). Plain words, and it NAMES the rows: "two of them" leaves a
  // reader scrolling a 43-row grid looking for which two.
  VA.zeroWidthWarning = function (attention) {
    var rows = (attention && attention.noTolerance) || [];
    if (!rows.length) return null;
    return rows.length + (rows.length === 1 ? " dimension" : " dimensions") +
      " in this chain " + (rows.length === 1 ? "has" : "have") +
      " no tolerance recorded, so the worst-case spread above is a LOWER " +
      "bound, not the real one: " + rows.join("; ") + ".";
  };

  // One check, as the strip renders it. `margin` is `CheckResult.margin` — the
  // signed worst-case distance to the criterion, computed in Python beside the
  // verdict it agrees with — printed verbatim, sign and all. There is no
  // absolute value taken and no comparison made here; "by how much" is a number
  // this file received, not one it worked out.
  VA.studyCheckRow = function (check) {
    var known = VA.VERDICTS[check && check.verdict];
    var scope = VA.VERDICT_SCOPES[check && check.verdict_scope];
    return {
      checkId: check.check_id,
      label: check.label,
      verdict: check.verdict,
      says: known ? known.says : VA.unlabelledVerdictText(check.verdict),
      title: known ? known.title : VA.unlabelledVerdictText(check.verdict),
      // "margin +11.1435 mm at worst case" — the words a reader asked for
      // ("or by how much margin"), against the number Python signed.
      marginText: "margin " + (typeof check.margin === "number"
        ? (check.margin > 0 ? "+" : "") + VA.fmt(check.margin)
        : "—") + " " + check.units + " at worst case",
      criterion: check.criterion,
      incomplete: check.complete === false,
      scopeChip: scope ? scope.chip : "SCOPE UNKNOWN",
      scopeTitle: scope ? scope.title
        : VA.unlabelledVerdictScopeText(check && check.verdict_scope),
      excludedTerms: (check.excluded_terms || []).slice(),
      guidance: check.guidance || null,
    };
  };

  // The one-badge answer for a study, for the nav row and the head of the
  // totals strip. `state` is a verdict word, or one of the two states a verdict
  // cannot express:
  //
  //   "none"   no pass/fail criterion has been recorded for this study yet.
  //            Five of the live studies are here (recounted in
  //            review/viewer_study_verdicts_and_gaps: 21 studies, 5 with
  //            `checks: []` and 16 carrying 18 checks between them -- the
  //            handoff's own "13 / 6" was stale in both terms), and rendering
  //            them blank is what made the page look like it had no verdicts
  //            at all.
  //   "error"  the study does not sum (BranchAmbiguity and friends). Its own
  //            error block says why; this only keeps the badge honest.
  VA.studyVerdict = function (study) {
    if (!study) return null;
    if (study.status !== "ok") {
      return { state: "error", word: "does not sum", says: null,
               title: "This study raises rather than summing — see the study " +
                 "itself for which fork or which missing edge stopped it.",
               incomplete: false, checks: [] };
    }
    var checks = (study.checks || []).map(VA.studyCheckRow);
    if (!checks.length) {
      return { state: "none", word: "no pass/fail criterion recorded yet",
               says: null,
               title: "This study sums, and nobody has yet written down what " +
                 "the total has to be for the joint to be acceptable. The " +
                 "totals below are the answer; whether they are good enough " +
                 "is not recorded.",
               incomplete: false, checks: [] };
    }
    var worst = VA.worstVerdict(study.checks);
    var lead = checks.filter(function (row) { return row.verdict === worst; })[0]
      || checks[0];
    return {
      state: worst || "unknown",
      word: lead.verdict,
      says: lead.says,
      title: lead.title,
      marginText: lead.marginText,
      // Never a bare verdict where a term is missing: "fail" on an incomplete
      // chain is true of the model and false of the hardware, and that is the
      // one misreading this repo exists to prevent.
      incomplete: checks.some(function (row) { return row.incomplete; }),
      checks: checks,
    };
  };

  // --- what is missing ------------------------------------------------------

  // What each kind of gap IS and what would close it, in plain words. The
  // hand-copy of scripts/build_topology_projection.py's TOPOLOGY_GAP_KINDS,
  // paired word for word by tests/test_topology_projection.py — the projection
  // writes the kind and the text, this table writes the heading and the way
  // out, and neither side restates the other.
  VA.GAP_KINDS = {
    excluded_from_model: {
      heading: "Left out of the chain",
      closes: "Find a document that gives this dimension, add it to the chain, " +
        "and the verdict above stops being a budget and becomes an answer " +
        "about the joint.",
    },
    unverified_value: {
      heading: "Numbers with nothing behind them",
      closes: "Find the drawing callout or datasheet line that states the " +
        "dimension, and cite it on the row.",
    },
    no_tolerance_recorded: {
      heading: "Dimensions with no tolerance",
      closes: "Find the plus/minus on the drawing. Until then every spread " +
        "these feed is a lower bound.",
    },
    hardware_entry: {
      heading: "Open questions about the hardware",
      closes: "Each is a question recorded against a part when it was " +
        "transcribed; closing one takes a source for what it asks about.",
    },
  };

  VA.unlabelledGapKindText = function (kind) {
    return "This page has no words for a gap of kind " +
      JSON.stringify(kind === undefined ? null : kind) +
      ", so what it is and what would close it are NOT shown here.";
  };

  // The gap list, grouped by kind in VA.GAP_KINDS' own order — worst first,
  // the same rule the builder orders its rows by — so the panel reads as four
  // answerable questions rather than as 38 lines. A kind with no rows is not a
  // group; a kind this page has never heard of gets a loud one of its own
  // rather than being dropped.
  VA.topologyGapGroups = function (topoProj) {
    var gaps = (topoProj && topoProj.gaps) || [];
    var order = Object.keys(VA.GAP_KINDS);
    var byKind = {};
    gaps.forEach(function (gap) {
      (byKind[gap.kind] = byKind[gap.kind] || []).push(gap);
      if (order.indexOf(gap.kind) === -1) order.push(gap.kind);
    });
    return order.filter(function (kind) { return byKind[kind]; })
      .map(function (kind) {
        var known = VA.GAP_KINDS[kind];
        return {
          kind: kind,
          heading: known ? known.heading : "Gaps this page cannot describe",
          closes: known ? known.closes : VA.unlabelledGapKindText(kind),
          gaps: byKind[kind],
        };
      });
  };

  // --- the rail geometry ---------------------------------------------------

  //: Row height, column pitch and the left margin, in CSS pixels. One object so
  //: the grid and the SVG cannot disagree: the grid's rows are laid out at
  //: exactly `rowHeight` and the SVG's marks at exactly `y(row)`, and the
  //: leader geometry (VA.leaderGeometry) reads the same numbers, so row/leader
  //: correspondence is true by construction rather than by two stylesheets
  //: agreeing. `leaderPad`/`leaderLane` size the jog zone between the rails
  //: and the grid: horizontal spacing, so density (a rowHeight control) never
  //: moves them.
  VA.RAIL_METRICS = { rowHeight: 26, gutter: 20, left: 15, dot: 4.5, branchDot: 6.5,
                      leaderPad: 8, leaderLane: 6 };

  // --- row density -----------------------------------------------------
  //
  // "See most of the DAG at once" (HANDOFF_20260904_dag_viewer_vertical_budget.md)
  // needs a density control, and the trap is documented right where it bites:
  // row height is one number in three places that have to move together —
  // VA.RAIL_METRICS.rowHeight (here), `--tv-row` (topology.css, the paint) and
  // the inline row heights (views/topology.js's baseRow, which reads
  // `M.rowHeight` off this exact object). VA.applyRowDensity mutates
  // `.rowHeight` in place rather than replacing VA.RAIL_METRICS, so every
  // existing reference to the object — including views/topology.js's
  // module-scoped `M` — picks up the change with nothing to re-wire. The
  // caller (topology_app.js) still has to set the CSS variable itself; that
  // is the one DOM write this pure file does not make.
  VA.ROW_DENSITIES = {
    comfortable: { rowHeight: 26, label: "Comfortable" },
    compact: { rowHeight: 16, label: "Compact" },
  };

  VA.applyRowDensity = function (density) {
    var preset = VA.ROW_DENSITIES[density] || VA.ROW_DENSITIES.comfortable;
    VA.RAIL_METRICS.rowHeight = preset.rowHeight;
    return preset;
  };

  // --- edge-length scaling (viewer_edge_length_scaling, 2026-09-10) --------
  //
  // A display preference like rowDensity: how much vertical extent each EDGE
  // row of the DAG gets. Uniform is today's rendering and the default; the two
  // scaled modes make a bar's length proportional to a number the projection
  // already carries. The GRID does not move in any mode — its rows stay at
  // rowHeight, evenly spaced, and only the leaders know the DAG stretched
  // (that is the point of the jogged leaders: viewer_leader_line_grid).
  //
  // `next` makes the toolbar's cycle order a fact of this table rather than
  // arithmetic in the app shell — the same reason ROW_DENSITIES carries its
  // own labels.
  VA.EDGE_LENGTH_MODES = {
    uniform: {
      label: "uniform",
      next: "tolerance",
      title: "Every dimension bar is drawn the same length.",
    },
    tolerance: {
      label: "tolerance width",
      next: "absolute",
      title: "A bar's length is proportional to its dimension's tolerance " +
        "band (max − min). Indicative, never measured.",
    },
    absolute: {
      label: "feature size",
      next: "uniform",
      title: "A bar's length is proportional to its dimension's nominal " +
        "size. Indicative, never measured.",
    },
  };

  // --- how a leader is DRAWN (viewer_leader_grid_legibility, 2026-09-14) --
  //
  // A display preference exactly like VA.EDGE_LENGTH_MODES above, and for the
  // same reason it is a table rather than a boolean: the toolbar's cycle
  // order and the button's own words are facts of this object, not arithmetic
  // in the app shell. Jeff, reviewing the shipped arcs: "Have an option to
  // use angled leader lines (rather than right angle jogs) this will likely
  // make it easier to follow the lines (but make it a view option so I can
  // try both)."
  //
  // The two styles differ in the PATH ONLY. Both ends are the page's landed
  // correspondence contract — node-side end on its own dot, grid-side end on
  // its boundary row's seam — so an angled leader is the same two points with
  // one segment between them instead of three, and the browser tier's
  // CORRESPONDENCE_IN_PAGE passes in either style without being taught about
  // styles at all.
  VA.LEADER_STYLES = {
    jogged: {
      label: "jogged",
      next: "angled",
      title: "Leader lines run in right angles (GD&T ordinate style): out " +
        "from the interface, down a lane of their own, then into the grid.",
    },
    angled: {
      label: "angled",
      next: "jogged",
      title: "Leader lines run as one straight segment from the interface to " +
        "its seam in the grid. Same two ends, fewer corners to lose.",
    },
  };

  // How far the jog zone may be dragged open, as a MULTIPLE of its natural
  // width (leaderPad/leaderLane over the leader count). A multiple rather
  // than a pixel width because the preference outlives the topology it was
  // set on, and two topologies' natural zones differ by as many times as
  // their leader counts do: "twice as spread out as it would be" survives the
  // switch where a stored pixel width would crush one diagram's lanes
  // together and leave the other's barely moved.
  VA.JOG_ZONE_SCALE = { min: 1, max: 12 };

  VA.clampJogZoneScale = function (scale) {
    var n = Number(scale);
    if (!isFinite(n)) return VA.JOG_ZONE_SCALE.min;
    return Math.min(VA.JOG_ZONE_SCALE.max, Math.max(VA.JOG_ZONE_SCALE.min, n));
  };

  // The scale a drag lands on: the zone's natural width times the scale it
  // started at, plus however many pixels the grip moved, back over the
  // natural width. Pure so the app shell holds no resize arithmetic of its
  // own, and so a test can check the drag without a pointer.
  VA.jogZoneScaleAfterDrag = function (startScale, dx, naturalWidth) {
    if (!naturalWidth) return VA.clampJogZoneScale(startScale);
    return VA.clampJogZoneScale((naturalWidth * startScale + dx) / naturalWidth);
  };

  // The scale's two shape constants, in ROW HEIGHTS so both densities scale
  // together. Nothing renders shorter than one row — the floor that keeps a
  // zero/tiny/unstated edge clickable (whole-edge hover is a landed contract)
  // and keeps every node y at-or-below its uniform position, which is what
  // lets the leaders keep rising left-to-right in every mode.
  //
  // `maxRows` is what the largest value in the serialisation renders at when
  // nothing else constrains it. It stopped being the ONLY constraint in
  // viewer_dag_spine_layout (2026-09-14): 6 row heights over pitch_system's
  // 24 edges drew a DAG 3325px tall, "multiple times the page height hence
  // impossible to make sense of" (Jeff), so the page now also fits the whole
  // DAG into the viewport (VA.fitEdgeLength) and draws the SHORTER of the two.
  //
  // Downward only, and that is a measured decision rather than a reading of
  // the handoff: fitting a small topology UP to the viewport as well (a
  // 5-edge chain stretched over 780px) makes the leaders' jog worse, not
  // better — pitch_link_to_pitch_plate's own max jog went 132px → 274px when
  // it was tried. The complaint the fit answers is a DAG taller than the
  // page; nothing asked for a short one to be inflated.
  VA.EDGE_LENGTH_SCALE = { maxRows: 6, floorRows: 1 };

  // --- the viewport fit (viewer_dag_spine_layout, 2026-09-14) --------------
  //
  //: The fit's own shape constants. `headHeight` is `.tv__head`'s own CSS
  //: height (topology.css) — the column header sits INSIDE the pane and is
  //: not part of the DAG, so the budget has to give it back; a test pairs the
  //: two so the stylesheet cannot drift from this number. `slack` keeps the
  //: longest bar off the window's own bottom edge. `minRows` floors the
  //: budget itself: a page whose chrome has eaten the whole viewport still
  //: gets a usable DAG (and scrolls) rather than a budget of zero.
  VA.DAG_FIT = { headHeight: 26, slack: 12, minRows: 8 };

  // How much vertical room the DAG has, from the pane's own top in DOCUMENT
  // coordinates and the window's height. Pure, so the browser tier can
  // re-derive the same number the render used from the same two measurements.
  VA.dagHeightBudget = function (paneTop, viewportHeight, metrics) {
    metrics = metrics || VA.RAIL_METRICS;
    var budget = viewportHeight - paneTop - VA.DAG_FIT.headHeight - VA.DAG_FIT.slack;
    return Math.max(budget, metrics.rowHeight * VA.DAG_FIT.minRows);
  };

  // The length the LARGEST edge is drawn at so the whole DAG lands on
  // `budget` — the fit that replaced the absolute cap.
  //
  // `ratios` is every edge row's value as a fraction of the serialisation's
  // largest (0 where there is nothing to scale by), `fixedHeight` is the node
  // rows' total (a node is a point; its slot never scales), `floor` is the
  // one-row minimum. Total height is
  //     fixedHeight + Σ max(floor, ratio × length)
  // which is non-decreasing in `length` and bottoms out at the UNIFORM height
  // (every ratio ≤ 1, so at length = floor every edge is at the floor). So:
  //
  //   - a budget at or below that bottom cannot be met — the floor wins, every
  //     edge floors, and the page scrolls. Honest overflow, never an
  //     unclickable bar;
  //   - otherwise the answer is exact, not searched: sort the ratios, and for
  //     each k assume the top k are above the floor and the rest sit on it.
  //     That fixes a linear equation in `length`; the consistent k (its own
  //     ratio at-or-above the floor, the next one at-or-below) is the answer.
  VA.fitEdgeLength = function (ratios, fixedHeight, floor, budget) {
    var n = ratios.length;
    if (!n) return floor;
    if (!(budget > fixedHeight + n * floor)) return floor;
    var sorted = ratios.slice().sort(function (a, b) { return b - a; });
    var sum = 0;
    var length = floor;
    for (var k = 0; k < n; k++) {
      if (!(sorted[k] > 0)) break;
      sum += sorted[k];
      length = (budget - fixedHeight - (n - 1 - k) * floor) / sum;
      var next = k + 1 < n ? sorted[k + 1] : 0;
      if (sorted[k] * length >= floor && next * length <= floor) return length;
    }
    return length;
  };

  // The value an edge's rendered length is proportional to under `mode`, or
  // null where the edge has nothing to scale by (a derived gap carries no
  // dimension at all; a variation-only edge has no stated nominal). This
  // subtraction is arithmetic about the SCREEN, not about a tolerance: the
  // number it produces is a pixel proportion, is never printed, and never
  // feeds anything but a bar length. min/max are what the projection always
  // populates when a dimension exists; plus_minus is the fallback the handoff
  // names for the case where they are absent.
  VA.edgeLengthValue = function (edge, mode) {
    var d = edge && edge.dimension;
    if (!d) return null;
    if (mode === "tolerance") {
      if (d.max !== null && d.max !== undefined &&
          d.min !== null && d.min !== undefined) {
        return Math.abs(d.max - d.min);
      }
      if (d.plus_minus !== null && d.plus_minus !== undefined) {
        return 2 * Math.abs(d.plus_minus);
      }
      return null;
    }
    if (mode === "absolute") {
      if (d.nominal === null || d.nominal === undefined) return null;
      return Math.abs(d.nominal);
    }
    return null;
  };

  // How far each of the two blocks — the DAG and the grid — is pushed down so
  // that they sit centred against each other instead of both top-aligned
  // (viewer_dag_spine_layout deliverable 3). Jeff: "Center the dag and the
  // grid view vertically with each other, this reduces the max amount of jog
  // required." Both offsets are ≥ 0: whichever block wants to sit higher
  // stays where it is and the other one moves.
  //
  // Centred across WHAT, though, is the whole of it, and the answer is the
  // LEADERS, not the two heights — measured, because centring the heights is
  // the obvious reading and it makes the page worse on real documents. A
  // scaled DAG puts its length wherever the big dimensions are: on the real
  // pitch_link_to_pitch_plate under tolerance width, all five leaders live in
  // the top 236px of a 691px DAG (the stretch is all below them), so
  // centring the BLOCKS drops the grid 241px and every leader that used to
  // jog ≤ 132px now jogs up to 228px the other way — the opposite of what
  // the change is for. Centring the leaders' own span (the offset midway
  // between the smallest and the largest leader jog) is what provably
  // minimises the largest jog on the page, which is the thing Jeff asked to
  // be smaller; on pitch_system it takes the max jog 507px → 208px, where
  // centring the blocks would have managed 234px.
  //
  // With no leaders at all there is nothing to centre across and nothing that
  // could be misaligned either, so the two blocks' own heights are the
  // fallback — that is also the only case where a taller GRID moves the DAG.
  VA.centreOffsets = function (rows, heights, plan, metrics) {
    if (!plan) return { dag: 0, grid: 0 };
    var gridHeight = plan.rows.length * metrics.rowHeight;
    var shift;
    if (plan.leaders.length) {
      // Each leader's own jog if the grid were left at the top: its node's y
      // in the DAG, less its seam's y in the grid.
      var top = 0;
      var nodeY = {};
      rows.forEach(function (row, i) {
        if (row.kind === "node") nodeY[row.row] = top + heights[i] / 2;
        top += heights[i];
      });
      var lo = null, hi = null;
      plan.leaders.forEach(function (leader) {
        var jog = nodeY[leader.layoutRow] - leader.boundary * metrics.rowHeight;
        if (lo === null || jog < lo) lo = jog;
        if (hi === null || jog > hi) hi = jog;
      });
      shift = (lo + hi) / 2;
    } else {
      var dagHeight = heights.reduce(function (a, b) { return a + b; }, 0);
      shift = (dagHeight - gridHeight) / 2;
    }
    return { dag: shift < 0 ? -shift : 0, grid: shift > 0 ? shift : 0 };
  };

  // The KEYED position store (viewer_edge_length_scaling, deliverable 3):
  // every layout row's vertical slot, computed once and addressed by id —
  // node id → y for the dots and the leaders, edge id → {y1, y2, floored} for
  // the bars — rather than emitted inline as `row × rowHeight`. This is the
  // seam the future study-selected animated rearrange needs: railGeometry and
  // leaderGeometry are pure functions of (layout, metrics, positions), so an
  // animator can interpolate between two of these stores and redraw per frame
  // without either geometry function changing.
  //
  //   nodes      { nodeId: y }                    dot centres
  //   edges      { edgeId: {y1, y2, y, floored} } bar extents
  //   byRow      { layoutRow: {top, height, y, floored, id, kind} }
  //   dagHeight  the DAG's own extent
  //   gridHeight the grid block's extent (rows × rowHeight), 0 without a fit
  //   offset     how far the DAG is pushed down to centre it (deliverable 3)
  //   gridOffset how far the GRID is pushed down to centre it
  //   height     the SVG's total height — the taller of the two blocks
  //
  // Node rows keep rowHeight in every mode — an interface is a point, and the
  // constant node slot is what keeps the branch fan-out curves' half-row
  // shape true. An edge row's height under a scaled mode is
  // (value / vmax) × maxLen, floored at floorRows × rowHeight; `floored` is
  // true wherever the drawn length is NOT the measured proportion (clamped up
  // to the floor, or no value to scale by at all), so a view can mark it and
  // a reader is never handed a fake proportion.
  //
  // `fit` is the viewport (viewer_dag_spine_layout, 2026-09-14), and it is
  // what the page passes and a pure caller does not:
  //
  //   { budget: px, plan: <VA.gridPlan's output> }
  //
  //   - `budget` is the room the DAG has (VA.dagHeightBudget). With one, the
  //     largest edge's length is SOLVED so the whole DAG lands on it, and the
  //     shorter of that and EDGE_LENGTH_SCALE.maxRows is drawn; without one
  //     the cap alone applies, which is what every pure caller and test still
  //     sees. The floor is never given up, so a DAG whose own edge count
  //     already overruns the budget overruns it honestly and the page
  //     scrolls.
  //   - `plan` is the grid beside it (VA.gridPlan), and it is the whole of
  //     deliverable 3: the two blocks are CENTRED against each other rather
  //     than both top-aligned, which is what drops the jog the leaders have to
  //     absorb. The grid's own row pitch never moves — it is offset as a
  //     block, by `gridOffset`, and the view applies that offset to the table
  //     it renders. See VA.centreOffsets for what "centred" means here and
  //     why it is measured across the leaders rather than across the two
  //     blocks' heights.
  VA.rowPositions = function (layout, topoProj, mode, metrics, fit) {
    metrics = metrics || VA.RAIL_METRICS;
    var rows = (layout && layout.rows) || [];
    var scaled = mode === "tolerance" || mode === "absolute";
    var index = scaled ? VA.topologyIndex(topoProj) : null;
    var floor = metrics.rowHeight * VA.EDGE_LENGTH_SCALE.floorRows;

    // The largest value in THIS serialisation (the whole walk, or a study's
    // chain) — the yardstick the mode's proportions are relative to.
    var vmax = 0;
    if (scaled) {
      rows.forEach(function (row) {
        if (row.kind !== "edge") return;
        var v = VA.edgeLengthValue(index.edges[row.id], mode);
        if (v !== null && v > vmax) vmax = v;
      });
    }

    // Every edge row's share of that yardstick, in row order, and the node
    // rows' fixed total — the two inputs the fit is solved from.
    var ratios = [];
    var fixedHeight = 0;
    rows.forEach(function (row) {
      if (row.kind !== "edge") { fixedHeight += metrics.rowHeight; return; }
      if (!scaled) { ratios.push(0); return; }
      var v = VA.edgeLengthValue(index.edges[row.id], mode);
      ratios.push(v !== null && vmax > 0 ? v / vmax : 0);
    });

    var budget = (fit && fit.budget) || 0;
    var maxLen = metrics.rowHeight * VA.EDGE_LENGTH_SCALE.maxRows;
    if (budget > 0) {
      maxLen = Math.min(maxLen,
        VA.fitEdgeLength(ratios, fixedHeight, floor, budget));
    }
    // The fit collapsed onto the floor: this serialisation's own edge count
    // fills the viewport before any proportion can be drawn at all, so every
    // bar comes out one row tall whatever its value. The widest edges land on
    // the floor by arithmetic rather than by clamping, and marking only the
    // OTHERS not-to-scale would hand a reader 24 identical bars of which 13
    // claim to be a measured proportion. Nothing on such a page is to scale,
    // and all of it says so. (pitch_system under tolerance width in a 1000px
    // window is exactly this, 13 edges tied at the widest band.)
    var collapsed = maxLen <= floor;

    // Pass one: every slot's height, and therefore the DAG's own extent.
    var heights = [];
    var flooredAt = [];
    var dagHeight = 0;
    var ei = 0;
    rows.forEach(function (row) {
      var h = metrics.rowHeight;
      var floored = false;
      if (row.kind === "edge") {
        if (scaled) {
          var proportional = ratios[ei] * maxLen;
          if (proportional < floor || collapsed) {
            h = floor;
            floored = true;
          } else {
            h = proportional;
          }
        }
        ei++;
      }
      heights.push(h);
      flooredAt.push(floored);
      dagHeight += h;
    });

    // Pass two: centre the two blocks against each other and lay the slots
    // out from there. Without a fit there is no grid to centre against, both
    // offsets are 0, and this is exactly the pre-fit store.
    var plan = fit && fit.plan;
    var gridHeight = (plan ? plan.rows.length : 0) * metrics.rowHeight;
    var centre = VA.centreOffsets(rows, heights, plan, metrics);

    var out = {
      mode: scaled ? mode : "uniform",
      height: Math.max(centre.dag + dagHeight, centre.grid + gridHeight),
      dagHeight: dagHeight,
      gridHeight: gridHeight,
      offset: centre.dag,
      gridOffset: centre.grid,
      byRow: {}, nodes: {}, edges: {},
    };
    var y = centre.dag;
    rows.forEach(function (row, i) {
      var h = heights[i];
      // `id`/`kind` on the slot are what make the store correspondable
      // ACROSS two serialisations (viewer_study_respine_animation): a layout
      // row INDEX is not comparable between the walk and a study's chain --
      // row 3 of one is not row 3 of the other -- so the respine tween pairs
      // the two stores by the element each slot belongs to, not by its key.
      var slot = { top: y, height: h, y: y + h / 2, floored: flooredAt[i],
                   id: row.id, kind: row.kind };
      out.byRow[row.row] = slot;
      if (row.kind === "node") out.nodes[row.id] = slot.y;
      if (row.kind === "edge") {
        // `length` is the slot's own height, stored as computed — y2 − y1
        // re-derives it through float addition and can differ in the last
        // bits, so a consumer comparing lengths reads this field.
        out.edges[row.id] = {
          y1: slot.top, y2: slot.top + h, y: slot.y,
          length: h, floored: flooredAt[i],
        };
      }
      y += h;
    });
    return out;
  };

  // What a FLOORED bar says about itself, in one place: the floor is a render
  // rule, and a reader mid-hover has no other way to know this one length is
  // not a proportion. Two carriers read the same words -- the plain hover
  // title (a caller with no card handler) and the edge card's own render note
  // (viewer_dag_hover_cards), which is what the bar shows once cards reach
  // the DAG.
  VA.FLOORED_RENDER_NOTE = "drawn at the minimum length, not to scale";

  VA.flooredEdgeTitle = function (edge, id) {
    return VA.edgeHoverTitle(edge, id) + " — " + VA.FLOORED_RENDER_NOTE;
  };

  // --- the respine tween (viewer_study_respine_animation, 2026-09-14) ------
  //
  // Selecting a study RE-SERIALISES the page: the whole walk's spine gives
  // way to that study's own chain, right-justified, in the order the sum
  // runs, with the grid re-ordered to match. Jeff asked for that to be a
  // movement rather than a repaint ("I asked for this before (including
  // smooth animation when the dag rearranges itself)"), and the seam
  // viewer_edge_length_scaling deliberately left for it is the keyed store
  // above: both geometry passes are pure functions of
  // (layout, metrics, positions), so an animator can hand them a store
  // interpolated between two renders and neither has to learn what an
  // animation is. There is no second layout path, and no geometry function
  // changed to get this.
  //
  // PRESENTATION ONLY, and the definition of done pins it: the animation's
  // last frame is a plain render with no tween at all, so the settled
  // geometry is the same numbers a fresh render of the same selection would
  // have produced. Nothing here rounds, clamps or re-derives a position.

  //: How long a respine takes. Short enough that a reader who clicked a study
  //: is not waiting for the answer, long enough that the eye can follow a row
  //: from where it was to where it went -- which is the whole point of
  //: animating it at all rather than repainting.
  VA.RESPINE = { duration: 260 };

  // Ease-in-out cubic, clamped to [0, 1]. Eased once by the caller and handed
  // to everything below as a plain fraction, so the tween, the fades and the
  // horizontal slide cannot end up on three different curves.
  VA.respineEase = function (t) {
    var x = !(t > 0) ? 0 : (t > 1 ? 1 : t);
    return x < 0.5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  };

  // A node and an edge are separate namespaces in the projection (a topology
  // index keeps two dicts), so a store correspondence keyed by id alone would
  // pair them if a document ever spelled one of each the same. Composite, and
  // the view reads it back through VA.tweenAlpha rather than spelling it.
  function slotKey(kind, id) {
    return String(kind) + "|" + String(id);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // Whether a bar mid-transition claims to be at a measured proportion.
  // Floored on EITHER side is marked for the whole flight -- while a bar is
  // moving, nothing about its length is a proportion of anything, so the
  // honest mark is the one that never under-claims. At the far end the
  // target's own flag is the only one left, which is what keeps a settled
  // tween identical to a fresh store.
  function flooredDuring(from, to, e) {
    return e >= 1 ? !!to : (!!from || !!to);
  }

  // The interpolated store: `from` (the store the previous paint drew from)
  // toward `to` (this paint's target), at the already-eased fraction `e`.
  // Shaped exactly like VA.rowPositions' output plus two fields, so
  // railGeometry and leaderGeometry take it unchanged.
  //
  //   alpha  { "kind|id": 0..1 } for every element that exists on ONE side
  //          only -- it FADES at its own settled position rather than sliding
  //          in from a place it never was, or out to one. Full-opacity
  //          elements are absent from the map; VA.tweenAlpha answers 1 for
  //          them.
  //   t      the eased fraction, for a view that needs it directly.
  //
  // Its KEY SET is the target's, in every one of `byRow`, `nodes` and
  // `edges`, at every `e` -- and "shaped exactly like VA.rowPositions'
  // output" above is that claim, not a loose one. It used to carry over any
  // node or edge the outgoing store had and the target does not, which made
  // a settled store a UNION rather than the target: inert, because both
  // geometry passes iterate the LAYOUT's rows and look positions up by id,
  // but it compounded across an interrupted respine (VA.lastTopoRender's
  // store is this one, and the animator reads it back as `from`), so a later
  // tween could interpolate from a stale key the current layout has no row
  // for. The rows a transition drops are drawn by the ghost, from the DOM the
  // outgoing paint already produced -- never from this store
  // (ISSUE_20260915_a_settled_tween_store_is_not_the_target_store_it_keeps_
  // the_outgoing_sides_keys).
  //
  // Only y is interpolated, and that is a real limit rather than an omission:
  // x is a function of the layout's COLUMN INDEX (VA.railX over row.column)
  // and a rail is not a keyed row, so there is nothing to pair the two
  // serialisations' rails on element by element. The horizontal change is
  // absorbed as an interpolation of the drawn layout instead -- the column
  // count and the pane width, VA.respineX below.
  VA.tweenPositions = function (from, to, e) {
    if (!from || !to) return to || from || null;
    var out = {
      mode: to.mode,
      height: lerp(from.height, to.height, e),
      dagHeight: lerp(from.dagHeight, to.dagHeight, e),
      gridHeight: lerp(from.gridHeight, to.gridHeight, e),
      offset: lerp(from.offset, to.offset, e),
      gridOffset: lerp(from.gridOffset, to.gridOffset, e),
      byRow: {}, nodes: {}, edges: {}, alpha: {}, t: e,
    };

    // The outgoing side's slots, by element -- see `id`/`kind` on the slot in
    // VA.rowPositions for why the pairing cannot go through the row key.
    // Entries are struck off as the target claims them, so whatever is left
    // is exactly what this transition DROPS.
    var leaving = {};
    Object.keys(from.byRow).forEach(function (key) {
      var slot = from.byRow[key];
      leaving[slotKey(slot.kind, slot.id)] = slot;
    });

    // byRow is keyed by the TARGET layout's row indices and nothing else:
    // those are the rows the frame is drawn from, and a row index carried
    // over from the other serialisation would collide with a different
    // element's.
    Object.keys(to.byRow).forEach(function (key) {
      var slot = to.byRow[key];
      var id = slotKey(slot.kind, slot.id);
      var prev = leaving[id];
      if (!prev) {
        out.byRow[key] = slot;
        out.alpha[id] = e;
        return;
      }
      delete leaving[id];
      out.byRow[key] = {
        top: lerp(prev.top, slot.top, e),
        height: lerp(prev.height, slot.height, e),
        y: lerp(prev.y, slot.y, e),
        floored: flooredDuring(prev.floored, slot.floored, e),
        id: slot.id, kind: slot.kind,
      };
    });
    Object.keys(leaving).forEach(function (id) {
      out.alpha[id] = 1 - e;
    });

    Object.keys(to.nodes).forEach(function (id) {
      out.nodes[id] = from.nodes[id] === undefined
        ? to.nodes[id]
        : lerp(from.nodes[id], to.nodes[id], e);
    });

    Object.keys(to.edges).forEach(function (id) {
      var b = to.edges[id];
      var a = from.edges[id];
      out.edges[id] = a ? {
        y1: lerp(a.y1, b.y1, e), y2: lerp(a.y2, b.y2, e),
        y: lerp(a.y, b.y, e), length: lerp(a.length, b.length, e),
        floored: flooredDuring(a.floored, b.floored, e),
      } : b;
    });

    return out;
  };

  // How opaque one element is in a tweened frame: 1 unless the store says it
  // is entering or leaving. Total, so a view can call it on everything it
  // draws without knowing whether an animation is running at all.
  VA.tweenAlpha = function (positions, kind, id) {
    var alpha = positions && positions.alpha;
    if (!alpha) return 1;
    var a = alpha[slotKey(kind, id)];
    return a === undefined ? 1 : a;
  };

  // The horizontal part of a respine: an interpolation of the DRAWN LAYOUT,
  // not a slide of the finished picture.
  //
  // This is what the keyed store cannot express. A column index is a claim
  // about the graph, the two serialisations disagree about how many columns
  // there are (the pitch system's walk needs ten; any one study's chain is
  // linear and needs one), and a rail belongs to a COLUMN rather than to an
  // element -- so there is nothing to pair the two frames' rails on the way
  // the store pairs their rows.
  //
  // What the two frames DO agree about is depth from the spine: both are
  // right-justified (viewer_dag_spine_layout), so the mainline is the last
  // column of either and a fork sits the same number of columns in from it on
  // both sides. So the thing to interpolate is the COLUMN COUNT. At `e` the
  // frame is drawn with lerp(fromColumns, toColumns) columns' worth of
  // spread, which puts every surviving rail exactly where the outgoing frame
  // drew it at e = 0 and exactly where a fresh render draws it at e = 1, and
  // UNFOLDS the columns a respine adds out of the spine rather than sliding
  // them in from a place they never were.
  //
  //   columnShift  how many columns' worth of spread this frame is short of
  //                the target's (negative when the target is the narrower
  //                one). A drawn column index is max(0, column -
  //                columnShift), and the clamp is what collapses a
  //                not-yet-unfolded column onto the leftmost rail instead of
  //                drawing it left of the pane.
  //   width        the SVG's own width this frame, which is the grid's left
  //                edge: lerp(fromWidth, toWidth). The jog zone's width is a
  //                function of the LEADER count, which the two serialisations
  //                also disagree about, so it is interpolated as a width
  //                rather than re-derived from the columns.
  //
  // It replaced a whole-block CSS translate right-anchored on the outgoing
  // frame's grid seam, and the reason that could not work generalises: the
  // pane's left edge is fixed, each frame is right-justified against its own
  // grid, and the two grids are hundreds of pixels apart -- so anchoring a
  // WIDER incoming block on the outgoing one's right edge necessarily puts
  // its left part outside the pane, where `.tv__hscroll`'s overflow-x clips
  // it. On the real pitch_system the first frame of a deselect drew all 45
  // of the walk's marks left of x = 0, and the DAG appeared to unfold from
  // behind the pane's edge
  // (ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_slides).
  //
  // `from` is the previous paint's own `{ columns, width }` -- fractional
  // mid-flight, because VA.lastTopoRender records what a frame DREW, so a
  // respine interrupting a respine continues from the picture on screen.
  VA.respineX = function (layout, plan, metrics, from, e, zoneScale) {
    metrics = metrics || VA.RAIL_METRICS;
    if (!from || !(from.columns > 0) || !(from.width > 0)) return null;
    var zone = zoneMetrics(layout, plan, metrics, zoneScale);
    if (!(zone.columns > 0) || !(zone.width > 0)) return null;
    var t = !(e > 0) ? 0 : (e > 1 ? 1 : e);
    return {
      columnShift: (1 - t) * (zone.columns - from.columns),
      width: zone.width + (1 - t) * (from.width - zone.width),
    };
  };

  // A drawn column's x. Total, so every geometry site reads one function
  // whether a transition is running or not -- a rail, its marks and either
  // end of a link that touches it cannot end up drawn at different x's.
  function columnX(column, metrics, x) {
    return VA.railX(x ? Math.max(0, column - x.columnShift) : column, metrics);
  }

  // --- the spine on the right (viewer_dag_spine_layout, 2026-09-14) -------
  //
  // The projection allocates column 0 to the walk's own mainline and every
  // fork a fresh column to its RIGHT, which is git-log's convention and was
  // the wrong one here: it puts the spine — the rail almost every leader
  // leaves from — as far from the grid as the diagram gets, so each of those
  // leaders has to cross every branch rail on its way out. Jeff, reviewing
  // the real pitch_system: "the DAG should start out as a right-justified
  // linear chain with legs/branches extending to the left".
  //
  // So: MIRROR the x-allocation at render time, column c → (columns − 1 − c).
  // The mainline lands in the rightmost column, directly beside the jog zone,
  // and branches extend left. This is a reflection, not a layout engine —
  // the walk order, rail continuity, column reuse and the one-dashed-curve-
  // per-cycle invariant are all properties of WHICH column a row is on
  // relative to the others, and a bijection on column indices preserves every
  // one of them. It stays out of the projection on purpose: which column an
  // edge lands on is a claim about the graph (and a pytest pins it), while
  // which SIDE the picture is justified to is a display preference about a
  // page that happens to have a grid on its right.
  //
  // Pure: the projection's own layout object is never mutated (the app holds
  // one parsed projection across every render), so this returns copies of the
  // three column-bearing collections and shares everything else.
  VA.spineRight = function (layout) {
    if (!layout || !layout.columns) return layout;
    var last = layout.columns - 1;
    var flip = function (c) {
      return typeof c === "number" ? last - c : c;
    };
    var mirrored = {};
    Object.keys(layout).forEach(function (key) { mirrored[key] = layout[key]; });
    mirrored.rows = (layout.rows || []).map(function (row) {
      return assign(row, { column: flip(row.column),
                           closes_column: flip(row.closes_column) });
    });
    mirrored.rails = (layout.rails || []).map(function (rail) {
      return assign(rail, { column: flip(rail.column) });
    });
    mirrored.links = (layout.links || []).map(function (link) {
      return assign(link, { from_column: flip(link.from_column),
                            to_column: flip(link.to_column) });
    });
    return mirrored;
  };

  // A shallow copy of `base` with `over`'s own keys written over it. ES5 by
  // house style (this page loads as a classic script, no build step), and
  // Object.assign is what it would be otherwise.
  function assign(base, over) {
    var out = {};
    Object.keys(base).forEach(function (key) { out[key] = base[key]; });
    Object.keys(over).forEach(function (key) {
      if (over[key] !== undefined) out[key] = over[key];
    });
    return out;
  }

  VA.railX = function (column, metrics) {
    return metrics.left + column * metrics.gutter;
  };

  VA.railY = function (row, metrics) {
    return row * metrics.rowHeight + metrics.rowHeight / 2;
  };

  // Everything the SVG needs, as plain numbers and path strings. Pure: same
  // layout in, same geometry out, which is what lets tests assert that a grid
  // row and its rail mark share a y without rendering anything.
  //
  // `positions` is the keyed store VA.rowPositions builds; omitted, it is
  // computed as uniform, so every pre-scaling caller is unchanged. An edge
  // mark carries its own y1/y2 (its slot's extent, inset 1px) and `floored`,
  // so the view draws the bar the store says rather than re-deriving
  // ±rowHeight/2 — the one place that arithmetic used to live.
  //
  // `options.x` is VA.respineX's, and only a transition frame has one: the
  // drawn columns are spread as the interpolated column count says rather
  // than as this layout's own.
  VA.railGeometry = function (layout, metrics, positions, options) {
    metrics = metrics || VA.RAIL_METRICS;
    positions = positions || VA.rowPositions(layout, null, "uniform", metrics);
    var x = (options && options.x) || null;
    var rows = (layout && layout.rows) || [];
    var slotY = function (row) {
      var slot = positions.byRow[row];
      return slot ? slot.y : VA.railY(row, metrics);
    };
    var out = {
      width: columnX((layout && layout.columns ? layout.columns - 1 : 0),
                     metrics, x) + metrics.left,
      height: positions.height,
      rails: [],
      marks: [],
      links: [],
    };

    (layout && layout.rails || []).forEach(function (rail) {
      var startRow = rows[rail.start];
      // A rail allocated at a fork starts at the fork's row but is drawn from
      // half a row below it: the `branch` curve covers that half, and a straight
      // line there would cross the dot it is supposed to fan out of. A fork's
      // row is a node row, and node slots are rowHeight in every length mode,
      // so the half-row is a constant.
      var forked = startRow && startRow.column !== rail.column;
      out.rails.push({
        column: rail.column,
        x: columnX(rail.column, metrics, x),
        y1: slotY(rail.start) + (forked ? metrics.rowHeight * 0.5 : 0),
        y2: slotY(rail.end),
        forked: !!forked,
      });
    });

    rows.forEach(function (row) {
      var slot = positions.byRow[row.row];
      var mark = {
        row: row.row,
        kind: row.kind,
        id: row.id,
        column: row.column,
        branch: !!row.branch,
        x: columnX(row.column, metrics, x),
        y: slotY(row.row),
      };
      if (row.kind === "edge" && slot) {
        mark.y1 = slot.top + 1;
        mark.y2 = slot.top + slot.height - 1;
        mark.floored = !!slot.floored;
      }
      out.marks.push(mark);
    });

    (layout && layout.links || []).forEach(function (link) {
      out.links.push({
        kind: link.kind,
        row: link.row,
        toRow: link.to_row,
        d: link.kind === "branch"
          ? branchPath(link, metrics, slotY, x)
          : closePath(link, metrics, slotY, x),
      });
    });
    return out;
  };

  // A fan-out at a fork: out of the node's dot, across to the new column, down
  // into the rail that starts there. Half a row tall, like git log's — and a
  // fork is a node, whose slot is rowHeight in every length mode, so the
  // curve's shape constants stay constants.
  function branchPath(link, metrics, slotY, x) {
    var x1 = columnX(link.from_column, metrics, x);
    var x2 = columnX(link.to_column, metrics, x);
    var y1 = slotY(link.row);
    var y2 = y1 + metrics.rowHeight * 0.5;
    return "M " + x1 + " " + y1 +
      " C " + x1 + " " + (y1 + metrics.rowHeight * 0.35) +
      " " + x2 + " " + (y1 + metrics.rowHeight * 0.15) +
      " " + x2 + " " + y2;
  }

  // A loop closing: up from the closing edge's bar to the dot of the node it
  // lands on, which the walk emitted earlier and therefore higher. Long on
  // purpose — a grounded loop that spans half the mechanism should look like it
  // does, not be hidden behind a short stub.
  function closePath(link, metrics, slotY, x) {
    var x1 = columnX(link.from_column, metrics, x);
    var x2 = columnX(link.to_column, metrics, x);
    var y1 = slotY(link.row);
    var y2 = slotY(link.to_row);
    var lift = Math.min(metrics.rowHeight * 1.5, Math.abs(y1 - y2) / 2);
    return "M " + x1 + " " + y1 +
      " C " + x1 + " " + (y1 - lift) +
      " " + x2 + " " + (y2 + lift) +
      " " + x2 + " " + y2;
  }

  // --- leaders + the merged-row grid (viewer_leader_line_grid, 2026-09-10) --
  //
  // The grid stopped being one-row-per-graph-element: it is one row per EDGE
  // (the tolerance contributions — the numbers a reviewer came for), grouped
  // into components, with a merged leftmost cell per group. Nodes left the
  // grid entirely; an interface's presence beside the rows is its LEADER — a
  // jogged, GD&T-ordinate-style line from its dot to the boundary between the
  // two edge rows it separates. And a leader is only drawn where it separates
  // two COMPONENTS: a node whose adjacent edges all carry the same `part`
  // (multiple tolerances on one feature — size + flatness on one distance) is
  // "internal" and gets none. That omission IS the component grouping (locked
  // 2026-09-10; it supersedes the earlier boundary-lasso question).

  // { nodeId: [part, ...] } — the DISTINCT part values on each node's adjacent
  // edges, first-seen order. `null` (a gap edge — no part; a real clearance)
  // is a value here, deliberately: a node between a structural edge and a gap
  // sits on a component boundary and must read as one.
  VA.nodeAdjacentParts = function (topoProj) {
    var byNode = {};
    ((topoProj && topoProj.nodes) || []).forEach(function (n) { byNode[n.id] = []; });
    ((topoProj && topoProj.edges) || []).forEach(function (e) {
      var part = e.part === undefined ? null : e.part;
      [e.from, e.to].forEach(function (nodeId) {
        var parts = byNode[nodeId] || (byNode[nodeId] = []);
        if (parts.indexOf(part) === -1) parts.push(part);
      });
    });
    return byNode;
  };

  // { nodeId: true|false } — internal means "all adjacent edges carry one
  // part", including the trivial degree-1 case (a chain end is inside its own
  // component, not a boundary between two).
  VA.internalNodes = function (topoProj) {
    var parts = VA.nodeAdjacentParts(topoProj);
    var internal = {};
    Object.keys(parts).forEach(function (nodeId) {
      internal[nodeId] = parts[nodeId].length <= 1;
    });
    return internal;
  };

  // The label a component group's merged cell prints. The part id, not the
  // long prose name — the name rides on the cell's hover title instead
  // (componentTitle below). A gap has no part and says what it is in the
  // words the old per-row part cell already used.
  VA.GAP_COMPONENT_LABEL = "— across a clearance —";

  VA.componentTitle = function (part) {
    if (!part) return "a gap: its two interfaces share no part";
    var text = part.name || part.id;
    if (part.drawing) text += " · drawing " + part.drawing;
    return text;
  };

  // --- the element cell drops its own component's name ---------------------
  //
  // Jeff, 2026-09-14: "nearly every row in the 'element' column starts with
  // the same phrase as the 'component' column to the left, which then robs a
  // bunch of the limited space, and then the meaningful content gets
  // truncated" -- under component `blade_root`, three rows all rendered
  // "blade-root clocking holes to th...". The prefix is saying, in the
  // narrowest column on the page, exactly what the merged cell immediately
  // left of it already says once for the whole group.
  //
  // DISPLAY ONLY. This never touches the document, the projection or any
  // value: the full label still rides on the cell's own hover title and is
  // what the detail pane prints, so nothing a reader can cite has been
  // shortened. A label that does not open with its component's name comes
  // back unchanged, and a label that is ONLY its component's name comes back
  // unchanged too -- an empty element cell would be a worse lie than a
  // repetitive one.
  //
  // The match is on WORDS, case- and separator-insensitive, so `blade_root`
  // (what the merged cell prints) catches "blade-root clocking holes" and
  // "Blade Root seat" alike, and never catches a word that merely starts the
  // same way ("blade_root" must not eat "blade_rooting_torque"). It is made
  // against the component cell's own text -- the part id -- because that is
  // the repetition being removed; a part's prose `name` lives on the cell's
  // hover card and was never in the element column to begin with.
  function labelWords(text) {
    return String(text === null || text === undefined ? "" : text)
      .toLowerCase().split(/[\s\-_]+/).filter(Boolean);
  }

  VA.elementDisplayLabel = function (label, componentLabel) {
    var text = String(label === null || label === undefined ? "" : label);
    var component = labelWords(componentLabel);
    if (!component.length) return text;
    var words = labelWords(text);
    if (words.length <= component.length) return text;
    for (var i = 0; i < component.length; i++) {
      if (words[i] !== component[i]) return text;
    }
    // Consume exactly that many words off the ORIGINAL string, so whatever
    // separators and capitalisation the rest of the label uses survive.
    var rest = text;
    for (var j = 0; j < component.length; j++) {
      var m = /^[\s\-_]*[^\s\-_]+/.exec(rest);
      if (!m) return text;
      rest = rest.slice(m[0].length);
    }
    rest = rest.replace(/^[\s\-_]+/, "");
    return rest || text;
  };

  // The whole plan of the merged-row grid, from one serialisation (a
  // topology's whole-graph walk or a study's chain — both carry the same row
  // shape). Everything the grid and the leaders need, keyed by id:
  //
  //   rows     [{ id, layoutRow, gridRow }]      one per edge, walk order
  //   groups   [{ part, label, title, start, count }]   contiguous runs
  //   leaders  [{ id, layoutRow, boundary, beforeEdge }]  non-internal nodes
  //   internal { nodeId: bool }
  //
  // A group breaks where the part changes between consecutive edge rows OR
  // where the node row between them is non-internal (a boundary node between
  // two same-part edges is possible at a fork, and honesty says break there
  // too — the leader and the group border then coincide). NOTE the converse
  // is not guaranteed: the depth-first walk can revisit a part on a later
  // branch (the pitch system's hub does), and each contiguous run gets its
  // own merged cell — reordering the grid to force one row per part would
  // cross the leaders and break the walk-order correspondence this page is
  // built on.
  //
  // A leader's `boundary` is a GRID row index: the number of edge rows the
  // walk emitted before the node, i.e. the seam between the edge above it and
  // the edge below it (0 = above the first row, rows.length = below the
  // last). `beforeEdge` is the edge id whose row starts at that seam, or null
  // at the very bottom — it is what lets a browser test measure the leader's
  // end against the actual row box rather than re-deriving arithmetic.
  VA.gridPlan = function (layout, topoProj) {
    var index = VA.topologyIndex(topoProj);
    var internal = VA.internalNodes(topoProj);
    var partsById = index.parts;

    var rows = [];
    var groups = [];
    var leaders = [];
    var prevPart = null;
    var pendingBoundaryNode = null;   // a non-internal node row since the last edge

    ((layout && layout.rows) || []).forEach(function (row) {
      if (row.kind === "node") {
        if (!internal[row.id]) {
          pendingBoundaryNode = row.id;
          leaders.push({
            id: row.id,
            layoutRow: row.row,
            boundary: rows.length,
            beforeEdge: null,        // filled in when the next edge row lands
          });
        }
        return;
      }
      if (row.kind !== "edge") return;
      var edge = index.edges[row.id] || null;
      var part = edge && edge.part !== undefined ? edge.part : null;
      var breakHere = rows.length === 0 || part !== prevPart ||
        pendingBoundaryNode !== null;
      if (breakHere) {
        groups.push({
          part: part,
          label: part === null ? VA.GAP_COMPONENT_LABEL : String(part),
          title: VA.componentTitle(part === null ? null : partsById[part] || { id: part }),
          start: rows.length,
          count: 0,
        });
      }
      groups[groups.length - 1].count += 1;
      for (var i = leaders.length - 1; i >= 0; i--) {
        if (leaders[i].boundary !== rows.length || leaders[i].beforeEdge !== null) break;
        leaders[i].beforeEdge = row.id;
      }
      rows.push({
        id: row.id,
        layoutRow: row.row,
        gridRow: rows.length,
        closes: row.closes_row !== null && row.closes_row !== undefined,
      });
      prevPart = part;
      pendingBoundaryNode = null;
    });

    return { rows: rows, groups: groups, leaders: leaders, internal: internal };
  };

  // The jogged leader lines, as path strings: from just right of the node's
  // dot, horizontally into the jog zone, vertically down/up the zone's own
  // lane, then horizontally into the grid at the boundary's y. Orthogonal
  // segments (GD&T ordinate-dimension style), so the grid's rows stay compact
  // and evenly spaced however unevenly the graph above is laid out — which is
  // the point: the DAG's y comes from the keyed position store (uniform row
  // pitch, or an edge-length scaling mode), and only these leaders have to
  // know.
  //
  // Lanes are strictly monotone in walk order, and no lane is ever reused —
  // the zone is (leaders × lane pitch) wide and that is the price of
  // legibility.
  //
  // This rule used to come with a proof that leaders CANNOT cross, and that
  // proof is no longer sound: it rested on leaders always rising
  // (structurally `y2 < y1`, the viewer_leader_line_grid lesson's own words),
  // which stopped being true the day viewer_dag_spine_layout centred the grid
  // against the DAG and let a leader above the centre descend. Two leaders
  // cross exactly when `y2[i] >= y1[i+1]`, and on the real pitch_system 16
  // pairs do -- all of them among the EIGHT leaders that descend, the half
  // above the centring point; the seven that still rise never cross (the
  // issue below carries the repro that prints it). Fixing it is a
  // layout-policy change and therefore not this function's to make unasked:
  // ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md,
  // with a test in both tiers asserting the crossings are still there so the
  // day they go away is a loud one.
  //
  // Pure: same layout, metrics and positions in, same geometry out. The node
  // y comes from the keyed position store (the same number railGeometry gives
  // its dot — under uniform, VA.railY over the node's layout row); the
  // boundary y is gridRow × rowHeight (the same number the grid's inline row
  // heights sum to), and it does NOT move with the length mode: the grid
  // stays evenly spaced however the DAG above it stretched, which is exactly
  // what these leaders exist to absorb.
  VA.leaderGeometry = function (layout, plan, metrics, positions, options) {
    metrics = metrics || VA.RAIL_METRICS;
    positions = positions || VA.rowPositions(layout, null, "uniform", metrics);
    options = options || {};
    var angled = options.style === "angled";
    // VA.respineX's, on a transition frame only. A leader crosses the whole
    // pane, so both its ends move: the node end rides the interpolated
    // columns, the same x railGeometry's marks are drawn at, and the grid end
    // rides the interpolated width. The zone between them stretches, which is
    // what keeps the lanes inside it at every frame.
    var x = options.x || null;
    var zone = zoneMetrics(layout, plan, metrics, options.zoneScale);
    var columns = zone.columns;
    var count = plan.leaders.length;
    var naturalZone = zone.naturalZone;
    var zoneLeft = columnX(columns - 1, metrics, x) + metrics.left;
    var width = x ? x.width : zone.width;
    // The zone at whatever width it has THIS frame -- the reader's own drag
    // at rest (viewer_leader_grid_legibility), and the stretch between the
    // two serialisations' zones mid-respine. The pad and the lane pitch scale
    // together either way, so the lanes stay evenly spread across it and a
    // settled frame is the reader's preference exactly. Jeff: "Make the width
    // of the area/column with the jogged leader lines resizable so that they
    // can be spread out more."
    var scale = naturalZone > 0 ? (width - zoneLeft) / naturalZone : zone.scale;
    var pad = metrics.leaderPad * scale;
    var lane = metrics.leaderLane * scale;

    var rowsByLayoutRow = {};
    ((layout && layout.rows) || []).forEach(function (row) {
      rowsByLayoutRow[row.row] = row;
    });

    var leaders = plan.leaders.map(function (leader, i) {
      var row = rowsByLayoutRow[leader.layoutRow] || { column: 0, branch: false };
      var dotR = row.branch ? metrics.branchDot : metrics.dot;
      var x1 = columnX(row.column, metrics, x) + dotR + 1.5;
      var y1 = positions.nodes[leader.id] !== undefined
        ? positions.nodes[leader.id]
        : VA.railY(leader.layoutRow, metrics);
      // The grid-side seam: the grid's own row pitch, plus however far the
      // grid block was pushed down to centre it against the DAG (the offset
      // the view applies to the table itself). The pitch never moves with the
      // length mode — the grid stays evenly spaced whatever the DAG did.
      var y2 = (positions.gridOffset || 0) + leader.boundary * metrics.rowHeight;
      var laneX = zoneLeft + pad + i * lane;
      // The polyline, node end first, grid end last -- the order the browser
      // tier reads the two contract points off (getPointAtLength 0 and total).
      // `points` is what the bands below are built from, so the two styles
      // need no second description of where a leader goes.
      var points = angled
        ? [[x1, y1], [width, y2]]
        : [[x1, y1], [laneX, y1], [laneX, y2], [width, y2]];
      return {
        id: leader.id,
        boundary: leader.boundary,
        beforeEdge: leader.beforeEdge,
        x1: x1, y1: y1, y2: y2, laneX: laneX,
        points: points,
        d: angled
          ? "M " + x1 + " " + y1 + " L " + width + " " + y2
          : "M " + x1 + " " + y1 +
            " H " + laneX +
            " V " + y2 +
            " H " + width,
      };
    });

    return {
      zoneLeft: zoneLeft, width: width, naturalZone: naturalZone,
      // The reader's own preference, clamped -- not the stretch a transition
      // frame's lanes are spread by, which is `width` minus `zoneLeft`.
      zoneScale: zone.scale, style: angled ? "angled" : "jogged",
      leaders: leaders,
      bands: bandGeometry(leaders, plan, width, positions.height || 0),
    };
  };

  // The jog zone, and therefore the width the SVG hands the grid: ONE owner
  // of the sum, because VA.leaderGeometry above reports it and VA.respineX
  // interpolates it, and a second copy of it is exactly the drift this repo
  // calls its most-repeated defect. The rails end at the spine -- the last
  // column, since viewer_dag_spine_layout mirrored the allocation -- and the
  // zone runs from there to the grid, (leaders x lane pitch) wide.
  function zoneMetrics(layout, plan, metrics, zoneScale) {
    var columns = (layout && layout.columns) || 1;
    var count = (plan && plan.leaders) ? plan.leaders.length : 0;
    var zoneLeft = VA.railX(columns - 1, metrics) + metrics.left;
    var naturalZone = metrics.leaderPad * 2 +
      (count ? (count - 1) * metrics.leaderLane : 0);
    var scale = VA.clampJogZoneScale(zoneScale === undefined ? 1 : zoneScale);
    return { columns: columns, zoneLeft: zoneLeft, naturalZone: naturalZone,
             scale: scale, width: zoneLeft + naturalZone * scale };
  }

  // --- the alternating bands (viewer_leader_grid_legibility, 2026-09-14) ---
  //
  // Jeff, reviewing the shipped arcs: "The jogged leader lines between the dag
  // and the grid view rows are near impossible to follow because the vertical
  // sections are so bunched up ... use alternating fill colors between the
  // leader lines (these same colors can be the alternating row background
  // colors)." So the region BETWEEN two adjacent leaders and the grid rows
  // that region feeds wear one tint, and an eye can ride a band across the
  // jog zone into its own rows instead of tracking one 1.5px line among all
  // the others.
  //
  // The tints are NEUTRAL and there are exactly two of them (topology.css's
  // --tv-band-a / --tv-band-b, the same two-greys-by-parity precedent the
  // rails already use). That is the page's hardest constraint, not a style
  // choice: green, amber, red and magenta are provenance here and nothing
  // else may wear them (README, "The colours"), and a categorical band
  // palette would both collide with that and run out of hues long before a
  // real mechanism runs out of bands.
  //
  // A band is indexed by how many leaders sit above it: band 0 is everything
  // above the first leader, band i is between leaders i-1 and i, and band
  // `leaders.length` is everything below the last. Its parity is its index's,
  // which is what makes the grid's row tint and the zone's band tint the same
  // decision made once. `startRow`/`endRow` are GRID row indices, half-open --
  // a leader's `boundary` is the seam above the row of that index, so the
  // band bounded below by leader i ends exactly where leader i points.
  VA.leaderBands = function (plan) {
    var leaders = (plan && plan.leaders) || [];
    var rows = (plan && plan.rows) || [];
    var bands = [];
    for (var i = 0; i <= leaders.length; i++) {
      bands.push({
        index: i,
        parity: i % 2,
        above: i === 0 ? null : leaders[i - 1].id,
        below: i === leaders.length ? null : leaders[i].id,
        startRow: i === 0 ? 0 : leaders[i - 1].boundary,
        endRow: i === leaders.length ? rows.length : leaders[i].boundary,
      });
    }
    return bands;
  };

  // { edgeId: 0 | 1 } -- which of the two tints each grid row wears, off the
  // same bands. One function, so "the row's tint" and "the band's tint" can
  // never be two answers: the view reads this for the <tr> and the band path
  // carries the same parity into the SVG.
  VA.rowBandParity = function (plan) {
    var out = {};
    var rows = (plan && plan.rows) || [];
    VA.leaderBands(plan).forEach(function (band) {
      for (var r = band.startRow; r < band.endRow; r++) {
        if (rows[r]) out[rows[r].id] = band.parity;
      }
    });
    return out;
  };

  // One filled polygon per band, bounded above and below by two adjacent
  // leaders and closed on the SVG's own left and right edges -- so the tint
  // runs from the rails, through the jog zone, right up to the grid's first
  // column, in either leader style. Drawn behind everything else and
  // hit-tested by nothing (topology.css), so nothing a reader can click or
  // read moves.
  //
  // The boundaries are a RUNNING MAXIMUM of the leaders, not the leaders
  // themselves, and that is the whole subtlety of this function.
  //
  // "The region between leader k-1 and leader k" is only a simple region
  // while the leaders do not cross -- and on the real pitch_system they cross
  // 16 times. That is not this handoff's doing and not a bug in the bands: a
  // leader's vertical run in its own lane crosses a LATER leader's horizontal
  // run whenever its grid-side seam sits at or below that later interface's
  // dot, which is exactly what the grid-against-DAG centring
  // (viewer_dag_spine_layout) made possible when it stopped leaders always
  // rising. Drawn literally, such a band folds over itself and its tint
  // doubles where it overlaps its neighbour -- a visible checkerboard right
  // where the page is meant to be getting MORE legible.
  // (ISSUE_20260914_leaders_cross_each_other_since_the_grid_was_centred.md
  // tracks the crossings themselves; they are a layout-policy question, which
  // is the other handoff's fence, not this one's.)
  //
  // So each boundary is clamped to sit at or below the one above it:
  // boundary_k = max(leader_k, boundary_k-1), pointwise in x. The bands then
  // TILE the pane exactly -- no overlap, no gap, no fold -- and every
  // boundary still IS its own leader everywhere the leaders behave, which is
  // everywhere except the crossing regions.
  function bandGeometry(leaders, plan, width, height) {
    var boundary = null;
    var boundaries = leaders.map(function (leader) {
      boundary = boundary
        ? maxProfile(leaderProfile(leader, width), boundary)
        : leaderProfile(leader, width);
      return boundary;
    });
    return VA.leaderBands(plan).map(function (band, i) {
      // `top`/`bottom` are the polygon's own two boundaries, kept because
      // they are what the tiling claim is ABOUT: band k's bottom is band
      // k+1's top, the same array, so adjacent bands cannot be given two
      // different edges and a test can say so without parsing a path string.
      var top = i === 0 ? [[0, 0], [width, 0]] : boundaries[i - 1];
      var bottom = i === leaders.length
        ? [[0, height], [width, height]] : boundaries[i];
      return {
        index: band.index,
        parity: band.parity,
        startRow: band.startRow,
        endRow: band.endRow,
        top: top,
        bottom: bottom,
        d: bandPath(top, bottom),
      };
    });
  }

  // A leader as a curve over the WHOLE width: its own polyline, extended
  // leftwards at the interface's own y to the SVG's left edge. x is
  // non-decreasing; a jogged leader's lane is a vertical jump (two points at
  // one x), which every routine below is written to tolerate.
  function leaderProfile(leader, width) {
    var points = [[0, leader.y1]];
    leader.points.forEach(function (pt) {
      if (pt[0] > 0) points.push([pt[0], pt[1]]);
    });
    points.push([width, leader.y2]);
    return dedupe(points);
  }

  function dedupe(points) {
    return points.filter(function (pt, i) {
      return i === 0 || pt[0] !== points[i - 1][0] || pt[1] !== points[i - 1][1];
    });
  }

  // The non-degenerate linear pieces of a profile -- the vertical jumps drop
  // out, because a jump is the gap BETWEEN two pieces rather than a piece.
  function profilePieces(profile) {
    var pieces = [];
    for (var i = 1; i < profile.length; i++) {
      if (profile[i][0] > profile[i - 1][0]) {
        pieces.push({ x0: profile[i - 1][0], y0: profile[i - 1][1],
                      x1: profile[i][0], y1: profile[i][1] });
      }
    }
    return pieces;
  }

  function pieceAt(pieces, xa, xb) {
    for (var i = 0; i < pieces.length; i++) {
      if (pieces[i].x0 <= xa && xb <= pieces[i].x1) return pieces[i];
    }
    return pieces.length ? pieces[pieces.length - 1] : null;
  }

  function interp(piece, x) {
    if (!piece || piece.x1 === piece.x0) return piece ? piece.y1 : 0;
    return piece.y0 + (piece.y1 - piece.y0) * (x - piece.x0) / (piece.x1 - piece.x0);
  }

  // Pointwise max of two profiles. Exact: every x where either profile bends
  // or jumps is a sample, so each interval holds one straight piece of each,
  // and the one place two straight pieces can swap order inside an interval
  // (they cross at most once) gets that crossing inserted as its own point.
  function maxProfile(a, b) {
    var pa = profilePieces(a);
    var pb = profilePieces(b);
    var xs = [];
    a.concat(b).forEach(function (pt) {
      if (xs.indexOf(pt[0]) === -1) xs.push(pt[0]);
    });
    xs.sort(function (p, q) { return p - q; });
    var out = [];
    for (var k = 0; k + 1 < xs.length; k++) {
      var xa = xs[k], xb = xs[k + 1];
      var sa = pieceAt(pa, xa, xb), sb = pieceAt(pb, xa, xb);
      var ay0 = interp(sa, xa), ay1 = interp(sa, xb);
      var by0 = interp(sb, xa), by1 = interp(sb, xb);
      out.push([xa, Math.max(ay0, by0)]);
      var d0 = ay0 - by0, d1 = ay1 - by1;
      if ((d0 < 0 && d1 > 0) || (d0 > 0 && d1 < 0)) {
        var t = d0 / (d0 - d1);
        out.push([xa + t * (xb - xa), ay0 + t * (ay1 - ay0)]);
      }
      out.push([xb, Math.max(ay1, by1)]);
    }
    return dedupe(out);
  }

  // The closed polygon between two boundaries: along the top left to right,
  // down the SVG's right edge, back along the bottom, up its left edge.
  function bandPath(top, bottom) {
    var seg = ["M " + top[0][0] + " " + top[0][1]];
    top.slice(1).forEach(function (pt) { seg.push("L " + pt[0] + " " + pt[1]); });
    for (var i = bottom.length - 1; i >= 0; i--) {
      seg.push("L " + bottom[i][0] + " " + bottom[i][1]);
    }
    seg.push("Z");
    return seg.join(" ");
  }

  // --- loose stacks: what the topology page absorbs the stack viewer for ---
  //
  // Most stacks in docs/tolerance_stacks/ have no topology document at all —
  // topology is opt-in per system, and re-expressing a stack as a graph is
  // extra authoring, not a free side effect of having one. So retiring the
  // stack viewer cannot mean "only render what a topology covers": this page
  // also has to offer every stack NO topology re-expresses, rendered exactly
  // as the stack viewer rendered it (views/stack.js, unchanged).
  //
  // Which stacks those are is read off the data already on hand, not a new
  // field: an edge that re-expresses a stack element carries `crop_key`
  // (`{stack, element}`), and that IS the linkage — the one committed L1 stack
  // covered by a topology is exactly the one every one of its edges' crop_keys
  // names. No schema change, no second source of truth.
  //
  // The stack ids ONE topology's own edges re-express, first-seen order, no
  // duplicates. Shared by VA.stacksCoveredByTopology (a flat "is this stack
  // covered by ANY topology" map) and VA.navTree (which needs to know covered
  // BY WHICH topology, to nest the stack under it) so the `crop_key.stack`
  // extraction lives in exactly one place.
  VA.topologyCoveredStackIds = function (topology) {
    var seen = {};
    var ids = [];
    ((topology && topology.edges) || []).forEach(function (e) {
      var stackId = e.crop_key && e.crop_key.stack;
      if (stackId && !seen[stackId]) {
        seen[stackId] = true;
        ids.push(stackId);
      }
    });
    return ids;
  };

  VA.stacksCoveredByTopology = function (topologies) {
    var covered = {};
    ((topologies && topologies.topologies) || []).forEach(function (t) {
      VA.topologyCoveredStackIds(t).forEach(function (id) { covered[id] = true; });
    });
    return covered;
  };

  VA.looseStacks = function (topologies, results) {
    var covered = VA.stacksCoveredByTopology(topologies);
    return ((results && results.stacks) || []).filter(function (s) {
      return !covered[s.id];
    });
  };

  // --- the single nav tree: one topology -> its studies (+ any stack it also
  // covers, nested rather than hidden) -> and every classic-only stack as a
  // leaf of the same tree (viewer_v2_single_nav, 2026-09-08). views/nav.js
  // renders this; nothing here touches the DOM.
  VA.navTree = function (topologies, results) {
    var stacksById = {};
    ((results && results.stacks) || []).forEach(function (s) { stacksById[s.id] = s; });
    var topoNodes = ((topologies && topologies.topologies) || []).map(function (t) {
      var coveredStacks = VA.topologyCoveredStackIds(t)
        .map(function (id) { return stacksById[id]; })
        .filter(Boolean);
      // One index per topology, not one per study: VA.studyAttention resolves
      // each chain row to its edge, and rebuilding the index inside the map
      // would walk this topology's edges once per study.
      var index = VA.topologyIndex(t);
      return {
        id: t.id,
        title: t.title,
        // The authored one-liner a short title demotes its qualification into
        // (stack_title_style_pass, 2026-09-14). views/nav.js shows it on hover
        // and nothing else reads it; absent on artifacts that need none.
        description: t.description || null,
        studies: (t.studies || []).map(function (s) {
          return { id: s.id, title: s.title, status: s.status,
                   description: s.description || null,
                   // Does it pass, and is there anything about the answer a
                   // reader must not miss — on the rail itself, so the shape of
                   // the whole document is readable without clicking through
                   // twenty studies one at a time
                   // (viewer_study_verdicts_and_gaps, deliverable 1).
                   verdict: VA.studyVerdict(s),
                   attention: VA.studyAttention(s, index) };
        }),
        coveredStacks: coveredStacks,
      };
    });
    return { topologies: topoNodes, looseStacks: VA.looseStacks(topologies, results) };
  };

  // --- hover reference cards (viewer_hover_cards_and_deep_links) ------------
  //
  // Pure models for the topology grid's hover cards, so the fast tier can pin
  // their contents without a DOM. views/cards.js renders them into the same
  // positioned popover the crop popover uses; topology_app.js's showCard
  // fetches the images they name. Cards are hover-only chrome: nothing in a
  // model or its rendering participates in the page's layout.

  // The edge card: every crop the crop index holds for this edge, plus its
  // citation. `crops` is a LIST on purpose: an interface's two half-sides are
  // usually different parts/drawings BY DEFINITION, so an edge should
  // eventually show BOTH sides' tolerance annotations — but crops.json
  // records one crop per citation and an edge carries one citation today, so
  // the list holds at most one entry and the second side is a stated gap
  // (this handoff's lesson), never an invented image.
  // `opts.renderNote` is the one thing a card can say that is a fact about the
  // PICTURE rather than about the edge (viewer_dag_hover_cards): a floored bar
  // used to carry that fact in its native title, and a card that absorbs the
  // title has to carry it instead or the not-to-scale warning is lost. Nothing
  // else is allowed in here -- a value belongs to the edge, not to the
  // trigger that opened its card.
  VA.edgeCard = function (topoProj, edge, crops, opts) {
    if (!edge) return null;
    var card = {
      kind: "edge",
      title: edge.name,
      id: edge.id,
      part: edge.part || null,
      confidence: edge.confidence,
      citation: (edge.dimension && edge.dimension.source_ref) || null,
      crops: [],
      noCropReason: null,
      annotateParams: null,
      renderNote: (opts && opts.renderNote) || null,
    };
    if (edge.crop_key) {
      card.crops.push({
        key: edge.crop_key,
        entry: VA.cropForKey(crops, edge.crop_key),
      });
    } else {
      var source = VA.VALUE_SOURCES[edge.value_source];
      card.noCropReason = (source ? source.title
        : VA.valueSourceText(edge.value_source)) + " No crop index covers it.";
    }
    // The deep link out to the annotator, under the SAME two rules the detail
    // pane applies: VA.needsAnnotation (a traced/inferred edge already has a
    // citation, and a binding is identity, never a value source, so the link
    // only offers something when there is a gap to close) AND an installed
    // mesh for the owning part (VA.partHasMesh) — an annotator without the
    // part's geometry cannot bind a face, so the gap-closing gesture the link
    // promises is not available. The gap stays on the gap list either way; the
    // honest fix is installing the mesh.
    if (topoProj && VA.needsAnnotation(edge.confidence) &&
        VA.partHasMesh(topoProj, edge.part)) {
      card.annotateParams = {
        topologyId: topoProj.id, edgeId: edge.id, part: edge.part || null,
      };
    }
    return card;
  };

  // The component card, for the grid's merged component cell: the part's own
  // identity (name, drawing, note) plus a thumbnail DERIVED from what exists
  // — the resolved crop of one of its OWN edges' tolerance annotations, which
  // is a crop of that part's drawing by construction (the edge's dimension is
  // a dimension OF the part; nothing is matched by filename or prefix). No
  // mesh render yet: the annotator has no snapshot verb (study_3d_flyout's
  // lesson), so a part none of whose edges' citations cropped gets NO
  // thumbnail — absent is absent, nothing invented and no placeholder.
  VA.componentCard = function (topoProj, partId, crops) {
    if (!partId) return null;   // the gap "component" is a clearance, not a part
    var part = VA.topologyIndex(topoProj).parts[partId] || { id: partId };
    var thumbs = [];
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      if (edge.part !== partId || !edge.crop_key) return;
      var entry = VA.cropForKey(crops, edge.crop_key);
      if (entry.status === "resolved") {
        thumbs.push({ edgeId: edge.id, edgeName: edge.name, entry: entry });
      }
    });
    return {
      kind: "component",
      title: part.name || part.id,
      id: part.id,
      drawing: part.drawing || null,
      revision: part.revision || null,
      note: part.note || null,
      thumbs: thumbs,
      // "view this part in 3D" only where there IS a 3D model of it: with two
      // installed meshes against ~29 topology parts, this link dead-ended in
      // the annotator's empty state for all but one of them.
      annotateParams: (topoProj && VA.partHasMesh(topoProj, part.id))
        ? { topologyId: topoProj.id, part: part.id } : null,
    };
  };

  // The word an adjacent edge with NO part gets wherever a node's sides are
  // listed. A clearance is a real side of an interface, not a missing one, so
  // it is named rather than skipped -- and named in the grid's own words.
  VA.CLEARANCE_SIDE_LABEL = "a clearance";

  // The same sides, ID-form: the words a surface that has no room for a part's
  // prose name prints for a node's sides. The node CARD labels each side with
  // the part's own component-card title, because it pairs the label with that
  // part's thumbnail; the grid's merged cell and the preview pane print the
  // part id instead (VA.GAP_COMPONENT_LABEL's own reasoning -- a live part
  // name runs to eighty characters). Two label styles, ONE derivation: both
  // read VA.nodeAdjacentParts, so the surfaces cannot disagree about WHICH
  // sides a node has -- which is exactly what they used to do (handoff
  // surfaces_that_state_something_false: the pane printed the node's authored
  // `parts` here and 10 of the 46 live nodes disagreed with their own card).
  VA.nodeSideIds = function (topoProj, nodeId) {
    return (VA.nodeAdjacentParts(topoProj)[nodeId] || []).map(function (part) {
      return part === null ? VA.CLEARANCE_SIDE_LABEL : part;
    });
  };

  // The node card (viewer_dag_hover_cards), for the DAG's own dots: a node is
  // an INTERFACE, so what a reader wants on hover is which parts meet there --
  // exactly what the preview pane already says, card-form, plus each adjacent
  // part's own thumbnail.
  //
  // Two facts, and they are not the same fact:
  //
  //   `declaredParts` is the document's own `parts` list on the node -- what
  //   the author said meets here.
  //   `sides` is DERIVED from the edges actually incident on the node
  //   (VA.nodeAdjacentParts), which is what the leader/internal rule reads and
  //   therefore what the picture is drawn from.
  //
  // The card shows the derived sides, because those are the ones whose
  // thumbnails it can honestly source: a side's thumbnail is that part's OWN
  // component-card thumbnail (VA.componentCard), so the two surfaces cannot
  // disagree about what a part's picture is. A part none of whose rows cropped
  // gets `thumb: null` and renders nothing -- absent is absent, the same rule
  // the component card follows.
  VA.nodeCard = function (topoProj, nodeId, crops) {
    var node = VA.topologyIndex(topoProj).nodes[nodeId];
    if (!node) return null;
    var adjacent = VA.nodeAdjacentParts(topoProj)[nodeId] || [];
    return {
      kind: "node",
      title: node.name,
      id: node.id,
      nodeKind: node.kind,
      degree: node.degree,
      branch: !!node.branch,
      note: node.note || null,
      citation: node.source_ref || null,
      confidence: node.confidence || null,
      declaredParts: (node.parts || []).slice(),
      // One predicate, shared with the leaders: internal means every adjacent
      // edge carries one part, the degree-1 chain end included.
      internal: !!VA.internalNodes(topoProj)[nodeId],
      sides: adjacent.map(function (partId) {
        if (partId === null) {
          return { part: null, label: VA.CLEARANCE_SIDE_LABEL, drawing: null,
                   revision: null, thumb: null };
        }
        var part = VA.componentCard(topoProj, partId, crops);
        return {
          part: partId,
          label: part.title,
          drawing: part.drawing,
          revision: part.revision,
          thumb: part.thumbs.length ? part.thumbs[0] : null,
        };
      }),
    };
  };

  // --- the inbound deep link, resolved against the data ----------------------
  //
  // (viewer_hover_cards_and_deep_links, deliverable 3.) What a parsed link
  // (VA.parseDeepLink) actually selects, checked id by id against the two
  // projections. Pure: topology_app.js applies `mode` and the ids through its
  // own selection functions and puts `notices` on the banner. Every id is
  // validated — an id this data does not contain becomes a plain-words notice
  // and the page falls back to its defaults, never a crash and never a silent
  // guess at a different node.
  VA.resolveDeepLink = function (link, topologies, results) {
    var out = { mode: null, topologyId: null, studyId: null, selection: null,
                stackId: null, elementId: null, notices: [] };
    if (!link) return out;
    var say = function (text) { out.notices.push(text); };

    var topology = link.topology ? VA.findTopology(topologies, link.topology) : null;
    if (link.topology && !topology) {
      say("This link asks for topology `" + link.topology + "`, which this " +
        "data does not contain — showing the default instead.");
    }
    var stackProj = link.stack ? VA.findStack(results, link.stack) : null;
    if (link.stack && !stackProj) {
      say("This link asks for stack `" + link.stack + "`, which this data " +
        "does not contain — showing the default instead.");
    }
    if (topology && stackProj) {
      say("This link names both a topology and a stack; the topology won " +
        "and stack `" + link.stack + "` was ignored.");
      stackProj = null;
    }

    if (topology) {
      out.mode = "topology";
      out.topologyId = topology.id;
      if (link.study) {
        if (VA.findStudy(topology, link.study)) {
          out.studyId = link.study;
        } else {
          say("This link asks for study `" + link.study + "`, which topology `" +
            topology.id + "` does not carry — showing the whole topology instead.");
        }
      }
      var index = VA.topologyIndex(topology);
      if (link.edge && link.node) {
        say("This link names both an edge and a node; the edge won.");
      }
      if (link.edge) {
        if (index.edges[link.edge]) {
          out.selection = { kind: "edge", id: link.edge };
        } else {
          say("This link asks for edge `" + link.edge + "`, which topology `" +
            topology.id + "` does not carry — nothing was selected.");
        }
      } else if (link.node) {
        if (index.nodes[link.node]) {
          out.selection = { kind: "node", id: link.node };
        } else {
          say("This link asks for interface `" + link.node + "`, which topology `" +
            topology.id + "` does not carry — nothing was selected.");
        }
      }
    } else if (stackProj) {
      out.mode = "stack";
      out.stackId = stackProj.id;
      if (link.element) {
        var elements = ((stackProj.stack || {}).elements) || [];
        var hit = elements.filter(function (e) { return e.id === link.element; });
        if (hit.length) {
          out.elementId = link.element;
        } else {
          say("This link asks for element `" + link.element + "`, which stack `" +
            stackProj.id + "` does not carry — nothing was selected.");
        }
      }
      if (link.study || link.edge || link.node) {
        say("This link carries a study/edge/node without a topology to look " +
          "it up in; those parts were ignored.");
      }
    } else {
      // No topology and no stack resolved. Any child param is dangling.
      if ((link.study || link.edge || link.node) && !link.topology) {
        say("This link names a study/edge/node without a `topology` beside " +
          "it, so those parts were ignored.");
      }
      if (link.element && !link.stack) {
        say("This link names an element without a `stack` beside it, so it " +
          "was ignored.");
      }
    }
    return out;
  };

  // --- the banner ----------------------------------------------------------

  VA.topologyBuiltLine = function (topologies, crops) {
    var parts = [];
    parts.push(topologies && topologies.built_at
      ? "topologies built " + topologies.built_at
      : "topologies NOT BUILT");
    parts.push(crops && crops.built_at
      ? "crops built " + crops.built_at
      : "crops NOT BUILT");
    return parts.join(" · ");
  };

  // What the page must not stay quiet about, over and above the shared
  // provenance alarms: a study whose topology is not in the projection at all.
  // The builder carries those rather than dropping them.
  VA.orphanStudyAlarms = function (topologies) {
    return ((topologies && topologies.orphan_studies) || []).map(function (row) {
      return "study `" + row.study + "` (" + row.source_file + ") names topology `" +
        row.topology + "`, which no document in docs/topologies/ declares";
    });
  };
})(window.ViewerApp = window.ViewerApp || {});
