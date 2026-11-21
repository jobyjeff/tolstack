// Hand-run inspection probe for handoff
// a_link_is_a_machined_part_and_two_bearings_each_two_races (2026-11-20).
// NOT a tier -- pytest never collects it. It takes the machine's browser
// slot itself.
//
//   node tests/debug_links_20261120.mjs --root <scratch repo root> [--shots <dir>] [--skip-map]
//
// --root is a scratch root whose data/ holds copies of the main checkout's
// inbox, meshes and projections, rebuilt by every builder run from THIS
// tree with --data-root: its projections carry this branch's model, and its
// feature-identity log is a COPY -- the one bind below writes there, never to
// the real log, whose event count it prints before and after. The server,
// the folder grant and the pane helpers are debug_base_stack_joints_20261117.mjs's,
// unchanged.
//
// Walks: v2's map Side by side at 3840 and 1536 wide, with a crop of each
// link and each Groups switch off, every bearing's outline, races and ball
// symbol measured, and a hover on a bearing and on a race; the nav with the
// pitch link open and the four moved centres' marks; the grid's rows round
// the pitch link's lower ball joint; the 3D pane with the lower outer race's
// cylinder selected, then picked and bound.
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
  "docs/sessions/lessons/shots/a_link_is_a_machined_part_and_two_bearings_each_two_races");
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

const LINKS = ["pitch_link", "tan_link_212956_005"];
const BEARINGS = ["spherical_bearing_pitch_link", "spherical_bearing_pitch_link_upper",
  "spherical_bearing_tan_link", "spherical_bearing_tan_link_ms14103_3"];
const MOVED = ["pitch_link_lower_outer_race@pitch_link_lower_sphere_centre",
  "pitch_link_upper_outer_race@pitch_link_upper_sphere_centre",
  "tan_link_lower_outer_race@tan_link_lower_sphere_centre",
  "tan_link_upper_outer_race@tan_link_upper_sphere_centre"];
const RACE_FEATURE = "pitch_link_lower_outer_race@pitch_link_lower_outer_race_od";
const PL_BEARING_SHA = "815597cb2da7407eb0e4fc1ef51386a65c5df934401e623859625ab7e05404c9";

