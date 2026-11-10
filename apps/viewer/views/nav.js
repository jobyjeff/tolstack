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

  // Is this node the page's selection? Every feature of a selected node
  // lights (a node two parts share is one selection, two pins).
  function nodeSelected(state, nodeId) {
    return !!(state && state.selection && state.selection.kind === "node" &&
      state.selection.id === nodeId);
  }

  function elementSelected(state, kind, id) {
    return !!(state && state.selection && state.selection.kind === kind &&
      state.selection.id === id);
  }

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

  // A feature's row: its mark, its name; selected when its node is the
  // page's selection. `partLabel` is prepended for an end row under an
  // interface, where the part is not the row's parent.
  function featureRow(model, fid, state, handlers, withPart) {
    var feature = model.feature(fid);
    var row = VA.el("div", "navtree__row navtree__row--feature" +
      (nodeSelected(state, feature.node) ? " navtree__row--on" : ""));
    row.setAttribute("data-nav-kind", "feature");
    row.setAttribute("data-nav-id", fid);
    row.setAttribute("data-node-id", feature.node);
    row.appendChild(leafGap());
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

  // The faces layer: the slot the pane's rows for the selected feature are
  // drawn into (topology_app.js's renderSceneSlot fills it). Under the
  // selected feature only, and only while the scene is open.
  function featureItem(model, fid, state, handlers, withPart) {
    var li = VA.el("li", "navtree__item");
    li.appendChild(featureRow(model, fid, state, handlers, withPart));
    if (handlers.sceneSlot && state && state.selectedFeature === fid) {
      li.appendChild(VA.el("div", "navtree__scene"));
    }
    return li;
  }

  // An interface (a shared node or a gap edge) opens to its two ends.
  function interfaceItem(model, interfaceRow, state, handlers) {
    var key = "i:" + interfaceRow.id;
    var open = isOpen(state, key, false);
    var kind = interfaceRow.source === "node" ? "node" : "edge";
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--interface" +
      (elementSelected(state, kind, interfaceRow.id) ? " navtree__row--on" : ""));
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
    var row = foldRow("navtree__row--joint", key, open, handlers);
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

  // Does this part hold a feature of the selected node? A selection made
  // anywhere -- the scene, the DAG, the grid -- opens the part that holds it,
  // so the tree never marks a row the reader cannot see; the reader's own
  // fold of that part still wins.
  function holdsSelection(model, partId, state) {
    if (!state || !state.selection || state.selection.kind !== "node") return false;
    return model.featuresOf(partId).some(function (f) { return f && f.node === state.selection.id; });
  }

  function partItem(model, partId, state, handlers) {
    var part = model.part(partId);
    var key = "p:" + partId;
    var open = isOpen(state, key, holdsSelection(model, partId, state));
    var li = VA.el("li", "navtree__item");
    var row = foldRow("navtree__row--part", key, open, handlers);
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
    var row = foldRow("navtree__row--body", key, open, handlers);
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
      modelSections(root, model, open, state, handlers);
    }
    if (kinematic.length) root.appendChild(kinematicSection(kinematic, state, handlers));
    return root;
  };

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

  VA.sceneRowsForFeature = function (tree, nodeId) {
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
    // Bind mode: the scoped element list, whole.
    return tree.rows.filter(function (row) {
      return String(row.key || "").indexOf(VA.SCENE_ELEMENT_ROOT) === 0 && typeof row.head !== "string";
    });
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

  // Does any mirrored row (at any depth) carry a pressed button? The
  // annotator presses a row's Pick while a pick is armed, so this is how the
  // page knows an Esc here has something to cancel.
  VA.sceneRowsPressed = function (rows) {
    return (rows || []).some(function (row) {
      return (row.buttons || []).some(function (b) { return !!b.pressed; }) ||
        VA.sceneRowsPressed(row.rows);
    });
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
    if (row.open && row.rows && row.rows.length) li.appendChild(sceneList(row.rows, send));
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
