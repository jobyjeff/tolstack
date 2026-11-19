// Hand-run inspection probe for handoff a_joints_preview_says_what_the_joint_is
// (2026-11-18). NOT a tier -- pytest never collects it. It takes the machine's
// browser slot itself.
//
//   node tests/debug_joints_preview_20261118.mjs --data <scratch data dir> [--shots <dir>]
//
// --data is a scratch copy of the main checkout's data/ whose topology
// projection was rebuilt from this branch (`build_topology_projection.py
// --data-root <it> --allow-older-tree`), so the Preview reads this branch's
// notes. Nothing it serves is written to. It selects the hub / blade rotary
// joint on the map, shots the Preview at 3840 and at 1920, and prints the
// chips and the note the Preview shows.
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname, resolve, dirname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
const MAIN = "C:/workspace/tolstack";
if (!flag("--data")) throw new Error("--data <scratch data dir> is required");
const DATA = resolve(flag("--data"));
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/a_joints_preview_says_what_the_joint_is");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const MOUNTS = [
  ["/tolstack/viewer/", join(HERE, "apps", "viewer")],
  ["/tolstack/annotate/", join(HERE, "apps", "annotate")],
  ["/tolstack/data/meshes/", join(MAIN, "data", "meshes")],
  ["/tolstack/data/", join(DATA, "projections", "viewer")],
];
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const u = new URL(req.url, "http://x");
    for (const [prefix, root] of MOUNTS) {
      if (!u.pathname.startsWith(prefix)) continue;
      const full = normalize(join(root, decodeURIComponent(u.pathname.slice(prefix.length))));
      if (!full.startsWith(normalize(root) + sep) && full !== normalize(root)) break;
      if (existsSync(full) && statSync(full).isFile()) {
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" })
          .end(readFileSync(full));
        return;
      }
    }
    res.writeHead(404).end("not found");
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;

const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
try {
  for (const width of [3840, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: Math.round(width * 9 / 16) } });
    await page.goto(`${url}/tolstack/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 60000 });
    // The hub / blade rotary joint's connector on the map.
    const joint = await page.evaluate(() => {
      const gs = Array.from(document.querySelectorAll("#topopane g.map__connector[data-joint]"));
      const hit = gs.find((g) => /hub/.test(g.getAttribute("data-joint")) && /blade_root/.test(g.getAttribute("data-joint")));
      return hit ? hit.getAttribute("data-joint") : null;
    });
    console.log(JSON.stringify({ width, joint }));
    if (!joint) throw new Error("no hub / blade_root connector on the map");
    await page.locator(`#topopane g.map__connector[data-joint="${joint}"]`).first().click({ force: true });
    await page.waitForTimeout(1500);
    const pane = await page.evaluate(() => {
      const p = document.querySelector(".detail__previewbody") || document.querySelector("#detail") || document.body;
      return {
        chips: Array.from(p.querySelectorAll(".chip--kind")).map((c) => c.textContent),
        notes: Array.from(p.querySelectorAll(".detail__note")).map((n) => n.textContent),
      };
    });
    console.log(JSON.stringify({ width, pane }));
    await page.screenshot({ path: join(SHOTS, `rotary_joint_selected_${width}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
