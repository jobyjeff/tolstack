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
//   Rigid bodies
//     body                          swatch in the body's DAG ink; show/hide
//       Parts
//         part                      its label (the one rule); show/hide
//           feature  o              one status mark: bound, suggested, none
//             (its faces, when selected: the pane's rows for it)
//       Interfaces                  those inside the body
//         interface / joint         a joint with several constraints opens to
//           part · feature          them; each opens to its two ends
//   Joints between bodies           listed once
//   Studies                         the model's: chain studies, kinematic
//                                   studies, the sweep row
//
// Gone: the Models list, the component chip, the whole-rail mirror ("All N
// interfaces", "In this model" / "Other parts"), the Stacks section on a model
// those stacks are not part of, and any all/unbound/bound filter (Jeff,
// 2026-11-09: a part has a handful of features). What stays of the mirror is
// VA.renderSceneTree, which now draws ONE subtree -- the pane's rows for the
// selected feature -- under that feature's row (topology_app.js's
// renderSceneSlot picks the rows; VA.sceneRowsForFeature is the rule).
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
  });

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

  // A row that toggles its own disclosure on click (the twisty does the same
  // on its own, so the keyboard reaches it).
  function foldRow(className, key, open, handlers) {
    var row = VA.el("div", "navtree__row " + className);
    row.appendChild(twisty(key, open, handlers));
    row.onclick = function () { if (handlers && handlers.onToggle) handlers.onToggle(key, open); };
    return row;
  }

  // The one mark a feature wears (VA.FEATURE_STATUSES); the stylesheet draws
  // it, and a `none` draws nothing in the same column.
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

  function section(kind, heading, list) {
    var box = VA.el("div", "navtree__section navtree__section--" + kind);
    box.appendChild(VA.el("h2", "navtree__heading", heading));
    box.appendChild(list);
    return box;
  }

  // The rows the page's ONE selection and ONE hover light (one_selection_one_
  // hover_and_leaders_off): `state.focus` is {selected, hovered}, each a model
  // entity or null, and VA.focusNavRowsOf says which `<kind>:<id>` rows each
  // reaches. Computed once per render; a row asks by its own kind and id.
  var lit = { on: {}, hot: {} };

  function litRows(model, entity) {
    var out = {};
    VA.focusNavRowsOf(model, entity).forEach(function (key) { out[key] = true; });
    return out;
  }

  function rowClasses(kind, id) {
    var key = kind + ":" + id;
    return (lit.on[key] ? " navtree__row--on" : "") + (lit.hot[key] ? " navtree__row--hot" : "");
  }

  // The hovered rows, re-lit in place on a tree already drawn: the one hover
  // moves many times between two paints, and only the class moves with it.
  VA.lightNavTree = function (root, model, hovered) {
    if (!root || !root.querySelectorAll) return 0;
    var hot = litRows(model, hovered);
    lit.hot = hot;
    var count = 0;
    var rows = root.querySelectorAll("div.navtree__row");
    for (var i = 0; i < rows.length; i++) {
      var kind = rows[i].getAttribute("data-nav-kind");
      var id = rows[i].getAttribute("data-nav-id");
      if (!kind || !id || !rows[i].classList) continue;
      var on = !!hot[kind + ":" + id];
      if (on) count++;
      if (on) rows[i].classList.add("navtree__row--hot");
      else rows[i].classList.remove("navtree__row--hot");
    }
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

  // The feature the page has selected (`state.focus.selected`, a feature
  // entity), or null: the one row that is open by default.
  function selectedFeatureId(state) {
    var sel = state && state.focus && state.focus.selected;
    return sel && sel.kind === VA.FOCUS_KINDS.feature ? sel.id : null;
  }

  VA.navFeatureKey = function (fid) { return "f:" + fid; };

  // A feature's row: its twisty, its mark, its name; lit when the page's
  // selection or hover reaches it. `withPart` prepends the part for an end
  // row under an interface, where the part is not the row's parent.
  //
  // The row is its own disclosure (one_selection_one_hover_and_leaders_off,
  // Jeff 2026-11-10: "there is nothing suggesting that the first element is
  // collapsible, and then the whole menu jumps"): a click selects it, the
  // twisty opens and closes what is under it, and it is open when it is the
  // selected feature unless the reader folded it. The twisty is drawn only
  // where there is a body to open -- the scene's rows for it, while the 3D
  // scene is open (handlers.sceneSlot); with the scene closed the row is a
  // leaf, and a control with nothing behind it is shown as nothing.
  function featureRow(model, fid, state, handlers, withPart, open) {
    var feature = model.feature(fid);
    var row = VA.el("div", "navtree__row navtree__row--feature" + rowClasses("feature", fid));
    row.setAttribute("data-nav-kind", "feature");
    row.setAttribute("data-nav-id", fid);
    row.setAttribute("data-node-id", feature.node);
    if (handlers.sceneSlot) row.appendChild(twisty(VA.navFeatureKey(fid), open, handlers));
    else row.appendChild(leafGap());
    row.appendChild(mark(model.status(fid)));
    var text = withPart ? model.label(feature.part) + " · " + feature.name : feature.name;
    var name = label(text, null, null);
    name.setAttribute("title", text);
    row.appendChild(name);
    activatable(row, function () { if (handlers.onFeature) handlers.onFeature(fid); });
    var hover = function (on) {
      if (handlers.onHover) handlers.onHover(on ? { kind: "feature", id: fid } : null);
    };
    row.onmouseenter = function () { hover(true); };
    row.onmouseleave = function () { hover(false); };
    return row;
  }

  // A feature's item: its row and, when open, its body -- the slot the
  // scene's rows for it are drawn into (topology_app.js's renderSceneSlot):
  // the feature's state line, its candidate faces, its one pick action.
  // Only while the scene is open; closed, there is no body.
  function featureItem(model, fid, state, handlers, withPart) {
    var li = VA.el("li", "navtree__item");
    var open = !!handlers.sceneSlot && isOpen(state, VA.navFeatureKey(fid), selectedFeatureId(state) === fid);
    li.appendChild(featureRow(model, fid, state, handlers, withPart, open));
    if (open) {
      var slot = VA.el("div", "navtree__scene");
      slot.setAttribute("data-scene-feature", fid);
      li.appendChild(slot);
    }
    return li;
  }

  // An interface (a shared node or a gap edge) opens to its two ends.
  function interfaceItem(model, interfaceRow, state, handlers) {
    var key = "i:" + interfaceRow.id;
    var open = isOpen(state, key, false);
    var kind = interfaceRow.source === "node" ? "node" : "edge";
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--interface" + rowClasses("interface", interfaceRow.id));
    row.setAttribute("data-nav-kind", "interface");
    row.setAttribute("data-nav-id", interfaceRow.id);
    row.setAttribute("data-interface-kind", kind);
    row.appendChild(twisty(key, open, handlers));
    var name = label(interfaceRow.name, null, null);
    name.setAttribute("title", interfaceRow.name);
    row.appendChild(name);
    row.appendChild(count(String(interfaceRow.kind || "").replace(/_/g, " ")));
    activatable(row, function () {
      if (handlers.onInterface) handlers.onInterface(kind, interfaceRow.id);
    });
    li.appendChild(row);
    if (open) {
      var ends = VA.el("ul", "navtree__children");
      interfaceRow.ends.forEach(function (fid) {
        ends.appendChild(featureItem(model, fid, state, handlers, true));
      });
      li.appendChild(ends);
    }
    return li;
  }

  // A joint: one constraint is the interface itself; several open to them
  // (the tangential link mount on the hub is a seat, a pilot and a clocking).
  function jointItem(model, joint, state, handlers) {
    var constraints = model.constraintsOf(joint.id);
    if (constraints.length === 1) return interfaceItem(model, constraints[0], state, handlers);
    var key = "j:" + joint.id;
    var open = isOpen(state, key, false);
    var li = VA.el("li", "navtree__item");
    var row = foldRow("navtree__row--joint" + rowClasses("joint", joint.id), key, open, handlers);
    row.setAttribute("data-nav-kind", "joint");
    row.setAttribute("data-nav-id", joint.id);
    var names = joint.parts.map(function (pid) {
      var part = model.part(pid);
      return part ? part.name : pid;
    });
    var text = names.join(" and ");
    var name = label(text, null, null);
    name.setAttribute("title", joint.parts.map(function (pid) { return model.label(pid); }).join(" and "));
    row.appendChild(name);
    row.appendChild(count(constraints.length + VA.NAV_WORDS.constraintsCount));
    li.appendChild(row);
    if (open) {
      var list = VA.el("ul", "navtree__children");
      constraints.forEach(function (c) { list.appendChild(interfaceItem(model, c, state, handlers)); });
      li.appendChild(list);
    }
    return li;
  }

  // Does this part hold a feature the selection lights? A selection made
  // anywhere -- the scene, the DAG, the grid -- opens the part that holds it,
  // so the tree never marks a row the reader cannot see; the reader's own
  // fold of that part still wins.
  function holdsSelection(model, partId) {
    return (model.part(partId) || { features: [] }).features.some(function (fid) {
      return !!lit.on["feature:" + fid];
    });
  }

  function partItem(model, partId, state, handlers) {
    var part = model.part(partId);
    var key = "p:" + partId;
    var open = isOpen(state, key, holdsSelection(model, partId));
    var li = VA.el("li", "navtree__item");
    var row = foldRow("navtree__row--part" + rowClasses("part", partId), key, open, handlers);
    row.setAttribute("data-nav-kind", "part");
    row.setAttribute("data-nav-id", partId);
    var name = label(part.label, null, null);
    name.setAttribute("title", part.label);
    row.appendChild(name);
    row.appendChild(count(part.features.length + VA.NAV_WORDS.featuresCount));
    if (model.hasMesh(partId)) {
      var hidden = !!(state && state.hiddenParts && state.hiddenParts[partId]);
      var box = visibility("part", partId, !hidden, false, handlers);
      if (box) row.appendChild(box);
    }
    var hover = function (on) {
      if (handlers.onHover) handlers.onHover(on ? { kind: "part", id: partId } : null);
    };
    row.onmouseenter = function () { hover(true); };
    row.onmouseleave = function () { hover(false); };
    li.appendChild(row);
    if (open) {
      var list = VA.el("ul", "navtree__children");
      part.features.forEach(function (fid) {
        list.appendChild(featureItem(model, fid, state, handlers, false));
      });
      li.appendChild(list);
    }
    return li;
  }

  // A titled group inside a body ("Parts", "Interfaces"), with its own fold.
  function groupItem(key, heading, state, handlers, fallbackOpen, fill) {
    var open = isOpen(state, key, fallbackOpen);
    var li = VA.el("li", "navtree__item");
    var row = foldRow("navtree__row--group", key, open, handlers);
    row.setAttribute("data-nav-group", key);
    row.appendChild(VA.el("span", "navtree__grouplabel", heading));
    li.appendChild(row);
    if (open) {
      var list = VA.el("ul", "navtree__children");
      fill(list);
      li.appendChild(list);
    }
    return li;
  }

  function bodyItem(model, body, state, handlers) {
    var key = "b:" + body.id;
    var open = isOpen(state, key, true);
    var li = VA.el("li", "navtree__item");
    var row = foldRow("navtree__row--body" + rowClasses("body", body.id), key, open, handlers);
    row.setAttribute("data-nav-kind", "body");
    row.setAttribute("data-nav-id", body.id);
    var swatch = VA.el("span", "navtree__swatch");
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.setProperty("--swatch", "var(--tv-body-ink-" + model.tint(body.id) + ")");
    row.appendChild(swatch);
    var name = label(body.name, null, null);
    name.setAttribute("title", body.name);
    row.appendChild(name);
    row.appendChild(count(body.parts.length + VA.NAV_WORDS.partsCount));
    var meshed = body.parts.filter(function (pid) { return model.hasMesh(pid); });
    if (meshed.length) {
      var hiddenCount = meshed.filter(function (pid) {
        return !!(state && state.hiddenParts && state.hiddenParts[pid]);
      }).length;
      var box = visibility("body", body.id, hiddenCount < meshed.length,
        hiddenCount > 0 && hiddenCount < meshed.length, handlers);
      if (box) row.appendChild(box);
    }
    var hover = function (on) {
      if (handlers.onHover) handlers.onHover(on ? { kind: "body", id: body.id } : null);
    };
    row.onmouseenter = function () { hover(true); };
    row.onmouseleave = function () { hover(false); };
    li.appendChild(row);
    if (open) {
      var list = VA.el("ul", "navtree__children");
      list.appendChild(groupItem("bp:" + body.id, VA.NAV_WORDS.parts, state, handlers, true,
        function (into) {
          body.parts.forEach(function (pid) { into.appendChild(partItem(model, pid, state, handlers)); });
        }));
      var within = model.jointsWithin(body.id);
      if (within.length) {
        list.appendChild(groupItem("bi:" + body.id, VA.NAV_WORDS.interfaces, state, handlers, false,
          function (into) {
            within.forEach(function (j) { into.appendChild(jointItem(model, j, state, handlers)); });
          }));
      }
      li.appendChild(list);
    }
    return li;
  }

  // The model's tree: bodies (or, with none declared, its parts), the joints
  // between bodies, then its studies.
  function modelSections(root, model, t, state, handlers) {
    if (model) {
      if (model.bodies.length) {
        var bodies = VA.el("ul", "navtree__list");
        model.bodies.forEach(function (body) { bodies.appendChild(bodyItem(model, body, state, handlers)); });
        root.appendChild(section("bodies", VA.NAV_WORDS.bodies, bodies));
      }
      if (model.unbodiedParts.length) {
        var parts = VA.el("ul", "navtree__list");
        model.unbodiedParts.forEach(function (pid) { parts.appendChild(partItem(model, pid, state, handlers)); });
        root.appendChild(section("parts", VA.NAV_WORDS.unbodied, parts));
      }
      var between = model.jointsBetween();
      if (between.length) {
        var joints = VA.el("ul", "navtree__list");
        between.forEach(function (j) { joints.appendChild(jointItem(model, j, state, handlers)); });
        root.appendChild(section("joints", model.bodies.length ? VA.NAV_WORDS.between : VA.NAV_WORDS.interfaces, joints));
      }
    }
    var studies = studiesList(t, state, handlers);
    if (studies) root.appendChild(section("studies", VA.NAV_WORDS.studies, studies));
  }

  VA.renderNavTree = function (root, tree, state, handlers) {
    VA.clear(root);
    root.className = "navtree";
    handlers = handlers || {};
    var topologies = (tree && tree.topologies) || [];
    var looseStacks = (tree && tree.looseStacks) || [];
    var kinematic = (tree && tree.kinematic) || [];
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
      // The rows the one selection and the one hover reach, for this paint.
      var focus = state.focus || {};
      lit = { on: litRows(model, focus.selected), hot: litRows(model, focus.hovered) };
      modelSections(root, model, open, state, handlers);
    }
    if (kinematic.length) root.appendChild(kinematicSection(kinematic, state, handlers));
    if (handlers.orphans && handlers.orphans.length) root.appendChild(orphanFoot(handlers.orphans));
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

  // A feature's body, under its row (one_selection_one_hover_and_leaders_
  // off, deliverable 3): the pane's rows for the feature, with the pane's
  // own head row for it NOT drawn -- the feature row above is the one title.
  // One end row (sweep mode, the usual case) is drawn as its state line, its
  // actions and its list -- the candidate faces, if any, then the one pick
  // action the pane puts last -- so a feature with no suggestion, with some
  // and with an open proposal all read the same way. Several rows (a node
  // that is the end of two joints; bind mode's element rows) are drawn as
  // they are, since each needs its own name. No marks legend: a row's own
  // words say what its mark means, on hover.
  VA.renderFeatureBody = function (slot, rows, opts) {
    VA.clear(slot);
    if (opts && opts.plan) return renderBodyPlan(slot, opts.plan, opts);
    if (!rows || !rows.length) return slot;
    var send = (opts && opts.send) || function () {};
    var row = rows[0];
    if (rows.length !== 1 || typeof row.head === "string") {
      slot.appendChild(sceneList(rows, send));
      return slot;
    }
    var body = VA.el("div", "navtree__featurebody");
    // The state line: the pane's second line for the row -- a bound face, a
    // suggestion count, an armed pick's words. The feature row's own mark is
    // the one mark; the pane's kind and mark for the end ride here as data
    // for the stylesheet and the tier, drawn as words.
    var line = VA.el("div", "navtree__featurestate" +
      (row.selected ? " navtree__featurestate--on" : "") +
      (row.sceneHover ? " navtree__featurestate--hot" : ""));
    line.setAttribute("data-scene-key", row.key);
    if (row.kind) line.setAttribute("data-kind", row.kind);
    if (row.mark) line.setAttribute("data-mark", row.mark);
    if (row.attention) line.setAttribute("data-attention", "true");
    if (row.suggestion) line.setAttribute("data-suggestion", "true");
    var words = VA.el("span", "navtree__featurewords", row.sub || row.text || "");
    if (row.title) words.setAttribute("title", row.title);
    line.appendChild(words);
    if (row.alert) {
      var alert = VA.el("span", "navtree__scenealert");
      alert.appendChild(VA.warningIcon("navtree__scenealert-mark"));
      alert.setAttribute("title", row.alert);
      alert.setAttribute("aria-label", row.alert);
      alert.setAttribute("tabindex", "0");
      line.appendChild(alert);
    }
    line.onmouseenter = function () { send(row.key, VA.SCENE_ACTS.enter); };
    line.onmouseleave = function () { send(row.key, VA.SCENE_ACTS.leave); };
    body.appendChild(line);
    // The row's own actions, where it has any (Accept on an open proposal;
    // an armed pick's part switch), on a line of their own.
    if (row.buttons && row.buttons.length) {
      var acts = VA.el("div", "navtree__featureacts");
      row.buttons.forEach(function (spec, i) { acts.appendChild(sceneButton(row, spec, i, send)); });
      body.appendChild(acts);
    }
    // The list: candidate faces, then the pick action (the pane's order).
    if (row.rows && row.rows.length) body.appendChild(sceneList(row.rows, send));
    slot.appendChild(body);
    return slot;
  };

  // --- a feature's body from the model's own status (handoff a_binding_shows_
  // the_moment_it_is_made_and_is_corrected_where_it_is_shown, deliverable 3)
  //
  // A feature's body always says something. Until 2026-11-12 it was only the
  // pane's rows for the feature's node, and a feature the loaded sweep run
  // does not carry, or one whose proposal had just been accepted, had none:
  // a twisty that opened to nothing, and a bound face nobody could correct.
  // Now the body is planned here from the model (its status, its bindings,
  // its own ends) and the pane's rows are drawn only for a suggestion:
  //
  //   bound      one line per standing binding -- "bound · face 12 of
  //              214373-002" -- hovering it lights the face; Correct (arm the
  //              pick on the feature's part; the new face supersedes), Unbind
  //              (a retraction), and Flip where the binding sits on a
  //              dimension whose other end is free
  //   suggested  the pane's candidate rows, as before; with none (the run does
  //              not carry the feature) the suggestion's line and Pick a face
  //   neither    "not bound" and Pick a face, which arms the same pick
  //   armed      the pane's own armed line and Cancel, while a pick is armed
  //              at one of the feature's ends
  //
  // Every action is a pane verb (VA.FEATURE_BODY_VERBS), posted by the page;
  // the words are this table's.
  VA.FEATURE_BODY_WORDS = Object.freeze({
    bound: "bound · face {face} of {part}",
    none: "not bound",
    noMesh: "not bound · no 3D model of this part",
    suggested: "suggested · {confidence}",
    pick: "Pick a face",
    pickTitle: "pick this feature's face on its own part",
    correct: "Correct",
    correctTitle: "pick the right face on this part; it replaces this one",
    unbind: "Unbind",
    unbindTitle: "take this binding back; the record keeps it",
    flip: "Flip",
    flipTitle: "this face is the dimension's other end",
    cancel: "Cancel",
    cancelTitle: "stop picking (Esc)",
  });

  // The pane verbs a body's actions post, each `<verb> <edge> <end>
  // <topology>` except `arm off` (apps/annotate/app.js registers them).
  VA.FEATURE_BODY_VERBS = Object.freeze({ arm: "arm", unbind: "unbind", flip: "flip" });

  // The kinds of body VA.featureBodyPlan returns (null: draw the pane's rows).
  VA.FEATURE_BODY_KINDS = Object.freeze({ bound: "bound", none: "none", armed: "armed" });

  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (_, k) {
      return values[k] === undefined || values[k] === null ? "" : String(values[k]);
    });
  }

  // `model` the one model; `fid` the feature; `topologyId` what its verbs
  // name; `rows` the pane's rows for it (VA.sceneRowsForFeature); `tree` the
  // pane's newest tree message (its `armedEnd` and `armedLine`), or null.
  // Returns {kind, lines: [{text, face?}], actions: [{text, title, command}]}
  // or null for "draw the pane's rows".
  VA.featureBodyPlan = function (model, fid, topologyId, rows, tree) {
    var feature = model && model.feature(fid);
    if (!feature) return null;
    var W = VA.FEATURE_BODY_WORDS, V = VA.FEATURE_BODY_VERBS, K = VA.FEATURE_BODY_KINDS;
    var ends = model.endsOf(fid);
    var armed = tree && tree.armedEnd;
    if (armed && ends.some(function (e) { return e.edgeId === armed.edgeId && e.end === armed.direction; })) {
      return { kind: K.armed, lines: [{ text: String(tree.armedLine || "") }],
        actions: [{ text: W.cancel, title: W.cancelTitle, command: [V.arm, "off"] }] };
    }
    var status = model.status(fid);
    if (status === VA.FEATURE_STATUSES.suggested && rows && rows.length) return null;
    var part = model.part(feature.part);
    var partWords = (part && (part.number || part.label)) || feature.part;
    var verb = function (name, e) { return [name, e.edgeId, e.end, topologyId]; };
    if (status === VA.FEATURE_STATUSES.bound) {
      var plan = { kind: K.bound, lines: [], actions: [] };
      model.bindingsOf(fid).forEach(function (b) {
        var key = b.event.geometry_key || {};
        var actions = [
          { text: W.correct, title: W.correctTitle, command: verb(V.arm, b) },
          { text: W.unbind, title: W.unbindTitle, command: verb(V.unbind, b) },
        ];
        // Flip where a direction applies: the binding is on a dimension (both
        // its ends are this part's) and nothing stands at the other end.
        var other = b.end === VA.EDGE_ENDS.from ? VA.EDGE_ENDS.to : VA.EDGE_ENDS.from;
        if (model.dimension(b.edgeId) && !model.bindingsAt(b.edgeId, other).length) {
          actions.push({ text: W.flip, title: W.flipTitle, command: verb(V.flip, b) });
        }
        plan.lines.push({ text: fill(W.bound, { face: key.face_id, part: partWords }),
          face: { sha256: key.source_step_sha256, faceId: key.face_id }, actions: actions });
      });
      return plan;
    }
    if (!ends.length) return { kind: K.none, lines: [{ text: W.none }], actions: [] };
    if (!model.hasMesh(feature.part)) return { kind: K.none, lines: [{ text: W.noMesh }], actions: [] };
    var proposals = model.proposalsOf(fid);
    var text = W.none;
    if (proposals.length) {
      var best = proposals.map(function (p) { return p.event.confidence; })
        .sort(function (a, b) { return confidenceRank(a) - confidenceRank(b); })[0];
      text = fill(W.suggested, { confidence: best });
    }
    // Picked at the end a proposal sits at, else the feature's first own end.
    var at = proposals.length ? proposals[0] : ends[0];
    return { kind: K.none, lines: [{ text: text }],
      actions: [{ text: W.pick, title: W.pickTitle, command: verb(V.arm, at) }] };
  };

  // Surest first, the proposal vocabulary's own order (generated).
  function confidenceRank(c) {
    var order = window.TolstackVocab.viewer.list("PROPOSAL_CONFIDENCES");
    var i = order.indexOf(c);
    return i === -1 ? order.length : i;
  }

  // Draw a plan: each line (hovering a bound one lights its face through
  // opts.hoverFace), its own actions under it, then the plan's.
  function renderBodyPlan(slot, plan, opts) {
    var command = (opts && opts.command) || function () {};
    var hoverFace = (opts && opts.hoverFace) || function () {};
    var body = VA.el("div", "navtree__featurebody");
    body.setAttribute("data-body-kind", plan.kind);
    var actsOf = function (list) {
      var acts = VA.el("div", "navtree__featureacts");
      list.forEach(function (a) {
        var button = VA.el("button", "navtree__scenebtn", a.text);
        if (a.title) button.setAttribute("title", a.title);
        button.setAttribute("data-body-act", a.command[0] + (a.command[1] === "off" ? "-off" : ""));
        button.onclick = function (event) {
          if (event) {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
          }
          command(a.command);
        };
        acts.appendChild(button);
      });
      return acts;
    };
    plan.lines.forEach(function (line) {
      var row = VA.el("div", "navtree__featurestate");
      var words = VA.el("span", "navtree__featurewords", line.text);
      words.setAttribute("title", line.text);
      row.appendChild(words);
      if (line.face) {
        row.setAttribute("data-face", line.face.faceId);
        row.onmouseenter = function () { hoverFace(line.face); };
        row.onmouseleave = function () { hoverFace(null); };
      }
      body.appendChild(row);
      if (line.actions && line.actions.length) body.appendChild(actsOf(line.actions));
    });
    if (plan.actions.length) body.appendChild(actsOf(plan.actions));
    slot.appendChild(body);
    return slot;
  }

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

  // `tree` is the annotator's {chips, rows} (apps/annotate/app.js's
  // embedTree, which carries the row shape) -- here already narrowed to the
  // selected feature's rows (VA.sceneRowsForFeature); `opts.send(key, act,
  // index?)` hands a gesture back to it. Every word and every effect is the
  // annotator's: this draws what it was sent, and a gesture is only ever
  // "this row, this control".
  //
  // Keyboard: a disclosure is a <summary>, a row that does something on a
  // click is a focusable button-role row (Enter or Space), and its checkbox
  // and buttons are native controls -- so the whole tree is reachable by Tab.
  // Focus lights the row in the scene the way a resting pointer does.
  VA.renderSceneTree = function (slot, tree, opts) {
    VA.clear(slot);
    if (!tree || !tree.rows || !tree.rows.length) return slot;
    var send = (opts && opts.send) || function () {};
    if (tree.legend && tree.legend.length) slot.appendChild(sceneLegend(tree.legend));
    slot.appendChild(sceneList(tree.rows, send));
    return slot;
  };

  // The marks' legend, above the rows: each mark the annotator can put on a
  // row, drawn as it is on the row, beside its word; the longer sense on hover.
  function sceneLegend(items) {
    var box = VA.el("div", "navtree__scenelegend");
    items.forEach(function (item) {
      var entry = VA.el("span", "navtree__scenelegenditem");
      if (item.title) entry.setAttribute("title", item.title);
      var glyph = VA.el("span", "navtree__scenemark");
      glyph.setAttribute("data-mark", item.mark);
      glyph.setAttribute("aria-hidden", "true");
      entry.appendChild(glyph);
      entry.appendChild(VA.el("span", "navtree__scenelegendword", item.text));
      box.appendChild(entry);
    });
    return box;
  }

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

  function sceneList(rows, send) {
    var ul = VA.el("ul", "navtree__scenelist");
    rows.forEach(function (row) { ul.appendChild(sceneItem(row, send)); });
    return ul;
  }

  function sceneItem(row, send) {
    var li = VA.el("li", "navtree__sceneitem");
    if (typeof row.head === "string") {
      var head = VA.el("div", "navtree__scenehead");
      head.setAttribute("data-scene-key", row.key);
      var words = VA.el("span", "navtree__scenetext", row.head);
      words.setAttribute("title", row.head + (row.sub ? "\n" + row.sub : ""));
      head.appendChild(words);
      sceneControls(head, row, send);
      li.appendChild(head);
      return li;
    }
    var line = VA.el("div", "navtree__scenerow" +
      (row.selected ? " navtree__scenerow--on" : "") +
      (row.sceneHover ? " navtree__scenerow--hot" : "") +
      (row.wrap ? " navtree__scenerow--wrap" : ""));
    line.setAttribute("data-scene-key", row.key);
    // What kind of thing the row is, and the state its mark is in
    // (AA.RAIL_ROW_KINDS, AA.RAIL_MARKS): the look is the stylesheet's.
    if (row.kind) line.setAttribute("data-kind", row.kind);
    if (row.mark) line.setAttribute("data-mark", row.mark);
    if (row.attention) line.setAttribute("data-attention", "true");
    if (row.suggestion) line.setAttribute("data-suggestion", "true");
    if (row.title) line.setAttribute("title", row.title);
    if (typeof row.twisty === "string") {
      // A row with its own disclosure in front of it -- a joint end's
      // candidate list: the row's click is still the row's (it selects), and
      // only the twisty opens and closes the list under it.
      var tw = VA.el("button", "navtree__scenetwisty");
      tw.setAttribute("aria-expanded", row.open ? "true" : "false");
      tw.setAttribute("data-scene-part", "twisty");
      if (row.twisty) {
        tw.setAttribute("title", row.twisty);
        tw.setAttribute("aria-label", row.twisty);
      }
      tw.onclick = function (event) {
        if (event) {
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
        }
        send(row.key, VA.SCENE_ACTS.toggle);
      };
      line.appendChild(tw);
    } else if (typeof row.open === "boolean") {
      var fold = VA.el("span", "navtree__scenetwisty");
      fold.setAttribute("aria-hidden", "true");
      line.appendChild(fold);
    } else {
      line.appendChild(VA.el("span", "navtree__scenegap"));
    }
    var glyph = VA.el("span", "navtree__scenemark");
    glyph.setAttribute("aria-hidden", "true");
    line.appendChild(glyph);
    var text = VA.el("span", "navtree__scenetext");
    text.appendChild(VA.el("span", "navtree__scenename", row.text));
    if (row.sub) text.appendChild(VA.el("span", "navtree__scenesub", row.sub));
    line.appendChild(text);
    if (row.value) line.appendChild(VA.el("span", "navtree__scenevalue", row.value));
    if (row.alert) {
      var alert = VA.el("span", "navtree__scenealert");
      alert.appendChild(VA.warningIcon("navtree__scenealert-mark"));
      alert.setAttribute("title", row.alert);
      alert.setAttribute("aria-label", row.alert);
      alert.setAttribute("tabindex", "0");
      line.appendChild(alert);
    }
    sceneControls(line, row, send);
    line.onmouseenter = function () { send(row.key, VA.SCENE_ACTS.enter); };
    line.onmouseleave = function () { send(row.key, VA.SCENE_ACTS.leave); };

    if (typeof row.open === "boolean" && typeof row.twisty !== "string") {
      // A disclosure. Its open state is the annotator's (a joint opening is
      // that joint selected), so a click asks for the toggle and the reply
      // redraws it; the native toggle is not taken.
      var box = VA.el("details", "navtree__scenenode");
      box.open = row.open;
      var summary = VA.el("summary", "navtree__scenesummary");
      summary.appendChild(line);
      summary.onclick = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        send(row.key, VA.SCENE_ACTS.toggle);
      };
      summary.onfocus = function () { send(row.key, VA.SCENE_ACTS.enter); };
      summary.onblur = function () { send(row.key, VA.SCENE_ACTS.leave); };
      box.appendChild(summary);
      if (row.rows && row.rows.length) box.appendChild(sceneList(row.rows, send));
      li.appendChild(box);
      return li;
    }
    if (row.activate) {
      line.setAttribute("tabindex", "0");
      line.setAttribute("role", "button");
      line.classList.add("navtree__scenerow--act");
      // An action row that is pressed (an armed pick's Cancel) says so.
      if (row.pressed) line.setAttribute("aria-pressed", "true");
      line.onclick = function () { send(row.key, VA.SCENE_ACTS.activate); };
      line.onkeydown = function (event) {
        if (!event || (event.key !== "Enter" && event.key !== " ")) return;
        if (event.target !== line) return;
        if (event.preventDefault) event.preventDefault();
        send(row.key, VA.SCENE_ACTS.activate);
      };
      line.onfocus = function () { send(row.key, VA.SCENE_ACTS.enter); };
      line.onblur = function () { send(row.key, VA.SCENE_ACTS.leave); };
    }
    li.appendChild(line);
    // A row's list: under an open disclosure, or under a row with no
    // disclosure of its own (an end's list is always sent since 2026-11-10;
    // the feature row above is its disclosure).
    if (row.open !== false && row.rows && row.rows.length) li.appendChild(sceneList(row.rows, send));
    return li;
  }

  // A row's own checkbox and buttons, each a native control that hands its
  // gesture back rather than acting here. The checkbox does not flip on its
  // own: the annotator's answer redraws it.
  function sceneControls(line, row, send) {
    if (row.buttons && row.buttons.length) {
      var acts = VA.el("span", "navtree__sceneacts");
      row.buttons.forEach(function (spec, i) { acts.appendChild(sceneButton(row, spec, i, send)); });
      line.appendChild(acts);
    }
    if (row.check) {
      var box = VA.el("input", "navtree__scenecheck");
      box.type = "checkbox";
      box.checked = !!row.check.checked;
      box.indeterminate = !!row.check.indeterminate;
      box.disabled = !!row.check.disabled;
      if (row.check.title) box.setAttribute("title", row.check.title);
      box.setAttribute("data-scene-part", "check");
      box.onclick = function (event) {
        if (event) {
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
        }
        send(row.key, VA.SCENE_ACTS.check);
      };
      line.appendChild(box);
    }
  }

  function sceneButton(row, spec, i, send) {
    var button = VA.el("button", "navtree__scenebtn", spec.text);
    if (spec.title) button.setAttribute("title", spec.title);
    if (spec.pressed) button.setAttribute("aria-pressed", "true");
    button.setAttribute("data-scene-part", "button-" + i);
    button.onclick = function (event) {
      if (event) {
        if (event.preventDefault) event.preventDefault();
        if (event.stopPropagation) event.stopPropagation();
      }
      send(row.key, VA.SCENE_ACTS.button, i);
    };
    return button;
  }
})(window.ViewerApp = window.ViewerApp || {});
