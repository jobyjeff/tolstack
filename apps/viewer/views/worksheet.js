// The worksheet pane. WORKSHEET_*.md is authored prose — nothing about it is
// derived — so it is read LIVE from docs/tolerance_stacks/ rather than copied
// into the projection: edit the markdown, reload, see it. Rendered with the
// vendored dependency-free renderer (escape-first, no sanitize pass needed).
(function (VA) {
  "use strict";

  VA.renderWorksheet = function (root, stackProj, markdown) {
    VA.clear(root);
    root.className = "worksheet";
    if (!stackProj) return root;

    var path = stackProj.worksheet_file;
    if (!path) {
      root.appendChild(VA.el("p", "muted",
        "No worksheet for this stack. (The projection reports absence rather " +
        "than pointing at a neighbouring stack's sheet.)"));
      return root;
    }
    root.appendChild(VA.el("div", "worksheet__path", path));
    // HOW this sheet was found, in the words VA.WORKSHEET_SOURCES keeps for it.
    // The branch used to be `=== "declared"` against a bare literal, with the
    // sentence inline beside it; the vocabulary has a home now, and this reads
    // it. `stackProj` here is whichever projection the caller is showing — a
    // stack's or a topology's, both builders write this field — and this
    // renderer never reads anything else off it.
    var sourceNote = (VA.WORKSHEET_SOURCES[stackProj.worksheet_source] || {}).note;
    if (sourceNote) {
      root.appendChild(VA.el("div", "worksheet__note", sourceNote));
    }
    if (markdown === null || markdown === undefined) {
      root.appendChild(VA.el("p", "muted",
        "The projection names this worksheet but it could not be read from the " +
        "connected folder."));
      return root;
    }
    var body = VA.el("div", "worksheet__body");
    body.innerHTML = VA.renderMarkdown(markdown);
    root.appendChild(body);
    return root;
  };
})(window.ViewerApp = window.ViewerApp || {});
