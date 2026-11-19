// Hand-run inspection probe for handoff a_disagreement_is_settled_by_keep_or_
// let_go (2026-11-18). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
// The 2026-11-15 probe's server and folder grant (tests/debug_mate_ranking_
// 20261115.mjs): drawing-checker's mounts on a private port, /tolstack/data/
// pointed at a SCRATCH copy of the viewer projections and of Jeff's feature-
// identity log -- never the real one, whose file count it prints before and
// after. Each run starts from a fresh copy.
//
//   node tests/debug_keep_or_let_go_20261118.mjs [--shots <dir>] [--width 2400] [--annotate <dir>] [--keep]
//
// One: the pitch plate's link bore reads two sets disagreeing; Keep on
// "faces 1380, 1381" writes one event and the feature reads bound to that
// set at every site. Two: the same from a fresh copy with Unbind. Three: armed
// on the now-unbound bore, a double click on a face writes one event.
// `--annotate <dir>` serves another tree's apps/annotate (an export of the
// integration tip, to see the double write before the fix).
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
const WIDTH = Number(flag("--width") || 2400);
const ANNOTATE = flag("--annotate") ? resolve(flag("--annotate")) : join(HERE, "apps", "annotate");
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_disagreement_is_settled_by_keep_or_let_go");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "keep_or_let_go_20261118");
const V1 = "vpa_pitch_linkage";
const BORE = "pitch_plate_215177_001@pitch_plate_link_attach_bore";
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).length;
log("real log files, before", realEvents());

// --- a fresh scratch copy: the viewer projections and the log, then the
// served log rebuilt from the copy
function freshScratch() {
  rmSync(SCRATCH, { recursive: true, force: true });
  cpSync(join(MAIN, "data", "projections", "viewer"), join(SCRATCH, "projections", "viewer"), { recursive: true });
  cpSync(join(MAIN, "data", "inbox", "feature-identity"), join(SCRATCH, "inbox", "feature-identity"), { recursive: true });
  const py = spawnSync(join(MAIN, "venv-win", "Scripts", "python.exe"), ["-c", [
    "import sys, json; sys.path.insert(0, sys.argv[1])",
    "from pathlib import Path",
    "from tolerance_stack.feature_identity import served_log, load_events, installed_mesh_shas",
    "doc = served_log(load_events(sys.argv[2]), installed_mesh_shas(Path(sys.argv[3])))",
    "out = Path(sys.argv[4]); out.parent.mkdir(parents=True, exist_ok=True)",
    "out.write_text(json.dumps(doc, indent=2) + '\\n', encoding='utf-8'); print(len(doc['events']))",
  ].join("\n"), HERE, join(SCRATCH, "inbox", "feature-identity"), join(MAIN, "data"),
    join(SCRATCH, "projections", "viewer", "feature-identity", "log.json")], { encoding: "utf-8" });
  if (py.status !== 0) throw new Error("served log: " + py.stderr);
  log("scratch log events", Number(py.stdout.trim()));
}

// --- the server: drawing-checker's mounts, and the folder the fake grant reads
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", ANNOTATE],
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

