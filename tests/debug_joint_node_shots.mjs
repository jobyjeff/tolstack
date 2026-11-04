// Debug script (handoff the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit,
// 2026-11-04): screenshots the DAG on the REAL projection -- the kinematic
// study at each stop, a chain study, the whole topology -- plus mock-up C
// rendered at the same size, for the lesson's side-by-side. Serves THIS tree's
// apps/ with data/ from the main checkout (filmstrip.mjs's arrangement), so
// what it shoots is the branch, not whatever 8000 is serving.
//
//   node tests/debug_joint_node_shots.mjs [out-dir] [--hover <css>]
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright, closeEveryBrowser } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
// This tree's own projection when it has one (built with --data-root here),
// else the main checkout's.
const DATA = existsSync(join(REPO, "data", "projections", "viewer", "topologies.json"))
  ? REPO : normalize("C:/workspace/tolstack");
const MOCKUP = normalize("C:/workspace/dispatch/docs/strategy/drafts/mockups/dag_iconography/C_stack_of_substacks.svg");
const OUT = normalize(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2]
  : join(REPO, "docs", "sessions", "lessons", "shots", "the_joint_is_the_node_and_an_edge_says_only_lit_or_unlit"));
const STOPS = "vpa_pitch_linkage_blade_pitch_at_the_stops";
const CHAIN = "pitch_link_cotter_hole_clearance";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      try {
        const rel = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^[/\\]+/, "");
        const base = rel.split(sep)[0] === "data" ? DATA : REPO;
        const full = join(base, rel);
        if (!full.startsWith(base + sep)) { res.writeHead(403).end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    server.listen(0, "127.0.0.1", () => done(server));
  });
}

const projection = async (name) =>
  JSON.parse(await readFile(join(DATA, "data", "projections", "viewer", name), "utf8"));

async function boot(page, base, query) {
  const [topologies, results, crops, kinematic] = await Promise.all(
    ["topologies.json", "results.json", "crops.json", "kinematic/kinematic_studies.json"].map(projection));
  await page.goto(`${base}/apps/viewer/topology.html${query}`, { waitUntil: "load" });
  await page.evaluate((p) => {
    const VA = window.ViewerApp;
    const Fake = function () {
      return new VA.MemoryAdapter(Object.assign({ startState: VA.STATE.READY, images: {}, texts: {} }, p));
    };
    Fake.isSupported = () => true;
    VA.FsaAdapter = Fake;
    VA.bootTopology();
  }, { topologies, results, crops, kinematic });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 20000 });
  await settle(page);
}

async function settle(page, ms = 900) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 20000 });
  await page.waitForTimeout(ms);
}

// The live drawing's rails SVG alone, at the page's device scale.
async function rails(page, name) {
  // Clipped to what the study lights (plus its labels' room), or the
  // viewport's share of the SVG when nothing is lit.
  const box = await page.evaluate(() => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live && live.querySelector("svg.tv__rails");
    if (!svg) return null;
    const on = Array.from(svg.querySelectorAll(".rail__bar--on, .rail__dot--on, [data-node-glyph].rail__node--on"));
    const s = svg.getBoundingClientRect();
    if (!on.length) return { x: s.left, y: Math.max(0, s.top), width: s.width, height: 900 };
    const r = on.map((n) => n.getBoundingClientRect());
    const top = Math.min(...r.map((b) => b.top)) - 40;
    const bottom = Math.max(...r.map((b) => b.bottom)) + 40;
    return { x: s.left, y: top + window.scrollY, width: s.width, height: bottom - top };
  });
  if (!box) return;
  await page.screenshot({ path: join(OUT, name), clip: box, fullPage: true });
}

const nav = (kind, id) => `[data-nav-kind="${kind}"][data-nav-id="${id}"]`;

const { chromium } = await loadPlaywright();
let browser = null;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await launchBrowser(chromium, { channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(OUT, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));

  await page.goto(pathToFileURL(MOCKUP).href);
  await page.screenshot({ path: join(OUT, "0_mockup_C.png") });

  await boot(page, base, `?kinematic=${STOPS}`);
  await page.screenshot({ path: join(OUT, "1_kinematic_minus7.png") });
  await rails(page, "1b_kinematic_minus7_dag.png");
  // A close-up the way a reader gets one: the wheel over the lit spine.
  const spine = await page.locator("#topopane line.rail__bar--on").first().boundingBox();
  if (spine) {
    await page.mouse.move(spine.x + 2, spine.y + 120);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); }
    await settle(page);
    await page.screenshot({ path: join(OUT, "1c_kinematic_zoomed.png") });
    await page.keyboard.press("0");
    await settle(page);
  }
  const plus = page.getByRole("button", { name: /\+72/ }).first();
  if (await plus.count()) {
    await plus.click();
    await settle(page);
    await page.screenshot({ path: join(OUT, "2_kinematic_plus72.png") });
    await rails(page, "2b_kinematic_plus72_dag.png");
  }
  const hover = process.argv.indexOf("--hover");
  if (hover !== -1) {
    await page.locator(process.argv[hover + 1]).first().hover();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "3_kinematic_hover.png") });
  }
  await page.locator(nav("study", CHAIN)).first().click();
  await settle(page);
  await page.screenshot({ path: join(OUT, "4_chain_study.png") });
  await rails(page, "4b_chain_study_dag.png");
  const topo = page.locator('[data-nav-kind="topology"]').first();
  if (await topo.count()) {
    await topo.click();
    await settle(page);
    await page.screenshot({ path: join(OUT, "5_topology.png") });
    await page.screenshot({ path: join(OUT, "6_topology_full.png"), fullPage: true });
  }
  // What each node draws, for the lesson's census.
  const census = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll("#topopane svg.tv__rails [data-node-glyph]").forEach((n) => {
      const k = n.getAttribute("data-node-glyph");
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  });
  console.log("topology node glyphs:", JSON.stringify(census));
} finally {
  server.close();
  await closeEveryBrowser();
}
console.log("shots ->", OUT);
