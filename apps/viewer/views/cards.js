// The hover reference cards (viewer_hover_cards_and_deep_links): the
// citation, alerts, gap and curve cards, rendered into the same fixed-
// positioned popover node the crop popover uses (#croppop, positioned by
// topology_app.js). Cards are hover-only chrome: they live outside the page's
// layout entirely, so opening one structurally cannot disturb the layout
// contracts (full-page scroll, whole-edge hover, leader alignment) -- the
// browser tier measures exactly that claim.
//
// The edge, component and node cards are gone (2026-10-30, a_preview_pane_
// replaces_the_hover_popups_and_one_record_backs_every_mark): the marks of the
// model -- a 3D anchor, a DAG dot or bar, a grid row -- preview their ONE
// record in the right-hand pane instead (element_record.js, views/topology.js's
// VA.renderTopoDetail). What is left here serves the controls that are not
// marks of the model: a stack row's citation, a nav row's alerts, a kinematic
// verdict's limit, a contributor's missing band and a coefficient's curve.
//
// The models are pure (VA.citationCard in viewer.js, the kinematic ones in
// views/kinematic.js); this file only turns one into DOM. The crop body inside
// a card is VA.cropBlock (views/crop.js) -- the same markup the plain crop
// popover renders, not a second copy of it -- and the export block is
// VA.exportBlockNode (views/detail.js), for the same reason.
//
// TWO RULES DECIDE THE SHAPE OF EVERY CARD BELOW (Jeff's 2026-09-16
// de-slopification note, handoff viewer_hover_deslop_and_banner_purge):
//
//   1. ONE document statement per card. A card used to print the same drawing
//      three times -- its own where-line, then the crop block's head restating
//      it ("NAS6403-NAS6420 Rev 4.pdf · sheet 3"), then the matching
//      provenance restating it again in jargon. The where-line is the
//      statement; the picture below it needs no caption saying which file it
//      came from, so a card passes CARD_CROP (omitHead) into every crop it
//      renders.
//   2. ONE fold per card, and all the long-form prose is in it. Jeff: "for
//      now just put all the long form text into a collapsible element (data
//      source)". See sourceFold() below for what goes in and, more
//      importantly, what never does.
(function (VA) {
  "use strict";

  // What a crop rendered INSIDE a card suppresses, and the one place it is
  // spelled: the head that would restate the card's own where-line, and the
  // crop's own second disclosure — its matching provenance goes into the
  // card's single fold instead, so a card never carries two folds.
  var CARD_CROP = { omitHead: true, omitProvenance: true };

  VA.renderHoverCard = function (root, card, images, config, onClose) {
    VA.clear(root);
    root.className = "croppop hovercard hovercard--" + card.kind;

    if (onClose) {
      var close = VA.el("button", "croppop__close", "✕");
      close.setAttribute("title", "close (Esc)");
      close.onclick = onClose;
      root.appendChild(close);
    }

    var source = sourceFold();
    if (card.kind === "citation") citationCard(root, card, images, config, source);
    else if (card.kind === "alerts") alertsCard(root, card);
    else if (card.kind === "gap") gapCard(root, card);
    // A kinematic coefficient across the sweep (views/kinematic.js draws it).
    else if (card.kind === "curve") root.appendChild(VA.kinematicCurveFigure(card.curve, card.title));
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

  // --- the row's alerts, listed (flyout_resize_annotator_filter_and_deselect,
  // deliverable 5) -----------------------------------------------------------
  //
  // What the elements table's one ⚠ badge opens. Each alert is the same word
  // the row used to shout (VA.rowAlerts reads VA.ATTENTION and
  // VA.EXPORT_CHIP_TEXT) plus the sentence that was already behind it as a
  // tooltip -- so consolidating the chips MOVED the words here and revealed the
  // "why", rather than hiding anything.
  //
  // No fold, unlike every other card kind: this whole card is a list of gaps,
  // and views/dom.js's rule is that an absence never goes in a disclosure.
  function alertsCard(root, card) {
    var head = VA.el("div", "hovercard__head");
    head.appendChild(VA.el("h4", null, "Needs attention"));
    root.appendChild(head);
    // Which row's alerts these are -- the badge is one glyph, so the card is
    // the first place the element is named.
    if (card.title) root.appendChild(VA.el("div", "hovercard__where", card.title));
    var list = VA.el("ul", "hovercard__alerts");
    card.alerts.forEach(function (alert) {
      var item = VA.el("li", "hovercard__alert hovercard__alert--" + alert.kind);
      item.appendChild(VA.el("div", "hovercard__alertwhat", alert.text));
      if (alert.why) item.appendChild(VA.el("div", "hovercard__alertwhy", alert.why));
      list.appendChild(item);
    });
    root.appendChild(list);
  }

  // --- a kinematic contributor with no band: what would resolve it -----------
  //
  // (the_kinematic_page_keeps_the_dag_and_says_each_contributor_once,
  // 2026-10-26.) The `no band on file` chip's card: which contributor, why it
  // has no band, and the drawing to read for one -- each with whether a copy
  // is on file (VA.kinematicGapCard, views/kinematic.js). No fold, for the
  // alerts card's reason: the whole card is about an absence.
  function gapCard(root, card) {
    var head = VA.el("div", "hovercard__head");
    head.appendChild(VA.el("h4", null, "No band on file"));
    root.appendChild(head);
    if (card.title) root.appendChild(VA.el("div", "hovercard__where", card.title));
    if (card.why) root.appendChild(VA.el("p", "hovercard__note", card.why));
    if (!card.drawings || !card.drawings.length) return;
    root.appendChild(VA.el("div", "hovercard__cropkey muted", "Read for a band"));
    var list = VA.el("ul", "hovercard__alerts");
    card.drawings.forEach(function (drawing) {
      var item = VA.el("li", "hovercard__alert hovercard__gapdrawing" +
        (drawing.onFile ? " hovercard__gapdrawing--onfile" : ""));
      item.appendChild(VA.el("div", "hovercard__alertwhat", drawing.label));
      item.appendChild(VA.el("div", "hovercard__alertwhy", drawing.state));
      list.appendChild(item);
    });
    root.appendChild(list);
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
    if (card.generalNote) {
      root.appendChild(VA.el("div", "hovercard__generalnote", card.generalNote));
    }
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

})(window.ViewerApp = window.ViewerApp || {});
