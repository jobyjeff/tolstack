// Hand-run inspection probe for handoff design_pass_typography (2026-09-16).
// NOT a tier -- pytest never collects it and no runner calls it. Its job is the
// before/after screenshots the handoff's definition of done asks for, and it is
// committed for the reason every previous session's probe was: a screenshot
// nobody can re-take is a screenshot nobody can check.
//
//   node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack
//   node tests/debug_typography_pass.mjs --repo C:/workspace/tolstack \
//        --shots docs/sessions/lessons --phase before
//
// `--repo` is the worktree escape hatch every real-data probe in this repo
// takes: data/ is gitignored and lives only in the main checkout, so the static
// server below serves /data/... from there while every app file comes from THIS
// tree. Without --shots it only prints what it measured.
//
// `--phase before|after` is the whole shape of this probe: a typography pass is
// a change to a stylesheet and nothing else, so the ONLY honest evidence is the
// same page shot twice off two trees. Run it with `--phase before` on the
// baseline commit, change the CSS, run it again with `--phase after`, and the
// pair lands beside each other in docs/sessions/lessons/ under identical
// clips. Every shot below is therefore deliberately deterministic: same
// viewport, same nav id, same row, same scroll, so the two images differ only
// where the stylesheet does.
//
// WHICH DATA EACH SHOT USES, because it is not one answer:
//
//   * the TOPOLOGY shots are LIVE (no ?mock=1, reading the projections under
//     --repo). A typography pass is about density -- how a 43-row grid, a
//     20-study nav rail and a real gap list read at a glance -- and the mock
//     fixture has three rows. `pitch_system` is the page's hardest case and so
//     the one worth shooting.
//   * the STACK shots are LIVE too, on the two loose stacks that carry the two
//     tables this pass touches: rotor_fastener_length for the elements table,
//     hub_bearing_thermal_fit_m1 for the materials table (the one surface still
//     wearing a filled all-caps chip in its source column).
//   * the ANNOTATOR shots are ?mock=1 and cannot be otherwise: that app needs a
//     File System Access grant to read anything real, and FSA needs a user
//     gesture no automated browser can supply. The fixture's three elements
//     cover all three binding states, which is what those shots are about.
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

const PREFIX = "LESSONS_20260916_design_pass_typography";
const TOPOLOGY = "pitch_system";
const STUDY = "pitch_system_blade_angle_average";
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
  ".svg": "image/svg+xml", ".md": "text/markdown",
};

// A repo-root static server: the "repo-root-static" shape both apps' transport
// probes match, and the one arrangement in which apps/annotate is a SIBLING of
// apps/viewer. /data/... comes from DATA_REPO, everything else from this tree.
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

// --- the 13 surfaces, and the rule that one of them failing is not fatal ----
//
// Every shot below is one SURFACE, and the probe's whole value is the pair of
// 13-shot runs -- so a surface that cannot be taken must cost its own shot and
// nothing else. Until 2026-09-18 there was no partial-failure path at all: a
// throw anywhere unwound the script, and a throw at surface 8 (which happened
// in five runs of eight -- see the crash note on `resizeTo` below) silently
// withheld 8 through 13, two thirds of the evidence, while still printing a
// census for the five it had reached as though that were the run.
//
// So each surface is attempted in isolation and a failure is RECORDED with its
// reason. A prerequisite several surfaces share -- a page load, a nav click --
// is a `stage`; when one of those fails the surfaces behind it are skipped for
// that reason rather than each throwing its own downstream confusion.
const reached = [];
const skipped = [];

// The first line only: Playwright's messages carry a whole call log, and a
// skip reason has to fit on one line of the census at the end.
const firstLine = (err) =>
  String((err && err.message) || err).split("\n")[0].trim();

async function surface(name, body) {
  try {
    await body();
    reached.push(name);
  } catch (err) {
    skipped.push({ name, reason: firstLine(err) });
    console.log(`    SKIP ${name}: ${firstLine(err)}`);
  }
}

function skipAll(names, reason) {
  for (const name of names) {
    skipped.push({ name, reason });
    console.log(`    SKIP ${name}: ${reason}`);
  }
}

// A prerequisite for the surfaces after it. Returns null on success and the
// reason on failure rather than throwing, so the caller decides which surfaces
// that costs -- which is not always all of them.
async function stage(what, body) {
  try {
    await body();
    return null;
  } catch (err) {
    return `${what}: ${firstLine(err)}`;
  }
}