// The map's own geometry, notes and counts, off the served projection.
const mapFacts = (page) => page.evaluate(async (v2) => {
  const doc = await (await fetch("/tolstack/data/topologies.json")).json();
  const t = doc.topologies.find((x) => x.id === v2);
  const g = window.ViewerApp.mapLayout(t.model, t.map);
  return { notes: g.notes, counts: window.ViewerApp.mapCounts(g), expected: window.ViewerApp.mapExpectedCounts(t.model) };
}, V2);
// The union of an entity's drawn elements' screen boxes.
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
// Each bearing: its outline, its races' boxes and districts, and where its
// ball joint's symbol sits between the races.
const bearingFacts = (page) => page.evaluate((bearings) => bearings.map((b) => {
  const outline = document.querySelector(`#topopane rect.map__outline[data-map-id="${b}"]`);
  const name = outline && outline.parentNode.querySelector("text.map__outlinename");
  const box = (id) => { const e = document.querySelector(`#topopane rect.map__box[data-map-id="${id}"]`); return e ? e.getBoundingClientRect() : null; };
  const outer = b.replace("spherical_bearing_", "").replace("_ms14103_3", "_upper").replace(/^pitch_link$/, "pitch_link_lower")
    .replace(/^tan_link$/, "tan_link_lower");
  const ends = { spherical_bearing_pitch_link: "pitch_link_lower", spherical_bearing_pitch_link_upper: "pitch_link_upper",
    spherical_bearing_tan_link: "tan_link_lower", spherical_bearing_tan_link_ms14103_3: "tan_link_upper" }[b] || outer;
  const o = box(ends + "_outer_race"), i = box(ends + "_inner_race");
  const sym = document.querySelector(`#topopane g.map__connector[data-map-id="${ends}_ball_joint"] .map__symbol`);
  const s = sym ? sym.getBoundingClientRect() : null;
  const mid = s ? { x: s.left + s.width / 2, y: s.top + s.height / 2 } : null;
  const between = !!(o && i && mid && mid.x >= Math.min(o.right, i.right) - 1 && mid.x <= Math.max(o.left, i.left) + 1 ||
    o && i && mid && mid.y >= Math.min(o.bottom, i.bottom) - 1 && mid.y <= Math.max(o.top, i.top) + 1);
  return { bearing: b, outline: !!outline, name: name ? name.textContent : null, outer: !!o, inner: !!i,
    symbol: sym ? sym.getAttribute("class").replace("map__symbol ", "") : null, symbolBetweenTheRaces: between };
}), BEARINGS);

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
    log(`bearings ${label}`, await bearingFacts(page));
    await clipShot(page, `map_${label}_tangential_link`, await boxOf(page,
      ['#topopane rect.map__outline[data-map-id="tan_link_212956_005"]']));
    await clipShot(page, `map_${label}_pitch_link`, await boxOf(page,
      ['#topopane rect.map__outline[data-map-id="pitch_link"]']));
    if (label === "3840") {
      // The Groups switches, each off in turn: the links' parts stay put.
      for (const kind of ["bodies", "assemblies", "parts"]) {
        if (!(await page.locator("#group-kinds[open]").count())) await page.locator("#group-kinds-toggle").click();
        const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
        if (await box.isChecked()) await box.click();
        await page.mouse.move(5, 5);
        await page.waitForTimeout(600);
        await clipShot(page, `map_3840_links_${kind}_off`, await boxOf(page,
          ['#topopane rect.map__outline[data-map-id="tan_link_212956_005"]', '#topopane rect.map__outline[data-map-id="pitch_link"]',
           '#topopane rect.map__box[data-map-id^="tan_link_"]', '#topopane rect.map__box[data-map-id^="pitch_link_"]']), 80);
        if (!(await page.locator("#group-kinds[open]").count())) await page.locator("#group-kinds-toggle").click();
        if (!(await box.isChecked())) await box.click();
        await page.waitForTimeout(400);
      }
      // Hover a bearing's name, then a race: what lights.
      const hoverOf = async (sel) => {
        const at = await boxOf(page, [sel]);
        if (!at) return null;
        await page.mouse.move((at.x + at.r) / 2, (at.y + at.b) / 2);
        await page.waitForTimeout(500);
        return page.evaluate(() => {
          const lit = (cls) => Array.from(document.querySelectorAll(`#topopane .${cls}[data-map-id]`)).map((e) =>
            e.getAttribute("data-map-kind") + ":" + e.getAttribute("data-map-id"));
          return { own: [...new Set(lit("map--own"))].slice(0, 30), touching: [...new Set(lit("map--touching"))].slice(0, 30) };
        });
      };
      log("hover the pitch link's lower bearing's name", await hoverOf(
        '#topopane rect.map__outlinehit[data-map-id="spherical_bearing_pitch_link"]'));
      await clipShot(page, "map_3840_hover_bearing", await boxOf(page, ['#topopane rect.map__outline[data-map-id="pitch_link"]']));
      log("hover the lower inner race", await hoverOf('#topopane rect.map__box[data-map-id="pitch_link_lower_inner_race"]'));
      await clipShot(page, "map_3840_hover_inner_race", await boxOf(page, ['#topopane rect.map__outline[data-map-id="pitch_link"]',
        '#topopane rect.map__box[data-map-id="pitch_arm"]']));
      await page.mouse.move(5, 5);
    }
    log(`map errors ${label}`, page.__errors.splice(0));
    await page.close();
  }
}

