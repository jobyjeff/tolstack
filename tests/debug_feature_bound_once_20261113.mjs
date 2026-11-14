// Hand-run inspection probe for handoff a_feature_is_bound_once_to_a_set_of_
// faces (2026-11-13). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
// The mounts of tests/debug_binding_corrected_where_shown_20261112.mjs
// (drawing-checker's /tolstack/viewer/, /tolstack/annotate/, /tolstack/data/
// meshes/, /tolstack/data/), with /tolstack/data/ a SCRATCH copy: the viewer
// projections, the topology projection rebuilt from THIS tree (its features
// carry their identity keys), and the served log folded from a copy of the
// real log -- never the real one: data/inbox/feature-identity/ is Jeff's work
// and nothing here writes to it. The pane's folder grant is its real File
// System Access path handed a handle this server backs with the scratch copy.
//
//   node tests/debug_feature_bound_once_20261113.mjs [--shots <dir>] [--keep]
//
// On v2, in order:
//   01  the hub's locating boss reads "2 faces disagree" (faces 3460 and 144,
//       two old edge-end events read through to one feature)
//   02  Keep on face 144: bound, and every end that uses the boss reads bound
//   03  Correct, click face 144 in the scene: its split half (145) is swept in
//   04  the gas-spring mount's bushing bore: Correct, click face 53 -- the
//       group of like faces is offered (its seat's other half swept, the
//       other seat's two offered)
//   05  Take all: the feature holds both seats
//   06  a reload with the pane closed reads the same
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, cpSync, rmSync } from "node:fs";
import { join, extname, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const MAIN = "C:/workspace/tolstack";
const WIDTH = Number(flag("--width") || 3840);
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/a_feature_is_bound_once_to_a_set_of_faces");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "feature_bound_once_20261113");
const V2 = "vpa_end_stop_v2";
const HUB = "hub@hub_spindle_bore_axis";
const HUB_ON_V1 = HUB;
const MOUNT = "gas_spring_mount_213668_002@gas_spring_mount_bushing_bore";
const HUB_SHA = "e28285d1";
const MOUNT_SHA = "6d5b1321";
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

// --- the scratch copy -----------------------------------------------------------
rmSync(SCRATCH, { recursive: true, force: true });
cpSync(join(MAIN, "data", "projections", "viewer"), join(SCRATCH, "projections", "viewer"), { recursive: true });
cpSync(join(MAIN, "data", "inbox", "feature-identity"), join(SCRATCH, "inbox", "feature-identity"), { recursive: true });
const py = spawnSync(join(MAIN, "venv-win", "Scripts", "python.exe"), ["-c", [
  "import sys, json; sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[1] + '/scripts')",
  "from pathlib import Path",
  "import build_topology_projection as B",
  "from tolerance_stack.feature_identity import served_log, fold_with_models, installed_mesh_shas",
  "repo, events, data, scratch = (Path(a) for a in sys.argv[1:5])",
  "topo = B.build(repo / 'docs' / 'topologies', meshes_dir=data / 'meshes')",
  "(scratch / 'projections' / 'viewer' / 'topologies.json').write_text(json.dumps(topo, indent=2) + '\\n', encoding='utf-8')",
  "evs, proj = fold_with_models(events, data)",
  "doc = served_log(evs, installed_mesh_shas(data), proj)",
  "out = scratch / 'projections' / 'viewer' / 'feature-identity' / 'log.json'",
  "out.parent.mkdir(parents=True, exist_ok=True)",
  "out.write_text(json.dumps(doc, indent=2) + '\\n', encoding='utf-8')",
  "print(json.dumps({'events': len(doc['events']), 'summary': proj.summary_line()}))",
].join("\n"), HERE, join(SCRATCH, "inbox", "feature-identity"), join(MAIN, "data"), SCRATCH], { encoding: "utf-8" });
if (py.status !== 0) throw new Error("scratch build: " + py.stderr);
log("scratch", JSON.parse(py.stdout.trim().split("\n").pop()));

// --- the server -------------------------------------------------------------------
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", join(MAIN, "data", "meshes")],
  ["/tolstack/data/", join(SCRATCH, "projections", "viewer")],
];
function folderPath(rel) {
  const r = rel.replace(/^\/+/, "");
  if (r.startsWith("data/inbox/feature-identity")) return { full: join(SCRATCH, "inbox", r.slice(11)), write: true };
  if (r.startsWith("data/projections")) return { full: join(SCRATCH, "projections", r.slice(17)), write: true };
  if (r.startsWith("data/")) return { full: join(MAIN, r), write: false };
  return { full: join(HERE, r), write: false };
}
const server = await new Promise((ok) => {
  const s = createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    try {
      if (u.pathname.startsWith("/fs/")) {
        const target = folderPath(u.searchParams.get("p") || "");
        const verb = u.pathname.slice(4);
        if (verb === "stat") {
          const kind = existsSync(target.full) ? (statSync(target.full).isDirectory() ? "directory" : "file") : null;
          res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ kind }));
        } else if (verb === "list") {
          const out = readdirSync(target.full).map((name) => ({ name,
            kind: statSync(join(target.full, name)).isDirectory() ? "directory" : "file" }));
          res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
        } else if (verb === "read") {
          res.writeHead(200).end(readFileSync(target.full));
        } else if ((verb === "write" || verb === "mkdir") && target.write) {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          if (verb === "mkdir") mkdirSync(target.full, { recursive: true });
          else { mkdirSync(dirname(target.full), { recursive: true }); writeFileSync(target.full, Buffer.concat(chunks)); }
          res.writeHead(200).end("ok");
        } else {
          res.writeHead(403).end("read-only");
        }
        return;
      }
      const path = decodeURIComponent(u.pathname);
      const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
      if (!mount) throw new Error("no mount");
      const full = join(mount[1], normalize(path.slice(mount[0].length)));
      if (!full.startsWith(mount[1] + sep) && full !== mount[1]) throw new Error("outside");
      const body = readFileSync(statSync(full).isDirectory() ? join(full, "index.html") : full);
      res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream",
        "cache-control": "no-cache" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;

