// Hand-run inspection probe for handoff a_binding_shows_the_moment_it_is_made_
// and_is_corrected_where_it_is_shown (2026-11-12). NOT a tier -- pytest never
// collects it. It takes the machine's browser slot itself.
//
// drawing-checker's mounts, reproduced on a private port (webui/analyses.py's
// tolstack_mounts: /tolstack/viewer/, /tolstack/annotate/, /tolstack/data/
// meshes/ before /tolstack/data/), with /tolstack/data/ pointed at a SCRATCH
// copy of the viewer projections and of the feature-identity log -- never the
// real one: data/inbox/feature-identity/ is Jeff's work and nothing here
// writes to it. The pane's folder grant is its real File System Access path
// (storage/fsa.js) handed a directory handle that this server backs with the
// scratch folder, so every write lands there.
//
//   node tests/debug_binding_corrected_where_shown_20261112.mjs [--shots <dir>]
//        [--width 3840] [--keep]
//
// Phase "real" (read-only, the scratch copy untouched): the hub's side of the
// tangential link mount base face bound, the mount's side not; every v2
// feature row's twisty opens to something. Phase "scratch": pick a face on a
// feature with nothing bound, reload, Correct it, reload, Unbind it, reload; shots of each.
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
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_binding_shows_the_moment_it_is_made_and_is_corrected_where_it_is_shown");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "binding_demo_20261112");
const V2 = "vpa_end_stop_v2";
const MOUNT_PART = "tan_link_mount_215175_002";
const MOUNT_FEATURE = MOUNT_PART + "@tan_link_mount_hub_face";
const HUB_FEATURE = "hub@tan_link_mount_hub_face";
// The scratch phase picks a feature with nothing bound and nothing suggested
// (the mount's side carries an open proposal, so its body is the pane's rows).
const PICK_FEATURE = flag("--feature") || "hub@tan_link_mount_fastener_clocking";

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

// Click the scene where the armed part is until a face binds (or N tries).
async function pickInScene(page, fid, before) {
  const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
  const box = await frameEl.boundingBox();
  const canvas = await frameOf(page).evaluate(() => {
    const c = document.querySelector("#canvas-host canvas");
    const r = c.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const offsets = [[0, 0], [0.08, 0], [-0.08, 0], [0, 0.08], [0, -0.08], [0.15, 0.05], [-0.15, -0.05], [0.05, 0.15]];
  for (const [dx, dy] of offsets) {
    const x = box.x + canvas.x + canvas.w * (0.5 + dx), y = box.y + canvas.y + canvas.h * (0.5 + dy);
    await page.mouse.move(x, y);
    await page.waitForTimeout(400);
    await page.mouse.click(x, y);
    await page.waitForTimeout(2500);
    const now = await tree(page, fid);
    if (now && now.body !== before && /bound · face/.test(now.body || "")) return now;
  }
  return await tree(page, fid);
}

// --- phase real (read-only: the scratch copy is still the real log) -----------
if (!argv.includes("--skip-real")) {
  const page = await open();
  log("real: before the pane", { hub: await (async () => { await showFeature(page, HUB_FEATURE); return tree(page, HUB_FEATURE); })(),
    mount: await (async () => { await showFeature(page, MOUNT_FEATURE); return tree(page, MOUNT_FEATURE); })() });
  await openPane(page);
  await selectFeature(page, HUB_FEATURE);
  await shot(page, "01_real_hub_side_bound", HUB_FEATURE);
  await selectFeature(page, MOUNT_FEATURE);
  await shot(page, "02_real_mount_side_unbound", MOUNT_FEATURE);
  // Every v2 feature: open its body, and count a twisty that opens to nothing.
  const parts = await page.evaluate(() => Array.from(document.querySelectorAll('#navtree [data-nav-twisty^="p:"]'))
    .map((b) => b.getAttribute("data-nav-twisty").slice(2)));
  const walk = { features: 0, twisty: 0, empty: [] };
  for (const part of parts) {
    const twisty = page.locator(`#navtree [data-nav-twisty="p:${part}"]`).first();
    if ((await twisty.getAttribute("aria-expanded")) !== "true") { await twisty.click(); await page.waitForTimeout(300); }
    const rows = await page.evaluate((p) => Array.from(document.querySelectorAll(`#navtree [data-nav-kind="feature"]`))
      .map((r) => r.getAttribute("data-nav-id")).filter((id) => id.startsWith(p + "@")), part);
    for (const fid of rows) {
      walk.features++;
      const t = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
      if (!(await t.count())) continue;
      walk.twisty++;
      if ((await t.getAttribute("aria-expanded")) !== "true") { await t.click(); await page.waitForTimeout(250); }
      const body = await tree(page, fid);
      if (!body || !body.body) walk.empty.push(fid);
    }
  }
  log("real: twisty walk", walk);
  await shot(page, "03_real_every_feature_open", null);
  await page.close();
}

// --- phase scratch: bind, reload, correct, reload, unbind, reload ------------
{
  let page = await open();
  await openPane(page);
  await selectFeature(page, PICK_FEATURE);
  const before = await tree(page, PICK_FEATURE);
  await clickBody(page, PICK_FEATURE, "Pick a face");
  await page.waitForTimeout(4000);
  await shot(page, "04_pick_armed", PICK_FEATURE);
  const bound = await pickInScene(page, PICK_FEATURE, before.body);
  log("bound", bound);
  await page.mouse.move(4, 4);
  await page.waitForTimeout(1500);
  await shot(page, "05_bound_no_reload", PICK_FEATURE);
  await page.close();

  page = await open();
  log("reloaded, pane closed", { mount: await (async () => { await showFeature(page, PICK_FEATURE); return tree(page, PICK_FEATURE); })() });
  await openPane(page);
  await selectFeature(page, PICK_FEATURE);
  // Hover the bound line: its face is washed in the scene.
  await featureRow(page, PICK_FEATURE).locator("xpath=..").locator(".navtree__featurestate[data-face]").first().hover();
  await page.waitForTimeout(1500);
  log("hover bound line", await frameOf(page).evaluate(() => window.__lastWash || null));
  await shot(page, "06_bound_after_reload_green", PICK_FEATURE);
  await page.mouse.move(4, 4);

  const was = (await tree(page, PICK_FEATURE)).body;
  await clickBody(page, PICK_FEATURE, "Correct");
  await page.waitForTimeout(4000);
  const corrected = await pickInScene(page, PICK_FEATURE, was);
  log("corrected", { from: was, to: corrected });
  await page.mouse.move(4, 4);
  await page.waitForTimeout(1500);
  await shot(page, "07_corrected_no_reload", PICK_FEATURE);
  await page.close();

  page = await open();
  await openPane(page);
  await selectFeature(page, PICK_FEATURE);
  await shot(page, "08_corrected_after_reload", PICK_FEATURE);
  await clickBody(page, PICK_FEATURE, "Unbind");
  await page.waitForTimeout(4000);
  await shot(page, "09_unbound_no_reload", PICK_FEATURE);
  await page.close();

  page = await open();
  await openPane(page);
  await selectFeature(page, PICK_FEATURE);
  await shot(page, "10_unbound_after_reload", PICK_FEATURE);
  log("orphan line", await page.evaluate(() => {
    const f = document.querySelector(".navtree__orphans");
    return f ? { head: f.querySelector(".navtree__orphanwords").textContent,
      rows: Array.from(f.querySelectorAll("li")).map((li) => li.textContent) } : null;
  }));
  await page.close();
}

await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
