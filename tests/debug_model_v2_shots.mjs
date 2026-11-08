// Hand-run inspection probe for handoff model_v2_is_the_end_stop_linkage_in_
// five_bodies_and_the_nav_switches_models (2026-11-08). NOT a tier -- pytest
// never collects it.
//
//   node tests/debug_model_v2_shots.mjs --phase before --shots <dir>
//   node tests/debug_model_v2_shots.mjs --phase after  --shots <dir> [--projections <data-root>/projections]
//
// Serves THIS tree's apps/ with data/ from the main checkout, except that
// any file under `--projections <dir>` stands in for the same path under
// data/projections/ (projections built from this tree into a scratch data
// root -- data/scratch/ -- so the main checkout's own are not overwritten from
// a branch). `before` pins the v1 DAG; `after` takes what
// the lesson shows: the nav with both models, the v2 DAG at 1600 and 2560
// wide, v1 again (to diff against `before`), and the 3D pane on v2 at rest
// and mid-sweep, printing what the scene draws and where.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const TREE = resolve(flag("--tree") || HERE);
const DATA_REPO = resolve(flag("--repo") || "C:/workspace/tolstack");
const PROJECTIONS = flag("--projections") ? resolve(flag("--projections")) : null;
const PHASE = flag("--phase") || "after";
// `--dump-v1 <file>`: also write v1's drawn rails and grid, as markup, so a
// before/after pair can be diffed without the banner shifting pixels.
const DUMP_V1 = flag("--dump-v1") ? resolve(flag("--dump-v1")) : null;
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/model_v2");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V1 = "vpa_pitch_linkage";
const V2 = "vpa_end_stop_v2";
//: The parts the mechanism shot frames: every v2 part but the blade, whose
//: span would shrink the rest to a few pixels.
const MECHANISM = ["hub", "tan_link_mount_215175_002", "gas_spring_mount_213668_002",
  "pitch_arm", "pitch_plate_215177_001", "gas_spring_piston_214700_002", "pitch_link",
  "tan_link_212956_005", "piston_cover_214958_002"];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    let full = join(rel.startsWith("data/") ? DATA_REPO : TREE, rel);
    const projections = "data/projections/";
    if (PROJECTIONS && rel.startsWith(projections)) {
      const candidate = join(PROJECTIONS, rel.slice(projections.length));
      if (existsSync(candidate)) full = candidate;
    }
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

async function settle(page, ms = 900) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 });
  await page.waitForTimeout(ms);
}

