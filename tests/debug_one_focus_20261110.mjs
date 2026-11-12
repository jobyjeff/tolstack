// Hand-run inspection probe for handoff one_selection_one_hover_and_leaders_off
// (2026-11-10). NOT a tier -- pytest never collects it, and it asserts
// nothing: it serves THIS tree's apps/ over the main checkout's data/ on a
// private port (as debug_model_tree_20261110.mjs does) and takes the shots
// the handoff's definition of done names, at Jeff's two monitor widths,
// printing beside each what the page says about itself: which rows, marks
// and rows are lit on each surface, and what the pane holds.
//
//   node tests/debug_one_focus_20261110.mjs [--phase focus|nit|all]
//        [--shots <dir>] [--widths 3840,5120] [--repo C:/workspace/tolstack]
//
//   focus -- the end-stop model with the pane open on its sweep: one entity
//            clicked on each of the four surfaces in turn (a feature in the
//            tree, a node in the DAG, a row in the grid, an end in the 3D
//            pane), the window resized (a full repaint) after each, a hover
//            from the grid and from the tree, and leaders turned on once
//   nit   -- the hub's `locating boss` (has suggestions) and `blade 1 root
//            bearing bore` (has none): closed, then each opened in place
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
const PHASE = flag("--phase") || "all";
const WIDTHS = (flag("--widths") || "3840,5120").split(",").map(Number);
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/one_selection_one_hover_and_leaders_off");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
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
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 });
  await page.waitForTimeout(ms);
}

async function open(width, height, topology) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.status() >= 400) page.__errors.push("HTTP " + r.status() + " " + r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${topology}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

// What is lit, on every surface, as the DOM carries it.
const lit = (page) => page.evaluate(() => {
  const rows = (cls) => Array.from(document.querySelectorAll("#navtree .navtree__row." + cls))
    .map((n) => n.getAttribute("data-nav-kind") + ":" + n.getAttribute("data-nav-id"));
  const marks = (re) => Array.from(document.querySelectorAll("svg.tv__rails [data-row-kind][data-id]"))
    .filter((n) => !n.closest(".tv__ghost") && re.test(n.getAttribute("class") || ""))
    .map((n) => n.getAttribute("data-row-kind") + "|" + n.getAttribute("data-id"));
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
  const preview = document.querySelector(".detail__preview");
  const body = document.querySelector(".navtree__featurebody");
  return {
    navOn: rows("navtree__row--on"), navHot: rows("navtree__row--hot"),
    dagSelected: uniq(marks(/--selected|is-selected/)), dagLead: uniq(marks(/--lead/)), dagHot: uniq(marks(/--hot/)),
    gridSelected: Array.from(document.querySelectorAll("tr.tvrow--selected")).map((n) => n.getAttribute("data-id")),
    gridLead: Array.from(document.querySelectorAll("tr.tvrow--lead")).map((n) => n.getAttribute("data-id")),
    leaders: document.querySelectorAll("path.rail__leader").length,
    seam: document.querySelectorAll("svg.seamleaders path.seam__leader").length,
    toggle: (document.getElementById("leader-style-toggle") || {}).textContent,
    preview: preview ? { key: preview.getAttribute("data-preview-key"), state: preview.getAttribute("data-preview-state") } : null,
    openFeatures: Array.from(document.querySelectorAll(".navtree__scene[data-scene-feature]")).map((n) => n.getAttribute("data-scene-feature")),
    body: body ? body.innerText.replace(/\s+/g, " ").trim().slice(0, 240) : null,
    focus: null,
  };
});

const pane = (page) => frameOf(page) ? frameOf(page).evaluate(() => ({
  modelSelection: window.__lastModelSelection ? [window.__lastModelSelection.kind, window.__lastModelSelection.id] : null,
  hover: window.__lastHover ? window.__lastHover.target : null,
  highlight: window.__lastHighlight || null,
  inspect: window.__sweep && window.__sweep.inspect ? [window.__sweep.inspect.kind, window.__sweep.inspect.name, window.__sweep.inspect.direction] : null,
  selectedRows: Array.from(document.querySelectorAll("#sweep-tree li.tree-row.selected")).map((n) => n.dataset.feature + "/" + n.dataset.direction),
})) : null;

async function shot(page, name, extra) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  const state = { ...(extra || {}), lit: await lit(page), pane: await pane(page), errors: page.__errors.splice(0) };
  log(name, state);
}

async function navShot(page, name) {
  await page.locator("#navtree").screenshot({ path: join(SHOTS, `${name}.png`) }).catch(() => {});
}

async function openPane(page) {
  await page.locator("#pane-handle").click({ timeout: 15000 });
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function loadSweep(page) {
  await page.locator(`#navtree [data-nav-kind="kinematic-model"][data-nav-id="${V2}"]`).first().click({ timeout: 10000 })
    .catch(async () => { await run(page, ["sweep", "latest"]).catch((e) => log("sweep", e.message)); });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 }).catch(() => {});
  await run(page, ["pause"]).catch(() => {});
  await page.waitForTimeout(5000);
}

