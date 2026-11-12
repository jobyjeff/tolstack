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
    // The feature-identity record -- the served log folded (identity_fold.js),
    // or bindings.json where no log is reached -- or null, the ordinary
    // "nothing bound" reading. Folded into one status per feature by the
    // model object (model.js). Replaced whole whenever the embedded pane
    // posts its merged record after a write ({type: "annotate:identity"}).
    identity: null,
    // The installed meshes' sha256 the log listed, or null where nothing
    // said: what a binding's face is checked against (VA.orphanBindings).
    installedMeshes: null,
    // The ONE model object per topology (VA.buildModels), built once per
    // loaded projection and never per paint. The left column is its first
    // reader (views/nav.js); the DAG's own derivations are a later handoff's
    // to move onto it.
    models: {},
    // Which tree rows the reader opened or closed, by the row's key; a row
    // the reader never touched takes its kind's default (views/nav.js).
    navOpen: {},
    // Parts hidden in the 3D scene from the tree's show/hide, by part id --
    // the page's own copy, re-posted whenever the scene reloads
    // (syncSceneVisibility), so a sweep ending cannot un-hide behind the tree.
    hiddenParts: {},
    // The ONE selection and the ONE hover (one_selection_one_hover_and_
    // leaders_off, 2026-11-10): each a model entity {kind, id} with kind one
    // of VA.FOCUS_KINDS (body, part, feature, dimension, interface, joint),
    // or null. Written by setSelected / setHovered ONLY; the tree, the DAG,
    // the grid, the Preview and the 3D scene all light from it (applyFocus),
    // after every paint as well as on every change, so a repaint loses
    // nothing. `selection` below is its element form, derived in the same
    // setter, never written elsewhere.
    focus: { selected: null, hovered: null },

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
    // A VA.EDGE_LENGTH_MODES key (topology.js) — how much vertical extent a
    // dimension bar gets — or null until the reader picks one, which draws
    // the page's own default (VA.edgeLengthModeFor: contribution on a
    // kinematic page, uniform elsewhere). A display preference like
    // rowDensity, not a fact about a topology, so selectTopology() never
    // resets it either.
    edgeLengthMode: null,
    // The DAG's zoom (VA.DAG_ZOOM, topology.js): per page state, never stored.
    // 1 is the drawing at its own size; the wheel, Fit and `0` move it.
    dagZoom: 1,
    // "off" (the default since 2026-11-10: no leader is built), "angled"
    // (one straight segment, the default from 2026-09-21) or "jogged"
    // (right-angle jogs, what shipped first). VA.LEADER_STYLES and
    // VA.DEFAULT_LEADER_STYLE, topology.js. A display preference like the
    // three above -- selectTopology() never resets it.
    leaderStyle: VA.DEFAULT_LEADER_STYLE,
    // "dim" | "hide" -- what the DAG does with the model outside the page's
    // lit set (VA.UNLIT_STYLES, VA.DEFAULT_UNLIT_STYLE, topology.js). A
    // display preference like the leader style, in-session like it, and kept
    // across every page that has a lit set: a chain study and a kinematic
    // study alike.
    unlitStyle: VA.DEFAULT_UNLIT_STYLE,
    // Which stop a kinematic page's grid shows its stack at (a stop id), or
    // null for the study's first. In-session, like the unlit style.
    kinematicStop: null,
    // Where on the sweep a kinematic page is read (VA.kinematicPose: a
    // fractional point index), or null for the stop's own point. The grid,
    // the DAG, the chart's cursor and the 3D pane all read it; `?pose=<angle>`
    // carries it in the URL (VA.POSE_PARAM).
    kinematicPose: null,
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
    // The DAG's view settings -- colour overlay, group fill, graph width
    // (VA.readDagView, topology.js) -- remembered across sessions in one
    // store entry, read at boot. Display preferences: selectTopology() never
    // resets them.
    dagView: Object.assign({}, VA.DAG_VIEW_DEFAULTS),
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
    // topology mode: `focus.selected` as the element the DAG and the grid
    // draw (VA.focusElementOf), written by setSelected and read everywhere
    // a view keys by element. A part, a body or a joint selected is no one
    // element, and this is null while it is.
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
  // The `?pose=` the page was opened with (VA.parsePoseParam), until the
  // first load applies it.
  var poseWanted = null;
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
    state.dagView = VA.readDagView(widthStore());
    VA.applyGraphWidth(state.dagView.graphWidth);
    applyPalette();
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
      // An anchor the pointer was on has gone with the scene.
      setHovered(null, "scene");
      syncPaneHandle();
      // The leaders go with the scene; it is told everything again on reopen.
      // Its anchors too: a closed panel's canvas has no size, and what it
      // posted describes a box that is no longer there.
      sceneModelPosted = null;
      sceneSelectPosted = null;
      sceneInspectHeld = null;
      forgetSeamAnchors(false);
      // The page is back to the width the band was centred for.
      if (state.landed) {
        var g = beginGlide();
        dropBandPad();
        fitDagTo(true, true);
        endGlide(g);
      }
      scheduleSeamDraw();
    });
    wirePageHover();
    wirePaneState();
    wirePreviewRelease();
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
    // ?pose=<angle> -- a kinematic page's pose, as the measure there (the
    // blade angle), applied once the study it is a pose of is known.
    poseWanted = VA.parsePoseParam(window.location.search);

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
      // Escape closes an open popover; with none open it lets go of the
      // frozen Preview (unfreeze), unless something else on the page owns
      // the key right now -- a modal dialog, or an armed pick in the scene.
      document.addEventListener("keydown", function (event) {
        if (!event || event.key !== "Escape") return;
        if (nodes.crop && nodes.crop.style.display === "block") { hideCrop(); return; }
        hideCrop();
        if (modalOpen() || VA.scenePickArmed(sceneTree)) return;
        if (state.selection) unfreeze();
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
      // The feature-identity projection, where the transport reaches one;
      // null is "nothing bound", never an error (storage/adapter.js).
      typeof adapter.readIdentityProjection === "function"
        ? adapter.readIdentityProjection().catch(function () { return null; })
        : Promise.resolve(null),
      // ...and the LOG, which wins wherever it is reached: the projection is
      // the last rebuild's snapshot, the log is every event written since
      // (identity_fold.js folds it here, the page's own copy of the fold).
      typeof adapter.readIdentityLog === "function"
        ? adapter.readIdentityLog().catch(function () { return null; })
        : Promise.resolve(null),
    ]).then(function (all) {
      state.topologies = all[0];
      state.crops = all[1];
      state.stacksResults = all[2];
      state.kinematic = all[3] || null;
      var identity = VA.identityFromSources(all[5], all[4], null);
      state.identity = identity.projection;
      state.installedMeshes = identity.installedMeshes;
      // One model object per topology, built here and only here.
      state.models = VA.buildModels(state.topologies, state.identity);

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
          setSelected(linked.selection
            ? VA.focusEntityOf(currentModel(), linked.selection.kind, linked.selection.id) : null);
          if (poseWanted !== null) {
            setPose(VA.kinematicPoseOfMeasure(
              VA.findKinematicStudy(state.kinematic, linked.kinematicId), poseWanted));
          }
        } else if (linked.mode === "topology") {
          selectTopology(linked.topologyId);
          state.studyId = linked.studyId;
          setSelected(linked.selection
            ? VA.focusEntityOf(currentModel(), linked.selection.kind, linked.selection.id) : null);
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
        // The model the reader last opened, else the projection's first
        // (VA.bootModel); a deep link above has already won.
        var model = VA.bootModel(state.topologies, VA.readStoredModel(widthStore()));
        if (model) {
          selectTopology(model);
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
    VA.writeStoredModel(widthStore(), topologyId);
    // A study id from the previous topology means nothing on this one, and a
    // selection pointing at its nodes means less than nothing — an id that
    // happens to exist in both would show the wrong element under the right
    // name.
    state.studyId = null;
    state.detailImage = null;
    // The tree's folds, its hidden parts and its selection are this model's;
    // another model starts from the defaults.
    state.navOpen = {};
    state.hiddenParts = {};
    setSelected(null);
  }

  // --- the ONE selection and the ONE hover (one_selection_one_hover_and_
  // leaders_off, 2026-11-10) --------------------------------------------------
  //
  // Until 2026-11-10 selection had five writers and two copies
  // (`state.selection`, the element, and `state.selectedFeature`, the row the
  // faces layer sat under) and hover had three mechanisms (the DAG's own
  // `hot` state, VA.lightTopoKeys from the tree and the scene, and three
  // Preview keys by source), two of which a full repaint cleared. Now:
  //
  //   state.focus.selected   one model entity or null  -- setSelected()
  //   state.focus.hovered    one model entity or null  -- setHovered()
  //
  // and applyFocus() lights every surface from the two: the DAG and the grid
  // (VA.lightTopoKeys over VA.focusElementKeysOf), the tree (VA.lightNavTree
  // over VA.focusNavRowsOf; the selected rows are drawn lit by the nav's own
  // render), the Preview (the hovered element, else the frozen one), the 3D
  // scene (syncPaneHover: the commands the pane answers) and the leaders
  // across the seam. It runs on every change and after every paint, so a
  // repaint loses nothing. Each surface can SET it: the tree's rows
  // (onNavFeature, onNavInterface, onNavHover), the DAG's and the grid's
  // marks (ctx.onSelect, ctx.onHot), the scene's anchors (onScenePick, the
  // hover message) and the pane's own rail (followScenePick). The pane is
  // told by message (`model select node`, `highlight`, `hover`, a rail
  // `activate`) and answers by message; what it keeps of its own is the
  // lesson's to list.
  function setSelected(entity) {
    var model = currentModel();
    state.focus.selected = entity || null;
    state.selection = VA.focusElementOf(model, entity);
    // A feature selected is open: its row's own default applies again (the
    // reader's later fold of it still wins, views/nav.js's isOpen).
    if (entity && entity.kind === VA.FOCUS_KINDS.feature) delete state.navOpen[VA.navFeatureKey(entity.id)];
  }

  // Select, fetch the element's image, paint.
  function selectEntity(entity) {
    setSelected(entity);
    loadDetailImage().then(render);
  }

  // A DAG mark, a grid row, a scene anchor: an element, selected as the
  // entity it is.
  function selectElement(kind, id) {
    selectEntity(VA.focusEntityOf(currentModel(), kind, id));
  }

  // The selected feature's id, or null: the row whose body is open by default.
  function selectedFeatureId() {
    var sel = state.focus.selected;
    return sel && sel.kind === VA.FOCUS_KINDS.feature ? sel.id : null;
  }

  // Which surface set the hover ("dag", "tree", "scene", "page"): a set from
  // any surface wins (one pointer, one hover); a clear counts only from the
  // surface that set it, so a leave on one surface never takes down what
  // another has just lit.
  var hoverSource = null;

  function setHovered(entity, source) {
    if (!entity) {
      if (!state.focus.hovered) return;
      if (hoverSource && source && hoverSource !== source) return;
      state.focus.hovered = null;
      hoverSource = null;
    } else {
      if (VA.sameFocus(entity, state.focus.hovered) && hoverSource === source) return;
      state.focus.hovered = entity;
      hoverSource = source || null;
    }
    applyFocus();
  }

  // The hovered element's key (`node|<id>`, `edge|<id>`), or null: what the
  // Preview shows over the frozen element.
  function hoveredElementKey() {
    var el = VA.focusElementOf(currentModel(), state.focus.hovered);
    return el ? VA.elementKey(el.kind, el.id) : null;
  }

  // A paint rebuilt the DAG, the grid and the tree, and the new element under
  // a resting pointer fires no mouseenter -- nor does the old one fire a
  // mouseleave once it is gone. So after a paint the hover is kept only
  // where the pointer still is: what is under its last position (pointerAt,
  // the popover corridor's mousemove) is asked which entity it is, and a
  // hover on anything else is let go of. The scene is not repainted by this
  // page and keeps its own; a pointer that never moved has hovered nothing.
  function revalidateHover() {
    var h = state.focus.hovered;
    if (!h || hoverSource === "scene") return;
    var under = pointerAt && typeof document !== "undefined" && document.elementFromPoint
      ? document.elementFromPoint(pointerAt.x, pointerAt.y) : null;
    if (VA.sameFocus(entityUnder(under), h)) return;
    state.focus.hovered = null;
    hoverSource = null;
  }

  // The entity a page node is part of: a tree row's (body, part, feature,
  // interface, joint), or a DAG mark's / grid row's element as the entity it
  // is. Null for anything else -- a heading, a study row, a rail's hit path.
  function entityUnder(node) {
    if (!node || !node.closest) return null;
    var row = node.closest("[data-nav-kind][data-nav-id]");
    if (row && node.closest("#navtree")) {
      var kind = row.getAttribute("data-nav-kind");
      return VA.FOCUS_KINDS[kind] ? { kind: kind, id: row.getAttribute("data-nav-id") } : null;
    }
    // A leader's hit path is wired bare (no row kind): it is its node's.
    var leader = node.closest("[data-leader-id]");
    if (leader) return VA.focusEntityOf(currentModel(), "node", leader.getAttribute("data-leader-id"));
    var mark = node.closest("[data-row-kind][data-id]");
    if (!mark) return null;
    var el = VA.parseElementKey(VA.elementKey(mark.getAttribute("data-row-kind"), mark.getAttribute("data-id")));
    return el ? VA.focusEntityOf(currentModel(), el.kind, el.id) : null;
  }

  function applyFocus() {
    var model = currentModel();
    var keys = VA.focusElementKeysOf(model, state.focus.hovered);
    if (VA.lightTopoKeys) VA.lightTopoKeys(keys.length ? keys : null);
    if (VA.lightNavTree && nodes.navtree) VA.lightNavTree(nodes.navtree, model, state.focus.hovered);
    followHoverInPreview();
    syncPaneHover();
    syncSceneInspect();
    if (!leadersOff()) scheduleSeamDraw();
  }

  // The open model's ONE model object (model.js), or null before the
  // projection is read or on a projection built without the model block.
  function currentModel() {
    return (state.models && state.models[state.topologyId]) || null;
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
    if (state.kinematicId !== studyId) {
      state.kinematicStop = null;
      state.kinematicPose = null;
      stopPlay();
    }
    state.mode = "kinematic";
    state.kinematicId = studyId;
    state.topologyId = study ? study.topology : null;
    VA.writeStoredModel(widthStore(), state.topologyId);
    setSelected(null);
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
    setSelected(null);
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

  // A row's 3D control: the row's own selection, then the pane opened on it
  // (a pane already open is re-driven by the selection itself). Closing the
  // pane stays the reader's act.
  function onNav3D(select) {
    select();
    if (state.annotateMount && nodes.flyout && !nodes.flyout.open) openPane();
  }

  function onNavKinematicModel(topologyId, runId) {
    var params = { topologyId: topologyId, sweep: runId };
    if (state.annotateMount) {
      launchAnnotate(params);
    } else if (typeof window.open === "function") {
      window.open(VA.annotateLink(params), "_blank", "noopener");
    }
  }

  // --- the model tree's own gestures (the_model_is_derived_once_and_the_
  // left_column_is_its_tree) --------------------------------------------------
  //
  // A fold is the nav's alone: nothing else on the page moves, so only the
  // nav repaints. `open` is what the row showed when it was clicked (views/
  // nav.js passes it), so the reader's choice is the opposite of it.
  function onNavToggle(key, open) {
    state.navOpen[key] = !open;
    renderNav();
  }

  // A feature row selects that feature: its node lights on the DAG, in the
  // grid, in the Preview and in the scene, and its row opens to its body
  // (views/nav.js's featureItem). A feature of a node already selected is a
  // new selection of the same element (a node two parts share is one
  // element, two rows), so the body moves and nothing else repaints.
  function onNavFeature(featureId) {
    var model = currentModel();
    if (!model || !model.feature(featureId)) return;
    selectEntity({ kind: VA.FOCUS_KINDS.feature, id: featureId });
  }

  // An interface row selects the interface: a shared node, or a gap edge.
  function onNavInterface(kind, id) {
    selectEntity({ kind: VA.FOCUS_KINDS.interface, id: id });
  }

  // Show or hide a part, or every part of a body, in the 3D scene -- the
  // verbs the sweep rail's checkboxes used (`show` / `hide` by part). Only a
  // part with an installed mesh is ever named; the tree offers the box only
  // for those.
  function onNavVisibility(kind, id, shown) {
    var model = currentModel();
    if (!model) return;
    var body = kind === "body" ? model.body(id) : null;
    var parts = body ? body.parts : [id];
    parts.forEach(function (partId) {
      if (!model.hasMesh(partId)) return;
      if (shown) delete state.hiddenParts[partId];
      else state.hiddenParts[partId] = true;
    });
    renderNav();
    syncSceneVisibility();
  }

  // Resting on a tree row is the one hover: a feature, a part or a body
  // (views/nav.js hands the entity), lit everywhere by applyFocus -- the
  // scene's part is syncPaneHover's.
  function onNavHover(target) {
    setHovered(target ? { kind: target.kind, id: target.id } : null, "tree");
  }

  // The run's subjects, as the scene's own tree names them (`body=<name>` in
  // a row's key): what a `hover body` may name.
  var SCENE_SUBJECT_KEY = /(?:^|\/)body=([^,\/]+)/;
  function sceneSubjects() {
    var out = {};
    var walk = function (rows) {
      (rows || []).forEach(function (row) {
        var m = SCENE_SUBJECT_KEY.exec(String(row.key || ""));
        if (m) out[m[1]] = true;
        walk(row.rows);
      });
    };
    if (sceneTree) walk(sceneTree.rows);
    return out;
  }

  // The one DOM write row density needs: VA.applyRowDensity (topology.js,
  // pure) owns VA.RAIL_METRICS.rowHeight, which the inline row heights and
  // the SVG geometry already read live; this is the other of the "three
  // places" — the CSS variable the grid's paint (padding, borders) reads.
  function applyDensity() {
    var preset = VA.applyRowDensity(state.rowDensity);
    document.documentElement.style.setProperty("--tv-row", preset.rowHeight + "px");
  }

  // The bodies' palette (VA.PALETTES) is one attribute on the document: the
  // DAG, the grid's brackets and the overlay's key all read the same
  // `--tv-body-ink-*`, so one write recolours every place a body is drawn.
  function applyPalette() {
    var root = document.documentElement;
    if (state.dagView.palette && state.dagView.palette !== "bold") {
      root.setAttribute("data-palette", state.dagView.palette);
    } else if (root.removeAttribute) {
      root.removeAttribute("data-palette");
    }
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

  // --- the Preview: hover previews, click freezes (a_preview_pane_replaces_
  // the_hover_popups_and_one_record_backs_every_mark) -------------------------
  //
  // Jeff, 2026-10-29: "a preview pane that shows the details (especially the
  // thumbnail crop for the source) for whatever element is hilighted. Clicking
  // the item then freezes the pane. If you then drag over other elements it
  // momentarily switches to the preview to the thing you're hovering over, but
  // if you don't click, then it returns to the last frozen item when you move
  // the mouse away."
  //
  // What is shown is ONE key: the pane's hovered or focused mark, else the
  // scene's hovered anchor, else the selection -- and the selection IS the
  // freeze (clicking selects; selection lights the chain; one action). The
  // body is the element's record (VA.renderTopoDetail over VA.elementRecords);
  // the head says "Preview" and, while something is frozen, a pin and its name.
  // A hover repaints the Preview and nothing else on the page.
  var preview = null;          // { box, head, body, ctx, records }
  var previewShown = undefined;
  var previewReturn = null;    // the timer that hands the Preview back

  function selectionKey() {
    return state.selection ? VA.elementKey(state.selection.kind, state.selection.id) : null;
  }

  // The one hover's element, else the one selection's (applyFocus).
  function previewKey() {
    return hoveredElementKey() || selectionKey();
  }

  function mountPreview(ctx) {
    var box = VA.el("section", "detail__preview");
    var head = VA.el("div", "detail__previewhead");
    var body = VA.el("div", "detail__previewbody");
    box.appendChild(head);
    box.appendChild(body);
    nodes.detail.appendChild(box);
    preview = {
      box: box, head: head, body: body,
      ctx: Object.assign({}, ctx, { cropImages: imageCache }),
      records: VA.elementRecords(ctx.topoProj, VA.previewRecordOptions(ctx)),
    };
    // From the one state: the hover a repaint happened under is still the
    // hover, and the Preview shows it.
    paintPreview(true);
  }

  function unmountPreview() {
    preview = null;
    previewShown = undefined;
  }

  // The Preview follows the one hover: at once when something is hovered,
  // and back to the frozen element a beat later when nothing is, so a
  // pointer crossing the gap between two marks does not flash it in between.
  function followHoverInPreview() {
    if (previewReturn !== null) {
      clearTimeout(previewReturn);
      previewReturn = null;
    }
    if (hoveredElementKey()) { paintPreview(); return; }
    previewReturn = setTimeout(function () {
      previewReturn = null;
      paintPreview();
    }, VA.PREVIEW_RETURN_MS);
  }

  function paintPreview(force) {
    if (!preview) return;
    var key = previewKey();
    if (!force && key === previewShown) return;
    previewShown = key;
    var frozen = selectionKey();
    renderPreviewHead(frozen);
    VA.renderTopoDetail(preview.body, Object.assign({}, preview.ctx, {
      previewKey: key,
      record: key ? (preview.records[key] || null) : undefined,
    }));
    preview.body.className = "detail__previewbody";
    // What a reader -- and the browser tier -- can ask of the section without
    // reading its prose: which element it shows, and why.
    preview.box.setAttribute("data-preview-key", key || "");
    preview.box.setAttribute("data-preview-state",
      !key ? "empty" : key === frozen ? "frozen" : "hover");
    fetchPreviewImages(key);
  }

  // "Preview", and while something is frozen, a pin and the frozen element's
  // name: the pin is the way to let go (as Esc and a click on empty canvas
  // are), so the control a reader needs is the glyph that says why it exists.
  function renderPreviewHead(frozen) {
    var head = preview.head;
    VA.clear(head);
    head.appendChild(VA.el("span", "detail__previewlabel", "Preview"));
    var record = frozen ? preview.records[frozen] : null;
    if (!frozen) return;
    var name = record ? record.title : state.selection.id;
    var unpin = VA.el("button", "detail__unpin");
    unpin.appendChild(VA.pinGlyph());
    unpin.setAttribute("title", "kept — click, or press Esc, to let go");
    unpin.setAttribute("aria-label", "let go of " + name);
    unpin.onclick = function () { unfreeze(); };
    head.appendChild(unpin);
    var label = VA.el("span", "detail__frozen", name);
    label.setAttribute("title", name);
    head.appendChild(label);
  }

  // The pictures a record shows: its crop (and a balloon crop's parts-list
  // companion), or a node's sides' part pictures. Most are cached already --
  // the grid's thumbnails fetch every resolved crop the topology addresses --
  // and one that is not is fetched and the Preview repainted if it is still
  // showing the same element.
  function fetchPreviewImages(key) {
    var record = key && preview ? preview.records[key] : null;
    if (!record || !adapter) return;
    var entries = [];
    if (record.crop) entries.push(record.crop.entry);
    (record.sides || []).forEach(function (side) {
      if (side.thumb) entries.push(side.thumb.entry);
    });
    var pngs = [];
    entries.forEach(function (entry) {
      if (!entry || entry.status !== "resolved") return;
      [entry.png, entry.companion && entry.companion.png].forEach(function (png) {
        if (png && !Object.prototype.hasOwnProperty.call(imageCache, png) &&
            pngs.indexOf(png) === -1) pngs.push(png);
      });
    });
    if (!pngs.length) return;
    Promise.all(pngs.map(cacheCropImage)).then(function () {
      if (previewShown === key) paintPreview(true);
    });
  }

  // Let go of the frozen element: the selection goes, and with it the lit
  // chain's emphasis on the element and its leaders -- the same one action.
  function unfreeze() {
    if (!state.focus.selected) return;
    setSelected(null);
    state.detailImage = null;
    render();
  }

  function modalOpen() {
    return [nodes.legendDialog, nodes.worksheetDialog,
            document.getElementById("crop-lightbox")].some(function (dialog) {
      return !!(dialog && dialog.open);
    });
  }

  // A click on a scene anchor: the scene's own rule is that a second click on
  // the selected anchor lets it go, and the page follows it.
  function onScenePick(msg) {
    if (!msg.kind || !msg.id) return;
    var topoProj = currentTopology();
    var index = VA.topologyIndex(topoProj);
    var known = msg.kind === "node" ? index.nodes[msg.id] : index.edges[msg.id];
    if (!known) return;
    var key = VA.elementKey(msg.kind, msg.id);
    if (key === selectionKey()) { unfreeze(); return; }
    selectFromScene(msg.kind === "node" ? featureEntityOfNode(msg.id)
      : VA.focusEntityOf(currentModel(), msg.kind, msg.id));
  }

  // A selection the scene made -- an anchor clicked, a rail row selected --
  // brings its tree row into view (revealPending): the reader's hand was on
  // the scene, not on the column. A click in the column itself never scrolls
  // it (Jeff, 2026-11-10: "the whole menu jumps").
  var revealPending = null;

  function selectFromScene(entity) {
    revealPending = entity && entity.kind === VA.FOCUS_KINDS.feature ? entity.id : null;
    selectEntity(entity);
  }

  // A node the scene named, as the feature its rows are drawn under: the
  // feature already selected where it is that node's, else the node's first
  // (a node two parts share is one element and two rows; the body opens
  // under one).
  function featureEntityOfNode(nodeId) {
    var model = currentModel();
    if (!model) return VA.focusEntityOf(model, "node", nodeId);
    var sel = state.focus.selected;
    var kept = sel && sel.kind === VA.FOCUS_KINDS.feature ? model.feature(sel.id) : null;
    if (kept && kept.node === nodeId) return sel;
    var features = model.featuresOfNode(nodeId);
    return features.length ? { kind: VA.FOCUS_KINDS.feature, id: features[0] }
      : VA.focusEntityOf(model, "node", nodeId);
  }

  // A click on the model's empty canvas lets go too: on the pane, anywhere
  // that is not a mark, a row or a control, and not the end of a drag (the
  // pane pans under a pressed pointer).
  var PREVIEW_KEEPERS = "[data-row-kind], .rail__leaderhit, button, a, input, select, " +
    "label, summary, th, [role=\"button\"], [role=\"separator\"], .tvgrip, tr";
  function wirePreviewRelease() {
    if (!nodes.pane || !nodes.pane.addEventListener) return;
    var down = null;
    nodes.pane.addEventListener("pointerdown", function (event) {
      down = { x: event.clientX, y: event.clientY };
    });
    nodes.pane.addEventListener("click", function (event) {
      var moved = down && (Math.abs(event.clientX - down.x) > VA.PREVIEW_CLICK_SLOP_PX ||
        Math.abs(event.clientY - down.y) > VA.PREVIEW_CLICK_SLOP_PX);
      down = null;
      if (moved || !state.selection) return;
      var target = event.target;
      if (target && target.closest && target.closest(PREVIEW_KEEPERS)) return;
      unfreeze();
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

  // What the pane follows: the page's view, and the run the pane says it has
  // loaded (VA.annotateEdgeIsHighlight reads it).
  function paneView() {
    return {
      mode: state.mode,
      topologyId: state.topologyId,
      studyId: state.studyId,
      selection: state.selection,
      kinematicStudy: state.mode === "kinematic"
        ? VA.findKinematicStudy(state.kinematic, state.kinematicId) : null,
      paneRunTopology: paneRun ? paneTopology : null,
    };
  }

  function currentAnnotateParams() {
    return VA.annotateParamsFor(paneView());
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
    // While the scene shows a sweep -- a kinematic page's, or a run loaded on
    // this topology -- a selected edge is HIGHLIGHTED there instead
    // (VA.annotateEdgeIsHighlight): the same `highlight` a hover posts, never
    // a `goto`, which would take the scene out of the sweep.
    if (VA.annotateEdgeIsHighlight(paneView())) syncPaneHover();
    if (state.mode === "kinematic") {
      // ...and posed where the page is read (syncPanePose).
      var study = poseStudy();
      var at = poseIndex(study);
      if (at !== null) syncPanePose(study, VA.kinematicPose(study, at));
    }
  }

  // The edge selected while the scene shows a sweep, as a hover target: what
  // the scene shows highlighted while the pointer rests on nothing in
  // particular.
  function selectedPaneTarget() {
    if (!state.selection || state.selection.kind !== "edge" ||
        !VA.annotateEdgeIsHighlight(paneView())) return null;
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
    var g = beginGlide();
    launchAnnotateNow(params);
    endGlide(g);
  }

  function launchAnnotateNow(params) {
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
    partScopePosted = null;
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
    // Armed is the annotator's own word for it, on its tree message
    // (VA.scenePickArmed). Nothing here knows the verb's meaning beyond its name.
    if (document.addEventListener) {
      document.addEventListener("keydown", function (event) {
        if (!event || event.key !== "Escape" || !sceneTree) return;
        if (VA.scenePickArmed(sceneTree)) postToPane(["arm", "off"]);
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
        // The pane's rows are what the page's selection is drawn as there:
        // a fresh tree is asked to agree with it.
        syncSceneInspect();
        // A rebuilt rail took the pane's hover down with it (its bodies keep
        // anchoring for seconds after a run loads, F1a's lesson), so what the
        // page remembers as posted is stale: the one hover is posted again.
        paneHoverPosted = HOVER_CLEAR.join(" ");
        syncPaneHover();
        return;
      }
      // The scene's pointer on an anchor is the one hover: previewed, lit on
      // the DAG, in the grid, in the tree and along its leader. A click on one
      // freezes it (or lets it go, the scene's own second-click rule).
      if (msg && msg.type === VA.SCENE_HOVER_MESSAGE) {
        setHovered(sceneHoverEntity(msg), "scene");
        return;
      }
      if (msg && msg.type === VA.SCENE_PICK_MESSAGE) {
        onScenePick(msg);
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
      // The pane wrote (or read) the log: its merged record replaces the
      // page's, the models are rebuilt from it, and the tree repaints -- the
      // status marks and the bodies change at once, with no reload.
      if (msg && msg.type === VA.SCENE_IDENTITY_MESSAGE) {
        onPaneIdentity(msg);
        return;
      }
      // The pane's transport moved the pose (onPanePose).
      if (msg && msg.type === "annotate:pose") {
        onPanePose(msg);
        return;
      }
      if (!msg || msg.type !== "annotate:state") return;
      var runWas = paneRun, topologyWas = paneTopology;
      paneRun = msg.run || null;
      paneTopology = msg.topology || null;
      // A run loaded or left changes what a selected edge asks of the pane
      // (VA.annotateEdgeIsHighlight). What the pane now shows is the pane's
      // own doing, so it is what the page follows from here -- not a reason
      // to drive it back out of the run it just loaded.
      if (paneRun !== runWas || paneTopology !== topologyWas) {
        paneFollowed = paramsKey(currentAnnotateParams());
        paneHighlightPosted = null;
        // ...and the scene reloaded: its rail holds nothing the page told it.
        sceneInspectHeld = null;
      }
      setPaneTitle(msg.title || null);
      // What the scene shows changed: its anchors are asked for afresh, and
      // the page keeps drawing from the last ones until they land -- they are
      // still where the scene draws its nodes.
      postToPane(["model", "anchors"]);
      // The scene has just (re)loaded what it shows: it is told the page's
      // lit set and dim-or-hide word again, whatever it was told before --
      // and the pose (syncPanePose).
      panePosePosted = null;
      paneDriver = null;
      if (state.mode === "kinematic" && poseIndex(poseStudy()) !== null) {
        syncPanePose(poseStudy(), VA.kinematicPose(poseStudy(), poseIndex(poseStudy())));
      }
      sceneModelPosted = null;
      sceneSelectPosted = null;
      sceneVisibilityPosted = null;
      sceneFilterPosted = null;
      syncSceneModel();
    });
  }

  // The entity under the scene's pointer. A joint's one dot stands for every
  // node it merged (`members`: coaxial ends drawn as one 3D node), and those
  // nodes are the two ends of the edge that joins them -- so the entity is
  // that edge's (a gap interface: its bar, its two dots and its row light);
  // several such edges that are one model joint's constraints are that
  // joint. Else the node's own entity.
  function sceneHoverEntity(msg) {
    if (!msg || !msg.kind || !msg.id) return null;
    var model = currentModel();
    var members = Array.isArray(msg.members) && msg.members.length > 1 ? msg.members : null;
    if (members && msg.kind === "node") {
      var index = VA.topologyIndex(currentTopology());
      var joining = Object.keys(index.edges || {}).sort().filter(function (id) {
        var edge = index.edges[id];
        return edge && members.indexOf(edge.from) !== -1 && members.indexOf(edge.to) !== -1;
      });
      if (joining.length) {
        var joints = joining.map(function (id) {
          var iface = model ? model.interface(id) : null;
          return iface && iface.joint ? iface.joint : null;
        });
        var one = joints[0];
        if (model && one && joints.every(function (j) { return j === one; }) && model.joint(one) &&
            joining.length > 1) {
          return { kind: VA.FOCUS_KINDS.joint, id: one };
        }
        return VA.focusEntityOf(model, "edge", joining[0]);
      }
    }
    return VA.focusEntityOf(model, msg.kind, msg.id);
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
  function sceneFocus(root) {
    var active = typeof document !== "undefined" ? document.activeElement : null;
    if (!active || !root || !root.contains || !root.contains(active)) return null;
    var row = active.closest && active.closest("[data-scene-key]");
    return row ? { key: row.getAttribute("data-scene-key"),
      part: active.getAttribute("data-scene-part") || "" } : null;
  }

  // The edges a feature is an end of, for its bind-mode rows (an element row
  // is an edge): its OWN part's edges at its node (model.endsOf), never the
  // other part's on a node two parts share.
  function featureEdgeIds(model, fid) {
    var seen = {};
    return model.endsOf(fid).map(function (e) { return e.edgeId; })
      .filter(function (id) { return seen[id] ? false : (seen[id] = true); });
  }

  // A feature's body: the pane's rows for its node (VA.sceneRowsForFeature),
  // drawn under the row by VA.renderFeatureBody -- its state line, its
  // candidate faces, its one pick action. Every OPEN feature row has a slot
  // (views/nav.js's featureItem, `data-scene-feature`), and each is filled
  // here; no tree yet, or no rows for the node, draws nothing.
  function renderSceneSlot() {
    var slots = nodes.navtree && nodes.navtree.querySelectorAll
      ? nodes.navtree.querySelectorAll(".navtree__scene[data-scene-feature]") : [];
    if (!slots.length) return;
    var focus = sceneFocus(nodes.navtree);
    var model = currentModel();
    for (var i = 0; i < slots.length; i++) {
      var fid = slots[i].getAttribute("data-scene-feature");
      var feature = model && fid ? model.feature(fid) : null;
      var rows = feature && sceneTree
        ? VA.sceneRowsForFeature(sceneTree, feature.node, featureEdgeIds(model, fid)) : [];
      // The body from the model's own status (VA.featureBodyPlan): a bound
      // face with its Correct and Unbind, or Pick a face; the pane's rows
      // only for a suggestion they list.
      var plan = feature ? VA.featureBodyPlan(model, fid, state.topologyId, rows, sceneTree) : null;
      VA.renderFeatureBody(slots[i], rows, { send: sceneRail, plan: plan, command: bodyCommand,
        hoverFace: bodyHoverFace });
    }
    if (!focus) return;
    var rows = nodes.navtree.querySelectorAll(".navtree__scene [data-scene-key]");
    for (var j = 0; j < rows.length; j++) {
      if (rows[j].getAttribute("data-scene-key") !== focus.key) continue;
      var target = focus.part
        ? rows[j].querySelector('[data-scene-part="' + focus.part + '"]') : rows[j];
      if (target && target.focus) target.focus();
      break;
    }
  }

  // A body action, posted to the pane (VA.FEATURE_BODY_VERBS). Nothing here
  // writes: the pane writes the event and posts its record back.
  function bodyCommand(cmd) {
    postToPane(cmd);
  }

  // A bound line hovered lights its face in the scene (`hover face`, which
  // works in either pane mode); leaving it lets go, and the page's own hover
  // is posted again from the state.
  function bodyHoverFace(face) {
    if (face) {
      if (postToPane(["hover", "face", face.sha256, String(face.faceId)])) paneHoverPosted = null;
      return;
    }
    postToPane(HOVER_CLEAR);
    paneHoverPosted = HOVER_CLEAR.join(" ");
    syncPaneHover();
  }

  function onPaneIdentity(msg) {
    if (!msg.projection || typeof msg.projection !== "object") return;
    state.identity = msg.projection;
    if (Array.isArray(msg.installedMeshes)) state.installedMeshes = msg.installedMeshes;
    state.models = VA.buildModels(state.topologies, state.identity);
    renderNav();
  }

  // A row selected FROM THE SCENE and scrolled away from is brought up into
  // the column, once per such selection (revealPending) -- never on a
  // refresh, a nav rebuild or a click in the column itself, which would yank
  // the reader's own scrolling back (Jeff, 2026-11-05 and 2026-11-10).
  function revealNavRow() {
    var fid = revealPending;
    revealPending = null;
    var nav = nodes.navtree;
    if (!fid || !nav || !nav.querySelector) return;
    var row = nav.querySelector('[data-nav-kind="feature"][data-nav-id="' + fid + '"]');
    if (!row || !row.getBoundingClientRect || !nav.getBoundingClientRect) return;
    var n = nav.getBoundingClientRect();
    var r = row.getBoundingClientRect();
    if (r.top >= n.top && r.bottom <= n.bottom) return;
    nav.scrollTop += r.top - n.top - 8;
  }

  // One selection across the seam. The page tells the pane what it has
  // selected with one verb, `model select node <id>` (syncSceneModel), which
  // in sweep mode is the rail's end row for that node; the pane's trees say
  // back whether it holds that row or has let go of it (VA.sceneInspectStep),
  // and a pane that let go is the reader letting go here too (unfreeze, the
  // one way to). With the pane closed no tree arrives, and none of this runs.
  var sceneInspectHeld = null;

  function syncSceneInspect() {
    if (!sceneTree || !flyoutLoaded) return;
    var sel = state.selection;
    var step = VA.sceneInspectStep(sceneTree, sel && sel.kind === "node" ? sel.id : null, sceneInspectHeld);
    sceneInspectHeld = step.held;
    if (step.letGo) unfreeze();
  }

  // --- hover crosses the seam (deliverable 3; the one hover since 2026-11-10)
  //
  // The scene is told the page's ONE hover from the state, never from the
  // pointer (applyFocus -> syncPaneHover): an edge hovered anywhere -- its
  // grid row, its bar -- posts `highlight <topology> <edge>` and the
  // annotator tints that edge's bound face; a part or a body hovered in the
  // tree posts `hover part|body` while a sweep is loaded (the one mode the
  // scene answers them in); a feature's node posts `hover feature <edge>
  // <end>` there, the end's bound face. Nothing hovered posts the clears --
  // the highlight falls back to the page's selected edge on a kinematic
  // page, where it has one, rather than clearing the scene under it.
  //
  // Debounced (VA.PANE_HOVER_DEBOUNCE_MS, trailing) and computed from the
  // state when the timer fires: a pointer sweeping down a table posts
  // nothing until it settles, a command already posted is never posted
  // twice, and a clear is never cancelled by a later move, because the last
  // timer to fire computes it.
  var CLEAR_KEY = VA.annotateHighlightCommand().join(" ");
  var HOVER_CLEAR = ["hover", "clear"];
  var paneHoverTimer = null;
  var paneHighlightPosted = CLEAR_KEY;
  var paneHoverPosted = HOVER_CLEAR.join(" ");

  function paneHighlightCommand() {
    var el = VA.focusElementOf(currentModel(), state.focus.hovered);
    var target = el && el.kind === "edge"
      ? { topologyId: state.topologyId, edgeId: el.id } : selectedPaneTarget();
    return target ? VA.annotateHighlightCommand(target.topologyId, target.edgeId)
      : VA.annotateHighlightCommand();
  }

  // The end a FEATURE is hovered at: its bound end where it has one, else
  // its own first end -- never the other part's edge on a shared node, so a
  // feature with nothing bound lights nothing (handoff a_binding_shows_the_
  // moment_it_is_made_and_is_corrected_where_it_is_shown, deliverable 2).
  function endOfFeature(model, fid) {
    var bound = model.bindingsOf(fid)[0];
    var e = bound || model.endsOf(fid)[0];
    return e ? { edgeId: e.edgeId, direction: e.end } : null;
  }

  // The first edge end at a node, as the pane names an end.
  function endAtNode(nodeId) {
    var index = VA.topologyIndex(currentTopology());
    var ids = Object.keys(index.edges || {}).sort();
    for (var i = 0; i < ids.length; i++) {
      var edge = index.edges[ids[i]];
      if (edge.from === nodeId) return { edgeId: edge.id, direction: VA.EDGE_ENDS.from };
      if (edge.to === nodeId) return { edgeId: edge.id, direction: VA.EDGE_ENDS.to };
    }
    return null;
  }

  function paneHoverCommand() {
    var h = state.focus.hovered;
    var model = currentModel();
    if (!paneRun || !h || !model) return HOVER_CLEAR;
    if (h.kind === VA.FOCUS_KINDS.part) return model.hasMesh(h.id) ? ["hover", "part", h.id] : HOVER_CLEAR;
    if (h.kind === VA.FOCUS_KINDS.body) return sceneSubjects()[h.id] ? ["hover", "body", h.id] : HOVER_CLEAR;
    var el = VA.focusElementOf(model, h);
    if (el && el.kind === "node") {
      var end = h.kind === VA.FOCUS_KINDS.feature ? endOfFeature(model, h.id) : endAtNode(el.id);
      if (end) return ["hover", "feature", end.edgeId, end.direction];
    }
    return HOVER_CLEAR;
  }

  function syncPaneHover() {
    if (paneHoverTimer !== null) clearTimeout(paneHoverTimer);
    var post = function () {
      var highlight = paneHighlightCommand();
      var key = highlight.join(" ");
      if (key !== paneHighlightPosted && postToPane(highlight)) paneHighlightPosted = key;
      var hover = paneHoverCommand();
      var hoverKey = hover.join(" ");
      if (hoverKey !== paneHoverPosted && postToPane(hover)) paneHoverPosted = hoverKey;
    };
    // Nothing hovered posts its clears at once -- a pointer leaving a row
    // and arriving on the next within the debounce would otherwise coalesce
    // the clear away, and the pane would be told the same hover it already
    // holds (or has since dropped). A hover waits for the pointer to settle.
    if (!state.focus.hovered) { paneHoverTimer = null; post(); return; }
    paneHoverTimer = setTimeout(function () { paneHoverTimer = null; post(); }, VA.PANE_HOVER_DEBOUNCE_MS);
  }

  function clearPaneHover() {
    if (paneHoverTimer !== null) clearTimeout(paneHoverTimer);
    paneHoverTimer = null;
    paneHighlightPosted = CLEAR_KEY;
    paneHoverPosted = HOVER_CLEAR.join(" ");
  }

  // A row anywhere else on the page that names an element hovers through one
  // delegated listener; the DAG's and the grid's marks register their own
  // (views/topology.js's hotHover, through ctx.onHot) and the tree's rows
  // theirs (views/nav.js, through onNavHover). A pointer arriving on nothing
  // -- outside the DAG pane and the tree, on no element's row -- lets any
  // hover this page set go, whichever surface set it: there is one pointer,
  // and it is demonstrably here (a mark rebuilt under the pointer by a paint
  // fires no mouseleave when the pointer later leaves it). The scene's own
  // hover is the scene's to clear.
  function wirePageHover() {
    if (typeof document === "undefined" || !document.addEventListener) return;
    document.addEventListener("mouseover", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      if (target.closest("#topopane") || target.closest("#navtree")) return;
      var row = target.closest("[data-row-kind][data-id]");
      var el = row ? VA.parseElementKey(VA.elementKey(row.getAttribute("data-row-kind"),
        row.getAttribute("data-id"))) : null;
      if (el) {
        setHovered(VA.focusEntityOf(currentModel(), el.kind, el.id), "page");
      } else if (state.focus.hovered && hoverSource !== "scene") {
        setHovered(null, hoverSource);
      }
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
  // What the scene was last told, so a paint that changed nothing posts nothing.
  var sceneModelPosted = null;
  var sceneSelectPosted = null;
  // The study-parts filter (`isolate parts …`) last posted. Not reset by the
  // pane's own state replies (its reply to this command would re-post it
  // forever): only by a re-drive, whose goto/sweep clears the pane's scope.
  var partScopePosted = null;
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

  // Leaders are a toolbar preference with an Off (VA.LEADER_STYLES): off,
  // no leader is built on either tier and no scroll or resize re-measures
  // for one -- the one selection and the one hover light the surfaces.
  function leadersOff() {
    return state.leaderStyle === "off";
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
    if (leadersOff() || !nodes.flyout || !nodes.flyout.open || !flyoutFrame || !seamAnchors ||
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
    // The one hover's elements give the lighter emphasis (applyFocus).
    var states = VA.seamLeaderStates(geo.leaders.map(function (l) { return l.id; }),
      state.selection, VA.focusElementKeysOf(currentModel(), state.focus.hovered),
      VA.topologyIndex(topoProj));
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
  // A body's DAG ink as "#rrggbb", off topology.css's `--tv-body-ink-<n>`
  // (VA.sceneTintCommand); null where the page has no computed style.
  function bodyInk(tint) {
    try {
      var v = window.getComputedStyle(document.documentElement)
        .getPropertyValue("--tv-body-ink-" + tint);
      return v ? v.trim() : null;
    } catch (err) {
      return null;
    }
  }

  function syncSceneModel() {
    if (!nodes.flyout || !nodes.flyout.open || !flyoutLoaded) return;
    // ...and each part in its body's DAG ink, so one palette is seen in the
    // DAG, the grid and the scene.
    var model = [VA.sceneLitCommand(pageLitSet()), ["model", "unlit", state.unlitStyle],
      VA.sceneTintCommand(currentTopology(), bodyInk)];
    var key = JSON.stringify(model);
    if (key !== sceneModelPosted && model.every(postToPane)) sceneModelPosted = key;
    var scope = VA.partScopeCommand(VA.litPartIds(currentTopology(), pageLitSet()));
    var scopeKey = scope.join(" ");
    if (state.mode !== "stack" && scopeKey !== partScopePosted && postToPane(scope)) {
      partScopePosted = scopeKey;
    }
    var sel = state.selection && state.selection.kind === "node"
      ? ["model", "select", "node", state.selection.id] : ["model", "select", "clear"];
    var selKey = sel.join(" ");
    if (selKey !== sceneSelectPosted && postToPane(sel)) sceneSelectPosted = selKey;
    // The pane scopes its own element list to the selected node
    // (`filter-element`): in bind mode its list is otherwise the open
    // study's elements, which need not touch the node at all (measured
    // 2026-11-11: the pitch link's lower centre under the pitch-link joint
    // study -- none of its seven elements). The page then cuts a feature's
    // rows out of that list by the edges at its node (VA.sceneRowsForFeature),
    // so the selected feature's body is exactly its node's elements; a second
    // feature row opened in bind mode without being selected has none to
    // show, and the lesson says so. No node selected lifts the scope.
    var scopeTo = state.selection && state.selection.kind === "node"
      ? ["filter-element", state.selection.id] : ["filter-element"];
    var scopeToKey = scopeTo.join(" ");
    if (state.mode !== "stack" && scopeToKey !== sceneFilterPosted && postToPane(scopeTo)) {
      sceneFilterPosted = scopeToKey;
    }
    syncSceneVisibility();
  }

  // The tree's hidden parts, onto the scene: hide what is newly hidden, show
  // what came back, by part id (the pane resolves a part id to its mesh as
  // `isolate parts` does). Posted again from nothing whenever the scene
  // reloads (sceneVisibilityPosted is cleared with the other posted keys).
  var sceneVisibilityPosted = null;
  var sceneFilterPosted = null;
  function syncSceneVisibility() {
    if (!nodes.flyout || !nodes.flyout.open || !flyoutLoaded) return;
    var model = currentModel();
    if (!model) return;
    var hidden = Object.keys(state.hiddenParts).filter(function (p) { return model.hasMesh(p); }).sort();
    var key = hidden.join(" ");
    if (key === sceneVisibilityPosted) return;
    var before = (sceneVisibilityPosted || "").split(" ").filter(Boolean);
    var ok = true;
    before.forEach(function (p) { if (hidden.indexOf(p) === -1) ok = postToPane(["show", p]) && ok; });
    hidden.forEach(function (p) { if (before.indexOf(p) === -1) ok = postToPane(["hide", p]) && ok; });
    if (ok) sceneVisibilityPosted = key;
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
      // The row its seam is above, off the paint's own plan (drawn or not:
      // leaders may be off).
      var seams = VA.lastTopoRender && VA.lastTopoRender.boundaryEdge;
      edgeId = seams ? seams[sel.id] || null : null;
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
    // A bind-mode element row the pane selected is the pane's own binding
    // step ("select this element, then click a face"), under the feature
    // whose body lists it -- not a selection of the edge here, which would
    // close that feature's row over it. (Until 2026-11-11 the mirror's key
    // for an element row carried no edge, so this was the behaviour by
    // accident; it is the behaviour on purpose now.)
    if (String(found || "").indexOf(VA.SCENE_ELEMENT_ROOT) === 0) return;
    var target = VA.sceneRowElement(found, currentTopology(), pageLitSet());
    if (!target) return;
    // The end row of the node already selected here is the pane answering
    // this page's own `model select node` -- an interface stays the
    // interface, not the first feature of its node.
    if (target.kind === "node" && state.selection && state.selection.kind === "node" &&
        state.selection.id === target.id) return;
    // A joint end the pane selected is that node's FEATURE here (the row its
    // body is drawn under, featureEntityOfNode); a contributor or a bind-mode
    // element is its edge. The same entity already selected is nothing new.
    var entity = target.kind === "node" ? featureEntityOfNode(target.id)
      : VA.focusEntityOf(currentModel(), target.kind, target.id);
    if (!entity || VA.sameFocus(entity, state.focus.selected)) return;
    hideCrop();
    selectFromScene(entity);
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
    settleTween();
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
  function fitDag() { settleTween(); fitDagTo(false, false); }

  // The reader's own hand on the drawing (a wheel, Fit) takes over from a
  // transition in flight: it lands where it was going first, and the reader's
  // change is made on that.
  function settleTween() {
    if (respineHandle && !respineHandle.done && respineHandle.finish) respineHandle.finish();
  }

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

  // --- the landing as a frame (the_dag_holds_still_and_the_filter_bar_stays_put)
  //
  // What the reader sees of a study arrival is the DAG, the space put before it
  // (bandPad) and where the page is scrolled. The transition used to move only
  // the DAG: the pad was dropped on its first frame and the landing put it and
  // the scroll back on its last, which is the snap left, the move, the snap
  // back. So the landing is measured on the TARGET layout before the transition
  // starts (VA.animateTopoPane's `landing`), and the pad and the scroll are
  // interpolated with the transition: one continuous frame start to end.
  function dagScrollY() {
    var bounded = paneScroller();
    if (bounded) return bounded.scrollTop;
    return typeof window !== "undefined" ? (window.scrollY || 0) : 0;
  }

  function setDagScroll(y) {
    var bounded = paneScroller();
    if (bounded) bounded.scrollTop = y;
    else if (typeof window !== "undefined" && window.scrollTo) window.scrollTo(window.scrollX || 0, y);
  }

  // The frame on screen right now, read off the drawing itself: its pad is what
  // the sizer wears (not state.bandPad, which a transition in flight already
  // holds at its target), its scroll is where the reader is.
  function dagFrame() {
    var box = zoomBox();
    var sizer = box && box.parentNode;
    var hs = paneHscroll();
    var px = function (v) { return parseFloat(v) || 0; };
    return {
      pad: { top: sizer && sizer.style ? px(sizer.style.marginTop) : 0,
             left: sizer && sizer.style ? px(sizer.style.marginLeft) : 0 },
      scrollX: hs ? hs.scrollLeft : 0,
      scrollY: dagScrollY(),
    };
  }

  // The landing the arrival ends in, worked out on the target laid out at rest:
  // the very landing fitDagTo does, run once, early. The frame the transition
  // starts from is put back afterwards.
  function measureLanding(start, lit) {
    var hs = paneHscroll();
    // A reader parked sideways stays parked (fitDagTo's own rule).
    if (hs) hs.scrollLeft = start.scrollX;
    var end = { pad: { top: 0, left: 0 }, scrollX: start.scrollX, scrollY: null };
    if (lit) {
      fitDagTo(true, true);
      var pad = state.bandPad || { top: 0, left: 0 };
      hs = paneHscroll();
      end = { pad: { top: pad.top || 0, left: pad.left || 0 },
              scrollX: hs ? hs.scrollLeft : 0, scrollY: dagScrollY() };
      setDagScroll(start.scrollY);
    }
    if (hs) hs.scrollLeft = start.scrollX;
    return end;
  }

  function lerp(a, b, e) { return a + (b - a) * e; }

  // The window the drawing is looked at through: what the pane shows of the
  // page, as fitDagTo measures it.
  function viewport() {
    var hs = paneHscroll();
    if (!hs || !nodes.pane || !nodes.pane.getBoundingClientRect) return null;
    var bounded = paneScroller();
    var topEdge = bounded ? nodes.pane.getBoundingClientRect().top
      : VA.stickyOffsets().top;
    var visible = bounded ? nodes.pane.clientHeight
      : (typeof window !== "undefined" ? window.innerHeight : 0) - topEdge;
    return { topEdge: topEdge, visible: visible, width: hs.clientWidth };
  }

  // The hooks VA.animateTopoPane calls (`landing`). `ctx` is this paint's own:
  // the pad goes on it before each frame, the scroll is placed after it. A
  // frame is named by its segment `w` ({ k, u }: how far through which leg of
  // the camera's path), because a landing that has to pull back first has two
  // legs -- start to the pulled-back frame, then on to the arrival -- and the
  // pad and the scroll follow the same path the scale does.
  function landingHooks(ctx, start, lit, known) {
    var end = known || null;
    var mid = null;
    var legs = function (w) {
      var path = mid ? [start, mid, end] : [start, end];
      return [path[w.k], path[w.k + 1]];
    };
    var hooks = {
      target: function () {
        if (!known) end = measureLanding(start, lit);
        // fitDagTo may have scaled the drawing down to fit the band.
        ctx.zoom = state.dagZoom;
        tweenLanded = true;
        pendingLanding = hooks;
      },
      // The scale at which the lit set the reader is leaving AND the one they
      // are arriving at are both in view -- when that is smaller than the
      // lower of the two scales they would otherwise see, so that going
      // straight there would take the one or the other out of the window
      // part-way. Null when going straight is already in view.
      waypoint: function (from, zoomFrom, zoomTo) {
        var vp = viewport();
        var to = VA.lastTopoRender;
        if (!lit || !vp || !from || !from.span || !to || !to.span) return null;
        var top = Math.min(from.span.top, to.span.top);
        var bottom = Math.max(from.span.bottom, to.span.bottom);
        var z = VA.dagFitScale(top, bottom, vp.visible, FIT_PAD);
        var wide = Math.max(from.dagWidth || 0, to.dagWidth || 0);
        if (wide > 0 && vp.width > 0) {
          z = Math.min(z, VA.clampDagZoom((vp.width - FIT_PAD) / wide));
        }
        if (!(z < Math.min(zoomFrom, zoomTo) - VA.RESPINE.fitSlack)) return null;
        mid = { pad: { top: lerp(start.pad.top, end.pad.top, 0.5),
                       left: lerp(start.pad.left, end.pad.left, 0.5) },
                scrollX: lerp(start.scrollX, end.scrollX, 0.5),
                scrollY: lerp(start.scrollY, end.scrollY === null ? start.scrollY : end.scrollY, 0.5),
                union: { top: top, bottom: bottom }, zoom: z };
        return z;
      },
      // The pulled-back frame is on screen: scroll so the two lit sets' union
      // is centred in the window, as far as the page can reach.
      midRendered: function () {
        var box = zoomBox();
        var drawn = VA.lastTopoRender;
        var vp = viewport();
        if (!mid || !box || !drawn || !drawn.span || !vp) return;
        var r = box.getBoundingClientRect();
        var yCentre = (mid.union.top + mid.union.bottom) / 2;
        var seen = r.top + drawn.span.at(mid.zoom).top + mid.zoom * (yCentre - drawn.span.top);
        mid.scrollY = Math.max(0, dagScrollY() + seen - (vp.topEdge + vp.visible / 2));
      },
      frame: function (e, w) {
        var l = legs(w || { k: 0, u: e });
        var u = w ? w.u : e;
        ctx.bandPad = { top: lerp(l[0].pad.top, l[1].pad.top, u),
                        left: lerp(l[0].pad.left, l[1].pad.left, u) };
      },
      placed: function (e, w) {
        var l = legs(w || { k: 0, u: e });
        var u = w ? w.u : e;
        var hs = paneHscroll();
        if (hs) {
          hs.scrollLeft = lerp(l[0].scrollX, l[1].scrollX, u);
          // The ghost shows the same window as the live pane over it.
          var ghost = nodes.pane.querySelector ? nodes.pane.querySelector(".tv__ghost .tv__hscroll") : null;
          if (ghost) ghost.scrollLeft = hs.scrollLeft;
        }
        if (end.scrollY !== null) setDagScroll(lerp(l[0].scrollY, l[1].scrollY, u));
        if (e >= 1 && pendingLanding === hooks) pendingLanding = null;
      },
      // A paint that is not a transition cut this one short: the scroll goes
      // where the landing was going (the pad already did, through state).
      finish: function () { if (end) hooks.placed(1, { k: mid ? 1 : 0, u: 1 }); },
    };
    return hooks;
  }
  // The breathing room Fit keeps at each end of the lit span.
  var FIT_PAD = 12;
  // Every other landing -- the 3D pane opening or closing beside the drawing --
  // goes through the same transition a study change does. The change is made
  // as it always was, synchronously, and the frame it left (`beginGlide`, taken
  // BEFORE it) and the frame it arrived at (`endGlide`, after) are then
  // travelled between instead of stepped across: pad, scroll and scale, on the
  // keyframe tween, with no outgoing picture to fade (the rows are the same).
  function beginGlide() {
    settleTween();
    return { from: VA.lastTopoRender, start: dagFrame() };
  }

  function endGlide(g) {
    if (!g || !g.from || !g.from.positions || !paneCtx || !nodes.pane) return;
    var end = dagFrame();
    var moved = Math.abs(end.pad.top - g.start.pad.top) > 0.5 ||
      Math.abs(end.pad.left - g.start.pad.left) > 0.5 ||
      Math.abs(end.scrollX - g.start.scrollX) > 0.5 ||
      Math.abs(end.scrollY - g.start.scrollY) > 0.5 ||
      state.dagZoom !== g.from.zoom;
    if (!moved) return;
    var ctx = Object.assign({}, paneCtx, { zoom: state.dagZoom,
      bandPad: state.bandPad ? { top: state.bandPad.top, left: state.bandPad.left } : null,
      tween: null });
    var hooks = landingHooks(ctx, g.start, true, end);
    respineHandle = VA.animateTopoPane(nodes.pane, ctx, g.from, {
      onError: renderCrash, landing: hooks, ghost: false });
    tweenLanded = false;
  }
  // The context the pane was last painted from: a glide repaints from it.
  var paneCtx = null;
  var pendingLanding = null;
  // Set when this paint's transition has taken the landing on itself.
  var tweenLanded = false;

  function fitDagTo(keepSideways, centre) {
    var box = zoomBox();
    var hscroll = paneHscroll();
    var drawn = VA.lastTopoRender;
    if (!box || !hscroll || !drawn || !drawn.span || !box.getBoundingClientRect) return;
    var bounded = paneScroller();
    var vp = viewport();
    var topEdge = vp.topEdge;
    var visible = vp.visible;
    var pad = FIT_PAD;
    // The DAG's lit span: only the DAG scales (2026-10-29), so the grid
    // beside it is not part of what a scale can fit.
    var to = VA.dagFitScale(drawn.span.top, drawn.span.bottom, visible, pad);
    // Both axes: the DAG's own width must fit the pane too. Fit -- the
    // reader's own ask -- also leaves the grid its floor beside it
    // (VA.dagFitWidth), so the drawing and PART..ELEMENT share the pane. A
    // study's arrival does not: it is measured off the outgoing layout, and
    // a floor applied there ratchets the zoom down a little on every arrival
    // and moves the first frame of the transition.
    if (drawn.dagWidth > 0 && hscroll.clientWidth > 0) {
      var room = centre ? hscroll.clientWidth : VA.dagFitWidth(hscroll.clientWidth);
      to = Math.min(to, VA.clampDagZoom((room - pad) / drawn.dagWidth));
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
      // Sideways, the drawing stays at the strip's left edge, with the grid
      // beside it: a band already on screen is not moved at all, and one
      // off either edge (a reader zoomed in) is brought just inside it. It
      // used to be centred in the pane, with space put before the drawing
      // when the scroll could not reach -- which pushed the grid right by the
      // same amount, up to two thirds of a 737px pane at 1600 wide
      // (the_grid_fits_the_screen_and_its_brackets_say_what_nests_in_what).
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
          if (x1 < hr.left + pad) dx = x1 - hr.left - pad;
          else if (x2 > hr.right - pad) dx = Math.min(x2 - hr.right + pad, x1 - hr.left - pad);
          dyBand = (y1 + y2) / 2;
        }
        return { dx: dx, dy: dyBand - (topEdge + visible / 2) };
      };
      // A reader parked sideways stays where they are (the 10-28 contract,
      // carried across a respine): only the vertical half centres for them.
      var parked = hscroll.scrollLeft > 0;
      var off = bandOffset();
      scrollDag(parked ? 0 : off.dx, off.dy);
      // Whatever the scroll could not reach -- a band that sits above the
      // centre with nothing further to scroll back to -- is taken up by space
      // above the drawing. It is kept in state.bandPad so a repaint redraws
      // it; the next study change drops it. Never space to its LEFT: that is
      // space between the pane's edge and the grid too.
      off = bandOffset();
      var sizer = box.parentNode;
      var top = off.dy < -0.5 ? -off.dy : 0;
      var left = 0;
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
    // Pan: a drag that starts on the drawing's own empty space -- the SVG and
    // its body fields, never a bar, dot or leader, which are the controls.
    var drag = null;
    nodes.pane.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !event.target || !event.target.closest) return;
      var t = event.target;
      var empty = t.tagName === "svg" || (t.classList && (
        t.classList.contains("tv__bodyfield") ||
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
      // Leaders off: nothing to re-measure (leadersOff).
      if (!leadersOff()) scheduleSeamDraw();
    }, true);
    if (typeof ResizeObserver === "function") {
      var observer = new ResizeObserver(function () {
        // The pane's width moved with no repaint (the 3D pane opened or
        // closed, a divider dragged): its zoom box's floor moves with it.
        if (nodes.pane) VA.sizeTopoZoomBox(nodes.pane);
        if (!leadersOff()) scheduleSeamDraw();
      });
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
  //
  // ...and the grid beside it, through its ELEMENT column (the_demo_path_
  // reads_cleanly_on_a_projector): at 1920 wide the scene kept only the
  // drawing, and the grid beside an open pane showed nothing but its body
  // labels. VA.gridKeptWidth is the columns' own sum, so no scroll position
  // and no half-laid-out row can make it read short.
  function graphNeed() {
    var rails = nodes.pane && nodes.pane.querySelector
      ? nodes.pane.querySelector("svg.tv__rails") : null;
    var box = rails && rails.getBoundingClientRect
      ? rails.getBoundingClientRect() : null;
    return box && box.width > 0 ? Math.round(box.width) + VA.gridKeptWidth() : 0;
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
    var respineStart = respineFrom;
    respineFrom = null;
    // The frame the reader is looking at, before anything below changes it: a
    // transition starts from it (a pad of its own, not state.bandPad).
    var startFrame = respineStart ? dagFrame() : null;
    if (respineHandle) {
      respineHandle.cancel();
      respineHandle = null;
      // Cut short by something that is not itself a transition: the landing
      // still happens. Cut short by another transition, that one starts from
      // the frame on screen instead.
      if (pendingLanding && !respineStart) pendingLanding.finish();
      pendingLanding = null;
    }
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
    var livePoseIndex = showKinematic ? poseIndex(kinematicStudy) : null;
    // A pose this page wrote into the URL leaves with the study.
    if (!showKinematic && poseUrlWritten) writePoseUrl(null, null);
    var kinematicStack = showKinematic && topoProj
      ? VA.kinematicStack(kinematicStudy, topoProj, state.kinematicStop,
          state.kinematic && state.kinematic.display_decimals,
          VA.readSubStackFolds(widthStore(), state.kinematicId), livePoseIndex)
      : null;

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

    repaintDag = null;
    if (showDag) {
      // Which containers are drawn (VA.GROUP_KINDS): the reader's own set for
      // this topology, else every kind. Every study of the topology has a
      // group to offer; the pane filters them by kind.
      var groupKinds = topoProj ? VA.readGroupKinds(widthStore(), topoProj.id) : null;
      // The colour overlay's inputs beyond the topology: a kinematic page's
      // contribution per edge at its stop (VA.kinematicContributions).
      // ...at the live pose (VA.kinematicContributions), which the
      // contribution length mode draws its bars from too.
      var overlayOptions = {
        contributions: showKinematic
          ? VA.kinematicContributions(kinematicStudy, state.kinematicStop, livePoseIndex)
          : null,
        units: kinematicStudy ? kinematicStudy.units || null : null,
      };
      // ...and the contribution length mode's bars (VA.kinematicPoseLengths).
      var poseLengths = showKinematic && livePoseIndex !== null
        ? VA.kinematicPoseLengths(kinematicStudy, livePoseIndex) : null;
      var lengthMode = VA.edgeLengthModeFor(state.edgeLengthMode, !!poseLengths);
      var ctx = {
        groupKinds: groupKinds,
        colourBy: state.dagView.colourBy,
        groupFill: state.dagView.groupFill,
        partDrawing: state.dagView.partDrawing,
        contributions: overlayOptions.contributions,
        contributionUnits: overlayOptions.units,
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
        // ...and the study a kinematic page's records read their contributor
        // rows from (VA.elementRecord's `kinematicStudy`).
        kinematicStudy: showKinematic ? kinematicStudy : null,
        decimals: state.kinematic ? state.kinematic.display_decimals : undefined,
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
        // The kinematic page's grid: its stack at the chosen stop
        // (VA.kinematicStack), folded as this reader left it. The DAG's dashed
        // field for a sub-study and the grid's header row for it read the one
        // open state (`openSubStacks`, off the stack) and write the one store.
        stack: kinematicStack,
        openSubStacks: VA.stackOpenMap(kinematicStack),
        onToggleSubStack: toggleSubStack,
        // The same config the stack pane and the popovers get: since the
        // preview pane started rendering the crop's links through the shared
        // VA.cropReference (viewer_component_names_and_reference_copy) it
        // needs the drawing-checker base URL like every other crop surface.
        config: VA.CONFIG,
        selection: state.selection,
        detailImage: state.detailImage, edgeValueOnly: state.edgeValueOnly,
        edgeLengthMode: lengthMode,
        lengths: poseLengths,
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
        // ...and the Preview, which shows whatever is hovered or focused on
        // any tier and returns to the frozen element when nothing is.
        onHot: function (key) {
          // A mark's or a row's element, as the entity it is; a rail's key
          // (`rail|<i>`) is no element and reads as the pointer on nothing.
          var el = VA.parseElementKey(key);
          setHovered(el ? VA.focusEntityOf(currentModel(), el.kind, el.id) : null, "dag");
        },
        // A paint (a transition's frames included) rebuilt the marks: lit
        // again from the one state, and the leaders re-drawn.
        onPainted: function () { scheduleSeamDraw(); applyFocus(); },
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
        // The length mode the pane draws, which is the page's default until
        // the reader picks one (VA.edgeLengthModeFor).
        edgeLengthMode: lengthMode,
        // The view popover (VA.COLOUR_SCHEMES, VA.PALETTES, VA.GROUP_FILLS,
        // VA.GRAPH_WIDTHS) and the overlay's key beside it.
        dagView: Object.assign({}, state.dagView, {
          schemes: VA.availableColourSchemes(overlayOptions),
          legend: VA.dagOverlay(state.dagView.colourBy, topoProj, overlayOptions).legend,
        }),
        // Every setting re-renders: the width moves the leaders and the
        // grid's seam, the overlay its key. The popover is put back open.
        onDagView: function (setting, value) {
          state.dagView[setting] = value;
          VA.writeDagView(widthStore(), state.dagView);
          if (setting === "graphWidth") VA.applyGraphWidth(value);
          if (setting === "palette") applyPalette();
          render();
          var menu = typeof document !== "undefined" && document.getElementById &&
            document.getElementById("dag-view");
          if (menu && menu.setAttribute) menu.setAttribute("open", "");
        },
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
        // modes in VA.EDGE_LENGTH_MODES' own `next` order (VA.nextEdgeLengthMode skips
        // contribution on a page with no lengths to draw). Same
        // reasoning as density again — WHICH rows are on screen never
        // changes, only how tall the DAG's slots are — so render(), not
        // rewind().
        onFit: fitDag,
        onEdgeLength: function () {
          state.edgeLengthMode = VA.nextEdgeLengthMode(lengthMode, !!poseLengths);
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
        if (rewound) VA.renderTopoToolbar(nodes.toolbar, state, topoProj, toolbarHandlers);
        VA.renderTopoPane(nodes.pane, ctx);
        if (rewound) nodes.pane.scrollTop = 0;
        syncSceneModel();
        applyFocus();
      };
      if (showTopology) VA.renderTopoJoint(nodes.topojoint, topoProj, study);
      paneCtx = ctx;
      if (respineStart && respineStart.topologyId === topoProj.id) {
        // `onError` puts an animation frame's throw on the SAME seam every
        // other render on this page uses: a frame runs off a rAF callback,
        // outside render()'s try/catch, so without this it would be an
        // unhandled error with the pane frozen mid-transition.
        var arrives = ctx.lit || VA.studyLitSet(ctx.study, topoProj);
        tweenLanded = false;
        respineHandle = VA.animateTopoPane(nodes.pane, ctx, respineStart, {
          onError: renderCrash,
          landing: landingHooks(ctx, startFrame, !!arrives),
        });
      } else {
        VA.renderTopoPane(nodes.pane, ctx);
      }
      // Arriving at a study re-arranges the walk around it (VA.bandLayout),
      // and the band is then framed (Fit) once the transition has settled:
      // the point of the band is that the whole study is on screen without
      // scrolling. Any other paint leaves the reader's zoom alone.
      if (serialisation() !== paintedSerialisation && !tweenLanded &&
          (ctx.lit || VA.studyLitSet(ctx.study, topoProj))) {
        landingPending = true;
      }
      tweenLanded = false;
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
      // Split: the results scroll above, the Preview stays below (topology.css).
      nodes.detail.className = showDag ? "detail detail--split" : "detail";
      if (showKinematic) {
        var kinematicCtx = {
          kinematic: state.kinematic,
          study: kinematicStudy,
          topologies: state.topologies,
          selection: state.selection,
          // Which stop the grid's stack is shown at, and the control that
          // picks it -- which puts the pose on that stop.
          stackStop: kinematicStack ? kinematicStack.stop.id : null,
          onStackStop: function (stopId) {
            stopPlay();
            state.kinematicStop = stopId;
            setPose(VA.kinematicStopPose(kinematicStudy, stopId));
            render();
          },
          // The pose read-out (VA.kinematicPose): where the page is read, and
          // a typed angle, which pauses the pane and seeks it there.
          pose: livePoseIndex !== null ? VA.kinematicPose(kinematicStudy, livePoseIndex) : null,
          onPose: function (index) {
            stopPlay();
            setPose(index);
            render();
          },
          // One muted line when the pane is on another run's frames.
          poseNote: paneRunMismatch
            ? "The 3D pane shows run " + paneRunMismatch + ", not this study's; its poses are not applied"
            : null,
          annotateMount: state.annotateMount,
          onAttach3d: launchAnnotate,
          onCardShow: showCard,
          // The repo's documents are reachable exactly where a worksheet is.
          docsHref: canReadWorksheets ? docsHref : null,
          // The run's own file, where this transport serves one (the export
          // control is absent where it does not).
          readSweep: typeof adapter.readDataJson === "function"
            ? function (runId) {
              return adapter.readDataJson("kinematic/sweeps/" + runId + ".json");
            } : null,
        };
        nodes.detail.appendChild(VA.renderKinematicResults(VA.el("section"), kinematicCtx));
      } else if (study) {
        var chainResults = VA.el("section", "detail__results");
        chainResults.appendChild(VA.verdictStrip(VA.chainVerdictItems(study), { onCardShow: showCard }));
        nodes.detail.appendChild(chainResults);
      }
      if (showDag) {
        // The Preview (a_preview_pane_replaces_the_hover_popups_and_one_
        // record_backs_every_mark): under a rule, below the results. It shows
        // whatever is hovered or focused on any tier -- a DAG mark, a grid
        // row, a 3D anchor -- and the frozen (selected) element otherwise.
        mountPreview(ctx);
        ensureThumbImages(topoProj);
      } else {
        unmountPreview();
      }
    }
    if (!showDag && !showKinematic) unmountPreview();
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

    VA.syncStickyOffsets();

    // What this paint put on screen, for the no-op guard in respine() above.
    // A transition's own frames do not come through paint(), so this stays
    // the target's throughout one.
    paintedSerialisation = serialisation();

    // The seam's tab, and an open pane following what was just selected --
    // after the paint, so the views' own state is settled.
    syncPaneHandle();
    followSelection();
    followSeam();
    // Everything just drawn, lit from the one selection and the one hover --
    // the hover kept only where the pointer still is (revalidateHover).
    revalidateHover();
    applyFocus();
    // A kinematic DAG that moves with the pose builds its film while idle.
    if (state.mode === "kinematic" && (!respineHandle || respineHandle.done)) prebuildFilm();
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
      // The model tree's own gestures (views/nav.js).
      onToggle: onNavToggle,
      onFeature: onNavFeature,
      onInterface: onNavInterface,
      onHover: onNavHover,
      // Show/hide in 3D: only while the scene is open, where it means something.
      onVisibility: nodes.flyout && nodes.flyout.open ? onNavVisibility : null,
      // The 3D control on each row: only where the scene is mounted.
      on3D: state.annotateMount ? onNav3D : null,
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
      // Standing bindings that name an edge no model has, or a mesh not
      // installed: one line at the foot of the tree (VA.orphanBindings).
      orphans: VA.orphanBindings(state.identity, state.topologies, state.installedMeshes),
    });
    renderSceneSlot();
    revealNavRow();
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
  // grid's header row: the reader's choice for this study, remembered
  // (VA.writeSubStackFolds), one repaint, both surfaces follow. `open` is the
  // state asked for; absent, the opposite of what the page shows now.
  function toggleSubStack(id, open) {
    var study = VA.findKinematicStudy(state.kinematic, state.kinematicId);
    if (!study) return;
    var choices = VA.readSubStackFolds(widthStore(), study.id);
    if (open === undefined) {
      var shown = VA.stackOpenMap(VA.kinematicStack(study, currentTopology(),
        state.kinematicStop, state.kinematic && state.kinematic.display_decimals, choices,
        poseIndex(study)));
      open = !shown[id];
    }
    choices[id] = !!open;
    VA.writeSubStackFolds(widthStore(), study.id, choices);
    render();
  }

  // --- the pose (the_grid_and_the_dag_move_with_the_mechanism) ---------------
  //
  // One pose per kinematic page (state.kinematicPose), and four readers of it:
  // the grid's numbers, the DAG (in the contribution length mode its bars are
  // the contributions at the pose; a contribution colouring reads them too),
  // the chart's cursor and the 3D pane, which is told the pose's driver value
  // with its own `seek`. A settled pose -- a typed angle, a slider's release,
  // a stop button, a pause -- is a plain render(). A MOVING one -- a drag, a
  // frame of play -- is livePose(): the grid's text rewritten in place
  // (VA.applyStackText), the DAG eased between keyframes rendered off screen
  // (VA.poseFilm), the control's marks moved (VA.syncPoseControl). No pane
  // rebuild per frame: that is what the tween handoff measured and removed.
  var poseFilm = null;
  var poseFilmCtx = null;
  var panePosePosted = null;
  // The URL as the page was opened, so a pose written into it can be taken
  // back out when the page leaves the study.
  var poseUrlWritten = false;

  function poseStudy() {
    return state.mode === "kinematic"
      ? VA.findKinematicStudy(state.kinematic, state.kinematicId) : null;
  }

  // The pose the page is read at: the one the reader set, else the shown
  // stop's own point.
  function poseIndex(study) {
    if (!study || !VA.kinematicPoseCount(study)) return null;
    if (typeof state.kinematicPose === "number") return state.kinematicPose;
    var stops = study.stops || [];
    if (!stops.length) return null;
    return VA.kinematicStopPose(study, state.kinematicStop || stops[0].id);
  }

  // A settled pose: held, its stop taken as the grid's when it is on one, and
  // written into the URL (VA.poseSearch) so a link -- a lesson's, a
  // filmstrip's -- can cite it.
  function setPose(index) {
    var study = poseStudy();
    state.kinematicPose = typeof index === "number" ? index : null;
    var pose = study && state.kinematicPose !== null
      ? VA.kinematicPose(study, state.kinematicPose) : null;
    if (pose && pose.stop) state.kinematicStop = pose.stop;
    writePoseUrl(study, pose);
  }

  function writePoseUrl(study, pose) {
    if (typeof window === "undefined" || !window.history || !window.history.replaceState ||
        !window.location) return;
    var search = VA.poseSearch(window.location.search, study ? study.id : null,
      study && pose ? VA.kinematicNumber(pose.measure, VA.KINEMATIC_POSE.angleDecimals) : null);
    if (search === window.location.search) return;
    poseUrlWritten = !!(study && pose);
    try {
      window.history.replaceState(window.history.state, "",
        window.location.pathname + search + (window.location.hash || ""));
    } catch (err) {
      // A page that cannot rewrite its URL (file://, a sandbox) still poses.
    }
  }

  // The 3D pane told the pose: its driver value, through the pane's own
  // `seek` -- posted only when it moved, and again after the pane reloads
  // what it shows (wirePaneState forgets what was posted).
  function syncPanePose(study, pose) {
    if (state.mode !== "kinematic" || !pose || typeof pose.driver !== "number") return;
    // An index read against another run's frames is a silent wrong frame.
    if (paneRun && study && study.sweep && study.sweep.run_id && paneRun !== study.sweep.run_id) {
      return;
    }
    // The pane is the clock while it plays, and a pose it already holds is
    // not told back to it.
    if (panePlaying || (paneDriver !== null && Math.abs(paneDriver - pose.driver) < 1e-6)) return;
    var text = String(pose.driver);
    if (text === panePosePosted) return;
    if (postToPane(["seek", text])) panePosePosted = text;
  }

  // The DAG's pose film for the pane on screen, built the first time a pose
  // moves after a paint (VA.poseFilm), or false where this paint's DAG does
  // not move with the pose or its keyframes would not pair.
  function filmFor(study, topo, drawnStop, decimals, folds) {
    if (poseFilm !== null && poseFilmCtx === paneCtx &&
        (poseFilm === false || poseFilm.valid())) return poseFilm;
    var builder = builderFor(study, topo, drawnStop, decimals, folds);
    // A film not yet built is built one keyframe a frame, not all at once:
    // rendering the rest in one frame stalls the pane's play for seconds on a
    // loaded box (the page then shows poses the pane left long ago). The DAG
    // joins the grid, the chart and the pane when the film is ready.
    if (builder && builder.valid() && !builder.done()) {
      try { builder.step(); } catch (err) { poseFilmCtx = paneCtx; poseFilm = false; return false; }
      if (!builder.done()) return false;
    }
    poseFilmCtx = paneCtx;
    poseFilm = builder && builder.valid() ? builder.finish() || false : false;
    return poseFilm;
  }

  // The film's builder for the pane on screen (VA.poseFilmBuilder), made once
  // per paint, or null where this paint's DAG does not move with the pose.
  var poseFilmBuilder = null;
  var poseFilmBuilderCtx = null;

  function builderFor(study, topo, drawnStop, decimals, folds) {
    if (poseFilmBuilderCtx === paneCtx) return poseFilmBuilder;
    poseFilmBuilderCtx = paneCtx;
    poseFilmBuilder = null;
    var lengths = VA.EDGE_LENGTH_MODES[paneCtx.edgeLengthMode] || {};
    var scheme = VA.colourScheme ? VA.colourScheme(paneCtx.colourBy) : null;
    if (!lengths.contributions && !(scheme && scheme.available)) return null;
    var count = VA.kinematicPoseCount(study);
    var keys = [];
    for (var k = 0; k < VA.KINEMATIC_POSE.filmKeys; k++) {
      keys.push((count - 1) * k / (VA.KINEMATIC_POSE.filmKeys - 1));
    }
    var ctx = paneCtx;
    poseFilmBuilder = VA.poseFilmBuilder(nodes.pane, function (index) {
      var at = framePose(study, index, drawnStop);
      var stack = VA.kinematicStack(study, topo, drawnStop, decimals, folds, at);
      return Object.assign({}, ctx, {
        stack: stack, openSubStacks: VA.stackOpenMap(stack),
        contributions: VA.kinematicContributions(study, drawnStop, at),
        lengths: VA.kinematicPoseLengths(study, at),
        onPainted: null, onHot: null, tween: null,
      });
    }, keys);
    return poseFilmBuilder;
  }

  // After a settled kinematic paint, the film's keyframes are rendered in
  // idle time, one per idle slot, so Play and a drag start on a film that is
  // already there (measured: twelve keyframes built at the first frame of
  // play stalled it 3.3 s on a loaded box).
  function prebuildFilm() {
    var study = poseStudy();
    var topo = currentTopology();
    if (!study || !topo || !paneCtx || !paneCtx.stack) return;
    var ctx = paneCtx;
    var builder = builderFor(study, topo, paneCtx.stack.stop.id,
      state.kinematic && state.kinematic.display_decimals,
      VA.readSubStackFolds(widthStore(), study.id));
    if (!builder) return;
    var idle = typeof window !== "undefined" && window.requestIdleCallback
      ? function (fn) { window.requestIdleCallback(fn, { timeout: 2000 }); }
      : function (fn) { setTimeout(fn, 50); };
    var next = function () {
      if (paneCtx !== ctx || !builder.valid() || builder.done() || panePlaying) return;
      try { builder.step(); } catch (err) { return; }
      idle(next);
    };
    idle(next);
  }

  // A pose for a frame: on a stop's point it is that stop only when the pane
  // on screen is drawn at it -- the two stops' stacks are different rows, and
  // a frame of play never changes rows. The settled render that follows does.
  function framePose(study, index, drawnStop) {
    var pose = VA.kinematicPose(study, index);
    return pose && pose.stop && pose.stop !== drawnStop
      ? Object.assign({}, pose, { stop: null }) : pose;
  }

  // A moving pose, one frame of it.
  function livePose(index, fromPane) {
    var study = poseStudy();
    var topo = currentTopology();
    if (!study || !topo || !paneCtx || !paneCtx.stack) return;
    state.kinematicPose = index;
    var drawnStop = paneCtx.stack.stop.id;
    var pose = framePose(study, index, drawnStop);
    var decimals = state.kinematic && state.kinematic.display_decimals;
    var folds = VA.readSubStackFolds(widthStore(), study.id);
    var stack = VA.kinematicStack(study, topo, drawnStop, decimals, folds, pose);
    var film = filmFor(study, topo, drawnStop, decimals, folds);
    // The pane's own ctx follows, so a repaint mid-play draws this pose.
    paneCtx.stack = stack;
    paneCtx.contributions = VA.kinematicContributions(study, drawnStop, pose);
    paneCtx.lengths = VA.kinematicPoseLengths(study, pose);
    if (film) film.apply(pose.index);
    VA.applyStackText(nodes.pane, stack);
    VA.syncPoseControl(nodes.detail, study, VA.kinematicPose(study, index), panePlaying);
    scheduleSeamDraw();
    // The pane's own pose is not told back to it: it is the one moving it.
    if (!fromPane) syncPanePose(study, pose);
  }

  // The pane's transport is the transport (the_linkage_play_control_is_the_only_
  // one_and_it_moves_everything): it owns the clock and the one pose, and tells
  // this page where it is ({type: "annotate:pose", run, index, driver,
  // playing}) on every frame, seek and step. A frame of it is livePose(); the
  // pose it stops at is settled -- held, put in the URL, rendered -- once the
  // pane has paused or a scrub has gone quiet. There is no second loop here, so
  // a pause cannot reach one reader and miss another.
  var POSE_SETTLE_MS = 160;
  var panePlaying = false;
  var paneRun = null;
  // The topology the pane's run plays on (its `annotate:state`).
  var paneTopology = null;
  var paneDriver = null;
  var settleTimer = null;
  // The run the pane reported when it is not the study's: the page refuses its
  // poses and says so in one muted line.
  var paneRunMismatch = null;

  // The pane posts a pose on every one of its frames, and a page that drew
  // each one in turn would fall behind the pane the moment a draw took longer
  // than a frame (the messages queue; the page then shows frames the pane left
  // long ago). So the page keeps the LATEST pose it was told and draws it once
  // per display frame -- never behind the pane by more than the one it is
  // drawing, whatever the draw costs.
  var panePoseLatest = null;
  var panePoseScheduled = false;

  function onPanePose(msg) {
    panePoseLatest = msg;
    if (panePoseScheduled) return;
    panePoseScheduled = true;
    poseFrame(function () {
      panePoseScheduled = false;
      var latest = panePoseLatest;
      panePoseLatest = null;
      if (latest) applyPanePose(latest);
    });
  }

  function poseFrame(fn) {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(fn);
    } else {
      setTimeout(function () { fn(Date.now()); }, 16);
    }
  }

  function applyPanePose(msg) {
    var study = poseStudy();
    if (!study) return;
    var runId = study.sweep && study.sweep.run_id;
    var mismatch = runId && msg.run && msg.run !== runId ? msg.run : null;
    if (mismatch !== paneRunMismatch) {
      paneRunMismatch = mismatch;
      if (mismatch && typeof console !== "undefined" && console.warn) {
        console.warn("annotate:pose: the pane is on run " + mismatch + " and this study " +
          "was folded from " + runId + "; its poses are not applied");
      }
      render();
    }
    if (mismatch) return;
    var index = typeof msg.driver === "number" ? VA.kinematicPoseOfDriver(study, msg.driver) : null;
    if (index === null) return;
    var was = panePlaying;
    panePlaying = !!msg.playing;
    // What the pane holds, so the page never seeks it back to where it is.
    panePosePosted = String(msg.driver);
    paneDriver = msg.driver;
    if (panePlaying) {
      cancelSettle();
      try { livePose(index, true); } catch (err) { panePlaying = false; renderCrash(err); }
    } else if (was) {
      cancelSettle();
      setPose(index);
      render();
    } else if (!heldPoseIs(study, index)) {
      // A scrub or a step with the pane paused: moved live, settled when quiet.
      livePose(index, true);
      cancelSettle();
      settleTimer = setTimeout(function () {
        settleTimer = null;
        if (typeof state.kinematicPose === "number" && poseStudy() === study) {
          setPose(state.kinematicPose);
          render();
        }
      }, POSE_SETTLE_MS);
    }
  }

  // Whether the page already holds this pose -- by what it holds (the default
  // stop's pose included), not by what it has written to the URL. A pane that
  // only repeats it (its first message after it reports its state) moves and
  // writes nothing: the reader has done nothing yet.
  function heldPoseIs(study, index) {
    var held = poseIndex(study);
    return typeof held === "number" && Math.abs(held - index) <= 1e-6;
  }

  function cancelSettle() {
    if (settleTimer !== null) { clearTimeout(settleTimer); settleTimer = null; }
  }

  // Pauses the pane's transport -- a reader setting the pose another way (a
  // typed angle, a stop) takes it from the clock; true when it was playing.
  function stopPlay() {
    cancelSettle();
    if (!panePlaying) return false;
    panePlaying = false;
    postToPane(["pause"]);
    return true;
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
