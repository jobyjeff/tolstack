// Debug probe (reader_facing_copy_and_vocabulary, 2026-09-16). Hand-run, never
// by a test tier -- the same role tests/debug_*.py play for the Python side, and
// the same shape tests/debug_topology_grid_geometry.mjs established.
//
// Reads back the four reader-facing strings this handoff changed, on the REAL
// projections in a real Chrome, and (with --shots) writes one PNG per item. The
// node and browser tiers both PIN these strings; this exists because a copy
// change on a rendered surface is not witnessed by a test that reads textContent
// -- a reviewer has to be able to see the sentence in the page.
//
//   node tests/debug_reader_facing_copy.mjs --repo C:/workspace/tolstack
//   node tests/debug_reader_facing_copy.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons
//
// `--repo` is the worktree escape hatch every real-data check in this repo uses:
// data/projections/viewer/ exists only in the MAIN checkout. The app's own files
// always come from THIS tree.
//
// The four cases, and why each is the one named:
//   1. pitch_link_to_pitch_plate : bolt_grip_11 -- the only live citation whose
//      `revision` carries the four-clause per-sheet note, so it is where the
//      viewer's "rev " label collided with the value's own "Rev".
//   2. pitch_system : hub -- the only live part citing a traced drawing AND an
//      untraced workbook, so it is the case a whole-line qualifier gets wrong.
//   3. rotor_fastener_length -- the only live stack with zero_width_count > 0
//      (2), so it is the only one whose summary chip renders the sentence.
//   4. tan_link_to_pitch_plate : straight_bushing -- four runs on one export,
//      the line the issue was measured on.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize, sep } from "node:path";

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const APP_DIR = join(REPO, "apps", "viewer");

const flag = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
};
const DATA_REPO = normalize(flag("--repo", REPO));
const SHOTS = flag("--shots", null);
const VIEWPORT = { width: 1600, height: 1000 };
const SHOT_PREFIX = "LESSONS_20260916_reader_facing_copy_and_vocabulary";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".md": "text/markdown",
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
        res.writeHead(200, {
          "content-type": MIME[extname(full)] || "application/octet-stream",
        });
        res.end(body);
      } catch {
        res.writeHead(404).end("not found");
      }
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const read = (name) =>
  readFile(join(DATA_REPO, "data", "projections", "viewer", name), "utf8")
    .then(JSON.parse);

