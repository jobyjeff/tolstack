// Hand-run inspection probe for handoff the_base_stack_joints_are_seat_boss_
// and_pattern (2026-11-17). NOT a tier -- pytest never collects it. It takes
// the machine's browser slot itself.
//
//   node tests/debug_base_stack_joints_20261117.mjs --root <scratch repo root> [--shots <dir>] [--width 3840]
//
// --root is a scratch copy of this tree whose data/ was copied from the main
// checkout and rebuilt by scripts/rebuild_projections.ps1 -RepoRoot <root>:
// its projections carry this branch's model, and its feature-identity log is
// a COPY -- the one bind below writes there, never to the real log, whose
// event count it prints before and after. The server, the folder grant and
// the pane helpers are debug_hole_pattern_20261115.mjs's, unchanged.
//
// Walks: the map at 3840 Side by side with a crop of each ground-stack
// bundle and the layout's own defect notes; the tree's three ground joints
// opened to their constraints; the new features unbound and the Unbound
// filter; a hole of the piston cover's new fastener pattern picked, the
// "Take all N holes" offer read, taken, and the body read back.
import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
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
  "docs/sessions/lessons/shots/the_base_stack_joints_are_seat_boss_and_pattern");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
if (!flag("--root")) throw new Error("--root <scratch repo root> is required: this probe never serves the real data");
const SCRATCH = join(resolve(flag("--root")), "data");
const V2 = "vpa_end_stop_v2";
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

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
  await page.waitForSelector("#topopane svg", { timeout: 60000 });
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
const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;

const bodyOf = (page, fid) => page.evaluate((id) => {
  const row = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
  const slot = row && row.parentElement && row.parentElement.querySelector(".navtree__scene");
  const body = slot && slot.querySelector(".navtree__featurebody");
  return {
    kind: body ? body.getAttribute("data-body-kind") : null,
    lines: slot ? Array.from(slot.querySelectorAll(".navtree__featurestate")).map((l) =>
      ((l.querySelector(".navtree__featurewords") || {}).textContent || "") + (l.getAttribute("data-fit") ? " [fit]" : "")) : [],
    acts: slot ? Array.from(slot.querySelectorAll("button")).map((b) => b.textContent) : [],
  };
}, fid);
const openBody = async (page, fid) => {
  await showFeature(page, fid);
  const t = page.locator(`#navtree [data-nav-twisty="f:${fid}"]`).first();
  if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") await t.click();
  await page.waitForTimeout(800);
};
const newestEvent = () => {
  const name = readdirSync(join(SCRATCH, "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).sort().pop();
  return { name, event: JSON.parse(readFileSync(join(SCRATCH, "inbox", "feature-identity", name), "utf-8")) };
};
async function waitWrite(page, before, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 90000) && scratchEvents() === before) await page.waitForTimeout(500);
  return Date.now() - t0;
}
async function waitBody(page, fid, pred, ms) {
  const t0 = Date.now();
  let b = await bodyOf(page, fid);
  while (Date.now() - t0 < (ms || 90000) && !pred(b)) { await page.waitForTimeout(500); b = await bodyOf(page, fid); }
  return b;
}

