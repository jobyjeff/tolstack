// Hand-run inspection probe for handoff a_suggestion_names_its_face_and_the_
// mating_side_ranks_the_candidates (2026-11-15). NOT a tier -- pytest never
// collects it. It takes the machine's browser slot itself.
//
// The 2026-11-12 probe's server and folder grant, unchanged: drawing-checker's
// mounts on a private port, /tolstack/data/ pointed at a SCRATCH copy of the
// viewer projections and of the feature-identity log -- never the real one,
// whose event count it prints before and after.
//
//   node tests/debug_mate_ranking_20261115.mjs [--shots <dir>] [--width 3840] [--keep]
//
// One: the tangential link mount base face's suggestion line names its face,
// hover lights it, a click turns the pane to it, Take binds it (a filmstrip of
// the four). Two: the hub's blade-1 bore unbound with the blade's seat bound
// opens to the faces coaxial with that seat; armed, they are pre-lit.
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
  "docs/sessions/lessons/shots/a_suggestion_names_its_face_and_the_mating_side_ranks_the_candidates");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "mate_ranking_20261115");
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
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript(FAKE_PICKER);
  await page.goto(`${url}/tolstack/viewer/topology.html?${query || "topology=" + V2}`, { waitUntil: "load" });
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
  // Where the armed part is under the pointer: the scene's own filtered ray,
  // scanned over the canvas, one point per distinct face (biggest first is
  // not knowable here, so the scan order decides).
  const hits = await frameOf(page).evaluate(() => {
    const out = [], seen = {};
    for (let gy = -0.8; gy <= 0.8; gy += 0.1) for (let gx = -0.8; gx <= 0.8; gx += 0.1) {
      const h = window.__scene.pick(gx, gy);
      if (h && !seen[h.faceId]) { seen[h.faceId] = true; out.push({ fx: (gx + 1) / 2, fy: (1 - gy) / 2, faceId: h.faceId }); }
    }
    return out.slice(0, 8);
  });
  log("armed-part faces on screen", hits.map((h) => h.faceId));
  for (const h of hits) {
    const dx = h.fx - 0.5, dy = h.fy - 0.5;
    const x = box.x + canvas.x + canvas.w * h.fx, y = box.y + canvas.y + canvas.h * h.fy;
    await page.mouse.move(x, y);
    await page.waitForTimeout(400);
    const pre = await frameOf(page).evaluate(() => window.__scene.preselected());
    await page.mouse.down();
    await page.mouse.up();
    const t0 = Date.now();
    let now = await tree(page, fid);
    while (Date.now() - t0 < 30000 && !(now && now.body !== before && /bound · face|not on|already|failed|could not/.test(now.body || ""))) {
      await page.waitForTimeout(500);
      now = await tree(page, fid);
    }
    log("click to body", { ms: Date.now() - t0 });
    log("pick attempt", { dx, dy, preselected: pre, body: now && now.body, scratchEvents: scratchEvents(),
      notice: await frameOf(page).evaluate(() => (document.getElementById("notice-text") || {}).textContent || null),
      armedLine: await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine || null),
      errors: page.__errors.splice(0) });
    if (argv.includes("--diagnose")) process.exit(0);
    if (now && now.body !== before && /bound · face/.test(now.body || "")) return now;
  }
  return await tree(page, fid);
}

// --- the probes ----------------------------------------------------------------
const bodyOf = (page, fid) => page.evaluate((id) => {
  const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
  const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
  const body = slot && slot.querySelector(".navtree__featurebody");
  return {
    kind: body ? body.getAttribute("data-body-kind") : null,
    lines: slot ? Array.from(slot.querySelectorAll(".navtree__featurestate")).map((l) => ({
      words: (l.querySelector(".navtree__featurewords") || {}).textContent || "",
      sub: (l.querySelector(".navtree__featuresub") || {}).textContent || null,
      face: l.getAttribute("data-face"), look: l.getAttribute("data-look") })) : [],
    acts: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : [],
    sceneRows: slot ? slot.querySelectorAll("[data-scene-key]").length : 0,
  };
}, fid);
const openBody = async (page, fid) => {
  await showFeature(page, fid);
  const t = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
  if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") await t.click();
  await page.waitForTimeout(800);
};
const paneTree = (page) => frameOf(page).evaluate(() => {
  const t = window.__embedTree || {};
  return { mode: t.mode, armed: t.armed, mates: Object.keys(t.mates || {}),
    rowsHead: (t.rows || []).slice(0, 3).map((r) => r.key) };
});
const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;
log("real log events, before", realEvents());

const HUB_BORE = "hub@hub_blade1_root_bearing_bore";
const BLADE_BORE = "blade_root@hub_blade1_root_bearing_bore";
const MOUNT_FACE = "tan_link_mount_215175_002@tan_link_mount_hub_face";
const strip = [];
async function frame(page, name) {
  const file = join(SHOTS, name + ".png");
  await page.screenshot({ path: file, timeout: 180000, clip: { x: 0, y: 0, width: 1560, height: 1240 } });
  strip.push(file);
}

{
  // Jeff's page: the kinematic study open, so the pane is in sweep mode and
  // lists the run's joints -- does the mount's base face get any pane rows?
  const page = await open("kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops");
  await page.waitForSelector("div.kmverdict", { timeout: 60000 }).catch(() => {});
  await openPane(page);
  await openBody(page, MOUNT_FACE);
  log("kinematic page: mount base face body", await bodyOf(page, MOUNT_FACE));
  log("kinematic page: pane tree", await paneTree(page));
  await shot(page, "00_kinematic_page_mount_face_line_names_its_face", MOUNT_FACE);
  await page.close();
}

