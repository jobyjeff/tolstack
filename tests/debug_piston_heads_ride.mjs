// Hand-run inspection probe for handoff the_piston_heads_and_cover_ride_with_
// their_bodies_in_the_kinematic_model (2026-11-05). NOT a tier -- pytest never
// collects it.
//
//   node tests/debug_piston_heads_ride.mjs --repo C:/workspace/tolstack
//   node tests/debug_piston_heads_ride.mjs --repo C:/workspace/tolstack --shots docs/sessions/lessons/shots/<slug>
//   node tests/debug_piston_heads_ride.mjs --repo C:/workspace/tolstack --tree C:/workspace/tolstack   (the BEFORE: another tree's apps)
//
// Opens the kinematic study's 3D pane on the REAL projection and prints the
// four lists the handoff names: what the 3D pane draws solid at rest, what the
// sweep anchors (`__sweep.bodies`, with its state), and where the three parts
// sit at the feather stop (the last point) and the low stop (the first),
// read from the scene's own matrices. `--shots` also takes the pictures.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const TREE = resolve(flag("--tree") || HERE);
const DATA_REPO = resolve(flag("--repo") || TREE);
const SHOTS = flag("--shots") ? resolve(HERE, flag("--shots")) : null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const WATCH = ["asm217755_214699_002", "asm217755_214698_002", "asm217755_214700_002", "machined_213668"];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : TREE, rel);
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

async function sceneNow(page, settleMs = 1500, maxMs = 60000) {
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
  const names = (rows) => rows.map((r) => r.part || r.sha256.slice(0, 8)).sort();
  return { open: view.length, view,
    solid: names(view.filter((r) => r.visible && !r.ghost)),
    ghost: names(view.filter((r) => r.visible && r.ghost)),
    hidden: names(view.filter((r) => !r.visible)) };
}

// Where the watched parts are, in the scene: the translation column of every
// matrix the scene holds for the mesh (one per drawn occurrence).
const placesOf = (page) => frameOf(page).evaluate((watch) => {
  const out = {};
  const scene = window.__scene;
  const xyz = (x) => {
    const a = Array.from(x.elements || x);
    const t = a.length === 16 ? [a[12], a[13], a[14]] : [a[3], a[7], a[11]];
    return t.map((v) => Math.round(v * 100) / 100);
  };
  for (const sha of scene.listOpenParts()) {
    const info = window.AnnotateApp.exec(["scene-view"]).find((r) => r.sha256 === sha);
    if (!info || watch.indexOf(info.part) === -1) continue;
    const row = window.__sweep.bodies.find((r) => r.sha256 === sha && r.state !== "carried");
    const mesh = scene.parts.get(sha);
    const m = mesh && mesh.userData.override;
    out[info.part] = { row: row ? row.state + "/" + row.subject : "no row",
      at: m ? m.map(xyz) : "rest (not moved)" };
  }
  return out;
}, WATCH);

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
  page.on("response", (r) => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url().slice(0, 160)); });
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 30000 });
  const kinId = await page.locator('[data-nav-kind="kinematic"]').first().getAttribute("data-nav-id");
  const row = page.locator(`[data-nav-kind="kinematic"][data-nav-id="${kinId}"]`).first();
  await row.hover();
  await row.locator("[data-nav-3d]").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
  const rest = await sceneNow(page);
  console.log(JSON.stringify({ list: "3D pane at rest, solid", solid: rest.solid, ghost: rest.ghost.length, hidden: rest.hidden.length }));
  console.log(JSON.stringify({ list: "watched parts at rest", view: rest.view.filter((r) => WATCH.indexOf(r.part) !== -1).map((r) => [r.part, r.visible, r.ghost]) }));
  if (SHOTS) await page.screenshot({ path: join(SHOTS, "1_pane_at_rest.png") });

  const sw = await run(page, ["sweep", flag("--run") || "latest", kinId]).catch((e) => "ERR " + e.message); console.log(JSON.stringify({ sweep: String(sw).slice(0, 300) }));
  await page.waitForFunction(() => window.__sweep && window.__sweep.bodies && window.__sweep.bodies.length, null, { timeout: 120000 });
  await page.waitForTimeout(4000);
  const bodies = await frameOf(page).evaluate(() => window.__sweep.bodies.map((r) =>
    [r.subject, r.part, r.state, (r.placements || []).length]));
  console.log(JSON.stringify({ list: "sweep anchors (subject, part, state, placements)", runId: await frameOf(page).evaluate(() => window.__sweep.artifact.runId), bodies }));
  const last = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length - 1);
  for (const [label, at] of [["feather stop (driver 0, last point)", last], ["low stop (first point)", 0]]) {
    await run(page, ["seek", "#" + at]);
    await page.waitForTimeout(1500);
    console.log(JSON.stringify({ list: label, places: await placesOf(page) }));
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${at === 0 ? "3_low_stop" : "2_feather_stop"}.png`) });
  }
} finally {
  await browser.close();
  server.close();
}
