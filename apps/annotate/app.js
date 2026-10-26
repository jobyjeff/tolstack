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
  // Sweep mode's joint tooltip -- one node, placed at the pointer.
  sweepTip: document.getElementById("sweep-tip"),
  // The rail's "set up automatically" menu (deliverable 3) -- the <details>
  // and the box its checkbox rows are written into.
  autoSetup: document.getElementById("auto-setup"),
  autoSetupBody: document.getElementById("auto-setup-body"),
  // The top bar (deliverable 1): the always-present instruction line and its
  // element controls, and the help/settings panel that opens under them.
  detail: document.getElementById("detail"),
  hintPanel: document.getElementById("hint-panel"),
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
  // The bind form's interface choice: {edgeId, sha256, faceId, direction}, or
  // null. Keyed to the element and the face it was made on (bindContext), so
  // it can never outlive either.
  bindChoice: null,
  currentTopology: null,
  currentStudy: null,
  selectedEdge: null,
  // The rail's scope, or null for "the whole study and every installed mesh"
  // -- AA.planPanelFilter's plan, as returned, so the two renderers read one
  // decision rather than each re-deriving which rows belong to an element.
  panelFilter: null,
  // The view before the first isolate/ghost of a run of them, plus the parts
  // currently isolated -- null when nothing is. `isolate off` puts the
  // snapshot back, which is what makes Isolate a toggle and not a trap.
  isolation: null, // { restore: [{sha, visible, ghost}], targets: [sha], ghost }
  // What the reader added to / took out of the model, on top of what the
  // topology or study puts in it (AA.planContext). Never touched by a view verb.
  contextEdit: { added: [], removed: [] },
  otherPartsOpen: false, // the parts panel's folded group
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
  // data/projections/parts/names.json (part number -> everyday name), or null
  // when it has not been built: a part row then shows its number alone.
  partNames: null,
  // Which steps of an arrival apply (deliverable 3), and whether bodies render
  // translucent (deliverable 4). Both persist; both are read ONCE here, before
  // any command can run, so a boot sequence and a later postMessage launch
  // read the same settings.
  autoSteps: AA.readStoredAutoSteps(prefStore()),
  transparentParts: AA.readStoredTransparency(prefStore()),
  // Whether selecting an element colours the faces that could be its feature
  // (handoff annotate_face_suggestions). Persists like the two above.
  faceSuggestions: AA.readStoredSuggestions(prefStore()),
  // sha256 -> AA.classifyPartFaces(...) output, computed ONCE per mesh per
  // session and kept here rather than on the scene's meshes: a reference face
  // for the narrowing can live on a part that is not open in the 3D view at
  // all, and reading a mesh's buffers does not require rendering it.
  faceClasses: {},
  // The last plan AA.planFaceSuggestions returned, so the top bar can say what
  // it narrowed and how far without re-running it.
  suggestionPlan: null,
  // The top bar's help panel, and the rarely-wanted owner-not-in-set form --
  // two disclosures, open or not. Session-only: neither is a preference, they
  // are where the reader currently is.
  helpOpen: false,
  notInSetOpen: false,
  // Sweep mode, or null when the app is in its ordinary bind posture
  // (handoff kinematic_sweep_animation). One object holds the whole mode --
  // the artifact, where the scrubber is, what is playing, which layers are
  // drawn and what each body resolved to -- so "are we in sweep mode" is one
  // question with one answer, and leaving is `state.sweep = null` plus the
  // scene's own restore.
  sweep: null,
  // sha256 -> {source, points} -- the joint-feature candidates used to decide
  // which occurrence a body is. Cached beside faceClasses and for the same
  // reason: reading and fitting a part's geometry is the expensive half, and
  // five bodies routinely ask about the same mesh.
  sweepFeatures: {},
  // Every occurrence recorded anywhere in the installed store, read once --
  // see loadOccurrences for why the whole store and not one mesh's own. Read
  // at load since 2026-10-14: it is where EVERY opened part is drawn, not
  // only the ones a sweep moves.
  occurrences: null,
  // The published sweep runs, newest first by their own `ts` -- what the
  // bar's run picker offers. Read when sweep mode is entered.
  sweepRuns: [],
  // The last arrival this app applied ({topologyId, edgeId, studyId, trace}),
  // so ticking an auto-setup box back ON can re-apply it rather than making
  // the reader go back to the stack viewer and click through again.
  lastEntry: null,
};

// localStorage, or null where there is none to have -- the same wrapped
// access apps/viewer/topology_app.js's `widthStore` documents: on some
// configurations even TOUCHING window.localStorage throws, which is before
// the read/write pair gets a chance to catch anything.
function prefStore() {
  try {
    return (typeof window !== "undefined" && window.localStorage) || null;
  } catch (err) {
    return null;
  }
}

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

// show <part> <subject> / hide <part> <subject> -- the sweep rail's part row
// inside a body: only the occurrence(s) that body is drawn at (handoff
// the_rail_and_the_scene_point_at_each_other, deliverable 3). Without the
// subject, every occurrence of the mesh -- the parts panel's rule.
function scopedOccurrences(mesh, subject) {
  const sweep = sweepState();
  if (!subjectKnown(subject)) throw new Error("this run has no body or link \"" + subject + "\"");
  return AA.sweepPartOccurrences(sweep.occurrences, subject, mesh.sha256);
}

async function cmdShow(identifier, subject) {
  if (subject === undefined) return cmdOpenPart(identifier);
  const mesh = resolveMeshOrThrow(identifier);
  setOccurrences(scopedOccurrences(mesh, subject), true);
  renderPartsPanel();
  return mesh.sha256;
}

async function cmdOpenPart(identifier) {
  const mesh = resolveMeshOrThrow(identifier);
  await state.scene.loadPart(mesh.sha256);
  state.scene.setVisible(mesh.sha256, true);
  // Opening/showing a part means "the solid part": a leftover ghost state
  // from an earlier `trace`/`ghost` would silently render it translucent.
  state.scene.setGhost(mesh.sha256, false);
  renderPartsPanel();
  // A part drawn anywhere but where the assembly puts it says so, the moment
  // it appears -- its panel row says it too, for as long as it is listed.
  const note = positionNote(mesh.sha256);
  if (note) setBanner(mesh.label + ": " + note, "warn");
  return mesh.sha256;
}

function cmdHide(identifier, subject) {
  const mesh = resolveMeshOrThrow(identifier);
  if (subject !== undefined) {
    setOccurrences(scopedOccurrences(mesh, subject), false);
    renderPartsPanel();
    return mesh.sha256;
  }
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
  return isolateOrGhost("isolate", false, identifiers);
}

// ghost <part…> -- isolate's translucent twin (handoff study_3d_flyout): show
// ONLY the named parts, rendered translucent, so opaque `mark-face` overlays
// trace a chain over them. Same resolution, same planIsolate transition, same
// partial-miss honesty and the same `off` as isolate -- the one difference is
// setGhost(true).
async function cmdGhost(...identifiers) {
  return isolateOrGhost("ghost", true, identifiers);
}

// `isolate off` / `ghost off`: the view as it was before the first isolate or
// ghost of the run. Isolating a second part first, or toggling it from the
// panel, never overwrites that snapshot -- it is taken once.
function restoreIsolation() {
  const isolation = state.isolation;
  state.isolation = null;
  if (isolation) {
    AA.planViewRestore(isolation.restore, state.scene.listOpenParts()).forEach((r) => {
      state.scene.setVisible(r.sha, r.visible);
      state.scene.setGhost(r.sha, r.ghost);
    });
  }
  renderPartsPanel();
  setSceneEmptyState(null);
  return { restored: !!isolation };
}

async function isolateOrGhost(verb, ghost, identifiers) {
  if (!identifiers.length) throw new Error(verb + " needs at least one part identifier");
  if (identifiers.length === 1 && identifiers[0] === AA.ON_OFF[1]) return restoreIsolation();
  const resolved = identifiers.map((id) => ({ id, mesh: AA.resolveMeshIdentifier(state.meshList, id, state.partMeshAliases) }));
  const missing = resolved.filter((r) => !r.mesh).map((r) => r.id);
  const targets = resolved.filter((r) => r.mesh).map((r) => r.mesh.sha256);

  const plan = AA.planIsolate(state.scene.listOpenParts(), targets);
  if (targets.length && !state.isolation) {
    state.isolation = {
      restore: state.scene.listOpenParts().map((sha) => ({
        sha, visible: state.scene.isVisible(sha), ghost: state.scene.isGhosted(sha) })),
      targets: [], ghost,
    };
  }
  if (targets.length) {
    state.isolation.targets = targets;
    state.isolation.ghost = ghost;
  }
  for (const sha of plan.toOpen) await state.scene.loadPart(sha);
  targets.forEach((sha) => {
    state.scene.setVisible(sha, true);
    state.scene.setGhost(sha, ghost); // isolate means "the solid part", same as open-part
  });
  plan.toHide.forEach((sha) => state.scene.setVisible(sha, false));
  renderPartsPanel();

  if (targets.length) await AA.exec(["camera", "frame", ...targets]);
  setSceneEmptyState(targets.length === 0 ? missing : null);
  if (missing.length && targets.length) {
    setBanner((ghost ? "Ghosted " : "Isolated ") + targets.length +
      " part(s); no installed mesh for: " + missing.join(", "), "warn");
  }
  return { opened: targets, missing };
}

// --- context and view (handoff a_context_filter_and_a_view_filter) ----------
//
// The base of the context, as shas: the run's bodies in sweep mode, else the
// rail's scope, else the selected topology's (or study's) parts; null while
// nothing scopes the model, which AA.planContext reads as "every mesh".
function contextBaseShas() {
  if (state.sweep) {
    const open = state.scene.listOpenParts();
    const shas = state.sweep.bodies
      .filter((r) => r.state !== "carried" || open.indexOf(r.sha256) !== -1)
      .map((r) => r.sha256);
    return Array.from(new Set(shas.concat(state.sweep.openedBySweep).filter(Boolean)));
  }
  const plan = state.panelFilter ||
    (state.currentTopology && AA.planScopeFilter(state.currentTopology, state.currentStudy,
      state.meshList, state.partMeshAliases));
  if (!plan) return null;
  return plan.parts.map((p) => p.sha256).filter(Boolean);
}

function currentContext() {
  return AA.planContext(state.meshList, contextBaseShas(),
    state.contextEdit.added, state.contextEdit.removed);
}

// Leaving a context -- another topology or study, or either edge of sweep mode
// -- drops what the reader added or removed and the isolation, and (unless
// `keepDrawn`) draws every open part of the new context and none outside it.
function resetContext(keepDrawn) {
  state.contextEdit = { added: [], removed: [] };
  state.isolation = null;
  if (!keepDrawn && state.scene) {
    const inModel = currentContext().inModel.map((m) => m.sha256);
    AA.planViewReset(state.scene.listOpenParts(), inModel, state.transparentParts).forEach((r) => {
      state.scene.setVisible(r.sha, r.visible);
      state.scene.setGhost(r.sha, r.ghost);
    });
  }
  renderPartsPanel();
}

// context add|remove <part…> | reset -- the model's own membership. Never a
// view change: a part added is listed, not drawn.
function cmdContext(action, ...identifiers) {
  if (AA.CONTEXT_ACTIONS.indexOf(action) === -1) {
    throw new Error("context takes one of " + AA.CONTEXT_ACTIONS.join(", ") +
      ", got " + JSON.stringify(action));
  }
  if (action === "reset") {
    state.contextEdit = { added: [], removed: [] };
  } else {
    if (!identifiers.length) throw new Error("context " + action + " needs at least one part");
    const shas = identifiers.map((id) => resolveMeshOrThrow(id).sha256);
    state.contextEdit = AA.planContextEdit(state.contextEdit, action, shas);
  }
  renderPartsPanel();
  return state.contextEdit;
}

// show-all / hide-all -- the header checkbox, over the parts in the context.
async function cmdShowAll() {
  state.isolation = null;
  const rows = currentContext().inModel;
  for (const mesh of rows) {
    await state.scene.loadPart(mesh.sha256);
    state.scene.setVisible(mesh.sha256, true);
    state.scene.setGhost(mesh.sha256, state.transparentParts);
  }
  renderPartsPanel();
  return rows.map((m) => m.sha256);
}

