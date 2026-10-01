// Debug probe (nav_tooltip_once_and_rail_hover_emphasis, 2026-09-30).
// Hand-run, never by a test tier -- the same role tests/debug_*.py play for
// the Python side.
//
// Writes the three pictures that handoff's definition of done asks for, on the
// REAL pitch_system in a real Chrome, and prints what each one is showing so a
// reader can check the picture against a number:
//
//   1. a nav row's alert mark hovered -- ONE hover surface: the formatted
//      card, and no native tooltip on the mark or on any ancestor up to the
//      row (the duplicate Jeff reported);
//   2. a branch leg hovered mid-rail -- the rail span, the curve that opened
//      it, the curve that leaves it and every mark on it lit end to end, with
//      that leg's grid rows tinted beside it;
//   3. a grid row hovered -- its bar, its interfaces and its leader lit back
//      on the DAG.
//
//   node tests/debug_nav_tooltip_and_rail_hover.mjs --repo C:\workspace\tolstack
//   node tests/debug_nav_tooltip_and_rail_hover.mjs --repo C:\workspace\tolstack \
//        --shots docs/sessions/lessons/shots_20260930_nav_tooltip_and_rail_hover
//
// `--repo` is the worktree escape hatch every real-data check in this repo
// uses: data/projections/viewer/ exists only in the MAIN checkout. The app's
// own files always come from THIS tree.
//
// A note for whoever drives this next: a rail's hit path is a VERTICAL line
// with a transparent stroke, so its bounding box is zero pixels wide and
// Playwright's `locator.hover()` refuses it as "not visible". That is not a
// defect in the hit path -- what makes it hoverable is `stroke-width: 14`
// under `pointer-events: stroke` -- so the pointer is driven to a coordinate
// the page itself nominates (`railPoint` below), exactly as the browser tier
// does.
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

