// Real-browser test tier for apps/viewer — the TRUTH tier
// (apps/viewer/run_tests.cjs, node vm + DOM shim, stays the FAST tier). Same
// infra and the same non-negotiables as forge CONVENTIONS.md §7: playwright-core
// only (never the full `playwright` package, which postinstalls a bundled
// Chromium through the corporate proxy), the INSTALLED Chrome via
// `channel: 'chrome'` with 'msedge' as fallback, driven over a CDP pipe — never
// raw `chrome --headless`, which silently produces nothing in the agent sandbox.
//
// What it proves that the DOM shim cannot:
//   1. test.html is green over BOTH file:// and http. The viewer must run by
//      double-clicking index.html, which is the whole reason it is classic
//      scripts; only a real file:// load proves index.html's script tags load in
//      the right order with no ESM/CORS surprise.
//   2. index.html?mock=1 really renders: the stack list, the elements table, an
//      untraced row that is visibly filled, an unestablished export block that is
//      visibly filled, an INCOMPLETE check, and the gap list — asserted against
//      the live DOM and CSS, not a shim. "Impossible to miss" is a CSS claim, and
//      a class-name check would pass straight through a stylesheet typo.
//   3. The crop popover opens on a REAL click and shows the resolved crop's
//      links, and shows the *reason* for the unresolvable one. Hover/focus
//      wiring is exactly what a DOM shim is blind to.
//   4. topology.html's rails and grid ACTUALLY line up — measured, box against
//      box, which is the one claim that page is built on and the one thing no
//      shim can check. Run against the real projection too, where it also
//      asserts every study total on screen equals topologies.json's own number.
//
//   npm install                                   # once: playwright-core, no browser download
//   node scripts/run_viewer_browser_tests.mjs
//   node scripts/run_viewer_browser_tests.mjs --repo C:\workspace\tolstack   # ...from a worktree
//
// `--repo` is the worktree escape hatch, same as apps/viewer/run_tests.cjs's:
// data/projections/viewer/ exists only in the MAIN checkout, so point the real
// tier at it or it reports itself skipped. The app's own files always come from
// THIS tree.
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, extname, normalize, sep } from "node:path";

process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = normalize(join(HERE, ".."));
const APP_DIR = join(REPO, "apps", "viewer");
const CHANNELS = ["chrome", "msedge"];

// Where data/projections/viewer/ is. THIS tree's apps/viewer is always what is
// served; only the projection is re-pointable, for the same reason and with the
// same flag as the node-fs tier in apps/viewer/run_tests.cjs.
const repoFlag = process.argv.indexOf("--repo");
const DATA_REPO = repoFlag === -1 ? REPO : normalize(process.argv[repoFlag + 1]);

async function readProjection(name) {
  try {
    return JSON.parse(await readFile(
      join(DATA_REPO, "data", "projections", "viewer", name), "utf8"));
  } catch {
    return null;
  }
}

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".png": "image/png",
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

async function launch() {
  const failures = [];
  for (const channel of CHANNELS) {
    try {
      return { browser: await chromium.launch({ channel, headless: true }), channel };
    } catch (err) {
      failures.push(`${channel}: ${String((err && err.message) || err)}`);
    }
  }
  throw new Error("No browser channel launched:\n  " + failures.join("\n  "));
}

async function runSuite(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__TEST_RESULTS__ !== undefined, null, { timeout: 15000 });
    const r = await page.evaluate(() => window.__TEST_RESULTS__);
    const failed = r.results.filter((x) => !x.ok);
    console.log(`[${label}] ${r.passed}/${r.total} passed  (${url})`);
    for (const f of failed) console.log(`    FAIL ${f.name}\n      ${f.error}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok: failed.length === 0 && errors.length === 0 };
  } catch (err) {
    console.log(`[${label}] ERROR loading suite (${url}): ${err.message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok: false };
  } finally {
    await page.close();
  }
}

