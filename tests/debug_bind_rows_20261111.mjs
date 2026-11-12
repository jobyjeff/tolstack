// Hand-run probe (one_selection_one_hover_and_leaders_off, 2026-11-11): why
// does a selected feature in bind mode show no element rows under it? Opens
// the pane on the P2 study, goes to a chain study (bind mode), selects the
// pitch link's lower centre, and prints the pane's tree keys, the edges the
// page thinks meet the node, and what the slot holds. Not a tier.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_REPO = "C:/workspace/tolstack";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : HERE, rel);
    try { res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" }); res.end(readFileSync(full)); }
    catch { res.writeHead(404); res.end("not found"); }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const log = (k, v) => console.log(JSON.stringify({ [k]: v }));
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => log("pageerror", e.message));
  await page.goto(`${url}/apps/viewer/topology.html?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops`, { waitUntil: "load" });
  await page.waitForSelector("#pane-handle:visible", { timeout: 30000 });
  await page.locator("#pane-handle").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 15000 });
  await page.waitForFunction(() => {
    const w = document.querySelector("#annotate-flyout iframe")?.contentWindow;
    return w && w.AnnotateApp && w.__embedTree;
  }, null, { timeout: 120000 });
  // A chain study: bind mode.
  const study = await page.evaluate(() => {
    const t = window.ViewerApp.findTopology(window.ViewerApp.demoTopologyProjection ? null : null, null);
    return null;
  });
  const chain = page.locator('#navtree [data-nav-kind="study"]').first();
  await chain.click();
  await page.waitForTimeout(4000);
  const mode = await page.evaluate(() => {
    const w = document.querySelector("#annotate-flyout iframe").contentWindow;
    return { sweep: !!w.__sweep, tree: w.__embedTree && w.__embedTree.mode, rows: (w.__embedTree.rows || []).map((r) => r.key).slice(0, 30) };
  });
  log("mode", mode);
  await page.locator('#navtree [data-nav-twisty="p:pitch_link"]').first().click().catch(() => {});
  await page.locator('#navtree [data-nav-kind="feature"][data-nav-id="pitch_link@pitch_link_lower_sphere_centre"]').first().click();
  await page.waitForTimeout(3000);
  const out = await page.evaluate(() => {
    const VA = window.ViewerApp;
    const w = document.querySelector("#annotate-flyout iframe").contentWindow;
    const tree = w.__embedTree;
    const topo = VA.findTopology(null, null);
    const row = document.querySelector('#navtree [data-nav-kind="feature"][data-nav-id="pitch_link@pitch_link_lower_sphere_centre"]');
    const slot = row && row.parentNode.querySelector(".navtree__scene");
    const index = VA.topologyIndex(VA.lastTopoRender ? null : null);
    return {
      treeKeys: (tree.rows || []).map((r) => r.key + (typeof r.head === "string" ? " [head]" : "")),
      rowClasses: row && row.className,
      slot: slot ? slot.innerHTML.slice(0, 600) : null,
      hasTwisty: !!(row && row.querySelector(".navtree__twisty")),
      twistyOpen: row && row.querySelector(".navtree__twisty") && row.querySelector(".navtree__twisty").getAttribute("aria-expanded"),
      rowsFor: VA.sceneRowsForFeature(tree, "pitch_link_lower_sphere_centre", ["pitch_link_length"]).map((r) => r.key),
      paneRail: Array.from(w.document.querySelectorAll("#element-list li")).map((n) => n.className + " edge=" + n.dataset.edge),
    };
  });
  log("probe", out);
  await page.close();
} finally {
  await browser.close();
  server.close();
}
