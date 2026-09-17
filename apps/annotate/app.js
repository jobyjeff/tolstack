// Boot + wiring for the annotate page. ES module (see scene.js's docstring
// for why this app has no file:// constraint to design around); reads the
// classic-script globals (AA.CONFIG, AA.FsaAdapter, AA.MemoryAdapter,
// AA.FIXTURES, AA.CommandLayer, AA.*) that index.html loads before this file.
//
// Every scene/navigation operation the UI offers is a command-layer verb
// (commands.js) -- this file's job is to REGISTER the handlers (they close
// over `state`/`scene`/`storage`, so they live here, not in the DOM-free
// commands.js) and make every click, the deep-link boot sequence and the dev
// console call `exec()` instead of touching state directly. That is the
// architectural deliverable (handoff annotate_deep_link_and_part_filter,
// deliverable 1): a future vision-agent driver is a fourth caller of the same
// verbs, not a fourth code path.
import { AnnotateScene } from "./scene.js";

const AA = window.AnnotateApp;

const params = new URLSearchParams(location.search);
const MOCK = params.get("mock") === "1";

const el = {
  banner: document.getElementById("banner"),
  connectBtn: document.getElementById("connect-btn"),
  transportSub: document.getElementById("transport-sub"),
  // The whole bind workspace, as one node (index.html's #workspace) -- see
  // main()'s hosted branch for why it is addressed as a single thing.
  workspace: document.getElementById("workspace"),
  topologySelect: document.getElementById("topology-select"),
  studySelect: document.getElementById("study-select"),
  elementList: document.getElementById("element-list"),
  canvasHost: document.getElementById("canvas-host"),
  sceneEmpty: document.getElementById("scene-empty"),
  partsPanel: document.getElementById("parts-panel"),
  // The rail's scope bar (deliverable 2): what the rail is filtered to, and
  // the control that lifts it. Rendered EMPTY and hidden when nothing is
  // filtered -- an absent filter shows nothing about filtering.
  railFilter: document.getElementById("rail-filter"),
  // One shared hover popup for every consolidated alert badge on the rail
  // (deliverable 5) -- position: fixed, placed by JS, the same one-node shape
  // apps/viewer's own popover machinery uses.
  alertPop: document.getElementById("alert-pop"),
  detail: document.getElementById("detail"),
  consoleInput: document.getElementById("console-input"),
  consoleRun: document.getElementById("console-run"),
  consoleOutput: document.getElementById("console-output"),
};

const state = {
  storage: null,
  scene: null,
  topologyProjection: null,
  identityProjection: null,
  // Events written THIS session, folded in-memory on top of identityProjection
  // for immediate feedback -- an OPTIMISTIC view only. The authoritative fold
  // is tolerance_stack.feature_identity.build_projection, run by
  // scripts/build_feature_identity_projection.py against the real committed
  // event file; this app never re-implements that fold, it just doesn't want
  // a bound row to look unbound until the next rebuild.
  sessionEvents: [],
  currentTopology: null,
  currentStudy: null,
  selectedEdge: null,
  // The rail's scope, or null for "the whole study and every installed mesh"
  // -- AA.planPanelFilter's plan, as returned, so the two renderers read one
  // decision rather than each re-deriving which rows belong to an element.
  panelFilter: null,
  currentPick: null, // { sha256, faceId, record }
  // Cached listMeshes() result -- the command layer resolves "sha256 or
  // part_id" against this rather than re-reading storage on every command, so
  // `camera frame <part>`/`isolate <part>` stay synchronous once the mesh
  // list is loaded. Refreshed once per connection (loadAll), same lifetime as
  // the rest of a session's loaded data.
  meshList: [],
  // The tracked alias table's entries (docs/topologies/part_mesh_aliases.json
  // -> its `aliases` array), loaded once in loadAll and INJECTED into
  // resolveMeshIdentifier -- commands.js stays fetch-free. Missing/empty
  // table is just [] (no aliases resolve), never an error.
  partMeshAliases: [],
};

function setBanner(text, kind) {
  el.banner.textContent = text;
  el.banner.className = "banner" + (kind ? " banner--" + kind : "");
}

// --- the command layer: register handlers, one dispatch point ------------
//
// Deliverable 1's suggested verbs, as shipped: open-part/show/hide/isolate
// (deliverable 2's parts panel), camera (deliverable 5's up-axis fix lives in
// scene.js; this just exposes reset/frame), select-face (the raycast path's
// non-mouse equivalent), goto (deliverable 3's deep link), plus
// select-topology/select-study/select-edge -- goto's own three steps, named
// separately because a picker changing just the topology or just the study
// has no edge to name, and a vision-agent driver narrating "open this
// element" one step at a time needs the same three verbs goto composes.

function resolveMeshOrThrow(identifier) {
  const mesh = AA.resolveMeshIdentifier(state.meshList, identifier, state.partMeshAliases);
  if (mesh) return mesh;
  const known = state.meshList.map((m) => m.part_id || m.sha256);
  throw new Error(
    "no installed mesh matches \"" + identifier + "\"" +
    (known.length ? " -- installed: " + known.join(", ") : " -- no meshes installed")
  );
}

async function cmdOpenPart(identifier) {
  const mesh = resolveMeshOrThrow(identifier);
  await state.scene.loadPart(mesh.sha256);
  state.scene.setVisible(mesh.sha256, true);
  // Opening/showing a part means "the solid part": a leftover ghost state
  // from an earlier `trace`/`ghost` would silently render it translucent.
  state.scene.setGhost(mesh.sha256, false);
  renderPartsPanel();
  return mesh.sha256;
}

function cmdHide(identifier) {
  const mesh = resolveMeshOrThrow(identifier);
  state.scene.setVisible(mesh.sha256, false);
  renderPartsPanel();
  return mesh.sha256;
}

