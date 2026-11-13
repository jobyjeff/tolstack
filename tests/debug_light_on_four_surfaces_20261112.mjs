// Hand-run inspection probe for handoff hover_and_select_light_the_same_
// things_on_all_four_surfaces_and_nothing_goes_opaque (2026-11-12). NOT a
// tier -- pytest never collects it. It serves this tree's apps/ over a data
// root (the main checkout's, or --repo <root built from this tree>) on a
// private port, the way debug_one_selection_both_ways_20261112.mjs does,
// opens the end-stop model v2 with the P2 sweep loaded from the Studies row,
// and walks the handoff's definition-of-done shots: each entity kind hovered
// or selected from the surface that draws it, with what every other surface
// shows printed beside the shot -- the tree's lit rows by tier, the grid's
// rows by tier, the DAG's dots, bars and containers, the pane's light layers
// and every drawn part's look and opacity read off the scene.
//
//   node tests/debug_light_on_four_surfaces_20261112.mjs [--width 3840|5120]
//        [--shots <dir>] [--repo <data root>] [--tag <suffix>] [--bind]
//
// `--bind` runs the same walk with no sweep loaded (rule 7).
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const WIDTH = Number(flag("--width") || 3840);
const TAG = flag("--tag") || ("_" + WIDTH);
const BIND = argv.indexOf("--bind") !== -1;
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/hover_and_select_light_the_same_things_on_all_four_surfaces_and_nothing_goes_opaque");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const HUB = "hub";
const MOUNT = "tan_link_mount_215175_002";
const PILOT = "hub_boss_in_tan_link_mount_pilot";
const BASE_FACE = "tan_link_mount_hub_face";
const HUB_JOINT = "hub+" + MOUNT;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".stl": "application/octet-stream", ".glb": "model/gltf-binary" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : HERE, rel);
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
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));
const run = (page, cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);

async function settle(page, ms = 800) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 })
    .catch(() => log("settle", "still tweening after 30s"));
  await page.waitForTimeout(ms);
}

