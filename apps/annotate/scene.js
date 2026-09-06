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

// Faces are appended in face_id order (0..N-1, dense) and each face's
// triangulation nodes occupy a contiguous run of the flat vertex buffer --
// see rotorkit/stepgeom/tessellate.py's own docstring for why a cumulative
// sum over the manifest gives each face's vertex range with no index scan.
function computeFaceVertexRanges(manifestFaces) {
  const ranges = new Array(manifestFaces.length);
  let offset = 0;
  for (const f of manifestFaces) {
    ranges[f.face_id] = { start: offset, count: f.n_vertices };
    offset += f.n_vertices;
  }
  return ranges;
}

export class AnnotateScene {
  constructor(hostEl, storage) {
    this.storage = storage;
    this.parts = new Map(); // source_step_sha256 -> THREE.Mesh
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

    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  // Lazy-load: fetches geometry only when a part is actually opened, not the
  // whole set eagerly (spike lever #1, the DoD's own requirement).
  async loadPart(sha256) {
    if (this.parts.has(sha256)) return this.parts.get(sha256);
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
      faceRanges: computeFaceVertexRanges(manifest.faces),
      baseColors: colors.slice(),
    };
    this.scene.add(mesh);
    this.parts.set(sha256, mesh);
    this._frameAll();
    return mesh;
  }

  unloadPart(sha256) {
    const mesh = this.parts.get(sha256);
    if (!mesh) return;
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    this.parts.delete(sha256);
  }

  _frameAll() {
    if (this.parts.size === 0) return;
    const overall = new THREE.Box3();
    for (const mesh of this.parts.values()) {
      overall.union(mesh.geometry.boundingBox.clone().translate(mesh.position));
    }
    const center = overall.getCenter(new THREE.Vector3());
    const size = overall.getSize(new THREE.Vector3());
    const dist = Math.max(size.x, size.y, size.z) * 1.5 + 50;
    this.camera.position.set(center.x, center.y + size.y * 0.3, center.z + dist);
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
    this.camera.position.copy(center).add(new THREE.Vector3(0, 0, dist));
    this.camera.lookAt(center);
    this.camera.updateMatrixWorld(true);
    const result = this.pick(0, 0);
    this.camera.position.copy(savedPos);
    this.camera.quaternion.copy(savedQuat);
    return result;
  }
}
