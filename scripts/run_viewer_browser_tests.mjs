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
//      viewer into this same page, the elements-table mode reached by
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
// one suite that owns the guard — a full run of every suite per mutation would
// have made that tier too slow to be run. A filtered run says so in a banner
// above its first suite AND on its own summary line: a partial pass must never be
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

// --- how a suite reports, on BOTH paths out of it --------------------------
//
// Every suite here is one long `try` that collects `checks` (a name and a
// condition per sub-check) plus `errors` (uncaught page errors), and ends by
// printing the count and then the NAME of each sub-check that failed. Those
// names are the whole machine-readable surface of this runner: the
// mutation-witness tier parses them and nothing else out of this output
// (`scripts/run_mutation_witness_tests.mjs`, `BROWSER_FAIL`), because an
// entry there claims one named guard reddens and not that the suite went red.
//
// WHICH IS WHY THE ERROR PATH PRINTS THEM TOO, and that is what this pair of
// functions exists to stop anyone from forgetting again. Fourteen copies of
// the reporting block used to sit at the bottom of fourteen suites, each
// beside a `catch` that printed `err.message` and DISCARDED every failure
// already collected. So a mutation that reddens a check early and then breaks
// a hover fifty lines further down reported as "the tier went red, but not on
// the declared check" — the tier's way of saying *I cannot attribute this* —
// when in fact the declared check had been reached, had failed, and its name
// was sitting in an array nobody printed. Three sessions filed that as three
// separate defects on 2026-09-15 (ISSUE_20260915_card_layout_out_of_flow_
// mutation_reddens_an_earlier_check_so_it_is_never_witnessed and its two
// siblings).
//
// The two results are independent and both get said: the sub-checks that ran
// are real findings, and the abort is a second finding on top of them. What
// is NOT done here is teaching anything to treat a bare abort as a named red
// — a suite that dies before its first `push` still prints no names, and the
// mutation tier still reports that as unattributable, which is correct.
function printCollectedFailures(failed, errors) {
  for (const f of failed) console.log(`    FAIL sub-check: ${f.name}`);
  if (errors.length) console.log(`    page errors: ${errors.join(" | ")}`);
}

/** The normal way out: every sub-check ran. */
function reportSuite(label, checks, errors = []) {
  const failed = checks.filter((c) => !c.cond);
  const ok = failed.length === 0 && errors.length === 0;
  console.log(`[${label}] ${checks.length - failed.length}/${checks.length} sub-checks passed: ${ok ? "PASS" : "FAIL"}`);
  printCollectedFailures(failed, errors);
  return { label, ok };
}

/**
 * The other way out: something threw, so the sub-checks BELOW the throw never
 * ran. The ones above it did, and are reported before the exception, because
 * a named failure is the specific result and a 30-second hover timeout with a
 * 60-line call log is the noisy one.
 */
function reportAbortedSuite(label, checks, errors, err) {
  const failed = checks.filter((c) => !c.cond);
  console.log(`[${label}] ABORTED after ${checks.length} sub-checks, ` +
    `${failed.length} of them already FAILED`);
  printCollectedFailures(failed, errors);
  console.log(`[${label}] ERROR: ${err.message}`);
  return { label, ok: false };
}