function cmdHideAll() {
  state.isolation = null;
  const open = state.scene.listOpenParts();
  const rows = currentContext().inModel.filter((m) => open.indexOf(m.sha256) !== -1);
  rows.forEach((m) => state.scene.setVisible(m.sha256, false));
  renderPartsPanel();
  return rows.map((m) => m.sha256);
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

// trace <topology> [study] -- the SCOPE-level 3D view (handoff
// study_3d_flyout feature 1, widened to topology scope by
// annotate_hint_bar_and_context_autofilter deliverable 4). Composed from the
// verbs above the way goto composes the three select verbs: select the
// topology (and the study, when one is named), show only the scope's parts --
// translucent while "See-through parts" is on -- and mark every
// feature-identity-bound face in the scope's own colour. Parts with no mesh
// and edges with no binding degrade to the existing honest absent states --
// never a guessed surface.
//
// With NO study the scope is the whole topology: Jeff asked for a way in
// "when an entire study or topology is selected", and the difference between
// the two is which edges are in scope and nothing else (AA.scopeSelection).
async function cmdTrace(topologyId, studyId) {
  if (!topologyId) throw new Error("trace needs <topology> [study]");
  // A trace is a bind-mode arrival, like goto (see there).
  leaveSweep();
  const arrival = AA.planArrival({
    auto: state.autoSteps,
    currentTopologyId: state.currentTopology && state.currentTopology.id,
    topologyId,
  });
  if (!arrival.applies) return keptTopologyNote(arrival, topologyId);
  if (arrival.selectTopology) cmdSelectTopology(topologyId);
  // A named study is the scope, unless the reader has turned that step off --
  // then the whole topology is, which is the honest reading of "don't pick a
  // study for me".
  if (studyId && arrival.selectStudy) cmdSelectStudy(studyId);
  const study = (studyId && arrival.selectStudy) ? state.currentStudy : null;
  state.lastEntry = { topologyId, studyId: studyId || null, edgeId: null, trace: true };

  const plan = AA.planStudyTrace(state.currentTopology, study,
    mergedIdentityProjection(), state.meshList, state.partMeshAliases);

  // The rail follows the scope too (deliverable 4: "pre-filtered to just the
  // parts included in that study/topology"). Before this, `trace` scoped the
  // 3D scene and left the parts panel listing every installed mesh in the
  // repo -- the same gap `filter-element` closed one element down.
  if (arrival.scopeParts) {
    setPanelFilter(AA.planScopeFilter(state.currentTopology, study,
      state.meshList, state.partMeshAliases));
  }

  state.scene.clearMarks();
  if (plan.ghosts.length) {
    await AA.exec([state.transparentParts ? "ghost" : "isolate", ...plan.ghosts]);
  } else {
    state.scene.listOpenParts().forEach((sha) => state.scene.setVisible(sha, false));
    renderPartsPanel();
    setSceneEmptyState(plan.missingParts.length ? plan.missingParts : null,
      plan.missingParts.length ? null
        : "Nothing in this selection names a part -- there is nothing to show in 3D.");
  }
  for (const mark of plan.marks) {
    await AA.exec(["mark-face", mark.sha256, String(mark.faceId)]);
  }
  renderDetail();

  const notes = [];
  if (plan.missingParts.length) notes.push("no mesh: " + plan.missingParts.join(", "));
  if (plan.unresolvedMarks.length) {
    notes.push(plan.unresolvedMarks.length + " binding(s) point at meshes not installed");
  }
  if (plan.unboundEdges.length) notes.push(plan.unboundEdges.length + " edge(s) unbound");
  setBanner("Traced " + scopeName(study) + ": " + plan.ghosts.length +
    (state.transparentParts ? " part(s) ghosted, " : " part(s) shown, ") +
    plan.marks.length +
    " bound face(s) marked" + (notes.length ? " -- " + notes.join("; ") : ""),
    plan.ghosts.length ? "ok" : "warn");
  const summary = {
    topologyId, studyId: study ? study.id : null,
    ghosted: plan.ghosts, marks: plan.marks,
    missingParts: plan.missingParts,
    unresolvedMarks: plan.unresolvedMarks,
    unboundEdges: plan.unboundEdges,
  };
  window.__lastTrace = summary; // the autotest convention: machine-readable result
  return summary;
}

// What a scope is called, in the reader's words: the study's title, or the
// topology's when the scope is the whole thing.
function scopeName(study) {
  if (study) return study.title || study.id;
  const topology = state.currentTopology;
  return topology ? (topology.title || topology.id) : "this topology";
}

// An arrival that did NOT apply, said out loud. `planArrival` returns this
// only in one case -- auto-select-topology is off and the reader is looking at
// a different topology -- and a launch that silently does nothing is the worst
// possible reading of a checkbox, so it is reported rather than swallowed.
function keptTopologyNote(arrival, topologyId) {
  setBanner("Kept the topology you have open. Tick Topology under " +
    "\"Set up automatically\" to follow a link into " + topologyId + ".", "warn");
  return { topologyId, studyId: null, edgeId: null, applied: false };
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
  // The pick needs its own opaque overlay while the body is faded -- a vertex
  // tint at ghost opacity is not a selection a reader can see -- and the face
  // it lands on must stop being drawn as a suggestion. Both are the suggest
  // verb's job, so this asks for it rather than reaching into the marks.
  refreshSuggestions();
  return state.currentPick;
}

// highlight <topology> <edge> | highlight clear -- tint one edge's bound face
// while the viewer's pointer rests on that edge's row (handoff the_3d_pane_
// opens_in_the_mode_the_study_wants, deliverable 3). A viewing aid on what is
// drawn: it opens nothing, picks nothing and writes nothing, so it runs in
// sweep mode too (the tint rides the moving part at the current frame).
//
// It borrows the pick's tint, so it gives the pick back: clearing a highlight
// while a face is picked re-tints the pick rather than leaving nothing.
//
// An edge with nothing to tint is not an error -- most edges of a study are
// unbound -- so the answer is a line in this app's own console output and the
// return value, never the banner.
//
// `highlight <topology> <edge> <from|to>` narrows to one END of the edge --
// the sweep rail's node features (handoff the_sweep_rail_shows_the_mechanism).
// Clearing in sweep mode puts back what the rail has selected, the same way it
// puts back the pick.
function cmdHighlight(topologyId, edgeId, direction) {
  if (topologyId === "clear" && edgeId === undefined) {
    const pick = state.currentPick;
    const inspected = state.sweep && state.sweep.inspect && state.sweep.inspect.faces;
    if (inspected && inspected.length) state.scene.highlightFaces(inspected);
    else if (pick) state.scene.highlightFace(pick.sha256, pick.faceId);
    else state.scene.clearHighlight();
    window.__lastHighlight = null;
    return null;
  }
  if (!topologyId || !edgeId) throw new Error("highlight needs <topology> <edge>, or clear");
  if (direction !== undefined && AA.DIRECTIONS.indexOf(direction) === -1) {
    throw new Error("highlight's third word is one of " + AA.DIRECTIONS.join(", ") +
      ", got " + JSON.stringify(direction));
  }
  const open = new Set(state.scene.listOpenParts());
  const plan = AA.planHighlight(mergedIdentityProjection(), topologyId, edgeId,
    (sha) => open.has(sha), direction);
  window.__lastHighlight = plan.face;
  if (!plan.face) {
    el.consoleOutput.textContent = "> highlight " + topologyId + " " + edgeId + "\n" + plan.note;
    return null;
  }
  state.scene.highlightFace(plan.face.sha256, plan.face.faceId);
  return plan.face;
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
  // Letting go of the face takes its overlay down; letting go of the ELEMENT
  // takes the whole suggestion display down, bodies included.
  refreshSuggestions();
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
  setPanelFilter(plan);
  return plan;
}

// One scope onto the rail, whatever produced it -- `planPanelFilter`'s element
// plan or `planScopeFilter`'s study/topology plan. They are the same shape on
// purpose (commands.js), so there is one setter and one pair of renderers.
function setPanelFilter(plan) {
  state.panelFilter = plan;
  renderElementList();
  renderPartsPanel();
  renderRailFilter();
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
  // Arriving at an element is arriving in BIND mode: a goto while a sweep is
  // playing leaves it first (handoff the_3d_pane_opens_in_the_mode_the_study_
  // wants -- the viewer's pane posts a goto when the reader moves from a
  // kinematic study to a chain study, and a binding is only ever made at the
  // as-modelled pose sweep mode moves away from). leaveSweep restores the
  // scene exactly and is a no-op outside sweep mode.
  leaveSweep();
  const arrival = AA.planArrival({
    auto: state.autoSteps,
    currentTopologyId: state.currentTopology && state.currentTopology.id,
    topologyId,
  });
  if (!arrival.applies) return keptTopologyNote(arrival, topologyId);
  if (arrival.selectTopology) cmdSelectTopology(topologyId);
  const topology = state.currentTopology;
  let targetStudyId = studyId || null;
  if (!targetStudyId && edgeId) {
    const owning = (topology.studies || []).find((s) => (s.selection || []).includes(edgeId));
    if (owning) targetStudyId = owning.id;
  }
  if (targetStudyId && arrival.selectStudy) cmdSelectStudy(targetStudyId);
  // The edge is never gated: it is the thing the reader clicked on, and the
  // three checkboxes are about how much CONTEXT comes with it.
  if (edgeId) cmdSelectEdge(edgeId);
  state.lastEntry = { topologyId, studyId: studyId || null, edgeId: edgeId || null, trace: false };

  // Arriving AT one element scopes the rail to it (handoff flyout_resize_
  // annotator_filter_and_deselect, deliverable 2) -- this is the "entered
  // from" Jeff's note names, and `goto` is the one verb that means it.
  // `select-edge` deliberately does not: it is what clicking a row in the rail
  // runs, and a rail that collapsed to the row you just clicked would be
  // unusable. Arriving with no edge LIFTS any filter a previous goto left, so
  // a whole-topology link is never read through a stale scope.
  //
  // ...and it now ISOLATES that element's parts in the 3D view as well as in
  // the two lists (annotate_hint_bar_and_context_autofilter, deliverable 2:
  // Jeff -- "you already know the 3d body, the topology, the study, the
  // component, etc, so all of these should be filtered automatically"). The
  // link's own `isolate=` param, where one is present, still runs after this
  // and wins: an explicitly named part beats a derived one.
  if (!arrival.scopeParts) {
    return { topologyId, studyId: targetStudyId, edgeId: edgeId || null, applied: true };
  }
  const plan = cmdFilterElement(edgeId || null);
  const shas = ((plan && plan.parts) || [])
    .map((p) => p.sha256).filter(Boolean);
  // Never on an empty list: `isolate` with nothing to show would blank the
  // scene, and a gap edge that names no part at all has nothing to isolate.
  if (shas.length) {
    await AA.exec([state.transparentParts ? "ghost" : "isolate", ...shas]);
  }
  renderDetail();
  return { topologyId, studyId: targetStudyId, edgeId: edgeId || null, applied: true };
}

// --- the settings verbs (deliverables 3 and 4) -----------------------------
//
// Every checkbox on this page drives one of these rather than poking state:
// the standing everything-is-a-command rule, and the reason a future driver
// can turn the same switches a reader can.

// auto-filter <topology|study|part> <on|off> -- one step of an arrival, on or
// off. Turning `part` off LIFTS the current scope immediately and turning it
// back on re-applies the last arrival: "returns that control to manual"
// (deliverable 3) has to be something the reader can see happen, not a
// promise about the next launch.
async function cmdAutoFilter(key, value) {
  if (AA.AUTO_STEP_KEYS.indexOf(key) === -1) {
    throw new Error("auto-filter takes one of " + AA.AUTO_STEP_KEYS.join(", ") +
      ", got " + JSON.stringify(key));
  }
  const on = AA.parseOnOff(value);
  state.autoSteps[key] = on;
  AA.writeStoredAutoSteps(prefStore(), state.autoSteps);
  renderAutoSetup();
  // Two independent statements, not an if/else: turning the scope OFF and
  // turning it back ON are different jobs (one lifts what is on screen, the
  // other re-runs an arrival), and an else-branch makes each one a fallback
  // for the other -- which is how a mutation dropping the lift went on
  // lifting, through a replay whose own topology re-select clears the scope.
  if (key === "part" && !on) cmdFilterElement(null);
  if (key === "part" && on && state.lastEntry) await replayLastEntry();
  return Object.assign({}, state.autoSteps);
}

// transparency <on|off> -- Jeff: "Definitely include an option to enable/
// disable transparency." One setting for both entry shapes (scope-level and
// element-level), applied to what is on screen NOW as well as remembered for
// the next arrival -- a display toggle that only takes effect on the next
// launch is a toggle nobody trusts.
function cmdTransparency(value) {
  const on = AA.parseOnOff(value);
  state.transparentParts = on;
  AA.writeStoredTransparency(prefStore(), on);
  state.scene.listOpenParts().forEach((sha) => {
    if (state.scene.isVisible(sha)) state.scene.setGhost(sha, on);
  });
  renderHintPanel();
  return on;
}

// --- face suggestions (handoff annotate_face_suggestions) ------------------
//
// Jeff: "you can greatly narrow it down (diameters require cylindrical
// surfaces, flanges require planar surfaces, etc), so we could display the
// body as transparent and then use a different color for suggested surfaces,
// and another color for currently selected surface (if any)."
//
// The rules and the geometry are in suggestions.js / face_geometry.js, both
// pure; this half is the three impure things they cannot do -- read a mesh's
// buffers, paint the scene, and remember which bodies the display faded.
//
// THE FENCE: a suggestion is colour and nothing else. Nothing below selects a
// face, and nothing below writes an event. `mark-face`'s own overlay
// machinery does the drawing, in the `suggested` role.

// One mesh's faces, classified once per session. Reads through the storage
// adapter directly rather than through the scene, because a REFERENCE face
// (the other half of an interface, on the adjacent part) can live on a part
// nobody has opened -- and classifying a shape does not require rendering it.
async function ensureFaceClasses(sha256) {
  if (state.faceClasses[sha256]) return state.faceClasses[sha256];
  const manifest = await state.storage.readMeshManifest(sha256);
  if (!manifest) return null;
  const [posBuf, idxBuf, fidBuf] = await Promise.all([
    state.storage.readMeshBuffer(sha256, manifest.positions_file),
    state.storage.readMeshBuffer(sha256, manifest.indices_file),
    state.storage.readMeshBuffer(sha256, manifest.face_ids_file),
  ]);
  if (!posBuf || !idxBuf || !fidBuf) return null;
  state.faceClasses[sha256] = AA.classifyPartFaces(
    manifest.faces, new Float32Array(posBuf), new Uint32Array(idxBuf),
    new Uint32Array(fidBuf));
  return state.faceClasses[sha256];
}

// Every mesh a suggestion for `edge` could need read: the element's own part,
// and every part a nearby binding points at. Done before planning rather than
// inside it, because the planner is pure and cannot fetch -- and a reference
// whose mesh went unread silently loses the narrowing it would have supplied.
async function loadClassesForSuggestion(edge, identity) {
  const wanted = [];
  const mesh = edge.part
    ? AA.resolveMeshIdentifier(state.meshList, edge.part, state.partMeshAliases)
    : null;
  if (mesh) wanted.push(mesh.sha256);
  for (const direction of AA.DIRECTIONS) {
    AA.gatherFaceReferences(state.currentTopology, edge.id, direction, identity)
      .forEach((reference) => {
        if (wanted.indexOf(reference.sha256) === -1) wanted.push(reference.sha256);
      });
  }
  for (const sha of wanted) {
    try {
      await ensureFaceClasses(sha);
    } catch (err) {
      // A mesh that cannot be read costs its own narrowing and nothing else:
      // the planner treats an unclassified reference as "not known", which is
      // the truth about it.
      setBanner("Could not read the shapes of one part: " + err.message, "warn");
    }
  }
}

// WHY THE SUGGESTION DISPLAY DOES NOT FADE THE BODY ITSELF, which was the one
// real design decision in this handoff and it went the other way first.
//
// A candidate can be a bore's inner wall, which is behind the part, so an
// opaque body hides the very face the page is pointing at -- and the handoff
// asks for the body to render transparent while suggestions are up. The first
// build therefore faded the suggested part unconditionally and put it back
// afterwards. The browser tier caught what that costs: with suggestions on,
// unticking **See-through parts** did nothing a reader could see, because the
// suggestion display immediately faded the body again. A control that does
// nothing is worse than a body you have to rotate.
//
// So translucency has ONE owner -- the `transparency` verb and its checkbox --
// and the suggestion display asks for whatever that says. It is on by default,
// so the handoff's display state is what a reader meets; a reader who turns it
// off has said they want solid bodies, and gets them, with the candidates
// still coloured on every face they can see.

// suggest -- colour the faces that could be the selected element's feature.
// Recomputed rather than cached, because everything it reads can change under
// it: the element, the pick, and (after a bind) the bindings themselves.
//
// A verb, so the thing a click does is the thing a driver can ask for -- and,
// unlike the checkbox, it is never gated: a verb typed by hand does what it
// says, the same rule the select-* verbs follow.
async function cmdSuggest() {
  state.scene.clearMarks("suggested");
  state.scene.clearMarks("picked");
  state.suggestionPlan = null;
  const edge = state.selectedEdge;
  if (!edge || !state.currentTopology) {
    renderDetail();
    return null;
  }
  const identity = mergedIdentityProjection();
  await loadClassesForSuggestion(edge, identity);
  const plan = AA.planFaceSuggestions({
    topology: state.currentTopology,
    edgeId: edge.id,
    identityProjection: identity,
    meshes: state.meshList,
    aliases: state.partMeshAliases,
    faceClasses: state.faceClasses,
  });
  state.suggestionPlan = plan;

  // Nothing suggested renders the ORDINARY view -- not a faded ghost of a body
  // with no marks on it, which says "look here" about nothing (the handoff's
  // own requirement, and the standing rule that an absent feature shows
  // nothing at all).
  if (!plan.faces.length) {
    renderDetail();
    return plan;
  }

  // The face under the pick is drawn as the PICK and not as a suggestion: two
  // opaque overlays on one face would z-fight, and "you picked this" is the
  // more specific of the two claims.
  const picked = state.currentPick;
  const faces = plan.faces.filter((f) =>
    !(picked && picked.sha256 === f.sha256 && picked.faceId === f.faceId));
  const shas = [];
  plan.faces.forEach((f) => { if (shas.indexOf(f.sha256) === -1) shas.push(f.sha256); });

  for (const sha of shas) {
    if (state.scene.listOpenParts().indexOf(sha) === -1) await state.scene.loadPart(sha);
    state.scene.setVisible(sha, true);
    // Translucency per the See-through setting and never against it -- see the
    // note above cmdSuggest for what forcing it cost.
    state.scene.setGhost(sha, state.transparentParts);
  }
  faces.forEach((f) => state.scene.markFace(f.sha256, f.faceId, "suggested"));
  if (picked && shas.indexOf(picked.sha256) !== -1) {
    state.scene.markFace(picked.sha256, picked.faceId, "picked");
  }
  renderPartsPanel();
  renderDetail();
  return plan;
}

// auto-suggest <on|off> -- whether selecting an element does the above.
// `transparency`'s shape exactly: persisted, and applied to what is on screen
// NOW as well as remembered, because a display toggle that only takes effect
// on the next selection is a toggle nobody trusts.
async function cmdAutoSuggest(value) {
  const on = AA.parseOnOff(value);
  state.faceSuggestions = on;
  AA.writeStoredSuggestions(prefStore(), on);
  if (on) {
    await cmdSuggest();
    return on;
  }
  state.scene.clearMarks("suggested");
  state.scene.clearMarks("picked");
  state.suggestionPlan = null;
  renderDetail();
  return on;
}

// What every UI path that changes the element or the pick calls. Goes through
// the verb (never around it), does nothing while the reader has the setting
// off, and reports a failure on the banner rather than rejecting into a click
// handler nobody awaits.
async function refreshSuggestions() {
  if (!state.faceSuggestions) return null;
  try {
    return await AA.exec(["suggest"]);
  } catch (err) {
    setBanner(err.message, "error");
    return null;
  }
}

// --- sweep mode (handoff kinematic_sweep_animation) ------------------------
//
// Jeff: "I need a way to review/verify the results, and an animated sweep
// would be the most ideal ... even better would be to anchor the 3d bodies to
// the kinematic rigid bodies and animate those through the sweep."
//
// This half is the impure one, as everywhere else in this app: reading the
// run through the storage adapter, resolving each body's parts to mesh
// occurrences, driving the scene and painting the bar. Every number it shows
// and every decision it makes comes out of sweep.js, which a test in Node can
// call.
//
// THIS MODE WRITES NOTHING. It is a viewer of another repo's solver output;
// `storage.writeFeatureIdentityEvent` is not reachable from anything below,
// and face picking is switched off outright whenever the linkage is away from
// the as-modelled pose every binding in this repo is about.

// What the console says when nothing has published a run yet. Plain words and
// nothing to paste, the posture AA.NO_PROJECTION_NOTICE set: this page has no
// transport that could ask anything to produce one.
const NO_SWEEP_RUNS = "No solver runs have been published into this " +
  "repository yet. They are produced by the linkage solver, not from this page.";

function sweepState() {
  if (!state.sweep) throw new Error("not in sweep mode — load a run first");
  return state.sweep;
}

// sweep <run-id> [kinematic study] | latest | off
//
// The optional second word is the kinematic study the run was opened from
// (handoff the_sweep_rail_shows_the_mechanism): the viewer's pane passes it,
// `?sweep=<run>&kinematic=<study>` boots with it, and the rail then lists that
// study's contributors. A study the projection does not carry -- or no
// projection at all -- is a rail without that group, never an error. So is a
// study that folded a DIFFERENT run (AA.sweepStudyFor), and that one says why
// on the banner and in the console's result: its numbers are not this run's.
async function cmdSweep(target, studyId) {
  const want = String(target == null ? "" : target).trim();
  if (!want) throw new Error("sweep takes a run, or \"latest\", or \"off\"");
  if (want === "off") return leaveSweep();

  // Newest first by each run's own `ts` -- the adapter's answer, through
  // AA.orderSweepRuns. Read every time, because the picker offers them all.
  state.sweepRuns = await state.storage.listSweepRuns();
  let runId = want;
  if (want === "latest") {
    if (!state.sweepRuns.length) throw new Error(NO_SWEEP_RUNS);
    runId = state.sweepRuns[0].runId;
  }
  const doc = await state.storage.readSweepRun(runId);
  if (!doc) throw new Error("there is no published run called " + runId);
  // Throws naming the schema it found -- including the one case a reader is
  // most likely to hit, a v0 run that carries measurements and no poses.
  const artifact = AA.readSweepArtifact(doc);
  let study = null;
  let studyDecimals = null;
  if (studyId) {
    const kinematic = state.storage.readKinematicProjection
      ? await state.storage.readKinematicProjection() : null;
    study = ((kinematic && kinematic.studies) || []).find((s) => s.id === studyId) || null;
    studyDecimals = kinematic ? kinematic.display_decimals : null;
  }
  const paired = AA.sweepStudyFor(study, artifact.runId);
  study = paired.study;

  if (state.sweep) leaveSweep();
  const structure = AA.sweepStructure(artifact);
  const trails = AA.sweepTrails(artifact);
  state.sweep = {
    artifact, structure, trails,
    driverValues: AA.sweepDriverValues(artifact),
    // Where face picking works, computed once per loaded run (AA.
    // sweepAsModelledIndex): null when no frame of the run qualifies.
    asModelledIndex: AA.sweepAsModelledIndex(artifact),
    index: 0,
    // The continuous wall-clock position tickSweep integrates, kept apart
    // from `index` because reduced motion rounds `index` for DISPLAY -- see
    // tickSweep's own comment for why feeding the rounded value back into
    // itself would stall playback. Resynced to `index` by every manual
    // navigation (setSweepIndex), so a seek or a step while playing is never
    // undone by the next frame's advance.
    playbackPosition: 0,
    playing: false,
    speed: AA.SWEEP_DEFAULT_SPEED,
    // Ping-pong by default: Jeff's own description of what he wants to watch
    // is the sweep running out "and back".
    loop: "pingpong",
    direction: 1,
    layers: Object.assign({}, AA.SWEEP_DEFAULT_LAYERS),
    // Per body: which occurrence was chosen, the residual, and the refusal
    // when there was one. Written by anchorSweepBodies below and read by the
    // bar's disclosure -- never by the renderer, which just gets matrices.
    bodies: [],
    // Per mesh, what moves and what stays (AA.sweepDrawPlan), and every mesh
    // this run anchors at all -- built once, after the bodies resolve.
    plan: {},
    anchored: [],
    // What was on screen before, so leaving restores it exactly. Nothing is
    // HIDDEN on the way in any more: an opened part this run does not move
    // sits where the assembly puts it, which is the mechanism's context.
    restoreVisible: state.scene.listOpenParts()
      .map((sha) => ({ sha, visible: state.scene.isVisible(sha),
        ghost: state.scene.isGhosted(sha) })),
    // Parts this mode opened, unloaded again on the way out: "leaving sweep
    // mode restores the scene exactly" includes not leaving five pitch arms
    // open that nobody asked for.
    openedBySweep: [],
    lastTick: null,
    // A rolling frame rate, for the dev handle only -- never on the surface.
    // It is here because "does this run at a usable rate with the 286-solid
    // hub loaded" is a question about a build, measurable only in one.
    fps: 0,
    // The rail's mechanism tree (AA.sweepMechanismTree), what is open in it,
    // and what it has selected ({kind, name, faces} | null). The study is the
    // kinematic study this run was opened from, or null.
    tree: AA.sweepMechanismTree(artifact),
    treeOpen: {},
    inspect: null,
    // Which drawn occurrences each body and link is ({subject: [{sha256,
    // key}]}, AA.sweepSubjectOccurrences), written once the bodies resolve;
    // the occurrences a rail checkbox has hidden, put back on the way out;
    // and the part the scene's pointer rests on ({sha256, subject, bindings}).
    occurrences: {},
    hidden: [],
    sceneHover: null,
    study,
    studyDecimals,
    stopId: null,
  };
  state.isolation = null;
  state.contextEdit = { added: [], removed: [] };
  // A sweep arrival selects the topology the run is about, through the verb
  // the topology select drives (so the filter-clearing and study reset
  // happen). A run that names none -- or one this projection does not carry --
  // leaves the rail alone; a run picker switching between runs of the same
  // topology does not reset a study the reader chose.
  if (artifact.topologyId && state.topologyProjection &&
      (!state.currentTopology || state.currentTopology.id !== artifact.topologyId) &&
      state.topologyProjection.topologies.some((t) => t.id === artifact.topologyId)) {
    selectTopology(artifact.topologyId);
  }
  state.scene.enterSweep(Object.assign({ trails }, structure));
  state.scene.onSweepHover = showSweepTip;
  setRailSweepPosture(true);
  applySweepFrame();
  renderSweepRail();
  state.scene.frameSweepScene();
  renderDetail();
  // Not awaited: the stick figure is on screen and usable the moment the run
  // is read, and resolving five occurrences against fitted geometry is the
  // slow part. It repaints the bar when it lands.
  anchorSweepBodies().catch((err) => setBanner(err.message, "error"));
  if (paired.refusal) setBanner(paired.refusal, "warn");
  const loaded = { runId, points: artifact.points.length, source: artifact.source };
  if (paired.refusal) loaded.contributors = paired.refusal;
  return loaded;
}

function leaveSweep() {
  const sweep = state.sweep;
  if (!sweep) return null;
  state.sweep = null;
  showSweepTip(null, null);
  state.scene.clearHover();
  window.__lastHover = null;
  // An occurrence a body's checkbox hid is the sweep rail's state, and the
  // rail is going: every one comes back with it.
  for (const o of sweep.hidden) state.scene.setOccurrencesVisible(o.sha256, [o.key], true);
  setRailSweepPosture(false);
  if (sweep.inspect && sweep.inspect.faces.length) {
    if (state.currentPick) state.scene.highlightFace(state.currentPick.sha256, state.currentPick.faceId);
    else state.scene.clearHighlight();
  }
  window.__lastInspect = null;
  state.scene.exitSweep();
  for (const sha of sweep.openedBySweep) state.scene.unloadPart(sha);
  for (const entry of sweep.restoreVisible) {
    state.scene.setVisible(entry.sha, entry.visible);
    state.scene.setGhost(entry.sha, entry.ghost);
  }
  resetContext(true); // the run's context ends with it; what is drawn was just restored
  renderDetail();
  return { left: true };
}

// --- phase 2: the bodies -----------------------------------------------------

// Every occurrence recorded anywhere in the installed store, keyed by its own
// path through the assembly, plus which mesh recorded each and that mesh's
// product name. Read once per session.
//
// WHY THE WHOLE STORE, and not just the aliased mesh's own: blade 1 carries
// the INSTRUMENTED variant of both the pitch link and the blade, so the
// design part this repo draws has no instance of its own at blade 1's
// occurrence -- that occurrence is recorded on the instrumented mesh's
// provenance. AA.sweepCandidateOccurrences is what narrows this back down,
// exactly, per part. (docs/topologies/part_mesh_aliases.json's two
// 2026-10-01 rows carry the measurement that makes drawing one part's mesh
// at the other's occurrence sound -- they share a local frame.)
async function loadOccurrences() {
  if (state.occurrences) return state.occurrences;
  const provenance = {};
  for (const mesh of state.meshList) {
    try { provenance[mesh.sha256] = await state.storage.readMeshProvenance(mesh.sha256); }
    catch (err) { provenance[mesh.sha256] = null; }
  }
  state.occurrences = AA.readMeshOccurrences(state.meshList, provenance);
  return state.occurrences;
}

// Where one part sits when nothing moves it -- the scene asks this once per
// part it opens (scene.placementsFor), so every opened part, in every mode,
// is drawn at every position the assembly records for it.
function restOf(sha256) {
  const occ = state.occurrences;
  return AA.restPlacements(occ ? occ.byMesh[sha256] : null);
}

// The note a part's position needs, or null when it needs none.
function positionNote(sha256) {
  if (!state.occurrences) return null;
  return AA.assemblyPositionNote(restOf(sha256));
}

// One mesh's joint-feature candidates, in its own local frame, with the word
// for where they came from. Fitted where the part is small enough to fit;
// the manifest's face centroids otherwise (AA.SWEEP_FEATURE_SOURCES).
//
// A ball gives a located POINT (its centre); a bore gives an AXIS, and it is
// carried as one -- see AA.sweepFeatureDistance for why a bore's fitted
// point is not where the joint is.
async function sweepFeaturePoints(sha256) {
  if (state.sweepFeatures[sha256]) return state.sweepFeatures[sha256];
  const manifest = await state.storage.readMeshManifest(sha256);
  if (!manifest) return null;
  let answer = null;
  if ((manifest.n_triangles || 0) <= AA.SWEEP_FIT_TRIANGLE_BUDGET) {
    const classes = await ensureFaceClasses(sha256);
    if (classes) {
      const points = [];
      for (const face of classes) {
        if (!face) continue;
        if (face.centre) points.push({ p: face.centre });
        else if (face.axisPoint) points.push({ p: face.axisPoint, d: face.axis });
      }
      if (points.length) answer = { source: "fitted", points };
    }
  }
  if (!answer) {
    const points = (manifest.faces || [])
      .map((f) => f.centroid_native)
      .filter((c) => c && c.length === 3)
      .map((c) => ({ p: c }));
    answer = { source: "centroid", points };
  }
  state.sweepFeatures[sha256] = answer;
  return answer;
}

// For each body: resolve its parts to installed meshes, decide which recorded
// occurrence (or occurrences) each one is, and hand the scene a matrix per
// occurrence. A part that cannot be resolved keeps its stick figure and says
// why -- the honest state, never a mesh drawn somewhere plausible.
//
// THREE WAYS A PART GETS PLACED, in this order, and the bar names which one
// every time:
//
//   ground      the body does not move, so its parts sit exactly where
//               provenance says and there is nothing to choose. This is also
//               what keeps the 286-solid hub off the fitting path.
//   matched     the body moves, so an occurrence has to EARN the placement by
//               putting one of the part's own joint features on a joint point
//               the solver reports. More than one occurrence may earn it --
//               the pitch link carries two spherical bearings, one at each
//               end, and both are drawn.
//   refused     nothing earned it. Said in words, with the distance.
async function anchorSweepBodies() {
  const sweep = state.sweep;
  if (!sweep) return [];
  const artifact = sweep.artifact;
  const asModelled = artifact.points[artifact.points.length - 1];
  const occurrences = await loadOccurrences();
  // This runs off the render path and takes seconds; a reader may leave the
  // run, or load another, before it lands. Every await below re-checks, and a
  // superseded run stops -- otherwise it would go on opening parts for a
  // sweep that no longer exists, which nothing would ever close.
  const superseded = () => state.sweep !== sweep;

  // The link bodies are the distance-constraint members, which have a
  // reconstructed pose of their own rather than a `bodies[]` entry. Their own
  // two joint ends are their targets, which is how the pitch link and both
  // its bearings find blade 1's occurrence.
  const subjects = sweep.structure.bodies.map((b) => ({
    name: b.name, ground: b.ground, riders: b.riders || [],
    parts: (artifact.bodies.filter((x) => x.name === b.name)[0] || {}).parts || [],
  })).concat((artifact.links || []).map((l) => ({
    name: l.joint, ground: false, parts: l.parts || [],
    riders: AA.SWEEP_JOINT_ENDS.map((end) => ({ joint: l.joint, end })),
  })));

  const rows = [];
  for (const subject of subjects) {
    // Where this subject's joint ends are in the as-modelled frame: the
    // points an occurrence has to agree with.
    const targets = subject.riders
      .map((r) => asModelled.joints[r.joint] && asModelled.joints[r.joint][r.end])
      .filter(Boolean);

    for (const partId of subject.parts) {
      const mesh = AA.resolveMeshIdentifier(state.meshList, partId, state.partMeshAliases);
      if (!mesh) {
        rows.push({ subject: subject.name, part: partId, state: "no-mesh" });
        continue;
      }
      const candidateOccurrences = AA.sweepCandidateOccurrences(
        occurrences.byMesh[mesh.sha256], occurrences.all,
        occurrences.productOf[mesh.sha256]);
      if (!candidateOccurrences.length) {
        rows.push({ subject: subject.name, part: partId, sha256: mesh.sha256,
          state: "no-occurrence" });
        continue;
      }
      if (subject.ground) {
        const mine = occurrences.byMesh[mesh.sha256] || candidateOccurrences;
        rows.push({ subject: subject.name, part: partId, sha256: mesh.sha256,
          state: "ground",
          candidates: mine.length,
          candidateKeys: mine.map((o) => o.key),
          placements: mine.map((o) => ({ key: o.key, instance_name: o.instance_name,
            placement: o.placement, residual: null })) });
        continue;
      }
      if (!targets.length) {
        rows.push({ subject: subject.name, part: partId, sha256: mesh.sha256,
          state: "no-joint" });
        continue;
      }
      const features = await sweepFeaturePoints(mesh.sha256);
      if (superseded()) return [];
      if (!features || !features.points.length) {
        rows.push({ subject: subject.name, part: partId, sha256: mesh.sha256,
          state: "no-feature" });
        continue;
      }
      const limits = AA.sweepInstanceLimits(features.source);
      const candidates = candidateOccurrences.map((occurrence) => ({
        instance_name: occurrence.instance_name,
        key: occurrence.key,
        placement: occurrence.placement,
        points: features.points.map(
          (f) => AA.placeSweepFeature(occurrence.placement, f)),
      }));
      // One decision per joint end, because one part may legitimately sit at
      // more than one of them -- and deduplicated, because one occurrence may
      // legitimately be the nearest to both.
      const placements = [];
      let refusal = null;
      for (const target of targets) {
        const answer = AA.chooseSweepInstance(candidates, target, limits);
        if (answer.refused) {
          if (!refusal || (answer.residual != null && refusal.residual != null &&
            answer.residual < refusal.residual)) refusal = answer;
          continue;
        }
        if (placements.some((p) => p.key === answer.key)) continue;
        placements.push({ key: answer.key, instance_name: answer.chosen,
          placement: answer.candidate.placement, residual: answer.residual });
      }
      rows.push({
        subject: subject.name, part: partId, sha256: mesh.sha256,
        state: placements.length ? "matched" : "refused",
        featureSource: features.source,
        candidates: candidateOccurrences.length,
        candidateKeys: candidateOccurrences.map((o) => o.key),
        placements: placements,
        residual: placements.length ? placements[0].residual : null,
        reason: placements.length ? null : (refusal && refusal.reason),
      });
    }
  }

  // What moves, decided once: the matched occurrences, everything recorded
  // INSIDE one of them (the plate's bushings ride the plate -- see
  // AA.sweepCarriedOccurrences), and every other occurrence of those same
  // meshes left where the assembly puts it.
  const drawn = AA.sweepDrawPlan(rows, occurrences);
  for (const row of carriedRows(drawn.carried)) rows.push(row);
  sweep.plan = drawn.plan;
  sweep.anchored = Array.from(new Set(rows
    .filter((r) => r.placements && r.placements.length).map((r) => r.sha256)));

  // Open every mesh that got a placement, once -- including the ones carried
  // INSIDE a moving occurrence, which nobody listed and which belong to it.
  // Not one carried at exactly a matched path by a different mesh (the
  // instrumented link at the design link's slot): that is the same part
  // twice, drawn on top of itself. It moves if a reader opens it.
  for (const row of rows) {
    if (!row.placements || !row.placements.length) continue;
    if (row.state === "carried" && !row.inside) continue;
    if (state.scene.listOpenParts().indexOf(row.sha256) !== -1) continue;
    if (superseded()) return [];
    try {
      await AA.exec(["open-part", row.sha256]);
      // Opened for THIS run: if it was left meanwhile, close it again.
      if (superseded()) { state.scene.unloadPart(row.sha256); return []; }
      sweep.openedBySweep.push(row.sha256);
    } catch (err) { /* the row already says what happened */ }
  }
  sweep.bodies = rows;
  sweep.occurrences = AA.sweepSubjectOccurrences(rows);
  renderPartsPanel();
  applySweepFrame();
  // The scene is only now what it is going to be, so this is where it gets
  // framed -- a stick figure and a stick figure inside a 286-solid hub want
  // very different camera distances.
  state.scene.frameSweepScene();
  renderDetail();
  return rows;
}

// The carried occurrences as bar rows, one per (mesh, body): which body's
// pose they ride, inside which matched occurrence, and how many of them.
function carriedRows(carried) {
  const byKey = new Map();
  for (const c of carried) {
    const id = c.sha256 + "|" + c.subject;
    if (!byKey.has(id)) {
      const mesh = state.meshList.filter((m) => m.sha256 === c.sha256)[0];
      byKey.set(id, { subject: c.subject, part: mesh ? AA.meshShortName(mesh.label) : c.sha256,
        sha256: c.sha256, state: "carried", by: c.by, under: c.under,
        inside: false, placements: [] });
    }
    const row = byKey.get(id);
    row.inside = row.inside || c.inside;
    row.placements.push({ key: c.key, instance_name: c.instance_name,
      placement: c.placement, residual: null });
  }
  return Array.from(byKey.values());
}

// What a hovered joint bead says. The sentence is AA.sweepJointTooltip's --
// including the link convention, which comes out of the artifact verbatim --
// and this is the two lines that put it on screen.
function showSweepTip(hover, ev) {
  if (!el.sweepTip) return;
  const sweep = state.sweep;
  if (!hover || !sweep || !sweep.frame || !ev) {
    el.sweepTip.style.display = "none";
    el.sweepTip.textContent = "";
    return;
  }
  el.sweepTip.textContent = AA.sweepJointTooltip(sweep.artifact, sweep.frame, hover.name);
  el.sweepTip.style.display = "block";
  // Offset from the pointer rather than centred on it, so the tooltip never
  // sits under the cursor and flickers the hover it is reporting.
  el.sweepTip.style.left = (ev.clientX + 14) + "px";
  el.sweepTip.style.top = (ev.clientY + 14) + "px";
}

// --- the frame -----------------------------------------------------------

// Everything that depends on WHERE the scrubber is, in one function, so the
// clock, the bar, a verb and the deep link all produce the same scene.
function applySweepFrame() {
  const sweep = state.sweep;
  if (!sweep) return null;
  const frame = AA.sweepFrameAt(sweep.artifact, sweep.index);
  sweep.frame = frame;
  state.scene.setSweepFrame(frame, frame.nearer.converged);
  // The contributor group reads the stop nearest the frame; repaint the rail
  // only when the frame crosses to another one.
  if (sweep.study) {
    const stop = AA.kinematicStopAt(sweep.study, frame);
    if ((stop ? stop.id : null) !== sweep.stopId && document.getElementById("sweep-tree")) {
      renderSweepRail();
    }
  }

  // One mesh at a time, not one row: a mesh may be moved by one body at one
  // occurrence and left still at four others (the pitch arm), and its matrices
  // are one list. The plan decided which; this composes the frame's poses
  // onto it (AA.sweepMeshMatrices) and decides nothing.
  for (const sha of sweep.anchored) {
    const entries = sweep.plan[sha];
    if (entries) {
      // Keyed, index for index, so an occurrence a rail checkbox hid stays
      // hidden whichever list is drawn.
      state.scene.setPartMatrix(sha, sweep.layers.bodies
        ? AA.sweepMeshMatrices(entries, sweep.frame) : null,
      sweep.layers.bodies ? entries.map((e) => e.key) : null);
    }
    state.scene.setVisible(sha, !!sweep.layers.bodies);
    // THE SAME "See-through parts" PREFERENCE the rest of this app honours,
    // and for a sharper reason here: the stick figure is sweep mode's
    // content and the bodies are what it is attached to, so an opaque
    // 286-solid hub hides the thing a reader opened this mode to watch.
    // Default on; a reader who wants solid bodies unticks the box they
    // already know.
    //
    // Neither input below changes between frames of a playing sweep --
    // `transparentParts` is a stored preference and a row's placements are
    // the occurrence's as-modelled `placement_world`, which by definition
    // does not move. Applying either one again every frame bumps the part's
    // material version (setGhost) or reallocates a mesh and a material per
    // part (setSweepGhost), so each is applied only on the frame its own
    // input actually changes, tracked per mesh on the sweep itself -- a fresh
    // object every time a sweep (re)starts, so there is nothing stale to
    // reset.
    const applied = sweep.applied || (sweep.applied = {});
    const mine = applied[sha] || (applied[sha] = {});
    const wantGhost = !!state.transparentParts;
    if (mine.ghost !== wantGhost) {
      state.scene.setGhost(sha, wantGhost);
      mine.ghost = wantGhost;
    }
    // The as-modelled copies are of what MOVES -- a still occurrence's copy
    // would sit exactly on top of it, saying nothing.
    const wantSweepGhost = !!sweep.layers.ghost && !!entries;
    if (mine.sweepGhost !== wantSweepGhost) {
      state.scene.setSweepGhost(sha, wantSweepGhost
        ? entries.filter((e) => e.subject).map((e) => e.placement) : null);
      mine.sweepGhost = wantSweepGhost;
    }
  }
  // ...and the same preference on every OTHER visible part: a still part is
  // context, and an opaque one in front of the plate hides the thing this
  // mode was opened to watch exactly as an anchored one would. Cached the
  // same way; leaving sweep mode puts each part's own state back.
  const applied = sweep.applied || (sweep.applied = {});
  for (const sha of state.scene.listOpenParts()) {
    if (sweep.anchored.indexOf(sha) !== -1 || !state.scene.isVisible(sha)) continue;
    const mine = applied[sha] || (applied[sha] = {});
    const wantGhost = !!state.transparentParts;
    if (mine.ghost !== wantGhost) {
      state.scene.setGhost(sha, wantGhost);
      mine.ghost = wantGhost;
    }
  }
  return frame;
}

function setSweepIndex(index) {
  const sweep = sweepState();
  const last = sweep.artifact.points.length - 1;
  sweep.index = Math.min(Math.max(Number(index) || 0, 0), last);
  // Reduced motion gets whole points and nothing between them -- the same
  // answer apps/viewer gave its own animation.
  if (prefersReducedMotion()) sweep.index = Math.round(sweep.index);
  // A manual move always resyncs the continuous pacing position too, so
  // playback (tickSweep) resumes from exactly where this put the scrubber
  // instead of continuing from wherever the wall clock had it before.
  sweep.playbackPosition = sweep.index;
  applySweepFrame();
  renderDetail();
  return sweep.index;
}

function prefersReducedMotion() {
  try {
    return !!(window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  } catch (err) {
    return false;
  }
}

// --- the playback verbs ----------------------------------------------------

function cmdPlay() {
  const sweep = sweepState();
  sweep.playing = true;
  sweep.lastTick = null;
  renderDetail();
  return true;
}

function cmdPause() {
  const sweep = sweepState();
  sweep.playing = false;
  renderDetail();
  return false;
}

function cmdSpeed(value) {
  const sweep = sweepState();
  sweep.speed = AA.parseSweepSpeed(value);
  renderDetail();
  return sweep.speed;
}

function cmdLoop(value) {
  const sweep = sweepState();
  sweep.loop = AA.parseSweepLoop(value);
  sweep.direction = 1;
  renderDetail();
  return sweep.loop;
}

function cmdSeek(value) {
  const sweep = sweepState();
  return setSweepIndex(AA.parseSweepSeek(value, sweep.driverValues));
}

function cmdStep(delta) {
  const sweep = sweepState();
  const by = Number(delta);
  return setSweepIndex(AA.sweepStepIndex(sweep.index, isFinite(by) ? by : 1,
    sweep.artifact.points.length));
}

function cmdLayer(name, value) {
  const sweep = sweepState();
  const layer = AA.parseSweepLayer(name);
  sweep.layers[layer] = value === undefined ? !sweep.layers[layer] : AA.parseOnOff(value);
  state.scene.setSweepLayer(layer, sweep.layers[layer]);
  applySweepFrame();
  renderDetail();
  return sweep.layers[layer];
}

// One frame of wall clock. Called from the app's own rAF loop (main), not
// from the scene's -- the scene renders whatever it is told, and deciding
// where the sweep IS is this file's job.
function tickSweep(now) {
  const sweep = state.sweep;
  if (!sweep || !sweep.playing) return;
  const last = sweep.lastTick;
  sweep.lastTick = now;
  if (last == null) return;
  // A tab that was in the background hands back a gap of seconds. Capping it
  // means coming back to where you were, not to wherever that gap landed.
  const dt = Math.min((now - last) / 1000, 0.25);
  if (dt > 0) sweep.fps = sweep.fps ? sweep.fps * 0.9 + (1 / dt) * 0.1 : 1 / dt;
  const count = sweep.artifact.points.length;
  // Advance the CONTINUOUS position (sweep.playbackPosition), never the
  // rounded `sweep.index` reduced motion displays -- feeding the rounded
  // value back in here would round away a fractional step too small to show
  // on every single tick, which at a high frame rate (a small step each
  // time) stalls playback almost entirely rather than merely discretising
  // it. Reduced motion wants the SAME wall-clock pace, snapped to whole
  // points only for what gets drawn and scrubbed.
  const basis = Object.assign({}, sweep, { index: sweep.playbackPosition });
  const advanced = AA.sweepAdvance(basis, dt, count);
  const wasPlaying = sweep.playing;
  sweep.playbackPosition = advanced.index;
  sweep.direction = advanced.direction;
  sweep.playing = advanced.playing;
  sweep.index = prefersReducedMotion() ? Math.round(advanced.index) : advanced.index;
  applySweepFrame();
  // The bar is repainted on every frame only for the numbers that move; the
  // controls repaint when a control's own state changes, which is why the
  // stop at the end gets a full render and a plain tick does not.
  if (wasPlaying !== sweep.playing) renderDetail();
  else renderSweepReadouts();
}

// --- the bar, in sweep mode ------------------------------------------------
//
// Three rows, and each one answers a different question:
//
//   1  WHAT AM I LOOKING AT -- the run, and above all where its geometry came
//      from. Jeff's whole concern with this surface is knowing whether he is
//      looking at the motion sheet's geometry or at geometry fitted from CAD,
//      so that word is on screen at all times and is never the artifact's own
//      token.
//   2  THE CONTROLS -- transport, the draggable bar along the driver, speed
//      and loop. One line, which is what the bar costs at rest everywhere
//      else in this app.
//   3  THE NUMBERS -- the solver's own, at the point nearest the handle.
//      Right-aligned, tabular, fixed decimals per unit, so a digit never
//      moves sideways under a scrub.
//
// The bind instruction is not here, because binding is not available here
// (see the frame rule): a page that has said it cannot do a thing does not
// also instruct the reader to do it -- the same posture the hosted page took.
function renderSweepBar() {
  const sweep = state.sweep;
  el.detail.innerHTML = "";
  sweep.nodes = {};

  const summary = document.createElement("div");
  summary.className = "an__detail-line";
  const who = document.createElement("span");
  who.className = "an__sweep-summary";
  // With a run picker beside it, the picker names the mechanism, so the line
  // does not say it twice.
  const picking = state.sweepRuns.length > 1;
  who.textContent = AA.sweepSummaryParts(sweep.artifact,
    { mechanism: !picking }).join(" · ");
  summary.appendChild(who);
  if (sweep.artifact.notConverged) who.classList.add("an__sweep-summary--warn");
  // Which run, as a choice, when there is one to make -- each named by its
  // mechanism in words and when it was published, newest first, driving the
  // same `sweep <run>` verb the console takes.
  if (picking) {
    summary.appendChild(sweepSelect("which run", state.sweepRuns.map((run) => ({
      value: run.runId, label: sweepRunLabel(run),
    })), sweep.artifact.runId, (value) => {
      AA.exec(["sweep", value]).catch((err) => setBanner(err.message, "error"));
    }));
  }
  summary.appendChild(disclosure("Help", state.helpOpen, () => AA.exec(["help"])));
  el.detail.appendChild(summary);

  const controls = document.createElement("div");
  controls.className = "an__sweep-controls";
  controls.appendChild(sweepButton("◀", "step back one point",
    () => AA.exec(["step", "-1"])));
  controls.appendChild(sweepButton(sweep.playing ? "❚❚" : "▶",
    sweep.playing ? "pause" : "play",
    () => AA.exec([sweep.playing ? "pause" : "play"])));
  controls.appendChild(sweepButton("▶|", "step forward one point",
    () => AA.exec(["step", "1"])));

  const last = sweep.artifact.points.length - 1;
  const track = document.createElement("div");
  track.className = "an__sweep-track";
  const range = document.createElement("input");
  range.type = "range";
  range.min = "0";
  range.max = String(last);
  // Whole points under reduced motion, a continuous scrub otherwise.
  range.step = prefersReducedMotion() ? "1" : "0.01";
  range.value = String(sweep.index);
  range.className = "an__sweep-range";
  range.setAttribute("aria-label", "position along " +
    (sweep.artifact.driverLabel || "the sweep"));
  range.oninput = () => {
    sweep.playing = false;
    setSweepIndexQuietly(Number(range.value));
  };
  track.appendChild(range);

  // The marks under the bar: one per point the solver did not settle. They
  // are the reason the scrubber is not just a slider -- a reader scrubbing
  // past one should be able to see it coming.
  const marks = document.createElement("div");
  marks.className = "an__sweep-marks";
  sweep.artifact.points.forEach((point, i) => {
    if (point.converged) return;
    const mark = document.createElement("span");
    mark.className = "an__sweep-mark";
    mark.style.left = (last ? (i / last) * 100 : 0) + "%";
    mark.title = "the solver did not settle at this point";
    marks.appendChild(mark);
  });
  track.appendChild(marks);

  // The value at the handle: the driver, and the measure the run has a
  // reference for -- which is blade pitch, the thing a reader is scrubbing
  // TO. Positioned over the handle rather than parked at the end of the row,
  // because "what is the pitch here" is a question about where the handle is.
  const chip = document.createElement("span");
  chip.className = "an__sweep-chip";
  track.appendChild(chip);
  sweep.nodes.chip = chip;
  sweep.nodes.range = range;
  controls.appendChild(track);

  controls.appendChild(sweepSelect("speed", AA.SWEEP_SPEEDS.map((s) => ({
    value: String(s), label: s + "×",
  })), String(sweep.speed), (value) => AA.exec(["speed", value])));
  controls.appendChild(sweepSelect("loop", AA.SWEEP_LOOP_MODES.map((m) => ({
    value: m, label: SWEEP_LOOP_LABELS[m],
  })), sweep.loop, (value) => AA.exec(["loop", value])));
  el.detail.appendChild(controls);

  const work = document.createElement("div");
  work.className = "an__detail-work";
  const readouts = document.createElement("dl");
  readouts.className = "an__sweep-readouts";
  work.appendChild(readouts);
  sweep.nodes.readouts = readouts;

  // The frame rule, said once, where the bind instruction would otherwise be.
  // It is the ONLY place the frame rule is written (a click on the canvas away
  // from the pose pulses this line, it does not raise a second message), and
  // it names where the pose is and goes there. Built once per bar: the frame
  // does not change while a run plays, so the per-frame repaint only shows or
  // hides it.
  const gate = document.createElement("p");
  gate.className = "an__sweep-gate";
  gate.tabIndex = -1;
  const gateText = document.createElement("span");
  gateText.textContent = AA.sweepGateWords(sweep.artifact, sweep.asModelledIndex);
  gate.appendChild(gateText);
  if (sweep.asModelledIndex !== null) {
    const go = document.createElement("button");
    go.className = "an__sweep-gate-go";
    go.textContent = AA.SWEEP_GO_TO_POSE;
    go.onclick = async () => {
      try {
        await AA.exec(["pause"]);
        await AA.exec(["seek", "#" + sweep.asModelledIndex]);
      } catch (err) { setBanner(err.message, "error"); }
    };
    gate.appendChild(go);
    sweep.nodes.gateGo = go;
  }
  work.appendChild(gate);
  sweep.nodes.gate = gate;
  if (sweep.artifact.topologyId === null) {
    const note = document.createElement("p");
    note.className = "an__sweep-note";
    note.textContent = AA.SWEEP_NO_TOPOLOGY;
    work.appendChild(note);
  }

  if (sweep.bodies.length) work.appendChild(buildSweepBodiesDisclosure());
  el.detail.appendChild(work);
  renderSweepReadouts();
  renderHintPanel();
}

// A click the frame rule refuses points at the gate line -- the one place the
// rule is written -- instead of raising a second message of its own.
function pulseSweepGate() {
  const gate = state.sweep && state.sweep.nodes && state.sweep.nodes.gate;
  if (!gate) return;
  gate.classList.remove("an__sweep-gate--pulse");
  void gate.offsetWidth; // restart the animation on a repeat click
  gate.classList.add("an__sweep-gate--pulse");
  const go = state.sweep.nodes.gateGo;
  if (go && go.focus) go.focus();
}

// Scrub without a full repaint: dragging the handle must not rebuild the
// control the pointer is holding, which would drop the drag.
function setSweepIndexQuietly(index) {
  const sweep = state.sweep;
  const last = sweep.artifact.points.length - 1;
  sweep.index = Math.min(Math.max(Number(index) || 0, 0), last);
  if (prefersReducedMotion()) sweep.index = Math.round(sweep.index);
  sweep.playbackPosition = sweep.index;
  applySweepFrame();
  renderSweepReadouts();
}

// A run as the picker names it: its mechanism in words and when it was
// published, so two runs of one linkage read as two different things.
function sweepRunLabel(run) {
  const what = run.mechanism ? AA.measureLabel(run.mechanism) : run.runId;
  const when = run.ts ? run.ts.replace("T", " ").replace(/:\d\dZ?$/, "").replace(/Z$/, "") : "";
  return when ? what + " · " + when : what;
}

const SWEEP_LOOP_LABELS = Object.freeze({
  off: "once", on: "repeat", pingpong: "out and back",
});

// The four layers, in words, keyed by AA.SWEEP_LAYERS -- so the Display panel
// is written FROM the vocabulary the `layer` verb parses and cannot offer a
// fifth or miss one of the four. run_tests.cjs pairs the two.
const SWEEP_LAYER_LABELS = Object.freeze({
  stick: "Joints and links",
  bodies: "3D parts",
  trail: "Paths",
  ghost: "Where it started",
});
const SWEEP_LAYER_HINTS = Object.freeze({
  stick: "a bead at every joint, a line along every two-force member, and a " +
    "frame on every body",
  bodies: "the installed 3D models, carried by the bodies they belong to",
  trail: "the whole path each joint takes over the sweep, drawn faintly",
  ghost: "a translucent copy of each part where the model was built, to " +
    "compare against",
});

function sweepButton(glyph, title, onClick) {
  const button = document.createElement("button");
  button.className = "an__sweep-btn";
  button.textContent = glyph;
  button.title = title;
  button.setAttribute("aria-label", title);
  button.onclick = () => {
    try { onClick(); } catch (err) { setBanner(err.message, "error"); }
  };
  return button;
}

function sweepSelect(label, options, selected, onChange) {
  const select = document.createElement("select");
  select.className = "an__sweep-select";
  select.title = label;
  select.setAttribute("aria-label", label);
  for (const option of options) {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    if (option.value === selected) node.selected = true;
    select.appendChild(node);
  }
  select.onchange = () => {
    try { onChange(select.value); } catch (err) { setBanner(err.message, "error"); }
  };
  return select;
}

// The numbers, and the two things beside them that change on every frame.
// Separated from renderSweepBar so a playing sweep repaints three text nodes
// a frame instead of rebuilding a slider sixty times a second.
function renderSweepReadouts() {
  const sweep = state.sweep;
  if (!sweep || !sweep.nodes || !sweep.nodes.readouts) return;
  const frame = sweep.frame;
  const rows = AA.sweepReadouts(sweep.artifact, frame);
  const list = sweep.nodes.readouts;
  list.innerHTML = "";
  for (const row of rows) {
    const term = document.createElement("dt");
    term.textContent = row.label;
    const value = document.createElement("dd");
    value.textContent = AA.formatSweepNumber(row.value, row.unit) +
      (row.unit ? " " + row.unit : "");
    // A link's measured length carries what it is supposed to be, right
    // beside it: that pair IS the verification, and separating them would
    // make a reader hold one of the two numbers in their head.
    if (row.expected != null) {
      const against = document.createElement("span");
      against.className = "an__sweep-against";
      against.textContent = "/ " + AA.formatSweepNumber(row.expected, row.unit);
      value.appendChild(against);
    }
    list.appendChild(term);
    list.appendChild(value);
  }

  if (sweep.nodes.range && document.activeElement !== sweep.nodes.range) {
    sweep.nodes.range.value = String(sweep.index);
  }
  if (sweep.nodes.chip) {
    const last = sweep.artifact.points.length - 1;
    const driver = AA.indexToDriver(sweep.driverValues, sweep.index);
    const referenced = sweep.artifact.reference && sweep.artifact.reference.measure;
    const headline = referenced && frame.nearer.measures[referenced] != null
      ? AA.formatSweepNumber(frame.nearer.measures[referenced],
        sweep.artifact.measureUnits[referenced]) + " " +
        (sweep.artifact.measureUnits[referenced] || "")
      : "";
    sweep.nodes.chip.textContent =
      AA.formatSweepNumber(driver, sweep.artifact.driverUnit) + " " +
      (sweep.artifact.driverUnit || "") + (headline ? " · " + headline : "");
    sweep.nodes.chip.style.left = (last ? (sweep.index / last) * 100 : 0) + "%";
    sweep.nodes.chip.classList.toggle("an__sweep-chip--warn",
      frame.nearer.converged === false);
  }
  if (sweep.nodes.gate) {
    const atHome = AA.sweepIsAsModelled(frame);
    sweep.nodes.gate.style.display = atHome ? "none" : "block";
  }
}

// Which occurrence each body turned out to be, how far off it was, and the
// honest state for the ones that did not resolve. A disclosure rather than a
// row of its own: it is the answer to a question a reader only sometimes
// asks, and the stick figure is on screen either way.
function buildSweepBodiesDisclosure() {
  const sweep = state.sweep;
  const box = document.createElement("details");
  box.className = "an__sweep-bodies";
  const head = document.createElement("summary");
  // A carried part is listed only while it is open -- one nobody opened is
  // not drawn, and a row saying it moves would describe nothing on screen.
  const open = state.scene.listOpenParts();
  const rows = sweep.bodies.filter((r) => r.state !== "carried" || open.indexOf(r.sha256) !== -1);
  const anchored = rows.filter(
    (r) => r.placements && r.placements.length).length;
  head.textContent = anchored + " of " + rows.length + " parts placed";
  box.appendChild(head);
  const list = document.createElement("ul");
  for (const row of rows) {
    const item = document.createElement("li");
    const what = document.createElement("span");
    what.className = "an__sweep-body-name";
    what.textContent = AA.measureLabel(row.subject);
    item.appendChild(what);
    const says = document.createElement("span");
    says.className = "an__sweep-body-state";
    says.textContent = sweepBodyWords(row);
    item.appendChild(says);
    list.appendChild(item);
  }
  box.appendChild(list);

  // The opened parts this run does not move, named as such: they sit where
  // the assembly puts them, and a reader who sees one hold still while the
  // plate swings past it should not have to wonder whether it is broken.
  const still = sweepStillParts();
  if (still.length) {
    const heading = document.createElement("p");
    heading.className = "an__sweep-still-head";
    heading.textContent = "Not moved by this run";
    box.appendChild(heading);
    const stillList = document.createElement("ul");
    for (const mesh of still) {
      const item = document.createElement("li");
      item.textContent = AA.meshShortName(mesh.label);
      stillList.appendChild(item);
    }
    box.appendChild(stillList);
  }
  return box;
}

// Every opened, visible part no body or link of this run anchors.
function sweepStillParts() {
  const sweep = state.sweep;
  const anchored = new Set(sweep.anchored);
  return state.meshList.filter((m) => !anchored.has(m.sha256) &&
    state.scene.listOpenParts().indexOf(m.sha256) !== -1 &&
    state.scene.isVisible(m.sha256));
}

// What one body's row says, in words. A vocabulary rather than four inline
// strings, for the reason every reader-facing sentence in this app is a
// constant: run_tests.cjs has no DOM, and copy it cannot read is copy the
// shared ban list does not scan.
const SWEEP_BODY_WORDS = Object.freeze({
  "no-mesh": "no 3D model installed for this part — stick figure only",
  "no-occurrence": "its 3D model records no position in the assembly — stick figure only",
  "no-joint": "no solved joint point to place it against — stick figure only",
  "no-feature": "its 3D model offers nothing to match a joint against — stick figure only",
});

function occurrenceWords(row, placement) {
  return AA.sweepOccurrenceLabel(placement.key, row.candidateKeys || []);
}

function sweepBodyWords(row) {
  if (row.state === "ground") {
    return "fixed — drawn where the assembly records it, at " +
      row.placements.map((p) => occurrenceWords(row, p)).join(" and ");
  }
  if (row.state === "matched") {
    return "placed at " + row.placements.map((p) => occurrenceWords(row, p) + ", " +
      AA.formatSweepNumber(p.residual, "mm") + " mm from the solved joint").join("; and at ") +
      " — " + AA.SWEEP_FEATURE_SOURCE_WORDS[row.featureSource] +
      ", out of " + row.candidates + " recorded position" +
      (row.candidates === 1 ? "" : "s");
  }
  if (row.state === "refused") return row.reason + " — stick figure only";
  if (row.state === "carried") {
    const n = row.placements.length;
    return row.part + " moves with it, recorded inside " +
      AA.sweepOccurrenceLabel(row.under, []) +
      (n === 1 ? "" : " (" + n + " positions)");
  }
  return SWEEP_BODY_WORDS[row.state] || row.state;
}

// --- the sweep rail: the mechanism, inspect only ---------------------------
//
// Handoff the_sweep_rail_shows_the_mechanism. Jeff, 2026-10-20: in sweep mode
// the rail showed the bind workflow's furniture for an unrelated topology and
// study beside the linkage animation. So in sweep mode the rail is the
// MECHANISM -- bodies, then joints, then (opened from a kinematic study) that
// study's contributors at the nearest stop -- and the bind furniture stands
// down: the arrival menu, the study select, the element list and the scope
// bar hide by one class on the workspace (style.css), and the topology select
// stays as a label the sweep chose.
//
// INSPECT ONLY. Nothing below writes. Hovering a feature tints its bound face
// (the `highlight` verb), selecting a joint or a contributor is the `inspect`
// verb, and the one way from here to a binding is a feature row's re-pick,
// which runs `goto` -- leaving sweep mode, so the bind flow on that edge is
// where the write boundary has always been.
//
// The tree is BUILT on entering sweep mode and REMOVED on leaving it, rather
// than hidden: bind mode's rail is then exactly the rail it was before this
// existed, node for node (a snapshot check in the browser tier holds that).

// A rail control's verb. AA.exec answers a synchronous verb with its value
// and an asynchronous one with a promise, so both are wrapped; a failure goes
// to the banner unless the caller passes `quiet` as null -- a hover over a
// feature, say, which is not worth one.
function railExec(command, quiet) {
  return Promise.resolve().then(() => AA.exec(command)).catch((err) => {
    if (quiet !== null) setBanner(err.message, "error");
  });
}

function sweepTopology() {
  const sweep = state.sweep;
  if (!sweep || !state.topologyProjection) return null;
  const id = sweep.artifact.topologyId;
  return (state.topologyProjection.topologies || []).find((t) => t.id === id) || null;
}

// The rail's furniture, put into or out of sweep posture -- the one place
// either happens, so entering and leaving cannot disagree about what moved.
function setRailSweepPosture(on) {
  el.workspace.classList.toggle("an--sweep", on);
  el.topologySelect.disabled = on;
  if (!on) {
    const tree = document.getElementById("sweep-tree");
    if (tree) tree.remove();
  }
}

function treeOpen(key, fallback) {
  const open = state.sweep.treeOpen;
  return Object.prototype.hasOwnProperty.call(open, key) ? open[key] : fallback;
}

// A <details> node whose summary is one clipped line with its full text on
// hover (the truncation rule), and whose open state survives a repaint.
// `hover` is the `hover` command its summary runs while the pointer rests on
// it (the rail lights its thing in the scene), or null.
function treeNode(key, text, fallbackOpen, onToggle, hover) {
  const box = document.createElement("details");
  box.className = "an__tree-node";
  box.open = treeOpen(key, fallbackOpen);
  const head = document.createElement("summary");
  head.className = "an__tree-row";
  head.title = text;
  const words = document.createElement("span");
  words.className = "an__tree-text";
  words.textContent = text;
  head.appendChild(words);
  box.appendChild(head);
  if (hover) hoverOn(head, hover);
  // A repaint sets `open` on a fresh node, which queues a toggle event of its
  // own; only a change from the remembered state is the reader's.
  box.ontoggle = () => {
    if (!state.sweep) return;
    const was = treeOpen(key, fallbackOpen);
    state.sweep.treeOpen[key] = box.open;
    if (box.open !== was && onToggle) onToggle(box.open);
  };
  return box;
}

// The pointer resting on a rail row lights its thing in the scene, and
// leaving puts the scene back -- one verb both ways, quiet on failure (a
// hover is not worth a banner).
function hoverOn(node, command) {
  node.addEventListener("mouseenter", () => { railExec(command, null); });
  node.addEventListener("mouseleave", () => { railExec(["hover", "clear"], null); });
}

// Is `name` a body or a link this run's rail lists?
function subjectKnown(name) {
  const tree = state.sweep && state.sweep.tree;
  if (!tree || !name) return false;
  return tree.bodies.some((b) => b.name === name) ||
    tree.joints.some((j) => j.name === name && j.parts.length);
}

// Show or hide a list of occurrences, remembering which the rail hid so
// leaving sweep mode can put them back.
function setOccurrences(list, visible) {
  const sweep = state.sweep;
  const bySha = new Map();
  for (const o of list || []) {
    if (!bySha.has(o.sha256)) bySha.set(o.sha256, []);
    bySha.get(o.sha256).push(o.key);
  }
  for (const [sha, keys] of bySha) state.scene.setOccurrencesVisible(sha, keys, visible);
  if (!sweep) return;
  const same = (a, b) => a.sha256 === b.sha256 && a.key === b.key;
  sweep.hidden = sweep.hidden.filter((h) => !(list || []).some((o) => same(o, h)));
  if (!visible) for (const o of list || []) sweep.hidden.push({ sha256: o.sha256, key: o.key });
}

// How much of a list of occurrences is drawn: {checked, indeterminate} for a
// checkbox over it (AA.planShowAllHeader's shape and rule).
function occurrencesShown(list) {
  return AA.planShowAllHeader((list || []).map((o) =>
    state.scene.isOccurrenceVisible(o.sha256, o.key)));
}

// show-body <name> / hide-body <name>: every occurrence a body or a link is
// drawn at, and no other (the body row's checkbox).
function cmdSubjectView(visible, name) {
  const sweep = sweepState();
  if (!subjectKnown(name)) throw new Error("this run has no body or link \"" + name + "\"");
  const list = sweep.occurrences[name] || [];
  setOccurrences(list, visible);
  renderSweepRail();
  return { subject: name, occurrences: list.length, visible };
}

// hover <kind> <name> ... | hover clear -- what a rail row lights in the
// scene (AA.parseHover has the grammar). A viewing aid: it writes nothing,
// tints nothing into a colour buffer, and an empty answer is ordinary (an
// unbound feature, a part not opened).
function cmdHover(what, name, extra) {
  const sweep = sweepState();
  const target = AA.parseHover(what, name, extra);
  if (!target.kind) {
    state.scene.clearHover();
    window.__lastHover = null;
    return null;
  }
  const topology = sweepTopology();
  const open = new Set(state.scene.listOpenParts());
  const isOpen = (sha) => open.has(sha);
  const identity = mergedIdentityProjection();
  const spec = { occurrences: [], faces: [], joint: null };
  if (target.kind === "body") {
    if (!subjectKnown(target.name)) throw new Error("this run has no body or link \"" + target.name + "\"");
    spec.occurrences = (sweep.occurrences[target.name] || []).filter((o) => isOpen(o.sha256));
  } else if (target.kind === "part") {
    const mesh = resolveMeshOrThrow(target.name);
    const scoped = target.subject ? AA.sweepPartOccurrences(sweep.occurrences, target.subject, mesh.sha256) : null;
    if (isOpen(mesh.sha256)) spec.occurrences = scoped || [{ sha256: mesh.sha256, key: null }];
  } else if (target.kind === "joint") {
    const joint = sweep.tree.joints.find((j) => j.name === target.name);
    if (!joint) throw new Error("this run has no joint \"" + target.name + "\"");
    spec.joint = joint.name;
    if (topology) {
      spec.faces = AA.planHighlightFaces(identity, topology.id, joint.features
        .map((f) => AA.sweepFeatureEdge(topology, f, joint.features)).filter((v) => v.edgeId), isOpen);
    }
  } else if (target.kind === "feature") {
    if (topology) {
      spec.faces = AA.planHighlightFaces(identity, topology.id,
        [{ edgeId: target.name, direction: target.direction }], isOpen);
    }
  } else {
    const row = currentContributorRows().find((r) => r.edge === target.name);
    if (!row) throw new Error("the open study lists no contributor \"" + target.name + "\" here");
    // The faces bound at its edge's two ends; when none is bound, the parts
    // at those ends, at the occurrences the mechanism draws them at.
    spec.faces = AA.planHighlightFaces(identity, topology.id, [{ edgeId: row.edge, direction: null }], isOpen);
    if (!spec.faces.length) spec.occurrences = edgeOccurrences(topology, row.edge).filter((o) => isOpen(o.sha256));
  }
  const shown = state.scene.setHover(spec);
  window.__lastHover = Object.assign({ target }, shown);
  return window.__lastHover;
}

// The drawn occurrences of an edge's parts: each part's occurrences on the
// bodies and links that carry it, or every occurrence where none does.
function edgeOccurrences(topology, edgeId) {
  const sweep = state.sweep;
  const out = [];
  for (const id of AA.edgePartIds(topology, edgeId)) {
    const mesh = AA.resolveMeshIdentifier(state.meshList, id, state.partMeshAliases);
    if (!mesh) continue;
    const placed = [];
    for (const name of Object.keys(sweep.occurrences)) {
      for (const o of sweep.occurrences[name]) if (o.sha256 === mesh.sha256) placed.push(o);
    }
    for (const o of placed.length ? placed : [{ sha256: mesh.sha256, key: null }]) out.push(o);
  }
  return out;
}

// The open study's contributor rows at the stop nearest the frame, or [].
function currentContributorRows() {
  const sweep = state.sweep;
  const stop = sweep && sweep.study ? AA.kinematicStopAt(sweep.study, sweep.frame) : null;
  return stop ? AA.kinematicContributorRows(sweep.study, stop, sweepTopology(), sweep.studyDecimals) : [];
}

function treeHead(text) {
  const head = document.createElement("p");
  head.className = "an__tree-head";
  head.textContent = text;
  head.title = text;
  return head;
}

// A part a body names that has no installed 3D model: the same place in the
// list, muted, with nothing to toggle.
function missingPartRow(partId) {
  const li = document.createElement("li");
  li.className = "part-row part-row--missing";
  const label = document.createElement("span");
  label.className = "part-row__label";
  label.textContent = AA.measureLabel(partId);
  label.title = AA.measureLabel(partId) + " — no 3D model installed";
  li.appendChild(label);
  return li;
}

// The parts a body or a link carries, as THE parts-panel rows (buildPartRow):
// one implementation of a part row, wherever it is listed.
//
// Inside a body (or a link) a row stands for that subject's occurrence(s) of
// the mesh, not every repeat of it: its checkbox hides only those, and its
// hover lights only those. A part the subject has no occurrence of yet --
// the bodies still resolving, or a part that could not be placed -- keeps the
// whole-mesh row.
function treePartRows(partIds, subject) {
  const list = document.createElement("ul");
  list.className = "parts-panel an__tree-parts";
  const inModel = new Set(currentContext().inModel.map((m) => m.sha256));
  const isolated = (state.isolation && state.isolation.targets) || [];
  for (const partId of partIds) {
    const mesh = AA.resolveMeshIdentifier(state.meshList, partId, state.partMeshAliases);
    if (!mesh) { list.appendChild(missingPartRow(partId)); continue; }
    const scoped = AA.sweepPartOccurrences(state.sweep.occurrences, subject, mesh.sha256);
    list.appendChild(buildPartRow(mesh, inModel.has(mesh.sha256), isolated,
      scoped && scoped.length ? { subject, occurrences: scoped } : null));
  }
  return list;
}

function featureRow(topology, joint, feature) {
  const via = AA.sweepFeatureEdge(topology, feature, joint.features);
  const bindingState = AA.sweepFeatureState(mergedIdentityProjection(),
    state.identityProjection && state.identityProjection.staleness, topology.id, via);
  const li = document.createElement("li");
  // The element rows' own state rule colours it (`.el-row--<state>` is not
  // scoped to `.el-row`), so a feature and an element in one state are one
  // colour from one declaration.
  li.className = "tree-row el-row--" + bindingState;
  li.dataset.feature = feature.id;
  li.dataset.state = bindingState;
  const name = AA.sweepFeatureName(topology, feature);
  // The surface that defines it, in words a reader can check against the
  // model -- `face 110 of 214698-002` -- with the mesh's sha on hover, or
  // `no face bound`. Under the name, muted: it is the row's second fact.
  const faces = AA.boundFaceRows(mergedIdentityProjection(), topology.id, via, state.meshList);
  const faceWords = faces.length ? faces.map((f) => f.text).join(", ") : AA.BOUND_FACE_WORDS.none;
  li.title = name + "\n" + faceWords +
    (faces.length ? "\n" + faces.map((f) => f.sha256.slice(0, 12)).join(", ") : "");
  if (via.edgeId) {
    li.dataset.edge = via.edgeId;
    if (via.direction) li.dataset.direction = via.direction;
  }
  const text = document.createElement("span");
  text.className = "tree-row__text";
  const words = document.createElement("span");
  words.className = "tree-row__name";
  words.textContent = name;
  text.appendChild(words);
  const face = document.createElement("span");
  face.className = "tree-row__face";
  face.textContent = faceWords;
  text.appendChild(face);
  li.appendChild(text);
  if (via.edgeId) {
    hoverOn(li, via.direction ? ["hover", "feature", via.edgeId, via.direction]
      : ["hover", "feature", via.edgeId]);
    const repick = document.createElement("button");
    repick.className = "tree-row__repick";
    repick.textContent = bindingState === AA.BINDING_STATES.BOUND
      ? AA.SWEEP_RAIL_WORDS.repick : AA.SWEEP_RAIL_WORDS.pick;
    repick.title = AA.SWEEP_RAIL_WORDS.repickTitle;
    repick.onclick = (ev) => {
      ev.stopPropagation();
      railExec(["goto", topology.id, via.edgeId]);
    };
    li.appendChild(repick);
  }
  return li;
}

function contributorsGroup(topology) {
  const sweep = state.sweep;
  const study = sweep.study;
  const stop = AA.kinematicStopAt(study, sweep.frame);
  sweep.stopId = stop ? stop.id : null;
  const box = document.createElement("section");
  box.className = "an__tree-group";
  box.dataset.group = "contributors";
  if (!stop) return box;
  box.appendChild(treeHead(AA.SWEEP_RAIL_WORDS.contributors + " " +
    AA.kinematicStopWords(stop, study.units)));
  const list = document.createElement("ol");
  list.className = "an__tree-list";
  const selected = sweep.inspect && sweep.inspect.kind === AA.INSPECT_TARGETS[1]
    ? sweep.inspect.name : null;
  for (const row of AA.kinematicContributorRows(study, stop, topology, sweep.studyDecimals)) {
    const li = document.createElement("li");
    li.className = "tree-row tree-row--contributor";
    li.dataset.edge = row.edge;
    hoverOn(li, ["hover", "contributor", row.edge]);
    li.title = row.name + (row.magnitude ? " · " + row.magnitude : "");
    const words = document.createElement("span");
    words.className = "tree-row__name";
    words.textContent = row.name;
    li.appendChild(words);
    if (row.magnitude) {
      const value = document.createElement("span");
      value.className = "tree-row__value";
      value.textContent = row.magnitude;
      li.appendChild(value);
    }
    // The badge's {state, text} shape, which every other badge is handed: the
    // gap sentence, the drawing(s) to read, and what the row's Pick does.
    const alerts = AA.contributorAlerts(row, topology);
    if (alerts.length) li.appendChild(alertBadge(alerts));
    // The same jump to bind mode a feature row's Pick makes: the edge, at the
    // as-modelled frame, where a binding may be written. Nothing is written
    // from here.
    const bound = AA.elementBindingState(AA.findBindingRecord(mergedIdentityProjection(),
      AA.topologyEdgeKey(topology.id, row.edge)), state.identityProjection &&
      state.identityProjection.staleness) === AA.BINDING_STATES.BOUND;
    const pick = document.createElement("button");
    pick.className = "tree-row__repick";
    pick.textContent = bound ? AA.SWEEP_RAIL_WORDS.repick : AA.SWEEP_RAIL_WORDS.pick;
    pick.title = AA.SWEEP_RAIL_WORDS.repickTitle;
    pick.onclick = (ev) => {
      ev.stopPropagation();
      railExec(["goto", topology.id, row.edge]);
    };
    li.appendChild(pick);
    if (selected === row.edge) li.classList.add("selected");
    li.onclick = () => {
      railExec(selected === row.edge ? ["inspect", "clear"]
        : ["inspect", "contributor", row.edge]);
    };
    list.appendChild(li);
  }
  box.appendChild(list);
  return box;
}

// The whole tree, rebuilt from state. Cheap (a handful of rows), and called
// whenever something it shows changes: entering, the bodies resolving, a
// part's view changing, an inspect, and the frame crossing to another stop.
function renderSweepRail() {
  const sweep = state.sweep;
  if (!sweep) return;
  let root = document.getElementById("sweep-tree");
  if (!root) {
    root = document.createElement("div");
    root.id = "sweep-tree";
    root.className = "an__tree";
    // Under the topology select -- the one piece of the bind furniture that
    // stays -- and above the parts panel's label.
    el.studySelect.insertAdjacentElement("afterend", root);
  }
  root.innerHTML = "";
  const tree = sweep.tree;
  const topology = sweepTopology();
  root.appendChild(rowKindChips(root));
  const selectedPart = sweep.inspect && sweep.inspect.kind === AA.INSPECT_TARGETS[3]
    ? sweep.inspect : null;

  const bodies = document.createElement("section");
  bodies.className = "an__tree-group";
  bodies.dataset.group = "bodies";
  bodies.appendChild(treeHead(AA.SWEEP_RAIL_WORDS.bodies + " (" + tree.bodies.length + ")"));
  for (const body of tree.bodies) {
    // A part picked in the scene opens the body it was picked on.
    if (selectedPart && selectedPart.subject === body.name) sweep.treeOpen["body:" + body.name] = true;
    const node = treeNode("body:" + body.name, AA.sweepBodyRowWords(body), body.open, null,
      ["hover", "body", body.name]);
    node.dataset.body = body.name;
    subjectCheckbox(node, body.name);
    node.appendChild(treePartRows(body.parts, body.name));
    bodies.appendChild(node);
  }
  root.appendChild(bodies);

  const joints = document.createElement("section");
  joints.className = "an__tree-group";
  joints.dataset.group = "joints";
  joints.appendChild(treeHead(AA.SWEEP_RAIL_WORDS.joints + " (" + tree.joints.length + ")"));
  const selectedJoint = sweep.inspect && sweep.inspect.kind === AA.INSPECT_TARGETS[0]
    ? sweep.inspect.name : null;
  for (const joint of tree.joints) {
    // A face picked in the scene that is bound to one of this joint's
    // features opens the joint, so its feature row is on screen selected.
    const holds = selectedPart && topology && joint.features.some((f) =>
      AA.featureReadMatches(AA.sweepFeatureEdge(topology, f, joint.features), selectedPart.bindings));
    if (holds || (selectedPart && selectedPart.subject === joint.name)) {
      sweep.treeOpen["joint:" + joint.name] = true;
    }
    // Opening a joint is looking at it: it selects the joint (its bead is
    // drawn emphasised) and closing the selected one lets it go.
    const node = treeNode("joint:" + joint.name, AA.sweepJointRowWords(joint), false, (open) => {
      const isSelected = state.sweep.inspect && state.sweep.inspect.name === joint.name;
      if (open && !isSelected) railExec(["inspect", "joint", joint.name]);
      else if (!open && isSelected) railExec(["inspect", "clear"]);
    }, ["hover", "joint", joint.name]);
    node.dataset.joint = joint.name;
    if (joint.parts.length) subjectCheckbox(node, joint.name);
    if (selectedJoint === joint.name || holds) node.classList.add("selected");
    if (topology && joint.features.length) {
      const list = document.createElement("ul");
      list.className = "an__tree-list";
      for (const feature of joint.features) {
        const row = featureRow(topology, joint, feature);
        if (selectedPart && AA.featureReadMatches(AA.sweepFeatureEdge(topology, feature,
          joint.features), selectedPart.bindings)) row.classList.add("selected");
        list.appendChild(row);
      }
      node.appendChild(list);
    }
    if (joint.parts.length) node.appendChild(treePartRows(joint.parts, joint.name));
    joints.appendChild(node);
  }
  root.appendChild(joints);

  if (sweep.study) root.appendChild(contributorsGroup(topology));
  if (selectedPart) {
    const row = root.querySelector('.part-row[data-sha="' + selectedPart.name + '"]' +
      (selectedPart.subject ? '[data-subject="' + CSS.escape(selectedPart.subject) + '"]' : ""));
    if (row) row.classList.add("selected");
  }
  applySceneHover();
}

// A body's (or a link's) own checkbox, in its summary line: every occurrence
// it is drawn at, and no other. Disabled until the bodies have resolved and
// there is something to hide.
function subjectCheckbox(node, subject) {
  const list = state.sweep.occurrences[subject] || [];
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.className = "an__tree-check";
  cb.title = AA.SWEEP_RAIL_WORDS.showBody;
  const shown = occurrencesShown(list);
  cb.checked = list.length ? shown.checked : true;
  cb.indeterminate = list.length ? shown.indeterminate : false;
  cb.disabled = !list.length;
  // A click on the box is the box's, never the <details>' toggle.
  cb.onclick = (ev) => { ev.stopPropagation(); };
  cb.onchange = () => { railExec([cb.checked ? "show-body" : "hide-body", subject]); };
  node.querySelector("summary").appendChild(cb);
}

// The type filter: one chip per row kind (AA.SWEEP_ROW_KINDS), pressed =
// listed. A VIEW filter -- what the rail lists, never what the scene draws or
// what the run's context is -- remembered the way the rail's width is.
function rowKindChips(root) {
  const hidden = AA.readHiddenRowKinds(prefStore());
  for (const kind of AA.SWEEP_ROW_KINDS) root.classList.toggle("an__tree--no-" + kind, hidden.indexOf(kind) !== -1);
  const bar = document.createElement("div");
  bar.className = "an__tree-chips";
  bar.setAttribute("role", "group");
  for (const kind of AA.SWEEP_ROW_KINDS) {
    const chip = document.createElement("button");
    chip.className = "an__tree-chip";
    chip.dataset.kind = kind;
    chip.textContent = AA.SWEEP_ROW_KIND_WORDS[kind];
    chip.setAttribute("aria-pressed", hidden.indexOf(kind) === -1 ? "true" : "false");
    chip.onclick = () => {
      AA.writeHiddenRowKinds(prefStore(), AA.toggleRowKind(AA.readHiddenRowKinds(prefStore()), kind));
      renderSweepRail();
    };
    bar.appendChild(chip);
  }
  return bar;
}

// The part the scene's pointer rests on, emphasised in the rail: its row
// inside the subject it is drawn for, and the feature rows its face is bound
// to. Applied to the rows as they are, so a pointer moving over the view
// never rebuilds the tree.
function applySceneHover() {
  const root = document.getElementById("sweep-tree");
  if (!root) return;
  for (const n of root.querySelectorAll(".is-scene-hover")) n.classList.remove("is-scene-hover");
  const hover = state.sweep && state.sweep.sceneHover;
  if (!hover) return;
  const scoped = root.querySelectorAll('.part-row[data-sha="' + hover.sha256 + '"]');
  for (const row of scoped) {
    if (!hover.subject || row.dataset.subject === hover.subject) row.classList.add("is-scene-hover");
  }
  for (const row of root.querySelectorAll(".tree-row[data-edge]")) {
    const via = { edgeId: row.dataset.edge, direction: row.dataset.direction || null };
    if (row.dataset.feature && AA.featureReadMatches(via, hover.bindings)) row.classList.add("is-scene-hover");
  }
}

// What the scene says the pointer rests on (scene.onPartHover), into the
// rail. Null is off every part.
function sceneHoverPart(pick) {
  const sweep = state.sweep;
  if (!sweep) return;
  const topology = sweepTopology();
  sweep.sceneHover = pick ? {
    sha256: pick.sha256,
    subject: AA.sweepOccurrenceSubject(sweep.bodies, pick.sha256, pick.key),
    bindings: topology ? AA.bindingsOfFace(mergedIdentityProjection(), topology.id,
      pick.sha256, pick.faceId) : [],
  } : null;
  applySceneHover();
}

// inspect joint <name> | inspect contributor <edge> | inspect clear
function cmdInspect(what, name, face, subject) {
  const sweep = sweepState();
  const target = AA.parseInspect(what, name, face, subject);
  if (target.kind === AA.INSPECT_TARGETS[3]) return inspectPart(target);
  if (target.kind === AA.INSPECT_TARGETS[0] &&
      !sweep.tree.joints.some((j) => j.name === target.name)) {
    throw new Error("this run has no joint \"" + target.name + "\"");
  }
  let faces = [];
  if (target.kind === AA.INSPECT_TARGETS[1]) {
    const stop = sweep.study ? AA.kinematicStopAt(sweep.study, sweep.frame) : null;
    const topology = sweepTopology();
    const row = stop && AA.kinematicContributorRows(sweep.study, stop, topology, sweep.studyDecimals)
      .find((r) => r.edge === target.name);
    if (!row) throw new Error("the open study lists no contributor \"" + target.name + "\" here");
    const open = new Set(state.scene.listOpenParts());
    faces = AA.planHighlightFaces(mergedIdentityProjection(), topology.id,
      AA.contributorHighlightReads(topology, row, sweep.tree), (sha) => open.has(sha));
  }
  sweep.inspect = target.kind ? { kind: target.kind, name: target.name, faces } : null;
  state.scene.setSweepEmphasis(target.kind === AA.INSPECT_TARGETS[0] ? target.name : null);
  if (faces.length) state.scene.highlightFaces(faces);
  else if (state.currentPick) state.scene.highlightFace(state.currentPick.sha256, state.currentPick.faceId);
  else state.scene.clearHighlight();
  window.__lastInspect = sweep.inspect;
  renderSweepRail();
  return sweep.inspect;
}

// inspect part <mesh> <face> [<subject>] -- a pick in the scene, selected in
// the rail: the part's row inside the subject it was picked on (that body
// opened), and the feature rows the face is bound to (their joint opened).
// The face carries the pick tint while it is selected -- the same tint a
// selected contributor's faces carry, given back by `highlight clear`.
function inspectPart(target) {
  const sweep = state.sweep;
  const mesh = resolveMeshOrThrow(target.name);
  if (!state.scene.faceRecord(mesh.sha256, target.faceId)) {
    throw new Error("part \"" + target.name + "\" has no face " + target.faceId);
  }
  if (target.subject && !subjectKnown(target.subject)) {
    throw new Error("this run has no body or link \"" + target.subject + "\"");
  }
  const topology = sweepTopology();
  const faces = [{ sha256: mesh.sha256, faceId: target.faceId }];
  sweep.inspect = {
    kind: target.kind, name: mesh.sha256, faceId: target.faceId, subject: target.subject,
    bindings: topology ? AA.bindingsOfFace(mergedIdentityProjection(), topology.id,
      mesh.sha256, target.faceId) : [],
    faces,
  };
  state.scene.setSweepEmphasis(null);
  state.scene.highlightFaces(faces);
  window.__lastInspect = sweep.inspect;
  renderSweepRail();
  return sweep.inspect;
}

// help [on|off] -- the top bar's collapsible half (deliverable 1). No
// argument toggles, which is what the button does.
function cmdHelp(value) {
  state.helpOpen = value === undefined ? !state.helpOpen : AA.parseOnOff(value);
  renderDetail();
  return state.helpOpen;
}

// The three verbs that change what this app is SHOWING -- a mode and a
// subject -- tell an embedding page so once they complete, whoever ran them
// (the viewer's pane, the run picker, the command box). postEmbedState.
function announced(fn) {
  return async (...args) => {
    const result = await fn(...args);
    postEmbedState();
    return result;
  };
}

const commands = new AA.CommandLayer();
commands.register("open-part", cmdOpenPart);
commands.register("show", cmdShow); // "show" on a part never opened is "open it and show it"
commands.register("hide", cmdHide);
commands.register("show-all", cmdShowAll);
commands.register("hide-all", cmdHideAll);
commands.register("context", cmdContext);
commands.register("isolate", cmdIsolate);
commands.register("camera", cmdCamera);
commands.register("ghost", cmdGhost);
commands.register("mark-face", cmdMarkFace);
commands.register("select-face", cmdSelectFace);
commands.register("select-topology", cmdSelectTopology);
commands.register("select-study", cmdSelectStudy);
commands.register("select-edge", cmdSelectEdge);
commands.register("goto", announced(cmdGoto));
commands.register("trace", announced(cmdTrace));
commands.register("highlight", cmdHighlight);
commands.register("deselect", cmdDeselect);
commands.register("filter-element", cmdFilterElement);
commands.register("auto-filter", cmdAutoFilter);
commands.register("transparency", cmdTransparency);
commands.register("suggest", cmdSuggest);
commands.register("auto-suggest", cmdAutoSuggest);
commands.register("help", cmdHelp);
// Sweep mode (handoff kinematic_sweep_animation). Every one of them is a
// verb for the same reason the rest are: the controls in the bar, the
// keyboard, the deep link and the command box drive ONE state machine.
commands.register("sweep", announced(cmdSweep));
commands.register("play", cmdPlay);
commands.register("pause", cmdPause);
commands.register("speed", cmdSpeed);
commands.register("seek", cmdSeek);
commands.register("step", cmdStep);
commands.register("loop", cmdLoop);
commands.register("layer", cmdLayer);
commands.register("inspect", cmdInspect);
commands.register("hover", cmdHover);
commands.register("show-body", (name) => cmdSubjectView(true, name));
commands.register("hide-body", (name) => cmdSubjectView(false, name));
AA.exec = (input) => commands.exec(input);

// The last arrival, run again -- what ticking an auto-setup box back on does.
// Goes through the same command list a boot does (AA.planEntryCommands), so
// there is no second reading of "what an arrival means".
async function replayLastEntry() {
  const entry = state.lastEntry;
  if (!entry) return null;
  for (const command of AA.planEntryCommands({
    topology: entry.topologyId, study: entry.studyId,
    edge: entry.edgeId, trace: entry.trace,
  })) {
    await AA.exec(command);
  }
  return entry;
}

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
    opt.value = t.id; opt.textContent = t.title;
    el.topologySelect.appendChild(opt);
  }
  if (state.topologyProjection.topologies.length) {
    selectTopology(state.topologyProjection.topologies[0].id);
  }
}

