// The joint glyphs: one SVG <symbol> per kind of contact a gap edge crosses
// (the_dag_draws_bodies_as_containers_and_joints_as_symbols, 2026-10-26).
//
// The words are tolerance_stack/topology.py's INTERFACE_KINDS, read through
// the generated vocabulary, so a word added in Python and drawn nowhere
// throws when the page loads (VOCAB.table compares the key set); the symbol
// ids below are enumerated against the same constant by
// tests/test_topology_projection.py. The form mark (docs/SOP_TOLERANCE_STACK.md,
// "A form callout") is the seventh symbol and is not a contact kind.
//
// A glyph is a picture, so its size is a pixel constant beside the alert
// mark's (docs/DESIGN_TYPE_AND_COLOUR.md, "Where the numbers are"), not a step
// on the type scale. Every shape is a stroke in a 12-unit box centred on 0, 0
// and carries no colour of its own: the view gives the <use> the bar's own
// confidence class, so a glyph is always the colour of the bar it sits on.

(function (VA, VOCAB) {
  "use strict";

  VA.INTERFACE_GLYPH_PX = 12;

  // Each symbol as primitives -- [tag, attributes] -- rather than markup, so
  // the node fast tier's DOM shim builds them the same way a browser does.
  VA.INTERFACE_GLYPHS = VOCAB.table("INTERFACE_KINDS", {
    planar: {
      label: "flat faces",
      // two parallel bars, like a capacitor
      shapes: [["line", { x1: -5, y1: -2, x2: 5, y2: -2 }],
               ["line", { x1: -5, y1: 2, x2: 5, y2: 2 }]],
    },
    pin_in_bore: {
      label: "a pin in a bore",
      // a dot in a ring
      shapes: [["circle", { cx: 0, cy: 0, r: 4.5 }],
               ["circle", { cx: 0, cy: 0, r: 1.2, "class": "glyph__solid" }]],
    },
    spherical: {
      label: "a ball joint",
      // a ball in a cup
      shapes: [["circle", { cx: 0, cy: -1, r: 2.6 }],
               ["path", { d: "M -5 -1 A 5 5 0 0 0 5 -1" }]],
    },
    cylindrical_slide: {
      label: "a slide",
      // a dot in a ring, with a double-headed arrow along the slide
      shapes: [["circle", { cx: 0, cy: 0, r: 3 }],
               ["circle", { cx: 0, cy: 0, r: 0.9, "class": "glyph__solid" }],
               ["path", { d: "M -5.5 -3 L -5.5 3 M -5.5 -3 L -6.6 -1.6 M -5.5 -3 L -4.4 -1.6" +
                             " M -5.5 3 L -6.6 1.6 M -5.5 3 L -4.4 1.6" }]],
    },
    thread: {
      label: "a thread",
      // a short helix
      shapes: [["path", { d: "M -4 -5 L 4 -3 M -4 -2 L 4 0 M -4 1 L 4 3 M -4 4 L 4 6" }],
               ["line", { x1: -4, y1: -5, x2: -4, y2: 4 }],
               ["line", { x1: 4, y1: -3, x2: 4, y2: 6 }]],
    },
    clearance: {
      label: "a clearance",
      // two bars with a gap between them
      shapes: [["line", { x1: -5, y1: -3.5, x2: 5, y2: -3.5 }],
               ["line", { x1: -5, y1: 3.5, x2: 5, y2: 3.5 }]],
    },
  });

  // The rough-surface squiggle a form callout wears: on its edge's bar for an
  // element, beside the node for a modifier.
  VA.FORM_GLYPH = {
    label: "a form callout",
    shapes: [["path", { d: "M -5 0 Q -3.75 -3 -2.5 0 T 0 0 T 2.5 0 T 5 0" }]],
  };

  VA.FORM_GLYPH_ID = "glyph-form";

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
    var sym = node("symbol", { id: id, viewBox: "-7 -7 14 14", overflow: "visible" });
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

  // One placed glyph: a <use> of symbol `id`, centred on (x, y).
  VA.glyphUse = function (id, x, y, className) {
    var s = VA.INTERFACE_GLYPH_PX;
    var use = node("use", {
      href: "#" + id, x: x - s / 2, y: y - s / 2, width: s, height: s,
    });
    if (className) use.setAttribute("class", className);
    use.setAttribute("data-glyph", id);
    return use;
  };
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
