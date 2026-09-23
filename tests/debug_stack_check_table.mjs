// Hand-run inspection probe for handoff stack_page_check_card_balance_sheet
// (2026-09-22). NOT a tier -- pytest never collects it and no runner calls it.
// Its job is the two things that handoff's definition of done asks for and no
// assertion can carry: the before/after screenshots, and the PAGE HEIGHT the
// restructure is judged by (10,634 px on `hub_bearing_thermal_fit_m1` at
// 1600px, measured 2026-09-22 by the issue that staged this work).
//
//   node tests/debug_stack_check_table.mjs --repo C:/workspace/tolstack
//   node tests/debug_stack_check_table.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons --phase before
//
// `--repo` is the worktree escape hatch every real-data probe in this repo
// takes: data/ is gitignored and lives only in the main checkout, so the static
// server below serves /data/... from there while every app file comes from THIS
// tree. Without --shots it only prints what it measured.
//
// `--phase before|after` works the way tests/debug_typography_pass.mjs's does:
// run it on the baseline tree, change the renderer, run it again, and the two
// images land beside each other under identical clips and an identical
// viewport. The height numbers printed by the two runs are the deliverable.
//
// WHICH STACKS, and why two. `hub_bearing_thermal_fit_m1` is the page the issue
// measured -- sixteen generated checks over eight elements and NO paths, so it
// is the pure checks case. `tan_link_to_pitch_plate` is the other shape: six
// checks AND three paths, which is the only way to see whether the two kinds of
// row read as different things in the one table they now share. `m2` is shot
// too because the handoff names it, and it is m1's sibling stack.
//
// The three are reached by nav click where the live nav offers them and by a
// direct render where it does not: VA.looseStacks hides a stack that a topology
// re-expresses, and `tan_link_to_pitch_plate` is one of those -- see the
// `openStack` comment below.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TREE = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
const DATA_REPO = resolve(flag("--repo") || TREE);
const SHOTS = flag("--shots") ? resolve(TREE, flag("--shots")) : null;
if (SHOTS && !existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
const PHASE = flag("--phase") || "after";
if (!["before", "after"].includes(PHASE)) {
  console.error(`--phase must be "before" or "after", not ${JSON.stringify(PHASE)}`);
  process.exit(2);
}

const PREFIX = "LESSONS_20260922_stack_page_check_card_balance_sheet";
const STACKS = [
  ["1_m1", "hub_bearing_thermal_fit_m1"],
  ["2_m2", "hub_bearing_thermal_fit_m2"],
  ["3_tan_link", "tan_link_to_pitch_plate"],
];
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".md": "text/markdown",
};

// The repo-root static server both apps' transport probes match: /data/... from
// DATA_REPO, everything else from this tree.
function startServer() {
  const server = createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "");
    const root = rel.startsWith("data/") ? DATA_REPO : TREE;
    const full = join(root, rel);
    try {
      const body = readFileSync(full);
      res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
    }
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

const notes = [];
const say = (line) => { notes.push(line); console.log(line); };
const firstLine = (err) => String((err && err.message) || err).split("\n")[0].trim();

// A stack leaf if the nav offers one, and a direct `VA.renderStack` if it does
// not. Both routes paint into the SAME `#stackview` node through the same
// renderer, so a shot taken either way is the same surface -- what the nav
// decides is only which stacks a READER can reach (VA.looseStacks hides every
// stack a topology re-expresses, which is all but the two thermal fits), and
// this probe is about the shapes the handoff names rather than the two the
// rail happens to list.
//
// The projections are fetched rather than read off the app: `state` lives
// inside topology_app.js's IIFE and is private on purpose, and reaching into
// it would be a probe asserting on internals it has no business knowing.
// topology_app.js re-paints on `resize` behind a 150ms debounce, and taking a
// screenshot of an element taller than the viewport resizes it. So a direct
// render issued straight after a shot is torn down ~40ms later by a repaint
// the probe itself scheduled -- the same race
// tests/debug_typography_pass.mjs's `resizeTo` waits out, arriving here by a
// different route. Measured on the first --shots run of this probe: the
// tan_link render came back showing M2. 450ms is that file's number, copied
// for the same debounce.
const REPAINT_SETTLE = 450;

async function resizeTo(page, size) {
  await page.setViewportSize(size);
  await page.waitForTimeout(REPAINT_SETTLE);
}

async function openStack(page, id, title) {
  const leaf = `[data-nav-kind="stack"][data-nav-id="${id}"]`;
  if (await page.locator(leaf).count()) {
    await page.locator(leaf).click();
  } else {
    await page.waitForTimeout(REPAINT_SETTLE);
    await page.evaluate(async (stackId) => {
      const VA = window.ViewerApp;
      const load = async (name) =>
        (await fetch(`/data/projections/viewer/${name}`)).json();
      const results = await load("results.json");
      const crops = await load("crops.json");
      const proj = results.stacks.filter((s) => s.id === stackId)[0];
      if (!proj) throw new Error(`no ${stackId} in the live results projection`);
      ["toolbar", "topojoint", "topopane", "totals"].forEach((nodeId) => {
        document.getElementById(nodeId).style.display = "none";
      });
      const root = document.getElementById("stackview");
      root.style.display = "";
      VA.renderStack(root, proj, crops, {});
    }, id);
  }
  await page.waitForSelector("#stackview tr.el-row", { timeout: 20000 });
  await page.waitForTimeout(150);
  // The page really is the page this shot is named after. Without this a
  // silently-lost render reports the PREVIOUS stack's height and writes the
  // previous stack's picture under this stack's filename, and both look
  // entirely plausible.
  await page.waitForFunction((want) => {
    const head = document.querySelector("#stackview h2.sv__title");
    return !!head && head.textContent === want;
  }, title, { timeout: 10000 });
}

