// The stack list (left rail). Each row carries the sourcing scoreboard, because
// which stack to open is itself a provenance decision.
(function (VA) {
  "use strict";

  VA.renderList = function (root, results, selectedId, onSelect) {
    VA.clear(root);
    root.className = "stacklist";
    var stacks = (results && results.stacks) || [];
    if (!stacks.length) {
      root.appendChild(VA.el("p", "muted", "No stacks in the projection."));
      return root;
    }
    stacks.forEach(function (stackProj) {
      root.appendChild(row(stackProj, stackProj.id === selectedId, onSelect));
    });
    return root;
  };

  function row(stackProj, selected, onSelect) {
    var node = VA.el("button", "stacklist__row" + (selected ? " stacklist__row--on" : ""));
    node.appendChild(VA.el("div", "stacklist__id", stackProj.id));
    node.appendChild(VA.el("div", "stacklist__title", stackProj.title));
    var chips = VA.el("div", "stacklist__chips");
    VA.summaryChips(stackProj).forEach(function (chip) {
      chips.appendChild(VA.chip(
        chip.kind === "confidence" ? VA.confidenceClass(chip.confidence) : "chip--" + chip.kind,
        chip.text, chip.title));
    });
    node.appendChild(chips);
    node.onclick = function () { onSelect(stackProj.id); };
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
