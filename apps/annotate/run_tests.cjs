// Fast-tier runner (forge CONVENTIONS.md §7) for the annotate app's pure
// logic -- binding_state.js has no DOM and no fetch, so unlike apps/viewer's
// run_tests.cjs this needs no DOM shim at all, just a `window` object for the
// classic-script IIFE pattern to attach to.
//
//   node apps/annotate/run_tests.cjs
//
// scene.js (three.js, WebGL, raycasting) is NOT exercised here -- there is no
// WebGL in Node, and this repo's own step_tessellation lesson documents why
// real browser click automation is not run on this machine (it would hijack
// Jeff's live session). scene.js's own docstring and this app's README carry
// that decision; the ?autotest=1 aim-at-bbox-center path (scene.js's
// `autotestPick`, the spike's own technique) is the manual verification step
// instead.
const vm = require("vm");
const fs = require("fs");
const path = require("path");

const here = __dirname;
const sandbox = { console };
sandbox.window = sandbox;
vm.createContext(sandbox);

// The SIBLING app's adapter contract, loaded first for exactly the reason
// index.html loads it first: VA.chooseTransport is the shared "may this page
// ask for a folder grant?" decision, and AA.chooseTransport delegates to it
// rather than keeping a second copy (handoff surfaces_that_state_something_
// false). It is a classic script that only defines -- no DOM, no fetch.
const VIEWER_ADAPTER = path.join(here, "..", "viewer", "storage", "adapter.js");
vm.runInContext(fs.readFileSync(VIEWER_ADAPTER, "utf8"), sandbox,
  { filename: "../viewer/storage/adapter.js" });

// ...and the shared list of strings NEITHER app may print at a reader, loaded
// across the same app boundary and for the same reason: a second copy of a
// vocabulary is this repo's most-repeated defect. It lived inside
// apps/viewer/tests.js until 2026-09-18 and therefore covered one of two apps,
// while THIS one shipped `command, e.g. isolate machined_213668
// (window.AnnotateApp.exec)` and `parts (data/meshes/)` on its two
// always-visible surfaces. See apps/viewer/reader_facing_bans.js.
const BANS = path.join(here, "..", "viewer", "reader_facing_bans.js");
vm.runInContext(fs.readFileSync(BANS, "utf8"), sandbox,
  { filename: "../viewer/reader_facing_bans.js" });

const files = ["config.js", "storage/adapter.js", "storage/memory.js", "binding_state.js",
  "commands.js", "face_geometry.js", "suggestions.js", "exec_queue.js", "fixtures.js"];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), sandbox, { filename: f });
}

const AA = sandbox.AnnotateApp;
const VA = sandbox.ViewerApp;
const BANNED = sandbox.ReaderFacingBans;
let failed = 0;
let passed = 0;

const checks = [];
function check(name, fn) {
  checks.push(async () => {
    try {
      await fn();
      passed++;
      console.log(`PASS  ${name}`);
    } catch (err) {
      failed++;
      console.log(`FAIL  ${name}\n      ${err.stack || err}`);
    }
  });
}

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg || "mismatch"}: got ${a}, expected ${e}`);
}

// Jeff's standing web-UI rule, recorded across every repo's web surface: a
// terminal command is NEVER rendered for a user to copy. apps/viewer/tests.js
// states it as an assertion on the TEXT rather than the absence of one known
// string, so a NEW way of leaking one in later still fails -- same shape here,
// and shared by every sentence this app can put on its banner. A vocabulary
// like this is a module-level constant, never an inline literal (CLAUDE.md).
const COMMANDISH = [".py", "venv-win", "python", "\\", "scripts/"];

// The shared list, over one piece of reader-facing text. Every entry is a
// literal OR a shape, and the failure names what was FOUND, never the pattern.
function assertNothingBanned(text, what) {
  for (const entry of BANNED.BANNED) {
    const hit = BANNED.found(text, entry);
    if (hit !== null) {
      throw new Error(`${what} renders ${JSON.stringify(hit)} (${entry[1]}): ${text}`);
    }
  }
}

function assertNoCommandOrPath(text, what) {
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(`${what} is not a non-empty string: ${JSON.stringify(text)}`);
  }
  for (const banned of COMMANDISH) {
    if (text.includes(banned)) {
      throw new Error(`${what} names ${JSON.stringify(banned)}: ${text}`);
    }
  }
  // ...and the list the viewer's surfaces are held to. COMMANDISH stays: it is
  // about a terminal command specifically and catches three shapes the shared
  // list does not (`.py`, `python`, a bare backslash), so this is a widening,
  // not a replacement.
  assertNothingBanned(text, what);
}

function assertThrows(fn, msg) {
  try {
    fn();
  } catch (_) {
    return;
  }
  throw new Error(msg || "expected a throw");
}

// A hang is awkward to assert directly -- race the promise under test against
// a short timeout so a regression back to "never settles" fails loudly here
// instead of wedging the whole runner.
function withTimeout(promise, ms, msg) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(msg || `timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// --- the reader-facing copy this app SHIPS IN ITS MARKUP -------------------
//
// index.html is this app's only static surface and the one a reader meets
// with nothing selected: two `<select>` labels, a parts-panel label, a
// command box and a detail-pane prompt. Nothing scanned it until 2026-09-18,
// which is how `parts (data/meshes/)` and `command, e.g. isolate
// machined_213668 (window.AnnotateApp.exec)` stayed on screen -- a repo path
// into a gitignored directory as a label, and an internal module path plus a
// backend id a reader cannot know, in a placeholder
// (ISSUE_20260917_the_annotators_console_and_parts_label_print_code_at_the_
// reader).
//
// THE HONEST LIMIT, because a guard read as more than it is becomes a licence:
// this scans the MARKUP, not the rendered page. Most of this app's words are
// written by app.js at runtime into a real DOM, and app.js is an ES module
// that needs three.js and a document -- neither of which exists in this
// sandbox, which is why this runner has no DOM shim at all. So a sentence
// app.js builds is covered only where it passes through `assertNoCommandOrPath`
// (the banner) or through one of the AA tables below. A DOM tier for this app
// is filed, not built.
const ANNOTATE_HTML = fs.readFileSync(path.join(here, "index.html"), "utf8");

// Reader-facing text out of HTML: the element text, plus the attributes that
// are text a reader meets (a placeholder and a title are copy, and the
// placeholder is exactly where this app's defect was). Comments, <script> and
// <style> bodies are NOT copy -- the argument for a string belongs beside it,
// and a scan that read comments would make writing that argument impossible.
function htmlReaderText(html) {
  const attrs = [];
  const ATTR_RE = /(?:placeholder|title|aria-label|alt)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let m;
  while ((m = ATTR_RE.exec(html)) !== null) {
    attrs.push(m[2] !== undefined ? m[2] : m[3]);
  }
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  return { attrs: attrs, body: body };
}

check("the annotator's own markup prints no repo path, module path, id or " +
  "command at the reader", () => {
    const text = htmlReaderText(ANNOTATE_HTML);
    // Anti-vacuity, both halves: a stripper that returned "" would pass this
    // scan against anything.
    if (text.attrs.length < 1) {
      throw new Error("no reader-facing attributes found -- the extractor has " +
        "drifted from the markup and this check now passes against anything");
    }
    if (!/parts with a 3D model/.test(text.body)) {
      throw new Error(`the body extractor found no known label: ${text.body}`);
    }
    assertNothingBanned(text.body, "apps/annotate/index.html body text");
    text.attrs.forEach((value, i) => {
      assertNothingBanned(value, `apps/annotate/index.html attribute #${i + 1} ` +
        `(${JSON.stringify(value)})`);
    });
  });

check("the command box says what it accepts, read off the registry rather " +
  "than written down", () => {
    // The placeholder carried a hand-written example naming an internal module
    // path and a backend id. A list built from `commands.verbs()` cannot drift
    // from what the box takes -- and it is the same list `CommandLayer.exec`
    // answers an unknown command with, so a reader meets ONE vocabulary
    // whichever way they find it.
    const layer = new AA.CommandLayer();
    layer.register("isolate", () => {});
    layer.register("camera", () => {});
    const hint = AA.commandHint(layer.verbs());
    assertEqual(hint, "commands: camera, isolate");
    assertNothingBanned(hint, "AA.commandHint");
    // An empty registry says so rather than trailing off after the colon --
    // the hosted page never wires the console at all, but a registry that
    // failed to register is a state this must not render as a bare label.
    assertEqual(AA.commandHint([]), "commands: ");
    // The one thing the placeholder must NOT be: an example command. It is
    // the word `command` and nothing else.
    if (!/placeholder="command"/.test(ANNOTATE_HTML)) {
      throw new Error("the console placeholder is no longer the plain word " +
        "`command` -- if that is deliberate, the example it now carries has " +
        "to survive the scan above, and this check has to say so");
    }
  });

check("every word table this app renders survives the shared ban list", () => {
  // AA.BINDING_STATES / AA.BINDING_STATE_ALERTS are the sentences a rail row
  // and its alert popup print. They are in `AA` and so, unlike app.js's
  // inline strings, they are reachable from this sandbox -- which is the
  // argument for a word table over an inline literal, one more time.
  let scanned = 0;
  [["AA.BINDING_STATES", AA.BINDING_STATES],
   ["AA.BINDING_STATE_ALERTS", AA.BINDING_STATE_ALERTS],
  ].forEach(([name, table]) => {
    Object.keys(table || {}).forEach((key) => {
      const row = table[key];
      Object.keys(row || {}).forEach((field) => {
        if (typeof row[field] !== "string") return;
        assertNothingBanned(row[field], `${name}.${key}.${field}`);
        scanned++;
      });
    });
  });
  if (scanned < 4) {
    throw new Error(`the table scan read ${scanned} strings -- it has drifted ` +
      `from the tables' shape and now passes against anything`);
  }
});

// --- vocabulary sanity (hand-copy against tolerance_stack/feature_identity.py) ---
check("STACK_KEY_KINDS matches the Python tuple", () => {
  assertEqual(AA.STACK_KEY_KINDS, ["topology_edge", "stack_element"]);
});
check("VERDICTS matches the Python tuple", () => {
  assertEqual(AA.VERDICTS, ["bound", "owner_not_in_set"]);
});
check("DIRECTIONS matches the Python tuple", () => {
  assertEqual(AA.DIRECTIONS, ["from", "to"]);
});
check("GDT_MODIFIERS matches the Python tuple", () => {
  assertEqual(AA.GDT_MODIFIERS, ["M", "L"]);
});

// --- stack keys ---
check("topologyEdgeKey and stackElementKey are not equal for the same names", () => {
  const a = AA.topologyEdgeKey("p", "e");
  const b = AA.stackElementKey("p", "e");
  if (AA.stackKeyEquals(a, b)) throw new Error("keys of different kinds compared equal");
});
check("stackKeyEquals is field-wise, not reference", () => {
  const a = AA.topologyEdgeKey("pitch_system", "end_stop_clearance");
  const b = AA.topologyEdgeKey("pitch_system", "end_stop_clearance");
  if (!AA.stackKeyEquals(a, b)) throw new Error("expected equal");
});

// --- binding state derivation, against the fixture projection ---
const identity = AA.FIXTURES.featureIdentityProjection;

check("a bound edge's state is bound", () => {
  const key = AA.topologyEdgeKey("demo_system", "demo_edge_untraced");
  const record = AA.findBindingRecord(identity, key);
  assertEqual(AA.elementBindingState(record), "bound");
});
check("an owner-not-in-set edge's state is owner_not_in_set", () => {
  const key = AA.topologyEdgeKey("demo_system", "demo_edge_no_owner");
  const record = AA.findBindingRecord(identity, key);
  assertEqual(AA.elementBindingState(record), "owner_not_in_set");
});
check("an edge with no record at all is unbound -- never a default the fold writes", () => {
  const key = AA.topologyEdgeKey("demo_system", "demo_edge_traced");
  const record = AA.findBindingRecord(identity, key);
  if (record !== null) throw new Error("fixture unexpectedly has a record for demo_edge_traced");
  assertEqual(AA.elementBindingState(record), "unbound");
});
check("a staleness map flips a bound edge to needs_re_confirmation", () => {
  const key = AA.topologyEdgeKey("demo_system", "demo_edge_untraced");
  const record = AA.findBindingRecord(identity, key);
  const staleness = { "demo-bound-1": "needs_re_confirmation" };
  assertEqual(AA.elementBindingState(record, staleness), "needs_re_confirmation");
});
check("a staleness map naming a DIFFERENT event id leaves the state bound", () => {
  const key = AA.topologyEdgeKey("demo_system", "demo_edge_untraced");
  const record = AA.findBindingRecord(identity, key);
  const staleness = { "some-other-event": "needs_re_confirmation" };
  assertEqual(AA.elementBindingState(record, staleness), "bound");
});

// --- event construction ---
check("buildBoundEvent rejects an unknown direction", () => {
  assertThrows(() => AA.buildBoundEvent({
    eventId: "x", seq: 1, createdAt: "t", recordedBy: "r",
    stackKey: AA.topologyEdgeKey("p", "e"), direction: "sideways",
    geometryKey: { sourceStepSha256: "a".repeat(64), faceId: 0, areaNative2: 1, centroidNative: [0, 0, 0] },
  }));
});
check("buildBoundEvent rejects a missing geometryKey", () => {
  assertThrows(() => AA.buildBoundEvent({
    eventId: "x", seq: 1, createdAt: "t", recordedBy: "r",
    stackKey: AA.topologyEdgeKey("p", "e"), direction: "to",
  }));
});
check("buildBoundEvent round-trips the required fields", () => {
  const event = AA.buildBoundEvent({
    eventId: "x", seq: 1, createdAt: "t", recordedBy: "r",
    stackKey: AA.topologyEdgeKey("p", "e"), direction: "to",
    geometryKey: { sourceStepSha256: "a".repeat(64), faceId: 3, areaNative2: 1.5, centroidNative: [1, 2, 3] },
  });
  assertEqual(event.schema, "joby.tolerance_stack/feature-identity/v0");
  assertEqual(event.verdict, "bound");
  assertEqual(event.geometry_key.face_id, 3);
  assertEqual(event.direction, "to");
});
check("buildOwnerNotInSetEvent carries no geometry_key or direction", () => {
  const event = AA.buildOwnerNotInSetEvent({
    eventId: "x", seq: 1, createdAt: "t", recordedBy: "r",
    stackKey: AA.stackElementKey("s", "el"),
  });
  assertEqual(event.verdict, "owner_not_in_set");
  if ("geometry_key" in event) throw new Error("owner_not_in_set event must carry no geometry_key");
  if ("direction" in event) throw new Error("owner_not_in_set event must carry no direction");
});

check("nextEventFilename increments past the highest existing number", () => {
  assertEqual(AA.nextEventFilename(["0001_a.json", "0003_b.json"], "c"), "0004_c.json");
  assertEqual(AA.nextEventFilename([], "first"), "0001_first.json");
});

// --- storage/memory.js: the write-capable mock, and the "hide the write
// controls" contract a read-only transport must honour ---
check("MemoryAdapter captures a write rather than persisting it", async () => {
  const adapter = new AA.MemoryAdapter({});
  await adapter.connect();
  if (!adapter.canWrite()) throw new Error("default memory adapter should be writable");
  await adapter.writeFeatureIdentityEvent("0001_x.json", { a: 1 });
  assertEqual(adapter.written.length, 1);
  assertEqual(adapter.written[0].filename, "0001_x.json");
});
check("MemoryAdapter refuses to overwrite an existing filename (append-only)", async () => {
  const adapter = new AA.MemoryAdapter({});
  await adapter.connect();
  await adapter.writeFeatureIdentityEvent("0001_x.json", { a: 1 });
  let threw = false;
  try { await adapter.writeFeatureIdentityEvent("0001_x.json", { a: 2 }); } catch (_) { threw = true; }
  if (!threw) throw new Error("expected the second write to the same filename to throw");
});
check("MemoryAdapter with writable:false cannot write -- canWrite() is false", async () => {
  const adapter = new AA.MemoryAdapter({ writable: false });
  await adapter.connect();
  if (adapter.canWrite()) throw new Error("expected canWrite() false");
  let threw = false;
  try { await adapter.writeFeatureIdentityEvent("0001_x.json", {}); } catch (_) { threw = true; }
  if (!threw) throw new Error("expected write to throw when canWrite() is false");
});
check("MemoryAdapter.listMeshes reads labels from the fixture provenance", async () => {
  const adapter = new AA.MemoryAdapter(AA.FIXTURES);
  await adapter.connect();
  const meshes = await adapter.listMeshes();
  assertEqual(meshes.length, 1);
  assertEqual(meshes[0].sha256, AA.FIXTURES.demoSha);
});

// --- commands.js: parsing/dispatch and pure state transitions (handoff
// annotate_deep_link_and_part_filter's command layer) ---
check("tokenizeCommand splits on whitespace and keeps quoted args whole", () => {
  assertEqual(AA.tokenizeCommand('isolate machined_213668'), ["isolate", "machined_213668"]);
  assertEqual(AA.tokenizeCommand('goto pitch_system end_stop_clearance "a study"'),
    ["goto", "pitch_system", "end_stop_clearance", "a study"]);
});
check("tokenizeCommand on an empty string is an empty array", () => {
  assertEqual(AA.tokenizeCommand(""), []);
});

