// Debug probe (topology_grid_scroll_and_grips, 2026-09-16). Hand-run, never by
// a test tier -- the same role tests/debug_*.py play for the Python side.
//
// Measures the three things the 2026-09-16 handoff's deliverables are about, on
// the REAL pitch_system projection in a real Chrome at 1600x1000, and (with
// --shots) writes the before/after PNG pairs the handoff asks for:
//
//   1. whether the grid's two drag grips (.tvgrip--jog, .tvgrip--col) are
//      REACHABLE -- elementFromPoint at the grip's own centre, plus a real
//      pointer drag whose effect is read back -- at three preview-pane widths;
//   2. whether a pane render carries the reader's horizontal scroll across the
//      rebuild (scrollLeft before a study click, on the first in-flight frame,
//      and on the settled one);
//   3. whether `.tv__rails`'s sticky holds the DAG against the pane's visible
//      left edge at EVERY scrollLeft, not just the first (paneWidth-dagWidth).
//
// Plus the four box numbers the handoff wants recorded either side of the fix:
// the pane's scrollWidth, `.tv__body`'s width, the header's padding-left seam
// and the `.tv__ghost` overlay's box.
//
//   node tests/debug_topology_grid_geometry.mjs --repo C:\workspace\tolstack
//   node tests/debug_topology_grid_geometry.mjs --repo C:\workspace\tolstack \
//        --shots docs/sessions/lessons --tag before
//
// `--repo` is the worktree escape hatch every real-data check in this repo
// uses: data/projections/viewer/ exists only in the MAIN checkout. The app's
// own files always come from THIS tree.
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
const TAG = flag("--tag", "before");
const VIEWPORT = { width: 1600, height: 1000 };
const SHOT_PREFIX = "LESSONS_20260916_topology_grid_scroll_and_grips";

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
const settled = () => page.waitForFunction(
  () => window.ViewerApp && window.ViewerApp.lastTopoRender &&
        !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 10000 });

// The pane's boxes, as the DOM carries them. Everything below is this.
const BOXES = () => page.evaluate(() => {
  const live = Array.from(document.querySelectorAll(".tv__hscroll"))
    .filter((n) => !n.closest("div.tv__ghost"))[0];
  const body = live.querySelector(".tv__body");
  const head = live.querySelector(".tv__head");
  const svg = live.querySelector("svg.tv__rails");
  const rows = live.querySelector("div.tv__rows");
  const table = rows.querySelector("table.tvtable");
  const main = document.querySelector(".tv__main");
  const detail = document.querySelector("#detail");
  const r = (n) => { const b = n.getBoundingClientRect(); return { x: b.left, w: b.width }; };
  return {
    paneScrollWidth: live.scrollWidth, paneClientWidth: live.clientWidth,
    scrollLeft: live.scrollLeft,
    body: r(body), rows: r(rows), table: r(table), svg: r(svg),
    headPad: parseFloat(head.style.paddingLeft || "0"),
    headTable: r(head.querySelector("table.tvheadtable")),
    main: r(main), detail: r(detail),
    rowsOverflow: Math.round(table.getBoundingClientRect().width -
                             rows.getBoundingClientRect().width),
  };
});

// Where the DAG's leftmost drawn mark sits relative to the pane's visible left
// edge, at a given scrollLeft. This is deliverable 3's whole question.
const dagLeftAt = (target) => page.evaluate((t) => {
  const live = Array.from(document.querySelectorAll(".tv__hscroll"))
    .filter((n) => !n.closest("div.tv__ghost"))[0];
  live.scrollLeft = t;
  const svg = live.querySelector("svg.tv__rails");
  const pane = live.getBoundingClientRect();
  const marks = Array.from(svg.querySelectorAll(
    "line.rail, line.rail__bar, circle.rail__dot, path.rail__link, path.rail__leader"))
    .map((n) => n.getBoundingClientRect());
  return { scrollLeft: live.scrollLeft,
           dagLeft: Math.min(...marks.map((b) => b.left - pane.left)),
           svgLeft: svg.getBoundingClientRect().left - pane.left,
           bodyWidth: live.querySelector(".tv__body").getBoundingClientRect().width,
           drawn: marks.length };
}, target);

// A grip's reachability, three ways: its own box, what the browser says is
// painted at its centre, and whether a REAL pointer drag there took effect.
const gripProbe = (which) => page.evaluate((sel) => {
  const grip = document.querySelector(sel);
  if (!grip) return null;
  const b = grip.getBoundingClientRect();
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const hit = document.elementFromPoint(cx, cy);
  const name = (n) => !n ? "(nothing)"
    : (n.id ? "#" + n.id : "") + "." + String(n.className || "").split(" ").join(".");
  return {
    x: Math.round(b.left), y: Math.round(b.top),
    w: Math.round(b.width), h: Math.round(b.height),
    cx, cy, hit: name(hit),
    reachable: !!(hit && (hit === grip || grip.contains(hit) || hit.closest(sel))),
  };
}, which);

