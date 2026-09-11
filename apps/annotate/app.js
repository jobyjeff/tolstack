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
  topologySelect: document.getElementById("topology-select"),
  studySelect: document.getElementById("study-select"),
  elementList: document.getElementById("element-list"),
  canvasHost: document.getElementById("canvas-host"),
  sceneEmpty: document.getElementById("scene-empty"),
  partsPanel: document.getElementById("parts-panel"),
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
  targets.forEach((sha) => state.scene.setVisible(sha, true));
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
  return { topologyId, studyId: targetStudyId, edgeId: edgeId || null };
}

const commands = new AA.CommandLayer();
commands.register("open-part", cmdOpenPart);
commands.register("show", cmdOpenPart); // "show" on a part never opened is "open it and show it"
commands.register("hide", cmdHide);
commands.register("isolate", cmdIsolate);
commands.register("camera", cmdCamera);
commands.register("select-face", cmdSelectFace);
commands.register("select-topology", cmdSelectTopology);
commands.register("select-study", cmdSelectStudy);
commands.register("select-edge", cmdSelectEdge);
commands.register("goto", cmdGoto);
AA.exec = (input) => commands.exec(input);

function setSceneEmptyState(missingParts) {
  if (!missingParts || !missingParts.length) {
    el.sceneEmpty.style.display = "none";
    el.sceneEmpty.textContent = "";
    return;
  }
  el.sceneEmpty.style.display = "flex";
  el.sceneEmpty.textContent = "No installed mesh for: " + missingParts.join(", ") +
    " -- tessellate the part first (see data/meshes/README.md), then reload.";
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
  el.studySelect.value = studyId;
  renderElementList();
}

function renderElementList() {
  el.elementList.innerHTML = "";
  if (!state.currentTopology || !state.currentStudy) return;
  const identity = mergedIdentityProjection();
  const staleness = state.identityProjection && state.identityProjection.staleness;
  for (const edgeId of state.currentStudy.selection) {
    const edge = state.currentTopology.edges.find((e) => e.id === edgeId);
    if (!edge) continue;
    const key = AA.topologyEdgeKey(state.currentTopology.id, edgeId);
    const record = AA.findBindingRecord(identity, key);
    const bindingState = AA.elementBindingState(record, staleness);

    const li = document.createElement("li");
    li.className = "el-row el-row--" + bindingState;
    li.textContent = (edge.name || edge.id) + "  ";
    const badge = document.createElement("span");
    badge.className = "badge badge--" + bindingState;
    badge.textContent = bindingState;
    li.appendChild(badge);
    li.onclick = () => {
      try {
        AA.exec(["select-edge", edge.id]);
      } catch (err) {
        setBanner(err.message, "error");
      }
    };
    if (state.selectedEdge && state.selectedEdge.id === edge.id) li.classList.add("selected");
    el.elementList.appendChild(li);
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

function renderPartsPanel() {
  el.partsPanel.innerHTML = "";
  for (const mesh of state.meshList) {
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

async function loadAll() {
  state.topologyProjection = await state.storage.readTopologyProjection();
  state.identityProjection = await state.storage.readFeatureIdentityProjection();
  if (!state.topologyProjection) {
    setBanner("No topology projection found. Build it: " + AA.CONFIG.rebuild.topologies, "warn");
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

  await runPendingDeepLink();

  if (params.get("autotest") === "1") await runAutotest();
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
  state.scene.onPick = (pick) => {
    state.currentPick = pick;
    if (pick) state.scene.highlightFace(pick.sha256, pick.faceId);
    renderDetail();
  };

  if (MOCK) {
    state.storage = new AA.MemoryAdapter(AA.FIXTURES);
    await state.storage.connect();
    el.connectBtn.style.display = "none";
    el.transportSub.textContent = "mock mode (?mock=1) -- writes are captured, not persisted";
    await loadAll();
    return;
  }

  if (!AA.FsaAdapter.isSupported()) {
    setBanner(
      "This browser has no File System Access API -- the annotate surface needs Chrome or Edge, " +
      "served over http(s) (not file://). Try ?mock=1 for a demo with no folder grant.",
      "error"
    );
    el.connectBtn.style.display = "none";
    return;
  }

  state.storage = new AA.FsaAdapter();
  el.transportSub.textContent = "read/write, data/inbox/feature-identity/ writes land in the connected folder";
  const initial = await state.storage.init();
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
