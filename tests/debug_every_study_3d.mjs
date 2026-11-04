// Hand-run inspection probe for handoff every_study_opens_in_3d_showing_only_
// its_parts (2026-11-03). NOT a tier -- pytest never collects it.
//
//   node tests/debug_every_study_3d.mjs --repo C:/workspace/tolstack
//   node tests/debug_every_study_3d.mjs --repo C:/workspace/tolstack --shots docs/sessions/lessons
//
// For each study kind it clicks the row's 3D control on the REAL projection and
// reads the scene back through the pane's own read-only `scene-view` verb:
// which parts are solid, which ghost, which hidden. `--repo` is the worktree
// escape hatch: /data/... is served from there, every app file from this tree.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const TREE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const DATA_REPO = resolve(flag("--repo") || TREE);
const SHOTS = flag("--shots") ? resolve(TREE, flag("--shots")) : null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const PREFIX = "LESSONS_20261103_every_study_opens_in_3d_showing_only_its_parts";
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

// The scene, as the pane reports it, once it has stopped changing.
async function sceneNow(page, settleMs = 1500, maxMs = 60000) {
  const started = Date.now();
  let last = "", stable = 0, view = [];
  while (Date.now() - started < maxMs) {
    const f = frameOf(page);
    try {
      view = f ? await f.evaluate(() => window.AnnotateApp && window.AnnotateApp.exec(["scene-view"])) : [];
    } catch { view = []; }
    if (!Array.isArray(view)) view = [];
    const key = JSON.stringify(view);
    stable = key === last && view.length ? stable + 1 : 0;
    last = key;
    if (stable >= Math.ceil(settleMs / 500)) break;
    await page.waitForTimeout(500);
  }
  const names = (rows) => rows.map((r) => r.part || r.sha256.slice(0, 8)).sort();
  return {
    open: view.length,
    solid: names(view.filter((r) => r.visible && !r.ghost)),
    ghost: names(view.filter((r) => r.visible && r.ghost)),
    hidden: names(view.filter((r) => !r.visible)),
    title: await page.locator("#flyout-title").textContent().catch(() => null),
  };
}

async function press3D(page, kind, id) {
  const row = page.locator(`[data-nav-kind="${kind}"]${id ? `[data-nav-id="${id}"]` : ""}`).first();
  await row.hover();
  const btn = row.locator("[data-nav-3d]");
  const has = (await btn.count()) === 1;
  if (has) await btn.click();
  return has;
}

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 30000 });
  const kinId = await page.locator('[data-nav-kind="kinematic"]').first().getAttribute("data-nav-id").catch(() => null);
  const cases = [
    ["chain study with bound faces", "study", "pitch_link_cotter_hole_clearance"],
    ["kinematic study", "kinematic", kinId],
    ["chain study, none bound", "study", "rotor_fastener_grip_u2h"],
    ["topology row", "topology", null],
    ["switch back to the kinematic study, pane already open", "kinematic", kinId],
    ["switch to the cotter-hole study, pane already open", "study", "pitch_link_cotter_hole_clearance"],
  ];
  let n = 0;
  for (const [label, kind, id] of cases) {
    const has = await press3D(page, kind, id);
    if (!has) { console.log(JSON.stringify({ label, control: false })); continue; }
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
    const scene = await sceneNow(page);
    console.log(JSON.stringify({ label, control: true, open: scene.open, solid: scene.solid, ghost: scene.ghost.length, hidden: scene.hidden.length, title: scene.title }));
    n += 1;
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${PREFIX}_${n}_${label.replace(/\W+/g, "_")}.png`) });
  }
  // The hide word reaches the ghosts, and a scope with no mesh says so.
  const run = (cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);
  await run(["model", "unlit", "hide"]);
  const hid = await sceneNow(page, 1000);
  console.log(JSON.stringify({ label: "unlit = hide", solid: hid.solid.length, ghost: hid.ghost.length, hidden: hid.hidden.length }));
  await run(["model", "unlit", "dim"]);
  await run(["isolate", "parts", "no_such_part_anywhere"]);
  await page.waitForTimeout(1500);
  console.log(JSON.stringify({ label: "no mesh for the study's parts", title: await page.locator("#flyout-title").textContent() }));
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${PREFIX}_7_no_3d_model.png`) });
} finally {
  await browser.close();
  server.close();
}
