// Hand-run walk for handoff the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map
// (2026-11-22). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
//   node tests/debug_lug_stacks_20261122.mjs --root <scratch repo root> [--shots <dir>]
//
// --root is a scratch root whose data/ holds projections rebuilt from THIS
// tree with --data-root (the probe never serves the real data). Read-only:
// nothing here writes a binding.
//
// Shoots v2's map at 3840 x 2160 and at 1536 x 864 (device scale 2), in the
// framings of the 11-19 walk (the_walk_reads_the_links_and_the_pitch_plate_
// stack_on_the_merged_page, 01-04): the whole page Side by side, the plate
// and links region, the pitch plate's district, each link; then the DAG view
// alone, v2's end-stop study selected, each Groups switch off in turn (set
// in-page and printed, never by clicking the popover), a hover on each
// link's length, and a box's stroke on the first paint before any hover.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (!flag("--root")) throw new Error("--root <scratch repo root> is required: this probe never serves the real data");
const SCRATCH = join(resolve(flag("--root")), "data");
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_lug_stacks_line_up_and_each_link_is_a_row_on_the_map");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const STUDY = "vpa_end_stop_v2_travel_between_end_stops";
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", "C:/workspace/tolstack/data/meshes"],
  ["/tolstack/data/", join(SCRATCH, "projections", "viewer")],
];
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    try {
      const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const mount = MOUNTS.find(([prefix]) => path.startsWith(prefix));
      if (!mount) throw new Error("no mount");
      const full = join(mount[1], normalize(path.slice(mount[0].length)));
      if (!full.startsWith(normalize(mount[1]) + sep) && full !== normalize(mount[1])) throw new Error("outside");
      const body = readFileSync(statSync(full).isDirectory() ? join(full, "index.html") : full);
      res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream",
        "cache-control": "no-cache" }).end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });

const boxOf = (page, sels) => page.evaluate((sels) => {
  const rects = sels.flatMap((s) => Array.from(document.querySelectorAll(s))).map((e) => e.getBoundingClientRect())
    .filter((r) => r.width || r.height);
  if (!rects.length) return null;
  return { x: Math.min(...rects.map((r) => r.left)), y: Math.min(...rects.map((r) => r.top)),
    r: Math.max(...rects.map((r) => r.right)), b: Math.max(...rects.map((r) => r.bottom)) };
}, sels);
async function clipShot(page, name, box, m) {
  if (!box) { log(name, "nothing to clip"); return; }
  m = m === undefined ? 30 : m;
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - m), y = Math.max(0, box.y - m);
  await page.screenshot({ path: join(SHOTS, name + ".png"),
    clip: { x, y, width: Math.min(vp.width - x, box.r - box.x + 2 * m), height: Math.min(vp.height - y, box.b - box.y + 2 * m) } });
}
async function open(width, height, query, view) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 2000 ? 2 : 1 });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript((v) => {
    try {
      localStorage.setItem("tolstack.viewer.paneView", v);
      localStorage.removeItem("tolstack.viewer.groupKinds");
    } catch (e) { /* no storage */ }
  }, view || "both");
  await page.goto(`${url}/tolstack/viewer/topology.html?${query}`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 60000 });
  await page.waitForTimeout(2500);
  return page;
}
const PLATE_AND_LINKS = ['#topopane rect.map__district[data-map-id="pitch_plate"]',
  '#topopane rect.map__outline[data-map-id="tan_link_212956_005"]', '#topopane rect.map__outline[data-map-id="pitch_link"]'];

