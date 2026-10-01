// Real-browser check for the annotate app's SWEEP MODE, and the pass that
// produces its screenshot evidence (handoff kinematic_sweep_animation).
//
//   node apps/annotate/run_browser_check.mjs
//   node apps/annotate/run_browser_check.mjs --shots docs/sessions/lessons/assets
//
// WHY THIS EXISTS WHEN THIS APP'S README SAYS BROWSER AUTOMATION IS NOT RUN
// HERE. That rule (LESSONS_20260904_step_tessellation_spike.md) is about
// driving Jeff's own live browser session, which a headful run hijacks. This
// is the same infrastructure apps/viewer's TRUTH tier already uses and the
// same non-negotiables (forge CONVENTIONS.md §7): playwright-core only, the
// INSTALLED Chrome through `channel`, headless, over a CDP pipe. Nothing here
// touches a session a human is using.
//
// It runs against `?mock=1`, whose sweep run is a synthetic crank-slider
// solved in closed form in fixtures.js -- so this check needs no folder
// grant, no published artifact from the linkage repo, and no installed mesh
// store. What it cannot therefore prove is anything about the REAL run's
// geometry; that is what the screenshots against a published run are for, and
// the lesson says which claims rest on which.
//
// playwright-core lives in the MAIN checkout's node_modules (gitignored), so
// from a worktree this resolves it there -- the same worktree escape hatch
// every other real tier in this repo has.
import { createServer } from "node:http";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, extname, normalize, sep, resolve } from "node:path";

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, "..", ".."));
// normalize(): the path-escape guard below compares with `startsWith(root +
// sep)`, and a forward-slash root never prefixes a back-slash join on Windows
// -- which 403s every real-data read with no hint as to why.
const MAIN_CHECKOUT = normalize("C:/workspace/tolstack");
const CHANNELS = ["chrome", "msedge"];

async function loadPlaywright() {
  for (const root of [REPO, MAIN_CHECKOUT]) {
    const entry = join(root, "node_modules", "playwright-core", "index.js");
    if (!existsSync(entry)) continue;
    // playwright-core's entry is CommonJS, so an ESM `import()` of it puts
    // the whole module.exports on `.default` and detects no named exports --
    // `import { chromium }` from this file would be `undefined`, which fails
    // later and misleadingly at `chromium.launch`. The viewer's own tier does
    // not hit this because it imports the package by name and resolves the
    // package's ESM wrapper; this one resolves a path, because from a
    // worktree the package only exists in the main checkout.
    const mod = await import(pathToFileURL(entry).href);
    return mod.chromium ? mod : mod.default;
  }
  throw new Error(
    "playwright-core is not installed in this tree or in the main checkout — " +
    "this tier cannot run here, which is a skip and not a pass");
}

// The apps/ directory is the server root, not apps/annotate: index.html loads
// ../viewer/storage/adapter.js, ../viewer/warning_icon.js and
// ../viewer/vocab.gen.js as siblings, and a server rooted one level deeper
// 403s all three (storage/adapter.js's own error message says so).
const APPS_DIR = join(REPO, "apps");
// ...and `/data/` from wherever the installed meshes and the published sweep
// runs actually are. `data/` is gitignored and shared by every worktree (repo
// CLAUDE.md), so from a worktree that is the main checkout.
const DATA_ROOTS = [REPO, MAIN_CHECKOUT];
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
};

// What FsaAdapter.listMeshes() builds by enumerating data/meshes/ -- the one
// thing a plain static server cannot answer.
async function meshIndex() {
  // EVERY root, first match per sha256 -- not the first root that merely has
  // the directory. A worktree has an empty `data/meshes/` of its own (data/
  // is gitignored and shared, repo CLAUDE.md), so "the first root that has
  // the folder" answered with nothing and every part read as having no
  // installed mesh.
  const out = [];
  const seen = {};
  for (const root of DATA_ROOTS) {
    const dir = join(root, "data", "meshes");
    if (!existsSync(dir)) continue;
    for (const name of await readdir(dir)) {
      if (seen[name]) continue;
      const where = join(dir, name, "provenance.json");
      if (!existsSync(where)) continue;
      seen[name] = true;
      const provenance = JSON.parse(await readFile(where, "utf8"));
      out.push({ sha256: name, label: provenance.label, part_id: provenance.part_id });
    }
  }
  return out;
}