const FAKE_PICKER = () => {
  if (!location.pathname.includes("/annotate/")) return;
  const enc = encodeURIComponent;
  const notFound = () => new DOMException("not found", "NotFoundError");
  const stat = async (p) => (await (await fetch("/fs/stat?p=" + enc(p))).json()).kind;
  const join = (a, b) => (a ? a + "/" + b : b);
  const fileHandle = (p) => ({
    kind: "file", name: p.split("/").pop(),
    async getFile() {
      const buf = await (await fetch("/fs/read?p=" + enc(p))).arrayBuffer();
      return { text: async () => new TextDecoder().decode(buf), arrayBuffer: async () => buf };
    },
    async createWritable() {
      const parts = [];
      return { write: async (d) => { parts.push(d); },
        close: async () => { await fetch("/fs/write?p=" + enc(p), { method: "PUT", body: parts.join("") }); } };
    },
  });
  const dirHandle = (p) => ({
    kind: "directory", name: p.split("/").pop() || "tolstack",
    async getDirectoryHandle(name, opts) {
      const q = join(p, name);
      const kind = await stat(q);
      if (kind === "directory") return dirHandle(q);
      if (!kind && opts && opts.create) { await fetch("/fs/mkdir?p=" + enc(q), { method: "POST" }); return dirHandle(q); }
      throw notFound();
    },
    async getFileHandle(name, opts) {
      const q = join(p, name);
      const kind = await stat(q);
      if (kind === "file") return fileHandle(q);
      if (!kind && opts && opts.create) return fileHandle(q);
      throw notFound();
    },
    async *entries() {
      const list = await (await fetch("/fs/list?p=" + enc(p))).json();
      for (const e of list) yield [e.name, e.kind === "directory" ? dirHandle(join(p, e.name)) : fileHandle(join(p, e.name))];
    },
    async queryPermission() { return "granted"; },
    async requestPermission() { return "granted"; },
  });
  window.showDirectoryPicker = async () => dirHandle("");
};

const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));

