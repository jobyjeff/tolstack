// Which faces could possibly be the feature a stack-side key means -- the
// narrowing rules, as a declared table.
//
// DOM-free, fetch-free, three.js-free, like commands.js and binding_state.js:
// it takes a topology, the feature-identity projection, the installed mesh
// list and a per-mesh face classification (face_geometry.js), and returns what
// to paint. app.js supplies the data and scene.js paints; nothing here touches
// either.
//
// THE FENCE, first, because everything below is shaped by it: a suggestion is
// a PROPOSAL IN THE UI AND NEVER A BINDING. This file returns face ids to
// colour. It writes no event, it never picks one candidate, and a binding
// remains a human-ratified `feature-identity/v0` event through the existing
// write path -- docs/ANNOTATION_SURFACE.md, and the handoff's own hard fence
// (annotate_face_suggestions, 2026-09-21). It is also not a value source: the
// radii and plane offsets it compares come from face_geometry.js and stop
// here.
//
// Two ideas and no more:
//
//   1. The element's own WORDS say which KIND of surface its feature is. A
//      diameter is on a cylinder; a thickness, a length or a flange is between
//      flat faces. That is AA.SUGGESTION_RULES.
//   2. A face already bound NEARBY says more. If the other end of this
//      dimension, or the other half of the interface at this end, already has
//      a face, the candidates that stand in a sensible geometric RELATION to
//      it are the ones worth colouring. That is AA.NARROWING_STAGES and
//      AA.NARROWING_RELATIONS.
//
// Stage 2's honest limit is worth knowing before reading the table: the
// relation can only be asked between two faces of the SAME mesh, because this
// app applies no assembly placement transforms (ANNOTATION_SURFACE.md, "What
// this MVP does not build") and every part is drawn at its own local origin.
// Across two meshes there is exactly one relation left that does not need a
// shared frame -- two mating cylinders have the same radius, because a radius
// belongs to one face rather than to a pair of frames -- and for flat faces
// there is none at all. The table says so rather than computing a coplanarity
// it cannot support.
(function (AA) {
  "use strict";

  // --- rule table: the element's words -> the surface class it needs --------
  //
  // One row per surface class, each carrying the words that name a feature of
  // that class. A module-level table and not a chain of `indexOf` calls in a
  // handler (CLAUDE.md's standing rule, and the drift this repo pays for most
  // often), matched in ORDER: the first row with a hit wins, so the specific
  // feature words ("bore", "hole", "shank") beat the generic ones ("face",
  // "length") when a name carries both.
  //
  // What is deliberately NOT in here matters as much as what is:
  //
  //   * Ambiguous words are omitted rather than guessed. "seat" is a bore on a
  //     bearing and a flat on a spring; "radius" is a fillet and a distance.
  //     A word that would be right half the time colours the wrong faces half
  //     the time, and an element with no rule renders the ordinary view -- the
  //     same "absence is a first-class answer" posture the rest of this repo
  //     takes. Widen this table from a real miss, not from imagination.
  //   * The element's `kind` is not read, even though it sounds like it should
  //     be. A topology edge's kind is `structural` or `gap` and an interface
  //     node's is `mating_surface` or `datum_feature` (docs/DAG_TOPOLOGY.md) --
  //     four words, none of which distinguishes a round surface from a flat
  //     one. A mating surface is a press fit as often as a bearing face.
  //   * Notes are not read either, only names. A note is prose about
  //     provenance and scope and it mentions every feature in the joint; the
  //     name is the one string that is about THIS element.
  AA.SUGGESTION_RULES = Object.freeze([
    Object.freeze({
      key: "diametral",
      surface: "cylindrical",
      // Plain words for the reader-facing line, no schema and no module names.
      says: "a diameter is on a round surface",
      words: Object.freeze(["diameter", "dia", "bore", "hole", "od", "id",
        "shank", "shaft", "journal", "barrel", "thread", "pin", "cylindrical"]),
    }),
    Object.freeze({
      key: "between_faces",
      surface: "planar",
      says: "a length between faces is on flat surfaces",
      words: Object.freeze(["thickness", "length", "width", "height", "depth",
        "grip", "flange", "face", "shoulder", "gap", "protrusion", "step", "land"]),
    }),
  ]);

  // Every rule's surface must be one face_geometry.js actually answers --
  // paired by run_tests.cjs, so a row naming a class the classifier cannot
  // produce fails there rather than silently suggesting nothing forever.
  AA.SUGGESTION_RULE_KEYS = Object.freeze(
    AA.SUGGESTION_RULES.map(function (r) { return r.key; }));

  // Word-boundary matching, built once per word: "dia" must not fire on
  // "diagonal" and "id" must not fire inside "rigid". Case-insensitive, and
  // a hyphen counts as a boundary, so "cotter-pin" hits "pin".
  var RULE_PATTERNS = AA.SUGGESTION_RULES.map(function (rule) {
    return {
      rule: rule,
      patterns: rule.words.map(function (word) {
        return new RegExp("\\b" + word + "\\b", "i");
      }),
    };
  });

  // Which class a string of words asks for, or null when none of them says.
  // Exported because it is the piece worth checking on its own: a name goes in,
  // a class and the rule that decided it come out.
  AA.requiredSurfaceClass = function (text) {
    var words = String(text == null ? "" : text);
    if (!words) return null;
    for (var i = 0; i < RULE_PATTERNS.length; i++) {
      var entry = RULE_PATTERNS[i];
      for (var j = 0; j < entry.patterns.length; j++) {
        if (entry.patterns[j].test(words)) {
          return {
            surface: entry.rule.surface,
            rule: entry.rule.key,
            says: entry.rule.says,
            word: entry.rule.words[j],
          };
        }
      }
    }
    return null;
  };

  // The class for ONE END of a dimension. The interface's own name is asked
  // first and the dimension's name second, because the thing being bound IS
  // the interface: "cotter-pin hole centreline" and "bolt-head bearing face"
  // are two ends of the same joint and want different surfaces, and the edge
  // name that spans them ("cotter-hole centreline to bolt point") cannot tell
  // them apart. `where` says which of the two answered, so a reader-facing
  // line can name the right thing.
  AA.endSurfaceClass = function (edge, node) {
    var fromNode = node ? AA.requiredSurfaceClass(node.name || node.id) : null;
    if (fromNode) return Object.assign({ where: "interface" }, fromNode);
    var fromEdge = edge ? AA.requiredSurfaceClass(edge.name || edge.id) : null;
    if (fromEdge) return Object.assign({ where: "dimension" }, fromEdge);
    return null;
  };

  // --- the narrowing stages, in order of what is known ----------------------
  //
  // One row per stage. `needs` is what has to be true for the stage to apply,
  // in plain words; the UI reports the stage a suggestion actually reached, so
  // a reader can tell "these are every round face on the part" from "these are
  // the round faces that line up with the one already bound".
  AA.NARROWING_STAGES = Object.freeze([
    Object.freeze({
      key: "surface_class",
      says: "every face of the right kind on this part",
      needs: "the element's own words name a kind of surface",
    }),
    Object.freeze({
      key: "same_part_relation",
      says: "the faces that line up with the one already bound",
      needs: "a face on THIS part is already bound at the other end of the " +
        "dimension, or at the other half of this interface",
    }),
    Object.freeze({
      key: "mating_fit",
      says: "the faces whose size matches the one bound on the other part",
      needs: "a face on a DIFFERENT part is already bound at this interface",
    }),
  ]);
  AA.NARROWING_STAGE_KEYS = Object.freeze(
    AA.NARROWING_STAGES.map(function (s) { return s.key; }));

  // Which geometric relation each stage can assert, per surface class. A null
  // is a stage that has nothing to say about that class, and is written out
  // rather than left as a missing key: the reason is the next constant, and it
  // is the placement-transform fence, not an omission to be filled in later by
  // whoever notices the hole.
  AA.NARROWING_RELATIONS = Object.freeze({
    same_part_relation: Object.freeze({ planar: "parallel", cylindrical: "coaxial" }),
    mating_fit: Object.freeze({ planar: null, cylindrical: "same_radius" }),
  });
  AA.NARROWING_RELATION_NAMES = Object.freeze(["parallel", "coaxial", "same_radius"]);

  // Said out loud on the surface when a flat face is bound on the adjacent
  // part and this is all the narrowing there is. Everyday words: it describes
  // what a reader can see (the parts are side by side, not assembled), never
  // a transform or a module.
  AA.NO_MATING_PLANE_RELATION =
    "The face bound on the other part is flat, and the parts here sit side by " +
    "side rather than assembled, so nothing on screen can say which flat face " +
    "meets it.";

  // Two faces are the same face when they are the same face of the same mesh.
  function sameFace(a, b) {
    return a && b && a.sha256 === b.sha256 && a.faceId === b.faceId;
  }

  // Every face already bound NEAR one end of a dimension. Two sources, both
  // of them "the other half of something":
  //
  //   other_end   the same dimension's opposite direction -- a thickness whose
  //               `from` is bound wants its `to` parallel to it
  //   other_half  another dimension meeting the SAME interface -- the adjacent
  //               part's face at the joint Jeff's note describes ("if one half
  //               of an interface is already defined in the adjacent 3d part")
  //
  // Pure, and separate from the planner, because "what do we know here?" is
  // the question a reader asks when a suggestion looks wrong.
  AA.gatherFaceReferences = function (topology, edgeId, direction, identityProjection) {
    var edges = (topology && topology.edges) || [];
    var edge = null;
    for (var i = 0; i < edges.length; i++) if (edges[i].id === edgeId) edge = edges[i];
    if (!edge) return [];
    var nodeId = edge[direction];
    var out = [];
    var push = function (ownerEdge, ownerDirection, source) {
      var record = AA.findBindingRecord(identityProjection,
        AA.topologyEdgeKey(topology.id, ownerEdge.id));
      ((record && record.bindings) || []).forEach(function (b) {
        if (b.direction !== ownerDirection) return;
        var key = b.geometry_key;
        if (!key || !key.source_step_sha256) return;
        out.push({
          edgeId: ownerEdge.id, direction: ownerDirection, source: source,
          sha256: key.source_step_sha256, faceId: key.face_id,
        });
      });
    };
    var opposite = AA.DIRECTIONS.filter(function (d) { return d !== direction; })[0];
    if (opposite) push(edge, opposite, "other_end");
    if (nodeId) {
      edges.forEach(function (other) {
        if (other.id === edge.id) return;
        if (other.from === nodeId) push(other, "from", "other_half");
        if (other.to === nodeId) push(other, "to", "other_half");
      });
    }
    return out;
  };

  // --- the planner ----------------------------------------------------------
  //
  // Everything above, applied to one selected element. Returns what to paint
  // and, just as important, what it could NOT narrow and why -- an empty
  // candidate list with no reason attached is the shape that makes a reader
  // distrust the whole feature.
  //
  //   opts.topology            a topology from the viewer projection
  //   opts.edgeId              the selected element
  //   opts.identityProjection  bindings.json, folded (nullable: nothing bound)
  //   opts.meshes              storage.listMeshes() -- for part -> mesh
  //   opts.aliases             the declared alias table's entries
  //   opts.faceClasses         { sha256: [classification per face_id] }
  //   opts.directions          which ends still need a face; defaults to the
  //                            ones AA.bindingDirectionsNeeded reports
  //   opts.tolerances          overrides for AA.FACE_RELATION_TOLERANCES
  AA.planFaceSuggestions = function (opts) {
    var o = opts || {};
    var topology = o.topology;
    var edges = (topology && topology.edges) || [];
    var nodes = (topology && topology.nodes) || [];
    var edge = null;
    for (var i = 0; i < edges.length; i++) if (edges[i].id === o.edgeId) edge = edges[i];
    var empty = function (note) {
      return { edgeId: o.edgeId || null, part: edge ? (edge.part || null) : null,
        sha256: null, ends: [], faces: [], note: note };
    };
    if (!edge) return empty(null);
    if (!edge.part) {
      return empty("This element names no part, so there is nothing in 3D to suggest.");
    }
    var mesh = AA.resolveMeshIdentifier(o.meshes, edge.part, o.aliases);
    if (!mesh) return empty(null); // the rail's own "no installed 3D part" line says it
    var classes = (o.faceClasses || {})[mesh.sha256];
    if (!classes || !classes.length) {
      return empty("This part's shapes have not been read yet.");
    }

    var record = AA.findBindingRecord(o.identityProjection,
      AA.topologyEdgeKey(topology.id, edge.id));
    var directions = o.directions || AA.bindingDirectionsNeeded(record);
    // A face already bound to THIS element is not offered again, whichever end
    // it was bound at: a reader is looking for the one that is still missing.
    var alreadyBound = ((record && record.bindings) || []).map(function (b) {
      return { sha256: b.geometry_key && b.geometry_key.source_step_sha256,
        faceId: b.geometry_key && b.geometry_key.face_id };
    });

    var nodesById = {};
    nodes.forEach(function (n) { nodesById[n.id] = n; });

    var ends = directions.map(function (direction) {
      return planEnd(edge, direction, nodesById[edge[direction]], mesh, classes,
        o.faceClasses || {},
        AA.gatherFaceReferences(topology, edge.id, direction, o.identityProjection),
        alreadyBound, o.tolerances);
    });

    // The flat paint list, de-duplicated: one face suggested for both ends of
    // a dimension is one colour on screen, not two.
    var faces = [];
    var seen = {};
    ends.forEach(function (end) {
      end.candidates.forEach(function (faceId) {
        var token = mesh.sha256 + ":" + faceId;
        if (seen[token]) return;
        seen[token] = true;
        faces.push({ sha256: mesh.sha256, faceId: faceId, direction: end.direction });
      });
    });

    return {
      edgeId: edge.id, part: edge.part, sha256: mesh.sha256,
      ends: ends, faces: faces,
      note: faces.length ? null : noSuggestionNote(ends),
    };
  };

  function planEnd(edge, direction, node, mesh, classes, faceClasses, references,
      alreadyBound, tolerances) {
    var end = {
      direction: direction,
      interface: node ? node.id : null,
      interfaceName: node ? (node.name || node.id) : null,
      surface: null, rule: null, says: null, where: null,
      stage: null, relation: null,
      references: references.map(function (r) {
        return Object.assign({ sameMesh: r.sha256 === mesh.sha256 }, r);
      }),
      considered: 0, candidates: [], note: null,
    };
    var want = AA.endSurfaceClass(edge, node);
    if (!want) {
      end.note = "Nothing in this element's name says what kind of surface it is.";
      return end;
    }
    end.surface = want.surface;
    end.rule = want.rule;
    end.says = want.says;
    end.where = want.where;
    end.stage = AA.NARROWING_STAGE_KEYS[0];

    // Stage 1: every face of the right class on this part, minus the ones
    // already bound to this element.
    var pool = [];
    for (var f = 0; f < classes.length; f++) {
      var candidate = classes[f];
      if (!candidate || candidate.surface !== want.surface) continue;
      if (alreadyBound.some(function (b) {
        return sameFace(b, { sha256: mesh.sha256, faceId: candidate.faceId });
      })) continue;
      pool.push(candidate);
    }
    end.considered = pool.length;
    end.candidates = pool.map(function (c) { return c.faceId; });
    if (!pool.length) {
      end.note = "This part has no " + surfaceWord(want.surface) + " face to offer.";
      return end;
    }

    // Stages 2 and 3: a reference face, if there is one. A reference is only
    // usable when it is of the SAME class as the end being suggested -- a bore
    // bound at one end of a "length" says nothing about which flat face the
    // other end is, and asking `parallel` of a cylinder would answer "no" for
    // every candidate and empty the list for the wrong reason.
    var comparable = function (refs) {
      return refs.map(function (r) {
        var forMesh = faceClasses[r.sha256];
        return forMesh ? forMesh[r.faceId] : null;
      }).filter(function (c) { return c && c.surface === want.surface; });
    };
    var nearby = comparable(end.references.filter(function (r) { return r.sameMesh; }));
    var adjacent = comparable(end.references.filter(function (r) { return !r.sameMesh; }));
    // Same mesh first: it is the only frame in which a relation can be asked
    // at all. A reference whose own mesh has not been read carries no
    // classification and drops out here, and stage 1's answer STANDS rather
    // than being narrowed by a guess about a shape nobody has looked at.
    var stage = nearby.length ? "same_part_relation" : (adjacent.length ? "mating_fit" : null);
    if (!stage) return end;

    var relation = AA.NARROWING_RELATIONS[stage][want.surface];
    if (!relation) {
      // The stage stays `surface_class`, because that is what the candidate
      // list actually is: the narrowing this stage would have done cannot be
      // asserted, and reporting the stage anyway would credit the list with a
      // narrowing it never got.
      end.note = AA.NO_MATING_PLANE_RELATION;
      return end;
    }
    end.stage = stage;
    end.relation = relation;
    var referenceClasses = nearby.length ? nearby : adjacent;

    var narrowed = pool.filter(function (candidate) {
      return referenceClasses.some(function (reference) {
        return relationHolds(relation, candidate, reference, tolerances);
      });
    });
    end.candidates = narrowed.map(function (c) { return c.faceId; });
    if (!narrowed.length) {
      end.note = "No face of the right kind on this part lines up with the one " +
        "already bound.";
    }
    return end;
  }

  function relationHolds(relation, candidate, reference, tolerances) {
    if (relation === "parallel") return AA.facesParallel(candidate, reference, tolerances);
    if (relation === "coaxial") return AA.facesCoaxial(candidate, reference, tolerances);
    if (relation === "same_radius") return AA.radiiMatch(candidate, reference, tolerances);
    return false;
  }

  function surfaceWord(surface) {
    return surface === "cylindrical" ? "round" : "flat";
  }
  AA.surfaceWord = surfaceWord;

  // One sentence for the whole element when no end produced a candidate. The
  // per-end notes are the detail; this is what the bar says.
  function noSuggestionNote(ends) {
    for (var i = 0; i < ends.length; i++) if (ends[i].note) return ends[i].note;
    return null;
  }

  // The words the Display checkbox wears. Constants for the same reason every
  // other sentence on this surface is one: run_tests.cjs's shared ban list
  // scans this layer, and nothing scans a string literal inside a DOM handler.
  // The help panel's own line lives with the other help copy
  // (AA.HELP_LINES, commands.js) -- one home for that list, not two.
  AA.SUGGEST_SETTING_LABEL = "Suggest likely faces";
  AA.SUGGEST_SETTING_HINT =
    "colours the faces that could be the one you are binding";

  // The reader-facing summary of a plan. Counts, and the stage that produced
  // them, in words: "6 likely faces (every face of the right kind on this
  // part)".
  AA.describeSuggestions = function (plan) {
    if (!plan) return "";
    // Nothing suggested says whatever the PLAN says and nothing of its own: a
    // part with no installed mesh has a sentence already (the rail's "No
    // installed 3D part for ..."), and "no face here looks like it" would be
    // this surface claiming to have looked at a shape it never read.
    if (!plan.faces.length) return plan.note || "";
    var stages = [];
    plan.ends.forEach(function (end) {
      if (!end.candidates.length || !end.stage) return;
      var row = null;
      for (var i = 0; i < AA.NARROWING_STAGES.length; i++) {
        if (AA.NARROWING_STAGES[i].key === end.stage) row = AA.NARROWING_STAGES[i];
      }
      if (row && stages.indexOf(row.says) === -1) stages.push(row.says);
    });
    return plan.faces.length + " likely face" + (plan.faces.length === 1 ? "" : "s") +
      (stages.length ? " -- " + stages.join("; ") : "");
  };
})(window.AnnotateApp = window.AnnotateApp || {});
