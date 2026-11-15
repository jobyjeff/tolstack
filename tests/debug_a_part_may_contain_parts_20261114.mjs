// Hand-run exploratory click-around for handoff a_part_may_contain_parts
// (2026-11-14). NOT a tier -- pytest never collects it. The end-stop model at
// 3840x2160: the DAG as drawn (the "before" run serves integration's apps/,
// the "after" run this tree's), the tree with the pitch link assembly open,
// the grid with the assemblies collapsed and then expanded, and the 3D pane
// with the bearing hovered and a bound feature selected. A "demo" run reads a
// scratch projection of v1 with two of the pitch plate's bushings nested in
// it, so a real study's grid can be folded and its totals compared.
//
//   node tests/debug_a_part_may_contain_parts_20261114.mjs --mode before|after|demo
//        [--apps <root serving apps/>] [--topologies <a topologies.json built from
//        this tree>] [--repo <data root>] [--shots <dir>]
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const MODE = flag("--mode") || "after";
const APPS = resolve(flag("--apps") || HERE);
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const TOPOLOGIES = flag("--topologies") ? resolve(flag("--topologies")) : null;
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_part_may_contain_parts");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".stl": "application/octet-stream", ".glb": "model/gltf-binary" };
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = TOPOLOGIES && rel === "data/projections/viewer/topologies.json" ? TOPOLOGIES
      : join(rel.startsWith("data/") ? DATA_REPO : APPS, rel);
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
const context = await browser.newContext({ viewport: { width: 3840, height: 2160 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

const settle = async (ms = 800) => {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
};
const shot = async (name, sel) => {
  await settle();
  const file = join(SHOTS, `${MODE}_${name}.png`);
  if (sel) await page.locator(sel).first().screenshot({ path: file });
  else await page.screenshot({ path: file });
  console.log(JSON.stringify({ shot: `${MODE}_${name}.png` }));
};
// The grid as words: each row's part, element and the four value columns,
// and the foot.
const gridText = () => page.evaluate(() => {
  const cells = (tr) => ["part", "description", "name", "nominal", "min", "max", "contribution"]
    .map((c) => { const td = tr.querySelector("td.tvcell--" + c); return td ? td.textContent.trim() : ""; });
  return {
    rows: Array.from(document.querySelectorAll("#topogrid tbody tr")).map((tr) =>
      (tr.classList.contains("tvrow--rollup") ? "[folded " + tr.getAttribute("data-assembly") + "] " : "") +
      cells(tr).join(" | ")),
    foot: Array.from(document.querySelectorAll("#topogrid tfoot tr")).map((tr) => tr.textContent.trim()),
  };
});
const click = async (sel) => {
  const n = page.locator(sel).first();
  if (!(await n.count())) { console.log(JSON.stringify({ missing: sel })); return false; }
  await n.click();
  return true;
};

const topology = MODE === "demo" ? "vpa_pitch_linkage&study=pitch_link_cotter_hole_clearance" : "vpa_end_stop_v2";
await page.goto(`${url}/apps/viewer/topology.html?topology=${topology}`, { waitUntil: "load" });
await page.waitForSelector("#topogrid tr.tvrow", { timeout: 30000 });
await page.evaluate(() => {
  try { localStorage.removeItem("tolstack.viewer.collapsedAssemblies"); } catch (e) { /* none */ }
});
await page.reload({ waitUntil: "load" });
await page.waitForSelector("#topogrid tr.tvrow", { timeout: 30000 });

await shot("page");
await shot("dag", "#topopane");
if (MODE !== "before") {
  console.log(JSON.stringify({ expanded: await gridText() }));
  await shot("grid_expanded", "#topogrid");
  if (await click("#assemblies-collapse")) {
    console.log(JSON.stringify({ collapsed: await gridText() }));
    await shot("grid_collapsed", "#topogrid");
    await shot("page_collapsed");
    await shot("dag_collapsed", "#topopane");
    // Remembered across a reload.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#topogrid tr.tvrow", { timeout: 30000 });
    console.log(JSON.stringify({ afterReload: (await gridText()).rows.filter((r) => r.startsWith("[folded")) }));
    await click("#assemblies-expand");
    console.log(JSON.stringify({ reExpanded: (await gridText()).rows.length }));
  }
}
if (MODE === "after") {
  await click('[data-nav-twisty="p:pitch_link"]');
  await shot("tree_pitch_link_open", "#navtree");
  await shot("page_tree_pitch_link_open");
  // Select the assembly from the tree: it and its bearing light.
  await click('div.navtree__row--part[data-nav-id="pitch_link"]');
  await shot("assembly_selected");
  // The 3D pane, the bearing hovered in the tree, then a bound feature.
  await page.locator("#pane-handle").click({ timeout: 15000 }).catch(() => {});
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(10000);
  await page.locator('div.navtree__row--part[data-nav-id="spherical_bearing_pitch_link"]').first().hover();
  await page.waitForTimeout(1500);
  await shot("pane_bearing_hovered");
  const bound = await page.evaluate(() => {
    const m = document.querySelector('#navtree .navtree__mark[data-status="bound"]');
    const row = m && m.closest("div.navtree__row");
    return row ? row.getAttribute("data-nav-id") : null;
  });
  console.log(JSON.stringify({ firstBoundFeatureDrawn: bound }));
  if (bound) {
    await click(`div.navtree__row[data-nav-id="${bound}"]`);
    await page.waitForTimeout(2500);
    await shot("pane_bound_feature_selected");
  }
}
console.log(JSON.stringify({ errors }));
await browser.close();
server.close();
