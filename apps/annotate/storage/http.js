// HTTP read adapter (handoff the_scene_pane_is_one_flyout_that_reads_over_http,
// closing ISSUE_20260910_annotate_has_no_http_read_transport). Reads what a
// served origin publishes -- drawing-checker's /tolstack/data/ mounts, or a
// static server rooted at the repo -- with NO folder grant, through the
// viewer's own adapter (apps/viewer/storage/http.js, loaded beside this file
// by index.html): its probe, its two candidates, its 404-is-absence rule.
// Nothing here fetches on its own.
//
// What a served origin cannot do is list a directory, so the two things a
// folder grant finds by WALKING -- the installed meshes and the published
// sweep runs -- come from the read set scripts/build_kinematic_projection.py
// writes (AA.CONFIG.annotateReadSet: the index, and each run byte for byte),
// and so do the two files no mount reaches: the alias table and the part
// names. An index that is not there yet reads as no meshes and no runs --
// the ordinary first-run state, never an error.
//
// WRITES. This transport has none. A write still needs the folder: the
// optional `writer` (an FsaAdapter, on a page local enough to offer one --
// VA.isLocalPage) is asked for its grant at the moment of the first write,
// from inside the click that wrote, and every write after that goes through
// it. With no writer (a hosted origin, a browser without the File System
// Access API) a write throws AA.READ_ONLY_WRITE. Reads stay on HTTP either
// way -- the served files and the folder are the same repo -- except the
// feature-identity projection, which comes from the folder once granted.
//
// `va` (an already-constructed ViewerApp.HttpAdapter) is a constructor
// override for the node test tier; a browser never passes it.
(function (AA) {
  "use strict";

  // The read set's paths, relative to the served data dir -- derived from
  // the config's repo-root paths, never spelled a second time.
  function servedRelative(segments) {
    var root = AA.CONFIG.servedDataDir;
    for (var i = 0; i < root.length; i++) {
      if (segments[i] !== root[i]) {
        throw new Error(segments.join("/") + " is not under the served data dir");
      }
    }
    return segments.slice(root.length).join("/");
  }

  function HttpAdapter(opts) {
    opts = opts || {};
    this._va = opts.va || new window.ViewerApp.HttpAdapter();
    this._writer = opts.writer || null;
    this._index = undefined;
  }

  HttpAdapter.isSupported = function () {
    var VA = window.ViewerApp;
    return !!(VA && VA.HttpAdapter && VA.HttpAdapter.isSupported());
  };

  // The probe is the viewer's; its state words are the same three as ours.
  HttpAdapter.prototype.init = function () { return this._va.init(); };
  HttpAdapter.prototype.getState = function () { return this._va.getState(); };
  HttpAdapter.prototype.connect = HttpAdapter.prototype.init;
  HttpAdapter.prototype.reconnect = HttpAdapter.prototype.init;

  // True: a served page offers the bind controls everywhere, and the write
  // itself either asks for the folder (a writer is here) or says in one line
  // why it cannot (AA.READ_ONLY_WRITE) -- the hosted read-only scene says so
  // when the reader presses, never as standing copy. `hasWriter()` is the
  // question "could a folder be granted here at all".
  HttpAdapter.prototype.canWrite = function () { return true; };
  HttpAdapter.prototype.hasWriter = function () { return !!this._writer; };
  // Has it been granted? What the pane's status word reads.
  HttpAdapter.prototype.writeGranted = function () {
    return !!this._writer && this._writer.getState() === AA.STATE.READY;
  };
  HttpAdapter.prototype.writer = function () { return this._writer; };

  HttpAdapter.prototype._readSet = async function () {
    if (this._index === undefined) {
      var doc = await this._va.readDataJson(servedRelative(AA.CONFIG.annotateReadSet));
      this._index = doc && typeof doc === "object" ? doc : null;
    }
    return this._index;
  };

  HttpAdapter.prototype.readTopologyProjection = function () {
    return this._va.readDataJson(servedRelative(AA.CONFIG.topologyProjection));
  };
  HttpAdapter.prototype.readKinematicProjection = function () {
    return this._va.readDataJson(servedRelative(AA.CONFIG.kinematicProjection));
  };
  // Once the folder is granted it is the better source: the served origin
  // may not publish the projection at all (no drawing-checker mount does),
  // and the next event's sequence number is counted off it.
  HttpAdapter.prototype.readFeatureIdentityProjection = function () {
    if (this.writeGranted()) return this._writer.readFeatureIdentityProjection();
    return this._va.readIdentityProjection();
  };
  HttpAdapter.prototype.readPartMeshAliases = async function () {
    var index = await this._readSet();
    return (index && index.mesh_aliases) || null;
  };
  HttpAdapter.prototype.readPartNames = async function () {
    var index = await this._readSet();
    return (index && index.part_names) || null;
  };
  // No mount serves projections/feature-identity/, so the read set carries a
  // copy, exactly as it does the part names.
  HttpAdapter.prototype.readContactSuggestions = async function () {
    var index = await this._readSet();
    return (index && index.contact_suggestions) || null;
  };

  HttpAdapter.prototype.listMeshes = async function () {
    var index = await this._readSet();
    return ((index && index.meshes) || []).map(function (m) {
      return { sha256: m.sha256, label: m.label, part_id: m.part_id };
    });
  };

  HttpAdapter.prototype.listSweepRuns = async function () {
    var index = await this._readSet();
    return AA.orderSweepRuns(((index && index.sweep_runs) || []).map(function (r) {
      return { runId: r.run_id, ts: r.ts || null, mechanism: r.mechanism || null };
    }));
  };

  HttpAdapter.prototype.readSweepRun = function (runId) {
    return this._va.readDataJson(servedRelative(
      AA.CONFIG.annotateSweepsDir.concat([String(runId) + ".json"])));
  };

  HttpAdapter.prototype.readMeshProvenance = function (sha256) {
    return this._va.readMeshJson(sha256 + "/provenance.json");
  };
  HttpAdapter.prototype.readMeshManifest = function (sha256) {
    return this._va.readMeshJson(sha256 + "/manifest.json");
  };
  HttpAdapter.prototype.readMeshBuffer = function (sha256, filename) {
    return this._va.readMeshBytes(sha256 + "/" + filename);
  };

  // The folder, asked for once and from inside the gesture that wrote: a
  // persisted grant is re-checked first (no picker if it is still good), a
  // prompt-state one is re-granted, and none at all opens the picker.
  HttpAdapter.prototype.ensureWriter = async function () {
    if (!this._writer) throw new Error(AA.READ_ONLY_WRITE);
    var state = this._writer.getState();
    if (state !== AA.STATE.READY) state = await this._writer.init();
    if (state === AA.STATE.NEEDS_REGRANT) await this._writer.reconnect();
    else if (state !== AA.STATE.READY) await this._writer.connect();
    return this._writer;
  };

  HttpAdapter.prototype.writeFeatureIdentityEvent = async function (filename, eventObject) {
    var writer = await this.ensureWriter();
    return writer.writeFeatureIdentityEvent(filename, eventObject);
  };

  AA.HttpAdapter = HttpAdapter;
})(window.AnnotateApp = window.AnnotateApp || {});