check("CommandLayer.exec dispatches a string command to its registered handler", () => {
  const layer = new AA.CommandLayer();
  let seen = null;
  layer.register("open-part", (id) => { seen = id; return "opened:" + id; });
  const result = layer.exec("open-part abc123");
  assertEqual(seen, "abc123");
  assertEqual(result, "opened:abc123");
});
check("CommandLayer.exec also takes an already-tokenized array -- the deep-link path's shape", () => {
  const layer = new AA.CommandLayer();
  layer.register("goto", (topo, edge) => [topo, edge]);
  assertEqual(layer.exec(["goto", "pitch_system", "end_stop_clearance"]), ["pitch_system", "end_stop_clearance"]);
});
check("CommandLayer.exec on an unknown verb throws, naming the known verbs", () => {
  const layer = new AA.CommandLayer();
  layer.register("show", () => {});
  layer.register("hide", () => {});
  assertThrows(() => layer.exec("nonsense"), "expected a throw for an unknown verb");
  try {
    layer.exec("nonsense");
  } catch (err) {
    if (err.message.indexOf("hide") === -1 || err.message.indexOf("show") === -1) {
      throw new Error("expected the error to name the known verbs, got: " + err.message);
    }
  }
});
check("CommandLayer.exec on an empty command throws", () => {
  const layer = new AA.CommandLayer();
  assertThrows(() => layer.exec(""));
  assertThrows(() => layer.exec([]));
});

// --- exec_queue.js: the flyout's "queue behind loadAll()" gate (handoff
// annotate_load_gate_settles_on_failure) -- a load failure must settle the
// gate with that error, not leave a queued command awaiting a promise that
// never resolves. ---
check("ExecQueue: a command queued before markLoaded() runs once the gate opens", async () => {
  const queue = new AA.ExecQueue();
  const pending = queue.enqueue(() => "ran");
  queue.markLoaded();
  const outcome = await withTimeout(pending, 500, "queued command hung after markLoaded()");
  assertEqual(outcome, { ok: true, result: "ran" });
});
check("ExecQueue: markLoadFailed() settles the gate -- a queued command fails loudly " +
  "instead of hanging forever (the bug this handoff fixes)", async () => {
  const queue = new AA.ExecQueue();
  const pending = queue.enqueue(() => "should never run");
  queue.markLoadFailed(new Error("load failed: boom"));
  const outcome = await withTimeout(pending, 500,
    "queued command hung on the gate after a load failure instead of failing loudly");
  assertEqual(outcome.ok, false);
  assertEqual(outcome.error.message, "load failed: boom");
});
check("ExecQueue: a command queued AFTER markLoadFailed() also fails loudly, never hangs", async () => {
  const queue = new AA.ExecQueue();
  queue.markLoadFailed(new Error("load failed: boom"));
  const pending = queue.enqueue(() => "should never run");
  const outcome = await withTimeout(pending, 500, "late-queued command hung on a failed gate");
  assertEqual(outcome.ok, false);
  assertEqual(outcome.error.message, "load failed: boom");
});
check("ExecQueue: commands still run in arrival order behind a successful gate", async () => {
  const queue = new AA.ExecQueue();
  const seen = [];
  const first = queue.enqueue(async () => { seen.push("first"); return 1; });
  const second = queue.enqueue(async () => { seen.push("second"); return 2; });
  queue.markLoaded();
  const outcomes = await withTimeout(Promise.all([first, second]), 500, "queue hung");
  assertEqual(seen, ["first", "second"]);
  assertEqual(outcomes, [{ ok: true, result: 1 }, { ok: true, result: 2 }]);
});

// --- the transport decision: which pages may ask for a folder grant -------
//
// (handoff surfaces_that_state_something_false, applying apps/viewer's
// viewer_transport_honest_hosted posture here.) These drive the DELEGATION --
// AA.chooseTransport hands the viewer's VA.chooseTransport an `http: null`
// candidate, because this app has no HTTP read transport at all -- so what
// they pin is this app's whole decision: hosted means no control, local means
// the picker.
//
// The FSA side is a SPY rather than a working stub, the same choice the
// viewer's own tier makes for the same reason: there is no File System Access
// API in node, and on a hosted origin what has to be true is that FSA is
// never REACHED.
function fsaSpy() {
  const spy = {
    booted: false,
    init: () => { spy.booted = true; return Promise.resolve(AA.STATE.DISCONNECTED); },
  };
  return spy;
}

check("a hosted annotate page offers no folder grant, and never boots FSA", async () => {
  // A named host, a bare intranet name, and no hostname at all (the strictest
  // answer, for a caller that cannot say where it is).
  for (const hostname of ["tolstack.joby.aero", "kibot", ""]) {
    const spy = fsaSpy();
    const picked = await AA.chooseTransport({
      protocol: "https:", hostname, fsa: spy,
    });
    assertEqual(AA.isHosted(picked), true, `hostname ${JSON.stringify(hostname)}`);
    assertEqual(picked.adapter, null, `hostname ${JSON.stringify(hostname)}`);
    assertEqual(spy.booted, false, "the FSA adapter must never be initialised");
  }
});

check("a LOOPBACK annotate page still gets the picker -- its only way in", async () => {
  // This is the half the viewer does not need and this app cannot live
  // without: drawing-checker serves /tolstack/annotate/ from 127.0.0.1:8000
  // in dev, and ops.toml's serve verb from 127.0.0.1:8843, so a protocol-only
  // rule would leave this app with no way in on ANY origin.
  assertEqual(VA.LOCAL_HOSTNAMES.length > 0, true);
  for (const hostname of VA.LOCAL_HOSTNAMES) {
    const spy = fsaSpy();
    const picked = await AA.chooseTransport({
      protocol: "http:", hostname, fsa: spy,
    });
    assertEqual(AA.isHosted(picked), false, hostname);
    assertEqual(picked.kind, VA.TRANSPORT.FSA, hostname);
    assertEqual(picked.adapter === spy, true, hostname);
    assertEqual(spy.booted, true, hostname);
  }
});

check("a file:// annotate page is the honest dead end, not a hosted page", async () => {
  // Unchanged by this handoff: FSA has no file:// story (storage/fsa.js) so a
  // real browser hands over a null candidate, and the page says so as an
  // ERROR rather than as the hosted notice -- two different facts.
  const picked = await AA.chooseTransport({
    protocol: "file:", hostname: "", fsa: null,
  });
  assertEqual(AA.isHosted(picked), false);
  assertEqual(picked.kind, null);
  assertEqual(picked.adapter, null);
});

check("a loopback page in a browser with no FSA is that same dead end", async () => {
  const picked = await AA.chooseTransport({
    protocol: "http:", hostname: "localhost", fsa: null,
  });
  assertEqual(AA.isHosted(picked), false);
  assertEqual(picked.kind, null);
});

check("the hosted notice offers no control, no path and no command", () => {
  // Jeff's standing web-UI rules: a feature that is absent shows NOTHING
  // about itself, and a terminal command is never rendered for a user to
  // copy. A reader off-machine has no move here, so the sentence states the
  // fact and stops.
  const notice = AA.HOSTED_NOTICE;
  assertNoCommandOrPath(notice, "the hosted notice");
  // ...and, this sentence only: no offer of the control it stands in for, and
  // no URL to go and try instead.
  for (const banned of ["Connect", "connect", "http"]) {
    if (notice.includes(banned)) {
      throw new Error(`the hosted notice mentions ${JSON.stringify(banned)}: ${notice}`);
    }
  }
});

check("the no-projection banner is plain words, with nothing to paste", () => {
  // The other sentence this app says instead of offering a way forward
  // (ISSUE_20260915_annotate_banner_renders_a_terminal_command_for_the_user_
  // to_copy). It used to read "Build it: " with an interpreter and a
  // backslash path concatenated on. A button would be better and needs a
  // transport this app has not got, so plain words are the honest interim --
  // what is asserted here is only that they stay plain.
  assertNoCommandOrPath(AA.NO_PROJECTION_NOTICE, "the no-projection notice");
});

check("this app holds no terminal command for a banner to render", () => {
  // The copy is half of it; the SUPPLY is the other half. The defect was a
  // concatenation at the call site -- AA.CONFIG.rebuild held two build
  // commands as strings and loadAll() pasted one of them onto the banner --
  // so a check on the sentence alone would pass again the moment somebody
  // re-added "Build it: " + a command. Nothing on this page can run one, so
  // the app carries none at all.
  if (AA.CONFIG.rebuild !== undefined) {
    throw new Error("AA.CONFIG.rebuild is back -- a command string this app could render");
  }
  // Read STATICALLY, for the same reason the index.html check above is:
  // app.js is an ES module that touches document and WebGL at load time and
  // cannot be booted in this sandbox.
  const appSource = fs.readFileSync(path.join(here, "app.js"), "utf8");
  if (appSource.includes("CONFIG.rebuild")) {
    throw new Error("app.js reads CONFIG.rebuild -- the banner concatenation is back");
  }
});

check("loadAll's no-projection branch renders that constant, not a sentence of its own", () => {
  // The two checks above certify the CONSTANT and the CONFIG supply route.
  // Neither pairs the constant to the one surface that renders it, so both
  // stay green through the cheapest possible return of the original defect:
  // a bare string literal typed straight into setBanner() at the call site,
  // one character CHEAPER to write than the AA.CONFIG.rebuild concatenation
  // was. Measured -- app.js's no-projection branch restored to the
  // pre-handoff shape with the command inlined, and this tier returned
  // 65/65 (ISSUE_20260915_the_no_projection_banner_guard_pins_the_constant_
  // _not_the_call_site).
  //
  // The RENDERED banner text is the assertion this wants and is out of
  // reach: no tier reaches the connected-folder-with-no-projection state,
  // which needs a real File System Access grant. The call site is not out
  // of reach, and is read statically for the same reason the check above
  // is -- app.js is an ES module that touches document and WebGL at load.
  //
  // The general shape, worth carrying: a guard on a named constant
  // certifies the constant, never that the surface still reads it. Lifting
  // copy into a constant so a testable tier can see it is exactly what
  // moves the assertion away from the defect.
  const appSource = fs.readFileSync(path.join(here, "app.js"), "utf8");
  if (!appSource.includes("setBanner(AA.NO_PROJECTION_NOTICE")) {
    throw new Error("loadAll()'s no-projection banner no longer renders AA.NO_PROJECTION_NOTICE");
  }
});

check("index.html loads the shared decision before this app's own adapter", () => {
  // app.js cannot be booted in this sandbox (ES module, `document`, WebGL --
  // see the verb-table check below for the same constraint), so the one thing
  // the whole posture stands on is read STATICALLY: without this script tag
  // AA.chooseTransport throws, and the page never boots at all.
  const html = fs.readFileSync(path.join(here, "index.html"), "utf8");
  const shared = html.indexOf('src="../viewer/storage/adapter.js"');
  const own = html.indexOf('src="./storage/adapter.js"');
  if (shared === -1) throw new Error("index.html does not load ../viewer/storage/adapter.js");
  if (own === -1) throw new Error("index.html does not load ./storage/adapter.js");
  if (shared > own) throw new Error("the shared decision must load BEFORE this app's adapter");
});

// --- README's verb table <-> app.js's commands.register(...) calls -------
// (issue command_vocabulary_table_has_no_pairing_test, following the same-shape
// fix annotate_vocab_pairing_test made for binding_state.js's arrays). The
// verbs are hand-documented in three places -- this README table, the
// annotate_deep_link_and_part_filter lesson, and the register(...) calls in
// app.js -- and nothing paired any of them: CommandLayer.prototype.verbs()
// exists and is called exactly once, inside the "unknown command" error
// message, never by a test.
//
// app.js cannot be booted in this sandbox to call verbs() at runtime -- it is
// an ES module that queries `document` and imports scene.js's three.js/WebGL
// at load time, and this runner (see the top-of-file docstring) has no DOM
// shim at all. So both sides are read STATICALLY, as text, the same choice
// test_js_python_vocabulary.py and test_sop_vocabulary.py make one repo layer
// down for their own JS-vs-prose pairings: never execute the source to learn
// its vocabulary, read the literals themselves.

// Every `commands.register("verb", ...)` call's first argument. A verb
// registered twice (a copy-paste of the line, not "show" aliasing cmdOpenPart
// -- that is one register() call, not two) would go undetected by a set
// comparison, so the anti-vacuity check below also asserts no duplicates.
function registeredVerbsFromAppJs(text) {
  const verbs = [...text.matchAll(/commands\.register\(\s*"([^"]+)"/g)].map((m) => m[1]);
  if (!verbs.length) {
    throw new Error(
      "found zero commands.register(...) calls in app.js -- the extractor is " +
      "reading the wrong file or the pattern moved"
    );
  }
  return verbs;
}

// The README's table is one row per USAGE, not per verb -- `camera reset` and
// `camera frame <part...>` are two rows naming the same verb, and the
// select-* row lists three verbs separated by " / ". So the unit read out of
// a row is every backtick span in its first column, and a verb is that
// span's first whitespace-delimited token (`open-part <mesh-id|part>` ->
// `open-part`).
function verbsFromReadmeTable(text) {
  const start = text.indexOf("## The command layer");
  if (start < 0) {
    throw new Error("README.md has no '## The command layer' section -- the anchor moved");
  }
  const next = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, next < 0 ? text.length : next);
  const rows = section.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("| `"));
  if (!rows.length) {
    throw new Error(
      "found zero verb-table rows under '## The command layer' in README.md -- " +
      "the table moved or its shape changed"
    );
  }
  const verbs = [];
  for (const row of rows) {
    // The first column, respecting a `\|` escaped INSIDE a cell
    // (`<mesh-id\|part>`) -- splitting the row naively on `|` breaks exactly
    // that cell.
    const col = row.match(/^\|((?:\\.|[^|\\])*)\|/);
    if (!col) {
      throw new Error(`could not read the first column of README table row: ${row}`);
    }
    for (const m of col[1].matchAll(/`([^`]+)`/g)) {
      verbs.push(m[1].trim().split(/\s+/)[0]);
    }
  }
  return verbs;
}

check("the app.js verb extractor finds every commands.register(...) call, none twice", () => {
  const appJsText = fs.readFileSync(path.join(here, "app.js"), "utf8");
  const verbs = registeredVerbsFromAppJs(appJsText);
  if (verbs.length !== new Set(verbs).size) {
    throw new Error(`app.js registers a verb twice: ${JSON.stringify(verbs)}`);
  }
});

check("the README verb-table extractor finds every row and none of them is empty", () => {
  const readmeText = fs.readFileSync(path.join(here, "README.md"), "utf8");
  if (!verbsFromReadmeTable(readmeText).length) {
    throw new Error("expected at least one verb out of README.md's table");
  }
});

check("README.md's verb table names exactly the verbs commands.register(...) wires up in app.js", () => {
  const appJsText = fs.readFileSync(path.join(here, "app.js"), "utf8");
  const readmeText = fs.readFileSync(path.join(here, "README.md"), "utf8");
  const coded = new Set(registeredVerbsFromAppJs(appJsText));
  const documented = new Set(verbsFromReadmeTable(readmeText));
  const missing = [...coded].filter((v) => !documented.has(v)).sort();
  const extra = [...documented].filter((v) => !coded.has(v)).sort();
  if (missing.length || extra.length) {
    throw new Error(
      "apps/annotate/README.md's verb table has drifted from app.js's " +
      "commands.register(...) calls:\n" +
      (missing.length ? `  app.js registers, the README doesn't document: ${JSON.stringify(missing)}\n` : "") +
      (extra.length ? `  the README documents, app.js doesn't register: ${JSON.stringify(extra)}\n` : "")
    );
  }
});

check("the pairing above can fail -- a verb added to app.js with no doc update is caught", () => {
  const appJsText = fs.readFileSync(path.join(here, "app.js"), "utf8");
  const readmeText = fs.readFileSync(path.join(here, "README.md"), "utf8");
  const anchor = 'commands.register("goto", cmdGoto);';
  const withFakeVerb = appJsText.replace(anchor, `${anchor}\ncommands.register("teleport", cmdGoto);`);
  if (withFakeVerb === appJsText) {
    throw new Error(`the anchor line this test mutates is not in app.js: ${anchor}`);
  }
  const coded = new Set(registeredVerbsFromAppJs(withFakeVerb));
  const documented = new Set(verbsFromReadmeTable(readmeText));
  const missing = [...coded].filter((v) => !documented.has(v));
  if (missing.length !== 1 || missing[0] !== "teleport") {
    throw new Error(
      `expected the pairing to catch exactly the synthetic verb "teleport", got: ${JSON.stringify(missing)}`
    );
  }
});

const MESHES = [
  { sha256: "aaaa", label: "Part A", part_id: "part_a" },
  { sha256: "bbbb", label: "Part B", part_id: "part_b" },
];
check("resolveMeshIdentifier matches by sha256", () => {
  assertEqual(AA.resolveMeshIdentifier(MESHES, "bbbb"), MESHES[1]);
});
check("resolveMeshIdentifier matches by part_id", () => {
  assertEqual(AA.resolveMeshIdentifier(MESHES, "part_a"), MESHES[0]);
});
check("resolveMeshIdentifier returns null rather than throwing on a miss", () => {
  if (AA.resolveMeshIdentifier(MESHES, "no_such_part") !== null) {
    throw new Error("expected null for an unmatched identifier");
  }
});

