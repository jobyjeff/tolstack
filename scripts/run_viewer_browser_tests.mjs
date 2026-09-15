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
//   node scripts/run_viewer_browser_tests.mjs --only "topology height budget" # one suite
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

// `--only <substring>` runs just the suites whose printed label contains it.
// Added for the mutation-witness tier (scripts/run_mutation_witness_tests.mjs),
// which runs this file once per declared mutation and only ever cares about the
// one suite that owns the guard — eighteen suites per mutation would have made
// that tier too slow to be run. A filtered run says so in a banner above its
// first suite AND on its own summary line: a partial pass must never be
// mistaken for a full one.
const onlyFlag = process.argv.indexOf("--only");
const ONLY = onlyFlag === -1 ? null : process.argv[onlyFlag + 1];

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

// The HOSTED origin, reproduced (viewer_transport_honest_hosted, 2026-09-14).
//
// Measured at the wire on drawing-checker.ai.joby.aero the day this handoff was
// written: the app itself is reachable, and EVERY other `/tolstack/...` URL
// answers 200 + the site index HTML -- an nginx catch-all with nothing baked
// for tolstack yet. That is exactly this server: real files under
// `/tolstack/viewer/`, a 200 + HTML catch-all for everything else, including
// the projection the probe asks for.
//
// `publish()` flips it to serving the real projections from DATA_REPO, so the
// same page object can prove the recovery half: nothing is latched, so a plain
// reload of the SAME url enters served mode with no user action.
function startHostedCatchAllServer() {
  return new Promise((resolve) => {
    let published = false;
    const server = createServer(async (req, res) => {
      const u = (req.url || "/").split("?")[0];
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
          return;
        } catch {
          res.writeHead(404).end("not found");
          return;
        }
      }
      if (published && u.startsWith("/tolstack/data/")) {
        try {
          const rel = u.slice("/tolstack/data/".length);
          const body = await readFile(join(DATA_REPO, "data", "projections", "viewer", rel));
          res.writeHead(200, { "content-type": MIME[extname(rel)] || "application/octet-stream" });
          res.end(body);
          return;
        } catch {
          res.writeHead(404).end("not found");
          return;
        }
      }
      // The catch-all itself: 200, and the site's own index HTML, for anything
      // at all. Status alone would read as "the projection is there".
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body>drawing-checker site index</body></html>");
    });
    server.listen(0, "127.0.0.1", () => resolve({
      server,
      publish: () => { published = true; },
    }));
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
// probe has to survive. `terminalState` is which of the endpoint's terminal
// states the status route settles on -- "done" is a finished rebuild, and
// "idle" is what a server RESTARTED mid-run answers, having no memory of it
// (drawing-checker webui/tolstack_rebuild.py: idle | queued | running | done |
// failed).
function startSiblingMountServer({ matchCrops, rebuildCapable, terminalState }) {
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
        res.end(JSON.stringify({
          busy, state: busy ? "running" : (terminalState || "done") }));
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
// drives a real click through to a reload -- and, since
// viewer_popover_clamp_and_rebuild_terminal_state, that only the endpoint's
// own completion state counts as one. Four servers, one scenario each — a
// fresh stub per scenario keeps the busy/terminal state machine from leaking
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

    // 3) the server restarts mid-poll: the new process has no memory of the
    //    run and answers a TERMINAL `idle`
    //    (viewer_popover_clamp_and_rebuild_terminal_state). `idle` is not a
    //    finished rebuild, and reading it as one -- which the poll did, by
    //    treating everything that was not "failed" as success -- reloads a
    //    projection that was never rebuilt and presents it as a fresh one,
    //    the same shape as the 2026-09-06/08 stale-projection incident except
    //    with the page asserting freshness. The reader must be told instead.
    await withServer({ matchCrops: false, rebuildCapable: true,
                       terminalState: "idle" }, async (page) => {
      await page.waitForSelector(".banner__rebuild button", { timeout: 15000 });
      await page.locator(".banner__rebuild button").click();
      // Bounded, and swallowed on purpose: a poll that reads `idle` as
      // success never renders this node at all, and that must arrive as a
      // named sub-check failure rather than as the whole scenario aborting.
      await page.waitForSelector(".banner__rebuild .banner__error",
        { timeout: 5000 }).catch(() => {});
      const text = await page.locator(".banner__rebuild .banner__error")
        .count() === 1
        ? await page.locator(".banner__rebuild .banner__error").textContent()
        : "";
      push("a terminal `idle` from a restarted server is not read as a " +
        "finished rebuild", /rebuild failed/i.test(text));
      // `text` is "" when the error never rendered, which must not read as
      // "no command in it" -- the absence check needs something to check.
      push("...said in plain words, with no command or path in it",
        text.length > 0 && noCommandsOrPaths(text));
      push("...and the button comes back, so it can be asked for again",
        !(await page.locator(".banner__rebuild button").isDisabled()));
    });

    // 4) fresh (matching) provenance -> no stale banner at all.
    await withServer({ matchCrops: true, rebuildCapable: true }, async (page) => {
      // The same trap as the annotate flyout's banner wait, in the other
      // direction: topology.html ships `<div id="banner">` empty too, so
      // waiting on `#banner` resolves on the static element before any render
      // and would let this absence check PASS on a boot that never banner'd at
      // all -- the 200ms sleep was the only thing standing behind it.
      // `.banner__built` exists only in a connected banner's own paint, which
      // is the same paint provenance() would have put `.banner__stale` in.
      await page.waitForSelector(".banner__built", { timeout: 15000 });
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

// A HOSTED hostname that resolves to this script's own loopback servers.
//
// Needed because the posture under test (surfaces_that_state_something_false)
// turns on `window.location.hostname`, and every server this file can start
// listens on 127.0.0.1 -- which is the LOCAL case, the opposite of what the
// hosted check has to reproduce. Chrome's own `--host-resolver-rules` maps one
// name at the resolver, so the page really is on a non-loopback origin as far
// as the app (and the URL bar) is concerned, with no DNS and no real host.
// `.test` is the reserved TLD for exactly this (RFC 6761), so the name can
// never become someone's real site. Inert for every other check in this file:
// nothing else uses the name.
const HOSTED_TEST_HOST = "hosted.tolstack.test";

async function launch() {
  const failures = [];
  const args = [`--host-resolver-rules=MAP ${HOSTED_TEST_HOST} 127.0.0.1`];
  for (const channel of CHANNELS) {
    try {
      return { browser: await chromium.launch({ channel, headless: true, args }), channel };
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
  // Dismiss an open hover card deterministically: move the pointer OFF the
  // trigger FIRST, then Escape. Since viewer_dag_hover_cards the rail marks
  // card too, and a mark's click re-renders the pane -- a fresh element
  // landing under a stationary pointer fires `mouseenter` again, so an Escape
  // sent while the pointer still sits on the mark can be undone by the very
  // next paint. (4, 4) is the topbar: no trigger of any kind lives there.
  const dismissCard = async () => {
    await page.mouse.move(4, 4);
    await page.keyboard.press("Escape");
  };

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

// --- the row/leader correspondence, measured (viewer_leader_line_grid) ------
//
// The page's one visual claim changed shape: the grid holds only edge rows
// (compact, evenly spaced) while the DAG keeps its own layout, and the jogged
// LEADER LINES are what tie an interface's dot to the seam between the two
// grid rows it separates. So the measurable contract is now three-legged, and
// only a real layout engine can check any leg of it:
//
//   1. every grid row still has its bar in the SVG (same data-id) — existence,
//      not shared y: the two are no longer at one height by design;
//   2. every leader's node-side end sits on its own dot's centre — measured
//      off the path's real geometry (getBBox), not off the numbers that drew
//      it, so a CSS transform or a broken viewBox fails here;
//   3. every leader's grid-side end sits on the boundary row's top edge (the
//      row its data-boundary-edge names), or on the last row's bottom when it
//      points below the whole grid.
//
// Leaders always rise left-to-right (the DAG is the taller column), so the
// path's bbox bottom is the node end and its top is the grid end.
const CORRESPONDENCE_IN_PAGE = () => {
  const drift = [];
  const rows = Array.from(document.querySelectorAll("tr.tvrow"));
  for (const row of rows) {
    const id = row.getAttribute("data-id");
    const mark = document.querySelector(
      `svg.tv__rails [data-id="${CSS.escape(id)}"][data-row-kind="edge"]`);
    if (!mark) drift.push(`edge ${id}: no rail bar`);
  }
  const leaders = Array.from(document.querySelectorAll("path.rail__leaderhit"));
  for (const hit of leaders) {
    const id = hit.getAttribute("data-leader-id");
    const beforeEdge = hit.getAttribute("data-boundary-edge");
    // The two ends, measured off the path the browser actually rendered
    // (getPointAtLength, not the numbers that drew it) rather than read off
    // its bounding box. The bbox shortcut assumed a leader always RISES —
    // bottom of the box = node end, top = grid end — which stopped being true
    // when viewer_dag_spine_layout centred the grid against the DAG: a leader
    // above the centre now descends into its seam. Path length 0 is the
    // node end and the total length is the grid end, in either direction,
    // because VA.leaderGeometry writes the path node-end first.
    const svgTop = hit.ownerSVGElement.getBoundingClientRect().top;
    const nodeEndY = svgTop + hit.getPointAtLength(0).y;
    const gridEndY = svgTop + hit.getPointAtLength(hit.getTotalLength()).y;
    const dot = document.querySelector(
      `svg.tv__rails circle[data-id="${CSS.escape(id)}"]`);
    if (!dot) { drift.push(`leader ${id}: no dot`); continue; }
    const dotBox = dot.getBoundingClientRect();
    const dotCy = (dotBox.top + dotBox.bottom) / 2;
    if (Math.abs(nodeEndY - dotCy) > 0.75) {
      drift.push(`leader ${id}: node end off its dot by ${(nodeEndY - dotCy).toFixed(2)}px`);
    }
    let seamY;
    if (beforeEdge) {
      const boundaryRow = document.querySelector(
        `tr.tvrow[data-id="${CSS.escape(beforeEdge)}"]`);
      if (!boundaryRow) { drift.push(`leader ${id}: boundary row ${beforeEdge} missing`); continue; }
      seamY = boundaryRow.getBoundingClientRect().top;
    } else {
      if (!rows.length) { drift.push(`leader ${id}: no rows at all`); continue; }
      seamY = rows[rows.length - 1].getBoundingClientRect().bottom;
    }
    if (Math.abs(gridEndY - seamY) > 0.75) {
      drift.push(`leader ${id}: grid end off its seam by ${(gridEndY - seamY).toFixed(2)}px`);
    }
  }
  return { rows: rows.length, leaders: leaders.length, drift };
};

// Edge-length scaling (viewer_edge_length_scaling): every bar's MEASURED
// height against the keyed position store's own slot for it, plus the break
// marks against the store's floored flags. Runs in-page so it reads the same
// VA.rowPositions the render did — a renderer that ignored the store, or a
// store that drifted from the DOM, both fail here; the store's own numbers
// are pinned at the fixture tier.
const BARS_MATCH_STORE_IN_PAGE = ({ topologyId, mode }) => {
  const VA = window.ViewerApp;
  const proj = VA.findTopology(VA.demoTopologyFixture().topologies, topologyId);
  // Re-derived from the projection, not read out of the render — that is the
  // whole point of this check. The two things it does take from the render
  // are the things only a rendered page can know: the layout it drew
  // (right-justified, viewer_dag_spine_layout) and the viewport budget it
  // measured, without which the store would be scaled to a different fit than
  // the DOM beside it.
  const last = VA.lastTopoRender;
  const layout = VA.spineRight(proj.layout);
  const plan = VA.gridPlan(layout, proj);
  const pos = VA.rowPositions(layout, proj, mode, VA.RAIL_METRICS,
    { budget: last.fit.budget, plan: plan });
  const bad = [];
  if (last.mode !== mode) bad.push(`render is in ${last.mode}, not ${mode}`);
  let floored = 0;
  for (const row of layout.rows) {
    if (row.kind !== "edge") continue;
    const slot = pos.edges[row.id];
    if (slot.floored) floored++;
    const hit = document.querySelector(
      `svg.tv__rails line.rail__barhit[data-id="${CSS.escape(row.id)}"]`);
    if (!hit) { bad.push(`${row.id}: no bar hit line`); continue; }
    // The bar and its hit line share y1/y2 (slot extent, 1px inset each end),
    // butt-capped, so the rect's height is exactly the drawn length.
    const h = hit.getBoundingClientRect().height;
    if (Math.abs(h - (slot.length - 2)) > 0.75) {
      bad.push(`${row.id}: drawn ${h.toFixed(2)} vs slot ${(slot.length - 2).toFixed(2)}`);
    }
  }
  const breaks = document.querySelectorAll("svg.tv__rails path.rail__break").length;
  if (breaks !== floored) bad.push(`break marks: ${breaks} drawn vs ${floored} floored`);
  const edges = layout.rows.filter((r) => r.kind === "edge").length;
  // The shortest this serialisation can ever be drawn: one row per node, one
  // floor per edge. Computed from the layout rather than restated by hand —
  // a caller that wrote `26 * 45` for pitch_system would go silently wrong the
  // day the walk gains a row or the row height moves.
  const floorMin = VA.RAIL_METRICS.rowHeight *
    (layout.rows.filter((r) => r.kind === "node").length +
     edges * VA.EDGE_LENGTH_SCALE.floorRows);
  return { bad, floored, edges, floorMin, budget: last.fit.budget,
           dagHeight: pos.dagHeight };
};

// The alternating bands and the two draggable widths
// (viewer_leader_grid_legibility), measured in the page.
//
// The band claim is a CORRESPONDENCE like the leaders': the band between two
// adjacent leaders and the grid rows that band feeds wear one tint. So it is
// measured the way the leaders' is -- off what the browser actually painted.
// `fill` is the computed colour of each band polygon and `rowBg` the computed
// background of each row, both as the browser resolved them, and the mapping
// from a row to its band is re-derived from the projection rather than read
// back out of the render.
const BANDS_IN_PAGE = () => {
  const VA = window.ViewerApp;
  const last = VA.lastTopoRender;
  const proj = VA.findTopology(VA.demoTopologyFixture().topologies, last.topologyId);
  const layout = VA.spineRight(proj.layout);
  const plan = VA.gridPlan(layout, proj);
  const bands = VA.leaderBands(plan);
  const parity = VA.rowBandParity(plan);
  const drawn = Array.from(document.querySelectorAll("svg.tv__rails path.rail__band"));
  const rows = Array.from(document.querySelectorAll("tr.tvrow"));
  const bad = [];
  if (drawn.length !== bands.length) {
    bad.push(`${drawn.length} band polygons drawn for ${bands.length} bands`);
  }
  // A band polygon's own fill, keyed by parity: two tints, and they must
  // differ or the alternation is not on screen at all.
  const fills = {};
  drawn.forEach((path, i) => {
    const band = bands[i];
    if (!band) return;
    const fill = getComputedStyle(path).fill;
    if (fills[band.parity] === undefined) fills[band.parity] = fill;
    else if (fills[band.parity] !== fill) bad.push(`band ${i} fill drifted`);
    if (getComputedStyle(path).pointerEvents !== "none") {
      bad.push(`band ${i} is hit-testable -- it would swallow a bar's click`);
    }
  });
  if (fills[0] === fills[1]) bad.push("both band tints resolve to one colour");
  // Every row's own background COLOUR, against the band its rows belong to.
  // Every row, provenance or not: the band tint is the colour and a
  // provenance tint is a background IMAGE layered over it, precisely so that
  // an untraced row shows both. Measuring the colour therefore sees the band
  // on all 24 of pitch_system's rows, 20 of which are untraced -- and if the
  // two rules ever go back to competing for one `background`, 20 of them lose
  // their band and this goes red.
  const byParity = { 0: new Set(), 1: new Set() };
  let tinted = 0;
  let provenanceLayers = 0;
  for (const row of rows) {
    const id = row.getAttribute("data-id");
    const p = parity[id];
    if (p === undefined) { bad.push(`row ${id} is in no band`); continue; }
    byParity[p].add(getComputedStyle(row).backgroundColor);
    tinted++;
    const provenance = /conf--untraced|conf--no_source_ref/
      .test(row.getAttribute("class") || "");
    const image = getComputedStyle(row).backgroundImage;
    if (provenance && (!image || image === "none")) {
      bad.push(`untraced row ${id} lost its provenance tint to the band`);
    }
    if (provenance) provenanceLayers++;
  }
  for (const p of [0, 1]) {
    if (byParity[p].size > 1) {
      bad.push(`parity ${p} rows painted ${byParity[p].size} different backgrounds`);
    }
  }
  const zero = Array.from(byParity[0])[0];
  const one = Array.from(byParity[1])[0];
  if (zero !== undefined && one !== undefined && zero === one) {
    bad.push("both row tints resolve to one colour");
  }
  return {
    bad, tinted, provenanceLayers, bands: bands.length, drawn: drawn.length,
    svgWidth: document.querySelector("svg.tv__rails").getBoundingClientRect().width,
    rowHeights: rows.map((r) => Math.round(r.getBoundingClientRect().height * 100) / 100),
    nameWidth: Math.round(document.querySelector("td.tvcell--name")
      .getBoundingClientRect().width * 100) / 100,
    // Every leader's own path shape, so a style change is measured in the DOM
    // rather than in the toolbar's own label.
    leaderPaths: Array.from(document.querySelectorAll("path.rail__leaderhit"))
      .map((p) => p.getAttribute("d")),
  };
};

// How far open the jog zone currently is, as the MULTIPLE of its own natural
// width that the preference is held as (viewer_leader_grid_legibility). The
// natural width is re-derived for whatever topology is on screen, so this is
// comparable across a topology switch -- which is the point: five leaders and
// sixteen leaders have very different natural widths, and a preference stored
// in pixels would be nonsense on the other one.
const ZONE_IN_PAGE = () => {
  const VA = window.ViewerApp;
  const id = VA.lastTopoRender.topologyId;
  const proj = VA.findTopology(VA.demoTopologyFixture().topologies, id);
  const layout = VA.spineRight(proj.layout);
  const natural = VA.leaderGeometry(layout, VA.gridPlan(layout, proj),
    VA.RAIL_METRICS);
  const svg = document.querySelector("svg.tv__rails").getBoundingClientRect().width;
  return {
    topologyId: id,
    natural: natural.naturalZone,
    leaders: natural.leaders.length,
    svg: svg,
    scale: (svg - natural.zoneLeft) / natural.naturalZone,
  };
};

// The viewport fit and the centring (viewer_dag_spine_layout), measured in
// the page: how tall the DAG actually came out against the budget the render
// measured and against the height its own edge count alone demands (the floor
// × edges + nodes minimum, which no mode may go under and which is therefore
// the one honest way to overflow), and whether the grid block really sits
// where the store says it does — the DOM offset against `gridOffset`.
const FIT_IN_PAGE = () => {
  const VA = window.ViewerApp;
  const last = VA.lastTopoRender;
  const rowHeight = VA.RAIL_METRICS.rowHeight;
  const svg = document.querySelector("svg.tv__rails").getBoundingClientRect();
  const rows = document.querySelector(".tv__rows").getBoundingClientRect();
  const floorMin = rowHeight *
    (Object.keys(last.positions.nodes).length +
     Object.keys(last.positions.edges).length * VA.EDGE_LENGTH_SCALE.floorRows);
  return {
    mode: last.mode,
    budget: last.fit.budget,
    dagHeight: last.positions.dagHeight,
    floorMin: floorMin,
    gridOffset: last.positions.gridOffset,
    measuredGridOffset: rows.top - svg.top,
  };
};

// --- the topology page, in a real browser ---------------------------------
//
// What this proves that the DOM shim cannot, and it is the deliverable:
//
//   1. ROW/LEADER CORRESPONDENCE IS REAL (CORRESPONDENCE_IN_PAGE above): a
//      leader's two measured ends land on its dot and on its seam, across
//      scroll, density, layout mode and study selection. The fast tier can
//      check the numbers that draw it; only a real browser can measure the
//      boxes a reader actually sees.
//   2. Clicking an SVG mark selects it. A `<circle>` with an onclick is exactly
//      the thing a shim reports as working and a stylesheet can break.
//   3. The rails, leaders and rows scroll together, because they share a
//      scrollport.
//   4. Against the REAL projection: every topology renders, study selection
//      changes the grid, and every total on screen equals topologies.json's own
//      number — the claim the page prints in its own footer.
//
// Two viewports, and the short one is load-bearing. The suite renders at
// TOPO_VIEWPORT, where the mock fixture's whole document fits inside the
// window; the hover-card layout measurement below drops to CARD_LAYOUT_VIEWPORT
// first, because that contract is only *falsifiable* where an open card reaches
// past the document's own bottom. Same width in both, so nothing reflows
// horizontally when it switches.
const TOPO_VIEWPORT = { width: 1600, height: 1000 };
const CARD_LAYOUT_VIEWPORT = { width: 1600, height: 700 };
// ...and a third, shorter still, where the DOCUMENT itself scrolls: the mock
// page's own content is ~700px tall whatever the window does (the DAG re-fits,
// the topbar/banner/detail column does not), so a 560px window leaves ~140px of
// real scroll. That is the one configuration that tells `position: fixed` from
// `position: absolute` now that the room cap has made the old witness
// unreachable — ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_
// popover_again, and the comment on the block that uses it. Same width as the
// other two, so nothing reflows horizontally when the suite switches.
const CARD_SCROLL_VIEWPORT = { width: 1600, height: 560 };
// The one trigger every card-layout contract below is measured on: the demo
// mechanism's one resolved crop, whose edge card is the tall one.
const CARD_TRIGGER = "tr.tvrow[data-id='base_thickness'] button.crop-trigger";

// A rail BAR is a vertical <line>: its bounding box is zero pixels WIDE, and
// playwright calls a zero-area element "not visible" and refuses
// locator.hover() on it outright. The bar is genuinely hoverable all the same
// -- that is the whole point of `.rail__barhit`, a transparent stroke under
// `pointer-events: stroke` -- so drive the pointer to its own coordinates
// instead of asking playwright to find them. (The dots are circles with a real
// box and take .hover() as they always have.)
//
// Everything else here is what `page.mouse.move` does NOT do for you, each
// piece measured on this suite 2026-09-14:
//
//   * it does not scroll. A real topology is taller and wider than the window
//     and the page has a sticky nav sidebar, so a bar can be below the fold or
//     sitting behind that sidebar -- "hovered" at coordinates that reach
//     something else entirely. Hence the elementFromPoint check, and the
//     scrollIntoView (block AND inline) only when it fails: the mock's first
//     rows are already clear, and scrolling anyway would move a measurement
//     several checks below take at scroll 0.
//   * the rect must be read in ONE round trip with that check (querySelector,
//     getBoundingClientRect and elementFromPoint in the same page task).
//     Resolving a locator and then `.evaluate()`-ing against it is two, and
//     under file:// a late `render()` between them hands back a DETACHED line
//     whose rect is all zeros -- which aims the pointer at (0, 0), the topbar.
//   * moving the pointer onto the bar can still lose the `mouseenter` to that
//     same re-render, so this asserts the card actually opened and, if not,
//     steps off and tries again -- and says what it saw if it runs out of
//     tries, rather than leaving a bare waitForSelector to time out later with
//     no explanation.
async function hoverRailBar(page, id) {
  const sel = `svg.tv__rails line.rail__barhit[data-id="${id}"]`;
  let seen = "never found a point on the bar to aim at";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const at = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el || !el.isConnected) return null;
      const point = () => {
        const b = el.getBoundingClientRect();
        return b.height ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null;
      };
      let p = point();
      if (!p || document.elementFromPoint(p.x, p.y) !== el) {
        el.scrollIntoView({ block: "center", inline: "center" });
        p = point();
      }
      if (!p || document.elementFromPoint(p.x, p.y) !== el) return null;
      return p;
    }, sel);
    if (at) {
      await page.mouse.move(at.x, at.y);
      const state = await page.evaluate(([x, y]) => {
        const pop = document.querySelector("#croppop");
        const under = document.elementFromPoint(x, y);
        return {
          open: !!pop && pop.style.display === "block" &&
            pop.className.indexOf("hovercard--edge") !== -1,
          pop: pop ? pop.className + " " + pop.style.display : "no popover node",
          under: under ? under.tagName + "." + (under.getAttribute("class") || "") +
            " #" + (under.getAttribute("data-id") || "") : "nothing",
        };
      }, [at.x, at.y]);
      if (state.open) return;
      seen = `at ${at.x},${at.y} the pointer is over ${state.under}; ` +
        `the popover is "${state.pop}"`;
      await page.mouse.move(4, 4);   // step off, so the next move re-enters
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`hovering the rail bar ${id} never opened its card — ${seen}`);
}

async function testTheTopologyPage(browser, url, label, realProjection, realCrops) {
  const page = await browser.newPage({ viewport: TOPO_VIEWPORT });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  const correspondence = () => page.evaluate(CORRESPONDENCE_IN_PAGE);

  // Everything the hover-card layout contracts are measured against: the
  // DOCUMENT's own height (the thing a popover that is still in flow
  // lengthens) and the DAG pane's box in DOCUMENT coordinates -- both
  // scroll-invariant, since viewport coordinates would move with any scroll
  // playwright's own hover does on the way to a trigger -- plus the open
  // card's and the trigger's own boxes, which are read in VIEWPORT coordinates
  // because that is the frame the card is placed in.
  // `triggerSel` defaults to the grid trigger and is passed explicitly for the
  // DAG-side block below, whose trigger is a rail bar: the room cap's frame is
  // measured against whichever trigger opened the card, so the witness that
  // the cap BIT has to read that trigger's own box and not another one's.
  const cardLayout = (triggerSel = CARD_TRIGGER) => page.evaluate((triggerSel) => {
    const pane = document.querySelector("#topopane").getBoundingClientRect();
    const pop = document.querySelector(".croppop");
    const open = pop && getComputedStyle(pop).display !== "none";
    const card = open ? pop.getBoundingClientRect() : null;
    const trig = document.querySelector(triggerSel);
    const trigger = trig ? trig.getBoundingClientRect() : null;
    return {
      docHeight: document.documentElement.scrollHeight,
      pane: [pane.x, pane.y + window.scrollY, pane.width, pane.height].join(),
      // ...and the room cap's own frame, in VIEWPORT coordinates, which is
      // the frame `position: fixed` places the card in: where the card sits
      // relative to the window and to the trigger it was opened from
      // (viewer_popover_clamp_and_rebuild_terminal_state).
      cardTop: card ? card.top : null,
      cardBottom: card ? card.bottom : null,
      cardHeight: card ? card.height : null,
      // Its own scrollport: a card capped to the room beside its trigger is
      // only honest if the part that did not fit is still reachable.
      cardScrolls: card ? pop.scrollHeight > pop.clientHeight + 1 : null,
      cardMid: card ? [card.left + card.width / 2, card.top + card.height / 2]
                    : null,
      triggerTop: trigger ? trigger.top : null,
      triggerBottom: trigger ? trigger.bottom : null,
      innerHeight: window.innerHeight,
    };
  }, triggerSel);

  // Dismiss an open hover card deterministically: move the pointer OFF the
  // trigger FIRST, then Escape. Since viewer_dag_hover_cards the rail marks
  // card too, and a mark's click re-renders the pane -- a fresh element
  // landing under a stationary pointer fires `mouseenter` again, so an Escape
  // sent while the pointer still sits on the mark can be undone by the very
  // next paint. (4, 4) is the topbar: no trigger of any kind lives there.
  const dismissCard = async () => {
    await page.mouse.move(4, 4);
    await page.keyboard.press("Escape");
  };

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

    // The merged-row grid and the leaders (viewer_leader_line_grid): the demo
    // mechanism has six edges in six single-edge component groups (every
    // consecutive pair changes part), and five of its six interfaces are part
    // boundaries — base_datum's one edge makes it internal, so it must NOT
    // have a leader.
    push("the grid holds one row per edge, in component groups",
      await page.locator("tr.tvrow").count() === 6 &&
      await page.locator("td.tvcell--component").count() === 6);
    push("five leaders for five part boundaries, none for the internal node",
      await page.locator("path.rail__leader").count() === 5 &&
      await page.locator('path.rail__leaderhit[data-leader-id="base_datum"]').count() === 0);

    const first = await correspondence();
    push("every leader lands on its dot and its seam, every row has its bar",
      first.rows > 0 && first.leaders === 5 && first.drift.length === 0);
    if (first.drift.length) console.log("    drift: " + first.drift.slice(0, 5).join(" | "));

    // 3) scrolled, they stay tied together — rails, leaders and rows share one
    //    scrollport (the page's own, since full-page scroll).
    await page.evaluate(() => window.scrollTo(0, 120));
    const scrolled = await correspondence();
    push("correspondence holds after scrolling", scrolled.drift.length === 0);
    await page.evaluate(() => window.scrollTo(0, 0));

    // 2) a real click on an SVG circle.
    await page.locator("svg.tv__rails circle.rail__dot").first().click();
    push("clicking a rail dot opens that interface in the preview pane",
      /An interface is a location, not a value/
        .test(await page.locator("#detail").textContent()));
    push("the clicked dot is visibly marked — the grid has no node rows",
      await page.locator("circle.rail__dot--selected").count() === 1 &&
      await page.locator("tr.tvrow--selected").count() === 0);

    // Dismiss the node card that dot's own hover opened
    // (viewer_dag_hover_cards): a rail mark now cards, and a card is chrome
    // that persists until it is dismissed -- ✕, Escape, an outside click, or
    // the next card replacing it (nothing closes on pointer-leave, a landed
    // decision reasoned in views/stack.js's cropTrigger). Opened from inside
    // the DAG it sits OVER the diagram, so the leader below is genuinely
    // behind it until then -- filed as
    // ISSUE_20260914_dag_hover_card_occludes_the_marks_beneath_it.
    await dismissCard();

    // A leader is clickable too, and selecting a boundary node marks it.
    // Clicked at a point ON the path rather than at its box's centre: a
    // jogged leader is an L, so whether its box centre happens to fall within
    // the 10px hit stroke is luck about that one leader's proportions — and
    // the luck ran out when viewer_dag_spine_layout moved the spine right
    // (the node end moved 20px closer to the lane, and the centre fell off
    // the stroke into the SVG behind it). Half the path's own length is on
    // the path by construction.
    const leaderHit = page.locator('path.rail__leaderhit[data-leader-id="base_post_seat"]');
    const leaderMid = await leaderHit.evaluate((el) => {
      const svg = el.ownerSVGElement.getBoundingClientRect();
      const mid = el.getPointAtLength(el.getTotalLength() / 2);
      return { x: svg.left + mid.x, y: svg.top + mid.y };
    });
    const leaderBox = await leaderHit.boundingBox();
    await leaderHit.click({ position: { x: leaderMid.x - leaderBox.x,
                                        y: leaderMid.y - leaderBox.y } });
    push("clicking a leader selects its interface",
      /A component boundary/.test(await page.locator("#detail").textContent()) &&
      await page.locator("path.rail__leader--selected").count() === 1);

    // The thumbnail column (viewer_leader_line_grid): the one resolved demo
    // crop upgrades its trigger to the actual image once fetched; the
    // unresolvable one stays a text button with no image, ever.
    await page.waitForSelector("img.tvthumb", { timeout: 5000 });
    push("the resolved crop renders as a real inline thumbnail",
      await page.locator("tr.tvrow[data-id='base_thickness'] img.tvthumb").count() === 1);
    push("an unresolvable crop stays a text trigger, never a placeholder image",
      await page.locator("tr.tvrow[data-id='post_height'] img").count() === 0 &&
      /no crop/.test(await page.locator("tr.tvrow[data-id='post_height'] button.crop-trigger")
        .textContent()));

    // The grid's own thumbnail trigger — a real click, which the DOM shim
    // cannot exercise. Since viewer_hover_cards_and_deep_links it opens the
    // EDGE hover card (views/cards.js) into the same positioned popover node:
    // the crop body plus the citation line and the crop-key claim.
    // `base_thickness` re-expresses demo_joint's `plate`, whose crop resolves.
    //
    // WHERE this is measured decides whether it can fail at all
    // (ISSUE_20260911_card_layout_guard_passes_on_the_absolute_popover): at
    // this suite's 1000px-tall viewport the mock fixture's document is SHORTER
    // than the window and the ~528px card opens wholly inside it, so the
    // original `position: absolute` popover moved nothing measurable either —
    // both assertions below passed with that defect fully reverted. Squeezing
    // the viewport to CARD_LAYOUT_VIEWPORT puts the same card on the same
    // trigger ~889px down a 700px document: in flow it lengthens the document,
    // out of flow it cannot. Measured 2026-09-11: 700 -> 889 with `.croppop`
    // back on `position: absolute` and `position()` back on scroll offsets,
    // 700 -> 700 as shipped.
    await page.setViewportSize(CARD_LAYOUT_VIEWPORT);
    const beforeCard = await cardLayout();
    // hover, not click: a click also SELECTS the row (its normal job), and the
    // detail pane repopulating is legitimate layout movement that would drown
    // the measurement below — the card itself is what must move nothing.
    await page.locator(CARD_TRIGGER).hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    push("the thumbnail trigger opens the edge hover card with the crop body",
      await page.locator(".croppop").isVisible() &&
      /215197/.test(await page.locator(".croppop__path").textContent()) &&
      /cited at:/.test(await page.locator(".croppop").textContent()) &&
      /from stack `demo_joint`, element `plate`/
        .test(await page.locator(".croppop").textContent()));
    // Cards are hover-only chrome: opening one must not disturb the layout
    // contracts — the document's own height, the DAG pane's box and the leader
    // correspondence are all measured with the card OPEN.
    const withCard = await cardLayout();
    // The measurement's own tripwire, asserted BEFORE what it certifies: if a
    // later change (a shorter card, a taller fixture, a bigger viewport here)
    // stops the card needing to be placed past the bottom, this suite must go
    // red for being unable to see the defect rather than green for not
    // finding it.
    //
    // Measured as "the cap bit" rather than as "the card hangs past the
    // document bottom", which is what this said before
    // viewer_popover_clamp_and_rebuild_terminal_state: the shipped card is now
    // capped to the room on the side it is placed, so it never reaches past
    // anything and the old witness can no longer be true. What still
    // distinguishes this configuration is that the card WANTS more height than
    // either side of its trigger can give it — its box is exactly the
    // roomier side's room, and its content still overflows that box.
    const roomBelow = withCard.innerHeight - withCard.triggerBottom - 16;
    const roomAbove = withCard.triggerTop - 16;
    push("the card wants more height than there is room for on either side " +
      "of its trigger — the configuration the card-layout contracts " +
      "below are only falsifiable in",
      withCard.cardBottom !== null && withCard.cardScrolls === true &&
      Math.abs(withCard.cardHeight - Math.max(roomAbove, roomBelow)) <= 1);
    push("an open card leaves the document's own height untouched",
      withCard.docHeight === beforeCard.docHeight);
    push("an open card moves the DAG pane by nothing at all",
      beforeCard.pane === withCard.pane);
    push("leaders still land on their dots and seams with a card open",
      (await correspondence()).drift.length === 0);

    // The room cap (viewer_popover_clamp_and_rebuild_terminal_state): this
    // card fits neither below its trigger nor above it, and before the cap it
    // rendered below anyway with a strip of itself — the citation line and
    // the crop-key claim — past the window bottom, where a
    // `position: fixed` element can never be scrolled to and where its own
    // `overflow-y` does not reach either (the card is shorter than
    // `max-height: calc(100vh - 24px)`, so nothing scrolls inside it).
    // Three things have to hold at once, and the last two are why the fix is a
    // cap and not a move: a card nudged up over its own trigger becomes
    // undismissable, because hiding it hands the pointer back to the trigger,
    // whose mouseenter re-opens it.
    push("the open card's bottom edge is inside the window",
      withCard.cardBottom !== null &&
      withCard.cardBottom <= withCard.innerHeight);
    push("the capped card keeps the overrun reachable in its own scrollport",
      withCard.cardScrolls === true);
    push("the card still sits clear of the trigger it was opened from",
      withCard.cardBottom <= withCard.triggerTop ||
      withCard.cardTop >= withCard.triggerBottom);
    // Nothing in this app closes a popover on mouseleave, by design
    // (views/stack.js's crop trigger says why): the pointer has to leave the
    // trigger to reach the links inside the card. A REAL pointer move onto the
    // card proves it — a card that opens and shuts again is worse than one
    // with an unreachable footer.
    await page.mouse.move(withCard.cardMid[0], withCard.cardMid[1]);
    push("and it stays open with the pointer moved off the trigger onto it",
      await page.locator(".croppop").isVisible());

    await page.keyboard.press("Escape");
    push("Escape closes it here too", !(await page.locator(".croppop").isVisible()));

    // --- hover chrome is OUT OF FLOW, restored ------------------------------
    //
    // The three contracts above (`...the document's own height untouched`,
    // `...moves the DAG pane by nothing at all`, `leaders still land...`) were
    // written to catch a `position: absolute` popover and can no longer do it:
    // the room cap keeps the card wholly inside the window, the document is at
    // least as tall as the window, and at `scrollY === 0` document and viewport
    // coordinates coincide — so absolute and fixed place the card identically
    // and neither lengthens anything. Flipping `.croppop` back to `absolute`
    // shipped the whole suite green on 2026-09-14
    // (ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again);
    // they are kept because a popover returned to normal FLOW would still
    // lengthen the document, which is the other half of the same defect.
    //
    // What restores the fixed-vs-absolute half is the one configuration where
    // the two coordinate systems differ: a document taller than the window,
    // scrolled. `position()` computes the card's placement in VIEWPORT
    // coordinates and writes it to `style.top`; under `absolute` that same
    // number is read against the DOCUMENT, so the card renders `scrollY` px
    // away from the trigger it belongs to. Measured at CARD_SCROLL_VIEWPORT,
    // 2026-09-15: 8px off the trigger as shipped, 148px off it with
    // `.croppop` on `absolute`.
    await dismissCard();
    await page.setViewportSize(CARD_SCROLL_VIEWPORT);
    await page.waitForTimeout(450);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const scrollFrame = await page.evaluate(() => ({
      scrollY: window.scrollY,
      docHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }));
    // The tripwire again, asserted before what it certifies: with no scroll
    // there is nothing to tell the two positioning schemes apart, and this
    // suite must go red for being unable to see the defect rather than green
    // for not finding it.
    push("the document really scrolls at this viewport — the only " +
      "configuration the out-of-flow contract below is falsifiable in",
      scrollFrame.docHeight > scrollFrame.innerHeight && scrollFrame.scrollY >= 24);
    await page.locator(CARD_TRIGGER).hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    const scrolledCard = await cardLayout();
    const gapBelow = scrolledCard.cardTop - scrolledCard.triggerBottom;
    const gapAbove = scrolledCard.triggerTop - scrolledCard.cardBottom;
    push("an open card is placed in the WINDOW's frame, not the document's — " +
      "it still sits against its trigger with the page scrolled",
      Math.abs(gapBelow - 8) < 1.5 || Math.abs(gapAbove - 8) < 1.5);
    await dismissCard();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize(TOPO_VIEWPORT);

    // The citation card, from the row's confidence chip (the same model the
    // stack table's chip opens): the full reference — where-ref, export
    // block — as hover chrome.
    await page.locator("tr.tvrow[data-id='base_thickness'] span.cardtrig").hover();
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    const citationText = await page.locator(".croppop").textContent();
    push("the confidence chip opens the citation card with the export block",
      /215197/.test(citationText) && /export established/.test(citationText));
    await page.keyboard.press("Escape");

    // The component card, from the merged component cell: part identity plus
    // the thumbnail derived from its own row's resolved crop.
    await page.locator("td.tvcell--component.cardtrig").first().hover();
    await page.waitForSelector(".hovercard--component", { state: "visible", timeout: 5000 });
    const componentText = await page.locator(".croppop").textContent();
    push("the component cell opens the component card with the derived crop line",
      /base plate/.test(componentText) &&
      /crop of its `base plate thickness` annotation/.test(componentText));
    push("the component card deep-links into the annotator isolating the part",
      /isolate=base/.test(await page.locator(".hovercard--component a")
        .last().getAttribute("href")));
    await page.keyboard.press("Escape");

    // --- the DAG's own hover surfaces (viewer_dag_hover_cards) --------------
    //
    // The cards reach the graph itself: the invisible whole-edge hit line
    // (.rail__barhit) opens the EDGE card the grid's crop trigger opens, and a
    // dot opens the NODE card. Both are real hovers over real SVG geometry,
    // which is the half a DOM shim cannot exercise -- a transparent stroke
    // under `pointer-events: stroke` either takes the pointer or it does not.
    const dotFor = (id) =>
      page.locator(`svg.tv__rails circle.rail__dot[data-id="${id}"]`);
    // A dot takes .hover(); a bar cannot -- hoverRailBar above says why.
    const BAR_TRIGGER =
      'svg.tv__rails line.rail__barhit[data-id="base_thickness"]';
    const hoverBar = (id) => hoverRailBar(page, id);

    await hoverBar("base_thickness");
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    const barCardText = await page.locator(".croppop").textContent();
    push("hovering the DAG's own bar opens the edge card with the crop body",
      /base plate thickness/.test(barCardText) && /215197/.test(barCardText) &&
      /cited at:/.test(barCardText) &&
      await page.locator(".hovercard--edge img.croppop__img").count() === 1);
    await dismissCard();

    // The value-level pin: one edge, two triggers, ONE card. If the bar and
    // the grid ever rendered different content for the same dimension, a
    // reader would get two answers about one number.
    await page.locator("tr.tvrow[data-id='base_thickness'] button.crop-trigger")
      .hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    const gridCardText = await page.locator(".croppop").textContent();
    push("the bar's card and the same edge's grid-trigger card are the same " +
      "card, character for character", barCardText === gridCardText);
    await dismissCard();

    // One hover surface, not two: the marks' native <title> tooltips are
    // ABSORBED into the cards, never stacked under them.
    push("no rail mark still carries a native tooltip under its card",
      await page.locator("svg.tv__rails line.rail__barhit > title").count() === 0 &&
      await page.locator("svg.tv__rails circle.rail__dot > title").count() === 0);

    // A boundary dot: both parts named, and the side whose own rows cropped
    // carries that part's component thumbnail. `base_post_seat` is base ⇔
    // post, and only base's crop resolves.
    await dotFor("base_post_seat").hover();
    await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 5000 });
    const nodeCardText = await page.locator(".croppop").textContent();
    push("hovering a boundary dot names both parts that meet there",
      /base plate ⇔ post/.test(nodeCardText) &&
      /mating_surface/.test(nodeCardText));
    push("a boundary dot shows the adjacent part's thumbnail where one " +
      "resolves, and no slot where none does",
      /crop of its `base plate thickness` annotation/.test(nodeCardText) &&
      await page.locator(".hovercard--node img.croppop__img").count() === 1);
    await dismissCard();

    // An internal dot says it is internal rather than leaving a one-sided
    // list to read as a missing side. `base_datum` is the fixture's one.
    await dotFor("base_datum").hover();
    await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 5000 });
    push("an internal dot says which part it is internal to",
      /internal to base plate/.test(await page.locator(".croppop").textContent()));
    await dismissCard();

    // A dot neither of whose sides cropped gets no image slot at all --
    // absent is absent. `arm_tip` is the arm's own dimension against a
    // clearance, and neither side resolves a crop.
    await dotFor("arm_tip").hover();
    await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 5000 });
    const clearanceText = await page.locator(".croppop").textContent();
    push("a dot with no croppable side names the clearance and shows no image",
      /a clearance/.test(clearanceText) &&
      await page.locator(".hovercard--node img").count() === 0);
    await dismissCard();

    // And the layout contract again, measured on the DAG's own trigger this
    // time: a card opened from inside the DAG pane is still hover-only chrome,
    // so the pane it is opened from cannot move and the document cannot grow.
    // Same short viewport and the same kind of non-vacuity witness as the
    // grid-side block above, for the same reason (ISSUE_20260911_card_layout_
    // guard_passes_on_the_absolute_popover): at TOPO_VIEWPORT the card fits
    // inside the document and the measurement could not fail.
    //
    // The witness is the CAP BITING, not "the card hangs past the document
    // bottom" -- which is what this said when viewer_dag_hover_cards was
    // written, against an integration that did not yet have
    // viewer_popover_clamp_and_rebuild_terminal_state's room cap. The cap
    // keeps every open card wholly inside the window, so nothing reaches past
    // the document any more and the old witness cannot be true (the sibling
    // handoff measured exactly this and filed
    // ISSUE_20260914_card_layout_guard_cannot_see_the_absolute_popover_again).
    // Re-expressed here the way the grid-side block was: the card WANTS more
    // height than either side of its trigger can give it, so its box is
    // exactly the roomier side's room and its content still overflows that
    // box. Measured at 1600x700 on ?mock=1 for base_thickness' rail bar:
    // trigger 354.5-378.5, room above 338.5 / below 305.5, card capped to
    // 338.5 at top 8, scrolling inside itself.
    await page.setViewportSize(CARD_LAYOUT_VIEWPORT);
    const beforeBarCard = await cardLayout(BAR_TRIGGER);
    await hoverBar("base_thickness");
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    const withBarCard = await cardLayout(BAR_TRIGGER);
    const barRoomBelow = withBarCard.innerHeight - withBarCard.triggerBottom - 16;
    const barRoomAbove = withBarCard.triggerTop - 16;
    push("the DAG-side card wants more height than there is room for on " +
      "either side of its own rail bar — the configuration the card-layout " +
      "contracts below are only falsifiable in",
      withBarCard.cardBottom !== null && withBarCard.cardScrolls === true &&
      Math.abs(withBarCard.cardHeight -
        Math.max(barRoomAbove, barRoomBelow)) <= 1);
    push("a card opened from inside the DAG moves the DAG pane by nothing at all",
      beforeBarCard.pane === withBarCard.pane &&
      withBarCard.docHeight === beforeBarCard.docHeight);
    push("leaders still land on their dots and seams with a DAG-side card open",
      (await correspondence()).drift.length === 0);
    await dismissCard();
    await page.setViewportSize(TOPO_VIEWPORT);
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

    // Study selection, through the nav tree. Since viewer_study_respine_
    // animation this RE-SPINES: the study's chain becomes the layout, so the
    // page lands in chain mode rather than on the walk with a highlight.
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector("tr.tvrow--on", { timeout: 5000 });
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("selecting a study re-spines the page onto its chain",
      /Showing: study chain/.test(await page.locator("#layout-toggle").textContent()));
    const chained = await correspondence();
    push("the chain layout corresponds too — including a leader that points " +
      "below the whole grid", chained.drift.length === 0);
    if (chained.drift.length) console.log("    drift: " + chained.drift.slice(0, 5).join(" | "));
    push("a chain is one rail, one row per contribution",
      await page.locator("svg.tv__rails circle.rail__dot").count() ===
      chained.rows + 1 &&
      await page.locator("svg.tv__rails line.rail__bar").count() === chained.rows);
    push("the totals render as chips in the slim strip",
      await page.locator(".chip--total").count() === 5);
    await page.locator(".tvtotals__more summary").click();
    push("the totals say where the numbers came from, behind the Details toggle",
      /This page adds nothing up/.test(await page.locator("#totals").textContent()));

    // And the whole walk, with the chain marked on it, is one click away --
    // the layout the study click used to land on.
    await page.locator("#layout-toggle").click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("whole-topology mode says so", /Showing: whole topology/
      .test(await page.locator("#layout-toggle").textContent()));
    push("it marks the study's chain and dims the rest",
      await page.locator("tr.tvrow--on").count() > 0 &&
      await page.locator("tr.tvrow--off").count() > 0);
    const dimmed = await page.locator("tr.tvrow--off").first()
      .evaluate((n) => parseFloat(getComputedStyle(n).opacity));
    push("an off-chain row is actually dimmed, not just classed", dimmed < 0.9);
    push("the whole walk corresponds with a study selected too",
      (await correspondence()).drift.length === 0);

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

    // ...and the other half of that rule, which is the LAYOUT the refusing
    // study lands on: `onNavStudy`'s `chainable(studyId) ? "chain" :
    // "topology"` false branch (topology_app.js). Nothing observed it in any
    // tier until 2026-09-15 — mutating the line to `state.layoutMode =
    // "chain";` shipped green everywhere (ISSUE_20260915_a_refusing_study_
    // staying_on_the_walk_is_unwitnessed_in_every_tier), and the page it
    // produces reads "Showing: study chain" over the whole walk, with the
    // toggle DISABLED so the reader cannot correct the label.
    //
    // Arrived at FROM chain mode on purpose. The refusal click above is
    // reached from the walk, where the false branch and no branch at all are
    // the same state — which is exactly why the mutation was invisible. So:
    // put the page on a chain first, assert it got there, then click the
    // refusing study and require the walk back.
    const walkRows = await page.evaluate(() => {
      const VA = window.ViewerApp;
      return VA.findTopology(VA.demoTopologyFixture().topologies, "demo_mechanism")
        .edges.length;
    });
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("the anchor: a study that sums really is on its chain first",
      /Showing: study chain/.test(await page.locator("#layout-toggle").textContent()));
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("a refusing study drops back onto the whole-topology walk rather " +
      "than claiming a chain it has not got",
      /Showing: whole topology/.test(await page.locator("#layout-toggle").textContent()) &&
      await page.locator("tr.tvrow").count() === walkRows);

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

    // Edge-length scaling (viewer_edge_length_scaling): cycle the toolbar's
    // mode button through all three stops. At each: the bars measure what the
    // keyed position store says (BARS_MATCH_STORE_IN_PAGE), floored bars wear
    // their break marks, and — the point of the jogged leaders — every leader
    // still lands on its dot and its seam even though the DAG stretched and
    // the grid did not.
    const barsMatch = (mode) => page.evaluate(BARS_MATCH_STORE_IN_PAGE,
      { topologyId: "demo_mechanism", mode });
    push("the length toggle starts at uniform",
      /Lengths: uniform/.test(await page.locator("#edge-length-toggle").textContent()));
    await page.locator("#edge-length-toggle").click();
    await page.waitForTimeout(50);
    push("one click: tolerance-width mode, bars measure the store's slots",
      /Lengths: tolerance width/.test(await page.locator("#edge-length-toggle").textContent()));
    const tolBars = await barsMatch("tolerance");
    push("tolerance mode: every bar is its slot, floored bars wear breaks",
      tolBars.bad.length === 0 && tolBars.floored > 0 &&
      tolBars.floored < tolBars.edges);
    if (tolBars.bad.length) console.log("    bars: " + tolBars.bad.slice(0, 5).join(" | "));
    push("tolerance mode: leaders still land on their dots and seams",
      (await correspondence()).drift.length === 0);
    await page.locator("#edge-length-toggle").click();
    await page.waitForTimeout(50);
    push("two clicks: feature-size mode",
      /Lengths: feature size/.test(await page.locator("#edge-length-toggle").textContent()));
    const absBars = await barsMatch("absolute");
    // The demo's one dimension-less edge (the derived gap) floors; every
    // real nominal scales.
    push("feature-size mode: every bar is its slot, only the derived gap floors",
      absBars.bad.length === 0 && absBars.floored === 1);
    if (absBars.bad.length) console.log("    bars: " + absBars.bad.slice(0, 5).join(" | "));
    push("feature-size mode: leaders still land on their dots and seams",
      (await correspondence()).drift.length === 0);
    await page.locator("#edge-length-toggle").click();
    await page.waitForTimeout(50);
    const uniBars = await barsMatch("uniform");
    push("three clicks: back to uniform, nothing floored, no break marks",
      /Lengths: uniform/.test(await page.locator("#edge-length-toggle").textContent()) &&
      uniBars.bad.length === 0 && uniBars.floored === 0);

    // --- leader legibility (viewer_leader_grid_legibility) -----------------
    //
    // Three display preferences, and the one thing all three must leave alone
    // is the correspondence the rest of this suite exists for: a leader's two
    // ends on its dot and its seam. So each is toggled and correspondence
    // re-measured, which is the matrix the handoff asks for -- jogged ×
    // angled, and the jog zone at two widths.
    const bands = () => page.evaluate(BANDS_IN_PAGE);

    const joggedBands = await bands();
    push("the bands are drawn, tinted by parity, and hit-test nothing",
      joggedBands.bad.length === 0 && joggedBands.drawn === joggedBands.bands &&
      joggedBands.tinted > 0);
    if (joggedBands.bad.length) console.log("    bands: " + joggedBands.bad.slice(0, 5).join(" | "));
    push("every leader is still a right-angle jog by default",
      joggedBands.leaderPaths.length === 5 &&
      joggedBands.leaderPaths.every((d) => / H .* V .* H /.test(d)));

    push("the leader-style toggle starts at jogged",
      /Leaders: jogged/.test(await page.locator("#leader-style-toggle").textContent()));
    await page.locator("#leader-style-toggle").click();
    await page.waitForTimeout(50);
    const angledBands = await bands();
    push("one click: angled leaders, drawn as one straight segment each",
      /Leaders: angled/.test(await page.locator("#leader-style-toggle").textContent()) &&
      angledBands.leaderPaths.length === 5 &&
      angledBands.leaderPaths.every((d) => /^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/.test(d)));
    // The deliverable's own condition: the endpoint checks pass in BOTH
    // styles, because only the path between the two ends changed.
    const angledDrift = await correspondence();
    push("angled leaders land on exactly the same dots and seams",
      angledDrift.drift.length === 0 && angledDrift.leaders === 5);
    if (angledDrift.drift.length) console.log("    drift: " + angledDrift.drift.slice(0, 5).join(" | "));
    push("the bands follow the angled leaders and still tint by parity",
      angledBands.bad.length === 0);
    if (angledBands.bad.length) console.log("    bands: " + angledBands.bad.slice(0, 5).join(" | "));

    // Dragging the jog zone open, with a real pointer on the real grip --
    // the whole affordance, not the pure scale arithmetic the fast tier pins.
    const jogGrip = page.locator(".tvgrip--jog");
    push("the jog zone carries a drag grip on the seam", await jogGrip.count() === 1);
    const jogBox = await jogGrip.boundingBox();
    await page.mouse.move(jogBox.x + jogBox.width / 2, jogBox.y + jogBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(jogBox.x + jogBox.width / 2 + 180,
                          jogBox.y + jogBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(80);
    const widened = await bands();
    push("dragging the grip really widens the jog zone",
      widened.svgWidth > angledBands.svgWidth + 100);
    push("a widened jog zone leaves every leader on its dot and its seam",
      (await correspondence()).drift.length === 0);
    push("the bands widen with the zone rather than staying behind",
      widened.bad.length === 0);
    if (widened.bad.length) console.log("    bands: " + widened.bad.slice(0, 5).join(" | "));
    // ...and the same, back in jogged style: the resized zone × both styles
    // is the matrix, not two separate one-offs.
    await page.locator("#leader-style-toggle").click();
    await page.waitForTimeout(50);
    const widenedJog = await bands();
    push("jogged leaders in a widened zone correspond too, and their lanes " +
      "really did spread",
      (await correspondence()).drift.length === 0 &&
      widenedJog.leaderPaths.every((d) => / H .* V .* H /.test(d)) &&
      widenedJog.svgWidth > angledBands.svgWidth + 100);

    // The ELEMENT column: widening it must reveal more text and change NO
    // row's height -- a <tr>'s height is a floor, not a cap, so a cell that
    // wrapped instead of clipping would walk every seam below it off its
    // leader. That is the one thing only a real browser can measure.
    const colGrip = page.locator(".tvgrip--col");
    push("the ELEMENT header carries a drag grip", await colGrip.count() === 1);
    const colBox = await colGrip.boundingBox();
    const beforeCol = await bands();
    const longest = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll("td.tvcell--name"));
      const worst = cells.reduce((a, b) => (b.scrollWidth > a.scrollWidth ? b : a));
      return { id: worst.closest("tr").getAttribute("data-id"),
               clipped: worst.scrollWidth - worst.clientWidth };
    });
    push("some element label really is clipped at the default width",
      longest.clipped > 0);
    await page.mouse.move(colBox.x + colBox.width / 2, colBox.y + colBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(colBox.x + colBox.width / 2 + 220,
                          colBox.y + colBox.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(80);
    const afterCol = await bands();
    push("dragging the ELEMENT grip widens that column",
      afterCol.nameWidth > beforeCol.nameWidth + 150);
    push("and no row grew a pixel taller for it",
      afterCol.rowHeights.length === beforeCol.rowHeights.length &&
      afterCol.rowHeights.every((h, i) => Math.abs(h - beforeCol.rowHeights[i]) < 0.5));
    push("the widened column reveals the label that was clipped",
      (await page.evaluate((id) => {
        const cell = document.querySelector(`tr.tvrow[data-id="${id}"] td.tvcell--name`);
        return cell.scrollWidth - cell.clientWidth;
      }, longest.id)) === 0);
    push("leaders still land on their dots and seams beside a wider column",
      (await correspondence()).drift.length === 0);

    // Both preferences survive a topology switch, like density does -- they
    // are how the page is drawn, not a fact about what is on it.
    await page.locator("#density-toggle").click();
    await page.waitForTimeout(50);
    const afterDensity = await bands();
    push("the resized widths survive a re-render at the other density",
      Math.abs(afterDensity.nameWidth - afterCol.nameWidth) < 0.5 &&
      Math.abs(afterDensity.svgWidth - afterCol.svgWidth) < 0.5);
    push("and correspondence holds at compact density with both widths dragged",
      (await correspondence()).drift.length === 0);
    await page.locator("#density-toggle").click();
    await page.waitForTimeout(50);

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
        await page.waitForFunction(
          () => !window.ViewerApp.lastTopoRender.tweening, null,
          { timeout: 5000 });
        const expected = topology.edges.length;
        push(`[real] ${topology.id} renders all ${expected} edge rows`,
          await page.locator("tr.tvrow").count() === expected);
        // The render honours its own plan — group cells and leaders match
        // VA.gridPlan over the live layout, so a renderer that dropped a
        // rowspan or an omission would fail here even though the plan itself
        // is pinned at the fixture tier.
        const planMatch = await page.evaluate((topologyId) => {
          const VA = window.ViewerApp;
          const proj = VA.findTopology(VA.demoTopologyFixture().topologies, topologyId);
          const plan = VA.gridPlan(proj.layout, proj);
          const cells = Array.from(document.querySelectorAll("td.tvcell--component"));
          const leaders = Array.from(document.querySelectorAll("path.rail__leaderhit"));
          const bad = [];
          if (cells.length !== plan.groups.length) {
            bad.push(`groups: ${cells.length} cells vs ${plan.groups.length} planned`);
          }
          plan.groups.forEach((g, i) => {
            const cell = cells[i];
            if (!cell) return;
            const span = cell.getAttribute("rowspan");
            if ((span === null ? 1 : Number(span)) !== g.count) {
              bad.push(`group ${i} (${g.label}): rowspan ${span} vs count ${g.count}`);
            }
          });
          if (leaders.length !== plan.leaders.length) {
            bad.push(`leaders: ${leaders.length} drawn vs ${plan.leaders.length} planned`);
          }
          return bad;
        }, topology.id);
        push(`[real] ${topology.id}'s groups and leaders match its plan`,
          planMatch.length === 0);
        if (planMatch.length) console.log("    plan: " + planMatch.slice(0, 5).join(" | "));
        const drift = await correspondence();
        push(`[real] ${topology.id} corresponds leader for leader`, drift.drift.length === 0);
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
          // A study click is a transition now (viewer_study_respine_
          // animation), and mid-flight the pane holds a ghost of the
          // outgoing frame as well as the incoming one -- so every count
          // below has to be taken on a settled page, not after a fixed wait.
          await page.waitForFunction(
            () => !window.ViewerApp.lastTopoRender.tweening, null,
            { timeout: 5000 });
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

      // Edge-length scaling against the real pitch_system (the DoD's own
      // case): every edge is variation-only (nominal 0.0, a real ± band), so
      // feature-size mode floors ALL of them — the honest all-marked
      // rendering, never a fake proportion — while tolerance-width mode
      // scales the real bands (0.03 … 0.2 at lock time: the widest at full
      // length, at least one narrow one floored). Leaders re-measured at
      // every stop: the grid stays evenly spaced while the DAG stretches,
      // which is what the jogged leaders exist to absorb.
      await page.locator(navRow("topology", "pitch_system")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const realBars = (mode) => page.evaluate(BARS_MATCH_STORE_IN_PAGE,
        { topologyId: "pitch_system", mode });
      await page.locator("#edge-length-toggle").click();
      await page.waitForTimeout(50);
      const realTol = await realBars("tolerance");
      // Every bar is its slot, and the slots are what the VIEWPORT allows:
      // pitch_system's 24 edges cannot be drawn in proportion inside a 1000px
      // window without going under the one-row floor, so under the fit
      // (viewer_dag_spine_layout) they all sit ON it, every one marked
      // not-to-scale. That is the honest overflow the fit is allowed to
      // produce — and the DAG is no taller than its own floor demands, where
      // the retired 6-row cap drew it 3325px tall.
      push("[real] pitch_system under tolerance width: bars measure the " +
        "store, and the viewport fit floors every one of them rather than " +
        "drawing a DAG the page cannot hold",
        realTol.bad.length === 0 && realTol.floored === realTol.edges &&
        realTol.dagHeight <= Math.max(realTol.budget, realTol.floorMin) + 0.5);
      if (realTol.bad.length) console.log("    bars: " + realTol.bad.slice(0, 5).join(" | "));
      push("[real] pitch_system tolerance-width leaders still correspond",
        (await correspondence()).drift.length === 0);
      await page.locator("#edge-length-toggle").click();
      await page.waitForTimeout(50);
      const realAbs = await realBars("absolute");
      push("[real] pitch_system under feature size: every variation-only " +
        "edge floors, wearing its break mark",
        realAbs.bad.length === 0 && realAbs.floored === realAbs.edges);
      if (realAbs.bad.length) console.log("    bars: " + realAbs.bad.slice(0, 5).join(" | "));
      push("[real] pitch_system feature-size leaders still correspond",
        (await correspondence()).drift.length === 0);
      await page.locator("#edge-length-toggle").click();
      await page.waitForTimeout(50);

      // The bands and both leader styles on the REAL pitch_system -- the
      // document Jeff was reading when he said the leaders were near
      // impossible to follow, and the one where the leaders genuinely cross
      // each other (16 times: ISSUE_20260914_leaders_cross_each_other_since_
      // the_grid_was_centred.md). 43 rows and 16 leaders is also the only
      // case with enough bands for "ride a band across the jog zone" to mean
      // anything.
      const realBands = await page.evaluate(BANDS_IN_PAGE);
      push("[real] pitch_system's rows and bands are tinted from one parity, " +
        "and its untraced rows keep their provenance tint as well",
        realBands.bad.length === 0 && realBands.bands === 17 &&
        realBands.drawn === 17 &&
        realBands.tinted === realBands.rowHeights.length &&
        realBands.provenanceLayers > realBands.tinted / 2);
      if (realBands.bad.length) console.log("    bands: " + realBands.bad.slice(0, 5).join(" | "));
      await page.locator("#leader-style-toggle").click();
      await page.waitForTimeout(80);
      const realAngled = await page.evaluate(BANDS_IN_PAGE);
      push("[real] pitch_system's angled leaders still land on every dot and seam",
        (await correspondence()).drift.length === 0 &&
        realAngled.bad.length === 0 &&
        realAngled.leaderPaths.length === 16 &&
        realAngled.leaderPaths.every((d) => /^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/.test(d)));
      if (realAngled.bad.length) console.log("    bands: " + realAngled.bad.slice(0, 5).join(" | "));
      await page.locator("#leader-style-toggle").click();
      await page.waitForTimeout(80);
      push("[real] and back in jogged style",
        (await correspondence()).drift.length === 0 &&
        /Leaders: jogged/.test(await page.locator("#leader-style-toggle").textContent()));

      // Both resizes are display preferences, so SWITCHING TOPOLOGY must not
      // reset them -- the rule density and the length modes already follow.
      const zone = () => page.evaluate(ZONE_IN_PAGE);
      const before = await zone();
      // Not asserted to be 1: the mock block above dragged it, and the app's
      // state module survives the fixture swap and re-boot this tier does --
      // which is itself the preference behaving. What is asserted is that the
      // scale is re-derived against THIS topology's own 16 leaders.
      push("[real] the jog zone is measured against pitch_system's own 16 leaders",
        before.leaders === 16 && before.scale >= 1);
      const realGrip = await page.locator(".tvgrip--jog").boundingBox();
      await page.mouse.move(realGrip.x + realGrip.width / 2,
                            realGrip.y + realGrip.height / 2);
      await page.mouse.down();
      await page.mouse.move(realGrip.x + realGrip.width / 2 + 200,
                            realGrip.y + realGrip.height / 2, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      const dragged = await zone();
      push("[real] pitch_system's jog zone drags open, leaders still on their " +
        "dots and seams",
        dragged.scale > 1.5 && dragged.svg > before.svg + 100 &&
        (await correspondence()).drift.length === 0);

      // The leader STYLE is the third preference in that rule, and it is the
      // one nothing observed until 2026-09-15 (ISSUE_20260915_leader_style_
      // persistence_across_topology_switch_is_unpinned): topology_app.js and
      // apps/viewer/README.md both say it survives a topology switch "like
      // density does", and adding `state.leaderStyle = "jogged";` to
      // selectTopology() shipped green in every tier. The reason is placement,
      // not coverage: the block above toggles to angled, measures, and toggles
      // BACK before the only topology switch in the suite, and at the default
      // a reset and a non-reset are the same state. So switch topology while
      // the style is OFF its default, and read the toggle back afterwards.
      await page.locator("#leader-style-toggle").click();
      await page.waitForTimeout(80);
      push("[real] the anchor: the leader style really is off its default " +
        "before the switch",
        /Leaders: angled/.test(await page.locator("#leader-style-toggle").textContent()));

      await page.locator(navRow("topology", "pitch_link_to_pitch_plate")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const switched = await zone();
      push("[real] switching topology keeps the SCALE, not the pixel width",
        switched.topologyId === "pitch_link_to_pitch_plate" &&
        switched.natural !== dragged.natural &&
        Math.abs(switched.scale - dragged.scale) < 0.01 &&
        (await correspondence()).drift.length === 0);
      push("[real] switching topology keeps the leader STYLE too",
        /Leaders: angled/.test(await page.locator("#leader-style-toggle").textContent()));
      // Back to jogged, so everything below this sees the default it expects.
      await page.locator("#leader-style-toggle").click();
      await page.waitForTimeout(80);
      await page.locator(navRow("topology", "pitch_system")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });

      // ...and the three OLDER display preferences, whose precedent both docs
      // invoke when they say the leader style survives a switch "like density
      // does". Measured 2026-09-15, chasing the same question the leader-style
      // issue raises at its end: adding `state.rowDensity = "comfortable";`,
      // `state.edgeLengthMode = "uniform";` or `state.edgeValueOnly = false;`
      // to selectTopology() reddened NOTHING in any tier. Same hole, same
      // cause — the suite only ever switched topology with the toolbar at its
      // defaults, where a reset and a non-reset are the same state — so the
      // fix is the same: take all three off their defaults, switch, and read
      // the toolbar back. Done as its own round trip rather than folded into
      // the jog-zone block above, so nothing here perturbs that measurement.
      await page.locator("#density-toggle").click();
      await page.locator("#edge-length-toggle").click();
      await page.locator("#edge-value-toggle").click();
      await page.waitForTimeout(80);
      const offDefaults = async () => ({
        density: await page.locator("#density-toggle").textContent(),
        length: await page.locator("#edge-length-toggle").textContent(),
        valueOnly: await page.locator("#edge-value-toggle").textContent(),
      });
      const beforeSwitch = await offDefaults();
      push("[real] the anchor: density, length mode and value-only rows are " +
        "all off their defaults before the switch",
        /Rows: Compact/.test(beforeSwitch.density) &&
        /Lengths: tolerance/.test(beforeSwitch.length) &&
        /Rows: values only/.test(beforeSwitch.valueOnly));
      await page.locator(navRow("topology", "pitch_link_to_pitch_plate")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const afterSwitch = await offDefaults();
      push("[real] switching topology keeps the density, the length mode and " +
        "the value-only rows as well",
        afterSwitch.density === beforeSwitch.density &&
        afterSwitch.length === beforeSwitch.length &&
        afterSwitch.valueOnly === beforeSwitch.valueOnly);
      // Back to the defaults, and back to pitch_system, for the checks below.
      await page.locator("#density-toggle").click();
      await page.locator("#edge-length-toggle").click();
      await page.locator("#edge-length-toggle").click();
      await page.locator("#edge-value-toggle").click();
      await page.waitForTimeout(80);
      await page.locator(navRow("topology", "pitch_system")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });

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

  const correspondence = () => page.evaluate(CORRESPONDENCE_IN_PAGE);

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

  // Every edge-length mode in turn, reporting the fit and the centring the
  // render actually produced at each stop (viewer_dag_spine_layout). The
  // toolbar's own cycle order is VA.EDGE_LENGTH_MODES', so three clicks come
  // back to where they started and the suite after this one is undisturbed.
  const fitAcrossModes = async () => {
    const seen = [];
    for (let i = 0; i < 3; i++) {
      seen.push(await page.evaluate(FIT_IN_PAGE));
      await page.locator("#edge-length-toggle").click();
      await page.waitForTimeout(50);
    }
    return seen;
  };

  const navContract = () => page.evaluate(() => {
    const nav = document.querySelector(".navtree");
    const style = getComputedStyle(nav);
    return { position: style.position, overflowY: style.overflowY };
  });

  // Dismiss an open hover card deterministically: move the pointer OFF the
  // trigger FIRST, then Escape. Since viewer_dag_hover_cards the rail marks
  // card too, and a mark's click re-renders the pane -- a fresh element
  // landing under a stationary pointer fires `mouseenter` again, so an Escape
  // sent while the pointer still sits on the mark can be undone by the very
  // next paint. (4, 4) is the topbar: no trigger of any kind lives there.
  const dismissCard = async () => {
    await page.mouse.move(4, 4);
    await page.keyboard.press("Escape");
  };

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
    // Back onto the whole walk: selecting a study re-spines onto its chain
    // now (viewer_study_respine_animation), and every contract in this
    // function is about the height the WHOLE serialisation demands of the
    // page -- a 7-row chain would fit a viewport that its 12-row walk does
    // not, which is the case being tested.
    await page.locator("#layout-toggle").click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });

    const mockPane = await paneContract();
    push("[mock] the DAG pane no longer owns a scrollport of its own",
      mockPane.overflowY !== "auto" && mockPane.overflowY !== "scroll");
    push("[mock] the DAG pane renders its full row content height, " +
      "uncapped by the viewport", mockPane.height >= mockPane.minExpected);
    const mockNav = await navContract();
    push("[mock] the left nav is the one remaining independent scroll region",
      mockNav.position === "sticky" &&
      (mockNav.overflowY === "auto" || mockNav.overflowY === "scroll"));

    // The viewport fit and the centring, in every length mode
    // (viewer_dag_spine_layout). Two contracts: the DAG is never taller than
    // the window allows unless its own one-row floor demands it (the honest
    // overflow), and the grid block really sits where the position store says
    // — the DOM offset measured against `gridOffset`, which is what the
    // leaders' grid-side seams were computed from.
    const mockFit = await fitAcrossModes();
    push("[mock] every length mode fits the DAG into the viewport, or into " +
      "its own floor where that is taller",
      mockFit.length === 3 && mockFit.every((f) =>
        f.budget > 0 && f.dagHeight <= Math.max(f.budget, f.floorMin) + 0.5));
    push("[mock] the grid IS offset against the DAG — the contract below " +
      "would pass at 0 ≈ 0", mockFit.every((f) => f.gridOffset > 1));
    push("[mock] the grid block sits exactly where the store centres it, in " +
      "every length mode",
      mockFit.every((f) => Math.abs(f.measuredGridOffset - f.gridOffset) < 0.75));
    push("[mock] the demo DAG is short enough that the fit is real room, " +
      "not the floor", mockFit.every((f) => f.budget > f.floorMin));

    // A window that changes size after a paint leaves the DAG fitted to a
    // viewport that is gone, so the app re-paints on resize. Measured here in
    // tolerance width, where the fit has real room to give up.
    await page.locator("#edge-length-toggle").click();
    await page.waitForTimeout(50);
    const roomy = await page.evaluate(FIT_IN_PAGE);
    await page.setViewportSize({ width: 1400, height: 520 });
    await page.waitForTimeout(400);
    const shrunk = await page.evaluate(FIT_IN_PAGE);
    push("[mock] shrinking the window re-fits the DAG into it",
      roomy.mode === "tolerance" && shrunk.mode === "tolerance" &&
      shrunk.budget < roomy.budget && shrunk.dagHeight < roomy.dagHeight &&
      shrunk.dagHeight <= Math.max(shrunk.budget, shrunk.floorMin) + 0.5);
    push("[mock] leaders still land on their dots and seams after the re-fit",
      (await correspondence()).drift.length === 0);
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(400);
    await page.locator("#edge-length-toggle").click();
    await page.locator("#edge-length-toggle").click();
    await page.waitForTimeout(50);

    // Compact density: correspondence must still hold once row height changes
    // — the leaders and the grid rows both re-derive from the same rowHeight.
    //
    // The correspondence check alone anchors NOTHING here, and did not until
    // 2026-09-15 (ISSUE_20260914_compact_density_correspondence_check_has_no_
    // positive_anchor): `correspondence()` re-derives both ends from the LIVE
    // DOM, so it holds at whatever density is on screen and cannot say which
    // one that was. A toggle that silently stopped working — a renamed id, a
    // handler that no longer re-renders, a density the toolbar stops emitting
    // — left this green under a name saying the opposite. The row pitch is the
    // positive anchor, read against VA.ROW_DENSITIES' own two numbers rather
    // than against 16 and 26 written out here, and it is also the effect to
    // wait FOR, which is what retires the 50ms sleep that stood in for it.
    const rowPitch = () => page.evaluate(
      () => document.querySelector("tr.tvrow").getBoundingClientRect().height);
    const densities = await page.evaluate(() => window.ViewerApp.ROW_DENSITIES);
    const comfortablePitch = await rowPitch();
    await page.locator("#density-toggle").click();
    await page.waitForFunction((was) => document.querySelector("tr.tvrow")
      .getBoundingClientRect().height < was, comfortablePitch, { timeout: 5000 })
      // A toggle that did NOT take has to fail as this block's own named
      // sub-check rather than as a suite-level ERROR — the mutation-witness
      // tier reads the check's name off this file's output.
      .catch(() => {});
    const compactPitch = await rowPitch();
    push("the density toggle really took — the rows are at ROW_DENSITIES' " +
      "compact pitch, and were at its comfortable one before the click",
      Math.abs(comfortablePitch - densities.comfortable.rowHeight) < 0.6 &&
      Math.abs(compactPitch - densities.compact.rowHeight) < 0.6 &&
      new RegExp("Rows: " + densities.compact.label)
        .test(await page.locator("#density-toggle").textContent()));
    push("leaders stay on their dots and seams at compact density",
      (await correspondence()).drift.length === 0);
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
        // Back onto the walk, same reason as the mock block above: the
        // height contracts are about pitch_system's 45 slots, and a study
        // re-spine shows a 21-slot chain instead.
        await page.locator("#layout-toggle").click();
        await page.waitForFunction(
          () => !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 5000 });
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
      push("[real] leaders stay on their dots and seams",
        (await correspondence()).drift.length === 0);

      // pitch_system is the case the fit was written for: 45 rows at one row
      // each is already past a 900px window, so no mode may draw it SHORTER
      // (the floor is never given up) and none may draw it taller either —
      // where the retired 6-row cap drew its tolerance-width walk 3325px tall.
      const realFit = await fitAcrossModes();
      push("[real] no length mode draws pitch_system taller than its own " +
        "floor demands — the 6-row cap's 3325px walk is gone",
        realFit.length === 3 &&
        realFit.every((f) => f.dagHeight <= Math.max(f.budget, f.floorMin) + 0.5));
      push("[real] pitch_system overflows honestly: its own floor is past " +
        "the budget, so it scrolls rather than shrinking below one row",
        realFit.every((f) => f.floorMin > f.budget && f.dagHeight === f.floorMin));
      push("[real] pitch_system's grid IS offset against its DAG",
        realFit.every((f) => f.gridOffset > 1));
      push("[real] the grid block sits where the store centres it here too",
        realFit.every((f) => Math.abs(f.measuredGridOffset - f.gridOffset) < 0.75));
      push("[real] leaders still correspond after the mode cycle",
        (await correspondence()).drift.length === 0);
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
  // Dismiss an open hover card deterministically: move the pointer OFF the
  // trigger FIRST, then Escape. Since viewer_dag_hover_cards the rail marks
  // card too, and a mark's click re-renders the pane -- a fresh element
  // landing under a stationary pointer fires `mouseenter` again, so an Escape
  // sent while the pointer still sits on the mark can be undone by the very
  // next paint. (4, 4) is the topbar: no trigger of any kind lives there.
  const dismissCard = async () => {
    await page.mouse.move(4, 4);
    await page.keyboard.press("Escape");
  };

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

    // The same seam for a frame of a RESPINE (viewer_study_respine_animation).
    // A transition's frames run off an animation callback, outside render()'s
    // try/catch entirely, so a throw in one had no owner until the animator
    // was given an error sink -- and it would have looked exactly like the
    // 2026-09-09 incident this whole seam exists for: a pane frozen halfway
    // through a transition, saying nothing. Seeded on the SECOND render, so
    // the first (synchronous) frame paints and only a callback frame blows up.
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    errors.length = 0;
    await page.evaluate(() => {
      const real = window.ViewerApp.renderTopoPane;
      let calls = 0;
      window.ViewerApp.renderTopoPane = function (root, ctx) {
        calls++;
        if (calls > 1) throw new Error("seeded respine frame failure");
        return real(root, ctx);
      };
    });
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector(".banner--crash", { timeout: 5000 });
    push("a throw inside a respine FRAME reaches the same crash banner",
      /seeded respine frame failure/.test(
        await page.locator("#banner").textContent()));
    push("and nothing escaped it as an uncaught page error either",
      errors.length === 0);

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
      const expected = topology.edges.length;
      const rowCount = await page.locator("tr.tvrow").count();
      push(`[real, non-mock] ${topology.id} renders all ${expected} edge rows ` +
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
      // The wait has to be strictly STRONGER than the assertion under it.
      // topology_app.js starts at STATE.DISCONNECTED, and the sibling
      // annotate-mount probe resolves independently of the transport probe and
      // calls render() when it lands (topology_app.js, probeAnnotateMount's
      // .then) -- so the connect-folder banner is a legitimate EARLY paint
      // while chooseAdapter's HTTP probe is still in flight. A
      // `tr.tvrow, .banner--disconnected` disjunction could resolve on that
      // transient and sample it: the 1-in-4 false negative in
      // ISSUE_20260911_served_mode_connect_folder_banner_check_is_flaky. The
      // contract here is the SETTLED state, so wait for the settled render
      // alone -- a row exists only after a READY connection loaded the
      // projection, and renderBanner rebuilds #banner from state.connection in
      // that same paint, so `tr.tvrow` present means the banner below is the
      // settled one. A boot that stays disconnected now fails as a
      // waitForSelector TIMEOUT naming `tr.tvrow`, which is the honest
      // failure, instead of passing through as a banner sighting.
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });
      push("[real] the connect-folder banner never appears",
        await page.locator(".banner--disconnected").count() === 0);
      push("[real] the banner states the data was served, not read from a " +
        "granted folder",
        /Served over HTTP/.test(await page.locator("#banner").textContent()));
      push("[real] the DAG renders with ZERO manual steps",
        await page.locator("tr.tvrow").count() > 0);

      // --- the DoD demonstrations (viewer_hover_cards_and_deep_links) ------
      // Served mode is the one place BOTH halves are fully real: the inbound
      // deep link boots through the real HTTP transport with no test seam,
      // and a hover card's crop image is the real PNG fetched off disk.

      // A deep link opens the viewer with the named study selected.
      await page.goto(url + "/apps/viewer/topology.html" +
        "?topology=pitch_system&study=pitch_system_gas_spring_branch",
        { waitUntil: "load" });
      await page.waitForSelector("tr.tvrow--on", { timeout: 15000 });
      push("[real] a deep link opens the named study selected, over the real " +
        "served transport",
        /pitch_system_gas_spring_branch/
          .test(await page.locator("#totals").textContent()) &&
        await page.locator(".chip--total").count() === 5);

      // Edge hover on a pitch_system edge with a crop: the edge card, with
      // the REAL crop PNG rendered. pitch_system's croppable edges live in
      // crops.json's by_topology space — the space this handoff wired in.
      await page.waitForSelector("img.tvthumb", { timeout: 15000 });
      const keyedRow = await page.evaluate(() => {
        const img = document.querySelector("tr.tvrow img.tvthumb");
        let row = img;
        while (row && row.tagName !== "TR") row = row.parentElement;
        return row ? row.getAttribute("data-id") : null;
      });
      push("[real] a pitch_system crop renders as an inline thumbnail at all",
        !!keyedRow);
      if (keyedRow) {
        await page.locator(
          `tr.tvrow[data-id='${keyedRow}'] button.crop-trigger`).hover();
        await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 15000 });
        const cardText = await page.locator(".croppop").textContent();
        push("[real] hovering the edge shows the crop card with the real image " +
          "and the topology-space claim",
          await page.locator(".hovercard--edge img.croppop__img").count() === 1 &&
          /authored in topology `pitch_system`/.test(cardText));
        await page.keyboard.press("Escape");

        // The DoD's own sentence, on the real graph (viewer_dag_hover_cards):
        // hovering the DAG's own BAR for that same edge shows the same card,
        // real crop image and all.
        await page.mouse.move(4, 4);
        await hoverRailBar(page, keyedRow);
        const barText = await page.locator(".croppop").textContent();
        push("[real] hovering pitch_system's own bar shows the crop card",
          barText === cardText &&
          await page.locator(".hovercard--edge img.croppop__img").count() === 1);
        await page.mouse.move(4, 4);
        await page.keyboard.press("Escape");
      }

      // ...and the node card, on a real boundary dot. Which node that is comes
      // out of the projection rather than being written down here: a boundary
      // is a node whose incident edges do not all carry the same part, and the
      // most interesting one to hover is the boundary with the most
      // crop-bearing parts around it.
      const boundary = realProjection && (() => {
        const pitch = realProjection.topologies.find((t) => t.id === "pitch_system");
        if (!pitch) return null;
        const sides = {}, cropped = {};
        pitch.edges.forEach((e) => {
          const part = e.part === undefined ? null : e.part;
          if (part && e.crop_key) cropped[part] = true;
          [e.from, e.to].forEach((n) => {
            if (!sides[n]) sides[n] = [];
            if (sides[n].indexOf(part) === -1) sides[n].push(part);
          });
        });
        const names = {};
        (pitch.parts || []).forEach((part) => { names[part.id] = part.name || part.id; });
        return Object.keys(sides)
          .filter((n) => sides[n].length > 1 && sides[n].every((x) => x !== null))
          .map((n) => ({ id: n, parts: sides[n], names: sides[n].map((x) => names[x]),
                         score: sides[n].filter((x) => cropped[x]).length }))
          .sort((a, b) => b.score - a.score)[0] || null;
      })();
      // The same witness the keyedRow block above carries: without it a
      // projection that stopped emitting a multi-part boundary in
      // pitch_system would silently drop the two sub-checks below and still
      // report PASS (review, 2026-09-14).
      push("[real] pitch_system has a multi-part boundary dot to hover at all",
        !!boundary);
      if (boundary) {
        await page.locator(
          `svg.tv__rails circle.rail__dot[data-id="${boundary.id}"]`).hover();
        await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 15000 });
        const realNode = await page.locator(".croppop").textContent();
        push("[real] hovering a pitch_system boundary dot names both parts " +
          "that meet there",
          boundary.names.every((name) => realNode.includes(name)));
        // Absent is absent, on real data too: a thumbnail line and an image
        // arrive together or neither does.
        push("[real] a node card's thumbnail line and its image arrive together",
          /crop of its/.test(realNode)
            ? await page.locator(".hovercard--node img.croppop__img").count() > 0
            : await page.locator(".hovercard--node img").count() === 0);
        await page.mouse.move(4, 4);
        await page.keyboard.press("Escape");
      }

      // A citation card from a REAL spec citation: the L1 fastener grip's
      // NAS6403 spec, hover on its row's confidence chip.
      await page.locator(
        "[data-nav-kind='topology'][data-nav-id='vpa_output_to_pitch_plate']").click();
      await page.waitForSelector("tr.tvrow[data-id='fastener_grip']", { timeout: 15000 });
      await page.locator("tr.tvrow[data-id='fastener_grip'] span.cardtrig").hover();
      await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 15000 });
      const specCard = await page.locator(".croppop").textContent();
      push("[real] a citation card renders from a real spec citation",
        /NAS6403/.test(specCard));
      push("[real] the spec-sheet card shows the real crop of the spec page",
        await page.locator(".hovercard--citation img.croppop__img").count() === 1);
      await page.keyboard.press("Escape");

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

