// Hand-run inspection probe for handoff the_map_is_the_only_drawing_and_classic_retires
// (2026-11-17). NOT a tier -- pytest never collects it.
//
//   node tests/debug_classic_retired_20261117.mjs --shots <dir> [--repo <data root>]
//        [--tree <apps root>] [--prefix <name>] [--only regions|bar|click]
//
// Serves `--tree`'s apps/ (default: this tree; a `git archive` of master for
// the "before" bar) with data/ from `--repo` (default: the main checkout).
//
//   regions  v2 and v1 at 3840x2160, Side by side and DAG view: a shot of the
//            page and of the region, and a line each: the region, the zoom,
//            the drawn counts against the model's, boxes that overlap, the
//            layout's defect notes, and how long a paint of the region took.
//   bar      the settings bar of v1 at 3840x2160, as a shot and as its words.
//   click    the exploratory click-around on v2 and v1: every kind of thing
//            the map draws hovered and clicked, a grid row, a tree row, the
//            wheel, a drag, Fit, the 0 key, a resize, the 3D pane opened.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const TREE = resolve(flag("--tree") || HERE);
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/the_map_is_the_only_drawing_and_classic_retires");
const PREFIX = flag("--prefix") || "";
const ONLY = flag("--only");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const MODELS = { v2: "vpa_end_stop_v2", v1: "vpa_pitch_linkage" };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary", ".stl": "model/stl", ".wasm": "application/wasm" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : TREE, rel);
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
const log = [];
const say = (line) => { console.log(line); log.push(line); };

async function open(model, width, height, { view = "both" } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
  await page.addInitScript(({ view }) => {
    try {
      localStorage.setItem("tolstack.viewer.paneView", view);
      // The "before" tree still has the switch: draw its default, the map
      // where the model has a layout.
      localStorage.setItem("tolstack.viewer.dagDrawing", "map");
    } catch (e) { /* no storage */ }
  }, { view });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${MODELS[model]}`, { waitUntil: "load" });
  await page.waitForSelector("#topogrid tr.tvrow", { timeout: 60000 });
  await page.waitForSelector("#topopane svg", { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    try {
      const r = await fetch("../../data/projections/viewer/topologies.json");
      window.__topologies = (await r.json()).topologies;
    } catch (e) { window.__topologies = []; }
  });
  return page;
}

async function openPane(page) {
  await page.waitForSelector("#pane-handle:visible", { timeout: 20000 }).catch(() => {});
  if (!(await page.locator("#pane-handle").isVisible())) return false;
  await page.locator("#pane-handle").click({ noWaitAfter: true });
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return true;
}

// What the region drew, measured off the map's own geometry and the DOM.
const measure = (page) => page.evaluate(() => {
  const VA = window.ViewerApp;
  const pane = document.getElementById("topopane").getBoundingClientRect();
  const svg = document.querySelector("#topopane svg.tv__map");
  if (!svg) return { pane: [Math.round(pane.width), Math.round(pane.height)], map: false,
                     rails: !!document.querySelector("#topopane svg.tv__rails") };
  const geo = VA.lastMapLight && VA.lastMapLight.geometry;
  const boxes = (geo ? geo.boxes : []).filter((b) => !b.child);
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps++;
    }
  }
  const notes = geo ? geo.notes || [] : [];
  return {
    pane: [Math.round(pane.width), Math.round(pane.height)], map: true,
    zoom: Number(svg.getAttribute("data-zoom")),
    counts: geo ? VA.mapCounts(geo) : null,
    expected: (() => {
      const id = svg.getAttribute("data-topology");
      const topo = (window.__topologies || []).filter((t) => t.id === id)[0];
      return topo ? VA.mapExpectedCounts(topo.model) : null;
    })(),
    boxOverlaps: overlaps,
    notes: notes.length,
    routedThrough: notes.filter((n) => / is routed through /.test(n)).length,
    noteSample: notes.slice(0, 6),
  };
});

// One paint of the region, timed in the page: the density toggle repaints the
// pane (and the grid) with the same rows.
const paintMs = (page) => page.evaluate(async () => {
  const t = document.getElementById("density-toggle");
  if (!t) return null;
  const runs = [];
  for (let i = 0; i < 4; i++) {
    const t0 = performance.now();
    t.click();
    runs.push(performance.now() - t0);
    await new Promise((r) => requestAnimationFrame(() => r()));
  }
  return Math.round(Math.max(...runs));
});

async function shoot(page, name) {
  await page.screenshot({ path: join(SHOTS, PREFIX + name + ".png") });
  say(`  shot ${PREFIX}${name}.png`);
}

if (!ONLY || ONLY === "regions") {
  say("== the regions, 3840x2160");
  for (const model of ["v2", "v1"]) {
    for (const view of ["both", "dag"]) {
      const page = await open(model, 3840, 2160, { view });
      const opened = await openPane(page);
      const m = await measure(page);
      const ms = await paintMs(page);
      say(`${model} ${view} (pane ${opened ? "open" : "not served"}): region ${m.pane.join("x")}, ` +
        `map ${m.map}, zoom ${m.zoom}, counts ${JSON.stringify(m.counts)} vs the model's ${JSON.stringify(m.expected)}, box overlaps ${m.boxOverlaps}, ` +
        `defect notes ${m.notes} (routed through a box: ${m.routedThrough}), slowest of four repaints ${ms} ms` +
        (m.noteSample && m.noteSample.length ? `\n    notes: ${m.noteSample.join(" | ")}` : ""));
      await shoot(page, `${model}_3840_${view}`);
      await page.locator("#topopane").screenshot({ path: join(SHOTS, `${PREFIX}${model}_3840_${view}_region.png`) });
      await page.close();
    }
  }
}

