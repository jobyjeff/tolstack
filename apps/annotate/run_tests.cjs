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

const files = ["config.js", "storage/adapter.js", "storage/memory.js", "binding_state.js", "commands.js", "fixtures.js"];
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(here, f), "utf8"), sandbox, { filename: f });
}

const AA = sandbox.AnnotateApp;
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

function assertThrows(fn, msg) {
  try {
    fn();
  } catch (_) {
    return;
  }
  throw new Error(msg || "expected a throw");
}

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

// --- README's verb table <-> app.js's commands.register(...) calls -------
// (issue command_vocabulary_table_has_no_pairing_test, following the same-shape
// fix annotate_vocab_pairing_test made for binding_state.js's arrays). The ten
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

(async () => {
  for (const run of checks) await run();
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
})();