// The rail's drag handle: one custom property on the workspace, clamped
// (AA.clampRailWidth) and remembered per browser. Pointer capture keeps the
// drag alive when the pointer leaves the thin handle; the arrow keys resize it
// for a reader with no pointer.
function wireRailResize() {
  const handle = document.getElementById("rail-handle");
  if (!handle) return;
  const apply = (width, remember) => {
    const clamped = AA.clampRailWidth(width, window.innerWidth);
    el.workspace.style.setProperty("--rail-w", clamped + "px");
    if (remember) AA.writeStoredRailWidth(prefStore(), clamped);
    return clamped;
  };
  const current = () => el.workspace.querySelector(".an__rail").getBoundingClientRect().width;
  apply(AA.readStoredRailWidth(prefStore(), window.innerWidth), false);
  handle.onpointerdown = (ev) => {
    ev.preventDefault();
    handle.classList.add("is-dragging");
    if (handle.setPointerCapture) { try { handle.setPointerCapture(ev.pointerId); } catch (_) { /* synthetic */ } }
    const left = el.workspace.getBoundingClientRect().left;
    handle.onpointermove = (move) => { apply(move.clientX - left, false); };
    handle.onpointerup = (up) => {
      handle.onpointermove = null;
      handle.onpointerup = null;
      handle.classList.remove("is-dragging");
      apply(up.clientX - left, true);
    };
  };
  handle.onkeydown = (ev) => {
    if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
    ev.preventDefault();
    apply(current() + (ev.key === "ArrowRight" ? 20 : -20), true);
  };
  window.addEventListener("resize", () => apply(current(), false));
}