function startServer() {
  return new Promise((ok) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        // The browser asks for this on its own and nothing here serves one;
        // a 404 for it would otherwise be the single entry in the "no
        // uncaught error" check and send a reader chasing the app.
        if (urlPath === "/favicon.ico") { res.writeHead(204).end(); return; }
        // Two endpoints the real-data harness needs and no transport has:
        // the mesh LIST (FSA enumerates a directory; HTTP cannot) and this
        // tree's alias table, which is tracked and therefore in the worktree
        // rather than under data/.
        if (urlPath === "/data/meshes/index.json" || urlPath === "/data/__aliases.json") {
          const body = JSON.stringify(urlPath.endsWith("__aliases.json")
            ? JSON.parse(await readFile(join(REPO, "docs", "topologies", "part_mesh_aliases.json"), "utf8"))
            : await meshIndex());
          res.writeHead(200, { "content-type": "application/json" }).end(body);
          return;
        }
        const rel = normalize(urlPath).replace(/^[/\\]+/, "");
        let root = APPS_DIR;
        let full = join(APPS_DIR, rel);
        if (rel.split(sep)[0] === "data") {
          root = DATA_ROOTS.filter((r) => existsSync(join(r, rel)))[0] || DATA_ROOTS[0];
          full = join(root, rel);
        }
        if (full !== root && !full.startsWith(root + sep)) {
          res.writeHead(403).end("forbidden");
          return;
        }
        const body = await readFile(full);
        res.writeHead(200, {
          "content-type": MIME[extname(full)] || "application/octet-stream",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => ok(server));
  });
}

let failed = 0;
let passed = 0;
function check(name, condition, detail) {
  if (condition) { passed++; console.log(`PASS  ${name}`); return true; }
  failed++;
  console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  return false;
}

const shotsFlag = process.argv.indexOf("--shots");
const SHOTS = shotsFlag === -1 ? null : resolve(process.argv[shotsFlag + 1]);
// `--real <run-id>` runs the same page against a PUBLISHED sweep run and the
// real installed meshes instead of the synthetic fixture. See realPass below
// for what that costs and why it is a separate pass.
const realFlag = process.argv.indexOf("--real");
const REAL_RUN = realFlag === -1 ? null : process.argv[realFlag + 1];

