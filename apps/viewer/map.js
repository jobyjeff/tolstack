// The map's layout -- the tube map of a model, as pure functions
// (the_map_draws_the_end_stop_model, 2026-11-15; Jeff, 2026-11-10: "Yes I
// like your tube map", with his own sketch; the DAG region's one drawing for
// every model since 2026-11-17, Jeff: "let's go ahead and make it
// permanent"). The map is a drawing of the model, never a second model: everything here is read off the
// model view (`topoProj.model`, tolerance_stack/model_view.py) and one
// layout beside the model (`topoProj.map`: the authored
// docs/topologies/map_<model id>.json, or -- for a model with none -- the
// places the builder computes from its bodies, load_topology_map), and
// nothing is read off the walk's `layout {columns, rows, rails}`.
//
// What is AUTHORED is a part's place on a coarse grid -- `places: {part:
// [col, row]}`, one entry per top-level part. Everything else is computed:
//
//   * a box's size from how many pins each of its sides carries;
//   * which side a pin sits on, from where its counterpart's cell is;
//   * a body's district from the cells its parts occupy;
//   * an assembly's outline round its own box and its children's -- and
//     an assembly with no feature of its own (2026-11-19) is its outline
//     alone, named at its top-left, round its parts' boxes wherever their
//     bodies put them (VA.mapOutlined);
//   * routes on 0 / 45 / 90 degrees, and a joint with several constraints
//     as parallel routes between parallel pins -- a bundle.
//
// A part with a parent and no place of its own sits in its parent's cell,
// as a small box under the parent's: a bearing with no features is an empty
// box inside its link's outline. A part of an outline has no box to sit
// under, so it needs a place: the builder gives one to every such part the
// layout file leaves unplaced (load_topology_map). A part with no place at
// all is a layout defect, and `notes` says so -- the drawing never silently
// drops a part, since the suite counts what it draws against `model.counts`.
//
// Pure: no DOM here. apps/viewer/views/map.js draws the geometry this
// returns, and the fast tier reads the geometry directly. Classic script,
// the same reason every other file here is (file://).
(function (VA, VOCAB) {
  "use strict";

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
    // An assembly's outline round its own box and its children's; an
    // assembly with no feature of its own has no box, and its outline takes
    // `label` more room at its top for its name.
    assembly: Object.freeze({ pad: 12, radius: 8, label: 24 }),
    // A child part with no place of its own: a small box under its parent's
    // (`clear` is how far it keeps from a route leaving the parent's bottom).
    // `joined` is how far under its parent a child sits that an interface
    // joins to it: room for the connector's symbol between the two boxes,
    // and more than two stubs, so the drop between them never doubles back.
    child: Object.freeze({ w: 150, h: 50, gap: 12, clear: 16, joined: 64 }),
    // Type, in world units (SVG attributes, scaled with the drawing).
    font: Object.freeze({ body: 18, part: 17, number: 15, pin: 13, child: 12, assembly: 15 }),
    // A part's name block: `inset` from the box's border, `clear` from any
    // jumper or mark; `grow` is how much taller a box is drawn, at a time,
    // when no corner of it has room for the name.
    name: Object.freeze({ inset: 10, clear: 6, grow: 24, tries: 8 }),
    margin: 40,
    // An assembly's own dimension drawn as a dimension: its extension lines
    // run `past` the dimension line, whose arrowheads are `arrow` long.
    dimension: Object.freeze({ past: 10, arrow: 14 }),
    // The layout's budgets for a route it cannot draw plainly (2026-11-19):
    // how many stops beside the grid's corners a route may pass, how many
    // routes through them one connector tries, and
    // how many whole layouts the repair of pin sides tries. Fixed counts, so
    // a model the map cannot draw clean (v1's computed one) costs a bounded
    // time and lays out the same on every machine.
    budget: Object.freeze({ stops: 60, corners: 2000, repairs: 12 }),
  });

  // --- the symbol table ---------------------------------------------------
  //
  // One symbol per way two parts meet, drawn LARGE on the connector between
  // two pins (Jeff, 2026-11-10): planar / a seat = the capacitor mark,
  // boss-in-hole = a closed circle and a dot, spherical = cup and ball, a
  // fastener pattern (clocking) = a ring of dots. The model's other kinds
  // keep their own pictures (below) at the same large size. The INTERFACE_KINDS come through the generated
  // vocabulary so a word added in Python and drawn nowhere throws at load;
  // `contact` is the model view's word for a node two parts share that
  // states none (model_view.CONTACT_KIND). Since 2026-11-17
  // (a_joint_says_what_kind_it_is) a shared node may state its own word --
  // a rotary joint, a fastener pattern -- so every symbol is the model's.
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
    revolute: {
      label: "a rotary joint",
      mask: true,
      // the boss in its hole, with a turning arrow round it: the rotary
      // sibling of the slide's straight double arrow
      shapes: [["circle", { cx: 0, cy: 0, r: 11, "class": RING }],
               ["circle", { cx: 0, cy: 0, r: 3.5, "class": SOLID }],
               ["path", { d: "M -14.72 -8.5 A 17 17 0 0 1 14.72 -8.5 M 14.72 -8.5 L 15.68 -14.83" +
                             " M 14.72 -8.5 L 8.76 -10.83", "class": LINE }]],
    },
    fastener_pattern: {
      label: "a fastener pattern",
      mask: true,
      shapes: [0, 1, 2, 3, 4, 5].map(function (i) {
        var a = i * Math.PI / 3;
        return ["circle", { cx: +(12 * Math.cos(a)).toFixed(2), cy: +(12 * Math.sin(a)).toFixed(2),
                            r: 3, "class": SOLID }];
      }).concat([["circle", { cx: 0, cy: 0, r: 12, "class": RING + " map__sym-faint" }]]),
    },
    // a bushing held in its bore by interference: the boss fills the hole
    press_fit: {
      label: "a press fit",
      mask: true,
      shapes: [["circle", { cx: 0, cy: 0, r: 13, "class": RING }],
               ["circle", { cx: 0, cy: 0, r: 10, "class": SOLID }]],
    },
    // a bushing whose fit may close either way: the boss in the hole with a
    // faint ring for the band it may sit anywhere in
    transition_fit: {
      label: "a transition fit",
      mask: true,
      shapes: [["circle", { cx: 0, cy: 0, r: 13, "class": RING }],
               ["circle", { cx: 0, cy: 0, r: 9.5, "class": RING + " map__sym-faint" }],
               ["circle", { cx: 0, cy: 0, r: 6, "class": SOLID }]],
    },
  });
  VA.MAP_SYMBOLS = Object.freeze(Object.assign({}, kinds, {
    contact: {
      label: "a seat: two faces together",
      mask: true,
      shapes: kinds.planar.shapes,
    },
  }));

  // The symbol an interface is drawn with: its kind, and nothing else. An
  // unknown word is the vocabulary's defect and is reported, not drawn as
  // something else.
  VA.mapSymbolOf = function (iface) {
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
  // Straight where the two are aligned. `late` puts the straight run first
  // and the diagonal last: the layout's second try where the first one
  // crosses a box.
  function bend(p1, p2, late) {
    var dx = p2.x - p1.x, dy = p2.y - p1.y;
    var d = Math.min(Math.abs(dx), Math.abs(dy));
    if (d < 0.5 || Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.5) return [p1, p2];
    var sx = Math.sign(dx) * d, sy = Math.sign(dy) * d;
    if (late) return [p1, { x: p2.x - sx, y: p2.y - sy }, p2];
    return [p1, { x: p1.x + sx, y: p1.y + sy }, p2];
  }

  // The route between two pins: out of each pin square to its side, then
  // the bend between the two stub ends.
  function route(a, b, M, late) {
    var na = NORMAL[a.side], nb = NORMAL[b.side];
    var p1 = { x: a.x + na[0] * M.stub, y: a.y + na[1] * M.stub };
    var p2 = { x: b.x + nb[0] * M.stub, y: b.y + nb[1] * M.stub };
    var mid = bend(p1, p2, late);
    return [{ x: a.x, y: a.y }].concat(mid, [{ x: b.x, y: b.y }]);
  }

  // A route between two pins through one or two corners of the cell grid
  // -- the free space where four cells meet, or a symbol's width beside one
  // (a symbol between two neighbours sits on the grid line) -- each leg a
  // bend either way round: the layout's last try for a plain route that
  // crosses a box (a child under its parent, boxed in by the part beside
  // it). The shortest that `clean` accepts, tried in order of the straight
  // line's length, which no route through the same stops can beat; null
  // when none is.
  function viaCorners(a, b, M, cells, clean) {
    var ends = route(a, b, M);
    var p1 = ends[1], p2 = ends[ends.length - 2];
    var stops = [];
    var near = [-M.symbol, 0, M.symbol];
    for (var i = 0; i <= cells[0]; i++) {
      for (var j = 0; j <= cells[1]; j++) {
        var x = M.margin + i * M.cell.w, y = M.margin + j * M.cell.h;
        if (x < Math.min(p1.x, p2.x) - M.cell.w || x > Math.max(p1.x, p2.x) + M.cell.w ||
            y < Math.min(p1.y, p2.y) - M.cell.h || y > Math.max(p1.y, p2.y) + M.cell.h) continue;
        near.forEach(function (dx) { near.forEach(function (dy) { stops.push({ x: x + dx, y: y + dy }); }); });
      }
    }
    var dist = function (p, q) { return Math.hypot(q.x - p.x, q.y - p.y); };
    // The stops least out of the way, so a wide grid's pairs stay few.
    stops = stops.map(function (c, i) { return { c: c, d: dist(p1, c) + dist(c, p2), i: i }; })
      .sort(function (u, v) { return u.d - v.d || u.i - v.i; }).slice(0, M.budget.stops)
      .map(function (u) { return u.c; });
    var tries = [];
    stops.forEach(function (c) {
      tries.push({ via: [c], bound: dist(p1, c) + dist(c, p2) });
      stops.forEach(function (d) {
        if (c !== d) tries.push({ via: [c, d], bound: dist(p1, c) + dist(c, d) + dist(d, p2) });
      });
    });
    tries.sort(function (u, v) { return u.bound - v.bound; });
    var best = null;
    var spent = 0;
    for (var t = 0; t < tries.length && spent < M.budget.corners; t++) {
      if (best && tries[t].bound >= best.len) break;
      var legs = [p1].concat(tries[t].via, [p2]);
      for (var mask = 0; mask < (1 << (legs.length - 1)); mask++) {
        var pts = [{ x: a.x, y: a.y }, p1];
        for (var k = 1; k < legs.length; k++) {
          pts = pts.concat(bend(legs[k - 1], legs[k], !!(mask & (1 << (k - 1)))).slice(1));
        }
        pts.push({ x: b.x, y: b.y });
        var len = 0;
        for (var n = 1; n < pts.length; n++) len += dist(pts[n - 1], pts[n]);
        if (best && len >= best.len - 0.01) continue;
        spent += 1;
        if (clean(pts)) best = { pts: pts, len: len };
      }
    }
    return best ? best.pts : null;
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
    if (j.via) return [j.a].concat(j.via, [j.b]);
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
    // The strip from the box's start to its first top or bottom pin.
    var across = dots.filter(function (p) { return p.side === "top" || p.side === "bottom"; });
    var strip = across.length ? Math.min.apply(null, across.map(function (p) { return p.x - box.x; })) -
      M.name.inset - M.pinR - M.name.clear : half;
    var wraps = [[full, 2], [half, 3], [strip, 3]];
    for (var w = 0; w < wraps.length; w++) {
      var lines = nameLines(box, wraps[w][0], wraps[w][1], M);
      // The strip takes the name whole or not at all: a word cut short there
      // is a reason to draw the box wider.
      if (w === 2 && lines.filter(function (l) { return l.kind === "name"; })
        .map(function (l) { return l.text; }).join(" ") !== String(box.name || box.label).split(/\s+/).filter(Boolean).join(" ")) continue;
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

  // Does segment p-q cross the inside of rectangle r? Exact, not sampled:
  // samples a twentieth of a long diagonal apart missed it clipping a
  // box's corner (2026-11-19). A route along a border is not inside.
  function crosses(p, q, r) {
    return segmentHitsRect(p, q, inset(r, 1));
  }

  // Do two polylines share a collinear run longer than `min`? Each pair of
  // segments: parallel, on one line -- within a stroke's width, so two
  // routes a unit apart still read as one -- and overlapping along it.
  function sharedRun(pa, pb, min) {
    for (var i = 1; i < pa.length; i++) {
      var p = pa[i - 1], q = pa[i];
      var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
      if (len < 0.5) continue;
      var ux = dx / len, uy = dy / len;
      for (var j = 1; j < pb.length; j++) {
        var r = pb[j - 1], s = pb[j];
        var off = function (pt) { return (pt.x - p.x) * uy - (pt.y - p.y) * ux; };
        if (Math.abs(off(r)) > 2 || Math.abs(off(s)) > 2) continue;
        var t1 = (r.x - p.x) * ux + (r.y - p.y) * uy, t2 = (s.x - p.x) * ux + (s.y - p.y) * uy;
        var overlap = Math.min(len, Math.max(t1, t2)) - Math.max(0, Math.min(t1, t2));
        if (overlap > min) return true;
      }
    }
    return false;
  }

  // Do two polylines meet -- a segment of one passing from one side of a
  // segment of the other to its far side, or a corner of one (past its
  // pins) lying on the other? Each end's signed distance from the other
  // segment's line, with half a unit of slack. A route that turns ON another
  // reads as a branch of it, the way a crossing does (2026-11-22: the
  // straight bushing's stub ended on the lane past it). Two routes on one
  // line are a shared run, said apart.
  function routesCross(pa, pb) {
    var side = function (a, b, c) {
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      return len ? ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / len : 0;
    };
    var apart = function (u, v) { return (u > 0.5 && v < -0.5) || (u < -0.5 && v > 0.5); };
    var onto = function (pts, other) {
      for (var k = 1; k < pts.length - 1; k++) {
        if (nearRect(other, { x: pts[k].x, y: pts[k].y, w: 0, h: 0 }, 1)) return true;
      }
      return false;
    };
    for (var i = 1; i < pa.length; i++) {
      for (var j = 1; j < pb.length; j++) {
        var p = pa[i - 1], q = pa[i], r = pb[j - 1], s = pb[j];
        if (apart(side(r, s, p), side(r, s, q)) && apart(side(p, q, r), side(p, q, s))) return true;
      }
    }
    return onto(pa, pb) || onto(pb, pa);
  }
  VA.mapRoutesCross = routesCross;

  // The boxes a route crosses: any box it does not end on, and one of the
  // two it ends on (`own`) anywhere past its two stubs. [{id, own}]
  function crossedBoxes(pts, own, boxes) {
    var hit = {};
    for (var i = 1; i < pts.length; i++) {
      var stubLeg = i === 1 || i === pts.length - 1;
      boxes.forEach(function (box) {
        var mine = own.indexOf(box.id) !== -1;
        if (mine && stubLeg) return;
        if (crosses(pts[i - 1], pts[i], box)) hit[box.id] = mine;
      });
    }
    return Object.keys(hit).map(function (id) { return { id: id, own: hit[id] }; });
  }

  // What is wrong with the routes as drawn -- the map's route notes, one
  // place: a route through a box it does not end on; one that crosses a box
  // it DOES end on anywhere past its two stubs (2026-11-19: the tangential
  // link's attach bore ran back across the plate's own box); a symbol inside
  // any box (the child under its parent); and two interfaces' routes on one
  // collinear run, which read as one line that forks into branches with no
  // node (Jeff's screenshots of 2026-11-19). A run is shared where two
  // segments lie on one line and overlap by more than a pin's width. And two
  // interfaces' routes that cross (2026-11-22, Jeff: "Minimizing line
  // crossings whenever possible is also helpful"): one note per pair, so
  // the count is the page's; a jumper inside a box is not a route.
  // `connectors` need {id, points, mid, endParts}. Returns {notes, defects:
  // [interface id]}. They fire in tests and on an agent's scoring of a
  // layout, never on the page.
  VA.mapRouteNotes = function (connectors, boxes, M) {
    var notes = [], defects = [];
    var defect = function (id) { if (defects.indexOf(id) === -1) defects.push(id); };
    connectors.forEach(function (c) {
      crossedBoxes(c.points, c.endParts, boxes).forEach(function (hit) {
        notes.push(hit.own ? "interface " + c.id + " crosses " + hit.id + ", a box it ends on, beyond its stub"
          : "interface " + c.id + " is routed through " + hit.id);
        defect(c.id);
      });
      boxes.forEach(function (box) {
        if (c.mid.x > box.x && c.mid.x < box.x + box.w && c.mid.y > box.y && c.mid.y < box.y + box.h) {
          notes.push("interface " + c.id + "'s symbol sits on " + box.id);
          defect(c.id);
        }
      });
    });
    for (var i = 0; i < connectors.length; i++) {
      for (var j = i + 1; j < connectors.length; j++) {
        if (sharedRun(connectors[i].points, connectors[j].points, M.pinR)) {
          notes.push("interfaces " + connectors[i].id + " and " + connectors[j].id + " share a run");
          defect(connectors[i].id);
          defect(connectors[j].id);
        } else if (routesCross(connectors[i].points, connectors[j].points)) {
          notes.push("interfaces " + connectors[i].id + " and " + connectors[j].id + " cross");
          defect(connectors[i].id);
          defect(connectors[j].id);
        }
        [[i, j], [j, i]].forEach(function (pair) {
          var c = connectors[pair[0]], d = connectors[pair[1]];
          if (c.symbol && nearRect(d.points, { x: c.mid.x, y: c.mid.y, w: 0, h: 0 }, M.symbol / 2)) {
            notes.push("interface " + c.id + "'s symbol sits on " + d.id + "'s route");
            defect(c.id);
          }
        });
      }
    }
    return { notes: notes, defects: defects };
  };

  // An assembly the map draws as its outline alone, with no box: a part
  // with parts and no feature of its own -- the assembly tree and the bodies
  // are two groupings of the same parts, so its parts may sit in two
  // districts (an_assembly_is_an_outline_and_its_parts_may_sit_in_two_bodies,
  // 2026-11-19). The builder reads the same rule off the model
  // (build_topology_projection.outlined_assemblies).
  VA.mapOutlined = function (part) {
    return !!(part && part.children && part.children.length && !(part.features && part.features.length));
  };

  // THE LAYOUT. `model` is the projection's model block (or the page's model
  // object -- only its arrays are read), `doc` the authored layout file.
  // Returns the geometry views/map.js draws, or null with no layout.
  //
  // Remembered by the CONTENT of its three inputs, because the page re-draws
  // the map on every study, Groups and Unused click and the layout is a pure
  // function of them: v1's computed map spends its whole repair and corner
  // budget (VA.MAP.budget) and costs ~0.6 s a time, which is what took the
  // viewer's node suite from 19 s to 278 s on 2026-11-21 -- every study's grid
  // re-laid the same map (the_viewer_node_suite_runs_inside_its_default_tier_
  // timeout). Keyed by content, never by identity, so a caller that edits a
  // model in place and lays it out again gets the new layout. The geometry
  // returned is shared between callers and is read, never written.
  var layoutMemo = new Map();
  var LAYOUT_MEMO_SIZE = 16;
  VA.mapLayout = function (model, doc, metrics) {
    if (!model || !doc || !doc.places) return null;
    var M = metrics || VA.MAP;
    var key = null;
    try { key = JSON.stringify([model, doc.places, M]); } catch (_) { key = null; }
    if (key !== null && layoutMemo.has(key)) return layoutMemo.get(key);
    var geo = layOut(model, doc, M);
    if (key !== null) {
      layoutMemo.set(key, geo);
      if (layoutMemo.size > LAYOUT_MEMO_SIZE) layoutMemo.delete(layoutMemo.keys().next().value);
    }
    return geo;
  };

  function layOut(model, doc, M) {
    // Where a route still crosses a box, sits its symbol on one or shares a
    // run, its two pins try the other sides of their parts -- every pair of
    // sides, in the interfaces' id order: a try is kept only where the map's
    // notes fall. Deterministic, and blind to the order of `edges[]`. The
    // tries route plainly; the layout they settle on then routes what is
    // left through the grid's corners, once.
    var turned = {};
    var geo = layoutOnce(model, doc, M, turned, false);
    var tried = {};
    var spent = 0;
    for (var round = 0; round < 8 && geo.defects.length; round++) {
      var better = false;
      geo.defects.slice().sort().forEach(function (pair) {
        if (better || tried[pair.join(" ")]) return;
        tried[pair.join(" ")] = true;
        SIDES.forEach(function (sa) {
          SIDES.forEach(function (sb) {
            if (better || spent >= M.budget.repairs ||
                (geo.sideOf[pair[0]] === sa && geo.sideOf[pair[1]] === sb)) return;
            spent += 1;
            var next = Object.assign({}, turned);
            next[pair[0]] = sa;
            next[pair[1]] = sb;
            var g = layoutOnce(model, doc, M, next, false);
            if (g.notes.length < geo.notes.length) { geo = g; turned = next; better = true; }
          });
        });
      });
      if (!better) break;
    }
    if (geo.defects.length) geo = layoutOnce(model, doc, M, turned, true);
    delete geo.defects;
    delete geo.sideOf;
    return geo;
  }

  // One layout, with `turned` -- {"<interface>|<feature>": side} -- putting
  // a pin on a side of the repair's choosing (VA.mapLayout).
  // `corners` says whether a route that crosses a box tries the grid's
  // corners (viaCorners).
  function layoutOnce(model, doc, M, turned, corners) {
    var notes = [];
    var parts = {};
    (model.parts || []).forEach(function (p) { parts[p.id] = p; });
    var features = {};
    (model.features || []).forEach(function (f) { features[f.id] = f; });

    // 1. Every part's cell: its own place, else its parent's (a child with
    //    no place sits in its parent's cell), else a defect. An outline has
    //    no cell: it is drawn round its parts (step 8), and a part under it
    //    has no box to sit under.
    var outlined = {};
    (model.parts || []).forEach(function (p) { if (VA.mapOutlined(p)) outlined[p.id] = true; });
    var placeOf = {};
    var childless = {};
    (model.parts || []).forEach(function (p) {
      if (outlined[p.id]) return;
      var own = doc.places[p.id];
      if (own && own.length === 2) { placeOf[p.id] = [own[0], own[1]]; return; }
      var up = p.parent;
      while (up && !outlined[up] && !doc.places[up]) up = parts[up] ? parts[up].parent : null;
      if (up && !outlined[up]) { placeOf[p.id] = [doc.places[up][0], doc.places[up][1]]; childless[p.id] = up; }
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
    // Two parts in one column with another part's cell between them: no
    // straight route misses that part (2026-11-17, the upper piston head on
    // the piston body with the lower head between). A feature whose every
    // interface is such a pair takes the column's outer flank, and its route
    // runs beside the parts between (`detour`, step 7). Two parts in one ROW
    // with a part between are the same case on its side (2026-11-18, the
    // pitch plate assembly's bushings in a row beside it): the row's outer
    // flank, top or bottom, and `rowDetour`.
    var rowsIn = {};
    var columnsIn = {};
    Object.keys(placeOf).forEach(function (pid) {
      if (childless[pid]) return;
      (rowsIn[placeOf[pid][0]] = rowsIn[placeOf[pid][0]] || []).push(placeOf[pid][1]);
      (columnsIn[placeOf[pid][1]] = columnsIn[placeOf[pid][1]] || []).push(placeOf[pid][0]);
    });
    var lastColumn = Math.max.apply(null, Object.keys(placeOf).map(function (pid) { return placeOf[pid][0]; }));
    var lastRow = Math.max.apply(null, Object.keys(placeOf).map(function (pid) { return placeOf[pid][1]; }));
    var between = function (list, a, b) {
      return (list || []).some(function (k) { return k > Math.min(a, b) && k < Math.max(a, b); });
    };
    // "column" or "row" for two cells in one column or one row with another
    // part's cell between them, else false.
    var partBetween = function (p, q) {
      if (!p || !q) return false;
      if (p[0] === q[0] && between(rowsIn[p[0]], p[1], q[1])) return "column";
      if (p[1] === q[1] && between(columnsIn[p[1]], p[0], q[0])) return "row";
      return false;
    };
    var flankOf = function (column) { return column >= lastColumn - column ? "right" : "left"; };
    var rowFlankOf = function (row) { return row >= lastRow - row ? "bottom" : "top"; };
    // The flank a detour takes between two parts in one column (or row):
    // the side whose neighbouring column (row) holds fewer parts along the
    // span, so the lane runs past empty cells rather than across the routes
    // of the parts beside it (2026-11-22: the tangential link's flange seat,
    // round its bolt, crossed the straight bushing's routes on the plate
    // side); a tie keeps the side toward the nearer edge of the map.
    var beside = function (p, q, axis, offset) {
      var lo = Math.min(p[1 - axis], q[1 - axis]), hi = Math.max(p[1 - axis], q[1 - axis]);
      return Object.keys(placeOf).filter(function (pid) {
        var c = placeOf[pid];
        return !childless[pid] && c[axis] === p[axis] + offset && c[1 - axis] > lo && c[1 - axis] < hi;
      }).length;
    };
    var detourFlank = function (p, q, way) {
      var axis = way === "column" ? 0 : 1;
      var lower = beside(p, q, axis, -1), upper = beside(p, q, axis, 1);
      var edge = way === "column" ? flankOf(p[0]) : rowFlankOf(p[1]);
      var far = way === "column" ? "right" : "bottom", near = way === "column" ? "left" : "top";
      return lower < upper ? near : upper < lower ? far : edge;
    };
    var farPartOf = function (iface, fid) {
      var other = (iface.ends || []).filter(function (e) { return e !== fid; })[0];
      return other && features[other] ? features[other].part : null;
    };
    // The side a feature's pin for ONE interface sits on (2026-11-19, Jeff:
    // "multiple edges coming out of one node"): toward that interface's own
    // partner, never toward whichever interface came first in `edges[]`.
    //   * a child with no place and its parent share a cell: the parent's
    //     bottom, the child's top -- the child sits under the parent;
    //   * two such children of one parent: the facing flanks of the row;
    //   * a part between, in one column or one row: that line's outer flank;
    //   * else the side of the cell facing the partner's cell -- except a
    //     child's top, which its parent covers: the flank toward the partner.
    var kidIndex = {};
    (model.parts || []).forEach(function (p) {
      if (childless[p.id]) kidIndex[p.id] = Object.keys(kidIndex).filter(function (k) {
        return childless[k] === childless[p.id];
      }).length;
    });
    var sideFor = function (part, far, key) {
      if (turned[key]) return turned[key];
      if (!far || !placeOf[far]) return "bottom";
      if (childless[far] === part) return "bottom";
      if (childless[part] === far) return "top";
      if (childless[part] && childless[part] === childless[far]) return kidIndex[part] < kidIndex[far] ? "right" : "left";
      var way = partBetween(placeOf[part], placeOf[far]);
      if (way) return detourFlank(placeOf[part], placeOf[far], way);
      var side = sideTowards(placeOf[part], placeOf[far]);
      if (side === "top" && childless[part]) {
        return placeOf[far][0] < placeOf[part][0] ? "left" : "right";
      }
      return side;
    };
    // Two partners in one cell column along a side (one line for a top or
    // bottom side, one row for a flank) tie on the first key. The nearer one
    // takes the end of the side toward them, so its route turns off before
    // the farther one's and the two never cross (2026-11-22: ordered by id,
    // the nearer partner's route ran across the farther one's).
    var nearerOutside = function (part, far, side) {
      if (!far || !placeOf[far] || !placeOf[part]) return 0;
      var along = side === "left" || side === "right" ? 1 : 0;
      var off = placeOf[far][along] - placeOf[part][along];
      var depth = Math.abs(placeOf[far][1 - along] - placeOf[part][1 - along]);
      return off > 0 ? -depth : off < 0 ? depth : 0;
    };
    // A bundle that detours round a part between (`detour`, `rowDetour`)
    // leaves both its parts from the same flank, its earlier constraints on
    // the outer lanes. In the same order at both ends the lanes cross at the
    // far one -- the hub's joint to the tangential link mount did, round the
    // mount end's inner race (2026-11-22) -- so the far end, the one further
    // down the column or along the row, takes the order reversed.
    var detourOrder = function (part, far, index) {
      var way = partBetween(placeOf[part], placeOf[far]);
      if (!way) return index;
      var axis = way === "column" ? 1 : 0;
      return placeOf[part][axis] > placeOf[far][axis] ? -index : index;
    };
    var slotOf = {};      // interface id + "|" + feature id -> pin
    var endsOfIface = {};
    (model.interfaces || []).forEach(function (iface) { endsOfIface[iface.id] = iface.ends || []; });
    var otherEnd = function (pin) {
      return endsOfIface[pin.iface].filter(function (e) { return e !== pin.id; })[0];
    };
    (model.features || []).forEach(function (f) {
      if (!placeOf[f.part]) return;
      var ifaces = interfacesAt[f.id] || [];
      if (!ifaces.length) {
        (marksOf[f.part] = marksOf[f.part] || []).push({ id: f.id, part: f.part, node: f.node, label: f.name });
        return;
      }
      // One pin per interface the feature ends: each faces its own partner,
      // and no two routes leave one pin (a shared stub that forks read as a
      // branch with no node). Every pin names the one feature.
      ifaces.forEach(function (iface) {
        var farPart = farPartOf(iface, f.id);
        var side = sideFor(f.part, farPart, iface.id + "|" + f.id);
        var pin = {
          id: f.id, part: f.part, node: f.node, label: f.name, side: side,
          counterpart: farPart, iface: iface.id,
          // A pin toward this part's own child with no place: drawn straight
          // above the child's pin for the same interface (step 4-6).
          toChild: childless[farPart] === f.part ? farPart : null,
          // What orders pins along a side: the counterpart's cell along the
          // side's axis (a child: its place in the row), then between two
          // tied on that the nearer at the end toward them, then the
          // constraint's place in its joint, so the two ends of a bundle come
          // out in the same order and run parallel; then the ids, so the
          // order of `edges[]` never moves a pin.
          order: [farPart && placeOf[farPart] ? placeOf[farPart][side === "left" || side === "right" ? 1 : 0] +
                    (childless[farPart] ? (kidIndex[farPart] + 1) / 100 : 0) : 0,
                  nearerOutside(f.part, farPart, side),
                  detourOrder(f.part, farPart, constraintIndex[iface.id] || 0), f.id, iface.id],
        };
        slotOf[iface.id + "|" + f.id] = pin;
        var bySide = pinsOf[f.part] = pinsOf[f.part] || { top: [], right: [], bottom: [], left: [] };
        bySide[side].push(pin);
      });
    });
    Object.keys(pinsOf).forEach(function (pid) {
      SIDES.forEach(function (side) {
        pinsOf[pid][side].sort(function (a, b) {
          for (var i = 0; i < a.order.length; i++) {
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

    // A side's pins that are spread along it: all but those toward the
    // part's own child, which sit over the child's (step 4-6).
    var spread = function (list) { return list.filter(function (q) { return !q.toChild; }); };
    // Where along a side its pins are centred, in pin steps from the first:
    // the middle of the side, unless some of them meet a partner straight
    // across -- a part in the same row, for a flank; the same column, for the
    // top or bottom -- whose box is centred on the same line. Then those pins
    // are centred, so the route between the two is one straight line
    // (2026-11-22: a link's last ball joint jogged a pin's width where its
    // inner race also carried the flange seat's pin on that side). The box
    // grows to keep the rest of the side's pins on it (`reach`).
    var centreOf = function (part, side, list) {
      var along = side === "left" || side === "right" ? 1 : 0;
      var first = -1, last = -1, who = null;
      list.forEach(function (q, i) {
        var c = q.counterpart && !childless[q.counterpart] ? placeOf[q.counterpart] : null;
        if (!c || c[along] !== placeOf[part][along] || (who && q.counterpart !== who)) return;
        who = q.counterpart;
        if (first < 0) first = i;
        last = i;
      });
      return first < 0 ? (list.length - 1) / 2 : (first + last) / 2;
    };
    // How many pin steps a side needs either side of its centre.
    var reach = function (part, side, list) {
      if (!list.length) return -0.5;
      var k = centreOf(part, side, list);
      return Math.max(k, list.length - 1 - k);
    };
    // Pin coordinates along each side of `box`, centred as above.
    var pinsAlong = function (box) {
      var out = [];
      var bySide = pinsOf[box.id];
      if (!bySide) return out;
      SIDES.forEach(function (side) {
        var list = spread(bySide[side]);
        var k = centreOf(box.id, side, list);
        list.forEach(function (pin, i) {
          var off = (i - k) * M.pinPitch;
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
    // A child's box (step 4-6) has no room to place its name clear of a
    // jumper, so a jumper between two of its sides runs inside the border,
    // through the corner between them -- or, between opposite sides, the two
    // corners of a flank.
    var CORNER_IN = 4;
    var cornerOf = function (box, s1, s2) {
      var sides = [s1, s2];
      return { x: round(sides.indexOf("left") !== -1 ? box.x + CORNER_IN : box.x + box.w - CORNER_IN),
               y: round(sides.indexOf("top") !== -1 ? box.y + CORNER_IN : box.y + box.h - CORNER_IN) };
    };
    var viaBorder = function (box, a, b) {
      var across = { top: "bottom", bottom: "top", left: "right", right: "left" };
      if (across[a.side] !== b.side) return [cornerOf(box, a.side, b.side)];
      var flank = a.side === "top" || a.side === "bottom" ? "right" : "bottom";
      return [cornerOf(box, a.side, flank), cornerOf(box, b.side, flank)];
    };
    // A part's jumpers: one per dimension, between the two ends it measures
    // -- of a feature with a pin per partner, the pin nearest the other end
    // (the first such by interface id). Two ends on one side bow into the
    // box so the line is not lost in it.
    var jumpersOf = function (pid, ends, box) {
      var out = [];
      (dimsOf[pid] || []).forEach(function (d) {
        var j = jumperOf(d, ends, box);
        if (j) out.push(j);
      });
      return out;
    };
    var jumperOf = function (d, ends, box) {
      {
        var a = null, b = null, best = Infinity;
        (ends[d.from] || []).forEach(function (pa) {
          (ends[d.to] || []).forEach(function (pb) {
            var dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
            if (dist < best - 0.01) { best = dist; a = pa; b = pb; }
          });
        });
        if (!a || !b) return null;
        var j = { id: d.id, part: d.part, name: d.name, from: d.from, to: d.to,
                  a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, ctrl: null, sides: [a.side, b.side],
                  mid: { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) } };
        if (a.side && a.side === b.side) {
          var n = NORMAL[a.side];
          var bow = Math.max(24, Math.hypot(b.x - a.x, b.y - a.y) * 0.35);
          j.ctrl = { x: round((a.x + b.x) / 2 - n[0] * bow), y: round((a.y + b.y) / 2 - n[1] * bow) };
          j.d = "M" + a.x + " " + a.y + " Q" + j.ctrl.x + " " + j.ctrl.y + " " + b.x + " " + b.y;
        } else if (box && box.child && a.side && b.side) {
          j.via = viaBorder(box, a, b);
          j.d = pathD([a].concat(j.via, [b]));
        } else {
          j.d = pathD([a, b]);
        }
        return j;
      }
    };

    // A part's ends, for its jumpers: each feature's pins and marks, in
    // interface id order, so the order of `edges[]` never moves a jumper.
    var endsOf = function (list) {
      var ends = {};
      list.forEach(function (q) { (ends[q.id] = ends[q.id] || []).push(q); });
      Object.keys(ends).forEach(function (id) {
        ends[id].sort(function (u, v) { return (u.iface || "") < (v.iface || "") ? -1 : (u.iface || "") > (v.iface || "") ? 1 : 0; });
      });
      return ends;
    };

    (model.parts || []).forEach(function (p) {
      if (!placeOf[p.id] || childless[p.id]) return;
      var cell = cellRect(placeOf[p.id], M);
      var bySide = pinsOf[p.id] || { top: [], right: [], bottom: [], left: [] };
      // A side of n pins centred in the middle needs n steps; one centred on
      // a partner straight across needs twice its longer reach, plus one.
      var across = 2 * Math.max(reach(p.id, "top", spread(bySide.top)),
                                reach(p.id, "bottom", spread(bySide.bottom))) + 1;
      var down = 2 * Math.max(reach(p.id, "left", bySide.left), reach(p.id, "right", bySide.right)) + 1;
      var w = Math.max(M.box.minW, across * M.pinPitch + 2 * M.box.pad);
      var h0 = Math.max(M.box.minH, down * M.pinPitch + 2 * M.box.pad);
      var kids = childrenInCell[p.id] || [];
      // A child joined to its parent sits far enough under it for the
      // connector's symbol to sit between the two boxes.
      var joined = bySide.bottom.some(function (q) { return q.toChild; });
      var kidGap = joined ? M.child.joined : M.child.gap;
      var kidsH = kids.length ? M.child.h + kidGap : 0;
      var c = centre(cell);
      var box, ownPins, ownMarks, ownJumpers, name, kidBoxes;
      // Taller first, while the cell has the room; then wider, which opens
      // the strips beside a side's centred pins (a part with routes through
      // its top and its bottom has no other room for its name).
      var h = h0;
      var maxH = cell.h - 2 * M.district.inset - kidsH, maxW = cell.w - 2 * M.district.inset;
      // `tries` bounds the growth in height; the width is bounded by the cell.
      for (var attempt = 0; ; attempt++) {
        if (attempt > 0) {
          if (attempt <= M.name.tries && h + M.name.grow <= maxH) h += M.name.grow;
          else if (w + M.name.grow <= maxW) w += M.name.grow;
          else break;
        }
        box = {
          id: p.id, label: p.label, number: p.number, name: p.name, body: p.body,
          x: c.x - w / 2, y: c.y - (h + kidsH) / 2, w: w, h: h, cell: cell,
        };
        ownPins = pinsAlong(box);
        // The children, in a row under the parent: centred, or -- where
        // routes leave the parent's bottom, as in a column of parts stacked
        // one on the next -- beside those routes, on the side with more
        // room, so no route is drawn through a child it does not end on.
        var rowW = kids.length * M.child.w + (kids.length - 1) * M.child.gap;
        var rowX = c.x - rowW / 2;
        var under = spread(bySide.bottom);
        if (kids.length && under.length) {
          var lo = Math.min.apply(null, under.map(function (q) { return q.x; })) - M.pinR - M.child.clear;
          var hi = Math.max.apply(null, under.map(function (q) { return q.x; })) + M.pinR + M.child.clear;
          var roomL = lo - (cell.x + M.district.inset + M.assembly.pad);
          var roomR = (cell.x + cell.w - M.district.inset - M.assembly.pad) - hi;
          if (roomL >= rowW && roomL >= roomR) rowX = lo - rowW;
          else if (roomR >= rowW) rowX = hi;
        }
        kidBoxes = kids.map(function (cid, i) {
          var kid = parts[cid];
          var kbox = {
            id: cid, label: kid.label, number: kid.number, name: kid.name, body: kid.body,
            x: rowX + i * (M.child.w + M.child.gap), y: box.y + box.h + kidGap,
            w: M.child.w, h: M.child.h, cell: cell, child: true,
          };
          // A child's own features, should it have any, on its own box.
          return { box: kbox, pins: pinsAlong(kbox), marks: marksAlong(kbox) };
        });
        // A pin toward a child sits on the parent's bottom straight over the
        // child's pin for the same interface: the route is the short drop
        // between the two facing sides.
        bySide.bottom.forEach(function (q) {
          if (!q.toChild) return;
          var mate = slotOf[q.iface + "|" + otherEnd(q)];
          q.x = round(mate && mate.x !== undefined ? mate.x : box.x + box.w / 2);
          q.y = round(box.y + box.h);
          ownPins.push(q);
        });
        ownMarks = marksAlong(box);
        ownJumpers = jumpersOf(p.id, endsOf(ownPins.concat(ownMarks)), box);
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
      kidBoxes.forEach(function (k) {
        boxes.push(k.box);
        boxOf[k.box.id] = k.box;
        Array.prototype.push.apply(pins, k.pins);
        Array.prototype.push.apply(marks, k.marks);
        Array.prototype.push.apply(jumpers, jumpersOf(k.box.id, endsOf(k.pins.concat(k.marks)), k.box));
      });
    });
    // An assembly's dimension between two of its parts' features (since
    // 2026-11-19 its `part` may be the assembly, its ends features of the
    // parts under it): a jumper between those features' nearest pins --
    // straight where that crosses no box, else out of each pin square to its
    // side and along a lane past the assembly's boxes it spans, under them,
    // over them, or beside them, the first that crosses no box. Its outline
    // takes the jumper in.
    var inside = function (id, assemblyId) {
      for (var up = id; up && parts[up]; up = parts[up].parent) if (up === assemblyId) return true;
      return false;
    };
    var drawn = {};
    jumpers.forEach(function (j) { drawn[j.id] = true; });
    var everyEnd = endsOf(pins.concat(marks));
    (model.dimensions || []).forEach(function (d) {
      if (drawn[d.id] || boxOf[d.part]) return;
      var j = jumperOf(d, everyEnd, null);
      if (!j) return;
      var out = function (q, side) {
        var n = side ? NORMAL[side] : [0, 0];
        return { x: round(q.x + n[0] * M.stub), y: round(q.y + n[1] * M.stub) };
      };
      var p1 = out(j.a, j.sides[0]), p2 = out(j.b, j.sides[1]);
      var clear = function (pts) {
        for (var i = 1; i < pts.length; i++) {
          for (var k = 0; k < boxes.length; k++) if (crosses(pts[i - 1], pts[i], boxes[k])) return false;
        }
        return true;
      };
      // A lane past the assembly's boxes that overlap the run between the
      // two stubs, on one side: [axis, sign] -- y +1 under, y -1 over,
      // x -1 left, x +1 right.
      var lanePast = function (axis, sign) {
        var across = axis === "y" ? "x" : "y", size = axis === "y" ? "h" : "w", span = axis === "y" ? "w" : "h";
        var lo = Math.min(p1[across], p2[across]), hi = Math.max(p1[across], p2[across]);
        var lane = sign > 0 ? Math.max(p1[axis], p2[axis]) : Math.min(p1[axis], p2[axis]);
        boxes.forEach(function (box) {
          if (!inside(box.id, d.part) || !(box[across] <= hi && box[across] + box[span] >= lo)) return;
          lane = sign > 0 ? Math.max(lane, box[axis] + box[size]) : Math.min(lane, box[axis]);
        });
        lane = round(lane + sign * M.stub / 2);
        return axis === "y" ? [p1, { x: p1.x, y: lane }, { x: p2.x, y: lane }, p2]
          : [p1, { x: lane, y: p1.y }, { x: lane, y: p2.y }, p2];
      };
      var tries = [[]].concat([["y", 1], ["y", -1], ["x", -1], ["x", 1]].map(function (t) {
        return lanePast(t[0], t[1]);
      }));
      var via = tries.filter(function (v) { return clear([j.a].concat(v, [j.b])); })[0];
      if (!via) {
        notes.push("dimension " + d.id + " has no jumper clear of every box");
        via = tries[1];
      }
      j.ctrl = null;
      j.via = via.length ? via : null;
      j.d = pathD([j.a].concat(via, [j.b]));
      if (via.length) j.mid = { x: round((via[1].x + via[2].x) / 2), y: round((via[1].y + via[2].y) / 2) };
      // Drawn as a dimension, not a lane (2026-11-22, the 11-19 walk: "each
      // link's length is a long lane that reads as another box"): an
      // extension line out of each end, a little past the dimension line,
      // and the dimension line between them with an arrowhead at each end.
      if (via.length) {
        var past = function (from, to) {
          var len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
          return { x: round(to.x + (to.x - from.x) / len * M.dimension.past),
                   y: round(to.y + (to.y - from.y) / len * M.dimension.past) };
        };
        j.dimension = {
          ext: [[j.a, via[0], past(via[0], via[1])], [j.b, via[3], past(via[3], via[2])]],
          line: [via[1], via[2]],
        };
      }
      j.lane = union([j.a, j.b].concat(via).map(function (q) { return { x: q.x, y: q.y, w: 0, h: 0 }; }));
      jumpers.push(j);
      drawn[j.id] = true;
    });
    // A dimension whose ends the map did not place is a defect, said once.
    (model.dimensions || []).forEach(function (d) {
      if (!drawn[d.id]) notes.push("dimension " + d.id + " has an end the map did not place");
    });

    // 7. Connectors: one per interface, routed between its two pins, with
    //    its symbol at the middle. A joint's several constraints leave
    //    parallel pins and so run as a bundle.
    var connectors = [];
    // Beside the parts between two in one column: square out of each pin,
    // then along a lane past every box between and past both stubs, on the
    // column's flank; a joint's earlier constraints take the outer lanes, so
    // a bundle's legs nest rather than cross.
    var detour = function (a, b, iface) {
      var square = route(a, b, M);
      var p1 = square[1], p2 = square[square.length - 2];
      var out = a.side === "left" ? -1 : a.side === "right" ? 1 : flankOf(placeOf[a.part][0]) === "right" ? 1 : -1;
      var lo = Math.min(p1.y, p2.y), hi = Math.max(p1.y, p2.y);
      var lane = out * Math.max(out * p1.x, out * p2.x);
      boxes.forEach(function (box) {
        if (box.id === a.part || box.id === b.part || box.y > hi || box.y + box.h < lo ||
            !placeOf[box.id] || placeOf[box.id][0] !== placeOf[a.part][0]) return;
        lane = out * Math.max(out * lane, out * (box.x + (out > 0 ? box.w : 0)) + M.stub);
      });
      var joint = (model.joints || []).filter(function (j) { return j.id === iface.joint; })[0];
      var later = (joint ? joint.constraints.length : 1) - 1 - (constraintIndex[iface.id] || 0);
      lane = round(lane + out * later * M.pinPitch);
      return [{ x: a.x, y: a.y }, p1, { x: lane, y: p1.y }, { x: lane, y: p2.y }, p2, { x: b.x, y: b.y }];
    };
    // The same beside the parts between two in one row: a lane under (or
    // over) every box between, on the row's flank.
    var rowDetour = function (a, b, iface) {
      var square = route(a, b, M);
      var p1 = square[1], p2 = square[square.length - 2];
      var out = a.side === "top" ? -1 : a.side === "bottom" ? 1 : rowFlankOf(placeOf[a.part][1]) === "bottom" ? 1 : -1;
      var lo = Math.min(p1.x, p2.x), hi = Math.max(p1.x, p2.x);
      var lane = out * Math.max(out * p1.y, out * p2.y);
      boxes.forEach(function (box) {
        if (box.id === a.part || box.id === b.part || box.x > hi || box.x + box.w < lo ||
            !placeOf[box.id] || placeOf[box.id][1] !== placeOf[a.part][1]) return;
        lane = out * Math.max(out * lane, out * (box.y + (out > 0 ? box.h : 0)) + M.stub);
      });
      var joint = (model.joints || []).filter(function (j) { return j.id === iface.joint; })[0];
      var later = (joint ? joint.constraints.length : 1) - 1 - (constraintIndex[iface.id] || 0);
      lane = round(lane + out * later * M.pinPitch);
      return [{ x: a.x, y: a.y }, p1, { x: p1.x, y: lane }, { x: p2.x, y: lane }, p2, { x: b.x, y: b.y }];
    };
    var boxesCrossed = function (pts, a, b) { return crossedBoxes(pts, [a.part, b.part], boxes); };
    // The pins of an interface whose route is defective, for the repair.
    var defects = [];
    var defect = function (id) {
      var pair = (endsOfIface[id] || []).map(function (fid) { return id + "|" + fid; });
      if (pair.length === 2 && slotOf[pair[0]] && slotOf[pair[1]] &&
          !defects.some(function (d) { return d[0] === pair[0]; })) defects.push(pair);
    };
    // Routed in id order, and a route through the grid's corners after
    // every other, so one that steers clear of those already drawn sees
    // them all and never depends on the order of `edges[]`.
    var deferred = [];
    var lay = function (iface, last) {
      var ends = iface.ends || [];
      var a = slotOf[iface.id + "|" + ends[0]], b = slotOf[iface.id + "|" + ends[1]];
      if (!a || !b) { notes.push("interface " + iface.id + " has an end the map did not place"); return; }
      var way = partBetween(placeOf[a.part], placeOf[b.part]);
      var pts = way === "column" ? detour(a, b, iface) : way === "row" ? rowDetour(a, b, iface) : route(a, b, M);
      // A plain route that crosses a box tries its bend the other way
      // round, then a way through the grid's corners that crosses none and
      // runs on no route already drawn.
      if (!way && boxesCrossed(pts, a, b).length) {
        var late = route(a, b, M, true);
        if (!boxesCrossed(late, a, b).length) pts = late;
        else if (corners && !last) { deferred.push(iface); return; }
        else if (corners) {
          pts = viaCorners(a, b, M, [lastColumn + 1, lastRow + 1], function (cand) {
            // ...and keeps a stub's length from every other pin, so it never
            // meets another route where that one leaves its pin and reads as
            // a branch of it.
            return !boxesCrossed(cand, a, b).length && !connectors.some(function (c) {
              return sharedRun(c.points, cand, M.pinR) ||
                nearRect(cand, { x: c.mid.x, y: c.mid.y, w: 0, h: 0 }, M.symbol / 2);
            }) && !pins.some(function (q) {
              return q !== a && q !== b && nearRect(cand.slice(1, -1), { x: q.x, y: q.y, w: 0, h: 0 }, M.stub);
            });
          }) || pts;
        }
      }
      var symbol = VA.mapSymbolOf(iface);
      // A gap edge that states no interface word is a model gap (the gap
      // list names it), not a layout defect: its connector is drawn bare.
      // A WORD with no symbol is the vocabulary's defect.
      if (!symbol && iface.kind) notes.push("interface " + iface.id + " has no symbol for " + iface.kind);
      var mid = symbolPoint(pts, a, b);
      connectors.push({
        id: iface.id, name: iface.name, kind: iface.kind, joint: iface.joint,
        within: iface.within, parts: iface.parts, ends: ends, endParts: [a.part, b.part],
        symbol: symbol, points: pts, d: pathD(pts),
        mid: { x: round(mid.x), y: round(mid.y), angle: round(mid.angle) },
        bundled: (constraintIndex[iface.id] !== undefined) &&
          (model.joints || []).some(function (j) { return j.id === iface.joint && j.constraints.length > 1; }),
      });
    };
    (model.interfaces || []).slice().sort(function (x, y) { return x.id < y.id ? -1 : x.id > y.id ? 1 : 0; })
      .forEach(function (iface) { lay(iface, false); });
    deferred.forEach(function (iface) { lay(iface, true); });
    var routeNotes = VA.mapRouteNotes(connectors, boxes, M);
    Array.prototype.push.apply(notes, routeNotes.notes);
    routeNotes.defects.forEach(defect);

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
    // Deepest first, so an outline round a nested assembly takes in that
    // assembly's own outline; listed in the model's part order.
    var depthOf = function (p) {
      var n = 0;
      for (var up = p.parent; up && parts[up]; up = parts[up].parent) n += 1;
      return n;
    };
    var outlineOf = {};
    var laneOf = {};
    jumpers.forEach(function (j) { if (j.lane) (laneOf[j.part] = laneOf[j.part] || []).push(j.lane); });
    // The names an outline's name must keep clear of: every district's
    // (views/map.js draws it at the district's top-left) and every outline's
    // already named.
    var bodyFont = M.font.body, nameFont = M.font.assembly;
    var taken = bodies.map(function (b) {
      return { x: b.x + 14, y: b.y + 8, w: String(b.name).length * bodyFont * VA.MAP_GLYPH,
               h: Math.round(bodyFont * 1.25) };
    });
    (model.parts || []).filter(function (p) { return p.children && p.children.length; })
      .map(function (p, i) { return { p: p, depth: depthOf(p), i: i }; })
      .sort(function (u, v) { return v.depth - u.depth || u.i - v.i; })
      .forEach(function (item) {
        var p = item.p;
        var kids = p.children.map(function (c) { return outlineOf[c] || boxOf[c]; }).filter(Boolean);
        if (!outlined[p.id]) {
          if (!boxOf[p.id]) return;
          var r = inset(union([boxOf[p.id]].concat(kids)), -M.assembly.pad);
          outlineOf[p.id] = { id: p.id, label: p.label, body: p.body, x: r.x, y: r.y, w: r.w, h: r.h,
                              children: p.children.slice() };
          return;
        }
        if (!kids.length) { notes.push("assembly " + p.id + " has no drawn part to draw round"); return; }
        // An assembly with no box is its outline: named at its top-left as
        // a district is, its number first and its everyday name beside it --
        // or at its top-right, where the top-left would meet a district's
        // name or another outline's.
        var u = union(kids.concat(laneOf[p.id] || []));
        var top = M.assembly.label;
        var o = { id: p.id, label: p.label, number: p.number, name: p.name, body: p.body, outline: true,
                  x: u.x - M.assembly.pad, y: u.y - M.assembly.pad - top,
                  w: u.w + 2 * M.assembly.pad, h: u.h + 2 * M.assembly.pad + top,
                  children: p.children.slice() };
        var str = VA.mapFitText(p.label, o.w - 20, nameFont);
        var tw = str.length * nameFont * VA.MAP_GLYPH, th = Math.round(nameFont * 1.25);
        var ny = o.y + M.assembly.pad / 2;
        var tries = [{ x: o.x + 10, anchor: "start", rect: { x: o.x + 10, y: ny, w: tw, h: th } },
                     { x: o.x + o.w - 10, anchor: "end", rect: { x: o.x + o.w - 10 - tw, y: ny, w: tw, h: th } }];
        var at = tries.filter(function (t) {
          return !taken.some(function (r) { return overlaps(r, t.rect); });
        })[0];
        if (!at) {
          notes.push("assembly " + p.id + "'s name meets another name at both its top corners");
          at = tries[0];
        }
        taken.push(at.rect);
        o.nameAt = { x: round(at.x), y: round(ny + nameFont * 0.95), anchor: at.anchor, text: str };
        outlineOf[p.id] = o;
      });
    var assemblies = (model.parts || []).map(function (p) { return outlineOf[p.id]; }).filter(Boolean);
    // An outline that takes in a box not of its parts says the part is in
    // an assembly it is not in: a layout defect.
    assemblies.forEach(function (a) {
      if (!a.outline) return;
      boxes.forEach(function (box) {
        if (!inside(box.id, a.id) && overlaps(a, box)) {
          notes.push("assembly " + a.id + "'s outline takes in " + box.id + ", which is not one of its parts");
        }
      });
    });

    // 9. The drawing's extent.
    // A detour's lane may pass outside every district.
    var everything = bodies.concat(boxes, assemblies, connectors.map(function (c) {
      return union(c.points.map(function (p) { return { x: p.x, y: p.y, w: 0, h: 0 }; }));
    }));
    var b = union(everything) || { x: 0, y: 0, w: 0, h: 0 };
    var bounds = inset(b, -M.margin);

    return {
      topologyId: model.id, metrics: M,
      bodies: bodies, assemblies: assemblies, boxes: boxes, pins: pins, marks: marks,
      jumpers: jumpers, connectors: connectors, bounds: bounds, notes: notes,
      defects: defects,
      sideOf: Object.keys(slotOf).reduce(function (o, k) { o[k] = slotOf[k].side; return o; }, {}),
    };
  }

  // What the map draws, counted the way `model.counts` counts: districts
  // against bodies, boxes against parts, pins and marks against features,
  // jumpers against dimensions, connectors against interfaces. The suite
  // holds the two equal, so nothing in the model is left undrawn and
  // nothing is drawn twice.
  VA.mapCounts = function (geo) {
    if (!geo) return null;
    return {
      bodies: geo.bodies.length,
      // An assembly with no box is drawn as its outline.
      parts: geo.boxes.length + geo.assemblies.filter(function (a) { return a.outline; }).length,
      // A feature with a pin toward each partner is still one feature.
      features: geo.pins.concat(geo.marks).map(function (p) { return p.id; })
        .filter(function (id, i, all) { return all.indexOf(id) === i; }).length,
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
  // view outlives a repaint but not the page. `min` is low enough that Fit
  // shows a whole model of many bodies in a narrow region: v1's computed
  // map, one column per body, is too wide to fit a side-by-side region at
  // 0.1 (the_map_is_the_only_drawing_and_classic_retires, 2026-11-17).
  VA.MAP_ZOOM = Object.freeze({ min: 0.04, max: 4, step: 1.15, fitMax: 2 });

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
  // width x height, `pad` clear of its edges, panning only an axis the rect
  // is off screen on; the view unchanged when it is wholly on screen. The pad
  // is how far a pan brings it in, never what counts as in: at a fit the
  // drawing's margin can be thinner than the pad (v2's map at 0.25, its 40
  // world units 10px on screen), and a click on a box at the edge then moved
  // the map it was clicked on (2026-11-19).
  VA.mapBringIntoView = function (view, r, width, height, pad) {
    if (!r) return view;
    var p = pad || 0;
    var x1 = r.x * view.k + view.tx, y1 = r.y * view.k + view.ty;
    var x2 = (r.x + r.w) * view.k + view.tx, y2 = (r.y + r.h) * view.k + view.ty;
    var dx = 0, dy = 0;
    if (x1 < 0 || x2 > width) {
      if (x1 < p) dx = p - x1;
      else dx = Math.max(width - p - x2, p - x1);
    }
    if (y1 < 0 || y2 > height) {
      if (y1 < p) dy = p - y1;
      else dy = Math.max(height - p - y2, p - y1);
    }
    if (!dx && !dy) return view;
    return VA.mapPan(view, dx, dy);
  };

  // The scale keeps five decimals: at a fit of 0.276 a scale rounded to
  // two (0.28) drew v2's seven-column map 1.5% wider than its region and
  // past the pane's edge (2026-11-20, the first width-bound fit).
  VA.mapTransform = function (view) {
    return "translate(" + round(view.tx) + " " + round(view.ty) + ") scale(" +
      Math.round(view.k * 100000) / 100000 + ")";
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