// --- the alias table (handoff mesh_part_alias_table): resolution precedence.
// Direct sha256/part_id matches win; the alias table is consulted second;
// unmapped stays null (the caller's empty state) -- and never a fuzzy match.
const ALIASES = [
  // Deliberately maps identifiers that ALSO exist directly, so the precedence
  // tests below can tell "direct match won" from "alias won": if the alias
  // pass ran first, "aaaa"/"part_a" would land on Part B.
  { topology_part: "aaaa", mesh_part_id: "part_b" },
  { topology_part: "part_a", mesh_part_id: "part_b" },
  { topology_part: "topology_name_for_part_a", mesh_part_id: "part_a" },
  { topology_part: "ghost_part", mesh_part_id: "not_installed" },
];
check("resolveMeshIdentifier: a direct sha256 match wins over an alias with the same key", () => {
  assertEqual(AA.resolveMeshIdentifier(MESHES, "aaaa", ALIASES), MESHES[0]);
});
check("resolveMeshIdentifier: a direct part_id match wins over an alias with the same key", () => {
  assertEqual(AA.resolveMeshIdentifier(MESHES, "part_a", ALIASES), MESHES[0]);
});
check("resolveMeshIdentifier: an alias resolves a topology part id to its declared mesh", () => {
  assertEqual(AA.resolveMeshIdentifier(MESHES, "topology_name_for_part_a", ALIASES), MESHES[0]);
});
check("resolveMeshIdentifier: an alias to a mesh that is not installed is still null", () => {
  if (AA.resolveMeshIdentifier(MESHES, "ghost_part", ALIASES) !== null) {
    throw new Error("expected null when the alias's mesh_part_id has no installed mesh");
  }
});
check("resolveMeshIdentifier: an unmapped identifier stays null with the table present -- the existing empty state", () => {
  if (AA.resolveMeshIdentifier(MESHES, "still_no_such_part", ALIASES) !== null) {
    throw new Error("expected null for an identifier no alias declares");
  }
});
check("resolveMeshIdentifier: aliases match exactly, never by substring", () => {
  // A prefix of a declared key, and a key that is a prefix of the identifier:
  // both must miss -- the strategy brief rejected fuzzy matching by name.
  if (AA.resolveMeshIdentifier(MESHES, "topology_name_for", ALIASES) !== null) {
    throw new Error("a prefix of an alias key matched -- substring leniency crept in");
  }
  if (AA.resolveMeshIdentifier(MESHES, "topology_name_for_part_a_extra", ALIASES) !== null) {
    throw new Error("an identifier extending an alias key matched -- substring leniency crept in");
  }
});

check("planIsolate: nothing open yet -- everything named needs to open", () => {
  assertEqual(AA.planIsolate([], ["aaaa", "bbbb"]),
    { toOpen: ["aaaa", "bbbb"], toShow: [], toHide: [] });
});
check("planIsolate: some already open -- those just show, the rest open, others hide", () => {
  assertEqual(AA.planIsolate(["aaaa", "cccc"], ["aaaa", "bbbb"]),
    { toOpen: ["bbbb"], toShow: ["aaaa"], toHide: ["cccc"] });
});
check("planIsolate: isolating everything already open hides nothing and opens nothing", () => {
  assertEqual(AA.planIsolate(["aaaa", "bbbb"], ["aaaa", "bbbb"]),
    { toOpen: [], toShow: ["aaaa", "bbbb"], toHide: [] });
});

// --- faceSubGeometry (handoff study_3d_flyout): the mark-face overlay's
// geometry extraction, pure over plain arrays. Two faces: face 0 is one
// triangle over vertices 0..2, face 1 is two triangles over vertices 3..6.
const SUB_POSITIONS = [
  0, 0, 0, 1, 0, 0, 0, 1, 0,          // face 0's run (vertices 0..2)
  0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, // face 1's run (vertices 3..6)
];
const SUB_INDICES = [0, 1, 2, 3, 4, 5, 4, 6, 5];
const SUB_FIDS = [0, 1, 1];

check("faceSubGeometry copies one face's vertex run and remaps its indices to it", () => {
  const sub = AA.faceSubGeometry(SUB_POSITIONS, SUB_INDICES, SUB_FIDS,
    { start: 3, count: 4 }, 1);
  assertEqual(sub.positions, SUB_POSITIONS.slice(9));
  assertEqual(sub.indices, [0, 1, 2, 1, 3, 2]);
});
check("faceSubGeometry on the first face uses only its own run", () => {
  const sub = AA.faceSubGeometry(SUB_POSITIONS, SUB_INDICES, SUB_FIDS,
    { start: 0, count: 3 }, 0);
  assertEqual(sub.positions, SUB_POSITIONS.slice(0, 9));
  assertEqual(sub.indices, [0, 1, 2]);
});
check("faceSubGeometry throws on a triangle outside the face's own vertex run -- " +
  "the contiguous-run contract, violated, must not draw something wrong", () => {
  assertThrows(() => AA.faceSubGeometry(SUB_POSITIONS, SUB_INDICES, SUB_FIDS,
    { start: 0, count: 2 }, 0));
});
check("faceSubGeometry throws for a face with no triangles", () => {
  assertThrows(() => AA.faceSubGeometry(SUB_POSITIONS, SUB_INDICES, SUB_FIDS,
    { start: 0, count: 3 }, 7));
});

// --- planStudyTrace (handoff study_3d_flyout): the per-study 3D trace as
// data. Fixture-shaped plain objects; the identity projection reuses the
// mock fixture's own (demo_edge_untraced bound to face 0 of the demo mesh).
const TRACE_TOPO = {
  id: "demo_system",
  edges: [
    { id: "e_solid", part: "part_a" },
    { id: "e_alias", part: "topology_name_for_part_a" },
    { id: "e_missing", part: "no_such_part" },
    { id: "e_gap", part: null },
    { id: "e_dup", part: "part_a" },
  ],
};
const TRACE_IDENTITY = {
  stack_keys: [
    {
      stack_key: { kind: "topology_edge", topology_id: "demo_system", edge_id: "e_solid" },
      bindings: [{ event_id: "x1", geometry_key: { source_step_sha256: "bbbb", face_id: 4 } }],
    },
    {
      stack_key: { kind: "topology_edge", topology_id: "demo_system", edge_id: "e_missing" },
      bindings: [{ event_id: "x2", geometry_key: { source_step_sha256: "f".repeat(64), face_id: 0 } }],
    },
  ],
};
check("planStudyTrace resolves parts in selection order, once each, through the alias table", () => {
  const plan = AA.planStudyTrace(TRACE_TOPO,
    { selection: ["e_solid", "e_alias", "e_missing", "e_gap", "e_dup"] },
    null, MESHES, ALIASES);
  assertEqual(plan.parts, [
    { part: "part_a", sha256: "aaaa" },
    { part: "topology_name_for_part_a", sha256: "aaaa" },
    { part: "no_such_part", sha256: null },
  ]);
  assertEqual(plan.ghosts, ["aaaa"]);
  assertEqual(plan.missingParts, ["no_such_part"]);
});
check("planStudyTrace with no identity projection reports every edge unbound -- never an error", () => {
  const plan = AA.planStudyTrace(TRACE_TOPO, { selection: ["e_solid", "e_gap"] },
    null, MESHES, ALIASES);
  assertEqual(plan.marks, []);
  assertEqual(plan.unboundEdges, ["e_solid", "e_gap"]);
});
check("planStudyTrace marks a bound face, and pulls its mesh into the ghosts even " +
  "when the part list missed it", () => {
  const plan = AA.planStudyTrace(TRACE_TOPO, { selection: ["e_solid"] },
    TRACE_IDENTITY, MESHES, ALIASES);
  // e_solid's part resolves to aaaa, but its binding lives on bbbb: both ghost.
  assertEqual(plan.ghosts, ["aaaa", "bbbb"]);
  assertEqual(plan.marks, [{ edgeId: "e_solid", sha256: "bbbb", faceId: 4 }]);
  assertEqual(plan.unboundEdges, []);
});
check("planStudyTrace reports a binding to an uninstalled mesh as unresolved, not a mark", () => {
  const plan = AA.planStudyTrace(TRACE_TOPO, { selection: ["e_missing"] },
    TRACE_IDENTITY, MESHES, ALIASES);
  assertEqual(plan.marks, []);
  assertEqual(plan.unresolvedMarks, [{ edgeId: "e_missing", sha256: "f".repeat(64) }]);
  assertEqual(plan.missingParts, ["no_such_part"]);
});
check("planStudyTrace over the mock fixture's own study matches its data end to end", () => {
  const topo = AA.FIXTURES.topologyProjection.topologies[0];
  const meshes = [{ sha256: AA.FIXTURES.demoSha, label: "demo", part_id: "demo_triangle" }];
  const plan = AA.planStudyTrace(topo, topo.studies[0],
    AA.FIXTURES.featureIdentityProjection, meshes, []);
  assertEqual(plan.ghosts, [AA.FIXTURES.demoSha]);
  assertEqual(plan.marks, [{ edgeId: "demo_edge_untraced", sha256: AA.FIXTURES.demoSha, faceId: 0 }]);
  assertEqual(plan.missingParts, ["no_such_part"]);
  assertEqual(plan.unboundEdges, ["demo_edge_traced", "demo_edge_no_owner"]);
});

// --- planPanelFilter: the left rail scoped to ONE element (handoff
// flyout_resize_annotator_filter_and_deselect, deliverable 2) ---------------
//
// Jeff: "it should also auto-filter the left side menu to just the features
// that are in the element (node or edge) it was entered from." The gap this
// closes is specific and was measurable: cmdTrace/cmdGoto already scoped the
// ELEMENT list to a study, and the PARTS panel was scoped by nothing at all.
const FILTER_TOPO = AA.FIXTURES.topologyProjection.topologies[0];
const FILTER_MESHES = [{ sha256: AA.FIXTURES.demoSha, label: "demo", part_id: "demo_triangle" }];

check("planPanelFilter on an edge keeps that one element and resolves its own part", () => {
  const plan = AA.planPanelFilter(FILTER_TOPO, "demo_edge_untraced", FILTER_MESHES, []);
  assertEqual(plan.kind, "edge");
  assertEqual(plan.target, "demo_edge_untraced");
  assertEqual(plan.edgeIds, ["demo_edge_untraced"]);
  assertEqual(plan.parts, [{ part: "demo_triangle", sha256: AA.FIXTURES.demoSha }]);
  assertEqual(plan.missingParts, []);
});

check("planPanelFilter reports a named part with no installed mesh rather than " +
  "silently showing every mesh again", () => {
  // The honest-absence posture the rest of this app takes: the rail says which
  // part has no 3D, and the parts panel is empty because it IS empty.
  const plan = AA.planPanelFilter(FILTER_TOPO, "demo_edge_no_owner", FILTER_MESHES, []);
  assertEqual(plan.kind, "edge");
  assertEqual(plan.parts, [{ part: "no_such_part", sha256: null }]);
  assertEqual(plan.missingParts, ["no_such_part"]);
});

check("planPanelFilter on a gap edge that names no part at all filters the " +
  "element list and leaves nothing to show in 3D", () => {
  const plan = AA.planPanelFilter(FILTER_TOPO, "demo_edge_traced", FILTER_MESHES, []);
  assertEqual(plan.kind, "edge");
  assertEqual(plan.edgeIds, ["demo_edge_traced"]);
  assertEqual(plan.parts, []);
  assertEqual(plan.missingParts, []);
});

check("planPanelFilter on a NODE keeps every element touching it -- a node is " +
  "an element of a topology too", () => {
  const withNodes = JSON.parse(JSON.stringify(FILTER_TOPO));
  withNodes.nodes = [{ id: "b", name: "interface b", parts: ["demo_triangle"] }];
  const plan = AA.planPanelFilter(withNodes, "b", FILTER_MESHES, []);
  assertEqual(plan.kind, "node");
  // "b" is the `to` of the traced edge and the `from` of the untraced one.
  assertEqual(plan.edgeIds, ["demo_edge_traced", "demo_edge_untraced"]);
  assertEqual(plan.parts, [{ part: "demo_triangle", sha256: AA.FIXTURES.demoSha }]);
});

check("planPanelFilter on a topology with NO node table at all still filters " +
  "by edge -- a node id simply matches nothing", () => {
  // This was carried by the fixture itself until 2026-09-21, when it gained a
  // node table (handoff annotate_face_suggestions: the suggestion rules ask an
  // interface for its name). An assertion that rode on a fixture's shape is an
  // assertion that disappears the day the fixture grows, so it is written out.
  const bare = JSON.parse(JSON.stringify(FILTER_TOPO));
  delete bare.nodes;
  assertEqual(AA.planPanelFilter(bare, "demo_edge_untraced", FILTER_MESHES, []).kind,
    "edge", "an edge stopped resolving without a node table");
  assertEqual(AA.planPanelFilter(bare, "b", FILTER_MESHES, []).kind, null,
    "a node id resolved against a topology that has no nodes");
});

check("planPanelFilter on an id nothing in the topology carries reports kind " +
  "null -- the caller decides how loudly to say so", () => {
  const plan = AA.planPanelFilter(FILTER_TOPO, "not_a_thing", FILTER_MESHES, []);
  assertEqual(plan.kind, null);
  assertEqual(plan.edgeIds, []);
  assertEqual(plan.parts, []);
});

check("planPanelFilter resolves a part through the alias table, the same way " +
  "every other part lookup in this app does", () => {
  const aliased = JSON.parse(JSON.stringify(FILTER_TOPO));
  aliased.edges[1].part = "topology_side_name";
  const plan = AA.planPanelFilter(aliased, "demo_edge_untraced", FILTER_MESHES,
    [{ topology_part: "topology_side_name", mesh_part_id: "demo_triangle" }]);
  assertEqual(plan.parts, [{ part: "topology_side_name", sha256: AA.FIXTURES.demoSha }]);
});

// --- planPickToggle: a face can be DESELECTED (deliverable 3) ---------------
//
// Jeff: "I accidentally clicked a face … but there's no way to deselect a
// surface." Three surfaces, one decision -- a click into empty space and a
// click back onto the already-picked face both clear. Pure so it can be
// checked with no WebGL at all (see this file's header on why real click
// automation is not run on this machine).
const PICK_A = { sha256: "a".repeat(64), faceId: 3, record: {} };
const PICK_B = { sha256: "a".repeat(64), faceId: 4, record: {} };
const PICK_C = { sha256: "b".repeat(64), faceId: 3, record: {} };

check("planPickToggle: a click into empty space clears the pick", () => {
  assertEqual(AA.planPickToggle(PICK_A, null), { action: "clear", pick: null });
  // ...and clearing when nothing is picked is still a clear, not an error:
  // this is the undo of a mis-click.
  assertEqual(AA.planPickToggle(null, null), { action: "clear", pick: null });
});

check("planPickToggle: re-clicking the SAME face toggles it off", () => {
  assertEqual(AA.planPickToggle(PICK_A, { sha256: PICK_A.sha256, faceId: PICK_A.faceId }),
    { action: "clear", pick: null });
});

check("planPickToggle: another face on the same part, and the same face id on " +
  "another part, both SELECT -- the toggle is per (part, face), not per id", () => {
  assertEqual(AA.planPickToggle(PICK_A, PICK_B).action, "select");
  assertEqual(AA.planPickToggle(PICK_A, PICK_C).action, "select");
  assertEqual(AA.planPickToggle(null, PICK_A), { action: "select", pick: PICK_A });
});

check("DESELECT_TARGETS is a closed set whose FIRST value is the default the " +
  "UI's own paths use", () => {
  assertEqual(AA.DESELECT_TARGETS, ["face", "element", "all"]);
  // "face" first is load-bearing: cmdDeselect defaults to DESELECT_TARGETS[0],
  // and defaulting to "all" would take the bind form down with a mis-click.
  assertEqual(AA.DESELECT_TARGETS[0], "face");
});

// --- one alert badge per row (deliverable 5) --------------------------------
//
// Jeff: "roll all the alert badges into one single alert badge (something like
// a triangle ! icon). Mouse over the icon has a popup that lists out the
// actual alerts." The row keeps the COLOUR (a class per state, style.css);
// the words move into this table and out of the badge's text, where they used
// to be the raw schema value.
check("every binding state except `bound` has an alert sentence, and `bound` " +
  "deliberately has none", () => {
  const states = Object.keys(AA.BINDING_STATES).map((k) => AA.BINDING_STATES[k]);
  const alerted = Object.keys(AA.BINDING_STATE_ALERTS).sort();
  const expected = states.filter((s) => s !== AA.BINDING_STATES.BOUND).sort();
  // The pairing, so a state added to AA.BINDING_STATES without a decision
  // about whether it is an alert fails HERE rather than rendering a silent row.
  assertEqual(alerted, expected);
  if (AA.BINDING_STATE_ALERTS[AA.BINDING_STATES.BOUND] !== undefined) {
    throw new Error("`bound` must carry no alert -- a row with nothing wrong shows NOTHING");
  }
});

check("the alert sentences are everyday words -- no schema value, no " +
  "underscored identifier, on a surface a reader reads", () => {
  // This is the defect the consolidation actually fixed: the badge used to
  // print `needs_re_confirmation` on the row.
  for (const [state, text] of Object.entries(AA.BINDING_STATE_ALERTS)) {
    if (text.indexOf(state) !== -1) {
      throw new Error(`the alert for ${state} prints the state VALUE: ${text}`);
    }
    if (/[a-z]_[a-z]/.test(text)) {
      throw new Error(`the alert for ${state} carries an underscored identifier: ${text}`);
    }
    if (text.length < 20) {
      throw new Error(`the alert for ${state} is too short to be a sentence: ${text}`);
    }
  }
});

