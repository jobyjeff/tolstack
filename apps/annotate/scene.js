// The 3D surface: loads a mesh through the storage adapter (never fetch()
// directly -- see storage/adapter.js), renders it with three.js, and maps a
// click to a STEP face_id. Adapted from rotorkit's step_tessellation spike
// viewer (`spike/step_tessellation/viewer.js`) -- same raycast + contiguous-
// vertex-run highlight approach, the one the spike's lesson proved out
// (`LESSONS_20260904_step_tessellation_spike.md`, deliverable 2) -- with two
// differences the spike had no reason to have: parts load lazily, one per
// `loadPart` call (spike lever #1: this app's own usage pattern only ever
// has a handful of parts open for one stack element at a time, decision 3),
// and geometry comes from the storage adapter's `readMeshManifest`/
// `readMeshBuffer` rather than a bare `fetch("./assets/...")`.
//
// ES module (unlike apps/viewer, which must run from file:// by double-click):
// this app already requires a static server for the write path (File System
// Access has no file:// story either), so there is no file:// constraint left
// to design around.
import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";

const PALETTE = [0x5b8dd6, 0xd68a5b, 0x7bc47f, 0xc47bc4];
const HIGHLIGHT = [1.0, 0.55, 0.1];
// Ghosted-part translucency (handoff study_3d_flyout): low enough that the
// opaque bound-face marks read as THE content, high enough that the part's
// silhouette still orients the viewer.
const GHOST_OPACITY = 0.22;
// The opaque face-overlay colours, by what the overlay CLAIMS. Three roles,
// three claims, and they coexist on screen -- a face can be a suggestion this
// second and a pick the next, and a face already bound stays marked throughout:
//
//   bound      a binding already attaches here (green, the provenance palette's
//              `--traced`-adjacent green this app has used since study_3d_flyout)
//   suggested  this face COULD be the feature -- a candidacy, never a claim that
//              it is right (handoff annotate_face_suggestions). Drawn in the
//              shared `--accent` (apps/viewer/style.css `:root`), whose declared
//              job is "this, and not the others" -- which is exactly what a
//              suggestion says. Deliberately NOT a state hue: red/amber/green
//              mean provenance and a verdict in both apps
//              (docs/DESIGN_TYPE_AND_COLOUR.md), and a suggestion is neither.
//   picked     you just picked this (the same orange the vertex-colour highlight
//              uses). It needs an overlay of its own only while the body is
//              translucent: a vertex tint at GHOST_OPACITY is not a selection a
//              reader can see.
//
// run_tests.cjs pairs `suggested` against that stylesheet's own `--accent`
// declaration, so the two cannot drift.
const MARK_COLORS = { bound: 0x35c26e, suggested: 0x6ea8fe, picked: 0xff8c1a };
// THE HOVER TINT (handoff the_rail_and_the_scene_point_at_each_other): what
// the pointer resting on a sweep-rail row lights -- a whole part at one
// occurrence, a bound face, a joint's bead. A pale wash drawn OVER the part
// (an overlay, never the colour buffer), so it is the lighter emphasis the
// accent rule asks for (selection keeps the pick orange and the accent blue,
// docs/DESIGN_TYPE_AND_COLOUR.md) and it can never take a picked face's tint
// down when it leaves. Neutral, not a state hue: it says "this one", nothing
// about provenance.
const HOVER_COLOR = 0xfff4d6;
const HOVER_OPACITY = 0.45;
const HOVER_RENDER_ORDER = 5;
// How much larger a hovered joint's bead is drawn: less than the selected
// joint's SWEEP_EMPHASIS_SCALE, for the same reason the tint is pale.
const SWEEP_HOVER_SCALE = 1.4;
const DEFAULT_MARK_ROLE = "bound";
// The bind leader (setBindLeader): drawn after the parts and the marks, and
// its labels after its line. The label's text size is in CSS px; the
// fallback view height is only for a canvas that reports none (hidden).
const LEADER_RENDER_ORDER = 10;
const LEADER_LABEL_PX = 12;
const LEADER_FALLBACK_VIEW_PX = 600;

// --- sweep mode (handoff kinematic_sweep_animation) ------------------------
//
// The stick figure's palette, keyed by the three joint kinds AA.sweepJointKind
// derives, plus the four fixed roles around them. Semantic, like every other
// colour in this app: `warn` is the solver failing to converge and nothing
// else, the three joint hues are a classification rather than decoration, and
// the trail and the ground triad are deliberately the quietest things on
// screen -- they are context, and the moving linkage is the content.
const SWEEP_COLORS = {
  distance: 0xffc14d,
  axial: 0x7bc47f,
  point: 0x6ea8fe,
  warn: 0xff6b5b,
  link: 0xc8ced6,
  trail: 0x4e5663,
  ground: 0x6a7380,
};
//: The triad's three axes, in the order X, Y, Z -- the one place this app
//: draws a frame, and the conventional red/green/blue, muted so three of them
//: on screen do not shout over the linkage.
const SWEEP_TRIAD_COLORS = [0xc2706c, 0x74ac77, 0x6d93c4];
const SWEEP_JOINT_RADIUS = 4;   // mm -- a bead on a linkage ~200 mm across
// How much larger the sweep rail's selected joint is drawn (setSweepEmphasis).
const SWEEP_EMPHASIS_SCALE = 1.8;
const SWEEP_TRIAD_LENGTH = 25;  // mm
const SWEEP_GHOST_OPACITY = 0.12;
// Sweep mode's own default viewing direction, and it is OBLIQUE on purpose.
// BACK_AXIS -- what every other camera here uses -- looks straight down -Y,
// and a planar mechanism lying in the Y-Z plane projects onto a single
// vertical line from there: three joints, one link and two trails, all on top
// of each other. A linkage is very often planar, so the one view that must
// not be axis-aligned is this one. Measured on the mock run, which is exactly
// that degenerate case.
const SWEEP_VIEW_AXIS = new THREE.Vector3(0.62, -0.72, 0.31).normalize();

// The model layer (handoff the_model_is_drawn_in_the_scene). Neutral lines,
// so the accent stays selection's (docs/DESIGN_TYPE_AND_COLOUR.md); a dot's
// colour says where its anchor came from (AA.MODEL_ANCHOR_SOURCES), and an
// anchor with no geometry behind it is the warn colour, because it is a gap.
const MODEL_COLORS = {
  line: 0xaab3bf,
  joint: 0xffc14d,
  bound: 0x35c26e,
  section: 0xdfe4ea,
  origin: 0xff6b5b,
  plane: 0x6ea8fe,
  region: 0x6ea8fe,
};
const MODEL_NODE_RADIUS = 2;     // mm, half a joint bead
const MODEL_RENDER_ORDER = 20;   // over the parts, the leader and the hover
const MODEL_DIM_OPACITY = 0.22;
const MODEL_PLANE_OPACITY = 0.08;

// A 3x4 row-major placement (sweep.js's one layout) onto an object's local
// matrix, in the ONE place that conversion happens in this app.
// THREE.Matrix4.set takes ROW-major arguments, which is the layout sweep.js
// speaks -- so this is a straight read and not a transpose.
//
// The matrix is the truth (`matrixAutoUpdate` is off on every placed node);
// position/quaternion are decomposed from it only so that a reader of
// `mesh.position` -- a test aiming at a face, a probe -- reads where the
// part IS rather than the origin.
function applyPlacement4(node, placement) {
  node.matrix.set(
    placement[0], placement[1], placement[2], placement[3],
    placement[4], placement[5], placement[6], placement[7],
    placement[8], placement[9], placement[10], placement[11],
    0, 0, 0, 1);
  node.matrix.decompose(node.position, node.quaternion, node.scale);
  node.matrixWorldNeedsUpdate = true;
}

// A part with no recorded occurrence is drawn at its own origin -- which is
// this placement, said once rather than special-cased at every caller.
const OWN_ORIGIN = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

// One placement or several, as one shape -- `null` for "put it back".
function normalisePlacements(placements) {
  if (!placements || !placements.length) return null;
  return Array.isArray(placements[0]) ? placements : [placements];
}

// CATIA STEP exports are Z-up (handoff annotate_deep_link_and_part_filter,
// deliverable 5 -- Jeff's live report: horizontal drag sometimes orbits about
// the vertical axis, sometimes about the axis normal to the screen,
// depending on view angle -- the classic symptom of a Y-up control on a Z-up
// mesh). BACK_AXIS is an arbitrary horizontal viewing direction perpendicular
// to UP_AXIS, used everywhere this file used to assume "+Z is toward the
// camera".
const UP_AXIS = new THREE.Vector3(0, 0, 1);
const BACK_AXIS = new THREE.Vector3(0, -1, 0);

// The per-face vertex ranges come from AA.faceVertexRanges (face_geometry.js)
// since 2026-09-21: the classifier needs the same cumulative sum over the
// manifest, and a traversal contract with two copies is a contract with two
// places to get it wrong. Called through `window.AnnotateApp` for the same
// reason `AA.faceSubGeometry` is -- this file is an ES module and that one is
// a classic script index.html loads first.

