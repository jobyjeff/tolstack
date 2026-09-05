// The three panes of the topology page: the rails (SVG), the grid, and the
// preview. They are one view file because they are one alignment contract —
// every row's y is `VA.railY(row.row)` in the SVG and an inline `height` of
// `VA.RAIL_METRICS.rowHeight` in the grid, and splitting them across files is
// how those two stop being the same number.
//
// Nothing here computes a tolerance. The rail columns come out of the
// projection, the folded numbers come out of the projection, and this file turns
// row indices into pixels.
(function (VA) {
  "use strict";

  var M = VA.RAIL_METRICS;

  // --- the selectors in the topbar -----------------------------------------

  VA.renderTopoPicker = function (root, projection, state, handlers) {
    VA.clear(root);
    var topologies = (projection && projection.topologies) || [];

    // Viewing a loose stack (VA.looseStacks) is a THIRD state this select has to
    // represent honestly: showing a real topology id as "selected" while a
    // stack's elements table is on screen would be a fact the picker states and
    // the page contradicts, and a browser does not fire `change` on reselecting
    // its current value — so returning to the topology last looked at would take
    // two clicks. A placeholder option, selected only in stack mode, keeps every
    // topology in the list a genuine change away.
    var inStackMode = state.mode === "stack";
    root.appendChild(VA.el("label", "tvpick__label", "topology"));
    root.appendChild(select("topology-select",
      (inStackMode
        ? [{ value: "", label: "— viewing a stack; pick one to return —" }]
        : []
      ).concat(topologies.map(function (t) {
        return { value: t.id, label: t.title + "  (" + t.id + ")" };
      })),
      inStackMode ? "" : state.topologyId, handlers.onTopology));

    var topoProj = VA.findTopology(projection, state.topologyId);
    var studies = (topoProj && topoProj.studies) || [];
    root.appendChild(VA.el("label", "tvpick__label", "study"));
    root.appendChild(select("study-select",
      [{ value: "", label: "— none (whole topology) —" }].concat(
        studies.map(function (s) {
          return {
            value: s.id,
            label: (s.status === "error" ? "⚠ " : "") + s.title,
          };
        })),
      state.studyId || "", handlers.onStudy));

    // Two layouts over ONE serialiser (build_topology_projection.serialize_*):
    // the whole graph depth-first, or the study's chain in the order the sum
    // runs. The chain is linear by construction, so its layout is one rail —
    // which is also the honest picture of the L1 fastener stack's study.
    var toggle = VA.el("button", "ghost tvpick__mode",
      state.layoutMode === "chain" ? "Showing: study chain" : "Showing: whole topology");
    toggle.setAttribute("id", "layout-toggle");
    toggle.setAttribute("title",
      "Whole topology: every node and edge of the document, depth-first, with " +
      "the study's path highlighted. Study chain: only the selected study's " +
      "edges, in the order the sum runs.");
    toggle.disabled = !(state.studyId && studyOk(topoProj, state.studyId));
    toggle.onclick = handlers.onLayoutMode;
    root.appendChild(toggle);

    // Row density: trades reading comfort for seeing more of the DAG at once.
    // Comfortable is the default 26px pitch; compact is 16px, which turns the
    // pitch system's 43 rows into ~690px. VA.RAIL_METRICS.rowHeight (and the
    // SVG geometry that follows it) moves with this — see topology.js.
    var densityPreset = VA.ROW_DENSITIES[state.rowDensity] || VA.ROW_DENSITIES.comfortable;
    var density = VA.el("button", "ghost tvpick__mode", "Rows: " + densityPreset.label);
    density.setAttribute("id", "density-toggle");
    density.setAttribute("title",
      "Compact rows fit more of the DAG on screen at once, at the cost of " +
      "reading comfort. The rails resize with the rows, so alignment holds " +
      "either way.");
    density.onclick = handlers.onDensity;
    root.appendChild(density);
    return root;
  };

  function studyOk(topoProj, studyId) {
    var study = VA.findStudy(topoProj, studyId);
    return !!(study && study.status === "ok");
  }

  function select(id, options, value, onChange) {
    var node = VA.el("select", "tvpick__select");
    node.setAttribute("id", id);
    options.forEach(function (option) {
      var opt = VA.el("option", null, option.label);
      opt.setAttribute("value", option.value);
      if (option.value === value) opt.setAttribute("selected", "selected");
      node.appendChild(opt);
    });
    node.value = value;
    node.onchange = function () { onChange(node.value); };
    return node;
  }

  // --- rails + grid, in one scrolling box ----------------------------------
  //
  // `root` is the scroll container. Both panes live inside it, which is the
  // whole implementation of "scrolling keeps them locked together": there is one
  // scrollport, so there is nothing to synchronise and nothing to drift.

  VA.renderTopoPane = function (root, ctx) {
    VA.clear(root);
    root.className = "tv__scroll";
    var topoProj = ctx.topoProj;
    if (!topoProj) {
      root.appendChild(VA.el("p", "muted",
        "No topology projection. Build it with " +
        VA.CONFIG.rebuild.topologies + " and reload."));
      return root;
    }

    var study = ctx.study;
    var layout = layoutFor(topoProj, study, ctx.layoutMode);
    var geometry = VA.railGeometry(layout, M);
    var index = VA.topologyIndex(topoProj);
    var chain = VA.chainIndex(study);
    var chainNodes = VA.chainNodes(study);
    var marking = !!(study && study.status === "ok");

    root.appendChild(header(geometry.width));

    var body = VA.el("div", "tv__body");
    body.appendChild(railsSvg(geometry, index, chain, chainNodes, marking, ctx));
    body.appendChild(grid(layout, index, chain, chainNodes, marking, ctx));
    root.appendChild(body);
    return root;
  };

  // Which serialisation the page is showing. Both come out of the projection;
  // neither is computed here. A study that raised falls back to the whole
  // topology, because there is no chain to lay out — the error IS the result.
  function layoutFor(topoProj, study, mode) {
    if (mode === "chain" && study && study.status === "ok" && study.layout) {
      return study.layout;
    }
    return topoProj.layout;
  }

  // The grid is a REAL <table> (deliverable 2): a rectangular selection has to
  // paste into Excel as columns, which only a genuine table body does — a
  // div-flex grid copies as one run of text no matter how it looks on screen.
  // One array drives the header row, the column widths (via <col>, so the head
  // table and the body table cannot disagree) and the total width both tables
  // are given inline — a second place these could drift is exactly the "three
  // places" trap this file already documents once for row height.
  var COLUMNS = [
    { cls: "ord", label: "#", width: 38 },
    { cls: "name", label: "element", width: 220 },
    { cls: "part", label: "part / interface", width: 170 },
    { cls: "nominal", label: "nominal", width: 80 },
    { cls: "min", label: "min", width: 80 },
    { cls: "max", label: "max", width: 80 },
    { cls: "contribution", label: "contribution", width: 200 },
    { cls: "chips", label: "sourcing", width: 220 },
  ];

  function tableWidth() {
    return COLUMNS.reduce(function (sum, c) { return sum + c.width; }, 0);
  }

  function colgroup() {
    var cg = VA.el("colgroup");
    COLUMNS.forEach(function (c) {
      cg.appendChild(VA.el("col", "tvcol tvcol--" + c.cls));
    });
    return cg;
  }

  // The column header. Padded left by exactly the SVG's width so a header cell
  // sits over the column it names — the rails are a sibling of the rows, not a
  // cell of them, so the offset has to be applied by hand and read from the same
  // geometry the SVG was drawn from. Real <th> cells (deliverable 2): a screen
  // reader and a copy-paste both get an actual header, not a styled div.
  function header(railWidth) {
    var head = VA.el("div", "tv__head");
    head.style.paddingLeft = railWidth + "px";
    var table = VA.el("table", "tvheadtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tr = VA.el("tr");
    COLUMNS.forEach(function (c) {
      tr.appendChild(VA.el("th", "tvcell tvcell--" + c.cls, c.label));
    });
    table.appendChild(VA.el("thead", null, tr));
    head.appendChild(table);
    return head;
  }

  // --- the SVG -------------------------------------------------------------

  function railsSvg(geometry, index, chain, chainNodes, marking, ctx) {
    var svg = VA.svg("svg", "tv__rails", {
      width: geometry.width,
      height: geometry.height,
      viewBox: "0 0 " + geometry.width + " " + geometry.height,
    });
    svg.style.minWidth = geometry.width + "px";
    svg.style.height = geometry.height + "px";

    // 1. the rails themselves: continuous, neutral, alternating shade by column
    //    parity so two rails crossing can still be told apart. NOT a categorical
    //    palette — see the page's legend for why there isn't one.
    geometry.rails.forEach(function (rail) {
      svg.appendChild(VA.svg("line",
        "rail rail--" + (rail.column % 2 ? "odd" : "even"),
        { x1: rail.x, y1: rail.y1, x2: rail.x, y2: rail.y2 }));
    });

    // 2. the fan-outs and the loop closures.
    geometry.links.forEach(function (link) {
      svg.appendChild(VA.svg("path", "rail__link rail__link--" + link.kind,
        { d: link.d }));
    });

    // 3. one mark per row: a bar for an edge (the dimension IS the segment), a
    //    dot for a node (the interface IS the point).
    geometry.marks.forEach(function (mark) {
      if (mark.kind === "edge") {
        var edge = index.edges[mark.id];
        var inChain = marking && !!chain[mark.id];
        var classes = ["rail__bar"];
        if (edge) classes.push(VA.confidenceClass(edge.confidence));
        if (edge && edge.kind === "gap") classes.push("rail__bar--gap");
        if (edge && edge.value_source === "derived") classes.push("rail__bar--derived");
        if (marking) classes.push(inChain ? "rail__bar--on" : "rail__bar--off");
        var bar = VA.svg("line", classes.join(" "), {
          x1: mark.x, y1: mark.y - M.rowHeight / 2 + 1,
          x2: mark.x, y2: mark.y + M.rowHeight / 2 - 1,
        });
        bar.appendChild(svgTitle(edge ? edge.name : mark.id));
        wire(bar, ctx, "edge", mark.id);
        svg.appendChild(bar);
        return;
      }
      var node = index.nodes[mark.id];
      var dotClasses = ["rail__dot"];
      if (mark.branch) dotClasses.push("rail__dot--branch");
      if (node && node.kind === "datum_feature") dotClasses.push("rail__dot--datum");
      if (marking) dotClasses.push(chainNodes[mark.id] ? "rail__dot--on" : "rail__dot--off");
      var dot = VA.svg("circle", dotClasses.join(" "), {
        cx: mark.x, cy: mark.y, r: mark.branch ? M.branchDot : M.dot,
      });
      dot.appendChild(svgTitle(node ? node.name : mark.id));
      wire(dot, ctx, "node", mark.id);
      svg.appendChild(dot);
    });
    return svg;
  }

  // A native SVG tooltip: the element's own name, so hovering the graph reads
  // without the grid. `textContent` rather than a text node, because the DOM
  // shim's appendChild return value is the one place the two DOMs differ.
  function svgTitle(text) {
    var node = VA.svg("title");
    node.textContent = String(text);
    return node;
  }

  // A rail mark is clickable and addressable by the same (kind, id) pair its
  // grid row is. `data-id` is not decoration: it is what lets the browser tier
  // measure a mark's y against its row's y, which is the alignment claim this
  // whole page is built on and the one thing a DOM shim cannot check.
  function wire(node, ctx, kind, id) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("data-row-kind", kind);
    node.setAttribute("data-id", id);
    node.onclick = function () { ctx.onSelect(kind, id); };
    return node;
  }

  // --- the grid ------------------------------------------------------------

  function grid(layout, index, chain, chainNodes, marking, ctx) {
    var box = VA.el("div", "tv__rows");
    var table = VA.el("table", "tvtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tbody = VA.el("tbody");
    layout.rows.forEach(function (row) {
      tbody.appendChild(row.kind === "edge"
        ? edgeRow(row, index, chain, marking, ctx)
        : nodeRow(row, index, chainNodes, marking, ctx));
    });
    table.appendChild(tbody);
    box.appendChild(table);
    return box;
  }

  // Every row is exactly `rowHeight` tall, set inline from the same constant the
  // SVG's y came from. A stylesheet could say the same thing; only this cannot
  // drift from it. A real <tr> (deliverable 2), not a styled div: a table row is
  // what lets a rectangular selection of the grid paste into Excel as columns.
  function baseRow(kind, ctx, id) {
    var node = VA.el("tr", "tvrow tvrow--" + kind);
    node.style.height = M.rowHeight + "px";
    // A table's auto row-height algorithm sizes an EMPTY cell to its font's
    // line-height "strut" regardless of the row's own explicit height — that
    // height is a floor, not a cap — so a cell with a taller default
    // line-height than the row's own pitch (compact density's 16px against a
    // ~16.5px "normal" strut) grows the row past it. Capping line-height here
    // once, inherited by every cell, is the same fix the old div row made by
    // setting it directly (this file's own history).
    node.style.lineHeight = Math.max(1, M.rowHeight - 2) + "px";
    node.setAttribute("data-row-kind", kind);
    node.setAttribute("data-id", id);
    node.onclick = function () { ctx.onSelect(kind, id); };
    return node;
  }

  // The sourcing cell's chips need their own flex row: setting `display: flex`
  // directly on a <td> pulls it out of the table's box generation in some
  // browsers, so the flex container is a plain div one layer inside the cell
  // instead — the same "wrap the cell's content in a div" shape every other
  // cell in this repo's tables already uses.
  function chipsCell(cls) {
    var cell = VA.el("td", "tvcell tvcell--" + cls);
    var wrap = VA.el("div", "tvcell__chipswrap");
    cell.appendChild(wrap);
    return { cell: cell, wrap: wrap };
  }

  function nodeRow(row, index, chainNodes, marking, ctx) {
    var node = index.nodes[row.id];
    var el = baseRow("node", ctx, row.id);
    if (row.branch) el.className += " tvrow--branch";
    if (marking) el.className += chainNodes[row.id] ? " tvrow--on" : " tvrow--off";
    if (isSelected(ctx, "node", row.id)) el.className += " tvrow--selected";

    el.appendChild(VA.el("td", "tvcell tvcell--ord", row.branch ? "⑂" : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--name",
      node ? node.name : missing(row.id)));
    el.appendChild(VA.el("td", "tvcell tvcell--part",
      node ? node.parts.join(" ⇔ ") : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--nominal num", ""));
    el.appendChild(VA.el("td", "tvcell tvcell--min num", ""));
    el.appendChild(VA.el("td", "tvcell tvcell--max num", ""));
    el.appendChild(VA.el("td", "tvcell tvcell--contribution", ""));
    var chips = chipsCell("chips");
    if (node) {
      chips.wrap.appendChild(VA.chip("chip--kind", node.kind,
        node.kind === "mating_surface"
          ? "two parts meet here, and `parts` names both"
          : "a located feature on one part that nothing mates to — what lets a " +
            "chain end somewhere that is not a mate"));
      if (row.branch) {
        chips.wrap.appendChild(VA.chip("chip--branch", "BRANCH",
          "three or more edges meet here, so a study must choose. This tool " +
          "reports the fork and never resolves it."));
      }
    }
    el.appendChild(chips.cell);
    return el;
  }

  function edgeRow(row, index, chain, marking, ctx) {
    var edge = index.edges[row.id];
    var hit = chain[row.id];
    var el = baseRow("edge", ctx, row.id);
    if (edge) el.className += " " + VA.confidenceClass(edge.confidence);
    if (edge && edge.kind === "gap") el.className += " tvrow--gap";
    if (edge && edge.value_source === "derived") el.className += " tvrow--derived";
    if (edge && edge.zero_width) el.className += " tvrow--zero-width";
    if (marking) el.className += hit ? " tvrow--on" : " tvrow--off";
    if (row.closes_row !== null && row.closes_row !== undefined) {
      el.className += " tvrow--closes";
    }
    if (isSelected(ctx, "edge", row.id)) el.className += " tvrow--selected";

    el.appendChild(VA.el("td", "tvcell tvcell--ord", hit ? String(hit.ordinal) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--name",
      edge ? edge.name : missing(row.id)));
    el.appendChild(VA.el("td", "tvcell tvcell--part",
      edge ? (edge.part || "— across a clearance —") : ""));

    // The value cell, decomposed into three (deliverable 2): the old combined
    // "value  [min … max]" text read fine but pasted as one unsplittable cell.
    // Each number is still printed AS TRANSCRIBED (VA.fmt: no toFixed, no band
    // derived from the limits) — splitting the cell changes nothing about what
    // is printed, only how many columns it occupies.
    var dimension = edge && edge.dimension;
    el.appendChild(VA.el("td", "tvcell tvcell--nominal num",
      dimension ? VA.fmt(dimension.nominal) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--min num",
      dimension ? VA.fmt(dimension.min) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--max num",
      dimension ? VA.fmt(dimension.max) : ""));

    var contribution = VA.el("td", "tvcell tvcell--contribution num");
    if (hit) {
      contribution.appendChild(VA.el("span", "tvrow__weight",
        VA.contributionWeightText(hit.contribution)));
      contribution.appendChild(VA.el("span", null,
        VA.fmt(hit.contribution.min) + " … " + VA.fmt(hit.contribution.max) +
        " " + hit.contribution.units));
      contribution.setAttribute("title",
        "this edge's own signed, scaled contribution, computed by " +
        "tolerance_stack.topology and folded at that value. The sign comes from " +
        "the direction the chain crossed the edge; the weight is the transform's " +
        "ratio.");
    }
    el.appendChild(contribution);

    var chips = chipsCell("chips");
    if (edge) {
      chips.wrap.appendChild(VA.chip(VA.confidenceClass(edge.confidence),
        edge.confidence === null ? "no value"
          : (VA.CONFIDENCE_LABEL[edge.confidence] || edge.confidence)));
      if (edge.kind === "gap") {
        chips.wrap.appendChild(VA.chip("chip--gap", "gap",
          "its two interfaces share no part — a real distance across a clearance"));
      }
      if (edge.value_source === "derived") {
        chips.wrap.appendChild(VA.chip("chip--derived", "DERIVED",
          VA.VALUE_SOURCES.derived.title));
      }
      if (edge.zero_width) {
        chips.wrap.appendChild(VA.chip("chip--zero-width", "zero-width band",
          "min == max: every interval this feeds is a LOWER bound on the real spread."));
      }
      if (edge.transform && edge.transform.kind !== "identity") {
        chips.wrap.appendChild(VA.chip("chip--transform", edge.transform.kind,
          "this edge carries a non-identity DEFAULT transform: " +
          VA.transformText(edge.transform)));
      }
      // The thumbnail (deliverable 1): only where a crop index actually covers
      // this edge. An edge authored inline in the topology, or a derived gap,
      // has no crop index to check — see cropSection in the detail pane below,
      // which states the reason in full; a "no crop" button here for those
      // would read as a stale index rather than what it is.
      var trigger = edgeCropTrigger(edge, ctx);
      if (trigger) chips.wrap.appendChild(trigger);
    }
    el.appendChild(chips.cell);
    return el;
  }

  // The hover/click thumbnail trigger, the same vocabulary and the same crop
  // plumbing views/stack.js's cropTrigger uses (VA.cropFor, VA.cropProvenanceLine):
  // an edge that re-expresses a committed stack element IS that element, crop
  // and all, so there is one crop-trigger button shape in the repo, not two.
  function edgeCropTrigger(edge, ctx) {
    if (!edge.crop_key) return null;
    var entry = VA.cropFor(ctx.crops, edge.crop_key.stack, edge.crop_key.element);
    var resolved = entry.status === "resolved";
    var node = VA.el("button",
      "crop-trigger crop-trigger--" + entry.status,
      resolved ? "drawing crop" : "no crop — " + entry.status);
    node.setAttribute("title", resolved ? VA.cropProvenanceLine(entry) : (entry.reason || ""));
    node.cropEntry = entry;
    var show = function () { if (ctx.onCropShow) ctx.onCropShow(entry, node); };
    node.onclick = show;
    node.onmouseenter = show;
    node.onfocus = show;
    return node;
  }

  function isSelected(ctx, kind, id) {
    return !!(ctx.selection && ctx.selection.kind === kind && ctx.selection.id === id);
  }

  function missing(id) {
    return id + " — the layout names an id the topology does not declare";
  }

  // --- the totals footer ---------------------------------------------------

  VA.renderTopoTotals = function (root, topoProj, study, index) {
    VA.clear(root);
    root.className = "tvtotals";
    if (!study) {
      root.appendChild(VA.el("p", "muted",
        "Pick a study to see a path highlighted on the rails and its totals here. " +
        "A study is a HUMAN-lassoed chain: this page reports where the forks are " +
        "and never chooses one."));
      return root;
    }

    var head = VA.el("div", "tvtotals__head");
    head.appendChild(VA.el("h3", null, study.title));
    head.appendChild(VA.el("code", "muted", study.id));
    root.appendChild(head);
    root.appendChild(VA.el("div", "muted",
      study.from + "  →  " + study.to +
      (study.closes ? "   ·   closes the derived gap `" + study.closes + "`" : "")));

    if (study.status !== "ok") {
      root.appendChild(errorBlock(study));
      return root;
    }

    var worst = VA.studyWorstConfidence(study, index);
    var chips = VA.el("div", "tvtotals__chips");
    chips.appendChild(VA.chip("chip--kind",
      study.result.chain.length + " contributions"));
    chips.appendChild(VA.chip("chip--kind", study.result.units));
    if (worst) {
      chips.appendChild(VA.chip(VA.confidenceClass(worst),
        "weakest input: " + (VA.CONFIDENCE_LABEL[worst] || worst),
        "weakest wins: a study fed by nine traced edges and one untraced one is " +
        "an untraced result"));
    }
    root.appendChild(chips);

    var table = VA.el("div", "tvtotals__grid");
    VA.studyTotals(study).forEach(function (total) {
      var cell = VA.el("div", "tvtotal tvtotal--" + total.key);
      cell.appendChild(VA.el("div", "tvtotal__label", total.label));
      cell.appendChild(VA.el("div", "tvtotal__value num",
        total.value + " " + total.units));
      table.appendChild(cell);
    });
    root.appendChild(table);
    root.appendChild(VA.el("p", "muted tvtotals__rule",
      "Every number above came out of tolerance_stack.topology.summarize() → " +
      "fold(), the repo's single arithmetic path, and was rounded in Python. " +
      "This page adds nothing up."));
    (study.notes || []).forEach(function (note) {
      root.appendChild(VA.el("p", "tvtotals__note", note));
    });
    return root;
  };

  // A study that raises is a RESULT. The message is the exception's own, written
  // for a human author; the headline and the advice come from VA.STUDY_ERRORS.
  function errorBlock(study) {
    var known = VA.STUDY_ERRORS[study.error.type];
    var box = VA.el("div", "tverror");
    box.appendChild(VA.el("div", "tverror__head",
      known ? known.headline : "This study does not sum"));
    box.appendChild(VA.el("code", "tverror__type", study.error.type));
    box.appendChild(VA.el("p", "tverror__message", study.error.message));
    box.appendChild(VA.el("p", "tverror__advice",
      known ? known.advice : VA.unlabelledStudyErrorText(study.error.type)));
    return box;
  }

  // --- the preview pane ----------------------------------------------------

  VA.renderTopoDetail = function (root, ctx) {
    VA.clear(root);
    root.className = "detail";
    var selection = ctx.selection;
    if (!selection) {
      root.appendChild(VA.el("p", "muted",
        "Click a dot or a row to see it here: the interface it is, or the " +
        "dimension it carries — its value as transcribed, its citation, and the " +
        "drawing crop behind that citation where there is one."));
      return root;
    }
    var index = VA.topologyIndex(ctx.topoProj);
    if (selection.kind === "node") {
      renderNodeDetail(root, index.nodes[selection.id], selection.id, ctx);
    } else {
      renderEdgeDetail(root, index.edges[selection.id], selection.id, ctx);
    }
    return root;
  };

  function renderNodeDetail(root, node, id, ctx) {
    if (!node) {
      root.appendChild(VA.el("p", "muted", missing(id)));
      return;
    }
    var head = VA.el("div", "detail__head");
    head.appendChild(VA.el("h3", null, node.name));
    head.appendChild(VA.el("code", "muted", node.id));
    root.appendChild(head);

    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.chip("chip--kind", node.kind));
    chips.appendChild(VA.chip("chip--kind", node.degree + " edge(s)"));
    if (node.branch) {
      chips.appendChild(VA.chip("chip--branch", "BRANCH POINT",
        "a study reaching this node with two unconsumed selected edges raises " +
        "BranchAmbiguity, naming both. Which path binds is a mechanics question " +
        "this tool does not answer."));
    }
    root.appendChild(chips);

    root.appendChild(VA.el("div", "detail__where",
      "on " + node.parts.join(" ⇔ ")));
    if (node.note) root.appendChild(VA.el("div", "detail__note", node.note));

    if (node.source_ref) {
      root.appendChild(citation(node.source_ref, node.confidence));
    }
    root.appendChild(VA.el("p", "detail__crop-reason",
      "An interface is a location, not a value — there is no dimension and no " +
      "crop behind it. The dimensions are the edges either side of this row."));
  }

  function renderEdgeDetail(root, edge, id, ctx) {
    if (!edge) {
      root.appendChild(VA.el("p", "muted", missing(id)));
      return;
    }
    var head = VA.el("div", "detail__head");
    head.appendChild(VA.el("h3", null, edge.name));
    head.appendChild(VA.el("code", "muted", edge.id));
    root.appendChild(head);

    var source = VA.VALUE_SOURCES[edge.value_source];
    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(edge.confidence),
      edge.confidence === null ? "no value"
        : (VA.CONFIDENCE_LABEL[edge.confidence] || edge.confidence)));
    chips.appendChild(VA.chip("chip--kind", edge.kind));
    chips.appendChild(source
      ? VA.chip("chip--source", source.label, source.title)
      : VA.chip("chip--unlabelled", edge.value_source,
                VA.valueSourceText(edge.value_source)));
    if (edge.zero_width) {
      chips.appendChild(VA.chip("chip--zero-width", "zero-width band",
        "min == max: every interval this feeds is a LOWER bound on the real spread."));
    }
    root.appendChild(chips);

    root.appendChild(VA.el("div", "detail__where",
      (edge.part ? "a dimension of " + edge.part : "across a clearance") +
      "  ·  " + edge.from + " → " + edge.to));

    if (edge.dimension) {
      var values = VA.el("div", "detail__values");
      row(values, "nominal", VA.fmt(edge.dimension.nominal));
      row(values, "min … max",
        VA.fmt(edge.dimension.min) + " … " + VA.fmt(edge.dimension.max));
      if (edge.dimension.plus_minus !== null &&
          edge.dimension.plus_minus !== undefined) {
        row(values, "as authored", VA.fmtPlusMinus(edge.dimension.plus_minus));
      }
      if (edge.dimension.role) row(values, "role", edge.dimension.role);
      if (edge.dimension.hardware_ref) {
        row(values, "hardware", edge.dimension.hardware_ref);
      }
      root.appendChild(values);
    }

    root.appendChild(VA.el("div", "detail__transform",
      "default transform: " + VA.transformText(edge.transform)));

    var hit = VA.chainIndex(ctx.study)[edge.id];
    if (hit) root.appendChild(contributionBlock(hit, ctx.study));

    if (edge.note) root.appendChild(VA.el("div", "detail__note", edge.note));

    var dimension = edge.dimension;
    if (dimension && dimension.source_ref) {
      root.appendChild(citation(dimension.source_ref, edge.confidence));
      var provenance = VA.exportProvenance(dimension.source_ref, null);
      if (provenance) root.appendChild(exportBlock(provenance));
    } else if (dimension) {
      root.appendChild(VA.el("div", "el-export el-export--none el-export--loud",
        "This dimension carries no source_ref at all — nothing says where the " +
        "number came from."));
    }

    root.appendChild(cropSection(edge, ctx));
  }

  function row(box, label, value) {
    var line = VA.el("div", "detail__valrow");
    line.appendChild(VA.el("span", "detail__vallabel", label));
    line.appendChild(VA.el("span", "detail__valnum num", value));
    box.appendChild(line);
  }

  function contributionBlock(hit, study) {
    var c = hit.contribution;
    var box = VA.el("div", "detail__contribution");
    box.appendChild(VA.el("h4", null,
      "In this study — contribution #" + hit.ordinal));
    row(box, "crossed", c.from + " → " + c.to);
    row(box, "sign", c.sign < 0 ? "− (against the edge's orientation)"
      : "+ (with the edge's orientation)");
    row(box, "transform", c.transform + "  ×" + VA.fmt(c.ratio));
    row(box, "weight", VA.fmt(c.weight));
    row(box, "contributes",
      VA.fmt(c.min) + " … " + VA.fmt(c.max) + " " + c.units);
    box.appendChild(VA.el("p", "muted",
      "No sign is authored anywhere: it is read off the direction the chain " +
      "crossed this edge. " + (study && study.transforms[c.edge]
        ? "This study OVERRIDES the edge's default transform with `" +
          study.transforms[c.edge] + "`."
        : "The edge's own default transform applied.")));
    return box;
  }

  function citation(sourceRef, confidence) {
    var box = VA.el("div", "detail__citation");
    box.appendChild(VA.el("div", "detail__where", VA.citationWhere(sourceRef)));
    if (sourceRef.callout) {
      box.appendChild(VA.el("div", "detail__callout", sourceRef.callout));
    }
    if (sourceRef.note) {
      box.appendChild(VA.el("div", "detail__note", sourceRef.note));
    }
    if (confidence === "untraced") {
      box.appendChild(VA.el("div", "detail__untraced",
        "No document backs this number."));
    }
    return box;
  }

  function exportBlock(p) {
    var box = VA.el("div", "el-export el-export--" + p.state +
      (p.loud ? " el-export--loud" : ""));
    box.appendChild(VA.el("div", "el-export__head", p.headline));
    if (p.why) box.appendChild(VA.el("div", "el-export__why", p.why));
    if (p.detail) box.appendChild(VA.el("div", "el-export__detail", p.detail));
    if (p.shaText) box.appendChild(VA.el("div", "el-export__facts", p.shaText));
    if (p.pdf) box.appendChild(VA.el("div", "el-export__path", p.pdf));
    if (p.note) box.appendChild(VA.clampedNote("el-export__note", p.note));
    return box;
  }

  // The preview image. An edge that re-expresses a stack element IS that
  // element, crop and all — `crop_key` is the (stack, element) pair the crop
  // index is keyed by, so this reuses the stack viewer's plumbing untouched. An
  // edge with no key is not a stale index and must not read like one: it is a
  // dimension authored in the topology, or the derived gap a study computes, and
  // it says which.
  function cropSection(edge, ctx) {
    var box = VA.el("div", "detail__crop");
    box.appendChild(VA.el("h4", null, "Drawing crop"));
    if (!edge.crop_key) {
      box.className = "detail__crop detail__crop--no-key";
      var source = VA.VALUE_SOURCES[edge.value_source];
      box.appendChild(VA.el("div", "detail__crop-reason",
        (source ? source.title : VA.valueSourceText(edge.value_source)) +
        " No crop index covers it — that is the state of the documents, not a " +
        "stale projection."));
      var ref = edge.dimension && edge.dimension.source_ref;
      if (ref && ref.kind === "assumed") {
        box.appendChild(VA.el("div", "detail__crop-reason",
          "Its citation is kind `assumed`: there is no document behind it to crop."));
      }
      return box;
    }
    var entry = VA.cropFor(ctx.crops, edge.crop_key.stack, edge.crop_key.element);
    box.className = "detail__crop detail__crop--" + entry.status;
    box.appendChild(VA.el("div", "muted",
      "from stack `" + edge.crop_key.stack + "`, element `" +
      edge.crop_key.element + "`"));
    if (entry.status !== "resolved") {
      box.appendChild(VA.el("div", "detail__crop-reason", entry.reason || entry.status));
      return box;
    }
    if (ctx.detailImage && ctx.detailImage.url) {
      var img = VA.el("img", "detail__crop-img");
      img.setAttribute("src", ctx.detailImage.url);
      img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
      if (entry.width && entry.height) {
        img.style.aspectRatio = entry.width + " / " + entry.height;
      }
      box.appendChild(img);
    } else {
      box.appendChild(VA.el("div", "detail__crop-reason",
        "crops.json points at " + entry.png + ", which is not on disk — the crop " +
        "index is stale; re-run the crop script"));
    }
    box.appendChild(VA.el("div", "detail__crop-head",
      entry.pdf_name + " · sheet " + entry.page));
    box.appendChild(VA.el("div", "detail__crop-prov", VA.cropProvenanceLine(entry)));
    box.appendChild(VA.el("div", "detail__crop-path", entry.pdf));
    return box;
  }
})(window.ViewerApp = window.ViewerApp || {});