async function open() {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript(FAKE_PICKER);
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 60000 });
  await page.waitForTimeout(1500);
  return page;
}
async function openPane(page) {
  if (!(await page.locator("#annotate-flyout[open]").count())) await page.locator("#pane-handle").click({ timeout: 15000 });
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => log("pane", "no tree after 120s"));
  await page.waitForTimeout(4000);
}
const featureRow = (page, fid) => page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`).first();
async function showFeature(page, fid) {
  const part = fid.split("@")[0];
  if (!(await featureRow(page, fid).count())) {
    await page.locator(`#navtree [data-nav-twisty="p:${part}"]`).first().click();
    await page.waitForTimeout(400);
  }
  await featureRow(page, fid).scrollIntoViewIfNeeded();
}
async function selectFeature(page, fid) {
  await showFeature(page, fid);
  await featureRow(page, fid).click();
  await page.waitForTimeout(2500);
}
const tree = (page, fid) => page.evaluate((id) => {
  const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
  const li = row && row.parentElement;
  const slot = li && li.querySelector(".navtree__scene");
  return row ? {
    status: row.querySelector(".navtree__mark").getAttribute("data-status"),
    body: slot ? slot.textContent.replace(/\s+/g, " ").trim() : null,
    acts: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : [],
  } : null;
}, fid);
// Every end the feature is that reads bound, in the pane's end view (its one
// choke point every binding reader goes through).
const endsOf = async (page, fid) => {
  const all = await frameOf(page).evaluate((t) => window.__endsBound(t), V2);
  return all.filter((e) => e.feature === fid);
};
const scratchEvents = () => readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;

async function shot(page, name, fid) {
  await page.screenshot({ path: join(SHOTS, name + ".png"), timeout: 180000 });
  log(name, { feature: fid ? await tree(page, fid) : null, scratchEvents: scratchEvents(), errors: page.__errors.splice(0) });
}
async function clickBody(page, fid, text, nth = 0) {
  const li = featureRow(page, fid).locator("xpath=..");
  await li.locator("button", { hasText: text }).nth(nth).click();
}
async function waitBody(page, fid, re, ms = 60000) {
  const t0 = Date.now();
  let now = await tree(page, fid);
  while (Date.now() - t0 < ms && !re.test((now && now.body) || "")) {
    await page.waitForTimeout(500);
    now = await tree(page, fid);
  }
  log("wait " + re, { ms: Date.now() - t0, body: now && now.body });
  return now;
}
// Put the camera in front of one face of an open part, looking at it along
// its own normal from a fraction of its size away -- how a person looks into
// a bore before clicking its wall.
async function aimAtFace(page, shaPrefix, faceId) {
  return frameOf(page).evaluate(({ pre, faceId }) => {
    const sc = window.__scene;
    let mesh = null;
    for (const [k, v] of sc.parts) if (k.startsWith(pre)) mesh = v;
    if (!mesh) return { aimed: false, why: "part not open" };
    mesh.updateMatrixWorld(true);
    const m = mesh.matrixWorld.elements, pos = mesh.geometry.attributes.position.array;
    const idx = mesh.geometry.index.array, per = mesh.userData.faceIdPerTriangle;
    const w = (i) => { const x = pos[3 * i], y = pos[3 * i + 1], z = pos[3 * i + 2];
      return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14]]; };
    const c = [0, 0, 0], n = [0, 0, 0]; let tris = 0;
    for (let t = 0; t < per.length; t++) {
      if (per[t] !== faceId) continue;
      const a = w(idx[3 * t]), b = w(idx[3 * t + 1]), d = w(idx[3 * t + 2]);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
      n[0] += u[1] * v[2] - u[2] * v[1]; n[1] += u[2] * v[0] - u[0] * v[2]; n[2] += u[0] * v[1] - u[1] * v[0];
      for (let k = 0; k < 3; k++) c[k] += (a[k] + b[k] + d[k]) / 3;
      tris++;
    }
    if (!tris) return { aimed: false, why: "no triangles" };
    for (let k = 0; k < 3; k++) c[k] /= tris;
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    const area = len / 2, dist = Math.max(4, Math.sqrt(area) * 0.6);
    const eye = [c[0] + n[0] / len * dist, c[1] + n[1] / len * dist, c[2] + n[2] / len * dist];
    sc.setCameraState({ position: eye, target: c });
    return { aimed: true, centre: c, eye };
  }, { pre: shaPrefix, faceId });
}

