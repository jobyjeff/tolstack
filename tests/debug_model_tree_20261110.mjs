// Hand-run inspection probe for handoff the_model_is_derived_once_and_the_
// left_column_is_its_tree (2026-11-10). NOT a tier -- pytest never collects
// it, and it asserts nothing: it serves THIS tree's apps/ over the main
// checkout's data/ on a private port (as debug_integration_walk_20261108.mjs
// does) and takes the shots the handoff's definition of done names, at Jeff's
// two monitor widths, printing beside each what the page says about itself.
//
//   node tests/debug_model_tree_20261110.mjs [--phase tree|sweep|models|grid|probe|all]
//        [--shots <dir>] [--widths 3840,5120] [--repo C:/workspace/tolstack]
//
//   tree   -- v2 with the pane closed and open: the tree, a body open to its
//             parts and interfaces, one feature selected with its faces under it
//   sweep  -- v2 playing the sweep, then a feature selected, then the strip's
//             exit: back in the sweep
//   models -- the picker switched to v1 and back
//   grid   -- v2's grid: the part brackets, counted
//   probe  -- the pane's tree payload in both modes, and the nav's rows
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
  "docs/sessions/lessons/shots/the_model_is_derived_once_and_the_left_column_is_its_tree");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V1 = "vpa_pitch_linkage";
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

// The nav as the reader sees it: every row with its kind, id, depth and words.
const navRows = (page) => page.evaluate(() => {
  const nav = document.getElementById("navtree");
  const left = nav.getBoundingClientRect().left;
  return Array.from(nav.querySelectorAll("h2.navtree__heading, [data-nav-kind], [data-nav-group], select.navtree__select"))
    .filter((n) => n.getBoundingClientRect().height > 0)
    .map((n) => ({
      tag: n.tagName.toLowerCase(), kind: n.getAttribute("data-nav-kind") || n.getAttribute("data-nav-group") || n.className,
      id: n.getAttribute("data-nav-id"),
      x: Math.round(n.getBoundingClientRect().left - left),
      text: (n.tagName === "SELECT" ? n.options[n.selectedIndex].textContent : n.textContent).replace(/\s+/g, " ").trim().slice(0, 80),
      status: n.querySelector(".navtree__mark") ? n.querySelector(".navtree__mark").getAttribute("data-status") : undefined,
      on: n.classList.contains("navtree__row--on") || undefined,
    }));
});

const paneTree = (page) => frameOf(page) ? frameOf(page).evaluate(() => window.__embedTree || null) : null;

const braces = (page) => page.evaluate(() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel)).filter((n) => !n.closest(".tv__ghost"));
  return {
    partLabels: pick(".tvbrace__label--part").map((n) => n.textContent),
    partBraces: pick(".tvbrace--part").length,
    bodyLabels: pick(".tvbrace__label--body").map((n) => n.textContent),
    blocks: pick("rect.tv__block").length,
    partNames: pick(".tv__partname").map((n) => n.textContent),
  };
});

async function shot(page, name, extra) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  log(name, { ...(extra || {}), errors: page.__errors.splice(0) });
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
  const sw = await run(page, ["sweep", "latest"]).catch((e) => "ERR " + e.message);
  log("sweep", String(JSON.stringify(sw)).slice(0, 200));
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 });
  await page.waitForTimeout(5000);
}

