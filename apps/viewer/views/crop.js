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

  // The resolved crop's body, shared by this popover, the hover cards and both
  // preview panes: the image (height reserved from the crop index's own pixel
  // size, so the box is measured at its final size before the PNG decodes),
  // then THE REFERENCE and nothing else — "NAS6403-NAS6420 Rev 4.pdf · sheet
  // 3" — with the click-throughs beside it and the matching provenance folded
  // away behind VA.cropReference below.
  //
  // What left this block on 2026-09-15 (Jeff's review), and why:
  //
  //   * the always-rendered absolute path. It was here as the fallback for a
  //     link that could not navigate — "never rendered when the link works",
  //     and the link now renders only where it DOES work, so the fallback has
  //     nothing left to fall back from. A workstation path is also the plainest
  //     kind of internal detail the standing web-copy rule bans.
  //   * "re-run the crop script" on a missing PNG. An instruction to type a
  //     command, in a web UI, which that rule bans outright.
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
      box.appendChild(VA.el("p", "croppop__reason", VA.CROP_IMAGE_MISSING_TEXT));
    }
    VA.cropReference(box, entry, config);
    return box;
  };

  // The reference a reader came for, plus the two click-throughs, plus the
  // matching provenance behind one small disclosure. ONE builder for all four
  // surfaces that show a resolved crop (this popover, the hover cards, the
  // topology preview pane, the stack preview pane) — they printed the same
  // three lines in three slightly different orders with three class prefixes
  // before, which is exactly the drift a shared builder exists to stop.
  //
  // `classPrefix` lets each surface keep its own CSS prefix, separator
  // included ("croppop__", "detail__crop-"); the structure does not vary. The
  // disclosure is the one exception and carries ONE shared class on every
  // surface -- it is new here, so there is no per-surface CSS to honour and no
  // reason to write the same rule four times.
  VA.cropReference = function (box, entry, config, classPrefix) {
    var base = classPrefix || "croppop__";
    box.appendChild(VA.el("div", base + "head",
      entry.pdf_name + " · sheet " + entry.page));

    var links = VA.el("div", base + "links");
    var runUrl = VA.runUrl(config, entry);
    if (runUrl) {
      links.appendChild(anchor(runUrl, "open run in drawing-checker",
        "the local web UI — " + (config && config.drawingCheckerWebui) +
        " must be serving"));
    }
    // Only where this origin can actually follow it (VA.localFileUrl): on a
    // served page the click did nothing at all, which is what Jeff reported.
    var fileUrl = VA.localFileUrl(entry.pdf);
    if (fileUrl) links.appendChild(anchor(fileUrl, "open the PDF"));
    if (links.childNodes.length) box.appendChild(links);

    // Folded away, not deleted: which rule resolved the file and where on the
    // sheet the crop was taken is a real claim about how much to trust the
    // picture (VA.cropProvenanceLine) — it is simply not what a reader opening
    // a crop is asking, and in the open it read as jargon restating the line
    // above.
    var provenance = VA.cropProvenanceLine(entry);
    if (provenance) {
      var fold = VA.disclosure(VA.CROP_PROVENANCE_SUMMARY, "provfold");
      fold.body.appendChild(VA.el("div", null, provenance));
      box.appendChild(fold.box);
    }
    return box;
  };

  // The two strings above, module-level so the four surfaces and the tests
  // that pin them cannot drift (repo rule: never an inline literal).
  VA.CROP_PROVENANCE_SUMMARY = "How this crop was matched";
  VA.CROP_IMAGE_MISSING_TEXT =
    "This crop's image is not on disk — the crop index is out of date.";

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
      // The rebuild COMMAND used to be printed here, as a <code> block for the
      // reader to copy into a terminal, whenever the index was missing or
      // stale. Removed 2026-09-15: "never render terminal commands in a web UI
      // for the user to copy/paste" is a standing rule, and this popover is
      // the least appropriate place of all for one — it opens on hover, over
      // whatever the reader was looking at. Nothing replaces it here: the
      // banner is where a stale projection is stated once for the whole page,
      // and where a served origin offers the rebuild as a BUTTON.
      return root;
    }

    root.appendChild(VA.cropBlock(entry, image, config));
    return root;
  };

  // Shared with views/cards.js and views/detail.js: an unresolved state's
  // one-line headline. The four states are VA.cropFor's.
  //
  // Reworded 2026-09-15 with the rest of this surface: it said "the crop
  // projection has not been built" and "the crop index is stale", and a
  // reader of this page has no way to know what a projection or an index is
  // here. Each still says which of the distinct "no crop" facts applies --
  // that is the whole reason there are three of them rather than one.
  VA.cropUnresolvedHeadline = function (status) {
    if (status === "not-built") return "No crop — none have been prepared yet";
    if (status === "no-entry") return "No crop — the prepared crops are out of date";
    return "No crop — this citation could not be pinned to a page";
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