// --- the annotator flyout (study_3d_flyout) ---------------------------------
//
// What only a real browser can prove about it:
//   1. The boot-time mount probe really upgrades the affordances: under a
//      repo-root server (../annotate/ IS served beside the viewer) the study
//      toolbar shows the View-in-3D button and an untraced edge's pane shows
//      the attach-to-3D button; under file:// both stay the pre-flyout links.
//   2. Opening the flyout moves NOTHING: the DAG pane's box is measured before
//      and after -- the position:fixed <dialog> claim is a layout claim, and
//      only a layout engine can check it.
//   3. The iframe really boots the annotate app same-origin (its banner
//      renders), and the `trace` deep-link boot really executes end to end
//      over ?mock=1 -- WebGL scene, ghost + mark-face handlers, the published
//      window.__lastTrace summary (the autotest convention).
async function testAnnotateFlyout(browser, fileBase) {
  const label = "annotate flyout (repo-root mount + file:// degradation)";
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    // --- mounted: the sibling annotate app is served beside the viewer ------
    await page.goto(url + "/apps/viewer/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForSelector("#study-3d", { timeout: 15000 });
    push("the probe upgrades the study affordance to the View-in-3D button",
      await page.locator("#study-3d").count() === 1 &&
      await page.locator("#toolbar a").count() === 0);

    const paneBefore = await page.locator("#topopane").boundingBox();
    await page.locator("#study-3d").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    push("clicking it opens the flyout dialog non-modally",
      await page.locator("#annotate-flyout").evaluate((n) => n.open));
    const frameSrc = await page.locator("#annotate-flyout iframe")
      .getAttribute("src");
    push("the flyout iframe boots the annotator with the trace params",
      /annotate\/index\.html\?/.test(frameSrc || "") &&
      /trace=1/.test(frameSrc) && /topology=demo_mechanism/.test(frameSrc) &&
      /study=demo_base_to_tip/.test(frameSrc));
    const paneAfter = await page.locator("#topopane").boundingBox();
    push("opening the flyout moves the DAG pane by nothing at all",
      paneBefore && paneAfter &&
      paneBefore.x === paneAfter.x && paneBefore.y === paneAfter.y &&
      paneBefore.width === paneAfter.width && paneBefore.height === paneAfter.height);

    // The iframe is the real annotate app, same-origin, no mock: it boots to
    // its own pre-connect banner (FSA cannot be granted from Playwright), and
    // the deep-link queue note proves the trace params were understood.
    // NOT waitFor({state:"visible"}) on #banner: apps/annotate/index.html ships
    // `<div id="banner" class="banner"></div>` present and EMPTY, and
    // style.css's `.banner` padding gives even an empty one a non-zero box, so
    // Playwright calls it visible from first paint -- before any setBanner()
    // has run, which is how this check sampled "" and failed on correct code
    // (ISSUE_20260911_annotate_flyout_banner_check_samples_a_transient). Anchor
    // the wait on the effect being asserted -- text -- and let the SAME read
    // return it, so no paint can slip between waiting and sampling. The iframe
    // is same-origin because startRepoRootServer serves BOTH apps/viewer and
    // apps/annotate off this one origin (the src check above reads an
    // attribute on the host document's own element, which says nothing about
    // origin), so contentDocument is readable from the host page; a boot that
    // never writes a banner fails as a
    // waitForFunction TIMEOUT rather than as a wrong-text sighting.
    const bannerText = await page.waitForFunction(() => {
      const doc = document.querySelector("#annotate-flyout iframe")?.contentDocument;
      const el = doc && doc.querySelector("#banner");
      const text = el ? el.textContent.trim() : "";
      return text.length > 0 ? text : null;
    }, null, { timeout: 15000 }).then((handle) => handle.jsonValue());
    push("the embedded annotator boots to an honest pre-connect state",
      /Connect folder|File System Access/.test(bannerText));

    await page.locator("#flyout-close").click();
    push("the close button closes the flyout",
      !(await page.locator("#annotate-flyout").evaluate((n) => n.open)));

    // An untraced edge's pane: the attach-to-3D button. The open flyout sits
    // OVER the detail pane (deliberate -- while open, the annotator's own
    // element detail supersedes it), so the real gesture is: close, pick the
    // edge, attach -- and the same panel (same iframe, its grant and meshes
    // intact) flies back out.
    await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name").click();
    await page.waitForSelector("button.detail__annotate-btn", { timeout: 5000 });
    push("an untraced edge's pane offers attach-to-3D, not the link",
      await page.locator("button.detail__annotate-btn").count() === 1 &&
      await page.locator("a.detail__annotate-link").count() === 0);
    await page.locator("button.detail__annotate-btn").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    push("attach-to-3D re-drives the one panel -- still one iframe, reopened",
      await page.locator("#annotate-flyout iframe").count() === 1 &&
      await page.locator("#annotate-flyout").evaluate((n) => n.open));

    // The hover cards' own 3D affordance, rewired to the SAME panel (handoff
    // annotate_affordances_flyout_and_mesh_gating): before, a card's link
    // opened a second tab even with the flyout live -- two annotators, two
    // folder grants, two cameras. And a part with no installed mesh offers
    // nothing at all: the card still renders its identity, minus a link that
    // would have dead-ended in the annotator's empty state.
    await page.locator("#flyout-close").click();
    await page.locator("td.tvcell--component").filter({ hasText: /^base$/ })
      .first().click();
    await page.waitForSelector("#croppop button.hovercard__3d", { timeout: 5000 });
    push("a component card's 3D affordance is a flyout button, not a new-tab link",
      await page.locator("#croppop button.hovercard__3d").count() === 1 &&
      await page.locator("#croppop a.hovercard__3d").count() === 0);
    await page.locator("#croppop button.hovercard__3d").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    push("the card drives the one panel and closes itself behind it",
      await page.locator("#annotate-flyout iframe").count() === 1 &&
      await page.locator("#croppop").evaluate((n) => n.style.display) === "none");
    await page.locator("#flyout-close").click();
    await page.locator("td.tvcell--component").filter({ hasText: /^post$/ })
      .first().click();
    await page.waitForSelector("#croppop.hovercard--component", { timeout: 5000 });
    push("a part with no installed mesh shows NOTHING about 3D on its card",
      await page.locator("#croppop .hovercard__3d").count() === 0 &&
      !/3D/.test(await page.locator("#croppop").textContent()));

    // --- the trace boot itself, end to end over the annotate mock fixture ---
    await page.goto(url + "/apps/annotate/index.html?mock=1&trace=1" +
      "&topology=demo_system&study=demo_study", { waitUntil: "load" });
    await page.waitForFunction(() => window.__lastTrace !== undefined, null,
      { timeout: 15000 });
    const trace = await page.evaluate(() => window.__lastTrace);
    const demoSha = await page.evaluate(() => window.AnnotateApp.FIXTURES.demoSha);
    push("trace ghosts the study's one installed part",
      trace.ghosted.length === 1 && trace.ghosted[0] === demoSha);
    push("trace marks the bound face, and only it",
      trace.marks.length === 1 && trace.marks[0].edgeId === "demo_edge_untraced" &&
      trace.marks[0].faceId === 0);
    push("trace reports the missing mesh and the unbound edges honestly",
      trace.missingParts.length === 1 && trace.missingParts[0] === "no_such_part" &&
      trace.unboundEdges.length === 2);
    push("the banner narrates the trace in plain words",
      /Traced .*1 part\(s\) ghosted, 1 bound face\(s\) marked/.test(
        await page.locator("#banner").textContent()));

    // --- degraded: file:// has no origin to share ----------------------------
    await page.goto(fileBase + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForTimeout(300); // the probe resolves false immediately; give render a beat
    push("under file:// the study affordance stays the pre-flyout link",
      await page.locator("#study-3d").count() === 0 &&
      await page.locator("#toolbar a").count() === 1);
    await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name").click();
    await page.waitForSelector("a.detail__annotate-link", { timeout: 5000 });
    push("under file:// the edge pane keeps the annotate-this link",
      await page.locator("a.detail__annotate-link").count() === 1 &&
      await page.locator("button.detail__annotate-btn").count() === 0);
    await page.locator("td.tvcell--component").filter({ hasText: /^base$/ })
      .first().click();
    await page.waitForSelector("#croppop a.hovercard__3d", { timeout: 5000 });
    push("under file:// a card's 3D affordance stays the plain new-tab link",
      await page.locator("#croppop a.hovercard__3d").count() === 1 &&
      await page.locator("#croppop button.hovercard__3d").count() === 0 &&
      await page.locator("#croppop a.hovercard__3d").getAttribute("target") === "_blank");

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
    server.closeAllConnections();
    server.close();
  }
}

// The annotator's hosted posture, in a real browser (handoff
// surfaces_that_state_something_false).
//
// ONE server, TWO hostnames, and that is the whole design of this check: the
// same files, the same port, the same page, reached once as a hosted visitor
// (HOSTED_TEST_HOST) and once from the machine itself (127.0.0.1). Only a real
// browser decides this, because the decision reads `window.location.hostname`
// off a live page -- and only running BOTH halves proves the rule discriminates
// rather than just being strict: a build that removed the picker everywhere
// would pass the hosted half and fail the local one, which is the regression
// that would quietly kill Jeff's own annotation workflow.
async function testAnnotateHostedPosture(browser) {
  const label = "annotate hosted posture (no folder grant off-machine)";
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const { port } = server.address();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    // --- hosted: a visitor with no tolstack repo to grant -------------------
    await page.goto(`http://${HOSTED_TEST_HOST}:${port}/apps/annotate/index.html`,
      { waitUntil: "load" });
    const hostedBanner = await page.waitForFunction(() => {
      const text = document.querySelector("#banner")?.textContent.trim() || "";
      return text.length > 0 ? text : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue());
    push("the page really is on a non-loopback origin",
      await page.evaluate(() => window.location.hostname) === HOSTED_TEST_HOST);
    push("the banner states that annotating is not available on this site",
      /not available on this site/.test(hostedBanner));
    push("Connect folder is not offered at all",
      !/Connect folder/.test(hostedBanner) &&
      await page.locator("#connect-btn").evaluate((n) => n.style.display) === "none");
    push("nor is the read/write transport line, which would be false here",
      (await page.locator("#transport-sub").textContent()).trim() === "");
    push("no path, script or command leaks into the sentence",
      !/\.py|venv-win|C:\\|http/.test(hostedBanner));
    push("the honest notice is not an error thrown on the way to it",
      errors.length === 0);

    // --- local: the same URL from the machine holding the repo --------------
    // Unchanged by this handoff and it must stay that way: drawing-checker
    // serves this app from 127.0.0.1:8000 in dev, and the folder grant is the
    // only way in (there is no HTTP read transport, and no file:// story).
    await page.goto(`http://127.0.0.1:${port}/apps/annotate/index.html`,
      { waitUntil: "load" });
    const localBanner = await page.waitForFunction(() => {
      const text = document.querySelector("#banner")?.textContent.trim() || "";
      return text.length > 0 ? text : null;
    }, null, { timeout: 15000 }).then((h) => h.jsonValue());
    push("a loopback page still asks for the folder, or says this browser cannot",
      /Connect folder|File System Access/.test(localBanner));
    push("and it does NOT show the hosted notice",
      !/not available on this site/.test(localBanner));

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
    server.closeAllConnections();
    server.close();
  }
}

// --- the inbound deep-link contract (viewer_hover_cards_and_deep_links) ----
//
// The URL params documented in apps/viewer/README.md, driven through a REAL
// navigation — the thing the fast tier's resolveDeepLink tests cannot do is
// prove that boot() actually reads location.search and that the selection
// lands on screen. Over ?mock=1 so it runs with no data built; the served-mode
// suite drives the same contract against the real projection with no seam.
async function testDeepLinks(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  try {
    // A topology + study link: the study is selected — its chain marked, its
    // totals in the strip — exactly as if the nav row had been clicked.
    await page.goto(url +
      "/topology.html?mock=1&topology=demo_mechanism&study=demo_base_to_tip",
      { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow--on", { timeout: 15000 });
    push("a topology+study link opens with the study selected",
      /demo_base_to_tip/.test(await page.locator("#totals").textContent()) &&
      await page.locator(".chip--total").count() === 5);
    push("the nav marks the linked study current",
      await page.locator(
        "[data-nav-kind='study'][data-nav-id='demo_base_to_tip'].navtree__row--on")
        .count() === 1);

    // An edge link: the detail pane opens on that edge.
    await page.goto(url +
      "/topology.html?mock=1&topology=demo_mechanism&edge=base_thickness",
      { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow--selected", { timeout: 15000 });
    push("an edge link opens with the edge selected in the pane",
      /base plate thickness/.test(await page.locator("#detail").textContent()) &&
      await page.locator("tr.tvrow--selected").count() === 1);

    // A stack + element link: the classic table, the element selected — the
    // exact shape drawing-checker's analyses panel consumes.
    await page.goto(url +
      "/topology.html?mock=1&stack=demo_joint_standalone&element=plate",
      { waitUntil: "load" });
    await page.waitForSelector("tr.el-row--selected", { timeout: 15000 });
    push("a stack+element link opens the classic view with the row selected",
      await page.locator("tr.el-row--selected").count() === 1 &&
      /plate thickness/.test(await page.locator("#detail").textContent()));

    // An id the data does not contain: the default renders and the banner
    // says what the link asked for — never a crash, never a silent guess.
    await page.goto(url + "/topology.html?mock=1&topology=nope",
      { waitUntil: "load" });
    await page.waitForSelector(".banner__notice", { timeout: 15000 });
    push("an unresolvable link id becomes a banner notice over the default view",
      /topology `nope`/.test(await page.locator(".banner__notice").textContent()) &&
      await page.locator("tr.tvrow").count() > 0);
    push("a mistyped link never raises the needs-a-rebuild alarm",
      await page.locator(".banner__stale").count() === 0);

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

// What a hosted visitor actually sees when the server publishes nothing --
// the whole point of viewer_transport_honest_hosted, and the one thing only a
// real browser can prove, because it is the FSA fallback that must not happen
// and only a real `window.location.protocol` decides that.
async function testHostedUnpublished(browser, realProjection) {
  const label = "hosted origin with nothing published";
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const { server, publish } = await startHostedCatchAllServer();
  const url = `http://127.0.0.1:${server.address().port}/tolstack/viewer/topology.html`;
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  try {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForSelector(".banner--unpublished", { timeout: 15000 });
    const banner = await page.locator("#banner").textContent();
    push("the banner states the data is not published here",
      /not published on this site yet/.test(banner));
    push("Connect folder is NOT offered -- a hosted visitor has no repo to grant",
      !/Connect folder/.test(banner));
    push("no dead control of any kind sits on the bar",
      await page.locator("#banner button").count() === 0);
    push("the connect-folder banner is not rendered underneath it either",
      await page.locator(".banner--disconnected").count() === 0);
    push("no path, script or command leaks into the sentence",
      !/\.py|venv-win|C:\\|\//.test(banner));
    // The *"and nothing else"* half of the contract, which nothing observed
    // until 2026-09-15 (ISSUE_20260915_unpublished_banner_has_nothing_pinning_
    // and_nothing_else). topology_app.js's no-adapter branch writes
    // `state.error` only for the OTHER no-adapter state — file:// in a browser
    // with no File System Access API — and views/banner.js's UNPUBLISHED
    // branch renders `state.error` when it is set. Drop that condition and a
    // hosted visitor is told to switch to Chrome or Edge and offered `?mock=1`,
    // neither of which is true of their situation; every check above passes
    // anyway, because each looks for something that must be ABSENT. So this
    // one counts what is there: the bar is one span, and no second element of
    // any kind rides along under it.
    push("the bar carries that one sentence and nothing else — no second " +
      "element offering advice that is untrue of a hosted visitor",
      await page.locator("#banner > *").count() === 1 &&
      await page.locator("#banner .banner__error").count() === 0);

    if (!realProjection) {
      push("[real] a reload after the data lands enters served mode (skipped: " +
        "topologies.json not built -- build it, or pass --repo <main checkout>)", true);
    } else {
      // Deliverable 3: nothing about the unpublished state is latched. The
      // server starts serving the projections, and a PLAIN RELOAD of the same
      // url -- no click, no grant, no cache clear -- boots served mode.
      publish();
      await page.reload({ waitUntil: "load" });
      await page.waitForSelector("tr.tvrow", { timeout: 15000 });
      const after = await page.locator("#banner").textContent();
      push("[real] a reload after the data lands enters served mode",
        /Served over HTTP/.test(after) &&
        await page.locator(".banner--unpublished").count() === 0);
    }

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
    server.closeAllConnections();
    server.close();
  }
}

// The respine, measured in the page (viewer_study_respine_animation).
//
// Against the REAL projection, because the animation's whole point is the
// document Jeff complained about: pitch_system's 45-slot walk giving way to a
// study's linear chain. Three separate claims, and they need three different
// kinds of check:
//
//   1. the app shell really re-spines on a study click -- the CALL SITE, not
//      the computation. The fast tier can prove VA.animateTopoPane works and
//      still miss topology_app.js never calling it, which is exactly the
//      mutation that shipped green in viewer_dag_spine_layout's round 1;
//   2. a transition is actually in flight mid-click -- a ghost of the
//      outgoing frame over a slid block -- so "it animates" is measured
//      rather than assumed;
//   3. the SETTLED page is the page a render with no animation in it
//      produces, bar for bar, in every length mode and both directions.
//
// (3) reaches the same state twice by two different routes: once through the
// transition, once with `prefers-reduced-motion: reduce` emulated, which is
// the build's own no-animation path. Both are real pages, measured off the
// DOM, which is what makes it a drift check rather than a re-reading of the
// store the render used.
async function testRespine(browser, url, label, realProjection, realCrops) {
  const suite = `${label} respine`;
  if (!realProjection) {
    console.log(`[${suite}] skipped: no topologies.json under ${DATA_REPO}`);
    return { label: suite, ok: true };
  }
  const page = await browser.newPage({ viewport: TOPO_VIEWPORT });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const correspondence = () => page.evaluate(CORRESPONDENCE_IN_PAGE);
  const settled = () => page.waitForFunction(
    () => window.ViewerApp && window.ViewerApp.lastTopoRender &&
          !window.ViewerApp.lastTopoRender.tweening,
    null, { timeout: 10000 });

  // What a paint actually drew, as the DOM carries it -- never as the store
  // says it should be. Every geometry claim below is this.
  const geometry = () => page.evaluate(() => {
    const at = (sel, attrs) => Array.from(document.querySelectorAll(sel))
      .map((n) => attrs.map((a) => n.getAttribute(a)).join("|"));
    return {
      bars: at("svg.tv__rails line.rail__barhit", ["data-id", "y1", "y2"]),
      dots: at("svg.tv__rails circle.rail__dot", ["data-id", "cx", "cy"]),
      leaders: at("svg.tv__rails path.rail__leaderhit", ["data-leader-id", "d"]),
      rows: at("tr.tvrow", ["data-id"]),
      breaks: document.querySelectorAll("svg.tv__rails path.rail__break").length,
      gridOffset: document.querySelector("div.tv__rows").style.marginTop || "",
      svgWidth: document.querySelector("svg.tv__rails").getAttribute("width"),
      // The three things a settled frame must carry nothing of.
      ghosts: document.querySelectorAll("div.tv__ghost").length,
      transforms: [".tv__head", ".tv__body"]
        .map((s) => document.querySelector(s).style.transform || "").join(","),
      faded: Array.from(document.querySelectorAll(
        "svg.tv__rails *, tr.tvrow, div.tv__rows"))
        .filter((n) => n.style && n.style.opacity !== "").length,
    };
  });
  const clean = (g) => g.ghosts === 0 && g.transforms === "," && g.faded === 0;

  // One frame of a transition in flight, or null if none was ever there.
  //
  // Raced against a 260ms animation on purpose: it is the only way to observe
  // one from outside the page, so it samples every animation frame for as
  // long as a respine can possibly last and keeps the first frame it caught.
  // A build that does not animate finds nothing to keep, which is the whole
  // point -- a settled-state check passes just as well on a repaint.
  const catchFrame = () => page.evaluate(async () => {
    const VA = window.ViewerApp;
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      const last = VA.lastTopoRender;
      const ghost = document.querySelector("div.tv__ghost");
      if (last && last.tweening && ghost) {
        const body = document.querySelector(".tv__body");
        const head = document.querySelector(".tv__head");
        return {
          t: last.positions.t,
          ghostOpacity: parseFloat(ghost.style.opacity),
          ghostInert: getComputedStyle(ghost).pointerEvents === "none",
          ghostHidden: ghost.getAttribute("aria-hidden"),
          ghostRows: ghost.querySelectorAll("tr.tvrow").length,
          ghostHeadHidden: ghost.querySelector(".tv__head").style.display,
          gridOpacity: parseFloat(
            document.querySelector("div.tv__rows").style.opacity),
          bodyShift: body.style.transform,
          headShift: head.style.transform,
        };
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
    return null;
  });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
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
    await settled();

    const pitch = realProjection.topologies.find((t) => t.id === "pitch_system");
    const study = pitch.studies.find((s) => s.status === "ok" && s.layout);
    const walk = await geometry();
    push("[real] the walk is the default layout and it settled clean",
      clean(walk) && walk.rows.length === pitch.edges.length);

    // (1) + (2). The mid-flight probe is raced against a 260ms transition on
    // purpose -- it is the only way to observe one from outside the page -- so
    // it samples every frame for as long as a respine can possibly last and
    // keeps the first one it caught. A build that never animates finds
    // nothing to keep, which is the failure this check exists for.
    await page.locator(navRow("study", study.id)).click();
    const inFlight = await catchFrame();
    push("[real] a study click puts a real transition in flight — the app " +
      "shell animates the respine rather than repainting it", !!inFlight);
    if (!inFlight) {
      console.log("    no in-flight frame was ever observed");
    } else {
      push("[real] the outgoing frame is held as an inert ghost, hidden from " +
        "the a11y tree, still carrying the walk's own rows",
        inFlight.ghostInert && inFlight.ghostHidden === "true" &&
        inFlight.ghostRows === pitch.edges.length &&
        inFlight.ghostOpacity > 0 && inFlight.ghostOpacity <= 1);
      push("[real] its column header is suppressed — the same header in both " +
        "serialisations, so a fading copy would be pure double image",
        inFlight.ghostHeadHidden === "none");
      push("[real] the grid cross-fades rather than snapping to the new order",
        inFlight.gridOpacity >= 0 && inFlight.gridOpacity < 1);
      push("[real] the whole block slides, header and body by the same offset",
        /translateX\(/.test(inFlight.bodyShift) &&
        inFlight.headShift === inFlight.bodyShift);
      push("[real] and by a real distance — the walk and the chain are " +
        "justified against jog zones far apart",
        Math.abs(parseFloat(/translateX\(([-\d.]+)px\)/
          .exec(inFlight.bodyShift)[1])) > 20);
    }

    await settled();
    const chained = await correspondence();
    push("[real] the re-spun chain corresponds: every leader on its own dot " +
      "and its own seam", chained.drift.length === 0);
    if (chained.drift.length) {
      console.log("    drift: " + chained.drift.slice(0, 5).join(" | "));
    }
    push("[real] and the page IS in chain mode — which is what re-spining is",
      /Showing: study chain/
        .test(await page.locator("#layout-toggle").textContent()) &&
      chained.rows === study.result.chain.length);

    // (3). Both directions, in every length mode. `edgeLengthMode` is
    // in-session state and survives a selection, so the modes are cycled
    // once around the outside of the pair of routes.
    const modes = ["uniform", "tolerance", "absolute"];
    const walkRow = navRow("topology", "pitch_system");
    const studyRow = navRow("study", study.id);
    let chainUniform = null;
    for (let i = 0; i < modes.length; i++) {
      // Route A: through the transition, there and back.
      await page.locator(walkRow).click();
      await settled();
      const walkViaRespine = await geometry();
      await page.locator(studyRow).click();
      await settled();
      const chainViaRespine = await geometry();
      if (i === 0) chainUniform = chainViaRespine;
      const corr = await correspondence();

      // Route B: the same two clicks with the build's own no-animation path
      // turned on. Nothing else differs -- same page, same state, same
      // renderer.
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator(walkRow).click();
      await settled();
      const walkFresh = await geometry();
      await page.locator(studyRow).click();
      await settled();
      const chainFresh = await geometry();
      await page.emulateMedia({ reducedMotion: null });

      const drifted = [];
      Object.keys(chainViaRespine).forEach((key) => {
        if (JSON.stringify(chainViaRespine[key]) !== JSON.stringify(chainFresh[key])) {
          drifted.push("chain." + key);
        }
        if (JSON.stringify(walkViaRespine[key]) !== JSON.stringify(walkFresh[key])) {
          drifted.push("walk." + key);
        }
      });
      push(`[real] ${modes[i]}: the settled page carries nothing of the ` +
        `transition, either way`, clean(chainViaRespine) && clean(walkViaRespine));
      push(`[real] ${modes[i]}: settled geometry equals a no-animation ` +
        `render of the same selection — bar, dot, leader, break and offset`,
        drifted.length === 0);
      if (drifted.length) console.log("    drifted: " + drifted.join(", "));
      push(`[real] ${modes[i]}: and the settled chain passes the ` +
        `correspondence matrix`, corr.drift.length === 0);
      // A witness that the two layouts are not the same picture, or every
      // check above would hold on a page that never moved.
      push(`[real] ${modes[i]}: the respine really does change the page`,
        chainViaRespine.rows.length < walkViaRespine.rows.length &&
        chainViaRespine.svgWidth !== walkViaRespine.svgWidth);
      await page.locator("#edge-length-toggle").click();
      await settled();
    }

    // Deselecting is the same transition backwards, and it has to land on the
    // very geometry the page started from -- captured before any of this ran,
    // and in uniform mode, where the three cycles above left it.
    await page.locator(studyRow).click();
    await settled();
    await page.locator(walkRow).click();
    await settled();
    push("[real] deselecting animates back to the walk spine and settles on " +
      "exactly the geometry it started from",
      JSON.stringify(await geometry()) === JSON.stringify(walk));

    // Deselecting and the toolbar's own toggle are the other two controls
    // that change WHICH serialisation is on screen, and both have to animate
    // for the same reason the study click does -- a settled-state check
    // passes on a repaint, so each one is caught in flight.
    await page.locator(studyRow).click();
    await settled();
    await page.locator(walkRow).click();
    const deselectFrame = await catchFrame();
    push("[real] deselecting a study animates too, rather than repainting " +
      "the walk back in", !!deselectFrame &&
      /translateX\(/.test(deselectFrame.bodyShift));
    await settled();

    await page.locator(studyRow).click();
    await settled();
    await page.locator("#layout-toggle").click();
    const toggleFrame = await catchFrame();
    push("[real] and so does the toolbar's own layout toggle — the same " +
      "re-serialisation asked for by hand", !!toggleFrame);
    await settled();
    push("[real] the toggle landed on the whole walk", /Showing: whole topology/
      .test(await page.locator("#layout-toggle").textContent()));

    // A paint that is not one of the transition's own frames has to STOP it:
    // a transition renders from the ctx it started with, so a frame landing
    // after an unrelated paint silently undoes whatever that paint did. The
    // length mode is the cheapest one to see -- it is carried on the ctx
    // rather than on a shared mutable metrics object, so a stale frame draws
    // the old one while the toolbar says the new one.
    await page.locator(walkRow).click();
    await settled();
    // Both clicks in one page call, with the second held until a frame is
    // demonstrably in flight: a study click reaches respine() through a
    // promise, so two Playwright clicks in a row can land the toolbar's paint
    // BEFORE the transition even starts, and then there is nothing to
    // interrupt and nothing being tested.
    const caughtMidFlight = await page.evaluate(async ({ selector }) => {
      const VA = window.ViewerApp;
      document.querySelector(selector).click();
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        if (VA.lastTopoRender.tweening &&
            document.querySelector("div.tv__ghost")) {
          document.querySelector("#edge-length-toggle").click();
          return true;
        }
        await new Promise((r) => requestAnimationFrame(r));
      }
      return false;
    }, { selector: studyRow });
    push("[real] the interruption below really did land mid-transition",
      caughtMidFlight);
    await page.waitForTimeout(700);
    const interrupted = await page.evaluate(() => ({
      ghosts: document.querySelectorAll("div.tv__ghost").length,
      tweening: window.ViewerApp.lastTopoRender.tweening,
      drawnMode: window.ViewerApp.lastTopoRender.mode,
      toolbar: document.querySelector("#edge-length-toggle").textContent,
    }));
    push("[real] a paint landing mid-transition wins: the length mode the " +
      "reader asked for is the one drawn, and no ghost is left behind",
      interrupted.ghosts === 0 && interrupted.tweening === false &&
      interrupted.drawnMode === "tolerance" &&
      /tolerance/.test(interrupted.toolbar));
    // Back to uniform for the block below.
    await page.locator("#edge-length-toggle").click();
    await settled();
    await page.locator("#edge-length-toggle").click();
    await settled();

    // prefers-reduced-motion means JUMP TO THE END: no ghost is ever put in
    // the pane at all, not one that fades quickly. Watched with a mutation
    // observer rather than sampled, so a single frame of one would be caught.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => {
      window.__sawGhost = 0;
      const mo = new MutationObserver(() => {
        if (document.querySelector("div.tv__ghost")) window.__sawGhost++;
      });
      mo.observe(document.querySelector("#topopane"),
        { childList: true, subtree: true });
    });
    await page.locator(studyRow).click();
    await settled();
    const reduced = await geometry();
    push("[real] prefers-reduced-motion never puts a ghost in the pane at all",
      await page.evaluate(() => window.__sawGhost) === 0);
    push("[real] and the page it jumps to is the page the animation would " +
      "have travelled to, settled and clean",
      clean(reduced) && JSON.stringify(reduced) === JSON.stringify(chainUniform));
    push("[real] reduced motion corresponds too",
      (await correspondence()).drift.length === 0);
    await page.emulateMedia({ reducedMotion: null });

    const failed = checks.filter((c) => !c.cond);
    const ok = failed.length === 0 && errors.length === 0;
    console.log(`[${suite}] ${checks.length - failed.length}/${checks.length} ` +
      `sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
    for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label: suite, ok };
  } catch (err) {
    console.log(`[${suite}] ERROR: ${err.message}`);
    if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
    return { label: suite, ok: false };
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

    const topologies = await readProjection("topologies.json");
    const crops = await readProjection("crops.json");
    const realResults = await readProjection("results.json");
    if (!topologies) {
      console.log(`
note: no topologies.json under ${DATA_REPO} — the topology ` +
        `page's REAL tier is skipped (build it, or pass --repo <main checkout>)`);
    }

    // Every suite, keyed by the label it PRINTS — which is what `--only`
    // matches on, so a filter can be copied straight off a failing line.
    // `testRespine` prints `${label} respine`, hence the key spelled out here
    // rather than the argument it is passed.
    const SUITES = [
      ["suite file://", () =>
        runSuite(browser, pathToFileURL(join(APP_DIR, "test.html")).href, "suite file://")],
      ["suite http", () => runSuite(browser, `${baseUrl}/test.html`, "suite http")],
      ["index redirect file://", () => testIndexRedirects(browser, fileBase, "index redirect file://")],
      ["index redirect http", () => testIndexRedirects(browser, baseUrl, "index redirect http")],
      ["app file://", () => testTheApp(browser, fileBase, "app file://")],
      ["app http", () => testTheApp(browser, baseUrl, "app http")],
      ["topology file://", () =>
        testTheTopologyPage(browser, fileBase, "topology file://", topologies, crops)],
      ["topology http", () =>
        testTheTopologyPage(browser, baseUrl, "topology http", topologies, crops)],
      ["deep links file://", () => testDeepLinks(browser, fileBase, "deep links file://")],
      ["deep links http", () => testDeepLinks(browser, baseUrl, "deep links http")],
      ["topology height budget", () =>
        testHeightBudget(browser, fileBase, "topology height budget", topologies, crops)],
      ["topology file:// respine", () =>
        testRespine(browser, fileBase, "topology file://", topologies, crops)],
      ["render crash shows the banner", () =>
        testRenderCrash(browser, fileBase, "render crash shows the banner")],
      ["real render path (non-mock)", () => testRealDataRenderPath(
        browser, fileBase, "real render path (non-mock)", topologies, realResults, crops)],
      ["served mode (repo-root static server)", () => testServedModeBoot(
        browser, repoRootBaseUrl, "served mode (repo-root static server)", topologies,
        stopRepoRootServer)],
      ["hosted origin with nothing published", () => testHostedUnpublished(browser, topologies)],
      ["rebuild affordance (stub sibling mount)", () => testRebuildAffordance(browser)],
      ["annotate flyout (repo-root mount + file:// degradation)", () =>
        testAnnotateFlyout(browser, fileBase)],
      ["annotate hosted posture (no folder grant off-machine)", () =>
        testAnnotateHostedPosture(browser)],
    ];
    const chosen = ONLY === null
      ? SUITES : SUITES.filter(([suiteLabel]) => suiteLabel.includes(ONLY));
    if (!chosen.length) {
      console.log(`--only ${JSON.stringify(ONLY)} matches no suite. The suites are:` +
        SUITES.map(([suiteLabel]) => "\n  " + suiteLabel).join(""));
      process.exitCode = 1;
      return;
    }
    if (ONLY !== null) {
      console.log(`--only ${JSON.stringify(ONLY)}: running ${chosen.length} of ` +
        `${SUITES.length} suites — THIS IS NOT A FULL RUN\n`);
    }

    const results = [];
    for (const [, runSuiteFn] of chosen) results.push(await runSuiteFn());

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} browser ` +
      `checks passed${ONLY === null ? "" : ` (--only ${JSON.stringify(ONLY)})`}`);
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
