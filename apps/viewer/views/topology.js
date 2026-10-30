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
  // on screen is the nav's job now. What is left here is how it is drawn: row
  // density, the two leader preferences, the edge-length mode and the
  // annotate link. Topology mode only; topology_app.js hides this strip in
  // stack mode.
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

    // Fit (the_dag_is_zoomable_and_a_length_mode_draws_to_scale): the wheel
    // zooms the drawing and a drag pans it; this one click brings the lit set
    // (a study's chain, a kinematic study's) into view, or the whole walk where
    // nothing is selected. `0` is its key. Always present -- the drawing is
    // zoomable on every page that has one.
    if (handlers.onFit) {
      var fit = VA.el("button", "ghost tvpick__mode", "Fit");
      fit.setAttribute("id", "dag-fit");
      fit.setAttribute("title", "Zoom the drawing to show everything lit " +
        "(the whole walk when nothing is). Scroll wheel zooms, drag pans.");
      fit.onclick = handlers.onFit;
      root.appendChild(fit);
    }

    // How a leader is DRAWN (viewer_leader_grid_legibility): one straight
    // angled segment (VA.DEFAULT_LEADER_STYLE since 2026-09-21) or right-angle
    // jogs (what shipped first). Jeff asked for both so he could try them
    // against a real mechanism and, having done so, made angled the default --
    // the same shape as the labelled/values-only toggle above, cycling through
    // VA.LEADER_STYLES' own `next`. Both ends of a leader are unchanged in
    // either style, so the page's correspondence contract does not know this
    // control exists.
    var leaderPreset = VA.LEADER_STYLES[state.leaderStyle] ||
      VA.LEADER_STYLES[VA.DEFAULT_LEADER_STYLE];
    var leaderStyle = VA.el("button", "ghost tvpick__mode",
      "Leaders: " + leaderPreset.label);
    leaderStyle.setAttribute("id", "leader-style-toggle");
    leaderStyle.setAttribute("title", leaderPreset.title);
    leaderStyle.onclick = handlers.onLeaderStyle;
    root.appendChild(leaderStyle);

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

    // Which containers are drawn: one checkbox per kind (VA.GROUP_KINDS), in a
    // popover under one button. The page hands in the effective set as
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

  // --- rails + grid, in one scrolling box ----------------------------------
  //
  // `root` is the scroll container. Both panes live inside it, which is the
  // whole implementation of "scrolling keeps them locked together": there is one
  // scrollport, so there is nothing to synchronise and nothing to drift.

  VA.renderTopoPane = function (root, ctx) {
    // The reader's own sideways scroll, read BEFORE the pane it lives on is
    // destroyed (ISSUE_20260915_every_topology_pane_render_throws_away_the_
    // readers_sideways_scroll). See carriedScroll for why this is the first
    // line of the function and not a detail of the append below.
    var carried = carriedScroll(root, ctx.topoProj, ctx.tween);
    // A BOUNDED pane scrolls vertically itself (the kinematic page's), and
    // emptying it below clamps that scroll to 0 -- so it is read here and put
    // back after the paint, or every repaint (a row click, a hover card)
    // would throw the reader back to the walk's first row.
    var carriedTop = ctx.bounded && typeof root.scrollTop === "number" ? root.scrollTop : 0;
    VA.clear(root);
    // `bounded`: the kinematic page's capped box (topology.css), which
    // the scroll handler pins the grid's header against.
    root.className = "tv__scroll" + (ctx.bounded ? " tv__scroll--bounded" : "");
    var topoProj = ctx.topoProj;
    if (!topoProj) {
      // The SAME two sentences the banner's own missing-projection box shows,
      // off the same two constants rather than a second wording of the same
      // fact — this site said "Build it with <interpreter path> and reload"
      // until 2026-09-22 and was the third of the four terminal commands in
      // the viewer's chrome (policy_free_brief_residues). It is not the
      // banner's box because this pane is where a reader looking for the
      // rails is actually looking.
      root.appendChild(VA.el("p", "muted",
        VA.projectionLabels("topologies").missing + " " +
        VA.PROJECTION_BUILT_ELSEWHERE));
      return root;
    }

    var study = ctx.study;
    // Right-justified (viewer_dag_spine_layout): the walk's mainline on the
    // rightmost rail, hard against the jog zone, branches extending left.
    //
    // ALWAYS the topology's own walk, every row of it (viewer_respine_whole_
    // walk, 2026-09-15: "When you click a study/stack, the entire dag/model
    // should still be visible"). What a selection changes is the ORDER: the
    // lit rows become one band on the spine's columns and the rest of the
    // walk hangs above and below it (VA.bandLayout; Jeff, 2026-10-28, "the
    // active part ... becomes a straight vertical line"), and the emphasis,
    // the leaders and the table beside them follow the lit set.
    //
    // What is EMPHASIZED is the page's lit set (VA.studyLitSet, topology.js):
    // a kinematic page hands its own in as `ctx.lit`, a chain study's is its
    // chain. A study that refused to sum has no chain to emphasize (the error
    // is the result), so it leaves the walk at full emphasis exactly as no
    // selection does. With the unlit part HIDDEN (VA.UNLIT_STYLES) the walk
    // drawn is the band alone -- the same picture with the rest taken away.
    var lit = ctx.lit || VA.studyLitSet(study, topoProj);
    var marking = !!lit;
    var hiding = marking && ctx.unlitStyle === "hide";
    // Collapsed bodies (VA.collapseBodies) fold AFTER the re-arrange, so a
    // body the study does not reach is simply gone when hidden and a pill
    // stands only for what is drawn; the mirror runs last, as it always has.
    var walk = marking
      ? VA.bandLayout(topoProj.layout, lit, hiding ? { only: true } : null)
      : topoProj.layout;
    var layout = VA.spineRight(VA.collapseBodies(
      walk, ctx.collapsedBodies || null, topoProj, lit));
    // The chain's ordinals and contributions, for the grid's # and
    // contribution columns: a chain study's own, empty on a kinematic page,
    // whose contributions are its own table's business.
    var chain = VA.chainIndex(study);
    // The merged-row grid and the leaders come off ONE plan of the same walk
    // the rails were drawn from (viewer_leader_line_grid, 2026-09-10): the
    // grid holds only the edge rows, grouped into components, and each
    // non-internal node bridges the two with a jogged leader line.
    // It is built BEFORE the positions because its row count is half of what
    // the fit below needs: the two blocks are centred against each other.
    //
    // `focus` is the whole of a study's effect on this plan: the table shows
    // the chain's rows and the leaders run only to chain nodes, while the
    // rails above keep every node and edge of the walk. The DAG holds the
    // context; the table holds the sum.
    var plan = VA.gridPlan(layout, topoProj, lit);
    // The keyed position store (viewer_edge_length_scaling): every dot and
    // bar's y, computed ONCE per render and addressed by id, under whichever
    // length mode is on. Both geometry passes below read this same store, so
    // the dots, the bars and the leaders cannot disagree about where a row
    // went when the mode stretched it. `fit` is the viewport it normalizes
    // into (viewer_dag_spine_layout) — measured here because this is the one
    // place that holds both the pane and the plan.
    var fit = { plan: plan };
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
    // express (VA.respineX says why): the frame is drawn with every column's
    // drawn index interpolated (VA.drawnColumn) and the pane width with it,
    // so a surviving rail starts where the outgoing frame drew it and a
    // column this respine ADDS unfolds out of the OUTGOING FRAME'S LEFTMOST
    // RAIL -- `from.floor`, not drawn column 0 -- rather than sliding in from
    // a place it never was, off the pane's left edge in the grow direction.
    // Both geometry passes take it; nothing else changes.
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
    // The hover state both panes below register into and read from. Rebuilt
    // per render with the nodes it points at, so there is nothing to unwire
    // and nothing that can outlive the elements it marks.
    var hot = hotState(layout);
    // The page's own listener for the leaders across the seam, which light
    // with whatever the pointer lights here (topology_app.js).
    hot.onChange = ctx.onHot || null;
    // The containers the reader has switched on (VA.GROUP_KINDS), every one
    // where nothing was chosen. With the unlit part HIDDEN the walk IS the
    // selected study's band, so its group is the only one left.
    var kindsOn = ctx.groupKinds || {};
    var showKind = function (id) { return ctx.groupKinds ? !!kindsOn[id] : true; };
    var groups = (ctx.studyGroups || []).filter(function (g) {
      return showKind(g.kind) && (!hiding || g.selected);
    });
    var geometry = VA.railGeometry(layout, M, positions, { x: xTween, groups: groups });
    geometry.showBodies = showKind("bodies");
    // A study group's hover lights its edges' bars and grid rows: each edge
    // leads under its groups' keys (hotState's `studyOfEdge`).
    groups.forEach(function (g) {
      Object.keys(g.lit.edges).forEach(function (id) {
        (hot.studyOfEdge[id] = hot.studyOfEdge[id] || []).push(hotKey("study", g.id));
      });
    });
    // The links' opacity, which is neither the store's business nor the
    // unfold's (VA.linkOpacity says why): a link on a column BOTH
    // serialisations have is the one drawn thing the interpolated column
    // spread cannot put on top of something the outgoing frame drew, so it
    // fades in at its own position instead. `tween.links` is the previous
    // paint's own map, so an interrupted respine continues a part-done fade
    // rather than restarting it.
    var linkAlpha = VA.linkOpacity(geometry.links, tween && tween.links,
                                   tween ? tween.e : 1);
    var fadeLink = function (node, key) {
      var a = linkAlpha[key];
      if (a < 1) node.style.opacity = String(a);
      return node;
    };
    // The two display preferences this pane owns beyond the store
    // (viewer_leader_grid_legibility): which style the leaders are drawn in,
    // and how far the reader has dragged the jog zone open. Neither moves a
    // leader's two ENDS -- the page's correspondence contract is untouched by
    // both -- so they ride in as options rather than as new geometry.
    // The DAG's zoom (a_leader_starts_at_the_mark_it_names_on_every_tier,
    // 2026-10-29): the DAG alone is drawn at it, about its own top-left, and
    // the grid and its header stay at 1 -- Jeff: zoom the DAG, the grid keeps
    // its own scale. The leaders bridge the two (VA.leaderGeometry's `zoom`).
    var zoom = VA.clampDagZoom(ctx.zoom || 1);
    var dagZoom = { k: zoom, y0: positions.offset || 0 };
    var leaderGeo = VA.leaderGeometry(layout, plan, M, positions, {
      style: ctx.leaderStyle,
      zoneScale: ctx.jogZoneScale,
      x: xTween,
      zoom: dagZoom,
    });
    // The store this paint actually drew from, kept for the one render after
    // it: the browser tier re-derives the drawn geometry from the same budget
    // the render measured rather than guessing at a viewport, and the staged
    // study-respine animation needs a store that outlives a single paint to
    // tween between two of them.
    // `columns`, `floor` and `width` are the horizontal trio a respine
    // interpolates (VA.respineX): the drawn index of the spine plus one --
    // fractional mid-transition, because what the next tween has to continue
    // from is the picture on screen and not the serialisation behind it --
    // the leftmost drawn column index, which is the rail an interrupting
    // transition has to collapse its added columns onto, and the SVG's own
    // width, which is the grid's left edge. `links` is the same continuity
    // for the one drawn thing with an opacity of its own (VA.linkOpacity).
    // `tweening` says whether this paint was a transition frame: everything
    // else here describes the store the paint DREW FROM either way, which is
    // what both readers want.
    VA.lastTopoRender = { topologyId: topoProj.id, mode: positions.mode,
                          fit: fit, positions: positions,
                          columns: VA.drawnColumn(layout.columns - 1, xTween) + 1,
                          floor: VA.drawnColumn(0, xTween),
                          links: linkAlpha,
                          width: leaderGeo.width, tweening: !!tween,
                          // The DAG ends of the leaders across the seam, in
                          // this SVG's pixels: the page adds the SVG's rect
                          // (VA.seamDots, topology_app.js's drawSeamLeaders).
                          seam: VA.seamDots(layout, geometry, marking ? lit : null,
                                            M, xTween, dagZoom),
                          zoom: zoom };
    var index = VA.topologyIndex(topoProj);

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
    // How much of the pane the reader can actually see -- the window the two
    // drag grips are clamped into (VA.jogGripInset). Measured off the emptied
    // pane, the same box and the same moment the zoom's minimum width is read;
    // 0 in the DOM shim, which reports no widths and needs no clamp.
    var paneWidth = (root && typeof root.clientWidth === "number")
      ? root.clientWidth : 0;
    // The zoom is drawn INTO the rails SVG (railsSvg's DAG layers), so
    // `.tv__zoom` is no longer scaled: it holds the header, the SVG and the
    // grid at the page's own pixels, and its layout is its scroll extent.
    var sizer = VA.el("div", "tv__zoomsizer");
    // The space a study arrival put before the drawing to centre its band
    // (topology_app.js, fitDagTo); it outlives a repaint, not a study change.
    if (ctx.bandPad) {
      if (ctx.bandPad.top > 0) sizer.style.marginTop = ctx.bandPad.top + "px";
      if (ctx.bandPad.left > 0) sizer.style.marginLeft = ctx.bandPad.left + "px";
    }
    var zoomed = VA.el("div", "tv__zoom");
    // The column header rides with the GRID (it used to be the first thing in
    // the pane, above the whole DAG, where its `position: sticky` was inert:
    // the nearest scrollport above it is `.tv__hscroll`, which never scrolls
    // vertically). It sits directly above the first grid row, and
    // VA.pinTopoHead holds it at the top of the visible pane while any row is
    // on screen. The body is pushed down by whatever the head needs above the
    // grid when the centring left less than a head's height there -- both the
    // rails and the grid move together, so every leader's two ends keep their
    // relation.
    // The pane's width: the grips are clamped into the visible window.
    var head = header(leaderGeo, ctx, paneWidth);
    var gridTop = positions.gridOffset || 0;
    var bodyPad = Math.max(0, VA.DAG_FIT.headHeight - gridTop);
    var headTop = bodyPad + gridTop - VA.DAG_FIT.headHeight;
    head.style.top = headTop + "px";
    head.setAttribute("data-natural-top", String(headTop));
    head.setAttribute("data-block-bottom",
      String(bodyPad + gridTop + (positions.gridHeight || 0)));
    // What Fit brings into view, in `.tv__zoom`'s own (unscaled) pixels: the
    // lit set's span in the store, moved down by the body's own padding, and
    // reaching up to the header when the grid is part of it.
    // The DAG's part only: the grid does not scale, so no zoom can fit it.
    // `at(k)` is that span in `.tv__zoom`'s pixels drawn at k, reaching up to
    // the header when the grid is part of what is lit.
    // With nothing lit it is the whole DAG block, not the taller of the two.
    var litSpan = marking ? VA.litSpan(positions, lit, null, M)
      : { top: dagZoom.y0, bottom: dagZoom.y0 + (positions.dagHeight || 0) };
    var withHead = !!(plan.rows.length && marking);
    VA.lastTopoRender.span = {
      top: litSpan.top, bottom: litSpan.bottom,
      at: function (k) {
        return {
          top: Math.min(bodyPad + dagZoom.y0 + k * (litSpan.top - dagZoom.y0),
            withHead ? headTop : Infinity),
          bottom: bodyPad + dagZoom.y0 + k * (litSpan.bottom - dagZoom.y0),
        };
      },
    };
    // Fit's horizontal half: the DAG and its jog zone, at 1 (both scale).
    VA.lastTopoRender.dagWidth = leaderGeo.width / zoom;
    zoomed.appendChild(head);
    var body = VA.el("div", "tv__body");
    if (bodyPad) body.style.paddingTop = bodyPad + "px";
    body.appendChild(railsSvg(geometry, leaderGeo, index,
      marking ? lit.edges : {}, marking ? lit.nodes : {}, marking, ctx, fade,
      fadeLink, hot, layout, lit));
    var rows = grid(plan, index, chain, marking, ctx, positions.gridOffset,
      fade, hot);
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
    zoomed.appendChild(body);
    sizer.appendChild(zoomed);
    hscroll.appendChild(sizer);
    root.appendChild(hscroll);
    // A zoom change repaints at the new scale (VA.applyTopoZoom): the same
    // context, at rest, at k.
    root.topoRezoom = function (k) {
      VA.renderTopoPane(root, Object.assign({}, ctx, {
        zoom: k, tween: null, scrollToGrid: false }));
    };
    VA.applyTopoZoom(root, zoom, true);
    // ...and the reader's sideways scroll back onto the pane that replaced the
    // one they scrolled. Written after the append, so the browser has a laid-
    // out content width to CLAMP it against -- which is the whole behaviour a
    // reader parked at the right-hand end of a grid that just got narrower
    // wants, and the reason this is a restore rather than a stored preference.
    if (carried) hscroll.scrollLeft = carried;
    // ...and the bounded pane's vertical scroll: where the page asks for it,
    // the grid of lit rows at the box's top (`scrollToGrid`, an arrival or a
    // re-lay), otherwise wherever the reader left it.
    if (ctx.bounded) {
      root.scrollTop = ctx.scrollToGrid
        ? Math.max(0, headTop)
        : carriedTop;
    }
    VA.pinTopoHead(root);
    // The one grip whose boundary scrolls, kept over that boundary as the
    // reader scrolls (VA.columnGripLeft). The listener is on the node this
    // render just built, so the next render drops it with the node -- there is
    // nothing to unwire and nothing to leak.
    if (head.placeColumnGrips) {
      var place = function () { VA.syncTopoScroll(root); };
      hscroll.onscroll = place;
      if (carried) place();
    }
    // The outgoing paint, fading out underneath: the rows a study re-lay
    // DROPS are not in the target serialisation at all, so there is nothing
    // in this layout to draw them from. See VA.animateTopoPane for why the
    // already-rendered nodes are re-used rather than re-drawn.
    if (tween && tween.ghost) {
      tween.ghost.style.opacity = String(1 - tween.e);
      root.appendChild(tween.ghost);
      // The ghost shows the SAME horizontal window as the live frame over it.
      // Its `.tv__hscroll` is `overflow: hidden` (topology.css) but is still a
      // scroll container, and re-parenting a node out of the document resets
      // its scroll to 0 -- so without this the cross-fade is two different
      // slices of the same table laid on each other, which reads as the text
      // doubling rather than as one table resolving into another. Taken from
      // the LIVE pane after its own clamp, not from `carried`: the outgoing
      // paint is the wider one, so only the live pane knows which window the
      // reader is actually being shown.
      var ghostPane = tween.ghost.querySelector
        ? tween.ghost.querySelector(".tv__hscroll") : null;
      if (ghostPane) {
        ghostPane.scrollLeft = typeof hscroll.scrollLeft === "number"
          ? hscroll.scrollLeft : carried;
      }
    }
    // The page's overlay reads VA.lastTopoRender.seam and this pane's rect.
    if (ctx.onPainted) ctx.onPainted();
    return root;
  };

  // The horizontal scroll this render inherits, or 0 for a render that should
  // start at the left edge.
  //
  // `VA.renderTopoPane` opens with `VA.clear(root)` and builds a fresh
  // `.tv__hscroll` every call, and a fresh element's `scrollLeft` is 0 -- so
  // before this the reader's sideways position was not clamped, it was
  // DISCARDED, by every render this page does: both leader preferences, the
  // density toggle, the length mode, both resize drags and all sixteen frames
  // of a respine. Measured on the real pitch_system at 1600x1000, a reader
  // parked at the right-hand end (scrollLeft 666 of 666) was at the left edge
  // on the FIRST frame of a study click and still there when it settled.
  //
  // Two judgements live here.
  //
  //   * A DIFFERENT topology starts at the left edge. Two walks share no
  //     horizontal extent -- a column count, a jog zone measured against a
  //     different leader count, a different grid width -- so carrying a
  //     position across is carrying a number, not a place. Same topology, any
  //     serialisation of it, keeps it.
  //   * Mid-respine the outgoing pane is not in `root` any more:
  //     VA.animateTopoPane calls ghostOf BEFORE the first frame, which
  //     re-parents `.tv__hscroll` into the (detached) ghost and drops its
  //     scroll with it. ghostOf reads the number off first and leaves it on
  //     the ghost, which is where the first frame finds it; every frame after
  //     that reads the live pane this function built, already clamped.
  function carriedScroll(root, topoProj, tween) {
    if (!topoProj || !VA.lastTopoRender ||
        VA.lastTopoRender.topologyId !== topoProj.id) return 0;
    var live = (root && root.querySelector)
      ? root.querySelector(".tv__hscroll") : null;
    var n = live ? live.scrollLeft
                 : (tween && tween.ghost ? tween.ghost.paneScrollLeft : 0);
    return typeof n === "number" && n > 0 ? n : 0;
  }

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
  //   from  { positions, columns, floor, width, links } -- the store the
  //         previous paint drew from, and the four things it DREW: the spine's
  //         drawn column index, the leftmost one, the pane width and each
  //         link's opacity (VA.lastTopoRender carries all five). No `from`
  //         means there is nothing to animate between; the pane just renders.
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
  // Returns a handle with `cancel()`, or null when nothing was animated; a
  // caller may set `handle.onSettled`, run once after the settled frame. The
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
                      floor: from.floor, width: from.width, links: from.links,
                      e: VA.respineEase(t), ghost: ghost };
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
      else if (handle.onSettled) handle.onSettled();
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
    // The sideways scroll the outgoing pane was carrying, read HERE or not at
    // all: the append below takes this node out of the document, which resets
    // its scroll to 0. carriedScroll (above) is the one reader -- the first
    // frame of the transition has no live pane left to read.
    ghost.paneScrollLeft = typeof live.scrollLeft === "number" ? live.scrollLeft : 0;
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

  // One scale onto a painted pane. The DAG is drawn at its zoom (railsSvg),
  // so a scale the pane was not painted at repaints it (`topoRezoom`, set by
  // renderTopoPane); one it was painted at only records itself and re-syncs
  // the sideways pins. The wheel calls this per event; renderTopoPane once per
  // paint. Returns the clamped scale applied, or 0 where there is no zoom box.
  VA.applyTopoZoom = function (root, zoom, skipPin) {
    var zoomed = root && root.querySelector ? root.querySelector(".tv__zoom") : null;
    if (!zoomed) return 0;
    var k = VA.clampDagZoom(zoom);
    if (Number(zoomed.getAttribute("data-zoom")) !== k && root.topoRezoom &&
        VA.lastTopoRender && VA.lastTopoRender.zoom !== k) {
      root.topoRezoom(k);
      return k;
    }
    zoomed.setAttribute("data-zoom", String(k));
    var paneWidth = typeof root.clientWidth === "number" ? root.clientWidth : 0;
    zoomed.style.minWidth = paneWidth > 0 ? paneWidth + "px" : "100%";
    VA.syncTopoScroll(root);
    if (!skipPin) VA.pinTopoHead(root);
    return k;
  };

  // The sideways scroll, for the one thing that follows it by hand: the
  // column grips' pin to the pane's right edge. The rails and the jog grip
  // are plain `position: sticky` at every zoom, since nothing above them is
  // scaled any more.
  VA.syncTopoScroll = function (root) {
    var hscroll = root && root.querySelector ? root.querySelector(".tv__hscroll") : null;
    var zoomed = hscroll ? hscroll.querySelector(".tv__zoom") : null;
    if (!zoomed) return;
    var left = typeof hscroll.scrollLeft === "number" ? hscroll.scrollLeft : 0;
    var head = zoomed.querySelector(".tv__head");
    if (head && head.placeColumnGrips) {
      head.placeColumnGrips(left, hscroll.clientWidth || 0);
    }
  };

  // Holding the column header at the top of what the reader can see
  // (the_dag_is_zoomable_and_a_length_mode_draws_to_scale). A CSS `position:
  // sticky` cannot do it: the head lives inside `.tv__hscroll`, which is the
  // nearest scrollport and never scrolls vertically, so the browser pins it
  // against a box that does not move. The page scrolls (or, on the kinematic
  // page, the bounded pane does), so the pin is written from the scroll
  // events themselves -- synchronously, before the frame paints, so it does
  // not lag the rows it labels.
  //
  // How far the head must move DOWN from its natural place, on screen: it
  // follows the top of the visible window once that has passed it, and stops
  // when it would leave the grid block it labels.
  VA.headPinOffset = function (naturalTop, visibleTop, blockBottom, headHeight) {
    var room = blockBottom - headHeight - naturalTop;
    return Math.max(0, Math.min(visibleTop - naturalTop, room));
  };

  // The top of what the reader can see of the drawing, in viewport pixels: the
  // bounded pane's own top, otherwise the sticky page bar's bottom.
  function visibleTop(root) {
    if (root.classList && root.classList.contains("tv__scroll--bounded")) {
      return root.getBoundingClientRect().top;
    }
    var bar = typeof document !== "undefined" && document.querySelector
      ? document.querySelector(".topbar") : null;
    return bar && bar.getBoundingClientRect ? bar.getBoundingClientRect().bottom : 0;
  }

  VA.pinTopoHead = function (root) {
    if (!root || !root.querySelector) return 0;
    var head = root.querySelector(".tv__head");
    var zoomed = head && head.parentNode;
    if (!head || !zoomed || typeof zoomed.getBoundingClientRect !== "function") return 0;
    // The header is at the grid's scale, which is 1 whatever the DAG's zoom.
    var natural = parseFloat(head.getAttribute("data-natural-top")) || 0;
    var bottom = parseFloat(head.getAttribute("data-block-bottom")) || 0;
    var top = zoomed.getBoundingClientRect().top;
    var dy = VA.headPinOffset(top + natural, visibleTop(root), top + bottom,
      VA.DAG_FIT.headHeight);
    // `top`, not a transform: a transform on the head is what the respine's
    // settled-frame check reads as an unfinished transition.
    head.style.top = (natural + dy) + "px";
    head.setAttribute("data-pinned", dy > 0 ? "1" : "");
    return dy;
  };

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
    // 260, not the 200 it was until viewer_study_verdicts_and_gaps: this cell
    // clips rather than wraps (`.tvcell__chipswrap`, topology.css — a <tr>'s
    // height is a floor, so a wrapped chip would grow the row off its leader's
    // seam), and the row's loud "what is wrong with this number" badges now sit
    // in it ahead of the citation chip. At 200 a badged row clipped its own
    // citation chip, which is the trigger for the citation card.
    { cls: "chips", label: "sourcing", width: 260 },
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

  // --- the preview pane's width (Jeff, 2026-09-15: "it's too narrow") -------
  //
  // The pane shows a drawing crop at the pane's own width, so how wide it
  // wants to be is a property of the DOCUMENT a reader happens to be reading,
  // not something this page can pick once. It is dragged, by the divider on
  // its left edge (topology.html), and remembered.
  //
  // `min` keeps the values column's two number rows from wrapping; `max`
  // exists so a drag cannot leave the grid unreadably narrow, which is the
  // only failure a drag on this divider can produce. `preset` is the width
  // topology.css declares — not repeated here, READ from the pane at boot, so
  // the stylesheet stays the one place the default lives.
  VA.TOPO_PANE_WIDTH = { min: 320, max: 1000 };

  VA.clampPaneWidth = function (px) {
    var n = Math.round(Number(px));
    if (!isFinite(n)) return VA.TOPO_PANE_WIDTH.min;
    return Math.min(VA.TOPO_PANE_WIDTH.max,
      Math.max(VA.TOPO_PANE_WIDTH.min, n));
  };

  // The width a drag lands on. The pane is on the RIGHT of its divider, so
  // dragging left (negative dx) makes it WIDER — the sign inversion is here,
  // in the pure layer, rather than in the app shell's pointer handler, for the
  // same reason VA.jogZoneScaleAfterDrag is: it is the one line of arithmetic
  // a test can check without a pointer, and getting it backwards is the
  // likeliest mistake in the whole feature.
  VA.paneWidthAfterDrag = function (startWidth, dx) {
    return VA.clampPaneWidth(startWidth - dx);
  };

  // Where the remembered width is kept, and the ONE key it is kept under.
  // Jeff asked for the width to persist and said localStorage is fine.
  //
  // This is the first preference on this page that outlives the session, and
  // it is deliberately the only one: the others (row density, edge length
  // mode, leader style, jog zone scale) are ways of reading the DIAGRAM, and
  // topology_app.js's own comment on `jogZoneScale` argues they are better
  // reset — a stored pixel width for a jog zone crushes one topology's lanes
  // and barely moves another's. A pane width has none of that coupling: it is
  // a property of the window, it means the same thing on every topology and
  // in both modes, and it is the one Jeff noticed was wrong.
  //
  // `store` is injected so both directions are testable without a browser,
  // and every access is wrapped: a file:// page's localStorage is per-path at
  // best and throws outright in some configurations, and a preference is never
  // worth a crash. A read that cannot answer returns null, which the caller
  // reads as "no preference stored" — the stylesheet's width.
  VA.PANE_WIDTH_KEY = "tolstack.viewer.detailWidth";

  // Both directions of a remembered width, over any key and any clamp. Two
  // widths are remembered on this page now (the preview pane, the annotator
  // flyout) and every wrapper below is one line, so the try/catch discipline
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
  VA.FLYOUT_WIDTH = { min: 400, max: 1200, reserve: 320 };

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
  function header(leaderGeo, ctx, paneWidth) {
    var railWidth = leaderGeo.width;
    var head = VA.el("div", "tv__head");
    head.style.paddingLeft = railWidth + "px";
    var table = VA.el("table", "tvheadtable");
    table.style.width = tableWidth() + "px";
    table.appendChild(colgroup());
    var tr = VA.el("tr");
    // The grid's left edge is the SVG's right edge, so a column's boundary in
    // the SCROLLPORT'S own coordinates is the rail width plus every column
    // before it. Accumulated here rather than measured off the DOM: the
    // header is being built, there is nothing laid out to measure, and this
    // is the same COLUMNS array the <col> widths come from.
    var boundary = railWidth;
    var lanes = [];
    var columnGrips = [];
    COLUMNS.forEach(function (c) {
      var th = VA.el("th", "tvcell tvcell--" + c.cls, c.label);
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
    // The jog zone's own grip, on the seam between the SVG and the grid --
    // the boundary a reader would grab anyway. It takes no layout width (see
    // `.tvgrip` / `.tv__griplane`, topology.css): a grip that took space would
    // push itself in between a leader's last segment and the grid's first
    // column, and that hand-off is the one place on this page with no seam to
    // align.
    //
    // `naturalZone` rides along because the drag is measured in pixels and
    // the preference is held as a multiple of it -- without it the app shell
    // would have nothing to divide by.
    var jogGrip = resizeGrip("jog",
      "Drag to spread the leader lines out.", ctx,
      { kind: "jog", naturalZone: leaderGeo.naturalZone });
    // A sticky INSET, not a content coordinate: the seam this grip marks is
    // itself sticky, so it is a fixed distance from the pane's visible left
    // edge at every scroll (VA.jogGripInset).
    jogGrip.style.left = VA.jogGripInset(railWidth, paneWidth) + "px";
    lanes.push(gripLane(jogGrip));
    lanes.forEach(function (lane) { head.appendChild(lane); });
    // The column grips are the ones a SCROLL moves, so unlike the jog grip's
    // sticky inset theirs is re-written as the pane scrolls. Hung on the node
    // rather than wired here: the pane the scroll event comes from is built by
    // renderTopoPane, one level up, and dies with the next render along with
    // this closure.
    head.placeColumnGrips = function (scrollLeft, visibleWidth) {
      columnGrips.forEach(function (entry) {
        entry.grip.style.left =
          VA.columnGripLeft(entry.boundary, scrollLeft, visibleWidth) + "px";
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

  // Where the jog grip sits, measured from the pane's VISIBLE left edge.
  //
  // Normally the seam: `.tv__rails` is `position: sticky; left: 0`, so the
  // SVG's right edge is `railWidth` from that edge whatever the horizontal
  // scroll is, and a grip pinned at the same inset rides it exactly.
  //
  // Clamped when the DAG is wider than the pane shows, which a reader reaches
  // by dragging the preview pane open (at VA.TOPO_PANE_WIDTH.max the grid gets
  // ~298px, narrower than pitch_system's own 316px DAG) or by dragging the jog
  // zone out. There the seam is off the pane's right edge and no scroll brings
  // it back -- the rails are sticky, so they do not move out of the way -- and
  // a grip left out there is a control the reader can see the effect of and
  // never reach. Clamped, it stops naming its seam exactly; unclamped, it
  // stops being a control at all. `2 * width` keeps it one grip clear of the
  // ELEMENT grip's own right-hand pin (VA.columnGripLeft's own clamp, which
  // lands at `paneWidth - width`) so the two never land on the same pixel.
  //
  // 0 for `paneWidth` means "nothing laid out to clamp against" -- the DOM
  // shim the fast tier renders into, which reports no widths at all.
  VA.jogGripInset = function (railWidth, paneWidth) {
    var seam = railWidth - VA.TOPO_GRIP.half;
    if (!paneWidth || paneWidth <= 0) return seam;
    return Math.max(0, Math.min(seam, paneWidth - 2 * VA.TOPO_GRIP.width));
  };

  // Where a resizable column's grip sits, in the SCROLLPORT'S own coordinates
  // -- `boundary` is that column's right edge, rails included.
  //
  // Not an inset, unlike the jog grip's: this boundary is a column edge and
  // really does scroll, so the grip rides it while it is on screen (the value
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
  // holding exactly one grip. Both grips carry an inline `left` -- a sticky
  // inset for the jog one, a written scrollport coordinate for a column's --
  // so the lane contributes nothing but the box those are measured in. One
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

  // Which drawn line each row, mark and curve belongs to.
  //
  // A rail is identified by its POSITION IN `layout.rails` and never by its
  // column: the column index is a drawing decision (VA.spineRight mirrors
  // every one of them before this sees them, and the projection is free to
  // renumber), while the rails array is the serialisation's own order. The
  // column is used only the way the layout itself uses it — matching a row to
  // the rail drawn at the same column over the same row span — which is an
  // equality between two numbers out of the same layout and survives any
  // renumbering of both.
  function hotState(layout) {
    var rails = (layout && layout.rails) || [];
    var rows = (layout && layout.rows) || [];
    var links = (layout && layout.links) || [];
    var hot = {
      // railId -> entries lit `--hot`; key -> entries lit `--lead`.
      rail: {}, lead: {},
      // key (and railId) -> the railId it lights.
      railOf: {},
      // Parallel to layout.rails / layout.links, which VA.railGeometry walks
      // in the same order, so the view can register a drawn thing by index.
      rails: [], railOfLink: [],
      // The two adjacencies the `--lead` set needs: an edge's two interfaces
      // and an interface's edges, off the walk's own `entered_at`/`left_at`.
      nodesOfEdge: {}, edgesAtNode: {}, studyOfEdge: {},
      on: null, marked: [],
      // The one-line hover label (VA.hoverLabelPlacement): where each key's
      // label is anchored, every mark's box it must not cover, and the layer
      // it is drawn into. Filled by railsSvg; a pane with no rails has none.
      labels: {}, obstacles: [], label: null,
    };
    rails.forEach(function (rail, i) {
      var id = "rail|" + i;
      hot.rails.push(id);
      hot.railOf[id] = id;
    });
    // The rail drawn at `column` that covers `row`. A column is REUSED once a
    // branch has ended (build_topology_projection.py's own note), so the row
    // span is what tells two rails on one column apart.
    var covering = function (column, row) {
      for (var i = 0; i < rails.length; i++) {
        if (rails[i].column === column &&
            row >= rails[i].start && row <= rails[i].end) return hot.rails[i];
      }
      return null;
    };
    rows.forEach(function (row) {
      hot.railOf[hotKey(row.kind, row.id)] = covering(row.column, row.row);
      if (row.kind !== "edge") return;
      var ends = [row.entered_at, row.left_at].filter(Boolean);
      hot.nodesOfEdge[row.id] = ends;
      ends.forEach(function (nodeId) {
        (hot.edgesAtNode[nodeId] || (hot.edgesAtNode[nodeId] = [])).push(row.id);
      });
    });
    links.forEach(function (link) {
      // A branch OPENS the rail it fans out into — the one allocated at this
      // very row — so it is matched on the start rather than on containment,
      // which is what tells two branches out of one fork apart. A close LEAVES
      // the rail its closing edge sits on, which is the leg a reader is
      // tracing when they follow the dashed curve back up.
      hot.railOfLink.push(link.kind === "branch"
        ? opening(rails, hot.rails, link.to_column, link.row)
        : covering(link.from_column, link.row));
    });
    return hot;
  }

  function opening(rails, ids, column, row) {
    for (var i = 0; i < rails.length; i++) {
      if (rails[i].column === column && rails[i].start === row) return ids[i];
    }
    return null;
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
    if (spec.rail && entry.hot) {
      (hot.rail[spec.rail] || (hot.rail[spec.rail] = [])).push(entry);
    }
    (spec.leads || []).forEach(function (key) {
      (hot.lead[key] || (hot.lead[key] = [])).push(entry);
    });
    return spec.el;
  }

  function setHot(hot, key) {
    if (!hot || hot.on === key) return;
    hot.on = key;
    if (hot.onChange) hot.onChange(key);
    drawHoverLabel(hot, key);
    while (hot.marked.length) {
      var was = hot.marked.pop();
      was.el.setAttribute("class", was.base);
    }
    if (!key) return;
    var light = function (entry, extra) {
      entry.el.setAttribute("class", entry.base + " " + extra);
      hot.marked.push(entry);
    };
    var railId = hot.railOf[key];
    (railId ? hot.rail[railId] || [] : []).forEach(function (entry) {
      light(entry, entry.hot);
    });
    // After the line, so an element that is both keeps the stronger of the
    // two. A `--lead` carries `--hot` with it where it has one, which is what
    // lets the browser tier ask the handoff's question ("hovering the bar
    // marks the row `--hot`") of either level.
    // A registered node may carry only one of the two (a hit path has a halo
    // and no lead state of its own; a leader has a lead state and no place in
    // the leg's glow), so the pair is joined rather than branched on -- a
    // missing half used to arrive in the class string as the word "null".
    (hot.lead[key] || []).forEach(function (entry) {
      light(entry, [entry.hot, entry.lead].filter(Boolean).join(" "));
    });
  }

  // Hover and keyboard focus drive the same state, and leaving clears it only
  // if this element is still the one holding it: moving the pointer from a bar
  // onto the rail under it fires the new element's `mouseenter` and the old
  // one's `mouseleave`, and a clear that did not check would race the set.
  //
  // Composed onto whatever the node already carries rather than assigned: a
  // bar's hit path opens a card on the same two events (cardOnHover above), and
  // `onmouseenter = ...` there would have silently replaced it.
  function hotHover(hot, node, key) {
    chain(node, "onmouseenter", function () { setHot(hot, key); });
    chain(node, "onfocus", function () { setHot(hot, key); });
    chain(node, "onmouseleave", function () { if (hot.on === key) setHot(hot, null); });
    chain(node, "onblur", function () { if (hot.on === key) setHot(hot, null); });
    return node;
  }

  // The hovered mark's label, and nothing else: one <text>, drawn into the
  // DAG's top layer at the mark's zoom and counter-scaled so it reads at the
  // micro step whatever the zoom. It takes no pointer, so it can never stand
  // between the reader and the mark they are reaching for.
  function drawHoverLabel(hot, key) {
    var layer = hot.label && hot.label.layer;
    if (!layer) return;
    VA.clear(layer);
    var anchor = key ? hot.labels[key] : null;
    if (!anchor) return;
    var m = VA.HOVER_LABEL_METRICS;
    var k = hot.label.zoom || 1;
    var text = VA.hoverLabelText(anchor.text, anchor.note);
    var w = (text.length * m.charPx + 2 * m.pad) / k;
    var h = m.height / k;
    var at = VA.hoverLabelPlacement(anchor, w, h, hot.obstacles, hot.label.bounds,
      anchor.box);
    var node = VA.svg("text", "rail__hoverlabel", {
      x: 0, y: 0,
      transform: "translate(" + (at.x1 + m.pad / k) + " " + (at.y1 + h / 2) +
        ") scale(" + (1 / k) + ")",
    });
    node.setAttribute("data-label-for", key);
    node.setAttribute("data-label-side", at.side);
    node.setAttribute("aria-hidden", "true");
    node.textContent = text;
    layer.appendChild(node);
  }

  function chain(node, name, fn) {
    var prev = node[name];
    node[name] = typeof prev === "function"
      ? function (event) { prev(event); fn(event); }
      : fn;
  }

  // --- the SVG -------------------------------------------------------------

  function railsSvg(geometry, leaderGeo, index, chain, chainNodes, marking, ctx,
                    fade, fadeLink, hot, layout, lit) {
    // The SVG spans the rails AND the leader jog zone: its right edge is the
    // grid table's left edge, so a leader's final horizontal segment hands off
    // to its row's boundary with no seam to keep aligned.
    var width = leaderGeo.width;
    var height = leaderGeo.height;
    var svg = VA.svg("svg", "tv__rails", {
      width: width,
      height: height,
      viewBox: "0 0 " + width + " " + height,
    });
    svg.style.minWidth = width + "px";
    svg.style.height = height + "px";
    // The DAG's own drawing goes in layers at its zoom, about the DAG's
    // top-left (VA.leaderGeometry's `zoom`); the bands and the leaders, which
    // end on the unscaled grid, are drawn in the SVG's own pixels between them.
    var dagTransform = leaderGeo.zoom !== 1
      ? "translate(0 " + leaderGeo.y0 + ") scale(" + leaderGeo.zoom + ") translate(0 " +
        (-leaderGeo.y0) + ")"
      : null;
    var dagLayer = function () {
      var g = VA.svg("g", "tv__dag");
      if (dagTransform) g.setAttribute("transform", dagTransform);
      svg.appendChild(g);
      return g;
    };

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

    // 0b. the joint glyphs' symbols, once per SVG (interface_glyphs.js).
    svg.appendChild(VA.interfaceGlyphDefs());

    var under = dagLayer();

    // Every mark's record title (VA.elementRecords, built once per page state)
    // is its accessible name and its hover label; nothing here composes one.
    var records = VA.elementRecords(ctx.topoProj, VA.previewRecordOptions(ctx));
    var recordTitle = function (kind, id) {
      var record = records[hotKey(kind, id)];
      return record ? record.title : String(id);
    };
    // A mark's label anchor and its box, the box also an obstacle every other
    // mark's label must stay off. The first registration of a key wins.
    var labelAt = function (key, x, y, r, text, box) {
      var own = box && box.x1 !== undefined ? box
        : { x1: x - r, x2: x + r, y1: y - r, y2: y + r };
      hot.obstacles.push(own);
      if (!hot.labels[key]) {
        hot.labels[key] = { x: x, y: y, r: r, text: text, note: (box && box.note) || null,
                            box: own };
      }
    };

    // 0c. the bodies (docs/DAG_TOPOLOGY.md, "Bodies on the DAG"): a rounded
    //     field behind each body's block, its name once at the top-left, in
    //     the body's own muted tint -- or a flat outline when nothing the
    //     current study lights is inside it. The name is the collapse
    //     control; a collapsed body is its pill (drawn with the marks, 3.)
    //     and gets no field of its own.
    var bodiesById = {};
    ((ctx.topoProj && ctx.topoProj.bodies) || []).forEach(function (b) {
      bodiesById[b.id] = b;
    });
    var pillRows = {};
    geometry.marks.forEach(function (mark) {
      if (mark.collapsed) pillRows[mark.row] = true;
    });
    // A body the band split (VA.bandLayout) is several fields and is named
    // once: on its field in the band.
    var named = VA.bodyLabelFields(geometry.bodies, layout && layout.rows, lit);
    // The names go in after the study groups (0c'), so a group's see-through
    // field never sits over the control that folds a body.
    var bodyNames = [];
    (geometry.bodies || []).forEach(function (field, f) {
      if (geometry.showBodies === false) return;
      if (pillRows[field.start]) return;
      var body = bodiesById[field.body] || { id: field.body, name: field.body };
      var flat = marking && !VA.bodyIsLit(layout && layout.rows, field.body, lit);
      var cls = "tv__bodyfield tv__bodyfield--t" + VA.bodyTint(ctx.topoProj, field.body) +
        (flat ? " tv__bodyfield--flat" : "");
      var rect = VA.svg("rect", cls, {
        x: field.x1, y: field.y1, width: Math.max(0, field.x2 - field.x1),
        height: Math.max(0, field.y2 - field.y1), rx: 6, ry: 6,
      });
      rect.setAttribute("data-body", field.body);
      under.appendChild(rect);
      if (named[f]) bodyNames.push(bodyName(body, field.x1 + 4, field.y1 + 9, false, ctx));
    });

    // 0c'. the study groups (a_study_is_a_translucent_group_on_the_dag): a
    //      see-through field per run of a study's rows, over the bodies and
    //      under every mark, in the study kind's hue. It wraps the body field
    //      it coincides with; two groups overlap and both show. Hover lights
    //      the study's rows and bars (the shared hover, keyed `study|<id>`);
    //      the title, once, on the first span, opens the study.
    (geometry.groups || []).forEach(function (group) {
      var key = hotKey("study", group.id);
      group.spans.forEach(function (span, i) {
        var rect = VA.svg("rect", "tv__studyfield tv__studyfield--" + group.kind +
          (group.selected ? " tv__studyfield--selected" : ""), {
          x: span.x1, y: span.y1, width: Math.max(0, span.x2 - span.x1),
          height: Math.max(0, span.y2 - span.y1), rx: 9, ry: 9,
        });
        rect.setAttribute("data-study-group", group.id);
        under.appendChild(hotHover(hot, rect, key));
        if (i) return;
        var label = VA.svg("text", "tv__studyname", { x: span.x1 + 6, y: span.y1 + 3 });
        label.textContent = fitText(group.title, Math.max(span.x2 - span.x1 - 8, 84));
        label.appendChild(svgTitle(group.title + " — click to open this study"));
        label.setAttribute("data-study-open", group.id);
        label.setAttribute("tabindex", "0");
        label.setAttribute("role", "button");
        var open = function () { if (ctx.onOpenStudy) ctx.onOpenStudy(group); };
        label.onclick = open;
        label.onkeydown = function (event) {
          if (event && (event.key === "Enter" || event.key === " ")) {
            if (event.preventDefault) event.preventDefault();
            open();
          }
        };
        hotHover(hot, label, key);
        bodyNames.push(label);
      });
    });
    bodyNames.forEach(function (node) { under.appendChild(node); });

    // 0d. the sub-stacks (a kinematic page's `study_ref`s,
    //     VA.kinematicSubStacks): a dashed field around each of the chain's
    //     bars -- inside whichever body each bar is in -- and the study's
    //     title and folded interval once, at the topmost. CLOSED, the bars
    //     inside are drawn as one muted fold (`rail__bar--folded`) and the
    //     label stands for them; OPEN, they wear their own colours. The label
    //     opens and closes it, and the contributor table's group row with it.
    var folded = {};
    (ctx.subStacks || []).forEach(function (sub) {
      var open = !!(ctx.openSubStacks && ctx.openSubStacks[sub.id]);
      var marks = geometry.marks.filter(function (mark) {
        return mark.kind === "edge" && sub.edges.indexOf(mark.id) !== -1;
      });
      if (!marks.length) return;
      marks.forEach(function (mark) {
        if (!open) folded[mark.id] = true;
        var field = VA.svg("rect", "tv__substack", {
          x: mark.x - 7, y: mark.y1 - 1, width: 14,
          height: Math.max(0, mark.y2 - mark.y1 + 2), rx: 4, ry: 4,
        });
        field.setAttribute("data-substack", sub.id);
        under.appendChild(field);
      });
      var top = marks.reduce(function (a, b) { return b.y1 < a.y1 ? b : a; });
      var label = VA.svg("text", "tv__substackname", { x: top.x + 10, y: top.y1 + 9 });
      label.textContent = (open ? "▾ " : "▸ ") + sub.title +
        (sub.interval ? " · " + sub.interval : "");
      label.appendChild(svgTitle(sub.title + (sub.interval ? ", " + sub.interval : "") +
        " — its terms enter one by one; this total is shown, never added"));
      label.setAttribute("data-substack-toggle", sub.id);
      label.setAttribute("tabindex", "0");
      label.setAttribute("role", "button");
      label.setAttribute("aria-expanded", open ? "true" : "false");
      var toggle = function () { if (ctx.onToggleSubStack) ctx.onToggleSubStack(sub.id); };
      label.onclick = toggle;
      label.onkeydown = function (event) {
        if (event && (event.key === "Enter" || event.key === " ")) {
          if (event.preventDefault) event.preventDefault();
          toggle();
        }
      };
      under.appendChild(label);
    });

    // 1. the rails themselves: continuous, neutral, alternating shade by column
    //    parity so two rails crossing can still be told apart. NOT a categorical
    //    palette — see the page's legend for why there isn't one.
    //    Mid-respine a rail needs no fade of its own, and this is the whole
    //    reason why: a column the transition is adding is drawn collapsed
    //    onto the OUTGOING FRAME'S LEFTMOST RAIL at e = 0 and unfolds out of
    //    it (VA.respineX, whose `floor` is that rail), so there is nothing to
    //    appear from nowhere -- from a settled outgoing frame or from a
    //    transition frame alike. Every column both serialisations have has a
    //    rail on both sides, so those are the only rails a respine can add.
    //    The marks on a rail are keyed and the store fades those.
    //    Each rail carries a transparent wide twin (`rail__hit`, the same
    //    invisible-but-hoverable trick `.rail__barhit` uses) so a 2px line can
    //    be pointed at: it is what makes "hover anywhere on this leg" a
    //    reachable gesture rather than a pixel hunt. Drawn immediately after
    //    its rail and therefore UNDER every bar, dot and leader, so it can
    //    never steal a hover from a mark that has a card to open.
    // The links' hit paths sit UNDER every rail's (2026-10-26): a closing
    // curve between two neighbouring columns is nearly vertical over a long
    // loop, and its wide hit path lay over the rails beside it for hundreds of
    // pixels, so on the body-major product model a dozen legs had no point a
    // pointer could reach. Under them, a rail wins wherever the two overlap,
    // and a link is still hoverable everywhere no rail is -- which is most of
    // its length, and lights the same leg either way (2., below).
    var linkHits = VA.svg("g", "rail__linkhits");
    under.appendChild(linkHits);
    geometry.rails.forEach(function (rail, i) {
      var railId = hot.rails[i];
      var base = "rail rail--" + (rail.column % 2 ? "odd" : "even");
      var ends = { x1: rail.x, y1: rail.y1, x2: rail.x, y2: rail.y2 };
      under.appendChild(hotRegister(hot, {
        el: VA.svg("line", base, ends), base: base,
        rail: railId, hot: "rail--hot",
      }));
      under.appendChild(hotHover(hot, hotRegister(hot, {
        el: VA.svg("line", "rail__hit", ends), base: "rail__hit",
        rail: railId, hot: "rail__hit--hot",
      }), railId));
    });

    // 2. the fan-outs and the loop closures. A link is the one drawn thing the
    //    unfold above does NOT cover: it belongs to a pair of columns, and a
    //    link a respine adds between two columns BOTH serialisations have
    //    arrives on rails that never move. So it carries an opacity of its
    //    own, keyed on its two ends' elements (VA.linkOpacity).
    //    A link belongs to the leg it OPENS (a branch) or LEAVES (a close),
    //    so hovering one lights the same line hovering its rail does -- which
    //    is the whole of "a hovered rail is emphasised along its whole
    //    length" at the two places a leg changes column.
    geometry.links.forEach(function (link, i) {
      var railId = hot.railOfLink[i];
      var base = "rail__link rail__link--" + link.kind;
      under.appendChild(hotRegister(hot, {
        el: fadeLink(VA.svg("path", base, { d: link.d }), link.key),
        base: base, rail: railId, hot: "rail__link--hot",
      }));
      linkHits.appendChild(hotHover(hot, hotRegister(hot, {
        el: VA.svg("path", "rail__linkhit", { d: link.d }), base: "rail__linkhit",
        rail: railId, hot: "rail__linkhit--hot",
      }), railId));
    });

    // 2b. the leaders (viewer_leader_line_grid): one jogged line per
    //     NON-internal node, from its dot to the seam between the two grid
    //     rows it separates. An internal node — every adjacent edge on one
    //     part — gets none, and that omission is what makes the component
    //     grouping visible: leaders appear only at part boundaries. The
    //     visible path is thin; a wider invisible twin (`rail__leaderhit`,
    //     same shape as the edge bars' own hit path) carries the hover title,
    //     the click and the addressable data attributes.
    //
    //     With a study selected there is no `--off` leader to draw: the plan
    //     this reads emits a leader only for a CHAIN node
    //     (viewer_respine_whole_walk), which is the "it should be fairly
    //     obvious that there are no leader lines pointing to certain
    //     elements" half of the emphasis — absence, not a faded line.
    //
    //     Selected by the one rule the leaders across the seam use too
    //     (VA.selectedLeaderNodes): a node's own, an edge's two ends -- and
    //     with anything selected, every other leader steps back.
    var leaderLit = VA.selectedLeaderNodes(ctx.selection, index);
    var leaderEdges = VA.leaderEdgesAt(index);
    leaderGeo.leaders.forEach(function (leader) {
      var node = index.nodes[leader.id];
      var leaderLeads = [hotKey("node", leader.id)].concat(
        (leaderEdges[leader.id] || []).map(function (id) { return hotKey("edge", id); }));
      var classes = ["rail__leader"];
      if (marking) classes.push("rail__leader--on");
      if (leaderLit[leader.id]) classes.push("rail__leader--selected");
      else if (ctx.selection) classes.push("rail__leader--dim");
      var leaderBase = classes.join(" ");
      // A leader is `--lead` only, never part of the leg's own glow: it leaves
      // the rail rather than running along it, and lighting every leader off a
      // nine-edge mainline turns the jog zone into a fan. It leads for its own
      // node AND for every edge that ends there (VA.leaderEdgesAt, the
      // selection rule read backwards): hovering a grid row lights exactly
      // its two ends' leaders, the ones the 3D overlay lights too. It used to
      // lead for the edge whose row starts at its seam, which lit up to three
      // leaders from nodes the hovered edge does not name (2026-10-29).
      svg.appendChild(hotRegister(hot, {
        el: fade(VA.svg("path", leaderBase, { d: leader.d }), "node", leader.id),
        base: leaderBase,
        leads: leaderLeads,
        hot: "rail__leader--hot", lead: "rail__leader--lead",
      }));
      var hit = hotRegister(hot, {
        el: fade(VA.svg("path", "rail__leaderhit", { d: leader.d }),
          "node", leader.id),
        base: "rail__leaderhit",
        leads: leaderLeads,
        lead: "rail__leaderhit--hot",
      });
      hotHover(hot, hit, hotKey("node", leader.id));
      hit.setAttribute("data-leader-id", leader.id);
      hit.setAttribute("data-boundary-edge", leader.beforeEdge || "");
      // Its node's record names it; the label is drawn at the node's dot.
      wire(hit, ctx, "node", leader.id, recordTitle("node", leader.id), true);
      svg.appendChild(hit);
    });

    var over = dagLayer();

    // 3. one mark per row: a bar for an edge (the dimension IS the segment), a
    //    dot for a node (the interface IS the point).
    var formMarks = VA.formMarks(ctx.topoProj);
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
        if (folded[mark.id]) classes.push("rail__bar--folded");
        var otherVariant = !!(edge && edge.part && ctx.otherVariantParts &&
          ctx.otherVariantParts[edge.part]);
        if (otherVariant) classes.push("rail__bar--other-variant");
        // The bar's extent comes off the keyed position store (via
        // railGeometry's mark), not re-derived from rowHeight here — under a
        // scaled length mode a bar's slot is its own height.
        var y1 = mark.y1;
        var y2 = mark.y2;
        var barBase = classes.join(" ");
        var bar = hotRegister(hot, {
          el: fade(VA.svg("line", barBase, {
            x1: mark.x, y1: y1, x2: mark.x, y2: y2,
          }), "edge", mark.id),
          base: barBase, rail: hot.railOf[hotKey("edge", mark.id)],
          leads: [hotKey("edge", mark.id)].concat(hot.studyOfEdge[mark.id] || []),
          hot: "rail__bar--hot", lead: "rail__bar--lead",
        });
        over.appendChild(bar);

        // A floored bar (scaled modes only) wears a drafting-style break
        // across its middle: this length is the minimum render length, not a
        // measured proportion, and a reader must be able to tell at a glance.
        if (mark.floored) {
          over.appendChild(fade(VA.svg("path", "rail__break", {
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
        var hit = hotRegister(hot, {
          el: fade(VA.svg("line", "rail__barhit",
            { x1: mark.x, y1: y1, x2: mark.x, y2: y2 }), "edge", mark.id),
          base: "rail__barhit", rail: hot.railOf[hotKey("edge", mark.id)],
          leads: [hotKey("edge", mark.id)].concat(hot.studyOfEdge[mark.id] || []),
          hot: "rail__barhit--hot",
        });
        // No card and no native title (a_preview_pane_replaces_the_hover_
        // popups_and_one_record_backs_every_mark): hovering the bar previews
        // its record in the right-hand pane and draws ONE line of label beside
        // it (labelAt below) -- the record's title, plus the one fact about
        // the PICTURE rather than the edge: a floored bar is not to scale, a
        // dimmed one is the other variant's.
        var barNote = [otherVariant ? VA.OTHER_VARIANT_NOTE : null,
          mark.floored ? VA.FLOORED_RENDER_NOTE : null].filter(Boolean).join(", ");
        var barHalf = Math.max(3, VA.INTERFACE_GLYPH_PX / 2 + 1);
        labelAt(hotKey("edge", mark.id), mark.x, (y1 + y2) / 2, barHalf,
          recordTitle("edge", mark.id), { note: barNote || null, x1: mark.x - barHalf, x2: mark.x + barHalf, y1: Math.min(y1, y2),
            y2: Math.max(y1, y2) });
        wire(hit, ctx, "edge", mark.id, recordTitle("edge", mark.id));
        hotHover(hot, hit, hotKey("edge", mark.id));
        over.appendChild(hit);

        // The joint glyph (interface_glyphs.js) at the bar's midpoint, in the
        // bar's colour, and the form mark for a form element on the bar
        // itself. Each carries the edge's own hover card and click.
        var glyphY = (y1 + y2) / 2;
        var glyphClass = "rail__glyph " +
          (edge ? VA.confidenceClass(edge.confidence) : "") +
          (edge && edge.value_source === "derived" ? " rail__glyph--derived" : "") +
          (marking ? (inChain ? " rail__glyph--on" : " rail__glyph--off") : "") +
          (otherVariant ? " rail__glyph--other-variant" : "");
        var glyphs = [];
        if (edge && edge.interface && VA.INTERFACE_GLYPHS[edge.interface]) {
          glyphs.push(VA.glyphUse(VA.interfaceGlyphId(edge.interface), mark.x,
            glyphY, glyphClass));
        }
        if (formMarks.edges[mark.id]) {
          glyphs.push(VA.glyphUse(VA.FORM_GLYPH_ID, mark.x,
            glyphs.length ? glyphY + VA.INTERFACE_GLYPH_PX : glyphY, glyphClass));
        }
        glyphs.forEach(function (use) {
          over.appendChild(fade(VA.svg("circle", "rail__glyphbg", {
            cx: mark.x,
            cy: Number(use.getAttribute("y")) + VA.INTERFACE_GLYPH_PX / 2,
            r: VA.INTERFACE_GLYPH_PX / 2 + 1,
          }), "edge", mark.id));
          fade(use, "edge", mark.id);
          wire(use, ctx, "edge", mark.id, recordTitle("edge", mark.id));
          hotHover(hot, use, hotKey("edge", mark.id));
          over.appendChild(use);
        });
        return;
      }
      if (mark.collapsed) {
        over.appendChild(collapsedPill(mark, bodiesById, ctx, marking, layout, lit));
        return;
      }
      var node = index.nodes[mark.id];
      var dotClasses = ["rail__dot"];
      if (mark.branch) dotClasses.push("rail__dot--branch");
      if (node && node.kind === "datum_feature") dotClasses.push("rail__dot--datum");
      if (marking) dotClasses.push(chainNodes[mark.id] ? "rail__dot--on" : "rail__dot--off");
      // Dimmed only when every part meeting here belongs to the other variant.
      if (node && node.parts && node.parts.length && ctx.otherVariantParts &&
          node.parts.every(function (id) { return ctx.otherVariantParts[id]; })) {
        dotClasses.push("rail__dot--other-variant");
      }
      // The grid has no node rows to wear the selection outline any more
      // (viewer_leader_line_grid), so the dot itself marks a selected node.
      if (isSelected(ctx, "node", mark.id)) dotClasses.push("rail__dot--selected");
      var dotBase = dotClasses.join(" ");
      // The dot leads for its own node AND for every edge that meets there:
      // "hovering a grid row marks that edge's bar, its dots and its leader".
      var dot = hotRegister(hot, {
        el: fade(VA.svg("circle", dotBase, {
          cx: mark.x, cy: mark.y, r: mark.branch ? M.branchDot : M.dot,
        }), "node", mark.id),
        base: dotBase, rail: hot.railOf[hotKey("node", mark.id)],
        leads: [hotKey("node", mark.id)].concat(
          (hot.edgesAtNode[mark.id] || []).map(function (edgeId) {
            return hotKey("edge", edgeId);
          })),
        hot: "rail__dot--hot", lead: "rail__dot--lead",
      });
      // The dot previews its record on hover, like every mark, and wears the
      // same one-line label (labelAt).
      labelAt(hotKey("node", mark.id), mark.x, mark.y,
        mark.branch ? M.branchDot : M.dot, recordTitle("node", mark.id));
      wire(dot, ctx, "node", mark.id, recordTitle("node", mark.id));
      hotHover(hot, dot, hotKey("node", mark.id));
      over.appendChild(dot);
      // A form modifier's squiggle, beside the face it is on: to the left of
      // the dot, the side away from the grid once the spine is mirrored right.
      if (formMarks.nodes[mark.id]) {
        var adorn = VA.glyphUse(VA.FORM_GLYPH_ID,
          mark.x - M.dot - VA.INTERFACE_GLYPH_PX / 2 - 1, mark.y,
          "rail__glyph rail__glyph--form" + (marking && !chainNodes[mark.id]
            ? " rail__glyph--off" : ""));
        adorn.appendChild(svgTitle(VA.FORM_GLYPH.label + ": " +
          formMarks.nodes[mark.id].map(function (id) {
            var e = index.edges[id];
            return e ? e.name : id;
          }).join(", ")));
        over.appendChild(fade(adorn, "node", mark.id));
      }
    });
    // The hover label's layer, last and therefore on top of every mark; in
    // the DAG's own units, so its bounds are the drawing's box at this zoom.
    var labelLayer = VA.svg("g", "rail__hoverlabels");
    over.appendChild(labelLayer);
    var k = leaderGeo.zoom || 1;
    var y0 = leaderGeo.y0 || 0;
    hot.label = { layer: labelLayer, zoom: k, bounds: {
      x1: 0, x2: width / k, y1: y0 - y0 / k, y2: y0 + (height - y0) / k,
    } };
    return svg;
  }

  // A body's name, the control that collapses or opens it: muted, the micro
  // step, its full name on hover however much of it the field shows (a
  // one-column body's field is narrow and the name runs past it).
  function bodyName(body, x, y, collapsed, ctx, text) {
    var label = VA.svg("text", "tv__bodyname", { x: x, y: y });
    label.textContent = text || body.name;
    label.appendChild(svgTitle(body.name + (collapsed ? " — click to open"
      : " — click to fold into one node")));
    label.setAttribute("data-body-toggle", body.id);
    label.setAttribute("tabindex", "0");
    label.setAttribute("role", "button");
    label.setAttribute("aria-expanded", collapsed ? "false" : "true");
    var toggle = function () { if (ctx.onToggleBody) ctx.onToggleBody(body.id); };
    label.onclick = toggle;
    label.onkeydown = function (event) {
      if (event && (event.key === "Enter" || event.key === " ")) {
        if (event.preventDefault) event.preventDefault();
        toggle();
      }
    };
    return label;
  }

  // A collapsed body (VA.collapseBodies): one wide node from the leftmost to
  // the rightmost column its block held, the edges that leave it meeting its
  // rim, and its name and joint count on it -- the count of the places it
  // meets another body.
  function collapsedPill(mark, bodiesById, ctx, marking, layout, lit) {
    var info = mark.collapsed;
    var body = bodiesById[info.body] || { id: info.body, name: info.name };
    var g = VA.svg("g", "tv__pill");
    g.setAttribute("data-collapsed-body", info.body);
    var flat = marking && !VA.bodyIsLit(layout && layout.rows, info.body, lit);
    var r = M.branchDot;
    var x1 = Math.min(mark.x, mark.x2) - r;
    var x2 = Math.max(mark.x, mark.x2) + r;
    g.appendChild(VA.svg("rect", "tv__bodyfield tv__bodyfield--t" +
      VA.bodyTint(ctx.topoProj, info.body) + " tv__pill__shape" +
      (flat ? " tv__bodyfield--flat" : ""), {
        x: x1, y: mark.y - r - 1, width: x2 - x1, height: 2 * r + 2,
        rx: r + 1, ry: r + 1,
      }));
    g.appendChild(bodyName(body, x1 + 4, mark.y + 3.5, true, ctx,
      body.name + " · " + info.joints + (info.joints === 1 ? " joint" : " joints")));
    return g;
  }

  // A native SVG tooltip: the element's own name, so hovering the graph reads
  // without the grid. `textContent` rather than a text node, because the DOM
  // shim's appendChild return value is the one place the two DOMs differ.
  // `text` cut to what `width` px holds at the micro step (about 6px a
  // character), with an ellipsis; its full text is the label's tooltip. A
  // study's title gets at least 84px, so a one-column field is not just "…".
  function fitText(text, width) {
    var room = Math.max(1, Math.floor(width / 6));
    return text.length <= room ? text : text.slice(0, Math.max(0, room - 1)) + "…";
  }

  function svgTitle(text) {
    var node = VA.svg("title");
    node.textContent = String(text);
    return node;
  }

  // A rail mark is clickable and addressable by the same (kind, id) pair its
  // grid row is. `data-id` is not decoration: it is what lets the browser tier
  // measure a mark's y against its row's y, which is the alignment claim this
  // whole page is built on and the one thing a DOM shim cannot check. A
  // leader's hit path is wired the same way but is not addressed (`bare`):
  // it is a mark OF its node, not a second node.
  //
  // `name` is the record's title, as the mark's accessible name: the native
  // <title> it used to carry was retired with the hover cards, and a
  // focusable graphic with no name is announced as nothing
  // (BRIEF_20260914_hover_card_occlusion_and_a11y). Enter and Space click it,
  // so the keyboard can freeze the Preview the way a pointer does.
  function wire(node, ctx, kind, id, name, bare) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", name || String(id));
    if (!bare) {
      node.setAttribute("data-row-kind", kind);
      node.setAttribute("data-id", id);
    }
    node.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      ctx.onSelect(kind, id);
    };
    node.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.preventDefault) event.preventDefault();
      ctx.onSelect(kind, id);
    };
    return node;
  }

  // --- the one-line hover label ------------------------------------------
  //
  // The only thing hovering a mark draws on the canvas (handoff a_preview_
  // pane_replaces_the_hover_popups_and_one_record_backs_every_mark): its
  // record's title on one line, beside the mark, never over a neighbouring
  // one. Everything else the reader wants is in the Preview, to the right of
  // the page, where it covers nothing.
  //
  // At most this many characters, with an ellipsis: the whole title is the
  // Preview's heading a hand's width away.
  VA.HOVER_LABEL_CHARS = 48;
  // The label's box in CSS pixels at the micro step: ~6px a character (the
  // same figure fitText uses), one line high, and the gap to its mark.
  VA.HOVER_LABEL_METRICS = Object.freeze({ charPx: 6, height: 12, gap: 4, pad: 2 });

  // `note` is a fact about the picture (a floored bar is not to scale) and is
  // never the part cut: the name gives up its room first.
  VA.hoverLabelText = function (text, note) {
    var t = String(text || "");
    var tail = note ? " — " + note : "";
    var room = Math.max(8, VA.HOVER_LABEL_CHARS - tail.length);
    return (t.length <= room ? t : t.slice(0, room - 1) + "…") + tail;
  };

  function boxesMeet(a, b) {
    return a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2;
  }

  // Where a label goes: the first of six places around the mark -- its left
  // (the side its rail's branches open to), its right, then the two corners
  // above and the two below -- whose box meets no other mark and stays inside
  // the drawing. Pure, in DAG units: `w`/`h` are the label's size already
  // divided by the zoom. `own` is the hovered mark's own box, which a label
  // may never cover either. Where every place is taken, the one meeting the
  // fewest marks wins, the left first: a label must still be drawn.
  VA.hoverLabelPlacement = function (anchor, w, h, obstacles, bounds, own) {
    var g = VA.HOVER_LABEL_METRICS.gap;
    var r = anchor.r || 0;
    var x = anchor.x, y = anchor.y;
    var candidates = [
      { side: "left", x1: x - r - g - w, y1: y - h / 2 },
      { side: "right", x1: x + r + g, y1: y - h / 2 },
      { side: "above-left", x1: x - w, y1: y - r - g - h },
      { side: "above-right", x1: x, y1: y - r - g - h },
      { side: "below-left", x1: x - w, y1: y + r + g },
      { side: "below-right", x1: x, y1: y + r + g },
    ];
    var best = null;
    candidates.forEach(function (c) {
      c.x2 = c.x1 + w;
      c.y2 = c.y1 + h;
      var inside = !bounds || (c.x1 >= bounds.x1 && c.x2 <= bounds.x2 &&
        c.y1 >= bounds.y1 && c.y2 <= bounds.y2);
      var hits = (own && boxesMeet(c, own)) ? 1 : 0;
      (obstacles || []).forEach(function (o) { if (o !== own && boxesMeet(c, o)) hits++; });
      c.hits = hits + (inside ? 0 : 1000);
      if (!best || c.hits < best.hits) best = c;
    });
    return best;
  };

  // --- the grid ------------------------------------------------------------
  // --- the grid ------------------------------------------------------------

  // One row per EDGE, walk order, merged into component groups
  // (viewer_leader_line_grid): the leftmost cell of a group's first row spans
  // the whole group via rowspan, so a component is said once and its
  // tolerance sub-rows read as one block. Node rows are gone — an interface
  // is its dot and (at a part boundary) its leader, both clickable.
  function grid(plan, index, chain, marking, ctx, offset, fade, hot) {
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
          marking, ctx, bandParity[planRow.id], hot), "edge", planRow.id));
      }
    });
    table.appendChild(tbody);
    // The balance sheet's bottom block (viewer_summary_balance_sheet): the
    // rolled-up numbers as rows of THIS table, under the members they are the
    // total of, in the same columns. Only where a study is actually
    // emphasized -- the whole-walk view has no chain and therefore no total,
    // and a study that refuses to sum has its refusal instead
    // (VA.renderTopoTotals's error block).
    var foot = totalsFoot(marking ? ctx.study : null);
    if (foot) table.appendChild(foot);
    box.appendChild(table);
    return box;
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
      var cell = VA.el("td", "tvcell tvcell--component tvtotal__section",
        sectionLabel);
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
    tr.appendChild(VA.el("td", "tvcell tvcell--nominal num", total.center));
    tr.appendChild(VA.el("td", "tvcell tvcell--min num", total.min));
    tr.appendChild(VA.el("td", "tvcell tvcell--max num", total.max));
    tr.appendChild(VA.el("td", "tvcell tvcell--contribution num",
      total.half + " " + total.units));
    tr.appendChild(VA.el("td", "tvcell tvcell--chips"));
    tr.appendChild(VA.el("td", "tvcell tvcell--crop"));
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
    margin.setAttribute("colspan", "3");
    margin.setAttribute("title", row.marginText);
    tr.appendChild(margin);
    tr.appendChild(VA.el("td", "tvcell tvcell--contribution num tvtotal__criterion",
      row.criterionText || ""));
    var chips = chipsCell("chips");
    if (row.scopeChip) {
      chips.wrap.appendChild(VA.chip("chip--budget", row.scopeChip, row.scopeTitle));
    }
    tr.appendChild(chips.cell);
    tr.appendChild(VA.el("td", "tvcell tvcell--crop"));
    return tr;
  }

  function noCriterionRow(verdict) {
    var tr = footRow("tvtotal--margin tvtotal--nocriterion", 1, "verdict");
    var label = VA.el("td", "tvcell tvtotal__label",
      verdict ? verdict.word : "");
    label.setAttribute("colspan", "5");
    if (verdict) label.setAttribute("title", verdict.title);
    tr.appendChild(label);
    tr.appendChild(VA.el("td", "tvcell tvcell--chips"));
    tr.appendChild(VA.el("td", "tvcell tvcell--crop"));
    return tr;
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
  // The part's name as text, or the gap wording for a clearance. Clicking it
  // selects nothing: it is a grouping, not a row. It opened the part's hover
  // card until 2026-10-30; the part's name, drawing and picture are now in
  // the Preview of any of its rows (the record's `part`), so the cell is a
  // label again and whatever the column clips is readable in full on hover.
  function componentCell(group) {
    var cell = VA.el("td", "tvcell tvcell--component", group.label);
    if (group.count > 1) cell.setAttribute("rowspan", String(group.count));
    cell.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
    };
    if (group.title || group.label) cell.setAttribute("title", group.title || group.label);
    return cell;
  }

  function edgeRow(planRow, group, first, index, chain, marking, ctx, bandParity,
                   hot) {
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

    if (first) el.appendChild(componentCell(group));

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

    // The element label, with everything the rest of the row already says
    // dropped out of it (VA.elementDisplayLabel, topology.js -- display only,
    // nothing about the edge changes): the component's own words off the
    // front, and any clause that only restates the component or the row's own
    // value. Where anything was dropped the cell carries the FULL label as its
    // hover title, so the words are one hover away and the preview pane prints
    // them in full regardless.
    //
    // The PART ROW is passed, not its id: the rule matches against what the
    // merged cell actually prints, which is the part's name now.
    // The row's words and numbers are its record's (VA.elementRecords), the
    // one copy the Preview, the DAG's label and the 3D anchor read too.
    var record = VA.elementRecords(ctx.topoProj, VA.previewRecordOptions(ctx))[
      hotKey("edge", planRow.id)] || null;
    var fullName = record ? record.title : missing(planRow.id);
    var shownName = edge && group
      ? VA.elementDisplayLabel(fullName,
          group.part ? (index.parts[group.part] || { id: group.part }) : null)
      : fullName;
    var nameCell = VA.el("td", "tvcell tvcell--name", valueOnly ? "" : shownName);
    if (!valueOnly && shownName !== fullName) nameCell.setAttribute("title", fullName);
    el.appendChild(nameCell);

    // The value cell, decomposed into three (deliverable 2): the old combined
    // "value  [min … max]" text read fine but pasted as one unsplittable cell.
    // Each number is still printed AS TRANSCRIBED (VA.fmt: no toFixed, no band
    // derived from the limits) — splitting the cell changes nothing about what
    // is printed, only how many columns it occupies.
    var values = record && record.values;
    el.appendChild(VA.el("td", "tvcell tvcell--nominal num",
      values ? VA.fmt(values.nominal) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--min num",
      values ? VA.fmt(values.min) : ""));
    el.appendChild(VA.el("td", "tvcell tvcell--max num",
      values ? VA.fmt(values.max) : ""));

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
      // What this row has to admit about itself, FIRST and loud
      // (viewer_study_verdicts_and_gaps, deliverable 2): a study-level badge
      // that cannot be traced to its rows sends the reader hunting through 43
      // of them. Everyday words — the confidence chip beside it keeps the
      // repo's own vocabulary and is the citation card's trigger; this says
      // the same thing in the words a reader brought with them. It is also
      // where the old "zero-width band" chip went: two chips on one row saying
      // one thing in two vocabularies is the redundancy, not the loudness.
      VA.edgeAttention(edge).forEach(function (flag) {
        chips.wrap.appendChild(
          VA.chip("tvflag tvflag--" + flag.key, flag.text, flag.title));
      });
      // The row's statement about its citation. It opened the citation's
      // hover card until 2026-10-30; the full reference is the Preview's now,
      // one hover away on this same row.
      var confChip = VA.chip(VA.confidenceClass(edge.confidence),
        edge.confidence === null ? "no value"
          : (VA.CONFIDENCE_LABEL[edge.confidence] || edge.confidence));
      var sourceRef = edge.dimension && edge.dimension.source_ref;
      chips.wrap.appendChild(VA.markGeneralNote(confChip, sourceRef));
      if (edge.kind === "gap") {
        chips.wrap.appendChild(VA.chip("chip--gap", "gap",
          "its two interfaces share no part — a real distance across a clearance"));
      }
      if (edge.value_source === "derived") {
        chips.wrap.appendChild(VA.chip("chip--derived", "DERIVED",
          VA.VALUE_SOURCES.derived.title));
      }
      if (edge.transform && edge.transform.kind !== "identity") {
        chips.wrap.appendChild(VA.chip("chip--transform", edge.transform.kind,
          "this edge carries a non-identity DEFAULT transform: " +
          VA.transformText(edge.transform)));
      }
    }
    el.appendChild(chips.cell);
    el.appendChild(edgeCropCell(edge, ctx));
    // The grid half of the shared hover state. Registered last, because every
    // branch above appends to `el.className` and the base this rewrites from
    // has to be the finished string. The row LEADS for its own edge and for
    // each interface the edge meets (a node has no row of its own, so its
    // hover lights the rows of the edges that meet there), and it is a member
    // of the leg its bar sits on, which is the lighter tint a reader sees on
    // the rest of the chain they are tracing.
    hotRegister(hot, {
      el: el, base: el.className,
      rail: hot.railOf[hotKey("edge", planRow.id)],
      leads: [hotKey("edge", planRow.id)].concat(
        (hot.nodesOfEdge[planRow.id] || []).map(function (nodeId) {
          return hotKey("node", nodeId);
        }), hot.studyOfEdge[planRow.id] || []),
      hot: "tvrow--hot", lead: "tvrow--lead",
    });
    hotHover(hot, el, hotKey("edge", planRow.id));
    return nameRow(el, ctx, "edge", planRow.id, fullName);
  }

  // The thumbnail cell (viewer_leader_line_grid): only where a crop index
  // actually covers this edge. An edge authored inline in the topology, or a
  // derived gap, has no crop index to check — the Preview's crop section
  // states the reason in full; a "no crop" marker here for those would read
  // as a stale index rather than what it is. When the crop is resolved AND
  // its PNG has been fetched (ctx.cropImages, topology_app.js's cache), the
  // cell shows the thumbnail — the actual crop of the tolerance annotation,
  // inline on the row; until then, or for a crop that cannot resolve, a short
  // word, never a placeholder image.
  //
  // It opened the edge's hover card on hover and click until 2026-10-30
  // (a_preview_pane_replaces_the_hover_popups_and_one_record_backs_every_mark).
  // It is part of its row now: hovering it previews the row, whose Preview
  // shows this same crop at a legible size, and clicking it keeps that Preview.
  function edgeCropCell(edge, ctx) {
    var cell = VA.el("td", "tvcell tvcell--crop");
    // The same clamp wrapper the chips cell uses, for the same reason: a real
    // <tr>'s height is a floor, not a cap, and content one pixel taller than
    // compact's 16px pitch would grow the row off its leader's seam —
    // exactly the drift the browser tier's correspondence check measures.
    var wrap = VA.el("div", "tvcell__cropwrap");
    cell.appendChild(wrap);
    if (!edge || !edge.crop_key) return cell;
    var entry = VA.cropForKey(ctx.crops, edge.crop_key);
    var resolved = entry.status === "resolved";
    var image = resolved && ctx.cropImages ? ctx.cropImages[entry.png] : null;
    var node = VA.el("span", "crop-trigger crop-trigger--" + entry.status +
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
    wrap.appendChild(node);
    return cell;
  }

  function isSelected(ctx, kind, id) {
    return !!(ctx.selection && ctx.selection.kind === kind && ctx.selection.id === id);
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
    // false, and on 35 of the 74 live nodes the same dot answered differently
    // hovered and clicked. (That is the STRING count, which is what "answered
    // differently" means; 28 is the smaller count of nodes that differ as a
    // SET. The other 7 name the same two parts in the opposite order --
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
        figure.appendChild(VA.el("div", "detail__sublabel", side.label));
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

  function renderEdgeDetail(root, record, ctx) {
    root.appendChild(paneHead(record.title, record.id));

    var source = VA.VALUE_SOURCES[record.valueSource];
    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.markGeneralNote(VA.chip(VA.confidenceClass(record.confidence),
      record.confidenceLabel), record.citation));
    chips.appendChild(VA.chip("chip--kind", record.elementKind));
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
    root.appendChild(VA.el("div", "detail__where",
      (partLabel ? "a dimension of " + partLabel : "across a clearance") +
      "  ·  " + record.from.label + " → " + record.to.label));

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

    root.appendChild(VA.el("div", "detail__transform",
      "default transform: " + VA.transformText(record.transform)));

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
    row(box, "transform", c.transform + "  ×" + VA.fmt(c.ratio));
    row(box, "weight", VA.fmt(c.weight));
    row(box, "contributes",
      VA.fmt(c.min) + " … " + VA.fmt(c.max) + " " + c.units);
    box.appendChild(VA.el("p", "muted",
      "No sign is authored anywhere: it is read off the direction the chain " +
      "crossed this edge. " + (hit.override
        ? "This study OVERRIDES the edge's default transform with `" +
          hit.override + "`."
        : "The edge's own default transform applied.")));
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
      box.appendChild(VA.el("div", "detail__crop-reason",
        record.noCropReason +
        " No crop index covers it — that is the state of the documents, not a " +
        "stale projection."));
      var ref = record.citation;
      if (ref && ref.kind === "assumed") {
        box.appendChild(VA.el("div", "detail__crop-reason",
          "Its citation is kind `assumed`: there is no document behind it to crop."));
      }
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

  // --- the leaders across the seam (leaders_follow_the_active_study_across_
  // the_seam) -----------------------------------------------------------------
  //
  // The page-level overlay's contents: one path per leader (VA.seamLeaderGeometry)
  // and a small dot where it meets the scene, in the state the selection and
  // the pointer give it (VA.seamLeaderStates). A selected leader is drawn
  // last, so it is on top of the ones it crosses. The overlay takes no
  // pointer: every gesture stays the DAG's, the grid's or the scene's.
  VA.renderSeamLeaders = function (svg, geo, states) {
    VA.clear(svg);
    var order = (geo && geo.leaders || []).slice().sort(function (a, b) {
      var sa = states[a.id] === VA.SEAM_LEADER_STATES[0] ? 1 : 0;
      var sb = states[b.id] === VA.SEAM_LEADER_STATES[0] ? 1 : 0;
      return sa - sb;
    });
    order.forEach(function (leader) {
      var state = states[leader.id];
      var suffix = state ? " seam__leader--" + state : "";
      var path = VA.svg("path", "seam__leader" + suffix, { d: leader.d });
      path.setAttribute("data-node-id", leader.id);
      svg.appendChild(path);
      var end = VA.svg("circle", "seam__end" + (state ? " seam__end--" + state : ""),
        { cx: leader.to[0], cy: leader.to[1], r: VA.SEAM_END_RADIUS });
      end.setAttribute("data-node-id", leader.id);
      svg.appendChild(end);
    });
    return svg;
  };
})(window.ViewerApp = window.ViewerApp || {});