async function dragBy(selector, dx) {
  const box = await page.locator(selector).boundingBox();
  if (!box) return false;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(90);
  return true;
}

// The jog zone's scale, the same way the browser tier derives it: the drawn
// SVG width less the zone's own left edge, over the zone's natural width.
const zoneScale = () => page.evaluate(() => {
  const VA = window.ViewerApp;
  const proj = VA.findTopology(VA.demoTopologyFixture().topologies,
                               VA.lastTopoRender.topologyId);
  const layout = VA.spineRight(proj.layout);
  const natural = VA.leaderGeometry(layout, VA.gridPlan(layout, proj),
                                    VA.RAIL_METRICS);
  const svg = document.querySelector("svg.tv__rails").getBoundingClientRect().width;
  return (svg - natural.zoneLeft) / natural.naturalZone;
});

// The jog zone's scale and the ELEMENT column's width -- the two numbers a
// drag on the two grips moves, read back so "the drag took effect" is a
// measurement rather than a hope.
const prefs = () => page.evaluate(() => ({
  svgWidth: Number(document.querySelector("svg.tv__rails").getAttribute("width")),
  elementWidth: window.ViewerApp.topoColumn("name").width,
}));

async function shot(name) {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  const path = join(SHOTS, `${SHOT_PREFIX}_${name}.png`);
  await page.screenshot({ path });
  console.log(`    wrote ${path}`);
}

function line(label, value) { console.log(`  ${label}: ${value}`); }

// A fresh page on the real projection, at the shipped defaults. Section 1
// seeds a dragged column and a widened jog zone on purpose; sections 2 and 3
// must NOT inherit them, or their numbers are not the ones the three issues
// were measured at.
async function bootReal() {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("tr.tvrow", { timeout: 15000 });
  await page.evaluate(({ projection, cropIndex }) => {
    window.ViewerApp.demoTopologyFixture = function () {
      return { startState: window.ViewerApp.STATE.READY,
               topologies: projection, crops: cropIndex, images: {} };
    };
    window.ViewerApp.bootTopology();
  }, { projection: topologies, cropIndex: crops });
  await page.waitForSelector("tr.tvrow", { timeout: 15000 });
  await page.locator(navRow("topology", "pitch_system")).click();
  await settled();
}

