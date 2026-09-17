// The hover reference cards (viewer_hover_cards_and_deep_links): edge,
// component, node and citation cards, rendered into the same absolutely-
// positioned popover node the crop popover uses (#croppop, positioned by
// topology_app.js). Cards are hover-only chrome: they live outside the page's
// layout entirely, so opening one structurally cannot disturb the layout
// contracts (full-page scroll, whole-edge hover, leader alignment) — the
// browser tier measures exactly that claim.
//
// The models are pure (VA.edgeCard / VA.componentCard / VA.nodeCard in
// topology.js, VA.citationCard in viewer.js); this file only turns one into
// DOM. The crop
// body inside a card is VA.cropBlock (views/crop.js) — the same markup the
// plain crop popover renders, not a second copy of it — and the export block
// is VA.exportBlockNode (views/detail.js), for the same reason.
//
// TWO RULES DECIDE THE SHAPE OF EVERY CARD BELOW (Jeff's 2026-09-16
// de-slopification note, handoff viewer_hover_deslop_and_banner_purge):
//
//   1. ONE document statement per card. A card used to print the same drawing
//      three times — its own where-line, then the crop block's head restating
//      it ("NAS6403-NAS6420 Rev 4.pdf · sheet 3"), then the matching
//      provenance restating it again in jargon. The where-line is the
//      statement; the picture below it needs no caption saying which file it
//      came from, so a card passes CARD_CROP (omitHead) into every crop it
//      renders. A part number is likewise never printed on two consecutive
//      lines — see VA.componentDrawingText, which is why the 214820-002
//      bushing's card no longer says "214820-002 plain bushing / drawing
//      214820-002".
//   2. ONE fold per card, and all the long-form prose is in it. Jeff: "for
//      now just put all the long form text into a collapsible element (data
//      source)". See sourceFold() below for what goes in and, more
//      importantly, what never does.
//
// `annotate` ({mount, onAnnotate}) is the flyout wiring (handoff
// annotate_affordances_flyout_and_mesh_gating): where the annotator is served
// beside this page AND a launcher is handed in, a card's 3D affordance drives
// the ONE flyout panel the toolbar and the detail pane already drive, instead
// of opening a second tab beside it. Where the probe failed — file:// without
// the sibling app, a server without the mount — it stays exactly the link it
// has always been. A card only carries the affordance at all when the part has
// an installed mesh; that gate is the model's (VA.edgeCard/VA.componentCard),
// not this file's.
(function (VA) {
  "use strict";

  // What a crop rendered INSIDE a card suppresses, and the one place it is
  // spelled: the head that would restate the card's own where-line, and the
  // crop's own second disclosure — its matching provenance goes into the
  // card's single fold instead, so a card never carries two folds.
  var CARD_CROP = { omitHead: true, omitProvenance: true };

  VA.renderHoverCard = function (root, card, images, config, onClose, annotate) {
    VA.clear(root);
    root.className = "croppop hovercard hovercard--" + card.kind;

    if (onClose) {
      var close = VA.el("button", "croppop__close", "✕");
      close.setAttribute("title", "close (Esc)");
      close.onclick = onClose;
      root.appendChild(close);
    }

    var source = sourceFold();
    if (card.kind === "edge") edgeCard(root, card, images, config, annotate, source);
    else if (card.kind === "component") componentCard(root, card, images, config, annotate, source);
    else if (card.kind === "node") nodeCard(root, card, images, config, source);
    else if (card.kind === "citation") citationCard(root, card, images, config, source);
    else {
      // A card kind this renderer has no branch for is said out loud, the
      // same posture every enumerated field on this surface takes.
      root.appendChild(VA.el("p", "croppop__reason",
        "hover card kind " + JSON.stringify(card.kind) + ", which this viewer " +
        "has no branch for"));
    }
    // Last, so the fold sits under the picture and the links rather than
    // between the reader and them.
    source.attach(root);
    return root;
  };

  // --- the one fold a card carries ------------------------------------------
  //
  // Collected during the render and attached at the end, because what goes in
  // is produced at four different points (the note, the export block, one
  // provenance line per crop) and Jeff asked for ONE collapsible element, not
  // one per carrier. A card with nothing long-form renders no fold at all: an
  // empty disclosure is a control that promises something and opens on air.
  //
  // What NEVER comes in here, and the rule is views/dom.js's: an absence. A
  // card's "no crop, because …" line, its not-to-scale render note, and a LOUD
  // export state (an unestablished identity — the one thing on a card that
  // says the value may not be backed by the bytes it claims) all stay in the
  // open. A disclosure is a fold, not a place to hide a gap.
  function sourceFold() {
    var collected = [];
    return {
      add: function (node) { if (node) collected.push(node); },
      text: function (className, text) {
        if (text) collected.push(VA.el("div", className, text));
      },
      attach: function (root) {
        if (!collected.length) return null;
        var fold = VA.disclosure(VA.DATA_SOURCE_SUMMARY, "hovercard__source");
        collected.forEach(function (node) { fold.body.appendChild(node); });
        root.appendChild(fold.box);
        return fold;
      },
    };
  }

  // A record's own prose, split by PLACEMENT and never by content: the lead
  // sentence stays in the open as the card's short description, the note in
  // full goes in the fold. VA.leadSentence returns a prefix of the string or
  // the whole of it — nothing is reworded and nothing is dropped, and the
  // whole note is one click away in the same card. A one-sentence note renders
  // once, in the open, and puts nothing in the fold.
  //
  // Both classes are already in tests.js's VERBATIM_PROSE_CLASSES, and that is
  // not an accident of naming: this is still the DOCUMENT speaking, so the
  // schema-jargon scan must keep skipping it in both positions.
  function noteBlock(root, note, source) {
    if (!note) return;
    var lead = VA.leadSentence(note);
    root.appendChild(VA.clampedNote("hovercard__note", lead));
    if (lead !== String(note).trim()) {
      source.add(VA.el("div", "hovercard__notefull", note));
    }
  }

  // --- the edge card: the dimension's own reference material -----------------
  //
  // Crop(s) of the actual tolerance annotation, the citation they came off,
  // and the deep links out. `card.crops` is a list (see VA.edgeCard for why —
  // an interface's two half-sides are usually different parts/drawings, so
  // both sides belong here once both are cropped); each entry renders its own
  // crop block, an unresolved one renders its reason, and an edge with no
  // crop key states which fact that is rather than showing a placeholder.
  // Every card's heading: the thing's own NAME, and its id nowhere a reader
  // reads. The id used to sit beside the name in a <code> chip on all three
  // cards; since 2026-09-15 it rides the heading's hover title instead, which
  // keeps it available for a deep link or a debugging session without printing
  // internal plumbing over the name of the part in front of you.
  function cardHead(card) {
    var head = VA.el("div", "hovercard__head");
    var title = VA.el("h4", null, card.title);
    if (card.id) title.setAttribute("title", card.id);
    head.appendChild(title);
    return head;
  }

  function edgeCard(root, card, images, config, annotate, source) {
    root.appendChild(cardHead(card));

    var chips = VA.el("div", "hovercard__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(card.confidence),
      card.confidence === null ? "no value"
        : (VA.CONFIDENCE_LABEL[card.confidence] || card.confidence)));
    root.appendChild(chips);
    root.appendChild(VA.el("div", "hovercard__where",
      card.partLabel ? "a dimension of " + card.partLabel : "across a clearance"));

    // The card's ONE document statement. It is not a duplicate of the line
    // above it: that one says which PART the dimension belongs to, this one
    // says which document it was read off -- and where the part is NAMED after
    // that document (four live edges are), the number is left off here rather
    // than printed on two consecutive lines. See VA.citationWhere's second
    // argument.
    if (card.citation) {
      root.appendChild(VA.el("div", "hovercard__cited",
        "cited at: " + VA.citationWhere(card.citation, card.partLabel)));
    }

    // The crop KEY line is gone (2026-09-15): it printed which of the crop
    // index's two key spaces addressed this crop, in the ids of a stack and an
    // element -- internal plumbing, in internal ids, above a picture that
    // names its own document on the line below it.
    card.crops.forEach(function (crop) {
      root.appendChild(cropOrReason(crop.entry, images, config, source));
    });
    if (card.noCropReason) {
      root.appendChild(VA.el("p", "croppop__reason", card.noCropReason));
    }

    // A fact about the picture, not about the edge (VA.edgeCard's `opts`): the
    // DAG's own bar opens this card INSTEAD of its native title, so a floored
    // bar's not-to-scale warning arrives here or not at all.
    if (card.renderNote) {
      root.appendChild(VA.el("div", "hovercard__rendernote muted", card.renderNote));
    }

    if (card.annotateParams) {
      root.appendChild(annotateLine(card.annotateParams, annotate,
        "annotate this in 3D →",
        "resolve which physical feature this row means, on the part's 3D " +
        "model, with this edge selected — select + tag, no measurement"));
    }
  }

  // --- the component card: what the merged cell's part IS --------------------
  function componentCard(root, card, images, config, annotate, source) {
    root.appendChild(cardHead(card));

    // What identifies this part, said ONCE. A Joby part has a DRAWING; a
    // standard part legitimately has none and is identified instead by the
    // standard sheet its dimensions come off (VA.partReferences), which is what
    // this line says then. It said "no drawing recorded for this part" until
    // 2026-09-15 -- true of the field and wrong about the part: nothing is
    // missing when a NAS bolt has no Joby drawing. A part with neither gets no
    // line at all.
    //
    // The drawing half goes through VA.componentDrawingText, which returns
    // null once the heading above has already printed the number -- most parts
    // here are named after their drawing, and that produced the same part
    // number on two consecutive lines.
    if (card.drawing) {
      var drawing = VA.componentDrawingText(card.title, card.drawing, card.revision);
      if (drawing) root.appendChild(VA.el("div", "hovercard__where", drawing));
    } else if (card.references.length) {
      // Each reference says for itself whether the numbers read off it are
      // verified (VA.referenceText) -- a part can cite a traced drawing for one
      // dimension and an untraced workbook for another, and one qualifier on
      // the whole line would be wrong about one of them either way.
      var where = VA.el("div", "hovercard__where",
        (card.standardPart ? "standard part — dimensions from " : "dimensions from ") +
        card.references.map(VA.referenceText).join("; "));
      if (card.references.some(function (r) { return r.unverified; })) {
        where.setAttribute("title", VA.ATTENTION.unverified.title);
      }
      root.appendChild(where);
    }
    noteBlock(root, card.note, source);

    // The derived thumbnail: the first resolved crop of this part's OWN
    // rows' annotations (VA.componentCard's comment says why that is the
    // honest derivation). A part with none gets NOTHING here — a placeholder
    // would read as "not built yet" when the truth is "no image is derivable".
    //
    // The caption says which of the part's rows the picture is OF, in that
    // row's own display name. It wrapped the name in backticks until
    // 2026-09-16, which dressed a reader-facing noun phrase up as an internal
    // id (Jeff: "a backticked internal edge id is not user copy").
    if (card.thumbs.length) {
      var thumb = card.thumbs[0];
      root.appendChild(VA.el("div", "hovercard__cropkey muted",
        "crop of its " + thumb.edgeName + " annotation" +
        (card.thumbs.length > 1
          ? " — " + (card.thumbs.length - 1) + " more on its rows"
          : "")));
      root.appendChild(cropOrReason(thumb.entry, images, config, source));
    }

    if (card.annotateParams) {
      root.appendChild(annotateLine(card.annotateParams, annotate,
        "view this part in 3D →",
        "opens the 3D annotation surface with " + card.title + " on its own"));
    }
  }

  // --- the node card: the interface, and the parts that meet at it -----------
  //
  // (viewer_dag_hover_cards.) A node has no dimension and no crop of its own --
  // it is a location -- so the card says which parts meet there and shows
  // THEIR pictures, each one the part's own component-card thumbnail. An
  // internal node says it is internal rather than leaving a one-sided list to
  // read as a missing side, and a clearance side is named (VA.CLEARANCE_SIDE_
  // LABEL) rather than skipped. A side with no resolvable crop renders no
  // image slot at all.
  function nodeCard(root, card, images, config, source) {
    root.appendChild(cardHead(card));

    var chips = VA.el("div", "hovercard__chips");
    chips.appendChild(VA.chip("chip--kind", card.nodeKind));
    chips.appendChild(VA.chip("chip--kind", card.degree + " edge(s)"));
    if (card.branch) chips.appendChild(VA.chip("chip--branch", "BRANCH POINT"));
    root.appendChild(chips);

    var labels = card.sides.map(function (side) { return side.label; });
    root.appendChild(VA.el("div", "hovercard__where",
      card.internal
        ? "internal to " + (labels[0] || "no part")
        : labels.join(" ⇔ ")));

    // Same no-repeat rule as the edge card's: the sides were just named, and
    // a side named after the document is not made clearer by saying it twice.
    if (card.citation) {
      root.appendChild(VA.el("div", "hovercard__cited",
        "cited at: " + VA.citationWhere(card.citation, labels.join(" "))));
    }
    noteBlock(root, card.note, source);

    var thumbed = card.sides.filter(function (side) { return !!side.thumb; });
    root.appendChild(VA.el("p", "croppop__reason", card.internal
      ? "An interface is a location, not a value: every dimension meeting " +
        "here belongs to one part, so there is no boundary and no leader line."
      : "An interface is a location, not a value — there is no dimension " +
        "and no crop behind it. The dimensions are the edges either side."));

    // One where-line per side, and it is that side's ONE document statement:
    // the crop beneath it renders no head. The trailing "— crop of its `X`
    // annotation" clause went on 2026-09-16 with the backticks that carried it
    // (the same complaint as the component card's caption); which of that
    // part's rows the picture is of is the component card's own business, and
    // that card is one hover away.
    thumbed.forEach(function (side) {
      var drawing = VA.componentDrawingText(side.label, side.drawing, side.revision);
      root.appendChild(VA.el("div", "hovercard__cropkey muted",
        side.label + (drawing ? " · " + drawing : "")));
      root.appendChild(cropOrReason(side.thumb.entry, images, config, source));
    });
  }

  // --- the citation card: the spec-sheet reference ---------------------------
  //
  // The full citation the compact row has no space for — the where-ref, the
  // callout as printed, the note, the export/identity block (which BYTES back
  // the value, with the run links where a run is behind them), and the crop of
  // the cited sheet where one resolved. For a spec citation the crop is the
  // spec sheet itself, which is what makes this the spec-sheet card the stack
  // view's right pane already renders — as a hover.
  function citationCard(root, card, images, config, source) {
    var head = VA.el("div", "hovercard__head");
    head.appendChild(VA.el("h4", null, "Citation"));
    root.appendChild(head);

    var chips = VA.el("div", "hovercard__chips");
    if (card.confidence) {
      chips.appendChild(VA.chip(VA.confidenceClass(card.confidence),
        VA.CONFIDENCE_LABEL[card.confidence] || card.confidence));
    }
    if (card.citationKind) chips.appendChild(VA.chip("chip--kind", card.citationKind));
    root.appendChild(chips);

    // This card's ONE document statement (VA.citationWhere): document · rev ·
    // sheet · view · zone.
    root.appendChild(VA.el("div", "hovercard__where", card.title));
    if (card.callout) root.appendChild(VA.el("div", "hovercard__callout", card.callout));
    noteBlock(root, card.note, source);

    // The export/identity narrative. Folded where it is QUIET — an
    // `established` export or no export block at all, which is what nearly
    // every live citation carries, and on those it is four lines saying the
    // value came off the bytes it claims. (No count here on purpose: the
    // number that used to be written in this comment was wrong in both halves
    // and nothing paired it against the projection. How many is a question for
    // the live data, not for a comment.)
    //
    // A LOUD state (VA.exportProvenance's own flag: an unestablished export, a
    // status or identity rule this viewer cannot explain) stays in the OPEN,
    // because that one is a finding about the value and folding a finding away
    // is the one thing this disclosure must never do. It is not hypothetical —
    // it is `pitch_link_to_pitch_plate/bushing_214820`, whose drawing is not in
    // this repo at all.
    if (card.provenance) {
      var block = VA.exportBlockNode(card.provenance, {
        config: config,
        exportBlock: card.exportBlock,
        cropEntry: card.entry,
      });
      if (card.provenance.loud) root.appendChild(block);
      else source.add(block);
    }

    if (card.entry && card.entry.status === "resolved") {
      root.appendChild(cropOrReason(card.entry, images, config, source));
    }
  }

  // A resolved entry renders the shared crop block; an unresolved one renders
  // its headline and reason — the same four-states-not-one rule the plain
  // popover follows, because "no crop" is never one fact.
  //
  // The resolved branch hands its matching provenance up to the card's single
  // fold rather than letting the block open a second one of its own; the
  // unresolved branch is an ABSENCE and stays entirely in the open.
  function cropOrReason(entry, images, config, source) {
    if (entry && entry.status === "resolved") {
      source.text("hovercard__cropprov", VA.cropProvenanceLine(entry));
      // `images` goes through as well as the one PNG: a balloon crop carries a
      // parts-list row companion, which is a second image out of the same map.
      return VA.cropBlock(entry, images ? images[entry.png] : null, config,
                          images, CARD_CROP);
    }
    var box = VA.el("div", "hovercard__noresolve");
    box.appendChild(VA.el("div", "croppop__head",
      VA.cropUnresolvedHeadline(entry ? entry.status : "no-entry")));
    box.appendChild(VA.el("p", "croppop__reason", (entry && entry.reason) || ""));
    return box;
  }

  // One affordance, two carriers — the flyout where it exists, a plain new-tab
  // link where it does not. Same params either way: the launcher hands them to
  // VA.annotateExecCommands, the link to VA.annotateLink, and those two mirror
  // each other param for param (viewer.js).
  function annotateLine(params, annotate, text, title) {
    var line = VA.el("div", "hovercard__links");
    var launch = annotate && annotate.mount && annotate.onAnnotate;
    if (launch) {
      var button = VA.el("button", "croppop__link croppop__link--btn hovercard__3d", text);
      button.setAttribute("title", title);
      button.onclick = function () { annotate.onAnnotate(params); };
      line.appendChild(button);
      return line;
    }
    var a = VA.el("a", "croppop__link hovercard__3d", text);
    a.setAttribute("href", VA.annotateLink({
      topologyId: params.topologyId,
      edgeId: params.edgeId,
      part: params.part,
    }));
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
    a.setAttribute("title", title);
    line.appendChild(a);
    return line;
  }
})(window.ViewerApp = window.ViewerApp || {});
