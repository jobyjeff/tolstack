// The kinematic study page (handoff the_viewer_shows_a_kinematic_study,
// 2026-10-20): one page per study in data/projections/viewer/kinematic/
// kinematic_studies.json -- its verdict per stop, the envelope over the sweep,
// one contributor table with a column group per stop, and where the numbers
// came from. Since 2026-10-26 (the_kinematic_page_keeps_the_dag_and_says_each_
// contributor_once) the model is drawn between the head and the body, the
// study's lit set (VA.kinematicLitSet) emphasized on it.
//
// The same shape as views/stack.js and views/topology.js: pure models first
// (no DOM, so the fast tier pins them value by value), then two renderers
// (the head and the body) that topology_app.js calls with a ctx. Nothing here adds anything up. Every
// number on the page is a field of the projection, which
// scripts/build_kinematic_projection.py folded through
// tolerance_stack.kinematic -> fold(); the only thing done to a number here is
// printing it at the precision the projection itself states
// (`display_decimals`), and placing it on the chart.
//
// The chart is drawn LIVE, as inline SVG, from `envelope[]`. The builder's own
// SVG beside the JSON is its evidence file and is deliberately not embedded:
// a picture cannot be hovered, and a second rendering of the same numbers is
// one this page cannot keep in step with itself.
(function (VA, VOCAB) {
  "use strict";

  // --- the vocabularies this page renders, each a generated key set ----------
  //
  // Python owns the words (tolerance_stack/kinematic.py, and the builder's
  // STUDY_STATUSES); scripts/js_vocabulary.py generates them; VOCAB.table
  // throws at load if a word here and a word there part. The copy is this
  // page's.

  // A row of a stop's contributor table. `term` entered the fold and says
  // nothing about itself; `gap` has a sensitivity and no band anywhere, and
  // reads the way a valueless edge reads on the rails; `zero_sensitivity` has
  // a band whose sensitivity is exactly zero at this point, and is muted.
  VA.KINEMATIC_ROW_KINDS = VOCAB.table("KINEMATIC_ROW_KINDS", {
    term: { flag: null, title: null, muted: false },
    gap: {
      flag: "no band on file",
      title: "No tolerance for this contributor is cited anywhere yet. Its " +
        "sensitivity is shown so the cost of a band is visible; it adds " +
        "nothing to the totals above.",
      muted: false,
    },
    zero_sensitivity: {
      flag: "no effect here",
      title: "A band is on file, but the sweep's sensitivity to it is exactly " +
        "zero at this point, so it adds nothing here.",
      muted: true,
    },
  });

  // The shape of a contributor's tolerance zone.
  VA.KINEMATIC_ZONE_KINDS = VOCAB.table("KINEMATIC_ZONE_KINDS", {
    band: { label: "band", title: "a ± half-width along one dimension" },
    sphere: { label: "sphere", title: "a radius about a point, in any direction" },
    disk: { label: "disk", title: "a radius over two tilt directions" },
  });

  // Where a contributor's physical feature was identified.
  VA.KINEMATIC_FEATURE_SOURCES = VOCAB.table("KINEMATIC_FEATURE_SOURCES", {
    artifact: { words: "feature identified by the sweep itself" },
    authored: { words: "feature named by the study's author" },
  });

  // A study row's outcome: an error is a result, carried with its message.
  VA.KINEMATIC_STUDY_STATUSES = VOCAB.table("KINEMATIC_STUDY_STATUSES", {
    ok: { failed: false },
    error: { failed: true },
  });

  // What a word this page has no branch for must say: loud and named, the
  // VA.unlabelledVerdictText posture, because silence would read as handled.
  VA.unlabelledKinematicText = function (field, value) {
    return field + " " + JSON.stringify(value === undefined ? null : value) +
      ", which this viewer has no branch for";
  };

  // --- finding things -------------------------------------------------------

  VA.findKinematicStudy = function (projection, studyId) {
    var studies = (projection && projection.studies) || [];
    for (var i = 0; i < studies.length; i++) {
      if (studies[i].id === studyId) return studies[i];
    }
    return null;
  };

  VA.findKinematicModel = function (projection, topologyId) {
    var models = (projection && projection.models) || [];
    for (var i = 0; i < models.length; i++) {
      if (models[i].topology === topologyId) return models[i];
    }
    return null;
  };

  function topologyTitle(topologies, topologyId) {
    var topology = VA.findTopology(topologies, topologyId);
    return (topology && topology.title) || topologyId;
  }

  // --- the nav section -------------------------------------------------------
  //
  // One group per topology, in the order the projection first names it: its
  // studies, and -- for a topology with published sweep runs and no study yet
  // -- one model row that opens the 3D scene in sweep mode on the newest run
  // (DRAFT_kinematic_model_viewer.md, decision 1). An absent projection is an
  // empty list, which views/nav.js renders as no section at all.
  VA.kinematicNav = function (projection, topologies) {
    if (!projection) return [];
    var groups = [];
    var byId = {};
    var group = function (topologyId) {
      if (!byId[topologyId]) {
        byId[topologyId] = { topologyId: topologyId,
          title: topologyTitle(topologies, topologyId), studies: [], model: null };
        groups.push(byId[topologyId]);
      }
      return byId[topologyId];
    };
    (projection.studies || []).forEach(function (study) {
      var status = VA.KINEMATIC_STUDY_STATUSES[study.status];
      // The row's one mark, over the chain studies' own scheme: its checks are
      // rounded_check's shape, so VA.studyVerdict reads them unchanged and a
      // budget-scoped pass wears the same amber a chain study's does.
      group(study.topology).studies.push({
        id: study.id, title: study.title || study.id,
        description: study.description || null,
        failed: status ? status.failed : true,
        navStatus: VA.studyNavStatus({ verdict: VA.studyVerdict(
          { status: status && !status.failed ? "ok" : "error",
            checks: study.checks || [] }) }),
      });
    });
    (projection.models || []).forEach(function (model) {
      if (byId[model.topology] && byId[model.topology].studies.length) return;
      var newest = (model.runs || [])[0] || {};
      group(model.topology).model = {
        runId: model.newest_run_id,
        mechanism: newest.mechanism || null,
        ts: newest.ts || null,
      };
    });
    return groups;
  };

  // --- printing a number ------------------------------------------------------
  //
  // At the precision the PROJECTION states, never one chosen here: the builder
  // owns `display_decimals` (DISPLAY_DECIMALS), for the reason Python owns
  // every other rounding this app shows. With no such field -- a projection
  // older than it -- the number prints verbatim through VA.fmt rather than at
  // a precision this file would have had to make up.
  VA.kinematicNumber = function (n, decimals) {
    if (typeof n !== "number" || !isFinite(n)) return VA.fmt(n);
    if (typeof decimals !== "number") return VA.fmt(n);
    var text = n.toFixed(decimals);
    // -0.000 is a rounding artefact, not a direction.
    return /^-0\.?0*$/.test(text) ? text.slice(1) : text;
  };

  VA.kinematicSigned = function (n, decimals) {
    var text = VA.kinematicNumber(n, decimals);
    return typeof n === "number" && n > 0 ? "+" + text : text;
  };

  function withUnit(text, unit) {
    return unit ? text + " " + unit : text;
  }

  function measureWords(study) {
    return String(study.measure || "measure").replace(/_/g, " ");
  }

  // --- the head: one verdict per stop ------------------------------------------
  //
  // VA.studyCheckRow supplies the verdict, its sentence and the budget scope in
  // exactly the words the chain studies' verdict rows use; only the margin is
  // re-printed here, at the projection's precision.
  //
  // Each verdict also carries the two citations it stands on, as the citation
  // hover card every other cited number on this app opens (VA.citationCard):
  // the limit's (`limitCard`: where it is written, the requirement's own words,
  // and the note saying why it was adopted -- on the live study, that S461-607
  // is a blade-to-blade limit borrowed because S461-241 gives only the stop
  // angles) and the stop's (`contextCard`: the requirement that names the
  // operating point, the check's own `context_ref` first, else the stop's).
  // A PASS against a borrowed criterion has to lead to the borrowing.
  VA.kinematicVerdicts = function (study, decimals) {
    var stops = {};
    (study.stops || []).forEach(function (stop) { stops[stop.id] = stop; });
    return (study.checks || []).map(function (check) {
      var row = VA.studyCheckRow(check);
      var stop = stops[check.stop];
      return {
        checkId: check.check_id,
        stop: check.stop,
        stopLabel: stop ? stop.label : check.stop,
        verdict: row.verdict,
        title: row.title,
        says: row.says,
        incomplete: row.incomplete,
        scopeChip: row.scopeChip,
        scopeTitle: row.scopeTitle,
        marginText: "margin " + withUnit(
          VA.kinematicSigned(check.margin, decimals), check.units),
        limitText: check.limit
          ? "limit ±" + withUnit(VA.kinematicNumber(check.limit.value, decimals),
              check.limit.units)
          : null,
        limitCard: check.limit ? VA.citationCard(check.limit.source_ref || null) : null,
        contextCard: VA.citationCard(check.context_ref ||
          (stop && stop.context_ref) || null),
        label: check.label,
      };
    });
  };

  // --- one stop's contributor table ----------------------------------------------

  // The unit a coefficient is in: the measure's per the band's. Stated once,
  // in the column header, when every banded row agrees -- and per cell when
  // they do not, so no number on the page is ever without one.
  VA.kinematicCoefficientUnit = function (study, stop) {
    var units = {};
    (stop.rows || []).forEach(function (row) {
      if (row.band && row.band.units) units[row.band.units] = true;
    });
    var keys = Object.keys(units);
    return keys.length === 1 && study.units ? study.units + "/" + keys[0] : null;
  };

  // Every stop's rows, one list: the same contributors at every stop, so the
  // unit a coefficient is in is a fact about the study and not about a stop.
  function allStopRows(study) {
    var rows = [];
    (study.stops || []).forEach(function (stop) { rows = rows.concat(stop.rows || []); });
    return rows;
  }

  // --- the one contributor table -------------------------------------------------
  //
  // A contributor is the same feature at every blade angle; what changes across
  // the sweep is its coefficient (Jeff, 2026-10-26: "Why would it be labeled
  // [contributors at the 72° stop] if the same features are contributors at
  // all blade angles?"). So the page says each contributor ONCE, with a column
  // group per stop -- sign, coefficient, magnitude -- and its band, confidence
  // and 3D control after them. Rows are ordered by the larger of a row's stop
  // magnitudes, a gap row (no band, so no magnitude) last in the study's own
  // order: the per-stop rankings the builder makes, read across both stops.
  // The ranking is an ORDERING of numbers the projection carries, never a
  // number of its own.
  VA.kinematicTable = function (study, topoProj, decimals) {
    var index = VA.topologyIndex(topoProj);
    var shared = VA.kinematicCoefficientUnit(study, { rows: allStopRows(study) });
    var curves = {};
    (study.contributors || []).forEach(function (c) { curves[c.edge] = c.by_point || null; });
    var order = [];
    var byEdge = {};
    (study.stops || []).forEach(function (stop, s) {
      (stop.rows || []).forEach(function (row) {
        if (!byEdge[row.edge]) {
          byEdge[row.edge] = { first: row, cells: [] };
          order.push(row.edge);
        }
        byEdge[row.edge].cells[s] = row;
      });
    });
    // Document order for the tie-break and for the gap rows, which is the
    // study's `contributors[]` order where the projection carries it.
    var documentOrder = (study.contributors || []).map(function (c) { return c.edge; });
    var position = function (edge) {
      var i = documentOrder.indexOf(edge);
      return i === -1 ? documentOrder.length + order.indexOf(edge) : i;
    };
    var reach = function (edge) {
      var best = null;
      byEdge[edge].cells.forEach(function (cell) {
        if (cell && typeof cell.magnitude === "number" &&
            (best === null || cell.magnitude > best)) best = cell.magnitude;
      });
      return best;
    };
    order.sort(function (a, b) {
      var ra = reach(a);
      var rb = reach(b);
      if (ra === null || rb === null) {
        if (ra !== rb) return ra === null ? 1 : -1;
        return position(a) - position(b);
      }
      return rb - ra || position(a) - position(b);
    });

    var stops = (study.stops || []).map(function (stop) {
      return { id: stop.id, label: stop.label, index: stop.index,
               summary: VA.kinematicStopSummary(study, stop, decimals) };
    });
    var rows = order.map(function (edgeId) {
      var first = byEdge[edgeId].first;
      var gap = byEdge[edgeId].cells.some(function (c) { return c && c.kind === "gap"; });
      var kindName = gap ? "gap" : first.kind;
      var kind = VA.KINEMATIC_ROW_KINDS[kindName];
      var zone = VA.KINEMATIC_ZONE_KINDS[first.zone];
      var source = VA.KINEMATIC_FEATURE_SOURCES[first.feature_source];
      var edge = index.edges[edgeId] || null;
      var band = first.band;
      var perCellUnit = shared ? null
        : (band && band.units && study.units ? study.units + "/" + band.units : null);
      return {
        edge: edgeId,
        topology: study.topology,
        name: edge ? edge.name : edgeId,
        part: edge ? edge.part || null : null,
        title: edgeId + " · " + (source ? source.words
          : VA.unlabelledKinematicText("feature_source", first.feature_source)),
        kind: kindName,
        flag: gap ? kind.flag : null,
        flagTitle: gap ? kind.title : null,
        zone: zone ? zone.label : VA.unlabelledKinematicText("zone", first.zone),
        zoneTitle: zone ? zone.title : null,
        // One cell group per stop, in the stops' order. A zero-sensitivity
        // cell is muted and says why on hover; a kind this page has no branch
        // for says so, in the cell, loudly.
        cells: stops.map(function (stop, s) {
          return tableCell(byEdge[edgeId].cells[s], stop, perCellUnit, decimals);
        }),
        band: band
          ? withUnit("±" + VA.kinematicNumber(band.half_range, decimals), shared ? null : band.units)
          : null,
        bandTitle: band ? band.name : (first.gap || null),
        confidence: first.confidence || null,
        note: first.note || null,
        curve: curves[edgeId] || null,
        reach: reach(edgeId),
      };
    });
    return {
      stops: stops,
      coefficientUnit: shared,
      bandUnits: shared ? shared.split("/")[1] : null,
      rows: rows,
      groups: (study.study_refs || []).map(function (ref) {
        return kinematicGroup(study, ref, index, stops, shared, decimals);
      }),
    };
  };

  // One stop's cell of a row: the sign, the coefficient and the magnitude as
  // the projection states them, printed at its precision. A zero-sensitivity
  // cell is muted and says why on hover; a kind this page has no branch for
  // says so, in the cell, loudly.
  function tableCell(cell, stop, perCellUnit, decimals) {
    if (!cell) return null;
    var cellKind = VA.KINEMATIC_ROW_KINDS[cell.kind];
    return {
      stop: stop.id,
      sign: cell.sign < 0 ? "−" : "+",
      coefficient: withUnit(VA.kinematicNumber(cell.coefficient, decimals), perCellUnit),
      magnitude: typeof cell.magnitude === "number"
        ? VA.kinematicNumber(cell.magnitude, decimals) : null,
      muted: cellKind ? cellKind.muted : false,
      flag: cellKind ? (cell.kind === "zero_sensitivity" ? cellKind.flag : null)
        : VA.unlabelledKinematicText("row kind", cell.kind),
      flagTitle: cellKind && cell.kind === "zero_sensitivity" ? cellKind.title : null,
    };
  }

  // A contributor that is itself a study (`study_refs[]`): ONE row, and under
  // it the study's own terms, each a normal term row whose coefficient is the
  // sweep's sensitivity to the study's parameter times the term's own (the
  // chain rule, folded by the builder -- never here). The group row's own
  // cells are that sensitivity and the group's worst-case reach; its band is
  // the sub-study's own total, shown for reading and never added to anything.
  function kinematicGroup(study, ref, index, stops, shared, decimals) {
    var perCellUnit = shared ? null
      : (study.units && ref.units ? study.units + "/" + ref.units : null);
    var groupAt = function (stop) {
      var hit = null;
      (stop.groups || []).forEach(function (g) { if (g.study === ref.study) hit = g; });
      return hit;
    };
    var reach = null;
    var cells = (study.stops || []).map(function (stop, s) {
      var g = groupAt(stop);
      if (!g) return null;
      if (reach === null || g.reach > reach) reach = g.reach;
      return tableCell({ kind: "term", sign: g.sign, coefficient: Math.abs(g.entry),
                         magnitude: g.reach }, stops[s], perCellUnit, decimals);
    });
    var sameTopology = ref.topology === study.topology;
    var children = (ref.children || []).map(function (child, k) {
      var edge = sameTopology ? index.edges[child.edge] || null : null;
      var first = null;
      var childCells = (study.stops || []).map(function (stop, s) {
        var g = groupAt(stop);
        var c = g && g.children[k];
        if (!c) return null;
        if (!first) first = c;
        return tableCell(c, stops[s], perCellUnit, decimals);
      });
      var zone = VA.KINEMATIC_ZONE_KINDS[first && first.zone ? first.zone : "band"];
      var band = first && first.band;
      return {
        child: true,
        edge: child.edge,
        topology: ref.topology,
        name: edge ? edge.name : child.name,
        part: edge ? edge.part || null : null,
        title: child.edge + " · a term of " + ref.title,
        kind: first ? first.kind : "term",
        flag: null,
        flagTitle: null,
        zone: zone ? zone.label : "band",
        zoneTitle: zone ? zone.title : null,
        cells: childCells,
        band: band ? withUnit("±" + VA.kinematicNumber(band.half_range, decimals),
                              shared ? null : ref.units) : null,
        bandTitle: band ? band.name : null,
        confidence: first ? first.confidence || null : null,
        note: null,
        curve: child.by_point || null,
      };
    });
    var total = ref.total || {};
    return {
      group: true,
      id: ref.study,
      name: ref.title,
      title: "Its terms enter one by one, each scaled by " + measureWords(study) +
        "'s sensitivity to " + (((study.sweep || {}).driver || {}).label || "its driver") + ".",
      zone: "study",
      cells: cells,
      band: typeof total.worst_case_half === "number"
        ? withUnit("±" + VA.kinematicNumber(total.worst_case_half, decimals),
                   shared ? null : ref.units) : null,
      bandTitle: "the study's own worst-case total, read beside the terms and not added to them",
      reach: reach,
      children: children,
    };
  }

  // A stop's one summary line, for its column group's header: where on the
  // sweep it is, what the measure is there, and both spreads.
  VA.kinematicStopSummary = function (study, stop, decimals) {
    return withUnit(VA.kinematicNumber(stop.nominal_measure, decimals), study.units) +
      " · ±" + withUnit(VA.kinematicNumber(stop.worst_case_half, decimals), study.units) +
      " worst case · ±" + withUnit(VA.kinematicNumber(stop.rss_half, decimals), study.units) +
      " RSS";
  };

  // --- the study's lit set on the model ---------------------------------------
  //
  // What the DAG beside this page lights (VA.studyLitSet's kinematic twin): the
  // contributor edges, and the edge each one borrows its band from where that
  // is an edge of the same topology (`band_source.kind == "dimension_ref"` --
  // pitch_arm_radius is banded by the arm's link-hole-to-clocking-hole edge,
  // and both are the feature). A contributor whose band is a STUDY's result
  // (`band_source.study`, the hook a_contributor_may_be_a_study fills) lights
  // that study's chain the same way. Nodes: every end of a lit edge; joints
  // between lit nodes and the path joining its pieces are lit too (VA.litSetOfEdges,
  // VA.bridgeLitSet).
  VA.kinematicLitSet = function (study, topoProj) {
    if (!study || !topoProj) return null;
    var edges = [];
    var add = function (id) { if (id && edges.indexOf(id) === -1) edges.push(id); };
    allStopRows(study).forEach(function (row) {
      add(row.edge);
      var source = row.band_source || {};
      if (source.topology && source.topology !== study.topology) return;
      if (source.kind === "dimension_ref") add(source.edge);
      if (source.study) {
        var chained = VA.findStudy(topoProj, source.study);
        Object.keys(VA.chainIndex(chained)).forEach(add);
      }
    });
    // A contributor that is a study (`stops[].groups[]`) lights its terms'
    // edges, where they are edges of this topology.
    (study.stops || []).forEach(function (stop) {
      (stop.groups || []).forEach(function (group) {
        if (group.topology && group.topology !== study.topology) return;
        (group.children || []).forEach(function (child) { add(child.edge); });
      });
    });
    if (!edges.length) return null;
    return VA.bridgeLitSet(topoProj, VA.litSetOfEdges(topoProj, edges));
  };

  // The page's sub-stacks (docs/DAG_TOPOLOGY.md, "Bodies on the DAG"): one per
  // `study_ref` into this study's own topology, with the edges its terms are
  // and its folded interval as the DAG's label prints it -- display only, the
  // chain rule never reuses the fold. The DAG draws each as a dashed field
  // around those edges; it and the table's group row open and close on one
  // piece of state (`ctx.openSubStacks`, keyed by the sub-study's id).
  VA.kinematicSubStacks = function (study, decimals) {
    if (!study) return [];
    return (study.study_refs || []).filter(function (ref) {
      return !ref.topology || ref.topology === study.topology;
    }).map(function (ref) {
      var edges = [];
      (ref.children || []).forEach(function (child) {
        if (child.edge && edges.indexOf(child.edge) === -1) edges.push(child.edge);
      });
      var total = ref.total || {};
      var interval = typeof total.worst_case_min === "number" &&
        typeof total.worst_case_max === "number"
        ? VA.kinematicNumber(total.worst_case_min, decimals) + " to " +
          VA.kinematicNumber(total.worst_case_max, decimals) +
          (ref.units ? " " + ref.units : "")
        : null;
      return { id: ref.study, title: ref.title || ref.study, edges: edges,
               interval: interval };
    });
  };

  // { contributor edge: band edge } for each contributor whose band is ANOTHER
  // edge of the study's topology -- the preview pane names that edge beside a
  // contributor that has no value of its own, so a reader looking for the
  // citation is one click from it.
  VA.kinematicBandEdges = function (study) {
    var out = {};
    if (!study) return out;
    allStopRows(study).forEach(function (row) {
      var source = row.band_source || {};
      if (source.kind === "dimension_ref" && source.edge && source.edge !== row.edge &&
          (!source.topology || source.topology === study.topology)) {
        out[row.edge] = source.edge;
      }
    });
    return out;
  };

  // --- a coefficient across the sweep ---------------------------------------------
  //
  // The small chart a coefficient cell's hover shows: the SIGNED coefficient
  // (sign × coefficient -- placing a point above or below the axis, not adding
  // anything) at every sweep point against the driver, ascending whatever
  // order the sweep runs in, with zero drawn and the stops marked. Pure, in
  // viewBox units. null where the projection carries no per-point field.
  VA.KINEMATIC_CURVE = Object.freeze({
    width: 240, height: 96, left: 40, right: 8, top: 8, bottom: 20,
  });

  VA.kinematicCurve = function (study, row, decimals, stopId) {
    var points = row && row.curve;
    var env = study.envelope || [];
    if (!points || !points.length || !env.length) return null;
    var C = VA.KINEMATIC_CURVE;
    var pw = C.width - C.left - C.right;
    var ph = C.height - C.top - C.bottom;
    var driverAt = function (p) {
      var at = env[p.index];
      return at ? at.driver_value : null;
    };
    var placed = points.map(function (p) {
      return { d: driverAt(p), v: p.sign < 0 ? -p.coefficient : p.coefficient };
    }).filter(function (p) { return typeof p.d === "number"; });
    if (!placed.length) return null;
    placed.sort(function (a, b) { return a.d - b.d; });
    var x0 = placed[0].d;
    var x1 = placed[placed.length - 1].d;
    var lo = Math.min(0, Math.min.apply(null, placed.map(function (p) { return p.v; })));
    var hi = Math.max(0, Math.max.apply(null, placed.map(function (p) { return p.v; })));
    if (hi === lo) hi = lo + 1;
    var pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
    var X = function (v) { return C.left + (v - x0) / ((x1 - x0) || 1) * pw; };
    var Y = function (v) { return C.top + (hi - v) / (hi - lo) * ph; };
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    var stops = (study.stops || []).map(function (stop) {
      return { id: stop.id, x: r2(X(stop.driver_value)), on: stop.id === stopId };
    });
    var driver = (study.sweep && study.sweep.driver) || {};
    var vmin = Math.min.apply(null, placed.map(function (p) { return p.v; }));
    var vmax = Math.max.apply(null, placed.map(function (p) { return p.v; }));
    return {
      width: C.width, height: C.height,
      plot: { left: C.left, top: C.top, width: pw, height: ph },
      path: placed.map(function (p, i) {
        return (i ? "L " : "M ") + r2(X(p.d)) + " " + r2(Y(p.v));
      }).join(" "),
      zeroY: r2(Y(0)),
      crossesZero: vmin < 0 && vmax > 0,
      stops: stops,
      yTop: VA.kinematicSigned(vmax, decimals),
      yBottom: VA.kinematicSigned(vmin, decimals),
      xLeft: VA.kinematicNumber(x0, decimals),
      xRight: VA.kinematicNumber(x1, decimals),
      xLabel: (driver.label || "driver") + (driver.unit ? ", " + driver.unit : ""),
    };
  };

  // --- what resolves a gap row ------------------------------------------------------
  //
  // The `no band on file` chip's card: the drawing each of the edge's parts
  // names, and whether a copy is on file to be read (the builder's
  // `gap_rows[].drawings`, read off drawing-checker's drawing inbox). In
  // everyday words; a drawing number is a document's name, never a file's.
  VA.KINEMATIC_GAP_DRAWING_WORDS = Object.freeze({
    onFile: "drawing on file, not yet read",
    notOnFile: "no drawing on file",
    noneNamed: "names no drawing",
  });

  VA.kinematicGapCard = function (study, row, topoProj) {
    var gap = null;
    (study.gap_rows || []).forEach(function (g) { if (g.edge === row.edge) gap = g; });
    var index = VA.topologyIndex(topoProj);
    var words = VA.KINEMATIC_GAP_DRAWING_WORDS;
    var drawings = ((gap && gap.drawings) || []).map(function (d) {
      var part = index.parts[d.part];
      var name = (part && part.name) || d.part_name || d.part;
      return {
        label: d.drawing ? d.drawing + " · " + name : name,
        state: !d.drawing ? words.noneNamed : d.on_file ? words.onFile : words.notOnFile,
        onFile: !!(d.drawing && d.on_file),
      };
    });
    return {
      kind: "gap",
      title: row.name,
      why: (gap && gap.gap) || row.flagTitle || null,
      drawings: drawings,
    };
  };

  // --- the envelope chart's geometry ------------------------------------------------
  //
  // Pure, in viewBox units, so the fast tier can pin where things land. x is
  // the sweep's driver; y is the DEVIATION FROM NOMINAL, not the measure
  // itself: a ±0.24 deg band on an 80 deg axis is a line one pixel thick, which
  // was the 2026-10-16 lesson's own finding about plotting it the other way.
  // The axis is symmetric about zero and reaches past both the widest
  // worst-case edge and the limit, so a limit is always on the chart.
  // Sized for the right-hand pane it is drawn in since 2026-10-28 (the pane's
  // 560px default less its padding), so its text lands at the token sizes.
  VA.KINEMATIC_CHART = Object.freeze({
    width: 520, height: 280, left: 52, right: 12, top: 14, bottom: 44,
  });

  // --- a stop whose position is itself a tolerance --------------------------
  //
  // Where a stop carries a study among its contributors and that study moves
  // the sweep's own driver (`study_refs[].parameter` is the sweep's
  // parameter: the travel between the end stops, in actuator mm), the stop's
  // place on x is a band, not a line (Jeff, 2026-10-28: "both the X and Y
  // axis of the plot have tolerance ranges"). On x the band is the study's
  // own total about the stop's driver, worst case and RSS. On y, across it,
  // the deviation is the stop's local slope times the shift, plus what the
  // stop's other contributors spread:
  //
  //   worst case  a parallelogram, y = J·dx ± d over |dx| <= h, whose far
  //               corners reach |J|·h + d -- the stop's folded worst case,
  //               since d is that total less the group's own reach and the
  //               builder folded the group's terms at exactly |J| times
  //               their bands (the chain rule);
  //   RSS         the sheared ellipse dx = a·cos t, y = J·a·cos t + b·sin t,
  //               whose top is sqrt((J·a)^2 + b^2) -- the stop's RSS half,
  //               with b what the other contributors spread in quadrature.
  //
  // Every number is the projection's: J is the group's entry at the stop's
  // own sweep point, h and a the study's own halves. Display only -- nothing
  // here is folded, and the chips read the builder's totals, not these.
  VA.kinematicTravelBands = function (study) {
    var out = [];
    if (!study) return out;
    var parameter = (((study.sweep || {}).driver) || {}).parameter;
    var refs = {};
    (study.study_refs || []).forEach(function (ref) { refs[ref.study] = ref; });
    (study.stops || []).forEach(function (stop) {
      (stop.groups || []).forEach(function (group) {
        var ref = refs[group.study];
        var total = ref && ref.total;
        if (!ref || !total || typeof total.worst_case_half !== "number") return;
        // Only a study that moves the driver itself is a shift along x.
        if (!parameter || ref.parameter !== parameter) return;
        var entry = null;
        (ref.entries || []).forEach(function (e) {
          if (e.index === stop.index) entry = e.entry;
        });
        if (typeof entry !== "number") entry = group.entry;
        var slope = Math.abs(entry);
        var h = total.worst_case_half;
        var a = typeof total.rss_half === "number" ? total.rss_half : 0;
        var d = Math.max(0, stop.worst_case_half - group.reach);
        var b = Math.sqrt(Math.max(0, stop.rss_half * stop.rss_half - slope * a * slope * a));
        out.push({
          stop: stop.id, study: ref.study, title: ref.title || ref.study,
          units: ref.units || null, centre: stop.driver_value, entry: entry,
          worstHalf: h, rssHalf: a, direct: d, directRss: b,
          cornerWorst: slope * h + d,
          cornerRss: Math.sqrt(slope * a * slope * a + b * b),
          min: total.worst_case_min, max: total.worst_case_max, nominal: total.nominal,
        });
      });
    });
    return out;
  };

  // The study's bands drawn at more than one stop: a study that is the
  // distance BETWEEN two stops moves one of them relative to the other, so
  // carrying it at both is a reading the page states rather than hides
  // (VA.KINEMATIC_TRAVEL_DATUM_ISSUE). Ids of the studies that do.
  VA.kinematicSharedBands = function (bands) {
    var count = {};
    (bands || []).forEach(function (band) { count[band.study] = (count[band.study] || 0) + 1; });
    return Object.keys(count).filter(function (id) { return count[id] > 1; });
  };

  // The open question that sentence leads to, as a repo-relative path
  // (tests/test_kinematic.py checks the file is there).
  VA.KINEMATIC_TRAVEL_DATUM_ISSUE =
    "docs/issues/ISSUE_20261028_both_end_stops_carry_the_full_travel_band.md";

  function niceStep(span, target) {
    var raw = span / Math.max(target, 1);
    var magnitude = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var steps = [1, 2, 2.5, 5, 10];
    for (var i = 0; i < steps.length; i++) {
      if (raw <= steps[i] * magnitude) return steps[i] * magnitude;
    }
    return 10 * magnitude;
  }

  function ticks(lo, hi, target) {
    var step = niceStep(hi - lo, target);
    var out = [];
    for (var k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
      // Rounded so a tick is 0.1 and not 0.30000000000000004.
      out.push(Math.round(k * step * 1e9) / 1e9);
    }
    return { step: step, values: out };
  }

  VA.kinematicChart = function (study, decimals) {
    var C = VA.KINEMATIC_CHART;
    var env = study.envelope || [];
    if (!env.length) return null;
    var pw = C.width - C.left - C.right;
    var ph = C.height - C.top - C.bottom;
    var xs = env.map(function (p) { return p.driver_value; });
    var sweptFrom = Math.min.apply(null, xs);
    var sweptTo = Math.max.apply(null, xs);
    // The axis reaches past the sweep to hold every stop's travel band.
    var travel = VA.kinematicTravelBands(study);
    travel.forEach(function (t) {
      xs.push(t.centre - t.worstHalf, t.centre + t.worstHalf);
    });
    var x0 = Math.min.apply(null, xs);
    var x1 = Math.max.apply(null, xs);
    var limits = [];
    (study.checks || []).forEach(function (check) {
      if (check.limit && typeof check.limit.value === "number" &&
          limits.indexOf(check.limit.value) === -1) {
        limits.push(check.limit.value);
      }
    });
    var reach = 1e-9;
    env.forEach(function (p) {
      reach = Math.max(reach, Math.abs(p.worst_case_min), Math.abs(p.worst_case_max));
    });
    limits.forEach(function (v) { reach = Math.max(reach, Math.abs(v)); });
    travel.forEach(function (t) { reach = Math.max(reach, t.cornerWorst); });
    var y1 = reach * 1.15;
    var y0 = -y1;
    var X = function (v) { return C.left + (v - x0) / ((x1 - x0) || 1) * pw; };
    var Y = function (v) { return C.top + (y1 - v) / (y1 - y0) * ph; };
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    var band = function (lo, hi) {
      var upper = env.map(function (p) { return r2(X(p.driver_value)) + "," + r2(Y(p[hi])); });
      var lower = env.slice().reverse().map(function (p) {
        return r2(X(p.driver_value)) + "," + r2(Y(p[lo]));
      });
      return upper.concat(lower).join(" ");
    };

    // Each point owns the strip of the plot nearest it, so a hover anywhere in
    // the plot lands on exactly one point, whichever way the sweep is ordered.
    var order = env.map(function (p, i) { return i; }).sort(function (a, b) {
      return env[a].driver_value - env[b].driver_value;
    });
    var points = env.map(function (p, i) {
      return { index: i, x: r2(X(p.driver_value)), hitFrom: 0, hitTo: 0,
               worstTop: r2(Y(p.worst_case_max)), worstBottom: r2(Y(p.worst_case_min)),
               tip: VA.kinematicPointTip(study, p, decimals) };
    });
    order.forEach(function (i, k) {
      var here = points[i].x;
      var prev = k > 0 ? points[order[k - 1]].x : C.left;
      var next = k < order.length - 1 ? points[order[k + 1]].x : C.left + pw;
      points[i].hitFrom = k > 0 ? r2((prev + here) / 2) : C.left;
      points[i].hitTo = k < order.length - 1 ? r2((here + next) / 2) : C.left + pw;
    });

    var driver = (study.sweep && study.sweep.driver) || {};
    var yTicks = ticks(y0, y1, 6);
    var xTicks = ticks(x0, x1, 6);

    // Each travel band's shapes, in plot pixels (VA.kinematicTravelBands says
    // what they are). A study's band is labelled once, at the stop nearest
    // the study's own nominal -- where its interval actually lies.
    var labelled = {};
    var nearest = {};
    travel.forEach(function (t, i) {
      var miss = typeof t.nominal === "number" ? Math.abs(t.centre - t.nominal) : i;
      if (!(t.study in nearest) || miss < nearest[t.study].miss) {
        nearest[t.study] = { miss: miss, index: i };
      }
    });
    var ELLIPSE_STEPS = 48;
    var bands = travel.map(function (t, i) {
      var c = t.centre, h = t.worstHalf, a = t.rssHalf, J = t.entry;
      var pt = function (dx, y) { return r2(X(c + dx)) + "," + r2(Y(y)); };
      var ellipse = [];
      for (var k = 0; k < ELLIPSE_STEPS; k++) {
        var s = 2 * Math.PI * k / ELLIPSE_STEPS;
        ellipse.push(pt(a * Math.cos(s), J * a * Math.cos(s) + t.directRss * Math.sin(s)));
      }
      var label = null;
      if (nearest[t.study].index === i && !labelled[t.study]) {
        labelled[t.study] = true;
        var anchorEnd = X(c) > C.left + pw / 2;
        label = {
          x: r2(X(c) + (anchorEnd ? -5 : 5)), y: C.top + 26, anchorEnd: anchorEnd,
          text: t.title + " " + VA.kinematicNumber(t.min, decimals) + "–" +
            withUnit(VA.kinematicNumber(t.max, decimals), t.units),
        };
      }
      return {
        stop: t.stop, study: t.study,
        worstFrom: r2(X(c - h)), worstTo: r2(X(c + h)),
        rssFrom: r2(X(c - a)), rssTo: r2(X(c + a)),
        worst: [pt(-h, -J * h + t.direct), pt(h, J * h + t.direct),
                pt(h, J * h - t.direct), pt(-h, -J * h - t.direct)].join(" "),
        rss: ellipse.join(" "),
        cornerWorst: t.cornerWorst, cornerRss: t.cornerRss,
        label: label,
      };
    });

    // The axis says what it spans when the travel study's nominal is not the
    // sweep's own span (deliverable 3 of the 2026-10-28 handoff): the band is
    // drawn about the stop the sweep solved, which is a different number.
    var xNote = "";
    var spanText = VA.kinematicNumber(sweptTo - sweptFrom, decimals);
    var noted = travel.filter(function (t) {
      return typeof t.nominal === "number" &&
        VA.kinematicNumber(t.nominal, decimals) !== spanText;
    })[0];
    if (noted) {
      xNote = " (swept " + VA.kinematicNumber(sweptFrom, decimals) + "–" +
        VA.kinematicNumber(sweptTo, decimals) + "; travel study nominal " +
        VA.kinematicNumber(noted.nominal, decimals) + ")";
    }
    return {
      width: C.width, height: C.height,
      plot: { left: C.left, top: C.top, width: pw, height: ph },
      worst: band("worst_case_min", "worst_case_max"),
      rss: band("rss_min", "rss_max"),
      zeroY: r2(Y(0)),
      yTicks: yTicks.values.map(function (v) {
        return { y: r2(Y(v)), text: VA.kinematicSigned(v, decimalsFor(yTicks.step)) };
      }),
      xTicks: xTicks.values.map(function (v) {
        return { x: r2(X(v)), text: VA.kinematicNumber(v, decimalsFor(xTicks.step)) };
      }),
      // The label sits just BELOW the lower limit line, at the plot's left
      // end: the stop labels hold the two top corners, the hover tip is
      // anchored at the top (topology.css), and a hover's cursor line crosses
      // the middle -- the bottom-left corner is the one place none of them
      // reaches. Clamped inside the frame for a limit that is the axis's own
      // reach.
      limits: limits.map(function (v) {
        return { upper: r2(Y(v)), lower: r2(Y(-v)),
                 labelX: C.left + 6,
                 labelY: r2(Math.min(Y(-v) + 12, C.top + ph - 2)),
                 text: "limit ±" + withUnit(VA.kinematicNumber(v, decimals), study.units) };
      }),
      stops: (study.stops || []).map(function (stop) {
        return { id: stop.id, label: stop.label, x: r2(X(stop.driver_value)),
                 anchorEnd: X(stop.driver_value) > C.left + pw / 2 };
      }),
      bands: bands,
      sharedBands: VA.kinematicSharedBands(travel),
      xLabel: (driver.label || "driver") + (driver.unit ? ", " + driver.unit : "") + xNote,
      yLabel: measureWords(study) + " from nominal" +
        (study.units ? ", " + study.units : ""),
      points: points,
    };
  };

  // A tick's own precision: enough decimals to tell two ticks apart, which is
  // a fact about the axis step and not about the data.
  function decimalsFor(step) {
    var d = 0;
    while (d < 6 && Math.abs(Math.round(step * Math.pow(10, d)) - step * Math.pow(10, d)) > 1e-6) d++;
    return d;
  }

  // What a hover on one envelope point reads: where the sweep is, what the
  // measure is there, and both spreads -- each with its unit.
  VA.kinematicPointTip = function (study, point, decimals) {
    var driver = (study.sweep && study.sweep.driver) || {};
    return [
      { label: driver.label || "driver",
        value: withUnit(VA.kinematicNumber(point.driver_value, decimals), driver.unit) },
      { label: measureWords(study),
        value: withUnit(VA.kinematicNumber(point.nominal_measure, decimals), study.units) },
      { label: "worst case",
        value: withUnit("±" + VA.kinematicNumber(point.worst_case_half, decimals), study.units) },
      { label: "RSS",
        value: withUnit("±" + VA.kinematicNumber(point.rss_half, decimals), study.units) },
    ];
  };

  // --- rendering ----------------------------------------------------------------

  // The page has the shape every study page has (2026-10-28): the model and
  // the one contributor table in the main column, and the RESULTS -- the
  // study's name, its verdict per stop, the swept chart, the stop readouts and
  // the provenance fold -- in the right-hand pane, above the selection's
  // preview (topology_app.js's paint). Jeff, 2026-10-28: "vertical screen
  // real estate is precious ... the kinematic study results should use this
  // same pane".
  function studyFailed(study) {
    var status = VA.KINEMATIC_STUDY_STATUSES[study.status];
    return !status || status.failed;
  }

  VA.renderKinematicResults = function (root, ctx) {
    VA.clear(root);
    root.className = "kmresults";
    var study = ctx.study;
    if (!study) {
      root.appendChild(VA.el("p", "muted", "Pick a kinematic study in the list."));
      return root;
    }
    var decimals = ctx.kinematic && ctx.kinematic.display_decimals;
    var head = VA.el("h2", "kmhead__title", study.title || study.id);
    head.setAttribute("title", study.id);
    root.appendChild(head);

    if (studyFailed(study)) {
      var status = VA.KINEMATIC_STUDY_STATUSES[study.status];
      var box = VA.el("div", "tverror");
      box.appendChild(VA.el("div", "tverror__head", status
        ? "This study could not be built from its sweep"
        : VA.unlabelledKinematicText("status", study.status)));
      if (study.error) {
        box.appendChild(VA.el("p", "tverror__message", study.error.message));
      }
      root.appendChild(box);
      return root;
    }
    root.appendChild(verdictStrip(study, decimals, ctx));

    var driver = (study.sweep && study.sweep.driver) || {};
    root.appendChild(VA.el("p", "muted kmhead__driver",
      "Swept over " + (driver.label || "the driver") +
      (driver.unit ? ", " + driver.unit : "") + " · " +
      (study.envelope || []).length + " points · " +
      measureWords(study) + " in " + (study.units || "its own units")));

    var chart = VA.kinematicChart(study, decimals);
    if (chart) root.appendChild(chartFigure(chart));
    if (chart && chart.sharedBands.length) root.appendChild(sharedBandNote(study, chart, ctx));

    root.appendChild(stopReadouts(study, decimals));
    root.appendChild(provenance(study));
    return root;
  };

  VA.renderKinematic = function (root, ctx) {
    VA.clear(root);
    root.className = "kmview";
    var study = ctx.study;
    if (!study || studyFailed(study)) return root;
    var decimals = ctx.kinematic && ctx.kinematic.display_decimals;
    var topoProj = VA.findTopology(ctx.topologies, study.topology);
    root.appendChild(contributorTable(study, topoProj, decimals, ctx));
    return root;
  };

  // One line under the chart where a study's band is drawn at more than one
  // stop. The question it names is a link only where this page can reach the
  // repo's documents (`ctx.docsHref`); elsewhere it is the same words.
  function sharedBandNote(study, chart, ctx) {
    var count = chart.bands.filter(function (band) {
      return chart.sharedBands.indexOf(band.study) !== -1;
    }).length;
    var line = VA.el("p", "muted kmchart__note");
    line.appendChild(document.createTextNode(
      (count === (study.stops || []).length && count === 2 ? "Both stops" : count + " stops") +
      " carry the whole travel band; which one it belongs to is "));
    var href = ctx && typeof ctx.docsHref === "function"
      ? ctx.docsHref(VA.KINEMATIC_TRAVEL_DATUM_ISSUE) : null;
    var words = "an open question";
    if (href) {
      var a = VA.el("a", "kmchart__notelink", words);
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      line.appendChild(a);
    } else {
      line.appendChild(document.createTextNode(words));
    }
    line.appendChild(document.createTextNode("."));
    return line;
  }

  // Each stop's readout, one row per stop: where it is on the sweep, the
  // measure there, and both spreads -- the builder's numbers at the
  // projection's precision. The margin is the verdict's, in the strip above.
  VA.kinematicStopReadouts = function (study, decimals) {
    var driver = (study.sweep && study.sweep.driver) || {};
    return {
      head: [
        "stop",
        withUnit(driver.label || "driver", driver.unit ? "(" + driver.unit + ")" : null),
        withUnit(measureWords(study), study.units ? "(" + study.units + ")" : null),
        "worst case", "RSS",
      ],
      rows: (study.stops || []).map(function (stop) {
        return {
          stop: stop.id,
          cells: [
            stop.label,
            VA.kinematicNumber(stop.driver_value, decimals),
            VA.kinematicNumber(stop.nominal_measure, decimals),
            "±" + VA.kinematicNumber(stop.worst_case_half, decimals),
            "±" + VA.kinematicNumber(stop.rss_half, decimals),
          ],
        };
      }),
    };
  };

  function stopReadouts(study, decimals) {
    var model = VA.kinematicStopReadouts(study, decimals);
    var table = VA.el("table", "kmreadouts");
    var head = VA.el("tr");
    model.head.forEach(function (text, i) {
      // Right-aligned over its numbers, in the label face, not theirs.
      head.appendChild(VA.el("th", i ? "kmreadouts__numhead" : null, text));
    });
    table.appendChild(head);
    model.rows.forEach(function (row) {
      var tr = VA.el("tr", "kmreadouts__row");
      tr.setAttribute("data-stop", row.stop);
      row.cells.forEach(function (text, i) {
        tr.appendChild(VA.el("td", i ? "num" : null, text));
      });
      table.appendChild(tr);
    });
    return table;
  }

  // A cell that opens a citation card on hover, focus or click -- the trigger
  // shape the topology rail's confidence chip uses. With no card host (a page
  // embedding this view without one), the citation's where-line is the
  // native tooltip instead, so the citation is never unreachable.
  function citationTrigger(node, card, ctx) {
    if (!card) return node;
    if (!ctx || !ctx.onCardShow) {
      node.setAttribute("title", card.title);
      return node;
    }
    node.className += " cardtrig";
    node.setAttribute("tabindex", "0");
    var show = function () { ctx.onCardShow(card, node); };
    node.onmouseenter = show;
    node.onfocus = show;
    node.onclick = show;
    return node;
  }

  function verdictStrip(study, decimals, ctx) {
    var verdicts = VA.kinematicVerdicts(study, decimals);
    if (!verdicts.length) {
      var strip = VA.el("div", "kmhead__verdicts");
      strip.appendChild(VA.el("span", "muted", study.no_checks_reason ||
        "no pass/fail criterion recorded yet"));
      return strip;
    }
    return VA.verdictStrip(verdicts.map(function (v) {
      return { key: v.stop, state: v.verdict, word: v.verdict, title: v.title,
               incomplete: v.incomplete, subject: v.stopLabel, subjectCard: v.contextCard,
               marginText: v.marginText, marginTitle: v.label,
               limitText: v.limitText, limitCard: v.limitCard,
               scopeChip: v.scopeChip, scopeTitle: v.scopeTitle };
    }), ctx);
  }

  // The one verdict strip every study page draws in its right-hand pane: a
  // chip, what it is the verdict on, the margin, the limit and the budget
  // scope -- a kinematic study's per stop, a chain study's per check
  // (VA.chainVerdictItems). The class names are the kinematic page's, where
  // it was first drawn.
  VA.verdictStrip = function (items, ctx) {
    var strip = VA.el("div", "kmhead__verdicts");
    items.forEach(function (v) {
      var item = VA.el("div", "kmverdict");
      if (v.key) item.setAttribute("data-stop", v.key);
      var chip = VA.chip("tvverdict tvverdict--" + (v.state || "unknown") +
        (v.incomplete ? " tvverdict--qualified" : ""), v.word, v.title);
      item.appendChild(chip);
      item.appendChild(citationTrigger(VA.el("span", "kmverdict__stop", v.subject || ""),
        v.subjectCard || null, ctx));
      var margin = VA.el("span", "kmverdict__margin num", v.marginText || "");
      if (v.marginTitle) margin.setAttribute("title", v.marginTitle);
      item.appendChild(margin);
      // Always five cells, empty where there is nothing to say: the strip is
      // one grid (topology.css), and a short row would shift every row below.
      item.appendChild(citationTrigger(
        VA.el("span", "muted kmverdict__limit", v.limitText || ""),
        v.limitText ? v.limitCard || null : null, ctx));
      item.appendChild(v.scopeChip ? VA.chip("chip--budget", v.scopeChip, v.scopeTitle)
        : VA.el("span"));
      strip.appendChild(item);
    });
    return strip;
  };

  // A chain study's verdicts as the strip's items: one per authored check
  // (VA.studyMarginRows, the grid foot's own rows), or the one rollup badge
  // VA.studyVerdict gives a study with no check or one that does not sum.
  VA.chainVerdictItems = function (study) {
    if (!study) return [];
    var rows = study.status === "ok" ? VA.studyMarginRows(study) : [];
    if (!rows.length) {
      var rollup = VA.studyVerdict(study);
      return rollup ? [{ key: study.id, state: rollup.state, word: rollup.word,
                         title: rollup.title, incomplete: rollup.incomplete }] : [];
    }
    return rows.map(function (row) {
      return { key: row.checkId, state: row.verdict, word: row.verdict, title: row.title,
               incomplete: row.incomplete, subject: row.label,
               marginText: "margin " + row.marginValue, limitText: row.criterionText,
               scopeChip: row.scopeChip, scopeTitle: row.scopeTitle };
    });
  };

  function chartFigure(chart) {
    var figure = VA.el("figure", "kmchart");
    var svg = VA.svg("svg", "kmchart__svg", {
      viewBox: "0 0 " + chart.width + " " + chart.height,
      width: chart.width, height: chart.height, role: "img",
    });
    svg.setAttribute("aria-label", chart.yLabel + " against " + chart.xLabel);
    var p = chart.plot;
    chart.yTicks.forEach(function (t) {
      svg.appendChild(VA.svg("line", "kmchart__grid",
        { x1: p.left, x2: p.left + p.width, y1: t.y, y2: t.y }));
      var label = VA.svg("text", "kmchart__tick",
        { x: p.left - 6, y: t.y + 4, "text-anchor": "end" });
      label.textContent = t.text;
      svg.appendChild(label);
    });
    chart.xTicks.forEach(function (t) {
      var label = VA.svg("text", "kmchart__tick",
        { x: t.x, y: p.top + p.height + 16, "text-anchor": "middle" });
      label.textContent = t.text;
      svg.appendChild(label);
    });
    var xLabel = VA.svg("text", "kmchart__axis",
      { x: p.left + p.width / 2, y: chart.height - 6, "text-anchor": "middle" });
    xLabel.textContent = chart.xLabel;
    svg.appendChild(xLabel);
    var yLabel = VA.svg("text", "kmchart__axis", {
      transform: "translate(14 " + (p.top + p.height / 2) + ") rotate(-90)",
      "text-anchor": "middle",
    });
    yLabel.textContent = chart.yLabel;
    svg.appendChild(yLabel);

    // A stop's travel band on x, under everything: the stop could sit
    // anywhere across it (VA.kinematicTravelBands).
    chart.bands.forEach(function (band) {
      [["worst", band.worstFrom, band.worstTo], ["rss", band.rssFrom, band.rssTo]]
        .forEach(function (b) {
          var strip = VA.svg("rect", "kmchart__band kmchart__band--" + b[0],
            { x: b[1], y: p.top, width: Math.max(0.5, b[2] - b[1]), height: p.height });
          strip.setAttribute("data-stop", band.stop);
          svg.appendChild(strip);
        });
    });
    svg.appendChild(VA.svg("polygon", "kmchart__worst", { points: chart.worst }));
    svg.appendChild(VA.svg("polygon", "kmchart__rss", { points: chart.rss }));
    // ...and the envelope carried across it on the stop's own slope.
    chart.bands.forEach(function (band) {
      [["worst", band.worst], ["rss", band.rss]].forEach(function (r) {
        var region = VA.svg("polygon", "kmchart__region kmchart__region--" + r[0],
          { points: r[1] });
        region.setAttribute("data-stop", band.stop);
        svg.appendChild(region);
      });
      if (band.label) {
        var text = VA.svg("text", "kmchart__bandlabel", {
          x: band.label.x, y: band.label.y,
          "text-anchor": band.label.anchorEnd ? "end" : "start",
        });
        text.textContent = band.label.text;
        svg.appendChild(text);
      }
    });
    svg.appendChild(VA.svg("line", "kmchart__zero",
      { x1: p.left, x2: p.left + p.width, y1: chart.zeroY, y2: chart.zeroY }));
    chart.limits.forEach(function (limit) {
      [limit.upper, limit.lower].forEach(function (y) {
        svg.appendChild(VA.svg("line", "kmchart__limit",
          { x1: p.left, x2: p.left + p.width, y1: y, y2: y }));
      });
      // Under the lower line, at the left end (VA.kinematicChart says why).
      var text = VA.svg("text", "kmchart__limitlabel",
        { x: limit.labelX, y: limit.labelY, "text-anchor": "start" });
      text.textContent = limit.text;
      svg.appendChild(text);
    });
    chart.stops.forEach(function (stop) {
      svg.appendChild(VA.svg("line", "kmchart__stop",
        { x1: stop.x, x2: stop.x, y1: p.top, y2: p.top + p.height }));
      var text = VA.svg("text", "kmchart__stoplabel", {
        x: stop.x + (stop.anchorEnd ? -5 : 5), y: p.top + 12,
        "text-anchor": stop.anchorEnd ? "end" : "start",
      });
      text.textContent = stop.label;
      svg.appendChild(text);
    });
    svg.appendChild(VA.svg("rect", "kmchart__frame",
      { x: p.left, y: p.top, width: p.width, height: p.height }));

    // The hover layer: a cursor line and two dots, moved to whichever point's
    // strip the pointer is in, and the tip beside it. Hidden until then.
    var cursor = VA.svg("line", "kmchart__cursor",
      { x1: 0, x2: 0, y1: p.top, y2: p.top + p.height, visibility: "hidden" });
    var dotTop = VA.svg("circle", "kmchart__dot", { cx: 0, cy: 0, r: 3, visibility: "hidden" });
    var dotBottom = VA.svg("circle", "kmchart__dot", { cx: 0, cy: 0, r: 3, visibility: "hidden" });
    svg.appendChild(cursor);
    svg.appendChild(dotTop);
    svg.appendChild(dotBottom);

    var tip = VA.el("div", "kmchart__tip");
    tip.style.display = "none";
    var hide = function () {
      tip.style.display = "none";
      [cursor, dotTop, dotBottom].forEach(function (n) { n.setAttribute("visibility", "hidden"); });
    };
    chart.points.forEach(function (point) {
      var hit = VA.svg("rect", "kmchart__hit", {
        x: point.hitFrom, y: p.top, width: Math.max(0.5, point.hitTo - point.hitFrom),
        height: p.height,
      });
      hit.setAttribute("data-index", String(point.index));
      hit.onmouseenter = function () {
        VA.clear(tip);
        point.tip.forEach(function (line) {
          var row = VA.el("div", "kmchart__tiprow");
          row.appendChild(VA.el("span", "kmchart__tiplabel", line.label));
          row.appendChild(VA.el("span", "kmchart__tipvalue num", line.value));
          tip.appendChild(row);
        });
        tip.style.display = "";
        // A share of the figure's width, so the tip follows the point at any
        // rendered size; it flips to the point's left past the middle.
        var share = point.x / chart.width * 100;
        if (share > 50) {
          tip.style.left = "";
          tip.style.right = (100 - share) + "%";
        } else {
          tip.style.right = "";
          tip.style.left = share + "%";
        }
        cursor.setAttribute("x1", point.x);
        cursor.setAttribute("x2", point.x);
        dotTop.setAttribute("cx", point.x);
        dotTop.setAttribute("cy", point.worstTop);
        dotBottom.setAttribute("cx", point.x);
        dotBottom.setAttribute("cy", point.worstBottom);
        [cursor, dotTop, dotBottom].forEach(function (n) { n.setAttribute("visibility", "visible"); });
      };
      svg.appendChild(hit);
    });
    svg.onmouseleave = hide;
    figure.appendChild(svg);
    figure.appendChild(tip);
    return figure;
  }

  // The one table: a header row of stop groups (each stop's label, and its
  // summary line under it), a header row of columns, then a row per
  // contributor. Every stop group is the same three columns.
  var STOP_COLUMNS = 3;

  function contributorTable(study, topoProj, decimals, ctx) {
    var model = VA.kinematicTable(study, topoProj, decimals);
    var wrap = VA.el("div", "kmcontrib");
    var table = VA.el("table", "kmtable");
    var groups = VA.el("tr", "kmtable__groups");
    // The group row's tail cell spans the three columns after the stops.
    groups.appendChild(VA.el("th", "kmtable__lead"));
    model.stops.forEach(function (stop) {
      var th = VA.el("th", "kmtable__stop");
      th.setAttribute("colspan", String(STOP_COLUMNS));
      th.setAttribute("data-stop", stop.id);
      th.appendChild(VA.el("div", "kmtable__stoplabel", stop.label));
      th.appendChild(VA.el("div", "muted kmtable__stopsum", stop.summary));
      groups.appendChild(th);
    });
    var tail = VA.el("th", "kmtable__tail");
    tail.setAttribute("colspan", "3");
    groups.appendChild(tail);
    var head = VA.el("tr", "kmtable__cols");
    head.appendChild(VA.el("th", "kmtable__lead", "Contributor"));
    model.stops.forEach(function (stop) {
      [["Sign", "num kmtable__first"],
       [model.coefficientUnit ? "Coefficient, " + model.coefficientUnit : "Coefficient", "num"],
       [study.units ? "Magnitude, " + study.units : "Magnitude", "num"]]
        .forEach(function (col) {
          var th = VA.el("th", col[1], col[0]);
          th.setAttribute("data-stop", stop.id);
          head.appendChild(th);
        });
    });
    head.appendChild(VA.el("th", "num kmtable__first",
      model.bandUnits ? "Band, " + model.bandUnits : "Band"));
    head.appendChild(VA.el("th", null, "Confidence"));
    head.appendChild(VA.el("th", null, ""));
    var thead = VA.el("thead");
    thead.appendChild(groups);
    thead.appendChild(head);
    table.appendChild(thead);
    var body = VA.el("tbody");
    // A group ranks among the rows by its reach, as a row does by its own
    // (a row with no magnitude -- a gap -- last).
    var groups = (model.groups || []).slice().sort(function (x, y) {
      return (y.reach === null ? -Infinity : y.reach) - (x.reach === null ? -Infinity : x.reach);
    });
    var emitGroup = function (group) {
      groupRows(study, group, model, topoProj, decimals, ctx)
        .forEach(function (tr) { body.appendChild(tr); });
    };
    model.rows.forEach(function (row) {
      while (groups.length && (row.reach === null || groups[0].reach > row.reach)) {
        emitGroup(groups.shift());
      }
      body.appendChild(contributorRow(study, row, model, topoProj, decimals, ctx));
    });
    groups.forEach(emitGroup);
    table.appendChild(body);
    wrap.appendChild(table);
    return wrap;
  }

  function isSelectedEdge(ctx, edgeId) {
    return !!(ctx.selection && ctx.selection.kind === "edge" && ctx.selection.id === edgeId);
  }

  // A group's rows: its own, then one per term, collapsed until the reader
  // opens it. A term is the same row a direct contributor is (its link, its
  // curve, its 3D control), so it carries `kmchild` and not `kmrow`: the page
  // still says each DIRECT contributor once.
  function groupRows(study, group, model, topoProj, decimals, ctx) {
    var tr = VA.el("tr", "kmgroup");
    tr.setAttribute("data-study", group.id);
    var nameCell = VA.el("td", "kmrow__name");
    var toggle = VA.el("button", "ghost kmgroup__toggle", "▸");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("title", group.title);
    nameCell.appendChild(toggle);
    var label = VA.el("span", "kmgroup__name", group.name);
    label.setAttribute("title", group.title);
    nameCell.appendChild(label);
    nameCell.appendChild(VA.el("span", "kmrow__zone", group.zone));
    tr.appendChild(nameCell);
    stopCells(tr, study, group, model, decimals, ctx);
    var band = VA.el("td", "num kmtable__first");
    if (group.band) {
      band.textContent = group.band;
      band.setAttribute("title", group.bandTitle);
    }
    tr.appendChild(band);
    tr.appendChild(VA.el("td", "kmrow__conf"));
    tr.appendChild(VA.el("td", "kmrow__3d"));

    // Open or closed is the page's, not this row's: the DAG's sub-stack field
    // opens and closes with it (VA.kinematicSubStacks). A ctx without the
    // shared state (a bare test render) keeps the row's own.
    var shared = !!ctx.onToggleSubStack;
    var startOpen = !!(ctx.openSubStacks && ctx.openSubStacks[group.id]);
    var kids = group.children.map(function (child) {
      var kid = contributorRow(study, child, model, topoProj, decimals, ctx);
      kid.hidden = !startOpen;
      return kid;
    });
    toggle.setAttribute("aria-expanded", startOpen ? "true" : "false");
    toggle.textContent = startOpen ? "▾" : "▸";
    var toggleKids = function () {
      if (shared) {
        ctx.onToggleSubStack(group.id);
        return;
      }
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "▾" : "▸";
      kids.forEach(function (kid) { kid.hidden = !open; });
    };
    toggle.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      toggleKids();
    };
    tr.onclick = toggleKids;
    return [tr].concat(kids);
  }

  // The three cells a stop contributes to a row, for every stop in the table.
  function stopCells(tr, study, row, model, decimals, ctx) {
    row.cells.forEach(function (cell, s) {
      var stop = model.stops[s];
      if (!cell) {
        for (var k = 0; k < STOP_COLUMNS; k++) tr.appendChild(VA.el("td", k ? "num" : "num kmtable__first"));
        return;
      }
      var muted = cell.muted ? " kmcell--muted" : "";
      var sign = VA.el("td", "num kmtable__first" + muted, cell.sign);
      sign.setAttribute("data-stop", stop.id);
      tr.appendChild(sign);
      tr.appendChild(coefficientCell(study, row, cell, stop, decimals, muted, ctx));
      var magnitude = VA.el("td", "num" + muted, cell.magnitude === null ? "" : cell.magnitude);
      magnitude.setAttribute("data-stop", stop.id);
      if (cell.flagTitle) magnitude.setAttribute("title", cell.flagTitle);
      tr.appendChild(magnitude);
    });
  }

  function contributorRow(study, row, model, topoProj, decimals, ctx) {
    var tr = VA.el("tr", (row.child ? "kmchild" : "kmrow") + " kmrow--" + row.kind +
      (isSelectedEdge(ctx, row.edge) ? " kmrow--selected" : ""));
    tr.setAttribute("data-edge", row.edge);

    var nameCell = VA.el("td", "kmrow__name");
    var link = VA.el("a", "kmrow__edge", row.name);
    // A new tab opens the edge on its rail; a click selects it HERE.
    link.setAttribute("href", VA.viewerLink({ topology: row.topology, edge: row.edge }));
    link.setAttribute("title", row.title);
    link.onclick = function (event) {
      if (!ctx.onEdge) return;
      if (event && event.preventDefault) event.preventDefault();
      ctx.onEdge(row.topology, row.edge);
    };
    nameCell.appendChild(link);
    // The zone's shape, a muted word after the name (its meaning on hover):
    // a column of its own cost the table the width it needs beside the
    // preview pane at 1600 wide.
    var zone = VA.el("span", "kmrow__zone", row.zone);
    if (row.zoneTitle) zone.setAttribute("title", row.zoneTitle);
    nameCell.appendChild(zone);
    tr.appendChild(nameCell);

    stopCells(tr, study, row, model, decimals, ctx);

    var band = VA.el("td", "num kmtable__first");
    if (row.band) {
      band.textContent = row.band;
      if (row.bandTitle) band.setAttribute("title", row.bandTitle);
    } else if (row.flag) {
      var chip = VA.chip("chip--gap", row.flag, null);
      band.appendChild(gapTrigger(chip, study, row, topoProj, ctx));
    }
    tr.appendChild(band);

    var confidence = VA.el("td", "kmrow__conf");
    if (row.confidence) {
      confidence.appendChild(VA.chip(VA.confidenceClass(row.confidence),
        VA.CONFIDENCE_LABEL[row.confidence] || row.confidence));
    }
    tr.appendChild(confidence);
    tr.appendChild(threeDCell(row, topoProj, ctx));
    return tr;
  }

  // A gap chip opens the card that says what would resolve it
  // (VA.kinematicGapCard). With no card host, its first line is the tooltip.
  function gapTrigger(chip, study, row, topoProj, ctx) {
    var card = VA.kinematicGapCard(study, row, topoProj);
    if (!ctx.onCardShow) {
      chip.setAttribute("title", row.flagTitle || "");
      return chip;
    }
    chip.className += " cardtrig";
    chip.setAttribute("tabindex", "0");
    var show = function () { ctx.onCardShow(card, chip); };
    chip.onmouseenter = show;
    chip.onfocus = show;
    chip.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      show();
    };
    return chip;
  }

  // A coefficient, and on hover or focus its curve across the whole sweep
  // (VA.kinematicCurve), as a hover card of kind `curve` in the page's one
  // popover (views/cards.js) -- a fixed-position card, so the table's own
  // horizontal scroll box cannot clip it. Computed the first time it is asked
  // for, so a table nobody hovers draws no charts. With no card host (a page
  // embedding this view without one) the chart is drawn inside the cell.
  function coefficientCell(study, row, cell, stop, decimals, muted, ctx) {
    var td = VA.el("td", "num kmcell--coef" + muted);
    td.setAttribute("data-stop", stop.id);
    td.appendChild(VA.el("span", "kmcell__value", cell.coefficient));
    if (cell.flagTitle) td.setAttribute("title", cell.flagTitle);
    if (!row.curve) return td;
    td.setAttribute("tabindex", "0");
    var card = null;
    var show = function () {
      if (!card) {
        var curve = VA.kinematicCurve(study, row, decimals, stop.id);
        if (!curve) return;
        card = { kind: "curve", title: row.name, curve: curve };
        if (!ctx.onCardShow) td.appendChild(VA.kinematicCurveFigure(curve, row.name));
      }
      if (ctx.onCardShow) ctx.onCardShow(card, td);
    };
    td.onmouseenter = show;
    td.onfocus = show;
    return td;
  }

  // The curve as a figure: the frame, zero, the stops (this cell's marked),
  // the line, and its four end values. Read by the hover card too.
  VA.kinematicCurveFigure = function (curve, name) {
    var box = VA.el("div", "kmcurve");
    box.appendChild(VA.el("div", "kmcurve__title", name));
    var svg = VA.svg("svg", "kmcurve__svg", {
      viewBox: "0 0 " + curve.width + " " + curve.height,
      width: curve.width, height: curve.height, role: "img",
    });
    svg.setAttribute("aria-label", "coefficient of " + name + " against " + curve.xLabel);
    var p = curve.plot;
    svg.appendChild(VA.svg("rect", "kmcurve__frame",
      { x: p.left, y: p.top, width: p.width, height: p.height }));
    svg.appendChild(VA.svg("line", "kmcurve__zero",
      { x1: p.left, x2: p.left + p.width, y1: curve.zeroY, y2: curve.zeroY }));
    curve.stops.forEach(function (stop) {
      svg.appendChild(VA.svg("line", "kmcurve__stop" + (stop.on ? " kmcurve__stop--on" : ""),
        { x1: stop.x, x2: stop.x, y1: p.top, y2: p.top + p.height }));
    });
    svg.appendChild(VA.svg("path", "kmcurve__line", { d: curve.path }));
    var text = function (cls, x, y, anchor, words) {
      var t = VA.svg("text", cls, { x: x, y: y, "text-anchor": anchor });
      t.textContent = words;
      svg.appendChild(t);
    };
    text("kmcurve__tick", p.left - 4, p.top + 8, "end", curve.yTop);
    text("kmcurve__tick", p.left - 4, p.top + p.height, "end", curve.yBottom);
    text("kmcurve__tick", p.left, curve.height - 4, "start", curve.xLeft);
    text("kmcurve__tick", p.left + p.width, curve.height - 4, "end", curve.xRight);
    box.appendChild(svg);
    box.appendChild(VA.el("div", "muted kmcurve__axis", curve.xLabel));
    return box;
  };

  // The row's way into the 3D scene: only where its part HAS a mesh to show
  // (the rule the rail's "attach to 3D" already follows) -- a launch onto an
  // empty scene is a dead end. The flyout where the mount probe passed, a
  // new-tab link where it did not.
  function threeDCell(row, topoProj, ctx) {
    var cell = VA.el("td", "kmrow__3d");
    if (!row.part || !VA.partHasMesh(topoProj, row.part)) return cell;
    var params = { topologyId: row.topology, edgeId: row.edge, part: row.part };
    if (ctx.annotateMount && ctx.onAttach3d) {
      var button = VA.el("button", "ghost kmrow__3dbtn", "3D");
      button.setAttribute("title", "show this contributor's part in the 3D panel");
      button.onclick = function () { ctx.onAttach3d(params); };
      cell.appendChild(button);
    } else {
      var a = VA.el("a", "kmrow__3dlink", "3D ↗");
      a.setAttribute("href", VA.annotateLink(params));
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.setAttribute("title", "open this contributor's part in the 3D annotator");
      cell.appendChild(a);
    }
    return cell;
  }

  // Everything about WHERE the numbers came from, behind one fold: the sweep,
  // its own agreement figure, how features were identified, the study's
  // authored provenance, and -- the honest half -- what the numbers leave out.
  function provenance(study) {
    var fold = VA.disclosure("Where these numbers come from", "kmprov");
    var sweep = study.sweep || {};
    var source = VA.KINEMATIC_FEATURE_SOURCES[sweep.features_in_artifact ? "artifact" : "authored"];
    fold.body.appendChild(VA.kvList({
      sweep_run: sweep.run_id || null,
      // Twelve characters, the short form git itself prints: enough to find
      // the commit, and not a forty-digit checksum on a reader's page.
      solver_commit: sweep.pipeline_commit
        ? String(sweep.pipeline_commit).slice(0, 12) : null,
      finite_difference_disagreement:
        typeof sweep.max_finite_difference_disagreement === "number"
          ? VA.fmt(sweep.max_finite_difference_disagreement) : null,
      feature_identities: source.words,
    }));
    if (study.provenance) fold.body.appendChild(VA.kvList(study.provenance));
    var excluded = [];
    (study.checks || []).forEach(function (check) {
      (check.excluded_terms || []).forEach(function (term) {
        if (excluded.indexOf(term) === -1) excluded.push(term);
      });
    });
    if (excluded.length) {
      fold.body.appendChild(VA.el("h4", "kmprov__heading", "Not in these numbers"));
      var list = VA.el("ul", "kmprov__excluded");
      excluded.forEach(function (term) { list.appendChild(VA.el("li", null, term)); });
      fold.body.appendChild(list);
    }
    (study.notes || []).forEach(function (note) {
      fold.body.appendChild(VA.el("p", "kmprov__note", note));
    });
    return fold.box;
  }
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
