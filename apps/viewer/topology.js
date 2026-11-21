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
(function (VA, VOCAB) {
  "use strict";

  // --- the vocabularies the projection can write ---------------------------
  //
  // Read out of apps/viewer/vocab.gen.js, which scripts/generate_js_vocabulary.py
  // renders from scripts/build_topology_projection.py's module-level tuples.
  // They were hand-copies here, paired word for word by a pytest module, until
  // 2026-09-23: a rename in Python is silent on this page until data moves, and
  // the first symptom is a loud "no branch for this" on a reader's screen, so
  // the copy is gone rather than checked.

  VA.TOPO_ROW_KINDS = VOCAB.list("TOPO_ROW_KINDS");
  VA.TOPO_LINK_KINDS = VOCAB.list("TOPO_LINK_KINDS");
  VA.STUDY_STATUSES = VOCAB.list("STUDY_STATUSES");
  // What a projected part's `mesh` block says (handoff
  // annotate_affordances_flyout_and_mesh_gating). Every part carries the block,
  // so a missing one means the projection predates the field rather than that
  // no mesh is installed — but VA.partMeshFact below deliberately reads BOTH as
  // "no mesh" and surfaces nothing about the difference. Rebuilding the
  // projection is the only thing that tells the two apart.
  VA.MESH_FACT_FIELDS = VOCAB.list("MESH_FACT_FIELDS");

  // These three are the DOCUMENTS' vocabularies rather than the projection's --
  // tolerance_stack.topology's NODE_KINDS, EDGE_KINDS and TRANSFORM_KINDS, which
  // each dataclass validates its own field against -- and they are here for the
  // same reason the three above are: the page branches on all three (a
  // `datum_feature` gets a filled dot, a `gap` gets a dashed bar and its own
  // chip, a non-`identity` transform raises the sensitivity chip) and each
  // branch has a silent default arm. They were written out a second time inside
  // tests.js's TOPO_VALUE_GUARDS until review/dag_viewer_poc; nothing paired
  // those copies to Python, which is the one thing an `inList` guard cannot do
  // for itself. Generated alongside the others since 2026-09-23 — the one
  // difference is which Python file the generator reads them from
  // (tolerance_stack/topology.py, named beside each in vocab.gen.js).
  VA.NODE_KINDS = VOCAB.list("NODE_KINDS");
  // The kind of contact a gap edge crosses, and what a form callout is in the
  // chain (tolerance_stack/topology.py). The symbol per contact kind on the
  // map is map.js's VA.MAP_SYMBOLS.
  VA.INTERFACE_KINDS = VOCAB.list("INTERFACE_KINDS");

  // What a reader calls each kind, wherever the page prints one in words (the
  // tree's interface rows, the Preview's chip): everyday words, never the
  // stored one. `contact` is the model view's word for a node two parts share
  // that states none (tolerance_stack/model_view.py, CONTACT_KIND): a seat.
  // Keyed through the generated vocabulary, so a word added in Python and
  // named nowhere here throws when the page loads (VOCAB.table compares the
  // key set).
  VA.INTERFACE_KIND_WORDS = Object.freeze(Object.assign({}, VOCAB.table("INTERFACE_KINDS", {
    planar: "planar",
    pin_in_bore: "pin in bore",
    spherical: "spherical",
    cylindrical_slide: "cylindrical slide",
    thread: "thread",
    clearance: "clearance",
    revolute: "rotary",
    fastener_pattern: "fastener pattern",
    press_fit: "press fit",
    transition_fit: "transition fit",
  }), { contact: "contact" }));

  // The word for `kind`, or "" for none. A kind with no row (a projection
  // newer than this page) reads as its own word, underscores spaced.
  VA.interfaceKindWord = function (kind) {
    if (!kind) return "";
    return VA.INTERFACE_KIND_WORDS[kind] || String(kind).replace(/_/g, " ");
  };
  VA.EDGE_KINDS = VOCAB.list("EDGE_KINDS");

  // What a reader calls a node's or an edge's own kind, where the Preview's
  // chip prints it: everyday words, never the stored spelling. Keyed through
  // the generated vocabularies, so a kind added in Python and named nowhere
  // here throws when the page loads.
  VA.ELEMENT_KIND_WORDS = Object.freeze(Object.assign({}, VOCAB.table("NODE_KINDS", {
    mating_surface: "mating surface",
    datum_feature: "datum feature",
  }), VOCAB.table("EDGE_KINDS", {
    structural: "dimension",
    gap: "gap",
  })));
  VA.elementKindWord = function (kind) {
    if (!kind) return "";
    return VA.ELEMENT_KIND_WORDS[kind] || String(kind).replace(/_/g, " ");
  };
  VA.FORM_KINDS = VOCAB.list("FORM_KINDS");
  VA.TRANSFORM_KINDS = VOCAB.list("TRANSFORM_KINDS");

  // Where an edge's value comes from. A total function with a loud fallback: the
  // three states read differently and collapsing any two is a lie. In
  // particular a `derived` gap has NO value on purpose — it is the quantity a
  // study computes — and rendering it like a dimension nobody filled in would
  // invert the meaning.
  VA.VALUE_SOURCES = VOCAB.table("VALUE_SOURCES", {
    // `title` is the chip's hover and `crop` the Preview's line where the
    // edge has no crop -- both reader-facing, so both in plain words: no code
    // spans, no field names, and each says what the thing IS
    // (the_demo_path_reads_cleanly_on_a_projector rewrote all six).
    inline: {
      label: "authored in the topology",
      title: "Its dimension is written in the topology document itself, for a " +
        "system authored topology-first.",
      crop: "No drawing cited.",
    },
    stack_ref: {
      label: "from a committed stack",
      title: "Its dimension is an element of a committed stack, read with its " +
        "value, citation and role.",
      crop: "The stack's element cites no drawing.",
    },
    derived: {
      label: "DERIVED — the quantity a study computes",
      title: "The gap between two real interfaces that a study computes as its answer.",
      crop: "A study computes it from the dimensions on either side.",
    },
  });

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
  VA.STUDY_ERRORS = VOCAB.table("STUDY_ERRORS", {
    BranchAmbiguity: {
      headline: "The selection reaches a fork",
      advice: "Two selected edges are unconsumed at one node, so the chain has a " +
        "choice to make. Drop one of the named edges from the selection.",
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
  });

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

  // --- tags (handoff bodies_and_studies_carry_forge_tags) -------------------
  //
  // A body or a study carries `tags: {axis: value}` on forge's identity axes
  // (docs/DAG_TOPOLOGY.md, "Tags"). A selection is `{axis: [value, ...]}` and
  // reads as drawing-checker's container tree does: OR within an axis, AND
  // across. Nothing here names an axis: the one the dimming reads arrives in the
  // projection as `variant_axis`, and the chips are whatever axes the tags use.

  // The chips' content: `[{axis, values: [...]}]`, axes in first-seen order,
  // values sorted, over the studies AND the bodies (a value that only a body
  // carries is still one a reader can select to dim the other side).
  VA.tagAxes = function (studies, bodies) {
    var axes = [];
    var seen = {};
    (studies || []).concat(bodies || []).forEach(function (owner) {
      var tags = (owner && owner.tags) || {};
      Object.keys(tags).forEach(function (axis) {
        if (!seen[axis]) { seen[axis] = {}; axes.push({ axis: axis, values: [] }); }
        if (!seen[axis][tags[axis]]) {
          seen[axis][tags[axis]] = true;
          axes.filter(function (a) { return a.axis === axis; })[0]
            .values.push(tags[axis]);
        }
      });
    });
    axes.forEach(function (a) { a.values.sort(); });
    return axes;
  };

  function chosen(selection, axis) {
    var values = selection && selection[axis];
    return values && values.length ? values : null;
  }

  // Does this study stay in the list? Every axis the reader has selected on
  // must be satisfied (AND) by one of its chosen values (OR). A study with no
  // tag on the VARIANT axis is neutral -- it folds nothing either variant owns
  // -- and stays; on any other axis an untagged study does not match.
  VA.studyMatchesTags = function (study, selection, variantAxis) {
    var tags = (study && study.tags) || {};
    return Object.keys(selection || {}).every(function (axis) {
      var values = chosen(selection, axis);
      if (!values) return true;
      if (tags[axis] === undefined) return axis === variantAxis;
      return values.indexOf(tags[axis]) !== -1;
    });
  };

  // The parts the second dimming reason covers: every part of a body whose
  // variant tag is not among the selected variants. A body with no variant tag
  // is shared and is never in the set.
  VA.otherVariantParts = function (topoProj, selection, variantAxis) {
    var out = {};
    var values = variantAxis ? chosen(selection, variantAxis) : null;
    if (!values) return out;
    ((topoProj && topoProj.bodies) || []).forEach(function (body) {
      var tag = body.tags && body.tags[variantAxis];
      if (tag === undefined || values.indexOf(tag) !== -1) return;
      (body.parts || []).forEach(function (id) { out[id] = true; });
    });
    return out;
  };

  // The words the surface says about a mark the rule dimmed.
  VA.OTHER_VARIANT_NOTE = "other variant";

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
  // label: a map mark's hit and a value-only grid row (deliverable 4) both
  // read this, rather than each
  // inventing its own text -- "one hover surface, not two".
  VA.edgeHoverTitle = function (edge, id) {
    return edge ? edge.name : String(id);
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

  // How the Preview says an edge's own transform: nothing for one-to-one
  // (the usual case, and a row with nothing to say shows nothing), else the
  // ratio in its units -- `0.5 mm per deg`.
  VA.transformWords = function (transform) {
    if (!transform || transform.kind === "identity") return null;
    return "scaled " + VA.fmt(transform.ratio) + " " +
      (transform.units_out || "?") + " per " + (transform.units_in || "?");
  };

  // The rolled-up result, as ROWS OF THE CONTRIBUTIONS GRID rather than as a
  // strip of pills (viewer_summary_balance_sheet, 2026-09-22). Jeff, on the
  // strip this replaces: "the weird ribbon of random values in circled
  // elements at the top ... The components of the stack are already arranged
  // into a table/grid, simply put the computed/rolled up values in the same
  // grid at the bottom, like a balance sheet/invoice."
  //
  // So each row here lands in the SAME four numeric columns a member row
  // fills — centre, low, high, and the row's own spread in the column a
  // member's contribution occupies — and the view does what it does for every
  // other row: prints them. Nothing is combined here; `nominal` and
  // `rss_center` are two different centres the projection already computed,
  // which is why they are two rows rather than one row and a loose chip.
  //
  // Straight off StudyResult.as_dict(), through VA.fmt (String(n): no toFixed,
  // no band derived from the limits), exactly as the old strip was.
  VA.studyTotalRows = function (study) {
    var r = study && study.result;
    if (!r) return [];
    return [
      { key: "worst_case", label: "worst case",
        center: VA.fmt(r.nominal),
        min: VA.fmt(r.worst_case_min), max: VA.fmt(r.worst_case_max),
        half: "± " + VA.fmt(r.worst_case_half), units: r.units,
        title: "Every contribution at its own worst end at once. The centre " +
          "column is the nominal; the spread is half the interval." },
      { key: "rss", label: "RSS",
        center: VA.fmt(r.rss_center),
        min: VA.fmt(r.rss_min), max: VA.fmt(r.rss_max),
        half: "± " + VA.fmt(r.rss_half), units: r.units,
        title: "A relative softening indicator, not a probability statement, " +
          "and not directly comparable to the worst-case row. Verdicts never " +
          "read it." },
    ];
  };

  // The bottom line of the same grid: one row per authored check — what it
  // has to be, how far the worst case is from that, and the verdict word,
  // once. `VA.studyCheckRow` already holds the words; this adds only the two
  // cells a table needs that a sentence did not, and neither is derived:
  // `margin` is CheckResult.margin as Python signed it, and `criterion` is
  // the check's own string, printed verbatim rather than re-spelled (a
  // re-spelling is a second vocabulary for an operator, and the only thing it
  // would buy is a prettier glyph).
  VA.studyMarginRows = function (study) {
    return ((study && study.checks) || []).map(function (check) {
      var row = VA.studyCheckRow(check);
      row.criterionText = check.criterion === null || check.criterion === undefined
        ? null : "must be " + check.criterion;
      row.marginValue = (typeof check.margin === "number"
        ? (check.margin > 0 ? "+" : "") + VA.fmt(check.margin)
        : "—") + " " + check.units;
      row.configuration = check.configuration || {};
      return row;
    });
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

  // What the totals are totals OF — the database-row-on-a-card half of
  // viewer_summary_balance_sheet (deliverable 3): parameter/value pairs, never
  // a sentence doing a table's job.
  //
  // The two ENDS are resolved to the interfaces' own names. They were the raw
  // node ids ("washer_far_face → cotter_hole_centerline") on the strip this
  // replaces, which is the rule every other pane on this page already follows
  // the other way round — a name on the surface, the id on the hover. Same for
  // `closes`, which named a derived gap by its edge id.
  VA.studyBasis = function (study, index) {
    if (!study) return [];
    var nodes = (index && index.nodes) || {};
    var edges = (index && index.edges) || {};
    var named = function (id, table) {
      var row = id ? table[id] : null;
      return { value: row && row.name ? row.name : (id ? missingLabel(id) : null),
               title: id || null };
    };
    var from = named(study.from, nodes);
    var to = named(study.to, nodes);
    var pairs = [
      { key: "from", label: "measured from", value: from.value, title: from.title },
      { key: "to", label: "measured to", value: to.value, title: to.title },
    ];
    if (study.closes) {
      var closes = named(study.closes, edges);
      pairs.push({ key: "closes", label: "closes the gap",
                   value: closes.value, title: closes.title });
    }
    var result = study.result;
    if (result) {
      pairs.push({ key: "contributions", label: "contributions",
                   value: String((result.chain || []).length),
                   title: "how many dimensions this study summed" });
      pairs.push({ key: "units", label: "units", value: result.units, title: null });
    }
    var worst = VA.studyWorstConfidence(study, index);
    if (worst) {
      pairs.push({ key: "weakest_input", label: "weakest input",
                   value: VA.CONFIDENCE_LABEL[worst] || worst,
                   confidence: worst,
                   title: "weakest wins: a study fed by nine traced edges and " +
                     "one untraced one is an untraced result" });
    }
    return pairs;
  };

  // An id the topology does not declare, said out loud rather than rendered
  // blank — the model-side twin of views/topology.js's `missing()`.
  function missingLabel(id) {
    return id + " — the study names an id the topology does not declare";
  }

  // --- does it pass, by how much, and what is missing -----------------------
  //
  // Everything below is a LOOKUP over fields the projection already carries.
  // Nothing here compares a tolerance or computes a margin: the verdict came
  // out of CheckResult.verdict and the margin out of CheckResult.margin, both
  // in Python, both against the check's own criterion. This file decides which
  // words go beside them.
  //
  // Until 2026-09-15 the DAG page rendered none of it — a study's verdict was
  // reachable only through a nested "classic view" row for the one stack a
  // topology also covers (a row since removed, and this is why:
  // viewer_nav_wedge_and_classic_retirement), and a study with no covered
  // stack had nowhere at all to state whether it passed. Jeff's review put it plainly: "None of the
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
    var open = VA.studyCompleteness(study, index);
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
    // One `incomplete` badge, whichever side says it: a check naming a term it
    // excluded, or the study's own derived completeness (no check needed).
    if (out.excluded.length || open) out.badges.push(badge("incomplete"));
    return out;
  };

  // The study's OWN completeness, derived in Python at fold time
  // (`StudyResult.completeness`, projected as `result.completeness`) and never
  // computed here. `null` when the study is complete or carries none -- a
  // complete study shows nothing extra. Otherwise the open terms by their
  // everyday names (the ids ride along only as the link target) and one
  // sentence for the hover.
  VA.studyCompleteness = function (study, index) {
    var found = study && study.result && study.result.completeness;
    if (!found || found.complete !== false) return null;
    var ids = found.open_terms || [];
    var chain = (study.result.chain || []).length;
    return {
      terms: ids.map(function (id) {
        var edge = index && index.edges ? index.edges[id] : null;
        return { id: id, name: edge ? edge.name : id };
      }),
      text: VA.ATTENTION.incomplete.text,
      title: ids.length + " of " + chain + " dimensions in this chain have " +
        "nothing traced behind them, so the answer is not the whole story.",
    };
  };

  // The separator an AUTHORED finding uses between what a thing is and why it
  // is a finding. Every excluded term in the live projection that carries a
  // reason at all carries it this way — "MS9363-09 nut height and
  // thread-start-to-castellation distance -- the height is printed in ...".
  //
  // That convention is the whole reason a row of the findings table can be
  // short without anything being dropped: the author already wrote the split,
  // so the table renders it instead of a paragraph, and the rationale sits one
  // disclosure away, word for word. A term with no separator is NOT cut at a
  // guessed point — it comes back whole as the name, and the row's own CSS
  // clamps it to one line with the full text in the fold.
  // (viewer_summary_balance_sheet, 2026-09-22: "Compress the wording, never
  // the facts".)
  //
  // It governs EXCLUDED TERMS and nothing else — see
  // VA.STUDY_FINDING_SOURCES' `reasonSplit` for the other half of that rule.
  var AUTHORED_REASON_SPLIT = / -- | — /;

  function findingText(text) {
    return String(text === null || text === undefined ? "" : text);
  }

  // A finding taken WHOLE: the string is the name and there is no rationale.
  // Two ways in — an authored term whose author wrote no separator, and every
  // string in a bucket the split convention does not govern.
  function wholeFinding(text) {
    var whole = findingText(text);
    return { name: whole, rationale: null, whole: whole };
  }

  VA.splitAuthoredFinding = function (text) {
    var whole = findingText(text);
    var at = whole.match(AUTHORED_REASON_SPLIT);
    if (!at) return wholeFinding(whole);
    return {
      name: whole.slice(0, at.index),
      rationale: whole.slice(at.index + at[0].length),
      whole: whole,
    };
  };

  // Which of VA.studyAttention's lists feeds each gap KIND, and whether the
  // strings in that list follow the AUTHORED_REASON_SPLIT convention above.
  // The kinds are VA.GAP_KINDS' own words and the rows come out in GAP_KINDS'
  // order — worst first — so a study's findings table and the assembly-wide gap
  // panel under it rank and name the same things the same way. A kind here that
  // GAP_KINDS does not declare is a vocabulary that has drifted, and a test
  // says so.
  //
  // `reasonSplit` exists because ` -- ` means TWO different things in this
  // projection (findings_splitter_scopes_to_excluded_terms, 2026-09-22):
  //
  //   * in an EXCLUDED TERM it separates what from why, because that is how
  //     the author of a check writes one. Split it;
  //   * in an `edge.name` or a `node.name` it is a NAMING convention,
  //     `name -- clarifier` — "piston end to end-stop feature -- the end
  //     stop", "flat washer far face -- the last modelled clamped surface".
  //     The unverified and no-tolerance buckets carry nothing BUT those names
  //     (VA.studyAttention pushes `edge.name`), so splitting one renames the
  //     edge on the row — to a name the grid one block above does not use —
  //     and files its clarifier in the fold as though it were the author's
  //     argument for why the value is unverified. Take it whole.
  //
  // In the three fields this table reads, 58 strings carry the separator (42
  // excluded terms, 7 edge names, 9 node names) -- and the projection as a
  // whole carries it in hundreds more, in `note`, `text` and `description`.
  // The glyph is not a vocabulary marker anywhere, which is why this is a
  // per-bucket declaration rather than one rule for the table.
  VA.STUDY_FINDING_SOURCES = {
    excluded_from_model: { bucket: "excluded", reasonSplit: true },
    unverified_value: { bucket: "unverified", reasonSplit: false },
    no_tolerance_recorded: { bucket: "noTolerance", reasonSplit: false },
  };

  // Everything that makes THIS study's answer less than its digits suggest, as
  // one row each (viewer_summary_balance_sheet, deliverable 4). It replaced
  // two generated paragraphs — the "budget for what is missing" preamble over
  // a bulleted term, and the "N dimensions in this chain are unverified ..."
  // sentence — both of which said in prose what a name, a phrase and a fold
  // say in a line.
  //
  // No facts leave: `rationale` is the author's own words after the split,
  // `whole` is the untouched text, and `closes` is what the gap panel already
  // says would close a gap of this kind. Which buckets get split at all is
  // VA.STUDY_FINDING_SOURCES' `reasonSplit`, not a rule written here.
  VA.studyFindings = function (study, index) {
    var attention = VA.studyAttention(study, index);
    var rows = [];
    Object.keys(VA.GAP_KINDS).forEach(function (kind) {
      var source = VA.STUDY_FINDING_SOURCES[kind];
      if (!source) return;
      var known = VA.GAP_KINDS[kind];
      (attention[source.bucket] || []).forEach(function (text) {
        var split = source.reasonSplit
          ? VA.splitAuthoredFinding(text)
          : wholeFinding(text);
        rows.push({
          kind: kind,
          name: split.name,
          rationale: split.rationale,
          whole: split.whole,
          says: known.says,
          closes: known.closes,
        });
      });
    });
    return rows;
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

  // The one-badge answer for a study, for the nav row and for the grid's own
  // verdict row where a study has no authored check to write one. `state` is a verdict word, or one of the two states a verdict
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

  // --- one status icon per nav row -----------------------------------------
  //
  // 2026-09-21 (viewer_nav_alert_badge_and_angled_default) folded a row's
  // FLAGS into one ⚠ and kept the verdict as a chip beside it. Jeff, looking
  // at the result on 2026-09-22: "get rid of the pass/fail in the left side
  // menu (move it into the alert along with all the other alerts)." Two
  // badges on a 300px row read as two competing marks, and the one carrying
  // the words was the smaller of them.
  //
  // So the rail now states ONE thing per row -- an icon -- and everything the
  // row has to say is in the hover, verdict first. That retires
  // VA.NAV_ALERT_VERDICT_STATES entirely rather than extending it: it existed
  // to split `no criterion` / `does not sum` (fold) from `pass` / `marginal` /
  // `fail` (chip), and with no chip left on the rail there is no split left to
  // make. Every state goes the same way now.
  //
  // What did NOT change: the words. A verdict line reads VA.studyVerdict's own
  // `word`, `says` and `title`; an attention flag reads VA.ATTENTION's. Nothing
  // on this rail is reworded here, and nothing is abbreviated onto a row.

  // Every verdict state, and which icon a nav row carrying it earns.
  //
  // Amber is the FLOOR -- an icon is only drawn where the row has something to
  // say at all -- and red is spent on exactly one state, `fail`. Two levels
  // and not five, because the words are all in the hover now: the colour's
  // whole job is to tell a scan of a 300px rail where to stop, and an emphasis
  // every row earns is an emphasis no row has (the house rule: one accent per
  // view).
  //
  // `pass` maps to NOTHING, and that is the quiet-row decision this pass had
  // to make: a row with a clean answer and nothing to admit draws no mark at
  // all. It reverses the 2026-09-15 reading that "a silent row on a rail of
  // verdicts reads as a row that passed" -- which was true while the rail was
  // a rail of verdicts, and is the intended reading now that it is a rail of
  // things to look at. Same posture apps/annotate/binding_state.js's
  // BINDING_STATE_ALERTS takes for `bound`.
  VA.NAV_STATUS_LOOK = "warn";
  VA.NAV_STATUS_WORST = "fail";

  // A composition, not a copy: tolerance_stack/stack.py's VERDICTS
  // (pass/marginal/fail) plus `none` and `error`, the two states a nav row
  // can carry that no verdict ever does (no study ran at all; the study ran
  // and raised). Same shape as apps/annotate/binding_state.js's
  // AA.BINDING_STATES -- a real vocabulary with no single Python owner to
  // generate from, because the extra words are this rail's own, not a
  // definition anywhere else -- so it stays hand-written rather than routed
  // through VOCAB.table.
  VA.NAV_VERDICT_LEVELS = {
    pass: null,
    marginal: VA.NAV_STATUS_LOOK,
    fail: VA.NAV_STATUS_WORST,
    none: VA.NAV_STATUS_LOOK,
    error: VA.NAV_STATUS_LOOK,
  };

  // A verdict word this viewer has no branch for is never drawn as a quiet
  // one: it is treated exactly as "no answer is recorded here", which is what
  // it is from the rail's point of view. Same posture as
  // VA.unlabelledVerdictText, one step further out.
  VA.navStatusLevel = function (verdict) {
    if (!verdict) return null;
    var level = VA.NAV_VERDICT_LEVELS[verdict.state];
    return level === undefined ? VA.NAV_VERDICT_LEVELS.none : level;
  };

  // The verdict, as the FIRST line of a row's hover -- "in plain words", which
  // is VA.VERDICTS' own `says` ("every build clears it"), pinned to the word it
  // explains and followed by the full sentence as the why. The three parts are
  // exactly what the grid's own verdict row already pairs (views/topology.js's
  // marginRow: the verdict chip, the check's label and its margin), so a
  // reader who learns the phrasing in one place meets it in the other.
  //
  // `says` is null on the two states that are not dispositions, and there the
  // word IS the plain-words statement ("no pass/fail criterion recorded yet").
  VA.navVerdictAlert = function (verdict) {
    if (!verdict) return null;
    return {
      kind: "verdict-" + verdict.state,
      text: verdict.word + (verdict.says ? " — " + verdict.says : ""),
      why: verdict.title,
    };
  };

  // Everything ONE study row has to say BESIDE its verdict, in reading order:
  // the attention flags in the order VA.studyAttention produced them. Not a
  // severity sort. A list because the icon showing it is one icon however many
  // there are, and shaped for VA.alertsCard ({ kind, text, why }) so the rail
  // opens the page's own popover rather than growing a second kind of popup.
  //
  // `study` is a nav-tree entry (VA.navTree's studies), not a projection
  // study: the verdict and the attention walk are already done there, once
  // per study, and re-deriving them per render would walk every topology's
  // edges again on every keystroke-cheap re-render the rail does.
  VA.studyNavAlerts = function (study) {
    var alerts = [];
    var verdict = study && study.verdict;
    ((study && study.attention && study.attention.badges) || []).forEach(function (flag) {
      alerts.push({ kind: flag.key, text: flag.text, why: flag.title });
    });
    // Never a bare verdict where the chain is short a term. The verdict line
    // states the disposition; this is the standing rule that the QUALIFICATION
    // arrives as a word of its own rather than only as a tint. It normally
    // arrives from the attention flags — an excluded term is *why* a check
    // reports `complete: false` — so this covers only the case where a check
    // says incomplete and names no excluded term.
    var named = alerts.some(function (alert) { return alert.kind === "incomplete"; });
    if (verdict && verdict.incomplete && !named) {
      alerts.push({ kind: "incomplete", text: VA.ATTENTION.incomplete.text,
                    why: VA.ATTENTION.incomplete.title });
    }
    return alerts;
  };

  // The whole of a row's mark: which icon, and what it says. `null` is a row
  // with nothing to state — a clean pass with no flag against it — and that
  // row renders nothing at all.
  //
  // Written once and called by both tiers, because the two differ ONLY in
  // where the verdict comes from. A row's level, the verdict-leads-the-card
  // order and the silence rule are the SCHEME, and "every nav tier is
  // consistent" is a deliverable a second copy of this body would quietly
  // stop satisfying the first time one copy was edited.
  function navStatus(verdict, alerts) {
    var level = VA.navStatusLevel(verdict);
    if (!level && !alerts.length) return null;
    var lead = VA.navVerdictAlert(verdict);
    return {
      level: level || VA.NAV_STATUS_LOOK,
      alerts: lead ? [lead].concat(alerts) : alerts,
    };
  }

  VA.studyNavStatus = function (study) {
    return navStatus(study && study.verdict, VA.studyNavAlerts(study));
  };

  // --- the same mark on a loose stack's row ---------------------------------
  //
  // A stack no topology re-expresses is a leaf of the same rail, and until now
  // it printed every one of VA.summaryChips' facts as its own chip — five on
  // `hub_bearing_thermal_fit_m1`, one of them the FILLED `UNTRACED`, so after
  // the 2026-09-21 fold these were the loudest rows on a rail whose study rows
  // wore two marks. Filed as "Still open (2)" on
  // ISSUE_20260916_the_viewer_nav_rail_may_be_the_left_side_menu_jeff_called_loud;
  // this is the answer, and it is the same scheme, which is the point ("every
  // nav tier is consistent", the 2026-09-22 handoff's deliverable 3).
  //
  // WHICH of the five fold is the question that issue left open, and the rule
  // is the one the rail now runs on: the rail states what asks you to look, and
  // nothing else. A count of traced values, where the checks came from and how
  // many probes were run are none of them something a reader is asked to act on
  // or distrust — they are the stack's scoreboard, and they are on the stack's
  // own page (views/stack.js renders the same VA.summaryChips there,
  // unchanged). What stays is what the repo's one rule is about: a value
  // nothing stands behind, a value with no band, and a check that is a budget
  // rather than an answer.
  //
  VA.STACK_NAV_ALERT_KINDS = {
    "zero-width": "no_tolerance",
    budget: "incomplete",
  };

  VA.stackNavAlerts = function (stackProj) {
    var alerts = [];
    VA.summaryChips(stackProj || {}).forEach(function (chip) {
      if (chip.kind === "confidence") {
        // The loud pair only. `traced` and `inferred` counts are a scoreboard.
        if (!VA.needsAnnotation(chip.confidence)) return;
        alerts.push({ kind: "unverified", text: chip.text,
                      why: VA.ATTENTION.unverified.title });
        return;
      }
      var kind = VA.STACK_NAV_ALERT_KINDS[chip.kind];
      // The chip's OWN words, moved rather than restated — VA.summaryChips
      // already reads them out of VA.ATTENTION and VA.VERDICT_SCOPES.
      if (kind) alerts.push({ kind: kind, text: chip.text, why: chip.title });
    });
    return alerts;
  };

  // A loose stack's own verdict, so its row can reach the same two levels a
  // study row can. Same combiner: VA.worstVerdict over the stack's checks, the
  // one this file already takes a study's disposition with, not a second one.
  //
  // This is the half of the consistency deliverable that is NOT just moving
  // what a row already showed. A stack row never carried a verdict — its chips
  // were counts — so leaving it that way would have been the literal reading.
  // But this pass is what gives the rail's colour a meaning ("red is a verdict
  // of `fail` and nothing else"), and `hub_bearing_thermal_fit_m1` fails a
  // check today: a rail where the amber rows include the one stack that fails
  // is a rail whose red is not worth scanning for. The colour has to be true
  // on every tier that can be flagged, or it is true on none.
  //
  // MINUS THE SENSITIVITY PROBES, and that is the whole of the care needed
  // here. A probe is the same check with an undocumented input moved, and the
  // stack page stamps it `NOT A RESULT` for exactly that reason
  // (views/stack.js). Two of m1's three failing checks are its `__k0`/`__k1`
  // probes; drawing a row red on a what-if is the "true of the model, false of
  // the hardware" misreading the repo exists to prevent. m1 still goes red, on
  // `lower_seat__sleeve_to_bearing__hot`, which is a result.
  //
  // `null` where no result check has a verdict this viewer knows. A stack gets
  // no "no pass/fail criterion recorded yet" the way VA.studyVerdict writes one
  // for a study with `checks: []`: nothing in the stack projection says a stack
  // was meant to have a criterion, so a row asserting the criterion is MISSING
  // would be this file inventing the expectation it then reports against.
  VA.stackVerdict = function (stackProj) {
    var results = ((stackProj && stackProj.checks) || []).filter(function (check) {
      return !check.sensitivity;
    });
    var worst = VA.worstVerdict(results);
    var known = VA.VERDICTS[worst];
    if (!known) return null;
    // No `incomplete`: a stack states that as an alert of its own already (the
    // budget-scope chip, via VA.STACK_NAV_ALERT_KINDS), and the study tier's
    // `incomplete` flag exists to cover a case this one cannot reach.
    return { state: worst, word: worst, says: known.says, title: known.title,
             incomplete: false };
  };

  VA.stackNavStatus = function (stackProj) {
    return navStatus(VA.stackVerdict(stackProj), VA.stackNavAlerts(stackProj));
  };

  // --- what is missing ------------------------------------------------------

  // What each kind of gap IS and what would close it, in plain words. The keys
  // are scripts/build_topology_projection.py's TOPOLOGY_GAP_KINDS, compared
  // against the generated vocabulary at load — the projection writes the kind
  // and the text, this table writes the heading and the way out, and neither
  // side restates the other.
  //
  // The KEY ORDER is this page's own and not the tuple's: the panel groups
  // worst first, which is the order the builder writes its rows in, and
  // VOCAB.table compares the key SET rather than the sequence precisely so a
  // display decision stays a display decision.
  // `says` is the same fact at ROW scale — what one line of the findings table
  // admits about itself, in a phrase short enough to sit in a column beside a
  // name (viewer_summary_balance_sheet, 2026-09-22). It is here rather than in
  // a second table because a reader meets both: the heading groups a panel of
  // gaps for the whole assembly, the phrase labels one row of one study's
  // findings, and the two must not describe the same kind in two vocabularies.
  // Where an open dimension's drawing stands (the projection's
  // `edges[].drawing_status`, handoff an_open_dimension_says_where_its_
  // drawing_stands): the chip each word wears where the dimension is shown,
  // the grid row and the Preview. `unknown` wears none -- drawing-checker's
  // runs could not be read, and nothing is claimed.
  VA.DRAWING_STATUSES = VOCAB.table("DRAWING_STATUSES", {
    read: { chip: "drawing read" },
    other_dash_read: { chip: "other dash read" },
    not_read: { chip: "no drawing yet" },
    no_drawing: { chip: "spec sheet" },
    unknown: { chip: null },
  });

  VA.GAP_KINDS = VOCAB.table("GAP_KINDS", {
    excluded_from_model: {
      heading: "Left out of the chain",
      says: "not folded into the total",
      closes: "Find a document that gives this dimension, add it to the chain, " +
        "and the verdict above stops being a budget and becomes an answer " +
        "about the joint.",
    },
    unverified_value: {
      heading: "Numbers with nothing behind them",
      says: "nothing readable stands behind it",
      closes: "Find the drawing callout or datasheet line that states the " +
        "dimension, and cite it on the row.",
    },
    no_tolerance_recorded: {
      heading: "Dimensions with no tolerance",
      says: "no plus/minus recorded — the spread is a lower bound",
      closes: "Find the plus/minus on the drawing. Until then every spread " +
        "these feed is a lower bound.",
    },
    contact_kind_not_stated: {
      heading: "Joints with no contact kind",
      says: "contact kind not stated",
      closes: "Say what kind of contact the joint is — flat faces, a pin, " +
        "a ball, a slide, a thread or a clearance — and the model draws it.",
    },
    form_not_folded: {
      heading: "Form callouts not in the total",
      says: "a form callout that can only tighten this band, not folded",
      closes: "The callout narrows what the size band allows; the total " +
        "still uses the size band alone.",
    },
    hardware_entry: {
      heading: "Open questions about the hardware",
      says: "an open question recorded against the part",
      closes: "Each is a question recorded against a part when it was " +
        "transcribed; closing one takes a source for what it asks about.",
    },
  });

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

  // --- the grid's row height -------------------------------------------------

  //: The grid's row height, in CSS pixels: every grid row is exactly
  //: `rowHeight` tall (views/topology.js's baseRow) and the grid's brackets
  //: are drawn off the same number (VA.braceGeometry), so a bracket's ends
  //: are row counts. The name is the rails' (the walk was drawn at this pitch
  //: until the map replaced it, the_map_is_the_only_drawing_and_classic_
  //: retires, 2026-11-17); the grid is the one reader left.
  VA.RAIL_METRICS = { rowHeight: 26 };

  // --- row density -----------------------------------------------------
  //
  // "See most of the grid at once" (HANDOFF_20260904_dag_viewer_vertical_budget.md)
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
    compact: { rowHeight: 18, label: "Compact" },
  };

  VA.applyRowDensity = function (density) {
    var preset = VA.ROW_DENSITIES[density] || VA.ROW_DENSITIES.comfortable;
    VA.RAIL_METRICS.rowHeight = preset.rowHeight;
    return preset;
  };

  // Which set of inks the bodies wear (the_dag_and_grid_nest_coloured_bodies_
  // and_compact_means_denser_rows, 2026-11-08): `bold`, a plotly-class
  // categorical set, or `cvd`, Okabe-Ito's eight first. The values are
  // topology.css's (`--tv-body-ink-*`, and the html[data-palette="cvd"]
  // block); the page sets the attribute (topology_app.js).
  VA.PALETTES = {
    bold: { label: "Bold" },
    cvd: { label: "Colour-blind" },
  };
  VA.PALETTE_ORDER = ["bold", "cvd"];

  // The view settings, remembered across sessions in one store entry (like
  // the group kinds, VA.readGroupKinds): which palette (VA.PALETTES). An
  // unreadable store, or a word outside its table, reads as the default.
  // The key keeps its `.2` and the entry its shape: the four settings that
  // drew the rails (colour overlay, group fill, graph width, part drawing)
  // retired with them (the_map_is_the_only_drawing_and_classic_retires,
  // 2026-11-17), and a stored entry still carrying them is read for its
  // palette alone.
  VA.DAG_VIEW_KEY = "tolstack.viewer.dagView.2";
  VA.DAG_VIEW_DEFAULTS = { palette: "bold" };

  VA.readDagView = function (store) {
    var out = Object.assign({}, VA.DAG_VIEW_DEFAULTS);
    try {
      var raw = store && store.getItem(VA.DAG_VIEW_KEY);
      var saved = raw ? JSON.parse(raw) : null;
      if (saved && typeof saved === "object") {
        if (VA.PALETTES[saved.palette]) out.palette = saved.palette;
      }
    } catch (err) {
      // Unreadable: the defaults.
    }
    return out;
  };

  VA.writeDagView = function (store, view) {
    try {
      if (!store) return;
      store.setItem(VA.DAG_VIEW_KEY, JSON.stringify({ palette: view.palette }));
    } catch (err) {
      // A browser that refuses to store it still draws it for this session.
    }
  };

  // A position-store key: a row's kind and id (VA.bandLayout keys its band by
  // it).
  function slotKey(kind, id) {
    return kind + "|" + id;
  }

  // --- the lit set, and the walk with everything outside it hidden ----------
  //
  // A page that emphasizes part of the model -- a chain study, a kinematic
  // study (the_kinematic_page_keeps_the_dag_and_says_each_contributor_once,
  // 2026-10-26) -- names that part as its LIT SET: `{ edges: {id: true},
  // nodes: {id: true} }`. The rails dim everything outside it, the grid holds
  // only its edges and the leaders run only to its nodes. A chain study's is
  // its chain and the nodes the chain stands on; a kinematic study's is
  // VA.kinematicLitSet (views/kinematic.js). null is "nothing emphasized":
  // the whole walk at full emphasis.
  VA.studyLitSet = function (study, topoProj) {
    if (!study || study.status !== "ok") return null;
    var edges = {};
    Object.keys(VA.chainIndex(study)).forEach(function (id) { edges[id] = true; });
    return VA.bridgeLitSet(topoProj, VA.closeLitSet(topoProj,
      { edges: edges, nodes: VA.chainNodes(study) }));
  };

  // The closure (the_lit_set_closes_over_its_joints, 2026-10-28): a gap edge --
  // a joint -- whose two ends are both lit is lit. A joint is what connects
  // the lit bodies, so leaving it out drew every body's lit edges as an
  // island when the unlit part was hidden, and left its glyph dimmed on the
  // active study. Lighting a joint adds no node, so one pass is the closure.
  // A joint carries no grid row: the grid lists contributors only, so the
  // edges the closure added are named in `lit.closed` and VA.gridPlan skips
  // them. Mutates and returns `lit`; a null topology leaves it as it is.
  VA.closeLitSet = function (topoProj, lit) {
    if (!topoProj || !lit) return lit;
    (topoProj.edges || []).forEach(function (edge) {
      if (edge.kind === "gap" && !lit.edges[edge.id] &&
          lit.nodes[edge.from] && lit.nodes[edge.to]) {
        lit.edges[edge.id] = true;
        (lit.closed = lit.closed || {})[edge.id] = true;
      }
    });
    return lit;
  };

  // The bridge: a lit set that stands in more than one piece is joined by the
  // shortest path through the model (fewest edges, ties broken by the
  // projection's own edge order) -- the edges and nodes on it are lit and, like
  // a closed joint, listed in `lit.closed` so the grid keeps listing only
  // contributors. Measured 2026-10-28: every chain study of the committed
  // topology is one piece already; the kinematic study is two (the end-stop
  // travel stack and the linkage), joined through the hub by two structural
  // edges, two nodes and the spindle coaxiality gap. Hiding the unlit model
  // drew that as two islands. Mutates and returns `lit`.
  VA.bridgeLitSet = function (topoProj, lit) {
    if (!topoProj || !lit) return lit;
    var edges = topoProj.edges || [];
    var adj = {};
    edges.forEach(function (edge) {
      (adj[edge.from] = adj[edge.from] || []).push({ to: edge.to, edge: edge.id });
      (adj[edge.to] = adj[edge.to] || []).push({ to: edge.from, edge: edge.id });
    });
    var pieces = function () {
      var parent = {};
      var find = function (x) {
        if (parent[x] === undefined) parent[x] = x;
        while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
        return x;
      };
      Object.keys(lit.nodes).forEach(function (n) { if (lit.nodes[n]) find(n); });
      edges.forEach(function (edge) {
        if (lit.edges[edge.id] && lit.nodes[edge.from] && lit.nodes[edge.to]) {
          parent[find(edge.from)] = find(edge.to);
        }
      });
      var groups = {};
      Object.keys(parent).forEach(function (n) { (groups[find(n)] = groups[find(n)] || []).push(n); });
      return Object.keys(groups).map(function (k) { return groups[k].sort(); })
        .sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
    };
    for (var guard = 0; guard < 64; guard++) {
      var groups = pieces();
      if (groups.length < 2) return lit;
      var home = {};
      groups.slice(1).forEach(function (g) { g.forEach(function (n) { home[n] = true; }); });
      var prev = {};
      groups[0].forEach(function (n) { prev[n] = null; });
      var queue = groups[0].slice();
      var hit = null;
      while (queue.length && hit === null) {
        var at = queue.shift();
        if (home[at]) { hit = at; break; }
        (adj[at] || []).forEach(function (step) {
          if (Object.prototype.hasOwnProperty.call(prev, step.to)) return;
          prev[step.to] = { from: at, edge: step.edge };
          queue.push(step.to);
        });
      }
      if (hit === null) return lit;      // no path in the model: leave the pieces
      lit.closed = lit.closed || {};
      for (var n = hit; prev[n]; n = prev[n].from) {
        lit.nodes[n] = true;
        lit.nodes[prev[n].from] = true;
        if (!lit.edges[prev[n].edge]) {
          lit.edges[prev[n].edge] = true;
          lit.closed[prev[n].edge] = true;
        }
      }
      VA.closeLitSet(topoProj, lit);
    }
    return lit;
  };

  // The lit set a list of edge ids makes: the edges, and every node either end
  // of one stands on -- so a node an unlit edge shares with a lit one is lit --
  // closed over the joints between lit nodes (VA.closeLitSet).
  VA.litSetOfEdges = function (topoProj, edgeIds) {
    var index = VA.topologyIndex(topoProj);
    var lit = { edges: {}, nodes: {} };
    (edgeIds || []).forEach(function (id) {
      var edge = index.edges[id];
      if (!edge) return;
      lit.edges[id] = true;
      lit.nodes[edge.from] = true;
      lit.nodes[edge.to] = true;
    });
    return VA.closeLitSet(topoProj, lit);
  };

  // What the walk outside the lit set does (Jeff, 2026-10-26): stays drawn,
  // dimmed -- the context for the lit part -- or is HIDDEN, because on a
  // product-sized model the unlit part is most of the picture. A display
  // preference like the leader style: one toggle on the topology toolbar,
  // cycling through `next`, applying to chain and kinematic pages alike.
  VA.UNLIT_STYLES = {
    dim: {
      label: "dimmed",
      next: "hide",
      title: "The parts of the model outside this study are drawn faintly " +
        "behind it. Click to hide them.",
    },
    hide: {
      label: "hidden",
      next: "dim",
      title: "Only this study's part of the model is drawn. Click to show " +
        "the rest of the model faintly behind it.",
    },
  };

  // Which a preference-less load draws, named once for the same reason
  // VA.DEFAULT_LEADER_STYLE is.
  VA.DEFAULT_UNLIT_STYLE = "dim";

  // Every rail and every link a walk's rows imply, re-derived from the rows
  // alone: an edge row is drawn down its column from the node it entered at
  // (a fork, when that node is on another column -- a `branch` link), and on
  // to the node it leaves at, or, for a loop-closing edge, a `close` link back
  // up to it. Touching runs on one column are one rail. On every committed
  // topology this reproduces the projection's own `rails` and `links`
  // exactly (the fast tier pins that), which is what makes it safe to use on
  // a walk the projection never laid out: the hidden one below.
  //
  // `skip(row)` leaves an edge row out: a chord inside a part's block
  // (VA.blockLayout) is drawn pin to pin, so it has no rail and no link.
  VA.walkRailsAndLinks = function (rows, skip) {
    var nodeRow = {};
    rows.forEach(function (row) { if (row.kind === "node") nodeRow[row.id] = row.row; });
    var runs = [];
    var links = [];
    rows.forEach(function (row) {
      if (row.kind !== "edge" || (skip && skip(row))) return;
      var entered = rows[nodeRow[row.entered_at]];
      if (!entered) return;
      runs.push({ column: row.column, start: entered.row, end: row.row });
      // An edge that leaves a COLLAPSED body (VA.collapseBodies) leaves the
      // pill's rim at the column its node was on, not at the pill's own.
      var from = row.rim_column !== undefined ? row.rim_column : entered.column;
      if (from !== row.column) {
        links.push({ kind: "branch", row: entered.row, from_column: from,
                     to_row: entered.row, to_column: row.column });
      }
      if (row.closes_row !== null && row.closes_row !== undefined) {
        links.push({ kind: "close", row: row.row, from_column: row.column,
                     to_row: row.closes_row, to_column: row.closes_column });
      } else if (nodeRow[row.left_at] > row.row) {
        runs.push({ column: row.column, start: row.row, end: nodeRow[row.left_at] });
      }
    });
    runs.sort(function (a, b) {
      return a.column - b.column || a.start - b.start || a.end - b.end;
    });
    var rails = [];
    runs.forEach(function (run) {
      var last = rails[rails.length - 1];
      if (last && last.column === run.column && run.start <= last.end) {
        last.end = Math.max(last.end, run.end);
      } else {
        rails.push({ column: run.column, start: run.start, end: run.end });
      }
    });
    return { rails: rails, links: links };
  };

  // The walk with everything outside `lit` taken out and the rest re-laid:
  // the lit rows keep their walk order and their columns' left-to-right
  // order, an emptied column is dropped (no blank lane left behind), and the
  // rails and links are re-derived from what is left (VA.walkRailsAndLinks)
  // -- so a run of the walk that a hidden edge used to join is two runs, and
  // nothing is drawn joining them. Applied to the PROJECTION's layout, before
  // VA.spineRight mirrors it, so the walk's mainline stays the right-hand
  // rail whenever any of it is lit. Pure: returns a new layout object.
  VA.hideUnlit = function (layout, lit) {
    if (!layout || !lit) return layout;
    var kept = (layout.rows || []).filter(function (row) {
      return row.kind === "edge" ? !!lit.edges[row.id] : !!lit.nodes[row.id];
    });
    var renumber = {};
    kept.forEach(function (row, i) { renumber[row.row] = i; });
    var used = {};
    kept.forEach(function (row) { used[row.column] = true; });
    var columns = Object.keys(used).map(Number).sort(function (a, b) { return a - b; });
    var column = {};
    columns.forEach(function (c, i) { column[c] = i; });
    var rows = kept.map(function (row) {
      var out = assign(row, { row: renumber[row.row], column: column[row.column] });
      if (row.kind === "edge" && row.closes_row !== null && row.closes_row !== undefined) {
        var lands = renumber[row.closes_row];
        out.closes_row = lands === undefined ? null : lands;
        out.closes_column = lands === undefined ? null : column[row.closes_column];
      }
      return out;
    });
    // A close whose landing node is hidden is no close any more; it has
    // nowhere to draw to. (Cannot happen from a lit set built on edge
    // endpoints, which always lights the landing node -- kept for a caller
    // that hands in a set of its own.)
    rows.forEach(function (row) {
      if (row.kind === "edge" && row.closes_row === null) row.closes_column = null;
    });
    var structure = VA.walkRailsAndLinks(rows);
    var out = {};
    Object.keys(layout).forEach(function (key) { out[key] = layout[key]; });
    out.columns = columns.length;
    out.rows = rows;
    out.rails = structure.rails;
    out.links = structure.links;
    return out;
  };

  // --- the active study as one band (the_active_study_is_a_compact_band_and_
  //     the_rest_of_the_model_hangs_above_and_below, 2026-10-28) ------------
  //
  // Jeff, 2026-10-28: "the active part of the model for any given study
  // becomes a straight vertical line, with the rest of the graph extending
  // above/below it ... so you don't have to scroll the graph to see all the
  // elements of the active study". His 2026-09-15 rule still holds -- the
  // entire model stays drawn when a study is selected -- and it was always
  // about VISIBILITY, not about the rows never moving. So nothing is hidden
  // and nothing is replaced: the walk's rows are RE-ORDERED so the lit ones
  // are one contiguous band, laid out on its own columns at the spine, and
  // the rest of the walk keeps its own columns above and below it.

  // Which side of the band each row goes to: `{ above, band, below }`, each a
  // list of the walk's own rows in walk order, or null with nothing lit.
  //
  // The lit rows keep their relative walk order and make the band. An unlit
  // row before the first lit row goes above, one after the last goes below.
  // An unlit row INSIDE the lit span goes to the side it is nearer -- but by
  // its connected piece, not row by row: the interleaved unlit rows are
  // grouped into the pieces their own edges join, and a piece moves as one,
  // judged by its mean row against the span's middle. Row by row, a side
  // branch forking off a lit node was torn in two (its first edge below, its
  // far node above) and joined back by a curve the height of the band. A piece
  // with an edge that forks off a LIT node goes below whatever its position:
  // an edge is drawn down from the node it was entered at, so above the band
  // it would have nothing above it to hang from.
  VA.bandSides = function (layout, lit) {
    if (!layout || !lit) return null;
    var rows = layout.rows || [];
    var isLit = function (row) {
      return !!(row.kind === "edge" ? lit.edges : lit.nodes)[row.id];
    };
    var first = -1;
    var last = -1;
    rows.forEach(function (row, i) {
      if (!isLit(row)) return;
      if (first === -1) first = i;
      last = i;
    });
    if (first === -1) return null;
    var nodeAt = {};
    rows.forEach(function (row, i) { if (row.kind === "node") nodeAt[row.id] = i; });
    var inside = function (i) { return i > first && i < last && !isLit(rows[i]); };
    // The interleaved unlit pieces, by union-find over their own edges.
    var parent = {};
    var find = function (i) {
      while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
      return i;
    };
    rows.forEach(function (row, i) { if (inside(i)) parent[i] = i; });
    rows.forEach(function (row, i) {
      if (!inside(i) || row.kind !== "edge") return;
      [row.entered_at, row.left_at].forEach(function (id) {
        var n = nodeAt[id];
        if (n !== undefined && inside(n)) parent[find(n)] = find(i);
      });
    });
    var pieces = {};
    Object.keys(parent).forEach(function (i) {
      var root = find(Number(i));
      var p = pieces[root] || (pieces[root] = { sum: 0, count: 0, hangs: false });
      p.sum += Number(i);
      p.count += 1;
      var row = rows[i];
      var entered = row.kind === "edge" ? nodeAt[row.entered_at] : undefined;
      if (entered !== undefined && isLit(rows[entered])) p.hangs = true;
    });
    var middle = (first + last) / 2;
    var out = { above: [], band: [], below: [] };
    rows.forEach(function (row, i) {
      if (isLit(row)) { out.band.push(row); return; }
      if (i < first) { out.above.push(row); return; }
      if (i > last) { out.below.push(row); return; }
      var p = pieces[find(i)];
      (!p.hangs && p.sum / p.count <= middle ? out.above : out.below).push(row);
    });
    // Below the band, an unlit edge that forks off a lit node is drawn AFTER
    // the node at its other end rather than before it: it then hangs from
    // that node and curves up to the band (VA.layWalk), where in walk order it
    // would run a rail down through every row of the band -- a column per such
    // edge. The node moves up one place; nothing else moves.
    var below = out.below;
    for (var b = 0; b + 1 < below.length; b++) {
      var edge = below[b];
      var next = below[b + 1];
      if (edge.kind === "edge" && lit.nodes[edge.entered_at] &&
          next.kind === "node" && next.id === edge.left_at) {
        below[b] = next;
        below[b + 1] = edge;
        b += 1;
      }
    }
    if (lit.order && lit.order.length) out.band = VA.orderBand(out.band, lit.order);
    return out;
  };

  // The band's rows in a lit set's own ORDER (`lit.order`, edge ids -- a
  // kinematic study's chain order, VA.kinematicStackOrder) rather than the
  // walk's, laid out as a walk: each edge after the node it hangs from, and
  // its other node right after it, so consecutive edges that share a node are
  // one rail. Where neither end of an edge is placed yet, the end the NEXT
  // edge does not share goes first, so the chain runs on into its next edge.
  // An edge the order does not name follows in walk order; a node no edge
  // reached, last. Pure.
  VA.orderBand = function (band, order) {
    var nodes = {};
    var edges = [];
    band.forEach(function (row) {
      if (row.kind === "node") nodes[row.id] = row;
      else if (row.kind === "edge") edges.push(row);
    });
    var rank = {};
    order.forEach(function (id, i) { if (rank[id] === undefined) rank[id] = i; });
    var walkAt = {};
    edges.forEach(function (row, i) { walkAt[row.id] = i; });
    edges.sort(function (a, b) {
      var ra = rank[a.id] === undefined ? order.length + walkAt[a.id] : rank[a.id];
      var rb = rank[b.id] === undefined ? order.length + walkAt[b.id] : rank[b.id];
      return ra - rb;
    });
    var out = [];
    var placed = {};
    var put = function (id) {
      if (id && nodes[id] && !placed[id]) { placed[id] = true; out.push(nodes[id]); }
    };
    edges.forEach(function (row, i) {
      var ends = [row.entered_at, row.left_at];
      if (!placed[ends[0]] && !placed[ends[1]]) {
        var next = edges[i + 1];
        var shared = next && (next.entered_at === ends[0] || next.left_at === ends[0]);
        if (shared) ends.reverse();
        put(ends[0]);
      } else if (!placed[ends[0]] && !nodes[ends[1]]) {
        put(ends[0]);
      }
      out.push(row);
      put(ends[0]);
      put(ends[1]);
    });
    band.forEach(function (row) { if (row.kind === "node") put(row.id); });
    return out;
  };

  // A list of a walk's rows, in a NEW order, laid out as a walk: each edge
  // re-derives which of its two nodes it is drawn down from (the one now
  // higher) and whether it continues down to the other or curves to it, and
  // every row gets a column. The rails and links come out of the rows
  // (VA.walkRailsAndLinks), exactly as hiding and collapsing do.
  //
  //   * An edge whose other node is now ABOVE it closes back up to it -- the
  //     walk's own loop closure.
  //   * An edge whose other node is below it continues down its column to
  //     that node, which then sits on the edge's column -- for ONE such edge
  //     per node (its arrival: the walk's own where that one is still a
  //     candidate, else the nearest). Any other edge arriving from above
  //     curves DOWN to the node instead, the same curve as a close the other
  //     way up; a re-ordered walk is where a node first gets two.
  //   * Columns are handed out in row order, an interval per edge from the
  //     node it hangs from to where its rail ends: `fixed(row)` pins a row's
  //     column outright; otherwise an edge tries `prefer(row)`, then the
  //     column of the node it hangs from (which is how a chain stays one
  //     rail), then the lowest free column. A column is free over an interval
  //     when nothing already on it reaches that far down and
  //     `reserved(column, top, bottom)` does not claim it -- which is how a
  //     column pinned further down stays clear for what is pinned to it. Two
  //     rails never share a column over any row, and a dot never sits on a
  //     rail it is not on.
  //   * `group(row)`: a node's arrival must come from its own group, which is
  //     how the band's nodes keep the columns the band laid them out on.
  //
  // Returns `{ rows, rails, links, columns }`, or null when some edge has
  // neither of its nodes above it (there is nothing to draw it down from --
  // VA.bandSides never builds that order).
  VA.layWalk = function (rows, opts) {
    opts = opts || {};
    var none = function () { return undefined; };
    var fixed = opts.fixed || none;
    var prefer = opts.prefer || none;
    var reserved = opts.reserved || function () { return false; };
    var group = opts.group || function () { return 0; };
    var at = {};
    rows.forEach(function (row, i) { if (row.kind === "node") at[row.id] = i; });
    // Per edge: the row of the node it hangs from (`from`), the row of its
    // other node (`to`), and how it reaches that one.
    var plan = [];
    var leaving = {};
    var candidates = {};
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (row.kind !== "edge") continue;
      var ends = [at[row.entered_at], at[row.left_at]]
        .filter(function (n) { return n !== undefined; })
        .sort(function (a, b) { return a - b; });
      if (!ends.length || ends[0] > i) return null;
      // Both nodes above: drawn down from the node the walk entered it at,
      // curving back to the other -- unless only the other is in the edge's
      // own group: an unlit edge hangs from an unlit node and curves to the
      // band, rather than running a rail down through it.
      if (ends.length > 1 && ends[1] < i) {
        var entered = at[row.entered_at];
        var other = entered === ends[0] ? ends[1] : ends[0];
        var hang = group(rows[entered]) !== group(row) && group(rows[other]) === group(row)
          ? other : entered;
        if (hang === ends[1]) ends.reverse();
      }
      var p = { i: i, from: ends[0], to: ends[1], close: false, merge: false };
      if (p.to === undefined || p.to < i) p.close = true;
      else (candidates[p.to] = candidates[p.to] || []).push(p);
      plan[i] = p;
      (leaving[p.from] = leaving[p.from] || []).push(p);
    }
    Object.keys(candidates).forEach(function (n) {
      var node = rows[n];
      var own = candidates[n].filter(function (p) {
        return group(rows[p.i]) === group(node);
      });
      var chosen = null;
      own.forEach(function (p) {
        var r = rows[p.i];
        if (r.left_at === node.id && (r.closes_row === null || r.closes_row === undefined)) {
          chosen = p;
        }
      });
      if (!chosen && own.length) chosen = own[own.length - 1];
      candidates[n].forEach(function (p) { if (p !== chosen) p.merge = true; });
    });

    var busy = {};
    var column = [];
    // Free from `top` (a node's row) down to `bottom`: whatever is on the
    // column already ends above `top`, or ends AT it on the very node an edge
    // is leaving from -- a chain going on down its own rail.
    var free = function (c, top, bottom, nodeId) {
      if (c === undefined || c < 0 || reserved(c, top, bottom)) return false;
      var b = busy[c];
      return !b || b.end < top || (b.end === top && nodeId !== null && b.node === nodeId);
    };
    var pick = function (tries, top, bottom, nodeId) {
      for (var t = 0; t < tries.length; t++) {
        if (free(tries[t], top, bottom, nodeId)) return tries[t];
      }
      for (var c = 0; ; c++) if (free(c, top, bottom, nodeId)) return c;
    };
    rows.forEach(function (row, r) {
      if (row.kind !== "node") return;
      var c = fixed(row);
      if (c === undefined) {
        var arrival = (candidates[r] || []).filter(function (p) { return !p.merge; })[0];
        c = arrival ? column[arrival.i] : pick([prefer(row)], r, r, null);
      }
      column[r] = c;
      busy[c] = { end: r, node: row.id };
      (leaving[r] || []).forEach(function (p) {
        var edge = rows[p.i];
        var through = !p.close && !p.merge;
        var bottom = through ? p.to : p.i;
        var col = fixed(edge);
        if (col === undefined) col = pick([prefer(edge), c], r, bottom, row.id);
        column[p.i] = col;
        busy[col] = { end: bottom, node: through ? rows[p.to].id : null };
      });
    });

    var out = rows.map(function (row, r) {
      var copy = assign(row, { row: r, column: column[r] });
      if (row.kind === "edge") {
        var p = plan[r];
        copy.entered_at = rows[p.from].id;
        if (p.to !== undefined) copy.left_at = rows[p.to].id;
        var curves = p.to !== undefined && (p.close || p.merge);
        copy.closes_row = curves ? p.to : null;
        copy.closes_column = curves ? column[p.to] : null;
      }
      return copy;
    });
    var structure = VA.walkRailsAndLinks(out);
    var columns = 0;
    column.forEach(function (c) { if (c + 1 > columns) columns = c + 1; });
    return { rows: out, rails: structure.rails, links: structure.links, columns: columns };
  };

  // How many times a drawn line crosses a rail it has no business touching:
  // scripts/build_topology_projection.py's `layout_crossings`, the same three
  // terms counted the same way (its docstring is the definition), in the
  // projection's column space -- before VA.spineRight mirrors it, so a leader
  // leaves "towards column 0". Here so the band can be held to it: the band's
  // own layout never crosses itself more than its rows did in the walk.
  VA.layoutCrossings = function (layout) {
    var rows = (layout && layout.rows) || [];
    var rails = (layout && layout.rails) || [];
    var links = (layout && layout.links) || [];
    var counts = { branch: 0, close: 0, leader: 0 };
    links.forEach(function (link) {
      var lo = Math.min(link.from_column, link.to_column);
      var hi = Math.max(link.from_column, link.to_column);
      var top = Math.min(link.row, link.to_row);
      var bottom = Math.max(link.row, link.to_row);
      rails.forEach(function (rail) {
        if (!(lo < rail.column && rail.column < hi)) return;
        if (link.kind === "branch") {
          if (rail.start === link.row) return;
          if (rail.start <= link.row && link.row <= rail.end) counts.branch += 1;
        } else if (Math.max(rail.start, top) <= Math.min(rail.end, bottom)) {
          counts.close += 1;
        }
      });
    });
    rows.forEach(function (row) {
      if (row.kind !== "node") return;
      // A block's inner pin (VA.blockLayout) is in the strip with no stub:
      // nothing it draws crosses a rail.
      if (row.pin && row.pin.side === "right") return;
      rails.forEach(function (rail) {
        if (rail.column < row.column && rail.start <= row.row && row.row <= rail.end) {
          counts.leader += 1;
        }
      });
    });
    counts.total = counts.branch + counts.close + counts.leader;
    return counts;
  };

  // The band's own columns. Laid out alone (VA.layWalk, a chain on one rail
  // and a branch on the next column for as long as it runs), then the
  // non-trunk columns permuted to cross least -- exhaustively, since a band is
  // a handful of columns wide -- and held against the columns the same rows
  // already had in the walk (VA.hideUnlit's, which order_columns chose over
  // the whole graph). Whichever crosses less wins; a tie goes to the narrower,
  // then to the re-laid one. So the band never crosses itself more than its
  // rows did in the walk.
  var BAND_PERMUTE_MAX = 6;

  function relabel(layout, order) {
    var to = {};
    order.forEach(function (c, i) { to[c] = i; });
    var rows = layout.rows.map(function (row) {
      var copy = assign(row, { column: to[row.column] });
      if (row.closes_column !== null && row.closes_column !== undefined) {
        copy.closes_column = to[row.closes_column];
      }
      return copy;
    });
    var structure = VA.walkRailsAndLinks(rows);
    return { rows: rows, rails: structure.rails, links: structure.links,
             columns: layout.columns };
  }

  function permutations(items) {
    if (items.length <= 1) return [items.slice()];
    var out = [];
    items.forEach(function (item, i) {
      var rest = items.slice(0, i).concat(items.slice(i + 1));
      permutations(rest).forEach(function (tail) { out.push([item].concat(tail)); });
    });
    return out;
  }

  function bandColumns(layout, lit, bandRows) {
    var laid = VA.layWalk(bandRows);
    var options = [];
    if (laid) {
      var others = [];
      for (var c = 1; c < laid.columns; c++) others.push(c);
      var orders = others.length <= BAND_PERMUTE_MAX ? permutations(others) : [others];
      orders.forEach(function (order) {
        options.push(relabel(laid, [0].concat(order)));
      });
    }
    // A band in a lit set's own order (VA.orderBand) is not the walk's order,
    // so the walk's columns are no option for it: the grid beside the band
    // reads its rows in the band's order, and a band drawn in another would
    // cross every leader.
    if (!(lit.order && lit.order.length) || !options.length) {
      var walked = VA.hideUnlit(layout, lit);
      options.push({ rows: walked.rows, rails: walked.rails, links: walked.links,
                     columns: walked.columns });
    }
    var best = null;
    var bestScore = null;
    options.forEach(function (option) {
      var score = [VA.layoutCrossings(option).total, option.columns];
      if (!best || score[0] < bestScore[0] ||
          (score[0] === bestScore[0] && score[1] < bestScore[1])) {
        best = option;
        bestScore = score;
      }
    });
    return best;
  }

  // The walk re-arranged around `lit`: the rows above the band, the band, the
  // rows below it (VA.bandSides), as one layout. The band takes the columns
  // nearest the spine -- 0..k-1 here, the rightmost once VA.spineRight mirrors
  // them -- and they are reserved over the band's rows, so every leader leaves
  // a lit dot toward the grid without crossing a single rail of the unlit
  // model. The rest of the walk keeps its own columns wherever they are free
  // (above and below the band that is nearly everywhere, so the model around
  // the band looks as it does in the walk) and takes the lowest free one where
  // not. Measured on the product model: no study widens the walk. Applied to
  // the PROJECTION's layout, before collapsing and mirroring, like
  // VA.hideUnlit.
  //
  // `options.only`: the band alone, renumbered from row 0 -- what the page
  // draws with the unlit model hidden, so hiding is the same picture as the
  // band with the rest taken away. Pure: returns a new layout; the walk's own
  // when nothing is lit, or (never, on a walk VA.bandSides ordered) when the
  // order cannot be drawn.
  VA.bandLayout = function (layout, lit, options) {
    var sides = VA.bandSides(layout, lit);
    if (!sides) return layout;
    var band = bandColumns(layout, lit, sides.band);
    var result = function (laid) {
      var out = {};
      Object.keys(layout).forEach(function (key) { out[key] = layout[key]; });
      out.rows = laid.rows;
      out.rails = laid.rails;
      out.links = laid.links;
      out.columns = laid.columns;
      return out;
    };
    if (options && options.only) return result(band);
    var k = band.columns;
    var bandColumn = {};
    band.rows.forEach(function (row) { bandColumn[slotKey(row.kind, row.id)] = row.column; });
    var inBand = function (row) {
      return bandColumn[slotKey(row.kind, row.id)] !== undefined;
    };
    var top = sides.above.length;
    var bottom = top + sides.band.length - 1;
    var laid = VA.layWalk(sides.above.concat(sides.band, sides.below), {
      fixed: function (row) { return bandColumn[slotKey(row.kind, row.id)]; },
      prefer: function (row) { return row.column; },
      reserved: function (c, from, to) { return c < k && from <= bottom && to >= top; },
      group: function (row) { return inBand(row) ? "band" : "rest"; },
    });
    return laid ? result(laid) : layout;
  };

  // The kinds of container the map and the grid draw (Jeff, 2026-10-29, for
  // the DAG's containers; the grid's since the rails retired, 2026-11-17;
  // the map's and the assemblies since 2026-11-19): the bodies, the
  // assemblies and the parts. Each is its own checkbox in the toolbar's
  // Groups popover. The store keeps the kinds switched OFF, so a choice
  // stored before a kind existed reads as that kind on, and one for a kind
  // no longer here (the two study kinds the rails drew) as nothing.
  VA.GROUP_KINDS = [
    { id: "bodies",     label: "Bodies" },
    { id: "assemblies", label: "Assemblies" },
    { id: "parts",      label: "Parts" },
  ];

  VA.GROUP_KINDS_KEY = "tolstack.viewer.groupKinds";

  // Every kind on, minus the ones this reader switched off for this topology
  // ({topologyId: [hidden kind, ...]} in the store). An unreadable store, or a
  // word outside VA.GROUP_KINDS, reads as "nothing switched off".
  VA.readGroupKinds = function (store, topologyId) {
    var on = {};
    VA.GROUP_KINDS.forEach(function (k) { on[k.id] = true; });
    try {
      var raw = store && store.getItem(VA.GROUP_KINDS_KEY);
      var all = raw ? JSON.parse(raw) : {};
      var hidden = all && typeof all === "object" ? all[topologyId] : null;
      if (Array.isArray(hidden)) {
        hidden.forEach(function (id) {
          if (Object.prototype.hasOwnProperty.call(on, id)) on[id] = false;
        });
      }
    } catch (err) {
      // Unreadable: everything on.
    }
    return on;
  };

  VA.writeGroupKinds = function (store, topologyId, on) {
    try {
      if (!store) return;
      var raw = store.getItem(VA.GROUP_KINDS_KEY);
      var all = raw ? JSON.parse(raw) : {};
      if (!all || typeof all !== "object" || Array.isArray(all)) all = {};
      all[topologyId] = VA.GROUP_KINDS.filter(function (k) { return !on[k.id]; })
        .map(function (k) { return k.id; });
      store.setItem(VA.GROUP_KINDS_KEY, JSON.stringify(all));
    } catch (err) {
      // A browser that refuses to store it still filters for this session.
    }
  };

  // The grid's outermost bracket is a body or a top-level assembly, never
  // both (Jeff's fallback in the_groups_switches_reach_the_map_and_the_grid_
  // brackets_an_assembly_in_two_bodies, 2026-11-19): an assembly in two
  // bodies bracketed inside each of them said its name once per body, or
  // not at all where a part inside it took the row. With both switched on,
  // the grid draws the one switched on last (VA.GRID_OUTER_KEY, per
  // topology; bodies until one is), and the map draws both.
  VA.GRID_OUTER_KINDS = Object.freeze(["bodies", "assemblies"]);
  VA.GRID_OUTER_KEY = "tolstack.viewer.gridOuter";

  VA.gridGroupKinds = function (on, outer) {
    var out = {};
    VA.GROUP_KINDS.forEach(function (k) { out[k.id] = !on || on[k.id] !== false; });
    if (out.bodies && out.assemblies) {
      out[outer === VA.GRID_OUTER_KINDS[1] ? VA.GRID_OUTER_KINDS[0] : VA.GRID_OUTER_KINDS[1]] = false;
    }
    return out;
  };

  VA.readGridOuter = function (store, topologyId) {
    try {
      var raw = store && store.getItem(VA.GRID_OUTER_KEY);
      var all = raw ? JSON.parse(raw) : {};
      var kind = all && typeof all === "object" ? all[topologyId] : null;
      return VA.GRID_OUTER_KINDS.indexOf(kind) >= 0 ? kind : VA.GRID_OUTER_KINDS[0];
    } catch (err) {
      return VA.GRID_OUTER_KINDS[0];
    }
  };

  VA.writeGridOuter = function (store, topologyId, kind) {
    try {
      if (!store || VA.GRID_OUTER_KINDS.indexOf(kind) < 0) return;
      var raw = store.getItem(VA.GRID_OUTER_KEY);
      var all = raw ? JSON.parse(raw) : {};
      if (!all || typeof all !== "object" || Array.isArray(all)) all = {};
      all[topologyId] = kind;
      store.setItem(VA.GRID_OUTER_KEY, JSON.stringify(all));
    } catch (err) {
      // A browser that refuses to store it still draws it for this session.
    }
  };

  // How many muted fills there are (topology.css's `--tv-body-0` ... ). A
  // body's tint is ASSIGNED, not cycled: its place in the document's own
  // `bodies[]`, so it does not change when the walk is hidden or collapsed,
  // and no two of a topology's first sixteen bodies share one. A seventeenth
  // body would take the first's -- the fast tier pins the live product model
  // under the count, so that day is a red test rather than a quiet clash.
  VA.BODY_TINTS = 16;

  // A body's tint: its place in the document's own `bodies[]`, modulo
  // VA.BODY_TINTS.
  VA.bodyTint = function (topoProj, bodyId) {
    var bodies = (topoProj && topoProj.bodies) || [];
    for (var i = 0; i < bodies.length; i++) {
      if (bodies[i].id === bodyId) return i % VA.BODY_TINTS;
    }
    return 0;
  };

  // Which body a part is carried by ({partId: bodyId}), off `bodies[].parts`.
  VA.bodyOfPart = function (topoProj) {
    var out = {};
    ((topoProj && topoProj.bodies) || []).forEach(function (body) {
      (body.parts || []).forEach(function (part) {
        if (out[part] === undefined) out[part] = body.id;
      });
    });
    return out;
  };

  // The top-level part each part is drawn as on the DAG ({partId: topId}),
  // off the authored `parts[].parent` (a_part_may_contain_parts, 2026-11-14):
  // an assembly's parts belong to the assembly's block and field, and the
  // DAG draws no nested outline of its own yet -- the + on a group and the
  // nested outline are the map's. A part with no parent is its own top.
  VA.topPartOf = function (topoProj) {
    var parent = {};
    ((topoProj && topoProj.parts) || []).forEach(function (p) {
      if (p && p.parent) parent[p.id] = p.parent;
    });
    var out = {};
    ((topoProj && topoProj.parts) || []).forEach(function (p) {
      var top = p.id;
      var seen = {};
      while (parent[top] && !seen[top]) { seen[top] = true; top = parent[top]; }
      out[p.id] = top;
    });
    return out;
  };

  // --- parts as groups ------------------------------------------------------
  //
  // The smallest group (the_dag_is_coloured_by_a_chosen_attribute_and_spaced_
  // to_taste): every maximal run of consecutive rows on one part, inside one
  // body, as {part, body, start, end, lo, hi}. An edge row is on its `part`; a
  // node row is on the part of the edge it continues (the row above, else the
  // row below) when that part meets there, else on its only part. A run holds
  // at least one edge: a part that is one face is its node's glyph, not a box.
  VA.partSpans = function (rows, topoProj) {
    rows = rows || [];
    var edges = {};
    var nodes = {};
    ((topoProj && topoProj.edges) || []).forEach(function (e) { edges[e.id] = e; });
    ((topoProj && topoProj.nodes) || []).forEach(function (n) { nodes[n.id] = n; });
    var top = VA.topPartOf(topoProj);
    var drawnAs = function (part) { return part ? top[part] || part : part; };
    var edgePart = function (row) {
      if (!row || row.kind !== "edge" || row.collapsed) return null;
      var e = edges[row.id];
      return drawnAs((e && e.part) || null);
    };
    var partOf = rows.map(function (row, i) {
      if (row.collapsed) return null;
      if (row.kind === "edge") return edgePart(row);
      var meets = ((nodes[row.id] && nodes[row.id].parts) || []).map(drawnAs);
      var above = edgePart(rows[i - 1]);
      if (above && meets.indexOf(above) !== -1) return above;
      var below = edgePart(rows[i + 1]);
      if (below && meets.indexOf(below) !== -1) return below;
      return meets.length === 1 ? meets[0] : null;
    });
    var spans = [];
    rows.forEach(function (row, i) {
      var part = partOf[i];
      if (!part) return;
      var run = spans[spans.length - 1];
      if (run && run.part === part && run.body === row.body && run.end === row.row - 1) {
        run.end = row.row;
        run.lo = Math.min(run.lo, row.column);
        run.hi = Math.max(run.hi, row.column);
        if (row.kind === "edge") run.edges++;
      } else {
        spans.push({ part: part, body: row.body, start: row.row, end: row.row,
                     lo: row.column, hi: row.column, edges: row.kind === "edge" ? 1 : 0 });
      }
    });
    return spans.filter(function (s) { return s.edges > 0; }).map(function (s) {
      return { part: s.part, body: s.body, start: s.start, end: s.end, lo: s.lo, hi: s.hi };
    });
  };

  // --- a part with many interfaces is a component with pins (a_part_with_
  // many_interfaces_is_drawn_as_a_component_with_pins, 2026-11-06) ----------
  //
  // Jeff: "model the part in the dag similar to a component in a circuit
  // diagram, as a rectangle with nodes along the perimeter for each
  // interface ... clustered together into a shape with relatively square
  // aspect ratio". Three pure steps:
  //
  //   1. VA.partPins: which part each node is a pin of. A node on one part is
  //      that part's; a contact face between two parts is a pin of the one
  //      with more interfaces (the pitch plate, not the washer on it), the
  //      first listed on a tie. A part with VA.BLOCK_MIN_PINS pins or more is
  //      a block; its edges between two of its own pins are its CHORDS.
  //   2. VA.gatherParts: the walk with each block's pins and chords moved up
  //      to where the part first appears, re-laid as a walk (VA.layWalk), so
  //      a part the depth-first walk visited three times is one run and one
  //      block (brief Q5). Applied to the projection's walk BEFORE the band,
  //      so the grid -- built off the drawn walk, as ever -- and the leaders
  //      follow it, and a kinematic band's own stack order still wins.
  //   3. VA.blockLayout: the drawn walk with every run of one block's rows
  //      marked -- pins and chords -- and its rails and links re-derived
  //      without the chords. (The rails drawing that drew each run as a
  //      rectangle retired 2026-11-17; the map draws a body as a district.)
  VA.BLOCK_MIN_PINS = 2;
  // A block's width over its height, at the uniform pitch: inside 1:2 to 2:1
  // for every pin count (the browser tier measures the drawn ones).
  VA.BLOCK_ASPECT = { min: 0.5, max: 2, target: 0.55 };

  VA.partPins = function (topoProj) {
    var nodes = (topoProj && topoProj.nodes) || [];
    // A part inside an assembly is a pin of the assembly's block
    // (VA.topPartOf): counted, and owning, as its top-level part.
    var top = VA.topPartOf(topoProj);
    var drawnParts = function (n) {
      var out = [];
      (n.parts || []).forEach(function (p) {
        var t = top[p] || p;
        if (out.indexOf(t) === -1) out.push(t);
      });
      return out;
    };
    var count = {};
    nodes.forEach(function (n) {
      drawnParts(n).forEach(function (p) { count[p] = (count[p] || 0) + 1; });
    });
    var owner = {};
    nodes.forEach(function (n) {
      var best = null;
      drawnParts(n).forEach(function (p) {
        if (best === null || count[p] > count[best]) best = p;
      });
      if (best !== null) owner[n.id] = best;
    });
    var pins = {};
    Object.keys(owner).forEach(function (id) {
      (pins[owner[id]] = pins[owner[id]] || []).push(id);
    });
    var blocks = {};
    Object.keys(pins).forEach(function (p) {
      if (pins[p].length >= VA.BLOCK_MIN_PINS) blocks[p] = true;
    });
    var chords = {};
    var outside = {};
    ((topoProj && topoProj.edges) || []).forEach(function (e) {
      var p = e.part ? top[e.part] || e.part : e.part;
      if (p && blocks[p] && owner[e.from] === p && owner[e.to] === p) {
        chords[e.id] = p;
        return;
      }
      outside[e.from] = true;
      outside[e.to] = true;
    });
    var out = { owner: {}, blocks: blocks, chords: chords, outside: {} };
    Object.keys(owner).forEach(function (id) {
      if (blocks[owner[id]]) {
        out.owner[id] = owner[id];
        out.outside[id] = !!outside[id];
      }
    });
    return out;
  };

  // The block part a row belongs to: a pin's part, a chord's part, else null.
  function blockPartOf(row, pins) {
    if (!row || row.collapsed) return null;
    return (row.kind === "node" ? pins.owner[row.id] : pins.chords[row.id]) || null;
  }

  // The columns of a re-laid walk, re-ordered while a move lowers `score`
  // (crossings, VA.layoutCrossings, of the walk as it will be drawn): the
  // walk's own column order (the builder's order_columns) does not survive a
  // re-lay, and this is its local search -- every swap of two columns and
  // every move of one column to another place, until neither helps. The
  // trunk's column is not held at 0: the crossings' leader term already
  // prefers the rails most leaders leave from nearest the grid, which is all
  // "the spine on the right" was for, and holding it cost 21 crossings on the
  // product model (the lesson's table). A local minimum, like the builder's
  // own past its exact width.
  function improveColumns(laid, score) {
    var best = laid;
    var bestScore = score(best);
    var n = best.columns;
    var identity = function () {
      var order = [];
      for (var c = 0; c < n; c++) order.push(c);
      return order;
    };
    var tryOrder = function (order) {
      var next = relabel(best, order);
      var s = score(next);
      if (s < bestScore) { best = next; bestScore = s; return true; }
      return false;
    };
    for (var pass = 0; pass < 12; pass++) {
      var moved = false;
      for (var a = 0; a < n; a++) {
        for (var b = 0; b < n; b++) {
          if (a === b) continue;
          var swap = identity();
          swap[a] = b;
          swap[b] = a;
          if (a < b && tryOrder(swap)) moved = true;
          // Column `a` moved to place `b`, the ones between shifted over.
          var seq = identity();
          seq.splice(b, 0, seq.splice(a, 1)[0]);
          var move = [];
          seq.forEach(function (col, place) { move[col] = place; });
          if (tryOrder(move)) moved = true;
        }
      }
      if (!moved) break;
    }
    return best;
  }

  // A walk laid out without its chords (`laid`), with them put back in
  // `order`'s places: every row renumbered, a close re-pointed at its node's
  // new row, and each chord on the column of the pin it hangs from, running
  // down to its other pin. Its rails are re-derived; VA.blockLayout drops the
  // chords' own again once it knows which runs are blocks.
  function withChords(laid, order, pins) {
    var placed = {};
    laid.rows.forEach(function (row) { placed[slotKey(row.kind, row.id)] = row; });
    var at = {};
    order.forEach(function (row, i) { at[slotKey(row.kind, row.id)] = i; });
    var rowOf = function (kind, id) { return at[slotKey(kind, id)]; };
    var rows = order.map(function (row, i) {
      var key = slotKey(row.kind, row.id);
      if (placed[key]) {
        var copy = assign(placed[key], { row: i });
        if (copy.kind === "edge" && copy.closes_row !== null && copy.closes_row !== undefined) {
          copy.closes_row = rowOf("node", laid.rows[copy.closes_row].id);
        }
        return copy;
      }
      return null;
    });
    for (var i = 0; i < order.length; i++) {
      if (rows[i]) continue;
      var row = order[i];
      var a = rowOf("node", row.entered_at);
      var b = rowOf("node", row.left_at);
      if (a === undefined || b === undefined) return null;
      var from = Math.min(a, b);
      var to = Math.max(a, b);
      if (from > i) return null;
      var column = rows[from].column;
      rows[i] = assign(row, {
        row: i, column: column,
        entered_at: order[from].id, left_at: order[to].id,
      });
      rows[i].closes_row = to < i ? to : null;
      rows[i].closes_column = to < i ? rows[to].column : null;
    }
    var structure = VA.walkRailsAndLinks(rows);
    return { rows: rows, rails: structure.rails, links: structure.links,
             columns: laid.columns };
  }

  // The walk's rows in the order VA.gatherParts lays them: each part's rows
  // are ONE run, wherever the depth-first walk reached it from. A block's
  // pins and chords move up to where the part first appears, as they always
  // have; then its other edges -- a dimension on the part's own drawing that
  // ends on another part's pin (the hub's two to the tangential-link mount)
  // -- follow them, and a part that is no block gathers its edges the same
  // way. An edge moves only to where one of its nodes is already above it
  // (VA.layWalk has nothing to draw it down from otherwise), so a part with
  // an edge that cannot move up yet is held back, whole, until every one of
  // its edges can, and is then laid at once. Node rows that are no block's
  // pin keep the walk's order.
  function gatheredOrder(rows, topoProj, pins) {
    var top = VA.topPartOf(topoProj);
    var edgePart = {};
    ((topoProj && topoProj.edges) || []).forEach(function (e) {
      if (e.part) edgePart[e.id] = top[e.part] || e.part;
    });
    var partOf = function (row) {
      if (!row || row.collapsed) return null;
      return blockPartOf(row, pins) || (row.kind === "edge" ? edgePart[row.id] || null : null);
    };
    var inWalk = {};
    rows.forEach(function (row) { if (row.kind === "node") inWalk[row.id] = true; });
    var own = {};
    var rest = {};
    rows.forEach(function (row) {
      var p = partOf(row);
      if (!p) return;
      var into = blockPartOf(row, pins) ? own : rest;
      (into[p] = into[p] || []).push(row);
    });
    var order = [];
    var placed = {};
    var done = {};
    var emit = function (row) {
      var key = slotKey(row.kind, row.id);
      if (done[key]) return;
      done[key] = true;
      order.push(row);
      if (row.kind === "node") placed[row.id] = true;
    };
    var movable = function (row) {
      var ends = [row.entered_at, row.left_at].filter(function (id) { return inWalk[id]; });
      return !ends.length || ends.some(function (id) { return placed[id]; });
    };
    var left = function (p) {
      return (rest[p] || []).filter(function (row) { return !done[slotKey(row.kind, row.id)]; });
    };
    var held = [];
    var release = function () {
      for (var again = true; again;) {
        again = false;
        for (var h = 0; h < held.length; h++) {
          var waiting = left(held[h]);
          if (!waiting.every(movable)) continue;
          waiting.forEach(emit);
          held.splice(h, 1);
          again = true;
          break;
        }
      }
    };
    var started = {};
    rows.forEach(function (row) {
      if (done[slotKey(row.kind, row.id)]) return;
      var p = partOf(row);
      if (!p) { emit(row); release(); return; }
      if (started[p]) return;
      started[p] = true;
      (own[p] || []).forEach(emit);
      held.push(p);
      release();
    });
    held.forEach(function (p) { left(p).forEach(emit); });
    return order;
  }

  var gatherMemo = { layout: null, topoProj: null, out: null };

  VA.gatherParts = function (layout, topoProj) {
    if (!layout || !topoProj) return layout;
    if (gatherMemo.layout === layout && gatherMemo.topoProj === topoProj) {
      return gatherMemo.out;
    }
    var pins = VA.partPins(topoProj);
    var rows = layout.rows || [];
    var order = gatheredOrder(rows, topoProj, pins);
    var moved = false;
    order.forEach(function (row, i) { if (row.row !== i) moved = true; });
    var out = layout;
    if (moved) {
      // Laid out without the chords, which are drawn inside their block and
      // so need no column: a chord laid as a rail holds a column through the
      // block's rows for nothing, and every branch beside it pays a column
      // further out. Put back afterwards, each at its first pin's column.
      var chordless = order.filter(function (row) {
        return !(row.kind === "edge" && pins.chords[row.id]);
      });
      var laid = VA.layWalk(chordless, { prefer: function (row) { return row.column; } });
      if (laid) laid = withChords(laid, order, pins);
      if (laid) {
        laid = improveColumns(laid, function (option) {
          return VA.layoutCrossings(VA.blockLayout(option, topoProj, pins)).total;
        });
        out = {};
        Object.keys(layout).forEach(function (key) { out[key] = layout[key]; });
        out.rows = laid.rows;
        out.rails = laid.rails;
        out.links = laid.links;
        out.columns = laid.columns;
      }
    }
    gatherMemo = { layout: layout, topoProj: topoProj, out: out };
    return out;
  };

  // The drawn walk with its blocks marked. Every maximal run of one block
  // part's rows holding at least two of its pins is a block,
  // `layout.blocks[i] = {part, body, start, end, pins, left, right}`; each of
  // its node rows carries `pin: {block, side, index}` (index = its place on
  // that side, top down) and each chord row `chord: {block}`. A run with one
  // pin (the band split a part) draws as it always did. Rails and links are
  // re-derived without the chords. Applied last, after the mirror. Pure.
  VA.blockLayout = function (layout, topoProj, pins) {
    if (!layout || !topoProj) return layout;
    pins = pins || VA.partPins(topoProj);
    var rows = layout.rows || [];
    var runs = [];
    rows.forEach(function (row) {
      var p = blockPartOf(row, pins);
      var last = runs[runs.length - 1];
      if (!p) return;
      if (last && last.part === p && last.end === row.row - 1) last.end = row.row;
      else runs.push({ part: p, start: row.row, end: row.row });
    });
    // A run is cut at a chord whose other pin is not in it (the band put that
    // pin elsewhere): that chord keeps its bar and rail, and a block holds
    // only its pins and the chords between them, so its height is its pins'.
    // Cut until no run holds such a chord.
    var lands = function (run, e) {
      var n = 0;
      for (var q = run.start; q <= run.end; q++) {
        if (rows[q].kind === "node" &&
            (rows[q].id === rows[e].entered_at || rows[q].id === rows[e].left_at)) n++;
      }
      return n;
    };
    for (var cut = true; cut;) {
      cut = false;
      var next = [];
      runs.forEach(function (run) {
        for (var e = run.start; e <= run.end; e++) {
          if (rows[e].kind === "edge" && lands(run, e) < 2) {
            if (e > run.start) next.push({ part: run.part, start: run.start, end: e - 1 });
            if (e < run.end) next.push({ part: run.part, start: e + 1, end: run.end });
            cut = true;
            return;
          }
        }
        next.push(run);
      });
      runs = next;
    }
    var blocks = [];
    var mark = {};
    var bodyOf = VA.bodyOfPart(topoProj);
    runs.forEach(function (run) {
      var pinRows = [];
      for (var r = run.start; r <= run.end; r++) {
        if (rows[r].kind === "node") pinRows.push(rows[r]);
      }
      if (pinRows.length < VA.BLOCK_MIN_PINS) return;
      var i = blocks.length;
      // The block's body is its part's, never its first row's: a contact
      // face's row is on its first listed part's body, and VA.partPins may
      // have given that face to the other part.
      var block = { part: run.part, body: bodyOf[run.part], start: run.start,
                    end: run.end, pins: pinRows.length, left: 0, right: 0 };
      pinRows.forEach(function (row) {
        var side = pins.outside[row.id] ? "left" : "right";
        mark[row.row] = { pin: { block: i, side: side, index: block[side] } };
        block[side] += 1;
      });
      for (var e = run.start; e <= run.end; e++) {
        // Every edge left in a run is a chord with both its pins in it (the
        // cut above).
        if (rows[e].kind === "edge") mark[e] = { chord: { block: i } };
      }
      blocks.push(block);
    });
    if (!blocks.length) return layout;
    var out = {};
    Object.keys(layout).forEach(function (key) { out[key] = layout[key]; });
    out.rows = rows.map(function (row) {
      return mark[row.row] ? assign(row, mark[row.row]) : row;
    });
    var structure = VA.walkRailsAndLinks(out.rows, function (row) { return !!row.chord; });
    out.rails = structure.rails;
    out.links = structure.links;
    out.blocks = blocks;
    return out;
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

  VA.COLLAPSED_ASSEMBLIES_KEY = "tolstack.viewer.collapsedAssemblies";

  function readCollapsedAll(store, key) {
    try {
      var raw = store && store.getItem(key || VA.COLLAPSED_ASSEMBLIES_KEY);
      var all = raw ? JSON.parse(raw) : {};
      return all && typeof all === "object" && !Array.isArray(all) ? all : {};
    } catch (err) {
      return {};
    }
  }

  function readCollapsed(store, topologyId, key) {
    var ids = readCollapsedAll(store, key)[topologyId];
    var out = {};
    (Array.isArray(ids) ? ids : []).forEach(function (id) {
      if (typeof id === "string") out[id] = true;
    });
    return out;
  }

  function writeCollapsed(store, topologyId, collapsed, key) {
    try {
      if (!store) return;
      var all = readCollapsedAll(store, key);
      var ids = Object.keys(collapsed || {}).filter(function (id) { return collapsed[id]; });
      if (ids.length) all[topologyId] = ids.sort();
      else delete all[topologyId];
      store.setItem(key, JSON.stringify(all));
    } catch (err) {
      // A browser that refuses to store it still collapses for this session.
    }
  }

  VA.readCollapsedAssemblies = function (store, topologyId) {
    return readCollapsed(store, topologyId, VA.COLLAPSED_ASSEMBLIES_KEY);
  };

  VA.writeCollapsedAssemblies = function (store, topologyId, collapsed) {
    writeCollapsed(store, topologyId, collapsed, VA.COLLAPSED_ASSEMBLIES_KEY);
  };

  // The model the reader last opened, so a reload lands where they left it
  // (2026-11-08; the same discipline as the collapsed bodies above: `store`
  // injected, every access wrapped). `VA.bootModel` is the one place the boot
  // reads it: the remembered id when the projection still lists it, else the
  // projection's first. A deep link is applied before the boot asks.
  VA.MODEL_KEY = "tolstack.viewer.model";

  VA.readStoredModel = function (store) {
    try {
      var id = store && store.getItem(VA.MODEL_KEY);
      return typeof id === "string" && id ? id : null;
    } catch (err) {
      return null;
    }
  };

  VA.writeStoredModel = function (store, topologyId) {
    try {
      if (store && topologyId) store.setItem(VA.MODEL_KEY, topologyId);
    } catch (err) {
      // A browser that refuses to store it still switches for this session.
    }
  };

  VA.bootModel = function (topologies, remembered) {
    var list = (topologies && topologies.topologies) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === remembered) return remembered;
    }
    return list.length ? list[0].id : null;
  };

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

  // The label a component group's merged cell prints: the part's own HUMAN
  // NAME. It printed the part id until 2026-09-15 (`bolt_nas6403u11d`), with
  // the name demoted to hover, because a live part name ran to eighty
  // characters and would not fit a 150px cell. The 2026-09-14 title pass took
  // that reason away for titles, and this handoff took it away for part names
  // too -- every live `name` is now a short noun phrase (Jeff: "replace these
  // with a concise human friendly name (NAS6403U11D Shoulder Bolt is fine)").
  //
  // An id is not a label. It is a deep-link handle and a debugging aid, and it
  // is rendered nowhere a reader looks now: not the merged cell, not the
  // preview pane's heading, not a hover card's heading, not an interface's
  // side list. A part with no `name` at all falls back to its id rather than
  // to an empty cell -- absent is absent, but a blank component column would
  // be a worse lie than a raw id.
  //
  // A gap has no part and says what it is in the words the old per-row part
  // cell already used.
  VA.GAP_COMPONENT_LABEL = "— across a clearance —";

  VA.componentLabel = function (part) {
    if (!part) return VA.GAP_COMPONENT_LABEL;
    // The projection's one label (tolerance_stack.model_view.part_label,
    // 2026-11-10: number, then everyday name) where the builder wrote it; the
    // pre-label rule -- `display_name` off the drawing's title block, else
    // `name`, else `id` -- for a part row built before it. The id rides in
    // componentTitle's tooltip either way.
    if (part.label) return part.label;
    return part.display_name || part.name || part.id;
  };

  VA.componentTitle = function (part) {
    if (!part) return "a gap: its two interfaces share no part";
    var text = VA.componentLabel(part);
    if (part.display_name && part.id) text += " · " + part.id;
    if (part.drawing) text += " · drawing " + part.drawing;
    return text;
  };

  // The whole plan of the merged-row grid, from the topology's whole-graph
  // walk. Everything the grid and the leaders need, keyed by id:
  //
  //   rows     [{ id, layoutRow, gridRow }]      one per edge, walk order
  //   groups   [{ part, label, title, start, count }]   contiguous runs
  //   leaders  [{ id, layoutRow, boundary, beforeEdge }]  non-internal nodes
  //   internal { nodeId: bool }
  //
  // A group breaks ONLY where the part changes between consecutive edge rows
  // (the_model_is_derived_once_and_the_left_column_is_its_tree, 2026-11-10).
  // Until then it also broke at any non-internal node between two same-part
  // edges, so v2's hub was 1 + 3 rows in two brackets, its tan-link mount
  // 1 + 2, its gas-spring mount 1 + 1 + 1 and its pitch plate 1 + 1: 18 part
  // groups for 12 parts, while the DAG drew 12 blocks. A leader may now land
  // on a seam inside a part's group -- that seam is a feature of the part,
  // and the bracket is the part. NOTE the depth-first walk can still revisit
  // a part on a later branch (v1's hub does), and each contiguous run gets
  // its own group — reordering the grid to force one row per part would
  // cross the leaders and break the walk-order correspondence this page is
  // built on.
  //
  // A leader's `boundary` is a GRID row index: the number of edge rows the
  // walk emitted before the node, i.e. the seam between the edge above it and
  // the edge below it (0 = above the first row, rows.length = below the
  // last). `beforeEdge` is the edge id whose row starts at that seam, or null
  // at the very bottom — it is what lets a browser test measure the leader's
  // end against the actual row box rather than re-deriving arithmetic.
  //
  // `focus` (viewer_respine_whole_walk, 2026-09-15) is how a selected study
  // reaches this grid, and it restricts the TABLE only — never the rails. The
  // DAG is always the whole walk now, so `layout` is always the topology's
  // own; a study selection passes
  //
  //   { edges: VA.chainIndex(study), nodes: VA.chainNodes(study) }
  //
  // and the walk is filtered through it on the way in: an edge outside the
  // chain emits no grid row, a node outside it no leader. Everything after
  // that filter is the walk-order logic unchanged — the kept rows stay in
  // WALK order (the sum's own order is the `#` column, VA.chainIndex's
  // ordinal), because a table re-ordered under a DAG that did not move would
  // cross every leader on the page. No focus is the whole walk, unchanged.
  //
  // `collapsed` ({partId: true}, a_part_may_contain_parts, 2026-11-14) is
  // the assemblies the reader has folded. Every row on a folded assembly or
  // on a part inside it becomes ONE row for the outermost folded assembly:
  // `{rollup: {part, edges}}`, at the first of those rows, with `edges` every
  // row it stands for, in walk order (a later run of the same assembly's rows
  // adds to it and draws nothing). What it prints is the study's own fold of
  // that assembly (the projection's `result.assemblies`), never a sum of the
  // rows -- so the stack's total does not move when it folds. A dropped row's
  // leaders bind to the next row the grid keeps, as a filtered one's do. A
  // kinematic page's stack is its own sub-stacks, and folds nothing here.
  VA.gridPlan = function (layout, topoProj, focus, collapsed) {
    var index = VA.topologyIndex(topoProj);
    var internal = VA.internalNodes(topoProj);
    var partsById = index.parts;
    var focusEdges = (focus && focus.edges) || null;
    var focusNodes = (focus && focus.nodes) || null;
    // The outermost folded assembly a part is in (itself included), or null.
    var folded = collapsed && !(focus && focus.stack) ? collapsed : null;
    var foldedInto = function (part) {
      if (!folded || part === null) return null;
      var out = null;
      var seen = {};
      for (var at = part; at && !seen[at]; at = partsById[at] && partsById[at].parent) {
        seen[at] = true;
        if (folded[at]) out = at;
      }
      return out;
    };
    var rollupRow = {};

    var rows = [];
    var groups = [];
    var leaders = [];
    var prevPart = null;
    var pendingBoundaryNode = null;   // a non-internal node row since the last edge

    // A kinematic page's stack (VA.kinematicStack): its sub-stack headers are
    // rows of the plan too, emitted where the stack puts them among the term
    // rows, and a term under a folded sub-stack has no row (its interfaces'
    // leaders bind to the next row the grid keeps, as a dropped edge's do).
    // The DAG's band is in the stack's own order (VA.bandSides), so walking
    // the layout and walking the stack meet the term edges in the same order.
    var stack = (focus && focus.stack) || null;
    var stackAt = {};
    var stackShown = {};
    var stackNext = 0;
    if (stack) {
      stack.entries.forEach(function (entry, i) {
        if (entry.kind === "term" && stackAt[entry.edge] === undefined) stackAt[entry.edge] = i;
      });
      VA.visibleStackEntries(stack).forEach(function (entry) { stackShown[stackKey(entry)] = true; });
    }
    var bindLeaders = function (id) {
      for (var i = leaders.length - 1; i >= 0; i--) {
        if (leaders[i].boundary !== rows.length || leaders[i].beforeEdge !== null) break;
        leaders[i].beforeEdge = id;
      }
    };
    var pushHeader = function (entry) {
      var id = stackKey(entry);
      groups.push({ part: null, label: "", title: "", start: rows.length, count: 1,
                    header: entry });
      bindLeaders(id);
      rows.push({ id: id, layoutRow: null, gridRow: rows.length, header: entry,
                  closes: false });
      prevPart = undefined;
    };
    // Every header the stack puts before entry `until` (exclusive), in order.
    var flushHeaders = function (until) {
      for (; stackNext < until; stackNext++) {
        var entry = stack.entries[stackNext];
        if (entry.kind === "sub" && stackShown[stackKey(entry)]) pushHeader(entry);
      }
    };

    ((layout && layout.rows) || []).forEach(function (row) {
      // A collapsed body's pill (VA.collapseBodies) is not an interface: it
      // separates nothing in the grid and has no leader.
      if (row.collapsed) return;
      if (row.kind === "node") {
        if (!internal[row.id] && (!focusNodes || focusNodes[row.id])) {
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
      // A dropped edge leaves `prevPart` and `pendingBoundaryNode` alone, so a
      // leader waiting for a seam binds to the next row the grid actually
      // keeps and a group break still lands where the part really changes.
      if (focusEdges && (!focusEdges[row.id] ||
          (focus.closed && focus.closed[row.id]))) return;
      var term = null;
      if (stack) {
        var at = stackAt[row.id];
        // A lit edge that is no term of this stop's stack (a band's own edge,
        // a joint, the other stop's chain) has no row here.
        if (at === undefined) return;
        if (at >= stackNext) flushHeaders(at);
        term = stack.entries[at];
        if (at >= stackNext) stackNext = at + 1;
        if (!stackShown[stackKey(term)]) return;
      }
      var edge = index.edges[row.id] || null;
      var part = edge && edge.part !== undefined ? edge.part : null;
      var into = foldedInto(part);
      if (into && rollupRow[into]) {
        // Folded into a row already drawn: it stands for this one too.
        rollupRow[into].rollup.edges.push(row.id);
        return;
      }
      if (into) part = into;
      var breakHere = rows.length === 0 || part !== prevPart;
      if (breakHere) {
        var partRow = part === null ? null : partsById[part] || { id: part };
        groups.push({
          part: part,
          label: VA.componentLabel(partRow),
          title: VA.componentTitle(partRow),
          start: rows.length,
          count: 0,
        });
      }
      groups[groups.length - 1].count += 1;
      bindLeaders(row.id);
      var planRow = {
        id: row.id,
        layoutRow: row.row,
        gridRow: rows.length,
        closes: row.closes_row !== null && row.closes_row !== undefined,
        body: row.body === undefined ? null : row.body,
        term: term,
      };
      if (into) {
        planRow.rollup = { part: into, edges: [row.id] };
        rollupRow[into] = planRow;
      }
      rows.push(planRow);
      prevPart = part;
      pendingBoundaryNode = null;
    });
    if (stack) flushHeaders(stack.entries.length);

    return { rows: rows, groups: groups, leaders: leaders, internal: internal };
  };

  // The grid's brackets (the_grid_fits_the_screen_and_its_brackets_say_what_
  // nests_in_what). Jeff, 2026-11-05: "use brackets (imagine [] or {} or ()
  // turned horizontally) as the dividers between parts, bodies etc. Larger
  // groups (bodies, studies) can be wider horizontally than smaller groups
  // (parts), so it's clear which are nested inside of the others." They
  // replace the body tints, the dividers and the sub-stack rule
  // (the_kinematic_grid_is_a_stack_of_sub_stacks), which left every row
  // "nearly identical in color".
  //
  // `braces`, outermost first: { kind, id, level, start, end, gap, label,
  // tint }.
  //   kind   a VA.GRID_BRACE_KINDS word -- the hue: a body's and a part's is
  //          its body's ink (`tint`, VA.bodyTint), a study's its kind's;
  //   level  how deep it nests, 0 = outermost -- what the inset is made of;
  //   start, end  plan row indices, inclusive; `end` may run past the plan's
  //          rows into the foot (the study's brace holds its totals);
  //   label  a body's name, a part's or an assembly's number
  //          (VA.gridPartLabel); a study and a sub-stack are titled by their
  //          own header rows;
  //   body   on a part or an assembly, the body brace it sits in (absent
  //          where Bodies are switched off, or the part has no body);
  //   outer  on a part or an assembly, the outermost brace it sits in: its
  //          body's, else its top-level assembly's (`outermost`, whose name
  //          takes the body's strip);
  //   named  on an assembly, whether its label is drawn (VA.gridBraces).
  // `said` and `folds` are the rows whose part's number, and whose
  // assembly's fold, a brace carries -- the row's own cell draws neither.
  //
  // What nests (the_dag_and_grid_nest_coloured_bodies_and_compact_means_
  // denser_rows, 2026-11-08): the study (when there is one) > a sub-stack and
  // the sub-stacks inside it > a rigid body > a part -- every body, and every
  // part inside it, so a one-part body is two braces, one inside the other.
  // Jeff: "What we discussed was making a rigid body with a single part
  // inside of it, so it should be two nested sets of braces." A body that
  // crosses a sub-stack boundary is two runs, one per sub-stack.
  //
  // An assembly (2026-11-19) holds its own rows and every row on a part
  // inside it, wherever the bodies put them: a body ⊃ an assembly ⊃ a part
  // where it nests, and an assembly whose parts sit in two bodies is one
  // bracket per run of its rows, inside each body.
  //
  // `opts.kinds` is the grid's Groups ({bodies, assemblies, parts}: false
  // drops that kind; VA.gridGroupKinds), `opts.topoProj` names the labels and
  // the inks. Pure: the geometry is views/topology.js's.
  VA.GRID_BRACE_KINDS = Object.freeze(["kinematic", "chain", "body", "assembly", "part"]);

  // A part's bracket label in the grid: the PART column's own number
  // (VA.partColumns), said there and nowhere else on the row -- the rows it
  // holds print no number of their own (the_demo_path_reads_cleanly_on_a_
  // projector; it was printed in both, `214373-002 214373-002 propeller hub`).
  // A part with no number keeps the DAG container's label.
  // A part's place in the part tree, off the authored `parts[].parent`
  // (a_part_may_contain_parts): how many assemblies it is inside, and
  // whether it is one. `partsById` is VA.topologyIndex's `parts`.
  VA.partDepth = function (partsById, partId) {
    var depth = 0;
    var seen = {};
    for (var at = partsById[partId] && partsById[partId].parent; at && !seen[at];
         at = partsById[at] && partsById[at].parent) {
      seen[at] = true;
      depth++;
    }
    return depth;
  };

  VA.assemblyIds = function (topoProj) {
    var out = {};
    ((topoProj && topoProj.parts) || []).forEach(function (p) {
      if (p && p.parent) out[p.parent] = true;
    });
    return out;
  };

  VA.gridPartLabel = function (part) {
    if (!part) return "";
    return VA.partColumns(part).number || VA.componentLabel(part);
  };

  VA.gridBraces = function (plan, opts) {
    opts = opts || {};
    var rows = (plan && plan.rows) || [];
    var groups = (plan && plan.groups) || [];
    var kinds = opts.kinds || {};
    var topo = opts.topoProj || null;
    var braces = [];
    if (!rows.length) return { braces: braces, cover: {}, said: {}, folds: {} };
    var base = 0;
    if (opts.study) {
      braces.push({ kind: opts.study, id: "study", level: 0, start: 0,
                    end: rows.length - 1 + (opts.foot || 0), gap: false });
      base = 1;
    }
    // Sub-stacks: a header row opens one, and every row beneath it whose
    // sub-stack chain reaches it extends it.
    var subs = {};
    var subParent = {};
    var containerOf = function (row) {
      if (row.header) return row.header.parent || null;
      return row.term ? row.term.parent || null : null;
    };
    var levelIn = function (container) {
      return container && subs[container] ? subs[container].level + 1 : base;
    };
    rows.forEach(function (row, i) {
      if (row.header) {
        var entry = row.header;
        var brace = { kind: entry.depth === 0 ? "kinematic" : "chain", id: entry.id,
                      level: levelIn(entry.parent || null), start: i, end: i,
                      gap: !!entry.gap };
        subs[entry.id] = brace;
        subParent[entry.id] = entry.parent || null;
        braces.push(brace);
      }
      var sid = row.header ? row.header.id : (row.term ? row.term.parent : null);
      while (sid && subs[sid]) {
        subs[sid].end = i;
        sid = subParent[sid];
      }
    });
    var names = {};
    ((topo && topo.bodies) || []).forEach(function (b) { names[b.id] = b.name || b.id; });
    var partsById = {};
    ((topo && topo.parts) || []).forEach(function (p) { partsById[p.id] = p; });
    var bodyOfPart = topo ? VA.bodyOfPart(topo) : {};
    var assemblies = VA.assemblyIds(topo);
    var showAssemblies = kinds.assemblies !== false;
    // Each row's part, its group's: a folded assembly's one row is the
    // assembly's.
    var partAt = {};
    groups.forEach(function (g) {
      if (g.header) return;
      for (var r = g.start; r < g.start + g.count; r++) partAt[r] = g.part;
    });
    // Bodies, then assemblies, then parts, inside the innermost sub-stack
    // each row sits in.
    var bodyAt = {};
    var i = 0;
    while (i < rows.length) {
      var row = rows[i];
      if (row.header || row.body === null || row.body === undefined) { i++; continue; }
      var j = i;
      while (j < rows.length && !rows[j].header && rows[j].body === row.body &&
             containerOf(rows[j]) === containerOf(row)) j++;
      if (kinds.bodies !== false) {
        var body = { kind: "body", id: String(row.body), level: levelIn(containerOf(row)),
                     start: i, end: j - 1, gap: false,
                     label: names[row.body] || String(row.body),
                     tint: VA.bodyTint(topo, row.body) };
        braces.push(body);
        for (var k = i; k < j; k++) bodyAt[k] = body;
      }
      i = j;
    }
    // The assemblies (the_groups_switches_reach_the_map_and_the_grid_
    // brackets_an_assembly_in_two_bodies, 2026-11-19): an assembly holds the
    // rows on it and on every part inside it, so one whose parts sit in two
    // bodies holds rows in both. Each maximal run of them inside one body
    // bracket and one sub-stack is one bracket, and every run is named the
    // assembly; the fold is the part's, so folding one folds them all. With
    // no body bracket round it, a top-level assembly is the outermost
    // bracket and its name takes the body's strip (`outermost`). An
    // assembly in one body wears its ink; one in none, no body's.
    var outerAt = {};
    var assemblyDepth = function (part) { return VA.partDepth(partsById, part); };
    if (showAssemblies) {
      var openRun = {};
      rows.forEach(function (row, r) {
        if (row.header) return;
        var chain = [];
        var seen = {};
        for (var at = partAt[r]; at && !seen[at]; at = partsById[at] && partsById[at].parent) {
          seen[at] = true;
          if (assemblies[at]) chain.unshift(at);
        }
        chain.forEach(function (a) {
          var run = openRun[a];
          if (run && run.end === r - 1 && (bodyAt[r] || null) === run.body &&
              containerOf(rows[run.start]) === containerOf(row)) {
            run.end = r;
          } else {
            var depth = assemblyDepth(a);
            var within = bodyAt[r] || null;
            var outermost = !within && depth === 0;
            var own = bodyOfPart[a];
            run = { kind: "assembly", id: "part:" + a, part: a, depth: depth,
                    level: (within ? within.level + 1 : levelIn(containerOf(row))) + depth,
                    start: r, end: r, gap: false,
                    label: VA.gridPartLabel(partsById[a] || { id: a }),
                    tint: own !== undefined ? VA.bodyTint(topo, own) : null,
                    body: within, outer: within || (outermost ? null : outerAt[r] || null),
                    outermost: outermost,
                    // Its name is on its first row where that row is its own
                    // or it is the outermost bracket; a part's number already
                    // takes the strip on a row a part inside it starts.
                    named: outermost || partAt[r] === a,
                    assembly: "open" };
            openRun[a] = run;
            braces.push(run);
          }
          if (rows[r].rollup && rows[r].rollup.part === a) run.assembly = "closed";
          if (run.outermost) outerAt[r] = run;
        });
      });
    }
    if (kinds.parts !== false) {
      groups.forEach(function (g) {
        if (g.header || g.part === null || g.part === undefined || !g.count) return;
        // Where assemblies are bracketed, an assembly's own rows are its
        // bracket's.
        if (showAssemblies && assemblies[g.part]) return;
        var at = bodyAt[g.start];
        var outer = at || outerAt[g.start] || null;
        var record = partsById[g.part] || { id: g.part };
        var own = rows[g.start].body;
        var depth = VA.partDepth(partsById, g.part);
        braces.push({ kind: "part", id: "part:" + g.part, part: g.part,
                      level: (at ? at.level + 1 : levelIn(containerOf(rows[g.start]))) +
                        (showAssemblies ? depth : 0),
                      start: g.start, end: g.start + g.count - 1, gap: false,
                      label: VA.gridPartLabel(record),
                      tint: VA.bodyTint(topo, own !== null && own !== undefined ? own
                                                : bodyOfPart[g.part]),
                      body: at || null, outer: outer,
                      // Its place in the part tree: a nested part's number is
                      // indented, and an assembly's bracket carries its fold
                      // (open, or folded into one rolled-up row).
                      depth: depth,
                      assembly: assemblies[g.part]
                        ? (rows[g.start].rollup ? "closed" : "open") : null });
      });
    }
    // The rows whose part's number a bracket says (so the row's own cell
    // does not), and those whose assembly's fold a bracket carries.
    var said = {};
    var folds = {};
    braces.forEach(function (b) {
      if (b.kind !== "part" && b.kind !== "assembly") return;
      for (var r = b.start; r <= b.end; r++) {
        if (b.kind === "part" || partAt[r] === b.part) {
          if (b.kind === "part" ? !!b.label : b.named) said[r] = true;
          if (b.assembly) folds[r] = true;
        }
      }
    });
    braces.sort(function (a, b) { return a.level - b.level || a.start - b.start; });
    // How many brackets hold each row.
    var cover = {};
    braces.forEach(function (b) {
      for (var r = b.start; r <= Math.min(b.end, rows.length - 1); r++) {
        cover[r] = Math.max(cover[r] || 0, b.level + 1);
      }
    });
    return { braces: braces, cover: cover, said: said, folds: folds };
  };

  // A row's one sourcing mark (deliverable 3): the pill cluster's worst word,
  // as one small icon in that state's colour, or nothing for a value read off
  // its document. In precedence order -- a row says the worst thing about its
  // number, and the Preview says the rest. The four confidences' words are
  // viewer.js's (VA.CONFIDENCE_WORDS); a value with no confidence at all and
  // a band nobody wrote down are the two states the chips said besides.
  VA.SOURCING_MARKS = Object.freeze(["untraced", "no_source_ref", "no_value", "inferred",
                                     "no_tolerance"]);
  // The state a row with no mark is in, for the legend.
  VA.SOURCING_UNMARKED = "traced";

  VA.sourcingMarkWords = function (key) {
    if (key === "no_value") return "no value on record yet";
    if (key === "no_tolerance") return VA.ATTENTION.no_tolerance.text;
    return VA.CONFIDENCE_WORDS[key] || key;
  };

  // `confidence` is the row's (a kinematic term's is its band's); `edge` the
  // topology's edge, for its zero-width band; `noBand` a kinematic term with
  // no band on file. Null for a traced value with a band.
  VA.rowSourcingMark = function (confidence, edge, noBand) {
    // A term with no band on file contributes nothing, whatever its edge's
    // own citation says: that is the first thing to know about it.
    var key = null;
    if (noBand) key = "no_value";
    // A confidence that has a mark of its own wears it (`traced` has none).
    else if (VA.SOURCING_MARKS.indexOf(confidence) !== -1) key = confidence;
    else if (confidence === null || confidence === undefined) key = "no_value";
    else if (edge && edge.zero_width) key = "no_tolerance";
    if (!key) return null;
    var words = VA.sourcingMarkWords(key);
    if (key !== "no_tolerance" && edge && edge.zero_width) {
      words += " · " + VA.ATTENTION.no_tolerance.text;
    }
    return { key: key, words: words };
  };

  // The PART and DESCRIPTION columns (deliverable 2), out of the part record.
  // Jeff, 2026-11-05: "half of the Component column start with
  // PN/Description, and the other half are Description/PN ... consider making
  // them two separate columns." The number is the record's: the part's
  // `drawing`, else the part-number token in its own name
  // (`NAS6403U11D hex-head bolt`). The description is the name with its
  // part-number token taken out, whichever way round the name puts it. The
  // two can differ: the pitch plate's record is the installation 215177-001
  // and its title-block name is the detail's (`Pitch plate 215735-001/-002`),
  // so the row says 215177-001 and the cell's title keeps the whole name. A
  // part with neither has no number -- absent is absent -- and a gap has no
  // part.
  var PART_NUMBER = /\b(\d{6}-\d{3}(?:\/-\d{3})*|(?:NAS|MS|AN)\d[A-Z0-9-]*)\b/;

  VA.partColumns = function (part) {
    if (!part) return { number: "", description: VA.GAP_COMPONENT_LABEL };
    var label = VA.componentLabel(part);
    // The one label opens with the drawing number (model_view.part_label,
    // 2026-11-10), whatever shape that number has -- a six-dash-three, a
    // bare `215197`, a standard-part callout -- so the split is read off the
    // record first and the regex is for a label built before it.
    if (part.drawing && label.indexOf(String(part.drawing) + " ") === 0) {
      return { number: String(part.drawing), description: label.slice(String(part.drawing).length + 1) };
    }
    var hit = PART_NUMBER.exec(label);
    var number = part.drawing || (hit ? hit[0] : "");
    if (!hit) return { number: number, description: label };
    var rest = (label.slice(0, hit.index) + " " + label.slice(hit.index + hit[0].length))
      .replace(/\(\s*\)/g, "").replace(/\s+/g, " ").trim()
      .replace(/^[,·\-\s]+|[,·\-\s]+$/g, "");
    return { number: number, description: rest || label };
  };

  // A stack entry's row id: its edge for a term, `sub:<id>` for a header.
  function stackKey(entry) {
    return entry.kind === "term" ? entry.edge : "sub:" + entry.id;
  }
  VA.stackRowId = stackKey;

  // --- what the scene posts (apps/annotate) ---------------------------------
  //
  // The two messages the scene posts about its anchors under the pointer
  // (apps/annotate's AA.HOVER_MESSAGE and AA.PICK_MESSAGE): {kind, id} of the
  // anchor hovered (both null off one), and of the anchor clicked. The page
  // previews the first and freezes on the second (topology_app.js).
  VA.SCENE_HOVER_MESSAGE = "annotate:hover";
  VA.SCENE_PICK_MESSAGE = "annotate:pick";
  // ...and the one it posts after every event it writes, and once it has read
  // the log (apps/annotate's AA.IDENTITY_MESSAGE): {projection,
  // installedMeshes}, its merged feature-identity record. The page replaces
  // its own with it and repaints the tree (topology_app.js's onPaneIdentity).
  VA.SCENE_IDENTITY_MESSAGE = "annotate:identity";

  // How long the Preview waits, once the pointer has left every mark, before
  // it goes back to the frozen element: long enough that crossing the gap
  // between two neighbouring marks does not flash it in between, short enough
  // to read as "it came back".
  VA.PREVIEW_RETURN_MS = 150;
  // How far a press may travel and still be a click (the pane pans under a
  // pressed pointer): a click on empty canvas lets the Preview go, a pan
  // does not.
  VA.PREVIEW_CLICK_SLOP_PX = 4;
  // The element a row of the scene's mirrored tree stands for, so a pick in
  // the scene selects on this page (the rail's `select` coupling: a pick
  // selects its row there, and the tree the scene sends here marks it). The
  // row key is the annotator's own (`<parent>/<data k=v,...>`, apps/annotate's
  // railKey), read as one set of fields: a deeper segment's field replaces a
  // shallower one of the same name, and an `edge` field in any segment wins
  // over a body's. A row naming an edge is that edge. A row naming a body (a part picked on it, or a link's
  // own joint row -- a run names a link's joint after the link) is the one
  // lit edge on that body's parts, when there is exactly one; several, or
  // none, select nothing rather than guess.
  VA.sceneRowElement = function (key, topoProj, lit) {
    if (!key || !topoProj) return null;
    var fields = {};
    String(key).split("/").forEach(function (segment) {
      segment.replace(/#\d+$/, "").split(",").forEach(function (pair) {
        var at = pair.indexOf("=");
        if (at > 0) fields[pair.slice(0, at)] = pair.slice(at + 1);
      });
    });
    var index = VA.topologyIndex(topoProj);
    // A joint end's row is the NODE it is on (the_model_is_derived_once_and_
    // the_left_column_is_its_tree, 2026-11-10): the tree lists it as that
    // node's feature, and the faces layer follows the pane to it. A row with
    // an edge and no feature -- a contributor, a bind-mode element -- is the
    // edge, as before.
    if (fields.feature && index.nodes[fields.feature]) return { kind: "node", id: fields.feature };
    if (fields.edge) return index.edges[fields.edge] ? { kind: "edge", id: fields.edge } : null;
    var bodyId = fields.subject || fields.body || fields.joint;
    var body = bodyId ? (topoProj.bodies || []).filter(function (b) {
      return b.id === bodyId;
    })[0] : null;
    if (!body) return null;
    var parts = {};
    (body.parts || []).forEach(function (p) { parts[p] = true; });
    var edges = (topoProj.edges || []).filter(function (e) {
      return parts[e.part] && (!lit || lit.edges[e.id]);
    });
    return edges.length === 1 ? { kind: "edge", id: edges[0].id } : null;
  };

  // The lit set as the scene's own `model` verb spells it (apps/annotate's
  // AA.parseModelVerb): the shell's reading wins over the scene's fallback,
  // which does not know about a borrowed band.
  VA.sceneLitCommand = function (lit) {
    var ids = lit ? Object.keys(lit.edges || {}).filter(function (id) {
      return lit.edges[id];
    }).sort() : [];
    return ["model", "lit"].concat(ids.length ? ids : ["all"]);
  };

  // The parts a page's lit set names, as the scene's own `isolate` verb spells
  // them (handoff every_study_opens_in_3d_showing_only_its_parts): the part of
  // every lit edge, and -- for a joint, which carries none -- the parts
  // standing at its two ends. No lit set (the whole topology) lights every
  // edge, so the topology's parts are all solid. A scope naming no part at all
  // is `isolate off`, since a scope of nothing would blank the scene. The pane resolves the
  // ids to meshes and ghosts or hides the rest by the unlit word; nothing here
  // knows which parts have a mesh.
  VA.litPartIds = function (topoProj, lit) {
    var parts = [];
    var add = function (id) { if (id && parts.indexOf(id) === -1) parts.push(id); };
    var adjacent = VA.nodeAdjacentParts(topoProj);
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      if (lit && !(lit.edges && lit.edges[edge.id])) return;
      if (edge.part) { add(edge.part); return; }
      [edge.from, edge.to].forEach(function (nodeId) {
        (adjacent[nodeId] || []).forEach(add);
      });
    });
    return parts;
  };

  // Each part in its body's colour, as the scene's `model tint` verb spells
  // it (the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste): one
  // `part=#rrggbb` per part a body carries, the hex being that body's DAG ink
  // (`inkOf(tint index)`, read off topology.css's `--tv-body-ink-*` by the
  // page). `off` where there is no topology or no ink could be read.
  VA.sceneTintCommand = function (topoProj, inkOf) {
    var pairs = [];
    ((topoProj && topoProj.bodies) || []).forEach(function (body) {
      var hex = inkOf ? inkOf(VA.bodyTint(topoProj, body.id)) : null;
      if (!/^#[0-9a-fA-F]{6}$/.test(hex || "")) return;
      (body.parts || []).forEach(function (part) { pairs.push(part + "=" + hex.toLowerCase()); });
    });
    return ["model", "tint"].concat(pairs.length ? pairs : ["off"]);
  };

  VA.partScopeCommand = function (ids) {
    return ids && ids.length ? ["isolate", "parts"].concat(ids) : ["isolate", "off"];
  };

  // --- loose stacks: the systems this page shows as a table, not a graph ---
  //
  // Most stacks in docs/tolerance_stacks/ have no topology document at all —
  // topology is opt-in per system, and re-expressing a stack as a graph is
  // extra authoring, not a free side effect of having one. So retiring the
  // stack viewer cannot mean "only render what a topology covers": this page
  // also has to offer every stack NO topology re-expresses, rendered exactly
  // as the stack viewer rendered it (views/stack.js, unchanged).
  //
  // A stack a topology DOES re-express is offered as that topology, and
  // nowhere else (viewer_nav_wedge_and_classic_retirement, 2026-09-15): the
  // graph states every verdict, gap, excluded term and missing tolerance the
  // table stated, so a second entry for the same joint is a second notation
  // for the same facts. views/nav.js's own header carries the case.
  //
  // Which stacks are covered is read off the data already on hand, not a new
  // field: an edge that re-expresses a stack element carries `crop_key`
  // (`{stack, element}`), and that IS the linkage — a stack covered by a
  // topology is exactly the one every one of its edges' crop_keys names. No
  // schema change, no second source of truth.
  //
  // The stack ids ONE topology's own edges re-express, first-seen order, no
  // duplicates. The per-topology shape is what the flat "is this stack covered
  // by ANY topology" map (VA.stacksCoveredByTopology) is folded from, so the
  // `crop_key.stack` extraction lives in exactly one place.
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

  // Stacks the page does not offer, and what replaced each one. A superseded
  // first pass is kept on disk forever — it is history, and it is the document
  // the take that replaced it was read against — but a rail where every other
  // entry is live work is not where it belongs, and two near-identical titles
  // one above the other is a reader's problem, not an archive's
  // (viewer_nav_wedge_and_classic_retirement, 2026-09-15).
  //
  // A map rather than a list, and a module-level constant rather than an id
  // spelled at a call site: the value names the artifact that supersedes the
  // key, so the claim is checkable — tests/test_topology_conversions.py's
  // coverage section pins that every successor named here really exists.
  //
  // `tan_link_to_pitch_plate` (take 1) is the only entry. It has no topology
  // and never will: its checks mix a `path` term with individually-signed
  // elements, which docs/DAG_TOPOLOGY.md fences rather than converts (the
  // fence itself is pinned by test_tan_link_to_pitch_plate_take_1_has_no_
  // topology), so take 2 is the only reachable form of that joint.
  VA.SUPERSEDED_STACKS = {
    tan_link_to_pitch_plate: "tan_link_to_pitch_plate_take2",
  };

  // Every stack the page offers as a table: no topology re-expresses it, and
  // nothing supersedes it. `hasOwnProperty` rather than a truthiness test — a
  // stack id that collided with an Object.prototype member would otherwise
  // read as superseded and vanish from the nav with no trace of why.
  VA.looseStacks = function (topologies, results) {
    var covered = VA.stacksCoveredByTopology(topologies);
    return ((results && results.stacks) || []).filter(function (s) {
      return !covered[s.id] &&
        !Object.prototype.hasOwnProperty.call(VA.SUPERSEDED_STACKS, s.id);
    });
  };

  // Which projection's worksheet a topology's page offers, and whose joint
  // block it shows: the SELECTED STUDY's stack when its chain re-expresses one,
  // otherwise the topology's own (handoff a_study_shows_the_worksheet_and_
  // joint_of_the_stack_it_folds, 2026-10-27).
  //
  // Since the four fastener topologies folded into the one product model, the
  // page is the model, and the model's own sheet (the end-stop graft) would
  // always win -- three authored grip-stack sheets had no route to a reader.
  // So the subject is the study: build_topology_projection.py's `study_stack`
  // resolves, at projection time, the stack a study's chain re-expresses and
  // carries its `joint` block and `worksheet_file`/`worksheet_source` on the
  // study row as `stack`. Nothing is derived here; the page reads that one
  // field.
  //
  // A study with a stack but no sheet of its own (tan link take 2) comes back
  // as that stack, so the toggle hides rather than offering the model's sheet
  // under a chain it does not document. No study, or a study with no stack,
  // is the topology itself -- the pane's "no worksheet for this" branch is
  // reached exactly as before.
  //
  // REJECTED: listing every folded stack's sheet on the model page at once. It
  // loses which chain a sheet belongs to, which is what the joint block exists
  // to say.
  VA.worksheetSubject = function (topology, study) {
    if (!topology) return null;
    if (study && study.stack) return study.stack;
    return topology;
  };

  // The joint block the topology page renders: the same subject, read for its
  // `joint`. A study's stack carries the joint the fold kept in
  // `provenance.grip_stack_joints`; the model's own is `{}`.
  VA.jointSubject = function (topology, study) {
    var subject = VA.worksheetSubject(topology, study);
    return subject ? subject.joint : null;
  };

  // --- the single nav tree: one topology -> its studies, and every stack no
  // topology re-expresses as a leaf of the same tree (viewer_v2_single_nav,
  // 2026-09-08). One system, one entry: a topology carries no stack child rows
  // (viewer_nav_wedge_and_classic_retirement, 2026-09-15 — views/nav.js's
  // header has the case). views/nav.js renders this; nothing here touches the
  // DOM.
  //
  // `kinematic` (handoff the_viewer_shows_a_kinematic_study) is the third
  // projection, and optional: its section is VA.kinematicNav's
  // (views/kinematic.js), and an absent projection is an absent section.
  //
  // Since 2026-11-08 (model_v2_is_the_end_stop_linkage_in_five_bodies_and_
  // the_nav_switches_models) a topology is a MODEL, the top node of the nav,
  // and its kinematic studies hang under it with its chain studies
  // (`kinematic`, its VA.kinematicNav group or null). `kinematic` on the tree
  // is left with only the groups no listed model claims.
  VA.navTree = function (topologies, results, kinematic) {
    var groups = VA.kinematicNav ? VA.kinematicNav(kinematic, topologies) : [];
    var groupOf = {};
    groups.forEach(function (g) { groupOf[g.topologyId] = g; });
    var topoNodes = ((topologies && topologies.topologies) || []).map(function (t) {
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
        variantAxis: (topologies && topologies.variant_axis) || null,
        tagAxes: VA.tagAxes(t.studies, t.bodies),
        studies: (t.studies || []).map(function (s) {
          return { id: s.id, title: s.title, status: s.status,
                   description: s.description || null,
                   tags: s.tags || {},
                   // Does it pass, and is there anything about the answer a
                   // reader must not miss — on the rail itself, so the shape of
                   // the whole document is readable without clicking through
                   // twenty studies one at a time
                   // (viewer_study_verdicts_and_gaps, deliverable 1).
                   verdict: VA.studyVerdict(s),
                   attention: VA.studyAttention(s, index) };
        }),
        kinematic: groupOf[t.id] || null,
      };
    });
    var claimed = {};
    topoNodes.forEach(function (n) { claimed[n.id] = true; });
    return { topologies: topoNodes, looseStacks: VA.looseStacks(topologies, results),
             kinematic: groups.filter(function (g) { return !claimed[g.topologyId]; }) };
  };

  // --- what the element record (element_record.js) reads about a part -----
  //
  // The hover cards these served -- edge, component, node -- were retired on
  // 2026-10-30 (a_preview_pane_replaces_the_hover_popups_and_one_record_
  // backs_every_mark); every mark's facts are its ONE record now, rendered in
  // the right-hand pane. What a part's record says about where its numbers
  // come from is still decided here.

  // --- what a part with no drawing of its own is sourced FROM ---------------
  //
  // Jeff, 2026-09-15, on the component card for a COTS fastener: "'no drawing
  // recorded for this part' on a COTS fastener -- wrong and meaningless; say
  // what's true: it's a standard part whose dimensions come from the NAS
  // sheet, e.g. 'standard part -- dimensions from NAS6403-NAS6420 Rev 4,
  // sheet 3'."
  //
  // He is right that the old sentence was wrong, and the reason is worth
  // keeping: `drawing` is a part's SOURCE-CONTROL identity, and a standard
  // part legitimately has none. What it has instead is a standard sheet, and
  // the card can derive WHICH from what the part's own rows already cite --
  // nothing new is authored, nothing is matched by filename, and a part whose
  // rows cite nothing gets no line at all rather than a placeholder.
  //
  // The one citation `kind` (SOURCE_REF_KINDS, tolerance_stack/stack.py) that
  // means "an industry standard sheet rather than a Joby drawing" -- which is
  // what licenses the words "standard part". A module-level constant, never an
  // inline literal (repo rule).
  VA.SPEC_CITATION_KIND = "spec";

  // The documents a part's OWN dimensions are cited from, one row per
  // document, first-seen order, with the distinct sheets each was read on.
  VA.partReferences = function (topoProj, partId) {
    var byDocument = {};
    var order = [];
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      if (edge.part !== partId) return;
      var ref = edge.dimension && edge.dimension.source_ref;
      if (!ref || !ref.document) return;
      var document = String(ref.document);
      if (!byDocument[document]) {
        byDocument[document] = {
          document: document, kinds: [], sheets: [], unverified: false,
        };
        order.push(document);
      }
      var row = byDocument[document];
      if (ref.kind && row.kinds.indexOf(ref.kind) === -1) row.kinds.push(ref.kind);
      // ...and whether anything readable stands behind the numbers read off it.
      // ANY unverified row marks the document, not every row: a card line that
      // called a document clean because one of its four rows was traced would
      // overclaim, and the direction this repo errs in is the other one. (No
      // live part today cites one document at two confidences, so the tie-break
      // is stated rather than exercised.)
      if (VA.needsAnnotation(edge.confidence)) row.unverified = true;
      if (ref.sheet !== null && ref.sheet !== undefined &&
          row.sheets.indexOf(ref.sheet) === -1) {
        row.sheets.push(ref.sheet);
      }
      return;
    });
    return order.map(function (document) { return byDocument[document]; });
  };

  // One reference, in a reader's words: "NAS6403-NAS6420 Rev 4.pdf · sheet 3".
  //
  // ...and, where it applies, what the numbers read off it are worth
  // (ISSUE_20260915_the_component_card_says_dimensions_from_for_a_part_whose_
  // every_value_is_untraced). The card carries NO confidence chip, so this line
  // is the only provenance its reader gets, and "dimensions from
  // 260729_sample_tol_stack.xlsx" said exactly what a traced drawing citation
  // says about a workbook transcription this repo refuses to call traced. The
  // qualifier is the DAG grid's own badge word, read out of VA.ATTENTION rather
  // than spelled again here: a reader meets "unverified" on the row and on the
  // "what is missing" panel, and it must mean the same thing in all three.
  //
  // No revision. It is not an oversight: the live NAS citation's `revision` is
  // "Rev 4 (sheet 1 rev 4, sheet 2 rev 2, sheet 3 NEW, sheet 4 rev 2)" -- a
  // four-clause per-sheet note, and printing it here would put back exactly
  // the wall of text this pass removed. The document's own name carries the
  // revision a reader needs to find the file, and the FULL citation (revision,
  // view, zone and all) is on the row's own citation, one click away in the
  // preview pane.
  VA.referenceText = function (reference) {
    if (!reference) return "";
    var bits = [reference.document];
    if (reference.sheets.length) {
      // Sheet ORDER, not citation order: a reader looking for these pages
      // wants them in the order they are in the document. A sheet is normally
      // a number and occasionally a string ("A"), so this sorts numerically
      // where it can and lexically where it cannot.
      var sheets = reference.sheets.slice().sort(function (a, b) {
        var na = Number(a), nb = Number(b);
        if (isFinite(na) && isFinite(nb)) return na - nb;
        return String(a) < String(b) ? -1 : (String(a) > String(b) ? 1 : 0);
      });
      bits.push((sheets.length > 1 ? "sheets " : "sheet ") + sheets.join(", "));
    }
    return bits.join(" · ") +
      (reference.unverified ? " (" + VA.ATTENTION.unverified.text + ")" : "");
  };

  // What a card's drawing line has left to say once the card's TITLE has been
  // read (Jeff, 2026-09-16: a part number "is never printed on two consecutive
  // lines" -- the 214820-002 bushing's card said "214820-002 plain bushing"
  // and then "drawing 214820-002" directly beneath it).
  //
  // Most Joby parts here are NAMED after their drawing, so the number in the
  // heading and the number in the drawing line are the same characters twice.
  // Where the title already carries it, the only thing left worth printing is
  // the REVISION -- which the title never carries -- and a part with no
  // revision recorded gets no line at all rather than a line that repeats.
  // Where the title does not carry it (a part named "propeller hub" off
  // drawing 212966-006) the full line stands, unchanged.
  //
  // The word "drawing" survives the suppression, and it has to: without it the
  // component card printed a line whose entire content was "rev A" -- a
  // revision modifying nothing, on the surface this pass exists to de-slop
  // (review, 2026-09-16; three live parts render it). The number is what is
  // dropped, never the noun.
  //
  // Takes the three fields rather than a card, so a node card's SIDE -- which
  // carries the same three under different names -- gets the same answer as
  // the component card for the same part.
  VA.componentDrawingText = function (title, drawing, revision) {
    if (!drawing) return null;
    var rev = revision ? VA.revisionText(revision) : null;
    if (String(title || "").indexOf(String(drawing)) !== -1) {
      return rev ? "drawing " + rev : null;
    }
    return "drawing " + drawing + (rev ? " " + rev : "");
  };

  // The word an adjacent edge with NO part gets wherever a node's sides are
  // listed. A clearance is a real side of an interface, not a missing one, so
  // it is named rather than skipped -- and named in the grid's own words.
  VA.CLEARANCE_SIDE_LABEL = "a clearance";

  // An interface in a reader's words. Same rule as VA.componentLabel: the
  // authored name, and the id only where a projection names a node the graph
  // does not declare -- which is a diagnostic, not a label.
  VA.nodeLabel = function (topoProj, nodeId) {
    var node = VA.topologyIndex(topoProj).nodes[nodeId];
    return (node && node.name) || String(nodeId);
  };

  // The words the preview pane prints for a node's sides. ONE label style
  // now, and ONE derivation: this returns the same `VA.componentLabel` text
  // the grid's merged cell and the node card's side list print, off the same
  // `VA.nodeAdjacentParts` adjacency, so no two surfaces can disagree about
  // either WHICH sides a node has or what to call them.
  //
  // It returned part IDS until 2026-09-15 -- and was named `nodeSideIds` for
  // it -- because a live part name ran to eighty characters and a pane heading
  // had no room for two of them. The names are short noun phrases now
  // (VA.componentLabel), and an id is not a label: see that function.
  //
  // (The adjacency half of this is handoff surfaces_that_state_something_
  // false: the pane printed the node's AUTHORED `parts` here, and live nodes
  // disagreed with their own hover card, because a node against a `gap` edge
  // has a clearance for a side and an authored parts list cannot name one.
  // How MANY was contested and is settled (handoff viewer_value_guard_rows_
  // and_replays, 2026-09-15): it is stated in exactly two places, views/
  // topology.js's renderNodeDetail comment and apps/viewer/README.md, and both
  // are re-derived from the live projection by tests.js's "[real] every live
  // dot answers the SAME on hover and on click". So it is not restated here.)
  VA.nodeSideLabels = function (topoProj, nodeId) {
    var parts = VA.topologyIndex(topoProj).parts;
    return (VA.nodeAdjacentParts(topoProj)[nodeId] || []).map(function (part) {
      if (part === null) return VA.CLEARANCE_SIDE_LABEL;
      return VA.componentLabel(parts[part] || { id: part });
    });
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
  //
  // `kinematic` is resolved FIRST and, when it resolves, wins outright: it is a
  // page of its own, with no topology walk or stack table under it, so any
  // other selection param beside it has nothing to select and is said so.
  VA.resolveDeepLink = function (link, topologies, results, kinematic) {
    var out = { mode: null, topologyId: null, studyId: null, selection: null,
                stackId: null, elementId: null, kinematicId: null, notices: [] };
    if (!link) return out;
    var say = function (text) { out.notices.push(text); };

    if (link.kinematic) {
      var kinematicStudy = VA.findKinematicStudy &&
        VA.findKinematicStudy(kinematic, link.kinematic);
      if (kinematicStudy) {
        out.mode = "kinematic";
        out.kinematicId = link.kinematic;
        // An edge beside it is selected ON the study's page (2026-10-26), the
        // way a row click selects one: an edge of the study's own topology.
        if (link.edge) {
          var under = VA.findTopology(topologies, kinematicStudy.topology);
          if (under && VA.topologyIndex(under).edges[link.edge]) {
            out.topologyId = under.id;
            out.selection = { kind: "edge", id: link.edge };
          } else {
            say("This link asks for edge `" + link.edge + "`, which kinematic study `" +
              link.kinematic + "`'s model does not carry — nothing was selected.");
          }
        }
        if (link.topology || link.study || link.node || link.stack || link.element) {
          say("This link names a kinematic study and something else beside it; " +
            "the kinematic study won and the rest was ignored.");
        }
        return out;
      }
      say("This link asks for kinematic study `" + link.kinematic + "`, which " +
        "this data does not contain — showing the default instead.");
    }

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

  // What the page must not stay quiet about, over and above the shared
  // provenance alarms: a study whose topology is not in the projection at all.
  // The builder carries those rather than dropping them.
  VA.orphanStudyAlarms = function (topologies) {
    return ((topologies && topologies.orphan_studies) || []).map(function (row) {
      return "study `" + row.study + "` (" + row.source_file + ") names topology `" +
        row.topology + "`, which no document in docs/topologies/ declares";
    });
  };
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
