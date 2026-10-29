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

// ...and the shared ALERT MARK, the third file loaded across that boundary and
// the third instance of the same rule: the rail's badge and the viewer's wear
// ONE triangle, drawn rather than typed, defined in
// apps/viewer/warning_icon.js. Loaded here so the check below pins the geometry
// the badge actually renders rather than a copy of it -- AA.warningIcon
// (binding_state.js) delegates straight to it. It only DEFINES at load; the
// node is built at render time, which is why this runner still needs no DOM.
const MARK = path.join(here, "..", "viewer", "warning_icon.js");
vm.runInContext(fs.readFileSync(MARK, "utf8"), sandbox,
  { filename: "../viewer/warning_icon.js" });

// ...and the GENERATED vocabularies, the fourth file loaded across that
// boundary and the reason the other three's argument now has a mechanism:
// binding_state.js's five word-lists were a hand copy of
// tolerance_stack/feature_identity.py's until 2026-09-23 and are read out of
// this module now. It lives under apps/viewer/ rather than an apps/shared/ of
// its own because the browser tier serves apps/viewer as a server root and
// 403s anything above it -- scripts/generate_js_vocabulary.py's docstring
// carries that. Defines only; no DOM, no fetch.
const VOCAB_GEN = path.join(here, "..", "viewer", "vocab.gen.js");
vm.runInContext(fs.readFileSync(VOCAB_GEN, "utf8"), sandbox,
  { filename: "../viewer/vocab.gen.js" });

const files = ["config.js", "storage/adapter.js", "storage/memory.js", "binding_state.js",
  "commands.js", "face_geometry.js", "suggestions.js", "sweep.js", "model_layer.js",
  "exec_queue.js", "fixtures.js"];
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

// --- the generated vocabularies -------------------------------------------
//
// Four checks here spelled out the Python tuples they were pairing --
// `assertEqual(AA.VERDICTS, ["bound", "owner_not_in_set"])` -- which made them
// a THIRD copy of each vocabulary, in a file nothing compares against Python
// at all. They went on 2026-09-23 with the hand copies in binding_state.js:
// this app's five word-lists are read out of ../viewer/vocab.gen.js, generated
// from tolerance_stack/feature_identity.py and compared byte for byte by
// tests/test_js_vocabulary_is_generated.py.
//
// What is worth a check here is the refusal that replaced them, because it is
// the thing running code depends on. Synthetic tables, not the live lists: if
// a live one had drifted this runner would have thrown while loading
// binding_state.js and no check in it would have run.
check("the generated vocabulary module refuses a table whose keys have " +
  "drifted from it, and freezes the one it returns", () => {
    const VOCAB = sandbox.TolstackVocab.annotate;
    const words = VOCAB.list("PATH_KINDS");
    if (words.length < 2) throw new Error("the fixture below needs two words");

    const entriesFor = (names) =>
      Object.fromEntries(names.map((name) => [name, { note: name }]));

    // Python emits a word this app has no branch for.
    assertThrows(() => VOCAB.table("PATH_KINDS", entriesFor([words[0]])),
      "a table missing a word must be refused");
    // ...and a branch for a word Python cannot emit.
    assertThrows(
      () => VOCAB.table("PATH_KINDS", entriesFor([...words, "guessed"])),
      "a table with an impossible word must be refused");
    // A vocabulary this module does not carry -- what a rename leaves behind.
    assertThrows(() => VOCAB.list("NO_SUCH_VOCABULARY"),
      "an unknown vocabulary must be refused");

    // The returned table is frozen, which closes the hole the retired Python
    // scanner documented and could not see: a key attached from outside the
    // literal, by assignment or by Object.assign.
    const table = VOCAB.table("PATH_KINDS", entriesFor([...words]));
    // The directive is not decoration: this runner is a sloppy-mode CommonJS
    // module, where an assignment to a frozen object fails SILENTLY. Every
    // file it loads is strict and throws; the check has to opt in to say so.
    assertThrows(() => { "use strict"; table.sneaky = {}; },
      "a frozen table must refuse a key");
    assertThrows(() => Object.assign(table, { sneaky2: {} }),
      "a frozen table must refuse Object.assign");
    if (table.sneaky !== undefined) throw new Error("a key was added");

    // ...and so is the word list itself.
    assertThrows(() => words.push("sneaky"), "a frozen list must refuse a push");
    if (words.indexOf("sneaky") !== -1) throw new Error("a word was added");
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
// --- correcting a binding: a later event names the one it corrects ---
function boundFixture(id, seq, face, direction, extra) {
  return AA.buildBoundEvent(Object.assign({
    eventId: id, seq: seq, createdAt: "2026-10-21T10:00:00Z", recordedBy: "r",
    stackKey: AA.topologyEdgeKey("p", "e"), direction: direction, ownerPart: "head",
    geometryKey: { sourceStepSha256: "a".repeat(64), faceId: face, areaNative2: 1.5, centroidNative: [1, 2, 3] },
  }, extra || {}));
}
check("buildBoundEvent writes supersedes only when given", () => {
  assertEqual(boundFixture("a", 1, 110, "from").supersedes, undefined);
  assertEqual(boundFixture("b", 2, 110, "to", { supersedes: "a" }).supersedes, "a");
});
check("a flip is the same face at the other end, naming the event it corrects, keeping what was recorded", () => {
  const first = boundFixture("a", 1, 110, "from");
  const flipped = AA.buildCorrectionEvent(first, {
    eventId: "b", seq: 2, createdAt: "t2", recordedBy: "r", direction: AA.otherDirection("from"),
  });
  assertEqual(flipped.direction, "to");
  assertEqual(flipped.geometry_key.face_id, 110);
  assertEqual(flipped.supersedes, "a");
  assertEqual(flipped.owner_part, "head");
});
check("a session correction leaves one standing binding, the corrected one, and one earlier", () => {
  const row = { stack_key: AA.topologyEdgeKey("p", "e"), bindings: [], owner_not_in_set: [], history: [] };
  AA.addEventToRecord(row, boundFixture("a", 1, 110, "from"));
  AA.addEventToRecord(row, AA.buildCorrectionEvent(row.bindings[0], {
    eventId: "b", seq: 2, createdAt: "2026-10-26T09:00:00Z", recordedBy: "r", direction: "to",
  }));
  assertEqual(row.bindings.length, 1);
  assertEqual(row.bindings[0].direction, "to");
  assertEqual(row.superseded.length, 1);
  assertEqual(row.history.length, 2);
  const shown = AA.describeBindings(row, { from: "Piston", to: "Step" });
  assertEqual(shown.current[0].end, "Step");
  assertEqual(shown.earlier[0].end, "Piston");
  assertEqual(shown.earlier[0].date, "2026-10-21");
});
check("two independent bindings on one key both stand", () => {
  const row = { stack_key: AA.topologyEdgeKey("p", "e"), bindings: [], owner_not_in_set: [], history: [] };
  AA.addEventToRecord(row, boundFixture("a", 1, 110, "from"));
  AA.addEventToRecord(row, boundFixture("b", 2, 111, "to"));
  assertEqual(row.bindings.length, 2);
  assertEqual(row.superseded.length, 0);
});
check("recordWithout opens the end the corrected binding held", () => {
  const row = { bindings: [boundFixture("a", 1, 110, "from")] };
  assertEqual(AA.bindingDirectionsNeeded(AA.recordWithout(row, "a")).length, 2);
  assertEqual(row.bindings.length, 1);
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
  // the demo triangle, plus the two parts the panel's context filter has to
  // sort (a bracket and a plate no demo topology names)
  assertEqual(meshes.length, 3);
  assertEqual(meshes.filter((m) => m.sha256 === AA.FIXTURES.demoSha).length, 1);
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
  // ...and the viewer's HTTP adapter before this app's, which wraps it.
  const sharedHttp = html.indexOf('src="../viewer/storage/http.js"');
  const ownHttp = html.indexOf('src="./storage/http.js"');
  if (sharedHttp === -1 || ownHttp === -1 || sharedHttp > ownHttp) {
    throw new Error("index.html must load ../viewer/storage/http.js, then ./storage/http.js");
  }
});

// --- the HTTP read transport (handoff the_scene_pane_is_one_flyout_that_
// reads_over_http, closing ISSUE_20260910_annotate_has_no_http_read_transport)
//
// The viewer's own HttpAdapter is the probe and the fetch; this app's
// storage/http.js maps the annotator's reads onto it and onto the read set
// scripts/build_kinematic_projection.py publishes. Driven here against a
// fake origin -- a map of path -> response -- shaped like drawing-checker's
// mounts (the page under /tolstack/annotate/, data at /tolstack/data/).
vm.runInContext(fs.readFileSync(path.join(here, "..", "viewer", "storage", "http.js"), "utf8"),
  sandbox, { filename: "../viewer/storage/http.js" });
vm.runInContext(fs.readFileSync(path.join(here, "storage", "http.js"), "utf8"),
  sandbox, { filename: "storage/http.js" });

function fakeOrigin(files) {
  const seen = [];
  const fetchImpl = (url) => {
    seen.push(url);
    const hit = Object.prototype.hasOwnProperty.call(files, url) ? files[url] : undefined;
    if (hit === undefined) {
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => "text/plain" },
        text: async () => "", arrayBuffer: async () => new ArrayBuffer(0) });
    }
    const isBytes = hit instanceof Uint8Array;
    const type = hit && hit.__html ? "text/html" : (isBytes ? "application/octet-stream" : "application/json");
    const body = hit && hit.__html ? "<html></html>" : (isBytes ? "" : JSON.stringify(hit));
    return Promise.resolve({ ok: true, status: 200, headers: { get: () => type },
      text: async () => body,
      arrayBuffer: async () => (isBytes ? hit.buffer : new ArrayBuffer(0)) });
  };
  return { fetchImpl, seen };
}

const SERVED = "/tolstack/data/";
function servedFiles(extra) {
  return Object.assign({
    [SERVED + "topologies.json"]: { topologies: [] },
    [SERVED + "kinematic/kinematic_studies.json"]: { studies: [] },
    [SERVED + "kinematic/annotate.json"]: {
      schema: "joby.tolerance_stack/annotate_read_set/v0",
      meshes: [{ sha256: "aa", label: "Bolt", part_id: "bolt_1" }],
      mesh_aliases: { aliases: [{ topology_part: "x", part_id: "bolt_1" }] },
      part_names: { parts: { "123": "bolt" } },
      contact_suggestions: { topologies: [{ id: "t", edges: [] }] },
      sweep_runs: [
        { run_id: "run-old", ts: "2026-10-01T00:00:00Z", mechanism: "m" },
        { run_id: "run-new", ts: "2026-10-16T00:00:00Z", mechanism: "m" },
      ],
    },
    [SERVED + "kinematic/sweeps/run-new.json"]: { schema: "linkage-sweep/v1", run_id: "run-new" },
    [SERVED + "meshes/aa/manifest.json"]: { faces: [] },
    [SERVED + "meshes/aa/provenance.json"]: { label: "Bolt" },
    [SERVED + "meshes/aa/positions.f32"]: new Uint8Array([1, 2, 3, 4]),
    [SERVED + "meshes/aa/html.u32"]: { __html: true },
  }, extra || {});
}

async function servedAdapter(files, writer) {
  const origin = fakeOrigin(files);
  const va = new VA.HttpAdapter({ pathname: "/tolstack/annotate/index.html",
    fetchImpl: origin.fetchImpl });
  const adapter = new AA.HttpAdapter({ va, writer: writer || null });
  return { adapter, origin, state: await adapter.init() };
}

check("http: every read a folder grant makes is answered from the served origin", async () => {
  const { adapter, state } = await servedAdapter(servedFiles());
  assertEqual(state, AA.STATE.READY);
  assertEqual((await adapter.readTopologyProjection()).topologies, []);
  assertEqual((await adapter.readKinematicProjection()).studies, []);
  assertEqual(await adapter.listMeshes(), [{ sha256: "aa", label: "Bolt", part_id: "bolt_1" }]);
  assertEqual((await adapter.readPartMeshAliases()).aliases.length, 1);
  assertEqual((await adapter.readPartNames()).parts["123"], "bolt");
  assertEqual((await adapter.readContactSuggestions()).topologies[0].id, "t");
  // Newest first by the run's own ts, through the one ordering every adapter uses.
  assertEqual((await adapter.listSweepRuns()).map((r) => r.runId), ["run-new", "run-old"]);
  assertEqual((await adapter.readSweepRun("run-new")).run_id, "run-new");
  assertEqual(await adapter.readSweepRun("run-gone"), null);
  assertEqual((await adapter.readMeshManifest("aa")).faces, []);
  assertEqual((await adapter.readMeshProvenance("aa")).label, "Bolt");
  assertEqual(new Uint8Array(await adapter.readMeshBuffer("aa", "positions.f32"))[3], 4);
  // drawing-checker serves no feature-identity projection: absent, not an error.
  assertEqual(await adapter.readFeatureIdentityProjection(), null);
  // A catch-all's HTML is never read as a mesh's bytes.
  assertEqual(await adapter.readMeshBuffer("aa", "html.u32"), null);
  // Every served path is derived from the config, under the served data dir:
  // a config path outside it would be a file no mount reaches.
  for (const key of ["topologyProjection", "kinematicProjection", "annotateReadSet", "annotateSweepsDir"]) {
    assertEqual(AA.CONFIG[key].slice(0, AA.CONFIG.servedDataDir.length), AA.CONFIG.servedDataDir, key);
  }
});

check("http: no read set yet is no meshes and no runs, never an error", async () => {
  const files = servedFiles();
  delete files[SERVED + "kinematic/annotate.json"];
  const { adapter } = await servedAdapter(files);
  assertEqual(await adapter.listMeshes(), []);
  assertEqual(await adapter.listSweepRuns(), []);
  assertEqual(await adapter.readPartMeshAliases(), null);
  assertEqual(await adapter.readPartNames(), null);
  assertEqual(await adapter.readContactSuggestions(), null);
});

function writerSpy(initial) {
  const spy = {
    state: initial, inits: 0, connects: 0, reconnects: 0, writes: [],
    getState: () => spy.state,
    init: async () => { spy.inits++; return spy.state; },
    connect: async () => { spy.connects++; spy.state = AA.STATE.READY; return spy.state; },
    reconnect: async () => { spy.reconnects++; spy.state = AA.STATE.READY; return spy.state; },
    writeFeatureIdentityEvent: async (name, ev) => { spy.writes.push(name); },
    readFeatureIdentityProjection: async () => ({ built_from_events: ["from-the-folder"] }),
  };
  return spy;
}

check("http: the first write asks for the folder once, and the next one does not", async () => {
  const spy = writerSpy(AA.STATE.DISCONNECTED);
  const { adapter } = await servedAdapter(servedFiles(), spy);
  assertEqual(adapter.canWrite(), true);
  assertEqual(adapter.writeGranted(), false);
  await adapter.writeFeatureIdentityEvent("a.json", {});
  await adapter.writeFeatureIdentityEvent("b.json", {});
  assertEqual(spy.connects, 1, "the picker opened more than once");
  assertEqual(spy.writes, ["a.json", "b.json"]);
  assertEqual(adapter.writeGranted(), true);
  // Granted, the projection a filename is counted off comes from the folder.
  assertEqual((await adapter.readFeatureIdentityProjection()).built_from_events, ["from-the-folder"]);
  // A remembered grant that needs re-granting is re-granted, not re-picked.
  const regrant = writerSpy(AA.STATE.NEEDS_REGRANT);
  const again = (await servedAdapter(servedFiles(), regrant)).adapter;
  await again.writeFeatureIdentityEvent("a.json", {});
  assertEqual([regrant.reconnects, regrant.connects], [1, 0]);
});

check("http: with no folder to grant, a write says so in one plain line", async () => {
  const { adapter } = await servedAdapter(servedFiles(), null);
  // The controls still show (canWrite) -- the hosted read-only scene says it
  // cannot bind when the reader presses, never as standing copy.
  assertEqual(adapter.canWrite(), true);
  assertEqual(adapter.hasWriter(), false);
  let message = null;
  try { await adapter.writeFeatureIdentityEvent("a.json", {}); } catch (err) { message = err.message; }
  assertEqual(message, AA.READ_ONLY_WRITE);
  assertNoCommandOrPath(AA.READ_ONLY_WRITE, "the read-only write line");
  assertNothingBanned(AA.READ_ONLY_WRITE, "the read-only write line");
});

check("a served origin is read with no grant, hosted or local, and FSA is never booted", async () => {
  for (const hostname of ["tolstack.joby.aero", "127.0.0.1"]) {
    const spy = fsaSpy();
    const { adapter } = await servedAdapter(servedFiles());
    const fresh = new AA.HttpAdapter({ va: adapter._va });
    const picked = await AA.chooseTransport({ protocol: "http:", hostname, http: fresh, fsa: spy });
    assertEqual(AA.isServed(picked), true, hostname);
    assertEqual(AA.isHosted(picked), false, hostname);
    assertEqual(picked.adapter === fresh, true, hostname);
    assertEqual(spy.booted, false, hostname + ": the folder adapter was booted on a served page");
  }
  // ...and an origin that serves nothing falls back exactly as before.
  const empty = fakeOrigin({});
  const http = new AA.HttpAdapter({ va: new VA.HttpAdapter({
    pathname: "/tolstack/annotate/index.html", fetchImpl: empty.fetchImpl }) });
  const hosted = await AA.chooseTransport({ protocol: "https:", hostname: "kibot", http, fsa: fsaSpy() });
  assertEqual(AA.isHosted(hosted), true);
  const spy = fsaSpy();
  const local = await AA.chooseTransport({ protocol: "http:", hostname: "localhost", http, fsa: spy });
  assertEqual(local.kind, VA.TRANSPORT.FSA);
  assertEqual(spy.booted, true);
});

check("the pane's status: one word per state, and the shell styles every tone", () => {
  assertEqual(AA.paneStatus(true, true, true), AA.PANE_STATUS.live);
  assertEqual(AA.paneStatus(true, true, false), AA.PANE_STATUS.folderNeeded);
  assertEqual(AA.paneStatus(true, false, false), AA.PANE_STATUS.readOnly);
  assertEqual(AA.paneStatus(false, true, true), AA.PANE_STATUS.folder);
  assertEqual(AA.paneStatus(false, true, false), AA.PANE_STATUS.unread);
  // The shell prints these verbatim and colours the dot by tone, so every
  // tone a status carries must be one topology.css has a rule for.
  const css = fs.readFileSync(path.join(here, "..", "viewer", "topology.css"), "utf8");
  for (const key of Object.keys(AA.PANE_STATUS)) {
    const status = AA.PANE_STATUS[key];
    if (AA.PANE_STATUS_TONES.indexOf(status.tone) === -1) {
      throw new Error(`status ${key} carries tone ${status.tone}, not one of AA.PANE_STATUS_TONES`);
    }
    if (status.word.split(" ").length > 2) throw new Error(`status ${key}'s word is not a word: ${status.word}`);
    assertNoCommandOrPath(status.sentence, `status ${key}'s sentence`);
    assertNothingBanned(status.sentence, `status ${key}'s sentence`);
  }
  for (const tone of AA.PANE_STATUS_TONES) {
    if (css.indexOf(`.flyout__status[data-tone="${tone}"]`) === -1) {
      throw new Error(`apps/viewer/topology.css has no rule for status tone "${tone}"`);
    }
  }
});

