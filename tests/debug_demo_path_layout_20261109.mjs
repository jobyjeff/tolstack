// Hand-run inspection probe for handoff the_demo_path_reads_cleanly_on_a_
// projector (2026-11-09). NOT a tier -- pytest never collects it, and it
// asserts nothing: it opens v2 at a width, opens the 3D pane, and prints the
// row's boxes (nav, scene, DAG drawing, grid columns, Preview), what of the
// grid is on screen, the pane's status chip, and the computed stroke widths.
//
//   node tests/debug_demo_path_layout_20261109.mjs [--widths 1920] [--height 1200]
//        [--sweep] [--shots <dir>] [--repo C:/workspace/tolstack]
//
// Serves THIS tree's apps/ with data/ from the main checkout, as
// debug_integration_walk_20261108.mjs does.
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
const WIDTHS = (flag("--widths") || "1920").split(",").map(Number);
const HEIGHT = Number(flag("--height") || 1200);
const SWEEP = argv.includes("--sweep");
const SHOTS = flag("--shots") ? resolve(HERE, flag("--shots")) : null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
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

const layout = (page) => page.evaluate(() => {
  const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }; };
  const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
    .filter((n) => !n.closest(".tv__ghost"))[0] || document;
  const pane = document.querySelector("#topopane");
  const paneBox = box(pane);
  const cols = {};
  for (const th of live.querySelectorAll("thead th, .tvhead th")) {
    const cls = Array.from(th.classList).find((c) => c.startsWith("tvcol--") || c.startsWith("tvcell--")) || th.textContent.trim();
    cols[cls.replace(/^tv(col|cell)--/, "") || "?"] = box(th);
  }
  const onScreen = {};
  const right = Math.min(window.innerWidth, paneBox ? paneBox.right : window.innerWidth);
  for (const [k, b] of Object.entries(cols)) onScreen[k] = !!b && b.left >= (paneBox ? paneBox.left : 0) && b.right <= right;
  const sw = (sel) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).strokeWidth : null; };
  const bw = (sel) => { const el = live.querySelector(sel); return el ? getComputedStyle(el).borderTopWidth : null; };
  const chip = document.querySelector("#flyout-status");
  const hs = live.closest ? live : null;
  return {
    viewport: window.innerWidth,
    nav: box(document.querySelector("#navtree")), flyout: box(document.querySelector("#annotate-flyout[open]")),
    pane: paneBox, rails: box(live.querySelector("svg.tv__rails")), detail: box(document.querySelector(".tv .detail")),
    hscroll: hs ? { scrollLeft: hs.scrollLeft, scrollWidth: hs.scrollWidth, clientWidth: hs.clientWidth } : null,
    cols, onScreen,
    chip: chip ? { shown: chip.style.display !== "none", word: chip.textContent, tone: chip.getAttribute("data-tone") } : null,
    stroke: { bar: sw(".rail__bar"), rail: sw("line.rail"), link: sw("path.rail__link"), leader: sw("path.rail__leader"),
      seam: sw(".seam__leader"), bodyfield: sw("rect.tv__bodyfield"), partfield: sw("rect.tv__partfield"),
      block: sw("rect.tv__block"), braceBody: bw(".tvbrace--body"), bracePart: bw(".tvbrace--part") },
  };
});

try {
  for (const W of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: W, height: HEIGHT } });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
    page.on("response", (r) => { if (r.status() >= 400) errors.push("HTTP " + r.status() + " " + r.url()); });
    await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
    await page.waitForTimeout(2000);
    log(`${W} closed`, await layout(page));
    const row = page.locator(`[data-nav-kind="topology"][data-nav-id="${V2}"]`).first();
    await row.hover();
    await row.locator("[data-nav-3d]").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    await page.waitForTimeout(8000);
    log(`${W} pane open`, await layout(page));
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `layout_${W}_pane_open.png`) });
    if (SWEEP) {
      await frameOf(page).evaluate(() => window.AnnotateApp.exec(["sweep", "latest"]));
      await page.waitForTimeout(15000);
      log(`${W} sweep`, await layout(page));
      if (SHOTS) await page.screenshot({ path: join(SHOTS, `layout_${W}_sweep.png`) });
    }
    log(`${W} errors`, errors);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