// --- the app itself, in a real browser, on the seeded demo projection ----
async function testTheApp(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    await page.goto(url + "/index.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector(".stacklist__row", { timeout: 15000 });

    push("the stack list renders a row", await page.locator(".stacklist__row").count() === 1);
    push("the elements table renders every element",
      await page.locator("tr.el-row").count() === 4);

    // The elements table is wider than the space beside the 520px right pane at
    // this viewport (11 columns), and `.stackview` scrolls it rather than
    // letting it bleed into the sticky pane. Click the row's FIRST cell, not
    // the row: Playwright's default click targets the bounding box's centre,
    // which ignores clipping and can land past the visible edge on a row this
    // wide — the first cell never does.
    const selectRow = (n) => page.locator("tr.el-row").nth(n).locator("td").first().click();

    // Provenance colour is the deliverable, so assert the COMPUTED style, not a
    // class name — a stylesheet typo would pass a class-name check.
    const untraced = page.locator("tr.conf--untraced");
    push("exactly one untraced row", await untraced.count() === 1);
    const chipColor = await untraced.locator(".chip.conf--untraced").first()
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    push("the untraced chip is filled, not transparent",
      chipColor && chipColor !== "rgba(0, 0, 0, 0)" && chipColor !== "transparent");
    const rowBg = await untraced.first().evaluate((n) => getComputedStyle(n).backgroundColor);
    push("the untraced row is tinted", rowBg && rowBg !== "rgba(0, 0, 0, 0)");

    push("the zero-width band is marked",
      await page.locator("tr.el-row--zero-width").count() === 1 &&
      await page.locator("td.num--zero-width").count() === 2);

    // The loud export/identity chip is the one fact the compact row still
    // carries about the export — everything else moved to the right pane,
    // reached by clicking the row (deliverables 2 and 3).
    const exportChipColor = await page.locator(".chip--export-unestablished").first()
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    push("the unestablished-export chip is filled, not transparent, on the row",
      exportChipColor && exportChipColor !== "rgba(0, 0, 0, 0)" &&
      exportChipColor !== "transparent");

    // Select the plate (established export, and the one fixture crop that
    // resolves) — a real click, which the DOM shim cannot exercise, and the
    // crop image is fetched asynchronously on selection, not just on hover.
    await selectRow(0);
    push("the selected row is visibly marked",
      await page.locator("tr.el-row--selected").count() === 1);
    await page.waitForSelector(".detail__crop-img", { timeout: 5000 });
    push("an established export names its file and its sha in the right pane",
      /export established/.test(await page.locator(".el-export--established").textContent()) &&
      /sha256 recorded/.test(await page.locator(".el-export--established").textContent()));
    push("the crop renders inline in the right pane, not only behind a hover",
      await page.locator(".detail__crop-img").count() === 1);

    // Select the washer (unestablished export) — "impossible to miss" is a CSS
    // claim, and a stylesheet typo would pass any class-name check the DOM shim
    // can make, so the block's tint is asserted on the computed style.
    await selectRow(1);
    const unestablished = page.locator(".el-export--unestablished");
    push("an unestablished export shows its recorded why without a crop",
      await unestablished.count() === 1 &&
      /none hashes to the one/.test(await page.locator(".el-export__why").textContent()));
    const exportBg = await unestablished.first()
      .evaluate((n) => getComputedStyle(n).backgroundColor);
    push("the unestablished export block is tinted",
      exportBg && exportBg !== "rgba(0, 0, 0, 0)");

    // Select the eye (no export block at all) for the "none" spine baseline.
    await selectRow(2);
    const noneSpine = await page.locator(".el-export--none").first()
      .evaluate((n) => getComputedStyle(n).borderLeftColor);

    // Select the grip (the spec-pile identity rule) and compare against it: this
    // row names no export and is right not to, so it must NOT read like the
    // "nothing identifies these bytes" state one row up.
    await selectRow(3);
    const identity = page.locator(".el-export--identity_rule");
    push("the spec-pile row states its identity rule",
      await identity.count() === 1 &&
      /identity by filename \(append-only pile\)/.test(await identity.textContent()));
    const identitySpine = await identity.first()
      .evaluate((n) => getComputedStyle(n).borderLeftColor);
    push("the spec-pile spine is not the no-export grey",
      identitySpine && noneSpine && identitySpine !== noneSpine);
    push("the sourcing legend states the rule on the page",
      /append-only/.test(await page.locator("details.sv__legend").textContent()));
    // `check--incomplete` was the class until 2026-08-13, when
    // `check_completeness_schema` replaced the prose search with the schema field
    // and renamed it `check--budget`. This tier does not run under pytest, so the
    // stale selector sat here red until the next agent ran it.
    push("the budget-scope check is flagged",
      await page.locator("article.check--budget").count() === 1);
    push("both verdicts render",
      await page.locator(".verdict--pass").count() === 1 &&
      await page.locator(".verdict--fail").count() === 1);
    push("the gap list leads with the excluded term",
      /link eye width/.test(await page.locator("li.gap").first().textContent()));
    // The worksheet is content-rendered whether or not its <details> is open —
    // moved BELOW the table and collapsed by default, not gone (deliverable 1).
    push("the worksheet pane rendered markdown",
      await page.locator(".worksheet__body h1").count() === 1 &&
      await page.locator(".worksheet__body table").count() === 1);
    push("the worksheet sits below the table, collapsed by default",
      !(await page.locator("#worksheet-wrap").evaluate((n) => n.open)));

    // 3) the popover — a real click, which the DOM shim cannot exercise.
    await page.locator("button.crop-trigger--resolved").first().click();
    await page.waitForSelector(".croppop--resolved", { state: "visible", timeout: 5000 });
    push("the resolved popover is visible", await page.locator(".croppop").isVisible());
    push("the popover shows the source PDF path",
      /215197/.test(await page.locator(".croppop__path").textContent()));
    push("the popover offers a click-through to the reference",
      await page.locator(".croppop__link").count() >= 1);

    // Escape closes it — and it has to, because an open popover overlays the
    // rows underneath (Playwright's "intercepts pointer events" is the reader's
    // experience too).
    await page.keyboard.press("Escape");
    push("Escape closes the popover", !(await page.locator(".croppop").isVisible()));

    await page.locator("button.crop-trigger--unresolvable").first().click();
    await page.waitForSelector(".croppop--unresolvable", { state: "visible", timeout: 5000 });
    // The fixture's washer citation carries an `unestablished` export, which
    // build_viewer_crops.py short-circuits to unresolvable with the `why`
    // carried through. (It said "names no export" until 2026-08-12, a state no
    // live citation is in any more.)
    push("an unresolvable citation shows its reason, not a broken image",
      /is unestablished/.test(await page.locator(".croppop__reason").textContent()) &&
      await page.locator(".croppop img").count() === 0);

    // 4) the worksheet toggle, a real click on real layout. Collapsed by
    // default now, so the click OPENS it — the inverse of the old aside toggle.
    await page.locator("#worksheet-toggle").click();
    push("the worksheet pane opens on toggle",
      await page.locator("#worksheet-wrap").evaluate((n) => n.open));

    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0 && errors.length === 0;
    console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok };
  } catch (err) {
    console.log(`[${label}] ERROR: ${err.message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok: false };
  } finally {
    await page.close();
  }
}

// --- the topology page, in a real browser ---------------------------------
//
// What this proves that the DOM shim cannot, and it is the deliverable:
//
//   1. ALIGNMENT IS REAL. The whole page is one claim — a grid row and its rail
//      mark describe the same graph element, at the same y. The fast tier can
//      check that both come from row index i; only a real browser can measure
//      that the two boxes actually line up, which is what a reader believes when
//      they read a value off a row beside a dot.
//   2. Clicking an SVG mark selects it. A `<circle>` with an onclick is exactly
//      the thing a shim reports as working and a stylesheet can break.
//   3. The rails and the rows scroll together, because they share a scrollport.
//   4. Against the REAL projection: both topologies render, study selection
//      changes the grid, and every total on screen equals topologies.json's own
//      number — the claim the page prints in its own footer.
async function testTheTopologyPage(browser, url, label, realProjection, realCrops) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  // Every row's box centre against its rail mark's box centre. Half a pixel of
  // tolerance for subpixel layout; anything that actually drifts misses by a
  // whole row height.
  const alignmentDrift = () => page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("div.tvrow"));
    const drift = [];
    for (const row of rows) {
      const id = row.getAttribute("data-id");
      const kind = row.getAttribute("data-row-kind");
      const mark = document.querySelector(
        `svg.tv__rails [data-id="${CSS.escape(id)}"][data-row-kind="${kind}"]`);
      if (!mark) { drift.push(`${kind} ${id}: no rail mark`); continue; }
      const a = row.getBoundingClientRect();
      const b = mark.getBoundingClientRect();
      const delta = Math.abs((a.top + a.height / 2) - (b.top + b.height / 2));
      if (delta > 0.5) drift.push(`${kind} ${id}: off by ${delta.toFixed(2)}px`);
    }
    return { rows: rows.length, drift };
  });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("div.tvrow", { timeout: 15000 });

    push("the rails render as SVG, not as unknown HTML elements",
      await page.locator("svg.tv__rails circle.rail__dot").count() > 0 &&
      await page.locator("svg.tv__rails line.rail__bar").count() > 0 &&
      await page.locator("svg.tv__rails path.rail__link").count() > 0);

    // A `class` set with setAttribute on an SVG node is the one thing that
    // silently does nothing if it is set with `.className` instead, so assert
    // the COMPUTED stroke rather than the class name.
    const untracedStroke = await page.locator("line.rail__bar.conf--untraced")
      .first().evaluate((n) => getComputedStyle(n).stroke);
    push("an untraced bar is stroked in the untraced colour",
      untracedStroke && untracedStroke !== "none" &&
      untracedStroke !== "rgb(0, 0, 0)");

    const first = await alignmentDrift();
    push("every grid row lines up with its rail mark",
      first.rows > 0 && first.drift.length === 0);
    if (first.drift.length) console.log("    drift: " + first.drift.slice(0, 5).join(" | "));

    // 3) scrolled, they stay lined up — the reason both live in one scrollport.
    await page.locator(".tv__scroll").evaluate((n) => { n.scrollTop = 120; });
    const scrolled = await alignmentDrift();
    push("they are still lined up after scrolling", scrolled.drift.length === 0);
    await page.locator(".tv__scroll").evaluate((n) => { n.scrollTop = 0; });

    // 2) a real click on an SVG circle.
    await page.locator("svg.tv__rails circle.rail__dot").first().click();
    push("clicking a rail dot opens that interface in the preview pane",
      /An interface is a location, not a value/
        .test(await page.locator("#detail").textContent()));
    push("the clicked row is visibly marked",
      await page.locator("div.tvrow--selected").count() === 1);

    // Study selection: the grid marks, the rails thicken, the totals appear.
    await page.selectOption("#study-select", "demo_strut_branch");
    await page.waitForSelector("div.tvrow--on", { timeout: 5000 });
    push("selecting a study marks its chain and dims the rest",
      await page.locator("div.tvrow--on").count() > 0 &&
      await page.locator("div.tvrow--off").count() > 0);
    const dimmed = await page.locator("div.tvrow--off").first()
      .evaluate((n) => parseFloat(getComputedStyle(n).opacity));
    push("an off-chain row is actually dimmed, not just classed", dimmed < 0.9);
    push("the totals render", await page.locator(".tvtotal").count() === 5);
    push("the totals say where the numbers came from",
      /This page adds nothing up/.test(await page.locator("#totals").textContent()));

    // The chain layout: one rail, the sum's own order, still aligned.
    await page.locator("#layout-toggle").click();
    push("chain mode says so", /Showing: study chain/
      .test(await page.locator("#layout-toggle").textContent()));
    const chained = await alignmentDrift();
    push("the chain layout is aligned too", chained.drift.length === 0);
    push("a chain is one rail",
      await page.locator("svg.tv__rails circle.rail__dot").count() ===
      chained.rows - await page.locator("svg.tv__rails line.rail__bar").count());
    await page.locator("#layout-toggle").click();

    // A study that refuses to sum shows the refusal, with its next step.
    await page.selectOption("#study-select", "demo_ambiguous");
    await page.waitForSelector(".tverror", { timeout: 5000 });
    const refusal = await page.locator("#totals").textContent();
    push("a BranchAmbiguity renders as a result, not as a blank",
      /The selection reaches a fork/.test(refusal) &&
      /still unused/.test(refusal) &&
      await page.locator(".tvtotal").count() === 0);
    push("chain mode is unavailable for a study that does not sum",
      await page.locator("#layout-toggle").isDisabled());

    // --- the same page, against the REAL projection ------------------------
    if (!realProjection) {
      push("[real] projection present (skipped: not built)", true);
    } else {
      await page.evaluate(({ projection, crops }) => {
        // The one test seam, and it uses only exported API: swap the ?mock=1
        // fixture for the real projection and re-boot. There is no way to grant
        // the FSA directory picker from Playwright (it needs a user gesture),
        // which is the same limitation the stack viewer's Connect path records.
        window.ViewerApp.demoTopologyFixture = function () {
          return {
            startState: window.ViewerApp.STATE.READY,
            topologies: projection, crops: crops, images: {},
          };
        };
        window.ViewerApp.bootTopology();
      }, { projection: realProjection, crops: realCrops });
      await page.waitForSelector("div.tvrow", { timeout: 15000 });

      const ids = realProjection.topologies.map((t) => t.id);
      push("[real] both MVP topologies are offered",
        ids.includes("pitch_system") && ids.includes("vpa_output_to_pitch_plate"));

      for (const topology of realProjection.topologies) {
        await page.selectOption("#topology-select", topology.id);
        await page.waitForSelector("div.tvrow", { timeout: 5000 });
        const expected = topology.nodes.length + topology.edges.length;
        push(`[real] ${topology.id} renders all ${expected} rows`,
          await page.locator("div.tvrow").count() === expected);
        const drift = await alignmentDrift();
        push(`[real] ${topology.id} is aligned row for row`, drift.drift.length === 0);
        if (drift.drift.length) console.log("    drift: " + drift.drift.slice(0, 5).join(" | "));

        for (const study of topology.studies) {
          await page.selectOption("#study-select", study.id);
          await page.waitForTimeout(50);
          if (study.status !== "ok") {
            push(`[real] ${study.id} shows its refusal`,
              /does not sum|reaches a fork|not one chain|closes a ring|unlike things/
                .test(await page.locator("#totals").textContent()));
            continue;
          }
          const totals = await page.locator("#totals").textContent();
          // Value for value against the projection — the page's own footer
          // claims exactly this, and a `toFixed` sneaking into a view is
          // precisely how it would stop being true.
          const fields = ["nominal", "worst_case_min", "worst_case_max",
            "worst_case_half", "rss_min", "rss_max", "rss_half"];
          const missing = fields.filter((f) => !totals.includes(String(study.result[f])));
          push(`[real] ${study.id}'s totals are the projection's numbers`,
            missing.length === 0);
          if (missing.length) console.log(`    missing: ${missing.join(", ")}`);
          push(`[real] ${study.id} numbers every contribution`,
            await page.locator("div.tvrow--on").count() >= study.result.chain.length);
        }
        await page.selectOption("#study-select", "");
      }

      // The preview pane over a real citation, with a real crop behind it.
      await page.selectOption("#topology-select", "vpa_output_to_pitch_plate");
      await page.locator("div.tvrow[data-id='fastener_grip'] .tvcell--name").click();
      const detail = await page.locator("#detail").textContent();
      push("[real] an L1 edge shows the stack element's own citation",
        /NAS6403-NAS6420 Rev 4\.pdf/.test(detail) && /NAS6404U13D/.test(detail));
    }

    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0 && errors.length === 0;
    console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok };
  } catch (err) {
    console.log(`[${label}] ERROR: ${err.message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok: false };
  } finally {
    await page.close();
  }
}