{
  // --- the tree with a link open; the grid with a bearing's rows ------------
  const page = await open();
  const twist = async (key) => {
    const t = page.locator(`#navtree [data-nav-twisty="${key}"]`).first();
    if (await t.count() && (await t.getAttribute("aria-expanded")) !== "true") { await t.click(); await page.waitForTimeout(400); }
  };
  for (const k of ["p:pitch_link", "p:spherical_bearing_pitch_link", "p:spherical_bearing_pitch_link_upper",
    "p:pitch_link_lower_outer_race"]) await twist(k);
  const navTree = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll("#navtree h2.navtree__heading")).map((h) => h.textContent.trim());
    const rows = Array.from(document.querySelectorAll('#navtree [data-nav-kind="part"][data-nav-id]')).map((r) => r.getAttribute("data-nav-id"));
    const count = {};
    rows.forEach((id) => { count[id] = (count[id] || 0) + 1; });
    return { sections, twice: Object.keys(count).filter((k) => count[k] > 1) };
  });
  log("nav", navTree);
  const linkRow = page.locator('#navtree [data-nav-kind="part"][data-nav-id="pitch_link"]').first();
  if (await linkRow.count()) await linkRow.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await clipShot(page, "tree_pitch_link_open", await boxOf(page, ["#navtree"]), 0);
  log("moved features, in the nav", await page.evaluate((ids) => ids.map((id) => {
    const r = document.querySelector(`#navtree [data-nav-kind="feature"][data-nav-id="${id}"]`);
    return [id, r ? r.querySelector(".navtree__mark").getAttribute("data-status") : "absent"];
  }), MOVED));
  // The grid: the pitch link lower bearing's rows.
  const gridRow = page.locator('tr.tvrow[data-id="pitch_link_lower_ball_joint"]').first();
  if (await gridRow.count()) {
    await gridRow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const rows = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("tr.tvrow"));
      const at = all.findIndex((r) => r.getAttribute("data-id") === "pitch_link_lower_ball_joint");
      return all.slice(Math.max(0, at - 6), at + 6).map((r) => r.getAttribute("data-id") + " | " + r.textContent.replace(/\s+/g, " ").trim().slice(0, 120));
    });
    log("grid rows round the lower ball joint", rows);
    await clipShot(page, "grid_pitch_link_lower_bearing", await boxOf(page, ["#topogrid"]), 0);
  } else {
    log("grid", "no row for pitch_link_lower_ball_joint");
  }
  log("tree errors", page.__errors.splice(0));

  // --- 3D: a race selected, the moved features bound, one race feature bound --
  await openPane(page);
  for (const fid of MOVED) await openBody(page, fid);
  log("moved features' bodies", await Promise.all(MOVED.map(async (fid) => [fid, await bodyOf(page, fid)])));
  await selectFeature(page, RACE_FEATURE);
  await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "frame", sha]), PL_BEARING_SHA).catch(() => {});
  await page.waitForTimeout(2500);
  await shot(page, "pane_outer_race_selected", RACE_FEATURE);
  await openBody(page, RACE_FEATURE);
  const before = await bodyOf(page, RACE_FEATURE);
  log("race feature body at rest", before);
  const arm = before.acts.find((a) => /^Pick/.test(a));
  const writesBefore = scratchEvents();
  if (arm) {
    await clickBody(page, RACE_FEATURE, arm);
    await frameOf(page).waitForFunction(() => window.__embedTree && window.__embedTree.armed, null, { timeout: 60000 }).catch(() => {});
    log("armed line", await frameOf(page).evaluate(() => (window.__embedTree || {}).armedLine || null));
    // The outer race's outside cylinder: solid 0 of the bearing's mesh, face 0 (r 7.141).
    await frameOf(page).evaluate((sha) => window.AnnotateApp.exec(["camera", "face", sha, "0"]), PL_BEARING_SHA).catch(() => {});
    await page.waitForTimeout(3000);
    const at = await faceOnPage(page, 0, (f) => f === 1 || f === 20 || f === 21);
    log("face 0 on the page", at);
    if (at) await clickFace(page, at);
    else await frameOf(page).evaluate((sha) => { window.__scene.onPick({ sha256: sha, faceId: 0 }, null, null, {}); }, PL_BEARING_SHA);
    await page.waitForTimeout(2500);
    const offer = await offerState(page);
    log("the offer", offer);
    if (offer && offer.buttons.length) await frameOf(page).locator('#an-offer [data-offer="all"]').click().catch(() => {});
    log("written ms", await waitWrite(page, writesBefore));
    const written = newestEvent();
    log("the event", { file: written.name, verdict: written.event.verdict, feature: written.event.feature_key || written.event.stack_key,
      faces: (written.event.geometry_keys || []).map((g) => [g.source_step_sha256.slice(0, 8), g.face_id]) });
    const after = await waitBody(page, RACE_FEATURE, (b) => b.kind === "bound", 120000);
    log("race feature body after", after);
    await shot(page, "pane_outer_race_cylinder_bound", RACE_FEATURE);
  } else {
    log("race feature", "no Pick button: " + JSON.stringify(before));
  }
  log("pane errors", page.__errors.splice(0));
  await page.close();
}
log("scratch log events, after", scratchEvents());
log("real log events, after", realEvents());

await browser.close();
server.close();
