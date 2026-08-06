// Viewer config (v0: edit this file by hand).
//
// A classic script rather than config.json because the app runs from file://,
// where Chrome forbids fetch() of local files — a JSON config could not be read
// by double-clicking index.html. Editing the values below and reloading is the
// v0 governance mechanism (the forge apps/notes/config.js precedent).
(function (VA) {
  "use strict";
  VA.CONFIG = {
    // Where the two projection scripts write, relative to the repo root the
    // folder grant points at.
    projectionDir: ["data", "projections", "viewer"],
    stacksDir: ["docs", "tolerance_stacks"],

    // drawing-checker's local web UI. A crop resolved through a run links to
    // that run's page; if the server isn't up the link simply doesn't answer,
    // which is why the absolute PDF path is always shown beside it.
    //   serve it with:  cd C:\workspace\drawing-checker && cmd /c serve.bat
    drawingCheckerWebui: "http://127.0.0.1:8000",

    // Commands the banner offers when a projection is missing. Kept here so the
    // app never hard-codes a path in view code.
    rebuild: {
      results: "venv-win\\Scripts\\python.exe scripts\\build_viewer_projection.py",
      crops:
        "C:\\workspace\\drawing-checker\\venv-win\\Scripts\\python.exe " +
        "scripts\\build_viewer_crops.py",
    },
  };
})(window.ViewerApp = window.ViewerApp || {});
