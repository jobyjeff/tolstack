// Hand-run inspection probe for handoff the_linkage_play_control_is_the_only_one_
// and_it_moves_everything (2026-11-08). NOT a tier -- pytest never collects it.
//
//   node tests/debug_pane_play_filmstrip.mjs --repo C:/workspace/tolstack --shots docs/sessions/lessons/shots/<slug>
//
// Opens the kinematic study's 3D pane on the REAL projection, presses play IN THE
// PANE and films it: N frames, each one a screenshot of the page with the pane
// beside it, and each one stamped with what every surface read at that instant --
// the pane's frame index, the page's angle read-out, the chart cursor, the grid's
// numbers and the DAG's bar ends. Reduced motion is emulated so play moves by whole
// points, and the pane runs slowly so a screenshot spans only a frame or two. A row is
// the reading taken just BEFORE its screenshot. Then the pane is paused and read again
// 800 ms later (a pause holds every surface on the frame it stopped on). Prints the
// table the lesson carries, and writes the filmstrip and a mid-sweep still under --shots.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const DATA_REPO = resolve(flag("--repo") || HERE);
const SHOTS = flag("--shots") ? resolve(HERE, flag("--shots")) : null;
const FRAMES = Number(flag("--frames") || 28);
const SPEED = flag("--speed") || "0.03";
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

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
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));
const run = (page, cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);

// One synchronous read of every surface, pane and page together.
const read = (page) => page.evaluate(() => {
  const w = document.querySelector("#annotate-flyout iframe").contentWindow;
  const q = (s) => document.querySelector(s);
  const cursor = q("#detail line.kmchart__pose");
  const scale = cursor ? JSON.parse(cursor.getAttribute("data-scale")) : null;
  return {
    pane: w.__sweep.index,
    playing: w.__sweep.playing,
    angle: q("#detail input.kmpose__angle").value,
    cursor: cursor ? Number(cursor.getAttribute("x1")) : null,
    scale,
    grid: Array.from(document.querySelectorAll("#topopane td.tvcell--sensitivity, #topopane td.tvcell--contribution"))
      .slice(0, 24).map((n) => n.textContent).join("|"),
    dag: Array.from(document.querySelectorAll("#topopane line.rail__bar--on"))
      .map((b) => Number(b.getAttribute("y2")).toFixed(1)).join(","),
  };
});

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 30000 });
  const kinId = await page.locator('[data-nav-kind="kinematic"]').first().getAttribute("data-nav-id");
  const row = page.locator(`[data-nav-kind="kinematic"][data-nav-id="${kinId}"]`).first();
  await row.hover();
  await row.locator("[data-nav-3d]").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
  await page.waitForFunction(() => {
    const f = document.querySelector("#annotate-flyout iframe");
    const w = f && f.contentWindow;
    return w && w.__sweep && w.__sweep.bodies && w.__sweep.bodies.length;
  }, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  await run(page, ["pause"]);
  await run(page, ["seek", "#0"]);
  // Slower than the speed verb allows (its floor is 0.25x): set in the frame.
  await frameOf(page).evaluate((v) => { window.__sweep.speed = v; }, Number(SPEED));
  await page.waitForTimeout(1000);

  await run(page, ["play"]);
  await page.waitForTimeout(500);
  const frames = [];
  for (let i = 0; i < FRAMES; i++) {
    const before = await read(page);
    const png = process.argv.includes("--nopics") ? Buffer.alloc(0) : await page.screenshot({ type: "png" });
    if (process.argv.includes("--nopics")) await page.waitForTimeout(250);
    const after = await read(page);
    frames.push({ before, after, png });
    if (i === Math.floor(FRAMES / 2) && SHOTS) writeFileSync(join(SHOTS, "mid_sweep_page_and_pane.png"), png);
  }
  await run(page, ["pause"]);
  await page.waitForTimeout(600);
  const paused = await read(page);
  await page.waitForTimeout(800);
  const pausedLater = await read(page);

  // What every surface read at each instant, as the raw numbers: the pane's frame,
  // the page's angle read-out, the chart cursor's x, the grid's first six numbers
  // and the DAG's first lit bar end. A reading taken between the pane's frame and
  // the page's next display frame can show the page one frame behind, so the
  // summary groups the readings by pane frame and counts the distinct page
  // readings under each: one, except at a frame boundary.
  const dagSum = (r) => r.dag.split(",").map(Number).reduce((a, b) => a + b, 0).toFixed(1);
  const tuple = (r) => [r.angle, r.cursor, r.grid.split("|").slice(0, 6).join(" "), dagSum(r)].join(" ; ");
  console.log("\n| # | pane frame | angle | cursor x | grid (first six) | DAG bar ends (sum, px) |");
  console.log("|--:|--:|--:|--:|--|--:|");
  frames.forEach((f, i) => {
    const r = f.before;
    console.log(`| ${i} | ${r.pane} | ${r.angle} | ${r.cursor} | ${r.grid.split("|").slice(0, 6).join(" ")} | ${dagSum(r)} |`);
  });
  const byFrame = new Map();
  frames.forEach((f) => {
    const k = f.before.pane;
    byFrame.set(k, (byFrame.get(k) || new Set()).add(tuple(f.before)));
  });
  const split = [...byFrame].filter(([, set]) => set.size > 1).map(([k]) => k);
  console.log(`\npane frames read: ${byFrame.size}; with more than one page reading under them: ${split.length}${split.length ? " (" + split.join(", ") + ")" : ""}`);
  console.log(`paused at pane ${paused.pane} / angle ${paused.angle} / cursor ${paused.cursor}; ` +
    `800 ms later pane ${pausedLater.pane} / angle ${pausedLater.angle} / cursor ${pausedLater.cursor}: ` +
    `${JSON.stringify(paused) === JSON.stringify(pausedLater) ? "held on all four" : "MOVED"}`);

  if (SHOTS && !process.argv.includes("--nopics")) {
    const sheet = await browser.newPage({ viewport: { width: 1700, height: 400 } });
    const columns = 4, cw = 420;
    const b64 = frames.map((f) => f.png.toString("base64"));
    const labels = frames.map((f, i) => `#${i}  pane ${f.before.pane}  angle ${f.before.angle}`);
    const out = await sheet.evaluate(async ({ b64, labels, columns, cw }) => {
      const imgs = await Promise.all(b64.map((s) => new Promise((ok, no) => {
        const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + s;
      })));
      const ch = Math.round(cw * imgs[0].naturalHeight / imgs[0].naturalWidth);
      const rows = Math.ceil(imgs.length / columns);
      const c = document.createElement("canvas");
      c.width = columns * cw; c.height = rows * (ch + 18);
      const g = c.getContext("2d");
      g.fillStyle = "#111"; g.fillRect(0, 0, c.width, c.height);
      imgs.forEach((im, i) => {
        const x = (i % columns) * cw, y = Math.floor(i / columns) * (ch + 18);
        g.drawImage(im, x, y + 18, cw, ch);
        g.fillStyle = "#ddd"; g.font = "13px sans-serif"; g.fillText(labels[i], x + 4, y + 13);
      });
      return c.toDataURL("image/png").split(",")[1];
    }, { b64, labels, columns, cw });
    writeFileSync(join(SHOTS, "pane_play_filmstrip.png"), Buffer.from(out, "base64"));
    console.log(`wrote ${join(SHOTS, "pane_play_filmstrip.png")}`);
  }
} finally {
  await browser.close();
  server.close();
}
