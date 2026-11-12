// Hand-run inspection probe for handoff the_pane_follows_the_one_selection_
// both_ways (2026-11-12). NOT a tier -- pytest never collects it. It serves
// an apps/ tree (this one, or --apps <root> for a before-the-fix pass) over
// the main checkout's data/ on a private port, the way
// debug_one_focus_20261110.mjs does, and walks the handoff's definition of
// done (a)-(d) on the end-stop model v2 with the P2 sweep loaded from the
// Studies row, then on the kinematic page; it prints what each step did and
// takes the (b) and (c) shots before and after the gesture.
//
//   node tests/debug_one_selection_both_ways_20261112.mjs [--phase topology|kinematic|all]
//        [--shots <dir>] [--width 3840] [--apps <root>] [--tag <suffix>]
//        [--repo C:/workspace/tolstack]
//
//   (a) a feature row clicked, the pointer swept over twelve DAG marks: how
//       many times the page told the pane's rail to select it
//   (b) the pane lets go (`inspect clear`, what a second click on the bead
//       or the bound face runs): does the page let go on every surface
//   (c) a grid row clicked: does the sweep stay, the edge light, the leaders
//       stay drawn
//   (d) Escape with nothing armed lets go; with a pick armed, cancels it only
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
const APPS = resolve(flag("--apps") || HERE);
const PHASE = flag("--phase") || "all";
const WIDTH = Number(flag("--width") || 3840);
const TAG = flag("--tag") || "";
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_pane_follows_the_one_selection_both_ways");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const STUDY = "vpa_pitch_linkage_blade_pitch_at_the_stops";
const FEATURE = "hub@hub_spindle_bore_axis";
const GRID_ROW = "tan_link_mount_height";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".stl": "application/octet-stream", ".glb": "model/gltf-binary" };

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : APPS, rel);
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
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));
const run = (page, cmd) => frameOf(page).evaluate((c) => window.AnnotateApp.exec(c), cmd);

async function settle(page, ms = 800) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 30000 })
    .catch(() => log("settle", "still tweening after 30s"));
  await page.waitForTimeout(ms);
}

async function open(query) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 2160 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.goto(`${url}/apps/viewer/topology.html?${query}`, { waitUntil: "load" });
  await page.waitForSelector("svg.tv__rails", { timeout: 30000 });
  await settle(page);
  return page;
}

async function openPane(page) {
  if (!(await page.locator("#annotate-flyout[open]").count())) {
    await page.locator("#pane-handle").click({ timeout: 15000 });
  }
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(3000);
}

async function sweepReady(page) {
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.__sweep);
    return f && f.__sweep.bodies && f.__sweep.bodies.length;
  }, null, { timeout: 180000 }).catch(() => log("sweep", "not loaded after 180s"));
  await run(page, ["pause"]).catch(() => {});
  await page.waitForTimeout(5000);
}

// Every command and rail gesture the page posts into the pane, from now on.
const listen = (page) => frameOf(page).evaluate(() => {
  window.__heard = [];
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (m && m.type === "annotate:exec") window.__heard.push(m.command.join(" "));
    if (m && m.type === "annotate:rail") window.__heard.push("rail " + m.act);
  });
});
const heard = (page) => frameOf(page).evaluate(() => window.__heard.splice(0));

const state = (page) => page.evaluate(() => {
  const preview = document.querySelector(".detail__preview");
  return {
    navOn: Array.from(document.querySelectorAll("#navtree .navtree__row--on"))
      .map((n) => n.getAttribute("data-nav-kind") + ":" + n.getAttribute("data-nav-id")),
    dagSelected: Array.from(new Set(Array.from(document.querySelectorAll("svg.tv__rails [data-row-kind][data-id]"))
      .filter((n) => /--selected|is-selected/.test(n.getAttribute("class") || ""))
      .map((n) => n.getAttribute("data-row-kind") + "|" + n.getAttribute("data-id")))),
    gridSelected: Array.from(document.querySelectorAll("tr.tvrow--selected")).map((n) => n.getAttribute("data-id")),
    preview: preview ? preview.getAttribute("data-preview-state") + " " + preview.getAttribute("data-preview-key") : null,
    seamLeaders: document.querySelectorAll("svg.seamleaders path.seam__leader").length,
    toggle: (document.getElementById("leader-style-toggle") || {}).textContent,
  };
});
const pane = (page) => frameOf(page).evaluate(() => ({
  sweep: !!window.__sweep,
  inspect: window.__sweep && window.__sweep.inspect
    ? [window.__sweep.inspect.kind, window.__sweep.inspect.name, window.__sweep.inspect.direction || null] : null,
  armed: !!(window.__sweep && window.__sweep.armed),
  highlight: window.__lastHighlight || null,
  model: window.__lastModelSelection ? [window.__lastModelSelection.kind, window.__lastModelSelection.id] : null,
}));

