// Hand-run inspection probe for handoff the_scene_draws_the_model_alone_and_
// every_node_it_places_has_a_leader (2026-11-08). NOT a tier -- pytest never
// collects it.
//
//   node tests/debug_scene_alone_and_leaders.mjs --shots <dir> [--phase diagnose|shots]
//        [--projections <data-root>/projections]
//
// Serves THIS tree's apps/ with data/ from the main checkout (as
// debug_model_v2_shots.mjs does), opens v2 with the 3D pane, and prints what
// the scene draws (parts, draw counts) and what the seam draws (dots, anchors,
// leaders, VA.lastSeamDraw.skipped) at rest, with the P2 sweep loaded, mid-
// sweep and at the +72 degree stop; `shots` also selects a row and opens v1.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const TREE = resolve(flag("--tree") || HERE);
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const PHASE = flag("--phase") || "shots";
// `--projections <dir>`: any file under it stands in for the same path under
// data/projections/ (projections built from this tree into a scratch data
// root, so the main checkout's own are not overwritten from a branch).
const PROJECTIONS = flag("--projections") ? resolve(flag("--projections")) : null;
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_scene_draws_the_model_alone_and_every_node_it_places_has_a_leader");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V1 = "vpa_pitch_linkage";
const V2 = "vpa_end_stop_v2";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    let full = join(rel.startsWith("data/") ? DATA_REPO : TREE, rel);
    const projections = "data/projections/";
    if (PROJECTIONS && rel.startsWith(projections)) {
      const candidate = join(PROJECTIONS, rel.slice(projections.length));
      if (existsSync(candidate)) full = candidate;
    }
    try {
      const body = readFileSync(full);
      res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));
const run = (page, cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

async function settle(page, ms = 900) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 });
  await page.waitForTimeout(ms);
}

