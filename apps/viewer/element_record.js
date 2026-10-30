// One record per element (handoff a_preview_pane_replaces_the_hover_popups_
// and_one_record_backs_every_mark, 2026-10-30).
//
// Jeff, 2026-10-29: "The point of the leader lines is that they're tracing the
// same data from 3d to 2d to grid view, which means all of them should present
// the same additional data when hovered or clicked."
//
// Every mark on every tier -- a 3D anchor, a DAG dot or bar, a grid row --
// resolves to ONE record by ONE key, the same `<kind>|<id>` pair the pane's
// shared hover state already addresses everything by (`node|<id>`,
// `edge|<id>`). The Preview renders the record; a mark's accessible name and
// its one-line hover label are the record's title. Nothing on any tier
// composes its own copy of these facts any more.
//
// What the three tiers used to compose independently, and the drift that
// shipped because of it (the lesson has the full list):
//   - the DAG bar's hover card (VA.edgeCard) offered the annotator for an
//     untraced edge by `needsAnnotation(confidence)`, the preview pane by
//     `needsAnnotation(confidence, edge)` -- so a structural edge with no
//     value offered 3D on click and not on hover;
//   - the dot's hover card (VA.nodeCard) showed each side's thumbnail, the
//     preview pane none, so a node clicked showed less than the same node
//     hovered;
//   - the grid's citation chip opened a third composition (VA.citationCard)
//     of a citation the preview pane printed its own way.
//
// Built HERE, at page time, out of what the projections already carry -- the
// topology, the crop index, the active study's result -- and never at
// projection time: the contribution is a function of which study the reader
// has open, and the crop index is its own projection, so a projection-time
// record would be one copy per (element x study) and a second crop index.
// Nothing is computed: every number is a projected value, carried as-is.
//
// The 3D binding a scene holds (which face a node is bound to) is NOT in any
// viewer projection; the record's `binding` says what the page can know --
// whether a binding is still wanted and whether the part has a model to bind
// on. ISSUE_20261030_the_element_record_carries_no_bound_face.md owns the rest.
(function (VA) {
  "use strict";

  // The two kinds a record is keyed by. A pane hover key of any other kind
  // (`study|<id>`, a study group's field) has no record and previews nothing.
  VA.ELEMENT_RECORD_KINDS = Object.freeze(["node", "edge"]);

  VA.elementKey = function (kind, id) { return kind + "|" + id; };

  // {kind, id} out of a key, or null for a key that is not an element's.
  VA.parseElementKey = function (key) {
    if (typeof key !== "string") return null;
    var bar = key.indexOf("|");
    if (bar === -1) return null;
    var kind = key.slice(0, bar);
    if (VA.ELEMENT_RECORD_KINDS.indexOf(kind) === -1) return null;
    return { kind: kind, id: key.slice(bar + 1) };
  };

  function sourceText(valueSource) {
    var source = VA.VALUE_SOURCES[valueSource];
    return source ? source.title : VA.valueSourceText(valueSource);
  }

  function confidenceLabel(confidence) {
    if (confidence === null || confidence === undefined) return "no value";
    return VA.CONFIDENCE_LABEL[confidence] || confidence;
  }

  function partBlock(topoProj, partId, crops) {
    if (!partId) return null;
    var index = VA.topologyIndex(topoProj);
    var part = index.parts[partId] || { id: partId };
    var thumb = null;
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      if (thumb || edge.part !== partId || !edge.crop_key) return;
      var entry = VA.cropForKey(crops, edge.crop_key);
      if (entry.status === "resolved") {
        thumb = { edgeId: edge.id, edgeName: edge.name, entry: entry };
      }
    });
    var label = VA.componentLabel(part);
    // Where a part with no drawing of its own gets its dimensions, and whether
    // that makes it a STANDARD part: every document its rows cite is a
    // standard sheet (VA.partReferences). A part with a drawing has that
    // drawing for a reference and needs no list.
    var references = part.drawing ? [] : VA.partReferences(topoProj, partId);
    return {
      id: part.id,
      label: label,
      drawing: VA.componentDrawingText(label, part.drawing || null, part.revision || null),
      references: references,
      standardPart: references.length > 0 && references.every(function (reference) {
        return reference.kinds.length > 0 && reference.kinds.every(function (kind) {
          return kind === VA.SPEC_CITATION_KIND;
        });
      }),
      note: part.note || null,
      // A part's picture is the first resolved crop of one of its OWN rows'
      // citations -- a crop of that part's drawing by construction. A part
      // none of whose rows cropped has none: absent is absent.
      thumb: thumb,
      meshed: VA.partHasMesh(topoProj, part.id),
    };
  }

  // A part's block, the one every record that names the part carries: a
  // node's side, an edge's part. Public so a surface that lists parts can ask
  // for the same block the records hold rather than composing its own.
  VA.elementPart = function (topoProj, partId, crops) {
    return partBlock(topoProj, partId, crops || null);
  };

  // The active study's reading of an edge: a chain study's contribution (the
  // ordinal, the signed scaled band) or a kinematic study's contributor row
  // (the sign, coefficient and magnitude at each stop, and the band).
  function contributionOf(edgeId, opts) {
    var hit = opts.chain && opts.chain[edgeId];
    if (hit) {
      return { kind: "chain", ordinal: hit.ordinal, contribution: hit.contribution,
               override: (opts.study && opts.study.transforms &&
                          opts.study.transforms[edgeId]) || null };
    }
    var row = opts.kinematicRows && opts.kinematicRows[edgeId];
    if (row) {
      return {
        kind: "kinematic",
        band: row.band,
        stops: (opts.kinematicStops || []).map(function (stop, s) {
          var cell = row.cells[s];
          return { label: stop.label, sign: cell ? cell.sign : null,
                   coefficient: cell ? cell.coefficient : null,
                   magnitude: cell ? cell.magnitude : null };
        }),
      };
    }
    return null;
  }

  function edgeRecord(topoProj, id, opts) {
    var index = VA.topologyIndex(topoProj);
    var edge = index.edges[id];
    if (!edge) return null;
    var part = partBlock(topoProj, edge.part, opts.crops);
    var dimension = edge.dimension || null;
    var sourceRef = (dimension && dimension.source_ref) || null;
    var record = {
      key: VA.elementKey("edge", id),
      kind: "edge",
      id: id,
      title: edge.name,
      elementKind: edge.kind,
      confidence: edge.confidence,
      confidenceLabel: confidenceLabel(edge.confidence),
      valueSource: edge.value_source,
      zeroWidth: !!edge.zero_width,
      part: part,
      from: { id: edge.from, label: VA.nodeLabel(topoProj, edge.from) },
      to: { id: edge.to, label: VA.nodeLabel(topoProj, edge.to) },
      values: dimension ? {
        nominal: dimension.nominal, min: dimension.min, max: dimension.max,
        plusMinus: dimension.plus_minus === undefined ? null : dimension.plus_minus,
        role: dimension.role || null, hardware: dimension.hardware_ref || null,
      } : null,
      transform: edge.transform,
      note: edge.note || null,
      // `dimension` without a `source_ref` is the loud case: a number that
      // cites nothing at all.
      citation: sourceRef,
      uncited: !!(dimension && !sourceRef),
      crop: null,
      noCropReason: null,
      binding: {
        // A binding pins down which feature this is; it is wanted where the
        // number has nothing readable behind it, or there is no number at all
        // (VA.needsAnnotation, with the edge -- the one rule, both tiers).
        wanted: VA.needsAnnotation(edge.confidence, edge),
        meshed: !!(part && part.meshed),
        params: null,
      },
      contribution: contributionOf(id, opts),
      bandEdge: null,
    };
    if (edge.crop_key) {
      record.crop = { key: edge.crop_key, entry: VA.cropForKey(opts.crops, edge.crop_key) };
    } else {
      record.noCropReason = sourceText(edge.value_source);
    }
    if (record.binding.wanted && record.binding.meshed) {
      record.binding.params = {
        topologyId: topoProj.id, edgeId: id,
        studyId: (opts.study && opts.study.id) || undefined,
        part: edge.part,
      };
    }
    var bandEdgeId = opts.bandEdges && opts.bandEdges[id];
    var bandEdge = bandEdgeId ? index.edges[bandEdgeId] : null;
    if (bandEdge) record.bandEdge = { id: bandEdge.id, title: bandEdge.name };
    return record;
  }

  function nodeRecord(topoProj, id, opts) {
    var node = VA.topologyIndex(topoProj).nodes[id];
    if (!node) return null;
    var adjacent = VA.nodeAdjacentParts(topoProj)[id] || [];
    return {
      key: VA.elementKey("node", id),
      kind: "node",
      id: id,
      title: node.name,
      elementKind: node.kind,
      degree: node.degree,
      branch: !!node.branch,
      note: node.note || null,
      citation: node.source_ref || null,
      confidence: node.confidence || null,
      // One predicate, shared with the leaders: internal means every adjacent
      // edge carries one part, the degree-1 chain end included.
      internal: !!VA.internalNodes(topoProj)[id],
      // The sides DERIVED from the edges actually incident on the node
      // (VA.nodeAdjacentParts) -- what the leader rule reads and what the
      // picture is drawn from -- never the document's own `parts` list. A
      // clearance is a side and is named.
      sides: adjacent.map(function (partId) {
        if (partId === null) {
          return { id: null, label: VA.CLEARANCE_SIDE_LABEL, drawing: null,
                   references: [], standardPart: false, note: null, thumb: null,
                   meshed: false };
        }
        return partBlock(topoProj, partId, opts.crops);
      }),
      binding: {
        wanted: !node.source_ref,
        meshed: adjacent.some(function (partId) {
          return partId !== null && VA.partHasMesh(topoProj, partId);
        }),
        params: null,
      },
      contribution: null,
    };
  }

  // The options every record of one page state shares, derived once.
  function recordOptions(opts) {
    opts = opts || {};
    var out = {
      crops: opts.crops || null,
      study: opts.study || null,
      chain: VA.chainIndex(opts.study || null),
      bandEdges: opts.bandEdges || null,
      kinematicRows: null,
      kinematicStops: null,
    };
    if (opts.kinematicStudy && opts.topoProj && VA.kinematicTable) {
      var table = VA.kinematicTable(opts.kinematicStudy, opts.topoProj, opts.decimals);
      out.kinematicRows = {};
      out.kinematicStops = table.stops;
      table.rows.forEach(function (row) { out.kinematicRows[row.edge] = row; });
      table.groups.forEach(function (group) {
        (group.children || []).forEach(function (row) {
          if (!out.kinematicRows[row.edge]) out.kinematicRows[row.edge] = row;
        });
      });
    }
    return out;
  }

  // The one record for `key` on this page state, or null for a key that names
  // no element (a study group's hover, a dangling id). `opts`:
  //   crops           the crop index (crops.json)
  //   study           the active chain study, for its contribution
  //   kinematicStudy  the active kinematic study, for its contributor row
  //   decimals        that study's display precision
  //   bandEdges       {edgeId: edgeId} a kinematic contributor's borrowed band
  VA.elementRecord = function (topoProj, key, opts) {
    var parsed = VA.parseElementKey(key);
    if (!topoProj || !parsed) return null;
    var o = recordOptions(Object.assign({ topoProj: topoProj }, opts || {}));
    return parsed.kind === "node"
      ? nodeRecord(topoProj, parsed.id, o)
      : edgeRecord(topoProj, parsed.id, o);
  };

  // Every element's record, keyed, built once per page state. Memoised on the
  // identity of its inputs: hovering re-reads a record and never rebuilds one.
  var memo = null;
  VA.elementRecords = function (topoProj, opts) {
    opts = opts || {};
    if (memo && memo.topoProj === topoProj && memo.crops === (opts.crops || null) &&
        memo.study === (opts.study || null) &&
        memo.kinematicStudy === (opts.kinematicStudy || null) &&
        memo.bandEdges === (opts.bandEdges || null)) {
      return memo.records;
    }
    var records = {};
    if (topoProj) {
      var o = recordOptions(Object.assign({ topoProj: topoProj }, opts));
      (topoProj.nodes || []).forEach(function (node) {
        records[VA.elementKey("node", node.id)] = nodeRecord(topoProj, node.id, o);
      });
      (topoProj.edges || []).forEach(function (edge) {
        records[VA.elementKey("edge", edge.id)] = edgeRecord(topoProj, edge.id, o);
      });
    }
    memo = { topoProj: topoProj, crops: opts.crops || null, study: opts.study || null,
             kinematicStudy: opts.kinematicStudy || null,
             bandEdges: opts.bandEdges || null, records: records };
    return records;
  };
})(window.ViewerApp = window.ViewerApp || {});
