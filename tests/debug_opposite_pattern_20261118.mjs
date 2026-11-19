// Hand-run inspection probe for handoff a_bound_pattern_offers_the_whole_
// pattern_on_the_other_part (2026-11-18). NOT a tier -- pytest never collects
// it. It takes the machine's browser slot itself.
//
// The 2026-11-15 probe's server and folder grant, unchanged: drawing-checker's
// mounts on a private port, /tolstack/data/ pointed at a SCRATCH copy of the
// viewer projections and of the feature-identity log -- never the real one,
// whose event count it prints before and after.
//
//   node tests/debug_opposite_pattern_20261118.mjs [--shots <dir>] [--width 2560] [--keep]
//
// The piston body's fastener pattern (gas_spring_piston_fastener_clocking):
// the pitch plate's side bound in the copy through the like-holes bar, then
// the piston body's side offered whole -- at rest, hovered (the set washed),
// and after its Take.
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
const WIDTH = Number(flag("--width") || 2560);
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_bound_pattern_offers_the_whole_pattern_on_the_other_part");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "opposite_pattern_20261118");
const V2 = "vpa_end_stop_v2";

// --- the scratch copy: the viewer projections and the log, then the served log
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
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));
log("scratch log events", Number(py.stdout.trim()));

// --- the server: drawing-checker's mounts, and the folder the fake grant reads
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", join(MAIN, "data", "meshes")],
  ["/tolstack/data/", join(SCRATCH, "projections", "viewer")],
];
// The "repo root" the fake folder grant sees: writes land only in SCRATCH.
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

async function open(query) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1440 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript(FAKE_PICKER);
  await page.goto(`${url}/tolstack/viewer/topology.html?${query || "topology=" + V2}`, { waitUntil: "load" });
  await page.waitForSelector(`#navtree [data-nav-kind="feature"], #navtree [data-nav-twisty]`, { timeout: 60000 });
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
    twisty: !!row.querySelector("[data-nav-twisty]"),
    body: slot ? slot.textContent.replace(/\s+/g, " ").trim() : null,
    acts: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : [],
  } : null;
}, fid);
const paneState = (page) => frameOf(page).evaluate(() => ({
  armed: !!document.defaultView.__embedTree && document.defaultView.__embedTree.armed,
  boundMarks: window.__scene ? window.__scene.listMarks("bound").length : null,
  servedLogMs: window.__lastServedLogMs === undefined ? null : Math.round(window.__lastServedLogMs),
}));
const scratchEvents = () => readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;
const servedEvents = () => JSON.parse(readFileSync(join(SCRATCH, "projections", "viewer", "feature-identity", "log.json"), "utf-8")).events.length;

async function shot(page, name, fid) {
  await page.screenshot({ path: join(SHOTS, name + ".png"), timeout: 180000 });
  log(name, { feature: fid ? await tree(page, fid) : null, pane: frameOf(page) ? await paneState(page) : null,
    scratchEvents: scratchEvents(), servedEvents: servedEvents(), errors: page.__errors.splice(0) });
}

async function clickBody(page, fid, text) {
  const li = featureRow(page, fid).locator("xpath=..");
  await li.locator("button", { hasText: text }).first().click();
}