// Where on the page a face of the armed part is under the pointer: the
// pane's own filtered ray, scanned over the canvas. `want` (a face id) first,
// else any face for which `ok(faceId)` holds.
async function faceOnPage(page, want, ok, avoid) {
  const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
  const box = await frameEl.boundingBox();
  const found = await frameOf(page).evaluate(([want, okSrc, avoid]) => {
    const ok = okSrc ? new Function("f", "return (" + okSrc + ")(f)") : null;
    const c = document.querySelector("#canvas-host canvas").getBoundingClientRect();
    let any = null;
    // A wanted face was framed by `camera face`, so it is near the centre: a
    // fine scan there. Any face: a coarse scan of the whole canvas. (A fine
    // full-canvas scan is ~30k raycasts on the hub -- minutes.)
    const span = want !== null ? 0.25 : 0.8, step = want !== null ? 0.01 : 0.08;
    for (let gy = -span; gy <= span; gy += step) for (let gx = -span; gx <= span; gx += step) {
      const h = window.__scene.pick(gx, gy);
      if (!h) continue;
      const at = { x: c.left + c.width * (gx + 1) / 2, y: c.top + c.height * (1 - gy) / 2, faceId: h.faceId };
      if (want !== null && h.faceId === want) return at;
      if (!any && ok && ok(h.faceId) && avoid.indexOf(h.faceId) === -1) any = at;
      if (want === null && any) return any;
    }
    return any;
  }, [want === undefined ? null : want, ok ? ok.toString() : null, avoid || []]);
  return found ? { x: box.x + found.x, y: box.y + found.y, faceId: found.faceId } : null;
}
async function clickFace(page, at, shift) {
  await page.mouse.move(at.x, at.y, { steps: 3 });
  await page.waitForTimeout(500);
  if (shift) await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.mouse.up();
  if (shift) await page.keyboard.up("Shift");
}
const offerState = (page) => frameOf(page).evaluate(() => {
  const n = document.querySelector("#an-offer.an__offer--on");
  return n ? { line: (n.querySelector(".an__offer-line") || {}).textContent,
    buttons: Array.from(n.querySelectorAll("button")).map((b) => b.textContent),
    lit: (window.__scene.highlightedFaces ? window.__scene.highlightedFaces() : null) } : null;
});

// The fold's count of unbound v2 features, in Python, off the scratch log --
// the number the filter's count is checked against.
function foldUnbound() {
  const r = spawnSync(join(MAIN, "venv-win", "Scripts", "python.exe"), ["-c", [
    "import sys, json; sys.path.insert(0, sys.argv[1])",
    "from pathlib import Path",
    "from tolerance_stack.feature_identity import fold_with_models, FeatureKey",
    "_, p = fold_with_models(Path(sys.argv[2]), Path(sys.argv[3]))",
    "topos = json.loads(Path(sys.argv[4]).read_text(encoding='utf-8'))['topologies']",
    "t = [x for x in topos if x['id'] == 'vpa_end_stop_v2'][0]",
    "n = 0",
    "for f in t['model']['features']:",
    "    r = p.for_feature(FeatureKey(**f['identity']))",
    "    n += 0 if (r and r.bindings and r.outcome != 'disagreement') else 1",
    "print(n, len(t['model']['features']))",
  ].join("\n"), HERE, join(SCRATCH, "inbox", "feature-identity"), join(MAIN, "data"),
    join(SCRATCH, "projections", "viewer", "topologies.json")], { encoding: "utf-8" });
  if (r.status !== 0) return "python failed: " + r.stderr.slice(-400);
  const [n, of] = r.stdout.trim().split(/\s+/).map(Number);
  return { unbound: n, features: of };
}
const filterCount = (page) => page.evaluate(() => {
  const c = document.querySelector("#navtree [data-nav-filter-count]");
  return c ? Number(c.textContent) : null;
});
// Every part opened, the feature rows whose mark is not `bound`, counted off the DOM.
const domUnbound = (page) => page.evaluate(() => Array.from(document.querySelectorAll('#navtree [data-nav-kind="feature"]'))
  .filter((r) => r.querySelector(".navtree__mark").getAttribute("data-status") !== "bound").length);
async function openAllParts(page) {
  for (let i = 0; i < 3; i++) {
    const closed = await page.locator('#navtree [data-nav-twisty^="p:"][aria-expanded="false"]').count();
    if (!closed) break;
    const all = page.locator('#navtree [data-nav-twisty^="p:"][aria-expanded="false"]');
    for (let k = (await all.count()) - 1; k >= 0; k--) await all.nth(k).click().catch(() => {});
    await page.waitForTimeout(500);
  }
}