// Change the viewport and then WAIT OUT THE APP'S OWN REPAINT, which is the
// whole of the crash this probe aborted on in five runs of eight
// (ISSUE_20260917_the_typography_probe_crashes_on_the_stack_table_shots_in_
// five_runs_of_eight). topology_app.js:247 re-paints on `resize` behind a
// 150ms debounce, so `setViewportSize` arms a timer that tears down and
// rebuilds every row of whatever is on screen ~180ms later. The probe resized
// to 2200px and then immediately clicked the stack nav, so the el-row/mat-row
// the next `tableAround` resolved was detached mid-action by a render the
// probe had itself scheduled and never waited for -- measured on 2026-09-18
// with a MutationObserver on #stackview: `t+10ms setViewportSize returned`,
// `t+113ms tr.el-row satisfied`, `t+187ms removed=8 added=0`. The row really
// was present and settled when the call started (the issue eliminated the
// cross-fade ghost and late-loading images, correctly); what neither suspect
// covered is that the replacement was already in flight.
//
// 450ms is the same number `scripts/run_viewer_browser_tests.mjs` waits after
// its own three `setViewportSize` calls, for this debounce and no other
// reason. Kept as a wait rather than a signal from the app because the probe
// reads the page and never its internals, and because the alternative fix --
// replacing the locator action with a `page.evaluate` scrollIntoView -- lands
// on a different scroll offset and would have re-framed two of the 26
// committed shots to work around a race instead of removing it.
const RESIZE_DEBOUNCE_SETTLE = 450;
async function resizeTo(page, size) {
  await page.setViewportSize(size);
  await page.waitForTimeout(RESIZE_DEBOUNCE_SETTLE);
}

async function shot(page, name, opts) {
  if (!SHOTS) return;
  const file = join(SHOTS, `${PREFIX}_${name}_${PHASE}.png`);
  await page.screenshot({ path: file, ...(opts || {}) });
  console.log(`    wrote ${file}`);
}

// A clip rectangle with a little air around the element, so a cropped shot
// reads as part of a page rather than as a floating fragment.
function pad(b, margin = 8, extraHeight = 0, extraWidth = 0) {
  return {
    x: Math.max(0, b.x - margin),
    y: Math.max(0, b.y - margin),
    width: b.width + margin * 2 + extraWidth,
    height: b.height + margin * 2 + extraHeight,
  };
}

// The <table> a given row belongs to, in viewport coordinates: the elements and
// materials tables are siblings inside one #stackview, so a clip on the section
// is a clip on both and neither shot says anything on its own.
//
// `scrollIntoViewIfNeeded` and not a `page.evaluate` scrollIntoView, and that
// is deliberate: this is the call the 2026-09-17 crash was reported against,
// and the cause was upstream (`resizeTo` above, which now waits out the repaint
// that was detaching the row). The locator action is kept because the scroll
// offset it lands on is the one the 26 committed shots were framed at, and
// those shots are byte-identical across machines -- a helper swapped to dodge
// the race would have moved two of them for nothing.
async function tableAround(page, rowSelector) {
  const row = page.locator(rowSelector).first();
  await row.scrollIntoViewIfNeeded();
  return row.evaluate((tr) => {
    const r = tr.closest("table").getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
}

// Park the pointer somewhere that triggers nothing and dismiss anything a
// gesture left open. Not cosmetic: the rail bars and chips on this page are all
// hover-card triggers, so a shot taken with the pointer where the last click
// left it can have a card lying across the very surface the shot is about.
async function parkPointer(page) {
  await page.keyboard.press("Escape");
  await page.mouse.move(2, 2);
  // ...and drop FOCUS as well as the pointer. A shot taken straight after a
  // click carries the browser's focus ring on whatever was clicked, which on
  // the first take of shot 5 drew a bright rounded box around "What's missing"
  // that looked like a design decision and was not.
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
  await page.waitForFunction(() => {
    const pop = document.querySelector("#croppop");
    return !pop || pop.style.display === "none" || !pop.style.display;
  }, null, { timeout: 5000 }).catch(() => {});
}

// What the pass is FOR, measured rather than admired: how many distinct type
// sizes a surface renders, and how many of its marks are filled (a background
// of their own) versus outlined. "Emphasis is a budget" is the principle; these
// two numbers are the budget's balance, and they are printed for both phases so
// the pair of runs is a diff and not two vibes.
async function typeCensus(page, selector) {
  return page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return null;
    const sizes = new Map();
    let filled = 0, bold = 0, caps = 0, nodes = 0;
    for (const el of root.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el);
      // Only elements that actually carry their own text, so a wrapper does not
      // count its child's size a second time.
      const own = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && n.textContent.trim());
      if (own) {
        nodes += 1;
        const px = Math.round(parseFloat(cs.fontSize) * 10) / 10;
        sizes.set(px, (sizes.get(px) || 0) + 1);
        if (Number(cs.fontWeight) >= 700) bold += 1;
        if (cs.textTransform === "uppercase") caps += 1;
      }
      const bg = cs.backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent"
          && el.classList.length && /chip|verdict|flag|badge/.test(el.className)) {
        filled += 1;
      }
    }
    return {
      textNodes: nodes,
      sizes: Array.from(sizes.entries()).sort((a, b) => b[0] - a[0])
        .map(([px, n]) => `${px}px x${n}`),
      filledMarks: filled, boldRuns: bold, allCapsRuns: caps,
    };
  }, selector);
}


