// The hover popover: a pre-rendered drawing crop, where it came from, and the
// click-throughs to the full reference.
//
// The unresolved states get as much care as the resolved one. "No crop" is not
// one fact — it is four (see VA.cropFor), and a reviewer needs to know which:
// "the crop script hasn't run" is a chore, "the citation names no export" is a
// finding about the stack.
//
// Since viewer_hover_cards_and_deep_links the crop's own body — the image, its
// placement provenance and its click-throughs — is factored out as
// VA.cropBlock, because the hover reference cards (views/cards.js) show the
// same crop inside a richer frame and a second copy of this markup is a second
// place the provenance line could drift from the first.
(function (VA) {
  "use strict";

  // The resolved crop's body, shared by this popover and the hover cards:
  // the image (height reserved from crops.json's own pixel size, so the box
  // is measured at its final size before the PNG decodes), the sheet, HOW the
  // crop was placed, and the click-throughs — the drawing-checker run page
  // where a run is behind the citation, the PDF as a file:// link, and always
  // the plain path (a file:// link only navigates from a file:// page, and
  // copy-paste is the fallback that always works).
  VA.cropBlock = function (entry, image, config) {
    var box = VA.el("div", "cropblock");
    if (image && image.url) {
      var img = VA.el("img", "croppop__img");
      img.setAttribute("src", image.url);
      img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
      if (entry.width && entry.height) {
        img.style.aspectRatio = entry.width + " / " + entry.height;
      }
      box.appendChild(img);
    } else {
      box.appendChild(VA.el("p", "croppop__reason",
        "crops.json points at " + entry.png + ", which is not on disk — the crop " +
        "index is stale; re-run the crop script"));
    }

    box.appendChild(VA.el("div", "croppop__head",
      entry.pdf_name + " · sheet " + entry.page));
    box.appendChild(VA.el("div", "croppop__prov", VA.cropProvenanceLine(entry)));

    var links = VA.el("div", "croppop__links");
    var runUrl = VA.runUrl(config, entry);
    if (runUrl) {
      links.appendChild(anchor(runUrl, "open run in drawing-checker",
        "the local web UI — " + (config && config.drawingCheckerWebui) +
        " must be serving"));
    }
    var fileUrl = VA.fileUrl(entry.pdf);
    if (fileUrl) links.appendChild(anchor(fileUrl, "open the PDF"));
    box.appendChild(links);
    box.appendChild(VA.el("div", "croppop__path", entry.pdf));
    return box;
  };

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
      root.appendChild(VA.el("div", "croppop__head",
        VA.cropUnresolvedHeadline(entry.status)));
      root.appendChild(VA.el("p", "croppop__reason", entry.reason || ""));
      if (entry.status === "not-built" || entry.status === "no-entry") {
        root.appendChild(VA.el("code", "croppop__cmd", VA.CONFIG.rebuild.crops));
      }
      return root;
    }

    root.appendChild(VA.cropBlock(entry, image, config));
    return root;
  };

  // Shared with views/cards.js: an unresolved state's one-line headline. The
  // four states are VA.cropFor's, and the wording is the popover's original.
  VA.cropUnresolvedHeadline = function (status) {
    if (status === "not-built") return "No crop — the crop projection has not been built";
    if (status === "no-entry") return "No crop — the crop index is stale";
    return "Crop unresolvable";
  };

  function anchor(href, text, title) {
    var node = VA.el("a", "croppop__link", text);
    node.setAttribute("href", href);
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener");
    if (title) node.setAttribute("title", title);
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