check("elementAlerts returns a LIST -- none for a bound row, one per alerting " +
  "state -- because the badge showing it is one badge either way", () => {
  assertEqual(AA.elementAlerts(AA.BINDING_STATES.BOUND), []);
  assertEqual(AA.elementAlerts(AA.BINDING_STATES.UNBOUND), [{
    state: "unbound", text: AA.BINDING_STATE_ALERTS.unbound,
  }]);
  assertEqual(AA.elementAlerts(AA.BINDING_STATES.NEEDS_RECONFIRMATION), [{
    state: "needs_re_confirmation",
    text: AA.BINDING_STATE_ALERTS.needs_re_confirmation,
  }]);
  // A state this app has never heard of gets no alert rather than an invented
  // one -- the same posture elementBindingState takes toward an absent record.
  assertEqual(AA.elementAlerts("something_else"), []);
  assertEqual(AA.elementAlerts(undefined), []);
});

check("the three fixture edges are three different binding states -- two that " +
  "alert and one that is silent", () => {
  // Anti-vacuity for the rail: the mock topology is what ?mock=1 renders and
  // what the browser tier screenshots, so it has to actually contain a bound
  // row (no badge), an unbound one and an owner-not-in-set one.
  //
  // NOT "every branch", which is what this check claimed until review:
  // AA.BINDING_STATE_ALERTS has THREE alerting states and the fixture reaches
  // two. `needs_re_confirmation` needs a staleness map, which no fixture
  // carries, so it is covered by elementAlerts' own unit check above and not
  // here. (Same class as this branch's own "a check whose claim was wider than
  // the node it read".)
  const states = FILTER_TOPO.studies[0].selection.map((edgeId) => {
    const record = AA.findBindingRecord(AA.FIXTURES.featureIdentityProjection,
      AA.topologyEdgeKey(FILTER_TOPO.id, edgeId));
    return AA.elementBindingState(record);
  });
  assertEqual(states, ["unbound", "bound", "owner_not_in_set"]);
  const badged = states.filter((st) => AA.elementAlerts(st).length > 0);
  assertEqual(badged, ["unbound", "owner_not_in_set"]);
});

check("ALERT_ICON is one glyph and is not a word -- the badge carries no text " +
  "to read, which is the whole point of the popup", () => {
  if (Array.from(AA.ALERT_ICON).length !== 1) {
    throw new Error("expected a single glyph, got " + JSON.stringify(AA.ALERT_ICON));
  }
  if (/[a-z]/i.test(AA.ALERT_ICON)) {
    throw new Error("the badge glyph must not be letters: " + AA.ALERT_ICON);
  }
});

// --- scope-level entry: a whole study, or a whole topology ------------------
//
// (handoff annotate_hint_bar_and_context_autofilter, deliverable 4. Jeff:
// "when an entire study or topology is selected, there should be a way to
// enter the 3d view, pre-filtered to just the parts included in that
// study/topology".) The difference between the two scopes is which edges are
// in scope and NOTHING else, which is what `scopeSelection` is for -- so the
// trace and the panel filter both read it and cannot disagree about what
// "topology scope" means.
check("scopeSelection: a study is its own lassoed selection; no study is every " +
  "edge in the topology", () => {
  assertEqual(AA.scopeSelection(TRACE_TOPO, { selection: ["e_gap", "e_solid"] }),
    ["e_gap", "e_solid"]);
  assertEqual(AA.scopeSelection(TRACE_TOPO, null),
    ["e_solid", "e_alias", "e_missing", "e_gap", "e_dup"]);
  // A study with no selection is an EMPTY scope, not the whole topology: it
  // says "these elements", and it named none.
  assertEqual(AA.scopeSelection(TRACE_TOPO, { selection: [] }), []);
});

check("planStudyTrace with no study traces the WHOLE topology -- the same " +
  "ghosts and marks, over every edge", () => {
  const plan = AA.planStudyTrace(TRACE_TOPO, null, TRACE_IDENTITY, MESHES, ALIASES);
  assertEqual(plan.parts, [
    { part: "part_a", sha256: "aaaa" },
    { part: "topology_name_for_part_a", sha256: "aaaa" },
    { part: "no_such_part", sha256: null },
  ]);
  assertEqual(plan.marks, [{ edgeId: "e_solid", sha256: "bbbb", faceId: 4 }]);
  assertEqual(plan.unresolvedMarks, [{ edgeId: "e_missing", sha256: "f".repeat(64) }]);
});

check("planScopeFilter returns the SAME shape planPanelFilter does, so the " +
  "rail's two renderers and its scope bar need no second kind of scope", () => {
  const study = { id: "s1", title: "A study", selection: ["e_solid", "e_missing"] };
  const plan = AA.planScopeFilter(TRACE_TOPO, study, MESHES, ALIASES);
  assertEqual(plan.kind, "study");
  assertEqual(plan.target, "s1");
  assertEqual(plan.name, "A study");
  assertEqual(plan.edgeIds, ["e_solid", "e_missing"]);
  assertEqual(plan.parts, [
    { part: "part_a", sha256: "aaaa" },
    { part: "no_such_part", sha256: null },
  ]);
  assertEqual(plan.missingParts, ["no_such_part"]);
  // Every key planPanelFilter's plan carries, so a renderer reading one can
  // read the other -- `name` is the one field only a scope has.
  const element = AA.planPanelFilter(FILTER_TOPO, "demo_edge_untraced", FILTER_MESHES, []);
  const missing = Object.keys(element).filter((k) => !(k in plan));
  if (missing.length) {
    throw new Error("a scope plan is missing planPanelFilter's " +
      JSON.stringify(missing) + " -- the rail's renderers read both");
  }
});

check("planScopeFilter with no study scopes the whole topology, naming it", () => {
  const topology = { id: "t1", title: "A mechanism", edges: TRACE_TOPO.edges };
  const plan = AA.planScopeFilter(topology, null, MESHES, ALIASES);
  assertEqual(plan.kind, "topology");
  assertEqual(plan.target, "t1");
  assertEqual(plan.name, "A mechanism");
  assertEqual(plan.edgeIds, ["e_solid", "e_alias", "e_missing", "e_gap", "e_dup"]);
  // Each part once, in first-mention order, even though two edges name part_a.
  assertEqual(plan.parts.map((p) => p.part),
    ["part_a", "topology_name_for_part_a", "no_such_part"]);
});

// --- on/off, one vocabulary ------------------------------------------------
check("parseOnOff takes exactly the two words in AA.ON_OFF and nothing else", () => {
  assertEqual(AA.ON_OFF, ["on", "off"]);
  assertEqual(AA.parseOnOff("on"), true);
  assertEqual(AA.parseOnOff("off"), false);
  // The near-misses that would otherwise become a second, undocumented
  // vocabulary the moment one of them was accepted.
  ["1", "0", "true", "false", "yes", "", undefined].forEach((bad) => {
    assertThrows(() => AA.parseOnOff(bad),
      "expected parseOnOff to refuse " + JSON.stringify(bad));
  });
  assertEqual(AA.onOff(true), "on");
  assertEqual(AA.onOff(false), "off");
});

// --- the auto-filter switches (deliverable 3) ------------------------------
check("AUTO_STEPS names the three steps Jeff asked for, in everyday words " +
  "with no algorithm name on a checkbox", () => {
  assertEqual(AA.AUTO_STEP_KEYS, ["topology", "study", "part"]);
  if (AA.AUTO_STEPS.length !== AA.AUTO_STEP_KEYS.length) {
    throw new Error("AUTO_STEPS and AUTO_STEP_KEYS have drifted");
  }
  AA.AUTO_STEPS.forEach((step) => {
    assertNothingBanned(step.label, `AA.AUTO_STEPS.${step.key}.label`);
    assertNothingBanned(step.hint, `AA.AUTO_STEPS.${step.key}.hint`);
    if (/[a-z]_[a-z]/.test(step.label) || /filter|algorithm/i.test(step.label)) {
      throw new Error(`the ${step.key} checkbox's label is not everyday words: ${step.label}`);
    }
    if (step.hint.length < 20) {
      throw new Error(`the ${step.key} checkbox's hint is too short to be a sentence`);
    }
  });
});

check("normalizeAutoSteps: everything on by default, an unknown key dropped, " +
  "a non-boolean read as 'not set' rather than as off", () => {
  assertEqual(AA.normalizeAutoSteps(null), { topology: true, study: true, part: true });
  assertEqual(AA.normalizeAutoSteps({ study: false }),
    { topology: true, study: false, part: true });
  assertEqual(AA.normalizeAutoSteps({ nonsense: false, part: "no" }),
    { topology: true, study: true, part: true });
});

check("planArrival: every step on is the behaviour this app had before the " +
  "checkboxes existed", () => {
  assertEqual(AA.planArrival({
    auto: AA.defaultAutoSteps(), currentTopologyId: "other", topologyId: "t1",
  }), {
    applies: true, keptTopologyId: null,
    selectTopology: true, selectStudy: true, scopeParts: true,
  });
});

check("planArrival: each switch turns off its own step and disturbs no other", () => {
  const base = { currentTopologyId: "t1", topologyId: "t1" };
  const off = (key) => {
    const auto = AA.defaultAutoSteps();
    auto[key] = false;
    return AA.planArrival(Object.assign({ auto }, base));
  };
  assertEqual(off("study"), {
    applies: true, keptTopologyId: null,
    selectTopology: true, selectStudy: false, scopeParts: true,
  });
  assertEqual(off("part"), {
    applies: true, keptTopologyId: null,
    selectTopology: true, selectStudy: true, scopeParts: false,
  });
  // Topology off, same topology already open: there is nothing to select, and
  // everything below still applies.
  assertEqual(off("topology"), {
    applies: true, keptTopologyId: null,
    selectTopology: false, selectStudy: true, scopeParts: true,
  });
});

check("planArrival: topology off with a DIFFERENT topology open keeps the " +
  "reader's own pick -- and says so rather than half-applying", () => {
  const auto = AA.defaultAutoSteps();
  auto.topology = false;
  const plan = AA.planArrival({ auto, currentTopologyId: "other", topologyId: "t1" });
  assertEqual(plan.applies, false);
  assertEqual(plan.keptTopologyId, "other");
  // Nothing below it runs: a study id and an edge id from t1 name nothing in
  // `other`, so a partial application would be an error, not a courtesy.
  assertEqual(plan.selectStudy, false);
  assertEqual(plan.scopeParts, false);
});

check("planArrival: topology off with NOTHING open still selects -- there is " +
  "no reader's pick to keep", () => {
  const auto = AA.defaultAutoSteps();
  auto.topology = false;
  const plan = AA.planArrival({ auto, currentTopologyId: null, topologyId: "t1" });
  assertEqual(plan.applies, true);
  assertEqual(plan.selectTopology, true);
});

// --- the URL params as a command list (deliverable 2) ----------------------
check("planEntryCommands: a plain element link is goto, with the empty " +
  "positional args the tokenizer would have produced", () => {
  assertEqual(AA.planEntryCommands({ topology: "t1", edge: "e1", study: "s1" }),
    [["goto", "t1", "e1", "s1"]]);
  assertEqual(AA.planEntryCommands({ topology: "t1" }), [["goto", "t1", "", ""]]);
});

check("planEntryCommands: an explicit isolate= runs AFTER goto, so a named " +
  "part beats the one the element derived", () => {
  assertEqual(AA.planEntryCommands({ topology: "t1", edge: "e1", isolate: "part_a, part_b" }),
    [["goto", "t1", "e1", ""], ["isolate", "part_a", "part_b"]]);
  // An isolate with nothing in it is not a command at all.
  assertEqual(AA.planEntryCommands({ topology: "t1", isolate: " , " }),
    [["goto", "t1", "", ""]]);
});

check("planEntryCommands: trace owns the whole scene -- it drops edge and " +
  "isolate rather than half-undoing itself", () => {
  assertEqual(AA.planEntryCommands({ trace: true, topology: "t1", study: "s1",
    edge: "e1", isolate: "part_a" }), [["trace", "t1", "s1"]]);
  // ...and trace with no study is the topology-scope entry (deliverable 4).
  assertEqual(AA.planEntryCommands({ trace: true, topology: "t1" }),
    [["trace", "t1", ""]]);
});

check("planEntryCommands: no params at all is no commands -- an app opened " +
  "cold runs nothing", () => {
  assertEqual(AA.planEntryCommands({}), []);
  assertEqual(AA.planEntryCommands(null), []);
  // trace=1 with no topology names no scope, so there is nothing to trace.
  assertEqual(AA.planEntryCommands({ trace: true }), []);
  // ...and an isolate on its own still works, as it always has.
  assertEqual(AA.planEntryCommands({ isolate: "part_a" }), [["isolate", "part_a"]]);
});

// --- the one-line task instruction (deliverable 2) -------------------------
//
// Jeff: "user can just be given simple instructions (ie select the two faces
// that define the bushing length…)". Singular/plural comes from what the
// binding still needs, which is what `bindingDirectionsNeeded` reads off the
// record -- never from a guess about the element's kind.
check("bindingDirectionsNeeded: nothing bound needs both directions; one " +
  "bound leaves the other", () => {
  assertEqual(AA.bindingDirectionsNeeded(null), ["from", "to"]);
  assertEqual(AA.bindingDirectionsNeeded({ bindings: [] }), ["from", "to"]);
  assertEqual(AA.bindingDirectionsNeeded({ bindings: [{ direction: "from" }] }), ["to"]);
  assertEqual(AA.bindingDirectionsNeeded({
    bindings: [{ direction: "from" }, { direction: "to" }],
  }), []);
  // Two faces recorded for the SAME direction still leave the other open.
  assertEqual(AA.bindingDirectionsNeeded({
    bindings: [{ direction: "to" }, { direction: "to" }],
  }), ["from"]);
});

check("taskInstruction: with no element it is the sentence this app has " +
  "always opened with", () => {
  assertEqual(AA.taskInstruction({}), AA.TASK_NO_ELEMENT);
  assertEqual(AA.taskInstruction(null), AA.TASK_NO_ELEMENT);
});

check("taskInstruction: a scope entry names the scope instead", () => {
  const text = AA.taskInstruction({ scopeName: "End-stop chain" });
  if (text.indexOf("End-stop chain") === -1) {
    throw new Error("the scope entry's instruction does not name the scope: " + text);
  }
  assertNothingBanned(text, "AA.taskInstruction (scope)");
});

check("taskInstruction: two faces, then one, then done -- the count comes " +
  "from what the binding still needs", () => {
  const named = (needed) => AA.taskInstruction({
    elementName: "Bushing length", needed,
  });
  if (named(["from", "to"]) !== "Select the two faces that define Bushing length.") {
    throw new Error("unexpected two-face instruction: " + named(["from", "to"]));
  }
  if (named(["to"]).indexOf("remaining face") === -1) {
    throw new Error("unexpected one-face instruction: " + named(["to"]));
  }
  if (named([]).indexOf("already has") === -1) {
    throw new Error("unexpected fully-bound instruction: " + named([]));
  }
  // An element with no record at all defaults to both, never to "done".
  assertEqual(AA.taskInstruction({ elementName: "Bushing length" }),
    named(["from", "to"]));
});

check("taskInstruction: a picked face turns the instruction into the action " +
  "the bind form is about to take", () => {
  const text = AA.taskInstruction({ elementName: "Bushing length", picked: true,
    needed: ["from", "to"] });
  if (text.indexOf("Bind") !== 0 || text.indexOf("Bushing length") === -1) {
    throw new Error("unexpected picked-face instruction: " + text);
  }
});

check("every sentence the top bar composes survives the shared ban list, and " +
  "carries no schema word", () => {
  const sentences = [AA.TASK_NO_ELEMENT]
    .concat(AA.HELP_LINES)
    .concat([
      AA.taskInstruction({ elementName: "Bushing length", needed: ["from", "to"] }),
      AA.taskInstruction({ elementName: "Bushing length", needed: ["to"] }),
      AA.taskInstruction({ elementName: "Bushing length", needed: [] }),
      AA.taskInstruction({ elementName: "Bushing length", picked: true }),
      AA.taskInstruction({ scopeName: "End-stop chain" }),
    ]);
  if (sentences.length < 9) {
    throw new Error("the sentence scan collected " + sentences.length +
      " strings -- it has drifted and now passes against anything");
  }
  sentences.forEach((text, i) => {
    assertNothingBanned(text, `top-bar sentence #${i + 1} (${JSON.stringify(text)})`);
    if (/[a-z]_[a-z]/.test(text)) {
      throw new Error(`top-bar sentence #${i + 1} carries an underscored identifier: ${text}`);
    }
  });
});

check("HELP_LINES are LINES -- short, one idea each, no paragraphs", () => {
  if (AA.HELP_LINES.length < 3) {
    throw new Error("the help panel has fewer lines than it claims to");
  }
  AA.HELP_LINES.forEach((line) => {
    // The house rule this is: "short lines, no paragraphs". A line long enough
    // to wrap three times in the bar is a paragraph wearing a bullet.
    if (line.length > 110) {
      throw new Error(`a help line is a paragraph (${line.length} chars): ${line}`);
    }
  });
});

