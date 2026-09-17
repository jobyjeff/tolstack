// Debug probe (viewer_hover_deslop_and_banner_purge, 2026-09-16). Hand-run,
// never by a test tier -- the same role tests/debug_*.py play for the Python
// side, and the same shape tests/debug_reader_facing_copy.mjs established the
// day before.
//
// Reads back the four surfaces this handoff changed, on the REAL projections in
// a real Chrome, and (with --shots) writes one PNG per case. Both tiers PIN the
// strings and the shapes; this exists because "the page no longer shouts five
// rows of build stamps at a reader" is a claim about what a page LOOKS like,
// and a reviewer has to be able to see it.
//
//   node tests/debug_hover_deslop.mjs --repo C:/workspace/tolstack
//   node tests/debug_hover_deslop.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons
//
// `--repo` is the worktree escape hatch every real-data check in this repo
// uses: data/projections/viewer/ exists only in the MAIN checkout. The app's own
// files always come from THIS tree.
//
// The cases, and why each is the one named:
//   1. the banner at rest -- the five rows Jeff asked to delete, and where they
//      went.
//   2/3. `pitch_link_to_pitch_plate | bushing_214820_002` -- the card Jeff
//      quoted. Named after its own drawing (so the part number used to print on
//      two consecutive lines) and carrying a three-sentence note whose tail is
//      a gap essay.
//   4/5. `pitch_link_to_pitch_plate | bolt_nas6403u11d` -- the NAS bolt. A
//      standard part, so its where-line is the spec sheet rather than a
//      drawing, and its crop is of that same sheet: the "stated, then restated"
//      case.
//   6. the preview pane's own width and its divider.
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
const SHOT_PREFIX = "LESSONS_20260916_viewer_hover_deslop_and_banner_purge";
const TOPOLOGY = "pitch_link_to_pitch_plate";

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

// The real projections, through the app's own mock seam. bootTopology()
// re-reads location.search, so a deep link is applied by the same code path a
// pasted URL takes.
async function boot(query) {
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
  }, { t: topologies, r: results, c: crops });
  // A plain wait, not waitForSelector: the re-boot replaces the page's tables,
  // and a selector that still matches the OLD detached rows resolves instantly
  // and then never becomes visible.
  await page.waitForTimeout(900);
}

async function shot(name, clip) {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  const path = join(SHOTS, `${SHOT_PREFIX}_${name}.png`);
  await page.screenshot(clip ? { path, clip } : { path });
  console.log(`    wrote ${path}`);
}

function line(label, value) { console.log(`  ${label}: ${value}`); }
function check(label, ok, detail) {
  console.log(`  ${ok ? "OK  " : "BAD "} ${label}${detail ? " — " + detail : ""}`);
  if (!ok) process.exitCode = 1;
}

// Open a component card by clicking the merged component cell whose text is
// this part's name, and return everything the two rules are about.
async function componentCard(name) {
  await page.evaluate((partName) => {
    const cell = Array.from(document.querySelectorAll("td.tvcell--component"))
      .filter((n) => n.textContent.trim() === partName)[0];
    if (cell) cell.click();
  }, name);
  await page.waitForTimeout(500);
  return page.evaluate(() => {
    const pop = document.querySelector("#croppop");
    const text = (sel) => {
      const n = pop.querySelector(sel);
      return n ? n.textContent.trim() : null;
    };
    return {
      title: text(".hovercard__head h4"),
      where: Array.from(pop.querySelectorAll(".hovercard__where"))
        .map((n) => n.textContent.trim()),
      cropKey: text(".hovercard__cropkey"),
      note: text(".hovercard__note"),
      folds: pop.querySelectorAll("details").length,
      foldSummary: text("details.hovercard__source > summary"),
      foldOpen: !!pop.querySelector("details.hovercard__source")?.open,
      cropHeads: pop.querySelectorAll(".cropblock .croppop__head").length,
      foldBody: text(".hovercard__source__body"),
    };
  });
}