async function open(query) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.goto(`${url}/apps/viewer/topology.html?${query}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

async function openPane(page) {
  if (!(await page.locator("#annotate-flyout[open]").count())) {
    await page.locator("#pane-handle").click({ timeout: 15000 });
  }
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function sweepReady(page) {
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 }).catch(() => log("sweep", "not loaded after 180s"));
  await run(page, ["pause"]).catch(() => {});
  await page.waitForTimeout(5000);
}

// What every surface shows, read off the page.
const surfaces = (page) => page.evaluate(() => {
  const q = (sel) => Array.from(document.querySelectorAll(sel));
  const ids = (nodes, attr) => Array.from(new Set(nodes.map((n) => n.getAttribute(attr)))).sort();
  const container = (n) => n.getAttribute("data-part") || n.getAttribute("data-block") ||
    n.getAttribute("data-body") || n.getAttribute("data-part-name");
  return {
    tree: {
      hot: ids(q("#navtree .navtree__row--hot"), "data-nav-id"),
      hotTouching: ids(q("#navtree .navtree__row--hot-touching"), "data-nav-id"),
      holds: q("#navtree .navtree__row--holds, #navtree .navtree__row--holds-touching")
        .map((n) => n.getAttribute("data-nav-id") || n.getAttribute("data-nav-fold")),
      on: ids(q("#navtree .navtree__row--on"), "data-nav-id"),
      onTouching: ids(q("#navtree .navtree__row--on-touching"), "data-nav-id"),
      scrollTop: document.getElementById("navtree").scrollTop,
    },
    grid: {
      own: ids(q("#topopane tr.tvrow--lead"), "data-id"),
      touching: ids(q("#topopane tr.tvrow--hot:not(.tvrow--lead)"), "data-id"),
      selected: ids(q("#topopane tr.tvrow--selected"), "data-id"),
      touched: ids(q("#topopane tr.tvrow--touched"), "data-id"),
      bracesLead: ids(q("#topopane .tvbrace--lead"), "data-brace-entity"),
      bracesSelected: ids(q("#topopane .tvbrace--selected"), "data-brace-entity"),
    },
    dag: {
      dotsOwn: ids(q("svg.tv__rails circle.rail__dot--lead"), "data-id"),
      dotsTouching: ids(q("svg.tv__rails circle.rail__dot--hot:not(.rail__dot--lead)"), "data-id"),
      dotsSelected: ids(q("svg.tv__rails circle.rail__dot--selected"), "data-id"),
      dotsTouched: ids(q("svg.tv__rails circle.rail__dot--touched"), "data-id"),
      barsOwn: q("svg.tv__rails .rail__bar--lead").length,
      barsTouching: q("svg.tv__rails .rail__bar--hot:not(.rail__bar--lead)").length,
      barsSelected: q("svg.tv__rails .rail__bar--selected").length,
      legs: q("svg.tv__rails line.rail--hot").length,
      containersOwn: Array.from(new Set(q("svg.tv__rails .tv__partfield--lead, svg.tv__rails .tv__block--lead, svg.tv__rails .tv__bodyfield--lead").map(container))),
      containersTouching: Array.from(new Set(q("svg.tv__rails .tv__partfield--hot:not(.tv__partfield--lead), svg.tv__rails .tv__block--hot:not(.tv__block--lead)").map(container))),
      containersSelected: Array.from(new Set(q("svg.tv__rails .tv__partfield--selected, svg.tv__rails .tv__block--selected, svg.tv__rails .tv__bodyfield--selected").map(container))),
    },
    preview: (() => { const p = document.querySelector(".detail__preview"); return p ? p.getAttribute("data-preview-state") + " " + p.getAttribute("data-preview-key") : null; })(),
  };
});
// The pane: its light's layers, and every drawn part's look and opacity.
const scene = (page) => frameOf(page).evaluate(() => {
  const AA = window.AnnotateApp;
  const names = {};
  for (const m of (window.__meshListForProbe || [])) names[m.sha256] = m.part_id;
  const view = AA.exec(["scene-view"]).filter((r) => r.visible).map((r) => ({
    part: r.part, look: r.look, opacity: r.opacity }));
  return { light: window.__lastLight ? window.__lastLight.layers : null, sweep: !!window.__sweep,
    parts: view, opaque: view.filter((r) => r.opacity >= 1).length };
});

async function shot(page, name, note) {
  await page.screenshot({ path: join(SHOTS, `${name}${TAG}.png`), timeout: 180000 });
  log(name, { note, page: await surfaces(page), scene: await scene(page), errors: page.__errors.splice(0) });
}

const navRow = (kind, id) => `#navtree [data-nav-kind="${kind}"][data-nav-id="${id}"]`;
async function hoverNav(page, kind, id) {
  const row = page.locator(navRow(kind, id)).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.hover({ timeout: 5000 });
  await page.waitForTimeout(900);
}
async function leaveNav(page) {
  await page.locator("#navtree h2.navtree__heading").first().hover({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);
}
async function clickNav(page, kind, id) {
  const row = page.locator(navRow(kind, id)).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.click({ timeout: 5000 });
  await settle(page, 1500);
  await page.mouse.move(4, 4);
  await page.waitForTimeout(900);
}
async function letGo(page) {
  await page.locator("#flyout-title").focus().catch(() => {});
  await page.keyboard.press("Escape");
  await settle(page, 1000);
}

const page = await open("topology=" + V2);
await openPane(page);
if (!BIND) {
  await page.locator(`#navtree [data-nav-kind="kinematic-model"][data-nav-id="${V2}"]`).first().click({ timeout: 10000 })
    .catch(async (e) => { log("studies row", e.message); await run(page, ["sweep", "latest"]); });
  await sweepReady(page);
} else {
  await page.waitForTimeout(8000);
}
const mode = BIND ? "bind" : "sweep";
if (!(await page.locator(navRow("feature", HUB + "@hub_spindle_bore_axis")).count())) {
  await page.locator('#navtree [data-nav-twisty="p:hub"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}
await shot(page, `${mode}_00_at_rest`, "nothing hovered or selected");

// A part hovered from the tree: own rows strong, interface rows faint, and
// the count of lit grid rows against the hub's dimensions.
await hoverNav(page, "part", HUB);
await shot(page, `${mode}_01_part_hovered_from_tree`, "hub hovered in the tree; grid own rows = hub's dimensions, touching = the pilot gap");
await leaveNav(page);
await shot(page, `${mode}_01b_after_leave`, "the pointer off the row");

// A part selected: bound faces stronger than the part.
await clickNav(page, "part", HUB);
await shot(page, `${mode}_02_part_selected`, "hub selected from the tree");
await letGo(page);

// A body selected.
await clickNav(page, "body", "base");
await shot(page, `${mode}_03_body_selected`, "base selected from the tree");
await letGo(page);

// The locating boss from the Parts section: the pilot interface row opens and scrolls into view.
await page.evaluate(() => { document.getElementById("navtree").scrollTop = 0; });
await clickNav(page, "feature", HUB + "@hub_spindle_bore_axis");
await shot(page, `${mode}_04_locating_boss_selected`, "hub@hub_spindle_bore_axis selected from Parts; the pilot interface row revealed");

// An interface hovered.
await hoverNav(page, "interface", BASE_FACE);
await shot(page, `${mode}_05_interface_hovered`, "tangential link mount base face hovered");
await leaveNav(page);

// A joint hovered.
await hoverNav(page, "joint", HUB_JOINT);
await shot(page, `${mode}_06_joint_hovered`, "hub and mount joint hovered");
await leaveNav(page);

// A gap edge hovered from the grid, with no part solid.
await letGo(page);
await page.evaluate((id) => {
  const cell = document.querySelector(`tr.tvrow[data-id="${id}"] td.tvcell--name`);
  if (cell) cell.scrollIntoView({ block: "center" });
}, PILOT);
await page.waitForTimeout(500);
const cell = page.locator(`#topopane tr.tvrow[data-id="${PILOT}"] td.tvcell--name`).first();
await cell.hover({ timeout: 5000 }).catch((e) => log("grid hover", e.message));
await page.waitForTimeout(900);
await shot(page, `${mode}_07_gap_hovered_from_grid`, "the pilot gap row hovered in the grid");
await page.mouse.move(4, 4);
await page.waitForTimeout(600);

// A part container hovered and selected on the DAG, and a bracket in the grid.
const hubBox = await page.locator('svg.tv__rails [data-block="hub"], svg.tv__rails [data-part="hub"]').first().boundingBox().catch(() => null);
if (hubBox) {
  await page.mouse.move(hubBox.x + 1, hubBox.y + hubBox.height / 2);
  await page.waitForTimeout(900);
  await shot(page, `${mode}_08_part_container_hovered_on_dag`, "the hub's container border under the pointer on the DAG");
  await page.mouse.click(hubBox.x + 1, hubBox.y + hubBox.height / 2);
  await settle(page, 1200);
  await page.mouse.move(4, 4);
  await page.waitForTimeout(900);
  await shot(page, `${mode}_09_part_selected_from_dag`, "the hub selected by its container on the DAG");
  await letGo(page);
}
const brace = await page.locator('#topopane .tvbrace[data-brace-entity="hub"]').first().boundingBox().catch(() => null);
if (brace) {
  await page.mouse.move(brace.x + brace.width / 2, brace.y + 1);
  await page.waitForTimeout(900);
  await shot(page, `${mode}_10_part_bracket_hovered_in_grid`, "the hub's bracket under the pointer in the grid");
  await page.mouse.move(4, 4);
}
await page.close();
await browser.close();
server.close();
