// Hand-run inspection probe for handoff
// the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies
// (2026-11-19). NOT a tier -- pytest never collects it. It takes the
// machine's browser slot itself.
//
//   node tests/debug_groups_switches_20261119.mjs --repo <root with data/> [--shots <dir>]
//
// Serves THIS tree's apps/ with data/ from `--repo`. On v2's page, Side by
// side: the map with each Groups switch off in turn and all three off, ticked
// in the popover, with every pin's place and each container's visibility
// measured; then a reload and an old stored value. Then the race-rows fixture
// (apps/viewer/tests.js's copy of its projection) drawn into the grid's own
// region at 3840 and at 1536: as the handoff first asked (bodies and
// assemblies both, nested), and as shipped (one at a time).
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();

const HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };
if (!flag("--repo")) throw new Error("--repo <root with data/> is required");
const DATA_REPO = resolve(flag("--repo"));
const SHOTS = resolve(HERE, flag("--shots") ||
  "docs/sessions/lessons/shots/the_groups_switches_reach_the_map_and_the_grid_brackets_an_assembly_in_two_bodies");
if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const V2 = "vpa_end_stop_v2";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };

const source = readFileSync(join(HERE, "apps", "viewer", "tests.js"), "utf8");
const literal = source.slice(source.indexOf("// BEGIN raceRowsProjection"), source.indexOf("// END raceRowsProjection"))
  .split("var RACE_ROWS_PROJECTION = ")[1];
const FIXTURE = JSON.parse(literal.slice(0, literal.lastIndexOf(";")));

const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const full = join(rel.startsWith("data/") ? DATA_REPO : HERE, rel);
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
const log = [];
const say = (line) => { console.log(line); log.push(line); };

// Every pin's centre, and whether each kind's containers are visible.
const measure = (page) => page.evaluate(() => {
  const pins = {};
  document.querySelectorAll("#topopane g.map__pin").forEach((g, i) => {
    const r = g.getBoundingClientRect();
    pins[(g.getAttribute("data-map-id") || "") + "#" + i] = [Math.round(r.left * 100) / 100, Math.round(r.top * 100) / 100];
  });
  const seen = (sel) => {
    const els = Array.from(document.querySelectorAll("#topopane " + sel));
    return { n: els.length, visible: els.filter((e) => getComputedStyle(e).visibility !== "hidden").length };
  };
  return { pins, svg: document.querySelector("#topopane svg.tv__map").getAttribute("class"),
    districts: seen("rect.map__district"), districtNames: seen("text.map__bodyname"),
    outlines: seen("rect.map__assembly, rect.map__outline"), boxes: seen("rect.map__box"),
    partNames: seen("g.map__partname"), counts: window.ViewerApp.mapCounts(window.ViewerApp.lastMapLight.geometry),
    summary: document.querySelector("#group-kinds-toggle").textContent,
    boxesTicked: Array.from(document.querySelectorAll("#group-kinds input")).map((b) => [b.getAttribute("data-kind"), b.checked]) };
});
const setKind = async (page, kind, on) => {
  if (!(await page.locator("#group-kinds").getAttribute("open") !== null)) {
    await page.locator("#group-kinds-toggle").click();
  }
  const box = page.locator(`#group-kinds input[data-kind="${kind}"]`);
  if ((await box.isChecked()) !== on) await box.click();
  await page.waitForTimeout(500);
};