// The banner's whole deliverable (viewer_rebuild_affordance, 2026-09-10): no
// rebuild command ever renders again, in either mode, and a live endpoint
// drives a real click through to a reload -- and, since
// viewer_popover_clamp_and_rebuild_terminal_state, that only the endpoint's
// own completion state counts as one. Four servers, one scenario each — a
// fresh stub per scenario keeps the busy/terminal state machine from leaking
// across them the way one shared server's mutable `busy` flag would.
async function testRebuildAffordance(browser, label) {
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
      // `.banner__source` exists only in a connected banner's own paint, which
      // is the same paint provenance() would have put `.banner__stale` in.
      // It was `.banner__built` until 2026-09-16, when that line moved INSIDE
      // this fold -- and a `{ state: "visible" }` wait on a node inside a
      // closed <details> waits forever.
      await page.waitForSelector("details.banner__source", { timeout: 15000 });
      push("fresh (matching) provenance shows no stale banner",
        await page.locator(".banner__stale").count() === 0);
    });

    return reportSuite(label, checks);
  } catch (err) {
    return reportAbortedSuite(label, checks, [], err);
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

// --- the elements table, reached through the ONE nav tree ------------------
//
// Reached by clicking a stack leaf (VA.looseStacks) in the nav, not by its own
// page any more — index.html is a redirect stub (checked separately,
// testIndexRedirects). Every assertion below is unchanged from the retired
// stack viewer's own browser test: views/stack.js and views/detail.js did not
// move, only what boots them did.
//
// A LEAF is the only way in now (viewer_nav_wedge_and_classic_retirement,
// 2026-09-15). This suite used to enter through `demo_joint`, the stack the
// demo mechanism re-expresses, which the nav nested under its topology behind
// a "classic view" chip; that row is gone, because the graph states everything
// the table did. So the way in is the leaf the fixture carries for exactly this
// — `demo_joint_standalone`, the same rich stack under an id no crop_key names,
// which is the shape the real repo is in: two thermal-fit stacks with no
// topology, and every other stack re-expressed as one.
async function testTheApp(browser, url, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  try {
    await page.goto(url + "/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="stack"]', { timeout: 15000 });

    // One stack row, not two: the fixture holds `demo_joint` (which the demo
    // mechanism re-expresses) and `demo_joint_standalone` (which nothing does),
    // and only the second is an entry. One system, one entry.
    push("the nav lists exactly the stacks no topology re-expresses",
      await page.locator('[data-nav-kind="stack"]').count() === 1);
    push("and says nothing about a classic view anywhere on the page",
      !(await page.evaluate(() =>
        document.body.textContent.toLowerCase().includes("classic"))));

    // Switch from the default topology mode into stack mode — a real click,
    // which is the one thing this test tier exists to exercise.
    await page.locator(navRow("stack", "demo_joint_standalone")).click();
    await page.waitForSelector("tr.el-row", { timeout: 15000 });
    push("picking the stack marks its nav row and hides the toolbar",
      await page.locator(navRow("stack", "demo_joint_standalone")).evaluate(
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

    // The loud export/identity fact is the one thing the compact row still
    // carries about the export — everything else moved to the right pane,
    // reached by clicking the row (deliverables 2 and 3 of viewer_consolidation).
    //
    // Since flyout_resize_annotator_filter_and_deselect it rides on the row's
    // ONE consolidated alert badge rather than a filled all-caps chip of its
    // own (Jeff: "roll all the alert badges into one single alert badge"), and
    // BOTH halves of that trade are CSS claims only a layout engine can check:
    // the badge has to be quieter than the filled chip it replaced (no fill)
    // and still findable (a real border, in the attention colour, not the
    // neutral chip outline).
    const badge = page.locator("#stackview .chip--alert");
    const badgeStyle = await badge.first().evaluate((n) => {
      const cs = getComputedStyle(n);
      const neighbour = getComputedStyle(n.parentNode.querySelector(".chip--kind")
        || n.parentNode.firstElementChild);
      return {
        background: cs.backgroundColor,
        border: cs.borderTopColor,
        weight: cs.fontWeight,
        neighbourBorder: neighbour.borderTopColor,
      };
    });
    push("the row's alert badge is NOT filled — the loudness Jeff named is gone",
      badgeStyle.background === "rgba(0, 0, 0, 0)" ||
      badgeStyle.background === "transparent");
    push("...but it is still findable: a real border, and not the neutral one " +
      "its neighbour chip wears",
      badgeStyle.border && badgeStyle.border !== "rgba(0, 0, 0, 0)" &&
      badgeStyle.border !== badgeStyle.neighbourBorder);

    // ONE row in this fixture has something to admit and it has TWO things —
    // the washer is zero-width AND unestablished, which is exactly the case
    // the old presentation showed as two filled all-caps chips side by side.
    // The other three rows show NOTHING, which is the standing rule, so the
    // count is the assertion.
    push("one badge on the one row that has something to admit, and none on " +
      "the other three",
      await badge.count() === 1 &&
      await page.locator("#stackview tr.el-row").count() === 4);

    // The words, on a REAL hover: this is the half a DOM shim is blind to, and
    // the whole bargain of the consolidation is that nothing was deleted. The
    // card also carries the `why`, which was only ever a native tooltip on the
    // chip this badge replaced — so folding the chip away REVEALED a sentence
    // rather than hiding one.
    const washerBadge = page.locator("#stackview tr.el-row").nth(1)
      .locator(".chip--alert");
    await washerBadge.hover();
    await page.waitForSelector(".hovercard--alerts", { timeout: 5000 });
    const alertCard = await page.locator(".hovercard--alerts").textContent();
    push("hovering the badge opens a card naming the alert in the words the " +
      "row used to shout",
      /FILE NOT IDENTIFIED/.test(alertCard));
    push("...and the card carries the why, which the old chip only had as a " +
      "native tooltip",
      /none hashes to the one/.test(alertCard));
    push("the card names WHICH row it belongs to — the badge is one glyph, so " +
      "the card is the first place a reader can tell",
      /washer/i.test(alertCard));
    push("...and the row's OTHER alert too: two chips became one badge and one " +
      "card with two items, which is the whole trade",
      /no tolerance recorded/.test(alertCard) &&
      await page.locator(".hovercard--alerts li.hovercard__alert").count() === 2);
    await page.keyboard.press("Escape");

    // Select the plate (established export, and the one fixture crop that
    // resolves) — a real click, which the DOM shim cannot exercise, and the
    // crop image is fetched asynchronously on selection, not just on hover.
    await selectRow(0);
    push("the selected row is visibly marked",
      await page.locator("tr.el-row--selected").count() === 1);
    await page.waitForSelector(".detail__crop-img", { timeout: 5000 });
    push("an established export names its file and its checksum in the right pane",
      /Read from 215197\.pdf/.test(await page.locator(".el-export--established").textContent()) &&
      /pinned to this exact file, by checksum/
        .test(await page.locator(".el-export--established").textContent()));
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
      /identified by its filename/.test(await identity.textContent()));
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
    // The REFERENCE, which is what a reader came for -- and not the absolute
    // workstation path, which used to print beneath it and went on 2026-09-15
    // ("full workstation file paths -- never rendered when the link works").
    push("the popover names the document and sheet",
      /215197/.test(await page.locator(".croppop__head").textContent()));
    push("the popover renders no workstation path",
      await page.locator(".croppop__path").count() === 0 &&
      !/C:[\/]/.test(await page.locator(".croppop").textContent()));
    // The matching provenance is still said, behind one small disclosure --
    // closed by default, which is the whole point of folding it.
    push("the crop's matching provenance is folded away, not deleted",
      await page.locator(".croppop details.provfold").count() === 1 &&
      !(await page.locator(".croppop details.provfold").evaluate((n) => n.open)));
    push("opening the fold shows how the crop was matched", await (async () => {
      await page.locator(".croppop details.provfold summary").click();
      return /read from the export this citation names/
        .test(await page.locator(".croppop details.provfold").textContent());
    })());
    // ORIGIN-DEPENDENT, and that is the feature: the only click-through this
    // crop has is the PDF (no drawing-checker run is behind it), and Chrome
    // refuses a `file:` navigation from an http(s) page -- so on a served
    // origin there is nothing to offer and nothing is rendered, rather than a
    // control that does nothing (VA.originOpensLocalFiles). Measured
    // 2026-09-15; this check asserted >= 1 unconditionally and passed only
    // under file://.
    const opensLocalFiles = await page.evaluate(
      () => window.ViewerApp.originOpensLocalFiles(window.location.protocol));
    push(`the popover offers a click-through where this origin can follow one ` +
      `(${opensLocalFiles ? "file://, so yes" : "served, so nothing at all"})`,
      (await page.locator(".croppop__link").count() >= 1) === opensLocalFiles);

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

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
// ...and a FOURTH, for the ROOM CAP's own tripwire: the cap can only be
// observed where the card wants more height than either side of its trigger
// can give it, and on 2026-09-15 the card stopped being tall enough for
// CARD_LAYOUT_VIEWPORT to produce that. The edge card lost about 60px that day
// (viewer_component_names_and_reference_copy): the crop-key line, the absolute
// path and the open provenance line all left it, the last of the three into a
// closed disclosure. Measured on `?mock=1` for base_thickness' grid trigger,
// 1600 wide, card content 442px throughout:
//
//   height 700 -> trigger at 459.5, room above 443.5: the card FITS. No cap,
//                 nothing scrolls, and the contracts below are vacuous.
//   height 440 -> trigger at 413.5, room above 397.5: capped to 397.5 with
//                 442px of content inside it. 44px of margin, which is what
//                 keeps this from going vacuous again on a one-line change.
//
// Shortening the window rather than lengthening the card is the remedy the
// tripwire's own comment names, and it is the honest one: the card is shorter
// because it says less, and it says less on purpose.
const CARD_CAP_VIEWPORT = { width: 1600, height: 440 };
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
// Dismiss an open hover card deterministically: move the pointer OFF the
// trigger FIRST, then Escape. Since viewer_dag_hover_cards the rail marks
// card too, and a mark's click re-renders the pane -- a fresh element
// landing under a stationary pointer fires `mouseenter` again, so an Escape
// sent while the pointer still sits on the mark can be undone by the very
// next paint. (4, 4) is the topbar: no trigger of any kind lives there.
async function dismissCard(page) {
  await page.mouse.move(4, 4);
  await page.keyboard.press("Escape");
}

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

// Hover a trigger WITHOUT asking playwright whether anything sits on top of it.
//
// `locator.hover()` refuses to act on an OCCLUDED element: it re-checks the hit
// target, finds something else under the point, and retries until it times out.
// That is the behaviour you want almost everywhere, and it is exactly wrong for
// the out-of-flow contract below -- because the mutation that contract exists to
// catch (`.croppop` back on `position: absolute`,
// `scripts/mutation_witnesses.json`) places the open card ON TOP OF the trigger
// it was opened from. The first hover opens the card, the card occludes the
// trigger, and every retry from then on sees the occlusion and backs off. So the
// suite died on a 30-second timeout ONE sub-check before the check that names
// the defect, the mutation-witness tier saw a red it could not attribute, and
// `card-layout-out-of-flow` read NOT WITNESSED for four days -- filed three
// times over on 2026-09-15 (ISSUE_20260915_card_layout_out_of_flow_mutation_
// reddens_an_earlier_check_so_it_is_never_witnessed and its two siblings). A
// card intercepting its own trigger is the DEFECT, so the harness must not be
// the thing that refuses to look at it.
//
// `page.mouse.move` performs no actionability check at all -- the same escape
// hatch hoverRailBar takes for a different playwright limitation, with the same
// one-round-trip discipline for reading the rect. What is NOT given up:
//
//   * it will not aim at a point outside the window, which would hover whatever
//     is really there. It scrolls the element into view first if it has to --
//     `locator.hover()` did that too, and silently, and it DOES have to here.
//     Re-measured in review, 2026-09-16, and the axis is not the one this note
//     first named: at CARD_SCROLL_VIEWPORT the trigger's rect comes back
//     `{top: 243.5, bottom: 269.5, left: 1502, right: 1604}` against
//     `innerWidth/innerHeight` 1600/560 -- vertically well inside the window
//     and **4px off its RIGHT edge**, because the detail pane scrolls
//     horizontally. So `scrollIntoView` moves the PANE (left 1502 -> 1066) and
//     leaves `window.scrollY` at 175 before and 175 after: no document scroll
//     is given away, and the reading IS taken at the scroll the tripwire above
//     asserts. It returns that scroll anyway, so the caller can pin the
//     position it measured at rather than assume it -- which is what the
//     second tripwire below spends it on.
//   * it still proves the pointer landed: the rect and the in-window test are
//     read in ONE page task (a locator resolved and then evaluated against is
//     two, and under file:// a late render between them hands back a detached
//     node -- hoverRailBar's own note), and the caller waits on the card.
async function hoverIgnoringOcclusion(page, selector) {
  const at = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || !el.isConnected) return null;
    const box = () => {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return null;
      const inWindow = b.top >= 0 && b.left >= 0 &&
        b.bottom <= window.innerHeight && b.right <= window.innerWidth;
      return inWindow ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : null;
    };
    let p = box();
    if (!p) {
      // "nearest", not hoverRailBar's "center": the MINIMUM scroll that gets
      // the trigger into the window, which is what locator.hover() did and
      // what keeps the document as scrolled as it can be. In today's layout it
      // is `inline` that does the work (the trigger is off the pane's right
      // edge, not above the window -- see the note above); `block: "nearest"`
      // is the same discipline held on the axis the reading below depends on,
      // so a layout change cannot start giving that scroll away silently.
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      p = box();
    }
    return p === null ? null : { ...p, scrollY: window.scrollY };
  }, selector);
  if (!at) {
    throw new Error(`hoverIgnoringOcclusion: ${selector} resolves to no element ` +
      "with a box inside the window, even after scrolling to it");
  }
  await page.mouse.move(at.x, at.y);
  return at;
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

  // The highlight overlay's COORDINATE FRAME, on a card, in a real browser --
  // the one thing no other tier can look at.
  //
  // views/crop.js's `highlightBox` writes `left`/`top`/`width`/`height` as
  // percentages of `.cropfig`, so every box on a crop is only ever as right as
  // the assumption that the figure's box IS the picture. A hover card caps its
  // crop by WIDTH for exactly that reason (style.css, `.hovercard .cropblock
  // .cropfig`); the `max-height: 260px; object-fit: contain` rule it replaced
  // capped the height and let the picture inset itself inside an element that
  // kept the full width, which leaves every highlight pointing into the
  // letterbox rather than at the cell it names. The fast tier has no geometry
  // at all, and nothing else in this file opens a card on a crop that carries
  // a highlight, so the revert is invisible everywhere else.
  const cropOverlay = () => page.evaluate(() => {
    const fig = document.querySelector(".hovercard .cropblock .cropfig");
    const img = fig && fig.querySelector("img.croppop__img");
    if (!fig || !img) return null;
    const box = (r) => ({ left: r.left, top: r.top, right: r.right,
                          bottom: r.bottom, width: r.width, height: r.height });
    return {
      img: box(img.getBoundingClientRect()),
      // The crop's own width/height, as the figure carries it for the cap's
      // sake -- read from the custom property rather than from the PNG, so
      // the measurement does not wait on a decode.
      ratio: parseFloat(getComputedStyle(fig).getPropertyValue("--crop-ratio")),
      // The width the figure would have taken with no cap at all. Uncapped,
      // the picture would be this over the ratio tall; if that is not more
      // than the 260px cap then the cap did nothing here and the contract
      // below is vacuous.
      blockWidth: fig.parentElement.getBoundingClientRect().width,
      highlights: Array.from(fig.querySelectorAll(".crophl"))
        .map((n) => box(n.getBoundingClientRect())),
    };
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

    // --- the preview pane's DEFAULT, and a divider a reader can find --------
    //
    // (deliverable 5, viewer_hover_deslop_and_banner_purge, 2026-09-16.)
    // Asserted here, early, and asserted at all because the whole deliverable
    // is three CSS declarations: reverting `.tv .detail`'s width to 430px and
    // putting `.tv__divider::before` back to `transparent` undid it in full
    // with every tier still green (review, measured). A deliverable nothing
    // would notice being reverted is a deliverable with no pin.
    //
    // It must run BEFORE anything drags the pane: a remembered width is
    // written as an inline style over the stylesheet's rule, and this is a
    // reading of the RULE.
    const paneAtRest = await page.evaluate(() => {
      const detail = document.querySelector("#detail");
      const divider = document.querySelector("#detail-divider");
      let remembered = null;
      try {
        remembered = window.localStorage.getItem(window.ViewerApp.PANE_WIDTH_KEY);
      } catch { remembered = null; }
      return {
        width: detail.getBoundingClientRect().width,
        inlineWidth: detail.style.width,
        remembered,
        hairline: getComputedStyle(divider, "::before").backgroundColor,
        grip: getComputedStyle(divider, "::after").backgroundImage,
        gripPosition: getComputedStyle(divider, "::after").position,
        max: window.ViewerApp.TOPO_PANE_WIDTH.max,
      };
    });
    // The tripwire, before what it certifies: with a width remembered or an
    // inline style set, the number below would be a reading of a drag from
    // some earlier check rather than of the stylesheet.
    push("nothing is remembered and nothing is inline, so the pane's width " +
      "here IS the stylesheet's default",
      paneAtRest.remembered === null && paneAtRest.inlineWidth === "");
    push("the preview pane's default is the widened 560px, not the 430px " +
      "Jeff called too narrow",
      Math.abs(paneAtRest.width - 560) <= 1);
    // The divider announces itself at rest. Both halves: the seam, which was
    // `transparent` until hover and so invisible to anyone who did not already
    // know it was there, and the grip mark that says the seam is a HANDLE.
    push("the pane's divider is visible at rest, not only under the pointer",
      paneAtRest.hairline !== "rgba(0, 0, 0, 0)" &&
      paneAtRest.hairline !== "transparent");
    push("...and carries a grip mark, held in the viewport by sticky so a " +
      "long study does not scroll it away",
      paneAtRest.grip !== "none" && paneAtRest.gripPosition === "sticky");

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
    await dismissCard(page);

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
    await page.setViewportSize(CARD_CAP_VIEWPORT);
    await page.waitForTimeout(450);
    const beforeCard = await cardLayout();
    // hover, not click: a click also SELECTS the row (its normal job), and the
    // detail pane repopulating is legitimate layout movement that would drown
    // the measurement below — the card itself is what must move nothing.
    await page.locator(CARD_TRIGGER).hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    push("the thumbnail trigger opens the edge hover card with the crop body",
      await page.locator(".croppop").isVisible() &&
      // The document, from the card's ONE where-line. It came off
      // `.croppop__head` -- the crop block's own caption -- until 2026-09-16,
      // when a card stopped restating its document over the picture
      // (viewer_hover_deslop_and_banner_purge, deliverable 2).
      /cited at: .*215197/.test(await page.locator(".hovercard__cited").textContent()) &&
      await page.locator(".hovercard .cropblock .croppop__head").count() === 0 &&
      // The part in a reader's words. This asserted the crop KEY here until
      // 2026-09-15 ("from stack `demo_joint`, element `plate`") -- which of the
      // crop index's two key spaces answered, in the ids of a stack and an
      // element, above a picture that names its own document.
      /a dimension of base plate/.test(await page.locator(".croppop").textContent()) &&
      !/from stack `demo_joint`/.test(await page.locator(".croppop").textContent()));
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

    // --- the highlight overlay points at the crop, not past it -------------
    //
    // Same open card, measured rather than read. Two tripwires first, because
    // this contract is only falsifiable where a box exists to mis-place and
    // where the width cap actually bit.
    const overlay = await cropOverlay();
    push("the open card's crop carries a highlight box to measure, and the " +
      "figure knows the crop's own shape",
      overlay !== null && overlay.highlights.length >= 1 &&
      overlay.ratio > 0);
    push("the card's 260px crop cap really bites here — uncapped this crop " +
      "would be taller than the cap",
      overlay.blockWidth / overlay.ratio > 260 &&
      Math.abs(overlay.img.height - 260) <= 1.5);
    // The letterbox, stated as the thing a reader would see: the element the
    // overlay is positioned against still has the crop's own proportions, so
    // the percentages land on the picture. `object-fit: contain` under a
    // height cap gives the element the block's full width and the cap's
    // height, and this ratio is the first thing that stops being true.
    push("the crop's element IS the picture — its box still carries the " +
      "crop's own aspect ratio, so a percentage lands where it reads",
      Math.abs(overlay.img.width / overlay.img.height - overlay.ratio) <
        overlay.ratio * 0.02);
    push("every highlight box on the card lands inside the crop image it " +
      "points into",
      overlay.highlights.every((h) =>
        h.left >= overlay.img.left - 0.5 && h.right <= overlay.img.right + 0.5 &&
        h.top >= overlay.img.top - 0.5 && h.bottom <= overlay.img.bottom + 0.5));

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
    await dismissCard(page);
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
    // NOT locator.hover(): hoverIgnoringOcclusion's own note says why at
    // length -- under the mutation this contract is named for, the card lands
    // ON its own trigger, and playwright's hover refuses to act on an occluded
    // element and retries to its 30-second timeout instead. The measurement
    // below is the thing that has to be REACHED.
    const aimed = await hoverIgnoringOcclusion(page, CARD_TRIGGER);
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    // ...and the second half of the tripwire above, on the scroll the reading
    // is actually taken at rather than the one it was set up at. Getting the
    // trigger into the window moves the page (it sits above the window once the
    // document is scrolled to its end), and a card opened back at the top would
    // be measured in the one configuration where `fixed` and `absolute` agree.
    const openedAt = await page.evaluate(() => window.scrollY);
    push("the card was opened with the document still scrolled, and opening " +
      "it moved the page by nothing", aimed.scrollY >= 24 && openedAt === aimed.scrollY);
    const scrolledCard = await cardLayout();
    const gapBelow = scrolledCard.cardTop - scrolledCard.triggerBottom;
    const gapAbove = scrolledCard.triggerTop - scrolledCard.cardBottom;
    push("an open card is placed in the WINDOW's frame, not the document's — " +
      "it still sits against its trigger with the page scrolled",
      Math.abs(gapBelow - 8) < 1.5 || Math.abs(gapAbove - 8) < 1.5);
    await dismissCard(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.setViewportSize(TOPO_VIEWPORT);

    // The citation card, from the row's confidence chip (the same model the
    // stack table's chip opens): the full reference — where-ref, export
    // block — as hover chrome.
    await page.locator("tr.tvrow[data-id='base_thickness'] span.cardtrig").hover();
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    const citationText = await page.locator(".croppop").textContent();
    push("the confidence chip opens the citation card with the file it was read from",
      /215197/.test(citationText) && /Read from 215197\.pdf/.test(citationText));
    await page.keyboard.press("Escape");

    // The component card, from the merged component cell: part identity plus
    // the thumbnail derived from its own row's resolved crop.
    await page.locator("td.tvcell--component.cardtrig").first().hover();
    await page.waitForSelector(".hovercard--component", { state: "visible", timeout: 5000 });
    const componentText = await page.locator(".croppop").textContent();
    push("the component cell opens the component card with the derived crop line",
      /base plate/.test(componentText) &&
      // No backticks: a row's display name is user copy, not an id
      // (viewer_hover_deslop_and_banner_purge, deliverable 2).
      /crop of its base plate thickness annotation/.test(componentText) &&
      !componentText.includes("`"));
    push("the component card deep-links into the annotator isolating the part",
      /isolate=base/.test(await page.locator(".hovercard--component a")
        .last().getAttribute("href")));

    // --- ONE fold per card, closed (deliverable 3, 2026-09-16) --------------
    //
    // Every long-form thing a card carries -- the record's note in full, the
    // export/identity narrative, each crop's matching provenance -- is inside
    // ONE <details>, and it is shut. Counted rather than read: the defect this
    // replaces was TWO folds on one card (the crop block opened its own), and
    // a substring check on the summary word cannot see a second one.
    push("a card carries exactly one disclosure, closed, wearing the same " +
      "word the banner's fold wears",
      await page.locator(".hovercard details").count() === 1 &&
      await page.locator(".hovercard details.hovercard__source").count() === 1 &&
      !(await page.locator(".hovercard details").first().evaluate((n) => n.open)) &&
      /Data source/.test(await page.locator(
        ".hovercard details.hovercard__source > summary").textContent()));
    // ...and the note itself: the lead sentence in the open, the whole of it
    // inside the fold. The fixture's `base` part has a multi-sentence note.
    push("a long note shows its lead sentence in the open and the whole of " +
      "it in the fold", await (async () => {
        const lead = await page.locator(".hovercard .hovercard__note").count()
          ? (await page.locator(".hovercard .hovercard__note").textContent()).trim()
          : null;
        const full = await page.locator(
          ".hovercard .hovercard__source .hovercard__notefull").count()
          ? (await page.locator(
              ".hovercard .hovercard__source .hovercard__notefull").textContent()).trim()
          : null;
        if (lead === null) return full === null;   // a card with no note at all
        return full === null
          ? true                                   // a one-sentence note: open, once
          : full.startsWith(lead) && full.length > lead.length;
      })());

    // --- reaching an open card with the mouse (deliverable 4) ---------------
    //
    // Jeff: "sometimes the preview pop-up disappears when you try to move the
    // mouse over it, you have to do it just right." Nothing closes a card on
    // mouseleave; what happened is that a trigger crossed EN ROUTE re-pointed
    // the shared #croppop node at itself. This is the only tier that can see
    // it: the corridor is computed from real mousemove coordinates.
    //
    // EVERY move below is a real `page.mouse.move`, and every `mouseenter` is
    // the browser's own. The first version of this block dispatched the
    // competing `mouseenter` synthetically while the pointer sat elsewhere,
    // and that could not reach the EXPIRY path at all — the expiry only
    // honours a held trigger the pointer is still ON, so the one case the
    // design promises to handle ("a card that arrives a quarter-second late,
    // never one that never arrives") went unmeasured and was broken. Review
    // measured 4.4 seconds and counting, 2026-09-16.
    //
    // THE GEOMETRY, and it is chosen rather than incidental: the citation card
    // opens from the row's confidence chip and is placed BELOW that row, wide
    // enough to sit under the row's own crop trigger. So the crop trigger is
    // ~20px directly above the open card — a pointer landing on it from above
    // is aiming straight into the card, and a pointer landing on it from the
    // RIGHT (level with the row) is not. Two approaches, one trigger, no
    // synthetic events. The tripwire below asserts that layout before anything
    // stands on it.
    const intentMs = await page.evaluate(() => window.ViewerApp.HOVER_INTENT_MS);
    const CHIP_TRIGGER = "tr.tvrow[data-id='base_thickness'] span.cardtrig";

    // Walk the pointer to `[x, y]` along a straight line from `[fromX, fromY]`,
    // STOPPING JUST SHORT, letting the page drain, and only then taking the
    // final step that crosses into the target.
    //
    // Every part of that is load-bearing, and the first draft of this block --
    // one `mouse.move(..., { steps: 12 })` -- was flaky for the want of it. Two
    // browser facts compound:
    //
    //   * `mouseenter` is dispatched on the element being entered BEFORE the
    //     `mousemove` at the new coordinates, so the corridor is always read
    //     from the two positions the page had processed BEFORE the crossing;
    //   * Chrome COALESCES mousemove events under load. A stepped move whose
    //     interpolated events are coalesced can leave the page holding only the
    //     position it started from, and the corridor is then computed off a
    //     vector pointing wherever the pointer came from — which on a loaded
    //     machine is a different answer from the same code on an idle one.
    //
    // Measured 2026-09-16: green five runs out of five in isolation, red inside
    // a full mutation-witness run, which is the worst shape a guard can have.
    // Three awaited moves plus a drain make the two positions either side of
    // the crossing deterministic: both already PROCESSED by the page, both on
    // the approach line, and the nearer one a short hop from the target.
    const approachFrom = async (fromX, fromY, x, y) => {
      for (const t of [0.4, 0.7, 0.9]) {
        await page.mouse.move(Math.round(fromX + (x - fromX) * t),
                              Math.round(fromY + (y - fromY) * t));
      }
      await page.waitForTimeout(80);
      await page.mouse.move(x, y);
    };
    const boxes = () => page.evaluate((sel) => {
      const pop = document.querySelector("#croppop");
      const open = pop && getComputedStyle(pop).display !== "none";
      const card = open ? pop.getBoundingClientRect() : null;
      const trig = document.querySelector(sel).getBoundingClientRect();
      return {
        card: card ? { left: card.left, top: card.top, right: card.right,
                       bottom: card.bottom } : null,
        trigger: { cx: trig.left + trig.width / 2, cy: trig.top + trig.height / 2,
                   top: trig.top, bottom: trig.bottom, right: trig.right },
      };
    }, CARD_TRIGGER);

    await dismissCard(page);
    await page.locator(CHIP_TRIGGER).hover();
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    // A card paints immediately and REPAINTS as each of its PNGs resolves, and
    // a repaint can re-place it. Settling first keeps the box the tripwire
    // reads and the box the approach aims at the same box.
    await page.waitForTimeout(250);
    const lay = await boxes();
    push("the citation card opens BELOW its row and under the row's own crop " +
      "trigger — the layout the two approaches below are only distinguishable " +
      "in",
      lay.card !== null && lay.card.top > lay.trigger.bottom &&
      lay.card.top - lay.trigger.bottom < 40 &&
      lay.trigger.cx > lay.card.left && lay.trigger.cx < lay.card.right);

    // APPROACH 1 — down onto the crop trigger, which aims into the card.
    await approachFrom(lay.trigger.cx, lay.trigger.top - 60,
                       lay.trigger.cx, lay.trigger.cy);
    push("a trigger crossed while the pointer is heading for the open card " +
      "does not steal it",
      await page.locator(".hovercard--citation").count() === 1 &&
      await page.locator(".hovercard--edge").count() === 0);

    // THE EXPIRY. The pointer stops on that trigger and never reaches the
    // card — a deliberate hover, not a crossing — so the held open has to
    // happen after all. This is the promise the code makes in as many words
    // ("never one that never arrives"); without this check it is a claim.
    await page.waitForTimeout(intentMs + 250);
    push("a held trigger the pointer STOPS on opens after the grace period — " +
      "a deferral is a delay, never a card that never arrives",
      await page.locator(".hovercard--edge").count() === 1);

    // ARRIVAL WINS. Same approach, but this time the pointer keeps going and
    // reaches the card: the trigger it crossed must never open, then or later.
    await dismissCard(page);
    await page.locator(CHIP_TRIGGER).hover();
    await page.waitForSelector(".hovercard--citation", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(250);
    const lay2 = await boxes();
    await approachFrom(lay2.trigger.cx, lay2.trigger.top - 60,
                       lay2.trigger.cx, lay2.trigger.cy);
    await page.mouse.move(lay2.trigger.cx, lay2.card.top + 60, { steps: 6 });
    await page.waitForTimeout(intentMs + 250);
    push("...and it does NOT open when the pointer arrives at the card " +
      "instead — the reader got where they were going",
      await page.locator(".hovercard--citation").count() === 1 &&
      await page.locator(".hovercard--edge").count() === 0 &&
      await page.locator(".croppop").isVisible());

    // APPROACH 2 — onto the same trigger from the RIGHT, level with its own
    // row, which aims past the card rather than into it. This is the reason
    // the guard is a corridor and not a blanket grace period: a reader who
    // wants the other card gets it at once, with no delay at all.
    await approachFrom(lay2.trigger.right + 300, lay2.trigger.cy,
                       lay2.trigger.cx, lay2.trigger.cy);
    push("a trigger hovered while the pointer is moving AWAY from the open " +
      "card opens at once — the guard is intent, not a dead period",
      await page.locator(".hovercard--edge").count() === 1);

    // --- an open card under the pointer is never re-placed (deliverable 4b) -
    //
    // `position()` flips a card above its trigger when it no longer fits
    // below, so a re-place that runs on every settling PNG can move the box
    // out from under a pointer already on its way to it.
    //
    // Observed as "did `position()` RUN", not as "did the answer change":
    // `position()` unconditionally rewrites `style.top`, so nudging that by a
    // few pixels and seeing whether it comes back is a direct reading of the
    // guard, in every layout, without needing a configuration where the
    // placement's answer happens to differ. The second half is the tripwire
    // for the first.
    //
    // FOUR pixels, and upward, for a reason that cost a red run: the guard
    // reads the card's box as it is AT THAT MOMENT, so a probe that shoves the
    // box far enough to slide out from under the pointer destroys its own
    // precondition and the guard correctly declines to hold. A nudge has to be
    // smaller than the pointer's clearance inside the card.
    const NUDGE = 4;
    const replaced = () => page.evaluate((nudge) => {
      const pop = document.querySelector("#croppop");
      const img = pop.querySelector("img");
      if (!img) return null;
      // Grow the box too, so the "it is exactly the height it was measured at"
      // guard is not the one doing the work. Downward, so the top does not
      // move and the pointer stays where it is relative to the box.
      const spacer = document.createElement("div");
      spacer.style.height = "300px";
      pop.appendChild(spacer);
      const nudged = Math.round(pop.getBoundingClientRect().top) - nudge;
      pop.style.top = nudged + "px";
      img.dispatchEvent(new Event("load"));
      const after = pop.style.top;
      spacer.remove();
      return { nudged: nudged + "px", top: after };
    }, NUDGE);

    await dismissCard(page);
    await page.locator(CARD_TRIGGER).hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(250);
    const held = await boxes();
    await page.mouse.move(held.trigger.cx, held.card.top + 60);
    const onCard = await replaced();
    push("a card with the pointer on it is not re-placed when one of its " +
      "images settles", onCard !== null && onCard.top === onCard.nudged);
    // ...and it IS re-placed with the pointer away, or the check above passes
    // on a page where nothing would have re-placed it anyway.
    await page.mouse.move(8, 8);
    const offCard = await replaced();
    push("...and it IS re-placed with the pointer off it — the guard is the " +
      "pointer, not an inert code path",
      offCard !== null && offCard.top !== offCard.nudged);
    await dismissCard(page);

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
    await dismissCard(page);

    // The value-level pin: one edge, two triggers, ONE card. If the bar and
    // the grid ever rendered different content for the same dimension, a
    // reader would get two answers about one number.
    await page.locator("tr.tvrow[data-id='base_thickness'] button.crop-trigger")
      .hover();
    await page.waitForSelector(".hovercard--edge", { state: "visible", timeout: 5000 });
    const gridCardText = await page.locator(".croppop").textContent();
    push("the bar's card and the same edge's grid-trigger card are the same " +
      "card, character for character", barCardText === gridCardText);
    await dismissCard(page);

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
      // One line per thumbed side, naming the side and its drawing -- and it
      // is that side's ONE document statement, so the crop under it renders
      // no head of its own (deliverable 2, 2026-09-16). The line used to end
      // "— crop of its `base plate thickness` annotation", which dressed a
      // display name as an id.
      /base plate · drawing 215197/.test(nodeCardText) &&
      await page.locator(".hovercard--node .cropblock .croppop__head").count() === 0 &&
      await page.locator(".hovercard--node img.croppop__img").count() === 1);
    await dismissCard(page);

    // An internal dot says it is internal rather than leaving a one-sided
    // list to read as a missing side. `base_datum` is the fixture's one.
    await dotFor("base_datum").hover();
    await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 5000 });
    push("an internal dot says which part it is internal to",
      /internal to base plate/.test(await page.locator(".croppop").textContent()));
    await dismissCard(page);

    // A dot neither of whose sides cropped gets no image slot at all --
    // absent is absent. `arm_tip` is the arm's own dimension against a
    // clearance, and neither side resolves a crop.
    await dotFor("arm_tip").hover();
    await page.waitForSelector(".hovercard--node", { state: "visible", timeout: 5000 });
    const clearanceText = await page.locator(".croppop").textContent();
    push("a dot with no croppable side names the clearance and shows no image",
      /a clearance/.test(clearanceText) &&
      await page.locator(".hovercard--node img").count() === 0);
    await dismissCard(page);

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
    // box.
    //
    // CARD_CAP_VIEWPORT (440px tall), not CARD_LAYOUT_VIEWPORT (700), since
    // 2026-09-16 -- and the reason is a DELIVERABLE, not a flake. Folding a
    // card is long-form prose behind one disclosure took ~200px off every edge
    // card, so at 700px the card fit beside its bar on a served origin (where
    // there is also no "open the PDF" link to add a line) and this tripwire
    // went red for being unable to see the defect, which is exactly its job.
    // It is the same window the grid-side block above measures its own cap in.
    await page.setViewportSize(CARD_CAP_VIEWPORT);
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
    await dismissCard(page);
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

    // Study selection, through the nav tree. Since viewer_respine_whole_walk
    // this is an EMPHASIS change, not a view switch: the rails stay the whole
    // walk, the non-members dim, the leaders retarget onto the chain and the
    // grid drops to the chain's rows.
    const railShape = () => page.evaluate(() => ({
      dots: document.querySelectorAll("svg.tv__rails circle.rail__dot").length,
      bars: document.querySelectorAll("svg.tv__rails line.rail__bar").length,
      rails: document.querySelectorAll("svg.tv__rails line.rail").length,
      links: document.querySelectorAll("svg.tv__rails path.rail__link").length,
      leaders: [...document.querySelectorAll("svg.tv__rails path.rail__leaderhit")]
        .map((n) => n.getAttribute("data-leader-id")),
    }));
    const walkShape = await railShape();
    const walkRows = await page.locator("tr.tvrow").count();
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForSelector(".chip--total", { timeout: 5000 });
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    const litShape = await railShape();
    push("selecting a study hides nothing: every dot, bar, rail and link the " +
      "walk drew is still on screen",
      litShape.dots === walkShape.dots && litShape.bars === walkShape.bars &&
      litShape.rails === walkShape.rails && litShape.links === walkShape.links);
    if (litShape.dots !== walkShape.dots || litShape.bars !== walkShape.bars) {
      console.log("    walk " + JSON.stringify(walkShape) +
                  " vs study " + JSON.stringify(litShape));
    }
    push("the leaders point at the chain and at nothing else",
      litShape.leaders.length > 0 &&
      litShape.leaders.length < walkShape.leaders.length &&
      litShape.leaders.every((id) => walkShape.leaders.includes(id)));
    const chained = await correspondence();
    push("the emphasized walk corresponds too — every leader on its own dot " +
      "and its own seam", chained.drift.length === 0);
    if (chained.drift.length) console.log("    drift: " + chained.drift.slice(0, 5).join(" | "));
    push("the grid is exactly the chain, and shorter than the walk's table",
      chained.rows === 3 && chained.rows < walkRows);
    const dimmedBar = await page.locator("svg.tv__rails line.rail__bar--off")
      .first().evaluate((n) => parseFloat(getComputedStyle(n).opacity));
    push("a non-member is actually dimmed, not just classed", dimmedBar < 0.9);
    push("the totals render as chips in the slim strip",
      await page.locator(".chip--total").count() === 5);
    await page.locator(".tvtotals__more summary").click();
    push("the totals say where the numbers came from, behind the Details toggle",
      /This page adds nothing up/.test(await page.locator("#totals").textContent()));

    // Deselecting is the same transition run backwards: the walk gets its
    // leaders and its own table back.
    await page.locator(navRow("topology", "demo_mechanism")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("deselecting restores the walk's own leaders and rows",
      JSON.stringify(await railShape()) === JSON.stringify(walkShape) &&
      await page.locator("tr.tvrow").count() === walkRows &&
      await page.locator("svg.tv__rails line.rail__bar--off").count() === 0);

    // A study that refuses to sum shows the refusal, with its next step.
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForSelector(".tverror", { timeout: 5000 });
    const refusal = await page.locator("#totals").textContent();
    push("a BranchAmbiguity renders as a result, not as a blank",
      /The selection reaches a fork/.test(refusal) &&
      /still unused/.test(refusal) &&
      await page.locator(".chip--total").count() === 0);

    // ...and the other half of that rule: a refusing study has no chain, so
    // it must leave the walk at FULL emphasis rather than dimming everything
    // or emptying the table. This used to be `onNavStudy`'s `chainable()`
    // false branch and was unwitnessed in every tier until 2026-09-15
    // (ISSUE_20260915_a_refusing_study_staying_on_the_walk_is_unwitnessed_
    // in_every_tier); it is now the single `marking` test in
    // views/topology.js, and this is what watches it.
    //
    // Arrived at FROM a summing study on purpose. Reached from the walk, a
    // refusal and no selection at all are the same picture — which is
    // exactly why the old mutation was invisible.
    await page.locator(navRow("study", "demo_strut_branch")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("the anchor: a study that sums really is emphasized first",
      await page.locator("svg.tv__rails line.rail__bar--off").count() > 0);
    await page.locator(navRow("study", "demo_ambiguous")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    push("a refusing study leaves the walk exactly as it was rather than " +
      "emphasizing a chain it has not got",
      await page.locator("svg.tv__rails line.rail__bar--off").count() === 0 &&
      await page.locator("svg.tv__rails line.rail__bar--on").count() === 0 &&
      await page.locator("tr.tvrow").count() === walkRows &&
      JSON.stringify(await railShape()) === JSON.stringify(walkShape));

    // Back to the deselected walk for the rest of this suite. A refusing
    // study and no selection draw the same page (that is the check above), so
    // this changes nothing a reader would see -- but it does keep the blocks
    // below measuring a page whose STATE is the one they describe, rather
    // than one that merely looks like it.
    await page.locator(navRow("topology", "demo_mechanism")).click();
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });

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
    // physical joint) — the "stays silent" half of deliverable 4
    // (viewer_v2_single_nav), on the fixture the rest of this suite already
    // loaded.
    push("a topology with no joint block says so rather than fabricating one",
      /no joint block/.test(await page.locator("#topojoint").textContent()));
    // It declares no worksheet either, and until
    // viewer_nav_wedge_and_classic_retirement that hid the toggle. It now
    // offers the sheet of the stack it re-expresses (`demo_joint`,
    // VA.worksheetSubject): retiring that stack's own nav row left this page as
    // the only route to an authored sheet, which is true of three of the four
    // real conversions too. The dialog names the file it is showing, so a
    // reader is never left wondering whose sheet they are reading.
    await page.locator("#worksheet-toggle").click();
    await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
    const sheet = await page.locator("#worksheet-dialog").textContent();
    push("a topology with no worksheet of its own offers the one its covered " +
      "stack authored, and names it", /WORKSHEET_demo_joint\.md/.test(sheet));
    push("and renders that sheet's own body, not an empty pane",
      /Demo worksheet/.test(sheet));
    await page.locator("#worksheet-close").click();

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
          // Observed once (ISSUE_20260914_topology_file_url_real_study_loop_
          // hung_once.md): this click's own actionability wait never saw the
          // row go stable and the raw playwright timeout gave no hint which
          // iteration it was on. Bounded at the same 30s playwright already
          // defaults to -- the fix here is naming the study, not widening or
          // narrowing the wait.
          try {
            await page.locator(navRow("study", study.id)).click({ timeout: 30000 });
          } catch (e) {
            throw new Error(`[real] nav click for study "${study.id}" never ` +
              `went visible/enabled/stable -- ${e.message}`);
          }
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
            await page.locator("tr.tvrow").count() === study.result.chain.length);
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
      // The clamp's own ceiling, read from the app rather than written here:
      // a zone already AT it cannot widen, and a drag that cannot widen is
      // not a broken drag (VA.JOG_ZONE_SCALE, topology.js).
      const VA_JOG_MAX = await page.evaluate(() => window.ViewerApp.JOG_ZONE_SCALE.max);
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
      // Three claims, three named checks (split 2026-09-15): as one `&&` this
      // reported a bare FAIL and gave no way to tell a drag that did not take
      // from a correspondence that broke -- which cost a session an hour of
      // probe scripts. The numbers are in each name.
      push(`[real] pitch_system's jog zone drags open (scale ${before.scale.toFixed(2)} ` +
        `-> ${dragged.scale.toFixed(2)}, ceiling ${VA_JOG_MAX})`,
        dragged.scale > 1.5 && dragged.scale > before.scale);
      push(`[real] and the SVG really widened with it (${before.svg} -> ${dragged.svg}px)`,
        dragged.svg > before.svg + 100);
      push("[real] leaders still land on their dots and seams in the widened zone",
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

      // --- the grips under a widened preview pane ------------------------
      //
      // The reader can drag the preview pane over the grid's own controls
      // (ISSUE_20260915_a_wide_preview_pane_can_cover_the_grids_own_drag_
      // grips): the grid has no horizontal scrollport of its own -- full-page
      // scroll, viewer_error_surface_and_layout 2026-09-09 -- so a grip parked
      // at a content coordinate simply left the pane's visible window, where
      // `.tv__hscroll`'s overflow-x clips it and a pointer reaches the preview
      // pane instead. Measured on this projection at 1600x1000 before
      // topology_grid_scroll_and_grips: at the shipped 430px pane the jog grip
      // answered and at 560px it did not, and with the ELEMENT column dragged
      // +220 the ELEMENT grip answered at neither.
      //
      // A pointer-down is the whole claim, so this drags each grip for real
      // and reads the preference back -- a `boundingBox()` would report a
      // clipped grip's box just as happily as a visible one's, which is
      // exactly how this went unnoticed.
      const PANE_MAX = await page.evaluate(() => window.ViewerApp.TOPO_PANE_WIDTH.max);
      const dragBy = async (selector, dx) => {
        const box = await page.locator(selector).boundingBox();
        if (!box) return false;
        const y = box.y + box.height / 2;
        await page.mouse.move(box.x + box.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(90);
        return true;
      };
      const gripState = () => page.evaluate(() => ({
        svg: Number(document.querySelector("svg.tv__rails").getAttribute("width")),
        name: window.ViewerApp.topoColumn("name").width,
      }));
      // Each grip dragged out and straight back, so the check leaves the page
      // on the state it found.
      const gripsAnswer = async () => {
        const before = await gripState();
        await dragBy(".tvgrip--jog", 40);
        const jogged = await gripState();
        await dragBy(".tvgrip--jog", -40);
        await dragBy(".tvgrip--col", 40);
        const widened = await gripState();
        await dragBy(".tvgrip--col", -40);
        return { jog: jogged.svg > before.svg, col: widened.name > before.name };
      };
      // The divider is where the reader's own hand is: dragging it LEFT widens
      // the preview pane and narrows the grid.
      const setPane = async (target) => {
        const box = await page.locator("#detail-divider").boundingBox();
        const now = await page.evaluate(() =>
          document.getElementById("detail").getBoundingClientRect().width);
        await page.mouse.move(box.x + box.width / 2, box.y + 120);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 - (target - now), box.y + 120,
          { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(140);
        return page.evaluate(() =>
          Math.round(document.getElementById("detail").getBoundingClientRect().width));
      };
      await page.locator(navRow("topology", "pitch_system")).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const paneAtStart = await page.evaluate(() =>
        Math.round(document.getElementById("detail").getBoundingClientRect().width));
      // The ELEMENT column dragged wide first, which is half of the reported
      // repro and the state its own grip was unreachable in at EVERY pane
      // width -- its boundary ends up ~550px right of anything on screen.
      await dragBy(".tvgrip--col", 220);
      for (const target of [560, PANE_MAX]) {
        const got = await setPane(target);
        const answered = await gripsAnswer();
        push(`[real] with the preview pane dragged to ${got}px, the jog grip ` +
          `still answers a pointer-down (topology_grid_scroll_and_grips)`,
          answered.jog);
        push(`[real] ...and so does the ELEMENT column's, ${
          got === PANE_MAX ? "at the pane's own maximum" : "220px of column later"}`,
          answered.col);
      }
      await dragBy(".tvgrip--col", -220);
      await setPane(paneAtStart);
      push("[real] and the page is back on the pane width it started at, so " +
        "the divider block below measures what it thinks it does",
        Math.abs((await page.evaluate(() =>
          document.getElementById("detail").getBoundingClientRect().width)) -
          paneAtStart) < 2);
      await page.evaluate(() =>
        window.localStorage.removeItem("tolstack.viewer.detailWidth"));
    }

    // --- the preview pane's own divider (viewer_component_names_and_
    //     reference_copy, 2026-09-15) -------------------------------------
    //
    // Jeff: "the right preview pane is resizable. It's too narrow." Three
    // claims a DOM shim cannot make: that a real pointer drag on the divider
    // widens the pane, that the DAG beside it gives up the width rather than
    // overflowing, and that a RELOAD gets the width back. The last one is the
    // interesting one -- it is the only preference on this page that persists,
    // so a reload is the whole test.
    const paneWidth = () => page.evaluate(() => ({
      pane: document.getElementById("detail").getBoundingClientRect().width,
      main: document.querySelector(".tv__main").getBoundingClientRect().width,
      stored: window.localStorage.getItem("tolstack.viewer.detailWidth"),
    }));

    const divider = page.locator("#detail-divider");
    push("the preview pane carries a full-height drag divider",
      await divider.count() === 1);
    const dividerBox = await divider.boundingBox();
    const beforePane = await paneWidth();
    // Full height of the flex row, not a grip inside a header: a reader must
    // be able to grab the seam anywhere down it.
    push("the divider spans the panes it sits between",
      dividerBox.height > 300);
    // Drag LEFT to widen -- the pane is on the right of its divider, and
    // getting that sign backwards is the likeliest mistake in the feature.
    await page.mouse.move(dividerBox.x + dividerBox.width / 2,
                          dividerBox.y + 120);
    await page.mouse.down();
    await page.mouse.move(dividerBox.x + dividerBox.width / 2 - 160,
                          dividerBox.y + 120, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    const afterPane = await paneWidth();
    push("dragging the divider LEFT widens the preview pane",
      afterPane.pane > beforePane.pane + 120);
    push("and the centre pane gave up the width rather than overflowing",
      afterPane.main < beforePane.main - 120 &&
      (await page.evaluate(() =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)));
    push("the drag wrote the width down when the pointer came up",
      Number(afterPane.stored) === Math.round(afterPane.pane));
    push("leaders still land on their dots and seams beside a wider pane",
      (await correspondence()).drift.length === 0);

    // The keyboard path, which needs no pointer at all: the divider is
    // focusable and the arrow keys nudge it.
    await divider.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    const nudged = await paneWidth();
    push("the arrow keys nudge the divider without a pointer",
      nudged.pane < afterPane.pane - 4 &&
      Number(nudged.stored) === Math.round(nudged.pane));
    push("and the divider keeps its focus across the re-render the nudge caused",
      await page.evaluate(() => document.activeElement &&
        document.activeElement.id === "detail-divider"));

    // THE claim. A reload constructs the page from scratch; nothing but
    // localStorage carries the width across it.
    await page.reload();
    await page.waitForSelector(".tvtable", { timeout: 15000 });
    const reloaded = await paneWidth();
    push("a reload gets the remembered pane width back",
      Math.abs(reloaded.pane - nudged.pane) < 2);
    // And it is the ONLY preference that does: the diagram settings are back
    // to their defaults, which is the asymmetry the README argues for.
    push("the diagram's own preferences did NOT persist with it",
      /comfortable/i.test(await page.locator("#density-toggle").textContent()));
    await page.evaluate(() => window.localStorage.removeItem("tolstack.viewer.detailWidth"));

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
    await page.waitForSelector(".chip--total", { timeout: 5000 });
    await page.waitForFunction(() => !window.ViewerApp.lastTopoRender.tweening,
      null, { timeout: 5000 });
    // Deselect: the DAG's own extent no longer changes with a study
    // (viewer_respine_whole_walk -- the rails are always the whole walk), but
    // the GRID beside it does, and the contracts below are about the height
    // the whole serialisation demands of the page. Clicking the topology row
    // puts the table back too, so the two blocks are measured in the state
    // the rest of this function describes.
    await page.locator(navRow("topology", "demo_mechanism")).click();
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
        await page.waitForSelector(".chip--total", { timeout: 5000 });
        await page.waitForFunction(
          () => !window.ViewerApp.lastTopoRender.tweening, null, { timeout: 5000 });
        // Deselect, same reason as the mock block above: the height
        // contracts are about the whole serialisation's own table.
        await page.locator(navRow("topology", "pitch_system")).click();
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

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
// Every crop PNG the real index resolves, as a `MemoryAdapter` images map.
// The VALUE only has to be truthy -- `MemoryAdapter.readCropImage` returns a
// `blob:` URL built from the key, not the bytes -- so this is the whole of
// what it takes to put a real crop figure, and therefore a launcher, on a
// `file://` page. Built in node from the index rather than listed, so a
// rebuild that retires a crop cannot leave a stale key behind.
function resolvedCropImages(crops) {
  const images = {};
  for (const space of [crops.by_topology, crops.by_stack]) {
    for (const entries of Object.values(space || {})) {
      for (const entry of Object.values(entries || {})) {
        if (entry && entry.status === "resolved" && entry.png) {
          images[entry.png] = true;
        }
        if (entry && entry.companion && entry.companion.png) {
          images[entry.companion.png] = true;
        }
      }
    }
  }
  return images;
}

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

    // WHY THIS SUITE NOW SUPPLIES `images`, and the decision behind it
    // (ISSUE_20260916_the_crop_lightbox_has_no_file_origin_coverage_in_any_tier)
    //
    // The lightbox shipped 2026-09-16 with a fast-tier suite and a browser
    // suite, and the browser one runs over HTTP only -- necessarily, at the
    // time: a launcher exists only on a crop figure that HAS an image, and
    // `?mock=1` (the only dataset the `file://` suites drive) carries no crop
    // PNGs at all. So no `file://` run ever called `showModal()` on
    // `#crop-lightbox`. What WAS covered there is the module loading and its
    // fast-tier rendering checks, so a script-order regression was caught;
    // what was not is the dialog, the modal top layer, the suppressed page
    // scroll and the wheel.
    //
    // THE DECISION WAS TO BUILD THE COVERAGE, and the reason is that `file://`
    // is not a marginal configuration here -- it is the app's PRIMARY one.
    // package.json: "the viewer stays build-free classic scripts that run by
    // double-clicking index.html from file://". A reader who double-clicks
    // index.html and grants a folder reads real crops through FSA, so "a
    // `file://` page with real crops on it" is the normal way this app is
    // used, not a hypothetical. Nothing in the lightbox is origin-dependent by
    // design -- but that is the CLAIM, and it was the claim no tier stated.
    //
    // The cost turned out to be one word: this suite already replaces
    // `VA.FsaAdapter` with a MemoryAdapter over the three real JSONs, and it
    // passed `images: {}`. Giving it the resolved PNGs is what turns every
    // crop figure on the `file://` page into one with an image, hence with a
    // launcher, hence with a lightbox to open. `MemoryAdapter.readCropImage`
    // hands back a `blob:` URL rather than bytes, which is enough for all of
    // it: the frame is sized in pixels from the crop index's own
    // `width`/`height` and the highlight boxes are percentages of the frame,
    // so none of the geometry waits on an image decoding. The PIXEL claims
    // stay on HTTP, where the real PNGs are (testCropLightbox); what is
    // proved here is that the surface opens and behaves on this origin.
    //
    // The alternative the issue offered -- inline PNGs in the `?mock=1` crop
    // fixtures -- was not taken here. It is a bigger change (it alters what
    // the demo tour shows, which is a design question about the tour) and it
    // would have covered a dataset nobody reads real numbers from, rather than
    // the origin Jeff actually opens.
    await page.evaluate(({ topologies, results, crops, images }) => {
      const VA = window.ViewerApp;
      window.__CROP_FETCHES__ = [];
      const Fake = function () {
        const memory = new VA.MemoryAdapter({
          startState: VA.STATE.READY, topologies, results, crops, images, texts: {},
        });
        // Which PNGs the app ASKED for, which is the half no other tier can
        // see: every fast-tier crop test hands the renderer its own `images`
        // map, so the fetch list itself has nothing standing on it.
        const real = memory.readCropImage.bind(memory);
        memory.readCropImage = function (png) {
          window.__CROP_FETCHES__.push(png);
          return real(png);
        };
        return memory;
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops,
         images: resolvedCropImages(realCrops) });
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

    // --- a balloon crop's SECOND image is fetched alongside the first -------
    //
    // `loadDetailImage` (topology_app.js) fetches a LIST, not one blob,
    // because a balloon crop names its parts-list row as a `companion` and a
    // companion that arrived a paint later would flash "image not on disk"
    // under "Parts list, sheet 1" on every selection. Nothing watched the
    // list: dropping the companion term from it left the fast tier at 407/407
    // and this file at 20/20 on 2026-09-16, and the only symptom was the
    // missing-image line on all four live balloon crops. It cannot be watched
    // in the fast tier at all -- topology_app.js is not in run_tests.cjs's
    // file list, and the DOM shim cannot boot the page -- so the fetch list is
    // read here, off the adapter the app actually called.
    const companionRows = await page.evaluate(({ topologies, crops }) => {
      const VA = window.ViewerApp;
      const found = [];
      for (const topology of topologies.topologies) {
        for (const edge of topology.edges) {
          const entry = VA.cropForKey(crops, edge.crop_key);
          if (entry && entry.status === "resolved" && entry.png &&
              entry.companion && entry.companion.png) {
            found.push({ topology: topology.id, edge: edge.id,
                         png: entry.png, companion: entry.companion.png });
          }
        }
      }
      return found;
    }, { topologies: realProjection, crops: realCrops });
    // The fixture precondition, asserted before what it certifies. TWO rows,
    // because the two fetchers cannot be told apart on one: `imageCache` is
    // shared, so whichever of them runs first is the only one that reaches
    // the adapter for that PNG.
    push("two live topology rows still reach balloon crops that name a " +
      "parts-list companion — one per fetcher below", companionRows.length >= 2);
    const [paneRow, cardRow] = companionRows;
    let fetched = [];
    if (paneRow && cardRow) {
      // The PANE's fetcher: selecting a row is what runs loadDetailImage.
      const row = `tr.tvrow[data-id="${paneRow.edge}"]`;
      await page.locator(navRow("topology", paneRow.topology)).click();
      await page.waitForSelector(row, { timeout: 5000 });
      await page.locator(row).click();
      await page.waitForFunction(
        (png) => (window.__CROP_FETCHES__ || []).indexOf(png) !== -1,
        paneRow.companion, { timeout: 5000 }).catch(() => {});
      // ...and the CARD's, which is a different list builder (`cardPngs`) with
      // the same companion term in it: hovering the row's own crop trigger.
      const trigger = `tr.tvrow[data-id="${cardRow.edge}"] button.crop-trigger`;
      await page.locator(navRow("topology", cardRow.topology)).click();
      await page.waitForSelector(trigger, { timeout: 5000 });
      await page.locator(trigger).hover();
      await page.waitForSelector(".hovercard--edge",
        { state: "visible", timeout: 5000 });
      await page.waitForFunction(
        (png) => (window.__CROP_FETCHES__ || []).indexOf(png) !== -1,
        cardRow.companion, { timeout: 5000 }).catch(() => {});
      await page.keyboard.press("Escape");
      fetched = await page.evaluate(() => window.__CROP_FETCHES__ || []);
    }
    push("the open topology's own crop images are fetched",
      !!paneRow && fetched.indexOf(paneRow.png) !== -1);
    push("selecting a balloon crop's row fetches its parts-list companion " +
      "too, so the PANE's second image is there with the first rather than " +
      "a paint later",
      !!paneRow && fetched.indexOf(paneRow.companion) !== -1);
    push("opening a balloon crop's hover CARD fetches its parts-list " +
      "companion too — the card's list is built separately and carries the " +
      "same second image",
      !!cardRow && fetched.indexOf(cardRow.companion) !== -1);

    // --- the crop lightbox, ON THIS ORIGIN ---------------------------------
    //
    // The `file://` half of the lightbox's coverage (see the note on the fake
    // adapter above for why it is built here rather than on `?mock=1`). What
    // is proved is the part that could plausibly be origin-dependent and was
    // stated nowhere: that the dialog OPENS on a file URL, that it lands on
    // the top layer with the page behind it inert, that the page's own scroll
    // is suppressed while it is up, that the wheel reaches it, and that
    // Escape hands the page back. The pixel geometry stays on HTTP, against
    // the real PNGs (testCropLightbox) -- a `blob:` URL has no bytes, and a
    // check that measured a picture here would be measuring nothing.
    const launcher = page.locator("#detail button.cropfig__launch").first();
    let launchable = false;
    for (const topology of realProjection.topologies) {
      await page.locator(navRow("topology", topology.id)).click();
      await page.waitForSelector("tr.tvrow", { timeout: 5000 });
      const withCrop = page.locator("tr.tvrow button.crop-trigger").first();
      if (await withCrop.count() === 0) continue;
      await page.locator("tr.tvrow button.crop-trigger").first()
        .evaluate((b) => b.closest("tr").click());
      await launcher.waitFor({ timeout: 5000 }).then(() => { launchable = true; })
        .catch(() => {});
      if (launchable) break;
    }
    // The precondition, asserted rather than assumed: with `images: {}` this
    // was 0 on every live row, which is exactly the gap. If it is ever 0
    // again the sub-checks below would all pass by never running.
    push("a crop figure on this file:// page carries a launcher at all — the " +
      "affordance exists only on a figure that HAS an image, which is why no " +
      "file:// run reached the lightbox until this suite was given the real " +
      "index's PNGs", launchable);
    if (launchable) {
      const scrollBefore = await page.evaluate(
        () => getComputedStyle(document.body).overflow);
      await launcher.click();
      await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
      const open = await page.evaluate(() => {
        const dialog = document.querySelector("#crop-lightbox");
        return {
          open: dialog.open,
          // `:modal` and not just `[open]`: a <dialog> opened with `show()`
          // is also `[open]` but is NOT on the top layer and leaves the page
          // behind it live, which is the one thing this surface cannot be.
          modal: dialog.matches(":modal"),
          overflow: getComputedStyle(document.body).overflow,
          stage: !!dialog.querySelector("div.lightbox__stage"),
          scale: window.ViewerApp.openCropLightboxHandle().view().scale,
        };
      });
      push("the lightbox OPENS on a file:// page, as a MODAL dialog on the " +
        "top layer — the whole surface is a <dialog>.showModal(), and a " +
        "top-layer element is the one thing on these pages whose behaviour a " +
        "reader could reasonably expect an origin to change",
        open.open && open.modal && open.stage);
      push("the page behind it cannot scroll on this origin either — a modal " +
        "<dialog> makes the page inert but does not reliably stop it " +
        "scrolling, so the body class is doing the work and it is the same " +
        "class on both origins",
        open.overflow === "hidden" && scrollBefore !== "hidden");
      // The wheel, which is the gesture the modality exists for: it must
      // reach the stage and zoom rather than scrolling anything.
      const centre = await page.evaluate(() => {
        const s = document.querySelector("#crop-lightbox div.lightbox__stage")
          .getBoundingClientRect();
        return { x: s.left + s.width / 2, y: s.top + s.height / 2 };
      });
      await page.mouse.move(centre.x, centre.y);
      for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -120);
      await page.waitForFunction(() => {
        const handle = window.ViewerApp.openCropLightboxHandle();
        return handle && handle.view().scale > 1;
      }, null, { timeout: 5000 }).catch(() => {});
      const zoomedHere = await page.evaluate(() => ({
        scale: window.ViewerApp.openCropLightboxHandle().view().scale,
        pageScrollY: window.scrollY,
      }));
      push("a wheel over the stage zooms on this origin and scrolls nothing " +
        "behind it — the preventDefault and the body class are the two halves " +
        "of that, and neither is origin-dependent",
        open.scale === 1 && zoomedHere.scale > 1 &&
        zoomedHere.pageScrollY === 0);
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        () => !document.querySelector("#crop-lightbox").open &&
              !document.body.classList.contains("lightbox-open"),
        null, { timeout: 5000 }).catch(() => {});
      const closedHere = await page.evaluate(() => ({
        open: document.querySelector("#crop-lightbox").open,
        overflow: getComputedStyle(document.body).overflow,
      }));
      push("Escape closes it and hands the page's scroll back, through the " +
        "dialog's own `close` event — the one seam every dismissal goes " +
        "through, on the origin a reader double-clicks into",
        !closedHere.open && closedHere.overflow !== "hidden");
    }

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
  }
}

// --- no click may wedge the page (viewer_nav_wedge_and_classic_retirement) --
//
// Jeff's 2026-09-15 review, second half: "when you click on a classic view, the
// page gets wedged on that item and can't unstick unless you do a page
// refresh." The cause was one missing `.catch`. All three nav handlers move
// `state` FIRST and then await a worksheet read (`loadWorksheet().then(...)`),
// so a rejected read never reached a repaint: the page kept the picture of the
// node you clicked away from, the rail's highlight never moved, and every
// later click did the same thing again. Nothing threw where a user could see
// it -- it was an unhandled rejection in the console, which is the same shape
// as the 2026-09-09 silently-empty-DAG incident that got `onReload` its catch
// and left these three without one.
//
// So this suite is not "does the error look right". It is: click EVERY row of
// the real nav, twice over, and require that the page went somewhere.
//
//   1. worksheet reads REJECTING -- an FSA grant revoked mid-session, or an
//      origin that errors on the docs path. (Note which shape this is NOT:
//      drawing-checker's sibling-data-mount reaches no `docs/` at all, so
//      there `readText` resolves null and the toggle is simply not offered --
//      no rejection, which is pass 2's case and is honest on its own. The
//      failing read is the one nothing rendered.)
//   2. the same rows with reads RESOLVING, where no banner may appear at all.
//
// The wedge detector is the rail's own highlight: `navtree__row--on` moves
// only when renderNav runs, and renderNav runs only from a paint. A row that
// never lights up is a click that painted nothing, which is the bug, whatever
// the rest of the page looks like.
async function testNavNeverWedges(browser, url, label, realProjection, realResults, realCrops) {
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

    // The real boot path with a fake adapter, exactly as the non-mock suite
    // above does it -- plus one switch on `readText`, which is the only method
    // a nav click awaits.
    await page.evaluate(({ topologies, results, crops }) => {
      const VA = window.ViewerApp;
      window.__WORKSHEETS_FAIL__ = true;
      const Fake = function () {
        const memory = new VA.MemoryAdapter({
          startState: VA.STATE.READY, topologies, results, crops, images: {}, texts: {},
        });
        const real = memory.readText.bind(memory);
        memory.readText = function (segments) {
          if (window.__WORKSHEETS_FAIL__) {
            return Promise.reject(new Error("this origin cannot reach the worksheet"));
          }
          // A stand-in for prose the previous node's read really returned:
          // this seam's `texts` is empty, so a SUCCESSFUL read resolves null
          // and `state.worksheetText` is never anything a later node could
          // inherit. The stale-worksheet block below is the only thing that
          // sets it, and it clears it again immediately.
          if (window.__WORKSHEET_MARKER__) {
            return Promise.resolve(window.__WORKSHEET_MARKER__);
          }
          return real(segments);
        };
        return memory;
      };
      Fake.isSupported = () => true;
      VA.FsaAdapter = Fake;
      VA.bootTopology();
    }, { topologies: realProjection, results: realResults, crops: realCrops });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });

    // Every clickable row of the live rail, in the order a reader meets them,
    // tagged with whether clicking it READS anything. `loadWorksheet()` reads
    // only where the selected subject declares a `worksheet_file` -- and a node
    // with none resolves without touching the adapter at all. Only the reading
    // rows can see a failed read, so only they are required to say so;
    // requiring a banner on the others would be requiring the page to invent an
    // error.
    //
    // The subject is `VA.worksheetSubject`'s, replayed here off the same two
    // projections: a topology's own sheet, or failing that the sheet of a stack
    // it re-expresses (a study row inherits its topology's either way). A
    // deliberate second implementation of a five-line rule -- the point is to
    // discover which rows really hit the adapter, and asking the page under
    // test would agree with whatever it does.
    const sheetless = new Set();
    for (const stack of realResults.stacks) {
      if (!stack.worksheet_file) sheetless.add(stack.id);
    }
    const withWorksheet = new Set();
    for (const topology of realProjection.topologies) {
      const covered = (topology.edges || [])
        .map((edge) => edge.crop_key && edge.crop_key.stack)
        .filter((id) => id && !sheetless.has(id));
      if (topology.worksheet_file || covered.length) {
        withWorksheet.add("topology:" + topology.id);
      }
    }
    for (const stack of realResults.stacks) {
      if (stack.worksheet_file) withWorksheet.add("stack:" + stack.id);
    }
    const rows = (await page.evaluate(() =>
      Array.prototype.map.call(
        document.querySelectorAll("#navtree [data-nav-kind]"),
        (row) => ({ kind: row.getAttribute("data-nav-kind"),
                    id: row.getAttribute("data-nav-id"),
                    topologyId: row.getAttribute("data-topology-id") }))
    )).map((row) => Object.assign(row, {
      reads: withWorksheet.has(
        row.kind === "study" ? "topology:" + row.topologyId : row.kind + ":" + row.id),
    }));
    push("the rail offers rows to click at all", rows.length >= 20);
    push("some of those rows really do read a worksheet, so the failing " +
      "transport is exercised at all",
      rows.filter((row) => row.reads).length >= 3);

    // Pass 1: every read rejects. Each click must still land -- the row lights
    // up, the pane it implies is on screen, and the banner says what happened.
    const wedged = [];
    const unbannered = [];
    const blank = [];
    for (const row of rows) {
      await page.locator(`#navtree ${navRow(row.kind, row.id)}`).click();
      try {
        await page.waitForSelector(
          `#navtree ${navRow(row.kind, row.id)}.navtree__row--on`, { timeout: 4000 });
      } catch {
        wedged.push(`${row.kind}:${row.id}`);
        continue;
      }
      const seen = await page.evaluate(() => ({
        banner: (document.querySelector(".banner__error") || {}).textContent || "",
        rails: document.querySelectorAll("tr.tvrow").length,
        elements: document.querySelectorAll("#stackview table.eltable").length,
      }));
      if (row.reads && !seen.banner.trim()) unbannered.push(`${row.kind}:${row.id}`);
      if (!row.reads && seen.banner.trim()) unbannered.push(`${row.kind}:${row.id} (nothing to read, yet it raised one)`);
      const painted = row.kind === "stack" ? seen.elements >= 1 : seen.rails >= 1;
      if (!painted) blank.push(`${row.kind}:${row.id}`);
    }
    push("no click leaves the page wedged: every row still moves the rail's " +
      "highlight when the worksheet read fails", wedged.length === 0);
    console.log(`    (${rows.length} rows clicked, ` +
      `${rows.filter((row) => row.reads).length} of them reading)`);
    if (wedged.length) console.log(`    wedged on: ${wedged.join(", ")}`);
    push("a failed worksheet read says so in the banner rather than failing " +
      "silently, and a node with no worksheet raises nothing",
      unbannered.length === 0);
    if (unbannered.length) console.log(`    wrong banner state on: ${unbannered.join(", ")}`);
    push("the page the click asked for is on screen even though the read " +
      "failed", blank.length === 0);
    if (blank.length) console.log(`    nothing painted for: ${blank.join(", ")}`);

    // --- the stale worksheet, which is navFailed's OTHER contract ----------
    //
    // `navFailed` clears `state.worksheetText` because `loadWorksheet()` only
    // ASSIGNS on success -- so without the clear, the previous node's markdown
    // is still in the dialog under this node's title. It is reachable and
    // observable, and nothing watched it: measured 2026-09-16, deleting
    // `state.worksheetText = null;` left the fast tier at 308/308, the
    // node-fs tier at 382/382 and this file at 20/20.
    //
    // `paint()` computes `hasWorksheet` from `sheet.worksheet_file` -- the
    // projection, not the text -- so the toggle is still offered after a
    // failed read, and views/worksheet.js then renders `.worksheet__path` from
    // the NEW subject and `.worksheet__body` from `state.worksheetText`: the
    // OLD node's prose. The "could not be read from the connected folder"
    // branch the line exists to reach is skipped entirely.
    //
    // Two reading rows, because the defect is one node's prose surviving onto
    // another, and the whole thing is bracketed so pass 1's state is handed to
    // the recovery block below exactly as it found it.
    const readers = rows.filter((row) => row.reads);
    const openSheet = async () => {
      if (!(await page.locator("#worksheet-toggle").isVisible())) return null;
      await page.locator("#worksheet-toggle").click();
      await page.waitForSelector("#worksheet-dialog[open]", { timeout: 4000 });
      const seen = await page.evaluate(() => ({
        bodies: document.querySelectorAll(".worksheet__body").length,
        text: (document.querySelector("#worksheet-dialog") || {}).textContent || "",
        heading: ((document.querySelector(".worksheet__body h1") || {})
          .textContent || ""),
        path: ((document.querySelector(".worksheet__path") || {})
          .textContent || ""),
      }));
      await page.keyboard.press("Escape");
      return seen;
    };
    const STALE_MARKER = "a previous node's worksheet";
    let afterRead = null, afterFailedRead = null;
    if (readers.length >= 2) {
      await page.evaluate((marker) => {
        window.__WORKSHEET_MARKER__ = "# " + marker + "\n\nits prose.\n";
        window.__WORKSHEETS_FAIL__ = false;
      }, STALE_MARKER);
      await page.locator(`#navtree ${navRow(readers[0].kind, readers[0].id)}`).click();
      await page.waitForSelector(
        `#navtree ${navRow(readers[0].kind, readers[0].id)}.navtree__row--on`,
        { timeout: 4000 });
      afterRead = await openSheet();
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = true; });
      await page.locator(`#navtree ${navRow(readers[1].kind, readers[1].id)}`).click();
      await page.waitForSelector(
        `#navtree ${navRow(readers[1].kind, readers[1].id)}.navtree__row--on`,
        { timeout: 4000 });
      afterFailedRead = await openSheet();
      await page.evaluate(() => { delete window.__WORKSHEET_MARKER__; });
    }
    // The tripwire, asserted before what it certifies: a read that WORKED has
    // to have put prose in the dialog, or there is nothing for the next node
    // to inherit and the contract below is vacuous.
    push("a worksheet read that works puts that node's own prose in the " +
      "dialog — the thing the next node could inherit",
      afterRead !== null && afterRead.bodies === 1 &&
      afterRead.heading.indexOf(STALE_MARKER) !== -1);
    push("a node whose worksheet read FAILED shows the sentence saying so, " +
      "never the previous node's prose under this node's title",
      afterFailedRead !== null &&
      afterFailedRead.text.indexOf("could not be read from the connected " +
        "folder") !== -1 &&
      afterFailedRead.bodies === 0 &&
      afterFailedRead.text.indexOf(STALE_MARKER) === -1);
    if (afterFailedRead && afterFailedRead.bodies) {
      console.log(`    stale sheet: "${afterFailedRead.heading}" under ` +
        `"${afterFailedRead.path}"`);
    }

    // Recovery, with no user action and no reload: the next read that works
    // retires the banner. A message that outlives what it was about is a
    // sentence about the wrong node, and the banner has no dismiss control.
    const reader = rows.find((row) => row.reads);
    let cleared = false;
    try {
      await page.locator(`#navtree ${navRow(reader.kind, reader.id)}`).click();
      await page.waitForSelector(".banner__error", { timeout: 4000 });
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = false; });
      await page.locator(`#navtree ${navRow(reader.kind, reader.id)}`).click();
      await page.waitForSelector(
        `#navtree ${navRow(reader.kind, reader.id)}.navtree__row--on`, { timeout: 4000 });
      cleared = (await page.locator(".banner__error").count()) === 0;
    } catch {
      // Swallowed on purpose. A wedged page never raises the banner this waits
      // for, and a timeout thrown from here would take the whole suite down as
      // an ERROR -- which carries no check name, so the mutation-witness tier
      // reports it as a MISS rather than as the red it is
      // (scripts/mutation_witnesses.json, "ONE THING AN ENTRY CANNOT DECLARE").
      await page.evaluate(() => { window.__WORKSHEETS_FAIL__ = false; });
    }
    push("a read that works clears the banner a failed one wrote", cleared);

    // Pass 2: reads resolving. Same rows, and now no banner may appear at all
    // -- the containment must not be paying for itself with a false alarm.
    const noisy = [];
    for (const row of rows) {
      await page.locator(`#navtree ${navRow(row.kind, row.id)}`).click();
      try {
        await page.waitForSelector(
          `#navtree ${navRow(row.kind, row.id)}.navtree__row--on`, { timeout: 4000 });
      } catch {
        wedged.push(`${row.kind}:${row.id} (reads working)`);
        continue;
      }
      if (await page.locator(".banner__error").count()) noisy.push(`${row.kind}:${row.id}`);
    }
    push("every row lands with no error banner at all when the reads work",
      noisy.length === 0 && wedged.length === 0);
    if (noisy.length) console.log(`    banner raised on: ${noisy.join(", ")}`);

    // The other half of deliverable 2, end to end: the sheet a converted
    // stack authored is still ONE CLICK away, on its topology's page, now that
    // the stack's own row is gone. Over this seam `texts` is empty, so the
    // dialog cannot show the markdown -- what it must show is that it is
    // offering the STACK's sheet, by name, and it must offer the button at all.
    let fallback = null;
    for (const topology of realProjection.topologies) {
      if (topology.worksheet_file) continue;
      const covered = (topology.edges || [])
        .map((edge) => edge.crop_key && edge.crop_key.stack).filter(Boolean);
      const stack = realResults.stacks.find(
        (s) => covered.includes(s.id) && s.worksheet_file);
      if (stack) { fallback = { topology, stack }; break; }
    }
    push("the live projection has a converted stack whose sheet only its " +
      "topology's page can reach", fallback !== null);
    if (fallback) {
      await page.locator(`#navtree ${navRow("topology", fallback.topology.id)}`).click();
      await page.waitForSelector(
        `#navtree ${navRow("topology", fallback.topology.id)}.navtree__row--on`,
        { timeout: 4000 });
      push("a topology that declares no worksheet still offers the one its " +
        "stack authored", await page.locator("#worksheet-toggle").isVisible());
      await page.locator("#worksheet-toggle").click();
      await page.waitForSelector("#worksheet-dialog[open]", { timeout: 5000 });
      push("and the dialog names that stack's own sheet, not a neighbour's",
        (await page.locator("#worksheet-dialog").textContent())
          .includes(fallback.stack.worksheet_file));
      await page.locator("#worksheet-close").click();
    }

    // The retirement, on the live rail (deliverable 2 and 4): a stack a
    // topology re-expresses has no row, and the word is gone from the page.
    const covered = [];
    for (const topology of realProjection.topologies) {
      for (const edge of topology.edges || []) {
        const id = edge.crop_key && edge.crop_key.stack;
        if (id && !covered.includes(id)) covered.push(id);
      }
    }
    push("the live projection really does re-express some stacks as graphs",
      covered.length >= 4);
    push("no row anywhere on the rail says \"classic\"",
      !(await page.evaluate(() =>
        document.getElementById("navtree").textContent.toLowerCase().includes("classic"))));
    const offered = rows.filter((row) => row.kind === "stack").map((row) => row.id);
    push("every stack row the rail offers is one no topology re-expresses",
      covered.every((id) => !offered.includes(id)));

    const rejections = await page.evaluate(() => window.__REJECTIONS__);
    push("no unhandled promise rejection from any nav click",
      rejections.length === 0);
    if (rejections.length) console.log(`    rejections: ${rejections.join(" | ")}`);

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
      await page.waitForSelector(".chip--total", { timeout: 15000 });
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
          "and the document it is a crop OF",
          await page.locator(".hovercard--edge img.croppop__img").count() === 1 &&
          // The reference, in a reader's words, said ONCE. This asserted the
          // crop-KEY claim until 2026-09-15 ("authored in topology
          // `pitch_system`"), then the crop block's own "<file>.pdf · sheet N"
          // head until 2026-09-16 -- which was the document's third printing
          // on one card. It comes off the citation's where-line now, and the
          // crop under it carries no caption at all.
          /cited at: .+ · sheet \d/.test(cardText) &&
          await page.locator(".hovercard--edge .cropblock .croppop__head")
            .count() === 0 &&
          !/authored in topology/.test(cardText));
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
        // Keyed off the caption NODE rather than its wording since 2026-09-16:
        // a side's line is "<part> · drawing <no>" now, which has no fixed
        // substring to match on across live parts.
        const thumbLines = await page.locator(
          ".hovercard--node .hovercard__cropkey").count();
        push("[real] a node card's thumbnail line and its image arrive together",
          thumbLines > 0
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

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
async function testAnnotateFlyout(browser, fileBase, label, topologies) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // The respine transition, waited out -- the same wait every other suite
  // that addresses this pane already uses, and the one wait this suite was
  // missing. Selecting a study re-serialises the pane, and
  // VA.animateTopoPane cross-fades to it by RE-PARENTING the outgoing paint
  // into an inert `div.tv__ghost` overlay for VA.RESPINE.duration (260 ms,
  // apps/viewer/topology.js). For that window the document holds TWO
  // `.tv__hscroll` panes, so every edge present in both serialisations has
  // two `tr.tvrow` carrying the same `data-id`, and a bare
  // `tr.tvrow[data-id=...]` locator is a strict-mode violation.
  //
  // That is arithmetic, not flake. Measured on this suite: the study click
  // lands at page time 264 ms and the `arm_pin_to_tip` click at 459 ms --
  // about 200 ms into a 260 ms transition. Whether a run is red is only
  // whether the six Playwright actions between those two take more or less
  // than 260 ms, which is the whole of why this suite was green in a full
  // run and red on its own
  // (ISSUE_20260915_annotate_flyout_suite_is_red_alone_and_green_in_a_full_run).
  // Nothing is shared between suites and nothing renders twice.
  //
  // NOT a fixed timeout, and NOT a ghost-excluding locator. The ghost is
  // the state to wait out, so wait on the page's own record of it: a pane
  // that never settles then FAILS here, where a locator scoped past the
  // ghost would have found its one live row and passed straight over it.
  //
  // Swallowed and reported rather than thrown, the same choice the embedded
  // annotator's banner wait below makes and for the same reason: a timeout
  // thrown from here takes the suite down as an ERROR, which carries no
  // check name, so the mutation-witness tier reads it as a MISS instead of
  // the red it is (scripts/mutation_witnesses.json, "ONE THING AN ENTRY
  // CANNOT DECLARE"). A pane that never settles has to fail with a name on
  // it.
  const paneSettled = async () => {
    try {
      await page.waitForFunction(
        () => window.ViewerApp && window.ViewerApp.lastTopoRender &&
              !window.ViewerApp.lastTopoRender.tweening,
        null, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  };
  try {
    // --- mounted: the sibling annotate app is served beside the viewer ------
    await page.goto(url + "/apps/viewer/topology.html?mock=1", { waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForSelector("#study-3d", { timeout: 15000 });
    push("the study's respine transition settles before any of its rows " +
      "are addressed -- no ghost of the walk still holds a second copy of them",
      await paneSettled());
    push("the probe upgrades the study affordance to the View-in-3D button",
      await page.locator("#study-3d").count() === 1 &&
      await page.locator("#toolbar a").count() === 0);

    const paneBefore = await page.locator("#topopane").boundingBox();
    const railsBefore = await page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__rails");
      const r = svg.getBoundingClientRect();
      return { visible: Math.round(r.width), left: Math.round(r.left) };
    });
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
    // --- LEFT-docked, ADJACENT to the DAG, and resizable (handoff
    // flyout_resize_annotator_filter_and_deselect, deliverable 1) -----------
    //
    // Jeff: "I actually want the 3d flyout on the left side, adjacent to the
    // DAG. It would be ok if it covered up the left side select menu since you
    // shouldn't need both at the same time." Every claim below is a LAYOUT
    // claim and a layout engine is the only thing that can check any of them:
    // a class-name check would pass straight through an `inset` typo that put
    // the panel back on the right.
    //
    // WHAT "ADJACENT" IS MEASURED AGAINST, and it took a review to get right
    // (2026-09-16): the DAG **drawing** is one `svg.tv__rails`, and `#topopane`
    // is its horizontal scrollport. The first version of this block compared
    // the panel against the SCROLLPORT and passed while the panel sat on top of
    // 100% of the diagram -- `position: fixed` means the pane's own box never
    // moves however wide the panel gets, and the drawing is `position: sticky;
    // left: 0` inside it, so no scroll position can bring it out from
    // underneath either. Measure the drawing.
    const flyoutBox = async () => page.locator("#annotate-flyout").boundingBox();
    const win = await page.evaluate(() => ({
      w: window.innerWidth, h: window.innerHeight,
    }));
    // The drawing's own box against the panel's: how much of it is clear, and
    // whether ALL of it is. `clear` is the deliverable; `visible` is the
    // anti-vacuity guard beside it, because a page rendering no rails at all
    // would satisfy "none of it is covered" trivially.
    const rails = () => page.evaluate(() => {
      const svg = document.querySelector("#topopane svg.tv__rails");
      const panel = document.querySelector("#annotate-flyout");
      if (!svg) return { visible: 0, clear: false };
      const r = svg.getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      return {
        visible: Math.round(r.width),
        left: Math.round(r.left),
        clear: r.width > 0 && r.left >= p.right,
      };
    });
    const docked = await flyoutBox();
    push("the flyout is pinned to the LEFT edge, not the right",
      docked && docked.x === 0 && docked.width < win.w);
    const railsOpen = await rails();
    push("the DAG DRAWING is drawn, and entirely clear of the panel -- " +
      "adjacency is the deliverable and the drawing is the thing that has to " +
      "survive, not its scrollport",
      railsOpen.visible > 0 && railsOpen.clear);
    push("...and it sits to the panel's RIGHT, which is what 'beside' means",
      railsOpen.left >= docked.width);

    // The page YIELDS the room rather than being covered, which is the
    // mechanism that makes the above possible at all: `.tv` starts at the
    // panel's right edge and the nav rail stands down. That reverses the
    // previous "opening it cannot reflow the DAG pane by construction" claim
    // deliberately -- see topology.css -- so the pane MOVING is now the
    // assertion, where it used to be the thing forbidden.
    const paneAfter = await page.locator("#topopane").boundingBox();
    push("opening the flyout moves the DAG pane out from under it, rather " +
      "than leaving it underneath",
      paneBefore && paneAfter && paneAfter.x >= docked.width &&
      paneAfter.x > paneBefore.x);
    push("the nav rail stands down while the panel is open, which Jeff said " +
      "was fine and is where the room comes from",
      await page.locator("#navtree").evaluate(
        (n) => getComputedStyle(n).display) === "none");
    const reserve = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH.reserve);

    // The drag seam, on the edge AWAY from the dock -- so the panel grows into
    // the page rather than off the screen.
    const grip = await page.locator("#flyout-divider").boundingBox();
    push("its drag divider sits on the flyout's RIGHT edge",
      grip && Math.abs((grip.x + grip.width / 2) - docked.width) <= 4);
    const gripMark = await page.locator("#flyout-divider")
      .evaluate((n) => getComputedStyle(n, "::after").backgroundImage);
    push("the divider shows a grip mark at rest, so nothing has to be " +
      "explained in words",
      gripMark && gripMark !== "none");

    // Real pointer drags on it. At this viewport (1600px, the preview pane at
    // its 560px default) the panel opens already AT its clamp, so "rightwards
    // widens" is measured from a narrowed start -- drag left first, then right.
    // The sign is the thing under test: this panel is left of its seam, the
    // opposite of the preview pane's divider on the same page, and a
    // copy-paste between the two is the likeliest mistake in either.
    const dragBy = async (dx) => {
      const seam = await page.locator("#flyout-divider").boundingBox();
      await page.mouse.move(seam.x + seam.width / 2, seam.y + 300);
      await page.mouse.down();
      await page.mouse.move(seam.x + seam.width / 2 + dx, seam.y + 300, { steps: 8 });
      await page.mouse.up();
      return (await flyoutBox()).width;
    };
    const narrowed = await dragBy(-200);
    push("dragging the divider LEFT narrows the flyout",
      narrowed < docked.width - 100);
    const widened = await dragBy(160);
    push("dragging the divider RIGHT widens the flyout (the pane's divider " +
      "runs the other way)",
      widened > narrowed + 100);
    push("...and the flyout is still pinned to the left edge while it grows",
      (await flyoutBox()).x === 0);
    const railsWide = await rails();
    push("the drawing is STILL entirely clear of the panel at the widened " +
      "width -- the drag cannot buy panel width with diagram",
      railsWide.visible > 0 && railsWide.clear);

    // The keyboard path, so the resize needs no pointer at all.
    await page.locator("#flyout-divider").focus();
    await page.keyboard.press("ArrowLeft");
    const nudged = (await flyoutBox()).width;
    push("the arrow keys nudge the divider without a pointer", nudged < widened);
    await page.keyboard.down("Shift");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");
    const coarse = (await flyoutBox()).width;
    push("...and shift makes it a coarse step",
      widened - nudged < nudged - coarse);

    // A drag cannot cover the graph whatever the reader does. Dragged clean off
    // the right edge of the window, the whole drawing still has to be clear.
    await dragBy(win.w + 2000);
    const railsMaxed = await rails();
    push("dragged past the window edge, the whole drawing is still clear of " +
      "the panel",
      railsMaxed.visible > 0 && railsMaxed.clear);
    push("...and the page beside the panel is at least the reserve wide",
      win.w - (await flyoutBox()).width >= reserve);

    // The width is remembered across a reload -- the same contract the preview
    // pane's has, under its own key. Narrowed first, so the number being
    // round-tripped is one a reader chose AND one the open-time clamp will
    // accept unchanged; a width sitting at the clamp would round-trip even if
    // nothing were stored at all, which is a check that cannot fail.
    const remembered = await dragBy(-180);
    push("the remembered width is well inside the clamp, so the round-trip " +
      "below is a real one", remembered < coarse - 100);
    const storedKey = await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH_KEY);
    push("the width is written to localStorage under the flyout's own key",
      String(await page.evaluate((k) => window.localStorage.getItem(k), storedKey))
        === String(Math.round(remembered)));
    await page.reload({ waitUntil: "load" });
    await page.waitForSelector("tr.tvrow", { timeout: 15000 });
    await page.locator(navRow("study", "demo_base_to_tip")).click();
    await page.waitForSelector("#study-3d", { timeout: 15000 });
    // The respine again, waited out for the same reason the first one is (see
    // this suite's header): the reload re-enters the study, and the rows
    // addressed further down would otherwise be doubled by the outgoing
    // paint's ghost.
    push("the reloaded study's respine settles too", await paneSettled());
    await page.locator("#study-3d").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    push("...and a reload opens the panel at the remembered width",
      Math.abs((await flyoutBox()).width - remembered) <= 1);
    await page.evaluate((k) => window.localStorage.removeItem(k), storedKey);

    // Closing restores what it displaced -- and now that the page yields room
    // rather than being covered, "restores" is a real claim with a real way to
    // get it wrong: a page left shifted with no panel on it. Both mechanisms
    // reverse exactly (a margin, a `display: none`), and the class that drives
    // them comes off in the dialog's own `close` handler.
    //
    // WAITED FOR, not sampled. `close` is fired from a queued element task, so
    // it lands one task after the click returns -- read immediately and this
    // check sees the page still shifted and fails on correct code. (Measured:
    // that is exactly what the first version of this did, and what a probe
    // without the wait reported as a regression that was not there.)
    await page.locator("#flyout-close").click();
    await page.waitForFunction(
      () => !document.body.classList.contains("flyout-open"),
      null, { timeout: 5000 }).catch(() => {});
    const paneClosed = await page.locator("#topopane").boundingBox();
    const railsClosed = await rails();
    push("closing the flyout puts the page back exactly -- the nav rail, the " +
      "DAG pane's box and the drawing's box all as they were",
      !(await page.locator("#annotate-flyout").evaluate((n) => n.open)) &&
      await page.locator("#navtree").isVisible() &&
      paneClosed.x === paneBefore.x && paneClosed.width === paneBefore.width &&
      railsClosed.left === railsBefore.left &&
      railsClosed.visible === railsBefore.visible);

    // --- out to the whole annotator (deliverable 4) ------------------------
    //
    // Jeff: "There can be a separate link that opens the full viewer (with the
    // full fledged menus etc) in a separate tab/page." Not clicked: a real
    // target="_blank" navigation would open a tab this suite then has to chase.
    // What matters is that it carries the SAME params the panel booted with,
    // which is the thing that can silently rot -- it is set per launch, so a
    // re-drive from another row must re-point it.
    await page.locator("#study-3d").click();
    await page.waitForSelector("#annotate-flyout[open]", { timeout: 5000 });
    const fullpage = page.locator("#flyout-fullpage");
    const studyHref = await fullpage.getAttribute("href");
    push("the flyout head carries a plain new-tab link out to the full page",
      await fullpage.count() === 1 &&
      await fullpage.getAttribute("target") === "_blank" &&
      await fullpage.getAttribute("rel") === "noopener" &&
      /Open full page/.test((await fullpage.textContent()) || ""));
    push("...pointed at the same url the panel booted with",
      studyHref === frameSrc);
    // House rule: no internal file or module name in user-facing copy.
    push("its label names no file, module or param",
      !/index\.html|annotate\.js|topology=|\?/.test(
        (await fullpage.textContent()) || ""));

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
    // The merged cell prints the part's NAME, not its id, since 2026-09-15
    // (VA.componentLabel) -- `base` was the id and is nowhere a reader reads.
    await page.locator("td.tvcell--component").filter({ hasText: /^base plate$/ })
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

    // --- [real] adjacency against a LIVE study's own drawing ----------------
    //
    // Everything above runs at ?mock=1, whose DAG drawing is ~78px wide. That
    // is enough to catch the panel lying on top of the diagram, but it can
    // never exercise the measurement that decides the clamp: `graphNeed()`
    // reads `svg.tv__rails`, and at 78px the floor (VA.FLYOUT_WIDTH.reserve,
    // 320) wins every time, so a mock-only suite is silent about whether the
    // drawing is measured at all. The review that found this blocker said so
    // in as many words: "the fixture has to be able to discriminate".
    //
    // This leg is non-mock on the SAME repo-root server, so the http transport
    // finds the live projections under /data/ (served from DATA_REPO, the
    // worktree escape hatch) and `pitch_system` renders its real 262px
    // drawing -- the widest of the 21 live studies, measured.
    //
    // Skipped honestly, not silently, where the projection is absent: the
    // [real] convention this file uses everywhere else.
    if (!topologies) {
      push("[real] SKIPPED -- no data/projections/viewer/topologies.json " +
        "(gitignored, main checkout only; pass --repo)", true);
    } else {
      await page.goto(url + "/apps/viewer/topology.html", { waitUntil: "load" });
      await page.waitForSelector('[data-nav-kind="study"]', { timeout: 20000 });
      const liveStudy = "pitch_system_blade_angle_average";
      const liveRow = page.locator(navRow("study", liveStudy));
      if (await liveRow.count() !== 1) {
        push(`[real] SKIPPED -- the live projection has no study ${liveStudy}`, true);
      } else {
        await liveRow.click();
        push("[real] the live study's respine settles", await paneSettled());
        await page.waitForSelector("#study-3d", { timeout: 20000 });
        const liveRailsBefore = await page.evaluate(() => {
          const r = document.querySelector("#topopane svg.tv__rails").getBoundingClientRect();
          return { w: Math.round(r.width), left: Math.round(r.left) };
        });
        // The number the whole blocker turned on: the drawing is a couple of
        // hundred pixels wide and the panel's own FLOOR is 560, so an
        // overlaying panel covers it whole at every width a reader can reach.
        push("[real] the live drawing is narrower than the panel's own floor -- " +
          "which is why an overlay could never leave any of it showing",
          liveRailsBefore.w > 0 &&
          liveRailsBefore.w < await page.evaluate(
            () => window.ViewerApp.FLYOUT_WIDTH.min));
        await page.locator("#study-3d").click();
        await page.waitForSelector("#annotate-flyout[open]", { timeout: 10000 });
        const livePanel = await page.locator("#annotate-flyout").boundingBox();
        const liveRails = await page.evaluate(() => {
          const r = document.querySelector("#topopane svg.tv__rails").getBoundingClientRect();
          const p = document.querySelector("#annotate-flyout").getBoundingClientRect();
          return { w: Math.round(r.width), left: Math.round(r.left), clear: r.left >= p.right };
        });
        push("[real] the whole live drawing is clear of the panel, at its own " +
          "measured width",
          liveRails.w === liveRailsBefore.w && liveRails.clear &&
          liveRails.left >= livePanel.width);
        // ...and dragged as wide as it will go, still clear. This is the leg
        // the mock cannot run: at 262px the drawing is under the floor, so
        // what bounds the panel here is the same arithmetic either way -- but
        // the WIDTH being fed to it is now a real measurement, and a
        // graphNeed() that returned 0 or read the wrong node would show up as
        // a panel that ate the diagram.
        const seam = await page.locator("#flyout-divider").boundingBox();
        await page.mouse.move(seam.x + seam.width / 2, seam.y + 300);
        await page.mouse.down();
        await page.mouse.move(seam.x + seam.width / 2 + 2000, seam.y + 300, { steps: 10 });
        await page.mouse.up();
        const liveMaxed = await page.evaluate(() => {
          const r = document.querySelector("#topopane svg.tv__rails").getBoundingClientRect();
          const p = document.querySelector("#annotate-flyout").getBoundingClientRect();
          return { w: Math.round(r.width), clear: r.width > 0 && r.left >= p.right };
        });
        push("[real] dragged to the clamp on a live study, the whole drawing " +
          "is still clear", liveMaxed.clear);
        await page.locator("#flyout-close").click();
        await page.waitForFunction(
          () => !document.body.classList.contains("flyout-open"),
          null, { timeout: 5000 }).catch(() => {});
        await page.evaluate((k) => window.localStorage.removeItem(k),
          await page.evaluate(() => window.ViewerApp.FLYOUT_WIDTH_KEY));
      }
    }

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
    await paneSettled();
    // The respine is waited out above. This beat is for the OTHER thing the
    // click starts -- the annotate-mount probe, which resolves false at once
    // under file:// and re-renders the toolbar when it lands. It was never a
    // stand-in for the transition: 300 ms happens to clear the 260 ms
    // duration, which is the only reason THIS half never failed.
    await page.waitForTimeout(300);
    push("under file:// the study affordance stays the pre-flyout link",
      await page.locator("#study-3d").count() === 0 &&
      await page.locator("#toolbar a").count() === 1);
    await page.locator("tr.tvrow[data-id='arm_pin_to_tip'] .tvcell--name").click();
    await page.waitForSelector("a.detail__annotate-link", { timeout: 5000 });
    push("under file:// the edge pane keeps the annotate-this link",
      await page.locator("a.detail__annotate-link").count() === 1 &&
      await page.locator("button.detail__annotate-btn").count() === 0);
    // The merged cell prints the part's NAME, not its id, since 2026-09-15
    // (VA.componentLabel) -- `base` was the id and is nowhere a reader reads.
    await page.locator("td.tvcell--component").filter({ hasText: /^base plate$/ })
      .first().click();
    await page.waitForSelector("#croppop a.hovercard__3d", { timeout: 5000 });
    push("under file:// a card's 3D affordance stays the plain new-tab link",
      await page.locator("#croppop a.hovercard__3d").count() === 1 &&
      await page.locator("#croppop button.hovercard__3d").count() === 0 &&
      await page.locator("#croppop a.hovercard__3d").getAttribute("target") === "_blank");

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- the annotator's rail: scoped to one element, and a face that can be
// deselected (handoff flyout_resize_annotator_filter_and_deselect, 2 and 3) ---
//
// What only a real browser can prove about these two:
//
//   1. The rail really IS filtered. Both panels are rendered from live state
//      by app.js (an ES module, three.js, a WebGL context) -- there is no shim
//      tier that can load this app at all, so "the parts panel lists one mesh
//      instead of every installed one" is checkable here and nowhere else.
//   2. The pick tint really comes off. The bug was that `state.currentPick`
//      and the orange in the COLOUR BUFFER disagreed, and that buffer exists
//      only in a real GL context. Read through `window.__scene` (app.js, the
//      autotest convention), and read as the buffer --
//      `geometry.attributes.color` against `userData.baseColors` -- NOT as
//      `scene.highlightedFace()`, which reports `_lastPick` and is therefore
//      the bookkeeping half of the very pair under test. The first version of
//      this suite read the flag and the mutation-witness runner caught it
//      passing over a mesh that was still orange.
//   3. A click into EMPTY SPACE clears it -- a real pointer into the canvas,
//      through the real raycaster, which is the gesture Jeff performed
//      ("I accidentally clicked a face").
//
// ?mock=1 throughout: FSA cannot be granted from an automated browser, and the
// mock fixture is built for this (one bound edge, one unbound, one
// owner-not-in-set, one installed mesh, one raycastable triangle).
async function testAnnotateRail(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}/apps/annotate/index.html`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const rows = () => page.locator("#element-list li.el-row");
  const parts = () => page.locator("#parts-panel li.part-row");
  try {
    // --- unfiltered: what the rail has always shown ------------------------
    await page.goto(url + "?mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    const allRows = await rows().count();
    const allParts = await parts().count();
    push("unfiltered, the rail lists the whole study and every installed mesh",
      allRows === 3 && allParts === 1);
    push("...and says nothing about filtering, because nothing is filtered",
      !(await page.locator("#rail-filter").isVisible()));

    // --- one alert badge per row, details on hover (deliverable 5) ---------
    //
    // The rail printed the raw state VALUE on each row until 2026-09-16 --
    // `owner_not_in_set`, underscores and all, on a surface a reader reads.
    const badges = page.locator("#element-list .alertbadge");
    push("two of the three rows have something to admit, and each wears ONE " +
      "badge; the bound row wears none",
      await badges.count() === 2);
    const rowText = await page.locator("#element-list").textContent();
    push("no row prints a schema value any more",
      !/owner_not_in_set|needs_re_confirmation/.test(rowText || ""));
    // The colour signal Jeff asked to KEEP on the row, asserted as computed
    // style: a class-name check would pass through a stylesheet typo, and the
    // colour is now the row's only at-a-glance state marker.
    const stripes = await page.locator("#element-list li.el-row").evaluateAll(
      (nodes) => nodes.map((n) => getComputedStyle(n).borderLeftColor));
    push("each row still carries its state as a colour, and the three states " +
      "are three different colours",
      new Set(stripes).size === 3);
    // ...and none of them is the UNSTYLED fallback. Distinctness alone cannot
    // see a per-state rule going missing: `.el-row`'s own neutral border is a
    // fourth colour, so a state that lost its rule stays distinct from the
    // other two while saying nothing. Measured against a clone stripped of its
    // state class rather than against a hard-coded hex, so the stylesheet stays
    // the one place that colour lives. (The mutation-witness runner found this:
    // neutralising one state's rule left the check above green.)
    const unstyled = await page.evaluate(() => {
      const row = document.querySelector("#element-list li.el-row");
      const clone = row.cloneNode(false);
      clone.className = "el-row";
      row.parentNode.appendChild(clone);
      const colour = getComputedStyle(clone).borderLeftColor;
      clone.remove();
      return colour;
    });
    push("...and no state has quietly fallen back to the unstyled border",
      stripes.every((colour) => colour !== unstyled));

    await badges.first().hover();
    await page.waitForSelector("#alert-pop", { state: "visible", timeout: 5000 });
    const popText = await page.locator("#alert-pop").textContent();
    push("hovering the badge opens a popup that says the alert in everyday words",
      /No face is bound/.test(popText || ""));
    push("...and the popup carries no schema value either",
      !/unbound|_/.test(popText || ""));
    const popBox = await page.locator("#alert-pop").boundingBox();
    const railBox = await page.locator(".an__rail").boundingBox();
    // The reason the popup is one shared position:fixed node instead of a
    // child of the row: the rail is a scrollport, so an in-row popup would be
    // clipped to its width. Measured, because that is a layout claim.
    push("the popup escapes the rail's scrollport rather than being clipped " +
      "inside it",
      popBox && railBox && popBox.x + popBox.width > railBox.x + railBox.width);

    // --- the rail scoped to ONE element (deliverable 2) --------------------
    //
    // The deep link's own shape, which is also the flyout's: arrive AT an
    // element. Jeff: "it should also auto-filter the left side menu to just
    // the features that are in the element (node or edge) it was entered from."
    await page.goto(url + "?mock=1&topology=demo_system&edge=demo_edge_untraced",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    push("arriving at an edge scopes the element list to that one element",
      await rows().count() === 1);
    // NOTE, because it decides which check owns this guard: the mock fixture
    // installs exactly ONE mesh, so "filtered to 1" and "unfiltered, 1" are the
    // same number and this check cannot on its own tell a working filter from a
    // missing one. The discriminating case is the no-installed-mesh edge below
    // (1 -> 0), which is what `parts-panel-honours-the-element-scope` declares
    // as its witness. Kept anyway: it is the shape a reader of this suite
    // expects to see asserted, and it fails if the panel empties wrongly.
    push("...and the parts panel to the parts that element names -- the panel " +
      "that was scoped by nothing at all before",
      await parts().count() === 1);
    const scopeText = await page.locator(".an__filter-note").textContent();
    push("the rail says what it is scoped to, by the element's own name",
      /Showing only/.test(scopeText || "") &&
      /Demo untraced edge/.test(scopeText || ""));
    // Scoped to the NOTE, not to the whole bar, because the claim is only true
    // of the note: the bar's gap line ("No installed 3D part for: …") does name
    // a part id, and correctly -- on this surface a part id is the author's own
    // vocabulary (it is what `isolate=` takes and what they will tessellate
    // next), the same posture setSceneEmptyState already takes. A check whose
    // claim is wider than what it reads is the kind that gets "fixed" by
    // deleting the useful half.
    push("...and the element is named, not identified: no id, file or param",
      !/demo_edge_untraced|index\.html|topology=/.test(scopeText || ""));

    // The control that lifts it, which exists only while there is something to
    // lift (standing rule: an absent feature shows NOTHING).
    await page.locator("#rail-filter .an__filter-clear").click();
    push("Show all lifts the filter -- both panels come back",
      await rows().count() === allRows && await parts().count() === allParts);
    push("...and the scope bar goes away with it",
      !(await page.locator("#rail-filter").isVisible()));

    // The honest-absence case: an element whose part has no installed mesh.
    // An empty parts panel with no reason for it would be the silent drop this
    // repo keeps paying for.
    await page.goto(url + "?mock=1&topology=demo_system&edge=demo_edge_no_owner",
      { waitUntil: "load" });
    await page.waitForSelector("#rail-filter", { state: "visible", timeout: 15000 });
    push("an element whose part has no installed mesh filters the parts panel " +
      "to nothing AND says why",
      await parts().count() === 0 &&
      /No installed 3D part for/.test(
        (await page.locator("#rail-filter").textContent()) || ""));

    // --- a face can be deselected (deliverable 3) --------------------------
    await page.goto(url + "?mock=1&topology=demo_system&edge=demo_edge_untraced" +
      "&isolate=demo_triangle", { waitUntil: "load" });
    await page.waitForSelector("#parts-panel li.part-row", { timeout: 15000 });
    const sha = await page.evaluate(() => window.AnnotateApp.FIXTURES.demoSha);

    // IS THE MESH ACTUALLY TINTED -- read off the live colour attribute, not
    // off `scene.highlightedFace()`. That distinction is the whole guard and I
    // got it wrong first: `highlightedFace()` reports `_lastPick`, which is
    // BOOKKEEPING, and the bug being fixed was precisely the bookkeeping and
    // the colour buffer disagreeing. The mutation-witness runner caught it --
    // deleting `restoreColors` from `clearHighlight` left the flag being
    // cleared, so the check stayed green over a mesh that was still orange.
    const tinted = () => page.evaluate((s) => {
      const mesh = window.__scene.parts.get(s);
      const live = mesh.geometry.attributes.color.array;
      const base = mesh.userData.baseColors;
      for (let i = 0; i < base.length; i++) {
        if (live[i] !== base[i]) return true;
      }
      return false;
    }, sha);

    push("the mesh starts at its own colours", !(await tinted()));
    await page.evaluate((s) => window.AnnotateApp.exec(["select-face", s, "0"]), sha);
    const picked = await page.evaluate(() => window.__scene.highlightedFace());
    push("select-face tints the face -- in the colour buffer, not just in the " +
      "pick state",
      await tinted() && picked && picked.faceId === 0 && picked.sha256 === sha);
    push("...and the detail pane says which face is picked",
      /Picked: part/.test((await page.locator("#detail").textContent()) || ""));

    // THE BUG, and the verb that fixes it. Before this handoff the pick state
    // cleared and the orange stayed: `restoreColors` was reachable only from
    // inside `highlightFace`, on its way to tinting the NEXT face.
    await page.evaluate(() => window.AnnotateApp.exec(["deselect"]));
    push("deselect puts the mesh back to its own colours -- the tint, not just " +
      "the pick state, which is the pair that used to disagree",
      !(await tinted()) &&
      (await page.evaluate(() => window.__scene.highlightedFace())) === null);
    push("...and the detail pane agrees it is unpicked",
      /No face picked yet/.test((await page.locator("#detail").textContent()) || ""));

    // A REAL pointer into the geometry, and then back onto the same face: the
    // toggle. Two pieces of setup, both of them about the FIXTURE and neither
    // about the app:
    //
    //   1. ORBIT first. The mock mesh is one triangle in the z = 0 plane, and
    //      `frameParts`' default placement looks at it along -Y with up = +Z --
    //      exactly edge-on, so it renders as a hairline and a ray aimed at its
    //      centroid GRAZES it: measured, `pick()` at the projected centroid
    //      answers true or false depending on whether the y coordinate comes
    //      out as 0 or as 1.3e-16. That is a degenerate target, not a broken
    //      pick, so the camera is moved to face the triangle first -- which is
    //      also what a reader does with the mouse before clicking anything.
    //      (The mock mesh being invisible at rest is its own small defect:
    //      ISSUE_20260916_the_mock_annotator_mesh_is_edge_on_to_its_own_
    //      default_camera.)
    //   2. Where the face is on screen is COMPUTED, not hunted for. At ~51
    //      units off a 1-unit triangle it lands about 0.05 NDC across, so a
    //      grid walk coarse enough to be fast misses it and one fine enough to
    //      find it is ~900k raycasts. `Vector3.project` is three.js's, reached
    //      off a vector already on the mesh (this page has no THREE global to
    //      import), and the aim is CONFIRMED with the scene's own raycaster
    //      before anything is clicked -- otherwise a bad aim would report
    //      itself as "deselect is broken".
    const hit = await page.evaluate((s) => {
      const scene = window.__scene;
      const mesh = scene.parts.get(s);
      const box = mesh.geometry.boundingBox;
      const cx = (box.min.x + box.max.x) / 2 + mesh.position.x;
      const cy = (box.min.y + box.max.y) / 2 + mesh.position.y;
      const cz = (box.min.z + box.max.z) / 2 + mesh.position.z;
      scene.camera.position.set(cx, cy, cz + 40);
      scene.camera.lookAt(cx, cy, cz);
      scene.controls.target.set(cx, cy, cz);
      scene.controls.update();
      scene.camera.updateMatrixWorld(true);

      const centroid = mesh.userData.manifest.faces[0].centroid_native;
      const point = mesh.position.clone();
      point.set(centroid[0] + mesh.position.x,
                centroid[1] + mesh.position.y,
                centroid[2] + mesh.position.z);
      point.project(scene.camera);
      if (!scene.pick(point.x, point.y)) return null;
      const rect = document.querySelector("#canvas-host canvas").getBoundingClientRect();
      return {
        x: rect.left + ((point.x + 1) / 2) * rect.width,
        y: rect.top + ((1 - point.y) / 2) * rect.height,
      };
    }, sha);
    push("the tier can find the triangle on screen, so the clicks below are " +
      "real ones on real geometry", hit !== null);
    if (hit) {
      await page.mouse.click(hit.x, hit.y);
      push("a real click on the face tints it",
        await tinted() &&
        (await page.evaluate(() => window.__scene.highlightedFace())) !== null);
      await page.mouse.click(hit.x, hit.y);
      push("clicking the SAME face again toggles it off -- Jeff's own gesture " +
        "after a mis-click",
        !(await tinted()) &&
        (await page.evaluate(() => window.__scene.highlightedFace())) === null);

      // ...and a click into empty space. The canvas corner: the raycaster
      // returns null there, which used to clear the pick and leave the orange.
      await page.mouse.click(hit.x, hit.y);
      const canvasBox = await page.locator("#canvas-host canvas").boundingBox();
      await page.mouse.click(canvasBox.x + 6, canvasBox.y + 6);
      push("a click into empty space clears the tint as well as the pick",
        !(await tinted()) &&
        (await page.evaluate(() => window.__scene.highlightedFace())) === null &&
        /No face picked yet/.test((await page.locator("#detail").textContent()) || ""));
    }

    // The element row's own clear path, which had none either. This page
    // arrived through `goto`, so its one row is ALREADY selected -- which is
    // the state a reader reaches from the flyout and the state that had no way
    // out of it.
    push("arriving through a deep link leaves the element selected",
      await page.locator("#element-list li.el-row.selected").count() === 1);
    await page.locator("#element-list li.el-row").first().click();
    push("clicking the SELECTED row deselects it",
      await page.locator("#element-list li.el-row.selected").count() === 0);
    await page.locator("#element-list li.el-row").first().click();
    push("...and clicking it again selects it -- the row is a toggle, not a " +
      "one-way door",
      await page.locator("#element-list li.el-row.selected").count() === 1);

    // ...and the alert badge inside a row must not be a second way to select:
    // it is a disclosure.
    await page.goto(url + "?mock=1", { waitUntil: "load" });
    await page.waitForSelector("#element-list li.el-row", { timeout: 15000 });
    await page.locator("#element-list .alertbadge").first().click();
    push("clicking the alert badge opens its popup and does NOT select the row",
      await page.locator("#alert-pop").isVisible() &&
      await page.locator("#element-list li.el-row.selected").count() === 0);

    push("no page error anywhere in the run", errors.length === 0);
    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
async function testAnnotateHostedPosture(browser, label) {
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });
  // "Is this element on the page at all?" -- NOT locator.isVisible(), which
  // answers "does it have a non-empty box" and calls an empty <ul> or an
  // empty <select> invisible. Both are legitimately zero-height on the
  // loopback page before a folder is granted, and that page is the
  // discriminating half of every withholding check below, so the question has
  // to be the one actually being asked: offsetParent is null for an element
  // inside a display:none subtree and non-null for an empty one that still
  // renders.
  const rendered = (page, selector) => page.evaluate((sel) => {
    const node = document.querySelector(sel);
    return !!node && node.offsetParent !== null;
  }, selector);
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

    // --- and nothing else on the page instructs an action it has ruled out --
    //
    // (handoff annotate_hosted_page_posture, ISSUE_20260915_the_hosted_
    // annotate_page_still_instructs_the_reader_to_bind_a_face.) The banner was
    // made honest first and the page under it did not move with it, so the
    // page said "annotating is not available here" and, two inches below, told
    // the reader how to annotate. Every check above looks for something ABSENT
    // from the SENTENCE; these look at the page, element by element, because
    // the whole point is that a true sentence is not enough on its own.
    //
    // Element by element rather than one assertion on the container that
    // actually gets hidden, on purpose: the contract is about what a reader
    // can see, so it survives the workspace being withheld a different way
    // later (per column, or removed from the DOM) and still fails if one
    // column is forgotten.
    push("the bind instruction is gone -- it named a 3D view this origin does not have",
      !(await rendered(page, "#detail")));
    push("no topology picker is offered for data this page cannot load",
      !(await rendered(page, "#topology-select")));
    push("nor a study picker",
      !(await rendered(page, "#study-select")));
    push("no element list or parts panel either",
      !(await rendered(page, "#element-list")) &&
      !(await rendered(page, "#parts-panel")));
    push("there is no 3D pane standing empty where the hint pointed",
      !(await rendered(page, "#canvas-host")) &&
      await page.locator("canvas").count() === 0);
    // The console is the one that was WIRED, not merely visible -- main() bound
    // its click and Enter handlers before the hosted early-return, so a hosted
    // reader had a live command line into an app with no storage behind it. A
    // hidden-but-live control is a different defect from a misleading hint, so
    // both halves are asserted: withheld, and never wired in the first place.
    push("the dev console is not shown",
      !(await rendered(page, "#console-input")) &&
      !(await rendered(page, "#console-run")));
    push("and it was never wired -- no live handler behind the withheld control",
      await page.evaluate(() => document.querySelector("#console-run").onclick === null &&
        document.querySelector("#console-input").onkeydown === null));

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
    // The discriminating half of the withholding above: on the origin that CAN
    // annotate, the whole workspace is there and the console is live, before a
    // folder has even been granted. Without this, "hide everything, always"
    // would pass every one of the hosted checks.
    push("the same page on loopback still has the full bind workspace",
      await rendered(page, "#detail") &&
      await rendered(page, "#topology-select") &&
      await rendered(page, "#study-select") &&
      await rendered(page, "#element-list") &&
      await rendered(page, "#parts-panel") &&
      await rendered(page, "#canvas-host") &&
      await rendered(page, "#console-input") &&
      await rendered(page, "#console-run"));
    push("and the 3D view the bind instruction names really is there",
      await page.locator("#canvas-host canvas").count() === 1);
    push("and its dev console is wired there",
      await page.evaluate(() => document.querySelector("#console-run").onclick !== null &&
        document.querySelector("#console-input").onkeydown !== null));

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- the crop lightbox (crop_lightbox_zoom_viewer, 2026-09-16) -------------
//
// Jeff: "thumbnail is too small to be legible… Maybe a button in the thumbnail
// that lets you launch it into a separate, full size viewer … that allows you
// to zoom/pan?"
//
// What this proves that the fast tier cannot, and it is the whole reason the
// feature has a browser suite of its own: the fast tier has NO LAYOUT, so it
// can only state the zoom claim as arithmetic ("the box's position within the
// picture is the same fraction at every scale"). Here the fraction is measured
// off two `getBoundingClientRect()`s and compared against the crop index's own
// `highlights[].frac` — the number the crop builder wrote. A transform applied
// to the picture but not to the overlay, a height cap that letterboxes the
// picture inside its element, an origin at the wrong corner: every one of them
// is a green fast tier and a wrong picture, and every one of them moves that
// fraction.
//
// SERVED mode over a repo-root static server, never ?mock=1: a launcher only
// exists on a figure that HAS an image, and the mock adapter carries no PNGs at
// all. The subject is derived from the live crop index rather than named — the
// first topology edge whose crop is a `declared_region` on a datasheet table,
// which is the highlighted-cell case the note was about.
//
// Its OWN server, not the shared `repoRootBaseUrl`, and that is not tidiness:
// the `served mode` suite closes the shared one mid-run on purpose (its
// mid-session-stop fixture), so a later suite pointed at it gets
// ERR_CONNECTION_REFUSED and nothing to do with this feature. Measured here
// first go. `testAnnotateRail` already starts its own for the same reason.
async function testCropLightbox(browser, label, realProjection, realCrops) {
  if (!realProjection || !realCrops) {
    console.log(`[${label}] SKIP: topologies.json/crops.json not built under ` +
      "the target repo -- build them, or pass --repo <main checkout>");
    return { label, ok: true };
  }
  // The row to drive, and the number its picture must agree with. Derived, so
  // this suite follows the data rather than pinning an id that a rebuild can
  // retire.
  let target = null;
  for (const topology of realProjection.topologies) {
    for (const edge of topology.edges || []) {
      const key = edge.crop_key;
      if (!key) continue;
      const space = key.stack
        ? (realCrops.by_stack || {})[key.stack]
        : (realCrops.by_topology || {})[key.topology];
      const entry = space ? space[key.element || key.edge] : null;
      if (!entry || entry.status !== "resolved" || !entry.png) continue;
      if (!(entry.highlights || []).length) continue;
      if (entry.located_by !== "declared_region") continue;
      target = { topology: topology.id, edge: edge.id, entry };
      break;
    }
    if (target) break;
  }
  if (!target) {
    console.log(`[${label}] SKIP: no live topology row reaches a declared-region ` +
      "crop with a highlight on it");
    return { label, ok: true };
  }

  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  // Where the first highlight box actually lands on the picture, as a fraction
  // of the picture's own box -- which is what `highlights[].frac` IS.
  const measure = () => page.evaluate(() => {
    const figure = document.querySelector("#crop-lightbox div.cropfig");
    const img = figure && figure.querySelector("img");
    const box = figure && figure.querySelector("div.crophl");
    if (!figure || !img || !box) return null;
    const i = img.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    const handle = window.ViewerApp.openCropLightboxHandle();
    // The STAGE's box and the highlight's own edge come back alongside the
    // fractions, because three of this feature's four geometric wiring lines
    // are claims about the picture's place IN the stage and about the weight
    // of the frame around it -- and the `frac` checks below are invariant to
    // all of them by design (the overlay is positioned in percentages of the
    // <img>, so the fraction is right whatever size, position or border the
    // picture ends up with). That invariance is the feature's central claim
    // and it is correct; it is also why it cannot be the pin for anything
    // about the frame itself. Measured 2026-09-17: deleting the fit sizing,
    // the clamp or the whole `.lightbox .crophl` rule left every tier green
    // (ISSUE_20260917_the_crop_lightboxs_fit_clamp_and_hairline_are_
    // unwitnessed_in_every_tier).
    const stage = document
      .querySelector("#crop-lightbox div.lightbox__stage")
      .getBoundingClientRect();
    return {
      scale: handle ? handle.view().scale : null,
      image: { width: i.width, height: i.height, left: i.left, top: i.top },
      stage: { width: stage.width, height: stage.height,
               left: stage.left, top: stage.top },
      edge: parseFloat(getComputedStyle(box).borderTopWidth),
      frac: [
        (b.left - i.left) / i.width, (b.top - i.top) / i.height,
        (b.right - i.left) / i.width, (b.bottom - i.top) / i.height,
      ],
    };
  });
  // A fraction of a laid-out box against a fraction written by the builder:
  // the tolerance is sub-pixel at these sizes, not a fudge factor. 0.002 of a
  // 740px picture is 1.5px, which is what a border and a rounded width cost.
  const agrees = (got, want) => got && want &&
    got.every((v, i) => Math.abs(v - want[i]) < 0.002);

  try {
    await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="topology"]', { timeout: 20000 });
    await page.locator(navRow("topology", target.topology)).click();
    const row = `tr.tvrow[data-id="${target.edge}"]`;
    await page.waitForSelector(row, { timeout: 10000 });
    await page.locator(row).click();

    // 1. the affordance is really on the page, on the real crop.
    const paneLauncher = page.locator("#detail button.cropfig__launch");
    await paneLauncher.waitFor({ timeout: 20000 });
    push("the preview pane's crop carries the launch affordance", true);

    // 2. and it is a KEYBOARD affordance, not a hover-only one: focusable,
    // visible once focused (opacity: 0 leaves a button in the tab order, so
    // the focus rule is what stops it being an invisible control), and Enter
    // opens it.
    await paneLauncher.focus();
    await page.waitForFunction(() => {
      const button = document.querySelector("#detail button.cropfig__launch");
      return button && Number(getComputedStyle(button).opacity) > 0.9;
    }, null, { timeout: 5000 }).catch(() => {});
    const focused = await page.evaluate(() => {
      const button = document.querySelector("#detail button.cropfig__launch");
      return { active: document.activeElement === button,
               opacity: Number(getComputedStyle(button).opacity) };
    });
    push("the launcher takes keyboard focus and becomes visible when it does " +
      "— an affordance only a pointer can find is half a page unusable",
      focused.active && focused.opacity > 0.9);
    await page.keyboard.press("Enter");
    await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
    push("Enter on the focused launcher opens the lightbox", true);
    await page.waitForFunction(() => {
      const box = document.querySelector("#crop-lightbox div.crophl");
      return box && box.getBoundingClientRect().width > 0;
    }, null, { timeout: 10000 });

    // 3. the picture is at FULL SIZE -- bigger than the thumbnail it was
    // launched from, which is the complaint this whole surface answers.
    const thumb = await page.locator("#detail div.cropfig img").boundingBox();
    const fit = await measure();
    // Both axes, and by AREA rather than by a width factor: a tall datasheet
    // crop fits by its HEIGHT, so the width gain over a 520px preview pane is
    // modest while the area gain is not -- the first take of this check
    // demanded 1.5x on width alone and failed on a picture that had genuinely
    // more than doubled in area. Measured on the live NAS grip table at
    // 1600x1000: pane thumbnail 520x593, lightbox 742x846.
    const grew = fit && thumb &&
      fit.image.width > thumb.width && fit.image.height > thumb.height &&
      (fit.image.width * fit.image.height) > (thumb.width * thumb.height) * 1.8;
    if (!grew && fit && thumb) {
      console.log(`    thumbnail ${Math.round(thumb.width)}x` +
        `${Math.round(thumb.height)}, lightbox ` +
        `${Math.round(fit.image.width)}x${Math.round(fit.image.height)}`);
    }
    push("the lightbox's picture is larger than the thumbnail it was " +
      "launched from, on both axes and by most of an order of magnitude in " +
      "area — 'too small to be legible' is the complaint this surface " +
      "answers, so the size is measured and not assumed", grew);
    push("it opens at FIT, the whole crop on screen, not at some remembered " +
      "zoom", fit && fit.scale === 1);
    // THE CLAMP, at fit, measured off the page and not off the view store.
    //
    // The line is `view = VA.lightboxClamp(view, fit, stageBox())` in
    // `apply()`, and deleting it left all three tiers green on 2026-09-17 --
    // including the sub-check directly above, whose NAME is the claim. That is
    // the whole lesson of the issue: `fit.scale` is `handle.view().scale`, and
    // it is 1 in both the clamped and the unclamped states because nothing
    // about where the picture sits reaches `scale`. So this asks the two rects
    // instead (docs/prompts/REVIEW_AGENT.md, "A `[real]` test that asks the
    // view-model instead of the page").
    //
    // THE BROWSER TIER AND NOT THE FAST TIER, chosen per line: unlike the fit
    // sizing -- a computed value, pinned in `apps/viewer/tests.js` off a
    // declared stage box -- this claim is "no blank stage beside the picture",
    // which is two laid-out rects. In the fast tier the picture's position
    // would have to be re-derived from the same numbers `apply()` used, which
    // is the view-model shape again wearing different clothes.
    //
    // Centred on the SLACK axis only: the crop fits by its height here (742 x
    // 846 in a 1518 x 845.5 stage), so the height has no slack to centre in
    // and the width has 776px of it. Measured on the live sheet: gaps of
    // 388.08 and 387.92, against 0 and 776 with the line gone.
    const slack = fit && {
      left: fit.image.left - fit.stage.left,
      right: (fit.stage.left + fit.stage.width) - (fit.image.left + fit.image.width),
    };
    if (slack && !(slack.left > 1 && Math.abs(slack.left - slack.right) <= 1)) {
      console.log(`    at fit the picture sits ${slack.left.toFixed(1)}px from ` +
        `the stage's left edge and ${slack.right.toFixed(1)}px from its right`);
    }
    push("at fit the picture is CENTRED in the stage, with the spare width " +
      "split evenly — the clamp's other job, and the one the check above " +
      "cannot see: `scale` is 1 whether or not the picture was ever " +
      "positioned, so a crop hard against the left edge with 776px of empty " +
      "stage beside it reads as a remembered pan",
      slack && slack.left > 1 && Math.abs(slack.left - slack.right) <= 1);

    // 4. THE claim: the box lands where the crop index says it does.
    push("at fit, the highlight box lands exactly on the rect the crop index " +
      "wrote — measured off the laid-out picture, against " +
      "`highlights[].frac` itself",
      agrees(fit && fit.frac, target.entry.highlights[0].frac));

    // 5. ...and it still does after a real wheel zoom.
    //
    // The wheel sits at the STAGE's centre, and the reason is the clamp, not
    // convenience: the anchor is honoured only where honouring it would not
    // leave blank stage (VA.lightboxClamp, which must win -- a reader cannot
    // be shown a gap). This crop's highlight is 0.005 of the way across the
    // sheet, so a zoom anchored on the box itself is clamped hard against the
    // left edge and the anchor legitimately moves. The first take of this
    // check measured that as a failure. The anchor's exact arithmetic is
    // pinned value-by-value in the fast tier; what is measured HERE is that
    // the wiring honours it where the clamp is not binding.
    const centre = await page.evaluate(() => {
      const s = document.querySelector("#crop-lightbox div.lightbox__stage")
        .getBoundingClientRect();
      return { x: s.left + s.width / 2, y: s.top + s.height / 2 };
    });
    // The point of the PICTURE that sits under the pointer, as a fraction of
    // the picture -- read off the laid-out boxes, never off the view store.
    const under = (m) => ({ x: (centre.x - m.image.left) / m.image.width,
                            y: (centre.y - m.image.top) / m.image.height });
    const before = under(fit);
    await page.mouse.move(centre.x, centre.y);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -120);
    await page.waitForFunction(() => {
      const handle = window.ViewerApp.openCropLightboxHandle();
      return handle && handle.view().scale > 2;
    }, null, { timeout: 10000 });
    const zoomed = await measure();
    push("a wheel over the picture really zooms it — the mechanism is a " +
      "transform on the wrapper, so this is the picture growing, not a " +
      "second image",
      zoomed && zoomed.scale > 2 && zoomed.image.width > fit.image.width * 2);
    push("zoomed, the highlight box STILL lands on the crop index's own rect " +
      "— the overlay rides the same transform as the picture and nothing " +
      "recomputes a `frac` into a pixel",
      agrees(zoomed && zoomed.frac, target.entry.highlights[0].frac));
    const after = zoomed && under(zoomed);
    push("what was under the pointer is still under the pointer after the " +
      "zoom — zooming about the stage's corner walks whatever the reader is " +
      "looking at off the edge",
      after && Math.abs(after.x - before.x) < 0.01 &&
      Math.abs(after.y - before.y) < 0.01);

    // THE HAIRLINE. `.lightbox .crophl` divides the border weight back out by
    // `--lightbox-scale` and drops the glow; deleting the whole rule left
    // every tier green on 2026-09-17, and what the reader gets is a 16px amber
    // frame at 8x lying across the very cell they zoomed in to read (the
    // lesson records measuring it at 7.59x).
    //
    // THE BROWSER TIER, and here there is no choice to make: the rule is a CSS
    // `calc()` over a custom property, and the fast tier has no stylesheet at
    // all -- it renders into a DOM shim. What that tier CAN see, and already
    // pins, is the other half: that `apply()` publishes `--lightbox-scale`
    // beside the transform.
    //
    // Asserted as "declared thinner the further in the reader goes", not as
    // "the painted edge is constant", because the engine will not paint a
    // sub-pixel border: measured on the live sheet, `borderTopWidth` is 2px at
    // 1x and 1px at both 5.06x and 8x -- Chrome's 1px floor under a computed
    // 0.395px and 0.25px. So the correction is a division, not a cancellation,
    // and the direction is the honest claim.
    const thinner = fit && zoomed && zoomed.scale > fit.scale &&
      zoomed.edge < fit.edge;
    if (!thinner && fit && zoomed) {
      console.log(`    the highlight's edge is ${fit.edge}px at ${fit.scale}x ` +
        `and ${zoomed.edge}px at ${zoomed.scale.toFixed(2)}x`);
    }
    push("the highlight's edge is declared THINNER the further the reader " +
      "zooms in — the transform scales borders along with everything else, so " +
      "without dividing the weight back out a 2px frame is a 16px amber band " +
      "over the cell that was zoomed in on", thinner);
    // `.lightbox .crophl` also drops the GLOW, and there is deliberately no
    // sub-check for that here, because on THIS target there could not be an
    // honest one: the subject is derived as a `declared_region` crop (see the
    // top of this suite), `declared_region` is `solid: false`
    // (VA.CROP_HIGHLIGHT_KINDS), and views/crop.js therefore classes its box
    // `.crophl--dashed` -- whose own rule sets `box-shadow: none`. So a glow
    // assertion on this picture passes whether or not the lightbox rule
    // exists, which is green for the wrong reason and the exact shape of
    // defect this whole handoff was about. Measured 2026-09-18: deleting the
    // rule reddens the edge check above and leaves a glow check passing.
    // The 29 live `verified_match` highlights ARE solid and do carry the glow,
    // so the claim is real on those -- filed rather than built here, because
    // it needs a second subject and a second open:
    // ISSUE_20260918_the_lightboxs_glow_suppression_is_only_witnessable_on_a_solid_highlight.

    // 6. a drag really pans, and the overlay comes with it.
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.mouse.move(centre.x - 180, centre.y - 120, { steps: 8 });
    await page.mouse.up();
    const panned = await measure();
    push("dragging pans the picture", panned &&
      Math.abs(panned.image.left - zoomed.image.left) > 60);
    push("panned, the highlight box is still on its rect",
      agrees(panned && panned.frac, target.entry.highlights[0].frac));

    // ...and the clamp's OTHER half, which the 180px drag above is too short
    // to reach: a drag cannot open blank stage beside the picture. Deliberately
    // over-long -- 3000px on a 1518px stage, so an unclamped view would have
    // walked the picture most of the way off screen.
    await page.mouse.move(centre.x, centre.y);
    await page.mouse.down();
    await page.mouse.move(centre.x + 3000, centre.y + 3000, { steps: 10 });
    await page.mouse.up();
    const shoved = await measure();
    const gaps = shoved && {
      left: shoved.image.left - shoved.stage.left,
      top: shoved.image.top - shoved.stage.top,
    };
    if (gaps && !(gaps.left <= 1 && gaps.top <= 1)) {
      console.log(`    after a 3000px drag the picture is ${gaps.left.toFixed(1)}` +
        `px right of the stage's left edge and ${gaps.top.toFixed(1)}px below ` +
        "its top");
    }
    push("a drag cannot pull blank stage into view — zoomed in, the picture " +
      "covers the stage, and the clamp is what stops an over-long gesture " +
      "walking it off the edge and leaving the reader holding nothing",
      shoved && shoved.scale > 1 && gaps.left <= 1 && gaps.top <= 1);
    // Back to fit, so the sub-checks below start where they did before this
    // gesture was added: the two card/Fit routes that follow measure a freshly
    // opened lightbox, and a shoved view would be a different starting state.
    await page.locator("#crop-lightbox button.lightbox__btn--fit").click();

    // 7. no page scroll bleed while it is open, and the page is handed back
    // exactly as it was on close -- through the dialog's own `close` event,
    // which is the one seam every dismissal goes through.
    const whileOpen = await page.evaluate(
      () => getComputedStyle(document.body).overflow);
    push("the page behind the lightbox cannot scroll while it is open — a " +
      "modal <dialog> makes the page inert but does not reliably stop it " +
      "scrolling", whileOpen === "hidden");
    await page.keyboard.press("Escape");
    // Waited for on the body class, not on `open`: Escape drops `open`
    // synchronously and the `close` event that reverses the page is a queued
    // task, so reading the class the instant `open` goes false reads it one
    // task early.
    await page.waitForFunction(
      () => !document.querySelector("#crop-lightbox").open &&
            !document.body.classList.contains("lightbox-open"),
      null, { timeout: 5000 }).catch(() => {});
    const afterClose = await page.evaluate(() => ({
      open: document.querySelector("#crop-lightbox").open,
      overflow: getComputedStyle(document.body).overflow,
    }));
    push("Escape closes it and the page's scroll comes back",
      !afterClose.open && afterClose.overflow !== "hidden");

    // 8. the GRID's route. Its inline thumbnail is the one crop image on this
    // page that is not a cropFigure and carries no launcher of its own;
    // clicking it opens the edge card, and the card's figure is where the
    // launcher lives. That is the coverage claim the handoff left as a call,
    // so it is measured rather than asserted in a comment.
    const trigger = `${row} button.crop-trigger--thumb`;
    await page.waitForSelector(trigger, { timeout: 15000 });
    push("the grid's own inline thumbnail carries no launcher — it is not a " +
      "cropFigure, and clicking it opens the card that is",
      await page.locator(`${row} button.cropfig__launch`).count() === 0);
    await page.locator(trigger).click();
    await page.waitForSelector("#croppop.hovercard--edge",
      { state: "visible", timeout: 10000 });
    const cardLauncher = page.locator("#croppop button.cropfig__launch").first();
    await cardLauncher.waitFor({ timeout: 10000 });
    await cardLauncher.click();
    await page.waitForSelector("#crop-lightbox[open]", { timeout: 10000 });
    await page.waitForFunction(() => {
      const box = document.querySelector("#crop-lightbox div.crophl");
      return box && box.getBoundingClientRect().width > 0;
    }, null, { timeout: 10000 });
    const fromCard = await measure();
    push("a hover card's launcher opens the same lightbox, on the same rect " +
      "— so the grid thumbnail reaches full size in two clicks",
      agrees(fromCard && fromCard.frac, target.entry.highlights[0].frac));

    // 9. the Fit button gets a lost reader back, and the clamp means there is
    // nothing to be lost from: at fit the crop is centred whatever the offset.
    await page.locator("#crop-lightbox button.lightbox__btn--in").click();
    await page.locator("#crop-lightbox button.lightbox__btn--fit").click();
    const refit = await measure();
    push("Fit returns to the whole crop, centred",
      refit && refit.scale === 1 &&
      agrees(refit.frac, target.entry.highlights[0].frac));

    // 10. the POINTER's way out. Not redundant with Escape above: a backdrop
    // click does NOT close a modal <dialog> (measured, Chrome 152 -- only the
    // `closedby="any"` opt-in changes that), so the ✕ is the only dismissal a
    // reader who never touches the keyboard has. It goes through the same
    // `close` event, so the page's scroll must come back with it.
    await page.locator("#crop-lightbox button.lightbox__close").click();
    await page.waitForFunction(
      () => !document.querySelector("#crop-lightbox").open &&
            !document.body.classList.contains("lightbox-open"),
      null, { timeout: 5000 }).catch(() => {});
    const afterX = await page.evaluate(() => ({
      open: document.querySelector("#crop-lightbox").open,
      overflow: getComputedStyle(document.body).overflow,
    }));
    push("the ✕ closes it too, and hands the page's scroll back — a backdrop " +
      "click does not close a modal <dialog>, so this is the only dismissal " +
      "a pointer-only reader has",
      !afterX.open && afterX.overflow !== "hidden");

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
  } finally {
    await page.close();
    server.closeAllConnections();
    server.close();
  }
}

