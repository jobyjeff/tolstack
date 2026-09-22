// Connection + freshness banner. Three connection states plus the two
// "projection not built" states — a missing projection is the app's most
// likely first-run condition and it should never look like a bug.
//
// Above all three sits one state that is not about a connection at all: a
// served page whose origin has nothing published (viewer_transport_honest_
// hosted, 2026-09-14). It short-circuits the whole function — see the first
// branch below.
//
// NOTHING IN THIS FILE RENDERS A TERMINAL COMMAND, in either mode. Jeff hit
// the stale-pair box on 2026-09-10 pasted straight into PowerShell and found
// two commands concatenated onto one line with no separator (the fix, see
// rebuildAffordance's own comment) — and, separately from that bug, decided
// pasting terminal commands into a web UI is not acceptable UI design at all.
// That box lost its commands then; the two "projection not built" boxes kept
// theirs until 2026-09-22 and were the last of the four sites in the viewer's
// chrome (policy_free_brief_residues, BRIEF_20260911_served_surface_
// capability_gaps item 4). A served page with the rebuild endpoint live gets
// a button instead; everything else gets plain sentences and nothing to type.
(function (VA) {
  "use strict";

  VA.renderBanner = function (root, state, handlers) {
    VA.clear(root);

    // A served page whose origin publishes no data (VA.TRANSPORT.UNPUBLISHED,
    // storage/adapter.js's chooseTransport): one plain sentence, and nothing
    // else on the bar. NOT the disconnected banner below it — **Connect
    // folder** cannot work for a hosted visitor, who has no tolstack repo to
    // grant, and a control that cannot work is not softened by being present:
    // it reads as a page asking for access to their files and then failing.
    // A feature that is absent shows nothing, not a dead button.
    //
    // Nothing is latched here, deliberately: the state is recomputed from a
    // fresh probe on every load, so once the origin starts serving the
    // projections a plain reload enters served mode with no user action.
    if (state.transport === VA.TRANSPORT.UNPUBLISHED) {
      root.className = "banner banner--unpublished";
      root.appendChild(VA.el("span", null,
        "The tolerance-stack data is not published on this site yet — " +
        "there is nothing to show."));
      if (state.error) root.appendChild(VA.el("div", "banner__error", state.error));
      return root;
    }

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
      // Everything that used to sit here as five always-visible rows of text
      // — the transport line, when each projection was built, which rule
      // resolved the crops, and which tree built each of the two — is folded
      // into ONE closed disclosure (Jeff, 2026-09-16: "These 5 lines at the
      // top of the page are meaningless to the user. Delete.").
      //
      // Folded rather than deleted, and the distinction is the whole of this
      // block's design: none of these facts is wrong, and one of them
      // (`provenanceLine`) exists because a projection built from a superseded
      // branch sat in front of a reader for six hours looking current
      // (ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_
      // projection). What was wrong was their PLACEMENT — five rows of build
      // stamps above the page, on every load, for a reader who is here to read
      // a stack. The alarm below still fires on its own whenever the pair
      // provably disagrees, which is the case a reader must not be able to
      // miss; this fold is for the reader who went looking.
      source(root, state, labels);
      root.appendChild(button("Reload", "banner__action", handlers.onReload));
      provenance(root, state, handlers);
    }

    if (state.error) {
      root.appendChild(VA.el("div", "banner__error", state.error));
    }

    // What an inbound deep link asked for that this data could not deliver
    // (viewer_hover_cards_and_deep_links): one plain-words line each. Its own
    // surface, not the stale-pair alarm box — a link naming an id the data
    // does not contain is a fact about the LINK, not about which tree built
    // the projection, and "needs a rebuild" would be the wrong advice.
    (state.notices || []).forEach(function (text) {
      root.appendChild(VA.el("div", "banner__notice", text));
    });

    if (state.connection === VA.STATE.READY && !state.results) {
      root.appendChild(missing(labels.missing));
    }
    if (state.connection === VA.STATE.READY && state.results && !state.crops) {
      root.appendChild(missing(VA.MISSING_CROPS_NOTICE));
    }
    return root;
  };

  // The fold itself. One <details>, the same word every fold on this app
  // carries (VA.DATA_SOURCE_SUMMARY), holding the rows in the order they were
  // rendered in before: how this page is reading the data, when each
  // projection was built, which rule resolved the crops, and which tree wrote
  // each file.
  function source(root, state, labels) {
    var fold = VA.disclosure(VA.DATA_SOURCE_SUMMARY, "banner__source");
    // The one line served mode adds (viewer_http_transport, deliverable 2):
    // FSA mode gets none, unchanged from before that handoff — the connect-
    // folder banner already disappeared on its own once state went READY,
    // and the picker itself is proof enough of "the granted folder" there.
    if (state.transport === VA.TRANSPORT.HTTP) {
      fold.body.appendChild(VA.el("div", "banner__transport",
        "Served over HTTP — no folder grant needed. Read-only."));
    }
    fold.body.appendChild(VA.el("div", "banner__built",
      VA.builtLine(state.results, state.crops, state.projection)));
    // Which rule resolved the crops, beneath the counts they belong to.
    var rules = VA.cropRulesLine(state.crops);
    if (rules) fold.body.appendChild(VA.el("div", "banner__crop-rules", rules));
    [[labels.name, state.results], ["crops", state.crops]].forEach(function (pair) {
      var line = VA.provenanceLine(pair[0], pair[1]);
      if (line) fold.body.appendChild(VA.el("div", "banner__provenance", line));
    });
    root.appendChild(fold.box);
    return fold;
  }

  // Which tree built each projection, and what is provably wrong with the pair.
  // `built_at` alone is what let a projection from a superseded branch sit in
  // front of a reader for six hours on 2026-08-07 looking current
  // (ISSUE_20260806_concurrent_worktrees_clobber_the_shared_viewer_projection).
  // A timestamp answers "when", and the question was "which tree".
  function provenance(root, state, handlers) {
    // `extraAlarms` is the caller's own list, appended to the shared ones rather
    // than rendered somewhere else: the topology page's orphan studies belong in
    // the same box as "these two were built from different trees", because they
    // are the same kind of fact — something about the data in front of you that
    // the page cannot fix.
    // One plain-words line, with the detail (the alarms themselves, which name
    // branches, shas and files) behind an expand — house UI-copy rules (no
    // paragraphs, no internal file/module names, no shell commands anywhere in
    // this box, collapsed or not) bind on the COLLAPSED line, which is the one
    // every reader sees whether or not anything is wrong. "This projection may
    // not be what you think it is" retired from it for that reason; the
    // technical detail still exists, one click away, for a reader actively
    // investigating.
    //
    // The rebuild affordance itself sits OUTSIDE the `<details>`, always
    // visible once the summary line is: a `<details>` recreated on every
    // render (VA.clear + rebuild, not a diff) always starts collapsed again,
    // so a button living inside it would vanish from under the reader's
    // pointer the moment a click re-rendered the banner to show "Rebuilding…"
    // — exactly the state a reader clicking it most needs to see.
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
      box.appendChild(detail);
      root.appendChild(box);
      root.appendChild(rebuildAffordance(state, handlers));
    }
  }

  // What the reader is given to do about a stale pair. Never a rebuild
  // command: pasted into a shell, the two that used to sit here as adjacent
  // `<code>` elements concatenated onto ONE line with no separator between
  // them (inline elements, no text node between — the bug the browser's own
  // copy always had, no one had hit it until 2026-09-10) and the second still
  // carried its own interpreter path, so the pasted line read as one broken
  // command wearing two interpreters. Rather than add a separator and keep
  // pasting commands into a web UI — the part of the incident that is a
  // binding house rule, not a one-off bug — this drops commands from the box
  // entirely: served mode with the rebuild endpoint live (capabilities().
  // rebuild, storage/http.js) drives the whole thing from a click; everything
  // else states the fact in one sentence and gives the reader nothing to type.
  function rebuildAffordance(state, handlers) {
    var caps = state.capabilities;
    if (caps && caps.rebuild) {
      var box = VA.el("div", "banner__rebuild");
      var rebuild = state.rebuild || {};
      var btn = button(rebuild.busy ? "Rebuilding…" : "Rebuild",
        "banner__action", handlers.onRebuild);
      btn.disabled = !!rebuild.busy;
      box.appendChild(btn);
      // Plain words only, by construction — never the server's own error
      // text, which could name a script or a path (the exact thing this box
      // exists to stop showing). See topology_app.js's rebuildFailed().
      if (rebuild.error) box.appendChild(VA.el("div", "banner__error", rebuild.error));
      return box;
    }
    return VA.el("div", "banner__rebuild-hint",
      "The data is older than the code and needs a rebuild.");
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

  // A projection this page cannot build: the fact, then where the work
  // happens, and nothing to type.
  //
  // It took a second argument until 2026-09-22 and rendered it as a
  // `<code class="banner__cmd">` — the LAST of the four terminal commands the
  // viewer's own chrome printed at a reader (the crop popover's went
  // 2026-09-15, the disclosure's two before that). Both were removed together
  // with the VA.CONFIG.rebuild table that supplied them and the `.banner__cmd`
  // rule that styled them, because a guard on the copy alone goes green again
  // the moment somebody re-adds "Build it: " + a string — the finding
  // apps/annotate/ recorded when the same defect came back there
  // (ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_not_the
  // _call_site).
  //
  // Two nodes, not one sentence: the second line is secondary information and
  // is muted rather than emphasised, which is the house rule for it.
  function missing(text) {
    var box = VA.el("div", "banner__missing");
    box.appendChild(VA.el("div", null, text));
    box.appendChild(VA.el("div", "banner__missing-where",
      VA.PROJECTION_BUILT_ELSEWHERE));
    return box;
  }

  function button(label, className, onClick) {
    var node = VA.el("button", className, label);
    node.onclick = onClick;
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
