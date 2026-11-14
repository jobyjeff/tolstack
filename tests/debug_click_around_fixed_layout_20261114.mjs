// Hand-run exploratory click-around for handoff the_page_is_a_fixed_layout_
// and_nothing_scrolls_the_document (2026-11-14). NOT a tier -- pytest never
// collects it. The end-stop model at 3840x2160 with the 3D pane open: every
// seam dragged, a grid column widened, the model switched, a kinematic study
// page and a chain study page opened, the view control cycled, and after each
// step a shot plus what the document and the regions measure.
//
//   node tests/debug_click_around_fixed_layout_20261114.mjs
//        [--repo <a data root built from this tree>] [--shots <dir>] [--width 3840]
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
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_page_is_a_fixed_layout_and_nothing_scrolls_the_document/click_around");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

const settle = async (ms = 800) => {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
};
const measure = () => page.evaluate(() => {
  const d = document.scrollingElement;
  const w = (sel) => { const n = document.querySelector(sel); return n ? Math.round(n.getBoundingClientRect().width) : null; };
  const h = (sel) => { const n = document.querySelector(sel); return n ? Math.round(n.getBoundingClientRect().height) : null; };
  return { docOverflow: [d.scrollWidth - d.clientWidth, d.scrollHeight - d.clientHeight],
    tree: w("#navtree"), pane: w("#annotate-flyout"), dag: w("#topopane"), column: w(".tv__main"),
    preview: h("#detail"), grid: h("#topogrid"), contribution: window.ViewerApp.topoColumn("contribution").width,
    view: document.querySelector("main.tv").className, url: location.search };
});
let n = 0;
const step = async (name) => {
  await settle();
  const m = await measure();
  const file = `${String(++n).padStart(2, "0")}_${name}.png`;
  await page.screenshot({ path: join(SHOTS, file) });
  console.log(JSON.stringify({ step: file, ...m }));
};
const drag = async (sel, dx, dy) => {
  const b = await page.locator(sel).first().boundingBox();
  if (!b) { console.log(JSON.stringify({ drag: sel, missing: true })); return; }
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 600);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
};

await page.goto(`${url}/apps/viewer/topology.html?topology=vpa_end_stop_v2`, { waitUntil: "load" });
await page.waitForSelector("#topogrid tr.tvrow", { timeout: 30000 });
await step("v2_at_rest");
await page.locator("#pane-handle").click({ timeout: 15000 }).catch(() => {});
await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(8000);
await step("pane_open");
await drag("#nav-divider", 120, 0);
await step("tree_widened");
await drag("#flyout-divider", -300, 0);
await step("pane_narrowed");
await drag("#side-divider", -250, 0);
await step("column_widened");
await drag("#detail-divider", 0, -300);
await step("preview_taller");
await drag('.tvgrip--col[data-resize="column:contribution"]', 160, 0);
await step("contribution_widened");
for (const v of ["3d", "dag", "both"]) {
  await page.locator(`#pane-view button[data-view="${v}"]`).click().catch(() => {});
  await step("view_" + v);
}
await page.selectOption("#navtree select", "topology:vpa_pitch_linkage").catch((e) =>
  console.log(JSON.stringify({ switch: String(e).slice(0, 200) })));
await page.waitForTimeout(3000);
await step("switched_model");
const kin = page.locator('[data-nav-kind="kinematic"]').first();
if (await kin.count()) {
  await kin.click();
  await page.waitForTimeout(4000);
  await step("kinematic_study_page");
}
const chain = page.locator('[data-nav-kind="study"]').first();
if (await chain.count()) {
  await chain.click();
  await page.waitForTimeout(3000);
  await step("chain_study_page");
}
await page.mouse.wheel(0, 600);
await step("wheel_over_page");
console.log(JSON.stringify({ errors }));
await browser.close();
server.close();
