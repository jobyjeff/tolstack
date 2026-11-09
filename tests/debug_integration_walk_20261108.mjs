// Hand-run inspection probe for handoff the_integration_walk_reads_the_merged_
// page_against_jeffs_sentences (2026-11-08). NOT a tier -- pytest never
// collects it, and it asserts nothing: it takes the walk's shots and prints
// the numbers each one is read against.
//
//   node tests/debug_integration_walk_20261108.mjs [--phase probe|walk|demo|models|all]
//        [--shots <dir>] [--widths 1600,2560] [--repo C:/workspace/tolstack]
//
// Serves THIS tree's apps/ with data/ from the main checkout (as
// debug_nested_bodies_shots.mjs and debug_scene_alone_and_leaders.mjs do), so
// what it shoots is the merged tree's code over projections rebuilt from that
// same tree. Every state is reached through the page's own controls from an
// empty store.
//   walk   -- one shot per sentence of Jeff's 2026-11-08 complaint (S1..S15),
//             at each width
//   demo   -- the five demo clicks at 1920x1200
//   models -- v2 -> v1 -> v2 in one page
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
const WIDTHS = (flag("--widths") || "1600,2560").split(",").map(Number);
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_integration_walk_reads_the_merged_page_against_jeffs_sentences");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V1 = "vpa_pitch_linkage";
const V2 = "vpa_end_stop_v2";
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

async function open(width, height, topology) {
  const page = await browser.newPage({ viewport: { width, height } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.status() >= 400) page.__errors.push("HTTP " + r.status() + " " + r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html?topology=${topology}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

// What the live pane draws: outline counts per class, the rails' pitch and
// dot radius, and the computed stroke widths the eye reads as "line weight".
const census = (page) => page.evaluate(() => {
  const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
    .filter((n) => !n.closest(".tv__ghost"))[0] || document;
  const n = (sel) => live.querySelectorAll(sel).length;
  const dots = Array.from(live.querySelectorAll("svg.tv__rails circle.rail__dot"));
  const xs = Array.from(new Set(dots.map((d) => Number(d.getAttribute("cx"))))).sort((a, b) => a - b);
  const steps = xs.slice(1).map((x, i) => +(x - xs[i]).toFixed(2)).filter((s) => s > 0);
  const sw = (sel) => {
    const el = live.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { w: cs.strokeWidth, ink: cs.stroke, op: cs.strokeOpacity, opacity: cs.opacity };
  };
  // The DAG's on-screen scale: a drawn width over its user-space width.
  const svg = live.querySelector("svg.tv__rails");
  const vb = svg && svg.viewBox && svg.viewBox.baseVal;
  const rect = svg ? svg.getBoundingClientRect() : null;
  return {
    bands: n(".rail__band"), bodyfield: n("rect.tv__bodyfield"), partfield: n("rect.tv__partfield"),
    block: n("rect.tv__block"), bodyname: n(".tv__bodyname"), partname: n(".tv__partname"),
    braceBody: n(".tvbrace--body"), bracePart: n(".tvbrace--part"), braceLabel: n(".tvbrace__label"),
    pitch: steps.length ? Math.min(...steps) : null,
    dotR: dots.length ? Number(dots[0].getAttribute("r")) : null,
    rowH: window.ViewerApp.RAIL_METRICS.rowHeight,
    svgScale: vb && vb.width && rect ? +(rect.width / vb.width).toFixed(3) : null,
    stroke: { bar: sw(".rail__bar"), link: sw(".rail__link"), dot: sw(".rail__dot"),
      bodyfield: sw("rect.tv__bodyfield"), partfield: sw("rect.tv__partfield"),
      leader: sw(".rail__leader") },
  };
});

// Every class drawn in the DAG and the grid, with counts: the probe phase's
// map of what there is to select.
const classMap = (page) => page.evaluate(() => {
  const out = {};
  for (const el of document.querySelectorAll("#topopane *")) {
    for (const c of el.classList) out[el.tagName.toLowerCase() + "." + c] = (out[el.tagName.toLowerCase() + "." + c] || 0) + 1;
  }
  return out;
});

// The grid's rows in screen order: id, kind, visible label text.
const gridRows = (page) => page.evaluate(() => Array.from(document.querySelectorAll("#topopane tr"))
  .filter((r) => !r.closest(".tv__ghost"))
  .map((r) => [r.getAttribute("data-id") || r.getAttribute("data-row-id") || "",
    r.className, (r.innerText || "").replace(/\s+/g, " ").trim().slice(0, 110)]));

// The containers' names as drawn, in screen order (top to bottom).
const containers = (page) => page.evaluate(() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel))
    .filter((n) => !n.closest(".tv__ghost"))
    .map((n) => { const r = n.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), (n.textContent || "").trim().slice(0, 80)]; })
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { bodyname: pick(".tv__bodyname"), partname: pick(".tv__partname"), braceLabel: pick(".tvbrace__label") };
});