const clickNav = async (page, kind, id) => {
  const row = page.locator(`#navtree [data-nav-kind="${kind}"][data-nav-id="${id}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await settle(page, 1200);
};
const toggleNav = async (page, key) => {
  await page.locator(`#navtree [data-nav-twisty="${key}"]`).first().click();
  await page.waitForTimeout(300);
};

async function tree(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  log(tag("nav at load"), await navRows(page));
  await shot(page, tag("t1_v2_pane_closed"));
  // The ground body open to its parts and its interfaces, the hub open.
  await toggleNav(page, "bi:base");
  await toggleNav(page, "p:hub");
  await toggleNav(page, "j:hub+tan_link_mount_215175_002");
  await shot(page, tag("t2_v2_body_open_parts_and_interfaces"), { nav: await navRows(page) });
  await openPane(page);
  await shot(page, tag("t3_v2_pane_open"));
  // A feature selected: its faces under it.
  await clickNav(page, "feature", "hub@hub_spindle_bore_axis");
  await page.waitForTimeout(4000);
  const faces = await page.evaluate(() => Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
    .map((n) => [n.getAttribute("data-scene-key"), (n.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)]));
  await shot(page, tag("t4_v2_feature_selected_with_faces"), { faces, paneTree: await paneTree(page) });
  await page.close();
}

async function sweep(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  await openPane(page);
  await clickNav(page, "kinematic-model", V2).catch(async () => { await loadSweep(page); });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(6000);
  await shot(page, tag("s1_v2_sweep_playing"), { nav: await navRows(page) });
  // A feature selected while the sweep plays.
  await clickNav(page, "feature", "pitch_link@pitch_link_lower_sphere_centre");
  await page.waitForTimeout(4000);
  const bar = await frameOf(page).evaluate(() => (document.querySelector("#detail") || {}).innerText);
  await shot(page, tag("s2_v2_feature_selected_in_sweep"), { bar, paneTree: await paneTree(page) });
  // Into binding (a goto on an edge), then the strip's exit: back in the sweep.
  await run(page, ["goto", V2, "pitch_link_length"]).catch((e) => log("goto", e.message));
  await page.waitForTimeout(3000);
  const strip = await frameOf(page).evaluate(() => ({
    bar: (document.querySelector("#detail") || {}).innerText,
    exit: !!document.querySelector("[data-bind-exit]"),
    sweep: !!window.__sweep,
  }));
  await shot(page, tag("s3_v2_binding_with_strip"), strip);
  await frameOf(page).evaluate(() => document.querySelector("[data-bind-exit]").click());
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return f && !!f.__sweep;
  }, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const back = await frameOf(page).evaluate(() => ({ sweep: !!window.__sweep,
    bar: (document.querySelector("#detail") || {}).innerText }));
  await shot(page, tag("s4_v2_back_in_sweep_after_exit"), back);
  await page.close();
}

async function models(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  const before = await navRows(page);
  await page.selectOption("#navtree select.navtree__select", `topology:${V1}`);
  await settle(page, 2000);
  const v1 = await navRows(page);
  await shot(page, tag("m1_v1_tree"), { headings: v1.filter((r) => r.tag === "h2").map((r) => r.text), rows: v1.length });
  await page.selectOption("#navtree select.navtree__select", `topology:${V2}`);
  await settle(page, 2000);
  const after = await navRows(page);
  await shot(page, tag("m2_back_to_v2"), { same: JSON.stringify(after) === JSON.stringify(before),
    v2Words: after.filter((r) => /legacy|Propeller/.test(r.text)).map((r) => r.text) });
  await page.close();
}

async function grid(width) {
  const H = 2160;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  const b = await braces(page);
  log(tag("braces"), b);
  const gridBox = page.locator("#topopane div.tv__rows").first();
  await gridBox.screenshot({ path: join(SHOTS, tag("g1_v2_grid_brackets") + ".png") }).catch(() => {});
  await shot(page, tag("g2_v2_page"), { partBraces: b.partBraces, partLabels: b.partLabels.length });
  await page.close();
}

async function probe() {
  const page = await open(2560, 1300, V2);
  log("probe: nav", await navRows(page));
  await openPane(page);
  log("probe: pane tree (bind)", await paneTree(page));
  await loadSweep(page);
  log("probe: pane tree (sweep)", await paneTree(page));
  log("probe: errors", page.__errors);
  await page.close();
}

try {
  if (PHASE === "probe" || PHASE === "all") await probe();
  for (const w of WIDTHS) {
    if (PHASE === "tree" || PHASE === "all") await tree(w);
    if (PHASE === "sweep" || PHASE === "all") await sweep(w);
    if (PHASE === "models" || PHASE === "all") await models(w);
    if (PHASE === "grid" || PHASE === "all") await grid(w);
  }
} finally {
  await browser.close();
  server.close();
}