check("sweep: the folded bar's two figures and the scrubber chip are one composition", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  const values = AA.sweepDriverValues(art);
  const frame = AA.sweepFrameAt(art, 0);
  const figures = AA.sweepHeadlineFigures(art, values, 0, frame);
  assertEqual(figures.driver.text,
    AA.formatSweepNumber(AA.indexToDriver(values, 0), art.driverUnit) + " " + (art.driverUnit || ""));
  assertEqual(figures.driver.label, art.driverLabel || "");
  const referenced = art.reference && art.reference.measure;
  if (referenced && frame.nearer.measures[referenced] != null) {
    assertEqual(figures.measure.label, AA.measureLabel(referenced));
  } else {
    assertEqual(figures.measure, null);
  }
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
  const anchor = 'commands.register("goto", announced(cmdGoto));';
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

// --- context and view (handoff a_context_filter_and_a_view_filter) ----------
//
// Isolate was a trap: it hid everything else and nothing could bring it back.
// These pin the pure transitions app.js's verbs are built from -- the snapshot
// is taken ONCE, so isolating a second part and then turning it off still
// lands on what was drawn before the first.
function viewAfter(rows) {
  const out = {};
  rows.forEach((r) => { out[r.sha] = { visible: r.visible, ghost: r.ghost }; });
  return out;
}

check("isolate then isolate off restores the prior view exactly, ghosts included", () => {
  // before: a drawn, b hidden, c drawn and ghosted
  const before = [
    { sha: "a", visible: true, ghost: false },
    { sha: "b", visible: false, ghost: false },
    { sha: "c", visible: true, ghost: true },
  ];
  // isolate b (not open drawn): d opens, a and c hide, b shows
  const plan = AA.planIsolate(["a", "b", "c"], ["b", "d"]);
  assertEqual(plan.toHide, ["a", "c"]);
  // `isolate off`, with d opened meanwhile and so absent from the snapshot
  const restored = AA.planViewRestore(before, ["a", "b", "c", "d"]);
  assertEqual(viewAfter(restored), {
    a: { visible: true, ghost: false },
    b: { visible: false, ghost: false },
    c: { visible: true, ghost: true },
    d: { visible: false, ghost: false },
  });
});

check("the Isolate button toggles its part in the isolated set, and an empty set means off", () => {
  assertEqual(AA.planIsolateToggle([], "a"), ["a"]);
  assertEqual(AA.planIsolateToggle(["a"], "b"), ["a", "b"]);
  assertEqual(AA.planIsolateToggle(["a", "b"], "a"), ["b"]);
  assertEqual(AA.planIsolateToggle(["b"], "b"), []);
});

check("the show-all header is checked when all are drawn, empty when none, mixed otherwise, " +
  "and disabled with nothing to control", () => {
  assertEqual(AA.planShowAllHeader([true, true, true]),
    { disabled: false, checked: true, indeterminate: false });
  assertEqual(AA.planShowAllHeader([false, false]),
    { disabled: false, checked: false, indeterminate: false });
  assertEqual(AA.planShowAllHeader([true, false, true]),
    { disabled: false, checked: false, indeterminate: true });
  assertEqual(AA.planShowAllHeader([]),
    { disabled: true, checked: false, indeterminate: false });
});

check("leaving a context draws every open part of the new one and none outside it", () => {
  assertEqual(viewAfter(AA.planViewReset(["a", "b", "c"], ["b", "c"], true)), {
    a: { visible: false, ghost: false },
    b: { visible: true, ghost: true },
    c: { visible: true, ghost: true },
  });
  // the see-through setting off: drawn solid
  assertEqual(AA.planViewReset(["b"], ["b"], false), [{ sha: "b", visible: true, ghost: false }]);
});

check("context membership is the scope plus what the reader added minus what they removed, " +
  "and takes no view as input", () => {
  const meshes = ["a", "b", "c", "d"].map((s) => ({ sha256: s }));
  const names = (p) => ({ inModel: p.inModel.map((m) => m.sha256), other: p.other.map((m) => m.sha256) });
  assertEqual(names(AA.planContext(meshes, ["a", "b"], [], [])),
    { inModel: ["a", "b"], other: ["c", "d"] });
  assertEqual(names(AA.planContext(meshes, ["a", "b"], ["d"], ["a"])),
    { inModel: ["b", "d"], other: ["a", "c"] });
  // nothing scopes the model: every mesh is in it
  assertEqual(names(AA.planContext(meshes, null, [], [])),
    { inModel: ["a", "b", "c", "d"], other: [] });
  // add then remove the same part, and the reverse: the later action wins
  let edit = AA.planContextEdit({ added: [], removed: [] }, "add", ["d"]);
  edit = AA.planContextEdit(edit, "remove", ["d"]);
  assertEqual(edit, { added: [], removed: ["d"] });
  edit = AA.planContextEdit(edit, "add", ["d"]);
  assertEqual(edit, { added: ["d"], removed: [] });
});

check("the panel's words and the pick banner survive the shared ban list", () => {
  Object.keys(AA.PARTS_COPY).forEach((k) => assertNothingBanned(AA.PARTS_COPY[k], "AA.PARTS_COPY." + k));
  assertNothingBanned(AA.PICK_NEEDS_ELEMENT, "AA.PICK_NEEDS_ELEMENT");
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

// --- embedded in the viewer's 3D pane (the_3d_pane_opens_in_the_mode_the_
// study_wants): the hover highlight, and the state reply's one line.
check("planHighlight tints a bound face only where its part is open, and an unbound " +
  "edge is a note, never an error", () => {
  const open = (sha) => sha === "bbbb";
  assertEqual(AA.planHighlight(TRACE_IDENTITY, "demo_system", "e_solid", open),
    { face: { sha256: "bbbb", faceId: 4 }, note: null });
  const closed = AA.planHighlight(TRACE_IDENTITY, "demo_system", "e_solid", () => false);
  assertEqual(closed.face, null);
  assertEqual(/not open/.test(closed.note), true, closed.note);
  const unbound = AA.planHighlight(TRACE_IDENTITY, "demo_system", "e_gap", open);
  assertEqual(unbound.face, null);
  assertEqual(/no binding/.test(unbound.note), true, unbound.note);
  // Another topology's edge of the same id is not this one's binding.
  assertEqual(AA.planHighlight(TRACE_IDENTITY, "other", "e_solid", open).face, null);
  assertEqual(AA.planHighlight(null, "demo_system", "e_solid", open).face, null);
});
check("embedState names the mode and the subject in one line -- the run's mechanism " +
  "in sweep mode, the study (or the topology) in bind mode", () => {
  const sweep = { runId: "run-1", topologyId: "vpa_pitch_linkage",
    mechanismName: "vpa_pitch_chunk2_p2" };
  const topology = { id: "vpa_pitch_linkage", title: "Propeller pitch linkage" };
  const study = { id: "travel", title: "Travel between end stops" };
  assertEqual(AA.embedState(sweep, topology, study), {
    type: "annotate:state", mode: "sweep", topology: "vpa_pitch_linkage",
    study: null, run: "run-1", title: "Sweep — vpa pitch chunk2 p2",
  });
  assertEqual(AA.embedState(null, topology, study), {
    type: "annotate:state", mode: "bind", topology: "vpa_pitch_linkage",
    study: "travel", run: null, title: "Binding — Travel between end stops",
  });
  assertEqual(AA.embedState(null, topology, null).title,
    "Binding — Propeller pitch linkage");
  assertEqual(AA.embedState(null, null, null).title, "Binding");
});
// --- the sweep rail shows the mechanism (handoff the_sweep_rail_shows_the_
// mechanism): the tree, the feature bindings, the stop and the contributors.
// One synthetic run, small enough to read: a ground body and one moving body,
// a hinge, a two-force rod with its feature joins, a driver, and one joint
// whose rows match no linkage type.
function railDoc() {
  const still = { translation: [0, 0, 0], rotvec: [0, 0, 0] };
  const at = (a, b) => ({ point_a_world: a, point_b_world: b, axis_world: null });
  return {
    schema: AA.SWEEP_SCHEMA, run_id: "rail-run",
    mechanism: { name: "rail_demo", driver: { label: "travel", unit: "mm" },
      row_labels: ["hinge.dx", "hinge.dy", "hinge.dz", "hinge.tilt_u", "hinge.tilt_w",
        "rod.gap", "drive.position", "odd.dx"] },
    geometry: { features: [
      { label: "rod.point_a[0]", topology: "rail_topo", node: "n_top", component: "x", body: "arm" },
      { label: "rod.point_a[1]", topology: "rail_topo", node: "n_top", component: "y", body: "arm" },
      { label: "rod.point_b[0]", topology: "rail_topo", node: "n_bot", component: "x", body: "base" },
      { label: "rod.length", topology: "rail_topo", edge: "rod_len", component: null, body: null },
      { label: "drive.value", kind: "driver", component: null, body: null },
    ] },
    bodies: [{ name: "base", ground: true, parts: ["p1", "p2"] },
      { name: "arm", ground: false, parts: ["p3"] }],
    links: [{ joint: "rod", parts: ["rod_part"] }],
    points: [{ index: 0, driver_value: 0, measures: {}, poses: { base: still, arm: still },
      joints: { hinge: at([0, 0, 0], [0, 0, 0]), rod: at([1, 0, 0], [0, 1, 0]),
        drive: at([0, 0, 1], [0, 0, 2]), odd: at([2, 0, 0], [2, 0, 0]) } }],
  };
}
const RAIL_TOPOLOGY = {
  id: "rail_topo",
  nodes: [{ id: "n_top", name: "rod top ball centre" }, { id: "n_bot", name: "rod foot ball centre" },
    { id: "n_other", name: "a bore" }, { id: "n_alone", name: "a face nothing ends on" }],
  edges: [{ id: "other_edge", name: "bore to rod top", from: "n_other", to: "n_top" },
    { id: "rod_len", name: "rod length between ball centres", from: "n_bot", to: "n_top" }],
};

check("a joint's type is read off its own residual rows, and a row set no linkage " +
  "type has is null rather than a guess", () => {
  const art = AA.readSweepArtifact(railDoc());
  assertEqual(AA.sweepJointTypes(art),
    { hinge: "revolute", rod: "distance", drive: "axial_position", odd: null });
  // Every type word, and every rail word, is reader-facing copy.
  AA.LINKAGE_JOINT_TYPES.forEach((type) => {
    assertNothingBanned(AA.SWEEP_JOINT_TYPE_WORDS[type], "the word for " + type);
  });
  Object.keys(AA.SWEEP_RAIL_WORDS).forEach((key) => {
    assertNothingBanned(AA.SWEEP_RAIL_WORDS[key], "the rail word " + key);
  });
  // A run with no row labels at all types nothing.
  assertEqual(AA.sweepJointTypes({ rowLabels: [] }), {});
});

check("the mechanism tree lists the run's bodies with their parts, opens the moving " +
  "ones, and takes a joint's two bodies from its feature joins before its measured ends", () => {
  const tree = AA.sweepMechanismTree(AA.readSweepArtifact(railDoc()));
  assertEqual(tree.bodies.map((b) => [b.name, b.parts, b.open]),
    [["base", ["p1", "p2"], false], ["arm", ["p3"], true]]);
  assertEqual(tree.joints.map((j) => j.name), ["hinge", "rod", "drive", "odd"]);
  const rod = tree.joints[1];
  assertEqual(rod.bodies, ["arm", "base"], "the rod's ends, as its joins declare them");
  assertEqual(rod.parts, ["rod_part"]);
  assertEqual(rod.features, [
    { topology: "rail_topo", kind: "node", id: "n_top" },
    { topology: "rail_topo", kind: "node", id: "n_bot" },
    { topology: "rail_topo", kind: "edge", id: "rod_len" }]);
  // No joins: the measured ends answer, and ground wins the tie for a still point.
  assertEqual(tree.joints[0].bodies, ["base", "base"]);
  assertEqual(AA.sweepJointRowWords(rod), "rod · ball-ended link · arm ↔ base");
  assertEqual(AA.sweepJointRowWords(tree.joints[0]), "hinge · hinge · base");
  assertEqual(AA.sweepJointRowWords(tree.joints[3]), "odd · base");
  assertEqual(AA.sweepBodyRowWords(tree.bodies[1]), "arm · 1 part");
});

check("a node feature is bound through the edge to its joint's other node, at its own " +
  "end; an edge feature is its whole edge; a node nothing ends on is bound nowhere", () => {
  const rod = AA.sweepMechanismTree(AA.readSweepArtifact(railDoc())).joints[1];
  const via = (f) => AA.sweepFeatureEdge(RAIL_TOPOLOGY, f, rod.features);
  // n_top's FIRST edge is other_edge; the rod's own length wins because it
  // ends on the rod's other node.
  assertEqual(via(rod.features[0]), { edgeId: "rod_len", direction: "to" });
  assertEqual(via(rod.features[1]), { edgeId: "rod_len", direction: "from" });
  assertEqual(via(rod.features[2]), { edgeId: "rod_len", direction: null });
  // With no sibling to aim at, the first edge that ends on the node.
  assertEqual(AA.sweepFeatureEdge(RAIL_TOPOLOGY, { kind: "node", id: "n_top" }, []),
    { edgeId: "other_edge", direction: "to" });
  assertEqual(AA.sweepFeatureEdge(RAIL_TOPOLOGY, { kind: "node", id: "n_alone" }, []),
    { edgeId: null, direction: null });
  assertEqual(AA.sweepFeatureName(RAIL_TOPOLOGY, rod.features[0]), "rod top ball centre");
  assertEqual(AA.sweepFeatureName(null, { kind: "node", id: "a_b" }), "a b");
});

check("a node feature's colour is the binding at its own end of the edge, and a " +
  "length's is its whole edge's", () => {
  const identity = { stack_keys: [{
    stack_key: { kind: "topology_edge", topology_id: "rail_topo", edge_id: "rod_len" },
    bindings: [{ event_id: "e1", direction: "from",
      geometry_key: { source_step_sha256: "aa", face_id: 2 } }] }] };
  const state = (direction, staleness) => AA.sweepFeatureState(identity, staleness || null,
    "rail_topo", { edgeId: "rod_len", direction });
  assertEqual(state("from"), AA.BINDING_STATES.BOUND);
  assertEqual(state("to"), AA.BINDING_STATES.UNBOUND, "the other end is not bound");
  assertEqual(state(null), AA.BINDING_STATES.BOUND);
  assertEqual(state("from", { e1: "needs_re_confirmation" }), AA.BINDING_STATES.NEEDS_RECONFIRMATION);
  const owner = { stack_keys: [{ stack_key: identity.stack_keys[0].stack_key, bindings: [] }] };
  assertEqual(AA.sweepFeatureState(owner, null, "rail_topo", { edgeId: "rod_len", direction: "to" }),
    AA.BINDING_STATES.OWNER_NOT_IN_SET);
  assertEqual(AA.sweepFeatureState(identity, null, "rail_topo", { edgeId: null, direction: null }),
    AA.BINDING_STATES.UNBOUND);
});

check("highlight narrows to one end of an edge, and a selected length tints both of " +
  "its ends on open parts only", () => {
  const identity = { stack_keys: [{
    stack_key: { kind: "topology_edge", topology_id: "rail_topo", edge_id: "rod_len" },
    bindings: [
      { event_id: "e1", direction: "from", geometry_key: { source_step_sha256: "aa", face_id: 2 } },
      { event_id: "e2", direction: "to", geometry_key: { source_step_sha256: "bb", face_id: 5 } }] }] };
  const open = () => true;
  assertEqual(AA.planHighlight(identity, "rail_topo", "rod_len", open, "to").face,
    { sha256: "bb", faceId: 5 });
  assertEqual(AA.planHighlight(identity, "rail_topo", "rod_len", open).face,
    { sha256: "aa", faceId: 2 }, "no direction is the first binding, as before");
  const tree = AA.sweepMechanismTree(AA.readSweepArtifact(railDoc()));
  const length = { feature: { kind: "edge", id: "rod_len" } };
  const reads = AA.contributorHighlightReads(RAIL_TOPOLOGY, length, tree);
  assertEqual(AA.planHighlightFaces(identity, "rail_topo", reads, open),
    [{ sha256: "aa", faceId: 2 }, { sha256: "bb", faceId: 5 }]);
  assertEqual(AA.planHighlightFaces(identity, "rail_topo", reads, (sha) => sha === "bb"),
    [{ sha256: "bb", faceId: 5 }]);
  // A node contributor reads through the edge its joint's feature row uses.
  const top = { feature: { kind: "node", id: "n_top" } };
  assertEqual(AA.contributorHighlightReads(RAIL_TOPOLOGY, top, tree),
    [{ edgeId: "rod_len", direction: "to" }]);
  assertEqual(AA.planHighlightFaces(identity, "rail_topo",
    AA.contributorHighlightReads(RAIL_TOPOLOGY, top, tree), open), [{ sha256: "bb", faceId: 5 }]);
});

check("the contributor group reads the stop nearest the frame by the study's own " +
  "measure, and its head names that stop with a sign and its unit", () => {
  const study = { measure: "blade_pitch", units: "deg", stops: [
    { id: "lo", target: -7, index: 0, rows: [
      { edge: "rod_len", magnitude: 0.15554689, gap: null, feature: { edge: "rod_len" } },
      { edge: "no_such_edge", magnitude: null, gap: "No band is cited.",
        feature: { node: "n_top", body: "arm" } }] },
    { id: "hi", target: 72, index: 79, rows: [] }] };
  const at = (value, index) => ({ index, nearer: { measures: { blade_pitch: value } } });
  assertEqual(AA.kinematicStopAt(study, at(-6.99, 0)).id, "lo");
  assertEqual(AA.kinematicStopAt(study, at(32, 50)).id, "lo", "32 deg is nearer -7 than 72");
  assertEqual(AA.kinematicStopAt(study, at(33, 10)).id, "hi", "by value, never by index");
  assertEqual(AA.kinematicStopAt(study, { index: 60, nearer: { measures: {} } }).id, "hi",
    "with no measure on the frame, by index");
  assertEqual(AA.kinematicStopAt({ stops: [] }, at(0, 0)), null);
  assertEqual(AA.kinematicStopWords(study.stops[0], "deg"), "at the −7° stop");
  assertEqual(AA.kinematicStopWords(study.stops[1], "deg"), "at the +72° stop");
  assertEqual(AA.kinematicStopWords({ target: 1.5 }, "mm"), "at the +1.5 mm stop");
  assertEqual(AA.kinematicContributorRows(study, study.stops[0], RAIL_TOPOLOGY, 3), [
    { edge: "rod_len", name: "rod length between ball centres", magnitude: "0.156 deg",
      gap: null, feature: { kind: "edge", id: "rod_len" } },
    { edge: "no_such_edge", name: "no such edge", magnitude: null,
      gap: "No band is cited.", feature: { kind: "node", id: "n_top" } }]);
});

check("a kinematic study lists its contributors only on the run it folded, and " +
  "a mismatched pair says why instead", () => {
  const study = { id: "k1", title: "Blade pitch at the end stops",
    sweep: { run_id: "p2-new" }, stops: [] };
  assertEqual(AA.sweepStudyFor(study, "p2-new"), { study, refusal: null });
  const other = AA.sweepStudyFor(study, "p2-old");
  assertEqual(other.study, null, "the other run's animation gets no contributor group");
  assertEqual(other.refusal, "Contributors left out: Blade pitch at the end stops " +
    "was folded on run p2-new, not on p2-old.");
  const broken = AA.sweepStudyFor({ id: "k2", status: "error" }, "p2-new");
  assertEqual(broken.study, null);
  assertEqual(broken.refusal, "Contributors left out: k2 did not build, so it has " +
    "none for p2-new.");
  assertEqual(AA.sweepStudyFor(null, "p2-new"), { study: null, refusal: null },
    "no study asked for is no group and nothing to say");
});

check("a sweep link carries its kinematic study onto the sweep verb, and inspect's " +
  "grammar refuses what it does not take", () => {
  assertEqual(AA.planEntryCommands({ sweep: "r1", kinematic: "k1" }), [["sweep", "r1", "k1"]]);
  assertEqual(AA.planEntryCommands({ sweep: "r1", kinematic: "k1", t: "12" }),
    [["sweep", "r1", "k1"], ["seek", "12"]]);
  assertEqual(AA.planEntryCommands({ sweep: "r1" }), [["sweep", "r1"]]);
  assertEqual(AA.parseInspect("joint", "rod"), { kind: "joint", name: "rod" });
  assertEqual(AA.parseInspect("contributor", "rod_len"), { kind: "contributor", name: "rod_len" });
  assertEqual(AA.parseInspect("clear"), { kind: null, name: null });
  let threw = 0;
  try { AA.parseInspect("body", "base"); } catch (_) { threw++; }
  try { AA.parseInspect("joint"); } catch (_) { threw++; }
  assertEqual(threw, 2, "an unknown target and a missing name both refuse");
});

// --- the rail and the scene point at each other (handoff the_rail_and_the_
// scene_point_at_each_other) -------------------------------------------------

// The anchoring rows' shape (app.js's anchorSweepBodies): the pitch arm is
// placed at blade 1's occurrence only, and drawn at five.
const ANCHOR_ROWS = [
  { subject: "base", part: "hub", sha256: "h", state: "ground",
    placements: [{ key: "A/hub.1" }] },
  { subject: "blade", part: "pitch_arm", sha256: "arm", state: "matched",
    placements: [{ key: "A/arm.2" }] },
  { subject: "blade", part: "blade_root", sha256: "root", state: "matched",
    placements: [{ key: "A/root.3" }, { key: "A/root.3" }] },
  { subject: "pitch_plate", part: "bushing", sha256: "bush", state: "carried",
    placements: [{ key: "A/plate.1/bush.1" }] },
  { subject: "pitch_link", part: "bushing", sha256: "bush", state: "matched",
    placements: [{ key: "A/plate.1/bush.1" }] },
  { subject: "blade", part: "missing", state: "no-mesh" },
];

check("a body's drawn occurrences are the anchoring rows' placements, keyed, each once", () => {
  const by = AA.sweepSubjectOccurrences(ANCHOR_ROWS);
  assertEqual(by.blade, [{ sha256: "arm", key: "A/arm.2" }, { sha256: "root", key: "A/root.3" }]);
  assertEqual(by.base, [{ sha256: "h", key: "A/hub.1" }]);
  assertEqual(AA.sweepPartOccurrences(by, "blade", "arm"), [{ sha256: "arm", key: "A/arm.2" }]);
  assertEqual(AA.sweepPartOccurrences(by, null, "arm"), null,
    "outside any body a part row is every occurrence of its mesh");
});

check("a picked occurrence finds its body; a listed part beats one carried inside another; " +
  "an occurrence no body was placed at finds none", () => {
  assertEqual(AA.sweepOccurrenceSubject(ANCHOR_ROWS, "arm", "A/arm.2"), "blade");
  assertEqual(AA.sweepOccurrenceSubject(ANCHOR_ROWS, "arm", "A/arm.4"), null);
  assertEqual(AA.sweepOccurrenceSubject(ANCHOR_ROWS, "bush", "A/plate.1/bush.1"), "pitch_link");
  assertEqual(AA.sweepOccurrenceSubject(ANCHOR_ROWS.filter((r) => r.subject !== "pitch_link"),
    "bush", "A/plate.1/bush.1"), "pitch_plate");
});

const FACE_IDENTITY = { stack_keys: [
  { stack_key: AA.topologyEdgeKey("t", "len"), bindings: [
    { direction: "from", geometry_key: { source_step_sha256: "arm", face_id: 110 } },
    { direction: "to", geometry_key: { source_step_sha256: "zzz9", face_id: 4 } }] },
  { stack_key: AA.topologyEdgeKey("other", "len"), bindings: [
    { direction: "from", geometry_key: { source_step_sha256: "arm", face_id: 110 } }] },
] };

check("a face finds the feature rows it is bound to, by edge and end, in its own topology only", () => {
  const found = AA.bindingsOfFace(FACE_IDENTITY, "t", "arm", 110);
  assertEqual(found, [{ edgeId: "len", direction: "from" }]);
  assertEqual(AA.bindingsOfFace(FACE_IDENTITY, "t", "arm", 111), []);
  assertEqual(AA.featureReadMatches({ edgeId: "len", direction: "from" }, found), true);
  assertEqual(AA.featureReadMatches({ edgeId: "len", direction: "to" }, found), false);
  assertEqual(AA.featureReadMatches({ edgeId: "len", direction: null }, found), true,
    "an edge feature is either end");
  assertEqual(AA.featureReadMatches({ edgeId: null }, found), false);
});

check("a feature row names its bound face by face id and drawing number, or says none is bound", () => {
  const meshes = [{ sha256: "arm", label: "214698-002 (extracted from asm.stp)" }];
  const rows = AA.boundFaceRows(FACE_IDENTITY, "t", { edgeId: "len", direction: null }, meshes);
  assertEqual(rows.map((r) => r.text), ["face 110 of 214698-002", "face 4 of zzz9"]);
  assertEqual(AA.boundFaceRows(FACE_IDENTITY, "t", { edgeId: "len", direction: "to" }, meshes)
    .map((r) => r.text), ["face 4 of zzz9"], "a node feature reads only its own end");
  assertEqual(AA.boundFaceRows(FACE_IDENTITY, "t", { edgeId: "nope", direction: null }, meshes), []);
  assertEqual(AA.BOUND_FACE_WORDS.none, "no face bound");
});

const ALERT_TOPOLOGY = {
  parts: [
    { id: "tan", name: "212956-005 pitch anti-rotation link assembly", drawing: "212956-005" },
    { id: "plate", name: "pitch plate", drawing: "215177-001" },
    { id: "bearing", name: "tangential-link bearing", drawing: null },
  ],
  nodes: [{ id: "a", parts: ["bearing"] }, { id: "b", parts: ["plate", "tan"] }],
  edges: [{ id: "tan_len", part: "tan", from: "a", to: "b" }],
};

check("a gap contributor's alert is the badge's {state, text} with its gap, the drawings to " +
  "read and Pick", () => {
  assertEqual(AA.edgePartIds(ALERT_TOPOLOGY, "tan_len"), ["tan", "bearing", "plate"]);
  const alerts = AA.contributorAlerts({ edge: "tan_len", gap: "No band is cited." }, ALERT_TOPOLOGY);
  assertEqual(alerts.length, 1);
  assertEqual(alerts[0].state, AA.CONTRIBUTOR_ALERT_STATE);
  assertEqual(alerts[0].text, "No band is cited. Drawings to read: " +
    "212956-005 pitch anti-rotation link assembly; 215177-001 pitch plate. " +
    AA.CONTRIBUTOR_ALERT_WORDS.pick);
  assertEqual(AA.contributorAlerts({ edge: "tan_len", gap: null }, ALERT_TOPOLOGY), []);
  assertNothingBanned(alerts[0].text, "a contributor alert");
});

check("the type chips: the tree's own row kinds, toggled one at a time, remembered, and " +
  "anything unreadable is nothing hidden", () => {
  assertEqual(AA.SWEEP_ROW_KINDS.filter((k) => !AA.SWEEP_ROW_KIND_WORDS[k]), []);
  assertEqual(AA.toggleRowKind([], "features"), ["features"]);
  assertEqual(AA.toggleRowKind(["contributors", "features"], "features"), ["contributors"]);
  let threw = false;
  try { AA.toggleRowKind([], "faces"); } catch (_) { threw = true; }
  assertEqual(threw, true, "a kind the tree does not have refuses");
  const store = { data: {}, getItem(k) { return this.data[k] === undefined ? null : this.data[k]; },
    setItem(k, v) { this.data[k] = v; } };
  assertEqual(AA.readHiddenRowKinds(store), []);
  AA.writeHiddenRowKinds(store, ["joints", "bogus", "bodies"]);
  assertEqual(AA.readHiddenRowKinds(store), ["bodies", "joints"]);
  store.data[AA.PREF_KEYS.sweepRowKinds] = "{not json";
  assertEqual(AA.readHiddenRowKinds(store), []);
  AA.SWEEP_ROW_KINDS.forEach((k) => assertNothingBanned(AA.SWEEP_ROW_KIND_WORDS[k], "chip " + k));
});

check("hover's and inspect part's grammar take what the rail sends and refuse the rest", () => {
  assertEqual(AA.parseHover("body", "blade"), { kind: "body", name: "blade" });
  assertEqual(AA.parseHover("part", "arm", "blade"), { kind: "part", name: "arm", subject: "blade" });
  assertEqual(AA.parseHover("part", "arm"), { kind: "part", name: "arm", subject: null });
  assertEqual(AA.parseHover("feature", "len", "to"), { kind: "feature", name: "len", direction: "to" });
  assertEqual(AA.parseHover("clear"), { kind: null });
  assertEqual(AA.parseInspect("part", "arm", "110", "blade"),
    { kind: "part", name: "arm", faceId: 110, subject: "blade" });
  assertEqual(AA.parseInspect("part", "arm", "7"), { kind: "part", name: "arm", faceId: 7, subject: null });
  let threw = 0;
  try { AA.parseHover("surface", "x"); } catch (_) { threw++; }
  try { AA.parseHover("body"); } catch (_) { threw++; }
  try { AA.parseHover("feature", "len", "up"); } catch (_) { threw++; }
  try { AA.parseInspect("part", "arm", "1.5"); } catch (_) { threw++; }
  try { AA.parseInspect("part", "arm"); } catch (_) { threw++; }
  assertEqual(threw, 5);
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

// --- a pick that can show nothing changes nothing (handoff a_pick_on_an_element_
// that_names_no_part_leaves_the_scene_standing). app.js cannot boot in this
// sandbox, so the verb's decision is the pure planner it asks first; the
// state-level half (mode, loaded parts, filter untouched) is the browser spec.
check("planGotoRefusal: a gap edge with part null is refused, with the row's words " +
  "and both end nodes to link", () => {
  const refusal = AA.planGotoRefusal(FILTER_TOPO, "demo_edge_traced", FILTER_MESHES, []);
  assertEqual(refusal.kind, "no-part");
  assertEqual(refusal.text, AA.GOTO_REFUSAL_WORDS.noPart);
  const edge = FILTER_TOPO.edges.find((e) => e.id === "demo_edge_traced");
  assertEqual(refusal.nodeIds, [edge.from, edge.to].filter(Boolean));
  assertEqual(refusal.edgeId, "demo_edge_traced");
});

check("planGotoRefusal: a part with no installed mesh is refused, naming the part", () => {
  const refusal = AA.planGotoRefusal(FILTER_TOPO, "demo_edge_no_owner", FILTER_MESHES, []);
  assertEqual(refusal.kind, "no-mesh");
  assertEqual(refusal.missingParts, ["no_such_part"]);
  if (refusal.text.indexOf("no_such_part") === -1) {
    throw new Error("the refusal does not name the part: " + refusal.text);
  }
});

check("planGotoRefusal: an edge with an installed mesh, a node, no edge and an " +
  "unknown edge are never refused", () => {
  assertEqual(AA.planGotoRefusal(FILTER_TOPO, "demo_edge_untraced", FILTER_MESHES, []), null);
  assertEqual(AA.planGotoRefusal(FILTER_TOPO, null, FILTER_MESHES, []), null);
  assertEqual(AA.planGotoRefusal(FILTER_TOPO, "no_such_edge", FILTER_MESHES, []), null);
  const withNodes = JSON.parse(JSON.stringify(FILTER_TOPO));
  withNodes.nodes = [{ id: "b", name: "interface b", parts: ["demo_triangle"] }];
  assertEqual(AA.planGotoRefusal(withNodes, "b", FILTER_MESHES, []), null);
});

check("planSweepReturn keeps the run, the study and the SAME opened-by-sweep set, " +
  "as a copy", () => {
  const sweep = { artifact: { runId: "run-1" }, study: { id: "study-1" },
    openedBySweep: ["aaaa", "bbbb"] };
  const back = AA.planSweepReturn(sweep);
  assertEqual(back, { runId: "run-1", studyId: "study-1", parts: ["aaaa", "bbbb"] });
  sweep.openedBySweep.push("cccc");
  assertEqual(back.parts, ["aaaa", "bbbb"]);
  assertEqual(AA.planSweepReturn(null), null);
  assertEqual(AA.planSweepReturn({ artifact: { runId: "r" }, openedBySweep: [] }),
    { runId: "r", studyId: null, parts: [] });
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

// --- a pick is a click, not a press ----------------------------------------
//
// Jeff, 2026-10-21: "as soon as I went to rotate the view it deselected it."
// The scene raycasts on RELEASE, and only when AA.planPointerRelease says the
// pointer did not travel; the toggle above is unchanged.
check("planPointerRelease: a release where the press was picks, one just under " +
  "the slop picks, one at or over it is a drag, and a release with no press is " +
  "nothing", () => {
  const slop = AA.PICK_CLICK_SLOP_PX;
  if (!(typeof slop === "number" && slop > 0 && slop <= 8)) {
    throw new Error("PICK_CLICK_SLOP_PX is not a small positive pixel count: " + slop);
  }
  const down = { x: 100, y: 200 };
  assertEqual(AA.planPointerRelease({ down, up: { x: 100, y: 200, inside: true }, slopPx: slop }),
    { x: 100, y: 200 });
  assertEqual(AA.planPointerRelease({ down, up: { x: 100 + slop - 0.5, y: 200, inside: true } }),
    { x: 100 + slop - 0.5, y: 200 }, "a release just under the slop did not pick");
  assertEqual(AA.planPointerRelease({ down, up: { x: 100 + slop, y: 200, inside: true } }),
    null, "a release AT the slop picked -- the smallest orbit would clear the pick");
  // Diagonal: the distance is Euclidean, not per-axis.
  assertEqual(AA.planPointerRelease({ down, up: { x: 100 + slop * 0.8, y: 200 + slop * 0.8,
    inside: true } }), null, "a diagonal drag over the slop picked");
  assertEqual(AA.planPointerRelease({ down, up: { x: 100 + 40, y: 200 - 300, inside: true } }),
    null, "a long drag picked");
  assertEqual(AA.planPointerRelease({ down: null, up: { x: 100, y: 200, inside: true } }),
    null, "a release with no recorded press picked");
  assertEqual(AA.planPointerRelease({ down, up: { x: 100, y: 200, inside: false } }),
    null, "a release off the canvas picked");
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

// This check was `ALERT_ICON is one glyph and is not a word` from 2026-09-16
// until 2026-09-22 -- a real guard, written against a CHARACTER
// (`AA.ALERT_ICON = "\u26A0"`, set on `badge.textContent`). The character is
// gone (ISSUE_20260922_the_alert_glyph_is_still_a_character_on_two_rails) and
// the guard is not: what it was protecting is that the badge carries no text to
// read, which is the whole point of the popup, and that claim is now a claim
// about a drawn icon. So it is REWRITTEN to the shape the viewer's own mark is
// pinned by -- a single path, sized in pixels -- rather than dropped with the
// thing it was phrased against.
//
// Geometry only, no node: this runner has no DOM (see the header), so what is
// asserted here is the definition. That the rendered badge really contains one
// sized `<path>` and no character is asserted where a layout engine can see it:
// scripts/run_viewer_browser_tests.mjs, over the live rail.
check("the rail's alert mark is DRAWN, not typed -- one path, sized in " +
  "pixels, and the viewer's definition rather than a second copy of it", () => {
  // ONE definition, asserted by DELEGATION rather than by identity: AA's entry
  // point is a wrapper (it turns a missing sibling file into a sentence naming
  // the file, the way AA.chooseTransport does), so what has to be true is that
  // every call lands on the viewer's function and nothing of the mark is
  // written down on this side.
  const real = VA.warningIcon;
  try {
    VA.warningIcon = function (className) { return { delegated: className }; };
    assertEqual(AA.warningIcon("alertbadge__mark"),
      { delegated: "alertbadge__mark" },
      "AA.warningIcon must call the shared mark, not draw its own");
    // ...and when the sibling file did not load, the failure says which file.
    delete VA.warningIcon;
    let message = "";
    try { AA.warningIcon(); } catch (err) { message = err.message; }
    if (!/warning_icon\.js/.test(message)) {
      throw new Error("expected the missing-sibling error to name the file, " +
        "got " + JSON.stringify(message));
    }
  } finally {
    VA.warningIcon = real;
  }
  for (const key of ["ALERT_ICON", "WARNING_ICON_PATH", "WARNING_ICON_PX"]) {
    if (key in AA) {
      throw new Error("a second definition of the mark on this side: AA." +
        key + " = " + JSON.stringify(AA[key]));
    }
  }
  // A PIXEL size, and a number rather than a CSS length, because the point of
  // drawing the mark is that its size is not a step on the type scale
  // (tests/test_app_type_scale.py owns those, and owns the ban on a bare px
  // font-size that this deliberately is not one of).
  if (typeof VA.WARNING_ICON_PX !== "number" || VA.WARNING_ICON_PX < 14) {
    throw new Error("expected a pixel size legible at row height, got " +
      JSON.stringify(VA.WARNING_ICON_PX));
  }
  // SVG path data and nothing else: a `d` starting at a moveto, built only out
  // of path commands and numbers. A character would fail on the first test and
  // a word on the second.
  if (!/^M[\d.\-]/.test(VA.WARNING_ICON_PATH)) {
    throw new Error("expected path data starting at a moveto, got " +
      JSON.stringify(VA.WARNING_ICON_PATH));
  }
  if (/[^MmLlHhVvCcSsQqTtAaZz0-9.,\s-]/.test(VA.WARNING_ICON_PATH)) {
    throw new Error("the mark must be path data, not text: " +
      JSON.stringify(VA.WARNING_ICON_PATH));
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

// The two ends of the fixture element, by the names the form shows.
const END_NAMES = { from: "bushing face against the plate", to: "plate far face" };

check("taskInstruction: two faces, then one, then done -- the count comes " +
  "from what the binding still needs", () => {
  const named = (needed) => AA.taskInstruction({
    elementName: "Bushing length", needed, names: END_NAMES,
  });
  // The form binds ONE face per event (Jeff: "I was expecting it to ask me for
  // two faces"), so the two-face state says so and asks for the first.
  assertEqual(named(["from", "to"]),
    "Bushing length needs two faces, bound one at a time. Click the first one " +
    "in the 3D view.");
  // One end bound: the end still needed, BY ITS INTERFACE NAME.
  assertEqual(named(["to"]),
    "Select the remaining face that defines Bushing length: plate far face.");
  assertEqual(named(["from"]),
    "Select the remaining face that defines Bushing length: bushing face " +
    "against the plate.");
  assertEqual(named([]),
    "Bushing length already has the faces it needs. Click a face to bind another.");
  // An element with no record at all defaults to both, never to "done".
  assertEqual(AA.taskInstruction({ elementName: "Bushing length", names: END_NAMES }),
    named(["from", "to"]));
});

check("taskInstruction: a picked face turns the instruction into the action " +
  "the bind form is about to take", () => {
  const picked = (needed, chosen) => AA.taskInstruction({ elementName: "Bushing length",
    picked: true, needed, names: END_NAMES, chosen });
  // Both ends open and nothing chosen: choose the interface, then Bind -- and
  // the other face comes next.
  assertEqual(picked(["from", "to"], null),
    "Choose which interface of Bushing length this face is, then press Bind. " +
    "The other face comes next.");
  assertEqual(picked(["from", "to"], "from"),
    "Bind the selected face to Bushing length as bushing face against the plate. " +
    "The other face comes next.");
  // One end bound: Bind writes the face as that named end, and it is the last.
  assertEqual(picked(["to"], "to"),
    "Bind the selected face to Bushing length as plate far face, the last face " +
    "it needs.");
  assertEqual(picked([], null),
    "Choose which interface of Bushing length this face is, then press Bind.");
});

check("taskInstruction: no state prints the stored direction word -- swapping " +
  "which interface is which end swaps nothing but the names", () => {
  const swapped = { from: END_NAMES.to, to: END_NAMES.from };
  const states = [
    { needed: ["from", "to"] }, { needed: ["to"] }, { needed: [] },
    { needed: ["from", "to"], picked: true },
    { needed: ["from", "to"], picked: true, chosen: "from" },
    { needed: ["to"], picked: true, chosen: "to" },
    { needed: [], picked: true, chosen: "from" },
  ];
  const flip = (list) => list.map((d) => (d === "from" ? "to" : "from"));
  states.forEach((st, i) => {
    const one = AA.taskInstruction(Object.assign({ elementName: "Bushing length",
      names: END_NAMES }, st));
    const other = AA.taskInstruction({ elementName: "Bushing length", names: swapped,
      picked: st.picked, needed: flip(st.needed),
      chosen: st.chosen ? flip([st.chosen])[0] : undefined });
    if (one !== other) {
      throw new Error(`state #${i + 1} reads the stored word, not the interface: ` +
        JSON.stringify(one) + " vs " + JSON.stringify(other));
    }
    if (/\bfrom\b/i.test(one) || /\bto\b/i.test(one.replace(/ to Bushing length| to bind/g, ""))) {
      throw new Error(`state #${i + 1} prints a direction word: ${one}`);
    }
  });
});

check("planBindChoices: no default while both ends are open, the remaining end " +
  "preselected once one is bound, and the bound one shown as taken with its face", () => {
  const open = AA.planBindChoices({ record: null, names: END_NAMES });
  assertEqual(open.selected, null, "an untouched form has a default end");
  assertEqual(open.choices, AA.DIRECTIONS);
  assertEqual(open.ends.map((e) => e.name), [END_NAMES.from, END_NAMES.to]);
  assertEqual(AA.planBindChoices({ record: null, names: END_NAMES, chosen: "to" }).selected,
    "to", "the reader's choice was not kept");
  assertEqual(AA.planBindChoices({ record: null, names: END_NAMES, chosen: "sideways" }).selected,
    null, "a word outside the vocabulary was taken as a choice");
  const record = { bindings: [{ direction: "to",
    geometry_key: { source_step_sha256: "a".repeat(64), face_id: 110 } }] };
  const one = AA.planBindChoices({ record, names: END_NAMES, chosen: "to" });
  assertEqual(one.choices, ["from"], "a bound end is still offered as a choice");
  assertEqual(one.selected, "from", "the one end left was not preselected");
  assertEqual(one.ends[1].bound, { faceId: 110, sha256: "a".repeat(64) },
    "the bound end does not carry the face it has");
});

check("whichever interface is chosen, the event the form writes stores one of " +
  "AA.DIRECTIONS -- the names are what the form shows, never what it writes", () => {
  const choices = AA.planBindChoices({ record: null, names: END_NAMES }).choices;
  assertEqual(choices.length, 2);
  choices.forEach((chosen) => {
    const selected = AA.planBindChoices({ record: null, names: END_NAMES, chosen }).selected;
    const event = AA.buildBoundEvent({
      eventId: "e-" + chosen, seq: 1, createdAt: "2026-10-21T00:00:00Z",
      recordedBy: "annotate-app",
      stackKey: AA.topologyEdgeKey("t", "e"),
      geometryKey: { source_step_sha256: "a".repeat(64), face_id: 1 },
      direction: selected,
    });
    if (AA.DIRECTIONS.indexOf(event.direction) === -1 || event.direction !== chosen) {
      throw new Error("choosing " + chosen + " stored " + JSON.stringify(event.direction));
    }
  });
});

check("edgeEndNames: each end is its interface node's own name, keyed by the " +
  "stored word", () => {
  const topo = { nodes: [{ id: "a", name: "seat face" }, { id: "b" }],
    edges: [{ id: "e", from: "a", to: "b" }] };
  assertEqual(AA.edgeEndNames(topo, topo.edges[0]), { from: "seat face", to: "b" });
  assertEqual(AA.edgeEndNames(topo, null), {});
});

check("planBindLeader: drawn only between the picked face and the face bound at " +
  "the OTHER end -- never on a first bind, never from a face to itself", () => {
  const sha = "a".repeat(64);
  const pick = { sha256: sha, faceId: 113 };
  const firstBind = AA.planBindChoices({ record: null, names: END_NAMES, chosen: "from" });
  assertEqual(AA.planBindLeader({ pick, plan: firstBind }), null,
    "a leader was drawn with only one face to draw from");
  const record = { bindings: [{ direction: "to",
    geometry_key: { source_step_sha256: sha, face_id: 110 } }] };
  const second = AA.planBindChoices({ record, names: END_NAMES });
  assertEqual(AA.planBindLeader({ pick, plan: second }), {
    picked: { sha256: sha, faceId: 113, label: END_NAMES.from },
    bound: { sha256: sha, faceId: 110, label: END_NAMES.to },
  });
  assertEqual(AA.planBindLeader({ pick: { sha256: sha, faceId: 110 }, plan: second }), null,
    "a leader was drawn from the bound face to itself");
  assertEqual(AA.planBindLeader({ pick: null, plan: second }), null);
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
      AA.taskInstruction({ elementName: "Bushing length", picked: true,
        needed: ["to"], names: END_NAMES, chosen: "to" }),
      AA.taskInstruction({ elementName: "Bushing length", needed: ["to"],
        names: END_NAMES }),
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
  // `var(--rail-w, 260px)` is ONE column (the resizable rail's width).
  const columns = grid[1].replace(/var\([^)]*\)/g, "RAIL").trim().split(/\s+/);
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

// A band of quads that closes all the way round: S segments, 2S nodes, 2S
// triangles -- so triangles/nodes is exactly 1.0, the value an OPEN band sits
// BELOW. `radiusAt(k)` is the radius at row k, so a constant gives a closed
// cylinder band and a ramp a closed cone band. This is the shape the patch
// gate accepted until 2026-09-30, when the comparison was `>=`.
function closedBand(radiusAt, height, segments) {
  const verts = [];
  for (let i = 0; i < segments; i++) {
    const theta = (2 * Math.PI * i) / segments;
    for (let k = 0; k < 2; k++) {
      const r = radiusAt(k);
      verts.push([r * Math.cos(theta), r * Math.sin(theta), k * height]);
    }
  }
  const tris = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = i * 2 + 1;
    const c = ((i + 1) % segments) * 2, d = ((i + 1) % segments) * 2 + 1;
    tris.push([a, c, d]);
    tris.push([a, d, b]);
  }
  return { verts, tris };
}

// A single band of a sphere -- nodes in exactly TWO latitude rows, which is
// what OCC lays down for a narrow spherical band and what makes a sphere fit
// vacuous: two coaxial circles lie on one sphere whatever surface joins them.
// `phi0`/`phi1` are in degrees from the +Z pole.
function sphereBand(radius, phi0Deg, phi1Deg, segments) {
  const verts = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (Math.PI * i) / segments;
    for (const phiDeg of [phi0Deg, phi1Deg]) {
      const phi = (phiDeg * Math.PI) / 180;
      verts.push([radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)]);
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

check("SURFACE_CLASSES is the GENERATED set, the classifier answers nothing " +
  "else, and it is asked in the order the more constrained shape wins", () => {
  // Not a literal: the words come from tolerance_stack/feature_geometry.py
  // through apps/viewer/vocab.gen.js, so this reads the generated module
  // rather than restating the list a third time.
  assertEqual(AA.SURFACE_CLASSES, sandbox.TolstackVocab.annotate.list("SURFACE_CLASSES"),
    "the classifier's vocabulary is not the generated one");
  assertEqual(AA.FITTED_SURFACE_CLASSES, ["planar", "cylindrical", "spherical"],
    "the fit order moved -- a sphere asked before a cylinder answers for a bore, " +
    "because a band of quads lies on a sphere whatever shape it is");
  if (AA.FITTED_SURFACE_CLASSES.indexOf("other") !== -1) {
    throw new Error('"other" is what is LEFT, not something that is fitted');
  }
  const classes = classify([planeFace(5, 10, 3), CYL(3, 8, 360, 24), spherePatch(4, 6),
    revolvedFace((k) => 3 + k * 2, 2, 360, 24)]);
  classes.forEach((c) => {
    if (AA.SURFACE_CLASSES.indexOf(c.surface) === -1) {
      throw new Error(`classifyPartFaces answered "${c.surface}", which is not in SURFACE_CLASSES`);
    }
  });
  assertEqual(classes.map((c) => c.surface),
    ["planar", "cylindrical", "spherical", "other"],
    "each of the four classes was not answered by the shape built for it");
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

check("a spherical patch is SPHERICAL, and it recovers the CENTRE -- which is " +
  "the whole reason a joint wants one read", () => {
  const [sphere] = classify([spherePatch(5, 6)]);
  assertEqual(sphere.surface, "spherical", "a spherical patch classified as something else");
  if (Math.abs(sphere.radius - 5) > 1e-4) {
    throw new Error("radius read as " + sphere.radius + ", not 5");
  }
  // spherePatch is built about the origin, so the centre is known by
  // construction -- and a centre is the one thing a sphere has that a cylinder
  // and a plane do not.
  sphere.centre.forEach((c, i) => {
    if (Math.abs(c) > 1e-4) {
      throw new Error("the centre is off the origin: " + JSON.stringify(sphere.centre) +
        " (component " + i + ")");
    }
  });
});

check("a CLOSED band of quads is OTHER too -- it lands exactly ON the patch " +
  "threshold, which is why that comparison is strict", () => {
  // The case the gate was written to refuse and, until 2026-09-30, accepted:
  // an open band is two rows over S+1 stations and lands BELOW 1.0, a closed
  // band is two rows over S stations and lands exactly ON it. A `>=` there let
  // 139 faces store-wide answer "sphere", 18 of them fillet bands on the hub
  // offering 62-65 mm "ball" radii to a solver.
  const cone = closedBand((k) => 3 + k * 1.1547, 2, 24);
  const fit = AA.fitSphere(cone.verts);
  if (!fit || Math.abs(fit.r - 4.2891) > 1e-3) {
    throw new Error("the closed cone band did not fit a sphere: " + JSON.stringify(fit));
  }
  assertEqual(cone.tris.length / cone.verts.length, 1,
    "the fixture is not a closed band -- its triangles/nodes must be exactly 1");
  const [classified] = classify([cone]);
  assertEqual(classified.surface, "other", "a CLOSED band of quads answered sphere");
  if (classified.why.indexOf("one band of quads") === -1) {
    throw new Error("a closed band was refused for the wrong reason: " + classified.why);
  }
  // ...and three rows ARE a patch, at the same segment count, so the strict
  // comparison has not simply refused everything round.
  const patch = spherePatch(5, 3);
  if (classify([patch])[0].surface !== "spherical") {
    throw new Error("a three-row patch was refused along with the bands");
  }
});

check("a sphere read from ONE BAND of quads is OTHER, and says which refusal " +
  "it is -- two coaxial circles lie on a sphere whatever shape they bound", () => {
  // The measurement the whole ordering rests on: a cylinder band, a cone band
  // and a spherical band all fit a sphere to machine precision, because two
  // coaxial circles determine one exactly. So a band is refused on its SHAPE
  // (nodes in two rows), not on a residual -- no residual could tell them apart.
  const band = sphereBand(5.147, 50, 90, 13);
  const fit = AA.fitSphere(band.verts);
  if (Math.abs(fit.r - 5.147) > 1e-6) {
    throw new Error("the band's own sphere fit is not exact: r = " + fit.r);
  }
  const [classified] = classify([band]);
  assertEqual(classified.surface, "other", "a single band of quads answered sphere");
  if (classified.why.indexOf("one band of quads") === -1) {
    throw new Error("a band was refused for the wrong reason: " + classified.why);
  }
  // ...and a CONE band, which is not a sphere at all, fits one just as well.
  const cone = revolvedFace((k) => 3 + k * 1.1547, 2, 180, 13);
  const coneFit = AA.fitSphere(cone.verts);
  if (!coneFit || Math.abs(coneFit.r - 4.2891) > 1e-3) {
    throw new Error("the cone band did not fit a sphere: " + JSON.stringify(coneFit));
  }
  assertEqual(classify([cone])[0].surface, "other", "a cone band classified as a sphere");
});

check("fitSphere recovers a sphere exactly, and refuses a plane rather than " +
  "guessing a centre somewhere behind it", () => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const phi = 0.3 + (i * 1.2) / 5, theta = (j * 2.4) / 5;
      points.push([2 + 7 * Math.sin(phi) * Math.cos(theta),
        -3 + 7 * Math.sin(phi) * Math.sin(theta),
        11 + 7 * Math.cos(phi)]);
    }
  }
  const fit = AA.fitSphere(points);
  if (Math.abs(fit.r - 7) > 1e-6 || Math.abs(fit.centre[0] - 2) > 1e-6 ||
      Math.abs(fit.centre[1] + 3) > 1e-6 || Math.abs(fit.centre[2] - 11) > 1e-6) {
    throw new Error("sphere fit off: " + JSON.stringify(fit));
  }
  const flat = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) flat.push([i, j, 5]);
  if (AA.fitSphere(flat) !== null) {
    throw new Error("a flat point set was fitted to a sphere");
  }
  if (AA.fitSphere([[0, 0, 0], [1, 0, 0], [0, 1, 0]]) !== null) {
    throw new Error("three points were fitted to a sphere");
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
  // "spherical bearing ball" READS as a sphere since 2026-09-30 -- but only
  // because nothing more specific answered first. The rows below are the live
  // interface names that contain "spherical" and are NOT spheres (two flat
  // faces, a width and a bore), and the rule ORDER is what keeps them right.
  assertEqual(AA.requiredSurfaceClass("spherical bearing ball").surface, "spherical",
    "a ball did not read as a ball");
  [["plain bushing face against the pitch-link eye (spherical bearing ball)", "planar"],
    ["spherical bearing face against the flanged bushing's flange", "planar"],
    ["spherical bearing width", "planar"],
    ["pitch-link spherical bearing housing bore", "cylindrical"],
  ].forEach(([text, want]) => {
    const got = AA.requiredSurfaceClass(text);
    if (!got || got.surface !== want) {
      throw new Error(`"${text}" read as ${got ? got.surface : "nothing"}, wanted ` +
        `${want} -- the rule ORDER decides this, and it moved`);
    }
  });
  // "centre" must not fire on "centreline", which three live interfaces carry.
  assertEqual(AA.requiredSurfaceClass("cotter-pin hole centreline").surface, "cylindrical",
    "a centreline read as a centre");
});

check("requiredSurfaceClass reads tests/fixtures/suggestion_rule_cases.json as " +
  "Python's required_surface_class does -- one list of answers, two readers", () => {
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "tests",
    "fixtures", "suggestion_rule_cases.json"), "utf8")).cases;
  cases.forEach(([text, want]) => {
    const got = AA.requiredSurfaceClass(text);
    if ((got ? got.surface : null) !== want) {
      throw new Error(`"${text}" read as ${got ? got.surface : "nothing"}, wanted ${want}`);
    }
  });
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
    "the engine compares faces in one part's own frame, so it cannot have one");
  assertEqual(AA.NARROWING_RELATIONS.same_part_relation.spherical, null,
    "same_part_relation claims a relation between two centres on ONE part -- " +
    "a binding names the part's face at every position, so its two centres " +
    "are one face");
});

check("every null in the relations table carries a reason, and no reason " +
  "stands for a relation that exists", () => {
  // A null is a DECISION, and a decision a reader is shown has a sentence
  // attached. Paired in both directions, because the failure that matters is
  // the quiet one: a null added with no reason prints `undefined` where a
  // sentence should be, which a reader reads as the app being broken rather
  // than as the narrowing being impossible.
  // Over the classes a RULE can ask for, which is the set the planner can
  // actually reach a null of. `other` is in the table because it is keyed by
  // the whole generated vocabulary (a key omitted because it "cannot happen" is
  // how the next class arrives silently) and it is null in both stages, but no
  // rule may name it -- the check two above refuses a rule row that does -- so
  // the planner never asks, and requiring a reader-facing sentence for it would
  // be requiring copy nobody can be shown.
  const askable = AA.SUGGESTION_RULES.map((rule) => rule.surface);
  const missing = [];
  const spare = [];
  Object.keys(AA.NARROWING_RELATIONS).forEach((stage) => {
    const perClass = AA.NARROWING_RELATIONS[stage];
    const reasons = AA.NO_RELATION_REASONS[stage] || {};
    AA.SURFACE_CLASSES.forEach((surface) => {
      if (!Object.prototype.hasOwnProperty.call(perClass, surface)) {
        throw new Error(`stage "${stage}" has no entry for "${surface}" -- the ` +
          "table is keyed by the generated vocabulary and should not be able to");
      }
      const hasReason = typeof reasons[surface] === "string" && reasons[surface].length;
      const reachable = askable.indexOf(surface) !== -1;
      if (perClass[surface] === null && reachable && !hasReason) {
        missing.push(`${stage}.${surface}`);
      }
      if (perClass[surface] !== null && hasReason) spare.push(`${stage}.${surface}`);
    });
  });
  Object.keys(AA.NO_RELATION_REASONS).forEach((stage) => {
    if (!AA.NARROWING_RELATIONS[stage]) spare.push(stage);
  });
  assertEqual(missing, [], "a null in NARROWING_RELATIONS with no reason to print");
  assertEqual(spare, [], "a reason written for a narrowing that is not refused");
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

check("a joint centre suggests only the BALL faces, and a second centre on " +
  "the same part narrows nothing and says why", () => {
  const sha = SUGGEST_MESHES[0].sha256;
  const classes = fixtureClasses();
  classes[sha][0] = { faceId: 0, surface: "spherical", centre: [0, 0, 0], radius: 5 };
  classes[sha][1] = { faceId: 1, surface: "spherical", centre: [0, 0, 20], radius: 5 };
  // The same topology ID the fixture binding helper writes, so a binding made
  // with boundAt is actually found for this edge.
  const sphereTopology = {
    id: SUGGEST_TOPOLOGY.id, parts: [{ id: "plate_part" }],
    nodes: [{ id: "lower", name: "link lower spherical-bearing centre" },
      { id: "upper", name: "link upper spherical-bearing centre" }],
    edges: [{ id: "link_length", part: "plate_part", from: "lower", to: "upper",
      name: "link length between centres" }],
  };
  const plan = AA.planFaceSuggestions({
    topology: sphereTopology, edgeId: "link_length", identityProjection: null,
    meshes: SUGGEST_MESHES, aliases: [], faceClasses: classes,
  });
  assertEqual(plan.faces.map((f) => f.faceId).sort(), [0, 1],
    "a joint centre did not suggest the part's ball-shaped faces");
  plan.ends.forEach((end) => {
    assertEqual(end.surface, "spherical", "an end of a centre-to-centre dimension " +
      "did not ask for a ball-shaped face");
  });

  // ...and with the other end bound, on THIS part: the relation is refused,
  // the stage stays where it was, and the list is not narrowed by a guess.
  const bound = AA.planFaceSuggestions({
    topology: sphereTopology, edgeId: "link_length",
    identityProjection: boundAt("link_length", "from", sha, 0),
    meshes: SUGGEST_MESHES, aliases: [], faceClasses: classes,
    directions: ["to"],
  });
  const end = bound.ends[0];
  assertEqual(end.stage, "surface_class",
    "the same-part sphere case claimed a narrowing it cannot do");
  assertEqual(end.relation, null, "a relation was asserted between two centres " +
    "of one part drawn once");
  assertEqual(end.note, AA.NO_SAME_PART_SPHERE_RELATION,
    "the same-part sphere case did not say why it narrowed nothing");
  assertEqual(end.candidates, [1], "the candidate list was narrowed anyway");
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
  const sentences = [AA.NO_MATING_PLANE_RELATION, AA.NO_SAME_PART_SPHERE_RELATION,
    AA.SUGGEST_SETTING_LABEL, AA.SUGGEST_SETTING_HINT]
    .concat(AA.SURFACE_CLASSES.map((w) => AA.SURFACE_WORDS[w]))
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

check("describeSuggestions says WHICH face the narrowing compared against -- " +
  "its number and the interface it was bound as", () => {
  const names = AA.edgeEndNames(SUGGEST_TOPOLOGY, SUGGEST_TOPOLOGY.edges[0]);
  const identity = boundAt("plate_thickness", "from", SUGGEST_MESHES[0].sha256, 0);
  const text = AA.describeSuggestions(plan("plate_thickness", identity), names);
  const says = AA.NARROWING_STAGES[1].says;
  if (text.indexOf(says + " (face 0, bound as plate near face against the washer)") === -1) {
    throw new Error("the same-part stage does not name the face it compared against: " + text);
  }
  // Stage 1 compared against nothing, so it names nothing.
  if (/\(face /.test(AA.describeSuggestions(plan("plate_thickness", null), names))) {
    throw new Error("the surface-class stage claims a reference face it never had");
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

// --- contact suggestions (handoff an_interface_suggests_the_faces_that_touch)
//
// The rows and the words. Which faces touch is decided in Python
// (tolerance_stack/interface_contact.py, pinned value by value in
// tests/test_interface_contact.py); this half finds an element's rows in the
// projection and says them. The browser tier owns what is on screen.

const CONTACT_TOPOLOGY = {
  id: "t",
  nodes: [{ id: "n1" }, { id: "n2" }, { id: "n3" }, { id: "n4" }],
  edges: [
    { id: "joint", from: "n1", to: "n2" },
    { id: "length", from: "n2", to: "n3" },
    { id: "elsewhere", from: "n3", to: "n4" },
  ],
};

function contactRow(edge, from, to, extra) {
  return Object.assign({
    edge, name: edge + " name", pairing: "ball_in_seat", status: "ok",
    from: { node: from }, to: { node: to }, ambiguous_with: [],
    candidates: [{ rank: 1, relation: "contact",
      from: { sha256: "a", faces: [3, 4] }, to: { sha256: "b", faces: [9] },
      evidence: { seat: "spherical", centre_mm: 0 }, box: { min: [0, 0, 0], max: [1, 1, 1] } }],
  }, extra || {});
}

const CONTACT_DOC = { topologies: [{ id: "t", edges: [
  contactRow("joint", "n1", "n2"),
  contactRow("empty_joint", "n3", "n4", { status: "no_contact", candidates: [] }),
] }] };

check("contact rows: a gap edge gets its own row, an element beside it gets " +
  "the rows at its two ends, and a row with no candidate is never listed", () => {
  const own = AA.contactRowsFor(CONTACT_DOC, CONTACT_TOPOLOGY, "joint");
  assertEqual(own.map((r) => [r.row.edge, r.via === null]), [["joint", true]]);
  const beside = AA.contactRowsFor(CONTACT_DOC, CONTACT_TOPOLOGY, "length");
  assertEqual(beside.map((r) => r.row.edge), ["joint"],
    "a length ending at a joint did not find that joint's touching faces");
  if (beside[0].via === null) throw new Error("a neighbour's row was not marked as one");
  // n3-n4's joint has no candidate: an element ending there lists nothing,
  // and neither does that joint itself, though `length` touches it AND the
  // joint that does have a pair.
  assertEqual(AA.contactRowsFor(CONTACT_DOC, CONTACT_TOPOLOGY, "elsewhere"), []);
  const emptyJoint = { id: "t", nodes: CONTACT_TOPOLOGY.nodes,
    edges: CONTACT_TOPOLOGY.edges.concat([{ id: "empty_joint", from: "n2", to: "n4" }]) };
  assertEqual(AA.contactRowsFor(CONTACT_DOC, emptyJoint, "empty_joint"), [],
    "a gap edge with nothing touching listed a neighbour's pair as its own");
  assertEqual(AA.contactRowsFor(null, CONTACT_TOPOLOGY, "joint"), []);
  assertEqual(AA.contactRowsFor(CONTACT_DOC, { id: "other", edges: [] }, "joint"), []);
  // Both features' faces are what gets coloured, each on its own part.
  assertEqual(AA.contactFaces(own[0].row.candidates[0]),
    [{ sha256: "a", faceId: 3 }, { sha256: "a", faceId: 4 }, { sha256: "b", faceId: 9 }]);
  assertEqual(AA.findContact(CONTACT_DOC, "t", "joint", 1).candidate.rank, 1);
  assertEqual(AA.findContact(CONTACT_DOC, "t", "joint", 2), null);
});

check("contact words: each pairing, relation and seat says what it is in " +
  "everyday words, with its evidence rounded for reading", () => {
  const say = (pairing, relation, evidence) =>
    AA.describeContact(pairing, { relation, evidence });
  assertEqual(say("plane_on_plane", "contact",
    { gap_mm: 0.0169, overlap_mm2: 340.4, overlap_fraction: 0.9 }),
    "flat on flat, gap 0.017 mm, overlap 340 mm²");
  assertEqual(say("cylinder_in_cylinder", "contact",
    { clearance_mm: 0.003, axial_overlap_mm: 2.1995, axis_offset_mm: 0 }),
    "pin in bore, clearance 0.003 mm, 2.20 mm shared");
  assertEqual(say("cylinder_in_cylinder", "contact",
    { clearance_mm: -0.02, axial_overlap_mm: 7.157, axis_offset_mm: 0 }),
    "pin in bore, press fit 0.020 mm, 7.16 mm shared");
  assertEqual(say("cylinder_in_cylinder", "coaxial", { axis_offset_mm: 0.0123 }),
    "on one axis, 0.012 mm apart");
  assertEqual(say("ball_in_seat", "contact", { seat: "spherical", centre_mm: 0 }),
    "ball in its race, off by 0.000 mm");
  assertEqual(say("ball_in_seat", "contact", { seat: "cylindrical", centre_mm: 0.0501 }),
    "ball on a bore's axis, off by 0.050 mm");
  assertEqual(say("ball_in_seat", "contact", { seat: "planar", seat_gap_mm: -0.0186 }),
    "ball against a flat, gap -0.019 mm");
  [AA.CONTACT_HEADING, AA.CONTACT_HEADING_AT, AA.CONTACT_AMBIGUOUS].forEach((text, i) => {
    assertNoCommandOrPath(text, `contact sentence #${i + 1}`);
    if (/[a-z]_[a-z]/.test(text)) throw new Error("an underscored identifier: " + text);
  });
});

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
  // Four roles and four claims (the fourth, `contact`, since
  // an_interface_suggests_the_faces_that_touch): a colour added with no claim
  // behind it is the emphasis budget being spent without a decision.
  ["bound", "suggested", "picked", "contact"].forEach((role) => {
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

// --- sweep mode (handoff kinematic_sweep_animation) ------------------------
//
// Every number sweep mode puts on screen is computed in sweep.js, which has
// no DOM, no fetch and no three.js for exactly this reason. The browser half
// (scene.js's lines, spheres and anchored groups) is screenshot-verified --
// real click automation is not run on this machine, see this file's header --
// so the arithmetic under it is pinned here instead, value by value.

// A synthetic two-body artifact: ground, plus a body that rotates 90 degrees
// about +X between the two points while sliding 10 mm along +Z, and one
// distance link between them. Hand-written so every expected number below can
// be derived with a pen.
function sweepFixture(overrides) {
  const doc = {
    schema: "linkage-sweep/v1",
    run_id: "fixture-run",
    source: "sheet",
    frame: "poses are relative to the as-modelled pose",
    mechanism: { name: "fixture_mech", driver: { label: "actuator travel", unit: "mm" } },
    measures: { names: ["blade_pitch", "actuator_travel"],
      units: { blade_pitch: "deg", actuator_travel: "mm" } },
    bodies: [{ name: "base", ground: true, parts: ["hub"] },
      { name: "arm", ground: false, parts: ["pitch_arm"] }],
    links: [{ joint: "pitch_link", parts: ["pitch_link"] }],
    reference: { measure: "blade_pitch", values: [-7, 72] },
    points: [
      { index: 0, driver_value: 64.466, converged: true, residual_norm: 1e-25,
        measures: { blade_pitch: -6.4, actuator_travel: 64.466 },
        poses: { base: { translation: [0, 0, 0], rotvec: [0, 0, 0] },
          arm: { translation: [0, 0, 0], rotvec: [0, 0, 0] } },
        joints: { pitch_link: { point_a_world: [0, 0, 0], point_b_world: [0, 0, 100],
          axis_world: null } },
        links: { pitch_link: { translation: [0, 0, 0], rotvec: [0, 0, 0], length: 100,
          convention: "spin-free" } } },
      { index: 1, driver_value: 0, converged: true, residual_norm: 2e-25,
        measures: { blade_pitch: 72, actuator_travel: 0 },
        poses: { base: { translation: [0, 0, 0], rotvec: [0, 0, 0] },
          arm: { translation: [0, 0, 10], rotvec: [Math.PI / 2, 0, 0] } },
        joints: { pitch_link: { point_a_world: [0, 0, 0], point_b_world: [0, -100, 0],
          axis_world: null } },
        links: { pitch_link: { translation: [0, 0, 0], rotvec: [Math.PI / 2, 0, 0],
          length: 100, convention: "spin-free" } } },
    ],
  };
  return Object.assign(doc, overrides || {});
}

function assertClose(actual, expected, tol, msg) {
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error((msg || "not close") + ": got " + actual + ", expected " +
      expected + " +/- " + tol);
  }
}

function assertVecClose(actual, expected, tol, msg) {
  for (let i = 0; i < expected.length; i++) {
    assertClose(actual[i], expected[i], tol, (msg || "vector") + "[" + i + "]");
  }
}

check("sweep: the schema is read literally, and a v0 run is refused naming " +
  "what it found and why it cannot be animated", () => {
  const v0 = sweepFixture({ schema: "linkage-sweep/v0" });
  let message = null;
  try { AA.readSweepArtifact(v0); } catch (err) { message = err.message; }
  if (message === null) throw new Error("a v0 artifact was accepted");
  if (message.indexOf("linkage-sweep/v0") === -1) {
    throw new Error("the refusal does not name the schema it found: " + message);
  }
  if (message.indexOf(AA.SWEEP_SCHEMA) === -1) {
    throw new Error("the refusal does not name the schema it wanted: " + message);
  }
  // ...and v0's own reason, which is the one a reader needs: the file is a
  // real sweep, it just has no poses in it.
  if (message.indexOf("no body poses") === -1) {
    throw new Error("the v0 refusal does not say why v0 cannot be animated: " + message);
  }
  assertNoCommandOrPath(message, "the schema refusal");
  assertNothingBanned(message, "the schema refusal");

  // A file with no schema at all, and a non-document, each get their own
  // sentence rather than a TypeError out of the reader.
  let noSchema = null;
  try { AA.readSweepArtifact({ points: [] }); } catch (err) { noSchema = err.message; }
  if (!noSchema || noSchema.indexOf("no schema") === -1) {
    throw new Error("a schemaless file did not say so: " + noSchema);
  }
  let notADoc = null;
  try { AA.readSweepArtifact(null); } catch (err) { notADoc = err.message; }
  if (!notADoc) throw new Error("null was accepted as an artifact");
});

check("sweep: a v1 artifact is normalised, and the summary line carries the " +
  "source in words a reader can act on", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  assertEqual(art.runId, "fixture-run", "run id");
  assertEqual(art.source, "sheet", "source");
  assertEqual(art.points.length, 2, "point count");
  assertEqual(art.notConverged, 0, "converged count");
  assertEqual(art.bodies.length, 2, "bodies");
  const parts = AA.sweepSummaryParts(art);
  if (parts.indexOf("sheet") !== -1) {
    throw new Error("the summary renders the raw source token at the reader");
  }
  if (parts.indexOf(AA.SWEEP_SOURCE_WORDS.sheet) === -1) {
    throw new Error("the summary does not say where the geometry came from: " +
      parts.join(" | "));
  }
  assertNoCommandOrPath(parts.join(" "), "the sweep summary");
  assertNothingBanned(parts.join(" "), "the sweep summary");
  // Every source the vocabulary admits has words; a token with none would
  // render as itself, which is the drift this pairing exists to catch.
  for (const source of AA.SWEEP_SOURCES) {
    if (!AA.SWEEP_SOURCE_WORDS[source]) {
      throw new Error("source \"" + source + "\" has no reader-facing words");
    }
  }
  // A run with an unconverged point says so in the one line.
  const bad = sweepFixture();
  bad.points[0].converged = false;
  const warned = AA.sweepSummaryParts(AA.readSweepArtifact(bad));
  if (!warned.some((p) => p.indexOf("did not converge") !== -1)) {
    throw new Error("an unconverged point is not on the summary line: " + warned.join(" | "));
  }
});

check("sweep: interpolation is exact at both endpoints, and the midpoint of " +
  "a 90-degree rotation is 45 degrees", () => {
  const art = AA.readSweepArtifact(sweepFixture());

  const start = AA.sweepFrameAt(art, 0);
  assertVecClose(start.poses.arm.translation, [0, 0, 0], 1e-12, "start translation");
  assertVecClose(AA.quatToRotvec(start.poses.arm.quaternion), [0, 0, 0], 1e-12, "start rotation");
  assertEqual(start.nearerIndex, 0, "start nearer index");

  const end = AA.sweepFrameAt(art, 1);
  assertVecClose(end.poses.arm.translation, [0, 0, 10], 1e-12, "end translation");
  assertVecClose(AA.quatToRotvec(end.poses.arm.quaternion), [Math.PI / 2, 0, 0], 1e-12,
    "end rotation");
  assertEqual(end.nearerIndex, 1, "end nearer index");

  const mid = AA.sweepFrameAt(art, 0.5);
  assertVecClose(mid.poses.arm.translation, [0, 0, 5], 1e-12, "midpoint translation");
  const rv = AA.quatToRotvec(mid.poses.arm.quaternion);
  assertClose(rv[0] * 180 / Math.PI, 45, 1e-9, "midpoint rotation about X, in degrees");
  assertClose(rv[1], 0, 1e-12, "midpoint rotation leaked into Y");
  assertClose(rv[2], 0, 1e-12, "midpoint rotation leaked into Z");

  // Past both ends is clamped, not extrapolated -- a solver's output has no
  // frames outside its own sweep, and inventing one is this app's own version
  // of inventing a number.
  assertVecClose(AA.sweepFrameAt(art, -5).poses.arm.translation, [0, 0, 0], 1e-12, "clamped low");
  assertVecClose(AA.sweepFrameAt(art, 99).poses.arm.translation, [0, 0, 10], 1e-12, "clamped high");
});

check("sweep: the READOUTS do not interpolate -- they are the nearer point's " +
  "own solved numbers, carried with its index", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  const justPastStart = AA.sweepFrameAt(art, 0.4);
  assertEqual(justPastStart.nearerIndex, 0, "0.4 should round to point 0");
  const rows = AA.sweepReadouts(art, justPastStart);
  const pitch = rows.filter((r) => r.key === "blade_pitch")[0];
  assertEqual(pitch.value, -6.4, "blade pitch was interpolated instead of quoted");
  const justBeforeEnd = AA.sweepFrameAt(art, 0.6);
  assertEqual(justBeforeEnd.nearerIndex, 1, "0.6 should round to point 1");
  assertEqual(AA.sweepReadouts(art, justBeforeEnd).filter((r) => r.key === "blade_pitch")[0].value,
    72, "blade pitch at the other side of the midpoint");
});

check("sweep: the four verification numbers are all there, the reference " +
  "difference is a subtraction, and every label is derived from the " +
  "artifact's own measure name", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  const rows = AA.sweepReadouts(art, AA.sweepFrameAt(art, 0));
  const byKey = {};
  rows.forEach((r) => { byKey[r.key] = r; });
  for (const key of ["blade_pitch", "blade_pitch:reference", "blade_pitch:difference",
    "actuator_travel", "link:pitch_link", "residual_norm"]) {
    if (!byKey[key]) throw new Error("the readouts are missing " + key);
  }
  assertEqual(byKey["blade_pitch:reference"].value, -7, "the reference value");
  assertClose(byKey["blade_pitch:difference"].value, -6.4 - -7, 1e-12,
    "the difference is not solved minus reference");
  // |A - B| against the link's declared length, measured off the joint points
  // rather than copied from the artifact.
  assertClose(byKey["link:pitch_link"].value, 100, 1e-12, "the measured link length");
  assertEqual(byKey["link:pitch_link"].expected, 100, "the declared link length");

  // No underscore reaches a reader, and no label is a hand-written copy of a
  // measure name -- the derivation is the whole point.
  rows.forEach((r) => {
    if (/_/.test(r.label)) throw new Error("readout label renders an id: " + r.label);
    assertNoCommandOrPath(r.label, "a sweep readout label");
    assertNothingBanned(r.label, "a sweep readout label");
  });
  assertEqual(AA.measureLabel("some_new_measure"), "some new measure",
    "a measure this app has never seen does not render as an id");

  // A run with no reference block carries no reference rows at all, rather
  // than a row saying nothing.
  const noRefDoc = sweepFixture();
  delete noRefDoc.reference;
  const noRef = AA.readSweepArtifact(noRefDoc);
  const bare = AA.sweepReadouts(noRef, AA.sweepFrameAt(noRef, 0));
  if (bare.some((r) => /reference|difference/.test(r.key))) {
    throw new Error("a run with no reference still rendered reference rows");
  }
});

check("sweep: the scrubber maps to the driver both ways, is exact at both " +
  "ends, and is monotone down a DESCENDING sweep", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  const values = AA.sweepDriverValues(art);
  assertEqual(values, [64.466, 0], "driver values");

  assertClose(AA.driverToIndex(values, 64.466), 0, 1e-12, "the high end is index 0");
  assertClose(AA.driverToIndex(values, 0), 1, 1e-12, "the low end is the last index");
  assertClose(AA.driverToIndex(values, 32.233), 0.5, 1e-12, "the midpoint");
  assertClose(AA.indexToDriver(values, 0), 64.466, 1e-12, "index 0 -> mm");
  assertClose(AA.indexToDriver(values, 1), 0, 1e-12, "last index -> mm");
  assertClose(AA.indexToDriver(values, 0.25), 64.466 * 0.75, 1e-9, "a fractional index -> mm");

  // Round trip, and monotone: as the driver falls the index must only rise.
  let previous = -1;
  for (let step = 0; step <= 32; step++) {
    const mm = 64.466 * (1 - step / 32);
    const index = AA.driverToIndex(values, mm);
    if (index < previous) throw new Error("the index went backwards at " + mm + " mm");
    previous = index;
    assertClose(AA.indexToDriver(values, index), mm, 1e-9, "round trip at " + mm + " mm");
  }
  // Past either end clamps rather than extrapolating.
  assertEqual(AA.driverToIndex(values, 999), 0, "past the high end");
  assertEqual(AA.driverToIndex(values, -999), 1, "past the low end");

  // ...and the same holds for an ASCENDING driver, which neither function may
  // assume away. A three-point ramp, so there is an interior point to land on.
  const up = [0, 10, 20];
  assertClose(AA.driverToIndex(up, 0), 0, 1e-12, "ascending: low end");
  assertClose(AA.driverToIndex(up, 20), 2, 1e-12, "ascending: high end");
  assertClose(AA.driverToIndex(up, 15), 1.5, 1e-12, "ascending: interior");
  assertEqual(AA.driverToIndex(up, -1), 0, "ascending: past the low end");
  assertEqual(AA.driverToIndex(up, 99), 2, "ascending: past the high end");
});

check("sweep: pose composition is pose(t) o placement_world, against a " +
  "hand-computed matrix", () => {
  // A quarter turn about +X, then 10 mm along +Z:
  //   R = [[1,0,0],[0,0,-1],[0,1,0]],  t = (0,0,10)
  const pose = { translation: [0, 0, 10], rotvec: [Math.PI / 2, 0, 0] };
  // ...onto a mesh instance placed 5 mm along +Y with no rotation.
  const placement = [1, 0, 0, 0, 0, 1, 0, 5, 0, 0, 1, 0];
  const composed = AA.anchorPlacement(pose, placement);
  // By hand: pose o placement has the pose's rotation, and a translation of
  // R @ (0,5,0) + (0,0,10) = (0,0,5) + (0,0,10) = (0,0,15).
  assertVecClose(composed, [1, 0, 0, 0,
    0, 0, -1, 0,
    0, 1, 0, 15], 1e-12, "the composed 3x4");

  // The point check the composition is actually for: a mesh vertex at the
  // instance origin lands where the instance's own placement puts it, carried
  // by the pose. (0,0,0) local -> (0,5,0) as-modelled -> (0,0,15) now.
  assertVecClose(AA.applyPlacement(composed, [0, 0, 0]), [0, 0, 15], 1e-12,
    "the instance origin");
  // ...and a vertex 1 mm along local +Y: (0,6,0) as-modelled -> (0,0,16).
  assertVecClose(AA.applyPlacement(composed, [0, 1, 0]), [0, 0, 16], 1e-12,
    "a vertex 1 mm along local +Y");

  // An identity pose leaves the instance exactly where provenance.json put it
  // -- the as-modelled frame, which is the frame the whole rest of this app
  // is about.
  const unmoved = AA.anchorPlacement({ translation: [0, 0, 0], rotvec: [0, 0, 0] }, placement);
  assertVecClose(unmoved, placement, 1e-15, "an identity pose moved the instance");

  // Order matters, and this is the check that it is the right way round:
  // placement o pose would leave the 5 mm in Y, not carry it into Z.
  const wrongWayRound = AA.composePlacement(placement, AA.poseToPlacement(pose));
  if (Math.abs(wrongWayRound[7] - composed[7]) < 1e-9) {
    throw new Error("composition is symmetric here, so this fixture cannot tell the order apart");
  }
});

check("sweep: which occurrence a body is, is decided by distance -- nearest " +
  "wins, a tie refuses, and too far refuses", () => {
  const target = [10, 0, 0];
  const candidates = [
    { instance_name: "215071-001.1", points: [[10.0004, 0, 0], [200, 0, 0]] },
    { instance_name: "215071-001.2", points: [[110, 0, 0]] },
    { instance_name: "215071-001.3", points: [[-90, 0, 0]] },
  ];
  const won = AA.chooseSweepInstance(candidates, target);
  assertEqual(won.refused, false, "the nearest occurrence was refused");
  assertEqual(won.chosen, "215071-001.1", "the wrong occurrence won");
  assertClose(won.residual, 0.0004, 1e-9, "the reported residual");
  assertEqual(won.runnerUp.instance_name, "215071-001.2", "the runner-up");

  // A tie: two occurrences the same distance away. Nothing is chosen, and the
  // reason says what happened rather than naming a winner at random.
  const tied = AA.chooseSweepInstance([
    { instance_name: "a", points: [[10.1, 0, 0]] },
    { instance_name: "b", points: [[9.9, 0, 0]] },
  ], target);
  assertEqual(tied.refused, true, "a tie was resolved anyway");
  assertEqual(tied.chosen, null, "a tie named a winner");
  if (tied.reason.indexOf("same distance") === -1) {
    throw new Error("the tie refusal does not say it is a tie: " + tied.reason);
  }

  // Too far: the nearest is 2 mm out, past the 1 mm this surface accepts.
  const far = AA.chooseSweepInstance([{ instance_name: "a", points: [[12, 0, 0]] }], target);
  assertEqual(far.refused, true, "a 2 mm miss was accepted");
  if (far.reason.indexOf("2.000") === -1) {
    throw new Error("the distance refusal does not quote the distance: " + far.reason);
  }
  // ...and 0.999 mm, just inside, is not refused -- the threshold is a
  // threshold and not a vibe.
  assertEqual(AA.chooseSweepInstance([{ instance_name: "a", points: [[10.999, 0, 0]] }],
    target).refused, false, "a miss just inside the limit was refused");

  // Nothing to match against at all is its own refusal, not a crash.
  const nothing = AA.chooseSweepInstance([], target);
  assertEqual(nothing.refused, true, "an empty candidate list was not refused");
  [won, tied, far, nothing].forEach((r) => {
    if (r.reason) {
      assertNoCommandOrPath(r.reason, "an instance-choice refusal");
      assertNothingBanned(r.reason, "an instance-choice refusal");
    }
  });
});

check("sweep: playback advances, loops, ping-pongs and stops at the end", () => {
  const count = 81; // 80 intervals, so a second at 1x covers 24 of them
  const base = { index: 0, playing: true, speed: 1, loop: "off", direction: 1 };
  // A tenth of a second, so even 4x stays well inside the sweep and these
  // three are measuring the speed rather than the end-of-sweep behaviour
  // (which is what the loop-mode checks below are for).
  const tick = 0.1;
  assertClose(AA.sweepAdvance(base, tick, count).index,
    AA.SWEEP_POINTS_PER_SECOND * tick, 1e-12, "a tenth of a second at 1x");
  assertClose(AA.sweepAdvance(Object.assign({}, base, { speed: 4 }), tick, count).index,
    AA.SWEEP_POINTS_PER_SECOND * 4 * tick, 1e-12, "a tenth of a second at 4x");
  assertClose(AA.sweepAdvance(Object.assign({}, base, { speed: 0.25 }), tick, count).index,
    AA.SWEEP_POINTS_PER_SECOND * 0.25 * tick, 1e-12, "a tenth of a second at 0.25x");
  // Speed is a multiplier, and 4x covers exactly sixteen times what 0.25x does.
  assertClose(AA.sweepAdvance(Object.assign({}, base, { speed: 4 }), tick, count).index,
    16 * AA.sweepAdvance(Object.assign({}, base, { speed: 0.25 }), tick, count).index,
    1e-12, "the speeds are not a multiplier on one clock");

  // Paused is paused, whatever the clock does.
  assertEqual(AA.sweepAdvance(Object.assign({}, base, { playing: false }), 10, count).index, 0,
    "a paused sweep moved");

  // loop off: stops ON the last point and clears `playing`, so the button
  // flips back by itself rather than lying.
  const ran = AA.sweepAdvance(Object.assign({}, base, { index: 79.5 }), 1, count);
  assertEqual(ran.index, count - 1, "loop off did not stop on the last point");
  assertEqual(ran.playing, false, "loop off kept playing past the end");

  // loop on: wraps round, still playing.
  const wrapped = AA.sweepAdvance(Object.assign({}, base, { index: 79.5, loop: "on" }), 1, count);
  assertEqual(wrapped.playing, true, "loop on stopped");
  if (!(wrapped.index >= 0 && wrapped.index < count - 1)) {
    throw new Error("loop on left the index outside the sweep: " + wrapped.index);
  }

  // ping-pong: reverses, and the overshoot is reflected rather than dropped.
  const bounced = AA.sweepAdvance(
    Object.assign({}, base, { index: 79.5, loop: "pingpong" }), 1, count);
  assertEqual(bounced.direction, -1, "ping-pong did not reverse");
  assertEqual(bounced.playing, true, "ping-pong stopped");
  assertClose(bounced.index, (count - 1) - ((79.5 + 24) - (count - 1)), 1e-12,
    "ping-pong dropped the overshoot instead of reflecting it");
  // ...and back off the bottom end too.
  const bouncedBack = AA.sweepAdvance(
    { index: 0.5, playing: true, speed: 1, loop: "pingpong", direction: -1 }, 1, count);
  assertEqual(bouncedBack.direction, 1, "ping-pong did not reverse at the low end");
  if (bouncedBack.index < 0) throw new Error("ping-pong left the index below zero");

  // Whole-point stepping, clamped -- the arrow keys and reduced motion.
  assertEqual(AA.sweepStepIndex(3.4, 1, count), 4, "step forward from a fractional index");
  assertEqual(AA.sweepStepIndex(3.6, -1, count), 3, "step back from a fractional index");
  assertEqual(AA.sweepStepIndex(0, -1, count), 0, "step back off the start");
  assertEqual(AA.sweepStepIndex(count - 1, 1, count), count - 1, "step forward off the end");
});

check("sweep: the frame rule -- the as-modelled pose is recognised, and any " +
  "moved body turns picking off", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  // This fixture's point 0 is the identity pose for every body.
  if (!AA.sweepIsAsModelled(AA.sweepFrameAt(art, 0))) {
    throw new Error("the identity frame was not read as the as-modelled one");
  }
  if (AA.sweepIsAsModelled(AA.sweepFrameAt(art, 1))) {
    throw new Error("a rotated, translated frame was read as the as-modelled one");
  }
  // A hair off identity is still off: the artifact writes the as-modelled
  // point's poses as exact identity, so there is no tolerance to spend here.
  if (AA.sweepIsAsModelled(AA.sweepFrameAt(art, 1e-6))) {
    throw new Error("a frame a millionth of the way in was read as as-modelled");
  }
  assertNoCommandOrPath(AA.sweepGateWords(art, AA.sweepAsModelledIndex(art)), "the picking-disabled reason");
  assertNothingBanned(AA.sweepGateWords(art, AA.sweepAsModelledIndex(art)), "the picking-disabled reason");
});

check("sweep: the gate line says WHERE the as-modelled frame is, once per run, " +
  "and says so plainly when no frame qualifies", () => {
  const art = AA.readSweepArtifact(sweepFixture());
  assertEqual(AA.sweepAsModelledIndex(art), 0, "the fixture's identity frame");
  const words = AA.sweepGateWords(art, 0);
  if (words.indexOf("frame 1 of 2") === -1) throw new Error("no frame position in: " + words);
  // The run whose as-modelled pose is the LAST frame (the published P2's shape).
  const doc = sweepFixture();
  doc.points.reverse();
  const last = AA.readSweepArtifact(doc);
  assertEqual(AA.sweepAsModelledIndex(last), 1, "an as-modelled frame at the end");
  if (AA.sweepGateWords(last, 1).indexOf("frame 2 of 2") === -1) {
    throw new Error("the end frame is not named: " + AA.sweepGateWords(last, 1));
  }
  if (AA.sweepGateWords(last, 1).indexOf("start") !== -1) {
    throw new Error("the gate line still sends the reader to the start");
  }
  assertEqual(AA.sweepAsModelledIndex(Object.assign({}, art, { points: [art.points[1]] })),
    null, "no frame qualifies");
  assertNothingBanned(AA.sweepGateWords(art, null), "the no-frame gate line");
});

check("sweep: the topology a run is about is read off its feature joins, and " +
  "absent when it has none", () => {
  const doc = sweepFixture();
  assertEqual(AA.readSweepArtifact(doc).topologyId, null, "a run with no features");
  doc.geometry = { features: [
    { label: "driver", topology: null },
    { label: "a", topology: "vpa_pitch_linkage" },
    { label: "b", topology: "vpa_pitch_linkage" },
  ] };
  assertEqual(AA.readSweepArtifact(doc).topologyId, "vpa_pitch_linkage", "the named one");
});

check("rail: the width clamps to the minimum and to half the window, and an " +
  "unreadable store is the default", () => {
  assertEqual(AA.clampRailWidth(50, 1200), AA.RAIL_WIDTH_MIN, "below the minimum");
  assertEqual(AA.clampRailWidth(5000, 1200), 600, "past half the window");
  assertEqual(AA.clampRailWidth("abc", 1200), AA.RAIL_WIDTH_DEFAULT, "not a number");
  assertEqual(AA.clampRailWidth(null, 1200), AA.RAIL_WIDTH_DEFAULT, "absent");
  assertEqual(AA.clampRailWidth(null, 300), AA.RAIL_WIDTH_MIN, "a window narrower than the default");
  const store = { data: {}, getItem(k) { return this.data[k] === undefined ? null : this.data[k]; },
    setItem(k, v) { this.data[k] = v; } };
  AA.writeStoredRailWidth(store, 333.4);
  assertEqual(AA.readStoredRailWidth(store, 1200), 333, "a stored width comes back");
  assertEqual(AA.readStoredRailWidth(null, 1200), AA.RAIL_WIDTH_DEFAULT, "no store");
  const throwing = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assertEqual(AA.readStoredRailWidth(throwing, 1200), AA.RAIL_WIDTH_DEFAULT, "a store that throws");
  AA.writeStoredRailWidth(throwing, 300); // must not throw
});

check("parts: a row reads `<number> <name>`, the id is on the hover, and a number " +
  "with no name shows alone and says so", () => {
  const names = { names: {
    "214698-002": { name: "GAS SPRING PISTON HEAD, PROPELLER, UPR", source: "drawing: x" },
    "215735": { name: "PITCH PLATE, PROPELLER", source: "drawing: y" },
  } };
  const sha = "a".repeat(64);
  const named = AA.partRowWords({ label: "214698-002 (extracted from 217755-001 A.1 ...stp)", sha256: sha }, names);
  assertEqual(named.text, "214698-002 gas spring piston head, propeller, upr", "the row");
  if (named.title.indexOf(sha.slice(0, 12)) === -1) throw new Error("the id is not on the hover");
  if (named.text.indexOf(sha.slice(0, 12)) !== -1) throw new Error("the id is in the row");
  if (named.title.indexOf("extracted from") === -1) throw new Error("the full label is not on the hover");
  assertEqual(AA.partRowWords({ label: "215735-001 (extracted ...)", sha256: sha }, names).text,
    "215735-001 pitch plate, propeller", "a dash number under a bare drawing number");
  const bare = AA.partRowWords({ label: "217970-001 (extracted ...)", sha256: sha }, names);
  assertEqual(bare.text, "217970-001", "no name on file");
  if (bare.title.indexOf(AA.PARTS_COPY.noName) === -1) throw new Error("no 'no name on file' on hover");
  assertEqual(AA.partRowWords({ label: "217970-001 (x)", sha256: sha }, null).text, "217970-001",
    "an absent projection");
  assertEqual(AA.partRowWords({ label: "M1 blade, clean OML (single solid)", sha256: sha }, names).text,
    "M1 blade, clean OML (single solid)", "a label with no number");
  assertEqual(AA.partNumberOf("216332-001_41 (extracted ...)"), "216332-001", "a suffixed instance");
  assertEqual(AA.partNumberOf("NAS6404U13D (extracted ...)"), null, "a fastener");
});

check("rail: a studyless topology's head says how many interfaces it lists", () => {
  assertEqual(AA.studylessHead(29), "all 29 interfaces \u2014 no study scopes them", "plural");
  assertEqual(AA.studylessHead(1), "all 1 interface \u2014 no study scopes them", "singular");
});

check("sweep: every verb argument is parsed here, and a bad one answers with " +
  "the set it had to be in", () => {
  assertEqual(AA.parseSweepSpeed("2"), 2, "a bare number");
  assertEqual(AA.parseSweepSpeed("0.25x"), 0.25, "a trailing x");
  assertEqual(AA.parseSweepSpeed("4X"), 4, "a trailing capital X");
  let speedErr = null;
  try { AA.parseSweepSpeed("3"); } catch (err) { speedErr = err.message; }
  if (!speedErr || AA.SWEEP_SPEEDS.some((s) => speedErr.indexOf(String(s)) === -1)) {
    throw new Error("a bad speed does not list the speeds: " + speedErr);
  }

  assertEqual(AA.parseSweepLoop("pingpong"), "pingpong", "ping-pong");
  assertEqual(AA.parseSweepLoop("ON"), "on", "case");
  let loopErr = null;
  try { AA.parseSweepLoop("bounce"); } catch (err) { loopErr = err.message; }
  if (!loopErr || loopErr.indexOf("pingpong") === -1) {
    throw new Error("a bad loop mode does not list the modes: " + loopErr);
  }

  const values = [64.466, 32.233, 0];
  assertEqual(AA.parseSweepSeek("#1", values), 1, "seek by index");
  assertEqual(AA.parseSweepSeek("#99", values), 2, "seek by index, clamped");
  assertClose(AA.parseSweepSeek("32.233", values), 1, 1e-12, "seek by driver value");
  let seekErr = null;
  try { AA.parseSweepSeek("", values); } catch (err) { seekErr = err.message; }
  if (!seekErr) throw new Error("an empty seek was accepted");

  assertEqual(AA.parseSweepLayer("trail"), "trail", "a layer name");
  let layerErr = null;
  try { AA.parseSweepLayer("wireframe"); } catch (err) { layerErr = err.message; }
  if (!layerErr || AA.SWEEP_LAYERS.some((l) => layerErr.indexOf(l) === -1)) {
    throw new Error("a bad layer does not list the layers: " + layerErr);
  }
  // Every layer the vocabulary admits has a default; a layer with none would
  // render as undefined on the first paint.
  for (const layer of AA.SWEEP_LAYERS) {
    if (typeof AA.SWEEP_DEFAULT_LAYERS[layer] !== "boolean") {
      throw new Error("layer \"" + layer + "\" has no default");
    }
  }
});

check("sweep: a feature is a point or an AXIS, and an axis is measured " +
  "perpendicular -- which is the difference between placing the pitch arm " +
  "and refusing it", () => {
  // A ball centre: the plain distance, and nothing clever.
  assertClose(AA.sweepFeatureDistance({ p: [0, 0, 0] }, [3, 4, 0]), 5, 1e-12, "a point feature");
  assertClose(AA.sweepFeatureDistance([0, 0, 0], [3, 4, 0]), 5, 1e-12,
    "a bare [x,y,z] is read as a point feature");

  // A bore along +Z through the origin: a target 5 mm off the axis is 5 mm
  // away however far along the axis it sits. That is the whole claim -- a
  // bore locates a joint in two degrees of freedom and says nothing about
  // the third, and the fitted axis point sits at the bore's mid-length
  // rather than at the joint.
  const bore = { p: [0, 0, 0], d: [0, 0, 1] };
  assertClose(AA.sweepFeatureDistance(bore, [5, 0, 0]), 5, 1e-12, "beside the axis");
  assertClose(AA.sweepFeatureDistance(bore, [5, 0, 1000]), 5, 1e-12, "beside it, far along");
  assertClose(AA.sweepFeatureDistance(bore, [0, 0, 1000]), 0, 1e-12, "on the axis, far along");
  // A point measurement of that same pair would have been 1000.
  if (AA.sweepFeatureDistance({ p: bore.p }, [0, 0, 1000]) < 999) {
    throw new Error("the point reading of an on-axis target is not the distance along it");
  }
  // An un-normalised direction is fine, and a zero one degrades to a point.
  assertClose(AA.sweepFeatureDistance({ p: [0, 0, 0], d: [0, 0, 7] }, [5, 0, 3]), 5, 1e-12,
    "an un-normalised axis");
  assertClose(AA.sweepFeatureDistance({ p: [0, 0, 0], d: [0, 0, 0] }, [3, 4, 0]), 5, 1e-12,
    "a zero-length axis is a point");

  // Placing a feature carries the POINT through the whole placement and the
  // DIRECTION through the rotation only.
  const quarterTurnAboutX = [1, 0, 0, 10, 0, 0, -1, 20, 0, 1, 0, 30];
  const placed = AA.placeSweepFeature(quarterTurnAboutX, bore);
  assertVecClose(placed.p, [10, 20, 30], 1e-12, "the placed axis point");
  assertVecClose(placed.d, [0, -1, 0], 1e-12, "the placed axis direction");
  const placedPoint = AA.placeSweepFeature(quarterTurnAboutX, { p: [0, 0, 0] });
  if (placedPoint.d !== undefined) throw new Error("a point feature grew a direction");

  // ...and the choice reads both kinds. A bore 4.57 mm along its own axis
  // from the solved joint point -- the real pitch arm's own number -- is
  // accepted as an axis and refused as a point.
  const alongTheAxis = [{ instance_name: "arm", key: "arm",
    points: [{ p: [0, 0, 4.57], d: [0, 0, 1] }] }];
  assertEqual(AA.chooseSweepInstance(alongTheAxis, [0, 0, 0]).refused, false,
    "an axis 4.57 mm along itself from the target was refused");
  const asAPoint = [{ instance_name: "arm", key: "arm", points: [{ p: [0, 0, 4.57] }] }];
  assertEqual(AA.chooseSweepInstance(asAPoint, [0, 0, 0]).refused, true,
    "the same offset read as a point was accepted");
});

check("sweep: which occurrences are even candidates is EXACT -- the mesh's " +
  "own, the ones sharing a slot name, and the ones named for its product", () => {
  const own = [
    { instance_name: "213862-002.2", key: "a/213862-002.2" },
    { instance_name: "213862-002.3", key: "a/213862-002.3" },
  ];
  const all = own.concat([
    // The INSTRUMENTED variant at blade 1's slot: a different product, named
    // for the design part. This is the row the whole rule exists for.
    { instance_name: "213862-002.1", key: "a/213862-002.1" },
    // A different part's occurrence INSIDE one of ours -- the pitch link's
    // own bearings. It must NOT be a candidate for the link: its placement
    // also puts a feature on the joint, and it tied with the right answer
    // until this rule narrowed the set.
    { instance_name: "MS14101-3.1", key: "a/213862-002.1/MS14101-3.1" },
    { instance_name: "NAS6403U11D.1", key: "a/NAS6403U11D.1" },
  ]);
  const chosen = AA.sweepCandidateOccurrences(own, all, "213862-002");
  assertEqual(chosen.map((o) => o.key).sort(),
    ["a/213862-002.1", "a/213862-002.2", "a/213862-002.3"],
    "the candidate set");

  // The OTHER half of the rule: three installed blade geometries all record
  // the same `instance_name` and differ only in path, so a design mesh whose
  // own instance is blade 2's still has blade 1's slot in the running.
  const blades = AA.sweepCandidateOccurrences(
    [{ instance_name: "211587-001.3", key: "x/37.2/211587-001.3" }],
    [{ instance_name: "211587-001.3", key: "x/37.1/211587-001.3" },
      { instance_name: "211587-001.3", key: "x/37.3/211587-001.3" },
      { instance_name: "215071-001.2", key: "x/37.1/215071-001.2" }],
    "216332-001_36");
  assertEqual(blades.length, 3, "all three blade slots are candidates");
  if (blades.some((o) => o.instance_name === "215071-001.2")) {
    throw new Error("a different part's occurrence became a blade candidate");
  }
  // Nothing in the store, and no product name, are both just the own set.
  assertEqual(AA.sweepCandidateOccurrences(own, [], null).length, 2, "no other occurrences");
  assertEqual(AA.sweepCandidateOccurrences([], all, null).length, 0, "no own occurrences");
});

check("sweep: an occurrence is NAMED by what tells it apart from the other " +
  "candidates, because `instance_name` does not", () => {
  // The five pitch arms: one name, five paths, differing three segments from
  // the end. A fixed tail of two would have said the same thing for all five.
  const arms = [1, 2, 3, 4, 5].map(
    (n) => `217755-001/prd-e-03478612.1/prd-e-03372837.${n}/prd-e-03262343.1/215071-001.2`);
  const label = AA.sweepOccurrenceLabel(arms[0], arms);
  assertEqual(label, "prd-e-03372837.1 / prd-e-03262343.1 / 215071-001.2",
    "the arm's distinguishing label");
  for (const other of arms.slice(1)) {
    if (AA.sweepOccurrenceLabel(other, arms) === label) {
      throw new Error("two of the five pitch arms label identically");
    }
  }
  // The pitch links differ in the LAST segment, so that is all the label is.
  const links = [1, 2, 3].map((n) => `217755-001/prd-e-03478612.1/213862-002.${n}`);
  assertEqual(AA.sweepOccurrenceLabel(links[0], links), "213862-002.1", "the link's label");
  // One candidate has nothing to be distinguished from: the last segment.
  assertEqual(AA.sweepOccurrenceLabel(links[0], [links[0]]), "213862-002.1", "a sole candidate");
  assertEqual(AA.sweepOccurrenceLabel(links[0], []), "213862-002.1", "no candidate list at all");
});

check("sweep: a joint's kind is DERIVED from what the artifact carries, and " +
  "both ends of every joint are assigned to a body by measurement", () => {
  // The ?mock=1 run, because this is the one claim that needs a CONSISTENT
  // mechanism rather than two hand-written points: a joint end rides a body
  // when that body's pose reproduces it, and `sweepFixture` above is a pair
  // of poses chosen to exercise interpolation, not a linkage that closes.
  const art = AA.readSweepArtifact(AA.FIXTURES.sweepRuns["synthetic-demo-sweep"]);
  // distance: linkage listed it under `links`. axial: it carries an axis.
  // point: it carries neither. No fourth word, and no joint-type vocabulary
  // for this app to keep in step with a solver in another repo.
  const kinds = {};
  AA.sweepStructure(art).joints.forEach((j) => { kinds[j.name] = j.kind; });
  assertEqual(kinds.pitch_link, "distance", "a distance constraint");
  assertEqual(kinds.blade_hinge, "axial", "a joint with an axis");
  for (const kind of Object.keys(kinds)) {
    if (AA.SWEEP_JOINT_KINDS.indexOf(kinds[kind]) === -1) {
      throw new Error(`joint kind "${kinds[kind]}" is outside the vocabulary`);
    }
  }
  for (const kind of AA.SWEEP_JOINT_KINDS) {
    if (!AA.SWEEP_JOINT_KIND_WORDS[kind]) throw new Error(`kind "${kind}" has no words`);
    assertNoCommandOrPath(AA.SWEEP_JOINT_KIND_WORDS[kind], "a joint-kind tooltip");
    assertNothingBanned(AA.SWEEP_JOINT_KIND_WORDS[kind], "a joint-kind tooltip");
  }
  // A joint with no axis that nothing lists as a link is the third kind.
  const spherical = sweepFixture();
  spherical.links = [];
  assertEqual(AA.sweepJointKind(AA.readSweepArtifact(spherical), "pitch_link",
    { axis_world: null }), "point", "a joint with neither");

  // BOTH ENDS, separately. The fixture's hinge sits at the origin and never
  // moves; its `a` end and the arm's rotation about the origin agree
  // trivially, so an a-end-only reading hands a ground joint to a moving
  // body -- which is what it did to the real run's pitch plate.
  const riders = AA.sweepBodyJoints(art);
  const ends = {};
  Object.keys(riders).forEach((body) => {
    riders[body].forEach((r) => { ends[r.joint + "." + r.end] = body; });
  });
  assertEqual(ends["blade_hinge.point_a_world"], "base",
    "a stationary joint end belongs to ground");
  assertEqual(ends["pitch_link.point_a_world"], "arm", "the crank tip rides the crank");
  assertEqual(ends["pitch_link.point_b_world"], "plate", "the slider end rides the slider");
  assertEqual(ends["plate_slide.point_b_world"], "plate", "the slide's moving end");
  // THE DEFECT THIS REPLACES, stated as a check: the hinge sits at the
  // origin and never moves, and the arm turns about the origin, so an
  // a-end-only reading hands a ground joint to a moving body. It did exactly
  // that to the real P1 run's pitch plate.
  if (ends["blade_hinge.point_a_world"] === "arm") {
    throw new Error("a stationary joint was handed to the body that turns through it");
  }

  // ...and the anchors that come out of it: ground at the assembly origin,
  // every other body at the centroid of the ends it actually carries.
  const bodies = {};
  AA.sweepStructure(art).bodies.forEach((b) => { bodies[b.name] = b; });
  void sweepFixture;
  assertVecClose(bodies.base.anchor, [0, 0, 0], 1e-12, "ground's triad is at the origin");
  if (!bodies.arm.anchor || !bodies.plate.anchor) {
    throw new Error("a moving body came out with no triad anchor");
  }
  if (bodies.arm.anchor[1] === bodies.plate.anchor[1] &&
      bodies.arm.anchor[2] === bodies.plate.anchor[2]) {
    throw new Error("two bodies' triads landed in the same place");
  }
});

check("sweep: the ?mock=1 run is a REAL mechanism, solved in closed form -- " +
  "so the surface demonstrates the verification rather than miming it", () => {
  const art = AA.readSweepArtifact(AA.FIXTURES.sweepRuns["synthetic-demo-sweep"]);
  assertEqual(art.points.length, 80, "point count");
  assertEqual(art.notConverged, 1, "one point is deliberately marked unconverged");

  // The driver is strictly monotone, which the scrubber depends on and which
  // an inline crank straddling its own top centre is NOT.
  const values = AA.sweepDriverValues(art);
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) {
      throw new Error(`the demo driver is not strictly decreasing at point ${i}`);
    }
  }

  // |A - B| really holds: the slider position is the root that keeps it.
  let worstLength = 0, worstPose = 0, worstBody = 0;
  const home = art.points[art.points.length - 1];
  const homeA = home.joints.pitch_link.point_a_world;
  const homeB = home.joints.pitch_link.point_b_world;
  for (const point of art.points) {
    const a = point.joints.pitch_link.point_a_world;
    const b = point.joints.pitch_link.point_b_world;
    worstLength = Math.max(worstLength, Math.abs(Math.sqrt(
      Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)
    ) - point.links.pitch_link.length));
    // The link's reconstructed pose maps the AS-MODELLED far end onto the
    // current one -- the artifact's own stated convention.
    const mappedB = AA.applyPlacement(AA.poseToPlacement(point.links.pitch_link), homeB);
    worstPose = Math.max(worstPose, Math.sqrt(
      Math.pow(mappedB[0] - b[0], 2) + Math.pow(mappedB[1] - b[1], 2) +
      Math.pow(mappedB[2] - b[2], 2)));
    // ...and the arm's pose maps the as-modelled near end onto the current one.
    const mappedA = AA.applyPlacement(AA.poseToPlacement(point.poses.arm), homeA);
    worstBody = Math.max(worstBody, Math.sqrt(
      Math.pow(mappedA[0] - a[0], 2) + Math.pow(mappedA[1] - a[1], 2) +
      Math.pow(mappedA[2] - a[2], 2)));
  }
  if (worstLength > 1e-9) throw new Error(`the demo link does not hold its length: ${worstLength}`);
  if (worstPose > 1e-9) throw new Error(`the demo link pose does not map B onto B: ${worstPose}`);
  if (worstBody > 1e-9) throw new Error(`the demo arm pose does not map A onto A: ${worstBody}`);

  // The LAST point is the as-modelled one, which is where picking is allowed
  // and nowhere else.
  if (!AA.sweepIsAsModelled(AA.sweepFrameAt(art, art.points.length - 1))) {
    throw new Error("the demo run's last point is not its as-modelled pose");
  }
  if (AA.sweepIsAsModelled(AA.sweepFrameAt(art, 0))) {
    throw new Error("the demo run's first point reads as as-modelled");
  }
  // A reader must be able to tell in one glance that none of this is a
  // measurement of anything.
  if (art.runId.indexOf("synthetic") === -1 ||
      art.mechanismName.indexOf("not a measurement") === -1) {
    throw new Error("the demo run does not say it is synthetic where a reader will see it");
  }
});

check("sweep: index.html loads sweep.js before the module that uses it, and " +
  "this runner loads it at all", () => {
  const sweep = ANNOTATE_HTML.indexOf('src="./sweep.js"');
  const app = ANNOTATE_HTML.indexOf('src="./app.js"');
  if (sweep === -1) throw new Error("index.html does not load sweep.js");
  if (sweep > app) throw new Error("app.js loads before sweep.js, whose verbs it registers");
  const runner = fs.readFileSync(path.join(here, "run_tests.cjs"), "utf8");
  if (runner.indexOf("\"sweep.js\"") === -1) {
    throw new Error("this runner does not load sweep.js");
  }
});

// --- parts sit where the assembly puts them (handoff 2026-10-14) -------------

// A directory handle in memory, shaped like the File System Access one the
// FSA adapter walks -- so the listing below runs FsaAdapter's real code
// rather than a restatement of it.
function fakeDirHandle(tree) {
  return {
    kind: "directory",
    async getDirectoryHandle(name) {
      const sub = tree[name];
      if (!sub || typeof sub !== "object" || sub.__file) throw new Error("NotFoundError");
      return fakeDirHandle(sub);
    },
    async getFileHandle(name) {
      const leaf = tree[name];
      if (!leaf || !leaf.__file) throw new Error("NotFoundError");
      return { kind: "file", getFile: async () => ({ text: async () => leaf.text }) };
    },
    async *entries() {
      for (const name of Object.keys(tree)) {
        yield [name, tree[name].__file ? { kind: "file" } : { kind: "directory" }];
      }
    },
  };
}

function runDoc(runId, ts, mechanism) {
  const doc = { schema: "linkage-sweep/v1", run_id: runId, mechanism: { name: mechanism } };
  if (ts !== undefined) doc.ts = ts;
  return doc;
}

check("sweep latest is the newest run by its OWN ts, tie-broken by run id, on " +
  "every adapter that lists runs", async () => {
  // The case Jeff hit: two runs whose ids sort the other way round from when
  // they were published -- `s` beats `p1` alphabetically, P1 is newer.
  const unequal = {
    "vpa-pitch-s-20261001-203656": runDoc("vpa-pitch-s-20261001-203656", "2026-10-01T20:36:56Z", "vpa_pitch_chunk0_s"),
    "vpa-pitch-p1-20261001-203656": runDoc("vpa-pitch-p1-20261001-203656", "2026-10-01T20:36:58Z", "vpa_pitch_chunk0_p1"),
  };
  // ...and two published in the same second, where the run id decides.
  const equal = {
    "run-a": runDoc("run-a", "2026-10-02T00:00:00Z", "m_a"),
    "run-b": runDoc("run-b", "2026-10-02T00:00:00Z", "m_b"),
  };
  // A run with no readable `ts` is listed, last, rather than dropped.
  const undated = { "zz-undated": runDoc("zz-undated", undefined, "m_z") };
  const cases = [
    [unequal, ["vpa-pitch-p1-20261001-203656", "vpa-pitch-s-20261001-203656"]],
    [equal, ["run-b", "run-a"]],
    [Object.assign({}, unequal, equal, undated),
      ["run-b", "run-a", "vpa-pitch-p1-20261001-203656", "vpa-pitch-s-20261001-203656", "zz-undated"]],
  ];

  // The FSA adapter is not one of this runner's default files (it needs a
  // browser to do anything real), so it is loaded here, for its listing.
  if (!AA.FsaAdapter) {
    vm.runInContext(fs.readFileSync(path.join(here, "storage", "fsa.js"), "utf8"), sandbox,
      { filename: "storage/fsa.js" });
  }
  for (const [runs, want] of cases) {
    const entries = Object.keys(runs).map((id) => AA.sweepRunEntry(id, runs[id]));
    assertEqual(AA.orderSweepRuns(entries).map((r) => r.runId), want, "AA.orderSweepRuns");

    const memory = new AA.MemoryAdapter({ sweepRuns: runs });
    await memory.connect();
    const listed = await memory.listSweepRuns();
    assertEqual(listed.map((r) => r.runId), want, "the in-memory adapter");

    const files = {};
    for (const id of Object.keys(runs)) {
      files[id + ".json"] = { __file: true, text: JSON.stringify(runs[id]) };
    }
    files["notes.txt"] = { __file: true, text: "not a run" };
    const fsa = new AA.FsaAdapter();
    fsa._state = AA.STATE.READY;
    fsa._rootHandle = fakeDirHandle({ data: { inbox: { "linkage-sweeps": files } } });
    const fsaListed = await fsa.listSweepRuns();
    assertEqual(fsaListed.map((r) => r.runId), want, "the FSA adapter");
    // What the bar's picker names a run by comes with the listing.
    if (fsaListed.some((r) => r.runId.indexOf("vpa-pitch-p1") === 0 &&
        r.mechanism !== "vpa_pitch_chunk0_p1")) {
      throw new Error("the listing does not carry the run's mechanism: " + JSON.stringify(fsaListed));
    }
  }

  // The browser check's read harness lists runs too, and answers through the
  // same ordering rather than a copy of it.
  const harness = fs.readFileSync(path.join(here, "run_browser_check.mjs"), "utf8");
  const line = harness.split("\n").filter((l) => l.indexOf("P.listSweepRuns") !== -1)[0] || "";
  if (line.indexOf("AA.orderSweepRuns") === -1) {
    throw new Error("run_browser_check.mjs's listSweepRuns does not order through " +
      "AA.orderSweepRuns: " + line.trim());
  }
});

check("the placement rule: every recorded occurrence is drawn, a pathological " +
  "count is capped and says so, and a part with none says it is at its own origin", () => {
  const P = (tx) => [1, 0, 0, tx, 0, 1, 0, 0, 0, 0, 1, 0];
  const occ = AA.readMeshOccurrences(
    [{ sha256: "link" }, { sha256: "standalone" }, { sha256: "rivet" }],
    {
      link: { extraction: { product_name: "212956-005", instances: [
        { instance_name: "prd.1", instance_path: ["217755-001", "prd.1"], placement_world: P(1) },
        { instance_name: "prd.2", instance_path: ["217755-001", "prd.2"], placement_world: P(2) },
        { instance_name: "prd.3", instance_path: ["217755-001", "prd.3"], placement_world: P(3) },
        // A malformed placement is not an occurrence -- drawn nowhere rather
        // than drawn wrong.
        { instance_name: "prd.4", instance_path: ["217755-001", "prd.4"], placement_world: [1, 0, 0] },
      ] } },
      standalone: { extraction: {} },
      rivet: { extraction: { instances: Array.from({ length: AA.OCCURRENCE_DRAW_LIMIT + 6 }, (_, i) => (
        { instance_name: "r." + i, placement_world: P(i) })) } },
    });
  const link = AA.restPlacements(occ.byMesh.link);
  assertEqual(link.placements, [P(1), P(2), P(3)], "the tangential link is drawn at all three");
  assertEqual(link.keys, ["217755-001/prd.1", "217755-001/prd.2", "217755-001/prd.3"], "keyed by path");
  assertEqual(AA.assemblyPositionNote(link), null, "a part drawn everywhere it sits needs no note");

  const none = AA.restPlacements(occ.byMesh.standalone);
  assertEqual(none.placements.length, 0, "a standalone STEP records nothing");
  assertEqual(AA.assemblyPositionNote(none), AA.ASSEMBLY_POSITION_WORDS.none,
    "a part with no position says it is at its own origin");

  const rivet = AA.restPlacements(occ.byMesh.rivet);
  assertEqual([rivet.placements.length, rivet.total, rivet.capped],
    [AA.OCCURRENCE_DRAW_LIMIT, AA.OCCURRENCE_DRAW_LIMIT + 6, true], "a pathological count is capped");
  const capped = AA.assemblyPositionNote(rivet);
  if (capped.indexOf(String(AA.OCCURRENCE_DRAW_LIMIT)) === -1 || capped.indexOf(String(AA.OCCURRENCE_DRAW_LIMIT + 6)) === -1) {
    throw new Error("the capped note does not say how many of how many: " + capped);
  }
  for (const words of [AA.ASSEMBLY_POSITION_WORDS.none, capped]) {
    assertNoCommandOrPath(words, "a part's position note");
    assertNothingBanned(words, "a part's position note");
  }
});

check("sweep: a body carries what is recorded INSIDE its matched occurrence -- " +
  "the deepest enclosing claim wins, a listed claim beats an inherited one, " +
  "and a sibling path is not inside", () => {
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
  const o = (mesh, key) => ({ mesh, key, instance_name: key.split("/").pop(), placement: I });
  const all = [
    o("plate", "r/plate.3"),
    o("bushing", "r/plate.3/bushing.1"),
    o("bushing", "r/plate.3/bushing.2"),
    // `plate.30` is a sibling whose name merely starts the same way.
    o("decoy", "r/plate.30/x.1"),
    o("link", "r/plate.3/link.1"),
    o("bearing", "r/plate.3/link.1/bearing.1"),
    o("listed", "r/plate.3/listed.1"),
    // A DIFFERENT mesh at exactly the plate's own path: the same occurrence.
    o("variant", "r/plate.3"),
  ];
  const claims = [
    { sha256: "plate", key: "r/plate.3", subject: "pitch_plate", part: "plate" },
    { sha256: "link", key: "r/plate.3/link.1", subject: "pitch_link", part: "link" },
    { sha256: "listed", key: "r/plate.3/listed.1", subject: "blade", part: "listed" },
  ];
  const carried = AA.sweepCarriedOccurrences(all, claims);
  const got = carried.map((c) => [c.sha256, c.key, c.subject, c.inside]);
  assertEqual(got, [
    ["bushing", "r/plate.3/bushing.1", "pitch_plate", true],
    ["bushing", "r/plate.3/bushing.2", "pitch_plate", true],
    ["bearing", "r/plate.3/link.1/bearing.1", "pitch_link", true],
    ["variant", "r/plate.3", "pitch_plate", false],
  ], "what each body carries");
  if (!AA.occurrenceWithin("a/b.3/c", "a/b.3") || AA.occurrenceWithin("a/b.30", "a/b.3")) {
    throw new Error("occurrenceWithin reads a name prefix instead of a path");
  }
});

check("sweep: the draw plan moves only what the run owns -- a mesh moved at one " +
  "occurrence keeps its others still, and a matched occurrence the mesh does " +
  "not record is drawn too", () => {
  const P = (tx) => [1, 0, 0, tx, 0, 1, 0, 0, 0, 0, 1, 0];
  const occ = AA.readMeshOccurrences([{ sha256: "arm" }, { sha256: "link" }, { sha256: "hub" }], {
    arm: { extraction: { instances: [
      { instance_name: "arm.1", instance_path: ["r", "arm.1"], placement_world: P(10) },
      { instance_name: "arm.2", instance_path: ["r", "arm.2"], placement_world: P(20) },
    ] } },
    link: { extraction: { instances: [
      { instance_name: "link.2", instance_path: ["r", "link.2"], placement_world: P(40) },
    ] } },
    hub: { extraction: { instances: [
      { instance_name: "hub.1", instance_path: ["r", "hub.1"], placement_world: P(0) },
    ] } },
  });
  const rows = [
    { subject: "base", part: "hub", sha256: "hub", state: "ground",
      placements: [{ key: "r/hub.1", placement: P(0) }] },
    { subject: "blade", part: "pitch_arm", sha256: "arm", state: "matched",
      placements: [{ key: "r/arm.1", placement: P(10) }] },
    // Blade 1's link: recorded on ANOTHER mesh's provenance, matched by
    // geometry -- so it is not one of this mesh's own occurrences.
    { subject: "pitch_link", part: "pitch_link", sha256: "link", state: "matched",
      placements: [{ key: "r/link.1", placement: P(30) }] },
    { subject: "blade", part: "blade_root", sha256: "nothing", state: "refused" },
  ];
  const drawn = AA.sweepDrawPlan(rows, occ);
  assertEqual(Object.keys(drawn.plan).sort(), ["arm", "link"], "only meshes something moves are planned");
  assertEqual(drawn.plan.arm.map((e) => [e.key, e.subject]),
    [["r/arm.1", "blade"], ["r/arm.2", null]], "the arm moves at blade 1 and stays put at blade 2");
  assertEqual(drawn.plan.link.map((e) => [e.key, e.subject]),
    [["r/link.2", null], ["r/link.1", "pitch_link"]], "the link's own slot stays, the matched one moves");

  const frame = {
    poses: { blade: { quaternion: [0, 0, 0, 1], translation: [0, 5, 0] } },
    links: { pitch_link: { quaternion: [0, 0, 0, 1], translation: [0, 0, 7] } },
  };
  const arm = AA.sweepMeshMatrices(drawn.plan.arm, frame);
  assertEqual([arm[0][3], arm[0][7], arm[1][3], arm[1][7]], [10, 5, 20, 0],
    "the moving occurrence carries the pose; the still one is its own placement");
  const link = AA.sweepMeshMatrices(drawn.plan.link, frame);
  assertEqual([link[0][11], link[1][3], link[1][11]], [0, 30, 7], "a link rides its reconstructed pose");
});

check("a pick resolves to the part's own (sha256, face id) whichever occurrence " +
  "it lands on, so the event it writes is the one it always wrote", () => {
  const sha = AA.FIXTURES.demoSha;
  const record = AA.FIXTURES.meshManifests[sha].faces[0];
  // What scene.pick returns on the part itself (occurrence 0, the only
  // answer before parts were placed) and on its second drawn occurrence.
  const onPart = { sha256: sha, faceId: 0, record, occurrence: 0 };
  const onRepeat = { sha256: sha, faceId: 0, record, occurrence: 1 };
  const build = (pick) => AA.buildBoundEvent({
    eventId: "e", seq: 1, createdAt: "2026-10-14T00:00:00Z", recordedBy: "test",
    stackKey: AA.topologyEdgeKey("demo_system", "demo_edge_untraced"),
    geometryKey: AA.geometryKeyOfPick(pick), direction: AA.DIRECTIONS[0],
  });
  assertEqual(build(onRepeat), build(onPart), "the event from a pick on a repeat");
  // ...and it is the key the fixture's existing binding already carries, i.e.
  // part-local -- the manifest's own centroid, not a placed one.
  const existing = AA.FIXTURES.featureIdentityProjection.stack_keys[0].bindings[0].geometry_key;
  assertEqual(build(onRepeat).geometry_key, existing, "the part-local key");
  // The same face on two occurrences is ONE face: clicking it on the other
  // occurrence toggles the pick off rather than selecting it again.
  assertEqual(AA.planPickToggle(onPart, onRepeat).action, "clear",
    "the same face, picked on another occurrence");
});

// --- the model layer (handoff the_model_is_drawn_in_the_scene) -------------
//
// model_layer.js decides where every node's dot is and which frame every line
// is drawn in; the scene only draws. So the rules are held here, on small
// hand-built inputs whose answers can be worked by hand.

// A tube about +Z: inner radius 40, outer 50, from z = 0 to z = 20, as quads
// split into triangles -- the shape of the tangential-link mount, a hollow ring
// round the spindle. Every wall is its own run of vertices (a mesh's vertices
// are per face), so a cut is connected only by position.
function modelRingMesh(segments) {
  const n = segments || 32;
  const positions = [];
  const indices = [];
  const wall = (r0, z0, r1, z1) => {
    const base = positions.length / 3;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 * Math.PI;
      positions.push(r0 * Math.cos(t), r0 * Math.sin(t), z0, r1 * Math.cos(t), r1 * Math.sin(t), z1);
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  };
  wall(40, 0, 40, 20);  // inner wall
  wall(50, 0, 50, 20);  // outer wall
  wall(40, 0, 50, 0);   // bottom
  wall(40, 20, 50, 20); // top
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

const MODEL_TOPOLOGY = {
  id: "model_demo",
  parts: [{ id: "ring" }, { id: "boss" }, { id: "rod" }, { id: "ghostpart" }],
  bodies: [
    { id: "ground", parts: ["ring", "ghostpart"] },
    { id: "carrier", parts: ["boss"] },
    { id: "rodlink", kind: "link", parts: ["rod"] },
  ],
  nodes: [
    { id: "ring_base", parts: ["ring"] },
    { id: "ring_seat", parts: ["ring"] },
    { id: "ring_top", parts: ["ring"] },
    { id: "boss_bore", parts: ["boss"] },
    { id: "rod_lower", parts: ["rod"] },
    { id: "rod_upper", parts: ["rod"] },
    { id: "unmeshed", parts: ["ghostpart"] },
  ],
  edges: [
    // Authored out of stack order on purpose: the ladder follows the edges.
    { id: "seat_to_top", kind: "structural", part: "ring", from: "ring_seat", to: "ring_top" },
    { id: "base_to_seat", kind: "structural", part: "ring", from: "ring_base", to: "ring_seat" },
    { id: "rod_length", kind: "structural", part: "rod", from: "rod_lower", to: "rod_upper" },
    { id: "rod_to_ring", kind: "gap", from: "ring_top", to: "rod_lower" },
    { id: "rod_to_boss", kind: "gap", from: "rod_upper", to: "boss_bore" },
    { id: "ghost_to_base", kind: "structural", part: "ghostpart", from: "unmeshed", to: "ring_base" },
  ],
};

function modelRingSection() {
  const ring = modelRingMesh();
  const bias = AA.readAnchorBias(MODEL_TOPOLOGY);
  return { bias, section: AA.modelPartSection(ring.positions, ring.indices, null, bias) };
}

function modelDemoAnchors(extra) {
  const { bias, section } = modelRingSection();
  return AA.modelAnchors(Object.assign({
    topology: MODEL_TOPOLOGY, bias,
    linkEnds: { rod_lower: { joint: "rodlink", end: "point_a_world" },
      rod_upper: { joint: "rodlink", end: "point_b_world" } },
    parts: {
      ring: { subject: "ground", section, origin: [0, 0, 0] },
      boss: { subject: "carrier", section: null, origin: [5, 5, 5], why: AA.MODEL_ORIGIN_WHY.noCut },
      rod: { subject: "rodlink", section: null, origin: [0, 0, 0] },
      ghostpart: { subject: null, section: null, origin: [0, 0, 0], why: AA.MODEL_ORIGIN_WHY.noMesh },
    },
    bound: { boss_bore: [10, 0, 30] },
  }, extra || {}));
}

check("model: a topology's anchor_bias is read, and an unreadable one is the default and says so", () => {
  const d = AA.readAnchorBias({ id: "t" });
  assertEqual([d.bias, d.stack, d.biasAxis, d.biasSign, d.stackAxis, d.normalAxis, d.problem],
    ["+x", "z", 0, 1, 2, 1, null], "the default is Jeff's +X bias over a Z stack, cut by XZ");
  const authored = AA.readAnchorBias({ topology: { anchor_bias: { bias: "-y", stack: "x" } } });
  assertEqual([authored.biasAxis, authored.biasSign, authored.stackAxis, authored.normalAxis],
    [1, -1, 0, 2], "an authored bias, read off the projection's verbatim document");
  const bad = AA.readAnchorBias({ anchor_bias: { bias: "+z", stack: "z" } });
  assertEqual([bad.bias, bad.stack], ["+x", "z"], "a bias along the stack axis falls back");
  if (!bad.problem || bad.problem.indexOf("anchor_bias") === -1) {
    throw new Error("an unreadable anchor_bias says nothing: " + bad.problem);
  }
});

check("model: a ring cut through its axis gives two regions, and the +X anchor is on the +X wall, not the ring's centre", () => {
  const { section } = modelRingSection();
  assertEqual(section.regions, 2, "a tube cut by the XZ plane through its axis is two walls");
  assertClose(section.at, 0, 1e-3, "the plane is through the box's centre along Y");
  const c = section.region.centroid;
  if (!(c[0] > 40 && c[0] < 50)) throw new Error("the anchor is not inside the +X wall: x = " + c[0]);
  assertClose(c[1], section.at, 1e-9, "the anchor is on the plane");
  assertClose(c[2], 10, 1e-6, "and half way up the wall");
  assertEqual(section.stackRange, [0, 20], "the ladder's span is the cut's height");
  // A bias toward -X takes the other wall: the choice is the authored bias.
  const minus = AA.modelPartSection(modelRingMesh().positions, modelRingMesh().indices, null,
    AA.readAnchorBias({ anchor_bias: { bias: "-x", stack: "z" } }));
  if (!(minus.region.centroid[0] < -40)) throw new Error("a -X bias did not take the -X wall");
  // ...and the placement moves the cut with the occurrence.
  const moved = AA.modelPartSection(modelRingMesh().positions, modelRingMesh().indices,
    [1, 0, 0, 100, 0, 1, 0, 7, 0, 0, 1, 0], AA.readAnchorBias({}));
  assertClose(moved.at, 7, 1e-3, "the plane follows the occurrence");
  if (!(moved.region.centroid[0] > 140)) throw new Error("the cut did not move with the placement");
});

check("model: a node anchors on its link's joint point, then its bound face, then its part's section, then its body's origin", () => {
  const anchors = modelDemoAnchors();
  const sources = {};
  for (const id of Object.keys(anchors)) sources[id] = anchors[id].source;
  assertEqual(sources, { ring_base: "section", ring_seat: "section", ring_top: "section",
    boss_bore: "bound", rod_lower: "joint", rod_upper: "joint", unmeshed: "origin" }, "the sources");
  assertEqual(anchors.boss_bore.point, [10, 0, 30], "a bound node sits on its fitted point");
  assertEqual(anchors.boss_bore.subject, "carrier", "and rides its own part's subject");
  assertEqual(anchors.unmeshed.why, AA.MODEL_ORIGIN_WHY.noMesh, "an origin anchor says why");
  if (AA.modelAnchorWords(anchors.unmeshed).indexOf(AA.MODEL_ORIGIN_WHY.noMesh) === -1) {
    throw new Error("the readout drops the reason: " + AA.modelAnchorWords(anchors.unmeshed));
  }
  // A binding beats the section: bind ring_top and it leaves the ladder.
  const bound = modelDemoAnchors({ bound: { ring_top: [1, 2, 3] } });
  assertEqual(bound.ring_top.source, "bound", "a bound node is not a section rung");
  assertEqual(bound.ring_top.point, [1, 2, 3], "...and sits on its face");
});

check("model: a part's section anchors spread up the stack axis in stack order, across the whole cut's height", () => {
  const anchors = modelDemoAnchors();
  assertEqual(AA.modelStackOrder(MODEL_TOPOLOGY, "ring", ["ring_top", "ring_seat", "ring_base"]),
    ["ring_base", "ring_seat", "ring_top"], "the order follows the part's own edges, from -> to");
  assertEqual(["ring_base", "ring_seat", "ring_top"].map((id) => anchors[id].point[2]),
    [5, 10, 15], "three rungs, evenly, inside the 0..20 cut");
  assertEqual(["ring_base", "ring_seat", "ring_top"].map((id) => anchors[id].rung),
    [[0, 3], [1, 3], [2, 3]], "each rung knows its place");
  const x = anchors.ring_base.point[0];
  if (!(x > 40) || anchors.ring_top.point[0] !== x) {
    throw new Error("the ladder is not one upright on the +X wall: " +
      JSON.stringify(["ring_base", "ring_top"].map((id) => anchors[id].point)));
  }
  if (AA.modelAnchorWords(anchors.ring_seat).indexOf("stack order") === -1) {
    throw new Error("a rung's readout does not say its height is its place in the stack");
  }
});

check("model: a joint anchor's world point is the frame's own joint end, bit for bit, and a body anchor rides its pose", () => {
  const anchors = modelDemoAnchors();
  const a = [83.00000000000001, -44.54964933003539, -22.699797236338412];
  const b = [84.972, -17.139000000000014, 79.666];
  const frame = {
    joints: { rodlink: { point_a_world: a, point_b_world: b } },
    // Carrier: turned 90 degrees about Z and lifted 2.
    poses: { carrier: { quaternion: [0, 0, Math.SQRT1_2, Math.SQRT1_2], translation: [0, 0, 2] } },
    links: {},
  };
  const world = AA.modelWorldPoints(anchors, frame);
  if (world.rod_lower !== a || world.rod_upper !== b) {
    throw new Error("a link end was copied or recomputed rather than read off the frame");
  }
  assertClose(world.boss_bore[0], 0, 1e-12, "x after the turn");
  assertClose(world.boss_bore[1], 10, 1e-12, "y after the turn");
  assertClose(world.boss_bore[2], 32, 1e-12, "z after the lift");
  assertEqual(world.ring_base, anchors.ring_base.point, "a still body's anchor stays put");
  // Bind mode: no frame, every body anchor at its as-modelled self, and a link
  // end -- which only a run can place -- has none.
  const still = AA.modelWorldPoints(anchors, null);
  assertEqual([still.boss_bore, still.rod_lower], [[10, 0, 30], null], "the as-modelled pose");
});

check("model: a structural line between two anchors on one body is drawn in that body's frame; a joint line is not", () => {
  const lines = AA.modelEdgeLines(MODEL_TOPOLOGY, modelDemoAnchors());
  assertEqual(lines.base_to_seat.body, "ground", "a ring stack line rides the ring's body");
  assertEqual(lines.rod_length.body, null, "the link's own length is between two solver points");
  assertEqual(lines.rod_to_boss.body, null, "a joint between two bodies is drawn in world");
  assertEqual(lines.ghost_to_base.body, null, "an edge whose ends ride two subjects is drawn in world");
  assertEqual(Object.keys(lines).sort(), MODEL_TOPOLOGY.edges.map((e) => e.id).sort(),
    "every edge has a line");
  const turned = AA.modelSubjectPlacement({ poses: { carrier: { quaternion: [0, 0, 0, 1],
    translation: [1, 2, 3] } } }, "carrier");
  assertEqual([turned[3], turned[7], turned[11]], [1, 2, 3], "a body group carries its pose");
  assertEqual(AA.modelSubjectPlacement(null, "carrier"), AA.IDENTITY_PLACEMENT.slice(),
    "and identity with no frame");
});

check("model: an unlit line is dim or hidden by the shell's word, and nothing lit means every line full", () => {
  const lit = { base_to_seat: true };
  assertEqual(AA.modelLineStrength("base_to_seat", lit, "dim"), "full", "a lit line");
  assertEqual(AA.modelLineStrength("rod_length", lit, "dim"), "dim", "an unlit line, dimmed");
  assertEqual(AA.modelLineStrength("rod_length", lit, "hide"), "hidden", "an unlit line, hidden");
  assertEqual(AA.modelLineStrength("rod_length", null, "hide"), "full", "nothing emphasised");
  assertEqual(AA.modelLitNodes(MODEL_TOPOLOGY, lit), { ring_base: true, ring_seat: true },
    "a lit edge lights both its nodes");
  assertEqual(AA.modelLitNodes(MODEL_TOPOLOGY, null), null, "and with nothing lit, every node is");
  assertEqual(AA.MODEL_DEFAULT_UNLIT, "dim", "dim is the default, as on the shell's toggle");
});

check("model: the anchors message rounds to a tenth of a pixel, drops a hidden line and a line with an end off screen", () => {
  const lines = AA.modelEdgeLines(MODEL_TOPOLOGY, modelDemoAnchors());
  const screen = { ring_base: [10.04, 20.06], ring_seat: [30, 40], ring_top: [50.55, 60],
    boss_bore: null, rod_lower: [1, 2], rod_upper: [3, 4], unmeshed: null };
  const msg = AA.modelAnchorsMessage(lines, screen,
    { base_to_seat: "full", seat_to_top: "dim", rod_length: "hidden" });
  assertEqual(msg.type, "annotate:anchors", "the message type the shell listens for");
  assertEqual(msg.nodes.ring_base, [10, 20.1], "rounded to a tenth of a CSS pixel");
  assertEqual(msg.nodes.boss_bore, null, "an off-screen node is null, not left out");
  assertEqual(Object.keys(msg.nodes).length, 7, "every node is reported");
  assertEqual(Object.keys(msg.edges).sort(), ["base_to_seat", "rod_to_ring", "seat_to_top"],
    "a hidden line and lines with a null end are not reported");
  assertEqual(msg.edges.base_to_seat, [[10, 20.1], [30, 40]], "an edge is its two node points");
  assertEqual(JSON.stringify(AA.modelAnchorsMessage(lines, screen, {})),
    JSON.stringify(AA.modelAnchorsMessage(lines, Object.assign({}, screen), {})),
    "the same scene posts the same bytes, so a still scene posts once");
});

check("model: the model verb parses lit, unlit and select, and refuses anything else naming what it takes", () => {
  assertEqual(AA.parseModelVerb(["lit", "a", "b"]), { action: "lit", lit: { a: true, b: true } }, "a lit set");
  assertEqual(AA.parseModelVerb(["lit", "all"]), { action: "lit", lit: null }, "nothing emphasised");
  assertEqual(AA.parseModelVerb(["unlit", "hide"]), { action: "unlit", unlit: "hide" }, "hide the rest");
  assertEqual(AA.parseModelVerb(["select", "node", "n1"]),
    { action: "select", select: { kind: "node", id: "n1" } }, "a node selected");
  assertEqual(AA.parseModelVerb(["select", "clear"]), { action: "select", select: null }, "let go");
  const refusals = [["paint"], ["unlit", "fade"], ["lit"], ["select", "edge", "e"], ["select", "body"]];
  for (const args of refusals) {
    let err = null;
    try { AA.parseModelVerb(args); } catch (e) { err = e.message; }
    if (!err) throw new Error("accepted " + JSON.stringify(args));
  }
  let first = null;
  try { AA.parseModelVerb(["paint"]); } catch (e) { first = e.message; }
  if (AA.MODEL_VERB_ACTIONS.some((a) => first.indexOf(a) === -1)) {
    throw new Error("a bad action does not list the actions: " + first);
  }
});

check("model: the link ends are read off the run's own geometry features, for links only", () => {
  const artifact = {
    links: [{ joint: "rodlink" }],
    features: [
      { label: "rodlink.point_a[0]", node: "rod_lower" },
      { label: "rodlink.point_a[1]", node: "rod_lower" },
      { label: "rodlink.point_b[2]", node: "rod_upper" },
      { label: "hinge.point_a[0]", node: "ring_base" },
      { label: "rodlink.length", edge: "rod_length" },
    ],
  };
  assertEqual(AA.modelLinkEnds(artifact), {
    rod_lower: { joint: "rodlink", end: "point_a_world" },
    rod_upper: { joint: "rodlink", end: "point_b_world" },
  }, "a link's two ends, and not a hinge's");
  assertEqual(AA.modelLinkEnds(null), {}, "no run, no link ends");
});

// --- [real] the published sweep runs ---------------------------------------
//
// `data/inbox/linkage-sweeps/` is gitignored and lives only in the main
// checkout (repo CLAUDE.md), so this resolves the repo-relative path first
// and falls back to the main checkout, and SKIPS honestly when neither holds
// a run -- the same posture every other [real] tier in this file takes.
//
// What it is for: the consistency pins the `linkage` repo asserts on its own
// side are value-level facts about these files, and this app READS those
// files. If the producer changes shape, or a run is published that does not
// close, this is what says so from the consumer's side rather than a
// screenshot somebody has to look at.
const SWEEPS_DIR = [
  path.join(here, "..", "..", "data", "inbox", "linkage-sweeps"),
  "C:/workspace/tolstack/data/inbox/linkage-sweeps",
].find((candidate) => {
  try { return fs.existsSync(candidate) && fs.readdirSync(candidate).some((f) => /\.json$/i.test(f)); }
  catch (_) { return false; }
});

// --- [real] the part-names projection ---------------------------------------
const PART_NAMES_PATH = [
  path.join(here, "..", "..", "data", "projections", "parts", "names.json"),
  "C:/workspace/tolstack/data/projections/parts/names.json",
].find((candidate) => fs.existsSync(candidate));

if (!PART_NAMES_PATH) {
  console.log("SKIP  [real] the part-names projection -- data/projections/parts/names.json " +
    "is not built, here or in the main checkout");
} else {
  check("[real] the part-names projection names the six drawn parts and the topology's own", () => {
    const doc = JSON.parse(fs.readFileSync(PART_NAMES_PATH, "utf8"));
    for (const number of ["213668-002", "214698-002", "214699-002", "214958-002",
      "214955-004", "214959-002"]) {
      const row = AA.partNameFor(doc, number);
      if (!row) throw new Error(number + " has no name in the projection");
      if (doc.names[number].source.indexOf("drawing:") !== 0) {
        throw new Error(number + " is not named from its drawing: " + doc.names[number].source);
      }
    }
    const fromTopology = Object.keys(doc.names)
      .filter((n) => doc.names[n].source.indexOf("topology:") === 0);
    if (!fromTopology.length) throw new Error("no part is named from a topology");
    assertEqual(AA.partNameFor(doc, "214698-002"), "gas spring piston head, propeller, upr",
      "the drawing's nomenclature, in one casing");
    console.log("      " + Object.keys(doc.names).length + " names: " + doc.counts.drawing +
      " from a drawing, " + doc.counts.topology + " from a topology");
  });
}

if (!SWEEPS_DIR) {
  console.log("SKIP  [real] the published sweep runs -- no data/inbox/linkage-sweeps/ " +
    "with a run in it, here or in the main checkout");
} else {
  const SWEEP_RUNS = fs.readdirSync(SWEEPS_DIR).filter((f) => /\.json$/i.test(f));

  check("[real] every published run reads, and the one thing a reader must " +
    "not have to guess -- where its geometry came from -- is a word this app " +
    "has", () => {
    const seen = [];
    for (const file of SWEEP_RUNS) {
      const doc = JSON.parse(fs.readFileSync(path.join(SWEEPS_DIR, file), "utf8"));
      // A v0 run in the inbox is legitimate (they were published before the
      // schema carried poses) and is NOT a failure here -- the surface
      // refuses it with a reason, which the fast tier already pins.
      if (doc.schema !== AA.SWEEP_SCHEMA) { seen.push(`${file}: ${doc.schema}`); continue; }
      const art = AA.readSweepArtifact(doc);
      if (AA.SWEEP_SOURCES.indexOf(art.source) === -1) {
        throw new Error(`${file} declares source ${JSON.stringify(art.source)}, ` +
          `which is outside ${AA.SWEEP_SOURCES.join("/")} -- this surface would ` +
          `render the raw token at a reader`);
      }
      const line = AA.sweepSummaryParts(art).join(" · ");
      assertNoCommandOrPath(line, `the summary line for ${file}`);
      assertNothingBanned(line, `the summary line for ${file}`);
      seen.push(`${file}: ${art.points.length} points, ${art.bodies.length} bodies, ` +
        `${art.notConverged} unconverged`);
    }
    console.log("      " + seen.join("\n      "));
  });

  check("[real] every v1 run closes: its as-modelled pose is the identity, " +
    "each two-force member holds its length, and every body pose carries the " +
    "joint ends measured to ride on it", () => {
    let checked = 0;
    for (const file of SWEEP_RUNS) {
      const doc = JSON.parse(fs.readFileSync(path.join(SWEEPS_DIR, file), "utf8"));
      if (doc.schema !== AA.SWEEP_SCHEMA) continue;
      const art = AA.readSweepArtifact(doc);
      checked++;

      // Exactly one point is the as-modelled pose, and the artifact's frame
      // statement says it is where every binding in this repo sits.
      const atHome = art.points
        .map((_, i) => i)
        .filter((i) => AA.sweepIsAsModelled(AA.sweepFrameAt(art, i)));
      if (atHome.length !== 1) {
        throw new Error(`${file} has ${atHome.length} points at the as-modelled ` +
          `pose, not exactly one`);
      }
      const home = art.points[atHome[0]];

      // |A - B| against the declared length, at every point, for every
      // distance-constraint member.
      let worstLength = 0;
      for (const point of art.points) {
        for (const link of art.links) {
          const joint = point.joints[link.joint];
          const declared = point.links[link.joint];
          if (!joint || !declared) {
            throw new Error(`${file} lists ${link.joint} under links but a point ` +
              `carries no pose or no joint for it`);
          }
          const a = joint.point_a_world, b = joint.point_b_world;
          const measured = Math.sqrt(Math.pow(a[0] - b[0], 2) +
            Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
          worstLength = Math.max(worstLength, Math.abs(measured - declared.length));
          // ...and the link's own reconstructed pose maps the as-modelled far
          // end onto the current one, which is the convention it declares.
          const mapped = AA.applyPlacement(AA.poseToPlacement(declared),
            home.joints[link.joint].point_b_world);
          const slip = Math.sqrt(Math.pow(mapped[0] - b[0], 2) +
            Math.pow(mapped[1] - b[1], 2) + Math.pow(mapped[2] - b[2], 2));
          if (slip > 1e-6) {
            throw new Error(`${file}: ${link.joint}'s reconstructed pose misses its ` +
              `own far end by ${slip} mm at point ${point.index}`);
          }
        }
      }
      if (worstLength > 1e-6) {
        throw new Error(`${file}: a two-force member's |A - B| drifts ${worstLength} mm ` +
          `from its declared length`);
      }

      // Every joint end this app measured as riding a body really does ride
      // it, across the WHOLE sweep -- AA.sweepBodyJoints only samples three
      // instants, and this is what says three was enough.
      const riders = AA.sweepBodyJoints(art);
      let worstRide = 0;
      for (const body of Object.keys(riders)) {
        for (const rider of riders[body]) {
          const seat = home.joints[rider.joint][rider.end];
          for (const point of art.points) {
            const moved = AA.applyPlacement(
              AA.poseToPlacement(point.poses[body]), seat);
            const p = point.joints[rider.joint][rider.end];
            worstRide = Math.max(worstRide, Math.max(
              Math.abs(moved[0] - p[0]), Math.abs(moved[1] - p[1]),
              Math.abs(moved[2] - p[2])));
          }
        }
      }
      if (worstRide > AA.SWEEP_RIDES_EPS) {
        throw new Error(`${file}: a joint end measured as riding a body leaves it by ` +
          `${worstRide} mm somewhere in the sweep -- three sampled instants was ` +
          `not enough`);
      }

      // Every body and every distance-constraint member names parts, and
      // every part named is a live topology part this app could alias. A
      // part the alias table has no row for is NOT a failure -- that is the
      // honest "no installed mesh" state -- but a part no topology declares
      // is a producer-side name this app can never resolve.
      const topologyParts = {};
      for (const file2 of fs.readdirSync(path.join(here, "..", "..", "docs", "topologies"))) {
        if (!/^topology_.*\.json$/.test(file2)) continue;
        const topology = JSON.parse(fs.readFileSync(
          path.join(here, "..", "..", "docs", "topologies", file2), "utf8"));
        for (const part of topology.parts || []) topologyParts[part.id] = true;
      }
      for (const subject of art.bodies.concat(art.links)) {
        for (const part of subject.parts || []) {
          if (!topologyParts[part]) {
            throw new Error(`${file} names part "${part}" on ` +
              `${subject.name || subject.joint}, which no tracked topology declares`);
          }
        }
      }

      console.log(`      ${file}: as-modelled at point ${atHome[0]}, ` +
        `worst |A-B| error ${worstLength.toExponential(2)} mm, ` +
        `worst ride error ${worstRide.toExponential(2)} mm`);
    }
    if (!checked) {
      throw new Error("no published run carries the schema this surface reads -- " +
        "the tier above listed what is there");
    }
  });

  check("[real] the scrubber is usable on every published run: the driver is " +
    "strictly monotone, so one travel is one place on the bar", () => {
    for (const file of SWEEP_RUNS) {
      const doc = JSON.parse(fs.readFileSync(path.join(SWEEPS_DIR, file), "utf8"));
      if (doc.schema !== AA.SWEEP_SCHEMA) continue;
      const art = AA.readSweepArtifact(doc);
      const values = AA.sweepDriverValues(art);
      const falling = values[values.length - 1] < values[0];
      for (let i = 1; i < values.length; i++) {
        const ok = falling ? values[i] < values[i - 1] : values[i] > values[i - 1];
        if (!ok) {
          throw new Error(`${file}'s driver is not monotone at point ${i} ` +
            `(${values[i - 1]} then ${values[i]}) -- "which point is this travel" ` +
            `would have two answers`);
        }
      }
      // ...and the map round-trips at every point, exactly.
      for (let i = 0; i < values.length; i++) {
        const back = AA.driverToIndex(values, values[i]);
        if (Math.abs(back - i) > 1e-9) {
          throw new Error(`${file}: point ${i} at ${values[i]} mm maps back to ${back}`);
        }
      }
    }
  });

  // The sweep rail's tree on P2 (handoff the_sweep_rail_shows_the_mechanism):
  // the run the handoff names, read for what the rail shows.
  const P2_FILE = "vpa-pitch-p2-20261016-235852.json";
  if (SWEEP_RUNS.indexOf(P2_FILE) === -1) {
    console.log("SKIP  [real] P2's mechanism tree -- " + P2_FILE + " is not published here");
  } else {
    check("[real] P2's mechanism tree: three bodies, five joints typed slide, driver, " +
      "hinge and two ball-ended links, and the pitch link's two sphere centres", () => {
      const art = AA.readSweepArtifact(JSON.parse(fs.readFileSync(path.join(SWEEPS_DIR, P2_FILE), "utf8")));
      const tree = AA.sweepMechanismTree(art);
      assertEqual(tree.bodies.map((b) => [b.name, b.parts.length, b.open]),
        [["base", 3, false], ["pitch_plate", 2, true], ["blade", 2, true]]);
      assertEqual(tree.joints.map((j) => [j.name, j.words, j.bodies]), [
        ["plate_slide", "slide", ["base", "pitch_plate"]],
        ["actuator", "driver", ["base", "pitch_plate"]],
        ["blade_hinge", "hinge", ["base", "blade"]],
        ["pitch_link", "ball-ended link", ["pitch_plate", "blade"]],
        ["tan_link", "ball-ended link", ["base", "pitch_plate"]]]);
      const link = tree.joints.find((j) => j.name === "pitch_link");
      const nodes = link.features.filter((f) => f.kind === "node").map((f) => f.id);
      assertEqual(nodes, ["pitch_link_upper_sphere_centre", "pitch_link_lower_sphere_centre"]);
      console.log("      " + tree.joints.map(AA.sweepJointRowWords).join(" / "));
    });
  }
}

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

  // The draw cap is for a pathological part, not a real one: the store's
  // most-repeated part must sit under it, with room, so it is drawn in full.
  check("[real] the draw cap is above the most-repeated installed part", () => {
    let most = { n: 0, part: null };
    fs.readdirSync(realMeshesDir)
      .filter((name) => /^[0-9a-f]{64}$/.test(name))
      .forEach((sha256) => {
        const provenancePath = path.join(realMeshesDir, sha256, "provenance.json");
        if (!fs.existsSync(provenancePath)) return;
        const p = JSON.parse(fs.readFileSync(provenancePath, "utf8"));
        const n = ((p.extraction || {}).instances || []).length;
        if (n > most.n) most = { n, part: p.part_id };
      });
    if (!most.n) throw new Error("no installed mesh records an occurrence -- the check would pass vacuously");
    console.log(`      most-repeated: ${most.part} x${most.n}; cap ${AA.OCCURRENCE_DRAW_LIMIT}`);
    if (AA.OCCURRENCE_DRAW_LIMIT < 2 * most.n) {
      throw new Error(`the draw cap ${AA.OCCURRENCE_DRAW_LIMIT} is under twice the most-repeated ` +
        `installed part (${most.part}, ${most.n}) -- a real part is cut short or about to be`);
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
  //
  // 0.45 until 2026-09-30, when rotorkit's pitch-linkage extraction installed
  // the hub (286 solids) and three blade bonded assemblies and took the store
  // from 11075 faces at 60.2% to 35635 at 38.8%. Nothing about the classifier
  // moved: a blade's outer mould line and a hub's cast transitions are swept
  // and freeform, and `other` is the right answer for every one of them. This
  // is the floor doing what its own comment says it must not do -- firing on a
  // mesh being installed -- so the number moves with the store rather than the
  // store being argued with.
  const CLASSIFIED_FRACTION_FLOOR = 0.25;

  check("[real] every installed mesh classifies, and the rate over the whole " +
    "store stays above the floor", () => {
    // Keyed by the GENERATED vocabulary, not by a hand-written trio: a class
    // Python adds and this harness has no counter for would otherwise land in
    // neither the numerator nor the denominator, and the rate would stay
    // comfortably above its floor while nobody could see the new faces at all.
    const zeroed = () => {
      const counts = {};
      AA.SURFACE_CLASSES.forEach((word) => { counts[word] = 0; });
      return counts;
    };
    const totals = zeroed();
    const reasons = {};
    const perPart = [];
    realMeshList().forEach((mesh) => {
      const classes = classifyReal(mesh.sha256);
      const counts = zeroed();
      classes.forEach((c, index) => {
        if (!c) throw new Error(`${mesh.part_id}: face ${index} got no classification at all`);
        if (c.surface === "other" && !c.why) {
          throw new Error(`${mesh.part_id}: face ${index} is "other" with no reason`);
        }
        if (!Object.prototype.hasOwnProperty.call(counts, c.surface)) {
          throw new Error(`${mesh.part_id}: face ${index} answered "${c.surface}", ` +
            "which is not in SURFACE_CLASSES");
        }
        counts[c.surface]++;
        if (c.surface === "other") reasons[c.why] = (reasons[c.why] || 0) + 1;
      });
      if (classes.length === 0) {
        throw new Error(`${mesh.part_id}: classified no faces`);
      }
      Object.keys(counts).forEach((k) => { totals[k] += counts[k]; });
      perPart.push({ part: mesh.part_id, n: classes.length, counts: counts });
    });
    const n = AA.SURFACE_CLASSES.reduce((sum, word) => sum + totals[word], 0);
    if (!n) throw new Error("no faces were classified at all");
    const fraction = (n - totals.other) / n;
    console.log(`      ${n} faces over ${perPart.length} meshes: ` +
      AA.SURFACE_CLASSES.map((w) => `${totals[w]} ${w}`).join(", ") +
      ` (${(100 * fraction).toFixed(1)}% classified)`);
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
    // A cone read as a cylinder would put four chamfers into every bore's
    // candidate list; a cone read as a SPHERE would put a joint centre into a
    // solver. Each chamfer is one band of quads, a shape that fits a sphere
    // exactly and means nothing by it -- so that is the refusal to expect.
    others.forEach((c) => {
      if (c.why.indexOf("one band of quads") === -1) {
        throw new Error("a bushing chamfer was refused for the wrong reason: " + c.why);
      }
    });
    if (classes.some((c) => c.surface === "spherical")) {
      throw new Error("a chamfer on a plain bushing was read as a sphere");
    }
  });

  check("[real] ground truth: the MS14101-3 pitch-link bearing reads as its own " +
    "catalog page, and its ball centre is the part origin", () => {
    const sha = byPartId("asm217755_MS14101_3_815597cb");
    if (!sha) {
      console.log("      (asm217755_MS14101_3_815597cb is not installed -- nothing to check)");
      return;
    }
    const classes = classifyReal(sha);
    // The numbers come from docs/spec_library/events/0006 (RBC Aerospace plain
    // bearings, p. 21, MS14101 grooved dash -3), which is a document this repo
    // has read and recorded: bore B 4.826 mm (-0.013), OD D 14.288 mm (-0.013),
    // and two width columns, 7.14 mm (+/-0.13) and 5.54 mm (+0/-0.05). What
    // this check is: proof that the geometry reader reads a known part. It is
    // not a measurement of the part and it supplies no stack value.
    const diameters = classes.filter((c) => c.surface === "cylindrical")
      .map((c) => 2 * c.radius).sort((a, b) => a - b);
    const unique = diameters.filter((d, i) => i === 0 || Math.abs(d - diameters[i - 1]) > 1e-6);
    assertEqual(unique.map((d) => roundTo(d, 3)), [4.820, 14.282],
      "the bearing's two diameters are not the .1900 bore and the .5625 OD");
    if (!(unique[0] >= 4.813 && unique[0] <= 4.826)) {
      throw new Error("the bore " + unique[0] + " is outside the catalog's 4.813-4.826");
    }
    if (!(unique[1] >= 14.275 && unique[1] <= 14.288)) {
      throw new Error("the OD " + unique[1] + " is outside the catalog's 14.275-14.288");
    }
    // The two plane PAIRS, as a set. Which catalog column is which is NOT
    // asserted: the recorded event names its 5.54 column "ball width", and the
    // mesh puts the wider pair on the solid that carries the bore. Nothing in
    // this repo settles that, and a guard is the wrong place to decide it.
    const offsets = classes.filter((c) => c.surface === "planar")
      .map((c) => roundTo(Math.abs(c.offset), 3));
    const widths = offsets.filter((o, i) => offsets.indexOf(o) === i)
      .map((o) => roundTo(2 * o, 2)).sort((a, b) => a - b);
    assertEqual(widths, [5.54, 5.54, 7.11],
      "the bearing's face pairs are not the catalog's two width columns " +
      "(5.536/5.538 read to two places is 5.54 twice -- the race's two ends)");
    // And the sphere, which is the whole reason this part is here: four
    // spherical faces, the ball and the seat it turns in, both centred on the
    // part's own origin. THAT is what makes a joint centre computable from a
    // placement alone -- it is why the two instances of this bearing stand
    // 105.99 apart in the assembly frame without a single face being bound.
    const spheres = classes.filter((c) => c.surface === "spherical");
    assertEqual(spheres.length, 4, "the bearing's spherical face count moved");
    const radii = spheres.map((c) => roundTo(c.radius, 3)).sort((a, b) => a - b);
    assertEqual(radii, [5.147, 5.147, 5.198, 5.198],
      "the ball and the race seat are not the two spherical radii");
    if (!(radii[3] > radii[0])) {
      throw new Error("the race seat is not larger than the ball it holds");
    }
    spheres.forEach((c) => {
      c.centre.forEach((v) => {
        if (Math.abs(v) > 1e-3) {
          throw new Error("a spherical centre is off the part origin: " +
            JSON.stringify(c.centre));
        }
      });
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
        .filter((t) => t.id === "vpa_pitch_linkage")[0];
      if (!topology) throw new Error("the real projection carries no vpa_pitch_linkage");
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