async function main() {
  const { chromium } = await loadPlaywright();
  const server = await startServer();
  const base = `http://127.0.0.1:${server.address().port}/annotate/index.html`;

  let browser = null;
  const failures = [];
  for (const channel of CHANNELS) {
    try {
      browser = await chromium.launch({
        channel, headless: true,
        // WebGL in headless Chrome needs SwiftShader; without this the scene
        // constructor throws and every check below fails for the wrong reason.
        args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
      });
      break;
    } catch (err) { failures.push(`${channel}: ${String(err && err.message || err)}`); }
  }
  if (!browser) {
    console.log("SKIP  no browser channel launched:\n  " + failures.join("\n  "));
    server.close();
    process.exit(0);
  }

  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(String(err && err.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  // A 404 is a console error with no URL in its text, which is unchaseable --
  // record what was actually asked for.
  page.on("requestfailed", (req) =>
    consoleErrors.push(`request failed: ${req.url()}`));
  // ...and ignore the browser's OWN favicon probe, which no page here asks
  // for and no server here serves.
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().endsWith("/favicon.ico")) {
      consoleErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto(`${base}?mock=1&sweep=synthetic-demo-sweep`);
  await page.waitForFunction(() => window.__sweep && window.__sweep.frame, null,
    { timeout: 20000 });

  check("the page booted into sweep mode with no uncaught error",
    consoleErrors.length === 0, consoleErrors.join("\n      "));

  const summary = (await page.locator(".an__sweep-summary").textContent()) || "";
  check("the bar names the run, its point count and WHERE THE GEOMETRY CAME FROM",
    summary.includes("synthetic-demo-sweep") && summary.includes("80 points") &&
    summary.includes("motion sheet"), summary);
  check("the bar says how many points the solver did not settle",
    summary.includes("1 did not converge"), summary);
  // The token itself is never a FIELD of the line -- "geometry from the
  // motion sheet" is the field, and the bare word would be the drift.
  check("the raw source token is not a field of the summary line",
    !summary.split(" · ").includes("sheet"), summary);

  check("the transport, the scrubber, the speed and the loop are one line",
    (await page.locator(".an__sweep-controls .an__sweep-btn").count()) === 3 &&
    (await page.locator(".an__sweep-range").count()) === 1 &&
    (await page.locator(".an__sweep-select").count()) === 2);

  // The readouts, as rendered -- the four numbers that are the verification.
  const readoutText = await page.locator(".an__sweep-readouts").innerText();
  for (const want of ["blade pitch (solved)", "blade pitch (reference)",
    "blade pitch difference", "actuator travel", "pitch link length", "residual norm"]) {
    check(`the readouts render "${want}"`, readoutText.includes(want), readoutText);
  }
  check("no readout label renders an underscore at the reader",
    !readoutText.split("\n").some((line) => /\w_\w/.test(line)), readoutText);

  // THE LINK LENGTH HOLDS. The whole point of the surface: scrub the sweep
  // end to end and the two-force member's measured |A - B| never moves off
  // the length it is supposed to hold.
  const lengths = await page.evaluate(() => {
    const out = [];
    const sweep = window.__sweep;
    for (let i = 0; i < sweep.artifact.points.length; i++) {
      const frame = window.AnnotateApp.sweepFrameAt(sweep.artifact, i);
      const row = window.AnnotateApp.sweepReadouts(sweep.artifact, frame)
        .filter((r) => r.key === "link:pitch_link")[0];
      out.push([row.value, row.expected]);
    }
    return out;
  });
  const worstLength = Math.max(...lengths.map(([v, e]) => Math.abs(v - e)));
  check("the two-force member holds its length across the whole sweep",
    worstLength < 1e-9, `worst |A-B| - length = ${worstLength}`);

  // The frame rule, both ways, through a real scrub.
  await page.evaluate(() => window.AnnotateApp.exec(["seek", "#79"]));
  check("at the as-modelled point, picking is on and the bar says nothing about it",
    (await page.locator(".an__sweep-gate").innerText()).trim() === "");
  await page.evaluate(() => window.AnnotateApp.exec(["seek", "#0"]));
  const gate = (await page.locator(".an__sweep-gate").innerText()).trim();
  check("away from it, picking is off and the bar says why",
    gate.length > 0 && gate.includes("as-modelled"), gate);

  // Playback, through the real clock.
  const before = await page.evaluate(() => window.__sweep.index);
  await page.evaluate(() => window.AnnotateApp.exec(["play"]));
  await page.waitForTimeout(600);
  const during = await page.evaluate(() => window.__sweep.index);
  await page.evaluate(() => window.AnnotateApp.exec(["pause"]));
  check("pressing play actually moves the sweep", during > before,
    `${before} -> ${during}`);
  const afterPause = await page.evaluate(() => window.__sweep.index);
  await page.waitForTimeout(300);
  check("pausing stops it",
    (await page.evaluate(() => window.__sweep.index)) === afterPause);

  // Ping-pong turns round at the end rather than stopping there.
  await page.evaluate(() => window.AnnotateApp.exec(["seek", "#78"]));
  await page.evaluate(() => window.AnnotateApp.exec(["play"]));
  await page.waitForTimeout(1200);
  const bounced = await page.evaluate(() => ({
    direction: window.__sweep.direction, playing: window.__sweep.playing,
    fps: window.__sweep.fps,
  }));
  await page.evaluate(() => window.AnnotateApp.exec(["pause"]));
  check("out-and-back turns round at the end instead of stopping",
    bounced.direction === -1 && bounced.playing === true, JSON.stringify(bounced));
  console.log(`      playback frame rate, mock scene: ${bounced.fps.toFixed(1)} fps`);

  // Phase 2: the one body with an installed mesh resolved to an occurrence by
  // geometry, and the three without say so honestly.
  const bodies = await page.evaluate(() => window.__sweep.bodies);
  const anchored = bodies.filter((b) => b.state === "matched");
  check("the body with an installed model was placed at an occurrence chosen by geometry",
    anchored.length === 1 && anchored[0].placements.length === 1 &&
    anchored[0].placements[0].instance_name === "demo-triangle.1" &&
    anchored[0].placements[0].residual < 1e-6 &&
    // ...and the DISTRACTOR occurrence, 200 mm away, was in the running and lost.
    anchored[0].candidates === 2, JSON.stringify(bodies));
  check("the bodies with no installed model say exactly that, and the stick figure still draws",
    bodies.filter((b) => b.state === "no-mesh").length === 3, JSON.stringify(bodies));
  await page.locator(".an__sweep-bodies > summary").click();
  const bodiesText = await page.locator(".an__sweep-bodies").innerText();
  check("the bar's disclosure names the occurrence and the residual",
    bodiesText.includes("demo-triangle.1") && bodiesText.includes("mm from the solved joint"),
    bodiesText);

  // An unconverged point is marked under the bar and recoloured on it.
  check("the scrubber marks the point the solver did not settle",
    (await page.locator(".an__sweep-mark").count()) === 1);
  await page.evaluate(() => window.AnnotateApp.exec(["seek", "#40"]));
  check("scrubbing onto it turns the value at the handle to the warning colour",
    (await page.locator(".an__sweep-chip--warn").count()) === 1);

  // The layers, and the help, are the mode's own.
  await page.evaluate(() => window.AnnotateApp.exec(["help", "on"]));
  const helpText = await page.locator("#hint-panel").innerText();
  check("the help in sweep mode is about sweep mode, not about binding",
    helpText.includes("solver") && !helpText.includes("Click a face"), helpText);
  // The four layers the `layer` verb parses, plus the app's own see-through
  // setting, which sweep mode honours rather than answering twice.
  const boxes = await page.locator("#hint-panel label").allInnerTexts();
  const layerLabels = await page.evaluate(() => window.AnnotateApp.SWEEP_LAYERS.length);
  check("the Display panel offers exactly the layers the verb parses, plus " +
    "the see-through setting and nothing else",
    boxes.length === layerLabels + 1 &&
    boxes.some((t) => t.indexOf("See-through") !== -1), JSON.stringify(boxes));
  await page.evaluate(() => window.AnnotateApp.exec(["help", "off"]));

  // Leaving restores the scene: no sweep state, and the parts sweep mode
  // opened are closed again.
  await page.evaluate(() => window.AnnotateApp.exec(["sweep", "off"]));
  const left = await page.evaluate(() => ({
    sweep: window.__sweep, open: window.__scene.listOpenParts().length,
    inSweep: window.__scene.inSweep(),
  }));
  check("leaving sweep mode restores the scene", left.sweep === null &&
    left.open === 0 && left.inSweep === false, JSON.stringify(left));
  const backToBind = await page.locator("#detail").innerText();
  check("...and the bind instruction is back",
    backToBind.includes("Pick an element on the left"), backToBind);

  check("nothing above produced an uncaught error", consoleErrors.length === 0,
    consoleErrors.join("\n      "));

  if (SHOTS) await captureShots(page, `${base}?mock=1&sweep=synthetic-demo-sweep`, "mock");
  if (REAL_RUN) await realPass(browser, base);

  await browser.close();
  server.close();
  console.log(`\n${passed}/${passed + failed} passed`);
  process.exit(failed ? 1 : 0);
}

// The screenshot evidence: the sweep at four points.
//
// ONE THEME, and that is a decision rather than an omission:
// docs/DESIGN_TYPE_AND_COLOUR.md's "One theme" records that both apps render
// dark only and that no theme mechanism exists in either of them -- no
// `prefers-color-scheme` query, no `data-theme` attribute. Shooting the same
// page twice under two emulated schemes produced two byte-identical files,
// which is evidence of nothing. Whether a light theme is wanted is filed:
// ISSUE_20260917_both_apps_render_one_theme_and_no_mechanism_exists_for_a_second.
async function captureShots(page, url, tag) {
  await mkdir(SHOTS, { recursive: true });
  const wanted = [-7, 17, 41, 72];
  const notes = [];
  const label = tag || "mock";
  for (const scheme of ["dark"]) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(url.indexOf("?") === -1 ? `${url}?mock=1&sweep=synthetic-demo-sweep` : url);
    await page.waitForFunction(() => window.__sweep && window.__sweep.frame, null,
      { timeout: 60000 });
    if (tag === "real") {
      await page.waitForFunction(() => window.__sweep && window.__sweep.bodies.length > 0,
        null, { timeout: 180000 });
    }
    for (const degrees of wanted) {
      // Seek by the measure a reader thinks in, not by index: find the point
      // whose blade pitch is nearest the one asked for.
      const index = await page.evaluate((target) => {
        const points = window.__sweep.artifact.points;
        let best = 0;
        for (let i = 0; i < points.length; i++) {
          if (Math.abs(points[i].measures.blade_pitch - target) <
              Math.abs(points[best].measures.blade_pitch - target)) best = i;
        }
        return best;
      }, degrees);
      await page.evaluate((i) => window.AnnotateApp.exec(["seek", "#" + i]), index);
      // WAIT FOR A RENDERED FRAME, not for a wall-clock guess. The bar loses
      // a line at the as-modelled pose (the picking-disabled note goes away),
      // which grows the canvas, which resizes the drawing buffer -- and a
      // resized buffer is blank until the next render. On a GPU that is one
      // 16 ms frame and invisible; headless here it is software
      // rasterisation of 1.4 million triangles at about 4 fps, and the
      // 72-degree screenshot came out empty with a perfectly correct scene
      // behind it. SWEEP_PROBE=1 dumps the state that showed that.
      await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      });
      await page.waitForTimeout(350);
      if (process.env.SWEEP_PROBE) {
        console.log("      probe " + degrees + "deg " + JSON.stringify(await page.evaluate(() => {
          const s = window.__scene;
          const parts = s.listOpenParts().map((sha) => {
            const mesh = s.parts.get(sha);
            return [sha.slice(0, 6), mesh.visible, mesh.matrixAutoUpdate,
              Math.round(mesh.matrix.elements[12]), Math.round(mesh.matrix.elements[13]),
              Math.round(mesh.matrix.elements[14])];
          });
          const beads = [];
          for (const [n, b] of s._sweep.joints) beads.push([n, b.visible, b.position.toArray().map((x) => Math.round(x))]);
          return { i: Math.round(window.__sweep.index), parts, beads,
            cam: s.camera.position.toArray().map((x) => Math.round(x)),
            target: s.controls.target.toArray().map((x) => Math.round(x)),
            size: [s.renderer.domElement.width, s.renderer.domElement.height] };
        })));
      }
      const name = `sweep_${label}_${scheme}_${String(degrees).replace("-", "minus")}deg.png`;
      await page.screenshot({ path: join(SHOTS, name) });
      notes.push(`${name}  point ${index}`);
    }
  }
  await writeFile(join(SHOTS, `sweep_screenshots_${label}.txt`),
    "Captured by apps/annotate/run_browser_check.mjs --shots, against ?mock=1's\n" +
    "SYNTHETIC crank-slider run (fixtures.js). Not a measurement of anything.\n" +
    "Dark only: both apps render one theme by decision, and no mechanism for a\n" +
    "second exists (docs/DESIGN_TYPE_AND_COLOUR.md, \"One theme\").\n\n" +
    notes.join("\n") + "\n", "utf8");
  console.log(`      ${notes.length} screenshots written to ${SHOTS}`);
}

