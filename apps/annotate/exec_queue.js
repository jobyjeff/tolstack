// The "queue commands behind a not-yet-loaded gate" logic (flyout embedding,
// handoff study_3d_flyout), pulled out of app.js so its settle-on-failure
// behavior (handoff annotate_load_gate_settles_on_failure) is testable
// without a DOM.
//
// A queued command must not `await` a gate that only ever resolves: if
// loadAll() fails partway through, every command already queued -- and any
// that arrives before a reload -- has to fail loudly naming the load error,
// the same way the deliberate loaded-but-empty case already does via
// markLoaded(). This file is the DOM-free half of that contract; app.js owns
// the two call sites that settle the gate and the postMessage reply shape.
(function (AA) {
  "use strict";

  function ExecQueue() {
    var resolveGate, rejectGate;
    this._gate = new Promise(function (resolve, reject) {
      resolveGate = resolve;
      rejectGate = reject;
    });
    // A gate rejected before anything is queued (nothing has attached a
    // handler yet) would otherwise be an unhandled rejection -- harmless here
    // since every queued command still sees the same rejection independently.
    this._gate.catch(function () {});
    this._resolveGate = resolveGate;
    this._rejectGate = rejectGate;
    this._chain = Promise.resolve();
  }

  // The loaded-but-empty path's call: deliberate, never an error.
  ExecQueue.prototype.markLoaded = function () {
    this._resolveGate();
  };

  // Settle the gate WITH the load error, so every already-queued command (and
  // any that arrives before a reload) fails loudly naming it, instead of
  // hanging on `await` forever.
  ExecQueue.prototype.markLoadFailed = function (err) {
    this._rejectGate(err);
  };

  // Queue `run` behind the gate and behind every command queued before it, in
  // arrival order. Resolves to {ok: true, result} or {ok: false, error} --
  // never rejects, so a caller needs no try/catch of its own per command.
  ExecQueue.prototype.enqueue = function (run) {
    var gate = this._gate;
    this._chain = this._chain.then(function () {
      return gate.then(
        function () {
          return Promise.resolve().then(run).then(
            function (result) { return { ok: true, result: result }; },
            function (err) { return { ok: false, error: err }; }
          );
        },
        function (err) { return { ok: false, error: err }; }
      );
    });
    return this._chain;
  };

  AA.ExecQueue = ExecQueue;
})(window.AnnotateApp = window.AnnotateApp || {});
