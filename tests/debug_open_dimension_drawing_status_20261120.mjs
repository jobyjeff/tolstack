// Hand-run inspection probe for handoff an_open_dimension_says_where_its_
// drawing_stands (2026-11-19). NOT a tier -- pytest never collects it. It
// serves this tree's apps/ over a data root (the main checkout's, or --repo
// <root built from this tree>) on a private port, the way
// debug_part_drawing_links_20261113.mjs does, opens a model, and for the
// first open dimension of each drawing status clicks its grid row and prints
// what the row's chip and the Preview's chip say, where each links and what
// each says on hover. One shot per status: the grid row's neighbourhood and
// the Preview, each cropped from a 2560x1440 page.
//
//   node tests/debug_open_dimension_drawing_status_20261120.mjs [--repo <data root>]
//        [--shots <dir>] [--v1]
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
const MODEL = argv.indexOf("--v1") !== -1 ? "vpa_pitch_linkage" : "vpa_end_stop_v2";
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/an_open_dimension_says_where_its_drawing_stands");
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
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));
const projection = JSON.parse(readFileSync(
  join(DATA_REPO, "data/projections/viewer/topologies.json"), "utf-8"));
const topo = projection.topologies.find((t) => t.id === MODEL);
log("counts", topo.drawing_status_counts);
log("read and uncited", topo.drawings_read_uncited.map((r) => [r.drawing, r.waiting]));

const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
await page.goto(`${url}/apps/viewer/topology.html?topology=${MODEL}`, { waitUntil: "load" });
await page.waitForSelector("tr.tvrow", { timeout: 30000 }).catch(async (e) => {
  await page.screenshot({ path: join(SHOTS, "zz_timeout.png") });
  log("errors", errors);
  log("body", (await page.evaluate(() => document.body.innerText)).slice(0, 600));
  throw e;
});
await page.waitForTimeout(2500);

const chipOf = (selector) => page.evaluate((sel) => {
  const chip = document.querySelector(sel);
  if (!chip) return null;
  return { tag: chip.tagName.toLowerCase(), text: chip.textContent,
    href: chip.getAttribute("href"), target: chip.getAttribute("target"),
    title: chip.getAttribute("title") };
}, selector);

// Every row the grid draws with a chip, against the projection's statuses.
const drawn = await page.evaluate(() => Array.from(
  document.querySelectorAll("tr.tvrow td.tvcell--drawing .chip--drawing")).map((c) =>
  [c.closest("tr").getAttribute("data-id"), c.textContent]));
const open = topo.edges.filter((e) => e.drawing_status && e.drawing_status.status !== "unknown");
log("grid chips drawn / open dimensions", [drawn.length, open.length]);

const statuses = ["read", "other_dash_read", "not_read", "no_drawing"];
for (const [i, status] of statuses.entries()) {
  const edge = topo.edges.find((e) => e.drawing_status && e.drawing_status.status === status);
  if (!edge) { log(status, "no open dimension of this status"); continue; }
  await page.evaluate((id) => {
    const c = document.querySelector(`tr.tvrow[data-id="${id}"] td.tvcell--name`);
    if (c) c.scrollIntoView({ block: "center" });
  }, edge.id);
  await page.locator(`tr.tvrow[data-id="${edge.id}"] td.tvcell--name`).first()
    .click({ timeout: 5000 });
  await page.mouse.move(4, 4);
  await page.waitForTimeout(700);
  const row = await chipOf(`tr.tvrow[data-id="${edge.id}"] td.tvcell--drawing .chip--drawing`);
  const pane = await chipOf("section.detail__preview .detail__chips .chip--drawing");
  log(status, { edge: edge.id, row, pane });
  const rowBox = await page.locator(`tr.tvrow[data-id="${edge.id}"]`).first().boundingBox();
  const grid = await page.locator("tr.tvrow").first().evaluate((r) => {
    const b = r.closest("table").getBoundingClientRect();
    return { x: b.x, y: 0, width: b.width };
  });
  if (rowBox && grid) {
    await page.screenshot({ path: join(SHOTS, `0${i + 1}_${status}_grid.png`), clip: {
      x: grid.x, width: Math.min(grid.width, 1400),
      y: Math.max(rowBox.y - 120, grid.y), height: 280 } });
  }
  await page.locator("section.detail__preview").screenshot({
    path: join(SHOTS, `0${i + 1}_${status}_preview.png`) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
}
await page.screenshot({ path: join(SHOTS, "00_page.png") });
log("errors", errors);
await browser.close();
server.close();
