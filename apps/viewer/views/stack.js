// The stack view: elements, paths, checks, gaps, notes.
//
// Every number below is printed straight out of the projection. The view never
// adds, subtracts or compares a tolerance — see viewer.js for why.
//
// Colour carries provenance, not decoration: a row's tint is its element's
// `confidence`, a zero-width band gets a dashed outline and a chip, and an
// INCOMPLETE check gets a striped header. Jeff reviews sourcing as much as
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
    if (derived.zero_width) {
      chips.appendChild(VA.chip("chip--zero-width", "zero-width band",
        "min == max: every interval this feeds is a LOWER bound on the real spread."));
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
      var note = VA.el("div", "el-row__srcnote", element.source_ref.note);
      note.setAttribute("title", "click to expand / collapse");
      note.onclick = function () {
        note.className = note.className.indexOf("el-row__srcnote--open") === -1
          ? "el-row__srcnote el-row__srcnote--open"
          : "el-row__srcnote";
      };
      cell.appendChild(note);
    }
    cell.appendChild(cropTrigger(stackProj, element, cropsIndex, handlers));
    return cell;
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
    (stackProj.checks || []).forEach(function (check) {
      section.appendChild(checkCard(stackProj, check));
    });
    if (!(stackProj.checks || []).length) {
      section.appendChild(VA.el("p", "muted", "no checks"));
    }
    return section;
  }

  function checkCard(stackProj, check) {
    var card = VA.el("article",
      "check" + (check.incomplete ? " check--incomplete" : ""));

    var head = VA.el("header", "check__head");
    head.appendChild(VA.chip("verdict " + VA.verdictClass(check.verdict), check.verdict));
    if (check.incomplete) {
      head.appendChild(VA.chip("chip--incomplete", "INCOMPLETE",
        "A term is missing from the model. Read the magnitude as a budget for " +
        "the missing term, not as a verdict on the joint."));
    }
    head.appendChild(VA.chip(VA.confidenceClass(check.worst_confidence),
      "weakest input: " + (VA.CONFIDENCE_LABEL[check.worst_confidence] || "—")));
    head.appendChild(VA.el("code", "check__id", check.check_id));
    card.appendChild(head);
    card.appendChild(VA.el("div", "check__label", check.label));

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

    if (check.zero_width_inputs && check.zero_width_inputs.length) {
      card.appendChild(VA.el("p", "check__warn",
        "Lower bound only — zero-width inputs: " + check.zero_width_inputs.join(", ")));
    }

    var inputs = VA.el("div", "check__inputs");
    inputs.appendChild(VA.el("span", "muted", "inputs:"));
    (check.element_terms || []).forEach(function (term) {
      var derived = findDerived(stackProj, term.element_id);
      inputs.appendChild(VA.chip(VA.confidenceClass(derived.confidence),
        (term.sign < 0 ? "− " : "+ ") + term.element_id));
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