// The 13 surfaces in the order they are taken, so a run can say what it did
// not reach. Declared rather than derived: the whole point of the census below
// is to compare a run against the full set, and a set built from the run
// itself can only ever agree with it.
const VIEWER_SURFACES = [
  "1_topology_page", "2_nav_rail", "3_grid_rows", "4_preview_pane",
  "5_totals_verdicts_and_gaps", "6_hover_card", "7_legend_dialog",
];
const STACK_SURFACES = [
  "8_stack_elements_table", "9_stack_materials_table", "13_worksheet_dialog",
];
const ANNOTATE_SURFACES = [
  "10_annotator_page", "11_annotator_rail", "12_annotator_detail_pane",
];
const ALL_SURFACES = [...VIEWER_SURFACES, ...STACK_SURFACES, ...ANNOTATE_SURFACES];

const server = await startServer();
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: "chrome" });

try {
  // --- the topology page, live, at the study that carries the most ----------
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("pageerror", (e) => say(`  PAGE ERROR: ${e}`));
  const opened = await stage(`the live topology page at ${STUDY}`, async () => {
    await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });
    await page.locator(`[data-nav-kind="study"][data-nav-id="${STUDY}"]`).click();
    await page.waitForSelector("tr.tvrow", { timeout: 20000 });
    await parkPointer(page);
  });

  if (opened) {
    // No page, no surfaces on it -- and no stack shots either, since they are
    // two nav clicks away on this same page.
    skipAll([...VIEWER_SURFACES, ...STACK_SURFACES], opened);
  } else {
    await surface("1_topology_page", async () => {
      await shot(page, "1_topology_page");
    });

    await surface("2_nav_rail", async () => {
      const nav = await typeCensus(page, "#navtree");
      say(`nav rail: ${nav.textNodes} text-bearing elements across sizes ` +
          `${nav.sizes.join(", ")}; ${nav.filledMarks} filled marks, ` +
          `${nav.boldRuns} bold runs, ${nav.allCapsRuns} all-caps runs`);
      await shot(page, "2_nav_rail", {
        clip: pad(await page.locator("#navtree").boundingBox()),
      });
    });

    // The grid, on its own: the 43-row surface the "data rows tighter,
    // scannable" principle is actually about.
    await surface("3_grid_rows", async () => {
      await shot(page, "3_grid_rows", {
        clip: pad(await page.locator("#topopane").boundingBox()),
      });
    });

    // The preview pane, on an UNTRACED edge -- the pane's loudest state, and the
    // one carrying the annotate affordance and the untraced line at once.
    await surface("4_preview_pane", async () => {
      const untraced = page.locator("tr.tvrow.conf--untraced").first();
      await untraced.scrollIntoViewIfNeeded();
      await untraced.click();
      await page.waitForSelector("#detail .detail__head", { timeout: 10000 });
      await parkPointer(page);
      const detail = await typeCensus(page, "#detail");
      say(`preview pane (untraced edge): ${detail.textNodes} text-bearing elements ` +
          `across sizes ${detail.sizes.join(", ")}; ${detail.filledMarks} filled ` +
          `marks, ${detail.boldRuns} bold runs, ${detail.allCapsRuns} all-caps runs`);
      await shot(page, "4_preview_pane", {
        clip: pad(await page.locator("#detail").boundingBox()),
      });
    });

    // The totals strip with the verdict cards and the gap list OPEN -- the block
    // the "whitespace before chrome" and "one accent per view" principles hit
    // hardest, since it stacks a strip, cards, warnings and a 38-row gap list.
    await surface("5_totals_verdicts_and_gaps", async () => {
      const gaps = page.locator("#totals .tvgaps__summary");
      if (await gaps.count()) {
        await gaps.first().click();
        await page.waitForTimeout(120);
      }
      await page.locator("#totals").scrollIntoViewIfNeeded();
      await parkPointer(page);
      const totals = await typeCensus(page, "#totals");
      say(`totals + verdicts + gaps: ${totals.textNodes} text-bearing elements ` +
          `across sizes ${totals.sizes.join(", ")}; ${totals.filledMarks} filled ` +
          `marks, ${totals.boldRuns} bold runs, ${totals.allCapsRuns} all-caps runs`);
      await shot(page, "5_totals_verdicts_and_gaps", {
        clip: pad(await page.locator("#totals").boundingBox()),
      });
    });

    // A hover card, over a cited edge's confidence chip in the grid: the one
    // surface that has to say a lot in 460px without becoming a wall. The chip
    // and not the rail bar, because `.rail__barhit` is `stroke: transparent` and
    // a forced hover on it opens nothing -- the chip is a reader's other route
    // to the same VA.citationCard.
    await surface("6_hover_card", async () => {
      await page.locator("#topopane").scrollIntoViewIfNeeded();
      const bar = page.locator("#topopane .tvcell__chipswrap .chip.cardtrig").first();
      await bar.scrollIntoViewIfNeeded();
      await bar.hover();
      // `.hovercard` lands on #croppop ITSELF -- views/cards.js re-classes the one
      // shared positioned node per card kind rather than nesting a card inside it,
      // so `#croppop .hovercard` matches nothing and waits forever.
      await page.waitForSelector("#croppop.hovercard", { timeout: 10000 });
      await page.waitForTimeout(150);
      const card = await typeCensus(page, "#croppop");
      say(`hover card: ${card.textNodes} text-bearing elements across sizes ` +
          `${card.sizes.join(", ")}; ${card.boldRuns} bold runs, ` +
          `${card.allCapsRuns} all-caps runs`);
      await shot(page, "6_hover_card", {
        clip: pad(await page.locator("#croppop").boundingBox()),
      });
    });
    // Outside the surface, and deliberately: whether shot 6 was taken or not,
    // the card it opened has to be dismissed before shot 7 is framed.
    await parkPointer(page).catch(() => {});

    // The legend: the one long-prose surface in either app, so the one the
    // measure/line-height principle is really about.
    await surface("7_legend_dialog", async () => {
      await page.locator("#legend-toggle").click();
      await page.waitForSelector("#legend-dialog[open]", { timeout: 10000 });
      await page.waitForTimeout(120);
      await shot(page, "7_legend_dialog");
    });
    // Same reasoning: a legend left open would be the backdrop of every shot
    // after it, so it closes whether or not its own shot came out.
    await page.keyboard.press("Escape").catch(() => {});

    // --- the two stack tables, live ------------------------------------------
    //
    // One nav click, two shots. `hub_bearing_thermal_fit_m1` is not a
    // convenience: it is one of only TWO stack leaves the live nav offers at all
    // (VA.looseStacks -- every other stack is re-expressed by a topology and
    // gets no leaf of its own), and it is the one that renders BOTH tables, the
    // elements table and the materials table whose source column is the last
    // filled all-caps chip in the app.
    // A WIDER window for these two, and it is not a nicety: the elements table is
    // eleven columns and `.stackview` scrolls sideways by design, so at the 1600px
    // viewport the rest of this probe uses, the source column -- the always-visible
    // one Jeff's note is about -- sits outside the table's own box and outside any
    // clip taken from it. At 2200px the whole table is in the frame.
    const onStack = await stage(
      "the live stack view at hub_bearing_thermal_fit_m1", async () => {
        // resizeTo, never setViewportSize: the click below must not race the
        // repaint this resize schedules. See RESIZE_DEBOUNCE_SETTLE.
        await resizeTo(page, { width: 2200, height: 1000 });
        await page
          .locator('[data-nav-kind="stack"][data-nav-id="hub_bearing_thermal_fit_m1"]')
          .click();
        await page.waitForSelector("#stackview tr.el-row", { timeout: 20000 });
        await parkPointer(page);
        const stack = await typeCensus(page, "#stackview");
        say(`stack view (hub_bearing_thermal_fit_m1): ${stack.textNodes} text-bearing ` +
            `elements across sizes ${stack.sizes.join(", ")}; ${stack.filledMarks} ` +
            `filled marks, ${stack.boldRuns} bold runs, ${stack.allCapsRuns} ` +
            `all-caps runs`);
      });

    if (onStack) {
      skipAll(STACK_SURFACES, onStack);
    } else {
      await surface("8_stack_elements_table", async () => {
        const elTable = await tableAround(page, "#stackview tr.el-row");
        await shot(page, "8_stack_elements_table", { clip: pad(elTable) });
      });

      await surface("9_stack_materials_table", async () => {
        const matTable = await tableAround(page, "#stackview tr.mat-row");
        say(`materials table: ${await page.locator("#stackview tr.mat-row").count()} rows`);
        await shot(page, "9_stack_materials_table", { clip: pad(matTable) });
      });

      // ...and the worksheet, which is the other long-prose surface and the only
      // one in either app that renders a whole DOCUMENT. Stack mode only, which is
      // why it is shot here rather than beside the legend: topology_app.js hides
      // the topbar button outside it.
      await surface("13_worksheet_dialog", async () => {
        await page.locator("#worksheet-toggle").click();
        await page.waitForSelector("#worksheet-dialog[open]", { timeout: 10000 });
        await page.waitForFunction(() => {
          const body = document.querySelector("#worksheet .worksheet__body");
          return !!(body && body.textContent.trim());
        }, null, { timeout: 15000 });
        // NOT parkPointer(): its first act is Escape, which is a modal <dialog>'s own
        // dismiss -- the first take of this shot was the page behind a worksheet the
        // probe had just closed. The pointer and the focus ring still have to go.
        await page.mouse.move(2, 2);
        await page.evaluate(() => {
          if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
          }
        });
        const ws = await typeCensus(page, "#worksheet");
        say(`worksheet dialog: ${ws.textNodes} text-bearing elements across sizes ` +
            `${ws.sizes.join(", ")}`);
        await shot(page, "13_worksheet_dialog");
      });
    }
  }
  await page.close();

  // --- the annotator (mock: FSA needs a gesture no browser can supply) ------
  //
  // Its OWN page, so nothing above can cost it: the annotator shots are the
  // three this probe can always take (one fixture, no projections, no --repo),
  // and before 2026-09-18 they were the three most often lost, because every
  // abort upstream unwound the script before this page was ever opened.
  const an = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  an.on("pageerror", (e) => say(`  ANNOTATE PAGE ERROR: ${e}`));
  const onAnnotate = await stage("the annotator at ?mock=1", async () => {
    await an.goto(`${url}/apps/annotate/index.html?mock=1`, { waitUntil: "load" });
    await an.waitForSelector("#element-list li.el-row", { timeout: 20000 });
    await an.mouse.move(2, 2);
  });

  if (onAnnotate) {
    skipAll(ANNOTATE_SURFACES, onAnnotate);
  } else {
    await surface("10_annotator_page", async () => {
      await shot(an, "10_annotator_page");
    });

    await surface("11_annotator_rail", async () => {
      const railCensus = await typeCensus(an, ".an__rail");
      say(`annotator rail: ${railCensus.textNodes} text-bearing elements across ` +
          `sizes ${railCensus.sizes.join(", ")}`);
      await shot(an, "11_annotator_rail", {
        clip: pad(await an.locator(".an__rail").boundingBox()),
      });
    });

    // The detail pane with an element selected -- where the bind form, the
    // precedence note and the read-only note all live.
    await surface("12_annotator_detail_pane", async () => {
      await an.locator("#element-list li.el-row").first().click();
      await an.waitForTimeout(150);
      await an.mouse.move(2, 2);
      const detCensus = await typeCensus(an, ".an__detail");
      say(`annotator detail pane: ${detCensus.textNodes} text-bearing elements ` +
          `across sizes ${detCensus.sizes.join(", ")}`);
      await shot(an, "12_annotator_detail_pane", {
        clip: pad(await an.locator(".an__detail").boundingBox()),
      });
    });
  }
  await an.close();
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
  console.log(`\n--- what this probe measured (phase: ${PHASE}) ---`);
  notes.forEach((line) => console.log("  " + line));

  // The census that makes a partial run readable as one. `n of 13` against the
  // DECLARED set, not against the run's own tally: a probe that reached five
  // surfaces used to print five paragraphs and no denominator, which reads
  // exactly like a complete run of a five-surface probe.
  console.log(`\n--- surfaces: ${reached.length} of ${ALL_SURFACES.length} ---`);
  if (skipped.length) {
    for (const { name, reason } of skipped) {
      console.log(`  SKIPPED ${name}  --  ${reason}`);
    }
    // Non-zero, because the before/after pair is the deliverable and a pair
    // with a hole in it is not one. The shots that WERE taken are on disk and
    // are still worth having, which is why this is an exit code and not a
    // refusal to write them.
    process.exitCode = 1;
  } else {
    console.log("  all 13 taken");
  }
}
