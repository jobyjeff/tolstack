// Hand-run inspection probe for handoff
// the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack
// (2026-11-20). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
//   node tests/debug_pitch_plate_20261120.mjs --root <scratch repo root> [--shots <dir>] [--skip-map]
//
// --root is a scratch root whose data/ holds copies of the main checkout's
// inbox, meshes and projections, rebuilt by every builder run from THIS tree
// with --data-root. It writes nothing to any log; it prints the real log's
// event count before and after. The server, the folder grant and the pane
// helpers are debug_links_20261120.mjs's, unchanged.
//
// Walks: v2's map Side by side at 3840 and 1536 wide, with a crop of the
// pitch plate region, each Groups switch off, what the 215177 outline holds,
// each lug's joints and labels, and a hover on the container and on a bolt;
// the nav with 215177-001 open and the three moved features' marks; the 3D
// pane with the pitch link bolt's shank selected.
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
  "docs/sessions/lessons/shots/the_pitch_plate_carries_its_own_features_and_each_lug_is_a_bolt_stack");
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




// --- the probes ----------------------------------------------------------------
const realEvents = () => readdirSync(join(MAIN, "data", "inbox", "feature-identity")).filter((n) => n.endsWith(".json")).length;
log("real log events, before", realEvents());
log("scratch log events, before", scratchEvents());

const ASM = "pitch_plate_215177_001";
const PLATE = "pitch_plate_215735_001";
const LUGS = {
  pitch_link: { flanged: "flanged_bushing_nas77a3_015a", straight: "bushing_214820_002", bolt: "bolt_nas6403u11d",
    race: "pitch_link_upper_inner_race", outer: "pitch_link_upper_outer_race" },
  tan_link: { flanged: "flanged_bushing_nas77a3_015a_tan_link", straight: "straight_bushing_214820_002",
    bolt: "bolt_nas6403u14d", race: "tan_link_upper_inner_race", outer: "tan_link_upper_outer_race" },
};
const LUG_PARTS = Object.values(LUGS).flatMap((l) => [l.flanged, l.straight, l.bolt, l.race]);
const MOVED = [`${PLATE}@pitch_plate_spindle_bore_axis`, `${PLATE}@piston_body_plate_flange_seat`,
  `${PLATE}@gas_spring_piston_fastener_clocking`];
const BOLT_SHANK = "bolt_nas6403u11d@pitch_link_bolt_shank";
const BOLT_SHA = "f9d8792134f561e7a08e0d3c6b69a4e666181f517d741a83d3d5971b5603e723";

const mapFacts = (page) => page.evaluate(async (v2) => {
  const doc = await (await fetch("/tolstack/data/topologies.json")).json();
  const t = doc.topologies.find((x) => x.id === v2);
  const g = window.ViewerApp.mapLayout(t.model, t.map);
  return { notes: g.notes, counts: window.ViewerApp.mapCounts(g), expected: window.ViewerApp.mapExpectedCounts(t.model) };
}, V2);
const boxOf = (page, sels) => page.evaluate((sels) => {
  const rects = sels.flatMap((s) => Array.from(document.querySelectorAll(s))).map((e) => e.getBoundingClientRect())
    .filter((r) => r.width || r.height);
  if (!rects.length) return null;
  return { x: Math.min(...rects.map((r) => r.left)), y: Math.min(...rects.map((r) => r.top)),
    r: Math.max(...rects.map((r) => r.right)), b: Math.max(...rects.map((r) => r.bottom)) };
}, sels);
async function clipShot(page, name, box, m) {
  if (!box) { log(name, "nothing to clip"); return; }
  m = m === undefined ? 60 : m;
  await page.screenshot({ path: join(SHOTS, name + ".png"),
    clip: { x: Math.max(0, box.x - m), y: Math.max(0, box.y - m), width: box.r - box.x + 2 * m, height: box.b - box.y + 2 * m } });
}
// The pitch plate region: its district, the 215177 outline and both links' first boxes.
const REGION = ['#topopane [data-map-kind="body"][data-map-id="pitch_plate"]',
  `#topopane rect.map__outline[data-map-id="${ASM}"]`,
  '#topopane rect.map__box[data-map-id="tan_link_upper_outer_race"]',
  '#topopane rect.map__box[data-map-id="pitch_link_upper_outer_race"]'];
// What the outline holds, what each lug's joints are drawn between, and what
// crosses the outline's border.
const regionFacts = (page) => page.evaluate(([asm, lugs]) => {
  const r = (sel) => { const e = document.querySelector(sel); return e ? e.getBoundingClientRect() : null; };
  const outline = r(`#topopane rect.map__outline[data-map-id="${asm}"]`);
  const inside = (b) => b && outline && b.left >= outline.left - 1 && b.right <= outline.right + 1 &&
    b.top >= outline.top - 1 && b.bottom <= outline.bottom + 1;
  const boxes = Array.from(document.querySelectorAll("#topopane rect.map__box[data-map-id]"));
  const held = boxes.filter((b) => inside(b.getBoundingClientRect())).map((b) => b.getAttribute("data-map-id"));
  const name = document.querySelector(`#topopane [data-map-id="${asm}"] text.map__outlinename, #topopane text.map__outlinename[data-map-id="${asm}"]`);
  const joints = {};
  for (const [lug, l] of Object.entries(lugs)) {
    joints[lug] = Array.from(document.querySelectorAll("#topopane g.map__connector[data-map-id]"))
      .map((g) => g.getAttribute("data-map-id")).filter((id) => id.startsWith(lug + "_") && !/ball_joint|outer_race/.test(id));
  }
  const labels = {};
  for (const id of [asm, ...Object.values(lugs).flatMap((l) => [l.flanged, l.straight, l.bolt, l.race])]) {
    const box = document.querySelector(`#topopane g[data-map-id="${id}"] text, #topopane text[data-map-id="${id}"]`);
    labels[id] = Array.from(document.querySelectorAll(`#topopane [data-map-id="${id}"] text`)).map((t) => t.textContent).join(" / ");
  }
  return { outline: !!outline, outlineName: name ? name.textContent : null, held, joints, labels };
}, [ASM, LUGS]);

