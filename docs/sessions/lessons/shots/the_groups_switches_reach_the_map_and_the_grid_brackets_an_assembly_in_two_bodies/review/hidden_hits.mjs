// Review probe (REVIEW_20261120_the_groups_switches_...): does a container the Groups
// popover hides still take a real pointer? node hidden_hits.mjs <worktree> <data root> <shots dir>
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
const [WT, DATA, SHOTS] = process.argv.slice(2);
mkdirSync(SHOTS, { recursive: true });
const { takeTheBrowserSlot, launchBrowser, loadPlaywright } =
  await import("file:///" + WT.replace(/\\/g, "/") + "/scripts/browser_runner.mjs");
takeTheBrowserSlot();
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA : WT, rel);
    try { const b = readFileSync(full); res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" }); res.end(b); }
    catch { res.writeHead(404); res.end("nf"); }
  });
  s.listen(0, "127.0.0.1", () => ok(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const { chromium } = await loadPlaywright();
const browser = await launchBrowser(chromium, { channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1700, height: 1200 } });
const open = async () => {
  await page.goto(`${url}/apps/viewer/topology.html?topology=vpa_end_stop_v2`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
  await page.waitForTimeout(800);
};
await open();
await page.evaluate(() => localStorage.clear());
await open();
const setOff = async (kind) => {
  if ((await page.locator("#group-kinds").getAttribute("open")) === null) await page.locator("#group-kinds-toggle").click();
  const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
  if (await box.isChecked()) await box.click({ noWaitAfter: true });
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.mouse.click(5, 1190);
  await page.waitForTimeout(300);
};
const state = () => page.evaluate(() => ({
  hot: document.querySelectorAll("#topopane [class*='--hot']").length,
  selectedRows: document.querySelectorAll(".tvrow--selected").length,
  href: location.search,
}));
// A point inside the first part box (its hit), away from pins.
const target = (sel) => page.evaluate((sel) => {
  for (const el of document.querySelectorAll("#topopane " + sel)) {
    const r = el.getBoundingClientRect();
    for (let fx = 0.1; fx < 1; fx += 0.1) for (let fy = 0.2; fy < 1; fy += 0.2) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (document.elementFromPoint(x, y) === el) return { x, y, id: el.parentNode.getAttribute("data-part") || "" };
    }
  }
  return null;
}, sel);
const probe = async (kind, sel, shot) => {
  await open();
  await page.evaluate(() => localStorage.clear());
  await open();
  await setOff(kind);
  const t = await target(sel);
  if (!t) { console.log(JSON.stringify({ kind, sel, none: true })); return; }
  const before = await state();
  await page.mouse.move(t.x, t.y);
  await page.waitForTimeout(300);
  const under = await page.evaluate(({ x, y }) => {
    const e = document.elementFromPoint(x, y);
    return e ? (e.getAttribute("class") || e.tagName) + " vis=" + getComputedStyle(e).visibility + " title=" + ((e.querySelector && e.querySelector("title")) ? e.querySelector("title").textContent : "") : null;
  }, t);
  const hover = await state();
  await page.screenshot({ path: join(SHOTS, shot + "_hover.png") });
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  const after = await state();
  await page.screenshot({ path: join(SHOTS, shot + "_click.png") });
  console.log(JSON.stringify({ kind, sel, at: t, under, before, hover, after }));
};
await probe("parts", "rect.map__boxhit", "parts_off");
await probe("bodies", "rect.map__districtfield", "bodies_off");
await probe("assemblies", "rect.map__outlinehit", "assemblies_off");

await browser.close();
server.close();
