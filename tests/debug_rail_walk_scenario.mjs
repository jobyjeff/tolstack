// Filmstrip scenario (handoff the_rail_holds_still_and_takes_the_face_jeff_picked,
// 2026-11-05): Jeff's walk of the rail, in the shell, on the real projection.
// Expand the tangential link's joint, open the pitch link's upper end, Take its
// first face, then the partner end's list (opened for you), Take again: both
// ends bound, and the nav's scroll the same in every frame (the probe says so).
// The annotator boots on the memory adapter with its reads on the served data,
// so the Takes are written to memory, never to a folder.
//
//   node scripts/filmstrip.mjs --scenario tests/debug_rail_walk_scenario.mjs \
//     --real-time --frames 10 --interval 2500 --columns 5 --viewport 1600x900 \
//     --out docs/sessions/lessons/shots/the_rail_holds_still_and_takes_the_face_jeff_picked
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";

async function seed(h) {
  const meshes = [];
  for (const name of await readdir(join(h.DATA, "data", "meshes"))) {
    const where = join(h.DATA, "data", "meshes", name, "provenance.json");
    if (!existsSync(where)) continue;
    const p = JSON.parse(await readFile(where, "utf8"));
    meshes.push({ sha256: name, label: p.label, part_id: p.part_id });
  }
  const runs = (await readdir(join(h.DATA, "data", "inbox", "linkage-sweeps")))
    .filter((n) => /\.json$/i.test(n)).map((n) => n.replace(/\.json$/i, ""));
  const aliases = JSON.parse(await readFile(join(h.REPO, "docs", "topologies", "part_mesh_aliases.json"), "utf8"));
  return { meshes, runs, aliases };
}

// The nav row a key pattern names, clicked on the part `sel` picks.
const press = (page, src, sel, nth) => page.evaluate(([src, sel, nth]) => {
  const rows = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
    .filter((n) => new RegExp(src).test(n.getAttribute("data-scene-key")));
  const row = rows[nth || 0];
  const hit = row && (sel ? row.querySelector(sel) : row);
  if (hit) hit.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  return !!hit;
}, [src, sel || null, nth || 0]);

const JOINT = (name) => "^#sweep-tree/joint=" + name + "$";
const END = (feature) => "^#sweep-tree/joint=pitch_link/[^/]*feature=" + feature + ",state=[a-z_]+$";
const FACE = (feature) => "^#sweep-tree/joint=pitch_link/[^/]*feature=" + feature + ",state=[a-z_]+/face=";

export default {
  async setup(page, h) {
    await page.addInitScript((seed) => {
      if (location.pathname.indexOf("/apps/annotate/") === -1) return;
      if (!/[?&]mock=1(&|$)/.test(location.search)) {
        history.replaceState(null, "", location.pathname + (location.search ? location.search + "&" : "?") +
          "mock=1" + location.hash);
      }
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
    }, await seed(h));
    await page.goto(`${h.base}/apps/viewer/topology.html?kinematic=${STUDY}`, { waitUntil: "load" });
    await page.waitForSelector("#pane-handle:visible", { timeout: 60000 });
    await page.locator("#pane-handle").click();
    await page.waitForFunction(() => document.querySelectorAll(
      '.navtree__scene [data-scene-key^="#sweep-tree/body=pitch_link/"]').length >= 2, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    // The joints group at the top of the nav, scrolled there by hand.
    await page.evaluate(() => {
      const box = document.getElementById("navtree");
      const head = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
        .find((n) => /^#sweep-tree\/joints/.test(n.getAttribute("data-scene-key")));
      box.scrollTop += head.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
    });
    await press(page, JOINT("pitch_link"), ".navtree__scenetext");
    await page.waitForTimeout(1500);
  },
  async trigger(page) {
    const wait = (ms) => page.waitForTimeout(ms);
    await wait(1200);
    await press(page, JOINT("tan_link"), ".navtree__scenetext");
    await wait(2500);
    await press(page, END("pitch_link_upper_sphere_centre"), ".navtree__scenetwisty");
    await wait(2500);
    await press(page, FACE("pitch_link_upper_sphere_centre"), ".navtree__scenebtn");
    await wait(5000);
    await press(page, FACE("pitch_link_lower_sphere_centre"), ".navtree__scenebtn");
  },
  probe(page) {
    return page.evaluate(() => {
      const box = document.getElementById("navtree");
      const ends = Array.from(document.querySelectorAll(".navtree__scene [data-scene-key]"))
        .map((n) => n.getAttribute("data-scene-key"))
        .filter((k) => /^#sweep-tree\/joint=pitch_link\/[^/]*$/.test(k))
        .map((k) => k.replace(/^.*feature=/, ""));
      return { scrollTop: box.scrollTop, ends };
    });
  },
};
