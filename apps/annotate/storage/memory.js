// In-memory adapter -- ?mock=1 demo and the fast-tier tests. Modelled on
// apps/viewer/storage/memory.js's role, extended with a captured `written`
// list (there is nothing to persist a write to in memory, so a test reads
// what WOULD have been written instead) and a `writable` fixture flag, so the
// "a transport that can't write must hide the write controls" rule has
// something to exercise without a real read-only FSA grant.
(function (AA) {
  "use strict";

  function MemoryAdapter(fixtures) {
    this._state = AA.STATE.DISCONNECTED;
    this._fixtures = fixtures || {};
    this._writable = this._fixtures.writable !== false; // default true
    this.written = [];
  }

  MemoryAdapter.prototype.getState = function () { return this._state; };
  MemoryAdapter.prototype.canWrite = function () {
    return this._state === AA.STATE.READY && this._writable;
  };

  MemoryAdapter.prototype.init = async function () {
    this._state = AA.STATE.READY;
    return this._state;
  };
  MemoryAdapter.prototype.connect = MemoryAdapter.prototype.init;
  MemoryAdapter.prototype.reconnect = MemoryAdapter.prototype.init;

  MemoryAdapter.prototype.readTopologyProjection = async function () {
    return this._fixtures.topologyProjection || null;
  };
  MemoryAdapter.prototype.readFeatureIdentityProjection = async function () {
    return this._fixtures.featureIdentityProjection || null;
  };
  MemoryAdapter.prototype.listMeshes = async function () {
    var manifests = this._fixtures.meshManifests || {};
    var provenance = this._fixtures.meshProvenance || {};
    return Object.keys(manifests).map(function (sha256) {
      var p = provenance[sha256];
      return { sha256: sha256, label: p ? p.label : sha256, part_id: p ? p.part_id : null };
    });
  };

  MemoryAdapter.prototype.readMeshManifest = async function (sha256) {
    var manifests = this._fixtures.meshManifests || {};
    return manifests[sha256] || null;
  };
  MemoryAdapter.prototype.readMeshBuffer = async function (sha256, filename) {
    var byPart = (this._fixtures.meshBuffers || {})[sha256];
    return (byPart && byPart[filename]) || null;
  };

  MemoryAdapter.prototype.writeFeatureIdentityEvent = async function (filename, eventObject) {
    if (!this.canWrite()) {
      throw new Error("storage cannot write (read-only transport, or not ready)");
    }
    if (this.written.some(function (w) { return w.filename === filename; })) {
      throw new Error("feature-identity event " + filename + " already exists -- append-only, refusing to overwrite");
    }
    this.written.push({ filename: filename, event: eventObject });
  };

  AA.MemoryAdapter = MemoryAdapter;
})(window.AnnotateApp = window.AnnotateApp || {});