// Click a NAMED face of the armed part: scan the scene's own filtered ray
// over the canvas for it, then click there like a person would.
async function clickFace(page, faceId) {
  const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
  const box = await frameEl.boundingBox();
  const canvas = await frameOf(page).evaluate(() => {
    const r = document.querySelector("#canvas-host canvas").getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const hit = await frameOf(page).evaluate((want) => {
    const seen = {};
    for (let gy = -0.95; gy <= 0.95; gy += 0.025) for (let gx = -0.95; gx <= 0.95; gx += 0.025) {
      const h = window.__scene.pick(gx, gy);
      if (h) seen[h.faceId] = true;
      if (h && h.faceId === want) return { fx: (gx + 1) / 2, fy: (1 - gy) / 2 };
    }
    return { missing: Object.keys(seen).slice(0, 40) };
  }, faceId);
  if (!hit.fx) { log("face not on screen", { faceId, seen: hit.missing }); return false; }
  const x = box.x + canvas.x + canvas.w * hit.fx, y = box.y + canvas.y + canvas.h * hit.fy;
  await page.mouse.move(x, y);
  await page.waitForTimeout(600);
  await page.mouse.down();
  await page.mouse.up();
  return true;
}

// --- 01..03: the hub's locating boss -----------------------------------------
let page = await open();
await openPane(page);
await selectFeature(page, HUB);
await shot(page, "01_hub_boss_two_faces_disagree", HUB);
await clickBody(page, HUB, "Keep", 1);
await waitBody(page, HUB, /bound · face 144/);
await page.mouse.move(4, 4);
await page.waitForTimeout(1500);
log("hub ends after Keep", await endsOf(page, HUB));
log("hub ends after Keep, v1", (await frameOf(page).evaluate(() => window.__endsBound("vpa_pitch_linkage")))
  .filter((e) => e.feature === HUB_ON_V1));
if (argv.includes("--diagnose")) process.exit(0);
await shot(page, "02_hub_boss_kept_every_end_bound", HUB);

await clickBody(page, HUB, "Correct");
await page.waitForTimeout(5000);
const classesAt = Date.now();
await frameOf(page).waitForFunction(() => !/classif/i.test(document.body.textContent), null, { timeout: 5000 }).catch(() => null);
if (await clickFace(page, 144)) await waitBody(page, HUB, /2 faces/, 480000);
await page.mouse.move(4, 4);
await page.waitForTimeout(1500);
log("hub ends after the split pick", await endsOf(page, HUB));
await shot(page, "03_hub_boss_split_half_swept", HUB);

// --- 04..05: the gas-spring mount's bushing seats --------------------------------
await selectFeature(page, MOUNT);
await clickBody(page, MOUNT, "Correct");
await page.waitForTimeout(5000);
log("aim at face 53", await aimAtFace(page, MOUNT_SHA, 53));
await page.waitForTimeout(1500);
if (await clickFace(page, 53)) {
  await frameOf(page).waitForSelector("#an-offer.an__offer--on", { timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(1500);
  log("offer", await frameOf(page).evaluate(() => {
    const o = document.getElementById("an-offer");
    return o ? o.textContent : null;
  }));
  await shot(page, "04_bushing_seat_group_offered", MOUNT);
  await frameOf(page).locator('#an-offer [data-offer="all"]').click({ force: true });
  await waitBody(page, MOUNT, /4 faces/, 240000);
}
await page.mouse.move(4, 4);
await page.waitForTimeout(1500);
await shot(page, "05_bushing_seats_both_taken", MOUNT);
await page.close();

// --- 06: a reload, pane closed, reads the same --------------------------------------
page = await open();
for (const fid of [HUB, MOUNT]) { await showFeature(page, fid); log("reload " + fid, await tree(page, fid)); }
await selectFeature(page, MOUNT);
await shot(page, "06_reload_pane_closed", MOUNT);
await page.close();

const written = readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json"))
  .map((n) => JSON.parse(readFileSync(join(SCRATCH, "inbox", "feature-identity", n), "utf-8")))
  .filter((e) => e.schema && e.schema.endsWith("/v1"));
log("v1 events written", written.map((e) => ({ id: e.event_id, verdict: e.verdict, feature: e.feature_key,
  faces: (e.geometry_keys || []).map((g) => g.face_id), supersedes: e.supersedes || null })));
const fold = spawnSync(join(MAIN, "venv-win", "Scripts", "python.exe"), ["-c", [
  "import sys; sys.path.insert(0, sys.argv[1])",
  "from pathlib import Path",
  "from tolerance_stack.feature_identity import fold_with_models",
  "evs, proj = fold_with_models(Path(sys.argv[2]), Path(sys.argv[3]))",
  "print(proj.summary_line())",
].join("\n"), HERE, join(SCRATCH, "inbox", "feature-identity"), join(MAIN, "data")], { encoding: "utf-8" });
log("python folds the scratch log", (fold.stdout || fold.stderr).trim());

await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