async function open(width, query, height = 1100) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
  page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html${query}`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="topology"]', { timeout: 30000 });
  await settle(page);
  return page;
}

async function sceneNow(page, settleMs = 1500, maxMs = 90000) {
  const started = Date.now();
  let last = "", stable = 0, view = [];
  while (Date.now() - started < maxMs) {
    try { view = await run(page, ["scene-view"]); } catch { view = []; }
    if (!Array.isArray(view)) view = [];
    const key = JSON.stringify(view);
    stable = key === last && view.length ? stable + 1 : 0;
    last = key;
    if (stable >= Math.ceil(settleMs / 500)) break;
    await page.waitForTimeout(500);
  }
  return view;
}

// What the scene draws: visible parts and how many matrices each.
const drawn = (page) => frameOf(page).evaluate(() => {
  const scene = window.__scene;
  const view = window.AnnotateApp.exec(["scene-view"]);
  const out = {};
  for (const sha of scene.listOpenParts()) {
    const info = view.find((r) => r.sha256 === sha) || {};
    if (!info.visible) continue;
    out[info.part || sha.slice(0, 8)] = scene.drawnOccurrenceKeys(sha).length;
  }
  return out;
});

// The parts panel: the in-model rows, and the folded group's count.
const panel = (page) => frameOf(page).evaluate(() => {
  const rows = Array.from(document.querySelectorAll("#parts-panel > li.part-row:not(.part-row--head) .part-row__label"))
    .map((n) => n.textContent);
  const box = document.querySelector("#parts-panel details.parts-other");
  return { inModel: rows, other: box ? box.querySelector("summary").textContent : null,
    otherOpen: box ? box.open : null };
});

// What the seam draws, and why not.
const seam = (page) => page.evaluate(() => {
  const VA = window.ViewerApp;
  const r = VA.lastTopoRender;
  const s = VA.lastSeamDraw;
  const anchors = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow)
    .map((w) => { try { return w.__lastAnchors; } catch (e) { return null; } }).find(Boolean);
  return {
    leaders: document.querySelectorAll(".seam__leader").length,
    dots: r && r.seam ? Object.keys(r.seam.dots).length : null,
    anchorsPosted: anchors ? Object.keys(anchors.nodes).length : null,
    anchorsPlaced: anchors ? Object.keys(anchors.nodes).filter((k) => anchors.nodes[k]).length : null,
    lastSeamDraw: s ? { leaders: s.leaders.length, skipped: s.skipped } : null,
  };
});

async function openPane(page, topologyId) {
  const row = page.locator(`[data-nav-kind="topology"][data-nav-id="${topologyId}"]`).first();
  await row.hover();
  await row.locator("[data-nav-3d]").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await sceneNow(page);
  await page.waitForTimeout(3000);
}

async function loadSweep(page) {
  const sw = await run(page, ["sweep", "latest"]).catch((e) => "ERR " + e.message);
  log("sweep", String(JSON.stringify(sw)).slice(0, 200));
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 });
  await page.waitForTimeout(5000);
}

try {
  const page = await open(1700, `?topology=${V2}`, PHASE === "shots" ? 1500 : 1100);
  await openPane(page, V2);
  log("rest: drawn parts (matrices)", await drawn(page));
  log("rest: seam", await seam(page));
  log("rest: panel", await panel(page));
  const models = await frameOf(page).evaluate(() => window.__modelUnplaced);
  log("rest: unplaced", models);
  await page.screenshot({ path: join(SHOTS, "1_v2_pane_at_rest.png") });
  await loadSweep(page);
  log("sweep: drawn parts (matrices)", await drawn(page));
  log("sweep: seam", await seam(page));
  log("sweep: panel", await panel(page));
  // Every DAG node, with where the scene anchored it (its `model select`
  // answer) and whether the seam drew it a leader.
  const dagNodes = await page.evaluate(() => Array.from(new Set(Array.from(
    document.querySelectorAll('svg.tv__rails [data-row-kind="node"][data-id]'))
    .map((n) => n.getAttribute("data-id")))).sort());
  const led = await page.evaluate(() => (window.ViewerApp.lastSeamDraw
    ? window.ViewerApp.lastSeamDraw.leaders.map((l) => l.id) : []));
  const sources = {};
  for (const id of dagNodes) {
    const sel = await run(page, ["model", "select", "node", id]).catch((e) => ({ error: e.message }));
    sources[id] = [(sel && (sel.source || sel.error)) || null, led.indexOf(id) !== -1 ? "led" : "no leader"];
  }
  await run(page, ["model", "select", "clear"]);
  log("sweep: node anchor sources", sources);
  log("sweep: bodies (subject, part, state, sha)", await frameOf(page).evaluate(() =>
    window.__sweep.bodies.map((r) => [r.subject, r.part, r.state, (r.sha256 || "").slice(0, 8)])));
  await page.screenshot({ path: join(SHOTS, "2_v2_sweep_loaded.png") });
  if (PHASE === "shots") {
    const n = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length);
    await run(page, ["seek", "#" + Math.floor(n / 2)]);
    await page.waitForTimeout(2500);
    log("mid: drawn parts (matrices)", await drawn(page));
    log("mid: seam", await seam(page));
    await page.screenshot({ path: join(SHOTS, "3_v2_mid_sweep.png") });
    await run(page, ["seek", "#" + (n - 1)]);
    await page.waitForTimeout(2500);
    log("stop: seam", await seam(page));
    await page.screenshot({ path: join(SHOTS, "4_v2_plus72_stop.png") });
    // A DAG node selected: the selection is not a re-drive, so the pane
    // stays in sweep mode and the node's leader takes the accent.
    const node = page.locator('svg.tv__rails [data-row-kind="node"][data-id="tan_link_upper_sphere_centre"]').first();
    if (await node.count()) {
      await node.click({ force: true });
      await page.waitForTimeout(1500);
      log("node selected: seam states", await page.evaluate(() => {
        const s = window.ViewerApp.lastSeamDraw;
        return s ? Object.entries(s.states).filter(([, v]) => v === "selected") : null;
      }));
      await page.screenshot({ path: join(SHOTS, "5_v2_node_selected.png") });
    }
    // A grid row selected: today a re-drive (goto <edge>), which leaves sweep.
    const rowSel = page.locator("tr.tvrow").first();
    if (await rowSel.count()) {
      await rowSel.click();
      await page.waitForTimeout(4000);
      log("row selected: drawn parts", await drawn(page));
      log("row selected: seam", await seam(page));
      log("row selected: panel", await panel(page));
      await page.screenshot({ path: join(SHOTS, "6_v2_row_selected.png") });
    }
    await page.close();
    const v1 = await open(1700, `?topology=${V1}`);
    await openPane(v1, V1);
    log("v1: drawn parts (matrices)", await drawn(v1));
    log("v1: seam", await seam(v1));
    await v1.screenshot({ path: join(SHOTS, "7_v1_pane_open.png") });
    // Back to v2 in the same page: what v1 loaded as context must go.
    await v1.locator(`[data-nav-kind="topology"][data-nav-id="${V2}"]`).first().click();
    await v1.waitForTimeout(6000);
    await sceneNow(v1);
    log("v1 -> v2: drawn parts", Object.keys(await drawn(v1)).length);
    log("v1 -> v2: panel", (await panel(v1)).other);
    await v1.screenshot({ path: join(SHOTS, "8_v1_back_to_v2.png") });
    // Played, then a DAG node hovered: the leaders follow the frames, and the
    // hovered node's takes the lighter emphasis.
    await loadSweep(v1);
    await run(v1, ["play"]);
    await v1.waitForTimeout(2500);
    log("playing: seam", await seam(v1));
    await run(v1, ["pause"]);
    const dot = v1.locator('svg.tv__rails circle.rail__dot[data-id="tan_link_upper_sphere_centre"]').first();
    if (await dot.count()) {
      await dot.hover({ force: true });
      await v1.waitForTimeout(800);
      log("hovered: hot leaders", await v1.evaluate(() => {
        const s = window.ViewerApp.lastSeamDraw;
        return s ? Object.entries(s.states).filter(([, v]) => v === "hot").map(([k]) => k) : null;
      }));
      await v1.screenshot({ path: join(SHOTS, "9_v2_node_hovered.png") });
    }
    await v1.close();
  } else {
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