// isolate never blanks the scene on a partial miss: a named part with no
// installed mesh is reported (banner, and the scene overlay if EVERY named
// part missed), but any part that DID resolve still opens and shows --
// deliverable 3's "never a blank scene" is about the case where nothing at
// all could be shown, not about every miss.
async function cmdIsolate(...identifiers) {
  if (!identifiers.length) throw new Error("isolate needs at least one part identifier");
  const resolved = identifiers.map((id) => ({ id, mesh: AA.resolveMeshIdentifier(state.meshList, id, state.partMeshAliases) }));
  const missing = resolved.filter((r) => !r.mesh).map((r) => r.id);
  const targets = resolved.filter((r) => r.mesh).map((r) => r.mesh.sha256);

  const plan = AA.planIsolate(state.scene.listOpenParts(), targets);
  for (const sha of plan.toOpen) await state.scene.loadPart(sha);
  targets.forEach((sha) => {
    state.scene.setVisible(sha, true);
    state.scene.setGhost(sha, false); // isolate means "the solid part", same as open-part
  });
  plan.toHide.forEach((sha) => state.scene.setVisible(sha, false));
  renderPartsPanel();

  if (targets.length) await AA.exec(["camera", "frame", ...targets]);
  setSceneEmptyState(targets.length === 0 ? missing : null);
  if (missing.length && targets.length) {
    setBanner("Isolated " + targets.length + " part(s); no installed mesh for: " +
      missing.join(", "), "warn");
  }
  return { opened: targets, missing };
}

// ghost <part…> -- isolate's translucent twin (handoff study_3d_flyout): show
// ONLY the named parts, rendered translucent, so opaque `mark-face` overlays
// trace a chain over them. Same resolution, same planIsolate transition, same
// partial-miss honesty as isolate -- the one difference is setGhost(true).
async function cmdGhost(...identifiers) {
  if (!identifiers.length) throw new Error("ghost needs at least one part identifier");
  const resolved = identifiers.map((id) => ({ id, mesh: AA.resolveMeshIdentifier(state.meshList, id, state.partMeshAliases) }));
  const missing = resolved.filter((r) => !r.mesh).map((r) => r.id);
  const targets = resolved.filter((r) => r.mesh).map((r) => r.mesh.sha256);

  const plan = AA.planIsolate(state.scene.listOpenParts(), targets);
  for (const sha of plan.toOpen) await state.scene.loadPart(sha);
  targets.forEach((sha) => {
    state.scene.setVisible(sha, true);
    state.scene.setGhost(sha, true);
  });
  plan.toHide.forEach((sha) => state.scene.setVisible(sha, false));
  renderPartsPanel();

  if (targets.length) await AA.exec(["camera", "frame", ...targets]);
  setSceneEmptyState(targets.length === 0 ? missing : null);
  if (missing.length && targets.length) {
    setBanner("Ghosted " + targets.length + " part(s); no installed mesh for: " +
      missing.join(", "), "warn");
  }
  return { opened: targets, missing };
}

// mark-face <part> <face_id> -- an opaque overlay on one face, additive (a
// trace marks several). Unlike select-face it never touches the pick state:
// a mark says "a binding attaches here", not "you just picked this".
function cmdMarkFace(identifier, faceIdText) {
  const mesh = resolveMeshOrThrow(identifier);
  const faceId = parseInt(faceIdText, 10);
  if (!state.scene.faceRecord(mesh.sha256, faceId)) {
    throw new Error("part \"" + identifier + "\" has no face " + faceIdText);
  }
  state.scene.markFace(mesh.sha256, faceId);
  return { sha256: mesh.sha256, faceId };
}

// trace <topology> <study> -- the per-study 3D view (handoff study_3d_flyout,
// feature 1), composed from the verbs above the way goto composes the three
// select verbs: select the topology and study, ghost the study's parts (those
// with installed meshes after alias resolution), and mark every feature-
// identity-bound face opaque. Parts with no mesh and edges with no binding
// degrade to the existing honest absent states -- never a guessed surface.
async function cmdTrace(topologyId, studyId) {
  if (!topologyId || !studyId) throw new Error("trace needs <topology> <study>");
  cmdSelectTopology(topologyId);
  cmdSelectStudy(studyId);
  const plan = AA.planStudyTrace(state.currentTopology, state.currentStudy,
    mergedIdentityProjection(), state.meshList, state.partMeshAliases);

  state.scene.clearMarks();
  if (plan.ghosts.length) {
    await AA.exec(["ghost", ...plan.ghosts]);
  } else {
    state.scene.listOpenParts().forEach((sha) => state.scene.setVisible(sha, false));
    renderPartsPanel();
    setSceneEmptyState(plan.missingParts.length ? plan.missingParts : null,
      plan.missingParts.length ? null
        : "This study's selection names no parts -- nothing to show in 3D.");
  }
  for (const mark of plan.marks) {
    await AA.exec(["mark-face", mark.sha256, String(mark.faceId)]);
  }

  const notes = [];
  if (plan.missingParts.length) notes.push("no mesh: " + plan.missingParts.join(", "));
  if (plan.unresolvedMarks.length) {
    notes.push(plan.unresolvedMarks.length + " binding(s) point at meshes not installed");
  }
  if (plan.unboundEdges.length) notes.push(plan.unboundEdges.length + " edge(s) unbound");
  setBanner("Traced " + (state.currentStudy.title || studyId) + ": " +
    plan.ghosts.length + " part(s) ghosted, " + plan.marks.length +
    " bound face(s) marked" + (notes.length ? " -- " + notes.join("; ") : ""),
    plan.ghosts.length ? "ok" : "warn");
  const summary = {
    topologyId, studyId,
    ghosted: plan.ghosts, marks: plan.marks,
    missingParts: plan.missingParts,
    unresolvedMarks: plan.unresolvedMarks,
    unboundEdges: plan.unboundEdges,
  };
  window.__lastTrace = summary; // the autotest convention: machine-readable result
  return summary;
}

function cmdCamera(mode, ...rest) {
  if (mode === "reset") {
    state.scene.frameParts(state.scene.listOpenParts().filter((sha) => state.scene.isVisible(sha)));
    return "reset";
  }
  if (mode === "frame") {
    const shas = rest.length
      ? rest.map((id) => resolveMeshOrThrow(id).sha256)
      : state.scene.listOpenParts().filter((sha) => state.scene.isVisible(sha));
    state.scene.frameParts(shas);
    return shas;
  }
  throw new Error("unknown camera mode \"" + mode + "\" -- known: reset, frame");
}

