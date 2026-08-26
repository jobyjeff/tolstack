// Boot + wiring. Everything else is either pure logic (viewer.js), a view, or an
// adapter; this file is the only place they meet.
(function (VA) {
  "use strict";

  var state = {
    connection: VA.STATE.DISCONNECTED,
    results: null,
    crops: null,
    selectedId: null,
    // The element selected in the elements table, whose full sourcing renders
    // in the right pane (views/detail.js). Reset whenever the stack changes —
    // a selection from the previous stack pointing at this one's row would be
    // showing the wrong element's citation under the right name.
    selectedElementId: null,
    detailImage: null,
    error: null,
    // The worksheet ("the agent's report") is collapsed by default now that it
    // lives below the table rather than in the side pane — Jeff wants it out of
    // the way, not gone.
    showWorksheet: false,
  };

  var adapter = null;
  var nodes = {};
  var imageCache = {};   // "crops/x.png" -> {url} | null
  var openTrigger = null;    // whose popover is showing
  var openedAt = 0;          // guards the opening click from closing it again

  function boot() {
    nodes = {
      banner: document.getElementById("banner"),
      list: document.getElementById("stacklist"),
      stack: document.getElementById("stackview"),
      worksheetWrap: document.getElementById("worksheet-wrap"),
      worksheet: document.getElementById("worksheet"),
      detail: document.getElementById("detail"),
      crop: document.getElementById("croppop"),
      worksheetToggle: document.getElementById("worksheet-toggle"),
    };

    // The worksheet lives in a native <details> now (below the table, collapsed
    // by default) rather than a pane the app shows/hides itself, so its open
    // state is set directly on the DOM node instead of round-tripping through a
    // full render() — clicking the <summary> itself must work exactly the same
    // way, and forcing `.open` from state on every render would fight that.
    nodes.worksheetWrap.open = state.showWorksheet;
    nodes.worksheetToggle.textContent =
      (state.showWorksheet ? "Hide" : "Show") + " worksheet";
    nodes.worksheetWrap.addEventListener("toggle", function () {
      state.showWorksheet = nodes.worksheetWrap.open;
      nodes.worksheetToggle.textContent =
        (state.showWorksheet ? "Hide" : "Show") + " worksheet";
    });
    nodes.worksheetToggle.onclick = function () {
      nodes.worksheetWrap.open = !nodes.worksheetWrap.open;
    };

    // ?mock=1 gives a UI tour with no folder grant and no disk access at all.
    var mock = /[?&]mock=1\b/.test(window.location.search);
    adapter = mock ? new VA.MemoryAdapter(VA.demoFixture())
      : VA.FsaAdapter.isSupported() ? new VA.FsaAdapter()
      : null;

    if (!adapter) {
      state.error = "This browser has no File System Access API. Chrome or Edge " +
        "is required; ?mock=1 still runs a demo.";
      render();
      return;
    }

    // A click outside both the triggers and the popover closes it. Clicks INSIDE
    // must survive — handing you a link to the full reference is the point. The
    // 300 ms guard is what stops the very click that opened the popover from
    // closing it again: a click on a trigger can arrive with target == body when
    // the popover moved under the pointer mid-gesture.
    document.addEventListener("click", function (event) {
      if (!openTrigger || !event || !event.target) return;
      if (new Date().getTime() - openedAt < 300) return;
      var target = event.target;
      if (String(target.className || "").indexOf("crop-trigger") !== -1) return;
      if (nodes.crop.contains && nodes.crop.contains(target)) return;
      hideCrop();
    });
    document.addEventListener("keydown", function (event) {
      if (event && event.key === "Escape") hideCrop();
    });

    adapter.init().then(function (connection) {
      state.connection = connection;
      return connection === VA.STATE.READY ? load() : null;
    }).catch(function (err) {
      state.error = String(err && err.message || err);
    }).then(render);
  }

  function load() {
    imageCache = {};
    return Promise.all([adapter.readResults(), adapter.readCrops()])
      .then(function (both) {
        state.results = both[0];
        state.crops = both[1];
        var stacks = (state.results && state.results.stacks) || [];
        if (!VA.findStack(state.results, state.selectedId)) {
          state.selectedId = stacks.length ? stacks[0].id : null;
          state.selectedElementId = null;
        }
        return Promise.all([loadWorksheet(), loadDetailImage()]);
      });
  }

  function loadWorksheet() {
    var stackProj = VA.findStack(state.results, state.selectedId);
    var segments = VA.worksheetSegments(stackProj);
    if (!segments) {
      state.worksheetText = null;
      return Promise.resolve();
    }
    return adapter.readText(segments).then(function (text) {
      state.worksheetText = text;
    });
  }

  // --- element selection -----------------------------------------------------

  function selectElement(elementId) {
    state.selectedElementId = elementId;
    loadDetailImage().then(render);
  }

  // The right pane renders the crop INLINE (deliverable 3), which means the app
  // has to fetch it as soon as an element is selected rather than waiting for a
  // hover. Shares `imageCache` with the popover's showCrop — the same PNG open
  // in both places is the same object URL, not fetched twice.
  function loadDetailImage() {
    state.detailImage = null;
    var stackProj = VA.findStack(state.results, state.selectedId);
    var elements = (stackProj && stackProj.stack && stackProj.stack.elements) || [];
    var element = elements.filter(function (e) { return e.id === state.selectedElementId; })[0];
    if (!element) return Promise.resolve();
    var entry = VA.cropFor(state.crops, stackProj.id, element.id);
    if (entry.status !== "resolved" || !entry.png) return Promise.resolve();
    if (Object.prototype.hasOwnProperty.call(imageCache, entry.png)) {
      state.detailImage = imageCache[entry.png];
      return Promise.resolve();
    }
    return adapter.readCropImage(entry.png).then(function (image) {
      imageCache[entry.png] = image;
      state.detailImage = image;
    }).catch(function () {
      imageCache[entry.png] = null;
    });
  }

  // --- crops ---------------------------------------------------------------

  function showCrop(entry, trigger) {
    openTrigger = trigger;
    openedAt = new Date().getTime();
    var paint = function (image) {
      if (openTrigger !== trigger) return;   // a later hover won the race
      VA.renderCrop(nodes.crop, entry, image, VA.CONFIG, hideCrop);
      // display first, then measure: offsetHeight is 0 while display is none.
      nodes.crop.style.display = "block";
      position(nodes.crop, trigger);
      // aspect-ratio already reserved the height, but re-place once the PNG has
      // settled either way — a broken image also changes the box.
      var img = nodes.crop.querySelector ? nodes.crop.querySelector("img") : null;
      if (img) {
        img.onload = function () { position(nodes.crop, trigger); };
        img.onerror = img.onload;
      }
    };
    if (entry.status !== "resolved" || !entry.png) { paint(null); return; }
    if (Object.prototype.hasOwnProperty.call(imageCache, entry.png)) {
      paint(imageCache[entry.png]);
      return;
    }
    // Paint the frame immediately so the popover never feels laggy, then swap
    // the image in when the blob resolves.
    paint(null);
    adapter.readCropImage(entry.png).then(function (image) {
      imageCache[entry.png] = image;
      paint(image);
    }).catch(function () {
      imageCache[entry.png] = null;
      paint(null);
    });
  }

  function hideCrop() {
    openTrigger = null;
    nodes.crop.style.display = "none";
  }

  // Place the popover below the trigger, or above it when there isn't room —
  // a crop of a whole drawing sheet is tall, and one that renders off the bottom
  // of the window is a hover that shows nothing.
  function position(pop, trigger) {
    if (!trigger.getBoundingClientRect) return;
    var box = trigger.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(
      window.scrollX + box.left,
      window.scrollX + window.innerWidth - pop.offsetWidth - 16)) + "px";
    var height = pop.offsetHeight || 400;
    var roomBelow = window.innerHeight - box.bottom;
    // Above only when it genuinely fits above: a popover nudged back down to
    // stay on screen would land ON the trigger, and the resulting mouseleave
    // would close it the instant it opened.
    var goAbove = roomBelow < height + 16 && box.top >= height + 16;
    pop.style.top = (goAbove
      ? window.scrollY + box.top - height - 8
      : window.scrollY + box.bottom + 8) + "px";
  }

  // --- render --------------------------------------------------------------

  function render() {
    VA.renderBanner(nodes.banner, state, {
      onConnect: function () {
        adapter.connect().then(function (connection) {
          state.connection = connection;
          state.error = null;
          return load();
        }).catch(function (err) {
          state.error = String(err && err.message || err);
        }).then(render);
      },
      onReconnect: function () {
        adapter.reconnect().then(function (connection) {
          state.connection = connection;
          state.error = null;
          return load();
        }).catch(function (err) {
          state.error = String(err && err.message || err);
        }).then(render);
      },
      onReload: function () { load().then(render); },
    });

    VA.renderList(nodes.list, state.results, state.selectedId, function (id) {
      state.selectedId = id;
      // A selection from the previous stack means nothing on this one — reset
      // it rather than let a stale element id silently point at nothing (or,
      // worse, at a different element that happens to share the id).
      state.selectedElementId = null;
      state.detailImage = null;
      hideCrop();
      loadWorksheet().then(render);
    });

    var stackProj = VA.findStack(state.results, state.selectedId);
    VA.renderStack(nodes.stack, stackProj, state.crops, {
      onCropShow: showCrop,
      onElementSelect: selectElement,
      selectedElementId: state.selectedElementId,
    });

    VA.renderDetail(nodes.detail, stackProj, state.selectedElementId,
      state.crops, state.detailImage, VA.CONFIG);

    // The worksheet's open/closed state lives on the <details> node itself
    // (see boot()) — render() only ever refreshes its CONTENT, never its
    // collapsed state, so clicking the <summary> directly is not fought on the
    // next render.
    VA.renderWorksheet(nodes.worksheet, stackProj, state.worksheetText);
  }

  VA.boot = boot;
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", boot);
  }
})(window.ViewerApp = window.ViewerApp || {});