// A native <select> cannot tooltip per option, so the select itself carries the
// SELECTED option's full text: the clipped closed select is read in full on hover.
function syncSelectTitle(select) {
  const option = select.options[select.selectedIndex];
  select.title = option ? option.textContent : "";
}

function selectTopology(topologyId) {
  state.currentTopology = state.topologyProjection.topologies.find((t) => t.id === topologyId) || null;
  // A rail scope belongs to ONE topology's id space, so changing topology
  // drops it rather than carrying a filter that can no longer name anything.
  // `goto` sets its own filter AFTER this runs, so a deep link is unaffected.
  clearPanelFilter();
  // A studyless topology has no study: the last topology's must not linger as
  // the scope of this one.
  state.currentStudy = null;
  el.topologySelect.value = topologyId;
  syncSelectTitle(el.topologySelect);
  el.studySelect.innerHTML = "";
  const studies = (state.currentTopology && state.currentTopology.studies) || [];
  for (const s of studies) {
    const opt = document.createElement("option");
    opt.value = s.id; opt.textContent = s.title;
    el.studySelect.appendChild(opt);
  }
  if (!studies.length) {
    const none = document.createElement("option");
    none.value = ""; none.textContent = AA.PARTS_COPY.noStudies;
    el.studySelect.appendChild(none);
  }
  el.studySelect.disabled = !studies.length;
  syncSelectTitle(el.studySelect);
  if (studies.length) selectStudy(studies[0].id);
  else { renderElementList(); resetContext(false); }
}

