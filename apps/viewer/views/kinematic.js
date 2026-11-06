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
// (`display_decimals`), placing it on the chart, and -- at a pose between two
// sweep points (VA.kinematicPose, 2026-11-05) -- reading it there: one
// projection number at the two points either side, weighted by how far
// between them the pose is. A reading of one number, never a fold of two.
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

  // Which side of its limit a reach check holds a stop on, in reader words.
  VA.KINEMATIC_CHECK_BOUNDS = VOCAB.table("KINEMATIC_CHECK_BOUNDS", {
    at_least: { words: "at least" },
    at_most: { words: "at most" },
  });

  // The two sub-stacks a stop's band is made of, in reader words.
  VA.KINEMATIC_SUB_STACK_KINDS = VOCAB.table("KINEMATIC_SUB_STACK_KINDS", {
    linkage: { words: "linkage at this pose" },
    stop_position: { words: "stop position" },
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
  // A limit in reader words: a reach bound says which side of it the stop
  // must reach ("at least +70 deg", the number as its requirement writes it),
  // a spread limit its +/-.
  function limitWords(check, decimals) {
    var v = check.limit.value;
    if (check.bound) {
      var bound = VA.KINEMATIC_CHECK_BOUNDS[check.bound];
      return (bound ? bound.words : VA.unlabelledKinematicText("bound", check.bound)) +
        " " + withUnit((v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v), check.limit.units);
    }
    return "limit ±" + withUnit(VA.kinematicNumber(v, decimals), check.limit.units);
  }

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
          VA.kinematicSigned(check.margin, decimals), check.units) +
          (typeof check.rss_margin === "number"
            ? " · RSS " + VA.kinematicSigned(check.rss_margin, decimals) : ""),
        limitText: check.limit ? limitWords(check, decimals) : null,
        limitCard: check.limit ? VA.citationCard(check.limit.source_ref || null) : null,
        contextCard: VA.citationCard(check.context_ref ||
          (stop && stop.context_ref) || null),
        label: check.label,
      };
    });
  };

  // --- the pose (the_grid_and_the_dag_move_with_the_mechanism) -----------------
  //
  // Jeff, 2026-11-05: "drag the slider or enter a discrete blade angle and then
  // see the tolerance stack at that pose". A pose is a place on the sweep, held
  // as a FRACTIONAL POINT INDEX: 12.25 is a quarter of the way from point 12
  // to point 13. That is the 3D pane's own unit (its scrubber's `sweep.index`,
  // apps/annotate/sweep.js), and within one step of the sweep the driver is
  // linear in it, so a pose and the driver value the pane is told agree.
  //
  // How a number is read at a pose: the projection carries every contributor
  // at every point (`contributors[].by_point[]`, `study_refs[].children[]
  // .by_point[]`) and the linkage fold at every point (`envelope[]`). At a
  // pose, each of those numbers is read from the two points either side,
  // linearly in the index -- the J of the handoff, "interpolated between sweep
  // points as the sweep artifact allows". Nothing is read past the sweep's
  // ends, and a pose exactly on a stop's point is that stop: its stack is the
  // stop's own fold (`stops[]`), not a reading of the points.
  VA.KINEMATIC_POSE = Object.freeze({
    // How close to a stop's point a pose must be to BE the stop.
    stopEps: 1e-6,
    // Play's pace, in sweep points per second: the 3D pane's own
    // (AA.SWEEP_POINTS_PER_SECOND, paired by tests/test_kinematic_pose_pace.py),
    // so the two never drift when the page drives the pane.
    pointsPerSecond: 24,
    // The precision the blade-angle field prints and steps at.
    angleDecimals: 1,
    // The DAG's pose film (VA.poseFilm): the pane rendered at this many evenly
    // spaced poses (every tenth point of the live 80-point sweep), every frame
    // between two of them eased from one to the next.
    filmKeys: 9,
  });

  // The pose in the URL: `?kinematic=<study>&pose=<measure>` -- the blade
  // angle a reader would type, at the field's precision, so a lesson or a
  // filmstrip can cite the exact pose it shows. View state, like `?pane=1`,
  // and not one of the selection params a sibling repo links with
  // (VA.DEEP_LINK_PARAMS, README "Deep links in").
  VA.POSE_PARAM = "pose";

  // location.search -> the pose's measure (a number), or null. Pure string
  // work, the VA.parseDeepLink posture: first occurrence wins.
  VA.parsePoseParam = function (search) {
    var out = null;
    String(search || "").replace(/^\?/, "").split("&").some(function (pair) {
      var cut = pair.indexOf("=");
      if (cut === -1 || pair.slice(0, cut) !== VA.POSE_PARAM) return false;
      var value = Number(decodeURIComponent(pair.slice(cut + 1)));
      out = pair.slice(cut + 1) !== "" && isFinite(value) ? value : null;
      return true;
    });
    return out;
  };

  // The search a posed kinematic page writes: every selection param and any
  // old pose dropped, `kinematic` and `pose` set -- or, with no study, just
  // dropped (the page has left it). Other params (`mock`, `pane`) are kept,
  // in their order.
  VA.poseSearch = function (search, studyId, measureText) {
    var kept = [];
    var wrote = false;
    String(search || "").replace(/^\?/, "").split("&").forEach(function (pair) {
      if (!pair) return;
      var cut = pair.indexOf("=");
      var key = cut === -1 ? pair : pair.slice(0, cut);
      if (key === VA.POSE_PARAM || VA.DEEP_LINK_PARAMS.indexOf(key) !== -1) {
        wrote = true;
        return;
      }
      kept.push(pair);
    });
    if (studyId && measureText !== null && measureText !== undefined) {
      kept.push("kinematic=" + encodeURIComponent(studyId));
      kept.push(VA.POSE_PARAM + "=" + encodeURIComponent(measureText));
    } else if (!wrote) {
      return String(search || "");
    }
    return kept.length ? "?" + kept.join("&") : "";
  };

  // How many points the study's sweep has (its envelope's length).
  VA.kinematicPoseCount = function (study) {
    return ((study && study.envelope) || []).length;
  };

  // A pose clamped onto the sweep, and where it falls: the two points either
  // side (`i0`, `i1`), how far between them (`u`), the driver and the measure
  // there, and the stop it is on, if any.
  VA.kinematicPose = function (study, index) {
    var env = (study && study.envelope) || [];
    if (!env.length) return null;
    var last = env.length - 1;
    var f = Math.min(Math.max(Number(index) || 0, 0), last);
    var i0 = Math.min(Math.floor(f), last);
    var i1 = Math.min(i0 + 1, last);
    var u = f - i0;
    var at = function (key) {
      var a = env[i0][key], b = env[i1][key];
      return typeof a === "number" && typeof b === "number" ? a + (b - a) * u : null;
    };
    var stop = null;
    (study.stops || []).forEach(function (s) {
      if (!stop && typeof s.index === "number" &&
          Math.abs(s.index - f) <= VA.KINEMATIC_POSE.stopEps) stop = s.id;
    });
    return { index: f, i0: i0, i1: i1, u: u, driver: at("driver_value"),
             measure: at("nominal_measure"), stop: stop };
  };

  // A pose argument as the stack builders take it: a point index, or a pose
  // VA.kinematicPose already made -- one whose `stop` the page has cleared
  // because the pane on screen is drawn at another stop (topology_app.js's
  // livePose: the two stops' stacks are different rows, and a frame of play
  // never changes rows). Anything else is no pose.
  VA.kinematicPoseArg = function (study, pose) {
    if (typeof pose === "number") return VA.kinematicPose(study, pose);
    return pose && typeof pose.index === "number" && typeof pose.i0 === "number" ? pose : null;
  };

  // The pose at a value of the sweep's measure (the blade angle a reader
  // types) or of its driver: the first step of the sweep that brackets it,
  // whichever way the sweep runs; past either end, that end.
  function poseOf(study, key, value) {
    var env = (study && study.envelope) || [];
    var x = Number(value);
    if (!env.length || !isFinite(x)) return null;
    for (var i = 0; i < env.length - 1; i++) {
      var a = env[i][key], b = env[i + 1][key];
      if ((x - a) * (x - b) <= 0) {
        return Math.abs(b - a) < 1e-12 ? i : i + (x - a) / (b - a);
      }
    }
    var first = env[0][key], last = env[env.length - 1][key];
    return Math.abs(x - first) <= Math.abs(x - last) ? 0 : env.length - 1;
  }

  VA.kinematicPoseOfMeasure = function (study, value) {
    return poseOf(study, "nominal_measure", value);
  };

  VA.kinematicPoseOfDriver = function (study, value) {
    return poseOf(study, "driver_value", value);
  };

  // A stop's own pose: its point.
  VA.kinematicStopPose = function (study, stopId) {
    var hit = null;
    ((study && study.stops) || []).forEach(function (s) {
      if (s.id === stopId && typeof s.index === "number") hit = s.index;
    });
    return hit;
  };

  // One per-point row read at the pose: its signed coefficient and its
  // magnitude, each from the two points either side. The sign is the signed
  // coefficient's; a magnitude either point lacks (a gap row's) stays absent.
  function rowAtPose(points, pose) {
    var byIndex = {};
    (points || []).forEach(function (p) { byIndex[p.index] = p; });
    var a = byIndex[pose.i0], b = byIndex[pose.i1];
    if (!a || !b) return null;
    var signed = function (p) { return p.sign < 0 ? -p.coefficient : p.coefficient; };
    var s = signed(a) + (signed(b) - signed(a)) * pose.u;
    var m = typeof a.magnitude === "number" && typeof b.magnitude === "number"
      ? a.magnitude + (b.magnitude - a.magnitude) * pose.u : null;
    return { sign: s < 0 ? -1 : 1, coefficient: Math.abs(s), magnitude: m };
  }

  // {edge: row read at the pose} for every linkage contributor.
  VA.kinematicPoseRows = function (study, pose) {
    var out = {};
    if (!study || !pose) return out;
    (study.contributors || []).forEach(function (c) {
      var row = rowAtPose(c.by_point, pose);
      if (row) out[c.edge] = row;
    });
    return out;
  };

  // The linkage fold read at the pose: the envelope's own numbers there.
  VA.kinematicPoseFold = function (study, pose) {
    var env = (study && study.envelope) || [];
    if (!pose || !env.length) return null;
    var a = env[pose.i0], b = env[pose.i1];
    var out = {};
    ["nominal_measure", "worst_case_min", "worst_case_max", "worst_case_half",
     "rss_half"].forEach(function (key) {
      out[key] = typeof a[key] === "number" && typeof b[key] === "number"
        ? a[key] + (b[key] - a[key]) * pose.u : null;
    });
    return out;
  };

  // What the contribution length mode draws (VA.EDGE_LENGTH_MODES): each
  // linkage term's contribution at the pose -- the part of the stack that
  // moves with the linkage -- against ONE yardstick for the whole sweep, the
  // largest contribution any of them reaches at any point, so a bar is the
  // same length for the same contribution at every pose and the DAG's
  // breathing is the contributions' own. The stop position's terms are the
  // stop's, the same at every pose, and an order of magnitude larger on the
  // live study (the cover's flange at ±0.864 deg against the largest linkage
  // term's ±0.156): drawn on the same yardstick they would floor every
  // linkage bar, so this mode leaves them unscaled -- floored and marked, as
  // every bar with no length of its own is. Their contributions are in the
  // grid and on the contribution colouring. { values: {edge: magnitude},
  // max } or null.
  VA.kinematicPoseLengths = function (study, pose) {
    var at = VA.kinematicPoseArg(study, pose);
    if (!at) return null;
    var rows = VA.kinematicPoseRows(study, at);
    var values = {};
    Object.keys(rows).forEach(function (edge) {
      if (typeof rows[edge].magnitude === "number") values[edge] = rows[edge].magnitude;
    });
    var max = 0;
    (study.contributors || []).forEach(function (c) {
      (c.by_point || []).forEach(function (p) {
        if (typeof p.magnitude === "number" && p.magnitude > max) max = p.magnitude;
      });
    });
    return { values: values, max: max };
  };

  // A pose in reader words: the measure there ("23.0 deg"), at the field's
  // precision.
  VA.kinematicPoseWords = function (study, pose) {
    if (!pose || typeof pose.measure !== "number") return "";
    return withUnit(VA.kinematicNumber(pose.measure, VA.KINEMATIC_POSE.angleDecimals),
                    study.units);
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
    // A declared gap (a chain not authored yet) has a sensitivity and no
    // band: a gap row, ranked last as one is, with nothing under it.
    var gapKind = ref.gap ? VA.KINEMATIC_ROW_KINDS.gap : null;
    var reach = null;
    var cells = (study.stops || []).map(function (stop, s) {
      var g = groupAt(stop);
      if (!g) return null;
      if (!gapKind && (reach === null || g.reach > reach)) reach = g.reach;
      return tableCell({ kind: gapKind ? "gap" : "term", sign: g.sign,
                         coefficient: Math.abs(g.entry), magnitude: gapKind ? null : g.reach },
                       stops[s], perCellUnit, decimals);
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
      study: ref.study,
      name: ref.title,
      flag: gapKind ? gapKind.flag : null,
      flagTitle: gapKind ? ref.gap : null,
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
    var lit = VA.bridgeLitSet(topoProj, VA.litSetOfEdges(topoProj, edges));
    // The order the DAG's band and the grid beside it both read the lit edges
    // in (VA.bandSides): the stack's chain order, so two adjacent rows are two
    // connected edges and no leader crosses another to reach its row.
    lit.order = VA.kinematicStackOrder(study, topoProj, lit);
    return lit;
  };

  // --- the stack: rows in chain order, sub-stacks that fold ---------------------
  //
  // (the_kinematic_grid_is_a_stack_of_sub_stacks, 2026-11-03.) Jeff: a
  // kinematic study "would still resolve down to, and could be displayed as,
  // grid view stacks, where the 'sensitivity' column was derived from the 3d
  // kinematic model", with the parts that are compared to each other "rolled
  // up into sub-stacks, potentially shown as collapsible elements".
  //
  // THE ORDERING RULE, in one place. The stack reads from the measure's end to
  // the stops: the linkage terms first, walked along the lit model from the
  // blade end to the end the stop-position chains start from, then each
  // stop-position sub-study in `study_refs[]` order, each in its own authored
  // chain order. The linkage walk is a depth-first walk over the linkage's
  // edges -- the contributors, the edges they borrow their bands from, and the
  // joints between them -- started at the node it shares with a stop-position
  // chain and READ BACKWARDS, so it ends where the next sub-stack begins. At a
  // branch the shorter side is walked first, so the branch sits where it
  // leaves the walk and the main line continues after it. Every other lit
  // edge (a bridge, a closure) follows in the walk's own order. Pure.
  VA.kinematicStackOrder = function (study, topoProj, lit) {
    if (!study || !topoProj || !lit) return [];
    var index = VA.topologyIndex(topoProj);
    var order = [];
    var placed = {};
    var place = function (id) {
      if (id && lit.edges[id] && !placed[id]) { placed[id] = true; order.push(id); }
    };
    var refs = (study.study_refs || []).filter(function (ref) {
      return !ref.topology || ref.topology === study.topology;
    });
    var chainEdges = {};
    var chainNodes = {};
    refs.forEach(function (ref) {
      (ref.children || []).forEach(function (child) {
        var edge = index.edges[child.edge];
        if (!edge) return;
        chainEdges[child.edge] = true;
        chainNodes[edge.from] = true;
        chainNodes[edge.to] = true;
      });
    });
    // The linkage's edges: every contributor, its band edge, and every lit
    // edge the lit set closed over that is not a stop-position term.
    var linkage = {};
    allStopRows(study).forEach(function (row) {
      linkage[row.edge] = true;
      var source = row.band_source || {};
      if (source.kind === "dimension_ref" && source.edge &&
          (!source.topology || source.topology === study.topology)) linkage[source.edge] = true;
    });
    // A closure between two stop-position interfaces (the derived gap across
    // the travel) belongs to the stops, not the linkage.
    Object.keys(lit.closed || {}).forEach(function (id) {
      var edge = index.edges[id];
      if (chainEdges[id] || (edge && chainNodes[edge.from] && chainNodes[edge.to])) return;
      linkage[id] = true;
    });
    var adj = {};
    (topoProj.edges || []).forEach(function (edge) {
      if (!linkage[edge.id] || chainEdges[edge.id] || !lit.edges[edge.id]) return;
      (adj[edge.from] = adj[edge.from] || []).push({ to: edge.to, edge: edge.id });
      (adj[edge.to] = adj[edge.to] || []).push({ to: edge.from, edge: edge.id });
    });
    var reach = function (from, via, seen) {
      var count = 0;
      var stack = [from];
      var nodes = {};
      nodes[from] = true;
      while (stack.length) {
        var at = stack.pop();
        (adj[at] || []).forEach(function (step) {
          if (step.edge === via || seen[step.edge] || nodes[step.to]) return;
          nodes[step.to] = true;
          count += 1;
          stack.push(step.to);
        });
      }
      return count;
    };
    var walked = [];
    var seen = {};
    var walk = function (at) {
      var steps = (adj[at] || []).filter(function (s) { return !seen[s.edge]; })
        .map(function (s) { return { step: s, size: reach(s.to, s.edge, seen) }; })
        .sort(function (a, b) { return a.size - b.size; });
      steps.forEach(function (entry) {
        if (seen[entry.step.edge]) return;
        seen[entry.step.edge] = true;
        walked.push(entry.step.edge);
        walk(entry.step.to);
      });
    };
    var ends = Object.keys(adj);
    var start = ends.filter(function (n) { return chainNodes[n] && adj[n].length === 1; })[0] ||
      ends.filter(function (n) { return chainNodes[n]; })[0] ||
      ends.filter(function (n) { return adj[n].length === 1; })[0] || ends[0];
    if (start !== undefined) walk(start);
    // A piece of the linkage the walk did not reach, in walk order.
    (topoProj.edges || []).forEach(function (edge) {
      if (adj[edge.from] && linkage[edge.id] && !chainEdges[edge.id] && !seen[edge.id] &&
          lit.edges[edge.id]) {
        seen[edge.id] = true;
        walked.push(edge.id);
      }
    });
    walked.reverse().forEach(place);
    refs.forEach(function (ref) {
      (ref.children || []).forEach(function (child) { place(child.edge); });
    });
    (topoProj.layout && topoProj.layout.rows || []).forEach(function (row) {
      if (row.kind === "edge") place(row.id);
    });
    Object.keys(lit.edges).forEach(place);
    return order;
  };

  // How many children a sub-stack may have and still open by default: more
  // than this folds until the reader opens it.
  VA.STACK_OPEN_MAX = 3;

  // A sub-stack's open state: the reader's own choice for this study where
  // there is one (`choices`, {sub-stack id: true | false}), else open when it
  // is the stack's own level (depth 0: the linkage terms, the stop position)
  // or has few enough children to read at a glance.
  VA.subStackOpen = function (choices, id, childCount, depth) {
    if (choices && Object.prototype.hasOwnProperty.call(choices, id)) return !!choices[id];
    return !depth || childCount <= VA.STACK_OPEN_MAX;
  };

  // The reader's fold choices, remembered per kinematic study, as the group
  // checkboxes are (VA.readGroupKinds). An unreadable store reads as none.
  VA.SUB_STACK_FOLDS_KEY = "tolstack.viewer.subStackFolds";

  VA.readSubStackFolds = function (store, studyId) {
    try {
      var raw = store && store.getItem(VA.SUB_STACK_FOLDS_KEY);
      var all = raw ? JSON.parse(raw) : {};
      var mine = all && typeof all === "object" ? all[studyId] : null;
      var out = {};
      if (mine && typeof mine === "object" && !Array.isArray(mine)) {
        Object.keys(mine).forEach(function (k) {
          if (typeof mine[k] === "boolean") out[k] = mine[k];
        });
      }
      return out;
    } catch (err) {
      return {};
    }
  };

  VA.writeSubStackFolds = function (store, studyId, choices) {
    try {
      if (!store) return;
      var raw = store.getItem(VA.SUB_STACK_FOLDS_KEY);
      var all = raw ? JSON.parse(raw) : {};
      if (!all || typeof all !== "object" || Array.isArray(all)) all = {};
      all[studyId] = choices || {};
      store.setItem(VA.SUB_STACK_FOLDS_KEY, JSON.stringify(all));
    } catch (err) {
      // A browser that refuses to store it still folds for this session.
    }
  };

  // The stack at one stop, as the grid draws it: an entry per row, in the
  // order VA.kinematicStackOrder puts the edges in.
  //
  //   { kind: "sub", id, depth, name, detail, count, open, gap, sensitivity,
  //     contribution, nominal, min, max, parent }
  //   { kind: "term", edge, depth, parent, sensitivity, contribution, curve }
  //
  // The linkage terms are one sub-stack at depth 0 ("linkage terms at this
  // pose"); the stop's position is another, holding one nested sub-stack per
  // sub-study at this stop -- an authored chain with its terms, or a declared
  // gap with none. `terms` indexes the term entries by edge; `result` is the
  // stop's own fold, for the grid's foot. Every number is the projection's,
  // printed at its precision; nothing is added up here.
  //
  // `poseIndex` (VA.kinematicPose; absent = the stop's own point) is the live
  // pose. On a stop's point the stack IS that stop's, whichever stop
  // `stopId` named. Anywhere else the linkage terms, their sub-stack's total
  // and the foot are read at the pose (VA.kinematicPoseRows /
  // VA.kinematicPoseFold) -- the foot is then the linkage alone, which is
  // what the envelope folds -- while the stop position's rows stay at
  // `stopId`'s own point and say so: they are the stop.
  VA.kinematicStack = function (study, topoProj, stopId, decimals, choices, poseIndex) {
    if (!study || !(study.stops || []).length) return null;
    var pose = VA.kinematicPoseArg(study, poseIndex);
    if (pose && pose.stop) stopId = pose.stop;
    var stop = null;
    (study.stops || []).forEach(function (s) { if (s.id === stopId) stop = s; });
    stop = stop || study.stops[0];
    // Off every stop: the numbers the linkage reads at the pose.
    var live = pose && !pose.stop ? pose : null;
    var poseRows = live ? VA.kinematicPoseRows(study, live) : null;
    var poseFold = live ? VA.kinematicPoseFold(study, live) : null;
    var atPose = function (row) {
      var read = poseRows && poseRows[row.edge];
      if (!read) return row;
      return Object.assign({}, row, { sign: read.sign, coefficient: read.coefficient,
        magnitude: typeof row.magnitude === "number" ? read.magnitude : row.magnitude });
    };
    var lit = VA.kinematicLitSet(study, topoProj);
    var order = (lit && lit.order) || [];
    var rank = function (edge) {
      var i = order.indexOf(edge);
      return i === -1 ? order.length : i;
    };
    var unit = VA.kinematicCoefficientUnit(study, { rows: allStopRows(study) });
    var n = function (v) { return VA.kinematicNumber(v, decimals); };
    var curves = {};
    (study.contributors || []).forEach(function (c) { curves[c.edge] = c.by_point || null; });
    var entries = [];
    var terms = {};
    var term = function (row, depth, parent, curve) {
      var entry = {
        kind: "term", edge: row.edge, depth: depth, parent: parent,
        sensitivity: (row.sign < 0 ? "−" : "") + n(row.coefficient),
        contribution: typeof row.magnitude === "number" ? "±" + n(row.magnitude) : "",
        muted: row.kind === "zero_sensitivity",
        // A contributor with no band on file: the gap words, on its chip.
        flag: row.kind === "gap" ? VA.KINEMATIC_ROW_KINDS.gap.flag : null,
        // The term's sourcing is its BAND's (a contributor may borrow its band
        // from another edge), as the projection states it per row.
        confidence: row.confidence || null,
        curve: curve || null,
      };
      terms[row.edge] = entry;
      return entry;
    };
    var sub = function (spec) {
      return {
        kind: "sub", id: spec.id, depth: spec.depth, parent: spec.parent || null,
        name: spec.name, detail: spec.detail || null, count: spec.count,
        open: VA.subStackOpen(choices, spec.id, spec.count, spec.depth), gap: !!spec.gap,
        sensitivity: spec.sensitivity || "", contribution: spec.contribution || "",
        nominal: spec.nominal || "", min: spec.min || "", max: spec.max || "",
      };
    };
    var linkageFold = poseFold || subStack(stop, SUB_LINKAGE);
    var linkageRows = (stop.rows || []).map(atPose).sort(function (a, b) {
      return rank(a.edge) - rank(b.edge);
    });
    var linkageWords = VA.KINEMATIC_SUB_STACK_KINDS[SUB_LINKAGE].words;
    entries.push(sub({
      id: SUB_LINKAGE, depth: 0, count: linkageRows.length,
      name: linkageWords.charAt(0).toUpperCase() + linkageWords.slice(1),
      detail: linkageRows.length + " terms",
      contribution: typeof linkageFold.worst_case_half === "number"
        ? "±" + n(linkageFold.worst_case_half) : "",
    }));
    linkageRows.forEach(function (row) {
      entries.push(term(row, 1, SUB_LINKAGE, curves[row.edge]));
    });
    var positionFold = subStack(stop, SUB_POSITION);
    var groups = (stop.groups || []).filter(function (g) {
      return !g.topology || g.topology === study.topology;
    });
    var positionWords = VA.KINEMATIC_SUB_STACK_KINDS[SUB_POSITION].words;
    var position = positionFold.position || {};
    // A stop with no position stack (a study with no stops' chains) has no
    // header for one.
    if (groups.length) entries.push(sub({
      id: SUB_POSITION, depth: 0, count: groups.length,
      name: positionWords.charAt(0).toUpperCase() + positionWords.slice(1),
      detail: (positionFold.term_count || 0) + " terms" +
        (typeof position.worst_case_half === "number"
          ? " · ±" + VA.fmt(position.worst_case_half) + " mm" : "") +
        (live ? " · at the " + stopWords(study, stop) : ""),
      contribution: typeof positionFold.worst_case_half === "number"
        ? "±" + n(positionFold.worst_case_half) : "",
    }));
    var refOf = {};
    (study.study_refs || []).forEach(function (ref) { refOf[ref.study] = ref; });
    groups.forEach(function (g) {
      var ref = refOf[g.study] || {};
      var total = ref.total || null;
      var units = ref.units || g.units || "";
      var gap = !!(ref.gap || g.gap);
      var kids = (g.children || []).slice().sort(function (a, b) {
        return rank(a.edge) - rank(b.edge);
      });
      var at = "at the " + stopWords(study, stop);
      entries.push(sub({
        id: g.study, depth: 1, parent: SUB_POSITION, count: kids.length, gap: gap,
        name: ref.title || g.title || g.study,
        detail: gap ? "not yet authored"
          : total && typeof total.worst_case_half === "number"
            ? "±" + withUnit(VA.fmt(total.worst_case_half), units) + " → ±" +
              withUnit(n(g.reach), study.units) + " " + at
            : null,
        sensitivity: (g.sign < 0 ? "−" : "") + n(Math.abs(g.entry)),
        contribution: gap ? "" : "±" + n(g.reach),
        nominal: total ? VA.fmt(total.nominal) : "",
        min: total ? VA.fmt(total.worst_case_min) : "",
        max: total ? VA.fmt(total.worst_case_max) : "",
      }));
      kids.forEach(function (child) {
        var spec = null;
        (ref.children || []).forEach(function (c) { if (c.edge === child.edge) spec = c; });
        entries.push(term(child, 2, g.study, spec && spec.by_point));
      });
    });
    var check = null;
    (study.checks || []).forEach(function (c) { if (c.stop === stop.id) check = c; });
    var verdict = null;
    VA.kinematicVerdicts(study, decimals).forEach(function (v) {
      if (v.stop === stop.id) verdict = v;
    });
    var foot = poseFold || stop;
    return {
      // Off a stop, the stop's label is the POSE's: the grid's contribution
      // hover says where the share is taken ("at the 23.0 deg pose").
      stop: { id: stop.id,
              label: live ? VA.kinematicPoseWords(study, live) + " pose" : stop.label },
      stops: (study.stops || []).map(function (s) { return { id: s.id, label: s.label }; }),
      pose: pose ? { index: pose.index, stop: pose.stop,
                     words: VA.kinematicPoseWords(study, pose) } : null,
      coefficientUnit: unit,
      units: study.units || null,
      entries: entries,
      terms: terms,
      result: {
        label: withUnit(measureWords(study), null) + " at " +
          (live ? VA.kinematicPoseWords(study, live) : "the " + stopWords(study, stop)),
        nominal: n(foot.nominal_measure),
        min: n(foot.worst_case_min),
        max: n(foot.worst_case_max),
        contribution: "±" + n(foot.worst_case_half),
        rss: "RSS ±" + n(foot.rss_half),
        verdict: verdict,
        check: check,
      },
    };
  };

  // { sub-stack id: open } for every sub-stack of the stack: the one open
  // state the DAG's dashed fields and the grid's header rows both read.
  VA.stackOpenMap = function (stack) {
    var out = {};
    ((stack && stack.entries) || []).forEach(function (entry) {
      if (entry.kind === "sub") out[entry.id] = entry.open;
    });
    return out;
  };

  // Which entries a folded parent hides: every entry under a closed sub-stack,
  // at any depth. Returns the visible entries, in order.
  VA.visibleStackEntries = function (stack) {
    if (!stack) return [];
    var open = {};
    var out = [];
    stack.entries.forEach(function (entry) {
      var parentOpen = entry.parent === null || entry.parent === undefined ||
        open[entry.parent] === true;
      if (entry.kind === "sub") open[entry.id] = parentOpen && entry.open;
      if (parentOpen) out.push(entry);
    });
    return out;
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
      return (!ref.topology || ref.topology === study.topology) &&
        (ref.children || []).length > 0;
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
    (study.gap_rows || []).forEach(function (g) {
      if (row.study ? g.study === row.study : g.edge === row.edge) gap = g;
    });
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

  // --- each stop is its own stack ----------------------------------------------
  //
  // A stop is a contact pose, and where the mechanism sits when it touches is
  // toleranced (Jeff, 2026-11-03, handoff each_stop_is_its_own_stack). So the
  // builder folds each stop on its own -- the linkage terms at its pose plus
  // the axial stack to its contact face -- and the chart draws it as a point
  // at its nominal x with a vertical error bar: worst case thin, RSS heavier
  // inside it. The envelope along x is the linkage terms only, valid at each
  // nominal x; nothing is drawn past the sweep's last point. A reach bound is
  // a tick at its own stop, at the bound's distance from that stop's nominal.
  // Every number is the projection's; display only -- nothing here is folded.
  var SUB_LINKAGE = VOCAB.list("KINEMATIC_SUB_STACK_KINDS")[0];
  var SUB_POSITION = VOCAB.list("KINEMATIC_SUB_STACK_KINDS")[1];

  function subStack(stop, kind) {
    var hit = null;
    (stop.sub_stacks || []).forEach(function (s) { if (s.kind === kind) hit = s; });
    return hit || {};
  }

  VA.kinematicStopBars = function (study, decimals) {
    if (!study) return [];
    var bounds = {};
    (study.checks || []).forEach(function (check) {
      if (check.bound && check.limit && typeof check.limit.value === "number") {
        bounds[check.stop] = check;
      }
    });
    return (study.stops || []).map(function (stop) {
      var linkage = subStack(stop, SUB_LINKAGE);
      var position = subStack(stop, SUB_POSITION);
      var check = bounds[stop.id];
      return {
        stop: stop.id, label: stop.label, centre: stop.driver_value,
        nominal: stop.nominal_measure,
        worstMin: stop.worst_case_min, worstMax: stop.worst_case_max,
        rssMin: stop.rss_min, rssMax: stop.rss_max,
        worstHalf: stop.worst_case_half, rssHalf: stop.rss_half,
        linkageHalf: linkage.worst_case_half, positionHalf: position.worst_case_half,
        positionTerms: position.term_count || 0,
        bound: check ? { value: check.limit.value, side: check.bound,
                         offset: check.limit.value - stop.nominal_measure } : null,
        pitchText: VA.kinematicNumber(stop.nominal_measure, decimals),
      };
    });
  };

  // The study's datum, in one line under the chart: which stop the sweep's
  // zero is. Null for a study that names no datum.
  function stopWords(study, stop) {
    var t = stop.target;
    if (typeof t !== "number") return stop.label || stop.id;
    return (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(t) +
      (study.units ? " " + study.units : "") + " stop";
  }

  VA.kinematicDatumNote = function (study) {
    var datum = study && study.datum;
    if (!datum || !datum.stop) return null;
    var at = null;
    (study.stops || []).forEach(function (stop) { if (stop.id === datum.stop) at = stop; });
    if (!at) return null;
    return "Zero travel is the " + stopWords(study, at) +
      (datum.basis ? ": " + datum.basis : "") + ".";
  };

  // The range between the two stops, as a readout row: the builder's
  // `range` (the high stop's measure less the low's), and what the terms both
  // stops share cancelled to. Null where the study has no range.
  VA.kinematicRange = function (study, decimals) {
    var range = study && study.range;
    if (!range) return null;
    var stops = {};
    (study.stops || []).forEach(function (stop) { stops[stop.id] = stop; });
    var high = stops[range.high], low = stops[range.low];
    if (!high || !low) return null;
    var shared = { count: 0, high: 0, low: 0, left: 0 };
    (range.cancelled || []).forEach(function (c) {
      shared.count += c.count; shared.high += c.at_high;
      shared.low += c.at_low; shared.left += c.residual;
    });
    var n = function (v) { return VA.kinematicNumber(v, decimals); };
    return {
      cells: ["range", "", n(range.nominal_measure), "±" + n(range.worst_case_half),
              "±" + n(range.rss_half)],
      title: stopWords(study, high) + " less " + stopWords(study, low),
      says: shared.count
        ? shared.count + " terms both stops share cancel to ±" + n(shared.left) +
          " (±" + n(shared.high) + " at the " + stopWords(study, high) + ", ±" +
          n(shared.low) + " at the " + stopWords(study, low) + ")"
        : null,
    };
  };

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
    var x0 = Math.min.apply(null, xs);
    var x1 = Math.max.apply(null, xs);
    var bars = VA.kinematicStopBars(study, decimals);
    // A spread limit (no `bound`) is a pair of lines across the plot; a reach
    // bound is its stop's own tick (VA.kinematicStopBars).
    var limits = [];
    (study.checks || []).forEach(function (check) {
      if (check.limit && !check.bound && typeof check.limit.value === "number" &&
          limits.indexOf(check.limit.value) === -1) {
        limits.push(check.limit.value);
      }
    });
    var reach = 1e-9;
    env.forEach(function (p) {
      reach = Math.max(reach, Math.abs(p.worst_case_min), Math.abs(p.worst_case_max));
    });
    limits.forEach(function (v) { reach = Math.max(reach, Math.abs(v)); });
    bars.forEach(function (b) {
      reach = Math.max(reach, Math.abs(b.worstMin), Math.abs(b.worstMax));
      if (b.bound) reach = Math.max(reach, Math.abs(b.bound.offset));
    });
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

    // Each stop's bar, in plot pixels (VA.kinematicStopBars says what it is).
    var stopBars = bars.map(function (b) {
      var x = r2(X(b.centre));
      var anchorEnd = x > C.left + pw / 2;
      return {
        stop: b.stop, x: x,
        worstTop: r2(Y(b.worstMax)), worstBottom: r2(Y(b.worstMin)),
        rssTop: r2(Y(b.rssMax)), rssBottom: r2(Y(b.rssMin)), zero: r2(Y(0)),
        bound: b.bound ? r2(Y(b.bound.offset)) : null,
        label: { x: r2(x + (anchorEnd ? -8 : 8)), y: r2(Y(b.rssMax) - 4),
                 anchorEnd: anchorEnd,
                 text: withUnit(b.pitchText, study.units) },
      };
    });
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
      bars: stopBars,
      // The x axis as numbers, for a mark placed after the chart is drawn
      // (the pose cursor, VA.kinematicChartX).
      xScale: { from: x0, to: x1, left: C.left, width: pw },
      xLabel: (driver.label || "driver") + (driver.unit ? ", " + driver.unit : ""),
      yLabel: measureWords(study) + " from nominal" +
        (study.units ? ", " + study.units : ""),
      points: points,
    };
  };

  // A driver value's x on a chart (its `xScale`), in viewBox units.
  VA.kinematicChartX = function (scale, value) {
    var x = scale.left + (value - scale.from) / ((scale.to - scale.from) || 1) * scale.width;
    return Math.round(x * 100) / 100;
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

  // The page has the shape every study page has: the model in the main
  // column, and the RESULTS -- the study's name, its verdict per stop, the
  // swept chart, the stop readouts, the one contributor table and the
  // provenance fold -- in the right-hand pane, above the selection's
  // preview (topology_app.js's paint). One component, one container
  // (2026-10-29: the table used to render under the model, wired to the
  // model's re-render rather than to the results). Jeff, 2026-10-28: "vertical screen
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

    var runId = study.sweep && study.sweep.run_id;
    if (runId && ctx.readSweep && window.SweepExport) {
      window.SweepExport.renderControl(root, function () {
        return ctx.readSweep(runId).then(function (doc) {
          if (!doc) throw new Error("no run file");
          return { doc: doc };
        });
      });
    }

    var chart = VA.kinematicChart(study, decimals);
    // The pose control sits over the chart whose x axis its slider runs
    // along, where the pane shows it without a scroll.
    if (ctx.onStackStop && (study.stops || []).length > 1) {
      root.appendChild(stackStopPicker(study, ctx, chart));
    }
    if (chart) root.appendChild(chartFigure(chart, ctx.pose || null));
    var datum = chart ? VA.kinematicDatumNote(study) : null;
    if (datum) root.appendChild(VA.el("p", "muted kmchart__note", datum));
    root.appendChild(stopReadouts(study, decimals));
    root.appendChild(provenance(study));
    return root;
  };

  // Each stop's readout, one row per stop: where it is on the sweep, the
  // measure there, and both spreads -- the builder's numbers at the
  // projection's precision -- with what the worst case is made of under it
  // (the linkage at this pose and the stop's position). Then the range
  // between the stops, and what the terms they share cancelled to. The
  // margin is the verdict's, in the strip above.
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
        var linkage = subStack(stop, SUB_LINKAGE);
        var position = subStack(stop, SUB_POSITION);
        var n = function (v) { return VA.kinematicNumber(v, decimals); };
        return {
          stop: stop.id,
          cells: [
            stop.label,
            n(stop.driver_value),
            n(stop.nominal_measure),
            "±" + n(stop.worst_case_half),
            "±" + n(stop.rss_half),
          ],
          says: typeof linkage.worst_case_half === "number" &&
            typeof position.worst_case_half === "number"
            ? "worst ±" + n(stop.worst_case_half) + " = ±" + n(linkage.worst_case_half) +
              " (" + VA.KINEMATIC_SUB_STACK_KINDS[SUB_LINKAGE].words + ") + ±" +
              n(position.worst_case_half) + " (" +
              VA.KINEMATIC_SUB_STACK_KINDS[SUB_POSITION].words + ", " +
              (position.term_count || 0) + " terms)"
            : null,
        };
      }),
      range: VA.kinematicRange(study, decimals),
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
    var says = function (text, key) {
      var tr = VA.el("tr", "kmreadouts__says");
      tr.setAttribute("data-stop", key);
      var td = VA.el("td", "muted", text);
      td.setAttribute("colspan", String(model.head.length));
      tr.appendChild(td);
      table.appendChild(tr);
    };
    model.rows.forEach(function (row) {
      var tr = VA.el("tr", "kmreadouts__row");
      tr.setAttribute("data-stop", row.stop);
      row.cells.forEach(function (text, i) {
        tr.appendChild(VA.el("td", i ? "num" : null, text));
      });
      table.appendChild(tr);
      if (row.says) says(row.says, row.stop);
    });
    if (model.range) {
      var tr = VA.el("tr", "kmreadouts__row kmreadouts__range");
      tr.setAttribute("data-stop", "range");
      tr.setAttribute("title", model.range.title);
      model.range.cells.forEach(function (text, i) {
        tr.appendChild(VA.el("td", i ? "num" : null, text));
      });
      table.appendChild(tr);
      if (model.range.says) says(model.range.says, "range");
    }
    return table;
  }

  // The pose control (the_grid_and_the_dag_move_with_the_mechanism): where on
  // the sweep the grid, the DAG, this chart's cursor and the 3D pane are all
  // read. Play, a slider over the driver's travel -- the chart's own x axis,
  // run the same way -- the measure at the pose as a field that takes a
  // typed angle, and one quiet button per stop that puts the pose on it (the
  // one on the pose pressed). The page owns the pose (`ctx.pose`, and
  // `ctx.onPose(index, settled)`): a drag reports every move unsettled and
  // the release settled, and VA.syncPoseControl moves this control's marks
  // while the page is the one moving the pose. A page with no pose to offer
  // gets the stop buttons alone.
  function stackStopPicker(study, ctx, chart) {
    var box = VA.el("div", "kmstop kmpose");
    var pose = ctx.pose || null;
    var driver = (study.sweep && study.sweep.driver) || {};
    if (pose && ctx.onPose && chart) {
      var play = VA.el("button", "ghost kmpose__play", ctx.playing ? "Pause" : "Play");
      play.setAttribute("aria-pressed", ctx.playing ? "true" : "false");
      play.setAttribute("title", "Cycle the sweep, end to end and back");
      play.onclick = function () { if (ctx.onPlay) ctx.onPlay(!ctx.playing); };
      box.appendChild(play);
      var slider = VA.el("input", "kmpose__slider");
      slider.setAttribute("type", "range");
      slider.setAttribute("min", String(chart.xScale.from));
      slider.setAttribute("max", String(chart.xScale.to));
      slider.setAttribute("step", "any");
      slider.setAttribute("aria-label", driver.label || "driver");
      slider.setAttribute("title", withUnit(driver.label || "driver", driver.unit));
      slider.value = String(pose.driver);
      var fromSlider = function (settled) {
        var f = VA.kinematicPoseOfDriver(study, Number(slider.value));
        if (f !== null) ctx.onPose(f, settled);
      };
      slider.oninput = function () { fromSlider(false); };
      slider.onchange = function () { fromSlider(true); };
      box.appendChild(slider);
      var field = VA.el("input", "kmpose__angle num");
      field.setAttribute("type", "number");
      field.setAttribute("step", String(Math.pow(10, -VA.KINEMATIC_POSE.angleDecimals)));
      field.setAttribute("aria-label", measureWords(study));
      field.setAttribute("title", measureWords(study) + " at this pose");
      field.value = VA.kinematicNumber(pose.measure, VA.KINEMATIC_POSE.angleDecimals);
      field.onchange = function () {
        var f = VA.kinematicPoseOfMeasure(study, Number(field.value));
        if (f !== null) ctx.onPose(f, true);
      };
      box.appendChild(field);
      if (study.units) box.appendChild(VA.el("span", "muted kmpose__unit", study.units));
    } else {
      box.appendChild(VA.el("span", "muted kmstop__label", "Grid at"));
    }
    (study.stops || []).forEach(function (stop) {
      var on = pose ? pose.stop === stop.id : stop.id === ctx.stackStop;
      var b = VA.el("button", "ghost kmstop__button" + (on ? " kmstop__button--on" : ""),
        stopWords(study, stop));
      b.setAttribute("data-stop", stop.id);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("title", stop.label);
      b.onclick = function () { if (!on) ctx.onStackStop(stop.id); };
      box.appendChild(b);
    });
    return box;
  }

  // The pose control's and the chart cursor's marks moved to `pose`, in place
  // (a frame of play, or the page answering a drag): nothing is rebuilt, and
  // a field the reader is typing in is left alone.
  VA.syncPoseControl = function (root, study, pose, playing) {
    if (!root || !root.querySelector || !study || !pose) return;
    var active = typeof document !== "undefined" ? document.activeElement : null;
    var slider = root.querySelector("input.kmpose__slider");
    if (slider && slider !== active) slider.value = String(pose.driver);
    var field = root.querySelector("input.kmpose__angle");
    if (field && field !== active) {
      field.value = VA.kinematicNumber(pose.measure, VA.KINEMATIC_POSE.angleDecimals);
    }
    var play = root.querySelector("button.kmpose__play");
    if (play && typeof playing === "boolean") {
      play.textContent = playing ? "Pause" : "Play";
      play.setAttribute("aria-pressed", playing ? "true" : "false");
    }
    root.querySelectorAll("button.kmstop__button").forEach(function (b) {
      var on = b.getAttribute("data-stop") === pose.stop;
      b.className = "ghost kmstop__button" + (on ? " kmstop__button--on" : "");
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var cursor = root.querySelector("line.kmchart__pose");
    var scale = null;
    try { scale = cursor ? JSON.parse(cursor.getAttribute("data-scale")) : null; } catch (err) { scale = null; }
    if (cursor && scale) {
      var x = String(VA.kinematicChartX(scale, pose.driver));
      cursor.setAttribute("x1", x);
      cursor.setAttribute("x2", x);
    }
  };

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

  function chartFigure(chart, pose) {
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

    svg.appendChild(VA.svg("polygon", "kmchart__worst", { points: chart.worst }));
    svg.appendChild(VA.svg("polygon", "kmchart__rss", { points: chart.rss }));
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
    // Each stop: a point at its nominal x, its worst-case bar and its RSS bar
    // over it, the reach bound's tick, and its pitch beside the bar's top.
    chart.bars.forEach(function (bar) {
      var marks = [
        VA.svg("line", "kmchart__bar kmchart__bar--worst",
          { x1: bar.x, x2: bar.x, y1: bar.worstTop, y2: bar.worstBottom }),
        VA.svg("line", "kmchart__bar kmchart__bar--rss",
          { x1: bar.x, x2: bar.x, y1: bar.rssTop, y2: bar.rssBottom }),
        VA.svg("circle", "kmchart__barpoint", { cx: bar.x, cy: bar.zero, r: 3 }),
      ];
      [bar.worstTop, bar.worstBottom].forEach(function (y) {
        marks.push(VA.svg("line", "kmchart__bar kmchart__bar--cap",
          { x1: bar.x - 4, x2: bar.x + 4, y1: y, y2: y }));
      });
      if (bar.bound !== null) {
        marks.push(VA.svg("line", "kmchart__bound",
          { x1: bar.x - 9, x2: bar.x + 9, y1: bar.bound, y2: bar.bound }));
      }
      var text = VA.svg("text", "kmchart__barlabel", {
        x: bar.label.x, y: bar.label.y, "text-anchor": bar.label.anchorEnd ? "end" : "start",
      });
      text.textContent = bar.label.text;
      marks.push(text);
      marks.forEach(function (m) { m.setAttribute("data-stop", bar.stop); svg.appendChild(m); });
    });
    svg.appendChild(VA.svg("rect", "kmchart__frame",
      { x: p.left, y: p.top, width: p.width, height: p.height }));
    // The live pose: a line across the plot at the pose's driver value, moved
    // with the linkage (VA.syncPoseControl). The stop bars stay where they are.
    if (pose && typeof pose.driver === "number") {
      var poseX = VA.kinematicChartX(chart.xScale, pose.driver);
      var poseLine = VA.svg("line", "kmchart__pose",
        { x1: poseX, x2: poseX, y1: p.top, y2: p.top + p.height });
      poseLine.setAttribute("data-scale", JSON.stringify(chart.xScale));
      svg.appendChild(poseLine);
    }

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
