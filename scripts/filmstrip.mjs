// A filmstrip: N screenshots of the viewer across one transition, composited
// into a single PNG a reader (human, or a model that reads images and not
// video) can scan left to right. Generalises the RESPINE_SHOTS capture of
// the_rearrange_animates_and_centres_the_active_study.
//
//   node scripts/filmstrip.mjs --help
//
// Takes the machine's one browser slot itself, like every runner here.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchBrowser, loadPlaywright, takeTheBrowserSlot } from "./browser_runner.mjs";
import { CLOCK } from "./virtual_clock.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const MAIN_CHECKOUT = normalize("C:/workspace/tolstack");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml",
};

const HELP = `filmstrip.mjs -- N screenshots across a transition, in one PNG

usage:
  node scripts/filmstrip.mjs --scenario <name|path.mjs> [options]

scenario   a built-in name, or the path of a module exporting a scenario:
             export default {
               setup(page, h) {},          // optional: boot + get to the start state
               trigger(page, h) {},        // the thing being filmed (not awaited past its click)
               probe(page, h) {}           // optional: returns JSON, sampled per frame
             };
           h = { REPO, DATA, VIEWER, base, navRow, click, bootKinematic, settled, pose }
built-ins  {BUILTINS}
options
  --frames N      frames to capture                     (default 8)
  --interval MS   gap between frames, ms OF PAGE TIME   (default 40)
  --real-time     film the page's own clock instead of stepping it
  --columns N     frames per row of the composite       (default 4)
  --width PX      composite width                       (default 1600)
  --viewport WxH  browser viewport                      (default 1600x1000)
  --out DIR       folder the PNG and the probe JSON go to (default data/scratch/filmstrips)
  --name NAME     file stem                             (default the scenario name)
  --repo DIR      checkout holding data/projections/    (default ${MAIN_CHECKOUT})
  --pose DEG      open the kinematic page at this pose: the measure there, as
                  the page's own ?pose= carries it (e.g. --pose 30)
  --help          this text

Time: a screenshot of the real page takes about a second, longer than the
transitions being filmed, so by default the page's clock (Date.now,
performance.now, requestAnimationFrame) is frozen right after the trigger and
stepped by --interval per frame: the frames are exactly that many ms of page
time apart, whatever the screenshots cost. the filmed part is virtual.

Writes <out>/<name>.png (the composite, each frame stamped with its measured
time) and <out>/<name>.json (the per-frame probe samples, if the scenario has
one). The apps served are always THIS tree's.`;

// --- the page ------------------------------------------------------------------

// A click that waits for no animation frame (the filmed clock is frozen).
const click = (page, selector) => page.evaluate((sel) => {
  const n = document.querySelector(sel);
  if (!n) throw new Error("click: nothing matches " + sel);
  n.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}, selector);

function navRow(kind, id) {
  return `[data-nav-kind="${kind}"][data-nav-id="${String(id).replace(/"/g, '\\"')}"]`;
}

function startServer(root, dataRoot) {
  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = normalize(urlPath).replace(/^[/\\]+/, "");
        const base = rel.split(sep)[0] === "data" ? dataRoot : root;
        const full = join(base, rel);
        if (full !== base && !full.startsWith(base + sep)) {
          res.writeHead(403).end("forbidden");
          return;
        }
        const body = await readFile(full);
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => done(server));
  });
}

async function readProjection(dataRoot, name) {
  try {
    return JSON.parse(await readFile(
      join(dataRoot, "data", "projections", "viewer", name), "utf8"));
  } catch {
    return null;
  }
}

