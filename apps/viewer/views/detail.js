// The right pane: full sourcing detail for the SELECTED element. Moved out of
// the elements table (views/stack.js, the compact grid) so the table can stay
// one line per element: this is where the callout as printed, the citation's
// own note (unclamped), the export-provenance block and the crop itself all
// live now, reached by clicking a row rather than by hovering a trigger.
(function (VA) {
  "use strict";

  VA.renderDetail = function (root, stackProj, selectedElementId, cropsIndex, cropImage, config) {
    VA.clear(root);
    root.className = "detail";
    if (!stackProj) {
      root.appendChild(VA.el("p", "muted", "Pick a stack."));
      return root;
    }
    var row = findRow(stackProj, selectedElementId);
    if (!row) {
      root.appendChild(VA.el("p", "muted",
        "Select an element in the table on the left to see its full sourcing " +
        "here — the callout as printed, the citation note in full, which file " +
        "the value was read from, and the drawing crop."));
      return root;
    }
    var element = row.element;
    var derived = row.derived;

    // The element's NAME, with its id on the heading's hover title rather
    // than printed beside it (2026-09-15, the same rule the hover cards and
    // the topology preview pane now follow): an id is a deep-link handle, not
    // a label.
    var head = VA.el("div", "detail__head");
    var heading = VA.el("h3", null, element.name);
    heading.setAttribute("title", element.id);
    head.appendChild(heading);
    root.appendChild(head);

    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(derived.confidence),
      VA.CONFIDENCE_LABEL[derived.confidence] || derived.confidence));
    if (derived.kind) chips.appendChild(VA.chip("chip--kind", derived.kind));
    if (derived.material) {
      chips.appendChild(VA.chip("chip--material", derived.material,
        "the material this element's feature is cut in — see Materials for its " +
        "CTE and where the CTE came from"));
    }
    if (derived.zero_width) {
      chips.appendChild(VA.chip("chip--zero-width", "zero-width band",
        "min == max: every interval this feeds is a LOWER bound on the real spread."));
    }
    root.appendChild(chips);

    root.appendChild(VA.el("div", "detail__where", VA.citationWhere(element.source_ref)));

    if (element.source_ref && element.source_ref.callout) {
      root.appendChild(VA.el("div", "detail__callout", element.source_ref.callout));
    }
    // Unclamped, unlike the compact row's old preview: this pane exists to hold
    // the full written argument behind a citation, not a trimmed copy of it.
    if (element.source_ref && element.source_ref.note) {
      root.appendChild(VA.el("div", "detail__note", element.source_ref.note));
    }

    var exportBlock = exportProvenanceBlock(stackProj, row, cropsIndex, config);
    if (exportBlock) root.appendChild(exportBlock);

    root.appendChild(cropSection(stackProj, element, cropsIndex, cropImage, config));

    return root;
  };

  function findRow(stackProj, elementId) {
    if (!elementId) return null;
    var rows = VA.elementRows(stackProj);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].element.id === elementId) return rows[i];
    }
    return null;
  }

  // --- source_ref.export, moved here verbatim from views/stack.js: the row is
  // compact now and never renders this, so the panel is the only place it
  // appears. See VA.exportProvenance (viewer.js) for the states themselves. ---
  function exportProvenanceBlock(stackProj, row, cropsIndex, config) {
    var element = row.element;
    var p = VA.exportProvenance(element.source_ref, row.derived.identity_rule);
    if (!p) return null;
    return VA.exportBlockNode(p, {
      config: config,
      exportBlock: (element.source_ref || {}).export,
      cropEntry: VA.cropFor(cropsIndex, stackProj.id, element.id),
    });
  }

  // The el-export box for one VA.exportProvenance view-model. ONE builder for
  // the three surfaces that render it — this pane, the topology edge pane
  // (views/topology.js) and the citation hover card (views/cards.js) — so an
  // export state cannot read differently on different surfaces. `opts` carries
  // the runs-line inputs; a caller with no crop entry on hand (the topology
  // pane's original shape) simply omits them and gets no runs line.
  VA.exportBlockNode = function (p, opts) {
    opts = opts || {};
    var box = VA.el("div", "el-export el-export--" + p.state +
      (p.loud ? " el-export--loud" : ""));
    box.appendChild(VA.el("div", "el-export__head", p.headline));
    if (p.why) box.appendChild(VA.el("div", "el-export__why", p.why));
    if (p.detail) box.appendChild(VA.el("div", "el-export__detail", p.detail));
    if (p.shaText) box.appendChild(VA.el("div", "el-export__facts", p.shaText));
    if (p.state === "established" && opts.config !== undefined) {
      box.appendChild(VA.exportRunsLine(opts.config, opts.exportBlock, opts.cropEntry));
    }
    // The absolute workstation path used to print here. Removed 2026-09-15
    // (Jeff): "full workstation file paths — never rendered when the link
    // works". The headline above already names the file a reader recognises.
    if (p.note) box.appendChild(VA.clampedNote("el-export__note", p.note));
    return box;
  };

  // The run ids, linked where this page can honestly address the run — see
  // VA.exportRunLinks for why that is only ever the one the element's own crop
  // resolved through.
  VA.exportRunsLine = function (config, exportBlock, cropEntry) {
    var line = VA.el("div", "el-export__runs");
    var links = VA.exportRunLinks(config, exportBlock, cropEntry);
    if (!links.length) {
      line.appendChild(VA.el("span", "muted",
        "no drawing-checker run has used this file — the value was read " +
        "straight off it, so its checksum is the whole of its identity"));
      return line;
    }
    line.appendChild(VA.el("span", "muted", "drawing-checker runs: "));
    links.forEach(function (link, index) {
      if (index) line.appendChild(VA.el("span", "muted", ", "));
      if (link.url) {
        var a = VA.el("a", "el-export__runlink", link.run_id);
        a.setAttribute("href", link.url);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        a.setAttribute("title", "this run's page in drawing-checker's local web UI — " +
          (config && config.drawingCheckerWebui) + " must be serving");
        line.appendChild(a);
      } else {
        var span = VA.el("span", "el-export__runid", link.run_id);
        span.setAttribute("title", "no link: drawing-checker addresses a run " +
          "by a longer name than the id recorded here, and this page will not " +
          "guess the rest of it.");
        line.appendChild(span);
      }
    });
    return line;
  };

  // --- the crop, rendered INLINE (deliverable 3) ------------------------------
  //
  // The four states are VA.cropFor's (see viewer.js): only `resolved` has an
  // image to show; the other three say which of the four distinct "no crop"
  // facts applies, the same wording the hover popover used.
  function cropSection(stackProj, element, cropsIndex, cropImage, config) {
    var entry = VA.cropFor(cropsIndex, stackProj.id, element.id);
    var box = VA.el("div", "detail__crop detail__crop--" + entry.status);
    box.appendChild(VA.el("h4", null, "Drawing crop"));
    if (entry.status !== "resolved") {
      box.appendChild(VA.el("div", "detail__crop-reason",
        entry.reason || VA.cropUnresolvedHeadline(entry.status)));
      return box;
    }
    if (cropImage && cropImage.url) {
      var img = VA.el("img", "detail__crop-img");
      img.setAttribute("src", cropImage.url);
      img.setAttribute("alt", "crop of " + entry.pdf_name + " sheet " + entry.page);
      // Reserve the height from crops.json's own pixel size, same reason the
      // hover popover does: measuring the box before the PNG decodes.
      if (entry.width && entry.height) {
        img.style.aspectRatio = entry.width + " / " + entry.height;
      }
      box.appendChild(img);
    } else {
      box.appendChild(VA.el("div", "detail__crop-reason",
        VA.CROP_IMAGE_MISSING_TEXT));
    }
    // The reference, the links and the folded matching provenance are ONE
    // builder now (VA.cropReference, views/crop.js) — this pane, the hover
    // cards, the topology preview pane and the plain popover all showed the
    // same three lines in slightly different words, which is the drift a
    // shared builder exists to stop. It also brought two fixes with it: the
    // "open the PDF" link renders only where this origin can follow it, and
    // the absolute path is gone.
    VA.cropReference(box, entry, config, "detail__crop");
    return box;
  }
})(window.ViewerApp = window.ViewerApp || {});