// --- the typography pass's visual rules (design_pass_typography, 2026-09-17) -
//
// What `tests/test_app_type_scale.py` pins is THE SCALE: six steps, declared,
// ordered, distinct, and every `font-size` in either app spending one. What
// nothing pinned until 2026-09-18 is **where each step is spent** -- the
// hierarchy decisions the pass actually made -- and the measurement that found
// that out is worth stating, because it is the reason this suite exists rather
// than a seventh stylesheet scan: a reviewer planted each of the pass's seven
// edits as a one-line revert in a scratch tree and ran all three tiers, and
// ALL SEVEN came back green, including the legibility regression the pass was
// written to fix (ISSUE_20260917_the_typography_passs_visual_rules_are_
// unwitnessed_in_every_tier).
//
// Five of those edits are only visible WITH A LAYOUT, which is why they are
// here and not in pytest:
//
//   * an untraced row's cells inheriting the chip's white and its 700 -- a
//     fact about INHERITANCE, not about a selector string;
//   * `.tvflag` and `.crop-trigger` going back to filled -- a fact about how
//     many filled marks a reader is looking at, not about one rule;
//   * `--measure` -- a fact about a laid-out paragraph's width;
//   * the name column's floor -- a fact about what auto table layout does to
//     an eleven-column table under squeeze;
//   * the source note's clamp -- a fact about a box with more content than
//     height.
//
// The two edits a stylesheet CAN answer for on its own stayed in pytest
// (`test_no_rule_keys_on_a_confidence_token_alone`,
// `test_both_apps_set_their_base_size_from_the_scale`): they are about what
// any future rule may say, where these five are about what this page does.
//
// THE LIVE STACK VIEW, and it has to be live: `hub_bearing_thermal_fit_m1` is
// one of only two stack leaves the nav offers (VA.looseStacks) and the only one
// rendering both tables, and it carries -- on real data -- untraced element
// rows, untraced materials rows, a source note longer than its clamp, and a
// name long enough to fight the floor. The mock fixture has three short rows
// and answers none of it.
//
// 1600x1000 ON PURPOSE. At 2200px the name column gets 410px from auto layout
// and the 190px floor is not binding, so the check for it would pass with the
// rule deleted. Measured across widths 2026-09-18: 190px at 1280, 1400, 1600
// and 1800 (the floor holding, table 1062px inside a 738px scrollport), 410px
// at 2200. A check has to stand where the thing it is about is load-bearing.
//
// Its OWN server, for the same reason testCropLightbox starts one: the `served
// mode` suite closes the shared repo-root server mid-run on purpose.
async function testTypographyRules(browser, label, realProjection) {
  if (!realProjection) {
    console.log(`[${label}] SKIP: topologies.json not built under the target ` +
      "repo -- build it, or pass --repo <main checkout>");
    return { label, ok: true };
  }
  const STACK = "hub_bearing_thermal_fit_m1";
  const server = await startRepoRootServer();
  const url = `http://127.0.0.1:${server.address().port}`;
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const checks = [];
  const push = (name, cond) => checks.push({ name, cond: !!cond });

  try {
    await page.goto(`${url}/apps/viewer/topology.html`, { waitUntil: "load" });
    await page.waitForSelector('[data-nav-kind="stack"]', { timeout: 20000 });
    if (await page.locator(navRow("stack", STACK)).count() === 0) {
      console.log(`[${label}] SKIP: the live nav offers no ${STACK} leaf`);
      return { label, ok: true };
    }
    await page.locator(navRow("stack", STACK)).click();
    await page.waitForSelector("#stackview tr.el-row", { timeout: 20000 });

    // 1. THE GENERIC ONE, and the only one of the five that is about the class
    // of defect rather than about one setting: `VA.confidenceClass()` returns a
    // token and five kinds of element wear the result, so a `conf--*` rule
    // written without a scope hands whatever it declares to every descendant of
    // whichever of the five it landed on. Unscoped, `.conf--untraced`'s
    // `color: #fff` and `font-weight: 700` -- written for an 11px pill --
    // reached all eleven cells of every untraced row.
    //
    // The WITNESS is asserted before the claim and is the whole reason this
    // check is worth having: it reads the same row's own chip and requires it
    // to BE filled and 700. Without it, a page that had lost the chip rule
    // entirely -- or a row that turned out not to be untraced after all --
    // would satisfy "the cells are not white and not bold" by there being
    // nothing white and bold anywhere, which is green for being unable to see
    // the difference rather than green for having looked.
    const inheritance = await page.evaluate(() => {
      const row = document.querySelector("#stackview tr.el-row.conf--untraced")
        || document.querySelector("#stackview tr.mat-row.conf--untraced");
      if (!row) return null;
      const chip = row.querySelector("span.chip.conf--untraced");
      const table = getComputedStyle(row.closest("table"));
      const read = (el) => {
        const cs = getComputedStyle(el);
        return { weight: cs.fontWeight, color: cs.color,
                 background: cs.backgroundColor };
      };
      return {
        rowClass: row.className,
        table: { weight: table.fontWeight, color: table.color },
        cells: [...row.querySelectorAll("td")].map(read),
        chip: chip ? read(chip) : null,
      };
    });
    const chipIsLoud = inheritance && inheritance.chip &&
      Number(inheritance.chip.weight) >= 700 &&
      inheritance.chip.color === "rgb(255, 255, 255)" &&
      inheritance.chip.background !== "rgba(0, 0, 0, 0)";
    if (!chipIsLoud) {
      console.log(`    the row's chip reads ${JSON.stringify(
        inheritance && inheritance.chip)}`);
    }
    push("an untraced row really does carry a filled, white, 700-weight " +
      "confidence chip — the witness this check needs before it can claim " +
      "the row's own cells are none of those things, since a page with no " +
      "loud chip anywhere would pass that claim by having nothing to find",
      chipIsLoud);
    const cells = (inheritance && inheritance.cells) || [];
    const quiet = cells.length >= 8 && cells.every((c) =>
      c.weight === inheritance.table.weight && c.color === inheritance.table.color);
    if (!quiet && cells.length) {
      const odd = cells.filter((c) => c.weight !== inheritance.table.weight ||
        c.color !== inheritance.table.color);
      console.log(`    ${odd.length} of ${cells.length} cells of ` +
        `${inheritance.rowClass} differ from the table (${JSON.stringify(
          inheritance.table)}): ${JSON.stringify(odd.slice(0, 3))}`);
    }
    push("...and its own cells are the table's weight and the table's colour " +
      "— a rule keyed on a confidence token alone hands `color: #fff` and " +
      "`font-weight: 700`, written for an 11px pill, to all eleven columns " +
      "of the row by inheritance", quiet);

    // 2. EMPHASIS IS A BUDGET, measured as a census rather than as a rule per
    // mark: a background of its own is the loudest thing this app can say, and
    // the pass settled that exactly two claims may spend it -- provenance at
    // its two worst states, and a verdict, which is the answer the reader came
    // for. Every other chip, flag and trigger is outlined in its own hue.
    //
    // A census and not seven selector checks, because the point generalises:
    // the next mark somebody fills is caught by this without anybody adding a
    // line. Before the pass, `pitch_system` rendered 61 filled marks in the
    // 300px nav rail and 50 in one stack view.
    const fills = await page.evaluate(() => {
      // The mark FAMILY: the small inline things a reader scans a row by. Not
      // "every element with a background" -- a panel, a card and the page
      // itself all legitimately have one, and the rule is about marks.
      const MARKS = ".chip, .tvflag, .verdict, .tvverdict, button.crop-trigger";
      const filled = {}, plain = {};
      for (const el of document.querySelectorAll(MARKS)) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const bg = getComputedStyle(el).backgroundColor;
        const opaque = bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
        const key = [...el.classList].join(".");
        const into = opaque ? filled : plain;
        into[key] = (into[key] || 0) + 1;
      }
      return { filled, plain };
    });
    // The two claims that may spend fill, as tokens rather than as selectors:
    // a mark is allowed its background if its class list says it is one of
    // them. `verdict`/`tvverdict` are the same claim on the two pages.
    const MAY_FILL = ["conf--untraced", "conf--no_source_ref", "verdict", "tvverdict"];
    const spent = Object.keys(fills.filled);
    const overspent = spent.filter((key) =>
      !key.split(".").some((token) => MAY_FILL.includes(token)));
    if (overspent.length) {
      console.log(`    filled marks that are neither provenance-at-its-worst ` +
        `nor a verdict: ${overspent.map((k) => `${k} x${fills.filled[k]}`)
          .join(", ")}`);
    }
    push("the page renders both filled and outlined marks, so a census of " +
      "which are which can tell them apart at all",
      spent.length > 0 && Object.keys(fills.plain).length > 0);
    push("every filled mark on the page is one of the two claims allowed to " +
      "spend fill — provenance at its two worst states, and the verdict — " +
      "and every flag, qualifier and trigger is outlined instead; emphasis " +
      "is a budget, and a qualifier rendered as loudly as the thing it " +
      "qualifies leaves a reader unable to tell which is which",
      overspent.length === 0);

    // 3. THE MEASURE: a run of prose has a width it stops being readable past,
    // and `.stackview` is as wide as the window leaves it. `--measure` is the
    // cap; what is checked is that a capped paragraph is really narrower than
    // the box it sits in, which is the only form of this claim a deleted
    // `max-width` cannot satisfy.
    const prose = await page.evaluate(() => {
      // `.check__guidance` and not the worksheet's `<p>`: the guidance is on
      // screen without opening a dialog, and there are sixteen of them on this
      // stack, so the measurement is not about one paragraph's own content.
      const el = document.querySelector("#stackview .check__guidance");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        n: document.querySelectorAll("#stackview .check__guidance").length,
        maxWidth: cs.maxWidth,
        width: el.clientWidth,
        container: el.parentElement.clientWidth,
      };
    });
    if (prose && !(prose.maxWidth !== "none" &&
        prose.width < prose.container - 8)) {
      console.log(`    guidance is ${Math.round(prose.width)}px in a ` +
        `${Math.round(prose.container)}px container, max-width ${prose.maxWidth}`);
    }
    push("a run of prose is capped well inside the box it sits in — " +
      "`.stackview` is as wide as the window leaves it, so without the cap " +
      "every sentence in it is as long as the window and a reader loses the " +
      "line coming back",
      prose && prose.maxWidth !== "none" && prose.width < prose.container - 8);

    // 4. THE NAME COLUMN'S FLOOR. Eleven columns in an auto-layout table, so
    // the browser shares the width out by content and the one column that is a
    // PHRASE rather than a number loses: the name wrapped to four lines and
    // stood the row up 90px tall. The floor is read off the computed style
    // rather than written here -- the number belongs to the stylesheet -- so
    // what is asserted is that there IS one and that the squeezed table is
    // honouring it.
    const nameCol = await page.evaluate(() => {
      const cell = document.querySelector("#stackview td.el-row__name");
      if (!cell) return null;
      const table = cell.closest("table");
      const port = table.parentElement;
      return {
        floor: parseFloat(getComputedStyle(cell).minWidth) || 0,
        width: cell.clientWidth,
        widest: Math.max(...[...document.querySelectorAll("#stackview td.el-row__name")]
          .map((c) => c.textContent.trim().length)),
        tableWidth: table.getBoundingClientRect().width,
        portWidth: port.clientWidth,
      };
    });
    const squeezed = nameCol && nameCol.tableWidth > nameCol.portWidth + 1;
    if (!squeezed && nameCol) {
      console.log(`    table is ${Math.round(nameCol.tableWidth)}px in a ` +
        `${Math.round(nameCol.portWidth)}px scrollport — not squeezed, so the ` +
        "floor is not load-bearing at this viewport");
    }
    push("the elements table is wider than its scrollport at this viewport — " +
      "the squeeze that makes a column floor load-bearing at all, and the " +
      "reason this suite runs at 1600px and not at 2200px, where auto layout " +
      "gives the name column 410px and the floor is slack", squeezed);
    if (nameCol && !(nameCol.floor > 0 && nameCol.width >= nameCol.floor - 0.5)) {
      console.log(`    name column is ${Math.round(nameCol.width)}px against a ` +
        `declared floor of ${nameCol.floor}px (longest name ${nameCol.widest} chars)`);
    }
    push("...and the element-name column has a declared floor that the " +
      "squeeze honours — it is the one column holding a phrase rather than a " +
      "number, and with no floor auto layout gives the width to the numbers " +
      "and wraps the name to four lines",
      nameCol && nameCol.floor > 0 && nameCol.width >= nameCol.floor - 0.5);

    // 5. THE SOURCE NOTE'S CLAMP. The note in a row is a PREVIEW -- the note in
    // full is what the preview pane is for -- and unclamped it was the tallest
    // thing in the source column and so the thing setting the row's height.
    // Asserted as "at most three lines", not as the stylesheet's `2.8em`: the
    // number is the stylesheet's to tune, and what the rule says is that two
    // lines and the top of a third is enough to recognise a note by.
    const note = await page.evaluate(() => {
      const el = document.querySelector(
        "#stackview .el-row__srcnote:not(.el-row__srcnote--open)");
      if (!el) return null;
      const cs = getComputedStyle(el);
      const size = parseFloat(cs.fontSize);
      return {
        maxHeight: cs.maxHeight,
        lines: parseFloat(cs.maxHeight) / size,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      };
    });
    if (note && !(note.scrollHeight > note.clientHeight + 1)) {
      console.log(`    the note is ${note.scrollHeight}px of content in a ` +
        `${note.clientHeight}px box — nothing is being clamped, so the clamp ` +
        "is not under test");
    }
    push("a row's source note really has more in it than the row shows — the " +
      "witness, since a note shorter than the clamp says nothing about the " +
      "clamp", note && note.scrollHeight > note.clientHeight + 1);
    if (note && !(note.maxHeight !== "none" && note.lines <= 3)) {
      console.log(`    the note is clamped at ${note.maxHeight}, which is ` +
        `${note.lines.toFixed(1)} lines of its own type`);
    }
    push("...and it is clamped to a PREVIEW of at most three lines — the note " +
      "in full is what the preview pane exists for, and unclamped it is the " +
      "tallest thing in the source column and so the thing setting the row's " +
      "height in a table whose data is one line",
      note && note.maxHeight !== "none" && note.lines <= 3);

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
    await page.waitForSelector(".chip--total", { timeout: 15000 });
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

    return reportSuite(label, checks, errors);
  } catch (err) {
    return reportAbortedSuite(label, checks, errors, err);
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
    return reportSuite(label, checks);
  } catch (err) {
    return reportAbortedSuite(label, checks, [], err);
  } finally {
    await page.close();
  }
}

