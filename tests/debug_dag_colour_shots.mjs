// Debug script (handoff the_dag_is_coloured_by_a_chosen_attribute_and_spaced_
// to_taste, 2026-11-05): screenshots the kinematic study's DAG on the REAL
// projection at each graph width, under each colour overlay, with the group
// fill off and on, the gap stroke at the fitted zoom and at 1, and the 3D pane
// with its bodies in their DAG ink -- and measures, per width, the pane's width
// and the crossings drawn (link against rail, link against link). Serves THIS
// tree's apps/ with data/ from this tree when it has a projection, else from
// the main checkout. NOT a tier -- pytest never collects it.
//
//   node tests/debug_dag_colour_shots.mjs [out-dir]
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const DATA = existsSync(join(REPO, "data", "projections", "viewer", "topologies.json"))
  ? REPO : normalize("C:/workspace/tolstack");
const OUT = normalize(process.argv[2] ||
  join(REPO, "docs", "sessions", "lessons", "shots", "the_dag_is_coloured_by_a_chosen_attribute_and_spaced_to_taste"));
const STOPS = "vpa_pitch_linkage_blade_pitch_at_the_stops";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".bin": "application/octet-stream" };

function serve() {
  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      try {
        const rel = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^[/\\]+/, "");
        const base = rel.split(sep)[0] === "data" ? DATA : REPO;
        const full = join(base, rel);
        if (!full.startsWith(base + sep)) { res.writeHead(403).end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    server.listen(0, "127.0.0.1", () => done(server));
  });
}

async function settle(page, ms = 700) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 20000 });
  await page.waitForTimeout(ms);
}

// One view setting, through the popover's own picker (its change handler).
async function setView(page, setting, value) {
  await page.evaluate(([s, v]) => {
    const select = document.querySelector(`select[data-view-setting="${s}"]`);
    select.value = v;
    select.onchange();
    const menu = document.getElementById("dag-view");
    if (menu) menu.removeAttribute("open");
  }, [setting, value]);
  await settle(page);
}

// What the live drawing measures: its width, its zoom, and the crossings it
// draws -- every link sampled to a polyline and tested against every rail and
// every other link, an intersection within 1.5px of either path's own ends
// not counted (that is where a link meets its rail, not a crossing).
async function measure(page) {
  return page.evaluate(() => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live.querySelector("svg.tv__rails");
    const rails = Array.from(svg.querySelectorAll("line.rail")).map((l) => ({
      x: +l.getAttribute("x1"), y1: +l.getAttribute("y1"), y2: +l.getAttribute("y2") }));
    const links = Array.from(svg.querySelectorAll("path.rail__link")).map((p) => {
      const n = 40, len = p.getTotalLength(), pts = [];
      for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(len * i / n); pts.push([q.x, q.y]); }
      return pts;
    });
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5;
    const cross = (p1, p2, p3, p4) => {
      const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
      if (!(d1 * d2 < 0 && d3 * d4 < 0)) return null;
      const t = d1 / (d1 - d2);
      return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    };
    let linkRail = 0, linkLink = 0;
    links.forEach((pts) => {
      rails.forEach((r) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const at = cross(pts[i], pts[i + 1], [r.x, r.y1], [r.x, r.y2]);
          if (at && !near(at, pts[0]) && !near(at, pts[pts.length - 1])) linkRail++;
        }
      });
    });
    for (let a = 0; a < links.length; a++) for (let b = a + 1; b < links.length; b++) {
      const A = links[a], B = links[b];
      for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++) {
        const at = cross(A[i], A[i + 1], B[j], B[j + 1]);
        if (at && !near(at, A[0]) && !near(at, A[A.length - 1]) && !near(at, B[0]) &&
            !near(at, B[B.length - 1])) linkLink++;
      }
    }
    const r = window.ViewerApp.lastTopoRender;
    return { svgWidth: +svg.getAttribute("width"), dagWidth: Math.round(r.dagWidth),
             zoom: +r.zoom.toFixed(3), gutter: window.ViewerApp.RAIL_METRICS.gutter,
             rails: rails.length, links: links.length, linkRail, linkLink,
             columns: r.columns };
  });
}

// The rails SVG: clipped to what the page lights (plus room for its labels),
// or to the first `height` px when nothing is.
async function dagShot(page, name, height = 1000) {
  const box = await page.evaluate((h) => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live.querySelector("svg.tv__rails");
    const s = svg.getBoundingClientRect();
    const on = Array.from(svg.querySelectorAll(".rail__bar--on, .rail__dot--on"))
      .map((n) => n.getBoundingClientRect());
    const top = on.length ? Math.min(...on.map((b) => b.top)) - 30 : Math.max(0, s.top);
    const bottom = on.length ? Math.max(...on.map((b) => b.bottom)) + 30 : top + h;
    return { x: Math.max(0, s.left) + window.scrollX, y: Math.max(0, top) + window.scrollY,
             width: Math.min(s.width, 1600), height: Math.max(40, bottom - top) };
  }, height);
  await page.screenshot({ path: join(OUT, name), clip: box, fullPage: true });
}

