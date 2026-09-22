// Viewer config (v0: edit this file by hand).
//
// A classic script rather than config.json because the app runs from file://,
// where Chrome forbids fetch() of local files — a JSON config could not be read
// by double-clicking index.html. Editing the values below and reloading is the
// v0 governance mechanism (the forge apps/notes/config.js precedent).
(function (VA) {
  "use strict";
  VA.CONFIG = {
    // Where the projection scripts write, relative to the repo root the folder
    // grant points at. Three of them land here: results.json, crops.json and
    // topologies.json. (This said "one per `rebuild` key below" until
    // 2026-09-22, when that table went -- there is no key here to be one per
    // any more; see the note at the end of this block.)
    projectionDir: ["data", "projections", "viewer"],
    stacksDir: ["docs", "tolerance_stacks"],

    // drawing-checker's local web UI. A crop resolved through a run links to
    // that run's page; if the server isn't up the link simply doesn't answer,
    // which is why the absolute PDF path is always shown beside it.
    //   serve it with:  cd C:\workspace\drawing-checker && cmd /c serve.bat
    drawingCheckerWebui: "http://127.0.0.1:8000",

    // There is deliberately NO `rebuild` entry here. It held the three build
    // commands as strings, and every one of them reached a reader: two
    // through the banner's `missing()` box and the third through the topology
    // pane's empty state — three interpreter paths and twelve backslashes on
    // a web surface, the shape ruled out for every web surface in this
    // workspace (Jeff, 2026-09-10; views/banner.js's docstring records the
    // sighting). Nothing on this page can run a command, so this app holds
    // none at all: see VA.PROJECTION_LABELS and VA.PROJECTION_BUILT_ELSEWHERE
    // in viewer.js for what is said instead, and tests.js for the checks that
    // keep them from coming back. apps/annotate/config.js retired its own
    // twin of this block on 2026-09-15 with the same argument.
  };
})(window.ViewerApp = window.ViewerApp || {});
