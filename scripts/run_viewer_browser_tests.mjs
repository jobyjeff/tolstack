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
//
//   npm install                                   # once: playwright-core, no browser download
//   node scripts/run_viewer_browser_tests.mjs
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
