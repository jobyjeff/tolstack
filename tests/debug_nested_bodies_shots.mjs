// Hand-run inspection probe for handoff the_dag_and_grid_nest_coloured_
// bodies_and_compact_means_denser_rows (2026-11-08). NOT a tier -- pytest
// never collects it.
//
//   node tests/debug_nested_bodies_shots.mjs --shots <dir> [--tag before|after] [--widths 1600,2560]
//
// Serves THIS tree's apps/ with data/ from the main checkout and takes, per
// width, the states the lesson shows: v2 default, Compact, Colour-blind,
// Groups with Parts off, Groups with Bodies off, v1 default -- every one
// reached through the page's own controls, from an empty store. Prints, per
// state, the outline counts by class and the rails' column pitch and dot
// radius, so the shots carry their numbers.
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
const TAG = flag("--tag") || "after";
const WIDTHS = (flag("--widths") || "1600,2560").split(",").map(Number);
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/nested_bodies");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V1 = "vpa_pitch_linkage";
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

async function settle(page, ms = 700) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 });
  await page.waitForTimeout(ms);
}

async function open(width, topology) {
  const page = await browser.newPage({ viewport: { width, height: 1100 } });
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
  await page.goto(`${url}/apps/viewer/topology.html?topology=${topology}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

// What the live pane draws: outline counts per class, the bands, and the
// rails' pitch (adjacent columns' dot centres) and dot radius.
const census = (page) => page.evaluate(() => {
  const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
    .filter((n) => !n.closest(".tv__ghost"))[0] || document;
  const n = (sel) => live.querySelectorAll(sel).length;
  const dots = Array.from(live.querySelectorAll("svg.tv__rails circle.rail__dot"));
  const xs = Array.from(new Set(dots.map((d) => Number(d.getAttribute("cx"))))).sort((a, b) => a - b);
  const steps = xs.slice(1).map((x, i) => +(x - xs[i]).toFixed(2)).filter((s) => s > 0);
  return {
    bands: n(".rail__band"), bodyfield: n("rect.tv__bodyfield"), partfield: n("rect.tv__partfield"),
    block: n("rect.tv__block"), bodyname: n(".tv__bodyname"), partname: n(".tv__partname"),
    braceBody: n(".tvbrace--body"), bracePart: n(".tvbrace--part"),
    braceLabel: n(".tvbrace__label"), pitch: steps.length ? Math.min(...steps) : null,
    dotR: dots.length ? Number(dots[0].getAttribute("r")) : null,
    rowH: window.ViewerApp.RAIL_METRICS.rowHeight,
  };
});

async function view(page, setting, value) {
  await page.click("#dag-view-toggle");
  await page.selectOption(`select[data-view-setting="${setting}"]`, value);
  await page.click("body", { position: { x: 2, y: 2 } });
  await settle(page);
}

async function groups(page, kind, on) {
  await page.click("#group-kinds-toggle");
  const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
  if ((await box.isChecked()) !== on) await box.click();
  await page.click("body", { position: { x: 2, y: 2 } });
  await settle(page);
}

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${TAG}_${name}.png`) });
  console.log(JSON.stringify({ shot: `${TAG}_${name}`, ...(await census(page)) }));
}

try {
  for (const width of WIDTHS) {
    let page = await open(width, V2);
    await shot(page, `v2_default_${width}`);
    await page.click("#density-toggle");
    await settle(page);
    await shot(page, `v2_compact_${width}`);
    await page.click("#density-toggle");
    await settle(page);
    if (await page.locator('select[data-view-setting="palette"]').count()) {
      await view(page, "palette", "cvd");
      await shot(page, `v2_colourblind_${width}`);
      await view(page, "palette", "bold");
    }
    await groups(page, "parts", false);
    await shot(page, `v2_parts_off_${width}`);
    await groups(page, "parts", true);
    await groups(page, "bodies", false);
    await shot(page, `v2_bodies_off_${width}`);
    await groups(page, "parts", false);
    await shot(page, `v2_both_off_${width}`);
    await groups(page, "parts", true);
    await groups(page, "bodies", true);
    await page.close();
    page = await open(width, V1);
    await shot(page, `v1_default_${width}`);
    await groups(page, "parts", false);
    await groups(page, "bodies", false);
    console.log(JSON.stringify({ state: `v1 both off ${width}`, ...(await census(page)) }));
    await groups(page, "parts", true);
    await groups(page, "bodies", true);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