try {
  // --- v2's map, each switch off in turn ---------------------------------
  {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
    page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
    await page.addInitScript(() => {
      try { localStorage.setItem("tolstack.viewer.paneView", "both"); } catch (e) { /* no storage */ }
    });
    await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.evaluate(() => { try { localStorage.removeItem("tolstack.viewer.groupKinds"); } catch (e) { /* none */ } });
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForTimeout(800);
    const base = await measure(page);
    say(`v2 all on: ${JSON.stringify({ ...base, pins: Object.keys(base.pins).length })}`);
    await page.locator("#topopane").screenshot({ path: join(SHOTS, "v2_map_all_on.png") });
    const same = (a, b) => Object.keys(a.pins).every((k) => b.pins[k] && b.pins[k][0] === a.pins[k][0] && b.pins[k][1] === a.pins[k][1]) &&
      Object.keys(a.pins).length === Object.keys(b.pins).length;
    for (const kind of ["bodies", "assemblies", "parts"]) {
      await setKind(page, kind, false);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(300);
      const m = await measure(page);
      say(`v2 ${kind} off: svg "${m.svg}", pins unchanged ${same(base, m)}, counts same ${JSON.stringify(m.counts) === JSON.stringify(base.counts)}, ` +
        `districts ${JSON.stringify(m.districts)} names ${JSON.stringify(m.districtNames)} outlines ${JSON.stringify(m.outlines)} ` +
        `boxes ${JSON.stringify(m.boxes)} part names ${JSON.stringify(m.partNames)}; "${m.summary}"`);
      await page.locator("#topopane").screenshot({ path: join(SHOTS, `v2_map_${kind}_off.png`) });
      await setKind(page, kind, true);
    }
    for (const kind of ["bodies", "assemblies", "parts"]) await setKind(page, kind, false);
    await page.mouse.move(5, 5);
    const none = await measure(page);
    say(`v2 all off: svg "${none.svg}", pins unchanged ${same(base, none)}; "${none.summary}"`);
    await page.locator("#topopane").screenshot({ path: join(SHOTS, "v2_map_all_off.png") });
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForTimeout(800);
    const reloaded = await measure(page);
    say(`v2 after a reload: svg "${reloaded.svg}", ticked ${JSON.stringify(reloaded.boxesTicked)}`);
    await page.evaluate((id) => {
      const all = {}; all[id] = ["parts"];
      localStorage.setItem("tolstack.viewer.groupKinds", JSON.stringify(all));
    }, V2);
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForTimeout(800);
    const old = await measure(page);
    say(`v2 an old stored value (parts off, no assemblies): svg "${old.svg}", ticked ${JSON.stringify(old.boxesTicked)}, outlines ${JSON.stringify(old.outlines)}`);
    await page.evaluate(() => localStorage.removeItem("tolstack.viewer.groupKinds"));
    await page.close();
  }

  // --- the fixture's grid -------------------------------------------------
  for (const [label, width, height] of [["3840", 3840, 2160], ["1536", 1536, 864]]) {
    // At 1536 the page is drawn at twice the pixels, so a cap's dots read.
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 2000 ? 2 : 1 });
    page.on("pageerror", (e) => say(`PAGEERR ${e.message.slice(0, 300)}`));
    await page.addInitScript(() => {
      try { localStorage.setItem("tolstack.viewer.paneView", "both"); } catch (e) { /* no storage */ }
    });
    await page.goto(`${url}/apps/viewer/topology.html?topology=${V2}`, { waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__map", { timeout: 30000 });
    await page.waitForTimeout(800);
    for (const [name, kinds, outer, nested, folded] of [
      ["nested", { bodies: true, assemblies: true, parts: true }, null, true, null],
      ["bodies", { bodies: true, assemblies: true, parts: true }, "bodies", false, null],
      ["assemblies", { bodies: true, assemblies: true, parts: true }, "assemblies", false, null],
      ["assemblies_folded", { bodies: true, assemblies: true, parts: true }, "assemblies", false, { bearing_a: true }],
    ]) {
      const info = await page.evaluate(({ proj, kinds, outer, nested, folded }) => {
        const VA = window.ViewerApp;
        const real = document.querySelector("#topogrid");
        const r = real.getBoundingClientRect();
        let host = document.getElementById("probe-grid");
        if (!host) {
          host = document.createElement("div");
          host.id = "probe-grid";
          real.parentNode.appendChild(host);
        }
        host.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:60;background:var(--bg);overflow:auto`;
        const keepKinds = VA.gridGroupKinds;
        const keepLight = VA.lastMapLight;
        if (nested) VA.gridGroupKinds = (on) => Object.assign({}, on);
        const mapHost = document.createElement("div");
        mapHost.style.cssText = "position:fixed;left:-5000px;top:0;width:800px;height:400px";
        document.body.appendChild(mapHost);
        try {
          VA.renderTopoPane(mapHost, { topoProj: proj, gridRoot: host, groupKinds: kinds, gridOuter: outer,
            collapsedAssemblies: folded, study: null, crops: null, onSelect() {}, onToggleAssembly() {} });
        } finally {
          VA.gridGroupKinds = keepKinds;
        }
        if (VA.releaseMap) VA.releaseMap(mapHost);
        mapHost.remove();
        VA.lastMapLight = keepLight;
        const labels = Array.from(host.querySelectorAll(".tvbrace__label")).map((n) => {
          const b = n.getBoundingClientRect();
          return [n.textContent, Math.round(b.left - r.left), Math.round(b.top - r.top), Math.round(b.width)];
        });
        const folds = Array.from(host.querySelectorAll("button.tvasm__caret")).map((n) => {
          const b = n.getBoundingClientRect();
          return [n.getAttribute("data-assembly-fold"), Math.round(b.left - r.left), Math.round(b.top - r.top), n.getAttribute("title")];
        });
        return { width: Math.round(r.width), labels, folds,
          brackets: Array.from(host.querySelectorAll(".tvbrace--top")).map((n) => n.getAttribute("data-brace")) };
      }, { proj: FIXTURE, kinds, outer, nested, folded });
      say(`fixture grid ${label} ${name}: region ${info.width}px; brackets ${JSON.stringify(info.brackets)}`);
      say(`  labels ${JSON.stringify(info.labels)}`);
      say(`  folds ${JSON.stringify(info.folds)}`);
      await page.locator("#probe-grid").screenshot({ path: join(SHOTS, `fixture_grid_${name}_${label}.png`) });
    }
    await page.close();
  }
} finally {
  writeFileSync(join(SHOTS, "probe_log.txt"), log.join("\n") + "\n", "utf8");
  await browser.close();
  server.close();
}