function selectStudy(studyId) {
  state.currentStudy = (state.currentTopology.studies || []).find((s) => s.id === studyId) || null;
  // Picking a study by hand is a reader saying "show me this study", which is
  // the opposite of a one-element scope -- same reasoning as selectTopology.
  clearPanelFilter();
  el.studySelect.value = studyId;
  syncSelectTitle(el.studySelect);
  renderElementList();
  resetContext(false);
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
  // A studyless topology lists every edge: with no study to scope it, an empty
  // list would leave its interfaces unreachable.
  const listAll = !state.currentStudy && !state.panelFilter;
  const edgeIds = listAll ? state.currentTopology.edges.map((e) => e.id) : listedEdgeIds();
  if (listAll) {
    if (!edgeIds.length) return;
    const head = document.createElement("li");
    head.className = "el-head";
    head.textContent = AA.studylessHead(edgeIds.length);
    head.title = head.textContent;
    el.elementList.appendChild(head);
  }
  const identity = mergedIdentityProjection();
  const staleness = state.identityProjection && state.identityProjection.staleness;
  for (const edgeId of edgeIds) {
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
    const rowText = edge.name || edge.id;
    li.title = rowText;
    const rowName = document.createElement("span");
    rowName.className = "el-row__name";
    rowName.textContent = rowText;
    li.appendChild(rowName);
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
  // DRAWN, not typed -- one SVG path sized in pixels and coloured by
  // `currentColor`, shared with the viewer (AA.warningIcon delegates to
  // apps/viewer/warning_icon.js). It was `AA.ALERT_ICON` on `textContent`
  // until 2026-09-22; binding_state.js carries why a character could not stay.
  badge.appendChild(AA.warningIcon("alertbadge__mark"));
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
  // A scope plan carries its own name (a study's title is not on the rail to
  // look up); an element plan is named by the topology's own edge/node table.
  const found = edges.find((e) => e.id === plan.target) ||
    nodes.find((n) => n.id === plan.target);
  const note = document.createElement("span");
  note.className = "an__filter-note";
  note.textContent = "Showing only: " +
    (plan.name || (found && (found.name || found.id)) || plan.target);
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
      : (plan.name
        ? "Nothing in this selection names a part, so there is nothing to show in 3D."
        : "This element names no part, so there is nothing to show in 3D."));
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
  // Not awaited, and deliberately: `select-edge` is what a rail click runs and
  // a click handler has nothing to await into. refreshSuggestions() reports
  // its own failures on the banner for exactly that reason.
  refreshSuggestions();
}

