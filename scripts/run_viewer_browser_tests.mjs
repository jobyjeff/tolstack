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
//      double-clicking topology.html, which is the whole reason it is classic
//      scripts; only a real file:// load proves its script tags load in the
//      right order with no ESM/CORS surprise. index.html's own redirect is a
//      real navigation too, checked the same way.
//   2. topology.html?mock=1 really renders BOTH modes: the topology mode (see
//      #4) and, since handoff viewer_consolidation retired the separate stack
//      viewer into this same page, the classic elements-table mode reached by
//      clicking a leaf in the ONE nav tree (viewer_v2_single_nav) — an
//      untraced row that is visibly filled, an unestablished export block that
//      is visibly filled, a budget-scope check, and the gap list — asserted
//      against the live DOM and CSS, not a shim. "Impossible to miss" is a CSS
//      claim, and a class-name check would pass straight through a stylesheet
//      typo.
//   3. The crop popover opens on a REAL click and shows the resolved crop's
//      links, and shows the *reason* for the unresolvable one — in both modes,
//      since the topology grid's own thumbnail trigger (deliverable 1) is the
//      same popover. Hover/focus wiring is exactly what a DOM shim is blind to.
//   4. topology.html's rails and grid ACTUALLY line up — measured, box against
//      box, which is the one claim that page is built on and the one thing no
//      shim can check. Run against the real projection too, where it also
//      asserts every study total on screen equals topologies.json's own number.
//   5. The nav tree (views/nav.js), the toolbar (views/topology.js's
//      renderTopoToolbar) and the two <dialog>s (legend, worksheet) are real
//      clicks on real layout — a <select>'s change event and a <details>'
//      toggle event are exactly the kind of interaction a shim can fake and a
//      real browser can catch drifting.
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