// What a hosted visitor actually sees when the server publishes nothing --
// the whole point of viewer_transport_honest_hosted, and the one thing only a
// real browser can prove, because it is the FSA fallback that must not happen
// and only a real `window.location.protocol` decides that.
async function testHostedUnpublished(browser, realProjection, label) {
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

    return reportSuite(label, checks);
  } catch (err) {
    return reportAbortedSuite(label, checks, [], err);
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
// `suite` is the label SUITES passes in and this suite prints verbatim — it is
// not derived from the page's label, because a derived label is a second copy
// of the registry key wearing a template string.
async function testRespine(browser, url, suite, realProjection, realCrops) {
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

  // What the SVG's width should be `t` of the way from `from`'s settled
  // geometry to `to`'s -- the one place this test re-states VA.respineX's
  // interpolation, so an in-flight frame can be paired against two settled
  // measurements rather than against the store the render used.
  const lerpWidth = (to, from, t) => Number(to.svgWidth) +
    (1 - t) * (Number(from.svgWidth) - Number(to.svgWidth));

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
        // The LIVE frame, not the ghost's copy of the outgoing one: the pane
        // holds both mid-transition, and every box below has to come off the
        // one being drawn.
        const live = Array.from(document.querySelectorAll(".tv__hscroll"))
          .filter((n) => !n.closest("div.tv__ghost"))[0];
        const body = live.querySelector(".tv__body");
        const head = live.querySelector(".tv__head");
        const svg = live.querySelector("svg.tv__rails");
        const rows = live.querySelector("div.tv__rows");
        const pane = live.getBoundingClientRect();
        const grid = rows.getBoundingClientRect();
        // Every drawn thing in the DAG, as BOXES -- which is the only way to
        // say "inside the pane" rather than "the store says it should be".
        const marks = Array.from(svg.querySelectorAll(
          "line.rail, line.rail__bar, circle.rail__dot, path.rail__link, " +
          "path.rail__leader")).map((n) => n.getBoundingClientRect());
        return {
          t: last.positions.t,
          ghostOpacity: parseFloat(ghost.style.opacity),
          ghostInert: getComputedStyle(ghost).pointerEvents === "none",
          ghostHidden: ghost.getAttribute("aria-hidden"),
          ghostRows: ghost.querySelectorAll("tr.tvrow").length,
          ghostHeadHidden: ghost.querySelector(".tv__head").style.display,
          gridOpacity: parseFloat(rows.style.opacity),
          bodyShift: body.style.transform,
          headShift: head.style.transform,
          svgWidth: parseFloat(svg.getAttribute("width")),
          headPad: parseFloat(head.style.paddingLeft),
          // The pane's own sideways scroll, and the two numbers that say
          // where its right-hand end is. Since VA.respineX the SVG is drawn
          // at the interpolated width, so `scrollWidth` CHANGES mid-flight
          // and a browser clamps `scrollLeft` when it shrinks -- which is
          // only observable with the pane actually scrolled (the scrolled arm
          // below).
          scrollLeft: live.scrollLeft,
          scrollWidth: live.scrollWidth,
          clientWidth: live.clientWidth,
          // The ghost's own window, which has to be the live pane's or the
          // cross-fade doubles the text (topology_grid_scroll_and_grips).
          ghostScrollLeft: ghost.querySelector(".tv__hscroll")
            ? ghost.querySelector(".tv__hscroll").scrollLeft : null,
          drawn: marks.length,
          // Relative to the pane's own left edge, and to the grid's.
          dagLeft: Math.min(...marks.map((b) => b.left - pane.left)),
          dagPastGrid: Math.max(...marks.map((b) => b.right - grid.left)),
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
    // The chain's own settled width, for the in-flight witness below: the
    // frame in flight has to be drawn at a width strictly between the two
    // serialisations', so both ends have to be known before the click.
    await page.locator(navRow("study", study.id)).click();
    await settled();
    const chainSettled = await geometry();
    await page.locator(navRow("topology", "pitch_system")).click();
    await settled();

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
      // The horizontal tween, measured in the page. It is in the GEOMETRY --
      // the frame is drawn at an interpolated pane width and an interpolated
      // column spread (VA.respineX) -- so the witness is the SVG's own width
      // against the two settled ones, at the fraction the frame itself
      // reports, with no transform anywhere.
      //
      // Paired at `t` rather than asserted to be strictly between them: the
      // probe keeps the FIRST frame it catches, and at t = 0 the width is the
      // outgoing serialisation's exactly -- which is the continuity claim, not
      // a failure. A build that does not tween the width fails this at every
      // t including 0, where it would draw the target's.
      push("[real] the pane is drawn at the interpolated width, so the grid " +
        "beside it and the header over it move with the DAG",
        Math.abs(inFlight.svgWidth - lerpWidth(chainSettled, walk, inFlight.t))
          < 1 && Math.abs(inFlight.headPad - inFlight.svgWidth) < 0.6);
      if (Math.abs(inFlight.svgWidth -
                   lerpWidth(chainSettled, walk, inFlight.t)) >= 1) {
        console.log("    at t = " + inFlight.t + " the SVG is " +
          inFlight.svgWidth + ", should be " +
          lerpWidth(chainSettled, walk, inFlight.t) + " (settled: " +
          chainSettled.svgWidth + " / " + walk.svgWidth + ")");
      }
      push("[real] and nothing is slid as a block — a whole-block translate " +
        "is what drew the incoming serialisation off the pane",
        inFlight.bodyShift === "" && inFlight.headShift === "");
      // The defect itself, measured box against box
      // (ISSUE_20260915_a_respine_cannot_interpolate_x_so_the_whole_block_
      // slides): a deselect used to draw all 45 of the walk's marks left of
      // the pane's own left edge, where .tv__hscroll's overflow-x clips them.
      push("[real] every rail, bar, dot, fan-out and leader of the frame in " +
        "flight is drawn INSIDE the pane — not left of its own left edge",
        inFlight.drawn > 20 && inFlight.scrollLeft === 0 &&
        inFlight.dagLeft >= -1);
      if (!(inFlight.dagLeft >= -1)) {
        console.log("    leftmost drawn box: " + inFlight.dagLeft +
                    "px from the pane's left edge");
      }
      push("[real] and left of the grid it hands off to, so the two blocks " +
        "never overlap mid-flight", inFlight.dagPastGrid <= 1);
    }

    await settled();
    const chained = await correspondence();
    push("[real] the re-spun chain corresponds: every leader on its own dot " +
      "and its own seam", chained.drift.length === 0);
    if (chained.drift.length) {
      console.log("    drift: " + chained.drift.slice(0, 5).join(" | "));
    }
    push("[real] and the page IS emphasized on the study — the grid is its " +
      "chain, on rails that still carry the whole walk",
      chained.rows === study.result.chain.length &&
      await page.locator("svg.tv__rails line.rail__bar").count() ===
        pitch.edges.length);

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
      Math.abs(deselectFrame.svgWidth -
               lerpWidth(walk, chainSettled, deselectFrame.t)) < 1);
    // The grow direction is the one the off-pane defect was reported in --
    // the incoming walk is the WIDER serialisation, so it is the block slide
    // that had nowhere to put its left-hand columns.
    push("[real] and the incoming walk is drawn inside the pane in the grow " +
      "direction too, which is the direction that used to clip",
      !!deselectFrame && deselectFrame.scrollLeft === 0 &&
      deselectFrame.dagLeft >= -1 && deselectFrame.dagPastGrid <= 1);
    if (deselectFrame && !(deselectFrame.dagLeft >= -1)) {
      console.log("    deselect leftmost drawn box: " + deselectFrame.dagLeft);
    }
    await settled();

    // (4). The same respine with the pane SCROLLED SIDEWAYS. This arm is
    // browser-tier only, and not for want of trying elsewhere: neither the
    // fixture tier nor the DOM shim it runs in has a layout, so there is no
    // overflow to scroll and `scrollLeft` is a number nobody can move. Every
    // other respine check in both tiers runs at horizontal scroll zero, and
    // the two claims that makes trivially true are exactly the two this arm
    // exists for (ISSUE_20260915_the_respine_is_unwitnessed_with_the_pane_
    // scrolled_sideways):
    //
    //   * `.tv__rails { position: sticky; left: 0 }` should keep the DAG
    //     pinned to the pane's VISIBLE left edge for the whole transition --
    //     which is what makes "nothing is drawn left of the pane" mean
    //     anything to a scrolled reader. At scrollLeft 0 it holds of a pane
    //     with no sticky on it at all;
    //   * since VA.respineX the SVG is drawn at the interpolated width, so
    //     the pane's CONTENT width now changes during a transition, and a
    //     browser clamps `scrollLeft` when content shrinks. A reader at the
    //     right end of the grid is the one who would feel it.
    //
    // The subject is the real pitch_system, whose walk is the corpus's widest
    // DAG and whose chain is one column: the biggest shrink there is.
    // The same boxes catchFrame takes, off a SETTLED pane, after scrolling it
    // sideways. `where` is "end" (as far right as the pane goes), "sticky"
    // (as far as the room the DAG leaves beside it), a number, or null.
    const paneBoxes = (where) => page.evaluate((target) => {
      const live = Array.from(document.querySelectorAll(".tv__hscroll"))
        .filter((n) => !n.closest("div.tv__ghost"))[0];
      const svg = live.querySelector("svg.tv__rails");
      const dagWidth = svg.getBoundingClientRect().width;
      if (target === "end") live.scrollLeft = live.scrollWidth;
      else if (target === "sticky") live.scrollLeft = live.clientWidth - dagWidth - 20;
      else if (typeof target === "number") live.scrollLeft = target;
      const rows = live.querySelector("div.tv__rows");
      const pane = live.getBoundingClientRect();
      const grid = rows.getBoundingClientRect();
      const marks = Array.from(svg.querySelectorAll(
        "line.rail, line.rail__bar, circle.rail__dot, path.rail__link, " +
        "path.rail__leader")).map((n) => n.getBoundingClientRect());
      return {
        scrollLeft: live.scrollLeft, scrollWidth: live.scrollWidth,
        clientWidth: live.clientWidth, dagWidth: dagWidth, drawn: marks.length,
        dagLeft: Math.min(...marks.map((b) => b.left - pane.left)),
        dagPastGrid: Math.max(...marks.map((b) => b.right - grid.left)),
      };
    }, where === undefined ? null : where);
    await page.locator(walkRow).click();
    await settled();
    const scrolledWalk = await paneBoxes("end");
    push("[real] the pane really does overflow sideways here, so the arm " +
      "below is not measuring a pane that cannot scroll",
      scrolledWalk.scrollLeft > 0 &&
      scrolledWalk.scrollLeft === scrolledWalk.scrollWidth - scrolledWalk.clientWidth);
    if (!(scrolledWalk.scrollLeft > 0)) {
      console.log("    pane content " + scrolledWalk.scrollWidth +
        "px in a " + scrolledWalk.clientWidth + "px pane: nothing to scroll");
    }
    // The sticky claim, and this is the only place in either tier where it is
    // worth anything: `.tv__rails { position: sticky; left: 0 }` holds the
    // DAG against the pane's VISIBLE left edge, and at scrollLeft 0 that is
    // true of a pane with no sticky on it at all.
    //
    // It holds for the WHOLE scroll since topology_grid_scroll_and_grips
    // (2026-09-16), and until then it did not, which is what these two checks
    // are for. A sticky box is bounded by its CONTAINING BLOCK, and that is
    // `.tv__body` -- which used to be the pane's own width rather than its
    // content's, because the grid table overflowed out of `.tv__rows` instead
    // of widening the flex row. So the SVG could be pushed right by at most
    // (paneWidth - dagWidth) = 552 of the real pitch_system's 666, and a
    // reader who scrolled further dragged the DAG back off the left edge --
    // 103.5px of it, at this viewport
    // (ISSUE_20260915_the_sticky_rails_stop_sticking_once_the_grid_is_
    // scrolled_past_the_dags_own_width). `.tv__body { width: max-content }`
    // is the fix; the second check below is the one that was measuring the
    // defect and now measures its absence, at the ONE scroll position where
    // the old shape and the new one disagree most.
    const stickyWalk = await paneBoxes("sticky");
    push("[real] scrolled sideways, the DAG stays pinned to the pane's " +
      "VISIBLE left edge — `.tv__rails` is sticky, which is what keeps a " +
      "scrolled reader's rails beside their own rows",
      stickyWalk.scrollLeft > 0 && stickyWalk.drawn > 20 &&
      stickyWalk.dagLeft >= -1);
    if (!(stickyWalk.dagLeft >= -1)) {
      console.log("    at scrollLeft " + stickyWalk.scrollLeft +
        " the leftmost drawn box is " + stickyWalk.dagLeft +
        "px from the pane's left edge");
    }
    push("[real] and it holds PAST the room the DAG leaves beside it, all " +
      "the way to the far end — the sticky's containing block is the " +
      "content's width now, not the pane's (topology_grid_scroll_and_grips)",
      scrolledWalk.scrollLeft > scrolledWalk.clientWidth - scrolledWalk.dagWidth &&
      scrolledWalk.dagLeft >= -1);
    console.log("    the DAG leaves " +
      (scrolledWalk.clientWidth - scrolledWalk.dagWidth) + "px of room beside " +
      "it and the scroll runs to " + scrolledWalk.scrollLeft +
      "; at the far end the DAG is " + scrolledWalk.dagLeft +
      "px from the pane's left edge");
    // And the respine out of that scrolled pane. The question the issue asked
    // was whether the browser's scrollLeft CLAMP is felt as a sideways jump
    // when the DAG shrinks under a reader parked at the right end. Until
    // topology_grid_scroll_and_grips (2026-09-16) it never got that far:
    // VA.renderTopoPane cleared the pane and built a fresh `.tv__hscroll`,
    // which starts at 0, so the reader's sideways position was not clamped,
    // it was DISCARDED -- on the first frame and by every other render of
    // this pane too, density and length mode included
    // (ISSUE_20260915_every_topology_pane_render_throws_away_the_readers_
    // sideways_scroll). It is carried now, and the clamp IS the behaviour:
    // the browser holds the reader as far right as the narrower content
    // allows. Both halves are checked here -- the carry onto the in-flight
    // frame, and the clamped landing -- so the arm states what a reader gets
    // rather than what the renderer happened to leave behind.
    //
    // Re-parked first: the sticky measurement above left the pane at
    // (clientWidth - dagWidth - 20), which is not the far end and would make
    // "carried, then clamped" unfalsifiable.
    const parked = await paneBoxes("end");
    await page.locator(studyRow).click();
    const scrolledFrame = await catchFrame();
    push("[real] a respine carries the reader's sideways scroll onto the " +
      "FIRST frame rather than rebuilding the pane back at the left edge " +
      "(topology_grid_scroll_and_grips)",
      !!scrolledFrame && scrolledFrame.scrollLeft > 0 &&
      scrolledFrame.scrollLeft <= parked.scrollLeft);
    if (scrolledFrame) {
      push("[real] and the ghost under it shows the SAME horizontal window, " +
        "so the cross-fade is one table resolving into another rather than " +
        "two slices of it stacked",
        Math.abs(scrolledFrame.ghostScrollLeft - scrolledFrame.scrollLeft) <= 1);
      // `dagPastGrid` is deliberately NOT asserted here, unlike the
      // unscrolled arms: a sticky DAG over a scrolled grid is SUPPOSED to
      // overlap the columns that have slid under it -- that is what
      // `.tv__rails`'s own background is for -- so the claim those arms make
      // at scrollLeft 0 is not a claim about this one.
      push("[real] and the frame in flight is drawn from the pane's visible " +
        "left edge, with the grid scrolled under the sticky DAG",
        scrolledFrame.drawn > 20 && scrolledFrame.dagLeft >= -1);
    }
    await settled();
    const afterScroll = await paneBoxes(false);
    push("[real] and it settles where the reader was, clamped by the browser " +
      "to the right-hand end of the narrower pane the respine produced",
      afterScroll.scrollLeft > 0 &&
      afterScroll.scrollWidth < parked.scrollWidth &&
      afterScroll.scrollLeft ===
        Math.min(parked.scrollLeft,
                 afterScroll.scrollWidth - afterScroll.clientWidth) &&
      afterScroll.dagLeft >= -1);
    console.log("    scrolled respine: scrollLeft " + parked.scrollLeft +
      " -> " + (scrolledFrame ? scrolledFrame.scrollLeft : "?") + " -> " +
      afterScroll.scrollLeft + " (pane content " + parked.scrollWidth +
      " -> " + afterScroll.scrollWidth + "px, so the reader's own maximum " +
      "moved to " + (afterScroll.scrollWidth - afterScroll.clientWidth) + ")");
    // Back to the walk for the blocks below, which measure a pane at
    // horizontal zero -- where the respine above has already left it.
    await page.locator(walkRow).click();
    await settled();

    await page.locator(studyRow).click();
    await settled();
    await page.locator(walkRow).click();
    const byNavFrame = await catchFrame();
    push("[real] and so does DEselecting — the nav's topology row is the " +
      "only other way to re-serialise this page now that the toolbar's " +
      "layout toggle is gone", !!byNavFrame);
    await settled();
    push("[real] deselecting landed on the un-emphasized walk",
      await page.locator("svg.tv__rails line.rail__bar--off").count() === 0 &&
      await page.locator("tr.tvrow").count() === pitch.edges.length);

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

    return reportSuite(suite, checks, errors);
  } catch (err) {
    return reportAbortedSuite(suite, checks, errors, err);
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
    //
    // The key IS the label: it is handed to the suite function as `label`
    // rather than restated inside it, so there is one copy of each of these
    // strings in the tree and no way for a key and a printed label to drift
    // apart. (They used to be two copies — for most suites the same string
    // twice on one line, and for four of them a `const label = "..."` hundreds
    // of lines away in the function body. All nineteen agreed; nothing made
    // them. `scripts/mutation_witnesses.json`'s `suite` fields are a third
    // copy, and the one that cannot be single-sourced away because it lives in
    // another file — `tests/test_mutation_witnesses.py` pairs those against
    // this table on every pytest run.)
    const SUITES = [
      ["suite file://", (label) =>
        runSuite(browser, pathToFileURL(join(APP_DIR, "test.html")).href, label)],
      ["suite http", (label) => runSuite(browser, `${baseUrl}/test.html`, label)],
      ["index redirect file://", (label) => testIndexRedirects(browser, fileBase, label)],
      ["index redirect http", (label) => testIndexRedirects(browser, baseUrl, label)],
      ["app file://", (label) => testTheApp(browser, fileBase, label)],
      ["app http", (label) => testTheApp(browser, baseUrl, label)],
      ["topology file://", (label) =>
        testTheTopologyPage(browser, fileBase, label, topologies, crops)],
      ["topology http", (label) =>
        testTheTopologyPage(browser, baseUrl, label, topologies, crops)],
      ["deep links file://", (label) => testDeepLinks(browser, fileBase, label)],
      ["deep links http", (label) => testDeepLinks(browser, baseUrl, label)],
      ["topology height budget", (label) =>
        testHeightBudget(browser, fileBase, label, topologies, crops)],
      ["topology file:// respine", (label) =>
        testRespine(browser, fileBase, label, topologies, crops)],
      ["render crash shows the banner", (label) =>
        testRenderCrash(browser, fileBase, label)],
      ["real render path (non-mock)", (label) => testRealDataRenderPath(
        browser, fileBase, label, topologies, realResults, crops)],
      ["no nav click wedges the page", (label) => testNavNeverWedges(
        browser, fileBase, label, topologies, realResults, crops)],
      ["served mode (repo-root static server)", (label) => testServedModeBoot(
        browser, repoRootBaseUrl, label, topologies, stopRepoRootServer)],
      ["hosted origin with nothing published", (label) =>
        testHostedUnpublished(browser, topologies, label)],
      ["rebuild affordance (stub sibling mount)", (label) =>
        testRebuildAffordance(browser, label)],
      ["annotate flyout (repo-root mount + file:// degradation)", (label) =>
        testAnnotateFlyout(browser, fileBase, label, topologies)],
      ["annotate rail filter + face deselect", (label) =>
        testAnnotateRail(browser, label)],
      ["annotate hosted posture (no folder grant off-machine)", (label) =>
        testAnnotateHostedPosture(browser, label)],
      ["crop lightbox (launch, zoom, pan on the live crops)", (label) =>
        testCropLightbox(browser, label, topologies, crops)],
      ["typography pass's visual rules (live stack view)", (label) =>
        testTypographyRules(browser, label, topologies)],
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

    // The registry key IS the label a suite prints -- that is the whole point
    // of single-sourcing it (mutation_witness_tier_repair): a filter can be
    // copied straight off a failing line, and every `suite` in
    // scripts/mutation_witnesses.json is a whole copy of one of these keys.
    // What replaced the four in-body `const label = "..."` copies is now ONE
    // ARGUMENT, and nothing observed it: measured 2026-09-16, dropping it from
    // this call left every tier green and printed `[undefined] 2/2 sub-checks
    // passed: PASS`. Even the mutation tier keeps working, because `--only`
    // filters on the registry key rather than on the printed line -- the
    // damage is silent by construction. The pytest pairing cannot see it
    // either: it compares the witness table's `suite` values against the keys
    // read out of THIS source, which is a different question from whether a
    // suite prints the key it was handed.
    //
    // This is not a string compared to itself. The key comes from the registry
    // and `result.label` comes from whatever the suite body decided to put in
    // its return value -- two different paths that only agree while the
    // argument is actually threaded through.
    // The sub-check NAME is a constant and the specifics go on their own line
    // above it, which is the shape every suite in this file already uses for a
    // failure that has details. It is also load-bearing: the mutation-witness
    // tier matches an entry's `expect_red` against the whole printed name, and
    // tests/test_mutation_witnesses.py requires that name to appear verbatim
    // in this source -- an interpolated label would satisfy neither.
    const results = [];
    for (const [label, runSuiteFn] of chosen) {
      const result = await runSuiteFn(label);
      if (!result || result.label !== label) {
        console.log(`    dispatched as ${JSON.stringify(label)}, reported ` +
          `itself as ${JSON.stringify(result && result.label)}`);
        console.log("    FAIL sub-check: " +
          "every suite prints the registry key it was dispatched under — a " +
          "--only filter is copied straight off that line, and every `suite` " +
          "in scripts/mutation_witnesses.json is a whole copy of one");
        if (result) result.ok = false;
      }
      results.push(result || { label, ok: false });
    }

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
