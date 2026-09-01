// In-memory mock adapter — drives test.html, `index.html?mock=1`, and the node
// logic tests without an FSA grant. Implements the adapter contract exactly, so
// the views cannot tell it apart from the FSA adapter.
(function (VA) {
  "use strict";

  function MemoryAdapter(opts) {
    opts = opts || {};
    this._state = opts.startState || VA.STATE.DISCONNECTED;
    this._results = opts.results || null;
    this._crops = opts.crops || null;
    this._topologies = opts.topologies || null;
    this._texts = opts.texts || {};   // "docs/tolerance_stacks/X.md" -> string
    this._images = opts.images || {}; // "crops/x.png" -> any truthy marker
  }

  MemoryAdapter.prototype.getState = function () { return this._state; };
  MemoryAdapter.prototype.init = function () { return Promise.resolve(this._state); };
  MemoryAdapter.prototype.connect = function () {
    this._state = VA.STATE.READY;
    return Promise.resolve(this._state);
  };
  MemoryAdapter.prototype.reconnect = MemoryAdapter.prototype.connect;

  MemoryAdapter.prototype.readResults = function () {
    VA.requireReady(this);
    return Promise.resolve(this._results);
  };

  MemoryAdapter.prototype.readCrops = function () {
    VA.requireReady(this);
    return Promise.resolve(this._crops);
  };

  MemoryAdapter.prototype.readTopologies = function () {
    VA.requireReady(this);
    return Promise.resolve(this._topologies);
  };

  MemoryAdapter.prototype.readCropImage = function (relPath) {
    VA.requireReady(this);
    if (!this._images[relPath]) return Promise.resolve(null);
    return Promise.resolve({ url: "blob:" + relPath, name: relPath.split("/").pop() });
  };

  MemoryAdapter.prototype.readText = function (segments) {
    VA.requireReady(this);
    var key = segments.join("/");
    return Promise.resolve(
      Object.prototype.hasOwnProperty.call(this._texts, key) ? this._texts[key] : null
    );
  };

  VA.MemoryAdapter = MemoryAdapter;
})(window.ViewerApp = window.ViewerApp || {});