const banner = (page) => page.evaluate(() => {
  const b = document.querySelector("#banner");
  return b ? (b.innerText || "").replace(/\s+/g, " ").trim().slice(0, 600) : null;
});

async function dataSource(page) {
  const fold = page.locator("#banner details.banner__source").first();
  if (!(await fold.count())) return null;
  await fold.evaluate((d) => { d.open = true; });
  const text = await fold.evaluate((d) => (d.innerText || "").replace(/\s+/g, " ").trim().slice(0, 900));
  return text;
}

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

async function shot(page, name, extra) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
  log(name, { ...(extra || {}), ...(await census(page)) });
}

// The 3D pane (as debug_scene_alone_and_leaders.mjs opens it).
async function sceneNow(page, settleMs = 1500, maxMs = 90000) {
  const started = Date.now();
  let last = "", stable = 0, v = [];
  while (Date.now() - started < maxMs) {
    try { v = await run(page, ["scene-view"]); } catch { v = []; }
    if (!Array.isArray(v)) v = [];
    const key = JSON.stringify(v);
    stable = key === last && v.length ? stable + 1 : 0;
    last = key;
    if (stable >= Math.ceil(settleMs / 500)) break;
    await page.waitForTimeout(500);
  }
  return v;
}

const drawn = (page) => frameOf(page).evaluate(() => {
  const scene = window.__scene;
  const v = window.AnnotateApp.exec(["scene-view"]);
  const out = {};
  for (const sha of scene.listOpenParts()) {
    const info = v.find((r) => r.sha256 === sha) || {};
    if (!info.visible) continue;
    out[info.part || sha.slice(0, 8)] = scene.drawnOccurrenceKeys(sha).length;
  }
  return out;
});

const seam = (page) => page.evaluate(() => {
  const VA = window.ViewerApp;
  const s = VA.lastSeamDraw;
  const leaders = Array.from(document.querySelectorAll(".seam__leader"));
  const ink = leaders.slice(0, 1).map((l) => {
    const cs = getComputedStyle(l);
    return { stroke: cs.stroke, w: cs.strokeWidth, op: cs.strokeOpacity, opacity: cs.opacity };
  })[0] || null;
  return {
    leaders: leaders.length,
    leaderInk: ink,
    lastSeamDraw: s ? { leaders: s.leaders.length, skipped: s.skipped } : null,
  };
});

async function openPane(page, topologyId) {
  const row = page.locator(`[data-nav-kind="topology"][data-nav-id="${topologyId}"]`).first();
  await row.hover();
  await row.locator("[data-nav-3d]").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await sceneNow(page);
  await page.waitForTimeout(3000);
}

async function loadSweep(page) {
  const sw = await run(page, ["sweep", "latest"]).catch((e) => "ERR " + e.message);
  log("sweep", String(JSON.stringify(sw)).slice(0, 200));
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 });
  await page.waitForTimeout(5000);
}

// Brings a grid row to the viewport's middle by scrolling the page only, so
// the DAG beside it stays in frame (scrollIntoView would also scroll the
// pane's horizontal scroller to the row and push the DAG out of view).
async function scrollToRow(page, id) {
  await page.evaluate((rid) => {
    const r = Array.from(document.querySelectorAll(`#topopane tr[data-id="${rid}"]`)).find((n) => !n.closest(".tv__ghost"));
    for (const h of document.querySelectorAll("#topopane .tv__hscroll")) h.scrollLeft = 0;
    if (r) window.scrollBy(0, r.getBoundingClientRect().top - window.innerHeight / 2);
  }, id);
  await page.waitForTimeout(600);
}

