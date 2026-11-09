// Hand-run inspection probe for handoff a_folded_part_rides_its_own_body_in_
// the_sweep_and_the_bodies_list (2026-11-09). NOT a tier -- pytest never
// collects it.
//
//   node tests/debug_folded_parts_ride.mjs --phase before|after [--tree <apps root>] [--shots <dir>] [--repo <data root>]
//
// Serves THIS tree's apps/ with data/ from the main checkout. For each model
// (v2, then v1) it opens the 3D pane at 1920x1200, plays the P2 run, prints
// the sweep's anchor rows and the rail's Bodies list, and -- on v2 -- shoots
// the mechanism at the low stop, mid-sweep and the feather stop, with each
// piston head's drawn matrix printed beside the piston's, so "do the heads
// move with the plate" is a number as well as a picture.
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
// `--tree <dir>`: serve apps/ from another tree (a `git archive` of the
// baseline, for the before shots) -- shots still land in this one.
const TREE = resolve(flag("--tree") || HERE);
const PHASE = flag("--phase") || "after";
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_folded_part_rides_its_own_body_in_the_sweep_and_the_bodies_list");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const RUN = "vpa-pitch-p2-20261105-204957";
const MODELS = ["vpa_end_stop_v2", "vpa_pitch_linkage"];
const HEADS = ["piston_head_lower_214699_002", "piston_head_upper_214698_002"];
//: The close-up: what has to be seen moving together, and what is in its way.
const CLOSE = ["pitch_plate_215177_001", "gas_spring_piston_214700_002", "piston_cover_214958_002", ...HEADS];
const HIDE = ["hub", "blade_root", "pitch_arm"];
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

// Where each named part number is drawn (its first drawn matrix's
// translation), read off the scene by the mesh's own part id
// (`asm217755_214699_002` carries 214699-002).
const NUMBERS = { lower_head: "214699_002", upper_head: "214698_002", piston: "214700_002",
  cover: "214958_002" };
const where = (page) => frameOf(page).evaluate((numbers) => {
  const out = {};
  for (const r of window.AnnotateApp.exec(["scene-view"])) {
    for (const [name, n] of Object.entries(numbers)) {
      if (!r.part || !r.part.endsWith(n)) continue;
      const d = window.__scene.drawnPlacements(r.sha256)[0];
      out[name] = d ? [d[12], d[13], d[14]].map((v) => +v.toFixed(2)) : null;
    }
  }
  return out;
}, NUMBERS);

try {
  for (const model of MODELS) {
    const tag = model === MODELS[0] ? "v2" : "v1";
    const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });
    page.on("pageerror", (e) => console.log("PAGEERR", e.message.slice(0, 300)));
    await page.goto(`${url}/apps/viewer/topology.html?topology=${model}`, { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="topology"]', { timeout: 30000 });
    const row = page.locator(`[data-nav-kind="topology"][data-nav-id="${model}"]`).first();
    await row.hover();
    await row.locator("[data-nav-3d]").click();
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
    const info = await frameOf(page).evaluate(() => ({
      rows: window.__sweep.bodies.map((r) => [r.subject, r.part, r.state, (r.placements || []).length]),
      rail: Array.from(document.querySelectorAll('#sweep-tree [data-group="bodies"] [data-body]')).map((n) => ({
        head: n.querySelector(".an__tree-text").textContent,
        parts: Array.from(n.querySelectorAll(".part-row__label")).map((l) => l.textContent),
      })),
      anchored: window.__sweep.anchored.length,
    }));
    console.log(JSON.stringify({ model, phase: PHASE, ...info }, null, 1));
    if (tag === "v2") {
      const n = await frameOf(page).evaluate(() => window.__sweep.artifact.points.length);
      const stops = [["low", 0], ["mid", Math.floor(n / 2)], ["feather", n - 1]];
      for (const [name, i] of stops) {
        await run(page, ["seek", "#" + i]);
        // The hub and the blade hide the piston; with them out, the plate,
        // the piston, both heads and the cover fill the pane.
        for (const part of HIDE) await run(page, ["hide", part]).catch((e) => console.log("HIDE", e.message));
        await run(page, ["camera", "frame", ...CLOSE]).catch((e) => console.log("FRAME", e.message));
        await page.waitForTimeout(2500);
        console.log(JSON.stringify({ stop: name, at: await where(page) }));
        await page.screenshot({ path: join(SHOTS, `${PHASE}_v2_sweep_${name}_1920.png`) });
      }
    } else {
      await page.screenshot({ path: join(SHOTS, `${PHASE}_v1_sweep_1920.png`) });
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
