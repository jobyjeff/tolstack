// Debug script (rendering-failure investigation, 2026-09-09).
// Boots apps/viewer/topology.html in a real Chrome through the REAL, non-mock
// boot path, with FsaAdapter swapped for a MemoryAdapter seeded with the REAL
// data/projections/viewer/{topologies,results,crops}.json — the combination no
// test tier covers (?mock=1 = fixtures; node tier = DOM shim). Captures page
// errors, unhandled rejections and console output, then reports what the DAG
// pane actually contains.
//
//   node tests/debug_topology_real_render.mjs
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize, sep } from "node:path";

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const APP_DIR = join(REPO, "apps", "viewer");

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png",
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = normalize(urlPath).replace(/^[/\\]+/, "");
        const full = join(APP_DIR, rel);
        if (full !== APP_DIR && !full.startsWith(APP_DIR + sep)) {
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
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const read = (name) =>
  readFile(join(REPO, "data", "projections", "viewer", name), "utf8").then(JSON.parse);

const [topologies, results, crops] = await Promise.all([
  read("topologies.json"), read("results.json"), read("crops.json"),
]);

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}/topology.html`;

let browser;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await chromium.launch({ channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on("pageerror", (e) => console.log("PAGEERROR:", e.stack || String(e)));
page.on("console", (m) => console.log(`CONSOLE[${m.type()}]:`, m.text()));

await page.goto(url, { waitUntil: "load" });
await page.evaluate(() => {
  window.__REJECTIONS__ = [];
  window.addEventListener("unhandledrejection", (ev) => {
    window.__REJECTIONS__.push(String((ev.reason && ev.reason.stack) || ev.reason));
  });
});

// Swap FsaAdapter for a MemoryAdapter carrying the REAL three projections, then
// re-boot through the REAL (non-mock) branch of boot().
await page.evaluate(({ topologies, results, crops }) => {
  const VA = window.ViewerApp;
  const make = () => new VA.MemoryAdapter({
    startState: VA.STATE.READY,
    topologies, results, crops, images: {}, texts: {},
  });
  const Fake = function () { return make(); };
  Fake.isSupported = () => true;
  VA.FsaAdapter = Fake;
  VA.bootTopology();
}, { topologies, results, crops });

await page.waitForTimeout(2000);

const report = await page.evaluate(() => ({
  rejections: window.__REJECTIONS__,
  bannerText: (document.getElementById("banner") || {}).textContent || "",
  navRows: document.querySelectorAll("[data-nav-kind]").length,
  paneRows: document.querySelectorAll("tr.tvrow").length,
  paneHTML: ((document.getElementById("topopane") || {}).innerHTML || "").slice(0, 500),
  totalsText: ((document.getElementById("totals") || {}).textContent || "").slice(0, 200),
  toolbarText: ((document.getElementById("toolbar") || {}).textContent || "").slice(0, 200),
}));
console.log("\n--- report ---");
console.log("unhandled rejections:", report.rejections.length ? report.rejections : "none");
console.log("banner:", report.bannerText.slice(0, 300));
console.log("nav rows:", report.navRows);
console.log("pane tr.tvrow count:", report.paneRows);
console.log("toolbar:", report.toolbarText);
console.log("totals:", report.totalsText);
console.log("pane HTML head:", report.paneHTML);

// If the pane is empty, click Reload (the banner's own button) and re-check —
// the reported symptom says Reload no-ops.
await browser.close();
server.close();
