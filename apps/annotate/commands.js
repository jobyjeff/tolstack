// The command layer (handoff annotate_deep_link_and_part_filter, deliverable
// 1): every scene/navigation operation this app can do is a named,
// text-addressable verb dispatched through ONE registry, so the UI, the deep
// link boot sequence and `window.AnnotateApp.exec(...)` (a dev console, or a
// future vision-agent driver) are three callers of the same commands, never
// three code paths that can drift from each other.
//
// This file is the DOM-free, storage-free half: tokenizing a typed command
// string, the registry itself, and pure state-transition helpers a test can
// call with plain arrays -- no scene, no fetch. app.js registers the actual
// handlers (they close over `state`/`scene`/`storage`, which is exactly the
// impure half this file has no business holding), the same split
// binding_state.js already draws between logic and wiring.
(function (AA) {
  "use strict";

  // "verb arg1 \"arg with spaces\" arg3" -> ["verb", "arg1", "arg with spaces",
  // "arg3"]. No shell semantics beyond quoting -- this is a command line for
  // one app's own vocabulary, not a shell.
  AA.tokenizeCommand = function (input) {
    var tokens = [];
    var re = /"([^"]*)"|(\S+)/g;
    var m;
    while ((m = re.exec(String(input))) !== null) {
      tokens.push(m[1] !== undefined ? m[1] : m[2]);
    }
    return tokens;
  };

  // The single dispatch point. `register(verb, fn)` is called once per verb
  // (app.js, at boot); `exec(input)` takes either a command string or an
  // already-tokenized array (the deep-link boot path has its params as
  // separate strings already and would otherwise have to re-quote and
  // re-parse them). `fn`'s return value (a value, or a promise of one) is
  // exec's own return value -- callers await it if the verb is async, same as
  // calling the function directly would require.
  function CommandLayer() {
    this._handlers = {};
  }
  CommandLayer.prototype.register = function (verb, fn) {
    if (!verb || typeof fn !== "function") {
      throw new Error("register(verb, fn) needs a non-empty verb and a function");
    }
    this._handlers[verb] = fn;
  };
  CommandLayer.prototype.verbs = function () {
    return Object.keys(this._handlers).sort();
  };
  CommandLayer.prototype.exec = function (input) {
    var tokens = Array.isArray(input) ? input.slice() : AA.tokenizeCommand(input);
    if (!tokens.length) throw new Error("empty command");
    var verb = tokens.shift();
    var fn = this._handlers[verb];
    if (!fn) {
      throw new Error("unknown command \"" + verb + "\" -- known commands: " +
        (this.verbs().join(", ") || "(none registered)"));
    }
    return fn.apply(null, tokens);
  };
  AA.CommandLayer = CommandLayer;

  // Pure: resolve a user-typed identifier (a mesh's sha256, its
  // provenance.json `part_id`, or a topology `part` id declared in the alias
  // table) against the mesh list `storage.listMeshes()` returns. Exact match
  // only, case-sensitive (sha256 is lowercase hex, part_id is an author's own
  // slug -- guessing a case-insensitive or substring match would be exactly
  // the kind of invented leniency this repo avoids elsewhere; the strategy
  // brief behind the alias table rejected fuzzy matching outright).
  //
  // Precedence: direct sha256 match, then direct part_id match, then the
  // alias table (docs/topologies/part_mesh_aliases.json, injected by the
  // caller -- this file stays fetch-free). An alias maps a topology-side
  // `topology_part` to a mesh-side `mesh_part_id`; the mesh side of an alias
  // needs no pass of its own because a mesh_part_id typed directly IS a
  // part_id and already resolves in the direct pass. Returns null rather than
  // throwing: a boot-time deep link and a typed command need to report "not
  // found" very differently (an empty-state overlay vs. a console error), so
  // the decision belongs to the caller.
  AA.resolveMeshIdentifier = function (meshes, identifier, aliases) {
    if (!identifier) return null;
    var list = meshes || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].sha256 === identifier) return list[i];
    }
    for (var j = 0; j < list.length; j++) {
      if (list[j].part_id === identifier) return list[j];
    }
    var table = aliases || [];
    for (var k = 0; k < table.length; k++) {
      if (table[k].topology_part !== identifier) continue;
      for (var m = 0; m < list.length; m++) {
        if (list[m].part_id === table[k].mesh_part_id) return list[m];
      }
    }
    return null;
  };

  // Pure state transition for `isolate`: given the sha256s already open in
  // the scene and the sha256s that should be visible afterward, returns which
  // ones need a fresh `loadPart` (not open yet), which already-open ones to
  // show, and which already-open ones to hide. No scene, no three.js -- the
  // scene-mutating loop is three lines in app.js that just walks these three
  // arrays.
  AA.planIsolate = function (openShas, targetShas) {
    var targets = targetShas || [];
    var open = openShas || [];
    var openSet = {};
    open.forEach(function (s) { openSet[s] = true; });
    var targetSet = {};
    targets.forEach(function (s) { targetSet[s] = true; });
    return {
      toOpen: targets.filter(function (s) { return !openSet[s]; }),
      toShow: targets.filter(function (s) { return openSet[s]; }),
      toHide: open.filter(function (s) { return !targetSet[s]; }),
    };
  };
})(window.AnnotateApp = window.AnnotateApp || {});
