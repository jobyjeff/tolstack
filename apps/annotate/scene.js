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

const PART_MARGIN = 50; // native units (mm) gap between side-by-side parts
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
const DEFAULT_MARK_ROLE = "bound";

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
    this._marks = [];       // {sha256, faceId, role, mesh} -- opaque face overlays
    this._layoutX = 0;
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

    this.renderer.domElement.addEventListener("pointerdown", (ev) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const ndcX = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this.onPick(this.pick(ndcX, ndcY));
    });

    // Overridable by the app: called with {sha256, faceId, record} on a
    // successful pick, null on a miss into empty space.
    this.onPick = function () {};

    // The canvas follows its host box. Until 2026-09-21 the renderer was sized
    // ONCE, at construction, and nothing resized it -- which was survivable
    // while the host was a fixed grid cell and is not now: the top bar opens
    // and closes above it (handoff annotate_hint_bar_and_context_autofilter),
    // and in the viewer's flyout the whole panel is drag-resized. A stale
    // drawing buffer does not just look wrong, it puts the raycast's NDC
    // mapping (pointerdown, above) out of step with what is on screen, so a
    // click lands on the wrong face.
    if (typeof ResizeObserver === "function") {
      this._resizeObserver = new ResizeObserver(() => this.resize());
      this._resizeObserver.observe(hostEl);
    }

    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
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
    return true;
  }

  // Lazy-load: fetches geometry only when a part is actually opened, not the
  // whole set eagerly (spike lever #1, the DoD's own requirement).
  //
  // IDEMPOTENT UNDER CONCURRENCY, and that is not decoration. The
  // already-open check below is synchronous and `this.parts.set` happens after
  // three awaits, so two callers that both start before either finishes would
  // BOTH build a mesh: two THREE.Meshes in the scene at two different
  // `_layoutX` slots, one of them unreachable through `this.parts` and
  // therefore impossible to hide, frame or dispose. Two callers is the normal
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

    const bbox = geometry.boundingBox;
    const width = bbox.max.x - bbox.min.x;
    mesh.position.x = this._layoutX - bbox.min.x;
    this._layoutX += width + PART_MARGIN;

    mesh.userData = {
      sha256, manifest, faceIdPerTriangle,
      faceRanges: window.AnnotateApp.faceVertexRanges(manifest.faces),
      baseColors: colors.slice(),
    };
    this.scene.add(mesh);
    this.parts.set(sha256, mesh);
    // ...but NOT while a sweep is running. Sweep mode frames the whole swept
    // path (frameSweepPath) and then opens each body's part, so this call
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
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.parts.delete(sha256);
  }

  // Part show/hide (handoff annotate_deep_link_and_part_filter, deliverable
  // 2): three.js already skips an invisible object in both rendering and
  // raycasting, so "hide" needs nothing beyond the object's own `.visible` --
  // no removal, no geometry disposal, so a re-`show` is instant. A part's
  // bound-face marks follow its visibility: a mark floating where its hidden
  // part used to be would read as attached to whatever is behind it.
  setVisible(sha256, visible) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return false;
    mesh.visible = !!visible;
    for (const m of this._marks) {
      if (m.sha256 === sha256) m.mesh.visible = mesh.visible;
    }
    return true;
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
    return true;
  }

  isGhosted(sha256) {
    const mesh = this.parts.get(sha256);
    return !!(mesh && mesh.material.transparent);
  }

  // An opaque overlay over ONE face -- the `mark-face` verb's whole render.
  // The geometry is a COPY (AA.faceSubGeometry's own comment says why sharing
  // the parent's BufferAttributes is unsafe), positioned with the parent so
  // the side-by-side layout carries over. polygonOffset pulls the overlay a
  // hair toward the camera so the parent's own coplanar surface never
  // z-fights it. Not in `this.parts`, so picks pass through to the parent.
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
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(parent.position);
    mesh.visible = parent.visible;
    this.scene.add(mesh);
    this._marks.push({ sha256, faceId, role: which, mesh });
    return true;
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
      this.scene.remove(m.mesh);
      m.mesh.geometry.dispose();
      m.mesh.material.dispose();
    }
    this._marks = keep;
  }

  isVisible(sha256) {
    const mesh = this.parts.get(sha256);
    return !!(mesh && mesh.visible);
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
  // part" behave identically.
  frameParts(shas) {
    const targets = (shas && shas.length ? shas : Array.from(this.parts.keys()))
      .map((sha) => this.parts.get(sha))
      .filter(Boolean);
    if (!targets.length) return;
    const overall = new THREE.Box3();
    for (const mesh of targets) {
      overall.union(mesh.geometry.boundingBox.clone().translate(mesh.position));
    }
    const center = overall.getCenter(new THREE.Vector3());
    const size = overall.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.5 + 50;
    this.camera.position.copy(center)
      .addScaledVector(UP_AXIS, size.dot(UP_AXIS) * 0.3)
      .addScaledVector(BACK_AXIS, dist);
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
  }

  pick(ndcX, ndcY) {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const meshes = Array.from(this.parts.values());
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const hit = hits[0];
    const faceId = hit.object.userData.faceIdPerTriangle[hit.faceIndex];
    return {
      sha256: hit.object.userData.sha256,
      faceId,
      record: hit.object.userData.manifest.faces[faceId],
    };
  }

  restoreColors(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    const attr = mesh.geometry.attributes.color;
    attr.array.set(mesh.userData.baseColors);
    attr.needsUpdate = true;
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

  highlightFace(sha256, faceId) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    if (this._lastPick) this.restoreColors(this._lastPick.sha256);
    const attr = mesh.geometry.attributes.color;
    const range = mesh.userData.faceRanges[faceId];
    for (let i = range.start; i < range.start + range.count; i++) {
      attr.setXYZ(i, HIGHLIGHT[0], HIGHLIGHT[1], HIGHLIGHT[2]);
    }
    attr.needsUpdate = true;
    this._lastPick = { sha256, faceId };
  }

  // --- sweep mode ----------------------------------------------------------
  //
  // One overlay group holding the stick figure, plus the ability to drive a
  // loaded part's matrix directly instead of the side-by-side layout. Nothing
  // here picks, marks or writes: sweep mode is a viewer of a solver's output,
  // and the app's one write path is not reachable from any of it.
  //
  // Parts are NOT reparented into per-body groups. `mesh.matrix` is set
  // directly with `matrixAutoUpdate` off, because that is the one change that
  // is exactly undoable: `exitSweep` puts `matrixAutoUpdate` back and the
  // saved layout position with it, and a reparent would additionally have to
  // restore scene-graph order, the frame camera's assumptions and every
  // mark's parent. "Leaving sweep mode restores the scene exactly" is a
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

    this.scene.add(group);
    this._sweep = {
      group, joints, links, triads, trails, trailGroup,
      // Every part's layout state, so leaving restores it exactly.
      savedParts: new Map(),
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

  // Anchors one loaded part to a 3x4 row-major placement (AA.anchorPlacement's
  // output), or releases it back to its layout position with `null`. THE ONE
  // PLACE this app applies a placement matrix to a mesh -- the annotator
  // applies none outside sweep mode, which is what `CLAUDE.md` records, and
  // what makes that still true is that this is reachable only while
  // `this._sweep` is live and is undone when it ends.
  setPartMatrix(sha256, placement) {
    const mesh = this.parts.get(sha256);
    if (!mesh || !this._sweep) return false;
    if (!this._sweep.savedParts.has(sha256)) {
      this._sweep.savedParts.set(sha256,
        { position: mesh.position.clone(), auto: mesh.matrixAutoUpdate });
    }
    const followers = [mesh].concat(
      this._marks.filter((m) => m.sha256 === sha256).map((m) => m.mesh));
    for (const node of followers) {
      if (placement) {
        node.matrixAutoUpdate = false;
        // THREE.Matrix4.set takes ROW-major arguments, which is the layout
        // sweep.js speaks -- so this is a straight read, not a transpose.
        node.matrix.set(
          placement[0], placement[1], placement[2], placement[3],
          placement[4], placement[5], placement[6], placement[7],
          placement[8], placement[9], placement[10], placement[11],
          0, 0, 0, 1);
      } else {
        node.matrixAutoUpdate = true;
      }
    }
    if (!placement) {
      const saved = this._sweep.savedParts.get(sha256);
      if (saved) {
        mesh.position.copy(saved.position);
        for (const m of this._marks) {
          if (m.sha256 === sha256) m.mesh.position.copy(saved.position);
        }
      }
    }
    return true;
  }

  // A translucent copy of an anchored part at its as-modelled placement --
  // the `ghost` layer, which is what makes "how far has this moved" a thing
  // a reader can see rather than compute.
  setSweepGhost(sha256, placement) {
    if (!this._sweep) return false;
    const existing = this._sweep.ghosts.get(sha256);
    if (existing) {
      this.scene.remove(existing);
      // The MATERIAL only: a ghost shares its part's BufferGeometry rather
      // than copying it (a 286-solid hub twice over is not a thing to do for
      // a translucent outline), so disposing it here would take the real
      // part's buffers down with it.
      existing.material.dispose();
      this._sweep.ghosts.delete(sha256);
    }
    if (!placement) return true;
    const parent = this.parts.get(sha256);
    if (!parent) return false;
    const ghost = new THREE.Mesh(parent.geometry, new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: SWEEP_GHOST_OPACITY,
      depthWrite: false, side: THREE.DoubleSide, roughness: 0.9,
    }));
    ghost.matrixAutoUpdate = false;
    ghost.matrix.set(
      placement[0], placement[1], placement[2], placement[3],
      placement[4], placement[5], placement[6], placement[7],
      placement[8], placement[9], placement[10], placement[11],
      0, 0, 0, 1);
    this.scene.add(ghost);
    this._sweep.ghosts.set(sha256, ghost);
    return true;
  }

  // One frame of the stick figure. `frame` is AA.sweepFrameAt's output;
  // `converged` is the nearer point's own flag, and it recolours EVERY bead
  // rather than adding a badge somewhere -- a solver that did not converge
  // did not converge about this whole configuration, not about one joint.
  setSweepFrame(frame, converged) {
    if (!this._sweep) return false;
    const { joints, links, triads } = this._sweep;
    const stick = this._sweep.stickVisible !== false;

    for (const [name, bead] of joints) {
      const joint = frame.joints[name];
      bead.userData.live = !!(joint && joint.point_a_world);
      if (!bead.userData.live) { bead.visible = false; continue; }
      bead.visible = stick;
      bead.position.fromArray(joint.point_a_world);
      bead.material.color.set(converged === false
        ? SWEEP_COLORS.warn
        : bead.userData.baseColor);
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

  // Frames the camera on the whole swept path rather than on the parts: the
  // linkage moves out of any box drawn round one frame of it.
  frameSweepPath(trails) {
    const box = new THREE.Box3();
    let any = false;
    for (const name of Object.keys(trails || {})) {
      for (const p of trails[name]) {
        box.expandByPoint(new THREE.Vector3(p[0], p[1], p[2]));
        any = true;
      }
    }
    if (!any) return false;
    const centre = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // The LARGEST dimension of the swept path, not the smallest: a planar
    // mechanism has a zero one, and framing on that puts the camera inside
    // the linkage.
    const dist = Math.max(size.x, size.y, size.z, 1) * 1.25 + 40;
    this.camera.position.copy(centre).addScaledVector(SWEEP_VIEW_AXIS, dist);
    this.camera.lookAt(centre);
    this.controls.target.copy(centre);
    this.controls.update();
    return true;
  }

  exitSweep() {
    if (!this._sweep) return false;
    for (const [sha256] of this._sweep.savedParts) this.setPartMatrix(sha256, null);
    for (const [sha256] of Array.from(this._sweep.ghosts)) this.setSweepGhost(sha256, null);
    this.scene.remove(this._sweep.group);
    this._sweep.group.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) node.material.dispose();
    });
    this._sweep = null;
    return true;
  }

  // Aims the camera at one part's own bounding-box center and raycasts
  // dead-center -- the spike's `?autotest=1` technique, for headless
  // verification with no real mouse. See this app's README for why real
  // browser click automation is not run on this machine.
  autotestPick(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return null;
    const box = mesh.geometry.boundingBox.clone().translate(mesh.position);
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
