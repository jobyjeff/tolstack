// The single left-rail nav (viewer_v2_single_nav, 2026-09-08): one tree,
// replacing both the TOPOLOGY/STUDY <select> pickers (views/topology.js's old
// renderTopoPicker) and the flat stack rail (the retired views/list.js) at
// once. Every topology lists its studies as children; every classic-only
// stack (no topology re-expresses it) is a leaf of the same tree. Selecting
// any node drives the whole page — see topology_app.js's onNavTopology /
// onNavStudy / onNavStack.
//
// The one stack a topology ALSO re-expresses is not a second top-level leaf:
// LESSONS_20260904_viewer_consolidation.md §1 found that stack's own authored
// `checks` block (a worst-case verdict against a criterion) has no field in
// the topology projection at all — DAG_TOPOLOGY.md's L1 proof compares
// totals, never a verdict — so it must stay reachable. Nesting it as a child
// of the topology it belongs to (VA.navTree's `coveredStacks`, topology.js)
// is the tree-shaped form of the same "extra pointer, never a removal" rule
// the flat list's markCoveredStacks chip used; nothing is hidden or
// duplicated, and the covered stack's own classic view (with its check) is
// one click under the topology it also is.
(function (VA) {
  "use strict";

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
    row.setAttribute("title", "the whole topology, depth-first, with nothing highlighted");
    row.setAttribute("data-nav-kind", "topology");
    row.setAttribute("data-nav-id", t.id);
    row.onclick = function () { handlers.onTopology(t.id); };
    li.appendChild(row);

    var children = VA.el("ul", "navtree__children");
    (t.studies || []).forEach(function (s) {
      var active = inThisTopology && state.studyId === s.id;
      var srow = VA.el("div", "navtree__row navtree__row--study" +
        (active ? " navtree__row--on" : "") +
        (s.status === "error" ? " navtree__row--warn" : ""),
        (s.status === "error" ? "⚠ " : "") + s.title);
      srow.setAttribute("data-nav-kind", "study");
      srow.setAttribute("data-nav-id", s.id);
      srow.setAttribute("data-topology-id", t.id);
      srow.onclick = function () { handlers.onStudy(t.id, s.id); };
      children.appendChild(VA.el("li", "navtree__item", srow));
    });
    (t.coveredStacks || []).forEach(function (stackProj) {
      var active = state.mode === "stack" && state.selectedStackId === stackProj.id;
      var srow = VA.el("div", "navtree__row navtree__row--stack" +
        (active ? " navtree__row--on" : ""));
      srow.appendChild(VA.el("span", "navtree__label", stackProj.title));
      srow.appendChild(VA.chip("chip--kind", "classic view",
        "this stack's own authored checks live here — the topology this page " +
        "also draws for it compares totals, never a verdict, so this check has " +
        "no field there at all"));
      srow.setAttribute("data-nav-kind", "stack");
      srow.setAttribute("data-nav-id", stackProj.id);
      srow.onclick = function () { handlers.onStack(stackProj.id); };
      children.appendChild(VA.el("li", "navtree__item", srow));
    });
    if (children.childNodes.length) li.appendChild(children);
    return li;
  }

  function stackItem(stackProj, state, handlers) {
    var active = state.mode === "stack" && state.selectedStackId === stackProj.id;
    var li = VA.el("li", "navtree__item");
    var row = VA.el("div", "navtree__row navtree__row--stack" +
      (active ? " navtree__row--on" : ""));
    row.appendChild(VA.el("span", "navtree__label", stackProj.title));
    var chips = VA.el("div", "navtree__chips");
    VA.summaryChips(stackProj).forEach(function (chip) {
      chips.appendChild(VA.chip(
        chip.kind === "confidence" ? VA.confidenceClass(chip.confidence) : "chip--" + chip.kind,
        chip.text, chip.title));
    });
    row.appendChild(chips);
    row.setAttribute("data-nav-kind", "stack");
    row.setAttribute("data-nav-id", stackProj.id);
    row.onclick = function () { handlers.onStack(stackProj.id); };
    li.appendChild(row);
    return li;
  }
})(window.ViewerApp = window.ViewerApp || {});