// The pane's showDirectoryPicker, backed by /fs/ (installed in every frame).
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
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1400 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript(FAKE_PICKER);
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V1}`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 60000 }).catch(() => log("map", "not drawn in 60s"));
  await page.waitForTimeout(1500);
  if (!(await page.locator("#annotate-flyout[open]").count())) await page.locator("#pane-handle").click({ timeout: 15000 });
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => log("pane", "no tree after 120s"));
  await page.waitForTimeout(4000);
  return page;
}

const featureRow = (page, fid) => page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`).first();
async function openBody(page, fid) {
  // The part may sit inside an assembly or a closed body: open every closed
  // twisty on the way that names the plate, a round at a time.
  for (let round = 0; round < 5 && !(await featureRow(page, fid).count()); round++) {
    const keys = await page.evaluate(() => Array.from(document.querySelectorAll("#navtree [data-nav-twisty]"))
      .filter((b) => b.getAttribute("aria-expanded") !== "true").map((b) => b.getAttribute("data-nav-twisty")));
    const next = keys.filter((k) => /pitch_plate|^b:/.test(k) && !k.startsWith("f:"));
    if (round === 0) log("closed twisties", keys.slice(0, 40));
    if (!next.length) break;
    for (const k of next) {
      await page.locator(`#navtree [data-nav-twisty="${k}"]`).first().click({ noWaitAfter: true }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
  await featureRow(page, fid).scrollIntoViewIfNeeded();
  const t = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
  if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") await t.click({ noWaitAfter: true });
  await page.waitForTimeout(800);
}
const bodyOf = (page, fid) => page.evaluate((id) => {
  const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
  const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
  const body = slot && slot.querySelector(".navtree__featurebody");
  const mark = row && row.querySelector(".navtree__mark");
  return {
    treeMark: mark ? mark.getAttribute("data-status") : null,
    kind: body ? body.getAttribute("data-body-kind") : null,
    lines: slot ? Array.from(slot.querySelectorAll(".navtree__featurewords")).map((l) => l.textContent) : [],
    acts: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : [],
  };
}, fid);
// Every site the outcome reaches: the tree row's mark and the body (the
// shell's record), and the pane's lit (bound) faces on the plate's mesh.
const sites = async (page) => ({
  body: await bodyOf(page, BORE),
  // what the sweep rail's rows read: the pane's end view, at the bore's ends
  endsBound: await frameOf(page).evaluate(() => (window.__endsBound ? window.__endsBound("vpa_pitch_linkage") : [])
    .filter((e) => JSON.stringify(e).indexOf("pitch_plate_link_attach_bore") !== -1)
    .map((e) => e.edge + ":" + e.end + "=" + JSON.stringify(e.face && (e.face.face_id || e.face.faceId || e.face)))),
  paneBoundMarks: await frameOf(page).evaluate(() => window.__scene
    ? window.__scene.listMarks("bound").filter((m) => String(m.sha256).startsWith("37e9f606")).map((m) => m.faceId).sort()
    : null),
});
const scratchFiles = () => readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).sort();
async function waitFiles(n, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms && scratchFiles().length < n) await new Promise((r) => setTimeout(r, 300));
}
async function waitBody(page, pred, ms) {
  const t0 = Date.now();
  let b = await bodyOf(page, BORE);
  while (Date.now() - t0 < ms && !pred(b)) { await page.waitForTimeout(500); b = await bodyOf(page, BORE); }
  return b;
}
async function shot(page, name) {
  const row = featureRow(page, BORE);
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: join(SHOTS, name + ".png"), timeout: 180000 });
  log(name, { sites: await sites(page), errors: page.__errors.splice(0) });
}
const newest = (before) => scratchFiles().filter((n) => before.indexOf(n) === -1)
  .map((n) => ({ file: n, event: JSON.parse(readFileSync(join(SCRATCH, "inbox", "feature-identity", n), "utf-8")) }));
const brief = (x) => ({ file: x.file, seq: x.event.seq, verdict: x.event.verdict,
  faces: (x.event.geometry_keys || []).map((g) => g.face_id), supersedes: x.event.supersedes || null,
  retracts: x.event.retracts || null });

