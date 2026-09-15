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

    // Edge-length scaling (viewer_edge_length_scaling): how much vertical
    // extent a dimension bar gets — uniform (the default), or proportional to
    // its tolerance band or its nominal size. Cycles through
    // VA.EDGE_LENGTH_MODES in that table's own `next` order. A display
    // preference like the two above: the grid's rows never move, only the
    // DAG stretches, and the leaders absorb the difference.
    var lengthPreset = VA.EDGE_LENGTH_MODES[state.edgeLengthMode] ||
      VA.EDGE_LENGTH_MODES.uniform;
    var lengths = VA.el("button", "ghost tvpick__mode",
      "Lengths: " + lengthPreset.label);
    lengths.setAttribute("id", "edge-length-toggle");
    lengths.setAttribute("title", lengthPreset.title +
      " In the scaled modes every bar keeps a minimum clickable length; one " +
      "drawn at that floor wears a break mark and is not to scale.");
    lengths.onclick = handlers.onEdgeLength;
    root.appendChild(lengths);

    // How a leader is DRAWN (viewer_leader_grid_legibility): right-angle jogs
    // (the default, and what shipped) or one straight angled segment. Jeff
    // asked for both so he can try them against a real mechanism -- the same
    // shape as the labelled/values-only toggle above, cycling through
    // VA.LEADER_STYLES' own `next`. Both ends of a leader are unchanged in
    // either style, so the page's correspondence contract does not know this
    // control exists.
    var leaderPreset = VA.LEADER_STYLES[state.leaderStyle] || VA.LEADER_STYLES.jogged;
    var leaderStyle = VA.el("button", "ghost tvpick__mode",
      "Leaders: " + leaderPreset.label);
    leaderStyle.setAttribute("id", "leader-style-toggle");
    leaderStyle.setAttribute("title", leaderPreset.title);
    leaderStyle.onclick = handlers.onLeaderStyle;
    root.appendChild(leaderStyle);

    // The study's own 3D affordance, only once a real study is selected --
    // "trace this in 3D" means nothing about the whole topology, only about
    // one human-lassoed chain. Two forms of the same capability (handoff
    // study_3d_flyout, feature 3): where the annotator is served beside this
    // page (state.annotateMount, probed at boot), a button flies out the 3D
    // panel with the study's parts ghosted and its bound faces opaque; where
    // it is not -- file://, or a server without the sibling mount -- the
    // pre-flyout "Annotate →" link (new tab) stays, unchanged. The viewer
    // still computes and writes nothing for the annotate app either way; the
    // flyout launch is the same params the link carries, handed to the same
    // command vocabulary.
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
      } else {
        var annotateLink = VA.el("a", "ghost tvpick__mode", "Annotate →");
        annotateLink.href = VA.annotateLink({ topologyId: state.topologyId, studyId: state.studyId });
        annotateLink.title = "Open this study in the annotation surface (apps/annotate) to bind its " +
          "elements to geometry -- select + tag, no measurement.";
        root.appendChild(annotateLink);
      }
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
    // Right-justified (viewer_dag_spine_layout): the walk's mainline on the
    // rightmost rail, hard against the jog zone, branches extending left.
    var layout = VA.spineRight(layoutFor(topoProj, study, ctx.layoutMode));
    // The merged-row grid and the leaders come off ONE plan of the same
    // serialisation the rails were drawn from (viewer_leader_line_grid,
    // 2026-09-10): the grid holds only the edge rows, grouped into components,
    // and each non-internal node bridges the two with a jogged leader line.
    // It is built BEFORE the positions because its row count is half of what
    // the fit below needs: the two blocks are centred against each other.
    var plan = VA.gridPlan(layout, topoProj);
    // The keyed position store (viewer_edge_length_scaling): every dot and
    // bar's y, computed ONCE per render and addressed by id, under whichever
    // length mode is on. Both geometry passes below read this same store, so
    // the dots, the bars and the leaders cannot disagree about where a row
    // went when the mode stretched it. `fit` is the viewport it normalizes
    // into (viewer_dag_spine_layout) — measured here because this is the one
    // place that holds both the pane and the plan.
    var fit = { budget: paneBudget(root, M), plan: plan };
    var positions = VA.rowPositions(layout, topoProj,
      ctx.edgeLengthMode || "uniform", M, fit);
    // Mid-respine (viewer_study_respine_animation): the frame is drawn from
    // the TARGET serialisation's layout and plan -- the structure the page is
    // moving to -- with the store interpolated back toward the one the
    // previous paint drew from. That is the whole of the animation's effect on
    // this function: both geometry passes below are untouched, and a frame
    // with no tween is the render this file has always done.
    var tween = ctx.tween || null;
    if (tween && tween.positions) {
      positions = VA.tweenPositions(tween.positions, positions, tween.e);
    }
    // The horizontal half of the same transition, which no keyed store can
    // express (VA.respineX says why): the frame is drawn with the
    // interpolated column count and the interpolated pane width, so a
    // surviving rail starts where the outgoing frame drew it and a column
    // this respine ADDS unfolds out of the spine rather than sliding in from
    // a place it never was -- off the pane's left edge, in the grow
    // direction. Both geometry passes take it; nothing else changes.
    var xTween = tween
      ? VA.respineX(layout, plan, M, tween, tween.e, ctx.jogZoneScale)
      : null;
    // One element's opacity in a tweened frame: an element the transition is
    // ADDING fades in at its settled position instead of appearing whole, and
    // an element it drops is not in this layout at all -- the outgoing frame's
    // own ghost (VA.animateTopoPane) is what fades those out.
    var fade = function (node, kind, id) {
      var a = VA.tweenAlpha(positions, kind, id);
      if (a < 1) node.style.opacity = String(a);
      return node;
    };
    var geometry = VA.railGeometry(layout, M, positions, { x: xTween });
    // The two display preferences this pane owns beyond the store
    // (viewer_leader_grid_legibility): which style the leaders are drawn in,
    // and how far the reader has dragged the jog zone open. Neither moves a
    // leader's two ENDS -- the page's correspondence contract is untouched by
    // both -- so they ride in as options rather than as new geometry.
    var leaderGeo = VA.leaderGeometry(layout, plan, M, positions, {
      style: ctx.leaderStyle,
      zoneScale: ctx.jogZoneScale,
      x: xTween,
    });
    // The store this paint actually drew from, kept for the one render after
    // it: the browser tier re-derives the drawn geometry from the same budget
    // the render measured rather than guessing at a viewport, and the staged
    // study-respine animation needs a store that outlives a single paint to
    // tween between two of them.
    // `columns` and `width` are the horizontal pair a respine interpolates
    // (VA.respineX): the column count this frame was drawn with -- fractional
    // mid-transition, because what the next tween has to continue from is the
    // picture on screen and not the serialisation behind it -- and the SVG's
    // own width, which is the grid's left edge. `tweening` says whether this
    // paint was a transition frame: everything else here describes the store
    // the paint DREW FROM either way, which is what both readers want.
    VA.lastTopoRender = { topologyId: topoProj.id, mode: positions.mode,
                          fit: fit, positions: positions,
                          columns: layout.columns -
                            (xTween ? xTween.columnShift : 0),
                          width: leaderGeo.width, tweening: !!tween };
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
    var head = header(leaderGeo, ctx);
    hscroll.appendChild(head);
    var body = VA.el("div", "tv__body");
    body.appendChild(railsSvg(geometry, leaderGeo, index, chain, chainNodes,
      marking, ctx, fade));
    var rows = grid(plan, index, chain, marking, ctx, positions.gridOffset, fade);
    // The grid is the one block a respine CROSS-FADES rather than moves. Its
    // rows are not positioned from the store at all -- the table's pitch is
    // fixed and only the block's offset tweens -- and the two serialisations
    // disagree about which rows exist and in what order, so the outgoing
    // table and the incoming one can never be made to line up the way the
    // DAG's dots and bars do. Drawn solid over each other they read as
    // garbled text; each at its own share of the transition they read as one
    // table resolving into another. The SVG beside it needs none of this: its
    // surviving marks are at the same place in both frames at e = 0 and
    // separate from there, which is the movement this is all for.
    if (tween) rows.style.opacity = String(tween.e);
    body.appendChild(rows);
    hscroll.appendChild(body);
    root.appendChild(hscroll);
    // The outgoing paint, fading out underneath: the rows a study re-lay
    // DROPS are not in the target serialisation at all, so there is nothing
    // in this layout to draw them from. See VA.animateTopoPane for why the
    // already-rendered nodes are re-used rather than re-drawn.
    if (tween && tween.ghost) {
      tween.ghost.style.opacity = String(1 - tween.e);
      root.appendChild(tween.ghost);
    }
    return root;
  };

  // --- the respine animator (viewer_study_respine_animation) ---------------
  //
  // Renders the pane once per frame from a store interpolated between the
  // previous paint's and this one's target (VA.tweenPositions), over a ghost
  // of the previous paint that fades out -- and the LAST frame is a plain
  // renderTopoPane with no tween and no ghost at all, so the settled DOM is
  // exactly what a fresh render of the same selection would have produced.
  // That is the deliverable's own contract: the animation is presentation,
  // and no correspondence check ever has to know it happened.
  //
  //   root  the pane, still holding the outgoing paint -- read BEFORE it is
  //         cleared, which is why this is called instead of renderTopoPane
  //         rather than from inside it.
  //   ctx   the target state's render context, exactly as renderTopoPane
  //         takes it.
  //   from  { positions, columns, width } -- the store the previous paint
  //         drew from, and the column count and pane width it drew
  //         (VA.lastTopoRender carries all three). No `from` means there is
  //         nothing to animate between; the pane just renders.
  //   opts  the clock, the motion preference and the error sink, injected so
  //         the fast tier can drive a whole transition frame by frame with no
  //         browser: { raf, now, duration, reduced, onError }.
  //
  // `onError` is not optional decoration. Every other path into a render on
  // this page goes through topology_app.js's one try/catch (the 2026-09-09
  // silently-empty-pane incident is what put it there), and a frame running
  // off an animation callback is OUTSIDE it -- a throw there would be an
  // unhandled rejection with the page looking mid-transition and saying
  // nothing. So a frame that throws stops the transition and hands the error
  // to the same crash seam every other render uses.
  //
  // Returns a handle with `cancel()`, or null when nothing was animated. The
  // caller MUST cancel a running transition before painting the pane itself:
  // a frame rendered from a stale ctx would otherwise land on top of it.
  VA.animateTopoPane = function (root, ctx, from, opts) {
    opts = opts || {};
    var previous = from && from.positions;
    // `prefers-reduced-motion: reduce` means JUMP TO THE END STATE -- one
    // plain render, no tween, no ghost. The reader gets the same page, it
    // just arrives rather than travels.
    var reduced = opts.reduced === undefined
      ? VA.prefersReducedMotion()
      : !!opts.reduced;
    if (!previous || reduced || !root || !root.querySelector) {
      VA.renderTopoPane(root, ctx);
      return null;
    }
    var duration = opts.duration === undefined ? VA.RESPINE.duration : opts.duration;
    var now = opts.now || function () { return Date.now(); };
    var raf = opts.raf || nextFrame;
    var ghost = ghostOf(root);
    var start = now();
    var handle = { cancel: function () { handle.cancelled = true; }, cancelled: false };
    var step = function () {
      if (handle.cancelled) return;
      var t = duration > 0 ? (now() - start) / duration : 1;
      var settling = !(t < 1);
      // The settled frame gets no tween argument at all, so the ghost is not
      // re-appended and every number in the DOM is the target's own.
      if (settling) {
        handle.done = true;
      } else {
        ctx.tween = { positions: previous, columns: from.columns,
                      width: from.width, e: VA.respineEase(t), ghost: ghost };
      }
      try {
        VA.renderTopoPane(root, ctx);
      } catch (err) {
        handle.cancelled = true;
        if (opts.onError) opts.onError(err);
        return;
      } finally {
        delete ctx.tween;
      }
      if (!settling) raf(step);
    };
    step();
    return handle;
  };

  // The outgoing paint, re-parented into an inert overlay rather than
  // re-drawn or cloned.
  //
  // Re-drawn is impossible without a second layout path, which this handoff
  // is explicitly forbidden: the rows a study re-lay drops exist only in the
  // OTHER serialisation, so the target layout the frames are drawn from has
  // nothing to draw them from. Cloned is possible in a browser and not in the
  // DOM shim the fast tier runs in -- and a clone would duplicate every
  // click handler in the pane for the length of the transition, which the
  // `pointer-events: none` below is only half an answer to. Moving the real
  // nodes is neither: they leave the live tree, stop being reachable, and are
  // dropped whole when the settled frame renders without them.
  function ghostOf(root) {
    var live = root.querySelector(".tv__hscroll");
    if (!live) return null;
    // The column header is the same header in both serialisations -- same
    // nine columns, same words, only its left pad differs -- so a fading copy
    // of it under the live one is pure double-image with nothing to say.
    var head = live.querySelector(".tv__head");
    if (head) head.style.display = "none";
    var ghost = VA.el("div", "tv__ghost");
    ghost.setAttribute("aria-hidden", "true");
    ghost.appendChild(live);
    return ghost;
  }

  // One animation frame, or a timer where there is no window to ask (the DOM
  // shim, and a page whose tab is not the one being animated). The same
  // fallback shape topology_app.js's resize paint already uses.
  function nextFrame(fn) {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      return window.requestAnimationFrame(fn);
    }
    return setTimeout(fn, 16);
  }

  // Whether the reader has asked for less motion. No media query to ask (an
  // old browser, the DOM shim) reads as "no preference", which is the same
  // answer a browser that has the query and no preference set gives.
  VA.prefersReducedMotion = function () {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try {
      return !!window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      return false;
    }
  };

  // How much vertical room the DAG has to normalize itself into
  // (viewer_dag_spine_layout): the window's height, less everything the page
  // puts above this pane and the pane's own sticky column header.
  //
  // Read in DOCUMENT coordinates — the pane's top does not move with the
  // page's own scroll, so the budget is a property of the page's chrome and
  // not of how far the reader happened to have scrolled when the mode
  // changed. Measured once per paint, on the emptied pane, before anything is
  // appended to it.
  //
  // 0 where there is nothing to measure against (the DOM shim the fast tier
  // renders into), which is the same "no viewport" case a pure call is:
  // VA.rowPositions falls back to EDGE_LENGTH_SCALE.maxRows alone and nothing
  // is normalized.
  function paneBudget(root, metrics) {
    if (!root || typeof root.getBoundingClientRect !== "function") return 0;
    if (typeof window === "undefined" || !window.innerHeight) return 0;
    var rect = root.getBoundingClientRect();
    return VA.dagHeightBudget(rect.top + (window.scrollY || 0),
      window.innerHeight, metrics);
  }

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
    { cls: "name", label: "element", width: 220, resizable: true },
    { cls: "nominal", label: "nominal", width: 80 },
    { cls: "min", label: "min", width: 80 },
    { cls: "max", label: "max", width: 80 },
    { cls: "contribution", label: "contribution", width: 200 },
    { cls: "chips", label: "sourcing", width: 200 },
    { cls: "crop", label: "crop", width: 110 },
  ];

  // The array IS the width, and since viewer_leader_grid_legibility it is the
  // only one: each <col> carries its width INLINE from here, and topology.css
  // declares no `.tvcol--*` width at all. It used to declare all nine, with
  // this array restating the same numbers for the inline table total -- two
  // sources that happened to agree, which is exactly the drift the shared
  // colgroup exists to prevent and which a resizable column would have made
  // real within one drag.
  //
  // `resizable` marks the columns whose header carries a drag grip. Only
  // ELEMENT does today (Jeff: "the descriptions get truncated and there's no
  // way to see the entire text without clicking and expanding the preview"),
  // and the mutator below is deliberately general anyway: a second resizable
  // column is a flag, not a mechanism.
  VA.TOPO_COLUMNS = COLUMNS;
  VA.TOPO_COLUMN_WIDTH = { min: 80, max: 900 };

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

  function colgroup() {
    var cg = VA.el("colgroup");
    COLUMNS.forEach(function (c) {
      var col = VA.el("col", "tvcol tvcol--" + c.cls);
      col.style.width = c.width + "px";
      cg.appendChild(col);
    });
    return cg;
  }

  // The column header. Padded left by exactly the SVG's width so a header cell
  // sits over the column it names — the rails are a sibling of the rows, not a
  // cell of them, so the offset has to be applied by hand and read from the same
  // geometry the SVG was drawn from. Real <th> cells (deliverable 2): a screen
  // reader and a copy-paste both get an actual header, not a styled div.
  function header(leaderGeo, ctx) {
    var railWidth = leaderGeo.width;
    var head = VA.el("div", "tv__head");
    head.style.paddingLeft = railWidth + "px";
    var table = VA.el("table", "tvheadtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tr = VA.el("tr");
    COLUMNS.forEach(function (c) {
      var th = VA.el("th", "tvcell tvcell--" + c.cls, c.label);
      if (c.resizable) {
        th.className += " tvcell--resizable";
        th.appendChild(resizeGrip("col", "Drag to widen this column.", ctx,
          { kind: "column", cls: c.cls }));
      }
      tr.appendChild(th);
    });
    table.appendChild(VA.el("thead", null, tr));
    head.appendChild(table);
    // The jog zone's own grip, on the seam between the SVG and the grid --
    // the boundary a reader would grab anyway. Absolutely positioned so it
    // adds no width of its own: a grip that took layout space would push
    // itself in between a leader's last segment and the grid's first column,
    // and that hand-off is the one place on this page with no seam to align.
    //
    // `naturalZone` rides along because the drag is measured in pixels and
    // the preference is held as a multiple of it -- without it the app shell
    // would have nothing to divide by.
    var jogGrip = resizeGrip("jog",
      "Drag to spread the leader lines out.", ctx,
      { kind: "jog", naturalZone: leaderGeo.naturalZone });
    jogGrip.style.left = (railWidth - 3) + "px";
    head.appendChild(jogGrip);
    return head;
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

  // --- the SVG -------------------------------------------------------------

  function railsSvg(geometry, leaderGeo, index, chain, chainNodes, marking, ctx,
                    fade) {
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

    // 0. the alternating bands (viewer_leader_grid_legibility): the region
    //    between two adjacent leaders, tinted in one of two neutral shades by
    //    parity, and the grid rows that region feeds wear the SAME parity
    //    (VA.rowBandParity, read by grid() below off the same plan). Drawn
    //    first so everything else sits on top of it, and hit-tested by
    //    nothing -- a band is wayfinding, not a target.
    leaderGeo.bands.forEach(function (band) {
      var path = VA.svg("path", "rail__band rail__band--" + (band.parity ? "b" : "a"),
        { d: band.d });
      path.setAttribute("data-band", String(band.index));
      svg.appendChild(path);
    });

    // 1. the rails themselves: continuous, neutral, alternating shade by column
    //    parity so two rails crossing can still be told apart. NOT a categorical
    //    palette — see the page's legend for why there isn't one.
    //    Mid-respine a rail needs no fade of its own: a column the
    //    transition is adding is drawn collapsed onto the spine at e = 0 and
    //    unfolds out of it (VA.respineX), so there is nothing to appear from
    //    nowhere. The marks on it are keyed and the store fades those.
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
      svg.appendChild(fade(VA.svg("path", classes.join(" "), { d: leader.d }),
        "node", leader.id));
      var hit = fade(VA.svg("path", "rail__leaderhit", { d: leader.d }),
        "node", leader.id);
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
        if (mark.floored) classes.push("rail__bar--floored");
        if (marking) classes.push(inChain ? "rail__bar--on" : "rail__bar--off");
        // The bar's extent comes off the keyed position store (via
        // railGeometry's mark), not re-derived from rowHeight here — under a
        // scaled length mode a bar's slot is its own height.
        var y1 = mark.y1;
        var y2 = mark.y2;
        var bar = fade(VA.svg("line", classes.join(" "), {
          x1: mark.x, y1: y1, x2: mark.x, y2: y2,
        }), "edge", mark.id);
        svg.appendChild(bar);

        // A floored bar (scaled modes only) wears a drafting-style break
        // across its middle: this length is the minimum render length, not a
        // measured proportion, and a reader must be able to tell at a glance.
        if (mark.floored) {
          svg.appendChild(fade(VA.svg("path", "rail__break", {
            d: "M " + (mark.x - 5) + " " + (mark.y + 3) +
               " L " + (mark.x + 5) + " " + (mark.y - 1) +
               " M " + (mark.x - 5) + " " + (mark.y + 1) +
               " L " + (mark.x + 5) + " " + (mark.y - 3),
          }), "edge", mark.id));
        }

        // The hover/click target, over the SAME length but solid and wide
        // (deliverable 3, viewer_error_surface_and_layout): a gap/derived
        // bar's own stroke is DASHED (rail__bar--gap/--derived), so its hit
        // area under `pointer-events: stroke` has real gaps in it -- hovering
        // a dash's own OFF interval hits nothing. This carries the hover
        // title and the click handler instead, so the entire drawn length
        // responds regardless of the visible dash pattern; the visible bar
        // above is untouched, still thin and still dashed where confidence
        // or value_source says it should be.
        var hit = fade(VA.svg("line", "rail__barhit",
          { x1: mark.x, y1: y1, x2: mark.x, y2: y2 }), "edge", mark.id);
        // One hover surface, not two (viewer_dag_hover_cards): where a card
        // handler exists the bar opens the SAME edge card the grid's crop
        // trigger opens -- the crop thumbnail, the citation line, the deep
        // links -- and the native title it used to carry is absorbed into the
        // card's own head, never stacked under it. A floored bar's
        // not-to-scale fact rides in as the card's render note, since the
        // title that used to say it is gone. A caller with no card handler
        // (the fast tier's bare ctx) keeps the plain title.
        if (ctx.onCardShow) {
          cardOnHover(hit, function () {
            return VA.edgeCard(ctx.topoProj, edge, ctx.crops, mark.floored
              ? { renderNote: VA.FLOORED_RENDER_NOTE } : null);
          }, ctx);
        } else {
          hit.appendChild(svgTitle(mark.floored
            ? VA.flooredEdgeTitle(edge, mark.id)
            : VA.edgeHoverTitle(edge, mark.id)));
        }
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
      var dot = fade(VA.svg("circle", dotClasses.join(" "), {
        cx: mark.x, cy: mark.y, r: mark.branch ? M.branchDot : M.dot,
      }), "node", mark.id);
      // The dot's own card (viewer_dag_hover_cards): a node IS an interface,
      // so the hover says which parts meet there and shows their thumbnails,
      // which is strictly more than the name the title carried. Same
      // absorb-not-stack rule as the bar above.
      if (ctx.onCardShow) {
        cardOnHover(dot, function () {
          return VA.nodeCard(ctx.topoProj, mark.id, ctx.crops);
        }, ctx);
      } else {
        dot.appendChild(svgTitle(node ? node.name : mark.id));
      }
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

  // Open a card on hover and on keyboard focus, never on click: a rail mark's
  // click is already SELECTION (wire() below), which is the mark's primary
  // job, and the grid-side triggers only take the click because they select
  // nothing. The model is built lazily per hover so a card always reads the
  // crop cache as it stands when the pointer arrives.
  function cardOnHover(node, build, ctx) {
    var show = function () {
      var card = build();
      if (card) ctx.onCardShow(card, node);
    };
    node.onmouseenter = show;
    node.onfocus = show;
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
  function grid(plan, index, chain, marking, ctx, offset, fade) {
    var box = VA.el("div", "tv__rows");
    // Centred against the DAG beside it (viewer_dag_spine_layout): whichever
    // block is shorter is pushed down by half the difference, which is what
    // drops the vertical distance the leaders have to jog. A block offset, not
    // a row-pitch change — every row is still exactly `rowHeight` tall, and
    // the leaders' grid-side seams carry the same offset (VA.leaderGeometry).
    if (offset) box.style.marginTop = offset + "px";
    var table = VA.el("table", "tvtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tbody = VA.el("tbody");
    // Which of the two neutral tints each row wears -- off the SAME bands the
    // SVG's own band polygons came from (VA.rowBandParity), so a row and the
    // band feeding it cannot be given two different answers.
    var bandParity = VA.rowBandParity(plan);
    plan.groups.forEach(function (group) {
      for (var i = 0; i < group.count; i++) {
        var planRow = plan.rows[group.start + i];
        tbody.appendChild(fade(edgeRow(planRow, group, i === 0, index, chain,
          marking, ctx, bandParity[planRow.id]), "edge", planRow.id));
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
  // The part id as text, or the gap wording for a clearance. Clicking it
  // selects nothing: it is a grouping, not a row. A PART's cell is a hover
  // card trigger (viewer_hover_cards_and_deep_links): the card carries the
  // part's name, drawing, note and a derived thumbnail (VA.componentCard), so
  // the old title attribute retired — a native tooltip under a card would be
  // two hover surfaces saying less than one. The gap cell keeps its title:
  // there is no part to card.
  function componentCell(group, ctx) {
    var cell = VA.el("td", "tvcell tvcell--component", group.label);
    if (group.count > 1) cell.setAttribute("rowspan", String(group.count));
    cell.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
    };
    if (group.part && ctx.onCardShow) {
      cell.className += " cardtrig";
      cell.setAttribute("tabindex", "0");
      var show = function () {
        ctx.onCardShow(VA.componentCard(ctx.topoProj, group.part, ctx.crops), cell);
      };
      cell.onmouseenter = show;
      cell.onfocus = show;
      cell.onclick = function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        show();
      };
    } else if (group.title) {
      cell.setAttribute("title", group.title);
    }
    return cell;
  }

  function edgeRow(planRow, group, first, index, chain, marking, ctx, bandParity) {
    var edge = index.edges[planRow.id];
    var hit = chain[planRow.id];
    var el = baseRow("edge", ctx, planRow.id);
    // The alternating band this row belongs to (viewer_leader_grid_legibility).
    // A neutral tint and deliberately the WEAKEST background rule on the row:
    // an untraced or uncited row's provenance tint (.tvrow--edge.conf--*,
    // topology.css) is more specific and still wins, because provenance
    // outranks wayfinding on this page.
    el.className += " tvrow--band-" + (bandParity ? "b" : "a");
    if (first) el.className += " tvrow--group-start";
    if (edge) el.className += " " + VA.confidenceClass(edge.confidence);
    if (edge && edge.kind === "gap") el.className += " tvrow--gap";
    if (edge && edge.value_source === "derived") el.className += " tvrow--derived";
    if (edge && edge.zero_width) el.className += " tvrow--zero-width";
    if (marking) el.className += hit ? " tvrow--on" : " tvrow--off";
    if (planRow.closes) el.className += " tvrow--closes";
    if (isSelected(ctx, "edge", planRow.id)) el.className += " tvrow--selected";

    if (first) el.appendChild(componentCell(group, ctx));

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

    // The element label, with its own component's name dropped off the front
    // where it repeats the merged cell to its left (VA.elementDisplayLabel,
    // topology.js -- display only, nothing about the edge changes). Where
    // anything was dropped the cell carries the FULL label as its hover
    // title, so the words are one hover away and the detail pane prints them
    // in full regardless.
    var fullName = edge ? edge.name : missing(planRow.id);
    var shownName = edge && group
      ? VA.elementDisplayLabel(fullName, group.part) : fullName;
    var nameCell = VA.el("td", "tvcell tvcell--name", valueOnly ? "" : shownName);
    if (!valueOnly && shownName !== fullName) nameCell.setAttribute("title", fullName);
    el.appendChild(nameCell);

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
      var confChip = VA.chip(VA.confidenceClass(edge.confidence),
        edge.confidence === null ? "no value"
          : (VA.CONFIDENCE_LABEL[edge.confidence] || edge.confidence));
      // The citation hover card (viewer_hover_cards_and_deep_links): the
      // confidence chip is the row's statement about its citation, so it is
      // the trigger for the full reference — where-ref, callout, note, export
      // block and the cited sheet's crop where one resolved. Only an edge
      // that HAS a citation gets one; a derived gap's chip stays a plain chip.
      var sourceRef = edge.dimension && edge.dimension.source_ref;
      if (sourceRef && ctx.onCardShow) {
        confChip.className += " cardtrig";
        confChip.setAttribute("tabindex", "0");
        var showCitation = function () {
          ctx.onCardShow(VA.citationCard(sourceRef, null,
            edge.crop_key ? VA.cropForKey(ctx.crops, edge.crop_key) : null),
            confChip);
        };
        confChip.onmouseenter = showCitation;
        confChip.onfocus = showCitation;
        confChip.onclick = showCitation;
      }
      chips.wrap.appendChild(confChip);
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
  // cropTrigger uses (VA.cropForKey — which reads BOTH of crops.json's key
  // spaces, by_stack for a dimension_ref edge and by_topology for an inline
  // one — and VA.cropProvenanceLine): an edge that re-expresses a committed
  // stack element IS that element, crop and all, so there is one crop-trigger
  // shape in the repo, not two. Since viewer_hover_cards_and_deep_links the
  // trigger opens the EDGE hover card (VA.edgeCard, views/cards.js) — the
  // same crop body inside a richer frame, plus the citation line and the
  // deep links out — with the plain crop popover as the fallback wiring for
  // a caller with no card handler.
  function edgeCropCell(edge, ctx) {
    var cell = VA.el("td", "tvcell tvcell--crop");
    // The same clamp wrapper the chips cell uses, for the same reason: a real
    // <tr>'s height is a floor, not a cap, and a text trigger one pixel taller
    // than compact's 16px pitch would grow the row off its leader's seam —
    // exactly the drift the browser tier's correspondence check measures.
    var wrap = VA.el("div", "tvcell__cropwrap");
    cell.appendChild(wrap);
    if (!edge || !edge.crop_key) return cell;
    var entry = VA.cropForKey(ctx.crops, edge.crop_key);
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
    var show = function () {
      if (ctx.onCardShow) {
        ctx.onCardShow(VA.edgeCard(ctx.topoProj, edge, ctx.crops), node);
      } else if (ctx.onCropShow) {
        ctx.onCropShow(entry, node);
      }
    };
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

    // This node's SIDES, derived from the edges actually incident on it
    // (VA.nodeSideIds -> VA.nodeAdjacentParts) -- the same adjacency the dot's
    // hover card prints and the leader rule reads, NOT the document's own
    // `parts` list.
    //
    // It printed `node.parts` until handoff surfaces_that_state_something_
    // false, and on 10 of the 46 live nodes the same dot answered differently
    // hovered and clicked. Neither list was wrong: a node against a `gap` edge
    // has a clearance for a side, and a clearance is not a part, so an
    // authored parts list cannot name one. The lists answer different
    // questions -- and the question a reader clicking a dot in the DAG is
    // asking ("what meets HERE, in the picture I am looking at") is the
    // derived one, which is why the card already chose it.
    var sideIds = VA.nodeSideIds(ctx.topoProj, id);
    root.appendChild(VA.el("div", "detail__where", "on " + sideIds.join(" ⇔ ")));

    // Whether this interface got a leader line, and why (viewer_leader_line_
    // grid): the omission rule is the component grouping, so the pane says
    // which side of it this node is on rather than leaving a missing leader
    // to read as a rendering gap. It states the RULE only -- the sides
    // themselves are the line above, said once, in the same words the card
    // uses (this sentence used to re-list them with a different separator).
    root.appendChild(VA.el("p", "detail__crop-reason",
      VA.internalNodes(ctx.topoProj)[id]
        ? "An internal interface: every dimension meeting here belongs to one " +
          "part, so no leader line is drawn — leaders mark component " +
          "boundaries only."
        : "A component boundary: its leader line marks that seam in the grid."));
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
    //
    // And only where the owning part HAS a 3D model to click on (handoff
    // annotate_affordances_flyout_and_mesh_gating): this affordance exists to
    // CREATE a binding, and an annotator with no mesh for the part cannot bind
    // a face -- the click would land on its empty state. Nothing is shown in
    // that case, not a disabled control: the honest fix is installing the
    // mesh, and the row stays on the gap list either way.
    if (VA.needsAnnotation(edge.confidence) &&
        VA.partHasMesh(ctx.topoProj, edge.part)) {
      var annotateParams = {
        topologyId: ctx.topoProj.id,
        edgeId: edge.id,
        studyId: ctx.study && ctx.study.id,
        part: edge.part,
      };
      var annotateBox = VA.el("div", "detail__annotate");
      if (ctx.annotateMount && ctx.onAttach3d) {
        // The flyout form (handoff study_3d_flyout, feature 2): same params
        // as the link below, but the annotator flies out beside this page
        // with just this edge's part visible, ready to click the surface.
        var attachBtn = VA.el("button", "detail__annotate-btn",
          "attach to 3D" + (edge.part ? " (" + edge.part + ")" : "") + " →");
        attachBtn.setAttribute("title",
          "flies out the 3D annotation panel with this edge selected" +
          (edge.part ? ", isolating " + edge.part : "") +
          " -- click the correct surface(s) there to resolve which feature this is");
        attachBtn.onclick = function () { ctx.onAttach3d(annotateParams); };
        annotateBox.appendChild(attachBtn);
      } else {
        var annotateLink = VA.el("a", "detail__annotate-link",
          "annotate this" + (edge.part ? " (" + edge.part + ")" : "") + " →");
        annotateLink.setAttribute("href", VA.annotateLink(annotateParams));
        annotateLink.setAttribute("target", "_blank");
        annotateLink.setAttribute("rel", "noopener");
        annotateLink.setAttribute("title",
          "opens the 3D annotation surface with this edge selected" +
          (edge.part ? ", isolating " + edge.part : "") +
          " -- click the correct surface(s) there to resolve which feature this is");
        annotateBox.appendChild(annotateLink);
      }
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
    var entry = VA.cropForKey(ctx.crops, edge.crop_key);
    box.className = "detail__crop detail__crop--" + entry.status;
    box.appendChild(VA.el("div", "muted", VA.cropKeyText(edge.crop_key)));
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