const [topologies, results, crops] = await Promise.all([
  read("topologies.json"), read("results.json"), read("crops.json"),
]);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}/topology.html?mock=1`;

let browser;
for (const channel of ["chrome", "msedge"]) {
  try {
    browser = await chromium.launch({ channel, headless: true });
    break;
  } catch (err) {
    console.log(`  ${channel} did not launch: ${err.message}`);
  }
}
if (!browser) {
  server.close();
  throw new Error("no browser channel launched");
}

const page = await browser.newPage({ viewport: VIEWPORT });
page.on("pageerror", (e) => console.log("  PAGE ERROR " + e));

// The real projections, through the app's own mock seam, plus whatever deep
// link this case needs. bootTopology() re-reads location.search, so the link is
// applied by the same code path a pasted URL takes.
// Click a nav row rather than trusting a deep link: several live ids name BOTH
// a stack and a topology (`rotor_fastener_length` is one), and the nav row is
// unambiguous about which page the reader is on.
// A covered stack -- one a topology re-expresses -- is deliberately NOT a nav
// leaf (VA.navTree), so `?stack=` is the only way in, and it is the way a reader
// arrives too: apps/viewer/README.md documents ?stack=&element= as the inbound
// contract drawing-checker's analyses panel builds.
//
// The ?mock=1 fixture composer keeps only `results.stacks[0]` plus a renamed
// copy of it (topology_app.js's mockFixture, and the comment there says why), so
// the stack this case is about has to BE stacks[0]. Reordering is the whole of
// what that means; nothing is dropped from the projection.
async function openStack(id) {
  await boot(`&stack=${encodeURIComponent(id)}`, id);
  await page.waitForFunction(
    () => !!document.querySelector("table.eltable"), null, { timeout: 15000 });
  await page.waitForTimeout(250);
}

// A stack element's row, by the id printed beside its name.
async function selectElement(id) {
  const found = await page.evaluate((elementId) => {
    const row = Array.from(document.querySelectorAll("tr.el-row")).filter((r) => {
      const code = r.querySelector("code");
      return code && code.textContent.trim() === elementId;
    })[0];
    if (!row) return false;
    row.click();
    return true;
  }, id);
  await page.waitForTimeout(300);
  if (!found) throw new Error("no element row for " + id);
}

async function boot(query, firstStackId) {
  const ordered = firstStackId
    ? {
        ...results,
        stacks: [
          ...results.stacks.filter((s) => s.id === firstStackId),
          ...results.stacks.filter((s) => s.id !== firstStackId),
        ],
      }
    : results;
  await page.goto(base + query, { waitUntil: "load" });
  await page.waitForSelector("tr.tvrow, table.eltable", { timeout: 15000 });
  await page.evaluate(({ t, r, c }) => {
    const VA = window.ViewerApp;
    VA.demoTopologyFixture = () => ({
      startState: VA.STATE.READY, topologies: t, crops: c, images: {},
    });
    VA.demoFixture = () => ({
      startState: VA.STATE.READY, results: r, crops: c, images: {}, texts: {},
    });
    VA.bootTopology();
  }, { t: topologies, r: ordered, c: crops });
  // A plain wait, not waitForSelector: the re-boot replaces the page's tables,
  // and a selector that still matches the OLD detached rows resolves instantly
  // and then never becomes visible.
  await page.waitForTimeout(900);
}

async function shot(name) {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  const path = join(SHOTS, `${SHOT_PREFIX}_${name}.png`);
  await page.screenshot({ path });
  console.log(`    wrote ${path}`);
}

const textOf = (selector) => page.evaluate((s) => {
  const node = document.querySelector(s);
  return node ? node.textContent.trim() : null;
}, selector);

function line(label, value) { console.log(`  ${label}: ${value}`); }
function check(label, actual, mustHave, mustNotHave) {
  const ok = String(actual || "").includes(mustHave) &&
    (!mustNotHave || !String(actual || "").includes(mustNotHave));
  console.log(`  ${ok ? "OK  " : "BAD "} ${label}`);
  if (!ok) process.exitCode = 1;
}

try {
  // ---- 1. the citation where-line -----------------------------------------
  console.log("\n== 1. `rev Rev 4` on the live NAS citation ==");
  await openStack("pitch_link_to_pitch_plate");
  await selectElement("bolt_grip_11");
  const where = await textOf("#detail div.detail__where");
  line("detail__where", JSON.stringify(where));
  check("the label is not said twice", where, "· Rev 4 (sheet 1 rev 4", "rev Rev 4");
  await shot("1_citation_where_line");

  // ---- 2. the component card's sourcing statement --------------------------
  console.log("\n== 2. `dimensions from` over untraced values ==");
  await boot("&topology=pitch_system");
  await page.evaluate(() => {
    const cell = Array.from(document.querySelectorAll("td.tvcell--component"))
      .filter((n) => n.textContent.trim() === "propeller hub")[0];
    if (cell) cell.click();
  });
  await page.waitForTimeout(400);
  const card = await textOf("div.hovercard__where");
  line("hovercard__where", JSON.stringify(card));
  check("the untraced workbook is qualified and the traced drawing is not",
        card, "End_Stop_JC.xlsx · sheet End Stop Tol Stack (unverified); 212966-006-A");
  await shot("2_component_card_sourcing");

  // ---- 3. one vocabulary for `no tolerance recorded` -----------------------
  console.log("\n== 3. zero-width band -> no tolerance recorded ==");
  await openStack("rotor_fastener_length");
  await selectElement("washer_ms21299c3");
  const chips = await page.evaluate(() => Array.from(
    document.querySelectorAll("main .chip, #stackview .chip, .chip"))
    .map((n) => n.textContent.trim())
    .filter((t) => /elements? with no tolerance recorded/.test(t)));
  const rowChip = await page.evaluate(() => {
    const row = document.querySelector("tr.el-row--zero-width");
    const chip = row && row.querySelector(".chip--zero-width");
    return chip ? { text: chip.textContent.trim(), title: chip.getAttribute("title") } : null;
  });
  const cellTitle = await page.evaluate(() => {
    const cell = document.querySelector("td.num--zero-width");
    return cell ? cell.getAttribute("title") : null;
  });
  const paneChip = await page.evaluate(() => {
    const chip = document.querySelector("#detail .chip--zero-width");
    return chip ? chip.textContent.trim() : null;
  });
  line("summary chips", JSON.stringify(chips));
  line("row chip", JSON.stringify(rowChip));
  line("min/max cell title", JSON.stringify(cellTitle));
  line("element pane chip", JSON.stringify(paneChip));
  check("the summary chip counts elements", chips.join(" | "),
        "2 elements with no tolerance recorded", "zero-width band");
  check("the row chip says the same words", rowChip && rowChip.text,
        "no tolerance recorded", "zero-width");
  check("the element pane says the same words", paneChip,
        "no tolerance recorded", "zero-width");
  await shot("3_no_tolerance_recorded");

  // ...and the fifth site: the DAG page's own hover card, which is what made
  // this a self-contradiction rather than a two-surface split.
  await boot("&topology=rotor_fastener_length");
  const dagChip = await page.evaluate(() => {
    const row = document.querySelector("tr.tvrow--zero-width");
    if (!row) return null;
    const cell = row.querySelector("td.tvcell--name");
    if (cell) cell.click();
    return true;
  });
  await page.waitForTimeout(400);
  const dagPane = await page.evaluate(() => {
    const chip = document.querySelector("#detail .chip--zero-width");
    return chip ? chip.textContent.trim() : null;
  });
  line("DAG edge pane chip", JSON.stringify(dagPane) + (dagChip ? "" : " (no zero-width row)"));
  await shot("3b_dag_pane_no_tolerance");

  // ---- 4. the element pane's drawing-checker runs --------------------------
  console.log("\n== 4. bare run ids as link text ==");
  await openStack("tan_link_to_pitch_plate");
  await selectElement("straight_bushing");
  const runs = await page.evaluate(() => {
    const node = document.querySelector("#detail div.el-export__runs");
    if (!node) return null;
    const link = node.querySelector("a.el-export__runlink");
    return {
      text: node.textContent.trim(),
      title: (node.querySelector("span.muted") || {}).title || null,
      link: link ? link.textContent.trim() : null,
    };
  });
  line("el-export__runs", JSON.stringify(runs));
  check("the line summarises instead of listing ids", runs && runs.text,
        "read by drawing-checker 4 times, most recently 30 Jul 2026",
        "20260723_163810");
  check("the raw ids survive on the hover", runs && runs.title, "20260723_163810");
  await shot("4_drawing_checker_runs");
} finally {
  await browser.close();
  server.close();
}
console.log(process.exitCode ? "\nFAILED" : "\nall four read the corrected copy");