// --- the top bar (deliverable 1) -------------------------------------------
//
// One horizontal band above the canvas, where a 320px column used to stand to
// the right of it. Jeff, on the flyout: "the 'Pick an element on the left,
// then click a face in the 3D view to bind it.' has a vertical divider, so it
// takes up half of the usable 3d canvas. Make it a horizontal divider so it's
// just a single line at the top. Could even be a collapsible 'commands'
// element that gives general help."
//
// Line one is always there and is always one line: the instruction, composed
// from the element (AA.taskInstruction), and two quiet disclosures. Everything
// else -- the precedence guard, the bind form, the owner-not-in-set escape
// hatch, the general help and the display settings -- opens under it only when
// there is something to open. That is the whole shape of the trade: the bar
// costs one line at rest where the column cost a third of the canvas always.
//
// The node keeps the id `#detail`: it is still "what the reader is being told
// and what they can do about it", and the hosted-posture guard (scripts/
// run_viewer_browser_tests.mjs) names it when it checks that a page which has
// said it cannot annotate is not also instructing the reader to.
function renderDetail() {
  // Sweep mode owns the whole bar while it is on: the bind instruction, the
  // bind form and the owner-not-in-set escape hatch are all about a workflow
  // that is switched off here, and showing them under a line that says
  // picking is disabled is the exact contradiction the hosted-page work was
  // about (ISSUE_20260915_the_hosted_annotate_page_still_instructs_the_
  // reader_to_bind_a_face).
  if (state.sweep) {
    if (state.scene) state.scene.setBindLeader(null);
    return renderSweepBar();
  }
  el.detail.innerHTML = "";
  const edge = state.selectedEdge;
  const canWrite = !!(state.storage && state.storage.canWrite());

  const line = document.createElement("div");
  line.className = "an__detail-line";
  const task = document.createElement("span");
  task.className = "an__task";
  // The instruction and the leader both follow the bind form's interface
  // choice, which changes WITHOUT a re-render (a re-render would throw away
  // whatever the reader has typed into the optional fields) -- so they are
  // composed here, once per render and once per choice.
  const refreshBindStep = () => {
    const bind = edge ? bindContext(edge) : null;
    task.textContent = AA.taskInstruction({
      elementName: edge ? (edge.name || edge.id) : null,
      scopeName: (!edge && state.panelFilter && state.panelFilter.name) || null,
      picked: !!state.currentPick,
      needed: bind ? bind.needed : null,
      names: bind ? bind.names : null,
      chosen: bind && state.currentPick ? bind.plan.selected : null,
    });
    // The line ellipsizes on a narrow bar; the whole sentence is one hover away.
    task.title = task.textContent;
    if (state.scene) {
      state.scene.setBindLeader(bind && canWrite && state.currentPick
        ? AA.planBindLeader({ pick: state.currentPick, plan: bind.plan }) : null);
    }
    return bind;
  };
  const bind = refreshBindStep();
  line.appendChild(task);
  line.appendChild(disclosure("Help", state.helpOpen, () => AA.exec(["help"])));
  el.detail.appendChild(line);

  const work = document.createElement("div");
  work.className = "an__detail-work";

  if (edge) {
    // What the colours on the body mean, in one muted line, and only while
    // there is something to explain. A reader who sees part of a body lit up
    // should not have to guess whether that is every round face on the part or
    // the two that line up with a face already bound.
    const suggestion = suggestionLine();
    if (suggestion) {
      const p = document.createElement("p");
      p.className = "an__suggestion-note";
      p.textContent = suggestion;
      work.appendChild(p);
    }
    const note = precedenceNote(edge);
    if (note) {
      const p = document.createElement("p");
      p.className = "precedence-note";
      p.textContent = note;
      work.appendChild(p);
    }
    if (!canWrite) {
      const p = document.createElement("p");
      p.className = "read-only-note";
      p.textContent = "This transport cannot write -- binding controls are hidden. " +
        "Connect a read/write folder to bind.";
      work.appendChild(p);
    } else {
      if (state.currentPick && bind) {
        work.appendChild(buildBindForm(edge, state.currentPick, bind, refreshBindStep));
      }
      work.appendChild(buildOwnerNotInSetForm(edge));
    }
  }

  if (work.childNodes.length) el.detail.appendChild(work);
  renderHintPanel();
}