function cmdSelectFace(identifier, faceIdText) {
  const mesh = resolveMeshOrThrow(identifier);
  const faceId = parseInt(faceIdText, 10);
  const record = state.scene.faceRecord(mesh.sha256, faceId);
  if (!record) throw new Error("part \"" + identifier + "\" has no face " + faceIdText);
  state.scene.highlightFace(mesh.sha256, faceId);
  state.currentPick = { sha256: mesh.sha256, faceId, record };
  renderDetail();
  return state.currentPick;
}

// deselect [face|element|all] -- select-face's and select-edge's undo
// (deliverable 3). Jeff: "I accidentally clicked a face … but there's no way to
// deselect a surface." Until now `state.currentPick` was cleared by a click
// into empty space and the orange tint was NOT: scene.restoreColors was only
// ever reachable from inside highlightFace, so nothing on any path could put a
// face back.
//
// A verb first, and the three UI surfaces all drive it (the empty-space click,
// the re-click toggle, the selected element row) -- the standing architecture
// rule for this app. Clearing something that is already clear is not an error:
// this is an undo, and an undo that throws when there is nothing to undo makes
// every caller check first.
function cmdDeselect(target) {
  const what = target || AA.DESELECT_TARGETS[0];
  if (AA.DESELECT_TARGETS.indexOf(what) === -1) {
    throw new Error("deselect takes one of " + AA.DESELECT_TARGETS.join(", ") +
      ", got " + JSON.stringify(target));
  }
  const cleared = { face: null, element: null };
  if (what === "face" || what === "all") {
    // The tint and the pick come down together -- they are one fact, and the
    // bug being fixed is exactly them disagreeing.
    cleared.face = state.currentPick;
    state.scene.clearHighlight();
    state.currentPick = null;
  }
  if (what === "element" || what === "all") {
    cleared.element = state.selectedEdge ? state.selectedEdge.id : null;
    state.selectedEdge = null;
    renderElementList();
  }
  renderDetail();
  return cleared;
}

// filter-element [<edge or node id>] -- scope the left rail to ONE element
// (deliverable 2); with no argument, lift the filter. One verb rather than a
// `filter-element` / `show-all` pair: "show everything" is this filter's own
// empty value, not a second operation, and a UI control that lifts a filter
// and a deep link that arrives with none then run the same line.
function cmdFilterElement(target) {
  if (!target) {
    clearPanelFilter();
    renderElementList();
    renderPartsPanel();
    return null;
  }
  if (!state.currentTopology) {
    throw new Error("no topology selected -- run select-topology first");
  }
  const plan = AA.planPanelFilter(state.currentTopology, target,
    state.meshList, state.partMeshAliases);
  if (!plan.kind) {
    throw new Error("no edge or node \"" + target + "\" in topology \"" +
      state.currentTopology.id + "\"");
  }
  state.panelFilter = plan;
  renderElementList();
  renderPartsPanel();
  renderRailFilter();
  return plan;
}

function cmdSelectTopology(topologyId) {
  if (!state.topologyProjection) throw new Error("no topology projection loaded yet");
  if (!state.topologyProjection.topologies.some((t) => t.id === topologyId)) {
    throw new Error("unknown topology \"" + topologyId + "\"");
  }
  selectTopology(topologyId);
  return topologyId;
}

function cmdSelectStudy(studyId) {
  if (!state.currentTopology) throw new Error("no topology selected -- run select-topology first");
  if (!(state.currentTopology.studies || []).some((s) => s.id === studyId)) {
    throw new Error("unknown study \"" + studyId + "\" in topology \"" + state.currentTopology.id + "\"");
  }
  selectStudy(studyId);
  return studyId;
}

function cmdSelectEdge(edgeId) {
  if (!state.currentTopology) throw new Error("no topology selected -- run select-topology first");
  const edge = state.currentTopology.edges.find((e) => e.id === edgeId);
  if (!edge) throw new Error("unknown edge \"" + edgeId + "\" in topology \"" + state.currentTopology.id + "\"");
  selectEdge(edge);
  return edgeId;
}

// goto <topology> <edge> [study] -- deliverable 3's deep link, expressed as
// three calls to the verbs above (never a parallel code path). When `study`
// is omitted, the first study whose selection carries `edge` is used, so a
// link needs only the two ids that actually identify "which dimension" --
// naming the study too is an optional disambiguator when more than one
// study crosses the same edge.
async function cmdGoto(topologyId, edgeId, studyId) {
  cmdSelectTopology(topologyId);
  const topology = state.currentTopology;
  let targetStudyId = studyId || null;
  if (!targetStudyId && edgeId) {
    const owning = (topology.studies || []).find((s) => (s.selection || []).includes(edgeId));
    if (owning) targetStudyId = owning.id;
  }
  if (targetStudyId) cmdSelectStudy(targetStudyId);
  if (edgeId) cmdSelectEdge(edgeId);
  // Arriving AT one element scopes the rail to it (deliverable 2) -- this is
  // the "entered from" Jeff's note names, and `goto` is the one verb that means
  // it. `select-edge` deliberately does not: it is what clicking a row in the
  // rail runs, and a rail that collapsed to the row you just clicked would be
  // unusable. Arriving with no edge LIFTS any filter a previous goto left, so
  // a whole-topology link is never read through a stale scope.
  cmdFilterElement(edgeId || null);
  return { topologyId, studyId: targetStudyId, edgeId: edgeId || null };
}

const commands = new AA.CommandLayer();
commands.register("open-part", cmdOpenPart);
commands.register("show", cmdOpenPart); // "show" on a part never opened is "open it and show it"
commands.register("hide", cmdHide);
commands.register("isolate", cmdIsolate);
commands.register("camera", cmdCamera);
commands.register("ghost", cmdGhost);
commands.register("mark-face", cmdMarkFace);
commands.register("select-face", cmdSelectFace);
commands.register("select-topology", cmdSelectTopology);
commands.register("select-study", cmdSelectStudy);
commands.register("select-edge", cmdSelectEdge);
commands.register("goto", cmdGoto);
commands.register("trace", cmdTrace);
commands.register("deselect", cmdDeselect);
commands.register("filter-element", cmdFilterElement);
AA.exec = (input) => commands.exec(input);

function setSceneEmptyState(missingParts, message) {
  if ((!missingParts || !missingParts.length) && !message) {
    el.sceneEmpty.style.display = "none";
    el.sceneEmpty.textContent = "";
    return;
  }
  el.sceneEmpty.style.display = "flex";
  el.sceneEmpty.textContent = message ||
    ("No installed mesh for: " + missingParts.join(", ") +
    " -- tessellate the part first (see data/meshes/README.md), then reload.");
}

