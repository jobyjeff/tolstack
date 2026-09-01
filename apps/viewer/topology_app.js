// Boot + wiring for the topology page. The sibling of app.js and deliberately
// the same shape: state at the top, one `render()`, and the only place views and
// adapters meet. It shares config.js, viewer.js, the storage adapters, views/dom
// and views/crop's vocabulary with the stack viewer — a second copy of the
// crop-status table would be a second place a rule can be wrong.
(function (VA) {
  "use strict";

  var state = {
    connection: VA.STATE.DISCONNECTED,
    topologies: null,
    crops: null,
    topologyId: null,
    // null = no study; the whole topology is shown with nothing highlighted.
    studyId: null,
    // "topology" (the depth-first walk of the whole graph) or "chain" (only the
    // selected study's edges, in the order the sum runs). Both layouts come out
    // of the projection; this only says which one to draw.
    layoutMode: "topology",
    // { kind: "node" | "edge", id } — what the preview pane is showing.
    selection: null,
    detailImage: null,
    error: null,
  };

  var adapter = null;
  var nodes = {};
  var imageCache = {};   // "crops/x.png" -> {url} | null

  function boot() {
    nodes = {
      banner: document.getElementById("banner"),
      picker: document.getElementById("picker"),
      pane: document.getElementById("topopane"),
      totals: document.getElementById("totals"),
      detail: document.getElementById("detail"),
    };

    // ?mock=1 gives a UI tour with no folder grant and no disk access at all —
    // the same escape hatch index.html has, over the same MemoryAdapter.
    var mock = /[?&]mock=1\b/.test(window.location.search);
    adapter = mock ? new VA.MemoryAdapter(VA.demoTopologyFixture())
      : VA.FsaAdapter.isSupported() ? new VA.FsaAdapter()
      : null;

    if (!adapter) {
      state.error = "This browser has no File System Access API. Chrome or Edge " +
        "is required; ?mock=1 still runs a demo.";
      render();
      return;
    }

    adapter.init().then(function (connection) {
      state.connection = connection;
      return connection === VA.STATE.READY ? load() : null;
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  function load() {
    imageCache = {};
    return Promise.all([adapter.readTopologies(), adapter.readCrops()])
      .then(function (both) {
        state.topologies = both[0];
        state.crops = both[1];
        var all = (state.topologies && state.topologies.topologies) || [];
        if (!VA.findTopology(state.topologies, state.topologyId)) {
          selectTopology(all.length ? all[0].id : null);
        }
        return loadDetailImage();
      });
  }

  // --- selection -----------------------------------------------------------

  function selectTopology(topologyId) {
    state.topologyId = topologyId;
    // A study id from the previous topology means nothing on this one, and a
    // selection pointing at its nodes means less than nothing — an id that
    // happens to exist in both would show the wrong element under the right
    // name. Same reset the stack viewer does when the stack changes.
    state.studyId = null;
    state.layoutMode = "topology";
    state.selection = null;
    state.detailImage = null;
  }

  function selectElement(kind, id) {
    state.selection = { kind: kind, id: id };
    loadDetailImage().then(render);
  }

  function currentTopology() {
    return VA.findTopology(state.topologies, state.topologyId);
  }

  function currentStudy() {
    return state.studyId ? VA.findStudy(currentTopology(), state.studyId) : null;
  }

  // The preview pane renders the crop INLINE, so the image is fetched as soon as
  // an edge is selected. Only an edge that re-expresses a committed stack element
  // has one: `crop_key` is the (stack, element) pair crops.json is keyed by.
  function loadDetailImage() {
    state.detailImage = null;
    var selection = state.selection;
    if (!selection || selection.kind !== "edge") return Promise.resolve();
    var edge = VA.topologyIndex(currentTopology()).edges[selection.id];
    if (!edge || !edge.crop_key) return Promise.resolve();
    var entry = VA.cropFor(state.crops, edge.crop_key.stack, edge.crop_key.element);
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

  // --- render --------------------------------------------------------------

  function render() {
    VA.renderBanner(nodes.banner, bannerState(), {
      onConnect: function () { gesture(adapter.connect()); },
      onReconnect: function () { gesture(adapter.reconnect()); },
      onReload: function () { load().then(render); },
    });

    VA.renderTopoPicker(nodes.picker, state.topologies, state, {
      onTopology: function (id) { selectTopology(id); rewind(); },
      onStudy: function (id) {
        state.studyId = id || null;
        if (!state.studyId) state.layoutMode = "topology";
        rewind();
      },
      onLayoutMode: function () {
        state.layoutMode = state.layoutMode === "chain" ? "topology" : "chain";
        rewind();
      },
    });

    var topoProj = currentTopology();
    var study = currentStudy();
    var ctx = {
      topoProj: topoProj,
      study: study,
      crops: state.crops,
      layoutMode: state.layoutMode,
      selection: state.selection,
      detailImage: state.detailImage,
      onSelect: selectElement,
    };
    VA.renderTopoPane(nodes.pane, ctx);
    VA.renderTopoTotals(nodes.totals, topoProj, study, VA.topologyIndex(topoProj));
    VA.renderTopoDetail(nodes.detail, ctx);
  }

  // Re-render with the rows scrolled back to the top. Only the three controls
  // that change WHICH rows are on screen do this: clicking a row also
  // re-renders, and yanking the reader back to row 0 for that would be its own
  // bug.
  function rewind() {
    render();
    if (nodes.pane) nodes.pane.scrollTop = 0;
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

  // The banner is views/banner.js's, unchanged, and it reads `results`. This page
  // has no results.json — it has topologies.json, whose top level carries the
  // same `built_at` / `provenance` shape by construction (both writers stamp
  // through scripts/projection_provenance.py). Passing it in that slot is what
  // reuses the freshness line, the missing-projection prompt and the
  // which-tree-built-this alarms with no second copy of any of them.
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
