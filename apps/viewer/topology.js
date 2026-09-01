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

  // An edge's stored value, printed AS TRANSCRIBED — String(n), no toFixed, no
  // band derived from the limits. Same rule as the stack viewer's element table.
  VA.dimensionText = function (edge) {
    var d = edge && edge.dimension;
    if (!d) return "—";
    return VA.fmt(d.nominal) + "  [" + VA.fmt(d.min) + " … " + VA.fmt(d.max) + "]";
  };

  // What a study's chain row multiplied this edge by. `sign` and `weight` are
  // both in the projection; this prints the two it carries and derives neither.
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

  // --- the rail geometry ---------------------------------------------------

  //: Row height, column pitch and the left margin, in CSS pixels. One object so
  //: the grid and the SVG cannot disagree: the grid's rows are laid out at
  //: exactly `rowHeight` and the SVG's marks at exactly `y(row)`, and alignment
  //: is then true by construction rather than by two stylesheets agreeing.
  VA.RAIL_METRICS = { rowHeight: 26, gutter: 20, left: 15, dot: 4.5, branchDot: 6.5 };

  VA.railX = function (column, metrics) {
    return metrics.left + column * metrics.gutter;
  };

  VA.railY = function (row, metrics) {
    return row * metrics.rowHeight + metrics.rowHeight / 2;
  };

  // Everything the SVG needs, as plain numbers and path strings. Pure: same
  // layout in, same geometry out, which is what lets tests assert that a grid
  // row and its rail mark share a y without rendering anything.
  VA.railGeometry = function (layout, metrics) {
    metrics = metrics || VA.RAIL_METRICS;
    var rows = (layout && layout.rows) || [];
    var out = {
      width: VA.railX((layout && layout.columns ? layout.columns - 1 : 0), metrics)
        + metrics.left,
      height: rows.length * metrics.rowHeight,
      rails: [],
      marks: [],
      links: [],
    };

    (layout && layout.rails || []).forEach(function (rail) {
      var startRow = rows[rail.start];
      // A rail allocated at a fork starts at the fork's row but is drawn from
      // half a row below it: the `branch` curve covers that half, and a straight
      // line there would cross the dot it is supposed to fan out of.
      var forked = startRow && startRow.column !== rail.column;
      out.rails.push({
        column: rail.column,
        x: VA.railX(rail.column, metrics),
        y1: VA.railY(rail.start, metrics) + (forked ? metrics.rowHeight * 0.5 : 0),
        y2: VA.railY(rail.end, metrics),
        forked: !!forked,
      });
    });

    rows.forEach(function (row) {
      out.marks.push({
        row: row.row,
        kind: row.kind,
        id: row.id,
        column: row.column,
        branch: !!row.branch,
        x: VA.railX(row.column, metrics),
        y: VA.railY(row.row, metrics),
      });
    });

    (layout && layout.links || []).forEach(function (link) {
      out.links.push({
        kind: link.kind,
        row: link.row,
        toRow: link.to_row,
        d: link.kind === "branch"
          ? branchPath(link, metrics)
          : closePath(link, metrics),
      });
    });
    return out;
  };

  // A fan-out at a fork: out of the node's dot, across to the new column, down
  // into the rail that starts there. Half a row tall, like git log's.
  function branchPath(link, metrics) {
    var x1 = VA.railX(link.from_column, metrics);
    var x2 = VA.railX(link.to_column, metrics);
    var y1 = VA.railY(link.row, metrics);
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
  function closePath(link, metrics) {
    var x1 = VA.railX(link.from_column, metrics);
    var x2 = VA.railX(link.to_column, metrics);
    var y1 = VA.railY(link.row, metrics);
    var y2 = VA.railY(link.to_row, metrics);
    var lift = Math.min(metrics.rowHeight * 1.5, Math.abs(y1 - y2) / 2);
    return "M " + x1 + " " + y1 +
      " C " + x1 + " " + (y1 - lift) +
      " " + x2 + " " + (y2 + lift) +
      " " + x2 + " " + y2;
  }

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