// --- topology/study/element navigation (the state these commands mutate) --

function mergedIdentityProjection() {
  if (state.sessionEvents.length === 0) return state.identityProjection;
  const base = state.identityProjection ? JSON.parse(JSON.stringify(state.identityProjection)) : { stack_keys: [] };
  for (const event of state.sessionEvents) {
    let row = base.stack_keys.find((r) => AA.stackKeyEquals(r.stack_key, event.stack_key));
    if (!row) {
      row = { stack_key: event.stack_key, state: "owner_not_in_set", bindings: [], owner_not_in_set: [], history: [] };
      base.stack_keys.push(row);
    }
    row.history.push(event.event_id);
    if (event.verdict === "bound") row.bindings.push(event);
    else row.owner_not_in_set.push(event);
  }
  return base;
}

function precedenceNote(edge) {
  if (edge.confidence && edge.confidence !== "no_source_ref") {
    return "A drawing already cites this element (confidence: " + edge.confidence + "). " +
      "The drawing wins -- a binding here only records which feature this is, it does not supply a dimension.";
  }
  return null;
}

function renderTopologyPicker() {
  el.topologySelect.innerHTML = "";
  for (const t of state.topologyProjection.topologies) {
    const opt = document.createElement("option");
    opt.value = t.id; opt.textContent = t.title + " (" + t.id + ")";
    el.topologySelect.appendChild(opt);
  }
  if (state.topologyProjection.topologies.length) {
    selectTopology(state.topologyProjection.topologies[0].id);
  }
}

function selectTopology(topologyId) {
  state.currentTopology = state.topologyProjection.topologies.find((t) => t.id === topologyId) || null;
  // A rail scope belongs to ONE topology's id space, so changing topology
  // drops it rather than carrying a filter that can no longer name anything.
  // `goto` sets its own filter AFTER this runs, so a deep link is unaffected.
  clearPanelFilter();
  el.topologySelect.value = topologyId;
  el.studySelect.innerHTML = "";
  const studies = (state.currentTopology && state.currentTopology.studies) || [];
  for (const s of studies) {
    const opt = document.createElement("option");
    opt.value = s.id; opt.textContent = s.title;
    el.studySelect.appendChild(opt);
  }
  if (studies.length) selectStudy(studies[0].id);
  else renderElementList();
}

function selectStudy(studyId) {
  state.currentStudy = (state.currentTopology.studies || []).find((s) => s.id === studyId) || null;
  // Picking a study by hand is a reader saying "show me this study", which is
  // the opposite of a one-element scope -- same reasoning as selectTopology.
  clearPanelFilter();
  el.studySelect.value = studyId;
  renderElementList();
}

// The scope, dropped, with the bar that announces it -- and NOT the two panels,
// which is why this is a function rather than two lines inside the verb:
// selectTopology/selectStudy call it mid-way through their own render and must
// not repaint the panels twice, while `filter-element` with no argument adds
// those two repaints on top of it.
function clearPanelFilter() {
  state.panelFilter = null;
  renderRailFilter();
}

// Which element ids the rail lists: the filter's, when one is set, and the
// current study's selection otherwise. The filtered list is read from the
// FILTER and not intersected with the study, deliberately -- a flyout can be
// entered from an edge no study in this topology selects, and an intersection
// would answer that with an empty rail.
function listedEdgeIds() {
  if (state.panelFilter) return state.panelFilter.edgeIds;
  return (state.currentStudy && state.currentStudy.selection) || [];
}

function renderElementList() {
  el.elementList.innerHTML = "";
  if (!state.currentTopology) return;
  if (!state.currentStudy && !state.panelFilter) return;
  const identity = mergedIdentityProjection();
  const staleness = state.identityProjection && state.identityProjection.staleness;
  for (const edgeId of listedEdgeIds()) {
    const edge = state.currentTopology.edges.find((e) => e.id === edgeId);
    if (!edge) continue;
    const key = AA.topologyEdgeKey(state.currentTopology.id, edgeId);
    const record = AA.findBindingRecord(identity, key);
    const bindingState = AA.elementBindingState(record, staleness);

    const li = document.createElement("li");
    // The state still colours the ROW -- that signal is per-row, at a glance,
    // and Jeff asked to keep it ("keep the *color* signal on the row"). What
    // came off is the WORDS: the badge used to print the raw state value.
    li.className = "el-row el-row--" + bindingState;
    li.appendChild(document.createTextNode((edge.name || edge.id) + "  "));
    const alerts = AA.elementAlerts(bindingState);
    if (alerts.length) li.appendChild(alertBadge(alerts));
    li.onclick = () => {
      try {
        // Clicking the row that is already selected DESELECTS it (deliverable
        // 3's second half): the rail is the only place an element selection can
        // be let go of, and before this there was no path at all.
        const selected = state.selectedEdge && state.selectedEdge.id === edge.id;
        AA.exec(selected ? ["deselect", "element"] : ["select-edge", edge.id]);
      } catch (err) {
        setBanner(err.message, "error");
      }
    };
    if (state.selectedEdge && state.selectedEdge.id === edge.id) li.classList.add("selected");
    el.elementList.appendChild(li);
  }
}

// --- the consolidated alert badge (deliverable 5) --------------------------
//
// ONE warning icon per row however many alerts it carries, with the words on
// hover -- Jeff: "roll all the alert badges into one single alert badge
// (something like a triangle ! icon). Mouse over the icon has a popup that
// lists out the actual alerts."
//
// Positioned by JS into ONE shared position: fixed node rather than rendered
// per row as an absolutely-positioned child. That is not a preference: the rail
// is `overflow-y: auto` (style.css), so a popup inside a row is clipped to the
// rail's 260px and a row near the bottom would open its popup off the bottom of
// the scrollport. apps/viewer reaches the same conclusion for its own hover
// cards, on the same page, for the same reason.
function alertBadge(alerts) {
  const badge = document.createElement("span");
  badge.className = "alertbadge";
  badge.setAttribute("tabindex", "0");
  // A name for the icon, for a reader who cannot see it and for a hover with
  // no pointer at all; the popup below is what a sighted reader gets.
  badge.setAttribute("aria-label", alerts.map((a) => a.text).join(" "));
  badge.textContent = AA.ALERT_ICON;
  const show = (event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    showAlertPop(alerts, badge);
  };
  badge.onmouseenter = show;
  badge.onfocus = show;
  badge.onmouseleave = hideAlertPop;
  badge.onblur = hideAlertPop;
  // The badge sits inside a row whose click selects the element. Clicking the
  // icon must not select: it is a disclosure, not a second way in.
  badge.onclick = show;
  return badge;
}

