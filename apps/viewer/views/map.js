// The map, drawn (the_map_draws_the_end_stop_model, 2026-11-15): the DAG
// region's second drawing of the one model -- bodies as districts, a box
// round every part, pins on the perimeter where parts meet, jumpers inside
// a part for its dimensions, connectors between pins with the joint's symbol
// drawn large on each, a joint's several constraints as a bundle. The
// geometry is apps/viewer/map.js's (`VA.mapLayout`); this file only draws
// it, wires the pointer, and lights it from the page's one selection and
// one hover (VA.focusLightOf, through VA.mapLightKeys).
//
// Every entity is drawn ONCE, keyed by the model's own kind and id
// (`data-map-kind`, `data-map-id`), so the suite can count what is drawn
// against `model.counts` and nothing is drawn twice. Every curve takes
// `fill: none` (the 2026-11-14 walk found SVG's default black fill under a
// hover).
//
// The present DAG (views/topology.js's railsSvg) is untouched underneath:
// renderTopoPane draws it and the grid, then hands the region to this file
// when the page asks for the map (`ctx.dagDrawing === "map"`). It retires
// in a later handoff, on Jeff's yes to the map.
(function (VA) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // The view per topology -- {k, tx, ty, auto, size, selectedKey} -- kept
  // across repaints and not across pages, as the DAG's own zoom is
  // (topology_app.js's state.dagZoom). `auto` says the view is still the fit
  // the page made (a resize re-fits it); the reader's wheel or drag clears it.
  var views = {};
  VA.mapViewOf = function (topologyId) { return views[topologyId] || null; };
  VA.forgetMapViews = function () { views = {}; };

  function key(kind, id) { return kind + ":" + id; }

  // --- the symbol defs -------------------------------------------------------

  function node(tag, attrs) {
    var el = document.createElementNS ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  VA.mapSymbolId = function (word) { return "map-sym-" + word; };

  // One <symbol> per word in VA.MAP_SYMBOLS, drawn in a VA.MAP.symbol box
  // centred on 0, 0 with the route along +x; placed rotated to the route.
  VA.mapSymbolDefs = function () {
    var defs = node("defs", {});
    var h = VA.MAP.symbol / 2;
    Object.keys(VA.MAP_SYMBOLS).forEach(function (word) {
      var sym = node("symbol", { id: VA.mapSymbolId(word), viewBox: [-h, -h, 2 * h, 2 * h].join(" "),
                                 overflow: "visible" });
      VA.MAP_SYMBOLS[word].shapes.forEach(function (shape) { sym.appendChild(node(shape[0], shape[1])); });
      defs.appendChild(sym);
    });
    return defs;
  };

  // --- the drawing -----------------------------------------------------------

  // A registry of what is drawn, by entity key: each entry is {el, base,
  // sel}, where `base` is the class the element was built with, `sel` its
  // selection classes (written at paint) and the hover's classes are rewritten
  // onto both (VA.lightMap). The LAST render's, as VA.lastTopoHot is.
  VA.lastMapLight = null;

  function registry() {
    return { byKey: {}, marked: [], topologyId: null };
  }

  function register(reg, el, base, kind, id) {
    var k = key(kind, id);
    (reg.byKey[k] = reg.byKey[k] || []).push({ el: el, base: base, sel: "" });
    el.setAttribute("data-map-kind", kind);
    el.setAttribute("data-map-id", id);
    return el;
  }

  // Rewrite an entry's class: its base, its selection classes, then the
  // hover's. One place writes `class` on a map element.
  function paint(entry, hover) {
    entry.el.setAttribute("class", entry.base + entry.sel + (hover || ""));
  }

  // The state classes an element wears, from its base class's first word
  // (`map__pin` -> `map__pin--selected`).
  function stateClass(base, state) {
    return " " + base.split(" ")[0] + "--" + state;
  }

  // The page's one hover, lighting this drawing: the {own, touching} keys of
  // what is hovered anywhere -- the tree, the grid, the scene, this map --
  // or nothing. Own wears `--lead`, touching `--hot`; nothing goes opaque,
  // the stylesheet says how (map.css). Returns how many keys lit something.
  VA.lightMap = function (model, entity) {
    var reg = VA.lastMapLight;
    if (!reg) return 0;
    while (reg.marked.length) paint(reg.marked.pop(), "");
    var keys = VA.mapLightKeys(model, entity);
    var lit = {};
    var light = function (k, state) {
      (reg.byKey[k] || []).forEach(function (entry) {
        paint(entry, stateClass(entry.base, state));
        reg.marked.push(entry);
        lit[k] = true;
      });
    };
    (keys.touching || []).forEach(function (k) { light(k, "hot"); });
    (keys.own || []).forEach(function (k) { light(k, "lead"); });
    return Object.keys(lit).length;
  };

  // The selection's two tiers, written at paint: own `--selected`, touching
  // `--touched`.
  function applySelection(reg, model, entity) {
    var keys = VA.mapLightKeys(model, entity);
    var set = function (k, state) {
      (reg.byKey[k] || []).forEach(function (entry) {
        entry.sel = stateClass(entry.base, state);
        paint(entry, "");
      });
    };
    (keys.touching || []).forEach(function (k) { set(k, "touched"); });
    (keys.own || []).forEach(function (k) { set(k, "selected"); });
    return keys;
  }

  // Hover and click on a drawn entity, told to the page: the page holds the
  // one hover and the one selection and lights every surface from them,
  // this map included (topology_app.js's setHovered / selectEntity). A
  // bare render with no page lights the hovered entity itself.
  function wire(el, ctx, kind, id, name) {
    var entity = { kind: kind, id: id };
    var enter = function () {
      if (ctx.onHotEntity) ctx.onHotEntity(entity);
      else VA.lightMap(ctx.model || null, entity);
    };
    var leave = function () {
      if (ctx.onHotEntity) ctx.onHotEntity(null);
      else VA.lightMap(ctx.model || null, null);
    };
    el.onmouseenter = enter;
    el.onmouseleave = leave;
    el.onfocus = enter;
    el.onblur = leave;
    el.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      if (ctx.onSelectEntity) ctx.onSelectEntity(entity);
    };
    el.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.preventDefault) event.preventDefault();
      if (ctx.onSelectEntity) ctx.onSelectEntity(entity);
    };
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", name || String(id));
    return el;
  }

  function title(el, text) {
    var t = node("title", {});
    t.textContent = text;
    el.appendChild(t);
    return el;
  }

  function rect(cls, r, extra) {
    return VA.svg("rect", cls, Object.assign({ x: r.x, y: r.y, width: r.w, height: r.h }, extra || {}));
  }

  function text(cls, x, y, str, attrs) {
    var t = VA.svg("text", cls, Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    return t;
  }

  // A part's name, in two lines inside its box: the number, then the
  // everyday name, cut to the box with an ellipsis -- the whole label is the
  // box's tooltip, so a cut name is always discoverable (Jeff, 2026-10-20).
  function fitText(str, widthPx, fontPx) {
    var perChar = fontPx * 0.56;
    var room = Math.max(1, Math.floor(widthPx / perChar));
    if (str.length <= room) return str;
    return str.slice(0, Math.max(1, room - 1)).replace(/\s+$/, "") + "…";
  }

  // ...wrapped onto up to `lines` lines at word boundaries, the last one cut.
  function wrapText(str, widthPx, fontPx, lines) {
    var perChar = fontPx * 0.56;
    var room = Math.max(1, Math.floor(widthPx / perChar));
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
    return out.map(function (l) { return fitText(l, widthPx, fontPx); });
  }

  // THE RENDER. `ctx` is renderTopoPane's context: `topoProj` (its `model`
  // block and its `map` file), `model` (the page's model object, for the
  // light), `selectedEntity`, `onHotEntity`, `onSelectEntity`, `regionHead`
  // (the Map . Classic switch), `onPainted`; `mapRegion` {width, height}
  // stands in for the root's own size where there is no layout (the shim).
  VA.renderTopoMap = function (root, ctx) {
    var topoProj = ctx.topoProj;
    var modelView = topoProj && topoProj.model;
    var M = VA.MAP;
    VA.clear(root);
    root.className = "tv__scroll tv__scroll--map";
    root.mapFit = null;
    var geo = VA.mapLayout(modelView, topoProj && topoProj.map, M);
    if (!geo) {
      root.appendChild(VA.el("p", "muted", "This model has no map."));
      if (ctx.regionHead) root.appendChild(ctx.regionHead());
      return root;
    }
    var model = ctx.model || null;
    var reg = registry();
    reg.topologyId = geo.topologyId;
    reg.geometry = geo;
    VA.lastMapLight = reg;

    var hscroll = VA.el("div", "tv__hscroll tv__hscroll--map");
    var svg = VA.svg("svg", "tv__map", { width: "100%", height: "100%" });
    svg.setAttribute("data-topology", geo.topologyId);
    svg.appendChild(VA.mapSymbolDefs());
    var world = VA.svg("g", "map__world");
    var layer = {};
    ["districts", "assemblies", "boxes", "jumpers", "connectors", "pins", "names"].forEach(function (name) {
      layer[name] = VA.svg("g", "map__layer map__layer--" + name);
      world.appendChild(layer[name]);
    });

    // Districts: one per body, in the body's own ink (the DAG's tint
    // classes, topology.css's .tv__fill--t*), named at the top-left.
    geo.bodies.forEach(function (body) {
      var tintCls = " tv__fill--t" + body.tint;
      var g = VA.svg("g", "map__body" + tintCls);
      var r = rect("map__district", body, { rx: M.district.radius, ry: M.district.radius });
      register(reg, r, "map__district" + tintCls, VA.FOCUS_KINDS.body, body.id);
      wire(r, ctx, VA.FOCUS_KINDS.body, body.id, body.name);
      title(r, body.name);
      g.appendChild(r);
      var name = text("map__bodyname", body.x + 14, body.y + 8 + M.font.body, body.name,
        { "font-size": M.font.body });
      register(reg, name, "map__bodyname", VA.FOCUS_KINDS.body, body.id);
      wire(name, ctx, VA.FOCUS_KINDS.body, body.id, body.name);
      g.appendChild(name);
      layer.districts.appendChild(g);
    });

    // An assembly's outline round its own box and its children's.
    geo.assemblies.forEach(function (a) {
      var tint = tintOf(geo, a.body);
      var r = rect("map__assembly" + tint, a, { rx: M.assembly.radius, ry: M.assembly.radius });
      r.setAttribute("data-assembly", a.id);
      layer.assemblies.appendChild(r);
    });

    // Boxes: one per part, its label inside. A child's box is small and
    // carries its name alone.
    geo.boxes.forEach(function (box) {
      var tint = tintOf(geo, box.body);
      var base = "map__box" + (box.child ? " map__box--child" : "") + tint;
      var g = VA.svg("g", "map__part");
      g.setAttribute("data-part", box.id);
      var r = rect("map__box", box, { rx: M.box.radius, ry: M.box.radius });
      register(reg, r, base, VA.FOCUS_KINDS.part, box.id);
      wire(r, ctx, VA.FOCUS_KINDS.part, box.id, box.label);
      title(r, box.label);
      g.appendChild(r);
      var nameG = VA.svg("g", "map__partname" + tint);
      register(reg, nameG, "map__partname" + tint, VA.FOCUS_KINDS.part, box.id);
      wire(nameG, ctx, VA.FOCUS_KINDS.part, box.id, box.label);
      title(nameG, box.label);
      if (box.child) {
        var kidLines = wrapText(box.name || box.label, box.w - 16, M.font.child, 2);
        var ky = box.y + box.h / 2 - (kidLines.length - 1) * (M.font.child + 2) / 2 + M.font.child * 0.36;
        kidLines.forEach(function (l, i) {
          nameG.appendChild(text("map__partname-text", box.x + 8, ky + i * (M.font.child + 2), l,
            { "font-size": M.font.child }));
        });
      } else {
        var y1 = box.y + 8 + M.font.number;
        if (box.number) {
          nameG.appendChild(text("map__partnumber-text", box.x + 10, y1, box.number,
            { "font-size": M.font.number }));
          y1 += M.font.part + 4;
        }
        wrapText(box.name || box.label, box.w - 20, M.font.part, 2).forEach(function (l, i) {
          nameG.appendChild(text("map__partname-text", box.x + 10, y1 + i * (M.font.part + 3), l,
            { "font-size": M.font.part }));
        });
      }
      g.appendChild(nameG);
      layer.boxes.appendChild(g);
    });

    // Jumpers: one per dimension, inside its part, between its two ends.
    geo.jumpers.forEach(function (j) {
      var g = VA.svg("g", "map__jumper");
      var hit = VA.svg("path", "map__jumperhit", { d: j.d, fill: "none" });
      var line = VA.svg("path", "map__jumperline", { d: j.d, fill: "none" });
      register(reg, g, "map__jumper", VA.FOCUS_KINDS.dimension, j.id);
      wire(g, ctx, VA.FOCUS_KINDS.dimension, j.id, j.name);
      title(g, j.name);
      g.appendChild(hit);
      g.appendChild(line);
      layer.jumpers.appendChild(g);
    });

    // Connectors: one per interface, with the joint's symbol at its middle,
    // the route broken under the symbol. Heavier between two bodies.
    geo.connectors.forEach(function (c) {
      var between = c.within === null || c.within === undefined;
      var base = "map__connector" + (between ? " map__connector--between" : "") +
        (c.bundled ? " map__connector--bundled" : "");
      var g = VA.svg("g", "map__connector");
      g.setAttribute("data-joint", c.joint || "");
      var hit = VA.svg("path", "map__connectorhit", { d: c.d, fill: "none" });
      var line = VA.svg("path", "map__connectorline", { d: c.d, fill: "none" });
      g.appendChild(hit);
      g.appendChild(line);
      if (c.symbol) {
        var s = M.symbol;
        var sym = VA.svg("g", "map__symbol map__symbol--" + c.symbol, {
          transform: "translate(" + c.mid.x + " " + c.mid.y + ") rotate(" + c.mid.angle + ")",
        });
        sym.setAttribute("data-symbol", c.symbol);
        if (VA.MAP_SYMBOLS[c.symbol].mask) {
          sym.appendChild(VA.svg("rect", "map__symbolmask", { x: -s * 0.4, y: -s / 2, width: s * 0.8, height: s }));
        }
        var use = node("use", { href: "#" + VA.mapSymbolId(c.symbol), x: -s / 2, y: -s / 2, width: s, height: s });
        use.setAttribute("class", "map__symboluse");
        sym.appendChild(use);
        title(sym, c.name + " — " + VA.MAP_SYMBOLS[c.symbol].label);
        g.appendChild(sym);
      }
      register(reg, g, base, VA.FOCUS_KINDS.interface, c.id);
      wire(g, ctx, VA.FOCUS_KINDS.interface, c.id, c.name);
      title(g, c.name);
      layer.connectors.appendChild(g);
    });

    // Pins: one per feature that ends an interface, on its part's
    // perimeter, with its short label beside it -- shown on hover and when
    // lit (map.css). An inner mark for a feature that ends none.
    var labelAt = function (pin, side) {
      var o = 12;
      if (side === "left") return { x: pin.x + o, y: pin.y + M.font.pin * 0.36, anchor: "start" };
      if (side === "right") return { x: pin.x - o, y: pin.y + M.font.pin * 0.36, anchor: "end" };
      if (side === "top") return { x: pin.x, y: pin.y + o + M.font.pin * 0.8, anchor: "middle" };
      return { x: pin.x, y: pin.y - o, anchor: "middle" };
    };
    geo.pins.forEach(function (pin) {
      var tint = tintOf(geo, (modelView.parts || []).filter(function (p) { return p.id === pin.part; })
        .map(function (p) { return p.body; })[0]);
      var g = VA.svg("g", "map__pin" + tint);
      g.setAttribute("data-side", pin.side);
      g.appendChild(VA.svg("circle", "map__pinhit", { cx: pin.x, cy: pin.y, r: M.pinR * 2 }));
      g.appendChild(VA.svg("circle", "map__pindot", { cx: pin.x, cy: pin.y, r: M.pinR }));
      var at = labelAt(pin, pin.side);
      g.appendChild(text("map__pinlabel", at.x, at.y, pin.label,
        { "font-size": M.font.pin, "text-anchor": at.anchor }));
      register(reg, g, "map__pin" + tint, VA.FOCUS_KINDS.feature, pin.id);
      wire(g, ctx, VA.FOCUS_KINDS.feature, pin.id, pin.label);
      title(g, pin.label);
      layer.pins.appendChild(g);
    });
    geo.marks.forEach(function (mark) {
      var g = VA.svg("g", "map__pin map__pin--inner");
      g.appendChild(VA.svg("circle", "map__pinhit", { cx: mark.x, cy: mark.y, r: M.pinR * 2 }));
      g.appendChild(VA.svg("rect", "map__pinmark", { x: mark.x - M.pinR + 1, y: mark.y - M.pinR + 1,
        width: 2 * M.pinR - 2, height: 2 * M.pinR - 2 }));
      g.appendChild(text("map__pinlabel", mark.x, mark.y - 12, mark.label,
        { "font-size": M.font.pin, "text-anchor": "middle" }));
      register(reg, g, "map__pin map__pin--inner", VA.FOCUS_KINDS.feature, mark.id);
      wire(g, ctx, VA.FOCUS_KINDS.feature, mark.id, mark.label);
      title(g, mark.label);
      layer.pins.appendChild(g);
    });

    svg.appendChild(world);
    hscroll.appendChild(svg);
    root.appendChild(hscroll);

    // --- the view: fit on the first paint, then the reader's -----------------
    var size = regionSize(root, ctx);
    var view = views[geo.topologyId];
    var selectedKey = ctx.selectedEntity ? key(ctx.selectedEntity.kind, ctx.selectedEntity.id) : null;
    if (!view || (view.auto && (view.size.width !== size.width || view.size.height !== size.height))) {
      view = Object.assign(VA.mapFitView(geo.bounds, size.width, size.height),
        { auto: true, size: size, selectedKey: view ? view.selectedKey : null });
    }
    // The selection, in its two tiers; a selection made anywhere else brings
    // its own element into view when it is off-screen, once per change.
    var selectedKeys = applySelection(reg, model, ctx.selectedEntity || null);
    if (selectedKey !== view.selectedKey) {
      view.selectedKey = selectedKey;
      var target = entityRect(geo, selectedKeys.own, reg);
      if (target && size.width > 0) {
        var moved = VA.mapBringIntoView(view, target, size.width, size.height, 24);
        if (moved !== view) view = Object.assign({}, view, moved, { auto: false });
      }
    }
    views[geo.topologyId] = view;
    world.setAttribute("transform", VA.mapTransform(view));
    svg.setAttribute("data-zoom", String(Math.round(view.k * 1000) / 1000));

    var setView = function (next, byHand) {
      view = Object.assign({}, view, next, byHand ? { auto: false } : {});
      views[geo.topologyId] = view;
      world.setAttribute("transform", VA.mapTransform(view));
      svg.setAttribute("data-zoom", String(Math.round(view.k * 1000) / 1000));
    };
    // Fit: the toolbar's control and the `0` key come here (topology_app.js's
    // fitDag), as a reader's own hand.
    root.mapFit = function () {
      var now = regionSize(root, ctx);
      setView(Object.assign(VA.mapFitView(geo.bounds, now.width, now.height), { auto: true, size: now }), false);
    };
    root.mapView = function () { return view; };
    wireView(svg, root, setView, function () { return view; });
    watchResize(root, function () {
      if (!views[geo.topologyId] || !views[geo.topologyId].auto) return;
      root.mapFit();
    });

    // The region's own header: the Map . Classic switch.
    if (ctx.regionHead) root.appendChild(ctx.regionHead());
    if (ctx.onPainted) ctx.onPainted();
    return root;
  };

  function tintOf(geo, bodyId) {
    for (var i = 0; i < geo.bodies.length; i++) {
      if (geo.bodies[i].id === bodyId) return " tv__fill--t" + geo.bodies[i].tint;
    }
    return "";
  }

  // The world rect of a selection's own entities (the first one with a
  // place): a part's box, a body's district, a pin's point, a jumper's or a
  // connector's middle.
  function entityRect(geo, ownKeys, reg) {
    for (var i = 0; i < (ownKeys || []).length; i++) {
      var k = ownKeys[i];
      var bar = k.indexOf(":");
      var kind = k.slice(0, bar), id = k.slice(bar + 1);
      var found = null;
      if (kind === VA.FOCUS_KINDS.body) found = geo.bodies.filter(function (b) { return b.id === id; })[0];
      else if (kind === VA.FOCUS_KINDS.part) found = geo.boxes.filter(function (b) { return b.id === id; })[0];
      else if (kind === VA.FOCUS_KINDS.feature) {
        var pin = geo.pins.concat(geo.marks).filter(function (p) { return p.id === id; })[0];
        if (pin) found = { x: pin.x - 20, y: pin.y - 20, w: 40, h: 40 };
      } else if (kind === VA.FOCUS_KINDS.dimension) {
        var j = geo.jumpers.filter(function (x) { return x.id === id; })[0];
        if (j) found = { x: j.mid.x - 20, y: j.mid.y - 20, w: 40, h: 40 };
      } else if (kind === VA.FOCUS_KINDS.interface) {
        var c = geo.connectors.filter(function (x) { return x.id === id; })[0];
        if (c) found = { x: c.mid.x - 30, y: c.mid.y - 30, w: 60, h: 60 };
      }
      if (found) return found;
    }
    return null;
  }

  function regionSize(root, ctx) {
    var w = root && typeof root.clientWidth === "number" ? root.clientWidth : 0;
    var h = root && typeof root.clientHeight === "number" ? root.clientHeight : 0;
    if (!(w > 0) || !(h > 0)) {
      var given = ctx.mapRegion || {};
      w = given.width || 0;
      h = given.height || 0;
    }
    return { width: w, height: h };
  }

  // The wheel zooms about the pointer and a drag on the drawing's empty space
  // pans -- the SVG itself; a box's and a district's interior are the SVG's
  // (`pointer-events: stroke`), as on the present DAG. Both stop at this
  // element so the page's own DAG zoom never sees them.
  function wireView(svg, root, setView, current) {
    if (!svg.addEventListener) return;
    svg.addEventListener("wheel", function (event) {
      event.preventDefault();
      if (event.stopPropagation) event.stopPropagation();
      var r = svg.getBoundingClientRect ? svg.getBoundingClientRect() : { left: 0, top: 0 };
      setView(VA.mapZoomAt(current(), event.deltaY, event.clientX - r.left, event.clientY - r.top), true);
    }, { passive: false });
    var drag = null;
    svg.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !event.target) return;
      var t = event.target;
      if (t !== svg && !(t.classList && (t.classList.contains("map__district") || t.classList.contains("map__box")))) return;
      if (t !== svg) {
        // On a district's or a box's stroke the click is the entity's; the
        // interior never arrives here. Let the click stand.
        return;
      }
      drag = { x: event.clientX, y: event.clientY, moved: false };
      if (event.stopPropagation) event.stopPropagation();
      root.classList.add("tv__scroll--zoomgrab");
      if (svg.setPointerCapture) {
        try { svg.setPointerCapture(event.pointerId); } catch (err) { /* synthetic */ }
      }
    });
    svg.addEventListener("pointermove", function (event) {
      if (!drag) return;
      var dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!dx && !dy) return;
      drag.moved = true;
      drag.x = event.clientX; drag.y = event.clientY;
      setView(VA.mapPan(current(), dx, dy), true);
    });
    var release = function () {
      drag = null;
      root.classList.remove("tv__scroll--zoomgrab");
    };
    svg.addEventListener("pointerup", release);
    svg.addEventListener("pointercancel", release);
  }

  // The region's size moved with no repaint (the 3D pane opened or closed, a
  // divider dragged): a view the page fitted is fitted again. One observer
  // per root, replaced each paint.
  function watchResize(root, onResize) {
    if (typeof ResizeObserver !== "function" || !root) return;
    if (root.mapResizeObserver) root.mapResizeObserver.disconnect();
    var last = regionSize(root, {});
    var observer = new ResizeObserver(function () {
      var now = regionSize(root, {});
      if (now.width === last.width && now.height === last.height) return;
      last = now;
      onResize();
    });
    observer.observe(root);
    root.mapResizeObserver = observer;
  }

  // --- the switch: Map . Classic ------------------------------------------
  //
  // One two-way control in the DAG region's own header, in every pane view
  // that shows the region. A model with no layout has no map, and the Map
  // button says so in two words and takes no click.
  VA.renderDagSwitch = function (state, topoProj, onChoose) {
    var head = VA.el("div", "tv__daghead");
    head.setAttribute("id", "dag-drawing");
    head.setAttribute("role", "group");
    head.setAttribute("aria-label", "how the model is drawn");
    var hasMap = VA.topologyHasMap(topoProj);
    var current = VA.dagDrawingFor(state.dagDrawing, topoProj);
    VA.DAG_DRAWING_ORDER.forEach(function (id) {
      var spec = VA.DAG_DRAWINGS[id];
      var unavailable = id === "map" && !hasMap;
      var b = VA.el("button", "ghost tvpick__mode", unavailable ? VA.NO_MAP_LABEL : spec.label);
      b.setAttribute("data-drawing", id);
      b.setAttribute("title", unavailable ? "This model has no map layout yet" : spec.title);
      b.setAttribute("aria-pressed", String(current === id));
      if (unavailable) b.setAttribute("disabled", "");
      b.onclick = function () { if (!unavailable && onChoose) onChoose(id); };
      head.appendChild(b);
    });
    return head;
  };
})(window.ViewerApp = window.ViewerApp || {});
