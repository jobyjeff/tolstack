// The three panes of the topology page: the rails (SVG), the grid, and the
// preview. They are one view file because they are one correspondence
// contract (viewer_leader_line_grid, 2026-09-10): the DAG's marks sit at
// `VA.railY(layout row)`, the grid holds one row per EDGE at an inline height
// of `VA.RAIL_METRICS.rowHeight`, and the jogged leader lines between them
// are drawn from the SAME two numbers (VA.leaderGeometry), so a leader's two
// ends land on its node's dot and its grid seam by construction. Splitting
// these across files is how that stops being one set of numbers.
//
// Nothing here computes a tolerance. The rail columns come out of the
// projection, the folded numbers come out of the projection, and this file turns
// row indices into pixels.
(function (VA) {
  "use strict";

  var M = VA.RAIL_METRICS;

  // --- the toolbar: display preferences, not selection ----------------------
  //
  // The TOPOLOGY/STUDY <select> pickers retired into the nav tree
  // (views/nav.js, viewer_v2_single_nav 2026-09-08) — selecting WHICH node is
  // on screen is the nav's job now. What is left here is how it is drawn:
  // whole-topology vs. study-chain layout, row density, and the annotate
  // link. Topology mode only; topology_app.js hides this strip in stack mode.
  VA.renderTopoToolbar = function (root, state, topoProj, handlers) {
    VA.clear(root);
    root.className = "tv__toolbar";

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

    // Experimental (default OFF, deliverable 4 of
    // viewer_error_surface_and_layout): a spreadsheet lists only the
    // dimensions BETWEEN interfaces, never the interfaces themselves, which is
    // why this page's row count runs ~2x a typical Excel stack's — half the
    // rows (the nodes) carry no values by construction. An edge's own label is
    // just the concatenation of its two adjacent node labels, so this toggle
    // drops it and lets the freed width carry values instead; the description
    // moves to hover (VA.edgeHoverTitle, shared with the rail bar's own
    // hover -- one hover surface, not two).
    var edgeMode = VA.el("button", "ghost tvpick__mode",
      state.edgeValueOnly ? "Rows: values only" : "Rows: labelled");
    edgeMode.setAttribute("id", "edge-value-toggle");
    edgeMode.setAttribute("title",
      "Experimental. Hides an edge row's own label (its two adjacent node " +
      "labels concatenated) so the row reads as values only; hover an edge " +
      "row to see its label. Node rows are unchanged.");
    edgeMode.onclick = handlers.onEdgeValueOnly;
    root.appendChild(edgeMode);

    // One link, nothing more (annotation_surface_mvp, 2026-09-06): the
    // topology page never computes or writes anything for the annotate app,
    // it only points at it. Only rendered once a real study is selected --
    // "annotate this" means nothing about the whole topology, only about one
    // human-lassoed chain's elements.
    if (state.studyId) {
      var annotateLink = VA.el("a", "ghost tvpick__mode", "Annotate →");
      annotateLink.href = VA.annotateLink({ topologyId: state.topologyId, studyId: state.studyId });
      annotateLink.title = "Open this study in the annotation surface (apps/annotate) to bind its " +
        "elements to geometry -- select + tag, no measurement.";
      root.appendChild(annotateLink);
    }
    return root;
  };

  function studyOk(topoProj, studyId) {
    var study = VA.findStudy(topoProj, studyId);
    return !!(study && study.status === "ok");
  }

  // --- the joint -------------------------------------------------------------
  //
  // Deliverable 4 (viewer_v2_single_nav, 2026-09-08): `topoProj.joint` is the
  // same free-form assembly/context shape a stack's own joint block is
  // (build_topology_projection.py's project_topology, topology_schema_v1) --
  // `{}` when the topology spans more than one physical joint, as
  // `pitch_system` does. One renderer for both (views/stack.js's
  // VA.jointBlock), so a field added there is never a second place to teach
  // this one. A property of the WHOLE topology, not of whichever study is
  // selected, so it renders whenever a topology is open, study or no study.
  VA.renderTopoJoint = function (root, topoProj) {
    VA.clear(root);
    if (!topoProj) return root;
    root.appendChild(VA.jointBlock(topoProj.joint));
    return root;
  };

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
    // The merged-row grid and the leaders come off ONE plan of the same
    // serialisation the rails were drawn from (viewer_leader_line_grid,
    // 2026-09-10): the grid holds only the edge rows, grouped into components,
    // and each non-internal node bridges the two with a jogged leader line.
    var plan = VA.gridPlan(layout, topoProj);
    var leaderGeo = VA.leaderGeometry(layout, plan, M);
    var index = VA.topologyIndex(topoProj);
    var chain = VA.chainIndex(study);
    var chainNodes = VA.chainNodes(study);
    var marking = !!(study && study.status === "ok");

    // The header and the body share ONE horizontal scrollport
    // (`.tv__hscroll`, topology.css) so a wide grid's columns and the rail
    // that stays pinned at its left edge (`.tv__rails`'s own `position:
    // sticky; left: 0`) both move together when scrolled sideways — full-
    // page-scroll (viewer_error_surface_and_layout, 2026-09-09) retired
    // `.tv__scroll`'s own VERTICAL clipping, not this pane's pre-existing
    // horizontal one; without a scrolling ancestor of its own, the sticky
    // rail has nothing to stick within, and a wide row simply bleeds into
    // whatever sits to the pane's right.
    var hscroll = VA.el("div", "tv__hscroll");
    hscroll.appendChild(header(leaderGeo.width));
    var body = VA.el("div", "tv__body");
    body.appendChild(railsSvg(geometry, leaderGeo, index, chain, chainNodes, marking, ctx));
    body.appendChild(grid(plan, index, chain, marking, ctx));
    hscroll.appendChild(body);
    root.appendChild(hscroll);
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
  //
  // `component` is the merged column (viewer_leader_line_grid): one cell per
  // contiguous same-part run, spanning its tolerance sub-rows via rowspan. It
  // replaced the per-row "part / interface" column — the part is said once per
  // group now, and the interfaces left the grid for the leaders. `crop` is the
  // thumbnail column: the actual crop image where one is resolved and fetched,
  // the same trigger button otherwise, and NOTHING where no crop index covers
  // the edge — an image placeholder would read as "not built yet" when the
  // truth is "no document to crop".
  var COLUMNS = [
    { cls: "component", label: "component", width: 150 },
    { cls: "ord", label: "#", width: 38 },
    { cls: "name", label: "element", width: 220 },
    { cls: "nominal", label: "nominal", width: 80 },
    { cls: "min", label: "min", width: 80 },
    { cls: "max", label: "max", width: 80 },
    { cls: "contribution", label: "contribution", width: 200 },
    { cls: "chips", label: "sourcing", width: 200 },
    { cls: "crop", label: "crop", width: 110 },
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

  function railsSvg(geometry, leaderGeo, index, chain, chainNodes, marking, ctx) {
    // The SVG spans the rails AND the leader jog zone: its right edge is the
    // grid table's left edge, so a leader's final horizontal segment hands off
    // to its row's boundary with no seam to keep aligned.
    var width = leaderGeo.width;
    var svg = VA.svg("svg", "tv__rails", {
      width: width,
      height: geometry.height,
      viewBox: "0 0 " + width + " " + geometry.height,
    });
    svg.style.minWidth = width + "px";
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

    // 2b. the leaders (viewer_leader_line_grid): one jogged line per
    //     NON-internal node, from its dot to the seam between the two grid
    //     rows it separates. An internal node — every adjacent edge on one
    //     part — gets none, and that omission is what makes the component
    //     grouping visible: leaders appear only at part boundaries. The
    //     visible path is thin; a wider invisible twin (`rail__leaderhit`,
    //     same shape as the edge bars' own hit path) carries the hover title,
    //     the click and the addressable data attributes.
    leaderGeo.leaders.forEach(function (leader) {
      var node = index.nodes[leader.id];
      var classes = ["rail__leader"];
      if (marking) {
        classes.push(chainNodes[leader.id] ? "rail__leader--on" : "rail__leader--off");
      }
      if (isSelected(ctx, "node", leader.id)) classes.push("rail__leader--selected");
      svg.appendChild(VA.svg("path", classes.join(" "), { d: leader.d }));
      var hit = VA.svg("path", "rail__leaderhit", { d: leader.d });
      hit.setAttribute("data-leader-id", leader.id);
      hit.setAttribute("data-boundary-edge", leader.beforeEdge || "");
      hit.appendChild(svgTitle(node ? node.name : leader.id));
      hit.setAttribute("tabindex", "0");
      hit.onclick = function () { ctx.onSelect("node", leader.id); };
      svg.appendChild(hit);
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
        var y1 = mark.y - M.rowHeight / 2 + 1;
        var y2 = mark.y + M.rowHeight / 2 - 1;
        var bar = VA.svg("line", classes.join(" "), {
          x1: mark.x, y1: y1, x2: mark.x, y2: y2,
        });
        svg.appendChild(bar);

        // The hover/click target, over the SAME length but solid and wide
        // (deliverable 3, viewer_error_surface_and_layout): a gap/derived
        // bar's own stroke is DASHED (rail__bar--gap/--derived), so its hit
        // area under `pointer-events: stroke` has real gaps in it -- hovering
        // a dash's own OFF interval hits nothing. This carries the hover
        // title and the click handler instead, so the entire drawn length
        // responds regardless of the visible dash pattern; the visible bar
        // above is untouched, still thin and still dashed where confidence
        // or value_source says it should be.
        var hit = VA.svg("line", "rail__barhit", { x1: mark.x, y1: y1, x2: mark.x, y2: y2 });
        hit.appendChild(svgTitle(VA.edgeHoverTitle(edge, mark.id)));
        wire(hit, ctx, "edge", mark.id);
        svg.appendChild(hit);
        return;
      }
      var node = index.nodes[mark.id];
      var dotClasses = ["rail__dot"];
      if (mark.branch) dotClasses.push("rail__dot--branch");
      if (node && node.kind === "datum_feature") dotClasses.push("rail__dot--datum");
      if (marking) dotClasses.push(chainNodes[mark.id] ? "rail__dot--on" : "rail__dot--off");
      // The grid has no node rows to wear the selection outline any more
      // (viewer_leader_line_grid), so the dot itself marks a selected node.
      if (isSelected(ctx, "node", mark.id)) dotClasses.push("rail__dot--selected");
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

  // One row per EDGE, walk order, merged into component groups
  // (viewer_leader_line_grid): the leftmost cell of a group's first row spans
  // the whole group via rowspan, so a component is said once and its
  // tolerance sub-rows read as one block. Node rows are gone — an interface
  // is its dot and (at a part boundary) its leader, both clickable.
  function grid(plan, index, chain, marking, ctx) {
    var box = VA.el("div", "tv__rows");
    var table = VA.el("table", "tvtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tbody = VA.el("tbody");
    plan.groups.forEach(function (group) {
      for (var i = 0; i < group.count; i++) {
        var planRow = plan.rows[group.start + i];
        tbody.appendChild(edgeRow(planRow, i === 0 ? group : null, index, chain,
          marking, ctx));
      }
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

  // The merged component cell: one per group, spanning the group's sub-rows.
  // The part id as text (the prose name and drawing ride on the hover title —
  // the later hover-cards handoff owns anything richer), or the gap wording
  // for a clearance. Clicking it selects nothing: it is a grouping, not a row.
  function componentCell(group) {
    var cell = VA.el("td", "tvcell tvcell--component", group.label);
    if (group.count > 1) cell.setAttribute("rowspan", String(group.count));
    if (group.title) cell.setAttribute("title", group.title);
    cell.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
    };
    return cell;
  }

  function edgeRow(planRow, group, index, chain, marking, ctx) {
    var edge = index.edges[planRow.id];
    var hit = chain[planRow.id];
    var el = baseRow("edge", ctx, planRow.id);
    if (group) el.className += " tvrow--group-start";
    if (edge) el.className += " " + VA.confidenceClass(edge.confidence);
    if (edge && edge.kind === "gap") el.className += " tvrow--gap";
    if (edge && edge.value_source === "derived") el.className += " tvrow--derived";
    if (edge && edge.zero_width) el.className += " tvrow--zero-width";
    if (marking) el.className += hit ? " tvrow--on" : " tvrow--off";
    if (planRow.closes) el.className += " tvrow--closes";
    if (isSelected(ctx, "edge", planRow.id)) el.className += " tvrow--selected";

    if (group) el.appendChild(componentCell(group));

    // Experimental value-only mode (deliverable 4): an edge's own label is
    // just its two adjacent node labels concatenated, so hiding it is never a
    // loss of information -- only of a redundant column. The label moves to
    // hover instead (the row's native `title`, the same "one hover surface"
    // the rail bar's own hit path (above) already carries), never dropped
    // outright. An edge the projection cannot resolve (missing()) still
    // states its own diagnostic regardless of mode -- that text is never
    // redundant and must not be hidden.
    var valueOnly = !!(ctx.edgeValueOnly && edge);
    if (valueOnly) el.setAttribute("title", VA.edgeHoverTitle(edge, planRow.id));
    el.appendChild(VA.el("td", "tvcell tvcell--ord", hit ? String(hit.ordinal) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--name",
      valueOnly ? "" : (edge ? edge.name : missing(planRow.id))));

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
    }
    el.appendChild(chips.cell);
    el.appendChild(edgeCropCell(edge, ctx));
    return el;
  }

  // The thumbnail cell (viewer_leader_line_grid): only where a crop index
  // actually covers this edge. An edge authored inline in the topology, or a
  // derived gap, has no crop index to check — see cropSection in the detail
  // pane below, which states the reason in full; a "no crop" button here for
  // those would read as a stale index rather than what it is. When the crop is
  // resolved AND its PNG has been fetched (ctx.cropImages, topology_app.js's
  // cache), the trigger IS the thumbnail — the actual crop of the tolerance
  // annotation, inline on the row; until then, or for a crop that cannot
  // resolve, it stays the same text button, never a placeholder image. Either
  // way it is the same vocabulary and the same crop plumbing views/stack.js's
  // cropTrigger uses (VA.cropFor, VA.cropProvenanceLine): an edge that
  // re-expresses a committed stack element IS that element, crop and all, so
  // there is one crop-trigger shape in the repo, not two — and the hover/click
  // popover behaviour is exactly the existing one (rich hover cards belong to
  // the later viewer_hover_cards_and_deep_links handoff).
  function edgeCropCell(edge, ctx) {
    var cell = VA.el("td", "tvcell tvcell--crop");
    // The same clamp wrapper the chips cell uses, for the same reason: a real
    // <tr>'s height is a floor, not a cap, and a text trigger one pixel taller
    // than compact's 16px pitch would grow the row off its leader's seam —
    // exactly the drift the browser tier's correspondence check measures.
    var wrap = VA.el("div", "tvcell__cropwrap");
    cell.appendChild(wrap);
    if (!edge || !edge.crop_key) return cell;
    var entry = VA.cropFor(ctx.crops, edge.crop_key.stack, edge.crop_key.element);
    var resolved = entry.status === "resolved";
    var image = resolved && ctx.cropImages ? ctx.cropImages[entry.png] : null;
    var node = VA.el("button", "crop-trigger crop-trigger--" + entry.status +
      (image && image.url ? " crop-trigger--thumb" : ""));
    if (image && image.url) {
      var img = VA.el("img", "tvthumb");
      img.setAttribute("src", image.url);
      img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
      node.appendChild(img);
    } else {
      node.textContent = resolved ? "drawing crop" : "no crop — " + entry.status;
    }
    node.setAttribute("title", resolved ? VA.cropProvenanceLine(entry) : (entry.reason || ""));
    node.cropEntry = entry;
    var show = function () { if (ctx.onCropShow) ctx.onCropShow(entry, node); };
    node.onclick = show;
    node.onmouseenter = show;
    node.onfocus = show;
    wrap.appendChild(node);
    return cell;
  }

  function isSelected(ctx, kind, id) {
    return !!(ctx.selection && ctx.selection.kind === kind && ctx.selection.id === id);
  }

  function missing(id) {
    return id + " — the layout names an id the topology does not declare";
  }

  // --- the totals footer ---------------------------------------------------

  // A slim, always-visible footer strip (deliverable 2, viewer_v2_single_nav
  // 2026-09-08): the same folded numbers the old 260px panel showed, as chips
  // in one horizontally-scrolling row rather than a wrapping grid of boxes —
  // the DAG pane above it is what this page is for, and a study's own `notes`
  // used to be able to push that panel to its full 260px cap. The rule
  // sentence and any notes still exist, behind a same-line "Details" toggle,
  // so nothing is dropped — only what is ALWAYS on screen shrinks.
  //
  // NOT here: a study's own authored `checks` (verdict vs. criterion) —
  // deliverable 4's third piece, and the one this page cannot wire yet.
  // `topoProj.joint` and `topoProj.worksheet_file` (project_topology,
  // topology_schema_v1) reach the page above (renderTopoJoint) and through
  // topology_app.js's worksheet toggle; a study's own `checks` never reaches
  // the projection at all — `project_study()` has no `checks` key, tracked in
  // `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`. This
  // strip prints totals, never a verdict, until that field exists.
  VA.renderTopoTotals = function (root, topoProj, study, index) {
    VA.clear(root);
    root.className = "tvtotals";
    if (!study) {
      root.appendChild(VA.el("p", "muted tvtotals__empty",
        "Pick a study to see a path highlighted on the rails and its totals here. " +
        "A study is a HUMAN-lassoed chain: this page reports where the forks are " +
        "and never chooses one."));
      return root;
    }

    var strip = VA.el("div", "tvtotals__strip");
    strip.appendChild(VA.el("span", "tvtotals__title", study.title));
    strip.appendChild(VA.el("code", "muted", study.id));
    strip.appendChild(VA.el("span", "muted tvtotals__span",
      study.from + " → " + study.to +
      (study.closes ? "  ·  closes `" + study.closes + "`" : "")));

    if (study.status !== "ok") {
      root.appendChild(strip);
      root.appendChild(errorBlock(study));
      return root;
    }

    var worst = VA.studyWorstConfidence(study, index);
    strip.appendChild(VA.chip("chip--kind", study.result.chain.length + " contributions"));
    strip.appendChild(VA.chip("chip--kind", study.result.units));
    if (worst) {
      strip.appendChild(VA.chip(VA.confidenceClass(worst),
        "weakest input: " + (VA.CONFIDENCE_LABEL[worst] || worst),
        "weakest wins: a study fed by nine traced edges and one untraced one is " +
        "an untraced result"));
    }
    VA.studyTotals(study).forEach(function (total) {
      strip.appendChild(VA.chip("chip--total",
        total.label + " " + total.value + " " + total.units));
    });
    root.appendChild(strip);

    var more = VA.el("details", "tvtotals__more");
    more.appendChild(VA.el("summary", null, "Details"));
    more.appendChild(VA.el("p", "muted tvtotals__rule",
      "Every number above came out of tolerance_stack.topology.summarize() → " +
      "fold(), the repo's single arithmetic path, and was rounded in Python. " +
      "This page adds nothing up."));
    (study.notes || []).forEach(function (note) {
      more.appendChild(VA.el("p", "tvtotals__note", note));
    });
    root.appendChild(more);
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

    // Whether this interface got a leader line, and why (viewer_leader_line_
    // grid): the omission rule is the component grouping, so the pane says
    // which side of it this node is on rather than leaving a missing leader
    // to read as a rendering gap.
    var adjacentParts = VA.nodeAdjacentParts(ctx.topoProj)[id] || [];
    var partWords = adjacentParts.map(function (p) {
      return p === null ? "a clearance" : p;
    });
    root.appendChild(VA.el("p", "detail__crop-reason",
      adjacentParts.length <= 1
        ? "An internal interface: every dimension meeting here belongs to " +
          (partWords[0] || "no part") + ", so no leader line is drawn — " +
          "leaders mark component boundaries only."
        : "A component boundary: the dimensions meeting here belong to " +
          partWords.join(" / ") + ", and its leader line marks that seam " +
          "in the grid."));
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

    // Deep link OUT to apps/annotate/ (deliverable 4): only for the two loud
    // gap confidences -- a traced/inferred edge already has a citation, and a
    // binding is identity, never a value source (docs/ANNOTATION_SURFACE.md),
    // so sending a click there for an already-sourced row would offer nothing.
    if (VA.needsAnnotation(edge.confidence)) {
      var annotateBox = VA.el("div", "detail__annotate");
      var annotateLink = VA.el("a", "detail__annotate-link",
        "annotate this" + (edge.part ? " (" + edge.part + ")" : "") + " →");
      annotateLink.setAttribute("href", VA.annotateLink({
        topologyId: ctx.topoProj.id,
        edgeId: edge.id,
        studyId: ctx.study && ctx.study.id,
        part: edge.part,
      }));
      annotateLink.setAttribute("target", "_blank");
      annotateLink.setAttribute("rel", "noopener");
      annotateLink.setAttribute("title",
        "opens apps/annotate/ with this edge selected" +
        (edge.part ? ", isolating " + edge.part + " if its mesh is installed" : "") +
        " -- click the correct surface(s) there to resolve which feature this is");
      annotateBox.appendChild(annotateLink);
      root.appendChild(annotateBox);
    }

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
