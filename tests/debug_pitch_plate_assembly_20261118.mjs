// Hand-run inspection probe for handoff the_pitch_plate_is_an_assembly_with_its_bushings
// (2026-11-18). NOT a tier -- pytest never collects it. It takes the machine's
// browser slot itself.
//
//   node tests/debug_pitch_plate_assembly_20261118.mjs --repo <scratch root> [--shots <dir>]
//
// Serves THIS tree's apps/ with data/ from `--repo`, a scratch root whose
// projections were rebuilt from this branch (the main checkout's predate the
// plate's children). At 3840 x 2160, Side by side with the 3D pane open: the
// landing, the pitch plate's district, each new fit and pin hovered, the plate
// assembly selected in the tree -- a shot and a line each -- and a measurement
// of which boxes any connector's route passes through.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (!flag("--repo")) throw new Error("--repo <scratch root> is required");
const DATA_REPO = resolve(flag("--repo"));
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_pitch_plate_is_an_assembly_with_its_bushings");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
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
const log = [];
const say = (line) => { console.log(line); log.push(line); };

const NEW_JOINTS = [
  "pitch_link_flanged_bushing_press_fit", "pitch_link_straight_bushing_transition_fit",
  "pitch_link_flanged_bushing_bore_to_attach_bore", "pitch_link_straight_bushing_bore_to_flanged_bushing_bore",
  "tan_link_flanged_bushing_press_fit", "tan_link_straight_bushing_transition_fit",
  "tan_link_flanged_bushing_bore_to_attach_bore", "tan_link_straight_bushing_bore_to_flanged_bushing_bore",
];

