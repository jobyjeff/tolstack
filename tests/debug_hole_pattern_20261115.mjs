// Hand-run inspection probe for handoff a_pattern_is_bound_as_its_like_faces_
// and_a_face_can_be_added (2026-11-15). NOT a tier -- pytest never collects
// it. It takes the machine's browser slot itself.
//
// The 2026-11-12 probe's server and folder grant, unchanged: drawing-checker's
// mounts on a private port, /tolstack/data/ pointed at a SCRATCH copy of the
// viewer projections and of the feature-identity log -- never the real one,
// whose event count it prints before and after.
//
//   node tests/debug_hole_pattern_20261115.mjs [--shots <dir>] [--width 3840] [--keep]
//
// One: Correct on the hub's fastener clocking, a real click on face 744 --
// the pattern is offered, lit; Take all binds it; the body and the Preview
// read the fit back. Two: Add a face on a bound feature, Shift-click on an
// unbound one, Remove on each. Three: the Parts filter's count against the
// fold's, before and after a bind.
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
  "docs/sessions/lessons/shots/a_pattern_is_bound_as_its_like_faces_and_a_face_can_be_added");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const SCRATCH = join(MAIN, "data", "scratch", "hole_pattern_20261115");
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
const HUB_SHA = "e28285d1e6c934504d7c1dd0b86814cda6e256c3a18b2bbc4b6ee26cf6ceab6b";
const CLOCKING = "hub@tan_link_mount_fastener_clocking";
const PILOT = "hub@hub_boss_in_tan_link_mount_pilot";
const MOUNT_FACE = "tan_link_mount_215175_002@tan_link_mount_hub_face";
const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;
log("real log events, before", realEvents());

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
async function faceOnPage(page, want, ok) {
  const frameEl = await page.locator("#annotate-flyout iframe").elementHandle();
  const box = await frameEl.boundingBox();
  const found = await frameOf(page).evaluate(([want, okSrc]) => {
    const ok = okSrc ? new Function("f", "return (" + okSrc + ")(f)") : null;
    const c = document.querySelector("#canvas-host canvas").getBoundingClientRect();
    let any = null;
    for (let step of [0.05, 0.02, 0.01]) {
      for (let gy = -0.9; gy <= 0.9; gy += step) for (let gx = -0.9; gx <= 0.9; gx += step) {
        const h = window.__scene.pick(gx, gy);
        if (!h) continue;
        const at = { x: c.left + c.width * (gx + 1) / 2, y: c.top + c.height * (1 - gy) / 2, faceId: h.faceId };
        if (want !== null && h.faceId === want) return at;
        if (!any && ok && ok(h.faceId)) any = at;
      }
      if (want === null && any) return any;
    }
    return any;
  }, [want === undefined ? null : want, ok ? ok.toString() : null]);
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

{
  // --- one: the pattern -------------------------------------------------------
  const page = await open();
  await openPane(page);
  await openBody(page, CLOCKING);
  log("clocking body at rest", await bodyOf(page, CLOCKING));
  await shot(page, "01_clocking_bound_one_hole", CLOCKING);
  await clickBody(page, CLOCKING, "Correct");
  await frameOf(page).waitForFunction(() => window.__embedTree && window.__embedTree.armed, null, { timeout: 60000 });
  await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "face", sha, "744"]), HUB_SHA);
  await page.waitForTimeout(3000);
  const at = await faceOnPage(page, 744, (f) => f === 743);
  log("face 744 on the page", at);
  const before = scratchEvents();
  await clickFace(page, at);
  await frameOf(page).waitForSelector("#an-offer.an__offer--on", { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1500);
  log("the offer", { offer: await offerState(page), writes: scratchEvents() - before });
  await shot(page, "02_pattern_offered_all_holes_lit", CLOCKING);
  await frameOf(page).locator('#an-offer [data-offer="all"]').click();
  log("Take all -> written ms", await waitWrite(page, before));
  const written = newestEvent();
  log("the event", { file: written.name, verdict: written.event.verdict, supersedes: written.event.supersedes || null,
    faces: (written.event.geometry_keys || []).map((g) => g.face_id) });
  const bound = await waitBody(page, CLOCKING, (b) => b.lines.some((l) => /\[fit\]/.test(l)), 120000);
  log("clocking body after Take all", bound);
  await shot(page, "03_body_reads_the_fit", CLOCKING);
  await selectFeature(page, CLOCKING);
  log("Preview fit line", await page.evaluate(() => Array.from(document.querySelectorAll(".detail__preview [data-fit]")).map((n) => n.textContent)));
  await shot(page, "04_preview_reads_the_fit", CLOCKING);

  // --- three, before: the filter --------------------------------------------
  await openAllParts(page);
  log("filter: count, DOM rows not bound, the fold", { count: await filterCount(page), dom: await domUnbound(page), fold: foldUnbound() });
  await page.locator('#navtree [data-nav-filter="unbound"]').click();
  await page.waitForTimeout(1000);
  log("Unbound on: rows", await page.evaluate(() => ({
    features: document.querySelectorAll('#navtree [data-nav-kind="feature"]').length,
    bound: Array.from(document.querySelectorAll('#navtree [data-nav-kind="feature"] .navtree__mark')).filter((m) => m.getAttribute("data-status") === "bound").length,
    selection: document.querySelector(".detail__preview") ? document.querySelector(".detail__preview").getAttribute("data-preview-key") : null })));
  await shot(page, "05_unbound_filter_on", null);
  await page.locator('#navtree [data-nav-filter="all"]').click();
  await page.waitForTimeout(800);
  await page.close();
}