function showAlertPop(alerts, trigger) {
  if (!el.alertPop) return;
  el.alertPop.innerHTML = "";
  const list = document.createElement("ul");
  for (const alert of alerts) {
    const li = document.createElement("li");
    li.textContent = alert.text;
    list.appendChild(li);
  }
  el.alertPop.appendChild(list);
  el.alertPop.style.display = "block";
  // Below the badge, or above it where there is no room below -- the same
  // below-by-default/flip-when-it-does-not-fit rule apps/viewer's popover
  // placement uses, in the three lines this one needs.
  if (!trigger.getBoundingClientRect) return;
  const box = trigger.getBoundingClientRect();
  const height = el.alertPop.offsetHeight || 0;
  const below = box.bottom + 6;
  el.alertPop.style.left = Math.max(8, box.left) + "px";
  el.alertPop.style.top = (below + height > window.innerHeight - 8
    ? Math.max(8, box.top - height - 6)
    : below) + "px";
}

function hideAlertPop() {
  if (!el.alertPop) return;
  el.alertPop.style.display = "none";
  el.alertPop.innerHTML = "";
}

// --- the rail's scope bar (deliverable 2) ---------------------------------
//
// What the rail is filtered to, in the element's own words, and the one control
// that lifts it. Nothing at all when nothing is filtered: the standing rule is
// that an absent feature shows NOTHING, and a permanently-visible "show all"
// button with nothing hidden is a control that explains a state the reader is
// not in.
function renderRailFilter() {
  if (!el.railFilter) return;
  el.railFilter.innerHTML = "";
  if (!state.panelFilter) {
    el.railFilter.style.display = "none";
    return;
  }
  el.railFilter.style.display = "block";
  const plan = state.panelFilter;
  const edges = (state.currentTopology && state.currentTopology.edges) || [];
  const nodes = (state.currentTopology && state.currentTopology.nodes) || [];
  const found = edges.find((e) => e.id === plan.target) ||
    nodes.find((n) => n.id === plan.target);
  const note = document.createElement("span");
  note.className = "an__filter-note";
  note.textContent = "Showing only: " +
    ((found && (found.name || found.id)) || plan.target);
  el.railFilter.appendChild(note);

  const btn = document.createElement("button");
  btn.className = "an__filter-clear";
  btn.textContent = "Show all";
  btn.title = "list every element in the study and every installed part again";
  btn.onclick = () => {
    try { AA.exec(["filter-element"]); }
    catch (err) { setBanner(err.message, "error"); }
  };
  el.railFilter.appendChild(btn);

  // A scoped rail whose element names a part with no installed mesh would
  // otherwise show an empty parts panel and no reason for it.
  const gapText = plan.missingParts.length
    ? "No installed 3D part for: " + plan.missingParts.join(", ")
    : (plan.parts.length
      ? null
      : "This element names no part, so there is nothing to show in 3D.");
  if (gapText) {
    const gap = document.createElement("div");
    gap.className = "an__filter-gap";
    gap.textContent = gapText;
    el.railFilter.appendChild(gap);
  }
}

function selectEdge(edge) {
  state.selectedEdge = edge;
  renderElementList();
  renderDetail();
}

function renderDetail() {
  el.detail.innerHTML = "";
  if (!state.selectedEdge) {
    el.detail.textContent = "Pick an element on the left, then click a face in the 3D view to bind it.";
    return;
  }
  const edge = state.selectedEdge;
  const wrap = document.createElement("div");

  const h = document.createElement("h3");
  h.textContent = edge.name || edge.id;
  wrap.appendChild(h);

  const note = precedenceNote(edge);
  if (note) {
    const p = document.createElement("p");
    p.className = "precedence-note";
    p.textContent = note;
    wrap.appendChild(p);
  }

  const pickP = document.createElement("p");
  // A class so the stylesheet can say what this line is: secondary either way
  // (design_pass_typography). Styling only -- the words are unchanged.
  pickP.className = "an__pick";
  pickP.textContent = state.currentPick
    ? "Picked: part " + state.currentPick.sha256.slice(0, 12) + "…, face " + state.currentPick.faceId
    : "No face picked yet -- click a face in the 3D view.";
  wrap.appendChild(pickP);

  if (!state.storage || !state.storage.canWrite()) {
    const p = document.createElement("p");
    p.className = "read-only-note";
    p.textContent = "This transport cannot write -- binding controls are hidden. Connect a read/write folder to bind.";
    wrap.appendChild(p);
    el.detail.appendChild(wrap);
    return;
  }

  if (state.currentPick) {
    wrap.appendChild(buildBindForm(edge, state.currentPick));
  }
  wrap.appendChild(buildOwnerNotInSetForm(edge));
  el.detail.appendChild(wrap);
}

function labeledSelect(labelText, options, id) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt; o.textContent = opt;
    select.appendChild(o);
  }
  const box = document.createElement("div");
  box.appendChild(label); box.appendChild(select);
  return { box, select };
}

function labeledInput(labelText, id) {
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text"; input.id = id;
  const box = document.createElement("div");
  box.appendChild(label); box.appendChild(input);
  return { box, input };
}

function nowIso() { return new Date().toISOString().replace(/\.\d+Z$/, "Z"); }

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

async function existingEventFilenames() {
  // The app cannot list an FSA directory's file entries as cheaply as it can
  // list data/meshes/ subdirectories (there is no manifest to key off), so
  // the running count is this session's own writes plus whatever the
  // projection already knows about (its `built_from_events` list carries
  // every filename-derived event id the log had at last rebuild).
  const known = (state.identityProjection && state.identityProjection.built_from_events) || [];
  const sessionIds = state.sessionEvents.map((e) => e.event_id);
  return known.concat(sessionIds);
}