// --- the height contract: the graph pane must not be squeezed to nothing ---
//
// Reproduces the reported symptom directly (HANDOFF_20260904_dag_viewer_
// vertical_budget.md): a ~700px inner viewport, the legend open, a study
// selected (so the totals footer is at its real height, not the empty-state
// paragraph), and a REAL provenance alarm on screen (crops and topologies
// deliberately stamped from different commits) -- every un-shrinkable block
// the diagnosis named, at once. `.tv__scroll` must still show at least the
// stated floor of 10 rows, and switching to compact density must hold that
// same floor in far fewer pixels without breaking row/rail alignment.
async function testHeightBudget(browser, url, label) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  const alignmentDrift = () => page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("div.tvrow"));
    const drift = [];
    for (const row of rows) {
      const id = row.getAttribute("data-id");
      const kind = row.getAttribute("data-row-kind");
      const mark = document.querySelector(
        `svg.tv__rails [data-id="${CSS.escape(id)}"][data-row-kind="${kind}"]`);
      if (!mark) { drift.push(`${kind} ${id}: no rail mark`); continue; }
      const a = row.getBoundingClientRect();
      const b = mark.getBoundingClientRect();
      if (Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) > 0.5) drift.push(`${kind} ${id}`);
    }
    return drift;
  });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("div.tvrow", { timeout: 15000 });

    // Force the strongest provenance alarm the page can raise: the same
    // fixture, with `topologies`'s own stamp moved to a different commit than
    // `crops`'s -- the disagreeing-pair case the fixture is deliberately quiet
    // about by default (topology_fixtures.js's own comment).
    await page.evaluate(() => {
      const fixture = window.ViewerApp.demoTopologyFixture();
      fixture.topologies.provenance = Object.assign({}, fixture.topologies.provenance,
        { head_sha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef" });
      window.ViewerApp.demoTopologyFixture = function () { return fixture; };
      window.ViewerApp.bootTopology();
    });
    await page.waitForSelector("div.tvrow", { timeout: 15000 });
    push("the provenance alarm is showing",
      /DIFFERENT trees/.test(await page.locator("#banner").textContent()));

    // Open the legend and select a study, so the totals footer is at its real
    // (not empty-state) height too -- every un-shrinkable block at once.
    await page.locator(".tv__legend summary").click();
    await page.selectOption("#study-select", "demo_base_to_tip");
    await page.waitForSelector("div.tvrow--on", { timeout: 5000 });

    const MIN_ROWS = 10;
    const comfortableHeight = await page.locator(".tv__scroll")
      .evaluate((n) => n.getBoundingClientRect().height);
    const comfortableRow = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tv-row")));
    push(`the graph pane keeps its ${MIN_ROWS}-row floor (legend open, study ` +
      "selected, provenance alarm showing)",
      comfortableHeight >= MIN_ROWS * comfortableRow - 1);

    // Compact density: the SAME floor in rows, in far fewer pixels, driven by
    // the SAME number the SVG draws its rails from -- not a second place this
    // can drift (the trap topology.js's VA.applyRowDensity documents).
    await page.locator("#density-toggle").click();
    await page.waitForTimeout(50);
    const compactRow = await page.evaluate(
      () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tv-row")));
    push("compact density actually shrinks the row pitch", compactRow < comfortableRow);
    const compactHeight = await page.locator(".tv__scroll")
      .evaluate((n) => n.getBoundingClientRect().height);
    push(`the ${MIN_ROWS}-row floor holds at compact density too`,
      compactHeight >= MIN_ROWS * compactRow - 1);

    push("rails stay aligned to rows at compact density",
      (await alignmentDrift()).length === 0);

    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0 && errors.length === 0;
    console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok };
  } catch (err) {
    console.log(`[${label}] ERROR: ${err.message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label, ok: false };
  } finally {
    await page.close();
  }
}

(async () => {
  const server = await startServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fileBase = pathToFileURL(join(APP_DIR, "x")).href.replace(/\/x$/, "");

  let browser, channel;
  try {
    ({ browser, channel } = await launch());
    console.log(`browser: ${browser.version()} via channel '${channel}'\n`);

    const results = [];
    results.push(await runSuite(browser, pathToFileURL(join(APP_DIR, "test.html")).href, "suite file://"));
    results.push(await runSuite(browser, `${baseUrl}/test.html`, "suite http"));
    results.push(await testTheApp(browser, fileBase, "app file://"));
    results.push(await testTheApp(browser, baseUrl, "app http"));

    const topologies = await readProjection("topologies.json");
    const crops = await readProjection("crops.json");
    if (!topologies) {
      console.log(`
note: no topologies.json under ${DATA_REPO} — the topology ` +
        `page's REAL tier is skipped (build it, or pass --repo <main checkout>)`);
    }
    results.push(await testTheTopologyPage(
      browser, fileBase, "topology file://", topologies, crops));
    results.push(await testTheTopologyPage(
      browser, baseUrl, "topology http", topologies, crops));
    results.push(await testHeightBudget(browser, fileBase, "topology height budget"));

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} browser checks passed`);
    if (failed.length) {
      console.log("FAILED: " + failed.map((f) => f.label).join(", "));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("viewer browser test runner failed to launch:\n" + (err.stack || err));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