// The kinematic page on the REAL projection, the way the browser tier boots it.
// `pose` (the measure, e.g. 30 for 30 deg) opens it posed there, through the
// page's own ?pose= (VA.POSE_PARAM).
async function bootKinematic(page, base, dataRoot, study, pose) {
  const [topologies, results, crops, kinematic] = await Promise.all(
    ["topologies.json", "results.json", "crops.json", "kinematic/kinematic_studies.json"]
      .map((n) => readProjection(dataRoot, n)));
  if (!topologies || !kinematic) {
    throw new Error(`no real projection under ${dataRoot} -- build it or pass --repo`);
  }
  const posed = pose === null || pose === undefined || pose === "" ? "" : `&pose=${pose}`;
  await page.goto(`${base}/apps/viewer/topology.html?kinematic=${study}${posed}`,
    { waitUntil: "load" });
  await page.evaluate(({ topologies, results, crops, kinematic }) => {
    const VA = window.ViewerApp;
    const Fake = function () {
      return new VA.MemoryAdapter({ startState: VA.STATE.READY, topologies,
        results, crops, kinematic, images: {}, texts: {} });
    };
    Fake.isSupported = () => true;
    VA.FsaAdapter = Fake;
    VA.bootTopology();
  }, { topologies, results, crops, kinematic });
  await page.waitForSelector("div.kmverdict", { timeout: 15000 });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 15000 });
  await settled(page);
}

// No transition in flight, and the page has had a beat to land.
async function settled(page, ms = 500) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 15000 });
  await page.waitForTimeout(ms);
}

// --- the built-in scenarios ------------------------------------------------------

const STOPS = "vpa_pitch_linkage_blade_pitch_at_the_stops";
const COTTER = "pitch_link_cotter_hole_clearance";

// Where the lit band and the sizer are, in one sample: what a snap shows up as.
function bandProbe() {
  // The live drawing's, not the fading ghost of the outgoing one's.
  const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
    .filter((n) => !n.closest(".tv__ghost"))[0];
  const bars = live ? Array.from(live.querySelectorAll("line.rail__bar--on"))
    .map((n) => n.getBoundingClientRect()) : [];
  const sizer = live ? live.querySelector(".tv__zoomsizer") : null;
  const hs = live;
  return {
    bandLeft: bars.length ? Math.min(...bars.map((b) => b.left)) : null,
    bandRight: bars.length ? Math.max(...bars.map((b) => b.right)) : null,
    bandTop: bars.length ? Math.min(...bars.map((b) => b.top)) : null,
    bandBottom: bars.length ? Math.max(...bars.map((b) => b.bottom)) : null,
    marginLeft: sizer ? parseFloat(sizer.style.marginLeft) || 0 : null,
    marginTop: sizer ? parseFloat(sizer.style.marginTop) || 0 : null,
    scrollLeft: hs ? hs.scrollLeft : null,
    scrollY: window.scrollY,
    tweening: !!(window.ViewerApp.lastTopoRender && window.ViewerApp.lastTopoRender.tweening),
  };
}

// Where the pose is and what reads it, in one sample: the control, the
// chart's cursor, one term's numbers, the foot, and a few lit bars' ends.
function poseProbe() {
  const q = (s) => document.querySelector(s);
  const text = (s) => (q(s) ? q(s).textContent : null);
  const term = '#topopane tr.tvrow[data-id="pitch_plate_attach_height"]';
  return {
    travel: q("#detail input.kmpose__slider") ? Number(q("#detail input.kmpose__slider").value) : null,
    angle: q("#detail input.kmpose__angle") ? q("#detail input.kmpose__angle").value : null,
    cursor: q("#detail line.kmchart__pose") ? Number(q("#detail line.kmchart__pose").getAttribute("x1")) : null,
    sensitivity: text(term + " td.tvcell--sensitivity"),
    contribution: text(term + " td.tvcell--contribution"),
    total: text("#topopane tr.tvtotal--worst_case td.tvcell--contribution"),
    gridTop: q("#topopane div.tv__rows") ? q("#topopane div.tv__rows").getBoundingClientRect().top : null,
    bars: Array.from(document.querySelectorAll("#topopane line.rail__bar--on"))
      .slice(0, 4).map((b) => Number(b.getAttribute("y2"))),
  };
}