// --- the real pass ---------------------------------------------------------
//
// The same page, against a PUBLISHED `linkage-sweep/v1` run and the real
// installed mesh store. Everything above runs on the synthetic fixture
// because that needs no data at all; this needs both, and both live only in
// the main checkout, so it is a flag rather than part of the default run.
//
// HOW IT REACHES THE DATA, and the honest limit of that. This app has no HTTP
// read transport of its own (ISSUE_20260910_annotate_has_no_http_read_
// transport) -- its real transport is File System Access, which cannot be
// granted from a script because the picker needs a user gesture. So this pass
// boots `?mock=1` and replaces the in-memory adapter's READ methods with ones
// that fetch the same paths over the test server. That is a harness, not a
// transport: it exercises sweep mode's resolution and rendering against real
// geometry, and it proves nothing whatever about FSA.
async function realPass(browser, base) {
  console.log(`\n--- [real] ${REAL_RUN}`);
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err && err.message || err)));
  page.on("response", (res) => {
    if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
  });

  await page.addInitScript(() => {
    // Runs before the app's own scripts: wrap the in-memory adapter so every
    // read goes to the server instead of to AA.FIXTURES.
    const base = "/data";
    const json = (path) => fetch(base + path).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    window.__realMeshes = null;
    const install = () => {
      const AA = window.AnnotateApp;
      if (!AA || !AA.MemoryAdapter) return false;
      const P = AA.MemoryAdapter.prototype;
      P.listSweepRuns = async () => [{ runId: window.__realRun }];
      P.readSweepRun = async (runId) => json(`/inbox/linkage-sweeps/${runId}.json`);
      P.listMeshes = async () => {
        if (!window.__realMeshes) window.__realMeshes = await json("/meshes/index.json");
        return window.__realMeshes;
      };
      P.readMeshProvenance = async (sha) => json(`/meshes/${sha}/provenance.json`);
      P.readMeshManifest = async (sha) => json(`/meshes/${sha}/manifest.json`);
      P.readMeshBuffer = async (sha, name) =>
        fetch(`${base}/meshes/${sha}/${name}`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      P.readPartMeshAliases = async () => json("/__aliases.json");
      return true;
    };
    const timer = setInterval(() => { if (install()) clearInterval(timer); }, 1);
    document.addEventListener("DOMContentLoaded", () => { install(); clearInterval(timer); });
  });
  await page.addInitScript((runId) => { window.__realRun = runId; }, REAL_RUN);

  const started = Date.now();
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(`${base}?mock=1&sweep=${encodeURIComponent(REAL_RUN)}`);
  try {
    await page.waitForFunction(() => window.__sweep && window.__sweep.frame, null, { timeout: 60000 });
  } catch (err) {
    console.log("      banner: " + (await page.locator("#banner").innerText().catch(() => "?")));
    console.log("      errors: " + errors.join(" | "));
    throw err;
  }
  // The bodies resolve off the render path, so wait for that to settle too.
  await page.waitForFunction(() => window.__sweep && window.__sweep.bodies.length > 0,
    null, { timeout: 180000 });
  console.log(`      run read, geometry fitted and bodies resolved in ${((Date.now() - started) / 1000).toFixed(1)} s`);

  const summary = (await page.locator(".an__sweep-summary").textContent()) || "";
  check(`[real] the bar names ${REAL_RUN} and where its geometry came from`,
    summary.includes(REAL_RUN) && (summary.includes("motion sheet") || summary.includes("CAD")),
    summary);

  const bodies = await page.evaluate(() => window.__sweep.bodies.map((row) => Object.assign({}, row, {
    placements: (row.placements || []).map((p) => Object.assign({}, p,
      { label: window.AnnotateApp.sweepOccurrenceLabel(p.key, row.candidateKeys || []) })),
  })));
  for (const row of bodies) {
    const where = (row.placements || []).map(
      (p) => `${p.label}${p.residual == null ? "" : ` @${p.residual.toFixed(4)} mm`}`);
    console.log(`      ${row.subject} / ${row.part}: ${row.state}` +
      (where.length ? ` -> ${where.join(" + ")}` : "") +
      (row.reason ? ` (${row.reason})` : ""));
  }
  check("[real] every body with an installed mesh and a solved joint is placed",
    bodies.filter((b) => b.state === "matched" || b.state === "ground").length >= 4,
    JSON.stringify(bodies.map((b) => [b.part, b.state])));
  check("[real] no body was placed farther than a millimetre from its solved joint",
    bodies.filter((b) => b.state === "matched")
      .every((b) => b.placements.every((p) => p.residual <= 1.0)),
    JSON.stringify(bodies.filter((b) => b.state === "matched")
      .map((b) => [b.part, b.placements.map((p) => p.residual)])));

  // The verification numbers, across the whole real sweep.
  const spread = await page.evaluate(() => {
    const AA = window.AnnotateApp, sweep = window.__sweep;
    let worst = 0, length = null;
    for (let i = 0; i < sweep.artifact.points.length; i++) {
      const frame = AA.sweepFrameAt(sweep.artifact, i);
      for (const row of AA.sweepReadouts(sweep.artifact, frame)) {
        if (row.key.indexOf("link:") !== 0) continue;
        length = row.expected;
        worst = Math.max(worst, Math.abs(row.value - row.expected));
      }
    }
    const hinge = sweep.artifact.points.map((p) => p.joints.blade_hinge &&
      p.joints.blade_hinge.point_a_world).filter(Boolean);
    let hingeMoved = 0;
    for (const h of hinge) {
      hingeMoved = Math.max(hingeMoved, Math.hypot(h[0] - hinge[0][0], h[1] - hinge[0][1], h[2] - hinge[0][2]));
    }
    return { worst, length, hingeMoved,
      driver: [sweep.driverValues[0], sweep.driverValues[sweep.driverValues.length - 1]] };
  });
  console.log(`      pitch-link length ${spread.length}, worst |A-B| error ${spread.worst.toExponential(2)} mm; ` +
    `blade hinge moved ${spread.hingeMoved.toExponential(2)} mm; ` +
    `driver ${spread.driver[0].toFixed(3)} -> ${spread.driver[1].toFixed(3)} mm`);
  check("[real] the pitch link holds its length to display precision across the sweep",
    spread.worst < 5e-5, String(spread.worst));
  check("[real] the blade hinge point does not move", spread.hingeMoved === 0,
    String(spread.hingeMoved));

  // The frame rate WITH the real meshes loaded -- the measurement the lesson
  // is asked for, and the only place it can be taken.
  await page.evaluate(() => window.AnnotateApp.exec(["seek", "#0"]));
  await page.evaluate(() => window.AnnotateApp.exec(["loop", "pingpong"]));
  await page.evaluate(() => window.AnnotateApp.exec(["play"]));
  await page.waitForTimeout(4000);
  const playing = await page.evaluate(() => ({ fps: window.__sweep.fps, index: window.__sweep.index }));
  await page.evaluate(() => window.AnnotateApp.exec(["pause"]));
  const open = await page.evaluate(() => window.__scene.listOpenParts().length);
  // The frame rate is REPORTED, not asserted on: this runs headless on
  // SwiftShader, which rasterises in software, so the number here is a floor
  // and nothing like what the same scene does on a GPU. What IS asserted is
  // that playback advanced with the real geometry loaded -- that the clock,
  // the anchoring and the renderer survive 1.4 million triangles at all.
  console.log(`      playback with ${open} real meshes loaded: ${playing.fps.toFixed(1)} fps ` +
    `(headless software rasterisation -- a floor, not the figure a GPU gives)`);
  check("[real] playback advances with the real meshes loaded",
    playing.index > 0, JSON.stringify(playing));

  if (SHOTS) await captureShots(page, `${base}?mock=1&sweep=${encodeURIComponent(REAL_RUN)}`, "real");

  check("[real] nothing above produced an uncaught error", errors.length === 0,
    errors.join("\n      "));
  await page.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