// The suggestion line, or null when there is nothing to say -- the setting is
// off, no element is selected, or the element produced neither candidates nor a
// reason. Composed by AA.describeSuggestions so the counts and the stage names
// come off the plan rather than being written twice.
function suggestionLine() {
  if (!state.faceSuggestions || !state.selectedEdge || !state.suggestionPlan) return null;
  return AA.describeSuggestions(state.suggestionPlan,
    AA.edgeEndNames(state.currentTopology, state.selectedEdge)) || null;
}

// A quiet toggle: no button chrome, subdued until hover/focus, and its state
// carried on `aria-expanded` rather than in its label, so the word does not
// change under the reader's cursor.
function disclosure(label, open, onToggle) {
  const btn = document.createElement("button");
  btn.className = "an__disclose";
  btn.textContent = label;
  btn.setAttribute("aria-expanded", open ? "true" : "false");
  btn.onclick = () => {
    try { onToggle(); }
    catch (err) { setBanner(err.message, "error"); }
  };
  return btn;
}

// The bar's collapsible half: what the surface does, in short lines, and the
// display settings. Jeff's "collapsible 'commands' element that gives general
// help", and the room the follow-on suggestion work (handoff
// annotate_face_suggestions) drops a third group into -- it is a list of
// groups, so adding one is adding one.
function renderHintPanel() {
  if (!el.hintPanel) return;
  el.hintPanel.innerHTML = "";
  if (!state.helpOpen) {
    el.hintPanel.style.display = "none";
    return;
  }
  el.hintPanel.style.display = "flex";

  const help = group("What you can do");
  const lines = document.createElement("ul");
  lines.className = "an__hint-lines";
  for (const text of (state.sweep ? AA.SWEEP_HELP_LINES : AA.HELP_LINES)) {
    const li = document.createElement("li");
    li.textContent = text;
    lines.appendChild(li);
  }
  help.appendChild(lines);
  el.hintPanel.appendChild(help);

  const display = group("Display");
  if (state.sweep) {
    // What is drawn, as four checkboxes over the one vocabulary the
    // `layer` verb parses -- so the panel cannot offer a layer the verb refuses, or
    // miss one it accepts.
    for (const layer of AA.SWEEP_LAYERS) {
      display.appendChild(settingCheckbox(SWEEP_LAYER_LABELS[layer],
        state.sweep.layers[layer], SWEEP_LAYER_HINTS[layer],
        ((which) => (on) => AA.exec(["layer", which, AA.onOff(on)]))(layer)));
    }
    // ...and the app's own see-through setting, which sweep mode honours too
    // (see applySweepFrame). The same box, the same verb, the same stored
    // preference -- not a second answer to "what do I see".
    display.appendChild(settingCheckbox("See-through parts", state.transparentParts,
      "renders the bodies translucent, so the joints and links show through them",
      (on) => AA.exec(["transparency", AA.onOff(on)])));
    el.hintPanel.appendChild(display);
    return;
  }
  display.appendChild(settingCheckbox("See-through parts", state.transparentParts,
    "renders bodies translucent, so faces already bound show through",
    (on) => AA.exec(["transparency", AA.onOff(on)])));
  display.appendChild(settingCheckbox(AA.SUGGEST_SETTING_LABEL, state.faceSuggestions,
    AA.SUGGEST_SETTING_HINT,
    (on) => AA.exec(["auto-suggest", AA.onOff(on)])));
  el.hintPanel.appendChild(display);
}

function group(title) {
  const box = document.createElement("div");
  box.className = "an__hint-group";
  const h = document.createElement("h4");
  h.textContent = title;
  box.appendChild(h);
  return box;
}

// One labelled checkbox that drives a command. `onSet` may throw or reject --
// the box goes back to where it was and the banner says why, the same
// put-it-back-on-failure the parts panel's own checkbox does.
function settingCheckbox(label, checked, title, onSet) {
  const row = document.createElement("label");
  row.className = "an__setting";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = !!checked;
  row.setAttribute("title", title);
  box.onchange = async () => {
    try {
      await onSet(box.checked);
    } catch (err) {
      setBanner(err.message, "error");
      box.checked = !box.checked;
    }
  };
  row.appendChild(box);
  row.appendChild(document.createTextNode(label));
  return row;
}

