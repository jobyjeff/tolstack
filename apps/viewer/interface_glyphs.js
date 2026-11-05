// The joint glyphs: one SVG <symbol> per kind of contact a gap edge crosses
// (the_dag_draws_bodies_as_containers_and_joints_as_symbols, 2026-10-26), and
// since the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit (2026-11-04)
// the glyph IS the node: an interface at an end of a joint edge is drawn as
// that joint's picture instead of the plain dot, and no glyph sits on an edge.
//
// The words are tolerance_stack/topology.py's INTERFACE_KINDS, read through
// the generated vocabulary, so a word added in Python and drawn nowhere
// throws when the page loads (VOCAB.table compares the key set); the symbol
// ids below are enumerated against the same constant by
// tests/test_topology_projection.py. The form mark (docs/SOP_TOLERANCE_STACK.md,
// "A form callout") is the seventh symbol and is not a contact kind.
//
// A glyph is a picture, so its size is a pixel constant (docs/
// DESIGN_TYPE_AND_COLOUR.md, "Where the numbers are"), not a step on the type
// scale: drawn in a box of INTERFACE_GLYPH_PX units centred on 0, 0 and
// placed at the row pitch, so at the comfortable pitch one unit is one pixel.
// Shapes carry no colour of their own. A ring takes the node's fill and its
// outline the node's ink (`currentColor`, which the node's state classes set);
// a solid part is filled with the ink. Three shape classes say which, and
// topology.css styles them by class alone -- a selector cannot reach through
// a <use> to the node it stands for.

