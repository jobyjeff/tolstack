// The crop lightbox: one crop, near-full-viewport, zoom and pan, with the
// highlight boxes still on it (handoff crop_lightbox_zoom_viewer, 2026-09-16).
//
// Jeff's note: "selection box style sources (hilighted cells in the datasheet
// tables etc) are moving in the right direction, but thumbnail is too small to
// be legible… Maybe a button in the thumbnail that lets you launch it into a
// separate, full size viewer (either a popup or separate page) that allows you
// to zoom/pan?"
//
// Three decisions worth knowing before changing anything here:
//
//   1. **One launcher, because there is one crop builder.** The button lives in
//      VA.cropFigure (views/crop.js), which is the single builder behind every
//      surface that shows a crop — the plain popover, the hover cards, both
//      preview panes, a balloon crop's parts-list companion. So the affordance
//      did not have to be added to five surfaces and cannot be missing from a
//      sixth. The grid's own inline `tvthumb` is the one crop image on the page
//      that is NOT a cropFigure; it rides the hover card its click already
//      opens, and that card's figure carries the button (see the README).
//   2. **A `<dialog>`, shown modally.** The page already hosts three
//      (`#legend-dialog`, `#worksheet-dialog`, `#annotate-flyout`); this is the
//      fourth and the only modal one that needs to be, because a zoom/pan
//      surface wants the wheel and the arrow keys to itself. Escape and the
//      backdrop are then the browser's own dismiss, not ours.
//   3. **The whole zoom/pan mechanism is one CSS transform**, on a wrapper
//      around the crop's own frame — the arithmetic is in the pure layer
//      (VA.lightbox*, viewer.js) and the header there says why that keeps the
//      percentage-positioned highlight boxes right for free. This file is the
//      wiring and the DOM, and holds no arithmetic of its own.
(function (VA) {
  "use strict";

  // The dialog is static markup in topology.html, for the same reason the two
  // dividers are: it is not owned by any view, and it must survive a re-render
  // of whatever surface launched it.
  var DIALOG_ID = "crop-lightbox";

  // The controls, module-level rather than three inline literals, and in the
  // order they are drawn. Everyday words in every title -- these are the only
  // words this surface adds, and the caption below the picture is the crop's
  // own (VA.cropReference).
  VA.LIGHTBOX_CONTROLS = [
    { key: "out", text: "−", title: "zoom out" },
    { key: "in", text: "+", title: "zoom in" },
    { key: "fit", text: "Fit", title: "show the whole crop again" },
  ];
  VA.LIGHTBOX_CLOSE_TITLE = "close (Esc)";

  // The class the page's own scroll is suppressed with while this is open.
  // A modal <dialog> makes the page behind it inert but does NOT reliably stop
  // it scrolling, and a wheel gesture that zooms the crop AND scrolls the grid
  // underneath is the "scroll bleed" this closes.
  var BODY_OPEN_CLASS = "lightbox-open";

  // --- the DOM ---------------------------------------------------------------
  //
  // Returns a handle, so the wiring below and the tests can drive the view
  // without reading it back out of a style attribute: `view()` is the current
  // {scale, x, y}, `zoom(factor, anchor)` / `pan(dx, dy)` / `fit()` move it.
  // Nothing here reaches for the dialog — this builds into whatever root it is
  // handed, which is what lets the fast tier render it into a plain div.
  VA.renderLightbox = function (root, entry, image, config, onClose) {
    VA.clear(root);
    root.className = "lightbox";

    var head = VA.el("div", "lightbox__head");
    var zoomBox = VA.el("div", "lightbox__zoom");
    head.appendChild(zoomBox);
    var close = VA.el("button", "lightbox__close", "✕");
    close.setAttribute("title", VA.LIGHTBOX_CLOSE_TITLE);
    close.setAttribute("aria-label", VA.LIGHTBOX_CLOSE_TITLE);
    if (onClose) close.onclick = onClose;
    head.appendChild(close);
    root.appendChild(head);

    var stage = VA.el("div", "lightbox__stage");
    var pan = VA.el("div", "lightbox__pan");
    // The ONE shared crop builder, with its own launcher suppressed: this IS
    // the full-size viewer, so a button offering to open it again is a control
    // that does nothing.
    var figure = VA.cropFigure(entry, image, "croppop__img", { omitLaunch: true });
    pan.appendChild(figure);
    stage.appendChild(pan);
    root.appendChild(stage);

    // The caption, and nothing longer: the crop's one where-line (document ·
    // rev · sheet) and the two click-throughs the card already renders. The
    // matching provenance is deliberately NOT folded in here -- it is one more
    // control on a surface whose whole job is the picture, and it is one hover
    // away on the card this was launched from.
    var foot = VA.el("div", "lightbox__foot");
    // `lightbox__cap-`, not `lightbox__`: the prefix carries its own
    // separator (see VA.cropReference), and `lightbox__` would name the
    // where-line `lightbox__head` -- the head ROW's class, and its flex rule.
    VA.cropReference(foot, entry, config, "lightbox__cap-",
                     { omitProvenance: true });
    root.appendChild(foot);

    var view = VA.lightboxFit();

    // The stage's own box and the crop's fitted size inside it, both measured
    // at the moment they are used -- a window can be resized with this open,
    // and a remembered box would be honest only until it was. Null where there
    // is no layout to measure (the DOM shim), which leaves the stylesheet's
    // own sizing standing rather than overwriting it with a guess.
    function stageBox() {
      if (!stage.getBoundingClientRect) return null;
      var box = stage.getBoundingClientRect();
      return box && box.width && box.height
        ? { width: box.width, height: box.height, left: box.left, top: box.top }
        : null;
    }

    function fitSize() {
      return VA.lightboxFitSize(entry, stageBox());
    }

    // The frame is sized to the fitted box and the picture fills it exactly.
    // Not `object-fit: contain` with a height cap: that insets the picture
    // inside its element, and the highlight boxes are percentages OF the
    // element, so they would point into the letterbox (the trap style.css's
    // `--crop-ratio` rule records for the hover card).
    function apply() {
      var fit = fitSize();
      if (fit) {
        figure.style.width = Math.round(fit.width) + "px";
        figure.style.height = Math.round(fit.height) + "px";
        view = VA.lightboxClamp(view, fit, stageBox());
      }
      pan.style.transform = VA.lightboxTransform(view);
      stage.className = "lightbox__stage" +
        (view.scale > VA.LIGHTBOX_ZOOM.min ? " lightbox__stage--pannable" : "");
    }

    // A wheel/pointer position in STAGE coordinates, which is the frame the
    // pure layer's anchors are in. The stage's centre where there is nothing
    // to measure, so a zoom button with no layout still zooms about the middle
    // rather than about a corner.
    function anchorAt(event) {
      var box = stageBox();
      if (!box) return { x: 0, y: 0 };
      var x = event && typeof event.clientX === "number"
        ? event.clientX - box.left : box.width / 2;
      var y = event && typeof event.clientY === "number"
        ? event.clientY - box.top : box.height / 2;
      return { x: x, y: y };
    }

    var handle = {
      root: root, stage: stage, panNode: pan, figure: figure,
      view: function () { return { scale: view.scale, x: view.x, y: view.y }; },
      fitSize: fitSize,
      zoom: function (factor, event) {
        view = VA.lightboxZoomAt(view, factor, anchorAt(event));
        apply();
      },
      pan: function (dx, dy) {
        view = VA.lightboxPan(view, dx, dy);
        apply();
      },
      fit: function () {
        view = VA.lightboxFit();
        apply();
      },
      apply: apply,
    };

    VA.LIGHTBOX_CONTROLS.forEach(function (control) {
      var button = VA.el("button", "lightbox__btn lightbox__btn--" + control.key,
        control.text);
      button.setAttribute("title", control.title);
      button.setAttribute("aria-label", control.title);
      button.onclick = function () {
        if (control.key === "fit") handle.fit();
        else handle.zoom(control.key === "in"
          ? VA.LIGHTBOX_ZOOM.step : 1 / VA.LIGHTBOX_ZOOM.step, null);
      };
      zoomBox.appendChild(button);
    });

    // The wheel zooms about the pointer; it never scrolls. preventDefault is
    // half of "no page scroll bleed" (the body class is the other half).
    stage.onwheel = function (event) {
      if (event && event.preventDefault) event.preventDefault();
      handle.zoom(VA.lightboxWheelFactor(event && event.deltaY), event);
    };

    // Drag to pan, on the same document-level pointer pattern both dividers
    // use (topology_app.js's onResizeStart): the gesture must survive the
    // pointer leaving the element it started on. Only above fit, because at
    // fit there is nothing to pan -- the clamp holds the crop centred and a
    // drag would be a control that visibly does nothing.
    stage.onpointerdown = function (event) {
      if (view.scale <= VA.LIGHTBOX_ZOOM.min) return;
      if (event && event.preventDefault) event.preventDefault();
      if (!document.addEventListener) return;
      var lastX = event.clientX, lastY = event.clientY;
      var move = function (ev) {
        handle.pan(ev.clientX - lastX, ev.clientY - lastY);
        lastX = ev.clientX;
        lastY = ev.clientY;
      };
      var end = function () {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", end);
        document.removeEventListener("pointercancel", end);
        document.body.classList.remove("lightbox-dragging");
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", end);
      document.addEventListener("pointercancel", end);
      document.body.classList.add("lightbox-dragging");
    };

    apply();
    return handle;
  };

  // --- the page-level opener -------------------------------------------------
  //
  // What VA.cropFigure's launch button calls. It reaches for the page's dialog
  // itself rather than being handed one, because a launcher threaded through
  // cropBlock -> cropFigure -> companionFigure and four calling surfaces would
  // be five parameters carrying one page-level fact. Absent dialog (the DOM
  // shim, a page that has not adopted the element) is a no-op, never a throw:
  // the figure's own test renders the button and clicking it must be harmless.
  var openHandle = null;

  VA.openCropLightbox = function (entry, image, config) {
    var dialog = lightboxDialog();
    if (!dialog || !entry) return null;
    openHandle = VA.renderLightbox(dialog, entry, image,
      config === undefined ? VA.CONFIG : config,
      function () { dialog.close(); });
    // The ONE seam every close path goes through -- the button, Escape and a
    // backdrop click all end at the dialog's own `close` event, so the body
    // class cannot be left behind by a dismissal this file never sees. Same
    // reasoning as the flyout's, topology_app.js.
    if (!dialog.__lightboxWired) {
      dialog.__lightboxWired = true;
      dialog.addEventListener("close", function () {
        openHandle = null;
        document.body.classList.remove(BODY_OPEN_CLASS);
      });
      // A window resized with the lightbox open re-fits: the stage is a
      // fraction of the viewport, so the fitted box the crop was sized to no
      // longer exists.
      if (typeof window !== "undefined" && window.addEventListener) {
        window.addEventListener("resize", function () {
          if (openHandle) openHandle.apply();
        });
      }
    }
    document.body.classList.add(BODY_OPEN_CLASS);
    if (!dialog.open) dialog.showModal();
    // AFTER showModal, for the same reason the flyout measures after show():
    // a closed <dialog> has no layout at all, so the fit measured before this
    // point would be measured against a zero-sized stage.
    openHandle.apply();
    return openHandle;
  };

  // The open lightbox's handle, or null. For the browser tier and the
  // screenshot probe, which drive the surface the way a reader does and then
  // need to say what the view actually became.
  VA.openCropLightboxHandle = function () { return openHandle; };

  function lightboxDialog() {
    if (typeof document === "undefined") return null;
    if (typeof document.getElementById !== "function") return null;
    var node = document.getElementById(DIALOG_ID);
    return node && typeof node.showModal === "function" ? node : null;
  }
})(window.ViewerApp = window.ViewerApp || {});
