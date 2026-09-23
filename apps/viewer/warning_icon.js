// The alert mark, as GEOMETRY rather than as a character -- and ONE definition
// of it for both web apps.
//
// It arrived in `views/dom.js` (viewer_nav_verdict_into_alert_and_icon,
// 2026-09-22) for the nav rail, and moved here on 2026-09-22 when the other
// two badges stopped typing the `⚠` character too
// (ISSUE_20260922_the_alert_glyph_is_still_a_character_on_two_rails). Jeff, on
// the annotator's badge: "same purpose, just in a different place" -- so it is
// the same mark, and a mark drawn twice is a mark that drifts.
//
// WHY A FILE OF ITS OWN, rather than a deliberate copy in
// `apps/annotate/binding_state.js`: `apps/annotate` already loads two files
// across the app boundary for exactly this reason -- `../viewer/storage/
// adapter.js` (the shared "may this page ask for a folder grant?" decision)
// and `../viewer/reader_facing_bans.js` (the shared list of strings neither
// app may print). Both of those headers say the same thing: a second copy of a
// shared vocabulary is this repo's most-repeated defect. What it could NOT
// load is `views/dom.js`, which is the viewer's whole view-helper namespace;
// so the mark comes out of there into a file the size of the thing it defines.
// It lives under `apps/viewer/` rather than a new shared dir for the
// mechanical reason `reader_facing_bans.js` does: the browser tier serves
// `apps/viewer/test.html` from an http root AT `apps/viewer` and forbids paths
// outside it, so a shared file one directory up is a 403 there.
//
// WHY DRAWN AT ALL, and it is not taste:
//
//   * a `⚠` is sized by `font-size`, so it can only ever be as large as a step
//     on the type scale, and the six steps are owned by
//     tests/test_app_type_scale.py: a seventh added to make one triangle
//     bigger would be a scale decision taken by an icon;
//   * U+26A0 renders through whatever font the platform picks for it, which on
//     Windows is as often a COLOUR EMOJI as a monochrome glyph -- and a colour
//     emoji ignores the semantic colour the level class sets, which is the one
//     thing the mark exists to say at a glance.
//
// A path has neither problem: it is sized in pixels independently of the type
// scale, it draws the same everywhere, and `currentColor` makes the level class
// the only thing that decides its colour.
//
// Classic script, and it attaches to the SAME `ViewerApp` namespace on both
// pages -- `storage/adapter.js`'s precedent exactly.
(function (VA) {
  "use strict";

  // ONE path with `fill-rule: evenodd`, so the bar and the dot are cut OUT of
  // the triangle instead of drawn over it -- a two-path icon would need a
  // second colour to fill the counter with, and the only right answer for that
  // colour is "whatever is behind the row", which a fill cannot name.
  VA.WARNING_ICON_PATH =
    "M12 3L22.4 21H1.6Z M10.9 9h2.2v5.6h-2.2z M10.9 16.4h2.2v2.2h-2.2z";

  // Big enough to read at 100% zoom on a 13px row, and a PIXEL size rather
  // than a step on the type scale because it is a picture, not text
  // (docs/DESIGN_TYPE_AND_COLOUR.md names this constant as its one home).
  VA.WARNING_ICON_PX = 16;

  // Not `VA.svg` (views/dom.js), deliberately: this file is loaded by a page
  // that does not have views/dom.js, so the four lines below are the price of
  // the mark being defined once instead of the whole helper namespace being
  // shared. An SVG node must be created in the SVG namespace -- an element
  // from `document.createElement("path")` renders nothing -- and its class
  // must be set with setAttribute, because `className` on an SVG element is a
  // read-only SVGAnimatedString that swallows an assignment in silence.
  function node(tag, className, attrs) {
    var el = document.createElementNS
      ? document.createElementNS("http://www.w3.org/2000/svg", tag)
      : document.createElement(tag);
    if (className) el.setAttribute("class", className);
    Object.keys(attrs || {}).forEach(function (key) {
      el.setAttribute(key, String(attrs[key]));
    });
    return el;
  }

  VA.warningIcon = function (className) {
    var svg = node("svg", className || null, {
      viewBox: "0 0 24 24",
      width: VA.WARNING_ICON_PX, height: VA.WARNING_ICON_PX,
      // The badge around it carries the words, as a title and an aria-label,
      // so the picture itself is decoration to a reader who cannot see it.
      "aria-hidden": "true", focusable: "false",
    });
    svg.appendChild(node("path", null, {
      d: VA.WARNING_ICON_PATH, "fill-rule": "evenodd", fill: "currentColor",
    }));
    return svg;
  };
})(window.ViewerApp = window.ViewerApp || {});
