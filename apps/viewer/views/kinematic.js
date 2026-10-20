// The kinematic study page (handoff the_viewer_shows_a_kinematic_study,
// 2026-10-20): one page per study in data/projections/viewer/kinematic/
// kinematic_studies.json -- its verdict per stop, the envelope over the sweep,
// the ranked contributor table per stop, and where the numbers came from.
//
// The same shape as views/stack.js and views/topology.js: pure models first
// (no DOM, so the fast tier pins them value by value), then one renderer that
// topology_app.js calls with a ctx. Nothing here adds anything up. Every
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
      group(study.topology).studies.push({
        id: study.id, title: study.title || study.id,
        description: study.description || null,
        failed: status ? status.failed : true,
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

  VA.kinematicRows = function (study, stop, topoProj, decimals) {
    var index = VA.topologyIndex(topoProj);
    var shared = VA.kinematicCoefficientUnit(study, stop);
    return (stop.rows || []).map(function (row) {
      var kind = VA.KINEMATIC_ROW_KINDS[row.kind];
      var zone = VA.KINEMATIC_ZONE_KINDS[row.zone];
      var source = VA.KINEMATIC_FEATURE_SOURCES[row.feature_source];
      var edge = index.edges[row.edge] || null;
      var band = row.band;
      var perCellUnit = shared ? null
        : (band && band.units && study.units ? study.units + "/" + band.units : null);
      return {
        edge: row.edge,
        topology: study.topology,
        name: edge ? edge.name : row.edge,
        part: edge ? edge.part || null : null,
        title: row.edge + " · " + (source ? source.words
          : VA.unlabelledKinematicText("feature_source", row.feature_source)),
        kind: row.kind,
        flag: kind ? kind.flag
          : VA.unlabelledKinematicText("row kind", row.kind),
        flagTitle: kind ? kind.title : null,
        muted: kind ? kind.muted : false,
        zone: zone ? zone.label : VA.unlabelledKinematicText("zone", row.zone),
        zoneTitle: zone ? zone.title : null,
        sign: row.sign < 0 ? "−" : "+",
        coefficient: withUnit(VA.kinematicNumber(row.coefficient, decimals), perCellUnit),
        band: band
          ? withUnit("±" + VA.kinematicNumber(band.half_range, decimals), shared ? null : band.units)
          : null,
        bandTitle: band ? band.name : (row.gap || null),
        magnitude: typeof row.magnitude === "number"
          ? VA.kinematicNumber(row.magnitude, decimals) : null,
        confidence: row.confidence || null,
        note: row.note || null,
      };
    });
  };

  // --- the envelope chart's geometry ------------------------------------------------
  //
  // Pure, in viewBox units, so the fast tier can pin where things land. x is
  // the sweep's driver; y is the DEVIATION FROM NOMINAL, not the measure
  // itself: a ±0.24 deg band on an 80 deg axis is a line one pixel thick, which
  // was the 2026-10-16 lesson's own finding about plotting it the other way.
  // The axis is symmetric about zero and reaches past both the widest
  // worst-case edge and the limit, so a limit is always on the chart.
  VA.KINEMATIC_CHART = Object.freeze({
    width: 720, height: 280, left: 60, right: 16, top: 14, bottom: 44,
  });

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
    var xTicks = ticks(x0, x1, 7);
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
      limits: limits.map(function (v) {
        return { upper: r2(Y(v)), lower: r2(Y(-v)),
                 text: "limit ±" + withUnit(VA.kinematicNumber(v, decimals), study.units) };
      }),
      stops: (study.stops || []).map(function (stop) {
        return { id: stop.id, label: stop.label, x: r2(X(stop.driver_value)),
                 anchorEnd: X(stop.driver_value) > C.left + pw / 2 };
      }),
      xLabel: (driver.label || "driver") + (driver.unit ? ", " + driver.unit : ""),
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

  VA.renderKinematic = function (root, ctx) {
    VA.clear(root);
    root.className = "kmview";
    var study = ctx.study;
    if (!study) {
      root.appendChild(VA.el("p", "muted", "Pick a kinematic study in the list."));
      return root;
    }
    var decimals = ctx.kinematic && ctx.kinematic.display_decimals;
    var topoProj = VA.findTopology(ctx.topologies, study.topology);

    var head = VA.el("h2", "kmhead__title", study.title || study.id);
    head.setAttribute("title", study.id);
    root.appendChild(head);

    var status = VA.KINEMATIC_STUDY_STATUSES[study.status];
    if (!status || status.failed) {
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

    root.appendChild(verdictStrip(study, decimals));
    var driver = (study.sweep && study.sweep.driver) || {};
    root.appendChild(VA.el("p", "muted kmhead__driver",
      "Swept over " + (driver.label || "the driver") +
      (driver.unit ? ", " + driver.unit : "") + " · " +
      (study.envelope || []).length + " points · " +
      measureWords(study) + " in " + (study.units || "its own units")));

    var chart = VA.kinematicChart(study, decimals);
    if (chart) root.appendChild(chartFigure(chart));

    (study.stops || []).forEach(function (stop) {
      root.appendChild(stopSection(study, stop, topoProj, decimals, ctx));
    });

    root.appendChild(provenance(study));
    return root;
  };

  function verdictStrip(study, decimals) {
    var strip = VA.el("div", "kmhead__verdicts");
    var verdicts = VA.kinematicVerdicts(study, decimals);
    if (!verdicts.length) {
      strip.appendChild(VA.el("span", "muted", study.no_checks_reason ||
        "no pass/fail criterion recorded yet"));
      return strip;
    }
    verdicts.forEach(function (v) {
      var item = VA.el("div", "kmverdict");
      item.setAttribute("data-stop", v.stop);
      item.setAttribute("title", v.label);
      var chip = VA.chip("tvverdict tvverdict--" + (v.verdict || "unknown") +
        (v.incomplete ? " tvverdict--qualified" : ""), v.verdict, v.title);
      item.appendChild(chip);
      item.appendChild(VA.el("span", "kmverdict__stop", v.stopLabel));
      item.appendChild(VA.el("span", "kmverdict__margin num", v.marginText));
      // Always five cells, empty where there is nothing to say: the strip is
      // one grid (topology.css), and a short row would shift every row below.
      item.appendChild(VA.el("span", "muted kmverdict__limit", v.limitText || ""));
      item.appendChild(v.scopeChip ? VA.chip("chip--budget", v.scopeChip, v.scopeTitle)
        : VA.el("span"));
      strip.appendChild(item);
    });
    return strip;
  }

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

    svg.appendChild(VA.svg("polygon", "kmchart__worst", { points: chart.worst }));
    svg.appendChild(VA.svg("polygon", "kmchart__rss", { points: chart.rss }));
    svg.appendChild(VA.svg("line", "kmchart__zero",
      { x1: p.left, x2: p.left + p.width, y1: chart.zeroY, y2: chart.zeroY }));
    chart.limits.forEach(function (limit) {
      [limit.upper, limit.lower].forEach(function (y) {
        svg.appendChild(VA.svg("line", "kmchart__limit",
          { x1: p.left, x2: p.left + p.width, y1: y, y2: y }));
      });
      // Mid-plot, so it never meets a stop's label: the stops are usually
      // the sweep's own ends, which is where their labels sit.
      var text = VA.svg("text", "kmchart__limitlabel",
        { x: p.left + p.width / 2, y: limit.upper - 5, "text-anchor": "middle" });
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

  function stopSection(study, stop, topoProj, decimals, ctx) {
    var section = VA.el("section", "kmstop");
    section.setAttribute("data-stop", stop.id);
    section.appendChild(VA.el("h3", "kmstop__title", stop.label));
    var driver = (study.sweep && study.sweep.driver) || {};
    section.appendChild(VA.el("p", "muted kmstop__where",
      (driver.label || "driver") + " " +
      withUnit(VA.kinematicNumber(stop.driver_value, decimals), driver.unit) +
      " · " + measureWords(study) + " " +
      withUnit(VA.kinematicNumber(stop.nominal_measure, decimals), study.units) +
      " · ±" + withUnit(VA.kinematicNumber(stop.worst_case_half, decimals), study.units) +
      " worst case · ±" + withUnit(VA.kinematicNumber(stop.rss_half, decimals), study.units) +
      " RSS"));

    var unit = VA.kinematicCoefficientUnit(study, stop);
    var bandUnits = unit ? unit.split("/")[1] : null;
    var table = VA.el("table", "kmtable");
    var head = VA.el("tr");
    [["Contributor", null], ["Zone", null], ["Sign", "num"],
     [unit ? "Coefficient, " + unit : "Coefficient", "num"],
     [bandUnits ? "Band, " + bandUnits : "Band", "num"],
     [study.units ? "Magnitude, " + study.units : "Magnitude", "num"],
     ["Confidence", null], ["", null]].forEach(function (col) {
      head.appendChild(VA.el("th", col[1], col[0]));
    });
    table.appendChild(VA.el("thead", null, head));
    var body = VA.el("tbody");
    VA.kinematicRows(study, stop, topoProj, decimals).forEach(function (row) {
      body.appendChild(contributorRow(row, topoProj, ctx));
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function contributorRow(row, topoProj, ctx) {
    var tr = VA.el("tr", "kmrow kmrow--" + row.kind + (row.muted ? " kmrow--muted" : ""));
    tr.setAttribute("data-edge", row.edge);

    var nameCell = VA.el("td", "kmrow__name");
    var link = VA.el("a", "kmrow__edge", row.name);
    link.setAttribute("href", VA.viewerLink({ topology: row.topology, edge: row.edge }));
    link.setAttribute("title", row.title);
    link.onclick = function (event) {
      if (!ctx.onEdge) return;
      if (event && event.preventDefault) event.preventDefault();
      ctx.onEdge(row.topology, row.edge);
    };
    nameCell.appendChild(link);
    tr.appendChild(nameCell);

    var zone = VA.el("td", "kmrow__zone", row.zone);
    if (row.zoneTitle) zone.setAttribute("title", row.zoneTitle);
    tr.appendChild(zone);
    tr.appendChild(VA.el("td", "num", row.sign));
    tr.appendChild(VA.el("td", "num", row.coefficient));

    var band = VA.el("td", "num");
    if (row.band) {
      band.textContent = row.band;
      if (row.bandTitle) band.setAttribute("title", row.bandTitle);
    } else if (row.flag) {
      band.appendChild(VA.chip("chip--gap", row.flag, row.bandTitle || row.flagTitle));
    }
    tr.appendChild(band);

    var magnitude = VA.el("td", "num", row.magnitude === null ? "" : row.magnitude);
    if (row.magnitude !== null && row.flag && row.flagTitle) {
      magnitude.setAttribute("title", row.flagTitle);
    }
    tr.appendChild(magnitude);

    var confidence = VA.el("td", "kmrow__conf");
    if (row.confidence) {
      confidence.appendChild(VA.chip(VA.confidenceClass(row.confidence),
        VA.CONFIDENCE_LABEL[row.confidence] || row.confidence));
    }
    tr.appendChild(confidence);
    tr.appendChild(threeDCell(row, topoProj, ctx));
    return tr;
  }

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