{
  const page = await open();
  await openPane(page);
  // Why the mount's base face had no pane rows: the body and the pane's own
  // tree for it, before anything else is touched.
  await openBody(page, MOUNT_FACE);
  log("mount base face body", await bodyOf(page, MOUNT_FACE));
  log("pane tree", await paneTree(page));
  log("pane rows naming the node", await frameOf(page).evaluate(() => {
    const out = [];
    const walk = (rows) => (rows || []).forEach((r) => { if (String(r.key).indexOf("tan_link_mount_hub_face") !== -1) out.push({ key: r.key, sub: r.sub, text: r.text }); walk(r.rows); });
    walk((window.__embedTree || {}).rows);
    return out;
  }));
  await shot(page, "01_landing_mount_face_suggested", MOUNT_FACE);

  // Hover the suggestion line: its face is washed in the pane.
  const line = featureRow(page, MOUNT_FACE).locator("xpath=..").locator('.navtree__featurestate[data-look]').first();
  await frame(page, "02a_before_hover");
  await line.hover();
  await page.waitForTimeout(1500);
  log("hover suggestion line -> wash", await frameOf(page).evaluate(() => window.__lastWash || null));
  await frame(page, "02b_hover_lights_face");
  await line.click();
  await page.waitForTimeout(2500);
  log("click suggestion line -> look", await frameOf(page).evaluate(() => window.__lastLook || null));
  await frame(page, "02c_click_turns_pane");
  const before = scratchEvents();
  await featureRow(page, MOUNT_FACE).locator("xpath=..").locator("button", { hasText: "Take" }).first().click();
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && scratchEvents() === before) await page.waitForTimeout(500);
  const t1 = Date.now();
  while (Date.now() - t1 < 90000 && (await bodyOf(page, MOUNT_FACE)).kind !== "bound") await page.waitForTimeout(500);
  log("Take -> written ms, then the shell reads it bound ms", { written: t1 - t0, shown: Date.now() - t1 });
  log("Take -> scratch events", { before, after: scratchEvents(), body: await bodyOf(page, MOUNT_FACE) });
  const newest = readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).sort().pop();
  log("the event Take wrote", JSON.parse(readFileSync(join(SCRATCH, "inbox", "feature-identity", newest), "utf-8")));
  await frame(page, "02d_after_take_bound");
  await page.close();
}

{
  // The blade bore: the hub's side unbound (in the scratch log), the blade's seat bound.
  const page = await open();
  await openPane(page);
  await openBody(page, HUB_BORE);
  log("hub bore before unbind", await bodyOf(page, HUB_BORE));
  const before = scratchEvents();
  await clickBody(page, HUB_BORE, "Unbind");
  const t0 = Date.now();
  while (Date.now() - t0 < 60000 && scratchEvents() === before) await page.waitForTimeout(500);
  const t1 = Date.now();
  while (Date.now() - t1 < 90000 && (await bodyOf(page, HUB_BORE)).kind === "bound") await page.waitForTimeout(500);
  log("Unbind -> written ms, then the shell reads it unbound ms", { written: t1 - t0, shown: Date.now() - t1 });
  await openBody(page, HUB_BORE);
  const listed = await bodyOf(page, HUB_BORE);
  log("hub bore after unbind (counterpart bound)", listed);
  await shot(page, "03_hub_bore_unbound_opens_to_ranked_list", HUB_BORE);
  // Every unbound v2 feature: does it open to a ranked list?
  log("features with mates", await paneTree(page));
  log("blade side", await (async () => { await openBody(page, BLADE_BORE); return bodyOf(page, BLADE_BORE); })());
  // Arm it: the ranked faces pre-lit in the pane, listed under the feature.
  await clickBody(page, HUB_BORE, "Pick a face");
  await frameOf(page).waitForFunction(() => window.__armedMates && window.__armedMates.length, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
  log("armed", { body: await bodyOf(page, HUB_BORE), lit: await frameOf(page).evaluate(() => ({
    armedMates: (window.__armedMates || []).slice(0, 8).map((f) => f.faceId),
    marks: window.__scene.listMarks("suggested").map((m) => m.faceId) })) });
  await shot(page, "04_hub_bore_armed_mates_prelit", HUB_BORE);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(2000);
  log("disarmed marks", await frameOf(page).evaluate(() => window.__scene.listMarks("suggested").length));
  await page.close();
}

// The filmstrip: hover -> click -> Take, the four frames side by side.
{
  const page = await browser.newPage({ viewport: { width: 2400, height: 760 } });
  const imgs = strip.map((f) => "data:image/png;base64," + readFileSync(f).toString("base64"));
  await page.setContent(`<body style="margin:0;background:#111;display:flex;gap:8px">${imgs.map((src, i) =>
    `<figure style="margin:0;flex:1"><img src="${src}" style="width:100%"><figcaption style="color:#ccc;font:14px sans-serif">${["before", "hover lights the face", "click turns the pane", "Take binds it"][i]}</figcaption></figure>`).join("")}</body>`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, "05_filmstrip_hover_take.png"), fullPage: true });
  await page.close();
}
log("real log events, after", realEvents());

await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
