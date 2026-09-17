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

  // The one class every crop image on every surface carries. The four
  // surfaces keep their own class for the surrounding blocks (see
  // VA.cropReference's `classPrefix`), but the picture itself is one element
  // with one rule, because the highlight overlay is positioned against it.
  var IMG_CLASS = "croppop__img";

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
  //
  // `opts` is the hover card's (views/cards.js, 2026-09-16) and passes
  // straight through to VA.cropReference: a card states its document ONCE, in
  // its own where-line, and folds its sourcing narrative into ONE disclosure —
  // so inside a card this block renders neither the head that would restate
  // the document a third time nor a second fold of its own.
  VA.cropBlock = function (entry, image, config, images, opts) {
    var box = VA.el("div", "cropblock");
    box.appendChild(VA.cropFigure(entry, image, IMG_CLASS));
    var companion = VA.companionFigure(entry, images);
    if (companion) box.appendChild(companion);
    VA.cropReference(box, entry, config, null, opts);
    return box;
  };

  // The image and the boxes drawn on it — ONE builder for every surface that
  // shows a crop, for the same reason VA.cropReference is one: the popover, the
  // hover cards and both preview panes each had their own copy of the `<img>`
  // three lines long, and the overlay has to sit in exactly the same coordinate
  // frame as the picture on all four or it points at the wrong thing.
  //
  // The overlay is DOM, not pixels burnt into the PNG. Three reasons, and the
  // first is the one that decided it: a box drawn in the image is drawn at one
  // size forever, while these images are laid out at four different widths;
  // `highlights[].frac` is a fraction of the crop, so a positioned box is right
  // at every one of them. Second, the verified/declared distinction is then a
  // CSS rule rather than two render paths in the crop builder. Third, it is
  // structurally what drawing-checker's own run viewer does — geometry plus a
  // switchable treatment over the page — so the two surfaces stay recognisable
  // to a reader moving between them.
  // `opts.omitLaunch` is the lightbox's own (views/lightbox.js): that surface
  // renders this same builder at full size, so a button there offering to open
  // it again is a control that does nothing. Nobody else passes anything.
  VA.cropFigure = function (entry, image, className, opts) {
    var frame = VA.el("div", "cropfig");
    if (!(image && image.url)) {
      frame.appendChild(VA.el("p", "croppop__reason", VA.CROP_IMAGE_MISSING_TEXT));
      return frame;
    }
    var img = VA.el("img", className || IMG_CLASS);
    img.setAttribute("src", image.url);
    img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
    // Height reserved from the crop index's own pixel size, so the box is
    // measured at its final size before the PNG decodes — and so the overlay,
    // which is positioned against this element, never lands on a zero-height
    // box. `--crop-ratio` is the same fact as a plain number, for the one CSS
    // rule that needs it: a surface wanting to cap a crop's HEIGHT caps its
    // width instead, because `object-fit: contain` insets the picture inside
    // its element and a percentage overlay would then point at the letterbox.
    if (entry.width && entry.height) {
      img.style.aspectRatio = entry.width + " / " + entry.height;
      frame.style.setProperty("--crop-ratio",
        String(Math.round((entry.width / entry.height) * 10000) / 10000));
    }
    frame.appendChild(img);
    VA.cropHighlights(entry).forEach(function (highlight) {
      frame.appendChild(highlightBox(highlight));
    });
    if (!(opts && opts.omitLaunch)) frame.appendChild(launchButton(entry, image));
    return frame;
  };

  // The one launch affordance for every crop on the page
  // (crop_lightbox_zoom_viewer, 2026-09-16). Jeff: "thumbnail is too small to
  // be legible… Maybe a button in the thumbnail that lets you launch it into a
  // separate, full size viewer … that allows you to zoom/pan?"
  //
  // It is HERE, in the shared builder, rather than on each surface, for the
  // same reason the `<img>` and the overlay are: the plain popover, the hover
  // cards, both preview panes and a balloon crop's parts-list companion are
  // all this function, so one button covers five surfaces and cannot be
  // missing from a sixth. It rides the picture it opens, so a card showing two
  // crops offers two launchers and each opens its own.
  //
  // A real <button>, quiet until the figure is hovered or the button itself is
  // focused (style.css): a crop is a picture first, and the reader who wants
  // it bigger is the one already looking at it. Keyboard reach is the focus
  // half of that rule and is not a nicety -- an affordance only a pointer can
  // find is an affordance half the page cannot use.
  function launchButton(entry, image) {
    var button = VA.el("button", "cropfig__launch", VA.CROP_LAUNCH_TEXT);
    button.setAttribute("title", VA.CROP_LAUNCH_TITLE);
    button.setAttribute("aria-label", VA.CROP_LAUNCH_TITLE);
    button.onclick = function (event) {
      if (event && event.preventDefault) event.preventDefault();
      // Absent on a page that has no lightbox dialog -- then this is a no-op
      // rather than a throw. See VA.openCropLightbox's own header.
      if (VA.openCropLightbox) VA.openCropLightbox(entry, image);
    };
    return button;
  }

  // The cited item's parts-list row, beside the crop that shows its balloon. A
  // balloon crop shows a number in a circle; this is the line that says the
  // number is a bushing, and which one.
  VA.companionFigure = function (entry, images) {
    var companion = entry && entry.companion;
    if (!companion || !companion.png) return null;
    var image = images ? images[companion.png] : null;
    var box = VA.el("div", "cropcompanion");
    box.appendChild(VA.cropFigure(
      { pdf_name: entry.pdf_name, page: companion.page,
        width: companion.width, height: companion.height,
        highlights: companion.highlights },
      image, IMG_CLASS));
    box.appendChild(VA.el("div", "cropcompanion__head", companion.label));
    return box;
  };

  function highlightBox(highlight) {
    var kind = VA.CROP_HIGHLIGHT_KINDS[highlight.kind];
    var node = VA.el("div", "crophl crophl--" +
      (kind ? highlight.kind : "unlabelled") +
      (kind && kind.solid ? " crophl--solid" : " crophl--dashed"));
    // width/height are the SPAN, not the far edge. Rounded, because
    // `(0.215 - 0.2) * 100` is `1.4999999999999987` in binary floating point
    // and a style attribute full of that is noise in every screenshot and
    // every DOM diff -- four decimals of a percentage is a sub-pixel at any
    // size these images are laid out at.
    var frac = highlight.frac;
    node.style.left = pct(frac[0]);
    node.style.top = pct(frac[1]);
    node.style.width = pct(frac[2] - frac[0]);
    node.style.height = pct(frac[3] - frac[1]);
    node.setAttribute("title", kind
      ? kind.text(highlight.label)
      : VA.unlabelledHighlightText(highlight.kind));
    return node;
  }

  function pct(fraction) {
    return (Math.round(fraction * 1000000) / 10000) + "%";
  }

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
  //
  // `opts.omitHead` / `opts.omitProvenance` are the hover card's, and both are
  // the same complaint (Jeff, 2026-09-16): a card that already names its
  // document in its where-line printed it again as this head, and a third time
  // inside the fold below — "stated, then restated". A card suppresses both
  // and carries the matching provenance in its own single "Data source"
  // disclosure instead. The plain popover and the two preview panes pass
  // nothing and are unchanged: the popover has no where-line of its own, so
  // this head IS its one document statement.
  VA.cropReference = function (box, entry, config, classPrefix, opts) {
    var base = classPrefix || "croppop__";
    opts = opts || {};
    if (!opts.omitHead) {
      box.appendChild(VA.el("div", base + "head",
        entry.pdf_name + " · sheet " + entry.page));
    }

    var links = VA.el("div", base + "links");
    var runUrl = VA.runUrl(config, entry);
    if (runUrl) {
      // The link SAYS the drawing, not the machinery: "215197 rev A.1". It said
      // "open run in drawing-checker" until 2026-09-15, which named an internal
      // artifact ("run") in user-facing copy and told a reader nothing about
      // which drawing they were about to open. VA.drawingLinkText returns null
      // when the entry does not carry both facts, and only then does the old
      // wording stand in.
      links.appendChild(anchor(runUrl,
        VA.drawingLinkText(entry) || "open the drawing in drawing-checker",
        "opens in drawing-checker — " + (config && config.drawingCheckerWebui) +
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
    var provenance = opts.omitProvenance ? null : VA.cropProvenanceLine(entry);
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
  // The launch affordance's glyph and the only words it ever says. A glyph
  // plus a title, the same shape `.croppop__close` uses -- the picture is
  // what the reader is looking at, and a labelled button across it would be
  // the loudest thing in a hover card.
  VA.CROP_LAUNCH_TEXT = "⤢";
  VA.CROP_LAUNCH_TITLE = "open at full size — zoom and pan";

  VA.renderCrop = function (root, entry, image, config, onClose, images) {
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

    root.appendChild(VA.cropBlock(entry, image, config, images));
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