// A plain static server rooted at the REPO, not just apps/viewer — the
// "repo-root-static" shape storage/http.js's second candidate matches
// (`python -m http.server` from the repo root), and the one server this
// script can start that lets ?mock=1-free boot actually exercise the HTTP
// transport rather than falling back to FSA. `/data/...` is served from
// DATA_REPO (the worktree escape hatch every other real-data check in this
// file already uses) so a worktree run still reaches the main checkout's
// projections; everything else — the app's own files — always comes from
// THIS tree, same rule as the rest of the file.
function startRepoRootServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        const rel = normalize(urlPath).replace(/^[/\\]+/, "");
        const root = rel.split(sep)[0] === "data" ? DATA_REPO : REPO;
        const full = join(root, rel);
        if (full !== root && !full.startsWith(root + sep)) {
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

// --- a stub tolstack_mount_rebuild_endpoint, sibling-data-mount shape ------
//
// Mimics drawing-checker's own mount (webui/analyses.py: VIEWER_MOUNT =
// "/tolstack/viewer", DATA_MOUNT = "/tolstack/data") plus a sibling
// /tolstack/rebuild (POST) + /tolstack/rebuild/status (GET) — NOT the real
// endpoint (tolstack_mount_rebuild_endpoint, staged the same day as this
// handoff and owned by drawing-checker, not built here), just enough to
// prove the viewer's OWN click path end to end: probe, button, POST, poll,
// reload. `matchCrops` controls whether the synthetic topologies.json/
// crops.json provenance stamps agree (fresh) or not (stale);
// `rebuildCapable` controls whether the stub answers the rebuild routes at
// all, the same "absent means not shipped yet" case storage/http.js's own
// probe has to survive.
function startSiblingMountServer({ matchCrops, rebuildCapable }) {
  return new Promise((resolve) => {
    let busy = false;
    const topologiesJson = () => JSON.stringify({
      topologies: [],
      provenance: { branch: "master", head_sha: "1".repeat(40), behind_trunk: 0, dirty: false },
    });
    const cropsJson = () => JSON.stringify({
      by_stack: {}, summary: {},
      provenance: {
        branch: "master",
        head_sha: matchCrops ? "1".repeat(40) : "2".repeat(40),
        behind_trunk: 0, dirty: false,
      },
    });
    const server = createServer(async (req, res) => {
      const u = (req.url || "/").split("?")[0];
      if (u === "/tolstack/rebuild/status" && req.method === "GET") {
        if (!rebuildCapable) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ busy, state: busy ? "running" : "done" }));
        return;
      }
      if (u === "/tolstack/rebuild" && req.method === "POST") {
        if (!rebuildCapable) { res.writeHead(404).end("not found"); return; }
        busy = true;
        setTimeout(() => { busy = false; }, 200);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ busy: true, state: "running" }));
        return;
      }
      if (u === "/tolstack/data/topologies.json") {
        res.writeHead(200, { "content-type": "application/json" }).end(topologiesJson());
        return;
      }
      if (u === "/tolstack/data/crops.json") {
        res.writeHead(200, { "content-type": "application/json" }).end(cropsJson());
        return;
      }
      if (u === "/tolstack/data/results.json") {
        res.writeHead(404).end("not found");
        return;
      }
      if (u.startsWith("/tolstack/viewer/")) {
        try {
          const rel = u.slice("/tolstack/viewer/".length) || "topology.html";
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
        return;
      }
      res.writeHead(404).end("not found");
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// The banner's whole deliverable (viewer_rebuild_affordance, 2026-09-10): no
// rebuild command ever renders again, in either mode, and a live endpoint
// drives a real click through to a reload. Three servers, one scenario each —
// a fresh stub per scenario keeps the busy/done state machine from leaking
// across them the way one shared server's mutable `busy` flag would.
async function testRebuildAffordance(browser) {
  const label = "rebuild affordance (stub sibling mount)";
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const noCommandsOrPaths = (text) => !/\.py|venv-win|C:\\/.test(text || "");

  async function withServer(opts, fn) {
    const server = await startSiblingMountServer(opts);
    const port = server.address().port;
    const page = await browser.newPage();
    try {
      await page.goto(`http://127.0.0.1:${port}/tolstack/viewer/topology.html`,
        { waitUntil: "load" });
      await fn(page);
    } finally {
      await page.close();
      server.close();
    }
  }

  try {
    // 1) stale + capability -> a button, and a real click drives the stub
    //    endpoint through busy -> done.
    await withServer({ matchCrops: false, rebuildCapable: true }, async (page) => {
      await page.waitForSelector(".banner__rebuild button", { timeout: 15000 });
      push("stale+capability renders a Rebuild button, not the sentence",
        await page.locator(".banner__rebuild button").count() === 1 &&
        await page.locator(".banner__rebuild-hint").count() === 0);
      push("no command or path anywhere in the banner (capability case)",
        noCommandsOrPaths(await page.locator("#banner").textContent()));

      await page.locator(".banner__rebuild button").click();
      await page.waitForSelector(".banner__rebuild button[disabled]", { timeout: 5000 });
      push("clicking Rebuild disables the button while the stub reports busy", true);
      await page.waitForFunction(
        () => !document.querySelector(".banner__rebuild button")?.disabled,
        null, { timeout: 5000 });
      push("the button re-enables once the stub's status reports done", true);
    });

    // 2) stale + no capability -> one plain sentence, no button, no command.
    await withServer({ matchCrops: false, rebuildCapable: false }, async (page) => {
      await page.waitForSelector(".banner__rebuild-hint", { timeout: 15000 });
      push("stale+no-capability renders the one-sentence state, no button",
        await page.locator(".banner__rebuild-hint").count() === 1 &&
        await page.locator(".banner__rebuild button").count() === 0);
      push("no command or path anywhere in the banner (no-capability case)",
        noCommandsOrPaths(await page.locator("#banner").textContent()));
    });

    // 3) fresh (matching) provenance -> no stale banner at all.
    await withServer({ matchCrops: true, rebuildCapable: true }, async (page) => {
      await page.waitForSelector("#banner", { timeout: 15000 });
      await page.waitForTimeout(200);
      push("fresh (matching) provenance shows no stale banner",
        await page.locator(".banner__stale").count() === 0);
    });

    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0;
    console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    return { label, ok };
  } catch (err) {
    console.log(`[${label}] ERROR: ${err.message}`);
    return { label, ok: false };
  }
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

// A nav row's stable selector — views/nav.js stamps `data-nav-kind` /
// `data-nav-id` (and, for a study, `data-topology-id`) on every row, so a test
// never has to match a topology/study TITLE (which carries a "⚠ " prefix for
// an errored study, and is prose the next handoff is free to reword).
// Built and run in NODE (unlike the in-page alignmentDrift helpers below,
// which run inside `page.evaluate` and can use the browser's own `CSS.escape`)
// — every id this file passes is a plain identifier, so a bare quote-escape is
// enough without pulling in the DOM's CSS.escape.
function navRow(kind, id) {
  return `[data-nav-kind="${kind}"][data-nav-id="${String(id).replace(/"/g, '\\"')}"]`;
}

// --- the classic elements table, reached through the ONE nav tree ----------
//
// Reached by clicking a stack leaf (VA.looseStacks, or a topology's own
// covered-stack child) in the nav, not by its own page any more — index.html
// is a redirect stub (checked separately, testIndexRedirects). Every assertion
// below is unchanged from the retired stack viewer's own browser test:
// views/stack.js and views/detail.js did not move, only what boots them did.
async function testTheApp(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="stack"]', { timeout: 15000 });

    // Both the stack a topology covers (demo_joint, nested under its topology
    // in the tree) and the one that stands in for every stack that has none
    // (demo_joint_standalone, a top-level leaf) — deliverable 1's nav lists
    // every stack, not just the loose ones (views/nav.js's own comment says
    // why: a covered stack's own check verdict lives nowhere else).
    push("the nav lists every stack, covered or not",
      await page.locator('[data-nav-kind="stack"]').count() === 2);
    push("the one a topology covers carries the pointer to it",
      await page.locator(".chip--kind", { hasText: "classic view" }).count() === 1);

    // Switch from the default topology mode into stack mode — a real click,
    // which is the one thing this test tier exists to exercise.
    await page.locator(navRow("stack", "demo_joint")).click();
    await page.waitForSelector("tr.el-row", { timeout: 15000 });
    push("picking the stack marks its nav row and hides the toolbar",
      await page.locator(navRow("stack", "demo_joint")).evaluate(
        (n) => n.className.indexOf("navtree__row--on") !== -1) &&
      await page.locator("#toolbar").evaluate((n) => getComputedStyle(n).display) === "none");

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
    // class name — a stylesheet typo would pass a class-name check. Scoped to
    // #stackview: the topology grid's OWN (hidden) demo mechanism also has an
    // untraced edge, and a bare selector would count both.
    const untraced = page.locator("#stackview tr.conf--untraced");
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
    // reached by clicking the row (deliverables 2 and 3 of viewer_consolidation).
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
    push("the budget-scope check is flagged",
      await page.locator("article.check--budget").count() === 1);
    push("both verdicts render",
      await page.locator(".verdict--pass").count() === 1 &&
      await page.locator(".verdict--fail").count() === 1);
    push("the gap list leads with the excluded term",
      /link eye width/.test(await page.locator("li.gap").first().textContent()));
    // The worksheet is content-rendered whether or not its <dialog> is open —
    // it lives in its own dialog now (deliverable 2 of viewer_v2_single_nav),
    // closed by default, not gone.
    push("the worksheet pane rendered markdown",
      await page.locator(".worksheet__body h1").count() === 1 &&
      await page.locator(".worksheet__body table").count() === 1);
    push("the worksheet dialog is closed by default",
      !(await page.locator("#worksheet-dialog").evaluate((n) => n.open)));

    // 3) the popover — a real click, which the DOM shim cannot exercise.
    // Scoped to #stackview: the topology grid's OWN (hidden) rows carry the
    // same crop-trigger classes for the same crop_key, so a bare selector
    // would happily click the invisible one and hang.
    await page.locator("#stackview button.crop-trigger--resolved").first().click();
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

    await page.locator("#stackview button.crop-trigger--unresolvable").first().click();
    await page.waitForSelector(".croppop--unresolvable", { state: "visible", timeout: 5000 });
    // The fixture's washer citation carries an `unestablished` export, which
    // build_viewer_crops.py short-circuits to unresolvable with the `why`
    // carried through. (It said "names no export" until 2026-08-12, a state no
    // live citation is in any more.)
    push("an unresolvable citation shows its reason, not a broken image",
      /is unestablished/.test(await page.locator(".croppop__reason").textContent()) &&
      await page.locator(".croppop img").count() === 0);

    // 4) the worksheet toggle opens the dialog — a real click on real layout.
    await page.locator("#worksheet-toggle").click();
    await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
    push("the worksheet dialog opens on toggle",
      await page.locator("#worksheet-dialog").evaluate((n) => n.open));
    await page.locator("#worksheet-close").click();
    push("its own close button closes it",
      !(await page.locator("#worksheet-dialog").evaluate((n) => n.open)));

    // 5) picking the topology from the (still-visible) nav tree switches back.
    await page.locator(navRow("topology", "demo_mechanism")).click();
    await page.waitForSelector("tr.tvrow", { timeout: 5000 });
    push("picking a topology switches back to the DAG, and the stack view hides",
      await page.locator("#stackview").evaluate((n) => getComputedStyle(n).display) === "none" &&
      await page.locator("tr.tvrow").count() > 0);

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
    const rows = Array.from(document.querySelectorAll("tr.tvrow"));
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
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });

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
      await page.locator("tr.tvrow--selected").count() === 1);

    // The grid's own thumbnail trigger (deliverable 1 of viewer_consolidation) —
    // a real click, which the DOM shim cannot exercise. `base_thickness`
    // re-expresses demo_joint's `plate`, whose crop resolves; the same popover
    // the classic view's rows use (views/crop.js), so this is the one place
    // both modes are proved to share it in a real browser.
    await page.locator("tr.tvrow[data-id='base_thickness'] button.crop-trigger")
      .click();
    await page.waitForSelector(".croppop--resolved", { state: "visible", timeout: 5000 });
    push("the topology grid's thumbnail trigger opens the same crop popover",
      await page.locator(".croppop").isVisible() &&
      /215197/.test(await page.locator(".croppop__path").textContent()));
    await page.keyboard.press("Escape");
    push("Escape closes it here too", !(await page.locator(".croppop").isVisible()));
    // An edge with no crop_key (authored inline, or a derived gap) gets no
    // trigger at all — showing one would read as a stale index rather than
    // what it is.
    push("an edge with no crop_key gets no trigger",
      await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] button.crop-trigger")
        .count() === 0);

    // Whole-edge hover (deliverable 3): a dashed bar's OWN stroke
    // (rail__bar--gap/--derived) has real gaps in it, and under
    // `pointer-events: stroke` a gap in the dash pattern used to hit nothing.
    // `tip_to_strut_end` is the fixture's one gap/derived edge, so its bar is
    // dashed by construction; sampling several points along its FULL drawn
    // length (not just its centre, where a dash happens to land) proves the
    // invisible hit path (views/topology.js's railsSvg) covers the whole
    // thing, not just the visible dashes.
    const hoverCoverage = await page.evaluate(() => {
      const mark = document.querySelector(
        'svg.tv__rails [data-id="tip_to_strut_end"][data-row-kind="edge"]');
      if (!mark) return null;
      const box = mark.getBoundingClientRect();
      const x = box.left + box.width / 2;
      return [0.02, 0.25, 0.5, 0.75, 0.98].map((f) => {
        const y = box.top + box.height * f;
        const hit = document.elementFromPoint(x, y);
        return hit && hit.getAttribute ? hit.getAttribute("data-id") : null;
      });
    });
    push("the whole drawn length of a dashed (gap) edge responds to hover, " +
      "not just its own dashes",
      hoverCoverage && hoverCoverage.every((id) => id === "tip_to_strut_end"));

    // Study selection, through the nav tree: the grid marks, the rails
    // thicken, the totals strip appears.
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector("tr.tvrow--on", { timeout: 5000 });
    push("selecting a study marks its chain and dims the rest",
      await page.locator("tr.tvrow--on").count() > 0 &&
      await page.locator("tr.tvrow--off").count() > 0);
    const dimmed = await page.locator("tr.tvrow--off").first()
      .evaluate((n) => parseFloat(getComputedStyle(n).opacity));
    push("an off-chain row is actually dimmed, not just classed", dimmed < 0.9);
    push("the totals render as chips in the slim strip",
      await page.locator(".chip--total").count() === 5);
    await page.locator(".tvtotals__more summary").click();
    push("the totals say where the numbers came from, behind the Details toggle",
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
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForSelector(".tverror", { timeout: 5000 });
    const refusal = await page.locator("#totals").textContent();
    push("a BranchAmbiguity renders as a result, not as a blank",
      /The selection reaches a fork/.test(refusal) &&
      /still unused/.test(refusal) &&
      await page.locator(".chip--total").count() === 0);
    push("chain mode is unavailable for a study that does not sum",
      await page.locator("#layout-toggle").isDisabled());

    // The legend dialog: a help affordance, not layout — closed by default,
    // opens on a real click, and does not affect the DAG pane's own box.
    push("the legend dialog is closed by default",
      !(await page.locator("#legend-dialog").evaluate((n) => n.open)));
    await page.locator("#legend-toggle").click();
    await page.waitForSelector("#legend-dialog[open]", { timeout: 5000 });
    push("the legend opens on a real click and states the rail rule",
      /A column is a branch, not a part/
        .test(await page.locator("#legend-dialog").textContent()));
    await page.locator("#legend-close").click();
    push("its own close button closes it",
      !(await page.locator("#legend-dialog").evaluate((n) => n.open)));

    // The demo mechanism's own joint is `{}` (it spans four parts, no single
    // physical joint) and it declares no worksheet — the "stays silent" half
    // of deliverable 4 (viewer_v2_single_nav), on the fixture the rest of
    // this suite already loaded.
    push("a topology with no joint block says so rather than fabricating one",
      /no joint block/.test(await page.locator("#topojoint").textContent()));
    push("a topology with no worksheet_file hides the worksheet toggle",
      !(await page.locator("#worksheet-toggle").isVisible()));

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
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });

      const ids = realProjection.topologies.map((t) => t.id);
      push("[real] both MVP topologies are offered",
        ids.includes("pitch_system") && ids.includes("vpa_output_to_pitch_plate"));

      for (const topology of realProjection.topologies) {
        await page.locator(navRow("topology", topology.id)).click();
        await page.waitForSelector("tr.tvrow", { timeout: 5000 });
        const expected = topology.nodes.length + topology.edges.length;
        push(`[real] ${topology.id} renders all ${expected} rows`,
          await page.locator("tr.tvrow").count() === expected);
        const drift = await alignmentDrift();
        push(`[real] ${topology.id} is aligned row for row`, drift.drift.length === 0);
        if (drift.drift.length) console.log("    drift: " + drift.drift.slice(0, 5).join(" | "));

        // Deliverable 4 (viewer_v2_single_nav): the topology's own joint
        // block and worksheet toggle, read straight off the fields
        // topology_schema_v1 added to the projection. `pitch_system`'s own
        // joint is `{}` (it spans more than one physical joint) and must
        // stay silent rather than fabricate one; the other four carry a real
        // `assembly_drawing` and must show it.
        const jointText = await page.locator("#topojoint").textContent();
        if (Object.keys(topology.joint || {}).length) {
          push(`[real] ${topology.id}'s joint block names its assembly drawing`,
            jointText.includes(String(topology.joint.assembly_drawing)));
        } else {
          push(`[real] ${topology.id} with no joint stays silent, not fabricated`,
            /no joint block/.test(jointText));
        }
        push(`[real] ${topology.id}'s worksheet toggle shows exactly when ` +
          "worksheet_file is set",
          (await page.locator("#worksheet-toggle").isVisible()) ===
            !!topology.worksheet_file);
        if (topology.id === "pitch_system" && topology.worksheet_file) {
          // The real-projection swap above (`demoTopologyFixture`) wires
          // `topologies`/`crops`/`images` only, not `texts` — WORKSHEET_*.md's
          // own content, over this seam, is unreachable without a second
          // real-file server this tier does not have (apps/viewer/tests.js's
          // node-fs tier reads it directly instead — see its own "[real]
          // pitch_system's own worksheet loads and renders"). A real click
          // opening the real dialog is still worth proving here; its content
          // is not.
          await page.locator("#worksheet-toggle").click();
          await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
          push("[real] pitch_system's worksheet toggle opens a real dialog",
            await page.locator("#worksheet-dialog").evaluate((n) => n.open));
          await page.locator("#worksheet-close").click();
        }

        for (const study of topology.studies) {
          await page.locator(navRow("study", study.id)).click();
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
            await page.locator("tr.tvrow--on").count() >= study.result.chain.length);
        }
      }

      // The preview pane over a real citation, with a real crop behind it.
      await page.locator(navRow("topology", "vpa_output_to_pitch_plate")).click();
      await page.locator("tr.tvrow[data-id='fastener_grip'] .tvcell--name").click();
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

