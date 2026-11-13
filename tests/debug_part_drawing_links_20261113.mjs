// Hand-run inspection probe for handoff a_part_links_to_its_drawing_before_it_
// has_a_tolerance (2026-11-12). NOT a tier -- pytest never collects it. It
// serves this tree's apps/ over a data root (the main checkout's, or --repo
// <root built from this tree>) on a private port, the way
// debug_light_on_four_surfaces_20261112.mjs does, opens the end-stop model v2,
// and opens every part's Preview once -- from the grid (a row of the part's
// own), with one part also from the tree and from the DAG -- printing what
// the Preview's part line shows: the link's text, where it goes, the revision
// beside it, the other-dash mark and the older-runs count. A part the model
// draws in no row or dot has no Preview and is printed as such. Two shots at
// 3840x2160: a part with its own run, and the hub with the other-dash link.
//
//   node tests/debug_part_drawing_links_20261113.mjs [--repo <data root>]
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
  "docs/sessions/lessons/shots/a_part_links_to_its_drawing_before_it_has_a_tolerance");
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

const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 300)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
await page.goto(`${url}/apps/viewer/topology.html?topology=${MODEL}`, { waitUntil: "load" });
await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
await page.waitForTimeout(2500);

// What the Preview's part lines say, read off the page.
const previewParts = () => page.evaluate(() => {
  const box = document.querySelector("section.detail__preview");
  if (!box) return null;
  const lines = Array.from(box.querySelectorAll(".detail__where > .detail__partname, .detail__side > .detail__sublabel"));
  return {
    key: box.getAttribute("data-preview-key"),
    lines: lines.map((line) => ({
      text: line.textContent,
      links: Array.from(line.querySelectorAll("a.detail__runlink")).map((a) => ({
        text: a.textContent, href: a.getAttribute("href"), target: a.getAttribute("target") })),
      older: (() => {
        const fold = line.parentElement.querySelector(":scope > details.runsfold") ||
          (line.closest(".detail__where") && line.closest(".detail__where").nextElementSibling &&
           line.closest(".detail__where").nextElementSibling.matches("details.runsfold")
            ? line.closest(".detail__where").nextElementSibling : null);
        return fold ? fold.querySelector("summary").textContent : null;
      })(),
    })),
  };
});

async function clickRow(edgeId) {
  const cell = page.locator(`#topopane tr.tvrow[data-id="${edgeId}"] td.tvcell--name`).first();
  await page.evaluate((id) => {
    const c = document.querySelector(`tr.tvrow[data-id="${id}"] td.tvcell--name`);
    if (c) c.scrollIntoView({ block: "center" });
  }, edgeId);
  await cell.click({ timeout: 5000 });
  await page.mouse.move(4, 4);
  await page.waitForTimeout(700);
}

async function letGo() {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
}

const table = [];
for (const part of topo.parts) {
  const edge = topo.edges.find((e) => e.part === part.id);
  if (!edge) {
    const node = topo.nodes.find((n) => n.parts.indexOf(part.id) !== -1);
    table.push({ part: part.id, number: part.drawing, via: node ? "node " + node.id : "none",
      shown: node ? "(not opened)" : "no row or dot names this part, so it has no Preview" });
    continue;
  }
  await clickRow(edge.id);
  const seen = await previewParts();
  const line = seen && seen.lines[0];
  table.push({ part: part.id, number: part.drawing, via: "grid row " + edge.id,
    text: line ? line.text : null, links: line ? line.links : [], older: line ? line.older : null });
  await letGo();
}
log("table", table);

// The same part from the tree and from the DAG: hover one of its features in
// the tree (a node's Preview, the part one of its sides), its bar in the DAG.
const ownPart = topo.parts.find((p) => p.drawing_runs && p.drawing_runs.length > 1) ||
  topo.parts.find((p) => p.drawing_runs && p.drawing_runs.length);
const ownEdge = topo.edges.find((e) => e.part === ownPart.id);
const ownNode = topo.nodes.find((n) => n.parts.indexOf(ownPart.id) !== -1);
const treeRow = page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${ownPart.id}@${ownNode.id}"]`).first();
if (!(await treeRow.count())) {
  await page.locator(`#navtree [data-nav-twisty="p:${ownPart.id}"]`).first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
}
await treeRow.scrollIntoViewIfNeeded().catch(() => {});
await treeRow.hover({ timeout: 5000 }).catch((e) => log("tree hover", e.message));
await page.waitForTimeout(900);
log("from the tree", await previewParts());
const bar = page.locator(`svg.tv__rails [data-row-kind="edge"][data-id="${ownEdge.id}"]`).first();
await bar.hover({ timeout: 5000, force: true }).catch((e) => log("dag hover", e.message));
await page.waitForTimeout(900);
log("from the DAG", await previewParts());
await page.mouse.move(4, 4);
await page.waitForTimeout(700);

// The tree's part row itself, selected: what the Preview shows for a part.
await page.locator(`#navtree [data-nav-kind="part"][data-nav-id="${ownPart.id}"]`).first().click({ timeout: 5000 })
  .catch((e) => log("part row", e.message));
await page.mouse.move(4, 4);
await page.waitForTimeout(900);
log("a part row selected", await page.evaluate(() => {
  const box = document.querySelector("section.detail__preview");
  return box ? box.textContent.slice(0, 200) : null;
}));
await letGo();

// The two shots: a part with its own run (older runs open), and the hub.
await clickRow(ownEdge.id);
await page.locator("section.detail__preview details.runsfold").first().evaluate((d) => { d.open = true; })
  .catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: join(SHOTS, "01_own_run_3840.png") });
await page.locator("section.detail__preview").screenshot({ path: join(SHOTS, "01_own_run_preview.png") });
await letGo();
const hubEdge = topo.edges.find((e) => e.part === "hub");
await clickRow(hubEdge.id);
await page.screenshot({ path: join(SHOTS, "02_hub_other_dash_3840.png") });
await page.locator("section.detail__preview").screenshot({ path: join(SHOTS, "02_hub_other_dash_preview.png") });
log("errors", errors);
await browser.close();
server.close();