async function probe() {
  const page = await open(1600, 1100, V2);
  log("probe: banner", await banner(page));
  log("probe: data source", await dataSource(page));
  log("probe: classes", await classMap(page));
  log("probe: rows", await gridRows(page));
  log("probe: containers", await containers(page));
  log("probe: census", await census(page));
  log("probe: errors", page.__errors);
  await page.screenshot({ path: join(SHOTS, "probe_v2_1600.png"), fullPage: true });
  await page.close();
}

// Every visible word "spindle" on the page outside the nav (whose stacks are
// the main spindle's, not the hub's rows), with where it was found.
const spindleWords = (page) => page.evaluate(() => {
  const out = [];
  const pane = document.querySelector("#topopane");
  const walker = document.createTreeWalker(pane, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent;
    if (/spindle/i.test(t) && !walker.currentNode.parentElement.closest(".tv__ghost")) {
      const parent = walker.currentNode.parentElement;
      out.push(["text", parent.tagName.toLowerCase() + "." + (parent.getAttribute("class") || ""),
        t.trim().slice(0, 100)]);
    }
  }
  for (const el of pane.querySelectorAll("[title]")) {
    if (/spindle/i.test(el.getAttribute("title"))) out.push(["title", el.tagName.toLowerCase(), el.getAttribute("title").slice(0, 100)]);
  }
  return out;
});

// One grid row and the DAG marks for it, with the leader states and inks.
const leaderInks = (page) => page.evaluate(() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel)).filter((n) => !n.closest(".tv__ghost"));
  const ink = (el) => { const cs = getComputedStyle(el); return [cs.stroke, cs.strokeWidth, cs.strokeOpacity, cs.opacity].join(" "); };
  const tally = (sel) => {
    const t = {};
    for (const el of pick(sel)) { const k = el.getAttribute("class") + " | " + ink(el); t[k] = (t[k] || 0) + 1; }
    return t;
  };
  return { gridLeaders: tally("path.rail__leader"), seamLeaders: tally(".seam__leader"),
    railLink: tally("path.rail__link"), railLine: tally("line.rail") };
});

async function clickRow(page, id) {
  await scrollToRow(page, id);
  const row = page.locator(`#topopane tr.tvrow[data-id="${id}"]`).first();
  await row.locator("td.tvcell--description").click();
  await settle(page, 1500);
}

