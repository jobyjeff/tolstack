// Boot + wiring for the ONE viewer page. Absorbed the stack viewer's own boot
// (formerly app.js, now deleted — index.html redirects here): most stacks in
// docs/tolerance_stacks/ have no topology re-expressing them (VA.looseStacks,
// topology.js), so this file has to be able to show a system EITHER way —
// rails + grid for one that has a topology, the classic elements table
// (views/stack.js, unchanged) for one that does not — not just the DAG.
//
// Same shape as the file it replaced: state at the top, one `render()`, and
// the only place views and adapters meet. Shares config.js, viewer.js, the
// storage adapters, views/dom, views/crop's vocabulary and now views/stack.js
// + views/detail.js + views/worksheet.js too — a second copy of any of their
// rendering would be a second place a rule could drift from the first.
(function (VA) {
  "use strict";

  var state = {
    connection: VA.STATE.DISCONNECTED,
    topologies: null,
    // The stacks projection (results.json) — read for the loose-stack nav and
    // for the classic stack view, never for anything the DAG renders.
    stacksResults: null,
    crops: null,

    // Which of the two ways a system is being shown. Set only by
    // selectTopology()/selectStack(); the nav tree (views/nav.js) reads it to
    // decide which row, if any, is marked current.
    mode: "topology",

    topologyId: null,
    // null = no study; the whole topology is shown with nothing highlighted.
    studyId: null,
    // "topology" (the depth-first walk of the whole graph) or "chain" (only the
    // selected study's edges, in the order the sum runs). Both layouts come out
    // of the projection; this only says which one to draw.
    layoutMode: "topology",
    // "comfortable" (26px rows) or "compact" (16px) — a display preference,
    // not a fact about a topology or a study, so selectTopology() never resets
    // it. See VA.ROW_DENSITIES (topology.js).
    rowDensity: "comfortable",
    // Experimental (default OFF, deliverable 4 of viewer_error_surface_and_
    // layout): an edge row's own label is just the concatenation of its two
    // adjacent node labels, so hiding it frees the row for values only, with
    // the description moved to hover. A display preference like rowDensity,
    // not a fact about a topology, so selectTopology() never resets it either.
    edgeValueOnly: false,
    // { kind: "node" | "edge", id } — what the preview pane is showing, in
    // topology mode.
    selection: null,

    // Stack mode's own selection — the element whose full sourcing renders in
    // the right pane (views/detail.js). Reset whenever the stack changes, same
    // reason selection is reset on selectTopology().
    selectedStackId: null,
    selectedElementId: null,
    showWorksheet: false,
    worksheetText: null,

    // Shared by both modes: the right pane's inline crop image, fetched by
    // whichever of loadTopoDetailImage/loadStackDetailImage last ran.
    detailImage: null,
    error: null,
  };

  var adapter = null;
  // Which transport `adapter` is -- "mock" | "http" | "fsa" -- for the
  // banner's own plain-words line (viewer_http_transport, deliverable 2). Not
  // read anywhere else: views must key off `adapter.capabilities()`, never
  // off which class an adapter happens to be.
  var transportKind = null;
  var nodes = {};
  var imageCache = {};      // "crops/x.png" -> {url} | null
  var openTrigger = null;   // whose popover is showing
  var openedAt = 0;         // guards the opening click from closing it again

  function boot() {
    nodes = {
      banner: document.getElementById("banner"),
      navtree: document.getElementById("navtree"),
      toolbar: document.getElementById("toolbar"),
      topojoint: document.getElementById("topojoint"),
      pane: document.getElementById("topopane"),
      stackview: document.getElementById("stackview"),
      totals: document.getElementById("totals"),
      legendToggle: document.getElementById("legend-toggle"),
      legendDialog: document.getElementById("legend-dialog"),
      legendClose: document.getElementById("legend-close"),
      worksheetDialog: document.getElementById("worksheet-dialog"),
      worksheet: document.getElementById("worksheet"),
      worksheetToggle: document.getElementById("worksheet-toggle"),
      worksheetClose: document.getElementById("worksheet-close"),
      detail: document.getElementById("detail"),
      crop: document.getElementById("croppop"),
    };
    applyDensity();

    // The legend and the worksheet are both <dialog>s now (deliverable 2):
    // neither participates in the flex column that the DAG pane lives in, so
    // opening either can never shrink it. `showModal`/`close` are the whole
    // wiring; `state.showWorksheet` still tracks open/closed for the button's
    // own label, kept in step by the dialog's native `close` event so an Esc
    // or a backdrop click (either closes a <dialog>) does not leave it stale.
    nodes.legendToggle.onclick = function () { nodes.legendDialog.showModal(); };
    nodes.legendClose.onclick = function () { nodes.legendDialog.close(); };

    nodes.worksheetToggle.textContent = "Show worksheet";
    nodes.worksheetToggle.onclick = function () {
      state.showWorksheet = true;
      nodes.worksheetDialog.showModal();
    };
    nodes.worksheetClose.onclick = function () { nodes.worksheetDialog.close(); };
    nodes.worksheetDialog.addEventListener("close", function () {
      state.showWorksheet = false;
    });

    // ?mock=1 gives a UI tour with no folder grant and no disk access at all —
    // the same escape hatch both retired pages had, now over one merged
    // fixture (mockFixture, below) so the tour demonstrates both modes.
    var mock = /[?&]mock=1\b/.test(window.location.search);

    chooseAdapter(mock).then(function (picked) {
      adapter = picked.adapter;
      transportKind = picked.kind;

      if (!adapter) {
        state.error = "This page needs either a served projection endpoint or a " +
          "File System Access-capable browser (Chrome or Edge). ?mock=1 still " +
          "runs a demo.";
        return;
      }

      // A click outside both the triggers and the popover closes it. Clicks
      // INSIDE must survive — handing you a link to the full reference is the
      // point. The 300 ms guard is what stops the very click that opened the
      // popover from closing it again: a click on a trigger can arrive with
      // target == body when the popover moved under the pointer mid-gesture.
      document.addEventListener("click", function (event) {
        if (!openTrigger || !event || !event.target) return;
        if (new Date().getTime() - openedAt < 300) return;
        var target = event.target;
        if (String(target.className || "").indexOf("crop-trigger") !== -1) return;
        if (nodes.crop.contains && nodes.crop.contains(target)) return;
        hideCrop();
      });
      document.addEventListener("keydown", function (event) {
        if (event && event.key === "Escape") hideCrop();
      });

      state.connection = picked.state;
      return picked.state === VA.STATE.READY ? load() : null;
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  // The load-time transport probe (viewer_http_transport, deliverable 2):
  // served mode is tried FIRST whenever the page is not on file:// — a served
  // origin answering either of storage/http.js's candidates needs no folder
  // grant at all, unlike FSA. FSA remains the fallback: a double-clicked
  // page, or a served page whose origin answers neither HTTP candidate
  // (nothing built yet, or a plain server with no matching mount) falls
  // straight through to it, exactly the behaviour a served page had before
  // this handoff.
  function chooseAdapter(mock) {
    if (mock) {
      var memory = new VA.MemoryAdapter(mockFixture());
      return memory.init().then(function (connState) {
        return { adapter: memory, kind: "mock", state: connState };
      });
    }
    var afterHttp;
    if (VA.HttpAdapter.isSupported()) {
      var http = new VA.HttpAdapter();
      afterHttp = http.init().then(function (connState) {
        return connState === VA.STATE.READY
          ? { adapter: http, kind: "http", state: connState } : null;
      }).catch(function () { return null; });
    } else {
      afterHttp = Promise.resolve(null);
    }
    return afterHttp.then(function (picked) {
      if (picked) return picked;
      if (!VA.FsaAdapter.isSupported()) {
        return { adapter: null, kind: null, state: null };
      }
      var fsa = new VA.FsaAdapter();
      return fsa.init().then(function (connState) {
        return { adapter: fsa, kind: "fsa", state: connState };
      });
    });
  }

  function mockFixture() {
    var t = VA.demoTopologyFixture();
    var s = VA.demoFixture();
    // `t` already re-expresses `demo_joint` (VA.demoTopologyFixture's own
    // comment: its three crop_keys address exactly that stack's entries), so
    // demo_joint is correctly COVERED — it appears nested under its topology
    // in the nav tree (VA.navTree, topology.js), not hidden and not a second
    // top-level leaf. A second copy of the same rich fixture, under an id no
    // topology's crop_key names, gives the tour (and the browser tier) a real
    // LOOSE stack too, as a top-level leaf — the shape the real repo is in
    // today: one stack a topology re-expresses, most that no topology does.
    var looseId = "demo_joint_standalone";
    var looseStack = Object.assign({}, s.results.stacks[0], { id: looseId });
    var looseCrops = (s.crops && s.crops.by_stack && s.crops.by_stack.demo_joint) || {};
    var byStack = Object.assign({}, (t.crops || {}).by_stack);
    byStack[looseId] = looseCrops;
    return {
      startState: VA.STATE.READY,
      topologies: t.topologies,
      results: Object.assign({}, s.results, { stacks: [s.results.stacks[0], looseStack] }),
      crops: {
        by_stack: byStack,
        summary: (s.crops || {}).summary,
        built_at: (s.crops || {}).built_at,
        provenance: (s.crops || {}).provenance,
      },
      images: Object.assign({}, t.images || {}, s.images || {}),
      texts: s.texts,
    };
  }

  function load() {
    imageCache = {};
    return Promise.all([
      adapter.readTopologies(), adapter.readCrops(), adapter.readResults(),
    ]).then(function (all) {
      state.topologies = all[0];
      state.crops = all[1];
      state.stacksResults = all[2];

      var stillValid = state.mode === "topology"
        ? VA.findTopology(state.topologies, state.topologyId)
        : VA.findStack(state.stacksResults, state.selectedStackId);
      if (!stillValid) {
        var topologies = (state.topologies && state.topologies.topologies) || [];
        if (topologies.length) {
          selectTopology(topologies[0].id);
        } else {
          var loose = VA.looseStacks(state.topologies, state.stacksResults);
          if (loose.length) selectStack(loose[0].id);
        }
      }
      return Promise.all([loadWorksheet(), loadDetailImage()]);
    });
  }

  // --- selection: topology mode ---------------------------------------------

  function selectTopology(topologyId) {
    state.mode = "topology";
    state.topologyId = topologyId;
    // A study id from the previous topology means nothing on this one, and a
    // selection pointing at its nodes means less than nothing — an id that
    // happens to exist in both would show the wrong element under the right
    // name.
    state.studyId = null;
    state.layoutMode = "topology";
    state.selection = null;
    state.detailImage = null;
  }

  function selectElement(kind, id) {
    state.selection = { kind: kind, id: id };
    loadDetailImage().then(render);
  }

  // --- selection: stack mode -------------------------------------------------

  function selectStack(stackId) {
    state.mode = "stack";
    state.selectedStackId = stackId;
    state.selectedElementId = null;
    state.detailImage = null;
  }

  function selectStackElement(elementId) {
    state.selectedElementId = elementId;
    loadDetailImage().then(render);
  }

  // --- the nav tree's three handlers -----------------------------------------
  //
  // views/nav.js renders one tree over both projections; these three are the
  // whole of what a click on it does. onNavStudy takes the topology id
  // alongside the study id (not just the study, the way the retired <select>
  // could get away with) because the nav can jump to a study belonging to a
  // DIFFERENT topology than the one currently open in one click, which two
  // separate selects never had to handle — they only ever offered studies of
  // the topology already picked.

  function onNavTopology(topologyId) {
    selectTopology(topologyId);
    loadWorksheet().then(rewind);
  }

  function onNavStudy(topologyId, studyId) {
    if (state.topologyId !== topologyId) selectTopology(topologyId);
    state.studyId = studyId || null;
    state.layoutMode = "topology";
    state.selection = null;
    state.detailImage = null;
    loadWorksheet().then(rewind);
  }

  function onNavStack(stackId) {
    selectStack(stackId);
    hideCrop();
    loadWorksheet().then(render);
  }

  // The one DOM write row density needs: VA.applyRowDensity (topology.js,
  // pure) owns VA.RAIL_METRICS.rowHeight, which the inline row heights and
  // the SVG geometry already read live; this is the other of the "three
  // places" — the CSS variable the grid's paint (padding, borders) reads.
  function applyDensity() {
    var preset = VA.applyRowDensity(state.rowDensity);
    document.documentElement.style.setProperty("--tv-row", preset.rowHeight + "px");
  }

  function currentTopology() {
    return VA.findTopology(state.topologies, state.topologyId);
  }

  function currentStudy() {
    return state.studyId ? VA.findStudy(currentTopology(), state.studyId) : null;
  }

  function currentStack() {
    return VA.findStack(state.stacksResults, state.selectedStackId);
  }

  // A worksheet's own field shape (`worksheet_file`, `worksheet_source`) is
  // identical on a stack projection and a topology projection (each builder's
  // own `worksheet_for`, the same two-rule convention) -- so which projection
  // to read it off is the only thing that depends on mode (deliverable 4,
  // viewer_v2_single_nav).
  function loadWorksheet() {
    var subject = state.mode === "topology" ? currentTopology() : currentStack();
    var segments = VA.worksheetSegments(subject);
    if (!segments) {
      state.worksheetText = null;
      return Promise.resolve();
    }
    return adapter.readText(segments).then(function (text) {
      state.worksheetText = text;
    });
  }

  // The preview pane renders the crop INLINE, so the image is fetched as soon
  // as a selection changes — in whichever of the two modes is active. Only an
  // edge/element that resolves through `crop_key` (or, in stack mode, an
  // element id directly) has one.
  function loadDetailImage() {
    state.detailImage = null;
    var entry;
    if (state.mode === "topology") {
      var selection = state.selection;
      if (!selection || selection.kind !== "edge") return Promise.resolve();
      var edge = VA.topologyIndex(currentTopology()).edges[selection.id];
      if (!edge || !edge.crop_key) return Promise.resolve();
      entry = VA.cropFor(state.crops, edge.crop_key.stack, edge.crop_key.element);
    } else {
      var stackProj = currentStack();
      if (!stackProj || !state.selectedElementId) return Promise.resolve();
      entry = VA.cropFor(state.crops, stackProj.id, state.selectedElementId);
    }
    if (entry.status !== "resolved" || !entry.png) return Promise.resolve();
    if (Object.prototype.hasOwnProperty.call(imageCache, entry.png)) {
      state.detailImage = imageCache[entry.png];
      return Promise.resolve();
    }
    return adapter.readCropImage(entry.png).then(function (image) {
      imageCache[entry.png] = image;
      state.detailImage = image;
    }).catch(function () {
      imageCache[entry.png] = null;
    });
  }

  // --- crops: the hover/click popover, shared by both modes' triggers -------
  //
  // Ported verbatim from the retired stack viewer's app.js: every crop-trigger
  // button in this app now — the topology grid's thumbnail (views/topology.js)
  // and the stack view's row trigger (views/stack.js) alike — calls
  // `ctx.onCropShow` / `handlers.onCropShow`, which is this function either way.

  function showCrop(entry, trigger) {
    openTrigger = trigger;
    openedAt = new Date().getTime();
    var paint = function (image) {
      if (openTrigger !== trigger) return;   // a later hover won the race
      VA.renderCrop(nodes.crop, entry, image, VA.CONFIG, hideCrop);
      // display first, then measure: offsetHeight is 0 while display is none.
      nodes.crop.style.display = "block";
      position(nodes.crop, trigger);
      // aspect-ratio already reserved the height, but re-place once the PNG has
      // settled either way — a broken image also changes the box.
      var img = nodes.crop.querySelector ? nodes.crop.querySelector("img") : null;
      if (img) {
        img.onload = function () { position(nodes.crop, trigger); };
        img.onerror = img.onload;
      }
    };
    if (entry.status !== "resolved" || !entry.png) { paint(null); return; }
    if (Object.prototype.hasOwnProperty.call(imageCache, entry.png)) {
      paint(imageCache[entry.png]);
      return;
    }
    // Paint the frame immediately so the popover never feels laggy, then swap
    // the image in when the blob resolves.
    paint(null);
    adapter.readCropImage(entry.png).then(function (image) {
      imageCache[entry.png] = image;
      paint(image);
    }).catch(function () {
      imageCache[entry.png] = null;
      paint(null);
    });
  }

  function hideCrop() {
    openTrigger = null;
    nodes.crop.style.display = "none";
  }

  // Place the popover below the trigger, or above it when there isn't room —
  // a crop of a whole drawing sheet is tall, and one that renders off the bottom
  // of the window is a hover that shows nothing.
  function position(pop, trigger) {
    if (!trigger.getBoundingClientRect) return;
    var box = trigger.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(
      window.scrollX + box.left,
      window.scrollX + window.innerWidth - pop.offsetWidth - 16)) + "px";
    var height = pop.offsetHeight || 400;
    var roomBelow = window.innerHeight - box.bottom;
    // Above only when it genuinely fits above: a popover nudged back down to
    // stay on screen would land ON the trigger, and the resulting mouseleave
    // would close it the instant it opened.
    var goAbove = roomBelow < height + 16 && box.top >= height + 16;
    pop.style.top = (goAbove
      ? window.scrollY + box.top - height - 8
      : window.scrollY + box.bottom + 8) + "px";
  }

  // --- render ----------------------------------------------------------------

  // The one error seam (deliverable 1, viewer_error_surface_and_layout): every
  // path that reaches `render` -- the boot chain, a reload, a gesture, a click
  // -- now goes through this wrapper instead of the real paint() directly, so
  // a throw from ANYWHERE inside a render (not just a rejected promise before
  // it) is caught in exactly one place rather than needing a try/catch in
  // every view. This is what the 2026-09-09 incident's silently-empty DAG
  // pane was missing: `onReload`'s `.then(render)` had nothing after it, so a
  // throw from inside render() itself became an unhandled rejection and the
  // page just sat there looking unchanged.
  function render() {
    try {
      paint();
    } catch (err) {
      renderCrash(err);
    }
  }

  function renderCrash(err) {
    VA.renderCrashBanner(nodes.banner, err);
  }

  function paint() {
    VA.renderBanner(nodes.banner, bannerState(), {
      onConnect: function () { gesture(adapter.connect()); },
      onReconnect: function () { gesture(adapter.reconnect()); },
      // `.catch` before `.then(render)`, the same shape gesture() already has
      // below: a rejected load() (the adapter losing the folder mid-session,
      // say) used to be an unhandled rejection with a no-op Reload button --
      // now it lands in state.error and the banner says so.
      onReload: function () {
        load().catch(function (err) {
          state.error = String(err && err.message || err);
        }).then(render);
      },
    });

    renderNav();

    var topoProj = currentTopology();
    var study = currentStudy();
    var stackProj = currentStack();
    var showTopology = state.mode === "topology";

    nodes.toolbar.style.display = showTopology ? "" : "none";
    nodes.topojoint.style.display = showTopology ? "" : "none";
    nodes.pane.style.display = showTopology ? "" : "none";
    nodes.totals.style.display = showTopology ? "" : "none";
    nodes.stackview.style.display = showTopology ? "none" : "";
    // The legend ("how to read the rails") is a topology-mode concept, always
    // offered there. The worksheet is offered wherever the SELECTED node
    // carries one -- a topology's own `worksheet_file` (deliverable 4) reads
    // through the identical field a stack's does, so the same toggle serves
    // both; a topology with none (most studies' own stacks have one instead)
    // hides it exactly as a worksheet-less stack always did. Close whichever
    // dialog no longer has anything to show: switching modes or nodes with one
    // open is a real path (click a nav row while reading either) and a stale
    // dialog sitting open would be confusing about which page it is even
    // talking about.
    // Neither mode offers a control it cannot service (viewer_http_transport,
    // the same "capabilities(), never the adapter's type" rule forge's own
    // two-transport apps use): the sibling-data-mount served candidate cannot
    // reach docs/ at all, so a worksheet is unreachable no matter what
    // worksheet_file says. An adapter with no capabilities() method (FSA,
    // memory, node-fs) is read as fully capable.
    var canReadWorksheets = !adapter || typeof adapter.capabilities !== "function" ||
      adapter.capabilities().worksheets !== false;
    var hasWorksheet = canReadWorksheets && (showTopology
      ? !!(topoProj && topoProj.worksheet_file)
      : !!(stackProj && stackProj.worksheet_file));
    nodes.legendToggle.style.display = showTopology ? "" : "none";
    nodes.worksheetToggle.style.display = hasWorksheet ? "" : "none";
    if (!showTopology && nodes.legendDialog.open) nodes.legendDialog.close();
    if (!hasWorksheet && nodes.worksheetDialog.open) nodes.worksheetDialog.close();

    if (showTopology) {
      var ctx = {
        topoProj: topoProj, study: study, crops: state.crops,
        layoutMode: state.layoutMode, selection: state.selection,
        detailImage: state.detailImage, edgeValueOnly: state.edgeValueOnly,
        onSelect: selectElement, onCropShow: showCrop,
      };
      VA.renderTopoToolbar(nodes.toolbar, state, topoProj, {
        onLayoutMode: function () {
          state.layoutMode = state.layoutMode === "chain" ? "topology" : "chain";
          rewind();
        },
        // Density changes how tall the rows already on screen are, not WHICH
        // rows are on screen — so a plain render(), not rewind(): see
        // rewind's own comment for why that distinction matters.
        onDensity: function () {
          state.rowDensity = state.rowDensity === "compact" ? "comfortable" : "compact";
          applyDensity();
          render();
        },
        // Same reasoning as density: which rows are on screen is unchanged,
        // only how an edge row prints itself.
        onEdgeValueOnly: function () {
          state.edgeValueOnly = !state.edgeValueOnly;
          render();
        },
      });
      VA.renderTopoJoint(nodes.topojoint, topoProj);
      VA.renderTopoPane(nodes.pane, ctx);
      VA.renderTopoTotals(nodes.totals, topoProj, study, VA.topologyIndex(topoProj));
      VA.renderTopoDetail(nodes.detail, ctx);
    } else {
      VA.renderStack(nodes.stackview, stackProj, state.crops, {
        onCropShow: showCrop,
        onElementSelect: selectStackElement,
        selectedElementId: state.selectedElementId,
      });
      VA.renderDetail(nodes.detail, stackProj, state.selectedElementId,
        state.crops, state.detailImage, VA.CONFIG);
    }

    VA.renderWorksheet(nodes.worksheet, showTopology ? topoProj : stackProj,
      state.worksheetText);
  }

  // The one nav (deliverable 1, viewer_v2_single_nav): every topology with its
  // studies as children (and, nested under it, any stack it also covers —
  // VA.navTree, topology.js), and every classic-only stack as a leaf of the
  // same tree. Replaces both the TOPOLOGY/STUDY <select> pickers and the flat
  // stack rail (the retired views/list.js) at once; views/nav.js does the
  // rendering, this is only the three clicks it can make.
  function renderNav() {
    if (state.connection !== VA.STATE.READY) {
      VA.clear(nodes.navtree);
      nodes.navtree.style.display = "none";
      return;
    }
    nodes.navtree.style.display = "";
    var tree = VA.navTree(state.topologies, state.stacksResults);
    VA.renderNavTree(nodes.navtree, tree, state, {
      onTopology: onNavTopology,
      onStudy: onNavStudy,
      onStack: onNavStack,
    });
  }

  // Re-render with the rows/rows-equivalent scrolled back to the top. Only the
  // controls that change WHICH rows or WHICH stack are on screen do this;
  // clicking a row also re-renders, and yanking the reader back to the top for
  // that would be its own bug (rewind's original comment, topology.js).
  function rewind() {
    render();
    if (nodes.pane) nodes.pane.scrollTop = 0;
    if (nodes.stackview) nodes.stackview.scrollTop = 0;
  }

  function gesture(promise) {
    promise.then(function (connection) {
      state.connection = connection;
      state.error = null;
      return load();
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  // The banner is views/banner.js's, unchanged, and it reads `results`. This
  // page's PRIMARY projection is topologies.json (the rails, every study chain
  // and every total come out of it) — a missing stacks projection instead
  // shows up as an empty nav tree (VA.navTree tolerates a null `results`)
  // rather than a second banner branch, because "which tree built what" only
  // ever needs answering for the one projection every page load actually
  // needs.
  function bannerState() {
    return {
      connection: state.connection,
      projection: "topologies",
      results: state.topologies,
      crops: state.crops,
      error: state.error,
      extraAlarms: VA.orphanStudyAlarms(state.topologies),
      // Which transport is live (viewer_http_transport, deliverable 2): the
      // connect-folder banner already disappears on its own once state is
      // READY, so this is only the one line served mode adds — FSA mode gets
      // no new line at all, unchanged from before this handoff.
      transport: transportKind,
    };
  }

  VA.bootTopology = boot;
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", boot);
  }
})(window.ViewerApp = window.ViewerApp || {});
