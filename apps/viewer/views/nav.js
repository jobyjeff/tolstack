// The left column: the model's tree (the_model_is_derived_once_and_the_left_
// column_is_its_tree, 2026-11-10).
//
// Until 2026-11-10 this file drew a list of models with the studies under
// the open one, and -- with the 3D pane open -- a scrape of the pane's hidden
// rail under the active row (apps/annotate/app.js's embedTree), which is why
// the column restructured by pane mode and why most of the menu Jeff designed
// on 2026-11-09 turned out to exist already behind a row labelled "Kinematic
// model". Now the column is the first reader of the ONE model object
// (apps/viewer/model.js, built from the projection's `model` block):
//
//   [model picker]                 the models, then any analysis in neither
//   -- with the 3D scene open only (2026-11-22): --
//   By part | By joint   All | Unbound n
//   Rigid bodies
//     body                          a band in the body's ink; show/hide
//       part                        heavier; "n of m" features bound; show/hide
//         feature  o                one mark: open, suggested, bound; its
//                                   pencil opens its form in the tree's place
//   Across bodies                   an assembly in no body, listed once
//   -- or, by joint: body > joint > constraint > feature, Joints between
//      bodies, At no joint; each feature once --
//   Studies                         the model's: chain studies, kinematic
//                                   studies, the sweep row
//
// With the scene closed the column holds the picker and the studies: the
// map is the structure view then (handoff the_tree_sits_beside_the_3d_
// canvas_and_holds_still). The shape is VA.navPlan's, decided once.
//
// Gone: the Models list, the component chip, the whole-rail mirror ("All N
// interfaces", "In this model" / "Other parts"), the Stacks section on a model
// those stacks are not part of, and any all/unbound/bound filter (Jeff,
// 2026-11-09: a part has a handful of features). Since 2026-11-23 nothing of
// the pane's rows is drawn here: a feature's faces are its form's
// (VA.renderFeatureForm), and the rows are read only for what the pane has
// selected (VA.sceneInspectStep, topology_app.js's followScenePick).
//
// Selecting a study never restructures the tree above it: the Studies
// section marks the open one and nothing else moves.
//
// Titles are short noun phrases (docs/SOP_TOLERANCE_STACK.md, "Titling an
// artifact"); an artifact's `description` is its name's hover tooltip and
// nothing else renders it. The name says what the artifact is, a row's one
// mark says what is wrong with it (nav_tooltip_once_and_rail_hover_emphasis).
(function (VA) {
  "use strict";

  // The picker's option values: `<kind>:<id>` (VA.NAV_PICK_KINDS). A table,
  // not inline literals, so the pairing scans reach it.
  VA.NAV_PICK_KINDS = Object.freeze({ topology: "topology", stack: "stack" });

  VA.navPickValue = function (kind, id) { return kind + ":" + id; };
  VA.parseNavPick = function (value) {
    var at = String(value || "").indexOf(":");
    if (at === -1) return null;
    var kind = value.slice(0, at);
    if (!VA.NAV_PICK_KINDS[kind]) return null;
    return { kind: kind, id: value.slice(at + 1) };
  };

  // The words the tree's headings and rows wear. One table (repo rule), and
  // the browser tier reads them off the page rather than restating them.
  VA.NAV_WORDS = Object.freeze({
    bodies: "Rigid bodies",
    parts: "Parts",
    interfaces: "Interfaces",
    between: "Joints between bodies",
    studies: "Studies",
    unbodied: "Parts",
    // The row that plays the newest published sweep in 3D -- what the row
    // labelled "Kinematic model" did until 2026-11-10, named for what it does.
    sweep: "Play the newest sweep",
    sweepHint: "the mechanism moving through its newest published sweep, in the 3D scene",
    partsCount: " parts",
    partCount: " part",
    constraintsCount: " constraints",
    featuresCount: " features",
    shown: "shown in 3D",
    hidden: "hidden in 3D",
    visibility: "show or hide in 3D",
    model: "model",
    empty: "No topologies or stacks in the projection.",
    // The tree's foot (VA.orphanBindings): a standing binding naming an
    // interface no model has, or a part whose 3D model was replaced.
    orphanOne: "1 binding names something that no longer exists",
    orphanMany: "{n} bindings name something that no longer exists",
    orphanEdge: "{edge} · face {face} · {date} · that interface is gone",
    orphanMesh: "{edge} · face {face} · {date} · that part's 3D model was replaced",
    // The Parts filter (handoff a_pattern_is_bound_as_its_like_faces_and_a_
    // face_can_be_added): every feature, or only those still to bind.
    filterAll: "All",
    filterUnbound: "Unbound",
    filterTitle: "show only the features not bound to a face yet, and their parts",
    filterCountTitle: "features in this model not bound to a face",
    // The grouping (handoff the_tree_sits_beside_the_3d_canvas_and_holds_
    // still, deliverable 7): one at a time, each thing once.
    byPart: "By part",
    byJoint: "By joint",
    groupingTitle: "list the model by its parts, or by the joints between them",
    acrossBodies: "Across bodies",
    atNoJoint: "At no joint",
    // A part's and a joint's count: its features bound.
    boundOf: "{n} of {m}",
    boundOfTitle: "{n} of {m} features bound to a face",
    // Two features with one face between them (deliverable 6).
    shared: "shares a face",
    sharedFace: "the same face is bound to {name}",
    sharedConcentric: "one sphere with {name}: a face lit for either is both features' face",
  });

  // How the tree groups the model (`state.navGroup`, the page's): by part,
  // the default, or by joint.
  VA.NAV_GROUPINGS = Object.freeze(["part", "joint"]);

  // What the Parts filter can show (`state.navFilter`, the page's): every
  // part and feature, or only the features not bound and the parts holding
  // one. It filters the tree and nothing else.
  VA.NAV_FILTERS = Object.freeze(["all", "unbound"]);

  // A feature the filter keeps: anything not bound (a suggestion, a
  // disagreement and nothing at all among them).
  function unbound(model, fid) {
    return model.status(fid) !== VA.FEATURE_STATUSES.bound;
  }

  // How many of the model's features are not bound -- the number beside the
  // filter.
  VA.unboundFeatureCount = function (model) {
    return ((model && model.features) || []).filter(function (f) { return unbound(model, f.id); }).length;
  };

  function filtering(state) {
    return !!state && state.navFilter === VA.NAV_FILTERS[1];
  }

  // Under the filter, a part is listed while it or a part inside it holds an
  // unbound feature.
  function partShown(model, partId, state) {
    if (!filtering(state)) return true;
    return model.subtreeOf(partId).some(function (pid) {
      return (model.part(pid) || { features: [] }).features.some(function (fid) { return unbound(model, fid); });
    });
  }

  function featureShown(model, fid, state) {
    return !filtering(state) || unbound(model, fid);
  }

  function tooltip(description, hint) {
    if (description && hint) return description + "\n\n" + hint;
    return description || hint || null;
  }

  function label(text, description, hint) {
    var span = VA.el("span", "navtree__label", text);
    var tip = tooltip(description, hint);
    if (tip) span.setAttribute("title", tip);
    return span;
  }

  // Open or closed, by key: the reader's own choice (state.navOpen) wins,
  // else the row kind's default.
  function isOpen(state, key, fallback) {
    var open = state && state.navOpen;
    if (open && Object.prototype.hasOwnProperty.call(open, key)) return !!open[key];
    return !!fallback;
  }

  function twisty(key, open, handlers) {
    var button = VA.el("button", "navtree__twisty");
    button.setAttribute("type", "button");
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("data-nav-twisty", key);
    button.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      if (handlers && handlers.onToggle) handlers.onToggle(key, open);
    };
    return button;
  }

  function leafGap() {
    return VA.el("span", "navtree__twistygap");
  }

  // Every fold row carries its fold key (`data-nav-fold`), which is how a
  // lit row behind it is marked on it (VA.lightNavTree) and how a selection
  // opens it (VA.navSelectionPaths, over the tree's plan).

  // A body's, a part's or a joint's row: a click SELECTS the entity (rule 3
  // of hover_and_select_light_the_same_things_on_all_four_surfaces_and_
  // nothing_goes_opaque, 2026-11-12 -- everything can be selected), the
  // twisty alone folds it, and resting on it is the one hover. Until
  // 2026-11-12 the whole row was the fold.
  function entityRow(className, kind, id, key, open, handlers, leaf) {
    var row = VA.el("div", "navtree__row " + className + rowClasses(kind, id));
    row.setAttribute("data-nav-kind", kind);
    row.setAttribute("data-nav-id", id);
    row.setAttribute("data-nav-fold", key);
    // A row with nothing under it draws no twisty: a control with nothing
    // behind it is shown as nothing.
    row.appendChild(leaf ? leafGap() : twisty(key, open, handlers));
    activatable(row, function () { if (handlers.onEntity) handlers.onEntity(kind, id); });
    hoverable(row, kind, id, handlers);
    return row;
  }

  // Resting on a row is the one hover (handlers.onHover carries the entity).
  function hoverable(row, kind, id, handlers) {
    var hover = function (on) {
      if (handlers.onHover) handlers.onHover(on ? { kind: kind, id: id } : null);
    };
    row.onmouseenter = function () { hover(true); };
    row.onmouseleave = function () { hover(false); };
    return row;
  }

  // The one mark a feature wears (VA.FEATURE_STATUSES), the same shape
  // wherever a feature is listed: an empty ring (open), a blue ring
  // (suggested), a green dot (bound). The stylesheet draws all three.
  function mark(status) {
    var span = VA.el("span", "navtree__mark");
    span.setAttribute("data-status", status);
    span.setAttribute("aria-hidden", "true");
    return span;
  }

  // A part's or a body's show/hide, as the sweep rail's checkboxes had it:
  // ticked is shown. Only where the scene is mounted (handlers.onVisibility);
  // absent, nothing says so.
  function visibility(kind, id, shown, mixed, handlers) {
    if (!handlers || !handlers.onVisibility) return null;
    var box = VA.el("input", "navtree__vis");
    box.type = "checkbox";
    box.checked = !!shown;
    box.indeterminate = !!mixed;
    box.setAttribute("title", VA.NAV_WORDS.visibility);
    box.setAttribute("aria-label", VA.NAV_WORDS.visibility + ": " + (shown ? VA.NAV_WORDS.shown : VA.NAV_WORDS.hidden));
    box.setAttribute("data-nav-vis", kind + ":" + id);
    box.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      handlers.onVisibility(kind, id, !!box.checked);
    };
    return box;
  }

  function count(text) {
    return VA.el("span", "navtree__count", text);
  }

  function section(kind, heading, list, control) {
    var box = VA.el("div", "navtree__section navtree__section--" + kind);
    if (control) {
      var head = VA.el("div", "navtree__sectionhead");
      head.appendChild(VA.el("h2", "navtree__heading", heading));
      head.appendChild(control);
      box.appendChild(head);
    } else {
      box.appendChild(VA.el("h2", "navtree__heading", heading));
    }
    box.appendChild(list);
    return box;
  }

  // "All · Unbound" and the count of unbound features, on the section that
  // lists the model's parts. Only where the page handles it.
  function filterControl(model, state, handlers) {
    if (!handlers || !handlers.onNavFilter) return null;
    var W = VA.NAV_WORDS;
    var strip = VA.el("div", "navtree__tags navtree__filter");
    strip.setAttribute("title", W.filterTitle);
    [[VA.NAV_FILTERS[0], W.filterAll], [VA.NAV_FILTERS[1], W.filterUnbound]].forEach(function (pair) {
      var on = (state.navFilter || VA.NAV_FILTERS[0]) === pair[0];
      var chip = VA.el("button", "navtree__tag" + (on ? " navtree__tag--on" : ""), pair[1]);
      chip.setAttribute("type", "button");
      chip.setAttribute("aria-pressed", on ? "true" : "false");
      chip.setAttribute("data-nav-filter", pair[0]);
      chip.onclick = function () { handlers.onNavFilter(pair[0]); };
      strip.appendChild(chip);
    });
    var n = count(String(VA.unboundFeatureCount(model)));
    n.setAttribute("title", W.filterCountTitle);
    n.setAttribute("data-nav-filter-count", "true");
    strip.appendChild(n);
    return strip;
  }

  // The rows the page's ONE selection and ONE hover light (one_selection_one_
  // hover_and_leaders_off; two tiers since hover_and_select_light_the_same_
  // things_on_all_four_surfaces_and_nothing_goes_opaque, 2026-11-12):
  // `state.focus` is {selected, hovered}, each a model entity or null, and
  // VA.focusNavRowsOf says which `<kind>:<id>` rows each reaches, as {own,
  // touching}. Computed once per render; a row asks by its own kind and id
  // and is drawn `--on` / `--on-touching` for the selection, `--hot` /
  // `--hot-touching` for the hover.
  var lit = { on: {}, hot: {} };

  // {`<kind>:<id>`: tier} for an entity's rows.
  function litRows(model, entity) {
    var out = {};
    var rows = VA.focusNavRowsOf(model, entity);
    (rows.touching || []).forEach(function (key) { out[key] = VA.FOCUS_TIERS.touching; });
    (rows.own || []).forEach(function (key) { out[key] = VA.FOCUS_TIERS.own; });
    return out;
  }

  var LIT_CLASS = { on: "navtree__row--on", hot: "navtree__row--hot" };
  var HOLDS_CLASS = { on: "navtree__row--holds", hot: "navtree__row--holds" };

  function tierClass(base, tier) {
    return tier === VA.FOCUS_TIERS.own ? base : tier === VA.FOCUS_TIERS.touching ? base + "-touching" : null;
  }

  function rowClasses(kind, id) {
    var key = kind + ":" + id;
    var on = tierClass(LIT_CLASS.on, lit.on[key]);
    var hot = tierClass(LIT_CLASS.hot, lit.hot[key]);
    return (on ? " " + on : "") + (hot ? " " + hot : "");
  }

  // The hovered rows, re-lit in place on a tree already drawn: the one hover
  // moves many times between two paints, and only the class moves with it.
  // A lit row behind a closed fold marks the deepest DRAWN fold on its path
  // (the drawn plan's paths) with `--holds` / `--holds-touching`: hover opens
  // nothing, so the counterpart's place is shown on the fold that hides it.
  // Returns how many drawn rows lit.
  VA.lightNavTree = function (root, model, hovered) {
    if (!root || !root.querySelectorAll) return 0;
    var hot = litRows(model, hovered);
    lit.hot = hot;
    var count = 0;
    var rows = root.querySelectorAll("div.navtree__row");
    var drawn = {};
    var folds = {};
    var i;
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row.classList) continue;
      var fold = row.getAttribute("data-nav-fold");
      if (fold) folds[fold] = row;
      // One class per call: the fast tier's DOM shim takes one, and so did
      // the browsers this started on.
      [LIT_CLASS.hot, LIT_CLASS.hot + "-touching", HOLDS_CLASS.hot, HOLDS_CLASS.hot + "-touching"]
        .forEach(function (cls) { row.classList.remove(cls); });
      var kind = row.getAttribute("data-nav-kind");
      var id = row.getAttribute("data-nav-id");
      if (!kind || !id) continue;
      drawn[kind + ":" + id] = true;
      var cls = tierClass(LIT_CLASS.hot, hot[kind + ":" + id]);
      if (!cls) continue;
      count++;
      row.classList.add(cls);
    }
    // The hidden rows: the deepest drawn fold on each one's path wears the mark.
    var paths = drawnPlan.paths;
    Object.keys(hot).forEach(function (key) {
      if (drawn[key]) return;
      var path = paths[key] || [];
      for (var j = path.length - 1; j >= 0; j--) {
        var holder = folds[path[j]];
        if (!holder) continue;
        var mark = tierClass(HOLDS_CLASS.hot, hot[key]);
        // An own mark outranks a touching one on the same fold.
        if (hot[key] === VA.FOCUS_TIERS.own) holder.classList.remove(HOLDS_CLASS.hot + "-touching");
        if (!holder.classList.contains(HOLDS_CLASS.hot)) holder.classList.add(mark);
        break;
      }
    });
    return count;
  };

  // Keyboard: a row that does something on a click is a button-role row.
  function activatable(row, act) {
    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");
    row.onclick = act;
    row.onkeydown = function (event) {
      if (!event || (event.key !== "Enter" && event.key !== " ")) return;
      if (event.target !== row) return;
      if (event.preventDefault) event.preventDefault();
      act();
    };
  }

  VA.navFeatureKey = function (fid) { return "f:" + fid; };

  // Two clicks on one feature row this close together open its form
  // (topology_app.js's onNavFeature), the platform's usual double-click gap.
  VA.NAV_DOUBLE_CLICK_MS = 450;

  // --- the tree's plan (the_tree_sits_beside_the_3d_canvas_and_holds_still,
  // 2026-11-22) -----------------------------------------------------------------
  //
  // The ONE place the tree's shape is decided: which rows exist, under which
  // folds, in which order -- for either grouping, under the filter. The
  // renderer walks it, a selection opens the folds it names (VA.navSelection
  // Paths) and a hover marks the deepest drawn one (VA.lightNavTree), so the
  // three can never disagree about where a row is. Until 2026-11-22 the shape
  // was written twice, once as DOM here and once as fold keys in model.js
  // (VA.navRowPath), and a feature was listed under its part and again under
  // every interface it ends.
  //
  //   by part    Rigid bodies > body > part (> part inside it) > feature;
  //              "Across bodies": an assembly in no body, with only its
  //              parts that are in no body either -- every other part is
  //              listed under the body it moves with, and nowhere else
  //   by joint   Rigid bodies > body > joint inside it > constraint >
  //              feature; Joints between bodies > joint > ...; At no joint:
  //              the features no interface ends on
  //
  // Each feature is listed once: by joint, under the first interface (in the
  // model's order) it ends.
  //
  // A node: {type, kind, id, fold, children, withPart}. `type` is one of
  // VA.NAV_ROW_TYPES; `fold` is the row's fold key (`b:`, `p:`, `j:`, `i:`,
  // `f:`); `withPart` prepends the part to a feature listed outside it.
  VA.NAV_ROW_TYPES = Object.freeze({ body: "body", part: "part", joint: "joint",
    interface: "interface", feature: "feature" });

  function grouping(state) {
    return state && state.navGroup === VA.NAV_GROUPINGS[1] ? VA.NAV_GROUPINGS[1] : VA.NAV_GROUPINGS[0];
  }

  VA.navPlan = function (model, state) {
    var T = VA.NAV_ROW_TYPES;
    var sections = [];
    if (!model) return { sections: sections, paths: {} };
    var W = VA.NAV_WORDS;
    var listed = {};
    var featureNode = function (fid, withPart) {
      listed[fid] = true;
      return { type: T.feature, kind: "feature", id: fid, fold: VA.navFeatureKey(fid), children: [], withPart: !!withPart };
    };
    var partNode = function (pid) {
      var part = model.part(pid);
      var body = model.bodyOf(pid);
      // A part inside an assembly is listed under it only where it moves with
      // the same body; one in another body is listed there, once.
      var kids = model.childrenOf(pid).filter(function (c) {
        return (model.bodyOf(c) || null) === (body || null) && partShown(model, c, state);
      }).map(partNode);
      var feats = part.features.filter(function (fid) { return featureShown(model, fid, state); })
        .map(function (fid) { return featureNode(fid, false); });
      return { type: T.part, kind: "part", id: pid, fold: "p:" + pid, children: kids.concat(feats) };
    };
    var interfaceNode = function (iface) {
      var ends = (iface.ends || []).filter(function (fid) {
        return !listed[fid] && model.feature(fid) && featureShown(model, fid, state);
      }).map(function (fid) { return featureNode(fid, true); });
      return { type: T.interface, kind: "interface", id: iface.id, fold: "i:" + iface.id, children: ends };
    };
    var jointNode = function (joint) {
      var constraints = model.constraintsOf(joint.id);
      if (constraints.length === 1) return interfaceNode(constraints[0]);
      var kids = constraints.map(interfaceNode).filter(function (n) { return n.children.length || !filtering(state); });
      return { type: T.joint, kind: "joint", id: joint.id, fold: "j:" + joint.id, children: kids };
    };
    var kept = function (n) { return n.children.length || !filtering(state); };
    var bodyNode = function (body, children) {
      return { type: T.body, kind: "body", id: body.id, fold: "b:" + body.id, children: children };
    };
    if (grouping(state) === VA.NAV_GROUPINGS[0]) {
      var bodies = model.bodies.filter(function (body) {
        return model.allPartsOf(body.id).some(function (pid) { return partShown(model, pid, state); });
      }).map(function (body) {
        return bodyNode(body, body.parts.filter(function (pid) { return partShown(model, pid, state); }).map(partNode));
      });
      if (bodies.length) sections.push({ kind: "bodies", heading: W.bodies, nodes: bodies });
      var loose = model.unbodiedParts.filter(function (pid) { return partShown(model, pid, state); }).map(partNode);
      if (loose.length) sections.push({ kind: "parts", heading: model.bodies.length ? W.acrossBodies : W.unbodied, nodes: loose });
    } else {
      var within = model.bodies.map(function (body) {
        return bodyNode(body, model.jointsWithin(body.id).map(jointNode).filter(kept));
      }).filter(function (n) { return n.children.length; });
      if (within.length) sections.push({ kind: "bodies", heading: W.bodies, nodes: within });
      var between = model.jointsBetween().map(jointNode).filter(kept);
      if (between.length) {
        sections.push({ kind: "joints", heading: model.bodies.length ? W.between : W.interfaces, nodes: between });
      }
      var none = model.features.filter(function (f) { return !listed[f.id] && featureShown(model, f.id, state); })
        .map(function (f) { return featureNode(f.id, true); });
      if (none.length) sections.push({ kind: "loose", heading: W.atNoJoint, nodes: none });
    }
    // Every row's folds, outermost first, from the one walk.
    var paths = {};
    var walk = function (nodes, above) {
      nodes.forEach(function (n) {
        var key = n.kind + ":" + n.id;
        if (!paths[key]) paths[key] = above.slice();
        walk(n.children, above.concat([n.fold]));
      });
    };
    sections.forEach(function (s) { walk(s.nodes, []); });
    return { sections: sections, paths: paths };
  };

  // The folds a selection opens (rule 2 of the_tree_sits_beside_the_3d_
  // canvas_and_holds_still: the path to the selected row and nothing else):
  // the path to the entity's own row, or -- an entity this grouping lists no
  // row for (an interface by part, a dimension) -- to the rows of what it
  // owns. A list of paths.
  VA.navSelectionPaths = function (plan, model, entity) {
    if (!plan || !entity) return [];
    var own = plan.paths[entity.kind + ":" + entity.id];
    if (own) return [own];
    return VA.focusLightOf(model, entity).own.map(function (e) { return plan.paths[e.kind + ":" + e.id]; })
      .filter(Boolean);
  };

  // The rows that stand for a selection on screen, as `<kind>:<id>`: its own
  // row, else the rows of what it owns (VA.navSelectionPaths' rule).
  VA.navSelectionRows = function (plan, model, entity) {
    if (!plan || !entity) return [];
    var key = entity.kind + ":" + entity.id;
    if (plan.paths[key]) return [key];
    return VA.focusLightOf(model, entity).own.map(function (e) { return e.kind + ":" + e.id; })
      .filter(function (k) { return !!plan.paths[k]; });
  };

  // "n of m": how many of a row's features are bound.
  function boundCount(model, featureIds) {
    var n = count(fill(VA.NAV_WORDS.boundOf, { n: model.boundCount(featureIds), m: featureIds.length }));
    n.setAttribute("title", fill(VA.NAV_WORDS.boundOfTitle, { n: model.boundCount(featureIds), m: featureIds.length }));
    n.setAttribute("data-nav-bound", model.boundCount(featureIds) + "/" + featureIds.length);
    return n;
  }

  // Every feature a part carries, itself and every part inside it.
  function subtreeFeatures(model, partId) {
    var out = [];
    model.subtreeOf(partId).forEach(function (pid) {
      out = out.concat((model.part(pid) || { features: [] }).features);
    });
    return out;
  }

  // The features at a joint's or an interface's ends, once each.
  function endFeatures(model, interfaces) {
    var seen = {};
    var out = [];
    interfaces.forEach(function (i) {
      (i.ends || []).forEach(function (fid) {
        if (seen[fid]) return;
        seen[fid] = true;
        out.push(fid);
      });
    });
    return out;
  }

  // "shares a face" on a feature that shares one (model.sharesFaceWith),
  // naming the other on hover.
  function sharedNote(model, fid) {
    var others = model.sharesFaceWith ? model.sharesFaceWith(fid) : [];
    if (!others.length) return null;
    var W = VA.NAV_WORDS;
    var span = VA.el("span", "navtree__shared", W.shared);
    span.setAttribute("data-nav-shared", others.map(function (s) { return s.feature; }).join(" "));
    span.setAttribute("title", others.map(function (s) {
      var f = model.feature(s.feature);
      return fill(s.why === VA.SHARED_FACE_WHY.concentric ? W.sharedConcentric : W.sharedFace,
        { name: model.label(f.part) + " · " + f.name });
    }).join("\n"));
    return span;
  }

  // A feature's row: its twisty, its mark, its name; lit when the page's
  // selection or hover reaches it. `withPart` prepends the part, for a
  // feature listed outside it (by joint).
  //
  // A click selects it; nothing opens under it (2026-11-23: its faces are
  // its form's, which takes the tree's place).
  function featureRow(model, fid, state, handlers, withPart) {
    var feature = model.feature(fid);
    var row = VA.el("div", "navtree__row navtree__row--feature" + rowClasses("feature", fid));
    row.setAttribute("data-nav-kind", "feature");
    row.setAttribute("data-nav-id", fid);
    row.setAttribute("data-node-id", feature.node);
    row.appendChild(leafGap());
    row.appendChild(mark(model.status(fid)));
    var text = withPart ? model.label(feature.part) + " · " + feature.name : feature.name;
    var name = label(text, null, null);
    name.setAttribute("title", text);
    row.appendChild(name);
    var note = sharedNote(model, fid);
    if (note) row.appendChild(note);
    activatable(row, function () { if (handlers.onFeature) handlers.onFeature(fid); });
    hoverable(row, "feature", fid, handlers);
    // Its form (VA.renderFeatureForm): the pencil, on a hovered or selected
    // row; Enter on the selected row; a second click (topology_app.js).
    if (handlers.onEditFeature && VA.featureEditable(model, fid)) {
      var W = VA.FEATURE_FORM_WORDS;
      var pen = VA.el("button", "navtree__edit", W.edit);
      pen.setAttribute("type", "button");
      pen.setAttribute("title", W.editTitle);
      pen.setAttribute("aria-label", W.editTitle);
      pen.setAttribute("data-nav-edit", fid);
      pen.onclick = function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        handlers.onEditFeature(fid);
      };
      row.appendChild(pen);
      var select = row.onkeydown;
      row.onkeydown = function (event) {
        if (event && event.key === "Enter" && event.target === row && row.classList.contains("navtree__row--on")) {
          // Stopped here: the form's own Enter (the tick) listens on the page.
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
          handlers.onEditFeature(fid);
          return;
        }
        select(event);
      };
    }
    return row;
  }

  // Each kind of row, from its plan node. `open` is whether its children
  // are drawn.
  function planRow(model, node, state, handlers, open) {
    var T = VA.NAV_ROW_TYPES;
    var W = VA.NAV_WORDS;
    var leaf = !node.children.length;
    if (node.type === T.feature) return featureRow(model, node.id, state, handlers, node.withPart);
    if (node.type === T.body) {
      var body = model.body(node.id);
      var brow = entityRow("navtree__row--body", "body", body.id, node.fold, open, handlers, leaf);
      brow.style.setProperty("--swatch", "var(--tv-body-ink-" + model.tint(body.id) + ")");
      var swatch = VA.el("span", "navtree__swatch");
      swatch.setAttribute("aria-hidden", "true");
      brow.appendChild(swatch);
      var bname = label(body.name, null, null);
      bname.setAttribute("title", body.name);
      brow.appendChild(bname);
      // Every part the body carries, assemblies' parts among them.
      var all = model.allPartsOf(body.id);
      brow.appendChild(count(all.length + (all.length === 1 ? W.partCount : W.partsCount)));
      var bbox = meshedVisibility("body", body.id, all, model, state, handlers);
      if (bbox) brow.appendChild(bbox);
      return brow;
    }
    if (node.type === T.part) {
      var part = model.part(node.id);
      var prow = entityRow("navtree__row--part", "part", node.id, node.fold, open, handlers, leaf);
      if (model.childrenOf(node.id).length) prow.setAttribute("data-nav-assembly", "true");
      var pname = label(part.label, null, null);
      pname.setAttribute("title", part.label);
      prow.appendChild(pname);
      prow.appendChild(boundCount(model, subtreeFeatures(model, node.id)));
      var pbox = meshedVisibility("part", node.id, model.subtreeOf(node.id), model, state, handlers);
      if (pbox) prow.appendChild(pbox);
      return prow;
    }
    if (node.type === T.joint) {
      var joint = model.joint(node.id);
      var jrow = entityRow("navtree__row--joint", "joint", joint.id, node.fold, open, handlers, leaf);
      var jname = label(joint.parts.map(function (pid) {
        var p = model.part(pid);
        return p ? p.name : pid;
      }).join(" and "), null, null);
      jname.setAttribute("title", joint.parts.map(function (pid) { return model.label(pid); }).join(" and ") +
        "\n" + model.constraintsOf(joint.id).length + W.constraintsCount);
      jrow.appendChild(jname);
      jrow.appendChild(boundCount(model, endFeatures(model, model.constraintsOf(joint.id))));
      return jrow;
    }
    // An interface (a shared node or a gap edge): its kind, then its ends' count.
    var iface = model.interface(node.id);
    var kind = iface.source === "node" ? "node" : "edge";
    var row = VA.el("div", "navtree__row navtree__row--interface" + rowClasses("interface", iface.id));
    row.setAttribute("data-nav-kind", "interface");
    row.setAttribute("data-nav-id", iface.id);
    row.setAttribute("data-interface-kind", kind);
    row.setAttribute("data-nav-fold", node.fold);
    row.appendChild(leaf ? leafGap() : twisty(node.fold, open, handlers));
    hoverable(row, "interface", iface.id, handlers);
    var iname = label(iface.name, null, null);
    iname.setAttribute("title", iface.name + "\n" + VA.interfaceKindWord(iface.kind));
    row.appendChild(iname);
    row.appendChild(count(VA.interfaceKindWord(iface.kind)));
    row.appendChild(boundCount(model, endFeatures(model, [iface])));
    activatable(row, function () {
      if (handlers.onInterface) handlers.onInterface(kind, iface.id);
    });
    return row;
  }

  // One plan node drawn: its row and, when open, its children. A feature
  // is a leaf.
  function planItem(model, node, state, handlers, depth) {
    var T = VA.NAV_ROW_TYPES;
    var li = VA.el("li", "navtree__item navtree__item--" + node.type);
    li.setAttribute("data-depth", String(depth));
    var open = node.type !== T.feature && !!node.children.length && isOpen(state, node.fold, node.type === T.body);
    li.appendChild(planRow(model, node, state, handlers, open));
    if (open) {
      var list = VA.el("ul", "navtree__children");
      list.setAttribute("data-nav-under", node.fold);
      node.children.forEach(function (c) { list.appendChild(planItem(model, c, state, handlers, depth + 1)); });
      li.appendChild(list);
    }
    return li;
  }

  // A part's show/hide box: over the part and, for an assembly, every part
  // inside it that has a mesh -- ticked when all show, mixed when some do,
  // as a body's is.
  function meshedVisibility(kind, id, partIds, model, state, handlers) {
    var meshed = partIds.filter(function (pid) { return model.hasMesh(pid); });
    if (!meshed.length) return null;
    var hiddenCount = meshed.filter(function (pid) {
      return !!(state && state.hiddenParts && state.hiddenParts[pid]);
    }).length;
    return visibility(kind, id, hiddenCount < meshed.length,
      hiddenCount > 0 && hiddenCount < meshed.length, handlers);
  }

  // The tree's head: the grouping (by part, by joint) and the filter (all,
  // unbound, and how many are unbound). Only where the page handles them.
  function treeHead(model, state, handlers) {
    var W = VA.NAV_WORDS;
    var head = VA.el("div", "navtree__head");
    if (handlers.onNavGroup) {
      var strip = VA.el("div", "navtree__tags navtree__grouping");
      strip.setAttribute("title", W.groupingTitle);
      [[VA.NAV_GROUPINGS[0], W.byPart], [VA.NAV_GROUPINGS[1], W.byJoint]].forEach(function (pair) {
        var on = grouping(state) === pair[0];
        var chip = VA.el("button", "navtree__tag" + (on ? " navtree__tag--on" : ""), pair[1]);
        chip.setAttribute("type", "button");
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        chip.setAttribute("data-nav-group-by", pair[0]);
        chip.onclick = function () { handlers.onNavGroup(pair[0]); };
        strip.appendChild(chip);
      });
      head.appendChild(strip);
    }
    var filter = filterControl(model, state, handlers);
    if (filter) head.appendChild(filter);
    return head.childNodes.length ? head : null;
  }

  // The model's structure (shown only with the 3D scene, rule 1 of the_tree_
  // sits_beside_the_3d_canvas_and_holds_still), from its plan.
  function structureSections(root, model, plan, state, handlers) {
    var box = VA.el("div", "navtree__struct");
    var head = treeHead(model, state, handlers);
    if (head) box.appendChild(head);
    plan.sections.forEach(function (s) {
      var list = VA.el("ul", "navtree__list");
      s.nodes.forEach(function (n) { list.appendChild(planItem(model, n, state, handlers, 0)); });
      box.appendChild(section(s.kind, s.heading, list));
    });
    root.appendChild(box);
    return box;
  }

  // The plan of the last tree drawn: what VA.lightNavTree reads a hidden
  // row's folds from.
  var drawnPlan = { sections: [], paths: {} };

  VA.renderNavTree = function (root, tree, state, handlers) {
    VA.clear(root);
    root.className = "navtree";
    handlers = handlers || {};
    var topologies = (tree && tree.topologies) || [];
    var looseStacks = (tree && tree.looseStacks) || [];
    var kinematic = (tree && tree.kinematic) || [];
    drawnPlan = { sections: [], paths: {} };
    if (!topologies.length && !looseStacks.length && !kinematic.length) {
      root.appendChild(VA.el("p", "muted", VA.NAV_WORDS.empty));
      return root;
    }
    root.appendChild(picker(topologies, looseStacks, state, handlers));
    var open = null;
    if (state.mode !== "stack") {
      open = topologies.filter(function (t) { return t.id === state.topologyId; })[0] || null;
    }
    if (open) {
      var model = state.models ? state.models[open.id] : (state.model || null);
      // The structure is on screen only beside the 3D scene (handlers.
      // structure); with it closed the column holds the model and its
      // studies, and the map is the structure view.
      if (model && handlers.structure) {
        // The rows the one selection and the one hover reach, for this paint.
        var focus = state.focus || {};
        lit = { on: litRows(model, focus.selected), hot: litRows(model, focus.hovered) };
        drawnPlan = VA.navPlan(model, state);
        var box = structureSections(root, model, drawnPlan, state, handlers);
        if (handlers.orphans && handlers.orphans.length) box.appendChild(orphanFoot(handlers.orphans));
        // The marks on closed folds that hide a hovered row are the lighter's
        // (VA.lightNavTree), so a fresh paint wears them too.
        if (focus.hovered) VA.lightNavTree(root, model, focus.hovered);
      }
      var studies = studiesList(open, state, handlers);
      if (studies) root.appendChild(section("studies", VA.NAV_WORDS.studies, studies));
    }
    if (kinematic.length) root.appendChild(kinematicSection(kinematic, state, handlers));
    return root;
  };

  // One line at the foot of the tree, opening to the list: a warning, said
  // once, that refuses nothing (handoff a_binding_shows_the_moment_it_is_made_
  // and_is_corrected_where_it_is_shown, deliverable 6).
  function orphanFoot(orphans) {
    var W = VA.NAV_WORDS;
    var box = VA.el("details", "navtree__orphans");
    var summary = VA.el("summary", "navtree__orphansummary");
    summary.appendChild(VA.warningIcon("navtree__orphanmark"));
    var head = orphans.length === 1 ? W.orphanOne : W.orphanMany.replace("{n}", String(orphans.length));
    summary.appendChild(VA.el("span", "navtree__orphanwords", head));
    box.appendChild(summary);
    var list = VA.el("ul", "navtree__orphanlist");
    orphans.forEach(function (o) {
      var key = o.event.geometry_key || {};
      var text = (o.reason === VA.ORPHAN_REASONS.edge ? W.orphanEdge : W.orphanMesh)
        .replace("{edge}", String(o.edgeId).replace(/_/g, " "))
        .replace("{face}", String(key.face_id))
        .replace("{date}", String(o.event.created_at || "").slice(0, 10));
      var li = VA.el("li", "navtree__orphan", text);
      li.setAttribute("title", text);
      li.setAttribute("data-orphan-reason", o.reason);
      list.appendChild(li);
    });
    box.appendChild(list);
    return box;
  }

  // The model picker: every model, then every analysis in neither (a stack
  // no topology re-expresses). The chosen one is what the page shows.
  function picker(topologies, looseStacks, state, handlers) {
    var box = VA.el("div", "navtree__picker");
    var select = VA.el("select", "navtree__select");
    select.setAttribute("data-nav-picker", "1");
    select.setAttribute("aria-label", VA.NAV_WORDS.model);
    var current = null;
    topologies.forEach(function (t) {
      var option = VA.el("option", "", t.title);
      option.value = VA.navPickValue(VA.NAV_PICK_KINDS.topology, t.id);
      option.setAttribute("value", option.value);
      option.setAttribute("data-nav-kind", "topology");
      option.setAttribute("data-nav-id", t.id);
      if (t.description) option.setAttribute("title", t.description);
      if (state.mode !== "stack" && t.id === state.topologyId) current = option;
      select.appendChild(option);
    });
    if (looseStacks.length) {
      var group = VA.el("optgroup", "");
      group.setAttribute("label", "Other analyses");
      looseStacks.forEach(function (s) {
        var option = VA.el("option", "", s.title);
        option.value = VA.navPickValue(VA.NAV_PICK_KINDS.stack, s.id);
        option.setAttribute("value", option.value);
        option.setAttribute("data-nav-kind", "stack");
        option.setAttribute("data-nav-id", s.id);
        if (s.description) option.setAttribute("title", s.description);
        if (state.mode === "stack" && s.id === state.selectedStackId) current = option;
        group.appendChild(option);
      });
      select.appendChild(group);
    }
    if (current) {
      select.value = current.value;
      current.setAttribute("selected", "selected");
      if (current.getAttribute("title")) select.setAttribute("title", current.getAttribute("title"));
    }
    select.onchange = function () {
      var pick = VA.parseNavPick(select.value);
      if (!pick) return;
      if (pick.kind === VA.NAV_PICK_KINDS.topology && handlers.onTopology) handlers.onTopology(pick.id);
      if (pick.kind === VA.NAV_PICK_KINDS.stack && handlers.onStack) handlers.onStack(pick.id);
    };
    box.appendChild(select);
    return box;
  }

  // The 3D control a study row wears where the scene is mounted: it selects
  // the row and opens the pane on it. Quiet until hovered or focused.
  function threeDControl(row, handlers, select) {
    if (!handlers || !handlers.on3D) return;
    var button = VA.el("button", "navtree__3d", "3D");
    button.setAttribute("type", "button");
    button.setAttribute("title", "Open in 3D");
    button.setAttribute("aria-label", "Open in 3D");
    button.setAttribute("data-nav-3d", "1");
    button.onclick = function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      handlers.on3D(select);
    };
    row.appendChild(button);
  }

  // The open model's studies: the tag chips over them, each chain study, each
  // kinematic study, and the sweep row for a model with published runs and
  // no kinematic study. null when the model has none of these.
  function studiesList(t, state, handlers) {
    var inThisTopology = state.mode === "topology" && state.topologyId === t.id;
    var selection = state.tagFilter || {};
    var items = [];
    var chips = [];
    // A chip row only where it can filter: an axis every body or study tags
    // with one value (v2's `component · propeller-system`) is a label, not a
    // filter, and the column shows nothing about it (Jeff, 2026-11-09).
    (t.tagAxes || []).filter(function (axis) {
      return (axis.values || []).length > 1;
    }).forEach(function (axis) {
      var strip = VA.el("div", "navtree__tags");
      strip.setAttribute("data-tag-axis", axis.axis);
      strip.appendChild(VA.el("span", "navtree__tagaxis", axis.axis));
      axis.values.forEach(function (value) {
        var on = (selection[axis.axis] || []).indexOf(value) !== -1;
        var chip = VA.el("button", "navtree__tag" + (on ? " navtree__tag--on" : ""), value);
        chip.setAttribute("type", "button");
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        chip.setAttribute("data-tag-value", value);
        chip.onclick = function () { if (handlers.onTag) handlers.onTag(axis.axis, value); };
        strip.appendChild(chip);
      });
      chips.push(strip);
    });
    (t.studies || []).filter(function (s) {
      return VA.studyMatchesTags(s, selection, t.variantAxis);
    }).forEach(function (s) {
      var active = inThisTopology && state.studyId === s.id;
      var srow = VA.el("div", "navtree__row navtree__row--study" +
        (active ? " navtree__row--on" : "") +
        (s.status === "error" ? " navtree__row--warn" : ""));
      srow.appendChild(label(s.title, s.description, null));
      // One mark, and only where there is something to look at: VA.
      // studyNavStatus decides which icon and what it says.
      statusIcon(VA.studyNavStatus(s), s.title, srow, handlers);
      srow.setAttribute("data-nav-kind", "study");
      srow.setAttribute("data-nav-id", s.id);
      srow.setAttribute("data-topology-id", t.id);
      srow.onclick = function () { if (handlers.onStudy) handlers.onStudy(t.id, s.id); };
      threeDControl(srow, handlers, function () { handlers.onStudy(t.id, s.id); });
      items.push(VA.el("li", "navtree__item", srow));
    });
    (t.kinematic ? kinematicRows(t.kinematic, state, handlers) : []).forEach(function (item) {
      items.push(item);
    });
    if (!items.length && !chips.length) return null;
    var list = VA.el("ul", "navtree__list");
    chips.forEach(function (strip) { list.appendChild(VA.el("li", "navtree__item", strip)); });
    items.forEach(function (item) { list.appendChild(item); });
    return list;
  }

  // The kinematic studies, and the sweep row (a model with published runs and
  // no kinematic study of its own, VA.kinematicNav). Kept for a group whose
  // model the topology projection does not list (kinematicSection, below).
  function kinematicRows(group, state, handlers) {
    var items = [];
    group.studies.forEach(function (s) {
      var active = state.mode === "kinematic" && state.kinematicId === s.id;
      var row = VA.el("div", "navtree__row navtree__row--study" +
        (active ? " navtree__row--on" : "") +
        (s.failed ? " navtree__row--warn" : ""));
      row.appendChild(label(s.title, s.description, null));
      statusIcon(s.navStatus, s.title, row, handlers);
      row.setAttribute("data-nav-kind", "kinematic");
      row.setAttribute("data-nav-id", s.id);
      row.setAttribute("data-topology-id", group.topologyId);
      row.onclick = function () { if (handlers.onKinematic) handlers.onKinematic(s.id); };
      threeDControl(row, handlers, function () { handlers.onKinematic(s.id); });
      items.push(VA.el("li", "navtree__item", row));
    });
    if (group.model) {
      var model = group.model;
      var mrow = VA.el("div", "navtree__row navtree__row--study navtree__row--model");
      mrow.appendChild(label(VA.NAV_WORDS.sweep, null,
        VA.NAV_WORDS.sweepHint + (model.ts ? " (" + String(model.ts).slice(0, 10) + ")" : "")));
      mrow.setAttribute("data-nav-kind", "kinematic-model");
      mrow.setAttribute("data-nav-id", group.topologyId);
      mrow.onclick = function () {
        if (handlers.onKinematicModel) handlers.onKinematicModel(group.topologyId, model.runId);
      };
      items.push(VA.el("li", "navtree__item", mrow));
    }
    return items;
  }

  // A kinematic group whose model the topology projection does not list:
  // under the group's own name, as before. Absent when there is none.
  function kinematicSection(groups, state, handlers) {
    var box = VA.el("div", "navtree__section navtree__section--kinematic");
    box.appendChild(VA.el("h2", "navtree__heading", "Kinematic studies"));
    var ul = VA.el("ul", "navtree__list");
    groups.forEach(function (group) {
      var li = VA.el("li", "navtree__item");
      var head = VA.el("div", "navtree__group");
      head.appendChild(label(group.title, null, null));
      head.setAttribute("title", group.title);
      li.appendChild(head);
      var children = VA.el("ul", "navtree__children");
      kinematicRows(group, state, handlers).forEach(function (row) { children.appendChild(row); });
      li.appendChild(children);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  // The ONE mark a study row may wear (viewer_nav_verdict_into_alert_and_
  // icon, 2026-09-22): a drawn icon, no chip framing, everything it has to
  // say in the card it opens. `stopClick`: the row underneath re-renders the
  // rail, which would replace the icon the pointer rests on.
  function statusIcon(status, title, row, handlers) {
    if (!status) return;
    row.appendChild(VA.alertBadge(status.alerts, title,
      handlers && handlers.onCardShow, {
        stopClick: true,
        className: "navstatus navstatus--" + status.level,
        icon: VA.warningIcon("navstatus__mark"),
      }));
  }

  // --- the faces layer: the pane's rows for one feature ---------------------
  //
  // The annotator still sends its whole rail ({type: "annotate:tree"}, app.js's
  // embedTree) and takes a gesture back on any row by key. This page now draws
  // ONE subtree of it, under the selected feature's row: in sweep mode the
  // rows whose key names the feature's node (a joint end, with its candidate
  // faces, their reasons and its Pick); in bind mode the element rows the pane
  // scoped itself to (`filter-element <node>`), each with its ends' candidate
  // lists. Keys are the annotator's own (`<parent>/<data>=<value>,...`), read
  // for one thing: does a `=<value>` segment equal the node's id.
  function keyNames(key, id) {
    var parts = String(key || "").split("/");
    for (var i = 0; i < parts.length; i++) {
      var fields = parts[i].split(",");
      for (var j = 0; j < fields.length; j++) {
        var at = fields[j].indexOf("=");
        if (at !== -1 && fields[j].slice(at + 1) === id) return true;
      }
    }
    return false;
  }

  VA.SCENE_ELEMENT_ROOT = "#element-list/";

  // `edgeIds` are the edges at the node (the page reads them off the
  // topology): in bind mode a feature's rows are the element rows of those
  // edges, cut from the pane's whole list here rather than by a scope posted
  // to the pane, so any open feature row has its rows (2026-11-10).
  VA.sceneRowsForFeature = function (tree, nodeId, edgeIds) {
    if (!tree || !tree.rows || !nodeId) return [];
    var named = [];
    var walk = function (rows) {
      (rows || []).forEach(function (row) {
        if (keyNames(row.key, nodeId)) { named.push(row); return; }
        walk(row.rows);
      });
    };
    walk(tree.rows);
    if (named.length) return named;
    // Bind mode: the element rows of the node's edges.
    var edges = edgeIds || [];
    return tree.rows.filter(function (row) {
      if (String(row.key || "").indexOf(VA.SCENE_ELEMENT_ROOT) !== 0 || typeof row.head === "string") return false;
      return edges.some(function (id) { return keyNames(row.key, id); });
    });
  };

  // --- a feature's form (handoff editing_a_feature_opens_its_form_where_the_
  // tree_was, 2026-11-23) --------------------------------------------------------
  //
  // Editing a feature replaces the tree with its form -- the SolidWorks
  // pattern Jeff chose on 2026-11-22: the feature's name, the tick, Next and
  // the X; under it its part and the feature it mates with; the faces it will
  // hold, one line per surface; the suggestions, best first, each with why;
  // Unbind; and, folded, its history. The set is the pane's (apps/annotate/
  // app.js's editSnapshot, on its tree message): this draws it and hands each
  // gesture back as a pane `edit` verb. Nothing here writes, and nothing in
  // the tree does any more: until 2026-11-23 every opened feature carried
  // Correct, Add a face, Unbind and a Remove per face, each writing at once.
  VA.FEATURE_FORM_WORDS = Object.freeze({
    edit: "✎",
    editTitle: "edit this feature's faces (double-click the row, or Enter)",
    ok: "✓",
    okTitle: "bind these faces (Enter)",
    next: "Next",
    nextTitle: "bind these faces and open the next unbound feature of this part",
    cancel: "✕",
    cancelTitle: "leave without binding (Esc)",
    faces: "Faces",
    suggested: "Suggested",
    remove: "✕",
    removeTitle: "take this surface out of the set",
    takeTitle: "add to the set",
    dismiss: "✕",
    dismissTitle: "not this one: the suggestion is turned down when you bind",
    unbind: "Unbind",
    unbindTitle: "let this feature go: nothing bound; the record keeps what it held",
    history: "History",
    matesWith: "mates with {feature}",
    writing: "writing…",
    failed: "not written",
  });

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (_, k) {
      return values[k] === undefined || values[k] === null ? "" : String(values[k]);
    });
  }

  // The feature at the other end of each interface `fid` ends, once each,
  // in the model's order: what the form names it as mating with.
  VA.featureMates = function (model, fid) {
    var out = [];
    (model.interfaces || []).forEach(function (iface) {
      var ends = iface.ends || [];
      if (ends.indexOf(fid) === -1) return;
      ends.forEach(function (other) {
        if (other !== fid && out.indexOf(other) === -1 && model.feature(other)) out.push(other);
      });
    });
    return out;
  };

  // The end a form arms the pane at: where the feature's binding is, else
  // where its surest proposal sits, else its first own end; null for a
  // feature no edge ends at.
  VA.featureFormEnd = function (model, fid) {
    var bound = model.bindingsOf(fid)[0];
    if (bound) return { edgeId: bound.edgeId, end: bound.end };
    var best = VA.surestProposal(model.proposalsOf(fid));
    if (best) return { edgeId: best.edgeId, end: best.end };
    var ends = model.endsOf(fid);
    return ends.length ? { edgeId: ends[0].edgeId, end: ends[0].end } : null;
  };

  // Can this feature be edited here: an edge ends at it, and its part has a
  // 3D model to click on.
  VA.featureEditable = function (model, fid) {
    var feature = model && model.feature(fid);
    return !!(feature && model.endsOf(fid).length && model.hasMesh(feature.part));
  };

  // Tick and on: the next feature of the same part, after this one in the
  // part's order and then from its top, that is not bound and can be
  // edited; null when there is none.
  VA.nextUnboundFeature = function (model, fid) {
    var feature = model && model.feature(fid);
    var part = feature ? model.part(feature.part) : null;
    var list = (part && part.features) || [];
    var at = list.indexOf(fid);
    var order = list.slice(at + 1).concat(list.slice(0, Math.max(at, 0)));
    for (var i = 0; i < order.length; i++) {
      if (order[i] !== fid && model.status(order[i]) !== VA.FEATURE_STATUSES.bound &&
        VA.featureEditable(model, order[i])) return order[i];
    }
    return null;
  };

  // The surest of a feature's proposals (model.proposalsOf), by the proposal
  // vocabulary's order; the first listed among equals. Null for none.
  VA.surestProposal = function (proposals) {
    var best = null;
    (proposals || []).forEach(function (p) {
      if (!best || confidenceRank(p.event.confidence) < confidenceRank(best.event.confidence)) best = p;
    });
    return best;
  };

  // Surest first, the proposal vocabulary's own order (generated).
  function confidenceRank(c) {
    var order = window.TolstackVocab.viewer.list("PROPOSAL_CONFIDENCES");
    var i = order.indexOf(c);
    return i === -1 ? order.length : i;
  }

  // The states the tick is in while it writes and once it did not, on its
  // `data-pending` (the pane's WRITE_PRESS_STATES, apps/annotate/app.js).
  VA.WRITE_PRESS_STATES = Object.freeze(["writing", "failed"]);

  // What the form draws: {fid, name, part, mates: [words], ready, lines,
  // suggestions, changed, holds, history, next}. `edit` is the pane's
  // snapshot (null until the pane has opened the feature); `next` the
  // feature Next opens, or null.
  VA.featureFormPlan = function (model, fid, edit, next) {
    var feature = model && model.feature(fid);
    if (!feature) return null;
    var W = VA.FEATURE_FORM_WORDS;
    var ready = !!(edit && edit.featureId === fid);
    return {
      fid: fid,
      name: feature.name,
      part: model.label(feature.part),
      mates: VA.featureMates(model, fid).map(function (other) {
        var f = model.feature(other);
        var p = model.part(f.part);
        return fill(W.matesWith, { feature: (p ? p.name + " " : "") + f.name });
      }),
      ready: ready,
      sha256: ready ? edit.sha256 : null,
      lines: ready ? edit.lines : [],
      suggestions: ready ? edit.suggestions : [],
      changed: ready && !!edit.changed,
      holds: ready && !!edit.holds,
      history: ready ? edit.history || [] : [],
      next: next || null,
    };
  };

  // Draw the form into `root` (cleared). `h` is {onOk(next), onCancel,
  // onDrop(key), onTake(key), onDismiss(id), onHover(faces|null), onUnbind},
  // `write` the tick's press in flight or failed ({state, reason}).
  VA.renderFeatureForm = function (root, plan, h, write) {
    VA.clear(root);
    if (!plan) return root;
    var W = VA.FEATURE_FORM_WORDS;
    var form = VA.el("div", "navform");
    form.setAttribute("data-form-feature", plan.fid);
    if (!plan.ready) form.setAttribute("data-form-waiting", "true");
    var head = VA.el("div", "navform__head");
    var name = VA.el("span", "navform__name", plan.name);
    name.setAttribute("title", plan.name);
    head.appendChild(name);
    var writing = write && write.state === VA.WRITE_PRESS_STATES[0];
    var button = function (cls, text, title, act, attr) {
      var b = VA.el("button", cls, text);
      b.setAttribute("type", "button");
      b.setAttribute("title", title);
      b.setAttribute("aria-label", title);
      b.setAttribute("data-form-act", attr);
      b.onclick = function (event) {
        if (event && event.stopPropagation) event.stopPropagation();
        act();
      };
      return b;
    };
    var ok = button("navform__ok", W.ok, W.okTitle, function () { h.onOk(false); }, "ok");
    if (writing) {
      ok.disabled = true;
      ok.setAttribute("data-pending", VA.WRITE_PRESS_STATES[0]);
    } else if (write && write.state === VA.WRITE_PRESS_STATES[1]) {
      ok.setAttribute("data-pending", VA.WRITE_PRESS_STATES[1]);
      ok.setAttribute("title", W.failed + ": " + (write.reason || ""));
    }
    if (!plan.ready) ok.disabled = true;
    head.appendChild(ok);
    if (plan.next) {
      var nx = button("navform__next", W.next, W.nextTitle, function () { h.onOk(true); }, "next");
      if (writing || !plan.ready) nx.disabled = true;
      head.appendChild(nx);
    }
    head.appendChild(button("navform__cancel", W.cancel, W.cancelTitle, h.onCancel, "cancel"));
    form.appendChild(head);

    var body = VA.el("div", "navform__body");
    var about = VA.el("div", "navform__about");
    var aboutLine = function (cls, text) {
      var line = VA.el("div", cls, text);
      line.setAttribute("title", text);
      about.appendChild(line);
    };
    aboutLine("navform__part", plan.part);
    plan.mates.forEach(function (m) { aboutLine("navform__mate", m); });
    body.appendChild(about);

    var hoverable = function (row, faces) {
      row.onmouseenter = function () { h.onHover({ sha256: plan.sha256, faceIds: faces }); };
      row.onmouseleave = function () { h.onHover(null); };
    };
    var faces = VA.el("div", "navform__group");
    faces.appendChild(VA.el("div", "navform__label", W.faces));
    var box = VA.el("ul", "navform__box");
    box.setAttribute("data-form-list", "faces");
    plan.lines.forEach(function (line) {
      var li = VA.el("li", "navform__line" + (line.held ? " navform__line--held" : ""));
      li.setAttribute("data-form-line", line.key);
      li.setAttribute("title", line.title || line.text);
      li.appendChild(VA.el("span", "navform__text", line.text));
      var x = button("navform__x", W.remove, W.removeTitle, function () { h.onDrop(line.key); }, "drop");
      li.appendChild(x);
      li.onclick = function () { h.onDrop(line.key); };
      hoverable(li, line.faces);
      box.appendChild(li);
    });
    faces.appendChild(box);
    body.appendChild(faces);

    if (plan.suggestions.length) {
      var sug = VA.el("div", "navform__group");
      sug.appendChild(VA.el("div", "navform__label", W.suggested));
      var list = VA.el("ul", "navform__list");
      list.setAttribute("data-form-list", "suggested");
      plan.suggestions.forEach(function (s) {
        var li = VA.el("li", "navform__line navform__line--suggested");
        li.setAttribute("data-form-suggestion", s.key);
        li.setAttribute("title", (s.title || s.text) + "\n" + W.takeTitle);
        var text = VA.el("span", "navform__text");
        text.appendChild(VA.el("span", "navform__what", s.text));
        if (s.why) text.appendChild(VA.el("span", "navform__why", s.why));
        li.appendChild(text);
        if (s.proposal) {
          li.setAttribute("data-form-proposal", s.proposal);
          li.appendChild(button("navform__x", W.dismiss, W.dismissTitle, function () { h.onDismiss(s.proposal); },
            "dismiss"));
        }
        li.onclick = function () { h.onTake(s.key); };
        hoverable(li, s.faces);
        list.appendChild(li);
      });
      sug.appendChild(list);
      body.appendChild(sug);
    }

    if (plan.holds) {
      var foot = VA.el("div", "navform__foot");
      var un = button("navform__unbind", W.unbind, W.unbindTitle, h.onUnbind, "unbind");
      if (writing) un.disabled = true;
      foot.appendChild(un);
      body.appendChild(foot);
    }
    if (plan.history.length) {
      var hist = VA.el("details", "navform__history");
      hist.appendChild(VA.el("summary", "navform__summary", W.history));
      plan.history.forEach(function (line) { hist.appendChild(VA.el("div", "navform__event", line)); });
      body.appendChild(hist);
    }
    form.appendChild(body);
    root.appendChild(form);
    return root;
  };

  // The six gestures a mirrored row can hand back, named once on this side;
  // the annotator's receiver (AA.RAIL_ACTS, apps/annotate/commands.js) names
  // them once on the other, and tests/test_rail_act_vocabulary_is_paired.py
  // fails when the two lists differ. Each value is the word on the wire.
  VA.SCENE_ACTS = Object.freeze({
    enter: "enter",
    leave: "leave",
    toggle: "toggle",
    activate: "activate",
    check: "check",
    button: "button",
  });

  // Is a pick armed in the scene? The annotator says so on its tree message
  // (`armed`, apps/annotate/app.js's embedTree), so an Esc here knows it has
  // a pick to cancel. Asked of the pane, never read off its rows: a pressed
  // control is not an armed pick (a part row's Isolate is pressed whenever
  // the sweep isolates parts, the type chips by default).
  VA.scenePickArmed = function (tree) {
    return !!(tree && tree.armed === true);
  };

  // One selection across the seam, read back from the pane: given the node
  // the page has selected (or null) and the node whose end row a tree was
  // last seen holding (`held`), does the pane's newest tree say it let go?
  // The decision behind topology_app.js's syncSceneInspect, here so the fast
  // tier pins it. The page TELLS the pane its selection with one verb,
  // `model select node <id>` (syncSceneModel), which in sweep mode is the
  // rail's end row for that node; this is the other direction.
  //
  //   - one of the node's end rows selected: the pane holds it;
  //   - the node's end rows in the tree, none selected, after the pane was
  //     seen holding one: the pane let go -- a second click on the bead or
  //     the face -- and the page lets go too, never re-asserting;
  //   - otherwise nothing: a tree that arrives before the pane has answered
  //     shows nothing selected and nothing held, which is the tree not having
  //     caught up; and a tree with no end rows for the node (bind mode, a
  //     node the run does not carry) has nothing to say.
  //
  // Returns {letGo, held}.
  VA.sceneInspectStep = function (tree, nodeId, held) {
    if (!nodeId) return { letGo: false, held: null };
    var endRows = VA.sceneRowsForFeature(tree, nodeId, []).filter(function (row) {
      return row.kind === "end" && !!row.activate;
    });
    if (endRows.some(function (row) { return !!row.selected; })) return { letGo: false, held: nodeId };
    if (endRows.length && held === nodeId) return { letGo: true, held: null };
    return { letGo: false, held: held === nodeId ? held : null };
  };

})(window.ViewerApp = window.ViewerApp || {});
