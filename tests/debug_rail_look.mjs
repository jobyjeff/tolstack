// Debug script (handoff the_rail_reads_as_a_tree_of_bodies_joints_and_faces,
// 2026-11-06): the rail's LOOK, shot in the viewer's shell on the REAL
// projection -- at rest, every joint expanded, an end's list open, both pitch
// link ends taken, a pick armed, a row hovered, and the nav beside the grid
// at one zoom so the two indent steps can be compared. Boots exactly as
// tests/debug_rail_walk.mjs does (this tree's apps/, the main checkout's
// data/, the annotator on the memory adapter: a Take is written to memory,
// never to a folder). Writes one PNG per step, plus a nav-only crop. Run by
// hand.
//
//   node tests/debug_rail_look.mjs [out-dir] [--run <sweep run id>]
import { createServer } from "node:http";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright, closeEveryBrowser } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const DATA = normalize("C:/workspace/tolstack");
const args = process.argv.slice(2);
const runAt = args.indexOf("--run");
const RUN = runAt === -1 ? null : args[runAt + 1];
const OUT = normalize(args[0] && !args[0].startsWith("--") ? args[0]
  : join(REPO, "docs", "sessions", "lessons", "shots", "the_rail_reads_as_a_tree_of_bodies_joints_and_faces"));
const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".bin": "application/octet-stream" };

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