// --- remembered settings ----------------------------------------------------
//
// Both persist, the viewer's own remembered-pane-width shape: `store`
// injected so both directions are checkable with no browser, every access
// wrapped, and an unreadable value read as "not set" rather than as off.
function memoryStore(initial) {
  const data = Object.assign({}, initial);
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
  };
}

function throwingStore() {
  return {
    getItem: () => { throw new Error("storage is disabled"); },
    setItem: () => { throw new Error("storage is disabled"); },
  };
}

check("the auto-filter settings round-trip through a store", () => {
  const store = memoryStore();
  AA.writeStoredAutoSteps(store, { topology: true, study: false, part: true });
  assertEqual(AA.readStoredAutoSteps(store),
    { topology: true, study: false, part: true });
  assertEqual(store.data[AA.PREF_KEYS.autoSteps] !== undefined, true);
});

check("an unreadable or absent settings value is 'not set', never a step " +
  "silently turned off", () => {
  assertEqual(AA.readStoredAutoSteps(null), AA.defaultAutoSteps());
  assertEqual(AA.readStoredAutoSteps(memoryStore()), AA.defaultAutoSteps());
  assertEqual(AA.readStoredAutoSteps(memoryStore({
    [AA.PREF_KEYS.autoSteps]: "{not json",
  })), AA.defaultAutoSteps());
  // A browser that throws on the very access still boots with the defaults --
  // a preference is never worth a crash.
  assertEqual(AA.readStoredAutoSteps(throwingStore()), AA.defaultAutoSteps());
  AA.writeStoredAutoSteps(throwingStore(), AA.defaultAutoSteps()); // must not throw
});

check("transparency round-trips, defaults to on, and survives a store that " +
  "throws", () => {
  assertEqual(AA.DEFAULT_TRANSPARENT_PARTS, true);
  const store = memoryStore();
  assertEqual(AA.readStoredTransparency(store), true);
  AA.writeStoredTransparency(store, false);
  assertEqual(store.data[AA.PREF_KEYS.transparentParts], "off");
  assertEqual(AA.readStoredTransparency(store), false);
  AA.writeStoredTransparency(store, true);
  assertEqual(AA.readStoredTransparency(store), true);
  assertEqual(AA.readStoredTransparency(throwingStore()), AA.DEFAULT_TRANSPARENT_PARTS);
  assertEqual(AA.readStoredTransparency(memoryStore({
    [AA.PREF_KEYS.transparentParts]: "maybe",
  })), AA.DEFAULT_TRANSPARENT_PARTS);
  AA.writeStoredTransparency(throwingStore(), true); // must not throw
});

check("the two preference keys are distinct and namespaced to this app", () => {
  const keys = Object.keys(AA.PREF_KEYS).map((k) => AA.PREF_KEYS[k]);
  if (new Set(keys).size !== keys.length) {
    throw new Error("two settings share a storage key: " + JSON.stringify(keys));
  }
  keys.forEach((key) => {
    if (key.indexOf("tolstack.annotate.") !== 0) {
      throw new Error("a settings key is not namespaced to this app: " + key);
    }
  });
});

// --- the markup the top bar and the auto-filter menu need -------------------
//
// app.js writes both of them, and app.js cannot be booted in this sandbox (ES
// module, `document`, WebGL -- see the verb-table checks above for the same
// constraint). What IS readable is that the nodes it writes into exist and
// that the old three-column layout is really gone, which is the deliverable.
check("the detail/hint pane is a BAR above the canvas, not a column beside " +
  "it -- the deliverable, read off the markup and the stylesheet", () => {
  const css = fs.readFileSync(path.join(here, "style.css"), "utf8");
  const grid = /\.an\s*\{[^}]*grid-template-columns:\s*([^;]+);/.exec(css);
  if (!grid) throw new Error("`.an`'s grid-template-columns is gone -- the extractor moved");
  const columns = grid[1].trim().split(/\s+/);
  if (columns.length !== 2) {
    throw new Error("the workspace still has " + columns.length + " columns (" +
      grid[1].trim() + ") -- the hint pane was a third column eating the canvas");
  }
  // ...and #detail really is inside the scene column now, above the stage.
  const detail = ANNOTATE_HTML.indexOf('id="detail"');
  const scene = ANNOTATE_HTML.indexOf('class="an__scene"');
  const stage = ANNOTATE_HTML.indexOf('class="an__stage"');
  if (scene === -1 || stage === -1 || detail === -1) {
    throw new Error("the scene column, the stage or #detail is missing from the markup");
  }
  if (!(scene < detail && detail < stage)) {
    throw new Error("#detail is no longer the bar at the top of the scene column");
  }
});

check("the rail's auto-filter menu has the nodes app.js writes its rows into, " +
  "above the controls it governs", () => {
  const menu = ANNOTATE_HTML.indexOf('id="auto-setup"');
  const body = ANNOTATE_HTML.indexOf('id="auto-setup-body"');
  const topology = ANNOTATE_HTML.indexOf('id="topology-select"');
  if (menu === -1 || body === -1) {
    throw new Error("the auto-filter menu's nodes are missing from the markup");
  }
  if (!(menu < body && body < topology)) {
    throw new Error("the auto-filter menu is not at the TOP of the rail");
  }
  // The rows themselves are written from AA.AUTO_STEPS, so the markup must
  // carry no checkbox of its own -- a hand-written row is the drift this
  // repo pays for most often.
  const between = ANNOTATE_HTML.slice(menu, topology);
  if (/type\s*=\s*"checkbox"/.test(between)) {
    throw new Error("the auto-filter menu spells a checkbox in the markup -- " +
      "the rows come from AA.AUTO_STEPS so the words and the steps cannot drift");
  }
});


// --- face classification (face_geometry.js) ---------------------------------
//
// Synthetic meshes, built to be exactly the surfaces whose names the classes
// wear -- a plane, a full cylinder, a cone, a spherical patch, a narrow arc.
// The [real] tier at the foot of this file is what measures the classifier
// against actual tessellated parts; these are what say what it MEANS, so a
// threshold change that starts calling a cone a cylinder fails here with the
// shape named rather than as a hit-rate drop nobody can localise.

// One mesh out of per-face vertex lists and LOCAL triangle indices. Lays the
// faces out in face_id order with each face's vertices in one contiguous run,
// which is the tessellation contract AA.faceVertexRanges and the classifier
// both depend on -- so a builder that broke it would be testing nothing.
function buildMesh(faces) {
  const positions = [];
  const indices = [];
  const faceIds = [];
  const manifestFaces = [];
  let offset = 0;
  faces.forEach((face, faceId) => {
    face.verts.forEach((v) => positions.push(v[0], v[1], v[2]));
    let area = 0;
    face.tris.forEach((t) => {
      indices.push(offset + t[0], offset + t[1], offset + t[2]);
      faceIds.push(faceId);
      const a = face.verts[t[0]], b = face.verts[t[1]], c = face.verts[t[2]];
      const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const x = e1[1] * e2[2] - e1[2] * e2[1];
      const y = e1[2] * e2[0] - e1[0] * e2[2];
      const z = e1[0] * e2[1] - e1[1] * e2[0];
      area += Math.sqrt(x * x + y * y + z * z) / 2;
    });
    manifestFaces.push({
      face_id: faceId, solid_id: 0, n_vertices: face.verts.length,
      n_triangles: face.tris.length, area_native2: area,
    });
    offset += face.verts.length;
  });
  return {
    manifestFaces,
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
    faceIds: new Uint32Array(faceIds),
  };
}

function classify(faces) {
  const mesh = buildMesh(faces);
  return AA.classifyPartFaces(mesh.manifestFaces, mesh.positions, mesh.indices, mesh.faceIds);
}

// A flat n-by-n grid at height `z`, normal +Z. More than two triangles on
// purpose: a two-triangle plane passes a normal-spread test trivially.
function planeFace(z, half, n) {
  const verts = [];
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      verts.push([-half + (2 * half * i) / n, -half + (2 * half * j) / n, z]);
    }
  }
  const tris = [];
  const at = (i, j) => i * (n + 1) + j;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      tris.push([at(i, j), at(i + 1, j), at(i + 1, j + 1)]);
      tris.push([at(i, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return { verts, tris };
}

// A surface of revolution about +Z, as the quad grid OCC itself lays down:
// `radiusAt(t)` is the radius at parameter t in [0, 1] up the height, so a
// constant returns a cylinder and a ramp returns a cone. `arcDeg` is how much
// of the turn the face covers, `cx`/`cy` where its axis stands.
function revolvedFace(radiusAt, height, arcDeg, segments, cx, cy, z0) {
  const verts = [];
  const span = (arcDeg * Math.PI) / 180;
  for (let i = 0; i <= segments; i++) {
    const theta = (span * i) / segments;
    for (let k = 0; k < 2; k++) {
      const r = radiusAt(k);
      verts.push([(cx || 0) + r * Math.cos(theta), (cy || 0) + r * Math.sin(theta),
        (z0 || 0) + k * height]);
    }
  }
  const tris = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
    tris.push([a, c, d]);
    tris.push([a, d, b]);
  }
  return { verts, tris };
}

const CYL = (radius, height, arcDeg, segments, cx, cy, z0) =>
  revolvedFace(() => radius, height, arcDeg, segments, cx, cy, z0);

// A latitude/longitude patch of a sphere: normals that span all three axes,
// which is the "other" case with no plane and no axis in it.
function spherePatch(radius, segments) {
  const verts = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (Math.PI / 3) * (i / segments) + Math.PI / 6;
    for (let j = 0; j <= segments; j++) {
      const theta = (Math.PI / 2) * (j / segments);
      verts.push([
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ]);
    }
  }
  const tris = [];
  const at = (i, j) => i * (segments + 1) + j;
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      tris.push([at(i, j), at(i + 1, j), at(i + 1, j + 1)]);
      tris.push([at(i, j), at(i + 1, j + 1), at(i, j + 1)]);
    }
  }
  return { verts, tris };
}

check("SURFACE_CLASSES is the closed set, and the classifier answers nothing else", () => {
  assertEqual(AA.SURFACE_CLASSES, ["planar", "cylindrical", "other"],
    "the surface-class vocabulary moved");
  const classes = classify([planeFace(5, 10, 3), CYL(3, 8, 360, 24), spherePatch(4, 6)]);
  classes.forEach((c) => {
    if (AA.SURFACE_CLASSES.indexOf(c.surface) === -1) {
      throw new Error(`classifyPartFaces answered "${c.surface}", which is not in SURFACE_CLASSES`);
    }
  });
});

check("a plane classifies as planar, with its own normal and offset", () => {
  const [plane] = classify([planeFace(5, 10, 4)]);
  assertEqual(plane.surface, "planar", "a flat grid is not planar");
  // Normal along +/-Z either way round: the winding decides the sign and
  // nothing downstream depends on it (facesParallel treats a flip as the same
  // direction on purpose).
  if (Math.abs(Math.abs(plane.normal[2]) - 1) > 1e-6) {
    throw new Error("a +Z plane's normal is not along Z: " + JSON.stringify(plane.normal));
  }
  if (Math.abs(Math.abs(plane.offset) - 5) > 1e-4) {
    throw new Error("a plane at z=5 has offset " + plane.offset);
  }
});

check("a full cylinder classifies as cylindrical, with its axis, radius and " +
  "a full turn of arc", () => {
  const [cyl] = classify([CYL(3, 8, 360, 24)]);
  assertEqual(cyl.surface, "cylindrical", "a revolved constant radius is not cylindrical");
  if (Math.abs(Math.abs(cyl.axis[2]) - 1) > 1e-4) {
    throw new Error("a Z-axis cylinder's axis is not along Z: " + JSON.stringify(cyl.axis));
  }
  if (Math.abs(cyl.radius - 3) > 1e-3) {
    throw new Error("radius read as " + cyl.radius + ", not 3");
  }
  // 360 minus one station spacing (24 segments -> 345): a closed loop has no
  // duplicate station at the seam, so the wrap-around gap is a gap as far as
  // angularSpreadDeg can tell. See its own comment on why that is left alone.
  if (cyl.arcDeg < 340) throw new Error("a full cylinder's arc read as " + cyl.arcDeg);
});

check("a half cylinder is still cylindrical -- OCC splits a bore in two and " +
  "each half is a face", () => {
  const [half] = classify([CYL(2.413, 4.76, 180, 13)]);
  assertEqual(half.surface, "cylindrical", "a 180-degree bore half is not cylindrical");
  if (Math.abs(half.radius - 2.413) > 1e-3) {
    throw new Error("a half bore's radius read as " + half.radius);
  }
  if (Math.abs(half.arcDeg - 180) > 1) {
    throw new Error("a half bore's arc read as " + half.arcDeg);
  }
});

check("a cone is OTHER, not a cylinder -- the chamfers on every bushing in " +
  "the mesh store are cones", () => {
  const [cone] = classify([revolvedFace((k) => 3 + k * 2, 2, 360, 24)]);
  assertEqual(cone.surface, "other", "a cone classified as something else");
});

check("a spherical patch is OTHER -- its normals span all three axes", () => {
  const [sphere] = classify([spherePatch(5, 6)]);
  assertEqual(sphere.surface, "other", "a spherical patch classified as something else");
  if (sphere.why.indexOf("neither a plane nor a cylinder") === -1) {
    throw new Error("unexpected reason for a sphere: " + sphere.why);
  }
});

check("a too-narrow arc is OTHER, and says so -- the axis POSITION is what " +
  "cannot be placed, and the coaxial test is what needs it", () => {
  const [sliver] = classify([CYL(50, 10, 6, 8)]);
  assertEqual(sliver.surface, "other", "a 6-degree arc classified as a cylinder");
  if (sliver.why.indexOf("too narrow an arc") === -1) {
    throw new Error("unexpected reason for a narrow arc: " + sliver.why);
  }
  // ...and the same arc is a cylinder once the threshold is relaxed, which is
  // what makes this a threshold and not a shape the classifier cannot read.
  const mesh = buildMesh([CYL(50, 10, 6, 8)]);
  const relaxed = AA.classifyPartFaces(mesh.manifestFaces, mesh.positions, mesh.indices,
    mesh.faceIds, { cylinderMinArcDeg: 1 });
  assertEqual(relaxed[0].surface, "cylindrical", "the arc threshold does nothing");
});

check("a face too small to be a feature is OTHER -- the NAS6403U11D bolt " +
  "carries two of them", () => {
  const classes = classify([planeFace(0, 100, 4), planeFace(1, 0.001, 2)]);
  assertEqual(classes[0].surface, "planar", "the big face should still classify");
  assertEqual(classes[1].surface, "other", "a sliver face was offered as a candidate");
  if (classes[1].why.indexOf("sliver") === -1) {
    throw new Error("unexpected reason for a sliver: " + classes[1].why);
  }
});

check("eigenSymmetric3 sorts descending and returns the matching vectors", () => {
  // Diagonal, so the answer is known by inspection: the LEAST eigenvector is
  // the one the cylinder test reads as the axis.
  const e = AA.eigenSymmetric3([3, 0, 0, 1, 0, 2]);
  assertEqual(e.values.map((v) => Math.round(v * 1e6) / 1e6), [3, 2, 1],
    "eigenvalues are not sorted descending");
  if (Math.abs(Math.abs(e.vectors[2][1]) - 1) > 1e-9) {
    throw new Error("the least eigenvector is not the y axis: " + JSON.stringify(e.vectors[2]));
  }
});

check("fitCircle2 recovers a circle exactly, and refuses collinear points " +
  "rather than guessing a centre", () => {
  const xs = [], ys = [];
  for (let i = 0; i < 12; i++) {
    const t = (2 * Math.PI * i) / 12;
    xs.push(4 + 7 * Math.cos(t));
    ys.push(-2 + 7 * Math.sin(t));
  }
  const fit = AA.fitCircle2(xs, ys);
  if (Math.abs(fit.r - 7) > 1e-9 || Math.abs(fit.cx - 4) > 1e-9 || Math.abs(fit.cy + 2) > 1e-9) {
    throw new Error("circle fit off: " + JSON.stringify(fit));
  }
  if (AA.fitCircle2([0, 1, 2, 3], [0, 1, 2, 3]) !== null) {
    throw new Error("a collinear set was fitted to a circle");
  }
});

check("angularSpreadDeg measures the turn covered, not max-minus-min -- an " +
  "arc across the branch cut is not a full circle", () => {
  // Five angles clustered around +/-pi: max-minus-min would read ~360.
  const around = [-3.1, -3.0, 3.0, 3.1, 3.14];
  const spread = AA.angularSpreadDeg(around);
  if (spread > 30) {
    throw new Error("an arc straddling the branch cut read as " + spread + " degrees");
  }
  // A closed loop of 16 stations: 360 less the one 22.5-degree seam gap.
  const full = [];
  for (let i = 0; i < 16; i++) full.push((2 * Math.PI * i) / 16);
  if (Math.abs(AA.angularSpreadDeg(full) - (360 - 360 / 16)) > 1e-6) {
    throw new Error("a full turn read as " + AA.angularSpreadDeg(full));
  }
});

// --- relations between two classified faces ---------------------------------

check("facesParallel: a flip counts as parallel (a thickness is measured " +
  "between exactly that pair), a tilt does not, and a cylinder never does", () => {
  const [top] = classify([planeFace(5, 10, 3)]);
  const [bottom] = classify([planeFace(-5, 10, 3)]);
  if (!AA.facesParallel(top, bottom)) throw new Error("two Z planes are not parallel");
  const tilted = { surface: "planar", normal: [0, Math.sin(0.5), Math.cos(0.5)], offset: 0 };
  if (AA.facesParallel(top, tilted)) throw new Error("a 28-degree tilt read as parallel");
  const [cyl] = classify([CYL(3, 8, 360, 24)]);
  if (AA.facesParallel(top, cyl)) throw new Error("a plane and a cylinder read as parallel");
});

