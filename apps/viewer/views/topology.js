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
  // should still be visible." The DAG is now always the whole walk and a
  // study selection only changes what is EMPHASIZED on it, so there is one
  // behaviour and nothing left for a control to pick between.
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
    // The reader's own sideways scroll, read BEFORE the pane it lives on is
    // destroyed (ISSUE_20260915_every_topology_pane_render_throws_away_the_
    // readers_sideways_scroll). See carriedScroll for why this is the first
    // line of the function and not a detail of the append below.
    var carried = carriedScroll(root, ctx.topoProj, ctx.tween);
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
    //
    // ALWAYS the topology's own walk (viewer_respine_whole_walk, 2026-09-15).
    // Selecting a study used to swap this for `study.layout` — a second
    // serialisation of the same document, one rail, non-members gone — and
    // Jeff read the result as a defect: "When you click a study/stack, the
    // entire dag/model should still be visible." So the rails never change
    // shape; what a study selection changes is emphasis, leaders and the
    // table beside them.
    var layout = VA.spineRight(topoProj.layout);
    var chain = VA.chainIndex(study);
    var chainNodes = VA.chainNodes(study);
    // Whether a study is EMPHASIZED here: a study that refused to sum has no
    // chain to emphasize (the error is the result), so it leaves the walk at
    // full emphasis exactly as no selection does.
    var marking = !!(study && study.status === "ok");
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
    var plan = VA.gridPlan(layout, topoProj,
      marking ? { edges: chain, nodes: chainNodes } : null);
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
    var geometry = VA.railGeometry(layout, M, positions, { x: xTween });
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
                          width: leaderGeo.width, tweening: !!tween };
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
    // pane, the same box and the same moment `paneBudget` above reads for the
    // vertical axis; 0 in the DOM shim, which reports no widths and needs no
    // clamp.
    var paneWidth = (root && typeof root.clientWidth === "number")
      ? root.clientWidth : 0;
    var head = header(leaderGeo, ctx, paneWidth);
    hscroll.appendChild(head);
    var body = VA.el("div", "tv__body");
    body.appendChild(railsSvg(geometry, leaderGeo, index, chain, chainNodes,
      marking, ctx, fade, fadeLink));
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
    // ...and the reader's sideways scroll back onto the pane that replaced the
    // one they scrolled. Written after the append, so the browser has a laid-
    // out content width to CLAMP it against -- which is the whole behaviour a
    // reader parked at the right-hand end of a grid that just got narrower
    // wants, and the reason this is a restore rather than a stored preference.
    if (carried) hscroll.scrollLeft = carried;
    // The one grip whose boundary scrolls, kept over that boundary as the
    // reader scrolls (VA.columnGripLeft). The listener is on the node this
    // render just built, so the next render drops it with the node -- there is
    // nothing to unwire and nothing to leak.
    if (head.placeColumnGrips) {
      var place = function () {
        head.placeColumnGrips(hscroll.scrollLeft, hscroll.clientWidth);
      };
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

  VA.readStoredPaneWidth = function (store) {
    try {
      var raw = store && store.getItem(VA.PANE_WIDTH_KEY);
      if (raw === null || raw === undefined || raw === "") return null;
      var n = Number(raw);
      return isFinite(n) ? VA.clampPaneWidth(n) : null;
    } catch (err) {
      return null;
    }
  };

  VA.writeStoredPaneWidth = function (store, px) {
    try {
      if (store) store.setItem(VA.PANE_WIDTH_KEY, String(VA.clampPaneWidth(px)));
    } catch (err) {
      // A browser that refuses to store it still resizes for this session.
    }
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

  // --- the SVG -------------------------------------------------------------

  function railsSvg(geometry, leaderGeo, index, chain, chainNodes, marking, ctx,
                    fade, fadeLink) {
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
    //    Mid-respine a rail needs no fade of its own, and this is the whole
    //    reason why: a column the transition is adding is drawn collapsed
    //    onto the OUTGOING FRAME'S LEFTMOST RAIL at e = 0 and unfolds out of
    //    it (VA.respineX, whose `floor` is that rail), so there is nothing to
    //    appear from nowhere -- from a settled outgoing frame or from a
    //    transition frame alike. Every column both serialisations have has a
    //    rail on both sides, so those are the only rails a respine can add.
    //    The marks on a rail are keyed and the store fades those.
    geometry.rails.forEach(function (rail) {
      svg.appendChild(VA.svg("line",
        "rail rail--" + (rail.column % 2 ? "odd" : "even"),
        { x1: rail.x, y1: rail.y1, x2: rail.x, y2: rail.y2 }));
    });

    // 2. the fan-outs and the loop closures. A link is the one drawn thing the
    //    unfold above does NOT cover: it belongs to a pair of columns, and a
    //    link a respine adds between two columns BOTH serialisations have
    //    arrives on rails that never move. So it carries an opacity of its
    //    own, keyed on its two ends' elements (VA.linkOpacity).
    geometry.links.forEach(function (link) {
      svg.appendChild(fadeLink(VA.svg("path",
        "rail__link rail__link--" + link.kind, { d: link.d }), link.key));
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
    leaderGeo.leaders.forEach(function (leader) {
      var node = index.nodes[leader.id];
      var classes = ["rail__leader"];
      if (marking) classes.push("rail__leader--on");
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
    // No on/off marking on a grid row any more (viewer_respine_whole_walk):
    // with a study selected the table IS the chain, so every row in it is a
    // member and a faded non-member row is not a thing this grid can hold.
    // The dimming moved to where the non-members still are — the rails.
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
    var fullName = edge ? edge.name : missing(planRow.id);
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
  // A study's own authored `checks` — the verdict, and by how much — ARE here
  // since viewer_study_verdicts_and_gaps (2026-09-15). They reach the page the
  // same way `topoProj.joint` and `topoProj.worksheet_file` do: as a projection
  // field. `project_study()` gained its `checks` key on 2026-09-09
  // (topology_projection_emits_study_checks, closing
  // `ISSUE_20260908_topology_projection_never_emits_a_studys_checks.md`), and
  // for six days after that the field existed and nothing read it — the comment
  // that used to sit here said the opposite, which is how a stale comment costs
  // more than no comment. The margin beside the verdict is CheckResult.margin,
  // computed in Python against the check's own criterion; this strip still adds
  // nothing up.
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

    var verdict = VA.studyVerdict(study);
    var strip = VA.el("div", "tvtotals__strip");
    // The verdict leads — ahead of the title, because it is the one thing a
    // reader came for and the one thing this page never said. It is the ONLY
    // thing this handoff put in the strip: the strip does not wrap, it scrolls
    // sideways (`.tvtotals__strip`, topology.css), and a long `from → to` span
    // already pushes the folded totals past its right edge on a 870px pane.
    // Three more chips in here would have pushed them further for a reader who
    // has to drag to reach them — so the flags get their own line below,
    // where they can wrap.
    strip.appendChild(verdictChip(verdict));
    strip.appendChild(VA.el("span", "tvtotals__title", study.title));
    strip.appendChild(VA.el("code", "muted", study.id));
    strip.appendChild(VA.el("span", "muted tvtotals__span",
      study.from + " → " + study.to +
      (study.closes ? "  ·  closes `" + study.closes + "`" : "")));

    if (study.status !== "ok") {
      root.appendChild(strip);
      root.appendChild(errorBlock(study));
      root.appendChild(gapsPanel(topoProj));
      return root;
    }

    var attention = VA.studyAttention(study, index);
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

    // The study-level flags, on their own wrapping line (deliverable 2): loud,
    // never clipped, and directly above the block that explains each of them.
    if (attention.badges.length) {
      var flags = VA.el("div", "tvtotals__flags");
      attention.badges.forEach(function (flag) {
        flags.appendChild(
          VA.chip("tvflag tvflag--" + flag.key, flag.text, flag.title));
      });
      root.appendChild(flags);
    }

    root.appendChild(verdictBlock(verdict, attention));

    var warning = VA.zeroWidthWarning(attention);
    if (warning) {
      root.appendChild(VA.el("p", "tvwarn tvwarn--lower-bound", warning));
    }

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

  // Under the strip: what the verdict means, by how much, and — where the chain
  // is knowingly short a term — what is missing, in words, ABOVE the number. An
  // unqualified verdict on an incomplete chain is the exact lie this repo
  // exists to avoid, so the qualification is not a footnote and not a hover.
  function verdictBlock(verdict, attention) {
    var box = VA.el("div", "tvverdicts");
    if (!verdict) return box;
    if (verdict.state === "none") {
      box.appendChild(VA.el("p", "tvverdicts__none",
        "No pass/fail criterion has been recorded for this study yet — the " +
        "totals above are its answer, and whether that answer is good enough " +
        "is not written down anywhere this page can read."));
      return box;
    }
    verdict.checks.forEach(function (row) {
      var card = VA.el("div", "tvverdict-card" +
        (row.incomplete ? " tvverdict-card--qualified" : ""));
      var head = VA.el("div", "tvverdict-card__head");
      head.appendChild(VA.chip("tvverdict tvverdict--" + row.verdict,
        row.verdict, row.title));
      head.appendChild(VA.el("span", "tvverdict-card__says", row.says));
      head.appendChild(VA.el("span", "tvverdict-card__margin", row.marginText));
      card.appendChild(head);
      card.appendChild(VA.el("div", "tvverdict-card__label", row.label));
      if (row.incomplete) {
        var missingBox = VA.el("div", "tvverdict-card__missing");
        missingBox.appendChild(VA.el("p", "tvverdict-card__missinghead",
          "This answer does not include everything the joint needs, so it is a " +
          "budget for what is missing rather than a verdict on the hardware. " +
          "Missing:"));
        var list = VA.el("ul", "tvverdict-card__missinglist");
        row.excludedTerms.forEach(function (term) {
          list.appendChild(VA.el("li", null, term));
        });
        missingBox.appendChild(list);
        card.appendChild(missingBox);
      }
      if (row.guidance) {
        var more = VA.el("details", "tvverdict-card__more");
        more.appendChild(VA.el("summary", null, "Why"));
        more.appendChild(VA.el("p", null, row.guidance));
        card.appendChild(more);
      }
      box.appendChild(card);
    });
    if (attention && attention.unverified.length) {
      box.appendChild(VA.el("p", "tvwarn tvwarn--unverified",
        attention.unverified.length +
        (attention.unverified.length === 1 ? " dimension" : " dimensions") +
        " in this chain " +
        (attention.unverified.length === 1 ? "is" : "are") +
        " unverified — nothing readable stands behind " +
        (attention.unverified.length === 1 ? "it" : "them") + ": " +
        attention.unverified.join("; ") + "."));
    }
    return box;
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
    root.appendChild(paneHead(node.name, node.id));

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
    // (VA.nodeSideLabels -> VA.nodeAdjacentParts) -- the same adjacency the
    // dot's hover card prints and the leader rule reads, NOT the document's
    // own `parts` list. In the parts' own NAMES since 2026-09-15; it printed
    // their ids until then, which is the one thing this pane said that a
    // reader had no way to read.
    //
    // It printed `node.parts` until handoff surfaces_that_state_something_
    // false, and on 17 of the 48 live nodes the same dot answered differently
    // hovered and clicked. (17 is the STRING count, which is what "answered
    // differently" means; 10 is the smaller count of nodes that differ as a
    // SET. The other 7 name the same two parts in the opposite order --
    // authoring order against first-seen-edge order -- and a reader looking at
    // two orders of two names is still reading two different answers. Every
    // digit in this paragraph, and the README's copy of the first sentence,
    // is re-derived from the live projection by apps/viewer/tests.js's
    // "[real] every live dot answers the SAME on hover and on click" -- the
    // noun included, because 10 shipped under 17's wording for a day and a
    // pairing that only checked "some number" would have passed it.)
    // Neither list was wrong: a node against a `gap` edge
    // has a clearance for a side, and a clearance is not a part, so an
    // authored parts list cannot name one. The lists answer different
    // questions -- and the question a reader clicking a dot in the DAG is
    // asking ("what meets HERE, in the picture I am looking at") is the
    // derived one, which is why the card already chose it.
    var sides = VA.nodeSideLabels(ctx.topoProj, id);
    root.appendChild(VA.el("div", "detail__where", "on " + sides.join(" ⇔ ")));

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
    root.appendChild(paneHead(edge.name, edge.id));

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

    // The part and the two interfaces, in their own names -- all three were
    // printed as ids here until 2026-09-15.
    var partLabel = edge.part
      ? VA.componentLabel(VA.topologyIndex(ctx.topoProj).parts[edge.part] ||
          { id: edge.part })
      : null;
    root.appendChild(VA.el("div", "detail__where",
      (partLabel ? "a dimension of " + partLabel : "across a clearance") +
      "  ·  " + VA.nodeLabel(ctx.topoProj, edge.from) +
      " → " + VA.nodeLabel(ctx.topoProj, edge.to)));

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
    if (hit) root.appendChild(contributionBlock(hit, ctx.study, ctx.topoProj));

    if (edge.note) root.appendChild(VA.el("div", "detail__note", edge.note));

    var dimension = edge.dimension;
    if (dimension && dimension.source_ref) {
      root.appendChild(citation(dimension.source_ref, edge.confidence));
      var provenance = VA.exportProvenance(dimension.source_ref, null);
      if (provenance) root.appendChild(exportBlock(provenance));
    } else if (dimension) {
      root.appendChild(VA.el("div", "el-export el-export--none el-export--loud",
        "This dimension cites nothing at all — nothing on record says where " +
        "the number came from."));
    }

    root.appendChild(cropSection(edge, ctx));
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

  function contributionBlock(hit, study, topoProj) {
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
    box.appendChild(VA.cropFigure(entry, ctx.detailImage, "detail__crop-img"));
    var companion = VA.companionFigure(entry, ctx.cropImages);
    if (companion) box.appendChild(companion);
    // The reference, its links and the folded matching provenance, from the
    // ONE builder every crop surface shares (VA.cropReference, views/crop.js).
    // This pane used to print the reference, then the provenance line in the
    // open, then the absolute path -- three lines where a reader wanted one,
    // and no way to reach the document at all.
    VA.cropReference(box, entry, ctx.config, "detail__crop-");
    return box;
  }
})(window.ViewerApp = window.ViewerApp || {});