// What the restructure is judged by. `#stackview` is the scrolling pane the
// stack page paints into, so its `scrollHeight` is the page a reader scrolls --
// the 10,634 px the issue reported. The table's `scrollWidth` against its
// scrollport is deliverable 4's measurement: a layout that needs horizontal
// room it does not have is a real input to
// docs/strategy/BRIEF_20260916_topology_page_number_reach.md, and the honest
// way to say so is a number.
async function measure(page) {
  return page.evaluate(() => {
    const pane = document.querySelector("#stackview");
    // The two tables SEPARATELY. A comma selector returns whichever comes
    // first in document order, which is always the elements table -- so a
    // single `table` reading reported the elements table's width in both
    // phases and said nothing at all about the one this pass built.
    const span = (t) => (t
      ? { scrollWidth: t.scrollWidth, clientWidth: t.clientWidth,
          portWidth: t.parentElement.clientWidth }
      : null);
    const guidance = pane.querySelectorAll(".check__guidance");
    const title = pane.querySelector("h2.sv__title");
    return {
      // WHICH page was measured, and not a decoration: the direct-render route
      // paints over whatever the last nav click left, and a route that failed
      // silently would otherwise report the PREVIOUS stack's numbers under
      // this stack's name. It did, on the first run of this probe.
      title: title ? title.textContent : null,
      paneScrollHeight: pane.scrollHeight,
      paneClientHeight: pane.clientHeight,
      documentScrollHeight: document.documentElement.scrollHeight,
      resultRows: pane.querySelectorAll("tr.rs-row").length,
      checkCards: pane.querySelectorAll("article.check").length,
      pathRows: pane.querySelectorAll("tr.fold-row").length,
      guidanceNodes: guidance.length,
      elements: span(pane.querySelector("table.eltable")),
      // `.restable` after this pass, the Paths table before it: the two
      // tables one phase of this probe can compare against the other.
      results: span(pane.querySelector("table.restable, table.foldtable")),
    };
  });
}

async function shot(page, name, opts) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}_${PHASE}.png`);
  await page.screenshot({ path: file, ...(opts || {}) });
  console.log(`    wrote ${file}`);
}

// The whole checks surface in one image, however tall it is: an element
// screenshot captures the element's full box rather than the viewport, which is
// the only framing in which "a ribbon and an essay, thirteen times" and the row
// per check that replaced it are the same picture.
async function elementShot(page, name, selector) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}_${PHASE}.png`);
  const node = page.locator(selector).first();
  if (!(await node.count())) {
    console.log(`    SKIP ${name}: no ${selector} on this page`);
    return;
  }
  await node.screenshot({ path: file });
  console.log(`    wrote ${file}`);
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => say(`  PAGE ERROR: ${e}`));
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="stack"]', { timeout: 20000 });

  // The titles, read off the same projection the page reads, so `openStack`
  // can wait for the render it asked for rather than for any render.
  const titles = {};
  JSON.parse(readFileSync(
    join(DATA_REPO, "data/projections/viewer/results.json"), "utf8"
  )).stacks.forEach((s) => { titles[s.id] = s.title; });

  for (const [name, id] of STACKS) {
    try {
      await openStack(page, id, titles[id]);
      const m = await measure(page);
      say(`${id}: showing "${m.title}"; pane ${m.paneScrollHeight}px tall ` +
          `(viewport ${m.paneClientHeight}px); ${m.checkCards} check cards, ` +
          `${m.resultRows} result rows, ${m.pathRows} fold rows, ` +
          `${m.guidanceNodes} guidance paragraphs; elements table ` +
          `${m.elements && m.elements.scrollWidth}px and results table ` +
          `${m.results && m.results.scrollWidth}px, in a ` +
          `${m.elements && m.elements.portWidth}px scrollport`);
      await elementShot(page, `${name}_stackpage`, "#stackview");
      // ...and the surface this pass is actually about, on its own, at a
      // viewport wide enough to show every column. At 1600px the stack pane is
      // 702px and the table overflows it -- which is the honest reading of the
      // page and is what the height shot above captures, but it also means a
      // shot taken there cannot show the four right-hand columns at all.
      // 2200px is the width tests/debug_typography_pass.mjs takes its two
      // stack-table shots at, for the same reason.
      await resizeTo(page, { width: 2200, height: 1000 });
      // The resize re-paints, which drops a direct render and detaches
      // whatever locator was resolved before it.
      await openStack(page, id, titles[id]);
      await elementShot(page, `${name}_results`,
        "table.restable, section.sv__section table.foldtable");
      await resizeTo(page, { width: 1600, height: 1000 });
    } catch (err) {
      say(`${id}: SKIP ${firstLine(err)}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n--- ${PHASE} ---`);
notes.forEach((line) => console.log(line));
