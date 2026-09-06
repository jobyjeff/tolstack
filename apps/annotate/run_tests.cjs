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

const files = ["config.js", "storage/adapter.js", "storage/memory.js", "binding_state.js", "fixtures.js"];
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

(async () => {
  for (const run of checks) await run();
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
})();
