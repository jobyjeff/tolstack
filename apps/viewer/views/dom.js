// Three-line DOM helper shared by the views. Building nodes (rather than
// assembling HTML strings) is what lets the node DOM shim in run_tests.cjs run
// the rendering tests identically to the browser — and it is escape-free by
// construction, since text always goes through textContent.
(function (VA) {
  "use strict";

  // el("td", "num", "4.06") / el("div", "row", [childA, childB])
  VA.el = function (tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content === null || content === undefined) return node;
    if (Array.isArray(content)) {
      content.forEach(function (child) { if (child) node.appendChild(child); });
    } else if (typeof content === "object") {
      node.appendChild(content);
    } else {
      node.textContent = String(content);
    }
    return node;
  };

  // The SVG twin of VA.el, and it is a twin rather than a flag on el() because
  // both halves of it are different: an SVG node must be created in the SVG
  // namespace (document.createElement("path") makes an HTMLUnknownElement that
  // renders nothing), and its class must be set with setAttribute — `className`
  // on an SVG element is a read-only SVGAnimatedString, so `node.className = x`
  // silently does nothing there while working fine on HTML.
  //
  //   VA.svg("circle", "rail__dot", { cx: 12, cy: 30, r: 4 })
  VA.svg = function (tag, className, attrs) {
    var node = document.createElementNS
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);
    if (className) node.setAttribute("class", className);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] !== null && attrs[key] !== undefined) {
          node.setAttribute(key, String(attrs[key]));
        }
      });
    }
    return node;
  };

  // innerHTML = "" rather than a childNodes loop: in a real browser childNodes
  // is a live NodeList with no pop(), and the shim's innerHTML setter clears
  // children too, so this is the one form that behaves the same in both.
  VA.clear = function (node) {
    node.innerHTML = "";
    return node;
  };

  // A labelled pill. `title` becomes the hover tooltip that carries the "why".
  VA.chip = function (className, text, title) {
    var node = VA.el("span", "chip " + (className || ""), text);
    if (title) node.setAttribute("title", title);
    return node;
  };

  // The alert mark as GEOMETRY rather than as a character
  // (viewer_nav_verdict_into_alert_and_icon, 2026-09-22). Jeff, on the nav
  // rail: "reformat the alert icon: get rid of the rounded border around it,
  // make the actual icon larger so it's legible (or replace it with a proper
  // icon/emoji rather than a character)."
  //
  // `VA.ALERT_ICON` -- the `⚠` character -- cannot be made legible on a row.
  // It is sized by `font-size`, so it can only ever be as big as a type step,
  // and the six steps are owned by tests/test_app_type_scale.py: a seventh
  // added to make one triangle bigger would be a scale decision taken by an
  // icon. It also renders through whatever font the platform picks for
  // U+26A0, which on Windows is as often a colour emoji as a glyph -- and a
  // colour emoji ignores the semantic colour the level class sets.
  //
  // A path has neither problem: it is sized in pixels independently of the
  // type scale, it draws the same everywhere, and `currentColor` makes the
  // level class the only thing that decides what colour it is. ONE path with
  // `fill-rule: evenodd`, so the bar and the dot are cut OUT of the triangle
  // instead of drawn over it -- a two-path icon would need a second colour to
  // fill the counter with, and the only right answer for that colour is
  // "whatever is behind the row", which a fill cannot name.
  //
  // Still `⚠` on the elements table's badge, deliberately: this pass is the
  // left-hand nav, and the two remaining glyph sites (that badge and
  // apps/annotate's own) are
  // ISSUE_20260922_the_alert_glyph_is_still_a_character_on_two_rails.
  VA.WARNING_ICON_PATH =
    "M12 3L22.4 21H1.6Z M10.9 9h2.2v5.6h-2.2z M10.9 16.4h2.2v2.2h-2.2z";

  // Big enough to read at 100% zoom on a 13px row, and a PIXEL size rather
  // than a step on the type scale because it is a picture, not text.
  VA.WARNING_ICON_PX = 16;

  VA.warningIcon = function (className) {
    var svg = VA.svg("svg", className || null, {
      viewBox: "0 0 24 24",
      width: VA.WARNING_ICON_PX, height: VA.WARNING_ICON_PX,
      // The badge around it carries the words, as a title and an aria-label,
      // so the picture itself is decoration to a reader who cannot see it.
      "aria-hidden": "true", focusable: "false",
    });
    svg.appendChild(VA.svg("path", null, {
      d: VA.WARNING_ICON_PATH, "fill-rule": "evenodd", fill: "currentColor",
    }));
    return svg;
  };

  // ONE ⚠ per row, the alerts on hover — the badge two surfaces of this app
  // now wear (the elements table's source cell, views/stack.js; the nav rail's
  // study rows, views/nav.js), so it is built once here rather than twice.
  // `VA.ALERT_ICON` is the glyph and `VA.alertsCard` the model behind it, both
  // in viewer.js beside the words they carry.
  //
  // A `cardtrig` over the page's own popover — same trigger class, same
  // tabindex, same three openers (mouseenter / focus / click) — so it inherits
  // the hover-intent corridor, the placement, Escape and the outside-click
  // close. `cardtrig` is claimed only where a card can actually be shown: a
  // trigger cue on a badge that opens nothing is a promise the page cannot
  // keep. The `title` is not a duplicate of the popup; it is what the badge
  // says where there is no card machinery at all (the fast tier's DOM shim, a
  // view called without handlers), so the information is never only in a hover.
  //
  // `opts.stopClick` — whether a click on the badge may reach the row beneath.
  // The nav rail sets it: a click there selects the study and re-renders the
  // rail out from under the badge, and the badge is a disclosure, not a second
  // way in. The elements table does not: its row click opens the same
  // element's detail pane, where every one of these alerts is stated in full.
  // `opts.className` / `opts.icon` — what the badge LOOKS like, the two
  // presentations this app now has for one mark. The default is the chip the
  // elements table wears; the nav rail passes its own class and a drawn icon
  // (`VA.warningIcon`), because a bordered 11px character is not legible at a
  // row's own size. Everything else about the badge — the card wiring, the
  // tooltip, the aria-label, the three openers — is the same on both, which
  // is why this is one builder with two skins rather than two builders.
  VA.alertBadge = function (alerts, cardTitle, onCardShow, opts) {
    opts = opts || {};
    var badge = VA.el("span", opts.className || "chip chip--alert",
      opts.icon || VA.ALERT_ICON);
    badge.setAttribute("title", alerts.map(function (alert) {
      return alert.text + (alert.why ? " — " + alert.why : "");
    }).join("\n"));
    // For a reader with no pointer, and for one who cannot see the glyph: the
    // icon's name is the words it stands for.
    badge.setAttribute("aria-label", alerts.map(function (alert) {
      return alert.text;
    }).join(" "));
    if (!onCardShow) return badge;
    badge.className += " cardtrig";
    badge.setAttribute("tabindex", "0");
    var show = function (event) {
      if (opts.stopClick && event && event.stopPropagation) {
        event.stopPropagation();
      }
      onCardShow(VA.alertsCard(cardTitle, alerts), badge);
    };
    badge.onmouseenter = show;
    badge.onfocus = show;
    badge.onclick = show;
    return badge;
  };

  // The ONE word this app folds things under, on every surface that folds
  // anything: the banner's provenance rows and each hover card's sourcing
  // narrative (viewer_hover_deslop_and_banner_purge, 2026-09-16). One constant
  // rather than one literal per surface, for the reason every vocabulary in
  // this repo is one constant -- a reader who learns what "Data source" hides
  // on a card must find the same word hiding the same kind of thing on the
  // banner, and two literals drift.
  VA.DATA_SOURCE_SUMMARY = "Data source";

  // A small closed-by-default disclosure: `<details><summary>…`, with the body
  // returned beside the box so a caller appends into it.
  //
  //   var d = VA.disclosure("How this crop was matched", "cropprov");
  //   d.body.appendChild(…);  root.appendChild(d.box);
  //
  // A real <details>, not a class-toggling div: the open/close behaviour, the
  // keyboard handling and the marker are the browser's, which is both less code
  // and the one form that still works with JS disabled. The page already uses
  // one for the topology's joint block (views/stack.js's VA.jointBlock).
  //
  // What belongs in one (2026-09-15, Jeff): a fact that is TRUE and worth
  // keeping and is not what the reader came for. The crop's matching
  // provenance is the case that produced this helper — "this restates the
  // concise line above it in jargon". What does NOT belong in one is anything
  // a reader needs to act on, and anything absent: a disclosure is a fold, not
  // a place to hide a gap.
  VA.disclosure = function (summaryText, baseClass) {
    var box = VA.el("details", baseClass);
    box.appendChild(VA.el("summary", baseClass ? baseClass + "__summary" : null,
      summaryText));
    var body = VA.el("div", baseClass ? baseClass + "__body" : null);
    box.appendChild(body);
    return { box: box, body: body };
  };

  // A paragraph of provenance prose: clamped, click to expand, full text on
  // hover. Shared by views/stack.js (a material's note and CINDAS request) and
  // views/detail.js (an export's own note) — kept in one place so a selector for
  // one class never picks up another's behaviour by accident.
  VA.clampedNote = function (baseClass, text) {
    var note = VA.el("div", baseClass, text);
    note.setAttribute("title", "click to expand / collapse");
    note.onclick = function () {
      note.className = note.className.indexOf(baseClass + "--open") === -1
        ? baseClass + " " + baseClass + "--open"
        : baseClass;
    };
    return note;
  };
})(window.ViewerApp = window.ViewerApp || {});