// The zoom's floor, plus a hair: a wheel step can land just above it.
const window_floor = () => 0.125;

const { chromium } = await loadPlaywright();
let browser = null;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await launchBrowser(chromium, { channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(OUT, { recursive: true });
const record = { data: DATA, widths: {}, zoom: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto(`${base}/apps/viewer/topology.html?kinematic=${STOPS}`, { waitUntil: "load" });
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
  await settle(page, 1200);

  // 1. each width, no overlay, no fill.
  for (const w of ["narrow", "medium", "wide"]) {
    await setView(page, "graphWidth", w);
    record.widths[w] = await measure(page);
    await page.screenshot({ path: join(OUT, `1_width_${w}.png`) });
    await dagShot(page, `1_width_${w}_dag.png`);
  }
  // 2. each overlay, at medium.
  await setView(page, "graphWidth", "medium");
  for (const scheme of ["none", "body", "part", "interface", "sourcing", "contribution"]) {
    await setView(page, "colourBy", scheme);
    await page.screenshot({ path: join(OUT, `2_colour_${scheme}.png`) });
    await dagShot(page, `2_colour_${scheme}_dag.png`);
  }
  // 3. the group fill, off / parts / all, with the body overlay.
  await setView(page, "colourBy", "body");
  for (const fill of ["off", "parts", "all"]) {
    await setView(page, "groupFill", fill);
    await page.screenshot({ path: join(OUT, `3_fill_${fill}.png`) });
    await dagShot(page, `3_fill_${fill}_dag.png`);
  }
  await setView(page, "groupFill", "off");
  await setView(page, "colourBy", "none");

  // 4. the gap stroke: the whole topology fitted, then the wheel in to 1.
  await page.goto(`${base}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
  await settle(page, 1200);
  await page.click("#dag-fit");
  await settle(page);
  record.zoom.fitted = (await measure(page)).zoom;
  await dagShot(page, "4_gap_fitted.png");
  // ...and out to the zoom's floor (VA.DAG_ZOOM.min), the smallest a reader
  // can see it.
  const svgBox = await page.locator("#topopane svg.tv__rails").first().boundingBox();
  await page.mouse.move(svgBox.x + 40, svgBox.y + 200);
  for (let i = 0; i < 40 && (await measure(page)).zoom > window_floor(); i++) {
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(60);
  }
  await settle(page);
  record.zoom.floor = (await measure(page)).zoom;
  await dagShot(page, "4_gap_floor.png");
  const gap = await page.locator("#topopane line.rail__bar--gap").first().boundingBox();
  if (gap) {
    await page.mouse.move(gap.x + 1, gap.y + gap.height / 2);
    for (let i = 0; i < 80 && (await measure(page)).zoom < 1; i++) {
      await page.mouse.wheel(0, -240);
      await page.waitForTimeout(60);
    }
    await settle(page);
    record.zoom.close = (await measure(page)).zoom;
    const again = await page.locator("#topopane line.rail__bar--gap").first().boundingBox();
    if (again) {
      const scroll = await page.evaluate(() => [window.scrollX, window.scrollY]);
      await page.screenshot({ path: join(OUT, "4_gap_zoom1.png"), fullPage: true, clip: {
        x: Math.max(0, again.x - 200) + scroll[0], y: Math.max(0, again.y - 150) + scroll[1],
        width: 500, height: 400 } });
    }
  }

  // 5. the 3D pane on the kinematic study, its bodies in their DAG ink.
  await page.goto(`${base}/apps/viewer/topology.html?kinematic=${STOPS}`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
  await settle(page, 1200);
  const handle = page.locator("#pane-handle");
  if (await handle.count() && await handle.isVisible()) {
    await handle.click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    await page.waitForTimeout(15000);
    const frame = page.frames().find((f) => f.url().includes("/annotate/"));
    record.scene = frame ? await frame.evaluate(() => {
      const shell = window.__shellMessages || {};
      return { messages: Object.keys(shell) };
    }).catch(() => null) : null;
    await page.screenshot({ path: join(OUT, "5_scene_body_tints.png") });
  } else {
    record.scene = "no pane handle: the annotator mount was not found";
  }
} finally {
  await writeFile(join(OUT, "measurements.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(JSON.stringify(record, null, 2));
  await browser.close();
  server.close();
}
