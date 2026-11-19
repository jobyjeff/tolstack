// Hand-run inspection probe for handoff a_bind_on_the_pitch_plate_writes_in_
// seconds_and_says_so_while_it_waits (2026-11-19). NOT a tier -- pytest never
// collects it. It takes the machine's browser slot itself.
//
// The keep-or-let-go probe's server and folder grant (tests/debug_keep_or_
// let_go_20261118.mjs): drawing-checker's mounts on a private port,
// /tolstack/data/ pointed at a SCRATCH copy of the viewer projections and of
// Jeff's feature-identity log -- never the real one, whose file count it
// prints before and after. Each press starts from a fresh copy.
//
//   node tests/debug_bind_latency_20261119.mjs [--only keep|unbind|take|armed] [--settle] [--shots <dir>] [--annotate <dir>]
//
// Each press on the pitch plate's link bore prints: the pane's own step
// clock (window.__writeSteps: every step of the write and its ms, and how
// long the command waited in the pane's queue), the folder operations the
// grant was asked for (each one an HTTP round trip HERE, a browser call on
// the real grant), press -> event on disk, press -> the body changes, and
// what the pressed control read one frame after the press. `--settle` waits
// for the pane to finish opening the model before pressing (the map-pin
// lesson's `scene-view` sentinel); without it the press lands as the walk's
// did, a few seconds after the body is drawn.
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
  "docs/sessions/lessons/shots/a_bind_on_the_pitch_plate_writes_in_seconds_and_says_so_while_it_waits");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "bind_latency_20261119");
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

let fsOps = 0;
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
        fsOps += 1;
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

const scratchFiles = () => readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).sort();
const newest = (before) => scratchFiles().filter((n) => before.indexOf(n) === -1);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The pane has run everything the page posted before this (the map-pin
// lesson's sentinel): an `annotate:result` comes back only after the queue
// reaches it.
async function paneSettled(page) {
  const t0 = Date.now();
  const ok = await page.evaluate(() => new Promise((res) => {
    const f = document.querySelector("#annotate-flyout iframe");
    const id = "settle-" + Date.now();
    window.addEventListener("message", function h(e) {
      if (e.data && e.data.type === "annotate:result" && e.data.id === id) { window.removeEventListener("message", h); res(true); }
    });
    f.contentWindow.postMessage({ type: "annotate:exec", id, command: ["scene-view"] }, location.origin);
    setTimeout(() => res(false), 180000);
  }));
  log("pane settled", { ok, ms: Date.now() - t0 });
}

// Watch the bore's body for a change of its lines or kind (not of a button's
// own words), timed in page time from the press.
const watchBody = (page, kindOnly) => page.evaluate(({ fid, kindOnly }) => {
  const sig = () => {
    const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`);
    const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
    const body = slot && slot.querySelector(".navtree__featurebody");
    return JSON.stringify([body && body.getAttribute("data-body-kind"), kindOnly ? [] :
      (slot ? Array.from(slot.querySelectorAll(".navtree__featurewords")).map((l) => l.textContent) : [])]);
  };
  if (window.__pressObs) window.__pressObs.disconnect();
  window.__pressSig0 = sig();
  window.__bodyChangedAt = null;
  window.__identityApplied = null;
  const obs = new MutationObserver(() => {
    if (window.__bodyChangedAt === null && sig() !== window.__pressSig0) window.__bodyChangedAt = performance.now();
  });
  obs.observe(document.getElementById("navtree"), { subtree: true, childList: true, characterData: true, attributes: true });
  window.__pressObs = obs;
}, { fid: BORE, kindOnly: !!kindOnly });

// Press a body button (found in the page by `findSrc`, a function body over
// the bore's slot), read it one frame later, then time the write.
async function pressBody(page, name, findSrc, shotName) {
  const before = scratchFiles();
  const ops0 = fsOps;
  await watchBody(page);
  const t0 = Date.now();
  const atOnce = await page.evaluate(async ({ fid, findSrc }) => {
    const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${fid}"]`);
    const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
    const btn = slot ? (new Function("slot", findSrc))(slot) : null;
    if (!btn) return { found: false, buttons: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : null };
    const word = btn.textContent;
    btn.click();
    window.__pressT0 = performance.now();
    await new Promise((r) => requestAnimationFrame(() => r()));
    // The pressed control, or the one drawn in its place by a repaint.
    const now = slot.querySelector('[data-pending]') || btn;
    return { found: true, word, oneFrameLater: { text: now.textContent, disabled: !!now.disabled,
      pending: now.getAttribute("data-pending"), connected: now.isConnected } };
  }, { fid: BORE, findSrc });
  log(name + ": the control one frame after the press", atOnce);
  if (!atOnce.found) return null;
  if (shotName) {
    const row = page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${BORE}"]`).first().locator("xpath=..");
    await row.screenshot({ path: join(SHOTS, shotName + ".png"), timeout: 30000 }).catch((e) => log("shot", e.message));
  }
  return timeWrite(page, name, before, ops0, t0);
}

