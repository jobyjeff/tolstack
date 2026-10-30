// Point export (handoff a_point_exports_its_xyz_against_angle, 2026-10-30):
// choose one or more points of a kinematic sweep and download their XYZ
// against blade angle -- or angle against XYZ -- as CSV. Jeff's note: "export
// their XYZ as a function of angle (or vice versa)".
//
// ONE module, loaded by both apps: the viewer's kinematic results pane
// (topology.html) and the annotator's sweep bar (annotate/index.html). It
// attaches to `window.SweepExport` rather than either app's namespace for
// exactly that reason, and it is DOM-free down to `renderControl`, so the
// builder is pinned value by value by both fast tiers.
//
// IT COMPUTES NOTHING. A joint end's coordinates are read verbatim out of the
// artifact (`points[i].joints[j].point_a_world / point_b_world`); a bound
// feature's per-point world coordinates are handed in by the annotator, which
// already puts a fitted nominal through its body's pose to draw it
// (`extras`, below). The only things done to a number are printing it at the
// precision the hand-made sheet this reproduces used, and ordering rows for
// the inverse lookup. Nothing here writes to the repo: the output is a
// download, never a value source, and a fitted nominal in it is still a
// measurement of a mesh with no band.
(function (SX) {
  "use strict";

  // The two orientations, one file. `xyz_vs_angle` keeps the sweep's own row
  // order; `angle_vs_xyz` sorts the same rows by one coordinate of the first
  // chosen point -- the inverse lookup.
  SX.ORIENTATIONS = Object.freeze(["xyz_vs_angle", "angle_vs_xyz"]);
  SX.ORIENTATION_WORDS = Object.freeze({
    xyz_vs_angle: "XYZ against angle",
    angle_vs_xyz: "angle against XYZ",
  });
  SX.AXES = Object.freeze(["X", "Y", "Z"]);
  SX.DEFAULT_SORT_AXIS = "Z";

  // The driver columns, and where each lives on a sweep point. The decimals
  // are the hand-made sheet's (the run it was cut from), so the two files'
  // values agree to the digit.
  SX.ANGLE_COLUMNS = Object.freeze([
    { name: "blade_pitch_deg", measure: "blade_pitch", decimals: 3 },
    { name: "actuator_travel_mm", measure: "actuator_travel", decimals: 3 },
    { name: "plate_rotation_deg", measure: "plate_rotation", decimals: 4 },
  ]);
  SX.COORDINATE_DECIMALS = 3;
  SX.JOINT_ENDS = Object.freeze([
    { end: "a", field: "point_a_world" },
    { end: "b", field: "point_b_world" },
  ]);
  SX.STORAGE_KEY = "tolstack.sweepExport.v1";
  SX.FRAME_FALLBACK = "assembly frame as stated by the run";

  // --- what can be exported --------------------------------------------------

  // Every joint end the run carries, then every extra the caller hands in.
  // `extras` is [{id, label, part, world: [[x,y,z] | null per sweep point]}].
  // `parts` optionally names the part a joint end sits on: {"<joint>|<end>":
  // "<name>"} -- the annotator knows it (which body rides the end), the viewer
  // does not and leaves it out rather than guess.
  SX.exportablePoints = function (doc, extras, parts) {
    var first = ((doc && doc.points) || [])[0] || {};
    var out = [];
    Object.keys(first.joints || {}).forEach(function (joint) {
      SX.JOINT_ENDS.forEach(function (e) {
        if (!first.joints[joint][e.field]) return;
        out.push({
          id: "joint|" + joint + "|" + e.end,
          label: joint.replace(/_/g, " ") + " · " + e.end + " end",
          part: (parts && parts[joint + "|" + e.end]) || null,
          column: joint + "_" + e.end + "_end",
          read: function (point) {
            var j = (point.joints || {})[joint];
            return j && j[e.field] ? j[e.field] : null;
          },
        });
      });
    });
    (extras || []).forEach(function (x) {
      out.push({
        id: x.id, label: x.label, part: x.part || null,
        column: String(x.label).replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, ""),
        read: function (point, i) { return (x.world || [])[i] || null; },
      });
    });
    return out;
  };

  // --- the file --------------------------------------------------------------

  function printNumber(value, decimals) {
    if (typeof value !== "number" || !isFinite(value)) return "";
    // `+ 0` turns a printed "-0" into "0".
    return String(Number(value.toFixed(decimals)) + 0);
  }

  function csvField(text) {
    var s = String(text);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // "217755 assembly frame: CAD Z = the spindle axis, ..." -- read out of the
  // artifact's own sentence, so the file says what the run says. A run whose
  // frame sentence has another shape gets a fixed fallback, never a guess.
  SX.frameSentence = function (doc) {
    var m = /the one ([^(]*?) coordinate frame \(([^)]*)\)/.exec((doc && doc.frame) || "");
    return (m ? m[1] + " frame: " + m[2] : SX.FRAME_FALLBACK) + "; mm and deg";
  };

  SX.fileName = function (runId, labels, orientation) {
    var slug = labels.map(function (l) {
      return String(l).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    }).join("+");
    if (slug.length > 80) slug = slug.slice(0, 80).replace(/_$/, "") + "_etc";
    return (runId || "sweep") + "_" + slug + "_" +
      (orientation === "angle_vs_xyz" ? "angle_vs_xyz" : "xyz_vs_angle") + ".csv";
  };

  // opts: {orientation, sortAxis, extras, parts, exportedAt (ISO string)}.
  // Returns {name, text, rows (data row count), columns}. Throws on an empty
  // selection or an id the run does not carry -- a file that quietly omits
  // the point you asked for is worse than no file.
  SX.buildCsv = function (doc, ids, opts) {
    opts = opts || {};
    var orientation = opts.orientation || SX.ORIENTATIONS[0];
    if (SX.ORIENTATIONS.indexOf(orientation) === -1) {
      throw new Error("orientation is one of " + SX.ORIENTATIONS.join(", "));
    }
    var axis = opts.sortAxis || SX.DEFAULT_SORT_AXIS;
    if (SX.AXES.indexOf(axis) === -1) throw new Error("sort axis is one of " + SX.AXES.join(", "));
    if (!ids || !ids.length) throw new Error("choose at least one point to export");
    var catalogue = SX.exportablePoints(doc, opts.extras, opts.parts);
    var chosen = ids.map(function (id) {
      var found = catalogue.filter(function (p) { return p.id === id; })[0];
      if (!found) throw new Error("this run has no exportable point " + id);
      return found;
    });

    var angleHeader = SX.ANGLE_COLUMNS.map(function (c) { return c.name; });
    var coordHeader = [];
    chosen.forEach(function (p) {
      SX.AXES.forEach(function (a) { coordHeader.push(p.column + "_" + a); });
    });
    var header = orientation === "angle_vs_xyz"
      ? coordHeader.concat(angleHeader) : angleHeader.concat(coordHeader);

    var rows = (doc.points || []).map(function (point, i) {
      var angles = SX.ANGLE_COLUMNS.map(function (c) {
        return printNumber((point.measures || {})[c.measure], c.decimals);
      });
      var coords = [];
      var sortValue = null;
      chosen.forEach(function (p, k) {
        var xyz = p.read(point, i);
        SX.AXES.forEach(function (a, ai) {
          coords.push(xyz ? printNumber(xyz[ai], SX.COORDINATE_DECIMALS) : "");
        });
        if (k === 0 && xyz) sortValue = xyz[SX.AXES.indexOf(axis)];
      });
      return { index: i, sort: sortValue,
        cells: orientation === "angle_vs_xyz" ? coords.concat(angles) : angles.concat(coords) };
    });
    if (orientation === "angle_vs_xyz") {
      rows.sort(function (a, b) {
        if (a.sort === null || b.sort === null) return (a.sort === null) - (b.sort === null);
        return a.sort - b.sort || a.index - b.index;
      });
    }

    var commit = doc.pipeline_commit ? String(doc.pipeline_commit).slice(0, 12) : "unknown";
    var lines = [
      "# run " + (doc.run_id || "unknown") + ", pipeline " + commit + ", exported " +
        (opts.exportedAt || new Date().toISOString()),
      "# " + SX.frameSentence(doc) +
        (orientation === "angle_vs_xyz"
          ? "; rows sorted by " + chosen[0].label + " " + axis : ""),
      header.map(csvField).join(","),
    ].concat(rows.map(function (r) { return r.cells.join(","); }));
    return {
      name: SX.fileName(doc.run_id, chosen.map(function (p) { return p.column; }), orientation),
      text: lines.join("\n") + "\n",
      rows: rows.length,
      columns: header,
    };
  };

  // --- remembered per viewer ---------------------------------------------------

  SX.loadPrefs = function (storage) {
    try {
      var raw = JSON.parse((storage || window.localStorage).getItem(SX.STORAGE_KEY) || "null");
      if (raw && typeof raw === "object") return raw;
    } catch (_) { /* a browser that keeps nothing starts from the defaults */ }
    return {};
  };
  SX.savePrefs = function (prefs, storage) {
    try { (storage || window.localStorage).setItem(SX.STORAGE_KEY, JSON.stringify(prefs)); }
    catch (_) { /* nothing kept; the control still works for this render */ }
  };

  // --- the control -------------------------------------------------------------
  //
  // One quiet "Export points" button that opens a small panel: a search box, a
  // checkbox per point, the two orientations, and Download. `source` is
  // () => Promise<{doc, extras?, parts?}>, called when the panel opens; the
  // control renders nothing at all when it is not given one.
  SX.renderControl = function (host, source) {
    if (typeof document === "undefined" || !source) return null;
    var wrap = document.createElement("div");
    wrap.className = "sx";
    var toggle = document.createElement("button");
    toggle.className = "ghost sx__toggle";
    toggle.textContent = "Export points";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("title", "download chosen points' XYZ against blade angle, or the reverse, as CSV");
    var panel = document.createElement("div");
    panel.className = "sx__panel";
    panel.hidden = true;
    wrap.appendChild(toggle);
    wrap.appendChild(panel);
    host.appendChild(wrap);

    var built = false;
    toggle.onclick = function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      if (open && !built) { built = true; build(); }
    };

    function build() {
      panel.textContent = "";
      var status = document.createElement("div");
      status.className = "muted sx__status";
      status.textContent = "Loading the run…";
      panel.appendChild(status);
      Promise.resolve().then(source).then(function (loaded) {
        panel.textContent = "";
        fill(loaded);
      }, function () {
        status.textContent = "This run could not be read.";
      });
    }

    function fill(loaded) {
      var doc = loaded.doc;
      var catalogue = SX.exportablePoints(doc, loaded.extras, loaded.parts);
      var prefs = SX.loadPrefs();
      var chosen = {};
      (prefs.ids || []).forEach(function (id) { chosen[id] = true; });
      var orientation = SX.ORIENTATIONS.indexOf(prefs.orientation) !== -1
        ? prefs.orientation : SX.ORIENTATIONS[0];
      var axis = SX.AXES.indexOf(prefs.axis) !== -1 ? prefs.axis : SX.DEFAULT_SORT_AXIS;

      var search = document.createElement("input");
      search.type = "search";
      search.className = "sx__search";
      search.placeholder = "Search points";
      search.setAttribute("aria-label", "search points");
      panel.appendChild(search);

      var list = document.createElement("div");
      list.className = "sx__list";
      panel.appendChild(list);
      var rows = catalogue.map(function (p) {
        var row = document.createElement("label");
        row.className = "sx__row";
        var box = document.createElement("input");
        box.type = "checkbox";
        box.checked = !!chosen[p.id];
        box.setAttribute("data-point", p.id);
        box.onchange = function () { chosen[p.id] = box.checked; remember(); refresh(); };
        row.appendChild(box);
        var words = document.createElement("span");
        words.textContent = p.label;
        row.appendChild(words);
        if (p.part) {
          var part = document.createElement("span");
          part.className = "muted";
          part.textContent = " on " + p.part;
          row.appendChild(part);
        }
        row.setAttribute("title", p.label + (p.part ? " on " + p.part : ""));
        list.appendChild(row);
        return { node: row, text: (p.label + " " + (p.part || "")).toLowerCase() };
      });
      search.oninput = function () {
        var q = search.value.trim().toLowerCase();
        rows.forEach(function (r) { r.node.hidden = q !== "" && r.text.indexOf(q) === -1; });
      };

      var options = document.createElement("div");
      options.className = "sx__options";
      var which = document.createElement("select");
      which.setAttribute("aria-label", "orientation");
      SX.ORIENTATIONS.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o;
        opt.textContent = SX.ORIENTATION_WORDS[o];
        which.appendChild(opt);
      });
      which.value = orientation;
      var sortBy = document.createElement("select");
      sortBy.setAttribute("aria-label", "sort by coordinate");
      SX.AXES.forEach(function (a) {
        var opt = document.createElement("option");
        opt.value = a;
        opt.textContent = "by " + a;
        sortBy.appendChild(opt);
      });
      sortBy.value = axis;
      var go = document.createElement("button");
      go.className = "sx__go";
      go.textContent = "Download CSV";
      options.appendChild(which);
      options.appendChild(sortBy);
      options.appendChild(go);
      panel.appendChild(options);
      var note = document.createElement("div");
      note.className = "muted sx__status";
      panel.appendChild(note);

      function ids() {
        return catalogue.filter(function (p) { return chosen[p.id]; })
          .map(function (p) { return p.id; });
      }
      function remember() {
        SX.savePrefs({ ids: ids(), orientation: which.value, axis: sortBy.value });
      }
      function refresh() {
        sortBy.hidden = which.value !== "angle_vs_xyz";
        go.disabled = ids().length === 0;
        note.textContent = ids().length ? ids().length + " chosen" : "";
      }
      which.onchange = function () { remember(); refresh(); };
      sortBy.onchange = remember;
      go.onclick = function () {
        try {
          var out = SX.buildCsv(doc, ids(), { orientation: which.value, sortAxis: sortBy.value,
            extras: loaded.extras, parts: loaded.parts });
          SX.download(out.name, out.text);
          note.textContent = "Saved " + out.name;
        } catch (err) {
          note.textContent = err.message;
        }
      };
      refresh();
    }
    return wrap;
  };

  // Hands the text to the browser as a file. Kept apart so a test can swap it.
  SX.download = function (name, text) {
    var blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };
})(window.SweepExport = window.SweepExport || {});
