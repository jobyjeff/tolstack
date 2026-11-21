// Hand-run inspection probe for handoff the_viewer_says_nothing_about_itself
// (2026-11-20). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
//   node tests/debug_self_description_20261120.mjs --root <scratch repo root> --phase before|after [--shots <dir>]
//
// Photographs every state of the viewer and the 3D pane a reader can reach --
// each model with no study and with one, a node and an edge in the Preview,
// the kinematic page, a loose stack with and without a row, the legend, the
// pane idle, in sweep mode and with a feature armed, and the page with no
// data -- and prints every always-visible text block it can find, so the copy
// that describes the page can be read off the screen and not only the source.
// The server and the folder grant are debug_pitch_plate_20261120.mjs's; it
// writes nothing to any log.
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, extname, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const MAIN = "C:/workspace/tolstack";
const PHASE = flag("--phase") || "before";
const SHOTS = resolve(HERE, flag("--shots") || "docs/sessions/lessons/shots/the_viewer_says_nothing_about_itself");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
if (!flag("--root")) throw new Error("--root <scratch repo root> is required: this probe never serves the real data");
const SCRATCH = join(resolve(flag("--root")), "data");
const EMPTY = join(SHOTS, "..", "..", "..", "..", "..", "tmp", "empty_projection");
mkdirSync(EMPTY, { recursive: true });
const log = (label, value) => console.log(JSON.stringify({ [label]: value }));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = (empty) => [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", join(MAIN, "data", "meshes")],
  ["/tolstack/data/", empty ? EMPTY : join(SCRATCH, "projections", "viewer")],
];
function folderPath(rel) {
  const r = rel.replace(/^\/+/, "");
  if (r.startsWith("data/inbox/feature-identity")) return { full: join(SCRATCH, "inbox", r.slice(11)), write: false };
  if (r.startsWith("data/projections")) return { full: join(SCRATCH, "projections", r.slice(17)), write: false };
  if (r.startsWith("data/")) return { full: join(MAIN, r), write: false };
  return { full: join(HERE, r), write: false };
}
function serve(empty) {
  return new Promise((ok) => {
    const s = createServer(async (req, res) => {
      const u = new URL(req.url, "http://x");
      try {
        if (u.pathname.startsWith("/fs/")) {
          const target = folderPath(u.searchParams.get("p") || "");
          const verb = u.pathname.slice(4);
          if (verb === "stat") {
            const kind = existsSync(target.full) ? (statSync(target.full).isDirectory() ? "directory" : "file") : null;
            res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ kind }));
          } else if (verb === "list") {
            const out = readdirSync(target.full).map((name) => ({ name,
              kind: statSync(join(target.full, name)).isDirectory() ? "directory" : "file" }));
            res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(out));
          } else if (verb === "read") {
            res.writeHead(200).end(readFileSync(target.full));
          } else {
            res.writeHead(403).end("read-only");
          }
          return;
        }
        const path = decodeURIComponent(u.pathname);
        const mount = MOUNTS(empty).find(([prefix]) => path.startsWith(prefix));
        if (!mount) throw new Error("no mount");
        const full = join(mount[1], normalize(path.slice(mount[0].length)));
        if (!full.startsWith(mount[1] + sep) && full !== mount[1]) throw new Error("outside");
        const body = readFileSync(statSync(full).isDirectory() ? join(full, "index.html") : full);
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream",
          "cache-control": "no-cache" }).end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}
const server = await serve(false);
const url = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const frameOf = (page) => page.frames().find((f) => f.url().includes("/annotate/"));

async function open(query, base) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.__errors = [];
  page.on("pageerror", (e) => { page.__errors.push("pageerror: " + e.message.slice(0, 300)); });
  page.on("console", (m) => { if (m.type() === "error") page.__errors.push("console: " + m.text().slice(0, 300)); });
  await page.addInitScript(() => {
    try { localStorage.clear(); localStorage.setItem("tolstack.viewer.paneView", "both"); } catch (e) { /* none */ }
  });
  await page.goto(`${base || url}/tolstack/viewer/topology.html?${query}`, { waitUntil: "load" });
  await page.waitForTimeout(2500);
  return page;
}
async function openPane(page) {
  if (!(await page.locator("#annotate-flyout[open]").count())) {
    const handle = page.locator("#pane-handle");
    if (!(await handle.isVisible())) { log("pane", "no handle"); return false; }
    await handle.click({ timeout: 15000 });
  }
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const f = Array.from(document.querySelectorAll("iframe")).map((x) => x.contentWindow).find((w) => w && w.AnnotateApp);
    return !!f && !!f.__embedTree;
  }, null, { timeout: 120000 }).catch(() => log("pane", "no tree after 120s"));
  await page.waitForTimeout(4000);
  return true;
}

// Every visible element whose OWN text (not its children's) reads as a
// sentence: three words or more. The screen's copy, for the lesson's table.
const COPY = () => {
  const seen = new Set(), out = [];
  const walk = (doc, where) => {
    for (const el of doc.querySelectorAll("body *")) {
      if (["SCRIPT", "STYLE", "OPTION", "svg", "text", "tspan", "title"].includes(el.tagName)) continue;
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" ")
        .replace(/\s+/g, " ").trim();
      if (own.split(" ").length < 4) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      if (el.closest("dialog:not([open])") || el.closest("details:not([open]) > :not(summary)")) continue;
      const key = where + own;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(where + " " + (el.id ? "#" + el.id : el.className ? "." + String(el.className).split(" ")[0] : el.tagName) + ": " + own.slice(0, 220));
    }
  };
  walk(document, "page");
  const f = Array.from(document.querySelectorAll("iframe")).find((x) => x.contentDocument);
  if (f && f.closest("dialog[open]")) walk(f.contentDocument, "pane");
  return out;
};
async function shot(page, name) {
  await page.screenshot({ path: join(SHOTS, `${PHASE}_${name}.png`), timeout: 180000 });
  log(name, { copy: await page.evaluate(COPY).catch((e) => ["copy failed: " + e.message]), errors: page.__errors.splice(0) });
}
const clickNav = async (page, kind, id) => {
  const row = page.locator(`#navtree [data-nav-kind="${kind}"][data-nav-id="${id}"]`).first();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(2500);
};

