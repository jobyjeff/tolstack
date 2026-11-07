// Debug script (handoff a_part_with_many_interfaces_is_drawn_as_a_component_
// with_pins, 2026-11-06): screenshots the whole walk and three studies with
// their parts on the rails and as blocks, the pitch plate's block close up on
// the kinematic page, a scaled length mode, and a hover on a pin -- and
// measures what each picture DRAWS: link against rail, stub against rail,
// leader against chord, and each block's aspect. Serves THIS tree's apps/
// with data/ from this tree when it has a projection, else from the main
// checkout. NOT a tier -- pytest never collects it.
//
//   node tests/debug_block_shots.mjs [out-dir]
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { takeTheBrowserSlot, launchBrowser, loadPlaywright } from "../scripts/browser_runner.mjs";

takeTheBrowserSlot();
process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const DATA = existsSync(join(REPO, "data", "projections", "viewer", "topologies.json"))
  ? REPO : normalize("C:/workspace/tolstack");
const OUT = normalize(process.argv[2] ||
  join(REPO, "docs", "sessions", "lessons", "shots", "a_part_with_many_interfaces_is_drawn_as_a_component_with_pins"));
const TOPO = "vpa_pitch_linkage";
const PAGES = [
  ["walk", ""],
  ["kinematic", "?kinematic=vpa_pitch_linkage_blade_pitch_at_the_stops"],
  ["grip", `?topology=${TOPO}&study=rotor_fastener_grip_u10h`],
  ["cotter", `?topology=${TOPO}&study=pitch_link_cotter_hole_clearance`],
];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".bin": "application/octet-stream" };

function serve() {
  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      try {
        const rel = normalize(decodeURIComponent((req.url || "/").split("?")[0])).replace(/^[/\\]+/, "");
        const base = rel.split(sep)[0] === "data" ? DATA : REPO;
        const full = join(base, rel);
        if (!full.startsWith(base + sep)) { res.writeHead(403).end(); return; }
        const body = await readFile(full);
        res.writeHead(200, { "content-type": MIME[extname(full)] || "application/octet-stream" });
        res.end(body);
      } catch { res.writeHead(404).end(); }
    });
    server.listen(0, "127.0.0.1", () => done(server));
  });
}

async function settle(page, ms = 700) {
  await page.waitForFunction(() => !window.ViewerApp.lastTopoRender ||
    !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 20000 });
  await page.waitForTimeout(ms);
}

async function setView(page, setting, value) {
  await page.evaluate(([s, v]) => {
    const select = document.querySelector(`select[data-view-setting="${s}"]`);
    select.value = v;
    select.onchange();
    const menu = document.getElementById("dag-view");
    if (menu) menu.removeAttribute("open");
  }, [setting, value]);
  await settle(page);
}

// The drawn crossings: every link, stub and leader sampled to a polyline;
// links and stubs against every rail, leaders against every chord. A hit
// within 1.5px of either path's own end is where two lines meet, not cross.
async function measure(page) {
  return page.evaluate(() => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live.querySelector("svg.tv__rails");
    const poly = (p, n = 40) => {
      const len = p.getTotalLength(), pts = [];
      for (let i = 0; i <= n; i++) { const q = p.getPointAtLength(len * i / n); pts.push([q.x, q.y]); }
      return pts;
    };
    const rails = Array.from(svg.querySelectorAll("line.rail")).map((l) =>
      [[+l.getAttribute("x1"), +l.getAttribute("y1")], [+l.getAttribute("x2"), +l.getAttribute("y2")]]);
    const links = Array.from(svg.querySelectorAll("path.rail__link")).map((p) => poly(p));
    const stubs = Array.from(svg.querySelectorAll("path.rail__stub")).map((p) => poly(p, 4));
    const chords = Array.from(svg.querySelectorAll("path.rail__bar--chord")).map((p) => poly(p, 20));
    const leaders = Array.from(svg.querySelectorAll("path.rail__leader")).map((p) => poly(p, 30));
    const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5;
    const cross = (p1, p2, p3, p4) => {
      const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
      if (!(d1 * d2 < 0 && d3 * d4 < 0)) return null;
      const t = d1 / (d1 - d2);
      return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
    };
    const count = (as, bs) => {
      let n = 0;
      as.forEach((A) => bs.forEach((B) => {
        for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++) {
          const at = cross(A[i], A[i + 1], B[j], B[j + 1]);
          if (at && !near(at, A[0]) && !near(at, A[A.length - 1]) && !near(at, B[0]) &&
              !near(at, B[B.length - 1])) n++;
        }
      }));
      return n;
    };
    const blocks = Array.from(svg.querySelectorAll("rect.tv__block")).map((r) => ({
      part: r.getAttribute("data-block"),
      w: +r.getAttribute("width"), h: +r.getAttribute("height"),
      ratio: +(+r.getAttribute("width") / +r.getAttribute("height")).toFixed(2),
    }));
    const r = window.ViewerApp.lastTopoRender;
    return { svgWidth: +svg.getAttribute("width"), zoom: +r.zoom.toFixed(3),
             rails: rails.length, links: links.length, stubs: stubs.length,
             chords: chords.length, leaders: leaders.length,
             linkRail: count(links, rails), stubRail: count(stubs, rails),
             leaderChord: count(leaders, chords), blocks };
  });
}