export class AnnotateScene {
  constructor(hostEl, storage) {
    this.storage = storage;
    this.hostEl = hostEl;
    this.parts = new Map(); // source_step_sha256 -> THREE.Mesh
    // In-flight loadPart promises, keyed by sha256 -- see loadPart's own note
    // on why "is it already open?" is not enough on its own.
    this._loading = new Map();
    // {sha256, faceId, role, geometry, material, meshes} -- opaque face
    // overlays, one mesh per drawn occurrence of the part (see markFace).
    this._marks = [];
    // sha256 -> the extra THREE.Meshes drawn for a part's second and later
    // occurrences. Every mode, since 2026-10-14: a part with three recorded
    // positions in the assembly is drawn at all three.
    this._repeats = new Map();
    this._colorIndex = 0;
    this._lastPick = null;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(hostEl.clientWidth, hostEl.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    hostEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1b1e22);

    this.camera = new THREE.PerspectiveCamera(
      45, hostEl.clientWidth / hostEl.clientHeight, 0.1, 1e6
    );
    // MUST happen before `new OrbitControls(...)`: OrbitControls captures
    // object.up into a fixed quaternion at construction time
    // (vendor/OrbitControls.js, `this._quat = ... setFromUnitVectors(object.up,
    // ...)`), not on every update -- setting camera.up afterward would leave
    // the controls permanently orbiting around the old (default Y) axis.
    this.camera.up.copy(UP_AXIS);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(1, 2, 3);
    this.scene.add(dirLight);

    this.raycaster = new THREE.Raycaster();

    // A PICK IS A CLICK, NOT A PRESS (handoff a_face_pick_survives_an_orbit_
    // and_names_its_end). The press is only recorded; the raycast happens on
    // the release, and only when AA.planPointerRelease says the pointer did
    // not travel -- so the press-and-drag that orbits the view leaves the
    // pick exactly where it was. A second pointer down (a pinch) makes the
    // gesture a camera move outright, however its fingers end.
    const canvas = this.renderer.domElement;
    const pointersDown = new Set();
    this._press = null;
    canvas.addEventListener("pointerdown", (ev) => {
      pointersDown.add(ev.pointerId);
      this._press = pointersDown.size === 1
        ? { x: ev.clientX, y: ev.clientY, pointerId: ev.pointerId } : null;
    });
    canvas.addEventListener("pointerup", (ev) => {
      pointersDown.delete(ev.pointerId);
      const press = this._press;
      if (!press || press.pointerId !== ev.pointerId) return;
      this._press = null;
      const rect = canvas.getBoundingClientRect();
      const at = window.AnnotateApp.planPointerRelease({
        down: press,
        up: {
          x: ev.clientX, y: ev.clientY,
          inside: ev.clientX >= rect.left && ev.clientX <= rect.right &&
            ev.clientY >= rect.top && ev.clientY <= rect.bottom,
        },
      });
      if (!at) return;
      const ndcX = ((at.x - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((at.y - rect.top) / rect.height) * 2 + 1;
      // A model dot under the pointer is a node selected, and nothing else:
      // the dots are drawn over the parts, so the click is the dot's.
      const node = this.modelHit(ndcX, ndcY);
      if (node) { this.onModelPick(node); return; }
      // In sweep mode a bead under the pointer is handed over too: a click
      // on a joint selects the joint (the rail's side of it is app.js's).
      this.onPick(this.pick(ndcX, ndcY), this._sweep ? this.sweepHover(ndcX, ndcY) : null);
    });
    canvas.addEventListener("pointercancel", (ev) => {
      pointersDown.delete(ev.pointerId);
      this._press = null;
    });

    // Overridable by the app: called with {sha256, faceId, record,
    // occurrence, key} on a successful pick, null on a miss into empty
    // space -- and, in sweep mode, with the joint bead under the pointer
    // (sweepHover's answer, or null) as the second argument.
    this.onPick = function () {};

    // Overridable by the app: where a part sits in the assembly, as a list
    // of 3x4 row-major placements, or null for "nothing records one" (the
    // part is then drawn at its own origin). Asked once per part, BEFORE the
    // part is added to the scene, so no frame ever shows it anywhere else.
    // The scene decides nothing about occurrences; app.js reads them out of
    // provenance (AA.restPlacements).
    this.placementsFor = async function () { return null; };

    // ...and the same shape for hovering a JOINT in sweep mode: the joint's
    // name and kind, or null off one. The handoff's answer to "how does a
    // reader learn what a bead is" -- a tooltip, not a legend, because a
    // legend is permanent chrome for a question asked once.
    //
    // The raycast is against the BEADS ONLY and never the parts: a pointermove
    // over 1.4 million triangles of anchored assembly, at pointer rate, is the
    // one thing that would make this mode feel slow.
    this.onSweepHover = function () {};
    // ...and, in sweep mode, the PART under a pointer that has come to rest
    // (handoff the_rail_and_the_scene_point_at_each_other: hovering a mesh
    // emphasises its rail row). The parts raycast is the expensive one the
    // note above keeps off the pointer rate, so it runs once per settle --
    // PART_HOVER_SETTLE_MS after the last move -- and never during a drag.
    this.onPartHover = function () {};
    // ...and after every frame drawn with the model layer up (see animate),
    // and with the node id of a model dot that was clicked.
    this.onModelRendered = function () {};
    this.onModelPick = function () {};
    this._partHoverTimer = null;
    this.renderer.domElement.addEventListener("pointermove", (ev) => {
      if (!this._sweep) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.onSweepHover(this.sweepHover(ndcX, ndcY), ev);
      if (this._partHoverTimer) clearTimeout(this._partHoverTimer);
      this._partHoverTimer = null;
      if (ev.buttons) return;
      this._partHoverTimer = setTimeout(() => {
        this._partHoverTimer = null;
        if (this._sweep) this.onPartHover(this.pick(ndcX, ndcY));
      }, AnnotateScene.PART_HOVER_SETTLE_MS);
    });
    this.renderer.domElement.addEventListener("pointerleave", () => {
      if (this._partHoverTimer) clearTimeout(this._partHoverTimer);
      this._partHoverTimer = null;
      if (this._sweep) {
        this.onSweepHover(null, null);
        this.onPartHover(null);
      }
    });

    // The canvas follows its host box. Until 2026-09-21 the renderer was sized
    // ONCE, at construction, and nothing resized it -- which was survivable
    // while the host was a fixed grid cell and is not now: the top bar opens
    // and closes above it (handoff annotate_hint_bar_and_context_autofilter),
    // and in the viewer's flyout the whole panel is drag-resized. A stale
    // drawing buffer does not just look wrong, it puts the raycast's NDC
    // mapping (pointerup, above) out of step with what is on screen, so a
    // click lands on the wrong face.
    if (typeof ResizeObserver === "function") {
      this._resizeObserver = new ResizeObserver(() => this.resize());
      this._resizeObserver.observe(hostEl);
    }

    // RENDER ON DEMAND (handoff the_annotate_scene_renders_only_when_
    // something_changed). The loop keeps ticking -- it is cheap -- but draws
    // only when `dirty`. Headless, WebGL is software, and an idle scene drawn
    // sixty times a second kept several cores busy for nothing. The camera
    // reaches `dirty` through OrbitControls' own `change` event (which also
    // covers damping: update() dispatches it while the view still moves);
    // every scene method that changes what is drawn calls requestRender().
    this.dirty = true;
    this.renderCount = 0;
    this.controls.addEventListener("change", () => this.requestRender());
    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      if (!this.dirty) return;
      this.dirty = false;
      this._layoutLeader();
      if (this._model && this._model.selection && this._model.selection.labelSprite) {
        this._sizeLabel(this._model.selection.labelSprite);
      }
      this.renderer.render(this.scene, this.camera);
      this.renderCount++;
      // After every drawn frame -- so a camera move or a sweep frame -- the
      // app may read where the model's anchors landed (the embedded scene
      // posts them to the shell). Once per animation frame at most, which is
      // the debounce the shell's leaders want.
      if (this._model) this.onModelRendered();
    };
    animate();
  }

  // The single way in: something drawn has changed, draw the next frame.
  requestRender() { this.dirty = true; }

  // The clear colour, as a CSS colour: embedded, the page beside the scene
  // lends its own background so the two read as one surface (app.js's
  // adoptEmbedderBackground).
  setBackground(css) {
    this.scene.background = new THREE.Color(css);
    this.requestRender();
  }

  // Re-sizes the drawing buffer and the projection to the host's current box.
  // A zero dimension (a hidden host) is ignored rather than clamped: three.js
  // would take an aspect ratio of 0/N and never recover it on the way back.
  resize() {
    const width = this.hostEl.clientWidth;
    const height = this.hostEl.clientHeight;
    if (!width || !height) return false;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.requestRender();
    return true;
  }

  // Lazy-load: fetches geometry only when a part is actually opened, not the
  // whole set eagerly (spike lever #1, the DoD's own requirement).
  //
  // IDEMPOTENT UNDER CONCURRENCY, and that is not decoration. The
  // already-open check below is synchronous and `this.parts.set` happens after
  // several awaits, so two callers that both start before either finishes
  // would BOTH build a mesh: two THREE.Meshes in the scene, one of them
  // unreachable through `this.parts` and therefore impossible to hide, frame
  // or dispose. Two callers is the normal
  // case since 2026-09-21 -- `goto` opens the element's part and the
  // suggestion display (app.js's cmdSuggest, started from `select-edge` and
  // deliberately not awaited by a click handler) opens the same one -- so the
  // in-flight promise is shared rather than the work repeated.
  loadPart(sha256) {
    if (this.parts.has(sha256)) return Promise.resolve(this.parts.get(sha256));
    const inFlight = this._loading.get(sha256);
    if (inFlight) return inFlight;
    const promise = this._loadPart(sha256);
    this._loading.set(sha256, promise);
    // A FAILED load must not be cached as in-flight forever: the next caller
    // should be able to try again (a transport can be re-granted).
    return promise.then(
      (mesh) => { this._loading.delete(sha256); return mesh; },
      (err) => { this._loading.delete(sha256); throw err; });
  }

  async _loadPart(sha256) {
    const manifest = await this.storage.readMeshManifest(sha256);
    if (!manifest) throw new Error("no mesh manifest for " + sha256);
    const [posBuf, idxBuf, fidBuf] = await Promise.all([
      this.storage.readMeshBuffer(sha256, manifest.positions_file),
      this.storage.readMeshBuffer(sha256, manifest.indices_file),
      this.storage.readMeshBuffer(sha256, manifest.face_ids_file),
    ]);
    if (!posBuf || !idxBuf || !fidBuf) {
      throw new Error("mesh buffers missing for " + sha256 + " (manifest present, files not)");
    }
    const positions = new Float32Array(posBuf);
    const indices = new Uint32Array(idxBuf);
    const faceIdPerTriangle = new Uint32Array(fidBuf);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    const base = new THREE.Color(PALETTE[this._colorIndex % PALETTE.length]);
    this._colorIndex++;
    const colors = new Float32Array(positions.length);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = base.r; colors[i + 1] = base.g; colors[i + 2] = base.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;

    mesh.userData = {
      sha256, manifest, faceIdPerTriangle,
      faceRanges: window.AnnotateApp.faceVertexRanges(manifest.faces),
      baseColors: colors.slice(),
      // Which drawn occurrence this node is -- 0 for the part itself, 1.. for
      // its repeats -- so a pick can say where it landed.
      occurrence: 0,
      // Where the assembly puts it (null: nowhere recorded), and what a
      // sweep has put in its place for now (null: nothing).
      rest: null,
      override: null,
      // The recorded occurrence KEY of each placement above, index for
      // index (null where the caller named none) -- how one occurrence is
      // addressed for visibility and hover, whichever list is being drawn.
      restKeys: null,
      overrideKeys: null,
      // The part's own show/hide (`setVisible`), and the occurrences hidden
      // on their own (`setOccurrencesVisible`), kept apart so neither undoes
      // the other: a node is drawn when the part is shown AND its key is not
      // hidden.
      shown: true,
      hiddenKeys: new Set(),
      key: null,
    };
    // Placed BEFORE it joins the scene: the side-by-side row this replaced
    // put every part somewhere first and nowhere meaningful, and a part that
    // flashes at the origin before jumping into the assembly is the same
    // defect for one frame.
    let rest = null;
    try { rest = await this.placementsFor(sha256); } catch (err) { rest = null; }
    // A list of placements, or {placements, keys} naming each one's
    // recorded occurrence.
    const restKeys = rest && !Array.isArray(rest) ? rest.keys || null : null;
    if (rest && !Array.isArray(rest)) rest = rest.placements;
    mesh.userData.rest = rest && rest.length ? rest : null;
    mesh.userData.restKeys = mesh.userData.rest ? restKeys : null;
    this.scene.add(mesh);
    this.parts.set(sha256, mesh);
    this._drawAt(sha256);
    this.requestRender();
    // ...but NOT while a sweep is running. Sweep mode frames the whole swept
    // path and the bodies round it (frameSweepScene) and then opens each
    // body's part, so this call
    // would snatch the camera back to a box drawn round one frame of the
    // linkage -- which is how the first screenshot pass came out edge-on to a
    // planar mechanism. A part opened during a sweep is opened to be anchored,
    // not to be looked at on its own.
    if (!this._sweep) this.frameParts();
    return mesh;
  }

  unloadPart(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    this._disposeMarks((m) => m.sha256 === sha256);
    this._disposeHoverOf(sha256);
    for (const repeat of this._repeats.get(sha256) || []) this.scene.remove(repeat);
    this._repeats.delete(sha256);
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.parts.delete(sha256);
    this.requestRender();
  }

  // Part show/hide (handoff annotate_deep_link_and_part_filter, deliverable
  // 2): three.js skips an invisible object when rendering, and pick() skips
  // one when raycasting (three.js itself does not), so "hide" needs nothing
  // beyond the object's own `.visible` --
  // no removal, no geometry disposal, so a re-`show` is instant. A part's
  // bound-face marks follow its visibility for free -- they are children of
  // the occurrence they sit on -- and so does every repeat, here.
  //
  // The PART's flag. One occurrence on its own is setOccurrencesVisible's,
  // and the two are kept apart (see `shown` / `hiddenKeys` in loadPart), so
  // showing a part never re-shows an occurrence a body checkbox hid.
  setVisible(sha256, visible) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return false;
    if (mesh.userData.shown === !!visible) return true;
    mesh.userData.shown = !!visible;
    this._applyVisibility(sha256);
    this.requestRender();
    return true;
  }