function buildBindForm(edge, pick) {
  const form = document.createElement("div");
  form.className = "bind-form";

  const dir = labeledSelect("direction", AA.DIRECTIONS, "direction-select");
  form.appendChild(dir.box);
  const composition = labeledInput("composition note (optional)", "composition-input");
  form.appendChild(composition.box);
  const ownerPart = labeledInput("owner part (optional)", "owner-part-input");
  form.appendChild(ownerPart.box);
  const gdt = labeledSelect("GD&T modifier (optional)", ["", ...AA.GDT_MODIFIERS], "gdt-select");
  form.appendChild(gdt.box);
  const regime = labeledInput("general tolerance regime (optional)", "regime-input");
  form.appendChild(regime.box);
  const noteField = labeledInput("note (optional)", "bind-note-input");
  form.appendChild(noteField.box);

  const btn = document.createElement("button");
  btn.textContent = "Bind selected face to " + (edge.name || edge.id);
  btn.onclick = async () => {
    try {
      const filenames = await existingEventFilenames();
      const eventId = "annotate-" + Date.now() + "-" + slugify(edge.id);
      const event = AA.buildBoundEvent({
        eventId,
        seq: filenames.length + 1,
        createdAt: nowIso(),
        recordedBy: "annotate-app",
        stackKey: AA.topologyEdgeKey(state.currentTopology.id, edge.id),
        geometryKey: {
          sourceStepSha256: pick.sha256,
          faceId: pick.faceId,
          areaNative2: pick.record.area_native2,
          centroidNative: pick.record.centroid_native,
        },
        direction: dir.select.value,
        compositionNote: composition.input.value || null,
        ownerPart: ownerPart.input.value || null,
        gdtModifier: gdt.select.value || null,
        generalTolRegime: regime.input.value || null,
        note: noteField.input.value || null,
      });
      const filename = AA.nextEventFilename(filenames, slugify(edge.id));
      await state.storage.writeFeatureIdentityEvent(filename, event);
      state.sessionEvents.push(event);
      setBanner("Wrote " + filename, "ok");
      renderElementList();
      renderDetail();
    } catch (err) {
      setBanner("Bind failed: " + err.message, "error");
    }
  };
  form.appendChild(btn);
  return form;
}

function buildOwnerNotInSetForm(edge) {
  const form = document.createElement("div");
  form.className = "owner-not-in-set-form";
  const noteField = labeledInput("why the owner isn't in the loaded set", "owner-nis-note-input");
  form.appendChild(noteField.box);
  const btn = document.createElement("button");
  btn.textContent = "Record owner not in set";
  btn.onclick = async () => {
    try {
      const filenames = await existingEventFilenames();
      const eventId = "annotate-" + Date.now() + "-" + slugify(edge.id) + "-not-in-set";
      const event = AA.buildOwnerNotInSetEvent({
        eventId,
        seq: filenames.length + 1,
        createdAt: nowIso(),
        recordedBy: "annotate-app",
        stackKey: AA.topologyEdgeKey(state.currentTopology.id, edge.id),
        note: noteField.input.value || null,
      });
      const filename = AA.nextEventFilename(filenames, slugify(edge.id) + "_owner_not_in_set");
      await state.storage.writeFeatureIdentityEvent(filename, event);
      state.sessionEvents.push(event);
      setBanner("Wrote " + filename, "ok");
      renderElementList();
      renderDetail();
    } catch (err) {
      setBanner("Record failed: " + err.message, "error");
    }
  };
  form.appendChild(btn);
  return form;
}

// --- the parts panel (deliverable 2): every installed mesh, show/hide/isolate,
// all backed by the command layer -- this function never mutates scene state
// itself, only reads it (scene.listOpenParts()/isVisible()) to paint the
// current checkbox states.

// Which installed meshes the panel lists. Unfiltered it is every one of them,
// which is what it has always been -- and was the gap Jeff hit: `cmdTrace` and
// `cmdGoto` already scoped the ELEMENT list to a study, and this panel was
// scoped by nothing at all, so entering the flyout from one element still
// listed every mesh in the repo beside it.
function listedMeshes() {
  if (!state.panelFilter) return state.meshList;
  const wanted = {};
  state.panelFilter.parts.forEach((p) => { if (p.sha256) wanted[p.sha256] = true; });
  return state.meshList.filter((m) => wanted[m.sha256]);
}

function renderPartsPanel() {
  el.partsPanel.innerHTML = "";
  for (const mesh of listedMeshes()) {
    const li = document.createElement("li");
    li.className = "part-row";

    const label = document.createElement("span");
    label.className = "part-row__label";
    label.textContent = mesh.label + " (" + mesh.sha256.slice(0, 12) + "…)";
    li.appendChild(label);

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.title = "show/hide in the 3D view";
    cb.checked = state.scene.isVisible(mesh.sha256);
    cb.onchange = async () => {
      try {
        await AA.exec([cb.checked ? "show" : "hide", mesh.sha256]);
      } catch (err) {
        setBanner(err.message, "error");
        cb.checked = !cb.checked;
      }
    };
    li.appendChild(cb);

    const isoBtn = document.createElement("button");
    isoBtn.textContent = "Isolate";
    isoBtn.title = "show only this part, hiding every other open part";
    isoBtn.onclick = async () => {
      try {
        await AA.exec(["isolate", mesh.sha256]);
      } catch (err) {
        setBanner(err.message, "error");
      }
    };
    li.appendChild(isoBtn);

    el.partsPanel.appendChild(li);
  }
}

// --- deep link (deliverable 3) ---------------------------------------------
//
// Whether there is a pending link is decided once, from the URL, at module
// load -- the params never change during a session.
const wantTopology = params.get("topology");
const wantStudy = params.get("study");
const wantEdge = params.get("edge");
const wantIsolate = params.get("isolate");
// ?trace=1&topology=<id>&study=<id> boots the per-study 3D trace (the `trace`
// verb) instead of the goto/isolate pair -- the flyout's own boot shape.
const wantTrace = params.get("trace") === "1";

function hasPendingDeepLink() {
  return !!(wantTopology || wantIsolate);
}