try {
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tolstack.viewer.dagDrawing", "map");
      localStorage.setItem("tolstack.viewer.paneView", "both");
    } catch (e) { /* no storage */ }
  });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
  await page.waitForSelector("#navtree select.navtree__select", { timeout: 30000 });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
  await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
  if (await page.locator("#pane-handle").isVisible()) {
    await page.locator("#pane-handle").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);
  }
  const shoot = async (name) => {
    await page.screenshot({ path: join(SHOTS, name + ".png") });
    await page.locator("#topopane").screenshot({ path: join(SHOTS, name + "_map.png") });
    say(`  shot ${name}.png`);
  };

  // What the map drew, and which boxes each connector's route crosses.
  const drawn = await page.evaluate((ids) => {
    const svg = document.querySelector("#topopane svg.tv__map");
    const boxes = Array.from(svg.querySelectorAll("rect.map__box")).map((r) => ({
      id: r.getAttribute("data-map-id"), r: r.getBoundingClientRect() }));
    const crossings = [];
    svg.querySelectorAll("g.map__connector").forEach((g) => {
      const id = g.getAttribute("data-map-id");
      const line = g.querySelector("path.map__connectorline");
      if (!line) return;
      const total = line.getTotalLength();
      const m = line.getScreenCTM();
      const hit = new Set();
      for (let k = 3; k <= 97; k += 1) {
        const p = line.getPointAtLength(total * k / 100);
        const x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f;
        boxes.forEach((b) => {
          if (x > b.r.left + 2 && x < b.r.right - 2 && y > b.r.top + 2 && y < b.r.bottom - 2) hit.add(b.id);
        });
      }
      if (hit.size) crossings.push(id + " -> " + Array.from(hit).join(", "));
    });
    const present = ids.map((id) => {
      const g = svg.querySelector(`g.map__connector[data-map-id="${id}"]`);
      const sym = g && g.querySelector("[data-symbol]");
      return `${id}: ${g ? "drawn" : "MISSING"}${sym ? " as " + sym.getAttribute("data-symbol") : ""}`;
    });
    const outlines = Array.from(svg.querySelectorAll("[class*='map__assembly']")).map((o) => o.getAttribute("data-map-id"));
    const parts = boxes.map((b) => b.id);
    return { crossings, present, outlines, parts,
      counts: window.ViewerApp.mapCounts(window.ViewerApp.lastMapLight.geometry) };
  }, NEW_JOINTS);
  say("counts " + JSON.stringify(drawn.counts));
  say("boxes " + drawn.parts.join(", "));
  say("assembly outlines " + drawn.outlines.join(", "));
  drawn.present.forEach((l) => say("  " + l));
  say("routes crossing a box (each is the box's own pin or a defect, read the shot): " +
    (drawn.crossings.length ? "\n    " + drawn.crossings.join("\n    ") : "none"));

  await shoot("01_landing_3840_side_by_side");
  // The pitch plate's district alone.
  const district = await page.evaluate(() => {
    const r = document.querySelector('#topopane rect.map__district[data-map-id="pitch_plate"]').getBoundingClientRect();
    return { x: r.left - 40, y: r.top - 40, width: r.width + 80, height: r.height + 80 };
  });
  await page.screenshot({ path: join(SHOTS, "02_pitch_plate_district.png"), clip: district });
  say("  shot 02_pitch_plate_district.png");

  const pointOnLine = (sel) => page.evaluate((s) => {
    const line = document.querySelector(s);
    const p = line.getPointAtLength(line.getTotalLength() * 0.25);
    const m = line.getScreenCTM();
    return [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f];
  }, sel);
  let step = 2;
  for (const id of NEW_JOINTS) {
    step += 1;
    const sel = `#topopane g.map__connector[data-map-id="${id}"] path.map__connectorline`;
    try {
      const [x, y] = await pointOnLine(sel);
      await page.mouse.move(x, y);
      await page.waitForTimeout(500);
      const lit = await page.evaluate(() => {
        const on = (s) => document.querySelectorAll(s).length;
        const tip = document.querySelector(".map__tooltip, [role=tooltip]");
        return `map hot ${on("#topopane [class*='--hot']")}, tree hot ${on("#navtree .navtree__row--hot")}, grid lead ${on("#topogrid tr.tvrow--lead")}` +
          (tip ? `, tip "${tip.textContent.slice(0, 120)}"` : "");
      });
      say(`${step}. hover ${id}: ${lit}`);
      await page.screenshot({ path: join(SHOTS, `${String(step).padStart(2, "0")}_hover_${id}.png`), clip: district });
    } catch (e) {
      say(`${step}. hover ${id}: THREW ${e.message.slice(0, 200)}`);
    }
  }
  await page.mouse.move(5, 5);

  step += 1;
  // Clicked in the page: with the 3D pane loading, Playwright's own click
  // times out waiting on the page after the press.
  await page.evaluate(() => document.querySelector(
    '#navtree [data-nav-kind="part"][data-nav-id="pitch_plate_215177_001"]').click());
  await page.waitForTimeout(5000);
  const selected = await page.evaluate(() => {
    const on = (s) => document.querySelectorAll(s).length;
    const preview = document.querySelector(".detail__previewbody") || document.querySelector("#detail");
    const tree = Array.from(document.querySelectorAll("#navtree [data-nav-kind='part']"))
      .map((r) => r.getAttribute("data-nav-id") + " (" + (r.textContent || "").trim().slice(0, 60) + ")");
    return { lit: `map selected ${on("#topopane [class*='--selected']")}, tree on ${on("#navtree .navtree__row--on")}`,
      preview: preview ? preview.textContent.replace(/\s+/g, " ").slice(0, 400) : null, tree };
  });
  say(`${step}. select the pitch plate assembly in the tree: ${selected.lit}`);
  say("   preview: " + selected.preview);
  say("   tree parts: " + selected.tree.filter((t) => /pitch_plate|bushing/.test(t)).join(" | "));
  await shoot(`${String(step).padStart(2, "0")}_pitch_plate_selected`);
  const pane = await page.evaluate(() => {
    const f = document.querySelector("#annotate-flyout iframe");
    return f ? f.getBoundingClientRect() : null;
  });
  if (pane) {
    await page.screenshot({ path: join(SHOTS, `${String(step).padStart(2, "0")}_pitch_plate_selected_pane.png`),
      clip: { x: pane.left, y: pane.top, width: pane.width, height: pane.height } });
  }
  await page.close();
} finally {
  writeFileSync(join(SHOTS, "probe_log.txt"), log.join("\n") + "\n", "utf8");
  await browser.close();
  server.close();
}