// --- the states ---------------------------------------------------------------
const V1 = "vpa_pitch_linkage", V2 = "vpa_end_stop_v2";
const STUDY = "pitch_system_end_stop_minus7";
const KIN = "vpa_pitch_linkage_blade_pitch_at_the_stops";

{
  const page = await open(`topology=${V1}`);
  await shot(page, "v1_no_study");
  const facts = await page.evaluate(async (v1) => {
    const doc = await (await fetch("/tolstack/data/topologies.json")).json();
    const t = doc.topologies.find((x) => x.id === v1);
    const res = await (await fetch("/tolstack/data/results.json")).json();
    const loose = window.ViewerApp.looseStacks(doc, res).map((s) => s.id);
    const stack = res.stacks.find((s) => s.id === loose[0]);
    return { branch: (t.branch_nodes || [])[0], node: t.nodes[0].id, edge: t.edges[0].id, loose,
      element: stack && stack.elements && stack.elements[0] && stack.elements[0].id };
  }, V1);
  log("facts", facts);
  // The empty results pane's picker, where there is one: choose a study by it.
  if (await page.locator("select.tvtotals__pick").count()) {
    await page.locator("select.tvtotals__pick").selectOption(STUDY);
    await page.waitForTimeout(3000);
    log("picked by the picker", await page.evaluate(() => location.search));
    await shot(page, "v1_study_via_picker");
  }
  // The Preview with a node and with an edge.
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V1}&node=${facts.node}`);
  await page.waitForTimeout(2500);
  await shot(page, "v1_node_selected");
  if (facts.branch) {
    const b = typeof facts.branch === "string" ? facts.branch : facts.branch.id || facts.branch.node;
    await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V1}&node=${b}`);
    await page.waitForTimeout(2500);
    await shot(page, "v1_branch_node_selected");
  }
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V1}&edge=${facts.edge}`);
  await page.waitForTimeout(2500);
  await shot(page, "v1_edge_selected");
  await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V1}&study=${STUDY}`);
  await page.waitForTimeout(3000);
  await shot(page, "v1_study");
  await page.locator("#legend-toggle").click();
  await page.waitForTimeout(800);
  await shot(page, "v1_legend_open");
  await page.locator("#legend-close").click();
  if (await page.locator("#worksheet-toggle").isVisible()) {
    await page.locator("#worksheet-toggle").click();
    await page.waitForTimeout(1500);
    await shot(page, "v1_worksheet_open");
    await page.locator("#worksheet-close").click();
  }
  await page.goto(`${url}/tolstack/viewer/topology.html?kinematic=${KIN}`);
  await page.waitForTimeout(3000);
  await shot(page, "kinematic");
  for (const id of facts.loose.slice(0, 2)) {
    await page.goto(`${url}/tolstack/viewer/topology.html?stack=${id}`);
    await page.waitForTimeout(2500);
    await shot(page, `stack_${id}`);
  }
  if (facts.element) {
    await page.goto(`${url}/tolstack/viewer/topology.html?stack=${facts.loose[0]}&element=${facts.element}`);
    await page.waitForTimeout(2500);
    await shot(page, `stack_${facts.loose[0]}_element`);
  }
  await page.close();
}
{
  const page = await open(`topology=${V2}`);
  await shot(page, "v2_no_study");
  await page.close();
}
{
  // The 3D pane: idle with nothing picked, a study picked, a feature armed.
  const page = await open(`topology=${V1}`);
  if (await openPane(page)) {
    await shot(page, "pane_idle");
    await clickNav(page, "study", STUDY);
    await page.waitForTimeout(3000);
    await shot(page, "pane_study");
    const fid = await page.evaluate(() => {
      const r = document.querySelector('#navtree [data-nav-kind="feature"]');
      return r && r.getAttribute("data-nav-id");
    });
    if (!fid) {
      const part = await page.evaluate(() => {
        const t = document.querySelector('#navtree [data-nav-twisty^="p:"]');
        return t && t.getAttribute("data-nav-twisty");
      });
      if (part) await page.locator(`#navtree [data-nav-twisty="${part}"]`).first().click();
      await page.waitForTimeout(600);
    }
    const fid2 = fid || await page.evaluate(() => {
      const r = document.querySelector('#navtree [data-nav-kind="feature"]');
      return r && r.getAttribute("data-nav-id");
    });
    if (fid2) {
      await clickNav(page, "feature", fid2);
      await page.waitForTimeout(3000);
      await shot(page, "pane_feature_selected");
    }
    // The pane's own Help, and the pane alone.
    const help = frameOf(page) && frameOf(page).locator(".an__detail button", { hasText: "Help" }).first();
    if (help && await help.count()) {
      await help.click();
      await page.waitForTimeout(800);
      await shot(page, "pane_help_open");
    }
  }
  await page.close();
}
{
  const empty = await serve(true);
  const page = await open(`topology=${V1}`, `http://127.0.0.1:${empty.address().port}`);
  await shot(page, "no_data");
  await page.close();
  empty.close();
}
{
  const page = await open("mock=1");
  await shot(page, "mock");
  await page.close();
}
await browser.close();
server.close();
