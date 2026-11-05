// Debug script (handoff the_annotator_reads_a_nodes_declared_face, 2026-11-05):
// opens the annotator on a pitch-plate edge, serving THIS tree's apps/ over the
// live 8000 mount's data, and screenshots it. Run by hand.
//
//   node tests/debug_declared_face_shot.mjs <topology> <study> <edge> <out.png>
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright, closeEveryBrowser } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const APPS = normalize(join(HERE, "..", "apps"));
const [topology, study, edge, out] = process.argv.slice(2);
const BASE = "http://127.0.0.1:8000/tolstack";
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css" };
const { chromium } = await loadPlaywright();
let browser = null;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await launchBrowser(chromium, { channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.route(/\/tolstack\/(annotate|viewer)\/[^?]*\.(js|html|css)(\?.*)?$/, (route) => {
    const rel = new URL(route.request().url()).pathname.replace(/^\/tolstack\//, "");
    const file = join(APPS, rel);
    if (!existsSync(file)) return route.continue();
    const ext = file.slice(file.lastIndexOf("."));
    return route.fulfill({ status: 200, contentType: TYPES[ext], body: readFileSync(file) });
  });
  await page.goto(`${BASE}/annotate/index.html?topology=${topology}&study=${study}&edge=${edge}`,
    { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(20000);
  await page.screenshot({ path: out });
} finally {
  await closeEveryBrowser();
}
