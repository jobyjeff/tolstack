// Hand-run inspection probe for handoff everything_in_3d_is_transparent_until_
// an_action_needs_a_face (2026-11-05). NOT a tier -- pytest never collects it.
//
//   node tests/debug_transparent_3d.mjs --repo C:/workspace/tolstack
//   node tests/debug_transparent_3d.mjs --repo C:/workspace/tolstack --shots docs/sessions/lessons/shots/everything_in_3d_is_transparent_until_an_action_needs_a_face
//
// Opens the kinematic study's 3D from the viewer's topology page on the REAL
// projection and reads back every drawn mesh in the three.js scene -- not the
// app's own report of it -- with its opacity: at rest, with the base body
// hidden, with a pick armed on the pitch-link end, and after the pick ends.
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

// Every Mesh the renderer would draw (visible up its parent chain), grouped by
// what it is a copy of, with its opacity -- the scene graph itself.
async function drawn(page) {
  return frameOf(page).evaluate(() => {
    const sc = window.__scene;
    const bySha = new Map();
    for (const [sha, m] of sc.parts) bySha.set(m.geometry, sha);
    const labels = {};
    for (const m of (window.AnnotateApp.exec ? [] : [])) labels[m] = m;
    const rows = [];
    sc.scene.traverseVisible((o) => {
      if (!o.isMesh) return;
      const sha = bySha.get(o.geometry);
      if (!sha) return;
      const part = sc.parts.get(sha);
      rows.push({ sha: sha.slice(0, 8), name: (part.userData.manifest && (part.userData.manifest.part_id || part.userData.manifest.label)) || null,
        what: o === part ? "part" : (o.userData && o.userData.occurrence ? "repeat" : "other"),
        key: o.userData ? o.userData.key : undefined,
        opacity: o.material.transparent ? +o.material.opacity.toFixed(2) : 1 });
    });
    return rows;
  });
}

function summary(rows) {
  const out = {};
  for (const r of rows) {
    const k = `${r.name || r.sha} [${r.what}] @${r.opacity}`;
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

// Wait until the drawn set stops changing for 3 s (parts stream in).
async function settle(page, maxMs = 120000) {
  const t0 = Date.now(); let last = "", stable = 0;
  while (Date.now() - t0 < maxMs) {
    const k = JSON.stringify(summary(await drawn(page).catch(() => [])));
    stable = k === last && k !== "{}" ? stable + 1 : 0; last = k;
    if (stable >= 6) return Date.now() - t0;
    await page.waitForTimeout(500);
  }
  return -1;
}

const run = (page, cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);
let n = 0;
async function shot(page, label) {
  n += 1;
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${n}_${label}.png`) });
}

try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } });
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="kinematic"]', { timeout: 30000 });
  const row = page.locator('[data-nav-kind="kinematic"]').first();
  await row.hover();
  await row.locator("[data-nav-3d]").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
  // The pointer off every row: what is lit below is the scene's own state.
  await page.mouse.move(1650, 980);
  console.log("SETTLED ms", await settle(page));
  console.log("HOVER STATE", JSON.stringify(await frameOf(page).evaluate(() => [window.__scene.hoverState(), window.__lastHover && window.__lastHover.target])));
  const rest = await drawn(page);
  console.log("REST", JSON.stringify(summary(rest), null, 1));
  console.log("STATE", JSON.stringify(await frameOf(page).evaluate(() => ({ sweep: !!document.getElementById("sweep-tree"), title: document.title }))));
  const tree = await frameOf(page).evaluate(() => window.__embedTree || null);
  console.log("BODIES", JSON.stringify(await frameOf(page).evaluate(() =>
    Array.from(document.querySelectorAll(".an__sweep-body-name")).map((e) => e.textContent))));
  await shot(page, "at_rest");
  const bodyName = flag("--body") || "base";
  console.log("HIDE", JSON.stringify(await run(page, ["hide-body", bodyName]).catch((e) => String(e))));
  await page.waitForTimeout(1500);
  const after = await drawn(page);
  const ids = (rows) => rows.map((r) => `${r.name || r.sha} [${r.what}] key=${r.key} @${r.opacity}`);
  const a = ids(after), b = ids(rest);
  console.log("GONE ON HIDE", JSON.stringify(b.filter((x) => a.indexOf(x) === -1), null, 1));
  // Whatever still drawn sits where a hidden base occurrence sat: world boxes.
  console.log("SAME PLACE AS BASE", JSON.stringify(await frameOf(page).evaluate(() => {
    const T = window.THREE || null;
    const sc = window.__scene;
    const box = (o) => { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => Math.round(v)); };
    const hidden = [], shown = [];
    sc.scene.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
      const sha = o.userData.sha256 || [...sc.parts].find(([, m]) => m.geometry === o.geometry)?.[0];
      const row = { sha: sha ? sha.slice(0, 8) : null, what: o === sc.parts.get(sha) ? "part" : (o.userData.occurrence ? "repeat" : "other"),
        op: o.material.transparent ? o.material.opacity : 1, b: box(o) };
      (vis ? shown : hidden).push(row); });
    const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 30);
    return hidden.map((h) => ({ hidden: h, overlapping: shown.filter((s) => near(s.b, h.b)) }));
  }), null, 1));
  console.log("KEYS", JSON.stringify(await frameOf(page).evaluate(() => {
    const sc = window.__scene; const out = {};
    for (const sha of sc.listOpenParts()) out[(sc.parts.get(sha).userData.manifest || {}).part_id || sha.slice(0, 8)] = sc.drawnOccurrenceKeys(sha);
    return out; }), null, 1));
  console.log("NEW ON HIDE", JSON.stringify(a.filter((x) => b.indexOf(x) === -1), null, 1));
  await shot(page, "base_hidden");
  // The looks by part, as the scene holds them (scene-view's `look`).
  const looks = async () => {
    const view = await run(page, ["scene-view"]);
    const by = {};
    for (const r of view) { const k = r.visible ? r.look : "hidden"; (by[k] = by[k] || []).push(r.part); }
    return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, k === "faint" ? v.length : v]));
  };
  await run(page, ["show-body", bodyName]);
  await page.waitForTimeout(800);
  console.log("ARM", JSON.stringify(await run(page, ["arm", "pitch_plate_link_joint", "to"])));
  await page.waitForTimeout(2000);
  console.log("ARMED LOOKS", JSON.stringify(await looks()));
  await shot(page, "armed_on_the_pitch_link_end");
  console.log("DISARM", JSON.stringify(await run(page, ["arm", "off"])));
  await page.waitForTimeout(1500);
  console.log("AFTER LOOKS", JSON.stringify(await looks()));
  await shot(page, "after_the_pick");
  const topo = await frameOf(page).evaluate(() => null);
  console.log("HIGHLIGHT", JSON.stringify(await run(page, ["highlight", "vpa_pitch_linkage", "pitch_link_length"])));
  await page.waitForTimeout(1000);
  console.log("HIGHLIGHT LOOKS", JSON.stringify(await looks()));
  await shot(page, "grid_row_pitch_link_length");
  await run(page, ["highlight", "clear"]);
  await page.waitForTimeout(800);
  console.log("CLEARED LOOKS", JSON.stringify(await looks()));
} finally {
  await browser.close();
  server.close();
}