const BUILTINS = {
  // Play on the kinematic page (the_grid_and_the_dag_move_with_the_mechanism):
  // the grid's numbers, the DAG in the contribution mode, the chart's cursor
  // and the control all move with the linkage. --pose sets where it starts.
  "pose-play": {
    async setup(page, h) { await h.bootKinematic(page, h.base, h.DATA, STOPS, h.pose); },
    async trigger(page, h) { await h.click(page, "#detail button.kmpose__play"); },
    probe: (page) => page.evaluate(poseProbe),
  },
  // Blade pitch at the stops -> the cotter-hole chain study: a study change.
  respine: {
    async setup(page, h) { await h.bootKinematic(page, h.base, h.DATA, STOPS); },
    async trigger(page, h) { await h.click(page, h.navRow("study", COTTER)); },
    probe: (page) => page.evaluate(bandProbe),
  },
  // ...and back to the kinematic study.
  "respine-back": {
    async setup(page, h) {
      await h.bootKinematic(page, h.base, h.DATA, STOPS);
      await page.locator(h.navRow("study", COTTER)).click();
      await h.settled(page, 800);
    },
    async trigger(page, h) {
      await h.click(page, h.navRow("kinematic", STOPS));
    },
    probe: (page) => page.evaluate(bandProbe),
  },
  // The 3D pane opening beside the drawing of a chain study (a landing that is
  // not a study change): the band keeps its place as the page narrows.
  "pane-open": {
    async setup(page, h) {
      await h.bootKinematic(page, h.base, h.DATA, STOPS);
      await page.locator(h.navRow("study", COTTER)).click();
      await h.settled(page, 1500);
    },
    async trigger(page, h) { await h.click(page, "#study-3d"); },
    probe: (page) => page.evaluate(bandProbe),
  },
  // A click on a grid row: selection changes, the drawing must hold still.
  "row-click": {
    async setup(page, h) { await h.bootKinematic(page, h.base, h.DATA, STOPS); },
    async trigger(page, h) { await h.click(page, "#topopane tr.tvrow--edge"); },
    probe: (page) => page.evaluate(bandProbe),
  },
  // A click on a node of the kinematic page: the drawing must not move.
  click: {
    async setup(page, h) { await h.bootKinematic(page, h.base, h.DATA, STOPS); },
    async trigger(page, h) {
      await h.click(page, "#topopane svg.tv__rails circle.rail__dot--on:nth-of-type(2)");
    },
    probe: (page) => page.evaluate(bandProbe),
  },
};


// --- the composite ---------------------------------------------------------------

// Frames laid out in a grid on a canvas, inside the browser (no image library
// needed), each stamped with its measured time. Returns PNG bytes.
async function composite(browser, frames, { width, columns }) {
  const page = await browser.newPage({ viewport: { width, height: 400 } });
  try {
    const b64 = frames.map((f) => f.png.toString("base64"));
    const png = await page.evaluate(async ({ b64, stamps, width, columns }) => {
      const imgs = await Promise.all(b64.map((s) => new Promise((ok, no) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = no;
        i.src = "data:image/png;base64," + s;
      })));
      const gap = 6, label = 22;
      const cw = Math.floor((width - gap * (columns + 1)) / columns);
      const ch = Math.round(cw * imgs[0].naturalHeight / imgs[0].naturalWidth);
      const rows = Math.ceil(imgs.length / columns);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = gap + rows * (ch + label + gap);
      const g = canvas.getContext("2d");
      g.fillStyle = "#222"; g.fillRect(0, 0, canvas.width, canvas.height);
      g.font = "14px sans-serif"; g.textBaseline = "middle";
      imgs.forEach((img, i) => {
        const x = gap + (i % columns) * (cw + gap);
        const y = gap + Math.floor(i / columns) * (ch + label + gap);
        g.fillStyle = "#ddd";
        g.fillText(`#${i + 1}  ${stamps[i]} ms`, x + 2, y + label / 2);
        g.drawImage(img, x, y + label, cw, ch);
      });
      return canvas.toDataURL("image/png").split(",")[1];
    }, { b64, stamps: frames.map((f) => f.t), width, columns });
    return Buffer.from(png, "base64");
  } finally {
    await page.close();
  }
}

