// The hover reference cards (viewer_hover_cards_and_deep_links): edge,
// component and citation cards, rendered into the same absolutely-positioned
// popover node the crop popover uses (#croppop, positioned by
// topology_app.js). Cards are hover-only chrome: they live outside the page's
// layout entirely, so opening one structurally cannot disturb the layout
// contracts (full-page scroll, whole-edge hover, leader alignment) — the
// browser tier measures exactly that claim.
//
// The models are pure (VA.edgeCard / VA.componentCard in topology.js,
// VA.citationCard in viewer.js); this file only turns one into DOM. The crop
// body inside a card is VA.cropBlock (views/crop.js) — the same markup the
// plain crop popover renders, not a second copy of it — and the export block
// is VA.exportBlockNode (views/detail.js), for the same reason.
(function (VA) {
  "use strict";

  VA.renderHoverCard = function (root, card, images, config, onClose) {
    VA.clear(root);
    root.className = "croppop hovercard hovercard--" + card.kind;

    if (onClose) {
      var close = VA.el("button", "croppop__close", "✕");
      close.setAttribute("title", "close (Esc)");
      close.onclick = onClose;
      root.appendChild(close);
    }

    if (card.kind === "edge") edgeCard(root, card, images, config);
    else if (card.kind === "component") componentCard(root, card, images, config);
    else if (card.kind === "citation") citationCard(root, card, images, config);
    else {
      // A card kind this renderer has no branch for is said out loud, the
      // same posture every enumerated field on this surface takes.
      root.appendChild(VA.el("p", "croppop__reason",
        "hover card kind " + JSON.stringify(card.kind) + ", which this viewer " +
        "has no branch for"));
    }
    return root;
  };

  // --- the edge card: the dimension's own reference material -----------------
  //
  // Crop(s) of the actual tolerance annotation, the citation they came off,
  // and the deep links out. `card.crops` is a list (see VA.edgeCard for why —
  // an interface's two half-sides are usually different parts/drawings, so
  // both sides belong here once both are cropped); each entry renders its own
  // crop block, an unresolved one renders its reason, and an edge with no
  // crop key states which fact that is rather than showing a placeholder.
  function edgeCard(root, card, images, config) {
    var head = VA.el("div", "hovercard__head");
    head.appendChild(VA.el("h4", null, card.title));
    head.appendChild(VA.el("code", "muted", card.id));
    root.appendChild(head);

    var chips = VA.el("div", "hovercard__chips");
    chips.appendChild(VA.chip(VA.confidenceClass(card.confidence),
      card.confidence === null ? "no value"
        : (VA.CONFIDENCE_LABEL[card.confidence] || card.confidence)));
    root.appendChild(chips);
    root.appendChild(VA.el("div", "hovercard__where",
      card.part ? "a dimension of " + card.part : "across a clearance"));

    if (card.citation) {
      root.appendChild(VA.el("div", "hovercard__cited",
        "cited at: " + VA.citationWhere(card.citation)));
    }

    card.crops.forEach(function (crop) {
      root.appendChild(VA.el("div", "hovercard__cropkey muted",
        VA.cropKeyText(crop.key)));
      root.appendChild(cropOrReason(crop.entry, images, config));
    });
    if (card.noCropReason) {
      root.appendChild(VA.el("p", "croppop__reason", card.noCropReason));
    }

    if (card.annotateParams) {
      root.appendChild(annotateLine(card.annotateParams,
        "annotate this in 3D →",
        "opens apps/annotate/ with this edge selected, to resolve which " +
        "physical feature the row means — select + tag, no measurement"));
    }
  }

  // --- the component card: what the merged cell's part IS --------------------
  function componentCard(root, card, images, config) {
    var head = VA.el("div", "hovercard__head");
    head.appendChild(VA.el("h4", null, card.title));
    head.appendChild(VA.el("code", "muted", card.id));
    root.appendChild(head);

    if (card.drawing) {
      root.appendChild(VA.el("div", "hovercard__where",
        "drawing " + card.drawing + (card.revision ? " rev " + card.revision : "")));
    } else {
      root.appendChild(VA.el("div", "hovercard__where muted",
        "no drawing recorded for this part"));
    }
    if (card.note) root.appendChild(VA.clampedNote("hovercard__note", card.note));

    // The derived thumbnail: the first resolved crop of this part's OWN
    // rows' annotations (VA.componentCard's comment says why that is the
    // honest derivation). A part with none gets NOTHING here — a placeholder
    // would read as "not built yet" when the truth is "no image is derivable".
    if (card.thumbs.length) {
      var thumb = card.thumbs[0];
      root.appendChild(VA.el("div", "hovercard__cropkey muted",
        "crop of its `" + thumb.edgeName + "` annotation" +
        (card.thumbs.length > 1
          ? " — " + (card.thumbs.length - 1) + " more on its rows"
          : "")));
      root.appendChild(cropOrReason(thumb.entry, images, config));
    }

    if (card.annotateParams) {
      root.appendChild(annotateLine(card.annotateParams,
        "view this part in 3D →",
        "opens apps/annotate/ isolating " + card.id +
        ", if a mesh for it is installed"));
    }
  }

  // --- the citation card: the spec-sheet reference ---------------------------
  //
  // The full citation the compact row has no space for — the where-ref, the
  // callout as printed, the note in full, the export/identity block (which
  // BYTES back the value, with the run links where a run is behind them), and
  // the crop of the cited sheet where one resolved. For a spec citation the
  // crop is the spec sheet itself, which is what makes this the spec-sheet
  // card the stack view's right pane already renders — as a hover.
  function citationCard(root, card, images, config) {
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

    root.appendChild(VA.el("div", "hovercard__where", card.title));
    if (card.callout) root.appendChild(VA.el("div", "hovercard__callout", card.callout));
    if (card.note) root.appendChild(VA.el("div", "hovercard__notefull", card.note));

    if (card.provenance) {
      root.appendChild(VA.exportBlockNode(card.provenance, {
        config: config,
        exportBlock: card.exportBlock,
        cropEntry: card.entry,
      }));
    }

    if (card.entry && card.entry.status === "resolved") {
      root.appendChild(cropOrReason(card.entry, images, config));
    }
  }

  // A resolved entry renders the shared crop block; an unresolved one renders
  // its headline and reason — the same four-states-not-one rule the plain
  // popover follows, because "no crop" is never one fact.
  function cropOrReason(entry, images, config) {
    if (entry && entry.status === "resolved") {
      return VA.cropBlock(entry, images ? images[entry.png] : null, config);
    }
    var box = VA.el("div", "hovercard__noresolve");
    box.appendChild(VA.el("div", "croppop__head",
      VA.cropUnresolvedHeadline(entry ? entry.status : "no-entry")));
    box.appendChild(VA.el("p", "croppop__reason", (entry && entry.reason) || ""));
    return box;
  }

  function annotateLine(params, text, title) {
    var line = VA.el("div", "hovercard__links");
    var a = VA.el("a", "croppop__link", text);
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