// --- the probes ----------------------------------------------------------------
const COVER_SHA = "9791e92a036acc70d349cb700b6ed468f0e88748e1fdef7b7baef22f4bd2af8e";
const PATTERN = "piston_cover_214958_002@piston_cover_fastener_clocking";
const JOINTS = ["hub+tan_link_mount_215175_002",
  "gas_spring_mount_213668_002+tan_link_mount_215175_002",
  "gas_spring_mount_213668_002+piston_cover_214958_002"];
const NEW_FEATURES = [
  "gas_spring_mount_213668_002@gas_spring_mount_locating_boss",
  "tan_link_mount_215175_002@tan_link_mount_gas_spring_pilot_bore",
  "gas_spring_mount_213668_002@gas_spring_mount_fastener_clocking",
  "tan_link_mount_215175_002@gas_spring_mount_fastener_clocking",
  "gas_spring_mount_213668_002@gas_spring_mount_cover_locating_boss",
  "piston_cover_214958_002@piston_cover_pilot_bore",
  "piston_cover_214958_002@piston_cover_fastener_clocking",
  "gas_spring_mount_213668_002@piston_cover_fastener_clocking",
];
log("real log events, before", realEvents());
log("scratch log events, before", scratchEvents());

if (!argv.includes("--skip-map")) {
  // --- the map, Side by side, and each bundle --------------------------------
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tolstack.viewer.dagDrawing", "map");
      localStorage.setItem("tolstack.viewer.paneView", "both");
    } catch (e) { /* no storage */ }
  });
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(SHOTS, "01_map_3840_side_by_side.png") });
  const geo = await page.evaluate(async (v2) => {
    const doc = await (await fetch("/tolstack/data/topologies.json")).json();
    const t = doc.topologies.find((x) => x.id === v2);
    const g = window.ViewerApp.mapLayout(t.model, t.map);
    return { notes: g.notes, counts: window.ViewerApp.mapCounts(g), expected: window.ViewerApp.mapExpectedCounts(t.model) };
  }, V2);
  log("map layout", geo);
  const names = ["hub", "tan_link_gas_spring", "gas_spring_cover"];
  for (let i = 0; i < JOINTS.length; i++) {
    const r = await page.evaluate((j) => {
      const gs = Array.from(document.querySelectorAll(`#topopane g.map__connector[data-joint="${j}"]`));
      if (!gs.length) return null;
      const rects = gs.map((g) => g.getBoundingClientRect());
      const box = { x: Math.min(...rects.map((r) => r.left)), y: Math.min(...rects.map((r) => r.top)),
        r: Math.max(...rects.map((r) => r.right)), b: Math.max(...rects.map((r) => r.bottom)) };
      return { box, routes: gs.length,
        bundled: gs.filter((g) => g.querySelector(".map__connector--bundled")).length,
        symbols: gs.map((g) => { const s = g.querySelector(".map__symbol"); return s ? s.getAttribute("class").replace("map__symbol ", "") : null; }),
        titles: gs.map((g) => (g.querySelector("title") || {}).textContent || null) };
    }, JOINTS[i]);
    log("bundle " + JOINTS[i], r);
    if (r) {
      const m = 90;
      await page.screenshot({ path: join(SHOTS, `0${2 + i}_bundle_${names[i]}.png`),
        clip: { x: Math.max(0, r.box.x - m), y: Math.max(0, r.box.y - m),
          width: r.box.r - r.box.x + 2 * m, height: r.box.b - r.box.y + 2 * m } });
    }
  }
  log("map errors", page.__errors.splice(0));
  await page.close();
}