// --- the probe -------------------------------------------------------------------
const PIECE = "gas_spring_piston_fastener_clocking";
const PLATE = "pitch_plate_215177_001@" + PIECE;
const PISTON = "gas_spring_piston_214700_002@" + PIECE;
const PLATE_SHA = "37e9f606341bfd194c2c51ae7517861ecdf1221bd4d262697f4d732b194d5801";
const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;
log("real log events, before", realEvents());
const bodyOf = (page, fid) => page.evaluate((id) => {
  const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
  const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
  return slot ? Array.from(slot.querySelectorAll(".navtree__featurestate")).map((l) =>
    [((l.querySelector(".navtree__featurewords") || {}).textContent || ""),
      ((l.querySelector(".navtree__featuresub") || {}).textContent || "")].filter(Boolean).join(" / ")) : [];
}, fid);
const openBody = async (page, fid) => {
  await showFeature(page, fid);
  const t = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
  if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") await t.click();
  await page.waitForTimeout(800);
};
const newest = () => {
  const dir = join(SCRATCH, "inbox", "feature-identity");
  const name = readdirSync(dir).filter((n) => /^\d{4}_/.test(n)).sort().pop();
  return { name, event: JSON.parse(readFileSync(join(dir, name), "utf-8")) };
};
async function waitWrite(page, before, ms = 60000) {
  const t0 = Date.now();
  while (scratchEvents() <= before && Date.now() - t0 < ms) await page.waitForTimeout(250);
  return Date.now() - t0;
}
{
  const page = await open();
  await openPane(page);
  // One side bound in the copy: the pitch plate's five holes, by an armed
  // click on one of them and the like-holes bar's Take all.
  await openBody(page, PLATE);
  log("pitch plate body, before", await bodyOf(page, PLATE));
  log("piston body, before", (await openBody(page, PISTON), await bodyOf(page, PISTON)));
  await clickBody(page, PLATE, "Pick a face");
  await frameOf(page).waitForFunction((s) => window.__scene && window.__scene.faceRecord(s, 2), PLATE_SHA, { timeout: 120000 });
  await frameOf(page).evaluate((s) => window.__scene.onPick({ sha256: s, faceId: 2 }, null, null, { shift: false }), PLATE_SHA);
  await frameOf(page).waitForSelector("#an-offer.an__offer--on", { timeout: 120000 });
  log("pitch plate offer", await frameOf(page).evaluate(() => document.querySelector("#an-offer").textContent));
  let before = scratchEvents();
  await frameOf(page).locator('#an-offer [data-offer="all"]').click();
  log("pitch plate Take all -> written ms", await waitWrite(page, before));
  log("pitch plate event", { file: newest().name, faces: newest().event.geometry_keys.map((g) => g.face_id) });
  await shot(page, "01_pitch_plate_side_bound_in_the_copy", PLATE);
  // The other side: the piston body's row, at rest.
  await openBody(page, PISTON);
  const t0 = Date.now();
  let lines = await bodyOf(page, PISTON);
  while (!lines.some((l) => / of \d+ holes /.test(l)) && Date.now() - t0 < 120000) {
    await page.waitForTimeout(500);
    lines = await bodyOf(page, PISTON);
  }
  log("piston body, offered", lines);
  const line = featureRow(page, PISTON).locator("xpath=..").locator(".navtree__featurestate", { hasText: " of 5 holes" }).first();
  // A click on the line turns the pane to the set (camera face <ids>).
  await line.click();
  await page.waitForTimeout(3000);
  await page.mouse.move(5, 5);
  await page.waitForTimeout(1000);
  await shot(page, "02_piston_row_at_rest", PISTON);
  await line.hover();
  await frameOf(page).waitForFunction(() => window.__lastWash && (window.__lastWash.faceIds || []).length > 1, null, { timeout: 15000 }).catch(() => {});
  log("hovered wash", await frameOf(page).evaluate(() => window.__lastWash && { faceIds: window.__lastWash.faceIds, overlays: window.__lastWash.overlays }));
  await page.waitForTimeout(800);
  await shot(page, "03_piston_row_hovered_set_lit", PISTON);
  before = scratchEvents();
  await line.locator("button", { hasText: "Take" }).first().click();
  log("Take -> written ms", await waitWrite(page, before));
  const took = newest();
  log("Take wrote", { file: took.name, verdict: took.event.verdict, key: took.event.feature_key,
    faces: took.event.geometry_keys.map((g) => g.face_id) });
  await page.mouse.move(5, 5);
  const t1 = Date.now();
  lines = await bodyOf(page, PISTON);
  while (!/faces of/.test(lines[0] || "") && Date.now() - t1 < 120000) { await page.waitForTimeout(500); lines = await bodyOf(page, PISTON); }
  await page.waitForTimeout(2000);
  log("piston body, after Take", await bodyOf(page, PISTON));
  await shot(page, "04_piston_after_take", PISTON);
  await page.close();
}
log("real log events, after", realEvents());

await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