// --- main ------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { frames: 8, interval: 40, columns: 4, width: 1600, viewport: "1600x1000",
    out: null, name: null, repo: MAIN_CHECKOUT, scenario: null, help: false, pose: null,
    "real-time": false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") o.help = true;
    else if (a.startsWith("--") && a.slice(2) in o) {
      const key = a.slice(2);
      if (typeof o[key] === "boolean") { o[key] = true; continue; }
      const v = argv[++i];
      o[key] = typeof o[key] === "number" ? Number(v) : v;
    } else throw new Error(`unknown argument ${a} (try --help)`);
  }
  return o;
}

async function loadScenario(spec) {
  if (spec in BUILTINS) return { name: spec, scenario: BUILTINS[spec] };
  const path = resolve(spec);
  const mod = await import(pathToFileURL(path).href);
  const scenario = mod.default || mod.scenario || mod;
  if (typeof scenario.trigger !== "function") {
    throw new Error(`${spec}: a scenario exports a trigger(page, h)`);
  }
  return { name: spec.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, ""), scenario };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.scenario) {
    console.log(HELP.replace("{BUILTINS}", Object.keys(BUILTINS).join(", ")));
    process.exit(opts.help ? 0 : 2);
  }
  // Loaded before the slot is taken: a bad scenario never waits in the queue.
  const { name, scenario } = await loadScenario(opts.scenario);
  takeTheBrowserSlot();

  const outDir = opts.out ? resolve(opts.out) : join(MAIN_CHECKOUT, "data", "scratch", "filmstrips");
  await mkdir(outDir, { recursive: true });
  const stem = opts.name || name;
  const [vw, vh] = opts.viewport.split("x").map(Number);
  const { chromium } = await loadPlaywright();
  const server = await startServer(REPO, normalize(opts.repo));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    for (const channel of ["chrome", "msedge"]) {
      try { browser = await launchBrowser(chromium, { channel, headless: true }); break; }
      catch (err) { if (channel === "msedge") throw err; }
    }
    const page = await browser.newPage({ viewport: { width: vw, height: vh } });
    if (!opts["real-time"]) await page.addInitScript(CLOCK);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const h = { REPO, DATA: normalize(opts.repo), VIEWER: join(REPO, "apps", "viewer"),
      base, navRow, click, bootKinematic, settled, pose: opts.pose };
    if (scenario.setup) await scenario.setup(page, h);

    // Frame 0 is the state before the trigger; the rest follow it, `interval`
    // ms of page time apart (see the header: the clock is stepped, not waited).
    const frames = [];
    const samples = [];
    const virtual = !opts["real-time"];
    let t = 0;
    const take = async () => {
      const png = await page.screenshot({ animations: "allow", timeout: 60000 });
      frames.push({ t, png });
      if (scenario.probe) samples.push({ t, ...(await scenario.probe(page, h)) });
    };
    const t0 = Date.now();
    if (virtual) await page.evaluate(() => window.__clock.freeze());
    await take();
    const fired = scenario.trigger(page, h);
    if (virtual) {
      await fired;
      for (let i = 1; i < opts.frames; i++) {
        await page.evaluate((ms) => window.__clock.step(ms), opts.interval);
        t += opts.interval;
        await take();
      }
      await page.evaluate(() => window.__clock.thaw());
    } else {
      for (let i = 1; i < opts.frames; i++) {
        const due = t0 + i * opts.interval;
        if (due > Date.now()) await page.waitForTimeout(due - Date.now());
        t = Date.now() - t0;
        await take();
      }
      await fired;
    }

    const strip = await composite(browser, frames, { width: opts.width, columns: opts.columns });
    await writeFile(join(outDir, stem + ".png"), strip);
    if (samples.length) await writeFile(join(outDir, stem + ".json"), JSON.stringify(samples, null, 1));
    console.log(`filmstrip: ${frames.length} frames over ${frames.at(-1).t} ms -> ${join(outDir, stem + ".png")}`);
    if (errors.length) { console.log("page errors:\n  " + errors.join("\n  ")); process.exitCode = 1; }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.closeAllConnections();
    server.close();
  }
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