if (!ONLY || ONLY === "bar") {
  say("== the settings bar, v1 3840x2160 side by side");
  const page = await open("v1", 3840, 2160, { view: "both" });
  await openPane(page);
  const words = await page.evaluate(() => Array.from(document.querySelectorAll(
    "#toolbar > button, #toolbar > details > summary, #toolbar .tvview button, #dag-drawing button"))
    .map((b) => b.textContent.trim()));
  say(`bar: ${words.join(" | ")}`);
  await page.locator("#toolbar").screenshot({ path: join(SHOTS, `${PREFIX}bar.png`) });
  say(`  shot ${PREFIX}bar.png`);
  await page.close();
}

if (!ONLY || ONLY === "click") {
  for (const model of ["v2", "v1"]) {
    say(`== the click-around, ${model}, 3840x2160 side by side`);
    const page = await open(model, 3840, 2160);
    let step = 0;
    const at = async (what, fn) => {
      step += 1;
      let note = "";
      try { note = (await fn()) || ""; } catch (e) { note = "THREW " + e.message.split("\n")[0].slice(0, 200); }
      await page.waitForTimeout(350);
      const state = await page.evaluate(() => {
        const on = (sel) => document.querySelectorAll(sel).length;
        const svg = document.querySelector("#topopane svg.tv__map");
        return `zoom ${svg ? svg.getAttribute("data-zoom") : "-"}; map lead ${on("#topopane [class*='--lead']")} hot ${on("#topopane [class*='--hot']")} ` +
          `selected ${on("#topopane [class*='--selected']")} touched ${on("#topopane [class*='--touched']")}; ` +
          `tree hot ${on("#navtree .navtree__row--hot")} on ${on("#navtree .navtree__row--on")}; ` +
          `grid lead ${on("#topogrid tr.tvrow--lead")} hot ${on("#topogrid tr.tvrow--hot")} selected ${on("#topogrid tr.tvrow--selected")}; ` +
          `preview "${(document.querySelector("#detail h2, #detail h3") || {}).textContent || ""}"; doc scroll ${document.scrollingElement.scrollTop}`;
      });
      say(`${step}. ${what}: ${state}${note ? "; " + note : ""}`);
      await shoot(page, `click_${model}_${String(step).padStart(2, "0")}_${what.replace(/[^a-z0-9]+/gi, "_").toLowerCase().slice(0, 48)}`);
    };
    const first = (sel) => page.locator(sel).first();
    const pointOnLine = (sel) => page.evaluate((s) => {
      const line = document.querySelector(s);
      const p = line.getPointAtLength(line.getTotalLength() * 0.25);
      const m = line.getScreenCTM();
      return [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f];
    }, sel);
    await at("landing", async () => "");
    await at("hover a pin", () => first("#topopane g.map__pin circle.map__pinhit").hover({ timeout: 5000 }));
    await at("hover a jumper", async () => { const [x, y] = await pointOnLine("#topopane g.map__jumper path.map__jumperhit"); await page.mouse.move(x, y); });
    await at("hover a connector", async () => { const [x, y] = await pointOnLine("#topopane g.map__connector path.map__connectorline"); await page.mouse.move(x, y); });
    await at("hover a box", () => first("#topopane g.map__partname").hover({ timeout: 5000 }));
    await at("hover a district's name", () => first("#topopane .map__bodyname").hover({ timeout: 5000 }));
    await at("click a box", () => first("#topopane g.map__partname").click({ timeout: 5000, noWaitAfter: true }));
    await at("click a connector", async () => { const [x, y] = await pointOnLine("#topopane g.map__connector path.map__connectorline"); await page.mouse.click(x, y); });
    await at("click a pin", () => first("#topopane g.map__pin circle.map__pinhit").click({ timeout: 5000, noWaitAfter: true }));
    await at("hover a grid row", () => page.locator("#topogrid tr.tvrow").nth(3).hover({ timeout: 5000 }));
    await at("click a grid row", () => page.locator("#topogrid tr.tvrow td").nth(3 * 10).click({ timeout: 5000, noWaitAfter: true }));
    await at("click a tree part row", () => first('#navtree [data-nav-kind="part"]').click({ timeout: 5000, noWaitAfter: true }));
    await at("Escape", () => page.keyboard.press("Escape"));
    await at("wheel in, three notches", async () => {
      const r = await page.evaluate(() => { const b = document.getElementById("topopane").getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      for (let i = 0; i < 3; i++) { await page.mouse.move(r[0], r[1]); await page.mouse.wheel(0, -100); await page.waitForTimeout(80); }
    });
    await at("drag the empty space", async () => {
      const p = await page.evaluate(() => { const b = document.getElementById("topopane").getBoundingClientRect(); return [b.left + 40, b.bottom - 40]; });
      await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(p[0] + 220, p[1] - 160, { steps: 6 }); await page.mouse.up();
    });
    await at("Fit", () => page.locator("#dag-fit").click({ timeout: 5000, noWaitAfter: true }));
    await at("wheel out then the 0 key", async () => {
      const r = await page.evaluate(() => { const b = document.getElementById("topopane").getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      await page.mouse.move(r[0], r[1]); await page.mouse.wheel(0, 300); await page.waitForTimeout(100);
      await page.locator("body").click({ position: { x: 5, y: 5 }, noWaitAfter: true });
      await page.keyboard.press("0");
    });
    await at("resize to 1920x1080", () => page.setViewportSize({ width: 1920, height: 1080 }));
    await at("resize back to 3840x2160", () => page.setViewportSize({ width: 3840, height: 2160 }));
    await at("the 3D pane opened beside it", async () => (await openPane(page)) ? "" : "no pane handle (annotator not served)");
    await at("DAG view", async () => { const b = page.locator('#pane-view button[data-view="dag"]'); if (await b.count()) await b.click({ noWaitAfter: true }); else return "no view control"; });
    await at("Side by side again", async () => { const b = page.locator('#pane-view button[data-view="both"]'); if (await b.count()) await b.click({ noWaitAfter: true }); else return "no view control"; });
    await at("a study opened (v1) or the model row (v2)", async () => {
      const s = page.locator('#navtree [data-nav-kind="study"]').first();
      if (await s.count()) { await s.click({ timeout: 5000, noWaitAfter: true }); return "study"; }
      return "no study on this model";
    });
    await page.close();
  }
}

writeFileSync(join(SHOTS, `${PREFIX}${ONLY || "all"}_log.txt`), log.join("\n") + "\n", "utf-8");
await browser.close();
server.close();