async function walk(width) {
  const H = 1300;
  const tag = (s) => `${s}_${width}`;
  let page = await open(width, H, V2);
  log(tag("errors at load"), page.__errors.splice(0));
  // S4 default, S10 base order, S3 / S9 at the top of the walk.
  await shot(page, tag("s04_default"));
  log(tag("s10 containers in screen order"), await containers(page));
  log(tag("s11 spindle words"), await spindleWords(page));
  log(tag("s15 leader inks at rest"), await leaderInks(page));
  // S3: the strip between the DAG and the grid, mid-walk.
  await scrollToRow(page, "tan_link_length");
  await shot(page, tag("s03_between_leaders"));
  await shot(page, tag("s08_tan_link_dag_and_grid"));
  await scrollToRow(page, "pitch_link_length");
  await shot(page, tag("s08_s14_pitch_link_dag_and_grid"));
  await scrollToRow(page, "piston_head_lower_thickness");
  await shot(page, tag("s13_piston_heads"));
  await scrollToRow(page, "hub_blade_axis_offset");
  await shot(page, tag("s11_hub_rows"));
  await scrollToRow(page, "tan_link_mount_pilot_to_bore");
  await shot(page, tag("s12_tan_link_mount_rows"));
  // S7: the grid's left gutter, whole height.
  const grid = page.locator("#topopane div.tv__rows").first();
  await grid.screenshot({ path: join(SHOTS, tag("s07_grid_gutter") + ".png") });
  log(tag("s07_grid_gutter"), await containers(page));
  // S9: the DAG at 1:1 device pixels, a close crop of the base body.
  await page.evaluate(() => window.scrollTo(0, 0));
  const dag = page.locator("svg.tv__rails").first();
  const box = await dag.boundingBox();
  await page.screenshot({ path: join(SHOTS, tag("s09_line_weights") + ".png"),
    clip: { x: box.x, y: Math.max(box.y, 0), width: Math.min(420, box.width), height: 420 } });
  // S15: a row selected -- the leaders lit.
  await clickRow(page, "tan_link_length");
  log(tag("s15 leader inks, tan_link_length selected"), await leaderInks(page));
  await shot(page, tag("s15_row_selected"));
  await page.close();

  page = await open(width, H, V2);
  // S4: the colour-blind palette.
  await view(page, "palette", "cvd");
  await shot(page, tag("s04_colourblind"));
  await view(page, "palette", "bold");
  // S5: both densities.
  await shot(page, tag("s05_comfortable"));
  await page.click("#density-toggle");
  await settle(page);
  await shot(page, tag("s05_compact"));
  await page.click("#density-toggle");
  await settle(page);
  // S6: groups.
  await groups(page, "parts", false);
  await shot(page, tag("s06_parts_off"));
  await groups(page, "parts", true);
  await groups(page, "bodies", false);
  await shot(page, tag("s06_bodies_off"));
  await groups(page, "parts", false);
  await shot(page, tag("s06_both_off"));
  await groups(page, "parts", true);
  await groups(page, "bodies", true);
  log(tag("errors, settings"), page.__errors.splice(0));
  await page.close();

  // S1 / S2 / S15 in the pane.
  page = await open(width, H, V2);
  await openPane(page, V2);
  log(tag("s01 rest: drawn parts (matrices)"), await drawn(page));
  log(tag("s02 rest: seam"), await seam(page));
  await page.screenshot({ path: join(SHOTS, tag("s01_pane_at_rest") + ".png") });
  await loadSweep(page);
  log(tag("s01 sweep: drawn parts (matrices)"), await drawn(page));
  log(tag("s02 sweep: seam"), await seam(page));
  log(tag("s15 sweep: leader inks"), await leaderInks(page));
  await page.screenshot({ path: join(SHOTS, tag("s02_sweep_loaded") + ".png") });
  const n = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length);
  await run(page, ["seek", "#" + Math.floor(n / 2)]);
  await page.waitForTimeout(2500);
  log(tag("s01 mid: drawn parts (matrices)"), await drawn(page));
  log(tag("s02 mid: seam"), await seam(page));
  await page.screenshot({ path: join(SHOTS, tag("s01_mid_sweep") + ".png") });
  const dot = page.locator('svg.tv__rails circle.rail__dot[data-id="tan_link_upper_sphere_centre"]').first();
  if (await dot.count()) {
    await dot.click({ force: true });
    await page.waitForTimeout(1500);
    log(tag("s15 node selected: leader inks"), await leaderInks(page));
    await page.screenshot({ path: join(SHOTS, tag("s15_pane_node_selected") + ".png") });
  }
  log(tag("errors, pane"), page.__errors.splice(0));
  await page.close();
}

// The 3D scene alone, framed on everything it draws (`camera reset`), at rest
// and mid-sweep, and the nav's Bodies list unfolded beside it: the pane's
// own crop is a close-up, which cannot show a stray blade.
async function pane3d(width) {
  const H = 1300;
  const tag = (s) => `${s}_${width}`;
  const page = await open(width, H, V2);
  await openPane(page, V2);
  const iframe = page.locator("#annotate-flyout iframe").first();
  await run(page, ["camera", "reset"]);
  await page.waitForTimeout(2000);
  await iframe.screenshot({ path: join(SHOTS, tag("s01_scene_framed_at_rest") + ".png") });
  await loadSweep(page);
  const n = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length);
  await run(page, ["seek", "#" + Math.floor(n / 2)]);
  await run(page, ["camera", "reset"]);
  await page.waitForTimeout(2500);
  await iframe.screenshot({ path: join(SHOTS, tag("s01_scene_framed_mid_sweep") + ".png") });
  log(tag("s01 framed mid: drawn parts (matrices)"), await drawn(page));
  // Unfold every body in the nav's Bodies list and read it.
  const bodies = await page.evaluate(() => {
    const out = [];
    for (const d of document.querySelectorAll("#navtree details")) {
      const s = d.querySelector("summary");
      if (s && /parts?$/.test((s.textContent || "").trim())) { d.open = true; out.push((d.innerText || "").replace(/\s+/g, " ").trim().slice(0, 300)); }
    }
    return out;
  });
  log(tag("s10 s13 nav bodies list"), bodies);
  await page.waitForTimeout(500);
  const nav = page.locator("#navtree").first();
  await nav.screenshot({ path: join(SHOTS, tag("s10_s13_nav_bodies_in_sweep") + ".png") });
  log(tag("errors, pane3d"), page.__errors.splice(0));
  await page.close();
}

