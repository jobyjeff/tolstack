// Boot + wiring for the ONE viewer page. Absorbed the stack viewer's own boot
// (formerly app.js, now deleted — index.html redirects here): most stacks in
// docs/tolerance_stacks/ have no topology re-expressing them (VA.looseStacks,
// topology.js), so this file has to be able to show a system EITHER way —
// rails + grid for one that has a topology, the elements table
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
    // for the stack view, never for anything the DAG renders.
    stacksResults: null,
    crops: null,
    // The kinematic studies' projection (views/kinematic.js), or null when it
    // is not built -- the ordinary state, in which its nav section is absent
    // and nothing else on the page changes.
    kinematic: null,

    // Which of the three ways a page is being shown. Set only by
    // selectTopology()/selectStack()/selectKinematic(); the nav tree
    // (views/nav.js) reads it to decide which row, if any, is marked current.
    mode: "topology",
    // The kinematic study on screen in "kinematic" mode.
    kinematicId: null,

    topologyId: null,
    // null = no study; the whole topology is shown at full emphasis. A study
    // does NOT change which layout is drawn -- there is only one, the walk
    // (viewer_respine_whole_walk, 2026-09-15) -- it changes which of the
    // walk's elements are emphasized, which leaders are drawn and which rows
    // the grid beside them holds. The retired `layoutMode` used to live here.
    studyId: null,
    // {axis: [value, ...]}: the nav's tag chips (VA.studyMatchesTags).
    tagFilter: {},
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
    // The DAG's zoom (VA.DAG_ZOOM, topology.js): per page state, never stored.
    // 1 is the drawing at its own size; the wheel, Fit and `0` move it.
    dagZoom: 1,
    // "jogged" (right-angle jogs, what shipped first) or "angled" (one
    // straight segment, the default since 2026-09-21). VA.LEADER_STYLES and
    // VA.DEFAULT_LEADER_STYLE, topology.js. A display preference like the
    // three above -- selectTopology() never resets it.
    leaderStyle: VA.DEFAULT_LEADER_STYLE,
    // "dim" | "hide" -- what the DAG does with the model outside the page's
    // lit set (VA.UNLIT_STYLES, VA.DEFAULT_UNLIT_STYLE, topology.js). A
    // display preference like the leader style, in-session like it, and kept
    // across every page that has a lit set: a chain study and a kinematic
    // study alike.
    unlitStyle: VA.DEFAULT_UNLIT_STYLE,
    // Which of a kinematic page's sub-stacks are open ({sub-study id: true},
    // VA.kinematicSubStacks): the DAG's dashed field and the contributor
    // table's group row read and write this one map, so they open and close
    // together. In-session, like the unlit style.
    openSubStacks: {},
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
    // How wide the right preview pane is, in px, or null for "whatever
    // topology.css declares" (Jeff, 2026-09-15: "the right preview pane is
    // resizable. It's too narrow"). The ONE preference on this page that
    // outlives the session -- VA.readStoredPaneWidth/writeStoredPaneWidth own
    // the storage and argue there why this one and none of the four above.
    // null rather than a number by default so the stylesheet stays the single
    // place the default width lives; nothing is written inline until a drag
    // or a remembered value says otherwise.
    detailWidth: null,
    // How wide the left-docked annotator flyout is, in px, or null for
    // "whatever topology.css declares" — the same contract, the same reason
    // and the same remembered-across-sessions posture as `detailWidth` above,
    // over its own key (VA.FLYOUT_WIDTH_KEY). Jeff asked for the 3D panel
    // beside the DAG, and how much of the window a reader wants to give it is
    // exactly the kind of preference that means the same thing on every
    // topology.
    flyoutWidth: null,
    // How wide the nav is, in px, or null for "whatever topology.css
    // declares" -- the same contract again, over VA.NAV_WIDTH_KEY (handoff
    // a_face_is_picked_the_way_cad_picks_it: the scene's tree is drawn in the
    // nav and its names were clipped at the stylesheet's width).
    navWidth: null,
    // { kind: "node" | "edge", id } — what the preview pane is showing, in
    // topology mode.
    selection: null,

    // Stack mode's own selection — the element whose full sourcing renders in
    // the right pane (views/detail.js). Reset whenever the stack changes, same
    // reason selection is reset on selectTopology().
    selectedStackId: null,
    // The stack page's ONE selection, and it is a ROW id rather than an
    // element id since 2026-09-18: the materials table became clickable when
    // its composite source cell was retired, and a material and an element are
    // two rows in two tables feeding one preview pane. views/detail.js
    // resolves the id against elements first, then materials.
    selectedRowId: null,
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
  var paneWanted = false;
  var bootLoaded = false;
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
  // Where the pointer is, and where it was one move ago -- the two points the
  // hover-intent corridor is computed from (VA.pointerHeadsFor). Null until
  // the first mousemove: a page that has never seen the pointer defers nothing.
  var pointerAt = null;
  var pointerWas = null;
  // A competing trigger's open, held while the pointer is travelling toward
  // the card already on screen: { trigger, run, timer }.
  var deferredOpen = null;
  // The trigger whose deferral has just EXPIRED, for exactly the length of the
  // re-entrant call that honours it. See defer() -- this is what stops an
  // expiry re-arming itself forever.
  var expiring = null;
  // What `position()` last left the popover's height at, so an image settling
  // afterwards can tell "the box grew" from "the box is exactly as measured".
  var placedHeight = 0;

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
      detailDivider: document.getElementById("detail-divider"),
      navDivider: document.getElementById("nav-divider"),
      crop: document.getElementById("croppop"),
      flyout: document.getElementById("annotate-flyout"),
      flyoutCollapse: document.getElementById("flyout-collapse"),
      flyoutDivider: document.getElementById("flyout-divider"),
      flyoutTitle: document.getElementById("flyout-title"),
      flyoutStatus: document.getElementById("flyout-status"),
      paneHandle: document.getElementById("pane-handle"),
    };
    applyDensity();
    state.detailWidth = VA.readStoredPaneWidth(widthStore());
    applyPaneWidth();
    wireDetailDivider();
    state.navWidth = VA.readStoredNavWidth(widthStore());
    applyNavWidth();
    wireDivider(nodes.navDivider, { kind: "nav" });

    // The remembered width is the reader's PREFERENCE, kept as chosen (only
    // its own min/max applied -- a room of 0 is "no layout to go on"): at
    // boot the page has not loaded what it will show, so a clamp against this
    // first layout would bake in a page the reader is not on. Each page fits
    // it when the pane opens or follows (refitPane).
    flyoutWanted = VA.readStoredFlyoutWidth(widthStore(), 0, 0);
    state.flyoutWidth = flyoutWanted === null ? null
      : VA.clampFlyoutWidth(flyoutWanted, roomBesideFlyout(), graphNeed());
    applyFlyoutWidth();
    wireFlyoutDivider();

    // ONE handle (handoff the_scene_pane_is_one_flyout_that_reads_over_http):
    // the seam's tab opens the pane on whatever is selected -- no row needed --
    // and the chevron on the pane's own divider closes it. The tab is rendered
    // only where the mount probe passed (syncPaneHandle), so a page that
    // cannot embed the annotator shows nothing about it.
    if (nodes.paneHandle) nodes.paneHandle.onclick = function () { openPane(); };
    if (nodes.flyoutCollapse) {
      nodes.flyoutCollapse.onclick = function () { nodes.flyout.close(); };
      // A press on the chevron is a click, never the start of a resize drag
      // on the divider it sits in.
      nodes.flyoutCollapse.onpointerdown = function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
      };
    }
    // The ONE seam every close path goes through. Not the button's handler:
    // `.close()` is also reachable from anywhere else that holds the element,
    // and a page left shifted with no panel on it would be a layout with no
    // way back. `display: none` and a margin both reverse exactly, so this is
    // the whole of "closing restores whatever it covered".
    nodes.flyout.addEventListener("close", function () {
      document.body.classList.remove("flyout-open");
      // The scene's tree leaves the nav.
      sceneTree = null;
      renderNav();
      // Closed is remembered as firmly as open: the pane stays where the
      // reader left it, either way, across a reload.
      VA.writeStoredFlyoutOpen(widthStore(), false);
      paneFollowed = null;
      clearPaneHover();
      syncPaneHandle();
      // The leaders go with the scene; it is told everything again on reopen.
      // Its anchors too: a closed panel's canvas has no size, and what it
      // posted describes a box that is no longer there.
      sceneModelPosted = null;
      sceneSelectPosted = null;
      forgetSeamAnchors(false);
      // The page is back to the width the band was centred for.
      if (state.landed) { dropBandPad(); fitDagTo(true, true); }
      scheduleSeamDraw();
    });
    wirePaneHover();
    wirePaneState();
    wireSeam();
    wireZoom();

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
      // A pane the reader left open reopens -- on whatever this boot
      // selected, through the same rule a selection change uses.
      if (mounted && VA.readStoredFlyoutOpen(widthStore())) openPane();
      openWantedPane();
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
    // ?pane=1 -- the old annotator page's redirect (annotate/commands.js's
    // AA.shellUrl): open the 3D pane on whatever the link selected, once the
    // selection is applied and the mount is known.
    paneWanted = /[?&]pane=1(&|$)/.test(window.location.search);

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
      // The pointer's own track, for the hover-intent corridor below. Cheap on
      // purpose: two numbers per move, and the only work beyond that happens
      // while a trigger is actually being held back.
      //
      // A move to the SAME coordinates is dropped rather than recorded, and
      // that is not a micro-optimisation: shifting `pointerWas` up to a
      // position identical to `pointerAt` leaves a zero vector, and
      // VA.pointerHeadsFor correctly refuses to guess a direction from one --
      // so the whole corridor goes dead. Two things produce that pair. A
      // browser emits repeat mousemoves at rest; and any harness that calls
      // VA.bootTopology() a second time (every real-data probe in tests/ does,
      // to install fixtures) registers a SECOND copy of this listener, whose
      // run immediately overwrites the first's reading with its own. Measured
      // 2026-09-16 in tests/debug_hover_deslop.mjs, where it made hover intent
      // untestable from a probe.
      document.addEventListener("mousemove", function (event) {
        var x = event.clientX, y = event.clientY;
        if (pointerAt && pointerAt.x === x && pointerAt.y === y) return;
        pointerWas = pointerAt;
        pointerAt = { x: x, y: y };
        if (deferredOpen && VA.pointerInside(pointerAt, cardBox())) {
          // The pointer got where it was going. The card it reached wins and
          // the trigger it crossed on the way never opens at all.
          cancelDeferred();
        }
      });

      state.connection = picked.state;
      return picked.state === VA.STATE.READY ? load() : null;
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(function () {
      bootLoaded = true;
      render();
      openWantedPane();
    });
  }

  // The pane a ?pane=1 link asked for: once, when both the selection (boot's
  // load) and the annotate mount are in.
  function openWantedPane() {
    if (!paneWanted || !bootLoaded || !state.annotateMount) return;
    paneWanted = false;
    openPane();
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
    // No `hostname`: this page passes the protocol ONLY, so the picker is
    // offered on file:// and nowhere else -- unchanged from
    // viewer_transport_honest_hosted. That is deliberate, not an omission
    // (chooseTransport's own comment): the viewer's legitimate local page IS
    // file://, since it is built to run by double-click, so it needs no
    // loopback carve-out the way apps/annotate/ does. Whether a loopback
    // viewer page with a failing probe should offer the picker rather than
    // saying "not published on this site" is a real open question, filed as
    // ISSUE_20260915_viewer_says_unpublished_on_a_loopback_origin_it_could_
    // offer_a_picker_for rather than decided here.
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
      kinematic: VA.demoKinematicFixture(),
    };
  }

  function load() {
    imageCache = {};
    return Promise.all([
      adapter.readTopologies(), adapter.readCrops(), adapter.readResults(),
      // Every adapter implements it (storage/adapter.js); the guard is for a
      // test's hand-built fake, which may predate it and should read as "not
      // built" rather than throw.
      typeof adapter.readKinematic === "function"
        ? adapter.readKinematic() : Promise.resolve(null),
    ]).then(function (all) {
      state.topologies = all[0];
      state.crops = all[1];
      state.stacksResults = all[2];
      state.kinematic = all[3] || null;

      // Apply the inbound deep link against the data just read — ids are
      // validated by VA.resolveDeepLink, and whatever it could not resolve
      // becomes a banner notice while the defaults below still apply.
      if (pendingDeepLink) {
        var linked = VA.resolveDeepLink(pendingDeepLink, state.topologies,
          state.stacksResults, state.kinematic);
        pendingDeepLink = null;
        state.deepLinkNotices = linked.notices;
        if (linked.mode === "kinematic") {
          selectKinematic(linked.kinematicId);
          state.selection = linked.selection;
        } else if (linked.mode === "topology") {
          selectTopology(linked.topologyId);
          state.studyId = linked.studyId;
          state.selection = linked.selection;
        } else if (linked.mode === "stack") {
          selectStack(linked.stackId);
          state.selectedRowId = linked.elementId;
        }
      }

      var stillValid = state.mode === "kinematic"
        ? VA.findKinematicStudy(state.kinematic, state.kinematicId)
        : state.mode === "topology"
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
    state.selectedRowId = null;
    state.detailImage = null;
  }

  // --- selection: kinematic mode ---------------------------------------------

  // A kinematic study is a lit subset of its topology's one model
  // (2026-10-26), so its page has the topology open underneath it: the DAG
  // draws `state.topologyId`, and a selection on the page is an element of
  // that topology. No chain study is selected -- the lit set is the
  // kinematic study's own (VA.kinematicLitSet).
  function selectKinematic(studyId) {
    var study = VA.findKinematicStudy(state.kinematic, studyId);
    state.mode = "kinematic";
    state.kinematicId = studyId;
    state.topologyId = study ? study.topology : null;
    state.selection = null;
    state.studyId = null;
    state.detailImage = null;
  }

  function selectStackRow(rowId) {
    state.selectedRowId = rowId;
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

  // No click may leave the page wedged (deliverable 1,
  // viewer_nav_wedge_and_classic_retirement). Every nav handler moves `state`
  // FIRST and then awaits a worksheet read, so a rejected read with no catch
  // strands the page in the state it just moved to with no repaint at all --
  // the picture on screen is the node you clicked away from, the nav's
  // highlight is nowhere, and the only way out is F5. That is the same bug
  // shape as the 2026-09-09 silently-empty-DAG incident (render()'s own
  // comment names it), which was fixed for onReload and not here.
  //
  // So: whatever happens to the read, the page repaints. The paint is the
  // handler's own (a respine transition, or a plain render in stack mode) on
  // success, and always a plain render on failure -- animating INTO an error
  // would be a quarter-second of the page pretending the click worked.
  //
  // `state.worksheetText` is cleared rather than left alone, for the same
  // reason the banner is written: loadWorksheet() only ASSIGNS on success, so
  // the previous node's worksheet would otherwise still be sitting in the
  // dialog under this node's title.
  //
  // The read is called from INSIDE the try, not handed in as a promise: an
  // adapter whose readText throws before it ever returns one would otherwise
  // unwind straight out of the click handler, which is the wedge this exists
  // to stop, reached by a different door.
  //
  // WHICH adapters those are, narrowed 2026-09-16 from "a null adapter, an
  // unready handle -- VA.requireReady throws", which overstated the door in
  // both halves. FsaAdapter.readText and HttpAdapter.readText are `async`, so
  // a requireReady throw in either arrives as a REJECTION and is caught by the
  // handler below rather than by this try. The two that can throw
  // synchronously are the non-async ones: MemoryAdapter (requireReady, on an
  // unready handle) and NodeFsAdapter (whose `_io.readText` is a synchronous
  // filesystem read). A null `adapter` would throw as well, but boot() returns
  // before any nav row renders without one. So the guard is defence in depth
  // through a narrower door than it claimed -- kept, because those two doors
  // are real and the cost is one `try`. No tier reaches it today.
  function navigate(paint) {
    var pending;
    try {
      pending = loadWorksheet();
    } catch (err) {
      navFailed(err);
      return;
    }
    pending.then(function () {
      // A read that worked retires the banner a previous failure wrote. The
      // banner has no dismiss control, so an error left standing after the
      // page has demonstrably recovered is a sentence the reader cannot get
      // rid of -- and it would be sitting over a node it was never about.
      // Same rule as gesture() and the banner's own onReload.
      state.error = null;
      paint();
    }, navFailed);
  }

  function navFailed(err) {
    state.worksheetText = null;
    state.error = String(err && err.message || err);
    render();
  }

  function onNavTopology(topologyId) {
    selectTopology(topologyId);
    // Deselecting a study is the respine run backwards -- the whole walk gets
    // its leaders and its full emphasis back (viewer_study_respine_animation).
    // Same topology, so there is a previous store to animate from; a click
    // that switches to a DIFFERENT topology is a different graph, and
    // respine() falls through to a plain paint for it.
    navigate(respine);
  }

  function onNavStudy(topologyId, studyId) {
    // From another topology, or from a kinematic study's page -- which has
    // the topology open under it, so the id alone would match.
    if (state.mode !== "topology" || state.topologyId !== topologyId) {
      selectTopology(topologyId);
    }
    state.studyId = studyId || null;
    // Selecting a study RE-SPINES (viewer_study_respine_animation), and since
    // viewer_respine_whole_walk a respine is no longer a view switch: the
    // rails keep every node and edge of the walk, the non-members dim, the
    // leaders retarget onto the chain and the grid drops to the chain's rows.
    // The transition the animator runs is therefore the leaders' jog zone
    // narrowing and the two blocks re-centring, not a second layout sliding
    // in over the first. A study that REFUSED has no chain, so it leaves the
    // walk exactly as it was -- and that is the same condition
    // views/topology.js's `marking` tests, not a second rule here.
    state.selection = null;
    state.detailImage = null;
    redrivePaneAfter(respine);
  }

  // A navigation click, then the pane re-driven whether or not the paint ran
  // (a respine to the same view paints nothing, and followSelection consumes
  // the flag only when it does).
  function redrivePaneAfter(paint) {
    forcePaneFollow = true;
    navigate(paint);
    if (forcePaneFollow) followSelection();
  }

  // A tag chip toggles one value on its axis; the nav and the DAG both read
  // `state.tagFilter` (VA.studyMatchesTags, VA.otherVariantParts), so a repaint
  // is the whole of the effect. Selecting a value never changes which study is
  // open: a study the filter hides stays on screen until the reader leaves it.
  function onNavTag(axis, value) {
    var values = (state.tagFilter[axis] || []).slice();
    var at = values.indexOf(value);
    if (at === -1) values.push(value); else values.splice(at, 1);
    if (values.length) state.tagFilter[axis] = values; else delete state.tagFilter[axis];
    navigate(render);
  }

  function onNavStack(stackId) {
    selectStack(stackId);
    hideCrop();
    navigate(render);
  }

  // The kinematic section's two rows (views/nav.js's kinematicSection). A
  // study row opens its page; the model row opens the 3D scene in sweep mode
  // on the topology's newest run -- the flyout where the mount probe passed,
  // the annotator in a new tab where it did not (file://, a server without the
  // sibling mount). It does not change what this page shows: the 3D scene IS
  // the model, and there is no page of it here to switch to.
  // A kinematic study's page draws its topology's model with the study's
  // lit set emphasized, so arriving on it from the same topology is a
  // respine like a chain study's (the walk stays; the emphasis moves).
  function onNavKinematic(studyId) {
    selectKinematic(studyId);
    hideCrop();
    redrivePaneAfter(respine);
  }

  function onNavKinematicModel(topologyId, runId) {
    var params = { topologyId: topologyId, sweep: runId };
    if (state.annotateMount) {
      launchAnnotate(params);
    } else if (typeof window.open === "function") {
      window.open(VA.annotateLink(params), "_blank", "noopener");
    }
  }

  // A contributor row on the kinematic page selects its edge IN PLACE
  // (2026-10-26): the page stays the kinematic study, the DAG beside it
  // marks the edge, and the preview pane shows its citation and crop. The
  // row's own href is still the `?topology=<id>&edge=<id>` deep link, for a
  // reader who opens it in a new tab. With the 3D pane open the scene stays
  // in sweep mode and the edge is highlighted there (followSelection).
  function onKinematicEdge(topologyId, edgeId) {
    if (topologyId !== state.topologyId) return;
    hideCrop();
    selectElement("edge", edgeId);
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
  //
  // In topology mode that is VA.worksheetSubject rather than the topology
  // itself: the selected study's stack when its chain re-expresses one (its
  // authored sheet lives nowhere else since the fold), otherwise the topology.
  // One function, read by both the fetch below and the toggle in paint(), so
  // the button and the dialog can never disagree about which sheet the page is
  // offering.
  function worksheetSubject() {
    if (state.mode === "kinematic") return null;
    return state.mode === "topology"
      ? VA.worksheetSubject(currentTopology(), currentStudy())
      : currentStack();
  }

  function loadWorksheet() {
    var segments = VA.worksheetSegments(worksheetSubject());
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
    // Both topology-shaped pages select topology elements; stack mode its rows.
    if (state.mode !== "stack") {
      var selection = state.selection;
      if (!selection || selection.kind !== "edge") return Promise.resolve();
      var edge = VA.topologyIndex(currentTopology()).edges[selection.id];
      if (!edge || !edge.crop_key) return Promise.resolve();
      entry = VA.cropForKey(state.crops, edge.crop_key);
    } else {
      var stackProj = currentStack();
      // A material row resolves to no crop entry here and that is correct:
      // the crop index is keyed by {stack, element}, and a material entry
      // cites a workbook or a drawing note, never a dimension.
      if (!stackProj || !state.selectedRowId) return Promise.resolve();
      entry = VA.cropFor(state.crops, stackProj.id, state.selectedRowId);
    }
    if (entry.status !== "resolved" || !entry.png) return Promise.resolve();
    // A balloon crop names a SECOND image, its parts-list row (the crop index's
    // `companion`), so the pane's fetch is a list rather than one blob. It is
    // awaited alongside the crop: a companion that arrived a paint later would
    // show the pane's "image not on disk" line for an instant on every
    // selection.
    var pngs = [entry.png];
    if (entry.companion && entry.companion.png) pngs.push(entry.companion.png);
    return Promise.all(pngs.map(cacheCropImage)).then(function () {
      state.detailImage = imageCache[entry.png] || null;
    });
  }

  // One PNG into `imageCache`, at most once. A fetch that fails caches `null`,
  // which is the same thing the surfaces read as "no image" — never a retry
  // loop on every repaint.
  function cacheCropImage(png) {
    if (Object.prototype.hasOwnProperty.call(imageCache, png)) {
      return Promise.resolve(imageCache[png]);
    }
    return adapter.readCropImage(png).then(function (image) {
      imageCache[png] = image;
      return image;
    }).catch(function () {
      imageCache[png] = null;
      return null;
    });
  }

  // --- crops: the hover/click popover, shared by both modes' triggers -------
  //
  // Ported verbatim from the retired stack viewer's app.js: every crop-trigger
  // button in this app now — the topology grid's thumbnail (views/topology.js)
  // and the stack view's row trigger (views/stack.js) alike — calls
  // `ctx.onCropShow` / `handlers.onCropShow`, which is this function either way.

  function showCrop(entry, trigger) {
    if (defer(trigger, function () { showCrop(entry, trigger); })) return;
    cancelDeferred();
    openTrigger = trigger;
    openedAt = new Date().getTime();
    var painted = false;
    var paint = function (image) {
      if (openTrigger !== trigger) return;   // a later hover won the race
      VA.renderCrop(nodes.crop, entry, image, VA.CONFIG, hideCrop, imageCache);
      // display first, then measure: offsetHeight is 0 while display is none.
      nodes.crop.style.display = "block";
      // The FIRST placement is unconditional -- the popover has just appeared
      // and has nowhere to be moved from. Every repaint after it is a
      // re-place, and goes through the guards.
      if (painted) replace(trigger); else position(nodes.crop, trigger);
      painted = true;
      // aspect-ratio already reserved the height, but OFFER a re-place once
      // the PNG has settled either way -- a broken image also changes the box.
      // Offer, not do: replace() decides, and declines while the pointer is on
      // the card.
      var img = nodes.crop.querySelector ? nodes.crop.querySelector("img") : null;
      if (img) {
        img.onload = function () { replace(trigger); };
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
    // The companion (a balloon crop's parts-list row) is fetched alongside, and
    // each arrival repaints — the same "paint once, repaint as PNGs land" shape
    // showCard below uses, and for the same reason: this popover can name two
    // images now.
    var pngs = [entry.png];
    if (entry.companion && entry.companion.png) pngs.push(entry.companion.png);
    pngs.forEach(function (png) {
      cacheCropImage(png).then(function () { paint(imageCache[entry.png]); });
    });
  }

  function hideCrop() {
    cancelDeferred();
    openTrigger = null;
    nodes.crop.style.display = "none";
  }

  // --- reaching an open popover with the mouse (deliverable 4) --------------
  //
  // Jeff, 2026-09-16: "sometimes the preview pop-up disappears when you try to
  // move the mouse over it, you have to do it just right." Nothing here closes
  // a popover on mouseleave -- see the design note in views/stack.js's
  // cropTrigger, where closing on leave was tried and rejected in 2026-08 --
  // so what the reader was seeing was the card being REPLACED by a trigger
  // crossed on the way to it, or MOVED by a late image. Both are fixed here;
  // the corridor arithmetic itself is VA.pointerHeadsFor (viewer.js), which is
  // where the reasoning and the two constants live.
  //
  // `defer` returns true when the caller should stand down for now. It never
  // drops the open: if the pointer has not reached the card by
  // VA.HOVER_INTENT_MS, the held trigger opens after all, so the worst case of
  // a wrong guess is a card a quarter-second late.

  function cardBox() {
    if (!nodes.crop || !nodes.crop.getBoundingClientRect) return null;
    if (nodes.crop.style.display === "none") return null;
    var box = nodes.crop.getBoundingClientRect();
    return box && box.width ? box : null;
  }

  function cancelDeferred() {
    if (!deferredOpen) return;
    if (deferredOpen.timer && typeof clearTimeout === "function") {
      clearTimeout(deferredOpen.timer);
    }
    deferredOpen = null;
  }

  function defer(trigger, run) {
    // An EXPIRY is the one caller that must never be deferred again, and
    // getting this wrong is not a lost quarter-second -- it is the card never
    // arriving at all (review, 2026-09-16, measured at 4.4s and counting).
    // `held.run()` re-enters showCard/showCrop, which calls straight back into
    // here; `pointerWas`/`pointerAt` are written ONLY by mousemove, so a reader
    // who crossed the trigger and then held still is still carrying the vector
    // that aimed at the open card, and the corridor test would hold the same
    // trigger again, and again. The token is cleared on the way through so it
    // covers exactly one call.
    if (expiring === trigger) {
      expiring = null;
      return false;
    }
    if (!openTrigger || openTrigger === trigger) return false;
    var box = cardBox();
    if (!box) return false;
    if (!VA.pointerHeadsFor(pointerWas, pointerAt, box)) return false;
    if (deferredOpen && deferredOpen.trigger === trigger) return true;
    cancelDeferred();
    var held = { trigger: trigger, run: run, timer: null };
    deferredOpen = held;
    held.timer = setTimeout(function () {
      if (deferredOpen !== held) return;
      deferredOpen = null;
      // The pointer never arrived. Honour the trigger it crossed -- but only
      // while it is still ON it, or a pointer that moved on somewhere else
      // entirely would be handed a card it has left behind.
      if (VA.pointerInside(pointerAt, cardBox())) return;
      var rect = held.trigger.getBoundingClientRect
        ? held.trigger.getBoundingClientRect() : null;
      if (rect && !VA.pointerInside(pointerAt, rect)) return;
      expiring = held.trigger;
      try {
        held.run();
      } finally {
        // Cleared here as well as in defer(), for the path where run() returns
        // before reaching it (a null card, a trigger that has been re-rendered
        // out from under the timer). A token left set would wave the NEXT
        // hover of that same trigger straight past the corridor.
        expiring = null;
      }
    }, VA.HOVER_INTENT_MS);
    return true;
  }

  // Re-place the open popover once one of its images has settled -- but only
  // when it actually needs re-placing. The decision is VA.popoverShouldMove
  // (viewer.js), which is where both guards and their reasoning live; this is
  // the wiring.
  //
  // EVERY re-place after the first paint goes through here, not just the
  // `img.onload` one: showCrop and showCard both re-run their own paint() as
  // each PNG blob resolves, and that path runs on the FIRST hover of every
  // card, which is the common case. Routing only the onload half would have
  // made "a card under the reader's pointer never moves" true of the rare
  // path and false of the usual one (review, 2026-09-16).
  function replace(trigger) {
    if (!nodes.crop || nodes.crop.style.display === "none") return;
    if (!VA.popoverShouldMove(pointerAt, cardBox(),
                              nodes.crop.offsetHeight, placedHeight)) return;
    position(nodes.crop, trigger);
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
      if (!entry || entry.status !== "resolved") return;
      [entry.png, entry.companion && entry.companion.png].forEach(function (png) {
        if (png && pngs.indexOf(png) === -1) pngs.push(png);
      });
    };
    (card.crops || []).forEach(function (crop) { add(crop.entry); });
    (card.thumbs || []).forEach(function (thumb) { add(thumb.entry); });
    // A node card names one thumbnail per side (viewer_dag_hover_cards) --
    // the adjacent parts' own component thumbnails, so a boundary dot fetches
    // two PNGs and an internal one fetches at most one.
    (card.sides || []).forEach(function (side) {
      if (side.thumb) add(side.thumb.entry);
    });
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
    if (defer(trigger, function () { showCard(card, trigger); })) return;
    cancelDeferred();
    openTrigger = trigger;
    openedAt = new Date().getTime();
    var painted = false;
    var paint = function () {
      if (openTrigger !== trigger) return;   // a later hover won the race
      VA.renderHoverCard(nodes.crop, card, imageCache, VA.CONFIG, hideCrop,
        { mount: state.annotateMount, onAnnotate: onCardAnnotate });
      nodes.crop.style.display = "block";
      // First placement unconditional, every repaint through the guards --
      // see showCrop above, and replace().
      if (painted) replace(trigger); else position(nodes.crop, trigger);
      painted = true;
      // Offer a re-place once each PNG settles either way -- same reasoning,
      // and the same guards, as showCrop's single-image version.
      var imgs = nodes.crop.querySelectorAll ? nodes.crop.querySelectorAll("img") : [];
      Array.prototype.forEach.call(imgs, function (img) {
        img.onload = function () { replace(trigger); };
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
    // The height this placement was computed FOR, so replace() can tell a box
    // that grew under a settling PNG from one that is exactly as measured.
    placedHeight = pop.offsetHeight || height;
  }

  // --- the 3D pane (study_3d_flyout; a pane since 2026-10-20) ---------------
  //
  // One iframe, created lazily on the first launch and KEPT across launches:
  // the annotator's folder grant, loaded meshes and camera are session state
  // worth preserving, so a later launch drives the open panel over
  // postMessage -> AA.exec (the annotator's own command vocabulary, the same
  // verbs the boot URL's params run) instead of reloading it. Only reachable
  // when the boot-time probe found ../annotate/ served beside this page;
  // everywhere else the views render the pre-flyout links and none of this
  // runs.
  //
  // Since handoff the_3d_pane_opens_in_the_mode_the_study_wants it is a PANE:
  // once open it stays open across the page's own navigation and FOLLOWS the
  // selection (followSelection, after every paint), through the one rule
  // VA.annotateParamsFor -- a kinematic study opens sweep mode on its run, a
  // chain study or an edge the goto its row would post. Open/closed and the
  // width are remembered per browser.
  var flyoutFrame = null;
  var flyoutLoaded = false;
  // The selection the open pane was last driven to, serialised, so a paint
  // that changed nothing the pane cares about posts nothing. null while the
  // pane is closed: reopening always re-drives.
  var paneFollowed = null;
  // The width the reader last chose for the pane (a drag, or the remembered
  // one at boot), or null for the stylesheet's -- what refitPane fits to each
  // page, as against state.flyoutWidth, which is what the current page allows.
  var flyoutWanted = null;

  function currentAnnotateParams() {
    return VA.annotateParamsFor({
      mode: state.mode,
      topologyId: state.topologyId,
      studyId: state.studyId,
      selection: state.selection,
      kinematicStudy: state.mode === "kinematic"
        ? VA.findKinematicStudy(state.kinematic, state.kinematicId) : null,
    });
  }

  function paramsKey(params) {
    return params ? JSON.stringify(params) : "";
  }

  // The seam's tab, and a pane the reader left open reopening after a
  // reload: open on the current selection, no row needed.
  function openPane() {
    launchAnnotate(currentAnnotateParams());
  }

  // After every paint: an open pane follows a selection that moved.
  //
  // A study row the reader clicks re-drives the pane even when its params did
  // not change (`forcePaneFollow`): the pane may have left the selection by a
  // gesture of its own, and the page beside it is always a way back.
  var forcePaneFollow = false;

  function followSelection() {
    var forced = forcePaneFollow;
    forcePaneFollow = false;
    if (!nodes.flyout || !nodes.flyout.open || !state.annotateMount) return;
    var params = currentAnnotateParams();
    var key = paramsKey(params);
    if (key !== paneFollowed || forced) {
      paneFollowed = key;
      if (params) drivePane(params);
      refitPane();
    }
    // On a kinematic page the scene stays in sweep mode whatever is selected
    // (VA.annotateParamsFor keeps returning the sweep), and a selected edge
    // is HIGHLIGHTED there instead: the same `highlight` a hover posts, never
    // a `goto`, which would take the scene out of the sweep.
    if (state.mode === "kinematic") schedulePaneHover(selectedPaneTarget());
  }

  // The edge a kinematic page has selected, as a hover target: what the
  // scene shows highlighted while the pointer rests on nothing in particular.
  function selectedPaneTarget() {
    if (state.mode !== "kinematic" || !state.selection ||
        state.selection.kind !== "edge") return null;
    return { topologyId: state.topologyId, edgeId: state.selection.id };
  }

  // The page under a pane that stays changes shape -- a stack page has no
  // DAG, a chain or kinematic study has one and a drawing -- so the pane's
  // width is re-fitted to the new page from the width the reader CHOSE, not
  // from whatever the last page squeezed it to. Not remembered: a width the
  // layout imposed is not a preference (the same rule launchAnnotate keeps).
  function refitPane() {
    state.flyoutWidth = VA.clampFlyoutWidth(
      flyoutWanted !== null ? flyoutWanted : flyoutWidthNow(),
      roomBesideFlyout(), graphNeed());
    applyFlyoutWidth();
  }

  // `params` null (a stack page asks the pane for nothing) opens the annotator
  // on no element at all.
  function launchAnnotate(params) {
    if (!state.annotateMount) return;
    dropBandPad();
    // An explicit launch -- a row's 3D control, the model row -- is what the
    // pane shows now. The selection it was launched FROM is marked followed,
    // so the paint after it does not re-drive the pane straight back to that
    // selection's own goto.
    paneFollowed = paramsKey(currentAnnotateParams());
    drivePane(params);
    // The drawing measured BEFORE the page shifts, so `keep` is this study's
    // own rails width and not a width taken after the pane narrowed under them.
    var keep = graphNeed();

    // show(), not showModal(): the page beside the panel stays clickable, so
    // the nav and every row's 3D control keep driving the open panel.
    if (!nodes.flyout.open) {
      nodes.flyout.show();
      // Closing dropped the anchors; the scene is asked for them again rather
      // than waited on, since an unchanged scene posts nothing.
      forgetSeamAnchors(true);
    }
    // The scene is a column of the page's own row, between the nav and the
    // DAG (topology.css's `body.flyout-open`); the preview pane keeps its own
    // column to the right (2026-10-28). The class comes off again in the
    // dialog's own `close` event, wired once at boot.
    document.body.classList.add("flyout-open");
    VA.writeStoredFlyoutOpen(widthStore(), true);
    syncPaneHandle();
    // The nav grows the slot the scene's tree is drawn into.
    renderNav();

    // The panel's width, clamped to the room the page can spare, EVERY time it
    // opens -- and AFTER show(), which is not a detail: a closed <dialog> is
    // `display: none`, so flyoutWidthNow() would measure 0 and fall back to
    // VA.FLYOUT_WIDTH.min, opening the first launch at the floor instead of at
    // the width the stylesheet asked for.
    //
    // topology.css declares the width it WANTS; this is what keeps that a wish
    // rather than a promise the layout cannot keep. Not remembered: a width the
    // layout imposed is not a preference the reader expressed, so
    // rememberWidth() is deliberately not called here.
    state.flyoutWidth = VA.clampFlyoutWidth(
      flyoutWanted !== null ? flyoutWanted : flyoutWidthNow(),
      roomBesideFlyout(), keep);
    applyFlyoutWidth();
  }

  // Point the pane at `params`: boot the iframe on them, re-point a document
  // still loading, or post them to a booted one.
  function drivePane(params) {
    var href = params ? VA.annotateLink(params) : VA.ANNOTATE_PAGE;
    // The iframe boots embedded (the annotator's rail is drawn in this page's
    // nav); the full-page link below keeps the plain url.
    var embedHref = VA.annotateEmbedHref(href);
    // The tree in the nav is the scene's answer about what it is showing,
    // like the head line: gone until the re-driven scene sends its own.
    sceneTree = null;
    renderSceneSlot();
    if (!flyoutFrame) {
      flyoutFrame = document.createElement("iframe");
      flyoutFrame.className = "flyout__frame";
      flyoutFrame.setAttribute("title", "3D annotation panel");
      flyoutFrame.addEventListener("load", function () {
        flyoutLoaded = true;
        // A new document: the last one's anchors are points in a scene that
        // is gone. This one posts its own after its first drawn frame.
        forgetSeamAnchors(false);
      });
      flyoutFrame.src = embedHref;
      nodes.flyout.appendChild(flyoutFrame);
    } else if (!flyoutLoaded) {
      // The iframe exists but its document is still loading, so its message
      // listener may not be registered yet and a postMessage would be lost --
      // re-point the boot URL at the new params instead.
      if (params) flyoutFrame.src = embedHref;
    } else if (params) {
      VA.annotateExecCommands(params).forEach(postToPane);
    }
    // The head line says what the ANNOTATOR reports it is showing
    // (annotate:state, wirePaneState) and nothing this page composed, so
    // until that reply lands it goes back to its resting words rather than
    // naming the subject the pane just left.
    setPaneTitle(null);
  }

  // True when the command reached a loaded frame; a hover that did not is
  // not remembered as posted, so it goes again once the pointer moves.
  function postToPane(command) {
    if (!flyoutFrame || !flyoutLoaded || !flyoutFrame.contentWindow) return false;
    flyoutFrame.contentWindow.postMessage(
      { type: "annotate:exec", command: command }, window.location.origin);
    return true;
  }

  // The seam's tab is rendered only where the pane can exist, and only while
  // it is closed: open, the divider's chevron is the way back.
  function syncPaneHandle() {
    if (!nodes.paneHandle) return;
    var open = !!(nodes.flyout && nodes.flyout.open);
    nodes.paneHandle.style.display = state.annotateMount && !open ? "" : "none";
  }

  // The annotator's status, as it says it ({type: "annotate:status", word,
  // tone, sentence}): the word beside a dot coloured by `tone`, the sentence
  // on hover. All three are the annotator's (AA.PANE_STATUS); nothing here is
  // composed.
  function setPaneStatus(msg) {
    var node = nodes.flyoutStatus;
    if (!node) return;
    node.textContent = msg.word || "";
    node.setAttribute("title", msg.sentence || "");
    node.setAttribute("data-tone", msg.tone || "");
    node.style.display = msg.word ? "" : "none";
  }

  // --- what the pane says it is showing (deliverable 4) ----------------------
  //
  // The annotator posts {type: "annotate:state", mode, topology, study, run,
  // title} after every sweep / goto / trace it completes, whoever asked for it
  // (this page, its own run picker, its console). `title` is the annotator's
  // own one line -- "Sweep — vpa pitch chunk2 p2" -- and this page prints it
  // verbatim: nothing here composes it from the viewer's state, which could
  // only disagree with what the scene actually holds (a command that failed,
  // a topology the reader kept).
  var paneTitleAtRest = null;

  function setPaneTitle(title) {
    if (!nodes.flyoutTitle) return;
    if (paneTitleAtRest === null) paneTitleAtRest = nodes.flyoutTitle.textContent;
    var text = title || paneTitleAtRest;
    nodes.flyoutTitle.textContent = text;
    // The line can be clipped by a narrow pane; the whole of it on hover.
    nodes.flyoutTitle.setAttribute("title", text);
  }

  function wirePaneState() {
    if (typeof window === "undefined" || !window.addEventListener) return;
    // Esc cancels an armed pick (a_face_is_picked_the_way_cad_picks_it) even
    // when focus is HERE -- the reader pressed Pick on a mirrored row, so the
    // keypress lands in this document and never reaches the scene's frame.
    // Armed is the annotator's own word for it: a mirrored row with a
    // pressed button. Nothing here knows the verb's meaning beyond its name.
    if (document.addEventListener) {
      document.addEventListener("keydown", function (event) {
        if (!event || event.key !== "Escape" || !sceneTree) return;
        if (VA.sceneRowsPressed(sceneTree.rows)) postToPane(["arm", "off"]);
      });
    }
    window.addEventListener("message", function (event) {
      if (!flyoutFrame || event.source !== flyoutFrame.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      var msg = event.data;
      if (msg && msg.type === "annotate:tree") {
        sceneTree = msg;
        renderSceneSlot();
        followScenePick(msg);
        return;
      }
      if (msg && msg.type === VA.SCENE_ANCHORS_MESSAGE) {
        seamAnchors = msg.nodes || {};
        scheduleSeamDraw();
        return;
      }
      if (msg && msg.type === "annotate:status") {
        setPaneStatus(msg);
        return;
      }
      if (!msg || msg.type !== "annotate:state") return;
      setPaneTitle(msg.title || null);
      // What the scene shows changed: its anchors are asked for afresh, and
      // the page keeps drawing from the last ones until they land -- they are
      // still where the scene draws its nodes.
      postToPane(["model", "anchors"]);
      // The scene has just (re)loaded what it shows: it is told the page's
      // lit set and dim-or-hide word again, whatever it was told before.
      sceneModelPosted = null;
      sceneSelectPosted = null;
      syncSceneModel();
    });
  }

  // --- the scene's tree, under the study row (the_shell_seats_the_scene_
  // beside_the_model, deliverable 3) -----------------------------------------
  //
  // The annotator, embedded, sends the rows its own rail has just rendered
  // ({type: "annotate:tree"}, app.js's postEmbedTree) and this page draws them
  // in the nav under the row the scene is showing (views/nav.js's
  // renderSceneTree). A gesture on one goes back as {type: "annotate:rail",
  // key, act, index?} and the annotator runs it on the row it mirrors -- so
  // what a row says and what it does are both the annotator's, and this page
  // keeps no copy of either. The type chips' state is the annotator's too.
  var sceneTree = null;

  function sceneRail(key, act, index) {
    if (!flyoutFrame || !flyoutLoaded || !flyoutFrame.contentWindow) return;
    var msg = { type: "annotate:rail", key: key, act: act };
    if (typeof index === "number") msg.index = index;
    flyoutFrame.contentWindow.postMessage(msg, window.location.origin);
  }

  // Which mirrored row (and which control in it) has focus, so a rebuilt
  // tree puts the keyboard back where it was.
  function sceneFocus(slot) {
    var active = typeof document !== "undefined" ? document.activeElement : null;
    if (!active || !slot.contains || !slot.contains(active)) return null;
    var row = active.closest && active.closest("[data-scene-key]");
    return row ? { key: row.getAttribute("data-scene-key"),
      part: active.getAttribute("data-scene-part") || "" } : null;
  }

  function renderSceneSlot() {
    var slot = nodes.navtree && nodes.navtree.querySelector
      ? nodes.navtree.querySelector(".navtree__scene") : null;
    if (!slot) return;
    var focus = sceneFocus(slot);
    var wasEmpty = !slot.childNodes || !slot.childNodes.length;
    VA.renderSceneTree(slot, sceneTree, { send: sceneRail });
    if (wasEmpty && sceneTree) revealSceneRow(slot);
    if (!focus) return;
    var rows = slot.querySelectorAll("[data-scene-key]");
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute("data-scene-key") !== focus.key) continue;
      var target = focus.part
        ? rows[i].querySelector('[data-scene-part="' + focus.part + '"]') : rows[i];
      if (target && target.focus) target.focus();
      break;
    }
  }

  // The tree arriving under a row the nav has scrolled away from brings
  // that row up to the top of the nav, once per arrival -- never on a
  // refresh, which would yank the reader's own scrolling back.
  function revealSceneRow(slot) {
    var nav = nodes.navtree;
    var row = slot.parentNode && slot.parentNode.firstChild;
    if (!nav || !row || !row.getBoundingClientRect || !nav.getBoundingClientRect) return;
    var n = nav.getBoundingClientRect();
    var r = row.getBoundingClientRect();
    if (r.top >= n.top && r.top <= n.top + n.height / 2) return;
    nav.scrollTop += r.top - n.top - 8;
  }

  // --- hover crosses the seam (deliverable 3) --------------------------------
  //
  // Resting the pointer on an edge -- its grid row or its rail mark on a chain
  // study, a contributor row on a kinematic study -- posts `highlight
  // <topology> <edge>`, and the annotator tints that edge's bound face;
  // resting anywhere else posts `highlight clear`. One delegated listener on
  // the document, because every one of those nodes is rebuilt by each paint.
  //
  // Debounced (VA.PANE_HOVER_DEBOUNCE_MS, trailing): a pointer sweeping down
  // a table posts nothing until it settles, and a target already posted is
  // never posted twice in a row.
  var CLEAR_KEY = VA.annotateHighlightCommand().join(" ");
  var paneHoverTimer = null;
  var paneHovered = CLEAR_KEY;

  function paneHoverTarget(node) {
    var row = node && node.closest
      ? node.closest('tr.kmrow[data-edge], [data-row-kind="edge"][data-id]') : null;
    if (!row) return null;
    var edge = row.getAttribute("data-edge");
    if (edge) {
      var study = VA.findKinematicStudy(state.kinematic, state.kinematicId);
      return { topologyId: study && study.topology, edgeId: edge };
    }
    return { topologyId: state.topologyId, edgeId: row.getAttribute("data-id") };
  }

  function schedulePaneHover(target) {
    var command = target
      ? VA.annotateHighlightCommand(target.topologyId, target.edgeId)
      : VA.annotateHighlightCommand();
    if (paneHoverTimer !== null) clearTimeout(paneHoverTimer);
    paneHoverTimer = setTimeout(function () {
      paneHoverTimer = null;
      var key = command.join(" ");
      if (key === paneHovered) return;
      if (postToPane(command)) paneHovered = key;
    }, VA.PANE_HOVER_DEBOUNCE_MS);
  }

  function clearPaneHover() {
    if (paneHoverTimer !== null) clearTimeout(paneHoverTimer);
    paneHoverTimer = null;
    paneHovered = CLEAR_KEY;
  }

  function wirePaneHover() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    document.addEventListener("mouseover", function (event) {
      if (!nodes.flyout || !nodes.flyout.open) return;
      // The scene's own tree in the nav lights its rows itself (sceneRail).
      if (event.target && event.target.closest &&
          event.target.closest(".navtree__scene")) return;
      // Resting on nothing falls back to the page's selected edge, where it
      // has one, rather than clearing the scene's highlight under it.
      schedulePaneHover(paneHoverTarget(event.target) || selectedPaneTarget());
    });
  }

  // --- the leaders across the seam (leaders_follow_the_active_study_across_
  // the_seam) -----------------------------------------------------------------
  //
  // One page-level SVG over the DAG and the scene draws a leader from each
  // node of the active study's lit set to where the scene draws that node:
  // the scene posts its anchors (`annotate:anchors`, in the iframe's own CSS
  // pixels), the pane publishes its dots (VA.lastTopoRender.seam, in the rails
  // SVG's), and this adds the two rects and draws (VA.seamLeaderGeometry).
  // Re-drawn on every anchors message, every pane paint (a respine's frames
  // included), every scroll and every resize -- one ResizeObserver, one
  // measurement of the three rects per draw, at most one draw per frame.
  //
  // The DAG↔grid leaders stay in the rails SVG they are drawn in: they share
  // that SVG's scroll exactly, and an overlay redrawn on a scroll event lags
  // a compositor-scrolled pane by a frame. What makes the two one picture is
  // the one selection rule (VA.selectedLeaderNodes) both read.
  var seamAnchors = null;
  var seamSvg = null;
  var seamFrame = null;
  var seamDraws = 0;
  // The pane's hover key (`node|<id>`, `edge|<id>`), for the lighter emphasis.
  var paneHot = null;
  // What the scene was last told, so a paint that changed nothing posts nothing.
  var sceneModelPosted = null;
  var sceneSelectPosted = null;
  // The selection the grid was last scrolled to, and the scene tree's last
  // selected row: both act on a CHANGE only.
  var seamScrolledTo = null;
  var sceneTreeSelected = null;

  function seamOverlay() {
    if (seamSvg || typeof document === "undefined" || !document.body) return seamSvg;
    seamSvg = VA.svg("svg", "seamleaders");
    seamSvg.setAttribute("aria-hidden", "true");
    document.body.appendChild(seamSvg);
    return seamSvg;
  }

  // The page's copy of the scene's anchors goes, and every DAG->3D leader
  // with it until the scene posts again -- a leader is drawn to the DAG only
  // rather than to a point the scene no longer draws. `ask`: request that
  // post now (the `model anchors` verb) instead of waiting for a frame whose
  // numbers move.
  function forgetSeamAnchors(ask) {
    seamAnchors = null;
    scheduleSeamDraw();
    if (ask) postToPane(["model", "anchors"]);
  }

  function scheduleSeamDraw() {
    if (seamFrame !== null) return;
    var raf = (typeof window !== "undefined" && window.requestAnimationFrame)
      ? window.requestAnimationFrame.bind(window)
      : function (fn) { return setTimeout(fn, 16); };
    seamFrame = raf(function () { seamFrame = null; drawSeamLeaders(); });
  }

  // The page's lit set, as the pane emphasizes it: a kinematic study's own,
  // a chain study's chain, or null (the whole walk -- no leader at all).
  function pageLitSet() {
    var topoProj = currentTopology();
    if (state.mode === "kinematic") {
      return VA.kinematicLitSet(VA.findKinematicStudy(state.kinematic, state.kinematicId),
        topoProj);
    }
    return state.mode === "topology" ? VA.studyLitSet(currentStudy(), topoProj) : null;
  }

  function drawSeamLeaders() {
    var svg = seamOverlay();
    if (!svg) return null;
    var clock = typeof performance !== "undefined" && performance.now
      ? function () { return performance.now(); } : function () { return Date.now(); };
    var started = clock();
    var drawn = VA.lastTopoRender;
    var topoProj = currentTopology();
    var rails = nodes.pane && nodes.pane.querySelector
      ? nodes.pane.querySelector(".tv__hscroll svg.tv__rails") : null;
    if (!nodes.flyout || !nodes.flyout.open || !flyoutFrame || !seamAnchors ||
        !rails || !drawn || !drawn.seam || !topoProj ||
        drawn.topologyId !== topoProj.id || nodes.pane.style.display === "none") {
      VA.clear(svg);
      VA.lastSeamDraw = null;
      return null;
    }
    // The dots are in the SVG's own pixels with the DAG's zoom already in
    // them (VA.seamDots), and the SVG itself is never scaled.
    var r = rails.getBoundingClientRect();
    var f = flyoutFrame.getBoundingClientRect();
    var p = nodes.pane.getBoundingClientRect();
    // The pinned header covers a dot only where it is painted: its table. Over
    // the rails it is transparent (topology.css, `.tv__head`), and a dot drawn
    // there is on screen and keeps its leader.
    var head = nodes.pane.querySelector(".tv__zoom .tv__head");
    var band = head && head.getAttribute("data-pinned")
      ? head.querySelector(".tvheadtable") : null;
    var bottom = typeof window !== "undefined" && window.innerHeight ? window.innerHeight : Infinity;
    var dots = {};
    Object.keys(drawn.seam.dots).forEach(function (id) {
      var d = drawn.seam.dots[id];
      dots[id] = [r.left + d[0], r.top + d[1]];
    });
    var fx = f.left + (flyoutFrame.clientLeft || 0);
    var fy = f.top + (flyoutFrame.clientTop || 0);
    var anchors = {};
    Object.keys(seamAnchors).forEach(function (id) {
      var a = seamAnchors[id];
      anchors[id] = a ? [fx + a[0], fy + a[1]] : null;
    });
    var geo = VA.seamLeaderGeometry({
      dots: dots, anchors: anchors, bendX: r.left + drawn.seam.bend,
      // Inside the pane, inside the window, and not under the pinned header.
      dotClip: { left: p.left, right: p.right, top: Math.max(p.top, 0),
                 bottom: Math.min(p.bottom, bottom) },
      dotCover: band ? rectOf(band.getBoundingClientRect()) : null,
      anchorClip: { left: f.left, right: f.right, top: Math.max(f.top, 0),
                    bottom: Math.min(f.bottom, bottom) },
    });
    var states = VA.seamLeaderStates(geo.leaders.map(function (l) { return l.id; }),
      state.selection, paneHot, VA.topologyIndex(topoProj));
    VA.renderSeamLeaders(svg, geo, states);
    seamDraws++;
    // For a harness: what was drawn, and what it cost.
    VA.lastSeamDraw = { leaders: geo.leaders, crossings: geo.crossings,
      skipped: geo.skipped, states: states, ms: clock() - started, draws: seamDraws };
    return geo;
  }

  function rectOf(r) {
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  }

  // The scene is told the page's lit set and dim-or-hide word (its `model`
  // verb), and a selected node is selected in its layer too -- an edge is
  // highlighted through the `highlight` a kinematic page already posts
  // (followSelection). Each only when it changed, and only to a loaded scene.
  function syncSceneModel() {
    if (!nodes.flyout || !nodes.flyout.open || !flyoutLoaded) return;
    var model = [VA.sceneLitCommand(pageLitSet()), ["model", "unlit", state.unlitStyle]];
    var key = JSON.stringify(model);
    if (key !== sceneModelPosted && model.every(postToPane)) sceneModelPosted = key;
    var sel = state.selection && state.selection.kind === "node"
      ? ["model", "select", "node", state.selection.id] : ["model", "select", "clear"];
    var selKey = sel.join(" ");
    if (selKey !== sceneSelectPosted && postToPane(sel)) sceneSelectPosted = selKey;
  }

  // A selection made anywhere brings its grid row into view -- an edge's own
  // row, a node's the row its DAG↔grid leader lands above -- together with the
  // element's own mark on the DAG when the two fit in the box at once, so all
  // three ends of its leaders are on screen. Only the pane's OWN scroll moves
  // (the kinematic page's bounded box), never the document's: `scrollIntoView`
  // would scroll the page too, sliding another row under a pointer that has
  // not moved, and that row's hover would take the scene's highlight off the
  // selection.
  function scrollSelectionIntoView() {
    var sel = state.selection;
    var key = sel ? sel.kind + "|" + sel.id : null;
    if (key === seamScrolledTo) return;
    seamScrolledTo = key;
    var box = nodes.pane;
    if (!sel || !box || !box.querySelector || !(box.scrollHeight > box.clientHeight)) return;
    var edgeId = sel.id;
    if (sel.kind === "node") {
      var leader = box.querySelector('path.rail__leaderhit[data-leader-id="' + sel.id + '"]');
      edgeId = leader ? leader.getAttribute("data-boundary-edge") : null;
    }
    var row = edgeId ? box.querySelector('tr.tvrow[data-id="' + edgeId + '"]') : null;
    if (!row || !row.getBoundingClientRect) return;
    var mark = box.querySelector('svg.tv__rails [data-row-kind="' + sel.kind + '"][data-id="' +
      sel.id + '"]');
    var b = box.getBoundingClientRect();
    var head = box.querySelector(".tv__zoom .tv__head");
    var top = b.top + (head ? head.offsetHeight : 0);
    var r = row.getBoundingClientRect();
    var lo = r.top;
    var hi = r.bottom;
    if (mark && mark.getBoundingClientRect) {
      var m = mark.getBoundingClientRect();
      if (Math.max(hi, m.bottom) - Math.min(lo, m.top) <= b.bottom - top) {
        lo = Math.min(lo, m.top);
        hi = Math.max(hi, m.bottom);
      }
    }
    if (lo < top) box.scrollTop -= top - lo;
    else if (hi > b.bottom) box.scrollTop += hi - b.bottom;
  }

  // A pick in the scene selects its row in the scene's rail, and the tree it
  // sends here marks that row: a newly selected row naming an element of this
  // page's topology selects it here (VA.sceneRowElement), so the pick and a
  // click on its contributor row arrive at the same state.
  function followScenePick(tree) {
    var found = null;
    var walk = function (rows) {
      (rows || []).forEach(function (row) {
        if (row.selected) found = row.key;
        walk(row.rows);
      });
    };
    walk(tree && tree.rows);
    if (found === sceneTreeSelected) return;
    sceneTreeSelected = found;
    var target = VA.sceneRowElement(found, currentTopology(), pageLitSet());
    if (!target || (state.selection && state.selection.kind === target.kind &&
        state.selection.id === target.id)) return;
    hideCrop();
    selectElement(target.kind, target.id);
  }

  // After every paint: the scene told, the grid row brought up, the leaders
  // re-drawn.
  function followSeam() {
    syncSceneModel();
    scrollSelectionIntoView();
    scheduleSeamDraw();
  }

  // --- the DAG's zoom (the_dag_is_zoomable_and_a_length_mode_draws_to_scale) --
  //
  // One scale, VA.applyTopoZoom, with the page scrolling it into place: the
  // wheel over the DRAWING zooms about the pointer (a plain wheel over the grid
  // still scrolls the page -- the document is the scroller, and a pane that
  // swallowed every wheel would trap the reader), Ctrl/Cmd+wheel and a trackpad
  // pinch zoom from anywhere over the pane, a drag on the drawing's empty
  // space pans, Fit shows what is lit, and `0` is Fit. The scale lives in
  // `state.dagZoom` and nowhere else.
  function paneScroller() {
    return nodes.pane && nodes.pane.classList &&
      nodes.pane.classList.contains("tv__scroll--bounded") ? nodes.pane : null;
  }

  function paneHscroll() {
    return nodes.pane && nodes.pane.querySelector
      ? nodes.pane.querySelector(".tv__hscroll") : null;
  }

  // Scroll the page (or the bounded pane) by `dy`, and the drawing sideways by
  // `dx`. The one place a pan or a zoom's compensation moves anything.
  function scrollDag(dx, dy) {
    var hscroll = paneHscroll();
    if (hscroll && dx) hscroll.scrollLeft += dx;
    var bounded = paneScroller();
    if (bounded) bounded.scrollTop += dy;
    else if (dy && typeof window !== "undefined" && window.scrollBy) window.scrollBy(0, dy);
  }

  function zoomBox() {
    return nodes.pane && nodes.pane.querySelector
      ? nodes.pane.querySelector(".tv__zoom") : null;
  }

  // Zoom to `to`, keeping the content point under (clientX, clientY) where it
  // is. The content coordinate under the pointer is read BEFORE the scale
  // changes and put back after, on both axes.
  function zoomDagAt(to, clientX, clientY) {
    var box = zoomBox();
    var hscroll = paneHscroll();
    if (!box || !hscroll) return;
    var from = state.dagZoom;
    to = VA.clampDagZoom(to);
    if (to === from) return;
    var before = box.getBoundingClientRect();
    var cy = (clientY - before.top) / from;
    state.dagZoom = to;
    // A zoom repaints the pane (VA.applyTopoZoom), so the box is re-read.
    VA.applyTopoZoom(nodes.pane, to, true);
    var after = (zoomBox() || box).getBoundingClientRect();
    // A zoom moves nothing the reader did not (the_wheel_the_column_and_fit_
    // behave). The page's own scroll is never touched: a wheel is the reader's
    // hand on the DRAWING, and a page that slides under it is the page being
    // scrolled by the wheel. Sideways, the grid keeps the content at the pane's
    // left edge -- anchoring on the pointer scrolled the grid UNDER the sticky
    // rails, which is how COMPONENT came to sit beneath the DAG. Since
    // 2026-10-29 the grid is not scaled at all, so its sideways scroll stays
    // exactly where it was (the repaint carries it). Only the bounded pane, a
    // scrollport of its own, keeps the point under the pointer.
    scrollDag(0, paneScroller() ? after.top + cy * to - clientY : 0);
    VA.pinTopoHead(nodes.pane);
    scheduleSeamDraw();
  }

  // Fit: the scale at which the lit set (the whole walk where nothing is lit)
  // fills the visible pane, never past 1, and the page scrolled so it starts
  // at the visible top. One step, from wherever the reader is. The control
  // and the key also go back to the drawing's left edge; the framing a study
  // arrival does (`keepSideways`) leaves the reader's sideways scroll where
  // it was, as every other re-paint of this pane does.
  function fitDag() { fitDagTo(false, false); }

  // `centre` is a study arrival's landing (the centre branch of fitDagTo); `keepSideways`
  // is the older framing that only leaves the sideways scroll alone.
  // The pad was worked out for one pane and window size; at another (a flyout
  // opening, a resize) it would push the drawing off-centre the other way, so
  // it is only drawn at the size it was made for.
  function padKey() {
    return [nodes.pane ? nodes.pane.clientWidth : 0,
      typeof window !== "undefined" ? window.innerHeight : 0].join("x");
  }

  function livePad() {
    return state.bandPad && state.bandPad.key === padKey() ? state.bandPad : null;
  }

  // The pane's width is about to change under the pad (the scene opening or
  // closing beside it): the landing was centred for the old one, so it goes.
  function dropBandPad() {
    state.bandPad = null;
    var sizer = zoomBox() && zoomBox().parentNode;
    if (sizer && sizer.style) {
      sizer.style.marginTop = "";
      sizer.style.marginLeft = "";
    }
  }

  function fitDagTo(keepSideways, centre) {
    var box = zoomBox();
    var hscroll = paneHscroll();
    var drawn = VA.lastTopoRender;
    if (!box || !hscroll || !drawn || !drawn.span || !box.getBoundingClientRect) return;
    var bounded = paneScroller();
    var bar = typeof document !== "undefined" ? document.querySelector(".topbar") : null;
    var topEdge = bounded ? nodes.pane.getBoundingClientRect().top
      : (bar ? bar.getBoundingClientRect().bottom : 0);
    var visible = bounded ? nodes.pane.clientHeight
      : (typeof window !== "undefined" ? window.innerHeight : 0) - topEdge;
    var pad = 12;
    // The DAG's lit span: only the DAG scales (2026-10-29), so the grid
    // beside it is not part of what a scale can fit.
    var to = VA.dagFitScale(drawn.span.top, drawn.span.bottom, visible, pad);
    // Both axes: the DAG's own width must fit the pane too, beside the jog
    // zone, which keeps its width at every zoom.
    if (drawn.dagWidth > 0 && hscroll.clientWidth > 0) {
      to = Math.min(to, VA.clampDagZoom(
        (hscroll.clientWidth - pad - (drawn.zoneWidth || 0)) / drawn.dagWidth));
    }
    // A study's arrival only ever scales DOWN, and only when the band does not
    // fit at the zoom the reader has: a zoom they chose is theirs until the
    // next study change moves the band.
    if (centre) to = Math.min(to, state.dagZoom);
    state.dagZoom = to;
    VA.applyTopoZoom(nodes.pane, to, true);
    // A zoom repaints the pane: the box and the span are read off the new one.
    box = zoomBox();
    hscroll = paneHscroll();
    drawn = VA.lastTopoRender;
    if (!box || !hscroll || !drawn || !drawn.span) return;
    var rect = box.getBoundingClientRect();
    var spanAt = drawn.span.at(to);
    if (!centre) {
      scrollDag(keepSideways ? 0 : -hscroll.scrollLeft,
        rect.top + spanAt.top - pad * to - topEdge);
    } else {
      // Centre the band's own box in the visible window, both axes. The page
      // clamps what it cannot reach (a band near the top of a short drawing),
      // so the centre is as close as the page's own extents allow.
      var hr = hscroll.getBoundingClientRect();
      var bandOffset = function () {
        var r = box.getBoundingClientRect();
        var dx = 0;
        var dyBand = r.top + (spanAt.top + spanAt.bottom) / 2;
        var bars = box.querySelectorAll ? box.querySelectorAll("line.rail__bar--on") : [];
        if (bars.length) {
          var x1 = Infinity, x2 = -Infinity, y1 = Infinity, y2 = -Infinity;
          for (var i = 0; i < bars.length; i++) {
            var br = bars[i].getBoundingClientRect();
            x1 = Math.min(x1, br.left); x2 = Math.max(x2, br.right);
            y1 = Math.min(y1, br.top); y2 = Math.max(y2, br.bottom);
          }
          dx = (x1 + x2) / 2 - (hr.left + hr.width / 2);
          dyBand = (y1 + y2) / 2;
        }
        return { dx: dx, dy: dyBand - (topEdge + visible / 2) };
      };
      // A reader parked sideways stays where they are (the 10-28 contract,
      // carried across a respine): only the vertical half centres for them.
      var parked = hscroll.scrollLeft > 0;
      var off = bandOffset();
      scrollDag(parked ? 0 : off.dx, off.dy);
      // Whatever the scroll could not reach -- a band that sits above or left
      // of the centre with nothing further to scroll back to -- is taken up by
      // space before the drawing. It is kept in state.bandPad so a repaint
      // redraws it; the next study change drops it.
      off = bandOffset();
      var sizer = box.parentNode;
      var top = off.dy < -0.5 ? -off.dy : 0;
      var left = !parked && off.dx < -0.5 ? -off.dx : 0;
      state.bandPad = { top: top, left: left, key: padKey() };
      state.landed = true;
      if (sizer && sizer.style) {
        if (top) sizer.style.marginTop = top + "px";
        if (left) sizer.style.marginLeft = left + "px";
      }
    }
    VA.pinTopoHead(nodes.pane);
    scheduleSeamDraw();
  }

  // Wired once per pane element and once per document: a harness that boots
  // the page a second time (every real-data probe does, to install fixtures)
  // would otherwise stack a second copy of each listener on the same node, and
  // one wheel notch would zoom two steps and one drag pan twice as far.
  var zoomWiredOn = null;
  var zoomKeyWired = false;

  function wireZoom() {
    if (typeof window === "undefined" || !nodes.pane || !nodes.pane.addEventListener) return;
    if (zoomWiredOn === nodes.pane) return;
    zoomWiredOn = nodes.pane;
    nodes.pane.addEventListener("wheel", function (event) {
      var onDrawing = event.target && event.target.closest &&
        event.target.closest("svg.tv__rails");
      if (!onDrawing && !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      zoomDagAt(VA.dagZoomAfterWheel(state.dagZoom, event.deltaY),
        event.clientX, event.clientY);
    }, { passive: false });
    // Pan: a drag that starts on the drawing's own empty space -- the SVG, its
    // alternating bands and its body fields, never a bar, dot or leader, which
    // are the controls.
    var drag = null;
    nodes.pane.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !event.target || !event.target.closest) return;
      var t = event.target;
      var empty = t.tagName === "svg" || (t.classList && (
        t.classList.contains("rail__band") || t.classList.contains("tv__bodyfield") ||
        t.classList.contains("tv__studyfield")));
      if (!empty || !t.closest("svg.tv__rails")) return;
      drag = { x: event.clientX, y: event.clientY };
      nodes.pane.classList.add("tv__scroll--zoomgrab");
      if (nodes.pane.setPointerCapture) {
        try { nodes.pane.setPointerCapture(event.pointerId); } catch (err) { /* synthetic */ }
      }
    });
    nodes.pane.addEventListener("pointermove", function (event) {
      if (!drag) return;
      scrollDag(drag.x - event.clientX, drag.y - event.clientY);
      drag = { x: event.clientX, y: event.clientY };
    });
    var release = function () {
      drag = null;
      if (nodes.pane.classList) nodes.pane.classList.remove("tv__scroll--zoomgrab");
    };
    nodes.pane.addEventListener("pointerup", release);
    nodes.pane.addEventListener("pointercancel", release);
    if (zoomKeyWired) return;
    zoomKeyWired = true;
    document.addEventListener("keydown", function (event) {
      if (event.key !== "0" || event.ctrlKey || event.metaKey || event.altKey) return;
      var t = event.target;
      var tag = t && t.tagName ? t.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea" || tag === "select" ||
          (t && t.isContentEditable)) return;
      fitDag();
    });
  }

  function wireSeam() {
    if (typeof window === "undefined" || !document.addEventListener) return;
    // The pane's own scroll as well as the page's: captured, since a scroll
    // does not bubble.
    // The grid header's pin is written in the same event, before the frame
    // paints (VA.pinTopoHead), so it never trails the rows it labels.
    document.addEventListener("scroll", function () {
      if (nodes.pane) VA.pinTopoHead(nodes.pane);
      scheduleSeamDraw();
    }, true);
    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(scheduleSeamDraw);
      [nodes.pane, nodes.flyout, document.documentElement].forEach(function (n) {
        if (n) observer.observe(n);
      });
    } else {
      window.addEventListener("resize", scheduleSeamDraw);
    }
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

  // localStorage, or null where there is none to have (the node fast tier's
  // DOM shim, a browser with storage disabled, a file:// page in a
  // configuration that throws on access). Reaching for it is wrapped here as
  // well as inside the read/write pair: on some file:// configurations even
  // TOUCHING window.localStorage throws, which is before either of those
  // functions gets a chance to catch anything.
  //
  // Shared by both remembered widths (the preview pane's, the flyout's); the
  // KEYS are the pure layer's, one per control.
  function widthStore() {
    try {
      return (typeof window !== "undefined" && window.localStorage) || null;
    } catch (err) {
      return null;
    }
  }

  // The remembered width onto the pane, or nothing at all -- an unset
  // `detailWidth` must leave the stylesheet's own width standing rather than
  // overwrite it with a number this file guessed.
  function applyPaneWidth() {
    if (!nodes.detail || state.detailWidth === null) return;
    nodes.detail.style.width = state.detailWidth + "px";
  }

  // The remembered nav width onto the nav, fitted to the window it is shown
  // in (VA.clampNavWidth's half-window cap) -- or nothing, leaving the
  // stylesheet's width standing.
  function applyNavWidth() {
    if (!nodes.navtree || state.navWidth === null) return;
    var room = (typeof window !== "undefined" && window.innerWidth) || 0;
    nodes.navtree.style.width = VA.clampNavWidth(state.navWidth, room) + "px";
  }

  function navWidthNow() {
    var measured = nodes.navtree && nodes.navtree.offsetWidth;
    if (typeof measured === "number" && measured > 0) return measured;
    if (state.navWidth !== null) return state.navWidth;
    return VA.NAV_WIDTH.min;
  }

  // What a drag on the divider measures FROM. In a browser the pane's own
  // laid-out width, which is what makes the first drag continuous with
  // whatever the stylesheet declared; the remembered width where there is one;
  // and the clamp's minimum in the DOM shim, which has no layout to measure.
  function paneWidthNow() {
    var measured = nodes.detail && nodes.detail.offsetWidth;
    if (typeof measured === "number" && measured > 0) return measured;
    if (state.detailWidth !== null) return state.detailWidth;
    return VA.TOPO_PANE_WIDTH.min;
  }

  // The divider is static markup (topology.html), so it is wired once at boot
  // rather than per render -- which also means a re-render mid-drag cannot
  // destroy the node the gesture started on, the problem the column grip's own
  // re-focus dance exists to work around. Both dividers on this page (the
  // preview pane's, the flyout's) are that shape, so they share one wiring
  // function and differ only in the spec they carry.
  function wireDivider(divider, spec) {
    if (!divider) return;
    divider.onpointerdown = function (event) {
      if (event && event.preventDefault) event.preventDefault();
      onResizeStart(spec, event);
    };
    divider.onkeydown = function (event) {
      var key = event && event.key;
      if (key !== "ArrowLeft" && key !== "ArrowRight") return;
      if (event.preventDefault) event.preventDefault();
      onResizeNudge(spec, (event.shiftKey ? 40 : 8) * (key === "ArrowRight" ? 1 : -1));
    };
  }

  function wireDetailDivider() {
    wireDivider(nodes.detailDivider, { kind: "pane" });
  }

  function wireFlyoutDivider() {
    wireDivider(nodes.flyoutDivider, { kind: "flyout" });
  }

  // How much window there is to divide between the flyout and THE DAG -- the
  // viewport less whatever the preview pane is currently taking, because the
  // right-hand edge of this page is that pane and the flyout is not competing
  // with it for the reader's attention. VA.clampFlyoutWidth reserves a strip of
  // this, which is what makes the reserve give back graph rather than pane.
  //
  // Read at the moment of the gesture, never cached: BOTH terms move (a reader
  // can resize the window, and the pane has its own divider), so a remembered
  // number would be honest only until either one was touched. 0 where there is
  // nothing to measure (the DOM shim), which the clamp reads as "no layout to
  // go on" and answers with its px max.
  // The width the panel and the page's own content are dividing: the window,
  // less what sits to the RIGHT of the graph (the preview pane, where it has
  // not stood down for the scene) and less the nav, which sits LEFT of the
  // scene since 2026-10-26 (the_shell_seats_the_scene_beside_the_model) and
  // whose width is not the scene's to take.
  //
  // Deliberately reads neither the panel nor the page shift, so there is no
  // circularity: every term it does read (the window, the preview pane, the
  // rail) is independent of how wide the panel is.
  function roomBesideFlyout() {
    var room = (typeof window !== "undefined" && window.innerWidth) || 0;
    if (!room) return 0;
    var taken = 0;
    [nodes.detail, nodes.detailDivider, nodes.navtree].forEach(function (node) {
      var w = node && node.offsetWidth;
      if (typeof w === "number" && w > 0) taken += w;
    });
    return Math.max(0, room - taken);
  }

  // How much of that has to be left for the page: the DAG DRAWING's own width.
  //
  // `svg.tv__rails` and not `#topopane`, and that distinction is the whole of
  // the review's blocker (2026-09-16). `#topopane` is the drawing's horizontal
  // scrollport; the drawing is the SVG pinned at its left edge, 90-262px wide
  // across the live studies, `position: sticky; left: 0` so no scroll position
  // can bring it out from under anything. Measuring the scrollport reported
  // 300px of clearance over a diagram that was 100% covered.
  //
  // 0 where nothing is drawn -- stack mode, a pre-layout call -- which
  // VA.clampFlyoutWidth reads as "nothing measured" and answers with its own
  // floor.
  function graphNeed() {
    var rails = nodes.pane && nodes.pane.querySelector
      ? nodes.pane.querySelector("svg.tv__rails") : null;
    var box = rails && rails.getBoundingClientRect
      ? rails.getBoundingClientRect() : null;
    return box && box.width > 0 ? Math.round(box.width) : 0;
  }

  // The remembered flyout width onto the dialog, or nothing at all -- same
  // contract as applyPaneWidth: an unset preference leaves the stylesheet's
  // own width standing rather than overwriting it with a number from JS.
  function applyFlyoutWidth() {
    if (!nodes.flyout || state.flyoutWidth === null) return;
    nodes.flyout.style.width = state.flyoutWidth + "px";
  }

  // What a drag on the flyout's divider measures FROM -- the same three-way
  // fallback paneWidthNow uses, and for the same reasons.
  function flyoutWidthNow() {
    var measured = nodes.flyout && nodes.flyout.offsetWidth;
    if (typeof measured === "number" && measured > 0) return measured;
    if (state.flyoutWidth !== null) return state.flyoutWidth;
    return VA.FLYOUT_WIDTH.min;
  }

  function resizeFrom(spec) {
    if (spec && spec.kind === "pane") {
      return { kind: "pane", width: paneWidthNow() };
    }
    if (spec && spec.kind === "flyout") {
      return { kind: "flyout", width: flyoutWidthNow() };
    }
    if (spec && spec.kind === "nav") {
      return { kind: "nav", width: navWidthNow() };
    }
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
    } else if (from.kind === "pane") {
      // The sign inversion (the pane is RIGHT of its divider) is
      // VA.paneWidthAfterDrag's, not this shell's -- same division of labour
      // as the other two branches. Applied to the node immediately rather
      // than waiting for the render this drag schedules: the pane's width is
      // pure layout, and moving it a frame early is what makes the drag feel
      // attached to the pointer even while a big topology repaints.
      state.detailWidth = VA.paneWidthAfterDrag(from.width, dx);
      applyPaneWidth();
    } else if (from.kind === "flyout") {
      // The OPPOSITE sign inversion to the pane's, and for the same structural
      // reason: this panel is LEFT of its divider, so dragging right widens it.
      // Both live in the pure layer (VA.flyoutWidthAfterDrag), not here.
      state.flyoutWidth = VA.flyoutWidthAfterDrag(from.width, dx, roomBesideFlyout(), graphNeed());
      applyFlyoutWidth();
    } else if (from.kind === "nav") {
      // LEFT of its divider, like the flyout: dragging right widens it.
      state.navWidth = VA.navWidthAfterDrag(from.width, dx,
        (typeof window !== "undefined" && window.innerWidth) || 0);
      applyNavWidth();
    }
  }

  // Does a resize of this kind change what the PAGE paints? The pane and the
  // grid's columns do -- they are part of the page's own layout, and the pane's
  // content is re-serialised at its new width. The flyout does not: it is a
  // position: fixed dialog whose only child is an iframe, so a repaint of the
  // DAG on every pointermove of its seam would be a full SVG rebuild per frame
  // for no visible difference.
  function resizeRepaints(kind) {
    return kind !== "flyout";
  }

  function onResizeStart(spec, event) {
    var from = resizeFrom(spec);
    var startX = event && typeof event.clientX === "number" ? event.clientX : 0;
    var move = function (ev) {
      applyResize(from, ev.clientX - startX);
      if (resizeRepaints(from.kind)) scheduleResizePaint();
    };
    var end = function () {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      document.body.classList.remove("tv-resizing");
      rememberWidth(spec);
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
    if (resizeRepaints(spec.kind)) render();
    rememberWidth(spec);
    // Both dividers are static markup and survive a render, so each keeps its
    // own focus and needs none of what follows -- which exists because
    // render() rebuilds the column header and destroys the grip the keydown
    // came from.
    if (spec.kind === "pane" || spec.kind === "flyout" || spec.kind === "nav") return;
    var key = spec.kind + (spec.cls ? ":" + spec.cls : "");
    var grip = document.querySelector('[data-resize="' + key + '"]');
    if (grip && grip.focus) grip.focus();
  }

  // Written at the END of a gesture, never per pointermove: a drag fires
  // hundreds of moves and a localStorage write is synchronous.
  function rememberWidth(spec) {
    if (!spec) return;
    if (spec.kind === "pane" && state.detailWidth !== null) {
      VA.writeStoredPaneWidth(widthStore(), state.detailWidth);
    } else if (spec.kind === "nav" && state.navWidth !== null) {
      VA.writeStoredNavWidth(widthStore(), state.navWidth);
    } else if (spec.kind === "flyout" && state.flyoutWidth !== null) {
      flyoutWanted = state.flyoutWidth;
      VA.writeStoredFlyoutWidth(widthStore(), state.flyoutWidth,
        roomBesideFlyout(), graphNeed());
    }
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

  // A repo document's link from this page, which sits at apps/viewer/ --
  // offered only where the transport reaches docs/ at all (paint's
  // `canReadWorksheets`, the worksheet's own test).
  function docsHref(path) {
    return "../../" + path;
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
    if (serialisation() !== paintedSerialisation) { state.bandPad = null; state.landed = false; }

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
    var showKinematic = state.mode === "kinematic";
    var showStack = !showTopology && !showKinematic;
    var kinematicStudy = showKinematic
      ? VA.findKinematicStudy(state.kinematic, state.kinematicId) : null;
    // The kinematic page draws its topology's model (2026-10-26): the same
    // DAG a chain study's page draws, with the kinematic study's lit set in
    // place of a chain, its contributor table under it and its results in the
    // right-hand pane (2026-10-28). A study whose topology the projection does
    // not carry has no model to draw.
    var showDag = showTopology || (showKinematic && !!topoProj);

    nodes.toolbar.style.display = showDag ? "" : "none";
    nodes.topojoint.style.display = showTopology ? "" : "none";
    nodes.pane.style.display = showDag ? "" : "none";
    nodes.totals.style.display = showTopology ? "" : "none";
    nodes.stackview.style.display = showStack ? "" : "none";

    // The legend ("how to read the rails") is a topology-mode concept, always
    // offered there. The worksheet is offered wherever the SELECTED node
    // carries one -- a topology's own `worksheet_file` (deliverable 4) reads
    // through the identical field a stack's does, so the same toggle serves
    // both -- and a selected study whose chain re-expresses a folded stack
    // offers that stack's sheet instead (VA.worksheetSubject). A
    // subject with none either way hides the toggle exactly as a
    // worksheet-less stack always did. Close whichever
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
    var sheet = worksheetSubject();
    var hasWorksheet = canReadWorksheets && !!(sheet && sheet.worksheet_file);
    nodes.legendToggle.style.display = showTopology ? "" : "none";
    nodes.worksheetToggle.style.display = hasWorksheet ? "" : "none";
    if (!showTopology && nodes.legendDialog.open) nodes.legendDialog.close();
    if (!hasWorksheet && nodes.worksheetDialog.open) nodes.worksheetDialog.close();

    // The pane is rebuilt below, so whatever it had under the pointer is gone.
    paneHot = null;
    repaintDag = null;
    if (showDag) {
      // Which containers are drawn (VA.GROUP_KINDS): the reader's own set for
      // this topology, else every kind. Every study of the topology has a
      // group to offer; the pane filters them by kind.
      var groupKinds = topoProj ? VA.readGroupKinds(widthStore(), topoProj.id) : null;
      var ctx = {
        groupKinds: groupKinds,
        studyGroups: topoProj
          ? VA.studyGroups(topoProj, state.kinematic,
              showKinematic ? state.kinematicId : state.studyId) : [],
        onOpenStudy: function (group) {
          if (group.selected) return;
          if (group.kind === "kinematic") onNavKinematic(group.id);
          else onNavStudy(topoProj.id, group.id);
        },
        topoProj: topoProj, study: showTopology ? study : null, crops: state.crops,
        // The kinematic page's lit set; a chain study's is read off `study`.
        lit: showKinematic ? VA.kinematicLitSet(kinematicStudy, topoProj) : null,
        zoom: state.dagZoom,
        bandPad: livePad(),
        // Where a contributor borrows its band from another edge, the
        // preview pane says so and links to it (VA.kinematicBandEdges).
        bandEdges: showKinematic ? VA.kinematicBandEdges(kinematicStudy) : null,
        unlitStyle: state.unlitStyle,
        // The bodies the reader has folded, remembered per topology
        // (VA.readCollapsedBodies), and the sub-stacks a kinematic page
        // draws inside them with their shared open state.
        // No projection published: the pane says so and draws no body.
        collapsedBodies: topoProj ? VA.readCollapsedBodies(widthStore(), topoProj.id) : null,
        onToggleBody: function (bodyId) {
          if (!topoProj) return;
          var collapsed = VA.readCollapsedBodies(widthStore(), topoProj.id);
          if (collapsed[bodyId]) delete collapsed[bodyId];
          else collapsed[bodyId] = true;
          VA.writeCollapsedBodies(widthStore(), topoProj.id, collapsed);
          render();
        },
        subStacks: showKinematic ? VA.kinematicSubStacks(kinematicStudy,
          state.kinematic && state.kinematic.display_decimals) : null,
        openSubStacks: state.openSubStacks,
        onToggleSubStack: toggleSubStack,
        // The same config the stack pane and the popovers get: since the
        // preview pane started rendering the crop's links through the shared
        // VA.cropReference (viewer_component_names_and_reference_copy) it
        // needs the drawing-checker base URL like every other crop surface.
        config: VA.CONFIG,
        selection: state.selection,
        detailImage: state.detailImage, edgeValueOnly: state.edgeValueOnly,
        edgeLengthMode: state.edgeLengthMode,
        // The lit-set rule's second reason: parts of a body tagged with a
        // variant the reader did not select (VA.otherVariantParts).
        otherVariantParts: VA.otherVariantParts(topoProj, state.tagFilter,
          state.topologies && state.topologies.variant_axis),
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
        // The leaders across the seam light with the pane's hover, and are
        // re-drawn after every paint of it (a respine's frames included).
        onHot: function (key) { paneHot = key; scheduleSeamDraw(); },
        onPainted: scheduleSeamDraw,
        // The hover reference cards (viewer_hover_cards_and_deep_links): the
        // crop trigger, the merged component cell and the confidence chip all
        // open one through this, into the same positioned popover node.
        onCardShow: showCard,
        // The flyout (study_3d_flyout): the detail pane's "attach to 3D"
        // renders only when the mount probe passed AND a launcher exists.
        annotateMount: state.annotateMount,
        onAttach3d: launchAnnotate,
      };
      var toolbarHandlers = {
        groupKinds: groupKinds,
        // One kind's checkbox: the pane repaints, nothing else on the page
        // depends on which containers are drawn.
        onGroupKind: function (kind, on) {
          groupKinds[kind] = on;
          VA.writeGroupKinds(widthStore(), topoProj.id, groupKinds);
          repaintDag(false);
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
        onFit: fitDag,
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
          state.leaderStyle = style ? style.next : VA.DEFAULT_LEADER_STYLE;
          render();
        },
        // "View in 3D" (study_3d_flyout): the toolbar builds the params
        // (topology + study + trace), this just launches them.
        onStudy3d: launchAnnotate,
        // Dim or hide the model outside the lit set: which rows are on
        // screen changes, so the pane goes back to the top -- rewind().
        onUnlitStyle: function () {
          var style = VA.UNLIT_STYLES[state.unlitStyle];
          state.unlitStyle = style ? style.next : VA.DEFAULT_UNLIT_STYLE;
          ctx.unlitStyle = state.unlitStyle;
          repaintDag(true);
        },
      };
      VA.renderTopoToolbar(nodes.toolbar, state, topoProj, toolbarHandlers);
      // The DAG's own repaint, for the controls that change only what the
      // model draws (Unused, Groups): the pane (and, for Unused, its toolbar
      // label and the 3D scene's copy of the word), never the results, the
      // nav or the preview -- the results are a different component and
      // re-rendering the page around them was what coupled the two.
      repaintDag = function (rewound) {
        paneHot = null;
        if (rewound) VA.renderTopoToolbar(nodes.toolbar, state, topoProj, toolbarHandlers);
        VA.renderTopoPane(nodes.pane, ctx);
        if (rewound) nodes.pane.scrollTop = 0;
        syncSceneModel();
      };
      if (showTopology) VA.renderTopoJoint(nodes.topojoint, topoProj, study);
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
      // Arriving at a study re-arranges the walk around it (VA.bandLayout),
      // and the band is then framed (Fit) once the transition has settled:
      // the point of the band is that the whole study is on screen without
      // scrolling. Any other paint leaves the reader's zoom alone.
      if (serialisation() !== paintedSerialisation &&
          (ctx.lit || VA.studyLitSet(ctx.study, topoProj))) {
        landingPending = true;
      }
      // Landing waits for a settled layout: a transition's own onSettled, or
      // the first paint that is not mid-transition (a repaint that cancels the
      // tween leaves the settled layout, and the landing must not be lost
      // with it).
      if (landingPending) {
        var frame = function () {
          landingPending = false;
          fitDagTo(true, true);
        };
        if (respineHandle && !respineHandle.done) respineHandle.onSettled = frame;
        else frame();
      }
      if (showTopology) {
        VA.renderTopoTotals(nodes.totals, topoProj, study, VA.topologyIndex(topoProj));
      }
    }
    // The right-hand pane, on every page with a model or a study: the page's
    // RESULTS first -- a kinematic study's name, verdicts, chart, readouts and
    // provenance; a chain study's verdict chips, the same component (its
    // totals stay at the grid's foot) -- and the selection's preview under
    // them. One page shape for every study kind (2026-10-28).
    if (showDag || showKinematic) {
      VA.clear(nodes.detail);
      nodes.detail.className = "detail";
      if (showKinematic) {
        var kinematicCtx = {
          kinematic: state.kinematic,
          study: kinematicStudy,
          topologies: state.topologies,
          selection: state.selection,
          onEdge: onKinematicEdge,
          openSubStacks: state.openSubStacks,
          onToggleSubStack: toggleSubStack,
          annotateMount: state.annotateMount,
          onAttach3d: launchAnnotate,
          onCardShow: showCard,
          // The repo's documents are reachable exactly where a worksheet is.
          docsHref: canReadWorksheets ? docsHref : null,
        };
        nodes.detail.appendChild(VA.renderKinematicResults(VA.el("section"), kinematicCtx));
      } else if (study) {
        var chainResults = VA.el("section", "detail__results");
        chainResults.appendChild(VA.verdictStrip(VA.chainVerdictItems(study), { onCardShow: showCard }));
        nodes.detail.appendChild(chainResults);
      }
      if (showDag) {
        // VA.renderTopoDetail owns its root's class; the preview is a part of
        // the pane here, not the pane.
        var preview = VA.renderTopoDetail(VA.el("div"), ctx);
        preview.className = "detail__preview";
        nodes.detail.appendChild(preview);
        ensureThumbImages(topoProj);
      }
    }
    if (showStack) {
      VA.renderStack(nodes.stackview, stackProj, state.crops, {
        onCropShow: showCrop,
        onCardShow: showCard,
        onRowSelect: selectStackRow,
        selectedRowId: state.selectedRowId,
      });
      VA.renderDetail(nodes.detail, stackProj, state.selectedRowId,
        state.crops, state.detailImage, VA.CONFIG, imageCache);
    }

    VA.renderWorksheet(nodes.worksheet, sheet, state.worksheetText);

    // What this paint put on screen, for the no-op guard in respine() above.
    // A transition's own frames do not come through paint(), so this stays
    // the target's throughout one.
    paintedSerialisation = serialisation();

    // The seam's tab, and an open pane following what was just selected --
    // after the paint, so the views' own state is settled.
    syncPaneHandle();
    followSelection();
    followSeam();
  }

  // The one nav (deliverable 1, viewer_v2_single_nav): every topology with its
  // studies as children, and every stack no topology re-expresses as a leaf of
  // the same tree (VA.navTree, topology.js). Replaces both the TOPOLOGY/STUDY
  // <select> pickers and the flat stack rail (the retired views/list.js) at
  // once; views/nav.js does the rendering, this is only the three clicks it can
  // make.
  //
  // Still three handlers, not two, with no stack child rows left to click
  // (viewer_nav_wedge_and_classic_retirement): onNavStack serves the leaves —
  // the stacks no topology re-expresses — and an inbound deep link at
  // `?stack=<id>`, which resolves against the projection rather than the nav
  // and so still reaches a covered stack the rail no longer offers.
  function renderNav() {
    if (state.connection !== VA.STATE.READY) {
      VA.clear(nodes.navtree);
      nodes.navtree.style.display = "none";
      if (nodes.navDivider) nodes.navDivider.style.display = "none";
      return;
    }
    nodes.navtree.style.display = "";
    if (nodes.navDivider) nodes.navDivider.style.display = "";
    var tree = VA.navTree(state.topologies, state.stacksResults, state.kinematic);
    VA.renderNavTree(nodes.navtree, tree, state, {
      onTopology: onNavTopology,
      onStudy: onNavStudy,
      onTag: onNavTag,
      onStack: onNavStack,
      onKinematic: onNavKinematic,
      onKinematicModel: onNavKinematicModel,
      // The study row's consolidated ⚠ opens into the SAME popover node every
      // other hover card on this page uses (viewer_nav_alert_badge_and_angled_
      // default): one node, one placement, one close story. The rail is
      // `overflow-y: auto` and 300px wide, so a popup rendered inside a row
      // would be clipped -- and the shared node is `position: fixed`, which is
      // the reason it is not.
      onCardShow: showCard,
      // The open scene's own tree goes under the row it is showing
      // (renderSceneSlot, below); a closed scene has no slot at all.
      sceneSlot: !!(nodes.flyout && nodes.flyout.open),
    });
    renderSceneSlot();
  }

  // Re-render with the rows/rows-equivalent scrolled back to the top. Only the
  // controls that change WHICH rows or WHICH stack are on screen do this;
  // clicking a row also re-renders, and yanking the reader back to the top for
  // that would be its own bug (rewind's original comment, topology.js).
  // --- the respine (viewer_study_respine_animation) -------------------------
  //
  // A rewind() whose pane paint is a TRANSITION rather than a repaint: the
  // store the outgoing paint drew from is captured here, before anything is
  // re-rendered, and paint() hands it to VA.animateTopoPane. Only the control
  // that changes WHICH serialisation is on screen comes through here --
  // picking or dropping a study in the nav, which since
  // viewer_respine_whole_walk is the only one there is; everything else --
  // density, length mode, leader style, a resize drag -- changes how the SAME
  // rows are drawn and has always been a plain render.
  //
  // VA.lastTopoRender is the store the LAST pane paint drew from, which
  // during a transition is that transition's own last frame: interrupting a
  // respine with another one therefore picks up where the first one had got
  // to instead of snapping back to where it began.
  var respineFrom = null;
  var respineHandle = null;
  // Set by each paint that draws the DAG, cleared by each that does not.
  var repaintDag = null;
  var paintedSerialisation = null;
  var landingPending = false;

  // Which serialisation is on screen: the mode, the topology and the study.
  // A respine is only a TRANSITION when one of those actually changed --
  // clicking the nav row of the topology already open is a no-op, and
  // animating a no-op would lay a fading ghost of the page over the identical
  // page for a quarter of a second.
  function serialisation() {
    return [state.mode, state.topologyId, state.studyId, state.kinematicId]
      .join(" / ");
  }

  function respine() {
    respineFrom = serialisation() === paintedSerialisation
      ? null
      : (VA.lastTopoRender || null);
    rewind();
  }

  // A kinematic page's sub-stack opened or closed, from the DAG's label or the
  // table's group row: one map, one repaint, both surfaces follow.
  function toggleSubStack(id) {
    if (state.openSubStacks[id]) delete state.openSubStacks[id];
    else state.openSubStacks[id] = true;
    render();
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
