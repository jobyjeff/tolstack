// Debug script (handoff the_rail_holds_still_and_takes_the_face_jeff_picked,
// 2026-11-05): Jeff's walk of the sweep rail, replayed in the viewer's shell
// on the REAL projection -- the kinematic study, its 3D pane, the rail as the
// shell's nav mirrors it. Serves THIS tree's apps/ with data/ from the main
// checkout. The annotator boots on the memory adapter (?mock=1 on its frame)
// with its reads pointed at the served data, so a Take is written to memory,
// never to a folder. Prints, per step, the nav's scroll and where the acted-on
// row sits on screen; writes one PNG per step. Run by hand.
//
//   node tests/debug_rail_walk.mjs [out-dir] [--run <sweep run id>]
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
  : join(REPO, "docs", "sessions", "lessons", "shots", "the_rail_holds_still_and_takes_the_face_jeff_picked"));
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
  await settle(8000);
  console.log("run:", await pane().evaluate(() => window.__sweep.artifact.runId));
  console.log("keys:\n  " + (await keys()).join("\n  "));
  await shot("pane_open");

  // 1. Expand the tan-link joint.
  const tan = await rowKey(/^#sweep-tree\/joint=tan_link$/);
  const p0 = await posts();
  await settle(3000);
  console.log("tree posts in 3 s at rest:", (await posts()) - p0);
  await reveal(tan, 500);
  const beforeTan = await where(tan);
  await act(tan, ".navtree__scenetext");
  await settle();
  console.log("expand tan_link:", JSON.stringify(beforeTan), "->", JSON.stringify(await where(tan)));
  await shot("tan_link_open");

  // 2. The pitch link's upper end: open its list, take its first face.
  const pl = await rowKey(/^#sweep-tree\/joint=pitch_link$/);
  const beforePl = await where(pl);
  await act(pl, ".navtree__scenetext");
  await settle();
  console.log("expand pitch_link:", JSON.stringify(beforePl), "->", JSON.stringify(await where(pl)));
  const upper = await rowKey(/^#sweep-tree\/joint=pitch_link\/.*feature=pitch_link_upper_sphere_centre/);
  console.log("upper row:", upper);
  await act(upper, ".navtree__scenetwisty");
  await settle();
  const listUpper = await where(upper);
  console.log("open upper list:", JSON.stringify(listUpper));
  await shot("upper_list");
  const cands = (await keys()).filter((k) => k.indexOf(upper + "/") === 0);
  console.log("upper candidates:\n  " + cands.join("\n  "));
  const take = cands.find((k) => /face=/.test(k));
  const beforeTake = await where(take);
  await act(take, ".navtree__scenebtn");
  await settle(3000);
  console.log("take:", JSON.stringify(beforeTake), "-> upper now at",
    JSON.stringify(await where(await rowKey(/^#sweep-tree\/joint=pitch_link\/.*feature=pitch_link_upper_sphere_centre/))));
  console.log("after take, pitch_link rows:\n  " + (await keys()).filter((k) => k.indexOf(pl + "/") === 0).join("\n  "));
  console.log("writes:", JSON.stringify(await pane().evaluate(() => (window.__mockWrites || []).length)));
  await shot("after_take");
} finally {
  server.close();
  await closeEveryBrowser();
}
console.log("shots ->", OUT);
