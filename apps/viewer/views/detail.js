// The right pane: full sourcing detail for the SELECTED ROW. Moved out of the
// elements table (views/stack.js, the compact grid) so the table can stay one
// line per element: this is where the callout as printed, the citation's own
// note (unclamped), the export-provenance block and the crop itself all live
// now, reached by clicking a row rather than by hovering a trigger.
//
// TWO tables feed it since 2026-09-18. The materials table was the same
// composite-cell shape the elements table had retired -- 653px of stacked
// detail in a 260px column -- and the fix was the same fix, which needed a
// place for the detail to go. So this pane takes a row id from EITHER table
// and renders whichever it names: the id spaces do not overlap (an element id
// is a feature, a material id is an alloy), and elements are looked up first
// so a collision could only ever resolve to the older surface.
(function (VA) {
  "use strict";

  VA.renderDetail = function (root, stackProj, selectedRowId, cropsIndex, cropImage, config, images) {
    VA.clear(root);
    root.className = "detail";
    if (!stackProj) {
      root.appendChild(VA.el("p", "muted", "Pick a stack."));
      return root;
    }
    var row = findRow(stackProj, selectedRowId);
    if (!row) {
      var materialRow = findMaterial(stackProj, selectedRowId);
      if (materialRow) return renderMaterial(root, materialRow);
      root.appendChild(VA.el("p", "muted",
        "Select a row in the tables on the left to see its full sourcing " +
        "here — for an element, the callout as printed, the citation note in " +
        "full, which file the value was read from and the drawing crop; for a " +
        "material, where its CTE and its designation each came from."));
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
      chips.appendChild(VA.chip("chip--zero-width", VA.ATTENTION.no_tolerance.text,
        VA.ATTENTION.no_tolerance.title));
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

    root.appendChild(cropSection(stackProj, element, cropsIndex, cropImage, config, images));

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

  function findMaterial(stackProj, materialId) {
    if (!materialId) return null;
    var rows = stackProj.materials || [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].id === materialId) return rows[i];
    }
    return null;
  }

  // --- the MATERIAL pane -----------------------------------------------------
  //
  // Everything views/stack.js's materials row used to stack inside one 260px
  // table cell, at full width and unclamped -- the same trade the element pane
  // made when the elements table went compact. Nothing here is new text: every
  // line below was already on the page, in the cell that made a live row 653px
  // tall (ISSUE_20260917_the_materials_source_column_is_a_750px_tall_composite_
  // cell). What is new is where it is.
  //
  // There is NO crop section and no export block, and that is not an omission:
  // a material entry cites a workbook or a drawing NOTE, never a dimension, so
  // the crop index has no key for it and `source_ref.export` is not a field a
  // material entry has. A pane that rendered an empty "Drawing crop" heading
  // for every material would be saying a crop is missing, which is a different
  // claim from there being none to take.
  function renderMaterial(root, materialRow) {
    var authored = materialRow.material || {};
    var values = VA.valuesProvenance(authored) || {};

    // Its designation, with the id on the hover -- the same rule the element
    // pane and both topology panes follow: an id is a deep-link handle, not a
    // label. The id falls through as the heading only when there is no
    // designation to print, which is the honest fallback rather than a blank.
    var head = VA.el("div", "detail__head");
    var heading = VA.el("h3", null, authored.designation || materialRow.id);
    heading.setAttribute("title", materialRow.id);
    head.appendChild(heading);
    root.appendChild(head);

    var chips = VA.el("div", "detail__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(materialRow.confidence),
      VA.CONFIDENCE_LABEL[materialRow.confidence] || materialRow.confidence,
      "how the CTE VALUE is sourced — the designation is sourced separately"));
    if (materialRow.kind) chips.appendChild(VA.chip("chip--kind", materialRow.kind));
    chips.appendChild(VA.chip(VA.confidenceClass(materialRow.designation_confidence),
      "designation: " + (VA.CONFIDENCE_LABEL[materialRow.designation_confidence] ||
        materialRow.designation_confidence)));
    if (values.loud) {
      chips.appendChild(VA.chip("chip--values-" + values.state,
        VA.VALUES_CHIP_TEXT[values.state] || VA.VALUES_CHIP_FALLBACK,
        values.text));
    }
    root.appendChild(chips);

    // The CTE's own citation, then what KIND of record the number is.
    root.appendChild(VA.el("div", "detail__where",
      VA.citationWhere(authored.values_source)));
    root.appendChild(VA.el("div",
      "mat__values" + (values.loud ? " mat__values--loud" : ""),
      values.text));
    // Rendered whenever it is set, whatever the status says. The reference is
    // the provenance of a NUMBER -- `spec_library:NAS6403U11D` is what a value
    // resolves through -- and the schema does not forbid an inline entry from
    // naming one, so reading it only under one status would be a silent drop
    // one field along. The LABEL is words, not the projection's key
    // (2026-09-18, reader-facing copy) -- and not on a hover either: a `title`
    // is rendered text a reader meets, so moving a schema field name into one
    // would be hiding it from the guard rather than taking it off the page.
    if (values.libraryRef) {
      root.appendChild(VA.el("div", "mat__libref",
        "spec library reference: " + values.libraryRef));
    }
    // `detail__note` / `detail__callout`, the element pane's own classes and
    // not the row's: unclamped (this pane exists to hold the whole of a
    // written argument) and already enrolled as the RECORD's prose, which a
    // material entry's note is exactly as much as an element citation's is.
    if (authored.note) {
      root.appendChild(VA.el("div", "detail__note", authored.note));
    }

    // The DESIGNATION's own citation. Its confidence has a chip above, but a
    // chip says how well sourced the name is while never saying WHERE from --
    // and a designation is what makes the CTE a claim about a specific alloy
    // rather than about a word.
    root.appendChild(VA.el("div", "mat__desig",
      "designation from: " + VA.citationWhere(authored.designation_source)));
    if (authored.designation_source && authored.designation_source.callout) {
      root.appendChild(VA.el("div", "detail__callout",
        authored.designation_source.callout));
    }
    if (authored.designation_source && authored.designation_source.note) {
      root.appendChild(VA.el("div", "detail__note",
        authored.designation_source.note));
    }
    // The outstanding ASK for a real value, when the entry records one. It is
    // the one field on a material entry that describes future work rather than
    // the present record, so it is labelled -- but it is here, because a CTE
    // traced to nothing whose recorded next step is invisible is the same
    // defect one layer down. Unclamped here, unlike in the row it came from:
    // this pane exists to hold the whole of a written argument.
    // The LABEL and the record's words are two nodes, not one string. The
    // label is the page's ("a request is on record"); the request itself is
    // the entry's own prose and is exempt from the banned-string scan on that
    // ground -- concatenating them would put the page's words inside the
    // exemption and quietly widen it.
    if (authored.cindas_request) {
      root.appendChild(VA.el("div", "detail__sublabel",
        "a request for a measured value is on record"));
      root.appendChild(VA.el("div", "detail__note", authored.cindas_request));
    }
    return root;
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

  // What drawing-checker has done with this file, and the one click-through
  // this page can honestly offer.
  //
  // It printed the raw run ids as the link text until 2026-09-16 — four of them
  // on `tan_link_to_pitch_plate:straight_bushing`, e.g. `20260723_163810` — and
  // an id is an internal artifact's address that tells a reader nothing about
  // what they are about to open. The crop popover two inches above had already
  // made exactly this move (views/crop.js, VA.drawingLinkText): name the
  // DRAWING, not the machinery. So the line says how many times and how
  // recently, the link says which drawing, and the ids stay on the hover —
  // where someone with a drawing-checker shell can still read them, and where
  // the reason at most one run is ever linkable is written down.
  VA.exportRunsLine = function (config, exportBlock, cropEntry) {
    var line = VA.el("div", "el-export__runs");
    var links = VA.exportRunLinks(config, exportBlock, cropEntry);
    var summary = VA.el("span", "muted", VA.exportRunsText(exportBlock));
    if (!links.length) {
      line.appendChild(summary);
      return line;
    }
    summary.setAttribute("title", VA.exportRunsTitle(exportBlock));
    line.appendChild(summary);
    // At most one — VA.exportRunLinks only resolves the run the element's own
    // crop came through, and inventing a URL for the rest from an id prefix
    // would be the same class of mistake as a crop of a guessed export.
    var linked = links.filter(function (link) { return link.url; })[0];
    if (linked) {
      line.appendChild(VA.el("span", "muted", " — "));
      var a = VA.el("a", "el-export__runlink",
        VA.drawingLinkText(cropEntry) || "open the drawing in drawing-checker");
      a.setAttribute("href", linked.url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.setAttribute("title", "opens in drawing-checker — " +
        (config && config.drawingCheckerWebui) + " must be serving");
      line.appendChild(a);
    }
    return line;
  };

  // --- the crop, rendered INLINE (deliverable 3) ------------------------------
  //
  // The four states are VA.cropFor's (see viewer.js): only `resolved` has an
  // image to show; the other three say which of the four distinct "no crop"
  // facts applies, the same wording the hover popover used.
  function cropSection(stackProj, element, cropsIndex, cropImage, config, images) {
    var entry = VA.cropFor(cropsIndex, stackProj.id, element.id);
    var box = VA.el("div", "detail__crop detail__crop--" + entry.status);
    box.appendChild(VA.el("h4", null, "Drawing crop"));
    if (entry.status !== "resolved") {
      box.appendChild(VA.el("div", "detail__crop-reason",
        entry.reason || VA.cropUnresolvedHeadline(entry.status)));
      return box;
    }
    // The image, the boxes drawn over it and the parts-list companion all come
    // from the ONE shared builder (VA.cropFigure, views/crop.js) — this pane
    // kept its own copy of the `<img>` until 2026-09-15, and an overlay
    // positioned against a second copy is an overlay that can drift out of
    // frame on one surface only.
    box.appendChild(VA.cropFigure(entry, cropImage, "detail__crop-img"));
    var companion = VA.companionFigure(entry, images);
    if (companion) box.appendChild(companion);
    // The reference, the links and the folded matching provenance are ONE
    // builder now (VA.cropReference, views/crop.js) — this pane, the hover
    // cards, the topology preview pane and the plain popover all showed the
    // same three lines in slightly different words, which is the drift a
    // shared builder exists to stop. It also brought two fixes with it: the
    // "open the PDF" link renders only where this origin can follow it, and
    // the absolute path is gone.
    // The prefix carries its own separator (see VA.cropReference): this pane's
    // classes are `detail__crop-head` / `-links`, one hyphen, not the
    // double-underscore the popover uses.
    //
    // `PANE_CROP` (omitHead): ONE document statement per pane, the rule
    // viewer_hover_deslop_and_banner_purge applied to the hover cards on
    // 2026-09-16 and scoped to cards, leaving this pane with the defect the
    // cards were fixed for. The `detail__where` line six lines up already
    // named the document ("214589-002 · rev A · sheet 1 · SECTION A-A · zone
    // F5"); the picture under it needs no caption repeating it
    // ("214589-002-A.pdf · sheet 1").
    //
    // The provenance fold is KEPT, unlike a card's. A card suppresses both
    // because it carries one fold of its own and the crop's would be a second;
    // a pane has no competing fold, and the fold is where the crop's own
    // matching rule -- and with the head gone, the export FILENAME, which is a
    // different claim from the citation's document -- still lands.
    VA.cropReference(box, entry, config, "detail__crop-", VA.PANE_CROP);
    return box;
  }
})(window.ViewerApp = window.ViewerApp || {});