// The five demo clicks, as a person would make them, at 1920x1200.
async function demo(base) {
  const W = 1920, H = 1200;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") page.__errors.push(m.type() + ": " + m.text().slice(0, 300)); });
  page.on("response", (r) => { if (r.status() >= 400) page.__errors.push("HTTP " + r.status() + " " + r.url().slice(0, 160)); });
  const prefix = base ? "demo_8000" : "demo";
  const target = base ? `${base}/topology.html?topology=${V2}` : `${url}/apps/viewer/topology.html?topology=${V2}`;
  await page.goto(target, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page, 1500);
  log(prefix + " 1 banner", await banner(page));
  log(prefix + " 1 data source", await dataSource(page));
  await page.evaluate(() => { const d = document.querySelector("#banner details.banner__source"); if (d) d.open = false; });
  await page.screenshot({ path: join(SHOTS, `${prefix}_1_open_v2.png`) });
  log(prefix + " 1 errors", page.__errors.splice(0));
  const colourBy = await page.evaluate(() => {
    const s = document.querySelector('select[data-view-setting="colourBy"]'); return s ? s.value : null; });
  log(prefix + " 2 colourBy before", colourBy);
  await view(page, "colourBy", "body");
  await page.screenshot({ path: join(SHOTS, `${prefix}_2_colour_by_body.png`) });
  log(prefix + " 2 errors", page.__errors.splice(0));
  await openPane(page, V2);
  await page.screenshot({ path: join(SHOTS, `${prefix}_3_pane_open.png`) });
  log(prefix + " 3 pane buttons", await frameOf(page).evaluate(() => Array.from(document.querySelectorAll("button"))
    .filter((b) => b.offsetParent).map((b) => [b.id, (b.textContent || "").trim().slice(0, 30), b.title.slice(0, 60)])));
  log(prefix + " 3 pane notice", await frameOf(page).evaluate(() => {
    const ids = ["notice", "scene-empty", "hint-panel"];
    return ids.map((i) => { const e = document.getElementById(i); return e && e.offsetParent ? [i, e.innerText.slice(0, 300)] : null; }).filter(Boolean);
  }));
  log(prefix + " 3 errors", page.__errors.splice(0));
  await loadSweep(page);
  await run(page, ["play"]);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(SHOTS, `${prefix}_4_sweep_playing.png`) });
  log(prefix + " 4 seam", await seam(page));
  log(prefix + " 4 drawn", await drawn(page));
  log(prefix + " 4 errors", page.__errors.splice(0));
  await run(page, ["pause"]);
  await clickRow(page, "tan_link_length");
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(SHOTS, `${prefix}_5_tan_link_length_selected.png`) });
  log(prefix + " 5 seam", await seam(page));
  log(prefix + " 5 drawn", await drawn(page));
  log(prefix + " 5 preview", await page.evaluate(() => (document.querySelector("#detail") || {}).innerText.slice(0, 500)));
  log(prefix + " 5 errors", page.__errors.splice(0));
  await page.close();
}

// v2 -> v1 -> v2 in one page, through the nav.
async function models() {
  const page = await open(1600, 1100, V2);
  await page.screenshot({ path: join(SHOTS, "m1_v2_1600.png") });
  await page.locator(`[data-nav-kind="topology"][data-nav-id="${V1}"]`).first().click();
  await settle(page, 1500);
  await page.screenshot({ path: join(SHOTS, "m2_v1_1600.png") });
  log("m2 v1", await census(page));
  await page.locator(`[data-nav-kind="topology"][data-nav-id="${V2}"]`).first().click();
  await settle(page, 1500);
  await page.screenshot({ path: join(SHOTS, "m3_back_to_v2_1600.png") });
  log("m3 v2 again", await census(page));
  log("models errors", page.__errors.splice(0));
  await page.close();
}

try {
  if (PHASE === "probe") await probe();
  if (PHASE === "walk" || PHASE === "all") for (const w of WIDTHS) await walk(w);
  if (PHASE === "pane3d" || PHASE === "all") for (const w of WIDTHS) await pane3d(w);
  if (PHASE === "demo" || PHASE === "all") await demo(null);
  if (PHASE === "demo8000") await demo("http://127.0.0.1:8000/tolstack/viewer");
  if (PHASE === "models" || PHASE === "all") await models();
} finally {
  await browser.close();
  server.close();
}
