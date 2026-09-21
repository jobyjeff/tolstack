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
      // not sum used to prefix "⚠ " here AND now earns the consolidated badge
      // below, and two triangles on one row is the loudness this pass exists
      // to remove. The amber `--warn` tint stays — it is the row's state, not
      // a badge, and it is what makes the row findable without hovering.
      srow.appendChild(VA.el("span", "navtree__label", s.title));
      // The verdict, on the rail (viewer_study_verdicts_and_gaps, 2026-09-15).
      // Every study that HAS a disposition wears it; everything else the row
      // has to admit is one ⚠ with the sentences on hover
      // (viewer_nav_alert_badge_and_angled_default, 2026-09-21). The rail is
      // where a reader sees the shape of a whole document at once, so a row
      // that stays silent about whether its study passes reads as a row whose
      // study passed — which is why a row with no criterion recorded still
      // carries the badge rather than nothing.
      srow.appendChild(studyBadges(s, handlers));
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

  // The study row's badges: at most two, and one of them is a glyph.
  //
  // Until 2026-09-21 this was up to four filled all-caps chips — `PASS`
  // `UNVERIFIED` `NO TOLERANCE RECORDED`, or `no criterion` `UNVERIFIED` — on
  // every row of a 300px rail that is always on screen. Jeff: "the alerts
  // still haven't been replaced with a single triangle ! (hover over to see
  // details)". So:
  //
  //   * the VERDICT stays a chip, because it is the answer the reader came for
  //     and folding it into a hover would reverse the 2026-09-15 decision that
  //     put it here rather than quieten it. It still carries its `--qualified`
  //     tint where the chain is short a term;
  //   * every alert — the two verdict states that are not dispositions, and
  //     each attention flag — folds into ONE ⚠ whose card lists them as full
  //     sentences. VA.studyNavAlerts (topology.js) decides which is which and
  //     is the only place that vocabulary lives;
  //   * a row with nothing wrong shows the verdict alone. Nothing about an
  //     absent alert is rendered at all.
  function studyBadges(s, handlers) {
    var chips = VA.el("div", "navtree__chips");
    var verdict = s.verdict;
    if (verdict && !VA.NAV_ALERT_VERDICT_STATES[verdict.state]) {
      var chip = VA.chip("tvverdict tvverdict--" + verdict.state,
        verdict.word, verdict.title);
      if (verdict.incomplete) chip.className += " tvverdict--qualified";
      chips.appendChild(chip);
    }
    var alerts = VA.studyNavAlerts(s);
    if (alerts.length) {
      // `stopClick`: the row underneath selects the study and re-renders the
      // whole rail, which would replace the badge the pointer is resting on.
      // The badge is a disclosure, not a second way into the study.
      chips.appendChild(VA.alertBadge(alerts, s.title,
        handlers && handlers.onCardShow, { stopClick: true }));
    }
    return chips;
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
    setTooltip(row, stackProj.description, null);
    row.setAttribute("data-nav-kind", "stack");
    row.setAttribute("data-nav-id", stackProj.id);
    row.onclick = function () { handlers.onStack(stackProj.id); };
    li.appendChild(row);
    return li;
  }
})(window.ViewerApp = window.ViewerApp || {});