async function dagShot(page, name, selector) {
  const box = await page.evaluate((sel) => {
    const live = Array.from(document.querySelectorAll("#topopane .tv__hscroll"))
      .filter((n) => !n.closest(".tv__ghost"))[0];
    const svg = live.querySelector("svg.tv__rails");
    const s = svg.getBoundingClientRect();
    const marks = Array.from(svg.querySelectorAll(sel || ".rail__bar--on, .rail__dot--on"))
      .map((n) => n.getBoundingClientRect());
    const pad = sel ? 60 : 30;
    const top = marks.length ? Math.min(...marks.map((b) => b.top)) - pad : Math.max(0, s.top);
    const bottom = marks.length ? Math.max(...marks.map((b) => b.bottom)) + pad : top + 1000;
    const left = sel && marks.length ? Math.min(...marks.map((b) => b.left)) - 220 : Math.max(0, s.left);
    const right = sel && marks.length ? Math.max(...marks.map((b) => b.right)) + 160 : left + Math.min(s.width, 1600);
    return { x: Math.max(0, left) + window.scrollX, y: Math.max(0, top) + window.scrollY,
             width: right - Math.max(0, left), height: Math.max(40, bottom - top) };
  }, selector || null);
  await page.screenshot({ path: join(OUT, name), clip: box, fullPage: true });
}

const { chromium } = await loadPlaywright();
let browser = null;
for (const channel of ["chrome", "msedge"]) {
  try { browser = await launchBrowser(chromium, { channel, headless: true }); break; } catch {}
}
if (!browser) { console.error("no browser channel"); process.exit(1); }
const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
await mkdir(OUT, { recursive: true });
const record = { data: DATA, pages: {} };
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => { errors.push(e.message); console.log("pageerror:", e.message); });
  for (const [name, query] of PAGES) {
    await page.goto(`${base}/apps/viewer/topology.html${query}`, { waitUntil: "load" });
    await page.evaluate(() => { try { localStorage.clear(); } catch {} });
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
    await settle(page, 1200);
    record.pages[name] = {};
    for (const drawing of ["rails", "blocks"]) {
      await setView(page, "partDrawing", drawing);
      record.pages[name][drawing] = await measure(page);
      await page.screenshot({ path: join(OUT, `${name}_${drawing}.png`) });
      await dagShot(page, `${name}_${drawing}_dag.png`);
    }
  }
  // The pitch plate's block, close up, on the kinematic page.
  await page.goto(`${base}/apps/viewer/topology.html${PAGES[1][1]}`, { waitUntil: "load" });
  await page.waitForSelector("#topopane svg.tv__rails", { timeout: 30000 });
  await settle(page, 1200);
  await setView(page, "partDrawing", "blocks");
  await page.locator('rect.tv__block[data-block="pitch_plate_215177_001"]').first()
    .scrollIntoViewIfNeeded().catch(() => {});
  await settle(page);
  await dagShot(page, "pitch_plate_block.png", 'rect.tv__block[data-block="pitch_plate_215177_001"]');
  // A hover on one of its pins: a LIT pin on the block's rail side, so the
  // shot shows its stub, its rail and its leader lighting (the first pin on
  // the page was an unlit one, and its hover showed nothing). The pointer
  // goes to the pin's own centre, and what lit is recorded.
  // The kinematic band visits the pitch plate twice, so it is two blocks
  // there (ISSUE_20261106_a_part_the_kinematic_stack_visits_twice_is_two_
  // blocks.md): the one with a lit rail-side pin is the one shot, marked
  // `data-shot` for the crop.
  const target = await page.evaluate(() => {
    const blocks = Array.from(document.querySelectorAll(
      'rect.tv__block[data-block="pitch_plate_215177_001"]')).filter((r) => !r.closest(".tv__ghost"));
    for (const block of blocks) {
      const bb = block.getBoundingClientRect();
      const pins = Array.from(document.querySelectorAll("circle.rail__dot--pin.rail__dot--on"))
        .filter((c) => !c.closest(".tv__ghost"))
        .map((c) => ({ id: c.getAttribute("data-id"), b: c.getBoundingClientRect() }))
        .filter(({ b }) => b.top >= bb.top && b.bottom <= bb.bottom &&
          Math.abs((b.left + b.right) / 2 - bb.left) < 3);
      if (!pins.length) continue;
      block.setAttribute("data-shot", "1");
      const { id, b } = pins[0];
      return { id, x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2, leftPins: pins.length,
               blocks: blocks.length };
    }
    return null;
  });
  record.hover = target;
  if (target) {
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(400);
    record.hover.lit = await page.evaluate(() => ({
      rails: document.querySelectorAll("#topopane path.rail.rail--hot").length,
      stubs: document.querySelectorAll("#topopane path.rail__stub.rail--hot").length,
      leaders: document.querySelectorAll("#topopane .rail__leader--hot, #topopane .rail__leader--lead").length,
      bars: document.querySelectorAll("#topopane .rail__bar--hot, #topopane .rail__bar--lead").length,
      rows: document.querySelectorAll("#topopane tr.tvrow--hot, #topopane tr[class*='--lead']").length,
    }));
    await dagShot(page, "pitch_plate_block_hover_pin.png", "rect.tv__block[data-shot]");
    await page.mouse.move(5, 5);
  }
  // A scaled length mode: lengths win over the aspect band.
  const lengths = page.locator("#dag-lengths, [data-control='lengths']");
  record.lengthsControl = await lengths.count();
  const modeOk = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, summary"));
    const b = buttons.find((n) => /^Lengths:/.test(n.textContent.trim()));
    if (!b) return false;
    b.click();
    return b.textContent.trim();
  });
  await settle(page, 1000);
  record.lengthsAfterClick = modeOk;
  record.scaled = await measure(page);
  await dagShot(page, "kinematic_blocks_scaled_dag.png");
  record.errors = errors;
} finally {
  await writeFile(join(OUT, "measurements.json"), JSON.stringify(record, null, 2) + "\n");
  console.log(JSON.stringify(record, null, 2));
  await browser.close();
  server.close();
}
