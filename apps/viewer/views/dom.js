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

  // The alert mark itself -- `VA.warningIcon`, `VA.WARNING_ICON_PATH` and
  // `VA.WARNING_ICON_PX` -- is in `apps/viewer/warning_icon.js`, a file of its
  // own since 2026-09-22 because `apps/annotate` wears the same mark and
  // cannot load this one. Its header carries the argument for drawing the
  // triangle rather than typing it.

  // ONE alert mark per row, the alerts on hover — the badge three surfaces
  // now wear (the elements table's source cell and the materials table's,
  // views/stack.js; the nav rail's rows, views/nav.js), so it is built once
  // here rather than three times. `VA.alertsCard` is the model behind it and
  // `VA.rowAlerts` / `VA.materialRowAlerts` / `VA.studyNavAlerts` decide what
  // goes in it, all in viewer.js and topology.js beside the words they carry.
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
  // way in. The tables do not: a row click opens the same row's detail pane,
  // where every one of these alerts is stated in full.
  //
  // `opts.className` / `opts.icon` — what the badge LOOKS like. THE DEFAULT IS
  // THE MARK ITSELF: a drawn triangle (`VA.warningIcon`) with no chip framing,
  // which is what both tables wear. The nav rail overrides both, because its
  // class carries the two semantic levels a table row does not have (amber for
  // "look at this", red for a verdict of `fail`) — nothing else about the
  // badge differs, which is why this is one builder with a skin rather than
  // two builders.
  //
  // It defaulted to the `⚠` CHARACTER inside a `chip chip--alert` until
  // 2026-09-22, and the frame went WITH the character rather than separately.
  // Two reasons, and neither is the one that first looked obvious:
  //
  //   * a border around the only alert marker on a row is a second mark. That
  //     is the argument `.chip--alert` itself made against the filled chips it
  //     replaced on 2026-09-16, and the one the nav rail's `.navstatus` made
  //     against `.chip--alert` in turn;
  //   * unframed, the mark is the one thing in a cell of three or four
  //     outlined chips that is different in KIND — which is exactly what it
  //     is. The chips state the row's provenance; this says "distrust the
  //     number". A pill among pills reads as a fifth fact.
  //
  // NOT because a framed picture would have grown the row: that was the first
  // argument written here and it was measured wrong in the same session. A
  // `.chip` renders 21px tall (micro type at the body's line-height, plus
  // padding and border) against the mark's 16, so a framed mark would have
  // fitted inside the height the chips already set. The browser tier carries
  // the measurement, beside the check that caught it.
  VA.alertBadge = function (alerts, cardTitle, onCardShow, opts) {
    opts = opts || {};
    var badge = VA.el("span", opts.className || "rowalert",
      opts.icon || VA.warningIcon("rowalert__mark"));
    badge.setAttribute("title", alerts.map(function (alert) {
      return alert.text + (alert.why ? " — " + alert.why : "");
    }).join("\n"));
    // For a reader with no pointer, and for one who cannot see the mark: the
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
