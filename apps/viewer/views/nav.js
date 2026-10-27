// The single left-rail nav (viewer_v2_single_nav, 2026-09-08): one tree,
// replacing both the TOPOLOGY/STUDY <select> pickers (views/topology.js's old
// renderTopoPicker) and the flat stack rail (the retired views/list.js) at
// once. Every topology lists its studies as children; a stack no topology
// re-expresses is a leaf of the same tree. Selecting any node drives the whole
// page — see topology_app.js's onNavTopology / onNavStudy / onNavStack.
//
// A stack a topology DOES re-express has no row of its own
// (viewer_nav_wedge_and_classic_retirement, 2026-09-15). It used to get one:
// nested under its topology, chipped "classic view", rendering the elements
// table beside the graph. The reason that existed is spent.
// LESSONS_20260904_viewer_consolidation.md §1 found a stack's own verdict had
// no field in the topology projection at all, so the elements table was the
// only place on this whole page a verdict could be read — true until the
// field landed (2026-09-09) and this page rendered it (2026-09-15,
// viewer_study_verdicts_and_gaps), along with every gap, excluded term and
// missing-tolerance warning the table carried. That the graph now states all
// of it is not an argument in a comment: it is paired stack-against-topology,
// row for row, by tests/test_topology_conversions.py's coverage section.
//
// So one system is one entry, and a reader is never offered the same joint
// twice in two notations. Jeff's 2026-09-15 review is the whole of the case:
// "Why is this still here? I had you completely delete that page, and now
// it's sneaking back into this page." Some entries simply have no DAG (the
// two thermal-fit stacks); those are the leaves, rendered as plain stack
// pages, and nothing on the rail labels them as a different kind of page.
//
// Titles are short noun phrases (stack_title_style_pass, 2026-09-14 — the rule
// is docs/SOP_TOLERANCE_STACK.md's "Titling an artifact"), so the rail scans
// as a list rather than a wall of text. What a title used to carry inline now
// lives in the artifact's authored `description`, and this is the only place
// that renders it: as a hover tooltip on the row's NAME. Progressive
// disclosure, no new chrome — a row with no description simply has no tooltip
// to show.
//
// On the NAME and not on the row (nav_tooltip_once_and_rail_hover_emphasis,
// 2026-09-30). A row has two things a pointer can rest on: its label and,
// where there is something to look at, its alert mark — and the mark opens a
// formatted card. With the description on the ROW, hovering the mark put the
// browser's plain tooltip and the card over each other. Jeff: "there is a
// duplicate hover-over tooltip (unformatted and formatted versions) that
// sometimes block each other. Keep just the formatted one." So each hover
// surface says one thing: the name says what the artifact is, the mark says
// what is wrong with it. It is the rule the rail bars already follow
// (views/topology.js, viewer_dag_hover_cards 2026-09-14) — one hover surface,
// never two stacked — and views/dom.js's VA.alertBadge now applies the other
// half of it to every mark that opens a card.
(function (VA) {
  "use strict";

  // The label's `title=`, or null for none. Where a row already carries a hint
  // about what clicking it does, the description goes ABOVE it rather than
  // replacing it: the hint is the only statement of that behaviour anywhere.
  function tooltip(description, hint) {
    if (description && hint) return description + "\n\n" + hint;
    return description || hint || null;
  }

  // The row's NAME, with whatever the artifact says about itself hung on it.
  // Built here rather than at each of the three call sites so there is one
  // place the description can land, and no way for it to creep back onto the
  // row — which is the defect this helper replaced.
  function label(text, description, hint) {
    var span = VA.el("span", "navtree__label", text);
    var tip = tooltip(description, hint);
    if (tip) span.setAttribute("title", tip);
    return span;
  }

  VA.renderNavTree = function (root, tree, state, handlers) {
    VA.clear(root);
    root.className = "navtree";
    var topologies = (tree && tree.topologies) || [];
    var looseStacks = (tree && tree.looseStacks) || [];
    var kinematic = (tree && tree.kinematic) || [];
    if (!topologies.length && !looseStacks.length && !kinematic.length) {
      root.appendChild(VA.el("p", "muted", "No topologies or stacks in the projection."));
      return root;
    }
    var ul = VA.el("ul", "navtree__list");
    topologies.forEach(function (t) { ul.appendChild(topologyItem(t, state, handlers)); });
    looseStacks.forEach(function (s) { ul.appendChild(stackItem(s, state, handlers)); });
    root.appendChild(ul);
    if (kinematic.length) root.appendChild(kinematicSection(kinematic, state, handlers));
    return root;
  };

  // The kinematic studies (handoff the_viewer_shows_a_kinematic_study): a
  // section of its own, under one small heading, because a kinematic study is
  // not a chain on a topology's walk and nesting it under the topology row
  // would offer it as one. Grouped under the topology's NAME -- a plain label,
  // not a second way into the topology the row above already is. Absent
  // entirely when there is no kinematic projection (VA.kinematicNav, empty).
  //
  // A topology with published sweep runs and no study yet gets one model row,
  // which opens the 3D scene in sweep mode on its newest run.
  function kinematicSection(groups, state, handlers) {
    var section = VA.el("div", "navtree__section navtree__section--kinematic");
    section.appendChild(VA.el("h2", "navtree__heading", "Kinematic studies"));
    var ul = VA.el("ul", "navtree__list");
    groups.forEach(function (group) {
      var li = VA.el("li", "navtree__item");
      var head = VA.el("div", "navtree__group");
      head.appendChild(label(group.title, null, null));
      head.setAttribute("title", group.title);
      li.appendChild(head);
      var children = VA.el("ul", "navtree__children");
      group.studies.forEach(function (s) {
        var active = state.mode === "kinematic" && state.kinematicId === s.id;
        var row = VA.el("div", "navtree__row navtree__row--study" +
          (active ? " navtree__row--on" : "") +
          (s.failed ? " navtree__row--warn" : ""));
        row.appendChild(label(s.title, s.description, null));
        statusIcon(s.navStatus, s.title, row, handlers);
        row.setAttribute("data-nav-kind", "kinematic");
        row.setAttribute("data-nav-id", s.id);
        row.onclick = function () { handlers.onKinematic(s.id); };
        var item = VA.el("li", "navtree__item", row);
        if (active) sceneSlot(item, handlers);
        children.appendChild(item);
      });
      if (group.model) {
        var model = group.model;
        var mrow = VA.el("div", "navtree__row navtree__row--study navtree__row--model");
        mrow.appendChild(label("Kinematic model", null,
          "the mechanism moving through its newest sweep" +
          (model.ts ? " (" + String(model.ts).slice(0, 10) + ")" : "") +
          ", in the 3D scene"));
        mrow.setAttribute("data-nav-kind", "kinematic-model");
        mrow.setAttribute("data-nav-id", group.topologyId);
        mrow.onclick = function () {
          handlers.onKinematicModel(group.topologyId, model.runId);
        };
        children.appendChild(VA.el("li", "navtree__item", mrow));
      }
      li.appendChild(children);
      ul.appendChild(li);
    });
    section.appendChild(ul);
    return section;
  }

  function topologyItem(t, state, handlers) {
    var inThisTopology = state.mode === "topology" && state.topologyId === t.id;
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--topology" +
      (inThisTopology && !state.studyId ? " navtree__row--on" : ""));
    row.appendChild(label(t.title, t.description,
      "the whole topology, depth-first, with nothing highlighted"));
    row.appendChild(VA.el("code", "navtree__id", t.id));
    row.setAttribute("data-nav-kind", "topology");
    row.setAttribute("data-nav-id", t.id);
    row.onclick = function () { handlers.onTopology(t.id); };
    li.appendChild(row);
    if (inThisTopology && !state.studyId) sceneSlot(li, handlers);

    // One chip row per axis the tags use, over the study list: a value chip is
    // on or off, any chip on in an axis keeps its studies (OR), every axis with
    // a chip on must keep them (AND). Nothing when no study or body is tagged.
    var selection = state.tagFilter || {};
    (t.tagAxes || []).forEach(function (axis) {
      var chips = VA.el("div", "navtree__tags");
      chips.setAttribute("data-tag-axis", axis.axis);
      chips.appendChild(VA.el("span", "navtree__tagaxis", axis.axis));
      axis.values.forEach(function (value) {
        var on = (selection[axis.axis] || []).indexOf(value) !== -1;
        var chip = VA.el("button", "navtree__tag" + (on ? " navtree__tag--on" : ""),
          value);
        chip.setAttribute("type", "button");
        chip.setAttribute("aria-pressed", on ? "true" : "false");
        chip.setAttribute("data-tag-value", value);
        chip.onclick = function () { handlers.onTag(axis.axis, value); };
        chips.appendChild(chip);
      });
      li.appendChild(chips);
    });

    var children = VA.el("ul", "navtree__children");
    (t.studies || []).filter(function (s) {
      return VA.studyMatchesTags(s, selection, t.variantAxis);
    }).forEach(function (s) {
      var active = inThisTopology && state.studyId === s.id;
      var srow = VA.el("div", "navtree__row navtree__row--study" +
        (active ? " navtree__row--on" : "") +
        (s.status === "error" ? " navtree__row--warn" : ""));
      // The row's own name, with no glyph in front of it: a study that does
      // not sum used to prefix "⚠ " here AND now earns the status icon
      // below, and two triangles on one row is the loudness this pass exists
      // to remove. The amber `--warn` tint stays — it is the row's state, not
      // a badge, and it is what makes the row findable without hovering.
      srow.appendChild(label(s.title, s.description, null));
      // One mark, and only where there is something to look at
      // (viewer_nav_verdict_into_alert_and_icon, 2026-09-22). The verdict went
      // in with it: VA.studyNavStatus (topology.js) decides both which icon
      // and what it says, and is the only place either vocabulary lives.
      statusIcon(VA.studyNavStatus(s), s.title, srow, handlers);
      srow.setAttribute("data-nav-kind", "study");
      srow.setAttribute("data-nav-id", s.id);
      srow.setAttribute("data-topology-id", t.id);
      srow.onclick = function () { handlers.onStudy(t.id, s.id); };
      var item = VA.el("li", "navtree__item", srow);
      if (active) sceneSlot(item, handlers);
      children.appendChild(item);
    });
    if (children.childNodes.length) li.appendChild(children);
    return li;
  }

  // The ONE mark a nav row may wear, appended onto the row itself rather than
  // into a wrapper of its own: it sits at the end of the row's first line,
  // where the label's `flex: 1 1 auto` pushes it, instead of on a second line
  // under the name the way the retired `.navtree__chips` strip did. Whitespace
  // before chrome, and one line per row on a rail that is always on screen.
  //
  // Until 2026-09-22 a study row wore two marks — a filled all-caps verdict
  // pill AND a bordered ⚠ — and before 2026-09-21, up to four. Jeff, on the
  // two: "get rid of the pass/fail in the left side menu (move it into the
  // alert along with all the other alerts). Also reformat the alert icon: get
  // rid of the rounded border around it, make the actual icon larger so it's
  // legible." So:
  //
  //   * ONE icon, drawn (VA.warningIcon) rather than typed, with no chip
  //     framing around it — a border is a second mark on a row that needs one;
  //   * everything the row has to say is in the card it opens, verdict first,
  //     as full sentences. No abbreviation ever lands on a row;
  //   * a row with nothing to look at — a clean pass, no flags — wears
  //     nothing. The level says which of the two colours; the words say why.
  //
  // `stopClick`: the row underneath selects the study and re-renders the whole
  // rail, which would replace the icon the pointer is resting on. The icon is
  // a disclosure, not a second way into the study.
  function statusIcon(status, title, row, handlers) {
    if (!status) return;
    row.appendChild(VA.alertBadge(status.alerts, title,
      handlers && handlers.onCardShow, {
        stopClick: true,
        className: "navstatus navstatus--" + status.level,
        icon: VA.warningIcon("navstatus__mark"),
      }));
  }

  function stackItem(stackProj, state, handlers) {
    var active = state.mode === "stack" && state.selectedStackId === stackProj.id;
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--stack" +
      (active ? " navtree__row--on" : ""));
    row.appendChild(label(stackProj.title, stackProj.description, null));
    // The same mark a study row wears, over the same scheme
    // (VA.stackNavStatus). These rows printed every one of VA.summaryChips'
    // counts as its own chip until 2026-09-22 — five of them on one row, one
    // filled — which made them the loudest rows on a rail whose study rows had
    // just been quietened. The scoreboard is on the stack's own page.
    statusIcon(VA.stackNavStatus(stackProj), stackProj.title, row, handlers);
    row.setAttribute("data-nav-kind", "stack");
    row.setAttribute("data-nav-id", stackProj.id);
    row.onclick = function () { handlers.onStack(stackProj.id); };
    li.appendChild(row);
    return li;
  }

  // --- the scene's tree, under the row it is showing ------------------------
  //
  // Handoff the_shell_seats_the_scene_beside_the_model: with the 3D scene
  // open, the annotator's own rail -- bodies, joints and their surfaces and
  // parts, the study's contributors in sweep mode; the study's elements and
  // its parts in bind mode -- is drawn HERE, nested under the active row,
  // rather than as a second left-hand menu inside the scene. Only the slot is
  // made at nav-render time; topology_app.js fills it (renderSceneSlot) from
  // the rows the annotator sends, and refills it whenever they change.
  function sceneSlot(item, handlers) {
    if (!handlers || !handlers.sceneSlot) return;
    item.appendChild(VA.el("div", "navtree__scene"));
  }

  // `tree` is the annotator's {chips, rows} (apps/annotate/app.js's
  // embedTree, which carries the row shape); `opts.send(key, act, index?)`
  // hands a gesture back to it. Every word and every effect is the
  // annotator's: this draws what it was sent, and a gesture is only ever
  // "this row, this control".
  //
  // Keyboard: a disclosure is a <summary>, a row that does something on a
  // click is a focusable button-role row (Enter or Space), and its checkbox
  // and buttons are native controls -- so the whole tree is reachable by Tab
  // (ISSUE_20261021_design_the_sweep_rails_repick_and_contributor_rows_
  // cannot_be_reached_by_keyboard, for this copy). Focus lights the row in
  // the scene the way a resting pointer does.
  VA.renderSceneTree = function (slot, tree, opts) {
    VA.clear(slot);
    if (!tree || !tree.rows || !tree.rows.length) return slot;
    var send = (opts && opts.send) || function () {};
    if (tree.chips && tree.chips.length) {
      var bar = VA.el("div", "navtree__scenechips");
      bar.setAttribute("role", "group");
      tree.chips.forEach(function (chip) {
        var button = VA.el("button", "navtree__scenechip", chip.text);
        button.setAttribute("aria-pressed", chip.pressed ? "true" : "false");
        button.setAttribute("data-scene-chip", chip.key);
        button.onclick = function () { send(chip.key, "button", 0); };
        bar.appendChild(button);
      });
      slot.appendChild(bar);
    }
    slot.appendChild(sceneList(tree.rows, send));
    return slot;
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
      (row.sceneHover ? " navtree__scenerow--hot" : ""));
    line.setAttribute("data-scene-key", row.key);
    if (row.attention) line.setAttribute("data-attention", "true");
    if (row.title) line.setAttribute("title", row.title);
    var text = VA.el("span", "navtree__scenetext");
    text.appendChild(VA.el("span", "navtree__scenename", row.text));
    if (row.sub) text.appendChild(VA.el("span", "navtree__scenesub", row.sub));
    line.appendChild(text);
    if (row.value) line.appendChild(VA.el("span", "navtree__scenevalue", row.value));
    if (row.alert) {
      var mark = VA.el("span", "navtree__scenealert");
      mark.appendChild(VA.warningIcon("navtree__scenealert-mark"));
      mark.setAttribute("title", row.alert);
      mark.setAttribute("aria-label", row.alert);
      mark.setAttribute("tabindex", "0");
      line.appendChild(mark);
    }
    sceneControls(line, row, send);
    // Resting on a row -- or tabbing to it -- lights its thing in the scene.
    line.onmouseenter = function () { send(row.key, "enter"); };
    line.onmouseleave = function () { send(row.key, "leave"); };

    if (typeof row.open === "boolean") {
      // A disclosure. Its open state is the annotator's (a joint opening is
      // that joint selected), so a click asks for the toggle and the reply
      // redraws it; the native toggle is not taken.
      var box = VA.el("details", "navtree__scenenode");
      box.open = row.open;
      var summary = VA.el("summary", "navtree__scenesummary");
      summary.appendChild(line);
      summary.onclick = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        send(row.key, "toggle");
      };
      summary.onfocus = function () { send(row.key, "enter"); };
      summary.onblur = function () { send(row.key, "leave"); };
      box.appendChild(summary);
      if (row.rows && row.rows.length) box.appendChild(sceneList(row.rows, send));
      li.appendChild(box);
      return li;
    }
    if (row.activate) {
      line.setAttribute("tabindex", "0");
      line.setAttribute("role", "button");
      line.classList.add("navtree__scenerow--act");
      line.onclick = function () { send(row.key, "activate"); };
      line.onkeydown = function (event) {
        if (!event || (event.key !== "Enter" && event.key !== " ")) return;
        if (event.target !== line) return;
        if (event.preventDefault) event.preventDefault();
        send(row.key, "activate");
      };
      line.onfocus = function () { send(row.key, "enter"); };
      line.onblur = function () { send(row.key, "leave"); };
    }
    li.appendChild(line);
    return li;
  }

  // A row's own checkbox and buttons, each a native control that hands its
  // gesture back rather than acting here. The checkbox does not flip on its
  // own: the annotator's answer redraws it.
  function sceneControls(line, row, send) {
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
        send(row.key, "check");
      };
      line.appendChild(box);
    }
    (row.buttons || []).forEach(function (spec, i) {
      var button = VA.el("button", "navtree__scenebtn", spec.text);
      if (spec.title) button.setAttribute("title", spec.title);
      if (spec.pressed) button.setAttribute("aria-pressed", "true");
      button.setAttribute("data-scene-part", "button-" + i);
      button.onclick = function (event) {
        if (event) {
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
        }
        send(row.key, "button", i);
      };
      line.appendChild(button);
    });
  }
})(window.ViewerApp = window.ViewerApp || {});
