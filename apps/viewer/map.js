// The map's layout -- the tube map of a model, as pure functions
// (the_map_draws_the_end_stop_model, 2026-11-15; Jeff, 2026-11-10: "Yes I
// like your tube map", with his own sketch). The map is a SECOND DRAWING OF
// THE SAME MODEL, never a second model: everything here is read off the
// model view (`topoProj.model`, tolerance_stack/model_view.py) and one
// authored layout file beside the model (`topoProj.map`,
// docs/topologies/map_<model id>.json), and nothing is read off the present
// DAG's `layout {columns, rows, rails}`.
//
// What is AUTHORED is a part's place on a coarse grid -- `places: {part:
// [col, row]}`, one entry per top-level part. Everything else is computed:
//
//   * a box's size from how many pins each of its sides carries;
//   * which side a pin sits on, from where its counterpart's cell is;
//   * a body's district from the cells its parts occupy;
//   * an assembly's outline round its own box and its children's;
//   * routes on 0 / 45 / 90 degrees, and a joint with several constraints
//     as parallel routes between parallel pins -- a bundle.
//
// A part with a parent and no place of its own sits in its parent's cell,
// as a small box under the parent's: a bearing with no features is an empty
// box inside its link's outline. A part with no place at all is a layout
// defect, and `notes` says so -- the drawing never silently drops a part,
// since the suite counts what it draws against `model.counts`.
//
// Pure: no DOM here. apps/viewer/views/map.js draws the geometry this
// returns, and the fast tier reads the geometry directly. Classic script,
// the same reason every other file here is (file://).
(function (VA, VOCAB) {
  "use strict";

  // --- Map . Classic ------------------------------------------------------
  //
  // One two-way control in the DAG region's own header. The map is the
  // default where the model has a layout; a model with none has no map, and
  // the switch says so in two words (VA.NO_MAP_LABEL) rather than offering
  // a drawing that does not exist. Remembered the way the pane view is
  // (VA.PANE_VIEW_KEY): one key, read at boot.
  VA.DAG_DRAWINGS = {
    map: { label: "Map", title: "The model as a map: bodies as districts, a box round every part, pins where parts meet" },
    classic: { label: "Classic", title: "The walk on its rails, as the page drew it before the map" },
  };
  VA.DAG_DRAWING_ORDER = ["map", "classic"];
  VA.DEFAULT_DAG_DRAWING = "map";
  VA.DAG_DRAWING_KEY = "tolstack.viewer.dagDrawing";
  VA.NO_MAP_LABEL = "No map";

  VA.isDagDrawing = function (id) {
    return Object.prototype.hasOwnProperty.call(VA.DAG_DRAWINGS, id);
  };

  VA.readStoredDagDrawing = function (store) {
    try {
      var raw = store && store.getItem(VA.DAG_DRAWING_KEY);
      return raw && VA.isDagDrawing(raw) ? raw : null;
    } catch (err) {
      return null;
    }
  };

  VA.writeStoredDagDrawing = function (store, id) {
    try {
      if (store && VA.isDagDrawing(id)) store.setItem(VA.DAG_DRAWING_KEY, id);
    } catch (err) {
      // A browser that refuses to store it still switches for this session.
    }
  };

  // Whether a projected topology ships a layout the map can draw from.
  VA.topologyHasMap = function (topoProj) {
    var doc = topoProj && topoProj.map;
    return !!(doc && doc.places && Object.keys(doc.places).length && topoProj.model);
  };

  // The drawing the region shows: the reader's choice where the model has a
  // map, Classic where it has none. That is data, not a branch on a model's
  // shape -- v1 has no layout file today and draws Classic.
  VA.dagDrawingFor = function (choice, topoProj) {
    if (!VA.topologyHasMap(topoProj)) return "classic";
    return VA.isDagDrawing(choice) ? choice : VA.DEFAULT_DAG_DRAWING;
  };

  // --- the constants ------------------------------------------------------
  //
  // World units: pixels at zoom 1, sized for the DAG view's region at
  // 3840x2160 (2390 x 2160); the page fits the drawing to whatever region
  // it has (VA.mapFitView) and the reader zooms from there. A picture's
  // sizes are pixel constants, not steps on the type scale (docs/
  // DESIGN_TYPE_AND_COLOUR.md, "Where the numbers are").
  VA.MAP = Object.freeze({
    // One authored cell. Wide, like both sketches: a box is centred in its
    // cell, and the room round it is where routes and symbols go.
    cell: Object.freeze({ w: 420, h: 340 }),
    // A part's box: never smaller than this, wider or taller as its pins
    // need (`pad` is the room between a corner and the first pin).
    box: Object.freeze({ minW: 270, minH: 104, pad: 26, radius: 6 }),
    // Pins on one side are this far apart; a bundle's routes leave parallel
    // pins, so this is also the bundle's gap.
    pinPitch: 44,
    pinR: 7,
    // How far a route leaves its pin, square to the side, before it turns.
    stub: 30,
    // The joint symbols, large (Jeff: the present ones are "a bit small and
    // hard to make out"): drawn in a box this wide, centred on the route.
    symbol: 40,
    // A body's district hugs its parts' boxes by `pad`, and never reaches
    // past its cells' union inset by `inset` -- so two adjacent bodies'
    // districts are at least twice the inset apart, and a district with
    // one small part is small.
    district: Object.freeze({ inset: 24, pad: 46, radius: 12 }),
    // An assembly's outline round its own box and its children's.
    assembly: Object.freeze({ pad: 12, radius: 8 }),
    // A child part with no place of its own: a small box under its parent's
    // (`clear` is how far it keeps from a route leaving the parent's bottom).
    child: Object.freeze({ w: 150, h: 50, gap: 12, clear: 16 }),
    // Type, in world units (SVG attributes, scaled with the drawing).
    font: Object.freeze({ body: 18, part: 17, number: 15, pin: 13, child: 12 }),
    // A part's name block: `inset` from the box's border, `clear` from any
    // jumper or mark; `grow` is how much taller a box is drawn, at a time,
    // when no corner of it has room for the name.
    name: Object.freeze({ inset: 10, clear: 6, grow: 24, tries: 8 }),
    margin: 40,
  });

  // --- the symbol table ---------------------------------------------------
  //
  // One symbol per way two parts meet, drawn LARGE on the connector between
  // two pins (Jeff, 2026-11-10): planar / a seat = the capacitor mark,
  // boss-in-hole = a closed circle and a dot, spherical = cup and ball, a
  // fastener pattern (clocking) = a ring of dots. The model's other kinds
  // keep the present design's pictures (apps/viewer/interface_glyphs.js) at
  // the same large size. The six INTERFACE_KINDS come through the generated
  // vocabulary so a word added in Python and drawn nowhere throws at load;
  // `contact` is the model view's word for a node two parts share
  // (model_view.CONTACT_KIND), and `pattern` is the map's own: the model has
  // no interface word for a fastener pattern yet, so the layout file names
  // which constraint is one (`symbols: {interface id: "pattern"}`) until it
  // does.
  //
  // Shapes are primitives -- [tag, attrs] -- in a box of VA.MAP.symbol units
  // centred on 0, 0 with the route running along +x, so the DOM shim builds
  // them the way a browser does. `mask` says whether the route is broken
  // under the symbol (a capacitor's plates interrupt the line; a ring sits
  // on it).
  var RING = "map__sym-ring";
  var SOLID = "map__sym-solid";
  var LINE = "map__sym-line";
  var kinds = VOCAB.table("INTERFACE_KINDS", {
    planar: {
      label: "flat faces",
      mask: true,
      shapes: [["line", { x1: -5, y1: -15, x2: -5, y2: 15, "class": LINE + " map__sym-plate" }],
               ["line", { x1: 5, y1: -15, x2: 5, y2: 15, "class": LINE + " map__sym-plate" }]],
    },
    pin_in_bore: {
      label: "a boss in a bore",
      mask: true,
      shapes: [["circle", { cx: 0, cy: 0, r: 13, "class": RING }],
               ["circle", { cx: 0, cy: 0, r: 4, "class": SOLID }]],
    },
    spherical: {
      label: "a ball joint",
      mask: true,
      // the cup, open towards the far end, and the ball in it
      shapes: [["path", { d: "M 8 -13 A 14 14 0 1 0 8 13", "class": LINE + " map__sym-cup" }],
               ["circle", { cx: -1, cy: 0, r: 6.5, "class": SOLID }]],
    },
    cylindrical_slide: {
      label: "a slide",
      mask: true,
      shapes: [["rect", { x: -11, y: -6, width: 22, height: 12, rx: 2, "class": RING }],
               ["path", { d: "M -17 -13 H 17 M -17 -13 l 4 -3 M -17 -13 l 4 3" +
                             " M 17 -13 l -4 -3 M 17 -13 l -4 3", "class": LINE }]],
    },
    thread: {
      label: "a thread",
      mask: true,
      shapes: [["rect", { x: -10, y: -10, width: 20, height: 20, rx: 2, "class": RING }],
               ["path", { d: "M -10 -3 L 10 -10 M -10 4 L 10 -3 M -10 10 L 10 4", "class": LINE }]],
    },
    clearance: {
      label: "a clearance",
      mask: true,
      // two stops with the travel between them
      shapes: [["line", { x1: -12, y1: -14, x2: -12, y2: 14, "class": LINE + " map__sym-stop" }],
               ["line", { x1: 12, y1: -14, x2: 12, y2: 14, "class": LINE + " map__sym-stop" }],
               ["path", { d: "M -9 0 H 9 M -9 0 l 4 -3 M -9 0 l 4 3 M 9 0 l -4 -3 M 9 0 l -4 3",
                          "class": LINE }]],
    },
  });
  VA.MAP_SYMBOLS = Object.freeze(Object.assign({}, kinds, {
    contact: {
      label: "a seat: two faces together",
      mask: true,
      shapes: kinds.planar.shapes,
    },
    pattern: {
      label: "a fastener pattern",
      mask: true,
      shapes: [0, 1, 2, 3, 4, 5].map(function (i) {
        var a = i * Math.PI / 3;
        return ["circle", { cx: +(12 * Math.cos(a)).toFixed(2), cy: +(12 * Math.sin(a)).toFixed(2),
                            r: 3, "class": SOLID }];
      }).concat([["circle", { cx: 0, cy: 0, r: 12, "class": RING + " map__sym-faint" }]]),
    },
  }));

  // The symbol an interface is drawn with: the layout file's word for it
  // where it names one, else its kind. An unknown word is a layout defect
  // and is reported, not drawn as something else.
  VA.mapSymbolOf = function (iface, doc) {
    var named = doc && doc.symbols && doc.symbols[iface.id];
    if (named) return VA.MAP_SYMBOLS[named] ? named : null;
    return VA.MAP_SYMBOLS[iface.kind] ? iface.kind : null;
  };

  // --- the layout -----------------------------------------------------------

  var SIDES = ["top", "right", "bottom", "left"];
  var NORMAL = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };

  function cellRect(place, M) {
    return {
      x: M.margin + place[0] * M.cell.w, y: M.margin + place[1] * M.cell.h,
      w: M.cell.w, h: M.cell.h,
    };
  }

  function centre(r) { return { x: r.x + r.w / 2, y: r.y + r.h / 2 }; }

  // Which side of `from`'s cell faces `to`'s: the dominant axis in CELL
  // units, so a wide cell does not bias every neighbour onto a flank; a tie
  // goes to top or bottom, where a box has more room for pins.
  function sideTowards(fromPlace, toPlace) {
    var dx = toPlace[0] - fromPlace[0];
    var dy = toPlace[1] - fromPlace[1];
    if (dx === 0 && dy === 0) return "bottom";
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
    return dy > 0 ? "bottom" : "top";
  }

  function union(rects) {
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    rects.forEach(function (r) {
      x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y);
      x2 = Math.max(x2, r.x + r.w); y2 = Math.max(y2, r.y + r.h);
    });
    return rects.length ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
  }

  function inset(r, d) { return { x: r.x + d, y: r.y + d, w: r.w - 2 * d, h: r.h - 2 * d }; }

  function overlaps(a, b) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  // A route from P1 to P2 on 0 / 45 / 90 degrees: the diagonal first for the
  // shorter axis, then straight (the strategy session's sketch's rule).
  // Straight where the two are aligned.
  function bend(p1, p2) {
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    var d = Math.min(Math.abs(dx), Math.abs(dy));
    if (d < 0.5 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.5) return [p1, p2];
    var sx = Math.sign(dx) * d, sy = Math.sign(dy) * d;
    return [p1, { x: p1.x + sx, y: p1.y + sy }, p2];
  }

  // The route between two pins: out of each pin square to its side, then
  // the bend between the two stub ends.
  function route(a, b, M) {
    var na = NORMAL[a.side], nb = NORMAL[b.side];
    var p1 = { x: a.x + na[0] * M.stub, y: a.y + na[1] * M.stub };
    var p2 = { x: b.x + nb[0] * M.stub, y: b.y + nb[1] * M.stub };
    var mid = bend(p1, p2);
    return [{ x: a.x, y: a.y }].concat(mid, [{ x: b.x, y: b.y }]);
  }

  function pathD(points) {
    return points.map(function (p, i) {
      return (i ? "L" : "M") + round(p.x) + " " + round(p.y);
    }).join(" ");
  }

  function round(n) { return Math.round(n * 100) / 100; }

  // --- a part's name ----------------------------------------------------------
  //
  // One estimate of a glyph's width, shared by the layout (which corner of a
  // box has room for the name) and the drawing (where the lines are cut), so
  // the two cannot disagree. Generous: a proportional face is narrower.
  VA.MAP_GLYPH = 0.56;

  // A string cut to `width` world units at `font`, with an ellipsis -- the
  // whole label is the box's tooltip, so a cut name is always discoverable
  // (Jeff, 2026-10-20).
  VA.mapFitText = function (str, width, font) {
    var room = Math.max(1, Math.floor(width / (font * VA.MAP_GLYPH)));
    if (str.length <= room) return str;
    return str.slice(0, Math.max(1, room - 1)).replace(/\s+$/, "") + "…";
  };

  // ...wrapped onto up to `lines` lines at word boundaries, the last one cut.
  VA.mapWrapText = function (str, width, font, lines) {
    var room = Math.max(1, Math.floor(width / (font * VA.MAP_GLYPH)));
    var words = String(str).split(/\s+/).filter(Boolean);
    var out = [];
    var line = "";
    words.forEach(function (w) {
      var next = line ? line + " " + w : w;
      if (next.length <= room || !line) line = next;
      else { out.push(line); line = w; }
    });
    if (line) out.push(line);
    if (out.length > lines) out = out.slice(0, lines - 1).concat([out.slice(lines - 1).join(" ")]);
    return out.map(function (l) { return VA.mapFitText(l, width, font); });
  };

  // A name block's lines, wrapped to `width`: the number, then the everyday
  // name on up to `lines` lines. Each line is {text, font, kind}.
  function nameLines(box, width, lines, M) {
    var out = [];
    if (box.number) out.push({ text: box.number, font: M.font.number, kind: "number" });
    VA.mapWrapText(box.name || box.label, width, M.font.part, lines).forEach(function (t) {
      out.push({ text: t, font: M.font.part, kind: "name" });
    });
    return out;
  }

  // The block those lines take at a corner of the box: `at` is
  // [horizontal, vertical] -- start | end, top | middle | bottom. Each line
  // gets its baseline; `rect` is the block's extent, the thing the layout
  // keeps every jumper out of.
  function nameBlock(box, lines, at, M) {
    var pad = M.name.inset;
    var lineH = function (l) { return Math.round(l.font * 1.25); };
    var h = lines.reduce(function (s, l) { return s + lineH(l); }, 0);
    var w = lines.reduce(function (m, l) { return Math.max(m, l.text.length * l.font * VA.MAP_GLYPH); }, 0);
    var top = at[1] === "top" ? box.y + pad - 2
      : at[1] === "bottom" ? box.y + box.h - pad - h + 2 : box.y + (box.h - h) / 2;
    var x = at[0] === "start" ? box.x + pad : box.x + box.w - pad;
    var y = top;
    var placed = lines.map(function (l) {
      var baseline = y + l.font * 0.95;
      y += lineH(l);
      return { text: l.text, font: l.font, kind: l.kind, y: round(baseline) };
    });
    return {
      x: round(x), anchor: at[0], lines: placed,
      rect: { x: at[0] === "start" ? x : x - w, y: top, w: w, h: h },
    };
  }

  // The points a jumper's path passes through, for a clearance test: its
  // straight line, or its bow sampled.
  function jumperSamples(j) {
    var out = [];
    for (var i = 0; i <= 24; i++) {
      var t = i / 24, s = 1 - t;
      if (j.ctrl) {
        out.push({ x: s * s * j.a.x + 2 * s * t * j.ctrl.x + t * t * j.b.x,
                   y: s * s * j.a.y + 2 * s * t * j.ctrl.y + t * t * j.b.y });
      } else {
        out.push({ x: j.a.x + (j.b.x - j.a.x) * t, y: j.a.y + (j.b.y - j.a.y) * t });
      }
    }
    return out;
  }

  // Does a polyline through `pts` come within `d` of rect `r`? Checked on
  // each segment against the rect grown by `d` (a segment test, not samples
  // alone, so a steep line cannot slip between two).
  function nearRect(pts, r, d) {
    var g = { x: r.x - d, y: r.y - d, w: r.w + 2 * d, h: r.h + 2 * d };
    for (var i = 1; i < pts.length; i++) {
      if (segmentHitsRect(pts[i - 1], pts[i], g)) return true;
    }
    return false;
  }

  // Liang-Barsky: does segment p-q meet rect r?
  function segmentHitsRect(p, q, r) {
    var t0 = 0, t1 = 1, dx = q.x - p.x, dy = q.y - p.y;
    var edges = [[-dx, p.x - r.x], [dx, r.x + r.w - p.x], [-dy, p.y - r.y], [dy, r.y + r.h - p.y]];
    for (var i = 0; i < 4; i++) {
      var pp = edges[i][0], qq = edges[i][1];
      if (pp === 0) { if (qq < 0) return false; continue; }
      var t = qq / pp;
      if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
    return true;
  }
  VA.mapSegmentHitsRect = segmentHitsRect;

  // Where a part's name sits: the first corner of its box, at the box's
  // width or half of it, whose block keeps `clear` from every jumper, mark
  // and pin of the part. Null when no corner has room.
  var NAME_CORNERS = [["start", "top"], ["end", "top"], ["start", "bottom"], ["end", "bottom"],
                      ["start", "middle"], ["end", "middle"]];
  function placeName(box, jumpers, dots, M) {
    var full = box.w - 2 * M.name.inset;
    var half = box.w / 2 - M.name.inset - M.pinR - M.name.clear;
    var wraps = [[full, 2], [half, 3]];
    for (var w = 0; w < wraps.length; w++) {
      var lines = nameLines(box, wraps[w][0], wraps[w][1], M);
      for (var c = 0; c < NAME_CORNERS.length; c++) {
        var block = nameBlock(box, lines, NAME_CORNERS[c], M);
        var r = block.rect;
        if (r.y < box.y || r.y + r.h > box.y + box.h) continue;
        var hit = jumpers.some(function (j) { return nearRect(jumperSamples(j), r, M.name.clear); }) ||
          dots.some(function (p) {
            return p.x > r.x - M.pinR - M.name.clear && p.x < r.x + r.w + M.pinR + M.name.clear &&
                   p.y > r.y - M.pinR - M.name.clear && p.y < r.y + r.h + M.pinR + M.name.clear;
          });
        if (!hit) return block;
      }
    }
    return null;
  }
  VA.mapJumperSamples = jumperSamples;

  // Where a connector's symbol sits: the point of the route nearest the
  // midpoint between its two pins, and the angle (degrees) of the segment it
  // is on. Between two boxes centred in adjacent cells that midpoint is the
  // gap between the two districts, so a symbol never lands on a border; the
  // point half way along the route did, where a route has a jog.
  function symbolPoint(points, a, b) {
    var target = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var best = null;
    for (var i = 1; i < points.length; i++) {
      var p = points[i - 1], q = points[i];
      var dx = q.x - p.x, dy = q.y - p.y;
      var len2 = dx * dx + dy * dy;
      var t = len2 ? Math.max(0, Math.min(1, ((target.x - p.x) * dx + (target.y - p.y) * dy) / len2)) : 0;
      var x = p.x + dx * t, y = p.y + dy * t;
      var d = Math.hypot(x - target.x, y - target.y);
      if (!best || d < best.d) best = { x: x, y: y, d: d, angle: Math.atan2(dy, dx) * 180 / Math.PI };
    }
    return best || { x: target.x, y: target.y, angle: 0 };
  }

  // Does segment p-q cross rectangle r (a few samples along it)? Enough to
  // report a route drawn through a box it does not end on.
  function crosses(p, q, r) {
    for (var t = 0.05; t < 1; t += 0.05) {
      var x = p.x + (q.x - p.x) * t, y = p.y + (q.y - p.y) * t;
      if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
    }
    return false;
  }

  // THE LAYOUT. `model` is the projection's model block (or the page's model
  // object -- only its arrays are read), `doc` the authored layout file.
  // Returns the geometry views/map.js draws, or null with no layout.
  VA.mapLayout = function (model, doc, metrics) {
    if (!model || !doc || !doc.places) return null;
    var M = metrics || VA.MAP;
    var notes = [];
    var parts = {};
    (model.parts || []).forEach(function (p) { parts[p.id] = p; });
    var features = {};
    (model.features || []).forEach(function (f) { features[f.id] = f; });

    // 1. Every part's cell: its own place, else its parent's (a child with
    //    no place sits in its parent's cell), else a defect.
    var placeOf = {};
    var childless = {};
    (model.parts || []).forEach(function (p) {
      var own = doc.places[p.id];
      if (own && own.length === 2) { placeOf[p.id] = [own[0], own[1]]; return; }
      var up = p.parent;
      while (up && !doc.places[up]) up = parts[up] ? parts[up].parent : null;
      if (up) { placeOf[p.id] = [doc.places[up][0], doc.places[up][1]]; childless[p.id] = up; }
      else notes.push("part " + p.id + " has no place in the layout");
    });
    Object.keys(doc.places).forEach(function (id) {
      if (!parts[id]) notes.push("the layout places " + id + ", which the model has no part for");
    });

    // 2. The interfaces at each feature, and each joint's constraint order.
    var interfacesAt = {};
    var constraintIndex = {};
    (model.joints || []).forEach(function (j) {
      (j.constraints || []).forEach(function (cid, i) { constraintIndex[cid] = i; });
    });
    (model.interfaces || []).forEach(function (iface) {
      (iface.ends || []).forEach(function (fid) {
        (interfacesAt[fid] = interfacesAt[fid] || []).push(iface);
      });
    });

    // 3. Pins: one per feature that ends an interface, on the side of its
    //    part's cell that faces the counterpart's cell. A feature that ends
    //    no interface is an inner mark (a dimension's end on the part alone).
    var pinsOf = {};      // part -> side -> [pin]
    var marksOf = {};     // part -> [mark]
    var pinById = {};
    (model.features || []).forEach(function (f) {
      if (!placeOf[f.part]) return;
      var ifaces = interfacesAt[f.id] || [];
      if (!ifaces.length) {
        (marksOf[f.part] = marksOf[f.part] || []).push({ id: f.id, part: f.part, node: f.node, label: f.name });
        return;
      }
      var first = ifaces[0];
      var farFid = (first.ends || []).filter(function (e) { return e !== f.id; })[0];
      var far = farFid ? features[farFid] : null;
      var farPart = far ? far.part : null;
      var side = farPart && placeOf[farPart] ? sideTowards(placeOf[f.part], placeOf[farPart]) : "bottom";
      var pin = {
        id: f.id, part: f.part, node: f.node, label: f.name, side: side,
        counterpart: farPart,
        // What orders pins along a side: the counterpart's cell along the
        // side's axis, then the constraint's place in its joint, so the two
        // ends of a bundle come out in the same order and run parallel.
        order: [farPart && placeOf[farPart] ? placeOf[farPart][side === "left" || side === "right" ? 1 : 0] : 0,
                constraintIndex[first.id] || 0, f.id],
      };
      pinById[f.id] = pin;
      var bySide = pinsOf[f.part] = pinsOf[f.part] || { top: [], right: [], bottom: [], left: [] };
      bySide[side].push(pin);
    });
    Object.keys(pinsOf).forEach(function (pid) {
      SIDES.forEach(function (side) {
        pinsOf[pid][side].sort(function (a, b) {
          for (var i = 0; i < 3; i++) {
            if (a.order[i] < b.order[i]) return -1;
            if (a.order[i] > b.order[i]) return 1;
          }
          return 0;
        });
      });
    });

    // 4-6. Each part, placed whole: its box sized by its pins and centred in
    //    its cell, its pins along each side, its inner marks, its jumpers,
    //    its children and its name. The name takes the first corner of the
    //    box its jumpers leave clear (the walk of 2026-11-16 found a jumper
    //    struck through three parts' numbers); where no corner has room the
    //    box is drawn taller and the part placed again.
    var boxes = [];
    var boxOf = {};
    var pins = [];
    var marks = [];
    var jumpers = [];
    var childrenInCell = {};
    Object.keys(childless).forEach(function (cid) {
      (childrenInCell[childless[cid]] = childrenInCell[childless[cid]] || []).push(cid);
    });
    var dimsOf = {};
    (model.dimensions || []).forEach(function (d) { (dimsOf[d.part] = dimsOf[d.part] || []).push(d); });

    // Pin coordinates along each side of `box`, centred on the side.
    var pinsAlong = function (box) {
      var out = [];
      var bySide = pinsOf[box.id];
      if (!bySide) return out;
      SIDES.forEach(function (side) {
        var list = bySide[side];
        list.forEach(function (pin, i) {
          var off = (i - (list.length - 1) / 2) * M.pinPitch;
          if (side === "left") { pin.x = box.x; pin.y = box.y + box.h / 2 + off; }
          if (side === "right") { pin.x = box.x + box.w; pin.y = box.y + box.h / 2 + off; }
          if (side === "top") { pin.x = box.x + box.w / 2 + off; pin.y = box.y; }
          if (side === "bottom") { pin.x = box.x + box.w / 2 + off; pin.y = box.y + box.h; }
          pin.x = round(pin.x); pin.y = round(pin.y);
          out.push(pin);
        });
      });
      return out;
    };
    // Inner marks: spread along the box's middle.
    var marksAlong = function (box) {
      var list = marksOf[box.id] || [];
      list.forEach(function (mark, i) {
        mark.x = round(box.x + box.w * (i + 1) / (list.length + 1));
        mark.y = round(box.y + box.h / 2);
      });
      return list.slice();
    };
    // A part's jumpers: one per dimension, between the two ends it measures.
    // Two ends on one side bow into the box so the line is not lost in it.
    var jumpersOf = function (pid, ends) {
      var out = [];
      (dimsOf[pid] || []).forEach(function (d) {
        var a = ends[d.from], b = ends[d.to];
        if (!a || !b) return;
        var j = { id: d.id, part: d.part, name: d.name, from: d.from, to: d.to,
                  a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, ctrl: null,
                  mid: { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) } };
        if (a.side && a.side === b.side) {
          var n = NORMAL[a.side];
          var bow = Math.max(24, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
          j.ctrl = { x: round((a.x + b.x) / 2 - n[0] * bow), y: round((a.y + b.y) / 2 - n[1] * bow) };
          j.d = "M" + a.x + " " + a.y + " Q" + j.ctrl.x + " " + j.ctrl.y + " " + b.x + " " + b.y;
        } else {
          j.d = pathD([a, b]);
        }
        out.push(j);
      });
      return out;
    };

    (model.parts || []).forEach(function (p) {
      if (!placeOf[p.id] || childless[p.id]) return;
      var cell = cellRect(placeOf[p.id], M);
      var bySide = pinsOf[p.id] || { top: [], right: [], bottom: [], left: [] };
      var across = Math.max(bySide.top.length, bySide.bottom.length);
      var down = Math.max(bySide.left.length, bySide.right.length);
      var w = Math.max(M.box.minW, across * M.pinPitch + 2 * M.box.pad);
      var h0 = Math.max(M.box.minH, down * M.pinPitch + 2 * M.box.pad);
      var kids = childrenInCell[p.id] || [];
      var kidsH = kids.length ? M.child.h + M.child.gap : 0;
      var c = centre(cell);
      var box, ownPins, ownMarks, ownJumpers, name;
      for (var attempt = 0; attempt <= M.name.tries; attempt++) {
        var h = h0 + attempt * M.name.grow;
        box = {
          id: p.id, label: p.label, number: p.number, name: p.name, body: p.body,
          x: c.x - w / 2, y: c.y - (h + kidsH) / 2, w: w, h: h, cell: cell,
        };
        ownPins = pinsAlong(box);
        ownMarks = marksAlong(box);
        var ends = {};
        ownPins.forEach(function (q) { ends[q.id] = q; });
        ownMarks.forEach(function (q) { ends[q.id] = q; });
        ownJumpers = jumpersOf(p.id, ends);
        name = placeName(box, ownJumpers, ownPins.concat(ownMarks), M);
        if (name) break;
      }
      if (!name) {
        notes.push("part " + p.id + "'s name has no room clear of its jumpers");
        name = nameBlock(box, nameLines(box, w - 2 * M.name.inset, 2, M), ["start", "top"], M);
      }
      box.nameBlock = name;
      if (box.w > cell.w - 2 * M.district.inset || box.h + kidsH > cell.h - 2 * M.district.inset) {
        notes.push("part " + p.id + "'s box (" + Math.round(box.w) + " x " + Math.round(box.h + kidsH) +
          ") outgrows its cell");
      }
      boxes.push(box);
      boxOf[p.id] = box;
      Array.prototype.push.apply(pins, ownPins);
      Array.prototype.push.apply(marks, ownMarks);
      Array.prototype.push.apply(jumpers, ownJumpers);
      // The children, in a row under the parent: centred, or -- where routes
      // leave the parent's bottom, as in a column of parts stacked one on
      // the next -- beside those routes, on the side with more room, so no
      // route is drawn through a child it does not end on.
      var rowW = kids.length * M.child.w + (kids.length - 1) * M.child.gap;
      var rowX = c.x - rowW / 2;
      var under = bySide.bottom;
      if (kids.length && under.length) {
        var lo = Math.min.apply(null, under.map(function (q) { return q.x; })) - M.pinR - M.child.clear;
        var hi = Math.max.apply(null, under.map(function (q) { return q.x; })) + M.pinR + M.child.clear;
        var roomL = lo - (cell.x + M.district.inset + M.assembly.pad);
        var roomR = (cell.x + cell.w - M.district.inset - M.assembly.pad) - hi;
        if (roomL >= rowW && roomL >= roomR) rowX = lo - rowW;
        else if (roomR >= rowW) rowX = hi;
      }
      kids.forEach(function (cid, i) {
        var kid = parts[cid];
        var kbox = {
          id: cid, label: kid.label, number: kid.number, name: kid.name, body: kid.body,
          x: rowX + i * (M.child.w + M.child.gap), y: box.y + box.h + M.child.gap,
          w: M.child.w, h: M.child.h, cell: cell, child: true,
        };
        boxes.push(kbox);
        boxOf[cid] = kbox;
        // A child's own features, should it have any, on its own box.
        var kidPins = pinsAlong(kbox), kidMarks = marksAlong(kbox);
        var kidEnds = {};
        kidPins.concat(kidMarks).forEach(function (q) { kidEnds[q.id] = q; });
        Array.prototype.push.apply(pins, kidPins);
        Array.prototype.push.apply(marks, kidMarks);
        Array.prototype.push.apply(jumpers, jumpersOf(cid, kidEnds));
      });
    });
    // A dimension whose ends the map did not place on its own part is a
    // defect, said once.
    var drawn = {};
    jumpers.forEach(function (j) { drawn[j.id] = true; });
    (model.dimensions || []).forEach(function (d) {
      if (!drawn[d.id]) notes.push("dimension " + d.id + " has an end the map did not place");
    });

    // 7. Connectors: one per interface, routed between its two pins, with
    //    its symbol at the middle. A joint's several constraints leave
    //    parallel pins and so run as a bundle.
    var connectors = [];
    (model.interfaces || []).forEach(function (iface) {
      var ends = iface.ends || [];
      var a = pinById[ends[0]], b = pinById[ends[1]];
      if (!a || !b) { notes.push("interface " + iface.id + " has an end the map did not place"); return; }
      var pts = route(a, b, M);
      var symbol = VA.mapSymbolOf(iface, doc);
      // A gap edge that states no interface word is a model gap (the gap
      // list names it), not a layout defect: its connector is drawn bare.
      // A WORD with no symbol is the layout's or the vocabulary's defect.
      var word = (doc.symbols && doc.symbols[iface.id]) || iface.kind;
      if (!symbol && word) notes.push("interface " + iface.id + " has no symbol for " + word);
      var mid = symbolPoint(pts, a, b);
      connectors.push({
        id: iface.id, name: iface.name, kind: iface.kind, joint: iface.joint,
        within: iface.within, parts: iface.parts, ends: ends,
        symbol: symbol, points: pts, d: pathD(pts),
        mid: { x: round(mid.x), y: round(mid.y), angle: round(mid.angle) },
        bundled: (constraintIndex[iface.id] !== undefined) &&
          (model.joints || []).some(function (j) { return j.id === iface.joint && j.constraints.length > 1; }),
      });
      // A route through a box it does not end on is a layout defect.
      for (var i = 1; i < pts.length; i++) {
        boxes.forEach(function (box) {
          if (box.id === a.part || box.id === b.part) return;
          if (crosses(pts[i - 1], pts[i], box)) {
            notes.push("interface " + iface.id + " is routed through " + box.id);
          }
        });
      }
    });

    // 8. Districts: a body's cells, inset. An assembly's outline round its
    //    box and its children's.
    var bodies = [];
    var rectOfBody = {};
    (model.bodies || []).forEach(function (body, i) {
      var members = (body.all_parts || body.parts || []).filter(function (pid) { return placeOf[pid]; });
      var u = union(members.map(function (pid) { return cellRect(placeOf[pid], M); }));
      if (!u) { notes.push("body " + body.id + " has no placed part"); return; }
      // Hug the parts' boxes (and an assembly's outline round its children),
      // within the cells' union inset -- see VA.MAP.district.
      var limit = inset(u, M.district.inset);
      var hug = inset(union(members.map(function (pid) { return boxOf[pid]; }).filter(Boolean)), -M.district.pad);
      var x1 = Math.max(limit.x, hug.x), y1 = Math.max(limit.y, hug.y);
      var x2 = Math.min(limit.x + limit.w, hug.x + hug.w), y2 = Math.min(limit.y + limit.h, hug.y + hug.h);
      var r = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
      rectOfBody[body.id] = r;
      bodies.push({ id: body.id, name: body.name, kind: body.kind, tint: i % (VA.BODY_TINTS || 16),
                    x: r.x, y: r.y, w: r.w, h: r.h, parts: body.all_parts || body.parts || [] });
    });
    bodies.forEach(function (a, i) {
      bodies.slice(i + 1).forEach(function (b) {
        if (overlaps(a, b)) notes.push("bodies " + a.id + " and " + b.id + " overlap");
      });
    });
    // A part's box outside its own body's district is a layout defect too.
    boxes.forEach(function (box) {
      var r = box.body && rectOfBody[box.body];
      if (r && !(box.x >= r.x && box.y >= r.y && box.x + box.w <= r.x + r.w && box.y + box.h <= r.y + r.h)) {
        notes.push("part " + box.id + " is outside its body's district");
      }
    });
    var assemblies = [];
    (model.parts || []).forEach(function (p) {
      if (!(p.children && p.children.length) || !boxOf[p.id]) return;
      var members = [boxOf[p.id]].concat(p.children.map(function (c) { return boxOf[c]; }).filter(Boolean));
      var u = union(members);
      var r = inset(u, -M.assembly.pad);
      assemblies.push({ id: p.id, label: p.label, body: p.body, x: r.x, y: r.y, w: r.w, h: r.h,
                        children: p.children.slice() });
    });

    // 9. The drawing's extent.
    var everything = bodies.concat(boxes, assemblies);
    var b = union(everything) || { x: 0, y: 0, w: 0, h: 0 };
    var bounds = inset(b, -M.margin);

    return {
      topologyId: model.id, metrics: M,
      bodies: bodies, assemblies: assemblies, boxes: boxes, pins: pins, marks: marks,
      jumpers: jumpers, connectors: connectors, bounds: bounds, notes: notes,
    };
  };

  // What the map draws, counted the way `model.counts` counts: districts
  // against bodies, boxes against parts, pins and marks against features,
  // jumpers against dimensions, connectors against interfaces. The suite
  // holds the two equal, so nothing in the model is left undrawn and
  // nothing is drawn twice.
  VA.mapCounts = function (geo) {
    if (!geo) return null;
    return {
      bodies: geo.bodies.length,
      parts: geo.boxes.length,
      features: geo.pins.length + geo.marks.length,
      dimensions: geo.jumpers.length,
      interfaces: geo.connectors.length,
    };
  };

  // The counts the map must match, read off the model's own block.
  VA.mapExpectedCounts = function (model) {
    var c = (model && model.counts) || {};
    return { bodies: c.bodies, parts: c.parts, features: c.features,
             dimensions: c.dimensions, interfaces: c.interfaces };
  };

  // --- the view: fit, zoom, pan (pure) --------------------------------------
  //
  // A view is {k, tx, ty}: world * k + t = screen. The page fits the drawing
  // to its region on the first paint and pans and zooms it from there; the
  // view outlives a repaint but not the page (like the DAG's own zoom).
  VA.MAP_ZOOM = Object.freeze({ min: 0.1, max: 4, step: 1.15, fitMax: 2 });

  VA.mapFitView = function (bounds, width, height) {
    if (!bounds || !(width > 0) || !(height > 0) || !(bounds.w > 0) || !(bounds.h > 0)) {
      return { k: 1, tx: 0, ty: 0 };
    }
    var k = Math.min(width / bounds.w, height / bounds.h, VA.MAP_ZOOM.fitMax);
    k = Math.max(VA.MAP_ZOOM.min, k);
    return {
      k: k,
      tx: (width - bounds.w * k) / 2 - bounds.x * k,
      ty: (height - bounds.h * k) / 2 - bounds.y * k,
    };
  };

  VA.clampMapZoom = function (k) {
    var n = Number(k);
    if (!isFinite(n)) return 1;
    return Math.min(VA.MAP_ZOOM.max, Math.max(VA.MAP_ZOOM.min, n));
  };

  // The view after a wheel at screen point (px, py): the world point under
  // the pointer stays under it.
  VA.mapZoomAt = function (view, deltaY, px, py) {
    var notches = -deltaY / 100;
    var k = VA.clampMapZoom(view.k * Math.pow(VA.MAP_ZOOM.step, notches));
    if (k === view.k) return view;
    var wx = (px - view.tx) / view.k, wy = (py - view.ty) / view.k;
    return { k: k, tx: px - wx * k, ty: py - wy * k };
  };

  VA.mapPan = function (view, dx, dy) {
    return { k: view.k, tx: view.tx + dx, ty: view.ty + dy };
  };

  // The least pan that puts the world rect `r` inside a region of
  // width x height; the view unchanged when it already is.
  VA.mapBringIntoView = function (view, r, width, height, pad) {
    if (!r) return view;
    var p = pad || 0;
    var x1 = r.x * view.k + view.tx, y1 = r.y * view.k + view.ty;
    var x2 = (r.x + r.w) * view.k + view.tx, y2 = (r.y + r.h) * view.k + view.ty;
    var dx = 0, dy = 0;
    if (x1 < p) dx = p - x1;
    else if (x2 > width - p) dx = Math.max(width - p - x2, p - x1);
    if (y1 < p) dy = p - y1;
    else if (y2 > height - p) dy = Math.max(height - p - y2, p - y1);
    if (!dx && !dy) return view;
    return VA.mapPan(view, dx, dy);
  };

  VA.mapTransform = function (view) {
    return "translate(" + round(view.tx) + " " + round(view.ty) + ") scale(" + round(view.k) + ")";
  };

  // --- what an entity lights on the map -------------------------------------
  //
  // The one resolver (VA.focusLightOf) says what an entity lights, in two
  // tiers of entities; the map draws every entity once, keyed by kind and
  // id, so the tiers are the map's keys as they are. `<kind>:<id>`.
  VA.mapLightKeys = function (model, entity) {
    if (!entity) return { own: [], touching: [] };
    var light = model && VA.focusLightOf ? VA.focusLightOf(model, entity) : { own: [entity], touching: [] };
    var key = function (e) { return e.kind + ":" + e.id; };
    return { own: light.own.map(key), touching: light.touching.map(key) };
  };
})(window.ViewerApp = window.ViewerApp || {}, window.TolstackVocab.viewer);
