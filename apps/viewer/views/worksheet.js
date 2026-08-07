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
    // A declared worksheet (provenance.worksheet) overrides the stack_X ->
    // WORKSHEET_X naming convention, and the reason it exists is that one sheet
    // can serve several stacks — so a reader who notices the name does not match
    // the stack is told why rather than left to suspect the wrong sheet.
    if (stackProj.worksheet_source === "declared") {
      root.appendChild(VA.el("div", "worksheet__note",
        "declared by the stack file (provenance.worksheet), not matched by name — " +
        "one worksheet may cover several stacks"));
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