try {
  await bootReal();

  const paneMax = await page.evaluate(() => window.ViewerApp.TOPO_PANE_WIDTH.max);

  // ---- 1. the grips -------------------------------------------------------
  //
  // The issue's own repro order: widen the column and the jog zone FIRST (at
  // the shipped 430px pane, where both grips are reachable), then widen the
  // pane and ask whether the same two grips still answer a pointer.
  console.log("\n== 1. the grid's drag grips ==");
  await dragBy(".tvgrip--col", 220);
  // 5.5x, the scale the three issues were all measured at -- reached by
  // dragging rather than by writing the state, so the grip's own gesture is
  // what produced it. Small steps, stopping at the first drag that reaches it.
  for (let i = 0; i < 12 && (await zoneScale()) < 5.5; i++) {
    await dragBy(".tvgrip--jog", 80);
  }
  await settled();
  const seeded = await prefs();
  line("seeded", `ELEMENT ${seeded.elementWidth}px, SVG ${seeded.svgWidth}px, ` +
    `jog zone ${(await zoneScale()).toFixed(2)}x`);

  for (const width of [430, 560, paneMax]) {
    // The pane's width is pure layout; the app repaints the grid off its own
    // debounced resize listener, which a synthetic resize event drives just as
    // a real window drag would.
    await page.evaluate((w) => {
      document.querySelector("#detail").style.width = w + "px";
      window.dispatchEvent(new Event("resize"));
    }, width);
    await page.waitForTimeout(300);
    const boxes = await BOXES();
    const jog = await gripProbe(".tvgrip--jog");
    const col = await gripProbe(".tvgrip--col");
    console.log(`  pane ${width}px -> .tv__main ${Math.round(boxes.main.w)}px, ` +
      `#detail starts at x ${Math.round(boxes.detail.x)}`);
    line("  jog grip", `x ${jog.x} (hit: ${jog.hit}) reachable=${jog.reachable}`);
    line("  col grip", `x ${col.x} (hit: ${col.hit}) reachable=${col.reachable}`);
    // ...and the same question asked with a real pointer.
    const before = await prefs();
    await dragBy(".tvgrip--jog", 60);
    const afterJog = await prefs();
    await dragBy(".tvgrip--col", 40);
    const afterCol = await prefs();
    line("  jog drag", `SVG ${before.svgWidth} -> ${afterJog.svgWidth}px ` +
      `(${afterJog.svgWidth > before.svgWidth ? "TOOK EFFECT" : "DEAD"})`);
    line("  col drag", `ELEMENT ${afterJog.elementWidth} -> ${afterCol.elementWidth}px ` +
      `(${afterCol.elementWidth > afterJog.elementWidth ? "TOOK EFFECT" : "DEAD"})`);
    // Undo, so the next width measures the same page.
    await dragBy(".tvgrip--jog", -60);
    await dragBy(".tvgrip--col", -40);
    // The evidence shot, at the width the issue was reported at: a real
    // pointer HELD DOWN on the jog grip, mid-drag. Nothing is annotated into
    // the picture -- what the "after" shows is the jog zone actually widening
    // under the gesture, and what the "before" shows is the same gesture
    // landing on the preview pane and the DAG not moving at all.
    if (width === 560) {
      const g = await page.locator(".tvgrip--jog").boundingBox();
      const y = g.y + g.height / 2;
      // Dragged LEFT, which narrows the jog zone: a widening drag pushes its
      // own result off the pane and photographs as almost nothing, where a
      // narrowing one brings the grid's columns back into the frame. Held
      // down for the shot, so the picture is of the gesture, not of its
      // aftermath.
      await page.mouse.move(g.x + g.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(g.x + g.width / 2 - 200, y, { steps: 8 });
      await page.waitForTimeout(120);
      const held = await prefs();
      line("  held", `SVG ${held.svgWidth}px with the pointer down on the grip ` +
        `and dragged 200px left`);
      await shot(`1_${TAG}_grip_under_pane`);
      await page.mouse.up();
      await page.waitForTimeout(90);
      if ((await prefs()).svgWidth !== seeded.svgWidth) {
        await dragBy(".tvgrip--jog", 200);
      }
    }
  }
  await page.evaluate(() => {
    document.querySelector("#detail").style.width = "430px";
    window.dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(300);

  // ---- 2. the reader's sideways scroll ------------------------------------
  console.log("\n== 2. the reader's sideways scroll across a rebuild ==");
  await bootReal();
  const pitch = topologies.topologies.find((t) => t.id === "pitch_system");
  const study = pitch.studies.find((s) => s.status === "ok" && s.layout);
  const atEnd = await page.evaluate(() => {
    const live = Array.from(document.querySelectorAll(".tv__hscroll"))
      .filter((n) => !n.closest("div.tv__ghost"))[0];
    live.scrollLeft = live.scrollWidth;
    return { scrollLeft: live.scrollLeft, scrollWidth: live.scrollWidth,
             clientWidth: live.clientWidth };
  });
  line("parked at", `scrollLeft ${atEnd.scrollLeft} of ` +
    `${atEnd.scrollWidth - atEnd.clientWidth} (content ${atEnd.scrollWidth}px ` +
    `in a ${atEnd.clientWidth}px pane)`);
  const inFlight = await (async () => {
    const p = page.evaluate(async () => {
      const VA = window.ViewerApp;
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const ghost = document.querySelector("div.tv__ghost");
        if (VA.lastTopoRender && VA.lastTopoRender.tweening && ghost) {
          const live = Array.from(document.querySelectorAll(".tv__hscroll"))
            .filter((n) => !n.closest("div.tv__ghost"))[0];
          const gh = ghost.querySelector(".tv__hscroll");
          return { t: VA.lastTopoRender.positions.t,
                   scrollLeft: live.scrollLeft, scrollWidth: live.scrollWidth,
                   ghostScrollLeft: gh ? gh.scrollLeft : null,
                   ghostBox: ghost.getBoundingClientRect().width };
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
      return null;
    });
    await page.locator(navRow("study", study.id)).click();
    return p;
  })();
  line("first frame", inFlight
    ? `scrollLeft ${inFlight.scrollLeft}, ghost scrollLeft ${inFlight.ghostScrollLeft}, ` +
      `ghost box ${Math.round(inFlight.ghostBox)}px`
    : "(no in-flight frame caught)");
  await settled();
  const afterRespine = await BOXES();
  line("settled", `scrollLeft ${afterRespine.scrollLeft} ` +
    `(content ${afterRespine.paneScrollWidth}px)`);
  await shot(`2_${TAG}_scroll_${TAG === "before" ? "discarded" : "carried"}`);

  // The same question for every OTHER render of this pane -- the respine is
  // only the conspicuous one.
  await page.locator(navRow("topology", "pitch_system")).click();
  await settled();
  for (const control of ["#density-toggle", "#edge-length-toggle", "#leader-style-toggle"]) {
    await page.evaluate(() => {
      const live = Array.from(document.querySelectorAll(".tv__hscroll"))
        .filter((n) => !n.closest("div.tv__ghost"))[0];
      live.scrollLeft = live.scrollWidth;
    });
    const was = (await BOXES()).scrollLeft;
    await page.locator(control).click();
    await settled();
    line(control, `scrollLeft ${was} -> ${(await BOXES()).scrollLeft}`);
    await page.locator(control).click();
    await settled();
  }

  // ---- 3. the sticky rails ------------------------------------------------
  console.log("\n== 3. the sticky rails across the whole scroll ==");
  await bootReal();
  const walkBoxes = await BOXES();
  const max = walkBoxes.paneScrollWidth - walkBoxes.paneClientWidth;
  line("pane", `content ${walkBoxes.paneScrollWidth}px in ` +
    `${walkBoxes.paneClientWidth}px, max scrollLeft ${max}, ` +
    `DAG ${Math.round(walkBoxes.svg.w)}px`);
  // Seeded from a real sample, never from a placeholder: the leftmost drawn
  // mark sits a few px inside the SVG's own left edge by construction, so a
  // `{ dagLeft: 0 }` starting value is a number no sample can beat.
  let worst = await dagLeftAt(0);
  let firstSlip = null;
  for (let s = 0; s <= max; s += Math.max(1, Math.round(max / 40))) {
    const m = await dagLeftAt(s);
    if (m.dagLeft < worst.dagLeft) worst = m;
    if (firstSlip === null && m.dagLeft < -1) firstSlip = m.scrollLeft;
  }
  const end = await dagLeftAt(max);
  if (end.dagLeft < worst.dagLeft) worst = end;
  if (firstSlip === null && end.dagLeft < -1) firstSlip = end.scrollLeft;
  line("first slip", firstSlip === null
    ? "never -- the rail is within 1px of the pane's left edge at every scrollLeft"
    : `scrollLeft ${firstSlip} (room beside the DAG: ` +
      `${Math.round(walkBoxes.paneClientWidth - walkBoxes.svg.w)}px)`);
  line("worst", `dagLeft ${worst.dagLeft.toFixed(1)}px at scrollLeft ${worst.scrollLeft}`);
  line("at the far end", `dagLeft ${end.dagLeft.toFixed(1)}px, svgLeft ` +
    `${end.svgLeft.toFixed(1)}px, .tv__body ${end.bodyWidth.toFixed(1)}px ` +
    `at scrollLeft ${end.scrollLeft}`);
  const mid = await dagLeftAt(Math.round(max / 2));
  line("half way", `dagLeft ${mid.dagLeft.toFixed(1)}px, svgLeft ` +
    `${mid.svgLeft.toFixed(1)}px at scrollLeft ${mid.scrollLeft}`);
  const zero = await dagLeftAt(0);
  line("at zero", `dagLeft ${zero.dagLeft.toFixed(1)}px, svgLeft ` +
    `${zero.svgLeft.toFixed(1)}px`);
  // The shot is the FAR END, which is the only place the before and after
  // differ -- at scrollLeft 0 a pane with no sticky at all looks the same.
  await dagLeftAt(max);
  await shot(`3_${TAG}_rails_${TAG === "before" ? "slide" : "hold"}`);

  // ---- the four box numbers the lesson records ----------------------------
  console.log("\n== boxes (scrolled to the far end) ==");
  const b = await BOXES();
  line("pane scrollWidth", `${b.paneScrollWidth}px (client ${b.paneClientWidth}px)`);
  line(".tv__body width", `${Math.round(b.body.w)}px`);
  line(".tv__rows width", `${Math.round(b.rows.w)}px, table ${Math.round(b.table.w)}px, ` +
    `overflow ${b.rowsOverflow}px`);
  line("header padding-left", `${b.headPad}px (SVG ${Math.round(b.svg.w)}px)`);
  const ghostBox = await page.evaluate(async (studyRow) => {
    const VA = window.ViewerApp;
    const out = { width: null, height: null };
    const p = (async () => {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const ghost = document.querySelector("div.tv__ghost");
        if (ghost) {
          const r = ghost.getBoundingClientRect();
          out.width = Math.round(r.width); out.height = Math.round(r.height);
          return out;
        }
        await new Promise((r2) => requestAnimationFrame(r2));
      }
      return out;
    })();
    document.querySelector(studyRow).click();
    return p;
  }, navRow("study", study.id));
  line(".tv__ghost box", `${ghostBox.width} x ${ghostBox.height}px`);
  await settled();
} finally {
  await page.close();
  await browser.close();
  server.close();
}