  // Hide or show SOME occurrences of a part, by their recorded keys (handoff
  // the_rail_and_the_scene_point_at_each_other, deliverable 3): a body's
  // checkbox hides the one pitch arm blade 1 carries and leaves the four the
  // run does not move. A key this part is not drawn at is remembered anyway,
  // so it applies the moment a sweep or a rest list draws it.
  setOccurrencesVisible(sha256, keys, visible) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return false;
    for (const key of keys || []) {
      if (visible) mesh.userData.hiddenKeys.delete(key);
      else mesh.userData.hiddenKeys.add(key);
    }
    this._applyVisibility(sha256);
    this.requestRender();
    return true;
  }

  // Is this occurrence drawn? The part shown and the key not hidden.
  isOccurrenceVisible(sha256, key) {
    const mesh = this.parts.get(sha256);
    return !!mesh && mesh.userData.shown && !mesh.userData.hiddenKeys.has(key);
  }

  // Every drawn node's key, in draw order -- the read side a test uses to
  // see which occurrence is which rather than trust it.
  drawnOccurrenceKeys(sha256) {
    return this._occurrenceNodes(sha256).map((node) => node.userData.key);
  }

  _applyVisibility(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    const shown = mesh.userData.shown;
    const hidden = mesh.userData.hiddenKeys;
    for (const node of this._occurrenceNodes(sha256)) {
      node.visible = shown && !(node.userData.key != null && hidden.has(node.userData.key));
    }
  }

  // --- where a part is drawn (handoff parts_sit_where_the_assembly_puts_them)
  //
  // ONE rule for the whole app: a part is drawn at every placement in its
  // list -- a sweep's override while one is live, otherwise its rest
  // placements (where the assembly puts it), otherwise its own origin. The
  // first placement drives the loaded mesh itself; the rest get lightweight
  // repeats sharing its geometry AND its material, so a second occurrence
  // costs a matrix and a draw call rather than a second copy of the buffers.

  // Where the assembly puts a part, replacing whatever was recorded before.
  // null is "nothing records a position": its own origin.
  setRestPlacements(sha256, placements, keys) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return false;
    const list = normalisePlacements(placements);
    mesh.userData.rest = list;
    mesh.userData.restKeys = list ? keys || null : null;
    this._drawAt(sha256);
    return true;
  }

  // How many occurrences of a part are drawn right now, and where -- the
  // read side, for the app's notes and for a test that wants to see the
  // rule rather than trust it.
  drawnPlacements(sha256) {
    return this._occurrenceNodes(sha256).map((node) => node.matrix.elements.slice());
  }

  _occurrenceNodes(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return [];
    return [mesh].concat(this._repeats.get(sha256) || []);
  }

  _drawAt(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    const list = mesh.userData.override || mesh.userData.rest || [OWN_ORIGIN];
    const keys = (mesh.userData.override ? mesh.userData.overrideKeys
      : (mesh.userData.rest ? mesh.userData.restKeys : null)) || [];
    applyPlacement4(mesh, list[0]);
    mesh.userData.key = keys[0] == null ? null : keys[0];
    this._setRepeats(sha256, mesh, list.slice(1), keys.slice(1));
    this._applyVisibility(sha256);
    this.requestRender();
  }

  // The second and later occurrences of one mesh. Kept IN STEP with the list
  // rather than rebuilt from it: a playing sweep calls this sixty times a
  // second, and allocating a THREE.Mesh per frame is the one thing here that
  // would show up as a frame rate.
  _setRepeats(sha256, mesh, placements, keys) {
    const mine = this._repeats.get(sha256) || [];
    const before = mine.length;
    while (mine.length > placements.length) {
      // Geometry and material are the parent's own -- removing is the whole
      // of the cleanup, and disposing either would take the real part's down.
      this.scene.remove(mine.pop());
    }
    while (mine.length < placements.length) {
      const repeat = new THREE.Mesh(mesh.geometry, mesh.material);
      repeat.matrixAutoUpdate = false;
      // Enough of the part's own userData for a pick on THIS occurrence to
      // resolve to the part's (sha256, face id) -- the same answer a pick on
      // the part itself gives, because a binding is part-local.
      repeat.userData = {
        sha256, manifest: mesh.userData.manifest,
        faceIdPerTriangle: mesh.userData.faceIdPerTriangle,
        occurrence: mine.length + 1,
      };
      this.scene.add(repeat);
      mine.push(repeat);
    }
    placements.forEach((placement, i) => {
      mine[i].userData.key = keys && keys[i] != null ? keys[i] : null;
      applyPlacement4(mine[i], placement);
    });
    this._repeats.set(sha256, mine);
    if (mine.length !== before) {
      this._syncMarks(sha256);
      this._syncHover(sha256);
    }
  }

  // Ghost rendering (handoff study_3d_flyout): the whole part goes translucent
  // so the opaque bound-face marks trace the chain over it. depthWrite stays
  // off while ghosted so the marks (and other parts) show through cleanly.
  setGhost(sha256, on) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return false;
    mesh.material.transparent = !!on;
    mesh.material.opacity = on ? GHOST_OPACITY : 1;
    mesh.material.depthWrite = !on;
    mesh.material.needsUpdate = true;
    this.requestRender();
    return true;
  }

  isGhosted(sha256) {
    const mesh = this.parts.get(sha256);
    return !!(mesh && mesh.material.transparent);
  }

  // An opaque overlay over ONE face -- the `mark-face` verb's whole render.
  // The geometry is a COPY (AA.faceSubGeometry's own comment says why sharing
  // the parent's BufferAttributes is unsafe), drawn as a CHILD of every
  // occurrence of the part, so it goes wherever the part is drawn -- placed,
  // swept or hidden -- with nothing to keep in step. polygonOffset pulls the
  // overlay a hair toward the camera so the parent's own coplanar surface
  // never z-fights it. Not in `this.parts` and never raycast (pick() does not
  // recurse), so picks pass through to the part.
  markFace(sha256, faceId, role) {
    const parent = this.parts.get(sha256);
    if (!parent) return false;
    const which = role || DEFAULT_MARK_ROLE;
    if (!Object.prototype.hasOwnProperty.call(MARK_COLORS, which)) {
      throw new Error("unknown mark role \"" + which + "\" -- known: " +
        Object.keys(MARK_COLORS).join(", "));
    }
    for (const m of this._marks) {
      if (m.sha256 === sha256 && m.faceId === faceId && m.role === which) return true;
    }
    const AA = window.AnnotateApp;
    const range = parent.userData.faceRanges[faceId];
    if (!range) return false;
    const sub = AA.faceSubGeometry(
      parent.geometry.attributes.position.array,
      parent.geometry.index.array,
      parent.userData.faceIdPerTriangle,
      range, faceId);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(
      sub.positions instanceof Float32Array ? sub.positions : new Float32Array(sub.positions), 3));
    geometry.setIndex(sub.indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: MARK_COLORS[which], side: THREE.DoubleSide, roughness: 0.5, metalness: 0.05,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const mark = { sha256, faceId, role: which, geometry, material, meshes: [] };
    this._marks.push(mark);
    this._syncMarks(sha256);
    this.requestRender();
    return true;
  }

  // One overlay mesh per drawn occurrence, for every mark on this part.
  // Called when a mark is made and when the occurrence COUNT changes -- never
  // per frame, because a mark is a child of its occurrence and moves with it.
  _syncMarks(sha256) {
    const nodes = this._occurrenceNodes(sha256);
    for (const mark of this._marks) {
      if (mark.sha256 !== sha256) continue;
      for (const old of mark.meshes) if (old.parent) old.parent.remove(old);
      mark.meshes = nodes.map((node) => {
        const overlay = new THREE.Mesh(mark.geometry, mark.material);
        node.add(overlay);
        return overlay;
      });
    }
  }

  listMarks(role) {
    return this._marks
      .filter((m) => !role || m.role === role)
      .map((m) => ({ sha256: m.sha256, faceId: m.faceId, role: m.role }));
  }

  // With no argument this clears EVERY overlay, which is what `trace` has
  // always wanted. With a role it clears just that layer -- the suggestion
  // overlays are repainted on every element change and must not take the
  // bound-face marks down with them.
  clearMarks(role) {
    this._disposeMarks((m) => !role || m.role === role);
  }

  _disposeMarks(predicate) {
    const keep = [];
    for (const m of this._marks) {
      if (!predicate(m)) { keep.push(m); continue; }
      for (const overlay of m.meshes) if (overlay.parent) overlay.parent.remove(overlay);
      m.geometry.dispose();
      m.material.dispose();
    }
    this._marks = keep;
    this.requestRender();
  }

  isVisible(sha256) {
    const mesh = this.parts.get(sha256);
    return !!(mesh && mesh.userData.shown);
  }

  listOpenParts() {
    return Array.from(this.parts.keys());
  }

  // A face's manifest record (area_native2/centroid_native), the same shape
  // `pick()` returns -- the command layer's `select-face` needs this to build
  // a pick with no raycast involved.
  faceRecord(sha256, faceId) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return null;
    return mesh.userData.manifest.faces[faceId] || null;
  }

  // Frames the given parts (sha256s), or every loaded part when omitted --
  // the `camera` command's `reset`/`frame` verbs and every `loadPart` call
  // share this one camera placement, so "camera reset" and "just opened a
  // part" behave identically. The box is in the ASSEMBLY frame, over every
  // drawn occurrence: framing the tangential link frames all three of them.
  frameParts(shas) {
    const targets = (shas && shas.length ? shas : Array.from(this.parts.keys()))
      .filter((sha) => this.parts.has(sha));
    if (!targets.length) return;
    const overall = new THREE.Box3();
    for (const sha of targets) overall.union(this._assemblyBox(sha));
    const center = overall.getCenter(new THREE.Vector3());
    const size = overall.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.5 + 50;
    this.camera.position.copy(center)
      .addScaledVector(UP_AXIS, size.dot(UP_AXIS) * 0.3)
      .addScaledVector(BACK_AXIS, dist);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
    this.requestRender();
  }

  // One part's drawn occurrences, as one box in the assembly frame.
  _assemblyBox(sha256) {
    const mesh = this.parts.get(sha256);
    const box = new THREE.Box3();
    for (const node of this._occurrenceNodes(sha256)) {
      box.union(mesh.geometry.boundingBox.clone().applyMatrix4(node.matrix));
    }
    return box;
  }

  // THE PICK RULE, now that a part is drawn more than once: the nearest hit
  // along the ray wins, on whichever occurrence it lands, and it resolves to
  // the PART's (sha256, face id) -- read off the hit triangle, which is the
  // same triangle in the part's own buffers whatever matrix drew it. A
  // binding is part-local (`feature-identity/v0` is unchanged), so a face
  // picked on the tangential link's third occurrence is the same face a pick
  // on its first would bind. `occurrence` says which drawn node was hit, for
  // a reader of the pick; nothing writes it.
  pick(ndcX, ndcY) {
    // The raycaster reads `matrixWorld`, which three.js refreshes only when
    // it renders -- and a placement set since the last frame (a part just
    // opened into the assembly, a sweep scrubbed) has moved the MATRIX and
    // not yet the world matrix. A pick then would hit where the part was.
    this.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    // VISIBLE nodes only. three.js's raycaster tests an object's layers and
    // never its `.visible`, so a hidden part used to be pickable -- harmless
    // while parts sat in a row, and not now: hidden or not, a part drawn in
    // the assembly sits in front of the one a reader is aiming at.
    // One occurrence hidden on its own (a body's checkbox) is not pickable
    // either, so the node's own flag is the test.
    const meshes = [];
    for (const [sha256] of this.parts) {
      for (const node of this._occurrenceNodes(sha256)) if (node.visible) meshes.push(node);
    }
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const faceId = hit.object.userData.faceIdPerTriangle[hit.faceIndex];
    return {
      sha256: hit.object.userData.sha256,
      faceId,
      record: hit.object.userData.manifest.faces[faceId],
      occurrence: hit.object.userData.occurrence || 0,
      // The recorded occurrence it landed on (null where none is named):
      // how a pick finds its body in the sweep rail.
      key: hit.object.userData.key == null ? null : hit.object.userData.key,
    };
  }

  restoreColors(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    const attr = mesh.geometry.attributes.color;
    attr.array.set(mesh.userData.baseColors);
    attr.needsUpdate = true;
    this.requestRender();
  }

  // Put the highlighted face back to its own colours, and forget it -- the
  // missing half of highlightFace (flyout_resize_annotator_filter_and_deselect,
  // deliverable 3). `restoreColors` existed but was reachable only from INSIDE
  // highlightFace, on its way to tinting the next face, so no caller could ever
  // arrive at "nothing is picked": a click into empty space cleared
  // `state.currentPick` and left the orange exactly where it was.
  //
  // Returns what was cleared (or null), so a caller can tell an undo that did
  // something from one that had nothing to undo. Clearing nothing is not an
  // error: this is the undo of a mis-click.
  clearHighlight() {
    for (const sha of this._tintedShas || []) this.restoreColors(sha);
    this._tintedShas = [];
    const last = this._lastPick;
    if (!last) return null;
    this.restoreColors(last.sha256);
    this._lastPick = null;
    return last;
  }

  // Which face carries the pick tint right now, or null. Read-only; the app
  // keeps its own `state.currentPick`, and this is how a test (and the
  // ?autotest=1 path) can check that the two agree instead of trusting that
  // they do.
  highlightedFace() {
    return this._lastPick ? { sha256: this._lastPick.sha256, faceId: this._lastPick.faceId } : null;
  }

  // SEVERAL faces in the pick tint at once -- the sweep rail's selected
  // contributor, whose feature may be a length with a face at each end. It
  // shares the colour buffer with highlightFace, so it takes down whatever
  // either one tinted before; the first face stands as `_lastPick` so
  // clearHighlight() and highlightedFace() keep meaning what they mean. An
  // empty list is clearHighlight().
  highlightFaces(faces) {
    for (const sha of this._tintedShas || []) this.restoreColors(sha);
    this._tintedShas = [];
    if (this._lastPick) this.restoreColors(this._lastPick.sha256);
    this._lastPick = null;
    for (const face of faces || []) {
      const mesh = this.parts.get(face.sha256);
      const range = mesh && mesh.userData.faceRanges[face.faceId];
      if (!range) continue;
      const attr = mesh.geometry.attributes.color;
      for (let i = range.start; i < range.start + range.count; i++) {
        attr.setXYZ(i, HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
      }
      attr.needsUpdate = true;
      this.requestRender();
      this._tintedShas.push(face.sha256);
      if (!this._lastPick) this._lastPick = { sha256: face.sha256, faceId: face.faceId };
    }
    return this._tintedShas.length;
  }

  highlightFace(sha256, faceId) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    for (const sha of this._tintedShas || []) this.restoreColors(sha);
    this._tintedShas = [];
    if (this._lastPick) this.restoreColors(this._lastPick.sha256);
    const attr = mesh.geometry.attributes.color;
    const range = mesh.userData.faceRanges[faceId];
    for (let i = range.start; i < range.start + range.count; i++) {
      attr.setXYZ(i, HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
    }
    attr.needsUpdate = true;
    this._lastPick = { sha256, faceId };
    this.requestRender();
  }

  // --- hover (handoff the_rail_and_the_scene_point_at_each_other) ------------
  //
  // What a sweep-rail row lights while the pointer rests on it, in ONE tint
  // (HOVER_COLOR), as overlays: a whole part at the occurrences named, a
  // face on every occurrence of its part (a binding is part-local), and a
  // joint's bead a little larger. `spec` is {occurrences: [{sha256, key}],
  // faces: [{sha256, faceId}], joint}; a key of null is every occurrence of
  // that part. Replaces whatever was hovered; `clearHover()` takes it all
  // down. Never touches the colour buffer, so the pick and an inspected
  // contributor keep their tint through any number of hovers.
  setHover(spec) {
    this._disposeHover();
    const s = spec || {};
    this._hover = {
      occurrences: (s.occurrences || []).slice(),
      faces: (s.faces || []).slice(),
      joint: s.joint || null,
      meshes: [],
      geometries: [],
    };
    if (!this._hoverMaterial) {
      this._hoverMaterial = new THREE.MeshBasicMaterial({
        color: HOVER_COLOR, transparent: true, opacity: HOVER_OPACITY,
        depthWrite: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
    }
    for (const sha of new Set(this._hover.occurrences.map((o) => o.sha256)
      .concat(this._hover.faces.map((f) => f.sha256)))) this._syncHover(sha);
    if (this._sweep) {
      this._sweep.hoverJoint = this._hover.joint;
      this.setSweepEmphasis(this._sweep.emphasis || null);
    }
    this.requestRender();
    return this.hoverState();
  }

  clearHover() { return this.setHover(null); }

  // What is hovered right now, as counts of what is DRAWN for it: a harness
  // reads this rather than trusting that a row's mouseenter reached here.
  hoverState() {
    const h = this._hover;
    if (!h) return { occurrences: 0, faces: 0, joint: null, overlays: 0, keys: [] };
    return {
      occurrences: h.occurrences.length,
      faces: h.faces.length,
      joint: h.joint,
      overlays: h.meshes.filter((m) => m.parent).length,
      keys: h.meshes.filter((m) => m.parent && m.userData.hoverKind === "part")
        .map((m) => ({ sha256: m.userData.sha256, key: m.parent.userData.key })),
    };
  }

  // One part's hover overlays, rebuilt: called by setHover and whenever the
  // part's occurrence COUNT changes (_setRepeats), never per frame -- an
  // overlay is a child of its occurrence and moves with it.
  _syncHover(sha256) {
    const h = this._hover;
    if (!h) return;
    const mesh = this.parts.get(sha256);
    for (const old of h.meshes.filter((m) => m.userData.sha256 === sha256)) {
      if (old.parent) old.parent.remove(old);
    }
    h.meshes = h.meshes.filter((m) => m.userData.sha256 !== sha256);
    if (!mesh) return;
    const nodes = this._occurrenceNodes(sha256);
    const wanted = h.occurrences.filter((o) => o.sha256 === sha256);
    for (const node of nodes) {
      const lit = wanted.some((o) => o.key == null || o.key === node.userData.key);
      if (!lit) continue;
      const overlay = new THREE.Mesh(mesh.geometry, this._hoverMaterial);
      overlay.renderOrder = HOVER_RENDER_ORDER;
      overlay.userData = { sha256, hoverKind: "part" };
      node.add(overlay);
      h.meshes.push(overlay);
    }
    const AA = window.AnnotateApp;
    for (const face of h.faces.filter((f) => f.sha256 === sha256)) {
      const range = mesh.userData.faceRanges[face.faceId];
      if (!range) continue;
      const sub = AA.faceSubGeometry(mesh.geometry.attributes.position.array,
        mesh.geometry.index.array, mesh.userData.faceIdPerTriangle, range, face.faceId);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(
        sub.positions instanceof Float32Array ? sub.positions : new Float32Array(sub.positions), 3));
      geometry.setIndex(sub.indices);
      h.geometries.push(geometry);
      for (const node of nodes) {
        const overlay = new THREE.Mesh(geometry, this._hoverMaterial);
        overlay.renderOrder = HOVER_RENDER_ORDER + 1;
        overlay.userData = { sha256, hoverKind: "face" };
        node.add(overlay);
        h.meshes.push(overlay);
      }
    }
  }

  _disposeHover() {
    const h = this._hover;
    if (!h) return;
    for (const m of h.meshes) if (m.parent) m.parent.remove(m);
    for (const g of h.geometries) g.dispose();
    this._hover = null;
    if (this._sweep && this._sweep.hoverJoint) {
      this._sweep.hoverJoint = null;
      this.setSweepEmphasis(this._sweep.emphasis || null);
    }
  }

  // A part leaving the scene takes its share of the hover with it.
  _disposeHoverOf(sha256) {
    const h = this._hover;
    if (!h) return;
    h.occurrences = h.occurrences.filter((o) => o.sha256 !== sha256);
    h.faces = h.faces.filter((f) => f.sha256 !== sha256);
    for (const m of h.meshes.filter((x) => x.userData.sha256 === sha256)) {
      if (m.parent) m.parent.remove(m);
    }
    h.meshes = h.meshes.filter((x) => x.userData.sha256 !== sha256);
  }

  // --- the bind leader -------------------------------------------------------
  //
  // A thin line from the picked face to the face already bound at the other
  // end of the element, in the pick colour, with each end's interface name
  // beside it -- drawn BEFORE Bind, so a reader sees which end the face is
  // about to be written as while it can still be changed. `leader` is
  // AA.planBindLeader's answer, or null to take it down. Display only, like
  // everything else drawn in the assembly frame: each centroid (the
  // manifest's `centroid_native`) is put through the placement the part's
  // FIRST drawn occurrence is drawn with, and nothing here is read back into
  // a value. Drawn over everything (no depth test): the two faces of a
  // thickness are on opposite sides of the part, so a depth-tested line
  // between them would be inside it.
  setBindLeader(leader) {
    this.requestRender();
    this._disposeLeader();
    if (!leader) return false;
    const a = this._drawnCentroid(leader.picked.sha256, leader.picked.faceId);
    const b = this._drawnCentroid(leader.bound.sha256, leader.bound.faceId);
    if (!a || !b) return false;
    const group = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(
      new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z]), 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
      color: MARK_COLORS.picked, depthTest: false, transparent: true,
    }));
    line.renderOrder = LEADER_RENDER_ORDER;
    line.frustumCulled = false;
    group.add(line);
    const labels = [
      this._leaderLabel(leader.picked.label, a),
      this._leaderLabel(leader.bound.label, b),
    ];
    for (const sprite of labels) if (sprite) group.add(sprite);
    this.scene.add(group);
    this._leader = {
      group, labels, ends: [a, b],
      read: {
        picked: { faceId: leader.picked.faceId, at: [a.x, a.y, a.z], label: leader.picked.label || null },
        bound: { faceId: leader.bound.faceId, at: [b.x, b.y, b.z], label: leader.bound.label || null },
        color: line.material.color.getHexString(),
      },
    };
    this._layoutLeader();
    return true;
  }

  // Per frame, while a leader is up. Whichever end is HIGHER on screen gets
  // its label above its point and the other below its own, so two ends close
  // together never print one name over the other, whichever way the reader
  // has orbited. And each label is re-sized against the canvas as it is NOW:
  // the leader is drawn in the same render that opens the bind form, which
  // then takes height from the canvas under it. Nothing when there is no
  // leader.
  _layoutLeader() {
    const leader = this._leader;
    if (!leader) return;
    const ya = leader.ends[0].clone().project(this.camera).y;
    const yb = leader.ends[1].clone().project(this.camera).y;
    const aUp = ya >= yb;
    // sizeAttenuation off: three.js multiplies the scale by the depth, so a
    // scale of 2 tan(fov/2) fills the view's height; a label of `px` CSS px
    // fills px / (the canvas's CSS height) of that.
    const viewPx = this.renderer.domElement.clientHeight || LEADER_FALLBACK_VIEW_PX;
    const full = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    leader.labels.forEach((sprite, i) => {
      if (!sprite) return;
      const height = full * sprite.userData.px / viewPx;
      sprite.scale.set(height * sprite.userData.aspect, height, 1);
      sprite.center.set(0, (i === 0) === aUp ? 0 : 1);
    });
  }

  // The read side, for a test that wants to see the leader rather than trust
  // it: both ends where they are drawn, their labels, and the line's colour.
  bindLeader() {
    return this._leader ? JSON.parse(JSON.stringify(this._leader.read)) : null;
  }

  _disposeLeader() {
    if (!this._leader) return;
    this.scene.remove(this._leader.group);
    this._leader.group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (node.material.map) node.material.map.dispose();
        node.material.dispose();
      }
    });
    this._leader = null;
  }

  // A face's centroid where it is DRAWN: the part's own first placement, the
  // same matrix the mesh itself carries. Null for a part that is not open or
  // is hidden, or a face the manifest has no centroid for.
  _drawnCentroid(sha256, faceId) {
    const mesh = this.parts.get(sha256);
    if (!mesh || !mesh.userData.shown) return null;
    const record = mesh.userData.manifest.faces[faceId];
    const c = record && record.centroid_native;
    if (!c) return null;
    return new THREE.Vector3(c[0], c[1], c[2]).applyMatrix4(mesh.matrix);
  }

  // One name, as a screen-sized sprite anchored at `at` (its vertical anchor
  // is _layoutLeader's). Screen-sized rather than world-sized because a part
  // may be millimetres across or a metre, and the label has to read the same
  // on both.
  _leaderLabel(text, at) {
    if (!text) return null;
    const scale = 2;
    const font = (LEADER_LABEL_PX * scale) + "px system-ui, sans-serif";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const pad = 6 * scale;
    canvas.width = Math.ceil(ctx.measureText(text).width) + pad * 2;
    canvas.height = Math.ceil(LEADER_LABEL_PX * scale * 1.6);
    ctx.font = font;
    ctx.fillStyle = "rgba(27, 30, 34, 0.85)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#" + new THREE.Color(MARK_COLORS.picked).getHexString();
    ctx.textBaseline = "middle";
    ctx.fillText(text, pad, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, depthTest: false, transparent: true, sizeAttenuation: false,
    }));
    // Its size on screen is _layoutLeader's, every frame.
    sprite.userData.px = canvas.height / scale;
    sprite.userData.aspect = canvas.width / canvas.height;
    sprite.position.copy(at);
    sprite.renderOrder = LEADER_RENDER_ORDER + 1;
    sprite.userData.label = text;
    return sprite;
  }

  // --- the model layer -----------------------------------------------------
  //
  // The topology drawn on its parts (handoff the_model_is_drawn_in_the_scene):
  // a dot at every node's anchor and a line along every edge. Which point each
  // anchor is, and which body it rides, is model_layer.js's; this draws it.
  //
  // A structural line whose two ends ride one body is drawn IN that body's
  // group, at its as-modelled points, and the group carries the body's pose
  // -- so it rides the sweep with the body the way the body's mesh does. A
  // joint line (between two bodies) and every dot that is the solver's own
  // joint point live in world and are re-placed every frame.
  //
  // Lines and dots draw over the parts (depthTest off): the parts are what
  // the graph is read against, and a line hidden inside the hub it describes
  // is a line nobody reads.

  // `model` is {nodes: {id: {source, subject, point, exported}}, lines: {id:
  // {from, to, body}}}, or null to take the layer down.
  setModel(model) {
    this._disposeModel();
    this.requestRender();
    if (!model) return false;
    const root = new THREE.Group();
    root.visible = this._modelVisible !== false;
    const groups = new Map();
    const groupOf = (body) => {
      if (body === null) return root;
      if (!groups.has(body)) {
        const g = new THREE.Group();
        g.matrixAutoUpdate = false;
        root.add(g);
        groups.set(body, g);
      }
      return groups.get(body);
    };
    const dotGeometry = new THREE.SphereGeometry(MODEL_NODE_RADIUS, 12, 8);
    const dots = new Map();
    for (const [id, node] of Object.entries(model.nodes)) {
      const material = new THREE.MeshBasicMaterial({
        color: MODEL_COLORS[node.source] || MODEL_COLORS.line,
        depthTest: false, transparent: true,
      });
      const dot = new THREE.Mesh(dotGeometry, material);
      dot.renderOrder = MODEL_RENDER_ORDER + 1;
      // A world dot is re-placed per frame; a body dot sits at its
      // as-modelled point inside its body's group.
      const inBody = node.source !== "joint";
      dot.userData = { modelNode: id, inBody, exported: !!node.exported, source: node.source };
      if (inBody) dot.position.fromArray(node.point);
      groupOf(inBody ? (node.subject || "") : null).add(dot);
      dots.set(id, dot);
    }
    const lines = new Map();
    for (const [id, line] of Object.entries(model.lines)) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      if (line.body !== null) {
        positions.set(model.nodes[line.from].point, 0);
        positions.set(model.nodes[line.to].point, 3);
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const object = new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: MODEL_COLORS.line, depthTest: false, transparent: true,
      }));
      object.renderOrder = MODEL_RENDER_ORDER;
      // Its ends move every frame, so the bounding sphere three.js computed
      // once would cull it against where it used to be.
      object.frustumCulled = false;
      object.userData = { modelEdge: id, from: line.from, to: line.to, inBody: line.body !== null };
      groupOf(line.body).add(object);
      lines.set(id, object);
    }
    this.scene.add(root);
    this._model = { root, groups, dots, lines, dotGeometry, selection: null, strengths: {} };
    return true;
  }

  // One frame: {world: {node id: [x,y,z] | null}, subjects: {body: 3x4}}.
  setModelFrame(frame) {
    const model = this._model;
    if (!model) return false;
    this.requestRender();
    for (const [body, group] of model.groups) {
      const placement = frame.subjects && frame.subjects[body];
      applyPlacement4(group, placement || OWN_ORIGIN);
    }
    for (const [id, dot] of model.dots) {
      if (dot.userData.inBody) continue;
      const p = frame.world[id];
      dot.userData.live = !!p;
      if (p) dot.position.fromArray(p);
    }
    for (const [, line] of model.lines) {
      if (line.userData.inBody) continue;
      const a = frame.world[line.userData.from], b = frame.world[line.userData.to];
      line.userData.live = !!(a && b);
      if (!line.userData.live) continue;
      const attr = line.geometry.attributes.position;
      attr.array.set(a, 0);
      attr.array.set(b, 3);
      attr.needsUpdate = true;
    }
    this._applyModelStyle();
    return true;
  }

  // {strengths: {edge id: "full"|"dim"|"hidden"}, nodes: {id: true} | null
  // (the lit nodes; null is every node), hideUnlit, emphasis: edge id | null}.
  setModelStyle(style) {
    const model = this._model;
    if (!model) return false;
    model.strengths = style.strengths || {};
    model.litNodes = style.nodes || null;
    model.emphasis = style.emphasis || null;
    model.hideUnlit = !!style.hideUnlit;
    this._applyModelStyle();
    this.requestRender();
    return true;
  }

  _applyModelStyle() {
    const model = this._model;
    if (!model) return;
    const emphasisNodes = new Set();
    for (const [id, line] of model.lines) {
      const strength = model.strengths[id] || "full";
      const live = line.userData.inBody || line.userData.live;
      line.visible = !!live && strength !== "hidden";
      const on = id === model.emphasis;
      if (on) { emphasisNodes.add(line.userData.from); emphasisNodes.add(line.userData.to); }
      if (on) line.material.color.setRGB(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
      else line.material.color.setHex(MODEL_COLORS.line);
      line.material.opacity = strength === "dim" && !on ? MODEL_DIM_OPACITY : 1;
    }
    const selected = model.selection && model.selection.node;
    for (const [id, dot] of model.dots) {
      const live = dot.userData.inBody || dot.userData.live;
      const lit = !model.litNodes || model.litNodes[id];
      // An unlit node goes with its lines when the rest of the model is hidden.
      const hidden = !lit && model.hideUnlit && !emphasisNodes.has(id);
      dot.visible = !!live && !hidden;
      dot.material.opacity = lit || emphasisNodes.has(id) ? 1 : MODEL_DIM_OPACITY;
      const on = id === selected || emphasisNodes.has(id);
      dot.scale.setScalar(on ? SWEEP_EMPHASIS_SCALE : 1);
      if (id === selected) dot.material.color.setRGB(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
      else dot.material.color.setHex(MODEL_COLORS[dot.userData.source] || MODEL_COLORS.line);
    }
  }

  setModelVisible(on) {
    this._modelVisible = !!on;
    if (this._model) this._model.root.visible = !!on;
    this.requestRender();
    return true;
  }

  // What a selection shows, faintly: the section plane and the cut region a
  // section anchor was taken from, in the body's frame (so they ride with
  // it), and -- for a selected body -- its name at its anchor.
  // {node?, body?, subject, plane?: {normalAxis, at, bounds: [[lo, hi] per
  // axis]}, region?: flat segment list, label?: {text, at}} or null.
  setModelSelection(selection) {
    const model = this._model;
    if (!model) return false;
    this.requestRender();
    if (model.selection && model.selection.group) {
      const old = model.selection.group;
      old.parent.remove(old);
      old.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); }
      });
    }
    model.selection = selection ? { node: selection.node || null, body: selection.body || null } : null;
    if (selection && (selection.plane || selection.region || selection.label)) {
      const group = new THREE.Group();
      const parent = model.groups.get(selection.subject || "") || model.root;
      if (selection.plane) {
        const { normalAxis, at, bounds } = selection.plane;
        const axes = [0, 1, 2].filter((a) => a !== normalAxis);
        const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([i, j]) => {
          const p = [0, 0, 0];
          p[normalAxis] = at;
          p[axes[0]] = bounds[axes[0]][i];
          p[axes[1]] = bounds[axes[1]][j];
          return p;
        });
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(
          [0, 1, 2, 0, 2, 3].flatMap((k) => corners[k])), 3));
        const quad = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
          color: MODEL_COLORS.plane, transparent: true, opacity: MODEL_PLANE_OPACITY,
          side: THREE.DoubleSide, depthWrite: false, depthTest: false,
        }));
        quad.renderOrder = MODEL_RENDER_ORDER - 1;
        quad.userData.modelPlane = true;
        group.add(quad);
      }
      if (selection.region && selection.region.length) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position",
          new THREE.BufferAttribute(new Float32Array(selection.region), 3));
        const outline = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({
          color: MODEL_COLORS.region, depthTest: false, transparent: true, opacity: 0.8,
        }));
        outline.renderOrder = MODEL_RENDER_ORDER;
        outline.frustumCulled = false;
        outline.userData.modelRegion = true;
        group.add(outline);
      }
      if (selection.label) {
        const sprite = this._leaderLabel(selection.label.text,
          new THREE.Vector3().fromArray(selection.label.at));
        if (sprite) {
          sprite.center.set(0, 0);
          sprite.userData.modelLabel = selection.label.text;
          group.add(sprite);
          model.selection.labelSprite = sprite;
          this._sizeLabel(sprite);
        }
      }
      parent.add(group);
      model.selection.group = group;
    }
    this._applyModelStyle();
    return true;
  }

  // The read side, for a test: what is drawn, where, and how strongly.
  modelState() {
    const model = this._model;
    if (!model) return null;
    this.scene.updateMatrixWorld();
    const world = (o) => o.getWorldPosition(new THREE.Vector3()).toArray();
    const nodes = {};
    for (const [id, dot] of model.dots) {
      nodes[id] = { at: world(dot), visible: dot.visible, opacity: dot.material.opacity,
        source: dot.userData.source };
    }
    const lines = {};
    for (const [id, line] of model.lines) {
      const attr = line.geometry.attributes.position.array;
      const a = new THREE.Vector3(attr[0], attr[1], attr[2]).applyMatrix4(line.matrixWorld);
      const b = new THREE.Vector3(attr[3], attr[4], attr[5]).applyMatrix4(line.matrixWorld);
      lines[id] = { ends: [a.toArray(), b.toArray()], raw: Array.from(attr),
        inBody: line.userData.inBody, visible: line.visible, opacity: line.material.opacity,
        color: line.material.color.getHexString() };
    }
    const sel = model.selection;
    return {
      visible: model.root.visible, nodes, lines,
      selection: sel ? {
        node: sel.node, body: sel.body,
        plane: !!(sel.group && sel.group.children.some((c) => c.userData.modelPlane)),
        region: !!(sel.group && sel.group.children.some((c) => c.userData.modelRegion)),
        label: sel.labelSprite ? sel.labelSprite.userData.modelLabel : null,
      } : null,
    };
  }

  // The model node whose dot is under the pointer, or null. The dots only --
  // a few dozen spheres, cheap at click rate.
  modelHit(ndcX, ndcY) {
    const model = this._model;
    if (!model || !model.root.visible) return null;
    const dots = Array.from(model.dots.values()).filter((d) => d.visible);
    if (!dots.length) return null;
    this.scene.updateMatrixWorld();
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(dots, false);
    return hits.length ? hits[0].object.userData.modelNode : null;
  }

  // Every exported node's dot in CSS pixels of the canvas, or null when it is
  // behind the camera, outside the view, hidden, or has no anchor geometry.
  modelScreenPoints() {
    const model = this._model;
    if (!model || !model.root.visible) return null;
    this.scene.updateMatrixWorld();
    this.camera.updateMatrixWorld();
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const out = {};
    const v = new THREE.Vector3();
    for (const [id, dot] of model.dots) {
      if (!dot.userData.exported || !dot.visible) { out[id] = null; continue; }
      dot.getWorldPosition(v).project(this.camera);
      if (v.z < -1 || v.z > 1 || v.x < -1 || v.x > 1 || v.y < -1 || v.y > 1) { out[id] = null; continue; }
      out[id] = [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
    }
    return out;
  }

  // A screen-sized label's scale for the canvas as it is now -- the same
  // arithmetic _layoutLeader applies to the bind leader's two labels.
  _sizeLabel(sprite) {
    const viewPx = this.renderer.domElement.clientHeight || LEADER_FALLBACK_VIEW_PX;
    const full = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const height = full * sprite.userData.px / viewPx;
    sprite.scale.set(height * sprite.userData.aspect, height, 1);
  }

  _disposeModel() {
    const model = this._model;
    if (!model) return;
    this.scene.remove(model.root);
    model.root.traverse((node) => {
      if (node.geometry && node.geometry !== model.dotGeometry) node.geometry.dispose();
      if (node.material) { if (node.material.map) node.material.map.dispose(); node.material.dispose(); }
    });
    model.dotGeometry.dispose();
    this._model = null;
  }

  // --- sweep mode ----------------------------------------------------------
  //
  // One overlay group holding the stick figure, plus the ability to OVERRIDE
  // a loaded part's placements for the length of the sweep. Nothing here
  // picks, marks or writes: sweep mode is a viewer of a solver's output, and
  // the app's one write path is not reachable from any of it.
  //
  // Parts are NOT reparented into per-body groups. A sweep sets a part's
  // `override` list and nothing else, because that is the one change that is
  // exactly undoable: `exitSweep` clears every override and the part is back
  // at its rest placements -- where the assembly puts it, the same rule as
  // before the sweep. "Leaving sweep mode restores the scene exactly" is a
  // requirement, and this is the version of it with one thing to get right.

  // `structure` is AA.sweepStructure's output plus `trails`.
  enterSweep(structure) {
    if (this._sweep) this.exitSweep();
    const group = new THREE.Group();
    const joints = new Map();
    const triads = new Map();
    const links = new Map();
    const trails = new Map();

    for (const joint of structure.joints) {
      const material = new THREE.MeshStandardMaterial({
        color: SWEEP_COLORS[joint.kind] || SWEEP_COLORS.point,
        roughness: 0.4, metalness: 0.1,
      });
      const bead = new THREE.Mesh(
        new THREE.SphereGeometry(SWEEP_JOINT_RADIUS, 20, 14), material);
      bead.userData = { sweepJoint: joint.name, kind: joint.kind, baseColor: material.color.clone() };
      group.add(bead);
      joints.set(joint.name, bead);
    }

    // One line per distance-constraint member, between its own two ends.
    for (const link of structure.links) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position",
        new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geometry,
        new THREE.LineBasicMaterial({ color: SWEEP_COLORS.link }));
      // A line between two moving ends has no meaningful bounding sphere, and
      // three.js would frustum-cull it against the stale one it computed once.
      line.frustumCulled = false;
      group.add(line);
      links.set(link.joint, line);
    }

    for (const body of structure.bodies) {
      const triad = this._buildTriad(group, body.ground);
      // Where this body's frame is DRAWN: the as-modelled centroid of the
      // joints AA.sweepBodyJoints measured as riding on it (see there). A
      // body with no anchor has no honest place to put a triad, so it has
      // none -- the alternative is three of them stacked at the assembly
      // origin saying nothing.
      triad.userData = { anchor: body.anchor || null, live: !!body.anchor };
      triad.visible = !!body.anchor;
      triads.set(body.name, triad);
    }

    // The trail layer: one static polyline per joint, over the WHOLE sweep.
    // Built once because it never changes -- it is the shape of the motion,
    // not a state of it.
    const trailGroup = new THREE.Group();
    trailGroup.visible = false;
    for (const name of Object.keys(structure.trails || {})) {
      const path = structure.trails[name];
      if (!path || path.length < 2) continue;
      const positions = new Float32Array(path.length * 3);
      path.forEach((p, i) => {
        positions[i * 3] = p[0]; positions[i * 3 + 1] = p[1]; positions[i * 3 + 2] = p[2];
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const line = new THREE.Line(geometry,
        new THREE.LineBasicMaterial({ color: SWEEP_COLORS.trail }));
      trailGroup.add(line);
      trails.set(name, line);
    }
    group.add(trailGroup);

    const pathBox = new THREE.Box3();
    for (const name of Object.keys(structure.trails || {})) {
      for (const p of structure.trails[name]) {
        pathBox.expandByPoint(new THREE.Vector3(p[0], p[1], p[2]));
      }
    }
    this.scene.add(group);
    this.requestRender();
    this._sweep = {
      group, joints, links, triads, trails, trailGroup, pathBox,
      // sha256 -> its translucent as-modelled copies (the `ghost` layer).
      ghosts: new Map(),
    };
    return true;
  }

  _buildTriad(parent, ground) {
    const group = new THREE.Group();
    for (let axis = 0; axis < 3; axis++) {
      const positions = new Float32Array(6);
      positions[3 + axis] = SWEEP_TRIAD_LENGTH;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({
        color: ground ? SWEEP_COLORS.ground : SWEEP_TRIAD_COLORS[axis],
      })));
    }
    parent.add(group);
    return group;
  }

  inSweep() { return !!this._sweep; }

  // The one joint the sweep rail has selected, drawn larger and in the pick
  // tint until it is let go (null). The bead keeps its own colour logic in
  // setSweepFrame -- this only scales it and overrides the colour while it is
  // the selected one -- so a non-converged frame still reads as one.
  setSweepEmphasis(jointName) {
    if (!this._sweep) return false;
    this._sweep.emphasis = jointName || null;
    this.requestRender();
    for (const [name, bead] of this._sweep.joints) {
      const on = name === this._sweep.emphasis;
      bead.scale.setScalar(on ? SWEEP_EMPHASIS_SCALE
        : (name === this._sweep.hoverJoint ? SWEEP_HOVER_SCALE : 1));
      if (on) bead.material.color.setRGB(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
      else if (!this._sweep.warned) bead.material.color.copy(bead.userData.baseColor);
    }
    return true;
  }

  sweepEmphasis() { return this._sweep ? this._sweep.emphasis || null : null; }

  // Which joint bead is under the pointer, or null. Read-only.
  sweepHover(ndcX, ndcY) {
    if (!this._sweep) return null;
    const beads = Array.from(this._sweep.joints.values()).filter((b) => b.visible);
    if (!beads.length) return null;
    this.scene.updateMatrixWorld(); // see pick(): a scrub moves beads between frames
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hits = this.raycaster.intersectObjects(beads, false);
    if (!hits.length) return null;
    const bead = hits[0].object;
    return { name: bead.userData.sweepJoint, kind: bead.userData.kind };
  }

  // Overrides one loaded part's placements with a LIST of 3x4 row-major
  // placements for this frame of the sweep (AA.sweepMeshMatrices' output),
  // or hands it back to its rest placements with `null`. Reachable only while
  // `this._sweep` is live, and every override is cleared when it ends.
  //
  // A LIST because one part legitimately occurs more than once: the pitch
  // link carries two spherical bearings, one at each end, both the same
  // installed mesh -- and a pitch arm moved by the run at blade 1 still has
  // four more occurrences the run does not move.
  //
  // `keys` names each placement's recorded occurrence, index for index, so
  // an occurrence hidden or hovered by its key stays that one occurrence
  // whichever list is drawn.
  setPartMatrix(sha256, placements, keys) {
    const mesh = this.parts.get(sha256);
    if (!mesh || !this._sweep) return false;
    mesh.userData.override = normalisePlacements(placements);
    mesh.userData.overrideKeys = mesh.userData.override ? keys || null : null;
    this._drawAt(sha256);
    this.requestRender();
    return true;
  }

  // A translucent copy of an anchored part at its as-modelled placement --
  // the `ghost` layer, which is what makes "how far has this moved" a thing
  // a reader can see rather than compute.
  setSweepGhost(sha256, placements) {
    if (!this._sweep) return false;
    this.requestRender();
    const list = normalisePlacements(placements);
    for (const old of this._sweep.ghosts.get(sha256) || []) {
      this.scene.remove(old);
      // The MATERIAL only: a ghost shares its part's BufferGeometry rather
      // than copying it (a 286-solid hub twice over is not a thing to do for
      // a translucent outline), so disposing it here would take the real
      // part's buffers down with it.
      old.material.dispose();
    }
    this._sweep.ghosts.delete(sha256);
    if (!list) return true;
    const parent = this.parts.get(sha256);
    if (!parent) return false;
    const made = [];
    for (const placement of list) {
      const ghost = new THREE.Mesh(parent.geometry, new THREE.MeshStandardMaterial({
        color: 0xffffff, transparent: true, opacity: SWEEP_GHOST_OPACITY,
        depthWrite: false, side: THREE.DoubleSide, roughness: 0.9,
      }));
      ghost.matrixAutoUpdate = false;
      applyPlacement4(ghost, placement);
      this.scene.add(ghost);
      made.push(ghost);
    }
    this._sweep.ghosts.set(sha256, made);
    return true;
  }

  // One frame of the stick figure. `frame` is AA.sweepFrameAt's output;
  // `converged` is the nearer point's own flag, and it recolours EVERY bead
  // rather than adding a badge somewhere -- a solver that did not converge
  // did not converge about this whole configuration, not about one joint.
  setSweepFrame(frame, converged) {
    if (!this._sweep) return false;
    const { joints, links, triads } = this._sweep;
    this._sweep.warned = converged === false;
    this.requestRender();
    const stick = this._sweep.stickVisible !== false;

    for (const [name, bead] of joints) {
      const joint = frame.joints[name];
      bead.userData.live = !!(joint && joint.point_a_world);
      if (!bead.userData.live) { bead.visible = false; continue; }
      bead.visible = stick;
      bead.position.fromArray(joint.point_a_world);
      if (name === this._sweep.emphasis) {
        bead.material.color.setRGB(HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
      } else {
        bead.material.color.set(converged === false
          ? SWEEP_COLORS.warn
          : bead.userData.baseColor);
      }
    }

    for (const [name, line] of links) {
      const joint = frame.joints[name];
      line.userData.live = !!(joint && joint.point_a_world && joint.point_b_world);
      if (!line.userData.live) { line.visible = false; continue; }
      line.visible = stick;
      const attr = line.geometry.attributes.position;
      attr.array.set(joint.point_a_world, 0);
      attr.array.set(joint.point_b_world, 3);
      attr.needsUpdate = true;
    }

    // A body's triad sits at the centroid of the joint points its own pose
    // carries, and turns with that pose. A triad at the pose's own origin
    // would be at the assembly origin for every body at once, which says
    // nothing; this one is where the body IS.
    for (const [name, triad] of triads) {
      const pose = frame.poses[name];
      const anchor = triad.userData.anchor;
      triad.userData.live = !!(pose && anchor);
      if (!triad.userData.live) { triad.visible = false; continue; }
      triad.visible = stick;
      triad.quaternion.fromArray(pose.quaternion);
      // The anchor is an as-modelled point, so it goes through the pose the
      // same way every other point does: p = R a + t.
      triad.position.set(anchor[0], anchor[1], anchor[2])
        .applyQuaternion(triad.quaternion)
        .add(new THREE.Vector3().fromArray(pose.translation));
    }
    return true;
  }

  // Which layers are drawn. `stick` covers the beads, the link lines and the
  // body triads -- they are one reading of the mechanism, and a reader who
  // turns the stick figure off wants the bodies on their own.
  setSweepLayer(name, on) {
    if (!this._sweep) return false;
    this.requestRender();
    if (name === "trail") { this._sweep.trailGroup.visible = !!on; return true; }
    if (name === "stick") {
      // `.visible`, not `.layers`: a Group's layer mask does not reach its
      // children (three.js tests each object's own mask), and a triad IS a
      // group of three lines.
      this._sweep.stickVisible = !!on;
      for (const [, bead] of this._sweep.joints) bead.visible = !!on && bead.userData.live !== false;
      for (const [, line] of this._sweep.links) line.visible = !!on && line.userData.live !== false;
      for (const [, triad] of this._sweep.triads) triad.visible = !!on && triad.userData.live !== false;
      return true;
    }
    return false;
  }

  //: A body more than this many times the mechanism's own size is CONTEXT and
  //: not content, and the default view does not frame on it. The hub is about
  //: four times the swept path; blade 1 is about nine, and framing on a
  //: 1.5 m blade leaves the linkage a few pixels across. Measured against the
  //: real P1 run.
  static get SWEEP_CONTEXT_RATIO() { return 6; }

  // How long the pointer rests on the canvas before the parts under it are
  // raycast for the rail's row emphasis (onPartHover). Long enough that a
  // pointer crossing the view costs nothing; short enough to read as hover.
  static get PART_HOVER_SETTLE_MS() { return 120; }

  // Frames the camera on the swept path TOGETHER WITH the bodies anchored
  // around it, which is not the same as either on its own: the path alone put
  // the camera inside the hub, and the parts alone move out of any box drawn
  // round one frame of them.
  //
  // Called again after the bodies resolve, because that is when the scene
  // stops being a stick figure.
  frameSweepScene() {
    if (!this._sweep) return false;
    const box = this._sweep.pathBox.clone();
    if (box.isEmpty()) return false;
    const mechanism = box.getSize(new THREE.Vector3());
    const limit = Math.max(mechanism.x, mechanism.y, mechanism.z, 1) *
      AnnotateScene.SWEEP_CONTEXT_RATIO;
    // Every visible occurrence, moving or not: since 2026-10-14 the parts a
    // run does not move are drawn in place round the ones it does, and they
    // are what the mechanism is read against. One OCCURRENCE at a time, so
    // a part repeated round the hub does not inflate into a hub-sized box.
    for (const [sha256, mesh] of this.parts) {
      for (const node of this._occurrenceNodes(sha256)) {
        if (!node.visible) continue;
        const partBox = mesh.geometry.boundingBox.clone().applyMatrix4(node.matrix);
        const size = partBox.getSize(new THREE.Vector3());
        if (Math.max(size.x, size.y, size.z) > limit) continue;
        box.union(partBox);
      }
    }
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z, 1) * 1.25 + 40;
    this.camera.position.copy(centre).addScaledVector(SWEEP_VIEW_AXIS, dist);
    this.camera.lookAt(centre);
    this.controls.target.copy(centre);
    this.controls.update();
    this.requestRender();
    return true;
  }

  exitSweep() {
    if (!this._sweep) return false;
    for (const [sha256, mesh] of this.parts) {
      if (mesh.userData.override) this.setPartMatrix(sha256, null);
    }
    for (const [sha256] of Array.from(this._sweep.ghosts)) this.setSweepGhost(sha256, null);
    this.scene.remove(this._sweep.group);
    this._sweep.group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    this._sweep = null;
    this.requestRender();
    return true;
  }

  // Aims the camera at one part's own bounding-box center and raycasts
  // dead-center -- the spike's `?autotest=1` technique, for headless
  // verification with no real mouse. See this app's README for why real
  // browser click automation is not run on this machine.
  autotestPick(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return null;
    const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 2.5 + 10;
    const savedPos = this.camera.position.clone();
    const savedQuat = this.camera.quaternion.clone();
    this.camera.position.copy(center).addScaledVector(BACK_AXIS, dist);
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld(true);
    const result = this.pick(0, 0);
    this.camera.position.copy(savedPos);
    this.camera.quaternion.copy(savedQuat);
    return result;
  }
}