if (!argv.includes("--skip-map")) {
  for (const [label, width, height] of [["3840", 3840, 2160], ["1536", 1536, 864]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 2000 ? 2 : 1 });
    page.__errors = [];
    page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
    await page.addInitScript(() => {
      try { localStorage.setItem("tolstack.viewer.paneView", "both"); localStorage.removeItem("tolstack.viewer.groupKinds"); }
      catch (e) { /* no storage */ }
    });
    await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SHOTS, `map_${label}_side_by_side.png`) });
    if (label === "3840") log("map layout", await mapFacts(page));
    log(`region ${label}`, await regionFacts(page));
    await clipShot(page, `map_${label}_pitch_plate_region`, await boxOf(page, REGION));
    if (label === "3840") {
      for (const kind of ["bodies", "assemblies", "parts"]) {
        if (!(await page.locator("#group-kinds[open]").count())) await page.locator("#group-kinds-toggle").click();
        const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
        if (await box.isChecked()) await box.click();
        await page.mouse.move(5, 5);
        await page.waitForTimeout(600);
        await clipShot(page, `map_3840_pitch_plate_${kind}_off`, await boxOf(page, REGION), 80);
        if (!(await page.locator("#group-kinds[open]").count())) await page.locator("#group-kinds-toggle").click();
        if (!(await box.isChecked())) await box.click();
        await page.waitForTimeout(400);
      }
      // Hover the container's name and a bolt: what lights.
      const hoverOf = async (sel) => {
        const at = await boxOf(page, [sel]);
        if (!at) return null;
        await page.mouse.move((at.x + at.r) / 2, (at.y + at.b) / 2);
        await page.waitForTimeout(500);
        return page.evaluate(() => {
          const lit = (cls) => Array.from(document.querySelectorAll(`#topopane .${cls}[data-map-id]`)).map((e) =>
            e.getAttribute("data-map-kind") + ":" + e.getAttribute("data-map-id"));
          return { own: [...new Set(lit("map--own"))].slice(0, 40), touching: [...new Set(lit("map--touching"))].slice(0, 40) };
        });
      };
      log("hover the container's outline name", await hoverOf(`#topopane rect.map__outlinehit[data-map-id="${ASM}"]`));
      await clipShot(page, "map_3840_hover_container", await boxOf(page, REGION));
      log("hover the pitch link bolt", await hoverOf('#topopane rect.map__box[data-map-id="bolt_nas6403u11d"]'));
      await clipShot(page, "map_3840_hover_pitch_link_bolt", await boxOf(page, REGION));
      await page.mouse.move(5, 5);
    }
    log(`map errors ${label}`, page.__errors.splice(0));
    await page.close();
  }
}

{
  // --- the tree with 215177-001 open ----------------------------------------------
  const page = await open();
  const twist = async (key) => {
    const t = page.locator(`#navtree [data-nav-twisty="${key}"]`).first();
    if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") { await t.click(); await page.waitForTimeout(400); }
  };
  await twist(`p:${ASM}`);
  await twist(`p:${PLATE}`);
  const asmRow = page.locator(`#navtree [data-nav-kind="part"][data-nav-id="${ASM}"]`).first();
  if (await asmRow.count()) await asmRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  log("tree rows round 215177", await page.evaluate((asm) => {
    const rows = Array.from(document.querySelectorAll('#navtree [data-nav-kind]'));
    const at = rows.findIndex((r) => r.getAttribute("data-nav-id") === asm);
    return rows.slice(at, at + 24).map((r) => r.getAttribute("data-nav-kind") + " " + r.getAttribute("data-nav-id") +
      " | " + r.textContent.replace(/\s+/g, " ").trim().slice(0, 80));
  }, ASM));
  await clipShot(page, "tree_215177_open", await boxOf(page, ["#navtree"]), 0);
  log("moved features, in the nav", await page.evaluate((ids) => ids.map((id) => {
    const r = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
    return [id, r ? r.querySelector(".navtree__mark").getAttribute("data-status") : "absent"];
  }), MOVED));
  log("tree errors", page.__errors.splice(0));

  // --- 3D: the pitch link bolt selected -------------------------------------
  await openPane(page);
  for (const fid of MOVED) await openBody(page, fid);
  log("moved features' bodies", await Promise.all(MOVED.map(async (fid) => [fid, await bodyOf(page, fid)])));
  await twist("p:bolt_nas6403u11d");
  await selectFeature(page, BOLT_SHANK);
  await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "frame", sha]), BOLT_SHA).catch(() => {});
  await page.waitForTimeout(3000);
  await shot(page, "pane_pitch_link_bolt_selected", BOLT_SHANK);
  await openBody(page, BOLT_SHANK);
  log("bolt shank body", await bodyOf(page, BOLT_SHANK));
  log("pane errors", page.__errors.splice(0));
  await page.close();
}
log("scratch log events, after", scratchEvents());
log("real log events, after", realEvents());

await browser.close();
server.close();