// --- the height contract: the DAG pane owns the main area -------------------
//
// Replaces the retired 10-row floor's own browser check (HANDOFF_20260904_dag_
// viewer_vertical_budget.md), then the viewer_v2_single_nav "majority of the
// viewport" contract this same tier used to pin, with the one full-page-scroll
// (viewer_error_surface_and_layout, 2026-09-09) asks for instead: the DAG pane
// (`.tv__scroll`) no longer owns a scrollport of its own at all, so it renders
// every row at full height and contributes that height to the DOCUMENT, which
// scrolls once the content needs more room than the 900px viewport gives. The
// left nav (`.navtree`) is the one region still capped to the viewport, via
// `position: sticky` + `max-height`, and stays independently scrollable. The
// legend and the worksheet are <dialog>s and never participate in this page's
// flex column at all, so this test does not open them.
async function testHeightBudget(browser, url, label, realProjection, realCrops) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  const alignmentDrift = () => page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("tr.tvrow"));
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

  // The pane's own overflow-y, its rendered height, and the MINIMUM height its
  // own row count demands — a viewport-capped pane would still show
  // `overflow-y: auto`, or a rendered height short of what its own rows need;
  // the new contract requires neither.
  const paneContract = () => page.evaluate(() => {
    const pane = document.querySelector(".tv__scroll");
    const head = document.querySelector(".tv__head");
    const rows = document.querySelectorAll("tr.tvrow").length;
    const rowHeight = window.ViewerApp.RAIL_METRICS.rowHeight;
    return {
      overflowY: getComputedStyle(pane).overflowY,
      height: pane.getBoundingClientRect().height,
      minExpected: rows * rowHeight + (head ? head.getBoundingClientRect().height : 0) - 2,
    };
  });

  const navContract = () => page.evaluate(() => {
    const nav = document.querySelector(".navtree");
    const style = getComputedStyle(nav);
    return { position: style.position, overflowY: style.overflowY };
  });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });

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
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    push("the provenance alarm shows as a one-line badge",
      /needs a rebuild/.test(await page.locator("#banner").textContent()));

    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForSelector("tr.tvrow--on", { timeout: 5000 });

    const mockPane = await paneContract();
    push("[mock] the DAG pane no longer owns a scrollport of its own",
      mockPane.overflowY !== "auto" && mockPane.overflowY !== "scroll");
    push("[mock] the DAG pane renders its full row content height, " +
      "uncapped by the viewport", mockPane.height >= mockPane.minExpected);
    const mockNav = await navContract();
    push("[mock] the left nav is the one remaining independent scroll region",
      mockNav.position === "sticky" &&
      (mockNav.overflowY === "auto" || mockNav.overflowY === "scroll"));

    // Compact density: alignment must still hold once row height changes.
    await page.locator("#density-toggle").click();
    await page.waitForTimeout(50);
    push("rails stay aligned to rows at compact density",
      (await alignmentDrift()).length === 0);
    await page.locator("#density-toggle").click();

    if (!realProjection) {
      push("[real] pitch_system height check (skipped: not built)", true);
    } else {
      await page.evaluate(({ projection, crops }) => {
        window.ViewerApp.demoTopologyFixture = function () {
          return {
            startState: window.ViewerApp.STATE.READY,
            topologies: projection, crops: crops, images: {},
          };
        };
        window.ViewerApp.bootTopology();
      }, { projection: realProjection, crops: realCrops });
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });

      await page.locator(navRow("topology", "pitch_system")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const pitch = realProjection.topologies.find((t) => t.id === "pitch_system");
      const okStudy = pitch && pitch.studies.find((s) => s.status === "ok");
      if (okStudy) {
        await page.locator(navRow("study", okStudy.id)).click();
        await page.waitForSelector("tr.tvrow--on", { timeout: 5000 });
      }
      const realPane = await paneContract();
      push("[real] the DAG pane still owns no scrollport of its own with " +
        "the real pitch_system loaded",
        realPane.overflowY !== "auto" && realPane.overflowY !== "scroll");
      push("[real] the DAG pane renders pitch_system's full row content " +
        "height, uncapped by the viewport", realPane.height >= realPane.minExpected);
      // The definitive proof full-page scroll actually happened: pitch_system
      // carries far more rows than a 900px viewport can show at once, so the
      // DOCUMENT (not the pane) is what now needs to scroll.
      const docScrolls = await page.evaluate(
        () => document.documentElement.scrollHeight > window.innerHeight);
      push("[real] pitch_system's row count pushes the DOCUMENT past the " +
        "viewport rather than clipping inside the pane", docScrolls);
      push("[real] rails stay aligned to rows", (await alignmentDrift()).length === 0);
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

// --- the one error seam: a render crash shows a banner, not a silent page ---
//
// Deliverable 1 (viewer_error_surface_and_layout, 2026-09-09): the incident
// this handoff answers was a throw from INSIDE render() itself -- not a
// rejected promise before it -- leaving the DAG pane silently empty with a
// no-op Reload. The test seam is the same technique every other real-data
// swap in this file already uses (override an exported VA function, then
// trigger a render): `VA.renderTopoPane` is made to throw, and a nav click
// is what triggers the next render.
async function testRenderCrash(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });

    await page.evaluate(() => {
      window.ViewerApp.renderTopoPane = function () {
        throw new Error("seeded render failure (test seam)");
      };
    });
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector(".banner--crash", { timeout: 5000 });

    const bannerText = await page.locator("#banner").textContent();
    push("the banner shows the crash state in plain words",
      /failed to render/.test(bannerText));
    push("the crash banner names the exception's own message, value for value",
      /seeded render failure \(test seam\)/.test(bannerText));
    push("the crash banner offers the hard-reload hint",
      /Ctrl\+Shift\+R/.test(bannerText));
    // The seam is render()'s own try/catch, not the browser's: nothing should
    // have escaped as an uncaught page error.
    push("no uncaught page error escaped the seeded render crash", errors.length === 0);

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

