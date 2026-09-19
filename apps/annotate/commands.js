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

  // What the command box says it accepts, built from the REGISTRY rather
  // than written down anywhere (handoff reader_facing_surfaces_second_pass,
  // 2026-09-18). The placeholder used to carry an example command naming an
  // internal module path and a backend id a reader cannot know
  // (`isolate machined_213668 (window.AnnotateApp.exec)`), which is two
  // standing web-UI rules broken on a surface that is visible at rest.
  //
  // A list read off `commands.verbs()` cannot drift from what the box takes,
  // which a hand-written example always can -- and it is the same list
  // `CommandLayer.exec` already answers an unknown command with, so a reader
  // meets one vocabulary whichever way they find it. DOM-free like the rest
  // of this file: app.js puts the string on the input.
  AA.COMMAND_HINT_PREFIX = "commands: ";
  AA.commandHint = function (verbs) {
    return AA.COMMAND_HINT_PREFIX + (verbs || []).join(", ");
  };

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

  // Pure: extract ONE face's triangles as standalone geometry data (handoff
  // study_3d_flyout, the `mark-face` verb). The overlay mesh scene.js builds
  // from this must NOT share BufferAttributes with the parent mesh -- three.js
  // deallocates a disposed geometry's attribute buffers with no reference
  // count, so a shared-attribute overlay being cleared would kill the parent's
  // geometry on the GPU. Copying one face is cheap (faces are small) and makes
  // disposal safe by construction.
  //
  // `vertexRange` is the face's contiguous vertex run ({start, count}, from
  // scene.js's computeFaceVertexRanges); indices are remapped into it. A
  // triangle of this face indexing a vertex OUTSIDE the run is a data-shape
  // violation (the tessellation contract says a face's triangulation nodes
  // occupy a contiguous run) and throws rather than drawing something wrong.
  AA.faceSubGeometry = function (positions, indices, faceIdPerTriangle, vertexRange, faceId) {
    var outIndices = [];
    for (var t = 0; t < faceIdPerTriangle.length; t++) {
      if (faceIdPerTriangle[t] !== faceId) continue;
      for (var k = 0; k < 3; k++) {
        var v = indices[t * 3 + k] - vertexRange.start;
        if (v < 0 || v >= vertexRange.count) {
          throw new Error("face " + faceId + " has a triangle outside its own vertex run" +
            " -- the mesh violates the contiguous-run tessellation contract");
        }
        outIndices.push(v);
      }
    }
    if (!outIndices.length) {
      throw new Error("face " + faceId + " has no triangles in this mesh");
    }
    return {
      positions: positions.slice(vertexRange.start * 3, (vertexRange.start + vertexRange.count) * 3),
      indices: outIndices,
    };
  };

  // Pure: the whole per-study 3D trace, as data (handoff study_3d_flyout,
  // feature 1). Given a topology, one of its studies, the feature-identity
  // projection (nullable -- absent means nothing is bound, never an error),
  // the installed mesh list and the alias table, returns what the `trace`
  // verb should do:
  //
  //   parts          every part the study's selected edges name, in selection
  //                  order, each with its resolved mesh sha256 or null
  //   ghosts         the sha256s to open translucent -- the resolved parts,
  //                  plus any mesh a binding points at that the part list
  //                  missed (the binding says the feature lives there)
  //   marks          {edgeId, sha256, faceId} per bound face whose mesh is
  //                  installed -- these render opaque over the ghosts
  //   missingParts   parts with no installed mesh after alias resolution --
  //                  the honest empty/absent state, never a guessed surface
  //   unresolvedMarks  bindings whose mesh is NOT installed ({edgeId, sha256})
  //   unboundEdges   selected edges with no binding at all
  AA.planStudyTrace = function (topology, study, identityProjection, meshes, aliases) {
    var selection = (study && study.selection) || [];
    var edgesById = {};
    ((topology && topology.edges) || []).forEach(function (e) { edgesById[e.id] = e; });
    var installed = {};
    (meshes || []).forEach(function (m) { installed[m.sha256] = true; });

    var parts = [];
    var seenParts = {};
    selection.forEach(function (edgeId) {
      var edge = edgesById[edgeId];
      if (!edge || !edge.part || seenParts[edge.part]) return;
      seenParts[edge.part] = true;
      var mesh = AA.resolveMeshIdentifier(meshes, edge.part, aliases);
      parts.push({ part: edge.part, sha256: mesh ? mesh.sha256 : null });
    });

    var ghosts = [];
    var inGhosts = {};
    parts.forEach(function (p) {
      if (p.sha256 && !inGhosts[p.sha256]) { inGhosts[p.sha256] = true; ghosts.push(p.sha256); }
    });

    var marks = [];
    var unresolvedMarks = [];
    var unboundEdges = [];
    selection.forEach(function (edgeId) {
      var record = AA.findBindingRecord(identityProjection,
        AA.topologyEdgeKey(topology.id, edgeId));
      var bindings = (record && record.bindings) || [];
      if (!bindings.length) { unboundEdges.push(edgeId); return; }
      bindings.forEach(function (b) {
        var sha = b.geometry_key && b.geometry_key.source_step_sha256;
        if (!sha) return;
        if (!installed[sha]) { unresolvedMarks.push({ edgeId: edgeId, sha256: sha }); return; }
        marks.push({ edgeId: edgeId, sha256: sha, faceId: b.geometry_key.face_id });
        if (!inGhosts[sha]) { inGhosts[sha] = true; ghosts.push(sha); }
      });
    });

    return {
      parts: parts,
      ghosts: ghosts,
      marks: marks,
      missingParts: parts.filter(function (p) { return !p.sha256; })
        .map(function (p) { return p.part; }),
      unresolvedMarks: unresolvedMarks,
      unboundEdges: unboundEdges,
    };
  };

  // --- the left rail, scoped to ONE element (flyout_resize_annotator_filter_
  // and_deselect, deliverable 2) ----------------------------------------------
  //
  // Jeff: "it should also auto-filter the left side menu to just the features
  // that are in the element (node or edge) it was entered from." The flyout
  // boots from one element and the rail listed every element in the study and
  // every installed mesh in the repo, so a reader arriving from one row had to
  // find it again in two lists.
  //
  // `target` is an edge id or a node id -- both, because both are elements of a
  // topology (docs/DAG_TOPOLOGY.md: interfaces are nodes, dimensions are edges)
  // and a card on either can route in here. Edges are looked up first: an id
  // collision between the two sets would be a data defect, and the edge is what
  // the deep link's own `edge=` param means.
  //
  // Returns what the rail should show, never a rendering:
  //
  //   kind          "edge" | "node" | null (nothing in this topology has that id)
  //   edgeIds       which elements the element list keeps, in document order
  //   parts         [{ part, sha256 }] -- the parts panel's rows, sha256 null
  //                 where no installed mesh resolves
  //   missingParts  the named parts with no installed mesh, as an honest list
  //
  // An edge names at most one part (its own `part`); a node names the parts
  // that meet at it (`parts`, a list) and every edge that touches it. A gap
  // edge with no part at all filters the element list and leaves the parts
  // panel with nothing to show -- which is the truth about a gap, and the
  // caller says so in words rather than silently showing every mesh again.
  AA.planPanelFilter = function (topology, target, meshes, aliases) {
    var edges = (topology && topology.edges) || [];
    var nodes = (topology && topology.nodes) || [];
    var resolve = function (partIds) {
      var parts = [];
      var seen = {};
      partIds.forEach(function (part) {
        if (!part || seen[part]) return;
        seen[part] = true;
        var mesh = AA.resolveMeshIdentifier(meshes, part, aliases);
        parts.push({ part: part, sha256: mesh ? mesh.sha256 : null });
      });
      return parts;
    };
    var plan = function (kind, edgeIds, partIds) {
      var parts = resolve(partIds);
      return {
        target: target || null,
        kind: kind,
        edgeIds: edgeIds,
        parts: parts,
        missingParts: parts.filter(function (p) { return !p.sha256; })
          .map(function (p) { return p.part; }),
      };
    };

    for (var i = 0; i < edges.length; i++) {
      if (edges[i].id !== target) continue;
      return plan("edge", [edges[i].id], [edges[i].part]);
    }
    for (var j = 0; j < nodes.length; j++) {
      if (nodes[j].id !== target) continue;
      var node = nodes[j];
      var touching = edges.filter(function (e) {
        return e.from === node.id || e.to === node.id;
      });
      // A node's own `parts` list first, then any part named by an edge that
      // meets it -- a node with no `parts` field (the mock fixture's topology
      // has none) still scopes the panel to the parts around it rather than
      // falling back to every mesh in the repo.
      return plan("node",
        touching.map(function (e) { return e.id; }),
        (node.parts || []).concat(touching.map(function (e) { return e.part; })));
    }
    return plan(null, [], []);
  };

  // --- deselect (deliverable 3) ----------------------------------------------
  //
  // Jeff: "I accidentally clicked a face … but there's no way to deselect a
  // surface." What a `deselect` may clear, as a vocabulary rather than three
  // inline literals: the face tint and pick, the element-row selection, or
  // both. "face" is the default because it is the one Jeff hit and because
  // clearing the element too would take the bind form down with it -- a reader
  // who mis-clicked a face has not said they are done with the element.
  AA.DESELECT_TARGETS = ["face", "element", "all"];

  // Pure: what a raycast result means for the pick state. The three surfaces
  // Jeff asked for are one decision -- a click into empty space (`pick` null)
  // and a click back onto the already-picked face both CLEAR, and anything else
  // selects. Here rather than in app.js's onPick so the toggle is checkable
  // with no WebGL: a face id equality written inside a DOM event handler is a
  // face id equality nothing can test on this machine (see this app's README on
  // why real click automation is not run here).
  AA.planPickToggle = function (currentPick, pick) {
    if (!pick) return { action: "clear", pick: null };
    if (currentPick && currentPick.sha256 === pick.sha256 &&
        currentPick.faceId === pick.faceId) {
      return { action: "clear", pick: null };
    }
    return { action: "select", pick: pick };
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
