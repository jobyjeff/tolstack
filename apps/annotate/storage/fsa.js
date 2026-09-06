// File System Access adapter -- the real static-local backend. Modelled on
// apps/viewer/storage/fsa.js, with the one difference that module's own
// docstring calls out: THIS app writes. The directory handle points at the
// tolstack repo root and is requested `mode: "readwrite"`, because the one
// thing this app produces -- a feature-identity event -- lands under
// data/inbox/feature-identity/ inside that same tree.
//
// Static-transport reality (the handoff's own words): a `file://` page can
// neither `fetch()` a local binary (CORS; the step_tessellation spike hit
// this first) nor write one, so this adapter is only ever reachable from a
// page served over http(s) -- see this app's README for the one-line static
// server command. `FsaAdapter.isSupported()` is what index.html asks before
// offering "Connect folder" at all; a `file://` load or a browser with no
// File System Access API falls back to the in-memory adapter's demo, exactly
// like the viewer's `?mock=1`.
//
// Classic script; browser globals are touched only inside methods, so this
// file loads harmlessly under the node vm sandbox used by run_tests.cjs.
(function (AA) {
  "use strict";

  var IDB_NAME = "tolstack-annotate";
  var IDB_STORE = "handles";
  var HANDLE_KEY = "repo-root";
  var RW = { mode: "readwrite" };

  function FsaAdapter() {
    this._state = AA.STATE.DISCONNECTED;
    this._rootHandle = null;
  }

  FsaAdapter.isSupported = function () {
    return typeof window !== "undefined" &&
      typeof window.showDirectoryPicker === "function";
  };

  FsaAdapter.prototype.getState = function () { return this._state; };
  FsaAdapter.prototype.canWrite = function () { return this._state === AA.STATE.READY; };

  FsaAdapter.prototype.init = async function () {
    this._rootHandle = await idbGet(HANDLE_KEY).catch(function () { return null; });
    if (!this._rootHandle) {
      this._state = AA.STATE.DISCONNECTED;
    } else {
      var perm = await this._rootHandle.queryPermission(RW);
      this._state = perm === "granted" ? AA.STATE.READY : AA.STATE.NEEDS_REGRANT;
    }
    return this._state;
  };

  // MUST be called from a user gesture (the "Connect folder" button click).
  FsaAdapter.prototype.connect = async function () {
    var handle = await window.showDirectoryPicker(RW);
    var perm = await handle.requestPermission(RW);
    if (perm !== "granted") {
      this._state = AA.STATE.NEEDS_REGRANT;
      throw new Error("read/write permission was not granted");
    }
    this._rootHandle = handle;
    await idbSet(HANDLE_KEY, handle).catch(function () {});
    this._state = AA.STATE.READY;
    return this._state;
  };

  FsaAdapter.prototype.reconnect = async function () {
    if (!this._rootHandle) return this.connect();
    var perm = await this._rootHandle.requestPermission(RW);
    this._state = perm === "granted" ? AA.STATE.READY : AA.STATE.NEEDS_REGRANT;
    if (this._state !== AA.STATE.READY) throw new Error("re-grant was declined");
    return this._state;
  };

  FsaAdapter.prototype.readTopologyProjection = function () {
    return this._readJson(AA.CONFIG.topologyProjection);
  };

  FsaAdapter.prototype.readFeatureIdentityProjection = function () {
    return this._readJson(AA.CONFIG.featureIdentityProjection);
  };

  FsaAdapter.prototype.listMeshes = async function () {
    AA.requireReady(this);
    var dir = await this._dir(AA.CONFIG.meshesDir, false);
    if (!dir) return [];
    var out = [];
    for await (var entry of dir.entries()) {
      var name = entry[0], handle = entry[1];
      if (handle.kind !== "directory") continue;
      var provenance = await this._readJson(AA.CONFIG.meshesDir.concat([name, "provenance.json"]));
      out.push({
        sha256: name,
        label: provenance ? provenance.label : name,
        part_id: provenance ? provenance.part_id : null,
      });
    }
    return out;
  };

  FsaAdapter.prototype.readMeshManifest = function (sha256) {
    return this._readJson(AA.CONFIG.meshesDir.concat([sha256, "manifest.json"]));
  };

  FsaAdapter.prototype.readMeshBuffer = async function (sha256, filename) {
    AA.requireReady(this);
    var handle = await this._file(AA.CONFIG.meshesDir.concat([sha256, filename]));
    if (!handle) return null;
    return (await handle.getFile()).arrayBuffer();
  };

  // Append-only: refuses to overwrite a file that already exists, the
  // schema's own invariant enforced at the one point a write can happen.
  FsaAdapter.prototype.writeFeatureIdentityEvent = async function (filename, eventObject) {
    AA.requireReady(this);
    var dir = await this._dir(AA.CONFIG.featureIdentityEventsDir, /* create */ true);
    var exists = true;
    try {
      await dir.getFileHandle(filename, { create: false });
    } catch (_) {
      exists = false;
    }
    if (exists) {
      throw new Error("feature-identity event " + filename + " already exists -- append-only, refusing to overwrite");
    }
    var fileHandle = await dir.getFileHandle(filename, { create: true });
    var writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(eventObject, null, 2) + "\n");
    await writable.close();
  };

  FsaAdapter.prototype._readJson = async function (segments) {
    AA.requireReady(this);
    var handle = await this._file(segments);
    if (!handle) return null;
    return AA.parseJson(await (await handle.getFile()).text());
  };

  // Walk from the root handle down a path; null if any segment is missing.
  FsaAdapter.prototype._file = async function (segments) {
    var parts = segments.slice();
    var leaf = parts.pop();
    var dir = await this._dir(parts, false);
    if (!dir) return null;
    try {
      return await dir.getFileHandle(leaf);
    } catch (_) {
      return null;
    }
  };

  FsaAdapter.prototype._dir = async function (segments, create) {
    var dir = this._rootHandle;
    for (var i = 0; i < segments.length; i++) {
      try {
        dir = await dir.getDirectoryHandle(segments[i], { create: !!create });
      } catch (_) {
        return null;
      }
    }
    return dir;
  };

  // --- tiny IndexedDB key/value (handles survive restart) -----------------
  // Identical to apps/viewer/storage/fsa.js's own copy -- not shared because
  // classic scripts have no import, and forking one tiny helper is cheaper
  // than inventing a load-order dependency between two independent apps.

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") { reject(new Error("no IndexedDB")); return; }
      var settled = false;
      var done = function (fn, arg) { if (!settled) { settled = true; fn(arg); } };
      var timer = setTimeout(function () { done(reject, new Error("IndexedDB open timed out")); }, 2500);
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { clearTimeout(timer); done(resolve, req.result); };
      req.onerror = function () { clearTimeout(timer); done(reject, req.error); };
      req.onblocked = function () { clearTimeout(timer); done(reject, new Error("IndexedDB blocked")); };
    });
  }

  function idbGet(key) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbSet(key, value) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  AA.FsaAdapter = FsaAdapter;
})(window.AnnotateApp = window.AnnotateApp || {});