async function open(width, query) {
  const page = await browser.newPage({ viewport: { width, height: 1100 } });
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
  page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html${query}`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="topology"]', { timeout: 30000 });
  await settle(page);
  return page;
}

// What the 3D scene has open and visible, once it stops changing.
async function sceneNow(page, settleMs = 1500, maxMs = 90000) {
  const started = Date.now();
  let last = "", stable = 0, view = [];
  while (Date.now() - started < maxMs) {
    try { view = await run(page, ["scene-view"]); } catch { view = []; }
    if (!Array.isArray(view)) view = [];
    const key = JSON.stringify(view);
    stable = key === last && view.length ? stable + 1 : 0;
    last = key;
    if (stable >= Math.ceil(settleMs / 500)) break;
    await page.waitForTimeout(500);
  }
  return view;
}

// How many matrices the scene draws each open mesh at, by part.
const drawCounts = (page) => frameOf(page).evaluate(() => {
  const scene = window.__scene;
  const out = {};
  for (const sha of scene.listOpenParts()) {
    const info = window.AnnotateApp.exec(["scene-view"]).find((r) => r.sha256 === sha) || {};
    const mesh = scene.parts.get(sha);
    const n = mesh && mesh.isInstancedMesh ? mesh.count
      : (mesh && mesh.userData && mesh.userData.override ? mesh.userData.override.length
        : (mesh && mesh.userData && mesh.userData.rest ? mesh.userData.rest.length : 1));
    out[(info.part || sha.slice(0, 8)) + (info.visible ? "" : " (hidden)")] = n;
  }
  return out;
});


async function dumpV1(page) {
  if (!DUMP_V1) return;
  const markup = await page.evaluate(() => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live && live.querySelector("svg.tv__rails");
    const rows = Array.from(document.querySelectorAll("tr.tvrow")).map((r) => r.textContent.trim());
    const nl = String.fromCharCode(10);
    return (svg ? svg.outerHTML : "NO SVG") + nl + rows.join(nl);
  });
  writeFileSync(DUMP_V1, markup, "utf-8");
}

try {
  if (PHASE === "before") {
    const page = await open(1600, `?topology=${V1}`);
    await page.screenshot({ path: join(SHOTS, "before_v1_dag_1600.png") });
    await dumpV1(page);
    await page.close();
  } else {
    const nav = await open(1600, "");
    const navIds = await nav.evaluate(() => Array.from(document.querySelectorAll('[data-nav-kind="topology"]')).map((r) => r.getAttribute("data-nav-id")));
    console.log(JSON.stringify({ list: "nav models, in order", navIds,
      opened: await nav.evaluate(() => window.ViewerApp.lastTopoRender && window.ViewerApp.lastTopoRender.topologyId) }));
    await nav.screenshot({ path: join(SHOTS, "1_nav_and_v2_dag_1600.png") });
    await nav.close();
    for (const width of [1600, 2560]) {
      const page = await open(width, `?topology=${V2}`);
      await page.screenshot({ path: join(SHOTS, `2_v2_dag_${width}.png`) });
      await page.screenshot({ path: join(SHOTS, `2_v2_dag_${width}_full.png`), fullPage: true });
      await page.close();
    }
    const v1 = await open(1600, `?topology=${V1}`);
    await v1.screenshot({ path: join(SHOTS, "3_v1_dag_1600_after.png") });
    await dumpV1(v1);
    await v1.close();

    const page = await open(1700, `?topology=${V2}`);
    const row = page.locator(`[data-nav-kind="topology"][data-nav-id="${V2}"]`).first();
    await row.hover();
    await row.locator("[data-nav-3d]").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
    const rest = await sceneNow(page);
    console.log(JSON.stringify({ list: "3D at rest: visible parts", parts: rest.filter((r) => r.visible).map((r) => r.part || r.sha256.slice(0, 8)).sort() }));
    console.log(JSON.stringify({ list: "3D at rest: draw count per open mesh", counts: await drawCounts(page) }));
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(SHOTS, "4_v2_3d_at_rest.png") });
    // The pane frames every drawn part, the blade's whole span among them;
    // the mechanism, framed on its own, is what can be checked by eye.
    await run(page, ["camera", "frame", ...MECHANISM]).catch((e) => console.log("FRAME", e.message));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(SHOTS, "4b_v2_3d_at_rest_mechanism.png") });

    const sw = await run(page, ["sweep", "latest"]).catch((e) => "ERR " + e.message);
    console.log(JSON.stringify({ sweep: String(JSON.stringify(sw)).slice(0, 300) }));
    await page.waitForFunction(() => {
      const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
      return f && f.__sweep.bodies && f.__sweep.bodies.length;
    }, null, { timeout: 180000 });
    await page.waitForTimeout(5000);
    const info = await frameOf(page).evaluate(() => ({
      topology: window.__sweep.artifact.topologyId,
      bodies: window.__sweep.bodies.map((r) => [r.subject, r.part, r.state, (r.placements || []).map((p) => p.key.split("/").slice(-2).join("/"))]),
    }));
    console.log(JSON.stringify({ list: "sweep anchors (subject, part, state, keys)", ...info }));
    const mid = await frameOf(page).evaluate(() => Math.floor(window.__sweep.artifact.points.length / 2));
    await run(page, ["seek", "#" + mid]);
    await run(page, ["camera", "frame", ...MECHANISM]).catch((e) => console.log("FRAME", e.message));
    await page.waitForTimeout(2500);
    console.log(JSON.stringify({ list: "mid-sweep: draw count per open mesh", counts: await drawCounts(page) }));
    await page.screenshot({ path: join(SHOTS, "5_v2_3d_mid_sweep.png") });
    await run(page, ["seek", "#0"]);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(SHOTS, "6_v2_3d_low_stop.png") });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
