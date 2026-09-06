// Boot + wiring for the annotate page. ES module (see scene.js's docstring
// for why this app has no file:// constraint to design around); reads the
// classic-script globals (AA.CONFIG, AA.FsaAdapter, AA.MemoryAdapter,
// AA.FIXTURES, AA.*) that index.html loads before this file.
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
  partSelect: document.getElementById("part-select"),
  openPartBtn: document.getElementById("open-part-btn"),
  openPartsList: document.getElementById("open-parts-list"),
  detail: document.getElementById("detail"),
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
};

function setBanner(text, kind) {
  el.banner.textContent = text;
  el.banner.className = "banner" + (kind ? " banner--" + kind : "");
}

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
    li.onclick = () => selectEdge(edge);
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

async function renderPartPicker() {
  el.partSelect.innerHTML = "";
  const meshes = await state.storage.listMeshes();
  for (const mesh of meshes) {
    const opt = document.createElement("option");
    opt.value = mesh.sha256; opt.textContent = mesh.label + " (" + mesh.sha256.slice(0, 12) + "…)";
    el.partSelect.appendChild(opt);
  }
}

async function openSelectedPart() {
  const sha256 = el.partSelect.value;
  if (!sha256) return;
  try {
    await state.scene.loadPart(sha256);
    const li = document.createElement("li");
    li.textContent = sha256.slice(0, 12) + "…";
    const unloadBtn = document.createElement("button");
    unloadBtn.textContent = "close";
    unloadBtn.onclick = () => { state.scene.unloadPart(sha256); li.remove(); };
    li.appendChild(unloadBtn);
    el.openPartsList.appendChild(li);
  } catch (err) {
    setBanner("Could not open part: " + err.message, "error");
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
  await renderPartPicker();

  const wantTopology = params.get("topology");
  const wantStudy = params.get("study");
  if (wantTopology && state.topologyProjection.topologies.some((t) => t.id === wantTopology)) {
    selectTopology(wantTopology);
    if (wantStudy) selectStudy(wantStudy);
  }

  if (params.get("autotest") === "1") await runAutotest();
}

// The spike's own verification technique (step_tessellation's viewer.js):
// aim the camera at a part's own bounding-box center and raycast dead-center,
// so the fetch -> geometry -> raycast -> face_id path is exercised with no
// real mouse and no headless-browser automation -- this repo's own lesson
// (LESSONS_20260904_step_tessellation_spike.md) documents why real click
// automation is not run on this machine (it hijacks Jeff's live browser
// session). Publishes into #test-status and window.__autotestResults, same
// convention.
async function runAutotest() {
  const results = [];
  const meshes = await state.storage.listMeshes();
  for (const mesh of meshes) {
    try {
      await state.scene.loadPart(mesh.sha256);
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

async function main() {
  el.topologySelect.onchange = () => selectTopology(el.topologySelect.value);
  el.studySelect.onchange = () => selectStudy(el.studySelect.value);
  el.openPartBtn.onclick = openSelectedPart;

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
    setBanner("Click \"Connect folder\" and pick the tolstack repo root, grant read/write.", "warn");
  }
}

main();