async function timeWrite(page, name, before, ops0, t0) {
  let onDisk = null;
  let changed = null;
  while (Date.now() - t0 < 180000) {
    if (onDisk === null && newest(before).length) onDisk = Date.now() - t0;
    changed = await page.evaluate(() => window.__bodyChangedAt === null ? null : window.__bodyChangedAt - window.__pressT0);
    if (onDisk !== null && changed !== null) break;
    await sleep(100);
  }
  // The pane's clock is read once the write has finished (its `total`) and
  // the served log is rewritten behind it (`published`).
  for (let i = 0; i < 600; i++) {
    if (await frameOf(page).evaluate(() => !!(window.__writeSteps && window.__writeSteps.total !== null &&
      window.__writeSteps.published !== undefined))) break;
    await sleep(100);
  }
  await sleep(500);
  const out = {
    pressToDiskMs: onDisk,
    pressToBodyMs: changed === null ? null : Math.round(changed),
    written: newest(before),
    folderOps: fsOps - ops0,
    paneSteps: await frameOf(page).evaluate(() => window.__writeSteps || null),
    shellApplied: await page.evaluate(() => window.__identityApplied || null),
    body: await bodyOf(page, BORE),
    errors: page.__errors.splice(0),
  };
  log(name, out);
  return out;
}

async function shot(page, name) {
  const row = page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${BORE}"]`).first().locator("xpath=..");
  await row.screenshot({ path: join(SHOTS, name + ".png"), timeout: 30000 }).catch((e) => log("shot", e.message));
}

const only = flag("--only");
const settle = argv.includes("--settle");
const KEEP_FIND = `
  const line = Array.from(slot.querySelectorAll(".navtree__featurestate"))
    .find((l) => (l.querySelector(".navtree__featurewords") || {}).textContent === "faces 1380, 1381");
  const acts = line && line.nextElementSibling;
  return acts ? Array.from(acts.querySelectorAll("button")).find((b) => b.textContent === "Keep") : null;`;
const BUTTON_FIND = (text) => `return Array.from(slot.querySelectorAll("button")).find((b) => b.textContent === ${JSON.stringify(text)}) || null;`;

async function fresh() {
  freshScratch();
  const page = await open();
  await openBody(page, BORE);
  if (settle) await paneSettled(page);
  log("body before", await bodyOf(page, BORE));
  return page;
}

if (!only || only === "keep") {
  const page = await fresh();
  await pressBody(page, "keep", KEEP_FIND, "keep_pressed");
  await shot(page, "keep_after");
  await page.close();
}

if (!only || only === "unbind" || only === "armed") {
  const page = await fresh();
  await pressBody(page, "unbind", BUTTON_FIND("Unbind"), only === "unbind" ? "unbind_pressed" : null);
  if (!only || only === "armed") {
    // Armed on the now-unbound bore: one click on a face of the plate.
    await page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${BORE}"]`).first().locator("xpath=..")
      .locator("button", { hasText: "Pick a face" }).first().click({ noWaitAfter: true });
    await page.waitForTimeout(4000);
    const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
    const box = await frameEl.boundingBox();
    const canvas = await frameOf(page).evaluate(() => {
      const r = document.querySelector("#canvas-host canvas").getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
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
    if (hit) {
      await page.mouse.move(box.x + canvas.x + canvas.w * hit.fx, box.y + canvas.y + canvas.h * hit.fy);
      await page.waitForTimeout(500);
      const before = scratchFiles();
      const ops0 = fsOps;
      await watchBody(page, true);
      const t0 = Date.now();
      await page.evaluate(() => { window.__pressT0 = performance.now(); });
      await page.mouse.down(); await page.mouse.up();
      await page.waitForTimeout(300);
      log("armed: the line while the click is read", await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine || null));
      await timeWrite(page, "armed click", before, ops0, t0);
    }
  }
  await page.close();
}

// A Take of face 1380 at the bore's end of the attach-radius edge, posted as
// the shell's body posts it (annotate:exec), on the unbound bore.
if (only === "take") {
  const page = await fresh();
  await pressBody(page, "unbind", BUTTON_FIND("Unbind"));
  const end = await frameOf(page).evaluate(async () => {
    const VA = window.ViewerApp;
    const topo = (await (await fetch("/tolstack/data/topologies.json")).json()).topologies.find((t) => t.id === "vpa_pitch_linkage");
    return ["from", "to"].find((d) => {
      const k = VA.endFeatureKey(topo, "pitch_plate_attach_radius", d);
      return k && k.node === "pitch_plate_link_attach_bore";
    });
  });
  const before = scratchFiles();
  const ops0 = fsOps;
  await watchBody(page);
  const t0 = Date.now();
  await page.evaluate((end) => {
    window.__pressT0 = performance.now();
    document.querySelector("#annotate-flyout iframe").contentWindow.postMessage({ type: "annotate:exec",
      command: ["take", "pitch_plate_attach_radius", end,
        "37e9f606341bfd194c2c51ae7517861ecdf1221bd4d262697f4d732b194d5801", "1380", "vpa_pitch_linkage"] }, location.origin);
  }, end);
  await timeWrite(page, "take", before, ops0, t0);
  await page.close();
}

log("real log files, after", realEvents());
await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