{
  // --- two: Add a face, Shift-click, Remove -----------------------------------
  const page = await open();
  await openPane(page);
  await openBody(page, PILOT);
  const pilot0 = await bodyOf(page, PILOT);
  log("pilot body at rest", pilot0);
  await clickBody(page, PILOT, "Add a face");
  await frameOf(page).waitForFunction(() => window.__embedTree && window.__embedTree.armed, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  log("armed to add: line", await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine));
  const held = await frameOf(page).evaluate(() => 0);
  const other = await faceOnPage(page, null, (f) => f !== 0);
  log("Add a face: clicking", other);
  let before = scratchEvents();
  await clickFace(page, other);
  log("Add a face -> written ms", await waitWrite(page, before));
  log("the event", (({ name, event }) => ({ name, verdict: event.verdict, supersedes: event.supersedes || null,
    faces: (event.geometry_keys || []).map((g) => g.face_id) }))(newestEvent()));
  const pilot1 = await waitBody(page, PILOT, (b) => /faces of/.test(b.lines[0] || ""), 120000);
  log("pilot body after Add a face", { body: pilot1, armed: await frameOf(page).evaluate(() => !!(window.__embedTree || {}).armed) });
  await shot(page, "06_add_a_face_two_faces_bound", PILOT);
  // Remove the added face again.
  const li = featureRow(page, PILOT).locator("xpath=..");
  before = scratchEvents();
  await li.locator("button", { hasText: "Remove" }).last().click();
  log("Remove -> written ms", await waitWrite(page, before));
  log("pilot body after Remove", await waitBody(page, PILOT, (b) => b.lines.length !== pilot1.lines.length, 120000));

  // Shift-click on the mount's unbound base face: two faces, still armed.
  const fold0 = foldUnbound();
  await openBody(page, MOUNT_FACE);
  log("mount face body at rest", await bodyOf(page, MOUNT_FACE));
  await clickBody(page, MOUNT_FACE, "Pick a face");
  await frameOf(page).waitForFunction(() => window.__embedTree && window.__embedTree.armed, null, { timeout: 60000 });
  await page.waitForTimeout(3000);
  const a = await faceOnPage(page, null, () => true);
  before = scratchEvents();
  await clickFace(page, a, true);
  log("Shift-click 1 -> written ms", await waitWrite(page, before));
  log("after Shift-click 1", { line: await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine),
    armed: await frameOf(page).evaluate(() => !!(window.__embedTree || {}).armed), event: newestEvent().name });
  const firstFaces = (newestEvent().event.geometry_keys || []).map((g) => g.face_id);
  await page.waitForTimeout(4000);
  const b = await faceOnPage(page, null, (f) => firstFaces.indexOf(f) === -1);
  before = scratchEvents();
  await clickFace(page, b, true);
  log("Shift-click 2 -> written ms", await waitWrite(page, before));
  log("after Shift-click 2", { line: await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine),
    armed: await frameOf(page).evaluate(() => !!(window.__embedTree || {}).armed),
    faces: (newestEvent().event.geometry_keys || []).map((g) => g.face_id) });
  await shot(page, "07_shift_click_still_armed", MOUNT_FACE);
  await page.keyboard.press("Escape");
  const mount = await waitBody(page, MOUNT_FACE, (x) => /faces of/.test(x.lines[0] || ""), 120000);
  log("mount face body after Esc", mount);
  await shot(page, "08_shift_click_set_bound", MOUNT_FACE);
  log("filter after binding one", { count: await filterCount(page), foldBefore: fold0, foldAfter: foldUnbound() });
  const li2 = featureRow(page, MOUNT_FACE).locator("xpath=..");
  before = scratchEvents();
  await li2.locator("button", { hasText: "Remove" }).first().click();
  log("Remove (mount) -> written ms", await waitWrite(page, before));
  log("mount body after Remove", await waitBody(page, MOUNT_FACE, (x) => x.lines.length !== mount.lines.length, 120000));
  await page.close();
}
log("real log events, after", realEvents());

await browser.close();
server.close();
if (!argv.includes("--keep")) rmSync(SCRATCH, { recursive: true, force: true });
