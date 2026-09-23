// Hand-run inspection probe for handoff flyout_resize_annotator_filter_and_
// deselect (2026-09-16). NOT a tier -- pytest never collects it and no runner
// calls it. Its job is the screenshots the handoff's definition of done asks
// for, and it is committed for the reason the previous two sessions' probes
// were: a screenshot nobody can re-take is a screenshot nobody can check.
//
//   node tests/debug_flyout_and_alerts.mjs --repo C:/workspace/tolstack
//   node tests/debug_flyout_and_alerts.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons
//
// `--repo` is the worktree escape hatch every real-data probe in this repo
// takes: data/ is gitignored and lives only in the main checkout, so the
// static server below serves /data/... from there while every app file comes
// from THIS tree. Without --shots it only prints what it measured.
//
// WHICH DATA EACH SHOT USES, because it is not one answer:
//
//   * the FLYOUT shots are LIVE (`topology.html` with no ?mock=1, reading the
//     projections under --repo). The claim they carry is "the DAG is visible
//     beside the panel", and the mock topology's drawing is a 78px stub -- a
//     screenshot of a stub proves nothing about a real one. They use
//     `pitch_system`, whose 262px drawing is the widest of the 21 live studies
//     and so the hardest case.
//   * the SOURCE-COLUMN shots are ?mock=1, because the demo stack's washer row
//     is the one carrying both alerts at once, which is what the before/after
//     pair is about.
//   * the RAIL shots are ?mock=1 and cannot be otherwise: the annotator needs
//     a File System Access grant to read anything real, and FSA needs a user
//     gesture no automated browser can supply. The fixture's three elements
//     cover all three binding states, which is what those shots show.
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

const PREFIX = "LESSONS_20260916_flyout_resize_annotator_filter_and_deselect";
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".md": "text/markdown",
};

// A repo-root static server: the "repo-root-static" shape both apps' transport
// probes match, and the one arrangement in which apps/annotate is a SIBLING of
// apps/viewer -- which is the whole precondition for the flyout existing.
// /data/... comes from DATA_REPO, everything else from this tree.
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

