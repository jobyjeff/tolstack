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
// that renders it: as the row's hover tooltip. Progressive disclosure, no new
// chrome — a row with no description simply has no tooltip to show.
(function (VA) {
  "use strict";

  // The row's `title=`, or null for none. Where a row already carries a hint
  // about what clicking it does, the description goes ABOVE it rather than
  // replacing it: the hint is the only statement of that behaviour anywhere.
  function tooltip(description, hint) {
    if (description && hint) return description + "\n\n" + hint;
    return description || hint || null;
  }

  function setTooltip(row, description, hint) {
    var text = tooltip(description, hint);
    if (text) row.setAttribute("title", text);
  }

  VA.renderNavTree = function (root, tree, state, handlers) {
    VA.clear(root);
    root.className = "navtree";
    var topologies = (tree && tree.topologies) || [];
    var looseStacks = (tree && tree.looseStacks) || [];
    if (!topologies.length && !looseStacks.length) {
      root.appendChild(VA.el("p", "muted", "No topologies or stacks in the projection."));
      return root;
    }
    var ul = VA.el("ul", "navtree__list");
    topologies.forEach(function (t) { ul.appendChild(topologyItem(t, state, handlers)); });
    looseStacks.forEach(function (s) { ul.appendChild(stackItem(s, state, handlers)); });
    root.appendChild(ul);
    return root;
  };

  function topologyItem(t, state, handlers) {
    var inThisTopology = state.mode === "topology" && state.topologyId === t.id;
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--topology" +
      (inThisTopology && !state.studyId ? " navtree__row--on" : ""));
    row.appendChild(VA.el("span", "navtree__label", t.title));
    row.appendChild(VA.el("code", "navtree__id", t.id));
    setTooltip(row, t.description,
      "the whole topology, depth-first, with nothing highlighted");
    row.setAttribute("data-nav-kind", "topology");
    row.setAttribute("data-nav-id", t.id);
    row.onclick = function () { handlers.onTopology(t.id); };
    li.appendChild(row);

    var children = VA.el("ul", "navtree__children");
    (t.studies || []).forEach(function (s) {
      var active = inThisTopology && state.studyId === s.id;
      var srow = VA.el("div", "navtree__row navtree__row--study" +
        (active ? " navtree__row--on" : "") +
        (s.status === "error" ? " navtree__row--warn" : ""));
      // The row's own name, with no glyph in front of it: a study that does
      // not sum used to prefix "⚠ " here AND now earns the status icon
      // below, and two triangles on one row is the loudness this pass exists
      // to remove. The amber `--warn` tint stays — it is the row's state, not
      // a badge, and it is what makes the row findable without hovering.
      srow.appendChild(VA.el("span", "navtree__label", s.title));
      // One mark, and only where there is something to look at
      // (viewer_nav_verdict_into_alert_and_icon, 2026-09-22). The verdict went
      // in with it: VA.studyNavStatus (topology.js) decides both which icon
      // and what it says, and is the only place either vocabulary lives.
      statusIcon(VA.studyNavStatus(s), s.title, srow, handlers);
      setTooltip(srow, s.description, null);
      srow.setAttribute("data-nav-kind", "study");
      srow.setAttribute("data-nav-id", s.id);
      srow.setAttribute("data-topology-id", t.id);
      srow.onclick = function () { handlers.onStudy(t.id, s.id); };
      children.appendChild(VA.el("li", "navtree__item", srow));
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
    row.appendChild(VA.el("span", "navtree__label", stackProj.title));
    // The same mark a study row wears, over the same scheme
    // (VA.stackNavStatus). These rows printed every one of VA.summaryChips'
    // counts as its own chip until 2026-09-22 — five of them on one row, one
    // filled — which made them the loudest rows on a rail whose study rows had
    // just been quietened. The scoreboard is on the stack's own page.
    statusIcon(VA.stackNavStatus(stackProj), stackProj.title, row, handlers);
    setTooltip(row, stackProj.description, null);
    row.setAttribute("data-nav-kind", "stack");
    row.setAttribute("data-nav-id", stackProj.id);
    row.onclick = function () { handlers.onStack(stackProj.id); };
    li.appendChild(row);
    return li;
  }
})(window.ViewerApp = window.ViewerApp || {});
