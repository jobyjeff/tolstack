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
  // on screen is the nav's job now. What is left here is how the grid and the
  // map are shown: the grid's row density and labels, Fit, the pane's view,
  // the unlit part, the assemblies, the grid's brackets, the palette and the
  // annotate link. Topology mode only; topology_app.js hides this strip in
  // stack mode. Every control acts on the map or the grid: the ones that
  // acted on the rails alone retired with them
  // (the_map_is_the_only_drawing_and_classic_retires, 2026-11-17).
  //
  // There is no "Showing: whole topology / study chain" toggle any more
  // (viewer_respine_whole_walk, 2026-09-15). It offered a SECOND layout of
  // the same document, and Jeff read the difference between the two as a bug
  // rather than a choice: "When you click a study/stack, the entire dag/model
  // should still be visible." The DAG is always the whole walk; a study
  // selection re-arranges it around the study (VA.bandLayout) without taking
  // anything out, so there is one behaviour and nothing for a control to pick.
  VA.renderTopoToolbar = function (root, state, topoProj, handlers) {
    VA.clear(root);
    root.className = "tv__toolbar";

    // Row density: trades reading comfort for seeing more of the grid at once.
    // Comfortable is the default 26px pitch; compact is 16px, which turns the
    // pitch system's 43 rows into ~690px. VA.RAIL_METRICS.rowHeight (and the
    // grid's brackets that follow it) moves with this — see topology.js.
    var densityPreset = VA.ROW_DENSITIES[state.rowDensity] || VA.ROW_DENSITIES.comfortable;
    var density = VA.el("button", "ghost tvpick__mode", "Rows: " + densityPreset.label);
    density.setAttribute("id", "density-toggle");
    density.setAttribute("title",
      "Compact rows fit more of the grid on screen at once, at the cost of " +
      "reading comfort.");
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

    // Fit: the wheel zooms the map and a drag pans it; this one click fits
    // the whole map to its region again (views/map.js's `mapFit`). `0` is its
    // key. Always present -- every model draws a map.
    if (handlers.onFit) {
      var fit = VA.el("button", "ghost tvpick__mode", "Fit");
      fit.setAttribute("id", "dag-fit");
      fit.setAttribute("title", "Fit the whole map to its region. " +
        "Scroll wheel zooms, drag pans.");
      fit.onclick = handlers.onFit;
      root.appendChild(fit);
    }

    // Which of the 3D pane and the DAG the middle shows (VA.PANE_VIEWS), only
    // while the pane is open: with it closed the DAG has the middle anyway.
    if (handlers.onPaneView && handlers.paneOpen) {
      var views = VA.el("span", "tvview");
      views.setAttribute("id", "pane-view");
      views.setAttribute("role", "group");
      views.setAttribute("aria-label", "what the middle shows");
      VA.PANE_VIEW_ORDER.forEach(function (id) {
        var b = VA.el("button", "ghost tvpick__mode", VA.PANE_VIEWS[id].label);
        b.setAttribute("data-view", id);
        b.setAttribute("title", VA.PANE_VIEWS[id].title);
        b.setAttribute("aria-pressed", String(state.paneView === id));
        b.onclick = function () { handlers.onPaneView(id); };
        views.appendChild(b);
      });
      root.appendChild(views);
    }

    // The model outside the page's lit set, dimmed or hidden
    // (VA.UNLIT_STYLES). Only where something IS lit -- a study, or a
    // kinematic page -- since on the whole walk there is nothing outside it.
    if (handlers.onUnlitStyle && (state.mode === "kinematic" || state.studyId)) {
      var unlitPreset = VA.UNLIT_STYLES[state.unlitStyle] ||
        VA.UNLIT_STYLES[VA.DEFAULT_UNLIT_STYLE];
      var unlit = VA.el("button", "ghost tvpick__mode", "Unused: " + unlitPreset.label);
      unlit.setAttribute("id", "unlit-style-toggle");
      unlit.setAttribute("title", unlitPreset.title);
      unlit.onclick = handlers.onUnlitStyle;
      root.appendChild(unlit);
    }

    // The grid's assemblies (a_part_may_contain_parts): fold each to its one
    // rolled-up row, or open them all. Shown only where the model has one.
    if (handlers.onAssemblies && (handlers.assemblies || []).length) {
      [[true, "Collapse assemblies", "assemblies-collapse",
        "Show each assembly as one row: its parts' total, so the stack's total is unchanged."],
       [false, "Expand all", "assemblies-expand", "Show every part of every assembly."]]
        .forEach(function (spec) {
          var b = VA.el("button", "ghost tvpick__mode", spec[1]);
          b.setAttribute("id", spec[2]);
          b.setAttribute("title", spec[3]);
          b.onclick = function () { handlers.onAssemblies(spec[0]); };
          root.appendChild(b);
        });
    }

    // Which of the grid's brackets are drawn: one checkbox per kind
    // (VA.GROUP_KINDS), in a popover under one button. The page hands in the effective set as
    // `handlers.groupKinds` ({kind: bool}); a change is reported per kind and
    // repaints the pane without rebuilding this toolbar, so the popover stays
    // open while the reader ticks through it.
    if (handlers.onGroupKind && topoProj) {
      var kindsOn = handlers.groupKinds || {};
      var menu = VA.el("details", "tvgroups");
      menu.setAttribute("id", "group-kinds");
      var count = function () {
        return VA.GROUP_KINDS.filter(function (k) { return kindsOn[k.id]; }).length;
      };
      var summary = VA.el("summary", "ghost tvpick__mode",
        "Groups (" + count() + " of " + VA.GROUP_KINDS.length + ")");
      summary.setAttribute("id", "group-kinds-toggle");
      menu.appendChild(summary);
      var list = VA.el("div", "tvgroups__menu");
      VA.GROUP_KINDS.forEach(function (kind) {
        var label = VA.el("label", "tvgroups__item");
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!kindsOn[kind.id];
        box.setAttribute("data-kind", kind.id);
        box.onchange = function () {
          kindsOn[kind.id] = box.checked;
          summary.textContent = "Groups (" + count() + " of " + VA.GROUP_KINDS.length + ")";
          handlers.onGroupKind(kind.id, box.checked);
        };
        label.appendChild(box);
        label.appendChild(document.createTextNode(" " + kind.label));
        list.appendChild(label);
      });
      menu.appendChild(list);
      // A click anywhere else closes it; the listener goes with the toolbar.
      var away = function (e) {
        if (!menu.isConnected) { document.removeEventListener("click", away); return; }
        if (!menu.contains(e.target)) menu.removeAttribute("open");
      };
      if (typeof document.addEventListener === "function") {
        document.addEventListener("click", away);
      }
      root.appendChild(menu);
    }

    // The view settings, in one popover like the groups': which set of inks
    // the bodies wear on the map and the grid (VA.PALETTES).
    // `handlers.dagView` is {palette}; a change is reported as (setting,
    // value).
    if (handlers.onDagView && handlers.dagView) {
      root.appendChild(dagViewMenu(handlers.dagView, handlers.onDagView));
    }

    // The study's own 3D affordance, only once a real study is selected --
    // "trace this in 3D" means nothing about the whole topology, only about
    // one human-lassoed chain. Two forms of the same capability (handoff
    // study_3d_flyout, feature 3): where the annotator is served beside this
    // page (state.annotateMount, probed at boot), a button flies out the 3D
    // panel with the study's parts ghosted and its bound faces opaque; where
    // it is not -- file://, or a server without the sibling mount -- nothing
    // is shown. The viewer still computes and writes nothing for the annotate
    // app; the flyout launch is the same params, handed to the command
    // vocabulary.
    // ...and only where the chain HAS something to show in 3D (handoff
    // annotate_affordances_flyout_and_mesh_gating): a study none of whose
    // parts has an installed mesh traces to an empty scene, which is the same
    // dead end an "open this part in 3D" link on a meshless part was. One
    // meshed part is enough -- the annotator's trace names the missing ones
    // itself rather than pretending the chain is whole.
    if (state.studyId && VA.studyHasMesh(topoProj, VA.findStudy(topoProj, state.studyId))) {
      if (state.annotateMount && handlers.onStudy3d) {
        var view3d = VA.el("button", "ghost tvpick__mode", "View in 3D →");
        view3d.setAttribute("id", "study-3d");
        view3d.setAttribute("title",
          "Open a 3D side panel tracing this study's chain: its parts " +
          "ghosted, surfaces already bound to its elements opaque. The panel " +
          "is the annotation surface itself -- select + tag, no measurement.");
        view3d.onclick = function () {
          handlers.onStudy3d({ topologyId: state.topologyId, studyId: state.studyId, trace: true });
        };
        root.appendChild(view3d);
      }
    }
    return root;
  };

  // The view popover: a labelled picker over its own table.
  function dagViewMenu(view, onChange) {
    var menu = VA.el("details", "tvgroups tvview");
    menu.setAttribute("id", "dag-view");
    var summary = VA.el("summary", "ghost tvpick__mode", "View");
    summary.setAttribute("id", "dag-view-toggle");
    menu.appendChild(summary);
    var list = VA.el("div", "tvgroups__menu tvview__menu");
    var picker = function (setting, label, options) {
      var row = VA.el("label", "tvview__item");
      row.appendChild(VA.el("span", "tvview__label", label));
      var select = document.createElement("select");
      select.setAttribute("data-view-setting", setting);
      options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.id;
        opt.textContent = o.label;
        if (o.id === view[setting]) opt.selected = true;
        select.appendChild(opt);
      });
      select.value = view[setting];
      select.onchange = function () { onChange(setting, select.value); };
      row.appendChild(select);
      list.appendChild(row);
    };
    picker("palette", "Palette", VA.PALETTE_ORDER.map(function (id) {
      return { id: id, label: VA.PALETTES[id].label };
    }));
    menu.appendChild(list);
    var away = function (e) {
      if (!menu.isConnected) { document.removeEventListener("click", away); return; }
      if (!menu.contains(e.target)) menu.removeAttribute("open");
    };
    if (typeof document.addEventListener === "function") {
      document.addEventListener("click", away);
    }
    return menu;
  }

  // --- the joint -------------------------------------------------------------
  //
  // Deliverable 4 (viewer_v2_single_nav, 2026-09-08): `topoProj.joint` is the
  // same free-form assembly/context shape a stack's own joint block is
  // (build_topology_projection.py's project_topology, topology_schema_v1) --
  // `{}` when the topology spans more than one physical joint, as the product
  // model does. One renderer for both (views/stack.js's VA.jointBlock), so a
  // field added there is never a second place to teach this one.
  //
  // Since 2026-10-27 (a_study_shows_the_worksheet_and_joint_of_the_stack_it_
  // folds) the block is detail of the SELECTION: a study whose chain is a
  // folded grip stack shows that stack's joint (VA.jointSubject), and with no
  // such study the topology's own stands.
  VA.renderTopoJoint = function (root, topoProj, study) {
    VA.clear(root);
    if (!topoProj) return root;
    root.appendChild(VA.jointBlock(VA.jointSubject(topoProj, study)));
    return root;
  };

  // --- the DAG and the grid, each in its own region --------------------------
  //
  // `root` is the DAG's region and `ctx.gridRoot` the grid's (topology.html's
  // #topopane and #topogrid; the fixed shell, 2026-11-14). The region draws
  // the map (views/map.js) for every model; the grid's scroller,
  // `.tv__gridscroll`, holds the header and the rows and scrolls alone. With
  // no `gridRoot` (a detached render: the fast tier) the grid is built into
  // `root` after the map.
  //
  // The grid's rows are the WALK's edge rows, in the walk's order: the
  // builder's walk of the model (`topoProj.layout`), each part with many
  // interfaces gathered into one run (VA.gatherParts), and a selection's lit
  // rows made one band with the rest above and below it (VA.bandLayout). The
  // walk is no longer drawn -- the rails retired with Classic
  // (the_map_is_the_only_drawing_and_classic_retires, 2026-11-17) -- but its
  // order is still the grid's, row for row as it was.

  VA.renderTopoPane = function (root, ctx) {
    var gridRoot = ctx.gridRoot || root;
    // The grid's scroll, read BEFORE the scroller it lives on is destroyed
    // (ISSUE_20260915_every_topology_pane_render_throws_away_the_readers_
    // sideways_scroll): a repaint -- a row click, a hover card -- puts the
    // grid back where the reader left it.
    var carriedGrid = carriedGridScroll(gridRoot, ctx.topoProj);
    if (gridRoot !== root) VA.clear(gridRoot);
    root.topoGridRoot = gridRoot;
    var topoProj = ctx.topoProj;
    if (!topoProj) {
      if (VA.releaseMap) VA.releaseMap(root);
      VA.clear(root);
      root.className = "tv__scroll";
      // The SAME two sentences the banner's own missing-projection box shows,
      // off the same two constants rather than a second wording of the same
      // fact (policy_free_brief_residues).
      root.appendChild(VA.el("p", "muted",
        VA.projectionLabels("topologies").missing + " " +
        VA.PROJECTION_BUILT_ELSEWHERE));
      return root;
    }

    var study = ctx.study;
    // What is EMPHASIZED is the page's lit set (VA.studyLitSet, topology.js):
    // a kinematic page hands its own in as `ctx.lit`, a chain study's is its
    // chain. A study that refused to sum has no chain to emphasize (the error
    // is the result), so it leaves the grid as no selection does. With the
    // unlit part HIDDEN (VA.UNLIT_STYLES) the walk is the band alone.
    var lit = ctx.lit || VA.studyLitSet(study, topoProj);
    var marking = !!lit;
    var hiding = marking && ctx.unlitStyle === "hide";
    var gathered = VA.gatherParts(topoProj.layout, topoProj);
    var layout = marking
      ? VA.bandLayout(gathered, lit, hiding ? { only: true } : null)
      : gathered;
    // The chain's ordinals and contributions, for the grid's # and
    // contribution columns: a chain study's own, empty on a kinematic page,
    // whose contributions are its own table's business.
    var chain = VA.chainIndex(study);
    // The merged-row grid: the walk's edge rows, grouped into components
    // (viewer_leader_line_grid). `focus` is the whole of a selection's effect
    // on it: the table shows the chain's rows. A kinematic page's grid is its
    // stack at one stop (VA.kinematicStack), with the stack's sub-stack
    // headers among the rows; the assemblies the reader folded are one row
    // each (a_part_may_contain_parts).
    var plan = VA.gridPlan(layout, topoProj,
      lit && ctx.stack ? Object.assign({}, lit, { stack: ctx.stack }) : lit,
      ctx.collapsedAssemblies || null);
    // The hover state the grid registers into and reads from. Rebuilt per
    // render with the nodes it points at, so there is nothing to unwire and
    // nothing that can outlive the elements it marks.
    var hot = hotState(layout);
    hot.onChange = ctx.onHot || null;
    // ...and the way back: the page's one hover lights the grid's rows
    // (VA.lightTopoKeys).
    VA.lastTopoHot = hot;
    // What this paint drew, for the page: which topology, and which grid row
    // each interface's seam is above (the plan's `beforeEdge`) -- the page
    // scrolls a selected interface's row into view off this.
    VA.lastTopoRender = {
      topologyId: topoProj.id,
      boundaryEdge: plan.leaders.reduce(function (out, leader) {
        out[leader.id] = leader.beforeEdge || null;
        return out;
      }, {}),
    };
    var index = VA.topologyIndex(topoProj);

    // The grid's scroller: the column header, pinned at its top by CSS
    // (`position: sticky` -- this is a real scroll container), then the rows,
    // from the top. The grips are clamped into the visible window.
    var gridScroll = VA.el("div", "tv__gridscroll");
    var gridWidth = (gridRoot && typeof gridRoot.clientWidth === "number")
      ? gridRoot.clientWidth : 0;
    var head = header(ctx, gridWidth);
    gridScroll.appendChild(head);
    gridScroll.appendChild(grid(plan, index, chain, marking, ctx, hot));
    // The grid is in the page before the map paints, so the light the map's
    // paint ends with (`onPainted`) reaches it; a detached render, whose map
    // clears the one root they share, takes the grid after the map.
    if (gridRoot !== root) gridRoot.appendChild(gridScroll);
    var drawn = VA.renderTopoMap(root, ctx);
    if (gridRoot === root) root.appendChild(gridScroll);
    // The grid's scroll back onto the scroller that replaced the one the
    // reader scrolled. Written after the append, so the browser has a
    // laid-out extent to CLAMP it against.
    if (carriedGrid.left) gridScroll.scrollLeft = carriedGrid.left;
    if (carriedGrid.top) gridScroll.scrollTop = carriedGrid.top;
    // The column grips are the ones a sideways scroll of the grid moves, kept
    // over their boundaries as the reader scrolls (VA.columnGripLeft). The
    // listener is on the node this render just built, so the next render drops
    // it with the node.
    if (head.placeColumnGrips) {
      var place = function () { VA.syncTopoScroll(root); };
      gridScroll.onscroll = place;
      if (carriedGrid.left) place();
    }
    return drawn;
  };

  // The grid's own scroll, carried across a repaint of the same topology; a
  // different topology starts at the top-left.
  function carriedGridScroll(gridRoot, topoProj) {
    var none = { left: 0, top: 0 };
    if (!topoProj || !VA.lastTopoRender ||
        VA.lastTopoRender.topologyId !== topoProj.id) return none;
    var live = (gridRoot && gridRoot.querySelector)
      ? gridRoot.querySelector(".tv__gridscroll") : null;
    var n = function (v) { return typeof v === "number" && v > 0 ? v : 0; };
    return live ? { left: n(live.scrollLeft), top: n(live.scrollTop) } : none;
  }

  // The kinematic grid's numbers rewritten in place from `stack`
  // (VA.kinematicStack at a pose), for a pane already drawn with the same
  // rows: each term row's sensitivity and contribution, each sub-stack
  // header's detail and numbers, and the foot's total. The words are the
  // row builders' own (edgeRow, subStackRow, stackFoot); a fast-tier test
  // renders one pose, rewrites it to another and holds every row's text to
  // a fresh render of the second. Returns how many rows it wrote.
  // The foot's contribution cell: the worst case and RSS, or -- when rows
  // refused to name their numbers -- only the words saying it is incomplete.
  VA.stackFootText = function (result, stack) {
    if (result.refused) return result.contribution;
    return result.contribution + " " + (stack.units || "") + " · " + result.rss;
  };

  VA.applyStackText = function (root, stack) {
    if (!root || !root.querySelectorAll || !stack) return 0;
    var set = function (row, cls, text) {
      var cell = row.querySelector(cls);
      if (cell && cell.textContent !== text) cell.textContent = text;
    };
    var subs = {};
    stack.entries.forEach(function (entry) { if (entry.kind === "sub") subs[entry.id] = entry; });
    var written = 0;
    root.querySelectorAll("tr").forEach(function (row) {
      var kind = row.getAttribute("data-row-kind");
      var term = kind === "edge" ? stack.terms[row.getAttribute("data-id")] : null;
      if (term) {
        set(row, "td.tvcell--sensitivity", term.sensitivity);
        set(row, "td.tvcell--contribution", term.contribution +
          (term.contribution && stack.units ? " " + stack.units : ""));
        written++;
        return;
      }
      var sub = kind === "substack" ? subs[row.getAttribute("data-substack")] : null;
      if (sub) {
        set(row, "span.tvsub__detail", sub.detail ? " · " + sub.detail : "");
        set(row, "td.tvcell--sensitivity", sub.sensitivity);
        set(row, "td.tvcell--contribution", sub.contribution);
        written++;
        return;
      }
      var cls = row.className || "";
      if (cls.indexOf("tvtotal--worst_case") !== -1) {
        var r = stack.result;
        set(row, "td.tvtotal__label", r.label);
        var label = row.querySelector("td.tvtotal__label");
        if (label) label.setAttribute("title", r.label + " · " + r.rss);
        set(row, "td.tvcell--nominal", r.nominal);
        set(row, "td.tvcell--contribution", VA.stackFootText(r, stack));
        written++;
      }
    });
    return written;
  };

  // The grid's sideways scroll, for the one thing that follows it by hand: the
  // column grips' pin to the region's right edge. The header itself is pinned
  // to the top of the grid's scroller by CSS (`position: sticky`).
  VA.syncTopoScroll = function (root) {
    var gridRoot = root && (root.topoGridRoot || root);
    var scroller = gridRoot && gridRoot.querySelector
      ? gridRoot.querySelector(".tv__gridscroll") : null;
    var head = scroller ? scroller.querySelector(".tv__head") : null;
    if (!head || !head.placeColumnGrips) return;
    var left = typeof scroller.scrollLeft === "number" ? scroller.scrollLeft : 0;
    head.placeColumnGrips(left, scroller.clientWidth || 0);
  };

  // The grid is a REAL <table> (deliverable 2): a rectangular selection has to
  // paste into Excel as columns, which only a genuine table body does — a
  // div-flex grid copies as one run of text no matter how it looks on screen.
  // One array drives the header row, the column widths (via <col>, so the head
  // table and the body table cannot disagree) and the total width both tables
  // are given inline — a second place these could drift is exactly the "three
  // places" trap this file already documents once for row height.
  //
  // The width budget (the_grid_fits_the_screen_and_its_brackets_say_what_
  // nests_in_what). Jeff, 2026-11-05: "the table is too wide to fit on screen
  // even on my 4k monitor, the sourcing and crop columns are obscured when the
  // 3d and/or preview panel has reasonable size". It was 1218px; it is 1000.
  // The crop column left for the Preview (where the crop is legible), the
  // pill cluster became one icon, and the number columns are as wide as the
  // longest number this repo prints (`−32.185`) at the meta size.
  //
  // `part` and `description` are the old merged COMPONENT column split in two
  // (VA.partColumns): Jeff, "half of the Component column start with
  // PN/Description, and the other half are Description/PN". Each row has its
  // own cells, so every row's part cell is a place to click; the words are
  // said on a part's first row only, and the brackets
  // (VA.gridBraces) carry the grouping.
  // The grid brackets' two label strips, in px (VA.GRID_BRACE reads these):
  // a body's name in a gutter left of the PART column's words, then a part's
  // number, which IS the column's words wherever a part's bracket is drawn
  // (VA.gridPartLabel) -- so the part strip is the column's own 112px less
  // its stubs, and only the body strip widens the column.
  var BRACE_STRIPS = { body: 84, part: 96 };

  var COLUMNS = [
    // Each width is measured against the longest thing its column prints on
    // the real projection, in a totals row (dense, bold) as well as a member
    // row: a number never clips, and words clip only with their hover title.
    // `NAS1149V0332H` inside its brackets' indent is 109px; a body's name
    // sits in a gutter at the column's left, so the column is that much
    // wider (VA.braceGutter). A part's number is in its bracket's strip,
    // inside the 112px, and not in the cell as well.
    { cls: "part", label: "part", width: 112 + BRACE_STRIPS.body, resizable: true },
    { cls: "description", label: "description", width: 140, resizable: true },
    { cls: "ord", label: "#", width: 30, resizable: true },
    { cls: "name", label: "element", width: 220, resizable: true },
    // A totals row's RSS bound, `-13.735566` (the M10 grip), is 82px.
    { cls: "nominal", label: "nominal", width: 84, resizable: true },
    { cls: "min", label: "min", width: 84, resizable: true },
    { cls: "max", label: "max", width: 84, resizable: true },
    // The sweep's sensitivity on a kinematic page (`coefficient`, signed, in
    // the measure's units per the band's); a chain study's ratio, 1 for an
    // unscaled edge -- so the two kinds of study share one column set
    // (the_kinematic_grid_is_a_stack_of_sub_stacks). Its header word, set in
    // the header's capitals, is the column's widest text.
    { cls: "sensitivity", label: "sensitivity", width: 92, resizable: true },
    // A chain row prints its weight and its signed band, and a stack's total
    // its fold and its RSS (`±2.355 deg · RSS ±1.034`). The longest is a
    // kinematic term's `+ 1.953125 × -0.029297 … 0.029297 deg`, 264px -- so
    // the column starts at the widest TOTAL (`±2.355 deg · RSS ±1.034`,
    // 168px, measured 2026-11-14) rather than the widest term (Jeff,
    // 2026-11-09: "The Contribution column is still way too wide"), and a
    // reader who wants a long term whole drags it wider.
    { cls: "contribution", label: "contribution", width: 172, resizable: true },
    // One mark, no words (VA.rowSourcingMark); its header is the mark too.
    { cls: "sourcing", label: "", title: "sourcing", width: 30, resizable: true },
  ];

  // The array IS the width, and since viewer_leader_grid_legibility it is the
  // only one: each <col> carries its width INLINE from here, and topology.css
  // declares no `.tvcol--*` width at all. It used to declare all nine, with
  // this array restating the same numbers for the inline table total -- two
  // sources that happened to agree, which is exactly the drift the shared
  // colgroup exists to prevent and which a resizable column would have made
  // real within one drag.
  //
  // `resizable` marks the columns whose header carries a drag grip: every
  // one since 2026-11-14 (Jeff, 2026-11-09: "make all the columns on the grid
  // view as narrow as possible and/or make them resizable"). The width a drag
  // leaves lasts the session.
  VA.TOPO_COLUMNS = COLUMNS;

  VA.TOPO_COLUMN_WIDTH = { min: 24, max: 900 };

  // --- the right-hand column's width (Jeff, 2026-09-15: "it's too narrow") --
  //
  // The column right of the DAG -- the settings bar, the grid and the Preview
  // under it (the fixed shell, 2026-11-14) -- is dragged by the divider on its
  // left edge (topology.html's #side-divider) and remembered. With nothing
  // remembered it is as wide as the grid (topology_app.js's applyPaneWidth).
  //
  // `min` keeps the grid's first four columns in view; `max` is a bound on a
  // stored number, and the window caps the rendered width (topology.css).
  VA.TOPO_PANE_WIDTH = { min: 480, max: 2400 };

  VA.clampPaneWidth = function (px) {
    var n = Math.round(Number(px));
    if (!isFinite(n)) return VA.TOPO_PANE_WIDTH.min;
    return Math.min(VA.TOPO_PANE_WIDTH.max,
      Math.max(VA.TOPO_PANE_WIDTH.min, n));
  };

  // The width a drag lands on. The pane is on the RIGHT of its divider, so
  // dragging left (negative dx) makes it WIDER — the sign inversion is here,
  // in the pure layer, rather than in the app shell's pointer handler, for the
  // same reason every *AfterDrag function's is: it is the one line of arithmetic
  // a test can check without a pointer, and getting it backwards is the
  // likeliest mistake in the whole feature.
  VA.paneWidthAfterDrag = function (startWidth, dx) {
    return VA.clampPaneWidth(startWidth - dx);
  };

  // Where the remembered width is kept, and the ONE key it is kept under.
  // Jeff asked for the width to persist and said localStorage is fine.
  //
  // This was the first preference on this page to outlive the session. The
  // ways of reading the DIAGRAM (row density, edge length mode, leader style)
  // are reset instead; a region's size is not of that kind: it is a property
  // of the window, it means the same thing on every topology and in both
  // modes, and it is the one Jeff noticed was wrong. (Review, 2026-11-14: this
  // cited a `jogZoneScale` comment the fixed shell deleted with the jog zone.)
  //
  // `store` is injected so both directions are testable without a browser,
  // and every access is wrapped: a file:// page's localStorage is per-path at
  // best and throws outright in some configurations, and a preference is never
  // worth a crash. A read that cannot answer returns null, which the caller
  // reads as "no preference stored" — the stylesheet's width.
  // A new key on 2026-11-14: the old one held the Preview's width beside the
  // grid, a number that means something else now.
  VA.PANE_WIDTH_KEY = "tolstack.viewer.sideWidth";

  // Both directions of a remembered width, over any key and any clamp. Several
  // sizes are remembered on this page (the column right of the DAG, the
  // Preview's height, the nav, the annotator flyout) and every wrapper below
  // is one line, so the try/catch discipline
  // and the "an unreadable value reads as no preference" rule live in exactly
  // one place rather than once per control.
  function readStoredWidth(store, key, clamp) {
    try {
      var raw = store && store.getItem(key);
      if (raw === null || raw === undefined || raw === "") return null;
      var n = Number(raw);
      return isFinite(n) ? clamp(n) : null;
    } catch (err) {
      return null;
    }
  }

  function writeStoredWidth(store, key, clamp, px) {
    try {
      if (store) store.setItem(key, String(clamp(px)));
    } catch (err) {
      // A browser that refuses to store it still resizes for this session.
    }
  }

  VA.readStoredPaneWidth = function (store) {
    return readStoredWidth(store, VA.PANE_WIDTH_KEY, VA.clampPaneWidth);
  };

  VA.writeStoredPaneWidth = function (store, px) {
    writeStoredWidth(store, VA.PANE_WIDTH_KEY, VA.clampPaneWidth, px);
  };

  // --- the Preview's height (the fixed shell, 2026-11-14) -------------------
  //
  // The Preview sits under the grid, and the divider between them sets how
  // tall it is. It is BELOW its divider, so dragging up (negative dy) makes it
  // taller -- the sign is here, where a test can check it without a pointer.
  // `room` is the height the Preview and the grid share -- the column less
  // the banner, the settings bar, the divider and anything else that does not
  // give way -- and `keep` is the grid's floor within it (topology.css's
  // `.tv__gridregion` min-height), so a dragged height is one the page can
  // draw and what is written down is what is shown. 0 or absent is "no
  // layout to go on" and leaves only the floor and the cap.
  VA.PREVIEW_HEIGHT = { min: 120, max: 2400, keep: 160 };

  VA.clampPreviewHeight = function (px, room) {
    var n = Math.round(Number(px));
    if (!isFinite(n)) return VA.PREVIEW_HEIGHT.min;
    var have = Math.round(Number(room));
    var cap = isFinite(have) && have > 0
      ? Math.max(VA.PREVIEW_HEIGHT.min, have - VA.PREVIEW_HEIGHT.keep)
      : VA.PREVIEW_HEIGHT.max;
    return Math.min(cap, VA.PREVIEW_HEIGHT.max, Math.max(VA.PREVIEW_HEIGHT.min, n));
  };

  VA.previewHeightAfterDrag = function (startHeight, dy, room) {
    return VA.clampPreviewHeight(startHeight - dy, room);
  };

  VA.PREVIEW_HEIGHT_KEY = "tolstack.viewer.previewHeight";

  VA.readStoredPreviewHeight = function (store) {
    return readStoredWidth(store, VA.PREVIEW_HEIGHT_KEY, function (n) {
      return VA.clampPreviewHeight(n, 0);
    });
  };

  VA.writeStoredPreviewHeight = function (store, px) {
    writeStoredWidth(store, VA.PREVIEW_HEIGHT_KEY, function (n) {
      return VA.clampPreviewHeight(n, 0);
    }, px);
  };

  // --- side by side · 3D · DAG (Jeff, 2026-11-12) ---------------------------
  //
  // "does it make sense to have the 2d and 3d canvas be either/or rather than
  // displayed side by side? ... I'm not sure I want to get rid of the
  // side-by-side just yet." One control, three states, while the 3D pane is
  // open: both side by side (the default), the pane in the DAG's region too,
  // or the DAG in the pane's. Remembered, and in the URL as `?view=`.
  VA.PANE_VIEWS = {
    both: { label: "Side by side", title: "The 3D pane and the DAG side by side" },
    "3d": { label: "3D", title: "The 3D pane alone, in the DAG's room too" },
    dag: { label: "DAG", title: "The DAG alone, in the 3D pane's room too" },
  };
  VA.PANE_VIEW_ORDER = ["both", "3d", "dag"];
  VA.DEFAULT_PANE_VIEW = "both";
  VA.PANE_VIEW_KEY = "tolstack.viewer.paneView";
  // What the leaders control says when the view leaves it nothing to draw.
  VA.LEADERS_UNAVAILABLE = "Leaders run between the DAG and the 3D pane, side by side";

  VA.isPaneView = function (id) {
    return Object.prototype.hasOwnProperty.call(VA.PANE_VIEWS, id);
  };

  // `?view=3d` / `?view=dag`; anything else, or nothing, is null.
  VA.parsePaneViewParam = function (search) {
    var m = /[?&]view=([^&]*)/.exec(String(search || ""));
    var id = m ? decodeURIComponent(m[1]) : null;
    return id && VA.isPaneView(id) ? id : null;
  };

  VA.readStoredPaneView = function (store) {
    try {
      var raw = store && store.getItem(VA.PANE_VIEW_KEY);
      return raw && VA.isPaneView(raw) ? raw : null;
    } catch (err) {
      return null;
    }
  };

  VA.writeStoredPaneView = function (store, id) {
    try {
      if (store && VA.isPaneView(id)) store.setItem(VA.PANE_VIEW_KEY, id);
    } catch (err) {
      // A browser that refuses to store it still switches for this session.
    }
  };

  // The URL's query with `view` set to `id` (dropped at the default), every
  // other parameter kept in order.
  VA.withPaneViewParam = function (search, id) {
    var parts = String(search || "").replace(/^\?/, "").split("&").filter(function (p) {
      return p && p.split("=")[0] !== "view";
    });
    if (id && id !== VA.DEFAULT_PANE_VIEW) parts.push("view=" + encodeURIComponent(id));
    return parts.length ? "?" + parts.join("&") : "";
  };

  // --- the nav's width (handoff a_face_is_picked_the_way_cad_picks_it) ------
  //
  // Jeff, 2026-10-29: "the left side menu needs to be draggable to resize,
  // currently it clips off a bunch of text." The nav holds the scene's
  // mechanism tree whenever the 3D pane is open, and a joint end's name is
  // longer than 300px. Dragged by the divider on its right edge (topology.html),
  // remembered, and clamped to `min` and to half the window: the nav is LEFT of
  // its divider, so dragging right widens it, the flyout's sign and not the
  // pane's. `room` is the window's width; 0 or absent is "no layout to go on"
  // and leaves only the floor.
  VA.NAV_WIDTH = { min: 260 };

  VA.clampNavWidth = function (px, room) {
    var n = Math.round(Number(px));
    if (!isFinite(n)) return VA.NAV_WIDTH.min;
    var have = Math.round(Number(room));
    var cap = isFinite(have) && have > 0
      ? Math.max(VA.NAV_WIDTH.min, Math.floor(have / 2)) : Infinity;
    return Math.min(cap, Math.max(VA.NAV_WIDTH.min, n));
  };

  VA.navWidthAfterDrag = function (startWidth, dx, room) {
    return VA.clampNavWidth(startWidth + dx, room);
  };

  // Its own key: the reader's preference, kept as chosen (floor only); the
  // half-window cap is applied against the window it is shown in.
  VA.NAV_WIDTH_KEY = "tolstack.viewer.navWidth";

  VA.readStoredNavWidth = function (store) {
    return readStoredWidth(store, VA.NAV_WIDTH_KEY, function (n) {
      return VA.clampNavWidth(n, 0);
    });
  };

  VA.writeStoredNavWidth = function (store, px) {
    writeStoredWidth(store, VA.NAV_WIDTH_KEY, function (n) {
      return VA.clampNavWidth(n, 0);
    }, px);
  };

  // --- the annotator flyout's width (Jeff, 2026-09-16) ----------------------
  //
  // "I actually want the 3d flyout on the left side, adjacent to the DAG. It
  // would be ok if it covered up the left side select menu since you shouldn't
  // need both at the same time." Adjacency is the requirement: the 3D panel and
  // the graph have to be readable at the same time, so this width has one bound
  // the preview pane's does not -- a strip of the page underneath must stay
  // uncovered whatever the window is.
  //
  // `min` is enough canvas to orbit in, with the scene's one-line head and its
  // sweep bar across the top. It was 560 while the annotator brought its own
  // rail into the panel (260px of it); embedded, that rail is drawn in this
  // page's nav instead (the_shell_seats_the_scene_beside_the_model), so the
  // panel is all scene. Under the preview pane's own 560 on purpose: at the
  // floor, the scene leaves the DAG and grid MORE room than the preview it
  // stands in for. `max` bounds a drag on a wide screen.
  //
  // `reserve` is the FLOOR for what is left beside the panel, used when the
  // caller can measure nothing to keep (stack mode, which draws no graph; a
  // pre-layout call). 320px because that is the narrowest column this page
  // already treats as readable -- VA.TOPO_PANE_WIDTH.min, the preview pane's
  // own floor.
  //
  // What is normally kept is MEASURED, and measuring the right thing took two
  // goes. First it was the viewport, which handed the reader back preview pane;
  // then it was `#topopane`, which is the graph's SCROLLPORT and not the graph
  // -- and that is the version a review caught (2026-09-16), because it
  // reported 300px of clearance over a diagram that was 100% covered. The DAG
  // drawing is one `svg.tv__rails`, it is 90-262px wide across all 21 live
  // studies, it sits at the pane's left edge, and it is `position: sticky;
  // left: 0` so no scroll position can move it out from under anything. It is
  // the drawing that has to survive, so it is the drawing the caller measures.
  VA.FLYOUT_WIDTH = { min: 400, max: 2400, reserve: 320 };

  // `room` is the width the panel and the page's own content are dividing --
  // the viewport less what sits to the RIGHT of the graph (the preview pane and
  // its divider, where they have not stood down for the scene) and less the
  // nav, which sits to the scene's left.
  // `keep` is what must be left of that for the page: the drawing's own
  // measured width, floored at `reserve`. Both are the caller's measurements
  // (topology_app.js's roomBesideFlyout / graphNeed) because they are live
  // layout facts and this layer measures nothing; an absent or zero `room`
  // reads as "no layout to go on" and falls back to the px max rather than to
  // `min`, and an absent `keep` falls back to `reserve`.
  VA.clampFlyoutWidth = function (px, room, keep) {
    var n = Math.round(Number(px));
    if (!isFinite(n)) return VA.FLYOUT_WIDTH.min;
    var have = Math.round(Number(room));
    var wanted = Math.round(Number(keep));
    var reserve = Math.max(VA.FLYOUT_WIDTH.reserve,
      isFinite(wanted) && wanted > 0 ? wanted : 0);
    var cap = isFinite(have) && have > 0
      ? Math.min(VA.FLYOUT_WIDTH.max, have - reserve)
      : VA.FLYOUT_WIDTH.max;
    return Math.min(Math.max(cap, VA.FLYOUT_WIDTH.min),
      Math.max(VA.FLYOUT_WIDTH.min, n));
  };

  // The width a drag lands on. The flyout is LEFT of its divider, so dragging
  // right (positive dx) makes it wider -- the opposite sign to
  // VA.paneWidthAfterDrag, whose pane sits on the right of its own divider.
  // That inversion is the likeliest mistake in either feature, so it is here,
  // in one pure line a test can check with no pointer, in both cases.
  VA.flyoutWidthAfterDrag = function (startWidth, dx, room, keep) {
    return VA.clampFlyoutWidth(startWidth + dx, room, keep);
  };

  // Its own key, beside the pane's: the two controls are independent and a
  // reader who widens one has said nothing about the other.
  VA.FLYOUT_WIDTH_KEY = "tolstack.viewer.flyoutWidth";

  VA.readStoredFlyoutWidth = function (store, room, keep) {
    return readStoredWidth(store, VA.FLYOUT_WIDTH_KEY, function (n) {
      return VA.clampFlyoutWidth(n, room, keep);
    });
  };

  // Whether the 3D pane is open, remembered per browser beside its width
  // (handoff the_3d_pane_opens_in_the_mode_the_study_wants): the pane stays,
  // so a reload finds it where the reader left it. "1" or absent; anything
  // unreadable reads as closed.
  VA.FLYOUT_OPEN_KEY = "tolstack.viewer.flyoutOpen";

  VA.readStoredFlyoutOpen = function (store) {
    try {
      return !!store && store.getItem(VA.FLYOUT_OPEN_KEY) === "1";
    } catch (err) {
      return false;
    }
  };

  VA.writeStoredFlyoutOpen = function (store, open) {
    try {
      if (!store) return;
      if (open) store.setItem(VA.FLYOUT_OPEN_KEY, "1");
      else store.removeItem(VA.FLYOUT_OPEN_KEY);
    } catch (err) {
      // A browser that refuses to store it still keeps the pane this session.
    }
  };

  VA.writeStoredFlyoutWidth = function (store, px, room, keep) {
    writeStoredWidth(store, VA.FLYOUT_WIDTH_KEY, function (n) {
      return VA.clampFlyoutWidth(n, room, keep);
    }, px);
  };

  VA.topoColumn = function (cls) {
    for (var i = 0; i < COLUMNS.length; i++) {
      if (COLUMNS[i].cls === cls) return COLUMNS[i];
    }
    return null;
  };

  // Mutates the entry IN PLACE, the same way VA.applyRowDensity mutates
  // VA.RAIL_METRICS rather than replacing it: every reference already holds
  // this array, so there is nothing to re-wire and no second copy to forget.
  VA.setTopoColumnWidth = function (cls, px) {
    var column = VA.topoColumn(cls);
    if (!column) return null;
    var n = Number(px);
    if (!isFinite(n)) return column.width;
    column.width = Math.min(VA.TOPO_COLUMN_WIDTH.max,
      Math.max(VA.TOPO_COLUMN_WIDTH.min, Math.round(n)));
    return column.width;
  };

  function tableWidth() {
    return COLUMNS.reduce(function (sum, c) { return sum + c.width; }, 0);
  }
  // The grid's width at the columns' current widths: the page sizes the
  // column it sits in to it (topology_app.js's applyPaneWidth).
  VA.topoTableWidth = tableWidth;

  function colgroup() {
    var cg = VA.el("colgroup");
    COLUMNS.forEach(function (c) {
      var col = VA.el("col", "tvcol tvcol--" + c.cls);
      col.style.width = c.width + "px";
      cg.appendChild(col);
    });
    return cg;
  }

  // The column header, at the top of the grid's own scroller. Real <th> cells
  // (deliverable 2): a screen reader and a copy-paste both get an actual
  // header, not a styled div.
  function header(ctx, paneWidth) {
    var head = VA.el("div", "tv__head");
    var table = VA.el("table", "tvheadtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tr = VA.el("tr");
    // A column's boundary in the grid scroller's own coordinates is every
    // column before it, and its own width. Accumulated here rather than
    // measured off the DOM: the header is being built, there is nothing laid
    // out to measure, and this is the same COLUMNS array the <col> widths come
    // from.
    var boundary = 0;
    var lanes = [];
    var columnGrips = [];
    COLUMNS.forEach(function (c) {
      var th = VA.el("th", "tvcell tvcell--" + c.cls, c.label);
      // A label the column clips is read in full on hover.
      if (c.title || c.label) th.setAttribute("title", c.title || c.label);
      if (c.cls === "sourcing") th.appendChild(VA.warningIcon("tvmark__head"));
      // PART's words start right of the brackets' label gutter, as its
      // cells' do.
      if (c.cls === "part") th.style.paddingLeft = (4 + VA.braceGutter()) + "px";
      boundary += c.width;
      if (c.resizable) {
        th.className += " tvcell--resizable";
        var grip = resizeGrip("col", "Drag to widen this column.", ctx,
          { kind: "column", cls: c.cls });
        columnGrips.push({ grip: grip, boundary: boundary });
        lanes.push(gripLane(grip));
      }
      tr.appendChild(th);
    });
    table.appendChild(VA.el("thead", null, tr));
    head.appendChild(table);
    lanes.forEach(function (lane) { head.appendChild(lane); });
    // The column grips are the ones a SCROLL moves, so theirs is re-written as
    // the grid scrolls. Hung on the node rather than wired here: the scroller
    // the scroll event comes from is built by renderTopoPane, one level up,
    // and dies with the next render along with this closure.
    // Every column has a grip (2026-11-14), so more than one boundary can be
    // past the visible edge at once: only the first of them is pinned there,
    // and the rest are not drawn -- two grips on one pixel would hand the
    // drag to whichever is on top.
    head.placeColumnGrips = function (scrollLeft, visibleWidth) {
      var pinned = false;
      columnGrips.forEach(function (entry) {
        var left = VA.columnGripLeft(entry.boundary, scrollLeft, visibleWidth);
        var off = left < entry.boundary - VA.TOPO_GRIP.width;
        entry.grip.style.display = off && pinned ? "none" : "";
        if (off) pinned = true;
        entry.grip.style.left = left + "px";
      });
    };
    head.placeColumnGrips(0, paneWidth);
    return head;
  }

  // The grip's own pixels, shared with `.tvgrip`'s width in topology.css and
  // paired against it by a test: the inset arithmetic below is in JS and the
  // hairline it has to line up with is in CSS, which is exactly the two-places
  // shape this file already refuses for column widths. `half` is where the
  // hairline sits inside the grip (`.tvgrip::before`'s own `left`), so a grip
  // centred on a boundary is that boundary less `half`.
  VA.TOPO_GRIP = { width: 7, half: 3 };

  // Where a resizable column's grip sits, in the grid scroller's own
  // coordinates -- `boundary` is that column's right edge.
  //
  // This boundary is a column edge and really does scroll, so the grip rides
  // it while it is on screen (the value
  // is then just the boundary, and the browser scrolls the grip with the
  // content for free) and pins to the pane's right edge past that. The pin is
  // what a reader who has widened the preview pane or the ELEMENT column
  // itself needs: the column's own edge can be a thousand pixels right of
  // anything on screen, and a grip out there is a control with no way in.
  VA.columnGripLeft = function (boundary, scrollLeft, visibleWidth) {
    var natural = boundary - VA.TOPO_GRIP.width;
    if (!visibleWidth || visibleWidth <= 0) return natural;
    return Math.min(natural,
      (scrollLeft || 0) + visibleWidth - VA.TOPO_GRIP.width);
  };

  // A grip's lane: an inert overlay spanning the header's whole scroll width,
  // holding exactly one grip. Each grip carries an inline `left` -- a written
  // scroller coordinate -- so the lane contributes nothing but the box it is
  // measured in. One
  // lane per grip: see `.tv__griplane`, topology.css, for why they are not
  // shared.
  function gripLane(grip) {
    var lane = VA.el("div", "tv__griplane");
    lane.appendChild(grip);
    return lane;
  }

  // --- the two drag affordances (viewer_leader_grid_legibility) ------------
  //
  // Both live in the column header, which is where a reader already looks to
  // resize a column, and both are the same thin grip: the jog zone's on the
  // seam between the SVG and the grid, the ELEMENT column's on that header
  // cell's right edge. That is the whole of the UI -- no number to type, no
  // panel to open.
  //
  // The pointer drag itself belongs to the app shell (topology_app.js),
  // because a re-render replaces this node mid-drag: the move/up listeners
  // have to be on the document, not on the grip. Arrow keys nudge the same
  // preference without a pointer at all, which is both the keyboard path and
  // the one a DOM-shim test can drive.
  function resizeGrip(cls, title, ctx, spec) {
    var grip = VA.el("div", "tvgrip tvgrip--" + cls);
    grip.setAttribute("title", title);
    grip.setAttribute("role", "separator");
    grip.setAttribute("aria-orientation", "vertical");
    grip.setAttribute("tabindex", "0");
    grip.setAttribute("data-resize", spec.kind + (spec.cls ? ":" + spec.cls : ""));
    grip.onpointerdown = function (event) {
      if (event && event.preventDefault) event.preventDefault();
      if (ctx && ctx.onResizeStart) ctx.onResizeStart(spec, event);
    };
    grip.onkeydown = function (event) {
      var key = event && event.key;
      if (key !== "ArrowLeft" && key !== "ArrowRight") return;
      if (event.preventDefault) event.preventDefault();
      var step = (event.shiftKey ? 40 : 8) * (key === "ArrowRight" ? 1 : -1);
      if (ctx && ctx.onResizeNudge) ctx.onResizeNudge(spec, step);
    };
    return grip;
  }


  // --- one hover state, two surfaces ---------------------------------------
  //
  // (nav_tooltip_once_and_rail_hover_emphasis, 2026-09-30.) Jeff, tracing a
  // leg through a crossing: "add an emphasis (bold/glow etc) to the edges when
  // you hover over them, again makes it easier to trace them" — and, a few
  // minutes later, "it would be awesome if the DAG and the table/grid shared
  // their highlighted state, so everything lit up together."
  //
  // So hover is STATE here, not a `:hover` rule. One key — an edge, a node or
  // a rail — set from one place and read by both panes. A stylesheet cannot
  // light a bar from a grid row or a row from a bar, and two stylesheets each
  // lighting their own half is the pair that drifts; `.tvrow:hover` was
  // exactly that half, and it is gone.
  //
  // TWO levels, which is the floor the handoff set and the ceiling this took:
  //
  //   --lead  the thing the pointer is actually on, and its counterpart on the
  //           other surface: an edge's bar, its two dots, its leader and its
  //           grid row; a node's dot, its leader and the rows of the edges
  //           that meet there (a node has no row of its own).
  //   --hot   the whole CONNECTED LINE that element sits on: the rail span,
  //           the branch curve that opened it, every bar and dot on it, the
  //           close curves leaving it, and those edges' grid rows.
  //
  // Nothing is dimmed. A reader is tracing ONE line through the others, not
  // hiding them, so the rest of the drawing is left exactly as drawn — which
  // is also what keeps this from fighting a study selection's own `--off`.
  //
  // And it never touches selection: `--on` / `--selected` are the ACCENT, a
  // click, and a thing that survives the pointer leaving; hover is width and
  // brightness and survives nothing. Hovering opens no card either — the bars',
  // dots' and leaders' own cards keep their existing triggers, and this rides
  // alongside them.

  // The grid's hover registry: the rows that ARE each key (`self`, which is
  // what lights), the keys each row leads for (`lead`, bookkeeping), and an
  // edge's two interfaces, off the walk's own `entered_at`/`left_at`.
  function hotState(layout) {
    var hot = { lead: {}, self: {}, nodesOfEdge: {}, on: null, marked: [] };
    ((layout && layout.rows) || []).forEach(function (row) {
      if (row.kind !== "edge") return;
      hot.nodesOfEdge[row.id] = [row.entered_at, row.left_at].filter(Boolean);
    });
    return hot;
  }

  // A hot key. The same (kind, id) pair every mark, every grid row and every
  // deep link on this page is addressed by, so nothing here needs a second
  // identity scheme.
  function hotKey(kind, id) { return kind + "|" + id; }

  // Register a drawn node under the line it belongs to, the keys that lead it,
  // or both. `base` is the class string it was BUILT with and is passed in
  // rather than read back: an SVG element's `className` is a read-only
  // SVGAnimatedString (VA.svg's header), so the class has to be rewritten
  // whole through setAttribute, and that needs the original to rewrite from.
  function hotRegister(hot, spec) {
    var entry = { el: spec.el, base: spec.base,
                  hot: spec.hot || null, lead: spec.lead || null };
    (spec.leads || []).forEach(function (key) {
      (hot.lead[key] || (hot.lead[key] = [])).push(entry);
    });
    (spec.self || []).forEach(function (key) {
      (hot.self[key] || (hot.self[key] = [])).push(entry);
    });
    return spec.el;
  }

  // ONE lighter (one_selection_one_hover_and_leaders_off, 2026-11-10; two
  // tiers since hover_and_select_light_the_same_things_on_all_four_surfaces_
  // and_nothing_goes_opaque, 2026-11-12): what the page's resolver says an
  // entity lights (VA.focusElementKeysOf), as {own, touching} key lists, lit
  // on the entries that ARE those keys and on nothing else. `own` wears the
  // entry's `lead` class (the stronger weight), `touching` its `hot` class
  // (the fainter); an entry in both keeps the stronger. Until 2026-11-12 a
  // key also lit the whole rail leg it sat on and every row at a node, so a
  // part hovered in the tree lit every edge of every part that touched it
  // plus whole legs -- Jeff's "random rows". A leg is no longer a thing
  // hover says; the resolver is. The pane's own pointer arrives here too,
  // through the page (setHot tells it, applyFocus lights), so there is one
  // place a class is written. A `keys` of null, or an array (the old one-tier
  // call), is read as own.
  function lightKeys(hot, keys) {
    while (hot.marked.length) {
      var was = hot.marked.pop();
      was.el.setAttribute("class", was.base);
    }
    var tiers = Array.isArray(keys) ? { own: keys, touching: [] } : (keys || { own: [], touching: [] });
    var lit = {};
    var light = function (entry, extra) {
      if (!extra) return;
      entry.el.setAttribute("class", entry.base + " " + extra);
      hot.marked.push(entry);
    };
    (tiers.touching || []).forEach(function (key) {
      (hot.self[key] || []).forEach(function (entry) { light(entry, entry.hot); lit[key] = true; });
    });
    (tiers.own || []).forEach(function (key) {
      (hot.self[key] || []).forEach(function (entry) {
        light(entry, [entry.hot, entry.lead].filter(Boolean).join(" "));
        lit[key] = true;
      });
    });
    return Object.keys(lit).length;
  }

  // The pane's own pointer (or keyboard focus) on a mark, a row, a rail: lit
  // here, labelled, and told to the page (`onChange`), which holds the one
  // hover and lights the other surfaces from it. A leave with nothing held
  // (`key` null while `on` is already null -- the pointer rested on a mark
  // through a repaint, which rebuilt this state) still tells the page, so
  // the hover the repaint carried over is let go of.
  function setHot(hot, key) {
    if (!hot) return;
    if (hot.on === key) {
      if (key === null && hot.onChange) hot.onChange(null);
      return;
    }
    hot.on = key;
    // Since 2026-11-12 the pane lights nothing of its own here: the page
    // holds the one hover and lights every surface from the one resolver
    // (VA.lightTopoKeys), this pane included. A pane with no page (a test's
    // bare render) lights the key itself, as own, so the mark still answers.
    if (hot.onChange) hot.onChange(key);
    else lightKeys(hot, key ? [key] : []);
  }

  // The page's one hover, lighting this pane (coaxial_ends_share_one_3d_node
  // first; every surface since 2026-11-10; two tiers since 2026-11-12): the
  // {own, touching} keys of what is hovered anywhere -- the tree, the scene,
  // this pane's own marks, or still hovered across a repaint -- or null for
  // nothing. Returns how many keys lit something.
  VA.lightTopoKeys = function (keys) {
    var hot = VA.lastTopoHot;
    if (!hot) return 0;
    return lightKeys(hot, keys);
  };

  // Hover and keyboard focus drive the same state, and leaving clears it only
  // if this element is still the one holding it -- or nothing is: moving the
  // pointer from a bar onto the rail under it fires the new element's
  // `mouseenter` and the old one's `mouseleave`, and a clear that did not
  // check would race the set; a leave on a pane repainted under the pointer
  // (`on` null again) is the one way the page learns the pointer has gone.
  //
  // Composed onto whatever the node already carries rather than assigned: a
  // bar's hit path opens a card on the same two events (cardOnHover above), and
  // `onmouseenter = ...` there would have silently replaced it.
  function hotHover(hot, node, key) {
    chain(node, "onmouseenter", function () { setHot(hot, key); });
    chain(node, "onfocus", function () { setHot(hot, key); });
    chain(node, "onmouseleave", function () { if (hot.on === key || hot.on === null) setHot(hot, null); });
    chain(node, "onblur", function () { if (hot.on === key || hot.on === null) setHot(hot, null); });
    return node;
  }

  function chain(node, name, fn) {
    var prev = node[name];
    node[name] = typeof prev === "function"
      ? function (event) { prev(event); fn(event); }
      : fn;
  }

  VA.PIN_GLYPH_PX = 12;
  VA.pinGlyph = function () {
    var px = VA.PIN_GLYPH_PX;
    var svg = VA.svg("svg", "pinglyph", { width: px, height: px, viewBox: "0 0 12 12" });
    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(VA.svg("path", "pinglyph__head",
      { d: "M4 1h4l-.6 4 2.1 2H2.5l2.1-2z" }));
    svg.appendChild(VA.svg("path", "pinglyph__needle", { d: "M6 7v4.5" }));
    return svg;
  };

  // --- the grid ------------------------------------------------------------

  // One row per EDGE, walk order, merged into component groups
  // (viewer_leader_line_grid): the leftmost cell of a group's first row spans
  // the whole group via rowspan, so a component is said once and its
  // tolerance sub-rows read as one block. Node rows are gone — an interface
  // is its dot and (at a part boundary) its leader, both clickable.
  function grid(plan, index, chain, marking, ctx, hot) {
    var box = VA.el("div", "tv__rows");
    var table = VA.el("table", "tvtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    // The balance sheet's bottom block (viewer_summary_balance_sheet): the
    // rolled-up numbers as rows of THIS table, under the members they are the
    // total of, in the same columns. Only where a study is actually
    // emphasized -- the whole-walk view has no chain and therefore no total,
    // and a study that refuses to sum has its refusal instead
    // (VA.renderTopoTotals's error block). A kinematic page's is its stop's.
    var foot = ctx.stack ? stackFoot(ctx.stack)
      : totalsFoot(marking ? ctx.study : null);
    // The brackets (VA.gridBraces), over the rows they group and taking no
    // layout of their own: every row is exactly `rowHeight` tall, so a
    // group's top and bottom edge are row counts, and nothing a leader's seam
    // reads moves. A row's first words start inside its innermost bracket.
    var study = !marking ? null : ctx.stack ? "kinematic" : ctx.study ? "chain" : null;
    var kindsOn = ctx.groupKinds || null;
    var braces = VA.gridBraces(plan, {
      study: study, foot: foot ? foot.childNodes.length : 0, topoProj: ctx.topoProj,
      kinds: kindsOn ? { bodies: !!kindsOn.bodies, parts: !!kindsOn.parts } : null,
    });
    var braceGeo = VA.braceGeometry(braces, M.rowHeight, tableWidth());
    // The rows whose part's bracket says its number: their cell does not.
    var numbered = {};
    braces.braces.forEach(function (b) {
      if (b.kind !== "part" || !b.label) return;
      for (var r = b.start; r <= b.end; r++) numbered[r] = true;
    });
    var tbody = VA.el("tbody");
    plan.groups.forEach(function (group) {
      for (var i = 0; i < group.count; i++) {
        var planRow = plan.rows[group.start + i];
        var indent = braceGeo.indent[group.start + i] || 4;
        var row = group.header
          ? subStackRow(planRow, ctx, hot, indent)
          : planRow.rollup
            ? assemblyRow(planRow, group, index, marking, ctx, hot, indent,
                          !!numbered[group.start + i])
            : edgeRow(planRow, group, i === 0, index, chain, marking, ctx, hot, indent,
                      !!numbered[group.start + i]);
        tbody.appendChild(row);
      }
    });
    table.appendChild(tbody);
    if (foot) table.appendChild(foot);
    box.appendChild(table);
    box.appendChild(braceLayer(braceGeo, ctx, hot));
    // What the sourcing marks say, under the rows they mark: below the last
    // row, so no leader's seam moves.
    if (plan.rows.length && marking) box.appendChild(sourcingLegend());
    return box;
  }

  // The brackets' geometry (VA.gridBraces is the model). Every group is a
  // pair of caps -- `╭──╮` on its first row's top edge, `╰──╯` on its last
  // row's bottom edge -- inset `inset` px a side per level, so an outer group
  // is wider than the groups inside it. The curl is the caps' height: it
  // stays inside the space a row leaves above and below its text, so a cap
  // never runs through a word. Caps of several groups on one edge step apart
  // by `step`, outermost on the outside.
  //
  // The labels sit in the gutter left of the PART column's words (the_dag_
  // and_grid_nest_coloured_bodies_and_compact_means_denser_rows): a body's
  // name in a `body`-wide strip just inside its brace's left stub, wrapping
  // down its rows; a part's brace starts right of that strip and its number
  // fills a `part`-wide one. A row's first words start right of the
  // innermost label strip that holds it (`indent`).
  // `nest` is how far a part inside an assembly is indented per level, and
  // `caret` the width an assembly's fold takes at its label's head
  // (a_part_may_contain_parts).
  VA.GRID_BRACE = { inset: 7, step: 3, text: 14, curlMax: 6, line: 13,
                    body: BRACE_STRIPS.body, part: BRACE_STRIPS.part, nest: 10, caret: 12 };

  VA.braceGeometry = function (model, rowHeight, width) {
    var g = VA.GRID_BRACE;
    var curl = Math.max(2, Math.min(g.curlMax, Math.floor((rowHeight - g.text) / 2)));
    var tops = {};
    var bottoms = {};
    var caps = [];
    var labels = [];
    var carets = [];
    var indent = {};
    var lefts = [];
    var rows = function (b) { return b.end - b.start + 1; };
    model.braces.forEach(function (b) {
      var right = 2 + b.level * g.inset;
      var x = b.kind === "part" && b.body ? lefts[model.braces.indexOf(b.body)] + g.body
        : 2 + b.level * g.inset;
      // A part inside an assembly is indented `nest` a level: its bracket,
      // and so its number (only the part column moves).
      var nested = b.kind === "part" ? (b.depth || 0) * g.nest : 0;
      x += nested;
      lefts.push(x);
      var w = Math.max(0, width - x - right);
      var t = tops[b.start] || 0;
      var u = bottoms[b.end] || 0;
      tops[b.start] = t + 1;
      bottoms[b.end] = u + 1;
      var y0 = b.start * rowHeight + 1 + t * g.step;
      var y1 = (b.end + 1) * rowHeight - 1 - u * g.step;
      var cap = { kind: b.kind, gap: b.gap, id: b.id, tint: b.tint, left: x, width: w,
                  height: curl };
      caps.push(Object.assign({ side: "top", top: y0 }, cap));
      caps.push(Object.assign({ side: "bottom", top: y1 - curl }, cap));
      // Where a held row's words start: right of this brace's label strip
      // (a body's or a part's), or just inside its stub.
      var strip = b.kind === "body" ? g.body : b.kind === "part" ? g.part - nested : g.inset;
      for (var r = b.start; r <= b.end; r++) indent[r] = Math.max(indent[r] || 4, x + strip);
      // An assembly's fold sits at its label's head, on its first row.
      var caret = b.kind === "part" && b.assembly ? g.caret : 0;
      if (caret) {
        carets.push({ part: b.part, open: b.assembly === "open", tint: b.tint,
                      left: x + 3, top: b.start * rowHeight, width: caret, height: rowHeight });
      }
      // A label starts on its brace's first row, on that row's text line;
      // a body's wraps down as many lines as its rows hold, a part's is one.
      if (b.label && (b.kind === "body" || b.kind === "part")) {
        var line = Math.min(g.line, rowHeight - 2);
        var lines = b.kind === "body"
          ? Math.max(1, Math.floor((rows(b) * rowHeight - (rowHeight - line)) / g.line)) : 1;
        labels.push({ kind: b.kind, id: b.id, tint: b.tint, text: b.label,
                      left: x + 5 + caret, width: strip - 8 - caret, line: line, lines: lines,
                      top: b.start * rowHeight + (rowHeight - line) / 2,
                      height: lines === 1 ? line : lines * g.line });
      }
    });
    return { caps: caps, labels: labels, carets: carets, indent: indent, curl: curl };
  };

  // The gutter added to the PART column's own width (COLUMNS): a body's
  // strip. A part's strip is inside the column's words, where its number is.
  VA.braceGutter = function () {
    return VA.GRID_BRACE.body;
  };

  function braceLayer(geo, ctx, hot) {
    var layer = VA.el("div", "tvbraces");
    // A body's or a part's bracket is that entity's container in the grid:
    // LIT with it (hover and selection, both tiers), but never a control. Its
    // caps lie across the rows' edges and its label over the first row's
    // PART cell, which are the rows' own hover and click targets -- a cap
    // that took the pointer made a row unhoverable at its centre (the
    // kinematic suite, 2026-11-12). The DAG's container and name are the
    // part's controls; the grid's rows are the rows'. A study's bracket is
    // neither lit nor a control.
    var container = function (node, kind, braceId, cls) {
      if (kind !== "body" && kind !== "part") return node;
      // A part's brace id is `part:<part>` (VA.gridBraces); a body's is the
      // body's own id. The entity is the part or the body.
      var id = kind === "part" ? String(braceId).replace(/^part:/, "") : String(braceId);
      node.className += tierClasses(ctx, cls, kind, id);
      node.setAttribute("data-brace-kind", kind);
      node.setAttribute("data-brace-entity", id);
      hotRegister(hot, { el: node, base: node.getAttribute("class"),
        self: [hotKey(kind, id)], hot: cls + "--hot", lead: cls + "--lead" });
      return node;
    };
    var place = function (node, box) {
      node.style.left = box.left + "px";
      node.style.top = box.top + "px";
      node.style.width = box.width + "px";
      if (box.height !== undefined) node.style.height = box.height + "px";
      layer.appendChild(node);
    };
    geo.caps.forEach(function (cap) {
      var node = VA.el("div", "tvbrace tvbrace--" + cap.side + " tvbrace--" + cap.kind +
        (cap.tint !== undefined ? " tv__fill--t" + cap.tint : "") +
        (cap.gap ? " tvbrace--gap" : ""));
      node.setAttribute("data-brace", cap.id);
      if (cap.kind !== "body" && cap.kind !== "part") node.setAttribute("aria-hidden", "true");
      place(container(node, cap.kind, cap.id, "tvbrace"), cap);
    });
    // A label the strip clips keeps its whole text as a title for tools; a
    // reader's hover reaches the PART cell under it, whose title names the part.
    geo.labels.forEach(function (label) {
      var node = VA.el("div", "tvbrace__label tvbrace__label--" + label.kind +
        " tv__fill--t" + label.tint, label.text);
      node.setAttribute("data-brace-label", label.id);
      container(node, label.kind, label.id, "tvbrace__label");
      node.setAttribute("title", label.text);
      if (label.lines > 1) node.style.webkitLineClamp = String(label.lines);
      node.style.lineHeight = (label.lines > 1 ? VA.GRID_BRACE.line : label.line) + "px";
      place(node, label);
    });
    // An assembly's fold (a_part_may_contain_parts): the one control in this
    // layer, so it alone takes the pointer.
    (geo.carets || []).forEach(function (c) {
      var node = assemblyCaret(c.part, c.open, ctx);
      if (!node) return;
      node.className += " tvbrace__caret tv__fill--t" + c.tint;
      place(node, c);
    });
    return layer;
  }

  // An assembly's fold in the grid: ▾ open, ▸ folded into its one row. A
  // click folds or opens it and selects nothing. Null where the page wires
  // no fold.
  function assemblyCaret(partId, open, ctx) {
    if (!ctx.onToggleAssembly) return null;
    var node = VA.el("button", "tvasm__caret", open ? "▾" : "▸");
    node.setAttribute("type", "button");
    node.setAttribute("data-assembly-fold", partId);
    node.setAttribute("aria-expanded", open ? "true" : "false");
    node.setAttribute("title", open ? "Fold into one row" : "Show its parts");
    node.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      ctx.onToggleAssembly(partId, open);
    };
    return node;
  }

  // The sourcing legend: every mark beside the words it means
  // (VA.sourcingMarkWords), and what a row with no mark is.
  function sourcingLegend() {
    var strip = VA.el("div", "tvlegend");
    // As wide as the table above it, never wider: a wrapping strip in the
    // pane's shrink-to-fit box would otherwise lay out at its one-line width
    // and widen the pane's sideways scroll.
    strip.style.width = tableWidth() + "px";
    strip.appendChild(VA.el("span", "tvlegend__head", "sourcing"));
    VA.SOURCING_MARKS.forEach(function (key) {
      var item = VA.el("span", "tvlegend__item");
      item.setAttribute("data-mark", key);
      item.appendChild(sourcingMark({ key: key, words: VA.sourcingMarkWords(key) }));
      item.appendChild(VA.el("span", "muted", VA.sourcingMarkWords(key)));
      strip.appendChild(item);
    });
    var none = VA.el("span", "tvlegend__item");
    none.setAttribute("data-mark", VA.SOURCING_UNMARKED);
    none.appendChild(VA.el("span", "muted",
      "no mark: " + VA.CONFIDENCE_WORDS[VA.SOURCING_UNMARKED]));
    strip.appendChild(none);
    return strip;
  }

  // One mark: the nav's warning triangle in the state's colour, the state's
  // words on hover.
  function sourcingMark(mark) {
    var node = VA.el("span", "tvmark tvmark--" + mark.key);
    node.setAttribute("title", mark.words);
    node.setAttribute("aria-label", mark.words);
    node.setAttribute("data-mark", mark.key);
    node.appendChild(VA.warningIcon());
    return node;
  }

  // The sourcing cell: the row's mark or nothing. The mark node rides on the
  // cell (`cell.mark`) for a caller that makes it a card trigger.
  function sourcingCell(mark) {
    var cell = VA.el("td", "tvcell tvcell--sourcing");
    cell.mark = mark ? sourcingMark(mark) : null;
    if (cell.mark) cell.appendChild(cell.mark);
    return cell;
  }

  // A sub-stack's header row (VA.kinematicStack's `sub` entry): ▸ or ▾, its
  // name and what it folds to, its own total in its own units, its
  // sensitivity and what it contributes here. A click opens or closes it, on
  // the page's one fold state (`ctx.onToggleSubStack`), which the DAG's
  // dashed field for the same sub-study reads too.
  function subStackRow(planRow, ctx, hot, indent) {
    var entry = planRow.header;
    var el = baseRow("substack", ctx, planRow.id);
    el.className += " tvrow--depth-" + entry.depth + (entry.gap ? " tvrow--gapstack" : "");
    el.setAttribute("data-substack", entry.id);
    var foldable = entry.count > 0 && !!ctx.onToggleSubStack;
    var toggle = function () { if (foldable) ctx.onToggleSubStack(entry.id, !entry.open); };
    el.onclick = toggle;
    var name = VA.el("td", "tvcell tvcell--name tvsub__name");
    // Over PART, DESCRIPTION, # and ELEMENT, starting inside its own bracket.
    name.setAttribute("colspan", "4");
    name.style.paddingLeft = indent + "px";
    if (entry.count > 0) {
      var caret = VA.el("span", "tvsub__caret", entry.open ? "▾" : "▸");
      name.appendChild(caret);
      el.setAttribute("aria-expanded", entry.open ? "true" : "false");
    }
    name.appendChild(VA.el("span", "tvsub__title", entry.name));
    if (entry.detail) name.appendChild(VA.el("span", "muted tvsub__detail", " · " + entry.detail));
    name.setAttribute("title", entry.name + (entry.detail ? " · " + entry.detail : ""));
    el.appendChild(name);
    el.appendChild(VA.el("td", "tvcell tvcell--nominal num", entry.nominal));
    el.appendChild(VA.el("td", "tvcell tvcell--min num", entry.min));
    el.appendChild(VA.el("td", "tvcell tvcell--max num", entry.max));
    el.appendChild(VA.el("td", "tvcell tvcell--sensitivity num", entry.sensitivity));
    el.appendChild(VA.el("td", "tvcell tvcell--contribution num tvsub__total",
      entry.contribution));
    var cell = sourcingCell(entry.gap
      ? { key: "no_value", words: entry.detail || VA.sourcingMarkWords("no_value") } : null);
    if (entry.gap && ctx.onCardShow && ctx.kinematicStudy) {
      // The gap's mark opens the card that says what would resolve it
      // (VA.kinematicGapCard).
      var gapMark = cell.mark;
      gapMark.className += " cardtrig";
      gapMark.onmouseenter = function () {
        ctx.onCardShow(VA.kinematicGapCard(ctx.kinematicStudy,
          { study: entry.id, name: entry.name }, ctx.topoProj), gapMark);
      };
    }
    el.appendChild(cell);
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", entry.name);
    el.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.preventDefault) event.preventDefault();
      toggle();
    };
    return el;
  }

  // A kinematic stack's foot: the stop's own fold under the rows it folds,
  // then its verdict -- the chain foot's two blocks, from the projection's
  // own numbers (VA.kinematicStack's `result`).
  function stackFoot(stack) {
    var r = stack.result;
    var foot = VA.el("tfoot", "tvfoot");
    var total = footRow("tvtotal--worst_case", 1, "totals");
    var label = VA.el("td", "tvcell tvcell--name tvtotal__label", r.label);
    label.setAttribute("title", r.label + " · " + r.rss);
    total.appendChild(label);
    total.appendChild(VA.el("td", "tvcell tvcell--nominal num", r.nominal));
    total.appendChild(VA.el("td", "tvcell tvcell--min num"));
    total.appendChild(VA.el("td", "tvcell tvcell--max num"));
    total.appendChild(VA.el("td", "tvcell tvcell--sensitivity num"));
    total.appendChild(VA.el("td", "tvcell tvcell--contribution num",
      VA.stackFootText(r, stack)));
    total.appendChild(sourcingCell(null));
    foot.appendChild(total);
    var v = r.verdict;
    if (v) {
      var tr = footRow("tvtotal--margin", 1, "verdict");
      var cell = VA.el("td", "tvcell tvcell--name tvtotal__label");
      cell.appendChild(verdictChip({ state: v.verdict, word: v.verdict, title: v.title,
                                     incomplete: v.incomplete }));
      cell.appendChild(VA.el("span", "tvtotal__check", v.label || v.stopLabel));
      cell.setAttribute("title", v.label || v.stopLabel);
      tr.appendChild(cell);
      var margin = VA.el("td", "tvcell num tvtotal__margin", v.marginText);
      margin.setAttribute("colspan", "4");
      tr.appendChild(margin);
      tr.appendChild(criterionCell(v.limitText || "", v.scopeChip, v.scopeTitle));
      tr.appendChild(sourcingCell(null));
      foot.appendChild(tr);
    }
    return foot;
  }

  // --- the totals: footer rows of the contributions grid -------------------
  //
  // Jeff, 2026-09-22, on the strip of pills this replaces: "The components of
  // the stack are already arranged into a table/grid, simply put the
  // computed/rolled up values in the same grid at the bottom, like a balance
  // sheet/invoice etc."
  //
  // Literally the same grid, and that is the point rather than a shortcut: a
  // total under the column it totals needs no label saying which column it
  // belongs to, which is most of what the old strip's chip text was for
  // ("worst case 2.3296 … 4.3098 mm" is three columns and a units chip once
  // the row is in the table). The numbers are VA.studyTotalRows' and
  // VA.studyMarginRows'; nothing is computed here.
  //
  // It is a <tfoot> of the BODY table and not a third table: `table-layout:
  // fixed` plus the shared <colgroup> is what makes the cells line up with the
  // member rows above, and a separate table in the pane below would be a
  // second set of widths to keep in step with a column a reader can drag.
  //
  // Nothing about the rails changes. These rows sit BELOW the last member row,
  // so no leader's seam moves, and the grid block's own centring offset is
  // computed from the plan's row count (VA.rowPositions), not from the
  // table's rendered height.
  function totalsFoot(study) {
    if (!study || study.status !== "ok") return null;
    var totals = VA.studyTotalRows(study);
    var margins = VA.studyMarginRows(study);
    if (!totals.length && !margins.length) return null;
    var foot = VA.el("tfoot", "tvfoot");
    totals.forEach(function (total, i) {
      foot.appendChild(totalRow(total, i === 0 ? totals.length : 0));
    });
    // A study with no authored check still gets a bottom line: "nobody has
    // written down what this has to be" is an answer, and a blank there reads
    // as a pass (VA.studyVerdict's own reason for having a `none` state).
    var verdict = VA.studyVerdict(study);
    if (!margins.length) {
      foot.appendChild(noCriterionRow(verdict));
      return foot;
    }
    margins.forEach(function (row, i) {
      foot.appendChild(marginRow(row, i === 0 ? margins.length : 0));
    });
    return foot;
  }

  // One footer row, opened by the merged section cell the member rows' own
  // component column already taught the reader to read: said once, spanning
  // its block. `section` is the block's row count on its first row, 0 after.
  function footRow(cls, section, sectionLabel) {
    var tr = VA.el("tr", "tvtotal " + cls);
    tr.style.height = M.rowHeight + "px";
    if (section) {
      // Over PART and DESCRIPTION.
      var cell = VA.el("td", "tvcell tvcell--part tvtotal__section",
        sectionLabel);
      cell.setAttribute("colspan", "2");
      // Inside the study's own bracket, the one group a foot row sits in.
      cell.style.paddingLeft = (4 + VA.GRID_BRACE.inset) + "px";
      if (section > 1) cell.setAttribute("rowspan", String(section));
      tr.appendChild(cell);
    }
    tr.appendChild(VA.el("td", "tvcell tvcell--ord"));
    return tr;
  }

  function totalRow(total, section) {
    var tr = footRow("tvtotal--" + total.key, section, "totals");
    var label = VA.el("td", "tvcell tvcell--name tvtotal__label", total.label);
    label.setAttribute("title", total.title);
    tr.appendChild(label);
    // Each number carries itself as its title: the columns are measured to
    // hold every total, and a total wider than that is still readable whole.
    var num = function (cls, text) {
      var cell = VA.el("td", "tvcell tvcell--" + cls + " num", text);
      if (text) cell.setAttribute("title", text);
      tr.appendChild(cell);
    };
    num("nominal", total.center);
    num("min", total.min);
    num("max", total.max);
    num("sensitivity", "");
    num("contribution", total.half + " " + total.units);
    tr.appendChild(sourcingCell(null));
    return tr;
  }

  // The bottom line: the verdict word, what the check is about, by how much,
  // and against what.
  //
  // WHY THE MARGIN AND NOT THE CRITERION GETS THE VALUE COLUMNS. The margin is
  // this row's ANSWER, so it lands right-aligned at the same edge the
  // worst-case row's own last number lands on -- the amount column of an
  // invoice, which is the whole idiom. It spans all three because it is
  // neither a centre nor a bound: which of min/max a criterion bites on
  // depends on the criterion's own direction, and a page that put the number
  // under one of them would be stating a reading of the operator rather than
  // printing the record. The criterion itself is the row's premise and is
  // quieter, so it takes the column a member row's own contribution occupies.
  //
  // The verdict chip is IN the name cell rather than in the merged section
  // cell beside it, and that is not a layout preference: a study may carry
  // more than one check (`pitch_system_end_stop_minus7` carries two, and they
  // do not agree), so a verdict merged over the block would be one row's
  // answer printed over another's.
  function marginRow(row, section) {
    var tr = footRow("tvtotal--margin", section, "verdict");
    var label = VA.el("td", "tvcell tvcell--name tvtotal__label");
    label.appendChild(verdictChip({
      state: row.verdict, word: row.verdict, title: row.title,
      incomplete: row.incomplete,
    }));
    label.appendChild(VA.el("span", "tvtotal__check", row.label));
    label.setAttribute("title", row.label);
    tr.appendChild(label);
    var margin = VA.el("td", "tvcell num tvtotal__margin", row.marginValue);
    margin.setAttribute("colspan", "4");
    margin.setAttribute("title", row.marginText);
    tr.appendChild(margin);
    tr.appendChild(criterionCell(row.criterionText || "", row.scopeChip, row.scopeTitle));
    tr.appendChild(sourcingCell(null));
    return tr;
  }

  function noCriterionRow(verdict) {
    var tr = footRow("tvtotal--margin tvtotal--nocriterion", 1, "verdict");
    var label = VA.el("td", "tvcell tvtotal__label",
      verdict ? verdict.word : "");
    label.setAttribute("colspan", "6");
    if (verdict) label.setAttribute("title", verdict.title);
    tr.appendChild(label);
    tr.appendChild(sourcingCell(null));
    return tr;
  }

  // A check's criterion, in the column a member row's contribution sits in,
  // with its scope (`BUDGET`) as the cell's first word: the sourcing column
  // it used to sit in is one icon wide now. The whole of it on hover.
  function criterionCell(text, scope, scopeTitle) {
    var cell = VA.el("td", "tvcell tvcell--contribution num tvtotal__criterion");
    if (scope) cell.appendChild(VA.chip("chip--budget", scope, scopeTitle));
    cell.appendChild(VA.el("span", null, text));
    cell.setAttribute("title", (scope ? scope + " · " : "") + text);
    return cell;
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

  // A grid row is a mark like a dot or a bar: focusable, named by its
  // record's title, previewed on focus (hotHover) and kept by Enter or Space,
  // so the keyboard reaches the Preview the way the pointer does.
  function nameRow(el, ctx, kind, id, name) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", name);
    el.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.target && event.target !== el) return;
      if (event.preventDefault) event.preventDefault();
      ctx.onSelect(kind, id);
    };
    return el;
  }

  // The PART and DESCRIPTION cells (VA.partColumns): one pair per row, so
  // every row's part cell is part of the row and selects it, with the words
  // on a part's first row only -- the part is said once and its bracket or
  // rule says where it ends. Where its bracket is drawn the number is the
  // bracket's label (`bracketed`), so the cell prints none. Whatever the
  // column clips is on hover, and the Preview of any of its rows has the
  // part's name, drawing and picture.
  function partCells(el, group, first, indent, index, bracketed, ctx, folded) {
    var words = first ? VA.partColumns(group.part === null ? null
      : (index.parts[group.part] || { id: group.part })) : null;
    var number = VA.el("td", "tvcell tvcell--part");
    // With no bracket to carry it, the number itself is indented a level per
    // assembly it is in, and an assembly's fold leads it
    // (a_part_may_contain_parts); a bracket carries both where it is drawn.
    var depth = group.part === null ? 0 : VA.partDepth(index.parts, group.part);
    number.style.paddingLeft = (indent + (bracketed ? 0 : depth * VA.GRID_BRACE.nest)) + "px";
    if (words && !bracketed) {
      if (ctx && VA.assemblyIds(ctx.topoProj)[group.part]) {
        var caret = assemblyCaret(group.part, !folded, ctx);
        if (caret) number.appendChild(caret);
      }
      number.appendChild(VA.el("span", null, words.number));
    }
    var description = VA.el("td", "tvcell tvcell--description",
      words ? words.description : "");
    if (words && (group.title || group.label)) {
      number.setAttribute("title", group.title || group.label);
      description.setAttribute("title", group.title || group.label);
    }
    el.appendChild(number);
    el.appendChild(description);
  }

  function edgeRow(planRow, group, first, index, chain, marking, ctx, hot, indent, bracketed) {
    var edge = index.edges[planRow.id];
    var hit = chain[planRow.id];
    var term = planRow.term || null;
    var el = baseRow("edge", ctx, planRow.id);
    if (term) el.className += " tvrow--depth-" + term.depth;
    if (first) el.className += " tvrow--group-start";
    // A kinematic term's sourcing is its band's (VA.kinematicStack's
    // `confidence`); every other row's is its edge's own. It is the row's
    // mark (VA.rowSourcingMark), not a tint: the brackets, and under Colour
    // by Body its body's ink, are the only things a row's background says.
    if (ctx.colourBy === "body" && planRow.body !== null && planRow.body !== undefined) {
      el.className += " tvrow--ink tv__fill--t" + VA.bodyTint(ctx.topoProj, planRow.body);
    }
    var confidence = term && term.confidence ? term.confidence : edge ? edge.confidence : null;
    if (edge && edge.kind === "gap") el.className += " tvrow--gap";
    if (edge && edge.value_source === "derived") el.className += " tvrow--derived";
    if (edge && edge.zero_width) el.className += " tvrow--zero-width";
    if (edge && edge.part && ctx.otherVariantParts && ctx.otherVariantParts[edge.part]) {
      el.className += " tvrow--other-variant";
      el.setAttribute("title", VA.OTHER_VARIANT_NOTE);
    }
    // No on/off marking on a grid row any more (viewer_respine_whole_walk):
    // with a study selected the table IS the chain, so every row in it is a
    // member and a faded non-member row is not a thing this grid can hold.
    // The dimming moved to where the non-members still are — the rails.
    if (planRow.closes) el.className += " tvrow--closes";
    if (isSelected(ctx, "edge", planRow.id)) el.className += " tvrow--selected";
    else if (isTouched(ctx, "edge", planRow.id)) el.className += " tvrow--touched";

    partCells(el, group, first, indent, index, bracketed, ctx, false);

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

    // The element name, as authored: the feature-to-feature span in the part's
    // own words (docs/SOP_TOLERANCE_STACK.md, "Titling an artifact"). The part
    // column beside it carries the part, so the name carries none and nothing
    // here shortens it -- the cell and its hover title are one phrase, and the
    // title is what a clipped cell reads in full.
    // The row's words and numbers are its record's (VA.elementRecords), the
    // one copy the Preview, the DAG's label and the 3D anchor read too.
    var record = VA.elementRecords(ctx.topoProj, VA.previewRecordOptions(ctx))[
      hotKey("edge", planRow.id)] || null;
    var fullName = record ? record.title : missing(planRow.id);
    var nameCell = VA.el("td", "tvcell tvcell--name", valueOnly ? "" : fullName);
    // A kinematic term whose band is another edge's says whose, on hover.
    var shown = term && term.values || null;
    var lender = shown && shown.bandFrom && shown.bandFrom.edge !== planRow.id
      ? shown.bandFrom : null;
    var lenderName = lender && index.edges[lender.edge] ? index.edges[lender.edge].name : null;
    var nameTitle = fullName + (lender
      ? "\nband from " + (lenderName || lender.edge) + " (dimension_ref)" : "");
    if (!valueOnly) nameCell.setAttribute("title", nameTitle);
    el.appendChild(nameCell);

    // The value cell, decomposed into three (deliverable 2): the old combined
    // "value  [min … max]" text read fine but pasted as one unsplittable cell.
    // Each number is still printed AS TRANSCRIBED (VA.fmt: no toFixed, no band
    // derived from the limits) — splitting the cell changes nothing about what
    // is printed, only how many columns it occupies.
    // A kinematic term prints the record the fold's own term built
    // (VA.kinematicRowValues), never its edge's record: the edge may have no
    // band of its own, or a convention's 0.
    var values = record && record.values;
    var valueCell = function (name, text, title) {
      var cell = VA.el("td", "tvcell tvcell--" + name + " num", text);
      if (title) cell.setAttribute("title", title);
      if (shown && shown.refused) cell.className += " muted";
      el.appendChild(cell);
    };
    if (shown) {
      valueCell("nominal", shown.nominal, shown.nominalTitle);
      valueCell("min", shown.min, shown.minTitle);
      valueCell("max", shown.max, shown.maxTitle);
    } else {
      valueCell("nominal", values ? VA.fmt(values.nominal) : "");
      valueCell("min", values ? VA.fmt(values.min) : "");
      valueCell("max", values ? VA.fmt(values.max) : "");
    }

    // The sensitivity: a kinematic term's sweep coefficient, a chain row's
    // signed ratio -- one column, both kinds of study.
    var sensitivity = VA.el("td", "tvcell tvcell--sensitivity num");
    if (term) {
      sensitivity.textContent = term.sensitivity;
      if (ctx.stack && ctx.stack.coefficientUnit) {
        sensitivity.setAttribute("title", ctx.stack.coefficientUnit);
      }
      if (term.muted) sensitivity.className += " muted";
      // ...and on hover, its curve across the whole sweep (VA.kinematicCurve),
      // in the page's one popover. Drawn the first time it is asked for.
      if (term.curve && !term.refused && ctx.onCardShow && ctx.kinematicStudy) {
        var curveCard = null;
        sensitivity.className += " tvcell--curve";
        sensitivity.onmouseenter = function () {
          if (!curveCard) {
            var curve = VA.kinematicCurve(ctx.kinematicStudy, { curve: term.curve },
              ctx.decimals, ctx.stack.stop.id);
            if (!curve) return;
            curveCard = { kind: "curve", title: fullName, curve: curve };
          }
          ctx.onCardShow(curveCard, sensitivity);
        };
      }
    } else if (hit) {
      sensitivity.textContent = (hit.contribution.sign < 0 ? "−" : "") +
        VA.fmt(hit.contribution.ratio);
    }
    el.appendChild(sensitivity);

    var contribution = VA.el("td", "tvcell tvcell--contribution num");
    if (term) {
      contribution.textContent = term.contribution +
        (term.contribution && ctx.stack.units ? " " + ctx.stack.units : "");
      contribution.setAttribute("title", "this term's worst-case share of the measure at the " +
        ctx.stack.stop.label + ": its band times its sensitivity");
    } else if (hit) {
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

    // The row's one mark (deliverable 3): the worst thing its sourcing has to
    // say, in that state's colour, or nothing. The words behind every chip
    // this cell used to carry -- the citation, the note, DERIVED, the gap,
    // the transform -- are the Preview's, one hover away on this same row.
    var mark = edge ? VA.rowSourcingMark(confidence, edge, !!(term && term.flag)) : null;
    var markCell = sourcingCell(mark);
    // A kinematic term with no band on file: its mark opens the card that
    // names what would resolve it (VA.kinematicGapCard).
    if (mark && term && term.flag && ctx.onCardShow && ctx.kinematicStudy) {
      var noBand = markCell.mark;
      noBand.className += " cardtrig";
      noBand.setAttribute("title", term.flag);
      noBand.onmouseenter = function () {
        ctx.onCardShow(VA.kinematicGapCard(ctx.kinematicStudy,
          { edge: planRow.id, name: fullName }, ctx.topoProj), noBand);
      };
    }
    el.appendChild(markCell);
    // The grid half of the shared hover state. Registered last, because every
    // branch above appends to `el.className` and the base this rewrites from
    // has to be the finished string. The row LEADS for its own edge and for
    // each interface the edge meets (a node has no row of its own, so its
    // hover lights the rows of the edges that meet there), and it is a member
    // of the leg its bar sits on, which is the lighter tint a reader sees on
    // the rest of the chain they are tracing.
    hotRegister(hot, {
      el: el, base: el.className,
      leads: [hotKey("edge", planRow.id)].concat(
        (hot.nodesOfEdge[planRow.id] || []).map(function (nodeId) {
          return hotKey("node", nodeId);
        })),
      self: [hotKey("edge", planRow.id)],
      hot: "tvrow--hot", lead: "tvrow--lead",
    });
    hotHover(hot, el, hotKey("edge", planRow.id));
    return nameRow(el, ctx, "edge", planRow.id, fullName);
  }

  // A folded assembly's one row (a_part_may_contain_parts, 2026-11-14): it
  // is the assembly -- a click selects the part, a hover lights it -- and it
  // stands for every row on the assembly and the parts inside it
  // (`planRow.rollup.edges`). Under a study its numbers are the study's own
  // fold of exactly those terms (the projection's `result.assemblies`, in
  // the totals' columns: centre, worst-case min and max, ± half), so the
  // stack's total reads the same folded or open; on the whole walk nothing
  // is totalled, and nor is this. Its mark is the worst its rows wear.
  function assemblyRow(planRow, group, index, marking, ctx, hot, indent, bracketed) {
    var partId = planRow.rollup.part;
    var edges = planRow.rollup.edges;
    var el = baseRow("part", ctx, partId);
    el.className += " tvrow--group-start tvrow--rollup";
    el.setAttribute("data-assembly", partId);
    if (ctx.colourBy === "body" && planRow.body !== null && planRow.body !== undefined) {
      el.className += " tvrow--ink tv__fill--t" + VA.bodyTint(ctx.topoProj, planRow.body);
    }
    if (isSelected(ctx, "part", partId)) el.className += " tvrow--selected";
    else if (isTouched(ctx, "part", partId)) el.className += " tvrow--touched";
    partCells(el, group, true, indent, index, bracketed, ctx, true);
    el.appendChild(VA.el("td", "tvcell tvcell--ord"));
    var names = edges.map(function (id) { return index.edges[id] ? index.edges[id].name : id; });
    var words = edges.length + (edges.length === 1 ? " dimension" : " dimensions");
    var name = VA.el("td", "tvcell tvcell--name muted", words);
    name.setAttribute("title", names.join("\n"));
    el.appendChild(name);
    var study = marking ? ctx.study : null;
    var r = study && study.status === "ok" && study.result && study.result.assemblies
      ? study.result.assemblies[partId] || null : null;
    var num = function (cls, text) {
      var cell = VA.el("td", "tvcell tvcell--" + cls + " num", text);
      if (text) cell.setAttribute("title", text);
      el.appendChild(cell);
    };
    num("nominal", r ? VA.fmt(r.nominal) : "");
    num("min", r ? VA.fmt(r.worst_case_min) : "");
    num("max", r ? VA.fmt(r.worst_case_max) : "");
    num("sensitivity", "");
    num("contribution", r ? "± " + VA.fmt(r.worst_case_half) + " " + r.units : "");
    var worst = null;
    edges.forEach(function (id) {
      var edge = index.edges[id];
      var mark = edge ? VA.rowSourcingMark(edge.confidence, edge, false) : null;
      if (mark && (!worst || VA.SOURCING_MARKS.indexOf(mark.key) < VA.SOURCING_MARKS.indexOf(worst.key))) {
        worst = mark;
      }
    });
    el.appendChild(sourcingCell(worst));
    hotRegister(hot, {
      el: el, base: el.className,
      leads: [hotKey("part", partId)].concat(edges.map(function (id) { return hotKey("edge", id); })),
      self: [hotKey("part", partId)],
      hot: "tvrow--hot", lead: "tvrow--lead",
    });
    hotHover(hot, el, hotKey("part", partId));
    return nameRow(el, ctx, "part", partId,
      (index.parts[partId] ? VA.componentLabel(index.parts[partId]) : partId) + " · " + words);
  }

  // Which tier of the page's selection a drawn thing is in (hover_and_select_
  // light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque):
  // `ctx.selectedKeys` is the resolver's {own, touching} key lists for the
  // selected entity (VA.focusElementKeysOf), so a selected part marks its
  // container, its dots and its bars `--selected` and its neighbours'
  // interfaces `--touched`. A ctx with no key lists (a bare render) reads the
  // one selected element as the own tier, as before.
  function selectedTier(ctx, kind, id) {
    var key = hotKey(kind, id);
    var keys = ctx.selectedKeys;
    if (keys) {
      if ((keys.own || []).indexOf(key) !== -1) return VA.FOCUS_TIERS.own;
      if ((keys.touching || []).indexOf(key) !== -1) return VA.FOCUS_TIERS.touching;
      return null;
    }
    return ctx.selection && ctx.selection.kind === kind && ctx.selection.id === id
      ? VA.FOCUS_TIERS.own : null;
  }

  function isSelected(ctx, kind, id) {
    return selectedTier(ctx, kind, id) === VA.FOCUS_TIERS.own;
  }

  function isTouched(ctx, kind, id) {
    return selectedTier(ctx, kind, id) === VA.FOCUS_TIERS.touching;
  }

  // A container's or a bracket's state classes, from its base class name.
  function tierClasses(ctx, cls, kind, id) {
    var tier = selectedTier(ctx, kind, id);
    return tier === VA.FOCUS_TIERS.own ? " " + cls + "--selected"
      : tier === VA.FOCUS_TIERS.touching ? " " + cls + "--touched" : "";
  }

  // A part's field or block and a body's field are selectable and hoverable
  // containers (rule 3 of the 2026-11-12 handoff): the pointer on the border
  // hovers the part or the body (the page's one hover, through onHot), a
  // click selects it. Hover and selection light them through the same
  // registry as every mark (`part|<id>`, `body|<id>`).
  function wireContainer(node, ctx, hot, kind, id, name, cls) {
    hotRegister(hot, { el: node, base: node.getAttribute("class"),
      self: [hotKey(kind, id)], hot: cls + "--hot", lead: cls + "--lead" });
    hotHover(hot, node, hotKey(kind, id));
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", name || String(id));
    node.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      if (ctx.onSelect) ctx.onSelect(kind, id);
    };
    node.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.preventDefault) event.preventDefault();
      if (ctx.onSelect) ctx.onSelect(kind, id);
    };
    return node;
  }

  function missing(id) {
    return id + " — the layout names an id the topology does not declare";
  }

  // --- the study summary pane ----------------------------------------------
  //
  // Everything a study's answer needs that is NOT a number in the grid's own
  // totals rows (viewer_summary_balance_sheet, 2026-09-22). Jeff, looking at
  // what stood here: "the entire page is still extremely busy and difficult to
  // make sense of ... Still tons of long-winded text explanations, very
  // unconventional and confusing layout (the weird ribbon of random values in
  // circled elements at the top, no real thought put into the explanations)."
  //
  // So this pane holds three things and no prose between them:
  //
  //   * the FINDINGS table -- one row per thing that makes this answer less
  //     than its digits suggest, each with the author's own rationale one
  //     disclosure deep. It replaced two generated paragraphs (see
  //     findingsTable);
  //   * CARDS of parameter/value pairs -- the measurement basis, and each
  //     check's own configuration. "Like the way a single row of a database
  //     table would be displayed on a card in a webui";
  //   * the assembly-wide gap panel, unchanged.
  //
  // The numbers left, one block up: VA.studyTotalRows and VA.studyMarginRows
  // render as footer rows of the contributions grid (totalsFoot, above), which
  // is where the verdict word now sits too. Nothing on this page is added up
  // in JavaScript, here or there.
  VA.renderTopoTotals = function (root, topoProj, study, index) {
    VA.clear(root);
    root.className = "tvtotals";
    if (!study) {
      root.appendChild(VA.el("p", "muted tvtotals__empty",
        "Pick a study to see a path highlighted on the rails and its totals here. " +
        "A study is a HUMAN-lassoed chain: this page reports where the forks are " +
        "and never chooses one."));
      // The gap panel is a fact about the TOPOLOGY, not about the selected
      // study, so it is on screen before one is picked — which is also the
      // state a reader arrives in.
      root.appendChild(gapsPanel(topoProj));
      return root;
    }

    // The study's own name, with its id on the heading's hover rather than
    // printed beside it — the rule the node pane, the edge pane, the element
    // pane and the nav rail all already follow: an id is a deep-link handle,
    // not a label. It was a `<code>` in the strip this replaces.
    var head = VA.el("h2", "tvsum__title", study.title);
    head.setAttribute("title", study.id);
    root.appendChild(head);

    if (study.status !== "ok") {
      root.appendChild(errorBlock(study));
      root.appendChild(gapsPanel(topoProj));
      return root;
    }

    var open = openTermsFold(study, index);
    if (open) root.appendChild(open);
    var findings = VA.studyFindings(study, index);
    if (findings.length) root.appendChild(findingsTable(findings));
    root.appendChild(basisCard(study, index));
    VA.studyMarginRows(study).forEach(function (row) {
      var card = checkCard(row);
      if (card) root.appendChild(card);
    });

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
    root.appendChild(gapsPanel(topoProj));
    return root;
  };

  // The study's own `incomplete` badge, with the terms that earn it one
  // disclosure deep, each a link to the term. It is the study-level fold of
  // every term (VA.studyCompleteness), so it shows for a study with no checks
  // exactly as for one with them; a complete study renders nothing.
  function openTermsFold(study, index) {
    var found = VA.studyCompleteness(study, index);
    if (!found) return null;
    var box = VA.el("details", "tvopen");
    var summary = VA.el("summary", "tvopen__summary");
    summary.appendChild(VA.chip("tvflag tvflag--incomplete", found.text, found.title));
    box.appendChild(summary);
    var list = VA.el("ul", "tvopen__list");
    found.terms.forEach(function (term) {
      var link = VA.el("a", "tvopen__term", term.name);
      link.setAttribute("href", VA.viewerLink({
        topology: study.topology, study: study.id, edge: term.id }));
      list.appendChild(VA.el("li", null, link));
    });
    box.appendChild(list);
    return box;
  }

  // --- the findings table --------------------------------------------------
  //
  // One row per finding: WHAT it is, WHY it is a finding in one phrase, and
  // the rest behind the row's own disclosure. It replaced two generated
  // paragraphs, and both are worth naming because they are the acceptance
  // cases this table was written against:
  //
  //   * "This answer does not include everything the joint needs, so it is a
  //     budget for what is missing rather than a verdict on the hardware.
  //     Missing: • <a 90-word authored term>" -- the preamble was the page's
  //     own prose and is gone (the BUDGET chip on the verdict row and the
  //     `not folded into the total` phrase here say it in three words each);
  //     the term is the AUTHOR's and is here in full, split at its own ` -- `
  //     into a name and a rationale (VA.splitAuthoredFinding). Only an
  //     EXCLUDED TERM is split that way: a chain row's name carries ` -- ` as
  //     a naming convention and arrives whole (VA.STUDY_FINDING_SOURCES'
  //     `reasonSplit`, 2026-09-22).
  //   * "3 dimensions in this chain are unverified — nothing readable stands
  //     behind them: <three names joined by semicolons>." -- a generated
  //     sentence that was a list wearing a sentence's clothes. It is three
  //     rows now, and the count is the row count.
  //
  // NOTHING is dropped: every finding's full authored text is in its fold,
  // word for word, next to what would close a gap of its kind.
  function findingsTable(findings) {
    var section = VA.el("section", "tvfind");
    var table = VA.el("table", "tvfind__table");
    var body = VA.el("tbody");
    findings.forEach(function (finding) {
      body.appendChild(findingRow(finding));
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function findingRow(finding) {
    var tr = VA.el("tr", "tvfind__row tvfind__row--" + finding.kind);
    var what = VA.el("td", "tvfind__what");
    // `<details>` inside the NAME cell rather than a column of its own: the
    // marker then sits where the reader's eye already is, and an opened row
    // spends the table's whole width on the rationale instead of one column's.
    var box = VA.el("details", "tvfind__more");
    var summary = VA.el("summary", "tvfind__name", finding.name);
    // The whole authored text on the hover, so the name is never the only
    // copy a reader who cannot open a fold gets to see.
    summary.setAttribute("title", finding.whole);
    box.appendChild(summary);
    if (finding.rationale) {
      box.appendChild(VA.el("p", "tvfind__why", finding.rationale));
    }
    box.appendChild(VA.el("p", "muted tvfind__closes", finding.closes));
    what.appendChild(box);
    tr.appendChild(what);
    tr.appendChild(VA.el("td", "tvfind__says", finding.says));
    return tr;
  }

  // --- the cards -----------------------------------------------------------
  //
  // "Anything that doesn't fit neatly into the main table can go in additional
  // tables and/or a 'card' with parameter/value pairs (like the way a single
  // row of a database table would be displayed on a card in a webui)" (Jeff,
  // 2026-09-22). Both cards below are exactly that: a `<dl>`, no sentences.

  // What the totals are totals OF. The two ends, how many terms, in what
  // units, and how well the weakest of them is sourced -- the last of which
  // was the strip's `weakest input: UNTRACED` chip.
  function basisCard(study, index) {
    var card = VA.el("section", "tvcard");
    card.appendChild(VA.el("h4", "tvcard__head", "What was measured"));
    var dl = VA.el("dl", "kv");
    VA.studyBasis(study, index).forEach(function (pair) {
      var dt = VA.el("dt", null, pair.label);
      if (pair.title) dt.setAttribute("title", pair.title);
      dl.appendChild(dt);
      // A confidence is a CHIP everywhere else in this app (the elements
      // table, both preview panes, the grid's own sourcing cell), and the
      // colour rules that carry its meaning are written against `.chip` --
      // so the one pair that states one gets a chip rather than a coloured
      // string that would silently render grey.
      dl.appendChild(pair.confidence
        ? VA.el("dd", null, VA.chip(VA.confidenceClass(pair.confidence),
            pair.value, pair.title))
        : VA.el("dd", "kv__value", pair.value));
    });
    card.appendChild(dl);
    return card;
  }

  // One check's own configuration, and the argument behind it. The criterion,
  // the margin and the verdict are NOT here -- they are the grid's bottom
  // line, and a card repeating them would be the third place this page states
  // the same number.
  //
  // `VA.kvList` is views/stack.js's free-form block renderer, the one place in
  // this app that turns an authored key/value block into reader-facing text
  // (it humanises the key, says "not recorded" rather than "null", and never
  // prints a JSON blob). A check's `configuration` is the same kind of block
  // as a stack's `joint`, so it goes through the same renderer rather than a
  // second copy of those three decisions.
  function checkCard(row) {
    var keys = Object.keys(row.configuration || {});
    if (!keys.length && !row.guidance) return null;
    var card = VA.el("section", "tvcard");
    card.appendChild(VA.el("h4", "tvcard__head", row.label));
    if (keys.length) card.appendChild(VA.kvList(row.configuration));
    if (row.guidance) {
      var why = VA.disclosure("Why", "tvcard__why");
      why.body.appendChild(VA.el("p", null, row.guidance));
      card.appendChild(why.box);
    }
    return card;
  }

  // The rollup badge, in one shape for all five states — a verdict word, the
  // two states a verdict cannot express, and the unknown-word fallback. Never
  // blank: a study with no recorded criterion says so, because a blank badge
  // and a passing one look identical at a glance, which is the reading this
  // whole block exists to stop.
  function verdictChip(verdict) {
    if (!verdict) return VA.el("span", "muted", "");
    var chip = VA.chip("tvverdict tvverdict--" + verdict.state,
      verdict.word, verdict.title);
    if (verdict.incomplete) chip.className += " tvverdict--qualified";
    return chip;
  }

  // "What's missing" for the whole topology (deliverable 4). Grouped, collapsed,
  // and counted in the summary line: pitch_system carries 38 gap rows, and 38
  // lines always-open is a wall nobody reads — but a count in a heading is a
  // number a reader can act on. Every row's words come from the projection; the
  // heading and the way out come from VA.GAP_KINDS.
  function gapsPanel(topoProj) {
    var panel = VA.el("section", "tvgaps");
    var groups = VA.topologyGapGroups(topoProj);
    if (!groups.length) {
      panel.appendChild(VA.el("p", "muted tvgaps__none",
        "Nothing is recorded as missing for this assembly."));
      return panel;
    }
    var total = groups.reduce(function (n, group) { return n + group.gaps.length; }, 0);
    var box = VA.el("details", "tvgaps__box");
    var summary = VA.el("summary", "tvgaps__summary");
    summary.appendChild(VA.el("span", "tvgaps__summarytext", "What's missing"));
    summary.appendChild(VA.chip("tvflag tvflag--incomplete", String(total)));
    box.appendChild(summary);
    groups.forEach(function (group) {
      var section = VA.el("div", "tvgaps__group");
      var head = VA.el("h4", "tvgaps__heading",
        group.heading + " (" + group.gaps.length + ")");
      section.appendChild(head);
      section.appendChild(VA.el("p", "muted tvgaps__closes", group.closes));
      var list = VA.el("ul", "tvgaps__list");
      group.gaps.forEach(function (gap) {
        var item = VA.el("li", "tvgaps__item");
        if (gap.edge_name) {
          item.appendChild(VA.el("span", "tvgaps__where", gap.edge_name));
        } else if (gap.hardware_id) {
          item.appendChild(VA.el("span", "tvgaps__where", gap.hardware_id));
        }
        item.appendChild(VA.el("span", "tvgaps__text",
          gap.edge_name && gap.edge_name === gap.text ? "" : gap.text));
        list.appendChild(item);
      });
      section.appendChild(list);
      box.appendChild(section);
    });
    panel.appendChild(box);
    return panel;
  }

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

  // The Preview (a_preview_pane_replaces_the_hover_popups_and_one_record_
  // backs_every_mark): ONE element's record -- whatever is hovered on any
  // tier, else whatever is frozen (selected) -- rendered from the record and
  // from nothing else (VA.elementRecord, element_record.js). The 3D anchor,
  // the DAG mark and the grid row of one element therefore present the same
  // facts, because there is only one copy of them to present.
  //
  // `ctx.previewKey` names the element to show (`node|<id>` / `edge|<id>`);
  // absent, the selection is. `ctx.record` short-cuts the lookup where the
  // caller already holds the page's records.
  VA.renderTopoDetail = function (root, ctx) {
    VA.clear(root);
    root.className = "detail";
    var key = ctx.previewKey ||
      (ctx.selection ? VA.elementKey(ctx.selection.kind, ctx.selection.id) : null);
    if (!key) {
      root.appendChild(VA.el("p", "muted", VA.PREVIEW_EMPTY_TEXT));
      return root;
    }
    var record = ctx.record !== undefined ? ctx.record
      : VA.elementRecord(ctx.topoProj, key, VA.previewRecordOptions(ctx));
    if (!record) {
      var parsed = VA.parseElementKey(key);
      root.appendChild(VA.el("p", "muted", missing(parsed ? parsed.id : key)));
      return root;
    }
    if (record.kind === "node") renderNodeDetail(root, record, ctx);
    else renderEdgeDetail(root, record, ctx);
    return root;
  };

  // The one line an empty Preview carries.
  VA.PREVIEW_EMPTY_TEXT = "Point at a dot, a bar or a row to preview it here; " +
    "click to keep it.";

  // What a pane's ctx hands the record builder: the same inputs the page
  // builds its records from (topology_app.js), so a fast-tier render and the
  // page agree about which study's contribution a record carries.
  VA.previewRecordOptions = function (ctx) {
    return {
      crops: ctx.crops || null,
      study: ctx.study || null,
      kinematicStudy: ctx.kinematicStudy || null,
      decimals: ctx.decimals,
      bandEdges: ctx.bandEdges || null,
    };
  };

  function renderNodeDetail(root, record, ctx) {
    root.appendChild(paneHead(record.title, record.id));

    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.chip("chip--kind", record.elementKind));
    if (record.jointKind) chips.appendChild(VA.chip("chip--kind", VA.interfaceKindWord(record.jointKind)));
    chips.appendChild(VA.chip("chip--kind", record.degree + " edge(s)"));
    if (record.branch) {
      chips.appendChild(VA.chip("chip--branch", "BRANCH POINT",
        "a study reaching this node with two unconsumed selected edges raises " +
        "BranchAmbiguity, naming both. Which path binds is a mechanics question " +
        "this tool does not answer."));
    }
    root.appendChild(chips);

    // This node's SIDES, derived from the edges actually incident on it
    // (the record's `sides`, VA.nodeAdjacentParts) -- what the leader rule
    // reads -- NOT the document's own `parts` list. In the parts' own names.
    //
    // It printed `node.parts` until handoff surfaces_that_state_something_
    // false, and on 74 of the 119 live nodes the same dot answered differently
    // hovered and clicked. (That is the STRING count, which is what "answered
    // differently" means; 54 is the smaller count of nodes that differ as a
    // SET. The other 20 name the same two parts in the opposite order --
    // authoring order against first-seen-edge order -- and a reader looking at
    // two orders of two names is still reading two different answers. Every
    // digit in this paragraph, and the README's copy of the first sentence,
    // is re-derived from the live projection by apps/viewer/tests.js's
    // "[real] every live dot answers the SAME on hover and on click" -- the
    // noun included, because the set count shipped under the string count's
    // wording for a day and a pairing that only checked "some number" would
    // have passed it.)
    // Neither list was wrong: a node against a `gap` edge has a clearance for
    // a side, and a clearance is not a part, so an authored parts list cannot
    // name one. Since 2026-10-30 hover and click are one surface (the
    // Preview), and the record is the one derivation behind it.
    var sides = record.sides.map(function (side) { return side.label; });
    root.appendChild(VA.el("div", "detail__where", "on " + sides.join(" ⇔ ")));

    // Whether this interface got a leader line, and why: the omission rule is
    // the component grouping, so the pane says which side of it this node is
    // on rather than leaving a missing leader to read as a rendering gap.
    root.appendChild(VA.el("p", "detail__crop-reason", record.internal
      ? "An internal interface: every dimension meeting here belongs to one " +
        "part, so no leader line is drawn — leaders mark component " +
        "boundaries only."
      : "A component boundary: its leader line marks that seam in the grid."));
    if (record.note) root.appendChild(VA.el("div", "detail__note", record.note));

    if (record.citation) {
      root.appendChild(citation(record.citation, record.confidence));
    }

    // Each side's part, in what identifies it (VA.renderPartSource) and its
    // own picture where it has one (the part's first resolved crop): what the
    // dot's and the merged cell's hover cards used to carry, at a legible
    // size. A clearance is named above and has no part to show; a part with no
    // crop shows no picture -- absent is absent.
    var parts = record.sides.filter(function (side) { return side.id; });
    if (parts.length) {
      var box = VA.el("div", "detail__sides");
      parts.forEach(function (side) {
        var figure = VA.el("div", "detail__side");
        var config = ctx.config || VA.CONFIG;
        figure.appendChild(VA.renderPartName(side, config, "div", "detail__sublabel"));
        var older = VA.renderOlderRuns(side, config);
        if (older) figure.appendChild(older);
        var source = VA.renderPartSource(side);
        if (source) figure.appendChild(source);
        if (side.thumb) {
          figure.appendChild(VA.cropFigure(side.thumb.entry,
            ctx.cropImages ? ctx.cropImages[side.thumb.entry.png] : null,
            "detail__crop-img"));
        }
        box.appendChild(figure);
      });
      root.appendChild(box);
    }
    root.appendChild(VA.el("p", "detail__crop-reason",
      "An interface is a location, not a value — there is no dimension and no " +
      "crop behind it. The dimensions are the edges either side of this row."));
  }

  // What identifies a part, said once: its drawing (less the number its name
  // already carries, VA.componentDrawingText), or for a part with no drawing
  // the documents its own rows cite -- and a standard part says so. Jeff,
  // 2026-09-15: "'no drawing recorded for this part' on a COTS fastener --
  // wrong and meaningless; say what's true". A part with neither gets no line
  // at all. Each reference says for itself whether the numbers read off it are
  // verified (VA.referenceText), and the line carrying the word explains it.
  VA.renderPartSource = function (part) {
    if (!part || !part.id) return null;
    if (part.drawing) return VA.el("div", "detail__partsource", part.drawing);
    if (!part.references || !part.references.length) return null;
    var line = VA.el("div", "detail__partsource",
      (part.standardPart ? "standard part — dimensions from " : "dimensions from ") +
      part.references.map(VA.referenceText).join("; "));
    if (part.references.some(function (r) { return r.unverified; })) {
      line.setAttribute("title", VA.ATTENTION.unverified.title);
    }
    return line;
  };

  // A part's name with its drawing behind it (the record's `runs`, handoff
  // a_part_links_to_its_drawing_before_it_has_a_tolerance). Jeff, 2026-11-12:
  // the shortcut to a part's drawing should be there before any tolerance is
  // assigned, "since you already know the part number". So the part number
  // links to the newest drawing-checker run of the part's own drawing, in a
  // new tab, with that run's revision beside it. With no run of its own and a
  // run of another dash number of it, the part's name stays plain and that
  // run is offered after it, marked as not the part's own -- a display
  // choice, never a citation. With neither, the name is plain text and
  // nothing else is drawn.
  VA.DIFFERENT_DASH_TEXT = "(different dash number)";

  function runLink(run, url, text) {
    var link = VA.el("a", "detail__runlink", text);
    link.setAttribute("href", url);
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener");
    link.setAttribute("title", "drawing " + run.drawing +
      (run.revision ? " " + VA.revisionText(run.revision) : "") +
      ", checked " + run.date + " — opens in drawing-checker");
    return link;
  }

  function partRuns(part, config) {
    var runs = part && part.runs;
    var url = runs && runs.newest ? VA.runUrl(config, runs.newest) : null;
    return url ? { runs: runs, url: url } : null;
  }

  VA.renderPartName = function (part, config, tag, cls) {
    var box = VA.el(tag, cls);
    var hit = partRuns(part, config);
    if (!hit) {
      box.textContent = part.label;
      return box;
    }
    var runs = hit.runs;
    if (runs.own) {
      box.appendChild(runLink(runs.newest, hit.url, runs.number));
      if (runs.name) box.appendChild(VA.el("span", null, " " + runs.name));
    } else {
      box.appendChild(VA.el("span", null, part.label + "  ·  "));
      box.appendChild(runLink(runs.newest, hit.url, runs.newest.drawing));
      box.appendChild(VA.el("span", "detail__runmark", " " + VA.DIFFERENT_DASH_TEXT));
    }
    if (runs.newest.revision) {
      box.appendChild(VA.el("span", "detail__runrev",
        " " + VA.revisionText(runs.newest.revision)));
    }
    return box;
  };

  // The part's older runs, behind one fold that says how many: each a link,
  // with its revision and date (and its number, where that is another dash
  // number's). null when the newest is the only one.
  VA.renderOlderRuns = function (part, config) {
    var hit = partRuns(part, config);
    if (!hit || !hit.runs.older.length) return null;
    var fold = VA.disclosure(hit.runs.older.length + " older", "runsfold");
    var list = VA.el("ul", "detail__runlist");
    hit.runs.older.forEach(function (run) {
      var text = (hit.runs.own ? "" : run.drawing + " ") +
        (run.revision ? VA.revisionText(run.revision) + " · " : "") + run.date;
      var item = VA.el("li");
      item.appendChild(runLink(run, VA.runUrl(config, run), text));
      list.appendChild(item);
    });
    fold.body.appendChild(list);
    return fold.box;
  };

  function renderEdgeDetail(root, record, ctx) {
    root.appendChild(paneHead(record.title, record.id));

    var source = VA.VALUE_SOURCES[record.valueSource];
    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.markGeneralNote(VA.chip(VA.confidenceClass(record.confidence),
      record.confidenceLabel), record.citation));
    chips.appendChild(VA.chip("chip--kind", record.elementKind));
    if (record.jointKind) chips.appendChild(VA.chip("chip--kind", VA.interfaceKindWord(record.jointKind)));
    chips.appendChild(source
      ? VA.chip("chip--source", source.label, source.title)
      : VA.chip("chip--unlabelled", record.valueSource,
                VA.valueSourceText(record.valueSource)));
    if (record.zeroWidth) {
      chips.appendChild(VA.chip("chip--zero-width", VA.ATTENTION.no_tolerance.text,
        VA.ATTENTION.no_tolerance.title));
    }
    root.appendChild(chips);

    // The part and the two interfaces, in their own names.
    var partLabel = record.part ? record.part.label : null;
    var config = ctx.config || VA.CONFIG;
    var where = VA.el("div", "detail__where");
    if (record.part) {
      where.appendChild(VA.el("span", null, "a dimension of "));
      where.appendChild(VA.renderPartName(record.part, config, "span", "detail__partname"));
    } else {
      where.appendChild(VA.el("span", null, "across a clearance"));
    }
    where.appendChild(VA.el("span", null,
      "  ·  " + record.from.label + " → " + record.to.label));
    root.appendChild(where);
    var older = record.part ? VA.renderOlderRuns(record.part, config) : null;
    if (older) root.appendChild(older);

    // On a kinematic page, a contributor whose band is another edge's
    // (VA.kinematicBandEdges): that edge, one click away, since this one may
    // carry no value of its own.
    if (record.bandEdge) {
      var band = VA.el("div", "detail__band");
      band.appendChild(VA.el("span", "muted", "band in this study: "));
      var follow = VA.el("button", "detail__bandlink", record.bandEdge.title);
      follow.onclick = function () {
        if (ctx.onSelect) ctx.onSelect("edge", record.bandEdge.id);
      };
      band.appendChild(follow);
      root.appendChild(band);
    }

    // The picture next: the Preview is the one place a crop may be large,
    // and the crop behind a citation is what a reader pointing at a row came
    // to read.
    root.appendChild(cropSection(record, ctx));

    // The way OUT to the annotator, where a binding is still wanted and the
    // part has a model to bind on (the record's `binding`): a traced/inferred
    // edge already has a citation, and a binding is identity, never a value
    // source (docs/ANNOTATION_SURFACE.md). Nothing is shown otherwise, not a
    // disabled control: the honest fix for a meshless part is installing the
    // mesh, and the row stays on the gap list either way.
    if (record.binding.params) {
      var annotateParams = record.binding.params;
      var annotateBox = VA.el("div", "detail__annotate");
      if (ctx.annotateMount && ctx.onAttach3d) {
        var attachBtn = VA.el("button", "detail__annotate-btn",
          "attach to 3D" + (partLabel ? " (" + partLabel + ")" : "") + " →");
        attachBtn.setAttribute("title",
          "flies out the 3D annotation panel with this edge selected" +
          (partLabel ? ", showing " + partLabel + " on its own" : "") +
          " -- click the correct surface(s) there to resolve which feature this is");
        attachBtn.onclick = function () { ctx.onAttach3d(annotateParams); };
        annotateBox.appendChild(attachBtn);
      } else {
        var annotateLink = VA.el("a", "detail__annotate-link",
          "annotate this" + (partLabel ? " (" + partLabel + ")" : "") + " →");
        annotateLink.setAttribute("href", VA.annotateLink(annotateParams));
        annotateLink.setAttribute("target", "_blank");
        annotateLink.setAttribute("rel", "noopener");
        annotateLink.setAttribute("title",
          "opens the 3D annotation surface with this edge selected" +
          (partLabel ? ", showing " + partLabel + " on its own" : "") +
          " -- click the correct surface(s) there to resolve which feature this is");
        annotateBox.appendChild(annotateLink);
      }
      root.appendChild(annotateBox);
    }

    if (record.values) {
      var values = VA.el("div", "detail__values");
      row(values, "nominal", VA.fmt(record.values.nominal));
      row(values, "min … max",
        VA.fmt(record.values.min) + " … " + VA.fmt(record.values.max));
      if (record.values.plusMinus !== null) {
        row(values, "as authored", VA.fmtPlusMinus(record.values.plusMinus));
      }
      if (record.values.role) row(values, "role", record.values.role);
      if (record.values.hardware) row(values, "hardware", record.values.hardware);
      root.appendChild(values);
    }

    var scaled = VA.transformWords(record.transform);
    if (scaled) root.appendChild(VA.el("div", "detail__transform", scaled));

    if (record.contribution && record.contribution.kind === "chain") {
      root.appendChild(contributionBlock(record.contribution, ctx.topoProj));
    } else if (record.contribution && record.contribution.kind === "kinematic") {
      root.appendChild(kinematicContributionBlock(record.contribution));
    }

    if (record.note) root.appendChild(VA.el("div", "detail__note", record.note));

    if (record.citation) {
      root.appendChild(citation(record.citation, record.confidence, partLabel));
      var provenance = VA.exportProvenance(record.citation, null);
      if (provenance) root.appendChild(exportBlock(provenance));
    } else if (record.uncited) {
      root.appendChild(VA.el("div", "el-export el-export--none el-export--loud",
        "This dimension cites nothing at all — nothing on record says where " +
        "the number came from."));
    }

  }

  // A preview-pane heading: the thing's own NAME, with its id on the
  // heading's hover title instead of printed beside it in a <code> chip
  // (2026-09-15 -- an id is a deep-link handle, not a label; the hover cards
  // and the stack pane took the same treatment).
  function paneHead(name, id) {
    var head = VA.el("div", "detail__head");
    var heading = VA.el("h3", null, name);
    if (id) heading.setAttribute("title", id);
    head.appendChild(heading);
    return head;
  }

  function row(box, label, value) {
    var line = VA.el("div", "detail__valrow");
    line.appendChild(VA.el("span", "detail__vallabel", label));
    line.appendChild(VA.el("span", "detail__valnum num", value));
    box.appendChild(line);
  }

  // The active chain study's reading of this edge (the record's
  // `contribution`, kind `chain`).
  function contributionBlock(hit, topoProj) {
    var c = hit.contribution;
    var box = VA.el("div", "detail__contribution");
    box.appendChild(VA.el("h4", null,
      "In this study — contribution #" + hit.ordinal));
    row(box, "crossed", VA.nodeLabel(topoProj, c.from) + " → " +
      VA.nodeLabel(topoProj, c.to));
    row(box, "sign", c.sign < 0 ? "− (against the edge's orientation)"
      : "+ (with the edge's orientation)");
    row(box, "scale", "×" + VA.fmt(c.ratio));
    row(box, "weight", VA.fmt(c.weight));
    row(box, "contributes",
      VA.fmt(c.min) + " … " + VA.fmt(c.max) + " " + c.units);
    box.appendChild(VA.el("p", "muted",
      "Its sign is read off the direction the chain crosses this edge." +
      (hit.override ? " This study scales it its own way." : "")));
    return box;
  }

  // The active kinematic study's reading of this edge (the record's
  // `contribution`, kind `kinematic`): the contributor table's own row, as
  // the projection states it -- sign, coefficient and magnitude at each stop,
  // and the band -- one line per stop.
  function kinematicContributionBlock(hit) {
    var box = VA.el("div", "detail__contribution");
    box.appendChild(VA.el("h4", null, "In this study"));
    hit.stops.forEach(function (stop) {
      if (stop.sign === null) return;
      row(box, stop.label, stop.sign + " " + stop.coefficient +
        (stop.magnitude === null ? "" : "  →  " + stop.magnitude));
    });
    if (hit.band) row(box, "band", hit.band);
    return box;
  }

  // `alreadySaid` is what this pane has ALREADY printed above the citation --
  // the part's own label. Most parts in this repo are NAMED after the drawing
  // they are cited from, so a pane that opens "a dimension of 214820-002 plain
  // bushing" and then cites "214820-002 · sheet 4" says the part number twice
  // (Jeff's rule; VA.citationWhere carries it, and four live edges are in that
  // shape: `bushing_214820`, `pitch_plate_flange`, `gas_spring_mount_position`,
  // `pitch_flange_thickness`). The hover cards passed this argument from the
  // day it existed and this pane did not -- the same one-surface-only fix the
  // crop head above was.
  function citation(sourceRef, confidence, alreadySaid) {
    var box = VA.el("div", "detail__citation");
    box.appendChild(VA.el("div", "detail__where",
      VA.citationWhere(sourceRef, alreadySaid)));
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

  // One builder for the el-export box across every surface that renders it
  // (VA.exportBlockNode, views/detail.js) — no opts here, so this pane keeps
  // its original content (no runs line: it has no crop entry on hand).
  function exportBlock(p) {
    return VA.exportBlockNode(p);
  }

  // The preview image. An edge that re-expresses a stack element IS that
  // element, crop and all — its `crop_key` is the {stack, element} pair
  // crops.json's by_stack is keyed by; an INLINE edge with a croppable
  // citation carries a {topology, edge} key into by_topology instead
  // (VA.cropForKey reads both spaces, and VA.cropKeyText says which claim the
  // key is making). An edge with no key is not a stale index and must not
  // read like one: it is a workbook/assumed dimension, or the derived gap a
  // study computes, and it says which.
  function cropSection(record, ctx) {
    var box = VA.el("div", "detail__crop");
    box.appendChild(VA.el("h4", null, "Drawing crop"));
    if (!record.crop) {
      box.className = "detail__crop detail__crop--no-key";
      var ref = record.citation;
      box.appendChild(VA.el("div", "detail__crop-reason",
        ref && ref.kind === "assumed"
          ? "Its value is an assumption; its crop appears here once a drawing backs it."
          : record.noCropReason));
      return box;
    }
    var entry = record.crop.entry;
    box.className = "detail__crop detail__crop--" + entry.status;
    // The crop KEY line used to print here (VA.cropKeyText): which of the crop
    // index's two key spaces addressed this crop, spelled in the ids of a
    // stack and an element. Internal plumbing, in internal ids, immediately
    // above a picture that names its own document -- gone 2026-09-15, on the
    // same pass that took it off the hover cards.
    if (entry.status !== "resolved") {
      box.appendChild(VA.el("div", "detail__crop-reason", entry.reason || entry.status));
      return box;
    }
    // Shared builder, same as the stack pane's: the image, its highlight boxes
    // and the parts-list companion for a balloon crop.
    // The picture out of the page's image cache (every resolved crop the
    // open topology addresses is fetched once, for the grid's thumbnails), so
    // a hovered row's crop is on screen the moment the pointer is.
    // `detailImage` is the SELECTION's picture, so it is read only for it.
    var image = (ctx.cropImages && ctx.cropImages[entry.png]) ||
      (isSelected(ctx, record.kind, record.id) ? ctx.detailImage : null) || null;
    box.appendChild(VA.cropFigure(entry, image, "detail__crop-img"));
    var companion = VA.companionFigure(entry, ctx.cropImages);
    if (companion) box.appendChild(companion);
    // The reference, its links and the folded matching provenance, from the
    // ONE builder every crop surface shares (VA.cropReference, views/crop.js).
    // This pane used to print the reference, then the provenance line in the
    // open, then the absolute path -- three lines where a reader wanted one,
    // and no way to reach the document at all.
    //
    // `VA.PANE_CROP` (omitHead), 2026-09-18: one document statement per pane.
    // The citation's own where-line above already named it; the head under the
    // picture restated it. Same constant as the stack-side pane's, on purpose
    // -- the two panes had drifted precisely because each carried its own copy
    // of this decision.
    VA.cropReference(box, entry, ctx.config, "detail__crop-", VA.PANE_CROP);
    return box;
  }

})(window.ViewerApp = window.ViewerApp || {});