check("facesCoaxial: concentric cylinders of DIFFERENT radius are coaxial, an " +
  "offset one is not", () => {
  const [inner] = classify([CYL(2, 8, 360, 24)]);
  const [outer] = classify([CYL(4, 8, 360, 24)]);
  if (!AA.facesCoaxial(inner, outer)) {
    throw new Error("a bore and the OD around it are not coaxial");
  }
  const [beside] = classify([CYL(2, 8, 360, 24, 20, 0)]);
  if (AA.facesCoaxial(inner, beside)) {
    throw new Error("a cylinder 20 away read as coaxial");
  }
});

check("radiiMatch is the ONE relation that needs no shared frame: it compares " +
  "two radii and nothing else", () => {
  const [bore] = classify([CYL(2.413, 4.76, 180, 13)]);
  // The same radius, elsewhere entirely, on another axis: a fit is a fit.
  const [shank] = classify([CYL(2.4065, 20, 180, 13, 500, -300, 99)]);
  if (!AA.radiiMatch(bore, shank)) {
    throw new Error("2.4130 and 2.4065 are 0.27% apart and did not match");
  }
  const [cotterHole] = classify([CYL(0.9525, 3, 180, 13)]);
  if (AA.radiiMatch(bore, cotterHole)) {
    throw new Error("a 1.9 mm hole matched a 4.8 mm bore");
  }
});

// --- the rule table (suggestions.js) ----------------------------------------

check("SUGGESTION_RULES: every row names a class the classifier can actually " +
  "answer, and no word appears in two rows", () => {
  assertEqual(AA.SUGGESTION_RULE_KEYS, AA.SUGGESTION_RULES.map((r) => r.key),
    "SUGGESTION_RULE_KEYS has drifted from the table");
  const seen = {};
  AA.SUGGESTION_RULES.forEach((rule) => {
    if (AA.SURFACE_CLASSES.indexOf(rule.surface) === -1) {
      throw new Error(`rule "${rule.key}" wants surface "${rule.surface}", which ` +
        "face_geometry.js never answers -- it would suggest nothing, forever");
    }
    if (rule.surface === "other") {
      throw new Error(`rule "${rule.key}" wants "other", which is the class that ` +
        "means no feature was read");
    }
    if (!rule.words.length) throw new Error(`rule "${rule.key}" has no words`);
    rule.words.forEach((word) => {
      if (word !== word.toLowerCase()) {
        throw new Error(`rule word ${JSON.stringify(word)} is not lowercase -- the ` +
          "match is case-insensitive and a capital here reads as a second spelling");
      }
      // A word in two rows makes TABLE ORDER decide the class silently, which
      // is the one way this table can be wrong without looking wrong.
      if (seen[word]) {
        throw new Error(`the word ${JSON.stringify(word)} is in both "${seen[word]}" ` +
          `and "${rule.key}" -- table order would decide the class silently`);
      }
      seen[word] = rule.key;
    });
  });
});

check("requiredSurfaceClass: the live names in docs/topologies read as the " +
  "surfaces they are", () => {
  const cases = [
    ["cotter-pin hole centreline", "cylindrical"],
    ["end of the bolt's full cylindrical shank", "cylindrical"],
    ["hub lower bearing-seat bore, M1 hub 212966-004", "cylindrical"],
    ["lower bearing outer-ring OD (214589-002, ID 160 / OD 200)", "cylindrical"],
    ["bolt-head bearing face against the plain bushing", "planar"],
    ["plain bushing length (214820-002)", "planar"],
    ["flanged bushing flange thickness (NAS77A3-015A)", "planar"],
    ["pitch plate lug thickness (5X group)", "planar"],
    ["washer thickness, NAS1149V0332H (.032 in)", "planar"],
  ];
  cases.forEach(([text, want]) => {
    const got = AA.requiredSurfaceClass(text);
    if (!got || got.surface !== want) {
      throw new Error(`"${text}" read as ${got ? got.surface : "nothing"}, wanted ${want}`);
    }
  });
});

check("requiredSurfaceClass matches WORDS, not substrings -- and a name that " +
  "says nothing gets nothing", () => {
  // "dia" inside "diagonal" and "id" inside "rigid" are the two this is for:
  // a substring match would classify half the repo's prose by accident.
  ["diagonal brace", "rigid mount", "the grid", "pinion"].forEach((text) => {
    const got = AA.requiredSurfaceClass(text);
    if (got) {
      throw new Error(`"${text}" matched ${JSON.stringify(got.word)} as a substring`);
    }
  });
  if (AA.requiredSurfaceClass("") !== null) throw new Error("an empty name matched a rule");
  if (AA.requiredSurfaceClass(null) !== null) throw new Error("a null name matched a rule");
  if (AA.requiredSurfaceClass("spherical bearing ball") !== null) {
    throw new Error("a sphere matched a rule -- neither class is right for it");
  }
});

check("endSurfaceClass asks the INTERFACE first: one dimension's two ends can " +
  "want different surfaces, and the dimension name cannot tell them apart", () => {
  const edge = { id: "cotter_hole_from_point",
    name: "cotter-hole centreline to bolt point (dimension M)" };
  const hole = { id: "cotter_hole_centerline", name: "cotter-pin hole centreline" };
  const face = { id: "head_bearing_face", name: "bolt-head bearing face against the bushing" };
  assertEqual(AA.endSurfaceClass(edge, hole).surface, "cylindrical",
    "the hole end did not read as round");
  assertEqual(AA.endSurfaceClass(edge, hole).where, "interface",
    "the hole end was not answered by its interface");
  assertEqual(AA.endSurfaceClass(edge, face).surface, "planar",
    "a bearing-face interface was overruled by the dimension's name");
  // With no interface to ask, the dimension's own words answer -- and `where`
  // records that it was the coarser of the two sources.
  assertEqual(AA.endSurfaceClass(edge, null).where, "dimension",
    "a nameless interface did not fall back to the dimension");
  assertEqual(AA.endSurfaceClass(null, null), null, "nothing answered something");
});

check("the narrowing stages and the relations they may assert are one table, " +
  "and the cross-part plane null is written out rather than missing", () => {
  assertEqual(AA.NARROWING_STAGE_KEYS, AA.NARROWING_STAGES.map((s) => s.key),
    "NARROWING_STAGE_KEYS has drifted from the table");
  assertEqual(AA.NARROWING_STAGE_KEYS[0], "surface_class",
    "the first stage must be the one that needs nothing bound");
  Object.keys(AA.NARROWING_RELATIONS).forEach((stage) => {
    if (AA.NARROWING_STAGE_KEYS.indexOf(stage) === -1) {
      throw new Error(`NARROWING_RELATIONS names a stage that is not in the table: ${stage}`);
    }
    const perClass = AA.NARROWING_RELATIONS[stage];
    // Every class the rule table can ask for must have an ENTRY -- a null is a
    // decision with a reason (AA.NO_MATING_PLANE_RELATION); a missing key is a
    // hole for the next reader to fill in without noticing there was one.
    AA.SUGGESTION_RULES.forEach((rule) => {
      if (!Object.prototype.hasOwnProperty.call(perClass, rule.surface)) {
        throw new Error(`stage "${stage}" says nothing at all about ` +
          `"${rule.surface}", which rule "${rule.key}" asks for`);
      }
      const relation = perClass[rule.surface];
      if (relation !== null && AA.NARROWING_RELATION_NAMES.indexOf(relation) === -1) {
        throw new Error(`stage "${stage}" asserts "${relation}", which is not in ` +
          "NARROWING_RELATION_NAMES");
      }
    });
  });
  assertEqual(AA.NARROWING_RELATIONS.mating_fit.planar, null,
    "mating_fit claims a relation between two flat faces on different parts -- " +
    "this app applies no placement transforms, so it cannot have one");
});

// --- the planner ------------------------------------------------------------
//
// One fixture topology, built to be the pitch-link joint's own shape: a
// thickness between two flat interfaces on one part, a diametral interface, and
// a gap edge naming no part at all. The face classifications are handed in as
// data (the planner is pure), so each stage can be driven exactly.

const SUGGEST_MESHES = [
  { sha256: "a".repeat(64), label: "plate", part_id: "plate_part" },
  { sha256: "b".repeat(64), label: "bolt", part_id: "bolt_part" },
];

const SUGGEST_TOPOLOGY = {
  id: "fixture_joint",
  nodes: [
    { id: "near_face", name: "plate near face against the washer", kind: "mating_surface" },
    { id: "far_face", name: "plate far face", kind: "datum_feature" },
    { id: "bolt_hole", name: "plate bolt hole", kind: "mating_surface" },
    { id: "shank_end", name: "end of the bolt's full cylindrical shank", kind: "datum_feature" },
  ],
  edges: [
    { id: "plate_thickness", name: "plate thickness", kind: "structural",
      part: "plate_part", from: "near_face", to: "far_face" },
    { id: "hole_depth", name: "plate bolt hole depth", kind: "structural",
      part: "plate_part", from: "bolt_hole", to: "far_face" },
    { id: "bolt_grip", name: "fastener grip", kind: "structural",
      part: "bolt_part", from: "bolt_hole", to: "shank_end" },
    // A second bolt-side dimension meeting the plate at a FLAT interface --
    // the shape every cross-part interface in the live pitch-link joint has,
    // and the one the mating_fit fence is about.
    { id: "bolt_head_height", name: "bolt head height", kind: "structural",
      part: "bolt_part", from: "near_face", to: "shank_end" },
    { id: "stand_off", name: "stand off beyond the stack", kind: "gap",
      from: "far_face", to: "shank_end" },
  ],
};

// Plate: two parallel flats (0, 1), one tilted flat (2), a bore (3) and the
// bore's mate one radius up (4). Bolt: a shank at the bore's radius (5) and a
// cotter hole nowhere near it (6).
function fixtureClasses() {
  const plate = [];
  plate[0] = { faceId: 0, surface: "planar", normal: [0, 0, 1], offset: 0 };
  plate[1] = { faceId: 1, surface: "planar", normal: [0, 0, -1], offset: -4.06 };
  plate[2] = { faceId: 2, surface: "planar", normal: [1, 0, 0], offset: 12 };
  plate[3] = { faceId: 3, surface: "cylindrical", axis: [0, 0, 1], axisPoint: [0, 0, 0],
    radius: 2.413, arcDeg: 180 };
  plate[4] = { faceId: 4, surface: "cylindrical", axis: [0, 0, 1], axisPoint: [40, 0, 0],
    radius: 6, arcDeg: 360 };
  const bolt = [];
  bolt[0] = { faceId: 0, surface: "cylindrical", axis: [1, 0, 0], axisPoint: [0, 0, 0],
    radius: 2.4065, arcDeg: 180 };
  bolt[1] = { faceId: 1, surface: "cylindrical", axis: [1, 0, 0], axisPoint: [0, 0, 0],
    radius: 0.9525, arcDeg: 180 };
  const out = {};
  out[SUGGEST_MESHES[0].sha256] = plate;
  out[SUGGEST_MESHES[1].sha256] = bolt;
  return out;
}

function boundAt(edgeId, direction, sha256, faceId) {
  return {
    schema: "joby.tolerance_stack/feature-identity-projection/v0",
    stack_keys: [{
      stack_key: AA.topologyEdgeKey(SUGGEST_TOPOLOGY.id, edgeId),
      state: "bound",
      bindings: [{ event_id: "fixture-1", direction: direction,
        geometry_key: { source_step_sha256: sha256, face_id: faceId } }],
      owner_not_in_set: [], history: ["fixture-1"],
    }],
  };
}

function plan(edgeId, identity) {
  return AA.planFaceSuggestions({
    topology: SUGGEST_TOPOLOGY, edgeId: edgeId, identityProjection: identity,
    meshes: SUGGEST_MESHES, aliases: [], faceClasses: fixtureClasses(),
  });
}

check("stage 1: a thickness suggests only the FLAT faces of its own part, and " +
  "a hole only the ROUND ones", () => {
  const thickness = plan("plate_thickness", null);
  assertEqual(thickness.ends.map((e) => e.surface), ["planar", "planar"],
    "a thickness asked for something other than flat faces at both ends");
  assertEqual(thickness.ends[0].candidates, [0, 1, 2],
    "a thickness was offered a face that is not flat");
  assertEqual(thickness.ends.map((e) => e.stage), ["surface_class", "surface_class"],
    "stage 1 reported a narrowing nothing supplied");
  const hole = plan("hole_depth", null);
  // `from` is the hole interface (round); `to` is the plate's far face (flat).
  assertEqual(hole.ends.map((e) => e.surface), ["cylindrical", "planar"],
    "the two ends of a hole depth read as the same surface");
  assertEqual(hole.ends[0].candidates, [3, 4], "a bore was offered a flat face");
});

check("stage 2: one end bound narrows the other to the faces PARALLEL to it -- " +
  "and the bound face is not offered again", () => {
  const narrowed = plan("plate_thickness", boundAt("plate_thickness", "from",
    SUGGEST_MESHES[0].sha256, 0));
  assertEqual(narrowed.ends.map((e) => e.direction), ["to"],
    "the end that is already bound is still being asked for");
  const end = narrowed.ends[0];
  assertEqual(end.stage, "same_part_relation", "the stage did not advance");
  assertEqual(end.relation, "parallel", "the wrong relation was asserted");
  // Face 0 is bound, face 2 is the tilted flat: only the far face survives.
  assertEqual(end.candidates, [1],
    "the parallel narrowing kept a face that is not parallel, or dropped the one that is");
  assertEqual(end.considered, 2, "the pool before narrowing is wrong");
});

check("stage 2: a round end bound on the SAME part narrows to the coaxial " +
  "faces, dropping the bore beside it", () => {
  const narrowed = plan("hole_depth", boundAt("bolt_grip", "from",
    SUGGEST_MESHES[0].sha256, 3));
  const end = narrowed.ends.filter((e) => e.direction === "from")[0];
  assertEqual(end.stage, "same_part_relation", "the stage did not advance");
  assertEqual(end.relation, "coaxial", "the wrong relation was asserted");
  assertEqual(end.candidates, [3],
    "the coaxial narrowing kept the bore 40 away, or dropped the one on the axis");
});

check("stage 3: a ROUND face bound on the ADJACENT part narrows by radius -- " +
  "the one relation that survives having no placement transform", () => {
  // The bolt's grip is bound at the plate's bolt hole; the plate's own hole
  // depth at that same interface now has a reference on another mesh.
  const narrowed = plan("hole_depth", boundAt("bolt_grip", "from",
    SUGGEST_MESHES[1].sha256, 0));
  const end = narrowed.ends.filter((e) => e.direction === "from")[0];
  assertEqual(end.stage, "mating_fit", "the cross-part stage was not reached");
  assertEqual(end.relation, "same_radius", "the wrong relation was asserted");
  assertEqual(end.references.map((r) => r.sameMesh), [false],
    "the reference was read as being on the same mesh");
  // 2.413 matches the bolt's 2.4065; the 6 mm bore does not.
  assertEqual(end.candidates, [3], "the radius narrowing kept the wrong bore");
});

check("stage 3: a FLAT face bound on the adjacent part narrows nothing, says " +
  "why, and does not claim a stage it did not reach", () => {
  // (a) A reference of the WRONG class is not comparable at all. A flat face
  //     bound at a round interface says nothing about which bore this is, so
  //     stage 1's list stands untouched and there is nothing to say about it.
  const mismatch = plan("bolt_grip", boundAt("hole_depth", "from",
    SUGGEST_MESHES[0].sha256, 0));
  const round = mismatch.ends.filter((e) => e.direction === "from")[0];
  assertEqual(round.stage, "surface_class", "a stage was credited with no narrowing");
  assertEqual(round.relation, null, "a relation was asserted across two classes");
  assertEqual(round.candidates, [0, 1], "the candidate list was narrowed by a guess");
  assertEqual(round.note, null, "a non-comparable reference produced a sentence");

  // (b) The fence itself: a FLAT reference for a FLAT end, on another mesh.
  //     Class and reference agree, so the only thing stopping the narrowing is
  //     that the two meshes share no frame -- and that is said out loud.
  const classes = fixtureClasses();
  classes[SUGGEST_MESHES[1].sha256][1] = { faceId: 1, surface: "planar",
    normal: [0, 0, 1], offset: 3 };
  const flat = AA.planFaceSuggestions({
    topology: SUGGEST_TOPOLOGY, edgeId: "plate_thickness",
    identityProjection: boundAt("bolt_head_height", "from", SUGGEST_MESHES[1].sha256, 1),
    meshes: SUGGEST_MESHES, aliases: [], faceClasses: classes,
  });
  const end = flat.ends.filter((e) => e.direction === "from")[0];
  assertEqual(end.references.map((r) => r.sameMesh), [false],
    "the reference was read as being on the same mesh");
  assertEqual(end.stage, "surface_class",
    "the flat cross-part case claimed a narrowing it cannot do");
  assertEqual(end.relation, null, "a relation was asserted between two frames");
  assertEqual(end.note, AA.NO_MATING_PLANE_RELATION,
    "the flat cross-part case did not say why it narrowed nothing");
  assertEqual(end.candidates, [0, 1, 2], "the candidate list was narrowed anyway");
});

