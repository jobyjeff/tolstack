// The stack view: elements, paths, checks, gaps, notes.
//
// Every number below is printed straight out of the projection. The view never
// adds, subtracts or compares a tolerance — see viewer.js for why.
//
// Colour carries provenance, not decoration: a row's tint is its element's
// `confidence`, a zero-width band gets a dashed outline and a chip, and a
// budget-scope check gets a striped header. Jeff reviews sourcing as much as
// arithmetic, so an untraced value has to be impossible to miss.
(function (VA) {
  "use strict";

  VA.renderStack = function (root, stackProj, cropsIndex, handlers) {
    VA.clear(root);
    root.className = "stackview";
    if (!stackProj) {
      root.appendChild(VA.el("p", "muted", "Pick a stack on the left."));
      return root;
    }
    handlers = handlers || {};
    root.appendChild(header(stackProj));
    root.appendChild(jointBlock(stackProj.stack.joint));
    root.appendChild(elementsSection(stackProj, cropsIndex, handlers));
    // Only archetypes with material properties have one; a grip stack shows no
    // empty Materials heading.
    var materials = materialsSection(stackProj);
    if (materials) root.appendChild(materials);
    root.appendChild(pathsSection(stackProj));
    root.appendChild(checksSection(stackProj));
    root.appendChild(gapsSection(stackProj));
    root.appendChild(notesSection(stackProj));
    return root;
  };

  // --- header --------------------------------------------------------------

  function header(stackProj) {
    var node = VA.el("header", "sv__header");
    node.appendChild(VA.el("h2", "sv__title", stackProj.title));
    var meta = VA.el("div", "sv__meta");
    meta.appendChild(VA.el("code", null, stackProj.id));
    meta.appendChild(VA.el("span", "muted", "units " + stackProj.units));
    meta.appendChild(VA.el("span", "muted", stackProj.source_file));
    node.appendChild(meta);
    var chips = VA.el("div", "sv__chips");
    VA.summaryChips(stackProj).forEach(function (chip) {
      chips.appendChild(VA.chip(
        chip.kind === "confidence" ? VA.confidenceClass(chip.confidence) : "chip--" + chip.kind,
        chip.text, chip.title));
    });
    node.appendChild(chips);
    return node;
  }

  // --- the joint -----------------------------------------------------------

  function jointBlock(joint) {
    var box = VA.el("details", "sv__joint");
    box.appendChild(VA.el("summary", null, "The joint"));
    if (!joint || !Object.keys(joint).length) {
      box.appendChild(VA.el("p", "muted", "no joint block"));
      return box;
    }
    var dl = VA.el("dl", "kv");
    Object.keys(joint).forEach(function (key) {
      var value = joint[key];
      dl.appendChild(VA.el("dt", null, key));
      if (Array.isArray(value)) {
        dl.appendChild(VA.el("dd", null, arrayValue(value)));
      } else {
        dl.appendChild(VA.el("dd", null, String(value)));
      }
    });
    box.appendChild(dl);
    return box;
  }

  function arrayValue(items) {
    var list = VA.el("ul", "plainlist");
    items.forEach(function (item) {
      list.appendChild(VA.el("li", null,
        typeof item === "object" && item !== null ? JSON.stringify(item) : String(item)));
    });
    return list;
  }

  // --- elements ------------------------------------------------------------

  var ELEMENT_COLUMNS = ["#", "element", "role", "nominal", "min", "max", "±",
    "LMC", "MMC", "hardware", "sourcing"];

  function elementsSection(stackProj, cropsIndex, handlers) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Elements"));
    section.appendChild(VA.el("p", "muted",
      "Values as transcribed. Order is the physical order through the joint; " +
      "only the path term lists below are load-bearing for the arithmetic."));

    var table = VA.el("table", "eltable");
    var head = VA.el("tr");
    ELEMENT_COLUMNS.forEach(function (name) { head.appendChild(VA.el("th", null, name)); });
    table.appendChild(VA.el("thead", null, head));

    var body = VA.el("tbody");
    VA.elementRows(stackProj).forEach(function (row, index) {
      body.appendChild(elementRow(stackProj, row, index, cropsIndex, handlers));
      if (row.element.note) {
        body.appendChild(noteRow("el-note", row.element.note));
      }
      // Hardware gaps fold into one row. They repeat verbatim across every
      // element sharing a hardware_ref (three, for the NAS6403 bolt), and an
      // elements table that is 80% duplicated prose is a table nobody reads.
      // Nothing is hidden: the same gaps are listed in full in Gaps below.
      var gaps = row.derived.hardware_gaps || [];
      if (gaps.length) {
        body.appendChild(gapsRow(row.element.hardware_ref, gaps));
      }
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function elementRow(stackProj, row, index, cropsIndex, handlers) {
    var element = row.element;
    var derived = row.derived;
    var classes = ["el-row", VA.confidenceClass(derived.confidence)];
    if (derived.zero_width) classes.push("el-row--zero-width");
    var tr = VA.el("tr", classes.join(" "));

    tr.appendChild(VA.el("td", "num", String(index + 1)));
    var name = VA.el("td", "el-row__name");
    name.appendChild(VA.el("div", null, element.name));
    name.appendChild(VA.el("code", "muted", element.id));
    tr.appendChild(name);
    tr.appendChild(VA.el("td", null, element.role));

    tr.appendChild(VA.el("td", "num", VA.fmt(element.nominal)));
    var min = VA.el("td", "num", VA.fmt(element.min));
    var max = VA.el("td", "num", VA.fmt(element.max));
    if (derived.zero_width) {
      min.className += " num--zero-width";
      max.className += " num--zero-width";
      min.setAttribute("title", "zero-width band: min == max, no document gives a tolerance");
      max.setAttribute("title", "zero-width band: min == max, no document gives a tolerance");
    }
    tr.appendChild(min);
    tr.appendChild(max);
    tr.appendChild(VA.el("td", "num", VA.fmtPlusMinus(element.plus_minus)));
    tr.appendChild(VA.el("td", "num", VA.fmt(element.lmc)));
    tr.appendChild(VA.el("td", "num", VA.fmt(element.mmc)));
    tr.appendChild(VA.el("td", null, element.hardware_ref || "—"));
    tr.appendChild(sourcingCell(stackProj, row, cropsIndex, handlers));
    return tr;
  }

  function sourcingCell(stackProj, row, cropsIndex, handlers) {
    var element = row.element;
    var derived = row.derived;
    var cell = VA.el("td", "el-row__source");
    var chips = VA.el("div", "el-row__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(derived.confidence),
      VA.CONFIDENCE_LABEL[derived.confidence] || derived.confidence));
    if (derived.kind) chips.appendChild(VA.chip("chip--kind", derived.kind));
    // The material this feature is cut in, for an archetype that has one. It is
    // a property of the chain, not of the element, so it arrives derived — and
    // it belongs next to the citation because a thermal fit's answer is a CTE
    // difference, not a diameter. Its own sourcing is in Materials below.
    if (derived.material) {
      chips.appendChild(VA.chip("chip--material", derived.material,
        "the material this element's feature is cut in — see Materials below " +
        "for its CTE and where the CTE came from"));
    }
    if (derived.zero_width) {
      chips.appendChild(VA.chip("chip--zero-width", "zero-width band",
        "min == max: every interval this feeds is a LOWER bound on the real spread."));
    }
    // A chip only for the export states that must be legible from the ROW, at a
    // glance, across a thirty-row table: `unestablished` and a status this viewer
    // cannot explain. `established` and "no export block" get no chip — they are
    // 48 of the 48 live citations between them, and a chip on every row is a chip
    // nobody reads. The block below the citation carries all four states in full.
    var exportView = VA.exportProvenance(element.source_ref);
    if (exportView && exportView.loud) {
      chips.appendChild(VA.chip("chip--export-" + exportView.state,
        exportView.state === "unestablished" ? "EXPORT UNESTABLISHED"
          : "EXPORT STATUS UNKNOWN",
        exportView.headline + (exportView.why ? " — " + exportView.why : "")));
    }
    cell.appendChild(chips);
    cell.appendChild(VA.el("div", "el-row__where", VA.citationWhere(element.source_ref)));
    if (element.source_ref && element.source_ref.callout) {
      cell.appendChild(VA.el("div", "el-row__callout", element.source_ref.callout));
    }
    if (element.source_ref && element.source_ref.note) {
      // Clamped to a few lines, click to expand. These notes are the written
      // argument behind a citation — often a paragraph — and left unclamped a
      // six-element stack is metres tall, which is how a review surface stops
      // being reviewed. The full text is also the tooltip.
      cell.appendChild(clampedNote("el-row__srcnote", element.source_ref.note));
    }
    // WHICH BYTES the number was read off, beneath where on the page it is
    // written. Above the crop trigger on purpose: this is a fact about the
    // CITATION, and until 2026-08-12 the only place it surfaced was the crop
    // popover — so a citation whose crop could not resolve said nothing at all
    // about its export, which is the wrong way round in a repo whose worst
    // defect class is a provenance record making a false-looking claim.
    var exportBlock = exportProvenanceBlock(stackProj, element, cropsIndex);
    if (exportBlock) cell.appendChild(exportBlock);
    cell.appendChild(cropTrigger(stackProj, element, cropsIndex, handlers));
    return cell;
  }

  // A paragraph of provenance prose: clamped, click to expand, full text on
  // hover. Two of these now (the citation's note and its export's), and they
  // keep separate class names so a selector for one never picks up the other.
  function clampedNote(baseClass, text) {
    var note = VA.el("div", baseClass, text);
    note.setAttribute("title", "click to expand / collapse");
    note.onclick = function () {
      note.className = note.className.indexOf(baseClass + "--open") === -1
        ? baseClass + " " + baseClass + "--open"
        : baseClass;
    };
    return note;
  }

  // --- source_ref.export ----------------------------------------------------

  // The export block for one element: its status, the file, that a sha256 is on
  // record, and the runs that corroborate it. All four were dropped entirely
  // until 2026-08-12 (ISSUE_20260811_viewer_shows_nothing_for_source_ref_export).
  //
  // The loud states are `unestablished` and a status this viewer has no branch
  // for. `none` — a citation with no export block, which is 26 of the 48 live
  // citations — is stated plainly rather than alarmed: for a workbook or assumed
  // source there is no exported PDF to name, so a red row on every one of them
  // would be an alarm a reader learns to ignore. The four `traced` spec-pile
  // citations in that same state are the interesting ones, and the sentence names
  // the fact for them too.
  function exportProvenanceBlock(stackProj, element, cropsIndex) {
    var p = VA.exportProvenance(element.source_ref);
    if (!p) return null;
    var box = VA.el("div", "el-export el-export--" + p.state +
      (p.loud ? " el-export--loud" : ""));
    box.appendChild(VA.el("div", "el-export__head", p.headline));
    // The recorded reason, unclamped and unhidden: the whole argument for
    // rendering this block is that an unestablished export's `why` was reachable
    // only through a crop popover, so putting it behind a second click here would
    // reproduce the defect one notch down.
    if (p.why) box.appendChild(VA.el("div", "el-export__why", p.why));
    var facts = [];
    if (p.shaText) facts.push(p.shaText);
    if (facts.length) box.appendChild(VA.el("div", "el-export__facts", facts.join(" · ")));
    if (p.state === "established") box.appendChild(runsLine(p, cropsIndex, stackProj, element));
    // The full path beside the basename, same reason the crop popover prints it:
    // a file:// link only navigates from a file:// page, and copy-paste is the
    // fallback that always works.
    if (p.pdf) box.appendChild(VA.el("div", "el-export__path", p.pdf));
    if (p.note) box.appendChild(clampedNote("el-export__note", p.note));
    return box;
  }

  // The run ids, linked where this page can honestly address the run — see
  // VA.exportRunLinks for why that is only ever the one the element's own crop
  // resolved through. An empty `runs` is stated as a fact, not left blank: 15 of
  // the 22 live established CITATIONS have never been consumed by a run (6 of the
  // 9 distinct exports they name), and "nothing here" would read as a missing
  // record rather than an empty one.
  function runsLine(p, cropsIndex, stackProj, element) {
    var line = VA.el("div", "el-export__runs");
    var links = VA.exportRunLinks(VA.CONFIG,
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
          VA.CONFIG.drawingCheckerWebui + " must be serving");
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

  // The hover target. Carries its crop entry on the node so the app can show the
  // popover without re-deriving anything, and so a test can assert what a given
  // element would show without a browser.
  function cropTrigger(stackProj, element, cropsIndex, handlers) {
    var entry = VA.cropFor(cropsIndex, stackProj.id, element.id);
    var resolved = entry.status === "resolved";
    var node = VA.el("button",
      "crop-trigger crop-trigger--" + entry.status,
      resolved ? "drawing crop" : "no crop — " + entry.status);
    node.setAttribute("title", resolved ? VA.cropProvenanceLine(entry) : (entry.reason || ""));
    node.cropEntry = entry;
    node.cropElementId = element.id;
    // Hover, focus or click all OPEN the popover; nothing here closes it. Closing
    // on mouseleave is the obvious design and the wrong one: the pointer has to
    // leave the button to reach the "open the PDF" link inside the popover, and
    // the popover itself can end up under the pointer, which produced a
    // leave/enter storm that closed it the instant it opened (caught by the
    // browser tier, 2026-08-05). The popover closes on its own ✕, on Escape, on
    // an outside click, or by being replaced by the next one.
    var show = function () { if (handlers.onCropShow) handlers.onCropShow(entry, node); };
    node.onclick = show;
    node.onmouseenter = show;
    node.onfocus = show;
    return node;
  }

  function gapsRow(hardwareRef, gaps) {
    var tr = VA.el("tr", "el-note el-note--gap");
    var td = VA.el("td");
    td.setAttribute("colspan", String(ELEMENT_COLUMNS.length));
    var box = VA.el("details", "el-gaps");
    box.appendChild(VA.el("summary", null,
      gaps.length + " hardware gap" + (gaps.length === 1 ? "" : "s") +
      (hardwareRef ? " — " + hardwareRef : "")));
    var list = VA.el("ul", "plainlist");
    gaps.forEach(function (gap) { list.appendChild(VA.el("li", null, gap)); });
    box.appendChild(list);
    td.appendChild(box);
    tr.appendChild(td);
    return tr;
  }

  function noteRow(className, text) {
    var tr = VA.el("tr", className);
    var td = VA.el("td", null, text);
    td.setAttribute("colspan", String(ELEMENT_COLUMNS.length));
    tr.appendChild(td);
    return tr;
  }

  // --- materials -----------------------------------------------------------

  // Null unless the projection carries materials (only a `thermal_fit` stack
  // does today). Every number here is authored in materials.json and printed
  // verbatim; the chips are the derived sourcing flags beside it.
  //
  // This section exists because the CTEs were reaching this surface not at all,
  // and they are both the mechanism (a fit loosens because two members grow at
  // different rates) and the least-traced numbers in the stack. They are also
  // what makes a term's coefficient auditable: 2.0010712 on a sleeve wall is
  // 2 (diametral) × (1 + ΔT·α), and ΔT is on the check card.
  var MATERIAL_COLUMNS = ["material", "designation", "CTE 1e-6/°C",
    "CTE range °C", "used by", "sourcing"];

  function materialsSection(stackProj) {
    var materials = stackProj.materials || [];
    if (!materials.length) return null;
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Materials"));
    section.appendChild(VA.el("p", "muted",
      "The soak factor on every weighted term below is 1 + ΔT·α from this table " +
      "(ΔT is on each check card). A scalar CTE hides that α varies with " +
      "temperature — the range each value is a mean over is stated when the " +
      "source states one."));

    var table = VA.el("table", "mattable");
    var head = VA.el("tr");
    MATERIAL_COLUMNS.forEach(function (name) { head.appendChild(VA.el("th", null, name)); });
    table.appendChild(VA.el("thead", null, head));

    var body = VA.el("tbody");
    materials.forEach(function (row) {
      var authored = row.material || {};
      var tr = VA.el("tr", "mat-row " + VA.confidenceClass(row.confidence));
      tr.appendChild(VA.el("td", null, VA.el("code", null, row.id)));
      var name = VA.el("td");
      name.appendChild(VA.el("div", null, authored.designation || "—"));
      var detail = [authored.specification, authored.condition, authored.class]
        .filter(function (x) { return x; }).join(" · ");
      if (detail) name.appendChild(VA.el("div", "muted", detail));
      tr.appendChild(name);
      tr.appendChild(VA.el("td", "num", VA.fmt(authored.cte_1e6_per_c)));
      // Two ranges in one cell, and the pairing is the point: the range the
      // source QUOTED the mean over, and the ranges this stack APPLIES it over.
      // Every live entry quotes no range at all and is applied over two, which is
      // exactly the comparison a reader has to be able to make — and the viewer
      // makes it visible without making it, because deciding whether one covers
      // the other is arithmetic.
      var ranges = VA.el("td", "num");
      ranges.appendChild(VA.el("div", null, (authored.cte_temperature_range_c || [])
        .map(VA.fmt).join(" … ") || "— not stated"));
      var applied = VA.appliedOverText(authored.applied_over_c);
      if (applied) {
        ranges.appendChild(VA.el("div", "mat-row__applied", applied));
      }
      tr.appendChild(ranges);
      tr.appendChild(VA.el("td", null, (row.used_by_elements || []).join(", ")));
      tr.appendChild(materialSourcingCell(row, authored));
      body.appendChild(tr);
      var gaps = authored.gaps || [];
      if (gaps.length) body.appendChild(materialGapsRow(row.id, gaps));
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  function materialSourcingCell(row, authored) {
    var cell = VA.el("td", "el-row__source");
    var chips = VA.el("div", "el-row__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(row.confidence),
      VA.CONFIDENCE_LABEL[row.confidence] || row.confidence,
      "how the CTE VALUE is sourced — the designation is sourced separately"));
    if (row.kind) chips.appendChild(VA.chip("chip--kind", row.kind));
    // The name and the number have different provenance, and materials.json
    // keeps them in different fields on purpose: most designations are traced to
    // a drawing note, and no CTE value in this repo is traced to anything.
    chips.appendChild(VA.chip(VA.confidenceClass(row.designation_confidence),
      "designation: " + (VA.CONFIDENCE_LABEL[row.designation_confidence] ||
        row.designation_confidence)));
    // WHERE the CTE came from, and — since 2026-08-12 — WHAT KIND of record it
    // is. `values_status` decides whether the number in the CTE column is the
    // repo's record of it (`inline`), a cross-check of a projection that owns it
    // (`library`, through `library_ref`), or nothing anybody read off a source
    // (`not_transcribed`). All three rendered identically until this line
    // existed, on a column whose numbers are the least-traced in the repo.
    var values = VA.valuesProvenance(authored);
    if (values.loud) {
      chips.appendChild(VA.chip("chip--values-" + values.state,
        values.state === "not_transcribed" ? "CTE NOT TRANSCRIBED"
          : "VALUES_STATUS UNKNOWN", values.text));
    }
    cell.appendChild(chips);
    cell.appendChild(VA.el("div", "el-row__where",
      VA.citationWhere(authored.values_source)));
    cell.appendChild(VA.el("div",
      "mat-row__values" + (values.loud ? " mat-row__values--loud" : ""), values.text));
    // Rendered whenever it is set, whatever the status says. `library_ref` is the
    // provenance of a NUMBER — `spec_library:NAS6403U11D` is what a value
    // resolves through — and the schema does not forbid an `inline` entry from
    // naming one, so reading it only under `values_status: "library"` would be
    // the same silent drop, one field along.
    if (values.libraryRef) {
      cell.appendChild(VA.el("div", "mat-row__libref",
        "library_ref: " + values.libraryRef));
    }
    if (authored.note) {
      cell.appendChild(VA.el("div", "el-row__srcnote el-row__srcnote--open", authored.note));
    }
    // The DESIGNATION's own citation. Its confidence has had a chip since the
    // materials table shipped, but the chip says how well sourced the name is
    // while never saying WHERE from — and a designation is what makes the CTE a
    // claim about a specific alloy rather than about a word.
    cell.appendChild(VA.el("div", "mat-row__desig",
      "designation from: " + VA.citationWhere(authored.designation_source)));
    if (authored.designation_source && authored.designation_source.callout) {
      cell.appendChild(VA.el("div", "el-row__callout",
        authored.designation_source.callout));
    }
    if (authored.designation_source && authored.designation_source.note) {
      cell.appendChild(clampedNote("el-row__srcnote", authored.designation_source.note));
    }
    // The outstanding ASK for a real value, when the entry records one. It is the
    // one field on a material entry that describes future work rather than the
    // present record, so it is clamped and labelled — but it is here, because a
    // CTE that is traced to nothing and whose recorded next step is invisible is
    // the same defect one layer down.
    if (authored.cindas_request) {
      cell.appendChild(clampedNote("mat-row__request",
        "CINDAS request on record: " + authored.cindas_request));
    }
    return cell;
  }

  function materialGapsRow(materialId, gaps) {
    var tr = VA.el("tr", "el-note el-note--gap");
    var td = VA.el("td");
    td.setAttribute("colspan", String(MATERIAL_COLUMNS.length));
    var box = VA.el("details", "el-gaps");
    box.appendChild(VA.el("summary", null,
      gaps.length + " material gap" + (gaps.length === 1 ? "" : "s") + " — " + materialId));
    var list = VA.el("ul", "plainlist");
    gaps.forEach(function (gap) { list.appendChild(VA.el("li", null, gap)); });
    box.appendChild(list);
    td.appendChild(box);
    tr.appendChild(td);
    return tr;
  }

  // --- paths ---------------------------------------------------------------

  function pathsSection(stackProj) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Paths"));
    var table = VA.el("table", "foldtable");
    var head = VA.el("tr");
    ["path", "nominal", "worst-case min", "worst-case max", "RSS center", "RSS half",
      "weakest input"].forEach(function (name) {
      head.appendChild(VA.el("th", null, name));
    });
    table.appendChild(VA.el("thead", null, head));
    var body = VA.el("tbody");
    (stackProj.paths || []).forEach(function (path) {
      var tr = VA.el("tr", "fold-row");
      var label = VA.el("td", "fold-row__label");
      label.appendChild(VA.el("code", null, path.id));
      label.appendChild(VA.el("div", "muted", path.label));
      tr.appendChild(label);
      ["nominal", "worst_case_min", "worst_case_max", "rss_center", "rss_half"]
        .forEach(function (key) {
          tr.appendChild(VA.el("td", "num", VA.fmt(path.interval[key])));
        });
      tr.appendChild(VA.el("td", null,
        VA.chip(VA.confidenceClass(path.worst_confidence),
          VA.CONFIDENCE_LABEL[path.worst_confidence] || "—")));
      body.appendChild(tr);
      if (path.zero_width_inputs && path.zero_width_inputs.length) {
        body.appendChild(foldNote(7,
          "lower bound only — zero-width inputs: " + path.zero_width_inputs.join(", ")));
      }
    });
    table.appendChild(body);
    section.appendChild(table);
    section.appendChild(VA.el("p", "muted",
      "RSS is a relative softening indicator, not a probability statement, and is " +
      "not directly comparable to the worst-case columns (ARCHITECTURE.md). " +
      "Verdicts never read it."));
    return section;
  }

  function foldNote(columns, text) {
    var tr = VA.el("tr", "fold-note");
    var td = VA.el("td", null, text);
    td.setAttribute("colspan", String(columns));
    tr.appendChild(td);
    return tr;
  }

  // --- checks --------------------------------------------------------------

  function checksSection(stackProj) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Checks"));
    // A generated term list is not readable in the stack JSON — the repo's usual
    // safety property — so the surface has to say where the signs live and how a
    // reader reproduces them outside the browser.
    if (stackProj.checks_source === "generated") {
      section.appendChild(VA.el("p", "check__note",
        "GENERATED CHECKS. These are not authored in " + stackProj.source_file +
        " — its `checks` array is empty on purpose. The archetype \"" +
        (stackProj.archetype || "?") + "\" builds them, coefficients included, " +
        "from the stack's own block, and the projection ran that loader in " +
        "Python: the same code the tests pin, so nothing here was re-derived in " +
        "the browser. The identical term table prints from: " +
        "venv-win\\Scripts\\python.exe tests\\debug_report_thermal_fit.py " +
        "--terms --markdown"));
    }
    (stackProj.checks || []).forEach(function (check) {
      section.appendChild(checkCard(stackProj, check));
    });
    if (!(stackProj.checks || []).length) {
      // "no checks" and "this stack's checks are generated and this surface
      // cannot render them" are different facts, and only one of them is ever
      // true of an archetype stack. Never let the second render as the first.
      // Reachable now only for an archetype the projection has no loader for —
      // `thermal_fit` renders above.
      section.appendChild(stackProj.checks_generated_not_rendered
        ? VA.el("p", "check__warn",
            "This stack declares archetype \"" + (stackProj.archetype || "?") +
            "\", whose checks are GENERATED from its own block rather than " +
            "authored in the file — and the projection has NO LOADER for that " +
            "archetype, so there are none here to render. This is NOT a stack " +
            "without checks. Add the archetype's loader to ARCHETYPE_LOADERS in " +
            "scripts\\build_viewer_projection.py and rebuild.")
        : VA.el("p", "muted", "no checks"));
    }
    return section;
  }

  // The archetype vocabulary a generated check's `configuration` carries, in the
  // order a reader asks for it: which seat, which stage, which temperature, and
  // what the stiffness split was set to. Only the FIELD LABELS are here — every
  // value is the string the archetype wrote, so the viewer holds no copy of the
  // archetype's vocabulary that could drift from it. Which corner of
  // (fit × temperature) a card describes is the point of a fit stack, and a card
  // that does not say is not legible.
  var CORNER_FIELDS = [
    ["chain", "chain"],
    ["stage", "stage"],
    ["temperature", "temperature"],
    ["stiffness_ratio", "k"],
  ];

  function cornerChips(check) {
    var configuration = check.configuration || {};
    var chips = [];
    CORNER_FIELDS.forEach(function (pair) {
      var value = configuration[pair[0]];
      if (value === null || value === undefined || value === "") return;
      var text = pair[1] + " " + value;
      if (pair[0] === "temperature" && configuration.temperature_c) {
        text += " (" + configuration.temperature_c + " °C)";
      }
      chips.push(VA.chip("chip--corner", text));
    });
    return chips;
  }

  function checkCard(stackProj, check) {
    var budget = VA.isBudgetScope(check);
    var scope = VA.VERDICT_SCOPES[check.verdict_scope] || {};
    var card = VA.el("article", "check" +
      (budget ? " check--budget" : "") +
      (check.sensitivity ? " check--sensitivity" : ""));

    var head = VA.el("header", "check__head");
    head.appendChild(VA.chip("verdict " + VA.verdictClass(check.verdict), check.verdict));
    if (scope.chip) head.appendChild(VA.chip("chip--budget", scope.chip, scope.title));
    // A sensitivity probe re-runs a check with an undocumented input moved. Its
    // verdict is about that hypothetical, not about the joint — so it says so
    // beside the verdict chip, not only in the guidance underneath.
    if (check.sensitivity) {
      head.appendChild(VA.chip("chip--sensitivity", "NOT A RESULT",
        "A sensitivity probe: the same check with an undocumented input moved, " +
        "so a reader can see how much of the answer rests on it. Its verdict is " +
        "about that hypothetical, not about this joint."));
    }
    head.appendChild(VA.chip(VA.confidenceClass(check.worst_confidence),
      "weakest input: " + (VA.CONFIDENCE_LABEL[check.worst_confidence] || "—")));
    head.appendChild(VA.el("code", "check__id", check.check_id));
    card.appendChild(head);
    card.appendChild(VA.el("div", "check__label", check.label));

    var corner = cornerChips(check);
    if (corner.length) {
      var corners = VA.el("div", "check__corner");
      corner.forEach(function (chip) { corners.appendChild(chip); });
      card.appendChild(corners);
    }

    var numbers = VA.el("div", "check__numbers");
    [["criterion", check.criterion], ["nominal", VA.fmt(check.nominal)],
     ["worst case", VA.fmt(check.worst_case_min) + " … " + VA.fmt(check.worst_case_max)],
     ["RSS", VA.fmt(check.rss_center) + " ± " + VA.fmt(check.rss_half)],
     ["units", check.units]].forEach(function (pair) {
      var box = VA.el("div", "check__num");
      box.appendChild(VA.el("span", "check__numlabel", pair[0]));
      box.appendChild(VA.el("span", "check__numvalue", pair[1]));
      numbers.appendChild(box);
    });
    card.appendChild(numbers);

    // A budget without its exclusions named beside it is the misreading all over
    // again: the number above is a budget FOR something, and a reader who cannot
    // see what reads it as a verdict. So the terms sit directly under the
    // numbers, not in the gap list three sections down.
    if (check.excluded_terms && check.excluded_terms.length) {
      var excluded = VA.el("p", "check__excluded");
      excluded.appendChild(VA.el("span", "check__excludedlabel",
        budget ? "budget for the missing:" : "excluded:"));
      excluded.appendChild(VA.el("span", "check__excludedterms",
        check.excluded_terms.join("; ")));
      card.appendChild(excluded);
    }

    if (check.zero_width_inputs && check.zero_width_inputs.length) {
      card.appendChild(VA.el("p", "check__warn",
        "Lower bound only — zero-width inputs: " + check.zero_width_inputs.join(", ")));
    }

    var inputs = VA.el("div", "check__inputs");
    inputs.appendChild(VA.el("span", "muted", "inputs:"));
    (check.element_terms || []).forEach(function (term) {
      var derived = findDerived(stackProj, term.element_id);
      var weighted = typeof term.coefficient === "number" && term.coefficient !== 1;
      inputs.appendChild(VA.chip(
        VA.confidenceClass(derived.confidence) + (weighted ? " chip--weighted" : ""),
        VA.termLabel(term), VA.termTitle(term)));
    });
    card.appendChild(inputs);

    if (check.configuration && Object.keys(check.configuration).length) {
      var dl = VA.el("dl", "kv kv--tight");
      Object.keys(check.configuration).forEach(function (key) {
        dl.appendChild(VA.el("dt", null, key));
        dl.appendChild(VA.el("dd", null, String(check.configuration[key])));
      });
      card.appendChild(dl);
    }
    if (check.guidance) card.appendChild(VA.el("p", "check__guidance", check.guidance));
    return card;
  }

  function findDerived(stackProj, elementId) {
    var found = (stackProj.elements || []).filter(function (e) { return e.id === elementId; });
    return found[0] || { confidence: "no_source_ref" };
  }

  // --- gaps + notes --------------------------------------------------------

  function gapsSection(stackProj) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Gaps"));
    var gaps = stackProj.gaps || [];
    if (!gaps.length) {
      section.appendChild(VA.el("p", "muted", "no gaps recorded"));
      return section;
    }
    var list = VA.el("ul", "gaplist");
    gaps.forEach(function (gap) {
      var item = VA.el("li", "gap gap--" + gap.kind);
      item.appendChild(VA.chip("chip--gap-" + gap.kind, gap.label));
      item.appendChild(VA.el("span", "gap__text", gap.text));
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function notesSection(stackProj) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Notes"));
    var notes = (stackProj.stack || {}).notes || [];
    if (!notes.length) {
      section.appendChild(VA.el("p", "muted", "no notes"));
      return section;
    }
    var list = VA.el("ul", "notelist");
    notes.forEach(function (note) { list.appendChild(VA.el("li", null, note)); });
    section.appendChild(list);
    return section;
  }
})(window.ViewerApp = window.ViewerApp || {});