// FSA cannot pre-grant a folder from a URL (the handoff's own constraint) --
// a deep link's boot commands only run AFTER the user clicks Connect, inside
// loadAll() below, same as this app's params handling always has. Said in
// plain words on the pre-connect banner so a linked click doesn't look like
// it silently did nothing.
function pendingDeepLinkNote() {
  return hasPendingDeepLink()
    ? " A linked element is queued -- it opens once you connect."
    : "";
}

async function runPendingDeepLink() {
  if (wantTrace && wantTopology && wantStudy) {
    // trace owns the whole scene state (which parts show, what is marked), so
    // the goto/isolate params are not also applied on top of it.
    try {
      await AA.exec(["trace", wantTopology, wantStudy]);
    } catch (err) {
      setBanner("Deep link trace failed: " + err.message, "error");
    }
    return;
  }
  if (wantTopology) {
    try {
      await AA.exec(["goto", wantTopology, wantEdge || "", wantStudy || ""]);
    } catch (err) {
      setBanner("Deep link failed: " + err.message, "error");
    }
  }
  if (wantIsolate) {
    const parts = wantIsolate.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) {
      try {
        await AA.exec(["isolate", ...parts]);
      } catch (err) {
        setBanner("Deep link isolate failed: " + err.message, "error");
      }
    }
  }
}

// --- flyout embedding: postMessage -> AA.exec (handoff study_3d_flyout) ----
//
// The stack viewer embeds this app as a same-origin iframe flyout. The first
// open boots via the URL params above; every later launch posts
// {type: "annotate:exec", id?, command} instead of reloading, so the folder
// grant, loaded meshes and camera survive across launches. Same-origin only:
// a message from any other origin is ignored, and off-origin embedding is the
// viewer's own degraded-link case, not this listener's. Commands queue behind
// the first loadAll() (the same "queued until you connect" semantics the deep
// link has), run in arrival order, and reply {type: "annotate:result", id,
// ok, result|error}; a failure also lands in this app's own banner, exactly
// as the same command typed into the dev console would.
const execQueue = new AA.ExecQueue();

window.addEventListener("message", (ev) => {
  if (ev.origin !== window.location.origin) return;
  const msg = ev.data;
  if (!msg || msg.type !== "annotate:exec" || !msg.command) return;
  const source = ev.source;
  const origin = ev.origin;
  execQueue.enqueue(() => AA.exec(msg.command)).then((outcome) => {
    let reply;
    if (outcome.ok) {
      reply = { type: "annotate:result", id: msg.id == null ? null : msg.id,
        ok: true, result: outcome.result === undefined ? null : outcome.result };
    } else {
      setBanner(outcome.error.message, "error");
      reply = { type: "annotate:result", id: msg.id == null ? null : msg.id,
        ok: false, error: outcome.error.message };
    }
    try { if (source) source.postMessage(reply, origin); } catch (_) { /* embedder gone */ }
  });
});

async function loadAll() {
  try {
    state.topologyProjection = await state.storage.readTopologyProjection();
    state.identityProjection = await state.storage.readFeatureIdentityProjection();
    if (!state.topologyProjection) {
      setBanner(AA.NO_PROJECTION_NOTICE, "warn");
      // Loaded-but-empty: queued commands should fail loudly ("no topology
      // projection loaded yet"), not hang forever behind this gate.
      execQueue.markLoaded();
      return;
    }
    setBanner(
      "loaded " + state.topologyProjection.topologies.length + " topolog" +
      (state.topologyProjection.topologies.length === 1 ? "y" : "ies") +
      (state.identityProjection ? "" : " -- no feature-identity projection yet (nothing bound, or not rebuilt)"),
      "ok"
    );
    renderTopologyPicker();
    state.meshList = await state.storage.listMeshes();
    const aliasDoc = await state.storage.readPartMeshAliases();
    state.partMeshAliases = (aliasDoc && Array.isArray(aliasDoc.aliases)) ? aliasDoc.aliases : [];
    renderPartsPanel();
    renderRailFilter();

    await runPendingDeepLink();
    execQueue.markLoaded();

    if (params.get("autotest") === "1") await runAutotest();
  } catch (err) {
    // Settle the gate WITH the load error so every already-queued command
    // fails loudly naming the *load* failure (an AA.exec error would be
    // misleading here), instead of hanging on `await` forever -- the same
    // deliberate behavior the loaded-but-empty branch above already has for
    // its own case.
    execQueue.markLoadFailed(new Error("load failed: " + err.message));
    throw err;
  }
}

// The spike's own verification technique (step_tessellation's viewer.js):
// aim the camera at a part's own bounding-box center and raycast dead-center,
// so the fetch -> geometry -> raycast -> face_id path is exercised with no
// real mouse and no headless-browser automation -- this repo's own lesson
// (LESSONS_20260904_step_tessellation_spike.md) documents why real click
// automation is not run on this machine (it hijacks Jeff's live browser
// session). Publishes into #test-status and window.__autotestResults, same
// convention. Loads each part through the command layer (open-part) rather
// than the scene directly -- autotest is the proto-agent-driver this app's
// command layer is built for, so it should exercise the same path a real
// driver would.
async function runAutotest() {
  const results = [];
  for (const mesh of state.meshList) {
    try {
      await AA.exec(["open-part", mesh.sha256]);
      const pick = state.scene.autotestPick(mesh.sha256);
      results.push(pick
        ? { sha256: mesh.sha256, hit: true, faceId: pick.faceId }
        : { sha256: mesh.sha256, hit: false });
    } catch (err) {
      results.push({ sha256: mesh.sha256, hit: false, error: String(err) });
    }
  }
  const statusEl = document.getElementById("test-status");
  statusEl.style.display = "block";
  statusEl.textContent = JSON.stringify(results);
  window.__autotestResults = results;
}

// --- the dev console: window.AnnotateApp.exec's own UI ---------------------
//
// The third consumer of the command layer, alongside the UI's own clicks and
// the deep link -- and the shape a future vision-agent driver's own tool
// calls would take (a command string in, a result or an error out).
async function runConsoleCommand() {
  const text = el.consoleInput.value.trim();
  if (!text) return;
  el.consoleOutput.textContent = "> " + text;
  try {
    const result = await AA.exec(text);
    el.consoleOutput.textContent += "\n" + (result === undefined ? "(ok)" : JSON.stringify(result));
  } catch (err) {
    el.consoleOutput.textContent += "\nERROR: " + err.message;
  }
}