check("an element that names no part, and one whose words say nothing, both " +
  "suggest NOTHING and say so -- never a guessed surface", () => {
  const gap = plan("stand_off", null);
  assertEqual(gap.faces, [], "a gap edge with no part suggested faces");
  if (!gap.note || gap.note.indexOf("names no part") === -1) {
    throw new Error("a gap edge did not say why it has nothing to suggest: " + gap.note);
  }
  const mute = AA.planFaceSuggestions({
    topology: {
      id: "t", nodes: [{ id: "n1", name: "the first place" }, { id: "n2", name: "the second" }],
      edges: [{ id: "e", name: "a quantity", kind: "structural", part: "plate_part",
        from: "n1", to: "n2" }],
    },
    edgeId: "e", identityProjection: null, meshes: SUGGEST_MESHES, aliases: [],
    faceClasses: fixtureClasses(),
  });
  assertEqual(mute.faces, [], "an element whose words say nothing suggested faces");
  mute.ends.forEach((end) => {
    assertEqual(end.surface, null, "a class was invented for an element with no rule");
    if (!end.note) throw new Error("an unreadable element end said nothing at all");
  });
});

check("a part with no installed mesh, and a part whose shapes are unread, are " +
  "two different absences", () => {
  const noMesh = AA.planFaceSuggestions({
    topology: SUGGEST_TOPOLOGY, edgeId: "plate_thickness", identityProjection: null,
    meshes: [], aliases: [], faceClasses: {},
  });
  // The rail already says "No installed 3D part for ..." -- this must not say
  // it a second time in different words.
  assertEqual(noMesh.faces, [], "a part with no mesh suggested faces");
  assertEqual(noMesh.note, null, "the no-mesh case duplicates the rail's own sentence");
  const unread = AA.planFaceSuggestions({
    topology: SUGGEST_TOPOLOGY, edgeId: "plate_thickness", identityProjection: null,
    meshes: SUGGEST_MESHES, aliases: [], faceClasses: {},
  });
  if (!unread.note || unread.note.indexOf("not been read") === -1) {
    throw new Error("an unread mesh did not say so: " + unread.note);
  }
});

check("the same face suggested for both ends is ONE face to paint, not two", () => {
  const thickness = plan("plate_thickness", null);
  const tokens = thickness.faces.map((f) => f.sha256 + ":" + f.faceId);
  assertEqual(tokens.length, new Set(tokens).size,
    "the paint list carries a face twice -- two opaque overlays on one face");
  assertEqual(thickness.faces.length, 3, "the paint list is not the union of the ends");
});

check("gatherFaceReferences names both kinds of neighbour, and never the " +
  "binding it was asked about", () => {
  const identity = boundAt("plate_thickness", "to", SUGGEST_MESHES[0].sha256, 1);
  const otherEnd = AA.gatherFaceReferences(SUGGEST_TOPOLOGY, "plate_thickness", "from", identity);
  assertEqual(otherEnd.map((r) => r.source), ["other_end"],
    "the same dimension's opposite end was not found");
  const otherHalf = AA.gatherFaceReferences(SUGGEST_TOPOLOGY, "hole_depth", "to", identity);
  assertEqual(otherHalf.map((r) => r.source), ["other_half"],
    "the other dimension at this interface was not found");
  // Asked about the very direction that IS bound: its own binding is not a
  // reference for itself.
  const itself = AA.gatherFaceReferences(SUGGEST_TOPOLOGY, "plate_thickness", "to", identity);
  assertEqual(itself.filter((r) => r.source === "other_end").length, 0,
    "a binding was offered as a reference for its own end");
});

check("every sentence the suggestion surface can print survives the shared " +
  "ban list, and carries no schema word", () => {
  const sentences = [AA.NO_MATING_PLANE_RELATION, AA.SUGGEST_SETTING_LABEL,
    AA.SUGGEST_SETTING_HINT]
    .concat(AA.SUGGESTION_RULES.map((r) => r.says))
    .concat(AA.NARROWING_STAGES.map((s) => s.says))
    .concat(AA.NARROWING_STAGES.map((s) => s.needs))
    .concat([
      AA.describeSuggestions(plan("plate_thickness", null)),
      AA.describeSuggestions(plan("stand_off", null)),
      AA.describeSuggestions(plan("plate_thickness",
        boundAt("plate_thickness", "from", SUGGEST_MESHES[0].sha256, 0))),
    ])
    .concat(plan("stand_off", null).ends.map((e) => e.note))
    .concat(plan("hole_depth", null).ends.map((e) => e.note))
    .filter(Boolean);
  if (sentences.length < 12) {
    throw new Error("the suggestion sentence scan collected " + sentences.length +
      " strings -- it has drifted and now passes against anything");
  }
  sentences.forEach((text, i) => {
    assertNoCommandOrPath(text, `suggestion sentence #${i + 1}`);
    if (/[a-z]_[a-z]/.test(text)) {
      throw new Error(`suggestion sentence #${i + 1} carries an underscored identifier: ${text}`);
    }
  });
});

check("describeSuggestions counts the faces and names the stage that produced " +
  "them, so a lit-up body is never unexplained", () => {
  const wide = AA.describeSuggestions(plan("plate_thickness", null));
  if (wide.indexOf("3 likely faces") !== 0) {
    throw new Error("unexpected stage-1 summary: " + wide);
  }
  if (wide.indexOf(AA.NARROWING_STAGES[0].says) === -1) {
    throw new Error("the summary does not name the stage it reached: " + wide);
  }
  const narrow = AA.describeSuggestions(plan("plate_thickness",
    boundAt("plate_thickness", "from", SUGGEST_MESHES[0].sha256, 0)));
  if (narrow.indexOf("1 likely face -") !== 0) {
    throw new Error("a single face is not described in the singular: " + narrow);
  }
});

// --- the display, read statically out of scene.js and app.js ----------------
//
// Neither file can be booted in this sandbox (scene.js imports three.js and
// app.js is an ES module that touches `document` at load), so both are read as
// TEXT -- the same choice the verb-table and no-projection-banner guards above
// make, for the same reason.

const SCENE_SOURCE = fs.readFileSync(path.join(here, "scene.js"), "utf8");
const APP_SOURCE = fs.readFileSync(path.join(here, "app.js"), "utf8");

check("the suggestion colour IS the shared accent -- one declaration in " +
  "apps/viewer/style.css, not a hex typed twice", () => {
  const viewerCss = fs.readFileSync(path.join(here, "..", "viewer", "style.css"), "utf8");
  const declared = /--accent:\s*(#[0-9a-fA-F]{6})/.exec(viewerCss);
  if (!declared) {
    throw new Error("apps/viewer/style.css declares no --accent -- the token moved");
  }
  const roles = /const MARK_COLORS = \{([^}]*)\}/.exec(SCENE_SOURCE);
  if (!roles) throw new Error("scene.js has no MARK_COLORS block -- the anchor moved");
  const suggested = /suggested:\s*0x([0-9a-fA-F]{6})/.exec(roles[1]);
  if (!suggested) throw new Error("MARK_COLORS has no `suggested` role");
  assertEqual("#" + suggested[1].toLowerCase(), declared[1].toLowerCase(),
    "the suggestion colour has drifted from apps/viewer/style.css's --accent");
  // Three roles and three claims: a fourth colour added with no claim behind
  // it is the emphasis budget being spent without a decision.
  ["bound", "suggested", "picked"].forEach((role) => {
    if (roles[1].indexOf(role + ":") === -1) {
      throw new Error(`MARK_COLORS lost the "${role}" role`);
    }
  });
});

check("the mark overlays are one implementation with a ROLE, so clearing the " +
  "suggestions cannot take the bound-face marks down with them", () => {
  if (!/clearMarks\(role\)/.test(SCENE_SOURCE)) {
    throw new Error("scene.js's clearMarks takes no role -- clearing suggestions " +
      "would clear every overlay, bound faces included");
  }
  if (!/markFace\(sha256, faceId, role\)/.test(SCENE_SOURCE)) {
    throw new Error("scene.js's markFace takes no role");
  }
  // The suggest path must clear ONLY its own two layers.
  ['clearMarks("suggested")', 'clearMarks("picked")'].forEach((call) => {
    if (APP_SOURCE.indexOf(call) === -1) {
      throw new Error(`app.js never calls scene.${call}`);
    }
  });
  if (/clearMarks\(\)\s*;/.test(APP_SOURCE) === false) {
    throw new Error("app.js no longer clears every mark anywhere -- `trace` needs that");
  }
});

check("THE FENCE: the suggestion path colours faces and does nothing else -- " +
  "it never selects, never highlights, never builds an event", () => {
  // The two handlers, as text, from the verb that starts them to the next
  // top-level function after them.
  const start = APP_SOURCE.indexOf("async function cmdSuggest()");
  const end = APP_SOURCE.indexOf("async function refreshSuggestions()");
  if (start < 0 || end < 0 || end < start) {
    throw new Error("could not find the suggestion handlers in app.js -- the anchors moved");
  }
  const body = APP_SOURCE.slice(start, end);
  // `markFace(..., "picked")` is a COLOUR for a pick that already happened;
  // the pick itself is `select-face`'s, and the suggestion path must not make
  // one.
  ["select-face", "highlightFace", "buildBoundEvent", "buildOwnerNotInSetEvent",
    "writeEvent", "sessionEvents.push"].forEach((forbidden) => {
    if (body.indexOf(forbidden) !== -1) {
      throw new Error(`the suggestion path references ${JSON.stringify(forbidden)} -- ` +
        "a suggestion is a proposal in the UI and never a binding");
    }
  });
  if (body.indexOf('markFace') === -1) {
    throw new Error("the suggestion path draws nothing at all -- the guard above is vacuous");
  }
});

check("index.html loads the geometry before the rules, and both before the " +
  "module that uses them", () => {
  const geometry = ANNOTATE_HTML.indexOf('src="./face_geometry.js"');
  const rules = ANNOTATE_HTML.indexOf('src="./suggestions.js"');
  const app = ANNOTATE_HTML.indexOf('src="./app.js"');
  if (geometry === -1) throw new Error("index.html does not load face_geometry.js");
  if (rules === -1) throw new Error("index.html does not load suggestions.js");
  if (geometry > rules) {
    throw new Error("suggestions.js loads before face_geometry.js, whose relations it calls");
  }
  if (rules > app) throw new Error("app.js loads before the rules it dispatches to");
});

check("the face-suggestion setting round-trips through a store, defaults to " +
  "on, and survives a store that throws", () => {
  const store = memoryStore({});
  assertEqual(AA.readStoredSuggestions(store), AA.DEFAULT_FACE_SUGGESTIONS,
    "an unset preference is not the default");
  AA.writeStoredSuggestions(store, false);
  assertEqual(AA.readStoredSuggestions(store), false, "off did not round-trip");
  AA.writeStoredSuggestions(store, true);
  assertEqual(AA.readStoredSuggestions(store), true, "on did not round-trip");
  const hostile = { getItem() { throw new Error("nope"); }, setItem() { throw new Error("nope"); } };
  assertEqual(AA.readStoredSuggestions(hostile), AA.DEFAULT_FACE_SUGGESTIONS,
    "a store that throws is not read as 'not set'");
  AA.writeStoredSuggestions(hostile, false); // must not throw
  // Three preferences now, three distinct keys.
  const keys = Object.keys(AA.PREF_KEYS).map((k) => AA.PREF_KEYS[k]);
  assertEqual(keys.length, new Set(keys).size, "two preferences share a key");
});

// --- [real] the shipped alias table against the installed meshes ------------
//
// The tracked table (docs/topologies/part_mesh_aliases.json -- read from THIS
// tree, it is tracked) resolved against the real data/meshes/ provenance
// files, through resolveMeshIdentifier itself -- the exact call the deep
// link's `isolate=` makes. data/ is gitignored and lives only in the main
// checkout (repo CLAUDE.md), so from a worktree the repo-relative path is
// empty by design: fall back to the main checkout absolute path, and skip
// honestly (the viewer suite's [real]-tier convention) when neither has an
// installed mesh -- absence of data is not a failure of this code.
const realMeshesDir = [
  path.join(here, "..", "..", "data", "meshes"),
  "C:\\workspace\\tolstack\\data\\meshes",
].find((dir) => {
  try {
    return fs.readdirSync(dir).some((name) => /^[0-9a-f]{64}$/.test(name));
  } catch (_) {
    return false;
  }
});

function realMeshList() {
  return fs.readdirSync(realMeshesDir)
    .filter((name) => /^[0-9a-f]{64}$/.test(name))
    .map((sha256) => {
      const provenancePath = path.join(realMeshesDir, sha256, "provenance.json");
      if (!fs.existsSync(provenancePath)) return { sha256, label: sha256, part_id: null };
      const p = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
      return { sha256, label: p.label, part_id: p.part_id };
    });
}

function shippedAliases() {
  const tablePath = path.join(here, "..", "..", "docs", "topologies", "part_mesh_aliases.json");
  return JSON.parse(fs.readFileSync(tablePath, "utf8")).aliases;
}

if (!realMeshesDir) {
  console.log("SKIP  [real] alias-table resolution -- no data/meshes/ with an installed mesh " +
    "(gitignored, main checkout only; see data/meshes/README.md)");
} else {
  check("[real] every shipped alias's topology part resolves to an installed mesh -- the deep link's own call", () => {
    const meshes = realMeshList();
    const aliases = shippedAliases();
    if (!aliases.length) {
      // An honestly-empty table is a legitimate state (no pair evidenced yet)
      // -- there is just nothing to resolve.
      console.log("      (the shipped alias table is empty -- nothing to resolve)");
      return;
    }
    for (const alias of aliases) {
      const mesh = AA.resolveMeshIdentifier(meshes, alias.topology_part, aliases);
      if (!mesh) {
        throw new Error(
          `alias "${alias.topology_part}" -> "${alias.mesh_part_id}" resolves to no installed mesh -- ` +
          "the mesh was removed or re-installed under a different part_id; " +
          "update or remove the alias (docs/topologies/part_mesh_aliases.json)");
      }
      assertEqual(mesh.part_id, alias.mesh_part_id,
        `alias "${alias.topology_part}" resolved to the wrong mesh`);
    }
  });

  // The per-study trace against the real projection (handoff study_3d_flyout):
  // planStudyTrace over every real study must produce only installed-mesh
  // ghosts and honest gap lists, and any study naming the aliased gas-spring
  // part must resolve it -- the same call the flyout's `trace` boot makes.
  const realProjectionPath = [
    path.join(here, "..", "..", "data", "projections", "viewer", "topologies.json"),
    "C:\\workspace\\tolstack\\data\\projections\\viewer\\topologies.json",
  ].find((p) => fs.existsSync(p));
  const realBindingsPath = [
    path.join(here, "..", "..", "data", "projections", "feature-identity", "bindings.json"),
    "C:\\workspace\\tolstack\\data\\projections\\feature-identity\\bindings.json",
  ].find((p) => fs.existsSync(p));

  if (!realProjectionPath) {
    console.log("SKIP  [real] planStudyTrace over the real projection -- no " +
      "data/projections/viewer/topologies.json (gitignored, main checkout only)");
  } else {
    check("[real] planStudyTrace over every real study: ghosts are installed meshes, " +
      "gaps are honest lists, the aliased part resolves where a study names it", () => {
      const projection = JSON.parse(fs.readFileSync(realProjectionPath, "utf8"));
      // bindings.json may legitimately not exist yet (nothing bound) -- that
      // reads as null, the same absent state the app itself loads.
      const identity = realBindingsPath
        ? JSON.parse(fs.readFileSync(realBindingsPath, "utf8"))
        : null;
      const meshes = realMeshList();
      const installed = new Set(meshes.map((m) => m.sha256));
      const aliases = shippedAliases();
      let studies = 0;
      let aliasedResolved = 0;
      for (const topology of projection.topologies) {
        for (const study of topology.studies || []) {
          studies++;
          const plan = AA.planStudyTrace(topology, study, identity, meshes, aliases);
          for (const sha of plan.ghosts) {
            if (!installed.has(sha)) {
              throw new Error(`study ${study.id}: ghost ${sha} is not an installed mesh`);
            }
          }
          for (const p of plan.parts) {
            if (p.sha256 === null && plan.missingParts.indexOf(p.part) === -1) {
              throw new Error(`study ${study.id}: unresolved part ${p.part} not in missingParts`);
            }
          }
          if (plan.parts.some((p) => p.part === "gas_spring_mount_213668_002" && p.sha256)) {
            aliasedResolved++;
          }
        }
      }
      if (!studies) throw new Error("the real projection carries no studies at all");
      // Only meaningful if some study actually names the aliased part; if none
      // does, say so rather than failing on data this check does not own.
      if (!aliasedResolved) {
        console.log("      (no real study names gas_spring_mount_213668_002 -- " +
          "the alias-resolution leg of this check found nothing to resolve)");
      }
    });
  }
}