for (const [label, width, height] of [["3840", 3840, 2160], ["1536", 1536, 864]]) {
  const page = await open(width, height, `topology=${V2}`, "both");
  // Before any hover: a box's stroke and class, and a connector's.
  log(`first paint ${label}`, await page.evaluate(() => {
    const box = document.querySelector('#topopane rect.map__box[data-map-id="pitch_plate_215735_001"]');
    const conn = document.querySelector('#topopane g.map__connector[data-map-id="tan_link_upper_ball_joint"]');
    return { boxClass: box && box.getAttribute("class"), boxStroke: box && getComputedStyle(box).stroke,
             connectorClass: conn && conn.getAttribute("class") };
  }));
  if (label === "3840") {
    log("map", await page.evaluate(() => {
      const g = window.ViewerApp.lastMapLight && window.ViewerApp.lastMapLight.geometry;
      return g ? { notes: g.notes, counts: window.ViewerApp.mapCounts(g) } : null;
    }));
  }
  await page.mouse.move(2, height - 2);
  await page.screenshot({ path: join(SHOTS, `00_${label}_side_by_side.png`) });
  await clipShot(page, `01_${label}_map_plate_and_links_region`, await boxOf(page, PLATE_AND_LINKS));
  await clipShot(page, `02_${label}_pitch_plate_region`,
    await boxOf(page, ['#topopane rect.map__district[data-map-id="pitch_plate"]']));
  await clipShot(page, `03_${label}_tangential_link`,
    await boxOf(page, ['#topopane rect.map__outline[data-map-id="tan_link_212956_005"]']));
  await clipShot(page, `04_${label}_pitch_link`,
    await boxOf(page, ['#topopane rect.map__outline[data-map-id="pitch_link"]']));
  await clipShot(page, `05_${label}_whole_map`, await boxOf(page, ["#topopane svg.tv__map"]), 0);
  log(`errors ${label}`, page.__errors);
  await page.close();

  const dag = await open(width, height, `topology=${V2}`, "dag");
  await dag.mouse.move(2, height - 2);
  await dag.screenshot({ path: join(SHOTS, `06_${label}_dag_view.png`) });
  if (label === "3840") {
    await clipShot(dag, "07_3840_dag_plate_and_links_region", await boxOf(dag, PLATE_AND_LINKS));
    // A hover on each link's length: the dimension lit.
    for (const [n, id] of [["08", "tan_link_length"], ["09", "pitch_link_length"]]) {
      const at = await boxOf(dag, [`#topopane g.map__jumper[data-map-id="${id}"] path.map__jumperline`]);
      if (!at) { log(id, "not drawn"); continue; }
      // The dimension line's middle, where no box is.
      await dag.mouse.move((at.x + at.r) / 2, (at.y + at.b) / 2);
      await dag.waitForTimeout(500);
      log(`hover ${id}`, await dag.evaluate((id) => {
        const g = document.querySelector(`#topopane g.map__jumper[data-map-id="${id}"]`);
        return g && g.getAttribute("class");
      }, id));
      await clipShot(dag, `${n}_3840_hover_${id}`, await boxOf(dag,
        [id === "tan_link_length" ? '#topopane rect.map__outline[data-map-id="tan_link_212956_005"]'
          : '#topopane rect.map__outline[data-map-id="pitch_link"]']), 40);
      await dag.mouse.move(2, height - 2);
      await dag.waitForTimeout(300);
    }
  }
  log(`errors dag ${label}`, dag.__errors);
  await dag.close();
}

// v2's study selected: its lit route.
{
  const page = await open(3840, 2160, `topology=${V2}&study=${STUDY}`, "both");
  await page.mouse.move(2, 2158);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(SHOTS, "10_3840_study_selected.png") });
  await clipShot(page, "11_3840_study_selected_map", await boxOf(page, ["#topopane svg.tv__map"]), 0);
  log("study", await page.evaluate(() => ({
    lit: Array.from(document.querySelectorAll("#topopane [class*='--route'], #topopane [class*='--selected'], #topopane [class*='--lead']"))
      .map((e) => e.getAttribute("data-map-kind") + ":" + e.getAttribute("data-map-id")).filter((s) => !/null/.test(s)).length,
  })));
  // Each Groups switch off in turn, set in-page; every state printed.
  const kinds = ["bodies", "assemblies", "parts"];
  const setKinds = (want) => page.evaluate((want) => {
    const toggle = document.querySelector("#group-kinds-toggle");
    const pop = document.querySelector("#group-kinds");
    if (pop && !pop.hasAttribute("open") && toggle) toggle.click();
    const out = {};
    Object.keys(want).forEach((k) => {
      const box = document.querySelector(`#group-kinds input[data-kind="${k}"]`);
      if (box && box.checked !== want[k]) box.click();
    });
    Object.keys(want).forEach((k) => {
      const box = document.querySelector(`#group-kinds input[data-kind="${k}"]`);
      out[k] = box ? box.checked : null;
    });
    out.svgClass = document.querySelector("#topopane svg.tv__map").getAttribute("class");
    return out;
  }, want);
  for (const [i, kind] of kinds.entries()) {
    const want = { bodies: true, assemblies: true, parts: true };
    want[kind] = false;
    log(`groups ${kind} off`, await setKinds(want));
    await page.mouse.move(2, 2158);
    await page.waitForTimeout(800);
    await clipShot(page, `1${2 + i}_3840_${kind}_off`, await boxOf(page, ["#topopane svg.tv__map"]), 0);
  }
  log("groups all on", await setKinds({ bodies: true, assemblies: true, parts: true }));
  log("errors study", page.__errors);
  await page.close();
}
await browser.close();
server.close();