try {
  // ---- 1. the banner ------------------------------------------------------
  console.log("\n== 1. the five always-visible rows at the top of the page ==");
  await boot(`&topology=${TOPOLOGY}`);
  const banner = await page.evaluate(() => {
    const bar = document.querySelector("#banner");
    return {
      children: Array.from(bar.children)
        .map((n) => n.className || n.tagName),
      text: bar.textContent.trim(),
      foldOpen: !!bar.querySelector("details.banner__source")?.open,
      foldBody: (bar.querySelector(".banner__source__body") || {}).textContent,
      height: bar.getBoundingClientRect().height,
    };
  });
  line("banner children", JSON.stringify(banner.children));
  line("banner text", JSON.stringify(banner.text));
  line("banner height", banner.height.toFixed(1) + "px");
  // The fold and the Reload button, and then only the ALARM's own nodes. The
  // live projections are genuinely a mismatched pair as this is written --
  // topologies.json was last built from another worktree's review branch --
  // so the stale box is on screen, which is the case it exists for and the
  // one thing that is still allowed to shout.
  const ALARM = ["banner__stale", "banner__rebuild", "banner__rebuild-hint"];
  check("the bar leads with the fold and the button, and nothing else on it " +
    "is prose",
    banner.children[0] === "banner__source" &&
    banner.children[1] === "banner__action" &&
    banner.children.slice(2).every((c) => ALARM.indexOf(c) !== -1),
    JSON.stringify(banner.children));
  check("the fold is closed on arrival", banner.foldOpen === false);
  check("the five rows are inside it, not deleted",
    /built/.test(banner.foldBody || "") &&
    /crops by rule:/.test(banner.foldBody || ""));
  await shot("1_banner_no_provenance_lines",
    { x: 0, y: 0, width: VIEWPORT.width, height: 220 });

  // ---- 2/3. the bushing card ----------------------------------------------
  console.log("\n== 2. the 214820-002 plain bushing card ==");
  const bushing = await componentCard("214820-002 plain bushing");
  line("title", JSON.stringify(bushing.title));
  line("where line(s)", JSON.stringify(bushing.where));
  line("crop caption", JSON.stringify(bushing.cropKey));
  line("note (in the open)", JSON.stringify(bushing.note));
  line("fold", `${bushing.folds} fold(s), summary ${JSON.stringify(bushing.foldSummary)}, ` +
    `open=${bushing.foldOpen}`);
  check("the part number is not printed on two consecutive lines",
    !bushing.where.some((w) => w.includes("214820-002")),
    JSON.stringify(bushing.where));
  check("the crop carries no caption restating its file",
    bushing.cropHeads === 0);
  check("exactly one fold, closed, called Data source",
    bushing.folds === 1 && bushing.foldOpen === false &&
    bushing.foldSummary === "Data source");
  check("the gap essay is in the fold, not in the open",
    !/stays on the gap list/.test(bushing.note || "") &&
    /stays on the gap list/.test(bushing.foldBody || ""));
  await shot("2_bushing_card_collapsed");

  console.log("\n== 3. the same card with the fold open ==");
  await page.locator("#croppop details.hovercard__source > summary").click();
  await page.waitForTimeout(250);
  const opened = await page.evaluate(() =>
    !!document.querySelector("#croppop details.hovercard__source").open);
  check("it opens", opened === true);
  await shot("3_bushing_card_data_source_open");
  await page.keyboard.press("Escape");

  // ---- 4/5. the NAS bolt card ---------------------------------------------
  console.log("\n== 4. the NAS6403U11D bolt card ==");
  const bolt = await componentCard("NAS6403U11D hex-head bolt");
  line("title", JSON.stringify(bolt.title));
  line("where line(s)", JSON.stringify(bolt.where));
  line("crop caption", JSON.stringify(bolt.cropKey));
  line("note (in the open)", JSON.stringify(bolt.note));
  line("fold", `${bolt.folds} fold(s), summary ${JSON.stringify(bolt.foldSummary)}, ` +
    `open=${bolt.foldOpen}`);
  check("one where-line, naming the standard sheet",
    bolt.where.length === 1 && /standard part — dimensions from/.test(bolt.where[0]));
  check("the crop of that same sheet does not restate it",
    bolt.cropHeads === 0);
  check("exactly one fold, closed, called Data source",
    bolt.folds === 1 && bolt.foldOpen === false &&
    bolt.foldSummary === "Data source");
  await shot("4_nas_bolt_card_collapsed");

  console.log("\n== 5. the same card with the fold open ==");
  await page.locator("#croppop details.hovercard__source > summary").click();
  await page.waitForTimeout(250);
  await shot("5_nas_bolt_card_data_source_open");
  await page.keyboard.press("Escape");

  // ---- 6. the preview pane ------------------------------------------------
  console.log("\n== 6. the preview pane's width and its divider ==");
  const pane = await page.evaluate(() => {
    const detail = document.querySelector("#detail");
    const divider = document.querySelector("#detail-divider");
    const bar = getComputedStyle(divider, "::before");
    const grip = getComputedStyle(divider, "::after");
    return {
      width: detail.getBoundingClientRect().width,
      hairline: bar.backgroundColor,
      gripImage: grip.backgroundImage,
      bounds: window.ViewerApp.TOPO_PANE_WIDTH,
    };
  });
  line("pane width", pane.width.toFixed(0) + "px");
  line("divider hairline at rest", pane.hairline);
  line("divider grip mark", pane.gripImage.slice(0, 60) + "…");
  line("drag bounds", JSON.stringify(pane.bounds));
  check("the pane is meaningfully wider than the 430px it shipped at",
    pane.width >= 560);
  check("the divider is visible at rest, not transparent until hover",
    pane.hairline !== "rgba(0, 0, 0, 0)" && pane.hairline !== "transparent");
  check("...and carries a grip mark", pane.gripImage !== "none");
  await shot("6_preview_pane_and_divider",
    { x: VIEWPORT.width - 700, y: 0, width: 700, height: 700 });
  // ...and the grip mark close up, because at page scale a 5x23px mark is a
  // smudge and "is the affordance actually there" is the question.
  const dividerX = await page.evaluate(() =>
    document.querySelector("#detail-divider").getBoundingClientRect().x);
  await shot("7_divider_grip_close_up",
    { x: Math.round(dividerX) - 45, y: VIEWPORT.height / 2 - 45,
      width: 100, height: 100 });
} finally {
  await browser.close();
  server.close();
}
console.log(process.exitCode
  ? "\nFAILED"
  : "\nthe banner is quiet, both cards state their document once, and the pane " +
    "announces its divider");