// Armed on the bore, two clicks on one face of the plate 60 ms apart (down,
// up, down, up -- what a double click sends). Counts what was written.
async function doubleClick(page, armedShot, afterShot) {
  const before = scratchFiles();
  await featureRow(page, BORE).locator("xpath=..").locator("button", { hasText: "Pick a face" }).first().click({ noWaitAfter: true });
  await page.waitForTimeout(4000);
  const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
  const box = await frameEl.boundingBox();
  const canvas = await frameOf(page).evaluate(() => {
    const r = document.querySelector("#canvas-host canvas").getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  // `--face N`: the first point on screen where that face is under the pointer.
  const want = flag("--face") ? Number(flag("--face")) : null;
  const hit = await frameOf(page).evaluate((wanted) => {
    const step = wanted === null ? 0.05 : 0.01;
    for (let gy = -0.95; gy <= 0.95; gy += step) for (let gx = -0.95; gx <= 0.95; gx += step) {
      const h = window.__scene.pick(gx, gy);
      if (h && (wanted === null || h.faceId === wanted)) return { fx: (gx + 1) / 2, fy: (1 - gy) / 2, faceId: h.faceId };
    }
    return null;
  }, want);
  log("armed: a face under the pointer", hit);
  await shot(page, armedShot + "_armed");
  if (!hit) return;
  const x = box.x + canvas.x + canvas.w * hit.fx, y = box.y + canvas.y + canvas.h * hit.fy;
  await page.mouse.move(x, y);
  await page.waitForTimeout(500);
  if (argv.includes("--direct")) {
    // The scene's own release handler, twice before either has returned: what
    // a second click does when it lands while the first is still being read.
    log("two picks handed to the pane at once", await frameOf(page).evaluate((h) => {
      const s = window.__scene;
      const hit = s.pick(h.fx * 2 - 1, 1 - h.fy * 2);
      s.onPick(hit, null, null, {});
      s.onPick(hit, null, null, {});
      return hit && hit.faceId;
    }, hit));
  } else {
    await page.mouse.down(); await page.mouse.up();
    await page.waitForTimeout(60);
    await page.mouse.down(); await page.mouse.up();
  }
  const t0 = Date.now();
  await page.waitForTimeout(800);
  log("while the click is read", await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine || null));
  await page.screenshot({ path: join(SHOTS, armedShot + "_reading_the_click.png"), timeout: 180000 });
  await waitFiles(before.length + 1, 180000);
  log("the first click wrote after ms", Date.now() - t0);
  await page.waitForTimeout(8000);
  log("the double click wrote", newest(before).map(brief));
  const t1 = Date.now();
  const settled = await waitBody(page, (b) => b.kind === "bound", 120000);
  log("the body reads bound after ms more", { ms: Date.now() - t1, kind: settled.kind });
  await shot(page, afterShot + "_after_double_click");
}

const only = flag("--only");

if (!only || only === "keep") {
  freshScratch();
  const page = await open();
  await openBody(page, BORE);
  await shot(page, "01_before_two_sets_disagree");
  const before = scratchFiles();
  const line = featureRow(page, BORE).locator("xpath=..").locator(".navtree__featurestate", { hasText: "faces 1380, 1381" }).first();
  await line.locator("xpath=following-sibling::*[1]").locator("button", { hasText: "Keep" }).first()
    .click({ noWaitAfter: true }).catch(async () => {
      // the line's actions are a line of their own under it
      await featureRow(page, BORE).locator("xpath=..").locator("button", { hasText: "Keep" }).first().click({ noWaitAfter: true });
    });
  await waitFiles(before.length + 1, 60000);
  await page.waitForTimeout(3000);
  log("Keep wrote", newest(before).map(brief));
  await waitBody(page, (b) => b.kind === "bound", 60000);
  await openBody(page, BORE);
  await shot(page, "02_after_keep_one_set_bound");
  await page.close();
}

if (!only || only === "unbind") {
  freshScratch();
  const page = await open();
  await openBody(page, BORE);
  const before = scratchFiles();
  await featureRow(page, BORE).locator("xpath=..").locator("button", { hasText: "Unbind" }).first().click({ noWaitAfter: true });
  await waitFiles(before.length + 1, 60000);
  await page.waitForTimeout(3000);
  log("Unbind wrote", newest(before).map(brief));
  await waitBody(page, (b) => b.kind !== "disagree", 60000);
  await openBody(page, BORE);
  await shot(page, "03_after_unbind_not_bound");
  await doubleClick(page, "04", "05");
  await page.close();
}

// The pre-fix pane (`--annotate <export of integration>`) cannot unbind a
// disagreement, so this run arms Pick a face on the disagreeing bore as it is:
// a plain pick there binds, on either tree.
if (only === "dbl") {
  freshScratch();
  const page = await open();
  await openBody(page, BORE);
  await doubleClick(page, "06", "07");
  await page.close();
}

// Two Takes of face 1380 at the bore's end of the attach-radius edge, both
// started before either returns -- what a double press on a mirrored row's
// Take does: the shell's row gesture reaches the pane as a button click and
// runs AA.exec directly, unqueued (app.js railGesture -> railExec).
if (only === "take") {
  freshScratch();
  const page = await open();
  const before = scratchFiles();
  log("two takes at once", await frameOf(page).evaluate(async () => {
    const AA = window.AnnotateApp, VA = window.ViewerApp;
    const sha = "37e9f606341bfd194c2c51ae7517861ecdf1221bd4d262697f4d732b194d5801";
    const topo = (await (await fetch("/tolstack/data/topologies.json")).json()).topologies
      .find((t) => t.id === "vpa_pitch_linkage");
    const end = ["from", "to"].find((d) => {
      const k = VA.endFeatureKey(topo, "pitch_plate_attach_radius", d);
      return k && k.node === "pitch_plate_link_attach_bore";
    });
    await AA.exec(["open-part", sha]);
    const cmd = ["take", "pitch_plate_attach_radius", end, sha, "1380", "vpa_pitch_linkage"];
    const out = await Promise.all([AA.exec(cmd), AA.exec(cmd)].map((p) => p.then(
      (r) => (r && r.action) || r, (e) => "threw: " + e.message)));
    return { end, out };
  }));
  await waitFiles(before.length + 1, 120000);
  await page.waitForTimeout(15000);
  log("the two takes wrote", newest(before).map(brief));
  await page.close();
}

log("real log files, after", realEvents());
await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