(function (VA, VOCAB) {
  "use strict";

  VA.INTERFACE_GLYPH_PX = 26;

  // Each symbol as primitives -- [tag, attributes] -- rather than markup, so
  // the node fast tier's DOM shim builds them the same way a browser does.
  // Drawn after mock-up C (dispatch/docs/strategy/drafts/mockups/
  // dag_iconography/), narrowed to stay inside one column gutter.
  var RING = "glyph__ring";
  var SOLID = "glyph__solid";
  var LINE = "glyph__line";
  VA.INTERFACE_GLYPHS = VOCAB.table("INTERFACE_KINDS", {
    planar: {
      label: "flat faces",
      // one solid bar
      shapes: [["rect", { x: -8, y: -2.5, width: 16, height: 5, rx: 1, "class": SOLID }]],
    },
    pin_in_bore: {
      label: "a pin in a bore",
      // a ring with its axis through it
      shapes: [["circle", { cx: 0, cy: 0, r: 7, "class": RING }],
               ["line", { x1: -10, y1: 0, x2: 10, y2: 0, "class": LINE }]],
    },
    spherical: {
      label: "a ball joint",
      // a ring with a centre dot
      shapes: [["circle", { cx: 0, cy: 0, r: 7, "class": RING }],
               ["circle", { cx: 0, cy: 0, r: 2.4, "class": SOLID }]],
    },
    cylindrical_slide: {
      label: "a slide",
      // a hollow bar, with a double-headed arrow along the slide
      shapes: [["rect", { x: -7, y: -3, width: 14, height: 6, rx: 1, "class": RING }],
               ["path", { d: "M -11 -7 V 7 M -11 -7 l -2 3 M -11 -7 l 2 3" +
                             " M -11 7 l -2 -3 M -11 7 l 2 -3", "class": LINE }]],
    },
    thread: {
      label: "a thread",
      // a hollow block crossed by the flanks
      shapes: [["rect", { x: -6, y: -6, width: 12, height: 12, rx: 1, "class": RING }],
               ["path", { d: "M -6 -2 L 6 -6 M -6 2 L 6 -2 M -6 6 L 6 2", "class": LINE }]],
    },
    clearance: {
      label: "a clearance",
      // two bars with a gap between them
      shapes: [["rect", { x: -8, y: -6, width: 16, height: 12, "class": RING + " glyph__mask" }],
               ["rect", { x: -8, y: -6, width: 16, height: 3, "class": SOLID }],
               ["rect", { x: -8, y: 3, width: 16, height: 3, "class": SOLID }]],
    },
  });

  // Which glyph a node wears when it is an end of joints of two kinds -- a
  // ball centre that is also the bearing's pin, a bore two slides share: the
  // first of these. A joint that moves (a ball, a slide) says more about the
  // interface than a seat does, and a clearance least. Every INTERFACE_KINDS
  // word, once; the fast tier pairs the two.
  VA.NODE_GLYPH_PRECEDENCE = ["spherical", "cylindrical_slide", "pin_in_bore", "thread",
    "planar", "clearance"];

  // The one place that says which glyph a node is drawn as: {nodeId: kind}
  // for every node at an end of an edge that states an `interface` with a
  // glyph; a node absent from it is the plain dot. Read off the edges alone --
  // no node declares an interface word.
  VA.nodeJointKinds = function (topoProj) {
    var rank = {};
    VA.NODE_GLYPH_PRECEDENCE.forEach(function (kind, i) { rank[kind] = i; });
    var out = {};
    ((topoProj && topoProj.edges) || []).forEach(function (edge) {
      var kind = edge.interface;
      if (!kind || !VA.INTERFACE_GLYPHS[kind]) return;
      [edge.from, edge.to].forEach(function (id) {
        if (id && (out[id] === undefined || rank[kind] < rank[out[id]])) out[id] = kind;
      });
    });
    return out;
  };

  // The rough-surface squiggle a form callout wears: beside its edge's bar for
  // an element, beside the node for a modifier -- never on a stroke.
  VA.FORM_GLYPH_PX = 12;
  VA.FORM_GLYPH = {
    label: "a form callout",
    box: 14,
    shapes: [["path", { d: "M -5 0 Q -3.75 -3 -2.5 0 T 0 0 T 2.5 0 T 5 0" }]],
  };

  VA.FORM_GLYPH_ID = "glyph-form";

  // A joint node's target radius at the current row pitch: its ring's. The
  // bars reach a few units further, but a target that wide would cover the
  // rail on either side of the node, and a rail must keep a point a pointer
  // can reach between two nodes (the browser tier walks every one).
  VA.jointNodeTargetR = function (metrics) {
    return metrics.rowHeight * 7 / VA.INTERFACE_GLYPH_PX;
  };

  VA.interfaceGlyphId = function (kind) { return "glyph-" + kind; };

  function node(tag, attrs) {
    var el = document.createElementNS
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, String(attrs[key]));
    });
    return el;
  }

  function symbol(id, glyph) {
    var h = (glyph.box || VA.INTERFACE_GLYPH_PX) / 2;
    var sym = node("symbol", { id: id, viewBox: [-h, -h, 2 * h, 2 * h].join(" "),
                               overflow: "visible" });
    glyph.shapes.forEach(function (shape) { sym.appendChild(node(shape[0], shape[1])); });
    return sym;
  }

  // The <defs> a rails SVG carries once: every contact kind's symbol and the
  // form mark's, in VA.INTERFACE_KINDS order.
  VA.interfaceGlyphDefs = function () {
    var defs = node("defs", {});
    Object.keys(VA.INTERFACE_GLYPHS).forEach(function (kind) {
      defs.appendChild(symbol(VA.interfaceGlyphId(kind), VA.INTERFACE_GLYPHS[kind]));
    });
    defs.appendChild(symbol(VA.FORM_GLYPH_ID, VA.FORM_GLYPH));
    return defs;
  };

  // One placed glyph: a <use> of symbol `id`, centred on (x, y), `px` wide
  // (the form mark's own size when omitted).
  VA.glyphUse = function (id, x, y, className, px) {
    var s = px || VA.FORM_GLYPH_PX;
    var use = node("use", {
      href: "#" + id, x: x - s / 2, y: y - s / 2, width: s, height: s,
    });
    if (className) use.setAttribute("class", className);
    use.setAttribute("data-glyph", id);
    return use;
  };
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
