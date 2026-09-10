// Connection + freshness banner. Three connection states plus the two
// "projection not built" states, each with the command that fixes it — a
// missing projection is the app's most likely first-run condition and it should
// never look like a bug.
(function (VA) {
  "use strict";

  VA.renderBanner = function (root, state, handlers) {
    VA.clear(root);
    root.className = "banner banner--" + state.connection;
    // Which projection sits in `state.results` — see VA.PROJECTION_LABELS. The
    // topology page passes `topologies`; everything else defaults to `results`.
    var labels = VA.projectionLabels(state.projection);

    if (state.connection === VA.STATE.DISCONNECTED) {
      root.appendChild(VA.el("span", null,
        "Connect the tolstack repo folder (C:\\workspace\\tolstack) to load the stacks. Read-only."));
      root.appendChild(button("Connect folder", "banner__action", handlers.onConnect));
    } else if (state.connection === VA.STATE.NEEDS_REGRANT) {
      root.appendChild(VA.el("span", null,
        "Chrome needs the folder permission re-granted (one click, once per browser restart)."));
      root.appendChild(button("Re-grant", "banner__action", handlers.onReconnect));
    } else {
      // The one line served mode adds (viewer_http_transport, deliverable 2):
      // FSA mode gets none, unchanged from before this handoff — the connect-
      // folder banner already disappeared on its own once state went READY,
      // and the picker itself is proof enough of "the granted folder" there.
      if (state.transport === "http") {
        root.appendChild(VA.el("div", "banner__source",
          "Served over HTTP — no folder grant needed. Read-only."));
      }
      root.appendChild(VA.el("span", "banner__built",
        VA.builtLine(state.results, state.crops, state.projection)));
      root.appendChild(button("Reload", "banner__action", handlers.onReload));
      // Which rule resolved the crops, beneath the counts they belong to.
      var rules = VA.cropRulesLine(state.crops);
      if (rules) root.appendChild(VA.el("div", "banner__crop-rules", rules));
      provenance(root, state, labels);
    }

    if (state.error) {
      root.appendChild(VA.el("div", "banner__error", state.error));
    }

    if (state.connection === VA.STATE.READY && !state.results) {
      root.appendChild(missing(labels.missing,
        VA.CONFIG.rebuild[labels.rebuildKey]));
    }
    if (state.connection === VA.STATE.READY && state.results && !state.crops) {
      root.appendChild(missing(
        "No crop projection — hovers will say \"not built\" rather than " +
        "\"unresolvable\", which are different facts. Build it (needs PyMuPDF, " +
        "so use drawing-checker's venv):",
        VA.CONFIG.rebuild.crops));
    }
    return root;
  };

  // Which tree built each projection, and what is provably wrong with the pair.
  // `built_at` alone is what let a projection from a superseded branch sit in
  // front of a reader for six hours on 2026-08-07 looking current
  // (ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection).
  // A timestamp answers "when", and the question was "which tree".
  function provenance(root, state, labels) {
    // `extraAlarms` is the caller's own list, appended to the shared ones rather
    // than rendered somewhere else: the topology page's orphan studies belong in
    // the same box as "these two were built from different trees", because they
    // are the same kind of fact — something about the data in front of you that
    // the page cannot fix.
    // One plain-words line, with the detail (the alarms themselves, which name
    // branches, shas and files, plus the rebuild commands) behind an expand —
    // house UI-copy rules (no paragraphs, no internal file/module names, no
    // shell commands in the always-visible copy) bind on the COLLAPSED line,
    // which is the one every reader sees whether or not anything is wrong.
    // "This projection may not be what you think it is" and the bare <code>
    // rebuild commands retired from it for that reason; the technical detail
    // still exists, one click away, for a reader actively investigating.
    var alarms = VA.provenanceAlarms(state.results, state.crops, state.projection)
      .concat(state.extraAlarms || []);
    if (alarms.length) {
      var box = VA.el("details", "banner__stale");
      box.appendChild(VA.el("summary", "banner__stale-summary",
        "⚠ Data is older than the latest code — needs a rebuild"));
      var detail = VA.el("div", "banner__stale-detail");
      var list = VA.el("ul", "banner__stale-list");
      alarms.forEach(function (text) {
        list.appendChild(VA.el("li", null, text));
      });
      detail.appendChild(list);
      detail.appendChild(VA.el("div", null, "Rebuild both, newest tree first:"));
      detail.appendChild(VA.el("code", "banner__cmd",
        VA.CONFIG.rebuild[labels.rebuildKey]));
      detail.appendChild(VA.el("code", "banner__cmd", VA.CONFIG.rebuild.crops));
      box.appendChild(detail);
      root.appendChild(box);
    }

    [[labels.name, state.results], ["crops", state.crops]].forEach(function (pair) {
      var line = VA.provenanceLine(pair[0], pair[1]);
      if (line) root.appendChild(VA.el("div", "banner__provenance", line));
    });
  }

  // The one error seam (deliverable 1, viewer_error_surface_and_layout):
  // topology_app.js's render() wraps its real paint in a try/catch and calls
  // this instead of leaving the page silently unchanged -- the 2026-09-09
  // incident, where a throw inside render() left the DAG pane empty with a
  // no-op Reload. Plain words, the exception's own message (a human author's
  // best clue) and the one hint that has actually fixed this before, so the
  // reader is not left guessing.
  VA.renderCrashBanner = function (root, err) {
    VA.clear(root);
    root.className = "banner banner--crash";
    root.appendChild(VA.el("div", "banner__error",
      "This page failed to render: " + String(err && err.message || err)));
    root.appendChild(VA.el("div", "banner__crash-hint",
      "A hard reload (Ctrl+Shift+R) may clear a stale cache -- that has " +
      "caused this before."));
    return root;
  };

  function missing(text, command) {
    var box = VA.el("div", "banner__missing");
    box.appendChild(VA.el("div", null, text));
    box.appendChild(VA.el("code", "banner__cmd", command));
    return box;
  }

  function button(label, className, onClick) {
    var node = VA.el("button", className, label);
    node.onclick = onClick;
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
