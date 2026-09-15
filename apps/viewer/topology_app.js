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
    // "uniform" | "tolerance" | "absolute" (VA.EDGE_LENGTH_MODES, topology.js)
    // — how much vertical extent a dimension bar gets. A display preference
    // like rowDensity, not a fact about a topology, so selectTopology() never
    // resets it either.
    edgeLengthMode: "uniform",
    // "jogged" (right-angle jogs, the default and what shipped) or "angled"
    // (one straight segment). VA.LEADER_STYLES, topology.js. A display
    // preference like the three above -- selectTopology() never resets it.
    leaderStyle: "jogged",
    // How far the jog zone has been dragged open, as a multiple of its own
    // natural width (VA.JOG_ZONE_SCALE, topology.js). A multiple rather than
    // a pixel width precisely BECAUSE it outlives the topology it was set on:
    // two topologies' natural zones differ by as many times as their leader
    // counts do, so "twice as spread out" survives the switch where a stored
    // pixel width would crush one diagram's lanes together and leave the
    // other's barely moved.
    //
    // In-session only, like every other display preference on this page.
    // localStorage was considered and left alone: the page is opened from
    // file:// as often as it is served, where a storage write is at best
    // per-file-path and at worst a throw, and nothing else here persists
    // either -- one inconsistent preference would be the surprise, not the
    // feature.
    jogZoneScale: 1,
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

    // What an inbound deep link asked for that this data could not deliver
    // (viewer_hover_cards_and_deep_links, deliverable 3): plain-words lines
    // for the banner, one per unresolvable id. Empty on a paramless boot and
    // on a link every id of which resolved.
    deepLinkNotices: [],

    // Served-mode rebuild-in-progress, driven by onRebuild/pollRebuild below
    // (viewer_rebuild_affordance). `error` is always a fixed plain sentence —
    // never the endpoint's own response text, which could name a script or a
    // path — see rebuildFailed()'s own comment for why.
    rebuild: { busy: false, error: null },

    // Whether ../annotate/ is served beside this page (study_3d_flyout):
    // probed at boot (VA.probeAnnotateMount), never assumed. true turns the
    // study/edge annotate affordances into flyout launchers; false leaves
    // the pre-flyout links exactly as they were — file://, or a server
    // without the sibling mount, degrades to a working link, not a broken
    // panel.
    annotateMount: false,
  };

  var adapter = null;
  // The inbound deep link (viewer_hover_cards_and_deep_links): parsed once at
  // boot, applied by the FIRST successful load() and then cleared — so it
  // works identically whether data arrives at boot (served / re-granted FSA /
  // mock) or only after the user clicks Connect, and a later Reload never
  // yanks the selection back to what the URL said.
  var pendingDeepLink = null;
  // Which transport `adapter` is -- one of VA.TRANSPORT (storage/adapter.js),
  // never a literal spelled here -- for the banner's own plain-words line
  // (viewer_http_transport, deliverable 2). Read in exactly two places: the
  // banner state below, and the no-adapter branch in boot(), which has to tell
  // UNPUBLISHED (a served origin with nothing baked -- not an error) from a
  // file:// page with no File System Access API (a real dead end). Nothing
  // else may read it: views key off `adapter.capabilities()`, never off which
  // class an adapter happens to be.
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
      flyout: document.getElementById("annotate-flyout"),
      flyoutClose: document.getElementById("flyout-close"),
    };
    applyDensity();

    nodes.flyoutClose.onclick = function () { nodes.flyout.close(); };

    // Probe for the sibling annotate mount (study_3d_flyout, feature 3) in
    // parallel with the transport probe below — measured, never assumed, and
    // the affordances upgrade in place when it lands after the first paint.
    // fetch is BOUND (native fetch brand-checks its receiver; the
    // viewer_http_transport lesson's own bug) and absent fetch reads as
    // "cannot probe" inside probeAnnotateMount itself.
    VA.probeAnnotateMount(
      typeof fetch === "function" ? fetch.bind(window) : null,
      window.location.protocol
    ).then(function (mounted) {
      if (mounted === state.annotateMount) return;
      state.annotateMount = mounted;
      render();
    });

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

    // The DAG normalizes itself into the window's height
    // (viewer_dag_spine_layout), which it measures at paint time -- so a
    // window that changes size after a paint leaves the picture fitted to a
    // viewport that no longer exists. Re-paint on resize, once things have
    // settled: WHICH rows are on screen never changes, only how tall their
    // slots are, so this is a render() like the density and length-mode
    // toggles are, never a rewind().
    if (window.addEventListener) {
      var resizeTimer = null;
      window.addEventListener("resize", function () {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          resizeTimer = null;
          render();
        }, 150);
      });
    }

    // ?mock=1 gives a UI tour with no folder grant and no disk access at all —
    // the same escape hatch both retired pages had, now over one merged
    // fixture (mockFixture, below) so the tour demonstrates both modes.
    var mock = /[?&]mock=1\b/.test(window.location.search);

    // The inbound deep-link contract (apps/viewer/README.md documents it for
    // the sibling repo that consumes it): selection params, parsed once here
    // and applied by the first load(). Composes with ?mock=1 — mock picks the
    // dataset, these pick the selection within it.
    pendingDeepLink = VA.parseDeepLink(window.location.search);

    chooseAdapter(mock).then(function (picked) {
      adapter = picked.adapter;
      transportKind = picked.kind;

      if (!adapter) {
        // Two very different no-adapter states, and only one of them is an
        // error. UNPUBLISHED is a served page whose origin publishes no data:
        // nothing is broken and there is nothing the reader can do, so the
        // banner states it in one sentence (views/banner.js) and this adds
        // no alarm on top. The other — file:// in a browser with no File
        // System Access API — genuinely is a dead end, and says so.
        if (transportKind !== VA.TRANSPORT.UNPUBLISHED) {
          state.error = "This browser cannot open a local folder — the viewer " +
            "needs Chrome or Edge. ?mock=1 still runs a demo.";
        }
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
        // The hover-card triggers (chips, component cells) share the same
        // survival rule as the crop trigger: a click on one opens/re-opens,
        // never closes.
        if (String(target.className || "").indexOf("cardtrig") !== -1) return;
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
  // grant at all, unlike FSA.
  //
  // The decision itself is VA.chooseTransport (storage/adapter.js), not
  // inlined here: what happens when the served probe FAILS depends on the
  // page's origin, not on this page, and it is the half worth testing without
  // a browser. All this function adds is ?mock=1 — which short-circuits both
  // transports, because the tour reads a fixture and touches no disk at all.
  function chooseAdapter(mock) {
    if (mock) {
      var memory = new VA.MemoryAdapter(mockFixture());
      return memory.init().then(function (connState) {
        return { adapter: memory, kind: VA.TRANSPORT.MOCK, state: connState };
      });
    }
    return VA.chooseTransport({
      protocol: window.location.protocol,
      http: VA.HttpAdapter.isSupported() ? new VA.HttpAdapter() : null,
      fsa: VA.FsaAdapter.isSupported() ? new VA.FsaAdapter() : null,
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

      // Apply the inbound deep link against the data just read — ids are
      // validated by VA.resolveDeepLink, and whatever it could not resolve
      // becomes a banner notice while the defaults below still apply.
      if (pendingDeepLink) {
        var linked = VA.resolveDeepLink(pendingDeepLink, state.topologies,
          state.stacksResults);
        pendingDeepLink = null;
        state.deepLinkNotices = linked.notices;
        if (linked.mode === "topology") {
          selectTopology(linked.topologyId);
          state.studyId = linked.studyId;
          state.selection = linked.selection;
        } else if (linked.mode === "stack") {
          selectStack(linked.stackId);
          state.selectedElementId = linked.elementId;
        }
      }

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
    // Deselecting a study is the respine run backwards -- the chain gives the
    // spine back to the whole walk (viewer_study_respine_animation). Same
    // topology, so there is a previous store to animate from; a click that
    // switches to a DIFFERENT topology is a different graph, and respine()
    // falls through to a plain paint for it.
    loadWorksheet().then(respine);
  }

  function onNavStudy(topologyId, studyId) {
    if (state.topologyId !== topologyId) selectTopology(topologyId);
    state.studyId = studyId || null;
    // Selecting a study RE-SPINES (viewer_study_respine_animation, from the
    // viewer-arcs brief's decision 5): the study's chain becomes the
    // right-justified linear run and the grid re-orders to the order the sum
    // runs in -- the layout the toolbar's toggle has always offered, now the
    // default for a study that sums. A study that REFUSED has no chain to lay
    // out (the error is the result), so it stays on the whole-topology walk,
    // which is the same condition the toggle disables itself for.
    state.layoutMode = chainable(studyId) ? "chain" : "topology";
    state.selection = null;
    state.detailImage = null;
    loadWorksheet().then(respine);
  }

  // Whether a study has a chain to lay out at all -- the one condition the
  // chain layout has ever had (views/topology.js's layoutFor, and the
  // toolbar's own disabled test).
  function chainable(studyId) {
    var study = studyId ? VA.findStudy(currentTopology(), studyId) : null;
    return !!(study && study.status === "ok" && study.layout);
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
      entry = VA.cropForKey(state.crops, edge.crop_key);
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

  // --- the hover reference cards (viewer_hover_cards_and_deep_links) ---------
  //
  // Same popover node, same position/close machinery as showCrop above — a
  // card IS a popover, only richer — but a card can name SEVERAL images (an
  // edge card's crop list, a component card's derived thumbnail), so the
  // fetch half paints once immediately out of the cache and repaints as each
  // missing PNG lands, rather than awaiting one blob the way showCrop does.

  function cardPngs(card) {
    var pngs = [];
    var add = function (entry) {
      if (entry && entry.status === "resolved" && entry.png &&
          pngs.indexOf(entry.png) === -1) {
        pngs.push(entry.png);
      }
    };
    (card.crops || []).forEach(function (crop) { add(crop.entry); });
    (card.thumbs || []).forEach(function (thumb) { add(thumb.entry); });
    add(card.entry);
    return pngs;
  }

  // The card's own 3D affordance, routed the same way every other one is
  // (handoff annotate_affordances_flyout_and_mesh_gating): the ONE flyout
  // panel where the mount probe passed, a plain new-tab link where it did not
  // (views/cards.js decides which from this). The card closes on launch -- it
  // is hover chrome, and the panel it just opened supersedes it.
  function onCardAnnotate(params) {
    hideCrop();
    launchAnnotate(params);
  }

  function showCard(card, trigger) {
    if (!card) return;
    openTrigger = trigger;
    openedAt = new Date().getTime();
    var paint = function () {
      if (openTrigger !== trigger) return;   // a later hover won the race
      VA.renderHoverCard(nodes.crop, card, imageCache, VA.CONFIG, hideCrop,
        { mount: state.annotateMount, onAnnotate: onCardAnnotate });
      nodes.crop.style.display = "block";
      position(nodes.crop, trigger);
      // Re-place once each PNG settles either way — same reasoning as
      // showCrop's single-image version.
      var imgs = nodes.crop.querySelectorAll ? nodes.crop.querySelectorAll("img") : [];
      Array.prototype.forEach.call(imgs, function (img) {
        img.onload = function () { position(nodes.crop, trigger); };
        img.onerror = img.onload;
      });
    };
    paint();
    cardPngs(card).forEach(function (png) {
      if (Object.prototype.hasOwnProperty.call(imageCache, png)) return;
      if (thumbFetches[png]) return;
      thumbFetches[png] = true;
      adapter.readCropImage(png).then(function (image) {
        imageCache[png] = image;
      }).catch(function () {
        imageCache[png] = null;
      }).then(function () {
        delete thumbFetches[png];
        paint();
      });
    });
  }

  // --- crops: the grid's inline thumbnails (viewer_leader_line_grid) ---------
  //
  // The thumbnail column renders synchronously out of `imageCache`; this is
  // the asynchronous half — fetch every RESOLVED crop the open topology's
  // edges address that is not cached yet, then re-render once so the text
  // triggers upgrade to images. Called from paint()'s topology branch, and
  // safe there: the second call finds everything cached (or in flight) and
  // returns without scheduling another render, so it cannot loop. An edge
  // whose crop does not resolve is never fetched — its trigger stays the
  // stateful text button, and an edge with no crop_key gets nothing at all.
  var thumbFetches = {};    // png -> true while a read is in flight

  function ensureThumbImages(topoProj) {
    if (!topoProj || !adapter) return;
    var wanted = [];
    (topoProj.edges || []).forEach(function (edge) {
      if (!edge.crop_key) return;
      var entry = VA.cropForKey(state.crops, edge.crop_key);
      if (entry.status !== "resolved" || !entry.png) return;
      if (Object.prototype.hasOwnProperty.call(imageCache, entry.png)) return;
      if (thumbFetches[entry.png]) return;
      if (wanted.indexOf(entry.png) === -1) wanted.push(entry.png);
    });
    if (!wanted.length) return;
    Promise.all(wanted.map(function (png) {
      thumbFetches[png] = true;
      return adapter.readCropImage(png).then(function (image) {
        imageCache[png] = image;
      }).catch(function () {
        imageCache[png] = null;
      }).then(function () { delete thumbFetches[png]; });
    })).then(render);
  }

  // Place the popover below the trigger, or above it when there isn't room —
  // a crop of a whole drawing sheet is tall, and one that renders off the bottom
  // of the window is a hover that shows nothing.
  //
  // VIEWPORT coordinates, no scroll offsets: the popover is position: fixed
  // (viewer_hover_cards_and_deep_links) — absolute positioning let a card
  // opened near the bottom lengthen the document, and the scrollbar that
  // summoned reflowed the panes, which is exactly the layout disturbance
  // hover-only chrome must not cause.
  function position(pop, trigger) {
    if (!trigger.getBoundingClientRect) return;
    var box = trigger.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(
      box.left, window.innerWidth - pop.offsetWidth - 16)) + "px";
    // Measure at the card's NATURAL height: clear the cap the previous
    // placement may have left on the shared popover node first, or a card
    // opened once in a tight spot stays squeezed everywhere after.
    pop.style.maxHeight = "";
    var height = pop.offsetHeight || 400;
    // The room on each side, already net of the 8px gap to the trigger and the
    // 8px margin to the window edge, so `height <= room` means "fits".
    var roomBelow = window.innerHeight - box.bottom - 16;
    var roomAbove = box.top - 16;
    // Below by default; above when the card does not fit below and above is
    // the roomier side. That subsumes the original rule (above only when it
    // genuinely fits there) and additionally picks the better side when it
    // fits neither.
    var goAbove = height > roomBelow && roomAbove > roomBelow;
    // The 80px floor is for the degenerate case only -- a trigger hard against
    // an edge, or scrolled out of the window entirely, where the roomier side
    // still measures near zero or negative. A stub of a card that scrolls
    // beats a cap the browser rejects as invalid and a card at full height.
    var room = Math.max(80, goAbove ? roomAbove : roomBelow);
    // A card that fits neither below nor above is CAPPED to the room on its
    // side, not nudged back up into the trigger
    // (viewer_popover_clamp_and_rebuild_terminal_state, 2026-09-14). Before
    // the cap it rendered below anyway and its footer -- on the edge card, the
    // citation line and the crop-key claim -- sat past the window bottom,
    // unreachable: a `position: fixed` element cannot be scrolled into view,
    // and `max-height: calc(100vh - 24px)` did not bite because the card was
    // already shorter than the WINDOW; it was the room beside its TRIGGER it
    // overran. Measured at 1600x700 on ?mock=1, the base_thickness edge card:
    // trigger 418.5-444.5, card 527.5 tall placed at top 452.5, bottom at 980
    // on a 700px window -- 280px of it off the bottom, with nothing scrolling
    // inside it. Capped to the room (402.5, the side above being the roomier
    // one) it opens at top 8 and ends at 410.5, and `.croppop`'s existing
    // `overflow-y: auto` is what makes the rest of it reachable.
    //
    // Moving the card instead -- the obvious clamp, top = min(top, innerHeight
    // - height - 8) -- is the wrong fix, and measurably so: a below-placed
    // card is already only 8px under its trigger, so ANY upward move puts the
    // card over the trigger, and then hiding the card (Escape, the close box)
    // hands the pointer straight back to the trigger underneath, whose
    // mouseenter re-opens it. Undismissable, which is worse than an
    // unreachable footer. Measured 2026-09-14 in the browser tier: with that
    // clamp, the topology suite could not dismiss the citation card and every
    // later hover timed out behind it.
    if (height > room) {
      pop.style.maxHeight = room + "px";
      height = pop.offsetHeight || height;
    }
    pop.style.top = Math.max(8, goAbove
      ? box.top - height - 8
      : box.bottom + 8) + "px";
  }

  // --- the annotator flyout (study_3d_flyout) --------------------------------
  //
  // One iframe, created lazily on the first launch and KEPT across launches:
  // the annotator's folder grant, loaded meshes and camera are session state
  // worth preserving, so a later launch drives the open panel over
  // postMessage -> AA.exec (the annotator's own command vocabulary, the same
  // verbs the boot URL's params run) instead of reloading it. Only reachable
  // when the boot-time probe found ../annotate/ served beside this page;
  // everywhere else the views render the pre-flyout links and none of this
  // runs.
  var flyoutFrame = null;
  var flyoutLoaded = false;

  function launchAnnotate(params) {
    if (!state.annotateMount) return;
    if (!flyoutFrame) {
      flyoutFrame = document.createElement("iframe");
      flyoutFrame.className = "flyout__frame";
      flyoutFrame.setAttribute("title", "3D annotation panel");
      flyoutFrame.addEventListener("load", function () { flyoutLoaded = true; });
      flyoutFrame.src = VA.annotateLink(params);
      nodes.flyout.appendChild(flyoutFrame);
    } else if (!flyoutLoaded) {
      // The iframe exists but its document is still loading, so its message
      // listener may not be registered yet and a postMessage would be lost --
      // re-point the boot URL at the new params instead.
      flyoutFrame.src = VA.annotateLink(params);
    } else {
      VA.annotateExecCommands(params).forEach(function (command) {
        flyoutFrame.contentWindow.postMessage(
          { type: "annotate:exec", command: command }, window.location.origin);
      });
    }
    // show(), not showModal(): the page beside the panel stays clickable, so
    // "attach to 3D" on another row re-drives the open panel.
    if (!nodes.flyout.open) nodes.flyout.show();
  }

  // --- the two resize drags (viewer_leader_grid_legibility) ----------------
  //
  // The pane renders the grips (views/topology.js's resizeGrip); the drag
  // itself has to live out here, because the listeners belong on the DOCUMENT
  // rather than on the grip. Every pointermove re-renders the pane, which
  // destroys the node the pointer went down on -- a pointer capture on the
  // grip would end the drag on its own first frame.
  //
  // What the drag measures FROM is snapshotted at pointerdown (resizeFrom
  // below) and the delta is applied to that, never to the live value: a
  // re-render mid-drag rebuilds the grip carrying the new numbers, and
  // reading them back per move compounds every frame into a runaway.
  var resizeFrame = null;

  // One paint per animation frame, not one per raw pointermove: a real
  // topology's pane is a full SVG plus a row per edge, and a browser fires
  // moves far faster than it can rebuild that.
  function scheduleResizePaint() {
    if (resizeFrame !== null) return;
    var raf = (typeof window !== "undefined" && window.requestAnimationFrame)
      ? window.requestAnimationFrame.bind(window)
      : function (fn) { return setTimeout(fn, 16); };
    resizeFrame = raf(function () { resizeFrame = null; render(); });
  }

  function resizeFrom(spec) {
    if (spec && spec.kind === "column") {
      var column = VA.topoColumn(spec.cls);
      return { kind: "column", cls: spec.cls, width: column ? column.width : 0 };
    }
    return { kind: "jog", naturalZone: spec && spec.naturalZone,
             scale: state.jogZoneScale };
  }

  // The arithmetic is the pure layer's (VA.jogZoneScaleAfterDrag,
  // VA.setTopoColumnWidth): this shell holds no resize maths of its own, and
  // the column width is written into the ONE COLUMNS array the head table and
  // the body table both take their <col> widths from.
  function applyResize(from, dx) {
    if (from.kind === "jog") {
      state.jogZoneScale = VA.jogZoneScaleAfterDrag(from.scale, dx, from.naturalZone);
    } else if (from.kind === "column") {
      VA.setTopoColumnWidth(from.cls, from.width + dx);
    }
  }

  function onResizeStart(spec, event) {
    var from = resizeFrom(spec);
    var startX = event && typeof event.clientX === "number" ? event.clientX : 0;
    var move = function (ev) {
      applyResize(from, ev.clientX - startX);
      scheduleResizePaint();
    };
    var end = function () {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      document.body.classList.remove("tv-resizing");
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    // A drag across a grid is otherwise a text selection, and the cursor
    // reverts to whatever it is over the moment it leaves the 7px grip.
    document.body.classList.add("tv-resizing");
  }

  // The keyboard path: the grip is focusable and the arrow keys nudge it (with
  // shift for a coarse step), so neither resize needs a pointer at all.
  //
  // The re-focus is not a nicety. render() rebuilds the header, which destroys
  // the very node the keydown came from, so focus falls back to <body> and the
  // SECOND arrow press goes nowhere -- one nudge per tab-to-the-grip, which
  // reads as the control being broken. The grips carry `data-resize` for
  // exactly this (and for a test to find them by what they resize rather than
  // by their position in the header).
  function onResizeNudge(spec, dx) {
    applyResize(resizeFrom(spec), dx);
    render();
    var key = spec.kind + (spec.cls ? ":" + spec.cls : "");
    var grip = document.querySelector('[data-resize="' + key + '"]');
    if (grip && grip.focus) grip.focus();
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
    // A transition in flight renders the pane from the ctx it started with,
    // so any paint that is not one of its own frames has to stop it first: a
    // resize, a selection or a reload landing mid-respine would otherwise be
    // painted over by the next frame of a state the page has already left.
    // Claimed rather than read, so a respine that never reaches the pane (a
    // paint in stack mode) does not leave one armed for a later one.
    if (respineHandle) { respineHandle.cancel(); respineHandle = null; }
    var respineStart = respineFrom;
    respineFrom = null;

    VA.renderBanner(nodes.banner, bannerState(), {
      // Guarded: the banner only ever offers these when an FSA adapter exists,
      // but a no-adapter boot still renders a banner, and a button whose
      // handler throws is worse than one that is absent.
      onConnect: function () { if (adapter) gesture(adapter.connect()); },
      onReconnect: function () { if (adapter) gesture(adapter.reconnect()); },
      // `.catch` before `.then(render)`, the same shape gesture() already has
      // below: a rejected load() (the adapter losing the folder mid-session,
      // say) used to be an unhandled rejection with a no-op Reload button --
      // now it lands in state.error and the banner says so.
      onReload: function () {
        load().catch(function (err) {
          state.error = String(err && err.message || err);
        }).then(render);
      },
      onRebuild: onRebuild,
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
        edgeLengthMode: state.edgeLengthMode,
        // The two leader-legibility preferences (viewer_leader_grid_
        // legibility): which style a leader is drawn in, and how far the jog
        // zone has been dragged open. The grips the pane renders for the
        // second one call back through onResizeStart/onResizeNudge below.
        leaderStyle: state.leaderStyle,
        jogZoneScale: state.jogZoneScale,
        onResizeStart: onResizeStart,
        onResizeNudge: onResizeNudge,
        // The grid's thumbnail column reads fetched crop PNGs out of this
        // cache synchronously (views/topology.js's edgeCropCell); the fetch
        // itself is ensureThumbImages below, fired after this paint.
        cropImages: imageCache,
        onSelect: selectElement, onCropShow: showCrop,
        // The hover reference cards (viewer_hover_cards_and_deep_links): the
        // crop trigger, the merged component cell and the confidence chip all
        // open one through this, into the same positioned popover node.
        onCardShow: showCard,
        // The flyout (study_3d_flyout): the detail pane's "attach to 3D"
        // renders only when the mount probe passed AND a launcher exists.
        annotateMount: state.annotateMount,
        onAttach3d: launchAnnotate,
      };
      VA.renderTopoToolbar(nodes.toolbar, state, topoProj, {
        // The same re-serialisation the nav's study click makes, asked for
        // by hand -- so it animates the same way (viewer_study_respine_
        // animation). rewind()'s scroll reset rides along inside respine().
        onLayoutMode: function () {
          state.layoutMode = state.layoutMode === "chain" ? "topology" : "chain";
          respine();
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
        // Edge-length scaling (viewer_edge_length_scaling): cycle through the
        // three modes in VA.EDGE_LENGTH_MODES' own `next` order. Same
        // reasoning as density again — WHICH rows are on screen never
        // changes, only how tall the DAG's slots are — so render(), not
        // rewind().
        onEdgeLength: function () {
          var mode = VA.EDGE_LENGTH_MODES[state.edgeLengthMode];
          state.edgeLengthMode = mode ? mode.next : "uniform";
          render();
        },
        // Leader style (viewer_leader_grid_legibility): same reasoning again
        // -- only the path between a leader's two unchanged ends is redrawn,
        // so render(), not rewind().
        onLeaderStyle: function () {
          var style = VA.LEADER_STYLES[state.leaderStyle];
          state.leaderStyle = style ? style.next : "jogged";
          render();
        },
        // "View in 3D" (study_3d_flyout): the toolbar builds the params
        // (topology + study + trace), this just launches them.
        onStudy3d: launchAnnotate,
      });
      VA.renderTopoJoint(nodes.topojoint, topoProj);
      if (respineStart && respineStart.topologyId === topoProj.id) {
        // `onError` puts an animation frame's throw on the SAME seam every
        // other render on this page uses: a frame runs off a rAF callback,
        // outside render()'s try/catch, so without this it would be an
        // unhandled error with the pane frozen mid-transition.
        respineHandle = VA.animateTopoPane(nodes.pane, ctx, respineStart,
          { onError: renderCrash });
      } else {
        VA.renderTopoPane(nodes.pane, ctx);
      }
      VA.renderTopoTotals(nodes.totals, topoProj, study, VA.topologyIndex(topoProj));
      VA.renderTopoDetail(nodes.detail, ctx);
      ensureThumbImages(topoProj);
    } else {
      VA.renderStack(nodes.stackview, stackProj, state.crops, {
        onCropShow: showCrop,
        onCardShow: showCard,
        onElementSelect: selectStackElement,
        selectedElementId: state.selectedElementId,
      });
      VA.renderDetail(nodes.detail, stackProj, state.selectedElementId,
        state.crops, state.detailImage, VA.CONFIG);
    }

    VA.renderWorksheet(nodes.worksheet, showTopology ? topoProj : stackProj,
      state.worksheetText);

    // What this paint put on screen, for the no-op guard in respine() above.
    // A transition's own frames do not come through paint(), so this stays
    // the target's throughout one.
    paintedSerialisation = serialisation();
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
  // --- the respine (viewer_study_respine_animation) -------------------------
  //
  // A rewind() whose pane paint is a TRANSITION rather than a repaint: the
  // store the outgoing paint drew from is captured here, before anything is
  // re-rendered, and paint() hands it to VA.animateTopoPane. Only the two
  // controls that change WHICH serialisation is on screen come through here
  // (picking or dropping a study in the nav, and the toolbar's layout
  // toggle); everything else -- density, length mode, leader style, a resize
  // drag -- changes how the SAME rows are drawn and has always been a plain
  // render.
  //
  // VA.lastTopoRender is the store the LAST pane paint drew from, which
  // during a transition is that transition's own last frame: interrupting a
  // respine with another one therefore picks up where the first one had got
  // to instead of snapping back to where it began.
  var respineFrom = null;
  var respineHandle = null;
  var paintedSerialisation = null;

  // Which serialisation is on screen: the topology, the study and which of
  // the two layouts. A respine is only a TRANSITION when one of those three
  // actually changed -- clicking the nav row of the topology already open is
  // a no-op, and animating a no-op would lay a fading ghost of the page over
  // the identical page for a quarter of a second.
  function serialisation() {
    return [state.mode, state.topologyId, state.studyId,
            state.layoutMode].join(" / ");
  }

  function respine() {
    respineFrom = serialisation() === paintedSerialisation
      ? null
      : (VA.lastTopoRender || null);
    rewind();
  }

  function rewind() {
    render();
    if (nodes.pane) nodes.pane.scrollTop = 0;
    if (nodes.stackview) nodes.stackview.scrollTop = 0;
  }

  // --- rebuild (viewer_rebuild_affordance): the banner's button, end to end -
  //
  // Only reachable when the banner offered it at all (capabilities().rebuild),
  // so a caller passing through here already knows adapter.requestRebuild
  // exists. Click -> POST -> poll GET .../status until it stops being busy ->
  // reload the projections on success. `REBUILD_POLL_MS` is a plain interval,
  // not backoff: tolstack_mount_rebuild_endpoint's own rebuild is a one-shot
  // script run, seconds long, not a job queue worth backing off against.
  var REBUILD_POLL_MS = 1500;

  // The endpoint's own state vocabulary, read from the server that answers it
  // rather than guessed: drawing-checker's `webui/tolstack_rebuild.py` STATES
  // = idle | queued | running | done | failed, with the status dict's `busy`
  // true for exactly queued and running. `done` is the ONLY state that means a
  // rebuild finished, which is why pollRebuild tests for it instead of
  // accepting the complement of `failed`
  // (viewer_popover_clamp_and_rebuild_terminal_state, 2026-09-14): a server
  // restarted mid-poll has no memory of the run and answers a terminal `idle`,
  // and reading that as success reloads a projection that was never rebuilt
  // and presents it as a fresh one.
  var REBUILD_DONE = "done";

  function onRebuild() {
    if (!adapter || typeof adapter.requestRebuild !== "function" || state.rebuild.busy) return;
    state.rebuild = { busy: true, error: null };
    render();
    adapter.requestRebuild().then(pollRebuild).catch(rebuildFailed);
  }

  function pollRebuild(status) {
    if (status && status.busy) {
      setTimeout(function () {
        adapter.readRebuildStatus().then(pollRebuild).catch(rebuildFailed);
      }, REBUILD_POLL_MS);
      return;
    }
    // Only the server's own completion state is success. Anything else that
    // has stopped being busy -- a terminal `idle` from a restarted server, or
    // a state this client has never heard of -- is not evidence that the
    // rebuild finished, so it takes the failure exit: no reload, and the
    // reader is told to try again. An unknown status is not a success.
    if (!status || status.state !== REBUILD_DONE) {
      rebuildFailed();
      return;
    }
    state.rebuild = { busy: false, error: null };
    load().catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  // Deliberately a fixed sentence, never the endpoint's own error/tail text:
  // that text can name a script or a filesystem path (a Python traceback's
  // ordinary shape), which is exactly what this handoff exists to keep out of
  // the banner. The failure is real and worth saying; the diagnostic detail
  // belongs in the server's own log, not this page.
  function rebuildFailed() {
    state.rebuild = {
      busy: false,
      error: "The rebuild failed. Try again, or ask whoever runs the server " +
        "to check its logs.",
    };
    render();
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
      // What an inbound deep link asked for that this data could not deliver
      // — its own plain-words lines, NOT extraAlarms: those render under the
      // "needs a rebuild" headline, and a mistyped link is not a stale
      // projection.
      notices: state.deepLinkNotices,
      // Which transport is live (viewer_http_transport, deliverable 2): the
      // connect-folder banner already disappears on its own once state is
      // READY, so this is only the one line served mode adds — FSA mode gets
      // no new line at all, unchanged from before this handoff.
      transport: transportKind,
      // What this adapter can actually do (viewer_rebuild_affordance): an
      // adapter with no capabilities() method (FSA, memory, node-fs) reads as
      // null here, same as views/topology_app.js's own worksheet check reads
      // "no capabilities() means fully capable" — the banner's own
      // `caps && caps.rebuild` guard treats null/undefined identically to
      // `{ rebuild: false }`.
      capabilities: adapter && typeof adapter.capabilities === "function"
        ? adapter.capabilities() : null,
      rebuild: state.rebuild,
    };
  }

  VA.bootTopology = boot;
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", boot);
  }
})(window.ViewerApp = window.ViewerApp || {});