// --- the real-data render path: results.json included, no ?mock=1 ----------
//
// Deliverable 5 (viewer_error_surface_and_layout): every other check in this
// file that claims "[real]" still boots through `?mock=1`'s adapter branch
// (mockFixture(), topology_app.js) with `demoTopologyFixture` overridden --
// which supplies the real topologies/crops but never `results.json`, so the
// REAL boot()+load()+render() pipeline (the one the 2026-09-09 incident's
// stale-cache TypeError actually broke) stayed untested. This promotes the
// incident's own debug prototype (untracked tests/debug_topology_real_render.
// mjs in the main checkout) into a maintained tier: swap `VA.FsaAdapter`
// itself for a fake serving all THREE real JSONs, then boot for real, with no
// `?mock=1` in the URL at all.
async function testRealDataRenderPath(browser, url, label, realProjection, realResults, realCrops) {
  if (!realProjection || !realResults) {
    console.log(`[${label}] SKIP: topologies.json/results.json not built under ` +
      "the target repo (fresh clone) -- build them, or pass --repo <main checkout>");
    return { label, ok: true };
  }
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    await page.goto(url + "/topology.html", { waitUntil: "load" });
    await page.evaluate(() => {
      window.__REJECTIONS__ = [];
      window.addEventListener("unhandledrejection", (ev) => {
        window.__REJECTIONS__.push(String((ev.reason && ev.reason.stack) || ev.reason));
      });
    });

    await page.evaluate(({ topologies, results, crops }) => {
      const VA = window.ViewerApp;
      const Fake = function () {
        return new VA.MemoryAdapter({
          startState: VA.STATE.READY, topologies, results, crops, images: {}, texts: {},
        });
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });

    const rejections = await page.evaluate(() => window.__REJECTIONS__);
    push("no unhandled promise rejection during the real, non-mock boot path",
      rejections.length === 0);

    for (const topology of realProjection.topologies) {
      await page.locator(navRow("topology", topology.id)).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const expected = topology.nodes.length + topology.edges.length;
      const rowCount = await page.locator("tr.tvrow").count();
      push(`[real, non-mock] ${topology.id} renders all ${expected} rows ` +
        "through the real load()+render() pipeline", rowCount === expected);
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

// --- served mode: the real, non-mock boot with NO folder grant at all ------
//
// Deliverable 4 (viewer_http_transport): everywhere else in this file, a
// "[real]" check still boots through ?mock=1's adapter branch with the real
// projection swapped in over VA.demoTopologyFixture — a seam the mock branch
// provides on purpose (there is no way to grant the FSA picker from
// Playwright). This is the one check that does NOT use that seam: it points
// the browser at a plain repo-root static server (startRepoRootServer) and
// loads topology.html with no query string at all, so storage/http.js's own
// load-time probe is what has to find the data — proving the actual
// deliverable ("zero manual steps") rather than a stand-in for it.
async function testServedModeBoot(browser, url, label, realProjection, stopServer) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    // The transport probe never runs at all with ?mock=1 present (chooseAdapter
    // short-circuits to the memory adapter) — proving it still boots under this
    // NEW server is the one thing worth pinning here; everything else about
    // ?mock=1 is already covered by testTheTopologyPage.
    await page.goto(url + "/apps/viewer/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    push("?mock=1 still boots under a repo-root static server",
      await page.locator("tr.tvrow").count() > 0);

    if (!realProjection) {
      push("[real] served, zero-step boot (skipped: topologies.json not built " +
        "-- build it, or pass --repo <main checkout>)", true);
    } else {
      await page.goto(url + "/apps/viewer/topology.html", { waitUntil: "load" });
      await page.waitForSelector('tr.tvrow, .banner--disconnected', { timeout: 15000 });
      push("[real] the connect-folder banner never appears",
        await page.locator(".banner--disconnected").count() === 0);
      push("[real] the banner states the data was served, not read from a " +
        "granted folder",
        /Served over HTTP/.test(await page.locator("#banner").textContent()));
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });
      push("[real] the DAG renders with ZERO manual steps",
        await page.locator("tr.tvrow").count() > 0);

      // Deliverable 3 (viewer_http_transport): a mid-session server stop must
      // produce the banner error, not a blank page — the render() seam
      // viewer_error_surface_and_layout built catches a throw from anywhere
      // inside paint(); this proves the READ that feeds it (storage/http.js's
      // _readProjection) actually rejects instead of quietly reading a
      // network failure as "not built yet". Last use of this server, so this
      // test owns closing it.
      if (stopServer) {
        await stopServer();
        await page.locator(".banner__action").click();
        await page.waitForSelector(".banner__error", { timeout: 5000 });
        push("[real] a mid-session server stop surfaces the banner error on Reload",
          (await page.locator(".banner__error").textContent()).length > 0);
        push("[real] the DAG pane keeps its last-good rows rather than going blank",
          await page.locator("tr.tvrow").count() > 0);
      }
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

// --- index.html: a redirect stub, not a second copy of the app -------------
//
// The retired stack viewer's entry point still has to land somewhere — an old
// desktop shortcut or bookmark did not move — so this is the one thing left to
// prove about it: a real navigation to index.html ends up on topology.html,
// with the query string carried through (?mock=1 is how every other check in
// this file gets its data, and a redirect that drops it would silently break
// every one of them for a user who bookmarked the old address).
async function testIndexRedirects(browser, url, label) {
  const page = await browser.newPage();
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    await page.goto(url + "/index.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind], tr.tvrow', { timeout: 15000 });
    push("index.html redirects to topology.html", page.url().includes("topology.html"));
    push("the query string survives the redirect", page.url().includes("mock=1"));
    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0;
    console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    return { label, ok };
  } catch (err) {
    console.log(`[${label}] ERROR: ${err.message}`);
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

  const repoRootServer = await startRepoRootServer();
  const repoRootBaseUrl = `http://127.0.0.1:${repoRootServer.address().port}`;
  let repoRootServerClosed = false;
  const stopRepoRootServer = () => new Promise((resolve) => {
    if (repoRootServerClosed) { resolve(); return; }
    repoRootServerClosed = true;
    repoRootServer.closeAllConnections();
    repoRootServer.close(() => resolve());
  });

  let browser, channel;
  try {
    ({ browser, channel } = await launch());
    console.log(`browser: ${browser.version()} via channel '${channel}'\n`);

    const results = [];
    results.push(await runSuite(browser, pathToFileURL(join(APP_DIR, "test.html")).href, "suite file://"));
    results.push(await runSuite(browser, `${baseUrl}/test.html`, "suite http"));
    results.push(await testIndexRedirects(browser, fileBase, "index redirect file://"));
    results.push(await testIndexRedirects(browser, baseUrl, "index redirect http"));
    results.push(await testTheApp(browser, fileBase, "app file://"));
    results.push(await testTheApp(browser, baseUrl, "app http"));

    const topologies = await readProjection("topologies.json");
    const crops = await readProjection("crops.json");
    const realResults = await readProjection("results.json");
    if (!topologies) {
      console.log(`
note: no topologies.json under ${DATA_REPO} — the topology ` +
        `page's REAL tier is skipped (build it, or pass --repo <main checkout>)`);
    }
    results.push(await testTheTopologyPage(
      browser, fileBase, "topology file://", topologies, crops));
    results.push(await testTheTopologyPage(
      browser, baseUrl, "topology http", topologies, crops));
    results.push(await testHeightBudget(browser, fileBase, "topology height budget", topologies, crops));
    results.push(await testRenderCrash(browser, fileBase, "render crash shows the banner"));
    results.push(await testRealDataRenderPath(
      browser, fileBase, "real render path (non-mock)", topologies, realResults, crops));
    results.push(await testServedModeBoot(
      browser, repoRootBaseUrl, "served mode (repo-root static server)", topologies,
      stopRepoRootServer));
    results.push(await testRebuildAffordance(browser));

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
    if (!repoRootServerClosed) repoRootServer.close();
  }
})();