{
  // --- the tree: three joints of three; the new features unbound -------------
  const page = await open();
  const twist = async (key) => {
    const t = page.locator(`#navtree [data-nav-twisty="${key}"]`).first();
    if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") { await t.click(); await page.waitForTimeout(500); }
  };
  await twist("b:base");
  await twist("bi:base");
  for (const j of JOINTS) await twist("j:" + j);
  const joints = await page.evaluate((js) => js.map((j) => {
    const row = document.querySelector(`#navtree [data-nav-kind="joint"][data-nav-id="${j}"]`);
    const li = row && row.parentElement;
    return { joint: j, row: row ? row.textContent.replace(/\s+/g, " ").trim() : null,
      constraints: li ? Array.from(li.querySelectorAll('[data-nav-kind="interface"]')).map((r) =>
        r.getAttribute("data-nav-id") + " | " + r.textContent.replace(/\s+/g, " ").trim()) : [] };
  }), JOINTS);
  log("tree joints", joints);
  const row = page.locator(`#navtree [data-nav-kind="joint"][data-nav-id="${JOINTS[1]}"]`).first();
  if (await row.count()) await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, "05_tree_ground_joints.png") });
  await openAllParts(page);
  const status = await page.evaluate((ids) => ids.map((id) => {
    const r = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
    return [id, r ? r.querySelector(".navtree__mark").getAttribute("data-status") : "absent",
      r ? r.textContent.replace(/\s+/g, " ").trim() : null];
  }), NEW_FEATURES);
  log("new features, All", status);
  log("filter: count, DOM rows not bound, the fold", { count: await filterCount(page), dom: await domUnbound(page), fold: foldUnbound() });
  await page.locator('#navtree [data-nav-filter="unbound"]').click();
  await page.waitForTimeout(1000);
  const shown = await page.evaluate((ids) => ids.filter((id) =>
    document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`)), NEW_FEATURES);
  log("new features under Unbound", { shown: shown.length, of: NEW_FEATURES.length,
    rows: await page.evaluate(() => document.querySelectorAll('#navtree [data-nav-kind="feature"]').length) });
  await page.screenshot({ path: join(SHOTS, "06_unbound_filter.png") });
  await page.locator('#navtree [data-nav-filter="all"]').click();
  await page.waitForTimeout(800);
  log("tree errors", page.__errors.splice(0));

  // --- a hole of the cover's new pattern: the offer, taken ------------------
  await openPane(page);
  await openBody(page, PATTERN);
  log("pattern body at rest", await bodyOf(page, PATTERN));
  await clickBody(page, PATTERN, "Pick a face");
  await frameOf(page).waitForFunction(() => window.__embedTree && window.__embedTree.armed, null, { timeout: 60000 });
  log("armed line", await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine || null));
  await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "face", sha, "43"]), COVER_SHA);
  await page.waitForTimeout(3000);
  const at = await faceOnPage(page, 43, (f) => f === 44);
  log("face 43 on the page", at);
  const before = scratchEvents();
  if (at) await clickFace(page, at);
  else await frameOf(page).evaluate((sha) => { window.__scene.onPick({ sha256: sha, faceId: 43 }, null, null, {}); }, COVER_SHA);
  log("face 43 clicked", at ? "with the mouse" : "through the scene's onPick (no screen point on it)");
  await frameOf(page).waitForSelector("#an-offer.an__offer--on", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  log("the offer", { offer: await offerState(page), writes: scratchEvents() - before });
  await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "frame", sha]), COVER_SHA);
  await page.waitForTimeout(2500);
  await shot(page, "07_pattern_offered_all_holes_lit", PATTERN);
  await frameOf(page).locator('#an-offer [data-offer="all"]').click();
  log("Take all -> written ms", await waitWrite(page, before));
  const written = newestEvent();
  log("the event", { file: written.name, verdict: written.event.verdict,
    feature: written.event.feature || written.event.stack_key || null,
    faces: (written.event.geometry_keys || []).map((g) => g.face_id) });
  const bound = await waitBody(page, PATTERN, (b) => b.lines.some((l) => /\[fit\]/.test(l)), 120000);
  log("pattern body after Take all", bound);
  await shot(page, "08_pattern_taken_body_reads_the_fit", PATTERN);
  await page.close();
}
log("scratch log events, after", scratchEvents());
log("real log events, after", realEvents());

await browser.close();
server.close();
