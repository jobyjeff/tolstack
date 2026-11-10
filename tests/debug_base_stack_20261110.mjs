// Hand-run inspection probe for handoff the_gas_spring_mount_sits_on_the_tan_
// link_mount_in_the_end_stop_model (2026-11-10). NOT a tier -- pytest never
// collects it, and it asserts nothing: it serves THIS tree's apps/ over the
// main checkout's data/ on a private port (as debug_model_tree_20261110.mjs
// does) and takes the shots the handoff's definition of done names, at
// 3840x2160, printing beside each what the page says about itself.
//
//   node tests/debug_base_stack_20261110.mjs [--phase dag|tree|grid|sweep|all]
//        [--shots <dir>] [--repo C:/workspace/tolstack]
//
//   dag    -- v2's DAG, the page and the base body's field alone
//   tree   -- the left tree's ground body opened to its parts, every part's
//             features, and its interfaces with every joint opened
//   grid   -- the grid's ground rows
//   sweep  -- the P2 run playing, one shot at each stop and mid-sweep, with
//             each base part's drawn translation printed beside it
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
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_gas_spring_mount_sits_on_the_tan_link_mount_in_the_end_stop_model");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const RUN = "vpa-pitch-p2-20261105-204957";
const W = 3840, H = 2160;
const BASE = ["hub", "tan_link_mount_215175_002", "gas_spring_mount_213668_002", "piston_cover_214958_002"];
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

async function open() {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.status() >= 400) page.__errors.push("HTTP " + r.status() + " " + r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

async function shot(page, name, extra) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  log(name, { ...(extra || {}), errors: page.__errors.splice(0) });
}

const navRows = (page) => page.evaluate(() => {
  const nav = document.getElementById("navtree");
  const left = nav.getBoundingClientRect().left;
  return Array.from(nav.querySelectorAll("[data-nav-kind], [data-nav-group]"))
    .filter((n) => n.tagName !== "OPTION" && n.getBoundingClientRect().height > 0)
    .map((n) => `${Math.round(n.getBoundingClientRect().left - left)} ${n.getAttribute("data-nav-kind") || n.getAttribute("data-nav-group")} ` +
      n.textContent.replace(/\s+/g, " ").trim().slice(0, 90));
});

const toggle = async (page, key) => {
  const t = page.locator(`#navtree [data-nav-twisty="${key}"]`).first();
  if (await t.count()) { await t.click(); await page.waitForTimeout(300); }
};

async function dag() {
  const page = await open();
  await shot(page, "d1_v2_page");
  const field = page.locator("svg.tv__rails rect.tv__bodyfield").first();
  const box = await field.boundingBox();
  if (box) {
    await page.screenshot({ path: join(SHOTS, "d2_v2_dag_base_body.png"),
      clip: { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 60), width: box.width + 80, height: box.height + 120 } });
  }
  log("d2_v2_dag_base_body", { box, names: await page.evaluate(() =>
    Array.from(document.querySelectorAll("svg.tv__rails .tv__bodyname")).map((n) => n.firstChild.textContent)) });
  await page.close();
}

async function tree() {
  const page = await open();
  for (const p of BASE) await toggle(page, "p:" + p);
  await toggle(page, "bi:base");
  const joints = await page.evaluate(() => Array.from(document.querySelectorAll('#navtree [data-nav-twisty^="j:"]'))
    .map((n) => n.getAttribute("data-nav-twisty")));
  for (const j of joints) await toggle(page, j);
  await shot(page, "t1_v2_tree_ground_parts_and_interfaces", { joints, nav: await navRows(page) });
  await page.close();
}

async function grid() {
  const page = await open();
  const rows = page.locator("#topopane div.tv__rows").first();
  await rows.screenshot({ path: join(SHOTS, "g1_v2_grid.png") }).catch((e) => log("grid", e.message));
  log("g1_v2_grid", { parts: await page.evaluate(() => Array.from(document.querySelectorAll(".tvbrace__label--part"))
    .filter((n) => !n.closest(".tv__ghost")).map((n) => n.textContent)), errors: page.__errors.splice(0) });
  await page.close();
}

const NUMBERS = { hub: "214373", tan_link_mount: "215175", gas_spring_mount: "213668", cover: "214958_002",
  pitch_plate: "215177_001", lower_head: "214699_002" };
const where = (page) => frameOf(page).evaluate((numbers) => {
  const out = {};
  for (const r of window.AnnotateApp.exec(["scene-view"])) {
    for (const [name, n] of Object.entries(numbers)) {
      if (!r.part || !r.part.includes(n)) continue;
      const d = window.__scene.drawnPlacements(r.sha256)[0];
      out[name] = d ? [d[12], d[13], d[14]].map((v) => +v.toFixed(2)) : null;
    }
  }
  return out;
}, NUMBERS);

async function sweep() {
  const page = await open();
  await page.locator("#pane-handle").click({ timeout: 15000 });
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    return w && w.__scene && w.__scene.listOpenParts().length > 0;
  }, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  await run(page, ["sweep", RUN]);
  await page.waitForFunction(() => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    return w && w.__sweep && w.__sweep.bodies && w.__sweep.bodies.length;
  }, null, { timeout: 240000 });
  await page.waitForTimeout(5000);
  await run(page, ["pause"]);
  log("sweep rows", await frameOf(page).evaluate(() =>
    window.__sweep.bodies.map((r) => [r.subject, r.part, r.state, (r.placements || []).length])));
  const n = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length);
  for (const [name, i] of [["low", 0], ["mid", Math.floor(n / 2)], ["feather", n - 1]]) {
    await run(page, ["seek", "#" + i]);
    await page.waitForTimeout(2500);
    await shot(page, `s_${name}_stop`.replace("_mid_stop", "_mid"), { at: await where(page) });
  }
  await page.close();
}

try {
  if (PHASE === "dag" || PHASE === "all") await dag();
  if (PHASE === "tree" || PHASE === "all") await tree();
  if (PHASE === "grid" || PHASE === "all") await grid();
  if (PHASE === "sweep" || PHASE === "all") await sweep();
} finally {
  await browser.close();
  server.close();
}