async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}${TAG}.png`), timeout: 180000 });
  log(name, { page: await state(page), pane: await pane(page), errors: page.__errors.splice(0) });
}

async function selectFeature(page) {
  if (!(await page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${FEATURE}"]`).count())) {
    await page.locator('#navtree [data-nav-twisty="p:hub"]').first().click();
    await page.waitForTimeout(300);
  }
  const row = page.locator(`#navtree [data-nav-kind="feature"][data-nav-id="${FEATURE}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await settle(page, 3000);
}

async function sweepDag(page) {
  const dots = page.locator("svg.tv__rails circle.rail__dot");
  const n = Math.min(12, await dots.count());
  for (let i = 0; i < n; i++) await dots.nth(i).hover({ force: true }).catch(() => {});
  await page.mouse.move(4, 4);
  await page.waitForTimeout(1500);
}

async function steps(page, name, shots) {
  await listen(page);
  // (a)
  await selectFeature(page);
  await sweepDag(page);
  const a = await heard(page);
  // The page's selection, posted into the pane: the rail's row (a mirrored
  // `activate`, or `inspect feature`) and the model layer's dot (`model
  // select node`) -- one verb, once, since this handoff.
  log(name + " (a)", { selectPosts: a.filter((c) => /^rail activate$|^inspect feature |^model select node /.test(c)),
    posted: a.filter((c) => !/^hover |^highlight |^isolate |^filter-element|^model (lit|unlit|tint|anchors)/.test(c)),
    pane: await pane(page) });
  // (b)
  if (shots) await shot(page, "b1_feature_selected_before");
  await run(page, ["inspect", "clear"]);
  await settle(page, 2500);
  const b = await heard(page);
  log(name + " (b)", { posted: b.filter((c) => !/^hover |^highlight /.test(c)), page: await state(page), pane: await pane(page) });
  if (shots) await shot(page, "b2_pane_let_go_after");
  // (c)
  await page.locator("#leader-style-toggle").click();
  await settle(page, 2000);
  if (shots) await shot(page, "c1_leaders_on_before_grid_row");
  const before = await state(page);
  await page.evaluate((id) => {
    const cell = document.querySelector(`tr.tvrow[data-id="${id}"] td.tvcell--name`);
    if (cell) { cell.scrollIntoView({ block: "center" }); cell.click(); }
  }, GRID_ROW);
  await settle(page, 4000);
  await page.mouse.move(4, 4);
  await page.waitForTimeout(1500);
  const c = await heard(page);
  log(name + " (c)", { leadersBefore: before.seamLeaders, posted: c.filter((x) => !/^hover /.test(x)),
    page: await state(page), pane: await pane(page) });
  if (shots) await shot(page, "c2_grid_row_selected_after");
  // (d), nothing armed
  await selectFeature(page);
  await page.locator("#flyout-title").focus().catch(() => {});
  await page.keyboard.press("Escape");
  await settle(page, 1500);
  log(name + " (d) nothing armed", { page: await state(page), pane: await pane(page), posted: (await heard(page))
    .filter((x) => !/^hover |^highlight /.test(x)) });
  // (d), a pick armed: the end's own pick action in the tree's body.
  await selectFeature(page);
  const act = page.locator('#navtree .navtree__featurebody [data-kind="action"]').last();
  await act.click().catch((e) => log("arm", e.message));
  await page.waitForTimeout(3000);
  log(name + " (d) armed", { pane: await pane(page) });
  await page.keyboard.press("Escape");
  await settle(page, 2000);
  log(name + " (d) Esc while armed", { page: await state(page), pane: await pane(page), posted: (await heard(page))
    .filter((x) => !/^hover |^highlight /.test(x)) });
}

if (PHASE === "topology" || PHASE === "all") {
  const page = await open("topology=" + V2);
  await openPane(page);
  await page.locator(`#navtree [data-nav-kind="kinematic-model"][data-nav-id="${V2}"]`).first().click({ timeout: 10000 })
    .catch(async (e) => { log("studies row", e.message); await run(page, ["sweep", "latest"]); });
  await sweepReady(page);
  await steps(page, "topology", true);
  await page.close();
}
if (PHASE === "kinematic" || PHASE === "all") {
  const page = await open("kinematic=" + STUDY);
  await openPane(page);
  await sweepReady(page);
  await steps(page, "kinematic", false);
  await page.close();
}
await browser.close();
server.close();
