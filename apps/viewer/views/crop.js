// The hover popover: a pre-rendered drawing crop, where it came from, and the
// click-throughs to the full reference.
//
// The unresolved states get as much care as the resolved one. "No crop" is not
// one fact — it is four (see VA.cropFor), and a reviewer needs to know which:
// "the crop script hasn't run" is a chore, "the citation names no export" is a
// finding about the stack.
(function (VA) {
  "use strict";

  VA.renderCrop = function (root, entry, image, config, onClose) {
    VA.clear(root);
    root.className = "croppop croppop--" + entry.status;

    if (onClose) {
      var close = VA.el("button", "croppop__close", "✕");
      close.setAttribute("title", "close (Esc)");
      close.onclick = onClose;
      root.appendChild(close);
    }

    if (entry.status !== "resolved") {
      root.appendChild(VA.el("div", "croppop__head", unresolvedHeadline(entry.status)));
      root.appendChild(VA.el("p", "croppop__reason", entry.reason || ""));
      if (entry.status === "not-built" || entry.status === "no-entry") {
        root.appendChild(VA.el("code", "croppop__cmd", VA.CONFIG.rebuild.crops));
      }
      return root;
    }

    if (image && image.url) {
      var img = VA.el("img", "croppop__img");
      img.setAttribute("src", image.url);
      img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
      // Reserve the right height BEFORE the PNG decodes, from the pixel size
      // crops.json recorded. Without it the popover is measured short, gets
      // placed above the trigger on that measurement, then grows down over the
      // trigger — which is how a hover ends up covering the thing you hovered.
      if (entry.width && entry.height) {
        img.style.aspectRatio = entry.width + " / " + entry.height;
      }
      root.appendChild(img);
    } else {
      root.appendChild(VA.el("p", "croppop__reason",
        "crops.json points at " + entry.png + ", which is not on disk — the crop " +
        "index is stale; re-run the crop script"));
    }

    root.appendChild(VA.el("div", "croppop__head",
      entry.pdf_name + " · sheet " + entry.page));
    root.appendChild(VA.el("div", "croppop__prov", VA.cropProvenanceLine(entry)));

    var links = VA.el("div", "croppop__links");
    var runUrl = VA.runUrl(config, entry);
    if (runUrl) {
      links.appendChild(anchor(runUrl, "open run in drawing-checker",
        "the local web UI — " + (config && config.drawingCheckerWebui) +
        " must be serving"));
    }
    var fileUrl = VA.fileUrl(entry.pdf);
    if (fileUrl) links.appendChild(anchor(fileUrl, "open the PDF"));
    root.appendChild(links);
    // Always the plain path too: a file:// link only navigates from a file://
    // page, and copy-paste is the fallback that always works.
    root.appendChild(VA.el("div", "croppop__path", entry.pdf));
    return root;
  };

  function unresolvedHeadline(status) {
    if (status === "not-built") return "No crop — the crop projection has not been built";
    if (status === "no-entry") return "No crop — the crop index is stale";
    return "Crop unresolvable";
  }

  function anchor(href, text, title) {
    var node = VA.el("a", "croppop__link", text);
    node.setAttribute("href", href);
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener");
    if (title) node.setAttribute("title", title);
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