const [topologies, crops] = await Promise.all([
  read("topologies.json"), read("crops.json"),
]);

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}/topology.html?mock=1`;

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

const navRow = (kind, id) => `[data-nav-kind="${kind}"][data-nav-id="${id}"]`;
const line = (label, value) => console.log(`  ${label}: ${value}`);

// `clip` crops to the DAG-and-grid pane. The whole 1600px window is mostly
// the nav rail and the preview pane, and what these pictures are about is
// 400px of drawing beside its table -- a full-page shot buries it.
async function shot(name, clip) {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  const path = join(SHOTS, `${name}.png`);
  await page.screenshot({ path, ...(clip ? { clip } : {}) });
  console.log(`    wrote ${path}`);
}

const paneClip = () => page.evaluate(() => {
  const box = document.querySelector(".tv__main").getBoundingClientRect();
  return { x: Math.max(0, box.left), y: Math.max(0, box.top - 30),
           width: Math.min(box.width, window.innerWidth - box.left),
           height: Math.min(box.height, window.innerHeight - box.top) };
});

// Put a y that lives in DOCUMENT coordinates in the middle of the window.
const centreOn = (viewportY) => page.evaluate((y) => {
  window.scrollBy(0, y - window.innerHeight / 2);
}, viewportY);

// A point on rail `i` the browser agrees is that rail's own hit path: on
// screen, and not behind a bar, a dot or a leader.
const railPoint = (i) => page.evaluate((i) => {
  const node = document.querySelectorAll("svg.tv__rails line.rail__hit")[i];
  if (!node) return null;
  // A rail that starts below the fold has no point in the window at
  // all, and pitch_system's DAG is taller than any viewport this runs
  // at -- so the page is scrolled to put the rail's middle on screen
  // before anything is asked of it.
  const span = node.getBoundingClientRect();
  if (span.bottom < 80 || span.top > window.innerHeight - 80) {
    window.scrollBy(0, (span.top + span.bottom) / 2 -
      window.innerHeight / 2);
  }
  const box = node.getBoundingClientRect();
  const lo = Math.max(box.top + 8, 70);
  const hi = Math.min(box.bottom - 8, window.innerHeight - 12);
  for (let y = lo; y <= hi; y += 4) {
    if (document.elementFromPoint(box.left, y) === node) {
      return { x: box.left, y };
    }
  }
  return null;
}, i);

const lit = () => page.evaluate(() => {
  const n = (sel) => document.querySelectorAll(sel).length;
  return {
    rails: n("svg.tv__rails line.rail--hot"),
    links: n("svg.tv__rails path.rail__link--hot"),
    bars: n("svg.tv__rails line.rail__bar--hot"),
    dots: n("svg.tv__rails circle.rail__dot--hot"),
    leaders: n("svg.tv__rails path.rail__leader--hot"),
    rows: n("tr.tvrow--hot"),
    leadRows: Array.from(document.querySelectorAll("tr.tvrow--lead"))
      .map((r) => r.getAttribute("data-id")),
  };
});

try {
  await page.goto(url, { waitUntil: "load" });
  // The one test seam the browser tier uses too, and it uses only exported
  // API: swap the ?mock=1 fixture for the real projection and re-boot.
  await page.evaluate(({ projection, crops }) => {
    window.ViewerApp.demoTopologyFixture = function () {
      return {
        startState: window.ViewerApp.STATE.READY,
        topologies: projection, crops: crops, images: {},
      };
    };
    window.ViewerApp.bootTopology();
  }, { projection: topologies, crops });
  await page.waitForSelector("tr.tvrow", { timeout: 15000 });

  // --- 1. one hover surface on a nav row --------------------------------
  console.log("\n1. the nav mark's hover");
  const badge = page.locator("#navtree .navtree__row--study .navstatus").first();
  await badge.hover();
  await page.waitForSelector(".hovercard--alerts", { timeout: 5000 });
  const surfaces = await page.evaluate(() => {
    const mark = document.querySelector(
      "#navtree .navtree__row--study .navstatus");
    const row = mark.closest(".navtree__row");
    const titled = [];
    for (let n = mark; n && n !== row.parentNode; n = n.parentNode) {
      if (n.getAttribute && n.getAttribute("title") !== null) {
        titled.push(n.className || n.tagName);
      }
    }
    return {
      titled,
      accessibleName: mark.getAttribute("aria-label"),
      cardLines: document.querySelectorAll("li.hovercard__alert").length,
      describedLabels: Array.from(
        document.querySelectorAll("#navtree .navtree__label"))
        .filter((n) => n.getAttribute("title")).length,
    };
  });
  line("native tooltips between the mark and its row",
    surfaces.titled.length ? surfaces.titled.join(", ") : "none");
  line("the card's alert lines", surfaces.cardLines);
  line("the mark's accessible name",
    surfaces.accessibleName ? JSON.stringify(surfaces.accessibleName) : "(none)");
  line("rail labels still carrying a description", surfaces.describedLabels);
  await shot("1_nav_mark_one_hover_surface");
  await page.keyboard.press("Escape");

  // --- 2. a branch leg, lit end to end ----------------------------------
  console.log("\n2. a branch leg hovered mid-rail");
  await page.locator(navRow("topology", "pitch_system")).click();
  await page.waitForSelector("tr.tvrow", { timeout: 5000 });
  const rails = await page.locator("svg.tv__rails line.rail__hit").count();
  let best = null;
  for (let i = 0; i < rails; i++) {
    const point = await railPoint(i);
    if (!point) continue;
    await page.mouse.move(point.x, point.y);
    const state = await lit();
    await page.mouse.move(4, 4);
    // The picture wants the leg with the most to show: a curve on it AND
    // marks along it. A leg with two curves and one bar proves the mechanism
    // but photographs as almost nothing.
    const score = (state.links ? 40 : 0) + state.bars * 3 + state.dots;
    console.log(`    rail #${i}: ${state.rails} span, ${state.links} curve(s), ` +
      `${state.bars} bar(s), ${state.dots} dot(s), ${state.rows} row(s)`);
    if (!best || score > best.score) best = { i, point, state, score };
  }
  // `railPoint` scrolls to reach a rail that starts below the fold; the
  // picture below wants the page back where the reader would find it.
  await page.evaluate(() => window.scrollTo(0, 0));
  line("rails on pitch_system", rails);
  line("the leg chosen", `rail #${best.i}`);
  line("lit on it", `${best.state.rails} rail span, ${best.state.links} ` +
    `curve(s), ${best.state.bars} bar(s), ${best.state.dots} dot(s), ` +
    `${best.state.rows} grid row(s)`);
  await centreOn(best.point.y);
  const centred = await railPoint(best.i);
  await page.mouse.move(centred.x, centred.y);
  await shot("2_branch_leg_lit_end_to_end", await paneClip());
  await page.mouse.move(4, 4);
  await page.evaluate(() => window.scrollTo(0, 0));

  // --- 3. a grid row hovered --------------------------------------------
  console.log("\n3. a grid row hovered");
  const rowShot = await page.evaluate(() => {
    // A row whose edge sits at a part boundary, so the picture carries a
    // leader as well as a bar.
    const rows = Array.from(document.querySelectorAll("tr.tvrow--edge"));
    for (const row of rows) {
      row.dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
      const leaders = document.querySelectorAll(
        "svg.tv__rails path.rail__leader--lead").length;
      if (leaders >= 1) {
        return {
          id: row.getAttribute("data-id"),
          leaders,
          bars: document.querySelectorAll(
            "svg.tv__rails line.rail__bar--lead").length,
          dots: document.querySelectorAll(
            "svg.tv__rails circle.rail__dot--lead").length,
          rows: document.querySelectorAll("tr.tvrow--hot").length,
        };
      }
      row.dispatchEvent(new MouseEvent("mouseleave", { bubbles: false }));
    }
    return null;
  });
  line("the row chosen", rowShot ? rowShot.id : "(none found)");
  if (rowShot) {
    line("lit back on the DAG", `${rowShot.bars} bar, ${rowShot.dots} dot(s), ` +
      `${rowShot.leaders} leader(s); ${rowShot.rows} row(s) tinted on its leg`);
  }
  await shot("3_grid_row_lights_its_bar", await paneClip());
} finally {
  await page.close();
  await browser.close();
  server.close();
}
