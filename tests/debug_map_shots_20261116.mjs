// Hand-run inspection probe for handoff the_map_draws_the_end_stop_model
// (2026-11-16). NOT a tier -- pytest never collects it.
//
//   node tests/debug_map_shots_20261116.mjs --shots <dir> [--repo <data root>] [--only regions|click]
//
// Serves THIS tree's apps/ with data/ from `--repo` (default: the main
// checkout; the handoff used a scratch root built from this tree, since the
// main checkout's projection predates the map's `map` block). Two walks:
//
//   regions  the real end-stop model, Map selected, shot at the six regions
//            the handoff's table names -- 3840, 5120 and 1920 wide, Side by
//            side and DAG view -- with a measurement line each: the region's
//            size, the fitted zoom, the smallest label on screen, labels
//            clipped by the region, the drawing's box.
//   click    the exploratory click-around: every kind of thing the map draws
//            hovered and clicked, a wheel, a drag, Fit, the switch, the model
//            switched, a study opened, the 3D pane opened beside it -- a shot
//            and a line of what the page did at each step.
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
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/the_map_draws_the_end_stop_model");
const ONLY = flag("--only");
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

async function open(width, height, { drawing = "map", view = "both", query = "" } = {}) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
  await page.addInitScript(({ drawing, view }) => {
    try {
      localStorage.setItem("tolstack.viewer.dagDrawing", drawing);
      localStorage.setItem("tolstack.viewer.paneView", view);
    } catch (e) { /* no storage */ }
  }, { drawing, view });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}${query}`, { waitUntil: "load" });
  await page.waitForSelector("#navtree select.navtree__select", { timeout: 30000 });
  await page.waitForSelector("#topopane svg", { timeout: 30000 });
  await page.waitForTimeout(500);
  return page;
}

const measure = (page) => page.evaluate(() => {
  const pane = document.getElementById("topopane").getBoundingClientRect();
  const svg = document.querySelector("#topopane svg.tv__map");
  if (!svg) return { pane: [Math.round(pane.width), Math.round(pane.height)], map: false };
  const world = svg.querySelector("g.map__world").getBoundingClientRect();
  const texts = Array.from(svg.querySelectorAll("text")).map((t) => ({
    r: t.getBoundingClientRect(), cls: t.getAttribute("class"), text: t.textContent }))
    .filter((t) => t.r.width > 0 && !/pinlabel/.test(t.cls));
  const smallest = texts.reduce((m, t) => Math.min(m, t.r.height), Infinity);
  const clipped = texts.filter((t) => t.r.left < pane.left || t.r.right > pane.right ||
    t.r.top < pane.top || t.r.bottom > pane.bottom).map((t) => t.text);
  const symbols = Array.from(svg.querySelectorAll("g.map__symbol use")).map((u) => u.getBoundingClientRect().width);
  return {
    pane: [Math.round(pane.width), Math.round(pane.height)], map: true,
    zoom: Number(svg.getAttribute("data-zoom")),
    world: [world.left, world.top, world.right, world.bottom].map(Math.round),
    inside: world.left >= pane.left - 1 && world.top >= pane.top - 1 && world.right <= pane.right + 1 && world.bottom <= pane.bottom + 1,
    smallestLabelPx: Math.round(smallest * 10) / 10,
    clipped,
    symbolPx: symbols.length ? Math.round(Math.min(...symbols)) : null,
    counts: window.ViewerApp.mapCounts(window.ViewerApp.lastMapLight.geometry),
    errors: [],
  };
});

async function shoot(page, name) {
  await page.screenshot({ path: join(SHOTS, name + ".png") });
  say(`  shot ${name}.png`);
}

async function openPaneView(page, view) {
  // The control is in the settings bar only while the 3D pane is open; the
  // stored choice is read at boot, so a view is chosen by storage + reload.
  await page.evaluate((v) => localStorage.setItem("tolstack.viewer.paneView", v), view);
}

if (!ONLY || ONLY === "regions") {
  say("== the six regions");
  for (const [w, h] of [[3840, 2160], [5120, 2160], [1920, 1080]]) {
    for (const view of ["both", "dag"]) {
      const page = await open(w, h, { view });
      // The pane view's class applies only while the 3D pane is open.
      await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
      if (await page.locator("#pane-handle").isVisible()) {
        await page.locator("#pane-handle").click();
        await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1500);
      }
      const m = await measure(page);
      say(`${w}x${h} ${view}: region ${m.pane.join("x")}, zoom ${m.zoom}, smallest label ${m.smallestLabelPx}px, ` +
        `symbol ${m.symbolPx}px, inside ${m.inside}, clipped ${m.clipped.length ? m.clipped.join(" | ") : "none"}, counts ${JSON.stringify(m.counts)}`);
      await shoot(page, `region_${w}x${h}_${view}`);
      // The region alone, for reading.
      await page.locator("#topopane").screenshot({ path: join(SHOTS, `region_${w}x${h}_${view}_pane.png`) });
      await page.close();
    }
  }
}

if (!ONLY || ONLY === "click") {
  say("== the click-around, 3840x2160 side by side");
  const page = await open(3840, 2160);
  await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
  let step = 0;
  const at = async (what, fn) => {
    step += 1;
    const before = await measure(page);
    let note = "";
    try { note = (await fn()) || ""; } catch (e) { note = "THREW " + e.message.slice(0, 200); }
    await page.waitForTimeout(400);
    const after = await measure(page);
    const lit = await page.evaluate(() => {
      const on = (sel) => document.querySelectorAll(sel).length;
      return `map lead ${on("#topopane [class*='--lead']")}, hot ${on("#topopane [class*='--hot']")}, selected ${on("#topopane [class*='--selected']")}, touched ${on("#topopane [class*='--touched']")}; tree hot ${on("#navtree .navtree__row--hot")} on ${on("#navtree .navtree__row--on")}; grid lead ${on("#topogrid tr.tvrow--lead")} selected ${on("#topogrid tr.tvrow--selected")}; doc scroll ${document.scrollingElement.scrollTop}`;
    });
    const name = `click_${String(step).padStart(2, "0")}_${what.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
    say(`${step}. ${what}: zoom ${before.zoom} -> ${after.zoom}; ${lit}${note ? "; " + note : ""}`);
    await shoot(page, name);
  };
  const hoverMap = (sel) => page.locator(sel).first().hover({ timeout: 5000 });
  const clickMap = (sel) => page.locator(sel).first().click({ timeout: 5000, noWaitAfter: true });
  // A connector's hit path: Playwright aims at a bounding box's centre, which
  // on a connector is its symbol (a sibling), so the pointer goes to a point a
  // quarter of the way along the line instead, as a hand would.
  const pointOnLine = (sel) => page.evaluate((s) => {
    const line = document.querySelector(s);
    const p = line.getPointAtLength(line.getTotalLength() * 0.25);
    const m = line.getScreenCTM();
    return [m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f];
  }, sel);
  const hoverLine = async (sel) => { const [x, y] = await pointOnLine(sel); await page.mouse.move(x, y); };
  const clickLine = async (sel) => { const [x, y] = await pointOnLine(sel); await page.mouse.click(x, y); };
  await at("landing", async () => "");
  await at("hover the hub's locating boss pin", () => hoverMap('#topopane g.map__pin[data-map-id="hub@hub_spindle_bore_axis"] circle.map__pinhit'));
  await at("hover the slide connector", () => hoverLine('#topopane g.map__connector[data-map-id="pitch_plate_slide_bushings_to_piston_body"] path.map__connectorline'));
  await at("hover a jumper", () => hoverMap('#topopane g.map__jumper[data-map-id="tan_link_mount_height"] path.map__jumperhit'));
  await at("hover the ground district's name", () => hoverMap('#topopane .map__bodyname[data-map-id="base"]'));
  await at("hover a bearing's box", () => hoverMap('#topopane g.map__partname[data-map-id="spherical_bearing_tan_link"] text'));
  await at("click the tangential link's name", () => clickMap('#topopane g.map__partname[data-map-id="tan_link_212956_005"] text'));
  await at("click the pitch plate district's border", async () => {
    const r = await page.evaluate(() => { const b = document.querySelector('#topopane rect.map__district[data-map-id="pitch_plate"]').getBoundingClientRect(); return [b.left, b.top, b.width]; });
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + (e.getAttribute("class") || "") : null; }, [r[0] + r[2] / 2, r[1]]);
    await page.mouse.click(r[0] + r[2] / 2, r[1]);
    return "under the pointer: " + under;
  });
  await at("click the clearance connector", () => clickLine('#topopane g.map__connector[data-map-id="travel_between_end_stops"] path.map__connectorline'));
  await at("click a pin", () => clickMap('#topopane g.map__pin[data-map-id="piston_cover_214958_002@piston_cover_end_stop_shoulder"] circle.map__pinhit'));
  await at("Escape", async () => { await page.keyboard.press("Escape"); });
  await at("wheel in over the hub, three notches", async () => {
    const r = await page.evaluate(() => { const b = document.querySelector('#topopane rect.map__box[data-map-id="hub"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    for (let i = 0; i < 3; i++) { await page.mouse.move(r[0], r[1]); await page.mouse.wheel(0, -100); await page.waitForTimeout(80); }
  });
  await at("drag the empty space", async () => {
    const p = await page.evaluate(() => { const b = document.getElementById("topopane").getBoundingClientRect(); return [b.left + 60, b.bottom - 60]; });
    await page.mouse.move(p[0], p[1]); await page.mouse.down(); await page.mouse.move(p[0] + 200, p[1] - 150, { steps: 6 }); await page.mouse.up();
  });
  await at("select the upper piston head in the tree while zoomed", async () => {
    await page.locator('#navtree [data-nav-kind="part"][data-nav-id="piston_head_upper_214698_002"]').first().click({ timeout: 5000, noWaitAfter: true });
    const r = await page.evaluate(() => { const b = document.querySelector('#topopane rect.map__box[data-map-id="piston_head_upper_214698_002"]').getBoundingClientRect(); const p = document.getElementById("topopane").getBoundingClientRect(); return `box ${[b.left, b.top, b.right, b.bottom].map(Math.round)} in pane ${[p.left, p.top, p.right, p.bottom].map(Math.round)}`; });
    return r;
  });
  await at("Fit", () => page.locator("#dag-fit").click({ timeout: 5000, noWaitAfter: true }));
  await at("the 3D pane opened beside it", async () => {
    if (!(await page.locator("#pane-handle").isVisible())) return "no pane handle (annotator not served)";
    await page.locator("#pane-handle").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    await page.waitForTimeout(2500);
  });
  await at("hover the hub's row in the tree with the pane open", () => page.locator('#navtree [data-nav-kind="part"][data-nav-id="hub"]').first().hover({ timeout: 5000 }));
  await at("DAG view", async () => {
    await page.locator('#pane-view button[data-view="dag"]').click({ timeout: 5000, noWaitAfter: true });
  });
  await at("3D view", async () => {
    await page.locator('#pane-view button[data-view="3d"]').click({ timeout: 5000, noWaitAfter: true });
    return `region display ${await page.evaluate(() => getComputedStyle(document.getElementById("topopane")).display)}`;
  });
  await at("Side by side", async () => {
    await page.locator('#pane-view button[data-view="both"]').click({ timeout: 5000, noWaitAfter: true });
  });
  await at("Classic", () => page.locator('#topopane #dag-drawing button[data-drawing="classic"]').click({ timeout: 5000, noWaitAfter: true }));
  await at("Map again", () => page.locator('#topopane #dag-drawing button[data-drawing="map"]').click({ timeout: 5000, noWaitAfter: true }));
  await at("the legacy model", async () => {
    await page.selectOption("#navtree select.navtree__select", `topology:vpa_pitch_linkage`);
    await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
    return await page.evaluate(() => Array.from(document.querySelectorAll("#topopane #dag-drawing button")).map((b) => b.textContent + (b.disabled ? "(disabled)" : "")).join(" / "));
  });
  await at("back to the end-stop model", async () => {
    await page.selectOption("#navtree select.navtree__select", `topology:${V2}`);
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
  });
  await at("a study opened", async () => {
    const study = page.locator('#navtree [data-nav-kind="study"], #navtree [data-nav-kind="kinematic"]').first();
    if (!(await study.count())) return "no study on this model";
    await study.click({ timeout: 5000, noWaitAfter: true });
    await page.waitForTimeout(800);
    return await page.evaluate(() => `${document.querySelectorAll("#topopane svg.tv__map").length} map, ${document.querySelectorAll("#topogrid tr.tvrow").length} grid rows`);
  });
  await page.close();
}

writeFileSync(join(SHOTS, (ONLY || "walk") + "_log.txt"), log.join("\n") + "\n");
await browser.close();
server.close();
