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
    // selectTopology()/selectStack(); nothing else flips it, so the picker
    // (views/topology.js's renderTopoPicker) can render an honest "you are
    // looking at a stack" placeholder rather than a real topology id it isn't.
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
  var nodes = {};
  var imageCache = {};      // "crops/x.png" -> {url} | null
  var openTrigger = null;   // whose popover is showing
  var openedAt = 0;         // guards the opening click from closing it again

  function boot() {
    nodes = {
      banner: document.getElementById("banner"),
      picker: document.getElementById("picker"),
      stacklist: document.getElementById("stacklist"),
      pane: document.getElementById("topopane"),
      stackview: document.getElementById("stackview"),
      totals: document.getElementById("totals"),
      worksheetWrap: document.getElementById("worksheet-wrap"),
      worksheet: document.getElementById("worksheet"),
      worksheetToggle: document.getElementById("worksheet-toggle"),
      detail: document.getElementById("detail"),
      crop: document.getElementById("croppop"),
    };
    applyDensity();

    // The worksheet lives in a native <details>, collapsed by default, exactly
    // as it did in the retired stack viewer — clicking the <summary> itself
    // must keep working, so its open state is set directly on the DOM node
    // rather than round-tripping through render() every time.
    nodes.worksheetWrap.open = state.showWorksheet;
    nodes.worksheetToggle.textContent =
      (state.showWorksheet ? "Hide" : "Show") + " worksheet";
    nodes.worksheetWrap.addEventListener("toggle", function () {
      state.showWorksheet = nodes.worksheetWrap.open;
      nodes.worksheetToggle.textContent =
        (state.showWorksheet ? "Hide" : "Show") + " worksheet";
    });
    nodes.worksheetToggle.onclick = function () {
      nodes.worksheetWrap.open = !nodes.worksheetWrap.open;
    };

    // ?mock=1 gives a UI tour with no folder grant and no disk access at all —
    // the same escape hatch both retired pages had, now over one merged
    // fixture (mockFixture, below) so the tour demonstrates both modes.
    var mock = /[?&]mock=1\b/.test(window.location.search);
    adapter = mock ? new VA.MemoryAdapter(mockFixture())
      : VA.FsaAdapter.isSupported() ? new VA.FsaAdapter() : null;

    if (!adapter) {
      state.error = "This browser has no File System Access API. Chrome or Edge " +
        "is required; ?mock=1 still runs a demo.";
      render();
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

    adapter.init().then(function (connection) {
      state.connection = connection;
      return connection === VA.STATE.READY ? load() : null;
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  function mockFixture() {
    var t = VA.demoTopologyFixture();
    var s = VA.demoFixture();
    // `t` already re-expresses `demo_joint` (VA.demoTopologyFixture's own
    // comment: its three crop_keys address exactly that stack's entries), so
    // demo_joint is correctly COVERED and would not appear in the loose-stack
    // nav — which leaves nothing there to demonstrate the mode this mock exists
    // to demo. A second copy of the same rich fixture, under an id no
    // topology's crop_key names, gives the tour (and the browser tier) a real
    // loose stack to click into — the shape the real repo is in today: one
    // stack a topology re-expresses, most that no topology does.
    var looseId = "demo_joint_standalone";
    var looseStack = Object.assign({}, s.results.stacks[0], { id: looseId });
    var looseCrops = (s.crops && s.crops.by_stack && s.crops.by_stack.demo_joint) || {};
    var byStack = Object.assign({}, (t.crops || {}).by_stack);
    byStack[looseId] = looseCrops;
    return {
      startState: VA.STATE.READY,
      topologies: t.topologies,
      results: Object.assign({}, s.results, { stacks: [looseStack] }),
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

  function loadWorksheet() {
    var segments = VA.worksheetSegments(currentStack());
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

  function render() {
    VA.renderBanner(nodes.banner, bannerState(), {
      onConnect: function () { gesture(adapter.connect()); },
      onReconnect: function () { gesture(adapter.reconnect()); },
      onReload: function () { load().then(render); },
    });

    VA.renderTopoPicker(nodes.picker, state.topologies, state, {
      onTopology: function (id) {
        // The picker's own placeholder ("viewing a stack; pick one to
        // return") carries value "" and must not itself select anything.
        if (!id) return;
        selectTopology(id);
        rewind();
      },
      onStudy: function (id) {
        state.studyId = id || null;
        if (!state.studyId) state.layoutMode = "topology";
        rewind();
      },
      onLayoutMode: function () {
        state.layoutMode = state.layoutMode === "chain" ? "topology" : "chain";
        rewind();
      },
      // Density changes how tall the rows already on screen are, not WHICH
      // rows are on screen — so a plain render(), not rewind(): see rewind's
      // own comment for why that distinction matters.
      onDensity: function () {
        state.rowDensity = state.rowDensity === "compact" ? "comfortable" : "compact";
        applyDensity();
        render();
      },
    });

    renderStackNav();

    var topoProj = currentTopology();
    var study = currentStudy();
    var stackProj = currentStack();
    var showTopology = state.mode === "topology";

    nodes.pane.style.display = showTopology ? "" : "none";
    nodes.totals.style.display = showTopology ? "" : "none";
    nodes.stackview.style.display = showTopology ? "none" : "";
    // The worksheet is a stack-mode concept only — a topology has no worksheet
    // of its own to show, so the whole block is out of the way rather than
    // sitting open and empty while a DAG is on screen.
    nodes.worksheetWrap.style.display = showTopology ? "none" : "";

    if (showTopology) {
      var ctx = {
        topoProj: topoProj, study: study, crops: state.crops,
        layoutMode: state.layoutMode, selection: state.selection,
        detailImage: state.detailImage,
        onSelect: selectElement, onCropShow: showCrop,
      };
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

    VA.renderWorksheet(nodes.worksheet, stackProj, state.worksheetText);
  }

  // The nav of stacks NO topology re-expresses (VA.looseStacks) — most of
  // them. Reuses views/list.js's renderList (the retired stack viewer's own
  // left rail) completely unchanged: a stack row's confidence chips are the
  // same "at a glance" scoreboard here as they always were.
  function renderStackNav() {
    if (state.connection !== VA.STATE.READY) {
      VA.clear(nodes.stacklist);
      nodes.stacklist.style.display = "none";
      return;
    }
    if (!state.stacksResults) {
      VA.clear(nodes.stacklist);
      nodes.stacklist.className = "stacklist";
      nodes.stacklist.appendChild(VA.el("p", "muted",
        "No results projection — stacks with no topology have nowhere to show " +
        "here. Build it: " + VA.CONFIG.rebuild.results));
      nodes.stacklist.style.display = "";
      return;
    }
    var loose = VA.looseStacks(state.topologies, state.stacksResults);
    if (!loose.length) {
      VA.clear(nodes.stacklist);
      nodes.stacklist.style.display = "none";
      return;
    }
    nodes.stacklist.style.display = "";
    VA.renderList(nodes.stacklist, { stacks: loose }, state.selectedStackId,
      function (id) {
        selectStack(id);
        hideCrop();
        loadWorksheet().then(render);
      });
    nodes.stacklist.insertBefore(
      VA.el("div", "muted", "Stacks with no topology:"), nodes.stacklist.firstChild);
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
  // and every total come out of it) — the stacks projection gets its own,
  // narrower missing-projection note beside the stack nav (renderStackNav)
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
    };
  }

  VA.bootTopology = boot;
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", boot);
  }
})(window.ViewerApp = window.ViewerApp || {});
