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
//      flat faces; a joint centre is on a ball. That is AA.SUGGESTION_RULES.
//   2. A face already bound NEARBY says more. If the other end of this
//      dimension, or the other half of the interface at this end, already has
//      a face, the candidates that stand in a sensible geometric RELATION to
//      it are the ones worth colouring. That is AA.NARROWING_STAGES and
//      AA.NARROWING_RELATIONS.
//
// Stage 2's honest limit is worth knowing before reading the table: the
// relation can only be asked between two faces of the SAME mesh, because this
// engine reads each part in its own local frame. The parts have been DRAWN in
// the shared assembly frame since 2026-10-14 (ANNOTATION_SURFACE.md, "Where a
// part is drawn"); reading that frame in here is the cross-part step still
// open (ISSUE_20260921_cross_part_face_relations_need_assembly_placement).
// Across two meshes there is exactly one relation left that does not need a
// shared frame -- two mating cylinders have the same radius, because a radius
// belongs to one face rather than to a pair of frames -- and for flat faces
// there is none at all. The table says so rather than computing a coplanarity
// it cannot support. A gap edge's two parts ARE compared in the assembly frame
// since 2026-10-28 -- by scripts/build_contact_suggestions.py, in Python, and
// listed by the "contact suggestions" half at the bottom of this file.
(function (AA, VOCAB) {
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
    // LAST, and the order is load-bearing rather than incidental. Three live
    // interfaces are already named "spherical bearing face against ..." and
    // "spherical bearing width" -- a flat face and a width, on a part that
    // happens to be a spherical bearing. Asked before the row above, this one
    // would take all three on the word "spherical" and colour the wrong faces.
    // Asked last, it answers only when nothing more specific did, which is what
    // a joint named for its CENTRE looks like.
    Object.freeze({
      key: "spherical_centre",
      surface: "spherical",
      says: "a joint centre is on a ball-shaped surface",
      words: Object.freeze(["sphere", "spherical", "ball", "centre", "center"]),
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
  // Keyed by the GENERATED vocabulary, like AA.SURFACE_WORDS below and for the
  // same reason: a key omitted because it "cannot happen" is how the next class
  // arrives silently. `other` is in both stages and is null in both -- a class
  // that means "no feature was read" has no relation to assert, and writing
  // that out is cheaper than a reader wondering whether it was forgotten.
  AA.NARROWING_RELATIONS = Object.freeze({
    same_part_relation: VOCAB.table("SURFACE_CLASSES", {
      planar: "parallel", cylindrical: "coaxial", spherical: null, other: null }),
    mating_fit: VOCAB.table("SURFACE_CLASSES", {
      planar: null, cylindrical: "same_radius", spherical: "same_radius",
      other: null }),
  });
  AA.NARROWING_RELATION_NAMES = Object.freeze(["parallel", "coaxial", "same_radius"]);

  // Said out loud on the surface wherever the table above declares a null.
  // Everyday words, every one of them, and never a transform or a module.
  // Rewritten 2026-10-14: both used to say the parts sat side by side and a
  // part was drawn once, which stopped being true of the screen the day parts
  // were placed in the assembly -- what is still true is that the suggestions
  // compare one part's faces at a time, and that a binding names a part's
  // face rather than one of its positions.
  AA.NO_MATING_PLANE_RELATION =
    "The face bound on the other part is flat, and suggestions compare one " +
    "part's faces at a time, so which flat face here meets it is yours to pick.";
  AA.NO_SAME_PART_SPHERE_RELATION =
    "The centre already bound is on this same part, and a binding names the " +
    "part's own face at every position, so the second centre is that same face.";

  // One reason per null above, keyed the same way, so a null is a decision
  // with a sentence attached rather than a hole. Paired against
  // NARROWING_RELATIONS by run_tests.cjs in both directions: a null with no
  // reason, and a reason for something that is not null, are both red.
  // `other` carries no reason in either stage, deliberately: no rule may ask
  // for it (run_tests.cjs refuses a rule row naming it), so the planner cannot
  // reach a null of its for a reason to print. The pairing guard knows that --
  // it requires a reason for every null a RULE can reach, not for every null.
  AA.NO_RELATION_REASONS = Object.freeze({
    same_part_relation: Object.freeze({ spherical: AA.NO_SAME_PART_SPHERE_RELATION }),
    mating_fit: Object.freeze({ planar: AA.NO_MATING_PLANE_RELATION }),
  });

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
    // `=== null` and not falsy: a declared null is a decision with a sentence
    // attached, and an ABSENT key is a hole. They are no longer the same thing
    // on this surface -- the table is keyed by the generated vocabulary, so an
    // absent key cannot survive construction -- and reading them the same way
    // would put that back.
    if (relation === null) {
      // The stage stays `surface_class`, because that is what the candidate
      // list actually is: the narrowing this stage would have done cannot be
      // asserted, and reporting the stage anyway would credit the list with a
      // narrowing it never got.
      end.note = AA.NO_RELATION_REASONS[stage][want.surface];
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

  // The everyday word for a surface class, as a table keyed by the GENERATED
  // vocabulary -- so a class Python can emit that this surface has no word for
  // throws when the app loads, rather than printing the wrong word in a
  // sentence a reader is being asked to trust. "other" has a word even though
  // no rule may ask for one: the table is keyed by the whole vocabulary, and a
  // key omitted because it "cannot happen" is how the next class arrives
  // silently.
  AA.SURFACE_WORDS = VOCAB.table("SURFACE_CLASSES", {
    planar: "flat",
    cylindrical: "round",
    spherical: "ball-shaped",
    other: "readable",
  });

  function surfaceWord(surface) {
    return AA.SURFACE_WORDS[surface];
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
  // part)". `names` (optional) is AA.edgeEndNames's answer for the element.
  AA.describeSuggestions = function (plan, names) {
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
      var says = row ? row.says + referenceClause(end, names || {}) : null;
      if (says && stages.indexOf(says) === -1) stages.push(says);
    });
    return plan.faces.length + " likely face" + (plan.faces.length === 1 ? "" : "s") +
      (stages.length ? " -- " + stages.join("; ") : "");
  };

  // Which face "the one already bound" IS (Jeff, 2026-10-21, read it as some
  // earlier binding he did not know about, when it was the face he had just
  // written): " (face 110, bound as <interface name>)", off the end's own
  // references. Only for the two stages that compared against a face; the
  // reference shown is the first of the kind the stage used (same part, or
  // another part). A reference at the OTHER end of this element is named by
  // that end; one at the other half of this interface, by this end's own.
  function referenceClause(end, names) {
    if (end.stage !== "same_part_relation" && end.stage !== "mating_fit") return "";
    var sameMesh = end.stage === "same_part_relation";
    var ref = null;
    end.references.forEach(function (r) { if (!ref && !!r.sameMesh === sameMesh) ref = r; });
    if (!ref) return "";
    var name = ref.source === "other_end" ? names[ref.direction] : end.interfaceName;
    return " (face " + ref.faceId + (name ? ", bound as " + name : "") + ")";
  }

  // --- contact suggestions: the faces of two parts that touch ----------------
  //
  // Handoff an_interface_suggests_the_faces_that_touch (2026-10-28). A gap
  // edge names two parts and an interface word, and scripts/
  // build_contact_suggestions.py has already read, in the assembly frame, which
  // faces of those two parts touch: flat on flat, a pin in its bore, a ball in
  // its seat -- ranked, with the evidence. This half only FINDS the rows for an
  // element and SAYS them in everyday words. The same fence as above: it
  // colours and lists, it never selects a face and never writes.
  //
  // An element that is not itself a gap edge still gets the rows of the gap
  // edges at its two ends -- "a feature on either side of it": a link's length
  // runs between two joints, and the faces that close those joints are the
  // ones a reader binding the length is looking for.

  // How many candidates the bar lists.
  AA.CONTACT_LISTED = 3;

  // What each pairing is, in a reader's words. Keyed by the Python vocabulary
  // (tolerance_stack/interface_contact.py's PAIRING_KINDS and RELATIONS,
  // generated), so a kind added there without words here throws at load.
  AA.CONTACT_PAIRING_WORDS = VOCAB.table("CONTACT_PAIRING_KINDS", {
    plane_on_plane: "flat on flat",
    cylinder_in_cylinder: "pin in bore",
    ball_in_seat: "ball in its seat",
  });
  AA.CONTACT_RELATION_WORDS = VOCAB.table("CONTACT_RELATIONS", {
    contact: "touching",
    coaxial: "on one axis",
  });
  AA.CONTACT_SEAT_WORDS = VOCAB.table("CONTACT_SEAT_SURFACES", {
    spherical: "ball in its race",
    cylindrical: "ball on a bore's axis",
    planar: "ball against a flat",
  });
  // The heading over the list, and the one a list read off a neighbouring
  // joint wears (with that joint's name).
  AA.CONTACT_HEADING = "Faces that touch";
  AA.CONTACT_HEADING_AT = "Faces that touch at ";
  // When a second pair of occurrences touches different faces -- a link with
  // a bearing at each end -- the list is one of those places.
  AA.CONTACT_AMBIGUOUS = "these parts touch in more than one place";

  function mm(value) {
    var abs = Math.abs(value);
    var digits = abs >= 10 ? 1 : abs >= 0.1 ? 2 : 3;
    return value.toFixed(digits) + " mm";
  }

  // The rows for one element: [{row, via}] where `row` is the projection's
  // edge row and `via` is null for the element itself, or the gap edge's own
  // row when it was reached through a shared node. Rows with no candidate are
  // left out: an empty one says nothing a reader can act on in the bar.
  AA.contactRowsFor = function (doc, topology, edgeId) {
    if (!doc || !topology || !edgeId) return [];
    var entry = null;
    (doc.topologies || []).forEach(function (t) { if (t.id === topology.id) entry = t; });
    if (!entry) return [];
    var rows = (entry.edges || []).filter(function (r) {
      return r.status === "ok" && (r.candidates || []).length;
    });
    var own = rows.filter(function (r) { return r.edge === edgeId; })[0];
    if (own) return [{ row: own, via: null }];
    // A gap edge with nothing touching lists nothing -- never its neighbours'
    // pairs, which would read as this joint's.
    if ((entry.edges || []).some(function (r) { return r.edge === edgeId; })) return [];
    var edge = ((topology.edges || []).filter(function (e) { return e.id === edgeId; }))[0];
    if (!edge) return [];
    return rows.filter(function (r) {
      return [edge.from, edge.to].some(function (n) {
        return n && (r.from.node === n || r.to.node === n);
      });
    }).map(function (r) { return { row: r, via: r }; });
  };

  // One candidate's evidence, as one short line: "pin in bore, clearance
  // 0.003 mm, 2.20 mm shared". Numbers are evidence for a rank, read off a
  // mesh -- never a value -- so they are rounded for reading.
  AA.describeContact = function (pairing, candidate) {
    var e = candidate.evidence || {};
    if (candidate.relation !== "contact") {
      return AA.CONTACT_RELATION_WORDS[candidate.relation] + ", " + mm(e.axis_offset_mm) + " apart";
    }
    if (pairing === "plane_on_plane") {
      return AA.CONTACT_PAIRING_WORDS[pairing] + ", gap " + mm(e.gap_mm) +
        ", overlap " + Math.round(e.overlap_mm2) + " mm²";
    }
    if (pairing === "cylinder_in_cylinder") {
      var fit = e.clearance_mm < 0 ? "press fit " + mm(-e.clearance_mm)
        : "clearance " + mm(e.clearance_mm);
      return AA.CONTACT_PAIRING_WORDS[pairing] + ", " + fit + ", " +
        mm(e.axial_overlap_mm) + " shared";
    }
    var words = AA.CONTACT_SEAT_WORDS[e.seat];
    if (e.seat === "planar") return words + ", gap " + mm(e.seat_gap_mm);
    return words + ", off by " + mm(e.centre_mm);
  };

  // The faces to colour for one candidate: [{sha256, faceId}], both ends.
  AA.contactFaces = function (candidate) {
    var out = [];
    if (!candidate) return out;
    ["from", "to"].forEach(function (side) {
      var end = candidate[side];
      (end && end.faces || []).forEach(function (f) {
        out.push({ sha256: end.sha256, faceId: f });
      });
    });
    return out;
  };

  // A candidate by edge id and rank, or null.
  AA.findContact = function (doc, topologyId, edgeId, rank) {
    var found = null;
    ((doc && doc.topologies) || []).forEach(function (t) {
      if (t.id !== topologyId) return;
      (t.edges || []).forEach(function (r) {
        if (r.edge !== edgeId) return;
        (r.candidates || []).forEach(function (c) {
          if (c.rank === rank) found = { row: r, candidate: c };
        });
      });
    });
    return found;
  };
})(window.AnnotateApp = window.AnnotateApp || {}, window.TolstackVocab.annotate);