async function index() {
  const meshes = [];
  for (const name of await readdir(join(DATA, "data", "meshes"))) {
    const where = join(DATA, "data", "meshes", name, "provenance.json");
    if (!existsSync(where)) continue;
    const p = JSON.parse(await readFile(where, "utf8"));
    meshes.push({ sha256: name, label: p.label, part_id: p.part_id });
  }
  const runs = (await readdir(join(DATA, "data", "inbox", "linkage-sweeps")))
    .filter((n) => /\.json$/i.test(n)).map((n) => n.replace(/\.json$/i, ""));
  const aliases = JSON.parse(await readFile(join(REPO, "docs", "topologies", "part_mesh_aliases.json"), "utf8"));
  return { meshes, runs, aliases, run: RUN };
}

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
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.addInitScript((seed) => {
    if (location.pathname.indexOf("/apps/annotate/") === -1) return;
    let search = location.search;
    if (!/[?&]mock=1(&|$)/.test(search)) search += (search ? "&" : "?") + "mock=1";
    if (seed.run) search = search.replace(/sweep=[^&]*/, "sweep=" + seed.run);
    if (search !== location.search) history.replaceState(null, "", location.pathname + search + location.hash);
    const json = (path) => fetch("/data" + path).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const install = () => {
      const AA = window.AnnotateApp;
      if (!AA || !AA.MemoryAdapter || !AA.orderSweepRuns) return false;
      const P = AA.MemoryAdapter.prototype;
      P.listSweepRuns = async () => AA.orderSweepRuns(await Promise.all(seed.runs.map(
        async (id) => AA.sweepRunEntry(id, await json(`/inbox/linkage-sweeps/${id}.json`)))));
      P.readSweepRun = async (runId) => json(`/inbox/linkage-sweeps/${runId}.json`);
      P.readTopologyProjection = async () => json("/projections/viewer/topologies.json");
      P.readPartNames = async () => json("/projections/parts/names.json");
      P.listMeshes = async () => seed.meshes;
      P.readMeshProvenance = async (sha) => json(`/meshes/${sha}/provenance.json`);
      P.readMeshManifest = async (sha) => json(`/meshes/${sha}/manifest.json`);
      P.readMeshBuffer = async (sha, name) => fetch(`/data/meshes/${sha}/${name}`)
        .then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
      P.readPartMeshAliases = async () => seed.aliases;
      P.readKinematicProjection = async () => json("/projections/viewer/kinematic/kinematic_studies.json");
      P.readFeatureIdentityProjection = async () => json("/projections/feature-identity/bindings.json");
      P.readContactSuggestions = async () => json("/projections/feature-identity/contact_suggestions.json");
      return true;
    };
    const timer = setInterval(() => { if (install()) clearInterval(timer); }, 1);
    document.addEventListener("DOMContentLoaded", () => { install(); clearInterval(timer); });
  }, await index());

  await page.addInitScript(() => {
    if (location.pathname.indexOf("/apps/viewer/") === -1) return;
    window.__treePosts = [];
    window.addEventListener("message", (e) => {
      if (e.data && e.data.type === "annotate:tree") window.__treePosts.push(performance.now());
    });
  });
  const posts = () => page.evaluate(() => window.__treePosts.length);
  const act = (k, sel) => page.evaluate(([k, sel]) => {
    const row = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
      .find((n) => n.getAttribute("data-scene-key") === k);
    if (!row) throw new Error("no row " + k);
    const hit = sel ? row.querySelector(sel) : row;
    hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  }, [k, sel || null]);
  const reveal = (k, below) => page.evaluate(([k, below]) => {
    const nav = document.getElementById("navtree");
    const row = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
      .find((n) => n.getAttribute("data-scene-key") === k);
    nav.scrollTop += row.getBoundingClientRect().top - nav.getBoundingClientRect().top - below;
  }, [k, below]);
  const pane = () => page.frames().find((f) => f.url().indexOf("/apps/annotate/") !== -1);
  // The nav's scroll, and where the row a key names sits in it.
  const where = (key) => page.evaluate((k) => {
    const nav = document.getElementById("navtree");
    const row = k ? document.querySelector('.navtree__scene [data-scene-key="' + CSS.escape(k).replace(/\\/g, "\\") + '"]') ||
      Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]")).find((n) => n.getAttribute("data-scene-key") === k) : null;
    const n = nav.getBoundingClientRect();
    return { scrollTop: Math.round(nav.scrollTop), scrollHeight: nav.scrollHeight,
      rowTop: row ? Math.round(row.getBoundingClientRect().top - n.top) : null };
  }, key);
  const keys = () => page.evaluate(() => Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
    .map((n) => n.getAttribute("data-scene-key")));
  const rowKey = async (re) => (await keys()).find((k) => re.test(k)) || null;
  const rowSel = (k) => `.navtree__scene [data-scene-key="${k.replace(/"/g, '\\"')}"]`;
  let step = 0;
  const shot = async (name) => { await page.screenshot({ path: join(OUT, `${String(++step).padStart(2, "0")}_${name}.png`) }); };
  const settle = (ms = 1500) => page.waitForTimeout(ms);

  await page.goto(`${base}/apps/viewer/topology.html?kinematic=${STUDY}`, { waitUntil: "load" });
  await page.waitForSelector("div.kmverdict", { timeout: 60000 });
  await page.waitForSelector("#pane-handle:visible", { timeout: 30000 });
  await page.locator("#pane-handle").click();
  await page.waitForFunction(() => document.querySelectorAll('.navtree__scene [data-scene-key^="#sweep-tree/joint="]').length > 0,
    null, { timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('.navtree__scene [data-scene-key^="#sweep-tree/body=pitch_link/"]').length >= 2,
    null, { timeout: 120000 });
  await settle(6000);
  // The nav, alone, and the nav with the grid beside it.
  const navShot = async (name) => {
    const box = await page.locator("#navtree").boundingBox();
    await page.screenshot({ path: join(OUT, `${String(step).padStart(2, "0")}_${name}_nav.png`), clip: box });
  };
  const both = async (name) => { await shot(name); await navShot(name); };
  const scrollTo = async (re, below) => {
    const k = await rowKey(re);
    if (k) await reveal(k, below);
  };
  await scrollTo(/^#sweep-tree\/body=base$/, 40);
  await both("at_rest");

  // Every joint expanded, one body open.
  for (const k of (await keys()).filter((k) => /^#sweep-tree\/joint=[^/]+$/.test(k))) {
    await act(k, ".navtree__scenetext");
    await settle(800);
  }
  const plate = await rowKey(/^#sweep-tree\/body=pitch_plate$/);
  if (plate && !(await page.evaluate((k) => !!Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
    .find((n) => n.getAttribute("data-scene-key").indexOf(k + "/") === 0), plate))) {
    await act(plate, ".navtree__scenetext");
    await settle(800);
  }
  await scrollTo(/^#sweep-tree\/joint=[^/]+$/, 40);
  await both("all_joints_open");

  // The pitch link's upper end: its list open, a candidate hovered.
  const upper = await rowKey(/^#sweep-tree\/joint=pitch_link\/.*feature=pitch_link_upper_sphere_centre/);
  await act(upper, ".navtree__scenetwisty");
  await settle();
  const face = (await keys()).find((k) => k.indexOf(upper + "/") === 0 && /face=/.test(k));
  await reveal(face, 260);
  await page.hover(rowSel(face));
  await settle();
  await both("end_list_open_hover");

  // Take it, then the partner end's (opened for you): both ends bound.
  await act(face, ".navtree__scenebtn");
  await settle(3000);
  const lowerFace = (await keys()).find((k) => /feature=pitch_link_lower_sphere_centre/.test(k) && /face=/.test(k));
  if (lowerFace) {
    await act(lowerFace, ".navtree__scenebtn");
    await settle(3000);
  }
  await page.mouse.move(5, 995);
  await scrollTo(/^#sweep-tree\/joint=pitch_link$/, 120);
  await settle();
  await both("two_ends_bound");

  // Mid-pick: Pick on the tangential link's upper end arms the pick.
  const tanEnd = (await keys()).find((k) => /^#sweep-tree\/joint=tan_link\/[^/]*$/.test(k));
  if (tanEnd) {
    // Selected first: an end with a proposal shows its answers only then.
    await act(tanEnd);
    await settle(2000);
    await page.evaluate((k) => {
      const row = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
        .find((n) => n.getAttribute("data-scene-key") === k);
      const pick = Array.from(row.querySelectorAll(".navtree__scenebtn")).pop();
      if (pick) pick.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    }, tanEnd);
    await settle(4000);
    const armed = (await keys()).find((k) => /^#sweep-tree\/joint=tan_link\/[^/]*$/.test(k));
    if (armed) await reveal(armed, 200);
    await settle();
    await both("mid_pick");
    await pane().evaluate(() => window.AnnotateApp.exec(["arm", "off"]));
    await settle(2000);
  }

  // The nav beside the grid, at one zoom: the grid's rows on the right.
  await scrollTo(/^#sweep-tree\/joint=pitch_link$/, 120);
  const nav = await page.locator("#navtree").boundingBox();
  await page.screenshot({ path: join(OUT, `${String(++step).padStart(2, "0")}_rail_beside_grid.png`),
    clip: { x: nav.x, y: nav.y, width: Math.min(1600 - nav.x, 1100), height: nav.height } });
  // At 1600 with the pane open the grid is a slit; at 2560 it has room for
  // its rows, so the rail's step and the grid's brackets read side by side.
  await page.setViewportSize({ width: 2560, height: 1000 });
  await settle(3000);
  await scrollTo(/^#sweep-tree\/joint=pitch_link$/, 120);
  await settle();
  await page.screenshot({ path: join(OUT, `${String(++step).padStart(2, "0")}_rail_beside_grid_2560.png`) });
} finally {
  server.close();
  await closeEveryBrowser();
}
console.log("shots ->", OUT);
