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
    // A declared worksheet (provenance.worksheet) overrides the X -> WORKSHEET_X
    // naming convention (a stack's own build_viewer_projection.py and, since
    // topology_schema_v1, a topology's own build_topology_projection.py alike),
    // and the reason it exists is that one sheet can serve several documents —
    // so a reader who notices the name does not match the one they opened is
    // told why rather than left to suspect the wrong sheet. `stackProj` here is
    // whichever projection the caller is showing; this renderer never reads
    // anything else off it.
    if (stackProj.worksheet_source === "declared") {
      root.appendChild(VA.el("div", "worksheet__note",
        "declared by this file itself (provenance.worksheet), not matched by " +
        "name — one worksheet may cover several stacks or topologies"));
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
