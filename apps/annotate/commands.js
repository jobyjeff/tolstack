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
  // AA.faceVertexRanges in face_geometry.js); indices are remapped into it. A
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

  // Which elements a SCOPE covers: one study's own lassoed selection, or --
  // with no study -- every edge in the topology (handoff annotate_hint_bar_
  // and_context_autofilter, deliverable 4: Jeff asked for a way into 3D
  // "when an entire study or topology is selected"). One function because a
  // scope-level entry differs from a study entry in exactly this list and in
  // nothing else: the trace, the panel filter and the parts to open all read
  // it, so "what does topology scope mean?" has one answer.
  AA.scopeSelection = function (topology, study) {
    if (study) return ((study && study.selection) || []).slice();
    return ((topology && topology.edges) || []).map(function (e) { return e.id; });
  };

  // Pure: the whole per-study 3D trace, as data (handoff study_3d_flyout,
  // feature 1). Given a topology, one of its studies (NULL for the whole
  // topology -- see AA.scopeSelection), the feature-identity projection
  // (nullable -- absent means nothing is bound, never an error), the
  // installed mesh list and the alias table, returns what the `trace` verb
  // should do:
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
    var selection = AA.scopeSelection(topology, study);
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

  // The same plan shape, for a WHOLE study or a whole topology (handoff
  // annotate_hint_bar_and_context_autofilter, deliverable 4). Deliberately the
  // shape `planPanelFilter` returns and not a second one: the rail's two
  // renderers and its scope bar already read that shape, so scope-level entry
  // reuses them rather than teaching each of them a second kind of scope.
  //
  // `name` is the extra field, and only a scope carries one: an element's own
  // name is looked up on the topology by id, and a study's title is not
  // (nothing else on the rail holds the study table).
  AA.planScopeFilter = function (topology, study, meshes, aliases) {
    var edgeIds = AA.scopeSelection(topology, study);
    var edgesById = {};
    ((topology && topology.edges) || []).forEach(function (e) { edgesById[e.id] = e; });
    var parts = [];
    var seen = {};
    edgeIds.forEach(function (edgeId) {
      var edge = edgesById[edgeId];
      var part = edge && edge.part;
      if (!part || seen[part]) return;
      seen[part] = true;
      var mesh = AA.resolveMeshIdentifier(meshes, part, aliases);
      parts.push({ part: part, sha256: mesh ? mesh.sha256 : null });
    });
    return {
      target: study ? study.id : ((topology && topology.id) || null),
      kind: study ? "study" : "topology",
      name: study
        ? (study.title || study.id)
        : ((topology && (topology.title || topology.id)) || null),
      edgeIds: edgeIds,
      parts: parts,
      missingParts: parts.filter(function (p) { return !p.sha256; })
        .map(function (p) { return p.part; }),
    };
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

  // --- on/off, as one vocabulary ---------------------------------------------
  //
  // Two settings verbs take a switch and a reader's own checkbox drives both,
  // so the accepted words are a module-level constant rather than a pair of
  // inline literals compared in two handlers (CLAUDE.md's standing rule).
  // Exactly two words: "1"/"true"/"yes" look harmless and are the beginning of
  // a second, undocumented vocabulary.
  AA.ON_OFF = ["on", "off"];
  AA.parseOnOff = function (value) {
    if (AA.ON_OFF.indexOf(value) === -1) {
      throw new Error("expected one of " + AA.ON_OFF.join(", ") +
        ", got " + JSON.stringify(value));
    }
    return value === AA.ON_OFF[0];
  };
  AA.onOff = function (on) { return on ? AA.ON_OFF[0] : AA.ON_OFF[1]; };

  // --- arriving from the stack viewer: what is applied automatically ---------
  //
  // (handoff annotate_hint_bar_and_context_autofilter, deliverable 3.) Jeff:
  // "When you open the 3d viewer for a given tolerance or feature, you already
  // know the 3d body, the topology, the study, the component, etc, so all of
  // these should be filtered automatically. … the left side menu should have an
  // 'auto-filter' menu at the top which lets you enable/disable different parts
  // of the selection algorithm (checkboxes to auto select topology, study,
  // part)."
  //
  // One row per step of the arrival, with the words the checkbox wears. The
  // labels are everyday and name no algorithm (the standing web-UI rule); the
  // `hint` is what the checkbox's own title says, one line each.
  AA.AUTO_STEPS = Object.freeze([
    Object.freeze({ key: "topology", label: "Topology",
      hint: "arriving from the stack viewer opens the topology it came from" }),
    Object.freeze({ key: "study", label: "Study",
      hint: "arriving from the stack viewer opens the study it came from" }),
    Object.freeze({ key: "part", label: "Parts",
      hint: "arriving from the stack viewer shows only the parts that element touches" }),
  ]);
  AA.AUTO_STEP_KEYS = Object.freeze(AA.AUTO_STEPS.map(function (s) { return s.key; }));

  // Every step on, which is what this app did before the checkboxes existed --
  // so a reader who never opens the menu sees no change.
  AA.defaultAutoSteps = function () {
    var out = {};
    AA.AUTO_STEP_KEYS.forEach(function (key) { out[key] = true; });
    return out;
  };

  // A stored settings blob, made safe: an unknown key is dropped and a missing
  // one falls back to the default, so a half-written or stale value reads as
  // "not set" rather than turning a step off behind the reader's back.
  AA.normalizeAutoSteps = function (raw) {
    var out = AA.defaultAutoSteps();
    if (!raw || typeof raw !== "object") return out;
    AA.AUTO_STEP_KEYS.forEach(function (key) {
      if (typeof raw[key] === "boolean") out[key] = raw[key];
    });
    return out;
  };

  // What an arrival ACTUALLY does, given the reader's settings and what is
  // already open. Pure, because it is the one place the checkboxes can be got
  // wrong: `goto`/`trace` are the two entry verbs (the manual select-* verbs
  // are never gated -- a verb typed by hand does what it says).
  //
  //   applies        false when auto-select-topology is off and the reader is
  //                  looking at a DIFFERENT topology -- their pick stands, and
  //                  nothing below could name anything in it anyway
  //   selectTopology / selectStudy / scopeParts   which steps to run
  //
  // The edge itself is never gated: it is the thing the reader clicked.
  AA.planArrival = function (opts) {
    var o = opts || {};
    var auto = AA.normalizeAutoSteps(o.auto);
    var selectTopology = auto.topology || !o.currentTopologyId;
    var landsOn = selectTopology ? o.topologyId : o.currentTopologyId;
    if (!landsOn || landsOn !== o.topologyId) {
      return {
        applies: false, keptTopologyId: o.currentTopologyId || null,
        selectTopology: false, selectStudy: false, scopeParts: false,
      };
    }
    return {
      applies: true, keptTopologyId: null,
      selectTopology: selectTopology,
      selectStudy: !!auto.study,
      scopeParts: !!auto.part,
    };
  };

  // The URL's params as the ordered command list a boot runs -- the deep link
  // has never been a parallel code path (handoff annotate_deep_link_and_part_
  // filter) and this is that rule made checkable: the branching used to live
  // inside app.js's `runPendingDeepLink`, where no tier could read it.
  //
  // `trace` returns ONE command and drops `edge`/`isolate`: a scope entry owns
  // the whole scene state (which parts show, what is marked), so applying an
  // element entry on top of it would half-undo it.
  AA.planEntryCommands = function (params) {
    var p = params || {};
    if (p.trace && p.topology) return [["trace", p.topology, p.study || ""]];
    var commands = [];
    if (p.topology) {
      commands.push(["goto", p.topology, p.edge || "", p.study || ""]);
    }
    if (p.isolate) {
      var parts = String(p.isolate).split(",")
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      if (parts.length) commands.push(["isolate"].concat(parts));
    }
    return commands;
  };

  // --- the one-line task instruction (deliverable 2) -------------------------
  //
  // Jeff: "user can just be given simple instructions (ie select the two faces
  // that define the bushing length…)". The bar's collapsed line, composed from
  // the element rather than written once in the markup -- so the sentence a
  // reader meets names the thing they arrived for.
  //
  // Singular/plural comes from what the binding actually needs: a topology edge
  // is a dimension BETWEEN two interfaces, and a binding event carries a
  // `direction` (AA.DIRECTIONS: from, to), so an element with nothing bound
  // needs two faces and one with a `from` already recorded needs one more.
  AA.TASK_NO_ELEMENT =
    "Pick an element on the left, then click a face in the 3D view to bind it.";

  // Which directions a record still has no face for. An absent record needs
  // both -- the same "absence is the consumer's to notice" posture
  // elementBindingState takes.
  AA.bindingDirectionsNeeded = function (record) {
    var have = {};
    ((record && record.bindings) || []).forEach(function (b) {
      if (b && b.direction) have[b.direction] = true;
    });
    return AA.DIRECTIONS.filter(function (d) { return !have[d]; });
  };

  AA.taskInstruction = function (ctx) {
    var c = ctx || {};
    if (!c.elementName) {
      return c.scopeName
        ? "Showing " + c.scopeName + ". Pick an element on the left, then " +
          "click a face in the 3D view."
        : AA.TASK_NO_ELEMENT;
    }
    if (c.picked) {
      return "Bind the selected face to " + c.elementName +
        ", or click another face to change it.";
    }
    var needed = c.needed || AA.DIRECTIONS;
    if (needed.length > 1) {
      return "Select the two faces that define " + c.elementName + ".";
    }
    if (needed.length === 1) {
      return "Select the remaining face that defines " + c.elementName + ".";
    }
    return c.elementName + " already has the faces it needs. " +
      "Click a face to bind another.";
  };

  // --- the help the top bar opens (deliverable 1) ----------------------------
  //
  // Jeff: "Could even be a collapsible 'commands' element that gives general
  // help." Short lines, no paragraphs, and here rather than in the markup for
  // the reason every other sentence on this surface is a constant: this is the
  // only layer a test can read (run_tests.cjs has no DOM), so copy that lives
  // here is copy the shared ban list actually scans.
  AA.HELP_LINES = Object.freeze([
    "Click a face in the 3D view to select it; click it again to let it go.",
    "The rows on the left are this study's elements. Click one to work on it.",
    "A scope bar on the left says when the lists are narrowed to one element, " +
      "and lifts it.",
    "Set up automatically decides how much of that an arrival from the stack " +
      "viewer does for you.",
    "See-through parts renders bodies translucent, so faces already bound show " +
      "through in green.",
    "Suggest likely faces colours the faces that could be the one you are " +
      "binding. You still pick.",
  ]);

  // --- remembered settings ---------------------------------------------------
  //
  // Both settings persist, the way the viewer's own remembered pane width does
  // (apps/viewer/views/topology.js): one key per setting, `store` injected so
  // both directions are checkable with no browser, and EVERY access wrapped --
  // a preference is never worth a crash, and a value that cannot be read is
  // "not set", never a guess.
  AA.PREF_KEYS = Object.freeze({
    autoSteps: "tolstack.annotate.autoSteps",
    transparentParts: "tolstack.annotate.transparentParts",
    faceSuggestions: "tolstack.annotate.faceSuggestions",
  });

  // Translucent by default: a scope entry is transparent by Jeff's own
  // description ("again transparent with the interface surfaces displayed in a
  // different color"), and an element entry gains the same thing -- the green
  // bound-face marks are only visible through a body that lets them through.
  AA.DEFAULT_TRANSPARENT_PARTS = true;

  AA.readStoredAutoSteps = function (store) {
    try {
      var raw = store && store.getItem(AA.PREF_KEYS.autoSteps);
      if (!raw) return AA.defaultAutoSteps();
      return AA.normalizeAutoSteps(JSON.parse(raw));
    } catch (err) {
      return AA.defaultAutoSteps();
    }
  };

  AA.writeStoredAutoSteps = function (store, steps) {
    try {
      if (store) {
        store.setItem(AA.PREF_KEYS.autoSteps,
          JSON.stringify(AA.normalizeAutoSteps(steps)));
      }
    } catch (err) {
      // A browser that refuses to store it still honours the setting now.
    }
  };

  // An on/off preference, read and written in ONE place. It was two copies of
  // the same try/catch until a third setting arrived (handoff
  // annotate_face_suggestions, 2026-09-21) and made the shape obvious: the
  // stored form is AA.onOff's own two words, anything else is "not set", and a
  // store that throws on touch is "not set" too -- a preference is never worth
  // a crash, and a value that cannot be read is never a guess.
  AA.readStoredOnOff = function (store, key, fallback) {
    try {
      var raw = store && store.getItem(key);
      if (raw === AA.ON_OFF[0]) return true;
      if (raw === AA.ON_OFF[1]) return false;
      return fallback;
    } catch (err) {
      return fallback;
    }
  };

  AA.writeStoredOnOff = function (store, key, on) {
    try {
      if (store) store.setItem(key, AA.onOff(!!on));
    } catch (err) {
      // A browser that refuses to store it still honours the setting now.
    }
  };

  AA.readStoredTransparency = function (store) {
    return AA.readStoredOnOff(store, AA.PREF_KEYS.transparentParts,
      AA.DEFAULT_TRANSPARENT_PARTS);
  };

  AA.writeStoredTransparency = function (store, on) {
    AA.writeStoredOnOff(store, AA.PREF_KEYS.transparentParts, on);
  };

  // Face suggestions (handoff annotate_face_suggestions, 2026-09-21). On by
  // default: an element whose words say nothing suggests nothing and renders
  // the ordinary view, so the setting being on is not a change a reader has to
  // opt out of -- it only shows up where there is something to show.
  AA.DEFAULT_FACE_SUGGESTIONS = true;

  AA.readStoredSuggestions = function (store) {
    return AA.readStoredOnOff(store, AA.PREF_KEYS.faceSuggestions,
      AA.DEFAULT_FACE_SUGGESTIONS);
  };

  AA.writeStoredSuggestions = function (store, on) {
    AA.writeStoredOnOff(store, AA.PREF_KEYS.faceSuggestions, on);
  };
})(window.AnnotateApp = window.AnnotateApp || {});
