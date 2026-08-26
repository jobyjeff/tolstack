// Three-line DOM helper shared by the views. Building nodes (rather than
// assembling HTML strings) is what lets the node DOM shim in run_tests.cjs run
// the rendering tests identically to the browser — and it is escape-free by
// construction, since text always goes through textContent.
(function (VA) {
  "use strict";

  // el("td", "num", "4.06") / el("div", "row", [childA, childB])
  VA.el = function (tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content === null || content === undefined) return node;
    if (Array.isArray(content)) {
      content.forEach(function (child) { if (child) node.appendChild(child); });
    } else if (typeof content === "object") {
      node.appendChild(content);
    } else {
      node.textContent = String(content);
    }
    return node;
  };

  // innerHTML = "" rather than a childNodes loop: in a real browser childNodes
  // is a live NodeList with no pop(), and the shim's innerHTML setter clears
  // children too, so this is the one form that behaves the same in both.
  VA.clear = function (node) {
    node.innerHTML = "";
    return node;
  };

  // A labelled pill. `title` becomes the hover tooltip that carries the "why".
  VA.chip = function (className, text, title) {
    var node = VA.el("span", "chip " + (className || ""), text);
    if (title) node.setAttribute("title", title);
    return node;
  };

  // A paragraph of provenance prose: clamped, click to expand, full text on
  // hover. Shared by views/stack.js (a material's note and CINDAS request) and
  // views/detail.js (an export's own note) — kept in one place so a selector for
  // one class never picks up another's behaviour by accident.
  VA.clampedNote = function (baseClass, text) {
    var note = VA.el("div", baseClass, text);
    note.setAttribute("title", "click to expand / collapse");
    note.onclick = function () {
      note.className = note.className.indexOf(baseClass + "--open") === -1
        ? baseClass + " " + baseClass + "--open"
        : baseClass;
    };
    return note;
  };
})(window.ViewerApp = window.ViewerApp || {});
