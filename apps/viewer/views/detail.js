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
        "here — the callout as printed, the citation note in full, which export " +
        "the bytes were read off, and the drawing crop."));
      return root;
    }
    var element = row.element;
    var derived = row.derived;

    var head = VA.el("div", "detail__head");
    head.appendChild(VA.el("h3", null, element.name));
    head.appendChild(VA.el("code", "muted", element.id));
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
    var box = VA.el("div", "el-export el-export--" + p.state +
      (p.loud ? " el-export--loud" : ""));
    box.appendChild(VA.el("div", "el-export__head", p.headline));
    if (p.why) box.appendChild(VA.el("div", "el-export__why", p.why));
    if (p.detail) box.appendChild(VA.el("div", "el-export__detail", p.detail));
    var facts = [];
    if (p.shaText) facts.push(p.shaText);
    if (facts.length) box.appendChild(VA.el("div", "el-export__facts", facts.join(" · ")));
    if (p.state === "established") {
      box.appendChild(runsLine(p, cropsIndex, stackProj, element, config));
    }
    if (p.pdf) box.appendChild(VA.el("div", "el-export__path", p.pdf));
    if (p.note) box.appendChild(VA.clampedNote("el-export__note", p.note));
    return box;
  }

  // The run ids, linked where this page can honestly address the run — see
  // VA.exportRunLinks for why that is only ever the one the element's own crop
  // resolved through.
  function runsLine(p, cropsIndex, stackProj, element, config) {
    var line = VA.el("div", "el-export__runs");
    var links = VA.exportRunLinks(config,
      (element.source_ref || {}).export,
      VA.cropFor(cropsIndex, stackProj.id, element.id));
    if (!links.length) {
      line.appendChild(VA.el("span", "muted",
        "no drawing-checker run has consumed this export — the value was read " +
        "straight off the file, so the sha256 is the whole of its identity"));
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
        span.setAttribute("title", "no link: an export carries a run ID and " +
          "drawing-checker addresses a run by its DIRECTORY name, which is the id " +
          "plus the drawing. This page will not guess one.");
        line.appendChild(span);
      }
    });
    return line;
  }

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
        entry.reason || unresolvedHeadline(entry.status)));
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
        "crops.json points at " + entry.png + ", which is not on disk — the crop " +
        "index is stale; re-run the crop script"));
    }
    box.appendChild(VA.el("div", "detail__crop-head",
      entry.pdf_name + " · sheet " + entry.page));
    box.appendChild(VA.el("div", "detail__crop-prov", VA.cropProvenanceLine(entry)));

    var links = VA.el("div", "detail__crop-links");
    var runUrl = VA.runUrl(config, entry);
    if (runUrl) {
      links.appendChild(anchor(runUrl, "open run in drawing-checker",
        "the local web UI — " + (config && config.drawingCheckerWebui) +
        " must be serving"));
    }
    var fileUrl = VA.fileUrl(entry.pdf);
    if (fileUrl) links.appendChild(anchor(fileUrl, "open the PDF"));
    box.appendChild(links);
    box.appendChild(VA.el("div", "detail__crop-path", entry.pdf));
    return box;
  }

  function unresolvedHeadline(status) {
    if (status === "not-built") return "the crop projection has not been built";
    if (status === "no-entry") return "crops.json has no entry for this element";
    return "crop unresolvable";
  }

  function anchor(href, text, title) {
    var node = VA.el("a", "detail__crop-link", text);
    node.setAttribute("href", href);
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener");
    if (title) node.setAttribute("title", title);
    return node;
  }
})(window.ViewerApp = window.ViewerApp || {});