// --- the rail's "set up automatically" menu (deliverable 3) ----------------
//
// Jeff: "the left side menu should have an 'auto-filter' menu at the top which
// lets you enable/disable different parts of the selection algorithm
// (checkboxes to auto select topology, study, part)." One row per
// AA.AUTO_STEPS entry, so the words on the page and the steps `planArrival`
// reads are one list.
function renderAutoSetup() {
  if (!el.autoSetupBody) return;
  el.autoSetupBody.innerHTML = "";
  for (const step of AA.AUTO_STEPS) {
    el.autoSetupBody.appendChild(settingCheckbox(step.label,
      state.autoSteps[step.key], step.hint,
      (on) => AA.exec(["auto-filter", step.key, AA.onOff(on)])));
  }
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

// The bind form, horizontal since 2026-09-21 -- it is the bottom of a bar
// rather than the bottom of a column now, so its fields wrap across the width
// instead of stacking down it. Shown only with a face picked: with none there
// is nothing for it to write, and the instruction line already says so.
//
// It no longer prints "Picked: part <12 hex>…, face N" above itself: a
// checksum prefix is not something a reader of this page can act on, and the
// instruction line says which element the pick will land on in words.
//
// Since 2026-10-21 (handoff a_face_pick_survives_an_orbit_and_names_its_end)
// the end a face is bound at is chosen between the edge's two INTERFACES, by
// name, where it used to be a dropdown reading `from`/`to` with `from`
// preselected -- which is how the first event a reader ever wrote went in at
// the wrong end. The stored word is unchanged (AA.DIRECTIONS, generated from
// Python); only what the form shows is. Bind stays disabled until an end is
// chosen, and an end already bound is shown as taken rather than offered.
function buildBindForm(edge, pick, bind, onChoose) {
  const form = document.createElement("div");
  form.className = "bind-form";

  let selected = bind.plan.selected;
  const btn = document.createElement("button");
  const ends = buildEndChoice(bind.plan, (direction) => {
    state.bindChoice = { edgeId: edge.id, sha256: pick.sha256, faceId: pick.faceId, direction };
    selected = onChoose().plan.selected;
    ends.show(selected);
    btn.disabled = !selected;
  });
  form.appendChild(ends.box);
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

  btn.textContent = "Bind selected face to " + (edge.name || edge.id);
  btn.className = "bind-form__bind";
  btn.disabled = !selected;
  btn.onclick = async () => {
    if (!selected) return;
    try {
      const filenames = await existingEventFilenames();
      const eventId = "annotate-" + Date.now() + "-" + slugify(edge.id);
      const event = AA.buildBoundEvent({
        eventId,
        seq: filenames.length + 1,
        createdAt: nowIso(),
        recordedBy: "annotate-app",
        stackKey: AA.topologyEdgeKey(state.currentTopology.id, edge.id),
        geometryKey: AA.geometryKeyOfPick(pick),
        direction: selected,
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

// What the bind form, the instruction and the leader all read about one
// element: its record, what it still needs, its two ends' names, and the
// interface choice as AA.planBindChoices settles it. The reader's choice
// counts only for the element AND the face it was made on -- a new pick or a
// new element starts with no choice again, never with the last one carried
// over as a default nobody aimed.
function bindContext(edge) {
  if (!state.currentTopology) return null;
  const record = AA.findBindingRecord(mergedIdentityProjection(),
    AA.topologyEdgeKey(state.currentTopology.id, edge.id));
  const names = AA.edgeEndNames(state.currentTopology, edge);
  const c = state.bindChoice;
  const pick = state.currentPick;
  const chosen = c && pick && c.edgeId === edge.id && c.sha256 === pick.sha256 &&
    c.faceId === pick.faceId ? c.direction : null;
  return {
    record, names,
    needed: AA.bindingDirectionsNeeded(record),
    plan: AA.planBindChoices({ record, names, chosen }),
  };
}

// The interface choice: one button per end that may be chosen, carrying the
// stored word as its value and the interface's name as its label, and a
// muted row for an end already bound, with the face it has. Long interface
// names wrap -- they are the whole content of the control.
function buildEndChoice(plan, onPick) {
  const box = document.createElement("div");
  box.className = "an__ends";
  box.setAttribute("role", "radiogroup");
  const legend = document.createElement("span");
  legend.className = "an__ends-label";
  legend.id = "bind-ends-label";
  legend.textContent = "This face is";
  box.setAttribute("aria-labelledby", legend.id);
  box.appendChild(legend);
  const buttons = [];
  for (const end of plan.ends) {
    if (plan.choices.indexOf(end.direction) === -1) {
      const taken = document.createElement("div");
      taken.className = "an__end an__end--taken";
      taken.dataset.direction = end.direction;
      const name = document.createElement("span");
      name.textContent = end.name || "";
      const note = document.createElement("span");
      note.className = "an__end-note";
      note.textContent = "already bound" +
        (end.bound && typeof end.bound.faceId === "number" ? " · face " + end.bound.faceId : "");
      taken.appendChild(name);
      taken.appendChild(note);
      box.appendChild(taken);
      continue;
    }
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "an__end";
    choice.setAttribute("role", "radio");
    choice.dataset.direction = end.direction;
    choice.textContent = end.name || "";
    choice.onclick = () => onPick(end.direction);
    buttons.push(choice);
    box.appendChild(choice);
  }
  const show = (selected) => {
    for (const b of buttons) {
      b.setAttribute("aria-checked", b.dataset.direction === selected ? "true" : "false");
    }
  };
  show(plan.selected);
  return { box, show };
}

// The escape hatch for an element whose owning part is not in the loaded set
// -- there is no face to click for it, so it is the one binding action that
// needs no pick. A DISCLOSURE since 2026-09-21: it is rare and it carries a
// text field, and on a bar across the top of the canvas a permanently-open
// note field beside every element is chrome the common path never wants.
// Collapsed it is one quiet word; the state is per session, not a preference.
function buildOwnerNotInSetForm(edge) {
  const box = document.createElement("details");
  box.className = "an__nis";
  box.open = state.notInSetOpen;
  const summary = document.createElement("summary");
  summary.textContent = "Owner not in this set…";
  summary.setAttribute("title",
    "record that this element's part is not among the parts loaded here, " +
    "so no face here can stand for it");
  box.appendChild(summary);
  box.ontoggle = () => { state.notInSetOpen = box.open; };
  const body = document.createElement("div");
  body.className = "an__nis-body";
  body.appendChild(buildOwnerNotInSetFields(edge));
  box.appendChild(body);
  return box;
}

function buildOwnerNotInSetFields(edge) {
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

// One list, two kinds of control. Rows are grouped by CONTEXT -- "In this
// model", then "Other parts" folded away -- and each row's checkbox is the
// VIEW (drawn or not). The header checkbox over the first group is the view
// for all of it at once. Isolate is the view too, and a toggle.
function renderPartsPanel() {
  el.partsPanel.innerHTML = "";
  const { inModel, other } = currentContext();
  const isolated = (state.isolation && state.isolation.targets) || [];

  if (inModel.length) {
    const head = document.createElement("li");
    head.className = "part-row part-row--head";
    const title = document.createElement("span");
    title.className = "part-row__label";
    title.textContent = AA.PARTS_COPY.inModel;
    title.title = AA.PARTS_COPY.inModel;
    head.appendChild(title);
    const all = document.createElement("input");
    all.type = "checkbox";
    all.title = AA.PARTS_COPY.showAll;
    const header = AA.planShowAllHeader(inModel.map((m) => state.scene.isVisible(m.sha256)));
    all.checked = header.checked;
    all.indeterminate = header.indeterminate;
    all.onchange = async () => {
      try {
        await AA.exec([all.checked ? "show-all" : "hide-all"]);
      } catch (err) {
        setBanner(err.message, "error");
        renderPartsPanel();
      }
    };
    head.appendChild(all);
    el.partsPanel.appendChild(head);
  }
  for (const mesh of inModel) el.partsPanel.appendChild(buildPartRow(mesh, true, isolated));

  if (other.length) {
    const li = document.createElement("li");
    const box = document.createElement("details");
    box.className = "parts-other";
    // The fold's own state survives a repaint -- every checkbox repaints it.
    box.open = state.otherPartsOpen;
    box.ontoggle = () => { state.otherPartsOpen = box.open; };
    const sum = document.createElement("summary");
    sum.textContent = AA.PARTS_COPY.other + " (" + other.length + ")";
    box.appendChild(sum);
    const list = document.createElement("ul");
    list.className = "parts-panel";
    for (const mesh of other) list.appendChild(buildPartRow(mesh, false, isolated));
    box.appendChild(list);
    li.appendChild(box);
    el.partsPanel.appendChild(li);
  }
  // The sweep rail lists the same part rows under its bodies; they show the
  // same view, so they repaint with it.
  if (state.sweep) renderSweepRail();
}

// `scope` ({subject, occurrences}) makes it a sweep-rail row inside a body:
// its checkbox and its hover reach that body's occurrences only. Without it,
// the row is the mesh -- every occurrence -- and says how many when that is
// more than one.
function buildPartRow(mesh, inModel, isolated, scope) {
  const li = document.createElement("li");
  li.className = "part-row";
  if (state.sweep) {
    li.dataset.sha = mesh.sha256;
    if (scope) li.dataset.subject = scope.subject;
    hoverOn(li, scope ? ["hover", "part", mesh.sha256, scope.subject] : ["hover", "part", mesh.sha256]);
  }

  const label = document.createElement("span");
  label.className = "part-row__label";
  // `<number> <name>`; the full line and the internal id are on the hover
  // (the label is clipped to the rail's width, and the rail is resizable but
  // not infinitely so).
  const words = AA.partRowWords(mesh, state.partNames);
  label.textContent = words.text;
  label.title = words.title;
  li.appendChild(label);
  const drawn = state.scene.drawnOccurrenceKeys(mesh.sha256).length;
  if (!scope && drawn > 1) {
    const count = document.createElement("span");
    count.className = "part-row__count";
    count.textContent = AA.PARTS_COPY.occurrences.replace("{n}", String(drawn));
    count.title = AA.PARTS_COPY.occurrencesTitle.replace("{n}", String(drawn));
    li.appendChild(count);
  }

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.title = "show/hide in the 3D view";
  if (scope) {
    const shown = occurrencesShown(scope.occurrences);
    cb.checked = shown.checked;
    cb.indeterminate = shown.indeterminate;
  } else {
    cb.checked = state.scene.isVisible(mesh.sha256);
  }
  cb.onchange = async () => {
    try {
      await AA.exec([cb.checked ? "show" : "hide", mesh.sha256].concat(scope ? [scope.subject] : []));
    } catch (err) {
      setBanner(err.message, "error");
      cb.checked = !cb.checked;
    }
  };
  li.appendChild(cb);

  const on = isolated.indexOf(mesh.sha256) !== -1;
  const isoBtn = document.createElement("button");
  isoBtn.textContent = AA.PARTS_COPY.isolate;
  isoBtn.title = on ? "show the other parts again" : "show only this part";
  isoBtn.setAttribute("aria-pressed", on ? "true" : "false");
  if (on) isoBtn.classList.add("is-pressed");
  isoBtn.onclick = async () => {
    try {
      const next = AA.planIsolateToggle(isolated, mesh.sha256);
      const verb = state.isolation && state.isolation.ghost ? "ghost" : "isolate";
      await AA.exec(next.length ? [verb, ...next] : [verb, AA.ON_OFF[1]]);
    } catch (err) {
      setBanner(err.message, "error");
    }
  };
  li.appendChild(isoBtn);

  const member = document.createElement("button");
  member.className = "part-row__member";
  member.textContent = inModel ? AA.PARTS_COPY.remove : AA.PARTS_COPY.add;
  member.onclick = () => {
    try {
      AA.exec(["context", inModel ? "remove" : "add", mesh.sha256]);
    } catch (err) {
      setBanner(err.message, "error");
    }
  };
  li.appendChild(member);

  // Where the part is drawn, when it is not simply where the assembly puts
  // it -- muted, under the row, and absent for every part that needs none.
  const note = positionNote(mesh.sha256);
  if (note) {
    const says = document.createElement("span");
    says.className = "part-row__note";
    says.textContent = note;
    li.appendChild(says);
  }
  return li;
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
// ?sweep=<run-id|latest>&t=<driver value> -- sweep mode's own entry, through
// the same AA.planEntryCommands list every other one takes.
const wantSweep = params.get("sweep");
const wantSweepAt = params.get("t");
// ...&kinematic=<study> -- the kinematic study the run is opened from, whose
// contributors the sweep rail lists (handoff the_sweep_rail_shows_the_mechanism).
const wantKinematic = params.get("kinematic");

function hasPendingDeepLink() {
  return !!(wantTopology || wantIsolate || wantSweep);
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

// The params, as the ordered command list. The branching used to live here;
// it is AA.planEntryCommands now (commands.js), where a tier with no DOM can
// read it -- this function is the two lines that RUN the list and the one
// that reports a failure.
//
// `trace=1` no longer needs `study`: with none it is a topology-scope entry
// (deliverable 4).
async function runPendingDeepLink() {
  for (const command of AA.planEntryCommands({
    topology: wantTopology, study: wantStudy, edge: wantEdge,
    isolate: wantIsolate, trace: wantTrace,
    sweep: wantSweep, t: wantSweepAt, kinematic: wantKinematic,
  })) {
    try {
      await AA.exec(command);
    } catch (err) {
      setBanner("Deep link failed: " + err.message, "error");
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

// ...and the other direction (handoff the_3d_pane_opens_in_the_mode_the_study_
// wants, deliverable 4): after a sweep / goto / trace completes, the embedding
// page is told what this app now shows -- {type: "annotate:state", mode,
// topology, study, run, title}, built by AA.embedState -- so the pane's head
// line is this app's own answer and never the viewer's guess. Same-origin
// only, like the listener; a page that is not embedded has no one to tell.
function postEmbedState() {
  if (window.parent === window) return;
  const message = AA.embedState(state.sweep ? state.sweep.artifact : null,
    state.currentTopology, state.currentStudy);
  try { window.parent.postMessage(message, window.location.origin); } catch (_) { /* embedder gone */ }
}

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
    state.partNames = await state.storage.readPartNames();
    // Every recorded occurrence, before any part opens: it is where every
    // part is drawn (scene.placementsFor), and what the panel's notes say.
    await loadOccurrences();
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
  wireRailResize();
  el.consoleRun.onclick = runConsoleCommand;
  el.consoleInput.onkeydown = (ev) => { if (ev.key === "Enter") runConsoleCommand(); };
  // What this box accepts, read off the registry every verb was registered
  // into rather than spelled in the markup (AA.commandHint, commands.js).
  // Wired HERE, with the rest of the console, so a hosted page that withholds
  // the console never advertises it: "a control that is about to be withheld
  // is never wired" -- see main()'s note above.
  el.consoleInput.setAttribute("title", AA.commandHint(commands.verbs()));
  // The rail's auto-setup menu and the top bar's first paint: both are
  // written from the settings read at boot, and both are wired HERE, below
  // the hosted early-return, for the same reason the console is -- a control
  // that is about to be withheld is never wired.
  renderAutoSetup();
  renderDetail();

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
  // Where a part is drawn: at every position the assembly records for it
  // (handoff parts_sit_where_the_assembly_puts_them). The scene asks once per
  // part, before the part joins the scene; null means "its own origin".
  state.scene.placementsFor = async (sha256) => {
    await loadOccurrences();
    const rest = restOf(sha256);
    // Keyed, so one occurrence can be hidden or hovered by the key the
    // assembly recorded it under (setOccurrencesVisible, setHover).
    return rest.placements.length ? { placements: rest.placements, keys: rest.keys } : null;
  };
  // The part under a pointer that has come to rest, into the rail (sweep
  // mode only; the scene asks nothing outside it).
  state.scene.onPartHover = sceneHoverPart;
  // The same read-only convention, for sweep mode: a harness (and the
  // screenshot pass) can ask where the scrubber is and what frame rate the
  // playback is actually getting. Nothing in this app reads it, and it is
  // not a second way to drive the mode -- every mutation is still a verb.
  Object.defineProperty(window, "__sweep", { get: () => state.sweep });

  // The clock. The scene has a requestAnimationFrame loop of its own that
  // only renders; deciding WHERE the sweep is belongs here, with the state,
  // so one loop advances it and the scene is told the answer.
  const sweepClock = (now) => {
    try { tickSweep(now); } catch (err) { setBanner(err.message, "error"); }
    requestAnimationFrame(sweepClock);
  };
  requestAnimationFrame(sweepClock);

  // Space, the arrows, Home and End -- the transport every video player has,
  // and each one is the verb the button beside it runs. Ignored while the
  // reader is typing into the command box, and while a control that uses the
  // same keys (the scrubber itself) has focus.
  window.addEventListener("keydown", (ev) => {
    if (!state.sweep) return;
    const target = ev.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" ||
      target.tagName === "TEXTAREA")) return;
    const last = state.sweep.artifact.points.length - 1;
    let command = null;
    if (ev.key === " ") command = [state.sweep.playing ? "pause" : "play"];
    else if (ev.key === "ArrowLeft") command = ["step", "-1"];
    else if (ev.key === "ArrowRight") command = ["step", "1"];
    else if (ev.key === "Home") command = ["seek", "#0"];
    else if (ev.key === "End") command = ["seek", "#" + last];
    if (!command) return;
    ev.preventDefault();
    AA.exec(command).catch((err) => setBanner(err.message, "error"));
  });
  // Every click in the 3D view is one of the two verbs, chosen by the pure
  // AA.planPickToggle (deliverable 3). A CLICK, since 2026-10-21: the scene
  // calls this on a release that did not travel (AA.planPointerRelease), so
  // a drag to orbit never reaches it. A click into empty space and a click
  // back onto the already-picked face both DESELECT, anything else selects.
  // Before this, a miss set `state.currentPick = null` and left the orange
  // tint exactly where it was, and a re-click re-highlighted the same face --
  // so there were three ways to pick a face and none to unpick one.
  state.scene.onPick = (pick, bead) => {
    // IN SWEEP MODE A CLICK SELECTS IN THE RAIL, at any frame (handoff
    // the_rail_and_the_scene_point_at_each_other): a bead selects its joint,
    // a face selects its part inside the body it was picked on, and empty
    // space lets the selection go. Selecting writes nothing, so it is not the
    // frame rule's business; what follows is, unchanged.
    if (state.sweep) {
      const sweep = state.sweep;
      const was = sweep.inspect;
      if (bead) railExec(["inspect", "joint", bead.name]);
      else if (!pick || (was && was.kind === AA.INSPECT_TARGETS[3] && was.name === pick.sha256 &&
        was.faceId === pick.faceId)) railExec(["inspect", "clear"]);
      else {
        const subject = AA.sweepOccurrenceSubject(sweep.bodies, pick.sha256, pick.key);
        railExec(["inspect", "part", pick.sha256, String(pick.faceId)].concat(subject ? [subject] : []));
      }
      if (bead) return;
    }
    // THE FRAME RULE. A face is still the right face while the linkage is
    // swept, but every reason a reader has to trust what they clicked is
    // about where it was: a binding is identity, recorded against geometry
    // sitting in the pose the model was built in. So picking is off outright
    // away from that pose, with the reason on the bar rather than a click
    // that quietly does nothing. At the as-modelled frame sweep mode is
    // transparent and this behaves exactly as it always has.
    if (state.sweep && !AA.sweepIsAsModelled(state.sweep.frame)) {
      pulseSweepGate();
      return;
    }
    const plan = AA.planPickToggle(state.currentPick, pick);
    try {
      if (plan.action === "clear") AA.exec(["deselect", "face"]);
      else {
        AA.exec(["select-face", plan.pick.sha256, String(plan.pick.faceId)]);
        if (!state.selectedEdge) setBanner(AA.PICK_NEEDS_ELEMENT, "warn");
      }
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
