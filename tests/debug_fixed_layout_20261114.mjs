// Hand-run inspection probe for handoff the_page_is_a_fixed_layout_and_
// nothing_scrolls_the_document (2026-11-14). NOT a tier -- pytest never
// collects it. It serves an apps/ tree (this one, or --apps <root>) over a
// data/ root (the main checkout's, or --repo <root>) on a private port, the
// way debug_one_selection_both_ways_20261112.mjs does, opens each model at
// each window size in each of the three views of the middle (VA.PANE_VIEWS),
// prints what the document and each region measure, and takes one shot each.
//
//   node tests/debug_fixed_layout_20261114.mjs [--sizes 3840x2160,5120x2160]
//        [--models vpa_end_stop_v2,vpa_pitch_linkage] [--views both,3d,dag]
//        [--shots <dir>] [--apps <root>] [--repo C:/workspace/tolstack]
//        [--no-pane] [--film]
//
// --film adds a filmstrip of a tree selection scrolling its grid row and its
// DAG mark into view inside their own regions (v2, the first size).
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const APPS = resolve(flag("--apps") || HERE);
const SIZES = (flag("--sizes") || "3840x2160,5120x2160").split(",")
  .map((s) => s.split("x").map(Number));
const MODELS = (flag("--models") || "vpa_end_stop_v2,vpa_pitch_linkage").split(",");
const VIEWS = (flag("--views") || "both,3d,dag").split(",");
const PANE = argv.indexOf("--no-pane") === -1;
const FILM = argv.indexOf("--film") !== -1;
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_page_is_a_fixed_layout_and_nothing_scrolls_the_document");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".stl": "application/octet-stream", ".glb": "model/gltf-binary", ".jsonl": "application/json" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : APPS, rel);
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

async function settle(page, ms = 600) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 })
    .catch(() => log("settle", "still tweening after 30s"));
  await page.waitForTimeout(ms);
}

async function open(w, h, query) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
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
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow)
      .find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => log("pane", "no tree after 120s"));
  await page.waitForTimeout(2500);
}

// What the document and each region measure.
const MEASURE = () => {
  const d = document.scrollingElement;
  const box = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const r = n.getBoundingClientRect();
    return r.width || r.height ? [Math.round(r.left), Math.round(r.top),
      Math.round(r.width), Math.round(r.height)] : null;
  };
  const scroller = (sel) => {
    const n = document.querySelector(sel);
    return n ? { client: [n.clientWidth, n.clientHeight], scroll: [n.scrollWidth, n.scrollHeight] } : null;
  };
  return {
    window: [window.innerWidth, window.innerHeight],
    doc: { client: [d.clientWidth, d.clientHeight], scroll: [d.scrollWidth, d.scrollHeight],
           overflowX: d.scrollWidth - d.clientWidth, overflowY: d.scrollHeight - d.clientHeight },
    tree: box("#navtree"), pane: box("#annotate-flyout"), dag: box("#topopane .tv__hscroll"),
    toolbar: box("#toolbar"), grid: box("#topogrid"), preview: box("#detail"),
    dagScroll: scroller("#topopane .tv__hscroll"), gridScroll: scroller("#topogrid .tv__gridscroll"),
    previewScroll: scroller("#detail"), treeScroll: scroller("#navtree"),
    view: Array.from(document.querySelector("main.tv").classList).join(" "),
  };
};

const results = [];
for (const [w, h] of SIZES) {
  for (const model of MODELS) {
    const page = await open(w, h, `topology=${model}`);
    if (PANE) await openPane(page);
    for (const view of (PANE ? VIEWS : ["both"])) {
      if (PANE) {
        await page.evaluate((v) => {
          const b = document.querySelector(`#pane-view button[data-view="${v}"]`);
          if (b) b.click();
        }, view);
        await settle(page, 1500);
      }
      const m = await page.evaluate(MEASURE);
      m.size = `${w}x${h}`; m.model = model; m.state = view;
      m.url = await page.evaluate(() => location.search);
      results.push(m);
      log("measure", m);
      const name = `${w}x${h}_${model}_${view}.png`;
      await page.screenshot({ path: join(SHOTS, name) });
    }
    if (page.__errors.length) log("errors", page.__errors.slice(0, 8));
    await page.close();
  }
}
writeFileSync(join(SHOTS, "measurements.json"), JSON.stringify(results, null, 1));

if (FILM) {
  const [w, h] = SIZES[0];
  const page = await open(w, h, `topology=${MODELS[0]}`);
  // A part far down the tree: its rows are far down the grid and its marks far
  // down the DAG. The regions start at their tops.
  await page.evaluate(() => {
    document.querySelector("#topopane .tv__hscroll").scrollTop = 0;
    document.querySelector("#topogrid .tv__gridscroll").scrollTop = 0;
  });
  const target = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#topogrid tr.tvrow--edge[data-id]"));
    const last = rows[rows.length - 1];
    return last ? last.getAttribute("data-id") : null;
  });
  log("film target", target);
  const before = await page.evaluate(() => ({
    dag: document.querySelector("#topopane .tv__hscroll").scrollTop,
    grid: document.querySelector("#topogrid .tv__gridscroll").scrollTop }));
  const navRow = page.locator(`#navtree [data-edge="${target}"], #navtree [data-id="${target}"]`).first();
  const hasRow = await navRow.count();
  log("tree row for target", hasRow);
  const shots = [];
  if (hasRow) {
    await navRow.scrollIntoViewIfNeeded();
    await navRow.click();
    for (let i = 0; i < 6; i++) {
      const f = join(SHOTS, `film_${i}.png`);
      await page.screenshot({ path: f });
      shots.push(f);
      await page.waitForTimeout(120);
    }
  } else {
    await page.evaluate((id) => window.ViewerApp.__selectForProbe &&
      window.ViewerApp.__selectForProbe("edge", id), target);
  }
  const after = await page.evaluate(() => ({
    dag: document.querySelector("#topopane .tv__hscroll").scrollTop,
    grid: document.querySelector("#topogrid .tv__gridscroll").scrollTop,
    doc: document.scrollingElement.scrollTop }));
  log("film scroll", { before, after });
  await page.close();
}

await browser.close();
server.close();