// --- [real] the classifier, and the suggestion rules, over the installed
// --- meshes -----------------------------------------------------------------
//
// The classifier's own [real] tier: every mesh in data/meshes/, classified,
// with the rate reported and a floor under it -- so the hit rates quoted in
// docs/sessions/lessons/LESSONS_20260921_annotate_face_suggestions.md are
// re-measured on every run rather than being a number that decays. Same
// gitignored-data posture as the two checks above: data/ lives only in the
// main checkout, so from a worktree this falls back to the absolute path and
// skips honestly when there is no mesh at all.
//
// It also pins GROUND TRUTH on three parts whose dimensions are stated on
// documents this repo already cites. To be completely clear about what that
// is and is not: these assertions check that the GEOMETRY READER reads a known
// shape correctly. They are not a measurement of a part, they supply no stack
// value, and nothing in the app renders or writes them --
// docs/ANNOTATION_SURFACE.md's decision 1 is untouched. A number here that
// disagrees with the drawing means the classifier is broken, and that is the
// only thing it is allowed to mean.
if (realMeshesDir) {
  const readRealMesh = (sha256) => {
    const dir = path.join(realMeshesDir, sha256);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
    const typed = (name, Kind) => {
      const raw = fs.readFileSync(path.join(dir, name));
      return new Kind(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
    };
    return {
      manifest,
      positions: typed(manifest.positions_file, Float32Array),
      indices: typed(manifest.indices_file, Uint32Array),
      faceIds: typed(manifest.face_ids_file, Uint32Array),
    };
  };
  const realClassCache = {};
  const classifyReal = (sha256) => {
    if (!realClassCache[sha256]) {
      const mesh = readRealMesh(sha256);
      realClassCache[sha256] = AA.classifyPartFaces(mesh.manifest.faces, mesh.positions,
        mesh.indices, mesh.faceIds);
    }
    return realClassCache[sha256];
  };
  const byPartId = (partId) => {
    const found = realMeshList().filter((m) => m.part_id === partId)[0];
    return found ? found.sha256 : null;
  };
  const roundTo = (value, places) => Math.round(value * Math.pow(10, places)) / Math.pow(10, places);

  // The floor, not the measurement: the point of the number is to be reported,
  // and the point of the floor is that a threshold edit which quietly halves
  // the classifier fails here. It sits well under the measured rate on purpose
  // -- a tighter floor would redden whenever a mesh is installed or replaced,
  // and this check does not own what is in the mesh store.
  const CLASSIFIED_FRACTION_FLOOR = 0.45;

  check("[real] every installed mesh classifies, and the rate over the whole " +
    "store stays above the floor", () => {
    const totals = { planar: 0, cylindrical: 0, other: 0 };
    const reasons = {};
    const perPart = [];
    realMeshList().forEach((mesh) => {
      const classes = classifyReal(mesh.sha256);
      const counts = { planar: 0, cylindrical: 0, other: 0 };
      classes.forEach((c, index) => {
        if (!c) throw new Error(`${mesh.part_id}: face ${index} got no classification at all`);
        if (c.surface === "other" && !c.why) {
          throw new Error(`${mesh.part_id}: face ${index} is "other" with no reason`);
        }
        counts[c.surface]++;
        if (c.surface === "other") reasons[c.why] = (reasons[c.why] || 0) + 1;
      });
      if (classes.length !== mesh.sha256 && classes.length === 0) {
        throw new Error(`${mesh.part_id}: classified no faces`);
      }
      Object.keys(counts).forEach((k) => { totals[k] += counts[k]; });
      perPart.push({ part: mesh.part_id, n: classes.length, counts: counts });
    });
    const n = totals.planar + totals.cylindrical + totals.other;
    if (!n) throw new Error("no faces were classified at all");
    const fraction = (totals.planar + totals.cylindrical) / n;
    console.log(`      ${n} faces over ${perPart.length} meshes: ` +
      `${totals.planar} planar, ${totals.cylindrical} cylindrical, ${totals.other} other ` +
      `(${(100 * fraction).toFixed(1)}% classified)`);
    Object.keys(reasons).sort((a, b) => reasons[b] - reasons[a]).forEach((why) => {
      console.log(`        ${String(reasons[why]).padStart(5)}  ${why}`);
    });
    if (fraction < CLASSIFIED_FRACTION_FLOOR) {
      throw new Error(`only ${(100 * fraction).toFixed(1)}% of faces classified, under the ` +
        `${(100 * CLASSIFIED_FRACTION_FLOOR).toFixed(0)}% floor -- a threshold in ` +
        "AA.FACE_CLASSIFY has been tightened past what the mesh store looks like");
    }
  });

  check("[real] ground truth: the NAS1149V0332H washer is read as the part the " +
    "217755 parts list describes -- two flats and four half-cylinders", () => {
    const sha = byPartId("asm217755_NAS1149V0332H");
    if (!sha) {
      console.log("      (asm217755_NAS1149V0332H is not installed -- nothing to check)");
      return;
    }
    const classes = classifyReal(sha);
    // .203 x .438 x .032 in, per the nomenclature the topology's own part note
    // carries (docs/topologies/topology_pitch_link_to_pitch_plate.json). In mm:
    // OD 11.125 (r 5.5626), ID 5.156 (r 2.5781), thickness 0.813.
    const planes = classes.filter((c) => c.surface === "planar");
    const cylinders = classes.filter((c) => c.surface === "cylindrical");
    assertEqual([planes.length, cylinders.length, classes.length - planes.length - cylinders.length],
      [2, 4, 0], "the washer is not two flats and four round faces");
    // Compared with a tolerance rather than a rounded equality: the nomenclature
    // is in inches and the mesh is in mm, so the expected value is a conversion
    // and pinning its last decimal would be pinning a rounding rule.
    const radii = cylinders.map((c) => c.radius).sort((a, b) => a - b);
    [2.5781, 2.5781, 5.5626, 5.5626].forEach((want, i) => {
      if (Math.abs(radii[i] - want) > 0.002) {
        throw new Error("the washer's radii are not the .203/.438 in the parts list " +
          "names: got " + JSON.stringify(radii.map((r) => roundTo(r, 4))));
      }
    });
    // The two flats are parallel and 0.032 in apart -- which is what a
    // correctly-read plane offset looks like, and is not a dimension this repo
    // publishes from geometry.
    if (!AA.facesParallel(planes[0], planes[1])) {
      throw new Error("the washer's two faces did not read as parallel");
    }
    const apart = Math.abs(Math.abs(planes[0].offset) - Math.abs(planes[1].offset));
    if (Math.abs(apart - 0.813) > 0.01) {
      throw new Error("the washer's two planes are " + apart + " apart, not 0.813");
    }
  });

  check("[real] ground truth: the 214820-002 bushing's bore is the .1900 in the " +
    "parts list names, and its four chamfers are cones -- so they are OTHER", () => {
    const sha = byPartId("asm217755_214820_002");
    if (!sha) {
      console.log("      (asm217755_214820_002 is not installed -- nothing to check)");
      return;
    }
    const classes = classifyReal(sha);
    const radii = classes.filter((c) => c.surface === "cylindrical")
      .map((c) => roundTo(c.radius, 3)).sort((a, b) => a - b);
    // .1900 in ID = 4.826 mm, so r = 2.413. The OD's 4.253 is not on a document
    // in this repo and is reported rather than pinned to a source.
    assertEqual(radii, [2.413, 2.413, 4.253, 4.253],
      "the bushing's bore is not the .1900 in ID the 217755 parts list names");
    // Eight chamfer faces, every one of them a cone. A cone read as a cylinder
    // would put four chamfers into every bore's candidate list.
    const others = classes.filter((c) => c.surface === "other");
    assertEqual(others.length, 8, "the bushing's chamfer count moved");
    others.forEach((c) => {
      if (c.why.indexOf("neither a plane nor a cylinder") === -1) {
        throw new Error("a bushing chamfer was refused for the wrong reason: " + c.why);
      }
    });
  });

  check("[real] the mating fit, measured: the NAS6403U11D shank and the " +
    "214820-002 bore agree to 0.3%, and that narrows the bolt's round faces", () => {
    const boltSha = byPartId("asm217755_NAS6403U11D");
    const bushingSha = byPartId("asm217755_214820_002");
    if (!boltSha || !bushingSha) {
      console.log("      (the bolt or the bushing is not installed -- nothing to fit)");
      return;
    }
    const bolt = classifyReal(boltSha);
    const bushing = classifyReal(bushingSha);
    const bore = bushing.filter((c) => c.surface === "cylindrical" && c.radius < 3)[0];
    if (!bore) throw new Error("the bushing's bore did not classify");
    const boltCylinders = bolt.filter((c) => c.surface === "cylindrical");
    const matching = boltCylinders.filter((c) => AA.radiiMatch(c, bore));
    console.log(`      bore r=${roundTo(bore.radius, 4)}; ` +
      `bolt round faces ${boltCylinders.length} -> ${matching.length} at that radius ` +
      `(${matching.map((c) => roundTo(c.radius, 4)).join(", ")})`);
    if (!matching.length) {
      throw new Error("no face of the bolt reads at the bushing bore's radius -- " +
        "the shank and the bore it passes through are a fit");
    }
    if (matching.length >= boltCylinders.length) {
      throw new Error("the radius relation narrowed nothing: " + matching.length +
        " of " + boltCylinders.length + " round faces matched");
    }
    // The cotter hole is the face this must NOT keep: it is round, on the same
    // part, and half the diameter.
    matching.forEach((c) => {
      if (c.radius < 2) {
        throw new Error("the cotter hole (r " + roundTo(c.radius, 4) +
          ") matched the bore's radius");
      }
    });
  });

  check("[real] the planner end to end over real geometry: a diametral " +
    "interface between the bolt and the bushing reaches the cross-part stage", () => {
    const boltSha = byPartId("asm217755_NAS6403U11D");
    const bushingSha = byPartId("asm217755_214820_002");
    if (!boltSha || !bushingSha) {
      console.log("      (the bolt or the bushing is not installed -- nothing to plan)");
      return;
    }
    // A SYNTHETIC topology over REAL meshes, and it is synthetic for a reason
    // worth writing down: the two diametral cross-part interfaces the live
    // topologies model (topology_pitch_system's `pitch_plate_link_hole` and
    // `pitch_link_arm_hole`) each have one half on `pitch_link`, which has no
    // installed mesh -- so the cylindrical leg of `mating_fit` has no live
    // end-to-end case yet. This is the shape it will have when one arrives.
    // See ISSUE_20260921_cross_part_face_relations_need_assembly_placement.md.
    const topology = {
      id: "fit_probe",
      nodes: [
        { id: "bore_wall", name: "bushing bore wall", kind: "mating_surface" },
        { id: "bore_far", name: "bushing far face", kind: "datum_feature" },
        { id: "shank_end", name: "end of the bolt's full cylindrical shank",
          kind: "datum_feature" },
      ],
      edges: [
        { id: "bore_depth", name: "bushing bore depth", kind: "structural",
          part: "asm217755_214820_002", from: "bore_wall", to: "bore_far" },
        { id: "shank_in_bore", name: "bolt shank diameter in the bore", kind: "structural",
          part: "asm217755_NAS6403U11D", from: "bore_wall", to: "shank_end" },
      ],
    };
    const meshes = realMeshList();
    const faceClasses = {};
    faceClasses[boltSha] = classifyReal(boltSha);
    faceClasses[bushingSha] = classifyReal(bushingSha);
    const bore = faceClasses[bushingSha]
      .filter((c) => c.surface === "cylindrical" && c.radius < 3)[0];

    const wide = AA.planFaceSuggestions({
      topology: topology, edgeId: "shank_in_bore", identityProjection: null,
      meshes: meshes, aliases: [], faceClasses: faceClasses,
    });
    const wideEnd = wide.ends.filter((e) => e.direction === "from")[0];
    assertEqual(wideEnd.surface, "cylindrical", "a bore wall did not ask for a round face");
    assertEqual(wideEnd.stage, "surface_class", "stage 1 claimed a narrowing");

    const narrowed = AA.planFaceSuggestions({
      topology: topology, edgeId: "shank_in_bore",
      identityProjection: {
        schema: "joby.tolerance_stack/feature-identity-projection/v0",
        stack_keys: [{
          stack_key: AA.topologyEdgeKey(topology.id, "bore_depth"), state: "bound",
          bindings: [{ event_id: "probe-1", direction: "from",
            geometry_key: { source_step_sha256: bushingSha, face_id: bore.faceId } }],
          owner_not_in_set: [], history: ["probe-1"],
        }],
      },
      meshes: meshes, aliases: [], faceClasses: faceClasses,
    });
    const narrowEnd = narrowed.ends.filter((e) => e.direction === "from")[0];
    assertEqual(narrowEnd.stage, "mating_fit", "the cross-part stage was not reached");
    assertEqual(narrowEnd.relation, "same_radius", "the wrong relation was asserted");
    console.log(`      bolt round faces at a bore-wall interface: ` +
      `${wideEnd.candidates.length} -> ${narrowEnd.candidates.length} once the ` +
      `bushing bore is bound`);
    if (narrowEnd.candidates.length >= wideEnd.candidates.length) {
      throw new Error("binding the other half of the interface narrowed nothing");
    }
    if (!narrowEnd.candidates.length) {
      throw new Error("binding the other half of the interface emptied the list");
    }
  });

  // The live joint, end to end: the two shapes the handoff's definition of done
  // names, over the real projection and the real meshes.
  const livePitchLinkPath = [
    path.join(here, "..", "..", "data", "projections", "viewer", "topologies.json"),
    "C:\\workspace\\tolstack\\data\\projections\\viewer\\topologies.json",
  ].find((candidate) => fs.existsSync(candidate));

  if (!livePitchLinkPath) {
    console.log("SKIP  [real] face suggestions over the live pitch-link joint -- no " +
      "data/projections/viewer/topologies.json (gitignored, main checkout only)");
  } else {
    check("[real] the live pitch-link joint: a diametral element suggests only " +
      "round faces, a thickness only flat ones, and one end bound narrows the other", () => {
      const projection = JSON.parse(fs.readFileSync(livePitchLinkPath, "utf8"));
      const topology = projection.topologies
        .filter((t) => t.id === "pitch_link_to_pitch_plate")[0];
      if (!topology) throw new Error("the real projection carries no pitch_link_to_pitch_plate");
      const meshes = realMeshList();
      const aliases = shippedAliases();
      const faceClasses = {};
      topology.edges.forEach((edge) => {
        if (!edge.part) return;
        const mesh = AA.resolveMeshIdentifier(meshes, edge.part, aliases);
        if (mesh) faceClasses[mesh.sha256] = classifyReal(mesh.sha256);
      });
      const planFor = (edgeId, identity) => AA.planFaceSuggestions({
        topology: topology, edgeId: edgeId, identityProjection: identity || null,
        meshes: meshes, aliases: aliases, faceClasses: faceClasses,
      });
      const surfaceOf = (sha, faceId) => faceClasses[sha][faceId].surface;

      // A diametral element: `cotter_hole_from_point`'s `from` end is the
      // cotter-pin hole centreline, on the bolt.
      const diametral = planFor("cotter_hole_from_point");
      const holeEnd = diametral.ends.filter((e) => e.direction === "from")[0];
      assertEqual(holeEnd.surface, "cylindrical",
        "the cotter-pin hole interface did not ask for a round face");
      if (!holeEnd.candidates.length) throw new Error("the bolt offered no round face");
      holeEnd.candidates.forEach((faceId) => {
        assertEqual(surfaceOf(diametral.sha256, faceId), "cylindrical",
          "a flat face was suggested for a hole");
      });

      // A length between faces: the washer's thickness, on the washer.
      const thickness = planFor("washer_nas1149v0332");
      thickness.ends.forEach((end) => {
        assertEqual(end.surface, "planar", "a washer thickness asked for a round face");
        end.candidates.forEach((faceId) => {
          assertEqual(surfaceOf(thickness.sha256, faceId), "planar",
            "a round face was suggested for a thickness");
        });
      });

      // One end bound narrows the other. The plain bushing's own length: two
      // flat ends, one bound, and the other is the one parallel to it.
      const bushingPlan = planFor("bushing_214820");
      const bushingSha = bushingPlan.sha256;
      const flat = bushingPlan.ends[0].candidates
        .filter((faceId) => surfaceOf(bushingSha, faceId) === "planar");
      if (flat.length < 2) throw new Error("the bushing offered fewer than two flat faces");
      const before = bushingPlan.ends.filter((e) => e.direction === "to")[0];
      const after = planFor("bushing_214820", {
        schema: "joby.tolerance_stack/feature-identity-projection/v0",
        stack_keys: [{
          stack_key: AA.topologyEdgeKey(topology.id, "bushing_214820"), state: "bound",
          bindings: [{ event_id: "probe-1", direction: "from",
            geometry_key: { source_step_sha256: bushingSha, face_id: flat[0] } }],
          owner_not_in_set: [], history: ["probe-1"],
        }],
      }).ends.filter((e) => e.direction === "to")[0];
      assertEqual(after.stage, "same_part_relation", "the same-part stage was not reached");
      assertEqual(after.relation, "parallel", "the wrong relation was asserted");
      console.log(`      pitch-link joint: cotter hole ${holeEnd.candidates.length} round ` +
        `faces on the bolt; washer thickness ${thickness.ends[0].candidates.length} flat faces; ` +
        `bushing length ${before.candidates.length} -> ${after.candidates.length} once one ` +
        `end is bound`);
      if (after.candidates.length >= before.candidates.length) {
        throw new Error("binding one end of the bushing length narrowed nothing");
      }
      if (after.candidates.indexOf(flat[0]) !== -1) {
        throw new Error("the face already bound is still being suggested");
      }
    });
  }
}

(async () => {
  for (const run of checks) await run();
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
})();