async function shot(page, name, opts) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}.png`);
  await page.screenshot({ path: file, ...(opts || {}) });
  console.log(`    wrote ${file}`);
}

// Park the pointer somewhere that triggers nothing, and dismiss anything a
// gesture left open. Not cosmetic: a drag on the flyout's seam ENDS with the
// pointer over the DAG, whose rail bars are hover-card triggers, so the first
// take of shot 2b had a citation card sitting across the diagram the shot
// exists to show. Escape is the popover's own dismiss (topology_app.js).
async function parkPointer(page) {
  await page.keyboard.press("Escape");
  await page.mouse.move(4, 4);
  await page.waitForFunction(() => {
    const pop = document.querySelector("#croppop");
    return !pop || pop.style.display === "none" || !pop.style.display;
  }, null, { timeout: 5000 }).catch(() => {});
}

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  // --- 1. the flyout, LEFT-docked beside a VISIBLE DAG, dragged wide --------
  //
  // LIVE data, not ?mock=1, and that is the whole point of these three shots:
  // the handoff asks for "the flyout LEFT-docked beside the visible DAG", the
  // mock topology's drawing is a 78px stub, and a screenshot of a stub proves
  // nothing about a real one. `pitch_system` renders the widest of the 21 live
  // drawings (262px), which is the hardest case for adjacency.
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
  await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });
  await page.locator(
    '[data-nav-kind="study"][data-nav-id="pitch_system_blade_angle_average"]').click();
  await page.waitForSelector("#study-3d", { timeout: 20000 });
  await page.locator("#study-3d").click();
  await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
  // Let the embedded annotator paint its own boot state, or the shot is an
  // empty iframe and says nothing about the panel being usable.
  await page.waitForFunction(() => {
    const doc = document.querySelector("#annotate-flyout iframe")?.contentDocument;
    const el = doc && doc.querySelector("#banner");
    return !!(el && el.textContent.trim());
  }, null, { timeout: 20000 });

  const box = async (sel) => page.locator(sel).boundingBox();
  // Where the DAG DRAWING is, against the panel. `svg.tv__rails` and NOT
  // `#topopane`: the pane is the drawing's horizontal scrollport, and a probe
  // that measured the scrollport is what reported 300px of clearance over a
  // diagram that was wholly covered (review, 2026-09-16). The drawing is also
  // `position: sticky; left: 0` inside that scrollport, so no scroll position
  // can move it -- there is no reading of "uncovered" that a scroll rescues.
  const railsAt = () => page.evaluate(() => {
    const svg = document.querySelector("#topopane svg.tv__rails");
    const panel = document.querySelector("#annotate-flyout").getBoundingClientRect();
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width),
             clear: r.width > 0 && r.left >= panel.right };
  });
  const reserve = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH.reserve);
  const at = { flyout: await box("#annotate-flyout"), dag: await box("#topopane") };
  const drawn = await railsAt();
  say(`flyout docked at x=${at.flyout.x}, ${at.flyout.width}px wide; the DAG ` +
      `drawing is ${drawn.w}px at x=${drawn.l}..${drawn.r}, wholly clear of ` +
      `the panel: ${drawn.clear} (the reserve floor is ${reserve})`);
  await parkPointer(page);
  await shot(page, "1_flyout_left_docked_default");

  // Real pointer drags on the seam. At 1600px with the preview pane at its own
  // 560px default the panel OPENS at its clamp, so it is narrowed first and
  // then widened back -- which is also the honest demonstration that the seam
  // works in both directions.
  const dragBy = async (dx) => {
    const seam = await box("#flyout-divider");
    await page.mouse.move(seam.x + seam.width / 2, 500);
    await page.mouse.down();
    await page.mouse.move(seam.x + seam.width / 2 + dx, 500, { steps: 14 });
    await page.mouse.up();
    return Math.round((await box("#annotate-flyout")).width);
  };
  const narrow = await dragBy(-220);
  const narrowRails = await railsAt();
  say(`dragged left 220px: ${Math.round(at.flyout.width)} -> ${narrow}px, ` +
      `drawing at x=${narrowRails.l}..${narrowRails.r}, clear: ${narrowRails.clear}`);
  await parkPointer(page);
  await shot(page, "2a_flyout_narrowed_more_dag");
  // "Resized WIDE" needs a window where wide is reachable. At 1600px the
  // clamp binds at 713 and the stylesheet's own default already sits there, so
  // dragging right buys nothing and a shot of it would be shot 1 again -- the
  // review said so. A 2200px window leaves the clamp at VA.FLYOUT_WIDTH.max,
  // so the panel can actually be opened up. Wider than Jeff's own screen,
  // which is the honest caveat on this shot: his note's screenshot of this
  // page is 1629px across, and at that width the clamp binds at ~740 and the
  // default already sits there -- shot 1 is what he sees.
  await page.setViewportSize({ width: 2200, height: 1000 });
  const wide = await dragBy(900);
  const wideRails = await railsAt();
  say(`at a 2200px window, dragged right 900px: ${narrow} -> ${wide}px ` +
      `(FLYOUT_WIDTH.max is ${await page.evaluate(
        () => window.ViewerApp.FLYOUT_WIDTH.max)}), drawing at ` +
      `x=${wideRails.l}..${wideRails.r}, clear: ${wideRails.clear}`);
  await parkPointer(page);
  await shot(page, "2b_flyout_resized_wide_dag_still_beside_it");
  await page.setViewportSize({ width: 1600, height: 1000 });

  // Closing puts the page back -- the nav rail it stood down, and the shift.
  // WAITED for, not sampled: the class comes off in the dialog's `close`
  // handler, which runs from a queued task one beat after the click.
  await page.locator("#flyout-close").click();
  await page.waitForFunction(() => !document.body.classList.contains("flyout-open"),
    null, { timeout: 5000 }).catch(() => {});
  const back = await railsAt();
  say(`closed: the nav rail is back at x=${(await box("#navtree")).x} and the ` +
      `drawing is back at x=${back.l}..${back.r}`);
  await parkPointer(page);
  await shot(page, "2c_flyout_closed_page_restored");
  await page.evaluate((k) => window.localStorage.removeItem(k),
    await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH_KEY));

  // --- 4. the stack table's source column, before and after ----------------
  //
  // "Before" is RECONSTRUCTED in the page, not checked out: the two chips the
  // row used to carry are re-inserted with the exact classes and the exact
  // words `sourcingCell` built them from until 2026-09-16. Both stylesheet
  // rules are still live (views/detail.js renders chip--zero-width, and the
  // chip--export-* rules never moved), so the reconstruction renders
  // pixel-identically to the previous build -- which is why it is worth having
  // beside the after shot rather than a prose description of it.
  // Back to ?mock=1 for the source column: the demo stack's washer row is the
  // one that carries BOTH alerts at once, which is exactly the row the
  // before/after pair is about. A fresh load rather than a mode switch, so no
  // respine transition is in flight behind the shot.
  await page.goto(`${url}/apps/viewer/topology.html?mock=1`, { waitUntil: "load" });
  await page.waitForSelector("tr.tvrow", { timeout: 20000 });
  await page.locator('[data-nav-kind="stack"][data-nav-id="demo_joint_standalone"]').click();
  await page.waitForSelector("#stackview tr.el-row", { timeout: 20000 });
  // The washer's row, which is the interesting one: it is zero-width AND
  // unestablished, so it is exactly the row that used to carry two filled
  // all-caps chips at once.
  const afterRow = page.locator("#stackview tr.el-row").nth(1);
  // Clipped to the SOURCE CELL, not to the row: the elements table is wider
  // than the window beside the preview pane (no inner scrollport, by design),
  // so a row-shaped clip cut off the very column these two shots are about.
  const sourceCell = afterRow.locator("td.el-row__source");
  await sourceCell.scrollIntoViewIfNeeded();
  const cellBox = await pad(await sourceCell.boundingBox(), 10);
  await shot(page, "4b_stack_source_column_after", { clip: cellBox });

  // ...then the reconstruction, in place, and shot at the SAME clip so the two
  // images are comparable pixel for pixel. Taken second rather than first so
  // nothing has to undo it.
  await page.evaluate(() => {
    const VA = window.ViewerApp;
    const row = document.querySelectorAll("#stackview tr.el-row")[1];
    const chips = row.querySelector(".el-row__chips");
    row.querySelector(".rowalert").style.display = "none";
    chips.appendChild(VA.chip("chip--zero-width", VA.ATTENTION.no_tolerance.text,
      VA.ATTENTION.no_tolerance.title));
    chips.appendChild(VA.chip("chip--export-unestablished",
      VA.EXPORT_CHIP_TEXT.unestablished, "reconstruction of the pre-2026-09-16 row"));
  });
  await shot(page, "4a_stack_source_column_before", { clip: cellBox });
  // Back to the shipped row, so the card shot below is of the real thing.
  await page.reload({ waitUntil: "load" });
  await page.waitForSelector("tr.tvrow", { timeout: 20000 });
  await page.locator('[data-nav-kind="stack"][data-nav-id="demo_joint_standalone"]').click();
  await page.waitForSelector("#stackview tr.el-row", { timeout: 20000 });

  // ...and the card behind the badge, which is where the words went -- plus
  // the `why` behind each of them, which the old chips only carried as a
  // native tooltip nothing could screenshot.
  await page.locator("#stackview tr.el-row").nth(1).locator(".rowalert").hover();
  await page.waitForSelector(".hovercard--alerts", { timeout: 10000 });
  const alerts = await page.locator(".hovercard--alerts li.hovercard__alert").count();
  say(`the stack row's badge opens a card listing ${alerts} alert(s) with their why`);
  await shot(page, "4c_stack_alert_card_open");
  await page.close();

  // --- 2 & 3. the annotator's rail: scoped, and one alert badge ------------
  const rail = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await rail.goto(`${url}/apps/annotate/index.html?mock=1`, { waitUntil: "load" });
  await rail.waitForSelector("#element-list li.el-row", { timeout: 20000 });
  say(`unfiltered rail: ${await rail.locator("#element-list li.el-row").count()} ` +
      `elements, ${await rail.locator("#parts-panel li.part-row").count()} part(s), ` +
      `no scope bar (${await rail.locator("#rail-filter").isVisible()})`);

  // The consolidated badge, with its popup open. Hovered rather than clicked
  // so the shot is the gesture Jeff described ("Mouse over the icon has a
  // popup that lists out the actual alerts").
  await rail.locator("#element-list .alertbadge").first().hover();
  await rail.waitForSelector("#alert-pop", { state: "visible", timeout: 10000 });
  say(`rail badges: ${await rail.locator("#element-list .alertbadge").count()} of ` +
      `${await rail.locator("#element-list li.el-row").count()} rows wear one; ` +
      `the popup says ${JSON.stringify(
        (await rail.locator("#alert-pop").textContent()).trim())}`);
  await shot(rail, "3_rail_alert_badge_popup_open", {
    clip: await pad(await rail.locator(".an__rail").boundingBox(), 8, 220, 360),
  });

  // The rail scoped to one element, the way the flyout enters it.
  await rail.goto(`${url}/apps/annotate/index.html?mock=1&topology=demo_system` +
    "&edge=demo_edge_untraced&isolate=demo_triangle", { waitUntil: "load" });
  await rail.waitForSelector("#rail-filter", { state: "visible", timeout: 20000 });
  say(`scoped rail: ${await rail.locator("#element-list li.el-row").count()} element, ` +
      `${await rail.locator("#parts-panel li.part-row").count()} part, scope bar says ` +
      JSON.stringify((await rail.locator("#rail-filter").textContent()).trim()));
  await shot(rail, "5_rail_scoped_to_one_element", {
    clip: await pad(await rail.locator(".an__rail").boundingBox(), 8, 220),
  });
  await rail.close();
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
  console.log("\n--- what this probe measured ---");
  notes.forEach((line) => console.log("  " + line));
}

// A clip rectangle with a little air around the element, so a cropped shot
// reads as part of a page rather than as a floating fragment. `extraWidth` is
// for a shot whose subject is a popup that OPENS beside its trigger and so
// lies outside the element being clipped to -- the first take of the badge
// shot cut the popup's own sentence in half, which is the one thing that shot
// exists to show.
async function pad(b, margin = 6, extraHeight = 0, extraWidth = 0) {
  return {
    x: Math.max(0, b.x - margin),
    y: Math.max(0, b.y - margin),
    width: b.width + margin * 2 + extraWidth,
    height: b.height + margin * 2 + extraHeight,
  };
}
