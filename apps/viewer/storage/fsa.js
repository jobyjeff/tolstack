// File System Access adapter — the real static-local backend. Persists the
// directory handle in IndexedDB; the handle points at the tolstack repo ROOT so
// both docs/tolerance_stacks/ and data/projections/viewer/ are reachable through
// it. That single grant is the whole reason the crops are pre-rendered into this
// repo: the page cannot reach C:\workspace\drawing-checker at all.
//
// READ-ONLY: every request is `mode: "read"`. The viewer has no write path, and
// asking for readwrite would be asking Jeff to trust a review surface with his
// stack JSONs for no reason.
//
// Modelled on forge apps/notes/storage/fsa.js, which is proven in Jeff's
// enterprise Chrome on file:// (2026-07-15): API present, a persisted handle
// survives restart in one-click re-grant mode (queryPermission -> "prompt",
// requestPermission needs a user gesture).
//
// Classic script; browser globals (window, indexedDB, showDirectoryPicker) are
// touched only inside methods, so loading this file under the node vm sandbox
// (which has no such globals) is harmless.
(function (VA) {
  "use strict";

  var IDB_NAME = "tolstack-viewer";
  var IDB_STORE = "handles";
  var HANDLE_KEY = "repo-root";
  var RO = { mode: "read" };

  function FsaAdapter() {
    this._state = VA.STATE.DISCONNECTED;
    this._rootHandle = null;
  }

  FsaAdapter.isSupported = function () {
    return typeof window !== "undefined" &&
      typeof window.showDirectoryPicker === "function";
  };

  FsaAdapter.prototype.getState = function () { return this._state; };

  // Probe the persisted handle on load; set state without prompting
  // (queryPermission never prompts). Handle persistence is best-effort: if IDB
  // is unavailable or slow it degrades to DISCONNECTED rather than hanging the
  // app (init() always resolves).
  FsaAdapter.prototype.init = async function () {
    this._rootHandle = await idbGet(HANDLE_KEY).catch(function () { return null; });
    if (!this._rootHandle) {
      this._state = VA.STATE.DISCONNECTED;
    } else {
      var perm = await this._rootHandle.queryPermission(RO);
      this._state = perm === "granted" ? VA.STATE.READY : VA.STATE.NEEDS_REGRANT;
    }
    return this._state;
  };

  // Show the directory picker (MUST be called from a user gesture).
  FsaAdapter.prototype.connect = async function () {
    var handle = await window.showDirectoryPicker(RO);
    var perm = await handle.requestPermission(RO);
    if (perm !== "granted") {
      this._state = VA.STATE.NEEDS_REGRANT;
      throw new Error("read permission was not granted");
    }
    this._rootHandle = handle;
    await idbSet(HANDLE_KEY, handle).catch(function () {});
    this._state = VA.STATE.READY;
    return this._state;
  };

  // Re-grant a persisted handle (MUST be called from a user gesture).
  FsaAdapter.prototype.reconnect = async function () {
    if (!this._rootHandle) return this.connect();
    var perm = await this._rootHandle.requestPermission(RO);
    this._state = perm === "granted" ? VA.STATE.READY : VA.STATE.NEEDS_REGRANT;
    if (this._state !== VA.STATE.READY) throw new Error("re-grant was declined");
    return this._state;
  };

  FsaAdapter.prototype.readResults = function () {
    return this._readJson(VA.CONFIG.projectionDir.concat(["results.json"]));
  };

  FsaAdapter.prototype.readCrops = function () {
    return this._readJson(VA.CONFIG.projectionDir.concat(["crops.json"]));
  };

  FsaAdapter.prototype.readTopologies = function () {
    return this._readJson(VA.CONFIG.projectionDir.concat(["topologies.json"]));
  };

  FsaAdapter.prototype.readCropImage = async function (relPath) {
    VA.requireReady(this);
    var segs = VA.CONFIG.projectionDir.concat(String(relPath).split("/"));
    var handle = await this._file(segs);
    if (!handle) return null;
    var blob = await handle.getFile();
    return { url: URL.createObjectURL(blob), name: segs[segs.length - 1] };
  };

  FsaAdapter.prototype.readText = async function (segments) {
    VA.requireReady(this);
    var handle = await this._file(segments);
    if (!handle) return null;
    return (await handle.getFile()).text();
  };

  FsaAdapter.prototype._readJson = async function (segments) {
    VA.requireReady(this);
    var handle = await this._file(segments);
    if (!handle) return null;
    return VA.parseJson(await (await handle.getFile()).text());
  };

  // Walk from the root handle down a path; null if any segment is missing.
  // Absence is a normal answer here — nothing the viewer reads is guaranteed to
  // have been built.
  FsaAdapter.prototype._file = async function (segments) {
    var parts = segments.slice();
    var leaf = parts.pop();
    var dir = this._rootHandle;
    for (var i = 0; i < parts.length; i++) {
      try {
        dir = await dir.getDirectoryHandle(parts[i]);
      } catch (_) {
        return null;
      }
    }
    try {
      return await dir.getFileHandle(leaf);
    } catch (_) {
      return null;
    }
  };

  // --- tiny IndexedDB key/value (handles survive restart) ----------------

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined") { reject(new Error("no IndexedDB")); return; }
      var settled = false;
      var done = function (fn, arg) { if (!settled) { settled = true; fn(arg); } };
      // Never hang the app: if IDB neither opens nor errors (some headless /
      // restricted contexts), fall back after a short timeout. Inherited from
      // the notes app, where raw headless Chrome exhibited exactly that.
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

  VA.FsaAdapter = FsaAdapter;
})(window.ViewerApp = window.ViewerApp || {});
