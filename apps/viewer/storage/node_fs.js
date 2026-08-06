// node-fs adapter — the same adapter contract, backed by a real repo checkout.
//
// This is what lets the fast test tier (run_tests.cjs) drive the app's logic and
// views over the ACTUAL docs/tolerance_stacks/ + data/projections/viewer/ rather
// than a hand-written fixture. A fixture proves the code runs; this proves it
// renders Jeff's real stacks, which is the only claim worth making.
//
// The vm sandbox has no `require`, so the io shim is injected by the runner:
//
//   new VA.NodeFsAdapter("C:/workspace/tolstack", {
//     readText: function (relPath) { return string | null },
//     exists:   function (relPath) { return boolean },
//   })
//
// relPath is always POSIX and repo-root-relative. Absence returns null, never
// throws — same as the FSA adapter, because "not built yet" is a normal state.
//
// Not loaded by index.html: it is test-tier only, and the browser has no fs.
(function (VA) {
  "use strict";

  function NodeFsAdapter(root, io) {
    this._root = root;
    this._io = io;
    this._state = VA.STATE.READY; // a filesystem path needs no permission grant
  }

  NodeFsAdapter.prototype.getState = function () { return this._state; };
  NodeFsAdapter.prototype.init = function () { return Promise.resolve(this._state); };
  NodeFsAdapter.prototype.connect = function () { return Promise.resolve(this._state); };
  NodeFsAdapter.prototype.reconnect = NodeFsAdapter.prototype.connect;

  NodeFsAdapter.prototype.readResults = function () {
    return Promise.resolve(
      VA.parseJson(this._io.readText(join(VA.CONFIG.projectionDir.concat(["results.json"]))))
    );
  };

  NodeFsAdapter.prototype.readCrops = function () {
    return Promise.resolve(
      VA.parseJson(this._io.readText(join(VA.CONFIG.projectionDir.concat(["crops.json"]))))
    );
  };

  // The node tier never paints pixels, so this reports presence rather than
  // decoding: a "resolved" crop whose PNG is missing is a real failure mode
  // (stale crops.json) and the tests assert on it.
  NodeFsAdapter.prototype.readCropImage = function (relPath) {
    var full = join(VA.CONFIG.projectionDir.concat(String(relPath).split("/")));
    if (!this._io.exists(full)) return Promise.resolve(null);
    return Promise.resolve({ url: "file:///" + this._root + "/" + full, name: relPath.split("/").pop() });
  };

  NodeFsAdapter.prototype.readText = function (segments) {
    return Promise.resolve(this._io.readText(join(segments)));
  };

  function join(segments) { return segments.join("/"); }

  VA.NodeFsAdapter = NodeFsAdapter;
})(window.ViewerApp = window.ViewerApp || {});