async function main() {
  // The transport decision comes FIRST -- before the 3D scene is constructed
  // and before a single control is wired. A hosted page has nothing to render
  // into the scene, and a page that cannot even reach the repo should not be
  // spending a WebGL context to say so. (It also means the honest notice
  // below still appears in a browser with no WebGL at all, where the scene
  // constructor would throw before the banner.)
  //
  // The WIRING moved below this too (handoff annotate_hosted_page_posture):
  // it used to run first, which left a hosted page with a live dev console
  // and two live pickers underneath a sentence saying this page cannot
  // annotate. A control that is about to be withheld is never wired -- then
  // "is it hidden?" and "does it do anything?" cannot drift apart.
  //
  // ?mock=1 short-circuits it the way it always has: the tour reads a fixture
  // and touches no transport, so it is legitimate on any origin.
  const picked = MOCK ? null : await AA.chooseTransport({
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    fsa: AA.FsaAdapter.isSupported() ? new AA.FsaAdapter() : null,
  });

  // A hosted origin (handoff surfaces_that_state_something_false, applying
  // apps/viewer's viewer_transport_honest_hosted posture): ONE sentence and
  // nothing else. **Connect folder** is removed rather than disabled -- a
  // hosted visitor has no tolstack repo to grant, so the control could not
  // work for them however it were presented, and a feature that is absent
  // shows nothing. Nothing is latched: the decision is recomputed on every
  // load, so the same URL opened on a loopback server is the ordinary
  // folder-grant page below.
  //
  // "And nothing else" is the whole PAGE, not just the top bar (handoff
  // annotate_hosted_page_posture, ISSUE_20260915_the_hosted_annotate_page_
  // still_instructs_the_reader_to_bind_a_face): every column of #workspace
  // exists to serve the bind workflow -- the element list and its two
  // pickers, the parts panel, the 3D pane the detail hint tells the reader to
  // click a face in, and the dev console that drives the same verbs. None of
  // them can do anything here, and the hint actively contradicts the sentence
  // two inches above it. So the workspace is withheld as ONE node rather than
  // emptied element by element: an emptied three-column grid is still three
  // columns of nothing, and a per-element hide list is a list a later column
  // can be added to without being added to. Hidden, not deleted, for the same
  // reason the button is -- nothing here is latched, so a reload on a loopback
  // origin is the ordinary page with no "put it back" path to get wrong.
  if (AA.isHosted(picked)) {
    setBanner(AA.HOSTED_NOTICE, "warn");
    el.connectBtn.style.display = "none";
    el.transportSub.textContent = "";
    el.workspace.style.display = "none";
    return;
  }

  el.topologySelect.onchange = async () => {
    try { await AA.exec(["select-topology", el.topologySelect.value]); }
    catch (err) { setBanner(err.message, "error"); }
  };
  el.studySelect.onchange = async () => {
    try { await AA.exec(["select-study", el.studySelect.value]); }
    catch (err) { setBanner(err.message, "error"); }
  };
  el.consoleRun.onclick = runConsoleCommand;
  el.consoleInput.onkeydown = (ev) => { if (ev.key === "Enter") runConsoleCommand(); };

  state.scene = new AnnotateScene(el.canvasHost, {
    readMeshManifest: (sha) => state.storage.readMeshManifest(sha),
    readMeshBuffer: (sha, name) => state.storage.readMeshBuffer(sha, name),
  });
  // The autotest convention again (window.__lastTrace, window.__autotestResults
  // above): a READ-ONLY handle on the scene, so a harness can ask what is
  // actually tinted. Nothing in this app reads it, and it is not a second way
  // to drive the scene -- every mutation still goes through AA.exec. It exists
  // because the pick tint lives in a WebGL colour buffer: `scene.
  // highlightedFace()` is the only observable for "the orange came off", which
  // is the entire deliverable of the deselect work and was un-checkable before.
  window.__scene = state.scene;
  // Every click in the 3D view is one of the two verbs, chosen by the pure
  // AA.planPickToggle (deliverable 3): a click into empty space and a click
  // back onto the already-picked face both DESELECT, anything else selects.
  // Before this, a miss set `state.currentPick = null` and left the orange
  // tint exactly where it was, and a re-click re-highlighted the same face --
  // so there were three ways to pick a face and none to unpick one.
  state.scene.onPick = (pick) => {
    const plan = AA.planPickToggle(state.currentPick, pick);
    try {
      if (plan.action === "clear") AA.exec(["deselect", "face"]);
      else AA.exec(["select-face", plan.pick.sha256, String(plan.pick.faceId)]);
    } catch (err) {
      setBanner(err.message, "error");
    }
  };

  if (MOCK) {
    state.storage = new AA.MemoryAdapter(AA.FIXTURES);
    await state.storage.connect();
    el.connectBtn.style.display = "none";
    el.transportSub.textContent = "mock mode (?mock=1) -- writes are captured, not persisted";
    await loadAll();
    return;
  }

  // A local page in a browser with no File System Access API -- the one
  // remaining state chooseTransport reports no transport at all for.
  if (!picked.adapter) {
    setBanner(
      "This browser has no File System Access API -- the annotate surface needs Chrome or Edge, " +
      "served over http(s) (not file://). Try ?mock=1 for a demo with no folder grant.",
      "error"
    );
    el.connectBtn.style.display = "none";
    return;
  }

  state.storage = picked.adapter;
  el.transportSub.textContent = "read/write, data/inbox/feature-identity/ writes land in the connected folder";
  const initial = picked.state;
  el.connectBtn.onclick = async () => {
    try {
      await (initial === AA.STATE.NEEDS_REGRANT ? state.storage.reconnect() : state.storage.connect());
      el.connectBtn.textContent = "Connected";
      await loadAll();
    } catch (err) {
      setBanner("Connect failed: " + err.message, "error");
    }
  };
  el.connectBtn.textContent = initial === AA.STATE.NEEDS_REGRANT ? "Re-grant folder" : "Connect folder";
  if (initial === AA.STATE.READY) {
    el.connectBtn.textContent = "Connected";
    await loadAll();
  } else {
    setBanner("Click \"Connect folder\" and pick the tolstack repo root, grant read/write." +
      pendingDeepLinkNote(), "warn");
  }
}

main();
