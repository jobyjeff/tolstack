// Hand-run inspection probe for handoff
// a_map_pin_faces_each_partner_and_no_two_routes_share_a_run (2026-11-19). NOT
// a tier -- pytest never collects it. It takes the machine's browser slot
// itself.
//
//   node tests/debug_map_pins_per_partner_20261119.mjs --repo <root with data/> --tag before|after [--shots <dir>]
//
// Serves THIS tree's apps/ with data/ from `--repo`. At 3840 x 2160 and at
// 1536 x 864, Side by side with the 3D pane open: the whole map, the pitch
// plate's district zoomed in, and each feature with more than one interface
// hovered on the map -- a shot and a line each, named `<tag>_...`.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (!flag("--repo")) throw new Error("--repo <root with data/> is required");
const DATA_REPO = resolve(flag("--repo"));
const TAG = flag("--tag") || "shot";
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_map_pin_faces_each_partner_and_no_two_routes_share_a_run");
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

const SIZES = [["3840", 3840, 2160], ["1536", 1536, 864]];

try {
  for (const [label, width, height] of SIZES) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
    await page.addInitScript(() => {
      try { localStorage.setItem("tolstack.viewer.paneView", "both"); } catch (e) { /* no storage */ }
    });
    await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForSelector("#pane-handle:visible", { timeout: 30000 }).catch(() => {});
    if (await page.locator("#pane-handle").isVisible()) {
      await page.locator("#pane-handle").click();
      await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(4000);
    }
    // The features with more than one interface, off the drawn geometry.
    const info = await page.evaluate(() => {
      const VA = window.ViewerApp;
      const geo = VA.lastMapLight.geometry;
      const count = {};
      geo.connectors.forEach((c) => c.ends.forEach((e) => { count[e] = (count[e] || 0) + 1; }));
      return { notes: geo.notes, counts: VA.mapCounts(geo),
        multi: Object.keys(count).filter((k) => count[k] > 1).sort() };
    });
    say(`${label}: notes ${info.notes.length ? info.notes.join("; ") : "none"}; counts ${JSON.stringify(info.counts)}`);
    await page.locator("#topopane").screenshot({ path: join(SHOTS, `${TAG}_${label}_map.png`) });
    say(`  shot ${TAG}_${label}_map.png`);
    // The pitch plate's district, zoomed so it fills the region.
    const d = await page.evaluate(() => {
      const r = document.querySelector('#topopane rect.map__district[data-map-id="pitch_plate"]').getBoundingClientRect();
      const p = document.querySelector("#topopane").getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, k: Math.min(p.width / r.width, p.height / r.height) };
    });
    await page.mouse.move(d.cx, d.cy);
    const notches = Math.max(0, Math.floor(Math.log(d.k * 0.8) / Math.log(1.15)));
    for (let i = 0; i < notches; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(40); }
    await page.mouse.move(5, 5);
    await page.waitForTimeout(400);
    await page.locator("#topopane").screenshot({ path: join(SHOTS, `${TAG}_${label}_pitch_plate.png`) });
    say(`  shot ${TAG}_${label}_pitch_plate.png (${notches} notches)`);
    let step = 0;
    for (const id of info.multi) {
      step += 1;
      const pin = page.locator(`#topopane g.map__pin[data-map-id="${id}"] circle.map__pindot`).first();
      try {
        await pin.hover({ timeout: 5000, force: true });
        await page.waitForTimeout(400);
        const lit = await page.evaluate((fid) => {
          const g = document.querySelector(`#topopane g.map__pin[data-map-id="${fid}"]`);
          return { dots: g ? g.querySelectorAll("circle.map__pindot").length : 0,
            lead: document.querySelectorAll("#topopane [class*='--lead']").length,
            hot: document.querySelectorAll("#topopane [class*='--hot']").length };
        }, id);
        say(`  ${step}. hover ${id}: ${lit.dots} dot(s), ${lit.lead} lead, ${lit.hot} hot`);
        if (label === "3840") {
          await page.locator("#topopane").screenshot({ path: join(SHOTS, `${TAG}_${label}_hover_${step}_${id.split("@")[1]}.png`) });
        }
      } catch (e) {
        say(`  ${step}. hover ${id}: ${e.message.slice(0, 160)} (off screen at this zoom?)`);
      }
    }
    await page.close();
  }
} finally {
  writeFileSync(join(SHOTS, `${TAG}_probe_log.txt`), log.join("\n") + "\n", "utf8");
  await browser.close();
  server.close();
}
