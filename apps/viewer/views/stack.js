// The stack view: elements, materials, results (checks and paths), gaps,
// notes.
//
// Every number below is printed straight out of the projection. The view never
// adds, subtracts or compares a tolerance — see viewer.js for why.
//
// Colour carries provenance, not decoration: a row's tint is its element's
// `confidence`, a zero-width band gets a dashed outline and a chip, and a
// budget-scope check gets an amber spine on its row (a striped card until
// 2026-09-22, when the cards became rows). Jeff reviews sourcing as much as
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
    var materials = materialsSection(stackProj, handlers);
    if (materials) root.appendChild(materials);
    // One section, not the two ("Paths", "Checks") that stood here until
    // 2026-09-22: they printed the same five numbers in the same units under
    // the same column names. See resultsSection.
    root.appendChild(resultsSection(stackProj));
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

  // Shared with topology mode (views/topology.js's renderTopoJoint,
  // viewer_v2_single_nav 2026-09-08): a topology's own `joint` block
  // (docs/DAG_TOPOLOGY.md, topology_schema_v1) is the same free-form
  // assembly/context shape a stack's is, `{}` when a topology spans more than
  // one physical joint — one renderer, not a second copy that could drift.
  // The one key in a free-form joint block that is NOT free-form: `c08d705`
  // (2026-09-16) gave a joint the machine-readable sibling of its prose
  // `assembly_export` -- the same `{status, pdf, sha256, runs[], note}` shape a
  // citation's `source_ref.export` carries. A module-level constant, not an
  // inline literal, per CLAUDE.md's field-vocabulary rule.
  VA.JOINT_EXPORT_KEY = "assembly_export_ref";

  // Which VA.EXPORT_SUBJECTS row this block's export is about. A module-level
  // constant rather than the string `"joint"` written at the call site below,
  // per CLAUDE.md's field-vocabulary rule: a subject key spelled inline is a
  // vocabulary word no pairing test can see.
  VA.JOINT_EXPORT_SUBJECT = "joint";

  VA.jointBlock = jointBlock;
  function jointBlock(joint) {
    var box = VA.el("details", "sv__joint");
    box.appendChild(VA.el("summary", null, "The joint"));
    if (!joint || !Object.keys(joint).length) {
      box.appendChild(VA.el("p", "muted", "no joint block"));
      return box;
    }
    // An export block is a SHAPE THE PAGE KNOWS, so it does not fall through to
    // the key-by-key renderer below. Lifted out and rendered through
    // VA.exportBlockNode -- the one builder every other export on this page
    // goes through (views/detail.js) -- which is why the export box is a
    // sibling of the list rather than a `<dd>` inside it: it is self-describing
    // ("Read from <file>") and needs no `<dt>`.
    //
    // WHAT THIS FIXES, and it is four leaks, not one. kvList prints the KEY as
    // the label and the value whole, so the live pitch-link joint rendered
    // `sha256`, a 64-character checksum, an absolute `C:/workspace/...` path
    // and two bare drawing-checker run ids -- every one of them a class
    // BANNED_IN_RENDERED_TEXT names. Only the `sha256` LABEL was caught, and
    // only because `dd.kv__value` exempts every value in a free-form block from
    // that scan; the three worse ones rode through the exemption.
    // (ISSUE_20260918_real_tier_red_on_trunk_after_the_batch_merge_and_
    // projection_rebuild.) VA.exportBlockNode already made this decision for
    // the element pane on 2026-09-15 -- Jeff, "full workstation file paths --
    // never rendered when the link works".
    //
    // REJECTED: giving the banned-string guard an exemption for `sha256`. The
    // guard is right -- an algorithm's name is nothing a reader can act on --
    // and a keyword allowlist would have exempted the label while leaving the
    // path, the checksum and the run ids on the page, which is the whole
    // failure mode of matching raw characters where structure is meant.
    // ALSO REJECTED: renaming the `<dt>`. That fixes the one string the guard
    // happened to see and none of the three it could not.
    var rest = {}, exportRef = null;
    Object.keys(joint).forEach(function (key) {
      if (key === VA.JOINT_EXPORT_KEY && joint[key]) { exportRef = joint[key]; return; }
      rest[key] = joint[key];
    });
    if (Object.keys(rest).length) box.appendChild(kvList(rest));
    if (exportRef) {
      // `VA.JOINT_EXPORT_SUBJECT`, not the default: this block is about the
      // JOINT, and the status vocabulary's `unestablished` sentence and its
      // loud tint are both written about a value (VA.EXPORT_SUBJECTS, viewer.js
      // -- "there is no 'this value' in a joint block"). Both live thermal
      // stacks are in that state.
      box.appendChild(VA.exportBlockNode(
        VA.exportProvenance({ export: exportRef }, null, VA.JOINT_EXPORT_SUBJECT),
        null));
    }
    return box;
  }

  // A free-form authored block, rendered key by key. The page cannot know what
  // is in one -- a `joint` block and a generated check's `configuration` are
  // both "whatever the author wrote" -- so the key IS the label, and this is
  // the one renderer that turns a block into reader-facing text. It was three
  // near-copies until 2026-09-16, and each of the three printed something the
  // reader could not act on (reader_facing_copy_and_vocabulary item 7):
  //
  //   * the raw key, `assembly_drawing` / `temperature_c` / `stiffness_ratio`,
  //     as a definition-list term. VA.fieldLabel drops the separator and
  //     changes nothing else.
  //   * the word "null", for a key whose value is absent. Absent is absent; it
  //     is not the string a JSON serialiser happens to write for it. Live on
  //     `hub_bearing_thermal_fit_m1` (`assembly_revision`).
  //   * `JSON.stringify(item)` for an object inside an array -- a wall of
  //     braces, quotes and field names in the middle of a page whose whole
  //     argument is that a reader should not have to open the JSON. The M1
  //     stack's joint block carries six parts-list rows that way.
  //
  // Nested rather than flattened: a key's own sub-block keeps its structure,
  // and nothing is dropped.
  //
  // Exported since viewer_summary_balance_sheet (2026-09-22): the topology
  // page's study summary renders a check's `configuration` as a card of
  // parameter/value pairs, which is the same free-form authored block this
  // renders for a `joint` and for a generated check's configuration on the
  // stack page. A second copy would be a second place the three decisions
  // above (humanise the key, say "not recorded", never print a JSON blob) can
  // be forgotten. views/stack.js loads before views/topology.js -- see
  // topology.html's script order.
  VA.kvList = kvList;
  function kvList(block) {
    var dl = VA.el("dl", "kv");
    Object.keys(block).forEach(function (key) {
      dl.appendChild(VA.el("dt", null, VA.fieldLabel(key)));
      dl.appendChild(blockValue(block[key]));
    });
    return dl;
  }

  function blockValue(value) {
    if (Array.isArray(value)) return VA.el("dd", null, arrayValue(value));
    if (value === null || value === undefined) {
      return VA.el("dd", "muted", "not recorded");
    }
    if (typeof value === "object") return VA.el("dd", null, kvList(value));
    // `kv__value` marks the RECORD's half of the pair: the label beside it is
    // the viewer's (VA.fieldLabel), the value is whatever the author wrote,
    // rendered whole. A live joint block says "not read for this stack -- see
    // identification_note", which names a field on purpose and is not the
    // page's sentence to trim.
    return VA.el("dd", "kv__value", String(value));
  }

  function arrayValue(items) {
    var list = VA.el("ul", "plainlist");
    items.forEach(function (item) {
      list.appendChild(typeof item === "object" && item !== null
        ? VA.el("li", null, kvList(item))
        : VA.el("li", null, String(item)));
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
      "only the path term lists below are load-bearing for the arithmetic. " +
      "Click a row to see its full sourcing on the right."));
    section.appendChild(sourcingLegend());

    var table = VA.el("table", "eltable");
    var head = VA.el("tr");
    ELEMENT_COLUMNS.forEach(function (name) { head.appendChild(VA.el("th", null, name)); });
    table.appendChild(VA.el("thead", null, head));

    var body = VA.el("tbody");
    VA.elementRows(stackProj).forEach(function (row, index) {
      body.appendChild(elementRow(stackProj, row, index, cropsIndex, handlers));
      if (row.element.note) {
        // `--record`: this row is the element's OWN note, printed whole. Its
        // sibling `el-note--gap` rows are the viewer's summary of a hardware
        // entry's gaps, and the banned-string guard scans those.
        body.appendChild(noteRow("el-note el-note--record", row.element.note));
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

  // The rule the sourcing column cannot state row by row without shouting it on
  // every row: WHEN A CITATION MAY NAME NO EXPORT. Collapsed, because a reader
  // needs it once; on the page rather than in a lesson, because a rule nothing
  // surfaces is a rule the next reader re-derives from an alarming-looking row
  // (the whole of ISSUE_20260812_four_traced_spec_citations_carry_no_export_block:
  // `traced` beside "nothing here identifies the bytes" is a legitimate pair for
  // exactly one reason, and that reason was statable only inside a crop entry).
  function sourcingLegend() {
    var box = VA.el("details", "sv__legend");
    box.appendChild(VA.el("summary", null, "How to read the sourcing column"));
    var list = VA.el("ul", "plainlist");
    list.appendChild(VA.el("li", null,
      "A drawing or parts-list citation must name the EXPORT it was read off — a " +
      "drawing number and a revision do not identify bytes, because exports get " +
      "written over."));
    list.appendChild(VA.el("li", null,
      "A spec-pile citation is the deliberate exception: the standard-spec " +
      "library is append-only, so nothing in it is renamed or re-exported " +
      "over and the filename IS the identity. Those rows say “" +
      VA.IDENTITY_RULES.spec_pile_filename.headline +
      "” in place of an export block, and `traced` beside no export is correct " +
      "for them and only for them."));
    list.appendChild(VA.el("li", null,
      "Any other citation with no export block has nothing identifying its bytes " +
      "— a workbook or an assumed value has no exported PDF to name, and the row " +
      "says so plainly."));
    list.appendChild(VA.el("li", null,
      "This column shows only a confidence chip, a kind chip and a short where-ref " +
      "— an unestablished export or an unlabelled state still gets its own chip " +
      "here, because that has to be legible at a glance, but the full argument " +
      "(callout, note, export block, crop) is in the panel on the right; click " +
      "the row."));
    box.appendChild(list);
    return box;
  }

  function elementRow(stackProj, row, index, cropsIndex, handlers) {
    var element = row.element;
    var derived = row.derived;
    var classes = ["el-row", VA.confidenceClass(derived.confidence)];
    if (derived.zero_width) classes.push("el-row--zero-width");
    if (handlers.selectedRowId === element.id) classes.push("el-row--selected");
    var tr = VA.el("tr", classes.join(" "));
    // Clicking anywhere on the row selects it and populates the right pane
    // (views/detail.js) — the row's own cell no longer carries enough to read
    // a citation in full, on purpose (deliverable 2).
    if (handlers.onRowSelect) {
      tr.onclick = function () { handlers.onRowSelect(element.id); };
    }

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
      min.setAttribute("title", VA.ATTENTION.no_tolerance.title);
      max.setAttribute("title", VA.ATTENTION.no_tolerance.title);
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

  // The compact indicator (deliverable 2): a confidence chip, a kind chip, and
  // a one-line where-ref — nothing else. Everything the old composite cell also
  // carried (callout, the citation's own note, the export-provenance block) now
  // lives ONLY in the right pane (views/detail.js), reached by clicking the row.
  // The one exception is the loud export/identity chip: it has to stay legible
  // from the row, at a glance, across a thirty-row table — that is the one fact
  // this cell cannot afford to make a reader click through to.
  function sourcingCell(stackProj, row, cropsIndex, handlers) {
    var element = row.element;
    var derived = row.derived;
    var cell = VA.el("td", "el-row__source");
    var chips = VA.el("div", "el-row__chips");
    var confChip = VA.chip(VA.confidenceClass(derived.confidence),
      VA.CONFIDENCE_LABEL[derived.confidence] || derived.confidence);
    // The citation hover card (viewer_hover_cards_and_deep_links): the same
    // trigger the topology grid's confidence chip carries, over the same
    // model (VA.citationCard) — the full reference on hover, the right pane
    // still the place it renders persistently on click. Only a row that HAS
    // a citation gets one.
    if (element.source_ref && handlers.onCardShow) {
      confChip.className += " cardtrig";
      confChip.setAttribute("tabindex", "0");
      var showCitation = function () {
        handlers.onCardShow(VA.citationCard(element.source_ref,
          derived.identity_rule,
          VA.cropFor(cropsIndex, stackProj.id, element.id)), confChip);
      };
      confChip.onmouseenter = showCitation;
      confChip.onfocus = showCitation;
      confChip.onclick = showCitation;
    }
    chips.appendChild(confChip);
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
    // ONE badge for everything this row has to admit, with the words on hover
    // (deliverable 5, flyout_resize_annotator_filter_and_deselect). Until
    // 2026-09-16 the two alerts below were two filled all-caps chips shouting
    // from the row itself — "no tolerance recorded" beside "FILE NOT
    // IDENTIFIED" — which is the loudness Jeff named. They still say the same
    // words (VA.rowAlerts reads VA.ATTENTION and VA.EXPORT_CHIP_TEXT; nothing
    // is reworded and nothing is dropped), just one row of type quieter and
    // one hover away.
    //
    // Which alerts must be legible from the ROW at all is the same judgement it
    // has always been: `established`, "no export block" and the spec-pile
    // identity rule are quiet because nearly every live citation carries one of
    // them, and a chip on every row is a chip nobody reads. Every state in full
    // is in the right pane (click the row) as well as in this popup.
    var alerts = VA.rowAlerts(element, derived);
    if (alerts.length) {
      chips.appendChild(VA.alertBadge(alerts, element.name || element.id,
        handlers.onCardShow));
    }
    cell.appendChild(chips);
    var where = VA.el("div", "el-row__where el-row__where--compact",
      VA.citationWhere(element.source_ref));
    where.setAttribute("title", VA.citationWhere(element.source_ref));
    cell.appendChild(where);
    cell.appendChild(cropTrigger(stackProj, element, cropsIndex, handlers));
    return cell;
  }

  // The badge itself is views/dom.js's VA.alertBadge — the nav rail's rows
  // (viewer_nav_alert_badge_and_angled_default, 2026-09-21) and the materials
  // table below (2026-09-22) wear the same one, and one mark with three
  // builders drifts the way one word with three literals does. Since
  // 2026-09-22 this call site passes no skin at all: the drawn, unframed
  // triangle IS the default, and the nav rail is the surface that overrides it.

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
    // A hardware or material entry's own recorded gap, word for word. The
    // class carries no styling; it says in the DOM that this text is the
    // record's, which is what the banned-string guard subtracts before it
    // scans the viewer's own words.
    gaps.forEach(function (gap) {
      list.appendChild(VA.el("li", "el-gaps__text", gap));
    });
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
  // 2 (diametral) × (1 + ΔT·α), and ΔT is on the check's own row.
  var MATERIAL_COLUMNS = ["material", "designation", "CTE 1e-6/°C",
    "CTE range °C", "used by", "sourcing"];

  function materialsSection(stackProj, handlers) {
    var materials = stackProj.materials || [];
    if (!materials.length) return null;
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Materials"));
    section.appendChild(VA.el("p", "muted",
      "The soak factor on every weighted term below is 1 + ΔT·α from this table " +
      "(ΔT is on each check's own row). A scalar CTE hides that α varies with " +
      "temperature — the range each value is a mean over is stated when the " +
      "source states one. The sourcing column says how well sourced each " +
      "number is and where it came from; the full argument — the entry's own " +
      "note, the designation's citation and callout, and any outstanding " +
      "request for a real value — is in the panel on the right; click the row."));

    var table = VA.el("table", "mattable");
    var head = VA.el("tr");
    MATERIAL_COLUMNS.forEach(function (name) { head.appendChild(VA.el("th", null, name)); });
    table.appendChild(VA.el("thead", null, head));

    var body = VA.el("tbody");
    materials.forEach(function (row) {
      var authored = row.material || {};
      var classes = ["mat-row", VA.confidenceClass(row.confidence)];
      if (handlers.selectedRowId === row.id) classes.push("mat-row--selected");
      var tr = VA.el("tr", classes.join(" "));
      // Clicking anywhere on the row selects it and populates the right pane
      // (views/detail.js), the same one click the elements table above takes.
      // The pane holds ONE selection for the whole stack page -- a material
      // and an element are two rows in two tables and one thing a reader is
      // looking at, so selecting either replaces the other.
      if (handlers.onRowSelect) {
        tr.onclick = function () { handlers.onRowSelect(row.id); };
      }
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
      tr.appendChild(materialSourcingCell(row, authored, handlers));
      body.appendChild(tr);
      var gaps = authored.gaps || [];
      if (gaps.length) body.appendChild(materialGapsRow(row.id, gaps));
    });
    table.appendChild(body);
    section.appendChild(table);
    return section;
  }

  // The compact indicator -- the treatment the ELEMENTS table took when its
  // own composite cell was retired, arriving here 2026-09-18 and not before
  // (ISSUE_20260917_the_materials_source_column_is_a_750px_tall_composite_cell).
  //
  // WHAT IT COST TO LEAVE IT: measured on `hub_bearing_thermal_fit_m1`, live,
  // at 1600x1000 with the preview pane at its 560px default, the first
  // `tr.mat-row` rendered 653px tall and all six of its cells reported that
  // height because this one set it. The elements table's data rows are 88-112px
  // on the same page. A table whose rows are seven times the height of the
  // table above it does not read as a table; it reads as a list of blocks with
  // the numbers stranded at the top of acres of white.
  //
  // WHAT THE ELEMENTS TABLE'S ANSWER WAS, because a third table will arrive:
  // (a) the cell keeps only what a reader needs to decide whether to click the
  // row -- chips and a ONE-LINE, ellipsised where-ref; (b) everything else
  // moves to the right pane, whole and unclamped; (c) the row becomes
  // clickable, so the pane is reachable. All three, or none: a compact cell
  // with nowhere for the detail to go is deletion, not restructuring.
  //
  // So the values line, the spec-library reference, the entry's own note, the
  // designation's citation, its callout and its note, and the CINDAS request
  // are all in views/detail.js now. The one exception the elements table made
  // -- a LOUD chip stays on the row -- was made here too, and both have since
  // been taken back: a CTE nobody transcribed still has to be legible at a
  // glance, and since 2026-09-22 what is legible at a glance is a MARK rather
  // than the words, with the words one hover away instead of one click (see
  // the badge at the end of this function).
  function materialSourcingCell(row, authored, handlers) {
    var cell = VA.el("td", "el-row__source");
    var chips = VA.el("div", "el-row__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(row.confidence),
      VA.CONFIDENCE_LABEL[row.confidence] || row.confidence,
      "how the CTE VALUE is sourced — the designation is sourced separately"));
    if (row.kind) chips.appendChild(VA.chip("chip--kind", row.kind));
    // The name and the number have different provenance, and the material
    // record keeps them in different fields on purpose: most designations are
    // traced to a drawing note, and no CTE value in this repo is traced to
    // anything.
    chips.appendChild(VA.chip(VA.confidenceClass(row.designation_confidence),
      "designation: " + (VA.CONFIDENCE_LABEL[row.designation_confidence] ||
        row.designation_confidence)));
    // ...and the one thing this row may ask the reader to DISTRUST, as the
    // same quiet mark the elements table above wears
    // (stack_page_alert_marks_and_drawn_glyph, 2026-09-22). It was a filled
    // all-caps chip until 2026-09-17 and an outlined one until now --
    // `CTE NOT TRANSCRIBED`, always visible, in a source column, which is the
    // literal surface Jeff's sentence named ("especially the ones in the
    // source column that are always visible"). The exception paragraph above
    // was written when this was the LAST loud chip on the page and the
    // mechanism to fold it did not exist twice over; it does now, so the
    // sentence goes where every other alert's does.
    //
    // The standing rule this obeys (the 2026-09-22 rail pass): a row states
    // what asks you to look and nothing else; a verdict stays a chip and
    // anything that asks the reader to act or distrust folds into the mark.
    // The three chips left above are the row's provenance, which is what the
    // column is FOR; "nobody read this number off a source" is a reason to
    // distrust the number in the column beside it, so it folds.
    var alerts = VA.materialRowAlerts(authored);
    if (alerts.length) {
      chips.appendChild(VA.alertBadge(alerts, authored.designation || row.id,
        handlers && handlers.onCardShow));
    }
    cell.appendChild(chips);
    // WHERE the CTE came from, one line, ellipsised -- the same
    // `el-row__where--compact` the elements table's cell uses, with the whole
    // string on the hover for a reader who does not want to click.
    var where = VA.el("div", "el-row__where el-row__where--compact",
      VA.citationWhere(authored.values_source));
    where.setAttribute("title", VA.citationWhere(authored.values_source));
    cell.appendChild(where);
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
    // A hardware or material entry's own recorded gap, word for word. The
    // class carries no styling; it says in the DOM that this text is the
    // record's, which is what the banned-string guard subtracts before it
    // scans the viewer's own words.
    gaps.forEach(function (gap) {
      list.appendChild(VA.el("li", "el-gaps__text", gap));
    });
    box.appendChild(list);
    td.appendChild(box);
    tr.appendChild(td);
    return tr;
  }

  // --- results: checks and paths, one row each, in ONE table ---------------
  //
  // (stack_page_check_card_balance_sheet, 2026-09-22.) What stood here was two
  // sections: a Paths table, and thirteen-to-sixteen `<article>` cards, each
  // card carrying a five-chip head, five label/value boxes in a row, and the
  // check's authored guidance whole and unfolded. On
  // `hub_bearing_thermal_fit_m1` that page measured 10,633 px tall -- and its
  // sixteen cards printed just FOUR distinct guidance paragraphs between them
  // -- 6, 6, 2 and 2 -- because a generated check's guidance belongs to the
  // archetype's stage (and, for a probe, to the ratio it moved), not to the
  // corner. The complaint the study page answered one week earlier,
  // in Jeff's words, was "the weird ribbon of random values in circled
  // elements at the top" and "tons of long-winded text explanations"; this is
  // the same two defects one page over, and the same answer -- numbers in
  // columns, the author's own prose one disclosure deep, never edited.
  //
  // THE TWO DECISIONS THE STUDY PAGE'S IDIOM DID NOT MAKE FOR US:
  //
  // 1. A stack's checks are NOT footer rows of its elements table, the way a
  //    study's totals are footer rows of its contributions grid. They cannot
  //    be: a `<tfoot>` total is legible only because it totals the column above
  //    it over every row above it, and each of these checks folds a DIFFERENT
  //    subset of the elements (`element_terms`) -- sixteen checks over eight
  //    elements on m1, two to four terms each. Sixteen footer rows under one
  //    elements table would each be a total of a subset the reader cannot
  //    see, in columns that do not even line up (an element row's columns are
  //    one element's nominal/min/max/±/LMC/MMC; a check's are a fold's
  //    interval).
  //    So the checks get a table of their own, and the link back to the
  //    elements is each row's own term list, in its fold, with every sign and
  //    every coefficient.
  //
  // 2. The checks JOIN the paths table rather than standing beside it. A path
  //    and a check are the same arithmetic over the same elements -- `fold()`
  //    ran once per row, and both print the same five numbers in the same
  //    units. The paths table's seven columns were a strict SUBSET of what a
  //    check card printed, so leaving them as two tables would have left the
  //    page with "two tables that look like the same thing and are not", which
  //    is the one outcome the issue ruled out. The single honest difference --
  //    a check was folded against a criterion and a path was not -- is worth
  //    exactly two columns, and a path's two empty ones are explained once by
  //    the group row above them rather than per row.
  //
  // Nothing here is added up, compared or re-derived, exactly as before: every
  // number is printed straight out of the projection.

  // The one column set this page prints a folded interval in. A module-level
  // constant and not the inline header literals the paths table used to carry,
  // per CLAUDE.md's field-vocabulary rule -- `RESULT_COLUMNS.length` is also
  // what every group row spans, so a column added without one is a column the
  // group rows do not cross.
  //
  // `units: true` takes the STACK's units, once per header, rather than the
  // per-check `units` box the cards printed sixteen times. A check whose own
  // units differ from the stack's says so on its row (see nameCell) -- no live
  // check does, and a column that is the same word on every row is the ribbon
  // this pass is removing.
  // `width` is in px and is declared HERE, not in style.css, for the reason the
  // topology grid's `VA.TOPO_COLUMNS` gives: the table is `table-layout: fixed`
  // (it has to be -- a 120-character generated label would otherwise take the
  // name column to ~1200px on its intrinsic width and carry the table with it,
  // measured at 1850px before this was added), and a fixed table's total width
  // and its per-column widths have to agree. Two places that happen to agree is
  // the drift a shared source exists to prevent, so the stylesheet declares no
  // `.rs-col--*` width at all and the total below is summed from this array.
  var RESULT_COLUMNS = [
    { label: "result", cls: "name", width: 460 },
    { label: "verdict", cls: "verdict", width: 118 },
    { label: "criterion", cls: "criterion", width: 76 },
    { label: "nominal", cls: "num", width: 98, units: true },
    { label: "worst case min", cls: "num", width: 98, units: true },
    { label: "worst case max", cls: "num", width: 98, units: true },
    { label: "RSS center", cls: "num", width: 98, units: true },
    { label: "RSS half", cls: "num", width: 92, units: true },
    { label: "weakest input", cls: "weakest", width: 102 },
  ];

  function resultColgroup() {
    var cg = VA.el("colgroup");
    RESULT_COLUMNS.forEach(function (column) {
      var col = VA.el("col", "rs-col rs-col--" + column.cls);
      col.style.width = column.width + "px";
      cg.appendChild(col);
    });
    return cg;
  }

  // A floor, not a width: below it the number columns start wrapping their own
  // digits, and above it `width: 100%` shares the slack out. The stack pane is
  // 702px wide beside an open preview pane, so this table overflows it exactly
  // as the elements table above already does.
  function resultTableWidth() {
    return RESULT_COLUMNS.reduce(function (sum, c) { return sum + c.width; }, 0);
  }

  // The interval keys, in column order. One list, read for a check (which
  // carries them at the top level) and for a path (which carries them under
  // `interval`) -- the two spellings the projection uses for one shape.
  var INTERVAL_KEYS = ["nominal", "worst_case_min", "worst_case_max",
    "rss_center", "rss_half"];

  // Which of those five an input with no recorded tolerance makes a LOWER
  // bound: the spread, and not the centre. `nominal` and `rss_center` are
  // where they are whatever the missing band turns out to be; the two
  // worst-case ends and the RSS half-width are all narrower than the real
  // ones. Marked with the elements table's own `num--zero-width` treatment and
  // VA.ATTENTION's own sentence, so the mark means the same thing in both
  // tables and there is one place it is worded.
  var LOWER_BOUND_KEYS = ["worst_case_min", "worst_case_max", "rss_half"];

  // What the two kinds of row ARE, in everyday words. The `says` line is
  // rendered twice -- on the group row, and as the title on a path's empty
  // verdict and criterion cells -- from this one constant, because a blank
  // cell and a passing one look identical at a glance and that is the reading
  // this whole vocabulary exists to stop.
  var RESULT_GROUPS = {
    checks: {
      name: "Checks",
      says: "folded against a criterion, so each one carries a verdict",
    },
    paths: {
      name: "Paths",
      says: "the same fold with no criterion — a measured span, not an " +
        "answer, so no verdict",
    },
  };

  // A sensitivity probe re-runs a check with an undocumented input moved. Its
  // verdict is about that hypothetical, not about the joint -- so it says so
  // beside the verdict chip, not only in the guidance underneath.
  var SENSITIVITY_TITLE =
    "A sensitivity probe: the same check with an undocumented input moved, so " +
    "a reader can see how much of the answer rests on it. Its verdict is " +
    "about that hypothetical, not about this joint.";

  function resultsSection(stackProj) {
    var section = VA.el("section", "sv__section");
    section.appendChild(VA.el("h3", null, "Results"));
    var checks = stackProj.checks || [];
    var paths = stackProj.paths || [];
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
        "the browser. The same term table can be printed outside the browser, " +
        "from the repo's own thermal-fit term report."));
    }

    if (checks.length || paths.length) {
      var table = VA.el("table", "restable");
      table.style.minWidth = resultTableWidth() + "px";
      table.appendChild(resultColgroup());
      var head = VA.el("tr");
      RESULT_COLUMNS.forEach(function (column) {
        head.appendChild(VA.el("th", null,
          column.units && stackProj.units
            ? column.label + " (" + stackProj.units + ")"
            : column.label));
      });
      table.appendChild(VA.el("thead", null, head));
      var body = VA.el("tbody");
      // A group row names what the rows under it are, and is worth its own row
      // only when there is something to tell them apart FROM. A stack with
      // checks and no paths (both live thermal fits) gets one undivided block,
      // which is what it is.
      var grouped = !!(checks.length && paths.length);
      if (checks.length) {
        if (grouped) body.appendChild(groupRow(RESULT_GROUPS.checks));
        checks.forEach(function (check) {
          appendResult(body, checkRow(stackProj, check),
            checkRecord(stackProj, check));
        });
      }
      if (paths.length) {
        if (grouped) body.appendChild(groupRow(RESULT_GROUPS.paths));
        paths.forEach(function (path) {
          appendResult(body, pathRow(stackProj, path),
            pathRecord(stackProj, path));
        });
      }
      table.appendChild(body);
      section.appendChild(table);
    }

    if (!checks.length) {
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

    section.appendChild(VA.el("p", "muted",
      "RSS is a relative softening indicator, not a probability statement, and is " +
      "not directly comparable to the worst-case columns (ARCHITECTURE.md). " +
      "Verdicts never read it."));
    return section;
  }

  // A result and the record behind it: two `<tr>`s in the one `<tbody>`, the
  // second spanning every column and hidden until the row is clicked.
  //
  // NOT a `<details>` in the name cell, which is what the study page's findings
  // table uses and what was built first here. The difference is the column
  // count: that table has two columns, so a fold inside its name cell gets most
  // of the table's width. This one has nine, and a fold in the first of them
  // would have rendered a 47-word guidance paragraph in a ~350px column while
  // eight columns of white space sat beside it -- or forced the name column to
  // ~600px and pushed the whole table further past the scrollport it already
  // overflows. A second row spends the table's full width on the record and
  // moves no column at all.
  //
  // The affordance is a real `<button>` carrying `aria-expanded`, so the fold
  // is reachable by keyboard and announced; the whole row is clickable too,
  // which is the target a pointer actually aims at. One handler, on the row:
  // a click on the button bubbles to it, and two handlers would toggle twice.
  function appendResult(body, tr, record) {
    var fold = VA.el("tr", "rs-fold");
    var cell = VA.el("td", "rs-fold__cell");
    cell.setAttribute("colspan", String(RESULT_COLUMNS.length));
    cell.appendChild(record);
    fold.appendChild(cell);
    var toggle = tr.querySelector("button.rs-toggle");
    var shut = tr.className;
    var open = false;
    var set = function (next) {
      open = next;
      fold.className = open ? "rs-fold rs-fold--open" : "rs-fold";
      tr.className = open ? shut + " rs-row--open" : shut;
      if (!toggle) return;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? OPEN_MARK : SHUT_MARK;
    };
    set(false);
    tr.onclick = function () { set(!open); };
    body.appendChild(tr);
    body.appendChild(fold);
  }

  // The disclosure marker, in the two states it has. Text and not a CSS
  // `::before`, because the button is the fold's only accessible name and a
  // marker drawn by the stylesheet is a button that announces as "button".
  var SHUT_MARK = "▸";
  var OPEN_MARK = "▾";

  function foldToggle(label) {
    var toggle = VA.el("button", "rs-toggle", SHUT_MARK);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("title", "what this result is folded from — " + label);
    return toggle;
  }

  function groupRow(group) {
    var tr = VA.el("tr", "rs-group");
    var th = VA.el("th", "rs-group__cell");
    th.setAttribute("colspan", String(RESULT_COLUMNS.length));
    th.appendChild(VA.el("span", "rs-group__name", group.name));
    th.appendChild(VA.el("span", "rs-group__says", group.says));
    tr.appendChild(th);
    return tr;
  }

  // The archetype vocabulary a generated check's `configuration` carries, in the
  // order a reader asks for it: which seat, which stage, which temperature, and
  // what the stiffness split was set to. Only the FIELD LABELS are here — every
  // value is the string the archetype wrote, so the viewer holds no copy of the
  // archetype's vocabulary that could drift from it. Which corner of
  // (fit × temperature) a row describes is the point of a fit stack, and a row
  // that does not say is not legible — the label says it too, but the label is
  // the part of the row that gets clamped, and on the live thermal stacks the
  // corner is at its TAIL ("… @ cold (-20 C)"), which is exactly what a clamp
  // takes off.
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

  function checkRow(stackProj, check) {
    var budget = VA.isBudgetScope(check);
    var scope = VA.VERDICT_SCOPES[check.verdict_scope];
    var zeroWidth = !!(check.zero_width_inputs && check.zero_width_inputs.length);
    var classes = ["rs-row", "rs-row--check"];
    if (budget) classes.push("rs-row--budget");
    if (check.sensitivity) classes.push("rs-row--sensitivity");
    if (zeroWidth) classes.push("rs-row--zero-width");
    var tr = VA.el("tr", classes.join(" "));

    tr.appendChild(checkNameCell(stackProj, check, budget));

    // A `<div>` inside the cell and never `display: flex` on the `<td>`
    // itself: a table cell that is not `display: table-cell` leaves the
    // column model, the browser wraps it in an anonymous cell, and every
    // column after it walks off its own header. The browser tier caught that
    // here -- 128 of 144 cells misaligned -- and the same trap applies to the
    // name cell below.
    var verdict = VA.el("td", "rs-row__verdict");
    var marks = VA.el("div", "rs-marks");
    marks.appendChild(VA.chip("verdict " + VA.verdictClass(check.verdict),
      check.verdict));
    if (scope) {
      if (scope.chip) marks.appendChild(VA.chip("chip--budget", scope.chip, scope.title));
    } else {
      // Not a known scope — say so where the verdict is, rather than rendering
      // a row that looks like an ordinary joint-scope result.
      marks.appendChild(VA.chip("chip--budget", "SCOPE UNKNOWN",
        VA.unlabelledVerdictScopeText(check.verdict_scope)));
    }
    if (check.sensitivity) {
      marks.appendChild(VA.chip("chip--sensitivity", "NOT A RESULT",
        SENSITIVITY_TITLE));
    }
    verdict.appendChild(marks);
    tr.appendChild(verdict);

    tr.appendChild(VA.el("td", "rs-row__criterion", check.criterion));
    intervalCells(tr, check, zeroWidth);
    tr.appendChild(weakestCell(check));
    return tr;
  }

  function pathRow(stackProj, path) {
    var zeroWidth = !!(path.zero_width_inputs && path.zero_width_inputs.length);
    var classes = ["rs-row", "rs-row--path"];
    if (zeroWidth) classes.push("rs-row--zero-width");
    var tr = VA.el("tr", classes.join(" "));
    tr.appendChild(pathNameCell(stackProj, path));
    // NOT a blank pair of cells: a path has no verdict and no criterion, and
    // an empty verdict cell reads exactly like a passing one. The em dash is
    // the page's own "nothing here" mark (VA.fmt prints it for an absent
    // number) and it carries the group's sentence on its hover.
    ["rs-row__verdict", "rs-row__criterion"].forEach(function (className) {
      var td = VA.el("td", className + " muted", "—");
      td.setAttribute("title", RESULT_GROUPS.paths.says);
      tr.appendChild(td);
    });
    intervalCells(tr, path.interval || {}, zeroWidth);
    tr.appendChild(weakestCell(path));
    return tr;
  }

  function intervalCells(tr, interval, zeroWidth) {
    INTERVAL_KEYS.forEach(function (key) {
      var td = VA.el("td", "num", VA.fmt(interval[key]));
      if (zeroWidth && LOWER_BOUND_KEYS.indexOf(key) !== -1) {
        td.className += " num--zero-width";
        td.setAttribute("title", VA.ATTENTION.no_tolerance.title);
      }
      tr.appendChild(td);
    });
  }

  function weakestCell(row) {
    return VA.el("td", "rs-row__weakest",
      VA.chip(VA.confidenceClass(row.worst_confidence),
        VA.CONFIDENCE_LABEL[row.worst_confidence] || "—"));
  }

  // The name cell: the disclosure affordance, the result's own name, its id and
  // the corner it describes.
  //
  // WHAT IS ON THE ROW is what a reader compares without clicking: the result's
  // name (clamped to one line, and whole on the hover -- the record below does
  // NOT repeat it, so the hover is the only place the tail is readable),
  // its id, the corner it describes, and — for a budget — WHAT IT IS A BUDGET
  // FOR. That last one is not a style choice: a budget rendered without the
  // term it is a budget for is the misreading the scope exists to prevent, so
  // the excluded terms cannot fold. They are split at their author's own ` -- `
  // (VA.splitAuthoredFinding), the name on the row and the rationale in the
  // fold, which is the ONE part of the study page's idiom that transferred
  // without a decision.
  //
  // WHAT IS IN THE FOLD is the record at full length, never edited and never
  // summarised: every excluded term whole, the zero-width sentence, the term
  // list with every sign and coefficient, the archetype's configuration block,
  // and the authored guidance.
  //
  // The `check__*` class names are kept for the nodes that hold the RECORD's
  // own prose, even though the frame around them is now `rs-*`. Two of them are
  // enrolled in guards BY NAME — `p.check__guidance` in the banned-string
  // walk's verbatim-prose list, and `#stackview .check__guidance` in the
  // browser tier's measure check — so renaming them would be a rename with no
  // reader-visible effect that silently unhooks two guards.
  function checkNameCell(stackProj, check, budget) {
    var cell = VA.el("td", "rs-row__name");
    var box = VA.el("div", "rs-row__namebox");
    cell.appendChild(box);
    box.appendChild(foldToggle(check.label));
    var text = VA.el("div", "rs-row__text");
    text.appendChild(resultName(check.label));
    var meta = metaLine(cornerChips(check), unitsNote(stackProj, check));
    if (meta) text.appendChild(meta);
    if (check.excluded_terms && check.excluded_terms.length) {
      text.appendChild(excludedLine(check, budget));
    }
    box.appendChild(text);
    return cell;
  }

  function checkRecord(stackProj, check) {
    var body = VA.el("div", "rs-record");
    body.appendChild(recordId(check.check_id));
    if (check.excluded_terms && check.excluded_terms.length) {
      var whole = VA.el("ul", "plainlist");
      check.excluded_terms.forEach(function (term) {
        whole.appendChild(VA.el("li", "check__excludedterm", term));
      });
      body.appendChild(whole);
    }
    if (check.zero_width_inputs && check.zero_width_inputs.length) {
      body.appendChild(VA.el("p", "check__warn",
        "Lower bound only — zero-width inputs: " +
        check.zero_width_inputs.join(", ")));
    }
    body.appendChild(termsLine(stackProj, check.element_terms));
    // The archetype's own corner block, through the one free-form renderer the
    // joint block uses -- it printed `temperature_c` and `stiffness_ratio` raw
    // until 2026-09-16, on the live thermal stacks.
    if (check.configuration && Object.keys(check.configuration).length) {
      var dl = kvList(check.configuration);
      dl.className = "kv kv--tight";
      body.appendChild(dl);
    }
    if (check.guidance) {
      body.appendChild(VA.el("p", "check__guidance", check.guidance));
    }
    return body;
  }

  function pathNameCell(stackProj, path) {
    var cell = VA.el("td", "rs-row__name");
    var box = VA.el("div", "rs-row__namebox");
    cell.appendChild(box);
    box.appendChild(foldToggle(path.label));
    var text = VA.el("div", "rs-row__text");
    text.appendChild(resultName(path.label));
    box.appendChild(text);
    return cell;
  }

  function pathRecord(stackProj, path) {
    var body = VA.el("div", "rs-record");
    body.appendChild(recordId(path.id));
    if (path.zero_width_inputs && path.zero_width_inputs.length) {
      body.appendChild(VA.el("p", "check__warn",
        "Lower bound only — zero-width inputs: " +
        path.zero_width_inputs.join(", ")));
    }
    body.appendChild(termsLine(stackProj, path.element_terms));
    return body;
  }

  function resultName(label) {
    var name = VA.el("span", "rs-name", label);
    // Clamped by CSS to one line, so the whole string has to be reachable
    // without opening anything: the hover is where a reader gets it. The
    // record does NOT carry the label a second time, so this is the only
    // reading of the clamped tail the page offers -- the corner chips on the
    // line below are what make the sixteen tellable apart without it.
    name.setAttribute("title", label);
    return name;
  }

  // The row's second line: WHICH CORNER this result describes, which is the
  // part of a generated label that the clamp takes off (M1's sixteen labels
  // have FOUR distinct forty-character openings between them -- six read
  // `LOWER bearing seat, M1 (hub bore 202.140`, six `UPPER … 132.073`, and the
  // four probes the same two behind a `[SENSITIVITY] ` prefix -- so within a
  // seat the stage and the temperature differ only at the tail).
  //
  // The result's ID is NOT here, and that is a change of mind inside this
  // session rather than an oversight. It was on this line first, as the
  // elements table's `<code>` beside a name is -- but a generated check's id
  // is `lower_seat__hub_to_sleeve__cold`, which is the three chips beside it
  // spelled with underscores, and the pair wrapped the line in two and stood
  // every row up to ~100px. The id is one line into the fold instead, which
  // keeps the affordance it exists for (a reviewer finding the row in the
  // JSON) and costs the scan nothing.
  function metaLine(chips, units) {
    if (!chips.length && !units) return null;
    var meta = VA.el("div", "rs-row__meta");
    chips.forEach(function (chip) { meta.appendChild(chip); });
    if (units) meta.appendChild(units);
    return meta;
  }

  // The id, one line into the fold. `rs-record__id` and not a bare `<code>`
  // so the stylesheet can keep it quiet without reaching every `<code>` in a
  // record.
  function recordId(id) {
    return VA.el("code", "rs-record__id muted", id);
  }

  // The column headers carry the STACK's units. A check that records different
  // ones is therefore a number in a column that is mislabelled for it, which is
  // the one thing deliverable 4 of this handoff rules out — so it says so on
  // its own row instead. No live check is in this state; the guard is here
  // because the alternative to it is a silently wrong column header.
  function unitsNote(stackProj, check) {
    if (!check.units || !stackProj.units || check.units === stackProj.units) {
      return null;
    }
    return VA.chip("chip--alert", "units: " + check.units,
      "This check's own units are " + check.units + ", not the " +
      stackProj.units + " the column headers state.");
  }

  // The budget line, on the row and never in the fold: see checkNameCell.
  function excludedLine(check, budget) {
    var line = VA.el("div", "check__excluded");
    line.appendChild(VA.el("span", "check__excludedlabel",
      budget ? "budget for the missing:" : "excluded:"));
    line.appendChild(VA.el("span", "check__excludedterms",
      check.excluded_terms.map(function (term) {
        return VA.splitAuthoredFinding(term).name;
      }).join("; ")));
    line.setAttribute("title", check.excluded_terms.join("\n"));
    return line;
  }

  function termsLine(stackProj, terms) {
    var inputs = VA.el("div", "check__inputs");
    inputs.appendChild(VA.el("span", "muted", "inputs:"));
    (terms || []).forEach(function (term) {
      var derived = findDerived(stackProj, term.element_id);
      var weighted = typeof term.coefficient === "number" && term.coefficient !== 1;
      inputs.appendChild(VA.chip(
        VA.confidenceClass(derived.confidence) + (weighted ? " chip--weighted" : ""),
        VA.termLabel(term), VA.termTitle(term)));
    });
    return inputs;
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
    // `notelist__note` carries no styling of its own; it says, in the DOM, that
    // this node's text is the STACK's and not the page's. The banned-string
    // guard subtracts the record's own prose before it scans, and could not
    // tell these apart from the viewer's sentences until they had a name
    // (2026-09-16) -- a live note argues an assumption by naming
    // `thermal_fit.stiffness_ratio` and its `source_ref`, which is the record
    // speaking precisely and not something to trim.
    notes.forEach(function (note) {
      list.appendChild(VA.el("li", "notelist__note", note));
    });
    section.appendChild(list);
    return section;
  }
})(window.ViewerApp = window.ViewerApp || {});