const clickNav = async (page, kind, id) => {
  const row = page.locator(`#navtree [data-nav-kind="${kind}"][data-nav-id="${id}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await settle(page, 1500);
};
const toggleNav = async (page, key) => {
  await page.locator(`#navtree [data-nav-twisty="${key}"]`).first().click();
  await page.waitForTimeout(300);
};
// A repaint the reader can make: the window narrower, then back.
async function repaint(page, width, height) {
  await page.setViewportSize({ width: width - 400, height });
  await page.waitForTimeout(800);
  await page.setViewportSize({ width, height });
  await settle(page, 1500);
}

async function focus(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  await openPane(page);
  await loadSweep(page);
  await shot(page, tag("f0_v2_sweep_loaded_leaders_off"));

  // 1. the tree: a feature row.
  await toggleNav(page, "p:hub");
  await clickNav(page, "feature", "hub@hub_spindle_bore_axis");
  await page.waitForTimeout(3000);
  await shot(page, tag("f1_tree_feature_selected"));
  await repaint(page, width, H);
  await shot(page, tag("f1b_tree_feature_after_repaint"));

  // 2. the DAG: a node's dot.
  const dot = page.locator('svg.tv__rails circle.rail__dot[data-id="tan_link_mount_pilot_bore"]').first();
  await dot.scrollIntoViewIfNeeded().catch(() => {});
  await dot.click({ force: true }).catch((e) => log("dag click", e.message));
  await settle(page, 2500);
  await shot(page, tag("f2_dag_node_selected"));
  await repaint(page, width, H);
  await shot(page, tag("f2b_dag_node_after_repaint"));

  // 3. the grid: a row.
  const row = page.locator('tr.tvrow[data-id="tan_link_mount_height"] td.tvcell--name').first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.click().catch((e) => log("grid click", e.message));
  await settle(page, 2500);
  await shot(page, tag("f3_grid_row_selected"));
  await repaint(page, width, H);
  await shot(page, tag("f3b_grid_row_after_repaint"));

  // 4. the 3D pane: an end selected in the scene (what a bead or face click
  //    does in sweep mode: the rail's own `inspect`), and an anchor picked.
  await run(page, ["inspect", "feature", "pitch_plate_slide_bushings_to_piston_body", "from"]).catch(async (e) => {
    log("inspect", e.message);
    await frameOf(page).evaluate(() => window.parent.postMessage(
      window.AnnotateApp.modelPickMessage("gas_spring_mount_bushing_bore"), window.location.origin));
  });
  await settle(page, 3000);
  await shot(page, tag("f4_scene_end_selected"));
  await repaint(page, width, H);
  await shot(page, tag("f4b_scene_end_after_repaint"));

  // Hover from the grid and from the tree: the other surfaces light.
  await page.locator('tr.tvrow[data-id="hub_blade_axis_offset"] td.tvcell--name').first().hover().catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, tag("f5_grid_row_hovered"));
  await page.locator('#navtree [data-nav-kind="part"][data-nav-id="hub"]').first().hover().catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, tag("f6_tree_part_hovered"));
  await page.mouse.move(4, 4);
  await page.waitForTimeout(800);

  // Leaders on: the same selection, drawn with its leaders.
  await page.locator("#leader-style-toggle").click();
  await settle(page, 2500);
  await shot(page, tag("f7_leaders_on"));
  await page.close();
}

async function nit(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  await openPane(page);
  await loadSweep(page);
  await toggleNav(page, "p:hub");
  await page.waitForTimeout(1000);
  await shot(page, tag("n1_hub_open_features_closed"));
  await navShot(page, tag("n1_nav_hub_open_features_closed"));
  await clickNav(page, "feature", "hub@hub_spindle_bore_axis");
  await page.waitForTimeout(4000);
  await shot(page, tag("n2_locating_boss_open"));
  await navShot(page, tag("n2_nav_locating_boss_open"));
  await clickNav(page, "feature", "hub@hub_blade1_root_bearing_bore");
  await page.waitForTimeout(4000);
  await shot(page, tag("n3_root_bearing_bore_open"));
  await navShot(page, tag("n3_nav_root_bearing_bore_open"));
  // The reader folds the selected row: it stays selected, closed.
  await toggleNav(page, "f:hub@hub_blade1_root_bearing_bore");
  await page.waitForTimeout(1000);
  await navShot(page, tag("n4_nav_selected_row_folded"));
  log(tag("n4 folded"), await lit(page));
  await page.close();
}

try {
  for (const w of WIDTHS) {
    if (PHASE === "focus" || PHASE === "all") await focus(w);
    if (PHASE === "nit" || PHASE === "all") await nit(w);
  }
} finally {
  await browser.close();
  server.close();
}
